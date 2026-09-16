/*
 * v10.42.0｜RPG／進度系統模組
 * 從 index.html 搬出；功能邏輯不重寫。
 *
 * 包含：
 * - EXP / 階級 / HUD
 * - 學習進度讀寫
 * - 今日學習紀錄
 * - 每日修煉委託
 * - 大魔王關卡
 *
 * 口說功能目前保留既有版本，待全站整理完成後再做人工實測。
 */

    function getTotalEXP() {
        const exp = localStorage.getItem('jp_rpg_exp');
        return exp ? parseInt(exp, 10) : 0;
    }

    function addEXP(points, meta = {}) {
        const previousExp = getTotalEXP();
        let currentExp = previousExp + points;
        localStorage.setItem('jp_rpg_exp', currentExp);

        if (currentUser) {
            db.collection('user_progress').doc(currentUser.uid).set({ progress: { jp_rpg_exp: currentExp } }, { merge: true });
        }
        updateHUDLevel();

        // v10.30：喵喵老師接收 EXP 來源，方便判斷任務、測驗與連續學習獎勵。
        window.dispatchEvent(new CustomEvent('meowTeacherExp', {
            detail: { points, previousExp, currentExp, source: meta.source || 'general' }
        }));
    }

    function getLevelAndTitle(exp, totalWords) {
        const maxExpCap = Math.max(totalWords * 35, 1000);
        const progressRatio = Math.min(exp / maxExpCap, 1.0);

        let currentRank = RANK_TIERS_CONFIG[0];
        let nextRank = null;

        for (let i = RANK_TIERS_CONFIG.length - 1; i >= 0; i--) {
            if (progressRatio >= RANK_TIERS_CONFIG[i].threshold) {
                currentRank = RANK_TIERS_CONFIG[i];
                nextRank = RANK_TIERS_CONFIG[i + 1] || null;
                break;
            }
        }

        let nextExpReq = 0;
        let expToNext = 0;
        if (nextRank) {
            nextExpReq = Math.ceil(nextRank.threshold * maxExpCap);
            expToNext = Math.max(nextExpReq - exp, 0);
        }

        return {
            title: currentRank.title,
            ratioPercent: Math.floor(progressRatio * 100),
            currentExp: exp,
            maxExp: maxExpCap,
            nextRank: nextRank,
            expToNext: expToNext,
            totalWords: totalWords
        };
    }

    function updateHUDLevel() {
        const totalWords = allSearchableWords.length || 1000;
        const info = getLevelAndTitle(getTotalEXP(), totalWords);

        const titleEl = document.getElementById('hud-rpg-title');
        const fillEl = document.getElementById('hud-rpg-exp-fill');
        const textEl = document.getElementById('hud-rpg-exp-text');

        if (titleEl) titleEl.textContent = info.title;
        if (fillEl) fillEl.style.width = `${info.ratioPercent}%`;
        if (textEl) textEl.textContent = `${info.currentExp} EXP (${info.ratioPercent}%)`;
    }

    function openRankGuideModal() {
        playClickSound();
        const totalWords = allSearchableWords.length || 1000;
        const info = getLevelAndTitle(getTotalEXP(), totalWords);

        document.getElementById('modal-my-rank-title').textContent = `${info.title} (${info.ratioPercent}%)`;
        document.getElementById('modal-sync-rate-text').textContent = `${info.ratioPercent}%`;

        const hintEl = document.getElementById('modal-my-rank-hint');
        if (info.nextRank) {
            hintEl.textContent = `⚡ 距離下一位階【${info.nextRank.title}】還差 ${info.expToNext} EXP！`;
        } else {
            hintEl.textContent = `👾 恭喜登頂！你已達成【日文大魔王】的最高境界！🔥`;
        }

        const tierListEl = document.getElementById('modal-rank-tier-list');
        tierListEl.innerHTML = '';

        RANK_TIERS_CONFIG.forEach(tier => {
            const reqExp = Math.ceil(tier.threshold * info.maxExp);
            const isCurrent = (tier.title === info.title);
            const isUnlocked = (info.currentExp >= reqExp);

            let statusClass = isCurrent ? 'current' : (isUnlocked ? 'unlocked' : 'locked');
            let badgeHtml = isCurrent ? `<span class="tier-badge-current">▶ 目前位置</span>` : (isUnlocked ? `<span style="color:#22c55e; font-size:11px; font-weight:bold;">✅ 已達成</span>` : `<span style="color:#64748b; font-size:11px;">🔒 ${Math.floor(tier.threshold * 100)}% 同步</span>`);

            tierListEl.innerHTML += `
                <div class="rank-tier-item ${statusClass}">
                    <div>
                        <div class="tier-name">${tier.title}</div>
                        <div class="tier-req">${tier.desc}</div>
                    </div>
                    <div>${badgeHtml}</div>
                </div>
            `;
        });

        document.getElementById('rankGuideModal').style.display = 'flex';
    }

    function closeRankGuideModal(e) {
        if (e && e.target !== document.getElementById('rankGuideModal') && !e.target.classList.contains('btn-modal-close')) return;
        playClickSound();
        document.getElementById('rankGuideModal').style.display = 'none';
    }

    function getTodayKey() {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    function getTodayLearnedWords() {
        const today = getTodayKey();
        const data = localStorage.getItem(`jp_learned_${today}`);
        return data ? JSON.parse(data) : [];
    }

    function recordTodayLearnedWord(wordJp) {
        const today = getTodayKey();
        let list = getTodayLearnedWords();
        if (!list.includes(wordJp)) {
            list.push(wordJp);
            localStorage.setItem(`jp_learned_${today}`, JSON.stringify(list));
            if (currentUser) {
                const obj = {};
                obj[`progress.jp_learned_${today}`] = list;
                db.collection('user_progress').doc(currentUser.uid).update(obj).catch(() => {});
            }
        }
    }

    function getQuestSettings() {
        const data = localStorage.getItem('jp_quest_settings');
        return data ? JSON.parse(data) : { readTarget: 20, quizTarget: 10 };
    }

    function getTodayQuestProgress() {
        const today = getTodayKey();
        const data = localStorage.getItem(`jp_quest_daily_${today}`);
        return data ? JSON.parse(data) : { readCount: 0, quizCount: 0, rewardClaimed: false };
    }

    function saveTodayQuestProgress(type) {
        const today = getTodayKey();
        const prog = getTodayQuestProgress();
        const settings = getQuestSettings();

        if (type === 'read') prog.readCount++;
        if (type === 'quiz') prog.quizCount++;

        if (!prog.rewardClaimed && prog.readCount >= settings.readTarget && prog.quizCount >= settings.quizTarget) {
            prog.rewardClaimed = true;
            addEXP(100, { source: 'dailyQuest' });
            playSuccessSound();
            if (typeof window.meowTeacherReact === 'function') {
                window.meowTeacherReact('task-complete', { label: '今日修煉委託' });
            }
            
            let msg = '🎉 恭喜達成今日所有修煉委託！額外獲得 +100 EXP 🌟';
            if (!currentUser) {
                msg += '\n\n💡 溫馨提醒：登入 Google 帳號可永久保存你的等級與修煉進度喔！';
            }
            alert(msg);
        }

        localStorage.setItem(`jp_quest_daily_${today}`, JSON.stringify(prog));

        if (currentUser) {
            const obj = {};
            obj[`progress.jp_quest_daily_${today}`] = prog;
            db.collection('user_progress').doc(currentUser.uid).update(obj).catch(() => {});
        }

        renderQuestBoard();
    }

    function openQuestSettings() {
        playClickSound();
        const current = getQuestSettings();
        document.getElementById('input-read-target').value = current.readTarget;
        document.getElementById('input-quiz-target').value = current.quizTarget;
        document.getElementById('questSettingsModal').style.display = 'flex';
    }

    function closeQuestSettingsModal(e) {
        if (e && e.target !== document.getElementById('questSettingsModal') && !e.target.classList.contains('btn-modal-close')) return;
        playClickSound();
        document.getElementById('questSettingsModal').style.display = 'none';
    }

    function stepQuestInput(inputId, delta) {
        playClickSound();
        const input = document.getElementById(inputId);
        let val = (parseInt(input.value, 10) || 5) + delta;
        if (val < 1) val = 1;
        input.value = val;
    }

    function setQuestInputValue(inputId, value) {
        playClickSound();
        document.getElementById(inputId).value = value;
    }

    function saveQuestSettingsFromModal() {
        playClickSound();
        const readVal = parseInt(document.getElementById('input-read-target').value, 10) || 20;
        const quizVal = parseInt(document.getElementById('input-quiz-target').value, 10) || 10;

        const targetObj = {
            readTarget: Math.max(readVal, 1),
            quizTarget: Math.max(quizVal, 1)
        };
        localStorage.setItem('jp_quest_settings', JSON.stringify(targetObj));

        if (currentUser) {
            db.collection('user_progress').doc(currentUser.uid).set({ progress: { jp_quest_settings: targetObj } }, { merge: true });
        }
        
        document.getElementById('questSettingsModal').style.display = 'none';
        renderQuestBoard();
        loadSheetData(document.getElementById('sheetSelect').value);
    }

    function renderQuestBoard() {
        const settings = getQuestSettings();
        const todayProg = getTodayQuestProgress();
        const dateEl = document.getElementById('quest-date-indicator');
        if (dateEl) dateEl.textContent = `(${getTodayKey()})`;

        const readPercent = Math.min(Math.floor((todayProg.readCount / settings.readTarget) * 100), 100);
        const quizPercent = Math.min(Math.floor((todayProg.quizCount / settings.quizTarget) * 100), 100);

        const readTextEl = document.getElementById('quest-read-text');
        const readBarEl = document.getElementById('quest-read-bar');
        if (readTextEl) readTextEl.textContent = `${todayProg.readCount} / ${settings.readTarget} (${readPercent}%) ${readPercent >= 100 ? '✅' : ''}`;
        if (readBarEl) readBarEl.style.width = `${readPercent}%`;

        const quizTextEl = document.getElementById('quest-quiz-text');
        const quizBarEl = document.getElementById('quest-quiz-bar');
        if (quizTextEl) {
            const displayQuizCount = Math.min(todayProg.quizCount, settings.quizTarget);
            quizTextEl.textContent = `${displayQuizCount} / ${settings.quizTarget} (${quizPercent}%) ${quizPercent >= 100 ? '✅' : ''}`;
        }
        if (quizBarEl) quizBarEl.style.width = `${quizPercent}%`;
    }

    function getProgress(wordJp) {
        const key = `jp_progress_${wordJp}`;
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : { read: 0, quiz: 0 };
    }

    function saveProgress(wordJp, type) {
        const key = `jp_progress_${wordJp}`;
        const progress = getProgress(wordJp);
        const isFirstRead = (type === 'read' && progress.read === 0);

        if (type === 'read') {
            progress.read++;
            recordTodayLearnedWord(wordJp);
        }
        if (type === 'quiz') progress.quiz++;
        localStorage.setItem(key, JSON.stringify(progress));

        if (isFirstRead) addEXP(10, { source: 'cardRead' }); 
        if (type === 'quiz') addEXP(25, { source: 'quizCorrect' });

        saveTodayQuestProgress(type);

        if (currentUser) {
            const updateObj = {};
            updateObj[`progress.${key}`] = progress;
            db.collection('user_progress').doc(currentUser.uid).update(updateObj).catch(() => {
                const fullObj = {};
                fullObj[key] = progress;
                db.collection('user_progress').doc(currentUser.uid).set({ progress: fullObj }, { merge: true });
            });
        }
    }

    function getBossQuestionMeaning(word) {
        if (!word) return '目前這題沒有中文解釋。';
        const rawExample = getQuizExampleText(word) || '';
        const lines = rawExample.split('\n').map(s => s.trim()).filter(Boolean);
        if (lines.length > 1) {
            return lines.slice(1).join('\n');
        }
        return getQuizZhText(word) || '目前這題沒有中文解釋。';
    }

    function getBossReviewNote(word) {
        if (!word || !word.rawHeaders || !word.rawCols) return '';
        const preferred = ['注意事項', '備註', '定義與功能', '用法', '語感', '核心文法'];
        for (const key of preferred) {
            const idx = word.rawHeaders.findIndex(h => (h || '').includes(key));
            if (idx !== -1 && word.rawCols[idx] && word.rawCols[idx].trim()) {
                return word.rawCols[idx].trim();
            }
        }
        return '';
    }

    function escapeBossHTML(str) {
        return String(str || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function renderBossReview(isCorrect) {
        const panel = document.getElementById('boss-review-panel');
        const answerEl = document.getElementById('boss-review-answer');
        const zhEl = document.getElementById('boss-review-zh');
        const noteEl = document.getElementById('boss-review-note');
        if (!panel || !currentBossWord) return;

        const zh = getQuizZhText(currentBossWord) || '目前這筆資料沒有中文解釋。';
        const note = getBossReviewNote(currentBossWord);

        answerEl.innerHTML = `${isCorrect ? '✅' : '📌'} 正解：<strong>${escapeBossHTML(currentBossWord.jp)}</strong> <span style="font-size:13px;color:#64748b;font-weight:800;">｜${escapeBossHTML(zh.split('\n')[0] || zh)}</span>`;
        zhEl.innerHTML = `🇹🇼 中文意思<br>${escapeBossHTML(zh).replace(/\n/g, '<br>')}`;

        if (note) {
            noteEl.style.display = 'block';
            noteEl.innerHTML = `💡 快速複習<br>${escapeBossHTML(note).replace(/\n/g, '<br>')}`;
        } else {
            noteEl.style.display = 'none';
            noteEl.innerHTML = '';
        }
        panel.style.display = 'block';
    }

    function initBossTestMode() {
        const params = new URLSearchParams(window.location.search);
        const enabled = params.get('bossTest') === '1';
        const btn = document.getElementById('boss-test-btn');
        if (btn) btn.style.display = enabled ? 'block' : 'none';
    }

    function checkSurpriseBossTrigger() {
        const lastTrigger = localStorage.getItem('jp_surprise_last_date');
        const today = getTodayKey();
        
        if (!lastTrigger) {
            localStorage.setItem('jp_surprise_last_date', today);
            return;
        }

        const d1 = new Date(lastTrigger);
        const d2 = new Date(today);
        const diffDays = Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));

        if (diffDays >= 3) {
            setTimeout(() => {
                triggerSurpriseBossQuest();
            }, 1200);
        }
    }

    function triggerSurpriseBossQuest(isTestMode = false) {
        if (allSearchableWords.length < 4) {
            if (isTestMode) alert('⏳ 單字資料還在載入中，請稍等一下再按測試大魔王。');
            return;
        }
        currentBossIsTestMode = !!isTestMode;

        let weakCandidates = [];
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k.startsWith('jp_progress_')) {
                const w = k.replace('jp_progress_', '');
                const p = JSON.parse(localStorage.getItem(k));
                if (p.read > 0 && p.quiz === 0 && globalWordDataMap[w] && !globalWordDataMap[w].isIntroCard) {
                    weakCandidates.push(globalWordDataMap[w]);
                }
            }
        }

        const grammarTrapKeys = ['sheet2', 'sheet3', 'sheet10', 'sheet11', 'sheet13', 'sheet15', 'sheet17', 'sheet19', 'sheet21', 'sheet22'];
        let grammarCandidates = allSearchableWords.filter(item => grammarTrapKeys.includes(item.catKey) && !item.isIntroCard);

        let isWeakness = false;
        if (weakCandidates.length > 0 && Math.random() > 0.4) {
            currentBossWord = weakCandidates[Math.floor(Math.random() * weakCandidates.length)];
            isWeakness = true;
        } else if (grammarCandidates.length > 0) {
            currentBossWord = grammarCandidates[Math.floor(Math.random() * grammarCandidates.length)];
            isWeakness = false;
        } else {
            const pool = allSearchableWords.filter(w => !w.isIntroCard);
            currentBossWord = pool[Math.floor(Math.random() * pool.length)];
        }

        document.getElementById('boss-quest-badge').textContent = isWeakness ? '🎯 弱點狙擊（遺忘盲區狙擊）' : '⚔️ 文法魔王陷阱（句型助詞特訓）';

        const rawExample = getQuizExampleText(currentBossWord);
        const exampleLine1 = (rawExample.split('\n')[0] || rawExample).trim();
        let questionText = '';

        if (exampleLine1 !== '') {
            let cloze = exampleLine1;
            if (currentBossWord.kanji && currentBossWord.kanji.trim() !== '') {
                cloze = cloze.split(currentBossWord.kanji).join('＿＿＿');
            }
            if (currentBossWord.jp && currentBossWord.jp.trim() !== '') {
                cloze = cloze.split(currentBossWord.jp).join('＿＿＿');
            }
            questionText = `【${currentBossWord.catName}】\n${cloze}`;
        } else {
            questionText = `【${currentBossWord.catName}】\n${currentBossWord.jp}`;
        }

        document.getElementById('boss-question-text').textContent = questionText;

        let wrongCandidates = allSearchableWords.filter(w => w.jp !== currentBossWord.jp && !w.isIntroCard).sort(() => Math.random() - 0.5).slice(0, 3);
        let options = [currentBossWord].concat(wrongCandidates).sort(() => Math.random() - 0.5);

        const optionsContainer = document.getElementById('boss-quiz-options');
        optionsContainer.innerHTML = '';
        selectedBossOption = null;

        options.forEach((opt, idx) => {
            const btn = document.createElement('button');
            btn.className = 'quiz-btn';
            btn.dataset.bossJp = opt.jp || '';
            const jpText = opt.jp || '（未提供日文）';
            const zhText = getQuizZhText(opt) || '未提供中文';
            btn.innerHTML = `
                <div class="boss-option-row">
                    <div class="boss-option-left">
                        <div class="boss-option-jp">[${idx + 1}] ${escapeBossHTML(jpText)}</div>
                    </div>
                    <div class="boss-option-zh">${escapeBossHTML(zhText)}</div>
                </div>`;
            btn.onclick = () => selectBossOption(btn, opt);
            optionsContainer.appendChild(btn);
        });

        document.getElementById('boss-quiz-feedback').textContent = '';
        document.getElementById('boss-quiz-feedback').className = 'quiz-feedback';
        document.getElementById('boss-review-panel').style.display = 'none';
        document.getElementById('boss-review-answer').textContent = '';
        document.getElementById('boss-review-zh').textContent = '';
        document.getElementById('boss-review-note').style.display = 'none';
        document.getElementById('boss-question-zh').style.display = 'none';
        document.getElementById('boss-question-zh').textContent = '';
        document.getElementById('boss-test-label').style.display = currentBossIsTestMode ? 'inline-block' : 'none';
        document.getElementById('btn-boss-submit').style.display = 'none';
        document.getElementById('btn-boss-close').style.display = 'none';
        document.getElementById('btn-boss-flee').style.display = 'block';

        playWrongSound();
        document.getElementById('surpriseBossModal').style.display = 'flex';
    }

    function selectBossOption(btn, opt) {
        playClickSound();
        const allBtns = document.querySelectorAll('#boss-quiz-options .quiz-btn');
        allBtns.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedBossOption = opt;
        document.getElementById('btn-boss-submit').style.display = 'block';
    }

    function submitBossAnswer() {
        if (!selectedBossOption) return;
        const allBtns = document.querySelectorAll('#boss-quiz-options .quiz-btn');
        allBtns.forEach(b => {
            b.disabled = true;
            b.classList.remove('selected');
        });

        document.getElementById('btn-boss-submit').style.display = 'none';
        document.getElementById('btn-boss-flee').style.display = 'none';
        const feedbackEl = document.getElementById('boss-quiz-feedback');
        const isCorrect = selectedBossOption.jp === currentBossWord.jp;

        if (isCorrect) {
            playSuccessSound();

            if (currentBossIsTestMode) {
                feedbackEl.textContent = '🧪 測試擊破成功！測試模式不增加 EXP，也不更新三天觸發日期。';
            } else {
                addEXP(200, { source: 'bossWin' });
                if (typeof window.meowTeacherReact === 'function') {
                    window.meowTeacherReact('boss-win');
                }
                feedbackEl.textContent = '🎉 擊破成功！獲得 +200 EXP 狂暴大獎勵！🔥';
                localStorage.setItem('jp_surprise_last_date', getTodayKey());
                if (currentUser) {
                    const obj = {};
                    obj['progress.jp_surprise_last_date'] = getTodayKey();
                    db.collection('user_progress').doc(currentUser.uid).update(obj).catch(() => {});
                }
            }
            feedbackEl.className = 'quiz-feedback success';
        } else {
            playWrongSound();
            feedbackEl.textContent = currentBossIsTestMode
                ? `🧪 測試挑戰失敗！正解是：${currentBossWord.jp}`
                : `💀 挑戰失敗！正解是：${currentBossWord.jp}`;
            feedbackEl.className = 'quiz-feedback error';
            if (!currentBossIsTestMode && typeof window.meowTeacherReact === 'function') {
                window.meowTeacherReact('boss-lose');
            }
        }

        const questionZhEl = document.getElementById('boss-question-zh');
        const questionMeaning = getBossQuestionMeaning(currentBossWord);
        questionZhEl.innerHTML = `🇹🇼 題目中文<br>${escapeBossHTML(questionMeaning).replace(/\n/g, '<br>')}`;
        questionZhEl.style.display = 'block';

        renderBossReview(isCorrect);

        allBtns.forEach(b => {
            b.classList.add('show-translation');
            if (b.dataset.bossJp === currentBossWord.jp) {
                b.classList.add('correct');
            } else if (b.dataset.bossJp === selectedBossOption.jp) {
                b.classList.add('wrong');
            }
        });

        document.getElementById('btn-boss-close').style.display = 'block';
    }

    function closeSurpriseModal() {
        playClickSound();
        document.getElementById('surpriseBossModal').style.display = 'none';
        currentBossIsTestMode = false;
    }

    function fleeSurpriseModal() {
        playClickSound();
        document.getElementById('surpriseBossModal').style.display = 'none';
        currentBossIsTestMode = false;
    }
