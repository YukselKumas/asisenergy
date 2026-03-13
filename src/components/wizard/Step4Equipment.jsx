// ── Step 4 — Ekipman (Katsayılar) ────────────────────────────────────
// Dirsek katsayıları ve şaft başı ek parça katsayıları.

import { useCalculationStore } from '../../store/calculationStore.js';
import { Card }   from '../ui/Card.jsx';
import { Field }  from '../ui/Field.jsx';
import { Button } from '../ui/Button.jsx';

const H_DIMS = ['75','63','50','40','32','25'];
const V_DIMS = ['75','63','50','40','32','25'];

export function Step4Equipment({ goStep }) {
  const { config, setConfig } = useCalculationStore();
  const k = config.katsayilar || {};

  function updK(key, val) {
    setConfig({ katsayilar: { ...k, [key]: parseFloat(val) || 0 } });
  }

  function autoFill() {
    const hasHot  = config.hasHot;
    const hasCold = config.hasCold;
    const hatSay  = (hasHot ? 1 : 0) + (hasCold ? 1 : 0);
    setConfig({
      katsayilar: {
        ...k,
        kTee:  hatSay * 2,
        kItee: hatSay * 1,
        kRed:  hatSay * 2,
        kCous: hatSay * 2,
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
        <div className="slbl" style={{ marginTop:0 }}>Şaft Başı (adet / şaft × hat sayısı)</div>
        <div className="g g5">
          <Field label="Equal Te / şaft" hint={`→ ${(config.hasHot?1:0)+(config.hasCold?1:0)} hat × 2`}>
            <input type="number" min="0" value={k.kTee  ?? 3} onChange={e => updK('kTee',  e.target.value)} />
          </Field>
          <Field label="İnegal Te / şaft" hint="Çap küçülme noktaları">
            <input type="number" min="0" value={k.kItee ?? 2} onChange={e => updK('kItee', e.target.value)} />
          </Field>
          <Field label="Redüksiyon / şaft">
            <input type="number" min="0" value={k.kRed  ?? 3} onChange={e => updK('kRed',  e.target.value)} />
          </Field>
          <Field label="Manşon / şaft">
            <input type="number" min="0" value={k.kCous ?? 3} onChange={e => updK('kCous', e.target.value)} />
          </Field>
        </div>
      </Card>

      <div className="btn-row">
        <Button variant="default" onClick={() => goStep(2)}>← Geri</Button>
        <Button variant="primary" onClick={() => goStep(4)}>Devam: Fiyat Listesi →</Button>
      </div>
    </div>
  );
}
