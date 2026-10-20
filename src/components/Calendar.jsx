import { useEffect, useState } from 'react';
import { ymd } from '../config';
import { Avatar } from './Panel';
import { ConfirmButton } from './Dialogs';

const WEEK = ['日', '月', '火', '水', '木', '金', '土'];

const pad = (n) => String(n).padStart(2, '0');
const localDay = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addMonth = (ym, k) => {
  const [y, m] = ym.split('-').map(Number);
  const d = new Date(y, m - 1 + k, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};
const byDate = (a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || ''));

function MonthGrid({ month, events, today, day, onPick }) {
  const [y, m] = month.split('-').map(Number);
  const first = new Date(y, m - 1, 1).getDay();
  const days = new Date(y, m, 0).getDate();
  const cells = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => `${month}-${pad(i + 1)}`)];
  return (
    <div className="cal-grid" role="grid">
      {WEEK.map((w, i) => <span key={w} className={'cal-w' + (i === 0 ? ' sun' : i === 6 ? ' sat' : '')}>{w}</span>)}
      {cells.map((d, i) => {
        if (!d) return <span key={'b' + i} />;
        const evs = events.filter((e) => e.date === d);
        const cls = ['cal-d', d === today && 'today', d === day && 'on', evs.length && 'has', i % 7 === 0 && 'sun', i % 7 === 6 && 'sat'];
        return (
          <button key={d} className={cls.filter(Boolean).join(' ')} onClick={() => onPick(d === day ? null : d)} aria-pressed={d === day}>
            <span className="n">{+d.slice(8)}</span>
            {evs.slice(0, 2).map((e) => <span key={e.id} className="chip">{e.name}</span>)}
            {evs.length > 2 && <span className="more">+{evs.length - 2}</span>}
          </button>
        );
      })}
    </div>
  );
}

function EventForm({ ev, date, onSave, onCancel }) {
  const [f, setF] = useState({
    name: ev?.name || '', date: ev?.date || date || localDay(), time: ev?.time || '', place: ev?.place || '', note: ev?.note || '',
  });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!f.name.trim() || !f.date || busy) return;
        setBusy(true);
        const trimmed = Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v.trim()]));
        const ok = await onSave(trimmed);
        if (!ok) setBusy(false);
      }}
    >
      <h2>{ev ? '予定を編集' : '予定を追加'}</h2>
      <p className="lead">追加した予定はマップにもイベントとして出ます。</p>
      <div className="field">
        <label htmlFor="ev-name">名前</label>
        <input type="text" id="ev-name" required maxLength={20} autoFocus value={f.name} onChange={set('name')} placeholder="例：田植え、草取り" />
      </div>
      <div className="row2">
        <div className="field">
          <label htmlFor="ev-date">日付</label>
          <input type="date" id="ev-date" required value={f.date} onChange={set('date')} />
        </div>
        <div className="field">
          <label htmlFor="ev-time">時間（任意）</label>
          <input type="text" id="ev-time" maxLength={20} value={f.time} onChange={set('time')} placeholder="例：9:00〜12:00" />
        </div>
      </div>
      <div className="field">
        <label htmlFor="ev-place">場所（任意）</label>
        <input type="text" id="ev-place" maxLength={30} value={f.place} onChange={set('place')} placeholder="例：上の田んぼ" />
      </div>
      <div className="field">
        <label htmlFor="ev-note">メモ（任意）</label>
        <textarea id="ev-note" rows={3} maxLength={200} value={f.note} onChange={set('note')} placeholder="例：長ぐつと軍手を持ってきてください" />
      </div>
      <div className="dfoot">
        <button type="button" className="btn" onClick={onCancel}>キャンセル</button>
        <button type="submit" className="btn primary" disabled={busy}>{busy ? '保存中…' : '保存する'}</button>
      </div>
    </form>
  );
}

function EventDetail({ ev, nodes, edges, isAdmin, onBack, onEdit, onDelete, onJoin, onLeave, onGoto }) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const joins = edges
    .filter((e) => e.type === 'event' && (e.to === ev.id || e.from === ev.id))
    .map((e) => ({ e, m: byId.get(e.to === ev.id ? e.from : e.to) }))
    .filter((x) => x.m?.kind === 'member');
  const members = nodes.filter((n) => n.kind === 'member' && !joins.some((x) => x.m.id === n.id))
    .sort((a, b) => a.name.localeCompare(b.name, 'ja'));
  const [picked, setPicked] = useState(() => new Set());
  const [busy, setBusy] = useState(false);
  const chosen = members.filter((m) => picked.has(m.id));
  const toggle = (id) => {
    const next = new Set(picked);
    next.has(id) ? next.delete(id) : next.add(id);
    setPicked(next);
  };

  return (
    <div>
      <button className="cal-back" onClick={onBack}>‹ カレンダー</button>
      <h2>{ev.name}</h2>
      <p className="cal-when">{ymd(ev.date)}（{WEEK[new Date(ev.date + 'T00:00').getDay()]}）{ev.time && `　${ev.time}`}</p>
      {ev.place && <p className="cal-meta">場所：{ev.place}</p>}
      {ev.note && <p className="word">{ev.note}</p>}

      <h3>参加する人 {joins.length}人</h3>
      {joins.length > 0 ? (
        <div className="people">
          {joins.map(({ e, m }) => (
            <div key={e.id} className="person joined">
              <button className="person" onClick={() => onGoto(m.id)}>
                <Avatar n={m} size={56} />
                <span>{m.name}</span>
              </button>
              <button className="x" onClick={() => onLeave(e.id)} aria-label={`${m.name}さんの参加を取り消す`} title="参加を取り消す">×</button>
            </div>
          ))}
        </div>
      ) : <p className="note">まだだれも参加していません</p>}

      {members.length > 0 && (
        <form
          className="cal-join"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!chosen.length || busy) return;
            setBusy(true);
            await onJoin(chosen.map((m) => m.id));
            setPicked(new Set());
            setBusy(false);
          }}
        >
          <h3>参加する人を選ぶ（何人でも）</h3>
          <div className="pick" role="group" aria-label="参加するメンバー">
            {members.map((m) => (
              <label key={m.id} className={picked.has(m.id) ? 'on' : ''}>
                <input type="checkbox" checked={picked.has(m.id)} onChange={() => toggle(m.id)} />
                <Avatar n={m} size={28} />
                <span>{m.name}</span>
              </label>
            ))}
          </div>
          <div className="pick-foot">
            {chosen.length > 0 && <button type="button" className="btn small" onClick={() => setPicked(new Set())}>選択をやめる</button>}
            <button type="submit" className="btn primary" disabled={!chosen.length || busy}>
              {busy ? '保存中…' : chosen.length ? `${chosen.length}人を参加にする` : '参加する人を選んでください'}
            </button>
          </div>
        </form>
      )}

      <div className="actions">
        <button className="btn small" onClick={() => onGoto(ev.id)}>マップで見る</button>
        {isAdmin && <button className="btn small" onClick={onEdit}>予定を編集</button>}
        {isAdmin && (
          <ConfirmButton className="btn small danger" confirmText="もう一度押すと削除します" onConfirm={onDelete}>予定を削除</ConfirmButton>
        )}
      </div>
    </div>
  );
}

export default function CalendarDialog({ nodes, edges, isAdmin, onClose, onSaveEvent, onDeleteEvent, onJoin, onLeave, onGoto }) {
  const today = localDay();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [day, setDay] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [form, setForm] = useState(null); // { ev } で編集、{ ev: null, date } で追加

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const events = nodes.filter((n) => n.kind === 'event' && /^\d{4}-\d{2}-\d{2}$/.test(n.date || '')).sort(byDate);
  const open = openId && events.find((e) => e.id === openId);
  const list = day ? events.filter((e) => e.date === day) : events.filter((e) => e.date.startsWith(month));
  const next = events.find((e) => e.date >= today);

  let body;
  if (form) {
    body = (
      <EventForm
        ev={form.ev}
        date={form.date}
        onCancel={() => setForm(null)}
        onSave={async (fields) => {
          const id = await onSaveEvent(form.ev?.id, fields);
          if (!id) return false;
          setForm(null);
          setOpenId(id);
          setMonth(fields.date.slice(0, 7));
          return true;
        }}
      />
    );
  } else if (open) {
    body = (
      <EventDetail
        ev={open} nodes={nodes} edges={edges} isAdmin={isAdmin}
        onBack={() => setOpenId(null)}
        onEdit={() => setForm({ ev: open })}
        onDelete={() => { setOpenId(null); onDeleteEvent(open.id); }}
        onJoin={(mids) => onJoin(mids, open)}
        onLeave={onLeave}
        onGoto={onGoto}
      />
    );
  } else {
    body = (
      <>
        <div className="cal-head">
          <button className="cal-nav" onClick={() => { setMonth(addMonth(month, -1)); setDay(null); }} aria-label="前の月">‹</button>
          <h2>{+month.slice(0, 4)}年{+month.slice(5)}月</h2>
          <button className="cal-nav" onClick={() => { setMonth(addMonth(month, 1)); setDay(null); }} aria-label="次の月">›</button>
          {month !== today.slice(0, 7) && (
            <button className="btn small" onClick={() => { setMonth(today.slice(0, 7)); setDay(null); }}>今月</button>
          )}
        </div>
        <MonthGrid month={month} events={events} today={today} day={day} onPick={setDay} />
        <h3>{day ? `${+day.slice(5, 7)}月${+day.slice(8)}日の予定` : `${+month.slice(5)}月の予定`}</h3>
        {list.length ? (
          <ul className="cal-list">
            {list.map((e) => {
              const n = edges.filter((x) => x.type === 'event' && (x.to === e.id || x.from === e.id)).length;
              return (
                <li key={e.id}>
                  <button onClick={() => setOpenId(e.id)}>
                    <span className="d">{+e.date.slice(5, 7)}/{+e.date.slice(8)}<small>{WEEK[new Date(e.date + 'T00:00').getDay()]}</small></span>
                    <span className="t"><b>{e.name}</b><small>{[e.time, e.place].filter(Boolean).join('・') || '　'}</small></span>
                    <span className="c">{n}人</span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="note">
            予定はありません
            {!day && next && next.date.slice(0, 7) !== month && (
              <>。次の予定は <button className="link" onClick={() => { setMonth(next.date.slice(0, 7)); setOpenId(next.id); }}>{ymd(next.date)}の{next.name}</button></>
            )}
          </p>
        )}
        <div className="dfoot">
          {isAdmin && <button className="btn primary" onClick={() => setForm({ ev: null, date: day })}>＋ 予定を追加</button>}
          <button className="btn" onClick={onClose}>閉じる</button>
        </div>
      </>
    );
  }

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dialog cal" role="dialog" aria-label="カレンダー">{body}</div>
    </div>
  );
}
