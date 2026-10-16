import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { TYPES, TYPE_SEPARATOR_BEFORE, initialTypesOn, skillId, uid } from './config';
import { call, fetchAll, isDemo, resetDemo, saveDemo } from './api';
import { placeMissing, runForce } from './layout';
import MapView from './components/MapView';
import Panel from './components/Panel';
import { AdminDialog, ConfirmButton, LinkDialog, MemberDialog } from './components/Dialogs';

const ADMIN_STORE = 'komechalle-admin';
const round = (n) => ({ ...n, x: Math.round(n.x), y: Math.round(n.y) });

function LineBar({ typesOn, setTypesOn, edges }) {
  const toggleAll = (on) => setTypesOn(Object.fromEntries(Object.keys(TYPES).map((k) => [k, on])));
  return (
    <nav className="linebar" aria-label="表示する線の種類">
      <span className="lead">線を表示</span>
      {Object.entries(TYPES).map(([k, t]) => (
        <button
          key={k}
          className={'lt' + (k === TYPE_SEPARATOR_BEFORE ? ' sep' : '')}
          aria-pressed={typesOn[k]}
          style={{ '--c': `var(${t.c})` }}
          title={`${t.name}の線を表示`}
          onClick={() => setTypesOn({ ...typesOn, [k]: !typesOn[k] })}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d={t.icon} /></svg>
          <span>{t.name}</span>
          <span className="cnt">{edges.filter((e) => e.type === k).length}</span>
        </button>
      ))}
      <button className="lt-all" onClick={() => toggleAll(true)}>すべて</button>
      <button className="lt-all" onClick={() => toggleAll(false)}>消す</button>
    </nav>
  );
}

export default function App() {
  const [data, setData] = useState({ nodes: [], edges: [] });
  const dataRef = useRef(data);
  dataRef.current = data;
  const [status, setStatus] = useState('loading');
  const [errMsg, setErrMsg] = useState('');
  const [sel, setSel] = useState(null);
  const [mode, setMode] = useState('view');
  const [connectFrom, setConnectFrom] = useState(null);
  const [typesOn, setTypesOn] = useState(initialTypesOn);
  const [query, setQuery] = useState('');
  const [linkPair, setLinkPair] = useState(null);
  const [memberDlg, setMemberDlg] = useState(null); // { id } で編集、{} で新規登録
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminKey, setAdminKey] = useState(() => {
    try { return sessionStorage.getItem(ADMIN_STORE) || ''; } catch { return ''; }
  });
  const [toastMsg, setToastMsg] = useState('');
  const mapRef = useRef(null);
  const [fitKey, setFitKey] = useState(0);
  const [focus, setFocus] = useState(null);
  const busyDrag = useRef(false);

  const byId = useMemo(() => new Map(data.nodes.map((n) => [n.id, n])), [data.nodes]);
  const members = data.nodes.filter((n) => n.kind === 'member');
  const skills = data.nodes.filter((n) => n.kind === 'skill');

  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(''), 2800);
    return () => clearTimeout(t);
  }, [toastMsg]);
  const toast = setToastMsg;

  // デモモードは変更のたびにブラウザへ保存
  useEffect(() => {
    if (isDemo && status === 'ready') saveDemo(data);
  }, [data, status]);

  const savePositions = useCallback((list) => {
    if (isDemo || !list.length) return;
    call('savePositions', { positions: list.map((n) => ({ id: n.id, x: Math.round(n.x), y: Math.round(n.y) })) })
      .catch((e) => toast('配置を保存できませんでした：' + e.message));
  }, [toast]);

  const load = useCallback(async (first) => {
    try {
      const d = await fetchAll();
      const missing = d.nodes.filter((n) => !Number.isFinite(n.x) || !Number.isFinite(n.y)).map((n) => n.id);
      if (missing.length === d.nodes.length) runForce(d.nodes, d.edges);
      else placeMissing(d.nodes, d.edges);
      setData(d);
      setStatus('ready');
      savePositions(d.nodes.filter((n) => missing.includes(n.id)));
      if (first) setFitKey((k) => k + 1);
    } catch (e) {
      if (first) { setStatus('error'); setErrMsg(e.message); }
      else toast('最新の情報を読み込めませんでした');
    }
  }, [savePositions, toast]);

  useEffect(() => { load(true); }, [load]);

  // 他の人の変更を取り込むため、画面に戻ってきたら読み直す
  useEffect(() => {
    if (isDemo) return;
    const onVis = () => document.visibilityState === 'visible' && !busyDrag.current && load(false);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [load]);

  // 画面をすぐ書きかえてから保存し、失敗したら元に戻す
  async function mutate(updater, action, payload, okMsg) {
    const prev = dataRef.current;
    setData(updater);
    try {
      const res = await call(action, payload);
      if (okMsg) toast(okMsg);
      return res;
    } catch (e) {
      setData(prev);
      toast('保存できませんでした：' + e.message);
      return null;
    }
  }

  const setPhoto = (id, photo) =>
    setData((d) => ({ ...d, nodes: d.nodes.map((n) => (n.id === id ? { ...n, photo } : n)) }));

  const select = (id, center) => {
    setSel(id);
    if (center && id) setFocus({ id });
  };

  const startConnect = (from = null) => { setMode('connect'); setConnectFrom(from); };
  const stopConnect = () => { setMode('view'); setConnectFrom(null); };

  async function addEdge({ from, to, type, label = '' }, msg) {
    const dup = dataRef.current.edges.some(
      (e) => e.type === type && ((e.from === from && e.to === to) || (e.from === to && e.to === from)),
    );
    if (dup) { toast('すでにつながっています'); return; }
    const edge = { id: uid('e'), from, to, type, label, auto: false, pending: false };
    await mutate((d) => ({ ...d, edges: [...d.edges, edge] }), 'addEdge', { edge }, msg);
  }

  function onTapNode(id) {
    if (mode !== 'connect') { select(id); return; }
    if (!connectFrom) { setConnectFrom(id); return; }
    if (id === connectFrom) return;
    const a = byId.get(connectFrom);
    const b = byId.get(id);
    const thing = a.kind === 'member' && b.kind !== 'member' ? [a, b] : b.kind === 'member' && a.kind !== 'member' ? [b, a] : null;
    if (thing) {
      const [m, t] = thing;
      const type = t.kind === 'field' ? 'work' : t.kind === 'event' ? 'event' : 'skill';
      addEdge({ from: m.id, to: t.id, type }, `${m.name}さんと${t.name}をつなぎました`);
      stopConnect();
      select(m.id);
      return;
    }
    setLinkPair({ a, b });
  }

  function onTapBackground() {
    if (mode === 'connect') setConnectFrom(null);
    else setSel(null);
  }

  async function submitLink({ from, to, type, label }) {
    setLinkPair(null);
    stopConnect();
    select(from.id);
    await addEdge({ from: from.id, to: to.id, type, label }, `${from.name}と${to.name}をつなぎました`);
  }

  async function submitMember({ fields, photo, skillIds, newSkills, intro }) {
    const d0 = dataRef.current;
    const editId = memberDlg?.id;
    const base = editId ? byId.get(editId) : (() => {
      const c = mapRef.current.center();
      const i = intro && byId.get(intro);
      return i ? { x: i.x + 150, y: i.y + 100 } : { x: c.x + 30, y: c.y - 20 };
    })();
    const id = editId || uid('m');
    const addNodes = [];
    const wanted = new Set(skillIds);
    newSkills.forEach((s, i) => {
      const sid = skillId(s);
      if (!byId.has(sid) && !addNodes.some((n) => n.id === sid))
        addNodes.push(round({ id: sid, kind: 'skill', name: s, x: base.x + 180, y: base.y + 60 + i * 40 }));
      wanted.add(sid);
    });
    const current = d0.edges.filter((e) => e.from === id && e.type === 'skill');
    const removeEdgeIds = current.filter((e) => !wanted.has(e.to)).map((e) => e.id);
    const addEdges = [...wanted]
      .filter((sid) => !current.some((e) => e.to === sid))
      .map((sid) => ({ id: uid('e'), from: id, to: sid, type: 'skill', label: '', auto: true, pending: false }));

    let res;
    if (editId) {
      res = await mutate(
        (d) => ({
          nodes: d.nodes.map((n) => (n.id === id ? { ...n, ...fields, photo: photo || n.photo } : n)).concat(addNodes),
          edges: d.edges.filter((e) => !removeEdgeIds.includes(e.id)).concat(addEdges),
        }),
        'updateMember',
        { id, patch: fields, photo, addNodes, addEdges, removeEdgeIds },
        '保存しました',
      );
    } else {
      if (intro) addEdges.push({ id: uid('e'), from: intro, to: id, type: 'intro', label: '', auto: false, pending: false });
      const node = round({ id, kind: 'member', ...fields, photo: '', x: base.x, y: base.y });
      res = await mutate(
        (d) => ({ nodes: [...d.nodes, { ...node, photo: photo || '' }, ...addNodes], edges: [...d.edges, ...addEdges] }),
        'addMember',
        { nodes: [node, ...addNodes], edges: addEdges, photo: photo ? { id, dataUrl: photo } : null },
        `${fields.name}さんを登録しました`,
      );
    }
    if (!res) return;
    if (res.photo) setPhoto(id, res.photo);
    setMemberDlg(null);
    select(id, true);
  }

  async function submitAdmin(key) {
    try {
      if (!isDemo) await call('checkAdmin', { adminKey: key });
      setAdminKey(key);
      try { sessionStorage.setItem(ADMIN_STORE, key); } catch { /* noop */ }
      setAdminOpen(false);
      toast('運営モードになりました');
    } catch {
      toast('合言葉がちがいます');
    }
  }

  function exitAdmin() {
    setAdminKey('');
    try { sessionStorage.removeItem(ADMIN_STORE); } catch { /* noop */ }
    toast('運営モードを終わりました');
  }

  function autoLayout() {
    const from = new Map(dataRef.current.nodes.map((n) => [n.id, { x: n.x, y: n.y }]));
    const copy = dataRef.current.nodes.map((n) => ({ ...n }));
    runForce(copy, dataRef.current.edges);
    const to = new Map(copy.map((n) => [n.id, { x: n.x, y: n.y }]));
    const finish = () => {
      setFitKey((k) => k + 1);
      savePositions(dataRef.current.nodes);
    };
    const apply = (e) =>
      setData((d) => ({
        ...d,
        nodes: d.nodes.map((n) => {
          const a = from.get(n.id);
          const b = to.get(n.id);
          return a && b ? { ...n, x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e } : n;
        }),
      }));
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { apply(1); finish(); return; }
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / 600);
      apply(1 - Math.pow(1 - p, 3));
      if (p < 1) requestAnimationFrame(step);
      else finish();
    };
    requestAnimationFrame(step);
  }

  function onSearchEnter() {
    const q = query.trim();
    if (!q) return;
    const hit =
      data.nodes.find((n) => (n.kind !== 'skill' || typesOn.skill) && n.name.includes(q)) ||
      members.find((m) => data.edges.some((e) => e.from === m.id && e.type === 'skill' && byId.get(e.to)?.name.includes(q)));
    if (hit) select(hit.id, true);
    else toast(`「${q}」は見つかりませんでした`);
  }

  const editing = memberDlg?.id && byId.get(memberDlg.id);

  return (
    <div className={'app' + (mode === 'connect' ? ' connecting' : '')}>
      <header className="bar">
        <div className="brand">
          <h1><em>米チャレ！</em>つながりマップ</h1>
          {isDemo && <span className="badge">デモ・サンプルデータ</span>}
          {adminKey && <span className="badge admin">運営モード</span>}
        </div>
        <div className="search">
          <input
            id="q" type="text" value={query} placeholder="名前・得意なことで探す" aria-label="メンバーを探す"
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSearchEnter()}
          />
        </div>
        <div className="tools">
          <button className="btn primary" onClick={() => setMemberDlg({})} disabled={status !== 'ready'}>＋ メンバー登録</button>
          <button
            className="btn" aria-pressed={mode === 'connect'} disabled={status !== 'ready'}
            onClick={() => (mode === 'connect' ? stopConnect() : startConnect(sel && byId.get(sel)?.kind === 'member' ? sel : null))}
          >線をつなぐ</button>
          <ConfirmButton className="btn" confirmText="配置がみんな分変わります。もう一度押す" onConfirm={autoLayout}>自動で並べる</ConfirmButton>
          {adminKey
            ? <button className="btn" onClick={exitAdmin}>運営モードを終わる</button>
            : <button className="btn" onClick={() => setAdminOpen(true)}>運営</button>}
          {isDemo && (
            <ConfirmButton className="btn danger" confirmText="もう一度押すと戻ります" onConfirm={() => { resetDemo(); setSel(null); load(true); }}>
              サンプルに戻す
            </ConfirmButton>
          )}
        </div>
      </header>

      <LineBar typesOn={typesOn} setTypesOn={setTypesOn} edges={data.edges} />

      <div className="main">
        <div className="stage-wrap">
          <MapView
            ref={mapRef}
            nodes={data.nodes}
            edges={data.edges}
            sel={sel}
            connectFrom={connectFrom}
            query={query}
            typesOn={typesOn}
            fitKey={fitKey}
            focus={focus}
            onTapNode={onTapNode}
            onTapBackground={onTapBackground}
            onMoveNode={(id, x, y) => {
              busyDrag.current = true;
              setData((d) => ({ ...d, nodes: d.nodes.map((n) => (n.id === id ? { ...n, x, y } : n)) }));
            }}
            onMoveEnd={(id) => {
              busyDrag.current = false;
              const n = dataRef.current.nodes.find((x) => x.id === id);
              if (n) savePositions([n]);
            }}
          />
          {status === 'loading' && <div className="state">読み込み中…</div>}
          {status === 'error' && (
            <div className="state">
              <p>データを読み込めませんでした。<br /><small>{errMsg}</small></p>
              <button className="btn" onClick={() => { setStatus('loading'); load(true); }}>もう一度読み込む</button>
            </div>
          )}
          {mode === 'connect' && (
            <div className="hint">
              <span>{connectFrom ? `「${byId.get(connectFrom)?.name}」とつなぐ相手をタップ` : 'つなぐ元をタップ'}</span>
              <button onClick={stopConnect}>やめる</button>
            </div>
          )}
        </div>
        <Panel
          nodes={data.nodes}
          edges={data.edges}
          sel={sel}
          isAdmin={!!adminKey}
          onGoto={(id) => select(id, true)}
          onClear={() => setSel(null)}
          onStartLink={(id) => startConnect(id)}
          onEdit={(id) => setMemberDlg({ id })}
          onDeleteEdge={(id) => mutate(
            (d) => ({ ...d, edges: d.edges.filter((e) => e.id !== id) }),
            'deleteEdge', { id }, 'つながりを消しました',
          )}
          onDeleteNode={(id) => {
            setSel(null);
            mutate(
              (d) => ({ nodes: d.nodes.filter((n) => n.id !== id), edges: d.edges.filter((e) => e.from !== id && e.to !== id) }),
              'deleteNode', { id, adminKey }, '削除しました',
            );
          }}
        />
      </div>

      {linkPair && (
        <LinkDialog pair={linkPair} onSubmit={submitLink} onClose={() => { setLinkPair(null); stopConnect(); }} />
      )}
      {memberDlg && (
        <MemberDialog
          member={editing || null}
          members={members}
          skills={skills}
          currentSkillIds={editing ? data.edges.filter((e) => e.from === editing.id && e.type === 'skill').map((e) => e.to) : []}
          onSubmit={submitMember}
          onClose={() => setMemberDlg(null)}
          onError={toast}
        />
      )}
      {adminOpen && <AdminDialog onSubmit={submitAdmin} onClose={() => setAdminOpen(false)} />}
      {toastMsg && <div className="toast" role="status">{toastMsg}</div>}
    </div>
  );
}
