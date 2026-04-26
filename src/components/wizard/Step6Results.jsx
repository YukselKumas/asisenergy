// ── Step 6 — Sonuçlar ─────────────────────────────────────────────────
// Hesapla → Sonuçları gör → Projeyi kaydet → Ana Sayfaya yönlendir.
// Varyasyon oluşturmak için Geçmiş sayfasından "Yeni Varyasyon" kullanılır.

import { useState, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { useCalculationStore } from '../../store/calculationStore.js';
import { useAuthStore }         from '../../store/authStore.js';
import { calculate }            from '../../lib/calculator/index.js';
import { CAT_LABEL }            from '../../lib/calculator/constants.js';
import { useValidation }        from '../../hooks/useValidation.js';
import { Card }      from '../ui/Card.jsx';
import { Button }    from '../ui/Button.jsx';
import { showToast } from '../ui/Toast.jsx';

const TR = (x, d=2) => new Intl.NumberFormat('tr-TR', { minimumFractionDigits:d, maximumFractionDigits:d }).format(x);
const TI = x => new Intl.NumberFormat('tr-TR').format(Math.ceil(x));

// ── Alt bileşenler (memo ile gereksiz re-render önlenir) ─────────────

const ResultKPIs = memo(function ResultKPIs({ res, conf }) {
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
});

const PipeSummary = memo(function PipeSummary({ result, config }) {
  const br = config.brHot || 0;
  const bc = config.brCold || 0;
  const tf = result.totalFlats;
  return (
    <Card accent="acc" title="Hat Bazlı Boru Özeti">
      <div className="hat3">
        {config.hasHot && (
          <div className="hcard hot">
            <div className="hcard-title hot">🔴 Sıcak Su</div>
            <div className="hrow"><span>Yatay</span><span className="hrow-v">{TR(result.hotYatay,0)} m</span></div>
            <div className="hrow"><span>Dikey</span><span className="hrow-v">{TR(result.hotDikey,0)} m</span></div>
            <div className="hrow"><span>Branşman</span><span className="hrow-v">{TR(br*tf,0)} m</span></div>
            <div className="hrow"><span>TOPLAM</span><span className="hrow-v" style={{ color:'var(--hot)' }}>{TR(result.hotYatay+result.hotDikey+br*tf,0)} m</span></div>
          </div>
        )}
        {config.hasCirc && (
          <div className="hcard circ">
            <div className="hcard-title circ">🟣 Sirkülasyon</div>
            <div className="hrow"><span>Yatay</span><span className="hrow-v">{TR(config.circYatay||0,0)} m</span></div>
            <div className="hrow"><span>Dikey</span><span className="hrow-v">{TR(result.circDikeyTotal||0,0)} m</span></div>
            <div className="hrow"><span>TOPLAM</span><span className="hrow-v" style={{ color:'var(--circ)' }}>{TR(result.circTotal,0)} m</span></div>
          </div>
        )}
        {config.hasCold && (
          <div className="hcard cold">
            <div className="hcard-title cold">🔵 Soğuk Su</div>
            <div className="hrow"><span>Yatay</span><span className="hrow-v">{TR(result.coldYatay,0)} m</span></div>
            <div className="hrow"><span>Dikey</span><span className="hrow-v">{TR(result.coldDikey,0)} m</span></div>
            <div className="hrow"><span>Branşman</span><span className="hrow-v">{TR(bc*tf,0)} m</span></div>
            <div className="hrow"><span>TOPLAM</span><span className="hrow-v" style={{ color:'var(--cold)' }}>{TR(result.coldYatay+result.coldDikey+bc*tf,0)} m</span></div>
          </div>
        )}
      </div>
    </Card>
  );
});

const CostTable = memo(function CostTable({ result, kdvRate }) {
  return (
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
                      <td style={{ fontSize:12, background: it._noprice ? 'rgba(245,158,11,0.07)' : undefined }}>
                        {it.n}
                        {it._missing  && <span style={{ color:'var(--warn)', fontSize:10, marginLeft:4 }}>⚠ fiyat listesine ekle</span>}
                        {it._noprice  && <span style={{ color:'var(--warn)', fontSize:10, marginLeft:4 }}>⚠ fiyat girilmemiş</span>}
                      </td>
                      <td style={{ fontFamily:'var(--mono)', color:'var(--muted)' }}>{it.u}</td>
                      <td style={{ textAlign:'right', fontFamily:'var(--mono)', color:'var(--acc)' }}>{TI(it.qty)}</td>
                      <td style={{ textAlign:'right', fontFamily:'var(--mono)', color: it._noprice ? 'var(--warn)' : undefined }}>{(it._missing || it._noprice) ? '—' : TR(it.net)}</td>
                      <td style={{ textAlign:'right', fontFamily:'var(--mono)', color: it._noprice ? 'var(--warn)' : undefined }}>{(it._missing || it._noprice) ? '—' : TR(it.row,0)}</td>
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
            <tr className="tr-kdv">   <td colSpan={4} style={{ fontWeight:800 }}>KDV (%{Math.round((kdvRate||0.20)*100)})</td><td style={{ textAlign:'right' }}>{TR(result.kdvAmt,0)} ₺</td><td></td></tr>
            <tr className="tr-genel"><td colSpan={4} style={{ fontSize:15 }}>🏆 Genel Toplam (KDV Dahil)</td><td style={{ textAlign:'right', fontSize:15 }}>{TR(result.grandTotal,0)} ₺</td><td></td></tr>
          </tbody>
        </table>
      </div>
    </Card>
  );
});

// ── Doğrulama Bölümü ─────────────────────────────────────────────────

const TR2 = x => new Intl.NumberFormat('tr-TR', { minimumFractionDigits:2, maximumFractionDigits:2 }).format(x);

const STATUS_ICON  = { ok:'✅', warn:'⚠️', error:'❌' };
const STATUS_COLOR = { ok:'#22c55e', warn:'#f59e0b', error:'#ef4444' };

function ScoreCard({ label, value, sub, color }) {
  return (
    <div style={{ flex:1, minWidth:130, padding:'12px 14px', background:'var(--white)', border:`2px solid ${color}`, borderRadius:'var(--r)', textAlign:'center' }}>
      <div style={{ fontSize:10, color:'var(--muted)', fontWeight:700, letterSpacing:.5, marginBottom:4 }}>{label}</div>
      <div style={{ fontSize:30, fontWeight:900, color, lineHeight:1 }}>{value}</div>
      <div style={{ fontSize:11, color, fontWeight:600, marginTop:4 }}>{sub}</div>
    </div>
  );
}

const ValidationSection = memo(function ValidationSection({ config, result, projectId }) {
  const { validation, save } = useValidation(config, result);
  const [saving, setSaving]  = useState(false);
  const [saved,  setSaved]   = useState(false);

  if (!validation) return null;

  const { score, idr, qai, are, effectiveLength } = validation;

  const scoreColor = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444';
  const scoreLabel = score >= 80 ? 'İyi'     : score >= 60 ? 'Orta'    : 'Düşük';
  const qaiColor   = qai.avg <= 10 ? '#22c55e' : qai.avg <= 20 ? '#f59e0b' : '#ef4444';
  const qaiLabel   = qai.avg <= 10 ? '✅ Tutarlı' : qai.avg <= 20 ? '⚠️ Kontrol Et' : '❌ Yüksek Fark';
  const areColor   = are.ratio >= 80 ? '#22c55e' : '#f59e0b';

  async function handleSave() {
    if (!projectId) { showToast('Önce projeyi kaydedin'); return; }
    if (saved) return;
    setSaving(true);
    try {
      await save(projectId);
      setSaved(true);
      showToast('✓ Doğrulama kaydedildi');
    } catch (e) {
      showToast('Kayıt hatası: ' + e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card accent="warn" title="Doğrulama & Kalite Kontrolü" badge="QA">

      {/* ── Metrik kartları ── */}
      <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:16 }}>
        <ScoreCard label="DOĞRULAMA PUANI" value={score} sub={scoreLabel}          color={scoreColor} />
        <ScoreCard label="QAI — MİKTAR"    value={`%${qai.avg.toFixed(1)}`} sub={qaiLabel} color={qaiColor} />
        <ScoreCard label="ARE — OTOMASYON" value={`%${are.ratio.toFixed(0)}`} sub={`${are.inStandard}/${are.total} çap standart`} color={areColor} />
        <ScoreCard label="IDR — TUTARSIZLIK" value={idr.length} sub={idr.length === 0 ? '✅ Sorun yok' : `${idr.length} uyarı`} color={idr.length === 0 ? '#22c55e' : '#ef4444'} />
      </div>

      {/* ── IDR uyarıları ── */}
      {idr.length > 0 && (
        <div style={{ marginBottom:14, padding:'10px 14px', background:'rgba(239,68,68,0.06)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:'var(--r2)' }}>
          <div style={{ fontSize:12, fontWeight:700, color:'#ef4444', marginBottom:6 }}>Mantık Tutarsızlıkları (IDR)</div>
          {idr.map((f, i) => (
            <div key={i} style={{ fontSize:12, color:'#ef4444', marginBottom:2 }}>⚠ {f.message}</div>
          ))}
        </div>
      )}

      {/* ── Fitting karşılaştırma tablosu ── */}
      {qai.details.length > 0 && (
        <div style={{ marginBottom:14 }}>
          <div style={{ fontSize:13, fontWeight:700, marginBottom:8 }}>
            Fitting Karşılaştırması
            <span style={{ fontSize:11, color:'var(--muted)', fontWeight:400, marginLeft:8 }}>
              Standart katsayı (h=1.5 / v=0.8 per 10m) vs hesaplanan
            </span>
          </div>
          <div className="rtw">
            <table style={{ minWidth:480 }}>
              <thead>
                <tr>
                  <th>Fitting</th>
                  <th style={{ textAlign:'right' }}>Standart Öneri</th>
                  <th style={{ textAlign:'right' }}>Hesaplanan</th>
                  <th style={{ textAlign:'right' }}>Fark %</th>
                  <th style={{ textAlign:'center' }}>Durum</th>
                </tr>
              </thead>
              <tbody>
                {qai.details.map(row => (
                  <tr key={row.id}>
                    <td style={{ fontFamily:'var(--mono)', fontSize:12, fontWeight:600 }}>{row.id}</td>
                    <td style={{ textAlign:'right', fontFamily:'var(--mono)' }}>{row.suggested}</td>
                    <td style={{ textAlign:'right', fontFamily:'var(--mono)' }}>{row.actual}</td>
                    <td style={{ textAlign:'right', fontFamily:'var(--mono)', fontWeight:700,
                      color: STATUS_COLOR[row.status] }}>
                      {row.diffPct > 0 ? '+' : ''}{row.diffPct.toFixed(1)}%
                    </td>
                    <td style={{ textAlign:'center', fontSize:14 }}>{STATUS_ICON[row.status]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Crane TP-410 efektif uzunluk ── */}
      <div style={{ padding:'12px 16px', background:'rgba(59,130,246,0.05)', border:'1px solid var(--border)', borderRadius:'var(--r2)', marginBottom:14 }}>
        <div style={{ fontSize:13, fontWeight:700, marginBottom:10 }}>
          Crane TP-410 Efektif Eşdeğer Boru Uzunluğu
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:10, fontSize:13 }}>
          <div>
            <div style={{ fontSize:10, color:'var(--muted)', fontWeight:700 }}>DÜIZ BORU</div>
            <div style={{ fontSize:18, fontWeight:800 }}>{TR2(effectiveLength.L_straight)} m</div>
          </div>
          <div>
            <div style={{ fontSize:10, color:'var(--muted)', fontWeight:700 }}>FİTTİNG EK (Le)</div>
            <div style={{ fontSize:18, fontWeight:800 }}>+{TR2(effectiveLength.Le_total)} m</div>
          </div>
          <div>
            <div style={{ fontSize:10, color:'var(--acc)', fontWeight:700 }}>EFEKTİF UZUNLUK</div>
            <div style={{ fontSize:18, fontWeight:800, color:'var(--acc)' }}>{TR2(effectiveLength.L_effective)} m</div>
          </div>
          <div>
            <div style={{ fontSize:10, color:'#22c55e', fontWeight:700 }}>ÖNERİLEN (%15 EMNİYET)</div>
            <div style={{ fontSize:18, fontWeight:800, color:'#22c55e' }}>{TR2(effectiveLength.L_recommended)} m</div>
          </div>
        </div>
      </div>

      {/* ── Kaydet ── */}
      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
        <Button
          variant="default"
          onClick={handleSave}
          disabled={saving || saved}
          style={{ fontSize:12, padding:'4px 14px' }}
        >
          {saved ? '✓ Kaydedildi' : saving ? 'Kaydediliyor…' : '📋 Doğrulamayı Kaydet'}
        </Button>
        {!projectId && (
          <span style={{ fontSize:11, color:'var(--muted)' }}>
            Kaydetmek için önce projeyi kaydedin
          </span>
        )}
      </div>
    </Card>
  );
});

// ── Ana bileşen ───────────────────────────────────────────────────────

export function Step6Results({ goStep }) {
  // Seçici abonelikler — her alan için ayrı subscription, gereksiz re-render önlenir
  const config          = useCalculationStore(s => s.config);
  const result          = useCalculationStore(s => s.result);
  const setResult       = useCalculationStore(s => s.setResult);
  const saveProject     = useCalculationStore(s => s.saveProject);
  const saveHistory     = useCalculationStore(s => s.saveHistory);
  const projectName     = useCalculationStore(s => s.projectName);
  const parentProjectId = useCalculationStore(s => s.parentProjectId);
  const loadedParentId  = useCalculationStore(s => s.loadedParentId);
  const isReadOnly      = useCalculationStore(s => s.isReadOnly);
  const startRevision   = useCalculationStore(s => s.startRevision);
  const { user }        = useAuthStore();
  const navigate        = useNavigate();

  const projectId = useCalculationStore(s => s.projectId);

  const [error,     setError]     = useState(null);
  const [saving,    setSaving]    = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [saveName,  setSaveName]  = useState(projectName || '');
  const [showSave,  setShowSave]  = useState(false);

  function handleStartRevision() {
    // Eğer bir varyasyonu görüntülüyorsak (loadedParentId var), yeni varyasyon
    // o varyasyonun değil ROOT projenin altında oluşmalı (sibling, child değil).
    const rootId   = loadedParentId || projectId;
    const rootName = projectName.replace(/\s*—\s*V\d+$/, ''); // " — V1" suffix temizle
    startRevision({ id: rootId, name: rootName, config });
    navigate('/hesaplama/yeni');
  }

  // ── Hesapla ────────────────────────────────────────────────────
  const runCalculation = useCallback(() => {
    setError(null);
    try {
      const totalFlats = (config.floors || []).reduce((s, f) => s + f.count, 0);
      if (!totalFlats) { setError('Kat dağılımı girilmemiş! Adım 3\'e dönün.'); return; }
      const res = calculate({ ...config, totalFlats }, config.priceOverride || {});
      setResult(res);
    } catch (err) {
      setError(err.message || 'Hesaplama hatası');
    }
  }, [config, setResult]);

  // ── Kaydet — hem normal hem varyasyon modu ─────────────────────
  async function handleSave(nameOverride) {
    const name = nameOverride ?? saveName;
    if (!name?.trim()) { showToast('Proje adı boş olamaz'); return; }
    setSaving(true);
    setSaveError(null);
    const wt = (p, ms) => Promise.race([
      p,
      new Promise((_, rej) => setTimeout(() => rej(new Error('Sunucu yanıt vermedi (20s). Supabase uyku modunda olabilir, tekrar deneyin.')), ms)),
    ]);
    try {
      await wt(saveProject(user.id, name.trim()), 20000);
      try { if (result) await wt(saveHistory(user.id, result), 10000); }
      catch (e) { console.warn('Geçmiş kaydı başarısız:', e); }
      showToast('✓ Proje kaydedildi');
      navigate('/gecmis');
    } catch (err) {
      const msg = err?.message || String(err) || 'Bilinmeyen hata';
      setSaveError(msg);
      showToast('Kayıt hatası: ' + msg);
    } finally {
      setSaving(false);
    }
  }

  // ── Excel ──────────────────────────────────────────────────────
  const exportExcel = useCallback(() => {
    if (!result) return;
    const rows = [['KATEGORİ','MALZEMİ ADI','BİRİM','MİKTAR']];
    result.lines.forEach(it => rows.push([CAT_LABEL[it.cat]||it.cat, it.n, it.u, Math.ceil(it.qty)]));
    rows.push([],['','KDV\'siz Toplam','₺', result.grandNet.toFixed(2)],['','KDV','₺', result.kdvAmt.toFixed(2)],['','Genel Toplam','₺', result.grandTotal.toFixed(2)]);
    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{wch:16},{wch:46},{wch:8},{wch:12}];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Malzeme Listesi');
    XLSX.writeFile(wb, 'ppr_malzeme_listesi.xlsx');
  }, [result]);

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div>

      {/* Varyasyon modu banner */}
      {parentProjectId && !isReadOnly && (
        <div style={{ marginBottom:12, padding:'10px 14px', background:'rgba(59,130,246,0.08)', border:'1px solid var(--acc)', borderRadius:'var(--r)', fontSize:12, color:'var(--acc)' }}>
          <div style={{ fontWeight:700, marginBottom:2 }}>🔀 Varyasyon Modu</div>
          <div>
            <strong>{projectName}</strong> adıyla kaydedilecek. Orijinal proje değişmeyecek.
          </div>
          {saveError && (
            <div style={{ marginTop:7, padding:'6px 10px', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:'var(--r2)', color:'var(--red,#dc2626)', fontWeight:400 }}>
              ⚠ {saveError}
            </div>
          )}
        </div>
      )}

      {/* Hesapla — read-only modda gösterme */}
      {!isReadOnly && (
        <div style={{ marginBottom:16 }}>
          <Button variant="calc" onClick={runCalculation}>⚡ Hesapla</Button>
        </div>
      )}

      {error && <div className="al al-w" style={{ marginBottom:14 }}>{error}</div>}
      {!result && !error && <div className="al al-i">Henüz hesaplama yapılmadı. "Hesapla" butonuna basın.</div>}

      {result && (
        <>
          <ResultKPIs res={result} conf={config} />

          {/* Fiyatı girilmemiş kalemler uyarısı */}
          {result.missingPrices?.length > 0 && (
            <div className="al al-w" style={{ marginBottom:13 }}>
              <strong>⚠ Fiyatı girilmemiş kalemler var — toplam eksik hesaplanıyor:</strong><br />
              {result.missingPrices.map((n, i) => <span key={i}>• {n}<br /></span>)}
              <div style={{ marginTop:6, fontSize:11 }}>Tanımlamalar &gt; Fiyat Listesi sayfasından fiyatları girin (0 girmek kabul edilir).</div>
            </div>
          )}

          {result.kolSummary?.length > 0 && (
            <div className="al al-ok" style={{ marginBottom:13 }}>
              <strong>🔩 Kolektör & Çıkış Özeti</strong><br />
              {result.kolSummary.map((s,i) => <span key={i}>• {s}<br /></span>)}
            </div>
          )}

          <PipeSummary result={result} config={config} />
          <CostTable   result={result} kdvRate={config.kdvRate} />
          <ValidationSection config={config} result={result} projectId={projectId} />

          {/* Aksiyon butonları */}
          <div className="btn-row no-print" style={{ marginTop:16 }}>
            <Button variant="default" onClick={() => window.print()}>🖨 Yazdır / PDF</Button>
            <Button variant="success" onClick={exportExcel} style={{ background:'#1d6f42', color:'#fff' }}>📥 Excel İndir</Button>
            {isReadOnly ? (
              // Görüntüleme modunda: kayıt yok, sadece revizyon başlatma
              <>
                <Button variant="primary" onClick={handleStartRevision}>⊕ Yeni Varyasyon</Button>
                <Button variant="default" onClick={() => navigate('/gecmis')}>← Geçmiş</Button>
              </>
            ) : parentProjectId ? (
              // Varyasyon modu: isim otomatik, direkt kaydet
              <Button variant="primary" onClick={() => handleSave(projectName)} disabled={saving}>
                {saving ? 'Kaydediliyor…' : `🔀 Varyasyon Olarak Kaydet`}
              </Button>
            ) : (
              // Normal yeni proje: isim sor
              <>
                <Button variant="primary" onClick={() => { setShowSave(v => !v); setSaveName(projectName || ''); setSaveError(null); }}>
                  💾 Projeyi Kaydet
                </Button>
                <Button variant="default" onClick={() => goStep(0)}>↩ Başa Dön</Button>
              </>
            )}
          </div>

          {/* Kaydet formu */}
          {showSave && (
            <div style={{ marginTop:10, padding:'14px 16px', background:'var(--bg)', border:'1px solid var(--border)', borderRadius:'var(--r)' }}>
              <div style={{ fontSize:12, fontWeight:700, marginBottom:8 }}>
                {parentProjectId ? 'Varyasyon Adı' : 'Proje Adı'}
              </div>
              <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                <input
                  value={saveName}
                  onChange={e => setSaveName(e.target.value)}
                  placeholder={parentProjectId ? 'örn: Wavin Teklifi Revizyonu' : 'Örn: Güneş Apt. — Merkezi SMS'}
                  style={{ flex:1, minWidth:220, padding:'8px 14px', border:'1px solid var(--border)', borderRadius:'var(--r)', fontSize:13, fontFamily:'var(--sans)', outline:'none', background:'var(--white)' }}
                  onKeyDown={e => e.key === 'Enter' && handleSave()}
                />
                <Button variant="primary" onClick={() => handleSave()} disabled={saving}>
                  {saving ? 'Kaydediliyor…' : '💾 Kaydet'}
                </Button>
                <Button variant="default" onClick={() => setShowSave(false)}>İptal</Button>
              </div>
              {saveError && (
                <div style={{ marginTop:8, padding:'7px 12px', background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.3)', borderRadius:'var(--r2)', fontSize:12, color:'var(--red,#dc2626)', lineHeight:1.5 }}>
                  ⚠ {saveError}
                </div>
              )}
              <div style={{ marginTop:7, fontSize:11, color:'var(--muted)' }}>
                {parentProjectId
                  ? 'Orijinal proje değişmez. Geçmiş sayfasında varyasyonlar birlikte görünür.'
                  : 'Kaydettikten sonra Ana Sayfa\'ya yönlendirileceksiniz. Varyasyon oluşturmak için Geçmiş sayfasını kullanın.'}
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
