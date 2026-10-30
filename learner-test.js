(async()=>{
 const $=id=>document.getElementById(id);
 let school=null;
 try{school=JSON.parse(sessionStorage.getItem('hpt_school_session')||'null')}catch{}
 if(!school?.id&&window.parent!==window){
  school=await new Promise(resolve=>{
   let settled=false;
   const receive=event=>{
    if(event.source!==window.parent||event.data?.type!=='HPT_SCHOOL_SESSION')return;
    settled=true;window.removeEventListener('message',receive);
    const candidate=event.data.session;
    try{if(candidate?.id)sessionStorage.setItem('hpt_school_session',JSON.stringify(candidate))}catch{}
    resolve(candidate?.id?candidate:null);
   };
   window.addEventListener('message',receive);
   setTimeout(()=>{if(!settled){window.removeEventListener('message',receive);resolve(null)}},2500);
  });
 }
 if(!school?.id){alert('Please sign in through your driving school first.');if(window.parent!==window){window.parent.postMessage({type:'HPT_LEARNER_EXIT'},'*')}else{location.replace('index.html')}return}
 $('schoolLabel').textContent=school.school_name||'School access verified';
 const schoolName=school.school_name||'Driving School';
 $('schoolBrandEyebrow').textContent=schoolName.toUpperCase();
 $('schoolBrandName').textContent='LEARNER’S TEST';
 document.title=schoolName+' | Kerala Learner’s Test';
 const brandColor=school.brand_color||'#087cf0',darkColor=school.dark_color||'#0064d5';
 document.documentElement.style.setProperty('--learner-accent-color',brandColor);
 document.documentElement.style.setProperty('--learner-accent-dark',darkColor);
 if(school.logo_url){
  const logo=$('schoolLogo');logo.src=school.logo_url;logo.hidden=false;logo.onerror=()=>{logo.hidden=true};
  const gateLogo=$('gateSchoolLogo');gateLogo.src=school.logo_url;gateLogo.hidden=false;gateLogo.onerror=()=>{gateLogo.hidden=true};
 }
 $('gateSchoolName').textContent=schoolName.toUpperCase();

 // Fullscreen must be requested from a user gesture on this page. A page-to-page
 // navigation from the school portal cannot carry the previous page's fullscreen state.
 const accessForm=$('accessForm'),accessInput=$('learnerAccessCode'),accessGate=$('accessGate');
 function isFullscreenActive(){
  if(document.fullscreenElement)return true;
  try{if(window.parent!==window&&window.parent.document.fullscreenElement)return true}catch(_){}
  return false;
 }
 async function enterFullscreen(){
  if(isFullscreenActive())return true;
  const target=document.documentElement;
  if(!target.requestFullscreen)return false;
  try{await target.requestFullscreen({navigationUI:'hide'});return true}catch(_){return false}
 }
 function updateFullscreenButton(){
  const active=isFullscreenActive();
  $('fullscreenBtn').hidden=active;
  $('fullscreenNotice').hidden=active;
 }
 document.addEventListener('fullscreenchange',updateFullscreenButton);
 try{if(window.parent!==window)window.parent.document.addEventListener('fullscreenchange',updateFullscreenButton)}catch(_){}
 $('fullscreenBtn').addEventListener('click',async()=>{
  const ok=await enterFullscreen();
  $('fullscreenNotice').hidden=ok;
  updateFullscreenButton();
 });
 accessForm.addEventListener('submit',async event=>{
  event.preventDefault();
  if(accessInput.value.trim()!=='4734'){
   $('accessError').hidden=false;accessInput.value='';accessInput.focus();return;
  }
  $('accessError').hidden=true;
  // Invoke immediately while the access-code submit still has user activation.
  const request=enterFullscreen();
  accessGate.hidden=true;
  const fullscreenOk=await request;
  $('fullscreenNotice').hidden=fullscreenOk;
  updateFullscreenButton();
  $('startBtn').focus();
 });
 accessInput.addEventListener('input',()=>{accessInput.value=accessInput.value.replace(/\D/g,'').slice(0,4);$('accessError').hidden=true});
 window.addEventListener('pageshow',event=>{
  if(event.persisted){accessGate.hidden=false;accessInput.value='';$('accessError').hidden=true;accessInput.focus()}
 });
 setTimeout(()=>accessInput.focus(),80);

 const bank=window.HPT_PRACTICE_BANK||{};
 let lang='en',mode='practice',pool=[],index=0,answers={},checked={},mockTimer=null,remaining=900;
 const letters=['A','B','C','D'];
 const shell=document.querySelector('.exam-shell');
 function shuffle(a){a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
 function questions(){return bank[lang]||[]}
 function updateModeStats(isMock){
  $('bankCountStat').hidden=isMock;
  $('setupStats').classList.toggle('mock-stats',isMock);
 }
 function selectMode(nextMode){
  clearInterval(mockTimer);mockTimer=null;$('timerBox').hidden=true;
  shell.classList.remove('exam-active');
  mode=nextMode;
  $('practiceTab').classList.toggle('active',mode==='practice');
  $('mockTab').classList.toggle('active',mode==='mock');
  $('setup').hidden=false;$('exam').hidden=true;$('result').hidden=true;
  $('setupTitle').textContent=mode==='mock'?'Mock Examination':'Prepare for your Learner’s Test';
  $('setupText').textContent=mode==='mock'?'30 random questions · 15 minutes · 18 correct answers to pass.':'Practise the official learner questions at your own pace.';
  $('startBtn').textContent=mode==='mock'?'START MOCK EXAM →':'START PRACTICE →';
  $('modeSubtitle').textContent=mode==='mock'?'Mock Examination':'Learner Practice';
  updateModeStats(mode==='mock');
 }
 function start(){
  mode=$('mockTab').classList.contains('active')?'mock':'practice';
  const source=questions();
  pool=mode==='mock'?shuffle(source).slice(0,30):shuffle(source);
  index=0;answers={};checked={};
  $('setup').hidden=true;$('result').hidden=true;$('exam').hidden=false;
  $('timerBox').hidden=mode!=='mock';$('questionMap').hidden=mode!=='mock';
  $('checkBtn').hidden=mode!=='practice';$('submitBtn').hidden=mode!=='mock';
  $('modeSubtitle').textContent=mode==='mock'?'Mock Examination':'Learner Practice';
  shell.classList.toggle('mock',mode==='mock');shell.classList.add('exam-active');
  clearInterval(mockTimer);mockTimer=null;
  if(mode==='mock'){remaining=900;paintTimer();mockTimer=setInterval(tick,1000)}else{$('timerBox').hidden=true}
  render();
 }
 function paintTimer(){const m=Math.floor(Math.max(0,remaining)/60),s=Math.max(0,remaining)%60;$('timer').textContent=`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`}
 function tick(){remaining=Math.max(0,remaining-1);paintTimer();if(remaining<=0){clearInterval(mockTimer);finish()}}
 function render(){
  const q=pool[index];if(!q)return;
  $('questionCounter').textContent=`Question ${index+1} / ${pool.length}`;
  $('progressPct').textContent=Math.round((index+1)/pool.length*100)+'%';
  $('progressFill').style.width=(index+1)/pool.length*100+'%';
  $('qNumber').textContent=`QUESTION ${q.questionNo||q.id}`;
  $('questionMl').textContent=lang==='ml'?q.question:'';
  $('questionEn').textContent=lang==='en'?q.question:'';
  $('questionMl').hidden=lang!=='ml';$('questionEn').hidden=lang==='ml';
  const img=q.image?`learner-question-assets/${q.image.split('/').pop()}`:'';
  $('imageWrap').hidden=!img;$('questionLayout').classList.toggle('no-image',!img);
  if(img){$('questionImage').src=img;$('questionImage').alt='Question '+(q.questionNo||q.id)}
  $('answers').innerHTML=(q.options||[]).map((option,i)=>`<button type="button" class="answer ${answers[index]===i?'selected':''} ${checked[index]!==undefined&&i===q.correct?'correct':''} ${checked[index]!==undefined&&answers[index]===i&&i!==q.correct?'wrong':''}" data-answer="${i}"><span class="answer-letter">${letters[i]}</span><span class="answer-copy"><strong>${option}</strong></span></button>`).join('');
  document.querySelectorAll('[data-answer]').forEach(button=>button.addEventListener('click',()=>{
   if(mode==='practice'&&checked[index]!==undefined)return;
   answers[index]=Number(button.dataset.answer);render();
  }));
  $('prevBtn').disabled=index===0;
  $('nextBtn').hidden=mode==='mock'&&index===pool.length-1;
  $('nextBtn').textContent=index===pool.length-1?'FINISH →':'NEXT →';
  $('submitBtn').hidden=mode!=='mock';
  $('feedback').hidden=checked[index]===undefined;
  $('feedback').textContent=checked[index]===undefined?'':(answers[index]===q.correct?'Correct answer!':'Correct answer: '+letters[q.correct]);
  if(mode==='mock')drawMap();
 }
 function drawMap(){
  $('questionMap').innerHTML=pool.map((q,i)=>`<button type="button" class="map-dot ${i===index?'active':''} ${answers[i]!==undefined?'done':''}" data-jump="${i}" aria-label="Go to question ${i+1}">${i+1}</button>`).join('');
  document.querySelectorAll('[data-jump]').forEach(button=>button.addEventListener('click',()=>{index=Number(button.dataset.jump);render()}));
 }
 function next(){if(index<pool.length-1){index++;render()}else if(mode==='practice'){
  $('exam').hidden=true;shell.classList.remove('exam-active');$('setup').hidden=false;
  $('setupTitle').textContent='Practice session completed';
  $('setupText').textContent='You have reached the end of this practice set. Start again to practise another shuffled set.';
  $('startBtn').textContent='PRACTISE AGAIN →';
 }}
 function finish(){
  clearInterval(mockTimer);mockTimer=null;$('timerBox').hidden=true;shell.classList.remove('exam-active');
  let correct=0,wrong=0,skip=0;
  pool.forEach((q,i)=>{if(answers[i]===undefined)skip++;else if(answers[i]===q.correct)correct++;else wrong++});
  $('exam').hidden=true;$('result').hidden=false;
  $('score').textContent=`${correct} / ${pool.length}`;
  $('correctCount').textContent=correct;$('wrongCount').textContent=wrong;$('skipCount').textContent=skip;
  $('accuracy').textContent=Math.round(correct/pool.length*100)+'%';
  const passed=correct>=18;
  $('resultTitle').textContent=passed?'Congratulations! You passed':'Keep practising';
  $('resultStatus').textContent=passed?'PASS MARK ACHIEVED':'MORE PRACTICE NEEDED';
  $('resultStatus').classList.toggle('passed',passed);
  $('resultIcon').textContent=passed?'✓':'↻';
  $('resultMessage').textContent=passed?'Excellent effort. You have reached the mock examination pass mark.':'You need at least 18 correct answers to pass. Review the questions and try again.';
 }
 $('practiceTab').onclick=()=>selectMode('practice');
 $('mockTab').onclick=()=>selectMode('mock');
 $('startBtn').onclick=start;
 $('prevBtn').onclick=()=>{if(index>0){index--;render()}};
 $('nextBtn').onclick=next;
 $('clearBtn').onclick=()=>{delete answers[index];delete checked[index];render()};
 $('checkBtn').onclick=()=>{checked[index]=true;render()};
 $('submitBtn').onclick=()=>{if(confirm('Submit your mock examination now?'))finish()};
 $('retakeBtn').onclick=()=>{selectMode('mock');start()};
 $('backHomeBtn').onclick=()=>selectMode('practice');
 $('langEn').onclick=()=>setLang('en');$('langMl').onclick=()=>setLang('ml');
 function setLang(nextLang){
  lang=nextLang;$('langEn').classList.toggle('active',lang==='en');$('langMl').classList.toggle('active',lang==='ml');
  $('totalQuestions').textContent=questions().length;
  if(!$('exam').hidden){
   const nextPool=questions();pool=pool.map(q=>nextPool.find(item=>item.id===q.id)||q);render();
  }
 }
 $('exitBtn').onclick=async()=>{
  if(mode==='mock'&&!$('exam').hidden&&!confirm('Exit the examination? Your current mock attempt will be discarded.'))return;
  clearInterval(mockTimer);
  if(window.parent!==window){
   const targetOrigin=location.origin==='null'?'*':location.origin;
   window.parent.postMessage({type:'HPT_LEARNER_EXIT'},targetOrigin);
   return;
  }
  if(document.fullscreenElement){try{await document.exitFullscreen()}catch(_){}}
  location.href='index.html';
 };
 $('totalQuestions').textContent=questions().length;
 updateModeStats(false);
 updateFullscreenButton();
})();
