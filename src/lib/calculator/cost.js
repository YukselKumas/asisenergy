// ── Maliyet Hesabı ─────────────────────────────────────────────────────
// QTY haritası + fiyat listesi → KDV'siz/dahil toplam maliyet

import { PRICES, CAT_LABEL } from './constants.js';

/**
 * Bir kalemin net fiyatını döndürür.
 * net = liste × (1 - iskonto% / 100)
 * @param {Object} item     - PRICES elemanı
 * @param {Object} override - {[id]: {list, disc}} — kullanıcı değişikliği
 */
export function netPrice(item, override = {}) {
  const ov   = override[item.id] || {};
  const list = ov.list !== undefined ? ov.list : item.list;
  const disc = ov.disc !== undefined ? ov.disc : item.disc;
  return list * (1 - disc / 100);
}

/**
 * QTY haritası ve fiyat geçersizlemesine göre satır bazında maliyet hesaplar.
 * @param {Object} QTY      - {product_id: qty}
 * @param {Object} override - {product_id: {list, disc}}
 * @param {number} kdvRate  - KDV oranı (0.20 = %20)
 * @returns {Object} - {lines, grandNet, kdvAmt, grandTotal}
 */
export function calcCost(QTY, override = {}, kdvRate = 0.20) {
  let grandNet = 0;

  // Fiyat listesindeki ürünler
  const missingPrices = [];
  const lines = PRICES.map(item => {
    const qty = QTY[item.id] || 0;
    const net = netPrice(item, override);
    // Fiyat girilmemiş (null/undefined → NaN) ama miktar var → uyarı
    const noprice = qty > 0 && (isNaN(net) || net === null || net === undefined);
    const safeNet = noprice ? 0 : net;
    const row = qty * safeNet;
    grandNet += row;
    if (noprice) missingPrices.push(item.n);
    return { ...item, qty, net: safeNet, row, ...(noprice ? { _noprice: true } : {}) };
  }).filter(i => i.qty > 0);

  // Fiyat listesinde olmayan dinamik ürünler (örn: özel inegal te kombinasyonları)
  Object.entries(QTY).forEach(([id, qty]) => {
    if (qty > 0 && !PRICES.find(p => p.id === id)) {
      let name = id;
      if (id.startsWith('ite')) {
        // iteKKCC → K=ana çap, C=çıkış çapı
        const k    = id.slice(3);
        const cStr = k.slice(-2);
        const kStr = k.slice(0, k.length - 2);
        name = `${kStr}×${cStr}×${kStr} İNEGAL TE PP-R`;
      }
      lines.push({ id, cat: 'baglanti', n: name, u: 'adet', qty, net: 0, row: 0, _missing: true });
    }
  });

  const kdvAmt     = grandNet * kdvRate;
  const grandTotal = grandNet + kdvAmt;

  return { lines, grandNet, kdvAmt, grandTotal, missingPrices };
}

/**
 * Sonuçları kategori bazında gruplayarak döndürür.
 * @param {Array}  lines
 * @param {number} grandNet
 */
export function groupByCat(lines, grandNet) {
  const catOrd  = ['boru', 'vana', 'baglanti', 'mekanik'];
  const grouped = {};

  catOrd.forEach(cat => {
    const its    = lines.filter(i => i.cat === cat);
    const catSum = its.reduce((s, i) => s + i.row, 0);
    if (its.length > 0) grouped[cat] = { label: CAT_LABEL[cat], items: its, catSum };
  });

  return grouped;
}
