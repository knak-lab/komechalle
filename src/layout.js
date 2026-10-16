// 力学モデルで自動配置する（Fruchterman–Reingold 法）。nodes の x, y を書きかえる
export function runForce(nodes, edges, iters = 500) {
  const N = nodes.length;
  const k = 190;
  const idx = new Map(nodes.map((n, i) => [n.id, i]));
  nodes.forEach((n, i) => {
    if (!Number.isFinite(n.x) || !Number.isFinite(n.y)) {
      const a = i * 2.399;
      const r = 40 + 14 * i;
      n.x = Math.cos(a) * r;
      n.y = Math.sin(a) * r;
    }
  });
  const P = nodes;
  for (let it = 0; it < iters; it++) {
    const t = Math.max(2, 70 * (1 - it / iters));
    const dx = new Float64Array(N);
    const dy = new Float64Array(N);
    for (let i = 0; i < N; i++)
      for (let j = i + 1; j < N; j++) {
        let x = P[i].x - P[j].x;
        let y = P[i].y - P[j].y;
        let d = Math.hypot(x, y);
        if (d < 1) { x = (i % 3) - 0.5; y = (j % 3) - 0.5; d = Math.hypot(x, y); }
        const f = (k * k) / d;
        dx[i] += (x / d) * f; dy[i] += (y / d) * f;
        dx[j] -= (x / d) * f; dy[j] -= (y / d) * f;
      }
    for (const e of edges) {
      const a = idx.get(e.from);
      const b = idx.get(e.to);
      if (a == null || b == null) continue;
      const x = P[a].x - P[b].x;
      const y = P[a].y - P[b].y;
      const d = Math.hypot(x, y) || 0.01;
      const w = e.type === 'skill' ? 0.3 : e.auto ? 0.55 : 1;
      const f = ((d * d) / k) * w;
      dx[a] -= (x / d) * f; dy[a] -= (y / d) * f;
      dx[b] += (x / d) * f; dy[b] += (y / d) * f;
    }
    for (let i = 0; i < N; i++) {
      dx[i] -= P[i].x * 0.06;
      dy[i] -= P[i].y * 0.06;
      const d = Math.hypot(dx[i], dy[i]);
      if (d > 0) {
        const m = Math.min(d, t);
        P[i].x += (dx[i] / d) * m;
        P[i].y += (dy[i] / d) * m;
      }
    }
  }
}

// 位置がまだない点（スプレッドシートに直接足した行など）を、つながっている点の近くに置く
export function placeMissing(nodes, edges) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const placed = nodes.filter((n) => Number.isFinite(n.x) && Number.isFinite(n.y));
  if (!placed.length) return false;
  const cx = placed.reduce((s, n) => s + n.x, 0) / placed.length;
  const cy = placed.reduce((s, n) => s + n.y, 0) / placed.length;
  let changed = false;
  nodes.forEach((n, i) => {
    if (Number.isFinite(n.x) && Number.isFinite(n.y)) return;
    const e = edges.find((e) => (e.from === n.id || e.to === n.id));
    const o = e && byId.get(e.from === n.id ? e.to : e.from);
    const base = o && Number.isFinite(o.x) ? o : { x: cx, y: cy };
    const a = i * 2.399;
    n.x = base.x + Math.cos(a) * 160;
    n.y = base.y + Math.sin(a) * 160;
    changed = true;
  });
  return changed;
}
