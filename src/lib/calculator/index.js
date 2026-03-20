// ── Ana Hesaplama Motoru ───────────────────────────────────────────────
// calculate(config, priceOverride) → result
//
// config: Wizard form değerlerinin düz JS nesnesi (calculationStore'dan gelir)
// priceOverride: {product_id: {list, disc}} — Adım 5'teki kullanıcı değişiklikleri
//
// Tüm alt modülleri koordine eder. Saf fonksiyon — side effect yok.

import { DIAM_ORDER } from './constants.js';
import { calcAllSegments }                                    from './vertical.js';
import { emptyPipeMap, addHorizontalPipes, addVerticalPipes, addBranchPipes } from './pipes.js';
import { calcElbows, calcShaftFittings, applyFittingsToQty, calcCouplings, calcReductions } from './fittings.js';
import { processKolektorRows }                               from './kollector.js';
import { pirVanaId }                                         from './kollector.js';
import { pprVanaId, applyHidroforToQty, applyBoylerToQty, applyBdToQty, applyFixedMechToQty } from './mechanical.js';
import { calcCost }                                          from './cost.js';
import { PRICES }                                            from './constants.js';

/**
 * Ana hesaplama fonksiyonu.
 *
 * @param {Object} config        - Wizard form state (tam yapı için calculationStore'a bak)
 * @param {Object} priceOverride - {product_id: {list, disc}}
 * @returns {Object} result      - Tüm hesaplama çıktısı
 */
export function calculate(config, priceOverride = {}) {
  const {
    shaft, floorH, kdvRate,
    hasHot, hasCirc, hasCold,
    zones, vertStep, vertZoneCount, shaftFloor, firstFloor,
    totalFlats, floors,
    hyHotStart, hyHotL1, hyHotD2, hyHotL2, hyHotD3, hyHotL3,
    hyColdStart, hyColdL1, hyColdD2, hyColdL2, hyColdD3, hyColdL3,
    circDiam, circYatay, circDikey, circFlat,
    brDiam, brHot, brCold,
    katsayilar,
    kolektors,   // [{hatId, mat, kdiam, rows:[{vd,hasCv}], kepAdet}]
    shaftVanaMat, shaftVanaDiam, shaftVanaAdet, shaft4katCk,
    hidroforAdet, hidroforDiam, hidroforVana, hidroforCv, hidroforUnion, hidroforUnionDiam, hidroforMano,
    emisDiam, emisVana, emisNip, emisFilt,
    boylerAdet, boylerDiam, boylerVana,
    pump, mano, term, air, mainf, mainfDiam,
    dHotmeter, dColdmeter, dAda, dAda2, dFilt, dCv, dNip, dSaatrek, dValveIn, dValve,
  } = config;

  if (!totalFlats || totalFlats <= 0) {
    throw new Error('Toplam daire sayısı 0 olamaz. Adım 3 — Kat Dağılımı\'na geçip daire sayılarını girin.');
  }

  const hatSay = (hasHot ? 1 : 0) + (hasCirc ? 1 : 0) + (hasCold ? 1 : 0);

  // Aktif zone sayısına göre dilimle (1 zone, 2 zone, 3 zone)
  const activeZones = (zones || []).slice(0, vertZoneCount || (zones || []).length);

  // ── 1. Dikey segmentler ────────────────────────────────────────────
  // Her zone şaft tabanından (shaftFloor) kendi bitiş katına kadar boru çeker
  const shaftStart = shaftFloor ?? firstFloor ?? 1;
  const allSegs = calcAllSegments(activeZones, floorH || 4, vertStep, shaftStart);

  // ── 2. Boru haritası ───────────────────────────────────────────────
  const pipe = emptyPipeMap();

  addHorizontalPipes(pipe, hasHot, hasCold, hasCirc, {
    hyHotStart, hyHotL1, hyHotD2, hyHotL2, hyHotD3, hyHotL3,
    hyColdStart, hyColdL1, hyColdD2, hyColdL2, hyColdD3, hyColdL3,
    circDiam, circYatay,
  });

  addVerticalPipes(pipe, allSegs, shaft, hasHot, hasCold, hasCirc, {
    circDiam, circDikey, circFlat, totalFlats,
  });

  addBranchPipes(pipe, hasHot, hasCold, {
    brDiam, brHot, brCold, totalFlats,
  });

  // ── 3. Yatay/dikey boru ayrımı (dirsek için) ─────────────────────
  const pipeYatay = emptyPipeMap();
  const pipeDikey = emptyPipeMap();

  if (hasHot)  [[hyHotStart, hyHotL1],[hyHotD2, hyHotL2],[hyHotD3, hyHotL3]].forEach(([d,l]) => { if(d) pipeYatay[d] = (pipeYatay[d]||0)+l; });
  if (hasCold) [[hyColdStart,hyColdL1],[hyColdD2,hyColdL2],[hyColdD3,hyColdL3]].forEach(([d,l])=>{ if(d) pipeYatay[d]=(pipeYatay[d]||0)+l; });
  if (hasCirc) pipeYatay[circDiam] = (pipeYatay[circDiam]||0) + circYatay;

  allSegs.forEach(s => {
    if (hasHot)  pipeDikey[s.diam] = (pipeDikey[s.diam]||0) + s.m*shaft;
    if (hasCold) pipeDikey[s.diam] = (pipeDikey[s.diam]||0) + s.m*shaft;
  });
  if (hasCirc) pipeDikey[circDiam] = (pipeDikey[circDiam]||0) + circDikey*shaft + circFlat*totalFlats;
  if (hasHot)  pipeDikey[brDiam]   = (pipeDikey[brDiam]  ||0) + brHot*totalFlats;
  if (hasCold) pipeDikey[brDiam]   = (pipeDikey[brDiam]  ||0) + brCold*totalFlats;

  // ── 4. Dirsek hesabı ──────────────────────────────────────────────
  const elbows = calcElbows(pipeYatay, pipeDikey, katsayilar, totalFlats, hasHot, hasCold, brDiam);

  // ── 5. QTY haritası başlat ────────────────────────────────────────
  const QTY = {};
  PRICES.forEach(p => { QTY[p.id] = 0; });

  // Borular
  DIAM_ORDER.forEach(d => { if (pipe[d] > 0) QTY[d] = (QTY[d]||0) + pipe[d]; });

  // Dirsekler (e+çap)
  DIAM_ORDER.forEach(d => {
    const eid = 'e' + d.slice(1);
    if (elbows[d] > 0) QTY[eid] = (QTY[eid]||0) + elbows[d];
  });

  // ── 6. Şaft başı ek parçalar ───────────────────────────────────────
  const hatSayFittings = (hasHot ? 1 : 0) + (hasCold ? 1 : 0);
  const { teeTotal, iteeTotal } = calcShaftFittings(shaft, hatSayFittings, katsayilar);
  applyFittingsToQty(QTY, teeTotal, iteeTotal);

  // ── 6a. Manşon — fizik tabanlı (her 4m boru = 1 manşon) ──────────
  const couplings = calcCouplings(pipe);
  Object.entries(couplings).forEach(([mId, qty]) => {
    if (QTY[mId] !== undefined) QTY[mId] = (QTY[mId] || 0) + qty;
    else QTY[mId] = qty; // PRICES'ta olmayan çap (gelecekte eklenecek)
  });

  // ── 6b. Redüksiyon — fizik tabanlı (çap geçişi = 1 redüksiyon) ───
  // Yatay hat çap geçişlerini topla
  const hyTrans = [];
  if (hasHot) {
    if (hyHotD2 && hyHotL2 > 0) hyTrans.push([hyHotStart, hyHotD2]);
    if (hyHotD3 && hyHotL3 > 0) hyTrans.push([hyHotD2 || hyHotStart, hyHotD3]);
  }
  if (hasCold) {
    if (hyColdD2 && hyColdL2 > 0) hyTrans.push([hyColdStart, hyColdD2]);
    if (hyColdD3 && hyColdL3 > 0) hyTrans.push([hyColdD2 || hyColdStart, hyColdD3]);
  }
  const reductions = calcReductions(allSegs, shaft, hatSayFittings, hyTrans);
  Object.entries(reductions).forEach(([rId, qty]) => {
    if (QTY[rId] !== undefined) QTY[rId] = (QTY[rId] || 0) + qty;
    else QTY[rId] = qty;
  });

  // ── 7. Daire sayaç grubu ──────────────────────────────────────────
  const sayacTotal  = totalFlats * ((hasHot ? dHotmeter : 0) + (hasCold ? dColdmeter : 0));
  const dAdaQ       = Math.ceil(sayacTotal * (dAda      ?? 1));
  const dAda2Q      = Math.ceil(sayacTotal * (dAda2     ?? 1));
  const dFiltQ      = Math.ceil(sayacTotal * dFilt);
  const dCvQ        = Math.ceil(sayacTotal * dCv);
  const dNipQ       = Math.ceil(dCvQ * dNip);
  const dSaatrekQ   = Math.ceil(sayacTotal * dSaatrek);
  const dValveInQ   = Math.ceil(sayacTotal * (dValveIn  ?? 1));  // Ana kesme — sayaç önü (branşman çapı)
  const dValveQ     = Math.ceil(sayacTotal * dValve);             // İkinci vana — sayaç arkası (bir küçük)

  // Büyük adaptör = branşman çapı, küçük = bir boy küçük
  const adaDaire    = 'ada' + brDiam.replace('q','');
  const adaDaire2   = brDiam === 'q32' ? 'ada25' : 'ada25';  // bir küçük → q25/¾"
  const filtDaire   = brDiam === 'q32' ? 'f1'   : 'f34';
  const cvDaire     = brDiam === 'q32' ? 'cv1'  : 'cv34';
  const nipDaire    = brDiam === 'q32' ? 'n114' : 'n34';
  const saatDaire   = brDiam === 'q32' ? 'saatrek32' : 'saatrek25';
  // Ana kesme vanası = branşman çapı; ikinci vana = bir küçük çap
  const vanaInDaire = brDiam === 'q32' ? 'pir-v1'  : brDiam === 'q25' ? 'pir-v34' : 'pir-v12';
  const vanaDaire   = brDiam === 'q32' ? 'pir-v34' : 'pir-v12';

  QTY[adaDaire]    = (QTY[adaDaire]   ||0) + dAdaQ;
  QTY[adaDaire2]   = (QTY[adaDaire2]  ||0) + dAda2Q;
  QTY[filtDaire]   = (QTY[filtDaire]  ||0) + dFiltQ;
  if (dCvQ    > 0) QTY[cvDaire]    = (QTY[cvDaire]   ||0) + dCvQ;
  if (dNipQ   > 0) QTY[nipDaire]   = (QTY[nipDaire]  ||0) + dNipQ;
  QTY[saatDaire]   = (QTY[saatDaire] ||0) + dSaatrekQ;
  QTY[vanaInDaire] = (QTY[vanaInDaire]||0) + dValveInQ;
  QTY[vanaDaire]   = (QTY[vanaDaire]  ||0) + dValveQ;

  // ── 8. Kolektörler ────────────────────────────────────────────────
  const kolSummary = [];
  (kolektors || []).forEach(kol => {
    const summary = processKolektorRows(QTY, kol.hatId, kol.mat, kol.kdiam, kol.rows, kol.kepAdet, pipe);
    kolSummary.push(summary);
    // Kolektör borusu da pipe'a eklendi — QTY'yi de güncelle
    if (pipe[kol.kdiam] > 0) QTY[kol.kdiam] = pipe[kol.kdiam];
  });

  // ── 9. Şaft başı vanalar ──────────────────────────────────────────
  const svHatlar = (hasHot ? 1 : 0) + (hasCold ? 1 : 0);
  if (svHatlar > 0 && shaftVanaAdet > 0) {
    const svId = shaftVanaMat === 'ppr' ? pprVanaId(shaftVanaDiam) : pirVanaId(shaftVanaDiam);
    QTY[svId] = (QTY[svId]||0) + shaftVanaAdet * shaft * svHatlar;
  }

  // Her N katta bir şaft PPR kesme vanası
  if (shaft4katCk) {
    const aktifHatlar = (hasHot ? 1 : 0) + (hasCold ? 1 : 0);
    allSegs.forEach(seg => {
      const katSayisi   = Math.round(seg.m / floorH);
      const vanaNoktasi = Math.max(0, Math.floor(katSayisi / vertStep) - 1);
      const segVanaId   = pprVanaId(seg.diam);
      QTY[segVanaId] = (QTY[segVanaId]||0) + vanaNoktasi * shaft * aktifHatlar;
    });
  }

  // ── 10. Mekanik oda ───────────────────────────────────────────────
  applyHidroforToQty(QTY, {
    hidroforAdet, hidroforDiam, hidroforVana, hidroforCv,
    hidroforUnion, hidroforUnionDiam, hidroforMano,
    emisDiam, emisVana, emisNip, emisFilt,
  });
  applyBoylerToQty(QTY, { boylerAdet, boylerDiam, boylerVana });
  applyBdToQty(QTY, activeZones, floors);
  applyFixedMechToQty(QTY, { pump, mano, term, air, mainf, mainfDiam });

  // ── 11. Maliyet ───────────────────────────────────────────────────
  const { lines, grandNet, kdvAmt, grandTotal } = calcCost(QTY, priceOverride, kdvRate);

  // ── 12. Özet KPI değerleri ────────────────────────────────────────
  const totalPipe = Object.values(pipe).reduce((a, b) => a + b, 0);
  const circTotal = hasCirc
    ? circYatay + circDikey * shaft + circFlat * totalFlats
    : 0;
  const hotYatay  = hasHot  ? (hyHotL1||0)  + (hyHotL2||0)  + (hyHotL3||0)  : 0;
  const coldYatay = hasCold ? (hyColdL1||0) + (hyColdL2||0) + (hyColdL3||0) : 0;
  const hotDikey  = hasHot  ? allSegs.reduce((s, sg) => s + sg.m * shaft, 0) : 0;
  const coldDikey = hasCold ? allSegs.reduce((s, sg) => s + sg.m * shaft, 0) : 0;

  return {
    QTY,
    pipe,
    allSegs,
    lines,
    grandNet,
    kdvAmt,
    grandTotal,
    kolSummary,
    totalPipe,
    circTotal,
    hotYatay, hotDikey,
    coldYatay, coldDikey,
    totalFlats,
    shaftVanaTotal: shaftVanaAdet * shaft * svHatlar,
    flatValve: dValveInQ + dValveQ,
  };
}
