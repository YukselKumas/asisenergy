// ── PPR Metraj Modülü — Manifest ──────────────────────────────────────
// Modül sistemi için tanımlayıcı metadata.
// İleride eklenecek modüller (Yangın Tesisatı vb.) aynı yapıyı izler.

export const pprModule = {
  id:          'ppr_metraj',
  name:        'PPR Metraj',
  description: 'Sıhhi tesisat PPR boru metraj hesaplama sistemi',
  color:       '#0071e3',
  routes: {
    new:  '/hesaplama/yeni',
    view: '/hesaplama/:id',
  },
  navItems: [
    { to: '/hesaplama/yeni', label: 'Yeni Hesaplama' },
    { to: '/gecmis',         label: 'Geçmiş' },
  ],
};
