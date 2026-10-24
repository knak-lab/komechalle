import { useState } from 'react';
import { isSet, num, pct, sameKeepQty, unitEconomics, yen, yen1 } from './calc';
import { Num, ProductFields } from './Edit';

const blank = { channel: 'event', price: '', cookedG: '80', riceRawG: '', materials: '[]', shipping: '', customerPaysShipping: false, feeRate: '', feeFixed: '' };

// 値段を決めるための計算。保存しなくても使える。「この値段で商品に反映」だけが保存する
export default function PricingTab({ fin, ctx, api }) {
  const [baseId, setBaseId] = useState('');
  const [f, setF] = useState(blank);
  const [prices, setPrices] = useState(['', '', '']);
  const [perTime, setPerTime] = useState('80');
  const [times, setTimes] = useState('4');
  const [memo, setMemo] = useState(fin.settings.priceMemo || '');
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));
  const base = fin.products.find((p) => p.id === baseId);

  const pick = (id) => {
    setBaseId(id);
    const p = fin.products.find((x) => x.id === id);
    if (!p) { setF(blank); return; }
    setF({ ...blank, ...p });
    setPrices([String(p.price ?? ''), '', '']);
  };

  const cands = prices.map((v) => num(v)).map((price) => (price == null ? null : { price, u: unitEconomics({ ...f, price }, ctx) }));
  const first = cands.find(Boolean);
  const n = num(perTime) || 0;
  const k = num(times) || 0;

  return (
    <>
      <div className="field"><label htmlFor="pr-base">商品</label>
        <select id="pr-base" value={baseId} onChange={(e) => pick(e.target.value)}>
          <option value="">（新しい商品を考える）</option>
          {fin.products.filter((p) => !isSet(p)).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select></div>
      <ProductFields f={f} set={set} ctx={ctx} />

      <h3>値段の候補（3つまで）</h3>
      <div className="row3">
        {prices.map((v, i) => (
          <Num key={i} id={`pr-c${i}`} label={`候補${i + 1}`} unit="円" value={v} onChange={(x) => setPrices(prices.map((y, j) => (j === i ? x : y)))} />
        ))}
      </div>
      <div className="row2">
        <Num id="pr-n" label="1回あたりの販売数" unit="個" step="1" value={perTime} onChange={setPerTime} />
        <Num id="pr-k" label="年間の回数" unit="回" step="1" value={times} onChange={setTimes} />
      </div>

      {first ? (
        <div className="fin-scroll">
          <table className="fin-table cmp">
            <thead>
              <tr><th />{cands.map((c, i) => c && <th key={i}>{yen(c.price)}</th>)}</tr>
            </thead>
            <tbody>
              <Row label="1単位の原価（お米＋資材）" cands={cands} v={(c) => <>{yen1(c.u.unitCost)}<small>原価率 {pct(c.u.costRate)}</small></>} />
              <Row label="手残り" cands={cands} v={(c) => <b>{yen1(c.u.keep)}</b>} />
              <Row label="粗利（お米の原価を引く）" cands={cands} v={(c) => yen1(c.u.gross)} />
              <Row label={`損益分岐（${ctx.year}年度の原価 ${yen(ctx.totalCost)} をこの商品だけで）`} cands={cands} v={(c) => (c.u.breakEven != null ? `${c.u.breakEven.toLocaleString()}個` : '–')} />
              <Row label={`1回あたりの手残り（${n}個）`} cands={cands} v={(c) => yen(c.u.keep * n)} />
              <Row label={`年間の手残り（${k}回）`} cands={cands} v={(c) => yen(c.u.keep * n * k)} />
              <Row label={`${yen(first.price)}で${n}個と同じ手残りに必要な数`} cands={cands}
                v={(c) => { const q = sameKeepQty(first.u.keep, n, c.u.keep); return q != null ? `約${q.toLocaleString()}個` : '–'; }} />
              {base && (
                <tr><th />{cands.map((c, i) => c && (
                  <td key={i}>
                    {num(base.price) === c.price
                      ? <small>いまの値段</small>
                      : <button className="btn small" onClick={() => api.save('products', { id: base.id, price: c.price }, `${base.name}を${yen(c.price)}にしました`)}>この値段で商品に反映</button>}
                  </td>
                ))}</tr>
              )}
            </tbody>
          </table>
        </div>
      ) : <p className="note">値段の候補を入れると、ここに比べた結果が出ます</p>}

      <div className="field"><label htmlFor="pr-memo">参考相場のメモ</label>
        <textarea id="pr-memo" rows={3} value={memo} onChange={(e) => setMemo(e.target.value)}
          onBlur={() => memo !== (fin.settings.priceMemo || '') && api.save('settings', { key: 'priceMemo', value: memo }, 'メモを保存しました')}
          placeholder="例：コンビニおにぎり 160〜200円台" /></div>
    </>
  );
}

function Row({ label, cands, v }) {
  return (
    <tr>
      <th>{label}</th>
      {cands.map((c, i) => c && <td key={i}>{v(c)}</td>)}
    </tr>
  );
}
