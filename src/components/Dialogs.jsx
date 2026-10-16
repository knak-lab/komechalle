import { useEffect, useRef, useState } from 'react';
import { EXPERIENCES, TYPES, thisMonth } from '../config';
import { readPhoto } from '../photo';

function Overlay({ onClose, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      {children}
    </div>
  );
}

export function LinkDialog({ pair, onSubmit, onClose }) {
  const [ab, setAb] = useState(pair);
  const [type, setType] = useState('friend');
  const [label, setLabel] = useState('');
  const t = TYPES[type];
  return (
    <Overlay onClose={onClose}>
      <form className="dialog" onSubmit={(e) => { e.preventDefault(); onSubmit({ from: ab.a, to: ab.b, type, label: label.trim() }); }}>
        <h2>{pair.a.name} と {pair.b.name} をつなぐ</h2>
        <p className="lead">どんな関係ですか？</p>
        <div className="field">
          <div className="types">
            {Object.entries(TYPES).filter(([, t]) => t.manual).map(([k, t]) => (
              <label key={k}>
                <input type="radio" name="ltype" value={k} checked={type === k} onChange={() => setType(k)} autoFocus={type === k} />
                <span className="dot" style={{ background: `var(${t.c})` }} />
                {t.name}
              </label>
            ))}
          </div>
        </div>
        {t.dir && (
          <div className="field">
            <div className="dir">
              <span><b>{ab.a.name}</b>（{t.dir[0]}）→ <b>{ab.b.name}</b>（{t.dir[1]}）</span>
              <button type="button" className="btn small" onClick={() => setAb({ a: ab.b, b: ab.a })}>向きを入れかえ</button>
            </div>
          </div>
        )}
        <div className="field">
          <label htmlFor="link-label">ひとこと（任意）</label>
          <input type="text" id="link-label" maxLength={20} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="例：コンバインの操作、同じ高校" />
        </div>
        <div className="dfoot">
          <button type="button" className="btn" onClick={onClose}>キャンセル</button>
          <button type="submit" className="btn primary">つなぐ</button>
        </div>
      </form>
    </Overlay>
  );
}

// メンバー登録と、プロフィール編集の両方に使う
export function MemberDialog({ member, members, skills, currentSkillIds = [], onSubmit, onClose, onError }) {
  const editing = !!member;
  const [f, setF] = useState({
    name: member?.name || '',
    area: member?.area || '',
    word: member?.word || '',
    exp: member?.exp || EXPERIENCES[0],
    join: member?.join || thisMonth(),
    role: member?.role || '',
  });
  const [photo, setPhoto] = useState(null); // 新しく選んだ写真（data URL）
  const [checked, setChecked] = useState(new Set(currentSkillIds));
  const [newSkills, setNewSkills] = useState('');
  const [intro, setIntro] = useState('');
  const [busy, setBusy] = useState(false);
  const nameRef = useRef(null);
  useEffect(() => nameRef.current?.focus(), []);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const pickPhoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try { setPhoto(await readPhoto(file)); }
    catch { onError('この画像は読み込めませんでした。JPEGかPNGを選んでください'); }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!f.name.trim() || busy) return;
    const added = newSkills.split(/[、,，\s]+/).map((s) => s.replace(/^#/, '').trim()).filter(Boolean);
    setBusy(true);
    await onSubmit({ fields: { ...f, name: f.name.trim(), area: f.area.trim(), word: f.word.trim(), role: f.role.trim() }, photo, skillIds: [...checked], newSkills: added, intro });
    setBusy(false);
  };

  const preview = photo || member?.photo;
  return (
    <Overlay onClose={onClose}>
      <form className="dialog" onSubmit={submit}>
        <h2>{editing ? 'プロフィールを編集' : 'メンバー登録'}</h2>
        {!editing && <p className="lead">登録すると、得意なことや紹介者と自動でつながります。</p>}
        <div className="field">
          <span className="lab">顔写真</span>
          <div className="photo-row">
            <div className="photo-prev">{preview ? <img src={preview} alt="選んだ写真" /> : '未設定'}</div>
            <input type="file" id="m-photo" accept="image/*" onChange={pickPhoto} />
          </div>
        </div>
        <div className="row2">
          <div className="field">
            <label htmlFor="m-name">名前（ニックネーム可）</label>
            <input ref={nameRef} type="text" id="m-name" required maxLength={12} value={f.name} onChange={set('name')} />
          </div>
          <div className="field">
            <label htmlFor="m-area">地域</label>
            <input type="text" id="m-area" maxLength={16} value={f.area} onChange={set('area')} placeholder="例：市内" />
          </div>
        </div>
        <div className="field">
          <label htmlFor="m-word">ひとこと</label>
          <input type="text" id="m-word" maxLength={40} value={f.word} onChange={set('word')} placeholder="例：おにぎり担当になりたい！" />
        </div>
        <div className="row2">
          <div className="field">
            <label htmlFor="m-exp">農業経験</label>
            <select id="m-exp" value={f.exp} onChange={set('exp')}>
              {EXPERIENCES.map((x) => <option key={x}>{x}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="m-join">参加した月</label>
            <input type="month" id="m-join" value={f.join} onChange={set('join')} />
          </div>
        </div>
        {editing && (
          <div className="field">
            <label htmlFor="m-role">役割（任意）</label>
            <input type="text" id="m-role" maxLength={6} value={f.role} onChange={set('role')} placeholder="例：運営、先生役" />
          </div>
        )}
        <div className="field">
          <span className="lab">得意なこと</span>
          <div className="checks">
            {skills.map((s) => (
              <label key={s.id}>
                <input
                  type="checkbox"
                  checked={checked.has(s.id)}
                  onChange={(e) => {
                    const next = new Set(checked);
                    e.target.checked ? next.add(s.id) : next.delete(s.id);
                    setChecked(next);
                  }}
                />
                #{s.name}
              </label>
            ))}
          </div>
          <input type="text" id="m-newskill" value={newSkills} onChange={(e) => setNewSkills(e.target.value)} placeholder="ほかにあれば（読点で区切る）例：草刈り、絵" />
        </div>
        {!editing && (
          <div className="field">
            <label htmlFor="m-intro">だれの紹介で来ましたか？</label>
            <select id="m-intro" value={intro} onChange={(e) => setIntro(e.target.value)}>
              <option value="">（だれの紹介でもない）</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
        )}
        <div className="dfoot">
          <button type="button" className="btn" onClick={onClose}>キャンセル</button>
          <button type="submit" className="btn primary" disabled={busy}>{busy ? '保存中…' : editing ? '保存する' : '登録する'}</button>
        </div>
      </form>
    </Overlay>
  );
}

export function AdminDialog({ onSubmit, onClose }) {
  const [key, setKey] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <Overlay onClose={onClose}>
      <form className="dialog" onSubmit={async (e) => { e.preventDefault(); if (!key || busy) return; setBusy(true); await onSubmit(key); setBusy(false); }}>
        <h2>運営モード</h2>
        <p className="lead">運営用の合言葉を入れると、メンバーやつながりを削除できるようになります。</p>
        <div className="field">
          <label htmlFor="admin-key">合言葉</label>
          <input type="password" id="admin-key" autoFocus value={key} onChange={(e) => setKey(e.target.value)} />
        </div>
        <div className="dfoot">
          <button type="button" className="btn" onClick={onClose}>キャンセル</button>
          <button type="submit" className="btn primary" disabled={busy}>{busy ? '確認中…' : '入る'}</button>
        </div>
      </form>
    </Overlay>
  );
}

// 押し間違いを防ぐため、2回押しで実行するボタン
export function ConfirmButton({ className, children, confirmText, onConfirm }) {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (!armed) return;
    const t = setTimeout(() => setArmed(false), 3000);
    return () => clearTimeout(t);
  }, [armed]);
  return (
    <button className={className} onClick={() => (armed ? (setArmed(false), onConfirm()) : setArmed(true))}>
      {armed ? confirmText : children}
    </button>
  );
}
