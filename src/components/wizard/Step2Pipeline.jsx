// ── Step 2 — Boru Güzergahı ───────────────────────────────────────────
// Yatay ana hat, dikey kolon (çok zonlu şaft), branşman ve şaft başı vanalar.

import { useCalculationStore } from '../../store/calculationStore.js';
import { Card }         from '../ui/Card.jsx';
import { Field }        from '../ui/Field.jsx';
import { Button }       from '../ui/Button.jsx';
import { GlassSelect }  from '../ui/GlassSelect.jsx';
import { KollectorCard } from '../kollector/KollectorCard.jsx';
import { DIAM_LABEL, DIAM_ORDER } from '../../lib/calculator/constants.js';
import { calcVertSegments } from '../../lib/calculator/vertical.js';
import { showToast } from '../ui/Toast.jsx';

const DIAM_OPTS_VERT = ['q20','q25','q32','q40','q50','q63','q75','q90','q110','q125','q140','q160','q180','q200','q225','q250'];

export function Step2Pipeline({ goStep }) {
  const { config, setConfig } = useCalculationStore();
  const c = config;

  function upd(key, val)  { setConfig({ [key]: val }); }
  function updN(key, val) { setConfig({ [key]: isNaN(parseFloat(val)) ? 0 : parseFloat(val) }); }

  function updZone(i, key, val) {
    const newZones = c.zones.map((z, idx) => idx === i ? { ...z, [key]: val } : z);
    setConfig({ zones: newZones });
  }

  function changeZoneCount(count) {
    const cur  = c.zones || [];
    const def  = { from:1, to:4, startDiam:'q63', minDiam:'q25', bdAktif:'evet', bdDiam:'34', bdTo:4 };
    const next = Array.from({ length: count }, (_, i) => cur[i] || { ...def, from: i*5+1, to: (i+1)*5 });
    if (count === 1) {
      next[0] = { ...next[0], to: c.floor || next[0].to, bdTo: c.floor || next[0].bdTo };
    }
    setConfig({ vertZoneCount: count, zones: next });
  }

  function zonePreview(zone) {
    // Boru şaft tabanından (shaftFloor) zone bitiş katına kadar uzanır
    const shaftStart = c.shaftFloor ?? c.firstFloor ?? 1;
    const fl = Math.max(0, zone.to - shaftStart + 1);
    if (fl <= 0) return '⚠ Geçersiz kat aralığı';
    const segs = calcVertSegments(fl, c.floorH || 4, c.vertStep || 4, zone.startDiam, zone.minDiam);
    return segs.map(s => `${DIAM_LABEL[s.diam]}: ${shaftStart + s.katFrom - 1}–${shaftStart + s.katTo - 1}. kat (${s.m.toFixed(1)} m/şaft)`).join(' | ');
  }

  const ZONE_ACCENTS = ['var(--acc)', 'var(--hot)', 'var(--cold)'];

  return (
    <div>
      {/* Kolektörler */}
      <Card accent="acc" title="Mekanik Oda — Kolektörler" badge="Kol.">
        <p style={{ fontSize:12, color:'var(--muted)', marginBottom:14 }}>
          Her hat için ayrı kolektör. Çıkış adedi ve çaplar bağımsız tanımlanır.
        </p>
        {['hot','cold'].filter(h => c[h === 'hot' ? 'hasHot' : 'hasCold']).map(h => (
          <KollectorCard key={h} hatId={h} />
        ))}
      </Card>

      {/* Yatay Ana Hat */}
      <Card accent="acc" title="Yatay Ana Hat (Mekanik Oda → Şaft Girişi)" badge="A">
        <p style={{ fontSize:12, color:'var(--muted)', marginBottom:14 }}>
          Uzunluklar <strong>tek hat için</strong> girilir; seçili hat sayısıyla çarpılır.
        </p>

        {c.hasHot && (
          <>
            <div className="slbl" style={{ color:'var(--hot)' }}>🔴 Sıcak Su — Yatay Güzergah</div>
            <div className="g g5">
              <Field label="Başlangıç Çapı">
                <GlassSelect value={c.hyHotStart} onChange={e => upd('hyHotStart', e.target.value)}>
                  {['q63','q75','q90','q110'].map(d=><option key={d} value={d}>{DIAM_LABEL[d]}</option>)}
                </GlassSelect>
              </Field>
              <Field label="Uzunluk 1 (m)">
                <input type="number" value={c.hyHotL1} min="0" step="0.1" onChange={e => updN('hyHotL1', e.target.value)} />
              </Field>
              <Field label="2. Çap">
                <GlassSelect value={c.hyHotD2} onChange={e => upd('hyHotD2', e.target.value)}>
                  <option value="">— yok —</option>
                  {['q75','q63','q50','q40'].map(d=><option key={d} value={d}>{DIAM_LABEL[d]}</option>)}
                </GlassSelect>
              </Field>
              <Field label="Uzunluk 2 (m)">
                <input type="number" value={c.hyHotL2} min="0" step="0.1" onChange={e => updN('hyHotL2', e.target.value)} />
              </Field>
              <Field label="3. Çap">
                <GlassSelect value={c.hyHotD3} onChange={e => upd('hyHotD3', e.target.value)}>
                  <option value="">— yok —</option>
                  {['q63','q50','q40','q32'].map(d=><option key={d} value={d}>{DIAM_LABEL[d]}</option>)}
                </GlassSelect>
              </Field>
              <Field label="Uzunluk 3 (m)">
                <input type="number" value={c.hyHotL3} min="0" step="0.1" onChange={e => updN('hyHotL3', e.target.value)} />
              </Field>
            </div>
          </>
        )}

        {c.hasCold && (
          <>
            <div className="slbl" style={{ color:'var(--cold)', marginTop:18 }}>🔵 Soğuk Su — Yatay Güzergah</div>
            <div className="g g5">
              <Field label="Başlangıç Çapı">
                <GlassSelect value={c.hyColdStart} onChange={e => upd('hyColdStart', e.target.value)}>
                  {['q63','q75','q90','q110'].map(d=><option key={d} value={d}>{DIAM_LABEL[d]}</option>)}
                </GlassSelect>
              </Field>
              <Field label="Uzunluk 1 (m)">
                <input type="number" value={c.hyColdL1} min="0" step="0.1" onChange={e => updN('hyColdL1', e.target.value)} />
              </Field>
              <Field label="2. Çap">
                <GlassSelect value={c.hyColdD2} onChange={e => upd('hyColdD2', e.target.value)}>
                  <option value="">— yok —</option>
                  {['q75','q63','q50','q40'].map(d=><option key={d} value={d}>{DIAM_LABEL[d]}</option>)}
                </GlassSelect>
              </Field>
              <Field label="Uzunluk 2 (m)">
                <input type="number" value={c.hyColdL2} min="0" step="0.1" onChange={e => updN('hyColdL2', e.target.value)} />
              </Field>
              <Field label="3. Çap">
                <GlassSelect value={c.hyColdD3} onChange={e => upd('hyColdD3', e.target.value)}>
                  <option value="">— yok —</option>
                  {['q63','q50','q40','q32'].map(d=><option key={d} value={d}>{DIAM_LABEL[d]}</option>)}
                </GlassSelect>
              </Field>
              <Field label="Uzunluk 3 (m)">
                <input type="number" value={c.hyColdL3} min="0" step="0.1" onChange={e => updN('hyColdL3', e.target.value)} />
              </Field>
            </div>
          </>
        )}

        {c.hasCirc && (
          <>
            <div className="slbl" style={{ color:'var(--circ)', marginTop:18 }}>🟣 Sirkülasyon — Yatay</div>
            <div className="g g3">
              <Field label="Sirkülasyon Çapı (sabit)" hint="Tüm güzergahta aynı çap">
                <GlassSelect value={c.circDiam} onChange={e => upd('circDiam', e.target.value)}>
                  {['q20','q25','q32','q40','q50','q63'].map(d=><option key={d} value={d}>{DIAM_LABEL[d]}</option>)}
                </GlassSelect>
              </Field>
              <Field label="Yatay Uzunluk (m)">
                <input type="number" value={c.circYatay} min="0" step="0.1" onChange={e => updN('circYatay', e.target.value)} />
              </Field>
            </div>
          </>
        )}
      </Card>

      {/* Dikey Kolon */}
      <Card accent="acc" title="Dikey Kolon — Çok Zonlu Şaft Sistemi" badge="B">
        <div className="g g3" style={{ marginBottom:16 }}>
          <Field label="Zone Adedi (şaft başına)">
            <GlassSelect value={c.vertZoneCount} onChange={e => changeZoneCount(parseInt(e.target.value))}>
              <option value={1}>1 Zone (tek kolon)</option>
              <option value={2}>2 Zone</option>
              <option value={3}>3 Zone</option>
            </GlassSelect>
          </Field>
          <Field label="Kaç Katta Bir Çap Küçülür?">
            <GlassSelect value={c.vertStep} onChange={e => updN('vertStep', e.target.value)}>
              <option value={3}>Her 3 katta bir</option>
              <option value={4}>Her 4 katta bir</option>
              <option value={5}>Her 5 katta bir</option>
            </GlassSelect>
          </Field>
        </div>

        {(c.zones || []).slice(0, c.vertZoneCount).map((zone, i) => (
          <div key={i} style={{
            marginBottom:12, padding:14,
            background:'var(--bg)', border:'1px solid var(--border)',
            borderLeft:`3px solid ${ZONE_ACCENTS[i]}`, borderRadius:'var(--r)',
          }}>
            <div style={{ fontSize:11, fontWeight:800, letterSpacing:'.5px', textTransform:'uppercase', color:ZONE_ACCENTS[i], marginBottom:12 }}>
              {i+1}. Zone
            </div>
            <div className="g g4">
              <Field label="Servis Başlangıç Katı" hint="Bu zone'un beslediği ilk kat">
                <input type="number" value={zone.from} min="1" style={{ fontFamily:'var(--mono)', fontWeight:700 }}
                  onChange={e => updZone(i, 'from', parseInt(e.target.value))} />
              </Field>
              <Field label="Servis Bitiş Katı" hint="Bu zone'un beslediği son kat (boru buraya kadar çekilir)">
                <input type="number" value={zone.to} min="1" style={{ fontFamily:'var(--mono)', fontWeight:700 }}
                  onChange={e => updZone(i, 'to', parseInt(e.target.value))} />
              </Field>
              <Field label="Başlangıç Çapı">
                <GlassSelect value={zone.startDiam} onChange={e => updZone(i, 'startDiam', e.target.value)}>
                  {DIAM_OPTS_VERT.map(d=><option key={d} value={d}>{DIAM_LABEL[d]}</option>)}
                </GlassSelect>
              </Field>
              <Field label="Minimum Çap">
                <GlassSelect value={zone.minDiam} onChange={e => updZone(i, 'minDiam', e.target.value)}>
                  {DIAM_OPTS_VERT.map(d=><option key={d} value={d}>{DIAM_LABEL[d]}</option>)}
                </GlassSelect>
              </Field>
            </div>
            {/* BD satırı */}
            <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', marginTop:10, padding:'8px 12px', background:'var(--white)', border:'1px solid var(--border2)', borderRadius:'var(--r3)' }}>
              <span style={{ fontSize:11, fontWeight:700, color:'var(--cold)', textTransform:'uppercase' }}>Basınç Düşürücü</span>
              <GlassSelect value={zone.bdAktif} onChange={e => updZone(i,'bdAktif',e.target.value)} style={{ flex:'0 0 120px' }}>
                <option value="evet">Var</option>
                <option value="hayir">Yok</option>
              </GlassSelect>
              <GlassSelect value={zone.bdDiam} onChange={e => updZone(i,'bdDiam',e.target.value)} style={{ flex:'0 0 150px' }}>
                <option value="34">¾" (DN20)</option>
                <option value="1">1" (DN25)</option>
                <option value="114">1¼" (DN32)</option>
              </GlassSelect>
              <span style={{ fontSize:11, color:'var(--muted)' }}>BD bitiş katı:</span>
              <input type="number" value={zone.bdTo} min="1" style={{ width:60, border:'1px solid var(--border2)', borderRadius:999, padding:'4px 8px', fontSize:13, fontFamily:'var(--mono)', fontWeight:700, outline:'none', textAlign:'center', background:'rgba(255,255,255,0.85)' }}
                onChange={e => updZone(i,'bdTo',parseInt(e.target.value))} />
            </div>
            <div style={{ marginTop:8, fontSize:11, color:'var(--muted)', fontFamily:'var(--mono)' }}>
              {zonePreview(zone)}
            </div>
          </div>
        ))}
      </Card>

      {/* Sirkülasyon Dikey */}
      {c.hasCirc && (
        <Card accent="circ" title="Sirkülasyon — Dikey Güzergah" badge="C">
          <div className="g g3">
            <Field label="Dikey Uzunluk (m / şaft)" hint="Şaft başından üst kata kadar">
              <input type="number" value={c.circDikey} min="0" step="0.1" onChange={e => updN('circDikey', e.target.value)} />
            </Field>
            <Field label="Daire Başı Bağlantı (m)" hint="Şaft → daire girişi">
              <input type="number" value={c.circFlat} min="0" step="0.1" onChange={e => updN('circFlat', e.target.value)} />
            </Field>
          </div>
        </Card>
      )}

      {/* Daire Branşman */}
      <Card accent="acc" title="Daire Branşman Hattı" badge="D">
        <div className="slbl" style={{ marginTop:0 }}>Boru</div>
        <div className="g g4" style={{ marginBottom:16 }}>
          <Field label="Branşman Boru Çapı">
            <GlassSelect value={c.brDiam} onChange={e => upd('brDiam', e.target.value)}>
              <option value="q20">Q20 — ½"</option>
              <option value="q25">Q25 — ¾"</option>
              <option value="q32">Q32 — 1"</option>
            </GlassSelect>
          </Field>
          {c.hasHot  && <Field label="Sıcak Branşman (m / daire)"><input type="number" value={c.brHot}  min="0" step="0.1" onChange={e => updN('brHot',  e.target.value)} /></Field>}
          {c.hasCold && <Field label="Soğuk Branşman (m / daire)"><input type="number" value={c.brCold} min="0" step="0.1" onChange={e => updN('brCold', e.target.value)} /></Field>}
        </div>
        <div className="slbl">Sayaç Grubu (daire başına, hat başına)</div>
        <div className="g g4" style={{ marginBottom:16 }}>
          {c.hasHot  && <Field label="Sıcak Sayaç / daire"><input type="number" value={c.dHotmeter}  min="0" onChange={e => updN('dHotmeter',  e.target.value)} /></Field>}
          {c.hasCold && <Field label="Soğuk Sayaç / daire"><input type="number" value={c.dColdmeter} min="0" onChange={e => updN('dColdmeter', e.target.value)} /></Field>}
        </div>
        <div className="slbl">Sayaç Başına Montaj Parçaları</div>
        <div className="g g4">
          <Field label="Adaptör Büyük"      hint="Sayaç girişi (boru→metal)"><input type="number" value={c.dAda}      min="0" onChange={e => updN('dAda',      e.target.value)} /></Field>
          <Field label="Ana Kesme Vanası"   hint="Sayaç önü — branşman çapı"><input type="number" value={c.dValveIn}  min="0" onChange={e => updN('dValveIn',  e.target.value)} /></Field>
          <Field label="İkinci Vana"        hint="Sayaç arkası — bir küçük çap"><input type="number" value={c.dValve}   min="0" onChange={e => updN('dValve',   e.target.value)} /></Field>
          <Field label="Filtre"             hint="Sayaç başına"><input type="number" value={c.dFilt}     min="0" onChange={e => updN('dFilt',     e.target.value)} /></Field>
          <Field label="Çekvalf"            hint="0=yok, 1=var"><input type="number" value={c.dCv}       min="0" onChange={e => updN('dCv',       e.target.value)} /></Field>
          <Field label="Sarı Nipel"         hint="Çekvalf başına"><input type="number" value={c.dNip}     min="0" onChange={e => updN('dNip',     e.target.value)} /></Field>
          <Field label="Adaptör Küçük"      hint="Sayaç çıkışı (metal→daire)"><input type="number" value={c.dAda2}     min="0" onChange={e => updN('dAda2',     e.target.value)} /></Field>
          <Field label="Sayaç Rakoru">      <input type="number" value={c.dSaatrek}  min="0" onChange={e => updN('dSaatrek',  e.target.value)} /></Field>
        </div>
      </Card>

      {/* Şaft Başı Vanalar */}
      <Card accent="acc" title="Şaft Başı Vanalar" badge="E">
        <div className="g g3">
          <Field label="Vana Malzemesi" hint="Her şaft girişinde 1 adet">
            <GlassSelect value={c.shaftVanaMat} onChange={e => upd('shaftVanaMat', e.target.value)}>
              <option value="ppr">PPR Küresel Vana</option>
              <option value="pirince">Pirinç Küresel Vana</option>
            </GlassSelect>
          </Field>
          <Field label="Hat Başı Vana Çapı">
            <GlassSelect value={c.shaftVanaDiam} onChange={e => upd('shaftVanaDiam', e.target.value)}>
              {['q25','q32','q40','q50','q63','q75','q90'].map(d=><option key={d} value={d}>{DIAM_LABEL[d]}</option>)}
            </GlassSelect>
          </Field>
          <Field label="Şaft Başı Vana Adedi / Hat" hint="Toplam = adet × şaft × hat">
            <input type="number" value={c.shaftVanaAdet} min="0" onChange={e => updN('shaftVanaAdet', e.target.value)} />
          </Field>
        </div>
        <div style={{ marginTop:14, padding:'12px 14px', background:'var(--bg)', border:'1px solid var(--border)', borderRadius:'var(--r3)' }}>
          <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', fontSize:13, fontWeight:600 }}>
            <input type="checkbox" checked={c.shaft4katCk} onChange={e => upd('shaft4katCk', e.target.checked)} style={{ width:17, height:17, cursor:'pointer' }} />
            Her 4 katta bir şaft PPR kesme vanası ekle
          </label>
        </div>
      </Card>

      <div className="btn-row">
        <Button variant="default" onClick={() => goStep(0)}>← Geri</Button>
        <Button variant="primary" onClick={() => {
          const shaftStart = c.shaftFloor ?? c.firstFloor ?? 1;
          const activeZones = (c.zones || []).slice(0, c.vertZoneCount || 1);
          for (let i = 0; i < activeZones.length; i++) {
            const z = activeZones[i];
            if (!(z.to > shaftStart - 1)) { showToast(`⚠ ${i+1}. Zone bitiş katı şaft başlangıç katından büyük olmalıdır.`); return; }
            if (i > 0 && z.from <= activeZones[i-1].to) { showToast(`⚠ ${i+1}. Zone başlangıç katı ${i}. Zone bitiş katından sonra olmalıdır.`); return; }
          }
          if (c.hasHot && !(c.hyHotL1 > 0)) { showToast('⚠ Sıcak su yatay hat uzunluğu (Segment 1) girilmedi.'); return; }
          if (c.hasCold && !(c.hyColdL1 > 0)) { showToast('⚠ Soğuk su yatay hat uzunluğu (Segment 1) girilmedi.'); return; }
          goStep(2);
        }}>Devam: Kat Dağılımı →</Button>
      </div>
    </div>
  );
}
