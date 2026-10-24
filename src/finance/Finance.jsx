import { useCallback, useEffect, useMemo, useState } from 'react';
import { finCall } from '../api';
import { uid } from '../config';
import { bool, kgf, komeAmount, num, onigiriCounts, pct, saleKeep, salesSummary, unitEconomics, yearContext, yearOfDate, yen, yen1 } from './calc';
import Meter from './Meter';
import { CHANNELS, applyDelete, applyLink, applySave, emptyFin, fillKamoSales } from './store';
import { CostsTab, HarvestTab, ProductsTab } from './Edit';
import PricingTab from './Pricing';

const TABS = [['summary', 'まとめ'], ['harvest', '収穫'], ['costs', '原価'], ['products', '商品'], ['sales', '売上'], ['pricing', '価格試算']];

const pad = (n) => String(n).padStart(2, '0');
export const today = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const md = (d) => (d ? `${+d.slice(5, 7)}/${+d.slice(8, 10)}` : '');
const syncedText = (iso) => {
  if (!iso) return 'まだ取り込んでいません';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : `${d.getMonth() + 1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())} に取り込み`;
};

// 売上の年度：手で変えていなければ、いまの収穫日から決め直す（収穫日をあとで入れても合うように）
export const saleYear = (s, harvest) => (bool(s.yearManual) && num(s.year) != null ? num(s.year) : yearOfDate(s.date, harvest));

export default function FinanceDialog({ adminKey, nodes, onClose, toast }) {
  const [fin, setFin] = useState(null);
  const [err, setErr] = useState('');
  const [tab, setTab] = useState('summary');
  const [year, setYear] = useState(null);
  const [extraYears, setExtraYears] = useState([]);
  const [syncing, setSyncing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await finCall('finance', { adminKey });
      const f = { ...emptyFin(), ...res.fin };
      setFin(f);
      setYear((y) => y ?? yearOfDate(today(), f.harvest));
    } catch (e) {
      setErr(e.message);
    }
  }, [adminKey]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // 画面をすぐ書きかえてから保存し、失敗したら元に戻す
  const run = useCallback(async (next, action, payload, okMsg) => {
    const prev = fin;
    setFin(next);
    try {
      const res = await finCall(action, { adminKey, ...payload });
      if (okMsg) toast(okMsg);
      return res;
    } catch (e) {
      setFin(prev);
      toast('保存できませんでした：' + e.message);
      return null;
    }
  }, [fin, adminKey, toast]);

  const api = useMemo(() => ({
    save: (table, row, msg = '保存しました') => run(applySave(fin, table, row), 'finSave', { table, row }, msg),
    remove: (table, id, msg = '削除しました') => run(applyDelete(fin, table, id), 'finDelete', { table, id }, msg),
    link: (kamoProductId, productId) => run(applyLink(fin, kamoProductId, productId), 'finLinkKamo', { kamoProductId, productId }, '紐づけました'),
    recalc: () => run(fillKamoSales(fin, true), 'finRecalcKamo', {}, '取り込んだ売上を計算し直しました'),
  }), [fin, run]);

  async function sync() {
    setSyncing(true);
    try {
      const r = await finCall('syncFromKamo', { adminKey });
      toast(`カモの小屋から${r.added}件取り込みました${r.created ? `。商品を${r.created}件作りました。「商品」タブでご飯の量を入れてください` : ''}${r.unlinked ? `（未紐づけ ${r.unlinked}件）` : ''}`);
      await load();
    } catch (e) {
      toast('取り込めませんでした：' + e.message);
    }
    setSyncing(false);
  }

  const years = useMemo(() => {
    if (!fin) return [];
    const ys = new Set([year, ...extraYears]);
    fin.harvest.forEach((h) => num(h.year) && ys.add(num(h.year)));
    fin.costs.forEach((c) => num(c.year) && ys.add(num(c.year)));
    fin.assets.forEach((a) => num(a.startYear) && ys.add(num(a.startYear)));
    fin.sales.forEach((s) => ys.add(saleYear(s, fin.harvest)));
    return [...ys].filter((y) => y != null).sort((a, b) => a - b);
  }, [fin, year, extraYears]);

  const ctx = useMemo(() => (fin && year ? yearContext(fin, year) : null), [fin, year]);
  const events = useMemo(() => nodes.filter((n) => n.kind === 'event' && n.date).sort((a, b) => b.date.localeCompare(a.date)), [nodes]);
  const fields = useMemo(() => nodes.filter((n) => n.kind === 'field'), [nodes]);

  let body;
  if (err) body = <p className="note">読み込めませんでした：{err}</p>;
  else if (!fin || !ctx) body = <p className="note">読み込み中…</p>;
  else {
    const props = { fin, ctx, year, api, events, fields };
    body = {
      summary: <SummaryTab {...props} />,
      harvest: <HarvestTab key={year} {...props} />,
      costs: <CostsTab {...props} />,
      products: <ProductsTab {...props} />,
      sales: <SalesTab {...props} />,
      pricing: <PricingTab {...props} />,
    }[tab];
  }

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog fin" role="dialog" aria-label="収支">
        <div className="fin-head">
          <h2>収支</h2>
          {fin && (
            <select
              value={year ?? ''} aria-label="年度"
              onChange={(e) => {
                if (e.target.value === 'next') { const y = Math.max(...years) + 1; setExtraYears([...extraYears, y]); setYear(y); }
                else setYear(Number(e.target.value));
              }}
            >
              {years.map((y) => <option key={y} value={y}>{y}年度</option>)}
              <option value="next">＋ 次の年度</option>
            </select>
          )}
          <button className="btn small" onClick={onClose}>閉じる</button>
        </div>
        <nav className="fin-tabs" role="tablist">
          {TABS.map(([k, label]) => (
            <button key={k} role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>{label}</button>
          ))}
        </nav>
        {fin && (tab === 'summary' || tab === 'sales') && (
          <div className="fin-sync">
            <span>カモの小屋：{syncedText(fin.settings.kamoLastSyncAt)}</span>
            <button className="btn small" onClick={sync} disabled={syncing}>{syncing ? '取り込み中…' : 'カモの小屋から取り込む'}</button>
          </div>
        )}
        <div className="fin-body">{body}</div>
      </div>
    </div>
  );
}

/* ---------- まとめ ---------- */

function SummaryTab({ fin, ctx, year, events }) {
  const sales = fin.sales.filter((s) => saleYear(s, fin.harvest) === year && s.productId);
  const sum = salesSummary(sales, { totalCost: ctx.totalCost, hakumaiKg: ctx.kg.hakumaiKg, products: fin.products });
  const recovered = Math.min(1, Math.max(0, sum.recovery || 0));
  const products = fin.products.filter((p) => bool(p.active));
  const counts = [...onigiriCounts(sales, fin.products).entries()]
    .map(([id, n]) => ({ p: fin.products.find((x) => x.id === id), n }))
    .sort((a, b) => b.n - a.n);
  const byEvent = new Map();
  for (const s of sales) {
    const k = s.eventId || '';
    const g = byEvent.get(k) || { qty: 0, amount: 0, keep: 0 };
    g.qty += num(s.qty) || 0;
    g.amount += komeAmount(s, fin.products);
    g.keep += saleKeep(s, fin.products);
    byEvent.set(k, g);
  }
  const evRows = [...byEvent.entries()].map(([id, g]) => ({ id, ev: events.find((e) => e.id === id), ...g }))
    .sort((a, b) => (b.ev?.date || '').localeCompare(a.ev?.date || ''));

  return (
    <>
      <Meter totalCost={ctx.totalCost} keep={sum.keep} />
      <div className="stats">
        <div className="stat"><b>{yen(ctx.totalCost)}</b><span>{year}年度の原価</span></div>
        <div className="stat"><b>{kgf(ctx.kg.hakumaiKg)}</b><span>白米{ctx.kg.hakumaiSource && `（${ctx.kg.hakumaiSource}）`}</span></div>
        <div className="stat"><b>{ctx.costPerKg ? yen1(ctx.costPerKg) : '–'}</b><span>1kgあたり原価</span></div>
      </div>

      <h3>原価の回収</h3>
      <div className="fin-progress" role="img" aria-label={`原価の回収 ${pct(sum.recovery)}`}>
        <span style={{ width: `${recovered * 100}%` }} className={sum.profit >= 0 ? 'done' : ''} />
      </div>
      <p className="fin-big">
        {ctx.totalCost <= 0 ? '原価がまだ入っていません'
          : sum.profit >= 0 ? <>黒字 <b>{yen(sum.profit)}</b></>
            : <>回収 <b>{pct(sum.recovery)}</b>　あと {yen(-sum.profit)}</>}
      </p>
      <p className="note">売上 {yen(sum.amount)} ／ 手残り {yen(sum.keep)}（{sales.length}件）</p>

      <h3>残りのお米</h3>
      <p className="fin-big">
        {sum.riceLeftKg == null ? '収穫がまだ入っていません'
          : <><b>{kgf(sum.riceLeftKg)}</b>　（使った {kgf(sum.riceUsedKg)} ／ {pct(sum.riceUsedKg / ctx.kg.hakumaiKg)}）</>}
      </p>

      <h3>おにぎりの販売数（セットの中身も数える）</h3>
      {counts.length ? (
        <ul className="fin-list">
          {counts.map(({ p, n }) => (
            <li key={p.id}><span className="row"><span className="t">{p.name}</span><span className="n">{n.toLocaleString()}個</span></span></li>
          ))}
          <li><span className="row"><span className="t"><b>合計</b></span><span className="n"><b>{counts.reduce((a, c) => a + c.n, 0).toLocaleString()}個</b></span></span></li>
        </ul>
      ) : <p className="note">売上が入ると出ます</p>}

      <h3>商品ごと（この商品だけで原価を回収する場合）</h3>
      {products.length ? (
        <div className="fin-scroll">
          <table className="fin-table">
            <thead><tr><th>商品</th><th>手残り</th><th>損益分岐</th><th>使うお米</th><th>収穫比</th></tr></thead>
            <tbody>
              {products.map((p) => {
                const u = unitEconomics(p, ctx);
                const kg = u.breakEven != null ? (u.breakEven * u.riceG) / 1000 : null;
                return (
                  <tr key={p.id}>
                    <td>{p.name}<small>{CHANNELS[p.channel] || ''}・{yen(num(p.price))}</small></td>
                    <td>{yen1(u.keep)}</td>
                    <td>{u.breakEven != null ? `${u.breakEven.toLocaleString()}個` : '–'}</td>
                    <td>{kgf(kg)}</td>
                    <td>{ctx.kg.hakumaiKg && kg != null ? pct(kg / ctx.kg.hakumaiKg) : '–'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : <p className="note">「商品」タブで販売パターンを登録すると出ます</p>}

      <h3>イベントごとの売上</h3>
      {evRows.length ? (
        <ul className="fin-list">
          {evRows.map((r) => (
            <li key={r.id || 'none'}>
              <span className="t">{r.ev ? <>{r.ev.name}<small>{md(r.ev.date)}</small></> : 'イベントなし（店頭・ネットなど）'}</span>
              <span className="n">{r.qty.toLocaleString()}個</span>
              <span className="n">{yen(r.amount)}<small>手残り {yen(r.keep)}</small></span>
            </li>
          ))}
        </ul>
      ) : <p className="note">まだ売上がありません</p>}
    </>
  );
}

/* ---------- 売上 ---------- */

function SalesTab({ fin, ctx, year, api, events }) {
  const products = fin.products.filter((p) => bool(p.active));
  // eventId: null = その日の予定が1つならそれ（自動）、'' = なし、それ以外 = 選んだ予定
  const [f, setF] = useState(() => ({ date: today(), productId: products[0]?.id || '', qty: '', eventId: null }));
  const [open, setOpen] = useState(null);
  const dayEvents = events.filter((e) => e.date === f.date);
  const eventId = f.eventId ?? (dayEvents.length === 1 ? dayEvents[0].id : '');

  const sales = fin.sales.filter((s) => saleYear(s, fin.harvest) === year)
    .sort((a, b) => b.date.localeCompare(a.date) || String(b.id).localeCompare(String(a.id)));
  const unlinked = new Map();
  fin.sales.filter((s) => s.source === 'kamo' && !s.productId).forEach((s) => {
    const g = unlinked.get(s.kamoProductId) || { n: 0, qty: 0 };
    g.n++; g.qty += num(s.qty) || 0;
    unlinked.set(s.kamoProductId, g);
  });

  async function add(e) {
    e.preventDefault();
    const p = fin.products.find((x) => x.id === f.productId);
    const qty = num(f.qty);
    if (!p || !qty) return;
    const u = unitEconomics(p, ctx);
    const price = num(p.price) || 0;
    const row = {
      id: uid('s'), source: 'manual', date: f.date, year: yearOfDate(f.date, fin.harvest), productId: p.id, eventId,
      qty, unitPrice: price, amount: price * qty, variableCostAtSale: u.variable, riceGAtSale: u.riceG,
      channel: p.channel, kamoProductId: '', yearManual: '',
    };
    const ok = await api.save('sales', row, `${p.name} ${qty}個を登録しました`);
    if (ok) setF({ ...f, qty: '' });
  }

  return (
    <>
      <form className="fin-quick" onSubmit={add}>
        <div className="row2">
          <div className="field"><label htmlFor="s-date">日付</label>
            <input type="date" id="s-date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value, eventId: null })} required /></div>
          <div className="field"><label htmlFor="s-qty">数量</label>
            <input type="number" id="s-qty" inputMode="numeric" min="1" step="1" value={f.qty} onChange={(e) => setF({ ...f, qty: e.target.value })} placeholder="例：80" required /></div>
        </div>
        <div className="field"><span className="lab">商品</span>
          {products.length ? (
            <div className="pick">
              {products.map((p) => (
                <label key={p.id} className={f.productId === p.id ? 'on' : ''}>
                  <input type="radio" name="s-prod" checked={f.productId === p.id} onChange={() => setF({ ...f, productId: p.id })} />
                  <span>{p.name}</span>
                </label>
              ))}
            </div>
          ) : <p className="note">先に「商品」タブで商品を登録してください</p>}
        </div>
        <div className="field"><label htmlFor="s-ev">イベント</label>
          <select id="s-ev" value={eventId} onChange={(e) => setF({ ...f, eventId: e.target.value })}>
            <option value="">（イベントなし）</option>
            {events.map((ev) => <option key={ev.id} value={ev.id}>{md(ev.date)} {ev.name}</option>)}
          </select>
        </div>
        <div className="dfoot"><button type="submit" className="btn primary" disabled={!products.length || !num(f.qty)}>登録する</button></div>
      </form>

      <div className="fin-since">
        <label htmlFor="s-since">カモの小屋から取り込む売上の開始日</label>
        <input
          type="date" id="s-since" defaultValue={fin.settings.kamoSince || ''} key={fin.settings.kamoSince || ''}
          onChange={(e) => e.target.value !== (fin.settings.kamoSince || '') && api.save('settings', { key: 'kamoSince', value: e.target.value }, '開始日を保存しました。次の取り込みから使います')}
        />
        <small>空欄ならいちばん古い収穫日から。開始日より前の取り込み分は、次の取り込みで外れます</small>
      </div>

      {unlinked.size > 0 && (
        <>
          <h3>未紐づけ（カモの小屋の商品）</h3>
          <ul className="fin-list">
            {[...unlinked.entries()].map(([kid, g]) => (
              <li key={kid}>
                <span className="t">{kid}<small>{g.n}件・{g.qty}個</small></span>
                <select defaultValue="" aria-label={`${kid} を紐づける商品`} onChange={(e) => e.target.value && api.link(kid, e.target.value)}>
                  <option value="">紐づける商品…</option>
                  {fin.products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </li>
            ))}
          </ul>
        </>
      )}

      <h3>{year}年度の売上 {sales.length}件</h3>
      {sales.length ? (
        <ul className="fin-list sales">
          {sales.map((s) => {
            const p = fin.products.find((x) => x.id === s.productId);
            const ev = events.find((e) => e.id === s.eventId);
            const isOpen = open === s.id;
            return (
              <li key={s.id} className={isOpen ? 'open' : ''}>
                <button className="row" onClick={() => setOpen(isOpen ? null : s.id)} aria-expanded={isOpen}>
                  <span className="d">{md(s.date)}</span>
                  <span className="t">{p ? p.name : <em>未紐づけ：{s.kamoProductId}</em>}<small>{[ev?.name, s.source === 'kamo' ? 'カモの小屋' : ''].filter(Boolean).join('・')}</small></span>
                  <span className="n">{(num(s.qty) || 0).toLocaleString()}個</span>
                  <span className="n">{yen(komeAmount(s, fin.products))}{komeAmount(s, fin.products) !== (num(s.amount) || 0) && <small>セット {yen(num(s.amount))}</small>}</span>
                </button>
                {isOpen && (
                  <div className="more">
                    <label>年度
                      <select value={saleYear(s, fin.harvest)} onChange={(e) => api.save('sales', { id: s.id, year: e.target.value, yearManual: true })}>
                        {[...new Set([year - 1, year, year + 1, saleYear(s, fin.harvest)])].sort().map((y) => <option key={y} value={y}>{y}年度</option>)}
                      </select>
                    </label>
                    <label>イベント
                      <select value={s.eventId || ''} onChange={(e) => api.save('sales', { id: s.id, eventId: e.target.value })}>
                        <option value="">（なし）</option>
                        {events.map((ev) => <option key={ev.id} value={ev.id}>{md(ev.date)} {ev.name}</option>)}
                      </select>
                    </label>
                    {s.source === 'kamo'
                      ? <span className="note">カモの小屋から取り込んだ売上です（金額・数量はカモの小屋のまま）</span>
                      : <button className="btn small danger" onClick={() => api.remove('sales', s.id)}>この売上を削除</button>}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      ) : <p className="note">この年度の売上はまだありません</p>}
    </>
  );
}
