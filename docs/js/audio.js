// Memristor Lab — music and sound.
// Plays the track named in audio/tracks.json (e.g. a Google Lyria file); otherwise a small
// generative ambient loop written with the Web Audio API (no download at all).
// Browsers only allow sound after the visitor interacts, so it starts on the first tap.

const store = {
  get(k, d) { try { const v = localStorage.getItem('ml-' + k); return v === null ? d : v; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('ml-' + k, v); } catch (e) { /* fine */ } },
};

export class Sound {
  constructor() {
    this.on = store.get('sound', 'on') === 'on';
    this.started = false;
    this.ctx = null;
    this.trackURL = 'audio/lab-theme.mp3';
    this.listeners = new Set();
    const kick = () => { if (this.on) this.start(); };
    addEventListener('pointerdown', kick, { once: true, capture: true });
    addEventListener('keydown', kick, { once: true, capture: true });
    document.addEventListener('visibilitychange', () => this.duck(document.hidden));
  }
  onChange(fn) { this.listeners.add(fn); fn(this.on); }
  toggle() { this.set(!this.on); }
  set(on) {
    this.on = on; store.set('sound', on ? 'on' : 'off');
    if (on) this.start(); this.fade(on ? 1 : 0);
    this.listeners.forEach((f) => f(on));
  }

  async start() {
    if (this.started) { this.fade(this.on ? 1 : 0); return; }
    this.started = true;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const ctx = (this.ctx = new AC());
    this.master = ctx.createGain(); this.master.gain.value = 0; this.master.connect(ctx.destination);
    this.musicBus = ctx.createGain(); this.musicBus.gain.value = 0.9; this.musicBus.connect(this.master);
    this.sfxBus = ctx.createGain(); this.sfxBus.gain.value = 0.55; this.sfxBus.connect(this.master);
    this.verb = ctx.createConvolver(); this.verb.buffer = this.impulse(3.2);
    const vg = ctx.createGain(); vg.gain.value = 0.55; this.verb.connect(vg); vg.connect(this.master);
    // a real track if one has been added, otherwise the generative loop
    let usedFile = false;
    try {
      // audio/tracks.json names the music file once one has been added: { "theme": "lab-theme.mp3" }
      const list = await (await fetch('audio/tracks.json', { cache: 'no-cache' })).json();
      if (list.theme) {
        this.trackURL = 'audio/' + list.theme;
        const el = (this.el = new Audio(this.trackURL)); el.loop = true; el.crossOrigin = 'anonymous';
        const src = ctx.createMediaElementSource(el); const g = ctx.createGain(); g.gain.value = 0.5;
        src.connect(g); g.connect(this.musicBus); await el.play(); usedFile = true;
      }
    } catch (e) { /* no file: generate instead */ }
    if (!usedFile) this.generative();
    this.fade(this.on ? 1 : 0, 2.5);
  }
  fade(to, sec = 0.6) {
    if (!this.ctx) return;
    const g = this.master.gain, t = this.ctx.currentTime;
    if (to > 0 && this.ctx.state === 'suspended') this.ctx.resume();
    g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(to * 0.32, t + sec);
  }
  duck(hidden) { if (!this.ctx) return; if (hidden) this.ctx.suspend(); else if (this.on) this.ctx.resume(); }
  impulse(sec) {
    const ctx = this.ctx, n = Math.floor(ctx.sampleRate * sec), b = ctx.createBuffer(2, n, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3.2); }
    return b;
  }

  /* ── generative ambient: 88 BPM, Rhodes-ish arpeggio over soft pads ── */
  generative() {
    const ctx = this.ctx, beat = 60 / 88;
    const midi = (m) => 440 * Math.pow(2, (m - 69) / 12);
    // Cmaj9 → Am9 → Fmaj7#11 → Gsus2 : warm, curious, a little mysterious
    const chords = [[48, 55, 59, 62, 64], [45, 52, 55, 59, 60], [41, 48, 52, 55, 59], [43, 50, 55, 57, 62]];
    let next = ctx.currentTime + 0.1, step = 0;
    const pad = (notes, t, dur) => {
      for (const n of notes.slice(1)) for (const det of [-7, 6]) {
        const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
        o.type = 'sawtooth'; o.frequency.value = midi(n + 12); o.detune.value = det;
        f.type = 'lowpass'; f.frequency.value = 900; f.Q.value = 0.3;
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.018, t + 1.8); g.gain.setValueAtTime(0.018, t + dur - 1.2); g.gain.linearRampToValueAtTime(0, t + dur + 1.6);
        o.connect(f); f.connect(g); g.connect(this.musicBus); g.connect(this.verb);
        o.start(t); o.stop(t + dur + 1.8);
      }
    };
    const pluck = (n, t, v) => {
      const o = ctx.createOscillator(), o2 = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
      o.type = 'sine'; o2.type = 'triangle'; o.frequency.value = midi(n); o2.frequency.value = midi(n) * 2.001;
      f.type = 'lowpass'; f.frequency.setValueAtTime(5200, t); f.frequency.exponentialRampToValueAtTime(900, t + 0.6);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
      o.connect(g); o2.connect(g); g.connect(f); f.connect(this.musicBus); f.connect(this.verb);
      o.start(t); o2.start(t); o.stop(t + 1.5); o2.stop(t + 1.5);
    };
    const bass = (n, t) => {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.value = midi(n - 12);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16, t + 0.04); g.gain.exponentialRampToValueAtTime(0.0001, t + beat * 1.6);
      o.connect(g); g.connect(this.musicBus); o.start(t); o.stop(t + beat * 1.7);
    };
    const tick = (t, v) => {
      const len = 0.05, b = ctx.createBuffer(1, Math.floor(ctx.sampleRate * len), ctx.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 6);
      const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      s.buffer = b; f.type = 'highpass'; f.frequency.value = 7000; g.gain.value = v;
      s.connect(f); f.connect(g); g.connect(this.musicBus); s.start(t);
    };
    const motif = [0, 2, 3, 2, 4, 3, 1, 3];
    const schedule = () => {
      if (!this.ctx) return;
      while (next < ctx.currentTime + 0.3) {
        const bar = Math.floor(step / 8), chord = chords[Math.floor(bar / 2) % 4], in8 = step % 8;
        if (step % 16 === 0) pad(chord, next, beat * 8);
        if (in8 % 4 === 0) bass(chord[0], next);
        const sparse = bar % 8 < 2;                         // breathe: thinner at the top of each cycle
        if (!sparse || in8 % 2 === 0) { const n = chord[1 + (motif[(step + bar) % 8] % 4)] + 12 + (in8 > 5 ? 12 : 0); if (Math.random() < 0.86) pluck(n, next, 0.05 + Math.random() * 0.03); }
        if (!sparse && in8 % 2 === 1 && Math.random() < 0.7) tick(next, 0.03);
        if (step % 32 === 28 && Math.random() < 0.6) pluck(chord[4] + 24, next, 0.03);
        next += beat / 2; step++;
      }
    };
    this.timer = setInterval(schedule, 40); schedule();
  }

  /* ── small sound effects, in the same key ── */
  sfx(kind) {
    if (!this.on || !this.ctx) return;
    const ctx = this.ctx, t = ctx.currentTime + 0.01;
    const tone = (f, dur, v, type = 'sine', at = 0) => {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t + at); g.gain.exponentialRampToValueAtTime(v, t + at + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + at + dur);
      o.connect(g); g.connect(this.sfxBus); g.connect(this.verb); o.start(t + at); o.stop(t + at + dur + 0.05);
    };
    if (kind === 'press') tone(523.25, 0.12, 0.12, 'triangle');
    else if (kind === 'release') tone(392, 0.1, 0.07, 'triangle');
    else if (kind === 'flip') { tone(659.25, 0.08, 0.08, 'square'); tone(493.88, 0.1, 0.06, 'square', 0.05); }
    else if (kind === 'xray') { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(880, t + 0.5); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.08, t + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6); o.connect(g); g.connect(this.sfxBus); g.connect(this.verb); o.start(t); o.stop(t + 0.7); }
    else if (kind === 'quest') [523.25, 659.25, 783.99, 1046.5].forEach((f, k) => tone(f, 0.5, 0.09, 'sine', k * 0.08));
    else if (kind === 'step') tone(783.99, 0.18, 0.05, 'sine');
    else if (kind === 'zap') { const n = ctx.createBufferSource(), b = ctx.createBuffer(1, ctx.sampleRate * 0.12, ctx.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 3); n.buffer = b; const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 3000; const g = ctx.createGain(); g.gain.value = 0.12; n.connect(f); f.connect(g); g.connect(this.sfxBus); n.start(t); }
  }
}
