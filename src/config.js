// 線の種類。並び順 = 画面上部アイコンの順番。on: true は最初から表示
export const TYPES = {
  family: { name: '家族', c: '--e-family', manual: true, on: true, icon: 'M3 11l9-7 9 7M5 10v10h14V10M10 20v-5h4v5' },
  partner: { name: '恋人', c: '--e-partner', manual: true, icon: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z' },
  friend: { name: '友だち', c: '--e-friend', manual: true, on: true, icon: 'M9 11a3 3 0 1 0 0-6a3 3 0 1 0 0 6M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6M16 11a3 3 0 1 0 0-6M17 14c2.5.4 4 2.8 4 6' },
  colleague: { name: '同僚', c: '--e-colleague', manual: true, on: true, icon: 'M4 8h16v11H4zM9 8V5h6v3M4 13h16' },
  neighbor: { name: 'ご近所', c: '--e-neighbor', manual: true, on: true, icon: 'M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11zM12 8a2 2 0 1 0 0 4a2 2 0 1 0 0-4' },
  intro: { name: '紹介', c: '--e-intro', manual: true, dir: ['紹介した人', '紹介された人'], icon: 'M4 12h14M13 6l6 6-6 6' },
  work: { name: '一緒に作業', c: '--e-work', icon: 'M12 21v-9M12 12c0-4-3-6-7-6 0 4 3 6 7 6zM12 10c0-3 2-5 6-5 0 3-2 5-6 5' },
  event: { name: 'イベント', c: '--e-event', icon: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4' },
  mentor: { name: '師匠・弟子', c: '--e-mentor', manual: true, dir: ['教える人', '教わる人'], icon: 'M3 5h6a3 3 0 0 1 3 3v12a2 2 0 0 0-2-2H3zM21 5h-6a3 3 0 0 0-3 3v12a2 2 0 0 1 2-2h7z' },
  other: { name: 'その他', c: '--e-other', manual: true, icon: 'M3 12V4h8l10 10-8 8zM7.5 7.5h.01' },
  skill: { name: '得意なこと', c: '--e-skill', icon: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z' },
};
// 「その他」から後ろは少し離して並べる
export const TYPE_SEPARATOR_BEFORE = 'other';

export const EXPERIENCES = ['なし', '家庭菜園', '米づくり経験あり', '農家'];

export const initialTypesOn = () =>
  Object.fromEntries(Object.entries(TYPES).map(([k, t]) => [k, !!t.on]));

export const uid = (prefix) =>
  prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

export const skillId = (name) => 'sk:' + name;

export function avColor(id) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return '--av' + ((h % 6) + 1);
}

export const nm = (n) => (n.kind === 'member' ? n.name + 'さん' : n.name);

export function ym(s) {
  if (!s) return '';
  const [y, m] = s.split('-');
  return `${y}年${+m}月`;
}

export function ymd(s) {
  if (!s) return '';
  const [y, m, d] = s.split('-');
  return `${y}年${+m}月${+d}日`;
}

export const thisMonth = () => new Date().toISOString().slice(0, 7);
