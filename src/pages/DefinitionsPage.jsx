// ── DefinitionsPage — Tanımlamalar ────────────────────────────────────
// 3 tab: Fiyat Listesi / Markalar / Sistem Ayarları

import { useEffect, useState } from 'react';
import { useDefinitionsStore } from '../store/definitionsStore.js';
import { PRICES, PRICES_FIRAT, CAT_LABEL } from '../lib/calculator/constants.js';
import { Card }   from '../components/ui/Card.jsx';
import { Button } from '../components/ui/Button.jsx';
import { Badge }  from '../components/ui/Badge.jsx';
import { showToast } from '../components/ui/Toast.jsx';
import { GlassSelect } from '../components/ui/GlassSelect.jsx';

const TR = (x, d=2) => new Intl.NumberFormat('tr-TR', { minimumFractionDigits:d, maximumFractionDigits:d }).format(x);

const TABS = ['Fiyat Listesi', 'Markalar', 'Sistem Ayarları'];
const CAT_FILTER_OPTS = ['Tümü', 'Boru', 'Bağlantı', 'Vana', 'Mekanik Oda'];

const BRAND_CAT_OPT = [
  { value:'ppr',    label:'PPR Boru & Bağlantı' },
  { value:'valve',  label:'Pirinç Küresel Vana' },
  { value:'bd',     label:'Basınç Düşürücü' },
  { value:'filter', label:'Filtre & Çekvalf' },
  { value:'other',  label:'Diğer' },
];

export function DefinitionsPage() {
  const [tab, setTab] = useState(0);

  return (
    <div>
      <div style={{ marginBottom:24 }}>
        <h1 style={{ fontSize:22, fontWeight:800, marginBottom:5 }}>Tanımlamalar</h1>
        <p style={{ color:'var(--muted)', fontSize:13 }}>Fiyat listeleri, markalar ve sistem ayarlarını yönetin.</p>
      </div>

      {/* Tab çubuk */}
      <div style={{ display:'flex', gap:0, borderBottom:'2px solid var(--border)', marginBottom:20 }}>
        {TABS.map((t, i) => (
          <button key={i} onClick={() => setTab(i)} style={{
            background:'transparent', border:'none', padding:'10px 18px',
            fontSize:13, fontWeight:700, cursor:'pointer',
            color: tab === i ? 'var(--acc)' : 'var(--muted)',
            borderBottom: tab === i ? '2px solid var(--acc)' : '2px solid transparent',
            marginBottom:'-2px', fontFamily:'var(--sans)',
          }}>
            {t}
          </button>
        ))}
      </div>

      {tab === 0 && <PriceListTab />}
      {tab === 1 && <BrandsTab />}
      {tab === 2 && <SystemConfigTab />}
    </div>
  );
}

// ── Fiyat Listesi Tab ─────────────────────────────────────────────────
const withTimeout = (p, ms) => Promise.race([
  p,
  new Promise((_, rej) => setTimeout(() => rej(new Error(`Bağlantı zaman aşımı (${ms/1000}s)`)), ms)),
]);

function PriceListTab() {
  const { brands, priceLists, fetchBrands, fetchPriceList, upsertPrices, seedBrandFromConstants } = useDefinitionsStore();
  const [selBrand,   setSelBrand]  = useState('');
  const [localPrices,setLocalP]    = useState({});
  const [dirtyRows,  setDirtyRows] = useState(new Set());   // değişen product_id'ler
  const [rowSaving,  setRowSaving] = useState({});           // {pid: bool}
  const [allSaving,  setAllSaving] = useState(false);
  const [catFilter,  setCatFilter] = useState('Tümü');
  const [seeding,    setSeeding]   = useState(false);

  useEffect(() => { fetchBrands(); }, []);

  useEffect(() => {
    if (selBrand) { setDirtyRows(new Set()); fetchPriceList(selBrand); }
  }, [selBrand]);

  useEffect(() => {
    const map = {};
    priceLists.forEach(p => { map[p.product_id] = { list_price: parseFloat(p.list_price) || 0, discount_pct: parseFloat(p.discount_pct) || 0 }; });
    setLocalP(map);
    setDirtyRows(new Set());
  }, [priceLists]);

  function upd(productId, field, val) {
    setLocalP(prev => ({
      ...prev,
      [productId]: { ...(prev[productId] || {}), [field]: val },
    }));
    setDirtyRows(prev => new Set([...prev, productId]));
  }

  function rowVal(pid, field, fallback) {
    const v = localPrices[pid]?.[field];
    return v !== undefined ? v : fallback;
  }

  /** Tek satır kaydet */
  async function saveRow(productId) {
    if (!selBrand) return;
    const p = PRICES.find(pr => pr.id === productId);
    if (!p) return;
    setRowSaving(prev => ({ ...prev, [productId]: true }));
    try {
      const row = {
        product_id:   productId,
        product_name: p.n,
        unit:         p.u,
        list_price:   parseFloat(rowVal(productId, 'list_price', p.list)) || 0,
        discount_pct: parseFloat(rowVal(productId, 'discount_pct', p.disc)) || 0,
      };
      await withTimeout(upsertPrices(selBrand, [row]), 12000);
      setDirtyRows(prev => { const s = new Set(prev); s.delete(productId); return s; });
      showToast('✓ Kaydedildi');
    } catch (err) {
      showToast('Hata: ' + err.message);
    } finally {
      setRowSaving(prev => ({ ...prev, [productId]: false }));
    }
  }

  /** Tüm değişenleri kaydet */
  async function saveAll() {
    if (!selBrand || dirtyRows.size === 0) return;
    setAllSaving(true);
    try {
      const rows = [...dirtyRows].map(productId => {
        const p = PRICES.find(pr => pr.id === productId);
        if (!p) return null;
        return {
          product_id:   productId,
          product_name: p.n,
          unit:         p.u,
          list_price:   parseFloat(rowVal(productId, 'list_price', p.list)) || 0,
          discount_pct: parseFloat(rowVal(productId, 'discount_pct', p.disc)) || 0,
        };
      }).filter(Boolean);
      await withTimeout(upsertPrices(selBrand, rows), 20000);
      setDirtyRows(new Set());
      showToast(`✓ ${rows.length} satır kaydedildi`);
    } catch (err) {
      showToast('Kayıt hatası: ' + err.message);
    } finally {
      setAllSaving(false);
    }
  }

  async function handleSeedKalde() {
    if (!selBrand) return;
    setSeeding(true);
    try {
      await withTimeout(seedBrandFromConstants(selBrand, null), 20000);
      showToast('Kalde varsayılan fiyatları yüklendi');
    } catch (err) { showToast('Hata: ' + err.message); }
    finally { setSeeding(false); }
  }

  async function handleSeedFirat() {
    if (!selBrand) return;
    setSeeding(true);
    try {
      await withTimeout(seedBrandFromConstants(selBrand, PRICES_FIRAT), 20000);
      showToast('Fırat Boru fiyatları yüklendi');
    } catch (err) { showToast('Hata: ' + err.message); }
    finally { setSeeding(false); }
  }

  const CAT_MAP = { boru:'Boru', baglanti:'Bağlantı', vana:'Vana', mekanik:'Mekanik Oda' };
  const filteredPrices = PRICES.filter(p =>
    catFilter === 'Tümü' || CAT_MAP[p.cat] === catFilter
  );

  const brandGroups = BRAND_CAT_OPT.map(cat => ({
    ...cat,
    brands: brands.filter(b => b.category === cat.value),
  })).filter(g => g.brands.length > 0);

  return (
    <div>
      <Card accent="acc" title="Marka Fiyat Listesi">
        {/* Üst araç çubuğu */}
        <div style={{ display:'flex', gap:12, marginBottom:16, flexWrap:'wrap', alignItems:'flex-end' }}>
          <div className="field" style={{ minWidth:240 }}>
            <label>Marka Seç</label>
            <GlassSelect value={selBrand} onChange={e => setSelBrand(e.target.value)}>
              <option value="">— Marka seçin —</option>
              {brandGroups.map(g => (
                <optgroup key={g.value} label={g.label}>
                  {g.brands.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </optgroup>
              ))}
            </GlassSelect>
          </div>
          <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
            {CAT_FILTER_OPTS.map(opt => (
              <button key={opt} onClick={() => setCatFilter(opt)} style={{
                background: catFilter === opt ? 'var(--acc)' : 'var(--white)',
                color:      catFilter === opt ? '#fff' : 'var(--muted)',
                border:     '1px solid ' + (catFilter === opt ? 'var(--acc)' : 'var(--border)'),
                borderRadius: 5, padding:'4px 10px', fontSize:11, cursor:'pointer', fontWeight:700,
              }}>{opt}</button>
            ))}
          </div>
        </div>

        {/* Hazır fiyat yükleme */}
        {selBrand && (
          <div style={{ display:'flex', gap:8, marginBottom:14 }}>
            <Button variant="default" style={{ padding:'4px 12px', fontSize:11 }}
              onClick={handleSeedKalde} disabled={seeding}>
              Kalde Varsayılan Fiyatlarını Yükle
            </Button>
            <Button variant="default" style={{ padding:'4px 12px', fontSize:11 }}
              onClick={handleSeedFirat} disabled={seeding}>
              Fırat Boru Fiyatlarını Yükle
            </Button>
          </div>
        )}

        {/* Değişiklik özeti çubuğu */}
        {dirtyRows.size > 0 && (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10, padding:'8px 14px', background:'rgba(59,130,246,0.08)', border:'1px solid var(--acc)', borderRadius:'var(--r2)' }}>
            <span style={{ fontSize:12, color:'var(--acc)', fontWeight:600 }}>
              {dirtyRows.size} satırda kaydedilmemiş değişiklik var
            </span>
            <Button variant="primary" onClick={saveAll} disabled={allSaving} style={{ padding:'4px 14px', fontSize:12 }}>
              {allSaving ? 'Kaydediliyor...' : `✓ Tümünü Kaydet (${dirtyRows.size})`}
            </Button>
          </div>
        )}

        {!selBrand && (
          <div className="al al-i" style={{ marginBottom:12 }}>Fiyat düzenlemek için önce marka seçin.</div>
        )}

        <div className="rtw">
          <table style={{ minWidth:600 }}>
            <thead>
              <tr>
                <th>Kategori</th><th>Ürün</th><th>Birim</th>
                <th style={{ textAlign:'right', minWidth:110 }}>Liste (TL)</th>
                <th style={{ textAlign:'right', minWidth:70 }}>İsk%</th>
                <th style={{ textAlign:'right', minWidth:90 }}>Net (TL)</th>
                <th style={{ width:70 }}></th>
              </tr>
            </thead>
            <tbody>
              {filteredPrices.map(p => {
                const lp  = rowVal(p.id, 'list_price',   p.list);
                const dp  = rowVal(p.id, 'discount_pct', p.disc);
                const net = (parseFloat(lp) || 0) * (1 - (parseFloat(dp) || 0) / 100);
                const dirty  = dirtyRows.has(p.id);
                const saving = rowSaving[p.id];
                return (
                  <tr key={p.id} style={{ background: dirty ? 'rgba(59,130,246,0.04)' : undefined }}>
                    <td><Badge variant={p.cat}>{CAT_LABEL[p.cat]}</Badge></td>
                    <td style={{ fontSize:12 }}>{p.n}</td>
                    <td style={{ color:'var(--muted)', fontFamily:'var(--mono)' }}>{p.u}</td>
                    <td>
                      <input className="pti" type="number" value={lp ?? ''} min="0" step="0.01"
                        disabled={!selBrand}
                        onChange={e => upd(p.id, 'list_price', e.target.value)}
                        style={!selBrand ? { opacity:.5, cursor:'not-allowed' } : {}}
                      />
                    </td>
                    <td>
                      <input className="ptd" type="number" value={dp ?? ''} min="0" max="100" step="1"
                        disabled={!selBrand}
                        onChange={e => upd(p.id, 'discount_pct', e.target.value)}
                        style={!selBrand ? { opacity:.5, cursor:'not-allowed' } : {}}
                      />
                    </td>
                    <td style={{ textAlign:'right', fontFamily:'var(--mono)', color:'var(--green)', fontSize:12 }}>
                      {TR(net)}
                    </td>
                    <td>
                      {dirty && (
                        <button
                          onClick={() => saveRow(p.id)}
                          disabled={saving}
                          style={{ background:'var(--acc)', color:'#fff', border:'none', borderRadius:6, padding:'3px 10px', fontSize:11, cursor:'pointer', fontWeight:700, whiteSpace:'nowrap', opacity: saving ? .6 : 1 }}
                        >
                          {saving ? '...' : '✓'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ── Markalar Tab ──────────────────────────────────────────────────────
function BrandsTab() {
  const { brands, fetchBrands, addBrand, updateBrand, deleteBrand, seedDefaultBrands, loading, error } = useDefinitionsStore();
  const [form,     setForm]     = useState({ name:'', category:'ppr', description:'' });
  const [seeding,  setSeeding]  = useState(false);
  const [editId,   setEditId]   = useState(null);
  const [editForm, setEditForm] = useState({ name:'', category:'ppr', description:'' });
  const [saving,   setSaving]   = useState(false);

  useEffect(() => { fetchBrands(); }, []);

  async function handleAdd(e) {
    e.preventDefault();
    try {
      await addBrand(form);
      setForm({ name:'', category:'ppr', description:'' });
      showToast('Marka eklendi');
    } catch (err) { showToast('Hata: ' + err.message); }
  }

  function handleEditStart(b) {
    setEditId(b.id);
    setEditForm({ name: b.name, category: b.category, description: b.description || '' });
  }

  function handleEditCancel() {
    setEditId(null);
  }

  async function handleEditSave(id) {
    if (!editForm.name.trim()) { showToast('Marka adı boş olamaz'); return; }
    setSaving(true);
    try {
      await updateBrand(id, editForm);
      setEditId(null);
      showToast('✓ Marka güncellendi');
    } catch (err) { showToast('Hata: ' + err.message); }
    finally { setSaving(false); }
  }

  async function handleDelete(id) {
    if (!confirm('Markayı silmek istediğinizden emin misiniz?')) return;
    await deleteBrand(id);
    showToast('Marka silindi');
  }

  async function handleSeedDefaults() {
    setSeeding(true);
    try {
      await seedDefaultBrands();
      showToast('✓ Varsayılan markalar yüklendi');
    } catch (err) { showToast('Hata: ' + err.message); }
    finally { setSeeding(false); }
  }

  return (
    <div>
      {error && (
        <div className="al al-w" style={{ marginBottom:14 }}>
          Marka verisi yüklenemedi: {error}
        </div>
      )}

      {!loading && brands.length === 0 && !error && (
        <div style={{ marginBottom:14, padding:'12px 16px', background:'rgba(59,130,246,0.07)', border:'1px solid var(--acc)', borderRadius:'var(--r)', display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ flex:1, fontSize:13, color:'var(--acc)', fontWeight:600 }}>
            Henüz marka tanımlanmamış. Varsayılan markaları yükleyerek başlayabilirsiniz.
          </div>
          <Button variant="primary" onClick={handleSeedDefaults} disabled={seeding}>
            {seeding ? 'Yükleniyor...' : '⬇ Varsayılan Markaları Yükle'}
          </Button>
        </div>
      )}

      <Card accent="green" title="Yeni Marka Ekle" badge="+">
        <form onSubmit={handleAdd} style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'flex-end' }}>
          <div className="field">
            <label>Marka Adı</label>
            <input type="text" value={form.name} required
              onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="Örn: Kalde" style={{ minWidth:160 }} />
          </div>
          <div className="field">
            <label>Kategori</label>
            <GlassSelect value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
              {BRAND_CAT_OPT.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </GlassSelect>
          </div>
          <div className="field">
            <label>Açıklama</label>
            <input type="text" value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="İsteğe bağlı..." style={{ minWidth:200 }} />
          </div>
          <Button variant="primary" type="submit">Ekle</Button>
        </form>
      </Card>

      <Card accent="acc" title="Marka Listesi">
        {brands.length > 0 && (
          <div style={{ marginBottom:10 }}>
            <Button variant="default" style={{ fontSize:11, padding:'4px 12px' }}
              onClick={handleSeedDefaults} disabled={seeding}>
              {seeding ? 'Yükleniyor...' : '⬇ Varsayılan Markaları Yenile'}
            </Button>
          </div>
        )}
        <table>
          <thead>
            <tr><th>Marka</th><th>Kategori</th><th>Açıklama</th><th></th></tr>
          </thead>
          <tbody>
            {brands.map(b => editId === b.id ? (
              <tr key={b.id} style={{ background:'rgba(59,130,246,0.06)' }}>
                <td>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                    style={{ width:'100%', minWidth:130 }}
                    autoFocus
                  />
                </td>
                <td>
                  <GlassSelect value={editForm.category} onChange={e => setEditForm({ ...editForm, category: e.target.value })}>
                    {BRAND_CAT_OPT.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </GlassSelect>
                </td>
                <td>
                  <input
                    type="text"
                    value={editForm.description}
                    onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                    style={{ width:'100%', minWidth:180 }}
                    placeholder="İsteğe bağlı..."
                  />
                </td>
                <td style={{ whiteSpace:'nowrap', display:'flex', gap:5 }}>
                  <button
                    onClick={() => handleEditSave(b.id)}
                    disabled={saving}
                    style={{ background:'var(--green)', border:'none', color:'#fff', borderRadius:999, padding:'3px 10px', fontSize:11, cursor:'pointer' }}>
                    {saving ? '...' : 'Kaydet'}
                  </button>
                  <button
                    onClick={handleEditCancel}
                    style={{ background:'transparent', border:'1px solid var(--border)', color:'var(--muted)', borderRadius:999, padding:'3px 9px', fontSize:11, cursor:'pointer' }}>
                    İptal
                  </button>
                </td>
              </tr>
            ) : (
              <tr key={b.id}>
                <td style={{ fontWeight:700 }}>{b.name}</td>
                <td style={{ color:'var(--muted)', fontSize:11 }}>{BRAND_CAT_OPT.find(o=>o.value===b.category)?.label || b.category}</td>
                <td style={{ color:'var(--muted)', fontSize:12 }}>{b.description || '—'}</td>
                <td style={{ whiteSpace:'nowrap', display:'flex', gap:5 }}>
                  <button
                    onClick={() => handleEditStart(b)}
                    style={{ background:'transparent', border:'1px solid var(--border)', color:'var(--acc)', borderRadius:999, padding:'3px 9px', fontSize:11, cursor:'pointer' }}>
                    Düzenle
                  </button>
                  <button
                    onClick={() => handleDelete(b.id)}
                    style={{ background:'transparent', border:'1px solid var(--border)', color:'var(--red)', borderRadius:999, padding:'3px 9px', fontSize:11, cursor:'pointer' }}>
                    Sil
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ── Sistem Ayarları Tab ───────────────────────────────────────────────
function SystemConfigTab() {
  const { systemConfigs, fetchSystemConfigs, updateSystemConfig } = useDefinitionsStore();
  const [vals, setVals] = useState({});

  useEffect(() => {
    fetchSystemConfigs();
  }, []);

  useEffect(() => {
    setVals({ ...systemConfigs });
  }, [systemConfigs]);

  const CONFIGS = [
    { key:'kdv_rate',         label:'KDV Oranı (%)',            type:'number', hint:'Hesaplamalarda kullanılan varsayılan KDV oranı' },
    { key:'default_brand_ppr',label:'Varsayılan PPR Markası',   type:'text',   hint:'Marka UUID veya isim' },
    { key:'app_name',         label:'Uygulama Adı',             type:'text',   hint:'Arayüzde görünen başlık' },
  ];

  async function handleSave(key) {
    try {
      await updateSystemConfig(key, vals[key]);
      showToast(`${key} güncellendi`);
    } catch (err) { showToast(err.message); }
  }

  return (
    <Card accent="warn" title="Sistem Ayarları" badge="S">
      <div style={{ maxWidth:480 }}>
        {CONFIGS.map(cfg => (
          <div key={cfg.key} style={{ marginBottom:16, display:'flex', alignItems:'flex-end', gap:10 }}>
            <div className="field" style={{ flex:1 }}>
              <label>{cfg.label}</label>
              <input
                type={cfg.type}
                value={vals[cfg.key] ?? ''}
                onChange={e => setVals({ ...vals, [cfg.key]: e.target.value })}
              />
              <div className="fn">{cfg.hint}</div>
            </div>
            <Button variant="primary" style={{ marginBottom:18 }} onClick={() => handleSave(cfg.key)}>
              Kaydet
            </Button>
          </div>
        ))}
      </div>
    </Card>
  );
}
