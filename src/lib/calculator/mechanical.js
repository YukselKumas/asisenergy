// ── Mekanik Oda Hesabı ─────────────────────────────────────────────────
// Hidrofor, boyler, BD ve diğer mekanik oda ekipmanlarını QTY'ye ekler.

import { PIR_VANA_MAP, PPR_VANA_MAP } from './constants.js';
import { pirVanaId, cvId, nipIdForDiam } from './kollector.js';

/**
 * PPR çapına göre PPR küresel vana ID'si döndürür.
 */
export function pprVanaId(diam) {
  return PPR_VANA_MAP[diam] || 'ppr-v40';
}

/**
 * Emiş hattı çapına uygun filtre ID'si döndürür.
 */
function emisFiltId(d) {
  if (d === 'q20' || d === 'q25') return 'f34';
  if (d === 'q32' || d === 'q40') return 'f114';
  if (d === 'q50') return 'f112';
  if (d === 'q63') return 'f2';
  if (d === 'q75') return 'f212';
  if (d === 'q90') return 'f3';
  return 'f4';
}

/**
 * Hidrofor çıkış ve emiş hattı ekipmanlarını QTY'ye ekler.
 * @param {Object} QTY
 * @param {Object} cfg - hidrofor ile ilgili form değerleri
 */
export function applyHidroforToQty(QTY, cfg) {
  const adet = Math.ceil(cfg.hidroforAdet || 0);
  if (adet <= 0) return;

  const hDiam    = cfg.hidroforDiam    || 'q50';
  const hVanaMat = cfg.hidroforVana    || 'pirince';
  const hVid     = hVanaMat === 'ppr' ? pprVanaId(hDiam) : pirVanaId(hDiam);

  // 2 vana / pompa (giriş + çıkış)
  QTY[hVid] = (QTY[hVid] || 0) + adet * 2;

  // Çekvalf
  if (cfg.hidroforCv === 'evet') {
    const cid = cvId(hDiam);
    QTY[cid] = (QTY[cid] || 0) + adet;
  }

  // Oynar union / rakor
  if (cfg.hidroforUnion === 'evet') {
    const uId = 'union' + (cfg.hidroforUnionDiam || 'q50').replace('q', '');
    if (QTY[uId] !== undefined) QTY[uId] = (QTY[uId] || 0) + adet * 2;
  }

  // Manometre
  QTY['mano'] = (QTY['mano'] || 0) + Math.ceil(cfg.hidroforMano || 0);

  // Emiş hattı
  const emisDiam = cfg.emisDiam || 'q75';

  if (cfg.emisVana === 'evet') {
    const evid = pirVanaId(emisDiam);
    QTY[evid] = (QTY[evid] || 0) + adet;
  }
  if (cfg.emisNip === 'evet') {
    const enid = nipIdForDiam(emisDiam);
    if (QTY[enid] !== undefined) QTY[enid] = (QTY[enid] || 0) + adet;
  }
  if (cfg.emisFilt === 'evet') {
    const efid = emisFiltId(emisDiam);
    if (QTY[efid] !== undefined) QTY[efid] = (QTY[efid] || 0) + adet;
  }
}

/**
 * Boyler ekipmanlarını QTY'ye ekler.
 * Her boyler: 2 vana + 1 filtre + 1 çekvalf + 2 nipel
 */
export function applyBoylerToQty(QTY, cfg) {
  const adet = Math.ceil(cfg.boylerAdet || 0);
  if (adet <= 0) return;

  const bDiam    = cfg.boylerDiam || 'q50';
  const bVanaMat = cfg.boylerVana || 'pirince';
  const bVid     = bVanaMat === 'ppr' ? pprVanaId(bDiam) : pirVanaId(bDiam);

  QTY[bVid] = (QTY[bVid] || 0) + adet * 2;

  const bFiltId = emisFiltId(bDiam);
  if (QTY[bFiltId] !== undefined) QTY[bFiltId] = (QTY[bFiltId] || 0) + adet;

  const bCvId = cvId(bDiam);
  QTY[bCvId] = (QTY[bCvId] || 0) + adet;

  const bNipId = nipIdForDiam(bDiam);
  if (QTY[bNipId] !== undefined) QTY[bNipId] = (QTY[bNipId] || 0) + adet * 2;
}

/**
 * Basınç düşürücü (BD) ekipmanlarını QTY'ye ekler.
 * Her son için kendi bd konfigürasyonu vardır.
 * @param {Object} QTY
 * @param {Array}  sons    - [{from, to, bdAktif, bdDiam, bdTo}]
 * @param {Array}  floors  - [{floor, count}]  kat dağılımı
 */
export function applyBdToQty(QTY, sons, floors) {
  sons.forEach(son => {
    if (son.bdAktif !== 'evet') return;

    const bdEffTo = Math.min(son.bdTo ?? son.to, son.to);
    let bdFlats = 0;

    floors.forEach(f => {
      if (f.floor >= son.from && f.floor <= bdEffTo) {
        bdFlats += f.count;
      }
    });

    if (bdFlats <= 0) return;

    const bdId = 'bd-' + (son.bdDiam || '34');
    if (QTY[bdId] !== undefined) QTY[bdId] = (QTY[bdId] || 0) + bdFlats;
    QTY['n34'] = (QTY['n34'] || 0) + bdFlats;
  });
}

/**
 * Sabit mekanik oda ekipmanlarını QTY'ye ekler.
 * (pompa, manometre, hava tahliye, ana hat filtresi)
 */
export function applyFixedMechToQty(QTY, cfg) {
  QTY['pump'] = (QTY['pump'] || 0) + Math.ceil(cfg.pump  || 0);
  QTY['mano'] = (QTY['mano'] || 0) + Math.ceil(cfg.mano  || 0);
  QTY['air']  = (QTY['air']  || 0) + Math.ceil(cfg.air   || 0);

  const mainfDiam = cfg.mainfDiam || 'f114';
  if (QTY[mainfDiam] !== undefined) {
    QTY[mainfDiam] = (QTY[mainfDiam] || 0) + Math.ceil(cfg.mainf || 0);
  }
}
