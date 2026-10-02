// Memristor Lab — the 3D bench, built with three.js.
// Bundled and tree-shaken into docs/js/stage.js by lab-src/build.mjs.
// Every texture here is drawn at runtime on a <canvas>: no image files.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const sstep = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const easeOut = (t) => 1 - Math.pow(1 - Math.min(Math.max(t, 0), 1), 3);
const rbox = (w, h, d, r = 0.02, seg = 3) => new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3));

/* ── canvas textures ─────────────────────────────────── */
function canvasTex(w, h, draw, { srgb = true, repeat = false, aniso = 8 } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
function radialTex() {
  return canvasTex(128, 128, (g, w) => {
    const r = g.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
    r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(0.25, 'rgba(255,255,255,.55)');
    r.addColorStop(0.6, 'rgba(255,255,255,.12)'); r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, w, w);
  });
}

/* ── glow materials (additive) ───────────────────────── */
const glowVert = `varying vec3 vN; varying vec3 vV; varying vec3 vP; varying vec2 vUv;
void main(){ vUv = uv; vP = position; vec4 mv = modelViewMatrix*vec4(position,1.); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`;
function glowMat(color, { core = 3, rim = 0.25, flow = 0 } = {}) {
  return new THREE.ShaderMaterial({
    uniforms: { uCol: { value: new THREE.Color(color) }, uI: { value: 1 }, uT: { value: 0 }, uFlow: { value: flow }, uCore: { value: core }, uRim: { value: rim }, uSpd: { value: 0 } },
    vertexShader: glowVert,
    fragmentShader: `uniform vec3 uCol; uniform float uI, uT, uFlow, uCore, uRim, uSpd; varying vec3 vN; varying vec3 vV; varying vec3 vP; varying vec2 vUv;
void main(){ float f = abs(dot(normalize(vN), normalize(vV)));
  float body = pow(f, uCore) * 1.6 + pow(1.-f, 3.) * uRim;
  float bands = mix(1., .45 + 1.1*pow(.5+.5*sin(vUv.y*uFlow - uT*uSpd), 8.), step(.001, abs(uSpd)) );
  gl_FragColor = vec4(uCol * body * uI * bands, 1.); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
  });
}
// a flowing highlight that rides along a tube (current in a wire)
function flowMat(color) {
  return new THREE.ShaderMaterial({
    uniforms: { uCol: { value: new THREE.Color(color) }, uI: { value: 0 }, uT: { value: 0 }, uDir: { value: 1 }, uK: { value: 30 } },
    vertexShader: glowVert,
    fragmentShader: `uniform vec3 uCol; uniform float uI, uT, uDir, uK; varying vec3 vN; varying vec3 vV; varying vec2 vUv;
void main(){ float f = abs(dot(normalize(vN), normalize(vV)));
  float b = pow(.5+.5*sin(vUv.x*uK - uT*7.*uDir), 10.);
  gl_FragColor = vec4(uCol * b * uI * (.4 + f), 1.); }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
  });
}

/* ── the breadboard face: a common white solderless breadboard ─ */
const P = 0.1016;               // 0.1 inch pitch, in scene units (1 unit = 25 mm)
const BB = { L: 3.3, W: 2.18, H: 0.34, cols: 30 };
const ROWS = { a: -5.5, b: -4.5, c: -3.5, d: -2.5, e: -1.5, f: 1.5, g: 2.5, h: 3.5, i: 4.5, j: 5.5 };
const RAIL = { tp: -9.4, tm: -8.4, bm: 8.4, bp: 9.4 }; // top +, top −, bottom −, bottom +
const colX = (c) => (c - 15.5) * P;
const railCols = []; for (let g = 0; g < 5; g++) for (let k = 0; k < 5; k++) railCols.push(2 + g * 6 + k);
function breadboardTextures() {
  const S = 640, w = Math.round(BB.L * S), h = Math.round(BB.W * S);
  const X = (x) => (x / BB.L + 0.5) * w, Z = (z) => (z / BB.W + 0.5) * h;
  const holes = [];
  for (let c = 1; c <= 30; c++) for (const r in ROWS) holes.push([colX(c), ROWS[r] * P]);
  for (const c of railCols) for (const k in RAIL) holes.push([colX(c), RAIL[k] * P]);
  const hs = 0.042 * S;   // ~1 mm square openings
  const color = canvasTex(w, h, (g) => {
    g.fillStyle = '#f3f2ec'; g.fillRect(0, 0, w, h);
    // faint moulding texture
    for (let k = 0; k < 2600; k++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.018})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
    // centre trench
    const tz = Z(0), tw = 0.09 * S;
    const tg = g.createLinearGradient(0, tz - tw / 2, 0, tz + tw / 2);
    tg.addColorStop(0, '#d9d7cf'); tg.addColorStop(0.5, '#cfccc3'); tg.addColorStop(1, '#e4e2da');
    g.fillStyle = tg; g.fillRect(X(-1.6), tz - tw / 2, X(1.6) - X(-1.6), tw);
    // rail lines
    const line = (z, col) => { g.fillStyle = col; g.fillRect(X(colX(1) - P * 0.6), Z(z * P) - 0.006 * S, X(colX(30) + P * 0.6) - X(colX(1) - P * 0.6), 0.012 * S); };
    line(-10.15, '#d8262b'); line(-7.65, '#1f4fd8'); line(7.65, '#1f4fd8'); line(10.15, '#d8262b');
    // + and − marks at the rail ends
    g.font = `700 ${0.07 * S}px Arial, Helvetica, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (const [z, t, c] of [[RAIL.tp, '+', '#d8262b'], [RAIL.tm, '−', '#1f4fd8'], [RAIL.bm, '−', '#1f4fd8'], [RAIL.bp, '+', '#d8262b']]) {
      g.fillStyle = c; g.fillText(t, X(colX(0.2)), Z(z * P)); g.fillText(t, X(colX(30.8)), Z(z * P));
    }
    // row letters and column numbers
    g.fillStyle = '#8f8d86'; g.font = `600 ${0.046 * S}px Arial, Helvetica, sans-serif`;
    for (const r in ROWS) { g.fillText(r, X(colX(0.1)), Z(ROWS[r] * P)); g.fillText(r, X(colX(30.9)), Z(ROWS[r] * P)); }
    for (const c of [1, 5, 10, 15, 20, 25, 30]) { g.fillText(String(c), X(colX(c)), Z(-6.65 * P)); g.fillText(String(c), X(colX(c)), Z(6.65 * P)); }
    // holes: dark square openings with a light bevel and a glint of the clip inside
    for (const [x, z] of holes) {
      const cx = X(x), cz = Z(z);
      g.fillStyle = '#d6d4cc'; g.fillRect(cx - hs * 0.85, cz - hs * 0.85, hs * 1.7, hs * 1.7);
      const gr = g.createLinearGradient(cx, cz - hs / 2, cx, cz + hs / 2);
      gr.addColorStop(0, '#1b1b1d'); gr.addColorStop(0.7, '#2b2b2e'); gr.addColorStop(1, '#4a4a4c');
      g.fillStyle = gr; g.fillRect(cx - hs / 2, cz - hs / 2, hs, hs);
      g.fillStyle = 'rgba(190,190,195,.55)'; g.fillRect(cx - hs * 0.32, cz + hs * 0.12, hs * 0.64, hs * 0.12);
    }
  });
  const bump = canvasTex(w, h, (g) => {
    g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#9a9a9a'; g.fillRect(X(-1.6), Z(0) - 0.045 * S, X(1.6) - X(-1.6), 0.09 * S);
    for (const [x, z] of holes) { g.fillStyle = '#bbb'; g.fillRect(X(x) - hs * 0.85, Z(z) - hs * 0.85, hs * 1.7, hs * 1.7); g.fillStyle = '#000'; g.fillRect(X(x) - hs / 2, Z(z) - hs / 2, hs, hs); }
  }, { srgb: false });
  return { color, bump };
}

/* ── the stage ───────────────────────────────────────── */
export class Stage {
  constructor(canvas) {
    this.cv = canvas;
    this.ok = false;
    this.reduced = false; this.fixed = false;
    this.coarse = matchMedia('(pointer:coarse)').matches;
    this.scale = this.coarse ? 0.85 : 1;
    this.maxDpr = Math.min(window.devicePixelRatio || 1, this.coarse ? 2 : 1.75);
    this.center = [0.5, 0.5];
    this.cam = { az: 0.62, el: 0.34, dist: 6.4, tx: 0, ty: 0.48, tz: 0 };
    this.camT = { ...this.cam };
    this.user = { az: 0, el: 0, zoom: 1, px: 0, py: 0, pz: 0 }; this.userT = { ...this.user }; this.sway = 0; this.moved = false;
    this.s = {
      devX: 0, devVis: 1, explode: 0, volt: 0,
      fil: 0.2, heat: 0, cur: 0, filW: 0,
      dope: 0.1, dopeW: 0, alarm: 0, vacW: 1,
      capVis: 0, capQ: 0, capCur: 0,
      torVis: 0, mag: -1, torCur: 0,
      accent: 0, probes: 1,
      bbVis: 0, ledG: 0, ledR: 0, press: 0, dir: 1, bbCur: 0, boxX: 0, part: 0, xray: 0,
    };
    this.sT = { ...this.s };
    this.fast = new Set(['xray', 'fil', 'heat', 'cur', 'dope', 'alarm', 'capQ', 'capCur', 'mag', 'torCur', 'volt', 'ledG', 'ledR', 'press', 'dir', 'bbCur', 'boxX']);
    this.frameMs = 16; this.lastT = 0; this.t0 = performance.now();
    this.visible = true;
    this.onHover = null; this.onAction = null;
    try { this.init(); } catch (e) { console.warn('3D stage unavailable', e); this.ready = Promise.resolve(false); }
  }

  init() {
    const r = new THREE.WebGLRenderer({ canvas: this.cv, antialias: false, powerPreference: 'high-performance', alpha: false });
    this.r = r;
    r.setClearColor(0x07090d, 1);
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.0;
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    const scene = (this.scene = new THREE.Scene());
    scene.background = new THREE.Color(0x07090d);
    scene.fog = new THREE.Fog(0x07090d, 9, 20);
    const pm = new THREE.PMREMGenerator(r);
    scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.42;
    pm.dispose();
    this.camera = new THREE.PerspectiveCamera(28, 1, 0.1, 60);

    this.T = { radial: radialTex() };
    this.lights();
    this.bench();
    this.device();
    this.capacitor();
    this.toroid();
    this.breadboard();
    this.post();

    this.ray = new THREE.Raycaster();
    this.bindPointer();
    addEventListener('resize', () => this.resize());
    document.addEventListener('visibilitychange', () => { if (!document.hidden) this.lastT = 0; });
    if ('IntersectionObserver' in window) new IntersectionObserver((e) => { this.visible = e[0].isIntersecting; }).observe(this.cv);
    this.resize();
    this.applyState(1);
    this.ready = (r.compileAsync ? r.compileAsync(scene, this.camera) : Promise.resolve()).then(() => { this.ok = true; return true; }, () => { this.ok = true; return true; });
  }

  /* lights ------------------------------------------------ */
  lights() {
    const s = this.scene;
    const key = new THREE.DirectionalLight(0xfff1e0, 1.7);
    key.position.set(-3.2, 6, 3.4); key.castShadow = true;
    const sm = this.coarse ? 1024 : 2048;
    key.shadow.mapSize.set(sm, sm); key.shadow.radius = 5; key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
    Object.assign(key.shadow.camera, { left: -3.4, right: 3.4, top: 3, bottom: -3, near: 1, far: 16 });
    s.add(key); this.key = key;
    const rim = new THREE.DirectionalLight(0x7fb4ff, 1.4); rim.position.set(4, 2.5, -4); s.add(rim);
    const fill = new THREE.HemisphereLight(0x8aa0c0, 0x0a0a0c, 0.35); s.add(fill);
    // a soft pool of light over the bench
    const spot = new THREE.SpotLight(0xfff4e8, 7, 12, 0.6, 0.85, 1.6); spot.position.set(0.3, 6.5, 1.2); spot.target.position.set(0, 0, 0);
    s.add(spot, spot.target);
    // light sources that live in the scene: filament glow, two LEDs
    this.gl1 = new THREE.PointLight(0x59d6ff, 0, 3.2, 1.6); s.add(this.gl1);
    this.ledLG = new THREE.PointLight(0x39ff6e, 0, 2.2, 1.8); s.add(this.ledLG);
    this.ledLR = new THREE.PointLight(0xff2a1e, 0, 2.2, 1.8); s.add(this.ledLR);
  }

  /* the lab bench -------------------------------------- */
  bench() {
    const s = this.scene;
    const body = new THREE.Mesh(rbox(5.4, 0.72, 3.0, 0.07, 4), new THREE.MeshPhysicalMaterial({ color: 0x15171c, roughness: 0.45, metalness: 0.15, clearcoat: 0.35, clearcoatRoughness: 0.45 }));
    body.position.y = -0.36; body.receiveShadow = true; body.userData.term = 'bench'; s.add(body);
    // a dark rubber work mat with a printed grid
    const matTex = canvasTex(1024, 576, (g, w, h) => {
      g.fillStyle = '#121519'; g.fillRect(0, 0, w, h);
      g.strokeStyle = 'rgba(120,170,200,.10)'; g.lineWidth = 1;
      for (let x = 0; x <= w; x += 32) { g.beginPath(); g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, h); g.stroke(); }
      for (let y = 0; y <= h; y += 32) { g.beginPath(); g.moveTo(0, y + 0.5); g.lineTo(w, y + 0.5); g.stroke(); }
      g.strokeStyle = 'rgba(120,170,200,.2)';
      for (let x = 0; x <= w; x += 160) { g.beginPath(); g.moveTo(x + 0.5, 0); g.lineTo(x + 0.5, h); g.stroke(); }
      g.fillStyle = 'rgba(140,190,220,.25)'; g.font = '600 15px ui-monospace,Menlo,monospace'; g.fillText('ESD SAFE · MEMRISTOR LAB', 18, h - 16);
    });
    const mat = new THREE.Mesh(rbox(5.0, 0.02, 2.66, 0.008, 2), new THREE.MeshStandardMaterial({ color: 0xffffff, map: matTex, roughness: 0.92 }));
    mat.position.y = 0.0; mat.receiveShadow = true; mat.userData.term = 'bench'; s.add(mat);
    this.benchTop = 0.01;
    const strip = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.025, 0.012), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.4, 1.6, 2.2), toneMapped: false }));
    strip.position.set(0, -0.2, 1.505); s.add(strip); this.strip = strip;
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ color: 0x07080b, roughness: 0.55, metalness: 0.3 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -0.72; floor.receiveShadow = true; s.add(floor);
  }

  /* crossbar memristor cell ---------------------------- */
  device() {
    const g = (this.gDev = new THREE.Group()); this.scene.add(g);
    const pt = new THREE.MeshPhysicalMaterial({ color: 0xc8ccd3, metalness: 1, roughness: 0.2, clearcoat: 0.2 });
    const tin = new THREE.MeshPhysicalMaterial({ color: 0xd9b27a, metalness: 1, roughness: 0.28 });
    const be = new THREE.Mesh(rbox(2.0, 0.18, 0.4, 0.03), tin); be.position.y = 0.09 + this.benchTop;
    be.castShadow = be.receiveShadow = true; be.userData.term = 'electrode'; g.add(be); this.be = be;
    const te = new THREE.Mesh(rbox(0.4, 0.18, 2.0, 0.03), pt); te.castShadow = te.receiveShadow = true; te.userData.term = 'electrode';
    const teG = (this.teG = new THREE.Group()); teG.add(te); g.add(teG);
    // contact pads and probes
    const padM = new THREE.MeshPhysicalMaterial({ color: 0xc9ccd2, metalness: 1, roughness: 0.15 });
    const pad1 = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.03, 40), padM); pad1.position.set(0, 0.105, 0.82); teG.add(pad1);
    const pad2 = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.03, 40), padM); pad2.position.set(-0.82, 0.195 + this.benchTop, 0); g.add(pad2);
    const armM = new THREE.MeshPhysicalMaterial({ color: 0x1c1f26, metalness: 0.6, roughness: 0.35, clearcoat: 0.6 });
    const needleM = new THREE.MeshPhysicalMaterial({ color: 0xffffff, metalness: 1, roughness: 0.08 });
    const probe = (parent, base, dir) => {
      const grp = new THREE.Group(); parent.add(grp);
      const tip = base.clone(), elbow = base.clone().add(dir.clone().multiplyScalar(0.55)).add(V3(0, 0.42, 0)), end = elbow.clone().add(dir.clone().multiplyScalar(0.9)).add(V3(0, 0.1, 0));
      const nd = new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(tip, elbow), 1, 0.011, 8), needleM);
      const arm = new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(elbow, end), 1, 0.05, 20), armM);
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.075, 24, 16), armM); knob.position.copy(elbow);
      for (const m of [nd, arm, knob]) { m.castShadow = true; m.userData.term = 'probe'; grp.add(m); }
      return grp;
    };
    this.probeA = probe(teG, V3(0, 0.12, 0.82), V3(0, 0, 1));
    this.probeB = probe(g, V3(-0.82, 0.21 + this.benchTop, 0), V3(-1, 0, 0));
    // the oxide: a block of glass
    const oxG = (this.oxG = new THREE.Group()); g.add(oxG);
    const glass = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 1, thickness: 0.8, ior: 1.45, roughness: 0.04, attenuationColor: new THREE.Color(0xd5ebff), attenuationDistance: 2.2, dispersion: 0.35, specularIntensity: 1, clearcoat: 1, clearcoatRoughness: 0.02, depthWrite: false });
    const ox = new THREE.Mesh(rbox(0.8, 0.52, 0.8, 0.035, 4), glass); ox.userData.term = 'oxide'; oxG.add(ox); this.ox = ox;
    // filament: a glowing cone of oxygen vacancies (unit height, scaled each frame)
    const fg = new THREE.CylinderGeometry(0.04, 0.13, 1, 40, 24, true); fg.translate(0, 0.5, 0);
    this.fil = new THREE.Mesh(fg, glowMat(0x5ad8ff, { core: 2.2, rim: 0.4, flow: 140 })); this.fil.position.y = -0.26; this.fil.userData.term = 'filament'; oxG.add(this.fil);
    const cg = new THREE.CylinderGeometry(0.012, 0.045, 1, 20, 1, true); cg.translate(0, 0.5, 0);
    this.filCore = new THREE.Mesh(cg, glowMat(0xd9f6ff, { core: 1.5, rim: 0 })); this.filCore.position.y = -0.26; oxG.add(this.filCore);
    this.gapSpark = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 1, 10, 1, true), glowMat(0xbfeaff, { core: 1, rim: 0 })); oxG.add(this.gapSpark);
    this.heatGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.T.radial, color: 0xff7a2a, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false }));
    this.heatGlow.scale.set(0.5, 0.5, 1); oxG.add(this.heatGlow);
    // HP doped region and its wall
    const dg = new THREE.BoxGeometry(0.74, 1, 0.74); dg.translate(0, 0.5, 0);
    this.dope = new THREE.Mesh(dg, glowMat(0xffa23a, { core: 0.6, rim: 0.6 })); this.dope.position.y = -0.255; oxG.add(this.dope);
    this.wall = new THREE.Mesh(new THREE.PlaneGeometry(0.74, 0.74), glowMat(0xffd27a, { core: 0.2, rim: 0 })); this.wall.rotation.x = -Math.PI / 2; this.wall.material.side = THREE.DoubleSide; oxG.add(this.wall);
    // vacancies and oxygen ions: points animated on the GPU
    const N = 1400, pos = new Float32Array(N * 3), rnd = new Float32Array(N * 4), kind = new Float32Array(N);
    for (let k = 0; k < N; k++) {
      pos[k * 3] = (Math.random() * 2 - 1) * 0.36; pos[k * 3 + 1] = (Math.random() * 2 - 1) * 0.24; pos[k * 3 + 2] = (Math.random() * 2 - 1) * 0.36;
      rnd[k * 4] = Math.random(); rnd[k * 4 + 1] = Math.random(); rnd[k * 4 + 2] = Math.random(); rnd[k * 4 + 3] = Math.random();
      kind[k] = k < N * 0.72 ? 0 : 1;
    }
    // bias the vacancies toward the filament cone
    for (let k = 0; k < N * 0.45; k++) {
      const h = Math.random(), rad = (0.13 - 0.09 * h) * Math.sqrt(Math.random()), a = Math.random() * 6.283;
      pos[k * 3] = Math.cos(a) * rad; pos[k * 3 + 1] = -0.255 + h * 0.5; pos[k * 3 + 2] = Math.sin(a) * rad;
    }
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); pg.setAttribute('aR', new THREE.BufferAttribute(rnd, 4)); pg.setAttribute('aK', new THREE.BufferAttribute(kind, 1));
    this.pts = new THREE.Points(pg, new THREE.ShaderMaterial({
      uniforms: { uT: { value: 0 }, uLen: { value: 0.3 }, uFilW: { value: 0 }, uDope: { value: 0 }, uDopeW: { value: 0 }, uW: { value: 1 }, uPx: { value: 1 } },
      vertexShader: `attribute vec4 aR; attribute float aK; uniform float uT, uLen, uFilW, uDope, uDopeW, uW, uPx; varying vec3 vC; varying float vA;
void main(){
  vec3 p = position + .006*vec3(sin(uT*1.7+aR.x*40.), sin(uT*2.3+aR.y*40.), sin(uT*1.9+aR.z*40.));
  float y01 = (p.y + .26)/.52;
  float a = 0.;
  vec3 c = vec3(.6,.95,1.);
  if (aK < .5) {
    float rad = mix(.135, .05, clamp(y01/max(uLen,.05),0.,1.));
    float inCone = step(length(p.xz), rad) * step(y01, uLen);
    a += uFilW * inCone;
    a += uDopeW * step(y01, uDope) * step(.35, aR.w);
    c = mix(vec3(.55,.92,1.), vec3(1.,.72,.32), uDopeW);
    a = max(a, .18 * step(.9, aR.w));
  } else {
    // oxygen ions gather under the top electrode as the filament grows
    float top = step(1. - .35*uLen, y01) * step(aR.w, .3 + .7*uLen);
    a = uFilW * top;
    c = vec3(1.,.32,.4);
  }
  a *= uW;
  vA = a; vC = c;
  vec4 mv = modelViewMatrix*vec4(p,1.);
  gl_PointSize = a > .01 ? uPx * (4.5 + 2.5*aR.y) / -mv.z * 6. : 0.;
  gl_Position = projectionMatrix*mv; }`,
      fragmentShader: `varying vec3 vC; varying float vA; void main(){ vec2 q = gl_PointCoord*2.-1.; float d = dot(q,q); if (d > 1.) discard; gl_FragColor = vec4(vC * (exp(-d*3.5)*2.2) * vA, 1.); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
    }));
    oxG.add(this.pts);
    for (const m of [this.fil, this.filCore, this.gapSpark, this.dope, this.wall, this.pts]) m.renderOrder = 5;
  }

  /* series capacitor + wire --------------------------- */
  capacitor() {
    const g = (this.gCap = new THREE.Group()); this.scene.add(g);
    const cu = new THREE.MeshPhysicalMaterial({ color: 0xe8a07a, metalness: 1, roughness: 0.22, clearcoat: 0.4 });
    this.capTop = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.08, 64), cu.clone());
    this.capBot = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.08, 64), cu.clone());
    this.capTop.position.y = 0.6; this.capBot.position.y = 0.06;
    const diel = new THREE.MeshPhysicalMaterial({ color: 0x1b2633, roughness: 0.15, metalness: 0, transmission: 0.35, thickness: 0.4, clearcoat: 1 });
    const d = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.44, 64), diel); d.position.y = 0.33;
    this.field = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.44, 48, 1, true), glowMat(0xff7040, { core: 0.4, rim: 1.2 })); this.field.position.y = 0.33;
    for (const m of [this.capTop, this.capBot, d]) { m.castShadow = true; m.receiveShadow = true; m.userData.term = 'capacitor'; g.add(m); }
    g.add(this.field);
    g.position.set(1.3, 0, -0.15);
  }
  capWire() {
    // rebuilt when the device moves: from the top electrode's back end to the capacitor's top plate
    if (this.wireCap) { this.gCap.remove(this.wireCap, this.wireCapF); this.wireCap.geometry.dispose(); }
    const a = V3(this.s.devX - 1.3, 0.8, -0.95 + 0.15), b = V3(0, 0.66, 0);
    const curve = new THREE.CatmullRomCurve3([a, a.clone().add(V3(0, 0.35, 0)), V3((a.x + b.x) / 2, 1.25, (a.z + b.z) / 2), b.clone().add(V3(0, 0.3, 0)), b]);
    const geo = new THREE.TubeGeometry(curve, 80, 0.028, 12);
    this.wireCap = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ color: 0xe8a07a, metalness: 1, roughness: 0.3 }));
    this.wireCap.castShadow = true; this.wireCap.userData.term = 'wire';
    this.wireCapF = new THREE.Mesh(new THREE.TubeGeometry(curve, 80, 0.034, 12), flowMat(0xffd08a));
    this.gCap.add(this.wireCap, this.wireCapF);
    this.wireDevX = this.s.devX;
  }

  /* ferrite core for the Φ-memristor station ------------ */
  toroid() {
    const g = (this.gTor = new THREE.Group()); this.scene.add(g);
    const mat = new THREE.MeshPhysicalMaterial({ color: 0x23252a, roughness: 0.55, metalness: 0.25, clearcoat: 0.3 });
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uMag = { value: -1 }; sh.uniforms.uT = { value: 0 };
      this.torU = sh.uniforms;
      sh.fragmentShader = 'uniform float uMag; uniform float uT;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
  { float u = abs(vUv.x*2.-1.);  // 0 at the top of the ring, 1 at the bottom
    float dom = smoothstep(-.02,.02, (uMag*.5+.5) - u);
    vec3 cA = vec3(.15,.6,1.), cB = vec3(1.,.25,.55);
    float dir = dom > .5 ? 1. : -1.;
    float stripe = pow(.5+.5*sin(vUv.x*75.4 - uT*2.*dir), 16.);
    float wall = exp(-abs((uMag*.5+.5) - u)*70.);
    float grain = fract(sin(dot(floor(vUv*vec2(900.,140.)), vec2(12.9898,78.233)))*43758.5453);
    totalEmissiveRadiance += mix(cA, cB, dom) * (.05 + 1.6*stripe) + vec3(1.,.9,.8)*wall*2.5;
    diffuseColor.rgb *= .85 + .3*grain; }`);
      sh.vertexShader = sh.vertexShader.replace('#include <uv_pars_vertex>', '#include <uv_pars_vertex>\nvarying vec2 vUv;').replace('#include <uv_vertex>', '#include <uv_vertex>\nvUv = uv;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <uv_pars_fragment>', '#include <uv_pars_fragment>\nvarying vec2 vUv;');
    };
    const tor = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.15, 48, 160), mat);
    tor.rotation.y = Math.PI / 2; tor.rotation.z = Math.PI / 2; tor.position.y = 0.62; tor.castShadow = true; tor.userData.term = 'ferrite'; g.add(tor);
    const cu = new THREE.MeshPhysicalMaterial({ color: 0xe8a07a, metalness: 1, roughness: 0.25 });
    const line = new THREE.LineCurve3(V3(-1.6, 0.62, 0), V3(1.6, 0.62, 0));
    const w = new THREE.Mesh(new THREE.TubeGeometry(line, 1, 0.03, 16), cu); w.castShadow = true; w.userData.term = 'wire'; g.add(w);
    this.torFlow = new THREE.Mesh(new THREE.TubeGeometry(line, 1, 0.036, 16), flowMat(0xffd08a)); this.torFlow.material.uniforms.uK.value = 60; g.add(this.torFlow);
    const standM = new THREE.MeshPhysicalMaterial({ color: 0x1c1f26, metalness: 0.5, roughness: 0.35 });
    for (const x of [-1.5, 1.5]) { const s = new THREE.Mesh(rbox(0.12, 0.62, 0.12, 0.03), standM); s.position.set(x, 0.31, 0); s.castShadow = true; g.add(s); }
    const s2 = new THREE.Mesh(rbox(0.2, 0.33, 0.2, 0.04), standM); s2.position.set(0, 0.165, 0); s2.castShadow = true; g.add(s2);
  }

  /* the breadboard circuit ---------------------------- */
  breadboard() {
    const g = (this.gBB = new THREE.Group()); this.scene.add(g);
    const bd = new THREE.Group(); bd.position.set(0.55, this.benchTop, 0.05); g.add(bd); this.bd = bd;
    const top = BB.H;
    const hole = (c, r) => V3(colX(c), top, (typeof r === 'string' ? ROWS[r] : r) * P);
    const tex = breadboardTextures();
    const white = new THREE.MeshPhysicalMaterial({ color: 0xf3f2ec, roughness: 0.62, clearcoat: 0.08, sheen: 0.3, sheenColor: new THREE.Color(0xffffff) });
    const body = new THREE.Mesh(rbox(BB.L, BB.H, BB.W, 0.03, 3), white);
    body.position.y = BB.H / 2; body.castShadow = body.receiveShadow = true; body.userData.term = 'breadboard'; bd.add(body);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(BB.L - 0.03, BB.W - 0.03), new THREE.MeshStandardMaterial({ map: tex.color, bumpMap: tex.bump, bumpScale: 1.4, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -1 }));
    face.rotation.x = -Math.PI / 2; face.position.y = BB.H + 0.0005; face.receiveShadow = true; face.userData.term = 'breadboard'; bd.add(face);
    // little dovetail notches on the sides, like the real thing
    const notchM = new THREE.MeshStandardMaterial({ color: 0xdedcd4, roughness: 0.7 });
    for (const x of [-1.2, -0.4, 0.4, 1.2]) for (const z of [-1, 1]) { const n = new THREE.Mesh(new THREE.BoxGeometry(0.16, BB.H * 0.8, 0.012), notchM); n.position.set(x, BB.H / 2, z * (BB.W / 2 + 0.004)); bd.add(n); }

    // what's inside: metal spring strips under the holes (seen in x-ray mode)
    white.transparent = true; face.material.transparent = true;
    this.bbBodyM = white; this.bbFaceM = face.material;
    const stripM = new THREE.MeshStandardMaterial({ color: 0xd6dbe2, metalness: 1, roughness: 0.3, emissive: new THREE.Color(0.2, 0.7, 1), emissiveIntensity: 0 });
    const railM = stripM.clone(); railM.emissive = new THREE.Color(1, 0.35, 0.3);
    const strips = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), stripM, 60);
    const mtx = new THREE.Matrix4(); let n = 0;
    for (let c = 1; c <= 30; c++) for (const [r0, r1] of [['a', 'e'], ['f', 'j']]) {
      const z = (ROWS[r0] + ROWS[r1]) / 2 * P;
      mtx.compose(V3(colX(c), BB.H - 0.07, z), new THREE.Quaternion(), V3(0.055, 0.035, 4 * P + 0.07)); strips.setMatrixAt(n++, mtx);
    }
    const rails = new THREE.Group();
    for (const k in RAIL) {
      const len = colX(30) - colX(2) + 0.07;
      const m = new THREE.Mesh(new THREE.BoxGeometry(len, 0.035, 0.055), k === 'tp' || k === 'bp' ? railM : stripM);
      m.position.set((colX(30) + colX(2)) / 2, BB.H - 0.07, RAIL[k] * P); rails.add(m);
    }
    const inside = (this.bbInside = new THREE.Group()); inside.add(strips, rails); inside.visible = false; bd.add(inside);
    this.stripM = stripM; this.railM = railM;
    strips.userData.term = 'strip'; rails.children.forEach((m) => (m.userData.term = 'rail'));
    const metal = new THREE.MeshPhysicalMaterial({ color: 0xd8dadf, metalness: 1, roughness: 0.25 });
    const tinned = new THREE.MeshPhysicalMaterial({ color: 0xc8cacc, metalness: 1, roughness: 0.35 });
    const leg = (a, b, r = 0.011) => { const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.LineCurve3(a, b), 1, r, 8), metal); m.castShadow = true; return m; };
    // a lead that comes out of a part, bends, and goes straight down into a hole
    const bentLead = (from, toHole, r = 0.011) => {
      const corner = V3(toHole.x, from.y, toHole.z);
      const path = new THREE.CurvePath();
      const k = V3(from.x + (corner.x - from.x) * 0.85, from.y, from.z + (corner.z - from.z) * 0.85);
      path.add(new THREE.LineCurve3(from, k));
      path.add(new THREE.QuadraticBezierCurve3(k, corner, V3(toHole.x, from.y - 0.05, toHole.z)));
      path.add(new THREE.LineCurve3(V3(toHole.x, from.y - 0.05, toHole.z), V3(toHole.x, toHole.y - 0.06, toHole.z)));
      const m = new THREE.Mesh(new THREE.TubeGeometry(path, 40, r, 8), metal); m.castShadow = true; return m;
    };

    // jumper wires: insulated, stripped tinned ends going into holes
    this.flows = [];
    const jumper = (a, b, color, h, sign = 1) => {
      const up = 0.06;
      const A = a.clone().add(V3(0, up, 0)), B = b.clone().add(V3(0, up, 0));
      const len = A.distanceTo(B), hh = h ?? 0.12 + len * 0.16;
      const pts = [A, A.clone().add(V3(0, hh * 0.65, 0)), V3((A.x + B.x) / 2, Math.max(A.y, B.y) + hh, (A.z + B.z) / 2), B.clone().add(V3(0, hh * 0.65, 0)), B];
      const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
      const ins = new THREE.MeshPhysicalMaterial({ color, roughness: 0.38, clearcoat: 0.5, clearcoatRoughness: 0.3 });
      const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 64, 0.03, 12), ins); m.castShadow = true; m.userData.term = 'jumper';
      const f = new THREE.Mesh(new THREE.TubeGeometry(curve, 64, 0.036, 12), flowMat(0xfff0c0)); f.userData.sign = sign;
      f.material.uniforms.uK.value = 10 + len * 12;
      bd.add(m, f); this.flows.push(f);
      for (const p of [a, b]) { const t = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, up + 0.06, 8), tinned); t.position.set(p.x, p.y + (up - 0.06) / 2, p.z); bd.add(t); }
      return m;
    };

    // --- 12 mm tactile push button straddling the trench (cols 4–6)
    const btn = new THREE.Group(); btn.position.copy(hole(5, 0)); bd.add(btn); this.btnG = btn;
    const blk = new THREE.MeshPhysicalMaterial({ color: 0x141518, roughness: 0.45, clearcoat: 0.2 });
    const bb1 = new THREE.Mesh(rbox(0.48, 0.15, 0.48, 0.02), blk); bb1.position.y = 0.075; bb1.castShadow = true;
    const plate = new THREE.Mesh(rbox(0.46, 0.02, 0.46, 0.008), metal); plate.position.y = 0.16;
    const capM = new THREE.MeshPhysicalMaterial({ color: 0x2a64e0, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.2 });
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.18, 0.15, 48), capM); cap.position.y = 0.245; cap.castShadow = true;
    const capTop = new THREE.Mesh(new THREE.SphereGeometry(0.17, 48, 12, 0, Math.PI * 2, 0, 0.35), capM); capTop.position.y = 0.16; cap.add(capTop);
    this.btnCap = cap;
    for (const m of [bb1, plate, cap, capTop]) { m.userData.term = 'button'; m.userData.action = 'btn'; }
    btn.add(bb1, plate, cap);
    for (const [c, r] of [[4, 'e'], [6, 'e'], [4, 'f'], [6, 'f']]) bd.add(leg(V3(colX(c), top + 0.02, ROWS[r] * P * 1.0), V3(colX(c), top - 0.05, ROWS[r] * P)));

    // --- DPDT slide switch wired as a polarity reverser (cols 9–11)
    const sw = new THREE.Group(); sw.position.copy(hole(10, 0)); bd.add(sw);
    const shell = new THREE.Mesh(rbox(0.5, 0.2, 0.34, 0.015), metal); shell.position.y = 0.1; shell.castShadow = true;
    const swBody = new THREE.Mesh(rbox(0.46, 0.06, 0.3, 0.01), blk); swBody.position.y = 0.205;
    const knob = new THREE.Mesh(rbox(0.09, 0.14, 0.11, 0.02), new THREE.MeshPhysicalMaterial({ color: 0xf0f0ea, roughness: 0.4, clearcoat: 0.4 }));
    knob.position.y = 0.27; knob.castShadow = true; this.swKnob = knob;
    for (const m of [shell, swBody, knob]) { m.userData.term = 'switch'; m.userData.action = 'sw'; }
    sw.add(shell, swBody, knob);
    for (const c of [9, 10, 11]) for (const r of ['e', 'f']) bd.add(leg(V3(colX(c), top + 0.02, ROWS[r] * P), V3(colX(c), top - 0.05, ROWS[r] * P)));

    // --- the black box "M?": a two-pin module (pins at c14 and c18)
    const box = new THREE.Group(); box.position.copy(hole(16, 'c')); bd.add(box); this.boxG = box;
    const epoxy = new THREE.MeshPhysicalMaterial({ color: 0x0b0c0f, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.08 });
    const bx = new THREE.Mesh(rbox(0.52, 0.26, 0.34, 0.035, 4), epoxy); bx.position.y = 0.19; bx.castShadow = true;
    const decal = canvasTex(512, 336, (gg, w, h) => {
      gg.clearRect(0, 0, w, h);
      gg.fillStyle = '#e9e7df'; gg.font = '800 112px Arial, Helvetica, sans-serif'; gg.textBaseline = 'middle'; gg.fillText('M?', 34, h * 0.42);
      gg.font = '600 26px Arial, Helvetica, sans-serif'; gg.fillStyle = 'rgba(233,231,223,.7)'; gg.fillText('IDEAL MEMRISTOR', 36, h * 0.78);
      gg.fillText('v = M(q)·i', 36, h * 0.9);
      gg.beginPath(); gg.arc(w - 46, 40, 10, 0, 7); gg.fill();          // pin-1 dot
    });
    const logo = canvasTex(256, 160, (gg, w, h) => {
      gg.clearRect(0, 0, w, h); gg.strokeStyle = '#fff'; gg.lineWidth = 9; gg.lineCap = 'round'; gg.beginPath();
      for (let k = 0; k <= 200; k++) { const t = (k / 200) * Math.PI * 2, s = Math.sin(t), c = Math.cos(t), d = 1 + s * s; const x = w / 2 + (w * 0.4 * c) / d, y = h / 2 + (h * 0.55 * s * c) / d; k ? gg.lineTo(x, y) : gg.moveTo(x, y); }
      gg.stroke();
    });
    const decalM = new THREE.MeshStandardMaterial({ map: decal, transparent: true, roughness: 0.5, polygonOffset: true, polygonOffsetFactor: -2 });
    const dm = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.29), decalM); dm.rotation.x = -Math.PI / 2; dm.position.set(-0.02, 0.322, 0.0);
    const logoM = new THREE.MeshBasicMaterial({ map: logo, transparent: true, color: new THREE.Color(2, 1.2, 0.4), blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    const lm = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.11), logoM); lm.rotation.x = -Math.PI / 2; lm.position.set(0.15, 0.323, -0.03);
    this.logoM = logoM;
    for (const m of [bx, dm, lm]) { m.userData.term = 'blackbox'; m.userData.action = 'box'; }
    box.add(bx, dm, lm);
    for (const c of [14, 18]) bd.add(leg(V3(colX(c), top + 0.1, ROWS.c * P), V3(colX(c), top - 0.05, ROWS.c * P), 0.013));

    // --- 220 Ω resistor from b18 to b22 (red, red, brown, gold)
    const bands = canvasTex(256, 64, (gg, w, h) => {
      gg.fillStyle = '#d9c39a'; gg.fillRect(0, 0, w, h);
      const band = (x, col, bw = 14) => { gg.fillStyle = col; gg.fillRect(x, 0, bw, h); };
      band(62, '#c3241e'); band(92, '#c3241e'); band(122, '#6b3a17'); band(178, '#c9a13c', 12);
    });
    const prof = []; const LR = 0.26;
    for (let k = 0; k <= 40; k++) { const t = k / 40; const y = (t - 0.5) * LR; const bulge = 0.042 + 0.012 * Math.exp(-Math.pow((Math.abs(t - 0.5) - 0.36) / 0.07, 2)); const end = t < 0.03 || t > 0.97 ? 0.025 : bulge; prof.push(new THREE.Vector2(end, y)); }
    const lathe = new THREE.LatheGeometry(prof, 40); lathe.rotateZ(Math.PI / 2);
    const resM = new THREE.MeshPhysicalMaterial({ map: bands, roughness: 0.35, clearcoat: 0.7, clearcoatRoughness: 0.25 });
    // the lathe's v coordinate runs along its length: rotate the texture so bands wrap around it
    bands.center.set(0.5, 0.5); bands.rotation = Math.PI / 2;
    const res = new THREE.Mesh(lathe, resM);
    const rh = top + 0.13, rx = (colX(18) + colX(22)) / 2;
    res.position.set(rx, rh, ROWS.b * P); res.castShadow = true; res.userData.term = 'resistor'; bd.add(res);
    bd.add(bentLead(V3(rx - LR / 2, rh, ROWS.b * P), hole(18, 'b')));
    bd.add(bentLead(V3(rx + LR / 2, rh, ROWS.b * P), hole(22, 'b')));
    this.resG = res;

    // --- two 5 mm LEDs, back to back: green d22→d23, red a23→a22
    const ledMat = (hex) => new THREE.MeshPhysicalMaterial({ color: hex, transmission: 0.82, thickness: 0.2, roughness: 0.18, ior: 1.5, attenuationColor: new THREE.Color(hex), attenuationDistance: 0.25, emissive: new THREE.Color(hex), emissiveIntensity: 0, clearcoat: 1, clearcoatRoughness: 0.1 });
    const led = (c1, c2, r, hex, term) => {
      const grp = new THREE.Group(); const x = (colX(c1) + colX(c2)) / 2, z = ROWS[r] * P; grp.position.set(x, top + 0.18, z); bd.add(grp);
      const m = ledMat(hex);
      const lens = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.2, 12, 40), m); lens.position.y = 0.12; lens.castShadow = true;
      const flange = new THREE.Mesh(new THREE.CylinderGeometry(0.116, 0.116, 0.04, 40), m); flange.position.y = 0.0;
      // what you see inside: the lead frame (anvil and post) and the chip
      const frameM = new THREE.MeshPhysicalMaterial({ color: 0xbfc3c9, metalness: 1, roughness: 0.3 });
      const anvil = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.03), frameM); anvil.position.set(-0.03, 0.06, 0);
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.12, 0.025), frameM); post.position.set(0.04, 0.05, 0);
      const die = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.012, 0.03), new THREE.MeshBasicMaterial({ color: new THREE.Color(hex).multiplyScalar(0.2), toneMapped: false }));
      die.position.set(-0.03, 0.135, 0);
      for (const o of [lens, flange, anvil, post, die]) o.userData.term = term;
      grp.add(anvil, post, die, flange, lens);
      grp.add(leg(V3(colX(c1) - x, -0.02, 0), V3(colX(c1) - x, -0.24, 0)), leg(V3(colX(c2) - x, -0.02, 0), V3(colX(c2) - x, -0.24, 0)));
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.T.radial, color: hex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false, opacity: 0 }));
      halo.scale.set(0.9, 0.9, 1); halo.position.y = 0.14; grp.add(halo);
      return { grp, m, die, halo };
    };
    this.ledG = led(22, 23, 'd', 0x2bff62, 'led');
    this.ledR = led(23, 22, 'a', 0xff2a1a, 'led');

    // --- jumpers (a correct polarity-reversing circuit)
    jumper(V3(colX(4), top, RAIL.tp * P), hole(4, 'a'), 0xd42a22, 0.12, 1);           // + rail → button
    jumper(hole(6, 'a'), hole(10, 'a'), 0xf2c230, 0.14, 1);                            // button → switch common (top)
    jumper(hole(10, 'j'), V3(colX(10), top, RAIL.bm * P), 0x15161a, 0.12, -1);       // switch common (bottom) → − rail
    jumper(hole(9, 'b'), hole(11, 'h'), 0x2bb24c, 0.2, 1);                             // crossover 1
    jumper(hole(11, 'b'), hole(9, 'h'), 0x2a64e0, 0.27, 1);                            // crossover 2
    jumper(hole(9, 'c'), hole(14, 'b'), 0xf07a1e, 0.16, 1);                            // switch out → box
    jumper(hole(11, 'd'), hole(23, 'e'), 0xf2f2ee, 0.42, -1);                          // LEDs → switch return
    // − rails tied together at the right end
    jumper(V3(colX(29), top, RAIL.tm * P), V3(colX(29), top, RAIL.bm * P), 0x15161a, 0.5, 0);

    // --- 2×AA battery holder beside the board, leads into the + and − rails
    const hold = new THREE.Group(); hold.position.set(-1.85, this.benchTop, 0.05); g.add(hold); this.holdG = hold;
    const trayM = new THREE.MeshPhysicalMaterial({ color: 0x121316, roughness: 0.5, clearcoat: 0.2 });
    const tray = [[1.3, 0.06, 2.34, 0, 0.03, 0], [0.06, 0.34, 2.34, -0.62, 0.17, 0], [0.06, 0.34, 2.34, 0.62, 0.17, 0], [1.3, 0.34, 0.06, 0, 0.17, -1.14], [1.3, 0.34, 0.06, 0, 0.17, 1.14], [0.04, 0.2, 2.2, 0, 0.12, 0]];
    for (const [w, h, d, x, y, z] of tray) { const m = new THREE.Mesh(rbox(w, h, d, 0.015, 2), trayM); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; m.userData.term = 'battery'; hold.add(m); }
    // the battery wrap: canvas aspect matches the cylinder (circumference : length) so print isn't stretched
    const wrap = canvasTex(1024, 1088, (gg, w, h) => {
      const body = gg.createLinearGradient(0, 0, w, 0);
      body.addColorStop(0, '#0c1424'); body.addColorStop(0.5, '#16233b'); body.addColorStop(1, '#0c1424');
      gg.fillStyle = body; gg.fillRect(0, 0, w, h);
      // the + end (top of the canvas) gets a warm band
      const band = gg.createLinearGradient(0, 0, 0, h * 0.26);
      band.addColorStop(0, '#f2c25a'); band.addColorStop(1, '#d99a2b');
      gg.fillStyle = band; gg.fillRect(0, 0, w, h * 0.25);
      gg.fillStyle = '#f5f1e6'; gg.fillRect(0, h * 0.25, w, 8);
      gg.fillStyle = '#5ad8ff'; gg.fillRect(0, h * 0.25 + 14, w, 4);
      // print the same layout twice around the cell so it reads from any side
      for (const u of [0.5, 0.0, 1.0]) {
        gg.save(); gg.translate(u * w, h * 0.62); gg.rotate(-Math.PI / 2);
        gg.textAlign = 'center'; gg.textBaseline = 'middle';
        gg.fillStyle = '#f5f1e6'; gg.font = '900 150px Arial, Helvetica, sans-serif'; gg.fillText('AA', -40, 0);
        gg.font = '700 64px Arial, Helvetica, sans-serif'; gg.fillText('1.5 V', 210, -10);
        gg.font = '600 30px Arial, Helvetica, sans-serif'; gg.fillStyle = 'rgba(245,241,230,.65)'; gg.fillText('LR6 · ALKALINE', 210, 52);
        gg.restore();
        gg.save(); gg.translate(u * w, h * 0.12); gg.rotate(-Math.PI / 2);
        gg.fillStyle = '#3a2508'; gg.font = '900 120px Arial, Helvetica, sans-serif'; gg.textAlign = 'center'; gg.textBaseline = 'middle'; gg.fillText('+', 0, 0);
        gg.restore();
        gg.save(); gg.translate(u * w, h * 0.95); gg.rotate(-Math.PI / 2);
        gg.fillStyle = '#f5f1e6'; gg.font = '900 90px Arial, Helvetica, sans-serif'; gg.textAlign = 'center'; gg.textBaseline = 'middle'; gg.fillText('−', 0, 0);
        gg.restore();
      }
    });
    const cellM = new THREE.MeshPhysicalMaterial({ map: wrap, roughness: 0.28, metalness: 0.25, clearcoat: 1, clearcoatRoughness: 0.07 });
    const steel = new THREE.MeshPhysicalMaterial({ color: 0xdfe2e7, metalness: 1, roughness: 0.16 });
    const darkSteel = new THREE.MeshPhysicalMaterial({ color: 0x9aa0a8, metalness: 1, roughness: 0.3 });
    const insul = new THREE.MeshStandardMaterial({ color: 0x0b0b0d, roughness: 0.6 });
    // body profile with rounded shoulders, revolved (v runs from the − end to the + end)
    const cellProf = []; const R = 0.285, Hh = 0.95, f = 0.03;
    cellProf.push(new THREE.Vector2(R - f, -Hh));
    for (let k = 1; k <= 6; k++) { const a = (k / 6) * Math.PI / 2; cellProf.push(new THREE.Vector2(R - f + Math.sin(a) * f, -Hh + f - Math.cos(a) * f)); }
    for (let k = 1; k < 30; k++) cellProf.push(new THREE.Vector2(R, -Hh + f + (k / 30) * (2 * Hh - 2 * f)));
    for (let k = 0; k <= 6; k++) { const a = (k / 6) * Math.PI / 2; cellProf.push(new THREE.Vector2(R - f + Math.cos(a) * f, Hh - f + Math.sin(a) * f)); }
    const bodyGeo = new THREE.LatheGeometry(cellProf, 72);
    const cell = (x, flip) => {
      const c = new THREE.Group(); c.position.set(x, 0.36, 0); c.rotation.x = Math.PI / 2; if (flip) c.rotation.z = Math.PI; hold.add(c);
      // note: after rotation.x, local +y points along +z (the + end)
      const body = new THREE.Mesh(bodyGeo, cellM); body.castShadow = true;
      const capP = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.255, 0.022, 48), steel); capP.position.y = 0.955;
      const nub = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.108, 0.07, 40), steel); nub.position.y = 1.0;
      const nubTop = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.095, 0.012, 40), steel); nubTop.position.y = 1.04;
      const capN = new THREE.Mesh(new THREE.CylinderGeometry(0.235, 0.235, 0.016, 48), darkSteel); capN.position.y = -0.956;
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.245, 0.012, 8, 48), insul); ring.rotation.x = Math.PI / 2; ring.position.y = -0.95;
      for (const m of [body, capP, nub, nubTop, capN, ring]) { m.userData.term = 'battery'; c.add(m); }
      // holder contacts: a flat tab at the + end, a spring at the − end
      const tab = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.02, 0.24), steel); tab.position.y = 1.07; c.add(tab);
      const pts = []; for (let k = 0; k <= 160; k++) { const t = k / 160, r = 0.13 - 0.05 * t; pts.push(V3(Math.cos(t * 34) * r, -0.97 - t * 0.14, Math.sin(t * 34) * r)); }
      const spring = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 260, 0.012, 6), steel); c.add(spring);
    };
    cell(-0.3, false); cell(0.3, true);
    // battery leads: from the holder end, along the bench, up onto the + and − rails
    const lead = (from, to, color) => {
      const pts = [from, from.clone().add(V3(0, 0.05, 0.2)), V3(from.x + 0.4, 0.06, from.z + 0.35), V3(to.x - 0.35, to.y + 0.35, to.z), to.clone().add(V3(0, 0.08, 0))];
      const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'centripetal'), 80, 0.032, 12), new THREE.MeshPhysicalMaterial({ color, roughness: 0.38, clearcoat: 0.5 }));
      m.castShadow = true; m.userData.term = 'jumper'; g.add(m);
      const tin = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.14, 8), tinned); tin.position.set(to.x, to.y + 0.01, to.z); g.add(tin);
    };
    const bdW = (c, z) => V3(0.55 + colX(c), this.benchTop + top, 0.05 + z * P);
    lead(V3(-1.62, 0.3, -1.12), bdW(2, RAIL.tp), 0xd42a22);
    lead(V3(-1.62, 0.22, -1.12), bdW(2, RAIL.tm), 0x15161a);
  }

  /* post-processing ------------------------------------ */
  post() {
    const ringTex = canvasTex(256, 256, (g, w) => { g.strokeStyle = '#fff'; g.lineWidth = 10; g.beginPath(); g.arc(w / 2, w / 2, w * 0.4, 0, 7); g.stroke(); g.globalAlpha = 0.35; g.lineWidth = 26; g.beginPath(); g.arc(w / 2, w / 2, w * 0.4, 0, 7); g.stroke(); });
    this.hl = new THREE.Sprite(new THREE.SpriteMaterial({ map: ringTex, color: new THREE.Color(0.6, 1.6, 2.2), blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, transparent: true, toneMapped: false, opacity: 0 }));
    this.hl.renderOrder = 20; this.scene.add(this.hl); this.hlName = null;
    const r = this.r;
    const rt = new THREE.WebGLRenderTarget(2, 2, { type: THREE.HalfFloatType, samples: 4 });
    const comp = (this.comp = new EffectComposer(r, rt));
    comp.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.5, 0.42, 1.2);
    comp.addPass(this.bloom);
    comp.addPass(new OutputPass());
    this.grade = new ShaderPass({
      uniforms: { tDiffuse: { value: null }, uT: { value: 0 }, uRes: { value: new THREE.Vector2(1, 1) } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: `uniform sampler2D tDiffuse; uniform float uT; uniform vec2 uRes; varying vec2 vUv;
float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
void main(){ vec2 d = vUv - .5;
  vec3 c = texture2D(tDiffuse, vUv).rgb;
  // a touch of lens fringing toward the corners
  float ca = dot(d,d) * .006;
  c.r = texture2D(tDiffuse, vUv + d*ca).r; c.b = texture2D(tDiffuse, vUv - d*ca).b;
  c *= mix(1., .62, smoothstep(.25, .95, length(d*vec2(1.1,1.))));
  c += (h(vUv*uRes + fract(uT)*100.) - .5) * .018;
  gl_FragColor = vec4(c, 1.); }`,
    });
    comp.addPass(this.grade);
  }

  /* pointer: orbit, pinch-zoom, pan, hover definitions, press parts --- */
  bindPointer() {
    const el = this.cv; let act = null, lastHover = 0;
    const pts = new Map();           // active pointers
    let drag = null, pinch = null;
    const pick = (e) => {
      const r = el.getBoundingClientRect();
      const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      this.ray.setFromCamera(ndc, this.camera);
      const roots = [this.gDev, this.gCap, this.gTor, this.gBB].filter((g) => g.visible);
      const hits = this.ray.intersectObjects(roots, true);
      for (const h of hits) { let o = h.object; while (o && !o.userData.term) o = o.parent; if (o && o.visible !== false) return o.userData; }
      return null;
    };
    const U = this.userT;
    const startPinch = () => {
      const [a, b] = [...pts.values()];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y) || 1, zoom: U.zoom, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
      drag = null;
    };
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    el.addEventListener('pointerdown', (e) => {
      el.setPointerCapture(e.pointerId);
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      this.interacted();
      if (pts.size === 2) { if (act) { this.onAction && this.onAction(act, false); act = null; } startPinch(); return; }
      if (pts.size > 2) return;
      const u = this.ok ? pick(e) : null;
      if (u && u.action && e.button === 0) { act = u.action; this.onAction && this.onAction(act, true); e.preventDefault(); return; }
      if (u && e.pointerType !== 'mouse') this.onHover && this.onHover(u.term, e.clientX, e.clientY, true);
      drag = { x: e.clientX, y: e.clientY, pan: e.button === 2 || e.shiftKey };
      this.dragging = true;
    });
    el.addEventListener('pointermove', (e) => {
      if (pts.has(e.pointerId)) pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && pts.size >= 2) {
        const [a, b] = [...pts.values()];
        const d = Math.hypot(a.x - b.x, a.y - b.y) || 1, mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        U.zoom = Math.max(0.35, Math.min(2.2, pinch.zoom * pinch.d / d));
        this.panBy(mx - pinch.mx, my - pinch.my); pinch.mx = mx; pinch.my = my;
        return;
      }
      if (drag) {
        const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
        if (drag.pan) this.panBy(dx, dy);
        else { U.az -= dx * 0.0065; U.el = Math.max(-0.35, Math.min(0.95, U.el + dy * 0.0045)); }
        return;
      }
      if (act || e.pointerType !== 'mouse') return;
      const now = performance.now(); if (now - lastHover < 60) return; lastHover = now;
      const u = this.ok ? pick(e) : null;
      el.style.cursor = u && u.action ? 'pointer' : 'grab';
      this.onHover && this.onHover(u ? u.term : null, e.clientX, e.clientY, false);
    });
    const up = (e) => {
      pts.delete(e.pointerId);
      if (act && pts.size === 0) { this.onAction && this.onAction(act, false); act = null; }
      if (pts.size < 2) pinch = null;
      if (pts.size === 1) { const p = [...pts.values()][0]; drag = { x: p.x, y: p.y, pan: false }; }
      if (pts.size === 0) { drag = null; this.dragging = false; }
    };
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    el.addEventListener('pointerleave', () => { if (!drag && !act) this.onHover && this.onHover(null); });
    el.addEventListener('wheel', (e) => {
      e.preventDefault(); this.interacted();
      const k = e.ctrlKey ? 0.012 : 0.0015;   // trackpad pinch arrives as ctrl+wheel
      U.zoom = Math.max(0.35, Math.min(2.2, U.zoom * Math.exp(e.deltaY * k)));
    }, { passive: false });
    el.addEventListener('dblclick', () => this.resetView());
  }
  // move the look-at point in the screen plane (pixels → world)
  panBy(dx, dy) {
    const U = this.userT, k = (this.cam.dist * U.zoom) / Math.max(300, this.cssH) * 0.55;
    const az = this.cam.az + this.user.az;
    U.px += (-dx * Math.cos(az)) * k; U.pz += (dx * Math.sin(az)) * k; U.py += dy * k;
    const lim = 2.4; U.px = Math.max(-lim, Math.min(lim, U.px)); U.pz = Math.max(-lim, Math.min(lim, U.pz)); U.py = Math.max(-0.8, Math.min(1.6, U.py));
  }
  zoomBy(f) { this.interacted(); this.userT.zoom = Math.max(0.35, Math.min(2.2, this.userT.zoom * f)); }
  resetView() { Object.assign(this.userT, { az: 0, el: 0, zoom: 1, px: 0, py: 0, pz: 0 }); this.moved = false; }
  interacted() { this.moved = true; }
  setQuality(q) {
    this.quality = q;
    if (!this.r) return;
    if (q === 'high') { this.fixed = true; this.scale = 1; }
    else if (q === 'low') { this.fixed = true; this.scale = 0.55; }
    else { this.fixed = false; }
    this.bloom.enabled = q !== 'low';
    this.key.castShadow = q !== 'low';
    this.resize();
  }

  resize() {
    if (!this.r) return;
    const rc = this.cv.getBoundingClientRect();
    this.cssW = Math.max(2, rc.width); this.cssH = Math.max(2, rc.height);
    const pr = this.maxDpr * this.scale;
    this.r.setPixelRatio(pr); this.r.setSize(this.cssW, this.cssH, false);
    this.comp.setPixelRatio(pr); this.comp.setSize(this.cssW, this.cssH);
    this.bloom.resolution.set(this.cssW * pr * 0.5, this.cssH * pr * 0.5);
    this.grade.uniforms.uRes.value.set(this.cssW * pr, this.cssH * pr);
    this.camera.aspect = this.cssW / this.cssH;
    this.updateView();
  }
  updateView() {
    const W = this.cssW, H = this.cssH;
    this.camera.setViewOffset(W, H, (0.5 - this.center[0]) * W, (this.center[1] - 0.5) * H, W, H);
    this.camera.updateProjectionMatrix();
  }

  // fly the camera to a named part and ring it
  focus(name, zoom = 0.5) {
    const p = this.anchor(name), c = this.camT;
    Object.assign(this.userT, { px: p[0] - c.tx, py: p[1] - c.ty, pz: p[2] - c.tz, zoom });
    this.moved = true; this.highlight(name);
  }
  highlight(name) { this.hlName = name; this.hlT = performance.now(); }
  set(obj) { Object.assign(this.sT, obj); }
  setNow(obj) { Object.assign(this.sT, obj); Object.assign(this.s, obj); }
  view(v) { Object.assign(this.camT, v); }

  placeCamera() {
    const c = this.cam;
    const U = this.user;
    const az = c.az + U.az + this.sway, el = Math.max(-0.25, Math.min(1.3, c.el + U.el)), d = c.dist * U.zoom;
    const tx = c.tx + U.px, ty = c.ty + U.py, tz = c.tz + U.pz;
    this.camera.position.set(tx + d * Math.cos(el) * Math.sin(az), Math.max(0.15, ty + d * Math.sin(el)), tz + d * Math.cos(el) * Math.cos(az));
    this.camera.lookAt(tx, ty, tz);
    this.camera.updateMatrixWorld();
  }
  project(p) {
    if (!this.r) return { x: 0, y: 0, z: -1 };
    const v = V3(p[0], p[1], p[2]);
    const z = v.clone().sub(this.camera.position).dot(this.camera.getWorldDirection(V3()));
    v.project(this.camera);
    return { x: (v.x + 1) / 2 * this.cssW, y: (1 - v.y) / 2 * this.cssH, z };
  }
  anchor(name) {
    const w = (o, off = [0, 0, 0]) => { if (!o) return [0, 0, 0]; const v = o.localToWorld(V3(...off)); return [v.x, v.y, v.z]; };
    const s = this.s, len = 0.52 * (0.08 + 0.86 * s.fil);
    switch (name) {
      case 'te': return w(this.teG, [0, 0.12, -0.55]);
      case 'be': return w(this.be, [-0.7, 0.1, 0.1]);
      case 'ox': return w(this.oxG, [0.4, 0.12, 0.4]);
      case 'fil': return w(this.oxG, [0, -0.26 + len * 0.45, 0]);
      case 'gap': return w(this.oxG, [0, -0.26 + len + (0.52 - len) * 0.5, 0]);
      case 'wall': return w(this.oxG, [-0.4, -0.26 + 0.52 * s.dope, 0.4]);
      case 'cap': return w(this.capTop, [0, 0.05, 0.4]);
      case 'tor': return w(this.gTor, [0, 1.19, 0]);
      case 'wire': return w(this.gTor, [1.2, 0.62, 0]);
      case 'btn': return w(this.btnCap, [0, 0.12, 0]);
      case 'sw': return w(this.swKnob, [0, 0.08, 0]);
      case 'box': return w(this.boxG, [0, 0.34, 0]);
      case 'ledg': return w(this.ledG && this.ledG.grp, [0, 0.3, 0]);
      case 'ledr': return w(this.ledR && this.ledR.grp, [0, 0.3, 0]);
      case 'bat': return w(this.holdG, [0, 0.7, 0]);
      case 'res': return w(this.resG, [0, 0.08, 0]);
      case 'board': return w(this.bd, [0, BB.H, 0]);
      case 'railT': return w(this.bd, [colX(18), BB.H, RAIL.tp * P]);
      case 'railB': return w(this.bd, [colX(18), BB.H, RAIL.bp * P]);
      case 'strip': return w(this.bd, [colX(27), BB.H, ROWS.c * P]);
      case 'stripB': return w(this.bd, [colX(27), BB.H, ROWS.h * P]);
      case 'trench': return w(this.bd, [colX(27), BB.H, 0]);
      case 'jumper': return w(this.bd, [(colX(11) + colX(23)) / 2, BB.H + 0.5, (ROWS.d + ROWS.e) / 2 * P]);
      default: return [0, 0.5, 0];
    }
  }

  /* map state → scene -------------------------------- */
  applyState(t) {
    const s = this.s;
    // groups come down from above and leave upward: nothing ever passes through the bench
    const place = (g, v, x = 0) => {
      const e = easeOut(v);
      g.visible = v > 0.002;
      g.position.y = (1 - e) * 3.4;
      g.position.x = x;
      g.rotation.y = (1 - e) * 0.35;
    };
    place(this.gDev, s.devVis, s.devX);
    place(this.gCap, s.capVis, 1.3); this.gCap.position.z = -0.15;
    place(this.gTor, s.torVis);
    place(this.gBB, s.bbVis);
    // explode
    this.oxG.position.y = 0.44 + this.benchTop + 0.34 * s.explode;
    this.teG.position.y = 0.79 + this.benchTop + 0.78 * s.explode;
    this.probeA.visible = this.probeB.visible = s.probes > 0.5;
    // filament
    const len = 0.52 * (0.08 + 0.86 * s.fil);
    const fw = s.filW;
    this.fil.visible = this.filCore.visible = fw > 0.01;
    this.fil.scale.set(1, len, 1); this.filCore.scale.set(1, len, 1);
    const hot = Math.min(1, s.heat * 1.4);
    const fc = this.fil.material.uniforms;
    fc.uCol.value.setRGB(0.35 + 0.75 * hot, 0.85 - 0.35 * hot, 1.0 - 0.8 * hot);
    fc.uI.value = fw * (0.45 + 0.75 * Math.abs(s.cur) + 0.55 * s.heat);
    fc.uSpd.value = (8 + 40 * Math.abs(s.cur)) * Math.sign(s.cur || 1e-4); fc.uT.value = t;
    this.filCore.material.uniforms.uI.value = fw * (0.3 + 0.9 * Math.abs(s.cur) + 0.7 * s.heat);
    const gapH = 0.52 - len;
    this.gapSpark.visible = fw > 0.01 && Math.abs(s.cur) > 0.02;
    this.gapSpark.scale.set(1, gapH, 1); this.gapSpark.position.y = -0.26 + len + gapH / 2;
    this.gapSpark.material.uniforms.uI.value = fw * Math.abs(s.cur) * (0.35 + 0.25 * Math.sin(t * 40));
    this.heatGlow.position.y = -0.26 + len; this.heatGlow.material.opacity = fw * s.heat * 0.55;
    this.heatGlow.scale.setScalar(0.3 + 0.35 * s.heat);
    // HP doped layer
    const dw = s.dopeW;
    this.dope.visible = this.wall.visible = dw > 0.01;
    this.dope.scale.set(1, Math.max(0.001, 0.51 * s.dope), 1);
    this.dope.material.uniforms.uI.value = dw * 0.22;
    this.wall.position.y = -0.255 + 0.51 * s.dope;
    const wu = this.wall.material.uniforms; wu.uI.value = dw * (0.55 + 0.4 * Math.abs(s.cur));
    wu.uCol.value.setRGB(1, 0.82 - 0.65 * s.alarm * (0.6 + 0.4 * Math.sin(t * 12)), 0.48 - 0.36 * s.alarm);
    const pu = this.pts.material.uniforms;
    pu.uT.value = t; pu.uLen.value = 0.08 + 0.86 * s.fil; pu.uFilW.value = fw; pu.uDope.value = s.dope; pu.uDopeW.value = dw; pu.uW.value = s.vacW;
    pu.uPx.value = this.r.getPixelRatio() * this.cssH / 900 * 1.6;
    // glow light
    this.gl1.color.copy(fc.uCol.value);
    const glowAmt = s.devVis * (fw * (0.25 + 0.9 * Math.abs(s.cur) + 1.4 * s.heat) + dw * 0.5);
    this.gl1.intensity = Math.min(glowAmt, 1.4) * 0.22;
    this.oxG.getWorldPosition(this.gl1.position); this.gl1.position.y += -0.1 + len * 0.6;
    // capacitor
    if (s.capVis > 0.002) {
      if (this.wireDevX === undefined || Math.abs(this.wireDevX - s.devX) > 0.02) this.capWire();
      const q = s.capQ;
      const hotC = new THREE.Color(1, 0.42, 0.25), coldC = new THREE.Color(0.25, 0.6, 1);
      this.capTop.material.emissive.copy(q > 0 ? hotC : coldC); this.capTop.material.emissiveIntensity = Math.abs(q) * 1.6;
      this.capBot.material.emissive.copy(q > 0 ? coldC : hotC); this.capBot.material.emissiveIntensity = Math.abs(q) * 1.6;
      const fu = this.field.material.uniforms; fu.uI.value = Math.abs(q) * 0.7; fu.uCol.value.copy(q > 0 ? hotC : coldC);
      const wf = this.wireCapF.material.uniforms; wf.uI.value = Math.abs(s.capCur) * 2.4; wf.uT.value = t; wf.uDir.value = Math.sign(s.capCur || 1);
    }
    // toroid
    if (this.torU) { this.torU.uMag.value = s.mag; this.torU.uT.value = t; }
    const tf = this.torFlow.material.uniforms; tf.uI.value = Math.abs(s.torCur) * 2.4; tf.uT.value = t; tf.uDir.value = Math.sign(s.torCur || 1);
    // breadboard
    if (s.bbVis > 0.002) {
      this.btnCap.position.y = 0.245 - 0.05 * s.press;
      this.swKnob.position.x = 0.11 * s.dir;
      const L = (o, v, light) => {
        o.m.emissiveIntensity = v * 7;
        o.die.material.color.copy(o.m.color).multiplyScalar(0.25 + v * 14);
        o.halo.material.opacity = v * 0.9; o.halo.scale.setScalar(0.5 + v * 0.9);
        o.grp.getWorldPosition(light.position); light.position.y += 0.2; light.intensity = v * 0.45 * s.bbVis;
      };
      L(this.ledG, s.ledG, this.ledLG); L(this.ledR, s.ledR, this.ledLR);
      for (const f of this.flows) { const u = f.material.uniforms; u.uI.value = Math.abs(s.bbCur) * 2.2 * (f.userData.sign === 0 ? 0.6 : 1); u.uT.value = t; u.uDir.value = Math.sign(s.bbCur || 1) * (f.userData.sign || 1); }
      const lc = s.part === 2 ? new THREE.Color(1.2, 0.9, 2.4) : s.part === 1 ? new THREE.Color(0.25, 0.25, 0.25) : new THREE.Color(2.2, 1.3, 0.4).lerp(new THREE.Color(0.8, 2.0, 2.6), s.boxX);
      this.logoM.color.copy(lc).multiplyScalar(0.25 + 0.9 * (s.part === 1 ? 0.3 : s.boxX));
      const xr = s.xray;
      this.bbInside.visible = xr > 0.01;
      this.bbBodyM.opacity = 1 - 0.86 * xr; this.bbFaceM.opacity = 1 - 0.9 * xr;
      this.bbBodyM.depthWrite = this.bbFaceM.depthWrite = xr < 0.5;
      this.stripM.emissiveIntensity = xr * (0.9 + 0.5 * Math.sin(t * 3)); this.railM.emissiveIntensity = xr * (0.9 + 0.5 * Math.sin(t * 3 + 1));
    } else { this.ledLG.intensity = this.ledLR.intensity = 0; }
    if (this.hlName) {
      const a = this.anchor(this.hlName), age = (performance.now() - this.hlT) / 1000;
      this.hl.position.set(a[0], a[1], a[2]);
      const pulse = 0.5 + 0.5 * Math.sin(age * 5);
      this.hl.material.opacity = Math.max(0, Math.min(1, age * 3)) * (age < 6 ? 0.55 + 0.45 * pulse : Math.max(0, 1 - (age - 6))) ;
      const sc = 0.32 + 0.08 * pulse; this.hl.scale.set(sc, sc, 1);
      if (age > 7) this.hlName = null;
    } else this.hl.material.opacity = 0;
    // the bench's LED strip follows the accent
    this.strip.material.color.setRGB(0.4 + 1.6 * s.accent, 1.6 - 0.8 * s.accent, 2.2 - 1.8 * s.accent);
  }

  frame(now) {
    const dt = this.lastT ? Math.min(0.1, (now - this.lastT) / 1000) : 1 / 60;
    if (this.lastT) this.frameMs += ((now - this.lastT) - this.frameMs) * 0.05;
    this.lastT = now;
    const VIS = ['devVis', 'capVis', 'torVis', 'bbVis'];
    const leaving = VIS.some((k) => this.sT[k] < 0.5 && this.s[k] > 0.08);
    for (const k in this.sT) {
      const a = typeof this.sT[k] === 'number' ? this.sT[k] : 0;
      if (leaving && VIS.includes(k) && a > this.s[k]) continue;
      const rate = this.fast.has(k) ? 18 : VIS.includes(k) ? (a < this.s[k] ? 4.2 : 2.4) : 2.6;
      this.s[k] += (a - this.s[k]) * (1 - Math.exp(-rate * dt));
      if (VIS.includes(k) && Math.abs(a - this.s[k]) < 0.001) this.s[k] = a;
    }
    for (const k in this.camT) this.cam[k] += (this.camT[k] - this.cam[k]) * (1 - Math.exp(-2.2 * dt));
    // a gentle idle sway that fades out once the visitor takes control
    this.swayK = (this.swayK ?? 1) + ((this.moved || this.reduced || this.noSway ? 0 : 1) - (this.swayK ?? 1)) * (1 - Math.exp(-1.5 * dt));
    this.sway = this.swayK * 0.28 * Math.sin((now - this.t0) / 1000 * 0.11);
    for (const k in this.userT) this.user[k] += (this.userT[k] - this.user[k]) * (1 - Math.exp(-(this.dragging ? 22 : 7) * dt));
    this.adapt(now);
    if (!this.r) return;
    this.placeCamera();
    if (this.visible && !document.hidden) {
      const t = (now - this.t0) / 1000;
      this.applyState(t);
      this.grade.uniforms.uT.value = t;
      this.comp.render(dt);
    }
  }

  adapt(now) {
    if (this.fixed || !this.r) return;
    if (!this.nextAdapt) this.nextAdapt = now + 2000;
    if (now < this.nextAdapt) return;
    this.nextAdapt = now + 900;
    const ms = this.frameMs; let s = this.scale;
    if (ms > 26) s *= 0.82; else if (ms > 20) s *= 0.92; else if (ms < 17.5) s *= 1.05;
    s = Math.max(0.45, Math.min(1, s));
    if (Math.abs(s - this.scale) > 0.02) { this.scale = s; this.resize(); }
  }
}
