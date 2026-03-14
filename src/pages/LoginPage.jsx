// ── LoginPage — Giriş ve kayıt sayfası ───────────────────────────────
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';

const inputStyle = {
  width: '100%', background: '#f8fafc', border: '1.5px solid #e2e8f0',
  borderRadius: 8, padding: '10px 13px', fontSize: 14,
  fontFamily: 'var(--sans)', outline: 'none', color: '#0f172a',
  transition: 'border-color .15s',
};

export function LoginPage() {
  const [tab,      setTab]      = useState('login'); // 'login' | 'register'
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState('');
  const [loading,  setLoading]  = useState(false);
  const { signIn, signUp } = useAuthStore();
  const navigate = useNavigate();

  function switchTab(t) {
    setTab(t); setError(''); setSuccess('');
    setName(''); setEmail(''); setPassword('');
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await signIn(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Email veya şifre hatalı.');
    } finally { setLoading(false); }
  }

  async function handleRegister(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await signUp(email, password, name);
      setSuccess('Hesabınız oluşturuldu. Yönetici onayının ardından giriş yapabilirsiniz.');
    } catch (err) {
      setError(err.message || 'Kayıt başarısız.');
    } finally { setLoading(false); }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      padding: 20,
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, padding: '40px 36px',
        width: '100%', maxWidth: 400,
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        {/* Logo */}
        <div style={{ marginBottom: 28, textAlign: 'center' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12, margin: '0 auto 12px',
            background: 'linear-gradient(135deg, #4f46e5, #6366f1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, fontWeight: 800, color: '#fff',
            boxShadow: '0 4px 14px rgba(79,70,229,.4)',
          }}>A</div>
          <div style={{ fontWeight: 800, fontSize: 18, color: '#0f172a', letterSpacing: '-.3px' }}>
            AsisenEnergy
          </div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>
            PPR Metraj Hesaplama Sistemi
          </div>
        </div>

        {/* Tab */}
        <div style={{ display: 'flex', background: '#f1f5f9', borderRadius: 8, padding: 3, marginBottom: 24 }}>
          {[['login','Giriş Yap'],['register','Kayıt Ol']].map(([key, label]) => (
            <button key={key} onClick={() => switchTab(key)} style={{
              flex: 1, padding: '7px', border: 'none', borderRadius: 6, cursor: 'pointer',
              fontSize: 13, fontWeight: 700, fontFamily: 'var(--sans)',
              background: tab === key ? '#fff' : 'transparent',
              color: tab === key ? '#4f46e5' : '#64748b',
              boxShadow: tab === key ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
              transition: 'all .15s',
            }}>{label}</button>
          ))}
        </div>

        {tab === 'login' ? (
          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 5 }}>
                Email
              </label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="kullanici@sirket.com" required autoFocus style={inputStyle}
                onFocus={e => e.target.style.borderColor='#4f46e5'}
                onBlur={e => e.target.style.borderColor='#e2e8f0'} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 5 }}>
                Şifre
              </label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required style={inputStyle}
                onFocus={e => e.target.style.borderColor='#4f46e5'}
                onBlur={e => e.target.style.borderColor='#e2e8f0'} />
            </div>
            {error && <div className="al al-w" style={{ marginBottom: 14 }}>{error}</div>}
            <button type="submit" disabled={loading} style={{
              width: '100%', background: 'linear-gradient(135deg,#4f46e5,#6366f1)',
              color: '#fff', border: 'none', borderRadius: 8, padding: 12,
              fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? .7 : 1, fontFamily: 'var(--sans)',
              boxShadow: '0 2px 8px rgba(79,70,229,.3)',
            }}>
              {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 5 }}>
                Ad Soyad
              </label>
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="Adınız Soyadınız" required style={inputStyle}
                onFocus={e => e.target.style.borderColor='#4f46e5'}
                onBlur={e => e.target.style.borderColor='#e2e8f0'} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 5 }}>
                Email
              </label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="kullanici@sirket.com" required style={inputStyle}
                onFocus={e => e.target.style.borderColor='#4f46e5'}
                onBlur={e => e.target.style.borderColor='#e2e8f0'} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 5 }}>
                Şifre
              </label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="En az 6 karakter" required minLength={6} style={inputStyle}
                onFocus={e => e.target.style.borderColor='#4f46e5'}
                onBlur={e => e.target.style.borderColor='#e2e8f0'} />
            </div>
            {error   && <div className="al al-w"  style={{ marginBottom: 14 }}>{error}</div>}
            {success && <div className="al al-ok" style={{ marginBottom: 14 }}>{success}</div>}
            {!success && (
              <button type="submit" disabled={loading} style={{
                width: '100%', background: 'linear-gradient(135deg,#4f46e5,#6366f1)',
                color: '#fff', border: 'none', borderRadius: 8, padding: 12,
                fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? .7 : 1, fontFamily: 'var(--sans)',
                boxShadow: '0 2px 8px rgba(79,70,229,.3)',
              }}>
                {loading ? 'Kaydediliyor...' : 'Kayıt Ol'}
              </button>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
