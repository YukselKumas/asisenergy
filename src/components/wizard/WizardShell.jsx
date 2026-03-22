// ── WizardShell — 6 adımlı hesaplama sihirbazı çerçevesi ─────────────
// isReadOnly=true iken doğrudan Sonuçlar adımına atlar (görüntüleme modu).

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCalculationStore } from '../../store/calculationStore.js';
import { Step1System }    from './Step1System.jsx';
import { Step2Pipeline }  from './Step2Pipeline.jsx';
import { Step3Floors }    from './Step3Floors.jsx';
import { Step4Equipment } from './Step4Equipment.jsx';
import { Step5Prices }    from './Step5Prices.jsx';
import { Step6Results }   from './Step6Results.jsx';

const STEPS = [
  { label: 'Sistem Tanımı'  },
  { label: 'Boru Güzergahı' },
  { label: 'Kat Dağılımı'   },
  { label: 'Ekipman'        },
  { label: 'Fiyat Listesi'  },
  { label: 'Sonuçlar'       },
];

const PANELS = [Step1System, Step2Pipeline, Step3Floors, Step4Equipment, Step5Prices, Step6Results];
const RESULT_STEP = 5;

export function WizardShell() {
  const isReadOnly  = useCalculationStore(s => s.isReadOnly);
  const projectName = useCalculationStore(s => s.projectName);
  const navigate    = useNavigate();

  // Read-only modda direkt Sonuçlar adımına git
  const [step,    setStep]    = useState(isReadOnly ? RESULT_STEP : 0);
  const [maxStep, setMaxStep] = useState(isReadOnly ? RESULT_STEP : 0);

  useEffect(() => {
    if (isReadOnly) {
      setStep(RESULT_STEP);
      setMaxStep(RESULT_STEP);
    }
  }, [isReadOnly]);

  function goStep(idx) {
    if (isReadOnly) return;  // read-only'de adım geçişi engelle
    setMaxStep(prev => Math.max(prev, idx));
    setStep(idx);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const Panel = PANELS[step];

  return (
    <div>
      {/* ── Görüntüleme modu banner ── */}
      {isReadOnly && (
        <div style={{
          marginBottom: 16, padding: '10px 16px',
          background: 'rgba(245,158,11,0.09)', border: '1px solid var(--warn)',
          borderRadius: 'var(--r)', display: 'flex', alignItems: 'center',
          gap: 12, flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--warn)', flex: 1 }}>
            📄 Görüntüleme Modu — Bu proje kaydedilmiş ve değiştirilemez.
            Değişiklik yapmak için "Revizyon Yap" kullanın.
          </span>
          <button
            onClick={() => navigate('/gecmis')}
            style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 999, padding: '5px 14px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
          >
            ← Geçmiş
          </button>
        </div>
      )}

      {/* ── Adım sekmeleri — read-only'de sadece Sonuçlar erişilebilir ── */}
      <div style={{ display:'flex', gap:4, marginBottom:24, overflowX:'auto', paddingBottom:1 }}>
        {STEPS.map((s, i) => {
          const unlocked = isReadOnly ? (i === RESULT_STEP) : (i <= maxStep);
          const active   = i === step;
          const done     = !isReadOnly && i < step;
          return (
            <button
              key={i}
              onClick={() => unlocked && !isReadOnly && setStep(i)}
              disabled={!unlocked}
              style={{
                flex:        1,
                minWidth:    120,
                cursor:      unlocked && !isReadOnly ? 'pointer' : 'not-allowed',
                opacity:     unlocked ? 1 : 0.35,
                background:  active ? 'var(--acc)' : done ? 'var(--green-bg)' : 'var(--white)',
                border:      `1px solid ${active ? 'var(--acc)' : done ? 'var(--green-b)' : 'var(--border)'}`,
                borderRadius:'var(--r2)',
                padding:     '9px 12px',
                textAlign:   'left',
                transition:  'all .15s',
                fontFamily:  'var(--sans)',
              }}
            >
              <span style={{
                fontSize:10, fontWeight:700, letterSpacing:'.4px', textTransform:'uppercase',
                display:'block', marginBottom:2, opacity:.65,
                color: active ? '#fff' : done ? 'var(--green)' : 'var(--muted)',
              }}>
                {!isReadOnly && unlocked && !active && done ? '✓ ' : ''}Adım {i + 1}
              </span>
              <span style={{
                fontSize:12, fontWeight:700, display:'block',
                color: active ? '#fff' : done ? 'var(--green)' : 'var(--muted)',
              }}>
                {s.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Aktif panel ── */}
      <Panel goStep={goStep} currentStep={step} />
    </div>
  );
}
