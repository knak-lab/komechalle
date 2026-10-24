import { useState } from 'react';
import { uid } from '../config';
import { ConfirmButton } from '../components/Dialogs';
import { bool, costAmount, depreciation, expandSet, harvestKg, hasRice, isSet, kgf, num, parseMaterials, parseParts, pct, riceG, setParts, unitEconomics, yen, yen1 } from './calc';
import { CHANNELS } from './store';

const COST_CATEGORIES = ['種', '肥料', '農薬', '燃料', 'もみすり', '精米', '資材', '出店料', '人件費', 'その他'];

// 数字の入力欄。空欄は '' のまま持つ（未入力と 0 を区別するため）
export function Num({ id, label, value, onChange, unit, placeholder, step = 'any' }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="num">
        <input type="number" id={id} inputMode="decimal" step={step} value={value ?? ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
        {unit && <span>{unit}</span>}
      </div>
    </div>
  );
}

const s = (v) => (v == null ? '' : String(v));

/* ---------- 収穫 ---------- */

export function HarvestTab({ fin, year, api, fields }) {
  const row = fin.harvest.find((h) => num(h.year) === year);
  const [f, setF] = useState(() => ({
    harvestDate: s(row?.harvestDate), fieldIds: s(row?.fieldIds), areaTan: s(row?.areaTan), momiKg: s(row?.momiKg),
    genmaiBags: s(row?.genmaiBags), bagKg: s(row?.bagKg || 30), genmaiKg: s(row?.genmaiKg), seimaiRate: s(row?.seimaiRate || 0.9),
    hakumaiKg: s(row?.hakumaiKg), memo: s(row?.memo),
  }));
  const set = (k) => (v) => setF({ ...f, [k]: v });
  const kg = harvestKg(f);
  const picked = new Set(f.fieldIds.split(',').filter(Boolean));
  const tag = (src) => src && <span className={'src ' + (src === '実測' ? 'real' : '')}>{src}</span>;

  return (
    <form onSubmit={(e) => { e.preventDefault(); api.save('harvest', { year, ...f }, `${year}年度の収穫を保存しました`); }}>
      <div className="row2">
        <div className="field"><label htmlFor="h-date">収穫日</label>
          <input type="date" id="h-date" value={f.harvestDate} onChange={(e) => set('harvestDate')(e.target.value)} /></div>
        <Num id="h-area" label="作付面積" unit="反" value={f.areaTan} onChange={set('areaTan')} />
      </div>
      <p className="note">収穫日が年度の区切りです（この日から次の年度の収穫日の前日までの売上が{year}年度）。</p>
      {fields.length > 0 && (
        <div className="field"><span className="lab">田んぼ</span>
          <div className="pick">
            {fields.map((fl) => (
              <label key={fl.id} className={picked.has(fl.id) ? 'on' : ''}>
                <input type="checkbox" checked={picked.has(fl.id)} onChange={() => {
                  const n = new Set(picked);
                  n.has(fl.id) ? n.delete(fl.id) : n.add(fl.id);
                  set('fieldIds')([...n].join(','));
                }} />
                <span>{fl.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <h3>もみ</h3>
      <Num id="h-momi" label="もみ（実測・わかれば）" unit="kg" value={f.momiKg} onChange={set('momiKg')} />

      <h3>玄米 {tag(kg.genmaiSource)}</h3>
      <div className="row2">
        <Num id="h-bags" label="袋の数" unit="袋" step="1" value={f.genmaiBags} onChange={set('genmaiBags')} />
        <Num id="h-bagkg" label="1袋の重さ" unit="kg" value={f.bagKg} onChange={set('bagKg')} />
      </div>
      <Num id="h-genmai" label="玄米（実測・あれば優先）" unit="kg" value={f.genmaiKg} onChange={set('genmaiKg')}
        placeholder={kg.genmaiSource === '計算' ? `計算：${Math.round(kg.genmaiKg * 10) / 10}` : ''} />
      {kg.momiToGenmai != null && <p className="note">もみ → 玄米の歩留まり {pct(kg.momiToGenmai)}</p>}

      <h3>白米 {tag(kg.hakumaiSource)}</h3>
      <div className="row2">
        <Num id="h-rate" label="精米歩留まり" value={f.seimaiRate} onChange={set('seimaiRate')} placeholder="0.9" />
        <Num id="h-hakumai" label="白米（実測・あれば優先）" unit="kg" value={f.hakumaiKg} onChange={set('hakumaiKg')}
          placeholder={kg.hakumaiSource === '計算' ? `計算：${Math.round(kg.hakumaiKg * 10) / 10}` : ''} />
      </div>
      <div className="fin-result">
        <span>玄米 <b>{kgf(kg.genmaiKg)}</b>{tag(kg.genmaiSource)}</span>
        <span>白米 <b>{kgf(kg.hakumaiKg)}</b>{tag(kg.hakumaiSource)}</span>
      </div>
      <div className="field"><label htmlFor="h-memo">メモ</label>
        <textarea id="h-memo" rows={2} value={f.memo} onChange={(e) => set('memo')(e.target.value)} /></div>
      <div className="dfoot"><button type="submit" className="btn primary">保存する</button></div>
    </form>
  );
}

/* ---------- 原価 ---------- */

function CostForm({ row, year, onSave, onCancel }) {
  const [f, setF] = useState({
    category: s(row?.category), label: s(row?.label), unitPrice: s(row?.unitPrice), qty: s(row?.qty), amount: s(row?.amount),
  });
  const set = (k) => (v) => setF({ ...f, [k]: v });
  const auto = num(f.unitPrice) != null && num(f.qty) != null ? num(f.unitPrice) * num(f.qty) : null;
  return (
    <form className="fin-form" onSubmit={(e) => {
      e.preventDefault();
      if (!f.label.trim()) return;
      onSave({ id: row?.id || uid('c'), year, ...f, label: f.label.trim(), amount: auto != null && f.amount === '' ? '' : f.amount });
    }}>
      <div className="row2">
        <div className="field"><label htmlFor="c-cat">区分</label>
          <input type="text" id="c-cat" list="c-cats" value={f.category} onChange={(e) => set('category')(e.target.value)} placeholder="例：燃料" />
          <datalist id="c-cats">{COST_CATEGORIES.map((c) => <option key={c} value={c} />)}</datalist></div>
        <div className="field"><label htmlFor="c-label">内容</label>
          <input type="text" id="c-label" required value={f.label} onChange={(e) => set('label')(e.target.value)} placeholder="例：ガソリン代" /></div>
      </div>
      <div className="row3">
        <Num id="c-unit" label="単価" unit="円" value={f.unitPrice} onChange={set('unitPrice')} />
        <Num id="c-qty" label="数量" value={f.qty} onChange={set('qty')} />
        <Num id="c-amount" label="金額" unit="円" value={f.amount} onChange={set('amount')} placeholder={auto != null ? `自動：${auto.toLocaleString()}` : ''} />
      </div>
      <div className="dfoot">
        <button type="button" className="btn" onClick={onCancel}>キャンセル</button>
        <button type="submit" className="btn primary">保存する</button>
      </div>
    </form>
  );
}

function AssetForm({ row, year, onSave, onCancel }) {
  const [f, setF] = useState({ label: s(row?.label), price: s(row?.price), startYear: s(row?.startYear || year), years: s(row?.years || 5) });
  const set = (k) => (v) => setF({ ...f, [k]: v });
  const per = num(f.price) && num(f.years) ? num(f.price) / num(f.years) : null;
  return (
    <form className="fin-form" onSubmit={(e) => { e.preventDefault(); if (f.label.trim()) onSave({ id: row?.id || uid('a'), ...f, label: f.label.trim() }); }}>
      <div className="row2">
        <div className="field"><label htmlFor="a-label">設備</label>
          <input type="text" id="a-label" required value={f.label} onChange={(e) => set('label')(e.target.value)} placeholder="例：トラクター" /></div>
        <Num id="a-price" label="買った値段" unit="円" value={f.price} onChange={set('price')} />
      </div>
      <div className="row2">
        <Num id="a-start" label="使いはじめた年度" step="1" value={f.startYear} onChange={set('startYear')} />
        <Num id="a-years" label="何年使うか" unit="年" step="1" value={f.years} onChange={set('years')} />
      </div>
      {per != null && <p className="note">毎年 {yen(per)} を原価に入れます</p>}
      <div className="dfoot">
        <button type="button" className="btn" onClick={onCancel}>キャンセル</button>
        <button type="submit" className="btn primary">保存する</button>
      </div>
    </form>
  );
}

export function CostsTab({ fin, ctx, year, api }) {
  const [editCost, setEditCost] = useState(null); // null / {} 新規 / row
  const [editAsset, setEditAsset] = useState(null);
  const costs = fin.costs.filter((c) => num(c.year) === year);
  return (
    <>
      <div className="fin-result">
        <span>費用 <b>{yen(ctx.cost.direct)}</b></span>
        <span>設備の償却 <b>{yen(ctx.cost.dep)}</b></span>
        <span>{year}年度の原価 <b>{yen(ctx.cost.total)}</b></span>
      </div>

      <h3>{year}年の費用</h3>
      <ul className="fin-list">
        {costs.map((c) => (editCost?.id === c.id
          ? <li key={c.id} className="form"><CostForm row={c} year={year} onCancel={() => setEditCost(null)} onSave={async (r) => { if (await api.save('costs', r)) setEditCost(null); }} /></li>
          : (
            <li key={c.id}>
              <button className="row" onClick={() => setEditCost(c)}>
                <span className="t">{c.label}<small>{[c.category, num(c.unitPrice) != null && num(c.qty) != null ? `${yen(num(c.unitPrice))} × ${c.qty}` : ''].filter(Boolean).join('・')}</small></span>
                <span className="n">{yen(costAmount(c))}</span>
              </button>
              <ConfirmButton className="x" confirmText="消す？" onConfirm={() => api.remove('costs', c.id)}>×</ConfirmButton>
            </li>
          )))}
      </ul>
      {editCost && !editCost.id
        ? <CostForm year={year} onCancel={() => setEditCost(null)} onSave={async (r) => { if (await api.save('costs', r, '費用を追加しました')) setEditCost(null); }} />
        : <button className="btn" onClick={() => setEditCost({})}>＋ 費用を追加</button>}

      <h3>数年使う設備（毎年に分けて原価に入れる）</h3>
      <ul className="fin-list">
        {fin.assets.map((a) => {
          const d = depreciation(a, year);
          return editAsset?.id === a.id
            ? <li key={a.id} className="form"><AssetForm row={a} year={year} onCancel={() => setEditAsset(null)} onSave={async (r) => { if (await api.save('assets', r)) setEditAsset(null); }} /></li>
            : (
              <li key={a.id}>
                <button className="row" onClick={() => setEditAsset(a)}>
                  <span className="t">{a.label}<small>{yen(num(a.price))}・{a.startYear}年度から{a.years}年</small></span>
                  <span className="n">{d.nth ? <>{yen(d.amount)}<small>{d.nth}年目・残り{d.remaining}年</small></> : <small>{year}年度は対象外</small>}</span>
                </button>
                <ConfirmButton className="x" confirmText="消す？" onConfirm={() => api.remove('assets', a.id)}>×</ConfirmButton>
              </li>
            );
        })}
      </ul>
      {editAsset && !editAsset.id
        ? <AssetForm year={year} onCancel={() => setEditAsset(null)} onSave={async (r) => { if (await api.save('assets', r, '設備を追加しました')) setEditAsset(null); }} />
        : <button className="btn" onClick={() => setEditAsset({})}>＋ 設備を追加</button>}
    </>
  );
}

/* ---------- 商品 ---------- */

export function MaterialsEditor({ value, onChange }) {
  const list = parseMaterials(value);
  const put = (next) => onChange(JSON.stringify(next));
  return (
    <div className="field"><span className="lab">資材・調味料（お米は入れない）</span>
      {list.map((m, i) => (
        <div className="mat" key={i}>
          <input type="text" aria-label="名前" value={m.label} placeholder="例：カップ" onChange={(e) => put(list.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
          <div className="num">
            <input type="number" inputMode="decimal" step="any" aria-label="金額" value={m.amount ?? ''} onChange={(e) => put(list.map((x, j) => (j === i ? { ...x, amount: e.target.value === '' ? '' : Number(e.target.value) } : x)))} />
            <span>円</span>
          </div>
          <button type="button" className="x" aria-label="この行を消す" onClick={() => put(list.filter((_, j) => j !== i))}>×</button>
        </div>
      ))}
      <button type="button" className="btn small" onClick={() => put([...list, { label: '', amount: '' }])}>＋ 行を足す</button>
    </div>
  );
}

// 商品と価格試算の両方で使う「1単位の内訳」
export function UnitBox({ u }) {
  return (
    <dl className="fin-unit">
      <dt>お客さまの支払い</dt><dd>{yen1(u.pays)}</dd>
      {u.setOther ? <><dt>セットのおにぎり以外の分</dt><dd>−{yen1(u.setOther)}</dd></> : null}
      <dt>変動費（資材＋送料＋手数料）</dt><dd>{yen1(u.variable)}{u.fee ? <small>手数料 {yen1(u.fee)}</small> : null}</dd>
      <dt>手残り</dt><dd><b>{yen1(u.keep)}</b></dd>
      <dt>お米の原価（生米 {Math.round(u.riceG * 10) / 10}g）</dt><dd>{yen1(u.riceCost)}</dd>
      <dt>粗利</dt><dd>{yen1(u.gross)}</dd>
      <dt>損益分岐</dt><dd><b>{u.breakEven != null ? `${u.breakEven.toLocaleString()}個` : '–'}</b></dd>
    </dl>
  );
}

function PriceField({ f, set, lockPrice }) {
  return lockPrice
    ? <div className="field"><span className="lab">値段</span><p className="locked">{yen(num(f.price))}<small>カモの小屋で変更</small></p></div>
    : <Num id="p-price" label="値段" unit="円" value={f.price} onChange={set('price')} />;
}

// 単品の入力（価格試算でも使う）。lockPrice: カモの小屋の商品は値段をカモの小屋で変える
export function ProductFields({ f, set, ctx, lockPrice = false }) {
  return (
    <>
      <div className="row2">
        <div className="field"><label htmlFor="p-ch">売り方</label>
          <select id="p-ch" value={f.channel} onChange={(e) => set('channel')(e.target.value)}>
            {Object.entries(CHANNELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select></div>
        <PriceField f={f} set={set} lockPrice={lockPrice} />
      </div>
      <div className="row2">
        <Num id="p-cooked" label="炊いた重さ" unit="g" value={f.cookedG} onChange={set('cookedG')} />
        <Num id="p-raw" label="生米（白米）" unit="g" value={f.riceRawG} onChange={set('riceRawG')}
          placeholder={num(f.cookedG) != null ? `自動：${Math.round(riceG(f, ctx.cookRatio) * 10) / 10}` : ''} />
      </div>
      <MaterialsEditor value={f.materials} onChange={set('materials')} />
      <div className="row3">
        <Num id="p-ship" label="送料" unit="円" value={f.shipping} onChange={set('shipping')} />
        <Num id="p-feer" label="手数料率" unit="%" value={f.feeRate === '' || f.feeRate == null ? '' : Math.round(num(f.feeRate) * 10000) / 100}
          onChange={(v) => set('feeRate')(v === '' ? '' : Number(v) / 100)} />
        <Num id="p-feef" label="手数料（1件）" unit="円" value={f.feeFixed} onChange={set('feeFixed')} />
      </div>
      {num(f.shipping) > 0 && (
        <label className="check"><input type="checkbox" checked={bool(f.customerPaysShipping)} onChange={(e) => set('customerPaysShipping')(e.target.checked)} />送料はお客さまが払う</label>
      )}
    </>
  );
}

// セットの中身：どの単品を何個
function PartsEditor({ value, onChange, singles }) {
  const list = parseParts(value);
  const put = (next) => onChange(JSON.stringify(next));
  return (
    <div className="field"><span className="lab">中身のおにぎり（単品）</span>
      {list.map((x, i) => (
        <div className="mat" key={i}>
          <select aria-label="単品" value={x.id} onChange={(e) => put(list.map((y, j) => (j === i ? { ...y, id: e.target.value } : y)))}>
            {!singles.some((p) => p.id === x.id) && <option value={x.id}>（見つからない商品）</option>}
            {singles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <div className="num">
            <input type="number" inputMode="numeric" min="1" step="1" aria-label="個数" value={x.qty || ''} onChange={(e) => put(list.map((y, j) => (j === i ? { ...y, qty: e.target.value === '' ? '' : Number(e.target.value) } : y)))} />
            <span>個</span>
          </div>
          <button type="button" className="x" aria-label="この行を消す" onClick={() => put(list.filter((_, j) => j !== i))}>×</button>
        </div>
      ))}
      {singles.length
        ? <button type="button" className="btn small" onClick={() => put([...list, { id: singles[0].id, qty: 1 }])}>＋ おにぎりを足す</button>
        : <p className="note">先に単品を登録してください</p>}
    </div>
  );
}

const toForm = (p) => ({
  name: s(p?.name), kind: isSet(p) ? 'set' : 'single', parts: p?.parts || '[]',
  channel: p?.channel || 'event', price: s(p?.price), cookedG: s(p?.cookedG), riceRawG: s(p?.riceRawG),
  materials: p?.materials || '[]', shipping: s(p?.shipping), customerPaysShipping: bool(p?.customerPaysShipping),
  feeRate: s(p?.feeRate), feeFixed: s(p?.feeFixed), kamoProductId: s(p?.kamoProductId), active: p ? bool(p.active) : true,
});

const KINDS = { single: '単品', set: 'セット' };

function ProductForm({ row, ctx, onSave, onCancel }) {
  const [f, setF] = useState(() => toForm(row));
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));
  const u = unitEconomics(f, ctx);
  const kamo = !!f.kamoProductId;
  const singles = ctx.products.filter((p) => !isSet(p) && p.id !== row?.id);
  const ex = expandSet(f, ctx.products, ctx.cookRatio);
  return (
    <form className="fin-form" onSubmit={(e) => { e.preventDefault(); if (f.name.trim()) onSave({ id: row?.id || uid('p'), ...f, name: f.name.trim() }); }}>
      {kamo ? (
        <div className="field"><span className="lab">名前</span><p className="locked">{f.name}<small>カモの小屋の商品（名前・値段・販売中はカモの小屋に合わせます）</small></p></div>
      ) : (
        <div className="field"><label htmlFor="p-name">名前</label>
          <input type="text" id="p-name" required value={f.name} onChange={(e) => set('name')(e.target.value)} placeholder="例：焼きおにぎり（醤油）" /></div>
      )}
      <div className="field"><span className="lab">種類</span>
        <div className="pick">
          {Object.entries(KINDS).map(([k, v]) => (
            <label key={k} className={f.kind === k ? 'on' : ''}>
              <input type="radio" name="p-kind" checked={f.kind === k} onChange={() => set('kind')(k)} />
              <span>{v}</span>
            </label>
          ))}
        </div>
      </div>
      {f.kind === 'set' ? (
        <>
          <PriceField f={f} set={set} lockPrice={kamo} />
          <PartsEditor value={f.parts} onChange={set('parts')} singles={singles} />
          {ex.onigiri > 0 && (
            <p className="note">おにぎり {ex.onigiri}個・生米 {Math.round(num(ex.riceRawG) * 10) / 10}g。米チャレの売上は1セット {yen(ex.komePrice)}（中身の単品の値段の合計）で数えます</p>
          )}
        </>
      ) : (
        <>
          {!hasRice(f) && <p className="note">炊いた重さか生米のg数を入れると、売上から使ったお米の量と原価が出ます</p>}
          <ProductFields f={f} set={set} ctx={ctx} lockPrice={kamo} />
        </>
      )}
      {!kamo && (
        <label className="check"><input type="checkbox" checked={f.active} onChange={(e) => set('active')(e.target.checked)} />販売中（外すと一覧や売上の入力に出なくなります）</label>
      )}
      <UnitBox u={u} />
      <div className="dfoot">
        <button type="button" className="btn" onClick={onCancel}>キャンセル</button>
        <button type="submit" className="btn primary">保存する</button>
      </div>
    </form>
  );
}

function productNote(p, products) {
  if (!isSet(p)) {
    return hasRice(p) ? `生米 ${Math.round(riceG(p) * 10) / 10}g` : <b className="warn">ご飯の量が未入力</b>;
  }
  const parts = setParts(p, products);
  return parts.length ? parts.map((x) => `${x.p.name}×${x.qty}`).join('・') : <b className="warn">中身が未入力</b>;
}

export function ProductsTab({ fin, ctx, api }) {
  const [edit, setEdit] = useState(null);
  const done = (r, msg) => api.save('products', r, msg).then((ok) => ok && setEdit(null));
  const row = (p) => {
    if (edit?.id === p.id) return <li key={p.id} className="form"><ProductForm row={p} ctx={ctx} onCancel={() => setEdit(null)} onSave={(r) => done(r)} /></li>;
    const u = unitEconomics(p, ctx);
    return (
      <li key={p.id} className={bool(p.active) ? '' : 'off'}>
        <button className="row" onClick={() => setEdit(p)}>
          <span className="t">{p.name}<small>{yen(num(p.price))}・{productNote(p, fin.products)}{bool(p.active) ? '' : '・販売していない'}</small></span>
          <span className="n">手残り {yen1(u.keep)}<small>分岐 {u.breakEven != null ? `${u.breakEven.toLocaleString()}個` : '–'}</small></span>
        </button>
        {/* カモの小屋の商品は消しても次の取り込みでまたできるので、消せなくする */}
        {!p.kamoProductId && <ConfirmButton className="x" confirmText="消す？" onConfirm={() => api.remove('products', p.id)}>×</ConfirmButton>}
      </li>
    );
  };
  const singles = fin.products.filter((p) => !isSet(p));
  const sets = fin.products.filter(isSet);
  return (
    <>
      {!ctx.costPerKg && <p className="note">「収穫」と「原価」を入れると、お米の原価と損益分岐が出ます。</p>}
      <p className="note">カモの小屋で米チャレにした商品は、取り込むと自動でここに入ります。単品にはご飯の量、セットには中身のおにぎりを入れてください。</p>
      <h3>単品</h3>
      <ul className="fin-list">{singles.map(row)}</ul>
      <h3>セット</h3>
      {sets.length ? <ul className="fin-list">{sets.map(row)}</ul> : <p className="note">セットはまだありません</p>}
      {edit && !edit.id
        ? <ProductForm ctx={ctx} onCancel={() => setEdit(null)} onSave={(r) => done(r, '商品を追加しました')} />
        : <button className="btn" onClick={() => setEdit({})}>＋ 商品を追加</button>}
      <div className="fin-since">
        <button className="btn small" onClick={api.recalc}>取り込んだ売上を、今の商品の設定で計算し直す</button>
        <small>ご飯の量やセットの中身をあとから直したときに押します</small>
      </div>
    </>
  );
}
