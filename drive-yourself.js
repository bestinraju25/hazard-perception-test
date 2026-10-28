(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  let launchAuthorized = false, launchSchoolId = "";
  try { launchAuthorized = sessionStorage.getItem("hpt_drive_game_authorized") === "1"; launchSchoolId = sessionStorage.getItem("hpt_drive_game_school_id") || ""; } catch {}
  let savedForGate = null; try { savedForGate = JSON.parse(sessionStorage.getItem("hpt_school_session") || "null"); } catch {}
  if (!launchAuthorized || !savedForGate?.id || String(savedForGate.id) !== String(launchSchoolId)) {
    const setup = $("setupScreen"), gate = $("gameAccessRequired");
    if (setup) setup.hidden = true;
    if (gate) gate.hidden = false;
    return;
  }
  try { sessionStorage.removeItem("hpt_drive_game_authorized"); sessionStorage.removeItem("hpt_drive_game_school_id"); } catch {}
  const C = window.RAJU_HPT_CONFIG || {};
  const state = {
    school: null, accessCode: "", student: null, missions: [], index: 0,
    mode: "setup", driving: false, driveElapsed: 0, hazardElapsed: 0,
    hazardVisible: false, nextHazardAt: 48, lastResolvedDistance: 0,
    total: 0, results: [], lastFrame: 0, scroll: 0, raf: 0,
    speedKmh: 0, speedMps: 0, steer: 0, laneOffset: 0, distanceMeters: 0
  };
  const WORLD_LABELS = {
    residential:"RESIDENTIAL ROAD",bus_stop:"BUS STOP",market:"BUSY MARKET ROAD",
    town:"TOWN ROAD",urban:"URBAN TRAFFIC",school:"SCHOOL ZONE",junction:"ROAD JUNCTION",
    rural:"RURAL ROAD",bend:"ROAD BEND",junction_wall:"BLIND JUNCTION",city:"CITY TRAFFIC",
    signal:"SIGNALISED JUNCTION",roundabout:"ROUNDABOUT",highway:"HIGHWAY",
    bridge:"NARROW BRIDGE",rain:"HEAVY RAIN",fog:"MORNING FOG",glare:"SUN GLARE",
    mud:"SLIPPERY ROAD",water:"WATERLOGGED ROAD",night:"NIGHT DRIVE",
    parked_cars:"PARKED VEHICLES",narrow:"NARROW ROAD"
  };
  const driveInput={accelerate:false};
  let graphicsReady=false;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const random=(a,b)=>a+Math.random()*(b-a);
  const safeText=(id,t)=>{const e=$(id);if(e)e.textContent=t};
  function setStatus(text,kind=""){const e=$("schoolStatus");e.textContent=text;e.className="school-status"+(kind?" "+kind:"")}
  function client(){
    if(!window.supabase?.createClient||!C.supabaseUrl||!C.supabaseAnonKey)throw new Error("School access service is not configured.");
    return window.supabase.createClient(C.supabaseUrl,C.supabaseAnonKey);
  }
  function readSavedSchool(){
    try{return JSON.parse(sessionStorage.getItem("hpt_school_session")||"null")}catch{return null}
  }
  async function verifySchool(code){
    const sb=client();
    const {data,error}=await sb.rpc("verify_hpt_school_access_code",{p_code:code});
    if(error)throw error;
    const payload=Array.isArray(data)?data[0]:data;
    if(payload?.status==="disabled")throw new Error("Hazard Perception Test is disabled for this school. Please contact the provider.");
    const school=payload?.school&&typeof payload.school==="object"?payload.school:payload;
    if(!school?.id)throw new Error("School access code was not recognised. Please check and try again.");
    state.school={...school,access_code:code};
    state.accessCode=code;
    try{sessionStorage.setItem("hpt_school_session",JSON.stringify(state.school))}catch{}
    const name=state.school.school_name||"Driving School";
    safeText("gameSchoolName",name);
    safeText("footerSchool",name);
    const logo=$("gameSchoolLogo");
    if(logo){
      if(state.school.logo_url){logo.src=state.school.logo_url;logo.alt=`${name} logo`;logo.hidden=false;logo.onerror=()=>{logo.hidden=true;};}
      else{logo.removeAttribute("src");logo.hidden=true;logo.alt="";}
    }
    const brand=/^#[0-9a-f]{6}$/i.test(state.school.brand_color||"")?state.school.brand_color:"#f4c542";
    document.documentElement.style.setProperty("--school-accent",brand);
    return state.school;
  }
  async function initializeSchool(){
    const saved=readSavedSchool();
    if(saved?.access_code){
      try{
        await verifySchool(saved.access_code);
        $("accessCodeWrap").hidden=true;
        if(graphicsReady){
          setStatus(`Access verified for ${state.school.school_name}. Enter your details to start.`, "ok");
          $("startGameBtn").disabled=false;
        }else{
          setStatus("3D graphics could not start in this browser. Enable WebGL and hardware acceleration, then reload the page.","bad");
          $("startGameBtn").disabled=true;
        }
        return;
      }catch(e){
        try{sessionStorage.removeItem("hpt_school_session")}catch{}
        state.school=null;state.accessCode="";
        $("accessCodeWrap").hidden=false;
        setStatus(e.message||"School verification failed. Enter your access code.", "bad");
      }
    }else{
      $("accessCodeWrap").hidden=false;
      $("startGameBtn").disabled=!graphicsReady;
      safeText("gameSchoolName","SCHOOL ACCESS");
      setStatus(graphicsReady?"Enter your school's access code to connect this practice drive to the correct school.":"3D graphics could not start. Enable WebGL and hardware acceleration, then reload the page.",graphicsReady?"":"bad");
    }
  }
  function validateMobile(value){
    const digits=String(value||"").replace(/\D/g,"");
    return digits.length>=10&&digits.length<=15;
  }
  function shuffle(list){
    const a=[...list];
    for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}
    return a;
  }
  async function startFromForm(e){
    e.preventDefault();
    const name=$("studentName").value.trim();
    const phone=$("studentPhone").value.trim();
    const code=$("accessCode").value.trim()||state.accessCode;
    if(!name){setStatus("Please enter your name.","bad");$("studentName").focus();return}
    if(!validateMobile(phone)){setStatus("Enter a valid mobile number (10–15 digits).","bad");$("studentPhone").focus();return}
    $("startGameBtn").disabled=true;
    $("startGameBtn").textContent="VERIFYING SCHOOL…";
    try{
      if(!graphicsReady)throw new Error("The 3D renderer is unavailable. Please enable WebGL / hardware acceleration and reload this page.");
      if(!code)throw new Error("Enter your school's access code.");
      await verifySchool(code);
      state.student={name,phone:phone.replace(/\D/g,"")};
      state.missions=shuffle(window.HPT_DRIVE_SCENARIOS||[]).slice(0,10);
      if(state.missions.length<10)throw new Error("The ten-hazard practice library could not be loaded.");
      state.index=0;state.total=0;state.results=[];
      $("setupScreen").hidden=true;$("finalScreen").hidden=true;$("gameScreen").hidden=false;
      setTimeout(resizeCanvas,60);
      if(document.documentElement.requestFullscreen){try{await document.documentElement.requestFullscreen({navigationUI:"hide"})}catch{}}
      startMission();
    }catch(err){setStatus(err.message||"Could not start the practice drive.","bad")}
    finally{$("startGameBtn").disabled=!graphicsReady;$("startGameBtn").innerHTML='START DRIVING <span>→</span>'}
  }
  function pointsFor(delay){
    if(delay<=0.65)return 10;
    if(delay<=1.15)return 8;
    if(delay<=1.75)return 6;
    if(delay<=2.5)return 4;
    if(delay<=3.4)return 2;
    return 0;
  }
  function startMission(){
    state.mode="countdown";state.driving=false;state.driveElapsed=0;state.hazardElapsed=0;
    state.hazardVisible=false;state.total=0;state.results=[];state.index=0;
    state.speedKmh=0;state.speedMps=0;state.steer=0;state.laneOffset=0;
    state.distanceMeters=0;state.lastResolvedDistance=0;state.nextHazardAt=random(42,55);state.scroll=0;state.lastFrame=0;
    driveInput.accelerate=false;
    if(world3D)world3D.setScenario(null);
    safeText("missionCount","HAZARD 1 / 10");
    safeText("missionCategory","DRIVE FORWARD AND SCAN THE ROAD");
    safeText("sceneLabel","KERALA ROAD · LIVE 3D ENVIRONMENT");
    safeText("sessionScore","00");
    $("hazardAlert").classList.remove("visible");
    $("responseToast").classList.remove("show");
    $("gamePauseOverlay").hidden=true;$("countdownOverlay").hidden=false;
    $("goButton").disabled=false;$("goButton").classList.remove("active");
    $("goButton").innerHTML='<span>BRAKE</span><small>MARK DEVELOPING HAZARD</small>';
    $("accelerateButton").classList.remove("active");
    $("distanceFill").style.width="0%";$("reactionFill").style.width="0%";
    safeText("distanceText","0 m");safeText("reactionText","WAITING");
    safeText("driveHint","GET READY — HOLD THE FRONT ARROW TO MOVE");
    let count=3;safeText("countdownNumber",count);
    const tick=()=>{
      if(state.mode!=="countdown")return;
      count--;
      if(count>0){safeText("countdownNumber",count);setTimeout(tick,750)}
      else{
        $("countdownOverlay").hidden=true;
        state.mode="driving";state.driving=true;state.speedKmh=0;state.speedMps=0;
        safeText("driveHint","HOLD ↑ TO DRIVE · ROAD TURNS AUTOMATICALLY · BRAKE TO MARK A HAZARD");
      }
    };
    setTimeout(tick,750);
  }
  function handleBrake(){
    if(state.mode!=="driving")return;
    if(!state.hazardVisible){
      safeText("driveHint","NO DEVELOPING HAZARD TO MARK — KEEP OBSERVING");
      return;
    }
    const delay=clamp(state.hazardElapsed,0,4.5);
    resolveHazard(pointsFor(delay),delay,false);
  }
  function showResponse(text,kind="good"){
    const toast=$("responseToast");if(!toast)return;
    toast.textContent=text;toast.className=`response-toast show ${kind}`;
    clearTimeout(toast._hideTimer);toast._hideTimer=setTimeout(()=>toast.classList.remove("show"),1500);
  }
  function activateHazard(){
    const scenario=state.missions[state.index];
    if(!scenario){finishGame();return;}
    state.hazardVisible=true;state.hazardElapsed=0;
    if(world3D)world3D.setScenario(scenario);
    safeText("missionCount",`HAZARD ${state.index+1} / 10`);
    safeText("missionCategory",scenario.category.toUpperCase());
    safeText("sceneLabel",WORLD_LABELS[scenario.world]||"ROAD HAZARD");
    $("hazardAlert").classList.add("visible");
    safeText("driveHint","DEVELOPING HAZARD — PRESS BRAKE TO MARK IT");
    safeText("reactionText","4.5s LEFT");
  }
  function resolveHazard(points,delay,missed){
    if(!state.hazardVisible)return;
    const scenario=state.missions[state.index];
    state.results.push({scenario,points,delay,missed});
    state.total+=points;
    state.hazardVisible=false;state.hazardElapsed=0;
    $("hazardAlert").classList.remove("visible");
    if(world3D)world3D.setScenario(null);
    safeText("sessionScore",String(state.total).padStart(2,"0"));
    showResponse(missed?"HAZARD MISSED · +0 / 10":`HAZARD MARKED · +${points} / 10`,missed?"miss":"good");
    state.index++;
    safeText("missionCount",state.index>=10?"10 HAZARDS COMPLETED":"HAZARD "+(state.index+1)+" / 10");
    state.lastResolvedDistance=state.distanceMeters;
    if(state.index>=state.missions.length){
      state.mode="route-finished";
      safeText("driveHint","ALL 10 HAZARDS COMPLETED — PREPARING YOUR RESULT");
      setTimeout(finishGame,1200);
      return;
    }
    state.nextHazardAt=state.distanceMeters+random(27,39);
    const next=state.missions[state.index];
    safeText("missionCategory",`NEXT: ${next.category.toUpperCase()}`);
    safeText("driveHint","KEEP DRIVING — THE NEXT ROAD HAZARD IS AHEAD");
  }
  function finishGame(){
    state.mode="finished";state.driving=false;driveInput.accelerate=false;
    $("gameScreen").hidden=true;$("finalScreen").hidden=false;
    safeText("finishName",state.student?.name||"Driver");
    safeText("finalScore",state.total);
    const avgRows=state.results.filter(r=>r.delay!==null&&r.points>0);
    const avg=avgRows.length?avgRows.reduce((v,r)=>v+r.delay,0)/avgRows.length:null;
    const identified=state.results.filter(r=>r.points>0).length;
    safeText("finalSummary",`${identified} of 10 hazards identified · ${avg===null?"No successful reaction times":`Average reaction ${avg.toFixed(2)} seconds`} · ${state.school?.school_name||"Driving school"}`);
    const badges=[];
    if(state.total>=90)badges.push(["🏅","HAZARD MASTER","Practice score 90+"]);
    if(avg!==null&&avg<=1.5)badges.push(["⚡","QUICK REFLEXES","Average reaction ≤ 1.50s"]);
    if(identified>=8)badges.push(["🎯","SHARP OBSERVER","Identified 8 or more hazards"]);
    if(badges.length===0)badges.push(["🚗","PRACTICE DRIVER","Keep practising your hazard awareness"]);
    $("gameBadges").innerHTML=badges.map(b=>`<div class="game-badge"><span>${b[0]}</span><strong>${b[1]}</strong><small>${b[2]}</small></div>`).join("");
    $("missionReview").innerHTML=state.results.map((r,i)=>`<div class="review-row"><span>${String(i+1).padStart(2,"0")}</span><div><strong>${escapeHtml(r.scenario.title)}</strong><small>${r.missed?"Missed":r.delay===null?"No response":`Reaction ${r.delay.toFixed(2)}s`} · ${escapeHtml(r.scenario.category)}</small></div><b>${r.points}/10</b></div>`).join("");
    try{if(document.fullscreenElement)document.exitFullscreen()}catch{}
  }
  function escapeHtml(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
  function restart(){
    $("finalScreen").hidden=true;$("setupScreen").hidden=false;
    state.mode="setup";state.total=0;state.results=[];state.index=0;
    driveInput.accelerate=false;
    $("studentName").value=state.student?.name||"";$("studentPhone").value=state.student?.phone||"";
    $("accessCodeWrap").hidden=!!state.school;
    setStatus(`Ready for another practice drive at ${state.school?.school_name||"your school"}.` ,"ok");
  }

  // ---------------------------------------------------------------------------
  // Real-time WebGL scene. The legacy canvas painter below is kept dormant for
  // backwards reference only; gameplay is blocked if the Three.js world cannot start.
  // ---------------------------------------------------------------------------
  const canvas=$("roadCanvas");
  let ctx=null,world3D=null,cw=0,ch=0,dpr=1;
  try{if(window.HPTDriveWorld3D?.available)world3D=window.HPTDriveWorld3D.create(canvas)}catch(err){console.warn("3D road world could not start; WebGL is required to play.",err)}
  graphicsReady=!!world3D;
  if(!world3D){
    const notice=$("graphicsNotice");
    if(notice){notice.hidden=false;notice.textContent="3D GRAPHICS UNAVAILABLE · ENABLE WEBGL / HARDWARE ACCELERATION. THIS GAME REQUIRES REAL-TIME 3D.";}
    console.error("Drive Yourself requires WebGL. The 2D compatibility renderer is intentionally disabled.");
  }
  function resizeCanvas(){
    const r=canvas.getBoundingClientRect();if(!r.width||!r.height)return;
    cw=r.width;ch=r.height;
    if(world3D){world3D.resize();return}
    // No illustrated fallback is used: the practice game must render as real-time 3D.
    const notice=$("graphicsNotice");if(notice)notice.hidden=false;
  }
  function roundRect(x,y,w,h,r,fill,stroke){
    ctx.beginPath();ctx.roundRect(x,y,w,h,r);
    if(fill){ctx.fillStyle=fill;ctx.fill()}
    if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1.5;ctx.stroke()}
  }
  function roadWidthAt(y){const t=clamp((y-ch*.32)/(ch*.68),0,1);return cw*(.07+.42*Math.pow(t,.88))}
  function roadCenterAt(y){return cw*.5+state.laneOffset*cw*.022+Math.sin((state.scroll*.025)+y*.007)*cw*.008}
  function drawBackground(){
    const s=state.missions[state.index]||{world:"residential"};
    const world=s.world;
    let sky=ctx.createLinearGradient(0,0,0,ch*.6);
    if(world==="night"){sky.addColorStop(0,"#101a35");sky.addColorStop(1,"#38445a")}
    else if(world==="rain"||world==="fog"||world==="water"){sky.addColorStop(0,"#667b88");sky.addColorStop(1,"#bac6c7")}
    else {sky.addColorStop(0,"#4d91b4");sky.addColorStop(.55,"#b6c7be");sky.addColorStop(1,"#e0c995")}
    ctx.fillStyle=sky;ctx.fillRect(0,0,cw,ch);
    // distant hills and treeline
    ctx.fillStyle=world==="night"?"#172a38":"#597b62";
    ctx.beginPath();ctx.moveTo(0,ch*.43);
    for(let x=0;x<=cw+50;x+=50)ctx.lineTo(x,ch*.3+Math.sin(x*.012+state.scroll*.03)*ch*.035+Math.cos(x*.023)*ch*.018);
    ctx.lineTo(cw,ch*.55);ctx.lineTo(0,ch*.55);ctx.closePath();ctx.fill();
    ctx.fillStyle=world==="night"?"#14252b":"#375b43";
    for(let i=0;i<22;i++){
      const x=((i*137-state.scroll*15)%(cw+160)+cw+160)%(cw+160)-80;
      const y=ch*.37+(i%4)*ch*.025;
      const size=ch*(.018+(i%3)*.006);
      ctx.beginPath();ctx.moveTo(x,y-size*2);ctx.lineTo(x-size,y+size);ctx.lineTo(x+size,y+size);ctx.closePath();ctx.fill();
    }
    // roadside structures: stylised houses/shops for contextual depth
    if(["residential","school","market","town","urban","bus_stop","junction","junction_wall"].includes(world)){
      for(let i=0;i<8;i++){
        const side=i%2?-1:1, y=ch*.39+(i%4)*ch*.035;
        const x=cw*.5+side*(cw*.16+(i%4)*cw*.05);
        const scale=.42+(i%4)*.13;
        ctx.fillStyle=i%2?"#9a8168":"#b7a18a";
        ctx.fillRect(x-22*scale,y-32*scale,44*scale,32*scale);
        ctx.fillStyle="#455968";ctx.fillRect(x-7*scale,y-19*scale,12*scale,13*scale);
        ctx.fillStyle="#68513f";ctx.fillRect(x-25*scale,y-36*scale,50*scale,6*scale);
      }
    }
    // ground
    ctx.fillStyle=world==="night"?"#1c342d":"#557447";ctx.fillRect(0,ch*.49,cw,ch*.51);
  }
  function drawRoad(){
    const horizon=ch*.34;
    const top=roadWidthAt(horizon),bottom=roadWidthAt(ch);
    const c=roadCenterAt(horizon);
    ctx.fillStyle="#4d5357";
    ctx.beginPath();ctx.moveTo(c-top,horizon);ctx.lineTo(c+top,horizon);ctx.lineTo(cw*.5+bottom,ch);ctx.lineTo(cw*.5-bottom,ch);ctx.closePath();ctx.fill();
    // shoulders
    ctx.strokeStyle="#c8c6b8";ctx.lineWidth=Math.max(2,cw*.003);
    ctx.beginPath();ctx.moveTo(c-top,horizon);ctx.lineTo(cw*.5-bottom,ch);ctx.moveTo(c+top,horizon);ctx.lineTo(cw*.5+bottom,ch);ctx.stroke();
    // asphalt highlights
    ctx.strokeStyle="#ffffff12";ctx.lineWidth=1;
    for(let i=0;i<7;i++){
      const y=horizon+(ch-horizon)*(i/7);
      ctx.beginPath();ctx.moveTo(cw*.5-roadWidthAt(y),y);ctx.lineTo(cw*.5+roadWidthAt(y),y);ctx.stroke();
    }
    // centre dashes move towards the driver as the vehicle advances
    const phase=(state.scroll*44)%(ch*.22);
    for(let i=0;i<7;i++){
      const p=((i/7)+phase/(ch*.22))%1;
      const y=horizon+Math.pow(p,1.5)*(ch-horizon);
      const w=2+ p*5, len=5+p*24;
      ctx.fillStyle="#f4eee0";
      ctx.fillRect(roadCenterAt(y)-w/2,y,w,len);
    }
    // road edge rumble stripes
    for(let i=0;i<10;i++){
      const p=((i/10)+(state.scroll*.12)%1)%1;
      const y=horizon+Math.pow(p,1.65)*(ch-horizon);
      const half=roadWidthAt(y);
      ctx.fillStyle=i%2?"#d8d5cb":"#8f968c";
      ctx.fillRect(cw*.5-half-4,y,4,Math.max(2,p*13));
      ctx.fillRect(cw*.5+half,y,4,Math.max(2,p*13));
    }
  }
  function drawVehicle(x,y,scale,type){
    ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
    const isLarge=["bus","truck","tractor","auto"].includes(type);
    const w=isLarge?72:54,h=isLarge?88:66;
    ctx.shadowColor="#0008";ctx.shadowBlur=10;ctx.shadowOffsetY=5;
    const body=type==="bus"?"#e9b73e":type==="truck"||type==="tractor"?"#d5d9db":type==="motorcycle"||type==="scooter"?"#d93c35":type==="auto"?"#e2c02e":"#c74e3f";
    if(type==="motorcycle"||type==="scooter"||type==="motorcycle_left"){
      ctx.fillStyle="#141b21";ctx.beginPath();ctx.arc(-13,24,8,0,Math.PI*2);ctx.arc(14,24,8,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=body;roundRect(-12,-4,27,25,7,body);
      ctx.strokeStyle="#dfe8ed";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-8,-2);ctx.lineTo(-18,-15);ctx.lineTo(7,-15);ctx.stroke();
      ctx.fillStyle="#202b33";ctx.beginPath();ctx.arc(0,-18,9,0,Math.PI*2);ctx.fill();
      ctx.fillStyle="#e9b84a";ctx.beginPath();ctx.arc(0,-18,5,0,Math.PI*2);ctx.fill();
    }else{
      roundRect(-w/2,-h/2,w,h,10,body,"#ffffff75");
      roundRect(-w*.34,-h*.34,w*.68,h*.24,5,"#324d5e");
      roundRect(-w*.34,h*.08,w*.68,h*.20,4,"#293f4d");
      ctx.fillStyle="#fff1c4";ctx.fillRect(-w/2+4,h*.27,10,6);ctx.fillRect(w/2-14,h*.27,10,6);
      ctx.fillStyle="#171b20";ctx.fillRect(-w/2-4,-h*.22,7,19);ctx.fillRect(w/2-3,-h*.22,7,19);
      if(type==="bus"||type==="truck"||type==="tractor")roundRect(-w*.44,-h*.54,w*.88,13,4,"#536a76");
      if(type==="auto"){ctx.fillStyle="#151a20";ctx.fillRect(-w*.42,-h*.4,w*.84,9)}
    }
    ctx.restore();
  }
  function drawCyclist(x,y,scale){
    ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
    ctx.strokeStyle="#161f25";ctx.lineWidth=4;
    ctx.beginPath();ctx.arc(-19,22,13,0,Math.PI*2);ctx.arc(23,22,13,0,Math.PI*2);ctx.stroke();
    ctx.strokeStyle="#e8c04d";ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-19,22);ctx.lineTo(-2,3);ctx.lineTo(7,22);ctx.lineTo(-19,22);ctx.moveTo(-2,3);ctx.lineTo(23,22);ctx.moveTo(4,4);ctx.lineTo(13,-4);ctx.stroke();
    ctx.strokeStyle="#2d7892";ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(0,-20);ctx.lineTo(-3,-2);ctx.lineTo(8,8);ctx.stroke();
    ctx.fillStyle="#bf9877";ctx.beginPath();ctx.arc(2,-32,8,0,Math.PI*2);ctx.fill();
    ctx.restore();
  }
  function drawPerson(x,y,scale,type){
    ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
    const c=type==="child"?"#efbd34":type==="pedestrian_night"?"#20232a":type==="pedestrian_phone"?"#d77b45":"#427d9d";
    ctx.lineCap="round";
    ctx.strokeStyle="#17232b";ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(-5,15);ctx.lineTo(-9,37);ctx.moveTo(5,15);ctx.lineTo(10,37);ctx.stroke();
    ctx.strokeStyle=c;ctx.lineWidth=13;ctx.beginPath();ctx.moveTo(0,-4);ctx.lineTo(0,18);ctx.stroke();
    ctx.strokeStyle="#d2ad89";ctx.lineWidth=6;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-12,12);ctx.moveTo(0,0);ctx.lineTo(12,10);ctx.stroke();
    ctx.fillStyle="#b98a67";ctx.beginPath();ctx.arc(0,-16,9,0,Math.PI*2);ctx.fill();
    if(type==="child"){ctx.fillStyle="#29323d";ctx.fillRect(-9,-28,18,5)}
    if(type==="pedestrian_phone"){ctx.fillStyle="#d7e9f3";ctx.fillRect(8,3,5,9)}
    ctx.restore();
  }
  function drawAnimal(x,y,scale,type){
    ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
    const cow=type==="cow",dog=type==="dog";
    ctx.fillStyle=cow?"#eee4cf":dog?"#b77e44":"#a88958";
    roundRect(-29,-15,58,31,12,ctx.fillStyle);
    ctx.fillStyle="#272d31";ctx.beginPath();ctx.arc(24,-9,12,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle="#36302a";ctx.lineWidth=5;ctx.beginPath();[-18,-3,15].forEach(xx=>{ctx.moveTo(xx,10);ctx.lineTo(xx+2,30)});ctx.stroke();
    if(!dog){ctx.strokeStyle="#f0dfbd";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(27,-18);ctx.lineTo(34,-26);ctx.moveTo(22,-18);ctx.lineTo(16,-26);ctx.stroke()}
    ctx.restore();
  }
  function drawObject(type,x,y,scale){
    if(type.includes("ped")||type==="child"||type==="elderly")return drawPerson(x,y,scale,type);
    if(type==="cyclist")return drawCyclist(x,y,scale);
    if(["dog","cow","goats"].includes(type))return drawAnimal(x,y,scale,type);
    if(type==="branch"||type==="falling_object"||type==="mud_patch"||type==="water_pothole"){
      ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);ctx.fillStyle=type==="branch"?"#60462e":type==="mud_patch"?"#72513c":type==="water_pothole"?"#537f9c":"#b5b9b9";
      ctx.beginPath();ctx.ellipse(0,0,38,12,0,0,Math.PI*2);ctx.fill();
      if(type==="branch"){ctx.strokeStyle="#5c3d27";ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(-32,5);ctx.lineTo(30,-8);ctx.stroke()}
      ctx.restore();return;
    }
    if(type==="car_door"){
      drawVehicle(x,y,scale,"car");
      ctx.save();ctx.translate(x+scale*33,y);ctx.rotate(-.45);ctx.fillStyle="#e6e4db";ctx.fillRect(0,-16*scale,23*scale,35*scale);ctx.restore();return;
    }
    if(type==="rain_car"||type==="multi_rain_brake"||type==="car_reverse"||type==="car_brake"||type==="truck_reverse"||type.startsWith("multi_")){
      if(type==="multi_bus_ped")drawPerson(x+scale*42,y+scale*20,scale*.8,"pedestrian");
      if(type==="multi_market")drawVehicle(x-scale*38,y-scale*10,scale*.65,"motorcycle");
      if(type==="multi_truck_bike")drawVehicle(x+scale*48,y+scale*22,scale*.62,"motorcycle");
      if(type==="multi_reverse_ped")drawPerson(x-scale*42,y+scale*16,scale*.72,"pedestrian");
      if(type==="multi_night")drawVehicle(x+scale*46,y+scale*16,scale*.6,"car");
      if(type==="multi_junction")drawVehicle(x+scale*43,y+scale*24,scale*.65,"motorcycle");
      if(type==="multi_school")drawPerson(x+scale*45,y+scale*22,scale*.8,"child");
      if(type==="multi_pothole")drawVehicle(x-scale*44,y+scale*20,scale*.6,"motorcycle");
      drawVehicle(x,y,scale,type.includes("truck")?"truck":type.includes("bus")?"bus":"car");return;
    }
    drawVehicle(x,y,scale,type);
  }
  function drawHazard(){
    if(!state.hazardVisible)return;
    const s=state.missions[state.index];if(!s)return;
    const elapsed=clamp((state.hazardElapsed||0)/4.5,0,1);
    const y=ch*(.57+elapsed*.22);
    const roadHalf=roadWidthAt(y);
    const dir=s.side==="left"?-1:s.side==="right"?1:0;
    const x=cw*.5+dir*roadHalf*(dir===0?0:.48);
    const scale=.52+elapsed*.66;
    // A subtle cue halo—not a target marker—keeps the scene legible at smaller sizes.
    ctx.save();ctx.shadowColor="#ffc34b";ctx.shadowBlur=20;
    ctx.strokeStyle="#ffd56b88";ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,y-22*scale,26*scale,0,Math.PI*2);ctx.stroke();ctx.restore();
    drawObject(s.object,x,y,scale);
  }
  function drawWeather(){
    const s=state.missions[state.index];if(!s)return;
    if(s.world==="rain"){
      ctx.strokeStyle="#d4e5ee66";ctx.lineWidth=1.4;
      for(let i=0;i<80;i++){const x=(i*73+state.scroll*70)%(cw+20),y=(i*47+state.scroll*160)%(ch*.78);ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-5,y+14);ctx.stroke()}
      ctx.fillStyle="#aab9c155";ctx.fillRect(0,0,cw,ch);
    }else if(s.world==="fog"){const g=ctx.createLinearGradient(0,ch*.25,0,ch*.9);g.addColorStop(0,"#d6e0df22");g.addColorStop(1,"#e6ece6bb");ctx.fillStyle=g;ctx.fillRect(0,0,cw,ch)}
    else if(s.world==="night"){const g=ctx.createRadialGradient(cw*.5,ch*.72,20,cw*.5,ch*.65,ch*.62);g.addColorStop(0,"#f7d98b44");g.addColorStop(1,"#060e1b00");ctx.fillStyle=g;ctx.fillRect(0,0,cw,ch)}
    else if(s.world==="glare"){const g=ctx.createRadialGradient(cw*.8,ch*.38,2,cw*.8,ch*.38,ch*.42);g.addColorStop(0,"#fff4c6aa");g.addColorStop(1,"#fff4c600");ctx.fillStyle=g;ctx.fillRect(0,0,cw,ch)}
  }
  function drawPlayerHood(){
    ctx.save();
    const y=ch*.93;
    const g=ctx.createLinearGradient(0,y-30,0,ch);g.addColorStop(0,"#263945");g.addColorStop(1,"#080e14");
    ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(cw*.29,ch);ctx.lineTo(cw*.38,y-35);ctx.quadraticCurveTo(cw*.5,y-53,cw*.62,y-35);ctx.lineTo(cw*.71,ch);ctx.closePath();ctx.fill();
    ctx.strokeStyle="#647b88";ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(cw*.38,y-35);ctx.quadraticCurveTo(cw*.5,y-53,cw*.62,y-35);ctx.stroke();
    ctx.fillStyle="#9fb3bd";ctx.globalAlpha=.16;ctx.fillRect(cw*.49,ch*.91,cw*.02,ch*.03);ctx.restore();
  }
  function drawScene(){
    if(world3D){world3D.render();return}
    return;
    ctx.clearRect(0,0,cw,ch);drawBackground();drawRoad();drawHazard();drawWeather();drawPlayerHood();
    // Tiny road-side reflector posts add forward perspective and speed cues.
    const horizon=ch*.36;
    for(let i=0;i<12;i++){
      const p=((i/12)+(state.scroll*.22)%1)%1;
      const y=horizon+Math.pow(p,1.8)*(ch-horizon);
      const half=roadWidthAt(y)+cw*.025;
      const size=2+p*5;
      ctx.fillStyle="#eee7d4";ctx.fillRect(cw*.5-half-size,y-size*3,size,size*5);ctx.fillRect(cw*.5+half,y-size*3,size,size*5);
      ctx.fillStyle="#cf5550";ctx.fillRect(cw*.5-half-size,y-size*3,size,size);ctx.fillRect(cw*.5+half,y-size*3,size,size);
    }
  }
  function updateMeters(){
    const targetGap=Math.max(1,state.nextHazardAt-state.lastResolvedDistance);
    const progressed=clamp((state.distanceMeters-state.lastResolvedDistance)/targetGap,0,1);
    $("distanceFill").style.width=`${progressed*100}%`;
    safeText("distanceText",`${Math.round(state.distanceMeters)} m`);
    if(state.hazardVisible){
      const remain=Math.max(0,4.5-state.hazardElapsed);
      safeText("reactionText",`${remain.toFixed(1)}s LEFT`);
      $("reactionFill").style.width=`${clamp((state.hazardElapsed/4.5)*100,0,100)}%`;
      $("hazardAlert").classList.add("visible");
    }else{
      safeText("reactionText",state.mode==="driving"?"WAITING":"READY");$("reactionFill").style.width="0%";
    }
    safeText("speedValue",state.mode==="driving"?String(Math.round(state.speedKmh)):"0");
  }
  function frame(ts){
    const dt=state.lastFrame?Math.min(.05,(ts-state.lastFrame)/1000):0;state.lastFrame=ts;
    if(state.mode==="driving"){
      state.driving=true;
      // No auto-cruise: the car accelerates only while the front arrow / DRIVE is held.
      if(driveInput.accelerate) state.speedKmh=Math.min(42,state.speedKmh+18*dt);
      else state.speedKmh=Math.max(0,state.speedKmh-27*dt);
      if(state.speedKmh<.35)state.speedKmh=0;
      state.speedMps=state.speedKmh/3.6;
      if(state.speedMps>0){
        state.driveElapsed+=dt;
        const travelled=state.speedMps*dt;
        state.distanceMeters+=travelled;
        state.scroll+=travelled;
      }
      if(!state.hazardVisible&&state.index<state.missions.length&&state.distanceMeters>=state.nextHazardAt)activateHazard();
      if(state.hazardVisible){
        state.hazardElapsed+=dt;
        if(state.hazardElapsed>=4.5)resolveHazard(0,null,true);
      }
      if(state.speedKmh===0&&!state.hazardVisible)safeText("driveHint","HOLD ↑ TO MOVE — THE ROAD WILL GUIDE THE CAR THROUGH BENDS");
      updateMeters();
    }
    if(world3D){world3D.update(dt,state);world3D.render()}
    // If WebGL is unavailable, starting is blocked above; never silently substitute a 2D cartoon scene.
    state.raf=requestAnimationFrame(frame);
  }

  function onKeyDown(e){
    if(e.target&&/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;
    const key=e.code;
    if(key==="ArrowUp"){driveInput.accelerate=true;const b=$("accelerateButton");if(b)b.classList.add("active");e.preventDefault()}
    if((key==="Space"||e.key===" "||e.key.toLowerCase()==="b")&&state.mode==="driving"){
      e.preventDefault();if(!e.repeat)handleBrake();
    }
    if(key==="KeyC"&&!e.repeat&&world3D){world3D.toggleCamera();updateCameraButton()}
  }
  function onKeyUp(e){
    if(e.code==="ArrowUp"){driveInput.accelerate=false;const b=$("accelerateButton");if(b)b.classList.remove("active")}
  }

  function updateCameraButton(){
    const button=$("viewModeBtn");
    if(!world3D){button.hidden=true;return;}
    button.hidden=false;
    safeText("viewModeBtn",world3D.cameraMode()==="chase"?"CHASE VIEW · C":"DRIVER VIEW · C");
  }
  function bindHold(id,key){
    const el=$(id);if(!el)return;
    const on=e=>{e.preventDefault();driveInput[key]=true;el.classList.add("active");try{el.setPointerCapture(e.pointerId)}catch{}};
    const off=e=>{if(e)e.preventDefault();driveInput[key]=false;el.classList.remove("active")};
    el.addEventListener("pointerdown",on,{passive:false});
    ["pointerup","pointercancel","lostpointercapture"].forEach(ev=>el.addEventListener(ev,off,{passive:false}));
  }
  $("viewModeBtn").addEventListener("click",()=>{if(world3D){world3D.toggleCamera();updateCameraButton()}});
  bindHold("accelerateButton","accelerate");
  window.addEventListener("blur",()=>{Object.keys(driveInput).forEach(k=>driveInput[k]=false);$("accelerateButton")?.classList.remove("active")});
  document.addEventListener("visibilitychange",()=>{if(document.hidden){driveInput.accelerate=false;$("accelerateButton")?.classList.remove("active")}});
  $("goButton").addEventListener("click",handleBrake);
  window.addEventListener("keydown",onKeyDown,{passive:false});
  window.addEventListener("keyup",onKeyUp,{passive:false});
  $("identityForm").addEventListener("submit",startFromForm);
  $("quitGameBtn").addEventListener("click",()=>{
    if(!confirm("Exit this practice drive? Your unfinished practice round will be discarded."))return;
    state.mode="setup";state.driving=false;driveInput.accelerate=false;$("gameScreen").hidden=true;$("setupScreen").hidden=false;
  });
  $("playAgainBtn").addEventListener("click",restart);

  // Initialize school identity and canvas.
  if(window.ResizeObserver)new ResizeObserver(resizeCanvas).observe(canvas);
  window.addEventListener("resize",resizeCanvas);
  initializeSchool();
  updateCameraButton();
  resizeCanvas();
  state.raf=requestAnimationFrame(frame);
})();