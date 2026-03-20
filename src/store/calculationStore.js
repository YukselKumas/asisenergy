// ── Hesaplama Store (Zustand) ──────────────────────────────────────────
// Wizard'ın tüm form state'ini tek bir yerde tutar.
// Her adım bu store'dan okur ve yazar.
// "Kaydet" butonuna basınca Supabase'e config JSONB olarak yazılır.

import { create } from 'zustand';
import { supabase } from '../lib/supabase.js';
import { PRICES, productBrandCat } from '../lib/calculator/constants.js';
import { useDefinitionsStore } from './definitionsStore.js';

/** Varsayılan form değerleri — yeni hesaplama başlatıldığında kullanılır */
export const DEFAULT_CONFIG = {
  // Adım 1 — Sistem Tanımı
  hasHot:   true,
  hasCirc:  true,
  hasCold:  true,
  markaPpr:     '',   // Brand UUID (Supabase)
  markaPirince: '',   // Brand UUID
  markaBd:      '',   // Brand UUID
  markaFiltre:  '',   // Brand UUID
  floor:        10,
  flatcheck:    40,
  firstFloor:   1,     // Daire başlangıç katı (Step 3 kat tablosu için)
  shaftFloor:   1,     // Şaft / mekanik oda başlangıç katı (boru metrajı için, negatif olabilir)
  floorH:       4,
  shaft:        4,

  // Mekanik oda
  depoAdet:       1,
  depoHacim:      20,
  depoMat:        'polietilen',
  depoDiam:       'q75',
  hidroforAdet:   1,
  hidroforDiam:   'q50',
  hidroforVana:   'pirince',
  hidroforCv:     'evet',
  hidroforUnion:  'evet',
  hidroforUnionDiam: 'q50',
  hidroforMano:   1,
  emisDiam:       'q75',
  emisVana:       'evet',
  emisFilt:       'evet',
  emisNip:        'evet',
  boylerAdet:     1,
  boylerDiam:     'q50',
  boylerVana:     'pirince',
  tankAdet:       1,
  pump:           1,
  mano:           2,
  term:           2,
  air:            2,
  mainf:          2,
  mainfDiam:      'f114',

  // Adım 2 — Boru Güzergahı
  hyHotStart: 'q75', hyHotL1: 30, hyHotD2: 'q63', hyHotL2: 30, hyHotD3: '', hyHotL3: 0,
  hyColdStart:'q75', hyColdL1:30, hyColdD2:'q63', hyColdL2:30, hyColdD3:'', hyColdL3:0,
  circDiam:    'q40',
  circYatay:   60,
  circDikey:   40,
  circFlat:    1,
  vertZoneCount: 3,
  vertStep:      4,

  // Çok zonlu şaft sistemi — her zone şaft tabanından kendi bitiş katına kadar boru çeker
  zones: [
    { from:1, to:4,  startDiam:'q63', minDiam:'q25', bdAktif:'evet', bdDiam:'34', bdTo:4  },
    { from:5, to:8,  startDiam:'q50', minDiam:'q25', bdAktif:'evet', bdDiam:'34', bdTo:8  },
    { from:9, to:10, startDiam:'q40', minDiam:'q25', bdAktif:'evet', bdDiam:'34', bdTo:10 },
  ],

  // Şaft başı vanalar
  shaftVanaMat:  'pirince',
  shaftVanaDiam: 'q63',
  shaftVanaAdet: 1,
  shaft4katCk:   false,

  // Branşman
  brDiam:  'q25',
  brHot:   2,
  brCold:  2,
  dHotmeter:  1,
  dColdmeter: 1,
  dAda:     1,   // Dış dişli adaptör büyük (sayaç girişi)
  dAda2:    1,   // Dış dişli adaptör küçük (sayaç çıkışı)
  dFilt:    1,
  dCv:      1,
  dNip:     2,
  dSaatrek: 1,
  dValveIn: 1,   // Ana kesme vanası - sayaç önü (branşman çapı)
  dValve:   1,   // İkinci vana - sayaç arkası (bir küçük çap)

  // Kolektörler
  kolektors: [],

  // Adım 3 — Kat dağılımı
  floors: [],  // [{floor: 1, count: 4}, ...]

  // Adım 4 — Katsayılar
  katsayilar: {
    // Dirsek katsayıları (adet / 10m) — çap bazında
    h110:0.5, h90:0.8, h75:1.0, h63:1.5, h50:1.5, h40:2.0, h32:2.0, h25:2.0,
    v110:0.3, v90:0.5, v75:0.5, v63:0.5, v50:0.8, v40:1.0, v32:1.0, v25:1.2,
    // Şaft başı te katsayıları (adet / şaft × hat)
    // Manşon ve redüksiyon artık fizik tabanlı hesaplanıyor (4m/adet, çap geçişi)
    kTee:3, kItee:2,
  },

  // Adım 5 — Fiyat geçersizlemeleri
  priceOverride: {},  // {product_id: {list, disc}}
  kdvRate: 0.20,
};

export const useCalculationStore = create((set, get) => ({
  // ── State ──────────────────────────────────────────────────────────
  config:     { ...DEFAULT_CONFIG },
  result:     null,    // Son hesaplama çıktısı
  projectId:  null,    // Kaydedilmiş proje UUID'si
  projectName:'',      // Proje adı
  isDirty:    false,   // Kaydedilmemiş değişiklik var mı?
  isSaving:   false,

  // ── Config güncelleme ─────────────────────────────────────────────

  /** Tek veya birden fazla config alanını güncelle */
  setConfig: (partial) => set(state => ({
    config:  { ...state.config, ...partial },
    isDirty: true,
  })),

  /**
   * Belirli bir marka kategorisi için fiyatları DB'den yükle ve priceOverride'a yaz.
   * Sadece o kategorideki ürünleri etkiler, diğer kategorilerin override'ları korunur.
   */
  loadBrandPrices: async (category, brandId) => {
    const { fetchBrandPriceMap } = useDefinitionsStore.getState();
    const { config } = get();
    const newOv = { ...(config.priceOverride || {}) };

    // Bu kategorideki mevcut override'ları temizle
    PRICES.forEach(p => {
      if (productBrandCat(p.id) === category) {
        delete newOv[p.id];
      }
    });

    // Yeni marka fiyatlarını yükle
    if (brandId) {
      const priceMap = await fetchBrandPriceMap(brandId);
      for (const [productId, price] of Object.entries(priceMap)) {
        if (productBrandCat(productId) === category) {
          newOv[productId] = price;
        }
      }
    }

    set(state => ({
      config: { ...state.config, priceOverride: newOv },
      isDirty: true,
    }));
  },

  /**
   * Tüm seçili markaların fiyatlarını yeniden yükle.
   */
  reloadAllBrandPrices: async () => {
    const { config } = get();
    const { fetchBrandPriceMap } = useDefinitionsStore.getState();
    const newOv = {};

    const brandMap = {
      ppr:    config.markaPpr,
      valve:  config.markaPirince,
      bd:     config.markaBd,
      filter: config.markaFiltre,
    };

    for (const [cat, brandId] of Object.entries(brandMap)) {
      if (!brandId) continue;
      const priceMap = await fetchBrandPriceMap(brandId);
      for (const [productId, price] of Object.entries(priceMap)) {
        if (productBrandCat(productId) === cat) {
          newOv[productId] = price;
        }
      }
    }

    set(state => ({
      config: { ...state.config, priceOverride: newOv },
      isDirty: true,
    }));
  },

  /** Sonucu kaydet */
  setResult: (result) => set({ result }),

  /** Yeni hesaplama — state'i sıfırla */
  newCalculation: () => set({
    config:     { ...DEFAULT_CONFIG },
    result:     null,
    projectId:  null,
    projectName:'',
    isDirty:    false,
  }),

  /** Kaydedilmiş projeyi yükle */
  loadProject: (project) => set({
    config:     { ...DEFAULT_CONFIG, ...project.config },
    result:     project.result || null,
    projectId:  project.id,
    projectName:project.name,
    isDirty:    false,
  }),

  // ── Supabase kayıt işlemleri ──────────────────────────────────────

  /** Projeyi Supabase'e kaydet (yeni veya güncelle) */
  saveProject: async (userId, name, description) => {
    set({ isSaving: true });
    const { config, result, projectId } = get();

    const payload = {
      name:        name || get().projectName || 'İsimsiz Proje',
      description: description || null,
      created_by:  userId,
      config,
      result,
      status:      result ? 'completed' : 'draft',
      updated_at:  new Date().toISOString(),
    };

    let id = projectId;

    try {
      if (id) {
        const { error } = await supabase.from('projects').update(payload).eq('id', id);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from('projects').insert(payload).select().single();
        if (error) throw error;
        id = data.id;
      }
    } catch (err) {
      set({ isSaving: false });
      throw err;
    }

    set({ projectId: id, projectName: payload.name, isDirty: false, isSaving: false });
    return id;
  },

  /** Hesaplama geçmişine kayıt ekle */
  saveHistory: async (userId, result) => {
    const { config, projectId } = get();
    if (!projectId) return;

    await supabase.from('calculation_history').insert({
      project_id:          projectId,
      calculated_by:       userId,
      input_snapshot:      config,
      result_snapshot:     result,
      total_amount_kdvsiz: result.grandNet,
      total_amount_kdvli:  result.grandTotal,
      total_pipe_m:        result.totalPipe,
      total_flats:         result.totalFlats,
    });
  },
}));
