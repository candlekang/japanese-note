/*
 * v10.44.0｜智慧搜尋全文索引
 * 搜尋範圍：字詞、漢字、中文意思、例句、例句翻譯、補充說明、文法／用法等。
 * 排除：學習優先度、URL、圖片／音檔、內部 ID 等 metadata。
 */

    const SEARCH_METADATA_HEADER_PATTERNS = [
        /優先度/i, /星等/i, /圖片/i, /圖檔/i, /音檔/i, /音訊/i,
        /\burl\b/i, /\blink\b/i, /連結/i, /\bid\b/i
    ];

    const SEARCH_EXAMPLE_HEADER_PATTERNS = [
        /例句/i, /例文/i, /造句/i, /例子/i, /example/i
    ];

    const SEARCH_MEANING_HEADER_PATTERNS = [
        /中文意思/i, /意思/i, /中文翻譯/i, /翻譯/i, /語意/i,
        /解釋/i, /意義/i, /定義/i, /功用/i, /功能/i
    ];

    const SEARCH_NOTE_HEADER_PATTERNS = [
        /補充/i, /備註/i, /說明/i, /用法/i, /重點/i, /文法/i,
        /搭配/i, /注意/i, /語感/i, /延伸/i
    ];

    const SEARCH_CHAR_NORMALIZE_MAP = {
        '氣':'気',
        '學':'学',
        '會':'会',
        '體':'体',
        '國':'国',
        '語':'語',
        '廣':'広',
        '圖':'図',
        '變':'変',
        '發':'発',
        '實':'実',
        '對':'対',
        '應':'応',
        '關':'関',
        '從':'従',
        '來':'来',
        '處':'処',
        '樣':'様',
        '點':'点',
        '聲':'声',
        '讀':'読',
        '續':'続',
        '數':'数',
        '專':'専',
        '樂':'楽'
    };

    function normalizeSearchText(value) {
        return String(value || '')
            .toLowerCase()
            .normalize('NFKC')
            .replace(/[氣學會體國廣圖變發實對應關從來處樣點聲讀續數專樂]/g, ch => SEARCH_CHAR_NORMALIZE_MAP[ch] || ch)
            .replace(/\s+/g, ' ')
            .trim();
    }

    function escapeSearchHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function highlightSearchText(text, rawTokens) {
        let safe = escapeSearchHtml(text);
        const tokens = [...new Set(rawTokens.filter(Boolean))]
            .sort((a, b) => b.length - a.length);

        tokens.forEach(token => {
            const escapedToken = escapeSearchHtml(token).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            if (!escapedToken) return;
            safe = safe.replace(
                new RegExp(`(${escapedToken})`, 'gi'),
                '<mark style="background:#fff2a8;color:inherit;padding:0 1px;border-radius:3px;">$1</mark>'
            );
        });
        return safe;
    }

    function classifySearchHeader(header) {
        const h = String(header || '').trim();
        if (SEARCH_METADATA_HEADER_PATTERNS.some(re => re.test(h))) return 'metadata';
        if (SEARCH_EXAMPLE_HEADER_PATTERNS.some(re => re.test(h))) return 'example';
        if (SEARCH_MEANING_HEADER_PATTERNS.some(re => re.test(h))) return 'meaning';
        if (SEARCH_NOTE_HEADER_PATTERNS.some(re => re.test(h))) return 'note';
        return 'content';
    }

    function buildSearchFields(item) {
        const fields = [];
        const headers = Array.isArray(item.rawHeaders) ? item.rawHeaders : [];
        const cols = Array.isArray(item.rawCols) ? item.rawCols : [];

        cols.forEach((value, idx) => {
            const text = String(value || '').trim();
            if (!text) return;

            const header = String(headers[idx] || '').trim();
            const role = classifySearchHeader(header);
            if (role === 'metadata') return;

            // 前兩欄通常已由 jp / kanji 高權重搜尋，這裡仍保留全文索引，
            // 但不把它們當成低權重例句結果重複顯示。
            fields.push({
                header: header || `欄位 ${idx + 1}`,
                text,
                normalized: normalizeSearchText(text),
                role,
                index: idx
            });
        });

        return fields;
    }

    function getSearchFieldWeight(role) {
        if (role === 'meaning') return 52;
        if (role === 'example') return 30;
        if (role === 'note') return 22;
        return 14;
    }

    function getSearchMatchLabel(field) {
        if (!field) return '';
        if (field.role === 'example') return field.header || '例句';
        if (field.role === 'meaning') return field.header || '意思';
        if (field.role === 'note') return field.header || '補充';
        return field.header || '內容';
    }

    function makeSearchSnippet(text, rawTokens, maxLength = 72) {
        const plain = String(text || '').replace(/\s+/g, ' ').trim();
        if (!plain) return '';

        const normalizedPlain = normalizeSearchText(plain);
        let hitIndex = -1;

        for (const token of rawTokens) {
            const normalizedToken = normalizeSearchText(token);
            if (!normalizedToken) continue;
            const idx = normalizedPlain.indexOf(normalizedToken);
            if (idx !== -1 && (hitIndex === -1 || idx < hitIndex)) hitIndex = idx;
        }

        let snippet = plain;
        if (plain.length > maxLength) {
            const start = Math.max(0, (hitIndex === -1 ? 0 : hitIndex) - 18);
            const end = Math.min(plain.length, start + maxLength);
            snippet = `${start > 0 ? '…' : ''}${plain.slice(start, end)}${end < plain.length ? '…' : ''}`;
        }

        return highlightSearchText(snippet, rawTokens);
    }

    function handleSearch(inputText) {
        const dropdown = document.getElementById('searchResultsDropdown');
        const rawInput = inputText.trim();

        if (!rawInput) {
            dropdown.style.display = 'none';
            dropdown.innerHTML = '';
            return;
        }

        const rawTokens = rawInput.split(/\s+/).filter(Boolean);
        const tokens = rawTokens.map(normalizeSearchText).filter(Boolean);

        let expandedTargets = [];
        tokens.forEach(token => {
            SEMANTIC_SYNONYMS.forEach(syn => {
                if (syn.triggers.some(t => {
                    const normalizedTrigger = normalizeSearchText(t);
                    return token.includes(normalizedTrigger) || normalizedTrigger.includes(token);
                })) {
                    expandedTargets.push(...syn.targets.map(normalizeSearchText));
                }
            });
        });
        expandedTargets = [...new Set(expandedTargets)];

        const scoredMatches = [];

        allSearchableWords.forEach(item => {
            if (item.isIntroCard) return;

            let score = 0;
            let bestFieldMatch = null;
            let bestFieldScore = 0;

            const jp = normalizeSearchText(item.jp);
            const kanji = normalizeSearchText(item.kanji || '');
            const zhRaw = getWordZhText(item);
            const zh = normalizeSearchText(zhRaw);
            const searchFields = buildSearchFields(item);

            tokens.forEach(tok => {
                // ① 字卡日文／漢字：最高權重
                if (jp === tok || kanji === tok) {
                    score += 160;
                } else if (jp.startsWith(tok) || kanji.startsWith(tok)) {
                    score += 105;
                } else if (jp.includes(tok) || kanji.includes(tok)) {
                    score += 72;
                }

                // ② 核心中文意思：次高權重
                const zhParts = zh.split(/[、，,；;／/\s]+/).filter(Boolean);
                if (zh === tok) {
                    score += 135;
                } else if (zhParts.some(part => part === tok)) {
                    score += 112;
                } else if (zh.startsWith(tok)) {
                    score += 92;
                } else if (zh.includes(tok)) {
                    score += 65;
                }

                // ③ 每個試算表欄位逐欄搜尋
                searchFields.forEach(field => {
                    if (!field.normalized.includes(tok)) return;

                    let fieldScore = getSearchFieldWeight(field.role);
                    if (field.normalized === tok) fieldScore += 22;
                    else if (field.normalized.startsWith(tok)) fieldScore += 10;

                    score += fieldScore;

                    if (fieldScore > bestFieldScore) {
                        bestFieldScore = fieldScore;
                        bestFieldMatch = field;
                    }
                });
            });

            // ④ 原本的語意近義詞搜尋保留
            expandedTargets.forEach(tgt => {
                if (
                    jp.includes(tgt) ||
                    kanji.includes(tgt) ||
                    searchFields.some(field => field.normalized.includes(tgt))
                ) {
                    score += 28;
                }
            });

            if (score > 0) {
                scoredMatches.push({
                    item,
                    score,
                    bestFieldMatch
                });
            }
        });

        scoredMatches.sort((a, b) => b.score - a.score);

        if (scoredMatches.length === 0) {
            dropdown.innerHTML = `<div style="padding:14px;font-size:13px;color:#64748b;text-align:center;">查無符合「${escapeSearchHtml(rawInput)}」的項目 🍃<br><span style="font-size:11px;color:#94a3b8;">現在也會搜尋例句、翻譯與補充內容喔！</span></div>`;
            dropdown.style.display = 'block';
            return;
        }

        const resultsHtml = scoredMatches.slice(0, 24).map(({ item, bestFieldMatch }) => {
            const zhText = getWordZhText(item);
            let mainDisplay = item.jp;

            if (item.kanji && item.kanji !== item.jp) {
                if (/[a-zA-Z]/.test(item.kanji)) {
                    mainDisplay = `${item.jp} (${item.kanji})`;
                } else {
                    mainDisplay = `${item.kanji} (${item.jp})`;
                }
            }

            const safeJp = String(item.jp || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
            const titleHtml = highlightSearchText(mainDisplay, rawTokens);
            const zhHtml = highlightSearchText(zhText, rawTokens);

            let matchHtml = '';
            if (bestFieldMatch) {
                const label = escapeSearchHtml(getSearchMatchLabel(bestFieldMatch));
                const snippet = makeSearchSnippet(bestFieldMatch.text, rawTokens);

                // 核心意思已經顯示在第二行；只有其他欄位命中時額外顯示來源片段。
                const sameAsMeaning = normalizeSearchText(bestFieldMatch.text) === normalizeSearchText(zhText);
                if (!sameAsMeaning && snippet) {
                    matchHtml = `
                        <div style="margin-top:5px;font-size:11px;line-height:1.45;color:#64748b;white-space:normal;">
                            <span style="font-weight:700;color:#8b6f47;">${label}命中｜</span>${snippet}
                        </div>
                    `;
                }
            }

            return `
                <div class="search-result-item" onclick="selectSearchResult('${escapeSearchHtml(item.catKey)}', '${safeJp}')">
                    <div style="overflow:hidden;min-width:0;">
                        <div class="search-result-word">${titleHtml}</div>
                        <div class="search-result-sub">${zhHtml}</div>
                        ${matchHtml}
                    </div>
                    <span class="search-result-cat">${escapeSearchHtml(item.catName)}</span>
                </div>
            `;
        }).join('');

        dropdown.innerHTML = resultsHtml;
        dropdown.style.display = 'block';
    }

    function selectSearchResult(sheetKey, wordJp) {
        playClickSound();
        const dropdown = document.getElementById('searchResultsDropdown');
        dropdown.style.display = 'none';
        document.getElementById('searchInput').value = '';
        jumpToCategory(sheetKey, wordJp);
    }


    function restoreSearchResultsOnFocus() {
        const input = document.getElementById('searchInput');
        if (!input) return;

        input.addEventListener('focus', () => {
            const currentValue = input.value.trim();
            if (currentValue) {
                handleSearch(currentValue);
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', restoreSearchResultsOnFocus, { once: true });
    } else {
        restoreSearchResultsOnFocus();
    }

    document.addEventListener('click', (e) => {
        const searchBox = document.querySelector('.search-container');
        if (searchBox && !searchBox.contains(e.target)) {
            document.getElementById('searchResultsDropdown').style.display = 'none';
        }
    });
