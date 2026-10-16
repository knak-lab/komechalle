// デモモード（GAS の URL 未設定）で使うサンプルデータ。人物はすべて架空です
export function sampleData() {
  const nodes = [];
  const edges = [];
  let seq = 1;
  const M = [
    ['m1', 'たろう', '地元', '米づくり経験あり', '田んぼの段取りは任せてください。', '2025-04', '運営', ['機械', '力仕事']],
    ['m2', 'はなこ', '市内', '家庭菜園', '炊きたてのおにぎり担当です。', '2025-04', '', ['料理', 'SNS発信']],
    ['m3', 'けんじ', '地元', '農家', '田んぼ歴30年。水の見方なら聞いてください。', '2025-05', '先生役', ['機械', '水管理']],
    ['m4', 'ゆき', '県外（週末参加）', 'なし', '稲が育っていく様子を撮るのが楽しみ。', '2025-06', '', ['写真', 'SNS発信']],
    ['m5', 'まこと', 'となり町', 'なし', '週末だけ参加。体力には自信あり。', '2025-06', '', ['力仕事', 'DIY']],
    ['m6', 'さき', '市内', '家庭菜園', 'ぬか漬けも作っています。', '2025-07', '', ['料理']],
    ['m7', 'しょう', 'となり町', '米づくり経験あり', 'トラクターに乗りたくて参加しました。', '2025-08', '', ['機械', 'DIY']],
    ['m8', 'あや', '県外（週末参加）', 'なし', '田んぼの生きもの観察が好き。', '2026-01', '', ['写真']],
    ['m9', 'ひろし', '地元', '農家', '川沿いの田んぼの水番をしています。', '2026-03', '', ['水管理']],
    ['m10', 'みき', '市内', 'なし', '米チャレの様子を発信していきます！', '2026-05', '', ['SNS発信', '料理']],
  ];
  for (const [id, name, area, exp, word, join, role] of M)
    nodes.push({ id, kind: 'member', name, area, exp, word, join, role, photo: '' });
  nodes.push(
    { id: 'f1', kind: 'field', name: '上の田んぼ', size: '12a', variety: 'コシヒカリ' },
    { id: 'f2', kind: 'field', name: '川沿いの田んぼ', size: '8a', variety: 'こがねもち' },
    { id: 'ev1', kind: 'event', name: '田植え', date: '2026-05-17' },
    { id: 'ev2', kind: 'event', name: '稲刈り', date: '2026-09-27' },
  );
  const add = (from, to, type, label = '', auto = false, pending = false) =>
    edges.push({ id: 'e' + seq++, from, to, type, label, auto, pending });
  for (const m of M)
    for (const s of m[7]) {
      const sid = 'sk:' + s;
      if (!nodes.some((n) => n.id === sid)) nodes.push({ id: sid, kind: 'skill', name: s });
      add(m[0], sid, 'skill', '', true);
    }
  add('m1', 'm2', 'intro'); add('m1', 'm4', 'intro'); add('m4', 'm8', 'intro'); add('m9', 'm10', 'intro');
  add('m3', 'm1', 'mentor', '水管理'); add('m3', 'm7', 'mentor', 'コンバインの操作');
  add('m2', 'm6', 'friend'); add('m5', 'm7', 'friend'); add('m6', 'm10', 'family', 'いとこ');
  add('m3', 'm9', 'neighbor'); add('m2', 'm10', 'other', '同じ高校');
  add('m2', 'm4', 'colleague', '同じ職場'); add('m7', 'm9', 'colleague', '農協の仕事');
  add('m5', 'm8', 'friend', '', false, true);
  for (const m of ['m1', 'm3', 'm5', 'm7']) add(m, 'f1', 'work', '', true);
  for (const m of ['m2', 'm6', 'm9', 'm1']) add(m, 'f2', 'work', '', true);
  for (const m of ['m1', 'm2', 'm4', 'm5', 'm6', 'm8', 'm10']) add(m, 'ev1', 'event', '', true);
  for (const m of ['m1', 'm3', 'm7', 'm9', 'm4']) add(m, 'ev2', 'event', '', true);
  return { nodes, edges };
}
