/*
 * v10.39.0｜Quiz 模組
 * 從 index.html 搬出；不重寫測驗邏輯。
 * 包含：
 * - 測驗中文答案欄位判斷
 * - 綜合大亂鬥 eligibility 防呆
 * - 測驗啟動／出題／選項／作答／下一題
 */

    function getQuizZhText(word) {
        if (!word || !Array.isArray(word.rawHeaders) || !Array.isArray(word.rawCols)) return '';

        const headers = word.rawHeaders.map(h => (h || '').trim());

        // 第一層：真正的中文語意欄位。
        const primaryKeys = ['中文意思', '意思', '中文翻譯', '中文', '翻譯', '意義', '語意', '解釋'];
        for (const key of primaryKeys) {
            const idx = headers.findIndex(h => h.includes(key));
            const val = idx !== -1 ? (word.rawCols[idx] || '').trim() : '';
            if (val) return val;
        }

        // 第二層：部分文法類別沒有「意思」欄，而用功用／定義表示核心語意。
        const semanticKeys = ['定義與功能', '核心定義', '功用', '功能'];
        for (const key of semanticKeys) {
            const idx = headers.findIndex(h => h.includes(key));
            const val = idx !== -1 ? (word.rawCols[idx] || '').trim() : '';
            if (val) return val;
        }

        // 不再用固定欄位位置 rawCols[4]/rawCols[2] 猜答案。
        // 各工作表欄位順序不同，這正是「學習優先度」被誤當答案的來源。
        return '';
    }

    function isQuizEligibleWord(word) {
        if (!word || word.isIntroCard || !word.jp || !word.jp.trim()) return false;
        const meaning = getQuizZhText(word).trim();
        if (!meaning) return false;

        // 防止純 metadata 被當成答案。
        if (/^[★☆]{2,}/.test(meaning)) return false;
        if (/^[★☆\s]+(?:高|中|低)?優先/.test(meaning)) return false;
        if (/^(高|中|低)優先$/.test(meaning)) return false;

        return true;
    }

    function getQuizExampleText(word) {
        const idx = word.rawHeaders.findIndex(h => h.includes('例句'));
        if (idx !== -1 && word.rawCols[idx]) return word.rawCols[idx];
        return word.rawCols[6] || word.rawCols[5] || '';
    }

    function checkQuizStartFlow() {
        if (fullSourceList.length === 0) {
            alert('⏳ 單字庫正在全力加速傳送中！請稍微等我一下下嘛～( ＞＜ )✨');
            setMode('review');
            return;
        }

        const validQuizPool = fullSourceList.filter(isQuizEligibleWord);
        if (validQuizPool.length < 4) {
            alert('這個分頁的單字少於 4 個，無法產生四選一測驗喔！');
            setMode('review');
            return;
        }

        const learnedKeys = getTodayLearnedWords();
        const guideBox = document.getElementById('quiz-guide-box');
        const mainBox = document.getElementById('quiz-main-container');

        if (learnedKeys.length === 0) {
            guideBox.style.display = 'flex';
            mainBox.style.display = 'none';
        } else {
            guideBox.style.display = 'none';
            mainBox.style.display = 'block';
            startQuiz(false);
        }
    }

    function startWildQuiz() {
        playClickSound();
        document.getElementById('quiz-guide-box').style.display = 'none';
        document.getElementById('quiz-main-container').style.display = 'block';
        startQuiz(false, true);
    }

    function startQuiz(infiniteMode = false, forceWild = false) {
        const pool = fullSourceList.filter(isQuizEligibleWord);
        if (pool.length < 4) {
            alert('⏳ 單字庫正在全力加速傳送中！請稍微等我一下下嘛～( ＞＜ )✨');
            setMode('review');
            return;
        }

        const settings = getQuestSettings();
        const targetCount = infiniteMode ? pool.length : settings.quizTarget;

        let selectedQuestions = [];

        if (forceWild || infiniteMode) {
            selectedQuestions = [...pool].sort(() => Math.random() - 0.5);
        } else {
            const learnedKeys = getTodayLearnedWords();
            const learnedObjs = pool.filter(item => learnedKeys.includes(item.jp));
            
            const shuffledLearned = [...learnedObjs].sort(() => Math.random() - 0.5);

            if (shuffledLearned.length >= targetCount) {
                selectedQuestions = shuffledLearned.slice(0, targetCount);
            } else {
                selectedQuestions = [...shuffledLearned];
                const remainCount = targetCount - selectedQuestions.length;
                const poolWithoutLearned = pool.filter(item => !learnedKeys.includes(item.jp));
                poolWithoutLearned.sort(() => Math.random() - 0.5);
                selectedQuestions = selectedQuestions.concat(poolWithoutLearned.slice(0, remainCount));
            }
        }

        quizList = selectedQuestions.slice(0, targetCount);
        quizIndex = 0;
        document.getElementById('btn-restart-quiz-round').style.display = 'none';
        document.getElementById('btn-infinite-quiz').style.display = 'none';
        renderQuizQuestion();
    }

    function renderQuizQuestion() {
        if (quizIndex >= quizList.length) {
            document.getElementById('quiz-jp').textContent = '今日回合完成！🎉✨';
            document.getElementById('quiz-type').textContent = 'STAGE CLEAR!';
            document.getElementById('quiz-options').innerHTML = '';
            document.getElementById('quiz-feedback').textContent = '已完成此輪練習！';
            document.getElementById('quiz-feedback').className = 'quiz-feedback success';
            document.getElementById('btn-submit-answer').style.display = 'none';
            document.getElementById('btn-next-quiz').style.display = 'none';
            document.getElementById('quiz-score').textContent = `全部完成 (${quizList.length} 題)`;
            document.getElementById('btn-restart-quiz-round').style.display = 'block';
            document.getElementById('btn-infinite-quiz').style.display = 'block';
            return;
        }

        const currentWord = quizList[quizIndex];
        if (!isQuizEligibleWord(currentWord)) {
            quizIndex++;
            renderQuizQuestion();
            return;
        }
        currentCorrectAnswer = currentWord;
        currentCorrectAnswer.hasQuizzedThisTime = false;
        selectedOptionData = null; 
        
        const rawExample = getQuizExampleText(currentWord);
        const exampleLine1 = (rawExample.split('\n')[0] || rawExample).trim();
        const hasExample = exampleLine1 !== '';
        
        let questionType = Math.floor(Math.random() * (hasExample ? 3 : 2));
        
        const typeSelect = document.getElementById('sheetSelect');
        const defaultType = typeSelect.value === 'all' ? '綜合大亂鬥' : typeSelect.selectedOptions[0].text;
        
        let questionText = '';
        let quizBadge = '';
        
        if (questionType === 0) {
            quizBadge = '📖 讀音測意';
            questionText = currentWord.jp; 
        } else if (questionType === 1) {
            quizBadge = '🔄 語意反查';
            questionText = getQuizZhText(currentWord); 
        } else {
            quizBadge = '✍️ 克漏字';
            let cloze = exampleLine1;
            if (currentWord.kanji && currentWord.kanji.trim() !== '') {
                cloze = cloze.split(currentWord.kanji).join('＿＿＿');
            }
            if (currentWord.jp && currentWord.jp.trim() !== '') {
                cloze = cloze.split(currentWord.jp).join('＿＿＿');
            }
            questionText = cloze;
        }

        currentWord.activeQuestionType = questionType;

        document.getElementById('quiz-type').textContent = `${quizBadge} (${defaultType})`;
        document.getElementById('quiz-jp').textContent = questionText;
        document.getElementById('quiz-score').textContent = `STAGE ${quizIndex + 1} / ${quizList.length}`;
        
        document.getElementById('quiz-feedback').textContent = '';
        document.getElementById('quiz-feedback').className = 'quiz-feedback';
        document.getElementById('btn-submit-answer').style.display = 'none'; 
        document.getElementById('btn-next-quiz').style.display = 'none';

        const pool = fullSourceList.filter(isQuizEligibleWord);
        let wrongCandidates = pool.filter(word => {
            if (word.jp === currentWord.jp) return false;
            
            let textToShow;
            if (questionType === 0) {
                textToShow = getQuizZhText(word);
            } else if (questionType === 2) {
                textToShow = word.jp; 
            } else {
                textToShow = word.kanji && word.kanji !== word.jp ? `${word.jp} (${word.kanji})` : word.jp;
            }
            return textToShow && textToShow.trim() !== '';
        });
        
        wrongCandidates.sort(() => Math.random() - 0.5);
        let options = [currentWord].concat(wrongCandidates.slice(0, 3)); 
        options.sort(() => Math.random() - 0.5); 

        const optionsContainer = document.getElementById('quiz-options');
        optionsContainer.innerHTML = '';
        
        options.forEach((opt, index) => {
            const btn = document.createElement('button');
            btn.className = 'quiz-btn';
            
            let optMainText = '';
            let optSubText = getQuizZhText(opt);
            
            if (questionType === 0) {
                optMainText = getQuizZhText(opt); 
                optSubText = `${opt.jp} (${getJapaneseText(opt)})`; 
            } else if (questionType === 2) {
                optMainText = opt.jp; 
            } else {
                const kanjiPart = opt.kanji && opt.kanji !== opt.jp ? ` (${opt.kanji})` : '';
                optMainText = `${opt.jp}${kanjiPart}`;
            }
            
            btn.innerHTML = `<span>[${index + 1}] ${optMainText}</span><span class="option-subtext">💡 意思：${optSubText}</span>`;
            
            btn.onclick = () => selectOption(btn, opt);
            optionsContainer.appendChild(btn);
        });
    }

    function selectOption(clickedBtn, selectedWord) {
        playClickSound();
        const allBtns = document.querySelectorAll('.quiz-btn');
        allBtns.forEach(btn => btn.classList.remove('selected'));
        
        clickedBtn.classList.add('selected');
        selectedOptionData = selectedWord;
        
        document.getElementById('btn-submit-answer').style.display = 'block';
    }

    function submitAnswer() {
        if (!selectedOptionData) return;
        
        const allBtns = document.querySelectorAll('.quiz-btn');
        const questionType = currentCorrectAnswer.activeQuestionType;

        allBtns.forEach(btn => {
            btn.disabled = true;
            btn.classList.remove('selected');
            const subtext = btn.querySelector('.option-subtext');
            if (subtext) subtext.style.display = 'block';
        });

        document.getElementById('btn-submit-answer').style.display = 'none';
        const feedbackEl = document.getElementById('quiz-feedback');
        const nextBtn = document.getElementById('btn-next-quiz');

        let clickedBtn = null;
        allBtns.forEach(btn => {
            let checkText = '';
            if (questionType === 0) {
                checkText = getQuizZhText(selectedOptionData);
            } else if (questionType === 2) {
                checkText = selectedOptionData.jp;
            } else {
                checkText = selectedOptionData.jp;
            }

            if (btn.textContent.includes(checkText)) {
                clickedBtn = btn;
            }
        });

        if (selectedOptionData.jp === currentCorrectAnswer.jp) {
            playSuccessSound();
            if (clickedBtn) clickedBtn.classList.add('correct');
            feedbackEl.textContent = '💖 答對了！+25 EXP';
            feedbackEl.classList.add('success');
            
            if (!currentCorrectAnswer.hasQuizzedThisTime) {
                saveProgress(currentCorrectAnswer.jp, 'quiz');
                currentCorrectAnswer.hasQuizzedThisTime = true;
            }
            
            speakWordDirectly(null, currentCorrectAnswer.jp);
        } else {
            // 答錯不增加「答對次數」，但仍算完成 1 題每日測驗。
            saveTodayQuestProgress('quiz');
            playWrongSound();
            if (clickedBtn) clickedBtn.classList.add('wrong');
            
            let correctAnswerText;
            if (questionType === 0) {
                correctAnswerText = getQuizZhText(currentCorrectAnswer);
            } else if (questionType === 2) {
                correctAnswerText = currentCorrectAnswer.jp;
            } else {
                correctAnswerText = `${currentCorrectAnswer.jp} (${getJapaneseText(currentCorrectAnswer)})`;
            }
            
            feedbackEl.textContent = `💀 答錯囉！正解：${correctAnswerText}`;
            feedbackEl.classList.add('error');
            if (typeof window.meowTeacherReact === 'function') {
                window.meowTeacherReact('quiz-wrong');
            }
            
            allBtns.forEach(btn => {
                if (btn.textContent.includes(currentCorrectAnswer.jp)) {
                    btn.classList.add('correct');
                }
            });
        }
        nextBtn.style.display = 'block'; 
    }

    function nextQuiz() {
        playClickSound();
        quizIndex++;
        renderQuizQuestion();
    }
