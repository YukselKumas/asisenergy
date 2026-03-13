// ── Step 6 — Sonuçlar ─────────────────────────────────────────────────
// Hesaplama çalıştırır, KPI'lar, hat özeti, maliyet tablosu ve Excel export.

import { useState } from 'react';
import * as XLSX from 'xlsx';
import { useCalculationStore } from '../../store/calculationStore.js';
import { useAuthStore } from '../../store/authStore.js';
import { calculate } from '../../lib/calculator/index.js';
import { DIAM_LABEL, CAT_LABEL } from '../../lib/calculator/constants.js';
import { Card }   from '../ui/Card.jsx';
import { Button } from '../ui/Button.jsx';
import { Badge }  from '../ui/Badge.jsx';
import { showToast } from '../ui/Toast.jsx';

const TR  = (x, d=2) => new Intl.NumberFormat('tr-TR', { minimumFractionDigits:d, maximumFractionDigits:d }).format(x);
const TI  = x => new Intl.NumberFormat('tr-TR').format(Math.ceil(x));

export function Step6Results({ goStep }) {
  const { config, result, setResult, saveProject, saveHistory, projectName } = useCalculationStore();
  const { user } = useAuthStore();
  const [error,      setError]      = useState(null);
  const [saving,     setSaving]     = useState(false);
  const [saveName,   setSaveName]   = useState(projectName || '');
  const [showSave,   setShowSave]   = useState(false);

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

  async function handleSave() {
    if (!saveName.trim()) { showToast('Proje adı boş olamaz'); return; }
    setSaving(true);
    try {
      const id = await saveProject(user.id, saveName.trim());
      if (result) await saveHistory(user.id, result);
      showToast('Proje kaydedildi ✓');
      setShowSave(false);
    } catch (err) {
      showToast('Kayıt hatası: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

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

  return (
    <div>
      {/* Hesapla butonu */}
      <div style={{ marginBottom:16 }}>
        <Button variant="calc" onClick={runCalculation}>⚡ Hesapla</Button>
      </div>

      {error && (
        <div className="al al-w" style={{ marginBottom:14 }}>{error}</div>
      )}

      {!result && !error && (
        <div className="al al-i">Henüz hesaplama yapılmadı. "Hesapla" butonuna basın.</div>
      )}

      {result && (
        <>
          {/* KPI */}
          <div className="kpis">
            <div className="kpi"><div className="kl">Toplam Daire</div><div className="kv cacc">{TI(result.totalFlats)}</div></div>
            <div className="kpi"><div className="kl">Toplam Boru</div><div className="kv">{TR(result.totalPipe,0)} m</div></div>
            {config.hasCirc && <div className="kpi"><div className="kl">Sirkülasyon</div><div className="kv ccirc">{TR(result.circTotal,0)} m</div></div>}
            <div className="kpi"><div className="kl">Şaft Başı Vana</div><div className="kv">{TI(result.shaftVanaTotal)} adet</div></div>
            <div className="kpi"><div className="kl">Daire Vanası</div><div className="kv">{TI(result.flatValve)} adet</div></div>
            <div className="kpi"><div className="kl">KDV'siz</div><div className="kv cgreen">{TR(result.grandNet,0)} ₺</div></div>
            <div className="kpi"><div className="kl">KDV (%{Math.round((config.kdvRate||0.20)*100)})</div><div className="kv chot">{TR(result.kdvAmt,0)} ₺</div></div>
            <div className="kpi" style={{ borderTop:'3px solid var(--acc)' }}>
              <div className="kl">Genel Toplam</div>
              <div className="kv cacc" style={{ fontSize:22 }}>{TR(result.grandTotal,0)} ₺</div>
              <div className="ks">KDV dahil</div>
            </div>
          </div>

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

          {/* Aksiyon butonları */}
          <div className="btn-row no-print">
            <Button variant="default" onClick={() => window.print()}>🖨 Yazdır / PDF</Button>
            <Button variant="success" onClick={exportExcel} style={{ background:'#1d6f42', color:'#fff' }}>📥 Excel İndir</Button>
            <Button variant="primary" onClick={() => setShowSave(!showSave)}>💾 Projeyi Kaydet</Button>
            <Button variant="default" onClick={() => goStep(0)}>↩ Başa Dön</Button>
          </div>

          {/* Kaydet formu */}
          {showSave && (
            <div style={{ marginTop:12, padding:16, background:'var(--white)', border:'1px solid var(--border)', borderRadius:'var(--r2)' }}>
              <div className="field" style={{ maxWidth:360 }}>
                <label>Proje Adı</label>
                <input type="text" value={saveName} onChange={e => setSaveName(e.target.value)}
                  placeholder="Örn: Güneş Apt. — Merkezi SMS" />
              </div>
              <div className="btn-row" style={{ marginTop:10 }}>
                <Button variant="primary" onClick={handleSave} disabled={saving}>
                  {saving ? 'Kaydediliyor...' : '💾 Kaydet'}
                </Button>
                <Button variant="default" onClick={() => setShowSave(false)}>İptal</Button>
              </div>
            </div>
          )}
        </>
      )}

      <div className="btn-row" style={{ marginTop:16 }}>
        <Button variant="default" onClick={() => goStep(4)}>← Geri</Button>
      </div>
    </div>
  );
}
