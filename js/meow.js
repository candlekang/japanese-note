(function(){
    const PET_KEY='jp_rpg_pet_state';
    const MEOW_TEST_MODE = new URLSearchParams(window.location.search).get('meowtest') === '1';

    const walkFrames=['./assets/meow/meow-walk-1.png?v=10.34.2','./assets/meow/meow-walk-2.png?v=10.34.2'];
    const lazyFrames=['./assets/meow/meow-lazy-1.png?v=10.34.2','./assets/meow/meow-lazy-2.png?v=10.34.2'];
    const sleepFrames=['./assets/meow/meow-sleep-1.png?v=10.34.2','./assets/meow/meow-sleep-2.png?v=10.34.2'];
    const reactionImages={
        happy:'./assets/meow/meow-reaction-happy.png?v=10.34.2',
        smug:'./assets/meow/meow-reaction-smug.png?v=10.34.2',
        arms:'./assets/meow/meow-reaction-arms-crossed.png?v=10.34.2',
        mischief:'./assets/meow/meow-reaction-mischief.png?v=10.34.2',
        wave:'./assets/meow/meow-reaction-wave.png?v=10.34.2',
        teaching:'./assets/meow/meow-reaction-teaching.png?v=10.34.2',
        feed:'./assets/meow/meow-interact-feed.png?v=10.34.2',
        pat:'./assets/meow/meow-interact-pat.png?v=10.34.2',
        cheer:'./assets/meow/meow-interact-cheer.png?v=10.34.2'
    };
    const interactionFrames={
        snack:[
            './assets/meow/meow-interact-feed.png?v=10.34.2',
            './assets/meow/meow-interact-feed-2.png?v=10.34.2'
        ],
        pet:[
            './assets/meow/meow-interact-pat.png?v=10.34.2',
            './assets/meow/meow-interact-pat-2.png?v=10.34.2'
        ],
        cheer:[
            './assets/meow/meow-interact-cheer.png?v=10.34.2',
            './assets/meow/meow-interact-cheer-2.png?v=10.34.2'
        ]
    };

    // v10.31：改成真正「長期養成」的十階進化。
    // 目前約 3000 EXP 只會在 Lv.2，不會一下就滿。
    const LEVELS=[
        {level:1,min:0,      title:'幼幼監工喵',       desc:'什麼都沒有，只有一張欠揍的臉。', img:'./assets/meow/meow-lv1-basic.png?v=10.34.2'},
        {level:2,min:3000,   title:'單字卡助教喵',     desc:'開始拿單字卡到處巡堂。',           img:'./assets/meow/meow-lv2-flashcard.png?v=10.34.2'},
        {level:3,min:7000,   title:'勤學書包喵',       desc:'掛上小包包，假裝很有學生氣。',     img:'./assets/meow/meow-lv3-student-bag.png?v=10.34.2'},
        {level:4,min:12000,  title:'眼鏡講師喵',       desc:'戴上圓眼鏡，嫌棄感增加 30%。',     img:'./assets/meow/meow-lv4-glasses.png?v=10.34.2'},
        {level:5,min:20000,  title:'教鞭講師喵',       desc:'正式拿起教鞭與課本監督你。',       img:'./assets/meow/meow-lv5-pointer-book.png?v=10.34.2'},
        {level:6,min:32000,  title:'學霸喵師',         desc:'開始有學霸光環，講話更臭屁。',     img:'./assets/meow/meow-lv6-scholar.png?v=10.34.2'},
        {level:7,min:48000,  title:'學術導師喵',       desc:'學術氣場上線，已經很會指使人。',   img:'./assets/meow/meow-lv7-academic.png?v=10.34.2'},
        {level:8,min:70000,  title:'畢業名師喵',       desc:'戴上學士帽，準備對你說教。',       img:'./assets/meow/meow-lv8-graduate.png?v=10.34.2'},
        {level:9,min:100000, title:'星光教授喵',       desc:'教授級監工，眼神已經看透一切。',   img:'./assets/meow/meow-lv9-star-teacher.png?v=10.34.2'},
        {level:10,min:150000,title:'傳說喵喵教授',     desc:'目前最高階。你竟然真的讀到這裡。', img:'./assets/meow/meow-lv10-professor.png?v=10.34.2'}
    ];

    const reactionLines={
        expSmall:['喔？有在動耶。','勉強算你有學。','這點 EXP 也敢開心？😏','好啦，有進度。'],
        expMedium:['嗯，這次有點東西。','可以喔，沒有完全摸魚。','本喵勉強給你一個讚。','繼續，不准停。'],
        expBig:['蛤？！你突然這麼認真？','大量 EXP！本喵滿意。','今天是吃錯藥了嗎？😼','這波可以。'],
        quizWrong:['蛤？這題？','我剛剛是不是白教了。','嗯……很有勇氣的答案。','你確定？你再看一次。'],
        bossWin:['還真的贏了耶？！','大魔王：卒。😼','這次算你帥。','好啦，本喵承認你有料。'],
        bossLose:['被大魔王扁了齁。','本喵先假裝沒看到。','回去修煉再來啦。','輸一次而已，快去復仇。'],
        writingFail:['這個字還在呼救。','嗯……它目前有自己的想法。','再描一次啦。','手不要飄。'],
        speakingGood:['喔？真的有念出來。','發音可以，本喵准了。','有進步喔，不要得意。','這句算你過。😼'],
        speakingRetry:['再念一次，我有在聽。','不要吞字啦。','慢一點，重新來。','這句還可以救。'],
        task:['今天居然不是來混的。','任務清掉了？有點東西。','本喵宣布：今天不是廢物。😼','好啦，今天算你有交作業。'],
        idle:['你是開網站來陪我發呆的嗎？','……人呢？','我都快睡著了。','喂，還在嗎？']
    };

    const stateLines={
        great:['今天本喵狀態超好，准你多學一點。','看到沒，這就是名師氣場。✨','心情好，今天少酸你兩句。'],
        smug:['你學日文，我負責嫌棄。','不要看我，看字卡。','本喵都有在監督。'],
        grumpy:['今天不想理你。除非摸一下。','心情很差，原因可能是你。','現在講話請先看本喵臉色。'],
        sleepy:['本喵沒電了……你還要卷？','先讓我睡五分鐘。','活力不足，拒絕加班。'],
        hungry:['我的腦袋空空，快去餵幾張字卡。','本喵需要知識，不是藉口。','學習能量太低，你是不是在混。']
    };

    let roamTimer=null,frameTimer=null,bubbleTimer=null,idleTimer=null,expPopTimer=null,reactionTimer=null;
    let interactionTimer=null,interactionResetTimer=null;
    let frameIndex=0,reactionLockUntil=0,isSleeping=false,streakRewardLock=false;

    function clamp(v,min=0,max=100){return Math.max(min,Math.min(max,Number(v)||0));}
    function pick(arr){return arr[Math.floor(Math.random()*arr.length)];}
    function todayKey(){
        const d=new Date();
        return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    }
    function getExp(){return (typeof getTotalEXP==='function')?getTotalEXP():parseInt(localStorage.getItem('jp_rpg_exp')||'0',10);}
    function getLevel(exp=getExp()){
        let result=LEVELS[0];
        for(const lv of LEVELS){if(exp>=lv.min) result=lv;}
        return result;
    }
    function getNextLevel(exp=getExp()){
        const current=getLevel(exp);
        return LEVELS.find(x=>x.level===current.level+1)||null;
    }
    function getLevelProgress(exp=getExp()){
        const cur=getLevel(exp),next=getNextLevel(exp);
        if(!next)return 100;
        return ((exp-cur.min)/(next.min-cur.min))*100;
    }
    function dayDiff(a,b){
        if(!a||!b)return 999;
        return Math.round((new Date(b+'T00:00:00')-new Date(a+'T00:00:00'))/86400000);
    }

    function getPetState(){
        let s=null;
        try{s=JSON.parse(localStorage.getItem(PET_KEY)||'null');}catch(e){}
        if(!s||typeof s!=='object'){
            s={mood:72,energy:72,learning:68,updatedAt:Date.now(),studyStreak:0,lastStudyDate:'',
               interactionDate:'',interactionCounts:{snack:0,cheer:0,pet:0}};
        }
        if(!s.interactionCounts)s.interactionCounts={snack:0,cheer:0,pet:0};
        return applyPetDecay(s);
    }
    function applyPetDecay(s){
        const now=Date.now(),hours=Math.min(48,Math.max(0,(now-Number(s.updatedAt||now))/3600000));
        if(hours>0.05){
            s.mood=clamp((s.mood||70)-hours*.50,15,100);
            s.energy=clamp((s.energy||70)-hours*.95,15,100);
            s.learning=clamp((s.learning||70)-hours*.72,15,100);
            savePetState(s,false);
        }
        return s;
    }
    function savePetState(s,cloud=true){
        s.mood=Math.round(clamp(s.mood)*10)/10;
        s.energy=Math.round(clamp(s.energy)*10)/10;
        s.learning=Math.round(clamp(s.learning)*10)/10;
        s.updatedAt=Date.now();
        localStorage.setItem(PET_KEY,JSON.stringify(s));
        if(cloud&&typeof currentUser!=='undefined'&&currentUser&&typeof db!=='undefined'){
            db.collection('user_progress').doc(currentUser.uid).set({progress:{[PET_KEY]:s}},{merge:true}).catch(()=>{});
        }
        renderPetVitals(s);
    }
    function changePet(d={}){
        const s=getPetState();
        s.mood=clamp(s.mood+(d.mood||0),15,100);
        s.energy=clamp(s.energy+(d.energy||0),15,100);
        s.learning=clamp(s.learning+(d.learning||0),15,100);
        savePetState(s,true);
        return s;
    }
    function getCondition(s){
        const avg=(s.mood+s.energy+s.learning)/3;
        if(s.energy<30)return 'sleepy';
        if(s.learning<32)return 'hungry';
        if(s.mood<32)return 'grumpy';
        if(avg>=86)return 'great';
        return 'smug';
    }
    function defaultSprite(){
        return getLevel().img;
    }
    function conditionSprite(s){
        const c=getCondition(s);
        if(c==='great')return reactionImages.happy;
        if(c==='grumpy')return reactionImages.arms;
        if(c==='sleepy')return sleepFrames[0];
        if(c==='hungry')return reactionImages.teaching;
        return defaultSprite();
    }
    function conditionLine(s){
        const c=getCondition(s);
        return pick(stateLines[c]||stateLines.smug);
    }

    function renderPetVitals(s){
        s=s||getPetState();
        [['meow-mood-fill','meow-mood-text',s.mood],['meow-energy-fill','meow-energy-text',s.energy],['meow-learning-fill','meow-learning-text',s.learning]]
          .forEach(([f,t,v])=>{const fe=document.getElementById(f),te=document.getElementById(t);if(fe)fe.style.width=clamp(v)+'%';if(te)te.textContent=Math.round(v);});
        const c=getCondition(s);
        const cond=document.getElementById('meow-pet-condition');
        if(cond)cond.textContent='狀態：'+({great:'超級得意 ✨',smug:'得意巡堂中 😼',grumpy:'抱胸臭臉中 🙄',sleepy:'沒電想睡 😴',hungry:'腦袋空空 📚'}[c]);
        const hero=document.getElementById('meow-pet-hero-img');
        if(hero)hero.src=conditionSprite(s);
        const streak=document.getElementById('meow-pet-streak');
        if(streak)streak.textContent=`${Number(s.studyStreak||0)} 天`;
        const next=document.getElementById('meow-pet-streak-next');
        if(next)next.textContent=s.lastStudyDate===todayKey()?'今日已累積 🔥':'今天第一次學習會續上連勝';
        renderInteractionUI(s);
    }

    function renderInteractionUI(s){
        const today=todayKey();
        if(s.interactionDate!==today){s.interactionDate=today;s.interactionCounts={snack:0,cheer:0,pet:0};savePetState(s,false);}
        const limits={snack:3,cheer:5,pet:10};
        Object.keys(limits).forEach(k=>{
            const used=Number(s.interactionCounts[k]||0),left=Math.max(0,limits[k]-used);
            const id=k==='snack'?'meow-snack-left':k==='cheer'?'meow-cheer-left':'meow-pet-left';
            const el=document.getElementById(id);
            if(el)el.textContent=`${left}/${limits[k]}`;
            if(el?.closest('button'))el.closest('button').disabled=left<=0;
            const quickClass=k==='snack'?'feed':k;
            document.querySelectorAll(`.meow-quick-btn.${quickClass}`).forEach(q=>{
                q.disabled=MEOW_TEST_MODE ? false : left<=0;
                q.title=MEOW_TEST_MODE
                    ? (k==='snack'?'餵食':k==='pet'?'摸摸':'鼓勵')+'｜測試模式：不扣每日次數'
                    : (k==='snack'?'餵食':k==='pet'?'摸摸':'鼓勵')+`｜今日剩 ${left}/${limits[k]} 次`;
            });
        });
    }

    function setSprite(src,ms=0){
        const el=document.getElementById('meow-teacher-sprite');if(!el)return;
        clearTimeout(interactionTimer);
        clearTimeout(interactionResetTimer);
        el.src=src;
        clearTimeout(reactionTimer);
        if(ms)reactionTimer=setTimeout(()=>el.src=defaultSprite(),ms);
    }
    function playInteractionSequence(type, stepMs=360, holdMs=1100){
        const el=document.getElementById('meow-teacher-sprite');
        const frames=interactionFrames[type];
        if(!el||!Array.isArray(frames)||!frames.length){
            setSprite(defaultSprite(),0);
            return;
        }
        clearTimeout(reactionTimer);
        clearTimeout(interactionTimer);
        clearTimeout(interactionResetTimer);
        let idx=0;
        el.src=frames[idx];
        const nextFrame=()=>{
            idx+=1;
            if(idx<frames.length){
                interactionTimer=setTimeout(()=>{
                    el.src=frames[idx];
                    nextFrame();
                }, stepMs);
            }else{
                interactionResetTimer=setTimeout(()=>{ el.src=defaultSprite(); }, holdMs);
            }
        };
        nextFrame();
    }
    function showBubble(line,ms=3000){
        const b=document.getElementById('meow-teacher-bubble');if(!b)return;
        b.textContent=line;b.classList.add('show');clearTimeout(bubbleTimer);
        bubbleTimer=setTimeout(()=>b.classList.remove('show'),ms);
    }
    function showExp(points){
        const el=document.getElementById('meow-teacher-exp-pop');if(!el)return;
        el.textContent=`+${points} EXP`;el.classList.remove('show');void el.offsetWidth;el.classList.add('show');
        clearTimeout(expPopTimer);expPopTimer=setTimeout(()=>el.classList.remove('show'),1500);
    }
    function animate(cls,ms=800){
        const r=document.getElementById('meow-teacher-roamer');if(!r)return;
        ['meow-jump','meow-shake','meow-bounce','meow-party','meow-sleepy','meow-fast'].forEach(x=>r.classList.remove(x));
        void r.offsetWidth;r.classList.add(cls);setTimeout(()=>r.classList.remove(cls),ms);
    }
    function makeSparks(n=6){
        const r=document.getElementById('meow-teacher-roamer');if(!r)return;
        for(let i=0;i<n;i++){
            const s=document.createElement('span');s.className='meow-teacher-spark';s.textContent=pick(['✨','⭐','✦','💛']);
            s.style.left=(35+Math.random()*30)+'%';s.style.top=(30+Math.random()*35)+'%';
            s.style.setProperty('--sx',`${(Math.random()-.5)*100}px`);s.style.setProperty('--sy',`${-35-Math.random()*70}px`);
            r.appendChild(s);setTimeout(()=>s.remove(),1050);
        }
    }
    function clearSpriteLoop(){clearInterval(frameTimer);frameTimer=null;}
    function playFrameLoop(frames,interval=240,resetToDefault=true){
        const el=document.getElementById('meow-teacher-sprite');if(!el||!frames||!frames.length)return;
        clearSpriteLoop();
        let i=0;
        el.src=frames[0];
        frameTimer=setInterval(()=>{i=(i+1)%frames.length;el.src=frames[i];},interval);
        if(resetToDefault===false)return;
    }
    function stopWalk(){
        clearSpriteLoop();
        const r=document.getElementById('meow-teacher-roamer');
        if(r)r.classList.remove('meow-sleepy');
        setSprite(defaultSprite());
    }
    function startWalk(){
        frameIndex=0;
        playFrameLoop(walkFrames,240,false);
    }
    function startLazy(){
        const r=document.getElementById('meow-teacher-roamer');
        if(r)r.classList.remove('meow-sleepy');
        playFrameLoop(lazyFrames,700,false);
    }
    function startSleep(){
        const r=document.getElementById('meow-teacher-roamer');
        if(r)r.classList.add('meow-sleepy');
        playFrameLoop(sleepFrames,900,false);
    }
    function freeze(ms=1000){reactionLockUntil=Date.now()+ms;stopWalk();}

    function syncQuickActionsSide(){
        const roamer=document.getElementById('meow-teacher-roamer');
        const quick=document.getElementById('meow-quick-actions');
        if(!roamer||!quick) return;
        const rect=roamer.getBoundingClientRect();
        const roomRight=window.innerWidth - rect.right;
        quick.classList.toggle('side-left', roomRight < 92);
    }

    function roam(){
        const r=document.getElementById('meow-teacher-roamer');if(!r)return;
        syncQuickActionsSide();
        if(Date.now()<reactionLockUntil||isSleeping){roamTimer=setTimeout(roam,800);return;}
        const max=Math.max(12,innerWidth-r.offsetWidth-12),cur=parseFloat(getComputedStyle(r).left)||18;
        const roll=Math.random();
        if(roll<.22){
            startLazy();
            if(Math.random()<.55)showBubble(pick(['哼，本喵先趴一下。','讀你的，我懶一下。','別吵，我在優雅偷懶。']),2200);
            setTimeout(()=>{if(!isSleeping){stopWalk();syncQuickActionsSide();}},1800);
        }else if(roll<.40){
            stopWalk();
            if(Math.random()<.4)showBubble(conditionLine(getPetState()));
        }else{
            const target=12+Math.random()*Math.max(0,max-12);
            r.classList.toggle('is-facing-left',target<cur);
            startWalk();r.style.left=target+'px';setTimeout(()=>{if(!isSleeping){stopWalk();syncQuickActionsSide();}},950);syncQuickActionsSide();
        }
        roamTimer=setTimeout(roam,1800+Math.random()*2600);
    }

    function resetIdle(){
        const r=document.getElementById('meow-teacher-roamer');
        if(isSleeping){
            isSleeping=false;
            if(r)r.classList.remove('meow-sleepy');
            stopWalk();
            showBubble('喔，你還在喔。',1800);
            animate('meow-bounce',600);
        }
        clearTimeout(idleTimer);
        idleTimer=setTimeout(()=>{
            isSleeping=true;
            startSleep();
            showBubble(pick(['……Zzz。不要吵本喵。','本喵先睡，醒了再嫌你。','今天的監工額度用完了，先睡。']),3500);
        },75000);
    }

    function recordStudy(source){
        if(source==='streakReward'||streakRewardLock)return;
        const s=getPetState(),today=todayKey();
        if(s.lastStudyDate===today)return;
        const diff=dayDiff(s.lastStudyDate,today);
        s.studyStreak=diff===1?Number(s.studyStreak||0)+1:1;s.lastStudyDate=today;
        const reward=Math.min(100,15+s.studyStreak*3);
        s.mood=clamp(s.mood+4);s.learning=clamp(s.learning+5);savePetState(s,true);
        streakRewardLock=true;if(typeof addEXP==='function')addEXP(reward,{source:'streakReward'});streakRewardLock=false;
        showBubble(`連續 ${s.studyStreak} 天。居然撐住了？😏`,3200);animate('meow-party',850);makeSparks(7);
    }

    function showInteractionFx(symbol){
        const r=document.getElementById('meow-teacher-roamer');
        if(!r)return;
        const fx=document.createElement('div');
        fx.className='meow-interaction-fx';
        fx.textContent=symbol;
        r.appendChild(fx);
        setTimeout(()=>fx.remove(),1200);
    }

    window.interactMeowTeacher=function(type){
        const s=getPetState(),today=todayKey(),limits={snack:3,cheer:5,pet:10};
        if(s.interactionDate!==today){s.interactionDate=today;s.interactionCounts={snack:0,cheer:0,pet:0};}
        const used=Number(s.interactionCounts[type]||0);
        if(!MEOW_TEST_MODE && used>=limits[type]){showBubble('今天夠了，別黏。',2000);return;}
        if(!MEOW_TEST_MODE) s.interactionCounts[type]=used+1;
        freeze(1650);
        if(type==='snack'){
            if(!MEOW_TEST_MODE){s.energy=clamp(s.energy+9);s.mood=clamp(s.mood+3);}
            playInteractionSequence('snack',380,1200);
            showBubble(pick(['嗯～這個可以。','終於知道要進貢了？😼','再一口……明天再說。']),2200);
            showInteractionFx('🍙💕');animate('meow-bounce',720);
        }
        if(type==='cheer'){
            if(!MEOW_TEST_MODE){s.mood=clamp(s.mood+6);s.learning=clamp(s.learning+4);}
            playInteractionSequence('cheer',340,1200);
            showBubble(pick(['這樣才對，繼續。','嗯？你今天很會講話嘛。','本喵收到鼓勵了，准你加油。']),2200);
            showInteractionFx('✨📣');animate('meow-jump',720);
        }
        if(type==='pet'){
            if(!MEOW_TEST_MODE){s.mood=clamp(s.mood+5);}
            playInteractionSequence('pet',360,1200);
            showBubble(pick(['欸！誰准你摸……再一下。','手法普通，本喵勉強接受。','……好啦，不討厭。']),2200);
            showInteractionFx('💗🐾');animate('meow-bounce',720);
        }
        if(!MEOW_TEST_MODE) savePetState(s,true);
        resetIdle();
    };

    function react(type,detail={}){
        freeze(type==='boss-win'?1500:950);
        if(type==='quiz-wrong'){setSprite(reactionImages.arms,1500);showBubble(pick(reactionLines.quizWrong));animate('meow-shake',520);}
        else if(type==='boss-win'){changePet({mood:6,energy:4,learning:6});setSprite(reactionImages.happy,1800);showBubble(pick(reactionLines.bossWin));animate('meow-party',900);makeSparks(10);}
        else if(type==='boss-lose'){setSprite(reactionImages.smug,1500);showBubble(pick(reactionLines.bossLose));animate('meow-shake',560);}
        else if(type==='writing-fail'){setSprite(reactionImages.mischief,1300);showBubble(pick(reactionLines.writingFail));animate('meow-shake',500);}
        else if(type==='speaking-good'){changePet({mood:3,energy:2,learning:4});setSprite(reactionImages.wave,1500);showBubble(pick(reactionLines.speakingGood));animate('meow-jump',650);makeSparks(4);}
        else if(type==='speaking-retry'){setSprite(reactionImages.arms,1300);showBubble(pick(reactionLines.speakingRetry));animate('meow-bounce',680);}
        else if(type==='task-complete'){changePet({mood:5,learning:4});setSprite(reactionImages.teaching,1700);showBubble(pick(reactionLines.task));animate('meow-party',900);makeSparks(9);}
        resetIdle();
    }

    function reactExp(d){
        const p=Number(d?.points||0),prev=Number(d?.previousExp||0),cur=Number(d?.currentExp||0),source=d?.source||'general';
        if(p<=0)return;
        if(source!=='streakReward')recordStudy(source);
        const boost=Math.min(8,Math.max(1,p/8));
        changePet({mood:Math.min(5,boost*.6),energy:Math.min(4,boost*.4),learning:boost});showExp(p);
        const oldLv=getLevel(prev),newLv=getLevel(cur);
        if(newLv.level>oldLv.level){
            freeze(2100);setSprite(newLv.img,2300);showBubble(`升級！Lv.${newLv.level}「${newLv.title}」解鎖 😼`,4300);animate('meow-party',1000);makeSparks(16);return;
        }
        if(source==='streakReward')return;
        if(p>=100){setSprite(reactionImages.happy,1500);showBubble(pick(reactionLines.expBig));animate('meow-party',900);makeSparks(8);}
        else if(p>=20){setSprite(reactionImages.wave,1200);showBubble(pick(reactionLines.expMedium));animate('meow-jump',650);}
        else{setSprite(reactionImages.mischief,1000);showBubble(pick(reactionLines.expSmall),2200);animate('meow-bounce',620);}
        resetIdle();
    }

    window.meowTeacherReact=react;
    window.addEventListener('meowTeacherExp',e=>reactExp(e.detail||{}));

    window.openMeowTeacherModal=function(event){
        if(event)event.stopPropagation();
        const exp=getExp(),lv=getLevel(exp),next=getNextLevel(exp),modal=document.getElementById('meowTeacherModal');
        const level=document.getElementById('meow-pet-level'),expText=document.getElementById('meow-pet-exp-text');
        const fill=document.getElementById('meow-pet-exp-fill'),stage=document.getElementById('meow-pet-stage');
        const evo=document.getElementById('meow-pet-evolution-text'),quote=document.getElementById('meow-pet-quote');
        if(level)level.textContent=`Lv.${lv.level}｜${lv.title}`;
        if(expText)expText.textContent=next?`${exp} / ${next.min} EXP`:`${exp} EXP｜目前最高階`;
        if(fill)fill.style.width=Math.max(0,Math.min(100,getLevelProgress(exp)))+'%';
        if(stage)stage.textContent=lv.desc;
        if(evo)evo.textContent=next?`下一級「${next.title}」：還差 ${next.min-exp} EXP`:'✨ 已達目前最高階';
        const s=getPetState();if(quote)quote.textContent='「'+conditionLine(s)+'」';renderPetVitals(s);
        if(modal)modal.style.display='flex';freeze(1200);showBubble('幹嘛？想看我？😼');resetIdle();
    };
    window.closeMeowTeacherModal=function(event){
        if(event&&event.target!==document.getElementById('meowTeacherModal'))return;
        const m=document.getElementById('meowTeacherModal');if(m)m.style.display='none';
    };

    window.addEventListener('resize',()=>{
        const r=document.getElementById('meow-teacher-roamer');if(!r)return;
        const max=Math.max(12,innerWidth-r.offsetWidth-12),cur=parseFloat(getComputedStyle(r).left)||12;
        if(cur>max)r.style.left=max+'px';
    });
    ['pointerdown','keydown','touchstart','scroll'].forEach(e=>window.addEventListener(e,resetIdle,{passive:true}));

    window.addEventListener('load',()=>{
        const sprite=document.getElementById('meow-teacher-sprite');if(sprite)sprite.src=defaultSprite();
        renderPetVitals(getPetState());
        setTimeout(roam,900);
        setTimeout(()=>showBubble(MEOW_TEST_MODE ? '🧪 互動測試模式：今天可以無限摸我。' : '喵喵老師來巡堂了 😼'),1300);
        resetIdle();
    });
})();
