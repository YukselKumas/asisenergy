// ── WizardShell — 6 adımlı hesaplama sihirbazı çerçevesi ─────────────
// Her adım bağımsız bir bileşen; bu bileşen adım takibini ve geçişleri yönetir.

import { useState } from 'react';
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

export function WizardShell() {
  const [step, setStep] = useState(0);

  function goStep(idx) {
    setStep(idx);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const Panel = PANELS[step];

  return (
    <div>
      {/* Adım göstergesi */}
      <div style={{ display:'flex', gap:4, marginBottom:24, overflowX:'auto', paddingBottom:1 }}>
        {STEPS.map((s, i) => (
          <button
            key={i}
            onClick={() => goStep(i)}
            style={{
              flex:        1,
              minWidth:    120,
              cursor:      'pointer',
              background:  i === step ? 'var(--acc)' : i < step ? 'var(--green-bg)' : 'var(--white)',
              border:      `1px solid ${i === step ? 'var(--acc)' : i < step ? 'var(--green-b)' : 'var(--border)'}`,
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
              color: i === step ? '#fff' : i < step ? 'var(--green)' : 'var(--muted)',
            }}>
              Adım {i + 1}
            </span>
            <span style={{
              fontSize:12, fontWeight:700, display:'block',
              color: i === step ? '#fff' : i < step ? 'var(--green)' : 'var(--muted)',
            }}>
              {s.label}
            </span>
          </button>
        ))}
      </div>

      {/* Aktif panel */}
      <Panel goStep={goStep} currentStep={step} />
    </div>
  );
}
