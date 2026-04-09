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
import { calcElbows, calcCouplings, calcReductions } from './fittings.js';
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
    circDiam, circYatay,
    brDiam, brHot, brCold,
    dFitDiam,    // Daire sayaç bağlantısı çapı (boru çapından bağımsız)
    katsayilar,
    kolektors,   // [{hatId, zoneIdx, mat, kdiam, rows:[{vd,hasCv}], kepAdet}]
    shaftVanaMat, shaftVanaDiam, shaftVanaAdet, shaft4katCk,
    hidroforAdet, hidroforDiam, hidroforVana, hidroforCv, hidroforUnion, hidroforUnionDiam, hidroforMano,
    emisDiam, emisVana, emisNip, emisFilt,
    boylerAdet, boylerDiam, boylerVana,
    pump, mano, term, air, mainf, mainfDiam,
    dHotmeter, dColdmeter, dAda, dAda2, dFilt, dCv, dNip, dSaatrek, dValveIn, dValve,
    kelepceSpacing,
    hotDownFloors, hotDownDiam,
    coldDownFloors, coldDownDiam,
    blokSayisi,
  } = config;

  // Çok binalı destek: shaft = bina başına şaft; totalShaft = tüm binaların toplam şaft sayısı
  const blokMult   = blokSayisi || 1;
  const totalShaft = (shaft || 1) * blokMult;

  const circFlat = 0; // Daire başı bağlantı kaldırıldı

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

  // Sirkülasyon dikey: sıcak suyla aynı fiziksel yükseklik.
  // Zone konfigürasyonundan türetilir (config.floor değil) — tutarlılık için.
  const autoCircDikey = allSegs.reduce((s, sg) => s + sg.m, 0);

  // ── 2. Boru haritası ───────────────────────────────────────────────
  const pipe = emptyPipeMap();

  addHorizontalPipes(pipe, hasHot, hasCold, hasCirc, {
    hyHotStart, hyHotL1, hyHotD2, hyHotL2, hyHotD3, hyHotL3,
    hyColdStart, hyColdL1, hyColdD2, hyColdL2, hyColdD3, hyColdL3,
    circDiam, circYatay,
  }, blokMult);

  addVerticalPipes(pipe, allSegs, totalShaft, hasHot, hasCold, hasCirc, {
    circDiam, circDikey: autoCircDikey, circFlat, totalFlats,
  });

  addBranchPipes(pipe, hasHot, hasCold, {
    brDiam, brHot, brCold, totalFlats,
  });

  // ── 3. Yatay/dikey boru ayrımı (dirsek için) ─────────────────────
  const pipeYatay = emptyPipeMap();
  const pipeDikey = emptyPipeMap();

  if (hasHot)  [[hyHotStart, hyHotL1],[hyHotD2, hyHotL2],[hyHotD3, hyHotL3]].forEach(([d,l]) => { if(d) pipeYatay[d] = (pipeYatay[d]||0)+l*blokMult; });
  if (hasCold) [[hyColdStart,hyColdL1],[hyColdD2,hyColdL2],[hyColdD3,hyColdL3]].forEach(([d,l])=>{ if(d) pipeYatay[d]=(pipeYatay[d]||0)+l*blokMult; });
  if (hasCirc) pipeYatay[circDiam] = (pipeYatay[circDiam]||0) + circYatay*blokMult;

  allSegs.forEach(s => {
    if (hasHot)  pipeDikey[s.diam] = (pipeDikey[s.diam]||0) + s.m*totalShaft;
    if (hasCold) pipeDikey[s.diam] = (pipeDikey[s.diam]||0) + s.m*totalShaft;
  });
  if (hasCirc) pipeDikey[circDiam] = (pipeDikey[circDiam]||0) + autoCircDikey*totalShaft;
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

  // ── 6. Şaft başı branşman Te — fizik tabanlı ──────────────────────
  // Paralel model: Her zone kendi riseridir. Boru shaftStart'tan zone.to'ya uzanır,
  // ama Te yalnızca dairelerin bulunduğu katlarda (zone.from → zone.to) takılır.
  //
  // Her segment için:
  //   firstAptRel = zone.from - shaftStart + 1   (ilk daireli katın göreli indeksi)
  //   aptKats     = segmentte firstAptRel üzerinde kalan kat sayısı
  //   count       = aptKats × hatSayFittings × totalShaft
  const hatSayFittings = (hasHot ? 1 : 0) + (hasCold ? 1 : 0);
  if (hatSayFittings > 0) {
    allSegs.forEach(seg => {
      const zone        = activeZones[seg.zone] || {};
      const zoneFrom    = zone.from ?? shaftStart;
      const firstAptRel = Math.max(1, zoneFrom - shaftStart + 1); // ≥ 1
      // Segmentte firstAptRel'den itibaren kaç kat var?
      const aptKats = Math.max(0, seg.katTo - Math.max(seg.katFrom - 1, firstAptRel - 1));
      if (aptKats <= 0) return;

      const count = aptKats * hatSayFittings * totalShaft;
      if (seg.diam === brDiam) {
        const tId = 't' + seg.diam.slice(1);
        QTY[tId] = (QTY[tId] || 0) + count;
      } else {
        const dimIdx1 = DIAM_ORDER.indexOf(seg.diam);
        const dimIdx2 = DIAM_ORDER.indexOf(brDiam);
        const mainD   = dimIdx1 > dimIdx2 ? seg.diam : brDiam;
        const branchD = dimIdx1 > dimIdx2 ? brDiam   : seg.diam;
        const iteId   = 'ite' + mainD.slice(1) + branchD.slice(1);
        QTY[iteId] = (QTY[iteId] || 0) + count;
      }
    });
  }

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
  const reductions = calcReductions(allSegs, totalShaft, hatSayFittings, hyTrans);
  Object.entries(reductions).forEach(([rId, qty]) => {
    if (QTY[rId] !== undefined) QTY[rId] = (QTY[rId] || 0) + qty;
    else QTY[rId] = qty;
  });

  // ── 7. Daire sayaç grubu ──────────────────────────────────────────
  // dFitDiam: tüm daire sayaç armatürlerinin çapı (boru çapından bağımsız seçilebilir)
  const fd = dFitDiam || brDiam || 'q25';
  const sayacTotal  = totalFlats * ((hasHot ? dHotmeter : 0) + (hasCold ? dColdmeter : 0));
  const dAdaQ       = Math.ceil(sayacTotal * (dAda   ?? 1));
  const dAda2Q      = Math.ceil(sayacTotal * (dAda2  ?? 1));
  const dFiltQ      = Math.ceil(sayacTotal * dFilt);
  const dCvQ        = Math.ceil(sayacTotal * dCv);
  const dNipQ       = Math.ceil(sayacTotal * dNip);   // sayaç başına — CV'ye bağlı değil
  const dSaatrekQ   = Math.ceil(sayacTotal * dSaatrek);
  const dValveInQ   = Math.ceil(sayacTotal * (dValveIn ?? 1));
  const dValveQ     = Math.ceil(sayacTotal * dValve);

  // Tüm armatürler dFitDiam çapında — aynı çap, tutarlı bağlantı
  const adaDaire    = 'ada' + fd.replace('q', '');
  const adaDaire2   = adaDaire;  // aynı çap (giriş = çıkış)
  const filtDaire   = fd === 'q32' ? 'f1'        : 'f34';
  const cvDaire     = fd === 'q32' ? 'cv1'       : 'cv34';
  const nipDaire    = fd === 'q32' ? 'n114'      : fd === 'q20' ? 'n12' : 'n34';
  const saatDaire   = fd === 'q32' ? 'saatrek32' : 'saatrek25';
  // Vanalar: dFitDiam çapında — ½" (pir-v12) yalnızca enstrüman bağlantısında
  const vanaInDaire = fd === 'q32' ? 'pir-v1' : fd === 'q25' ? 'pir-v34' : 'pir-v34';
  const vanaDaire   = vanaInDaire;  // aynı çap

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
    QTY[svId] = (QTY[svId]||0) + shaftVanaAdet * totalShaft * svHatlar;
  }

  // Her N katta bir şaft PPR kesme vanası
  if (shaft4katCk) {
    const aktifHatlar = (hasHot ? 1 : 0) + (hasCold ? 1 : 0);
    allSegs.forEach(seg => {
      const katSayisi   = Math.round(seg.m / floorH);
      const vanaNoktasi = Math.max(0, Math.floor(katSayisi / vertStep) - 1);
      const segVanaId   = pprVanaId(seg.diam);
      QTY[segVanaId] = (QTY[segVanaId]||0) + vanaNoktasi * totalShaft * aktifHatlar;
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

  // Zone bitişi manometreleri (her zone sonu için 1 adet)
  QTY['mano'] = (QTY['mano'] || 0) + activeZones.length;

  // ── 10a. Şaft giriş noktası — aşağı inen hat Te + Redüksiyon ─────
  // Model: yatay hat şaft girişinde bölünür → yukarı (mevcut zone sistemi) + aşağı inen
  // Te tipi: çaplar aynıysa Equal Te, farklıysa Equal Te + Redüksiyon
  const hotEndDiam  = (hyHotD3  && hyHotL3  > 0) ? hyHotD3  : (hyHotD2  && hyHotL2  > 0) ? hyHotD2  : hyHotStart;
  const coldEndDiam = (hyColdD3 && hyColdL3 > 0) ? hyColdD3 : (hyColdD2 && hyColdL2 > 0) ? hyColdD2 : hyColdStart;

  const addJunctionFittings = (endDiam, downDiam, downFloors) => {
    if (!endDiam || !(downFloors > 0)) return;
    const endN  = endDiam.slice(1);   // e.g. '75'
    const downN = downDiam.slice(1);  // e.g. '50'
    // Equal Te at the junction (run diam)
    const tId = 't' + endN;
    QTY[tId] = (QTY[tId] || 0) + totalShaft;
    // If down riser is smaller → add reducer
    if (endDiam !== downDiam) {
      const eNN = parseInt(endN);
      const dNN = parseInt(downN);
      const bigN   = eNN > dNN ? endN  : downN;
      const smallN = eNN < dNN ? endN  : downN;
      const rId = 'r' + bigN + smallN;
      if (QTY[rId] !== undefined) QTY[rId] = (QTY[rId] || 0) + totalShaft;
      else QTY[rId] = totalShaft;
    }
    // Down riser pipe
    const downM = downFloors * (floorH || 4) * totalShaft;
    QTY[downDiam] = (QTY[downDiam] || 0) + downM;
    pipe[downDiam] = (pipe[downDiam] || 0) + downM;
  };

  if (hasHot)  addJunctionFittings(hotEndDiam,  hotDownDiam  || 'q50', hotDownFloors  || 0);
  if (hasCold) addJunctionFittings(coldEndDiam, coldDownDiam || 'q50', coldDownFloors || 0);

  // ── 10b. Kelepçe — tüm boru hatları (yatay + dikey + aşağı inen) ─
  // spacing = kelepceSpacing config değeri (varsayılan 4m)
  const spacing = kelepceSpacing || 4;
  const kelepMap = {}; // diam → toplam metre (kelepçe hesabı için)
  const addKelep = (d, m) => { if (d && m > 0) kelepMap[d] = (kelepMap[d] || 0) + m; };

  // Yatay borular — blokMult ile çarpılır (her bina kendi yatay hattına sahip)
  if (hasHot) {
    addKelep(hyHotStart, (hyHotL1 || 0) * blokMult);
    addKelep(hyHotD2,    (hyHotL2 || 0) * blokMult);
    addKelep(hyHotD3,    (hyHotL3 || 0) * blokMult);
  }
  if (hasCold) {
    addKelep(hyColdStart, (hyColdL1 || 0) * blokMult);
    addKelep(hyColdD2,    (hyColdL2 || 0) * blokMult);
    addKelep(hyColdD3,    (hyColdL3 || 0) * blokMult);
  }
  if (hasCirc) addKelep(circDiam, (circYatay || 0) * blokMult);

  // Dikey borular (şaft kolonu)
  const hatSayV = (hasHot ? 1 : 0) + (hasCold ? 1 : 0);
  allSegs.forEach(s => {
    if (hatSayV > 0) addKelep(s.diam, s.m * totalShaft * hatSayV);
  });
  if (hasCirc) addKelep(circDiam, autoCircDikey * totalShaft);

  // Branşman boruları
  if (hasHot)  addKelep(brDiam, (brHot  || 0) * totalFlats);
  if (hasCold) addKelep(brDiam, (brCold || 0) * totalFlats);

  // Aşağı inen hatlar
  if (hasHot  && (hotDownFloors  || 0) > 0) addKelep(hotDownDiam  || 'q50', (hotDownFloors  || 0) * (floorH || 4) * totalShaft);
  if (hasCold && (coldDownFloors || 0) > 0) addKelep(coldDownDiam || 'q50', (coldDownFloors || 0) * (floorH || 4) * totalShaft);

  // Kelepçe adet → QTY
  let totalClamps = 0;
  Object.entries(kelepMap).forEach(([d, m]) => {
    if (m > 0) {
      const kId = 'kelep' + d.slice(1);
      const cnt = Math.ceil(m / spacing);
      totalClamps += cnt;
      if (QTY[kId] !== undefined) QTY[kId] = (QTY[kId] || 0) + cnt;
    }
  });

  // Montaj donanımı (kelepçe başına 1 dübel + 1 civata + 2 pul)
  QTY['dubel']  = (QTY['dubel']  || 0) + totalClamps;
  QTY['civata'] = (QTY['civata'] || 0) + totalClamps;
  QTY['pul']    = (QTY['pul']    || 0) + totalClamps * 2;

  // ── 11. Maliyet ───────────────────────────────────────────────────
  const { lines, grandNet, kdvAmt, grandTotal } = calcCost(QTY, priceOverride, kdvRate);

  // ── 12. Özet KPI değerleri ────────────────────────────────────────
  const totalPipe = Object.values(pipe).reduce((a, b) => a + b, 0);
  const circTotal = hasCirc
    ? circYatay * blokMult + autoCircDikey * totalShaft
    : 0;
  const hotYatay  = hasHot  ? ((hyHotL1||0)  + (hyHotL2||0)  + (hyHotL3||0))  * blokMult : 0;
  const coldYatay = hasCold ? ((hyColdL1||0) + (hyColdL2||0) + (hyColdL3||0)) * blokMult : 0;
  const hotDikey  = hasHot  ? allSegs.reduce((s, sg) => s + sg.m * totalShaft, 0) : 0;
  const coldDikey = hasCold ? allSegs.reduce((s, sg) => s + sg.m * totalShaft, 0) : 0;
  const circDikeyTotal = hasCirc ? autoCircDikey * totalShaft : 0;

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
    circDikeyTotal,
    hotYatay, hotDikey,
    coldYatay, coldDikey,
    totalFlats,
    shaftVanaTotal: shaftVanaAdet * totalShaft * svHatlar,
    flatValve: dValveInQ + dValveQ,
  };
}
