import { useId } from 'react';
import { pct, yen } from './calc';
import tractorImg from './img/tractor.webp';
import happyImg from './img/gorilla_happy.webp';
import sadImg from './img/gorilla_sad.webp';

export const JOCKEY_YEN = 650; // ビール1杯

// 画像の大きさと、透明にしてある中身（タンク・ジョッキ）の位置。座標は画像のピクセル
const TRACTOR = { src: tractorImg, w: 480, h: 488, tank: [364, 233, 468, 478] };
const GORILLA = {
  happy: { src: happyImg, w: 600, h: 453, jug: [50, 236, 215, 444] },
  sad: { src: sadImg, w: 600, h: 446, jug: [52, 229, 222, 437] },
};

// 小さいジョッキ（たまった分）。level 0〜1
function Jug({ x, y, w, h, level = 1, id }) {
  const top = y + h - (h - 4) * level;
  return (
    <g>
      <clipPath id={id}><rect x={x + 2} y={y + 2} width={w - 4} height={h - 4} rx={2} /></clipPath>
      <path d={`M${x + w} ${y + h * 0.24} h3 q3 0 3 3 v${h * 0.36} q0 3 -3 3 h-3`} fill="none" stroke="#2B2B2B" strokeWidth={2} />
      <rect x={x} y={y} width={w} height={h} rx={3} fill="#fff" />
      {level > 0 && (
        <g clipPath={`url(#${id})`}>
          <rect x={x} y={top} width={w} height={y + h - top} fill="#F2B632" />
          <rect x={x} y={top - 2} width={w} height={4} fill="#FFFDF4" />
        </g>
      )}
      <rect x={x} y={y} width={w} height={h} rx={3} fill="none" stroke="#2B2B2B" strokeWidth={1.6} />
    </g>
  );
}

// 画像の透明な穴の後ろに敷く中身。level 0〜1 で下からたまる
function Fill({ id, box: [x0, y0, x1, y1], rx, back, color, level, foam }) {
  const h = y1 - y0;
  return (
    <g>
      <clipPath id={id}><rect x={x0} y={y0} width={x1 - x0} height={h} rx={rx} /></clipPath>
      <g clipPath={`url(#${id})`}>
        <rect x={x0} y={y0} width={x1 - x0} height={h} fill={back} />
        <rect x={x0} y={y0} width={x1 - x0} height={h} fill={color} className="fm-fill" style={{ transform: `scaleY(${level})` }} />
        {foam && level > 0 && <rect x={x0} y={y1 - h * level - 8} width={x1 - x0} height={16} rx={8} fill="#FFFDF4" />}
      </g>
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

  const label = !ready ? '原価がまだ入っていません'
    : happy ? `原価回収済み。利益 ${yen(profit)}、ビール ${full}杯と${pct(level)}`
      : `原価回収 ${pct(tank)}`;
  const go = GORILLA[happy ? 'happy' : 'sad'];
  const ts = 0.39; // トラクターの縮尺
  const gs = 210 / go.h; // ゴリラは高さ210にそろえる
  const gx = 478 - go.w * gs; // 右下はたまったジョッキの場所

  return (
    <figure className="fin-meter">
      <svg viewBox="0 0 520 230" role="img" aria-label={label}>
        <defs>
          <linearGradient id={`${uid}sky`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={happy ? '#9FD4F2' : '#C3CCD4'} />
            <stop offset="1" stopColor={happy ? '#EEF8FC' : '#E8ECEF'} />
          </linearGradient>
          <clipPath id={`${uid}panel`}><rect width="520" height="230" rx="14" /></clipPath>
        </defs>
        <g clipPath={`url(#${uid}panel)`}>
          <rect width="520" height="230" fill={`url(#${uid}sky)`} />
          {happy
            ? <circle cx="24" cy="26" r="12" fill="#FFD45A" />
            : <path d="M10 34 a9 9 0 0 1 12-10 a11 11 0 0 1 20 2 a8 8 0 0 1 2 15 h-30 a7 7 0 0 1-4-7z" fill="#fff" opacity=".85" />}
          <rect y="136" width="520" height="94" fill="#8DBF6A" />
          <rect y="136" width="520" height="4" fill="#79AA57" />

          {/* トラクターと燃料タンク（タンクの中＝原価回収メーター） */}
          <g transform={`translate(6 16) scale(${ts})`}>
            {happy && (
              <g className="fm-smoke" fill="#E4E7EA">
                <circle cx="222" cy="-8" r="12" />
                <circle cx="244" cy="-26" r="17" />
                <circle cx="274" cy="-38" r="20" />
              </g>
            )}
            <Fill id={`${uid}tank`} box={TRACTOR.tank} rx={14} back="#fff" color={happy ? '#2E7A3C' : '#E08A2B'} level={tank} />
            <image href={TRACTOR.src} width={TRACTOR.w} height={TRACTOR.h} />
          </g>
          <rect x="155" y="88" width="42" height="18" rx="9" fill="#fff" opacity=".9" />
          <text x="176" y="101.5" textAnchor="middle" className="fm-pct">{ready ? pct(tank) : '–'}</text>
          <text x="168" y="219" textAnchor="middle" className="fm-cap">原価回収</text>

          {/* ゴリラ（手のジョッキ＝利益メーター） */}
          <g transform={`translate(${gx} ${230 - go.h * gs}) scale(${gs})`}>
            <g className={happy ? 'fm-gorilla happy' : 'fm-gorilla'}>
              <Fill id={`${uid}beer`} box={go.jug} back="rgba(255,255,255,.88)" color="#F2B632" level={level} foam rx={24} />
              <image href={go.src} width={go.w} height={go.h} />
            </g>
          </g>

          {/* たまったジョッキ */}
          {full > 0 && full <= 6 && Array.from({ length: full }, (_, i) => (
            <Jug key={i} id={`${uid}j${i}`} x={482 + (i % 2) * 18} y={204 - Math.floor(i / 2) * 23} w={13} h={19} />
          ))}
          {full > 6 && (
            <>
              <Jug id={`${uid}jn`} x={486} y={170} w={18} h={25} />
              <text x="497" y="214" textAnchor="middle" className="fm-count">×{full}</text>
            </>
          )}
        </g>
      </svg>
      <figcaption>
        {!ready ? '「原価」を入れると、燃料タンクがたまっていきます'
          : happy ? <>原価回収！ 利益 <b>{yen(profit)}</b>　🍺 {full}杯 ＋ {pct(level)}（1杯{JOCKEY_YEN}円）</>
            : <>満タン（原価回収）まで あと <b>{yen(totalCost - keep)}</b></>}
      </figcaption>
    </figure>
  );
}
