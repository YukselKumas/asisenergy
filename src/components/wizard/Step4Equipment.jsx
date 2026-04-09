// ── Step 4 — Ekipman (Katsayılar) ────────────────────────────────────
// Dirsek katsayıları ve şaft başı ek parça katsayıları.

import { useCalculationStore } from '../../store/calculationStore.js';
import { Card }   from '../ui/Card.jsx';
import { Field }  from '../ui/Field.jsx';
import { Button } from '../ui/Button.jsx';

const H_DIMS = ['110','90','75','63','50','40','32','25'];
const V_DIMS = ['110','90','75','63','50','40','32','25'];

export function Step4Equipment({ goStep }) {
  const { config, setConfig } = useCalculationStore();
  const k = config.katsayilar || {};

  function updK(key, val) {
    setConfig({ katsayilar: { ...k, [key]: parseFloat(val) || 0 } });
  }

  function autoFill() {
    setConfig({
      katsayilar: {
        ...k,
        kRed:  2,
        kCous: 2,
      }
    });
  }

  return (
    <div>
      <Card accent="acc" title="Dirsek Katsayıları (adet / 10 m)" badge="4">
        <div className="al al-i" style={{ marginBottom:12 }}>
          ℹ Yatay hat — her 10 m'de 1.5–2 dirsek. Dikey kolon — her 10 m'de 0.5–1 dirsek. Branşman — daire başına 2 dirsek sabit.
        </div>
        <div className="slbl" style={{ marginTop:0 }}>Yatay Hat</div>
        <div className="g g6">
          {H_DIMS.map(d => (
            <Field key={d} label={`Q${d} / 10m`}>
              <input type="number" step="0.1" min="0" value={k['h'+d] ?? 1.5}
                onChange={e => updK('h'+d, e.target.value)} />
            </Field>
          ))}
        </div>
        <div className="slbl">Dikey Kolon</div>
        <div className="g g6">
          {V_DIMS.map(d => (
            <Field key={d} label={`Q${d} / 10m`}>
              <input type="number" step="0.1" min="0" value={k['v'+d] ?? 0.8}
                onChange={e => updK('v'+d, e.target.value)} />
            </Field>
          ))}
        </div>
      </Card>

      <Card accent="acc" title="Şaft Başı Ek Parça Katsayıları" badge="5">
        <p style={{ fontSize:12, color:'var(--muted)', marginBottom:12 }}>
          <Button variant="default" style={{ padding:'3px 10px', fontSize:11 }} onClick={autoFill}>↺ Otomatik Doldur</Button>
        </p>
        <div className="al al-i" style={{ marginBottom:12, fontSize:11 }}>
          ℹ Branşman Te'leri artık fizik tabanlı hesaplanır: her kat × hat başına 1 Te, çap uyumuna göre Equal Te veya İnegal Te seçilir. Manşon: her 4 m'de 1. Redüksiyon: her çap geçişinde 1.
        </div>
      </Card>

      <div className="btn-row">
        <Button variant="default" onClick={() => goStep(2)}>← Geri</Button>
        <Button variant="primary" onClick={() => goStep(4)}>Devam: Fiyat Listesi →</Button>
      </div>
    </div>
  );
}
