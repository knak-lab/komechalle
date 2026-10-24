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

const RED = '#D3302B';
const RED_D = '#A9221E';
const CREAM = '#F3EEDF';

// 赤いトラクター（屋根の骨組み・縦のマフラー・白いホイール）
function Tractor({ uid, smoke }) {
  return (
    <g>
      <defs>
        <linearGradient id={`${uid}steel`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#8E959B" />
          <stop offset=".45" stopColor="#F1F3F5" />
          <stop offset="1" stopColor="#9AA1A7" />
        </linearGradient>
      </defs>
      {smoke && (
        <g className="fm-smoke" fill="#E4E7EA">
          <circle cx="152" cy="24" r="5" />
          <circle cx="161" cy="14" r="7" />
          <circle cx="173" cy="6" r="8" />
        </g>
      )}
      {/* 屋根の骨組み */}
      <g stroke={RED} strokeWidth="4" strokeLinecap="round" fill="none">
        <path d="M62 132 V44 M120 112 V50" />
        <path d="M54 44 L126 50 L132 42 L62 36 Z" />
        <path d="M78 38 L74 46 M96 40 L92 48 M114 42 L110 50" strokeWidth="2.5" />
      </g>
      {/* 座席・ハンドル */}
      <rect x="64" y="92" width="7" height="18" rx="3" fill="#232323" />
      <rect x="66" y="106" width="30" height="8" rx="4" fill="#232323" />
      <path d="M112 120 L104 98" stroke="#555" strokeWidth="3" />
      <ellipse cx="103" cy="96" rx="11" ry="3.5" fill="none" stroke="#333" strokeWidth="3" />
      {/* 後輪 */}
      <circle cx="58" cy="150" r="38" fill="#262626" />
      <circle cx="58" cy="150" r="35" fill="none" stroke="#151515" strokeWidth="9" strokeDasharray="7 6" />
      <circle cx="58" cy="150" r="21" fill={CREAM} />
      <circle cx="58" cy="150" r="8" fill="#CFC8B3" />
      <g fill="#8C8673">
        <circle cx="58" cy="137" r="1.8" /><circle cx="70" cy="150" r="1.8" /><circle cx="58" cy="163" r="1.8" /><circle cx="46" cy="150" r="1.8" />
      </g>
      <path d="M16 146 A42 42 0 0 1 98 124" stroke={RED} strokeWidth="9" fill="none" strokeLinecap="round" />
      {/* エンジンとボンネット */}
      <rect x="104" y="140" width="58" height="22" rx="3" fill="#6D7773" />
      <path d="M110 146 h44 M110 153 h44" stroke="#59625E" strokeWidth="2" />
      <rect x="98" y="110" width="86" height="34" rx="6" fill={RED} />
      <rect x="101" y="113" width="72" height="9" rx="2" fill={CREAM} />
      <rect x="171" y="120" width="15" height="26" rx="2" fill={CREAM} />
      <path d="M173 125 h11 M173 130 h11 M173 135 h11 M173 140 h11" stroke="#9C9682" strokeWidth="1.6" />
      <circle cx="181" cy="116" r="4" fill="#FFF6C8" stroke="#A39D88" strokeWidth="1.5" />
      <rect x="158" y="144" width="28" height="10" rx="2" fill={RED_D} />
      <rect x="182" y="148" width="9" height="10" rx="1.5" fill="#7D8F88" />
      <ellipse cx="128" cy="109" rx="6" ry="5" fill={CREAM} />
      {/* 縦のマフラー */}
      <rect x="146" y="30" width="6" height="82" fill={`url(#${uid}steel)`} />
      <rect x="142.5" y="62" width="13" height="34" rx="6" fill={`url(#${uid}steel)`} stroke="#8E959B" strokeWidth="1" />
      {/* 前輪 */}
      <circle cx="162" cy="172" r="17" fill="#262626" />
      <circle cx="162" cy="172" r="10" fill={CREAM} />
      <circle cx="162" cy="172" r="3.5" fill="#CFC8B3" />
    </g>
  );
}

// 黄色いサングラスのゴリラ（胸から上）。happy: ジョッキを持ってニヤリ / そうでなければ頭を抱えて「オーマイガー」
function Gorilla({ uid, happy, children }) {
  const FUR = '#252525';
  const SKIN = '#3E3E3E';
  const ARM = '#323232';
  return (
    <g className={happy ? 'fm-gorilla happy' : 'fm-gorilla'}>
      <defs>
        <linearGradient id={`${uid}lens`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFE07A" />
          <stop offset="1" stopColor="#F08A1C" />
        </linearGradient>
      </defs>
      {/* 胴体 */}
      <path d="M248 222 Q250 158 284 142 Q318 130 352 142 Q386 158 388 222 Z" fill={FUR} />
      <ellipse cx="302" cy="170" rx="20" ry="15" fill="#333" />
      <ellipse cx="334" cy="170" rx="20" ry="15" fill="#333" />
      {/* 頭 */}
      <path d="M288 124 Q282 92 294 70 Q318 40 342 70 Q354 92 348 124 Q318 140 288 124 Z" fill={FUR} />
      <path d="M298 66 Q318 46 338 66 Q326 58 318 58 Q308 58 298 66 Z" fill="#5A4636" opacity=".8" />
      <path d="M296 88 Q318 80 340 88 Q348 108 338 124 Q318 134 298 124 Q288 108 296 88 Z" fill={SKIN} />
      <path d="M294 88 Q318 78 342 88" stroke="#161616" strokeWidth="5" fill="none" strokeLinecap="round" />
      {/* サングラス */}
      <g stroke="#B88A1A" strokeWidth="1.6" strokeLinejoin="round">
        <path d="M294 89 L288 87 M342 89 L348 87" fill="none" />
        <path d="M294 88 H315 Q316 99 305 102 Q294 101 294 88 Z" fill={`url(#${uid}lens)`} />
        <path d="M321 88 H342 Q342 101 331 102 Q320 99 321 88 Z" fill={`url(#${uid}lens)`} />
        <path d="M315 90 Q318 87 321 90" fill="none" />
      </g>
      <path d="M298 91 l5 0 M324 91 l5 0" stroke="#FFF7D6" strokeWidth="1.6" strokeLinecap="round" opacity=".9" />
      {/* 鼻 */}
      <path d="M309 108 Q318 101 327 108 Q326 114 318 114 Q310 114 309 108 Z" fill="#2B2B2B" />
      <ellipse cx="314" cy="110" rx="2.4" ry="1.6" fill="#0E0E0E" />
      <ellipse cx="322" cy="110" rx="2.4" ry="1.6" fill="#0E0E0E" />
      {happy ? (
        <path d="M306 120 Q318 125 332 117" stroke="#121212" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      ) : (
        <>
          <path d="M305 117 Q318 113 331 117 Q334 132 318 136 Q302 132 305 117 Z" fill="#5E1919" stroke="#121212" strokeWidth="1.5" />
          <path d="M307 118 H329 L327 121 H309 Z" fill="#F6F1E6" />
          <path d="M309 133 Q318 135 327 133 L325 130 H311 Z" fill="#F6F1E6" />
          <ellipse cx="318" cy="129" rx="7" ry="3" fill="#C9504F" />
        </>
      )}
      {happy ? (
        <>
          {/* ジョッキを持つ右腕 */}
          <path d="M380 222 Q388 172 360 150" stroke={ARM} strokeWidth="24" fill="none" strokeLinecap="round" />
          {children}
          <ellipse cx="347" cy="142" rx="9" ry="12" fill="#2C2C2C" />
          <path d="M345 133 h10 M345 140 h11 M345 147 h10" stroke="#1A1A1A" strokeWidth="1.5" strokeLinecap="round" />
        </>
      ) : (
        <>
          {/* 両手で頭を抱える */}
          <path d="M262 214 Q256 150 286 86" stroke={ARM} strokeWidth="22" fill="none" strokeLinecap="round" />
          <path d="M374 214 Q380 150 350 86" stroke={ARM} strokeWidth="22" fill="none" strokeLinecap="round" />
          <ellipse cx="293" cy="74" rx="13" ry="11" fill="#2C2C2C" transform="rotate(-30 293 74)" />
          <ellipse cx="343" cy="74" rx="13" ry="11" fill="#2C2C2C" transform="rotate(30 343 74)" />
          <path d="M290 66 l6 8 M296 63 l5 8 M346 66 l-6 8 M340 63 l-5 8" stroke="#1A1A1A" strokeWidth="1.5" strokeLinecap="round" />
          {children}
        </>
      )}
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

  // 笑顔ならジョッキを手に持つ、オーマイガーなら空のジョッキを足もとに置く
  const jug = happy ? { x: 346, y: 112, w: 30, h: 40, handle: 'right' } : { x: 386, y: 160, w: 24, h: 30, handle: 'right' };
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
          <clipPath id={`${uid}panel`}><rect width="440" height="220" rx="14" /></clipPath>
        </defs>
        <g clipPath={`url(#${uid}panel)`}>
          <rect width="440" height="220" fill={`url(#${uid}sky)`} />
          {happy
            ? <circle cx="24" cy="26" r="12" fill="#FFD45A" />
            : <path d="M10 34 a9 9 0 0 1 12-10 a11 11 0 0 1 20 2 a8 8 0 0 1 2 15 h-30 a7 7 0 0 1-4-7z" fill="#fff" opacity=".85" />}
          <rect y="188" width="440" height="32" fill="#8DBF6A" />
          <rect y="188" width="440" height="4" fill="#79AA57" />

          <Tractor uid={uid} smoke={happy} />

          {/* 燃料タンク＝原価回収メーター */}
          <path d="M190 150 C186 150 186 146 184 146" fill="none" stroke="#555" strokeWidth="4" />
          <rect x="204" y="62" width="18" height="12" rx="2" fill="#555" />
          <rect x="190" y="72" width="46" height="112" rx="10" fill="#fff" stroke="#555" strokeWidth="3" />
          <g clipPath={`url(#${uid}tank)`}>
            <rect x="194" y="76" width="38" height="104" fill={happy ? '#2E7A3C' : '#E08A2B'}
              className="fm-fill" style={{ transform: `scaleY(${tank})` }} />
          </g>
          <path d="M194 102 h8 M194 128 h8 M194 154 h8" stroke="#555" strokeWidth="2" />
          <text x="213" y="54" textAnchor="middle" className="fm-pct">{ready ? pct(tank) : '–'}</text>
          <text x="213" y="207" textAnchor="middle" className="fm-cap">原価回収</text>

          <Gorilla uid={uid} happy={happy}>
            <Jug id={`${uid}jug`} {...jug} level={level} />
          </Gorilla>
          {!happy && ready && <text x="318" y="30" textAnchor="middle" className="fm-omg">オーマイガー</text>}

          {/* たまったジョッキ */}
          {full > 0 && full <= 6 && Array.from({ length: full }, (_, i) => (
            <Jug key={i} id={`${uid}j${i}`} x={396 + (i % 2) * 18} y={166 - Math.floor(i / 2) * 22} w={14} h={19} handle="right" />
          ))}
          {full > 6 && (
            <>
              <Jug id={`${uid}jn`} x={402} y={140} w={20} h={27} handle="right" />
              <text x="414" y="186" textAnchor="middle" className="fm-count">×{full}</text>
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
