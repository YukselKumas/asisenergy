// ── Supabase Client ────────────────────────────────────────────────────
// Uygulama genelinde tek bir Supabase istemcisi kullanılır.
// Ortam değişkenleri .env dosyasından (veya Vercel dashboard'dan) okunur.
import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Supabase ortam değişkenleri eksik!\n' +
    '.env.example dosyasını kopyalayarak .env oluşturun ve değerleri doldurun.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);
