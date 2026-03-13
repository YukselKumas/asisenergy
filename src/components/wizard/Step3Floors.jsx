// ── Step 3 — Kat Dağılımı ─────────────────────────────────────────────
// Her kat için bağımsız daire sayısı girilir. Otomatik dağıtım desteklenir.

import { useEffect } from 'react';
import { useCalculationStore } from '../../store/calculationStore.js';
import { Card }   from '../ui/Card.jsx';
import { Button } from '../ui/Button.jsx';

function katLabel(n) {
  if (n === 0) return 'Zemin Kat';
  if (n < 0)  return `${n}. Kat (Bodrum)`;
  return `${n}. Kat`;
}

export function Step3Floors({ goStep }) {
  const { config, setConfig } = useCalculationStore();
  const { floor, firstFloor, flatcheck, floors } = config;

  // Kat tablosu yoksa veya kat sayısı değiştiyse yeniden oluştur
  useEffect(() => {
    if (!floors || floors.length !== floor) {
      autoDistribute();
    }
  }, [floor, firstFloor]);

  function autoDistribute() {
    const fc     = Math.max(1, floor);
    const total  = Math.max(0, flatcheck);
    const first  = firstFloor || 1;
    const base   = Math.floor(total / fc);
    const rem    = total % fc;

    const newFloors = [];
    for (let i = fc - 1; i >= 0; i--) {
      const katNo = first + i;
      // Artık daireler en üst katlara dağıtılır
      const count = base + (i >= fc - rem ? 1 : 0);
      newFloors.push({ floor: katNo, count });
    }
    setConfig({ floors: newFloors });
  }

  function updateCount(floorNo, val) {
    setConfig({
      floors: floors.map(f => f.floor === floorNo ? { ...f, count: Math.max(0, parseInt(val) || 0) } : f),
    });
  }

  const totalFlats = (floors || []).reduce((s, f) => s + f.count, 0);

  return (
    <div>
      <Card accent="acc" title="Kat Bazlı Daire Dağılımı" badge="3">
        <p style={{ fontSize:12, color:'var(--muted)', marginBottom:13 }}>
          Her katta farklı sayıda daire tanımlanabilir.
        </p>
        <div className="btn-row" style={{ margin:'0 0 13px' }}>
          <Button variant="default" onClick={autoDistribute}>↻ Otomatik Dağıt ({flatcheck} daire)</Button>
        </div>

        <div className="ftscroll">
          <table>
            <thead>
              <tr>
                <th>Kat</th>
                <th>Daire Sayısı</th>
                <th>Not (opsiyonel)</th>
              </tr>
            </thead>
            <tbody>
              {(floors || []).map(f => (
                <tr key={f.floor}>
                  <td style={{ fontFamily:'var(--mono)', fontWeight:700, color: f.floor < 0 ? 'var(--muted)' : f.floor === 0 ? 'var(--circ)' : 'var(--acc)' }}>
                    {katLabel(f.floor)}
                  </td>
                  <td>
                    <input
                      className="ti"
                      type="number"
                      value={f.count}
                      min="0"
                      onChange={e => updateCount(f.floor, e.target.value)}
                    />
                  </td>
                  <td>
                    <input className="tit" type="text" placeholder="örn: çatı katı" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="ibox" style={{ marginTop:10 }}>
          Toplam: <strong>{totalFlats} daire</strong>
          {totalFlats !== flatcheck && (
            <span style={{ color:'var(--warn)', marginLeft:8 }}>
              ⚠ Kontrol değerinden ({flatcheck}) {Math.abs(totalFlats - flatcheck)} daire {totalFlats > flatcheck ? 'fazla' : 'eksik'}
            </span>
          )}
        </div>
      </Card>

      <div className="btn-row">
        <Button variant="default" onClick={() => goStep(1)}>← Geri</Button>
        <Button variant="primary" onClick={() => goStep(3)}>Devam: Ekipman →</Button>
      </div>
    </div>
  );
}
