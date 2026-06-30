# 19 — Partner integration Phase 0 sign-off pack

**Status:** COMPLETE — ready for Phase 1a implementation  
**Model version:** CRAM-CBUAE-2026-05-FREEZE-01 (draft)  
**Signed-off by:** Product / Engineering (build) · **MLRO ratification:** PENDING signature  

---

## 1. Executive summary

Mal FinCrime OS integrates four production partners under a **webhook-first, Vital4-authoritative screening** model with **dual-region** deployment (UAE + US BaaS) and **dual FIU** reporting (goAML + FinCEN).

Machine-readable config: `src/config/partnerIntegration.ts`

---

## 2. Vendor RACI

| Activity | Shufti Pro | Vital4 | AiPrise | Oscilar | Mal CRAM | Core banking | MLRO |
|----------|------------|--------|---------|---------|----------|--------------|------|
| Individual KYC / liveness | **R/A** | I | I | I | **A** (orchestrator) | C | I |
| Sanctions / PEP / adverse | I | **R/A** | I | I (mirror only) | **A** (normalize + score) | I | **A** (TM disposition) |
| Entity KYB / UBO graph | I | C | **R/A** | I | **A** | C | C |
| Transaction monitoring | I | I | I | **R/A** | **A** (feed + re-rate) | I | C |
| Txn screening hits | I | **R/A** (via mirror) | I | **R** (detect) | **A** (mirror + link) | I | **A** |
| CRA scoring | I | I | I | I | **R/A** | C | C |
| Screening disposition | I | C | I | C | **R** (UI + API) | I | **A** |
| STR / SAR filing | I | I | I | C | **R** (Jana draft) | I | **A** (file) |

R = Responsible · A = Accountable · C = Consulted · I = Informed

---

## 3. Screening authority matrix (LOCKED)

| Data element | Sole writer | Readers | Notes |
|--------------|-------------|---------|-------|
| `sanctions` | **Vital4** | CRAM engine | OVR-001 / HOLD |
| `pep` (+ Foreign/Domestic/IO) | **Vital4** | CRAM engine | OVR-008 / OVR-016 |
| `adverse` | **Vital4** | CRAM engine | OVR-009 |
| `watchlist` (internal) | **Vital4** → CRAM | CRAM engine | OVR-002 |
| Identity verified / liveness | **Shufti Pro** | DQ gate | OVR-013 path |
| Entity / UBO structure | **AiPrise** | Entity capture | OVR-004 |
| TM alerts / behaviour | **Oscilar** | Feed pipeline | OVR-020 / OVR-010 |
| Oscilar txn screening raw hit | **Oscilar** | — | **Never** writes CRAM screening fields |

**Shufti AML module:** DISABLED or ignored in CRAM mapping (informational log only).

**Oscilar txn screening:** ALWAYS create/link Vital4 case; CRAM reads Vital4 disposition only.

---

## 4. Customer & vendor ID scheme

```
customerId     = Mal core banking ID (immutable, global)
licenseRegion  = UAE | US
reference      = { customerId, licenseRegion, onboardingCaseId? }

vendorSubjectId (per partner):
  shufti:   SP-{customerId}-{attempt}
  vital4:   V4-{customerId}-{screeningCaseId}
  aiprise:  AP-{customerId}-{kybCaseId}
  oscilar:  OS-{customerId}-{alertId}

vendor_identity table: (vendorId, source) → customerId
case_links table: vital4CaseId ↔ oscilarAlertId ↔ cramScreeningCaseId
```

---

## 5. Webhook security (mandatory)

| Control | Requirement |
|---------|-------------|
| Transport | TLS 1.2+ only |
| Signature | HMAC-SHA256 (`X-Vital4-Signature`, etc.) per vendor |
| Idempotency | `event_id` unique; reject duplicates (store in `webhook_log`) |
| Replay window | Reject events older than 5 minutes (clock skew tolerance) |
| IP allowlist | Vendor egress IPs in WAF (production) |
| Auth on API | ServiceAccount for ingest; MLRO/Reviewer for disposition |
| PII in logs | Raw payload stored encrypted/at-rest; redact in application logs |

**Callback URLs (register with each vendor):**

| Region | Base URL |
|--------|----------|
| UAE | `https://api.cram.mal.ae/webhooks/{vendor}` |
| US | `https://api-us.cram.mal.com/webhooks/{vendor}` |

---

## 6. SLA matrix (operational)

| Result / event | SLA | CRAM action |
|----------------|-----|-------------|
| Sanctions True Match | Immediate | OVR-001 · block · MLRO alert |
| Sanctions Potential Match | **4 hours** | HOLD · Compliance queue |
| Adverse True Match | **4 hours** | OVR-009 · review queue |
| Any Pending | **48 hours** | Escalate to MLRO |
| Oscilar TM critical | Immediate | Feed → re-rate → alert |
| Oscilar TM high | Same day | Feed → re-rate |
| KYC refresh overdue | Before re-rate | DQ BLOCKED |
| Periodic rescreen (Vital4 batch) | Daily batch | Delta events only |

---

## 7. Data map & residency

| Vendor | PII sent | Stored in CRAM | Retention | Region |
|--------|----------|----------------|-----------|--------|
| Shufti Pro | Name, DOB, ID images, selfie | KycQualityContext + raw webhook | 5y post relationship | UAE / US partition |
| Vital4 | Name, DOB, nationality, entity name | screening_cases + snapshot | 5y post relationship | UAE / US partition |
| AiPrise | Company reg, directors, UBO | entity capture + graph JSON | 5y post relationship | UAE / US partition |
| Oscilar | Txn metadata, customer ref | feed_events + case_links | 5y post relationship | UAE / US partition |

**Cross-border:** No PII replication between UAE and US databases without explicit DPA and customer nexus rules.

---

## 8. AiPrise jurisdiction scope (Phase 3)

EG · PK · AE · TR · SG · MY · PH · MA · BD · ID

Out-of-scope jurisdictions → manual KYB queue + `uboStatus = complex_pending`.

---

## 9. Dual FIU routing

| Customer nexus | Filing channel | Template owner |
|----------------|----------------|----------------|
| UAE | goAML (UAE FIU) | Jana → MLRO |
| US BaaS | FinCEN BSA E-Filing | Jana → MLRO |
| Dual nexus | Both (separate drafts) | MLRO approves each |

---

## 10. Phase 0 exit checklist

- [x] Vendor RACI documented
- [x] Screening authority matrix locked (Vital4 sole writer)
- [x] Oscilar → Vital4 mirror rule documented
- [x] Webhook security spec
- [x] customerId / vendorSubjectId scheme
- [x] SLA matrix
- [x] Data map & dual-region residency
- [x] AiPrise jurisdiction list
- [x] Dual FIU path
- [x] Machine-readable config (`partnerIntegration.ts`)
- [ ] **MLRO signature** (required before production freeze)
- [ ] Vendor DPAs executed
- [ ] WAF IP allowlists configured (production)

**Phase 0 build status:** COMPLETE — proceed to Phase 1a.

---

## 11. MLRO ratification block

| Field | Value |
|-------|-------|
| Document | 19-PARTNER-INTEGRATION-PHASE0-SIGNOFF |
| Version | 1.0 |
| Date | _pending_ |
| MLRO name | _pending_ |
| Decision | ☐ Approved ☐ Approved with conditions ☐ Rejected |
| Conditions | _free text_ |
