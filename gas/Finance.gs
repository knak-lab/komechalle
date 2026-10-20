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
 * 毎日の自動取り込みは setupFinanceTrigger() を一度実行して設定する。
 */

// key はその表で行を見分ける列（シートの1列目）。列は後ろに足していく
const FIN_TABLES = {
  harvest: { sheet: 'fin_harvest', key: 'year', cols: ['year', 'harvestDate', 'fieldIds', 'areaTan', 'momiKg', 'genmaiBags', 'bagKg', 'genmaiKg', 'seimaiRate', 'hakumaiKg', 'memo'] },
  costs: { sheet: 'fin_costs', key: 'id', cols: ['id', 'year', 'category', 'label', 'unitPrice', 'qty', 'amount'] },
  assets: { sheet: 'fin_assets', key: 'id', cols: ['id', 'label', 'price', 'startYear', 'years'] },
  products: {
    sheet: 'fin_products', key: 'id',
    cols: ['id', 'name', 'channel', 'price', 'cookedG', 'riceRawG', 'materials', 'shipping', 'customerPaysShipping', 'feeRate', 'feeFixed', 'kamoProductId', 'active'],
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
    const S = FIN_TABLES.sales;
    const products = readAll_(P.sheet, P.cols);
    const p = products.find((x) => x.id === req.productId);
    if (!p) throw new Error('商品が見つかりません');
    const psh = sheet_(P.sheet, P.cols);
    // 同じカモの小屋の商品は1つの米チャレ商品にだけ紐づける
    products.filter((x) => x.kamoProductId === req.kamoProductId && x.id !== p.id)
      .forEach((x) => updateRow_(psh, P.cols, x.id, { kamoProductId: '' }));
    updateRow_(psh, P.cols, p.id, { kamoProductId: req.kamoProductId });
    const ssh = sheet_(S.sheet, S.cols);
    const unit = finUnit_(p, finCookRatio_());
    let n = 0;
    readAll_(S.sheet, S.cols)
      .filter((s) => s.source === 'kamo' && s.kamoProductId === req.kamoProductId && !s.productId)
      .forEach((s) => {
        updateRow_(ssh, S.cols, s.id, { productId: p.id, channel: p.channel, variableCostAtSale: unit.variable, riceGAtSale: unit.riceG });
        n++;
      });
    return { linked: n };
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

function finUnit_(p, cookRatio) {
  const price = finNum_(p.price) || 0;
  const shipping = finNum_(p.shipping) || 0;
  const pays = price + (String(p.customerPaysShipping).toUpperCase() === 'TRUE' ? shipping : 0);
  const feeRate = finNum_(p.feeRate) || 0;
  const feeFixed = finNum_(p.feeFixed) || 0;
  const fee = feeRate || feeFixed ? pays * feeRate + feeFixed : 0;
  let materials = 0;
  try { (JSON.parse(p.materials || '[]') || []).forEach((m) => { materials += finNum_(m.amount) || 0; }); } catch (_) { /* 壊れていたら0 */ }
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
  const since = harvests.map((h) => h.harvestDate).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)).sort()[0] || '2026-01-01';
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

  // 売上は新しいものだけ追加。変動費は米チャレ側の商品の値を使う（カモの小屋の原価にお米代が入っていると二重になるため）
  const P = FIN_TABLES.products;
  const S = FIN_TABLES.sales;
  const products = readAll_(P.sheet, P.cols);
  const cookRatio = finCookRatio_();
  const ssh = sheet_(S.sheet, S.cols);
  const have = new Set(columnValues_(ssh, 'id', S.cols));
  const events = readAll_('nodes', NODE_COLS).filter((n) => n.kind === 'event');
  const channelOf = (c) => (String(c).toUpperCase() === 'BASE' ? 'online' : 'store');
  const rows = [];
  let unlinked = 0;
  (data.sales || []).forEach((s) => {
    const id = 'kamo:' + s.id;
    if (have.has(id)) return;
    have.add(id);
    const p = products.find((x) => x.kamoProductId && x.kamoProductId === s.productId);
    const unit = p ? finUnit_(p, cookRatio) : null;
    const sameDay = events.filter((e) => e.date === s.date);
    if (!p) unlinked++;
    const qty = Number(s.qty) || 0;
    rows.push({
      id: id, source: 'kamo', date: s.date, year: finYearOf_(s.date, harvests), productId: p ? p.id : '',
      eventId: sameDay.length === 1 ? sameDay[0].id : '', qty: qty, unitPrice: qty ? (Number(s.amount) || 0) / qty : '',
      amount: Number(s.amount) || 0, variableCostAtSale: unit ? unit.variable : '', riceGAtSale: unit ? unit.riceG : '',
      channel: p ? p.channel : channelOf(s.channel), kamoProductId: s.productId, yearManual: '',
    });
  });
  if (rows.length) {
    const start = ssh.getLastRow() + 1;
    ssh.getRange(start, 1, rows.length, S.cols.length).setNumberFormat('@')
      .setValues(rows.map((r) => S.cols.map((c) => toCell_(r[c]))));
  }
  finSetting_('kamoLastSyncAt', now);
  return { added: rows.length, unlinked: unlinked, products: krows.length, syncedAt: now };
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
