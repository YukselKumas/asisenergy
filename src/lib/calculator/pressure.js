// ── Basınç Kaybı Hesabı — Darcy-Weisbach + Colebrook-White ────────────
// DIN 1988-300 yöntemi. PPR k = 0.007 mm.
//
// Δp = λ × (L/D) × (ρ × v²/2)   [Pa]
// 1/√λ = -2·log₁₀( k/(3.7D) + 2.51/(Re·√λ) )

import {
  PPR_ROUGHNESS_MM, WATER_DENSITY, WATER_VISCOSITY, WATER_DENSITY_HOT,
  INNER_D, ZETA, GRAVITY, PRV_TRIGGER_BAR, FIXTURE_MIN_BAR,
} from './standards.js';

/**
 * Reynolds sayısı.
 */
export function reynolds(velocity_ms, innerDiam_m, kinematicVisc = WATER_VISCOSITY) {
  if (velocity_ms <= 0 || innerDiam_m <= 0) return 0;
  return (velocity_ms * innerDiam_m) / kinematicVisc;
}

/**
 * Colebrook-White friction factor — iteratif çözüm.
 * 1/√λ = -2·log₁₀(k/(3.7D) + 2.51/(Re·√λ))
 */
export function frictionFactor(Re, innerDiam_m, roughness_mm = PPR_ROUGHNESS_MM) {
  if (Re < 2300) {
    // Laminer akış: λ = 64/Re
    return Re > 0 ? 64 / Re : 0;
  }
  const k_D = (roughness_mm / 1000) / innerDiam_m;
  // Swamee-Jain açık çözüm (Colebrook'a çok yakın)
  const denom = Math.log10(k_D / 3.7 + 5.74 / Math.pow(Re, 0.9));
  return 0.25 / (denom * denom);
}

/**
 * Tek düz boru segmentinin sürtünme basınç kaybı (Pa).
 * @param {number} L_m
 * @param {number} velocity_ms
 * @param {string} diam        - 'q63'
 * @param {boolean} hot
 */
export function frictionPressureDrop(L_m, velocity_ms, diam, hot = false) {
  const D = INNER_D[diam];
  if (!D || L_m <= 0 || velocity_ms <= 0) return 0;
  const rho = hot ? WATER_DENSITY_HOT : WATER_DENSITY;
  const Re  = reynolds(velocity_ms, D);
  const lam = frictionFactor(Re, D);
  return lam * (L_m / D) * (rho * velocity_ms * velocity_ms / 2);
}

/**
 * Fitting (lokal) basınç kayıpları — ζ değerleri toplamı × dinamik basınç.
 * Δp_local = Σζ × ρ·v²/2
 * @param {Object} fittingCounts - {elbow90: 12, teeBranch: 4, valveBall: 2, ...}
 * @param {number} velocity_ms
 * @param {boolean} hot
 */
export function localPressureDrop(fittingCounts, velocity_ms, hot = false) {
  if (velocity_ms <= 0) return 0;
  const rho = hot ? WATER_DENSITY_HOT : WATER_DENSITY;
  let sumZeta = 0;
  Object.entries(fittingCounts).forEach(([type, count]) => {
    const z = ZETA[type] || 0;
    sumZeta += z * count;
  });
  return sumZeta * (rho * velocity_ms * velocity_ms / 2);
}

/**
 * Pa → bar
 */
export const paToBar = (pa) => pa / 1e5;
/**
 * mSS (m H₂O) → bar
 */
export const mH2OToBar = (m) => m * 0.0981;

/**
 * Tam sistem basınç bütçesi.
 *
 * @param {Object} params
 *   - inletPressure_bar:  bina giriş basıncı (varsayılan 4 bar)
 *   - buildingHeight_m:   en üst fixture'a yükseklik
 *   - pipeMap:            {q63: 240, ...}
 *   - velocityByDiam:     {q63: 1.2, ...}  her çapta tahmini hız
 *   - fittingCounts:      {elbow90: 30, ...}  toplam
 *   - hot:                sıcak hat mı (yoğunluk farkı)
 * @returns {Object}
 */
export function pressureBudget(params) {
  const {
    inletPressure_bar = 4.0,
    buildingHeight_m  = 0,
    pipeMap = {},
    velocityByDiam = {},
    fittingCounts = {},
    hot = false,
  } = params;

  // Statik (hidrostatik) basınç kaybı: ρgh
  const rho = hot ? WATER_DENSITY_HOT : WATER_DENSITY;
  const staticDrop_Pa = rho * GRAVITY * buildingHeight_m;

  // Sürtünme kaybı — her çap için
  let frictionDrop_Pa = 0;
  Object.entries(pipeMap).forEach(([diam, length]) => {
    if (length <= 0) return;
    const v = velocityByDiam[diam] || 1.0;
    frictionDrop_Pa += frictionPressureDrop(length, v, diam, hot);
  });

  // Lokal kayıp — ortalama hızı kullan (kaba ama makul)
  const avgV = Object.keys(velocityByDiam).length > 0
    ? Object.values(velocityByDiam).reduce((a,b) => a+b, 0) / Object.keys(velocityByDiam).length
    : 1.0;
  const localDrop_Pa = localPressureDrop(fittingCounts, avgV, hot);

  const totalDrop_Pa  = staticDrop_Pa + frictionDrop_Pa + localDrop_Pa;
  const totalDrop_bar = paToBar(totalDrop_Pa);
  const remaining_bar = inletPressure_bar - totalDrop_bar;

  // Uyarılar
  const warnings = [];
  if (remaining_bar < FIXTURE_MIN_BAR) {
    warnings.push({
      code: 'INSUFFICIENT_PRESSURE',
      severity: 'error',
      message: `Uç noktada basınç ${remaining_bar.toFixed(2)} bar — minimum ${FIXTURE_MIN_BAR} bar gerekli. Booster pompa veya çap büyütme önerilir.`,
    });
  }
  if (inletPressure_bar > PRV_TRIGGER_BAR) {
    warnings.push({
      code: 'PRV_REQUIRED',
      severity: 'warn',
      message: `Giriş basıncı ${inletPressure_bar} bar — TS EN 1567 / DIN 1988-200 uyarınca ${PRV_TRIGGER_BAR} bar üstünde basınç düşürücü zorunlu.`,
    });
  }

  return {
    inletPressure_bar:   inletPressure_bar,
    staticDrop_bar:      parseFloat(paToBar(staticDrop_Pa).toFixed(3)),
    frictionDrop_bar:    parseFloat(paToBar(frictionDrop_Pa).toFixed(3)),
    localDrop_bar:       parseFloat(paToBar(localDrop_Pa).toFixed(3)),
    totalDrop_bar:       parseFloat(totalDrop_bar.toFixed(3)),
    remaining_bar:       parseFloat(remaining_bar.toFixed(3)),
    warnings,
  };
}
