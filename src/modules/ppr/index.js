// ── PPR Metraj Modülü — Manifest ──────────────────────────────────────

export const pprModule = {
  id:          'ppr_metraj',
  name:        'PPR Metraj',
  description: 'Sıhhi tesisat PPR boru metraj hesaplama sistemi',
  icon:        'pipe',
  color:       '#0071e3',
  colorRgb:    '0,113,227',
  comingSoon:  false,
  routes: {
    new:  '/hesaplama/yeni',
    view: '/hesaplama/:id',
  },
  navItems: [
    { to: '/hesaplama/yeni', label: 'Yeni Hesaplama', icon: 'plus' },
    { to: '/gecmis',         label: 'Geçmiş',         icon: 'list' },
  ],
};
