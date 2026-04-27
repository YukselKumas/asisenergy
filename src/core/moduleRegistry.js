// ── Modül Kayıt Sistemi ───────────────────────────────────────────────
// Yeni modül eklemek için: import et ve MODULES dizisine ekle.

import { pprModule    } from '../modules/ppr/index.js';
import { yanginModule } from '../modules/yangin/index.js';

export const MODULES = [pprModule, yanginModule];

export const getModule    = (id) => MODULES.find(m => m.id === id) ?? null;
export const getModuleIds = () => MODULES.map(m => m.id);
