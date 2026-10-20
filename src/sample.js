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
  const add = (from, to, type, label = '', auto = false) =>
    edges.push({ id: 'e' + seq++, from, to, type, label, auto, pending: false });
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
  add('m5', 'm8', 'friend');
  for (const m of ['m1', 'm3', 'm5', 'm7']) add(m, 'f1', 'work', '', true);
  for (const m of ['m2', 'm6', 'm9', 'm1']) add(m, 'f2', 'work', '', true);
  for (const m of ['m1', 'm2', 'm4', 'm5', 'm6', 'm8', 'm10']) add(m, 'ev1', 'event', '', true);
  for (const m of ['m1', 'm3', 'm7', 'm9', 'm4']) add(m, 'ev2', 'event', '', true);
  return { nodes, edges };
}

// 収支のサンプル（実装依頼 C章の 2026年度の値）。デモモードとテストで使う
export function sampleFinance() {
  const mat = (...xs) => JSON.stringify(xs.map(([label, amount]) => ({ label, amount })));
  const P = (id, name, channel, price, extra) => ({
    id, name, channel, price, cookedG: '', riceRawG: '', materials: '[]', shipping: 0, customerPaysShipping: false,
    feeRate: 0, feeFixed: 0, kamoProductId: '', active: true, ...extra,
  });
  return {
    harvest: [
      { year: 2026, harvestDate: '2026-09-20', fieldIds: 'f1', areaTan: 1, momiKg: '', genmaiBags: 13, bagKg: 30, genmaiKg: '', seimaiRate: 0.9, hakumaiKg: '', memo: '' },
    ],
    costs: [
      { id: 'c1', year: 2026, category: '種', label: '種米2kg', unitPrice: '', qty: '', amount: 20000 },
      { id: 'c2', year: 2026, category: '燃料', label: 'ガソリン代', unitPrice: '', qty: '', amount: 30000 },
      { id: 'c3', year: 2026, category: '農薬', label: '農薬代', unitPrice: '', qty: '', amount: 50000 },
      { id: 'c4', year: 2026, category: 'もみすり', label: 'もみすり代', unitPrice: 1500, qty: 13, amount: '' },
    ],
    assets: [{ id: 'a1', label: 'トラクター', price: 200000, startYear: 2026, years: 5 }],
    products: [
      P('p1', '焼きおにぎり（醤油）', 'event', 350, { cookedG: 80, materials: mat(['カップ', 20], ['醤油', 3]) }),
      P('p2', '焼きおにぎり（味噌）', 'event', 350, { cookedG: 80, materials: mat(['カップ', 20], ['味噌', 6]) }),
      P('p3', 'おにぎり', 'store', 250, { cookedG: 80, materials: mat(['包装・海苔・具', 30]) }),
      P('p4', 'お米450g', 'store', 1000, { riceRawG: 450, materials: mat(['袋', 30]) }),
      P('p5', 'お米450g（ネット・送料別）', 'online', 1000, { riceRawG: 450, materials: mat(['袋', 30]), shipping: 240, customerPaysShipping: true, feeRate: 0.066, feeFixed: 40 }),
      P('p6', 'お米450g（ネット・送料込み）', 'online', 1000, { riceRawG: 450, materials: mat(['袋', 30]), shipping: 240, customerPaysShipping: false, feeRate: 0.066, feeFixed: 40 }),
    ],
    sales: [],
    settings: { cookRatio: 2.2, kamoLastSyncAt: '' },
    kamoProducts: [],
  };
}

// デモの「カモの小屋から取り込む」で返す架空の商品と売上
export function sampleKamoExport() {
  return {
    products: [
      { id: '米チャレ焼きおにぎり', name: '米チャレ焼きおにぎり', price: 350, category: 'イベント', active: true },
      { id: '米チャレのお米450g', name: '米チャレのお米450g', price: 1000, category: '', active: true },
    ],
    sales: [
      { id: 'sq1', date: '2026-10-04', productId: '米チャレのお米450g', qty: 3, amount: 3000, channel: 'Square' },
      { id: 'sq2', date: '2026-10-11', productId: '米チャレ焼きおにぎり', qty: 42, amount: 14700, channel: 'Square' },
      { id: 'sq3', date: '2026-10-12', productId: '米チャレのお米450g', qty: 2, amount: 2000, channel: 'BASE' },
    ],
  };
}
