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

// 毛並み：楕円のふちから外へ短い線を並べる（毎回同じ形になるよう乱数は使わない）
function tufts(cx, cy, rx, ry, from, to, n, len) {
  let d = '';
  for (let i = 0; i <= n; i++) {
    const a = ((from + ((to - from) * i) / n) * Math.PI) / 180;
    const wob = ((i * 37) % 7) / 7 - 0.5;
    const x = cx + rx * Math.cos(a);
    const y = cy + ry * Math.sin(a);
    const b = a + wob * 0.5;
    const l = len * (0.7 + (((i * 53) % 5) / 5) * 0.6);
    d += `M${x.toFixed(1)} ${y.toFixed(1)} l${(l * Math.cos(b)).toFixed(1)} ${(l * Math.sin(b)).toFixed(1)} `;
  }
  return d;
}

// 指：(x, y) から角度 deg へ長さ len の指を n 本、間隔 gap で並べる
function Fingers({ x, y, deg, len, n = 4, gap = 6.5, dx = 0, dy = 1 }) {
  const a = (deg * Math.PI) / 180;
  return (
    <g strokeLinecap="round">
      {Array.from({ length: n }, (_, i) => {
        const sx = x + dx * gap * i;
        const sy = y + dy * gap * i;
        const ex = sx + len * Math.cos(a);
        const ey = sy + len * Math.sin(a);
        return (
          <g key={i}>
            <line x1={sx} y1={sy} x2={ex} y2={ey} stroke="#121110" strokeWidth="7.5" />
            <line x1={sx} y1={sy} x2={ex} y2={ey} stroke="#2E2B29" strokeWidth="6" />
            <circle cx={ex} cy={ey} r="2.4" fill="#4C4642" />
          </g>
        );
      })}
    </g>
  );
}

// 黄色いサングラスのゴリラ（胸から上）。happy: ジョッキを持ってニヤリ / そうでなければ頭を抱えて「オーマイガー」
function Gorilla({ uid, happy, children }) {
  const g = (k) => `url(#${uid}${k})`;
  return (
    <g className={happy ? 'fm-gorilla happy' : 'fm-gorilla'}>
      <defs>
        <radialGradient id={`${uid}body`} cx=".5" cy=".3" r=".75">
          <stop offset="0" stopColor="#403E3C" /><stop offset=".6" stopColor="#242322" /><stop offset="1" stopColor="#121212" />
        </radialGradient>
        <radialGradient id={`${uid}head`} cx=".5" cy=".25" r=".8">
          <stop offset="0" stopColor="#4A433D" /><stop offset=".5" stopColor="#262422" /><stop offset="1" stopColor="#141313" />
        </radialGradient>
        <radialGradient id={`${uid}skin`} cx=".5" cy=".55" r=".65">
          <stop offset="0" stopColor="#5C5650" /><stop offset=".7" stopColor="#3B3734" /><stop offset="1" stopColor="#272422" />
        </radialGradient>
        <radialGradient id={`${uid}muzzle`} cx=".5" cy=".35" r=".7">
          <stop offset="0" stopColor="#6A635C" /><stop offset="1" stopColor="#3A3532" />
        </radialGradient>
        <linearGradient id={`${uid}arm`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#1A1918" /><stop offset=".5" stopColor="#363432" /><stop offset="1" stopColor="#1A1918" />
        </linearGradient>
        <linearGradient id={`${uid}lens`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFE58A" /><stop offset=".55" stopColor="#F7B232" /><stop offset="1" stopColor="#E0761A" />
        </linearGradient>
        <radialGradient id={`${uid}mouth`} cx=".5" cy=".6" r=".6">
          <stop offset="0" stopColor="#5A1414" /><stop offset="1" stopColor="#1E0606" />
        </radialGradient>
      </defs>

      {/* 胴体と胸 */}
      <path d="M244 222 C246 172 266 146 296 138 C310 134 326 134 340 138 C370 146 390 172 392 222 Z" fill={g('body')} />
      <path d="M252 190 C262 158 284 144 304 140 M384 190 C374 158 352 144 332 140" stroke="#5A5652" strokeWidth="1.6" fill="none" opacity=".45" />
      <ellipse cx="300" cy="176" rx="17" ry="12" fill="#343230" opacity=".7" />
      <ellipse cx="336" cy="176" rx="17" ry="12" fill="#343230" opacity=".7" />

      {/* 頭（高い頭頂） */}
      <path d="M284 120 C278 96 282 72 296 58 C307 46 329 46 340 58 C354 72 358 96 352 120 C342 138 294 138 284 120 Z" fill={g('head')} />
      <path d={tufts(318, 92, 34, 44, 205, 335, 44, 2.6)} stroke="#4E4740" strokeWidth="1.1" opacity=".6" />
      <path d="M300 58 C310 50 326 50 336 58" stroke="#7A6250" strokeWidth="2" fill="none" opacity=".55" />
      {/* 耳 */}
      <ellipse cx="285" cy="100" rx="5" ry="8" fill="#3A3633" stroke="#1A1918" strokeWidth="1" />
      <ellipse cx="351" cy="100" rx="5" ry="8" fill="#3A3633" stroke="#1A1918" strokeWidth="1" />

      {/* 顔 */}
      <path d="M293 84 C304 77 332 77 343 84 C351 100 349 116 341 128 C331 140 305 140 295 128 C287 116 285 100 293 84 Z" fill={g('skin')} />
      {!happy && <ellipse cx="318" cy="139" rx="17" ry="7" fill="#3A3532" />}
      <path d="M300 106 C306 99 330 99 336 106 C343 116 339 130 318 134 C297 130 293 116 300 106 Z" fill={g('muzzle')} />
      {/* 眉の張り出し */}
      <path d="M289 87 C300 75 336 75 347 87 C341 92 295 92 289 87 Z" fill="#191716" />
      <path d="M295 81 C307 75 329 75 341 81" stroke="#6F6862" strokeWidth="1.4" fill="none" opacity=".6" />
      {/* 鼻すじと頬のしわ */}
      <path d="M314 98 Q318 96 322 98 M313 101 Q318 99 323 101" stroke="#24211F" strokeWidth="1.1" fill="none" />
      <path d="M299 109 Q302 117 300 125 M337 109 Q334 117 336 125" stroke="#2A2725" strokeWidth="1.3" fill="none" opacity=".8" />

      {/* サングラス */}
      <g strokeLinejoin="round">
        <path d="M295 88 L286 91 M341 88 L350 91" stroke="#B88A1A" strokeWidth="2" />
        <path d="M295 88 C300 86 311 86 316 88 C317 99 312 105 305 105 C298 105 293 98 295 88 Z" fill={g('lens')} stroke="#C2931C" strokeWidth="1.8" />
        <path d="M341 88 C336 86 325 86 320 88 C319 99 324 105 331 105 C338 105 343 98 341 88 Z" fill={g('lens')} stroke="#C2931C" strokeWidth="1.8" />
        <path d="M296 87 C306 84.5 330 84.5 340 87 M316 91 Q318 89 320 91" stroke="#C2931C" strokeWidth="1.8" fill="none" />
        <path d="M299 90 L306 90 L300 99 Z M324 90 L331 90 L325 99 Z" fill="#FFFBEA" opacity=".55" />
      </g>

      {/* 鼻 */}
      <path d="M307 106 C310 101 326 101 329 106 C332 112 326 116 318 116 C310 116 304 112 307 106 Z" fill="#2A2624" />
      <path d="M310 111 C311 107 316 108 316 111 C315 113 311 113 310 111 Z M326 111 C325 107 320 108 320 111 C321 113 325 113 326 111 Z" fill="#0D0C0B" />
      <path d="M310 104 Q318 101 326 104" stroke="#5F5852" strokeWidth="1" fill="none" opacity=".7" />

      {happy ? (
        <>
          {/* ニヤリ */}
          <path d="M305 122 Q316 127 331 119" stroke="#121110" strokeWidth="2.6" fill="none" strokeLinecap="round" />
          <path d="M331 119 q3 -1 4 -4" stroke="#121110" strokeWidth="1.8" fill="none" strokeLinecap="round" />
          <path d="M310 128 Q318 130 326 127" stroke="#6A635C" strokeWidth="1.2" fill="none" opacity=".7" />
        </>
      ) : (
        <>
          {/* 大口を開けて叫ぶ */}
          <path d="M301 117 C309 112 327 112 335 117 C338 130 331 143 318 144 C305 143 298 130 301 117 Z" fill={g('mouth')} stroke="#121110" strokeWidth="1.6" />
          <path d="M303 118 C311 115 325 115 333 118 L332 122 C325 120 311 120 304 122 Z" fill="#EFE8DA" />
          <path d="M305 120 L308.5 128 L311 120 Z M325 120 L327.5 128 L331 120 Z" fill="#F6F1E6" stroke="#B9B2A5" strokeWidth=".6" />
          <path d="M308 140 C314 142 322 142 328 140 L326 137 H310 Z" fill="#EFE8DA" />
          <ellipse cx="318" cy="136" rx="8" ry="3.5" fill="#C9504F" />
        </>
      )}

      {happy ? (
        <>
          {/* ジョッキを持つ右腕と手 */}
          <path d="M366 222 C392 196 390 160 376 142 L360 148 C370 166 368 194 344 222 Z" fill={g('arm')} />
          <path d="M386 196 C390 174 386 156 378 146" stroke="#5A5652" strokeWidth="1.4" fill="none" opacity=".5" />
          {children}
          <ellipse cx="380" cy="134" rx="9" ry="13" fill="#262422" />
          <Fingers x={382} y={123} deg={172} len={15} n={4} gap={6.8} />
        </>
      ) : (
        <>
          {/* 両手で頭を抱える */}
          <path d="M248 222 C242 178 254 128 278 86 L296 94 C280 132 274 178 278 222 Z" fill={g('arm')} />
          <path d="M388 222 C394 178 382 128 358 86 L340 94 C356 132 362 178 358 222 Z" fill={g('arm')} />
          <path d="M250 200 C248 166 258 126 278 90 M386 200 C388 166 378 126 358 90" stroke="#5A5652" strokeWidth="1.4" fill="none" opacity=".5" />
          <ellipse cx="290" cy="80" rx="12" ry="14" fill="#262422" transform="rotate(-25 290 80)" />
          <ellipse cx="346" cy="80" rx="12" ry="14" fill="#262422" transform="rotate(25 346 80)" />
          <Fingers x={284} y={78} deg={-72} len={13} n={4} gap={5.6} dx={1} dy={-0.55} />
          <Fingers x={352} y={78} deg={-108} len={13} n={4} gap={5.6} dx={-1} dy={-0.55} />
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
