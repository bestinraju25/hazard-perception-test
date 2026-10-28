/*
 * DRIVE YOURSELF — Kerala road world (procedural Three.js scene)
 * All scene props are built procedurally. No GTA/Rockstar assets are used.
 * Three.js is loaded as a classic global script. WebGL is required; the game
 * intentionally does not replace the live 3D world with a 2D illustrated scene.
 */
(function (global) {
  "use strict";
  const THREE = global.THREE;
  if (!THREE) {
    global.HPTDriveWorld3D = { available: false };
    return;
  }

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = (a, b) => a + Math.random() * (b - a);
  // Original road spline function: broad, gentle bends rather than a straight arcade lane.
  const roadCurve = z => 1.45 * Math.sin((z + 18) * .014) + .62 * Math.sin((z + 70) * .031);
  const roadHeading = z => -Math.atan((roadCurve(z + .5) - roadCurve(z - .5)));
  const COLORS = {
    road: 0x34383b, lane: 0xf0c52f, white: 0xf6f4e9,
    grass: 0x3f7043, leaf: 0x23623d, leaf2: 0x347849,
    tile: 0x9b4530, cream: 0xe7d9b8, blue: 0x4a899c
  };
  let SURFACES = null;

  function makeMaterial(color, extra = {}) {
    return new THREE.MeshStandardMaterial({ color, roughness: 0.84, metalness: 0.02, ...extra });
  }
  function addBox(parent, w, h, d, material, x, y, z, cast = true) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = cast;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function addSphere(parent, r, material, x, y, z, sx = 1, sy = 1, sz = 1) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 9), material);
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function addCylinder(parent, rt, rb, h, material, x, y, z, segments = 10) {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, segments), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function addTube(parent, points, radius, material, segments = 12) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(p[0], p[1], p[2])));
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, segments, radius, 5, false), material);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  }
  function createTextTexture(lines, opts = {}) {
    const canvas = document.createElement("canvas");
    canvas.width = opts.width || 768;
    canvas.height = opts.height || 256;
    const c = canvas.getContext("2d");
    c.fillStyle = opts.bg || "#174b37";
    c.fillRect(0, 0, canvas.width, canvas.height);
    c.strokeStyle = opts.border || "#e7d9a8";
    c.lineWidth = 12;
    c.strokeRect(7, 7, canvas.width - 14, canvas.height - 14);
    const rows = Array.isArray(lines) ? lines : [lines];
    c.textAlign = "center";
    c.textBaseline = "middle";
    rows.forEach((line, i) => {
      c.fillStyle = i === 0 ? (opts.color || "#fff8dc") : (opts.subColor || "#ffe2a1");
      c.font = `${i === 0 ? "900" : "700"} ${i === 0 ? 62 : 34}px "Noto Sans Malayalam", "Nirmala UI", Arial, sans-serif`;
      c.fillText(line, canvas.width / 2, canvas.height * (rows.length === 1 ? .51 : i === 0 ? .39 : .73), canvas.width - 40);
    });
    const tex = new THREE.CanvasTexture(canvas);
    if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }
  function canvasTexture(canvas, repeatX = 1, repeatY = 1) {
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
    if (THREE.SRGBColorSpace) tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    return tex;
  }
  function makeSurfaceMaps() {
    // High-frequency, original procedural PBR-style surface maps: no road video or
    // borrowed game art. Maps are designed to hold up on a large 3D road plane.
    const size = 768;
    const asphalt = document.createElement("canvas"); asphalt.width = asphalt.height = size;
    const ac = asphalt.getContext("2d");
    ac.fillStyle = "#34383a"; ac.fillRect(0, 0, size, size);
    const pixels = ac.createImageData(size, size);
    for (let i = 0; i < pixels.data.length; i += 4) {
      const n = rand(-18, 18), v = 53 + n;
      pixels.data[i] = v; pixels.data[i + 1] = v + rand(-1, 2); pixels.data[i + 2] = v + rand(0, 3); pixels.data[i + 3] = 255;
    }
    ac.putImageData(pixels, 0, 0);
    // Aggregate stone and fine tar scatter.
    for (let i = 0; i < 44000; i++) {
      const v = Math.floor(rand(48, 118)), a = rand(.035, .22), r = rand(.35, 1.65);
      ac.fillStyle = `rgba(${v},${v},${v},${a})`;
      ac.beginPath(); ac.arc(Math.random() * size, Math.random() * size, r, 0, Math.PI * 2); ac.fill();
    }
    // Faded tyre paths and hairline cracks.
    for (const x of [size * .28, size * .72]) {
      ac.strokeStyle = "rgba(16,18,19,.18)"; ac.lineWidth = 18; ac.beginPath(); ac.moveTo(x, 0); ac.bezierCurveTo(x - 8, 210, x + 10, 470, x, size); ac.stroke();
      ac.strokeStyle = "rgba(130,132,126,.08)"; ac.lineWidth = 3; ac.beginPath(); ac.moveTo(x + 4, 0); ac.lineTo(x + 1, size); ac.stroke();
    }
    for (let i = 0; i < 38; i++) {
      const x = rand(0, size), y = rand(0, size), len = rand(28, 145);
      ac.strokeStyle = `rgba(13,15,16,${rand(.12,.28)})`; ac.lineWidth = rand(.6, 1.8);
      ac.beginPath(); ac.moveTo(x, y); ac.lineTo(x + rand(-18,18), y + len * .42); ac.lineTo(x + rand(-34,34), y + len); ac.stroke();
    }
    for (let i = 0; i < 7; i++) {
      const x = rand(20, size - 170), y = rand(20, size - 160), w = rand(45, 160), h = rand(25, 130);
      ac.fillStyle = `rgba(18,20,21,${rand(.08,.16)})`; ac.fillRect(x, y, w, h);
      ac.strokeStyle = "rgba(105,108,105,.09)"; ac.lineWidth = 2; ac.strokeRect(x + 2, y + 2, w - 4, h - 4);
    }

    const grass = document.createElement("canvas"); grass.width = grass.height = 512;
    const gc = grass.getContext("2d"); gc.fillStyle = "#3b603b"; gc.fillRect(0,0,512,512);
    for(let i=0;i<18000;i++){
      const v=Math.floor(rand(36,110));gc.fillStyle=`rgba(${Math.floor(v*.55)},${v},${Math.floor(v*.48)},${rand(.07,.28)})`;
      const x=Math.random()*512,y=Math.random()*512;gc.fillRect(x,y,rand(.5,1.8),rand(2,7));
    }
    for(let i=0;i<65;i++){
      gc.strokeStyle=`rgba(20,38,22,${rand(.08,.18)})`;gc.lineWidth=rand(1,3);gc.beginPath();gc.moveTo(rand(0,512),rand(0,512));gc.lineTo(rand(0,512),rand(0,512));gc.stroke();
    }

    const plaster = document.createElement("canvas"); plaster.width = plaster.height = 512;
    const pc = plaster.getContext("2d"); pc.fillStyle="#d4c6aa";pc.fillRect(0,0,512,512);
    for(let i=0;i<22000;i++){const v=Math.floor(rand(140,224));pc.fillStyle=`rgba(${v},${Math.floor(v*.94)},${Math.floor(v*.84)},${rand(.035,.16)})`;pc.fillRect(Math.random()*512,Math.random()*512,rand(1,3),rand(1,4));}
    for(let i=0;i<20;i++){pc.strokeStyle=`rgba(95,77,58,${rand(.035,.11)})`;pc.lineWidth=rand(1,2);pc.beginPath();pc.moveTo(rand(0,512),rand(0,512));pc.lineTo(rand(0,512),rand(0,512));pc.stroke();}

    const tiles = document.createElement("canvas"); tiles.width = tiles.height = 512;
    const tc = tiles.getContext("2d"); tc.fillStyle="#71372c";tc.fillRect(0,0,512,512);
    for(let row=0;row<16;row++){
      const y=row*34;
      for(let col=-1;col<17;col++){
        const x=col*32+(row%2)*16;
        tc.fillStyle=row%3===0?"#984b38":row%3===1?"#8b4433":"#a2533d";
        tc.beginPath();tc.roundRect(x+1,y+2,30,30,7);tc.fill();
        tc.strokeStyle="rgba(48,24,20,.48)";tc.lineWidth=2;tc.beginPath();tc.arc(x+16,y+16,13,.1,Math.PI-.1);tc.stroke();
        tc.strokeStyle="rgba(230,157,113,.2)";tc.lineWidth=2;tc.beginPath();tc.arc(x+15,y+13,10,.2,Math.PI-.2);tc.stroke();
      }
    }

    const laterite = document.createElement("canvas"); laterite.width=512;laterite.height=256;
    const lc=laterite.getContext("2d");lc.fillStyle="#945b43";lc.fillRect(0,0,512,256);
    for(let row=0;row<8;row++)for(let col=0;col<12;col++){
      const x=col*44+(row%2)*22,y=row*32;
      lc.fillStyle=["#a3674d","#89513d","#9b6048","#8e5741"][Math.floor(rand(0,4))];lc.fillRect(x+1,y+1,42,30);
      lc.strokeStyle="rgba(42,27,22,.22)";lc.lineWidth=2;lc.strokeRect(x+1,y+1,42,30);
    }
    for(let i=0;i<10000;i++){lc.fillStyle=`rgba(40,25,20,${rand(.025,.12)})`;lc.fillRect(Math.random()*512,Math.random()*256,rand(1,3),rand(1,2));}

    const asphaltMap=canvasTexture(asphalt,2,34);
    const grassMap=canvasTexture(grass,18,18);
    const plasterMap=canvasTexture(plaster,1.6,1.2);
    const roofMap=canvasTexture(tiles,2.2,1.8);
    const lateriteMap=canvasTexture(laterite,3,1.4);
    return { asphalt:asphaltMap, grass:grassMap, plaster:plasterMap, roof:roofMap, laterite:lateriteMap };
  }
  function makeEnvironmentMap() {
    const c=document.createElement("canvas");c.width=1024;c.height=512;const x=c.getContext("2d");
    const g=x.createLinearGradient(0,0,0,512);g.addColorStop(0,"#6e91a6");g.addColorStop(.42,"#b8c7bf");g.addColorStop(.66,"#e6d3ae");g.addColorStop(1,"#6b7957");x.fillStyle=g;x.fillRect(0,0,1024,512);
    const sun=x.createRadialGradient(720,205,5,720,205,180);sun.addColorStop(0,"rgba(255,231,186,.82)");sun.addColorStop(1,"rgba(255,231,186,0)");x.fillStyle=sun;x.fillRect(500,0,450,420);
    x.fillStyle="rgba(43,75,58,.45)";for(let i=0;i<85;i++){const px=i*13;const h=rand(16,55);x.beginPath();x.moveTo(px,355);x.lineTo(px+6,355-h);x.lineTo(px+12,355);x.fill();}
    const tex=new THREE.CanvasTexture(c);tex.mapping=THREE.EquirectangularReflectionMapping;if(THREE.SRGBColorSpace)tex.colorSpace=THREE.SRGBColorSpace;return tex;
  }

  function addSign(parent, lines, x, y, z, width = 2.4, height = .85, bg = "#17543c") {
    const group = new THREE.Group();
    const postMat = makeMaterial(0x777d78);
    addCylinder(group, .045, .055, 2.5, postMat, -width * .34, .85, 0, 8);
    addCylinder(group, .045, .055, 2.5, postMat, width * .34, .85, 0, 8);
    const board = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: createTextTexture(lines, { bg }), side: THREE.DoubleSide }));
    board.position.set(0, 2.02, .035);
    group.add(board);
    group.position.set(x, y, z);
    parent.add(group);
    return group;
  }

  function createPalm() {
    const g = new THREE.Group();
    const trunkMat = makeMaterial(0x806044);
    const dark = makeMaterial(0x174d31, { side: THREE.DoubleSide });
    const mid = makeMaterial(0x2e7848, { side: THREE.DoubleSide });
    addTube(g, [[0, 0, 0], [.08, 1.2, 0], [.22, 2.5, -.04], [.14, 3.8, 0], [0, 5.2, 0]], .18, trunkMat, 18);
    // Broad, curved leaf blades keep the palm silhouette lush without thousands
    // of tiny meshes. Each frond has a raised central rib and tapered blade.
    for (let i = 0; i < 7; i++) {
      const a = i * Math.PI * 2 / 7 + .15;
      const len = rand(2.4, 3.0);
      const shape = new THREE.Shape();
      shape.moveTo(0, 0);
      shape.quadraticCurveTo(-.45, .45, -len * .52, len * .72);
      shape.quadraticCurveTo(-len * .15, len * .5, 0, len);
      shape.quadraticCurveTo(len * .15, len * .5, len * .52, len * .72);
      shape.quadraticCurveTo(.45, .45, 0, 0);
      const blade = new THREE.Mesh(new THREE.ShapeGeometry(shape, 7), i % 2 ? dark : mid);
      blade.position.set(0, 5.12, 0);
      blade.rotation.x = -Math.PI / 2 + .22;
      blade.rotation.y = a;
      blade.scale.set(.78, 1, .72);
      blade.castShadow = true;
      g.add(blade);
      const dx = Math.cos(a), dz = Math.sin(a);
      addTube(g, [[0, 5.18, 0], [dx * 1.05, 5.36, dz * 1.05], [dx * 2.0, 5.05, dz * 2.0], [dx * len, 4.66, dz * len]], .035, makeMaterial(0x477a43), 9);
    }
    const coconut = makeMaterial(0x6b492b);
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2;
      addSphere(g, .16, coconut, Math.cos(a) * .22, 4.96, Math.sin(a) * .22, 1, 1.08, 1);
    }
    g.userData.kind = "palm";
    return g;
  }

  function createBananaTree() {
    const g = new THREE.Group();
    const trunk = makeMaterial(0x98794a);
    const leaf = makeMaterial(0x367a36, { side: THREE.DoubleSide });
    addCylinder(g, .18, .27, 2.3, trunk, 0, 1.15, 0, 9);
    for (let i = 0; i < 7; i++) {
      const a = i * Math.PI * 2 / 7;
      const x = Math.cos(a), z = Math.sin(a);
      const shape = new THREE.Shape();
      shape.moveTo(0, 0);
      shape.quadraticCurveTo(x * 1.8, .8, x * 3.3, -.35);
      shape.quadraticCurveTo(x * 1.8, .05, 0, 0);
      const geo = new THREE.ShapeGeometry(shape, 8);
      const m = new THREE.Mesh(geo, leaf);
      m.rotation.x = -Math.PI / 2;
      m.position.set(0, 2.25 + rand(-.12, .28), 0);
      m.rotation.z = -a;
      m.scale.set(1, .8, 1);
      g.add(m);
    }
    return g;
  }

  function createHouse(kind = "home") {
    const g = new THREE.Group();
    const wallColors = kind === "shop" ? [0xe6c88b, 0xd9e4d8, 0xd9a98b] : [0xe5dcc5, 0xdcc8a2, 0xcbd8c7, 0xd5b8a6];
    const wall = makeMaterial(wallColors[Math.floor(Math.random() * wallColors.length)], { map:SURFACES?.plaster, bumpMap:SURFACES?.plaster, bumpScale:.035, roughness:.98 });
    const tile = makeMaterial(0xffffff, { map:SURFACES?.roof, bumpMap:SURFACES?.roof, bumpScale:.045, roughness:.91 });
    const trim = makeMaterial(0xf0e5ce);
    const door = makeMaterial(0x5b3d2d);
    const glass = makeMaterial(0x34596a, { metalness: .12, roughness: .3 });
    addBox(g, 5.5, 3.15, 4.2, wall, 0, 1.65, 0);
    // Two sloping Mangalore-tile roof planes and ridge cap.
    const leftRoof = addBox(g, 3.05, .17, 4.65, tile, -1.42, 3.35, -.02);
    leftRoof.rotation.z = -.43;
    const rightRoof = addBox(g, 3.05, .17, 4.65, tile, 1.42, 3.35, -.02);
    rightRoof.rotation.z = .43;
    addBox(g, .22, .22, 4.75, makeMaterial(0x713527), 0, 3.93, -.02);
    // veranda and front posts
    addBox(g, 5.9, .18, 1.2, trim, 0, .24, 2.55, false);
    [-2.3, -1.15, 1.15, 2.3].forEach(x => addBox(g, .13, 2.25, .13, trim, x, 1.25, 2.62));
    addBox(g, .95, 1.9, .13, door, 0, 1.05, 2.13);
    [-1.85, 1.85].forEach(x => {
      addBox(g, .82, .86, .12, glass, x, 1.9, 2.14);
      addBox(g, .92, .08, .16, trim, x, 1.9, 2.19);
      addBox(g, .08, .95, .16, trim, x, 1.9, 2.19);
    });
    if (kind === "shop") {
      addBox(g, 4.9, .6, .12, makeMaterial(0x315a49), 0, 2.7, 2.18);
      const board = new THREE.Mesh(new THREE.PlaneGeometry(4.8, .54), new THREE.MeshBasicMaterial({ map: createTextTexture(["TEA • SNACKS", "ചായ • പലഹാരം"], { bg: "#1c543c", width: 900, height: 220 }), side: THREE.DoubleSide }));
      board.position.set(0, 2.69, 2.25);
      g.add(board);
      addBox(g, 5.4, .11, 1.35, makeMaterial(0xb83f34), 0, 2.38, 2.86);
      for (let i = 0; i < 6; i++) addBox(g, .9, .12, 1.34, makeMaterial(i % 2 ? 0xece4d3 : 0xb83f34), -2.25 + i * .9, 2.37, 2.87, false);
    }
    g.userData.kind = kind;
    return g;
  }

  function createBusStop() {
    const g = new THREE.Group();
    const metal = makeMaterial(0x4c5c5d, { metalness: .45, roughness: .55 });
    const roof = makeMaterial(0x8b3a2c);
    [-1.8, 1.8].forEach(x => addBox(g, .12, 2.5, .12, metal, x, 1.25, 0));
    addBox(g, 4.1, .16, 1.6, roof, 0, 2.55, 0);
    addBox(g, 3.2, .55, .2, makeMaterial(0x28634b), 0, 2.02, .75);
    const label = new THREE.Mesh(new THREE.PlaneGeometry(3.1, .48), new THREE.MeshBasicMaterial({ map: createTextTexture(["BUS STOP", "ബസ് സ്റ്റോപ്പ്"], { bg: "#1f593f", width: 900, height: 240 }), side: THREE.DoubleSide }));
    label.position.set(0, 2.02, .87);
    g.add(label);
    addBox(g, 2.5, .18, .55, makeMaterial(0x777f7b), 0, .72, .22);
    return g;
  }

  function createElectricPole() {
    const g = new THREE.Group();
    const concrete = makeMaterial(0x858d89);
    const wire = makeMaterial(0x222b2d, { metalness: .25, roughness: .55 });
    addCylinder(g, .13, .2, 7.6, concrete, 0, 3.8, 0, 8);
    addBox(g, 2.8, .13, .16, concrete, 0, 6.9, 0);
    [-1.1, -.38, .38, 1.1].forEach(x => addCylinder(g, .035, .035, .65, makeMaterial(0x343b3d), x, 7.15, 0, 6));
    addTube(g, [[-16, 7.25, 0], [-8, 6.6, 0], [0, 7.2, 0], [8, 6.6, 0], [16, 7.25, 0]], .025, wire, 24);
    return g;
  }

  function createCompoundWall(length = 7) {
    const g = new THREE.Group();
    const laterite = makeMaterial(0xffffff, { map:SURFACES?.laterite, bumpMap:SURFACES?.laterite, bumpScale:.09, roughness:1 });
    const cap = makeMaterial(0xd7cbb7, { roughness: .9 });
    addBox(g, length, .9, .34, laterite, 0, .48, 0);
    addBox(g, length + .12, .12, .43, cap, 0, .99, 0);
    for (let x = -length / 2 + .35; x < length / 2; x += .7) {
      addBox(g, .035, .74, .012, makeMaterial(0x704331), x, .48, .18, false);
    }
    return g;
  }
  function createStreetLamp() {
    const g = new THREE.Group();
    const pole = makeMaterial(0x434e52, { metalness: .5, roughness: .5 });
    const glow = makeMaterial(0xffe3a0, { emissive: 0xffbd58, emissiveIntensity: .85 });
    addCylinder(g, .055, .085, 6.4, pole, 0, 3.2, 0, 8);
    addTube(g, [[0, 6.05, 0], [0, 6.45, -.28], [.0, 6.52, -.85], [.25, 6.48, -1.05]], .045, pole, 10);
    addBox(g, .42, .15, .62, pole, .25, 6.35, -1.05);
    addSphere(g, .12, glow, .25, 6.22, -1.05, 1.5, .55, 1.5);
    return g;
  }
  function createTrafficSignal() {
    const g = new THREE.Group();
    const pole = makeMaterial(0x444e52, { metalness: .5, roughness: .5 });
    const housing = makeMaterial(0x1a2529, { roughness: .6 });
    addCylinder(g, .07, .09, 5.6, pole, 0, 2.8, 0, 8);
    addBox(g, .5, 1.45, .42, housing, 0, 4.8, 0);
    const lamps = [0xd83228, 0xe5b52e, 0x38bd68].map((color, i) => {
      const mat = makeMaterial(color, { emissive: color, emissiveIntensity: i === 0 ? .72 : .12, roughness: .22 });
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(.15, 12, 9), mat);
      bulb.position.set(0, 5.22 - i * .42, .23); g.add(bulb); return mat;
    });
    g.userData.signalLamps = lamps;
    return g;
  }

  function createRoadsideVendor() {
    const g = new THREE.Group();
    const wood = makeMaterial(0x76523a);
    const red = makeMaterial(0xa33e31);
    addBox(g, 2.7, .12, 1.35, wood, 0, 1.2, 0);
    addBox(g, 2.85, .09, 1.5, red, 0, 2.3, -.08);
    [-1.25, 1.25].forEach(x => addBox(g, .1, 2.25, .1, wood, x, 1.15, -.08));
    addBox(g, 2.55, .6, .75, makeMaterial(0x3c6b54), 0, .86, .08);
    // Glass tea jars / samovar shapes on the counter.
    for (let i = 0; i < 4; i++) {
      addCylinder(g, .13, .14, .32, makeMaterial(i % 2 ? 0xc6a16a : 0x9b4c37, { roughness: .35 }), -.82 + i * .55, 1.42, .05, 10);
    }
    const board = new THREE.Mesh(new THREE.PlaneGeometry(2.3, .42), new THREE.MeshBasicMaterial({ map: createTextTexture(["CHAYA KADA", "ചായക്കട"], { bg: "#1a5038", width: 900, height: 240 }), side: THREE.DoubleSide }));
    board.position.set(0, 1.92, .69); g.add(board);
    return g;
  }

  function createWheel(parent, x, y, z, r = .34, width = .18) {
    const assembly = new THREE.Group();
    assembly.position.set(x, y, z);
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(r, r, width, 18), makeMaterial(0x171a1c, { roughness: .97 }));
    wheel.rotation.z = Math.PI / 2;
    wheel.castShadow = true;
    assembly.add(wheel);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * .38, r * .38, width + .025, 14), makeMaterial(0xa8aca9, { metalness: .6, roughness: .35 }));
    hub.rotation.z = Math.PI / 2;
    assembly.add(hub);
    parent.add(assembly);
    if (!parent.userData.wheels) parent.userData.wheels = [];
    parent.userData.wheels.push(assembly);
    return assembly;
  }

  function createCar(type = "car") {
    if(type === "car") {
      const shades=[0x7c9dad,0xd5d7d4,0x6f7475,0x9c4d3f,0x3f6680,0xb3a47c];
      return createTrainingCar(false,shades[Math.floor(Math.random()*shades.length)]);
    }
    const g = new THREE.Group();
    const bodyColor = type === "bus" ? 0xe6b53e : type === "truck" ? 0xc9d0d1 : type === "auto" ? 0x15934e : type === "scooter" || type === "motorcycle" ? 0xc83e35 : [0xd7dbd7, 0x315d81, 0x9b453b, 0xc3a94f][Math.floor(Math.random() * 4)];
    const body = makeMaterial(bodyColor, { metalness: .18, roughness: .45 });
    const glass = makeMaterial(0x294e62, { metalness: .12, roughness: .2 });
    const black = makeMaterial(0x171b1f, { roughness: .95 });
    const light = makeMaterial(0xffe8b5, { emissive: 0x55401b, emissiveIntensity: .25 });
    const red = makeMaterial(0xc92c25, { emissive: 0x390700, emissiveIntensity: .2 });
    if (type === "auto") {
      addBox(g, 1.45, .65, 2.15, makeMaterial(0x168c4e), 0, .82, 0);
      addBox(g, 1.35, .8, 1.48, makeMaterial(0xe5bd3c), 0, 1.52, -.12);
      addBox(g, 1.2, .58, .06, glass, 0, 1.56, -.88);
      addBox(g, 1.5, .13, 2.0, makeMaterial(0x174e38), 0, 2.03, -.05);
      createWheel(g, -.78, .38, .72, .32, .16); createWheel(g, .78, .38, .72, .32, .16); createWheel(g, 0, .38, -1.02, .3, .16);
      addBox(g, .07, .15, .18, light, -.48, .78, -1.1); addBox(g, .07, .15, .18, light, .48, .78, -1.1);
      return g;
    }
    if (type === "motorcycle" || type === "scooter") {
      const frame = makeMaterial(type === "scooter" ? 0x2b607e : 0x25292c, { metalness: .55, roughness: .36 });
      createWheel(g, 0, .34, -.92, .34, .16); createWheel(g, 0, .34, .9, .34, .16);
      addBox(g, .46, .48, .88, body, 0, .82, 0);
      addBox(g, .45, .18, .75, black, 0, 1.12, .18);
      addBox(g, .08, .08, .8, frame, 0, .55, 0);
      addBox(g, .65, .07, .08, frame, 0, 1.36, -.82);
      addSphere(g, .1, light, 0, 1.14, -.92, 1.2, 1, .5);
      addBox(g, .35, .12, .55, makeMaterial(0x202428), 0, 1.28, .55);
      // Simple rider silhouette gives two-wheelers scale in the scene.
      addCylinder(g, .19, .22, .55, makeMaterial(0x315c76), 0, 1.65, .05, 9);
      addSphere(g, .18, makeMaterial(0xb88665), 0, 2.02, -.04);
      addSphere(g, .2, makeMaterial(0x20252a), 0, 2.16, -.06, 1.15, .8, 1.05);
      return g;
    }
    const isBus = type === "bus";
    const isTruck = type === "truck";
    const w = isBus ? 2.8 : isTruck ? 2.55 : 1.95;
    const len = isBus ? 8.7 : isTruck ? 6.8 : 4.3;
    const h = isBus ? 2.7 : isTruck ? 2.4 : 1.35;
    addBox(g, w, h, len, body, 0, h / 2 + .38, 0);
    if (!isTruck) {
      const cabinW = w * .82;
      addBox(g, cabinW, isBus ? 1.15 : .85, len * .48, glass, 0, h + .35, -.22);
      if (isBus) {
        for (let i = 0; i < 6; i++) {
          addBox(g, .045, .8, .06, body, -w * .39 + i * w * .156, h + .32, -1.2);
          addBox(g, .045, .8, .06, body, -w * .39 + i * w * .156, h + .32, 1.55);
        }
      }
    } else {
      addBox(g, w * .78, 1.2, 2.0, glass, 0, h + .2, -2.1);
    }
    const axleZ = isBus ? [-3.1, 2.9] : isTruck ? [-2.3, 2.2] : [-1.3, 1.35];
    axleZ.forEach(z => { createWheel(g, -w / 2 - .04, .4, z, isBus ? .52 : .42); createWheel(g, w / 2 + .04, .4, z, isBus ? .52 : .42); });
    addBox(g, .44, .2, .08, light, -w * .32, .74, -len / 2 - .055, false);
    addBox(g, .44, .2, .08, light, w * .32, .74, -len / 2 - .055, false);
    addBox(g, .34, .17, .08, red, -w * .34, .7, len / 2 + .055, false);
    addBox(g, .34, .17, .08, red, w * .34, .7, len / 2 + .055, false);
    return g;
  }


  function loftVehicleShell(parent, stations, material) {
    const ring = [[-.76,.06],[-.96,.14],[-1,.38],[-.94,.78],[-.78,.95],[-.52,1],[.52,1],[.78,.95],[.94,.78],[1,.38],[.96,.14],[.76,.06]];
    const vertices=[],indices=[];
    stations.forEach(st=>ring.forEach(([nx,ny])=>vertices.push(nx*st.w,st.bottom+ny*(st.top-st.bottom),st.z)));
    const n=ring.length;
    for(let i=0;i<stations.length-1;i++)for(let j=0;j<n;j++){
      const a=i*n+j,b=i*n+(j+1)%n,c=(i+1)*n+j,d=(i+1)*n+(j+1)%n;
      indices.push(a,c,b,b,c,d);
    }
    const geo=new THREE.BufferGeometry();geo.setAttribute("position",new THREE.Float32BufferAttribute(vertices,3));geo.setIndex(indices);geo.computeVertexNormals();
    const mesh=new THREE.Mesh(geo,material);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  function addPane(parent, verts, material) {
    const geo=new THREE.BufferGeometry();geo.setAttribute("position",new THREE.Float32BufferAttribute(verts.flat(),3));geo.setIndex([0,1,2,0,2,3]);geo.computeVertexNormals();
    const mesh=new THREE.Mesh(geo,material);mesh.castShadow=false;mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  function createRealWheel(parent,x,y,z,r=.355) {
    const g=new THREE.Group();g.position.set(x,y,z);
    const rubber=makeMaterial(0x101316,{roughness:.98});
    const side=makeMaterial(0x202529,{roughness:.92});
    const alloy=makeMaterial(0xb8c2c5,{metalness:.88,roughness:.24});
    const dark=makeMaterial(0x30383d,{metalness:.68,roughness:.42});
    const tyre=new THREE.Mesh(new THREE.TorusGeometry(r,.115,16,44),rubber);tyre.rotation.y=Math.PI/2;tyre.castShadow=true;g.add(tyre);
    const sideRing=new THREE.Mesh(new THREE.TorusGeometry(r*.82,.026,8,40),side);sideRing.rotation.y=Math.PI/2;g.add(sideRing);
    const disc=new THREE.Mesh(new THREE.CylinderGeometry(r*.54,r*.54,.045,32),dark);disc.rotation.z=Math.PI/2;g.add(disc);
    const rim=new THREE.Mesh(new THREE.CylinderGeometry(r*.48,r*.48,.11,32),alloy);rim.rotation.z=Math.PI/2;g.add(rim);
    for(let i=0;i<8;i++){
      const a=i*Math.PI/4;
      const spoke=addBox(g,.065,.245,.055,alloy,0,Math.cos(a)*r*.22,Math.sin(a)*r*.22,false);spoke.rotation.x=-a;
      const bolt=addSphere(g,.018,makeMaterial(0xe0e4e3,{metalness:.85,roughness:.22}),0,Math.cos(a)*r*.36,Math.sin(a)*r*.36);
      bolt.scale.set(.65,1,1);
    }
    const hub=new THREE.Mesh(new THREE.CylinderGeometry(r*.15,r*.15,.13,24),dark);hub.rotation.z=Math.PI/2;g.add(hub);
    parent.add(g);if(!parent.userData.wheels)parent.userData.wheels=[];parent.userData.wheels.push(g);return g;
  }
  function createTrainingCar(learner=true, paintHex=null) {
    // Original generic Indian compact hatchback: layered body panels, glass, lamps,
    // interior and detailed road tyres, built as a real Three.js mesh assembly.
    const g=new THREE.Group();
    const paint= new THREE.MeshPhysicalMaterial({color:paintHex??0xb9c9cd,metalness:.58,roughness:.23,clearcoat:.92,clearcoatRoughness:.13,envMapIntensity:1.05,side:THREE.DoubleSide});
    const trim=makeMaterial(0x10191f,{metalness:.2,roughness:.5});
    const rubber=makeMaterial(0x111619,{roughness:.95});
    const chrome=makeMaterial(0xc5d0d2,{metalness:.92,roughness:.19});
    const glass=new THREE.MeshPhysicalMaterial({color:0x243d4b,metalness:.25,roughness:.12,transparent:true,opacity:.78,clearcoat:1,clearcoatRoughness:.05,envMapIntensity:1.15,side:THREE.DoubleSide});
    const lamp=new THREE.MeshPhysicalMaterial({color:0xfff2d5,emissive:0xffd58b,emissiveIntensity:.68,metalness:.14,roughness:.17,clearcoat:1});
    const tail=new THREE.MeshPhysicalMaterial({color:0xd5221e,emissive:0x6c0905,emissiveIntensity:.62,roughness:.24,clearcoat:.9});
    const bodyStations=[
      {z:-2.18,w:.77,bottom:.34,top:.86},{z:-2.02,w:.9,bottom:.32,top:.97},
      {z:-1.56,w:.98,bottom:.32,top:1.0},{z:-.65,w:.99,bottom:.32,top:.98},
      {z:.65,w:.96,bottom:.32,top:.95},{z:1.58,w:.89,bottom:.34,top:.88},
      {z:2.12,w:.75,bottom:.36,top:.78}
    ];
    loftVehicleShell(g,bodyStations,paint);
    const cabinStations=[
      {z:-1.42,w:.72,bottom:.84,top:1.05},{z:-1.05,w:.76,bottom:.85,top:1.72},
      {z:-.72,w:.76,bottom:.85,top:1.84},{z:.48,w:.72,bottom:.85,top:1.84},
      {z:1.12,w:.67,bottom:.84,top:1.12},{z:1.34,w:.61,bottom:.82,top:.96}
    ];
    loftVehicleShell(g,cabinStations,paint);
    // Windscreen and rear quarter glass as angled, reflective planes.
    addPane(g,[[-.65,1.08,-1.43],[.65,1.08,-1.43],[.55,1.73,-.82],[-.55,1.73,-.82]],glass);
    addPane(g,[[-.56,1.71,-.78],[.56,1.71,-.78],[.6,1.13,1.2],[-.6,1.13,1.2]],glass);
    // Side windows with proper sloping A/B/C pillars.
    for(const sideSign of [-1,1]){
      const x=sideSign*.765;
      addPane(g,[[x,1.12,-1.22],[x,1.68,-.73],[x,1.68,-.10],[x,1.12,-.12]],glass);
      addPane(g,[[sideSign*.735,1.12,.02],[sideSign*.735,1.68,.10],[sideSign*.69,1.42,1.07],[sideSign*.69,1.11,1.14]],glass);
      addTube(g,[[sideSign*.78,1.04,-1.36],[sideSign*.78,1.64,-.76],[sideSign*.78,1.84,-.66]],.035,paint,10);
      addTube(g,[[sideSign*.78,1.84,-.66],[sideSign*.76,1.85,.44],[sideSign*.7,1.15,1.28]],.045,paint,12);
      // Door shut lines, handles and rocker trim.
      addTube(g,[[sideSign*.99,.42,-.92],[sideSign*1.005,.98,-.78],[sideSign*1.0,.99,.88],[sideSign*.92,.42,1.45]],.012,trim,20);
      addBox(g,.045,.04,.19,chrome,sideSign*.992,1.0,-.12,false);
      addBox(g,.055,.085,1.48,trim,sideSign*.96,.43,.1,false);
      // Mirror shell, stem and turn-indicator strip.
      addTube(g,[[sideSign*.78,1.16,-1.18],[sideSign*1.02,1.28,-1.18]],.055,trim,8);
      addSphere(g,.115,paint,sideSign*1.05,1.29,-1.18,1.25,.68,1.05);
      addBox(g,.18,.025,.07,makeMaterial(0xffddb0,{emissive:0xb56a21,emissiveIntensity:.28}),sideSign*1.13,1.27,-1.19,false);
    }
    // Hood creases, roof rails and door/window framing.
    for(const sideSign of [-1,1]){
      addTube(g,[[sideSign*.25,.98,-2.0],[sideSign*.52,1.0,-1.65],[sideSign*.62,1.0,-1.35]],.012,chrome,10);
      addTube(g,[[sideSign*.56,1.86,-.66],[sideSign*.56,1.87,.48]],.025,chrome,10);
    }
    // Front fascia: bumper, chrome grille bars, fog lamps and clear-lens headlamps.
    addBox(g,1.76,.17,.18,trim,0,.43,-2.14,false);
    addBox(g,1.52,.22,.075,makeMaterial(0x172126,{metalness:.32,roughness:.55}),0,.68,-2.17,false);
    addBox(g,1.12,.045,.04,chrome,0,.69,-2.218,false);
    for(let i=0;i<4;i++)addBox(g,.95,.018,.035,chrome,0,.62+i*.045,-2.22,false);
    for(const x of [-.64,.64]){
      const head=new THREE.Mesh(new THREE.SphereGeometry(1,24,14),lamp);head.position.set(x,.76,-2.105);head.scale.set(.36,.17,.07);head.castShadow=false;g.add(head);
      addBox(g,.25,.075,.09,makeMaterial(0xfff6d8,{emissive:0xffcf75,emissiveIntensity:.22}),x,.48,-2.16,false);
      const rear=new THREE.Mesh(new THREE.BoxGeometry(.34,.27,.08),tail);rear.position.set(x,.72,2.08);g.add(rear);
      addBox(g,.26,.035,.085,makeMaterial(0xffd7c7,{emissive:0x812b20,emissiveIntensity:.25}),x,.57,2.12,false);
    }
    addBox(g,1.82,.13,.18,trim,0,.4,2.1,false);
    addBox(g,.82,.16,.045,makeMaterial(0x11191e,{metalness:.25}),0,.57,2.17,false);
    // Front and rear plates.
    const plateTexture=createTextTexture([learner?"LEARNER":"KL 08","INDIA"],{bg:"#e5c13c",color:"#101820",subColor:"#24303a",width:360,height:150});
    const frontPlate=new THREE.Mesh(new THREE.PlaneGeometry(.68,.23),new THREE.MeshBasicMaterial({map:plateTexture,side:THREE.DoubleSide}));frontPlate.position.set(0,.54,-2.235);g.add(frontPlate);
    const rearPlate=new THREE.Mesh(new THREE.PlaneGeometry(.62,.21),new THREE.MeshBasicMaterial({map:plateTexture,side:THREE.DoubleSide}));rearPlate.position.set(0,.57,2.205);rearPlate.rotation.y=Math.PI;g.add(rearPlate);
    // Wheels, tyres, alloy faces and dark wheel-arch lips.
    for(const x of [-.99,.99])for(const z of [-1.28,1.28]){
      createRealWheel(g,x,.39,z,.36);
      const archPoints=[];for(let i=0;i<=18;i++){const a=Math.PI*(.08+i*.84/18);archPoints.push([x*1.005,.39+Math.cos(a)*.46,z+Math.sin(a)*.46]);}
      addTube(g,archPoints,.052,trim,24);
    }
    // Exhaust tip and underbody details.
    const exhaust=new THREE.Mesh(new THREE.CylinderGeometry(.055,.065,.18,14),chrome);exhaust.rotation.x=Math.PI/2;exhaust.position.set(.55,.35,2.1);g.add(exhaust);
    // Cabin interior: seats, headrests, steering, dashboard and mirrors.
    const interior=makeMaterial(0x18252b,{roughness:.82});
    for(const x of [-.39,.39]){
      addBox(g,.53,.18,.62,interior,x,.93,.22);
      addBox(g,.52,.68,.16,interior,x,1.27,.53);
      addBox(g,.28,.22,.16,interior,x,1.72,.55);
    }
    addBox(g,1.28,.16,.34,interior,0,1.0,-.78);
    const steering=new THREE.Mesh(new THREE.TorusGeometry(.23,.026,8,28),trim);steering.position.set(-.38,1.16,-.91);steering.rotation.x=.34;g.add(steering);
    addTube(g,[[-.38,1.14,-.91],[-.38,.98,-.8]],.028,chrome,8);
    // Windscreen wipers and windscreen perimeter seals.
    for(const x of [-.35,.35])addTube(g,[[x-.18,1.08,-1.42],[x,1.06,-1.4],[x+.2,1.08,-1.39]],.012,trim,8);
    // Slight under-car shadow pad helps ground contact on lower-powered devices.
    const shadow=new THREE.Mesh(new THREE.CircleGeometry(1.18,32),new THREE.MeshBasicMaterial({color:0x101618,transparent:true,opacity:.18,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.scale.set(1.18,1.82,1);shadow.position.y=.12;g.add(shadow);
    return g;
  }

  function createPerson(kind = "pedestrian") {
    const g = new THREE.Group();
    const shirtColors = kind === "child" ? [0xe3b52d, 0x3b7cbd] : [0x3c8293, 0xc46d47, 0xe0d9c6, 0x4c7d54];
    const shirt = makeMaterial(shirtColors[Math.floor(Math.random() * shirtColors.length)]);
    const skin = makeMaterial(0x956c50);
    const pants = makeMaterial(kind === "elderly" ? 0x6b6963 : 0x2d3740);
    const leftLeg = addCylinder(g, .19, .22, .68, pants, -.12, .38, 0, 8);
    const rightLeg = addCylinder(g, .19, .22, .68, pants, .12, .38, 0, 8);
    addCylinder(g, .27, .3, .75, shirt, 0, 1.08, 0, 10);
    addSphere(g, .21, skin, 0, 1.65, 0);
    const leftArm = addCylinder(g, .055, .07, .65, skin, -.36, 1.0, 0, 7); leftArm.rotation.z = -.25;
    const rightArm = addCylinder(g, .055, .07, .65, skin, .36, 1.0, 0, 7); rightArm.rotation.z = .25;
    g.userData.walkParts = [leftLeg, rightLeg, leftArm, rightArm];
    if (kind === "child") addCylinder(g, .24, .22, .12, makeMaterial(0x262c30), 0, 1.86, 0, 10);
    return g;
  }

  function createAnimal(kind) {
    const g = new THREE.Group();
    if (kind === "cow") {
      const coat = makeMaterial(0xe8dfca);
      addSphere(g, .62, coat, 0, .86, 0, 1.25, .8, .95);
      addSphere(g, .36, coat, 0, 1.15, -.86, 1, .95, .9);
      for (const x of [-.42, .42]) for (const z of [-.52, .52]) addCylinder(g, .07, .09, .68, makeMaterial(0x4b4133), x, .36, z, 7);
      addCylinder(g, .045, .055, .5, makeMaterial(0xded2bd), -.42, 1.38, -.92, 7).rotation.z = -.4;
      addCylinder(g, .045, .055, .5, makeMaterial(0xded2bd), .42, 1.38, -.92, 7).rotation.z = .4;
    } else {
      const coat = makeMaterial(kind === "dog" ? 0x9a6842 : 0xb7a27b);
      addSphere(g, .43, coat, 0, .5, 0, 1.25, .7, .8);
      addSphere(g, .25, coat, 0, .67, -.42);
      for (const x of [-.28, .28]) for (const z of [-.22, .22]) addCylinder(g, .055, .075, .5, coat, x, .25, z, 7);
    }
    return g;
  }

  function createHazard(object) {
    if (object === "cyclist") {
      const g = new THREE.Group();
      const wheelMat = makeMaterial(0x161b1e, { roughness: .95 });
      [-.72, .72].forEach(z => {
        const w = new THREE.Mesh(new THREE.TorusGeometry(.33, .045, 7, 18), wheelMat);
        w.rotation.y = Math.PI / 2; w.position.set(0, .42, z); g.add(w);
      });
      const frame = makeMaterial(0xd7ae3f, { metalness: .45, roughness: .4 });
      addTube(g, [[0, .42, -.72], [0, .88, -.08], [0, .42, .72], [0, .42, -.72]], .045, frame, 12);
      addTube(g, [[0, .88, -.08], [0, 1.04, .35], [0, .42, .72]], .04, frame, 8);
      const person = createPerson("pedestrian"); person.position.set(.12, .1, -.02); person.scale.set(.82, .82, .82); g.add(person);
      return g;
    }
    if (object === "child" || object === "pedestrian" || object === "elderly" || object === "pedestrian_phone" || object === "pedestrian_night") return createPerson(object);
    if (object === "dog" || object === "cow" || object === "goats") return createAnimal(object === "goats" ? "goat" : object);
    if (object === "branch" || object === "falling_object" || object === "mud_patch" || object === "water_pothole") {
      const g = new THREE.Group();
      if (object === "branch") {
        addTube(g, [[-.9, .16, .1], [-.25, .18, 0], [.38, .12, -.12], [.9, .15, .1]], .12, makeMaterial(0x68462c), 12);
        addTube(g, [[.1, .14, -.03], [.25, .32, -.25], [.38, .35, -.38]], .055, makeMaterial(0x765034), 8);
      } else {
        const puddleMat = makeMaterial(object === "water_pothole" ? 0x4b7f98 : 0x5b4835, { metalness: .12, roughness: .28 });
        const puddle = new THREE.Mesh(new THREE.CircleGeometry(object === "mud_patch" ? .9 : .65, 22), puddleMat);
        puddle.rotation.x = -Math.PI / 2; puddle.position.y = .06; puddle.scale.set(1.4, .7, 1); g.add(puddle);
      }
      return g;
    }
    if (object === "car_door") {
      const g = createCar("car");
      addBox(g, .15, .85, .9, makeMaterial(0xc8d4d7), -1.02, 1.05, .75).rotation.y = -.55;
      return g;
    }
    if (object === "bus" || object === "multi_bus_ped") return createCar("bus");
    if (object === "truck" || object === "truck_reverse" || object === "multi_truck_bike") return createCar("truck");
    if (object === "auto") return createCar("auto");
    if (object === "scooter" || object === "motorcycle" || object === "motorcycle_left" || object === "multi_market" || object === "multi_junction") return createCar("motorcycle");
    return createCar("car");
  }

  function makeRoadTexture() {
    if (SURFACES?.asphalt) return SURFACES.asphalt;
    const c = document.createElement("canvas"); c.width = c.height = 512;
    const x = c.getContext("2d"); x.fillStyle = "#3b3f41"; x.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 15000; i++) { const v=Math.floor(rand(40,105));x.fillStyle=`rgba(${v},${v},${v},${rand(.04,.16)})`;x.fillRect(Math.random()*512,Math.random()*512,rand(.5,2),rand(.5,2)); }
    const t = new THREE.CanvasTexture(c); t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(2,34);if(THREE.SRGBColorSpace)t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;return t;
  }

  function create(canvas) {
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "high-performance" });
    } catch (e) {
      console.warn("WebGL unavailable; Drive Yourself requires the real-time 3D renderer.", e);
      return null;
    }
    const mobileQuality = global.innerWidth < 760;
    renderer.setPixelRatio(Math.min(mobileQuality ? 1.15 : 1.65, global.devicePixelRatio || 1));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.physicallyCorrectLights = true;
    renderer.sortObjects = true;
    if (THREE.ACESFilmicToneMapping !== undefined) renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.06;
    if (THREE.SRGBColorSpace) renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    SURFACES = makeSurfaceMaps();
    scene.environment = makeEnvironmentMap();
    scene.environmentIntensity = .72;
    scene.background = new THREE.Color(0x9bc5d0);
    scene.fog = new THREE.Fog(0x9bc5d0, 92, 245);
    const camera = new THREE.PerspectiveCamera(66, 1, .1, 260);
    camera.position.set(0, 4.25, 10.5);
    camera.lookAt(0, 1.1, -24);

    // Procedural sky gradient and soft cloud sprites; no downloaded sky image is required.
    const skyUniforms = { top: { value: new THREE.Color(0x6e9eb5) }, horizon: { value: new THREE.Color(0xd8d2b6) } };
    const skyDome = new THREE.Mesh(new THREE.SphereGeometry(235, 32, 18), new THREE.ShaderMaterial({
      uniforms: skyUniforms, side: THREE.BackSide, depthWrite: false,
      vertexShader: "varying vec3 vDirection; void main(){ vDirection = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }",
      fragmentShader: "uniform vec3 top; uniform vec3 horizon; varying vec3 vDirection; void main(){ float h = clamp(normalize(vDirection).y, 0.0, 1.0); float g = pow(smoothstep(0.0, 0.78, h), 0.82); vec3 c = mix(horizon, top, g); gl_FragColor = vec4(c, 1.0); }"
    }));
    scene.add(skyDome);
    const cloudCanvas = document.createElement("canvas"); cloudCanvas.width = 256; cloudCanvas.height = 112;
    const cloudCtx = cloudCanvas.getContext("2d");
    for (let i = 0; i < 22; i++) {
      const x = 22 + Math.random() * 212, y = 36 + Math.random() * 38, r = 14 + Math.random() * 27;
      const grad = cloudCtx.createRadialGradient(x, y, 1, x, y, r);
      grad.addColorStop(0, "rgba(255,255,255,.82)"); grad.addColorStop(.64, "rgba(249,249,242,.42)"); grad.addColorStop(1, "rgba(255,255,255,0)");
      cloudCtx.fillStyle = grad; cloudCtx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    const cloudTexture = new THREE.CanvasTexture(cloudCanvas);
    const cloudMaterial = new THREE.SpriteMaterial({ map: cloudTexture, color: 0xffffff, transparent: true, opacity: .62, depthWrite: false, fog: false });
    const clouds = new THREE.Group(); scene.add(clouds);
    for (let i = 0; i < 16; i++) {
      const cloud = new THREE.Sprite(cloudMaterial.clone());
      cloud.position.set(rand(-95, 95), rand(32, 65), -rand(115, 210));
      const w = rand(28, 58); cloud.scale.set(w, w * rand(.25, .42), 1); clouds.add(cloud);
    }

    const hemi = new THREE.HemisphereLight(0xd7edff, 0x536b48, 1.55); scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xffe2ad, 2.2); sun.position.set(-28, 42, -24); sun.castShadow = true;
    sun.shadow.mapSize.set(mobileQuality ? 1024 : 2048, mobileQuality ? 1024 : 2048); sun.shadow.camera.left = -26; sun.shadow.camera.right = 26;
    sun.shadow.camera.top = 30; sun.shadow.camera.bottom = -24; sun.shadow.camera.near = 1; sun.shadow.camera.far = 120;
    sun.shadow.bias = -.00035; sun.shadow.normalBias = .035; sun.shadow.radius = 4; scene.add(sun);

    const world = new THREE.Group(); scene.add(world);
    const moving = [];
    const roadTexture = makeRoadTexture();
    const roadMat = new THREE.MeshStandardMaterial({ map: roadTexture, bumpMap: roadTexture, bumpScale: .042, roughness: .93, metalness: .025 });
    const grassMat = makeMaterial(0xffffff, { map:SURFACES.grass, roughness: 1, bumpMap:SURFACES.grass, bumpScale:.12 });
    const dirtMat = makeMaterial(0x866d4c, { roughness: 1 });
    const laneMat = makeMaterial(COLORS.lane, { roughness: .7, emissive: 0x322407, emissiveIntensity: .08 });
    const edgeMat = makeMaterial(0xe4e0d4, { roughness: .8 });
    const hillMat = makeMaterial(0x557d5d, { roughness: 1 });

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(260, 270), grassMat);
    ground.rotation.x = -Math.PI / 2; ground.position.set(0, -.16, -105); ground.receiveShadow = true; world.add(ground);
    function makeRoadRibbon(width, y, material, zStart = 14, zEnd = -226, segments = 120, offset = 0) {
      const positions = [], uvs = [], indices = [];
      for (let i = 0; i <= segments; i++) {
        const z = zStart + (zEnd - zStart) * (i / segments);
        const cx = roadCurve(z) + offset;
        positions.push(cx - width / 2, y, z, cx + width / 2, y, z);
        uvs.push(0, i / segments * 30, 1, i / segments * 30);
        if (i < segments) {
          const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
          indices.push(a, b, c, b, d, c);
        }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
      geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
      geo.setIndex(indices); geo.computeVertexNormals();
      const mesh = new THREE.Mesh(geo, material); mesh.receiveShadow = true; mesh.castShadow = false;
      material.side = THREE.DoubleSide; world.add(mesh); return mesh;
    }
    makeRoadRibbon(12, -.015, roadMat);
    makeRoadRibbon(1.2, -.008, dirtMat, 14, -226, 120, -6.68);
    makeRoadRibbon(1.2, -.008, dirtMat, 14, -226, 120, 6.68);
    // Hard shoulders / footpath lips follow the same changing road direction.
    for (const side of [-1, 1]) {
      const curb = makeMaterial(0xb5b4a8, { roughness: .9 });
      const pos = [], uv = [], ind = [];
      for (let i = 0; i <= 120; i++) {
        const z = 14 + (-240 * i / 120), cx = roadCurve(z) + side * 6.05;
        pos.push(cx - .12, .055, z, cx + .12, .055, z);
        uv.push(0, i, 1, i);
        if (i < 120) { const a = i * 2; ind.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
      }
      const geo = new THREE.BufferGeometry(); geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); geo.setIndex(ind); geo.computeVertexNormals();
      const mesh = new THREE.Mesh(geo, curb); mesh.receiveShadow = true; world.add(mesh);
      makeRoadRibbon(1.15, -.025, makeMaterial(0xa99c83, { roughness: 1 }), 14, -226, 120, side * 7.92);
    }
    // Broken white centre line and road-edge markings, individually aligned to the bends.
    const dashes = new THREE.Group(); world.add(dashes); moving.push(dashes);
    for (let z = -7; z > -215; z -= 13) {
      const dash = addBox(dashes, .14, .035, 4.4, edgeMat, roadCurve(z), .055, z, false);
      dash.rotation.y = roadHeading(z); dash.userData.roadOffset = 0;
    }
    const edgeMarks = new THREE.Group(); world.add(edgeMarks); moving.push(edgeMarks);
    for (let z = 10; z > -230; z -= 3) {
      for (const side of [-1, 1]) {
        const mark = addBox(edgeMarks, .1, .025, 3.5, edgeMat, roadCurve(z) + side * 5.42, .052, z, false);
        mark.rotation.y = roadHeading(z); mark.userData.roadOffset = side * 5.42;
      }
    }
    const shoulderPosts = new THREE.Group(); world.add(shoulderPosts); moving.push(shoulderPosts);
    for (let z = -6; z > -210; z -= 13) {
      [-1, 1].forEach(side => {
        const p = new THREE.Group();
        addCylinder(p, .055, .065, .9, makeMaterial(0xe1dfd2), 0, .45, 0, 7);
        addBox(p, .13, .14, .13, makeMaterial(0xc54c3d), 0, .82, 0, false);
        p.position.set(roadCurve(z) + side * 6.1, .04, z); p.userData.roadOffset = side * 6.1; shoulderPosts.add(p);
      });
    }

    // Layered Western Ghats silhouettes with nearer dark ridges and a hazy far range.
    for (let i = 0; i < 15; i++) {
      const hill = new THREE.Mesh(new THREE.SphereGeometry(1, 22, 14), makeMaterial(i % 3 ? 0x55775d : 0x6f9073, { roughness: 1 }));
      hill.position.set(-112 + i * 16, 10 + rand(-2, 4), -182 - rand(0, 30));
      hill.scale.set(rand(18, 27), rand(8, 15), rand(14, 22));
      scene.add(hill);
    }
    for (let i = 0; i < 11; i++) {
      const hill = new THREE.Mesh(new THREE.SphereGeometry(1, 18, 12), makeMaterial(0x78937e, { roughness: 1 }));
      hill.position.set(-96 + i * 19, 13 + rand(-2, 3), -225 - rand(0, 15));
      hill.scale.set(rand(23, 34), rand(10, 17), rand(18, 25)); scene.add(hill);
    }

    // Roadside buildings, palms, banana plants, electric poles and local signs.
    const scenery = new THREE.Group(); world.add(scenery); moving.push(scenery);
    const wavingPalms = [], trafficSignals = [];
    for (let i = 0; i < 17; i++) {
      const z = -12 - i * 11.5;
      for (const side of [-1, 1]) {
        const roll = Math.random();
        const prop = new THREE.Group();
        const zLocal = z + rand(-2, 2);
        const offset = side * rand(9.2, 15.5);
        prop.position.set(roadCurve(zLocal) + offset, 0, zLocal); prop.userData.roadOffset = offset;
        if (roll < .23) {
          const palm = createPalm(); palm.scale.setScalar(rand(.72, 1.12)); prop.add(palm); wavingPalms.push(palm);
        } else if (roll < .37) {
          const banana = createBananaTree(); banana.scale.setScalar(rand(.8, 1.15)); prop.add(banana);
        } else if (roll < .47) {
          const wall = createCompoundWall(rand(5, 8)); prop.add(wall);
          const palm = createPalm(); palm.scale.setScalar(.58); palm.position.set(side * -.1, 0, 1.8); prop.add(palm); wavingPalms.push(palm);
        } else if (roll < .56) {
          const stall = createRoadsideVendor(); stall.scale.setScalar(.82); prop.add(stall);
        } else {
          const house = createHouse(roll < .69 ? "shop" : "home"); house.scale.setScalar(rand(.72, .95)); prop.add(house);
          if (roll < .68) {
            const bike = createCar(Math.random() < .5 ? "motorcycle" : "auto"); bike.scale.setScalar(.56); bike.position.set(side * -.6, 0, 3.6); prop.add(bike);
          }
        }
        scenery.add(prop);
      }
      if (i % 3 === 0) {
        const offset = i % 2 ? -8.5 : 8.5;
        const pole = createElectricPole(); pole.scale.setScalar(.8); pole.position.set(roadCurve(z - 3) + offset, 0, z - 3); pole.userData.roadOffset = offset; scenery.add(pole);
      }
      if (i % 4 === 1) {
        const offset = i % 2 ? -8.1 : 8.1;
        const sign = addSign(scenery, [i % 2 ? "SCHOOL AHEAD" : "SLOW DOWN", i % 2 ? "സ്കൂൾ മേഖല" : "സുരക്ഷിത യാത്ര"], roadCurve(z - 4) + offset, 0, z - 4, 3.1, .95, i % 2 ? "#1c543a" : "#85432b");
        sign.userData.roadOffset = offset; sign.rotation.y = roadHeading(z - 4) + (i % 2 ? .18 : -.18);
      }
      if (i % 5 === 2) {
        const offset = i % 2 ? -7.6 : 7.6;
        const lamp = createStreetLamp(); lamp.position.set(roadCurve(z - 2) + offset, 0, z - 2); lamp.userData.roadOffset = offset; scenery.add(lamp);
      }
      if (i % 6 === 0) {
        const offset = i % 2 ? -10.2 : 10.2;
        const person = createPerson(i % 3 ? "pedestrian" : "child"); person.position.set(roadCurve(z - 5) + offset, 0, z - 5); person.userData.roadOffset = offset; person.userData.walker = true; scenery.add(person);
      }
      if (i % 8 === 3) {
        const offset = i % 2 ? -8.6 : 8.6;
        const signal = createTrafficSignal(); signal.position.set(roadCurve(z - 6) + offset, 0, z - 6); signal.userData.roadOffset = offset; scenery.add(signal); trafficSignals.push(signal);
      }
    }
    const busStop = createBusStop(); busStop.position.set(roadCurve(-52) - 9.4, 0, -52); busStop.userData.roadOffset = -9.4; scenery.add(busStop);
    const roadsideTraffic = new THREE.Group(); world.add(roadsideTraffic); moving.push(roadsideTraffic);
    const bus = createCar("bus"); bus.scale.setScalar(.68); bus.position.set(roadCurve(-122) + 8.5, 0, -122); bus.userData.roadOffset = 8.5; bus.rotation.y = Math.PI; roadsideTraffic.add(bus);
    const auto = createCar("auto"); auto.scale.setScalar(.72); auto.position.set(roadCurve(-82) - 2.7, 0, -82); auto.userData.roadOffset = -2.7; roadsideTraffic.add(auto);
    const bike = createCar("motorcycle"); bike.scale.setScalar(.68); bike.position.set(roadCurve(-156) + 2.8, 0, -156); bike.userData.roadOffset = 2.8; bike.rotation.y = Math.PI; roadsideTraffic.add(bike);
    const parked = createCar("car"); parked.scale.setScalar(.8); parked.position.set(roadCurve(-102) - 8.4, 0, -102); parked.userData.roadOffset = -8.4; roadsideTraffic.add(parked);

    // Road furniture that passes beneath the learner: zebra crossing, speed table and stop line.
    const roadFeatures = new THREE.Group(); world.add(roadFeatures); moving.push(roadFeatures);
    for (const z of [-64, -142]) {
      for (let x = -4.6; x <= 4.6; x += 1.15) {
        const stripe = addBox(roadFeatures, .62, .035, 2.15, makeMaterial(0xe8e7df), roadCurve(z) + x, .055, z, false);
        stripe.rotation.y = roadHeading(z); stripe.userData.roadOffset = x;
      }
    }
    for (let x = -4.7; x <= 4.7; x += .72) {
      const bump = addBox(roadFeatures, .68, .12, .6, makeMaterial(x % 1.44 < .7 ? 0xd8d7cf : 0xd4a82f), roadCurve(-107) + x, .09, -107, false);
      bump.userData.roadOffset = x;
    }
    const stopLine = addBox(roadFeatures, 10.2, .035, .24, makeMaterial(0xf3eee1), roadCurve(-90), .06, -90, false);
    stopLine.rotation.y = roadHeading(-90); stopLine.userData.roadOffset = 0;

    // Moving Kerala traffic: private cars, scooters, autos and a bus in both directions.
    const trafficCars = [];
    for (let i = 0; i < 9; i++) {
      const type = i === 4 ? "bus" : i % 3 === 0 ? "auto" : i % 2 ? "motorcycle" : "car";
      const mesh = createCar(type);
      const direction = i % 3 === 1 ? -1 : 1;
      const lane = direction < 0 ? 2.2 : -2.15; // left-hand traffic: same-direction vehicles keep left
      const scale = type === "bus" ? .62 : type === "auto" ? .72 : type === "motorcycle" ? .78 : .82;
      mesh.scale.setScalar(scale);
      const startZ = -22 - i * 19;
      const laneOffset = lane + rand(-.18, .18);
      mesh.position.set(roadCurve(startZ) + laneOffset, 0, startZ);
      if (direction < 0) mesh.rotation.y = Math.PI + roadHeading(startZ);
      scene.add(mesh);
      trafficCars.push({ mesh, direction, speed: type === "bus" ? 6.5 : type === "motorcycle" ? 9.2 : 8.0, lane: laneOffset });
    }

    // A subtle cockpit/bonnet edge anchors the learner in the driver's seat.
    const cockpit = new THREE.Group(); scene.add(cockpit);
    const dashMat = makeMaterial(0x151f26, { metalness: .22, roughness: .45 });
    const dash = addBox(cockpit, 12, .52, 2.3, dashMat, 0, -.08, 7.0);
    dash.rotation.x = -.08;
    const hood = addBox(cockpit, 7.2, .15, 1.2, makeMaterial(0x263743, { metalness: .32, roughness: .38 }), 0, -.05, 5.9);
    hood.rotation.x = -.1;
    const bonnetLine = addBox(cockpit, 4.2, .03, .05, makeMaterial(0x8fa4af, { metalness: .45, roughness: .35 }), 0, .04, 5.45);
    const steeringWheel = new THREE.Mesh(new THREE.TorusGeometry(.43, .055, 8, 28), makeMaterial(0x111a20, { roughness: .4 }));
    steeringWheel.position.set(0, .42, 6.55); steeringWheel.rotation.x = .34; cockpit.add(steeringWheel);
    cockpit.userData.steeringWheel = steeringWheel;
    const wheelHub = new THREE.Mesh(new THREE.CylinderGeometry(.12, .12, .08, 14), makeMaterial(0x88969b, { metalness: .5 }));
    wheelHub.rotation.x = Math.PI / 2; wheelHub.position.set(0, .42, 6.55); cockpit.add(wheelHub);

    const playerCar = createTrainingCar(); playerCar.position.set(roadCurve(3.35) - 2.0, 0, 3.35); scene.add(playerCar);
    let cameraMode = "chase";
    cockpit.visible = false;

    const hazardRoot = new THREE.Group(); scene.add(hazardRoot); hazardRoot.visible = false;
    let hazardMesh = null, hazardHasStarted = false, activeScenario = null;
    const weather = new THREE.Group(); scene.add(weather);
    for (let i = 0; i < 90; i++) {
      const drop = addBox(weather, .018, rand(.18, .34), .018, makeMaterial(0xd9eff8, { transparent: true, opacity: .43 }), rand(-24, 24), rand(1, 18), rand(-90, 8), false);
      drop.userData.fall = rand(12, 23);
    }
    weather.visible = false;

    function resize() {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      renderer.setSize(rect.width, rect.height, false);
      camera.aspect = rect.width / rect.height;
      camera.updateProjectionMatrix();
    }
    function setScenario(s) {
      activeScenario = s || null;
      hazardRoot.clear(); hazardHasStarted = false; hazardMesh = null; hazardRoot.visible = false;
      if (!s) return;
      const side = s.side === "left" ? -1 : s.side === "right" ? 1 : 0;
      hazardMesh = createHazard(s.object || "pedestrian");
      const hazardLane = side * (side ? 3.35 : .2);
      hazardMesh.position.set(hazardLane, .02, -52);
      hazardMesh.userData.startX = hazardLane;
      hazardMesh.userData.crossing = ["cyclist", "child", "pedestrian", "elderly", "pedestrian_phone", "pedestrian_night", "dog", "cow", "goats"].includes(s.object);
      hazardRoot.position.x = roadCurve(-52);
      if (s.object === "cow" || s.object === "goats") hazardMesh.position.y = .04;
      if (String(s.object).startsWith("multi_")) {
        const second = s.object.includes("bike") || s.object.includes("junction") || s.object.includes("market") ? createHazard("motorcycle") : createPerson(s.object.includes("school") ? "child" : "pedestrian");
        second.scale.setScalar(.78); second.position.set(side ? -side * 1.7 : 2.1, 0, .4); hazardMesh.add(second);
      }
      hazardRoot.add(hazardMesh);
      hazardRoot.position.set(roadCurve(-52), 0, 0);
      const rainy = s.world === "rain" || s.world === "water";
      weather.visible = rainy;
      scene.fog.near = s.world === "fog" ? 26 : 78;
      scene.fog.far = s.world === "fog" ? 105 : s.world === "night" ? 135 : 205;
      if (s.world === "night") {
        scene.background.set(0x101a2b); skyUniforms.top.value.set(0x10182d); skyUniforms.horizon.value.set(0x263449); clouds.visible = false;
        scene.fog.color.set(0x182638); hemi.intensity = .8; sun.intensity = .5;
      } else if (rainy || s.world === "fog" || s.world === "water") {
        scene.background.set(0x8babb4); skyUniforms.top.value.set(0x718b91); skyUniforms.horizon.value.set(0xaebbb4); clouds.visible = true; clouds.children.forEach(cloud => { cloud.material.opacity = .82; });
        scene.fog.color.set(0x9fb1b2); hemi.intensity = 1.1; sun.intensity = 1.15;
      } else {
        scene.background.set(0x9bc5d0); skyUniforms.top.value.set(0x6e9eb5); skyUniforms.horizon.value.set(0xd8d2b6); clouds.visible = true; clouds.children.forEach(cloud => { cloud.material.opacity = .62; });
        scene.fog.color.set(0x9bc5d0); hemi.intensity = 1.55; sun.intensity = 2.2;
      }
      roadMat.roughness = rainy ? .28 : .93;
      roadMat.metalness = rainy ? .16 : .025;
      roadMat.bumpScale = rainy ? .026 : .042;
      roadMat.envMapIntensity = rainy ? .8 : .25;
    }
    function toggleCamera() { cameraMode = cameraMode === "chase" ? "driver" : "chase"; }
    function getCameraMode() { return cameraMode; }
    function spinWheels(vehicle, distance) {
      const wheels = vehicle?.userData?.wheels;
      if (!wheels) return;
      for (const wheel of wheels) wheel.rotation.x -= distance * 2.9;
    }
    let animClock = 0;
    function update(dt, s) {
      if (!Number.isFinite(dt) || dt <= 0) return;
      const speed = s && (s.mode === "driving" || s.mode === "route-finished") ? clamp(Number(s.speedMps) || 0, 0, 17.5) : 0;
      animClock += dt;
      const steer = 0; // Road bends guide the car; no left/right steering input is required.
      const laneOffset = 0;
      for (const palm of wavingPalms) palm.rotation.z = Math.sin(animClock * .72 + palm.position.x) * .018;
      for (const signal of trafficSignals) {
        const cycle = Math.floor(animClock / 3.8) % 3;
        signal.userData.signalLamps.forEach((mat, i) => { mat.emissiveIntensity = i === cycle ? .82 : .08; });
      }
      if (speed > 0) {
        for (const group of moving) {
          group.position.z += speed * dt;
          if (group.position.z > 10) group.position.z -= 230;
          // Re-seat local props on the road spline as their world-z changes.
          for (const child of group.children) {
            if (Number.isFinite(child.userData.roadOffset)) {
              const wz = child.position.z + group.position.z;
              child.position.x = roadCurve(wz) + child.userData.roadOffset;
              if (group === roadFeatures || group === dashes) child.rotation.y = roadHeading(wz);
            } else if (group === dashes) {
              const wz = child.position.z + group.position.z;
              child.position.x = roadCurve(wz);
              child.rotation.y = roadHeading(wz);
            }
          }
        }
        for (const traffic of trafficCars) {
          const relative = speed - traffic.direction * traffic.speed;
          traffic.mesh.position.z += relative * dt;
          if (traffic.mesh.position.z > 12) traffic.mesh.position.z = -rand(155, 205);
          if (traffic.mesh.position.z < -220) traffic.mesh.position.z = -rand(25, 65);
          traffic.mesh.position.x = roadCurve(traffic.mesh.position.z) + traffic.lane;
          traffic.mesh.rotation.y = (traffic.direction < 0 ? Math.PI : 0) + roadHeading(traffic.mesh.position.z);
          spinWheels(traffic.mesh, relative * dt);
        }
        roadTexture.offset.y -= dt * speed * .0088;
      }
      const carX = roadCurve(3.35) - 2.0 + laneOffset;
      playerCar.position.x += (carX - playerCar.position.x) * Math.min(1, dt * 6);
      playerCar.position.y = .012 + Math.sin((s?.driveElapsed || 0) * 8.5) * .009 * Math.min(1, speed / 8);
      playerCar.rotation.y = roadHeading(3.35);
      playerCar.rotation.z = Math.sin((s?.driveElapsed || 0) * 4.2) * .0015 * Math.min(1,speed/7);
      spinWheels(playerCar, speed * dt);
      cockpit.position.x = carX + .5;
      if (cockpit.userData.steeringWheel) cockpit.userData.steeringWheel.rotation.z = -steer * .48;
      if (cameraMode === "chase") {
        playerCar.visible = true; cockpit.visible = false;
        camera.position.x += ((roadCurve(10) - 2.0 + laneOffset * .45) - camera.position.x) * Math.min(1, dt * 4);
        camera.position.y += (4.55 - camera.position.y) * Math.min(1, dt * 3);
        camera.position.z += (11.8 - camera.position.z) * Math.min(1, dt * 3);
        camera.lookAt(roadCurve(-23) - 1.75, 1.0, -23);
        camera.rotation.z = -steer * .012;
      } else {
        playerCar.visible = false; cockpit.visible = true;
        camera.position.x += ((roadCurve(7.2) - 2.0 + laneOffset * .65) - camera.position.x) * Math.min(1, dt * 4);
        camera.position.y += (2.12 - camera.position.y) * Math.min(1, dt * 3);
        camera.position.z += (7.0 - camera.position.z) * Math.min(1, dt * 3);
        camera.lookAt(roadCurve(-34) - 1.45, 1.15, -34);
        camera.rotation.z = -steer * .006;
      }
      if (s && s.mode === "driving" && s.hazardVisible && hazardMesh) {
        if (!hazardHasStarted) {
          hazardHasStarted = true;
          hazardRoot.visible = true;
          hazardMesh.position.z = -54;
        }
        hazardMesh.position.z += speed * dt;
        hazardRoot.position.x = roadCurve(hazardMesh.position.z);
        if (hazardMesh.userData.crossing) {
          const progress = clamp((s.hazardElapsed || 0) / 4.5, 0, 1);
          const direction = hazardMesh.userData.startX < 0 ? 1 : -1;
          const eased = progress * progress * (3 - 2 * progress);
          hazardMesh.position.x = hazardMesh.userData.startX + direction * 5.6 * eased;
        }
        spinWheels(hazardMesh, speed * dt);
        if (activeScenario && (activeScenario.object === "motorcycle" || activeScenario.object === "scooter")) hazardMesh.rotation.y = roadHeading(hazardMesh.position.z) + Math.sin(s.driveElapsed * 1.3) * .12;
      } else if (s && s.mode === "driving" && !s.hazardVisible) {
        hazardRoot.visible = false;
      }
      for (const group of moving) {
        for (const child of group.children) {
          if (child.userData.walker && child.userData.walkParts) {
            const parts = child.userData.walkParts;
            parts[0].rotation.x = Math.sin(animClock * 4.2 + child.position.z) * .22;
            parts[1].rotation.x = -parts[0].rotation.x;
            parts[2].rotation.z = -.25 + Math.sin(animClock * 4.2 + child.position.z) * .08;
            parts[3].rotation.z = .25 - Math.sin(animClock * 4.2 + child.position.z) * .08;
          }
          if (child.userData.kind === "palm") child.rotation.z = Math.sin(animClock * .75 + child.position.z) * .018;
          if (child.userData.wheels) spinWheels(child, speed * dt);
        }
      }
      if (hazardMesh?.userData?.walkParts) {
        const parts = hazardMesh.userData.walkParts;
        parts[0].rotation.x = Math.sin(animClock * 5.4) * .26; parts[1].rotation.x = -parts[0].rotation.x;
      }
      if (weather.visible) {
        weather.children.forEach(drop => {
          drop.position.y -= drop.userData.fall * dt;
          drop.position.z += speed * dt;
          if (drop.position.y < .2) { drop.position.y = rand(10, 19); drop.position.z = rand(-110, 5); drop.position.x = rand(-22, 22); }
        });
      }
      if (cameraMode === "driver") {
        camera.position.y += Math.sin((s?.driveElapsed || 0) * 1.8) * .0015;
      } else {
        camera.position.y += Math.sin((s?.driveElapsed || 0) * 1.8) * .0025;
      }
    }
    function render() { skyDome.position.copy(camera.position); renderer.render(scene, camera); }
    function dispose() { renderer.dispose(); roadTexture.dispose(); cloudTexture.dispose(); }
    resize();
    return { resize, setScenario, update, render, dispose, renderer, toggleCamera, cameraMode: getCameraMode };
  }

  global.HPTDriveWorld3D = { available: true, create };
})(window);
