import { TYPES, avColor, nm, ym, ymd } from '../config';
import { ConfirmButton } from './Dialogs';

export function Avatar({ n, size }) {
  if (n.photo) return <img className="av" src={n.photo} alt="" style={{ width: size, height: size }} />;
  return (
    <span className="av" style={{ width: size, height: size, fontSize: Math.round(size * 0.42), background: `var(${avColor(n.id)})` }}>
      {n.name[0]}
    </span>
  );
}

const ORDER = Object.fromEntries(Object.keys(TYPES).map((k, i) => [k, i]));

function ConnRow({ e, me, byId, onGoto, onDelete }) {
  const meNode = byId.get(me);
  const o = byId.get(e.from === me ? e.to : e.from);
  if (!o) return null;
  const out = e.from === me;
  const on = <button className="link" onClick={() => onGoto(o.id)}>{nm(o)}</button>;
  let txt;
  switch (e.type) {
    case 'intro': txt = out ? <>{on}を紹介した</> : <>{on}の紹介で参加</>; break;
    case 'mentor': txt = out ? <>{on}に教えている</> : <>{on}に教わっている</>; break;
    case 'other': txt = <>{on}と「{e.label || 'その他'}」</>; break;
    case 'work': txt = meNode.kind === 'member' ? <>{on}で作業</> : <>{on}が作業</>; break;
    case 'event': txt = meNode.kind === 'member' ? <>{on}に参加</> : <>{on}が参加</>; break;
    case 'skill': txt = on; break;
    default: txt = <>{on}と{TYPES[e.type].name}</>;
  }
  const sub = e.label && e.type !== 'other' ? e.label : e.auto ? '記録から自動' : '';
  return (
    <li>
      <span className={'dot' + (e.auto ? ' auto' : '')} style={{ background: `var(${TYPES[e.type].c})` }} />
      <span className="ctext">{txt}{sub && <span className="sub">{sub}</span>}</span>
      <button className="x" onClick={() => onDelete(e.id)} aria-label="このつながりを消す" title="このつながりを消す">×</button>
    </li>
  );
}

function Overview({ nodes, edges, byId, onGoto }) {
  const members = nodes.filter((n) => n.kind === 'member');
  const isMember = (id) => byId.get(id)?.kind === 'member';
  const mm = edges.filter((e) => !e.auto && isMember(e.from) && isMember(e.to)).length;
  const places = nodes.filter((n) => n.kind === 'field' || n.kind === 'event').length;
  const deg = members
    .map((m) => [m, edges.filter((e) => (e.from === m.id || e.to === m.id) && e.type !== 'skill').length])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  return (
    <>
      <h2>みんなのつながり</h2>
      <div className="stats">
        <div className="stat"><b>{members.length}</b><span>メンバー</span></div>
        <div className="stat"><b>{mm}</b><span>人と人の線</span></div>
        <div className="stat"><b>{places}</b><span>田んぼ・イベント</span></div>
      </div>
      {deg.length > 0 && (
        <>
          <h3>つながりが多い人</h3>
          <ol className="rank">
            {deg.map(([m, c]) => (
              <li key={m.id}>
                <Avatar n={m} size={44} />
                <button className="link" onClick={() => onGoto(m.id)}>{m.name}</button>
                <span className="n">{c}本</span>
              </li>
            ))}
          </ol>
        </>
      )}
      <h3>使い方</h3>
      <ul className="tips">
        <li>顔をタップすると、その人のつながりが線で出ます</li>
        <li>上のアイコンを押すと、その種類の線をみんなの分まとめて表示します</li>
        <li>「線をつなぐ」で、2人をタップして関係を追加できます</li>
        <li>顔はドラッグで動かせます。配置はみんなで共有されます</li>
      </ul>
    </>
  );
}

export default function Panel({ nodes, edges, sel, isAdmin, onGoto, onClear, onDeleteEdge, onStartLink, onEdit, onDeleteNode }) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const n = sel && byId.get(sel);
  if (!n) return <aside className="panel overview"><Overview nodes={nodes} edges={edges} byId={byId} onGoto={onGoto} /></aside>;

  const mine = edges.filter((e) => e.from === n.id || e.to === n.id);
  const rows = mine
    .filter((e) => n.kind !== 'member' || e.type !== 'skill')
    .sort((a, b) => ORDER[a.type] - ORDER[b.type]);
  const rowProps = { me: n.id, byId, onGoto, onDelete: onDeleteEdge };
  const adminDelete = isAdmin && (
    <ConfirmButton className="btn small danger" confirmText="もう一度押すと削除します" onConfirm={() => onDeleteNode(n.id)}>
      {n.kind === 'member' ? 'このメンバーを削除' : '削除'}
    </ConfirmButton>
  );

  if (n.kind === 'member') {
    const skills = mine.filter((e) => e.from === n.id && e.type === 'skill').map((e) => byId.get(e.to)).filter(Boolean);
    return (
      <aside className="panel">
        <div className="phead">
          <Avatar n={n} size={160} />
          <div>
            <h2>{n.name}{n.role && <span className="rolepill">{n.role}</span>}</h2>
            <p className="meta">{n.area || '地域未登録'}{n.join && `・${ym(n.join)}から参加`}</p>
          </div>
        </div>
        {n.word && <p className="word">「{n.word}」</p>}
        <dl className="facts">
          <dt>農業経験</dt>
          <dd><span className="exp">{n.exp || 'なし'}</span></dd>
          <dt>得意なこと</dt>
          <dd>
            {skills.length
              ? skills.map((s) => <button key={s.id} className="tag" onClick={() => onGoto(s.id)}>#{s.name}</button>)
              : <span className="tag">未登録</span>}
          </dd>
        </dl>
        <div className="actions">
          <button className="btn small primary" onClick={() => onStartLink(n.id)}>この人と線をつなぐ</button>
          <button className="btn small" onClick={() => onEdit(n.id)}>プロフィールを編集</button>
          <button className="btn small" onClick={onClear}>閉じる</button>
          {adminDelete}
        </div>
        <h3>つながり {rows.length}</h3>
        <ul className="conn">
          {rows.length ? rows.map((e) => <ConnRow key={e.id} e={e} {...rowProps} />) : <li>まだつながりがありません</li>}
        </ul>
      </aside>
    );
  }

  const people = mine.map((e) => byId.get(e.from === n.id ? e.to : e.from)).filter((p) => p && p.kind === 'member');
  const lab = n.kind === 'field' ? '作業したメンバー' : n.kind === 'event' ? '参加したメンバー' : 'この得意をもつメンバー';
  return (
    <aside className="panel">
      <h2>{n.kind === 'skill' && '#'}{n.name}</h2>
      <p className="meta">
        {n.kind === 'field' && `田んぼ・${n.size || ''}・${n.variety || ''}`}
        {n.kind === 'event' && ['イベント', ymd(n.date), n.time, n.place].filter(Boolean).join('・')}
        {n.kind === 'skill' && '得意なこと'}
      </p>
      <h3>{lab} {people.length}人</h3>
      <div className="people">
        {people.map((p) => (
          <button key={p.id} className="person" onClick={() => onGoto(p.id)}>
            <Avatar n={p} size={60} />
            <span>{p.name}</span>
          </button>
        ))}
      </div>
      {n.kind !== 'skill' && (
        <>
          <h3>つながり</h3>
          <ul className="conn">{rows.map((e) => <ConnRow key={e.id} e={e} {...rowProps} />)}</ul>
        </>
      )}
      <div className="actions">
        <button className="btn small" onClick={onClear}>閉じる</button>
        {adminDelete}
      </div>
    </aside>
  );
}
