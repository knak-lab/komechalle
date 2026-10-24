// GAS ウェブアプリとの通信。VITE_GAS_URL が未設定ならデモモード（ブラウザ内だけに保存）
import { sampleData } from './sample';

export const GAS_URL = import.meta.env.VITE_GAS_URL || '';
export const isDemo = !GAS_URL;

const DEMO_KEY = 'komechalle-demo-v1';

const num = (v) => (v === '' || v == null ? NaN : Number(v));
const bool = (v) => v === true || v === 'true' || v === 'TRUE';

// スプレッドシートの値（文字列）をアプリで使う型にそろえる
function normalize({ nodes = [], edges = [] }) {
  return {
    nodes: nodes.filter((n) => n.id).map((n) => ({ ...n, x: num(n.x), y: num(n.y) })),
    edges: edges.filter((e) => e.id).map((e) => ({ ...e, auto: bool(e.auto), pending: bool(e.pending) })),
  };
}

export async function fetchAll() {
  if (isDemo) {
    try {
      const d = JSON.parse(localStorage.getItem(DEMO_KEY));
      if (d && Array.isArray(d.nodes)) return normalize(d);
    } catch { /* 保存データが壊れていたらサンプルから */ }
    return normalize(sampleData());
  }
  const res = await fetch(`${GAS_URL}?action=all`);
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || '読み込みに失敗しました');
  return normalize(json);
}

export function saveDemo(data) {
  try { localStorage.setItem(DEMO_KEY, JSON.stringify(data)); } catch { /* 容量不足などは無視 */ }
}

export function resetDemo() {
  try { localStorage.removeItem(DEMO_KEY); } catch { /* noop */ }
}

// Content-Type を text/plain にして、GAS へのプリフライト（CORS）を避ける
export async function call(action, payload = {}) {
  if (isDemo) return { ok: true };
  const res = await fetch(GAS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, ...payload }),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || '保存に失敗しました');
  return json;
}

/* ---------- 収支（運営モードだけ。公開の ?action=all には含めない） ---------- */

const FIN_DEMO_KEY = 'komechalle-fin-demo-v1';

// デモモードでは、ブラウザの中だけで GAS と同じように動かす
export async function finCall(action, payload = {}) {
  if (!isDemo) return call(action, payload);
  const { sampleFinance, sampleKamoExport } = await import('./sample');
  const { applyDelete, applyKamoProducts, applyLink, applySave, fillKamoSales } = await import('./finance/store');
  let fin;
  try { fin = JSON.parse(localStorage.getItem(FIN_DEMO_KEY)); } catch { /* 壊れていたらサンプルから */ }
  if (!fin || !Array.isArray(fin.products)) fin = sampleFinance();
  let res = {};
  if (action === 'finSave') fin = applySave(fin, payload.table, payload.row);
  else if (action === 'finDelete') fin = applyDelete(fin, payload.table, payload.id);
  else if (action === 'finLinkKamo') fin = applyLink(fin, payload.kamoProductId, payload.productId);
  else if (action === 'finRecalcKamo') fin = fillKamoSales(fin, true);
  else if (action === 'syncFromKamo') {
    const x = sampleKamoExport();
    const since = fin.settings.kamoSince || '';
    x.sales = x.sales.filter((s) => s.date >= since);
    fin = { ...fin, sales: fin.sales.filter((s) => s.source !== 'kamo' || s.date >= since) };
    const before = fin.products.length;
    fin = applyKamoProducts(fin, x.products);
    const have = new Set(fin.sales.map((s) => s.id));
    const added = x.sales.filter((s) => !have.has('kamo:' + s.id)).map((s) => ({
      id: 'kamo:' + s.id, source: 'kamo', date: s.date, year: '', productId: '', eventId: '', qty: s.qty,
      unitPrice: s.amount / s.qty, amount: s.amount, variableCostAtSale: '', riceGAtSale: '',
      channel: s.channel === 'BASE' ? 'online' : 'store', kamoProductId: s.productId, yearManual: '',
    }));
    const now = new Date().toISOString();
    fin = fillKamoSales({ ...fin, kamoProducts: x.products.map((p) => ({ ...p, syncedAt: now })), sales: [...fin.sales, ...added], settings: { ...fin.settings, kamoLastSyncAt: now } });
    res = { added: added.length, created: fin.products.length - before };
  }
  try { localStorage.setItem(FIN_DEMO_KEY, JSON.stringify(fin)); } catch { /* noop */ }
  return action === 'finance' ? { ok: true, fin } : { ok: true, ...res };
}

export function resetFinDemo() {
  try { localStorage.removeItem(FIN_DEMO_KEY); } catch { /* noop */ }
}
