// Memristor Lab — tiny canvas plotting: an oscilloscope with phosphor
// persistence and a general line/area chart. No dependencies.

const DPR = () => Math.min(window.devicePixelRatio || 1, 2);
export const COL = {
  cyan: '#5ad8ff', amber: '#ffb547', mag: '#ff5c8a', green: '#5ef0a8', red: '#ff5a5a',
  violet: '#a78bfa', ink: '#e9eef6', mute: '#9aa6b8', dim: '#627086', grid: 'rgba(150,180,220,.08)', axis: 'rgba(150,180,220,.22)',
};

export class Plot {
  constructor(cv) { this.cv = cv; this.g = cv.getContext('2d'); this.pad = [40, 10, 14, 24]; this.resize(); }
  resize() {
    const r = this.cv.getBoundingClientRect();
    if (r.width < 4) return false;
    const d = DPR();
    const w = Math.round(r.width * d), h = Math.round(r.height * d);
    if (this.cv.width !== w || this.cv.height !== h) { this.cv.width = w; this.cv.height = h; }
    this.w = r.width; this.h = r.height; this.d = d;
    return true;
  }
  // axes: {x:[min,max], y:[min,max], xlog, ylog}
  frame(ax) {
    this.ax = ax;
    const [l, t, r, b] = this.pad;
    const lx = (v) => (ax.xlog ? Math.log10(Math.max(v, 1e-30)) : v), ly = (v) => (ax.ylog ? Math.log10(Math.max(v, 1e-30)) : v);
    const x0 = lx(ax.x[0]), x1 = lx(ax.x[1]), y0 = ly(ax.y[0]), y1 = ly(ax.y[1]);
    this.X = (v) => l + ((lx(v) - x0) / (x1 - x0)) * (this.w - l - r);
    this.Y = (v) => t + (1 - (ly(v) - y0) / (y1 - y0)) * (this.h - t - b);
    return this;
  }
  invX(px) {
    const [l, , r] = this.pad, ax = this.ax;
    return ax.x[0] + ((px - l) / (this.w - l - r)) * (ax.x[1] - ax.x[0]);
  }
  clear() {
    const g = this.g; g.setTransform(this.d, 0, 0, this.d, 0, 0);
    g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
    g.clearRect(0, 0, this.w, this.h);
    return this;
  }
  grid({ xt = [], yt = [], fx = (v) => v, fy = (v) => v, xl = '', yl = '', zero = true } = {}) {
    const g = this.g, [l, t, r, b] = this.pad;
    g.lineWidth = 1; g.font = `500 9.5px ui-monospace,Menlo,Consolas,monospace`; g.textBaseline = 'middle';
    g.strokeStyle = COL.grid; g.fillStyle = COL.dim;
    for (const v of xt) { const x = Math.round(this.X(v)) + 0.5; g.beginPath(); g.moveTo(x, t); g.lineTo(x, this.h - b); g.stroke(); g.textAlign = 'center'; g.fillText(fx(v), x, this.h - b + 9); }
    for (const v of yt) { const y = Math.round(this.Y(v)) + 0.5; g.beginPath(); g.moveTo(l, y); g.lineTo(this.w - r, y); g.stroke(); g.textAlign = 'right'; g.fillText(fy(v), l - 5, y); }
    if (zero) {
      g.strokeStyle = COL.axis;
      const ax = this.ax;
      if (!ax.xlog && ax.x[0] < 0 && ax.x[1] > 0) { const x = Math.round(this.X(0)) + 0.5; g.beginPath(); g.moveTo(x, t); g.lineTo(x, this.h - b); g.stroke(); }
      if (!ax.ylog && ax.y[0] < 0 && ax.y[1] > 0) { const y = Math.round(this.Y(0)) + 0.5; g.beginPath(); g.moveTo(l, y); g.lineTo(this.w - r, y); g.stroke(); }
    }
    g.fillStyle = COL.mute; g.font = `600 9.5px ui-monospace,Menlo,Consolas,monospace`;
    if (xl) { g.textAlign = 'right'; g.textBaseline = 'bottom'; g.fillText(xl, this.w - r - 2, this.h - b - 3); }
    if (yl) { g.textAlign = 'left'; g.textBaseline = 'top'; g.fillText(yl, l + 4, t + 2); }
    return this;
  }
  line(pts, { color = COL.cyan, width = 1.6, alpha = 1, dash = null, glow = 0, fill = null } = {}) {
    if (!pts.length) return this;
    const g = this.g;
    g.save(); g.globalAlpha = alpha;
    g.beginPath();
    let first = true;
    for (const [x, y] of pts) { const X = this.X(x), Y = this.Y(y); if (!isFinite(X) || !isFinite(Y)) { first = true; continue; } if (first) { g.moveTo(X, Y); first = false; } else g.lineTo(X, Y); }
    if (fill) {
      g.save(); g.lineTo(this.X(pts[pts.length - 1][0]), this.Y(this.ax.y[0])); g.lineTo(this.X(pts[0][0]), this.Y(this.ax.y[0])); g.closePath();
      g.fillStyle = fill; g.fill(); g.restore();
      g.beginPath(); first = true;
      for (const [x, y] of pts) { const X = this.X(x), Y = this.Y(y); if (first) { g.moveTo(X, Y); first = false; } else g.lineTo(X, Y); }
    }
    if (dash) g.setLineDash(dash);
    g.lineJoin = 'round'; g.lineCap = 'round';
    if (glow) { g.shadowColor = color; g.shadowBlur = glow; }
    g.strokeStyle = color; g.lineWidth = width; g.stroke();
    g.restore();
    return this;
  }
  dot(x, y, { color = '#fff', r = 3.5, ring = COL.cyan, glow = 14 } = {}) {
    const g = this.g, X = this.X(x), Y = this.Y(y);
    if (!isFinite(X) || !isFinite(Y)) return this;
    g.save(); g.shadowColor = ring; g.shadowBlur = glow;
    g.fillStyle = ring; g.beginPath(); g.arc(X, Y, r + 2.5, 0, 7); g.globalAlpha = 0.35; g.fill();
    g.globalAlpha = 1; g.fillStyle = color; g.beginPath(); g.arc(X, Y, r, 0, 7); g.fill();
    g.restore();
    return this;
  }
  label(x, y, text, { color = COL.mute, align = 'left', base = 'middle', dx = 0, dy = 0, px = false } = {}) {
    const g = this.g; g.save();
    g.font = `600 9.5px ui-monospace,Menlo,Consolas,monospace`; g.fillStyle = color; g.textAlign = align; g.textBaseline = base;
    const X = px ? x : this.X(x), Y = px ? y : this.Y(y);
    g.fillText(text, X + dx, Y + dy); g.restore();
    return this;
  }
  band(x0, x1, color) {
    const g = this.g, [, t, , b] = this.pad;
    g.save(); g.fillStyle = color; g.fillRect(this.X(x0), t, this.X(x1) - this.X(x0), this.h - t - b); g.restore();
    return this;
  }
}

// Oscilloscope: XY trace with fading phosphor trail
export class Scope extends Plot {
  constructor(cv, n = 900) { super(cv); this.n = n; this.buf = []; this.pad = [42, 10, 12, 22]; }
  push(x, y) { this.buf.push([x, y]); if (this.buf.length > this.n) this.buf.splice(0, this.buf.length - this.n); }
  reset() { this.buf.length = 0; }
  trace({ color = COL.cyan, head = true, map = null } = {}) {
    const g = this.g, B = this.buf, n = B.length;
    if (n < 2) return this;
    const P = map ? B.map(map) : B;
    g.save(); g.lineJoin = 'round'; g.lineCap = 'round';
    g.globalCompositeOperation = 'lighter';
    const buckets = 18, per = Math.ceil(n / buckets);
    for (let pass = 0; pass < 2; pass++) {
      for (let k = 0; k < buckets; k++) {
        const s = k * per, e = Math.min(n - 1, s + per);
        if (e <= s) continue;
        const a = Math.pow((k + 1) / buckets, 1.6);
        g.beginPath();
        g.moveTo(this.X(P[s][0]), this.Y(P[s][1]));
        for (let j = s + 1; j <= e; j++) g.lineTo(this.X(P[j][0]), this.Y(P[j][1]));
        g.strokeStyle = color;
        if (pass === 0) { g.globalAlpha = a * 0.16; g.lineWidth = 6; } else { g.globalAlpha = a * 0.95; g.lineWidth = 1.7; }
        g.stroke();
      }
    }
    g.restore();
    if (head) { const [x, y] = P[n - 1]; this.dot(x, y, { ring: color }); }
    return this;
  }
}

// Strip chart helper: rolling time series
export class Strip {
  constructor(n = 400) { this.n = n; this.s = {}; }
  push(key, v) { const a = (this.s[key] ||= []); a.push(v); if (a.length > this.n) a.shift(); }
  get(key) { return this.s[key] || []; }
  reset() { this.s = {}; }
}

export const fmt = {
  si(v, unit = '', digits = 3) {
    if (!isFinite(v)) return '∞';
    const a = Math.abs(v);
    const P = [[1e9, 'G'], [1e6, 'M'], [1e3, 'k'], [1, ''], [1e-3, 'm'], [1e-6, 'µ'], [1e-9, 'n'], [1e-12, 'p']];
    if (a === 0) return '0 ' + unit;
    for (const [m, p] of P) if (a >= m * 0.9995) {
      const n = v / m, b = Math.abs(n);
      return (b >= 100 ? n.toFixed(0) : b >= 10 ? n.toFixed(digits > 2 ? 1 : 0) : n.toFixed(digits > 2 ? 2 : 1)) + ' ' + p + unit;
    }
    return v.toExponential(1) + ' ' + unit;
  },
  time(s) {
    if (!isFinite(s)) return 'never';
    if (s < 1) return fmt.si(s, 's', 2);
    if (s < 120) return s.toFixed(s < 10 ? 1 : 0) + ' s';
    if (s < 7200) return (s / 60).toFixed(0) + ' min';
    if (s < 86400 * 3) return (s / 3600).toFixed(0) + ' h';
    if (s < 3.15e7 * 2) return (s / 86400).toFixed(0) + ' days';
    return (s / 3.15e7).toPrecision(2) + ' yr';
  },
};
