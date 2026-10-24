import { describe, expect, it } from 'vitest';
import { applyKamoProducts, applySave, emptyFin, fillKamoSales } from './store';

const kamo = [{ id: 'おにぎり / 定価', name: 'おにぎり / 定価', price: 220, active: true }];
const sale = (id, extra = {}) => ({
  id: 'kamo:' + id, source: 'kamo', date: '2026-10-19', productId: '', qty: 10, amount: 2200,
  variableCostAtSale: '', riceGAtSale: '', kamoProductId: 'おにぎり / 定価', ...extra,
});

describe('カモの小屋の商品から収支の商品を作る', () => {
  it('なければ作り、あれば名前と値段をそろえる（ご飯の量は残す）', () => {
    let fin = applyKamoProducts(emptyFin(), kamo);
    expect(fin.products).toHaveLength(1);
    expect(fin.products[0]).toMatchObject({ id: 'kamo:おにぎり / 定価', name: 'おにぎり / 定価', price: 220, kamoProductId: 'おにぎり / 定価' });
    fin = applySave(fin, 'products', { ...fin.products[0], cookedG: '110' });
    fin = applyKamoProducts(fin, [{ ...kamo[0], price: 250 }]);
    expect(fin.products).toHaveLength(1);
    expect(fin.products[0]).toMatchObject({ price: 250, cookedG: '110' });
  });

  it('ご飯の量が入るまでは売上の米の量を空け、入ったら埋める', () => {
    let fin = applyKamoProducts({ ...emptyFin(), sales: [sale('a')] }, kamo);
    fin = fillKamoSales(fin);
    expect(fin.sales[0]).toMatchObject({ productId: 'kamo:おにぎり / 定価', riceGAtSale: '' });
    fin = applySave(fin, 'products', { id: 'kamo:おにぎり / 定価', riceRawG: '50' });
    expect(fin.sales[0]).toMatchObject({ riceGAtSale: 50, variableCostAtSale: 0 });
    // 記録済みの売上は、あとでg数を変えても変わらない
    fin = applySave(fin, 'products', { id: 'kamo:おにぎり / 定価', riceRawG: '60' });
    expect(fin.sales[0].riceGAtSale).toBe(50);
  });
});

describe('単品とセット', () => {
  const products = [
    { id: 'oni', kind: 'single', price: 220, riceRawG: '60', materials: '[{"amount":10}]' },
    { id: 'set', kind: 'set', price: 800, parts: '[{"id":"oni","qty":2}]', materials: '[]' },
  ];

  it('セットは中身の単品の値段の分だけ米チャレの売上に数える', async () => {
    const { salesSummary, unitEconomics, onigiriCounts } = await import('./calc');
    const sales = [
      { productId: 'set', qty: 10, amount: 8000, variableCostAtSale: 20 },
      { productId: 'oni', qty: 5, amount: 1100, variableCostAtSale: 10 },
    ];
    // セット：8000 × 440/800 = 4400、単品 1100
    expect(salesSummary(sales, { products })).toMatchObject({ amount: 5500, keep: 5500 - 200 - 50 });
    expect(unitEconomics(products[1], { products })).toMatchObject({ setOther: 360, riceG: 120, variable: 20, keep: 420 });
    expect(onigiriCounts(sales, products).get('oni')).toBe(25);
  });

  it('セットの米の量は中身が入ってから記録する', () => {
    let fin = { ...emptyFin(), products: [products[0], { ...products[1], parts: '[]' }], sales: [sale('b', { productId: 'set', kamoProductId: 'x' })] };
    fin = fillKamoSales(fin);
    expect(fin.sales[0].riceGAtSale).toBe('');
    fin = applySave(fin, 'products', { id: 'set', parts: '[{"id":"oni","qty":2}]' });
    expect(fin.sales[0]).toMatchObject({ riceGAtSale: 120, variableCostAtSale: 20 });
    fin = applySave(fin, 'products', { id: 'oni', riceRawG: '70' });
    expect(fin.sales[0].riceGAtSale).toBe(120);
    expect(fillKamoSales(fin, true).sales[0].riceGAtSale).toBe(140);
  });
});
