// ── İzolasyon Hesabı — GEG 2024 Anlage 8 ──────────────────────────────
// Sıcak su besleme, sirkülasyon ve soğuk su (kondansasyon) için izolasyon.

import {
  insulationThicknessMm, COLD_INSULATION_MM, INNER_D, OUTER_D_MM,
} from './standards.js';

/**
 * Hat tipine göre boru yalıtım kalınlığını döner (mm).
 * @param {string} diam       - 'q63'
 * @param {string} lineType   - 'hot' | 'circ' | 'cold'
 * @param {Object} opts       - {unheatedRoom, betweenHeated}
 * @returns {number} mm
 */
export function getInsulationThickness(diam, lineType, opts = {}) {
  if (lineType === 'cold') return COLD_INSULATION_MM;
  // Sıcak ve sirkülasyon — iç çapa göre
  const idMm = (INNER_D[diam] || 0) * 1000;
  if (idMm === 0) return 20;
  return insulationThicknessMm(idMm, opts);
}

/**
 * Bir hat için toplam izolasyon metresini döner.
 *
 * @param {Object} pipeMap     - {q63: 240, q50: 80, ...}
 * @param {string} lineType    - 'hot' | 'circ' | 'cold'
 * @param {Object} opts        - {unheatedRoom, betweenHeated}
 * @returns {Array<{diam, length_m, thickness_mm, productId}>}
 *   productId formatı: iz-{diam}-{thickness}  (ör: iz-q63-25)
 */
export function calcInsulation(pipeMap, lineType, opts = {}) {
  const result = [];
  Object.entries(pipeMap).forEach(([diam, length]) => {
    if (length <= 0) return;
    const thickness = getInsulationThickness(diam, lineType, opts);
    const productId = `iz-${diam}-${thickness}`;
    result.push({ diam, length_m: length, thickness_mm: thickness, productId });
  });
  return result;
}

/**
 * Sıcak/sirkülasyon hatları için izolasyon QTY'sini ekler.
 * Sıcak su ve sirkülasyon aynı izolasyon profilini paylaşır.
 *
 * @param {Object} QTY
 * @param {Object} hotPipeMap   - sıcak hat boru haritası (yalnız sıcak)
 * @param {Object} circPipeMap  - sirkülasyon boru haritası
 * @param {Object} opts
 * @returns {Object} insulationSummary { byDiam, totalLength_m }
 */
export function applyInsulationToQty(QTY, hotPipeMap, circPipeMap, opts = {}) {
  const summary = { byDiam: {}, totalLength_m: 0 };
  const apply = (pipeMap, lineType) => {
    const items = calcInsulation(pipeMap, lineType, opts);
    items.forEach(it => {
      if (it.length_m <= 0) return;
      QTY[it.productId] = (QTY[it.productId] || 0) + Math.ceil(it.length_m);
      summary.byDiam[it.diam] = (summary.byDiam[it.diam] || 0) + it.length_m;
      summary.totalLength_m += it.length_m;
    });
  };
  apply(hotPipeMap, 'hot');
  apply(circPipeMap, 'circ');
  return summary;
}
