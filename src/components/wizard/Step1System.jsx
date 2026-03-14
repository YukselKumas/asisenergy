// ── Step 1 — Sistem Tanımı ────────────────────────────────────────────
// Hat seçimi, marka seçimi, bina bilgileri ve mekanik oda tanımları.

import { useCalculationStore } from '../../store/calculationStore.js';
import { Card }   from '../ui/Card.jsx';
import { Field }  from '../ui/Field.jsx';
import { Button } from '../ui/Button.jsx';

export function Step1System({ goStep }) {
  const { config, setConfig } = useCalculationStore();
  const c = config;

  function upd(key, val) { setConfig({ [key]: val }); }
  function updN(key, val) { setConfig({ [key]: isNaN(parseFloat(val)) ? 0 : parseFloat(val) }); }

  return (
    <div>
      {/* Marka Seçimi */}
      <Card accent="green" title="Marka Seçimi" badge="★">
        <p style={{ fontSize:12, color:'var(--muted)', marginBottom:16 }}>
          Her kategori için marka seçin. Fiyatlar <strong>Adım 5 — Fiyat Listesi</strong>'nde düzenlenebilir.
        </p>
        <div className="g g4">
          <Field label="PPR Boru & Bağlantı" hint="Boru, dirsek, te, redüksiyon">
            <select value={c.markaPpr} onChange={e => upd('markaPpr', e.target.value)}>
              <option value="kalde">Kalde</option>
              <option value="firat">Fırat Boru</option>
              <option value="wavin">Wavin Tigris</option>
              <option value="pilsa">Pilsa</option>
              <option value="diger">Diğer / Manuel</option>
            </select>
          </Field>
          <Field label="Pirinç Küresel Vana" hint="Kolektör çıkış, emiş hattı">
            <select value={c.markaPirince} onChange={e => upd('markaPirince', e.target.value)}>
              <option value="standart">Standart / Press</option>
              <option value="caleffi">Caleffi</option>
              <option value="imi">IMI / Crane</option>
              <option value="watts">Watts</option>
            </select>
          </Field>
          <Field label="Basınç Düşürücü" hint="Daire başı BD">
            <select value={c.markaBd} onChange={e => upd('markaBd', e.target.value)}>
              <option value="caleffi">Caleffi</option>
              <option value="honeywell">Honeywell / Resideo</option>
              <option value="watts">Watts</option>
            </select>
          </Field>
          <Field label="Filtre & Çekvalf">
            <select value={c.markaFiltre} onChange={e => upd('markaFiltre', e.target.value)}>
              <option value="kalde">Kalde (PPR ile aynı)</option>
              <option value="caleffi">Caleffi</option>
              <option value="watts">Watts</option>
            </select>
          </Field>
        </div>
      </Card>

      {/* Hat Seçimi */}
      <Card accent="acc" title="Sistemdeki Hatları İşaretleyin" badge="1">
        <p style={{ fontSize:12, color:'var(--muted)', marginBottom:14 }}>
          Mekanik odadan çıkan hatları seçin. Sıcak Su ve Sirkülasyon birlikte seçilir.
        </p>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap', marginBottom:10 }}>
          {/* Sıcak Su + Sirkülasyon — birlikte toggle */}
          {[
            { id:'hasHot',  label:'🔴 Sıcak Su', color:'var(--hot)' },
            { id:'hasCirc', label:'🟣 Sirkülasyon', color:'var(--circ)' },
          ].map(hat => (
            <label
              key={hat.id}
              style={{
                display:'flex', alignItems:'center', gap:8,
                padding:'10px 16px', borderRadius:'var(--r2)',
                border: `1.5px solid ${c[hat.id] ? hat.color : 'var(--border)'}`,
                background: c[hat.id] ? 'rgba(0,0,0,0.04)' : 'var(--white)',
                cursor:'pointer', fontWeight:600, fontSize:13,
                color: c[hat.id] ? hat.color : 'var(--muted)',
                userSelect:'none',
              }}
            >
              <input
                type="checkbox"
                style={{ display:'none' }}
                checked={c[hat.id]}
                onChange={e => {
                  const v = e.target.checked;
                  setConfig({ hasHot: v, hasCirc: v });
                }}
              />
              {hat.label}
            </label>
          ))}
          {/* Soğuk Su — bağımsız */}
          <label
            style={{
              display:'flex', alignItems:'center', gap:8,
              padding:'10px 16px', borderRadius:'var(--r2)',
              border: `1.5px solid ${c.hasCold ? 'var(--cold)' : 'var(--border)'}`,
              background: c.hasCold ? 'rgba(0,0,0,0.04)' : 'var(--white)',
              cursor:'pointer', fontWeight:600, fontSize:13,
              color: c.hasCold ? 'var(--cold)' : 'var(--muted)',
              userSelect:'none',
            }}
          >
            <input type="checkbox" style={{ display:'none' }} checked={c.hasCold} onChange={e => upd('hasCold', e.target.checked)} />
            🔵 Soğuk Su
          </label>
        </div>
        {c.hasHot && (
          <div style={{ fontSize:11, color:'var(--muted)', marginTop:4 }}>
            ℹ Sıcak su seçildiğinde sirkülasyon hattı otomatik aktif olur.
          </div>
        )}
      </Card>

      {/* Bina Bilgileri */}
      <Card accent="acc" title="Bina Bilgileri" badge="2">
        <div className="g g4">
          <Field label="Kat Sayısı" hint="Dairelerin toplam kat adedi">
            <input type="number" value={c.floor} min="1" onChange={e => updN('floor', e.target.value)} />
          </Field>
          <Field label="Toplam Daire Sayısı" hint="Katlara otomatik dağıtılır">
            <input type="number" value={c.flatcheck} min="0" onChange={e => updN('flatcheck', e.target.value)} />
          </Field>
          <Field label="Daire Başlangıç Katı" hint="Örn: -1, 0 veya 1">
            <input type="number" value={c.firstFloor} min="-10" max="10" onChange={e => updN('firstFloor', e.target.value)} />
          </Field>
          <Field label="Kat Yüksekliği (m)" hint="Dikey boru hesabında kullanılır">
            <input type="number" value={c.floorH} min="1" step="0.1" onChange={e => updN('floorH', e.target.value)} />
          </Field>
          <Field label="Şaft Sayısı" hint="Kolektör çıkış adedine eşit">
            <input type="number" value={c.shaft} min="1" onChange={e => updN('shaft', e.target.value)} />
          </Field>
        </div>
      </Card>

      {/* Mekanik Oda — Su Deposu */}
      <Card accent="cold" title="Mekanik Oda — Su Deposu" badge="4a">
        <div className="g g4">
          <Field label="Depo Adedi">
            <input type="number" value={c.depoAdet} min="0" onChange={e => updN('depoAdet', e.target.value)} />
          </Field>
          <Field label="Depo Hacmi (m³ / adet)">
            <input type="number" value={c.depoHacim} min="0" step="0.5" onChange={e => updN('depoHacim', e.target.value)} />
          </Field>
          <Field label="Depo Malzemesi">
            <select value={c.depoMat} onChange={e => upd('depoMat', e.target.value)}>
              <option value="polietilen">Polietilen (PE)</option>
              <option value="celik">Çelik</option>
              <option value="paslanmaz">Paslanmaz Çelik</option>
              <option value="beton">Beton</option>
            </select>
          </Field>
          <Field label="Bağlantı Çapı (emiş)" hint="Hidrofor emiş hattı çapı">
            <select value={c.depoDiam} onChange={e => upd('depoDiam', e.target.value)}>
              <option value="q50">Q50 — 1½"</option>
              <option value="q63">Q63 — 2"</option>
              <option value="q75">Q75 — 2½"</option>
              <option value="q90">Q90 — 3"</option>
              <option value="q110">Q110 — 4"</option>
            </select>
          </Field>
        </div>
      </Card>

      {/* Mekanik Oda — Hidrofor */}
      <Card accent="warn" title="Mekanik Oda — Hidrofor / Pompa Grubu" badge="4b">
        <div className="slbl" style={{ marginTop:0 }}>⬆ Pompa Çıkış Hattı</div>
        <div className="g g4">
          <Field label="Hidrofor / Pompa Adedi">
            <input type="number" value={c.hidroforAdet} min="0" onChange={e => updN('hidroforAdet', e.target.value)} />
          </Field>
          <Field label="Pompa Çıkış Çapı">
            <select value={c.hidroforDiam} onChange={e => upd('hidroforDiam', e.target.value)}>
              <option value="q25">Q25 — ¾"</option>
              <option value="q32">Q32 — 1"</option>
              <option value="q40">Q40 — 1¼"</option>
              <option value="q50">Q50 — 1½"</option>
              <option value="q63">Q63 — 2"</option>
              <option value="q75">Q75 — 2½"</option>
              <option value="q90">Q90 — 3"</option>
              <option value="q110">Q110 — 4"</option>
            </select>
          </Field>
          <Field label="Pompa Çıkış Vanası" hint="Her pompa başına 2 adet">
            <select value={c.hidroforVana} onChange={e => upd('hidroforVana', e.target.value)}>
              <option value="pirince">Pirinç Küresel Vana</option>
              <option value="ppr">PPR Küresel Vana</option>
            </select>
          </Field>
          <Field label="Pompa Başı Çekvalf">
            <select value={c.hidroforCv} onChange={e => upd('hidroforCv', e.target.value)}>
              <option value="evet">Var — 1 adet / pompa</option>
              <option value="hayir">Yok</option>
            </select>
          </Field>
          <Field label="Union / Oynar Rakor">
            <select value={c.hidroforUnion} onChange={e => upd('hidroforUnion', e.target.value)}>
              <option value="evet">Var — 2 adet / pompa</option>
              <option value="hayir">Yok</option>
            </select>
          </Field>
          <Field label="Union Çapı">
            <select value={c.hidroforUnionDiam} onChange={e => upd('hidroforUnionDiam', e.target.value)}>
              <option value="q32">Q32 — 1"</option>
              <option value="q40">Q40 — 1¼"</option>
              <option value="q50">Q50 — 1½"</option>
              <option value="q63">Q63 — 2"</option>
            </select>
          </Field>
          <Field label="Manometre (hidrofor)">
            <input type="number" value={c.hidroforMano} min="0" onChange={e => updN('hidroforMano', e.target.value)} />
          </Field>
        </div>
        <div className="slbl">⬇ Pompa Emiş Hattı (Depo → Pompa)</div>
        <div className="g g4">
          <Field label="Emiş Hattı Çapı" hint="Pompa başına 1 emiş hattı">
            <select value={c.emisDiam} onChange={e => upd('emisDiam', e.target.value)}>
              <option value="q50">Q50 — 1½"</option>
              <option value="q63">Q63 — 2"</option>
              <option value="q75">Q75 — 2½"</option>
              <option value="q90">Q90 — 3"</option>
              <option value="q110">Q110 — 4"</option>
            </select>
          </Field>
          <Field label="Emiş Hattı Pirinç Vana">
            <select value={c.emisVana} onChange={e => upd('emisVana', e.target.value)}>
              <option value="evet">Var — 1 adet / pompa</option>
              <option value="hayir">Yok</option>
            </select>
          </Field>
          <Field label="Emiş Hattı Filtre">
            <select value={c.emisFilt} onChange={e => upd('emisFilt', e.target.value)}>
              <option value="evet">Var — 1 adet / pompa</option>
              <option value="hayir">Yok</option>
            </select>
          </Field>
          <Field label="Vana–Filtre Arası Nipel">
            <select value={c.emisNip} onChange={e => upd('emisNip', e.target.value)}>
              <option value="evet">Var — 1 adet / pompa</option>
              <option value="hayir">Yok</option>
            </select>
          </Field>
        </div>
      </Card>

      {/* Boyler & Sabit Ekipman */}
      {c.hasHot && (
        <Card accent="warn" title="Boyler / Isıtıcı" badge="5">
          <div className="g g4">
            <Field label="Boyler Adedi">
              <input type="number" value={c.boylerAdet} min="0" onChange={e => updN('boylerAdet', e.target.value)} />
            </Field>
            <Field label="Boyler Bağlantı Çapı">
              <select value={c.boylerDiam} onChange={e => upd('boylerDiam', e.target.value)}>
                <option value="q32">Q32 — 1"</option>
                <option value="q40">Q40 — 1¼"</option>
                <option value="q50">Q50 — 1½"</option>
                <option value="q63">Q63 — 2"</option>
                <option value="q75">Q75 — 2½"</option>
                <option value="q90">Q90 — 3"</option>
                <option value="q110">Q110 — 4"</option>
              </select>
            </Field>
            <Field label="Boyler Çıkış Vanası">
              <select value={c.boylerVana} onChange={e => upd('boylerVana', e.target.value)}>
                <option value="pirince">Pirinç Küresel Vana</option>
                <option value="ppr">PPR Küresel Vana</option>
              </select>
            </Field>
            <Field label="Genleşme Tankı Adedi">
              <input type="number" value={c.tankAdet} min="0" onChange={e => updN('tankAdet', e.target.value)} />
            </Field>
          </div>
        </Card>
      )}

      <Card accent="warn" title="Mekanik Oda — Sabit Ekipmanlar" badge="6">
        <div className="g g4">
          <Field label="Sirkülasyon Pompası">
            <input type="number" value={c.pump} min="0" onChange={e => updN('pump', e.target.value)} />
          </Field>
          <Field label="Manometre">
            <input type="number" value={c.mano} min="0" onChange={e => updN('mano', e.target.value)} />
          </Field>
          <Field label="Oto. Hava Tahliye">
            <input type="number" value={c.air} min="0" onChange={e => updN('air', e.target.value)} />
          </Field>
          <Field label="Ana Hat Filtresi">
            <input type="number" value={c.mainf} min="0" onChange={e => updN('mainf', e.target.value)} />
          </Field>
          <Field label="Ana Hat Filtre Çapı">
            <select value={c.mainfDiam} onChange={e => upd('mainfDiam', e.target.value)}>
              <option value="f34">¾" (DN20)</option>
              <option value="f1">1" (DN25)</option>
              <option value="f114">1¼" (DN32)</option>
              <option value="f112">1½" (DN40)</option>
              <option value="f2">2" (DN50)</option>
              <option value="f212">2½" (DN65)</option>
              <option value="f3">3" (DN80)</option>
              <option value="f4">4" (DN100)</option>
            </select>
          </Field>
        </div>
      </Card>

      <div className="btn-row">
        <Button variant="primary" onClick={() => goStep(1)}>Devam: Boru Güzergahı →</Button>
      </div>
    </div>
  );
}
