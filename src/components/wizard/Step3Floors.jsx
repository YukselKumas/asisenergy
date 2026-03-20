// ── Step 3 — Kat Dağılımı ─────────────────────────────────────────────
// Her kat için bağımsız daire sayısı girilir. Otomatik dağıtım desteklenir.

import { useEffect, useState } from 'react';
import { useCalculationStore } from '../../store/calculationStore.js';
import { Card }        from '../ui/Card.jsx';
import { Button }      from '../ui/Button.jsx';
import { showToast }   from '../ui/Toast.jsx';

function katLabel(n) {
  if (n === 0) return 'Zemin Kat';
  if (n < 0)  return `${n}. Kat (Bodrum)`;
  return `${n}. Kat`;
}

export function Step3Floors({ goStep }) {
  const { config, setConfig } = useCalculationStore();
  const { floor, firstFloor, flatcheck, floors } = config;

  // Her render'da beklenen kat listesini hesapla
  const expectedFirst = firstFloor ?? 1;
  const expectedCount = Math.max(1, floor || 1);
  const actualFirst   = floors && floors.length > 0 ? floors[floors.length - 1].floor : null;
  const isStale = !floors || floors.length !== expectedCount || actualFirst !== expectedFirst;

  // Component mount olduğunda veya floor/firstFloor değişince eski liste varsa uyar
  const [needsRegen, setNeedsRegen] = useState(false);
  useEffect(() => {
    setNeedsRegen(isStale);
    if (isStale) autoDistribute();
  }, [floor, firstFloor]);

  function autoDistribute() {
    const fc    = Math.max(1, floor || 1);
    const total = Math.max(0, flatcheck || 0);
    const first = firstFloor ?? 1;
    const base  = Math.floor(total / fc);
    const rem   = total % fc;

    const newFloors = [];
    for (let i = fc - 1; i >= 0; i--) {
      const katNo = first + i;
      const count = base + (i >= fc - rem ? 1 : 0);
      newFloors.push({ floor: katNo, count });
    }
    setConfig({ floors: newFloors });
    setNeedsRegen(false);
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
        {/* Adım 1 ayar özeti */}
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:12, padding:'8px 12px', background:'var(--bg)', border:'1px solid var(--border)', borderRadius:'var(--r3)', fontSize:12, color:'var(--muted)' }}>
          <span>📋 Adım 1 ayarları:</span>
          <strong style={{ color:'var(--acc)' }}>{floor} kat</strong>
          <span>·</span>
          <strong style={{ color:'var(--acc)' }}>
            {expectedFirst === 0 ? 'Zemin Kat' : expectedFirst < 0 ? `${expectedFirst}. Bodrum` : `${expectedFirst}. Kat`}'dan başlıyor
          </strong>
          <span>·</span>
          <strong style={{ color:'var(--acc)' }}>{flatcheck} daire</strong>
        </div>

        {/* Yenile / Dağıt butonları */}
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:14, alignItems:'center' }}>
          <Button variant="primary" onClick={autoDistribute}>
            ↻ Kat Listesini Yenile
          </Button>
          <span style={{ fontSize:11, color:'var(--muted)' }}>
            Adım 1 ayarlarına göre {expectedCount} kat, {expectedFirst}. kat'tan başlayarak {flatcheck} daireyi yeniden dağıtır
          </span>
        </div>

        {needsRegen && (
          <div style={{ marginBottom:12, padding:'8px 12px', background:'rgba(255,170,0,0.1)', border:'1px solid var(--warn)', borderRadius:'var(--r3)', fontSize:12, color:'var(--warn)', fontWeight:600 }}>
            ⚠ Adım 1'deki ayarlar değişti. Kat listesi yenileniyor…
          </div>
        )}

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
        <Button variant="primary" onClick={() => {
          if (!floors || floors.length === 0) { showToast('⚠ Kat listesi boş. Adım 1\'de kat sayısı girin.'); return; }
          if (!(totalFlats > 0)) { showToast('⚠ Hiç daire girilmemiş. Kat başına daire sayısını doldurun.'); return; }
          if (totalFlats !== config.flatcheck) { showToast(`⚠ Toplam daire (${totalFlats}) kontrol değerinden (${config.flatcheck}) farklı. Devam etmek için sayıları eşitleyin.`); return; }
          goStep(3);
        }}>Devam: Ekipman →</Button>
      </div>
    </div>
  );
}
