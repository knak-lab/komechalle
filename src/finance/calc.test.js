import { describe, expect, it } from 'vitest';
import { harvestKg, sameKeepQty, salesSummary, unitEconomics, yearContext, yearCost, yearOfDate } from './calc';
import { sampleFinance } from '../sample';

// 実装依頼 C章「受け入れ確認」の値
const fin = sampleFinance();
const ctx = yearContext(fin, 2026);
const unit = (id) => unitEconomics(fin.products.find((p) => p.id === id), ctx);
const r1 = (v) => Math.round(v * 10) / 10;

describe('2026年度', () => {
  it('原価・白米・1kgあたり原価', () => {
    expect(ctx.totalCost).toBe(159500);
    expect(ctx.kg.hakumaiKg).toBeCloseTo(351);
    expect(ctx.kg.hakumaiSource).toBe('計算');
    expect(r1(ctx.costPerKg)).toBe(454.4);
  });

  it('焼きおにぎり：生米36.4g、お米原価16.5円', () => {
    const u = unit('p1');
    expect(r1(u.riceG)).toBe(36.4);
    expect(r1(u.riceCost)).toBe(16.5);
  });

  it.each([
    ['p1', 327, 488],
    ['p2', 324, 493],
    ['p3', 220, 725],
    ['p4', 970, 165],
    ['p5', 848.2, 189],
    ['p6', 624, 256],
  ])('%s：手残り %s円 → 損益分岐 %s', (id, keep, be) => {
    const u = unit(id);
    expect(r1(u.keep)).toBe(keep);
    expect(u.breakEven).toBe(be);
  });

  it('価格試算：おにぎり250円で80個と同じ手残りは200円なら104個', () => {
    const p = fin.products.find((x) => x.id === 'p3');
    const a = unitEconomics(p, ctx).keep;
    const b = unitEconomics({ ...p, price: 200 }, ctx).keep;
    expect(sameKeepQty(a, 80, b)).toBe(104);
  });
});

describe('設備の償却', () => {
  it('2027年度は費用を入れなければ 40,000円（トラクター2年目のみ）', () => {
    expect(yearCost({ costs: fin.costs, assets: fin.assets, year: 2027 }).total).toBe(40000);
  });
  it('2031年度はトラクターの償却なし', () => {
    expect(yearCost({ costs: fin.costs, assets: fin.assets, year: 2031 }).total).toBe(0);
  });
});

describe('収穫と年度', () => {
  it('実測があれば実測を優先', () => {
    const k = harvestKg({ momiKg: 500, genmaiBags: 13, bagKg: 30, genmaiKg: 400, seimaiRate: 0.9, hakumaiKg: 350 });
    expect(k.genmaiKg).toBe(400);
    expect(k.genmaiSource).toBe('実測');
    expect(k.hakumaiKg).toBe(350);
    expect(k.momiToGenmai).toBeCloseTo(0.8);
  });
  it('売上の年度は収穫日で区切る', () => {
    const hs = [{ year: 2026, harvestDate: '2026-09-20' }, { year: 2027, harvestDate: '2027-09-25' }];
    expect(yearOfDate('2026-10-18', hs)).toBe(2026);
    expect(yearOfDate('2027-09-24', hs)).toBe(2026);
    expect(yearOfDate('2027-09-25', hs)).toBe(2027);
    expect(yearOfDate('2026-08-01', hs)).toBe(2025);
    expect(yearOfDate('2026-10-01', [])).toBe(2026);
  });
  it('実績の手残り・回収率・残りのお米', () => {
    const s = salesSummary(
      [{ qty: 80, amount: 28000, variableCostAtSale: 23, riceGAtSale: 36.4 }],
      { totalCost: 159500, hakumaiKg: 351 },
    );
    expect(s.keep).toBe(28000 - 23 * 80);
    expect(s.recovery).toBeCloseTo(26160 / 159500);
    expect(s.riceLeftKg).toBeCloseTo(351 - 2.912);
  });
});
