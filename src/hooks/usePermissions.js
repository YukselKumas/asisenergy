// ── usePermissions — Yetki kontrol hook'u ─────────────────────────────
//
// Rol hiyerarşisi:
//   super_admin → her şeye erişir
//   user        → profile.permissions JSONB'ye göre kısıtlı
//
// permissions JSONB yapısı:
// {
//   modules:             ["ppr_metraj"]   // boş/yok → tüm modüller açık
//   canManageUsers:      false
//   canManageDefinitions:false
// }

import { useAuthStore } from '../store/authStore.js';
import { MODULES }      from '../core/moduleRegistry.js';

const ACTIVE_MODULE_IDS = MODULES.filter(m => !m.comingSoon).map(m => m.id);

export function usePermissions() {
  const { profile } = useAuthStore();

  const role  = profile?.role ?? 'user';
  const isSA  = role === 'super_admin';
  const perms = profile?.permissions ?? {};

  /** Modüle erişim var mı? */
  function canAccessModule(moduleId) {
    if (!profile) return false;
    if (isSA) return true;
    const list = perms.modules;
    if (!list || list.length === 0) return true;   // kısıtlama yok → hepsi açık
    return list.includes(moduleId);
  }

  /** Kullanıcı yönetimi yetkisi */
  function canManageUsers() {
    if (isSA) return true;
    return perms.canManageUsers === true;
  }

  /** Tanımlamalar (fiyat listesi vb.) yetkisi */
  function canManageDefinitions() {
    if (isSA) return true;
    return perms.canManageDefinitions === true;
  }

  /** Kullanıcının aktif modülleri */
  function accessibleModules() {
    return MODULES.filter(m => !m.comingSoon && canAccessModule(m.id));
  }

  return {
    isSuperAdmin: isSA,
    isAdmin:      isSA,
    canAccessModule,
    canManageUsers,
    canManageDefinitions,
    accessibleModules,
    ACTIVE_MODULE_IDS,
  };
}
