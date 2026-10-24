/**
 * 米チャレ！ 収支管理（収穫・原価・商品・売上）
 *
 * お金の情報なので、読み書きはすべて運営モード（ADMIN_KEY）だけ。
 * 公開の ?action=all には含めない。
 *
 * スクリプトプロパティ
 *   KAMO_API_URL   : カモの小屋の GAS ウェブアプリの URL（末尾 /exec）
 *   KAMO_API_TOKEN : カモの小屋の API_TOKEN
 *
 * fin_settings の kamoSince（YYYY-MM-DD）より前の売上は取り込まない（未設定ならいちばん古い収穫日から）
 *
 * 毎日の自動取り込みは setupFinanceTrigger() を一度実行して設定する。
 */

// key はその表で行を見分ける列（シートの1列目）。列は後ろに足していく
const FIN_TABLES = {
  harvest: { sheet: 'fin_harvest', key: 'year', cols: ['year', 'harvestDate', 'fieldIds', 'areaTan', 'momiKg', 'genmaiBags', 'bagKg', 'genmaiKg', 'seimaiRate', 'hakumaiKg', 'memo'] },
  costs: { sheet: 'fin_costs', key: 'id', cols: ['id', 'year', 'category', 'label', 'unitPrice', 'qty', 'amount'] },
  assets: { sheet: 'fin_assets', key: 'id', cols: ['id', 'label', 'price', 'startYear', 'years'] },
  products: {
    sheet: 'fin_products', key: 'id',
    cols: ['id', 'name', 'channel', 'price', 'cookedG', 'riceRawG', 'materials', 'shipping', 'customerPaysShipping', 'feeRate', 'feeFixed', 'kamoProductId', 'active', 'setOther', 'kind', 'parts'],
    // kind: single（単品）/ set（セット）。parts: セットの中身 [{ id: 単品の商品id, qty }]。setOther は使わなくなった列
  },
  sales: {
    sheet: 'fin_sales', key: 'id',
    // kamoProductId: 取り込み分のカモの小屋の商品（未紐づけを後から紐づけるため） / yearManual: 年度を手で変えたか
    cols: ['id', 'source', 'date', 'year', 'productId', 'eventId', 'qty', 'unitPrice', 'amount', 'variableCostAtSale', 'riceGAtSale', 'channel', 'kamoProductId', 'yearManual'],
  },
  settings: { sheet: 'fin_settings', key: 'key', cols: ['key', 'value'] },
  kamoProducts: { sheet: 'fin_kamo_products', key: 'id', cols: ['id', 'name', 'price', 'active', 'syncedAt'] },
};
// 画面から直接保存できる表（カモの小屋の写しは取り込みだけが書く）
const FIN_EDITABLE = ['harvest', 'costs', 'assets', 'products', 'sales', 'settings'];
const DEFAULT_COOK_RATIO = 2.2;

const FIN_ACTIONS = {
  finance(req) {
    checkAdmin_(req);
    return { fin: readFinance_() };
  },

  // { table, row } キーが同じ行があれば上書き、なければ追加
  finSave(req) {
    checkAdmin_(req);
    const t = finTable_(req.table);
    const row = req.row || {};
    const key = String(row[t.key] == null ? '' : row[t.key]);
    if (!key) throw new Error('キーがありません');
    const sh = sheet_(t.sheet, t.cols);
    let allowed = t.cols;
    if (req.table === 'sales') {
      // 取り込んだ売上は、金額・数量はカモの小屋のまま。年度とイベントだけ変えられる
      const old = readAll_(t.sheet, t.cols).find((s) => s.id === key);
      if (old && old.source === 'kamo') allowed = ['year', 'yearManual', 'eventId'];
      else if (row.source === 'kamo' || key.indexOf('kamo:') === 0) throw new Error('取り込んだ売上は手で追加できません');
    }
    const clean = {};
    allowed.forEach((c) => { if (c in row) clean[c] = limit_(row[c], 2000); });
    if (findRow_(sh, key)) updateRow_(sh, t.cols, key, clean);
    else appendObj_(sh, t.cols, clean);
    // ご飯の量が入ったら、まだ空いている取り込み売上の米の量・変動費を埋める
    if (req.table === 'products') finFillKamoSales_();
  },

  finDelete(req) {
    checkAdmin_(req);
    const t = finTable_(req.table);
    deleteRows_(sheet_(t.sheet, t.cols), t.cols, (r) => r[t.key] === String(req.id) && !(req.table === 'sales' && r.source === 'kamo'));
  },

  // カモの小屋の商品を米チャレの商品に紐づけ、未紐づけの取り込み売上もまとめて紐づける
  finLinkKamo(req) {
    checkAdmin_(req);
    const P = FIN_TABLES.products;
    const products = readAll_(P.sheet, P.cols);
    const p = products.find((x) => x.id === req.productId);
    if (!p) throw new Error('商品が見つかりません');
    const psh = sheet_(P.sheet, P.cols);
    // 同じカモの小屋の商品は1つの米チャレ商品にだけ紐づける
    products.filter((x) => x.kamoProductId === req.kamoProductId && x.id !== p.id)
      .forEach((x) => updateRow_(psh, P.cols, x.id, { kamoProductId: '' }));
    updateRow_(psh, P.cols, p.id, { kamoProductId: req.kamoProductId });
    return { linked: finFillKamoSales_() };
  },

  // 取り込んだ売上の米の量・変動費を、今の商品の設定で計算し直す
  finRecalcKamo(req) {
    checkAdmin_(req);
    return { updated: finFillKamoSales_(true) };
  },

  syncFromKamo(req) {
    checkAdmin_(req);
    return syncFromKamo_();
  },
};

/* ---------- 読み込み ---------- */

function readFinance_() {
  const out = {};
  Object.keys(FIN_TABLES).forEach((k) => {
    const t = FIN_TABLES[k];
    out[k] = readAll_(t.sheet, t.cols);
  });
  const settings = { cookRatio: String(DEFAULT_COOK_RATIO) };
  out.settings.forEach((r) => { settings[r.key] = r.value; });
  out.settings = settings;
  return out;
}

function finTable_(name) {
  if (FIN_EDITABLE.indexOf(name) < 0) throw new Error('保存できない表です: ' + name);
  return FIN_TABLES[name];
}

function finSetting_(key, value) {
  const t = FIN_TABLES.settings;
  const sh = sheet_(t.sheet, t.cols);
  if (findRow_(sh, key)) updateRow_(sh, t.cols, key, { value: value });
  else appendObj_(sh, t.cols, { key: key, value: value });
}

function finCookRatio_() {
  const r = readAll_(FIN_TABLES.settings.sheet, FIN_TABLES.settings.cols).find((x) => x.key === 'cookRatio');
  return Number(r && r.value) || DEFAULT_COOK_RATIO;
}

/* ---------- 1単位の変動費と生米（src/finance/calc.js の unitEconomics と同じ式） ---------- */

function finNum_(v) {
  return v === '' || v == null || !isFinite(Number(v)) ? null : Number(v);
}

/* ---------- 単品とセット（src/finance/calc.js の expandSet と同じ考え方） ---------- */

function finIsSet_(p) {
  return !!p && p.kind === 'set';
}

function finParts_(p, products) {
  let a = [];
  try { a = JSON.parse(p.parts || '[]') || []; } catch (_) { /* 壊れていたら空 */ }
  return a
    .map((x) => ({ p: products.find((q) => q.id === String(x && x.id) && !finIsSet_(q)), qty: finNum_(x && x.qty) || 0 }))
    .filter((x) => x.p && x.qty > 0);
}

function finHasRice_(p, products) {
  if (!finIsSet_(p)) return finNum_(p.riceRawG) != null || finNum_(p.cookedG) != null;
  const parts = finParts_(p, products || []);
  return parts.length > 0 && parts.every((x) => finHasRice_(x.p));
}

function finMaterials_(p) {
  let m = 0;
  try { (JSON.parse(p.materials || '[]') || []).forEach((x) => { m += finNum_(x.amount) || 0; }); } catch (_) { /* 壊れていたら0 */ }
  return m;
}

// セットはお米と資材に中身の単品の分を足す
function finUnitOf_(p, products, cookRatio) {
  const u = finUnit_(p, cookRatio);
  if (!finIsSet_(p)) return u;
  let riceG = 0;
  let variable = u.variable;
  finParts_(p, products).forEach((x) => {
    riceG += finUnit_(x.p, cookRatio).riceG * x.qty;
    variable += finMaterials_(x.p) * x.qty;
  });
  return { variable: variable, riceG: riceG };
}

// 名前からセットかどうかを見当をつける（あとで画面で直せる。store.js の guessKind と同じ）
function finGuessKind_(name) {
  return /セット|＆|&|ランチ|モーニング/.test(String(name)) ? 'set' : 'single';
}

function finUnit_(p, cookRatio) {
  const price = finNum_(p.price) || 0;
  const shipping = finNum_(p.shipping) || 0;
  const pays = price + (String(p.customerPaysShipping).toUpperCase() === 'TRUE' ? shipping : 0);
  const feeRate = finNum_(p.feeRate) || 0;
  const feeFixed = finNum_(p.feeFixed) || 0;
  const fee = feeRate || feeFixed ? pays * feeRate + feeFixed : 0;
  const materials = finMaterials_(p);
  const raw = finNum_(p.riceRawG);
  const cooked = finNum_(p.cookedG);
  return {
    variable: materials + shipping + fee,
    riceG: raw != null ? raw : cooked != null ? cooked / (cookRatio || DEFAULT_COOK_RATIO) : 0,
  };
}

// その年度の収穫日以降、翌年度の収穫日より前 = その年度（calc.js の yearOfDate と同じ）
function finYearOf_(date, harvests) {
  const hs = harvests.filter((h) => h.year && /^\d{4}-\d{2}-\d{2}$/.test(h.harvestDate))
    .sort((a, b) => (a.harvestDate < b.harvestDate ? -1 : 1));
  let y = null;
  hs.forEach((h) => { if (date >= h.harvestDate) y = Number(h.year); });
  if (y != null) return y;
  const cal = Number(String(date).slice(0, 4));
  if (!hs.length) return cal;
  return String(date).slice(5) < hs[0].harvestDate.slice(5) ? cal - 1 : cal;
}

/* ---------- カモの小屋からの取り込み ---------- */

// 何度実行しても同じ結果になる（売上は kamo:<id> で重複しないように追加）
function syncFromKamo_() {
  const props = PropertiesService.getScriptProperties();
  const url = props.getProperty('KAMO_API_URL');
  const token = props.getProperty('KAMO_API_TOKEN') || '';
  if (!url) throw new Error('スクリプトプロパティ KAMO_API_URL が設定されていません');

  const H = FIN_TABLES.harvest;
  const harvests = readAll_(H.sheet, H.cols);
  // 取り込む売上の開始日：設定（kamoSince）があればそれ、なければいちばん古い収穫日
  const setting = readAll_(FIN_TABLES.settings.sheet, FIN_TABLES.settings.cols).find((x) => x.key === 'kamoSince');
  const since = (setting && /^\d{4}-\d{2}-\d{2}$/.test(setting.value) ? setting.value : '')
    || harvests.map((h) => h.harvestDate).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort()[0] || '2026-01-01';
  const res = UrlFetchApp.fetch(url + '?action=komechalleExport&since=' + since + '&token=' + encodeURIComponent(token), { muteHttpExceptions: true, followRedirects: true });
  let data;
  try { data = JSON.parse(res.getContentText()); } catch (_) { throw new Error('カモの小屋から読み込めませんでした（HTTP ' + res.getResponseCode() + '）'); }
  if (!data.ok) throw new Error('カモの小屋: ' + (data.error || '読み込みに失敗しました'));
  const now = new Date().toISOString();

  // 商品マスタの写しは上書き
  const K = FIN_TABLES.kamoProducts;
  const ksh = sheet_(K.sheet, K.cols);
  if (ksh.getLastRow() > 1) ksh.getRange(2, 1, ksh.getLastRow() - 1, K.cols.length).clearContent();
  const krows = (data.products || []).map((p) => [p.id, p.name, p.price, p.active, now].map(toCell_));
  if (krows.length) ksh.getRange(2, 1, krows.length, K.cols.length).setNumberFormat('@').setValues(krows);

  const created = finSyncKamoProducts_(data.products || []);

  // 売上は新しいものだけ追加。商品と変動費はあとの finFillKamoSales_ でつける
  const S = FIN_TABLES.sales;
  const ssh = sheet_(S.sheet, S.cols);
  // 開始日を後ろにずらしたときのため、開始日より前の取り込み分は消す（手入力の売上は消さない）
  deleteRows_(ssh, S.cols, (r) => r.source === 'kamo' && r.date < since);
  const have = new Set(columnValues_(ssh, 'id', S.cols));
  const events = readAll_('nodes', NODE_COLS).filter((n) => n.kind === 'event');
  const channelOf = (c) => (String(c).toUpperCase() === 'BASE' ? 'online' : 'store');
  const rows = [];
  (data.sales || []).forEach((s) => {
    const id = 'kamo:' + s.id;
    if (have.has(id)) return;
    have.add(id);
    const sameDay = events.filter((e) => e.date === s.date);
    const qty = Number(s.qty) || 0;
    rows.push({
      id: id, source: 'kamo', date: s.date, year: finYearOf_(s.date, harvests), productId: '',
      eventId: sameDay.length === 1 ? sameDay[0].id : '', qty: qty, unitPrice: qty ? (Number(s.amount) || 0) / qty : '',
      amount: Number(s.amount) || 0, variableCostAtSale: '', riceGAtSale: '',
      channel: channelOf(s.channel), kamoProductId: s.productId, yearManual: '',
    });
  });
  if (rows.length) {
    const start = ssh.getLastRow() + 1;
    ssh.getRange(start, 1, rows.length, S.cols.length).setNumberFormat('@')
      .setValues(rows.map((r) => S.cols.map((c) => toCell_(r[c]))));
  }
  finFillKamoSales_();
  const unlinked = readAll_(S.sheet, S.cols).filter((r) => r.source === 'kamo' && !r.productId).length;
  finSetting_('kamoLastSyncAt', now);
  return { added: rows.length, created: created, unlinked: unlinked, products: krows.length, syncedAt: now };
}

// カモの小屋の商品ごとに米チャレの商品を1つ作る。名前・値段・販売中はカモの小屋に合わせる（store.js の applyKamoProducts と同じ）
function finSyncKamoProducts_(kamoProducts) {
  const P = FIN_TABLES.products;
  const sh = sheet_(P.sheet, P.cols);
  const products = readAll_(P.sheet, P.cols);
  let created = 0;
  kamoProducts.forEach((k) => {
    const kid = String(k.id);
    const sync = { name: String(k.name), price: toCell_(k.price), active: toCell_(k.active !== false) };
    const p = products.find((x) => x.kamoProductId === kid);
    if (!p) {
      appendObj_(sh, P.cols, Object.assign({ id: 'kamo:' + kid, channel: 'store', kind: finGuessKind_(k.name), parts: '[]', materials: '[]', customerPaysShipping: 'false', kamoProductId: kid }, sync));
      created++;
    } else if (Object.keys(sync).some((c) => String(p[c]).toUpperCase() !== sync[c].toUpperCase())) {
      updateRow_(sh, P.cols, p.id, sync);
    }
  });
  return created;
}

// 取り込んだ売上に商品をつけ、ご飯の量が入った商品なら米の量と変動費を記録する（記録済みは変えない。store.js の fillKamoSales と同じ）
// redo: 記録済みのものも、今の商品の設定で計算し直す
function finFillKamoSales_(redo) {
  const P = FIN_TABLES.products;
  const S = FIN_TABLES.sales;
  const products = readAll_(P.sheet, P.cols);
  const sh = sheet_(S.sheet, S.cols);
  if (sh.getLastRow() < 2) return 0;
  const range = sh.getRange(2, 1, sh.getLastRow() - 1, S.cols.length);
  const values = range.getDisplayValues();
  const c = {};
  S.cols.forEach((k, i) => { c[k] = i; });
  const cookRatio = finCookRatio_();
  let n = 0;
  values.forEach((r) => {
    if (r[c.source] !== 'kamo') return;
    const p = r[c.productId]
      ? products.find((x) => x.id === r[c.productId])
      : products.find((x) => x.kamoProductId && x.kamoProductId === r[c.kamoProductId]);
    if (!p) return;
    let changed = false;
    if (!r[c.productId]) { r[c.productId] = p.id; changed = true; }
    if (redo && (r[c.riceGAtSale] !== '' || r[c.variableCostAtSale] !== '')) {
      r[c.riceGAtSale] = '';
      r[c.variableCostAtSale] = '';
      changed = true;
    }
    if (r[c.riceGAtSale] === '' && finHasRice_(p, products)) {
      const u = finUnitOf_(p, products, cookRatio);
      r[c.variableCostAtSale] = String(u.variable);
      r[c.riceGAtSale] = String(u.riceG);
      changed = true;
    }
    if (changed) n++;
  });
  if (n) range.setNumberFormat('@').setValues(values);
  return n;
}

/* ---------- 毎日の自動取り込み ---------- */

// エディタで一度実行する（権限の確認が出たら許可）。毎朝5時ごろに取り込む
function setupFinanceTrigger() {
  ScriptApp.getProjectTriggers()
    .filter((t) => t.getHandlerFunction() === 'dailyKamoSync')
    .forEach((t) => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('dailyKamoSync').timeBased().everyDays(1).atHour(5).create();
  Logger.log('毎日の取り込みを設定しました');
}

function dailyKamoSync() {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const r = syncFromKamo_();
    log_({ action: 'syncFromKamo', id: 'trigger', added: r.added, unlinked: r.unlinked });
  } finally {
    lock.releaseLock();
  }
}
