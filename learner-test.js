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
 const bank=window.HPT_PRACTICE_BANK||{};let lang='en',mode='practice',pool=[],index=0,answers={},checked={},mockTimer=null,remaining=900,startedAt=null,lastResult=null,sb=null;
 try{if(window.supabase?.createClient&&window.RAJU_HPT_CONFIG?.supabaseUrl&&window.RAJU_HPT_CONFIG?.supabaseAnonKey)sb=window.supabase.createClient(window.RAJU_HPT_CONFIG.supabaseUrl,window.RAJU_HPT_CONFIG.supabaseAnonKey)}catch(e){console.warn('Learner database client unavailable',e)}
 const letters=['A','B','C','D'],shell=document.querySelector('.exam-shell');
 const hptAttemptStart=()=>Date.now();let startMs=null;
 function shuffle(a){a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
 function questions(){return Array.isArray(bank[lang])?bank[lang]:[]}
 function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
 function setMode(next){clearInterval(mockTimer);mockTimer=null;$('timerBox').hidden=true;mode=next;shell.classList.remove('exam-active');$('practiceTab').classList.toggle('active',mode==='practice');$('mockTab').classList.toggle('active',mode==='mock');$('setup').hidden=false;$('exam').hidden=true;$('result').hidden=true;$('setupTitle').textContent=mode==='mock'?'Mock Test':'Learner Practice';$('setupText').textContent=mode==='mock'?'30 questions · 15 minutes · 18 correct answers to pass.':'Practise official MVD Learner’s Test questions at your own pace.';$('startBtn').textContent=mode==='mock'?'START EXAM →':'START PRACTICE →';$('modeSubtitle').textContent=mode==='mock'?'Mock Examination':'Learner Practice';$('bankCountStat').hidden=mode==='mock';$('setupStats').classList.toggle('mock-stats',mode==='mock');populateInstructions()}
 function populateInstructions(){const ml=lang==='ml';$('instructionsHeading').textContent=ml?'നിർദ്ദേശങ്ങൾ':'Instructions';const items=ml?['മോക്ക് പരീക്ഷയിൽ 30 ചോദ്യങ്ങളുണ്ട്.','ഓരോ ചോദ്യത്തിനും ഒരു മാർക്ക്. നെഗറ്റീവ് മാർക്കില്ല.','പരീക്ഷ പൂർത്തിയാക്കാൻ 15 മിനിറ്റ് (900 സെക്കൻഡ്) ലഭിക്കും.','വിജയിക്കാൻ കുറഞ്ഞത് 18 ചോദ്യങ്ങൾക്ക് ശരിയായ ഉത്തരം നൽകണം.','ഉത്തരം തിരഞ്ഞെടുത്ത ശേഷം ഉറപ്പിക്കുക അമർത്തി അടുത്ത ചോദ്യത്തിലേക്ക് പോകുക. ഉത്തരം അറിയില്ലെങ്കിൽ ഒഴിവാക്കുക അമർത്തുക.','30-ാമത്തെ ചോദ്യം ഉറപ്പിക്കുകയോ ഒഴിവാക്കുകയോ ചെയ്ത ശേഷം പരീക്ഷ സമർപ്പിക്കുക.']:['There are 30 questions in the mock examination.','Each question carries one mark. There is no negative marking.','You have 15 minutes (900 seconds) to complete the exam.','You must answer at least 18 questions correctly to pass.','Select an option and tap Confirm to continue. Tap Skip if you do not know the answer.','After confirming or skipping question 30, tap Submit Exam to finish.'];$('instructionsList').innerHTML=items.map(x=>`<li>${esc(x)}</li>`).join('')}
 function validateCandidate(){if(candidate?.name&&candidate?.phone)return true;const name=$('manualStudentName')?.value.trim()||'',phone=$('manualStudentPhone')?.value.trim()||'';if(!name){alert(lang==='ml'?'വിദ്യാർത്ഥിയുടെ പേര് നൽകുക.':'Enter student name.');$('manualStudentName')?.focus();return false}if(phone.replace(/\D/g,'').length<10){alert(lang==='ml'?'ശരിയായ മൊബൈൽ നമ്പർ നൽകുക.':'Enter a valid mobile number.');$('manualStudentPhone')?.focus();return false}candidate={name,phone,school_id:school.id,school_name:schoolName,mode};try{sessionStorage.setItem('hpt_learner_candidate',JSON.stringify(candidate))}catch{}return true}
 function start(){if(!validateCandidate())return;mode=candidate.mode==='mock'?'mock':mode;pool=mode==='mock'?shuffle(questions()).slice(0,30):shuffle(questions());if(mode==='mock'&&pool.length<30){alert('The official question bank is incomplete. Please contact the provider.');return}index=0;answers={};checked={};lastResult=null;$('setup').hidden=true;$('result').hidden=true;$('exam').hidden=false;$('timerBox').hidden=mode!=='mock';$('modeSubtitle').textContent=mode==='mock'?'Mock Examination':'Learner Practice';shell.classList.toggle('mock',mode==='mock');shell.classList.add('exam-active');startMs=Date.now();clearInterval(mockTimer);if(mode==='mock'){remaining=900;paintTimer();mockTimer=setInterval(tick,1000)}else $('timerBox').hidden=true;render()}
 function paintTimer(){let m=Math.floor(Math.max(0,remaining)/60),s=Math.max(0,remaining)%60;$('timer').textContent=`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`}
 function tick(){remaining=Math.max(0,remaining-1);paintTimer();if(remaining<=0){clearInterval(mockTimer);finish()}}
 function render(){
  const q=pool[index];if(!q)return;
  $('questionCounter').textContent=`Question ${index+1} / ${pool.length}`;
  $('progressPct').textContent=Math.round((index+1)/pool.length*100)+'%';
  $('progressFill').style.width=(index+1)/pool.length*100+'%';
  $('qNumber').textContent=`QUESTION ${q.questionNo||q.id}`;
  $('questionMl').textContent=lang==='ml'?q.question:'';$('questionEn').textContent=lang==='en'?q.question:'';
  $('questionMl').hidden=lang!=='ml';$('questionEn').hidden=lang==='ml';
  const img=q.image?`learner-question-assets/${q.image.split('/').pop()}`:'';
  $('imageWrap').hidden=!img;$('questionLayout').classList.toggle('no-image',!img);
  if(img){$('questionImage').src=img;$('questionImage').alt='Question '+(q.questionNo||q.id)}
  const isLocked=checked[index]!==undefined;
  $('answers').innerHTML=(q.options||[]).map((o,i)=>`<button type="button" class="answer ${answers[index]===i?'selected':''} ${isLocked&&i===q.correct?'correct':''} ${isLocked&&answers[index]===i&&i!==q.correct?'wrong':''}" data-answer="${i}" ${isLocked?'disabled':''}><span class="answer-letter">${letters[i]||i+1}</span><span class="answer-copy"><strong>${esc(o)}</strong></span></button>`).join('');
  document.querySelectorAll('[data-answer]').forEach(b=>b.addEventListener('click',()=>{if(checked[index]!==undefined)return;answers[index]=Number(b.dataset.answer);render()}));
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
  if(index<pool.length-1){index++;render();return true}
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
 async function saveLearnerResult(result){if(!sb)return{ok:false,error:'Supabase client is unavailable'};const schoolSession=school||{};const answersPayload=result.questions.map((q,i)=>({question_id:q.id,question_no:q.questionNo||q.id,question:q.question,options:q.options,selected_index:answers[i]??null,selected_answer:answers[i]===undefined?null:q.options[answers[i]],correct_index:q.correct,correct_answer:q.options[q.correct],is_correct:answers[i]===q.correct,image:q.image||null,language:lang}));try{const {data,error}=await sb.rpc('hpt_record_learner_attempt',{p_candidate_name:candidate.name,p_phone:candidate.phone,p_school_id:schoolSession.id,p_school_access_code:schoolSession.access_code||'',p_score:result.correct,p_passed:result.correct>=18,p_language:lang,p_elapsed_seconds:Math.max(0,Math.round((Date.now()-(startMs||Date.now()))/1000)),p_answers:answersPayload,p_started_at:new Date(startMs||Date.now()).toISOString(),p_completed_at:result.completedAt});if(error)throw error;return{ok:true,id:data}}catch(e){console.error('Learner result save failed',e);return{ok:false,error:e.message||'Unable to save learner result'}}}
 async function finish(){clearInterval(mockTimer);mockTimer=null;$('timerBox').hidden=true;shell.classList.remove('exam-active');const correct=pool.reduce((n,q,i)=>n+(answers[i]===q.correct?1:0),0),wrong=pool.reduce((n,q,i)=>n+(answers[i]!==undefined&&answers[i]!==q.correct?1:0),0),skip=pool.length-correct-wrong;const result={correct,wrong,skip,accuracy:Math.round(correct/pool.length*100),questions:pool.slice(),answers:{...answers},completedAt:new Date().toISOString()};lastResult=result;$('exam').hidden=true;$('result').hidden=false;$('score').textContent=`${correct} / ${pool.length}`;$('correctCount').textContent=correct;$('wrongCount').textContent=wrong;$('skipCount').textContent=skip;$('accuracy').textContent=result.accuracy+'%';const pass=correct>=18;$('resultTitle').textContent=pass?'Congratulations! You passed':'Keep practising';$('resultStatus').textContent=pass?'PASS MARK ACHIEVED':'MORE PRACTICE NEEDED';$('resultStatus').classList.toggle('passed',pass);$('resultIcon').textContent=pass?'✓':'↻';$('resultMessage').textContent=pass?'Excellent effort. You have reached the mock examination pass mark.':'You need at least 18 correct answers to pass. Review the questions and try again.';$('saveResultStatus').textContent='Saving your result…';$('saveResultStatus').className='result-save-status';const saved=await saveLearnerResult(result);$('saveResultStatus').textContent=saved.ok?'Result saved to your school record.':`Result is shown here, but could not be saved online. ${saved.error||'Run the included Supabase migration.'}`;$('saveResultStatus').className='result-save-status '+(saved.ok?'ok':'bad');}
 function openReview(){if(!lastResult)return;const qlist=lastResult.questions;$('answerReviewTitle').textContent=`Answer Review · ${qlist.length} Questions`;$('answerReviewSummary').textContent=`Score: ${lastResult.correct}/${qlist.length} · ${lastResult.accuracy}%`;$('answerReviewList').innerHTML=qlist.map((q,i)=>{const selected=lastResult.answers[i],correct=q.correct;const image=q.image?`<img class="reviewImage" src="learner-question-assets/${esc(q.image.split('/').pop())}" alt="Question ${i+1} image">`:'';const opts=(q.options||[]).map((o,j)=>`<div class="reviewOption ${j===selected?'chosen':''} ${j===correct?'correct':''}"><b>${letters[j]||j+1}.</b> ${esc(o)} ${j===selected?' — Your answer':''} ${j===correct?' — Correct':''}</div>`).join('');const badge=selected===undefined?'<span class="reviewWrong">Not answered</span>':selected===correct?'<span class="reviewCorrect">Correct</span>':'<span class="reviewWrong">Incorrect</span>';return `<article class="reviewQuestion"><div class="reviewQuestionTop"><span class="reviewNumber">${i+1}</span><div><h3>${esc(q.question)}</h3>${q.questionNo?`<p>Official question no. ${esc(q.questionNo)}</p>`:''}</div></div>${image}<div class="reviewOptions">${opts}</div><div class="reviewBadges">${badge}<span>Correct option: ${letters[correct]||correct+1}</span></div></article>`}).join('');$('answerReviewModal').hidden=false}
 function closeReview(){$('answerReviewModal').hidden=true}
 async function setLang(nextLang){const oldPool=pool.slice();lang=nextLang;$('langEn').classList.toggle('active',lang==='en');$('langMl').classList.toggle('active',lang==='ml');const active=questions();$('totalQuestions').textContent=active.length;if(!$('exam').hidden){pool=oldPool.map(q=>active.find(n=>n.id===q.id)||q);render()}populateInstructions()}
 $('practiceTab').onclick=()=>setMode('practice');$('mockTab').onclick=()=>setMode('mock');$('startBtn').onclick=start;$('skipBtn').onclick=skipCurrent;$('confirmBtn').onclick=confirmCurrent;$('submitBtn').onclick=()=>{if(confirm('Submit your mock examination now?'))finish()};$('retakeBtn').onclick=()=>{setMode('mock');start()};$('backHomeBtn').onclick=()=>{closeReview();clearInterval(mockTimer);if(window.parent!==window){window.parent.postMessage({type:'HPT_LEARNER_EXIT'},location.origin==='null'?'*':location.origin)}else{setMode('practice')}};$('viewAnswersBtn').onclick=openReview;$('closeAnswerReview').onclick=closeReview;$('closeAnswerReviewBottom').onclick=closeReview;$('answerReviewModal').addEventListener('click',e=>{if(e.target.matches('[data-review-close]'))closeReview()});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('answerReviewModal').hidden)closeReview()});$('langEn').onclick=()=>setLang('en');$('langMl').onclick=()=>setLang('ml');
 $('exitBtn').onclick=()=>{if(mode==='mock'&&!$('exam').hidden&&!confirm('Exit the examination? Your current mock attempt will be discarded.'))return;clearInterval(mockTimer);if(window.parent!==window)window.parent.postMessage({type:'HPT_LEARNER_EXIT'},location.origin==='null'?'*':location.origin);else location.href='index.html'};
 $('totalQuestions').textContent=questions().length;
 const directMode=candidate?.mode==='mock';if(directMode){setMode('mock');$('practiceTab').hidden=true;$('mockTab').hidden=true;document.querySelector('.mode-tabs').hidden=true;$('manualCandidate').hidden=true;}
 else {setMode('practice');if(!candidate?.name||!candidate?.phone)$('manualCandidate').hidden=false}
 populateInstructions();
})();
