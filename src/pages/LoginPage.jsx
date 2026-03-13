// ── LoginPage — Giriş sayfası ─────────────────────────────────────────
// Supabase email + şifre ile kimlik doğrulama.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';

export function LoginPage() {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const { signIn } = useAuthStore();
  const navigate   = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Giriş başarısız. Email ve şifrenizi kontrol edin.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight:      '100vh',
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
      background:     'var(--bg)',
      padding:        '20px',
    }}>
      <div style={{
        background:   'var(--white)',
        border:       '1px solid var(--border)',
        borderRadius: 'var(--r)',
        padding:      '40px 36px',
        width:        '100%',
        maxWidth:     400,
        boxShadow:    'var(--sh)',
      }}>
        {/* Logo */}
        <div style={{ marginBottom: 28, textAlign: 'center' }}>
          <div style={{ fontFamily:'var(--mono)', fontWeight:800, fontSize:18, color:'var(--acc)' }}>
            AsisenEnergy
          </div>
          <div style={{ fontSize:12, color:'var(--muted)', marginTop:4 }}>
            PPR Metraj Hesaplama Sistemi
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="field" style={{ marginBottom: 12 }}>
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="kullanici@sirket.com"
              required
              autoFocus
            />
          </div>

          <div className="field" style={{ marginBottom: 20 }}>
            <label>Şifre</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="al al-w" style={{ marginBottom: 16 }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width:        '100%',
              background:   'var(--acc)',
              color:        '#fff',
              border:       'none',
              borderRadius: 'var(--r2)',
              padding:      '11px',
              fontSize:     14,
              fontWeight:   700,
              cursor:       loading ? 'not-allowed' : 'pointer',
              opacity:      loading ? 0.7 : 1,
              fontFamily:   'var(--sans)',
            }}
          >
            {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>
      </div>
    </div>
  );
}
