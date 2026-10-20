// 収支データの書きかえ（画面をすぐ変えるときと、デモモードの保存の両方で使う）
import { num, unitEconomics } from './calc';

export const CHANNELS = { event: 'イベント', store: '店頭', online: 'ネット' };

export const FIN_KEYS = { harvest: 'year', costs: 'id', assets: 'id', products: 'id', sales: 'id' };

export const emptyFin = () => ({ harvest: [], costs: [], assets: [], products: [], sales: [], settings: {}, kamoProducts: [] });

export function applySave(fin, table, row) {
  if (table === 'settings') return { ...fin, settings: { ...fin.settings, [row.key]: row.value } };
  const k = FIN_KEYS[table];
  const list = fin[table] || [];
  const i = list.findIndex((r) => String(r[k]) === String(row[k]));
  return { ...fin, [table]: i < 0 ? [...list, row] : list.map((r, j) => (j === i ? { ...r, ...row } : r)) };
}

export function applyDelete(fin, table, id) {
  const k = FIN_KEYS[table];
  return { ...fin, [table]: (fin[table] || []).filter((r) => String(r[k]) !== String(id) || r.source === 'kamo') };
}

// カモの小屋の商品を米チャレの商品に紐づけ、未紐づけの取り込み売上も紐づける（GAS の finLinkKamo と同じ）
export function applyLink(fin, kamoProductId, productId) {
  const p = fin.products.find((x) => x.id === productId);
  if (!p) return fin;
  const u = unitEconomics(p, { cookRatio: num(fin.settings?.cookRatio) || undefined });
  return {
    ...fin,
    products: fin.products.map((x) =>
      x.id === productId ? { ...x, kamoProductId } : x.kamoProductId === kamoProductId ? { ...x, kamoProductId: '' } : x),
    sales: fin.sales.map((s) =>
      s.source === 'kamo' && s.kamoProductId === kamoProductId && !s.productId
        ? { ...s, productId, channel: p.channel, variableCostAtSale: u.variable, riceGAtSale: u.riceG }
        : s),
  };
}
