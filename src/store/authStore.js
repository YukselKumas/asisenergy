// ── Auth Store (Zustand) ───────────────────────────────────────────────
// Kullanıcı oturum bilgilerini tutar.
// Supabase Auth olaylarını dinler ve state'i günceller.
// Roller: super_admin > company_admin > user

import { create } from 'zustand';
import { supabase } from '../lib/supabase.js';

export const useAuthStore = create((set, get) => ({
  // ── State ──────────────────────────────────────────────────────────
  user:    null,   // Supabase auth user nesnesi
  profile: null,   // profiles tablosundan: id, email, full_name, role, company_id
  loading: true,   // İlk oturum kontrolü tamamlanana kadar true

  // ── Eylemler ──────────────────────────────────────────────────────

  /** Uygulama açılışında çağrılır; try/finally garantisiyle loading kapanır */
  init: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        set({ user: session.user });
        await get().fetchProfile(session.user.id);
      }
    } catch (err) {
      console.error('[auth] init error:', err);
    } finally {
      set({ loading: false });
    }

    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        set({ user: session.user });
        await get().fetchProfile(session.user.id);
      } else {
        set({ user: null, profile: null });
      }
    });
  },

  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  },

  signUp: async (email, password, name) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });
    if (error) throw error;
    if (data?.user) {
      await supabase.from('profiles').upsert({
        id:        data.user.id,
        email,
        full_name: name,
        role:      'user',
      });
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, profile: null });
  },

  fetchProfile: async (userId) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (data) set({ profile: data });
    } catch (err) {
      console.error('[auth] fetchProfile error:', err);
    }
  },

  /** Yalnızca süper admin mi? */
  isSuperAdmin: () => get().profile?.role === 'super_admin',

  /** Şirket yöneticisi veya üstü? */
  isCompanyAdmin: () => ['super_admin', 'company_admin'].includes(get().profile?.role),

  /** Herhangi bir yönetici mi? (eski isAdmin uyumu) */
  isAdmin: () => ['super_admin', 'company_admin'].includes(get().profile?.role),
}));
