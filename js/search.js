/*
 * v10.38.0｜搜尋功能模組
 * 從 index.html 搬出；功能邏輯不重寫。
 * 依賴：SEMANTIC_SYNONYMS、allSearchableWords、getWordZhText、
 *       jumpToCategory、playClickSound（由主程式提供）
 */

    function handleSearch(inputText) {
        const dropdown = document.getElementById('searchResultsDropdown');
        const rawInput = inputText.trim();

        if (!rawInput) {
            dropdown.style.display = 'none';
            dropdown.innerHTML = '';
            return;
        }

        const tokens = rawInput.toLowerCase().split(/\s+/).filter(Boolean);

        let expandedTargets = [];
        tokens.forEach(token => {
            SEMANTIC_SYNONYMS.forEach(syn => {
                if (syn.triggers.some(t => token.includes(t) || t.includes(token))) {
                    expandedTargets.push(...syn.targets);
                }
            });
        });
        expandedTargets = [...new Set(expandedTargets)];

        let scoredMatches = [];

        allSearchableWords.forEach(item => {
            if (item.isIntroCard) return;
            let score = 0;
            const jp = item.jp.toLowerCase();
            const kanji = (item.kanji || '').toLowerCase();
            const zh = getWordZhText(item).toLowerCase();
            const fullContent = (item.rawCols || []).join(' ').toLowerCase();

            tokens.forEach(tok => {
                // 日文／漢字完全符合仍是最高優先
                if (jp === tok || kanji === tok) {
                    score += 140;
                } else if (jp.startsWith(tok) || kanji.startsWith(tok)) {
                    score += 90;
                } else if (jp.includes(tok) || kanji.includes(tok)) {
                    score += 60;
                }

                // 中文核心意思也分層計分。
                // 例如「します」的意思是「做、會做」，
                // 搜尋「做」時應該排在只是備註／例句中出現「做」的項目前面。
                const zhParts = zh.split(/[、，,；;／/\s]+/).filter(Boolean);
                if (zh === tok) {
                    score += 120;
                } else if (zhParts.some(part => part === tok)) {
                    score += 100;
                } else if (zh.startsWith(tok)) {
                    score += 85;
                } else if (zh.includes(tok)) {
                    score += 55;
                } else if (fullContent.includes(tok)) {
                    score += 15;
                }
            });

            expandedTargets.forEach(tgt => {
                if (jp.includes(tgt) || kanji.includes(tgt) || fullContent.includes(tgt)) {
                    score += 30;
                }
            });

            if (score > 0) {
                scoredMatches.push({ item, score });
            }
        });

        scoredMatches.sort((a, b) => b.score - a.score);

        if (scoredMatches.length === 0) {
            dropdown.innerHTML = `<div style="padding: 14px; font-size: 13px; color: #64748b; text-align: center;">查無符合「${rawInput}」的項目 🍃<br><span style="font-size:11px; color:#94a3b8;">可嘗試輸入近義詞或假名喔！</span></div>`;
            dropdown.style.display = 'block';
            return;
        }

        const resultsHtml = scoredMatches.slice(0, 20).map(({ item }) => {
            const zhText = getWordZhText(item);
            let mainDisplay = item.jp;
            if (item.kanji && item.kanji !== item.jp) {
                if (/[a-zA-Z]/.test(item.kanji)) {
                    mainDisplay = `${item.jp} (${item.kanji})`;
                } else {
                    mainDisplay = `${item.kanji} (${item.jp})`;
                }
            }
            const safeJp = item.jp.replace(/'/g, "\\'");

            return `
                <div class="search-result-item" onclick="selectSearchResult('${item.catKey}', '${safeJp}')">
                    <div style="overflow:hidden; text-overflow:ellipsis;">
                        <div class="search-result-word">${mainDisplay}</div>
                        <div class="search-result-sub">${zhText}</div>
                    </div>
                    <span class="search-result-cat">${item.catName}</span>
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

    document.addEventListener('click', (e) => {
        const searchBox = document.querySelector('.search-container');
        if (searchBox && !searchBox.contains(e.target)) {
            document.getElementById('searchResultsDropdown').style.display = 'none';
        }
    });
