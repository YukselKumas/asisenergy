// ── Step 5 — Fiyat Listesi ────────────────────────────────────────────
// Her ürün için liste fiyatı ve iskonto düzenlenebilir.
// Kalde veya Fırat Boru fiyatları tek tıkla yüklenebilir.

import { useCalculationStore } from '../../store/calculationStore.js';
import { PRICES, PRICES_FIRAT, CAT_LABEL } from '../../lib/calculator/constants.js';
import { Card }   from '../ui/Card.jsx';
import { Field }  from '../ui/Field.jsx';
import { Button } from '../ui/Button.jsx';
import { Badge }  from '../ui/Badge.jsx';

const TR = (x, d = 2) => new Intl.NumberFormat('tr-TR', { minimumFractionDigits: d, maximumFractionDigits: d }).format(x);

export function Step5Prices({ goStep }) {
  const { config, setConfig } = useCalculationStore();
  const override = config.priceOverride || {};
  const kdvRate  = (config.kdvRate || 0.20) * 100;

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

  function loadBrand(brand) {
    const newOv = { ...override };
    PRICES.forEach(p => {
      const fp = PRICES_FIRAT[p.id];
      if (brand === 'firat' && fp !== undefined) {
        newOv[p.id] = { list: fp, disc: 0 };
      } else if (brand === 'kalde') {
        delete newOv[p.id]; // varsayılan (Kalde) fiyatlara dön
      }
    });
    setConfig({ priceOverride: newOv });
  }

  function getList(item) { return override[item.id]?.list ?? item.list; }
  function getDisc(item) { return override[item.id]?.disc ?? item.disc; }
  function getNet(item)  { const l = getList(item); const d = getDisc(item); return l * (1 - d / 100); }

  const catOrd = ['boru', 'vana', 'baglanti', 'mekanik'];

  return (
    <div>
      <Card accent="acc" title="Fiyat Listesi" badge="5">
        <p style={{ fontSize:12, color:'var(--muted)', marginBottom:13 }}>
          Net Fiyat = Liste × (1 − İskonto%). Fiyatı 0 olan kalemler uyarıyla işaretlenir.
        </p>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:13 }}>
          <Button variant="default" style={{ padding:'4px 12px', fontSize:12 }} onClick={() => loadBrand('kalde')}>Kalde Fiyatlarını Yükle</Button>
          <Button variant="default" style={{ padding:'4px 12px', fontSize:12 }} onClick={() => loadBrand('firat')}>Fırat Boru Fiyatlarını Yükle</Button>
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
                <th style={{ textAlign:'right' }}>Liste (₺)</th>
                <th style={{ textAlign:'right' }}>İsk%</th>
                <th style={{ textAlign:'right' }}>Net (₺)</th>
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
                  return (
                    <tr key={item.id} style={zeroWarn ? { background:'rgba(255,200,0,0.08)' } : {}}>
                      <td><Badge variant={cat}>{CAT_LABEL[cat]}</Badge></td>
                      <td style={{ fontSize:12 }}>
                        {item.n}
                        {zeroWarn && <span style={{ color:'#c8930a', fontSize:10, marginLeft:4 }}>⚠ fiyat girin</span>}
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
        <Button variant="calc" onClick={() => goStep(5)}>⚡ Hesapla → Sonuçları Göster</Button>
      </div>
    </div>
  );
}
