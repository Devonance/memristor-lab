// Memristor Lab — menus, parts guide, breadboard anatomy, deep-dive reader, 3D toolbar.
import { PARTS, SYM, SCHEMATIC, ARTICLES } from './content.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const store = {
  get(k, d) { try { const v = localStorage.getItem('ml-' + k); return v === null ? d : v; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('ml-' + k, v); } catch (e) { /* private mode: fine */ } },
};

export function initUI(ctx) {
  const { stage, go, getCur, sections, linkify, openGloss, reveal } = ctx;

  /* ── generic modal ─────────────────────────────── */
  const modal = $('#modal'), mBody = $('#mBody'), mTitle = $('#mTitle');
  let onClose = null;
  function openModal(title, html, init, wide = false) {
    mTitle.textContent = title; mBody.innerHTML = html; mBody.scrollTop = 0;
    modal.classList.toggle('wide', wide);
    modal.hidden = false; setTimeout(() => modal.classList.add('on'), 16);
    init && init(mBody); linkify(mBody);
    $('#mClose').focus({ preventScroll: true });
  }
  function closeModal() { modal.classList.remove('on'); setTimeout(() => { modal.hidden = true; mBody.innerHTML = ''; }, 200); onClose && onClose(); onClose = null; }
  $('#mClose').addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

  /* ── parts guide ───────────────────────────────── */
  function partCard(p) {
    return `<div class="pcard">
      <div class="phead"><div class="psym">${SYM[p.sym] || ''}</div><div><h4>${p.name}</h4><p class="pwhat">${p.what}</p></div></div>
      <div class="pgrid">
        <section><h5>In this circuit</h5><p>${p.here}</p></section>
        <section><h5>How to read it</h5><ul>${p.read.map((r) => `<li>${r}</li>`).join('')}</ul></section>
        <section><h5>Where on the board</h5><p>${p.where}</p></section>
        ${p.tech ? `<section class="pro"><h5>Technical</h5><p class="mono-ish">${p.tech}</p></section>` : ''}
      </div>
      ${p.anatomy ? anatomyHTML() : ''}
      <div class="row"><button class="btn primary" data-show="${p.anchor}">Show me on the board</button>${p.anatomy ? '<button class="btn" data-xray>See inside (X-ray)</button>' : ''}</div>
    </div>`;
  }
  function openParts(key = 'breadboard') {
    const html = `<p class="note">Tap a part in the diagram or a tab to learn it. <b>Show me</b> flies the camera to it on the board.</p>
      <div class="schemwrap">${SCHEMATIC}</div>
      <div class="ptabs" role="tablist">${PARTS.map((p) => `<button role="tab" data-p="${p.key}">${p.name.replace(/ \(.*\)/, '')}</button>`).join('')}</div>
      <div id="pcard"></div>`;
    openModal('Parts guide', html, (root) => {
      const pick = (k) => {
        const p = PARTS.find((x) => x.key === k) || PARTS[0];
        $$('.ptabs button', root).forEach((b) => b.classList.toggle('on', b.dataset.p === p.key));
        $$('.schem .sp', root).forEach((g) => g.classList.toggle('on', g.dataset.part === p.key));
        $('#pcard', root).innerHTML = partCard(p); linkify($('#pcard', root));
        if (p.anatomy) wireAnatomy($('#pcard', root));
        stage.highlight(p.anchor);
      };
      root.addEventListener('click', (e) => {
        const t = e.target.closest('[data-p]'); if (t) return pick(t.dataset.p);
        const g = e.target.closest('.schem .sp'); if (g) return pick(g.dataset.part);
        const s = e.target.closest('[data-show]'); if (s) { closeModal(); reveal(); stage.focus(s.dataset.show, s.dataset.show === 'board' ? 0.9 : 0.42); return; }
        const x = e.target.closest('[data-xray]'); if (x) { closeModal(); reveal(); setXray(true); stage.focus('board', 0.95); }
      });
      pick(key);
    }, true);
  }

  /* ── breadboard anatomy: hover a hole, see what it's joined to ── */
  function anatomyHTML() {
    const C = 20, px = 22, x0 = 46;
    const rows = [['+', 'tp', 18], ['−', 'tm', 40], ['a', 'a', 78], ['b', 'b', 100], ['c', 'c', 122], ['d', 'd', 144], ['e', 'e', 166], ['f', 'f', 214], ['g', 'g', 236], ['h', 'h', 258], ['i', 'i', 280], ['j', 'j', 302], ['−', 'bm', 340], ['+', 'bp', 362]];
    let holes = '', strips = '';
    for (const [lab, r, y] of rows) {
      const rail = r.length === 2;
      for (let c = 1; c <= C; c++) {
        if (rail && c % 6 === 0) continue;   // rails come in groups of five
        const grp = rail ? `rail-${r}` : `col-${c}-${'abcde'.includes(r) ? 't' : 'b'}`;
        holes += `<rect class="ah" data-g="${grp}" data-n="${rail ? (r.endsWith('p') ? '+ rail' : '− rail') : r + c}" x="${x0 + (c - 1) * px - 6}" y="${y - 6}" width="12" height="12" rx="2"/>`;
      }
      holes += `<text class="al" x="22" y="${y + 4}">${lab}</text>`;
    }
    for (let c = 1; c <= C; c++) {
      if (c === 1 || c % 5 === 0) { holes += `<text class="al" x="${x0 + (c - 1) * px}" y="64" text-anchor="middle">${c}</text>`; }
      strips += `<rect class="st" x="${x0 + (c - 1) * px - 4}" y="72" width="8" height="100" rx="3"/><rect class="st" x="${x0 + (c - 1) * px - 4}" y="208" width="8" height="100" rx="3"/>`;
    }
    for (const [, r, y] of rows) if (r.length === 2) strips += `<rect class="st ${r.endsWith('p') ? 'pos' : 'neg'}" x="${x0 - 8}" y="${y - 4}" width="${(C - 1) * px + 16}" height="8" rx="3"/>`;
    return `<div class="anat">
      <h5>Inside a breadboard</h5>
      <div class="seg small" id="anView"><button data-v="top" class="on">Top view</button><button data-v="under">Metal strips underneath</button></div>
      <svg viewBox="0 0 500 380" class="anatsvg" role="img" aria-label="Breadboard layout: hover a hole to see which holes it connects to">
        <rect x="6" y="4" width="488" height="372" rx="10" class="abody"/>
        <path d="M30 8h460M30 50h460M30 330h460M30 372h460" class="arl"/>
        <rect x="30" y="182" width="460" height="16" rx="4" class="atr"/>
        <g class="astrips">${strips}</g><g class="aholes">${holes}</g>
        <text class="al" x="260" y="194" text-anchor="middle">centre trench</text>
      </svg>
      <p class="acap" id="anCap">Hover or tap any hole. Everything that lights up is joined to it by the same metal clip.</p>
    </div>`;
  }
  function wireAnatomy(root) {
    const svg = $('.anatsvg', root), cap = $('#anCap', root);
    const show = (el) => {
      $$('.ah.hl', svg).forEach((h) => h.classList.remove('hl'));
      if (!el) return;
      const g = el.dataset.g; $$(`.ah[data-g="${g}"]`, svg).forEach((h) => h.classList.add('hl'));
      cap.innerHTML = g.startsWith('rail')
        ? `<b>${el.dataset.n}</b>: every hole along this long row is joined. Plug the battery in here once, then take power from anywhere along it.`
        : `<b>${el.dataset.n}</b> is joined to the other 4 holes in its little strip (${g.endsWith('t') ? 'a–e' : 'f–j'} of column ${g.split('-')[1]}), and nothing else. Two legs in the same strip are connected.`;
    };
    svg.addEventListener('pointerover', (e) => show(e.target.closest('.ah')));
    svg.addEventListener('click', (e) => show(e.target.closest('.ah')));
    $('#anView', root).addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      $$('#anView button', root).forEach((x) => x.classList.toggle('on', x === b));
      svg.classList.toggle('under', b.dataset.v === 'under');
      if (b.dataset.v === 'under') setXray(true);
    });
  }

  /* ── deep-dive reader + widgets ───────────────── */
  function openArticle(id) {
    const a = ARTICLES.find((x) => x.id === id); if (!a) return;
    openModal(a.title, `<article class="art">${a.html}</article>`, (root) => {
      $$('.symbox', root).forEach((b) => (b.innerHTML = SYM[b.dataset.sym] || ''));
      if ($('#wpipe', root)) pipeWidget(root);
      if ($('#xbar', root)) crossbarWidget($('#xbar', root));
      if ($('#ledcalc', root)) ledCalc($('#ledcalc', root));
      $$('.myth', root).forEach((b) => b.addEventListener('click', () => b.classList.toggle('open')));
    });
  }
  function pipeWidget(root) {
    const V = $('#wpV', root), R = $('#wpR', root), body = $('#wpBody', root), drops = $('#wpDrops', root), lamp = $('#wpLamp', root);
    let raf, ph = 0, last = 0;
    const upd = () => {
      const v = +V.value, r = +R.value, i = v / r;
      for (const el of [V, R]) el.style.setProperty('--p', ((el.value - el.min) / (el.max - el.min)) * 100 + '%');
      $('#wpVo', root).textContent = v.toFixed(1) + ' V'; $('#wpRo', root).textContent = r + ' Ω';
      $('#wpI', root).textContent = (i * 1000).toFixed(1) + ' mA';
      const w = Math.max(4, 34 * (47 / r) ** 0.5);
      body.setAttribute('d', `M80 ${70 - 14}h60c20 0 20 ${14 - w / 2} 40 ${14 - w / 2}h120c20 0 20 ${w / 2 - 14} 40 ${w / 2 - 14}h18v28h-18c-20 0-20 ${w / 2 - 14} -40 ${w / 2 - 14}h-120c-20 0-20 ${14 - w / 2} -40 ${14 - w / 2}h-60z`);
      lamp.setAttribute('opacity', Math.min(1, 0.12 + i * 60).toFixed(2));
      return i;
    };
    drops.innerHTML = Array.from({ length: 14 }, () => '<circle r="2.6" fill="#e6f8ff"/>').join('');
    const loop = (t) => {
      const i = upd(), dt = last ? (t - last) / 1000 : 0; last = t;
      ph = (ph + dt * i * 900) % 1;
      [...drops.children].forEach((c, k) => { const u = (k / 14 + ph) % 1; c.setAttribute('cx', 84 + u * 280); c.setAttribute('cy', 70 + Math.sin(k * 2.3) * 3); });
      if (document.body.contains(root) && !modal.hidden) raf = requestAnimationFrame(loop);
    };
    V.addEventListener('input', upd); R.addEventListener('input', upd);
    raf = requestAnimationFrame(loop);
  }
  function crossbarWidget(el) {
    const N = 3, G = [[3, 1, 0], [0, 2, 1], [1, 0, 3]], Vin = [1, 0.5, 0.8];
    el.innerHTML = `<div class="xb">
      <div class="xin">${Vin.map((v, r) => `<label class="sl"><span>Input ${r + 1} <output data-o="${r}">${v.toFixed(1)} V</output></span><input type="range" min="0" max="1" step="0.05" value="${v}" data-v="${r}"></label>`).join('')}</div>
      <div class="xgrid">${G.map((row, r) => row.map((g, c) => `<button class="xc" data-r="${r}" data-c="${c}" aria-label="memristor row ${r + 1} column ${c + 1}"></button>`).join('')).join('')}</div>
      <div class="xout">${Array.from({ length: N }, (_, c) => `<div class="xbarcol"><i data-b="${c}"></i><span data-s="${c}"></span></div>`).join('')}</div>
    </div>`;
    const draw = () => {
      $$('.xc', el).forEach((b) => { const g = G[b.dataset.r][b.dataset.c]; b.style.setProperty('--g', g / 3); b.textContent = g; });
      const out = [0, 1, 2].map((c) => G.reduce((s, row, r) => s + row[c] * Vin[r], 0));
      out.forEach((o, c) => { $(`[data-b="${c}"]`, el).style.height = Math.min(100, (o / 6) * 100) + '%'; $(`[data-s="${c}"]`, el).textContent = o.toFixed(2); });
      $$('input', el).forEach((i) => i.style.setProperty('--p', i.value * 100 + '%'));
    };
    el.addEventListener('click', (e) => { const b = e.target.closest('.xc'); if (!b) return; G[b.dataset.r][b.dataset.c] = (G[b.dataset.r][b.dataset.c] + 1) % 4; draw(); });
    el.addEventListener('input', (e) => { const i = e.target.closest('[data-v]'); if (!i) return; Vin[i.dataset.v] = +i.value; $(`[data-o="${i.dataset.v}"]`, el).textContent = (+i.value).toFixed(1) + ' V'; draw(); });
    draw();
  }

  function ledCalc(el) {
    const V = $('#lcV', el), I = $('#lcI', el); let vf = 2.2, col = '#30d158';
    const E12 = [1, 1.2, 1.5, 1.8, 2.2, 2.7, 3.3, 3.9, 4.7, 5.6, 6.8, 8.2];
    const std = (r) => { const d = Math.pow(10, Math.floor(Math.log10(r))); for (const e of E12) if (e * d >= r - 1e-9) return e * d; return 10 * d; };
    const upd = () => {
      for (const s of [V, I]) s.style.setProperty('--p', ((s.value - s.min) / (s.max - s.min)) * 100 + '%');
      const v = +V.value, i = +I.value / 1000; $('#lcVo', el).textContent = v.toFixed(1) + ' V'; $('#lcIo', el).textContent = I.value + ' mA';
      const r = (v - vf) / i, rs = std(r), act = (v - vf) / rs * 1000;
      $('#lcR', el).textContent = r.toFixed(0) + ' Ω'; $('#lcStd', el).textContent = rs >= 1000 ? (rs / 1000).toFixed(1) + ' kΩ' : rs.toFixed(0) + ' Ω'; $('#lcAct', el).textContent = act.toFixed(1) + ' mA';
      const led = $('#lcLed', el); led.style.setProperty('--c', col); led.style.setProperty('--b', Math.min(1, act / 20).toFixed(2));
      $('#lcW', el).innerHTML = +I.value > 20 ? '⚠ Above about 20 mA most small LEDs overheat and burn out.' : v - vf < 0.5 ? 'The battery barely beats the LED voltage, so the brightness will be unreliable.' : '';
    };
    V.addEventListener('input', upd); I.addEventListener('input', upd);
    $('#lcCol', el).addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; $$('#lcCol button', el).forEach((x) => x.classList.toggle('on', x === b)); vf = +b.dataset.vf; col = b.dataset.c; upd(); });
    upd();
  }

  /* ── x-ray ─────────────────────────────────────── */
  let xray = false;
  function setXray(on) {
    xray = on; stage.set({ xray: on ? 1 : 0 });
    $$('[data-tool="xray"]').forEach((b) => b.classList.toggle('on', on));
    const lbl = ctx.anatomyLabels; lbl && lbl(on);
  }

  /* ── main menu drawer ──────────────────────────── */
  const menu = $('#menu');
  const stationList = $('#mStations');
  stationList.innerHTML = sections.map((s, k) => {
    const h = $('h1, h2', s).textContent.replace(/\s+/g, ' ');
    return `<li><button data-go-st="${k}"><span class="mn">${k === 0 ? '◆' : String(k).padStart(2, '0')}</span><span class="mt"><b>${h}</b><small>${s.dataset.title}</small></span><span class="mk" aria-hidden="true"></span></button></li>`;
  }).join('');
  $('#mDeep').innerHTML = ARTICLES.map((a) => `<li><button data-art="${a.id}"><span class="mt"><b>${a.title}</b><small>${a.blurb}</small></span></button></li>`).join('');
  const openMenu = () => {
    menu.hidden = false; setTimeout(() => menu.classList.add('on'), 16);
    $$('#mStations button').forEach((b) => { const k = +b.dataset.goSt; b.classList.toggle('on', k === getCur()); b.classList.toggle('seen', ctx.seen.has(k)); });
  };
  const closeMenu = () => { menu.classList.remove('on'); setTimeout(() => (menu.hidden = true), 250); };
  $('#menuBtn').addEventListener('click', openMenu);
  $('#menuX').addEventListener('click', closeMenu);
  menu.addEventListener('click', (e) => {
    if (e.target === menu) return closeMenu();
    const st = e.target.closest('[data-go-st]'); if (st) { closeMenu(); go(+st.dataset.goSt); return; }
    const ar = e.target.closest('[data-art]'); if (ar) { closeMenu(); openArticle(ar.dataset.art); return; }
    const a = e.target.closest('[data-menu]'); if (!a) return;
    const k = a.dataset.menu;
    closeMenu();
    if (k === 'parts') { if (getCur() !== 1) go(1); setTimeout(() => openParts(), getCur() === 1 ? 0 : 400); }
    else if (k === 'anatomy') { if (getCur() !== 1) go(1); setTimeout(() => openParts('breadboard'), 300); }
    else if (k === 'glossary') openGloss();
    else if (k === 'sources') { go(11); setTimeout(() => { const d = $$('#s11 details.rec')[1]; if (d) { d.open = true; d.scrollIntoView({ block: 'center' }); } }, 400); }
  });
  // settings
  const setQ = (q) => { stage.setQuality(q); store.set('quality', q); $$('#setQ button').forEach((b) => b.classList.toggle('on', b.dataset.q === q)); };
  $('#setQ').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setQ(b.dataset.q); });
  setQ(store.get('quality', 'auto'));
  const labelsT = $('#setLabels'), motionT = $('#setMotion');
  const applyLabels = (on) => { document.body.classList.toggle('nolabels', !on); store.set('labels', on ? '1' : '0'); labelsT.checked = on; $$('[data-tool="labels"]').forEach((b) => b.classList.toggle('on', on)); };
  labelsT.addEventListener('change', () => applyLabels(labelsT.checked));
  applyLabels(store.get('labels', '1') === '1');
  const applyMotion = (on) => { stage.noSway = !on; store.set('motion', on ? '1' : '0'); motionT.checked = on; };
  motionT.addEventListener('change', () => applyMotion(motionT.checked));
  applyMotion(store.get('motion', '1') === '1');

  /* ── 3D toolbar ────────────────────────────────── */
  $('#tools').addEventListener('click', (e) => {
    const b = e.target.closest('[data-tool]'); if (!b) return;
    const t = b.dataset.tool;
    if (t === 'reset') stage.resetView();
    else if (t === 'in') stage.zoomBy(0.8);
    else if (t === 'out') stage.zoomBy(1.25);
    else if (t === 'labels') applyLabels(document.body.classList.contains('nolabels'));
    else if (t === 'full') ctx.toggleImmersive();
    else if (t === 'xray') setXray(!xray);
    else if (t === 'parts') openParts();
  });

  // the 30-second tour video: only fetched when someone asks for it
  function openTour() {
    openModal('30-second tour', `<video class="tourvid" src="media/tour.mp4" poster="media/tour.jpg" controls playsinline autoplay preload="none"></video>
      <p class="note">A quick look at the lab on a laptop and a phone. Close this to try the real thing.</p>`, (root) => {
      const v = root.querySelector('video'); ctx.sound && ctx.sound.duck && ctx.sound.duck(true);
      onClose = () => { v.pause(); ctx.sound && ctx.sound.duck && ctx.sound.duck(false); };
    }, true);
  }
  document.addEventListener('click', (e) => { if (e.target.closest('[data-tour]')) openTour(); });

  // any [data-art] link outside the menu opens that deep dive
  document.addEventListener('click', (e) => { const a = e.target.closest('[data-art]'); if (a && !a.closest('#menu')) openArticle(a.dataset.art); });

  addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (!modal.hidden) closeModal();
    if (!menu.hidden) closeMenu();
  });

  return { openParts, openArticle, setXray, isOpen: () => !modal.hidden || !menu.hidden, closeAll: () => { if (!modal.hidden) closeModal(); if (!menu.hidden) closeMenu(); } };
}
