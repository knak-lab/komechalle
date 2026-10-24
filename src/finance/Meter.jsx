import { useId } from 'react';
import { pct, yen } from './calc';

export const JOCKEY_YEN = 650; // ビール1杯

// ジョッキ。level 0〜1、handle: 取っ手の向き
function Jug({ x, y, w, h, level = 1, handle = 'left', id }) {
  const top = y + h - (h - 4) * level;
  const hx = handle === 'left' ? x : x + w;
  const d = handle === 'left' ? -1 : 1;
  return (
    <g>
      <clipPath id={id}><rect x={x + 2} y={y + 2} width={w - 4} height={h - 4} rx={3} /></clipPath>
      <path d={`M${hx} ${y + h * 0.22} h${d * 6} q${d * 4} 0 ${d * 4} 4 v${h * 0.36} q0 4 ${d * -4} 4 h${d * -6}`}
        fill="none" stroke="#7B8A96" strokeWidth={Math.max(2.5, w / 9)} />
      <rect x={x} y={y} width={w} height={h} rx={4} fill="rgba(255,255,255,.7)" />
      {level > 0 && (
        <g clipPath={`url(#${id})`}>
          <rect x={x} y={top} width={w} height={y + h - top} fill="#F2B632" />
          <rect x={x} y={top - 3} width={w} height={6} fill="#FFFDF4" />
        </g>
      )}
      <rect x={x} y={y} width={w} height={h} rx={4} fill="none" stroke="#7B8A96" strokeWidth={2.5} />
    </g>
  );
}

// まとめの上の絵：燃料タンク＝原価の回収、ゴリラのジョッキ＝利益（1杯650円）
export default function Meter({ totalCost, keep }) {
  const uid = useId().replace(/:/g, '');
  const ready = totalCost > 0;
  const tank = ready ? Math.min(1, Math.max(0, keep / totalCost)) : 0;
  const happy = ready && keep >= totalCost;
  const profit = happy ? keep - totalCost : 0;
  const full = Math.floor(profit / JOCKEY_YEN);
  const level = happy ? (profit % JOCKEY_YEN) / JOCKEY_YEN : 0;

  // ゴリラの右手：笑顔ならジョッキを掲げる、しょんぼりなら下げる
  const jug = happy ? { x: 366, y: 58, w: 30, h: 40 } : { x: 362, y: 150, w: 30, h: 40 };
  const label = !ready ? '原価がまだ入っていません'
    : happy ? `原価回収済み。利益 ${yen(profit)}、ビール ${full}杯と${pct(level)}`
      : `原価回収 ${pct(tank)}`;

  return (
    <figure className="fin-meter">
      <svg viewBox="0 0 440 220" role="img" aria-label={label}>
        <defs>
          <linearGradient id={`${uid}sky`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={happy ? '#9FD4F2' : '#C3CCD4'} />
            <stop offset="1" stopColor={happy ? '#EEF8FC' : '#E8ECEF'} />
          </linearGradient>
          <clipPath id={`${uid}tank`}><rect x={194} y={76} width={38} height={104} rx={7} /></clipPath>
        </defs>
        <rect width="440" height="220" rx="14" fill={`url(#${uid}sky)`} />
        {happy
          ? <circle cx="40" cy="36" r="15" fill="#FFD45A" />
          : <path d="M22 44 a10 10 0 0 1 14-12 a13 13 0 0 1 24 2 a9 9 0 0 1 2 18 h-36 a8 8 0 0 1-4-8z" fill="#fff" opacity=".85" />}
        <rect y="188" width="440" height="32" fill="#8DBF6A" />
        <rect y="188" width="440" height="4" fill="#79AA57" />

        {/* トラクター */}
        <g>
          {happy && (
            <g className="fm-smoke" fill="#E4E7EA">
              <circle cx="146" cy="82" r="5" />
              <circle cx="153" cy="70" r="7" />
              <circle cx="162" cy="56" r="9" />
            </g>
          )}
          <rect x="140" y="90" width="7" height="30" rx="2" fill="#555" />
          <rect x="44" y="72" width="52" height="62" rx="4" fill="rgba(255,255,255,.35)" stroke="#2E7A3C" strokeWidth="5" />
          <rect x="38" y="63" width="64" height="11" rx="3" fill="#C8641E" />
          <rect x="60" y="118" width="110" height="38" rx="9" fill="#2E7A3C" />
          <path d="M160 126 v22 M165 126 v22" stroke="#1F5A2A" strokeWidth="2" />
          <circle cx="62" cy="158" r="34" fill="#2B2B2B" />
          <circle cx="62" cy="158" r="28" fill="none" stroke="#444" strokeWidth="5" strokeDasharray="6 5" />
          <circle cx="62" cy="158" r="13" fill="#E0B451" />
          <circle cx="152" cy="172" r="18" fill="#2B2B2B" />
          <circle cx="152" cy="172" r="7" fill="#E0B451" />
        </g>

        {/* 燃料タンク＝原価回収メーター */}
        <path d="M190 150 C181 150 179 140 170 140" fill="none" stroke="#555" strokeWidth="4" />
        <rect x="204" y="62" width="18" height="12" rx="2" fill="#555" />
        <rect x="190" y="72" width="46" height="112" rx="10" fill="#fff" stroke="#555" strokeWidth="3" />
        <g clipPath={`url(#${uid}tank)`}>
          <rect x="194" y="76" width="38" height="104" fill={happy ? '#2E7A3C' : '#E08A2B'}
            className="fm-fill" style={{ transform: `scaleY(${tank})` }} />
        </g>
        <path d="M194 102 h8 M194 128 h8 M194 154 h8" stroke="#555" strokeWidth="2" />
        <text x="213" y="54" textAnchor="middle" className="fm-pct">{ready ? pct(tank) : '–'}</text>
        <text x="213" y="207" textAnchor="middle" className="fm-cap">原価回収</text>

        {/* ゴリラ */}
        <g className={happy ? 'fm-gorilla happy' : 'fm-gorilla'}>
          <ellipse cx="302" cy="184" rx="15" ry="8" fill="#2F2F2F" />
          <ellipse cx="338" cy="184" rx="15" ry="8" fill="#2F2F2F" />
          <ellipse cx="320" cy="150" rx="40" ry="38" fill="#3A3A3A" />
          <ellipse cx="320" cy="158" rx="24" ry="24" fill="#6E6259" />
          <ellipse cx="284" cy="160" rx="10" ry="24" fill="#333" transform="rotate(14 284 160)" />
          {happy
            ? <ellipse cx="360" cy="114" rx="10" ry="24" fill="#333" transform="rotate(32 360 114)" />
            : <ellipse cx="354" cy="160" rx="10" ry="24" fill="#333" transform="rotate(-16 354 160)" />}
          <g transform={happy ? undefined : 'translate(0 6) rotate(-6 320 96)'}>
            <circle cx="293" cy="96" r="7" fill="#3A3A3A" />
            <circle cx="347" cy="96" r="7" fill="#3A3A3A" />
            <circle cx="320" cy="96" r="28" fill="#3A3A3A" />
            <ellipse cx="320" cy="104" rx="20" ry="17" fill="#9C8A78" />
            {happy ? (
              <>
                <path d="M305 86 Q311 82 317 86 M323 86 Q329 82 335 86" stroke="#2B2B2B" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                <path d="M307 94 Q311 89 315 94 M325 94 Q329 89 333 94" stroke="#1E1E1E" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                <path d="M306 107 Q320 125 334 107 Z" fill="#fff" stroke="#2B2B2B" strokeWidth="2" strokeLinejoin="round" />
                <path d="M313 114 Q320 120 327 114" fill="#E77" />
                <circle cx="303" cy="104" r="3.5" fill="#E9967A" opacity=".7" />
                <circle cx="337" cy="104" r="3.5" fill="#E9967A" opacity=".7" />
              </>
            ) : (
              <>
                <path d="M305 89 L316 84 M324 84 L335 89" stroke="#2B2B2B" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                <circle cx="311" cy="94" r="2.5" fill="#1E1E1E" />
                <circle cx="329" cy="94" r="2.5" fill="#1E1E1E" />
                <path d="M310 115 Q320 108 330 115" stroke="#2B2B2B" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                <path d="M334 98 q3 5 0 8 q-3 -3 0 -8z" fill="#7CC4F0" />
              </>
            )}
            <ellipse cx="316" cy="102" rx="1.6" ry="1.2" fill="#3A2E25" />
            <ellipse cx="324" cy="102" rx="1.6" ry="1.2" fill="#3A2E25" />
          </g>
          <Jug id={`${uid}jug`} {...jug} level={level} handle="left" />
        </g>

        {/* たまったジョッキ */}
        {full > 0 && full <= 6 && Array.from({ length: full }, (_, i) => (
          <Jug key={i} id={`${uid}j${i}`} x={398 + (i % 2) * 17} y={166 - Math.floor(i / 2) * 22} w={14} h={19} handle="right" />
        ))}
        {full > 6 && (
          <>
            <Jug id={`${uid}jn`} x={404} y={140} w={20} h={27} handle="right" />
            <text x="416" y="186" textAnchor="middle" className="fm-count">×{full}</text>
          </>
        )}
      </svg>
      <figcaption>
        {!ready ? '「原価」を入れると、燃料タンクがたまっていきます'
          : happy ? <>原価回収！ 利益 <b>{yen(profit)}</b>　🍺 {full}杯 ＋ {pct(level)}（1杯{JOCKEY_YEN}円）</>
            : <>満タン（原価回収）まで あと <b>{yen(totalCost - keep)}</b></>}
      </figcaption>
    </figure>
  );
}
