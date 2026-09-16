/*
 * v10.40.0｜五十音手寫板模組
 * 從 index.html 搬出；功能邏輯不重寫。
 *
 * 包含：
 * - 五十音總表／手寫板切換
 * - 平假名／片假名切換
 * - 假名選取與筆順底圖
 * - Canvas 手寫
 * - 70 分及格評分
 * - 上一個／下一個
 * - 發音
 * - EXP 獎勵與已領取狀態
 */

    function initKanaSection() {
        switchKanaGroup(currentKanaTab);
        setKanaView(currentKanaView, false);
        setupCanvasEvents();
    }

    function setKanaView(view, withSound = true) {
        const normalizedView = (view === 'writing') ? 'writing' : 'grid';
        currentKanaView = normalizedView;

        if (withSound) playClickSound();

        const gridView = document.getElementById('kana-grid-view');
        const writingView = document.getElementById('kana-writing-view');
        if (!gridView || !writingView) return;

        const isGrid = normalizedView === 'grid';
        gridView.hidden = !isGrid;
        writingView.hidden = isGrid;

        // Canvas 從 hidden 狀態切回可見時重新畫一次，避免部分瀏覽器顯示空白。
        if (!isGrid && currentWritingList.length > 0) {
            const item = currentWritingList[currentWritingIndex] || currentWritingList[0];
            const isKataMode = (currentKanaTab === 'seion-kata');
            loadKanaToWritingBoard(item, isKataMode);
        }
    }

    function returnToKanaGrid() {
        playClickSound();
        setKanaView('grid', false);
        updateKanaRewardBadges();
    }

    function switchKanaGroup(tabKey) {
        currentKanaTab = tabKey;
        const allTabs = document.querySelectorAll('.btn-kana-tab');
        allTabs.forEach(tab => tab.classList.remove('active'));

        const targetBtn = Array.from(allTabs).find(b => b.getAttribute('onclick').includes(tabKey));
        if (targetBtn) targetBtn.classList.add('active');

        const gridContainer = document.getElementById('kana-grid-container');
        gridContainer.innerHTML = '';

        let list = KANA_DATA[tabKey] || KANA_DATA['seion-hira'];
        if (tabKey === 'seion-kata') {
            list = KANA_DATA['seion-hira']; // 片假名共用清音架構
        }

        // 過濾出可練習清單
        currentWritingList = list.filter(Boolean);
        currentWritingIndex = 0;

        list.forEach((item, idx) => {
            if (!item) {
                const emptyDiv = document.createElement('div');
                emptyDiv.className = 'kana-item kana-empty';
                gridContainer.appendChild(emptyDiv);
                return;
            }

            const isKataMode = (tabKey === 'seion-kata');
            const mainChar = isKataMode ? item.kata : item.hira;
            const subChar = isKataMode ? item.hira : item.kata;
            const rewardKey = `${tabKey}:${mainChar}`;

            const div = document.createElement('div');
            div.className = `kana-item ${idx === 0 ? 'active' : ''} ${writingRewardedThisSession.has(rewardKey) ? 'exp-earned' : ''}`.trim();
            div.dataset.rewardKey = rewardKey;
            div.onclick = () => selectKanaItem(item, div, isKataMode);

            div.innerHTML = `
                <span class="kana-char">${mainChar}</span>
                <span class="kana-romaji">${item.romaji}</span>
            `;
            gridContainer.appendChild(div);
        });

        if (currentWritingList.length > 0) {
            loadKanaToWritingBoard(currentWritingList[0], tabKey === 'seion-kata');
        }
    }

    function selectKanaItem(item, element, isKataMode) {
        playClickSound();
        const allItems = document.querySelectorAll('.kana-item');
        allItems.forEach(el => el.classList.remove('active'));
        if (element) element.classList.add('active');

        const foundIdx = currentWritingList.findIndex(k => k.hira === item.hira);
        if (foundIdx !== -1) currentWritingIndex = foundIdx;

        // 點五十音總表：直接進入該音的手寫板，不自動發音。
        loadKanaToWritingBoard(item, isKataMode);
        setKanaView('writing', false);
    }

    function loadKanaToWritingBoard(item, isKataMode) {
        if (!item) return;
        const char = isKataMode ? item.kata : item.hira;
        document.getElementById('current-writing-label').textContent = `${char} (${item.romaji})`;
        drawGhostKanaOnCanvas(char);
    }

    function drawGhostKanaOnCanvas(char) {
        const guideCanvas = document.getElementById('guideCanvas');
        const strokeCanvas = document.getElementById('strokeCanvas');
        if (!guideCanvas || !strokeCanvas) return;

        const ctx = guideCanvas.getContext('2d');
        ctx.clearRect(0, 0, guideCanvas.width, guideCanvas.height);

        // 1. 田字格輔助線
        ctx.save();
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);

        ctx.beginPath();
        ctx.moveTo(guideCanvas.width / 2, 0);
        ctx.lineTo(guideCanvas.width / 2, guideCanvas.height);
        ctx.moveTo(0, guideCanvas.height / 2);
        ctx.lineTo(guideCanvas.width, guideCanvas.height / 2);
        ctx.stroke();
        ctx.restore();

        // 2. 淺色假名導引字
        ctx.save();
        const ghostFontSize = char.length > 1 ? 132 : 190;
        ctx.font = `bold ${ghostFontSize}px -apple-system, "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif`;
        ctx.fillStyle = 'rgba(56, 189, 248, 0.22)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(char, guideCanvas.width / 2, guideCanvas.height / 2 + 12);
        ctx.restore();

        // 換字時清除上層使用者筆跡與舊分數
        const strokeCtx = strokeCanvas.getContext('2d');
        strokeCtx.clearRect(0, 0, strokeCanvas.width, strokeCanvas.height);
        resetWritingScore();
    }

    function clearStrokeCanvas() {
        playClickSound();
        const canvas = document.getElementById('strokeCanvas');
        if (!canvas) return;
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
        resetWritingScore();
    }

    function resetWritingScore() {
        const box = document.getElementById('writing-score-box');
        const main = document.getElementById('writing-score-main');
        const note = document.getElementById('writing-score-note');
        if (box) box.style.display = 'none';
        if (main) main.textContent = '0 分';
        if (note) note.textContent = '';
    }

    function gradeCurrentWriting() {
        playClickSound();

        const strokeCanvas = document.getElementById('strokeCanvas');
        const box = document.getElementById('writing-score-box');
        const main = document.getElementById('writing-score-main');
        const note = document.getElementById('writing-score-note');

        if (!strokeCanvas || !box || !main || !note) return;

        const item = currentWritingList[currentWritingIndex];
        if (!item) return;

        const userCtx = strokeCanvas.getContext('2d');
        const userData = userCtx.getImageData(0, 0, strokeCanvas.width, strokeCanvas.height);

        // 先確認是否真的有寫
        let inkPixels = 0;
        for (let i = 3; i < userData.data.length; i += 4) {
            if (userData.data[i] > 20) inkPixels++;
        }

        if (inkPixels < 35) {
            box.style.display = 'block';
            main.textContent = '尚未完成';
            note.textContent = '先在手寫板上描寫假名，再按「完成填寫・立即打分」。';
            return;
        }

        const isKataMode = (currentKanaTab === 'seion-kata');
        const char = isKataMode ? item.kata : item.hira;

        // 建立純字形遮罩，不包含田字格
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = strokeCanvas.width;
        maskCanvas.height = strokeCanvas.height;
        const maskCtx = maskCanvas.getContext('2d');

        const maskFontSize = char.length > 1 ? 132 : 190;
        maskCtx.font = `bold ${maskFontSize}px -apple-system, "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif`;
        maskCtx.fillStyle = '#000000';
        maskCtx.textAlign = 'center';
        maskCtx.textBaseline = 'middle';
        maskCtx.fillText(char, maskCanvas.width / 2, maskCanvas.height / 2 + 12);

        const maskData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);

        const w = strokeCanvas.width;
        const h = strokeCanvas.height;

        // 評分容忍範圍：
        // precisionTolerance：你的墨水離範本太遠就不算命中
        // coverageTolerance：範本附近要真的有你的墨水，才算「有完成」
        const precisionTolerance = 7;
        const coverageTolerance = 8;

        function hasMaskNear(x, y, tolerance) {
            for (let dy = -tolerance; dy <= tolerance; dy += 2) {
                const yy = y + dy;
                if (yy < 0 || yy >= h) continue;
                for (let dx = -tolerance; dx <= tolerance; dx += 2) {
                    const xx = x + dx;
                    if (xx < 0 || xx >= w) continue;
                    const idx = (yy * w + xx) * 4 + 3;
                    if (maskData.data[idx] > 40) return true;
                }
            }
            return false;
        }

        function hasInkNear(x, y, tolerance) {
            for (let dy = -tolerance; dy <= tolerance; dy += 2) {
                const yy = y + dy;
                if (yy < 0 || yy >= h) continue;
                for (let dx = -tolerance; dx <= tolerance; dx += 2) {
                    const xx = x + dx;
                    if (xx < 0 || xx >= w) continue;
                    const idx = (yy * w + xx) * 4 + 3;
                    if (userData.data[idx] > 20) return true;
                }
            }
            return false;
        }

        // A. Precision：使用者寫下的墨水，有多少真的落在正確字形附近
        let matchedInk = 0;
        let minX = w, minY = h, maxX = 0, maxY = 0;

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const alpha = userData.data[(y * w + x) * 4 + 3];
                if (alpha > 20) {
                    if (hasMaskNear(x, y, precisionTolerance)) matchedInk++;
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }

        const precision = matchedInk / Math.max(inkPixels, 1);

        // B. Coverage：正確字形本身，有多少真的被使用者寫到
        let maskMinX = w, maskMinY = h, maskMaxX = 0, maskMaxY = 0;
        let maskCount = 0;
        let coveredMask = 0;

        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                const alpha = maskData.data[(y * w + x) * 4 + 3];
                if (alpha > 40) {
                    maskCount++;
                    if (hasInkNear(x, y, coverageTolerance)) coveredMask++;

                    if (x < maskMinX) maskMinX = x;
                    if (x > maskMaxX) maskMaxX = x;
                    if (y < maskMinY) maskMinY = y;
                    if (y > maskMaxY) maskMaxY = y;
                }
            }
        }

        const coverage = coveredMask / Math.max(maskCount, 1);

        // C. Size：字的寬高比例是否接近範本
        const userW = Math.max(maxX - minX, 1);
        const userH = Math.max(maxY - minY, 1);
        const maskW = Math.max(maskMaxX - maskMinX, 1);
        const maskH = Math.max(maskMaxY - maskMinY, 1);

        const sizeSimilarity = Math.max(
            0,
            1 - (Math.abs(userW - maskW) / maskW + Math.abs(userH - maskH) / maskH) / 2
        );

        // D. Center：整個字的位置是否與範本大致一致
        const userCx = (minX + maxX) / 2;
        const userCy = (minY + maxY) / 2;
        const maskCx = (maskMinX + maskMaxX) / 2;
        const maskCy = (maskMinY + maskMaxY) / 2;
        const centerDistance = Math.hypot(userCx - maskCx, userCy - maskCy);
        const centerSimilarity = Math.max(0, 1 - centerDistance / 70);

        // 新版權重：
        // 完成度 40%、精準度 35%、大小 15%、位置 10%
        let score = Math.round(
            (coverage * 0.40 +
             precision * 0.35 +
             sizeSimilarity * 0.15 +
             centerSimilarity * 0.10) * 100
        );

        // Coverage 硬門檻：避免「只寫中一部分」或「亂畫但剛好壓到字」拿高分
        if (coverage < 0.40) {
            score = Math.min(score, 49);
        } else if (coverage < 0.55) {
            score = Math.min(score, 59);
        } else if (coverage < 0.65) {
            score = Math.min(score, 69);
        }

        score = Math.max(0, Math.min(100, score));

        let comment = '';
        if (score >= 95) comment = '👑 Perfect！完成度與筆跡位置都非常接近範本。';
        else if (score >= 85) comment = '🌟 很漂亮！字形完整，位置與比例也很穩。';
        else if (score >= 70) comment = '🎉 PASS！字形已經有完整抓到，再修一下轉折會更漂亮。';
        else if (score >= 50) comment = '🌱 接近了！先把淡色字形完整描完，再注意線條位置。';
        else comment = '💪 再試一次！目前字形完成度不足，建議沿著淡色輪廓慢慢描寫。';

        const rewardKey = `${currentKanaTab}:${char}`;

        if (score >= WRITING_PASS_SCORE) {
            playSuccessSound();

            let rewardText = '';
            if (!writingRewardedThisSession.has(rewardKey)) {
                addEXP(WRITING_PASS_EXP, { source: 'writingPass' });
                writingRewardedThisSession.add(rewardKey);
                updateKanaRewardBadges();
                rewardText = `　🎁 達成 ${WRITING_PASS_SCORE} 分以上，獲得 +${WRITING_PASS_EXP} EXP！`;
            } else {
                rewardText = `　✅ 已達標！本次練習此假名的 EXP 已領取。`;
            }

            box.style.display = 'block';
            main.textContent = `${score} 分・PASS`;
            note.textContent = `${comment}${rewardText}　完成度 ${Math.round(coverage * 100)}%｜精準度 ${Math.round(precision * 100)}%｜大小 ${Math.round(sizeSimilarity * 100)}%｜位置 ${Math.round(centerSimilarity * 100)}%　※ 此分數為臨摹相似度，不代表正式筆順正誤。`;
        } else {
            playWrongSound();
            box.style.display = 'block';
            main.textContent = `${score} 分・再挑戰`;
            note.textContent = `${comment}　完成度 ${Math.round(coverage * 100)}%｜精準度 ${Math.round(precision * 100)}%｜大小 ${Math.round(sizeSimilarity * 100)}%｜位置 ${Math.round(centerSimilarity * 100)}%　未達 ${WRITING_PASS_SCORE} 分，再練一次就能挑戰 EXP！　※ 此分數為臨摹相似度，不代表正式筆順正誤。`;
            if (typeof window.meowTeacherReact === 'function') {
                window.meowTeacherReact('writing-fail');
            }
        }
    }

    function nextWritingKana() {
        playClickSound();
        if (currentWritingIndex < currentWritingList.length - 1) {
            currentWritingIndex++;
            const isKataMode = (currentKanaTab === 'seion-kata');
            loadKanaToWritingBoard(currentWritingList[currentWritingIndex], isKataMode);
            speakCurrentWritingKana();
        }
    }

    function prevWritingKana() {
        playClickSound();
        if (currentWritingIndex > 0) {
            currentWritingIndex--;
            const isKataMode = (currentKanaTab === 'seion-kata');
            loadKanaToWritingBoard(currentWritingList[currentWritingIndex], isKataMode);
            speakCurrentWritingKana();
        }
    }

    function speakCurrentWritingKana() {
        const item = currentWritingList[currentWritingIndex];
        if (item) speakWordDirectly(null, item.hira);
    }

    function setupCanvasEvents() {
        const canvas = document.getElementById('strokeCanvas');
        if (!canvas || canvas.dataset.hasEvents) return;
        canvas.dataset.hasEvents = 'true';

        const ctx = canvas.getContext('2d');

        function startDraw(x, y) {
            isDrawing = true;
            lastX = x;
            lastY = y;
        }

        function draw(x, y) {
            if (!isDrawing) return;
            ctx.save();
            ctx.strokeStyle = '#ec4899';
            ctx.lineWidth = 10;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(lastX, lastY);
            ctx.lineTo(x, y);
            ctx.stroke();
            ctx.restore();
            lastX = x;
            lastY = y;
        }

        function stopDraw() {
            isDrawing = false;
        }

        function getPos(e) {
            const rect = canvas.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            return {
                x: (clientX - rect.left) * (canvas.width / rect.width),
                y: (clientY - rect.top) * (canvas.height / rect.height)
            };
        }

        canvas.addEventListener('mousedown', (e) => {
            const pos = getPos(e);
            startDraw(pos.x, pos.y);
        });
        canvas.addEventListener('mousemove', (e) => {
            const pos = getPos(e);
            draw(pos.x, pos.y);
        });
        window.addEventListener('mouseup', stopDraw);

        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const pos = getPos(e);
            startDraw(pos.x, pos.y);
        }, { passive: false });

        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const pos = getPos(e);
            draw(pos.x, pos.y);
        }, { passive: false });

        canvas.addEventListener('touchend', stopDraw);
    }

    function updateKanaRewardBadges() {
        document.querySelectorAll('.kana-item[data-reward-key]').forEach(el => {
            const key = el.dataset.rewardKey;
            el.classList.toggle('exp-earned', writingRewardedThisSession.has(key));
        });
    }
