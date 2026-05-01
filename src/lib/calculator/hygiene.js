// ── Hijyen Kontrolü — VDI 6023 / DVGW W 551 / TS EN 806 ───────────────
// Lejyonella riski, durgun hacim ve sıcaklık uygunluk kontrolleri.

import {
  HOT_STORAGE_MIN, CIRC_RETURN_MIN, COLD_MAX,
  NON_CIRC_VOLUME_MAX_L, PRV_TRIGGER_BAR, GRAVITY,
  pipeVolumePerM, INNER_D, WATER_DENSITY,
} from './standards.js';

/**
 * Sıcak su sistemi sıcaklık uygunluk kontrolü — DVGW W 551.
 *
 * @param {number} storageTemp_C   - boyler depolama sıcaklığı (°C)
 * @param {number} returnTemp_C    - sirkülasyon dönüş sıcaklığı (°C)
 * @param {number} coldMax_C       - soğuk hat max sıcaklık (°C)
 * @param {boolean} hasCirc        - sirkülasyon hattı var mı
 * @returns {Array<{code, severity, message}>}
 */
export function checkTemperatures(
  storageTemp_C = HOT_STORAGE_MIN,
  returnTemp_C  = CIRC_RETURN_MIN,
  coldMax_C     = COLD_MAX,
  hasCirc       = true,
) {
  const warnings = [];

  if (storageTemp_C < HOT_STORAGE_MIN) {
    warnings.push({
      code:     'LEGIONELLA_STORAGE_TEMP',
      severity: 'error',
      message:  `Boyler depolama sıcaklığı ${storageTemp_C}°C — DVGW W 551 / VDI 6023 uyarınca minimum ${HOT_STORAGE_MIN}°C gerekli. Lejyonella üreme riski.`,
    });
  }

  if (hasCirc && returnTemp_C < CIRC_RETURN_MIN) {
    warnings.push({
      code:     'LEGIONELLA_CIRC_RETURN',
      severity: 'error',
      message:  `Sirkülasyon dönüş sıcaklığı ${returnTemp_C}°C — DVGW W 551 uyarınca minimum ${CIRC_RETURN_MIN}°C gerekli.`,
    });
  }

  if (coldMax_C > COLD_MAX) {
    warnings.push({
      code:     'COLD_WATER_TOO_HOT',
      severity: 'warn',
      message:  `Soğuk hat sıcaklığı ${coldMax_C}°C — VDI 6023 uyarınca soğuk su ${COLD_MAX}°C'yi geçmemeli (bakteri üreme riski).`,
    });
  }

  return warnings;
}

/**
 * Sirkülasyon T'sinden armatüre olan dalın durgun (ölü) hacmini hesaplar.
 * VDI 6023: bu hacim ≤ 3 litre olmalı.
 *
 * @param {string} branchDiam   - branşman boru çapı ('q25')
 * @param {number} branchLen_m  - sirkülasyon T noktasından armatüre uzunluk (m)
 * @returns {{ volume_L, ok, warning }}
 */
export function checkBranchVolume(branchDiam, branchLen_m) {
  const volPerM  = pipeVolumePerM(branchDiam);
  const volume_L = volPerM * branchLen_m;
  const ok       = volume_L <= NON_CIRC_VOLUME_MAX_L;
  return {
    volume_L: parseFloat(volume_L.toFixed(3)),
    ok,
    warning: ok ? null : {
      code:     'BRANCH_VOLUME_EXCEEDED',
      severity: 'warn',
      message:  `Branşman durgun hacmi ${volume_L.toFixed(1)} L — VDI 6023 uyarınca sirkülasyon dışı hacim max ${NON_CIRC_VOLUME_MAX_L} L olabilir. Branşman boyunu kısaltın veya sirkülasyon T noktasını yaklaştırın.`,
    },
  };
}

/**
 * Kat/zone bazında statik basıncı hesaplar ve PRV ihtiyacını belirler.
 * TS EN 1567 / DIN 1988-200: bina giriş veya herhangi bir noktada statik > 5 bar → PRV.
 *
 * @param {number} inletPressure_bar    - bina giriş basıncı
 * @param {number} buildingHeight_m     - referans noktasından sayılacak bina yüksekliği
 * @param {Array}  zones                - [{from, to, bdAktif, bdDiam, bdTo}]
 * @param {number} floorH               - kat yüksekliği (m)
 * @param {number} shaftFloor           - şaft taban katı (referans)
 * @returns {{ prvRequired, zones: Array<{zone, pressureAtBase_bar, needsPrv}>, warnings }}
 */
export function checkPrvZones(inletPressure_bar, buildingHeight_m, zones = [], floorH = 3.0, shaftFloor = 1) {
  const warnings  = [];
  const zoneCheck = [];

  // Bina girişinde basınç kontrolü
  if (inletPressure_bar > PRV_TRIGGER_BAR) {
    warnings.push({
      code:     'INLET_PRV_REQUIRED',
      severity: 'warn',
      message:  `Bina giriş basıncı ${inletPressure_bar} bar — TS EN 1567 / DIN 1988-200 uyarınca ${PRV_TRIGGER_BAR} bar üstünde bina girişine basınç düşürücü (PRV) zorunludur.`,
    });
  }

  // Zone bazında alt-basa basınç (şaft tabanından o zone'un alt katına hydrostatik)
  zones.forEach((zone, idx) => {
    const zoneBaseFloor   = zone.from ?? shaftFloor;
    const heightFromInlet = (zoneBaseFloor - shaftFloor) * floorH;
    const rho             = WATER_DENSITY;
    const hydrostaticDrop = (rho * GRAVITY * heightFromInlet) / 1e5; // bar
    const pressureAtBase  = inletPressure_bar - hydrostaticDrop;
    const needsPrv        = pressureAtBase > PRV_TRIGGER_BAR;
    zoneCheck.push({ zone: idx + 1, floor: zoneBaseFloor, pressureAtBase_bar: parseFloat(pressureAtBase.toFixed(2)), needsPrv });

    if (needsPrv) {
      const hasBd = zone.bdAktif === 'evet';
      if (!hasBd) {
        warnings.push({
          code:     `ZONE_${idx+1}_PRV_MISSING`,
          severity: 'error',
          message:  `Zone ${idx+1} (${zoneBaseFloor}. kat): tahmini basınç ${pressureAtBase.toFixed(2)} bar — PRV gerekli ama konfigürasyonda aktif değil. Zone ayarlarına gidin ve BD aktif yapın.`,
        });
      }
    }
  });

  const prvRequired = inletPressure_bar > PRV_TRIGGER_BAR || zoneCheck.some(z => z.needsPrv);

  return { prvRequired, zones: zoneCheck, warnings };
}

/**
 * Tam hijyen analizi — tüm kontrolleri birleştirip tek nesne döner.
 *
 * @param {Object} params
 *   - storageTemp, returnTemp, coldMax
 *   - hasCirc
 *   - branchDiam, branchLen
 *   - inletPressure_bar, buildingHeight_m, zones, floorH, shaftFloor
 * @returns {Object} hygieneAnalysis
 */
export function analyzeHygiene(params) {
  const {
    storageTemp_C       = HOT_STORAGE_MIN,
    returnTemp_C        = CIRC_RETURN_MIN,
    coldMax_C           = COLD_MAX,
    hasCirc             = true,
    branchDiam          = 'q25',
    branchLen_m         = 2,
    inletPressure_bar   = 4.0,
    buildingHeight_m    = 0,
    zones               = [],
    floorH              = 3.0,
    shaftFloor          = 1,
  } = params;

  const tempWarnings   = checkTemperatures(storageTemp_C, returnTemp_C, coldMax_C, hasCirc);
  const branchVol      = checkBranchVolume(branchDiam, branchLen_m);
  const prvAnalysis    = checkPrvZones(inletPressure_bar, buildingHeight_m, zones, floorH, shaftFloor);

  const allWarnings = [
    ...tempWarnings,
    ...(branchVol.warning ? [branchVol.warning] : []),
    ...prvAnalysis.warnings,
  ];

  const errorCount = allWarnings.filter(w => w.severity === 'error').length;
  const warnCount  = allWarnings.filter(w => w.severity === 'warn').length;

  return {
    storageTemp_C,
    returnTemp_C,
    coldMax_C,
    branchVolume_L:  branchVol.volume_L,
    branchVolumeOk:  branchVol.ok,
    prvRequired:     prvAnalysis.prvRequired,
    prvZones:        prvAnalysis.zones,
    warnings:        allWarnings,
    errorCount,
    warnCount,
    ok:              allWarnings.length === 0,
  };
}
