// ── Auth Store (Zustand) ───────────────────────────────────────────────
// Kullanıcı oturum bilgilerini tutar.
// Supabase Auth olaylarını dinler ve state'i günceller.

import { create } from 'zustand';
import { supabase } from '../lib/supabase.js';

export const useAuthStore = create((set, get) => ({
  // ── State ──────────────────────────────────────────────────────────
  user:    null,    // Supabase auth user nesnesi
  profile: null,    // profiles tablosundan gelen ek bilgi (name, role)
  loading: true,    // İlk oturum kontrolü sırasında true

  // ── Eylemler ──────────────────────────────────────────────────────

  /** Oturum başlatma — uygulama yüklendiğinde çağrılır */
  init: async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      set({ user: session.user });
      await get().fetchProfile(session.user.id);
    }
    set({ loading: false });

    // Auth durum değişikliklerini dinle (giriş/çıkış)
    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        set({ user: session.user });
        await get().fetchProfile(session.user.id);
      } else {
        set({ user: null, profile: null });
      }
    });
  },

  /** Email + şifre ile giriş */
  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  },

  /** Yeni kullanıcı kaydı */
  signUp: async (email, password, name) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (error) throw error;
    // Profiles tablosuna email + name kaydet
    if (data?.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        email,
        name,
        role: 'user',
        is_active: true,
      });
    }
  },

  /** Çıkış */
  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, profile: null });
  },

  /** Kullanıcı profilini profiles tablosundan çek */
  fetchProfile: async (userId) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (data) set({ profile: data });
  },

  /** Admin mi? */
  isAdmin: () => get().profile?.role === 'admin',
}));
