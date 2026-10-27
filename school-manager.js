/* Multi-school registry for the authenticated HPT manager. */
(()=>{
  'use strict';
  const C=window.RAJU_HPT_CONFIG;
  if(!window.supabase?.createClient||!C)return;
  const sb=window.supabase.createClient(C.supabaseUrl,C.supabaseAnonKey);
  const $=id=>document.getElementById(id);
  const el=$('schoolsPanel');
  if(!el)return;
  let schools=[],previewUrl=null,refreshing=false;
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function msg(text,kind='good'){$('schoolFormMsg').textContent=text;$('schoolFormMsg').className='message '+(kind==='bad'?'schoolMsgError':'schoolMsgGood')}
  function adminNotice(text,bad=false){const n=$('notice');if(n){n.hidden=false;n.textContent=text;n.className='notice '+(bad?'bad':'good');clearTimeout(n._t);n._t=setTimeout(()=>n.hidden=true,5000)}}
  async function isAdmin(){
    try{const {data:{session}}=await sb.auth.getSession();if(!session)return false;const {data,error}=await sb.from('admin_users').select('id').eq('id',session.user.id).eq('active',true).maybeSingle();return !error&&!!data}catch{return false}
  }
  function clearPreview(){if(previewUrl){URL.revokeObjectURL(previewUrl);previewUrl=null}}
  function setPreview(url,name='Current logo'){
    const wrap=$('schoolLogoPreviewWrap'),img=$('schoolLogoPreview');
    if(!url){wrap.hidden=true;img.removeAttribute('src');$('schoolLogoPreviewName').textContent='';return}
    img.src=url;$('schoolLogoPreviewName').textContent=name;wrap.hidden=false;
  }
  function resetForm(){
    $('schoolForm').reset();$('schoolEditId').value='';$('schoolBrandColor').value='#ffc400';$('schoolDarkColor').value='#0b1b29';$('schoolActiveInput').checked=true;
    $('schoolFormEyebrow').textContent='NEW SCHOOL';$('schoolFormTitle').textContent='Add a Driving School';$('saveSchoolBtn').textContent='＋ ADD SCHOOL';$('cancelSchoolEdit').hidden=true;
    $('schoolLogoFile').value='';clearPreview();setPreview('');msg('Add the school details and create a unique access code.');
  }
  function render(){
    $('schoolCount').textContent=String(schools.length);
    $('schoolList').innerHTML=schools.map(s=>`<article class="schoolItem">
      <div class="schoolItemLogo">${s.logo_url?`<img src="${esc(s.logo_url)}" alt="">`:esc(String(s.school_name||'S').trim().slice(0,1).toUpperCase())}</div>
      <div class="schoolItemInfo"><h4>${esc(s.school_name)} <span class="schoolStatus ${s.active?'on':'off'}">● ${s.active?'ACTIVE':'DISABLED'}</span></h4>
      <p>${esc(s.location||'Location not set')} · ${esc(s.contact_number||'No contact')}</p>
      <p>ACCESS CODE <span class="schoolCodeChip">${esc(s.access_code)}</span></p></div>
      <div class="schoolItemActions"><button type="button" class="small" data-school-results="${esc(s.id)}">VIEW STUDENTS</button><button type="button" class="small" data-school-edit="${esc(s.id)}">EDIT</button><button type="button" class="small ${s.active?'danger-outline':''}" data-school-toggle="${esc(s.id)}">${s.active?'DISABLE':'ENABLE'}</button></div>
    </article>`).join('')||'<div class="empty">No schools registered yet. Add the first school using the form.</div>';
    document.querySelectorAll('[data-school-edit]').forEach(b=>b.onclick=()=>editSchool(b.dataset.schoolEdit));
    document.querySelectorAll('[data-school-results]').forEach(b=>b.onclick=()=>window.dispatchEvent(new CustomEvent('hpt:filter-school',{detail:{schoolId:b.dataset.schoolResults}})));
    document.querySelectorAll('[data-school-toggle]').forEach(b=>b.onclick=()=>toggleSchool(b.dataset.schoolToggle));
  }
  async function refresh(){
    if(refreshing||el.hidden)return;
    refreshing=true;
    try{
      if(!(await isAdmin())){ $('schoolList').innerHTML='<div class="empty">Sign in with an active manager account to manage schools.</div>';return; }
      const {data,error}=await sb.from('hpt_schools').select('id,school_name,contact_number,location,access_code,logo_url,brand_color,dark_color,active,created_at,updated_at').order('school_name');
      if(error)throw error;schools=data||[];render();
    }catch(e){$('schoolList').innerHTML=`<div class="empty">Could not load schools. ${esc(e.message||'Check that the multi-school SQL migration has been run.')}</div>`;}
    finally{refreshing=false}
  }
  function editSchool(id){
    const s=schools.find(x=>x.id===id);if(!s)return;
    $('schoolEditId').value=s.id;$('schoolNameInput').value=s.school_name||'';$('schoolContactInput').value=s.contact_number||'';$('schoolLocationInput').value=s.location||'';$('schoolCodeInput').value=s.access_code||'';
    $('schoolBrandColor').value=s.brand_color||'#ffc400';$('schoolDarkColor').value=s.dark_color||'#0b1b29';$('schoolActiveInput').checked=!!s.active;
    $('schoolLogoFile').value='';clearPreview();setPreview(s.logo_url||'',s.logo_url?'Current school logo':'');
    $('schoolFormEyebrow').textContent='EDIT SCHOOL';$('schoolFormTitle').textContent='Update '+s.school_name;$('saveSchoolBtn').textContent='SAVE SCHOOL CHANGES';$('cancelSchoolEdit').hidden=false;msg('Editing school details. Leave the logo field empty to keep the current logo.');
    $('schoolForm').scrollIntoView({behavior:'smooth',block:'start'});
  }
  async function uploadLogo(file,schoolId){
    if(!file)return null;
    if(!/^image\/(png|jpeg|webp|svg\+xml)$/.test(file.type))throw new Error('Choose a PNG, JPG, WebP or SVG logo file.');
    if(file.size>5*1024*1024)throw new Error('Logo must be 5 MB or smaller.');
    const ext=({ 'image/png':'png','image/jpeg':'jpg','image/webp':'webp','image/svg+xml':'svg'})[file.type]||'png';
    const path=`${schoolId}/logo-${Date.now()}.${ext}`;
    const {error}=await sb.storage.from('hpt-school-logos').upload(path,file,{upsert:true,contentType:file.type,cacheControl:'3600'});
    if(error)throw error;
    const {data}=sb.storage.from('hpt-school-logos').getPublicUrl(path);
    return data?.publicUrl||null;
  }
  async function save(e){
    e.preventDefault();
    if(!(await isAdmin())){msg('Your admin session is not active. Sign in again.', 'bad');return;}
    const id=$('schoolEditId').value||((window.crypto&&window.crypto.randomUUID)?window.crypto.randomUUID():`00000000-0000-4000-8000-${Date.now().toString(16).padStart(12,'0').slice(-12)}`);
    const name=$('schoolNameInput').value.trim(),contact=$('schoolContactInput').value.trim(),location=$('schoolLocationInput').value.trim(),code=$('schoolCodeInput').value.trim();
    if(!name||!contact||!location||!code){msg('Enter school name, contact number, location and access code.','bad');return}
    if(code.length<4){msg('Access code must be at least 4 characters.','bad');return}
    const file=$('schoolLogoFile').files?.[0]||null;
    $('saveSchoolBtn').disabled=true;$('saveSchoolBtn').textContent='SAVING…';
    try{
      let logoUrl=schools.find(s=>s.id===id)?.logo_url||null;
      if(file){msg('Uploading school logo…');logoUrl=await uploadLogo(file,id)}
      const payload={id,school_name:name,contact_number:contact,location,access_code:code,logo_url:logoUrl,brand_color:$('schoolBrandColor').value||'#ffc400',dark_color:$('schoolDarkColor').value||'#0b1b29',active:$('schoolActiveInput').checked,updated_at:new Date().toISOString()};
      const existing=schools.some(s=>s.id===id);
      const {error}=existing?await sb.from('hpt_schools').update(payload).eq('id',id):await sb.from('hpt_schools').insert({...payload,created_at:new Date().toISOString()});
      if(error)throw error;
      adminNotice(existing?`${name} details updated.`:`${name} added successfully.`);
      await refresh();resetForm();
    }catch(err){const m=String(err?.message||'Could not save school.');msg(m.toLowerCase().includes('duplicate')||m.toLowerCase().includes('unique')?'That access code is already assigned to another school. Choose a unique code.':m,'bad');adminNotice(err?.message||'Could not save school.',true)}
    finally{$('saveSchoolBtn').disabled=false;$('saveSchoolBtn').textContent=$('schoolEditId').value?'SAVE SCHOOL CHANGES':'＋ ADD SCHOOL'}
  }
  async function toggleSchool(id){
    const s=schools.find(x=>x.id===id);if(!s)return;
    const verb=s.active?'disable':'enable';if(!confirm(`${verb[0].toUpperCase()+verb.slice(1)} access for ${s.school_name}?`))return;
    try{const {error}=await sb.from('hpt_schools').update({active:!s.active,updated_at:new Date().toISOString()}).eq('id',id);if(error)throw error;adminNotice(`${s.school_name} access ${s.active?'disabled':'enabled'}.`);await refresh();}
    catch(e){adminNotice(e.message||'Could not update school status.',true)}
  }
  $('schoolForm').addEventListener('submit',save);
  $('cancelSchoolEdit').onclick=resetForm;
  $('refreshSchools').onclick=refresh;
  $('schoolLogoFile').onchange=()=>{const f=$('schoolLogoFile').files?.[0];clearPreview();if(!f){setPreview('');return}previewUrl=URL.createObjectURL(f);setPreview(previewUrl,f.name)};
  window.HPTSchoolManager={refresh};
  (async()=>{if(await isAdmin())await refresh()})();
})();
