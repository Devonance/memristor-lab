// Memristor Lab — stations, instruments and the frame loop.
import { Stage } from './stage.js';
import { Ideal, HP, Threshold, Filament, Mott, CapTest, WINDOWS, wave, loopArea, elementLoop, clamp } from './models.js';
import { Plot, Scope, Strip, COL, fmt } from './plot.js';
import { TERMS, autoLink } from './glossary.js';
import { initUI } from './ui.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

const stage = new Stage($('#stage'));
window.__stage = stage;
stage.reduced = reduced;
const Q = new URLSearchParams(location.search);
if (Q.has('hq')) { stage.scale = +Q.get('hq') || 1; stage.fixed = true; }
const scope = new Scope($('#scope'));
const p2 = new Plot($('#plot2'));
const strip = new Strip(480);
const sections = $$('.step');

/* ── small UI helpers ─────────────────────────────────── */
function slider(id, show, on) {
  const el = $('#i' + id), out = $('#o' + id);
  const upd = () => {
    const v = +el.value;
    el.style.setProperty('--p', ((v - el.min) / (el.max - el.min)) * 100 + '%');
    if (out) out.textContent = show(v);
    on && on(v);
  };
  el.addEventListener('input', upd); upd();
  return () => +el.value;
}
function seg(id, key, on) {
  const root = $('#' + id);
  root.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b) return;
    $$('button', root).forEach((x) => x.classList.toggle('on', x === b));
    on(b.dataset[key]);
  });
  return () => $('button.on', root).dataset[key];
}
const toggle = (id, on) => { const el = $('#' + id); el.addEventListener('change', () => on(el.checked)); return () => el.checked; };

let roEls = {}, roNext = 0;
function readouts(list) {
  const ro = $('#ro'); ro.innerHTML = ''; roEls = {};
  for (const [k, label] of list) {
    const d = document.createElement('div');
    d.innerHTML = `<small>${label}</small><span>—</span>`;
    ro.appendChild(d); roEls[k] = d.lastChild;
  }
}
function setRO(now, vals) {
  if (now < roNext) return; roNext = now + 110;
  for (const k in vals) if (roEls[k]) roEls[k].innerHTML = vals[k];
}
const u = (v, unit) => `${v}<i>${unit}</i>`;
// set text that may contain jargon: only when it changes, then add the dotted definitions
function setNote(el, html) { if (!el || el._h === html) return; el._h = html; el.innerHTML = html; autoLink(el); }
function heads(scopeTitle, p2Title, cap = '') {
  $('#scopeTitle').textContent = scopeTitle; $('#p2Title').textContent = p2Title; setNote($('#p2Cap'), cap);
  $('#scopeInfo').textContent = ''; $('#p2Info').textContent = '';
}
const info = (t, color) => { const el = $('#scopeInfo'); el.textContent = t; el.style.color = color || ''; };

/* ── labels pinned to the 3D scene ────────────────────── */
const labelsEl = $('#labels');
let labelEls = [];
function setLabels(list = []) {
  labelsEl.innerHTML = '';
  labelEls = list.map((L) => {
    const d = document.createElement(L.hot ? 'button' : 'div');
    d.className = 'lbl' + (L.side === 'l' ? ' l' : '') + (L.hot ? ' hot' : '');
    d.style.color = L.c || COL.cyan;
    d.innerHTML = `<i></i><span>${L.t}${L.s ? `<em>${L.s}</em>` : ''}</span>`;
    d.style.opacity = 0;
    if (L.hot) {
      d.type = 'button'; d.setAttribute('aria-label', L.aria || L.t);
      if (L.down) {
        d.addEventListener('pointerdown', (e) => { e.preventDefault(); d.setPointerCapture(e.pointerId); d.classList.add('down'); L.down(); });
        const up = () => { d.classList.remove('down'); L.up && L.up(); };
        d.addEventListener('pointerup', up); d.addEventListener('pointercancel', up);
        d.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); L.down(); } });
        d.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') up(); });
      }
      if (L.click) d.addEventListener('click', L.click);
    }
    labelsEl.appendChild(d);
    return { el: d, L, w: 0 };
  });
  requestAnimationFrame(() => labelEls.forEach((o) => (o.w = o.el.offsetWidth)));
}
function placeLabels() {
  if (!labelEls.length) return;
  const r = stage.cv.getBoundingClientRect();
  const story = $('#story').getBoundingClientRect(), inst = $('#inst').getBoundingClientRect();
  const placed = [];
  const under = (x, y, l, w) => !mobile && ((l < story.right + 4 && y < story.bottom + 4) || (l + w > inst.left - 4 && y < inst.bottom + 4));
  for (const o of labelEls) {
    const p = stage.project(stage.anchor(o.L.a));
    const x = r.left + p.x, y = r.top + p.y;
    const at = (side) => (side === 'l' ? x - o.w + 3.5 : x - 3.5);
    let side = o.L.side === 'l' ? 'l' : 'r', left = at(side);
    const bad = (l) => under(x, y, l, o.w) || l < 4 || l + o.w > innerWidth - 4;
    if (bad(left)) { const alt = side === 'l' ? 'r' : 'l'; if (!bad(at(alt))) { side = alt; left = at(alt); } }
    // keep labels from sitting on top of each other
    let yy = y;
    for (let k = 0; k < 4; k++) { const hit = placed.find((q) => left < q.r && left + o.w > q.l && Math.abs(yy - q.y) < 24); if (!hit) break; yy = hit.y + (yy >= hit.y ? 25 : -25); }
    placed.push({ l: left, r: left + o.w, y: yy });
    if (o.side !== side) { o.el.classList.toggle('l', side === 'l'); o.side = side; }
    const right = left + o.w;
    const hidden = under(x, y, left, o.w) || under(x, y, x - 2, 4);
    const vis = stage.ok && p.z > 0 && yy > r.top + 40 && yy < (mobile ? sheetY - 8 : r.bottom - 6) && left > 0 && right < innerWidth && !hidden;
    o.el.style.opacity = vis ? (o.L.o ?? 1) : 0;
    o.el.style.pointerEvents = vis && o.L.hot ? 'auto' : 'none';
    if (o.L.text) { const t = o.L.text(); if (t !== o.last) { o.el.querySelector('span').innerHTML = t; o.last = t; o.w = o.el.offsetWidth; } }
    o.el.style.transform = `translate(${left}px,${yy - 7}px)`;
  }
}

/* ── periodic drive: constant visual speed, any physical frequency ── */
const manual = { on: false, v: 0, cur: 0 };
class Driver {
  constructor() { this.ph = 0; }
  run(dt, { A, f, shape = 'sine', cps = 0.33, spp = 700, step }) {
    this.A = A;
    const dph = dt * cps, n = Math.max(1, Math.ceil(dph * spp)), h = dph / n;
    if (manual.on) {
      // the reader is driving: follow their hand, keep the same time base
      for (let k = 0; k < n; k++) { manual.cur += (manual.v - manual.cur) * 0.08; step(manual.cur, h / f); }
      this.ph = 0;
      return;
    }
    for (let k = 0; k < n; k++) { this.ph += h; manual.cur = A * wave(shape, this.ph); step(manual.cur, h / f); }
  }
}

// auto-ranging axis (smooth)
class Range {
  constructor(v) { this.v = v; }
  to(t, k = 0.06) { this.v += (t - this.v) * k; return this.v; }
}
const maxAbs = (arr, i) => arr.reduce((m, p) => Math.max(m, Math.abs(p[i])), 0);

function stripPlot(series, { yr = [-1.1, 1.1], yt = [-1, 0, 1], fy = (v) => v, yl = '' } = {}) {
  const n = strip.n;
  p2.clear().frame({ x: [0, n], y: yr });
  p2.grid({ xt: [], yt, fy, yl, zero: true });
  for (const s of series) {
    const a = strip.get(s.k); const off = n - a.length;
    p2.line(a.map((v, j) => [off + j, s.map ? s.map(v) : v]), { color: s.c, width: s.w || 1.6, glow: 6, alpha: s.a ?? 1 });
  }
}

/* ── drive by hand: press and drag on the scope ───────── */
const scopeEl = $('#scope');
function setManual(e) {
  const r = scopeEl.getBoundingClientRect();
  const lim = ch.manual;
  manual.v = clamp(scope.invX(e.clientX - r.left), -lim, lim);
}
scopeEl.addEventListener('pointerdown', (e) => {
  if (!ch || !ch.manual) return;
  e.preventDefault(); manual.on = true; scopeEl.setPointerCapture(e.pointerId); setManual(e);
});
scopeEl.addEventListener('pointermove', (e) => { if (manual.on) setManual(e); });
const releaseManual = () => {
  if (!manual.on) return;
  manual.on = false;
  // resume the sine from the phase that matches where the hand left it
  const a = drv.A || 1; drv.ph = Math.asin(clamp(manual.cur / a, -1, 1)) / (2 * Math.PI);
};
scopeEl.addEventListener('pointerup', releaseManual); scopeEl.addEventListener('pointercancel', releaseManual);

/* ── audience: simple / technical ────────────────────── */
const modeEl = $('#mode');
function setMode(m) {
  document.documentElement.dataset.mode = m;
  $$('#mode button, #setMode button').forEach((b) => b.classList.toggle('on', b.dataset.m === m));
  try { localStorage.setItem('ml-mode', m); } catch (e) { /* storage blocked: fine */ }
  requestAnimationFrame(() => labelEls.forEach((o) => (o.w = o.el.offsetWidth)));
}
for (const el of [modeEl, $('#setMode')]) el.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setMode(b.dataset.m); });
setMode(document.documentElement.dataset.mode === 'tech' ? 'tech' : 'simple');

/* ── layout ───────────────────────────────────────────── */
let mobile = false, zoomK = 1;
const p2group = [$('.inst-head.sub'), $('#plot2'), $('#p2Cap'), $('#ro')];
const p2m = document.createElement('div'); p2m.className = 'p2m';
function placeP2() {
  if (mobile && cur >= 0) {
    const sec = sections[cur];
    const anchor = $('.ctl-grid, .seg, .row, .sl, .tog', sec);
    sec.insertBefore(p2m, anchor || null);
    p2group.forEach((e) => p2m.appendChild(e));
  } else if (p2m.parentNode) {
    const inst = $('#inst'); p2group.forEach((e) => inst.appendChild(e)); p2m.remove();
    // keep readouts directly under the scope
    inst.insertBefore($('#ro'), $('.inst-head.sub'));
  }
}
/* mobile: the bench fills the screen and the text lives in a draggable sheet */
const storyEl = $('#story'), grip = $('#grip');
let sheetY = 0, sheetState = 'half', immersive = false;
const snaps = () => ({ peek: innerHeight - 140, half: Math.round(innerHeight * 0.5), full: 54 });
function setSheet(y) {
  sheetY = y;
  document.documentElement.style.setProperty('--sy', y + 'px');
  if (mobile) { stage.center = [0.5, 1 - (46 + y) / 2 / innerHeight]; stage.updateView && stage.updateView(); }
}
function snapSheet(state) { sheetState = state; setSheet(snaps()[state]); }
{
  let d = null;
  grip.addEventListener('pointerdown', (e) => { if (!mobile) return; d = { y: e.clientY, s: sheetY, t: performance.now(), moved: 0 }; grip.setPointerCapture(e.pointerId); storyEl.classList.add('dragging'); });
  grip.addEventListener('pointermove', (e) => { if (!d) return; const dy = e.clientY - d.y; d.moved = Math.max(d.moved, Math.abs(dy)); setSheet(clamp(d.s + dy, 54, innerHeight - 110)); });
  const end = (e) => {
    if (!d) return; storyEl.classList.remove('dragging');
    const dy = e.clientY - d.y, v = dy / Math.max(1, performance.now() - d.t);
    if (d.moved < 6) snapSheet(sheetState === 'full' ? 'half' : sheetState === 'half' ? 'full' : 'half');
    else { const aim = sheetY + v * 220, S = snaps(); snapSheet(Object.keys(S).reduce((a, k) => (Math.abs(S[k] - aim) < Math.abs(S[a] - aim) ? k : a), 'half')); }
    d = null;
  };
  grip.addEventListener('pointerup', end); grip.addEventListener('pointercancel', end);
  grip.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); snapSheet(sheetState === 'full' ? 'half' : 'full'); } });
}
function toggleImmersive() {
  if (mobile) { snapSheet(sheetState === 'peek' ? 'half' : 'peek'); return; }
  immersive = !immersive; document.body.classList.toggle('immersive', immersive); layout();
}
function reveal() { if (mobile) snapSheet('peek'); }
function layout() {
  mobile = innerWidth <= 900;
  stage.resize();
  if (!mobile) {
    if (immersive) { stage.center = [0.5, 0.47]; zoomK = clamp(1100 / innerWidth, 0.8, 1.3); }
    else {
      const s = $('#story').getBoundingClientRect(), I = $('#inst').getBoundingClientRect();
      const L = s.right, R = I.left, gap = Math.max(200, R - L);
      stage.center = [(L + R) / 2 / innerWidth, 0.45];
      zoomK = clamp(860 / gap, 0.9, 2.1) * clamp(800 / innerHeight, 0.85, 1.25);
    }
  } else {
    zoomK = clamp(560 / innerWidth, 1.05, 1.7);
    snapSheet(sheetState);
  }
  placeP2();
  scope.resize(); p2.resize();
  if (ch) applyCam();
}
function applyCam() { stage.view({ ...ch.cam, dist: ch.cam.dist * zoomK }); }

/* ── stations ─────────────────────────────────────────── */
const BASE = { xray: 0, devX: 0, devVis: 1, explode: 0, filW: 0, dopeW: 0, vacW: 1, capVis: 0, torVis: 0, bbVis: 0, ledG: 0, ledR: 0, press: 0, bbCur: 0, alarm: 0, probes: 1, accent: 0, cur: 0, heat: 0, capQ: 0, capCur: 0, torCur: 0 };
const drv = new Driver();

// shared filament demo (stations 0, 5, 6, 10)
function filamentStation(o) {
  const m = new Filament();
  const yr = new Range(1e-3);
  let A = 1.4, f = 1e3, logI = true;
  return {
    m, manual: 1.9,
    stage: { filW: 1, ...o.stage },
    cam: o.cam, labels: o.labels,
    setA(v) { A = v; }, setF(v) { f = v; }, setLog(v) { logI = v; scope.reset(); },
    enter() {
      heads('Scope · v–i', o.p2 || 'Live traces', o.cap || '');
      readouts([['v', 'Voltage'], ['i', 'Current'], ['g', 'Gap g'], ['T', 'Filament T'], ['R', 'Read R'], ['s', 'State']]);
      o.enter && o.enter.call(this);
    },
    tick(dt, now) {
      drv.run(dt, { A, f, cps: o.cps || 0.3, spp: 600, step: (v, h) => { const i = m.step(v, h); scope.push(v, i); } });
      strip.push('v', m.v / 2); strip.push('i', m.i); strip.push('x', m.x);
      const ia = Math.abs(m.i);
      stage.set({ fil: m.x, heat: clamp((m.T - 300) / 420, 0, 1), cur: Math.sign(m.i) * Math.min(1, ia / 5e-4), volt: m.v / 2 });
      setRO(now, {
        v: u(m.v.toFixed(2), 'V'), i: fmt.si(m.i, 'A', 3).replace(/ (\S*A)$/, '<i>$1</i>'), g: u(m.g.toFixed(2), 'nm'),
        T: u(m.T.toFixed(0), 'K'), R: fmt.si(m.R, 'Ω', 3).replace(/ (\S*Ω)$/, '<i>$1</i>'), s: m.x > 0.6 ? '<span class="c-cyan">ON</span>' : m.x < 0.25 ? 'OFF' : '…',
      });
      info(`${A.toFixed(2)} V · ${fmt.si(f, 'Hz', 3)}`);
    },
    draw() {
      if (logI) {
        scope.clear().frame({ x: [-2, 2], y: [1e-8, 4e-3], ylog: true });
        scope.grid({ xt: [-2, -1, 0, 1, 2], yt: [1e-8, 1e-6, 1e-4], fy: (v) => ({ 1e-8: '10 nA', 1e-6: '1 µA', 1e-4: '100 µA' })[v], xl: 'v (V)', yl: '|i| (log)', zero: true });
        scope.trace({ map: (p) => [p[0], Math.abs(p[1])] });
      } else {
        const t = yr.to(Math.max(2e-5, maxAbs(scope.buf, 1) * 1.15));
        scope.clear().frame({ x: [-2, 2], y: [-t, t] });
        scope.grid({ xt: [-2, -1, 0, 1, 2], yt: [-t * 0.8, 0, t * 0.8], fy: (v) => fmt.si(v, 'A', 2), xl: 'v (V)', yl: 'i' });
        scope.trace();
      }
      if (o.draw2) o.draw2.call(this);
      else stripPlot([{ k: 'x', c: COL.amber }, { k: 'v', c: COL.cyan, a: 0.8 }], { yr: [-1.1, 1.15], yt: [-1, 0, 1], fy: (v) => v.toFixed(0), yl: 'v (cyan) · state x (amber)' });
    },
  };
}

const chapters = [];

/* 0 — cover */
chapters[0] = filamentStation({
  cam: { az: 0.55, el: 0.3, dist: 6.4, tx: 0, ty: 0.5, tz: 0 },
  labels: [{ a: 'fil', t: 'Filament', s: 'oxygen vacancies', c: COL.cyan }, { a: 'te', t: 'Top electrode', s: 'Pt', c: '#cfd7e3', side: 'l' }, { a: 'be', t: 'Bottom electrode', s: 'TiN', c: COL.amber, side: 'l' }],
  p2: 'State x(t) under a sine drive',
  cap: 'The filament grows on the positive half-cycle and dissolves on the negative one. The hidden state <b>x</b> is the memory.',
});

/* 1 — breadboard: a black-box memristor in a starter circuit */
chapters[1] = (() => {
  // units: V, kΩ, mA, s  (charge in mC)
  const Rs = 0.22, Vf = 2.0, QMAX = 0.6;
  const box = new Ideal({ Ron: 0.1, Roff: 10, qc: 0.25, qw: 0.06 });
  const real = new Threshold({ Ron: 0.1, Roff: 10, von: 0.9, voff: -0.9, kon: 4, koff: 4, a: 2 });
  let part = 0, Vb = 3, dir = 1, pressed = false, i = 0, vbox = 0, R = 10, holdT = 0, bright0 = 0, q0 = 0, gL = 0, rL = 0;
  const done = new Set();
  const quest = (k) => { if (done.has(k)) return; done.add(k); const li = $(`#quest li[data-q="${k}"]`); li && li.classList.add('ok'); };
  const press = (on) => {
    if (on && !pressed) { holdT = 0; bright0 = -1; q0 = box.q; if (part === 0 && done.has('hold') && dir > 0 && box.M(box.q) < 3) quest('mem'); }
    pressed = on; $('#bbPress').classList.toggle('down', on);
  };
  const setDir = (d) => { dir = d; const t = $('#bbDirT'); t.textContent = d > 0 ? '→ forward' : '← reverse'; t.className = d > 0 ? 'c-green' : 'c-red'; };
  const setPart = (p) => { part = p; $$('#partseg button').forEach((b) => b.classList.toggle('on', +b.dataset.p === p)); scope.reset(); };
  const pb = $('#bbPress');
  pb.addEventListener('pointerdown', (e) => { e.preventDefault(); pb.setPointerCapture(e.pointerId); press(true); });
  pb.addEventListener('pointerup', () => press(false)); pb.addEventListener('pointercancel', () => press(false));
  pb.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); press(true); } });
  pb.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') press(false); });
  $('#bbDir').addEventListener('click', () => setDir(-dir));
  $('#bbReset').addEventListener('click', () => { box.reset(); real.reset(); scope.reset(); strip.reset(); });
  seg('partseg', 'p', (p) => setPart(+p));
  slider('bv', (v) => v.toFixed(1) + ' V', (v) => (Vb = v));
  // space bar = the push button while this station is open
  addEventListener('keydown', (e) => { if (cur === 1 && e.key === ' ' && !e.repeat && !e.target.closest('button,input')) { e.preventDefault(); press(true); } });
  addEventListener('keyup', (e) => { if (cur === 1 && e.key === ' ' && !e.target.closest('button,input')) press(false); });
  const partName = () => ['Black box “M?”', 'Plain resistor', 'Real RRAM cell'][part];
  return {
    stage: { devVis: 0, bbVis: 1, probes: 0 },
    cam: { az: 0.1, el: 0.8, dist: 8.2, tx: -0.13, ty: 0.1, tz: 0.1 },
    labels: [
      { a: 'btn', t: 'Hold me', s: 'push button', c: COL.cyan, hot: true, aria: 'Push button: hold to pass current', down: () => press(true), up: () => press(false), side: 'l' },
      { a: 'sw', t: 'Flip', s: 'direction', c: '#e9eef6', hot: true, click: () => setDir(-dir), text: () => `Flip<em>${dir > 0 ? 'forward →' : '← reverse'}</em>`, side: 'l' },
      { a: 'box', t: 'M?', c: COL.amber, hot: true, click: () => setPart((part + 1) % 3), text: () => `${partName()}<em>tap to swap</em>` },
      { a: 'ledg', t: 'Green LED', c: COL.green },
      { a: 'ledr', t: 'Red LED', c: COL.red },
    ],
    exit() { press(false); },
    action(a, down) { if (a === 'btn') press(down); else if (down && a === 'sw') setDir(-dir); else if (down && a === 'box') setPart((part + 1) % 3); },
    enter() {
      heads('Scope · v–i of the part', 'Resistance over time', 'The box keeps its resistance when you let go. That is the memory.');
      readouts([['R', 'Part resistance'], ['q', 'Charge passed'], ['i', 'LED current']]);
    },
    tick(dt, now) {
      const n = 24, h = dt / n;
      for (let k = 0; k < n; k++) {
        const V = pressed ? dir * Vb : 0;
        const Vd = Math.abs(V) > Vf ? (Math.abs(V) - Vf) * Math.sign(V) : 0;
        R = part === 0 ? box.M(box.q) : part === 1 ? 1.0 : real.R;
        i = Vd / (R + Rs); vbox = i * R;
        if (part === 0) box.q = clamp(box.q + i * h, 0, QMAX);
        else if (part === 2) real.step(vbox, h);
        if (k % 6 === 0) scope.push(vbox, i);
      }
      if (pressed) holdT += dt;
      const b = Math.abs(i) > 0.02 ? Math.min(1, 0.22 + 0.78 * Math.sqrt(Math.abs(i) / 3.4)) : 0;
      gL = i > 0 ? b : 0; rL = i < 0 ? b : 0;
      if (pressed && holdT > 0.3 && bright0 < 0) bright0 = gL;
      if (pressed && part === 0 && dir > 0 && holdT > 1.2 && bright0 >= 0 && gL - bright0 > 0.15) quest('hold');
      if (pressed && part === 0 && dir < 0 && q0 - box.q > 0.12) quest('rev');
      if (pressed && part === 1 && holdT > 0.6) quest('res');
      if (pressed && part === 2 && Vb < 2.95 && holdT > 1.2) quest('thr');
      strip.push('R', Math.log10(R / 0.1) / 2); strip.push('L', gL || -rL);
      const boxX = part === 0 ? box.x : part === 2 ? real.x : 0.5;
      stage.set({ ledG: gL, ledR: rL, press: pressed ? 1 : 0, dir, bbCur: clamp(i / 3, -1, 1), boxX, part });
      setRO(now, {
        R: R >= 1 ? u(R.toFixed(2), 'kΩ') : u((R * 1000).toFixed(0), 'Ω'),
        q: part === 0 ? u((box.q * 1000).toFixed(0), 'µC') : part === 2 ? u((real.x * 100).toFixed(0), '% set') : u('—', ''),
        i: u(Math.abs(i).toFixed(2), 'mA'),
      });
      info(pressed ? `${(dir * Vb).toFixed(1)} V applied` : 'button released', pressed ? COL.cyan : '');
    },
    draw() {
      const tx = Math.max(1, maxAbs(scope.buf, 0) * 1.15), ty = Math.max(0.5, maxAbs(scope.buf, 1) * 1.15);
      scope.clear().frame({ x: [-tx, tx], y: [-ty, ty] });
      scope.grid({ xt: [-1, 0, 1].map((v) => v * Math.round(tx * 0.8 * 10) / 10), yt: [], fx: (v) => v.toFixed(1), xl: 'v on part (V)', yl: 'i (mA)' });
      scope.trace({ color: part === 0 ? COL.amber : part === 1 ? COL.mute : COL.violet });
      stripPlot([{ k: 'R', c: COL.amber }, { k: 'L', c: COL.green, a: 0.9 }], { yr: [-1.1, 1.1], yt: [0, 1], fy: (v) => (v === 1 ? '10 kΩ' : v === 0 ? '100 Ω' : ''), yl: 'resistance (amber, log) · LED (green +, red −)' });
    },
  };
})();

/* 2 — four elements */
chapters[2] = (() => {
  const m = new Ideal(); let el = 'M'; const yr = new Range(1);
  const notes = {
    R: '<b>Resistor.</b> <var>v</var> and <var>i</var> rise and fall together, so the trace is a straight line through the origin. It has no memory.',
    C: '<b>Capacitor.</b> Current leads voltage by a quarter cycle, giving an ellipse. It is never pinched: at <var>v</var> = 0 the current is at its peak.',
    L: '<b>Inductor.</b> Current lags voltage, giving an ellipse the other way. It is also never pinched.',
    M: '<b>Memristor.</b> Current is zero exactly when voltage is zero, so the trace passes through the origin. The slope on the way up differs from the slope on the way down. That makes a <b class="c-cyan">pinched loop</b>.',
  };
  const pick = (k) => {
    el = k; scope.reset(); strip.reset(); m.reset(); drv.ph = 0;
    $$('#quad .q-el').forEach((g) => g.classList.toggle('on', g.dataset.el === k));
    $$('#elseg button').forEach((b) => b.classList.toggle('on', b.dataset.el === k));
    setNote($('#elnote'), notes[k]);
    stage.set({ dopeW: k === 'M' ? 1 : 0.0, dope: 0.1 });
  };
  $('#quad').addEventListener('click', (e) => { const g = e.target.closest('.q-el'); if (g) pick(g.dataset.el); });
  seg('elseg', 'el', pick);
  return {
    get manual() { return el === 'M' ? 1.2 : 0; },
    stage: { dopeW: 1, dope: 0.1 }, cam: { az: 0.85, el: 0.3, dist: 6.6, tx: 0, ty: 0.5, tz: 0 },
    labels: [{ a: 'wall', t: 'State', s: 'set by charge', c: COL.amber, side: 'l' }],
    enter() { heads('Scope · same sine, four elements', 'v(t) and i(t)', 'Watch where the current peaks compared with the voltage.'); readouts([['e', 'Element'], ['v', 'v'], ['i', 'i']]); pick(el); },
    tick(dt, now) {
      drv.run(dt, {
        A: 1, f: 1, spp: 500, cps: 0.35, step: (v, h) => {
          let i;
          if (el === 'M') i = m.step(v, h) / 1.0;
          else { const ph = drv.ph * 2 * Math.PI; i = el === 'R' ? 0.8 * v : el === 'C' ? 0.8 * Math.cos(ph) : -0.8 * Math.cos(ph); }
          scope.push(v, i);
        },
      });
      const last = scope.buf[scope.buf.length - 1] || [0, 0];
      strip.push('v', last[0]); strip.push('i', last[1]);
      if (el === 'M') stage.set({ dope: 0.06 + 0.88 * m.x, cur: last[1] });
      else stage.set({ cur: 0 });
      setRO(now, { e: { R: 'R', C: 'C', L: 'L', M: '<span class="c-amber">M</span>' }[el], v: u(last[0].toFixed(2), 'V'), i: u(last[1].toFixed(2), '') });
    },
    draw() {
      const t = el === 'M' ? yr.to(Math.max(0.1, maxAbs(scope.buf, 1) * 1.15)) : yr.to(1.1);
      scope.clear().frame({ x: [-1.25, 1.25], y: [-t, t] });
      scope.grid({ xt: [-1, 0, 1], yt: [], xl: 'v', yl: 'i' });
      if (el !== 'M') scope.line(elementLoop(el), { color: 'rgba(90,216,255,.18)', width: 1 });
      scope.trace({ color: el === 'M' ? COL.amber : COL.cyan });
      if (el === 'M' || el === 'R') scope.dot(0, 0, { r: 2.5, ring: COL.green, glow: 10 });
      const ti = el === 'M' ? Math.max(0.1, maxAbs(scope.buf, 1)) : 1;
      stripPlot([{ k: 'v', c: COL.cyan }, { k: 'i', c: el === 'M' ? COL.amber : COL.mag, map: (v) => v / ti }], { yl: 'v (cyan) · i (scaled)', yt: [-1, 0, 1], fy: () => '' });
    },
  };
})();

/* 3 — ideal memristor */
chapters[3] = (() => {
  const m = new Ideal(); let A = 1, f = 1; const yr = new Range(0.3);
  slider('2a', (v) => v.toFixed(2) + ' V', (v) => (A = v));
  slider('2f', (v) => fmt.si(10 ** v, 'Hz', 3), (v) => (f = 10 ** v));
  toggle('i2lin', (c) => { m.linear = c; m.reset(); scope.reset(); drv.ph = 0; });
  return {
    manual: 1.6,
    stage: { dopeW: 1, dope: 0.05 }, cam: { az: -0.55, el: 0.28, dist: 6.4, tx: 0, ty: 0.55, tz: 0 },
    labels: [{ a: 'wall', t: 'Doped layer', s: 'state ∝ charge q', c: COL.amber, side: 'l' }],
    enter() { m.reset(); drv.ph = 0; heads('Scope · v–i', 'The constitutive curve φ̂(q)', 'The slope of the curve at the dot <b>is</b> the resistance. Current slides the dot, and the slope changes.'); readouts([['q', 'Charge q'], ['M', 'M(q)'], ['phi', 'Flux φ']]); },
    tick(dt, now) {
      drv.run(dt, { A, f, cps: 0.33, spp: 700, step: (v, h) => { const i = m.step(v, h); scope.push(v, i); } });
      stage.set({ dope: 0.05 + 0.9 * m.x, cur: m.i / Math.max(0.1, A) });
      setRO(now, { q: u(m.q.toFixed(4), 'mC'), M: u(m.M(m.q).toFixed(2), 'kΩ'), phi: u(m.phi(m.q).toFixed(3), 'Wb') });
      info(`${A.toFixed(2)} V · ${fmt.si(f, 'Hz', 3)}`);
    },
    draw() {
      const t = yr.to(Math.max(0.05, maxAbs(scope.buf, 1) * 1.15));
      scope.clear().frame({ x: [-1.7, 1.7], y: [-t, t] });
      scope.grid({ xt: [-1.5, -1, -0.5, 0, 0.5, 1, 1.5], yt: [-t * 0.8, 0, t * 0.8], fy: (v) => v.toFixed(2), xl: 'v (V)', yl: 'i (mA)' });
      scope.trace({ color: COL.amber });
      const qmax = 0.1, pts = [];
      for (let k = 0; k <= 120; k++) { const q = (k / 120) * qmax; pts.push([q, m.phi(q)]); }
      const ymax = m.phi(qmax) * 1.08;
      p2.clear().frame({ x: [0, qmax], y: [0, ymax] });
      p2.grid({ xt: [0, 0.025, 0.05, 0.075, 0.1], yt: [0, ymax / 2, ymax / 1.08], fx: (v) => v.toFixed(3), fy: (v) => v.toFixed(2), xl: 'q (mC)', yl: 'φ (Wb)' });
      p2.line(pts, { color: COL.violet, width: 2, glow: 8 });
      const q = clamp(m.q, 0, qmax), y = m.phi(q), s = m.M(q), dq = 0.018;
      p2.line([[q - dq, y - s * dq], [q + dq, y + s * dq]], { color: COL.amber, width: 1.4, dash: [4, 3] });
      p2.dot(q, y, { ring: COL.amber });
      p2.label(q, y, `slope M = ${s.toFixed(1)} kΩ`, { color: COL.amber, dx: 10, dy: 12 });
    },
  };
})();

/* 4 — fingerprints */
chapters[4] = (() => {
  const m = new Ideal(); let A = 1, f = 1, shape = 'sine', sweep = [], periods = 0; const yr = new Range(0.3);
  const recompute = () => {
    sweep = [];
    for (let k = 0; k <= 26; k++) {
      const F = 10 ** (-0.8 + (k / 26) * 2.4), mm = new Ideal(), n = 400, h = 1 / (F * n); let pts = [];
      for (let p = 0; p < 3; p++) for (let j = 0; j < n; j++) { const v = A * wave(shape, (p * n + j) / n); const i = mm.step(v, h); if (p === 2) pts.push([v, i]); }
      sweep.push([F, Math.max(loopArea(pts), 1e-9)]);
    }
  };
  const fpeak = () => sweep.reduce((b, p) => (p[1] > b[1] ? p : b), sweep[0])[0];
  const areaAt = (F) => { let best = sweep[0]; for (const p of sweep) if (Math.abs(Math.log(p[0] / F)) < Math.abs(Math.log(best[0] / F))) best = p; return best[1]; };
  slider('3f', (v) => fmt.si(10 ** v, 'Hz', 3), (v) => { f = 10 ** v; scope.reset(); });
  slider('3a', (v) => v.toFixed(2) + ' V', (v) => { A = v; recompute(); scope.reset(); });
  seg('wseg', 'w', (w) => { shape = w; recompute(); scope.reset(); });
  return {
    manual: 1.6,
    stage: { dopeW: 1, dope: 0.05 }, cam: { az: 0.3, el: 0.42, dist: 6.6, tx: 0, ty: 0.5, tz: 0 },
    enter() { m.reset(); drv.ph = 0; periods = 0; heads('Scope · v–i', 'Lobe area vs frequency', 'Slide the frequency up. Charge has less time to build up each half-cycle, so the state barely moves and the loop thins into a line.'); readouts([['f', 'Frequency'], ['a', 'Lobe area'], ['r', 'vs. peak']]); recompute(); },
    tick(dt, now) {
      const ph0 = drv.ph;
      drv.run(dt, { A, f, shape, cps: 0.33, spp: 700, step: (v, h) => { const i = m.step(v, h); scope.push(v, i); } });
      if (Math.floor(drv.ph) > Math.floor(ph0)) periods++;
      stage.set({ dope: 0.05 + 0.9 * m.x, cur: m.i / Math.max(0.1, A) });
      const a = areaAt(f), amax = Math.max(...sweep.map((p) => p[1]));
      const ok1 = periods >= 1, ok2 = f > fpeak() * 1.15, ok3 = a / amax < 0.04;
      $$('#fp li').forEach((li) => { const k = +li.dataset.fp; li.classList.toggle('ok', [ok1, ok2, ok3][k - 1]); });
      setRO(now, { f: fmt.si(f, 'Hz', 3).replace(/ (\S*Hz)$/, '<i>$1</i>'), a: u(a.toExponential(1), 'V·mA'), r: u((100 * a / amax).toFixed(a / amax < 0.1 ? 1 : 0), '%') });
    },
    draw() {
      const t = yr.to(Math.max(0.05, maxAbs(scope.buf, 1) * 1.15));
      scope.clear().frame({ x: [-1.7, 1.7], y: [-t, t] });
      scope.grid({ xt: [-1, 0, 1], yt: [], xl: 'v (V)', yl: 'i' });
      scope.trace({ color: COL.amber });
      scope.dot(0, 0, { r: 2.5, ring: COL.green, glow: 10 });
      const ys = sweep.map((p) => p[1]), lo = Math.min(...ys) / 2, hi = Math.max(...ys) * 2;
      p2.clear().frame({ x: [0.15, 40], y: [lo, hi], xlog: true, ylog: true });
      p2.grid({ xt: [0.2, 1, 5, 20], yt: [], fx: (v) => v + ' Hz', xl: '', yl: 'area (log)' });
      p2.line(sweep, { color: COL.violet, width: 2, glow: 8, fill: 'rgba(167,139,250,.08)' });
      p2.dot(f, areaAt(f), { ring: COL.amber });
    },
  };
})();

/* 5 — HP linear drift + windows */
chapters[5] = (() => {
  const m = new HP(); let A = 1, push = 0; const yr = new Range(0.3);
  const notes = {
    none: '<b>No window.</b> The wall hits the edge of the film and is simply clamped there. That is unphysical, and simulators treat the hard edge as an ill-posed discontinuity.',
    joglekar: '<b>Joglekar</b>: the brake is zero at both edges, so once the tide reaches an edge it can <b class="c-red">never leave</b>, even when the current reverses. This is <b>boundary lock</b>. <span class="pro">In exact arithmetic the wall only approaches the edge asymptotically, so switching time is infinite (the “Zeno” problem, Mutlu &amp; Kumru 2023). In floating point a step lands on F = 0 and the state sticks.</span>',
    biolek: '<b>Biolek</b> makes the window depend on current direction, so the wall can always leave an edge. It fixes boundary lock, but makes the equation <b>discontinuous in current</b>, which solvers dislike, and it allows only integer <var>p</var>.',
    prodromakis: '<b>Prodromakis</b> adds a scalable window, so you can set its peak. It still goes to zero at both edges, so it can still lock.',
  };
  seg('winseg', 'win', (w) => { m.window = w; setNote($('#n4'), notes[w]); });
  setNote($('#n4'), notes.joglekar);
  slider('4p', (v) => v.toFixed(0), (v) => (m.p = v));
  slider('4a', (v) => v.toFixed(2) + ' V', (v) => (A = v));
  $('#b4push').addEventListener('click', () => { push = 2.4; });
  $('#b4reset').addEventListener('click', () => { m.reset(); scope.reset(); drv.ph = 0; push = 0; });
  return {
    manual: 1.6,
    stage: { dopeW: 1, dope: 0.1, probes: 1 }, cam: { az: -0.35, el: 0.22, dist: 6.2, tx: 0, ty: 0.6, tz: 0 },
    labels: [{ a: 'wall', t: 'Moving wall', s: 'x = w/D', c: COL.amber, side: 'l' }, { a: 'te', t: 'Pt', c: '#cfd7e3', side: 'l' }],
    enter() { m.reset(); drv.ph = 0; push = 0; heads('Scope · v–i', 'Window function F(x)', ''); readouts([['x', 'Wall w/D'], ['R', 'Resistance'], ['F', 'Window F']]); },
    tick(dt, now) {
      if (push > 0) {
        push -= dt;
        const n = 6; for (let k = 0; k < n; k++) { const i = m.step(1.2, (dt * 0.4) / n); scope.push(1.2, i); }
        if (push <= 0) drv.ph = 0;
      } else drv.run(dt, { A, f: 1, cps: 0.33, spp: 700, step: (v, h) => { const i = m.step(v, h); scope.push(v, i); } });
      stage.set({ dope: m.x, alarm: m.locked ? 1 : 0, cur: m.i / 1.2 });
      setRO(now, { x: u(m.x.toFixed(3), ''), R: u(m.R.toFixed(2), 'kΩ'), F: u(m.F(m.x, m.i || 1).toFixed(3), '') });
      if (m.locked) info('BOUNDARY LOCK', COL.red); else if (push > 0) info('DC push · +1.2 V', COL.amber); else info(WINDOWS[m.window].name);
    },
    draw() {
      const t = yr.to(Math.max(0.05, maxAbs(scope.buf, 1) * 1.15));
      scope.clear().frame({ x: [-1.7, 1.7], y: [-t, t] });
      scope.grid({ xt: [-1, 0, 1], yt: [-t * 0.8, 0, t * 0.8], fy: (v) => v.toFixed(2), xl: 'v (V)', yl: 'i (mA)' });
      scope.trace({ color: m.locked ? COL.red : COL.amber });
      p2.clear().frame({ x: [0, 1], y: [-0.05, 1.12] });
      p2.grid({ xt: [0, 0.25, 0.5, 0.75, 1], yt: [0, 0.5, 1], fx: (v) => v, fy: (v) => v, xl: 'x = w/D', yl: 'F(x)' });
      const curve = (sgn) => { const pts = []; for (let k = 0; k <= 160; k++) { const x = k / 160; pts.push([x, m.F(x, sgn)]); } return pts; };
      if (m.window === 'biolek') {
        p2.line(curve(1), { color: COL.cyan, width: 2, glow: 6 }); p2.line(curve(-1), { color: COL.mag, width: 2, glow: 6, dash: [5, 4] });
        p2.label(0.06, 0.2, 'i > 0', { color: COL.cyan }); p2.label(0.8, 0.2, 'i < 0', { color: COL.mag });
      } else p2.line(curve(1), { color: COL.violet, width: 2, glow: 8, fill: 'rgba(167,139,250,.07)' });
      p2.dot(m.x, m.F(m.x, m.i || 1), { ring: m.locked ? COL.red : COL.amber });
      if (m.locked) p2.label(0.5, 0.55, 'F = 0 at the edge: the wall can never leave', { color: COL.red, align: 'center' });
    },
  };
})();

/* 6 — filament */
chapters[6] = (() => {
  let curve = [], st;
  const recompute = () => { curve = []; for (let V = 0.1; V <= 1.901; V += 0.05) curve.push([V, st.m.switchTime(V)]); };
  st = filamentStation({
    stage: { filW: 1 },
    cam: { az: 0.75, el: 0.2, dist: 5.2, tx: 0, ty: 0.55, tz: 0 },
    labels: [{ a: 'fil', t: 'Filament', s: 'vacancies', c: COL.cyan }, { a: 'gap', t: 'Gap g', s: 'tunnelling', c: '#cdefff', side: 'l' }, { a: 'te', t: 'O²⁻ pulled here', s: 'on SET', c: COL.mag, side: 'l' }],
    p2: 'Time to switch vs. voltage',
    enter() { recompute(); },
    draw2() {
      const A = +$('#i5a').value;
      p2.clear().frame({ x: [0, 2], y: [1e-9, 1e5], ylog: true });
      p2.band(0, 0.3, 'rgba(94,240,168,.07)'); p2.band(1.0, 2, 'rgba(255,92,138,.06)');
      p2.grid({ xt: [0, 0.5, 1, 1.5, 2], yt: [1e-9, 1e-6, 1e-3, 1, 1e3], fx: (v) => v + ' V', fy: (v) => ({ 1e-9: '1 ns', 1e-6: '1 µs', 1e-3: '1 ms', 1: '1 s', 1e3: '17 m' })[v], yl: '', zero: false });
      p2.line(curve, { color: COL.violet, width: 2, glow: 8 });
      p2.label(0.15, 3e3, 'READ', { color: COL.green }); p2.label(1.85, 3e3, 'WRITE', { color: COL.mag, align: 'right' });
      const tA = st.m.switchTime(A);
      p2.dot(A, clamp(tA, 1e-9, 1e5), { ring: COL.amber });
      const t02 = st.m.switchTime(0.2);
      $('#p2Info').textContent = `T₀ = ${st.m.T0.toFixed(0)} K`;
      setNote($('#p2Cap'), `A 0.2 V read would take <b>${fmt.time(t02)}</b> to disturb this cell. At ${A.toFixed(2)} V it switches in <b>${fmt.time(tA)}</b>. That is about ${Math.round(Math.log10(t02 / tA))} decades of speed from a ${(A - 0.2).toFixed(1)} V change. This <b>voltage–time dilemma</b> is what lets RRAM work as memory.`);
    },
  });
  slider('5a', (v) => v.toFixed(2) + ' V', (v) => st.setA(v));
  slider('5f', (v) => fmt.si(10 ** v, 'Hz', 2), (v) => st.setF(10 ** v));
  slider('5t', (v) => v.toFixed(0) + ' K', (v) => { st.m.T0 = v; recompute(); });
  toggle('i5log', (c) => st.setLog(c));
  toggle('i5n', (c) => { st.m.noise = c ? 1 : 0; });
  return st;
})();

/* 7 — the template, exploded */
chapters[7] = (() => {
  const notes = {
    id: '<b>Ideal.</b> Resistance is a function of charge alone. This is the only class guaranteed to pass the capacitor test. No physical device has been shown to belong to it.',
    ig: '<b>Ideal generic.</b> <var>R</var>(<var>x</var>) with <var>ẋ</var> = <var>g</var>(<var>x</var>)·<var>i</var>. A change of state variable maps it one-to-one onto an ideal memristor, so it behaves identically.',
    gen: '<b>Generic.</b> <var>ẋ</var> depends on <var>i</var> in a general way, through thresholds or sinh kinetics. Most real ReRAM devices are generic or extended memristors.',
    ext: '<b>Extended.</b> <var>R</var> itself depends on <var>i</var> too, through tunnelling or Schottky conduction, with <var>R</var>(<var>x</var>, 0) finite. The filament model running on the bench is one of these.',
  };
  const set = (k) => { $$('#nest button').forEach((b) => b.classList.toggle('on', b.dataset.k === k)); setNote($('#nestnote'), notes[k]); };
  $('#nest').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) set(b.dataset.k); });
  set('id');
  return filamentStation({
    stage: { filW: 1, explode: 1 },
    cam: { az: 0.45, el: 0.16, dist: 7.6, tx: 0, ty: 1.0, tz: 0 },
    labels: [
      { a: 'te', t: 'Top electrode', s: 'Pt', c: '#cfd7e3', side: 'l' },
      { a: 'ox', t: 'Switching oxide', s: 'HfO₂ · TaOₓ', c: '#bfe6ff' },
      { a: 'fil', t: 'State x', s: 'filament', c: COL.cyan, side: 'l' },
      { a: 'be', t: 'Bottom electrode', s: 'TiN', c: COL.amber, side: 'l' },
    ],
    p2: 'Hidden state x and drive v',
    cap: 'Every device in the table is this picture with a different <var>x</var>: a gap, a concentration, a width, a crystalline fraction, a temperature, a magnetisation.',
    cps: 0.25,
  });
})();

/* 8 — Mott oscillator */
chapters[8] = (() => {
  const m = new Mott(); const yr = new Range(5); let dc = m.dcCurve(260), spikes = [], lastT = 300, vmin = 9, vmax = 0, win = 0;
  const reg = { rest: 'Below threshold. The load line meets the insulating branch, so the device sits quietly, cool and resistive.', spike: '<b class="c-amber">Spiking.</b> The load line crosses the negative-resistance branch, so there is no stable resting point. The capacitor charges, the channel flashes hot and metallic, dumps the charge, cools, and repeats.', on: 'Latched ON. The load line meets the metallic branch, so the channel stays hot and conducting.' };
  slider('7v', (v) => v.toFixed(1) + ' V', (v) => (m.Vs = v));
  let simT = 0;
  return {
    stage: { filW: 1, vacW: 0.5 }, cam: { az: 0.95, el: 0.24, dist: 5.6, tx: 0, ty: 0.55, tz: 0 },
    labels: [{ a: 'fil', t: 'NbO₂ channel', s: 'state = temperature', c: COL.amber }],
    enter() { m.reset(); simT = 0; spikes = []; heads('Scope · i–v', 'Voltage and temperature vs time', ''); readouts([['V', 'Device v'], ['T', 'Channel T'], ['r', 'Spike rate']]); },
    tick(dt, now) {
      const sdt = dt * 5; // µs of simulated time per frame
      const n = 6;
      for (let k = 0; k < n; k++) {
        m.step(sdt / n); simT += sdt / n;
        if (m.T > 850 && lastT <= 850) spikes.push(simT);
        lastT = m.T;
        scope.push(m.V, m.i);
      }
      spikes = spikes.filter((t) => simT - t < 40);
      strip.push('V', m.V); strip.push('T', m.T);
      vmin = Math.min(vmin, m.V); vmax = Math.max(vmax, m.V);
      if ((win += dt) > 1.6) {
        const regime = vmax - vmin > 0.15 ? 'spike' : m.T > 800 ? 'on' : 'rest';
        setNote($('#n7'), reg[regime]); win = 0; vmin = 9; vmax = 0;
      }
      stage.set({ fil: 0.96, heat: clamp((m.T - 330) / 800, 0, 1), cur: clamp(m.i / 2.4, -1, 1) });
      const rate = spikes.length > 1 ? (spikes.length - 1) / (spikes[spikes.length - 1] - spikes[0]) : 0;
      setRO(now, { V: u(m.V.toFixed(2), 'V'), T: u(m.T.toFixed(0), 'K'), r: rate ? u((rate * 1000).toFixed(0), 'kHz') : u('0', '') });
      info(`Vs ${m.Vs.toFixed(1)} V`);
    },
    draw() {
      const ym = yr.to(Math.max(5, maxAbs(scope.buf, 1) * 1.08));
      scope.clear().frame({ x: [0, 1.7], y: [0, ym] });
      scope.grid({ xt: [0, 0.5, 1, 1.5], yt: [2, 4, 6, 8, 10].filter((v) => v < ym), fy: (v) => v + ' mA', xl: 'v (V)', yl: 'i' });
      scope.line(dc.map((p) => [p[0], p[1]]), { color: 'rgba(255,181,71,.45)', width: 2 });
      // load line: i = (Vs - v)/Rs
      scope.line([[0, m.Vs / m.Rs], [1.7, (m.Vs - 1.7) / m.Rs]], { color: 'rgba(167,139,250,.55)', width: 1.2, dash: [5, 4] });
      scope.label(0.42, 4.6, 'DC curve', { color: COL.amber });
      scope.label(1.62, Math.max(0.25, (m.Vs - 1.62) / m.Rs) + 0.35, 'load line', { color: COL.violet, align: 'right' });
      scope.trace({ color: COL.cyan });
      stripPlot([{ k: 'T', c: COL.amber, map: (T) => (T - 300) / 1000 * 1.6 }, { k: 'V', c: COL.cyan }], { yr: [0, 1.7], yt: [0.5, 1, 1.5], fy: (v) => v + ' V', yl: 'v (cyan) · T (amber)' });
    },
  };
})();

/* 9 — the capacitor test */
chapters[9] = (() => {
  const SEQ = { one: [[1.2, 0.2]], two: [[1.2, 0.2], [-0.9, 0.12]], gentle: [[0.4, 0.6]], burst: [[1.0, 0.1], [-1.0, 0.08], [1.3, 0.12], [0, 0.1], [-0.7, 0.1]] };
  let seq = 'one', bench = 'real', run = null;
  const mk = () => ({ I: new CapTest(new Ideal({ qc: 0.012, qw: 0.004 }), 1), R: new CapTest(new Threshold(), 1) });
  let T = mk(), rec = { I: [], R: [], q: [] }, qmax = 1e-3, tau = 0;
  const start = () => {
    T = mk(); rec = { I: [], R: [], q: [] }; qmax = 1e-3; tau = 0; scope.reset();
    const segs = SEQ[seq]; let t = 0; const plan = segs.map(([v, d]) => { const s = { v, t0: t, t1: t + d }; t += d; return s; });
    run = { plan, tEnd: t, t: 0, done: false };
    for (const id of ['vdI', 'vdR']) { const el = $('#' + id); el.className = 'vd run'; $('.vr', el).textContent = 'running'; $('small', el).textContent = ''; }
    $('#b8run').disabled = true;
  };
  const verdict = (id, ct) => {
    const el = $('#' + id), r = ct.dev.R / ct.R0, pass = Math.abs(r - 1) < 0.1;
    el.className = 'vd ' + (pass ? 'pass' : 'fail');
    $('.vr', el).textContent = pass ? 'PASS' : 'FAIL';
    $('small', el).textContent = `R₀ ${ct.R0.toFixed(1)} kΩ → ${ct.dev.R.toFixed(1)} kΩ`;
  };
  seg('tseg', 't', (t) => { seq = t; start(); });
  seg('dseg', 'd', (d) => { bench = d; });
  $('#b8run').addEventListener('click', start);
  return {
    stage: { filW: 1, devX: -0.7, capVis: 1 }, cam: { az: 0.18, el: 0.36, dist: 7.6, tx: 0.3, ty: 0.45, tz: 0 },
    labels: [{ a: 'cap', t: 'Series capacitor', s: 'q = device charge', c: COL.amber }, { a: 'te', t: 'Device under test', c: COL.cyan, side: 'l' }],
    enter() { heads('Scope · device v–i during the test', 'Resistance R/R₀ during the test', 'Resistance relative to its starting value, over a time axis that speeds up as the capacitor drains. The faint fill is capacitor charge, which always returns to zero.'); readouts([['q', 'Capacitor q'], ['ri', 'Ideal R/R₀'], ['rr', 'Real R/R₀']]); setTimeout(() => { if (cur === 9 && !run) start(); }, 700); },
    exit() { run = null; $('#b8run').disabled = false; },
    tick(dt, now) {
      if (run && !run.done) {
        const inPulse = run.t < run.tEnd + 0.15;
        const speed = inPulse ? 0.22 : 0.22 + 0.9 * (run.t - run.tEnd);
        const span = dt * speed;
        const n = inPulse ? 40 : 60, h = span / n;
        for (let k = 0; k < n; k++) {
          const p = run.plan.find((s) => run.t >= s.t0 && run.t < s.t1);
          const vs = p ? p.v : 0;
          T.I.step(vs, h); T.R.step(vs, h); run.t += h;
          const B = bench === 'real' ? T.R : T.I;
          if (k % 4 === 0) scope.push(B.vm, B.i);
        }
        tau += dt;
        qmax = Math.max(qmax, Math.abs(T.I.qc), Math.abs(T.R.qc));
        rec.I.push([tau, T.I.dev.R / T.I.R0]); rec.R.push([tau, T.R.dev.R / T.R.R0]);
        const B = bench === 'real' ? T.R : T.I;
        rec.q.push([tau, B.qc]);
        const settled = !inPulse && Math.abs(T.I.qc) < 3e-4 && Math.abs(T.R.qc) < 3e-4;
        if (settled || run.t > run.tEnd + 80) { run.done = true; verdict('vdI', T.I); verdict('vdR', T.R); $('#b8run').disabled = false; }
      }
      const B = bench === 'real' ? T.R : T.I;
      stage.set({ fil: B.dev.x, cur: clamp(B.i / 0.8, -1, 1), capQ: clamp(B.qc / Math.max(qmax, 0.02), -1, 1), capCur: clamp(B.i / 0.6, -1, 1), heat: 0 });
      setRO(now, { q: u((B.qc * 1000).toFixed(1), 'µC'), ri: u((T.I.dev.R / T.I.R0).toFixed(2), ''), rr: u((T.R.dev.R / T.R.R0).toFixed(2), '') });
      info(run && !run.done ? (run.t < run.tEnd ? 'pulse' : 'discharging → q = 0') : run ? 'done' : 'ready', run && !run.done ? COL.amber : '');
    },
    draw() {
      const t = Math.max(0.05, maxAbs(scope.buf, 1) * 1.15);
      scope.clear().frame({ x: [-1.4, 1.4], y: [-t, t] });
      scope.grid({ xt: [-1, 0, 1], yt: [], xl: 'v_device (V)', yl: 'i' });
      scope.trace({ color: bench === 'real' ? COL.cyan : COL.amber });
      const tm = Math.max(4, tau * 1.05);
      p2.clear().frame({ x: [0, tm], y: [0, 1.25] });
      p2.band(0, tm, 'rgba(0,0,0,0)');
      const g = p2.g; g.save(); g.fillStyle = 'rgba(94,240,168,.07)'; g.fillRect(p2.X(0), p2.Y(1.1), p2.X(tm) - p2.X(0), p2.Y(0.9) - p2.Y(1.1)); g.restore();
      p2.grid({ xt: [], yt: [0, 0.5, 1], fy: (v) => v.toFixed(1), yl: 'R/R₀ · green = ±10% band', zero: false });
      p2.line(rec.q.map(([x, q]) => [x, 0.0 + 0.9 * Math.abs(q) / Math.max(qmax, 1e-9)]), { color: 'rgba(255,181,71,.0)', fill: 'rgba(255,181,71,.12)' });
      p2.line(rec.I, { color: COL.amber, width: 2, glow: 6 });
      p2.line(rec.R, { color: COL.cyan, width: 2, glow: 6 });
      if (rec.I.length) { p2.label(tm * 0.98, rec.I[rec.I.length - 1][1] + 0.07, 'ideal', { color: COL.amber, align: 'right' }); p2.label(tm * 0.98, rec.R[rec.R.length - 1][1] - 0.07, 'real', { color: COL.cyan, align: 'right' }); }
    },
  };
})();

/* 10 — the hunt: wire through a ferrite core */
chapters[10] = (() => {
  let q = 0, mag = -1, i = 0, vs = 0, pulseT = 0, pulses = 0;
  const ic = 0.45;
  const pulse = (s) => { vs = s; pulseT = 0.18; pulses++; };
  $('#b9p').addEventListener('click', () => pulse(1));
  $('#b9n').addEventListener('click', () => pulse(-1));
  $('#b9r').addEventListener('click', () => { q = 0; mag = -1; i = 0; vs = 0; pulseT = 0; pulses = 0; scope.reset(); strip.reset(); upd(); });
  const upd = () => {
    setNote($('#n9'), pulses === 0
      ? 'Each pulse charges the capacitor, then lets it drain back to zero. Watch the core.'
      : `The capacitor charge is back to <b>${Math.abs(q) < 0.01 ? 'zero' : (q * 1000).toFixed(0) + ' µC'}</b>, but the core reads <b class="${mag > 0 ? 'c-mag' : 'c-cyan'}">${mag > 0 ? 'up' : 'down'}</b>. Same charge, different state, so the state is not a function of charge. In the test's words, it is <b>“simply an inductor with memory.”</b>`);
  };
  let auto = 0;
  return {
    stage: { devVis: 0, torVis: 1 }, cam: { az: 0.8, el: 0.22, dist: 6.0, tx: 0, ty: 0.55, tz: 0 },
    labels: [{ a: 'tor', t: 'Ferrite core', s: 'magnetisation', c: COL.mag }, { a: 'wire', t: 'Current pulse', c: COL.amber }],
    enter() { q = 0; mag = -1; pulses = 0; auto = 0.6; heads('Scope · core state vs current', 'Capacitor charge and core state', 'Charge (amber) returns to zero after every pulse. The core state (pink) does not.'); readouts([['q', 'Capacitor q'], ['m', 'Core'], ['n', 'Pulses']]); upd(); },
    tick(dt, now) {
      if (auto > 0 && (auto -= dt) <= 0 && pulses === 0) pulse(1);
      const n = 30, h = (dt * 1.6) / n;
      for (let k = 0; k < n; k++) {
        if (pulseT > 0) { pulseT -= h; if (pulseT <= 0) { vs = 0; } }
        i = (vs - q / 1) / 1;
        q += h * i;
        if (Math.abs(i) > ic) mag += h * 30 * (Math.abs(i) - ic) * (Math.sign(i) - mag);
        mag = clamp(mag, -1, 1);
        if (k % 3 === 0) scope.push(i, mag);
      }
      if (pulses && pulseT <= 0 && Math.abs(i) < 0.02 && !this._shown) { upd(); this._shown = true; }
      if (pulseT > 0) this._shown = false;
      strip.push('q', q); strip.push('m', mag);
      stage.set({ mag, torCur: clamp(i, -1, 1) });
      setRO(now, { q: u((q * 1000).toFixed(0), 'µC'), m: mag > 0.5 ? '<span class="c-mag">up</span>' : mag < -0.5 ? '<span class="c-cyan">down</span>' : '…', n: pulses });
    },
    draw() {
      scope.clear().frame({ x: [-1.1, 1.1], y: [-1.3, 1.3] });
      scope.grid({ xt: [-1, 0, 1], yt: [-1, 1], fy: (v) => (v > 0 ? 'up' : 'down'), xl: 'wire current', yl: 'core', zero: true });
      scope.line([[-1.05, -1], [ic, -1], [ic, 1], [1.05, 1]], { color: 'rgba(255,92,138,.3)', width: 1.4, dash: [4, 4] });
      scope.line([[1.05, 1], [-ic, 1], [-ic, -1], [-1.05, -1]], { color: 'rgba(90,216,255,.3)', width: 1.4, dash: [4, 4] });
      scope.trace({ color: COL.mag });
      stripPlot([{ k: 'q', c: COL.amber, map: (v) => v * 1.4 }, { k: 'm', c: COL.mag }], { yr: [-1.2, 1.2], yt: [-1, 0, 1], fy: () => '', yl: 'charge (amber) · core (pink)' });
    },
  };
})();

/* 11 — verdict */
chapters[11] = filamentStation({
  cam: { az: -0.9, el: 0.36, dist: 7.0, tx: 0, ty: 0.45, tz: 0 },
  labels: [],
  p2: 'Still switching',
  cap: 'The device on the bench is modelled well. What it <em>is</em> is still disputed.',
  cps: 0.22,
});

/* ── plain-English definitions ─────────────────────── */
autoLink($('#story'));
const tip = document.createElement('div'); tip.id = 'tip'; tip.setAttribute('role', 'tooltip'); document.body.appendChild(tip);
let tipKey = null, tipPinned = false;
function showTip(key, x, y, below = 12) {
  const T = TERMS[key]; if (!T) return hideTip();
  if (tipKey !== key) {
    tip.innerHTML = `<b>${T.t}</b><span>${T.d}</span>${T.x ? `<em>${T.x}</em>` : ''}`;
    tipKey = key;
  }
  tip.classList.add('on');
  const w = tip.offsetWidth, h = tip.offsetHeight;
  let L = Math.min(innerWidth - w - 10, Math.max(10, x - w / 2)), Tp = y + below;
  if (Tp + h > innerHeight - 10) Tp = y - h - 14;
  tip.style.transform = `translate(${L}px,${Math.max(10, Tp)}px)`;
}
function hideTip() { tip.classList.remove('on'); tipKey = null; tipPinned = false; }
document.addEventListener('mouseover', (e) => { const b = e.target.closest('.term'); if (b && !tipPinned) { const r = b.getBoundingClientRect(); showTip(b.dataset.t, r.left + r.width / 2, r.bottom); } });
document.addEventListener('mouseout', (e) => { if (e.target.closest('.term') && !tipPinned) hideTip(); });
document.addEventListener('click', (e) => {
  const b = e.target.closest('.term');
  if (b && b.closest('summary')) e.preventDefault();   // don't fold a "go deeper" card when tapping its jargon
  if (b) { const r = b.getBoundingClientRect(); if (tipPinned && tipKey === b.dataset.t) hideTip(); else { showTip(b.dataset.t, r.left + r.width / 2, r.bottom); tipPinned = true; } return; }
  if (!e.target.closest('#tip')) { if (tipPinned) hideTip(); }
});
$('#story').addEventListener('scroll', () => hideTip(), { passive: true });
stage.onHover = (key, x, y, tap) => { if (key) { showTip(key, x, y, 18); tipPinned = !!tap; } else if (!tipPinned) hideTip(); };

// the glossary panel
const gl = $('#gloss'), gList = $('#glossList'), gq = $('#glossQ');
const entries = Object.entries(TERMS).sort((a, b) => a[1].t.localeCompare(b[1].t));
gList.innerHTML = entries.map(([k, T]) => `<div class="ge" data-k="${k}"><b>${T.t}</b><p>${T.d}</p>${T.x ? `<p class="pro gx">${T.x}</p>` : ''}</div>`).join('');
const openGloss = (k) => {
  gl.hidden = false; gq.value = ''; filterGloss('');
  setTimeout(() => { gl.classList.add('on'); if (k) { const el = $(`.ge[data-k="${k}"]`, gList); el && el.scrollIntoView({ block: 'center' }); el && el.classList.add('hl'); setTimeout(() => el && el.classList.remove('hl'), 1600); } else gq.focus(); }, 16);
};
const closeGloss = () => { gl.classList.remove('on'); setTimeout(() => (gl.hidden = true), 200); };
function filterGloss(q) { q = q.trim().toLowerCase(); $$('.ge', gList).forEach((e) => (e.style.display = !q || e.textContent.toLowerCase().includes(q) ? '' : 'none')); }
gq.addEventListener('input', () => filterGloss(gq.value));
$('#glossBtn').addEventListener('click', () => openGloss());
$('#glossX').addEventListener('click', closeGloss);
gl.addEventListener('click', (e) => { if (e.target === gl) closeGloss(); });
addEventListener('keydown', (e) => { if (e.key === 'Escape') { if (!gl.hidden) closeGloss(); hideTip(); } });
tip.addEventListener('click', () => { const k = tipKey; hideTip(); openGloss(k); });

/* ── clicks on parts in the 3D scene ────────────────── */
stage.onAction = (a, down) => { if (ch && ch.action) ch.action(a, down); };

/* ── navigation ───────────────────────────────────────── */
let cur = -1, ch = null, ui = null;
const dots = $('#dots');
sections.forEach((s, k) => {
  const b = document.createElement('button');
  b.textContent = k === 0 ? '◆' : String(k).padStart(2, '0');
  b.title = s.dataset.title; b.setAttribute('aria-label', `Station ${k}: ${s.dataset.title}`);
  b.addEventListener('click', () => go(k));
  dots.appendChild(b);
});
function go(n) {
  n = clamp(n | 0, 0, sections.length - 1);
  if (n === cur) return;
  if (ch && ch.exit) ch.exit();
  cur = n; ch = chapters[n]; seen.add(n);
  if (ui && n !== 1) { ui.setXray(false); const xb = $('#bbXray'); if (xb) xb.textContent = 'See inside the breadboard'; }
  stage.resetView && stage.resetView();
  sections.forEach((s, k) => s.classList.toggle('on', k === n));
  $$('#dots button').forEach((b, k) => { b.classList.toggle('on', k === n); if (k === n) b.classList.add('seen'); });
  $('#stepName').textContent = `${String(n).padStart(2, '0')} · ${sections[n].dataset.title}`;
  $('#prev').disabled = n === 0;
  $('#next').textContent = n === sections.length - 1 ? (mobile ? '↺' : 'Restart ↺') : mobile ? '→' : 'Next →';
  $('#story').scrollTop = 0;
  history.replaceState(null, '', '#' + n);
  stage.set({ ...BASE, ...ch.stage });
  setLabels(ch.labels);
  scope.reset(); strip.reset(); drv.ph = 0;
  placeP2();
  scope.resize(); p2.resize();
  ch.enter();
  applyCam();
}
$('#prev').addEventListener('click', () => go(cur - 1));
$('#next').addEventListener('click', () => go(cur === sections.length - 1 ? 0 : cur + 1));
document.addEventListener('click', (e) => { const g = e.target.closest('[data-go]'); if (g) go(+g.dataset.go); });
addEventListener('keydown', (e) => {
  if (e.target.closest('input,textarea,select') || !gl.hidden || (ui && ui.isOpen())) return;
  if (e.key === 'ArrowRight' || e.key === 'PageDown') { go(cur + 1); e.preventDefault(); }
  if (e.key === 'ArrowLeft' || e.key === 'PageUp') { go(cur - 1); e.preventDefault(); }
});
addEventListener('hashchange', () => go(+location.hash.slice(1) || 0));
let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(layout, 80); });

/* ── menus, parts guide, deep dives, toolbar ────────── */
const seen = new Set();
const ANAT = [
  { a: 'railT', t: 'Power rail', s: '+ joined end to end', c: COL.red },
  { a: 'strip', t: 'Component strip', s: '5 holes joined', c: COL.cyan, side: 'l' },
  { a: 'trench', t: 'Centre trench', s: 'splits the halves', c: '#e9eef6' },
  { a: 'railB', t: 'Power rail', s: '− and + along the edge', c: '#7fb8ff', side: 'l' },
];
let anatOn = false;
ui = initUI({
  stage, go, sections, seen, linkify: autoLink, reveal, toggleImmersive,
  getCur: () => cur,
  openGloss: () => openGloss(),
  anatomyLabels: (on) => { anatOn = on && cur === 1; setLabels(anatOn ? [...ch.labels, ...ANAT] : ch.labels); },
});
$('#bbParts').addEventListener('click', () => ui.openParts());
$('#bbXray').addEventListener('click', () => { const on = !anatOn; ui.setXray(on); $('#bbXray').textContent = on ? 'Back to normal view' : 'See inside the breadboard'; if (on) { reveal(); stage.focus('board', 0.95); } });

/* ── frame loop ───────────────────────────────────────── */
let last = 0;
function loop(now) {
  const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60; last = now;
  if (ch && !document.hidden) {
    ch.tick(dt, now); ch.draw();
    const can = !!ch.manual;
    scopeEl.classList.toggle('can-drive', can);
    if (can) {
      if (manual.on) {
        const g = scope.g, x = scope.X(manual.v);
        g.save(); g.strokeStyle = 'rgba(255,255,255,.35)'; g.setLineDash([3, 4]); g.beginPath(); g.moveTo(x, scope.pad[1]); g.lineTo(x, scope.h - scope.pad[3]); g.stroke(); g.restore();
        scope.label(scope.w - 14, 14, `you: ${manual.v.toFixed(2)} V`, { px: true, align: 'right', color: '#fff' });
      } else scope.label(scope.w - 14, 14, '⇆ drag to drive', { px: true, align: 'right', color: COL.dim });
    }
  }
  stage.frame(now);
  placeLabels();
  requestAnimationFrame(loop);
}

layout();
go(+location.hash.slice(1) || 0);
stage.setNow({ ...BASE, ...ch.stage, devVis: 0, capVis: 0, torVis: 0, bbVis: 0 });
stage.set({ ...BASE, ...ch.stage });
Object.assign(stage.cam, { ...stage.camT, az: stage.camT.az - 0.5, dist: stage.camT.dist * 1.25 });
stage.ready && stage.ready.then((ok) => { document.documentElement.classList.toggle('nogl', !ok); });
requestAnimationFrame(loop);
