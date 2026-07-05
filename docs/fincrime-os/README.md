# FinCrime OS — compliance documentation index

Perimeter-first governance docs for **Global Account** (MSB/BaaS) and **MAL Bank** (CBUAE).

## Navigation

| Path | Purpose |
|------|---------|
| [01_perimeters/global-account/](01_perimeters/global-account/README.md) | Zenus/Rain/SwiftX · FinCEN · US MSB |
| [01_perimeters/mal-bank/](01_perimeters/mal-bank/README.md) | CBUAE rulebook · goAML · exam readiness |
| [02_shared/](02_shared/README.md) | Glossary, taxonomies, data dictionaries |
| [../mal-tpro-frontend/cram-app/docs/](../mal-tpro-frontend/cram-app/docs/) | Product runbooks (CRAM, corridor EWRA, TM) |

## Conventions

1. Update `CHANGELOG.md` at repo root for any policy or config change.
2. Templates live once — under `templates/` or perimeter `reporting/templates/`, never duplicated.
3. No PII in GitHub — `evidence/` holds pointers only.
4. Perimeter in file path, not title alone.

## Minimum viable documents (each perimeter)

- [ ] `obligations-register.md`
- [ ] `slas-escalations.md`
- [ ] `controls-matrix.md`
- [ ] `evidence-standards.md`
- [ ] `tipping-off-comms.md` (required for MAL Bank)
- [ ] `sanctions-screening.md`
- [ ] `transaction-monitoring.md`
- [ ] `record-retention.md`
- [ ] Reporting templates for that perimeter

## Machine configs (planned)

YAML under `configs/global-account/` and `configs/mal-bank/` — thresholds, TM rules, don't-say matrix. Not yet populated; dashboard reads live API where available.
