# Theme 4 — Golden thread (rating → executed controls)

Ports CRAM-Suite.html operational hand-off into TypeScript — no iframe, no logic left in HTML.

## Flow

```
Inherent score (6-factor engine)
    → CDD/EDD level + EDD-required flag
    → Approval authority (RM / team lead / MLRO / FCC)
    → Review cadence (60 / 36 / 12 mo)
    → Monitoring profile (AED thresholds · re-screen · media sweep)
    → Deploy to TM engine (audit: monitoring.deployed)
    → Residual layer (6 controls · appetite · control gap)
```

## Modes

| Mode | Geography | UBO |
|------|-----------|-----|
| **Individual** | Residence · birth · nationality · SoW · SoF | N/A (natural person) |
| **Entity** | Operating · incorporation · UBO · SoW | Entity type · ownership · OVR-004 |

## Files

- `src/engine/goldenThread.ts` — EDD workflow, monitoring profile, onboarding gate
- `src/engine/residualLayer.ts` — control effectiveness → residual
- `src/engine/cramSuiteConfig.ts` — weights, review months, AED bands
- `src/pages/CramRiskTestBench.tsx` — Individual / Entity UI
- `src/components/cramSuite/HandoffPanel.tsx` — operational execution panel

## Test Bench (http://localhost:5174/test-bench)

1. Toggle **Individual** / **Entity**
2. Set controls (Section 04) — watch residual change
3. Complete **EDD workflow** checkboxes when required
4. **Record approval** → **Deploy profile to monitoring engine**
5. **Submit assessment** — handoff persisted on assessment + audit log
