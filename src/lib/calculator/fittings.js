// ── Dirsek & Ek Parça Hesabı ───────────────────────────────────────────
// Yatay/dikey boru uzunluklarına ve katsayılara göre dirsek sayılarını hesaplar.
// Ayrıca te, redüksiyon, manşon gibi şaft başı ek parçaları hesaplanır.

import { DIAM_ORDER } from './constants.js';

/**
 * Boru uzunlukları ve katsayılara göre çap bazında dirsek adedini hesaplar.
 * @param {Object} pipeYatay - {q75: 60, ...}
 * @param {Object} pipeDikey - {q75: 120, ...}
 * @param {Object} katsayilar - {h75: 1.0, h63: 1.5, ..., v75: 0.5, ...}
 * @param {number} totalFlats
 * @param {boolean} hasHot
 * @param {boolean} hasCold
 * @param {string}  brDiam
 * @returns {Object} - {q75: 12, ...}
 */
export function calcElbows(pipeYatay, pipeDikey, katsayilar, totalFlats, hasHot, hasCold, brDiam) {
  const elbows = {};

  DIAM_ORDER.forEach(d => {
    const key  = d.slice(1); // 'q75' → '75'
    const keH  = parseFloat(katsayilar['h' + key] ?? 1.5);
    const keV  = parseFloat(katsayilar['v' + key] ?? 0.8);
    const yatay = pipeYatay[d] || 0;
    const dikey = pipeDikey[d] || 0;
    elbows[d]   = Math.ceil(yatay / 10 * keH + dikey / 10 * keV);
  });

  // Branşman sabit dirsek eklentisi: daire başına 2 dirsek, aktif hat sayısına göre
  const hatSay = (hasHot ? 1 : 0) + (hasCold ? 1 : 0);
  elbows[brDiam] = (elbows[brDiam] || 0) + Math.ceil(totalFlats * 2 * hatSay);

  return elbows;
}

/**
 * Şaft başı ek parça toplamlarını hesaplar (te, inegal te, redüksiyon, manşon).
 * @param {number} shaft
 * @param {number} hatSay
 * @param {Object} katsayilar - {kTee, kItee, kRed, kCous}
 * @param {number} totalFlats
 * @returns {Object} - {teeTotal, iteeTotal, redTotal, couShaft, couDaire, couTotal}
 */
export function calcShaftFittings(shaft, hatSay, katsayilar, totalFlats) {
  const teeTotal  = Math.ceil(shaft * hatSay * (katsayilar.kTee  || 3));
  const iteeTotal = Math.ceil(shaft * hatSay * (katsayilar.kItee || 2));
  const redTotal  = Math.ceil(shaft * hatSay * (katsayilar.kRed  || 3));
  const couShaft  = Math.ceil(shaft * hatSay * (katsayilar.kCous || 3));
  const couDaire  = Math.ceil(totalFlats * 1);
  const couTotal  = couShaft + couDaire;
  return { teeTotal, iteeTotal, redTotal, couShaft, couDaire, couTotal };
}

/**
 * Te, inegal te, redüksiyon ve manşon miktarlarını QTY haritasına ekler.
 */
export function applyFittingsToQty(QTY, teeTotal, iteeTotal, redTotal, couTotal) {
  // Equal Te dağılımı (çap bazında eşit dağıt)
  [['t75',.25],['t63',.25],['t50',.25],['t40',.25]].forEach(([id, r]) => {
    QTY[id] = (QTY[id] || 0) + Math.ceil(teeTotal * r);
  });

  // İnegal Te dağılımı
  [['ite6350',.34],['ite5040',.33],['ite4032',.33]].forEach(([id, r]) => {
    QTY[id] = (QTY[id] || 0) + Math.ceil(iteeTotal * r);
  });

  // Redüksiyon dağılımı (toplam: 3×0.20 + 4×0.10 = 1.00)
  const redRatios = [0.20, 0.20, 0.20, 0.10, 0.10, 0.10, 0.10];
  ['r7563','r7550','r7540','r6350','r5040','r4032','r3225'].forEach((id, i) => {
    QTY[id] = (QTY[id] || 0) + Math.ceil(redTotal * redRatios[i]);
  });

  // Manşon dağılımı
  [['m75',.12],['m63',.18],['m50',.20],['m40',.20],['m25',.30]].forEach(([id, r]) => {
    QTY[id] = (QTY[id] || 0) + Math.ceil(couTotal * r);
  });
}
