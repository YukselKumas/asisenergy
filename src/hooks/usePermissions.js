// ── usePermissions — Yetki kontrol hook'u ─────────────────────────────
//
// Rol hiyerarşisi:
//   super_admin   → her şeye erişir
//   company_admin → kendi şirketindeki her şeye erişir
//   user          → profile.permissions JSONB'ye göre kısıtlı
//
// permissions JSONB yapısı:
// {
//   modules:             ["ppr_metraj"]   // boş/yok → tüm modüller
//   canManageUsers:      false
//   canManageDefinitions:false
// }

import { useAuthStore } from '../store/authStore.js';
import { MODULES }      from '../core/moduleRegistry.js';

const ACTIVE_MODULE_IDS = MODULES.filter(m => !m.comingSoon).map(m => m.id);

export function usePermissions() {
  const { profile } = useAuthStore();

  const role = profile?.role ?? 'user';
  const isSA = role === 'super_admin';
  const isCA = role === 'company_admin';
  const perms = profile?.permissions ?? {};

  /** Modüle erişim var mı? */
  function canAccessModule(moduleId) {
    if (!profile) return false;
    if (isSA || isCA) return true;
    const list = perms.modules;
    if (!list || list.length === 0) return true;   // kısıtlama yok → hepsi açık
    return list.includes(moduleId);
  }

  /** Kullanıcı yönetimi yetkisi */
  function canManageUsers() {
    if (isSA || isCA) return true;
    return perms.canManageUsers === true;
  }

  /** Tanımlamalar (fiyat listesi vb.) yetkisi */
  function canManageDefinitions() {
    if (isSA || isCA) return true;
    return perms.canManageDefinitions === true;
  }

  /** Super admin mı? */
  const isSuperAdmin = isSA;

  /** Admin veya üstü mü? */
  const isAdmin = isSA || isCA;

  /** Kullanıcının aktif modülleri */
  function accessibleModules() {
    return MODULES.filter(m => !m.comingSoon && canAccessModule(m.id));
  }

  return {
    isSuperAdmin,
    isAdmin,
    canAccessModule,
    canManageUsers,
    canManageDefinitions,
    accessibleModules,
    ACTIVE_MODULE_IDS,
  };
}
