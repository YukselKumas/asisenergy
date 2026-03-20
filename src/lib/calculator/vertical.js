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
 * Tüm zone'ların segment listesini birleştirir ve şaft başına toplam metrajı döndürür.
 * Her zone şaft tabanından (shaftStart) kendi bitiş katına (zone.to) kadar boru çeker.
 * @param {Array}  zones      - [{from, to, startDiam, minDiam}]
 * @param {number} floorH     - kat yüksekliği
 * @param {number} step       - çap küçülme adımı
 * @param {number} shaftStart - binanın başlangıç kat numarası (varsayılan: 1)
 * @returns {Array<{diam, m, zone}>}
 */
export function calcAllSegments(zones, floorH, step, shaftStart = 1) {
  const allSegs = [];

  zones.forEach((zone, i) => {
    // Boru fiziksel olarak şaft tabanından (shaftStart) zone'un bitiş katına kadar uzanır
    const floorCount = Math.max(0, zone.to - shaftStart + 1);
    const segs = calcVertSegments(floorCount, floorH, step, zone.startDiam, zone.minDiam);
    segs.forEach(s => allSegs.push({ ...s, zone: i }));
  });

  return allSegs;
}
