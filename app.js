(()=>{
'use strict';
if(!document.getElementById('hptHiddenFix')){const s=document.createElement('style');s.id='hptHiddenFix';s.textContent='[hidden]{display:none!important}';document.head.appendChild(s);}
const $=id=>document.getElementById(id);
const bind=(id,event,handler)=>{const el=$(id);if(el)el.addEventListener(event,handler);else console.warn(`Optional HPT element #${id} was not found; skipped ${event} handler.`);return el};
const safeText=(id,value)=>{const e=$(id);if(e)e.textContent=String(value??'');return e};
const safeValue=(id,value)=>{const e=$(id);if(e)e.value=value;return e};
const safeImage=(id,src,alt)=>{const e=$(id);if(e){if(src)e.src=src;if(alt!==undefined)e.alt=alt;}return e};
function gateMessageElement(){let e=$('schoolGateMsg');if(e)return e;const input=$('schoolAccessCode'),card=input?.closest('.gateCard');if(!card)return null;e=document.createElement('div');e.id='schoolGateMsg';e.className='gateMessage';e.setAttribute('role','status');e.setAttribute('aria-live','polite');const button=$('enterSchoolBtn');if(button)card.insertBefore(e,button);else card.appendChild(e);if(input)input.setAttribute('aria-describedby','schoolGateMsg');return e}
function setGateMessage(text,bad=false){const e=gateMessageElement();if(e){e.textContent=String(text??'');e.className='gateMessage'+(bad?' bad':'')}return e}
const C=window.RAJU_HPT_CONFIG;
let clips=[], order=[], pos=0, responses=[], scores=[], running=false, finishing=false, timer=null, responseLocked=false;
let candidate={name:'',phone:''}, sound=true, activeSchool=null, schoolAccessCode='', examStartedAt=null;
let allowSkip=false, examSessionId=null, examHeartbeatTimer=null, hptExamLoaderStartedAt=0, hptExamLoaderAnimationFrame=0;
const video=$('video');
let audioCtx=null;
let roadAudio=null;
let lastTypedValues={};

function ensureAudio(){
  try{
    audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)();
    if(audioCtx.state==='suspended')audioCtx.resume();
    return audioCtx;
  }catch{return null}
}
function haptic(pattern=8){
  try{if(navigator.vibrate)navigator.vibrate(pattern)}catch{}
}
function tone(freq=720,duration=.06,type='sine',volume=.08,when=0){
  const ctx=ensureAudio(); if(!ctx||!sound)return;
  try{
    const now=ctx.currentTime+when;
    const o=ctx.createOscillator(),g=ctx.createGain();
    o.type=type;o.frequency.setValueAtTime(freq,now);
    g.gain.setValueAtTime(.0001,now);
    g.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),now+.008);
    g.gain.exponentialRampToValueAtTime(.0001,now+duration);
    o.connect(g);g.connect(ctx.destination);o.start(now);o.stop(now+duration+.02);
  }catch{}
}
function typingFeedback(){
  if(!sound)return;
  haptic(7);
  const f=680+(Math.random()*90);
  tone(f,.045,'square',.045);
}
function buttonFeedback(){
  if(!sound)return;
  haptic([10,18,10]);
  tone(560,.055,'triangle',.075);
}
function engineStartSequence(){
  haptic([18,25,18]);
  playOneShot('audio/start-test-engine-sound.mp3',1.0);
}
function setSoundState(on){
  sound=!!on;
  video.muted=!sound;
  if(roadAudio){
    roadAudio.volume=sound?1.0:0;
    if(sound && running)roadAudio.play().catch(()=>{});
    else if(!sound)roadAudio.pause();
  }
  const btn=$('soundBtn'); if(btn)btn.textContent=sound?'🔊':'🔇';
}
function startRoadAudio(){
  if(!roadAudio){
    roadAudio=new Audio('audio/road-sound.mp3');
    roadAudio.loop=true;
    roadAudio.preload='auto';
    roadAudio.volume=1.0;
  }
  if(sound)roadAudio.play().catch(()=>{});
}
function stopRoadAudio(){
  if(!roadAudio)return;
  roadAudio.pause();
  try{roadAudio.currentTime=0}catch{}
}
function playOneShot(src, volume=1){
  if(!sound)return;
  try{
    const a=new Audio(src);
    a.preload='auto';
    a.volume=Math.max(0,Math.min(1,volume));
    a.play().catch(()=>{});
    a.addEventListener('ended',()=>a.remove(),{once:true});
    return a;
  }catch{}
}
function setupConsoleFeedback(){
  document.querySelectorAll('.fields input').forEach(input=>{
    lastTypedValues[input.id]=input.value||'';
    input.addEventListener('focus',()=>{haptic(5);tone(430,.035,'triangle',.035)});
    input.addEventListener('input',()=>{
      const old=lastTypedValues[input.id]||'', next=input.value||'';
      lastTypedValues[input.id]=next;
      if(next!==old)typingFeedback();
    });
    input.addEventListener('keydown',e=>{
      if(e.key==='Enter'||e.key==='Tab')buttonFeedback();
    });
  });
  document.querySelectorAll('button').forEach(btn=>{
    btn.addEventListener('pointerdown',()=>buttonFeedback(),{passive:true});
  });
}
function updateFullscreenButtons(){
  const active=!!document.fullscreenElement;
  const home=$('homeFullBtn'), exam=$('fullBtn');
  if(home){home.innerHTML='<span>⤢</span>';home.title=active?'Exit fullscreen':'Enter fullscreen';}
  if(exam){exam.textContent=active?'⤡':'⤢';exam.title=active?'Exit fullscreen':'Enter fullscreen';exam.setAttribute('aria-label',exam.title);}
}
async function toggleFullscreen(){
  try{
    if(!document.fullscreenElement) await document.documentElement.requestFullscreen?.();
    else await document.exitFullscreen?.();
    updateFullscreenButtons();
  }catch{}
  updateFullscreenButtons();
}
function setupHomeMedia(){
  const full=$('homeFullBtn');
  if(full)full.onclick=toggleFullscreen;
  const att=$('homeAttemptsBtn');if(att)att.onclick=openAttempts;
  document.addEventListener('fullscreenchange',updateFullscreenButtons);
  updateFullscreenButtons();
}
function startLoadingScreen(){
  const screen=$('loadingScreen'),fill=$('loaderFill'),percent=$('loaderPercent'),status=$('loaderStatusText'),scene=$('loaderScene');
  if(!screen)return;
  const started=performance.now(),duration=5600;
  const tick=now=>{
    const t=Math.min(1,(now-started)/duration);
    // The loading percentage follows the traffic-signal story: approach → yellow/slow → stop → red → ready.
    let value;
    if(t<.45)value=Math.round((t/.45)*42);
    else if(t<.68)value=42+Math.round(((t-.45)/.23)*28);
    else if(t<.82)value=70+Math.round(((t-.68)/.14)*30);
    else value=100;
    if(fill)fill.style.width=value+'%';
    if(scene)scene.style.setProperty('--drive-progress',Math.min(1,t/0.67).toFixed(4));
    if(percent)percent.textContent=value+'%';
    if(status){
      if(t<.42)status.textContent='GREEN SIGNAL • DRIVE';
      else if(t<.66)status.textContent='YELLOW SIGNAL • SLOW DOWN';
      else if(t<.75)status.textContent='BRAKING • STOPPING';
      else if(t<.84)status.textContent='RED SIGNAL • STOPPED';
      else status.textContent='READY TO DRIVE';
    }
    if(t<1)requestAnimationFrame(tick);
    else setTimeout(()=>{screen.classList.add('loaded');setTimeout(()=>screen.remove(),520)},300);
  };
  requestAnimationFrame(tick);
}


const fmt=s=>{s=Math.max(0,Math.ceil(Number(s)||0));return `00:${String(s).padStart(2,'0')}`};
const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const show=(id,on)=>{const e=$(id);if(!e)return;e.hidden=!on;if(id==='examScreen')document.body.classList.toggle('exam-active',on);if(id==='startScreen')document.body.classList.toggle('home-active',on);if(id==='resultScreen')document.body.classList.toggle('result-active',on)};
const toast=(t,bad=false)=>{const e=$('toast');e.textContent=t;e.className='toast show'+(bad?' bad':'');clearTimeout(e._t);e._t=setTimeout(()=>e.className='toast',1100)};
function responseLimitWarning(){const m=$('responseLimitModal');if(!m)return;show('responseLimitModal',true);clearTimeout(m._t);m._t=setTimeout(()=>show('responseLimitModal',false),2200)}
function update(){const d=Math.min(C.clipLimitSeconds,video.duration||C.clipLimitSeconds);const shown=Math.min(pos+1,order.length);$('clipNo').textContent=`${shown} / ${order.length}`;$('clipNo2').textContent=`${shown} / ${order.length}`;$('timer').textContent=fmt(Math.max(0,C.clipLimitSeconds-video.currentTime));$('elapsed').textContent=fmt(video.currentTime);$('duration').textContent=fmt(d);$('respCount').textContent=`${responses.length} / ${C.maxResponsesPerClip}`;const pct=d?Math.min(100,Math.max(0,(video.currentTime/d)*100)):0;const fill=$('progressFill');const head=$('playHead');if(fill)fill.style.width=pct+'%';if(head)head.style.left=pct+'%'}
function timeline(){const t=$('track');if(!t)return;const d=Math.max(1,Math.min(C.clipLimitSeconds,video.duration||C.clipLimitSeconds));t.querySelectorAll('.mark').forEach(e=>e.remove());responses.forEach((r,i)=>{const m=document.createElement('div');m.className='mark';m.style.left=Math.min(100,Math.max(0,(Number(r.t)||0)/d*100))+'%';m.title=`Response ${i+1}`;m.setAttribute('aria-label',`Response ${i+1}`);m.innerHTML='<span></span>';t.appendChild(m)})}
function resetClip(){responses=[];responseLocked=false;finishing=false;timeline();update()}
function staticHazards(code){return [];}
async function supabase(){if(window._sb)return window._sb;try{if(!window.supabase?.createClient)return null;window._sb=window.supabase.createClient(C.supabaseUrl,C.supabaseAnonKey);return window._sb}catch{return null}}
function resolveHptVideoUrl(path){
  if(!path)return '';
  if(/^https?:\/\//i.test(path))return path;
  let clean=String(path).replace(/^\.\//,'').replace(/^\/+/, '');
  if(clean.startsWith('videos/'))clean='clips/'+clean.slice('videos/'.length);
  return C.videoBase+clean.split('/').map(encodeURIComponent).join('/');
}
async function loadClips(){
  clips=[];
  const sb=await supabase();
  if(!sb)return clips;
  const {data:vs,error:videoError}=await sb.from('hpt_videos')
    .select('id,clip_code,title,video_path,duration_seconds,active')
    .eq('active',true).order('clip_code');
  if(videoError){console.error('Could not load HPT video catalogue from Supabase:',videoError);return clips;}
  if(!vs?.length)return clips;
  const {data:hs,error:hazardError}=await sb.from('hpt_hazards')
    .select('video_id,hazard_no,timestamp_seconds,label');
  if(hazardError){console.error('Could not load HPT hazard timestamps from Supabase:',hazardError);return clips;}
  const by={};
  (hs||[]).forEach(h=>(by[h.video_id]??=[]).push({
    t:Number(h.timestamp_seconds),label:h.label||`Hazard ${h.hazard_no}`,hazard_no:h.hazard_no
  }));
  clips=vs.map(v=>({...v,file:resolveHptVideoUrl(v.video_path),hazards:(by[v.id]||[]).sort((a,b)=>Number(a.hazard_no)-Number(b.hazard_no))}))
    .filter(v=>v.active&&v.video_path&&v.file&&v.hazards.length>=1);
  return clips;
}
function applySkipSetting(enabled){
  allowSkip=!!enabled;
  const skip=$('skipBtn');if(skip)skip.hidden=!allowSkip;
  document.body.classList.toggle('hpt-skip-disabled',!allowSkip);
}
async function loadExamControls(){
  try{
    const sb=await supabase();if(!sb){applySkipSetting(false);return false;}
    const {data,error}=await sb.rpc('get_hpt_public_exam_settings');
    if(error)throw error;
    applySkipSetting(!!(data&&data.allow_skip));
    return allowSkip;
  }catch(error){
    console.warn('HPT exam controls could not be loaded. Skip remains disabled.',error);
    applySkipSetting(false);return false;
  }
}
function stopExamHeartbeat(){if(examHeartbeatTimer){clearInterval(examHeartbeatTimer);examHeartbeatTimer=null;}}
async function startExamSessionTracking(){
  stopExamHeartbeat();examSessionId=null;
  try{
    const sb=await supabase();if(!sb||!activeSchool?.id)return null;
    const {data,error}=await sb.rpc('hpt_start_exam_session',{p_candidate_name:candidate.name,p_phone:candidate.phone,p_school_id:activeSchool.id,p_school_access_code:schoolAccessCode});
    if(error)throw error;
    examSessionId=data||null;
    if(examSessionId){
      const touch=async()=>{try{await sb.rpc('hpt_touch_exam_session',{p_session_id:examSessionId,p_school_id:activeSchool.id,p_school_access_code:schoolAccessCode});}catch(e){console.warn('HPT activity heartbeat failed',e)}};
      await touch();examHeartbeatTimer=setInterval(touch,30000);
    }
    return examSessionId;
  }catch(error){
    console.warn('Today activity session could not be started. Apply 24-hpt-daily-exam-activity.sql in Supabase.',error);
    return null;
  }
}
async function completeExamSession(attemptId,totalScore){
  stopExamHeartbeat();
  const sessionId=examSessionId;examSessionId=null;
  // Only mark the activity row complete when the canonical HPT attempt was saved.
  // If result persistence failed, it remains incomplete instead of displaying a false completion.
  if(!sessionId||!activeSchool?.id||!attemptId)return;
  try{
    const sb=await supabase();
    const {error}=await sb.rpc('hpt_complete_exam_session',{p_session_id:sessionId,p_school_id:activeSchool.id,p_school_access_code:schoolAccessCode,p_attempt_id:attemptId||null,p_total_score:Number(totalScore)||0});
    if(error)throw error;
  }catch(error){console.warn('HPT daily activity session could not be marked complete.',error)}
}
async function saveAttempt(completedAt){const sb=await supabase();if(!sb)return {ok:false,error:'Supabase is not available.'};
  if(activeSchool?.id){const {error:identityError}=await sb.rpc('hpt_upsert_student_identity',{p_candidate_name:candidate.name,p_phone:candidate.phone,p_school_id:activeSchool.id,p_school_access_code:schoolAccessCode});if(identityError)return {ok:false,error:identityError.message||'Could not update the student record.'}}
  const total=scores.reduce((a,b)=>a+b,0);const payload={candidate_name:candidate.name,phone:candidate.phone,started_at:examStartedAt||new Date().toISOString(),completed_at:completedAt||new Date().toISOString(),total_score:total,passed:total>=C.passMark,clip_order:order.map(c=>c.clip_code),responses:scores.flatMap((_,i)=>(order[i]._responses||[]).map(r=>({video_id:order[i].id||null,clip_code:order[i].clip_code||null,response_no:r.response_no,click_time_seconds:Number(r.t),hazard_no:r.hazard_no||null,awarded_marks:r.points}))),p_school_id:activeSchool?.id||null,p_school_access_code:schoolAccessCode||null};
for(let attempt=1;attempt<=2;attempt++){
  const {data,error}=await sb.rpc('hpt_record_attempt',payload);
  if(!error&&data)return {ok:true,id:data};
  if(attempt===2)return {ok:false,error:error?.message||'Could not save the examination result.'};
  await new Promise(r=>setTimeout(r,600));
}
return {ok:false,error:'Could not save the examination result.'}}
function loadClip(preloaded=false){
  resetClip();running=false;clearTimeout(timer);video.pause();video.muted=!sound;$('playOverlay').hidden=true;
  let activated=false;
  const activate=()=>{
    if(activated)return;activated=true;
    try{video.currentTime=0}catch{}
    update();timeline();startRoadAudio();
    const p=video.play();if(p?.catch)p.catch(()=>{$('playOverlay').hidden=false});
    running=true;clearTimeout(timer);timer=setTimeout(finishClip,C.clipLimitSeconds*1000);
  };
  video.onloadedmetadata=activate;
  video.onerror=()=>{running=false;$('playOverlay').hidden=false;$('playNow').textContent='RETRY CLIP';toast('Video could not be loaded. Please retry or contact your driving school.',true)};
  if(!preloaded || video.dataset.hptPreloadedUrl!==String(order[pos].file)){
    video.removeAttribute('src');video.crossOrigin='anonymous';video.preload='auto';video.dataset.hptPreloadedUrl=String(order[pos].file);video.src=order[pos].file;video.load();
  } else if(video.readyState>=1){requestAnimationFrame(activate);}
}
function openHptExamLoading(){
  const overlay=$('hptExamLoading');if(!overlay)return;
  hptExamLoaderStartedAt=performance.now();overlay.hidden=false;overlay.classList.remove('is-leaving');document.body.classList.add('hpt-exam-loading-open');
  const fill=$('hptExamLoadingFill'),percent=$('hptExamLoadingPercent'),status=$('hptExamLoadingStatus'),step=$('hptExamLoadingStep');
  if(fill)fill.style.width='12%';if(percent)percent.textContent='12%';
  if(status)status.textContent='Verifying your school and preparing the exam…';if(step)step.textContent='CHECKING EXAMINATION';
  const openedAt=hptExamLoaderStartedAt;
  const progressTick=now=>{
    if(overlay.hidden||openedAt!==hptExamLoaderStartedAt)return;
    const elapsed=now-openedAt,value=Math.min(66,12+Math.round(elapsed/6500*54));
    if(fill)fill.style.width=value+'%';if(percent)percent.textContent=value+'%';
    if(status)status.textContent=elapsed<1300?'Verifying school access…':elapsed<3200?'Loading examination details…':'Preparing your first road-safety video…';
    if(step)step.textContent=elapsed<3200?'CHECKING EXAMINATION':'PREPARING FIRST CLIP';
    if(elapsed<6500)hptExamLoaderAnimationFrame=requestAnimationFrame(progressTick);
  };
  cancelAnimationFrame(hptExamLoaderAnimationFrame);hptExamLoaderAnimationFrame=requestAnimationFrame(progressTick);
}
function closeHptExamLoading(){
  const overlay=$('hptExamLoading');if(overlay){overlay.hidden=true;overlay.classList.remove('is-leaving');}
  document.body.classList.remove('hpt-exam-loading-open');cancelAnimationFrame(hptExamLoaderAnimationFrame);hptExamLoaderAnimationFrame=0;hptExamLoaderStartedAt=0;
}
async function showHptExamLoading(firstClip){
  const overlay=$('hptExamLoading'),fill=$('hptExamLoadingFill'),percent=$('hptExamLoadingPercent'),status=$('hptExamLoadingStatus'),step=$('hptExamLoadingStep');
  if(!overlay)return false;
  if(overlay.hidden)openHptExamLoading();
  cancelAnimationFrame(hptExamLoaderAnimationFrame);
  const start=hptExamLoaderStartedAt||performance.now(),minimumMs=4000,maximumMs=14000;
  let ready=false,settled=false;
  if(firstClip?.file){
    try{
      video.pause();video.preload='auto';video.crossOrigin='anonymous';video.muted=true;video.removeAttribute('src');video.dataset.hptPreloadedUrl=String(firstClip.file);video.src=firstClip.file;
      const loaded=new Promise(resolve=>{
        const finish=value=>{if(settled)return;settled=true;ready=value;resolve(value)};
        video.addEventListener('canplay',()=>finish(true),{once:true});
        video.addEventListener('error',()=>finish(false),{once:true});
        setTimeout(()=>finish(video.readyState>=2),maximumMs);
      });
      video.load();
      // Keep the branded game-style screen visible for at least four seconds while the first clip buffers.
      await new Promise(resolve=>{
        const tick=now=>{
          const elapsed=now-start,minimumProgress=Math.min(88,Math.round(elapsed/minimumMs*88));
          const value=ready?Math.min(96,minimumProgress+5):minimumProgress;
          if(fill)fill.style.width=value+'%';if(percent)percent.textContent=value+'%';
          if(status){status.textContent=elapsed<1200?'Checking examination settings…':elapsed<2600?'Loading your first road-safety video…':'Preparing the video player…';}
          if(step)step.textContent=ready?'FIRST VIDEO READY':'LOADING FIRST VIDEO';
          if(elapsed>=minimumMs && (settled || elapsed>=maximumMs)){resolve();return;}
          requestAnimationFrame(tick);
        };requestAnimationFrame(tick);
      });
      await loaded;
    }catch(error){console.warn('First HPT clip preload did not complete:',error);ready=false;video.dataset.hptPreloadedUrl='';}
  } else {
    await new Promise(resolve=>setTimeout(resolve,minimumMs));
  }
  if(fill)fill.style.width='100%';if(percent)percent.textContent='100%';if(status)status.textContent=ready?'Your examination is ready.':'Opening the video player…';if(step)step.textContent='READY';
  await new Promise(resolve=>setTimeout(resolve,260));
  overlay.classList.add('is-leaving');
  await new Promise(resolve=>setTimeout(resolve,320));
  closeHptExamLoading();
  return ready;
}
async function finishClip(){if(finishing)return;finishing=true;running=false;clearTimeout(timer);video.pause();scores.push(Math.max(0,Math.min(10,scoreThis())));pos++;if(pos>=order.length){await finishExam();return}setTimeout(()=>{finishing=false;loadClip()},220)}
function scoreThis(){return responses.reduce((a,r)=>a+r.points,0)}
async function finishExam(){
  stopRoadAudio();
  const total=scores.reduce((a,b)=>a+b,0),completedAt=new Date().toISOString();
  const reportClips=order.map((c,i)=>({clip_code:c.clip_code,title:c.title,file:c.file||c.video_path,hazards:(c.hazards||[]).map(h=>({hazard_no:h.hazard_no,t:Number(h.t),label:h.label||`Hazard ${h.hazard_no}`})),responses:(c._responses||[]).map(r=>({response_no:r.response_no,t:Number(r.t),video_time_seconds:Number(r.t),hazard_no:r.hazard_no||null,points:Number(r.points||0),clicked_at:r.clicked_at||null,frameData:r.frameData||null})),score:Number(scores[i]||0)}));
  const saved=await saveAttempt(completedAt);
  await completeExamSession(saved.ok?saved.id:null,total);
  if(activeSchool?.id)setTimeout(loadTopScorers,350);
  show('examScreen',false);show('resultScreen',true);if(total>=C.passMark){setTimeout(()=>playOneShot('audio/test-pass-sound.mp3',1.0),120)}$('candidateResult').textContent=`${candidate.name} • ${candidate.phone}`;$('finalScore').textContent=`${total} / 100`;$('passText').textContent=total>=C.passMark?'PASS — EXAMINATION STANDARD MET':'NOT PASSED — BELOW PASS MARK';$('passText').className='status '+(total>=C.passMark?'pass':'fail');$('resultSaveStatus').textContent=saved.ok?'Result recorded successfully.':'Result could not be recorded automatically. Please inform the school admin.';$('resultSaveStatus').className='save-status '+(saved.ok?'ok':'error');$('printCertBtn').hidden=total<C.passMark;const hazardRows=reportClips.flatMap(c=>(c.hazards||[]).map(h=>({clip_code:c.clip_code,hazard_no:Number(h.hazard_no),hazard:h,response:(c.responses||[]).find(r=>Number(r.hazard_no)===Number(h.hazard_no))})));const identified=hazardRows.filter(h=>!!h.response).length,missed=Math.max(0,hazardRows.length-identified);const reactionTimes=hazardRows.filter(h=>h.response&&Number.isFinite(Number(h.response.t))).map(h=>Math.max(0,Number(h.response.t)-Number((reportClips.find(c=>String(c.clip_code)===String(h.clip_code))?.hazards||[]).find(x=>Number(x.hazard_no)===h.hazard_no)?.t||0)));const avgReaction=reactionTimes.length?reactionTimes.reduce((a,b)=>a+b,0)/reactionTimes.length:null;let performanceText;if(total>=85)performanceText=`Excellent hazard awareness. You identified ${identified} of ${hazardRows.length} official hazards, with ${missed} missed. Keep scanning well ahead and maintain this consistency.`;else if(total>=C.passMark)performanceText=`Good work — you reached the pass mark. You identified ${identified} of ${hazardRows.length} official hazards and missed ${missed}. Keep practising early recognition of developing hazards.`;else performanceText=`More practice is recommended. You identified ${identified} of ${hazardRows.length} official hazards and missed ${missed}. Focus on scanning ahead, spotting changing traffic situations and responding promptly.`;if(avgReaction!==null)performanceText+=` Average response time for identified hazards: ${avgReaction.toFixed(2)} seconds after the official hazard timestamp.`;$('resultDetails').innerHTML=`<div class="performanceSummary"><div class="performanceTitle">PERFORMANCE SUMMARY</div><p>${performanceText}</p><div class="performanceStats"><span><b>${identified}</b> / ${hazardRows.length} hazards identified</span><span><b>${missed}</b> missed</span><span><b>${reactionTimes.length?avgReaction.toFixed(2)+' s':'—'}</b> average delay</span></div></div><div class="resultSummary"><div><span>PASS MARK</span><b>${C.passMark} / 100</b></div><div><span>HAZARD RECOGNITION</span><b>${hazardRows.length?Math.round(identified/hazardRows.length*100):0}%</b></div><div><span>EXAM STATUS</span><b>${total>=C.passMark?'PASS':'NOT PASSED'}</b></div></div>`;
  window._lastExam={total,total_score:total,passed:total>=C.passMark,saved,candidate_name:candidate.name,phone:candidate.phone,completed_at:completedAt,started_at:examStartedAt||completedAt,school:schoolBrand(),clips:reportClips};
  if(total>=C.passMark)setupCandidateCertificate();
}
function schoolBrand(s=activeSchool){
  if(!s)return null;
  return {id:s.id,school_name:s.school_name||'Driving School',contact_number:s.contact_number||'',location:s.location||'',logo_url:s.logo_url||'assets/hpt-brand-logo-v129.png',brand_color:s.brand_color||'#ffc400',dark_color:s.dark_color||'#0b1b29'};
}

async function loadGlobalMonthlyTopFive(){
  const host=$('globalPodium'),monthLabel=$('globalLeaderboardMonth'),updated=$('globalLeaderboardUpdated');
  if(!host)return;
  if(monthLabel)monthLabel.textContent=`(${new Intl.DateTimeFormat('en-IN',{month:'long',year:'numeric',timeZone:'Asia/Kolkata'}).format(new Date())})`;
  host.innerHTML='<div class="globalPodiumLoading">Loading this month’s Global Top 5…</div>';
  try{
    const sb=await supabase();
    if(!sb)throw new Error('Leaderboard service is not configured.');
    const {data,error}=await sb.rpc('hpt_global_monthly_top_ten');
    if(error)throw error;
    const ranked=(Array.isArray(data)?data:[]).slice(0,5);
    window.HPTLeaderboardUnavailable=false;
    window.HPTGlobalTopFive=ranked.slice(0,3).map(row=>({
      display_name:String(row.display_name||'Student'),
      school_name:String(row.school_name||'Participating school'),
      total_score:Math.max(0,Math.min(100,Number(row.total_score)||0))
    }));
    window.HPTExperience?.renderIntroPodium?.(window.HPTGlobalTopFive);
    if(!ranked.length){
      host.innerHTML='<div class="globalPodiumEmpty"><strong>This month’s leaderboard is ready for its first entries.</strong><span>Complete an examination at an active participating driving school to appear here.</span></div>';
      if(updated)updated.textContent='Updated just now';
      return;
    }
    const medals=['🥇','🥈','🥉'];
    host.innerHTML=`<div class="globalTopFiveTableWrap"><table class="globalTopFiveTable" aria-label="Monthly Global Top 5 students">
      <thead><tr><th scope="col">RANK</th><th scope="col">STUDENT</th><th scope="col">DRIVING SCHOOL</th><th scope="col">SCORE</th></tr></thead>
      <tbody>${ranked.map((row,index)=>{
        const score=Math.max(0,Math.min(100,Number(row.total_score)||0));
        const reaction=row.average_reaction_seconds==null?null:Number(row.average_reaction_seconds);
        return `<tr class="globalTopFiveRow rank-${index+1}">
          <td class="globalTopFiveRank"><span>${medals[index]||String(index+1).padStart(2,'0')}</span></td>
          <td class="globalTopFiveStudent">${escHtml(row.display_name||'Student')}</td>
          <td class="globalTopFiveSchool">${escHtml(row.school_name||'Participating school')}${reaction!==null&&Number.isFinite(reaction)?`<small>Avg. correct-response reaction: ${reaction.toFixed(2)}s</small>`:''}</td>
          <td class="globalTopFiveScore"><strong>${score}</strong><small>/100</small></td>
        </tr>`;
      }).join('')}</tbody></table></div>`;
    if(updated)updated.textContent='Updated just now';
  }catch(error){
    window.HPTGlobalTopFive=null;
    window.HPTLeaderboardUnavailable=true;
    window.HPTExperience?.renderIntroPodium?.(null, true);
    console.warn('Global monthly Top 5 could not be loaded:',error);
    host.innerHTML='<div class="globalPodiumEmpty"><strong>Global Top 5 is temporarily unavailable.</strong><span>Confirm that migration 22 has been applied in the connected Supabase project, then refresh.</span></div>';
    if(updated)updated.textContent='Leaderboard temporarily unavailable';
  }
}
async function loadTopScorers(){
  const host=$('leaderboardContent'),updated=$('leaderboardUpdated');
  const monthLabel=$('leaderboardMonth');
  if(monthLabel)monthLabel.textContent=`(${new Intl.DateTimeFormat('en-IN',{month:'long',timeZone:'Asia/Kolkata'}).format(new Date())})`;
  if(!host)return;
  if(!activeSchool?.id||!schoolAccessCode){host.innerHTML='<div class="leaderboardEmpty">Log in with your school access code to view your school leaderboard.</div>';return}
  host.innerHTML='<div class="leaderboardLoading">Loading school top scorers…</div>';
  try{
    const sb=await supabase();if(!sb)throw new Error('Leaderboard service unavailable');
    const {data,error}=await sb.rpc('hpt_school_top_scorers',{p_school_access_code:schoolAccessCode});
    if(error)throw error;
    const ranked=data||[];
    if(!ranked.length){host.innerHTML='<div class="leaderboardEmpty">Be the first to complete an examination and appear on your school leaderboard!</div>';if(updated)updated.textContent='Updated just now';return}
    const medals=['🥇','🥈','🥉'];
    host.innerHTML=ranked.slice(0,10).map((r,i)=>`<div class="leaderboardRow ${i<3?'leaderboardTop':''}"><span class="leaderboardRank">${medals[i]||String(i+1).padStart(2,'0')}</span><span class="leaderboardStudent"><strong>${escHtml(r.candidate_name||'Student')}</strong><small>${r.average_reaction_seconds==null?'Reaction time unavailable':`Avg. reaction ${Number(r.average_reaction_seconds).toFixed(2)}s`}</small></span><strong class="leaderboardScore">${Number(r.total_score)||0}<small>/100</small></strong></div>`).join('');
    if(updated)updated.textContent='Updated just now';
  }catch(e){
    console.warn('School leaderboard could not be loaded:',e);
    host.innerHTML='<div class="leaderboardEmpty">Leaderboard is temporarily unavailable. Please contact your school administrator if this continues.</div>';
  }
}
function applySchoolBranding(s,persist=true){
  activeSchool=s||null;schoolAccessCode=s?.access_code||'';
  const b=schoolBrand(s);
  window.HPTCurrentSchool=b;document.body.classList.toggle('school-selected',!!b);
  const name=b?.school_name||'HAZARD PERCEPTION PORTAL';
  const logo=b?.logo_url||'assets/hpt-brand-logo-v129.png';
  // Some older local copies do not include every branding node. Missing optional nodes
  // must never interrupt successful access verification or prevent the test home screen.
  safeText('headerSchoolName',name.toUpperCase());
  safeImage('headerSchoolLogo',logo,name+' logo');
  safeText('mobileSchoolName',name.toUpperCase());
  safeImage('mobileSchoolLogo',logo,name+' logo');
  safeImage('resultSchoolLogo',logo,name+' logo');
  safeText('loaderSchoolName',name.toUpperCase());
  safeImage('loaderSchoolLogo',logo,name+' logo');
  const platformLogo='assets/hpt-brand-logo-v129.png';
  ['headerSchoolLogo','mobileSchoolLogo','resultSchoolLogo','loaderSchoolLogo'].forEach(id=>{
    const image=$(id);if(!image)return;
    image.onerror=()=>{if(image.src!==new URL(platformLogo,location.href).href)image.src=platformLogo;};
  });
  document.title=b?`${name} | Hazard Perception Test`:'Driving School Hazard Perception Test | Access Portal';
  const brandColor=b?.brand_color||'#ffc400',darkColor=b?.dark_color||'#0b1b29';
  document.documentElement.style.setProperty('--yellow',brandColor);
  document.documentElement.style.setProperty('--panel',darkColor);document.documentElement.style.setProperty('--school-dark',darkColor);
  if(persist&&s){try{sessionStorage.setItem('hpt_school_session',JSON.stringify({...s,access_code:schoolAccessCode}))}catch{}}
  if(s?.id){setTimeout(loadTopScorers,0)}
  const change=$('changeSchoolBtn');if(change)change.hidden=true;
  const tools=$('homeTools');if(tools)tools.hidden=!b;
}
function resetSchoolBranding(){
  activeSchool=null;schoolAccessCode='';window.HPTCurrentSchool=null;
  try{sessionStorage.removeItem('hpt_school_session')}catch{}
  applySchoolBranding(null,false);
  safeText('headerSchoolName','HAZARD PERCEPTION PORTAL');
  safeImage('headerSchoolLogo','assets/hpt-brand-logo-v129.png','Hazard Perception Test Portal');
  safeText('mobileSchoolName','DRIVING SCHOOL');
  safeImage('mobileSchoolLogo','assets/hpt-brand-logo-v129.png','Driving school logo');
  safeImage('resultSchoolLogo','assets/hpt-brand-logo-v129.png','Hazard Perception Test Portal');
  safeText('loaderSchoolName','HAZARD PERCEPTION PORTAL');
  safeImage('loaderSchoolLogo','assets/hpt-brand-logo-v129.png','Hazard Perception Test Portal');
  const tools=$('homeTools');if(tools)tools.hidden=true;
}
async function enterSchool(){
  const codeInput=$('schoolAccessCode'),button=$('enterSchoolBtn');
  const msg=gateMessageElement();
  if(!codeInput||!button){console.error('School access form is incomplete: missing code input or continue button.');setGateMessage('ACCESS FORM NOT READY. Refresh the page and try again.',true);return}
  const code=String(codeInput.value||'').trim();
  setGateMessage('');
  if(!code){setGateMessage('ENTER YOUR SCHOOL ACCESS CODE',true);return}
  // Close the access-code keyboard when the user submits the login form.
  try{codeInput.blur()}catch{}
  // Start fullscreen synchronously from the login gesture, before network awaits.
  // Browsers may show their own native fullscreen notice; the app adds no extra message.
  let loginFullscreenPromise=null;
  if(!document.fullscreenElement&&document.documentElement.requestFullscreen){
    try{
      loginFullscreenPromise=document.documentElement.requestFullscreen({navigationUI:'hide'});
      loginFullscreenPromise?.then(updateFullscreenButtons).catch(()=>{});
    }catch{}
  }
  button.disabled=true;
  const buttonLabel=button.querySelector('span');
  if(buttonLabel)buttonLabel.textContent='VERIFYING ACCESS…';
  try{
    const sb=await supabase();
    if(!sb)throw new Error('The portal cannot connect to the access service. Check the Supabase URL, publishable key, and internet connection.');
    const {data,error}=await sb.rpc('verify_hpt_school_access_code',{p_code:code});
    if(error)throw error;
    // The updated verification RPC distinguishes an unknown code from a disabled school.
    const payload=Array.isArray(data)?data[0]:data;
    if(payload?.status==='disabled'){
      try{if(document.fullscreenElement)await document.exitFullscreen()}catch{}
      updateFullscreenButtons();
      setGateMessage('HAZARD PERCEPTION TEST DISABLED. PLEASE CONTACT THE PROVIDER TO CONTINUE USING THE SOFTWARE.',true);return;
    }
    const schoolData=payload?.school&&typeof payload.school==='object'?payload.school:payload;
    if(!schoolData||!schoolData.id){
      try{if(document.fullscreenElement)await document.exitFullscreen()}catch{}
      updateFullscreenButtons();
      setGateMessage('ACCESS CODE NOT RECOGNISED. PLEASE CHECK THE CODE OR CONTACT YOUR DRIVING SCHOOL.',true);return
    }
    const school={...schoolData,access_code:code};
    applySchoolBranding(school,true);
    codeInput.value='';
    setGateMessage('');
    // Personalized cinematic welcome after the access code has been verified.
    if(window.HPTExperience?.showSchoolWelcome){
      try{await window.HPTExperience.showSchoolWelcome(school)}catch(welcomeError){console.warn('School welcome animation skipped:',welcomeError)}
    }
    show('schoolGate',false);show('startScreen',true);show('examScreen',false);show('resultScreen',false);
    safeText('candName','Candidate');safeText('candPhone','');
    updateFullscreenButtons();
  }catch(e){
    try{if(document.fullscreenElement)await document.exitFullscreen()}catch{}
    updateFullscreenButtons();
    console.error('School access verification failed:',e?.stack||e);
    const detail=String(e?.message||'').trim();
    const message=/PGRST202|schema cache|could not find the function|function .* does not exist/i.test(detail)
      ?'SCHOOL ACCESS SERVICE IS NOT UPDATED. Run 11-provider-admin-and-school-status-v83.sql in the connected Supabase project.'
      :(detail?`ACCESS VERIFICATION FAILED: ${detail.slice(0,180)}`:'ACCESS VERIFICATION UNAVAILABLE. PLEASE TRY AGAIN.');
    setGateMessage(message,true);
  }finally{
    button.disabled=false;
    if(buttonLabel)buttonLabel.textContent='LOGIN TO SCHOOL';
  }
}
async function bootSchoolSession(){
  // Read the saved code before clearing the current in-memory branding.
  let saved=null;try{saved=JSON.parse(sessionStorage.getItem('hpt_school_session')||'null')}catch{}
  resetSchoolBranding();show('startScreen',false);show('schoolGate',true);show('examScreen',false);show('resultScreen',false);
  if(!saved?.access_code||!saved?.id)return;
  try{
    const sb=await supabase();if(!sb)return;
    const {data,error}=await sb.rpc('verify_hpt_school_access_code',{p_code:saved.access_code});
    const payload=Array.isArray(data)?data[0]:data;
    const schoolData=payload?.school&&typeof payload.school==='object'?payload.school:payload;
    if(!error&&payload?.status==='disabled'){
      try{sessionStorage.removeItem('hpt_school_session')}catch{}
      setGateMessage('HAZARD PERCEPTION TEST DISABLED. PLEASE CONTACT THE PROVIDER TO CONTINUE USING THE SOFTWARE.',true);
    }else if(!error&&schoolData?.id&&String(schoolData.id)===String(saved.id)){
      applySchoolBranding({...schoolData,access_code:saved.access_code},true);
      show('schoolGate',false);show('startScreen',true);
    }else{try{sessionStorage.removeItem('hpt_school_session')}catch{}}
  }catch(e){console.warn('Could not restore the school session',e)}
}
function changeSchool(){
  stopExamHeartbeat();examSessionId=null;
  if(!$('schoolStatsModal')?.hidden)closeSchoolStatsModal();
  // Return safely to the access-code gate and discard only the incomplete in-memory exam.
  clearTimeout(timer);running=false;finishing=false;responseLocked=false;pos=0;order=[];scores=[];responses=[];
  try{if(video){video.pause();video.removeAttribute('src');video.load()}}catch(e){console.warn('Could not reset the video element while changing school.',e)}
  stopRoadAudio();resetSchoolBranding();
  safeValue('schoolAccessCode','');safeValue('name','');safeValue('phone','');setGateMessage('');
  show('examScreen',false);show('resultScreen',false);show('startScreen',false);show('schoolGate',true);
  document.body.classList.remove('home-active','exam-active','result-active');
  loadGlobalMonthlyTopFive();
}
async function beginHPTExam(){buttonFeedback();ensureAudio();if(!video){toast('The video player is missing. Please refresh the website.',true);return}const n=$('name').value.trim(),p=$('phone').value.trim();if(!activeSchool?.id){toast('Enter your driving school access code first.',true);changeSchool();return}if(!n||!p){toast('Enter candidate name and phone number',true);return}const phoneDigits=p.replace(/\D/g,'');if(phoneDigits.length<10||phoneDigits.length>15){toast('Enter a valid mobile number with 10 to 15 digits.',true);$('phone').focus();return}const sb=await supabase();if(!sb){toast('The examination service is unavailable. Please try again.',true);return}
  try{const {data,error}=await sb.rpc('verify_hpt_school_access_code',{p_code:schoolAccessCode});if(error)throw error;const status=Array.isArray(data)?data[0]:data;if(status?.status==='disabled'||!(status?.school?.id||status?.id)){changeSchool();setGateMessage(status?.status==='disabled'?'HAZARD PERCEPTION TEST DISABLED. PLEASE CONTACT THE PROVIDER TO CONTINUE USING THE SOFTWARE.':'SCHOOL ACCESS COULD NOT BE VERIFIED. PLEASE CONTACT THE PROVIDER.',true);return}}
  catch(e){console.warn('School access revalidation failed:',e);toast('Could not verify school access. Please try again.',true);return}
  openHptExamLoading();
  try{clips=await loadClips()}catch(error){closeHptExamLoading();console.error('HPT video catalogue failed to load:',error);toast('Could not load the examination videos. Please check your connection and try again.',true);return}
  if(clips.length<C.examClipCount){closeHptExamLoading();toast(`Need ${C.examClipCount} active clips with at least one hazard each`,true);return}
  candidate={name:n,phone:p};examStartedAt=new Date().toISOString();$('candName').textContent=n;$('candPhone').textContent=p;
  await loadExamControls();await startExamSessionTracking();
  order=shuffle(clips).slice(0,C.examClipCount);pos=0;scores=[];
  updateFullscreenButtons();engineStartSequence();show('startScreen',false);show('resultScreen',false);
  const firstReady=await showHptExamLoading(order[0]);
  show('examScreen',true);loadClip(firstReady)}
function isKeralaSchool(){
  // Existing schools are migrated with state='Kerala'; missing state remains Kerala-compatible for older cached sessions.
  return String(activeSchool?.state||'Kerala').trim().toLowerCase()==='kerala';
}
function begin(){
  buttonFeedback();
  const n=$('name').value.trim(),p=$('phone').value.trim();
  if(!activeSchool?.id){toast('Enter your driving school access code first.',true);changeSchool();return}
  if(!n){toast('Enter candidate name.',true);$('name').focus();return}
  const digits=p.replace(/\D/g,'');
  if(digits.length<10||digits.length>15){toast('Enter a valid mobile number.',true);$('phone').focus();return}
  candidate={name:n,phone:p};
  try{sessionStorage.setItem('hpt_learner_candidate',JSON.stringify({name:n,phone:p,school_id:activeSchool.id,school_name:activeSchool.school_name,state:activeSchool.state||'Kerala',selected_at:new Date().toISOString()}))}catch{}
  if(!isKeralaSchool()){
    // Schools outside Kerala are offered HPT only; skip the Kerala learner-test selector entirely.
    beginHPTExam();
    return;
  }
  const modal=$('testSelectionModal');if(modal)modal.hidden=false;
}
function closeTestSelection(){const modal=$('testSelectionModal');if(modal)modal.hidden=true}
function chooseHptTest(){closeTestSelection();beginHPTExam()}
function chooseLearnerTest(){
  if(!isKeralaSchool()){closeTestSelection();toast('Learner’s Mock Test is currently available only to Kerala driving schools.',true);return}
  closeTestSelection();
  const learnerCandidate={name:$('name').value.trim(),phone:$('phone').value.trim(),school_id:activeSchool?.id,school_name:activeSchool?.school_name,state:activeSchool?.state||'Kerala',selected_at:new Date().toISOString(),mode:'mock'};
  try{sessionStorage.setItem('hpt_learner_candidate',JSON.stringify(learnerCandidate))}catch{}
  if(typeof window.HPTLaunchLearnerTest==='function')window.HPTLaunchLearnerTest();else toast('Learner’s Mock Test could not be opened. Please refresh and try again.',true);
}
async function printCertificate(examOverride=null,candidateOverride=null){
  // Ignore browser click events; only a genuine saved exam object may override _lastExam.
  const isExamObject=examOverride&&typeof examOverride==='object'&&
    (Object.prototype.hasOwnProperty.call(examOverride,'total')||Object.prototype.hasOwnProperty.call(examOverride,'total_score'));
  const exam=(isExamObject?examOverride:null)||window._lastExam;
  const person=candidateOverride||candidate;
  if(!exam||Number(exam.total)<C.passMark||!window.jspdf?.jsPDF)return;
  const {jsPDF}=window.jspdf;
  const doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});const W=297,H=210;
  doc.setFillColor(250,251,253);doc.rect(0,0,W,H,'F');
  doc.setDrawColor(212,162,32);doc.setLineWidth(1.1);doc.rect(8,8,W-16,H-16,'S');doc.setDrawColor(33,53,72);doc.setLineWidth(.35);doc.rect(13,13,W-26,H-26,'S');
  const school=exam.school||schoolBrand();const platformLogo='assets/hpt-brand-logo-v129.png';const logoPath=school?.logo_url||platformLogo;let logo=null;try{logo=await imageData(logoPath)}catch{}if(!logo&&school?.logo_url){try{logo=await imageData(platformLogo)}catch{}}if(logo){const lw=43,lh=33.2;doc.addImage(logo,'PNG',(W-lw)/2,17,lw,lh);}
  const schoolName=String(school?.school_name||'Driving School').toUpperCase();doc.setTextColor(33,53,72);doc.setFont('helvetica','bold');doc.setFontSize(10);doc.text(schoolName,W/2,57,{align:'center',maxWidth:230});
  doc.setTextColor(184,132,12);doc.setFontSize(25);doc.text('CERTIFICATE OF HAZARD PERCEPTION',W/2,73,{align:'center'});
  doc.setDrawColor(212,162,32);doc.setLineWidth(.7);doc.line(82,79,215,79);
  doc.setTextColor(92,105,116);doc.setFont('helvetica','normal');doc.setFontSize(13);doc.text('This certificate is awarded to',W/2,94,{align:'center'});
  doc.setTextColor(25,38,51);doc.setFont('helvetica','bold');doc.setFontSize(27);doc.text(String(person?.name||exam.candidate_name||'Candidate'),W/2,112,{align:'center'});
  doc.setDrawColor(180,188,195);doc.setLineWidth(.35);doc.line(70,118,227,118);
  doc.setTextColor(92,105,116);doc.setFont('helvetica','normal');doc.setFontSize(12);doc.text('for successfully completing the '+(school?.school_name||'Driving School')+' Hazard Perception Test',W/2,131,{align:'center',maxWidth:230});
  doc.setTextColor(33,53,72);doc.setFont('helvetica','bold');doc.setFontSize(19);doc.text(`SCORE: ${Number(exam.total||exam.total_score||0)} / 100`,W/2,149,{align:'center'});
  doc.setTextColor(35,126,78);doc.setFontSize(16);doc.text('PASS',W/2,160,{align:'center'});
  const d=new Date(exam.completed_at||Date.now());
  doc.setTextColor(92,105,116);doc.setFont('helvetica','normal');doc.setFontSize(9.5);doc.text(`Date: ${d.toLocaleDateString('en-IN')}`,45,181);
  const certNo=exam.id?`HPT-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}-${String(exam.id).slice(0,8).toUpperCase()}`:`HPT-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}-${Math.random().toString(36).slice(2,8).toUpperCase()}`;
  doc.text(`Certificate No: ${certNo}`,W-45,181,{align:'right'});
  doc.setTextColor(33,53,72);doc.setFont('helvetica','bold');doc.setFontSize(9.5);doc.text([school?.school_name,school?.location,school?.contact_number].filter(Boolean).join(' • ').slice(0,120),W/2,191,{align:'center',maxWidth:250});
  doc.save(`${String(school?.school_name||'Driving-School').replace(/[^a-z0-9]+/gi,'-')}-HPT-Certificate-${String(person?.name||exam.candidate_name||'Candidate').replace(/[^a-z0-9]+/gi,'-')}.pdf`)
}
async function imageData(url){return await new Promise((resolve,reject)=>{const img=new Image();img.crossOrigin='anonymous';img.onload=()=>{try{const c=document.createElement('canvas');c.width=img.naturalWidth||img.width;c.height=img.naturalHeight||img.height;const x=c.getContext('2d');x.drawImage(img,0,0);resolve(c.toDataURL('image/png'))}catch(e){reject(e)}};img.onerror=reject;img.src=url+(url.includes('?')?'&':'?')+'v='+Date.now()})}
async function lookupAttempts(){
  const phoneInput=$('attemptPhone'),msg=$('attemptMsg');
  const phone=(phoneInput?.value||'').trim();
  if(!phone){if(msg){msg.textContent='Enter the student mobile number.';msg.className='attemptMsg bad'}return}
  if(!activeSchool?.id||!schoolAccessCode){if(msg){msg.textContent='Please sign in with the correct school access code.';msg.className='attemptMsg bad'}return}
  if(msg){msg.textContent='Loading student performance summary…';msg.className='attemptMsg'}
  $('studentProfileSummary').hidden=true;
  const sb=await supabase();
  if(!sb){if(msg){msg.textContent='Results service is unavailable. Please try again.';msg.className='attemptMsg bad'}return}
  try{
    const {data,error}=await sb.rpc('hpt_get_student_profile_by_school',{p_phone:phone,p_school_id:activeSchool.id,p_school_access_code:schoolAccessCode});
    if(error)throw error;
    const profile=Array.isArray(data)?data[0]:data;
    if(!profile){if(msg){msg.textContent='No student profile found for this mobile number in this school.';msg.className='attemptMsg'}return}
    const hptAttempts=Number(profile.hpt_attempt_count||0),learnerAttempts=Number(profile.learner_attempt_count||0);
    const hptBest=profile.best_hpt_score==null?null:Number(profile.best_hpt_score);
    const learnerBest=profile.best_learner_score==null?null:Number(profile.best_learner_score);
    const name=profile.candidate_name||'Student',schoolName=profile.school_name||activeSchool.school_name||'Driving school';
    window._currentStudentProfile={profile,phone,school:{...activeSchool}};
    $('studentProfileSummary').hidden=false;
    $('studentProfileName').textContent=name;
    $('studentProfileSchool').textContent=schoolName;
    $('studentProfilePhone').textContent=`Mobile: ${phone}`;
    $('profileHptAttempts').textContent=hptAttempts.toLocaleString('en-IN');
    $('profileLearnerAttempts').textContent=learnerAttempts.toLocaleString('en-IN');
    $('profileBestHpt').textContent=`${hptBest===null?'—':hptBest} / 100`;
    $('profileBestLearner').textContent=`${learnerBest===null?'—':learnerBest} / 30`;
    $('profileHptBestResult').textContent=hptBest===null?'Not attempted':(hptBest>=C.passMark?'✓ Passed':'Not passed');
    $('profileHptBestResult').classList.toggle('isFail',hptBest!==null&&hptBest<C.passMark);
    $('profileLearnerBestResult').textContent=learnerBest===null?'Not attempted':(learnerBest>=18?'✓ Passed':'Not passed');
    $('profileLearnerBestResult').classList.toggle('isFail',learnerBest!==null&&learnerBest<18);
    const hptPassed=hptBest!==null&&hptBest>=C.passMark;
    const learnerPassed=learnerBest!==null&&learnerBest>=18;
    const hptCertButton=$('printHptProfileCertBtn');if(hptCertButton)hptCertButton.hidden=!hptPassed;
    const learnerCertButton=$('printLearnerProfileCertBtn');if(learnerCertButton)learnerCertButton.hidden=!learnerPassed;
    const summaryText=`${name} has completed ${hptAttempts} HPT attempt${hptAttempts===1?'':'s'} and ${learnerAttempts} Learner’s Mock Test attempt${learnerAttempts===1?'':'s'}. Only total counts and highest scores are retained in this profile.`;
    $('profileProgressText').textContent=summaryText;
    if(msg){msg.textContent='Student performance summary loaded.';msg.className='attemptMsg ok'}
  }catch(e){
    console.error('Student profile lookup failed',e);
    if(msg){msg.textContent='Could not load the student summary. Apply 17-learner-summary-only-profile.sql in Supabase and try again.';msg.className='attemptMsg bad'}
  }
}
async function printProfileAchievementCertificate(kind){
 const data=window._currentStudentProfile;
 if(!data){toast('Load a student profile first.',true);return}
 const isHpt=kind==='hpt';
 const profile=data.profile||{},school=data.school||activeSchool||{};
 const scoreValue=isHpt?profile.best_hpt_score:profile.best_learner_score;
 const score=scoreValue===null||scoreValue===undefined?null:Number(scoreValue);
 const passMark=isHpt?C.passMark:18,maxMarks=isHpt?100:30;
 if(score===null||!Number.isFinite(score)||score<passMark){toast('A certificate is available only after the student passes this examination.',true);return}
 if(!window.jspdf?.jsPDF){toast('Certificate generator is unavailable. Refresh the page and try again.',true);return}
 const {jsPDF}=window.jspdf;
 const doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'}),W=297,H=210;
 const studentName=String(profile.candidate_name||'Student').trim()||'Student';
 const schoolName=String(school.school_name||profile.school_name||'Driving School').trim()||'Driving School';
 const certTitle=isHpt?'CERTIFICATE OF HAZARD PERCEPTION ACHIEVEMENT':"CERTIFICATE OF LEARNER'S MOCK TEST ACHIEVEMENT";
 const issuedOn=new Date();
 doc.setFillColor(250,252,255);doc.rect(0,0,W,H,'F');
 doc.setDrawColor(204,158,42);doc.setLineWidth(1.2);doc.roundedRect(8,8,W-16,H-16,2,2,'S');
 doc.setDrawColor(31,67,92);doc.setLineWidth(.35);doc.roundedRect(13,13,W-26,H-26,1.5,1.5,'S');
 const platformLogo='assets/hpt-brand-logo-v129.png',logoPath=school.logo_url||platformLogo;
 try{let logo=await imageData(logoPath);if(!logo&&school.logo_url)logo=await imageData(platformLogo);if(logo)doc.addImage(logo,'PNG',(W-31)/2,18,31,24)}catch{}
 doc.setTextColor(29,55,76);doc.setFont('helvetica','bold');doc.setFontSize(11);doc.text(schoolName.toUpperCase(),W/2,49,{align:'center',maxWidth:235});
 doc.setTextColor(168,121,15);doc.setFontSize(isHpt?19:18);doc.text(certTitle,W/2,65,{align:'center',maxWidth:255});
 doc.setDrawColor(205,164,64);doc.setLineWidth(.65);doc.line(66,72,231,72);
 doc.setTextColor(90,105,118);doc.setFont('helvetica','normal');doc.setFontSize(13);doc.text('This certificate is presented to',W/2,88,{align:'center'});
 doc.setTextColor(24,42,58);doc.setFont('helvetica','bold');doc.setFontSize(29);doc.text(studentName,W/2,108,{align:'center',maxWidth:245});
 doc.setDrawColor(185,194,202);doc.setLineWidth(.35);doc.line(72,114,225,114);
 doc.setTextColor(75,91,105);doc.setFont('helvetica','normal');doc.setFontSize(12);
 const completionText=isHpt
   ?'for achieving a passing result in the Hazard Perception Test conducted through the driving school.'
   :"for achieving a passing result in the Learner's Mock Test conducted through the driving school.";
 doc.text(completionText,W/2,127,{align:'center',maxWidth:225});
 doc.setTextColor(29,55,76);doc.setFont('helvetica','bold');doc.setFontSize(19);doc.text(`BEST RECORDED SCORE: ${score} / ${maxMarks}`,W/2,148,{align:'center'});
 doc.setTextColor(34,126,78);doc.setFontSize(15);doc.text(`PASSED  •  PASS MARK ${passMark}/${maxMarks}`,W/2,160,{align:'center'});
 doc.setTextColor(91,105,118);doc.setFont('helvetica','normal');doc.setFontSize(9.5);
 doc.setFontSize(8.5);doc.text('Based on the highest score currently recorded in the student profile.',W/2,173,{align:'center'});
 doc.setFontSize(9.5);doc.text(`Issued on: ${issuedOn.toLocaleDateString('en-IN')}`,43,184);
 doc.setFontSize(8);doc.text('School/platform achievement certificate only. Not a government-issued driving licence or statutory qualification.',W/2,188,{align:'center',maxWidth:250});
 const footer=[schoolName,school.location,school.contact_number].filter(Boolean).join(' • ');
 if(footer){doc.setFont('helvetica','bold');doc.setFontSize(8.5);doc.text(footer.slice(0,145),W/2,196,{align:'center',maxWidth:255})}
 const clean=s=>String(s||'').replace(/[^a-z0-9]+/gi,'-').replace(/^-|-$/g,'').slice(0,55)||'Student';
 const filePrefix=isHpt?'HPT':'Learner-Mock-Test';
 doc.save(`${clean(schoolName)}-${filePrefix}-Certificate-${clean(studentName)}.pdf`);
}
function printStudentProfile(){
 const data=window._currentStudentProfile;
 if(!data){toast('Load a student profile first.',true);return}
 const {profile,phone,school}=data,safe=escHtml;
 const hptAttempts=Number(profile.hpt_attempt_count||0),learnerAttempts=Number(profile.learner_attempt_count||0);
 const hptBest=profile.best_hpt_score==null?null:Number(profile.best_hpt_score),learnerBest=profile.best_learner_score==null?null:Number(profile.best_learner_score);
 const hptPassed=hptBest!==null&&hptBest>=C.passMark,learnerPassed=learnerBest!==null&&learnerBest>=18;
 const schoolName=school?.school_name||profile.school_name||'Driving School',studentName=profile.candidate_name||'Student',logo=school?.logo_url||'assets/hpt-brand-logo-v129.png';
 const w=window.open('','_blank','width=980,height=760');
 if(!w){toast('Please allow the report popup to print the student profile.',true);return}
 w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Student Performance Report</title><style>
 @page{size:A4 portrait;margin:12mm}*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#172b46;margin:0;background:#eaf1f8;font-size:11px;-webkit-print-color-adjust:exact;print-color-adjust:exact}.toolbar{max-width:190mm;margin:10px auto;padding:11px;background:#0869c9;color:#fff;border-radius:8px;text-align:center;font-size:14px;font-weight:800;cursor:pointer}.sheet{width:190mm;min-height:277mm;margin:0 auto 15px;background:#fff;border:1px solid #d7e3f0;border-radius:10px;padding:12mm;position:relative;overflow:hidden}.brand{text-align:center;padding-bottom:13px;border-bottom:3px solid #1767b5}.brand img{max-height:66px;max-width:220px;object-fit:contain;display:block;margin:0 auto 7px}.brandName{font-size:24px;font-weight:900;letter-spacing:.03em;color:#12345c}.brandSub{font-size:10px;color:#63758b;margin-top:4px}.reportTitle{margin:16px 0 18px;background:linear-gradient(90deg,#075bb2,#1685e5);color:#fff;border-radius:7px;padding:12px;text-align:center;font-size:16px;font-weight:900;letter-spacing:.06em}.identity{display:grid;grid-template-columns:1fr 1fr;gap:12px 22px;padding:5px 5px 22px}.identity div{border-bottom:1px solid #d9e2ec;padding:8px 2px;font-size:12px}.identity b{display:inline-block;min-width:112px;color:#52657c}.sectionTitle{background:#0b66bd;color:#fff;border-radius:7px 7px 0 0;padding:11px 12px;font-weight:900;font-size:12px;letter-spacing:.04em;margin-top:14px}.summary{width:100%;border-collapse:collapse;margin:0 0 15px}.summary th,.summary td{border:1px solid #d3dfeb;padding:13px 9px;text-align:center;font-size:11px}.summary th{background:#edf4fb;color:#314a68;font-size:10px}.summary td:first-child,.summary th:first-child{text-align:left}.status{display:inline-block;padding:5px 9px;border-radius:20px;font-size:10px;font-weight:900}.pass{background:#e2f7e9;color:#16803b}.fail{background:#ffeded;color:#b42332}.progress{margin-top:20px;border:1px solid #c8ddf2;background:#f0f7ff;border-radius:8px;overflow:hidden}.progress h3{margin:0;padding:10px 12px;background:#e0efff;color:#14549a;font-size:12px}.progress p{margin:0;padding:14px;font-size:12px;line-height:1.6}.footer{position:absolute;bottom:10mm;left:12mm;right:12mm;border-top:1px solid #dce6f0;padding-top:8px;color:#7b8da2;font-size:9px;display:flex;justify-content:space-between}.bottomAccent{position:absolute;bottom:0;right:0;width:75mm;height:5mm;background:linear-gradient(110deg,#d8ebff,#1685e5);clip-path:polygon(30% 0,100% 0,100% 100%,0 100%)}@media screen{.sheet{box-shadow:0 8px 28px #18365322}}@media print{body{background:#fff}.toolbar{display:none}.sheet{margin:0;border:0;border-radius:0;width:auto;min-height:277mm;padding:9mm}}
 </style></head><body><div class="toolbar" onclick="window.print()">▣ &nbsp; PRINT PERFORMANCE REPORT (A4)</div><main class="sheet"><header class="brand">${logo?`<img src="${safe(logo)}" alt="School logo" onerror="this.onerror=null;this.src='assets/hpt-brand-logo-v129.png'">`:''}<div class="brandName">${safe(schoolName)}</div><div class="brandSub">${safe(school?.location||'')} ${school?.contact_number?' | '+safe(school.contact_number):''}</div></header><div class="reportTitle">STUDENT PERFORMANCE REPORT</div>
 <section class="identity"><div><b>Student Name</b> : ${safe(studentName)}</div><div><b>Mobile Number</b> : ${safe(phone)}</div><div><b>Driving School</b> : ${safe(schoolName)}</div><div><b>Report Date</b> : ${safe(new Date().toLocaleDateString('en-IN'))}</div></section>
 <div class="sectionTitle">EXAMINATION PERFORMANCE SUMMARY</div><table class="summary"><thead><tr><th>Examination</th><th>Total Attempts</th><th>Maximum Score</th><th>Highest Score</th><th>Best Result</th></tr></thead><tbody><tr><td>Hazard Perception Test (HPT)</td><td>${hptAttempts}</td><td>100</td><td>${hptBest===null?'—':hptBest}</td><td><span class="status ${hptPassed?'pass':'fail'}">${hptBest===null?'NOT ATTEMPTED':hptPassed?'PASSED':'NOT PASSED'}</span></td></tr><tr><td>Learner’s Mock Test</td><td>${learnerAttempts}</td><td>30</td><td>${learnerBest===null?'—':learnerBest}</td><td><span class="status ${learnerPassed?'pass':'fail'}">${learnerBest===null?'NOT ATTEMPTED':learnerPassed?'PASSED':'NOT PASSED'}</span></td></tr></tbody></table>
 <section class="progress"><h3>LEARNING PROGRESS</h3><p>${(hptPassed&&learnerPassed)?'The student has achieved the pass benchmark in both examinations. Continue practising to maintain consistent performance.':(hptPassed||learnerPassed)?'The student has achieved the pass benchmark in one examination. Continued practice is recommended for the remaining examination.':'Further practice is recommended. The highest scores and total completed attempts are shown above.'}</p></section>
 <footer class="footer"><span>${safe(schoolName)}</span><span>Student Performance Summary · Generated ${safe(new Date().toLocaleString('en-IN'))}</span></footer><div class="bottomAccent"></div></main><script>window.onload=()=>{const im=[...document.images];Promise.all(im.map(x=>x.complete?Promise.resolve():new Promise(r=>{x.onload=x.onerror=r}))).then(()=>setTimeout(()=>window.print(),300))} <\/script></body></html>`);
 w.document.close();
}
function escHtml(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
async function buildHistoricalExam(r){
  const raw=r.report_data||{};
  let available=clips?.length?clips:[];
  if(!available.length){try{available=await loadClips()}catch{available=[]}}
  const fallback=[];
  const source=available.length?available:[];
  const byCode=new Map(source.map(c=>[String(c.clip_code).padStart(2,'0'),c]));
  const clipOrder=Array.isArray(raw.clip_order)?raw.clip_order.map(x=>String(x).padStart(2,'0')):source.slice(0,C.examClipCount).map(c=>String(c.clip_code).padStart(2,'0'));
  const responseRows=Array.isArray(raw.responses)?raw.responses:[];
  const clipsOut=clipOrder.map(code=>{
    const base=byCode.get(code)||{clip_code:code,title:`Hazard Perception Clip ${code}`,file:`${C.videoBase}clips/${code}.mp4`,hazards:[]};
    const rs=responseRows.filter(x=>String(x.clip_code||'').padStart(2,'0')===code).map(x=>({response_no:Number(x.response_no||1),t:Number(x.click_time_seconds||0),hazard_no:x.hazard_no==null?null:Number(x.hazard_no),points:Number(x.awarded_marks||0),frameData:null}));
    const hs=(base.hazards||[]).map((h,i)=>({hazard_no:Number(h.hazard_no||i+1),t:Number(h.t),label:h.label||`Hazard ${i+1}`}));
    return {clip_code:code,title:base.title||`Hazard Perception Clip ${code}`,file:base.file||base.video_path||`${C.videoBase}clips/${code}.mp4`,hazards:hs,responses:rs,score:0};
  });
  clipsOut.forEach(c=>{c.score=c.responses.reduce((sum,x)=>sum+Number(x.points||0),0)});
  return {id:r.id,total:Number(r.total_score||0),total_score:Number(r.total_score||0),passed:!!r.passed,candidate_name:r.candidate_name,phone:r.phone,started_at:r.started_at,completed_at:r.completed_at,school:schoolBrand(),clips:clipsOut};
}
function openAttempts(){show('attemptsModal',true);$('attemptPhone').value='';$('attemptMsg').textContent='';$('attemptMsg').className='attemptMsg';$('studentProfileSummary').hidden=true;setTimeout(()=>$('attemptPhone')?.focus(),50);}
function closeAttempts(){show('attemptsModal',false);$('studentProfileSummary').hidden=true;$('attemptMsg').textContent='';}
function setupCandidateCertificate(){const btn=$('printCertBtn');if(btn)btn.hidden=true}
bind('whatsappInquiryBtn','click',e=>{
  const name=$('inquirySchoolName')?.value.trim()||'',contact=$('inquiryContact')?.value.trim()||'',location=$('inquiryLocation')?.value.trim()||'';
  if(!name||!contact||!location){e.preventDefault();const target=!name?'inquirySchoolName':!contact?'inquiryContact':'inquiryLocation';$(target)?.focus();toast('Please enter school name, contact number and location before sending the inquiry.',true);return}
  const message=`Hello, I would like to enquire about the Hazard Perception Test for my driving school.\n\nDriving School Name: ${name}\nContact Number: ${contact}\nLocation: ${location}\n\nPlease share the registration and implementation details.`;
  e.currentTarget.href=`https://wa.me/918943764734?text=${encodeURIComponent(message)}`;
});
async function loadSchoolStatsModal(){
  const status=$('schoolStatsStatus');
  if(!activeSchool?.id||!schoolAccessCode){if(status)status.textContent='Please sign in with your school access code.';return}
  if(status)status.textContent='Refreshing lifetime statistics…';
  try{
    const sb=await supabase();if(!sb)throw new Error('Statistics service is unavailable.');
    const {data,error}=await sb.rpc('hpt_school_dashboard_stats',{p_school_access_code:schoolAccessCode});
    if(error)throw error;
    const row=Array.isArray(data)?data[0]:data;
    if(!row)throw new Error('School access is disabled or invalid. Please contact the provider.');
    const students=Number(row.registered_students)||0,attempts=Number(row.total_attempts)||0;
    const passed=Number(row.passed_attempts)||0,failed=Number(row.failed_attempts)||0;
    const rate=attempts?Math.round(passed/attempts*1000)/10:0;
    safeText('schoolStatsSchoolName',row.school_name||activeSchool.school_name||'Your driving school');
    safeText('schoolStatsRegistered',students.toLocaleString('en-IN'));
    safeText('schoolStatsAttempts',attempts.toLocaleString('en-IN'));
    safeText('schoolStatsPassed',passed.toLocaleString('en-IN'));
    safeText('schoolStatsFailed',failed.toLocaleString('en-IN'));
    safeText('schoolStatsAverage',`${Number(row.average_score||0).toFixed(1)} / 100`);
    safeText('schoolStatsThisMonth',`${Number(row.attempts_this_month||0).toLocaleString('en-IN')} attempts`);
    safeText('schoolStatsPassRate',`${rate.toFixed(1)}%`);
    safeText('schoolStatsRingValue',`${rate.toFixed(1)}%`);
    safeText('schoolStatsPassedBarValue',passed.toLocaleString('en-IN'));
    safeText('schoolStatsFailedBarValue',failed.toLocaleString('en-IN'));
    safeText('schoolStatsOutcomeNote',`${passed.toLocaleString('en-IN')} passed and ${failed.toLocaleString('en-IN')} did not pass across ${attempts.toLocaleString('en-IN')} completed examinations.`);
    const ring=$('schoolStatsRing');if(ring)ring.style.background=`conic-gradient(#35d98b ${rate}%, #ff7181 ${rate}% 100%)`;
    const max=Math.max(1,passed,failed);
    const pb=$('schoolStatsPassedBar'),fb=$('schoolStatsFailedBar');
    if(pb)pb.style.width=`${passed/max*100}%`;
    if(fb)fb.style.width=`${failed/max*100}%`;
    const logo=$('schoolStatsLogo'),source=$('headerSchoolLogo');
    if(logo&&source){logo.src=source.src;logo.alt=`${row.school_name||'School'} logo`}
    if(status)status.textContent=`Updated ${new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}`;
  }catch(e){
    if(status)status.textContent=e.message||'Could not load statistics. Please try again.';
  }
}
function openSchoolStatsModal(){
  if(!activeSchool?.id||!schoolAccessCode){toast('Enter your school access code first.',true);return}
  const modal=$('schoolStatsModal');if(!modal)return;
  modal.hidden=false;document.body.classList.add('school-stats-open');
  loadSchoolStatsModal();
  $('schoolStatsClose')?.focus();
}
function closeSchoolStatsModal(){
  const modal=$('schoolStatsModal');if(!modal)return;
  modal.hidden=true;document.body.classList.remove('school-stats-open');
  $('schoolStatsBtn')?.focus();
}
bind('schoolStatsBtn','click',openSchoolStatsModal);
bind('schoolStatsClose','click',closeSchoolStatsModal);
bind('schoolStatsRefresh','click',loadSchoolStatsModal);
bind('schoolStatsModal','click',e=>{if(e.target=== $('schoolStatsModal')||e.target?.hasAttribute('data-stats-close'))closeSchoolStatsModal()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('schoolStatsModal')?.hidden)closeSchoolStatsModal()});
bind('exitSchoolBtn','click',()=>{
  const schoolName=activeSchool?.school_name||'this driving school';
  if(!confirm(`Exit ${schoolName} and return to the school access screen?`))return;
  changeSchool();
});
bind('enterSchoolBtn','click',enterSchool);
bind('schoolAccessCode','keydown',e=>{if(e.key==='Enter')enterSchool()});
bind('startBtn','click',begin);
bind('chooseHptBtn','click',chooseHptTest);bind('chooseLearnerBtn','click',chooseLearnerTest);bind('testSelectionClose','click',closeTestSelection);
bind('testSelectionModal','click',e=>{if(e.target===$('testSelectionModal')||e.target?.matches('[data-test-selection-close]'))closeTestSelection()});
bind('printStudentProfileBtn','click',printStudentProfile);bind('printHptProfileCertBtn','click',()=>printProfileAchievementCertificate('hpt'));bind('printLearnerProfileCertBtn','click',()=>printProfileAchievementCertificate('learner'));
bind('resultClose','click',()=>{show('resultScreen',false);show('startScreen',true)});
bind('newBtn','click',()=>{show('resultScreen',false);show('startScreen',true);loadTopScorers()});
bind('printCertBtn','click',()=>printCertificate());
bind('viewFullReportBtn','click',()=>{
  if(!window._lastExam||!window.RajuHPTReport?.open){toast('Full report viewer is not available. Refresh the page and try again.',true);return}
  window.RajuHPTReport.open(window._lastExam);
});
// Student Profile is wired once by setupHomeMedia(); avoid duplicate modal-opening handlers.
bind('attemptSearchBtn','click',lookupAttempts);bind('attemptCloseBtn','click',closeAttempts);
bind('attemptPhone','keydown',e=>{if(e.key==='Enter')lookupAttempts()});
bind('attemptsModal','click',e=>{if(e.target===$('attemptsModal'))closeAttempts()});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('attemptsModal')?.hidden)closeAttempts()});
bind('skipBtn','click',()=>{if(allowSkip&&running&&!finishing)finishClip()});bind('soundBtn','click',()=>setSoundState(!sound));bind('fullBtn','click',toggleFullscreen);
bind('helpBtn','click',()=>toast('Tap when a developing hazard becomes apparent. You can make up to 5 responses per clip.'));
bind('exitBtn','click',()=>{if(confirm('Exit the examination? This attempt will be incomplete.')){clearTimeout(timer);stopExamHeartbeat();video.pause();running=false;stopRoadAudio();show('examScreen',false);show('startScreen',true)}});
bind('playNow','click',()=>video.play().then(()=>{const o=$('playOverlay');if(o)o.hidden=true;running=true;clearTimeout(timer);timer=setTimeout(finishClip,C.clipLimitSeconds*1000)}).catch(()=>toast('Video could not start',true)));
if(video){video.addEventListener('timeupdate',()=>{update();timeline()});video.addEventListener('ended',finishClip)}
function captureResponseFrame(){
  try{
    if(!video.videoWidth||!video.videoHeight||video.readyState<2)return null;
    const c=document.createElement('canvas'),maxW=640,maxH=360,r=Math.min(maxW/video.videoWidth,maxH/video.videoHeight,1);
    c.width=Math.max(1,Math.round(video.videoWidth*r));c.height=Math.max(1,Math.round(video.videoHeight*r));
    const ctx=c.getContext('2d',{willReadFrequently:true});if(!ctx)return null;
    ctx.drawImage(video,0,0,c.width,c.height);
    const sampleCanvas=document.createElement('canvas');sampleCanvas.width=24;sampleCanvas.height=14;
    const sampleCtx=sampleCanvas.getContext('2d',{willReadFrequently:true});if(!sampleCtx)return null;
    sampleCtx.drawImage(c,0,0,sampleCanvas.width,sampleCanvas.height);
    const sample=sampleCtx.getImageData(0,0,sampleCanvas.width,sampleCanvas.height).data;
    let nonBlack=0;for(let i=0;i<sample.length;i+=4){if(sample[i]>6||sample[i+1]>6||sample[i+2]>6)nonBlack++;}
    if(nonBlack<3)return null;
    return c.toDataURL('image/jpeg',.78);
  }catch(e){return null}
}
function responseBeep(){try{if(!sound)return;audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended')audioCtx.resume();const now=audioCtx.currentTime;const o1=audioCtx.createOscillator(),o2=audioCtx.createOscillator(),g=audioCtx.createGain();o1.type='triangle';o2.type='sine';o1.frequency.setValueAtTime(720,now);o1.frequency.exponentialRampToValueAtTime(1080,now+0.07);o2.frequency.setValueAtTime(1080,now+0.025);o2.frequency.exponentialRampToValueAtTime(1420,now+0.09);g.gain.setValueAtTime(0.0001,now);g.gain.exponentialRampToValueAtTime(0.34,now+0.012);g.gain.exponentialRampToValueAtTime(0.18,now+0.075);g.gain.exponentialRampToValueAtTime(0.0001,now+0.22);o1.connect(g);o2.connect(g);g.connect(audioCtx.destination);o1.start(now);o2.start(now+0.018);o1.stop(now+0.225);o2.stop(now+0.225)}catch{}}
video.addEventListener('click',e=>{
  if(!running||finishing)return;
  const max=Math.max(1,Number(C.maxResponsesPerClip)||5);
  if(responseLocked||responses.length>=max){responseLocked=true;responseLimitWarning();update();return}
  const t=video.currentTime,hz=order[pos].hazards||[];
  let best=null;
  const hazardCount=hz.length===1?1:2;
  hz.forEach((h,i)=>{
    const hn=h.hazard_no||i+1;
    if(responses.some(r=>r.hazard_no===hn))return;
    const delta=t-Number(h.t);
    if(delta>=0&&delta<=5){
      const maxPts=hazardCount===1?10:5;
      // HPT reaction scoring: first 0.5s earns full marks; 0.5–1.0s loses 1 mark;
      // after 1.0s, deduct 3 marks per additional second. The same mark deductions
      // apply to 10-mark single hazards and 5-mark two-hazard clips.
      const awarded=window.HPTScoring?.marksForReaction(delta,maxPts)??Math.max(0,Math.min(maxPts,Math.round(maxPts-(delta<=.5?0:delta<=1?2*(delta-.5):1+3*(delta-1)))));
      if(!best||awarded>best.points)best={hazard_no:hn,points:awarded};
    }
  });
  const r={t:Number(t.toFixed(3)),video_time_seconds:Number(t.toFixed(3)),clicked_at:new Date().toISOString(),response_no:responses.length+1,hazard_no:best?.hazard_no||null,points:best?.points||0,frameData:captureResponseFrame()};
  responses.push(r);
  responseBeep();
  if(responses.length>=max)responseLocked=true;
  update();
  order[pos]._responses=responses.slice();
});
let deferredInstallPrompt=null;
function isStandalone(){return window.matchMedia?.('(display-mode: standalone)').matches||window.navigator.standalone===true}
function showInstallHelp(){const m=$('installHelpModal');if(!m)return;$('installHelpText').innerHTML='On Android Chrome, use <b>Install app</b> when offered. On iPhone, open the browser share menu and choose <b>Add to Home Screen</b>.';show('installHelpModal',true)}
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstallPrompt=e;show('installAppCard',!isStandalone())});
window.addEventListener('appinstalled',()=>{deferredInstallPrompt=null;show('installAppCard',false)});
bind('installAppBtn','click',async()=>{if(deferredInstallPrompt){deferredInstallPrompt.prompt();try{await deferredInstallPrompt.userChoice}catch{}deferredInstallPrompt=null;return}showInstallHelp()});
bind('installHelpClose','click',()=>show('installHelpModal',false));bind('installHelpOk','click',()=>show('installHelpModal',false));
if(!isStandalone())show('installAppCard',true);
applySkipSetting(false);window.HPTExamSettingsReady=loadExamControls();setupConsoleFeedback();setupHomeMedia();show('startScreen',false);show('schoolGate',true);show('examScreen',false);show('resultScreen',false);document.getElementById('loadingScreen')?.remove();window.HPTLeaderboardReady=loadGlobalMonthlyTopFive();bootSchoolSession();setInterval(()=>{if(!$('schoolGate')?.hidden)window.HPTLeaderboardReady=loadGlobalMonthlyTopFive()},5*60*1000);
})();
