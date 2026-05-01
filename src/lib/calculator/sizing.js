// ── Çap Önericisi & Akış Hızı Kontrolü — DIN 1988-300 / EN 806-3 ──────
// LU bazlı dizayn debisi → minimum çap → mevcut çapla karşılaştırma.

import {
  designFlowDIN, suggestDiameter, INNER_D,
  VELOCITY_MAX, FLAT_VR_DEFAULT,
} from './standards.js';
import { DIAM_ORDER } from './constants.js';

/**
 * Bir hat için bilimsel çap önerisi.
 *
 * @param {number}  totalFlats   - servis verilen daire sayısı
 * @param {string}  lineType     - 'cold' | 'hot' | 'circ'
 * @param {number}  flatVR       - daire başı ΣVR (L/s) — varsayılan ~1.04
 * @returns {{ Q_lps, vMax, suggested, alternatives }}
 *   - Q_lps:         dizayn debisi (L/s)
 *   - vMax:          o hat tipinin hız limiti (m/s)
 *   - suggested:     önerilen çap + o çapta gerçek hız
 *   - alternatives:  bir kademe büyük/küçük çap karşılaştırması
 */
export function suggestPipeSize(totalFlats, lineType = 'cold', flatVR = FLAT_VR_DEFAULT) {
  if (!totalFlats || totalFlats <= 0) return null;
  const sumVR = totalFlats * flatVR;
  const Q_lps = designFlowDIN(sumVR);

  let vMax;
  if      (lineType === 'hot')  vMax = VELOCITY_MAX.hot;
  else if (lineType === 'circ') vMax = VELOCITY_MAX.circ;
  else                          vMax = VELOCITY_MAX.cold;

  const suggested = suggestDiameter(Q_lps, vMax, DIAM_ORDER);
  if (!suggested) return { Q_lps, sumVR, vMax, suggested: null, alternatives: [] };

  const idx = DIAM_ORDER.indexOf(suggested.diam);
  const alternatives = [];
  for (let i = Math.max(0, idx - 1); i <= Math.min(DIAM_ORDER.length - 1, idx + 1); i++) {
    const d = DIAM_ORDER[i];
    const id = INNER_D[d];
    if (!id) continue;
    const A = Math.PI * id * id / 4;
    const v = (Q_lps / 1000) / A;
    alternatives.push({
      diam: d,
      velocity: v,
      ok: v <= vMax,
      isSuggested: i === idx,
    });
  }

  return { Q_lps, sumVR, vMax, suggested, alternatives };
}

/**
 * Verilen çapta gerçek akış hızını hesaplar.
 * @param {number} Q_lps - debi (L/s)
 * @param {string} diam  - boru çapı
 * @returns {number}     - hız m/s
 */
export function flowVelocity(Q_lps, diam) {
  const id = INNER_D[diam];
  if (!id || Q_lps <= 0) return 0;
  const A = Math.PI * id * id / 4;
  return (Q_lps / 1000) / A;
}

/**
 * Tüm aktif çaplar için hız tablosu üretir (mevcut tasarım için kontrol).
 *
 * @param {Object} pipeMap     - {q63: 240, q50: 80, ...} (toplam metre)
 * @param {number} totalFlats
 * @param {Object} opts        - {hasHot, hasCold, hasCirc}
 * @returns {Array<{diam, line, velocity, vMax, status}>}
 */
export function buildVelocityChecks(pipeMap, totalFlats, opts = {}) {
  const { hasHot = true, hasCold = true, hasCirc = false } = opts;
  const lines = [];

  // Her aktif hat için ayrı kontrol — pipe haritasını kullanmak zor (hat ayrışmamış)
  // O nedenle: her hat tipi için tek bir "ana çap kontrolü" yaparız
  // (en küçük aktif çap = darboğaz)
  const usedDiams = DIAM_ORDER.filter(d => (pipeMap[d] || 0) > 0);
  if (usedDiams.length === 0) return lines;

  const checks = [];
  if (hasCold) checks.push({ line: 'cold', vMax: VELOCITY_MAX.cold, label: 'Soğuk' });
  if (hasHot)  checks.push({ line: 'hot',  vMax: VELOCITY_MAX.hot,  label: 'Sıcak' });
  if (hasCirc) checks.push({ line: 'circ', vMax: VELOCITY_MAX.circ, label: 'Sirkülasyon' });

  checks.forEach(({ line, vMax, label }) => {
    const sizing = suggestPipeSize(totalFlats, line);
    if (!sizing?.suggested) return;
    const Q = sizing.Q_lps;
    // En küçük aktif çapı kontrol et (worst case)
    const smallestActive = usedDiams[0];
    const v = flowVelocity(Q, smallestActive);
    let status = 'ok';
    if      (v > vMax)         status = 'error';
    else if (v > vMax * 0.85)  status = 'warn';
    lines.push({
      line, label, diam: smallestActive,
      velocity: v, vMax, status,
      Q_lps: Q,
      suggestedDiam: sizing.suggested.diam,
    });
  });

  return lines;
}
