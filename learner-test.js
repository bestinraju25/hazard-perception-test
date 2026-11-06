(async()=>{
 const $=id=>document.getElementById(id);
 let school=null,candidate=null;
 try{school=JSON.parse(sessionStorage.getItem('hpt_school_session')||'null')}catch{}
 try{candidate=JSON.parse(sessionStorage.getItem('hpt_learner_candidate')||'null')}catch{}
 if(window.parent!==window&&(!school?.id||!candidate?.name||!candidate?.phone)){
  const received=await new Promise(resolve=>{let settled=false;const receive=event=>{if(event.source!==window.parent||event.data?.type!=='HPT_SCHOOL_SESSION')return;settled=true;window.removeEventListener('message',receive);resolve({session:event.data.session||null,candidate:event.data.candidate||null})};window.addEventListener('message',receive);setTimeout(()=>{if(!settled){window.removeEventListener('message',receive);resolve({session:null,candidate:null})}},2500)});
  if(received.session?.id)school=received.session;
  if(received.candidate?.name&&received.candidate?.phone)candidate=received.candidate;
  try{if(school?.id)sessionStorage.setItem('hpt_school_session',JSON.stringify(school));if(candidate?.name)sessionStorage.setItem('hpt_learner_candidate',JSON.stringify(candidate))}catch{}
 }
 if(!school?.id){alert('Please sign in through your driving school first.');if(window.parent!==window)window.parent.postMessage({type:'HPT_LEARNER_EXIT'},'*');else location.replace('index.html');return}
 // Learner's Test (mock exam and practice hub) is Kerala-specific. Other states use HPT only.
 if(String(school.state||'Kerala').trim().toLowerCase()!=='kerala'){
  alert('Learner’s Mock Test is currently available only to driving schools in Kerala. Your school can use the Hazard Perception Test.');
  if(window.parent!==window)window.parent.postMessage({type:'HPT_LEARNER_EXIT'},'*');else location.replace('index.html');
  return;
 }
 const schoolName=school.school_name||'Driving School';
 $('schoolLabel').textContent=schoolName;$('schoolBrandEyebrow').textContent=schoolName.toUpperCase();$('schoolBrandName').textContent='LEARNER’S TEST';document.title=schoolName+' | Kerala Learner’s Test';
 document.documentElement.style.setProperty('--brand',school.brand_color||'#1769cf');
 document.documentElement.style.setProperty('--brand2',school.dark_color||'#0b5db5');
 if(school.logo_url){const logo=$('schoolLogo');logo.src=school.logo_url;logo.hidden=false;logo.onerror=()=>logo.hidden=true;const gateLogo=$('gateSchoolLogo');gateLogo.src=school.logo_url;gateLogo.hidden=false;gateLogo.onerror=()=>gateLogo.hidden=true}
 $('gateSchoolName').textContent=schoolName.toUpperCase();
 if(candidate?.name&&candidate?.phone&&String(candidate.school_id||school.id)===String(school.id)){
  $('accessGate').hidden=true;
 }else{
  $('accessGate').hidden=false;$('manualCandidate').hidden=false;
 }
 const accessForm=$('accessForm'),accessInput=$('learnerAccessCode'),accessGate=$('accessGate');
 accessForm.addEventListener('submit',e=>{e.preventDefault();if(accessInput.value.trim()!=='4734'){$('accessError').hidden=false;accessInput.value='';accessInput.focus();return}$('accessError').hidden=true;accessGate.hidden=true;$('manualCandidate').hidden=false;$('manualStudentName').focus()});
 accessInput.addEventListener('input',()=>{accessInput.value=accessInput.value.replace(/\D/g,'').slice(0,4);$('accessError').hidden=true});
 const bank=window.HPT_PRACTICE_BANK||{};const QUESTION_SECONDS=30,TOTAL_SECONDS=900;let lang='en',mode='practice',pool=[],index=0,answers={},checked={},mockTimer=null,remaining=TOTAL_SECONDS,questionRemaining=QUESTION_SECONDS,totalDeadline=0,questionDeadline=0,lastTickedQuestionSecond=QUESTION_SECONDS,startedAt=null,lastResult=null,sb=null,audioContext=null;
 try{if(window.supabase?.createClient&&window.RAJU_HPT_CONFIG?.supabaseUrl&&window.RAJU_HPT_CONFIG?.supabaseAnonKey)sb=window.supabase.createClient(window.RAJU_HPT_CONFIG.supabaseUrl,window.RAJU_HPT_CONFIG.supabaseAnonKey)}catch(e){console.warn('Learner database client unavailable',e)}
 const letters=['A','B','C','D'],shell=document.querySelector('.exam-shell');
 const hptAttemptStart=()=>Date.now();let startMs=null;
 function shuffle(a){a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
 function questions(){return Array.isArray(bank[lang])?bank[lang]:[]}
 function shuffleIdentity(){
  const phone=String(candidate?.phone||'').replace(/\D/g,'');
  const source=`${school?.id||school?.school_id||'school'}|${phone}|${lang}`;
  let hash=2166136261;for(let i=0;i<source.length;i++){hash^=source.charCodeAt(i);hash=Math.imul(hash,16777619)}
  return `hpt_mock_question_deck_v1_${(hash>>>0).toString(36)}`;
 }
 function readQuestionDeck(){
  const key=shuffleIdentity();
  const stores=[];
  try{if(window.localStorage)stores.push(window.localStorage)}catch(_){ }
  try{if(window.sessionStorage)stores.push(window.sessionStorage)}catch(_){ }
  for(const storage of stores){
   try{const raw=storage.getItem(key);if(raw){const parsed=JSON.parse(raw);if(parsed&&Array.isArray(parsed.deck)&&Array.isArray(parsed.recent))return{key,state:parsed,storage}}}catch(_){ }
  }
  return{key,state:{deck:[],recent:[]},storage:stores[0]||null};
 }
 function getFreshMockQuestions(){
  const all=questions();if(all.length<30)return shuffle(all);
  const ids=all.map(q=>String(q.id));
  const saved=readQuestionDeck();
  let deck=saved.state.deck.map(String).filter(id=>ids.includes(id));
  let recent=saved.state.recent.map(String).filter(id=>ids.includes(id)).slice(-60);
  // Remove any stale/duplicate deck IDs while retaining the saved shuffled order.
  deck=[...new Set(deck)].filter(id=>!recent.includes(id));
  if(deck.length<30){
   const excluded=new Set([...deck,...recent]);
   const fresh=shuffle(ids.filter(id=>!excluded.has(id)));
   deck.push(...fresh.slice(0,30-deck.length));
  }
  // If a changed/short bank leaves too few unseen IDs, relax oldest history first.
  if(deck.length<30){
   const more=shuffle(ids.filter(id=>!deck.includes(id)));
   deck.push(...more.slice(0,30-deck.length));
  }
  const chosen=deck.splice(0,30);
  recent=[...recent,...chosen].slice(-60);
  const nextState={version:1,deck,recent,updatedAt:new Date().toISOString()};
  try{(saved.storage||window.localStorage).setItem(saved.key,JSON.stringify(nextState))}catch(_){try{window.sessionStorage.setItem(saved.key,JSON.stringify(nextState))}catch(__){}}
  const lookup=new Map(all.map(q=>[String(q.id),q]));
  return chosen.map(id=>lookup.get(id)).filter(Boolean);
 }
 function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
 // Small synthesized UI sounds keep the mock test self-contained (no extra audio files).
 // The option sound is deliberately identical for every answer, so it never hints at correctness.
 function getAudioContext(){
  const AudioContextClass=window.AudioContext||window.webkitAudioContext;
  if(!AudioContextClass)return null;
  try{if(!audioContext)audioContext=new AudioContextClass();if(audioContext.state==='suspended')audioContext.resume().catch(()=>{});return audioContext}catch(_){return null}
 }
 function playSoftTone({frequency=900,endFrequency=650,duration=.045,volume=.035,type='sine'}={}){
  const ctx=getAudioContext();if(!ctx)return;
  try{
   const now=ctx.currentTime,osc=ctx.createOscillator(),gain=ctx.createGain();
   osc.type=type;osc.frequency.setValueAtTime(frequency,now);
   if(endFrequency>0)osc.frequency.exponentialRampToValueAtTime(Math.max(1,endFrequency),now+duration);
   gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(volume,now+.004);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
   osc.connect(gain);gain.connect(ctx.destination);osc.start(now);osc.stop(now+duration+.008);
  }catch(_){ }
 }
 function playOptionSound(){playSoftTone({frequency:1050,endFrequency:620,duration:.052,volume:.045,type:'triangle'})}
 function playCountdownTick(){playSoftTone({frequency:1450,endFrequency:1250,duration:.026,volume:.018,type:'sine'})}
 function setMode(next){clearInterval(mockTimer);mockTimer=null;$('timerBox').hidden=true;$('timerBox').classList.remove('timer-warning','timer-critical');mode=next;shell.classList.remove('exam-active');$('practiceTab').classList.toggle('active',mode==='practice');$('mockTab').classList.toggle('active',mode==='mock');$('setup').hidden=false;$('exam').hidden=true;$('result').hidden=true;$('setupTitle').textContent=mode==='mock'?'Mock Test':'Learner Practice';$('setupText').textContent=mode==='mock'?'30 questions · 30 seconds each · 15 minutes total · 18 correct answers to pass.':'Practise official MVD Learner’s Test questions at your own pace.';$('startBtn').textContent=mode==='mock'?'START EXAM →':'START PRACTICE →';$('modeSubtitle').textContent=mode==='mock'?'Mock Examination':'Learner Practice';$('bankCountStat').hidden=mode==='mock';$('setupStats').classList.toggle('mock-stats',mode==='mock');populateInstructions()}
 function populateInstructions(){const ml=lang==='ml';$('instructionsHeading').textContent=ml?'നിർദ്ദേശങ്ങൾ':'Instructions';const items=ml?['മോക്ക് പരീക്ഷയിൽ 30 ചോദ്യങ്ങളുണ്ട്.','ഓരോ ചോദ്യത്തിനും ഒരു മാർക്ക്. നെഗറ്റീവ് മാർക്കില്ല.','ഓരോ ചോദ്യത്തിനും 30 സെക്കൻഡ് ലഭിക്കും. സമയം കഴിഞ്ഞാൽ അടുത്ത ചോദ്യത്തിലേക്ക് സ്വയം മാറും.','മുഴുവൻ പരീക്ഷയ്ക്കും 15 മിനിറ്റ് (900 സെക്കൻഡ്) ലഭിക്കും.','വിജയിക്കാൻ കുറഞ്ഞത് 18 ചോദ്യങ്ങൾക്ക് ശരിയായ ഉത്തരം നൽകണം.','ഉത്തരം തിരഞ്ഞെടുത്ത ശേഷം ഉറപ്പിക്കുക അമർത്തുക. ഉത്തരം അറിയില്ലെങ്കിൽ ഒഴിവാക്കുക അമർത്തുക.']:['There are 30 questions in the mock examination.','Each question carries one mark. There is no negative marking.','You have 30 seconds for each question. When time runs out, the test automatically moves to the next question.','The overall examination time limit is 15 minutes (900 seconds).','You must answer at least 18 questions correctly to pass.','Select an option and tap Confirm to record your answer. Tap Skip if you do not know the answer.'];$('instructionsList').innerHTML=items.map(x=>`<li>${esc(x)}</li>`).join('')}
 function validateCandidate(){if(candidate?.name&&candidate?.phone)return true;const name=$('manualStudentName')?.value.trim()||'',phone=$('manualStudentPhone')?.value.trim()||'';if(!name){alert(lang==='ml'?'വിദ്യാർത്ഥിയുടെ പേര് നൽകുക.':'Enter student name.');$('manualStudentName')?.focus();return false}if(phone.replace(/\D/g,'').length<10){alert(lang==='ml'?'ശരിയായ മൊബൈൽ നമ്പർ നൽകുക.':'Enter a valid mobile number.');$('manualStudentPhone')?.focus();return false}candidate={name,phone,school_id:school.id,school_name:schoolName,mode};try{sessionStorage.setItem('hpt_learner_candidate',JSON.stringify(candidate))}catch{}return true}
 function start(){if(!validateCandidate())return;mode=candidate.mode==='mock'?'mock':mode;pool=mode==='mock'?getFreshMockQuestions():shuffle(questions());if(mode==='mock'&&pool.length<30){alert('The official question bank is incomplete. Please contact the provider.');return}index=0;answers={};checked={};lastResult=null;$('setup').hidden=true;$('result').hidden=true;$('exam').hidden=false;$('timerBox').hidden=mode!=='mock';$('timerBox').classList.remove('timer-warning','timer-critical');$('modeSubtitle').textContent=mode==='mock'?'Mock Examination':'Learner Practice';shell.classList.toggle('mock',mode==='mock');shell.classList.add('exam-active');startMs=Date.now();clearInterval(mockTimer);if(mode==='mock'){getAudioContext();remaining=TOTAL_SECONDS;questionRemaining=QUESTION_SECONDS;totalDeadline=Date.now()+TOTAL_SECONDS*1000;questionDeadline=Date.now()+QUESTION_SECONDS*1000;lastTickedQuestionSecond=QUESTION_SECONDS;paintTimer();mockTimer=setInterval(tick,100)}else $('timerBox').hidden=true;render()}
 function paintTimer(){
  const totalMinutes=Math.floor(Math.max(0,remaining)/60),totalSeconds=Math.max(0,remaining)%60;
  $('timer').textContent=`${String(totalMinutes).padStart(2,'0')}:${String(totalSeconds).padStart(2,'0')}`;
  $('questionTimer').textContent=`00:${String(Math.max(0,questionRemaining)).padStart(2,'0')}`;
  $('timerBox').classList.toggle('timer-warning',mode==='mock'&&questionRemaining<=10&&questionRemaining>5);
  $('timerBox').classList.toggle('timer-critical',mode==='mock'&&questionRemaining<=5);
 }
 function timeoutCurrentQuestion(){
  if(mode!=='mock'||$('exam').hidden)return;
  if(checked[index]===undefined){delete answers[index];checked[index]='skipped'}
  if(index>=pool.length-1){clearInterval(mockTimer);mockTimer=null;finish();return}
  index++;questionRemaining=QUESTION_SECONDS;questionDeadline=Date.now()+QUESTION_SECONDS*1000;lastTickedQuestionSecond=QUESTION_SECONDS;paintTimer();render();
 }
 function tick(){
  if(mode!=='mock'||$('exam').hidden)return;
  const now=Date.now();
  remaining=Math.max(0,Math.ceil((totalDeadline-now)/1000));
  const nextQuestionRemaining=Math.max(0,Math.ceil((questionDeadline-now)/1000));
  questionRemaining=nextQuestionRemaining;paintTimer();
  // Play one soft tick for each second boundary; deadline maths prevents drift between questions.
  if(questionRemaining<lastTickedQuestionSecond&&questionRemaining>0){playCountdownTick();lastTickedQuestionSecond=questionRemaining}
  // Handle a question timeout first so an unconfirmed last answer is not counted.
  if(questionRemaining<=0){timeoutCurrentQuestion();if($('exam').hidden)return}
  if(remaining<=0){clearInterval(mockTimer);mockTimer=null;finish();return}
 }
 function render(){
  const q=pool[index];if(!q)return;
  $('questionCounter').textContent=`Question ${index+1} / ${pool.length}`;
  $('progressPct').textContent=Math.round((index+1)/pool.length*100)+'%';
  $('progressFill').style.width=(index+1)/pool.length*100+'%';
  $('qNumber').textContent='';$('qNumber').hidden=true;
  $('questionMl').textContent=lang==='ml'?q.question:'';$('questionEn').textContent=lang==='en'?q.question:'';
  $('questionMl').hidden=lang!=='ml';$('questionEn').hidden=lang==='ml';
  const img=q.image?`learner-question-assets/${q.image.split('/').pop()}`:'';
  $('imageWrap').hidden=!img;$('questionLayout').classList.toggle('no-image',!img);
  if(img){$('questionImage').src=img;$('questionImage').alt='Question '+(index+1)}
  const isLocked=checked[index]!==undefined;
  $('answers').innerHTML=(q.options||[]).map((o,i)=>`<button type="button" class="answer ${answers[index]===i?'selected':''} ${isLocked&&i===q.correct?'correct':''} ${isLocked&&answers[index]===i&&i!==q.correct?'wrong':''}" data-answer="${i}" aria-keyshortcuts="${i+1}" ${isLocked?'disabled':''}><span class="answer-letter">${letters[i]||i+1}</span><span class="answer-copy"><strong>${esc(o)}</strong></span></button>`).join('');
  document.querySelectorAll('[data-answer]').forEach(b=>b.addEventListener('click',()=>{if(checked[index]!==undefined)return;answers[index]=Number(b.dataset.answer);if(mode==='mock')playOptionSound();render()}));
  $('feedback').hidden=checked[index]===undefined||mode==='mock';
  $('feedback').textContent=checked[index]===undefined?'':(checked[index]==='skipped'?'Question skipped.':(answers[index]===q.correct?'Correct answer!':'Correct answer: '+letters[q.correct]));
  const isFinal=index===pool.length-1;
  $('skipBtn').hidden=mode==='mock'&&isFinal&&isLocked;
  $('confirmBtn').hidden=mode==='mock'&&isFinal&&isLocked;
  $('submitBtn').hidden=!(mode==='mock'&&isFinal&&isLocked);
  if(mode==='practice'){
   $('skipBtn').hidden=isLocked;
   $('confirmBtn').hidden=false;
   $('confirmBtn').textContent=isLocked?'NEXT QUESTION →':'CONFIRM ✓';
   $('submitBtn').hidden=true;
  }else{
   $('confirmBtn').textContent='CONFIRM ✓';
   $('skipBtn').textContent='SKIP →';
   $('submitBtn').textContent='SUBMIT EXAM ✓';
  }
 }
 function advanceQuestion(){
  if(index<pool.length-1){index++;if(mode==='mock'){questionRemaining=QUESTION_SECONDS;questionDeadline=Date.now()+QUESTION_SECONDS*1000;lastTickedQuestionSecond=QUESTION_SECONDS;paintTimer()}render();return true}
  return false;
 }
 function completePractice(){clearInterval(mockTimer);shell.classList.remove('exam-active');$('exam').hidden=true;$('setup').hidden=false;$('setupTitle').textContent='Practice completed';$('setupText').textContent='You reached the end of this practice session. Start again to practise another shuffled set.';$('startBtn').textContent='PRACTISE AGAIN →'}
 function skipCurrent(){
  if(checked[index]!==undefined)return;
  delete answers[index];checked[index]='skipped';
  if(mode==='mock'){
   if(index===pool.length-1){render();return}
   advanceQuestion();return;
  }
  if(!advanceQuestion())completePractice();
 }
 function confirmCurrent(){
  if(mode==='practice'&&checked[index]!==undefined){if(!advanceQuestion())completePractice();return}
  if(answers[index]===undefined){$('feedback').hidden=false;$('feedback').textContent=lang==='ml'?'ഒരു ഉത്തരം തിരഞ്ഞെടുക്കുക അല്ലെങ്കിൽ ഒഴിവാക്കുക അമർത്തുക.':'Please select an answer or tap Skip.';return}
  checked[index]=true;
  if(mode==='mock'){
   if(index===pool.length-1){render();return}
   advanceQuestion();return;
  }
  render();
 }
 async function saveLearnerResult(result){if(!sb)return{ok:false,error:'Supabase client is unavailable'};const schoolSession=school||{};try{const {data,error}=await sb.rpc('hpt_record_learner_attempt',{p_candidate_name:candidate.name,p_phone:candidate.phone,p_school_id:schoolSession.id,p_school_access_code:schoolSession.access_code||'',p_score:result.correct});if(error)throw error;return{ok:true,summary:data}}catch(e){console.error('Learner result summary save failed',e);return{ok:false,error:e.message||'Unable to save learner result'}}}
 async function finish(){clearInterval(mockTimer);mockTimer=null;$('timerBox').hidden=true;$('timerBox').classList.remove('timer-warning','timer-critical');if(mode==='mock')pool.forEach((_,i)=>{if(checked[i]!==true)delete answers[i]});shell.classList.remove('exam-active');const correct=pool.reduce((n,q,i)=>n+(answers[i]===q.correct?1:0),0),wrong=pool.reduce((n,q,i)=>n+(answers[i]!==undefined&&answers[i]!==q.correct?1:0),0),skip=pool.length-correct-wrong;const result={correct,wrong,skip,accuracy:Math.round(correct/pool.length*100),questions:pool.slice(),answers:{...answers},completedAt:new Date().toISOString()};lastResult=result;$('exam').hidden=true;$('result').hidden=false;$('score').textContent=`${correct} / ${pool.length}`;$('correctCount').textContent=correct;$('wrongCount').textContent=wrong;$('skipCount').textContent=skip;$('accuracy').textContent=result.accuracy+'%';const pass=correct>=18;$('result').classList.toggle('is-passed',pass);$('resultScoreProgress').style.width=result.accuracy+'%';$('resultScoreProgress').parentElement.setAttribute('aria-valuenow',String(result.accuracy));$('resultTitle').textContent=pass?'Congratulations! You passed':'Keep practising';$('resultStatus').textContent=pass?'PASS MARK ACHIEVED':'MORE PRACTICE NEEDED';$('resultStatus').classList.toggle('passed',pass);$('resultIcon').textContent=pass?'✓':'↻';$('resultMessage').textContent=pass?'Excellent effort. You have reached the mock examination pass mark.':'You need at least 18 correct answers to pass. Review the questions and try again.';$('saveResultStatus').textContent='Saving your result…';$('saveResultStatus').className='result-save-status';const saved=await saveLearnerResult(result);$('saveResultStatus').textContent=saved.ok?'Result saved to your school record.':`Result is shown here, but could not be saved online. ${saved.error||'Run the included Supabase migration.'}`;$('saveResultStatus').className='result-save-status '+(saved.ok?'ok':'bad');}
 function openReview(){if(!lastResult)return;const qlist=lastResult.questions;$('answerReviewTitle').textContent=`Answer Review · ${qlist.length} Questions`;$('answerReviewSummary').textContent=`Score: ${lastResult.correct}/${qlist.length} · ${lastResult.accuracy}%`;$('answerReviewList').innerHTML=qlist.map((q,i)=>{const selected=lastResult.answers[i],correct=q.correct;const image=q.image?`<img class="reviewImage" src="learner-question-assets/${esc(q.image.split('/').pop())}" alt="Question ${i+1} image">`:'';const opts=(q.options||[]).map((o,j)=>`<div class="reviewOption ${j===selected?'chosen':''} ${j===correct?'correct':''}"><b>${letters[j]||j+1}.</b> ${esc(o)} ${j===selected?' — Your answer':''} ${j===correct?' — Correct':''}</div>`).join('');const badge=selected===undefined?'<span class="reviewWrong">Not answered</span>':selected===correct?'<span class="reviewCorrect">Correct</span>':'<span class="reviewWrong">Incorrect</span>';return `<article class="reviewQuestion"><div class="reviewQuestionTop"><span class="reviewNumber">${i+1}</span><div><h3>${esc(q.question)}</h3></div></div>${image}<div class="reviewOptions">${opts}</div><div class="reviewBadges">${badge}<span>Correct option: ${letters[correct]||correct+1}</span></div></article>`}).join('');$('answerReviewModal').hidden=false}
 function closeReview(){$('answerReviewModal').hidden=true}
 async function setLang(nextLang){const oldPool=pool.slice();lang=nextLang;document.documentElement.lang=lang==='ml'?'ml-IN':'en-IN';$('langEn').classList.toggle('active',lang==='en');$('langMl').classList.toggle('active',lang==='ml');const active=questions();$('totalQuestions').textContent=active.length;if(!$('exam').hidden){pool=oldPool.map(q=>active.find(n=>n.id===q.id)||q);render()}populateInstructions()}
 $('practiceTab').onclick=()=>setMode('practice');$('mockTab').onclick=()=>setMode('mock');$('startBtn').onclick=start;$('skipBtn').onclick=skipCurrent;$('confirmBtn').onclick=confirmCurrent;$('submitBtn').onclick=()=>{finish()};$('retakeBtn').onclick=()=>{setMode('mock');start()};$('backHomeBtn').onclick=()=>{closeReview();clearInterval(mockTimer);if(window.parent!==window){window.parent.postMessage({type:'HPT_LEARNER_EXIT'},location.origin==='null'?'*':location.origin)}else{setMode('practice')}};$('viewAnswersBtn').onclick=openReview;$('closeAnswerReview').onclick=closeReview;$('closeAnswerReviewBottom').onclick=closeReview;$('answerReviewModal').addEventListener('click',e=>{if(e.target.matches('[data-review-close]'))closeReview()});document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&!$('answerReviewModal').hidden){closeReview();return}
  // Keyboard shortcuts are for laptop/desktop examination use only.
  if(window.matchMedia('(max-width: 800px)').matches)return;
  if(e.altKey||e.ctrlKey||e.metaKey||e.shiftKey)return;
  if(!$('answerReviewModal').hidden||$('exam').hidden)return;
  const target=e.target;
  if(target&&target.closest&&target.closest('input,textarea,select,[contenteditable="true"]'))return;
  if(e.key==='Enter'&&target&&target.closest){
    // A focused answer button should confirm the choice, not merely click itself again.
    if(target.closest('button[data-answer]')){
      e.preventDefault();
      if(mode==='mock'&&index===pool.length-1&&checked[index]!==undefined&&!$('submitBtn').hidden)finish();
      else confirmCurrent();
      return;
    }
    // Preserve the native Enter behavior for Skip, Confirm, Submit, language and Exit buttons.
    if(target.closest('button,a'))return;
  }
  if(/^[1-4]$/.test(e.key)){
    if(checked[index]!==undefined)return;
    const option=$('answers').querySelector(`[data-answer="${Number(e.key)-1}"]`);
    if(option&&!option.disabled){e.preventDefault();option.click()}
    return;
  }
  if(e.key==='Enter'){
    if(mode==='mock'&&index===pool.length-1&&checked[index]!==undefined&&!$('submitBtn').hidden){e.preventDefault();finish();return}
    if(mode==='practice'&&checked[index]!==undefined){e.preventDefault();confirmCurrent();return}
    if(checked[index]===undefined){e.preventDefault();confirmCurrent()}
  }
});$('langEn').onclick=()=>setLang('en');$('langMl').onclick=()=>setLang('ml');
 $('exitBtn').onclick=()=>{if(mode==='mock'&&!$('exam').hidden&&!confirm('Exit the examination? Your current mock attempt will be discarded.'))return;clearInterval(mockTimer);if(window.parent!==window)window.parent.postMessage({type:'HPT_LEARNER_EXIT'},location.origin==='null'?'*':location.origin);else location.href='index.html'};
 $('totalQuestions').textContent=questions().length;
 const directMode=candidate?.mode==='mock';if(directMode){setMode('mock');$('practiceTab').hidden=true;$('mockTab').hidden=true;document.querySelector('.mode-tabs').hidden=true;$('manualCandidate').hidden=true;}
 else {setMode('practice');if(!candidate?.name||!candidate?.phone)$('manualCandidate').hidden=false}
 populateInstructions();
})();
