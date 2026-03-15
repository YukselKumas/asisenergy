// ── GlassSelect — Özel cam efektli dropdown bileşeni ──────────────────
// Native <select> yerine kullanılır; açılınca glass morphism dropdown gösterir.

import { useState, useRef, useEffect, Children, isValidElement } from 'react';

/**
 * @param {string}   value        - Seçili değer
 * @param {Function} onChange     - (value) => void
 * @param {React.ReactNode} children - <option> veya <optgroup> elementleri
 * @param {string}   [className]
 * @param {object}   [style]
 * @param {boolean}  [disabled]
 */
export function GlassSelect({ value, onChange, children, className, style, disabled }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Dışarı tıklayınca kapat
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Escape ile kapat
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  // children'dan option listesini çıkar (option + optgroup destekli)
  const items = [];
  function parseChildren(nodes) {
    Children.forEach(nodes, (child) => {
      if (!isValidElement(child)) return;
      if (child.type === 'option') {
        items.push({
          type: 'option',
          value: child.props.value ?? '',
          label: child.props.children ?? child.props.value,
          disabled: child.props.disabled,
        });
      } else if (child.type === 'optgroup') {
        items.push({ type: 'group', label: child.props.label });
        parseChildren(child.props.children);
      }
    });
  }
  parseChildren(children);

  const selected = items.find(i => i.type === 'option' && String(i.value) === String(value));
  const displayLabel = selected?.label ?? '— Seçin —';

  const handleSelect = (val) => {
    onChange({ target: { value: val } });
    setOpen(false);
  };

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%', ...style }} className={className}>
      {/* Kapalı hâl — pill buton */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(o => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          padding: '9px 14px 9px 16px',
          borderRadius: 999,
          border: open
            ? '1px solid rgba(0,113,227,0.55)'
            : '1px solid rgba(209,213,219,0.70)',
          background: open
            ? 'rgba(255,255,255,0.95)'
            : 'rgba(255,255,255,0.80)',
          backdropFilter: 'blur(16px) saturate(160%)',
          WebkitBackdropFilter: 'blur(16px) saturate(160%)',
          boxShadow: open
            ? '0 0 0 3px rgba(0,113,227,0.12), 0 1px 3px rgba(0,0,0,0.05)'
            : '0 1px 3px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.9)',
          color: selected ? '#1d1d1f' : '#6e6e73',
          fontSize: 13.5,
          fontFamily: 'var(--sans)',
          fontWeight: 400,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          transition: 'all .18s',
          textAlign: 'left',
          outline: 'none',
        }}
      >
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {displayLabel}
        </span>
        {/* Chevron */}
        <svg
          width="11" height="7" viewBox="0 0 11 7" fill="none"
          style={{
            flexShrink: 0,
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform .2s',
            opacity: 0.55,
          }}
        >
          <path d="M1 1.5l4.5 4 4.5-4" stroke="#1d1d1f" strokeWidth="1.6"
            strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Açık dropdown listesi */}
      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          left: 0,
          right: 0,
          zIndex: 1000,
          background: 'rgba(255,255,255,0.82)',
          backdropFilter: 'blur(28px) saturate(200%)',
          WebkitBackdropFilter: 'blur(28px) saturate(200%)',
          border: '1px solid rgba(255,255,255,0.65)',
          borderRadius: 14,
          boxShadow: '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
          overflow: 'hidden',
          padding: '4px 0',
        }}>
          {items.map((item, i) => {
            if (item.type === 'group') {
              return (
                <div key={`g-${i}`} style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: '.4px',
                  textTransform: 'uppercase', color: '#aeaeb2',
                  padding: '8px 14px 4px',
                  borderTop: i > 0 ? '1px solid rgba(0,0,0,0.05)' : 'none',
                  marginTop: i > 0 ? 4 : 0,
                }}>
                  {item.label}
                </div>
              );
            }
            const isActive = String(item.value) === String(value);
            return (
              <div
                key={`o-${i}`}
                onClick={() => !item.disabled && handleSelect(item.value)}
                style={{
                  padding: '9px 14px',
                  fontSize: 13.5,
                  fontFamily: 'var(--sans)',
                  cursor: item.disabled ? 'default' : 'pointer',
                  color: isActive ? '#0071e3' : item.disabled ? '#aeaeb2' : '#1d1d1f',
                  fontWeight: isActive ? 600 : 400,
                  background: isActive ? 'rgba(0,113,227,0.08)' : 'transparent',
                  borderLeft: isActive ? '2px solid #0071e3' : '2px solid transparent',
                  transition: 'background .12s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
                onMouseEnter={e => {
                  if (!isActive && !item.disabled)
                    e.currentTarget.style.background = 'rgba(0,0,0,0.04)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = isActive ? 'rgba(0,113,227,0.08)' : 'transparent';
                }}
              >
                {isActive && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none" style={{ flexShrink: 0 }}>
                    <path d="M1 4l3 3 5-6" stroke="#0071e3" strokeWidth="1.6"
                      strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
                {!isActive && <span style={{ width: 10, flexShrink: 0 }} />}
                {item.label}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
