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
