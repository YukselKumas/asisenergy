// ── Field — Etiket + giriş alanı grubu ───────────────────────────────
// Tüm form alanları bu bileşeni kullanır.

export function Field({ label, hint, children, className = '' }) {
  return (
    <div className={`field ${className}`}>
      {label && <label>{label}</label>}
      {children}
      {hint && <div className="fn">{hint}</div>}
    </div>
  );
}
