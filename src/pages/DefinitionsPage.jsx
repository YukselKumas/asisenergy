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
function PriceListTab() {
  const { brands, priceLists, fetchBrands, fetchPriceList, upsertPrices, seedBrandFromConstants, loading } = useDefinitionsStore();
  const [selBrand,   setSelBrand]  = useState('');
  const [selBrandCat, setSelBrandCat] = useState('');
  const [localPrices,setLocalP]    = useState({});
  const [catFilter,  setCatFilter] = useState('Tümü');
  const [saving,     setSaving]    = useState(false);
  const [seeding,    setSeeding]   = useState(false);

  useEffect(() => { fetchBrands(); }, []);

  useEffect(() => {
    if (selBrand) fetchPriceList(selBrand);
  }, [selBrand]);

  useEffect(() => {
    const map = {};
    priceLists.forEach(p => { map[p.product_id] = { list_price: p.list_price, discount_pct: p.discount_pct }; });
    setLocalP(map);
  }, [priceLists]);

  function handleBrandSelect(brandId) {
    setSelBrand(brandId);
    const brand = brands.find(b => b.id === brandId);
    setSelBrandCat(brand?.category || '');
  }

  function upd(productId, field, val) {
    setLocalP(prev => ({
      ...prev,
      [productId]: { ...(prev[productId] || {}), [field]: parseFloat(val) || 0 },
    }));
  }

  async function handleSave() {
    if (!selBrand) return;
    setSaving(true);
    try {
      const rows = PRICES.map(p => ({
        product_id:   p.id,
        product_name: p.n,
        unit:         p.u,
        list_price:   localPrices[p.id]?.list_price  ?? p.list,
        discount_pct: localPrices[p.id]?.discount_pct ?? p.disc,
      }));
      await upsertPrices(selBrand, rows);
      showToast('Fiyatlar kaydedildi');
    } catch (err) {
      showToast('Kayıt hatası: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSeedKalde() {
    if (!selBrand) return;
    setSeeding(true);
    try {
      await seedBrandFromConstants(selBrand, null);
      showToast('Kalde varsayılan fiyatları yüklendi');
    } catch (err) {
      showToast('Hata: ' + err.message);
    } finally {
      setSeeding(false);
    }
  }

  async function handleSeedFirat() {
    if (!selBrand) return;
    setSeeding(true);
    try {
      await seedBrandFromConstants(selBrand, PRICES_FIRAT);
      showToast('Fırat Boru fiyatları yüklendi');
    } catch (err) {
      showToast('Hata: ' + err.message);
    } finally {
      setSeeding(false);
    }
  }

  const CAT_MAP = { boru:'Boru', baglanti:'Bağlantı', vana:'Vana', mekanik:'Mekanik Oda' };
  const filteredPrices = PRICES.filter(p =>
    catFilter === 'Tümü' || CAT_MAP[p.cat] === catFilter
  );

  // Marka kategorisine göre grupla
  const brandGroups = BRAND_CAT_OPT.map(cat => ({
    ...cat,
    brands: brands.filter(b => b.category === cat.value),
  })).filter(g => g.brands.length > 0);

  return (
    <div>
      <Card accent="acc" title="Marka Fiyat Listesi">
        <div style={{ display:'flex', gap:12, marginBottom:16, flexWrap:'wrap', alignItems:'flex-end' }}>
          <div className="field" style={{ minWidth:240 }}>
            <label>Marka Seç</label>
            <GlassSelect value={selBrand} onChange={e => handleBrandSelect(e.target.value)}>
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
          {/* Kategori filtresi */}
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
          <Button variant="primary" onClick={handleSave} disabled={!selBrand || saving} style={{ marginLeft:'auto' }}>
            {saving ? 'Kaydediliyor...' : 'Kaydet'}
          </Button>
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

        <div className="rtw">
          <table style={{ minWidth:560 }}>
            <thead>
              <tr>
                <th>Kategori</th><th>Ürün</th><th>Birim</th>
                <th style={{ textAlign:'right' }}>Liste (TL)</th>
                <th style={{ textAlign:'right' }}>İsk%</th>
                <th style={{ textAlign:'right' }}>Net (TL)</th>
              </tr>
            </thead>
            <tbody>
              {filteredPrices.map(p => {
                const lp = localPrices[p.id]?.list_price  ?? p.list;
                const dp = localPrices[p.id]?.discount_pct?? p.disc;
                const net = lp * (1 - dp / 100);
                return (
                  <tr key={p.id}>
                    <td><Badge variant={p.cat}>{CAT_LABEL[p.cat]}</Badge></td>
                    <td style={{ fontSize:12 }}>{p.n}</td>
                    <td style={{ color:'var(--muted)', fontFamily:'var(--mono)' }}>{p.u}</td>
                    <td>
                      <input className="pti" type="number" value={lp} min="0" step="0.01"
                        disabled={!selBrand}
                        onChange={e => upd(p.id, 'list_price', e.target.value)}
                        style={!selBrand ? { opacity:.5, cursor:'not-allowed' } : {}}
                      />
                    </td>
                    <td>
                      <input className="ptd" type="number" value={dp} min="0" max="100" step="1"
                        disabled={!selBrand}
                        onChange={e => upd(p.id, 'discount_pct', e.target.value)}
                        style={!selBrand ? { opacity:.5, cursor:'not-allowed' } : {}}
                      />
                    </td>
                    <td style={{ textAlign:'right', fontFamily:'var(--mono)', color:'var(--green)', fontSize:12 }}>
                      {TR(net)}
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
  const { brands, fetchBrands, addBrand, deleteBrand, seedDefaultBrands, loading, error } = useDefinitionsStore();
  const [form,    setForm]    = useState({ name:'', category:'ppr', description:'' });
  const [seeding, setSeeding] = useState(false);

  useEffect(() => { fetchBrands(); }, []);

  async function handleAdd(e) {
    e.preventDefault();
    try {
      await addBrand(form);
      setForm({ name:'', category:'ppr', description:'' });
      showToast('Marka eklendi');
    } catch (err) { showToast('Hata: ' + err.message); }
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
            {brands.map(b => (
              <tr key={b.id}>
                <td style={{ fontWeight:700 }}>{b.name}</td>
                <td style={{ color:'var(--muted)', fontSize:11 }}>{BRAND_CAT_OPT.find(o=>o.value===b.category)?.label || b.category}</td>
                <td style={{ color:'var(--muted)', fontSize:12 }}>{b.description || '—'}</td>
                <td>
                  <button onClick={() => handleDelete(b.id)} style={{ background:'transparent', border:'1px solid var(--border)', color:'var(--red)', borderRadius:999, padding:'3px 9px', fontSize:11, cursor:'pointer' }}>
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
