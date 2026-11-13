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
  function feedbackFor(row){return window.HPTScoring?.hazardFeedback(row)||(!row.identified?{level:'missed',title:'Keep learning — this hazard was missed',message:'Practise scanning further ahead and noticing changes in traffic movement.'}:row.delay<=.5?{level:'excellent',title:'Excellent anticipation!',message:'You identified this developing hazard quickly. Keep scanning ahead and maintain this consistency.'}:row.delay<=1?{level:'good',title:'Good observation!',message:'You identified the hazard with a good response. Try to recognise early warning signs even sooner.'}:row.delay<=2?{level:'improve',title:'Improve your reaction timing',message:'You spotted the hazard, but the response came later. Anticipate what other road users may do next.'}:{level:'late',title:'Work on earlier hazard recognition',message:'The hazard was identified late. Look further ahead and watch for early clues before danger becomes obvious.'});}
  function collectRows(exam){
    const rows=[];
    (Array.isArray(exam?.clips)?exam.clips:[]).forEach((clip,clipIndex)=>{
      const hazards=(Array.isArray(clip.hazards)?clip.hazards:[]).slice().sort((a,b)=>Number(a.hazard_no)-Number(b.hazard_no));
      const responses=Array.isArray(clip.responses)?clip.responses:[];
      hazards.forEach((hazard,hazardIndex)=>{
        const hazardNo=Number(hazard.hazard_no||hazardIndex+1);
        // Only show a click when the scorer actually assigned it to this official hazard.
        // Unmatched taps are intentionally omitted from the user-facing report.
        const response=responses.find(r=>Number(r.hazard_no)===hazardNo)||null;
        const actual=Number(hazard.t);
        const click=response&&response.t!==null&&response.t!==undefined&&Number.isFinite(Number(response.t))?Number(response.t):null;
        rows.push({index:rows.length,clip,clipCode:String(clip.clip_code??String(clipIndex+1).padStart(2,'0')),hazardNo,label:hazard.label||('Official hazard '+hazardNo),actual:Number.isFinite(actual)?actual:null,click,delay:click!==null&&Number.isFinite(actual)?click-actual:null,points:response?Number(response.points||0):0,max:hazards.length===1?10:5,response,identified:!!(response&&click!==null)});
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
    const delays=rows.filter(r=>r.identified&&Number.isFinite(r.delay)).map(r=>r.delay);const avg=delays.length?delays.reduce((a,b)=>a+b,0)/delays.length:null;const overall=window.HPTScoring?.overallFeedback(score,identified,rows.length,avg)||{level:passed?'good':'improve',title:passed?'Well done!':'Keep practising',message:`You identified ${identified} of ${rows.length} official hazards. Review the feedback under each hazard to improve.`};const feedback=byId('reportOverallFeedback');if(feedback)feedback.innerHTML=`<strong>${escapeHTML(overall.title)}</strong><p>${escapeHTML(overall.message)}</p>`;

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
        <div class="report-hazard-feedback ${feedbackFor(r).level}"><strong>${escapeHTML(feedbackFor(r).title)}</strong><p>${escapeHTML(feedbackFor(r).message)}</p></div>
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
  function captureFrameOnce(url,time,offset=0){
    return new Promise((resolve,reject)=>{
      if(!url||!Number.isFinite(Number(time))){reject(new Error('Frame source or timestamp is not available'));return;}
      const v=document.createElement('video');let done=false,frameRequested=false;
      const timer=window.setTimeout(()=>finish(new Error('Timed out while decoding the video frame')),12000);
      function cleanup(){window.clearTimeout(timer);v.onloadedmetadata=v.onseeked=v.onloadeddata=v.onerror=null;try{v.pause();v.removeAttribute('src');v.load();v.remove()}catch{}}
      function finish(err,data){if(done)return;done=true;cleanup();err?reject(err):resolve(data);}
      function drawDecodedFrame(){
        if(done)return;
        if(v.readyState<2||!v.videoWidth||!v.videoHeight){
          v.addEventListener('loadeddata',drawDecodedFrame,{once:true});return;
        }
        try{
          const w=v.videoWidth,h=v.videoHeight,maxW=960,maxH=540,scale=Math.min(maxW/w,maxH/h,1);
          const c=document.createElement('canvas');c.width=Math.max(1,Math.round(w*scale));c.height=Math.max(1,Math.round(h*scale));
          const ctx=c.getContext('2d',{willReadFrequently:true});if(!ctx)throw new Error('Canvas decoding is unavailable');
          ctx.drawImage(v,0,0,c.width,c.height);
          // Inspect a thumbnail of the entire frame. Sampling only the top-left
          // corner falsely classified dark road edges as a blank/black frame.
          const sampleCanvas=document.createElement('canvas');sampleCanvas.width=24;sampleCanvas.height=14;
          const sampleCtx=sampleCanvas.getContext('2d',{willReadFrequently:true});if(!sampleCtx)throw new Error('Frame validation is unavailable');
          sampleCtx.drawImage(c,0,0,sampleCanvas.width,sampleCanvas.height);
          const sample=sampleCtx.getImageData(0,0,sampleCanvas.width,sampleCanvas.height).data;
          let visible=0;for(let i=0;i<sample.length;i+=4){if(sample[i]>6||sample[i+1]>6||sample[i+2]>6)visible++;}
          if(visible<3)throw new Error('The decoded frame was blank; retrying nearby timestamp');
          const data=c.toDataURL('image/jpeg',.84);
          if(!data||data.length<300)throw new Error('The decoded frame was empty');
          finish(null,data);
        }catch(error){finish(error)}
      }
      function afterSeek(){
        if(done||frameRequested)return;frameRequested=true;
        // Ensure the presented decoder frame belongs to the requested seek target.
        // Some browsers fire `seeked` while the last presented frame is still visible.
        const target=Math.max(0,Number(v.currentTime)||0);let checks=0;
        if(typeof v.requestVideoFrameCallback==='function'){
          const waitForTargetFrame=()=>{
            if(done)return;
            try{
              v.requestVideoFrameCallback((now,metadata)=>{
                const mediaTime=Number(metadata?.mediaTime);
                if(Number.isFinite(mediaTime)&&Math.abs(mediaTime-target)>.22&&checks++<10){waitForTargetFrame();return;}
                if(Number.isFinite(mediaTime)&&Math.abs(mediaTime-target)>.35){finish(new Error('Browser did not present the requested timestamp; retrying nearby frame'));return;}
                try{v.pause()}catch{}
                drawDecodedFrame();
              });
              // Start muted playback so the browser advances the decoder and presents
              // the target frame; the callback pauses it immediately when that frame arrives.
              const playPromise=v.play();if(playPromise?.catch)playPromise.catch(()=>{});
              // Safety fallback for browsers that do not emit a callback after seeking.
              window.setTimeout(()=>{
                if(done)return;
                if(v.readyState>=2&&Math.abs(v.currentTime-target)<=.22){try{v.pause()}catch{};requestAnimationFrame(drawDecodedFrame)}
              },500);
              return;
            }catch{}
          };
          waitForTargetFrame();return;
        }
        let rafChecks=0;
        const checkPresented=()=>{
          if(done)return;
          if(v.readyState>=2&&Math.abs(v.currentTime-target)<=.22){try{v.pause()}catch{};drawDecodedFrame();return;}
          if(rafChecks++<12)requestAnimationFrame(checkPresented);
          else finish(new Error('Browser did not decode the requested timestamp; retrying nearby frame'));
        };
        requestAnimationFrame(()=>requestAnimationFrame(checkPresented));
      }
      v.muted=true;v.playsInline=true;v.preload='auto';v.disablePictureInPicture=true;
      // Set crossOrigin before src so the R2 response can be drawn to canvas.
      v.crossOrigin='anonymous';
      v.onerror=()=>finish(new Error('Source video could not be opened. Check the R2 video URL and CORS response.'));
      v.onloadedmetadata=()=>{
        try{
          const duration=Number(v.duration)||0;
          const t=Math.max(0,Math.min(Number(time)+offset,Math.max(0,duration-.12)));
          if(!Number.isFinite(t))throw new Error('Invalid frame timestamp');
          if(Math.abs(v.currentTime-t)<.015){afterSeek();return;}
          v.currentTime=t;
        }catch(error){finish(error)}
      };
      v.onseeked=afterSeek;
      v.src=url;try{v.load()}catch(error){finish(error)}
    });
  }
  async function captureFrame(url,time){
    const offsets=[0,.08,-.08];let lastError=null;
    for(let attempt=0;attempt<offsets.length;attempt++){
      try{return await captureFrameOnce(url,time,offsets[attempt]);}
      catch(error){lastError=error;console.warn(`HPT report frame capture retry ${attempt+1} failed`,error);}
    }
    throw lastError||new Error('Frame could not be captured after retries');
  }
  async function dataUrlIsUsable(data){
    if(!data||!String(data).startsWith('data:image/'))return false;
    return await new Promise(resolve=>{const img=new Image();const timer=setTimeout(()=>resolve(false),2500);img.onload=()=>{clearTimeout(timer);try{const c=document.createElement('canvas');c.width=12;c.height=8;const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0,c.width,c.height);const px=ctx.getImageData(0,0,c.width,c.height).data;let visible=0;for(let i=0;i<px.length;i+=4)if(px[i]>3||px[i+1]>3||px[i+2]>3)visible++;resolve(visible>0)}catch{resolve(false)}};img.onerror=()=>{clearTimeout(timer);resolve(false)};img.src=data;});
  }
  async function hydrateFrame(row,which,token){
    const card=document.querySelector(`[data-report-row="${row.index}"]`);if(!card)return;
    const image=card.querySelector(`[data-frame-image="${which}"]`),placeholder=card.querySelector(`[data-frame-placeholder="${which}"]`);if(!image||!placeholder)return;
    try{
      let data=null;
      if(which==='click'&&row.response?.frameData&&await dataUrlIsUsable(row.response.frameData))data=row.response.frameData;
      if(!data){const url=row.clip.file||row.clip.video_path||row.clip.src;const t=which==='actual'?row.actual:row.click;const cacheKey=String(url)+'|'+String(Number(t).toFixed(2));if(frameCache.has(cacheKey))data=frameCache.get(cacheKey);else{data=await captureFrame(url,t);frameCache.set(cacheKey,data);}}
      if(token!==openSerial||!document.body.contains(image))return;
      image.src=data;image.hidden=false;placeholder.hidden=true;
      image.addEventListener('error',()=>{image.hidden=true;placeholder.hidden=false;placeholder.textContent='Frame image could not be displayed.'},{once:true});
    }catch(e){
      if(token!==openSerial||!document.body.contains(placeholder))return;
      placeholder.textContent='Evidence frame could not be decoded after retries. The official timestamp and score are still recorded; refresh the report to try again.';
      placeholder.classList.add('frame-unavailable');
    }
  }
  function open(exam){
    if(!exam)throw new Error('No examination report data is available.');
    currentExam=exam;currentRows=collectRows(exam);currentFilter='all';openSerial++;
    frameCache.clear();renderSummary(exam,currentRows);document.querySelectorAll('[data-report-filter]').forEach(b=>b.classList.toggle('active',b.dataset.reportFilter==='all'));
    renderRows();setModalVisible(true);
  }
  document.addEventListener('click',event=>{
    const filter=event.target.closest('[data-report-filter]');if(filter){currentFilter=filter.dataset.reportFilter||'all';document.querySelectorAll('[data-report-filter]').forEach(b=>b.classList.toggle('active',b===filter));renderRows();return;}
    const frameButton=event.target.closest('[data-report-frame]');if(frameButton&&!frameButton.disabled){const row=currentRows.find(r=>r.index===Number(frameButton.dataset.rowIndex));const image=frameButton.querySelector('img');if(image&&!image.hidden&&image.src){byId('reportLightboxImage').src=image.src;byId('reportLightboxCaption').textContent=`Clip ${row?.clipCode||''} · Hazard ${row?.hazardNo||''} · ${frameButton.dataset.reportFrame==='actual'?'Actual hazard':'Candidate click'} · ${frameButton.dataset.reportFrame==='actual'?fmtTime(row?.actual):fmtTime(row?.click)}`;byId('reportImageLightbox').hidden=false;}return;}
    if(event.target.closest('#reportLightboxClose')){byId('reportImageLightbox').hidden=true;byId('reportLightboxImage').removeAttribute('src');}
  });
  byId('closeFullReportBtn')?.addEventListener('click',()=>setModalVisible(false));
  document.addEventListener('click',event=>{if(event.target.closest('[data-report-close]')){openSerial++;setModalVisible(false)}});
  document.addEventListener('hidden.bs.modal',event=>{if(event.target?.id==='fullReportModal'){openSerial++;const lightbox=byId('reportImageLightbox');if(lightbox)lightbox.hidden=true;}});
  byId('reportLightboxClose')?.addEventListener('click',()=>{byId('reportImageLightbox').hidden=true;byId('reportLightboxImage').removeAttribute('src')});
  byId('reportImageLightbox')?.addEventListener('click',e=>{if(e.target===byId('reportImageLightbox')){byId('reportImageLightbox').hidden=true;byId('reportLightboxImage').removeAttribute('src')}});
  byId('fullReportModal')?.addEventListener('hidden.bs.modal',()=>{openSerial++;byId('reportImageLightbox').hidden=true;});
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!byId('reportImageLightbox').hidden){byId('reportImageLightbox').hidden=true;byId('reportLightboxImage').removeAttribute('src');e.stopPropagation();}});
  window.RajuHPTReport={open,generate:open,formatTime:fmtTime};
})();
