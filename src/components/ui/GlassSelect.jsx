// ── GlassSelect — Portal tabanlı cam efektli dropdown ─────────────────
// Dropdown, document.body'e portal olarak eklenir — hiçbir overflow kesmez.

import { useState, useRef, useEffect, Children, isValidElement } from 'react';
import { createPortal } from 'react-dom';

export function GlassSelect({ value, onChange, children, style, disabled }) {
  const [open, setOpen]     = useState(false);
  const [pos, setPos]       = useState({ top: 0, left: 0, width: 0 });
  const btnRef              = useRef(null);

  // Pozisyonu hesapla ve aç
  const openDropdown = () => {
    if (disabled) return;
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({
        top:   r.bottom + window.scrollY + 5,
        left:  r.left   + window.scrollX,
        width: r.width,
      });
    }
    setOpen(true);
  };

  // Dışarı tıklayınca kapat
  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (btnRef.current && !btnRef.current.contains(e.target)) {
        // portal içine tıklama — id ile portali tanı
        if (e.target.closest?.('[data-gs-portal]')) return;
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  // Escape
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [open]);

  // Scroll / resize'da kapat
  useEffect(() => {
    if (!open) return;
    const h = () => setOpen(false);
    window.addEventListener('scroll', h, true);
    window.addEventListener('resize', h);
    return () => {
      window.removeEventListener('scroll', h, true);
      window.removeEventListener('resize', h);
    };
  }, [open]);

  // children → flat item list
  const items = [];
  function parseChildren(nodes) {
    Children.forEach(nodes, (child) => {
      if (!isValidElement(child)) return;
      if (child.type === 'option') {
        items.push({
          type: 'option',
          value: String(child.props.value ?? ''),
          label: child.props.children ?? String(child.props.value),
          disabled: !!child.props.disabled,
        });
      } else if (child.type === 'optgroup') {
        items.push({ type: 'group', label: child.props.label });
        parseChildren(child.props.children);
      }
    });
  }
  parseChildren(children);

  const selected = items.find(i => i.type === 'option' && i.value === String(value ?? ''));

  const handleSelect = (val) => {
    onChange?.({ target: { value: val } });
    setOpen(false);
  };

  return (
    <div style={{ position: 'relative', width: '100%', ...style }}>
      {/* Kapalı hâl — pill buton */}
      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        onClick={() => open ? setOpen(false) : openDropdown()}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          padding: '9px 14px 9px 16px',
          borderRadius: 999,
          border: open
            ? '1.5px solid rgba(0,113,227,0.60)'
            : '1px solid rgba(209,213,219,0.70)',
          background: open
            ? 'rgba(255,255,255,0.96)'
            : 'rgba(255,255,255,0.82)',
          backdropFilter: 'blur(16px) saturate(160%)',
          WebkitBackdropFilter: 'blur(16px) saturate(160%)',
          boxShadow: open
            ? '0 0 0 3px rgba(0,113,227,0.13), 0 1px 3px rgba(0,0,0,0.06)'
            : '0 1px 3px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.9)',
          color: selected ? '#1d1d1f' : '#9e9ea3',
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
          {selected?.label ?? '— Seçin —'}
        </span>
        <svg
          width="11" height="7" viewBox="0 0 11 7" fill="none"
          style={{
            flexShrink: 0,
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform .2s',
            opacity: 0.45,
          }}
        >
          <path d="M1 1.5l4.5 4 4.5-4" stroke="#1d1d1f" strokeWidth="1.6"
            strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Portal dropdown — body'de render edilir, overflow kesmez */}
      {open && createPortal(
        <div
          data-gs-portal="1"
          onMouseDown={e => e.stopPropagation()}
          style={{
            position:      'absolute',
            top:           pos.top,
            left:          pos.left,
            width:         pos.width,
            zIndex:        99999,
            background:    'rgba(252,252,254,0.88)',
            backdropFilter:'blur(32px) saturate(200%)',
            WebkitBackdropFilter: 'blur(32px) saturate(200%)',
            border:        '1px solid rgba(255,255,255,0.75)',
            borderRadius:  14,
            boxShadow:     '0 12px 40px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.08)',
            overflow:      'hidden',
            padding:       '4px 0',
            animation:     'gsOpen .15s cubic-bezier(0.34,1.56,0.64,1)',
          }}
        >
          <style>{`
            @keyframes gsOpen {
              from { opacity:0; transform: translateY(-6px) scale(0.97); }
              to   { opacity:1; transform: translateY(0)    scale(1);    }
            }
          `}</style>
          {items.map((item, i) => {
            if (item.type === 'group') {
              return (
                <div key={`g${i}`} style={{
                  fontSize: 10, fontWeight: 700, letterSpacing: '.5px',
                  textTransform: 'uppercase', color: '#aeaeb2',
                  padding: '8px 16px 3px',
                  borderTop: i > 0 ? '1px solid rgba(0,0,0,0.05)' : 'none',
                  marginTop: i > 0 ? 4 : 0,
                }}>
                  {item.label}
                </div>
              );
            }
            const isActive = item.value === String(value ?? '');
            return (
              <div
                key={`o${i}`}
                onMouseDown={() => !item.disabled && handleSelect(item.value)}
                style={{
                  display:        'flex',
                  alignItems:     'center',
                  gap:            8,
                  padding:        '9px 16px',
                  fontSize:       13.5,
                  fontFamily:     'var(--sans)',
                  cursor:         item.disabled ? 'default' : 'pointer',
                  color:          isActive ? '#0071e3' : item.disabled ? '#c8c8cc' : '#1d1d1f',
                  fontWeight:     isActive ? 600 : 400,
                  background:     isActive ? 'rgba(0,113,227,0.08)' : 'transparent',
                  borderLeft:     isActive ? '2.5px solid #0071e3' : '2.5px solid transparent',
                  transition:     'background .1s',
                  userSelect:     'none',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = isActive ? 'rgba(0,113,227,0.08)' : 'transparent'; }}
              >
                {isActive
                  ? <svg width="10" height="8" viewBox="0 0 10 8" fill="none" style={{ flexShrink:0 }}>
                      <path d="M1 4l3 3 5-6" stroke="#0071e3" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  : <span style={{ width: 10, flexShrink: 0 }} />
                }
                {item.label}
              </div>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
}
