// 収支データの書きかえ（画面をすぐ変えるときと、デモモードの保存の両方で使う）
import { hasRice, num, unitEconomics } from './calc';

export const CHANNELS = { event: 'イベント', store: '店頭', online: 'ネット' };

export const FIN_KEYS = { harvest: 'year', costs: 'id', assets: 'id', products: 'id', sales: 'id' };

export const emptyFin = () => ({ harvest: [], costs: [], assets: [], products: [], sales: [], settings: {}, kamoProducts: [], priceHistory: [] });

export function applySave(fin, table, row) {
  if (table === 'settings') return { ...fin, settings: { ...fin.settings, [row.key]: row.value } };
  const k = FIN_KEYS[table];
  const list = fin[table] || [];
  const i = list.findIndex((r) => String(r[k]) === String(row[k]));
  let next = { ...fin, [table]: i < 0 ? [...list, row] : list.map((r, j) => (j === i ? { ...r, ...row } : r)) };
  if (table === 'products' && i >= 0 && 'price' in row) next = priceChange(next, list[i].id, list[i].price, row.price);
  return table === 'products' ? fillKamoSales(next) : next;
}

export function applyDelete(fin, table, id) {
  const k = FIN_KEYS[table];
  return { ...fin, [table]: (fin[table] || []).filter((r) => String(r[k]) !== String(id) || r.source === 'kamo') };
}

// カモの小屋の商品を米チャレの商品に紐づけ、未紐づけの取り込み売上も紐づける（GAS の finLinkKamo と同じ）
export function applyLink(fin, kamoProductId, productId) {
  if (!fin.products.some((x) => x.id === productId)) return fin;
  return fillKamoSales({
    ...fin,
    products: fin.products.map((x) =>
      x.id === productId ? { ...x, kamoProductId } : x.kamoProductId === kamoProductId ? { ...x, kamoProductId: '' } : x),
  });
}

/* ---------- カモの小屋の取り込み（GAS の Finance.gs と同じ動き） ---------- */

// 名前からセットかどうかを見当をつける（あとで画面で直せる）
export const guessKind = (name) => (/セット|＆|&|ランチ|モーニング/.test(String(name)) ? 'set' : 'single');

const todayJst = () => new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);

// 値段が変わったら、今日から新しい値段として記録する（GAS の finPriceChanged_ と同じ）
export function priceChange(fin, productId, oldPrice, newPrice, date = todayJst()) {
  if (String(oldPrice ?? '') === '' || String(oldPrice) === String(newPrice)) return fin;
  const h = { id: `${productId}@${new Date().toISOString()}`, productId, date, oldPrice, newPrice };
  return { ...fin, priceHistory: [...(fin.priceHistory || []), h] };
}

// カモの小屋の商品ごとに米チャレの商品を1つ作る。名前・値段・販売中はカモの小屋に合わせる
export function applyKamoProducts(fin, kamoProducts, date) {
  let products = fin.products;
  kamoProducts.forEach((k) => {
    const sync = { name: k.name, price: k.price, active: k.active !== false };
    const i = products.findIndex((p) => p.kamoProductId === k.id);
    if (i >= 0) fin = priceChange(fin, products[i].id, products[i].price, k.price, date);
    products = i >= 0
      ? products.map((p, j) => (j === i ? { ...p, ...sync, kind: p.kind || guessKind(k.name) } : p))
      : [...products, {
        id: 'kamo:' + k.id, channel: 'store', kind: guessKind(k.name), parts: '[]', cookedG: '', riceRawG: '', materials: '[]', shipping: '', customerPaysShipping: false,
        feeRate: '', feeFixed: '', kamoProductId: k.id, ...sync,
      }];
  });
  return { ...fin, products };
}

// 取り込んだ売上に商品をつけ、ご飯の量が入った商品なら米の量と変動費を記録する（記録済みのものは変えない）
// redo: 記録済みのものも、今の商品の設定で計算し直す
export function fillKamoSales(fin, redo = false) {
  const ctx = { cookRatio: num(fin.settings?.cookRatio) || undefined, products: fin.products };
  return {
    ...fin,
    sales: fin.sales.map((s) => {
      if (s.source !== 'kamo') return s;
      const p = s.productId
        ? fin.products.find((x) => x.id === s.productId)
        : fin.products.find((x) => x.kamoProductId && x.kamoProductId === s.kamoProductId);
      if (!p) return s;
      let r = s.productId ? s : { ...s, productId: p.id };
      if (redo) r = { ...r, variableCostAtSale: '', riceGAtSale: '' };
      if ((r.riceGAtSale === '' || r.riceGAtSale == null) && hasRice(p, fin.products)) {
        const u = unitEconomics(p, ctx);
        r = { ...r, variableCostAtSale: u.variable, riceGAtSale: u.riceG };
      }
      return r;
    }),
  };
}
