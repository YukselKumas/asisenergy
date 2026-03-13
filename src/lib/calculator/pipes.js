// ── Boru Uzunluk Hesabı ────────────────────────────────────────────────
// Yatay hat, dikey kolon ve branşman borularının çap bazında toplamını hesaplar.

import { DIAM_ORDER } from './constants.js';

/**
 * Sıfır değerli boru haritası döndürür.
 * @returns {Object} - {q20: 0, q25: 0, ...}
 */
export function emptyPipeMap() {
  return Object.fromEntries(DIAM_ORDER.map(d => [d, 0]));
}

/**
 * Yatay ana hat borularını pipe haritasına ekler.
 * @param {Object} pipe   - mevcut boru haritası (mutate edilir)
 * @param {boolean} hasHot
 * @param {boolean} hasCold
 * @param {boolean} hasCirc
 * @param {Object} cfg    - form değerleri
 */
export function addHorizontalPipes(pipe, hasHot, hasCold, hasCirc, cfg) {
  if (hasHot) {
    addIfPositive(pipe, cfg.hyHotStart, cfg.hyHotL1);
    addIfPositive(pipe, cfg.hyHotD2,    cfg.hyHotL2);
    addIfPositive(pipe, cfg.hyHotD3,    cfg.hyHotL3);
  }
  if (hasCold) {
    addIfPositive(pipe, cfg.hyColdStart, cfg.hyColdL1);
    addIfPositive(pipe, cfg.hyColdD2,    cfg.hyColdL2);
    addIfPositive(pipe, cfg.hyColdD3,    cfg.hyColdL3);
  }
  if (hasCirc) {
    addIfPositive(pipe, cfg.circDiam, cfg.circYatay);
  }
}

/**
 * Dikey kolon borularını pipe haritasına ekler (tüm sonlar × şaft sayısı × hat).
 * @param {Object} pipe
 * @param {Array}  allSegs - calcAllSegments çıktısı
 * @param {number} shaft   - şaft sayısı
 * @param {boolean} hasHot
 * @param {boolean} hasCold
 * @param {boolean} hasCirc
 * @param {Object}  cfg
 */
export function addVerticalPipes(pipe, allSegs, shaft, hasHot, hasCold, hasCirc, cfg) {
  allSegs.forEach(s => {
    if (hasHot)  pipe[s.diam] = (pipe[s.diam] || 0) + s.m * shaft;
    if (hasCold) pipe[s.diam] = (pipe[s.diam] || 0) + s.m * shaft;
  });

  if (hasCirc) {
    const circDikey = cfg.circDikey * shaft;
    const circFlat  = cfg.circFlat  * cfg.totalFlats;
    pipe[cfg.circDiam] = (pipe[cfg.circDiam] || 0) + circDikey + circFlat;
  }
}

/**
 * Branşman borularını pipe haritasına ekler.
 */
export function addBranchPipes(pipe, hasHot, hasCold, cfg) {
  const brD = cfg.brDiam;
  if (hasHot)  pipe[brD] = (pipe[brD] || 0) + cfg.brHot  * cfg.totalFlats;
  if (hasCold) pipe[brD] = (pipe[brD] || 0) + cfg.brCold * cfg.totalFlats;
}

// Yardımcı: değer pozitifse ve çap geçerliyse ekle
function addIfPositive(pipe, diam, len) {
  if (diam && diam !== '' && len > 0) {
    pipe[diam] = (pipe[diam] || 0) + len;
  }
}
