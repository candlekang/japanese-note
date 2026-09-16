/*
 * v10.41.0｜口說跟讀模組
 * 從 index.html 搬出；功能邏輯不重寫。
 *
 * 包含：
 * - 例句來源整理
 * - 口說句池建立
 * - 日文文字正規化
 * - Web Speech API 語音辨識
 * - 手動完成／提交
 * - 相似度評分
 * - 結果顯示
 * - 來源字卡跳轉
 */

    function getSpeakingExampleText(word) {
        if (!word || !word.rawHeaders || !word.rawCols) return '';
        const idx = word.rawHeaders.findIndex(h => {
            const header = (h || '').trim();
            return header.includes('例句');
        });
        return (idx !== -1 && word.rawCols[idx]) ? String(word.rawCols[idx]).trim() : '';
    }

    function cleanSpeakingLine(line) {
        return String(line || '')
            .replace(/<[^>]+>/g, '')
            .replace(/\*\*/g, '')
            .replace(/^[A-ZＡ-Ｚ0-9０-９①-⑳一二三四五六七八九十]+[：:、.)）]\s*/i, '')
            .trim();
    }

    function looksLikeJapaneseSentence(line) {
        const s = cleanSpeakingLine(line);
        if (!s || !/[ぁ-ゖァ-ヺー]/.test(s)) return false;
        const compact = s.replace(/\s+/g, '');
        return compact.length >= 4 && compact.length <= 90;
    }

    function normalizeSpeakingText(text) {
        return String(text || '')
            .replace(/([一-龯々〆ヵヶ]+)[（(][ぁ-ゖァ-ヺー・\s]+[）)]/g, '$1')
            .replace(/[「」『』【】（）()\[\]〈〉《》・、。！？!?…〜～~\-\s,.，．：:；;]/g, '')
            .toLowerCase()
            .trim();
    }

    function buildSpeakingSentencePool() {
        const pool = [];
        const seen = new Set();

        (allSearchableWords || []).forEach(word => {
            if (!word || word.isIntroCard) return;
            const raw = getSpeakingExampleText(word);
            if (!raw) return;

            const lines = raw.replace(/<br\s*\/?>/gi, '\n').split('\n').map(cleanSpeakingLine).filter(Boolean);

            for (let i = 0; i < lines.length; i++) {
                const jp = lines[i];
                if (!looksLikeJapaneseSentence(jp)) continue;

                const key = normalizeSpeakingText(jp);
                if (!key || seen.has(key)) continue;
                seen.add(key);

                let zh = '';
                const next = lines[i + 1] || '';
                if (next && !/[ぁ-ゖァ-ヺー]/.test(next) && /[\u4e00-\u9fff]/.test(next)) zh = next;

                pool.push({ jp, zh, catName: word.catName || '', catKey: word.catKey || '', sourceWord: word.jp || '' });
            }
        });

        speakingSentencePool = pool;
        const countEl = document.getElementById('speaking-pool-count');
        if (countEl) countEl.textContent = `題庫 ${pool.length} 句`;
        return pool;
    }

    function levenshteinDistance(a, b) {
        const s = Array.from(a || '');
        const t = Array.from(b || '');
        const prev = Array(t.length + 1).fill(0).map((_, i) => i);
        const curr = Array(t.length + 1).fill(0);

        for (let i = 1; i <= s.length; i++) {
            curr[0] = i;
            for (let j = 1; j <= t.length; j++) {
                const cost = s[i - 1] === t[j - 1] ? 0 : 1;
                curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
            }
            for (let j = 0; j <= t.length; j++) prev[j] = curr[j];
        }
        return prev[t.length];
    }

    function scoreSpeakingTranscript(target, transcript) {
        const a = normalizeSpeakingText(target);
        const b = normalizeSpeakingText(transcript);
        if (!a || !b) return 0;
        const distance = levenshteinDistance(a, b);
        const denom = Math.max(Array.from(a).length, Array.from(b).length, 1);
        return Math.max(0, Math.round((1 - distance / denom) * 100));
    }

    function renderSpeakingSentence(sentence) {
        currentSpeakingSentence = sentence || null;
        const targetEl = document.getElementById('speaking-target');
        const zhEl = document.getElementById('speaking-zh');
        const catEl = document.getElementById('speaking-category');
        const sourceLinkEl = document.getElementById('speaking-source-link');
        const sourceNameEl = document.getElementById('speaking-source-name');
        const resultEl = document.getElementById('speaking-result');
        const statusEl = document.getElementById('speaking-status');

        if (!sentence) {
            if (targetEl) targetEl.textContent = '目前還沒有可練習的例句';
            if (zhEl) zhEl.textContent = '例句資料可能仍在載入中，稍後再按一次「口說跟讀」。';
            if (catEl) catEl.textContent = '等待資料';
            if (sourceLinkEl) sourceLinkEl.style.display = 'none';
            if (statusEl) statusEl.textContent = '⏳ 題庫尚未準備完成。';
            if (resultEl) resultEl.style.display = 'none';
            return;
        }

        if (targetEl) targetEl.textContent = sentence.jp;
        if (zhEl) zhEl.textContent = sentence.zh || '';
        if (catEl) catEl.textContent = sentence.catName || '綜合例句';

        if (sourceLinkEl && sourceNameEl && sentence.sourceWord && sentence.catKey) {
            sourceNameEl.textContent = sentence.sourceWord;
            sourceLinkEl.style.display = 'inline-flex';
        } else if (sourceLinkEl) {
            sourceLinkEl.style.display = 'none';
        }

        if (resultEl) resultEl.style.display = 'none';
        if (statusEl) statusEl.textContent = '先聽一次，準備好就開始跟讀。';
        speakingPendingTranscript = '';
        speakingSubmitRequested = false;
        const submitBtn = document.getElementById('speaking-submit-btn');
        const liveEl = document.getElementById('speaking-live');
        if (submitBtn) submitBtn.disabled = true;
        if (liveEl) liveEl.style.display = 'none';
    }


    function openSpeakingSourceCard(event) {
        if (event) event.stopPropagation();
        if (!currentSpeakingSentence || !currentSpeakingSentence.catKey || !currentSpeakingSentence.sourceWord) return;

        // 如果正在收音，先停止，避免跳頁後麥克風還在工作。
        if (speakingRecognition) {
            speakingSubmitRequested = false;
            try { speakingRecognition.stop(); } catch (e) {}
            speakingRecognition = null;
        }
        speakingIsListening = false;

        const select = document.getElementById('sheetSelect');
        if (!select) return;

        select.value = currentSpeakingSentence.catKey;

        // 同步規則指南按鈕狀態，再切回翻卡模式。
        updateVerbGuideVisibility();
        updateAdjGuideVisibility();
        updateCounterGuideVisibility();
        updateConjGuideVisibility();
        updateSuffixGuideVisibility();
        updatePrefixGuideVisibility();
        updateRentaiGuideVisibility();
        updateAdvGuideVisibility();
        updateFukuGuideVisibility();
        updateAuxGuideVisibility();
        updatePhraseGuideVisibility();
        updateCaseGuideVisibility();
        updateFinalGuideVisibility();
        updateReasonGuideVisibility();
        updateTeGuideVisibility();

        setMode('review');

        // loadSheetData 已支援 targetWordJp，可直接定位到來源字卡，
        // 不受每日翻卡數量限制。
        loadSheetData(currentSpeakingSentence.catKey, currentSpeakingSentence.sourceWord);

        const review = document.getElementById('review-section');
        if (review && typeof review.scrollIntoView === 'function') {
            setTimeout(() => review.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
        }
    }

    function initSpeakingMode() {
        if (!speakingSentencePool.length) buildSpeakingSentencePool();
        if (!speakingSentencePool.length) {
            renderSpeakingSentence(null);
            return;
        }
        if (!currentSpeakingSentence) nextSpeakingSentence(null, false);
        else renderSpeakingSentence(currentSpeakingSentence);
    }

    function nextSpeakingSentence(event, withSound = true) {
        if (event) event.stopPropagation();
        if (withSound) playClickSound();
        if (!speakingSentencePool.length) buildSpeakingSentencePool();
        if (!speakingSentencePool.length) {
            renderSpeakingSentence(null);
            return;
        }

        let next = speakingSentencePool[Math.floor(Math.random() * speakingSentencePool.length)];
        if (speakingSentencePool.length > 1 && currentSpeakingSentence) {
            let guard = 0;
            while (next.jp === currentSpeakingSentence.jp && guard < 8) {
                next = speakingSentencePool[Math.floor(Math.random() * speakingSentencePool.length)];
                guard++;
            }
        }
        renderSpeakingSentence(next);
    }

    function playSpeakingTarget(event) {
        if (event) event.stopPropagation();
        if (!currentSpeakingSentence) return;
        speakExampleJP(event, currentSpeakingSentence.jp);
    }

    function setSpeakingListeningUI(isListening, message) {
        speakingIsListening = isListening;
        const btn = document.getElementById('speaking-record-btn');
        const submitBtn = document.getElementById('speaking-submit-btn');
        const status = document.getElementById('speaking-status');
        const liveEl = document.getElementById('speaking-live');

        if (btn) {
            btn.classList.toggle('listening', isListening);
            btn.textContent = isListening ? '🎤 跟讀中...' : '🎤 開始跟讀';
            btn.disabled = isListening;
        }
        if (submitBtn) submitBtn.disabled = !isListening && !speakingPendingTranscript;
        if (liveEl) liveEl.style.display = isListening ? 'flex' : 'none';
        if (status && message) status.textContent = message;
    }

    function startSpeakingRecognition(event) {
        if (event) event.stopPropagation();
        if (!currentSpeakingSentence || speakingIsListening) return;

        const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!Recognition) {
            setSpeakingListeningUI(false, '⚠️ 目前這個瀏覽器無法使用口說辨識，請換最新版 Chrome 再試。');
            return;
        }

        speakingPendingTranscript = '';
        speakingSubmitRequested = false;

        const resultEl = document.getElementById('speaking-result');
        const submitBtn = document.getElementById('speaking-submit-btn');
        const liveText = document.getElementById('speaking-live-text');
        if (resultEl) resultEl.style.display = 'none';
        if (submitBtn) submitBtn.disabled = false;
        if (liveText) liveText.textContent = '正在聽你說...';

        try {
            const recognition = new Recognition();
            speakingRecognition = recognition;
            recognition.lang = 'ja-JP';
            recognition.interimResults = true;
            recognition.continuous = true;
            recognition.maxAlternatives = 5;

            recognition.onstart = () => {
                setSpeakingListeningUI(true, '說完後，按「完成送出」開始評分。');
            };

            recognition.onerror = (e) => {
                let msg = '⚠️ 沒有成功聽清楚，請再試一次。';
                if (e && e.error === 'not-allowed') msg = '🎤 請先允許麥克風權限，再開始跟讀。';
                if (e && e.error === 'no-speech') msg = '👂 還沒聽到聲音，再試一次。';
                speakingSubmitRequested = false;
                speakingRecognition = null;
                setSpeakingListeningUI(false, msg);
            };

            recognition.onresult = (e) => {
                let latest = '';
                for (let i = 0; i < e.results.length; i++) {
                    const r = e.results[i];
                    if (r && r[0] && r[0].transcript) latest += r[0].transcript;
                }
                speakingPendingTranscript = latest.trim();

                const liveTextEl = document.getElementById('speaking-live-text');
                const submitEl = document.getElementById('speaking-submit-btn');
                if (liveTextEl) {
                    liveTextEl.textContent = speakingPendingTranscript
                        ? '有聽到囉，說完請按「完成送出」'
                        : '正在聽你說...';
                }
                if (submitEl) submitEl.disabled = !speakingPendingTranscript;
            };

            recognition.onend = () => {
                speakingRecognition = null;

                if (speakingSubmitRequested) {
                    speakingSubmitRequested = false;
                    if (speakingPendingTranscript) {
                        const score = scoreSpeakingTranscript(currentSpeakingSentence.jp, speakingPendingTranscript);
                        renderSpeakingResult(speakingPendingTranscript, score);
                    } else {
                        setSpeakingListeningUI(false, '👂 沒有收到可評分的內容，請再說一次。');
                    }
                } else {
                    setSpeakingListeningUI(false,
                        speakingPendingTranscript
                            ? '已收到你的跟讀，按「完成送出」就會評分。'
                            : '跟讀已停止，可以重新開始。'
                    );
                }
            };

            recognition.start();
        } catch (e) {
            speakingRecognition = null;
            setSpeakingListeningUI(false, '⚠️ 麥克風啟動失敗，請再試一次。');
        }
    }

    function finishSpeakingRecognition(event) {
        if (event) event.stopPropagation();
        if (!currentSpeakingSentence) return;

        if (!speakingPendingTranscript && !speakingIsListening) {
            const status = document.getElementById('speaking-status');
            if (status) status.textContent = '先按「開始跟讀」說一句，再送出。';
            return;
        }

        if (speakingIsListening && speakingRecognition) {
            speakingSubmitRequested = true;
            const status = document.getElementById('speaking-status');
            if (status) status.textContent = '✅ 已送出，正在判斷...';
            try {
                speakingRecognition.stop();
            } catch (e) {
                speakingSubmitRequested = false;
                if (speakingPendingTranscript) {
                    const score = scoreSpeakingTranscript(currentSpeakingSentence.jp, speakingPendingTranscript);
                    renderSpeakingResult(speakingPendingTranscript, score);
                }
            }
            return;
        }

        if (speakingPendingTranscript) {
            const score = scoreSpeakingTranscript(currentSpeakingSentence.jp, speakingPendingTranscript);
            renderSpeakingResult(speakingPendingTranscript, score);
        }
    }

    function renderSpeakingResult(transcript, score) {
        const result = document.getElementById('speaking-result');
        const scoreEl = document.getElementById('speaking-score');
        const gradeEl = document.getElementById('speaking-grade');
        const targetEl = document.getElementById('speaking-result-target');
        const transcriptEl = document.getElementById('speaking-transcript');
        const feedbackEl = document.getElementById('speaking-feedback');
        const statusEl = document.getElementById('speaking-status');
        if (!result || !currentSpeakingSentence) return;

        scoreEl.textContent = `${score} 分`;
        targetEl.textContent = currentSpeakingSentence.jp;
        transcriptEl.textContent = transcript || '—';
        gradeEl.className = 'speaking-grade';

        let feedback = '';
        if (score >= 90) {
            gradeEl.classList.add('pass'); gradeEl.textContent = '🌟 很棒！';
            feedback = '✅ 幾乎完整說對了，可以挑戰下一句！';
            try { playCorrectSound(); } catch (e) {}
        } else if (score >= 80) {
            gradeEl.classList.add('pass'); gradeEl.textContent = '✅ 過關';
            feedback = '👍 大致說對了，再聽一次、跟著節奏念會更順。';
            try { playCorrectSound(); } catch (e) {}
        } else if (score >= 65) {
            gradeEl.classList.add('retry'); gradeEl.textContent = '🟡 再練一次';
            feedback = '💡 已經很接近了，再聽一次，注意有沒有漏掉助詞或小地方。';
        } else {
            gradeEl.classList.add('again'); gradeEl.textContent = '🔁 再聽一次';
            feedback = '👂 再聽一次，試著分小段跟著念，會更容易說完整。';
            try { playWrongSound(); } catch (e) {}
        }

        feedbackEl.innerHTML = `<span class="speaking-result-label">💬 建議：</span>${feedback}`;
        result.style.display = 'block';
        if (statusEl) statusEl.textContent = `這次完成度 ${score} 分`;
        setSpeakingListeningUI(false, statusEl ? statusEl.textContent : '');

        if (typeof window.meowTeacherReact === 'function') {
            window.meowTeacherReact(score >= 80 ? 'speaking-good' : 'speaking-retry', { score });
        }
    }
