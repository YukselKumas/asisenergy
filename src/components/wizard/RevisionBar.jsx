// ── RevisionBar — Revizyon Yönetimi (R1, R2, R3…) ─────────────────────
// Hesaplandıktan sonra "R1 Kaydet" butonu ile anlık sonuç revizyona alınır.
// Revizyonlar listelenip karşılaştırılabilir.

import { useCalculationStore } from '../../store/calculationStore.js';
import { useDefinitionsStore }  from '../../store/definitionsStore.js';
import { showToast }   from '../ui/Toast.jsx';

const TR = (x) => new Intl.NumberFormat('tr-TR', { minimumFractionDigits:0, maximumFractionDigits:0 }).format(x ?? 0);

export function RevisionBar() {
  const {
    result, revisions, activeRevId,
    saveCurrentAsRevision, deleteRevision, setActiveRevId,
  } = useCalculationStore();
  const { brands } = useDefinitionsStore();

  function brandName(id) {
    if (!id) return '—';
    return brands.find(b => b.id === id)?.name || '—';
  }

  function handleSaveRevision() {
    if (!result) { showToast('⚠ Önce hesaplama yapın.'); return; }
    const rev = saveCurrentAsRevision();
    if (rev) showToast(`✓ ${rev.name} kaydedildi`);
  }

  const nextRevName = `R${revisions.length + 1}`;

  return (
    <div style={{ marginBottom: 16 }}>

      {/* Başlık şeridi */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
        padding: '10px 14px',
        background: revisions.length > 0 ? 'rgba(16,185,129,0.07)' : 'var(--bg)',
        border: `1px solid ${revisions.length > 0 ? 'var(--green-b,#6ee7b7)' : 'var(--border)'}`,
        borderRadius: 'var(--r)',
      }}>
        <span style={{ fontSize:11, fontWeight:800, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.4px', flexShrink:0 }}>
          Revizyonlar
        </span>

        {revisions.length === 0 && (
          <span style={{ fontSize:11, color:'var(--muted)', fontStyle:'italic' }}>
            Henüz revizyon yok — hesapladıktan sonra kaydedin.
          </span>
        )}

        {/* R1, R2… sekmeler */}
        {revisions.map(rev => (
          <button
            key={rev.id}
            onClick={() => setActiveRevId(rev.id === activeRevId ? null : rev.id)}
            style={{
              padding: '4px 12px', borderRadius: 'var(--r2)', fontSize: 12, fontWeight: 700,
              cursor: 'pointer',
              background: rev.id === activeRevId ? 'var(--acc)' : 'var(--white)',
              color:      rev.id === activeRevId ? '#fff' : 'var(--text)',
              border: `1.5px solid ${rev.id === activeRevId ? 'var(--acc)' : 'var(--border)'}`,
              display: 'flex', alignItems: 'center', gap: 5,
            }}
          >
            {rev.name}
            <span style={{ fontSize:10, opacity:.65 }}>
              {rev.result?.grandTotal ? `${TR(rev.result.grandTotal)} ₺` : '?'}
            </span>
            <span
              onClick={e => {
                e.stopPropagation();
                if (confirm(`"${rev.name}" silinsin mi?`)) deleteRevision(rev.id);
              }}
              style={{ marginLeft:2, opacity:.45, fontSize:13, cursor:'pointer', lineHeight:1 }}
              title="Sil"
            >×</span>
          </button>
        ))}

        {/* Kaydet butonu */}
        <div style={{ marginLeft:'auto' }}>
          <button
            onClick={handleSaveRevision}
            disabled={!result}
            style={{
              background: result ? 'var(--acc)' : 'var(--bg)',
              color: result ? '#fff' : 'var(--muted)',
              border: `1px solid ${result ? 'var(--acc)' : 'var(--border)'}`,
              borderRadius: 'var(--r2)', padding: '5px 14px', fontSize: 12,
              fontWeight: 700, cursor: result ? 'pointer' : 'default',
            }}
          >
            + {nextRevName} Kaydet
          </button>
        </div>
      </div>

      {/* Aktif revizyon detayı */}
      {activeRevId && (() => {
        const rev = revisions.find(r => r.id === activeRevId);
        if (!rev) return null;
        const cur = result;
        const pct = (a, b) => b ? (((a - b) / b) * 100).toFixed(1) : null;
        return (
          <div style={{
            marginTop: 6, padding:'14px 16px',
            background:'var(--white)', border:'1px solid var(--border)',
            borderRadius:'var(--r)', display:'flex', flexWrap:'wrap', gap:16,
          }}>
            <div style={{ fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:'.4px', color:'var(--acc)', width:'100%' }}>
              {rev.name} — Detay
            </div>

            {/* Marka özeti */}
            <div style={{ fontSize:11, color:'var(--muted)', lineHeight:1.9 }}>
              <div><strong>PPR:</strong> {brandName(rev.brands?.markaPpr)}</div>
              <div><strong>Vana:</strong> {brandName(rev.brands?.markaPirince)}</div>
              <div><strong>BD:</strong> {brandName(rev.brands?.markaBd)}</div>
              <div><strong>Filtre:</strong> {brandName(rev.brands?.markaFiltre)}</div>
            </div>

            {/* Fiyat karşılaştırma */}
            {rev.result && cur && (
              <div style={{ flex:1, minWidth:220 }}>
                <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12 }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign:'left', fontSize:10, color:'var(--muted)', fontWeight:700, textTransform:'uppercase', paddingBottom:6 }}>Metrik</th>
                      <th style={{ textAlign:'right', fontSize:10, color:'var(--acc)', fontWeight:700, textTransform:'uppercase', paddingBottom:6 }}>{rev.name}</th>
                      <th style={{ textAlign:'right', fontSize:10, color:'var(--muted)', fontWeight:700, textTransform:'uppercase', paddingBottom:6 }}>Mevcut</th>
                      <th style={{ textAlign:'right', fontSize:10, color:'var(--muted)', fontWeight:700, textTransform:'uppercase', paddingBottom:6 }}>Fark</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['KDV Dahil', rev.result.grandTotal, cur.grandTotal, '₺'],
                      ['KDV Hariç', rev.result.grandNet,   cur.grandNet,   '₺'],
                      ['Toplam Boru', rev.result.totalPipe, cur.totalPipe, 'm'],
                    ].map(([label, rv, cv, unit]) => {
                      const diff = rv != null && cv != null ? rv - cv : null;
                      const p = pct(rv, cv);
                      return (
                        <tr key={label} style={{ borderTop:'1px solid var(--border)' }}>
                          <td style={{ padding:'5px 4px 5px 0', color:'var(--muted)', fontSize:11 }}>{label}</td>
                          <td style={{ padding:'5px 4px', textAlign:'right', fontFamily:'var(--mono)', fontWeight:700 }}>
                            {rv != null ? `${TR(rv)} ${unit}` : '—'}
                          </td>
                          <td style={{ padding:'5px 4px', textAlign:'right', fontFamily:'var(--mono)', color:'var(--muted)' }}>
                            {cv != null ? `${TR(cv)} ${unit}` : '—'}
                          </td>
                          <td style={{ padding:'5px 0 5px 4px', textAlign:'right', fontFamily:'var(--mono)', fontSize:11, fontWeight:700,
                            color: diff === null ? 'var(--muted)' : diff < 0 ? 'var(--green)' : diff > 0 ? 'var(--red)' : 'var(--muted)' }}>
                            {diff === null ? '—' : diff === 0 ? '=' : `${diff > 0 ? '+' : ''}${TR(diff)}`}
                            {p !== null && diff !== 0 ? <span style={{ fontSize:10, marginLeft:3, opacity:.7 }}>({p}%)</span> : null}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Sadece revizyon sonucu var, mevcut hesap yok */}
            {rev.result && !cur && (
              <div style={{ fontSize:12, fontFamily:'var(--mono)', color:'var(--acc)' }}>
                KDV Dahil: <strong>{TR(rev.result.grandTotal)} ₺</strong>
                {' · '}KDV Hariç: <strong>{TR(rev.result.grandNet)} ₺</strong>
              </div>
            )}

            <div style={{ fontSize:10, color:'var(--muted)', width:'100%' }}>
              Kaydedildi: {new Date(rev.createdAt).toLocaleString('tr-TR')}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
