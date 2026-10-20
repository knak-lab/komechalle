// 収支の計算（純関数だけ）。内部は小数のまま持ち、表示のときに丸める
// 年度 = 収穫年（2026年度 = 2026年に作付け・収穫したお米）

export const DEFAULT_COOK_RATIO = 2.2;

// シートの値は文字列で来るので、空欄は null にそろえる
export const num = (v) => (v === '' || v == null || !Number.isFinite(Number(v)) ? null : Number(v));
export const bool = (v) => v === true || String(v).toUpperCase() === 'TRUE';
const sum = (xs) => xs.reduce((a, b) => a + b, 0);

export function parseMaterials(m) {
  if (Array.isArray(m)) return m;
  try {
    const a = JSON.parse(m || '[]');
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  }
}

/* ---------- 収穫 ---------- */

// 実測があれば実測、なければ計算。source は「実測」か「計算」（どちらも無ければ null）
export function harvestKg(h) {
  if (!h) return { momiKg: null, genmaiKg: null, hakumaiKg: null, genmaiSource: null, hakumaiSource: null, momiToGenmai: null };
  const momiKg = num(h.momiKg);
  const bags = num(h.genmaiBags);
  const bagKg = num(h.bagKg);
  let genmaiKg = num(h.genmaiKg);
  let genmaiSource = genmaiKg != null ? '実測' : null;
  if (genmaiKg == null && bags != null && bagKg != null) { genmaiKg = bags * bagKg; genmaiSource = '計算'; }
  let hakumaiKg = num(h.hakumaiKg);
  let hakumaiSource = hakumaiKg != null ? '実測' : null;
  const rate = num(h.seimaiRate);
  if (hakumaiKg == null && genmaiKg != null && rate != null) { hakumaiKg = genmaiKg * rate; hakumaiSource = '計算'; }
  return {
    momiKg, genmaiKg, hakumaiKg, genmaiSource, hakumaiSource,
    momiToGenmai: momiKg && genmaiKg != null ? genmaiKg / momiKg : null,
  };
}

/* ---------- 原価 ---------- */

export const costAmount = (c) => {
  const a = num(c.amount);
  if (a != null) return a;
  const u = num(c.unitPrice);
  const q = num(c.qty);
  return u != null && q != null ? u * q : 0;
};

// 設備の償却：price ÷ years を startYear から years 年分
export function depreciation(asset, year) {
  const price = num(asset.price) || 0;
  const years = num(asset.years) || 0;
  const start = num(asset.startYear);
  if (!years || start == null) return { amount: 0, nth: null, remaining: null };
  const nth = year - start + 1;
  if (nth < 1 || nth > years) return { amount: 0, nth: null, remaining: null };
  return { amount: price / years, nth, remaining: years - nth };
}

export function yearCost({ costs = [], assets = [], year }) {
  const direct = sum(costs.filter((c) => num(c.year) === year).map(costAmount));
  const dep = sum(assets.map((a) => depreciation(a, year).amount));
  return { direct, dep, total: direct + dep };
}

/* ---------- 商品1単位 ---------- */

export function riceG(p, cookRatio = DEFAULT_COOK_RATIO) {
  const raw = num(p.riceRawG);
  if (raw != null) return raw;
  const cooked = num(p.cookedG);
  return cooked != null ? cooked / (cookRatio || DEFAULT_COOK_RATIO) : 0;
}

// お米の原価は年度原価で回収する扱いなので、変動費には入れない
export function unitEconomics(p, { costPerKg = 0, totalCost = 0, cookRatio = DEFAULT_COOK_RATIO } = {}) {
  const price = num(p.price) || 0;
  const shipping = num(p.shipping) || 0;
  const pays = price + (bool(p.customerPaysShipping) ? shipping : 0);
  const feeRate = num(p.feeRate) || 0;
  const feeFixed = num(p.feeFixed) || 0;
  const fee = feeRate || feeFixed ? pays * feeRate + feeFixed : 0;
  const materials = sum(parseMaterials(p.materials).map((m) => num(m.amount) || 0));
  const variable = materials + shipping + fee;
  const keep = pays - variable;
  const g = riceG(p, cookRatio);
  const riceCost = (g / 1000) * costPerKg;
  return {
    pays, fee, materials, variable, keep, riceG: g, riceCost,
    gross: keep - riceCost,
    unitCost: riceCost + materials,
    costRate: price ? (riceCost + materials) / price : null,
    breakEven: breakEvenQty(totalCost, keep),
  };
}

export const breakEvenQty = (totalCost, keep) => (keep > 0 ? Math.ceil(totalCost / keep - 1e-9) : null);

// 「keepA で qtyA 個」と同じ手残りにするのに、keepB では何個いるか
export const sameKeepQty = (keepA, qtyA, keepB) => (keepB > 0 ? Math.ceil((keepA * qtyA) / keepB - 1e-9) : null);

/* ---------- 年度と売上 ---------- */

// その年度の収穫日以降、翌年度の収穫日より前 = その年度。収穫日より前なら前の年度、記録が無ければ暦年
export function yearOfDate(date, harvests = []) {
  const hs = harvests
    .filter((h) => num(h.year) != null && /^\d{4}-\d{2}-\d{2}$/.test(h.harvestDate || ''))
    .sort((a, b) => a.harvestDate.localeCompare(b.harvestDate));
  let y = null;
  for (const h of hs) if (date >= h.harvestDate) y = num(h.year);
  if (y != null) return y;
  const cal = Number(String(date).slice(0, 4));
  if (!hs.length) return cal;
  // 最初の収穫より前：その年の収穫日（月日）より前なら前の年度
  return String(date).slice(5) < hs[0].harvestDate.slice(5) ? cal - 1 : cal;
}

export function salesSummary(sales, { totalCost = 0, hakumaiKg = null } = {}) {
  const keep = sum(sales.map((s) => (num(s.amount) || 0) - (num(s.variableCostAtSale) || 0) * (num(s.qty) || 0)));
  const amount = sum(sales.map((s) => num(s.amount) || 0));
  const riceUsedKg = sum(sales.map((s) => (num(s.qty) || 0) * (num(s.riceGAtSale) || 0))) / 1000;
  return {
    amount, keep, riceUsedKg,
    recovery: totalCost > 0 ? keep / totalCost : null,
    profit: keep - totalCost,
    riceLeftKg: hakumaiKg != null ? hakumaiKg - riceUsedKg : null,
  };
}

// 年度全体のまとめ（まとめタブ・価格試算で使う）
export function yearContext(fin, year) {
  const cookRatio = num(fin.settings?.cookRatio) || DEFAULT_COOK_RATIO;
  const harvest = (fin.harvest || []).find((h) => num(h.year) === year) || null;
  const kg = harvestKg(harvest);
  const cost = yearCost({ costs: fin.costs, assets: fin.assets, year });
  const costPerKg = kg.hakumaiKg ? cost.total / kg.hakumaiKg : 0;
  return { year, cookRatio, harvest, kg, cost, costPerKg, totalCost: cost.total };
}

/* ---------- 表示 ---------- */

export const yen = (v) => (v == null || !Number.isFinite(v) ? '–' : `${Math.round(v).toLocaleString('ja-JP')}円`);
export const yen1 = (v) => (v == null || !Number.isFinite(v) ? '–' : `${(Math.round(v * 10) / 10).toLocaleString('ja-JP', { minimumFractionDigits: 0, maximumFractionDigits: 1 })}円`);
export const kgf = (v) => (v == null || !Number.isFinite(v) ? '–' : `${(Math.round(v * 10) / 10).toLocaleString('ja-JP')}kg`);
export const pct = (v) => (v == null || !Number.isFinite(v) ? '–' : `${Math.round(v * 100)}%`);
