// ── Tanımlamalar Store (Zustand) ───────────────────────────────────────
// Markalar, fiyat listeleri ve sistem ayarlarını Supabase'den çeker.
// Tüm sorgular company_id bazlı — multi-tenant.

import { create } from 'zustand';
import { supabase } from '../lib/supabase.js';
import { PRICES } from '../lib/calculator/constants.js';
import { useAuthStore } from './authStore.js';

const getCompanyId = () => useAuthStore.getState().profile?.company_id ?? null;

export const useDefinitionsStore = create((set, get) => ({
  // ── State ──────────────────────────────────────────────────────────
  brands:        [],
  priceLists:    [],
  systemConfigs: {},
  loading:       false,
  error:         null,

  // ── Markalar ──────────────────────────────────────────────────────

  fetchBrands: async () => {
    set({ loading: true, error: null });
    const companyId = getCompanyId();
    let q = supabase.from('brands').select('*').eq('is_active', true).order('name');
    if (companyId) q = q.eq('company_id', companyId);
    const { data, error } = await q;
    if (error) { set({ error: error.message, loading: false }); return; }
    set({ brands: data || [], loading: false });
  },

  seedDefaultBrands: async () => {
    const companyId = getCompanyId();
    const defaults = [
      { name:'Kalde',               category:'ppr',    description:'PP-R boru ve bağlantı parçaları' },
      { name:'Fırat Boru',          category:'ppr',    description:'PP-R boru ve bağlantı parçaları' },
      { name:'Wavin Tigris',        category:'ppr',    description:'PP-R boru ve bağlantı parçaları' },
      { name:'Standart / Press',    category:'valve',  description:'Pirinç küresel vana' },
      { name:'Caleffi',             category:'valve',  description:'Pirinç küresel vana' },
      { name:'Caleffi',             category:'bd',     description:'Daire başı basınç düşürücü' },
      { name:'Honeywell / Resideo', category:'bd',     description:'Daire başı basınç düşürücü' },
      { name:'Kalde',               category:'filter', description:'Filtre ve çekvalf' },
    ];

    let q = supabase.from('brands').select('name, category');
    if (companyId) q = q.eq('company_id', companyId);
    const { data: existing } = await q;

    const existingSet = new Set((existing || []).map(b => `${b.name}|${b.category}`));
    const toInsert = defaults
      .filter(b => !existingSet.has(`${b.name}|${b.category}`))
      .map(b => ({ ...b, is_active: true, ...(companyId ? { company_id: companyId } : {}) }));

    if (toInsert.length > 0) {
      const { error } = await supabase.from('brands').insert(toInsert);
      if (error) throw error;
    }

    await get().fetchBrands();
  },

  addBrand: async (brand) => {
    const companyId = getCompanyId();
    const { data, error } = await supabase
      .from('brands')
      .insert({ ...brand, ...(companyId ? { company_id: companyId } : {}) })
      .select()
      .single();
    if (error) throw error;
    set(state => ({ brands: [...state.brands, data] }));
    return data;
  },

  updateBrand: async (id, updates) => {
    const { data, error } = await supabase
      .from('brands')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    set(state => ({ brands: state.brands.map(b => b.id === id ? data : b) }));
  },

  deleteBrand: async (id) => {
    const { error } = await supabase.from('brands').update({ is_active: false }).eq('id', id);
    if (error) throw error;
    set(state => ({ brands: state.brands.filter(b => b.id !== id) }));
  },

  getBrandsByCategory: (category) => get().brands.filter(b => b.category === category),

  // ── Fiyat Listesi ─────────────────────────────────────────────────

  fetchBrandPriceMap: async (brandId) => {
    if (!brandId) return {};
    const { data, error } = await supabase
      .from('price_lists')
      .select('product_id, list_price, discount_pct')
      .eq('brand_id', brandId)
      .eq('is_active', true);
    if (error || !data) return {};
    const map = {};
    data.forEach(row => {
      map[row.product_id] = {
        list: parseFloat(row.list_price),
        disc: parseFloat(row.discount_pct),
      };
    });
    return map;
  },

  seedBrandFromConstants: async (brandId, sourceOverrides = null) => {
    const companyId = getCompanyId();
    const rows = PRICES.map(p => {
      const ov = sourceOverrides?.[p.id];
      return {
        product_id:   p.id,
        product_name: p.n,
        unit:         p.u,
        list_price:   ov !== undefined ? ov : p.list,
        discount_pct: p.disc,
      };
    });
    await get().upsertPrices(brandId, rows, companyId);
  },

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

  upsertPrices: async (brandId, rows, companyIdOverride) => {
    const companyId = companyIdOverride ?? getCompanyId();
    const payload = rows.map(r => ({
      brand_id:     brandId,
      company_id:   companyId,
      product_id:   r.product_id,
      product_name: r.product_name,
      unit:         r.unit,
      list_price:   r.list_price,
      discount_pct: r.discount_pct,
      is_active:    true,
    }));

    const { error } = await supabase
      .from('price_lists')
      .upsert(payload, { onConflict: 'brand_id,product_id' });
    if (error) throw error;

    await get().fetchPriceList(brandId);
  },

  // ── Sistem Ayarları ───────────────────────────────────────────────

  fetchSystemConfigs: async () => {
    const { data, error } = await supabase.from('system_configs').select('*');
    if (error) return;
    const configs = {};
    (data || []).forEach(row => {
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
