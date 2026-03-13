// ── Card — İçerik kartı bileşeni ──────────────────────────────────────
// accent: 'hot' | 'circ' | 'cold' | 'acc' | 'green' | 'warn'
// title:  Kart başlığı metni
// badge:  Küçük rozet (sayı veya ikon)

export function Card({ children, accent, title, badge, className = '' }) {
  const accentClass = accent ? `c-${accent}` : '';

  return (
    <div className={`card ${accentClass} ${className}`}>
      {title && (
        <div className={`ctitle ${accent || ''}`}>
          {badge && <span className={`cbadge ${accent || ''}`}>{badge}</span>}
          {title}
        </div>
      )}
      {children}
    </div>
  );
}
