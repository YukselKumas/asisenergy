// ── KollectorCard — Tek hat kolektör yapılandırma kartı ───────────────
// Her çıkış için bağımsız çap, çekvalf ve nipel/rakor seçimi.

import { useState } from 'react';
import { useCalculationStore } from '../../store/calculationStore.js';
import { GlassSelect } from '../ui/GlassSelect.jsx';
import { DIAM_LABEL, DIAM_ORDER } from '../../lib/calculator/constants.js';
import { iteId, pirVanaId, cvId as cvIdFn, nipIdForDiam, saatrekId } from '../../lib/calculator/kollector.js';
import { showToast } from '../ui/Toast.jsx';

const KOLDIAM_LIST = ['q50','q63','q75','q90','q110','q125','q140','q160','q180','q200','q225','q250'];
const PIRINCT_OPTS = ['q20','q25','q32','q40','q50','q63','q75','q90'];

const HAT_CONFIG = {
  hot:  { label:'🔴 Sıcak Su Kolektörü',   accent:'var(--hot)' },
  cold: { label:'🔵 Soğuk Su Kolektörü',   accent:'var(--cold)' },
};

export function KollectorCard({ hatId }) {
  const { config, setConfig } = useCalculationStore();
  const hat = HAT_CONFIG[hatId];
  const [bulkVd, setBulkVd] = useState('q75');

  const kols = config.kolektors || [];
  const kolIdx = kols.findIndex(k => k.hatId === hatId);

  const defaultKol = {
    hatId,
    mat:    'ppr',
    kdiam:  'q90',
    kepAdet: 2,
    rows: Array.from({ length: config.shaft || 4 }, () => ({ vd: 'q75', hasCv: true })),
  };

  const kol = kols[kolIdx] ?? defaultKol;

  function updKol(updates) {
    const newKols = [...kols];
    if (kolIdx >= 0) newKols[kolIdx] = { ...kol, ...updates };
    else             newKols.push({ ...kol, ...updates });
    setConfig({ kolektors: newKols });
  }

  function updRow(i, key, val) {
    const newRows = kol.rows.map((r, idx) => idx === i ? { ...r, [key]: val } : r);
    updKol({ rows: newRows });
  }

  function changeRowCount(count) {
    const cur  = kol.rows || [];
    const def  = { vd: 'q75', hasCv: true };
    const next = Array.from({ length: count }, (_, i) => cur[i] || def);
    updKol({ rows: next });
  }

  function bulkApply() {
    updKol({ rows: kol.rows.map(r => ({ ...r, vd: bulkVd })) });
    showToast('Tüm çıkışlara uygulandı');
  }

  return (
    <div style={{
      marginBottom:22, padding:16,
      background:'var(--bg)', border:'1px solid var(--border)',
      borderLeft:`3px solid ${hat.accent}`, borderRadius:'var(--r)',
    }}>
      <div style={{ fontSize:11, fontWeight:800, letterSpacing:'.5px', textTransform:'uppercase', color:hat.accent, marginBottom:14 }}>
        {hat.label}
      </div>

      {/* Montaj sırası bilgisi */}
      <div style={{ background:'var(--white)', border:'1px solid var(--border2)', borderRadius:6, padding:'8px 12px', marginBottom:14, fontSize:11, color:'var(--muted)', lineHeight:1.8 }}>
        <strong style={{ color:'var(--text)' }}>Montaj sırası:</strong> Kolektör → <strong style={{ color:'var(--text)' }}>İnegal Te</strong> → <strong style={{ color:'var(--text)' }}>Dış Dişli Adaptör</strong> → <strong style={{ color:'var(--text)' }}>Pirinç Küresel Vana</strong> →{' '}
        <span style={{ color:'var(--hot)' }}><strong>Çekvalf VAR:</strong> Sarı Nipel → Çekvalf</span>{' | '}
        <span style={{ color:'var(--acc)' }}><strong>Çekvalf YOK:</strong> Oynar Başlıklı Rakor</span>
      </div>

      {/* Kolektör ana ayarları */}
      <div className="g g4" style={{ marginBottom:14 }}>
        <div className="field">
          <label>Kolektör Malzemesi</label>
          <GlassSelect value={kol.mat} onChange={e => updKol({ mat: e.target.value })}>
            <option value="ppr">PPR Kolektör</option>
            <option value="paslanmaz">Paslanmaz Çelik Kolektör</option>
          </GlassSelect>
        </div>
        <div className="field">
          <label>Kolektör Ana Çapı</label>
          <GlassSelect value={kol.kdiam} onChange={e => updKol({ kdiam: e.target.value })}>
            {KOLDIAM_LIST.map(d => <option key={d} value={d}>{DIAM_LABEL[d] || d}</option>)}
          </GlassSelect>
        </div>
        <div className="field">
          <label>Kapama Başlığı (Kep)</label>
          <GlassSelect value={kol.kepAdet} onChange={e => updKol({ kepAdet: parseInt(e.target.value) })}>
            <option value={2}>Her iki uçta (2 adet)</option>
            <option value={1}>Sadece bir uçta (1 adet)</option>
            <option value={0}>Kep yok</option>
          </GlassSelect>
        </div>
        <div className="field">
          <label>Çıkış Adedi</label>
          <div style={{ display:'flex', gap:6, alignItems:'center', marginTop:5 }}>
            <input
              type="number" value={kol.rows.length} min="1" max="30"
              onChange={e => changeRowCount(parseInt(e.target.value))}
              style={{ background:'rgba(255,255,255,0.85)', border:'1px solid var(--border2)', borderRadius:999, padding:'6px 8px', fontSize:14, fontFamily:'var(--mono)', fontWeight:700, outline:'none', width:70, textAlign:'center' }}
            />
            <span style={{ fontSize:11, color:'var(--muted)' }}>çıkış</span>
          </div>
        </div>
        <div className="field">
          <label>Toplu: Çıkış Çapı</label>
          <div style={{ display:'flex', gap:6, marginTop:5 }}>
            <GlassSelect value={bulkVd} onChange={e => setBulkVd(e.target.value)} style={{ flex:1 }}>
              {PIRINCT_OPTS.map(d => <option key={d} value={d}>{DIAM_LABEL[d]}</option>)}
            </GlassSelect>
            <button
              onClick={bulkApply}
              style={{ background:'var(--acc)', color:'#fff', border:'none', borderRadius:999, padding:'6px 12px', fontSize:11, fontWeight:700, cursor:'pointer', whiteSpace:'nowrap' }}
            >
              Tümüne
            </button>
          </div>
        </div>
      </div>

      {/* Çıkış satırları tablosu */}
      <div style={{ overflowX:'auto', border:'1px solid var(--border)', borderRadius:'var(--r)' }}>
        <table style={{ width:'100%', borderCollapse:'collapse', minWidth:680 }}>
          <thead>
            <tr style={{ background:'var(--bg)' }}>
              {['#','Çıkış Çapı','İnegal Te (otomatik)','Çekvalf?','Çekvalf','Sarı Nipel / Oynar Rakor'].map(h => (
                <th key={h} style={{ padding:'7px 12px', fontSize:10, fontWeight:700, textTransform:'uppercase', color:'var(--muted)', textAlign:h==='Çekvalf?'?'center':'left', borderBottom:'1px solid var(--border)' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {kol.rows.map((row, i) => {
              const k = kol.kdiam.replace('q','');
              const c = row.vd.replace('q','');
              const cvLabel  = row.hasCv ? (() => {
                const id = cvIdFn(row.vd);
                return { 'cv34':'¾" Çekvalf','cv1':'1" Çekvalf','cv114':'1¼" Çekvalf','cv112':'1½" Çekvalf','cv2':'2" Çekvalf','cv212':'2½" Çekvalf' }[id] || id;
              })() : '—';
              const sonLabel = row.hasCv
                ? (row.vd==='q20'||row.vd==='q25'||row.vd==='q32' ? '¾" Sarı Nipel' : '1¼" Sarı Nipel')
                : 'Oynar Başlıklı Rakor';

              return (
                <tr key={i} style={{ borderBottom:'1px solid var(--border)' }}>
                  <td style={{ padding:'8px 10px', fontFamily:'var(--mono)', fontWeight:700, color:'var(--acc)', fontSize:12 }}>Çıkış {i+1}</td>
                  <td style={{ padding:'6px 10px' }}>
                    <GlassSelect
                      value={row.vd}
                      onChange={e => updRow(i, 'vd', e.target.value)}
                      style={{ minWidth: 130 }}
                    >
                      {PIRINCT_OPTS.map(d => <option key={d} value={d}>{DIAM_LABEL[d]}</option>)}
                    </GlassSelect>
                  </td>
                  <td style={{ padding:'6px 10px', fontSize:11, color:'var(--muted)', fontFamily:'var(--mono)', whiteSpace:'nowrap' }}>
                    {k}×{c}×{k} İTe
                  </td>
                  <td style={{ padding:'6px 10px', textAlign:'center' }}>
                    <input
                      type="checkbox" checked={row.hasCv}
                      onChange={e => updRow(i, 'hasCv', e.target.checked)}
                      style={{ width:16, height:16, cursor:'pointer' }}
                    />
                  </td>
                  <td style={{ padding:'6px 10px', fontSize:11, color:'var(--muted)', fontFamily:'var(--mono)', whiteSpace:'nowrap' }}>
                    {cvLabel}
                  </td>
                  <td style={{ padding:'6px 10px', fontSize:11, fontFamily:'var(--mono)', whiteSpace:'nowrap', color: row.hasCv ? 'var(--text)' : 'var(--acc)' }}>
                    {sonLabel}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
