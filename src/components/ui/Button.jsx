// ── Button — Genel amaçlı düğme bileşeni ─────────────────────────────
// variant: 'primary' | 'default' | 'danger' | 'success'

export function Button({ children, variant = 'default', onClick, disabled, className = '', type = 'button', style }) {
  const base = 'btn';
  const variantClass = {
    primary: 'btn-primary',
    default: 'btn-default',
    danger:  'btn-danger',
    success: 'btn-success',
    calc:    'btn-calc',
  }[variant] || 'btn-default';

  return (
    <button
      type={type}
      className={`${base} ${variantClass} ${className}`}
      onClick={onClick}
      disabled={disabled}
      style={style}
    >
      {children}
    </button>
  );
}
