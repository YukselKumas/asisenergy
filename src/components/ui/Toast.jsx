// ── Toast — Anlık bildirim bileşeni ───────────────────────────────────
// Kullanım: import { showToast } from '@/components/ui/Toast'
//           showToast('İşlem başarılı!');

import { useEffect, useState } from 'react';

let _setMsg = null;

/** Toast mesajı göster (herhangi bir bileşenden çağrılabilir) */
export function showToast(msg, duration = 2600) {
  if (_setMsg) _setMsg({ msg, key: Date.now(), duration });
}

export function ToastContainer() {
  const [toast, setToast] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    _setMsg = (t) => {
      setToast(t);
      setVisible(true);
      setTimeout(() => setVisible(false), t.duration);
    };
    return () => { _setMsg = null; };
  }, []);

  if (!toast) return null;

  return (
    <div
      style={{
        position:   'fixed',
        bottom:     '20px',
        right:      '20px',
        background: '#1e293b',
        color:      '#fff',
        padding:    '10px 16px',
        borderRadius: '8px',
        fontSize:   '12px',
        zIndex:     9999,
        opacity:    visible ? 1 : 0,
        transition: 'opacity 0.25s',
        maxWidth:   '300px',
        lineHeight: '1.4',
        fontFamily: 'var(--mono)',
        pointerEvents: 'none',
      }}
    >
      {toast.msg}
    </div>
  );
}
