// Memristor Lab — device models.
//
// Every model here uses the functional form from the literature it is named
// after; the parameter values are chosen so the behaviour is visible on screen,
// not fitted to any particular device.
//
// Units, unless a model says otherwise: volts, kΩ, mA, ms
// (so charge is in µC and flux linkage φ = ∫v dt is in V·ms = mWb).

export const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const kB = 8.617e-5; // Boltzmann constant, eV/K

// Shared helper: a model exposes `x` in [0,1] = how conductive it is (1 = ON).

/* ------------------------------------------------------------------ */
/* Chua 1971: ideal charge-controlled memristor, v = M(q)·i, dq/dt = i */
/* ------------------------------------------------------------------ */
export class Ideal {
  constructor(o = {}) {
    this.Ron = 1; this.Roff = 12; this.qc = 0.03; this.qw = 0.008;
    this.linear = false; // M constant -> it is just a resistor
    this.q0 = 0;
    Object.assign(this, o);
    this.reset();
  }
  reset() { this.q = this.q0; this.i = 0; this.v = 0; }
  M(q) {
    if (this.linear) return 0.5 * (this.Ron + this.Roff) * 0.6;
    return this.Ron + (this.Roff - this.Ron) / (1 + Math.exp((q - this.qc) / this.qw));
  }
  // φ̂(q) = ∫ M dq  (closed form of the logistic M above), φ̂(0) = 0
  phi(q) {
    if (this.linear) return this.M(0) * q;
    const F = (s) => this.Ron * s + (this.Roff - this.Ron) * (s - this.qw * Math.log1p(Math.exp((s - this.qc) / this.qw)));
    return F(q) - F(0);
  }
  step(v, dt) {
    // midpoint rule on dq/dt = v / M(q)
    const k1 = v / this.M(this.q);
    const k2 = v / this.M(this.q + 0.5 * dt * k1);
    this.q += dt * k2;
    this.v = v; this.i = v / this.M(this.q);
    return this.i;
  }
  get R() { return this.M(this.q); }
  get x() { return clamp((this.Roff - this.M(this.q)) / (this.Roff - this.Ron), 0, 1); }
}

/* ------------------------------------------------------------------ */
/* Strukov et al. 2008 (HP): linear ion drift + window functions       */
/* v = [Ron·x + Roff·(1−x)]·i,  dx/dt = k·i·F(x, i),  x = w/D           */
/* ------------------------------------------------------------------ */
export const WINDOWS = {
  none: { name: 'None (hard clamp)', f: () => 1 },
  joglekar: { name: 'Joglekar–Wolf', f: (x, i, p) => 1 - Math.pow(2 * x - 1, 2 * p) },
  biolek: { name: 'Biolek', f: (x, i, p) => 1 - Math.pow(x - (i < 0 ? 1 : 0), 2 * p) },
  prodromakis: { name: 'Prodromakis', f: (x, i, p) => 1 - Math.pow(Math.pow(x - 0.5, 2) + 0.75, p) },
};
export class HP {
  constructor(o = {}) {
    this.Ron = 1; this.Roff = 12; this.k = 18; this.x0 = 0.1;
    this.window = 'joglekar'; this.p = 2;
    Object.assign(this, o);
    this.reset();
  }
  reset() { this.w = this.x0; this.i = 0; this.v = 0; this.locked = false; }
  get R() { return this.Ron * this.w + this.Roff * (1 - this.w); }
  get x() { return this.w; }
  F(x, i) {
    const W = WINDOWS[this.window];
    let f = W.f(x, i, this.p);
    if (this.window === 'prodromakis') f = f / (1 - Math.pow(0.75, this.p)); // normalise to 1 at centre
    return f;
  }
  step(v, dt) {
    const i = v / this.R;
    let w = this.w + dt * this.k * i * this.F(this.w, i);
    // the physical film only spans 0..D: any window leaves the clamp as the last line of defence
    w = clamp(w, 0, 1);
    this.locked = (this.window === 'joglekar' || this.window === 'prodromakis') && (w <= 0 || w >= 1);
    this.w = w;
    this.v = v; this.i = v / this.R;
    return this.i;
  }
}

/* ------------------------------------------------------------------ */
/* VTEAM-style threshold device (Kvatinsky 2015)                       */
/* dx/dt = k_on (v/v_on − 1)^α (1−x)   for v > v_on                    */
/*       = −k_off (v/v_off − 1)^α x    for v < v_off, else 0           */
/* R = Ron·(Roff/Ron)^(1−x)  (exponential, tunnelling-like)            */
/* ------------------------------------------------------------------ */
export class Threshold {
  constructor(o = {}) {
    this.Ron = 1; this.Roff = 12; this.von = 0.55; this.voff = -0.55;
    this.kon = 60; this.koff = 60; this.a = 2; this.x0 = 0;
    Object.assign(this, o);
    this.reset();
  }
  reset() { this.s = this.x0; this.i = 0; this.v = 0; }
  get x() { return this.s; }
  get R() { return this.Ron * Math.pow(this.Roff / this.Ron, 1 - this.s); }
  dx(v) {
    if (v > this.von) return this.kon * Math.pow(v / this.von - 1, this.a) * (1 - this.s);
    if (v < this.voff) return -this.koff * Math.pow(v / this.voff - 1, this.a) * this.s;
    return 0;
  }
  step(v, dt) {
    this.s = clamp(this.s + dt * this.dx(v), 0, 1);
    this.v = v; this.i = v / this.R;
    return this.i;
  }
}

/* ------------------------------------------------------------------ */
/* Stanford/PKU-type filament-gap model (Yu, Wong et al.)              */
/* I = I0·e^(−g/g0)·sinh(V/V0)                                         */
/* dg/dt = −v0·e^(−Ea/kT)·sinh(γ·a0·V/(t_ox·kT))   (+ noise)           */
/* T = T0 + V·I·Rth  (self-heating)                                    */
/* SI-ish units here: V, A, s, nm, K.                                  */
/* ------------------------------------------------------------------ */
export class Filament {
  constructor(o = {}) {
    this.I0 = 4e-5; this.g0 = 0.25; this.V0 = 0.4;
    this.gmin = 0.1; this.gmax = 1.7;
    this.v0 = 2e13;          // nm/s, attempt velocity (toy)
    this.Ea = 1.0;           // eV, activation energy for vacancy hops
    this.alpha = 0.42;       // eV/V, = γ·a0/t_ox : how much of the field lowers the barrier
    this.T0 = 300; this.Rth = 3.5e5; // K/W
    this.noise = 0;          // 0..1, cycle-to-cycle variability
    this.g = this.gmax;
    Object.assign(this, o);
    this.reset();
  }
  reset() { this.g = this.gmax; this.T = this.T0; this.i = 0; this.v = 0; this.kick = 1; this.lastSign = 0; this.rtn = 0; }
  current(V, g) { return this.I0 * Math.exp(-g / this.g0) * Math.sinh(V / this.V0); }
  rate(V, T) { const kT = kB * T; return this.v0 * Math.exp(-this.Ea / kT) * Math.sinh(this.alpha * V / kT); }
  get x() { return clamp((this.gmax - this.g) / (this.gmax - this.gmin), 0, 1); }
  get R() { const I = this.current(0.1, this.g); return 0.1 / I; } // read resistance at 0.1 V, Ω
  step(V, dt) {
    // new random "kick" for each half-cycle: a different filament every time
    const sg = Math.sign(V);
    if (sg !== 0 && sg !== this.lastSign) {
      this.lastSign = sg;
      this.kick = this.noise > 0 ? Math.exp(this.noise * 2.2 * gauss()) : 1;
    }
    let t = 0, n = 0;
    while (t < dt && n < 400) {
      const I = this.current(V, this.g);
      this.T = this.T0 + Math.abs(V * I) * this.Rth;
      const r = this.rate(V, this.T) * this.kick;
      // adaptive sub-step: never move the gap by more than 0.004 nm at once
      let h = dt - t;
      if (Math.abs(r) * h > 0.004) h = 0.004 / Math.abs(r);
      this.g = clamp(this.g - r * h, this.gmin, this.gmax);
      t += h; n++;
    }
    if (this.noise > 0) this.rtn += (Math.random() < 0.02 ? (Math.random() < 0.5 ? -1 : 1) * 0.04 * this.noise : 0) - this.rtn * 0.01;
    this.v = V;
    this.i = this.current(V, this.g) * (1 + this.rtn);
    this.T = this.T0 + Math.abs(V * this.i) * this.Rth;
    return this.i;
  }
  // time to SET from the fully-off gap with a constant voltage, s (Infinity if never)
  switchTime(V, gTarget) {
    const save = [this.g, this.T, this.kick];
    this.g = this.gmax; this.kick = 1;
    gTarget = gTarget ?? 0.5 * (this.gmin + this.gmax);
    let t = 0;
    for (let k = 0; k < 4000; k++) {
      const I = this.current(V, this.g);
      const T = this.T0 + Math.abs(V * I) * this.Rth;
      const r = this.rate(V, T);
      if (r <= 0) { t = Infinity; break; }
      const h = 0.004 / r;
      this.g -= r * h; t += h;
      if (this.g <= gTarget) break;
      if (t > 1e12) { t = Infinity; break; }
    }
    [this.g, this.T, this.kick] = save;
    return t;
  }
}

/* ------------------------------------------------------------------ */
/* Locally-active thermal Mott memristor (NbO2-like) in a              */
/* Pearson–Anson relaxation oscillator.                               */
/* G(T): Arrhenius insulator blended into a metal above T_c.          */
/* C_th dT/dt = V²G(T) − (T − T0)/R_th                                 */
/* C dV/dt = (Vs − V)/Rs − V·G(T)                                      */
/* Units: V, mA, kΩ (G in mS), µs, K.                                  */
/* ------------------------------------------------------------------ */
export class Mott {
  constructor(o = {}) {
    this.T0 = 300; this.Tc = 1070; this.dTc = 25;
    this.Gins = 0.02;   // mS at T0
    this.Gmet = 10;     // mS metallic
    this.Ea = 0.22;     // eV, insulating-state activation
    this.Rth = 6e5;     // K/W -> with mW: K per mW = 600
    this.tth = 0.6;     // µs thermal time constant
    this.Rs = 9;        // kΩ series resistor
    this.C = 1.2;       // nF  -> Rs*C in µs
    this.Vs = 4;
    Object.assign(this, o);
    this.reset();
  }
  reset() { this.T = this.T0; this.V = 0; this.i = 0; }
  G(T) {
    const gi = this.Gins * Math.exp(-(this.Ea / kB) * (1 / T - 1 / this.T0));
    const m = 1 / (1 + Math.exp(-(T - this.Tc) / this.dTc));
    return (1 - m) * gi + m * this.Gmet;
  }
  get x() { return clamp((this.T - this.T0) / (this.Tc + 150 - this.T0), 0, 1); }
  step(dt) {
    let t = 0, n = 0;
    while (t < dt && n < 600) {
      const h = Math.min(dt - t, 0.004);
      const G = this.G(this.T);
      const P = this.V * this.V * G; // mW
      const dT = (P * this.Rth * 1e-3 - (this.T - this.T0)) / this.tth;
      const dV = ((this.Vs - this.V) / this.Rs - this.V * G) / this.C;
      this.T = Math.max(this.T0 * 0.5, this.T + h * dT);
      this.V += h * dV;
      t += h; n++;
    }
    this.i = this.V * this.G(this.T);
    return this.i;
  }
  // steady-state DC curve, parametrised by temperature: V(T), I(T)
  dcCurve(n = 200) {
    const pts = [];
    for (let k = 0; k <= n; k++) {
      const T = this.T0 + 1 + (k / n) * 1100;
      const G = this.G(T);
      const P = (T - this.T0) / (this.Rth * 1e-3); // mW
      const V = Math.sqrt(P / G), I = V * G;
      pts.push([V, I, T]);
    }
    return pts;
  }
}

/* ------------------------------------------------------------------ */
/* Pershin–Di Ventra series-capacitor test                             */
/* source → device → capacitor C.  The device carries exactly the     */
/* capacitor's charge, so once the capacitor is back to q = 0 an ideal */
/* memristor must be back to its initial resistance.                   */
/* ------------------------------------------------------------------ */
export class CapTest {
  constructor(device, C = 1) {
    this.dev = device; this.C = C;
    this.reset();
  }
  reset() {
    this.dev.reset(); this.qc = 0; this.t = 0; this.R0 = this.dev.R; this.vs = 0;
    this.vm = 0; this.i = 0;
  }
  step(vs, dt) {
    const n = 8, h = dt / n;
    for (let k = 0; k < n; k++) {
      const vm = vs - this.qc / this.C;
      if (this.dev instanceof Ideal) {
        // the ideal device's charge IS the capacitor charge
        this.dev.q = this.dev.q0 + this.qc;
        const i = vm / this.dev.M(this.dev.q);
        this.qc += h * i; this.dev.q = this.dev.q0 + this.qc;
        this.i = i;
      } else {
        const i = this.dev.step(vm, h);
        this.qc += h * i; this.i = i;
      }
      this.vm = vm;
    }
    this.vs = vs; this.t += dt;
  }
}

export function gauss() {
  let u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/* ------------------------------------------------------------------ */
/* Linear elements, for the "same sine, four answers" comparison.      */
/* ------------------------------------------------------------------ */
export function elementLoop(kind, n = 240) {
  // returns [v, i] pairs over one period, unit amplitude, arbitrary scale
  const pts = [];
  for (let k = 0; k <= n; k++) {
    const th = (k / n) * 2 * Math.PI;
    const v = Math.sin(th);
    let i;
    if (kind === 'R') i = 0.8 * v;
    else if (kind === 'C') i = 0.8 * Math.cos(th);       // current leads voltage
    else if (kind === 'L') i = -0.8 * Math.cos(th);      // current lags voltage
    else i = 0;
    pts.push([v, i]);
  }
  return pts;
}

// Periodic drive helper. shape: 'sine' | 'tri' | 'square'
export function wave(shape, ph) {
  const s = ph - Math.floor(ph);
  if (shape === 'tri') return s < 0.25 ? 4 * s : s < 0.75 ? 2 - 4 * s : 4 * s - 4;
  if (shape === 'square') return s < 0.5 ? 1 : -1;
  return Math.sin(2 * Math.PI * s);
}

// Lobe area of a v-i loop (shoelace), used for the frequency fingerprint.
export function loopArea(pts) {
  let a = 0;
  for (let k = 0; k < pts.length - 1; k++) a += pts[k][0] * pts[k + 1][1] - pts[k + 1][0] * pts[k][1];
  return Math.abs(a) / 2;
}
