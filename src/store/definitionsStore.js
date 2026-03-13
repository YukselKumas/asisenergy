// ── Tanımlamalar Store (Zustand) ───────────────────────────────────────
// Markalar, fiyat listeleri ve sistem ayarlarını Supabase'den çeker,
// önbelleğe alır ve güncellemeleri yönetir.

import { create } from 'zustand';
import { supabase } from '../lib/supabase.js';

export const useDefinitionsStore = create((set, get) => ({
  // ── State ──────────────────────────────────────────────────────────
  brands:        [],
  priceLists:    [],   // [{id, brand_id, product_id, product_name, unit, list_price, discount_pct, ...}]
  systemConfigs: {},   // {key: value}
  loading:       false,
  error:         null,

  // ── Markalar ──────────────────────────────────────────────────────

  fetchBrands: async () => {
    set({ loading: true });
    const { data, error } = await supabase
      .from('brands')
      .select('*')
      .eq('is_active', true)
      .order('name');
    if (error) { set({ error: error.message, loading: false }); return; }
    set({ brands: data, loading: false });
  },

  addBrand: async (brand) => {
    const { data, error } = await supabase.from('brands').insert(brand).select().single();
    if (error) throw error;
    set(state => ({ brands: [...state.brands, data] }));
    return data;
  },

  updateBrand: async (id, updates) => {
    const { data, error } = await supabase.from('brands').update(updates).eq('id', id).select().single();
    if (error) throw error;
    set(state => ({
      brands: state.brands.map(b => b.id === id ? data : b),
    }));
  },

  deleteBrand: async (id) => {
    const { error } = await supabase.from('brands').update({ is_active: false }).eq('id', id);
    if (error) throw error;
    set(state => ({ brands: state.brands.filter(b => b.id !== id) }));
  },

  // ── Fiyat Listesi ─────────────────────────────────────────────────

  /** Belirli bir markanın fiyat listesini çek */
  fetchPriceList: async (brandId) => {
    set({ loading: true });
    const { data, error } = await supabase
      .from('price_lists')
      .select('*')
      .eq('brand_id', brandId)
      .eq('is_active', true)
      .order('product_id');
    if (error) { set({ error: error.message, loading: false }); return; }
    set({ priceLists: data, loading: false });
  },

  /** Fiyat satırını güncelle */
  updatePrice: async (id, updates) => {
    const { data, error } = await supabase
      .from('price_lists')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    set(state => ({
      priceLists: state.priceLists.map(p => p.id === id ? data : p),
    }));
  },

  /** Toplu fiyat güncelleme (UPSERT) */
  upsertPrices: async (brandId, rows) => {
    const payload = rows.map(r => ({
      brand_id:    brandId,
      product_id:  r.product_id,
      product_name:r.product_name,
      unit:        r.unit,
      list_price:  r.list_price,
      discount_pct:r.discount_pct,
    }));

    const { error } = await supabase
      .from('price_lists')
      .upsert(payload, { onConflict: 'brand_id,product_id' });
    if (error) throw error;

    // Yeniden çek
    await get().fetchPriceList(brandId);
  },

  // ── Sistem Ayarları ───────────────────────────────────────────────

  fetchSystemConfigs: async () => {
    const { data, error } = await supabase.from('system_configs').select('*');
    if (error) return;
    const configs = {};
    data.forEach(row => {
      try { configs[row.key] = JSON.parse(row.value); }
      catch { configs[row.key] = row.value; }
    });
    set({ systemConfigs: configs });
  },

  updateSystemConfig: async (key, value) => {
    const { error } = await supabase
      .from('system_configs')
      .upsert({ key, value: JSON.stringify(value) }, { onConflict: 'key' });
    if (error) throw error;
    set(state => ({ systemConfigs: { ...state.systemConfigs, [key]: value } }));
  },
}));
