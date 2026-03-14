// ── Kolektör Çıkış Montaj Hesabı ──────────────────────────────────────
// Her kolektör çıkışı için: İnegal Te + Dış Dişli Adaptör + Pirinç Küresel Vana
// + (Çekvalf VAR → Sarı Nipel + Çekvalf | Çekvalf YOK → Oynar Başlıklı Rakor)

import { PIR_VANA_MAP } from './constants.js';

/**
 * Kolektör çapından çıkış çapına uygun inegal te ID'si döndürür.
 * Örn: kdiam='q90', vd='q75' → 'ite9075'
 */
export function iteId(kdiam, vd) {
  const k = kdiam.replace('q', '');
  const c = vd.replace('q', '');
  return 'ite' + k + c;
}

/** Dış dişli adaptör ID'si */
export function adaId(vd) {
  return 'ada' + vd.replace('q', '');
}

/** Oynar başlıklı rakor ID'si */
export function saatrekId(vd) {
  return 'saatrek' + vd.replace('q', '');
}

/** Çıkış çapına göre sarı nipel ID'si */
export function nipIdForDiam(vd) {
  return (vd === 'q20' || vd === 'q25' || vd === 'q32') ? 'n34' : 'n114';
}

/** Çıkış çapına göre pirinç küresel vana ID'si */
export function pirVanaId(diam) {
  return PIR_VANA_MAP[diam] || 'pir-v114';
}

/** Çıkış çapına göre çekvalf ID'si */
export function cvId(vd) {
  if (vd === 'q20' || vd === 'q25') return 'cv34';
  if (vd === 'q32') return 'cv1';
  if (vd === 'q40') return 'cv114';
  if (vd === 'q50') return 'cv112';
  if (vd === 'q63') return 'cv112';
  return 'cv2';
}

/** Kolektör ID'si (mat: 'ppr' | 'paslanmaz', diam: 'q90') */
export function kolektorId(mat, diam) {
  const pfx = mat === 'paslanmaz' ? 'kol-pas-' : 'kol-ppr-';
  return pfx + diam.replace('q', '');
}

/**
 * Bir kolektörün tüm çıkışlarını işleyerek QTY haritasını günceller.
 * @param {Object}   QTY
 * @param {string}   hatId   - 'hot' | 'cold'
 * @param {string}   mat     - 'ppr' | 'paslanmaz'
 * @param {string}   kdiam   - kolektör ana çapı
 * @param {Array}    rows    - [{vd, hasCv}]  — çıkış satırları
 * @param {number}   kepAdet - kapama başlığı adedi
 * @param {Object}   pipe    - boru haritası (imalat borusu için)
 * @returns {string} - özet metin
 */
export function processKolektorRows(QTY, hatId, mat, kdiam, rows, kepAdet, pipe) {
  // 1. Kolektör kendisi
  const kid = kolektorId(mat, kdiam);
  if (QTY[kid] !== undefined) QTY[kid] = (QTY[kid] || 0) + 1;

  let cvCount = 0;
  const teCounts = {};

  rows.forEach(({ vd, hasCv }) => {
    // İnegal Te
    const tid = iteId(kdiam, vd);
    teCounts[tid] = (teCounts[tid] || 0) + 1;
    QTY[tid] = (QTY[tid] || 0) + 1;

    // Dış Dişli Adaptör
    const aid = adaId(vd);
    if (QTY[aid] !== undefined) QTY[aid] = (QTY[aid] || 0) + 1;

    // Pirinç Küresel Vana
    const vid = pirVanaId(vd);
    QTY[vid] = (QTY[vid] || 0) + 1;

    if (hasCv) {
      // Sarı Nipel + Çekvalf
      const nipId = nipIdForDiam(vd);
      if (QTY[nipId] !== undefined) QTY[nipId] = (QTY[nipId] || 0) + 1;
      const cid = cvId(vd);
      QTY[cid] = (QTY[cid] || 0) + 1;
      cvCount++;
    } else {
      // Oynar Başlıklı Rakor
      const rid = saatrekId(vd);
      if (QTY[rid] !== undefined) QTY[rid] = (QTY[rid] || 0) + 1;
    }
  });

  // Kolektör imalat borusu: çıkış adedi × 0.30 m
  const kolBoruM = rows.length * 0.30;
  if (pipe[kdiam] !== undefined) pipe[kdiam] = (pipe[kdiam] || 0) + kolBoruM;

  // Kapama başlığı
  if (kepAdet > 0) {
    const kepId = 'kep' + kdiam.replace('q', '');
    if (QTY[kepId] !== undefined) QTY[kepId] = (QTY[kepId] || 0) + kepAdet;
  }

  const hatNames = { hot: 'Sıcak', cold: 'Soğuk' };
  return `${hatNames[hatId] || hatId}: ${kdiam.toUpperCase()} kolektör · ${rows.length} çıkış · ${kolBoruM.toFixed(2)}m imalat borusu · ${kepAdet} kep · Çekvalf: ${cvCount} adet`;
}
