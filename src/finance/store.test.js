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
