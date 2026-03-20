// ── Step 6 — Sonuçlar ─────────────────────────────────────────────────
// Hesaplama çalıştırır, KPI'lar, hat özeti, maliyet tablosu ve Excel export.
// Proje kaydedildikten sonra "Revizyon Ekle" ile farklı markalar karşılaştırılır.

import { useState } from 'react';
import * as XLSX from 'xlsx';
import { useCalculationStore } from '../../store/calculationStore.js';
import { useDefinitionsStore }  from '../../store/definitionsStore.js';
import { useAuthStore }         from '../../store/authStore.js';
import { calculate }            from '../../lib/calculator/index.js';
import { CAT_LABEL }            from '../../lib/calculator/constants.js';
import { Card }      from '../ui/Card.jsx';
import { Button }    from '../ui/Button.jsx';
import { GlassSelect } from '../ui/GlassSelect.jsx';
import { showToast } from '../ui/Toast.jsx';

const TR = (x, d=2) => new Intl.NumberFormat('tr-TR', { minimumFractionDigits:d, maximumFractionDigits:d }).format(x);
const TI = x => new Intl.NumberFormat('tr-TR').format(Math.ceil(x));

const BRAND_CATS = [
  { key:'markaPpr',     label:'PPR Boru & Bağlantı', cat:'ppr'    },
  { key:'markaPirince', label:'Pirinç Küresel Vana',  cat:'valve'  },
  { key:'markaBd',      label:'Basınç Düşürücü',      cat:'bd'     },
  { key:'markaFiltre',  label:'Filtre & Çekvalf',     cat:'filter' },
];

// ── Hesap özeti kartları ──────────────────────────────────────────────
function ResultKPIs({ res, conf }) {
  return (
    <div className="kpis">
      <div className="kpi"><div className="kl">Toplam Daire</div><div className="kv cacc">{TI(res.totalFlats)}</div></div>
      <div className="kpi"><div className="kl">Toplam Boru</div><div className="kv">{TR(res.totalPipe,0)} m</div></div>
      {conf?.hasCirc && <div className="kpi"><div className="kl">Sirkülasyon</div><div className="kv ccirc">{TR(res.circTotal,0)} m</div></div>}
      <div className="kpi"><div className="kl">Şaft Başı Vana</div><div className="kv">{TI(res.shaftVanaTotal)} adet</div></div>
      <div className="kpi"><div className="kl">Daire Vanası</div><div className="kv">{TI(res.flatValve)} adet</div></div>
      <div className="kpi"><div className="kl">KDV'siz</div><div className="kv cgreen">{TR(res.grandNet,0)} ₺</div></div>
      <div className="kpi"><div className="kl">KDV (%{Math.round((conf?.kdvRate||0.20)*100)})</div><div className="kv chot">{TR(res.kdvAmt,0)} ₺</div></div>
      <div className="kpi" style={{ borderTop:'3px solid var(--acc)' }}>
        <div className="kl">Genel Toplam</div>
        <div className="kv cacc" style={{ fontSize:22 }}>{TR(res.grandTotal,0)} ₺</div>
        <div className="ks">KDV dahil</div>
      </div>
    </div>
  );
}

export function Step6Results({ goStep }) {
  const {
    config, result, setResult,
    saveProject, saveHistory, projectName, projectId,
    revisions, addRevision, deleteRevision,
  } = useCalculationStore();
  const { brands, fetchBrandPriceMap } = useDefinitionsStore();
  const { user } = useAuthStore();

  const [error,    setError]    = useState(null);
  const [saving,   setSaving]   = useState(false);
  const [saveName, setSaveName] = useState(projectName || '');
  const [showSave, setShowSave] = useState(false);

  // Revizyon ekleme paneli
  const [showRevPanel, setShowRevPanel] = useState(false);
  const [revName,      setRevName]      = useState('');
  const [revBrands,    setRevBrands]    = useState({ markaPpr:'', markaPirince:'', markaBd:'', markaFiltre:'' });
  const [revCalcing,   setRevCalcing]   = useState(false);

  function brandName(id) {
    if (!id) return '—';
    return brands.find(b => b.id === id)?.name || id;
  }

  // ── Ana hesaplama ────────────────────────────────────────────────
  function runCalculation() {
    setError(null);
    try {
      const totalFlats = (config.floors || []).reduce((s, f) => s + f.count, 0);
      if (!totalFlats) { setError('Kat dağılımı girilmemiş! Adım 3\'e dönün.'); return; }
      const res = calculate({ ...config, totalFlats }, config.priceOverride || {});
      setResult(res);
    } catch (err) {
      setError(err.message || 'Hesaplama hatası');
    }
  }

  // ── Proje kaydet ─────────────────────────────────────────────────
  async function handleSave() {
    if (!saveName.trim()) { showToast('Proje adı boş olamaz'); return; }
    setSaving(true);
    const withTimeout = (p, ms) => Promise.race([
      p,
      new Promise((_, rej) => setTimeout(() => rej(new Error('Bağlantı zaman aşımı')), ms)),
    ]);
    try {
      await withTimeout(saveProject(user.id, saveName.trim()), 12000);
      try { if (result) await withTimeout(saveHistory(user.id, result), 8000); }
      catch (e) { console.warn('Geçmiş kaydı başarısız:', e); }
      showToast('✓ Proje kaydedildi');
      setShowSave(false);
    } catch (err) {
      showToast('Kayıt hatası: ' + (err.message || 'Bilinmeyen'));
    } finally {
      setSaving(false);
    }
  }

  // ── Revizyon hesapla ve ekle ──────────────────────────────────────
  async function handleAddRevision() {
    if (!revName.trim()) { showToast('⚠ Revizyon adı boş olamaz.'); return; }
    const missing = BRAND_CATS.find(b => !revBrands[b.key]);
    if (missing) { showToast(`⚠ ${missing.label} seçilmemiş.`); return; }

    setRevCalcing(true);
    try {
      // Seçili markaların fiyatlarını yükle
      const priceOv = {};
      for (const { key, cat } of BRAND_CATS) {
        const map = await fetchBrandPriceMap(revBrands[key]);
        Object.assign(priceOv, map);
      }
      // Aynı config, farklı fiyatlarla hesapla
      const totalFlats = (config.floors || []).reduce((s, f) => s + f.count, 0);
      const res = calculate({ ...config, totalFlats }, priceOv);

      addRevision({
        name:          revName.trim(),
        brands:        { ...revBrands },
        priceOverride: priceOv,
        result:        res,
      });
      showToast(`✓ "${revName.trim()}" revizyonu eklendi.`);
      setShowRevPanel(false);
      setRevName('');
      setRevBrands({ markaPpr:'', markaPirince:'', markaBd:'', markaFiltre:'' });
    } catch (err) {
      showToast('Hesaplama hatası: ' + (err.message || 'Bilinmeyen'));
    } finally {
      setRevCalcing(false);
    }
  }

  // ── Excel export ─────────────────────────────────────────────────
  function exportExcel() {
    if (!result) return;
    const rows = [['KATEGORİ','MALZEMİ ADI','BİRİM','MİKTAR']];
    result.lines.forEach(it => rows.push([CAT_LABEL[it.cat]||it.cat, it.n, it.u, Math.ceil(it.qty)]));
    rows.push([]);
    rows.push(['','KDV\'siz Toplam','₺', result.grandNet.toFixed(2)]);
    rows.push(['','KDV','₺', result.kdvAmt.toFixed(2)]);
    rows.push(['','Genel Toplam (KDV Dahil)','₺', result.grandTotal.toFixed(2)]);
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{wch:16},{wch:46},{wch:8},{wch:12}];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Malzeme Listesi');
    XLSX.writeFile(wb, 'ppr_malzeme_listesi.xlsx');
  }

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div>

      {/* Hesapla */}
      <div style={{ marginBottom:16 }}>
        <Button variant="calc" onClick={runCalculation}>⚡ Hesapla</Button>
      </div>

      {error && <div className="al al-w" style={{ marginBottom:14 }}>{error}</div>}
      {!result && !error && <div className="al al-i">Henüz hesaplama yapılmadı. "Hesapla" butonuna basın.</div>}

      {result && (
        <>
          {/* KPI kartları */}
          <ResultKPIs res={result} conf={config} />

          {/* Kolektör özeti */}
          {result.kolSummary?.length > 0 && (
            <div className="al al-ok" style={{ marginBottom:13 }}>
              <strong>🔩 Kolektör & Çıkış Özeti</strong><br />
              {result.kolSummary.map((s,i) => <span key={i}>• {s}<br /></span>)}
            </div>
          )}

          {/* Hat özeti */}
          <Card accent="acc" title="Hat Bazlı Boru Özeti">
            <div className="hat3">
              {config.hasHot && (
                <div className="hcard hot">
                  <div className="hcard-title hot">🔴 Sıcak Su</div>
                  <div className="hrow"><span>Yatay</span><span className="hrow-v">{TR(result.hotYatay,0)} m</span></div>
                  <div className="hrow"><span>Dikey</span><span className="hrow-v">{TR(result.hotDikey,0)} m</span></div>
                  <div className="hrow"><span>Branşman</span><span className="hrow-v">{TR((config.brHot||0)*result.totalFlats,0)} m</span></div>
                  <div className="hrow"><span>TOPLAM</span><span className="hrow-v" style={{ color:'var(--hot)' }}>{TR(result.hotYatay+result.hotDikey+(config.brHot||0)*result.totalFlats,0)} m</span></div>
                </div>
              )}
              {config.hasCirc && (
                <div className="hcard circ">
                  <div className="hcard-title circ">🟣 Sirkülasyon</div>
                  <div className="hrow"><span>Yatay</span><span className="hrow-v">{TR(config.circYatay||0,0)} m</span></div>
                  <div className="hrow"><span>Dikey</span><span className="hrow-v">{TR((config.circDikey||0)*(config.shaft||1),0)} m</span></div>
                  <div className="hrow"><span>Daire bağlantıları</span><span className="hrow-v">{TR((config.circFlat||0)*result.totalFlats,0)} m</span></div>
                  <div className="hrow"><span>TOPLAM</span><span className="hrow-v" style={{ color:'var(--circ)' }}>{TR(result.circTotal,0)} m</span></div>
                </div>
              )}
              {config.hasCold && (
                <div className="hcard cold">
                  <div className="hcard-title cold">🔵 Soğuk Su</div>
                  <div className="hrow"><span>Yatay</span><span className="hrow-v">{TR(result.coldYatay,0)} m</span></div>
                  <div className="hrow"><span>Dikey</span><span className="hrow-v">{TR(result.coldDikey,0)} m</span></div>
                  <div className="hrow"><span>Branşman</span><span className="hrow-v">{TR((config.brCold||0)*result.totalFlats,0)} m</span></div>
                  <div className="hrow"><span>TOPLAM</span><span className="hrow-v" style={{ color:'var(--cold)' }}>{TR(result.coldYatay+result.coldDikey+(config.brCold||0)*result.totalFlats,0)} m</span></div>
                </div>
              )}
            </div>
          </Card>

          {/* Maliyet Tablosu */}
          <Card accent="acc" title="Malzeme & Maliyet Detayı">
            <div className="rtw">
              <table style={{ minWidth:640 }}>
                <thead>
                  <tr>
                    <th>Ürün</th><th>Birim</th>
                    <th style={{ textAlign:'right' }}>Miktar</th>
                    <th style={{ textAlign:'right' }}>Net (₺)</th>
                    <th style={{ textAlign:'right' }}>Tutar (₺)</th>
                    <th>Pay</th>
                  </tr>
                </thead>
                <tbody>
                  {['boru','vana','baglanti','mekanik'].map(cat => {
                    const its = result.lines.filter(i => i.cat === cat);
                    if (!its.length) return null;
                    const catSum = its.reduce((s,i) => s+i.row, 0);
                    return [
                      <tr key={'cat-'+cat} className="tr-cat"><td colSpan={6}>{CAT_LABEL[cat]}</td></tr>,
                      ...its.map(it => {
                        const pct = Math.min(100, (it.row / result.grandNet) * 100 * 3.5).toFixed(0);
                        return (
                          <tr key={it.id}>
                            <td style={{ fontSize:12 }}>
                              {it.n}
                              {it._missing && <span style={{ color:'var(--warn)', fontSize:10, marginLeft:4 }}>⚠ fiyat listesine ekle</span>}
                            </td>
                            <td style={{ fontFamily:'var(--mono)', color:'var(--muted)' }}>{it.u}</td>
                            <td style={{ textAlign:'right', fontFamily:'var(--mono)', color:'var(--acc)' }}>{TI(it.qty)}</td>
                            <td style={{ textAlign:'right', fontFamily:'var(--mono)' }}>{it._missing ? '—' : TR(it.net)}</td>
                            <td style={{ textAlign:'right', fontFamily:'var(--mono)' }}>{it._missing ? '—' : TR(it.row,0)}</td>
                            <td><div className="bbar"><div className="bfill" style={{ width:`${pct}%` }}></div></div></td>
                          </tr>
                        );
                      }),
                      <tr key={'sub-'+cat} className="tr-sub">
                        <td colSpan={4}>▸ {CAT_LABEL[cat]} Ara Toplam</td>
                        <td style={{ textAlign:'right' }}>{TR(catSum,0)} ₺</td><td></td>
                      </tr>,
                    ];
                  })}
                  <tr className="tr-kdvsiz"><td colSpan={4} style={{ fontWeight:800 }}>KDV'siz Toplam</td><td style={{ textAlign:'right' }}>{TR(result.grandNet,0)} ₺</td><td></td></tr>
                  <tr className="tr-kdv">   <td colSpan={4} style={{ fontWeight:800 }}>KDV (%{Math.round((config.kdvRate||0.20)*100)})</td><td style={{ textAlign:'right' }}>{TR(result.kdvAmt,0)} ₺</td><td></td></tr>
                  <tr className="tr-genel"><td colSpan={4} style={{ fontSize:15 }}>🏆 Genel Toplam (KDV Dahil)</td><td style={{ textAlign:'right', fontSize:15 }}>{TR(result.grandTotal,0)} ₺</td><td></td></tr>
                </tbody>
              </table>
            </div>
          </Card>

          {/* ── Aksiyon butonları ── */}
          <div className="btn-row no-print" style={{ marginTop:16 }}>
            <Button variant="default" onClick={() => window.print()}>🖨 Yazdır / PDF</Button>
            <Button variant="success" onClick={exportExcel} style={{ background:'#1d6f42', color:'#fff' }}>📥 Excel İndir</Button>
            <Button variant="primary" onClick={() => { setShowSave(v => !v); setSaveName(projectName || ''); }}>
              💾 Projeyi Kaydet
            </Button>
            {projectId && (
              <Button variant="default" onClick={() => { setShowRevPanel(v => !v); setRevName(`Revizyon ${revisions.length + 1}`); }}>
                + Marka Revizyonu Ekle
              </Button>
            )}
            <Button variant="default" onClick={() => goStep(0)}>↩ Başa Dön</Button>
          </div>

          {/* ── Proje kaydet formu ── */}
          {showSave && (
            <div style={{ marginTop:10, padding:'14px 16px', background:'var(--bg)', border:'1px solid var(--border)', borderRadius:'var(--r)' }}>
              <div style={{ fontSize:12, fontWeight:700, marginBottom:10 }}>Proje Adı</div>
              <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                <input
                  value={saveName}
                  onChange={e => setSaveName(e.target.value)}
                  placeholder="Örn: Güneş Apt. — Merkezi SMS"
                  style={{ flex:1, minWidth:220, padding:'8px 14px', border:'1px solid var(--border)', borderRadius:'var(--r)', fontSize:13, fontFamily:'var(--sans)', outline:'none', background:'var(--white)' }}
                  onKeyDown={e => e.key === 'Enter' && handleSave()}
                />
                <Button variant="primary" onClick={handleSave} disabled={saving}>
                  {saving ? 'Kaydediliyor…' : '💾 Kaydet'}
                </Button>
                <Button variant="default" onClick={() => setShowSave(false)}>İptal</Button>
              </div>
              {!projectId && (
                <div style={{ marginTop:8, fontSize:11, color:'var(--muted)' }}>
                  ℹ Proje kaydedildikten sonra "Marka Revizyonu Ekle" butonu aktif olur.
                </div>
              )}
            </div>
          )}

          {/* ── Revizyon ekleme paneli ── */}
          {showRevPanel && (
            <div style={{ marginTop:10, padding:'16px 18px', background:'var(--bg)', border:'1px solid var(--border)', borderRadius:'var(--r)' }}>
              <div style={{ fontSize:13, fontWeight:700, color:'var(--acc)', marginBottom:12 }}>
                + Marka Revizyonu — aynı bina, farklı markalarla fiyat karşılaştırması
              </div>

              {/* Revizyon adı */}
              <div style={{ marginBottom:12 }}>
                <div style={{ fontSize:11, fontWeight:600, color:'var(--muted)', marginBottom:5 }}>Revizyon Adı</div>
                <input
                  value={revName}
                  onChange={e => setRevName(e.target.value)}
                  placeholder="örn: Wavin Teklifi"
                  style={{ width:'100%', maxWidth:320, padding:'7px 12px', border:'1px solid var(--border)', borderRadius:'var(--r)', fontSize:13, fontFamily:'var(--sans)', outline:'none', background:'var(--white)' }}
                />
              </div>

              {/* Marka seçiciler */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(210px, 1fr))', gap:10, marginBottom:14 }}>
                {BRAND_CATS.map(({ key, label, cat }) => (
                  <div key={key}>
                    <div style={{ fontSize:11, fontWeight:600, color:'var(--muted)', marginBottom:4 }}>{label}</div>
                    <GlassSelect value={revBrands[key]} onChange={e => setRevBrands(p => ({ ...p, [key]: e.target.value }))}>
                      <option value="">— Marka seçin —</option>
                      {brands.filter(b => b.category === cat).map(b => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </GlassSelect>
                  </div>
                ))}
              </div>

              <div style={{ display:'flex', gap:8 }}>
                <Button variant="primary" onClick={handleAddRevision} disabled={revCalcing}>
                  {revCalcing ? '⚡ Hesaplanıyor…' : '⚡ Hesapla & Karşılaştırmaya Ekle'}
                </Button>
                <Button variant="default" onClick={() => setShowRevPanel(false)}>İptal</Button>
              </div>
            </div>
          )}

          {/* ── Marka Karşılaştırma Tablosu ── */}
          {revisions.length > 0 && (
            <Card accent="green" title="Marka Karşılaştırması" badge="★">
              <p style={{ fontSize:12, color:'var(--muted)', marginBottom:14 }}>
                Temel hesap + eklenen revizyonlar. En düşük fiyat yeşil olarak işaretlenir.
              </p>

              <div className="rtw">
                <table style={{ minWidth: 400 + revisions.length * 140 }}>
                  <thead>
                    <tr>
                      <th style={{ minWidth:160 }}>Kalem</th>
                      <th style={{ textAlign:'right', color:'var(--acc)' }}>
                        Temel Hesap<br />
                        <span style={{ fontSize:10, fontWeight:400 }}>
                          {brandName(config.markaPpr)} · {brandName(config.markaPirince)}
                        </span>
                      </th>
                      {revisions.map(r => (
                        <th key={r.id} style={{ textAlign:'right' }}>
                          {r.name}
                          <br />
                          <span style={{ fontSize:10, fontWeight:400 }}>
                            {brandName(r.brands.markaPpr)} · {brandName(r.brands.markaPirince)}
                          </span>
                          <button
                            onClick={() => { if (confirm(`"${r.name}" silinsin mi?`)) deleteRevision(r.id); }}
                            style={{ marginLeft:6, background:'none', border:'none', cursor:'pointer', fontSize:12, opacity:.4, padding:0 }}
                            title="Sil"
                          >×</button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { label:'Toplam Boru (m)',      fn: r => TR(r.totalPipe,  0) + ' m' },
                      { label:'Toplam Daire',          fn: r => TI(r.totalFlats)           },
                      { label:'KDV\'siz Tutar',        fn: r => TR(r.grandNet,   0) + ' ₺', bold:true },
                      { label:'KDV (%20)',              fn: r => TR(r.kdvAmt,     0) + ' ₺' },
                      { label:'Genel Toplam (KDV\'li)',fn: r => TR(r.grandTotal, 0) + ' ₺', bold:true, compare:true },
                    ].map(row => {
                      const allResults = [result, ...revisions.map(r => r.result)];
                      const minTotal = row.compare ? Math.min(...allResults.map(r => r.grandTotal)) : null;
                      return (
                        <tr key={row.label} style={row.bold ? { fontWeight:700 } : {}}>
                          <td style={{ fontSize:12 }}>{row.label}</td>
                          {allResults.map((r, i) => {
                            const isMin = row.compare && r.grandTotal === minTotal;
                            return (
                              <td key={i} style={{
                                textAlign:'right', fontFamily:'var(--mono)',
                                color:      isMin ? 'var(--green)' : undefined,
                                fontWeight: (row.bold || isMin) ? 700 : undefined,
                              }}>
                                {row.fn(r)}
                                {isMin && <span style={{ display:'block', fontSize:10, color:'var(--green)' }}>✓ En ucuz</span>}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}

                    {/* Fark satırı — temel hesap baz */}
                    <tr style={{ background:'var(--bg)', fontSize:12 }}>
                      <td style={{ color:'var(--muted)', fontStyle:'italic' }}>Fark (Temel baz)</td>
                      <td style={{ textAlign:'right', fontFamily:'var(--mono)', color:'var(--muted)' }}>—</td>
                      {revisions.map(r => {
                        const diff = r.result.grandTotal - result.grandTotal;
                        return (
                          <td key={r.id} style={{
                            textAlign:'right', fontFamily:'var(--mono)', fontWeight:600,
                            color: diff < 0 ? 'var(--green)' : diff > 0 ? 'var(--hot)' : 'var(--muted)',
                          }}>
                            {(diff >= 0 ? '+' : '') + TR(diff, 0) + ' ₺'}
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}

      <div className="btn-row" style={{ marginTop:16 }}>
        <Button variant="default" onClick={() => goStep(4)}>← Geri</Button>
      </div>
    </div>
  );
}
