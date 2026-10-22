(()=>{
'use strict';
if(!document.getElementById('hptHiddenFix')){const s=document.createElement('style');s.id='hptHiddenFix';s.textContent='[hidden]{display:none!important}';document.head.appendChild(s);}
const $=id=>document.getElementById(id);
const C=window.RAJU_HPT_CONFIG;
let clips=[], order=[], pos=0, responses=[], scores=[], running=false, finishing=false, timer=null, responseLocked=false;
let candidate={name:'',phone:''}, sound=true, accessCode='1234';
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
  }catch{toast('Fullscreen is not available in this browser.',true)}
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
function staticHazards(code){return (C.staticHazards?.[String(code).padStart(2,'0')]||[]).map((h,i)=>({...h,hazard_no:i+1}))}
async function supabase(){if(window._sb)return window._sb;try{if(!window.supabase?.createClient)return null;window._sb=window.supabase.createClient(C.supabaseUrl,C.supabaseAnonKey);return window._sb}catch{return null}}
async function loadClips(){clips=C.staticClips.map(x=>({...x,hazards:staticHazards(x.clip_code)}));const sb=await supabase();if(sb){const {data:vs}=await sb.from('hpt_videos').select('id,clip_code,title,video_path,duration_seconds,active').eq('active',true);if(vs?.length){const {data:hs}=await sb.from('hpt_hazards').select('video_id,hazard_no,timestamp_seconds,label');const by={};(hs||[]).forEach(h=>(by[h.video_id]??=[]).push({t:Number(h.timestamp_seconds),label:h.label||`Hazard ${h.hazard_no}`,hazard_no:h.hazard_no}));const remote=vs.map(v=>({...v,file:v.video_path.startsWith('http')?v.video_path:(v.video_path.startsWith('./')?v.video_path:C.videoBase+v.video_path.replace(/^videos\//,'')),hazards:(by[v.id]||[])})).filter(v=>v.hazards.length>=1);const merged=[...clips];remote.forEach(v=>{const i=merged.findIndex(x=>String(x.clip_code).padStart(2,'0')===String(v.clip_code).padStart(2,'0'));if(i>=0)merged[i]=v;else merged.push(v)});clips=merged;}}
return clips.filter(c=>c.active&&c.video_path&&c.hazards?.length>=1)}
async function saveAttempt(){const sb=await supabase();if(!sb)return {ok:false,error:'Supabase is not available.'};const total=scores.reduce((a,b)=>a+b,0);const payload={candidate_name:candidate.name,phone:candidate.phone,started_at:new Date(Date.now()-C.examClipCount*C.clipLimitSeconds*1000).toISOString(),completed_at:new Date().toISOString(),total_score:total,passed:total>=C.passMark,clip_order:order.map(c=>c.clip_code),responses:scores.flatMap((_,i)=>(order[i]._responses||[]).map(r=>({video_id:order[i].id||null,clip_code:order[i].clip_code||null,response_no:r.response_no,click_time_seconds:r.t,hazard_no:r.hazard_no||null,awarded_marks:r.points})))};
for(let attempt=1;attempt<=2;attempt++){
  const {data,error}=await sb.rpc('hpt_record_attempt',payload);
  if(!error&&data)return {ok:true,id:data};
  if(attempt===2)return {ok:false,error:error?.message||'Could not save the examination result.'};
  await new Promise(r=>setTimeout(r,600));
}
return {ok:false,error:'Could not save the examination result.'}}
function loadClip(){resetClip();running=false;clearTimeout(timer);video.pause();video.removeAttribute('src');video.src=order[pos].file;video.muted=!sound;video.load();$('playOverlay').hidden=true;video.onloadedmetadata=()=>{video.currentTime=0;update();timeline();startRoadAudio();const p=video.play();if(p?.catch)p.catch(()=>{$('playOverlay').hidden=false});running=true;clearTimeout(timer);timer=setTimeout(finishClip,C.clipLimitSeconds*1000)};video.onerror=()=>{running=false;$('playOverlay').hidden=false;$('playNow').textContent='PLAY CLIP';toast('Video could not be loaded',true)}}
async function finishClip(){if(finishing)return;finishing=true;running=false;clearTimeout(timer);video.pause();scores.push(Math.max(0,Math.min(10,scoreThis())));pos++;if(pos>=order.length){await finishExam();return}setTimeout(()=>{finishing=false;loadClip()},220)}
function scoreThis(){return responses.reduce((a,r)=>a+r.points,0)}
async function finishExam(){
  stopRoadAudio();
  const total=scores.reduce((a,b)=>a+b,0),completedAt=new Date().toISOString();
  const reportClips=order.map((c,i)=>({clip_code:c.clip_code,title:c.title,file:c.file||c.video_path,hazards:(c.hazards||[]).map(h=>({hazard_no:h.hazard_no,t:Number(h.t),label:h.label||`Hazard ${h.hazard_no}`})),responses:(c._responses||[]).map(r=>({response_no:r.response_no,t:Number(r.t),hazard_no:r.hazard_no||null,points:Number(r.points||0),frameData:r.frameData||null})),score:Number(scores[i]||0)}));
  const saved=await saveAttempt();
  show('examScreen',false);show('resultScreen',true);if(total>=C.passMark){setTimeout(()=>playOneShot('audio/test-pass-sound.mp3',1.0),120)}$('candidateResult').textContent=`${candidate.name} • ${candidate.phone}`;$('finalScore').textContent=`${total} / 100`;$('passText').textContent=total>=C.passMark?'PASS — EXAMINATION STANDARD MET':'NOT PASSED — BELOW PASS MARK';$('passText').className='status '+(total>=C.passMark?'pass':'fail');$('resultSaveStatus').textContent=saved.ok?'Result recorded successfully.':'Result could not be recorded automatically. Please inform the school admin.';$('resultSaveStatus').className='save-status '+(saved.ok?'ok':'error');$('printCertBtn').hidden=total<C.passMark;const rows=scores.map((s,i)=>`<div class="scoreRow"><span>Clip ${String(i+1).padStart(2,'0')}</span><b>${s} / 10</b></div>`).join('');$('resultDetails').innerHTML=`<div class="scoreGrid">${rows}</div><div class="resultSummary"><div><span>PASS MARK</span><b>${C.passMark}</b></div><div><span>YOUR SCORE</span><b>${total}</b></div><div><span>STATUS</span><b>${total>=C.passMark?'PASS':'NOT PASSED'}</b></div></div>`;
  window._lastExam={total,total_score:total,passed:total>=C.passMark,saved, candidate_name:candidate.name,phone:candidate.phone,completed_at:completedAt,started_at:new Date(Date.now()-C.examClipCount*C.clipLimitSeconds*1000).toISOString(),clips:reportClips};
  if(total>=C.passMark)setupCandidateCertificate();
}
async function begin(){buttonFeedback();ensureAudio();const n=$('name').value.trim(),p=$('phone').value.trim(),code=$('accessCode').value.trim(),msg=$('accessCodeMsg');if(msg){msg.hidden=true;msg.textContent=''}if(!n||!p||!code){toast('Enter candidate name, phone number and access code',true);return}const sb=await supabase();if(!sb){toast('Access code verification is unavailable. Please try again.',true);return}let verified=false;try{const {data,error}=await sb.rpc('verify_hpt_access_code',{p_code:code});if(error)throw error;verified=data===true}catch(e){console.error('HPT access-code verification failed',e);if(msg){msg.textContent='ACCESS CODE VERIFICATION UNAVAILABLE';msg.hidden=false}toast('Access code verification is unavailable.',true);return}if(!verified){if(msg){msg.textContent='ACCESS CODE DENIED';msg.hidden=false}toast('ACCESS CODE DENIED',true);$('accessCode').focus();return}accessCode=code;clips=await loadClips();if(clips.length<C.examClipCount){toast(`Need ${C.examClipCount} active clips with at least one hazard each`,true);return}candidate={name:n,phone:p};$('candName').textContent=n;$('candPhone').textContent=p;
try{if(!document.fullscreenElement)await document.documentElement.requestFullscreen?.();}catch(e){console.warn('Fullscreen request unavailable',e)}
updateFullscreenButtons();engineStartSequence();startRoadAudio();order=shuffle(clips).slice(0,C.examClipCount);pos=0;scores=[];show('startScreen',false);show('resultScreen',false);show('examScreen',true);loadClip()}
async function printCertificate(examOverride=null,candidateOverride=null){
  const exam=examOverride||window._lastExam;
  const person=candidateOverride||candidate;
  if(!exam||Number(exam.total)<C.passMark||!window.jspdf?.jsPDF)return;
  const {jsPDF}=window.jspdf;
  const doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});const W=297,H=210;
  doc.setFillColor(250,251,253);doc.rect(0,0,W,H,'F');
  doc.setDrawColor(212,162,32);doc.setLineWidth(1.1);doc.rect(8,8,W-16,H-16,'S');doc.setDrawColor(33,53,72);doc.setLineWidth(.35);doc.rect(13,13,W-26,H-26,'S');
  let logo=null;try{logo=await imageData('raju-logo.png')}catch{}if(logo){const lw=43,lh=33.2;doc.addImage(logo,'PNG',(W-lw)/2,17,lw,lh);}
  doc.setTextColor(33,53,72);doc.setFont('helvetica','bold');doc.setFontSize(10);doc.text('RAJU MOTOR DRIVING SCHOOL • CHALAKUDY',W/2,57,{align:'center'});
  doc.setTextColor(184,132,12);doc.setFontSize(25);doc.text('CERTIFICATE OF HAZARD PERCEPTION',W/2,73,{align:'center'});
  doc.setDrawColor(212,162,32);doc.setLineWidth(.7);doc.line(82,79,215,79);
  doc.setTextColor(92,105,116);doc.setFont('helvetica','normal');doc.setFontSize(13);doc.text('This certificate is awarded to',W/2,94,{align:'center'});
  doc.setTextColor(25,38,51);doc.setFont('helvetica','bold');doc.setFontSize(27);doc.text(String(person?.name||exam.candidate_name||'Candidate'),W/2,112,{align:'center'});
  doc.setDrawColor(180,188,195);doc.setLineWidth(.35);doc.line(70,118,227,118);
  doc.setTextColor(92,105,116);doc.setFont('helvetica','normal');doc.setFontSize(12);doc.text('for successfully completing the Raju Motor Driving School Hazard Perception Test',W/2,131,{align:'center'});
  doc.setTextColor(33,53,72);doc.setFont('helvetica','bold');doc.setFontSize(19);doc.text(`SCORE: ${Number(exam.total||exam.total_score||0)} / 100`,W/2,149,{align:'center'});
  doc.setTextColor(35,126,78);doc.setFontSize(16);doc.text('PASS',W/2,160,{align:'center'});
  const d=new Date(exam.completed_at||Date.now());
  doc.setTextColor(92,105,116);doc.setFont('helvetica','normal');doc.setFontSize(9.5);doc.text(`Date: ${d.toLocaleDateString('en-IN')}`,45,181);
  const certNo=exam.id?`HPT-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}-${String(exam.id).slice(0,8).toUpperCase()}`:`HPT-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}-${Math.random().toString(36).slice(2,8).toUpperCase()}`;
  doc.text(`Certificate No: ${certNo}`,W-45,181,{align:'right'});
  doc.setTextColor(33,53,72);doc.setFont('helvetica','bold');doc.setFontSize(9.5);doc.text('RAJU MOTOR DRIVING SCHOOL • CHALAKUDY • SINCE 1969',W/2,191,{align:'center'});
  doc.save(`Raju-HPT-Certificate-${String(person?.name||exam.candidate_name||'Candidate').replace(/[^a-z0-9]+/gi,'-')}.pdf`)
}
async function imageData(url){return await new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>{const c=document.createElement('canvas');c.width=img.naturalWidth||img.width;c.height=img.naturalHeight||img.height;const x=c.getContext('2d');x.drawImage(img,0,0);resolve(c.toDataURL('image/png'))};img.onerror=reject;img.src=url+'?v='+Date.now()})}
async function lookupAttempts(){
  const phoneInput=$('attemptPhone');const msg=$('attemptMsg');const list=$('attemptList');
  const phone=(phoneInput?.value||'').trim();
  if(!phone){if(msg){msg.textContent='Enter your mobile number.';msg.className='attemptMsg bad'}return}
  if(msg){msg.textContent='Searching…';msg.className='attemptMsg'}
  list.innerHTML='<div class="attemptLoading">Loading your examination attempts…</div>';
  const sb=await supabase();
  if(!sb){list.innerHTML='';if(msg){msg.textContent='Results service is unavailable. Please try again.';msg.className='attemptMsg bad'}return}
  try{
    const {data,error}=await sb.rpc('hpt_get_candidate_attempts',{p_phone:phone});
    if(error)throw error;
    const rows=data||[];
    if(!rows.length){list.innerHTML='<div class="attemptEmpty">No HPT attempts found for this mobile number.</div>';if(msg){msg.textContent='';msg.className='attemptMsg'}return}
    if(msg){msg.textContent=`${rows.length} attempt${rows.length===1?'':'s'} found`;msg.className='attemptMsg ok'}
    list.innerHTML=rows.map((r,i)=>{
      const passed=Number(r.total_score||0)>=C.passMark;
      const d=new Date(r.completed_at||r.started_at);
      return `<article class="attemptCard"><div class="attemptTop"><div><span class="attemptDate">${d.toLocaleDateString('en-IN')} • ${d.toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})}</span><strong>Attempt ${rows.length-i}</strong></div><span class="attemptStatus ${passed?'pass':'fail'}">${passed?'PASS':'NOT PASSED'}</span></div><div class="attemptScore"><b>${Number(r.total_score||0)}</b><span>/ 100</span></div><div class="attemptMeta">Pass mark ${C.passMark} • ${passed?'Certificate available':'Certificate not available'}</div><div class="attemptActions"><button class="attemptReportBtn" type="button" data-attempt-report="${escHtml(r.id)}">↓ DOWNLOAD REPORT</button>${passed?`<button class="attemptCertBtn" type="button" data-attempt-cert="${escHtml(r.id)}">↓ DOWNLOAD CERTIFICATE</button>`:''}</div></article>`
    }).join('');
    list.querySelectorAll('[data-attempt-cert]').forEach(btn=>btn.onclick=async()=>{
      const r=rows.find(x=>String(x.id)===String(btn.dataset.attemptCert));if(!r)return;
      btn.disabled=true;btn.textContent='GENERATING…';
      try{await printCertificate({id:r.id,total:r.total_score,completed_at:r.completed_at,candidate_name:r.candidate_name},{name:r.candidate_name,phone:r.phone})}catch(e){console.error(e);toast('Could not generate the certificate.',true)}
      finally{btn.disabled=false;btn.textContent='↓ DOWNLOAD CERTIFICATE'}
    });
    list.querySelectorAll('[data-attempt-report]').forEach(btn=>btn.onclick=async()=>{
      const r=rows.find(x=>String(x.id)===String(btn.dataset.attemptReport));if(!r)return;
      btn.disabled=true;btn.textContent='GENERATING…';
      try{
        const report=await buildHistoricalExam(r);
        if(!window.RajuHPTReport?.generate)throw new Error('Report generator unavailable');
        await window.RajuHPTReport.generate(report);
        toast('Complete HPT report downloaded.');
      }catch(e){console.error(e);toast('Could not generate the HPT report.',true)}
      finally{btn.disabled=false;btn.textContent='↓ DOWNLOAD REPORT'}
    });
  }catch(e){console.error(e);list.innerHTML='';if(msg){msg.textContent='Could not load attempts. Please try again.';msg.className='attemptMsg bad'}}
}
function escHtml(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
async function buildHistoricalExam(r){
  const raw=r.report_data||{};
  let available=clips?.length?clips:[];
  if(!available.length){try{available=await loadClips()}catch{available=[]}}
  const fallback=Array.isArray(C.staticClips)?C.staticClips.map(x=>({...x,hazards:staticHazards(x.clip_code)})):[];
  const source=available.length?available:fallback;
  const byCode=new Map(source.map(c=>[String(c.clip_code).padStart(2,'0'),c]));
  const clipOrder=Array.isArray(raw.clip_order)?raw.clip_order.map(x=>String(x).padStart(2,'0')):source.slice(0,C.examClipCount).map(c=>String(c.clip_code).padStart(2,'0'));
  const responseRows=Array.isArray(raw.responses)?raw.responses:[];
  const clipsOut=clipOrder.map(code=>{
    const base=byCode.get(code)||fallback.find(c=>String(c.clip_code).padStart(2,'0')===code)||{clip_code:code,title:`Hazard Perception Clip ${code}`,file:`videos/${Number(code)}.webm`,hazards:staticHazards(code)};
    const rs=responseRows.filter(x=>String(x.clip_code||'').padStart(2,'0')===code).map(x=>({response_no:Number(x.response_no||1),t:Number(x.click_time_seconds||0),hazard_no:x.hazard_no==null?null:Number(x.hazard_no),points:Number(x.awarded_marks||0),frameData:null}));
    const hs=(base.hazards||staticHazards(code)||[]).map((h,i)=>({hazard_no:Number(h.hazard_no||i+1),t:Number(h.t),label:h.label||`Hazard ${i+1}`}));
    return {clip_code:code,title:base.title||`Hazard Perception Clip ${code}`,file:base.file||base.video_path||`videos/${Number(code)}.webm`,hazards:hs,responses:rs,score:0};
  });
  clipsOut.forEach(c=>{c.score=c.responses.reduce((sum,x)=>sum+Number(x.points||0),0)});
  return {id:r.id,total:Number(r.total_score||0),total_score:Number(r.total_score||0),passed:!!r.passed,candidate_name:r.candidate_name,phone:r.phone,started_at:r.started_at,completed_at:r.completed_at,clips:clipsOut};
}
function openAttempts(){show('attemptsModal',true);$('attemptPhone').value='';$('attemptMsg').textContent='';$('attemptList').innerHTML='<div class="attemptEmpty">Enter your mobile number to view your HPT attempts.</div>';setTimeout(()=>$('attemptPhone')?.focus(),80)}
function closeAttempts(){show('attemptsModal',false)}
function setupCandidateCertificate(){$('printCertBtn').onclick=printCertificate}
$('startBtn').onclick=begin;$('resultClose').onclick=()=>{show('resultScreen',false);show('startScreen',true);};$('newBtn').onclick=()=>{show('resultScreen',false);show('startScreen',true);};$('printCertBtn').onclick=()=>printCertificate();$('downloadReportBtn').onclick=async()=>{const b=$('downloadReportBtn');if(!window._lastExam||!window.RajuHPTReport){toast('Report generator is not available. Please refresh the page.',true);return}b.disabled=true;b.textContent='GENERATING…';try{await window.RajuHPTReport.generate(window._lastExam);toast('Complete HPT report downloaded.')}catch(e){console.error(e);toast('Could not generate the HPT report.',true)}finally{b.disabled=false;b.textContent='DOWNLOAD REPORT'}};const viewAttemptsBtn=$('viewAttemptsBtn');if(viewAttemptsBtn)viewAttemptsBtn.onclick=openAttempts;$('attemptSearchBtn').onclick=lookupAttempts;$('attemptCloseBtn').onclick=closeAttempts;$('attemptPhone').onkeydown=e=>{if(e.key==='Enter')lookupAttempts()};$('attemptsModal').onclick=e=>{if(e.target===$('attemptsModal'))closeAttempts()};$('skipBtn').onclick=finishClip;$('soundBtn').onclick=()=>{setSoundState(!sound);};$('fullBtn').onclick=toggleFullscreen;$('helpBtn').onclick=()=>toast('Tap when a developing hazard becomes apparent. You can make up to 5 responses per clip.');$('exitBtn').onclick=()=>{if(confirm('Exit the examination? This attempt will be incomplete.')){clearTimeout(timer);video.pause();running=false;stopRoadAudio();show('examScreen',false);show('startScreen',true);}};$('playNow').onclick=()=>video.play().then(()=>{$('playOverlay').hidden=true;running=true;clearTimeout(timer);timer=setTimeout(finishClip,C.clipLimitSeconds*1000)}).catch(()=>toast('Video could not start',true));
video.addEventListener('timeupdate',()=>{update();timeline()});video.addEventListener('ended',finishClip);
function captureResponseFrame(){
  try{
    if(!video.videoWidth||!video.videoHeight)return null;
    const c=document.createElement('canvas'),maxW=640,maxH=360,r=Math.min(maxW/video.videoWidth,maxH/video.videoHeight,1);
    c.width=Math.max(1,Math.round(video.videoWidth*r));c.height=Math.max(1,Math.round(video.videoHeight*r));
    c.getContext('2d').drawImage(video,0,0,c.width,c.height);
    return c.toDataURL('image/jpeg',.72);
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
      // Gentler HPT reaction-time curve: early identification still earns full marks,
      // while a valid response later in the 5-second window retains meaningful marks.
      // This avoids making the test disproportionately difficult for first-time candidates.
      const multiplier=delta<=1?1:delta<=2?.9:delta<=3?.8:delta<=4?.7:.6;
      const pts=maxPts*multiplier;
      const rounded=Math.max(1,Math.round(pts));
      if(!best||rounded>best.points)best={hazard_no:hn,points:rounded};
    }
  });
  const r={t,response_no:responses.length+1,hazard_no:best?.hazard_no||null,points:best?.points||0,frameData:captureResponseFrame()};
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
$('installAppBtn').onclick=async()=>{if(deferredInstallPrompt){deferredInstallPrompt.prompt();try{await deferredInstallPrompt.userChoice}catch{}deferredInstallPrompt=null;return}showInstallHelp()};
$('installHelpClose').onclick=()=>show('installHelpModal',false);$('installHelpOk').onclick=()=>show('installHelpModal',false);
if(!isStandalone())show('installAppCard',true);
setupConsoleFeedback();setupHomeMedia();$('startScreen').querySelector('input')?.focus();show('startScreen',true);show('examScreen',false);show('resultScreen',false);startLoadingScreen();
})();
