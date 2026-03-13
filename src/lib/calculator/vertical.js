// ── Dikey Kolon Hesabı ─────────────────────────────────────────────────
// Çok sonlu şaft sistemi: her son bağımsız kat aralığı, başlangıç çapı
// ve minimum çap tanımlar. Her N katta bir çap bir kademe küçülür.

import { DIAM_ORDER } from './constants.js';

/**
 * Verilen çapı bir kademe küçük çap ile döndürür.
 * @param {string} diam - örn: 'q63'
 * @returns {string}
 */
export function prevDiam(diam) {
  const idx = DIAM_ORDER.indexOf(diam);
  return idx > 0 ? DIAM_ORDER[idx - 1] : diam;
}

/**
 * Bir son için dikey segment listesi hesaplar.
 * @param {number} floorCount - bu sondaki kat sayısı
 * @param {number} floorH     - kat yüksekliği (m)
 * @param {number} step       - kaç katta bir çap küçülür
 * @param {string} startDiam  - en alttan başlayan çap
 * @param {string} minDiam    - minimum (en küçük) çap
 * @returns {Array<{diam, kats, katFrom, katTo, m}>}
 */
export function calcVertSegments(floorCount, floorH, step, startDiam, minDiam) {
  const segs = [];
  let currentDiam = startDiam;
  let kat = 1;

  while (kat <= floorCount) {
    const katsTo = Math.min(kat + step - 1, floorCount);
    const kats   = katsTo - kat + 1;
    const m      = kats * floorH;

    segs.push({ diam: currentDiam, kats, katFrom: kat, katTo: katsTo, m });
    kat = katsTo + 1;

    // Minimum çapa ulaşılmamışsa bir kademe küçült
    if (currentDiam !== minDiam) {
      currentDiam = prevDiam(currentDiam);
    }
  }

  return segs;
}

/**
 * Tüm sonların segment listesini birleştirir ve şaft başına toplam metrajı döndürür.
 * @param {Array} sons - [{from, to, startDiam, minDiam}]
 * @param {number} floorH - kat yüksekliği
 * @param {number} step   - çap küçülme adımı
 * @returns {Array<{diam, m, son}>}
 */
export function calcAllSegments(sons, floorH, step) {
  const allSegs = [];

  sons.forEach((son, i) => {
    const floorCount = Math.max(0, son.to - son.from + 1);
    const segs = calcVertSegments(floorCount, floorH, step, son.startDiam, son.minDiam);
    segs.forEach(s => allSegs.push({ ...s, son: i }));
  });

  return allSegs;
}
