// ── Sirkülasyon Pompa Boyutlandırma — DVGW W 553 / DIN 1988-200 ───────
// Q_v = Σ(q_loss × L) → V_c = Q_v / (ρ·cp·ΔT)
// ΔT = 2K (sup-ret tolerans), simplified: V_c [L/h] ≈ Q_v [W] / 2.3

import {
  HEAT_LOSS_INSULATED, HEAT_LOSS_UNINSULATED_FACTOR, CIRC_DELTA_T,
  WATER_DENSITY_HOT, WATER_CP, INNER_D, VELOCITY_MAX, OUTER_D_MM,
} from './standards.js';
import { DIAM_ORDER } from './constants.js';

/**
 * Sirkülasyon ısı kayıp hesabı (W).
 *
 * @param {Object} hotPipeMap   - sıcak hat boruları (m)
 * @param {Object} circPipeMap  - sirkülasyon boruları (m)
 * @param {boolean} insulated   - izolasyonlu mu (varsayılan true)
 * @returns {{ Q_v_W, byDiam }}
 */
export function calcHeatLoss(hotPipeMap, circPipeMap, insulated = true) {
  let Q_v = 0;
  const byDiam = {};

  const accumulate = (pipeMap) => {
    Object.entries(pipeMap).forEach(([diam, length]) => {
      if (length <= 0) return;
      const baseLoss = HEAT_LOSS_INSULATED[diam] || 8; // W/m
      const factor   = insulated ? 1 : HEAT_LOSS_UNINSULATED_FACTOR;
      const segLoss  = baseLoss * factor * length;
      Q_v += segLoss;
      byDiam[diam] = (byDiam[diam] || 0) + segLoss;
    });
  };
  accumulate(hotPipeMap);
  accumulate(circPipeMap);

  return { Q_v_W: parseFloat(Q_v.toFixed(1)), byDiam };
}

/**
 * Sirkülasyon pompa debisi.
 * V_c = Q_v / (ρ · cp · ΔT)   (m³/s)
 * Pratik: V_c [L/h] ≈ Q_v [W] / 2.3   (ΔT=2K, ρ=983, cp=4186)
 *
 * @param {number} Q_v_W
 * @param {number} deltaT  - varsayılan 2K
 * @returns {{ flow_lps, flow_lph, flow_m3h }}
 */
export function calcCirculationFlow(Q_v_W, deltaT = CIRC_DELTA_T) {
  // V_c [m³/s] = Q [W] / (ρ × cp × ΔT)
  const flow_m3s = Q_v_W / (WATER_DENSITY_HOT * WATER_CP * deltaT);
  const flow_lps = flow_m3s * 1000;
  const flow_lph = flow_lps * 3600;
  return {
    flow_lps: parseFloat(flow_lps.toFixed(3)),
    flow_lph: parseFloat(flow_lph.toFixed(1)),
    flow_m3h: parseFloat((flow_m3s * 3600).toFixed(3)),
  };
}

/**
 * Sirkülasyon dönüş hattı için minimum çap önerisi (v ≤ 0.5 m/s).
 * @param {number} flow_lps
 * @returns {{ diam, velocity, innerDiamMm } | null}
 */
export function suggestReturnDiameter(flow_lps) {
  if (flow_lps <= 0) return null;
  const Q = flow_lps / 1000;
  const A_min = Q / VELOCITY_MAX.circ;
  const D_min = Math.sqrt(4 * A_min / Math.PI); // m

  for (const d of DIAM_ORDER) {
    const id = INNER_D[d];
    if (!id) continue;
    if (id >= D_min) {
      const A = Math.PI * id * id / 4;
      const v = Q / A;
      return { diam: d, velocity: parseFloat(v.toFixed(2)), innerDiamMm: id * 1000 };
    }
  }
  return null;
}

/**
 * Pompa basma yüksekliği kaba tahmin.
 * Yatay+dikey toplam uzunluğun ~%30'u + 1m fitting kayıpları + sabit 1m emniyet.
 * Detaylı hesap için Darcy-Weisbach gerekir (pressure.js).
 *
 * @param {number} totalCircLength_m
 * @returns {number} basma yüksekliği (m H₂O)
 */
export function estimatePumpHead(totalCircLength_m) {
  const friction = totalCircLength_m * 0.03; // ~30 mbar/m → 0.3 m/10m → 0.03 m/m
  return parseFloat((friction + 1).toFixed(2));
}

/**
 * Tam sirkülasyon analizi.
 *
 * @param {Object} hotPipeMap
 * @param {Object} circPipeMap
 * @param {boolean} insulated
 * @returns {Object} circulationAnalysis
 */
export function analyzeCirculation(hotPipeMap, circPipeMap, insulated = true) {
  const heat = calcHeatLoss(hotPipeMap, circPipeMap, insulated);
  const flow = calcCirculationFlow(heat.Q_v_W);
  const ret  = suggestReturnDiameter(flow.flow_lps);
  const totalCircLen = Object.values(circPipeMap).reduce((s, v) => s + v, 0);
  const pumpHead = estimatePumpHead(totalCircLen);

  return {
    heatLoss_W:        heat.Q_v_W,
    heatLossByDiam:    heat.byDiam,
    flow_lph:          flow.flow_lph,
    flow_lps:          flow.flow_lps,
    suggestedReturnDiam: ret?.diam || null,
    returnVelocity:    ret?.velocity || null,
    pumpHead_m:        pumpHead,
    totalCircLength_m: parseFloat(totalCircLen.toFixed(1)),
    insulated,
  };
}
