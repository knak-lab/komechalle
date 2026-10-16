import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { TYPES, avColor, ymd } from '../config';

const clampK = (k) => Math.max(0.3, Math.min(2.5, k));

function edgeText(e) {
  const t = TYPES[e.type];
  return e.type === 'other' ? e.label || 'その他' : t.name + (e.label ? '：' + e.label : '');
}

function NodeShape({ n }) {
  if (n.kind === 'member') {
    const w = n.role ? n.role.length * 12 + 14 : 0;
    return (
      // face ごとホバーで拡大する
      <g className="face">
        <circle className="halo" r={63} />
        {n.photo ? (
          <image href={n.photo} x={-56} y={-56} width={112} height={112} clipPath="url(#clip-c)" preserveAspectRatio="xMidYMid slice" />
        ) : (
          <>
            <circle r={56} style={{ fill: `var(${avColor(n.id)})` }} />
            <text className="ini">{n.name[0]}</text>
          </>
        )}
        <circle className="rim" r={56} />
        {n.role && (
          <>
            <rect className="rolebg" x={-w / 2} y={-67} width={w} height={17} rx={8.5} />
            <text className="role" y={-58.5}>{n.role}</text>
          </>
        )}
        <text className="nm" y={76}>{n.name}</text>
      </g>
    );
  }
  if (n.kind === 'skill') {
    const w = n.name.length * 13 + 24;
    return (
      <>
        <rect className="halo" x={-w / 2 - 4} y={-17} width={w + 8} height={34} rx={17} />
        <rect className="box" x={-w / 2} y={-13} width={w} height={26} rx={13} />
        <text className="lbl">#{n.name}</text>
      </>
    );
  }
  const w = Math.max(96, n.name.length * 14 + 28);
  const h = 46;
  const rx = n.kind === 'event' ? 23 : 6;
  return (
    <>
      <rect className="halo" x={-w / 2 - 4} y={-h / 2 - 4} width={w + 8} height={h + 8} rx={rx + 4} />
      <rect className="box" x={-w / 2} y={-h / 2} width={w} height={h} rx={rx} />
      <text className="kind" y={-9}>
        {n.kind === 'event' ? ymd(n.date).replace(/^\d+年/, '') : `田んぼ ${n.size || ''}`}
      </text>
      <text className="lbl" y={9}>{n.name}</text>
    </>
  );
}

const MapView = forwardRef(function MapView(
  { nodes, edges, sel, connectFrom, query, typesOn, fitKey, focus, onTapNode, onTapBackground, onMoveNode, onMoveEnd },
  ref,
) {
  const svgRef = useRef(null);
  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
  const viewRef = useRef(view);
  viewRef.current = view;
  const [hoverId, setHoverId] = useState(null);
  const [panning, setPanning] = useState(false);
  const drag = useRef(null);
  const ptrs = useRef(new Map());

  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);
  const byIdRef = useRef(byId);
  byIdRef.current = byId;

  const visibleNode = (n) => n.kind !== 'skill' || typesOn.skill;
  // 選んだ人の線は、オフの種類でも表示する
  const visibleEdge = (e) => {
    const a = byId.get(e.from);
    const b = byId.get(e.to);
    return a && b && (typesOn[e.type] || (sel && (e.from === sel || e.to === sel))) && visibleNode(a) && visibleNode(b);
  };

  const neighbors = useMemo(() => {
    if (!sel) return null;
    const s = new Set([sel]);
    for (const e of edges) {
      if (e.from === sel) s.add(e.to);
      if (e.to === sel) s.add(e.from);
    }
    return s;
  }, [sel, edges]);

  const matches = useMemo(() => {
    const q = query.trim();
    const s = new Set();
    if (!q) return s;
    for (const n of nodes) if (n.name.includes(q)) s.add(n.id);
    for (const e of edges)
      if (e.type === 'skill' && byId.get(e.to)?.name.includes(q)) s.add(e.from);
    return s;
  }, [query, nodes, edges, byId]);

  const toLocal = (cx, cy) => {
    const r = svgRef.current.getBoundingClientRect();
    return { x: cx - r.left, y: cy - r.top };
  };
  const toWorld = (cx, cy) => {
    const p = toLocal(cx, cy);
    const v = viewRef.current;
    return { x: (p.x - v.x) / v.k, y: (p.y - v.y) / v.k };
  };
  const zoomAt = (px, py, f) =>
    setView((v) => {
      const k = clampK(v.k * f);
      const wx = (px - v.x) / v.k;
      const wy = (py - v.y) / v.k;
      return { x: px - wx * k, y: py - wy * k, k };
    });

  const fit = () => {
    const vis = nodes.filter(visibleNode).filter((n) => Number.isFinite(n.x));
    const r = svgRef.current?.getBoundingClientRect();
    if (!vis.length || !r?.width) return;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const n of vis) {
      x0 = Math.min(x0, n.x); y0 = Math.min(y0, n.y);
      x1 = Math.max(x1, n.x); y1 = Math.max(y1, n.y);
    }
    const pad = 90;
    const k = clampK(Math.min(r.width / (x1 - x0 + pad * 2), r.height / (y1 - y0 + pad * 2), 1.3));
    setView({ k, x: r.width / 2 - ((x0 + x1) / 2) * k, y: r.height / 2 - ((y0 + y1) / 2) * k });
  };

  // fitKey が変わったら、描画が終わったあとで全体表示にする
  useEffect(() => { if (fitKey) fit(); }, [fitKey]);
  // focus が変わったら、その点を画面の中央に寄せる
  useEffect(() => { if (focus) ref.current?.centerOn(focus.id); }, [focus]);

  useImperativeHandle(ref, () => ({
    fit,
    centerOn(id) {
      const n = byIdRef.current.get(id);
      const r = svgRef.current?.getBoundingClientRect();
      if (!n || !r) return;
      setView((v) => ({ ...v, x: r.width / 2 - n.x * v.k, y: r.height / 2 - n.y * v.k }));
    },
    // 画面中央のワールド座標（新しいメンバーを置く位置）
    center() {
      const r = svgRef.current.getBoundingClientRect();
      const v = viewRef.current;
      return { x: (r.width / 2 - v.x) / v.k, y: (r.height / 2 - v.y) / v.k };
    },
  }));

  useEffect(() => {
    const svg = svgRef.current;
    const onWheel = (e) => {
      e.preventDefault();
      const p = toLocal(e.clientX, e.clientY);
      zoomAt(p.x, p.y, Math.exp(-e.deltaY * 0.0015));
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, []);

  const onPointerDown = (e) => {
    svgRef.current.setPointerCapture(e.pointerId);
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (ptrs.current.size === 2) {
      const [p, q] = [...ptrs.current.values()];
      const mid = toLocal((p.x + q.x) / 2, (p.y + q.y) / 2);
      const v = viewRef.current;
      drag.current = { type: 'pinch', d0: Math.hypot(p.x - q.x, p.y - q.y), k0: v.k, w: { x: (mid.x - v.x) / v.k, y: (mid.y - v.y) / v.k } };
      return;
    }
    const g = e.target.closest('[data-id]');
    if (g) {
      const n = byIdRef.current.get(g.dataset.id);
      const w = toWorld(e.clientX, e.clientY);
      drag.current = { type: 'node', id: n.id, sx: e.clientX, sy: e.clientY, ox: w.x - n.x, oy: w.y - n.y, moved: false };
    } else {
      const v = viewRef.current;
      drag.current = { type: 'pan', sx: e.clientX, sy: e.clientY, vx: v.x, vy: v.y, moved: false };
      setPanning(true);
    }
  };

  const onPointerMove = (e) => {
    const d = drag.current;
    if (!ptrs.current.has(e.pointerId) || !d) return;
    ptrs.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (d.type === 'pinch') {
      if (ptrs.current.size !== 2) return;
      const [p, q] = [...ptrs.current.values()];
      const mid = toLocal((p.x + q.x) / 2, (p.y + q.y) / 2);
      const k = clampK((d.k0 * Math.hypot(p.x - q.x, p.y - q.y)) / d.d0);
      setView({ k, x: mid.x - d.w.x * k, y: mid.y - d.w.y * k });
      return;
    }
    if (d.type === 'idle') return;
    if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 5) d.moved = true;
    if (!d.moved) return;
    if (d.type === 'node') {
      const w = toWorld(e.clientX, e.clientY);
      onMoveNode(d.id, w.x - d.ox, w.y - d.oy);
    } else {
      setView((v) => ({ ...v, x: d.vx + e.clientX - d.sx, y: d.vy + e.clientY - d.sy }));
    }
  };

  const onPointerEnd = (e) => {
    if (!ptrs.current.has(e.pointerId)) return;
    ptrs.current.delete(e.pointerId);
    setPanning(false);
    const d = drag.current;
    if (!d) return;
    if (d.type === 'pinch' || d.type === 'idle') {
      drag.current = ptrs.current.size === 0 ? null : { type: 'idle' };
      return;
    }
    drag.current = null;
    if (e.type === 'pointercancel') return;
    if (d.type === 'node') d.moved ? onMoveEnd(d.id) : onTapNode(d.id);
    else if (!d.moved) onTapBackground();
  };

  // カーソルを乗せた顔をいちばん手前に描く（拡大しても隠れないように）
  const ordered = useMemo(() => {
    if (!hoverId) return nodes;
    const h = nodes.find((n) => n.id === hoverId);
    return h ? [...nodes.filter((n) => n.id !== hoverId), h] : nodes;
  }, [nodes, hoverId]);

  const visEdges = edges.filter(visibleEdge);
  const grid = 48 * view.k;

  return (
    <div
      className="stage"
      style={{ backgroundSize: `${grid}px ${grid}px`, backgroundPosition: `${view.x}px ${view.y}px` }}
    >
      <svg
        ref={svgRef}
        className={'map' + (panning ? ' panning' : '')}
        aria-label="メンバーのつながりマップ"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        onPointerOver={(e) => {
          const g = e.target.closest('.node.member');
          if (g && !drag.current && g.dataset.id !== hoverId) setHoverId(g.dataset.id);
        }}
      >
        <defs>
          <clipPath id="clip-c" clipPathUnits="objectBoundingBox">
            <circle cx=".5" cy=".5" r=".5" />
          </clipPath>
        </defs>
        <g transform={`translate(${view.x},${view.y}) scale(${view.k})`}>
          <g>
            {visEdges.map((e) => {
              const a = byId.get(e.from);
              const b = byId.get(e.to);
              const touch = sel && (e.from === sel || e.to === sel);
              const col = `var(${TYPES[e.type].c})`;
              const dim = sel && !touch ? 'dim' : '';
              const ang = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
              return (
                <g key={e.id} className={dim}>
                  <line
                    className="edge"
                    x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                    style={{ stroke: col, strokeWidth: e.auto ? (touch ? 2.5 : 1.6) : touch ? 4 : 2.8, opacity: e.auto && !touch ? 0.6 : 1 }}
                  />
                  {TYPES[e.type].dir && (
                    <polygon
                      points="-6,-5 6,0 -6,5"
                      transform={`translate(${a.x + (b.x - a.x) * 0.32},${a.y + (b.y - a.y) * 0.32}) rotate(${ang})`}
                      style={{ fill: col }}
                    />
                  )}
                </g>
              );
            })}
          </g>
          <g>
            {ordered.map((n) => {
              if (!visibleNode(n) || !Number.isFinite(n.x)) return null;
              const cls = ['node', n.kind];
              if (n.id === sel) cls.push('sel');
              if (n.id === connectFrom) cls.push('from');
              if (neighbors && !neighbors.has(n.id)) cls.push('dim');
              if (matches.has(n.id)) cls.push('match');
              return (
                <g key={n.id} className={cls.join(' ')} data-id={n.id} transform={`translate(${n.x},${n.y})`}>
                  <NodeShape n={n} />
                </g>
              );
            })}
          </g>
          <g className="labels">
            {visEdges.map((e) => {
              const touch = sel && (e.from === sel || e.to === sel);
              if (!(touch || (!e.auto && view.k >= 0.65 && !sel))) return null;
              const a = byId.get(e.from);
              const b = byId.get(e.to);
              return (
                <text key={e.id} className="elabel" x={(a.x + b.x) / 2} y={(a.y + b.y) / 2} style={{ fill: `var(${TYPES[e.type].c})` }}>
                  {edgeText(e)}
                </text>
              );
            })}
          </g>
        </g>
      </svg>
      <div className="zoom">
        <button onClick={() => { const r = svgRef.current.getBoundingClientRect(); zoomAt(r.width / 2, r.height / 2, 1.25); }} aria-label="拡大">＋</button>
        <button onClick={() => { const r = svgRef.current.getBoundingClientRect(); zoomAt(r.width / 2, r.height / 2, 0.8); }} aria-label="縮小">－</button>
        <button className="fit" onClick={fit} aria-label="全体を表示">全体</button>
      </div>
    </div>
  );
});

export default MapView;
