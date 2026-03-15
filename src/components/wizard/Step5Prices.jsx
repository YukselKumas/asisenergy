// ── Step 5 — Fiyat Listesi ────────────────────────────────────────────
// Her ürün için liste fiyatı ve iskonto düzenlenebilir.
// Seçili markaların fiyatları DB'den yüklenir, manuel düzenleme yapılabilir.

import { useCalculationStore } from '../../store/calculationStore.js';
import { useDefinitionsStore } from '../../store/definitionsStore.js';
import { PRICES, CAT_LABEL, productBrandCat } from '../../lib/calculator/constants.js';
import { Card }   from '../ui/Card.jsx';
import { Field }  from '../ui/Field.jsx';
import { Button } from '../ui/Button.jsx';
import { Badge }  from '../ui/Badge.jsx';
import { useState } from 'react';

const TR = (x, d = 2) => new Intl.NumberFormat('tr-TR', { minimumFractionDigits: d, maximumFractionDigits: d }).format(x);

const CAT_LABELS = { ppr:'PPR', valve:'Vana', bd:'BD', filter:'Filtre', other:'Diğer' };

export function Step5Prices({ goStep }) {
  const { config, setConfig, reloadAllBrandPrices } = useCalculationStore();
  const { brands } = useDefinitionsStore();
  const override = config.priceOverride || {};
  const kdvRate  = (config.kdvRate || 0.20) * 100;
  const [reloading, setReloading] = useState(false);

  function updPrice(id, field, val) {
    const cur  = override[id] || {};
    const item = PRICES.find(p => p.id === id);
    if (!item) return;
    const newOv = {
      ...override,
      [id]: {
        list: parseFloat(cur.list ?? item.list),
        disc: parseFloat(cur.disc ?? item.disc),
        [field]: parseFloat(val) || 0,
      },
    };
    setConfig({ priceOverride: newOv });
  }

  async function handleReload() {
    setReloading(true);
    try { await reloadAllBrandPrices(); }
    finally { setReloading(false); }
  }

  function getList(item) { return override[item.id]?.list ?? item.list; }
  function getDisc(item) { return override[item.id]?.disc ?? item.disc; }
  function getNet(item)  { const l = getList(item); const d = getDisc(item); return l * (1 - d / 100); }

  // Seçili marka bilgilerini göster
  function getBrandName(configKey) {
    const brandId = config[configKey];
    if (!brandId) return 'Seçilmedi';
    const b = brands.find(br => br.id === brandId);
    return b ? b.name : 'Seçilmedi';
  }

  const catOrd = ['boru', 'vana', 'baglanti', 'mekanik'];

  return (
    <div>
      <Card accent="acc" title="Fiyat Listesi" badge="5">
        <p style={{ fontSize:12, color:'var(--muted)', marginBottom:10 }}>
          Net Fiyat = Liste x (1 - İskonto%). Fiyatı 0 olan kalemler uyarıyla işaretlenir.
        </p>

        {/* Seçili markalar özeti */}
        <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:13, fontSize:11, color:'var(--muted)' }}>
          <span><strong>PPR:</strong> {getBrandName('markaPpr')}</span>
          <span><strong>Vana:</strong> {getBrandName('markaPirince')}</span>
          <span><strong>BD:</strong> {getBrandName('markaBd')}</span>
          <span><strong>Filtre:</strong> {getBrandName('markaFiltre')}</span>
        </div>

        <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:13 }}>
          <Button variant="default" style={{ padding:'4px 12px', fontSize:12 }}
            onClick={handleReload} disabled={reloading}>
            {reloading ? 'Yükleniyor...' : 'Marka Fiyatlarını Yeniden Yükle'}
          </Button>
        </div>

        <div className="g g3" style={{ maxWidth:380, marginBottom:13 }}>
          <Field label="KDV Oranı (%)">
            <input type="number" value={kdvRate} min="0" max="100"
              onChange={e => setConfig({ kdvRate: (parseFloat(e.target.value) || 0) / 100 })} />
          </Field>
        </div>

        <div className="rtw">
          <table style={{ minWidth:680 }}>
            <thead>
              <tr>
                <th>Kategori</th><th>Ürün</th><th>Birim</th>
                <th style={{ textAlign:'right' }}>Liste (TL)</th>
                <th style={{ textAlign:'right' }}>İsk%</th>
                <th style={{ textAlign:'right' }}>Net (TL)</th>
              </tr>
            </thead>
            <tbody>
              {catOrd.map(cat => {
                const items = PRICES.filter(p => p.cat === cat);
                return items.map(item => {
                  const list = getList(item);
                  const disc = getDisc(item);
                  const net  = getNet(item);
                  const zeroWarn = list === 0;
                  const bcat = productBrandCat(item.id);
                  const hasOverride = override[item.id] !== undefined;
                  return (
                    <tr key={item.id} style={zeroWarn ? { background:'rgba(255,200,0,0.08)' } : {}}>
                      <td><Badge variant={cat}>{CAT_LABEL[cat]}</Badge></td>
                      <td style={{ fontSize:12 }}>
                        {item.n}
                        {zeroWarn && <span style={{ color:'#c8930a', fontSize:10, marginLeft:4 }}>⚠ fiyat girin</span>}
                        {hasOverride && <span style={{ color:'var(--acc)', fontSize:9, marginLeft:4 }}>({CAT_LABELS[bcat]})</span>}
                      </td>
                      <td style={{ color:'var(--muted)', fontFamily:'var(--mono)' }}>{item.u}</td>
                      <td>
                        <input className="pti" type="number" value={list} min="0" step="0.01"
                          onChange={e => updPrice(item.id, 'list', e.target.value)} />
                      </td>
                      <td>
                        <input className="ptd" type="number" value={disc} min="0" max="100" step="1"
                          onChange={e => updPrice(item.id, 'disc', e.target.value)} />
                      </td>
                      <td style={{ textAlign:'right', fontFamily:'var(--mono)', color:'var(--green)', fontSize:12 }}>
                        {TR(net)}
                      </td>
                    </tr>
                  );
                });
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="btn-row">
        <Button variant="default" onClick={() => goStep(3)}>← Geri</Button>
        <Button variant="calc" onClick={() => goStep(5)}>Hesapla → Sonuçları Göster</Button>
      </div>
    </div>
  );
}
