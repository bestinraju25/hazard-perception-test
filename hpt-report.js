/* RAJU HPT v61 — interactive in-page full report with official/click timestamp frames. */
(function(){
  'use strict';
  const byId=id=>document.getElementById(id);
  let currentExam=null, currentRows=[], currentFilter='all', openSerial=0, fallbackShown=false;
  const frameCache=new Map();
  const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function fmtTime(value){
    if(value===null||value===undefined||value===''||!Number.isFinite(Number(value)))return '—';
    const n=Number(value),cs=Math.round(Math.abs(n)*100),m=Math.floor(cs/6000),sec=(cs%6000)/100;
    return (n<0?'-':'')+String(m).padStart(2,'0')+':'+sec.toFixed(2).padStart(5,'0');
  }
  function schoolOf(exam){return exam?.school||window.HPTCurrentSchool||{school_name:'Driving School',brand_color:'#ffc400',dark_color:'#0b1b29'};}
  function collectRows(exam){
    const rows=[];
    (Array.isArray(exam?.clips)?exam.clips:[]).forEach((clip,clipIndex)=>{
      const hazards=(Array.isArray(clip.hazards)?clip.hazards:[]).slice().sort((a,b)=>Number(a.hazard_no)-Number(b.hazard_no));
      const responses=Array.isArray(clip.responses)?clip.responses:[];
      hazards.forEach((hazard,hazardIndex)=>{
        const hazardNo=Number(hazard.hazard_no||hazardIndex+1);
        // Only show a click when the scorer actually assigned it to this official hazard.
        // Unmatched taps are intentionally omitted from the user-facing report.
        const response=responses.find(r=>Number(r.hazard_no)===hazardNo&&Number(r.points)>0)||null;
        const actual=Number(hazard.t);
        const click=response&&response.t!==null&&response.t!==undefined&&Number.isFinite(Number(response.t))?Number(response.t):null;
        rows.push({index:rows.length,clip,clipCode:String(clip.clip_code??String(clipIndex+1).padStart(2,'0')),hazardNo,label:hazard.label||('Official hazard '+hazardNo),actual:Number.isFinite(actual)?actual:null,click,delay:click!==null&&Number.isFinite(actual)?click-actual:null,points:response?Number(response.points||0):0,max:hazards.length===1?10:5,response,identified:!!(response&&Number(response.points)>0)});
      });
    });
    return rows;
  }
  function setModalVisible(open){
    const modal=byId('fullReportModal');if(!modal)return;
    if(window.bootstrap?.Modal){
      const instance=window.bootstrap.Modal.getOrCreateInstance(modal,{backdrop:true,keyboard:true,focus:true});
      if(open)instance.show();else instance.hide();
    }else{
      if(open){modal.style.display='block';modal.classList.add('show');modal.removeAttribute('aria-hidden');modal.setAttribute('aria-modal','true');document.body.classList.add('report-modal-open');
        if(!fallbackShown){const b=document.createElement('div');b.className='modal-backdrop fade show report-fallback-backdrop';b.id='reportFallbackBackdrop';b.addEventListener('click',()=>setModalVisible(false));document.body.appendChild(b);fallbackShown=true;}}
      else{modal.style.display='none';modal.classList.remove('show');modal.setAttribute('aria-hidden','true');modal.removeAttribute('aria-modal');document.body.classList.remove('report-modal-open');byId('reportFallbackBackdrop')?.remove();fallbackShown=false;}
    }
  }
  function renderSummary(exam,rows){
    const identified=rows.filter(r=>r.identified).length,missed=rows.length-identified,score=Number(exam.total_score??exam.total??0),passMark=60,passed=Boolean(exam.passed??score>=passMark);
    byId('reportCandidateMeta').textContent=[exam.candidate_name||'Candidate',exam.phone||'',new Date(exam.completed_at||Date.now()).toLocaleString('en-IN',{dateStyle:'medium',timeStyle:'short'})].filter(Boolean).join(' · ');
    const summary=byId('reportSummary');summary.innerHTML=`<div class="report-sum-card report-sum-score"><span>FINAL SCORE</span><strong>${score} <small>/ 100</small></strong><em class="${passed?'text-pass':'text-fail'}">${passed?'PASS':'NOT PASSED'}</em></div><div class="report-sum-card"><span>OFFICIAL HAZARDS</span><strong>${rows.length}</strong></div><div class="report-sum-card"><span>IDENTIFIED</span><strong>${identified}</strong></div><div class="report-sum-card"><span>MISSED</span><strong>${missed}</strong></div>`;
  }
  function renderRows(){
    const list=byId('reportHazardList');if(!list)return;
    const filtered=currentRows.filter(r=>currentFilter==='all'||(currentFilter==='identified'?r.identified:!r.identified));
    list.innerHTML=filtered.length?filtered.map(r=>{
      const actual=fmtTime(r.actual),click=r.click===null?'Not identified':fmtTime(r.click),delay=r.delay===null?'—':fmtTime(r.delay);
      const outcome=r.identified?'IDENTIFIED':'MISSED';
      return `<article class="report-hazard-card ${r.identified?'is-identified':'is-missed'}" data-report-row="${r.index}" data-outcome="${r.identified?'identified':'missed'}">
        <div class="report-hazard-top"><div><div class="report-clip-tag">CLIP ${escapeHTML(r.clipCode)} <span>·</span> HAZARD ${r.hazardNo}</div><h3>${escapeHTML(r.label)}</h3></div><span class="report-outcome ${r.identified?'identified':'missed'}">${outcome}</span></div>
        <div class="report-time-grid"><div><span>ACTUAL HAZARD</span><strong>${actual}</strong></div><div><span>CANDIDATE CLICK</span><strong>${click}</strong></div><div><span>REACTION DELAY</span><strong>${delay}</strong></div><div><span>MARKS</span><strong>${r.points} / ${r.max}</strong></div></div>
        <div class="report-image-grid">
          <div class="report-shot"><div class="report-shot-label"><span>ACTUAL HAZARD FRAME</span><b>${actual}</b></div><button class="report-frame-btn" type="button" data-report-frame="actual" data-row-index="${r.index}" aria-label="View actual hazard frame"><div class="report-frame-placeholder" data-frame-placeholder="actual">Loading frame…</div><img data-frame-image="actual" alt="Actual hazard frame at ${actual}" hidden></button></div>
          <div class="report-shot"><div class="report-shot-label"><span>CANDIDATE CLICK FRAME</span><b>${r.click===null?'No matched click':fmtTime(r.click)}</b></div><button class="report-frame-btn" type="button" data-report-frame="click" data-row-index="${r.index}" aria-label="View candidate click frame" ${r.click===null?'disabled':''}><div class="report-frame-placeholder" data-frame-placeholder="click">${r.click===null?'No click was scored for this hazard':'Loading frame…'}</div><img data-frame-image="click" alt="Candidate click frame at ${r.click===null?'not identified':fmtTime(r.click)}" hidden></button></div>
        </div><div class="report-frame-footnote">Images are captured from the source clip at the timestamps shown.</div>
      </article>`;
    }).join(''):'<div class="report-empty">No hazards in this filter.</div>';
    const token=openSerial;
    const jobs=[];filtered.forEach(r=>{jobs.push([r,'actual']);if(r.click!==null)jobs.push([r,'click']);});
    // Limit concurrent video decoders. A typical test has 20 official hazards.
    let cursor=0;const workers=Array.from({length:3},async()=>{while(cursor<jobs.length){const job=jobs[cursor++];await hydrateFrame(job[0],job[1],token);}});Promise.all(workers).catch(()=>{});
  }
  function captureFrame(url,time){
    return new Promise((resolve,reject)=>{
      if(!url||!Number.isFinite(Number(time))){reject(new Error('Frame source or timestamp is not available'));return;}
      const v=document.createElement('video');let done=false;
      const timer=window.setTimeout(()=>finish(new Error('Timed out while capturing video frame')),10000);
      function cleanup(){window.clearTimeout(timer);v.onloadedmetadata=v.onseeked=v.onerror=null;try{v.pause();v.removeAttribute('src');v.load()}catch{}}
      function finish(err,data){if(done)return;done=true;cleanup();err?reject(err):resolve(data);}
      v.muted=true;v.playsInline=true;v.preload='auto';if(window.location.protocol!=='file:')v.crossOrigin='anonymous';
      v.onerror=()=>finish(new Error('Source video could not be opened for frame capture'));
      v.onloadedmetadata=()=>{try{const duration=Number(v.duration)||0;const t=Math.max(0,Math.min(Number(time),Math.max(0,duration-.08)));v.currentTime=t;}catch(e){finish(e)}};
      v.onseeked=()=>{try{const w=v.videoWidth||0,h=v.videoHeight||0;if(!w||!h)throw new Error('Video frame has no dimensions');const maxW=960,maxH=540,scale=Math.min(maxW/w,maxH/h,1),c=document.createElement('canvas');c.width=Math.max(1,Math.round(w*scale));c.height=Math.max(1,Math.round(h*scale));const ctx=c.getContext('2d');ctx.drawImage(v,0,0,c.width,c.height);finish(null,c.toDataURL('image/jpeg',.84));}catch(e){finish(e)}};
      v.src=url;try{v.load()}catch(e){finish(e)}
    });
  }
  async function hydrateFrame(row,which,token){
    const card=document.querySelector(`[data-report-row="${row.index}"]`);if(!card)return;
    const image=card.querySelector(`[data-frame-image="${which}"]`),placeholder=card.querySelector(`[data-frame-placeholder="${which}"]`);if(!image||!placeholder)return;
    try{
      let data=null;
      if(which==='click'&&row.response?.frameData&&String(row.response.frameData).startsWith('data:image/'))data=row.response.frameData;
      if(!data){const url=row.clip.file||row.clip.video_path||row.clip.src;const t=which==='actual'?row.actual:row.click;const cacheKey=String(url)+'|'+String(Number(t).toFixed(2));if(frameCache.has(cacheKey))data=frameCache.get(cacheKey);else{data=await captureFrame(url,t);frameCache.set(cacheKey,data);}}
      if(token!==openSerial||!document.body.contains(image))return;
      image.src=data;image.hidden=false;placeholder.hidden=true;
      image.addEventListener('error',()=>{image.hidden=true;placeholder.hidden=false;placeholder.textContent='Frame image could not be displayed.'},{once:true});
    }catch(e){
      if(token!==openSerial||!document.body.contains(placeholder))return;
      placeholder.textContent='Frame unavailable. Open this portal from localhost or its hosted URL to enable video-frame capture.';
      placeholder.classList.add('frame-unavailable');
    }
  }
  function open(exam){
    if(!exam)throw new Error('No examination report data is available.');
    currentExam=exam;currentRows=collectRows(exam);currentFilter='all';openSerial++;
    renderSummary(exam,currentRows);document.querySelectorAll('[data-report-filter]').forEach(b=>b.classList.toggle('active',b.dataset.reportFilter==='all'));
    renderRows();setModalVisible(true);
  }
  document.addEventListener('click',event=>{
    const filter=event.target.closest('[data-report-filter]');if(filter){currentFilter=filter.dataset.reportFilter||'all';document.querySelectorAll('[data-report-filter]').forEach(b=>b.classList.toggle('active',b===filter));renderRows();return;}
    const frameButton=event.target.closest('[data-report-frame]');if(frameButton&&!frameButton.disabled){const row=currentRows.find(r=>r.index===Number(frameButton.dataset.rowIndex));const image=frameButton.querySelector('img');if(image&&!image.hidden&&image.src){byId('reportLightboxImage').src=image.src;byId('reportLightboxCaption').textContent=`Clip ${row?.clipCode||''} · Hazard ${row?.hazardNo||''} · ${frameButton.dataset.reportFrame==='actual'?'Actual hazard':'Candidate click'} · ${frameButton.dataset.reportFrame==='actual'?fmtTime(row?.actual):fmtTime(row?.click)}`;byId('reportImageLightbox').hidden=false;}return;}
    if(event.target.closest('#reportLightboxClose')){byId('reportImageLightbox').hidden=true;byId('reportLightboxImage').removeAttribute('src');}
  });
  byId('closeFullReportBtn')?.addEventListener('click',()=>setModalVisible(false));
  byId('reportLightboxClose')?.addEventListener('click',()=>{byId('reportImageLightbox').hidden=true;byId('reportLightboxImage').removeAttribute('src')});
  byId('reportImageLightbox')?.addEventListener('click',e=>{if(e.target===byId('reportImageLightbox')){byId('reportImageLightbox').hidden=true;byId('reportLightboxImage').removeAttribute('src')}});
  byId('fullReportModal')?.addEventListener('hidden.bs.modal',()=>{openSerial++;byId('reportImageLightbox').hidden=true;});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!byId('reportImageLightbox').hidden){byId('reportImageLightbox').hidden=true;byId('reportLightboxImage').removeAttribute('src');e.stopPropagation();}});
  window.RajuHPTReport={open,formatTime:fmtTime};
})();
