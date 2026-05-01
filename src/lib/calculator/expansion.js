// ── Termal Genleşme & Kompansatör Hesabı — EN 806-3 ───────────────────
// PPR yüksek genleşmeli: α = 0.15 mm/(m·K). Sıcak hat ve sirkülasyon için kritik.

import {
  THERMAL_EXPANSION, EXPANSION_K, MAX_STRAIGHT_NO_COMP_M, OUTER_D_MM,
} from './standards.js';

/**
 * Tek segment için genleşme uzunluğu.
 * @param {number} L_m         - boru uzunluğu (m)
 * @param {number} deltaT      - sıcaklık farkı montaj→çalışma (K) — sıcak hat için ~50
 * @param {string} material    - 'ppr' | 'pprct' | 'pprfb'
 * @returns {number} ΔL (mm)
 */
export function deltaLength(L_m, deltaT, material = 'ppr') {
  const alpha = THERMAL_EXPANSION[material] ?? THERMAL_EXPANSION.ppr;
  return alpha * L_m * deltaT;
}

/**
 * Genleşme kolu (Π-bend) minimum free leg uzunluğu.
 * Lb = k · √(d_o · ΔL)   [mm]
 * @param {string} diam     - boru çapı ('q50')
 * @param {number} deltaL_mm
 * @returns {number} Lb (mm)
 */
export function expansionLegLength(diam, deltaL_mm) {
  const d_o = OUTER_D_MM[diam];
  if (!d_o || deltaL_mm <= 0) return 0;
  return EXPANSION_K * Math.sqrt(d_o * deltaL_mm);
}

/**
 * Bir hat için kompansatör (genleşme bağlantısı) ihtiyacını hesaplar.
 *
 * Mantık: düz boru max 6m'den uzunsa, her 6m için bir kompansatör veya genleşme
 * kolu gerekir. Bu kaba ama güvenli bir kuraldır (Wavin/Aquatherm el kitabı).
 *
 * @param {Array<{diam, length_m}>} segments - sıcak/sirkülasyon segmentleri
 * @param {number} deltaT
 * @param {string} material
 * @returns {Array<{diam, length_m, deltaL_mm, legLength_mm, compensatorCount}>}
 */
export function calcExpansionRequirements(segments, deltaT, material = 'ppr') {
  return segments.map(seg => {
    const dL = deltaLength(seg.length_m, deltaT, material);
    const legLen = expansionLegLength(seg.diam, dL);
    const compensatorCount = Math.max(
      0,
      Math.ceil((seg.length_m / MAX_STRAIGHT_NO_COMP_M) - 1)
    );
    return {
      diam: seg.diam,
      length_m: seg.length_m,
      deltaL_mm: parseFloat(dL.toFixed(1)),
      legLength_mm: parseFloat(legLen.toFixed(1)),
      compensatorCount,
    };
  });
}

/**
 * Toplam kompansatör adedini özetler.
 * @param {Array} expansionData
 * @returns {{ totalCompensators, byDiam, totalDeltaL_mm }}
 */
export function summarizeExpansion(expansionData) {
  const byDiam = {};
  let totalCompensators = 0;
  let totalDeltaL = 0;
  expansionData.forEach(e => {
    if (e.compensatorCount > 0) {
      byDiam[e.diam] = (byDiam[e.diam] || 0) + e.compensatorCount;
      totalCompensators += e.compensatorCount;
    }
    totalDeltaL += e.deltaL_mm;
  });
  return { totalCompensators, byDiam, totalDeltaL_mm: parseFloat(totalDeltaL.toFixed(1)) };
}
