/**
 * 米チャレ！つながりマップ API（Google Apps Script）
 *
 * スプレッドシートに紐づけて使う。シートは setup() で作られる。
 *   nodes : 点（メンバー・田んぼ・イベント・得意なこと）
 *   edges : 線（つながり）
 *   log   : 変更履歴
 *
 * スクリプトプロパティ
 *   ADMIN_KEY : 運営モードの合言葉（メンバーや田んぼ・イベントを削除するときに必要）
 */

// 顔写真を保存する Google ドライブのフォルダ（カモの小屋アカウント）
const FOLDER_ID = '1dMlnsiI8zkapdRYEUCwFTC87Cq2SZwSJ';

// 列は後ろに足していく（既存のシートには sheet_() が見出しを足す）
const NODE_COLS = ['id', 'kind', 'name', 'area', 'exp', 'word', 'join', 'role', 'photo', 'size', 'variety', 'date', 'x', 'y', 'updatedAt', 'time', 'place', 'note'];
const EDGE_COLS = ['id', 'from', 'to', 'type', 'label', 'auto', 'pending', 'createdAt'];
const LOG_COLS = ['at', 'action', 'target', 'detail'];

const EDGE_TYPES = ['family', 'partner', 'friend', 'colleague', 'neighbor', 'intro', 'work', 'event', 'mentor', 'other', 'skill'];
const MEMBER_FIELDS = ['name', 'area', 'exp', 'word', 'join', 'role'];
const EVENT_FIELDS = ['name', 'date', 'time', 'place', 'note'];

/* ---------- 入口 ---------- */

function doGet() {
  return json_({ ok: true, nodes: readAll_('nodes', NODE_COLS), edges: readAll_('edges', EDGE_COLS) });
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    const req = JSON.parse(e.postData.contents);
    const fn = ACTIONS[req.action];
    if (!fn) throw new Error('不明な操作です: ' + req.action);
    lock.waitLock(20000);
    const result = fn(req) || {};
    // 配置の保存と合言葉の確認は回数が多いので履歴に残さない
    if (req.action !== 'savePositions' && req.action !== 'checkAdmin') log_(req);
    return json_(Object.assign({ ok: true }, result));
  } catch (err) {
    return json_({ ok: false, error: String((err && err.message) || err) });
  } finally {
    try { lock.releaseLock(); } catch (_) { /* ロック前に失敗したとき */ }
  }
}

/* ---------- 操作 ---------- */

const ACTIONS = {
  checkAdmin(req) {
    checkAdmin_(req);
  },

  // { nodes: [メンバー, 新しい得意なこと...], edges: [...], photo: { id, dataUrl } | null }
  addMember(req) {
    const nodes = (req.nodes || []).map(cleanNode_);
    const member = nodes.find((n) => n.kind === 'member');
    if (!member || !member.name) throw new Error('名前が必要です');
    let photo = '';
    if (req.photo && req.photo.dataUrl) photo = savePhoto_(member.id, req.photo.dataUrl);
    member.photo = photo;
    const sh = sheet_('nodes', NODE_COLS);
    const existing = new Set(columnValues_(sh, 'id', NODE_COLS));
    nodes.filter((n) => !existing.has(n.id)).forEach((n) => appendObj_(sh, NODE_COLS, n));
    appendEdges_(req.edges);
    return { photo };
  },

  // { id, patch, photo, addNodes, addEdges, removeEdgeIds }
  updateMember(req) {
    const sh = sheet_('nodes', NODE_COLS);
    const patch = {};
    MEMBER_FIELDS.forEach((k) => { if (req.patch && k in req.patch) patch[k] = limit_(req.patch[k]); });
    let photo = '';
    if (req.photo) {
      const row = findRow_(sh, req.id);
      if (!row) throw new Error('メンバーが見つかりません');
      trashPhoto_(sh.getRange(row, NODE_COLS.indexOf('photo') + 1).getValue());
      photo = savePhoto_(req.id, req.photo);
      patch.photo = photo;
    }
    patch.updatedAt = new Date().toISOString();
    updateRow_(sh, NODE_COLS, req.id, patch);

    const existing = new Set(columnValues_(sh, 'id', NODE_COLS));
    (req.addNodes || []).map(cleanNode_).filter((n) => n.kind === 'skill' && !existing.has(n.id))
      .forEach((n) => appendObj_(sh, NODE_COLS, n));
    // 得意なことの線だけは、本人の編集で外せる
    const ids = new Set(req.removeEdgeIds || []);
    deleteRows_(sheet_('edges', EDGE_COLS), EDGE_COLS, (e) => ids.has(e.id) && e.type === 'skill' && e.from === req.id);
    appendEdges_((req.addEdges || []).filter((e) => e.type === 'skill' && e.from === req.id));
    return { photo };
  },

  // カレンダーの予定（イベント）。追加と編集は運営だけ。削除は deleteNode
  addEvent(req) {
    checkAdmin_(req);
    const node = cleanNode_(Object.assign({}, req.node, { kind: 'event' }));
    if (!node.name || !/^\d{4}-\d{2}-\d{2}$/.test(node.date)) throw new Error('名前と日付が必要です');
    const sh = sheet_('nodes', NODE_COLS);
    if (findRow_(sh, node.id)) throw new Error('すでにある予定です');
    appendObj_(sh, NODE_COLS, node);
  },

  updateEvent(req) {
    checkAdmin_(req);
    const patch = {};
    EVENT_FIELDS.forEach((k) => { if (req.patch && k in req.patch) patch[k] = limit_(req.patch[k]); });
    if ('date' in patch && !/^\d{4}-\d{2}-\d{2}$/.test(patch.date)) throw new Error('日付が正しくありません');
    patch.updatedAt = new Date().toISOString();
    updateRow_(sheet_('nodes', NODE_COLS), NODE_COLS, req.id, patch);
  },

  addEdge(req) {
    appendEdges_([req.edge]);
  },

  // 線はだれでも消せる（気軽に使えることを優先。消しすぎてもまたつなげばいい）
  deleteEdge(req) {
    deleteRows_(sheet_('edges', EDGE_COLS), EDGE_COLS, (e) => e.id === req.id);
  },

  deleteNode(req) {
    checkAdmin_(req);
    const sh = sheet_('nodes', NODE_COLS);
    const row = findRow_(sh, req.id);
    if (row) trashPhoto_(sh.getRange(row, NODE_COLS.indexOf('photo') + 1).getValue());
    deleteRows_(sh, NODE_COLS, (n) => n.id === req.id);
    deleteRows_(sheet_('edges', EDGE_COLS), EDGE_COLS, (e) => e.from === req.id || e.to === req.id);
  },

  // { positions: [{ id, x, y }] } 位置はまとめて書きかえる
  savePositions(req) {
    const sh = sheet_('nodes', NODE_COLS);
    const n = sh.getLastRow() - 1;
    if (n < 1) return;
    const ids = sh.getRange(2, 1, n, 1).getValues().map((r) => String(r[0]));
    const xi = NODE_COLS.indexOf('x') + 1;
    const xy = sh.getRange(2, xi, n, 2).getValues();
    (req.positions || []).forEach((p) => {
      const i = ids.indexOf(String(p.id));
      if (i >= 0 && isFinite(p.x) && isFinite(p.y)) xy[i] = [String(Math.round(p.x)), String(Math.round(p.y))];
    });
    sh.getRange(2, xi, n, 2).setNumberFormat('@').setValues(xy);
  },
};

/* ---------- 準備（最初に1回だけ実行） ---------- */

function setup() {
  sheet_('nodes', NODE_COLS);
  sheet_('edges', EDGE_COLS);
  sheet_('log', LOG_COLS);
  DriveApp.getFolderById(FOLDER_ID); // フォルダへのアクセス許可をここで求める
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty('ADMIN_KEY')) {
    props.setProperty('ADMIN_KEY', 'kome-' + Math.random().toString(36).slice(2, 8));
  }
  Logger.log('準備できました。運営の合言葉: ' + props.getProperty('ADMIN_KEY'));
}

/* ---------- 内部 ---------- */

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function checkAdmin_(req) {
  const key = PropertiesService.getScriptProperties().getProperty('ADMIN_KEY');
  if (!key || req.adminKey !== key) throw new Error('運営の合言葉がちがいます');
}

function sheet_(name, cols) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    // 「2025-04」などが日付に変換されないよう、すべて書式なしテキストにする
    sh.getRange(1, 1, sh.getMaxRows(), cols.length).setNumberFormat('@');
    sh.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  // あとから足した列の見出しを足す
  const width = sh.getLastColumn();
  const head = width ? sh.getRange(1, 1, 1, width).getValues()[0].map(String) : [];
  if (head.length < cols.length && cols.slice(0, head.length).every((c, i) => c === head[i])) {
    const add = cols.slice(head.length);
    sh.getRange(1, head.length + 1, sh.getMaxRows(), add.length).setNumberFormat('@');
    sh.getRange(1, head.length + 1, 1, add.length).setValues([add]).setFontWeight('bold');
  }
  return sh;
}

function readAll_(name, cols) {
  const sh = sheet_(name, cols);
  const values = sh.getDataRange().getDisplayValues();
  const head = values.shift() || [];
  return values
    .filter((r) => r[0] !== '')
    .map((r) => {
      const o = {};
      head.forEach((h, i) => { if (h) o[h] = r[i]; });
      return o;
    });
}

function toCell_(v) {
  return v == null ? '' : String(v);
}

function appendObj_(sh, cols, obj) {
  const row = sh.getLastRow() + 1;
  sh.getRange(row, 1, 1, cols.length).setNumberFormat('@').setValues([cols.map((c) => toCell_(obj[c]))]);
}

function columnValues_(sh, col, cols) {
  const n = sh.getLastRow() - 1;
  if (n < 1) return [];
  return sh.getRange(2, cols.indexOf(col) + 1, n, 1).getValues().map((r) => String(r[0]));
}

function findRow_(sh, id) {
  const n = sh.getLastRow() - 1;
  if (n < 1) return 0;
  const i = sh.getRange(2, 1, n, 1).getValues().findIndex((r) => String(r[0]) === String(id));
  return i < 0 ? 0 : i + 2;
}

function updateRow_(sh, cols, id, patch) {
  const row = findRow_(sh, id);
  if (!row) throw new Error('見つかりません: ' + id);
  const range = sh.getRange(row, 1, 1, cols.length);
  const values = range.getValues()[0];
  Object.keys(patch).forEach((k) => {
    const i = cols.indexOf(k);
    if (i >= 0) values[i] = toCell_(patch[k]);
  });
  range.setNumberFormat('@').setValues([values]);
}

// 下の行から消すので、行番号がずれない
function deleteRows_(sh, cols, match) {
  const values = sh.getDataRange().getValues();
  for (let i = values.length - 1; i >= 1; i--) {
    const o = {};
    cols.forEach((c, j) => { o[c] = String(values[i][j]); });
    if (match(o)) sh.deleteRow(i + 1);
  }
}

function appendEdges_(edges) {
  const sh = sheet_('edges', EDGE_COLS);
  const now = new Date().toISOString();
  (edges || []).forEach((e) => {
    if (!e || !e.id || !e.from || !e.to) throw new Error('つながりの情報が足りません');
    if (EDGE_TYPES.indexOf(e.type) < 0) throw new Error('不明なつながりの種類です: ' + e.type);
    appendObj_(sh, EDGE_COLS, {
      id: e.id, from: e.from, to: e.to, type: e.type, label: limit_(e.label, 20),
      auto: !!e.auto, pending: false, createdAt: now, // 承認は使わないので pending は常に false
    });
  });
}

function cleanNode_(n) {
  const kinds = ['member', 'field', 'event', 'skill'];
  if (!n || !n.id || kinds.indexOf(n.kind) < 0) throw new Error('点の情報が正しくありません');
  const o = {};
  NODE_COLS.forEach((c) => { o[c] = limit_(n[c]); });
  o.updatedAt = new Date().toISOString();
  return o;
}

function limit_(v, max) {
  return v == null ? '' : String(v).slice(0, max || 200);
}

function savePhoto_(id, dataUrl) {
  const m = String(dataUrl).match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
  if (!m) throw new Error('写真の形式が正しくありません');
  const blob = Utilities.newBlob(Utilities.base64Decode(m[2]), m[1], id + '_' + Date.now() + '.jpg');
  if (blob.getBytes().length > 2 * 1024 * 1024) throw new Error('写真が大きすぎます');
  const file = DriveApp.getFolderById(FOLDER_ID).createFile(blob);
  // アプリに表示するため「リンクを知っている全員が閲覧可」にする
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return 'https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w600';
}

// 差しかえ前の写真はゴミ箱へ（30日間は復元できる）
function trashPhoto_(url) {
  const m = String(url || '').match(/[?&]id=([\w-]+)/);
  if (!m) return;
  try { DriveApp.getFileById(m[1]).setTrashed(true); } catch (_) { /* すでにない */ }
}

function log_(req) {
  const detail = Object.assign({}, req);
  delete detail.adminKey;
  if (detail.photo) detail.photo = '(写真)';
  appendObj_(sheet_('log', LOG_COLS), LOG_COLS, {
    at: new Date().toISOString(),
    action: req.action,
    target: req.id || (req.edge && req.edge.id) || (req.nodes && req.nodes[0] && req.nodes[0].id) || '',
    detail: JSON.stringify(detail).slice(0, 1000),
  });
}
