(()=>{'use strict';
const C=window.RAJU_HPT_CONFIG; const sb=window.supabase.createClient(C.supabaseUrl,C.supabaseAnonKey); const $=id=>document.getElementById(id);
let results=[],videos=[],editingId=null,localUrl=null,localFile=null,editingCode='',editingGitHubFilePath='',schoolDirectory=[],selectedResultsSchoolId=null;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=s=>{s=Math.max(0,Number(s)||0);return `${String(Math.floor(s/60)).padStart(2,'0')}:${String(Math.floor(s%60)).padStart(2,'0')}.${Math.floor((s%1)*10)}`};
const notice=(t,bad=false)=>{const e=$('notice');e.hidden=false;e.textContent=t;e.className='notice '+(bad?'bad':'good');clearTimeout(e._t);e._t=setTimeout(()=>e.hidden=true,6000)};
const emsg=(t,bad=false)=>{$('editorMsg').textContent=t;$('editorMsg').className='message '+(bad?'bad':'good')};
function showLogin(){ $('login').hidden=false;$('dashboard').hidden=true;$('logoutBtn').hidden=true;$('adminIdentity').hidden=true;$('detailModal').hidden=true }
function showDash(a){ $('login').hidden=true;$('dashboard').hidden=false;$('logoutBtn').hidden=false;$('adminIdentity').hidden=false;$('adminIdentity').textContent=a?.full_name||a?.email||'' }
async function guard(){const {data:{session}}=await sb.auth.getSession();if(!session){showLogin();return null}const {data:admin,error}=await sb.from('admin_users').select('id,full_name,email').eq('id',session.user.id).eq('active',true).maybeSingle();if(error||!admin){await sb.auth.signOut();showLogin();$('loginMsg').textContent='This account is not an active provider administrator. Contact the platform provider.';return null}return {session,admin}}
async function login(){const email=$('email').value.trim(),password=$('password').value;if(!email||!password){$('loginMsg').textContent='Enter email and password.';return}$('loginBtn').disabled=true;$('loginMsg').textContent='Signing in…';const {error}=await sb.auth.signInWithPassword({email,password});if(error){$('loginMsg').textContent=error.message;$('loginBtn').disabled=false;return}const a=await guard();$('loginBtn').disabled=false;if(a){showDash(a.admin);await refreshAll();openRequestedAdminTab()}}
async function refreshAll(){const a=await guard();if(!a)return;await Promise.all([loadResults(),loadVideos(),loadAccessCode()]);if(window.HPTSchoolManager?.refresh)await window.HPTSchoolManager.refresh();updateStats()}
async function loadAccessCode(){const e=$('adminAccessCode'),m=$('accessCodeMsg');if(!e)return;try{const {data,error}=await sb.from('hpt_settings').select('access_code').eq('id',1).maybeSingle();if(error)throw error;e.value=data?.access_code||'1234';m.textContent=data?'':'Run the included supabase-hpt-v21-access-code.sql migration once to enable persistent access-code changes.';m.className='message '+(data?'good':'bad')}catch(err){e.value='1234';m.textContent='Access-code settings are not configured yet. Run supabase-hpt-v21-access-code.sql in Supabase.';m.className='message bad'}}
async function saveAccessCode(){const e=$('adminAccessCode'),m=$('accessCodeMsg');const code=e.value.trim();if(!code){m.textContent='Enter an access code.';m.className='message bad';return}if(code.length<4){m.textContent='Access code must be at least 4 characters.';m.className='message bad';return}const a=await guard();if(!a)return;$('saveAccessCode').disabled=true;$('saveAccessCode').textContent='SAVING…';try{const {error}=await sb.from('hpt_settings').update({access_code:code,updated_at:new Date().toISOString()}).eq('id',1);if(error)throw error;m.textContent='✓ Candidate access code updated.';m.className='message good';notice('Candidate HPT access code updated.')}catch(err){m.textContent=err.message||'Could not update access code.';m.className='message bad';notice(err.message||'Could not update access code.',true)}finally{$('saveAccessCode').disabled=false;$('saveAccessCode').textContent='SAVE ACCESS CODE'}}
async function loadResults(){
  const all=[];const pageSize=1000;let includeLearnerScore=true;
  for(let from=0;;from+=pageSize){
    let query=sb.from('hpt_attempts').select(includeLearnerScore
      ? 'id,candidate_name,phone,started_at,completed_at,total_score,passed,clip_order,school_id,learner_score'
      : 'id,candidate_name,phone,started_at,completed_at,total_score,passed,clip_order,school_id');
    let response=await query.order('started_at',{ascending:false}).range(from,from+pageSize-1);
    if(response.error&&includeLearnerScore&&/learner_score|column .* does not exist|schema cache/i.test(response.error.message||'')){
      includeLearnerScore=false;
      response=await sb.from('hpt_attempts').select('id,candidate_name,phone,started_at,completed_at,total_score,passed,clip_order,school_id').order('started_at',{ascending:false}).range(from,from+pageSize-1);
    }
    const {data,error}=response;
    if(error){notice(error.message,true);return}
    all.push(...(data||[]).map(row=>({...row,learner_score:row.learner_score==null?null:Number(row.learner_score)})));if(!data||data.length<pageSize)break;
  }
  const {data:schoolRows,error:schoolError}=await sb.from('hpt_schools')
    .select('id,school_name,contact_number,location,logo_url,brand_color,dark_color,active').order('school_name');
  schoolDirectory=schoolRows||[];
  const schoolById=new Map(schoolDirectory.map(s=>[s.id,s]));
  results=all.map(r=>({...r,hpt_schools:schoolById.get(r.school_id)||null}));
  populateSchoolFilter();
  if(schoolError)notice(`Results loaded, but school details could not be loaded: ${schoolError.message}`,true);
  if(selectedResultsSchoolId && schoolDirectory.some(s=>String(s.id)===String(selectedResultsSchoolId))){
    openSchoolResults(selectedResultsSchoolId);
  }else{
    selectedResultsSchoolId=null;
    renderSchoolOverview();
  }
}
function resultStudentKey(r){
  const phone=String(r.phone||'').replace(/\D/g,'');
  return phone||String(r.candidate_name||'').trim().toLowerCase()||String(r.id);
}
function schoolResultSummary(schoolId){
  const rows=results.filter(r=>String(r.school_id||'')===String(schoolId));
  const students=new Set(rows.map(resultStudentKey));
  const passed=rows.filter(isPassed).length;
  return {rows,students:students.size,attempts:rows.length,passed,failed:rows.length-passed};
}
function renderSchoolOverview(){
  selectedResultsSchoolId=null;
  const directory=$('schoolResultsDirectory'),detail=$('schoolResultsDetail');
  if(directory)directory.hidden=false;
  if(detail)detail.hidden=true;
  if($('backSchoolOverview'))$('backSchoolOverview').hidden=true;
  if($('exportStudentPdf'))$('exportStudentPdf').hidden=true;
  if($('resultsHeading'))$('resultsHeading').textContent='School Performance Overview';
  if($('resultsDescription'))$('resultsDescription').textContent='Each card shows lifetime totals. Open a school to see its students and examination records.';
  const cards=schoolDirectory.map(s=>{
    const sum=schoolResultSummary(s.id);
    return `<article class="schoolResultCard">
      <div class="schoolResultCardHead">
        <div class="schoolResultAvatar">${s.logo_url?`<img src="${esc(s.logo_url)}" alt="">`:`<span>${esc(String(s.school_name||'S').trim().slice(0,1).toUpperCase())}</span>`}</div>
        <div class="schoolResultName"><h3>${esc(s.school_name)}</h3><p>${esc(s.location||'Location not set')}</p></div>
        <span class="schoolResultStatus ${s.active?'on':'off'}">${s.active?'ACTIVE':'DISABLED'}</span>
      </div>
      <div class="schoolResultMetrics">
        <div><strong>${sum.students.toLocaleString('en-IN')}</strong><small>STUDENTS</small></div>
        <div><strong>${sum.attempts.toLocaleString('en-IN')}</strong><small>ATTEMPTS</small></div>
        <div class="good"><strong>${sum.passed.toLocaleString('en-IN')}</strong><small>PASSED</small></div>
        <div class="bad"><strong>${sum.failed.toLocaleString('en-IN')}</strong><small>FAILED</small></div>
      </div>
      <button class="btn schoolResultOpen" type="button" data-open-school-results="${esc(s.id)}">VIEW STUDENTS & RESULTS <span>→</span></button>
    </article>`;
  }).join('');
  const legacy=results.filter(r=>!r.school_id);
  const legacyCard=legacy.length?(()=>{
    const students=new Set(legacy.map(resultStudentKey)),passed=legacy.filter(isPassed).length;
    return `<article class="schoolResultCard legacy">
      <div class="schoolResultCardHead"><div class="schoolResultAvatar">L</div><div class="schoolResultName"><h3>Legacy / Unassigned</h3><p>Records created before multi-school assignment</p></div><span class="schoolResultStatus off">LEGACY</span></div>
      <div class="schoolResultMetrics"><div><strong>${students.size}</strong><small>STUDENTS</small></div><div><strong>${legacy.length}</strong><small>ATTEMPTS</small></div><div class="good"><strong>${passed}</strong><small>PASSED</small></div><div class="bad"><strong>${legacy.length-passed}</strong><small>FAILED</small></div></div>
      <button class="btn schoolResultOpen" type="button" data-open-school-results="legacy">VIEW STUDENTS & RESULTS <span>→</span></button>
    </article>`;
  })():'';
  if(directory){
    directory.innerHTML=(cards+legacyCard)||'<div class="empty">No registered schools found. Add schools from the Driving Schools tab.</div>';
    directory.querySelectorAll('[data-open-school-results]').forEach(b=>b.onclick=()=>openSchoolResults(b.dataset.openSchoolResults));
  }
}
function openSchoolResults(id){
  selectedResultsSchoolId=String(id);
  const school=id==='legacy'?null:schoolDirectory.find(s=>String(s.id)===String(id));
  if(id!=='legacy'&&!school){notice('The selected school could not be found.',true);renderSchoolOverview();return}
  const directory=$('schoolResultsDirectory'),detail=$('schoolResultsDetail');
  if(directory)directory.hidden=true;
  if(detail)detail.hidden=false;
  if($('backSchoolOverview'))$('backSchoolOverview').hidden=false;
  if($('exportStudentPdf'))$('exportStudentPdf').hidden=false;
  if($('resultsHeading'))$('resultsHeading').textContent=school?`${school.school_name} — Students & Results`:'Legacy / Unassigned — Students & Results';
  if($('resultsDescription'))$('resultsDescription').textContent='This view contains only the selected school’s student records, attempts, reports and certificate actions.';
  const select=$('schoolResultsFilter');
  if(select){select.value=id==='legacy'?'legacy':String(id);select.disabled=true}
  renderResults();
}
function closeSchoolResults(){
  selectedResultsSchoolId=null;
  if($('schoolResultsFilter')){$('schoolResultsFilter').disabled=false;$('schoolResultsFilter').value='all'}
  if($('searchResults'))$('searchResults').value='';
  if($('resultFilter'))$('resultFilter').value='all';
  if($('resultPeriod'))$('resultPeriod').value='all';
  renderSchoolOverview();
}
function populateSchoolFilter(){
  const el=$('schoolResultsFilter');if(!el)return;
  const prior=el.value||'all';
  el.innerHTML='<option value="all">All schools</option><option value="legacy">Legacy / unassigned</option>'+schoolDirectory.map(s=>`<option value="${esc(s.id)}">${esc(s.school_name)}</option>`).join('');
  if([...el.options].some(o=>o.value===prior))el.value=prior;
}
function isPassed(r){return r.passed===true||Number(r.total_score||0)>=60}
function periodStart(period){
  const now=new Date();const d=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  if(period==='week'){const day=(d.getDay()+6)%7;d.setDate(d.getDate()-day);return d}
  if(period==='month')return new Date(now.getFullYear(),now.getMonth(),1);
  if(period==='last_month')return new Date(now.getFullYear(),now.getMonth()-1,1);
  if(period==='30d'){d.setDate(d.getDate()-29);return d}
  return null;
}
function periodEnd(period){const now=new Date();if(period==='last_month')return new Date(now.getFullYear(),now.getMonth(),1);return new Date(now.getFullYear(),now.getMonth(),now.getDate()+1)}
function filteredResults(){
  const q=$('searchResults')?.value.trim().toLowerCase()||'',f=$('resultFilter')?.value||'all',sid=selectedResultsSchoolId||$('schoolResultsFilter')?.value||'all',period=$('resultPeriod')?.value||'all';
  const start=periodStart(period),end=periodEnd(period);
  return results.filter(r=>{
    if(q&&!`${r.candidate_name} ${r.phone}`.toLowerCase().includes(q))return false;
    if(sid==='legacy'&&r.school_id)return false;if(sid!=='all'&&sid!=='legacy'&&String(r.school_id||'')!==sid)return false;
    if(f==='pass'&&!isPassed(r))return false;if(f==='fail'&&isPassed(r))return false;
    const dt=new Date(r.completed_at||r.started_at);
    if(start&&dt<start)return false;if(period!=='all'&&dt>=end)return false;
    return true;
  });
}
function renderResults(){
  const rows=filteredResults();
  $('resultsBody').innerHTML=rows.map(r=>`<tr><td>${new Date(r.started_at).toLocaleString('en-IN')}</td><td>${esc(r.hpt_schools?.school_name||'Legacy / unknown')}</td><td><b>${esc(r.candidate_name)}</b></td><td>${esc(r.phone)}</td><td class="score">${Number(r.total_score||0)} / 100</td><td class="learner-score-cell">${r.learner_score==null?'—':`${Number(r.learner_score)} / 30`}</td><td class="${isPassed(r)?'pass':'fail'}">${isPassed(r)?'PASS':'NOT PASSED'}</td><td><button class="small" data-view="${r.id}">VIEW</button><button class="small report-btn" title="Download complete HPT analysis" data-report="${r.id}">REPORT</button>${isPassed(r)?`<button class="small certificate-btn" title="Download HPT certificate" data-certificate="${r.id}">PRINT</button>`:''}<button class="small danger-outline" data-del-attempt="${r.id}">DELETE</button></td></tr>`).join('')||'<tr><td colspan="8" class="empty">No examination results found for the selected school and period.</td></tr>';
  const mr=$('mobileResults');
  if(mr)mr.innerHTML=rows.map(r=>`<article class="result-card"><div class="rc-head"><div><small>DATE</small><b>${new Date(r.started_at).toLocaleDateString('en-IN')}</b></div><span class="${isPassed(r)?'pass':'fail'}">${isPassed(r)?'PASS':'NOT PASSED'}</span></div><h3>${esc(r.candidate_name)}</h3><div class="rc-grid"><div><small>SCHOOL</small><b>${esc(r.hpt_schools?.school_name||'Legacy / unknown')}</b></div><div><small>PHONE</small><b>${esc(r.phone)}</b></div><div><small>HPT SCORE</small><b>${Number(r.total_score||0)} / 100</b></div><div><small>LEARNER SCORE</small><b>${r.learner_score==null?'—':`${Number(r.learner_score)} / 30`}</b></div></div><div class="rc-actions"><button class="small" data-view="${r.id}">VIEW</button><button class="small report-btn" data-report="${r.id}">REPORT</button>${isPassed(r)?`<button class="small certificate-btn" data-certificate="${r.id}">PRINT</button>`:''}<button class="small danger-outline" data-del-attempt="${r.id}">DELETE</button></div></article>`).join('')||'<div class="empty">No examination results found.</div>';
  document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>showDetail(b.dataset.view));
  document.querySelectorAll('[data-report]').forEach(b=>b.onclick=()=>downloadReport(b.dataset.report));
  document.querySelectorAll('[data-certificate]').forEach(b=>b.onclick=()=>downloadCertificate(b.dataset.certificate));
  document.querySelectorAll('[data-del-attempt]').forEach(b=>b.onclick=()=>deleteAttempt(b.dataset.delAttempt));
  const count=$('resultsScopeCount');if(count)count.textContent=`${rows.length} attempts in current view`;updateStats();
}
function pdfSafeFilePart(value){
  return String(value||'school').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60)||'school';
}
function pdfFmtDate(value,withTime=true){
  if(!value)return '—';
  const d=new Date(value);if(Number.isNaN(d.getTime()))return '—';
  return d.toLocaleString('en-IN',withTime?{dateStyle:'medium',timeStyle:'short'}:{dateStyle:'medium'});
}
function pdfSelectedSchool(){
  if(selectedResultsSchoolId==='legacy')return {school_name:'Legacy / Unassigned',logo_url:null};
  return schoolDirectory.find(s=>String(s.id)===String(selectedResultsSchoolId))||null;
}
function pdfLoadImage(url){
  return new Promise(resolve=>{
    if(!url){resolve(null);return}
    const img=new Image();
    img.crossOrigin='anonymous';
    img.onload=()=>{
      try{
        const canvas=document.createElement('canvas');
        canvas.width=img.naturalWidth||img.width;canvas.height=img.naturalHeight||img.height;
        const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0);
        resolve({data:canvas.toDataURL('image/png'),format:'PNG'});
      }catch{resolve(null)}
    };
    img.onerror=()=>resolve(null);
    img.src=url;
  });
}
function pdfMake(){
  const JsPdf=window.jspdf?.jsPDF;
  if(!JsPdf){notice('PDF generator is not available. Refresh the admin page and try again.',true);return null}
  return new JsPdf({orientation:'landscape',unit:'mm',format:'a4',compress:true});
}
async function pdfBrandHeader(doc,title,subtitle,school){
  const W=doc.internal.pageSize.getWidth();
  doc.setFillColor(5,15,24);doc.rect(0,0,W,42,'F');
  doc.setFillColor(255,196,0);doc.rect(0,41,W,1.4,'F');
  const logo=await pdfLoadImage(school?.logo_url);
  if(logo){
    try{doc.addImage(logo.data,logo.format,13,8,25,25,undefined,'FAST')}catch{}
  }else{
    doc.setFillColor(255,196,0);doc.roundedRect(13,9,25,23,3,3,'F');
    doc.setTextColor(6,17,25);doc.setFont('helvetica','bold');doc.setFontSize(15);doc.text('HPT',25.5,23.5,{align:'center'});
  }
  const x=46;
  doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(16);
  doc.text(String(school?.school_name||'HAZARD PERCEPTION TEST').toUpperCase().slice(0,70),x,15);
  doc.setTextColor(255,199,35);doc.setFontSize(8);doc.text('HAZARD PERCEPTION TEST  •  SCHOOL PERFORMANCE REPORT',x,22);
  doc.setTextColor(235,241,246);doc.setFontSize(13);doc.text(title,x,32);
  doc.setTextColor(182,198,210);doc.setFont('helvetica','normal');doc.setFontSize(8);doc.text(subtitle||'',x+Math.min(150,doc.getTextWidth(title)+6),32);
  doc.setTextColor(135,155,170);doc.setFontSize(7);doc.text(`Generated ${new Date().toLocaleString('en-IN')}`,W-13,36,{align:'right'});
}
function pdfKpiCards(doc,items,y=50){
  const W=doc.internal.pageSize.getWidth(),margin=13,gap=5,totalW=W-margin*2,cardW=(totalW-gap*(items.length-1))/items.length;
  items.forEach((it,i)=>{
    const x=margin+i*(cardW+gap);
    doc.setFillColor(239,244,247);doc.setDrawColor(220,228,234);doc.roundedRect(x,y,cardW,20,2.5,2.5,'FD');
    doc.setTextColor(91,111,126);doc.setFont('helvetica','bold');doc.setFontSize(6.6);doc.text(String(it.label).toUpperCase(),x+4,y+6);
    doc.setTextColor(13,31,45);doc.setFont('helvetica','bold');doc.setFontSize(14);doc.text(String(it.value),x+4,y+15.5);
  });
}
function pdfFooter(doc,pageNo,totalPages){
  const W=doc.internal.pageSize.getWidth(),H=doc.internal.pageSize.getHeight();
  doc.setDrawColor(221,228,233);doc.line(13,H-11,W-13,H-11);
  doc.setTextColor(111,128,141);doc.setFont('helvetica','normal');doc.setFontSize(7);
  doc.text('Confidential school performance record • Generated by Hazard Perception Test',13,H-6);
  doc.text(`Page ${pageNo} of ${totalPages}`,W-13,H-6,{align:'right'});
}
function pdfDrawTableHeader(doc,columns,y){
  doc.setFillColor(12,37,53);doc.rect(13,y,doc.internal.pageSize.getWidth()-26,9,'F');
  let x=16;doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(7);
  columns.forEach(col=>{doc.text(col.label,x,y+6);x+=col.width});
  return y+9;
}
function pdfTextCell(doc,text,x,y,width,fontSize=7,color=[36,52,65],maxLines=2){
  doc.setTextColor(...color);doc.setFont('helvetica','normal');doc.setFontSize(fontSize);
  const lines=doc.splitTextToSize(String(text??'—'),Math.max(8,width-3)).slice(0,maxLines);
  doc.text(lines,x,y+4);
}
async function exportStudentPdf(){
  const rows=filteredResults();
  if(!rows.length){notice('There are no student records in the current view to export.',true);return}
  const school=pdfSelectedSchool(),doc=pdfMake();if(!doc)return;
  const schoolName=school?.school_name||'All Schools';
  const passed=rows.filter(isPassed).length,failed=rows.length-passed;
  const avg=rows.reduce((sum,r)=>sum+(Number(r.total_score)||0),0)/rows.length;
  await pdfBrandHeader(doc,'Student Examination Records',`${rows.length} records • Current filters applied`,school);
  pdfKpiCards(doc,[
    {label:'Completed attempts',value:rows.length},
    {label:'Passed',value:passed},
    {label:'Failed',value:failed},
    {label:'Average score',value:`${avg.toFixed(1)} / 100`}
  ],49);
  doc.setTextColor(52,72,86);doc.setFont('helvetica','bold');doc.setFontSize(8);
  doc.text(`School: ${schoolName}`,13,76);
  doc.setFont('helvetica','normal');doc.setTextColor(105,121,134);
  doc.text(`Date filter: ${$('resultPeriod')?.selectedOptions?.[0]?.textContent||'All dates'}   •   Result filter: ${$('resultFilter')?.selectedOptions?.[0]?.textContent||'All results'}`,13,81);
  const cols=[
    {label:'DATE / TIME',width:40},
    {label:'CANDIDATE NAME',width:58},
    {label:'MOBILE NUMBER',width:40},
    {label:'SCORE',width:25},
    {label:'RESULT',width:30}
  ];
  let y=pdfDrawTableHeader(doc,cols,87);
  for(let i=0;i<rows.length;i++){
    const r=rows[i],height=12;
    if(y+height>doc.internal.pageSize.getHeight()-17){
      doc.addPage();
      await pdfBrandHeader(doc,'Student Examination Records — continued',schoolName,school);
      y=pdfDrawTableHeader(doc,cols,49);
    }
    if(i%2===0){doc.setFillColor(244,247,249);doc.rect(13,y,doc.internal.pageSize.getWidth()-26,height,'F')}
    let x=16;
    pdfTextCell(doc,pdfFmtDate(r.completed_at||r.started_at),x,y,cols[0].width,6.5);x+=cols[0].width;
    pdfTextCell(doc,r.candidate_name,x,y,cols[1].width,7);x+=cols[1].width;
    pdfTextCell(doc,r.phone,x,y,cols[2].width,7);x+=cols[2].width;
    doc.setFont('helvetica','bold');doc.setFontSize(8);doc.setTextColor(17,39,55);doc.text(`${Number(r.total_score)||0} / 100`,x,y+7);x+=cols[3].width;
    const good=isPassed(r);doc.setFont('helvetica','bold');doc.setFontSize(7);doc.setTextColor(...(good?[19,139,86]:[207,62,78]));doc.text(good?'PASSED':'NOT PASSED',x,y+7);
    doc.setDrawColor(229,234,238);doc.line(13,y+height,doc.internal.pageSize.getWidth()-13,y+height);
    y+=height;
  }
  const total=doc.getNumberOfPages();
  for(let p=1;p<=total;p++){doc.setPage(p);pdfFooter(doc,p,total)}
  doc.save(`HPT-student-records-${pdfSafeFilePart(schoolName)}.pdf`);
  notice('Student examination PDF downloaded.');
}
function buildPerformanceGroups(rows,grain){
  const groups=new Map();
  rows.forEach(r=>{
    const d=new Date(r.completed_at||r.started_at);if(Number.isNaN(d.getTime()))return;
    let key,label;
    if(grain==='month'){key=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;label=d.toLocaleDateString('en-IN',{month:'long',year:'numeric'});}
    else {const monday=new Date(d.getFullYear(),d.getMonth(),d.getDate());monday.setDate(monday.getDate()-((monday.getDay()+6)%7));key=`${monday.getFullYear()}-${String(monday.getMonth()+1).padStart(2,'0')}-${String(monday.getDate()).padStart(2,'0')}`;label=`Week of ${monday.toLocaleDateString('en-IN')}`;}
    if(!groups.has(key))groups.set(key,{label,rows:[]});groups.get(key).rows.push(r);
  });
  return [...groups.entries()].sort((a,b)=>a[0].localeCompare(b[0])).map(([,g])=>{
    const rs=g.rows,passed=rs.filter(isPassed).length,unique=new Set(rs.map(r=>String(r.phone||r.candidate_name).replace(/\D/g,'')||String(r.candidate_name||'').toLowerCase()));
    const scores=rs.map(r=>Number(r.total_score)||0);
    return {label:g.label,attempts:rs.length,students:unique.size,passed,failed:rs.length-passed,rate:rs.length?passed/rs.length*100:0,average:scores.length?scores.reduce((x,y)=>x+y,0)/scores.length:0,highest:Math.max(0,...scores)};
  });
}
async function exportPerformancePdf(){
  const rows=filteredResults();if(!rows.length){notice('There are no records in the current view to report.',true);return}
  const grain=$('reportGranularity')?.value||'week',groups=buildPerformanceGroups(rows,grain);
  const school=pdfSelectedSchool(),doc=pdfMake();if(!doc)return;
  const schoolName=school?.school_name||'All Schools',passed=rows.filter(isPassed).length,failed=rows.length-passed;
  const average=rows.reduce((sum,r)=>sum+(Number(r.total_score)||0),0)/rows.length;
  await pdfBrandHeader(doc,`${grain==='month'?'Monthly':'Weekly'} Performance Report`,`${groups.length} reporting periods`,school);
  pdfKpiCards(doc,[
    {label:'Total attempts',value:rows.length},
    {label:'Unique students',value:new Set(rows.map(resultStudentKey)).size},
    {label:'Pass rate',value:`${(passed/rows.length*100).toFixed(1)}%`},
    {label:'Average score',value:`${average.toFixed(1)} / 100`}
  ],49);
  doc.setTextColor(52,72,86);doc.setFont('helvetica','bold');doc.setFontSize(8);
  doc.text(`School: ${schoolName}`,13,76);
  doc.setFont('helvetica','normal');doc.setTextColor(105,121,134);doc.setFontSize(7);
  doc.text(`Reporting: ${grain==='month'?'Calendar month':'Monday-start week'} • Based on the filters selected in the manager`,13,81);

  // Simple in-document chart: attempts per reporting period with passed portion highlighted.
  const chartX=13,chartY=91,chartW=doc.internal.pageSize.getWidth()-26,chartH=42;
  doc.setFillColor(243,247,249);doc.roundedRect(chartX,chartY,chartW,chartH,2,2,'F');
  doc.setTextColor(67,88,103);doc.setFont('helvetica','bold');doc.setFontSize(7);doc.text('ATTEMPTS BY PERIOD  •  GREEN = PASSED',chartX+5,chartY+7);
  const maxAttempts=Math.max(1,...groups.map(g=>g.attempts)),barMax=chartH-17;
  const shown=groups.slice(-Math.min(12,groups.length)),slotW=(chartW-12)/Math.max(1,shown.length),barW=Math.max(4,Math.min(13,slotW*.5));
  shown.forEach((g,i)=>{
    const x=chartX+7+i*slotW+(slotW-barW)/2,allH=(g.attempts/maxAttempts)*barMax,passH=(g.passed/maxAttempts)*barMax;
    doc.setFillColor(215,224,230);doc.rect(x,chartY+chartH-5-allH,barW,allH,'F');
    doc.setFillColor(31,166,111);doc.rect(x,chartY+chartH-5-passH,barW,passH,'F');
  });

  const cols=[
    {label:'PERIOD',width:48},{label:'ATTEMPTS',width:27},{label:'STUDENTS',width:27},
    {label:'PASSED',width:24},{label:'FAILED',width:24},{label:'PASS RATE',width:28},
    {label:'AVG SCORE',width:31},{label:'HIGHEST',width:27}
  ];
  let y=pdfDrawTableHeader(doc,cols,140);
  for(let i=0;i<groups.length;i++){
    const g=groups[i];
    if(y+11>doc.internal.pageSize.getHeight()-17){
      doc.addPage();
      await pdfBrandHeader(doc,'Performance Report — continued',schoolName,school);
      y=pdfDrawTableHeader(doc,cols,49);
    }
    if(i%2===0){doc.setFillColor(244,247,249);doc.rect(13,y,doc.internal.pageSize.getWidth()-26,11,'F')}
    const vals=[g.label,g.attempts,g.students,g.passed,g.failed,`${g.rate.toFixed(1)}%`,g.average.toFixed(1),g.highest];
    let x=16;vals.forEach((v,j)=>{pdfTextCell(doc,v,x,y,cols[j].width,6.8,[36,52,65],1);x+=cols[j].width});
    doc.setDrawColor(229,234,238);doc.line(13,y+11,doc.internal.pageSize.getWidth()-13,y+11);y+=11;
  }
  const total=doc.getNumberOfPages();
  for(let p=1;p<=total;p++){doc.setPage(p);pdfFooter(doc,p,total)}
  doc.save(`HPT-${grain}-performance-${pdfSafeFilePart(schoolName)}.pdf`);
  notice('Performance report PDF downloaded.');
}
async function deleteAttempt(id){const r=results.find(x=>x.id===id);if(!r||!confirm(`Delete the complete examination record for ${r.candidate_name}? This cannot be undone.`))return;const {error}=await sb.from('hpt_responses').delete().eq('attempt_id',id);if(error){notice(error.message,true);return}const {error:e2}=await sb.from('hpt_attempts').delete().eq('id',id);if(e2){notice(e2.message,true);return}await loadResults();updateStats();notice('Examination record deleted.')}
async function showDetail(id){if(!(await guard()))return;const r=results.find(x=>x.id===id);if(!r)return;const {data:rs,error}=await sb.from('hpt_responses').select('response_no,click_time_seconds,hazard_no,awarded_marks,video_id').eq('attempt_id',id).order('response_no');if(error){notice(error.message,true);return}$('detailTitle').textContent=r.candidate_name;$('detailMeta').textContent=`${r.hpt_schools?.school_name||'Legacy / unknown'} • ${r.phone} • ${new Date(r.started_at).toLocaleString('en-IN')} • ${isPassed(r)?'PASS':'NOT PASSED'} • ${r.total_score}/100`;$('detailBody').innerHTML=`<div class="detail-clip"><span>Responses</span><b>${rs?.length||0}</b></div><div class="detail-clip"><span>Randomized order</span><b>${(r.clip_order||[]).map(esc).join(' → ')||'—'}</b></div>`+(rs||[]).map(x=>`<div class="detail-clip"><span>Response ${x.response_no} • ${Number(x.click_time_seconds).toFixed(1)}s • Hazard ${x.hazard_no||'—'}</span><b>+${x.awarded_marks}</b></div>`).join('');$('detailModal').hidden=false}
function updateStats(){const scoped=typeof filteredResults==='function'?filteredResults():results;const passed=scoped.filter(isPassed).length,avg=scoped.length?Math.round(scoped.reduce((a,r)=>a+Number(r.total_score||0),0)/scoped.length):0,ready=videos.filter(v=>v.active&&v.hazard_count>=1).length;$('statAttempts').textContent=scoped.length;$('statPassed').textContent=passed;$('statAverage').textContent=avg;$('statVideos').textContent=ready}
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
const school=r.hpt_schools||{};const logoPath=school.logo_url||'school-placeholder.svg';let logo=null;try{logo=await imageData(logoPath)}catch{}if(logo){const lw=43,lh=33.2;doc.addImage(logo,'PNG',(W-lw)/2,17,lw,lh);}
const schoolName=String(school.school_name||'Driving School').toUpperCase();const schoolLocation=school.location||'';doc.setTextColor(33,53,72);doc.setFont('helvetica','bold');doc.setFontSize(10);doc.text(schoolName,W/2,57,{align:'center',maxWidth:230});doc.setTextColor(184,132,12);doc.setFontSize(25);doc.text('CERTIFICATE OF HAZARD PERCEPTION',W/2,73,{align:'center'});doc.setDrawColor(212,162,32);doc.setLineWidth(.7);doc.line(82,79,215,79);
doc.setTextColor(92,105,116);doc.setFont('helvetica','normal');doc.setFontSize(13);doc.text('This certificate is awarded to',W/2,94,{align:'center'});doc.setTextColor(25,38,51);doc.setFont('helvetica','bold');doc.setFontSize(27);doc.text(String(r.candidate_name||'Candidate'),W/2,112,{align:'center'});doc.setDrawColor(180,188,195);doc.setLineWidth(.35);doc.line(70,118,227,118);doc.setTextColor(92,105,116);doc.setFont('helvetica','normal');doc.setFontSize(12);doc.text('for successfully completing the '+(school.school_name||'Driving School')+' Hazard Perception Test',W/2,131,{align:'center',maxWidth:230});doc.setTextColor(33,53,72);doc.setFont('helvetica','bold');doc.setFontSize(19);doc.text(`SCORE: ${Number(r.total_score||0)} / 100`,W/2,149,{align:'center'});doc.setTextColor(35,126,78);doc.setFontSize(16);doc.text('PASS',W/2,160,{align:'center'});const d=new Date(r.completed_at||r.started_at);doc.setTextColor(92,105,116);doc.setFont('helvetica','normal');doc.setFontSize(9.5);doc.text(`Date: ${d.toLocaleDateString('en-IN')}`,45,181);doc.text(`Certificate No: HPT-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}-${String(r.id).slice(0,8).toUpperCase()}`,W-45,181,{align:'right'});doc.setTextColor(33,53,72);doc.setFont('helvetica','bold');doc.setFontSize(9.5);doc.text([schoolName,schoolLocation,school.contact_number].filter(Boolean).join(' • ').slice(0,120),W/2,191,{align:'center',maxWidth:250});doc.save(`${String(school.school_name||'Driving-School').replace(/[^a-z0-9]+/gi,'-')}-HPT-Certificate-${String(r.candidate_name||'Candidate').replace(/[^a-z0-9]+/gi,'-')}.pdf`);notice(`Certificate downloaded for ${r.candidate_name}.`)}catch(e){console.error(e);notice('Could not generate the certificate.',true)}finally{if(btn){btn.disabled=false;btn.textContent='PRINT'}}}

function openRequestedAdminTab(){const requested=new URLSearchParams(window.location.search).get('tab');if(requested)document.querySelectorAll('.tab').forEach(t=>{if(t.dataset.tab===requested)t.click()})}
$('loginBtn').onclick=login;$('password').onkeydown=e=>{if(e.key==='Enter')login()};$('saveAccessCode').onclick=saveAccessCode;$('logoutBtn').onclick=async()=>{await sb.auth.signOut();location.reload()};$('refreshAll').onclick=refreshAll;$('searchResults').oninput=renderResults;$('resultFilter').onchange=renderResults;$('schoolResultsFilter').onchange=renderResults;$('resultPeriod').onchange=renderResults;$('exportStudentPdf').onclick=exportStudentPdf;$('exportPerformancePdf').onclick=exportPerformancePdf;$('backSchoolOverview').onclick=closeSchoolResults;window.addEventListener('hpt:filter-school',e=>{const id=e.detail?.schoolId;if(id){document.querySelector('.tab[data-tab=results]')?.click();openSchoolResults(id);}});$('newVideo').onclick=newVideo;$('closeEditor').onclick=closeEditor;$('saveVideo').onclick=saveVideo;$('deleteVideo').onclick=deleteVideo;$('mark1').onclick=()=>setHaz(1);$('mark2').onclick=()=>{if($('hasHazard2').checked)setHaz(2)};$('hasHazard2').onchange=()=>{const on=$('hasHazard2').checked;$('hazard2Block').hidden=!on;$('marker2').hidden=!on;$('mark2').hidden=!on;if(!on){$('h2t').value='';$('h2label').value='';}updateHazardPreviews();};$('annotationTrack').onclick=e=>{const r=$('annotationTrack').getBoundingClientRect();$('preview').currentTime=Math.max(0,Math.min(1,(e.clientX-r.left)/r.width))*(Number($('preview').duration)||50);setMarkers()};for(const n of [1,2])$(`marker${n}`).onclick=e=>{e.stopPropagation();$('preview').currentTime=Number($(`h${n}t`).value)||0};$('preview').ontimeupdate=()=>{$('now').textContent=fmt($('preview').currentTime);$('dur').textContent=fmt($('preview').duration);setMarkers()};$('preview').onloadedmetadata=()=>{$('previewEmpty').hidden=true;$('dur').textContent=fmt($('preview').duration);setMarkers()};$('preview').onerror=()=>{$('previewEmpty').hidden=false;$('previewEmpty').textContent='Video could not be loaded. If this is an existing clip, verify its published path.'};$('videoFile').onchange=()=>{clearLocal();localFile=$('videoFile').files[0]||null;if(localFile){$('fileName').textContent=localFile.name;localUrl=URL.createObjectURL(localFile);$('preview').src=localUrl;$('previewEmpty').hidden=true;$('videoTitle').value=$('videoTitle').value||localFile.name.replace(/\.[^.]+$/,'').replace(/[_-]+/g,' ');$('preview').load()}};$('closeModal').onclick=()=>$('detailModal').hidden=true;$('detailModal').onclick=e=>{if(e.target===$('detailModal'))$('detailModal').hidden=true};document.querySelectorAll('.tab').forEach(t=>t.onclick=()=>{document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));t.classList.add('active');const tab=t.dataset.tab;$('resultsPanel').hidden=tab!=='results';$('videosPanel').hidden=tab!=='videos';if($('schoolsPanel'))$('schoolsPanel').hidden=tab!=='schools';$('editor').hidden=true;if(tab==='schools'&&window.HPTSchoolManager)window.HPTSchoolManager.refresh()});
let resultsPoll=null;
function startResultsPolling(){clearInterval(resultsPoll);resultsPoll=setInterval(async()=>{if(document.hidden||$('dashboard').hidden)return;try{await loadResults();updateStats()}catch(e){console.error('HPT results refresh failed',e)}},5000)}
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!$('dashboard').hidden)loadResults()});
(async()=>{const a=await guard();if(a){showDash(a.admin);await refreshAll();startResultsPolling();openRequestedAdminTab()}})();
})();
