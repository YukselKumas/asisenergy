// ── useValidation — Doğrulama & Kalite Kontrol Hook'u ─────────────────
//
// config + result alır; standart sektör katsayıları ile sistemi karşılaştırır.
//
//  • QAI : Kullanıcı katsayıları vs standart katsayılar → dirsek sapması %
//  • IDR : Mantık tutarsızlıkları (sirkülasyon ama uzunluk=0, T yok ama iki hat vs.)
//  • ARE : Kaç çap grubunun katsayısı standart ±%20 bandında
//  • Crane TP-410 eşdeğer uzunluk hesabı
//  • Supabase'e validation_results tablosuna kayıt

import { useMemo, useCallback } from 'react';
import { supabase }             from '../lib/supabase.js';
import { DIAM_ORDER }           from '../lib/calculator/constants.js';
import { calcAllSegments }      from '../lib/calculator/vertical.js';

// ── Sabitler ──────────────────────────────────────────────────────────

// PPR PN20 boru iç çapları (metre)
const INNER_D = {
  q20:0.0132, q25:0.0166, q32:0.0212, q40:0.0266,
  q50:0.0332, q63:0.0420, q75:0.0500, q90:0.0600, q110:0.0732,
};

// Crane TP-410 Le/D eşdeğer uzunluk oranları
const LE_D = {
  elbow90:30, elbow45:16, teeThru:20, teeBranch:60,
  coupling:2, valveBall:8, reduction:10,
};

// Standart endüstri katsayıları (referans değer)
const STD_H = 1.5; // yatay dirsek / 10m
const STD_V = 0.8; // dikey dirsek / 10m

// Equal T çap map'i (ürün ID → boru çapı)
const TEE_DIAM = { t110:'q110', t90:'q90', t75:'q75', t63:'q63', t50:'q50', t40:'q40' };
// İnegal T → ana çap
const ITEE_DIAM = { ite6350:'q63', ite5040:'q50', ite4032:'q40' };

// ── Yardımcı fonksiyonlar ─────────────────────────────────────────────

function emptyByDiam() {
  const o = {};
  DIAM_ORDER.forEach(d => { o[d] = 0; });
  return o;
}

/**
 * config'den pipeYatay ve pipeDikey haritalarını türetir.
 * index.js bölüm 3 ile aynı mantık — index.js'e dokunmadan çalışır.
 */
function derivePipeMaps(config, totalFlats) {
  const {
    hasHot, hasCold, hasCirc,
    hyHotStart,  hyHotL1=0,  hyHotD2,  hyHotL2=0,  hyHotD3,  hyHotL3=0,
    hyColdStart, hyColdL1=0, hyColdD2, hyColdL2=0, hyColdD3, hyColdL3=0,
    circDiam='q50', circYatay=0,
    brDiam='q25', brHot=0, brCold=0,
    blokSayisi=1, shaft=1,
    zones=[], vertZoneCount, vertStep=4,
    shaftFloor, firstFloor, floorH=4,
  } = config;

  const blokMult   = Math.max(1, blokSayisi || 1);
  const totalShaft = Math.max(1, shaft || 1) * blokMult;
  const shaftStart = shaftFloor ?? firstFloor ?? 1;
  const activeZones = (zones || []).slice(0, vertZoneCount || zones.length);

  let allSegs = [];
  try {
    if (activeZones.length > 0) {
      allSegs = calcAllSegments(activeZones, floorH, vertStep, shaftStart);
    }
  } catch { allSegs = []; }

  const pipeYatay = emptyByDiam();
  const pipeDikey = emptyByDiam();

  if (hasHot)
    [[hyHotStart,hyHotL1],[hyHotD2,hyHotL2],[hyHotD3,hyHotL3]]
      .forEach(([d,l]) => { if (d && l > 0) pipeYatay[d] = (pipeYatay[d]||0) + l * blokMult; });
  if (hasCold)
    [[hyColdStart,hyColdL1],[hyColdD2,hyColdL2],[hyColdD3,hyColdL3]]
      .forEach(([d,l]) => { if (d && l > 0) pipeYatay[d] = (pipeYatay[d]||0) + l * blokMult; });
  if (hasCirc && circDiam)
    pipeYatay[circDiam] = (pipeYatay[circDiam]||0) + circYatay * blokMult;

  const autoCircDikey = allSegs.reduce((s, sg) => s + sg.m, 0);

  allSegs.forEach(s => {
    if (hasHot)  pipeDikey[s.diam] = (pipeDikey[s.diam]||0) + s.m * totalShaft;
    if (hasCold) pipeDikey[s.diam] = (pipeDikey[s.diam]||0) + s.m * totalShaft;
  });
  if (hasCirc && circDiam)
    pipeDikey[circDiam] = (pipeDikey[circDiam]||0) + autoCircDikey * totalShaft;
  if (hasHot  && brDiam) pipeDikey[brDiam] = (pipeDikey[brDiam]||0) + brHot  * totalFlats;
  if (hasCold && brDiam) pipeDikey[brDiam] = (pipeDikey[brDiam]||0) + brCold * totalFlats;

  return { pipeYatay, pipeDikey };
}

/**
 * Standart katsayılarla (STD_H / STD_V) önerilen dirsek adedini hesaplar.
 */
function computeSuggestedFittings(pipeYatay, pipeDikey, config, totalFlats) {
  const { hasHot, hasCold, brDiam='q25' } = config;
  const suggested = {};

  DIAM_ORDER.forEach(d => {
    const yatay = pipeYatay[d] || 0;
    const dikey = pipeDikey[d] || 0;
    if (yatay + dikey <= 0) return;
    const eid = 'e' + d.slice(1);
    suggested[eid] = Math.ceil(yatay / 10 * STD_H + dikey / 10 * STD_V);
  });

  // Branşman sabit dirsek: daire başına 2 adet
  const hatSay = (hasHot ? 1 : 0) + (hasCold ? 1 : 0);
  const brEid = 'e' + (brDiam || 'q25').slice(1);
  if (hatSay > 0 && totalFlats > 0)
    suggested[brEid] = (suggested[brEid] || 0) + Math.ceil(totalFlats * 2 * hatSay);

  return suggested;
}

/**
 * QAI — her dirsek türü için (öneri - gerçek) / öneri × 100
 */
function computeQAI(suggested, actual) {
  const details = [];
  let totalDiff = 0, count = 0;

  Object.entries(suggested).forEach(([id, sVal]) => {
    if (sVal <= 0) return;
    const aVal = actual[id] || 0;
    const diffPct = Math.abs(aVal - sVal) / sVal * 100;
    const status  = diffPct <= 10 ? 'ok' : diffPct <= 20 ? 'warn' : 'error';
    details.push({ id, suggested: sVal, actual: aVal, diffPct, status });
    totalDiff += diffPct;
    count++;
  });

  return { avg: count > 0 ? totalDiff / count : 0, details };
}

/**
 * Crane TP-410 eşdeğer uzunluk — tüm çaplarda toplanır.
 */
function computeEffectiveLength(result, pipeYatay, pipeDikey) {
  let L_straight = 0;
  let Le_total   = 0;

  DIAM_ORDER.forEach(d => {
    const iD      = INNER_D[d] || 0.025;
    const eid     = 'e' + d.slice(1);
    const mid     = 'm' + d.slice(1);
    L_straight   += (pipeYatay[d] || 0) + (pipeDikey[d] || 0);
    Le_total     += (result.QTY[eid] || 0) * LE_D.elbow90   * iD;
    Le_total     += (result.QTY[mid] || 0) * LE_D.coupling   * iD;
  });

  // Equal T
  Object.entries(TEE_DIAM).forEach(([id, d]) => {
    Le_total += (result.QTY[id] || 0) * LE_D.teeBranch * (INNER_D[d] || 0.025);
  });
  // İnegal T
  Object.entries(ITEE_DIAM).forEach(([id, d]) => {
    Le_total += (result.QTY[id] || 0) * LE_D.teeBranch * (INNER_D[d] || 0.025);
  });
  // Redüksiyonlar (avg 32mm iç çap)
  Object.keys(result.QTY).filter(k => k.startsWith('r')).forEach(k => {
    Le_total += (result.QTY[k] || 0) * LE_D.reduction * 0.032;
  });

  const L_effective    = L_straight + Le_total;
  const L_recommended  = L_effective * 1.15;
  return { L_straight, Le_total, L_effective, L_recommended };
}

/**
 * IDR — mantık tutarsızlıklarını tespit eder.
 */
function computeIDR(config, result) {
  const flags = [];
  const {
    hasHot, hasCold, hasCirc,
    circYatay=0, brHot=0, brCold=0,
    shaft=1, blokSayisi=1, shaftVanaAdet=0, floors=[],
  } = config;

  if (hasCirc && (circYatay || 0) <= 0)
    flags.push({ code:'CIRC_NO_HORIZONTAL', message:'Sirkülasyon hattı aktif ama yatay boru uzunluğu 0' });

  if ((hasHot || hasCold) && (brHot || 0) <= 0 && (brCold || 0) <= 0)
    flags.push({ code:'NO_BRANCH_PIPE', message:'Sıcak/soğuk hat var ama branşman borusu uzunluğu girilmemiş' });

  const totalShaft = Math.max(1, shaft || 1) * Math.max(1, blokSayisi || 1);
  if (totalShaft > 1 && (shaftVanaAdet || 0) === 0)
    flags.push({ code:'SHAFT_VALVE_MISSING', message:`${totalShaft} şaft tanımlanmış ama şaft başı vana sayısı 0` });

  const totalFlats = (floors || []).reduce((s, f) => s + (f.count || 0), 0);
  if (totalFlats <= 0)
    flags.push({ code:'NO_FLOOR_DATA', message:'Kat başı daire sayısı girilmemiş (Adım 3)' });

  // Hem sıcak hem soğuk varsa Te bekleniyor
  if (hasHot && hasCold) {
    const tTotal  = Object.keys(TEE_DIAM).reduce((s, id) => s + (result.QTY[id] || 0), 0);
    const itTotal = Object.keys(ITEE_DIAM).reduce((s, id) => s + (result.QTY[id] || 0), 0);
    if (tTotal + itTotal === 0)
      flags.push({ code:'NO_TEE_TWO_LINES', message:'Sıcak + soğuk hat var ama Te/İnegal Te hesaplanmamış — katsayıları kontrol edin' });
  }

  return flags;
}

/**
 * ARE — kaç çap grubunun katsayısı standart ±%20 bandında?
 */
function computeARE(config, pipeYatay, pipeDikey) {
  const { katsayilar = {} } = config;
  let inStandard = 0, total = 0;

  DIAM_ORDER.forEach(d => {
    if ((pipeYatay[d] || 0) + (pipeDikey[d] || 0) <= 0) return;
    const key  = d.slice(1);
    const userH = parseFloat(katsayilar['h' + key] ?? STD_H);
    const userV = parseFloat(katsayilar['v' + key] ?? STD_V);
    const hDiff = Math.abs(userH - STD_H) / STD_H * 100;
    const vDiff = Math.abs(userV - STD_V) / STD_V * 100;
    total++;
    if (hDiff <= 20 && vDiff <= 20) inStandard++;
  });

  return { inStandard, total, ratio: total > 0 ? (inStandard / total) * 100 : 100 };
}

/**
 * 0-100 arası genel doğrulama puanı.
 */
function computeScore(idr, qai, are) {
  let score = 100;
  score -= idr.length * 10;
  if      (qai.avg > 30) score -= 20;
  else if (qai.avg > 20) score -= 10;
  else if (qai.avg > 10) score -=  5;
  if      (are.ratio < 60) score -= 15;
  else if (are.ratio < 80) score -=  8;
  return Math.max(0, Math.min(100, score));
}

/**
 * Supabase'e validation_results tablosuna kayıt.
 */
async function persistValidation(projectId, v) {
  const { error } = await supabase.from('validation_results').insert({
    project_id:               projectId || null,
    validation_score:         v.score,
    inconsistency_flags:      v.idr,
    auto_calculated_fittings: v.suggestedFittings,
    user_entered_fittings:    v.actualFittings,
    effective_length_m:       parseFloat(v.effectiveLength.L_effective.toFixed(2)),
    metrics: {
      qai:        parseFloat(v.qai.avg.toFixed(2)),
      qaiDetails: v.qai.details,
      are:        v.are,
    },
  });
  if (error) throw error;
}

// ── Hook ─────────────────────────────────────────────────────────────

/**
 * @param {Object} config  - calculationStore.config
 * @param {Object} result  - calculationStore.result  (null → sonuç yok)
 * @returns {{ validation, save }}
 */
export function useValidation(config, result) {
  const validation = useMemo(() => {
    if (!config || !result?.QTY) return null;
    try {
      const totalFlats = (config.floors || []).reduce((s, f) => s + (f.count || 0), 0);
      const { pipeYatay, pipeDikey } = derivePipeMaps(config, totalFlats);

      const suggestedFittings = computeSuggestedFittings(pipeYatay, pipeDikey, config, totalFlats);

      // Mevcut dirsek QTY'si ("kullanıcı / hesaplanan" taraf)
      const actualFittings = {};
      DIAM_ORDER.forEach(d => {
        const eid = 'e' + d.slice(1);
        if ((result.QTY[eid] || 0) > 0 || (suggestedFittings[eid] || 0) > 0)
          actualFittings[eid] = result.QTY[eid] || 0;
      });

      const qai            = computeQAI(suggestedFittings, actualFittings);
      const effectiveLength = computeEffectiveLength(result, pipeYatay, pipeDikey);
      const idr            = computeIDR(config, result);
      const are            = computeARE(config, pipeYatay, pipeDikey);
      const score          = computeScore(idr, qai, are);

      return { score, idr, qai, are, suggestedFittings, actualFittings, effectiveLength };
    } catch (err) {
      console.error('[useValidation]', err);
      return null;
    }
  }, [config, result]);

  const save = useCallback(async (projectId) => {
    if (!validation) throw new Error('Doğrulama verisi yok');
    await persistValidation(projectId, validation);
  }, [validation]);

  return { validation, save };
}
