// ── Modül Kayıt Sistemi ───────────────────────────────────────────────
// Uygulamaya kayıtlı tüm hesaplama modülleri burada listelenir.
// Yeni bir modül eklemek için: import edip MODULES dizisine ekle.

import { pprModule } from '../modules/ppr/index.js';

export const MODULES = [pprModule];

export const getModule    = (id) => MODULES.find(m => m.id === id) ?? null;
export const getModuleIds = () => MODULES.map(m => m.id);
