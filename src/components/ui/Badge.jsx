// ── Badge — Küçük renk rozeti ─────────────────────────────────────────
// variant: 'boru' | 'vana' | 'baglanti' | 'mekanik'
// veya doğrudan color sınıfı: 'cp-b' | 'cp-v' | 'cp-ba' | 'cp-m'

const VARIANT_MAP = {
  boru:     'cp-b',
  vana:     'cp-v',
  baglanti: 'cp-ba',
  mekanik:  'cp-m',
};

export function Badge({ children, variant, className = '' }) {
  const cls = VARIANT_MAP[variant] || variant || 'cp-b';
  return <span className={`cpill ${cls} ${className}`}>{children}</span>;
}
