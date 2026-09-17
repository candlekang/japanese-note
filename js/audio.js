/*
 * v10.43.0｜共用發音 / TTS 模組
 * 從 index.html 搬出；功能邏輯不重寫。
 *
 * 包含：
 * - 字卡發音
 * - 正面字卡發音
 * - 通用日文發音
 * - 例句發音
 * - 測驗題幹發音
 */

    function speakWordDirectly(event, wordText) {
        if (event) event.stopPropagation();
        if (!wordText) return;
        
        playClickSound();

        let text = cleanTextForSpeech(wordText).trim();
        if (!text) return;

        try {
            globalTTSAudio.pause();
            globalTTSAudio.currentTime = 0;
            if ('speechSynthesis' in window) window.speechSynthesis.cancel();
        } catch(e) {}

        const ttsUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=ja&client=tw-ob&q=${encodeURIComponent(text)}`;

        globalTTSAudio.src = ttsUrl;
        const playPromise = globalTTSAudio.play();
        
        if (playPromise !== undefined) {
            playPromise.catch(() => {
                if ('speechSynthesis' in window) {
                    const utterance = new SpeechSynthesisUtterance(text);
                    utterance.lang = 'ja-JP';
                    utterance.rate = 0.95;
                    window.speechSynthesis.speak(utterance);
                }
            });
        }
    }

    function speakFrontCard(event) {
        if (event) event.stopPropagation();
        if (currentList.length === 0) return;
        const current = currentList[currentIndex];
        speakWordDirectly(event, current.jp);
    }

    function speakJP(event, elementId) {
        if (event) event.stopPropagation();
        let text = document.getElementById(elementId).textContent;
        if (!text || text.includes('載入中') || text.includes('測驗完成') || text.includes('＿')) return;
        speakWordDirectly(event, text);
    }

    function normalizeJapaneseReadingForTTS(text) {
        if (!text) return '';

        // 先把「漢字（かな）」／「漢字(かな)」換成括號內指定讀音。
        let normalized = text.replace(
            /([一-龯々〆ヵヶ]+)[（(]([ぁ-ゖァ-ヺー・\s]+)[）)]/g,
            (_, kanji, reading) => reading.replace(/\s+/g, '')
        );

        // 保守處理助詞「は」→「わ」：
        // 只在前後都像完整日文語塊時處理，避免誤傷 はじめる／はなす／はやい。
        normalized = normalized.replace(
            /([ぁ-んァ-ヶー一-龯々]+)は(?=([ぁ-んァ-ヶー一-龯々]|[、。！？!?]|$))/g,
            '$1わ'
        );

        // 保守處理方向助詞「へ」→「え」。
        normalized = normalized.replace(
            /([ぁ-んァ-ヶー一-龯々]+)へ(?=([ぁ-んァ-ヶー一-龯々]|[、。！？!?]|$))/g,
            '$1え'
        );

        return normalized;
    }

    function speakExampleJP(event, rawText) {
        if (event) event.stopPropagation();
        if (!rawText) return;

        const firstLine = rawText.split('\n')[0] || rawText;
        const ttsText = normalizeJapaneseReadingForTTS(firstLine);

        speakWordDirectly(event, ttsText);
    }

    function speakQuizPrompt(event) {
        if (event) event.stopPropagation();
        if (!currentCorrectAnswer) return;

        playClickSound();
        const questionType = currentCorrectAnswer.activeQuestionType;
        if (questionType === 1) {
            speakWordDirectly(event, currentCorrectAnswer.jp);
        } else {
            speakJP(event, 'quiz-jp');
        }
    }
