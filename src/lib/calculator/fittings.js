// ── Dirsek, Manşon & Redüksiyon Hesabı ─────────────────────────────────
//
// Evrensel hesaplama kuralları:
//   • Manşon   : Her 4 metrelik boru boyu arasında 1 manşon
//                → adet = floor(toplam_uzunluk / 4)  [çap bazında]
//   • Redüksiyon: Boru çapı her düştüğünde 1 redüksiyon
//                → kolon segment geçişleri + yatay hat geçişleri sayılır
//   • Dirsek   : Uzunluk × katsayı (10 m'de k adet) — monte yerine göre değişir
//   • Eşit Te  : Şaft başına katsayı-based — montaj detayına göre
//   • İnegal Te: Şaft başına katsayı-based

import { DIAM_ORDER } from './constants.js';

// ── 1. Manşon — fizik tabanlı ────────────────────────────────────────────
/**
 * Boru uzunluğuna göre manşon (sleeve coupling) adedini hesaplar.
 * Her 4 metrelik boru boyu arasında 1 manşon gerekir.
 * @param {Object} pipe - {q75: 240, q50: 160, ...}  toplam uzunluk (m)
 * @returns {Object}    - {m75: 60, m50: 40, ...}
 */
export function calcCouplings(pipe) {
  const result = {};
  DIAM_ORDER.forEach(d => {
    const L = pipe[d] || 0;
    if (L > 0) {
      const mId = 'm' + d.replace('q', '');
      result[mId] = (result[mId] || 0) + Math.floor(L / 4);
    }
  });
  return result;
}

// ── 2. Redüksiyon — fizik tabanlı ────────────────────────────────────────
/**
 * Çap geçişlerinden redüksiyon adedini hesaplar.
 *
 * Dikey kolon: Her zone'da çap düştüğünde → 1 redüksiyon × şaft × hat sayısı
 * Yatay hat  : Her çap geçişinde (Seg1→Seg2, Seg2→Seg3) → 1 redüksiyon
 *
 * @param {Array}   allSegs  - calcAllSegments çıktısı [{diam, m, zone}]
 * @param {number}  shaft    - şaft sayısı
 * @param {number}  hatCount - sıcak + soğuk hat sayısı (sirkülasyon hariç)
 * @param {Array}   hyTrans  - [[d1, d2], [d2, d3], ...] yatay hat çap geçişleri
 * @returns {Object}         - {r7563: 8, r6350: 4, ...}
 */
export function calcReductions(allSegs, shaft, hatCount, hyTrans) {
  const result = {};

  // Dikey kolon segment geçişleri — zone bazında gruplanır
  const byZone = {};
  allSegs.forEach(s => {
    if (!byZone[s.zone]) byZone[s.zone] = [];
    byZone[s.zone].push(s);
  });

  Object.values(byZone).forEach(segs => {
    for (let i = 1; i < segs.length; i++) {
      const from = segs[i - 1].diam;
      const to   = segs[i].diam;
      if (from !== to) {
        const rId = 'r' + from.replace('q', '') + to.replace('q', '');
        result[rId] = (result[rId] || 0) + shaft * hatCount;
      }
    }
  });

  // Yatay hat çap geçişleri
  hyTrans.forEach(([d1, d2]) => {
    if (d1 && d2 && d1 !== d2) {
      const rId = 'r' + d1.replace('q', '') + d2.replace('q', '');
      result[rId] = (result[rId] || 0) + 1;
    }
  });

  return result;
}

// ── 3. Dirsek — katsayı tabanlı ──────────────────────────────────────────
/**
 * Boru uzunlukları ve katsayılara göre çap bazında dirsek adedini hesaplar.
 * @param {Object}  pipeYatay   - {q75: 60, ...}
 * @param {Object}  pipeDikey   - {q75: 120, ...}
 * @param {Object}  katsayilar  - {h75: 1.0, ..., v75: 0.5, ...}
 * @param {number}  totalFlats
 * @param {boolean} hasHot
 * @param {boolean} hasCold
 * @param {string}  brDiam
 * @returns {Object} - {q75: 12, ...}
 */
export function calcElbows(pipeYatay, pipeDikey, katsayilar, totalFlats, hasHot, hasCold, brDiam) {
  const elbows = {};

  DIAM_ORDER.forEach(d => {
    const key   = d.slice(1); // 'q75' → '75'
    const keH   = parseFloat(katsayilar['h' + key] ?? 1.5);
    const keV   = parseFloat(katsayilar['v' + key] ?? 0.8);
    const yatay = pipeYatay[d] || 0;
    const dikey = pipeDikey[d] || 0;
    elbows[d]   = Math.ceil(yatay / 10 * keH + dikey / 10 * keV);
  });

  // Branşman sabit dirsek: daire başına 2 dirsek, aktif hat sayısına göre
  const hatSay = (hasHot ? 1 : 0) + (hasCold ? 1 : 0);
  elbows[brDiam] = (elbows[brDiam] || 0) + Math.ceil(totalFlats * 2 * hatSay);

  return elbows;
}

// ── 4. Şaft başı te — katsayı tabanlı ────────────────────────────────────
/**
 * Şaft başı eşit te ve inegal te toplamlarını hesaplar.
 * Redüksiyon ve manşon artık fizik tabanlı hesaplanıyor (calcReductions / calcCouplings).
 * @param {number} shaft
 * @param {number} hatSay
 * @param {Object} katsayilar - {kTee, kItee}
 * @returns {Object} - {teeTotal, iteeTotal}
 */
export function calcShaftFittings(shaft, hatSay, katsayilar) {
  const teeTotal  = Math.ceil(shaft * hatSay * (katsayilar.kTee  || 3));
  const iteeTotal = Math.ceil(shaft * hatSay * (katsayilar.kItee || 2));
  return { teeTotal, iteeTotal };
}

/**
 * Te ve inegal te miktarlarını QTY haritasına ekler.
 */
export function applyFittingsToQty(QTY, teeTotal, iteeTotal) {
  // Equal Te dağılımı
  [['t110',.15],['t90',.10],['t75',.25],['t63',.25],['t50',.15],['t40',.10]].forEach(([id, r]) => {
    QTY[id] = (QTY[id] || 0) + Math.ceil(teeTotal * r);
  });

  // İnegal Te dağılımı
  [['ite6350',.34],['ite5040',.33],['ite4032',.33]].forEach(([id, r]) => {
    QTY[id] = (QTY[id] || 0) + Math.ceil(iteeTotal * r);
  });
}
