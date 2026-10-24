(()=>{'use strict';
const C=window.RAJU_HPT_CONFIG; const sb=window.supabase.createClient(C.supabaseUrl,C.supabaseAnonKey); const $=id=>document.getElementById(id);
let results=[],videos=[],editingId=null,localUrl=null,localFile=null,editingCode='',editingGitHubFilePath='';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=s=>{s=Math.max(0,Number(s)||0);return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(Math.floor(s%60)).padStart(2,'0')}.${Math.floor((s%1)*10)}`};
const notice=(t,bad=false)=>{const e=$('notice');e.hidden=false;e.textContent=t;e.className='notice '+(bad?'bad':'good');clearTimeout(e._t);e._t=setTimeout(()=>e.hidden=true,6000)};
const emsg=(t,bad=false)=>{$('editorMsg').textContent=t;$('editorMsg').className='message '+(bad?'bad':'good')};
function showLogin(){ $('login').hidden=false;$('dashboard').hidden=true;$('logoutBtn').hidden=true;$('adminIdentity').hidden=true;$('detailModal').hidden=true }
function showDash(a){ $('login').hidden=true;$('dashboard').hidden=false;$('logoutBtn').hidden=false;$('adminIdentity').hidden=false;$('adminIdentity').textContent=a?.full_name||a?.email||'' }
async function guard(){const {data:{session}}=await sb.auth.getSession();if(!session){showLogin();return null}const {data:admin,error}=await sb.from('admin_users').select('id,full_name,email').eq('id',session.user.id).eq('active',true).maybeSingle();if(error||!admin){await sb.auth.signOut();showLogin();$('loginMsg').textContent='This account is not an active Raju Driving School admin.';return null}return {session,admin}}
async function login(){const email=$('email').value.trim(),password=$('password').value;if(!email||!password){$('loginMsg').textContent='Enter email and password.';return}$('loginBtn').disabled=true;$('loginMsg').textContent='Signing in…';const {error}=await sb.auth.signInWithPassword({email,password});if(error){$('loginMsg').textContent=error.message;$('loginBtn').disabled=false;return}const a=await guard();$('loginBtn').disabled=false;if(a){showDash(a.admin);await refreshAll();openRequestedAdminTab()}}
async function refreshAll(){const a=await guard();if(!a)return;await Promise.all([loadResults(),loadVideos(),loadAccessCode()]);if(window.HPTSchoolManager?.refresh)await window.HPTSchoolManager.refresh();updateStats()}
async function loadAccessCode(){const e=$('adminAccessCode'),m=$('accessCodeMsg');if(!e)return;try{const {data,error}=await sb.from('hpt_settings').select('access_code').eq('id',1).maybeSingle();if(error)throw error;e.value=data?.access_code||'1234';m.textContent=data?'':'Run the included supabase-hpt-v21-access-code.sql migration once to enable persistent access-code changes.';m.className='message '+(data?'good':'bad')}catch(err){e.value='1234';m.textContent='Access-code settings are not configured yet. Run supabase-hpt-v21-access-code.sql in Supabase.';m.className='message bad'}}
async function saveAccessCode(){const e=$('adminAccessCode'),m=$('accessCodeMsg');const code=e.value.trim();if(!code){m.textContent='Enter an access code.';m.className='message bad';return}if(code.length<4){m.textContent='Access code must be at least 4 characters.';m.className='message bad';return}const a=await guard();if(!a)return;$('saveAccessCode').disabled=true;$('saveAccessCode').textContent='SAVING…';try{const {error}=await sb.from('hpt_settings').update({access_code:code,updated_at:new Date().toISOString()}).eq('id',1);if(error)throw error;m.textContent='✓ Candidate access code updated.';m.className='message good';notice('Candidate HPT access code updated.')}catch(err){m.textContent=err.message||'Could not update access code.';m.className='message bad';notice(err.message||'Could not update access code.',true)}finally{$('saveAccessCode').disabled=false;$('saveAccessCode').textContent='SAVE ACCESS CODE'}}
async function loadResults(){
  const all=[];const pageSize=1000;
  for(let from=0;;from+=pageSize){
    // Do not use PostgREST's embedded hpt_schools(...) join here. Older/live
    // projects may have a stale schema cache or an FK that has not been added yet.
    const {data,error}=await sb.from('hpt_attempts')
      .select('id,candidate_name,phone,started_at,completed_at,total_score,passed,clip_order,school_id')
      .order('started_at',{ascending:false}).range(from,from+pageSize-1);
    if(error){notice(error.message,true);return}
    all.push(...(data||[]));
    if(!data||data.length<pageSize)break;
  }
  const {data:schoolRows,error:schoolError}=await sb.from('hpt_schools')
    .select('id,school_name,contact_number,location,logo_url,brand_color,dark_color');
  const schoolById=new Map((schoolRows||[]).map(s=>[s.id,s]));
  results=all.map(r=>({...r,hpt_schools:schoolById.get(r.school_id)||null}));
  if(schoolError)notice(`Results loaded, but school details could not be loaded: ${schoolError.message}`,true);
  renderResults();
}
function isPassed(r){return r.passed===true||Number(r.total_score||0)>=60}
function renderResults(){const q=$('searchResults').value.trim().toLowerCase(),f=$('resultFilter').value;const rows=results.filter(r=>(!q||`${r.candidate_name} ${r.phone}`.toLowerCase().includes(q))&&(f==='all'||(f==='pass'&&isPassed(r))||(f==='fail'&&!isPassed(r))));$('resultsBody').innerHTML=rows.map(r=>`<tr><td>${new Date(r.started_at).toLocaleString('en-IN')}</td><td>${esc(r.hpt_schools?.school_name||'Legacy / unknown')}</td><td><b>${esc(r.candidate_name)}</b></td><td>${esc(r.phone)}</td><td class="score">${Number(r.total_score||0)} / 100</td><td class="${isPassed(r)?'pass':'fail'}">${isPassed(r)?'PASS':'NOT PASSED'}</td><td><button class="small" data-view="${r.id}">VIEW</button><button class="small report-btn" title="Download complete HPT analysis" data-report="${r.id}">REPORT</button>${isPassed(r)?`<button class="small certificate-btn" title="Download HPT certificate" data-certificate="${r.id}">PRINT</button>`:''}<button class="small danger-outline" data-del-attempt="${r.id}">DELETE</button></td></tr>`).join('')||'<tr><td colspan="7" class="empty">No examination results found.</td></tr>';
const mr=$('mobileResults');
if(mr)mr.innerHTML=rows.map(r=>`<article class="result-card"><div class="rc-head"><div><small>DATE</small><b>${new Date(r.started_at).toLocaleDateString('en-IN')}</b></div><span class="${isPassed(r)?'pass':'fail'}">${isPassed(r)?'PASS':'NOT PASSED'}</span></div><h3>${esc(r.candidate_name)}</h3><div class="rc-grid"><div><small>SCHOOL</small><b>${esc(r.hpt_schools?.school_name||'Legacy / unknown')}</b></div><div><small>PHONE</small><b>${esc(r.phone)}</b></div><div><small>SCORE</small><b>${Number(r.total_score||0)} / 100</b></div></div><div class="rc-actions"><button class="small" data-view="${r.id}">VIEW</button><button class="small report-btn" data-report="${r.id}">REPORT</button>${isPassed(r)?`<button class="small certificate-btn" data-certificate="${r.id}">PRINT</button>`:''}<button class="small danger-outline" data-del-attempt="${r.id}">DELETE</button></div></article>`).join('')||'<div class="empty">No examination results found.</div>';document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>showDetail(b.dataset.view));document.querySelectorAll('[data-report]').forEach(b=>b.onclick=()=>downloadReport(b.dataset.report));document.querySelectorAll('[data-certificate]').forEach(b=>b.onclick=()=>downloadCertificate(b.dataset.certificate));document.querySelectorAll('[data-del-attempt]').forEach(b=>b.onclick=()=>deleteAttempt(b.dataset.delAttempt))}
async function deleteAttempt(id){const r=results.find(x=>x.id===id);if(!r||!confirm(`Delete the complete examination record for ${r.candidate_name}? This cannot be undone.`))return;const {error}=await sb.from('hpt_responses').delete().eq('attempt_id',id);if(error){notice(error.message,true);return}const {error:e2}=await sb.from('hpt_attempts').delete().eq('id',id);if(e2){notice(e2.message,true);return}await loadResults();updateStats();notice('Examination record deleted.')}
async function showDetail(id){if(!(await guard()))return;const r=results.find(x=>x.id===id);if(!r)return;const {data:rs,error}=await sb.from('hpt_responses').select('response_no,click_time_seconds,hazard_no,awarded_marks,video_id').eq('attempt_id',id).order('response_no');if(error){notice(error.message,true);return}$('detailTitle').textContent=r.candidate_name;$('detailMeta').textContent=`${r.hpt_schools?.school_name||'Legacy / unknown'} • ${r.phone} • ${new Date(r.started_at).toLocaleString('en-IN')} • ${isPassed(r)?'PASS':'NOT PASSED'} • ${r.total_score}/100`;$('detailBody').innerHTML=`<div class="detail-clip"><span>Responses</span><b>${rs?.length||0}</b></div><div class="detail-clip"><span>Randomized order</span><b>${(r.clip_order||[]).map(esc).join(' → ')||'—'}</b></div>`+(rs||[]).map(x=>`<div class="detail-clip"><span>Response ${x.response_no} • ${Number(x.click_time_seconds).toFixed(1)}s • Hazard ${x.hazard_no||'—'}</span><b>+${x.awarded_marks}</b></div>`).join('');$('detailModal').hidden=false}
function updateStats(){const passed=results.filter(isPassed).length,avg=results.length?Math.round(results.reduce((a,r)=>a+Number(r.total_score||0),0)/results.length):0,ready=videos.filter(v=>v.active&&v.hazard_count>=1).length;$('statAttempts').textContent=results.length;$('statPassed').textContent=passed;$('statAverage').textContent=avg;$('statVideos').textContent=ready}
async function publisherRequest(action,fields={},file=null){
  const a=await guard();if(!a)throw new Error('Admin session is required. Please sign in again.');
  const fd=new FormData();fd.append('action',action);
  Object.entries(fields||{}).forEach(([k,v])=>{if(v!==undefined&&v!==null)fd.append(k,String(v))});
  if(file)fd.append('file',file);
  let result;
  try{result=await sb.functions.invoke('hpt-publish-video',{body:fd})}
  catch(e){throw new Error(`Could not reach the HPT GitHub publishing service. Deploy the updated hpt-publish-video function to Supabase project ${new URL(C.supabaseUrl).hostname.split('.')[0]}. ${e?.message||''}`.trim())}
  const {data,error}=result||{};
  if(error){
    let detail=error.message||'Unknown Edge Function error.';
    const response=error.context;
    if(response&&typeof response.clone==='function'){
      try{const body=await response.clone().text();if(body){try{const parsed=JSON.parse(body);detail=parsed.error||parsed.message||body}catch{detail=body}}}catch{}
    }
    if(/fetch|network|connection/i.test(detail))detail=`The Supabase Edge Function could not be reached. Confirm that hpt-publish-video is deployed and the browser can reach Supabase. (${detail})`;
    throw new Error(detail);
  }
  if(data?.error)throw new Error(data.error);
  if(!data||data.ok===false)throw new Error('The HPT publishing service returned an empty or unsuccessful response.');
  return data;
}
async function loadVideos(){
  const {data,error}=await sb.from('hpt_videos').select('id,clip_code,title,video_path,duration_seconds,active,updated_at,hpt_hazards(id,hazard_no,timestamp_seconds,label)').order('clip_code');
  if(error){notice(error.message,true);return}
  const registered=(data||[]).map(v=>({...v,hazard_count:(v.hpt_hazards||[]).length,githubOnly:false,githubMissing:false}));
  let remote=[],githubSyncOk=false;
  try{
    const response=await publisherRequest('list_videos');
    remote=Array.isArray(response.videos)?response.videos:[];githubSyncOk=true;
  }catch(e){
    const detail=/video path is required/i.test(e.message)
      ?'The deployed Supabase publishing function is outdated. Deploy the V73 hpt-publish-video function from this package.'
      :e.message;
    notice(`GitHub library sync unavailable. Showing ${registered.length} Supabase-registered clips only. ${detail}`,true);
  }

  const byCode=new Map();
  registered.forEach(v=>byCode.set(String(Number.parseInt(String(v.clip_code).replace(/\D/g,''),10)),v));

  // A clip may have more than one extension in GitHub (for example 11.webm and 11.mp4).
  // Keep one library card per clip number and prefer the file path already stored in Supabase.
  const remoteByCode=new Map();
  remote.forEach(file=>{
    const filename=String(file.name||file.path||'').split('/').pop();
    const match=filename.match(/^(\d+)\.(webm|mp4|m4v|mov)$/i);
    if(!match)return;
    const number=String(Number(match[1]));
    const row=byCode.get(number);
    const ext=match[2].toLowerCase();
    const score=(row&&String(row.video_path||'')===String(file.path||'')?100:0)
      +({mp4:4,webm:3,m4v:2,mov:1}[ext]||0);
    const previous=remoteByCode.get(number);
    if(!previous||score>previous.score)remoteByCode.set(number,{file,score});
  });

  const used=new Set();
  const discovered=[...remoteByCode.entries()].map(([number,entry])=>{
    const file=entry.file;
    const code=String(Number(number)).padStart(2,'0');
    const row=byCode.get(number);
    if(row){
      used.add(row.id);
      return {...row,clip_code:row.clip_code||code,video_path:file.path||row.video_path,githubOnly:false,githubMissing:false,githubSize:Number(file.size||0),githubSha:file.sha||null};
    }
    return {id:`github:${file.path}`,clip_code:code,title:`Hazard Perception Clip ${code}`,video_path:file.path,duration_seconds:0,active:false,updated_at:null,hpt_hazards:[],hazard_count:0,githubOnly:true,githubMissing:false,githubSize:Number(file.size||0),githubSha:file.sha||null};
  });
  const missing=registered.filter(v=>!used.has(v.id)).map(v=>({...v,githubMissing:githubSyncOk}));
  videos=[...discovered,...missing].sort((a,b)=>Number(String(a.clip_code).replace(/\D/g,''))-Number(String(b.clip_code).replace(/\D/g,''))||String(a.video_path).localeCompare(String(b.video_path)));
  const sync=$('videoLibrarySync');if(sync){
    const configuredCount=discovered.filter(v=>!v.githubOnly).length;
    const setupCount=discovered.filter(v=>v.githubOnly).length;
    const missingCount=missing.length;
    sync.textContent=githubSyncOk
      ?`GitHub: ${discovered.length} unique clips • ${configuredCount} configured • ${setupCount} need hazard setup${missingCount?` • ${missingCount} registered files missing from GitHub`:''}.`
      :`GitHub sync is unavailable. Showing ${registered.length} Supabase-registered clips only.`;
  }
  renderVideos();
}

function resolveAssetPath(path){
  if(!path)return '';
  if(/^https?:\/\//i.test(path))return path;
  const clean=String(path).replace(/^\.\//,'').replace(/^\/+/, '');
  // Local file:// admin copies do not contain videos uploaded after the ZIP was built.
  // Load those previews directly from the public GitHub repository.
  if(location.protocol==='file:')return new URL(clean,'https://raw.githubusercontent.com/bestinraju25/hazard-perception-test/main/').href;
  return new URL(clean,location.href).href;
}
function thumbPath(v){const n=String(v.clip_code||'').replace(/\D/g,'');return n?resolveAssetPath(`thumbnails/${Number(n)}.jpg`):''}
function renderVideos(){
  $('videoGrid').innerHTML=videos.map(v=>{
    const thumb=thumbPath(v),status=v.githubOnly?'SETUP REQUIRED':v.githubMissing?'GITHUB FILE MISSING':(v.active?'ACTIVE':'INACTIVE');
    const statusClass=(v.active&&!v.githubOnly&&!v.githubMissing)?'on':'off';
    const duration=Number(v.duration_seconds)>0?`${Number(v.duration_seconds).toFixed(1)}s`:'Duration not set';
    const hazardText=v.hazard_count===1?'1 hazard • 10 marks':v.hazard_count>=2?'2 hazards • 5 marks each':'Hazards not configured';
    const extra=v.githubOnly?'<span>GitHub file • needs setup</span>':v.githubMissing?'<span>File not found in GitHub</span>':(v.githubSize?`<span>${(v.githubSize/1048576).toFixed(1)} MB</span>`:'');
    return `<article class="video-card"><div class="vc-preview" data-edit="${esc(v.id)}" title="Open clip"><img class="vc-thumb" src="${esc(thumb)}" alt="Preview of Clip ${esc(v.clip_code)}" loading="lazy" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><video class="vc-thumb-fallback" src="${esc(resolveVideoPath(v.video_path))}" muted playsinline preload="metadata" hidden></video><span class="vc-play">▶</span></div><div class="vc-top"><span class="clip">CLIP ${esc(v.clip_code)}</span><span class="status ${statusClass}">● ${status}</span></div><h3>${esc(v.title)}</h3><p>${esc(v.video_path)}</p><div class="tags"><span>${duration}</span><span>${hazardText}</span>${extra}</div><div class="vc-actions"><button class="small" data-edit="${esc(v.id)}">${v.githubOnly?'CONFIGURE HAZARDS':'EDIT & MARK'}</button>${v.githubOnly?'':`<button class="small" data-toggle="${esc(v.id)}" ${v.githubMissing?'disabled':''}>${v.active?'DISABLE':'ENABLE'}</button>`}</div></article>`;
  }).join('')||'<div class="empty">No video files found in GitHub or Supabase.</div>';
  document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>editVideo(b.dataset.edit));
  document.querySelectorAll('[data-toggle]').forEach(b=>b.onclick=()=>toggleVideo(b.dataset.toggle));
}
function clearLocal(){if(localUrl){URL.revokeObjectURL(localUrl);localUrl=null}localFile=null}
function resetEditor(){clearLocal();editingId=null;editingCode='';editingGitHubFilePath='';$('videoFile').value='';$('fileName').textContent='No file selected';$('videoTitle').value='';$('h1t').value='';$('h2t').value='';$('h1label').value='';$('h2label').value='';$('hasHazard2').checked=true;$('hazard2Block').hidden=false;$('marker2').hidden=true;$('mark2').hidden=false;$('active').checked=true;$('clipCodeDisplay').textContent='—';$('videoPathDisplay').textContent='videos/—';$('h1preview').textContent='Not set';$('h2preview').textContent='Not set';$('preview').removeAttribute('src');$('preview').load();$('previewEmpty').hidden=false;$('deleteVideo').hidden=true;emsg('')}
function nextClipCode(){const nums=videos.map(v=>parseInt(String(v.clip_code).replace(/\D/g,''),10)).filter(Number.isFinite);let n=Math.max(10,...nums)+1;while(videos.some(v=>String(v.clip_code).padStart(2,'0')===String(n).padStart(2,'0')))n++;return String(n).padStart(2,'0')}
function newVideo(){resetEditor();editingId=null;editingCode=nextClipCode();$('editor').hidden=false;$('editorEyebrow').textContent='NEW VIDEO';$('editorTitle').textContent='Upload HPT Video';$('editorSub').textContent='Select a video, then configure one or two developing hazards.';$('clipCodeDisplay').textContent=editingCode;$('videoPathDisplay').textContent=`videos/${editingCode}.webm`;$('videosPanel').hidden=false;$('editor').scrollIntoView({behavior:'smooth',block:'start'})}
function editVideo(id){const v=videos.find(x=>x.id===id);if(!v)return;clearLocal();editingId=v.githubOnly?null:v.id;editingGitHubFilePath=v.githubOnly?v.video_path:'';editingCode=v.clip_code;$('editor').hidden=false;$('editorEyebrow').textContent='EDIT CLIP';$('editorTitle').textContent=`Edit Clip ${v.clip_code}`;$('editorSub').textContent='Replace the video if needed, adjust one or two hazard points, then save.';$('clipCodeDisplay').textContent=v.clip_code;$('videoPathDisplay').textContent=v.video_path;$('videoTitle').value=v.title;$('active').checked=!!v.active;$('videoFile').value='';$('fileName').textContent='No replacement selected';const hs=(v.hpt_hazards||[]).sort((a,b)=>a.hazard_no-b.hazard_no);const h1=hs.find(x=>x.hazard_no===1),h2=hs.find(x=>x.hazard_no===2);$('h1t').value=h1?.timestamp_seconds??'';$('h2t').value=h2?.timestamp_seconds??'';$('h1label').value=h1?.label??'';$('h2label').value=h2?.label??'';$('hasHazard2').checked=!!h2;$('hazard2Block').hidden=!h2;$('marker2').hidden=!h2;$('mark2').hidden=!h2;updateHazardPreviews();$('preview').src=resolveVideoPath(v.video_path);$('previewEmpty').hidden=true;$('preview').load();$('deleteVideo').hidden=false;$('videosPanel').hidden=false;$('editor').scrollIntoView({behavior:'smooth',block:'start'})}
function resolveVideoPath(path){return resolveAssetPath(path)}
function setMarkers(){const d=Number($('preview').duration)||50;const fill=Math.min(100,(Number($('preview').currentTime)||0)/Math.max(1,d)*100);$('trackFill').style.width=fill+'%';for(const n of [1,2]){const val=Number($(`h${n}t`).value),m=$(`marker${n}`);if(Number.isFinite(val)&&val>=0&&val<=d){m.hidden=false;m.style.left=(val/d*100)+'%'}else m.hidden=true}}
function updateHazardPreviews(){for(const n of [1,2]){$(`h${n}preview`).textContent=Number.isFinite(Number($(`h${n}t`).value))&&$(`h${n}t`).value!==''?fmt(Number($(`h${n}t`).value)):'Not set'}setMarkers()}
function setHaz(n){if(!$('preview').src||!Number.isFinite($('preview').currentTime)){emsg('Choose a playable video first.',true);return}const t=Number($('preview').currentTime.toFixed(1));$(`h${n}t`).value=t;updateHazardPreviews();emsg(`Hazard ${n} set at ${fmt(t)}.`)}
function validate(){const title=$('videoTitle').value.trim(),t1=Number($('h1t').value),t2=Number($('h2t').value),d=Number($('preview').duration),has2=$('hasHazard2').checked;if(!localFile&&!editingId&&!editingGitHubFilePath)return 'Choose a video file first.';if(!title)return 'Enter a clip title.';if(!$('h1t').value.trim()||!Number.isFinite(t1))return 'Set Hazard 1 using the button below the video.';if(has2&&(!$('h2t').value.trim()||!Number.isFinite(t2)||t1===t2))return 'Set a different timestamp for Hazard 2.';if(Number.isFinite(d)&&(t1>d||(has2&&t2>d)))return 'A hazard timestamp cannot be beyond the video duration.';return ''}
async function publishFile(path,file=localFile){return publisherRequest('publish',{path,commit_message:`HPT: publish ${editingCode}`},file)}
async function makeVideoThumbnail(file){return await new Promise((resolve,reject)=>{const url=URL.createObjectURL(file),v=document.createElement('video');v.muted=true;v.playsInline=true;v.preload='metadata';let done=false;const cleanup=()=>{URL.revokeObjectURL(url);v.remove()};v.onerror=()=>{if(!done){done=true;cleanup();reject(new Error('Could not read video for thumbnail.'))}};v.onloadedmetadata=()=>{try{v.currentTime=Math.min(1,Math.max(.1,(v.duration||1)*.08))}catch(e){v.currentTime=0}};v.onseeked=()=>{if(done)return;const c=document.createElement('canvas');c.width=640;c.height=360;const x=c.getContext('2d');x.drawImage(v,0,0,c.width,c.height);c.toBlob(b=>{done=true;cleanup();b?resolve(b):reject(new Error('Could not create thumbnail.'))},'image/jpeg',.86)};v.src=url;v.load()})}
async function saveVideo(){const problem=validate();if(problem){emsg(problem,true);return}const duration=Number($('preview').duration);let path=editingGitHubFilePath||(editingId?(videos.find(v=>v.id===editingId)?.video_path||`videos/${editingCode}.webm`):`videos/${editingCode}.webm`);if(localFile){const ext=(localFile.name.split('.').pop()||'webm').toLowerCase().replace(/[^a-z0-9]/g,'');path=`videos/${editingCode}.${ext||'webm'}`}
$('saveVideo').disabled=true;$('saveVideo').textContent='SAVING & PUBLISHING…';emsg('Uploading video…');try{if(localFile){await publishFile(path,localFile);try{const thumb=await makeVideoThumbnail(localFile);await publishFile(`thumbnails/${Number(String(editingCode).replace(/\D/g,''))}.jpg`,thumb)}catch(thumbErr){console.warn('HPT thumbnail upload skipped:',thumbErr)}}const payload={clip_code:editingCode,title:$('videoTitle').value.trim(),video_path:path,duration_seconds:Number((duration||50).toFixed(2)),active:$('active').checked,updated_at:new Date().toISOString()};let id=editingId;if(id){const {error}=await sb.from('hpt_videos').update(payload).eq('id',id);if(error)throw error}else{const {data:existing,error:qerr}=await sb.from('hpt_videos').select('id').eq('clip_code',editingCode).maybeSingle();if(qerr)throw qerr;if(existing?.id){id=existing.id;const {error}=await sb.from('hpt_videos').update(payload).eq('id',id);if(error)throw error}else{const {data,error}=await sb.from('hpt_videos').insert(payload).select('id').single();if(error)throw error;id=data.id}}
const {error:he}=await sb.from('hpt_hazards').upsert([{video_id:id,hazard_no:1,timestamp_seconds:Number($('h1t').value),label:$('h1label').value.trim()||'Developing hazard 1'}],{onConflict:'video_id,hazard_no'});if(he)throw he;if($('hasHazard2').checked){const {error:he2}=await sb.from('hpt_hazards').upsert([{video_id:id,hazard_no:2,timestamp_seconds:Number($('h2t').value),label:$('h2label').value.trim()||'Developing hazard 2'}],{onConflict:'video_id,hazard_no'});if(he2)throw he2}else{const {error:del2}=await sb.from('hpt_hazards').delete().eq('video_id',id).eq('hazard_no',2);if(del2)throw del2}editingId=id;editingGitHubFilePath='';await loadVideos();updateStats();emsg($('hasHazard2').checked?'✓ Clip saved. Two hazards are live, 5 marks each.':'✓ Clip saved. One hazard is live and worth 10 marks.');notice(`Clip ${editingCode} saved successfully.`)}catch(e){emsg(e.message||'Could not save this clip.',true);notice(e.message||'Could not save this clip.',true)}finally{$('saveVideo').disabled=false;$('saveVideo').textContent='✓ SAVE & PUBLISH VIDEO'}}
async function toggleVideo(id){const v=videos.find(x=>x.id===id);if(!v)return;if(v.githubOnly){editVideo(id);notice(`Configure hazard timestamps for Clip ${v.clip_code} before enabling it.`);return}const {error}=await sb.from('hpt_videos').update({active:!v.active,updated_at:new Date().toISOString()}).eq('id',id);if(error){notice(error.message,true);return}await loadVideos();updateStats()}
async function deleteVideo(){
  const v=videos.find(x=>x.id===editingId||(editingGitHubFilePath&&x.video_path===editingGitHubFilePath));
  if(!v)return;
  const removesMetadata=!!editingId;
  const ok=confirm(`Delete Clip ${v.clip_code} permanently?\n\nThis will delete the video from GitHub${removesMetadata?' and remove its HPT metadata and hazard timestamps from Supabase':''}.\n\nThis cannot be undone.`);
  if(!ok)return;
  $('deleteVideo').disabled=true;$('deleteVideo').textContent='DELETING…';emsg('Deleting video from GitHub…');
  try{
    const j=await publisherRequest('delete',{path:v.video_path,commit_message:`HPT: delete ${v.clip_code}`});
    emsg('GitHub video deleted. Removing HPT metadata…');
    if(editingId){
      const {error:h}=await sb.from('hpt_hazards').delete().eq('video_id',editingId);if(h)throw h;
      const {error}=await sb.from('hpt_videos').delete().eq('id',editingId);if(error)throw error;
    }
    const wasMissing=!!j.missing;
    closeEditor();await loadVideos();updateStats();notice(wasMissing?`Clip ${v.clip_code} GitHub file was already missing; metadata cleaned up.`:`Clip ${v.clip_code} deleted from GitHub${removesMetadata?' and Supabase':''}.`);
  }catch(e){emsg(e.message||'Could not delete this clip.',true);notice(e.message||'Could not delete this clip.',true)}
  finally{$('deleteVideo').disabled=false;$('deleteVideo').textContent='Delete clip'}
}
function closeEditor(){clearLocal();$('editor').hidden=true;editingId=null;editingCode='';editingGitHubFilePath=''}
async function imageData(url){return await new Promise((resolve,reject)=>{const img=new Image();img.crossOrigin='anonymous';img.onload=()=>{const c=document.createElement('canvas');c.width=img.naturalWidth||img.width;c.height=img.naturalHeight||img.height;const x=c.getContext('2d');x.drawImage(img,0,0);resolve(c.toDataURL('image/png'))};img.onerror=reject;img.src=url+'?v='+Date.now()})}
async function downloadReport(id){
  const r=results.find(x=>x.id===id);if(!r||!window.RajuHPTReport){notice('Report generator is not available. Please refresh the page.',true);return}
  const buttons=document.querySelectorAll(`[data-report="${CSS.escape(id)}"]`);buttons.forEach(b=>{b.disabled=true;b.textContent='…'});
  try{
    const {data:rs,error:re}=await sb.from('hpt_responses').select('response_no,click_time_seconds,hazard_no,awarded_marks,video_id,clip_code').eq('attempt_id',id).order('response_no');if(re)throw re;
    const codes=(r.clip_order||[]).map(x=>String(x).padStart(2,'0'));
    const {data:vs,error:ve}=await sb.from('hpt_videos').select('id,clip_code,title,video_path,duration_seconds,hpt_hazards(hazard_no,timestamp_seconds,label)').in('clip_code',codes);if(ve)throw ve;
    const byId={};(vs||[]).forEach(v=>byId[String(v.id)]=v);const byCode={};(vs||[]).forEach(v=>byCode[String(v.clip_code).padStart(2,'0')]=v);
    const reportClips=codes.map((code,idx)=>{
      const v=byCode[code], clipResponses=(rs||[]).filter(x=>String(x.clip_code||'').padStart(2,'0')===code || (x.video_id&&v&&String(x.video_id)===String(v.id)));
      const hazards=(v?.hpt_hazards?.length?v.hpt_hazards:C.staticHazards?.[code]||[]).map((h,i)=>({hazard_no:Number(h.hazard_no||i+1),t:Number(h.timestamp_seconds??h.t),label:h.label||`Hazard ${i+1}`})).sort((a,b)=>a.hazard_no-b.hazard_no);
      return {clip_code:code,title:v?.title||`Hazard Perception Clip ${code}`,file:v?.video_path?resolveVideoPath(v.video_path):`videos/${Number(code)}.webm`,hazards:hazards,responses:clipResponses.map(x=>({response_no:x.response_no,t:Number(x.click_time_seconds),hazard_no:x.hazard_no||null,points:Number(x.awarded_marks||0)})),score:clipResponses.reduce((a,x)=>a+Number(x.awarded_marks||0),0)};
    });
    await window.RajuHPTReport.generate({id:r.id,candidate_name:r.candidate_name,phone:r.phone,total_score:r.total_score,passed:isPassed(r),started_at:r.started_at,completed_at:r.completed_at,school:r.hpt_schools||null,clips:reportClips});
    notice(`Complete report downloaded for ${r.candidate_name}.`);
  }catch(e){console.error(e);notice(e.message||'Could not generate the HPT report.',true)}finally{buttons.forEach(b=>{b.disabled=false;b.textContent='REPORT'})}
}
async function downloadCertificate(id){const r=results.find(x=>x.id===id);if(!r||!isPassed(r))return;if(!window.jspdf?.jsPDF){notice('Certificate generator is not available. Please refresh the page.',true);return}const btn=document.querySelector(`[data-certificate="${CSS.escape(id)}"]`);if(btn){btn.disabled=true;btn.textContent='…'}try{const {jsPDF}=window.jspdf;const doc=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});const W=297,H=210;
// Light, print-friendly certificate design.
doc.setFillColor(250,251,253);doc.rect(0,0,W,H,'F');doc.setDrawColor(212,162,32);doc.setLineWidth(1.1);doc.rect(8,8,W-16,H-16,'S');doc.setDrawColor(33,53,72);doc.setLineWidth(.35);doc.rect(13,13,W-26,H-26,'S');
const school=r.hpt_schools||{};const logoPath=school.logo_url||(school.school_name?'school-placeholder.svg':'raju-logo.png');let logo=null;try{logo=await imageData(logoPath)}catch{}if(logo){const lw=43,lh=33.2;doc.addImage(logo,'PNG',(W-lw)/2,17,lw,lh);}
const schoolName=String(school.school_name||'Driving School').toUpperCase();const schoolLocation=school.location||'';doc.setTextColor(33,53,72);doc.setFont('helvetica','bold');doc.setFontSize(10);doc.text(schoolName,W/2,57,{align:'center',maxWidth:230});doc.setTextColor(184,132,12);doc.setFontSize(25);doc.text('CERTIFICATE OF HAZARD PERCEPTION',W/2,73,{align:'center'});doc.setDrawColor(212,162,32);doc.setLineWidth(.7);doc.line(82,79,215,79);
doc.setTextColor(92,105,116);doc.setFont('helvetica','normal');doc.setFontSize(13);doc.text('This certificate is awarded to',W/2,94,{align:'center'});doc.setTextColor(25,38,51);doc.setFont('helvetica','bold');doc.setFontSize(27);doc.text(String(r.candidate_name||'Candidate'),W/2,112,{align:'center'});doc.setDrawColor(180,188,195);doc.setLineWidth(.35);doc.line(70,118,227,118);doc.setTextColor(92,105,116);doc.setFont('helvetica','normal');doc.setFontSize(12);doc.text('for successfully completing the '+(school.school_name||'Driving School')+' Hazard Perception Test',W/2,131,{align:'center',maxWidth:230});doc.setTextColor(33,53,72);doc.setFont('helvetica','bold');doc.setFontSize(19);doc.text(`SCORE: ${Number(r.total_score||0)} / 100`,W/2,149,{align:'center'});doc.setTextColor(35,126,78);doc.setFontSize(16);doc.text('PASS',W/2,160,{align:'center'});const d=new Date(r.completed_at||r.started_at);doc.setTextColor(92,105,116);doc.setFont('helvetica','normal');doc.setFontSize(9.5);doc.text(`Date: ${d.toLocaleDateString('en-IN')}`,45,181);doc.text(`Certificate No: HPT-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}-${String(r.id).slice(0,8).toUpperCase()}`,W-45,181,{align:'right'});doc.setTextColor(33,53,72);doc.setFont('helvetica','bold');doc.setFontSize(9.5);doc.text([schoolName,schoolLocation,school.contact_number].filter(Boolean).join(' • ').slice(0,120),W/2,191,{align:'center',maxWidth:250});doc.save(`${String(school.school_name||'Driving-School').replace(/[^a-z0-9]+/gi,'-')}-HPT-Certificate-${String(r.candidate_name||'Candidate').replace(/[^a-z0-9]+/gi,'-')}.pdf`);notice(`Certificate downloaded for ${r.candidate_name}.`)}catch(e){console.error(e);notice('Could not generate the certificate.',true)}finally{if(btn){btn.disabled=false;btn.textContent='PRINT'}}}
function exportCsv(){const lines=[['Date','Driving School','Candidate','Phone','Score','Status'],...results.map(r=>[new Date(r.started_at).toLocaleString('en-IN'),r.hpt_schools?.school_name||'Legacy / unknown',r.candidate_name,r.phone,r.total_score,isPassed(r)?'PASS':'NOT PASSED'])];const csv=lines.map(row=>row.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(',')).join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='raju-hpt-results.csv';a.click()}
function openRequestedAdminTab(){const requested=new URLSearchParams(window.location.search).get('tab');if(requested)document.querySelectorAll('.tab').forEach(t=>{if(t.dataset.tab===requested)t.click()})}
$('loginBtn').onclick=login;$('password').onkeydown=e=>{if(e.key==='Enter')login()};$('saveAccessCode').onclick=saveAccessCode;$('logoutBtn').onclick=async()=>{await sb.auth.signOut();location.reload()};$('refreshAll').onclick=refreshAll;$('searchResults').oninput=renderResults;$('resultFilter').onchange=renderResults;$('exportCsv').onclick=exportCsv;$('newVideo').onclick=newVideo;$('closeEditor').onclick=closeEditor;$('saveVideo').onclick=saveVideo;$('deleteVideo').onclick=deleteVideo;$('mark1').onclick=()=>setHaz(1);$('mark2').onclick=()=>{if($('hasHazard2').checked)setHaz(2)};$('hasHazard2').onchange=()=>{const on=$('hasHazard2').checked;$('hazard2Block').hidden=!on;$('marker2').hidden=!on;$('mark2').hidden=!on;if(!on){$('h2t').value='';$('h2label').value='';}updateHazardPreviews();};$('annotationTrack').onclick=e=>{const r=$('annotationTrack').getBoundingClientRect();$('preview').currentTime=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width))*(Number($('preview').duration)||50);setMarkers()};for(const n of [1,2])$(`marker${n}`).onclick=e=>{e.stopPropagation();$('preview').currentTime=Number($(`h${n}t`).value)||0};$('preview').ontimeupdate=()=>{$('now').textContent=fmt($('preview').currentTime);$('dur').textContent=fmt($('preview').duration);setMarkers()};$('preview').onloadedmetadata=()=>{$('previewEmpty').hidden=true;$('dur').textContent=fmt($('preview').duration);setMarkers()};$('preview').onerror=()=>{$('previewEmpty').hidden=false;$('previewEmpty').textContent='Video could not be loaded. If this is an existing clip, verify its published path.'};$('videoFile').onchange=()=>{clearLocal();localFile=$('videoFile').files[0]||null;if(localFile){$('fileName').textContent=localFile.name;localUrl=URL.createObjectURL(localFile);$('preview').src=localUrl;$('previewEmpty').hidden=true;$('videoTitle').value=$('videoTitle').value||localFile.name.replace(/\.[^.]+$/,'').replace(/[_-]+/g,' ');$('preview').load()}};$('closeModal').onclick=()=>$('detailModal').hidden=true;$('detailModal').onclick=e=>{if(e.target===$('detailModal'))$('detailModal').hidden=true};document.querySelectorAll('.tab').forEach(t=>t.onclick=()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));t.classList.add('active');const tab=t.dataset.tab;$('resultsPanel').hidden=tab!=='results';$('videosPanel').hidden=tab!=='videos';if($('schoolsPanel'))$('schoolsPanel').hidden=tab!=='schools';$('editor').hidden=true;if(tab==='schools'&&window.HPTSchoolManager)window.HPTSchoolManager.refresh()});
let resultsPoll=null;
function startResultsPolling(){clearInterval(resultsPoll);resultsPoll=setInterval(async()=>{if(document.hidden||$('dashboard').hidden)return;try{await loadResults();updateStats()}catch(e){console.error('HPT results refresh failed',e)}},5000)}
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!$('dashboard').hidden)loadResults()});
(async()=>{const a=await guard();if(a){showDash(a.admin);await refreshAll();startResultsPolling();openRequestedAdminTab()}})();
})();
