// ── Mühendislik Standartları & Tablolar ───────────────────────────────
// EN 806 / DIN 1988-300 / DVGW W 553 / VDI 6023 / GEG Anlage 8 / TS EN 1567
// PPR sistemleri için referans veriler. Tek kaynak.

// PPR PN20 boru iç çapları (metre) — DIN 8077 / TS EN ISO 15874
export const INNER_D = {
  q20:  0.0132, q25:  0.0166, q32:  0.0212, q40:  0.0266,
  q50:  0.0332, q63:  0.0420, q75:  0.0500, q90:  0.0600,
  q110: 0.0732, q125: 0.0832, q140: 0.0932, q160: 0.1064,
  q180: 0.1196, q200: 0.1330, q225: 0.1496, q250: 0.1662,
};

// Boru dış çapları (mm) — etiketten parse edilir ama hızlı erişim için
export const OUTER_D_MM = {
  q20: 20, q25: 25, q32: 32, q40: 40, q50: 50, q63: 63,
  q75: 75, q90: 90, q110: 110, q125: 125, q140: 140, q160: 160,
};

// ── Pürüzlülük & Akışkan Sabitleri ────────────────────────────────────
// Wavin / Aquatherm / Pestan teknik kataloglar
export const PPR_ROUGHNESS_MM = 0.007;          // mm — yeni boru
export const WATER_DENSITY    = 998;            // kg/m³ @ 20°C
export const WATER_DENSITY_HOT= 983;            // kg/m³ @ 60°C
export const WATER_VISCOSITY  = 1.002e-6;       // m²/s @ 20°C (kinematik)
export const WATER_CP         = 4186;           // J/(kg·K)
export const GRAVITY          = 9.81;           // m/s²

// ── Hız Limitleri (DIN 1988-300 / EN 806-3) ──────────────────────────
export const VELOCITY_MAX = {
  cold: 2.0,         // m/s
  hot:  1.5,         // m/s — pratik (norm 2.0 ama düşük gürültü için)
  circ: 0.5,         // m/s — DVGW W 553
  service: 2.0,      // m/s — bina giriş hattı
};

// ── Termal Genleşme — PPR ─────────────────────────────────────────────
// α [mm/(m·K)]. Niron Technical Guide, SPK Türkiye
export const THERMAL_EXPANSION = {
  ppr:    0.15,       // standart PP-R
  pprct:  0.13,       // PP-RCT (yüksek sıcaklık)
  pprfb:  0.04,       // PP-R FB / fiber-reinforced (cam fiber)
};

// Genleşme kolu (free leg / Π-bend) sabiti — Lb = k · √(d_o · ΔL)  [mm]
export const EXPANSION_K = 20;

// Kompansatörsüz max düz boru (m) — sıcak hat için pratik kural
export const MAX_STRAIGHT_NO_COMP_M = 6;

// ── Kelepçe Aralıkları (yatay, 20°C, mm cinsinden çap → metre) ───────
// Wavin / Aquatherm / Pestan ortak tablo
export const CLAMP_SPACING_HORIZ_COLD = {
  q20: 0.75, q25: 0.85, q32: 1.00, q40: 1.10, q50: 1.25,
  q63: 1.40, q75: 1.55, q90: 1.70, q110: 1.95, q125: 2.10,
  q140: 2.20, q160: 2.30,
};

// Sıcak su (60°C) için çarpan — 0.65 (orta değer)
export const CLAMP_HOT_FACTOR = 0.65;
// Dikey için çarpan
export const CLAMP_VERTICAL_FACTOR = 1.3;
// Fiber-reinforced PPR için + %35 (daha az sehim)
export const CLAMP_FB_BONUS = 1.35;

/**
 * Çap, hat tipi ve yön için optimum kelepçe aralığını döner (metre).
 * @param {string}  diam     - 'q63'
 * @param {boolean} isHot    - sıcak/sirkülasyon hattı mı
 * @param {boolean} isVert   - dikey mi
 * @param {string}  material - 'ppr' | 'pprct' | 'pprfb'
 */
export function clampSpacing(diam, { isHot = false, isVert = false, material = 'ppr' } = {}) {
  const base = CLAMP_SPACING_HORIZ_COLD[diam];
  if (!base) return 1.0; // güvenli varsayılan
  let s = base;
  if (isHot)  s *= CLAMP_HOT_FACTOR;
  if (isVert) s *= CLAMP_VERTICAL_FACTOR;
  if (material === 'pprfb') s *= CLAMP_FB_BONUS;
  return s;
}

// ── İzolasyon Kalınlığı — GEG 2024 Anlage 8 (λ_ref = 0.035 W/m·K) ────
// Sıcak su besleme + sirkülasyon + ısıtma dağılımı için
// İç çap mm cinsinden → izolasyon kalınlığı mm
export function insulationThicknessMm(innerDiamMm, { unheatedRoom = false, betweenHeated = false } = {}) {
  let t;
  if      (innerDiamMm <= 22)  t = 20;
  else if (innerDiamMm <= 35)  t = 30;
  else if (innerDiamMm <= 100) t = innerDiamMm; // boru iç çapı kadar
  else                         t = 100;
  if (unheatedRoom)  t *= 2;
  if (betweenHeated) t *= 0.5;
  return Math.round(t);
}

// Soğuk su kondansasyon yalıtımı (vapour-tight)
export const COLD_INSULATION_MM = 9;

// ── Loading Units (LU) — EN 806-3 Annex B / DIN 1988-300 VR (L/s) ────
// Konut için referans değerler. ΣVR DIN 1988-300 formülünde kullanılır.
export const FIXTURE_VR = {
  wc:           0.13,   // L/s — WC rezervuar
  basin:        0.07,   // lavabo
  shower:       0.15,   // duş
  bath:         0.15,   // küvet (eski tablolarda 0.30)
  kitchen_sink: 0.07,   // mutfak evyesi
  dishwasher:   0.15,   // bulaşık makinesi
  washer:       0.25,   // çamaşır makinesi
  bidet:        0.07,
  garden:       0.50,   // bahçe musluğu
};

// Tipik konut dairesi (1WC + 2lavabo + 1duş + 1küvet + 1mutfak + 1bulaşık + 1çamaşır)
export const FLAT_VR_DEFAULT = 0.13 + 2*0.07 + 0.15 + 0.15 + 0.07 + 0.15 + 0.25; // ≈ 1.04 L/s

// ── DIN 1988-300:2012 Eşzamanlılık Formülü (Konut) ───────────────────
// Vs = a · (ΣVR)^b − c   (L/s)
// Konut/yatakhane için kalibre edilmiş katsayılar
export const DIN1988_RESIDENTIAL = { a: 1.48, b: 0.19, c: 0.94 };

/**
 * DIN 1988-300 dizayn debisi (L/s).
 * @param {number} sumVR - tüm fixturelerin ΣVR toplamı (L/s)
 * @returns {number} Vs - eşzamanlı dizayn debisi (L/s)
 */
export function designFlowDIN(sumVR) {
  if (sumVR <= 0) return 0;
  if (sumVR < 0.2) return sumVR; // çok küçük: doğrudan ΣVR
  const { a, b, c } = DIN1988_RESIDENTIAL;
  return Math.max(0, a * Math.pow(sumVR, b) - c);
}

// ── Çap Önericisi (EN 806-3 / hız limit bazlı) ───────────────────────
/**
 * Verilen debi ve hız limitine göre minimum gerekli çapı döner.
 * v_max ≥ Q / A → A_min = Q / v_max → D_min = √(4·A/π)
 * @param {number}  Q_lps     - debi (L/s)
 * @param {number}  vMax      - max hız (m/s)
 * @param {Array}   diamList  - aday çaplar (DIAM_ORDER)
 * @returns {{diam: string, velocity: number, innerDiamMm: number}|null}
 */
export function suggestDiameter(Q_lps, vMax, diamList) {
  const Q = Q_lps / 1000; // m³/s
  if (Q <= 0) return null;
  const A_min = Q / vMax;
  const D_min = Math.sqrt(4 * A_min / Math.PI); // m
  for (const d of diamList) {
    const id = INNER_D[d];
    if (!id) continue;
    if (id >= D_min) {
      const A   = Math.PI * id * id / 4;
      const v   = Q / A;
      return { diam: d, velocity: v, innerDiamMm: id * 1000 };
    }
  }
  return null;
}

// ── İç Boru Pürüzsüzlüğü Faktörleri (Crane → ζ değerleri) ────────────
// EN 806-3 / Wavin teknik fitting basınç kayıp katsayıları
export const ZETA = {
  elbow90:    1.2,   // 90° dirsek
  elbow45:    0.4,
  teeThru:    0.4,   // T düz akış
  teeBranch:  1.3,   // T dallı akış
  reduction:  0.5,
  coupling:   0.1,
  valveBall:  0.3,   // tam açık küresel vana
  checkValve: 5.0,   // çekvalf
  filter:     2.5,   // pislik tutucu
  prv:        3.0,   // basınç düşürücü
};

// ── Sirkülasyon — DVGW W 553 ──────────────────────────────────────────
// Yalıtılmış boru ısı kaybı (W/m), 60°C sıcak − 20°C ortam, GEG izolasyonlu
export const HEAT_LOSS_INSULATED = {
  q20: 6.5,  q25: 7.5,  q32: 8.5,  q40: 9.5,
  q50: 10.5, q63: 11.5, q75: 12.5, q90: 13.5,
  q110: 14.5,
};
// Yalıtılmamış boru için × 3 (kaba tahmin)
export const HEAT_LOSS_UNINSULATED_FACTOR = 3;
// ΔT sirkülasyon (sup-ret), DVGW W 553
export const CIRC_DELTA_T = 2; // K

// ── PRV (Basınç Düşürücü) Eşiği ──────────────────────────────────────
// TS EN 1567 / DIN 1988-200
export const PRV_TRIGGER_BAR = 5.0;     // statik basınç > bu → PRV gerekli
export const PRV_OUTLET_BAR  = 4.0;     // tipik çıkış basıncı
export const FIXTURE_MIN_BAR = 1.0;     // armatür minimum çalışma basıncı

// ── Hijyen — VDI 6023 / DVGW W 551 ───────────────────────────────────
export const HOT_STORAGE_MIN = 60;      // °C — boyler depolama min
export const CIRC_RETURN_MIN = 55;      // °C — sirkülasyon dönüş min
export const COLD_MAX        = 25;      // °C — soğuk hat max (ısınmamalı)
export const STAGNATION_HOURS_MAX = 72; // saat — ölü hat max
export const NON_CIRC_VOLUME_MAX_L = 3; // L — sirkülasyon T'sinden fixture'a max hacim

// ── Borunun iç hacmi (L/m) ──
export function pipeVolumePerM(diam) {
  const id = INNER_D[diam];
  if (!id) return 0;
  return Math.PI * id * id / 4 * 1000; // L/m
}
