/** Partner onboarding, DD checklist, and regulatory reporting schemas — shareable with vendors. */

export const REGISTER_KEYS = [
  "sar", "str", "fatca", "crs", "ofac_block", "arbp", "a314", "cbddq",
  "questionnaire", "cert", "audit", "correspondence", "corrective",
  "subpoena", "interdiction", "periodic_review", "ctr",
];

export function emptyRegisters() {
  return REGISTER_KEYS.reduce((o, k) => ({ ...o, [k]: [] }), {});
}

export function registerKeyForReport(typeId) {
  return REGISTER_KEYS.includes(typeId) ? typeId : "correspondence";
}

export function normalizeAgentSlice(slice) {
  if (!slice) return slice;
  const registers = { ...emptyRegisters(), ...(slice.registers || {}) };
  const dd = { ...(slice.dd || {}) };
  DD_ITEMS.forEach((d) => {
    if (!dd[d.id]) dd[d.id] = "Outstanding";
  });
  return { ...slice, registers, dd };
}

export function normalizeStore(store) {
  if (!store?.agents) return store;
  const agents = {};
  for (const [id, slice] of Object.entries(store.agents)) {
    agents[id] = normalizeAgentSlice(slice);
  }
  return { ...store, agents };
}

export const REPORT_TYPES = [
  { id: "sar", name: "SAR", reg: "FinCEN BSA E-Filing · notify Mal per contract" },
  { id: "str", name: "STR", reg: "goAML / local FIU · notify Mal per contract" },
  { id: "ctr", name: "CTR (US)", reg: "FinCEN Form 104 · BSA" },
  { id: "fatca", name: "FATCA report", reg: "IRS / IGA" },
  { id: "crs", name: "CRS report", reg: "OECD / local tax authority" },
  { id: "ofac_block", name: "OFAC blocking / rejection report", reg: "OFAC · 31 C.F.R. § 501.604" },
  { id: "interdiction", name: "Sanctions interdiction / freeze", reg: "OFAC / UN / UAE TFS · contract SLA" },
  { id: "arbp", name: "Annual Blocked Property Report (ARBP)", reg: "OFAC · 31 C.F.R. § 501.603" },
  { id: "a314", name: "314(a) response package", reg: "FinCEN · 31 C.F.R. § 1010.520" },
  { id: "subpoena", name: "Subpoena / legal process notification", reg: "Contractual · notify Mal ≤ 10 business days" },
  { id: "cbddq", name: "Wolfsberg CBDDQ submission", reg: "Wolfsberg Group V1.4" },
  { id: "questionnaire", name: "Regulatory questionnaire", reg: "Wolfsberg-style" },
  { id: "periodic_review", name: "Periodic compliance attestation", reg: "Vendor oversight · Mal Policy 0.4 / CBUAE outsourcing" },
  { id: "cert", name: "Annual compliance certification", reg: "Self-certification" },
  { id: "audit", name: "Audit finding & remediation", reg: "Independent audit" },
];

export const REPORT_FORM_SCHEMA = {
  sar: {
    extra: [
      { k: "filingInstitution", label: "Filing institution / FIU", required: true },
      { k: "suspiciousActivity", label: "Nature of suspicious activity", t: "area", required: true },
      { k: "amountInvolved", label: "Amount involved (if known)" },
      { k: "malNotifiedAt", label: "Date Mal was notified", t: "date", required: true },
    ],
  },
  str: {
    extra: [
      { k: "filingInstitution", label: "FIU / regulator", required: true },
      { k: "suspiciousActivity", label: "Nature of suspicious activity", t: "area", required: true },
      { k: "malNotifiedAt", label: "Date Mal was notified", t: "date", required: true },
    ],
  },
  ctr: {
    extra: [
      { k: "transactionDate", label: "Transaction date", t: "date", required: true },
      { k: "amount", label: "Cash amount (USD)", required: true },
      { k: "malNotifiedAt", label: "Date Mal was notified", t: "date" },
    ],
  },
  ofac_block: {
    extra: [
      { k: "listMatched", label: "List matched", t: "select", options: ["OFAC SDN", "OFAC other", "UN", "UAE TFS", "EU", "Other"], required: true },
      { k: "actionTaken", label: "Action taken", t: "select", options: ["Blocked", "Rejected", "Frozen"], required: true },
      { k: "relatedMalExposure", label: "Related to Mal programme / customers?", t: "yn", required: true },
    ],
  },
  interdiction: {
    extra: [
      { k: "listMatched", label: "List / authority", t: "select", options: ["OFAC SDN", "OFAC other", "UN", "UAE TFS", "EU", "Local TFS", "Other"], required: true },
      { k: "actionTaken", label: "Interdiction action", t: "select", options: ["Blocked", "Rejected", "Frozen", "Escalated to MLRO"], required: true },
      { k: "customerOrTxnRef", label: "Customer / transaction reference (if applicable)" },
      { k: "relatedMalExposure", label: "Related to Mal data, customers, or transactions?", t: "yn", required: true },
    ],
  },
  a314: {
    extra: [
      { k: "searchRef", label: "314(a) search reference", required: true },
      { k: "matchResult", label: "Match result", t: "select", options: ["No match", "Potential match", "Confirmed match"], required: true },
      { k: "responseDate", label: "Response submitted date", t: "date", required: true },
    ],
  },
  subpoena: {
    extra: [
      { k: "receivedDate", label: "Date received", t: "date", required: true },
      { k: "issuingAuthority", label: "Issuing authority / court", required: true },
      { k: "malDataScope", label: "Scope vs Mal", t: "select", options: ["Mal data only", "Mal customers", "Transactions", "Multiple / unclear"], required: true },
      { k: "responseDeadline", label: "Response deadline", t: "date", required: true },
      { k: "legalCounselEngaged", label: "Legal counsel engaged?", t: "yn", required: true },
    ],
  },
  periodic_review: {
    extra: [
      { k: "reviewPeriod", label: "Review period covered (e.g. Q1 2026)", required: true },
      { k: "programmeChanges", label: "Material programme changes since last attestation?", t: "yn", required: true },
      { k: "strCount", label: "STR/SAR count in period" },
      { k: "sanctionsBlocks", label: "Sanctions blocks / interdictions in period" },
      { k: "subpoenaCount", label: "Subpoenas / legal process received in period" },
      { k: "attestation", label: "Programme remains effective for Mal-facing activity", t: "yn", required: true },
    ],
  },
  cert: {
    extra: [
      { k: "certYear", label: "Certification year", required: true },
      { k: "signatory", label: "Signatory name / title", required: true },
      { k: "exceptions", label: "Exceptions or qualifications (if any)", t: "area" },
    ],
  },
  audit: {
    extra: [
      { k: "auditor", label: "Independent auditor", required: true },
      { k: "findingRef", label: "Finding reference", required: true },
      { k: "severity", label: "Severity", t: "select", options: ["Critical", "High", "Medium", "Low"], required: true },
      { k: "remediationDue", label: "Remediation due date", t: "date" },
    ],
  },
};

export function reportFormReady(typeId, values) {
  if (!values.summary?.trim()) return false;
  const schema = REPORT_FORM_SCHEMA[typeId];
  if (!schema?.extra) return true;
  return schema.extra.filter((f) => f.required).every((f) => {
    const val = values[f.k];
    return val != null && String(val).trim() !== "";
  });
}

export function buildReportSummary(typeId, values) {
  const parts = [values.summary?.trim()].filter(Boolean);
  const schema = REPORT_FORM_SCHEMA[typeId];
  if (schema?.extra) {
    schema.extra.slice(0, 3).forEach((f) => {
      const val = values[f.k];
      if (val) parts.push(`${f.label}: ${val === "Y" ? "Yes" : val === "N" ? "No" : val}`);
    });
  }
  if (values.subject?.trim()) parts.unshift(values.subject.trim());
  return parts.join(" · ");
}

export const DD_ITEMS = [
  { id: "onboarding", label: "Onboarding due diligence" },
  { id: "edd", label: "Enhanced due diligence review" },
  { id: "periodic", label: "Periodic review" },
  { id: "site", label: "Site-visit report" },
  { id: "interview", label: "Interview records" },
  { id: "ra", label: "Risk assessment" },
  { id: "quest", label: "Compliance questionnaire" },
  { id: "licence", label: "Regulatory licences" },
  { id: "corp", label: "Corporate documents" },
  { id: "ubo", label: "Beneficial-ownership records" },
  { id: "amlProgram", label: "AML/CFT/BSA programme document" },
  { id: "tmProgram", label: "Transaction monitoring programme" },
  { id: "strSarPlaybook", label: "STR/SAR escalation playbook (redacted sample acceptable)" },
  { id: "subpoenaPlaybook", label: "Subpoena / legal process response procedure" },
  { id: "sanctionsInterdiction", label: "Sanctions interdiction & freeze procedures / sample log" },
  { id: "periodicReviewReport", label: "Last periodic compliance / programme review report" },
];

export const REG_DEF = [
  { k: "sar", t: "SAR register" },
  { k: "str", t: "STR register" },
  { k: "ctr", t: "CTR register" },
  { k: "fatca", t: "FATCA register" },
  { k: "crs", t: "CRS register" },
  { k: "ofac_block", t: "OFAC blocking reports" },
  { k: "interdiction", t: "Sanctions interdiction / freeze log" },
  { k: "arbp", t: "ARBP register" },
  { k: "a314", t: "314(a) responses" },
  { k: "subpoena", t: "Subpoena / legal process notifications" },
  { k: "cbddq", t: "CBDDQ submissions" },
  { k: "periodic_review", t: "Periodic compliance attestations" },
  { k: "cert", t: "Certifications" },
  { k: "audit", t: "Audit findings" },
  { k: "correspondence", t: "Regulatory correspondence" },
  { k: "corrective", t: "Corrective actions" },
];

export const PARTNER_DD_PACK = {
  title: "Partner due-diligence & monitoring pack",
  summary: "Shareable intake covering entity verification, MLRO contacts, STR/SAR capability, sanctions interdiction, subpoena notification, and periodic programme review — aligned to Mal Vendor Oversight Policy 0.4 and contractual SLAs.",
  monitoringRegisters: ["STR/SAR", "CTR", "OFAC block & interdiction", "314(a)", "Subpoena / legal process", "Periodic attestation", "CBDDQ & certifications"],
  slaHighlights: [
    "Notify Mal within 10 business days of subpoenas, levies, or information requests affecting Mal data or customers",
    "Report OFAC blocks and sanctions interdictions per contract (typically within 24–72 hours)",
    "File STR/SAR with home regulator and notify Mal per programme schedule",
    "Submit periodic compliance attestation at agreed cadence (typically annual or risk-based)",
  ],
};

const COMMON_LIGHT = [
  { title: "About your business", why: "So we can identify you and confirm you exist on the public register. This is all we need to get started.", fields: [
    { k: "entityName", label: "Legal entity name", t: "text", required: true },
    { k: "country", label: "Country of incorporation", t: "text", required: true },
    { k: "regNumber", label: "Company / registration number", t: "text", required: true },
    { k: "website", label: "Website", t: "text" },
    { k: "jurisdictions", label: "Markets / corridors you serve (comma-separated)", t: "text", required: true },
    { k: "products", label: "What you do for Mal (one line)", t: "text" },
    { k: "fatfStatus", label: "Do any corridors you serve appear on the FATF grey or black list? (31 C.F.R. § 1022.210 — risk-based approach)", t: "yn", required: true },
  ]},
  { title: "Who we contact", why: "So reviews, STR coordination, and legal-process notices reach the right person.", fields: [
    { k: "coName", label: "Compliance contact name", t: "text", required: true },
    { k: "coEmail", label: "Compliance contact email", t: "text", required: true },
    { k: "mlroName", label: "MLRO / BSA Officer name", t: "text", required: true },
    { k: "mlroEmail", label: "MLRO contact email", t: "text", required: true },
    { k: "legalProcessContact", label: "Legal process / subpoena contact (if different)", t: "text" },
  ]},
  { title: "Licensing", why: "We confirm this directly with the regulator — you don't need to attach anything yet.", fields: [
    { k: "regulator", label: "Primary regulator", t: "text" },
    { k: "licenceNumber", label: "Licence / registration number", t: "text" },
    { k: "fincenMSB", label: "FinCEN MSB registration number (if applicable — 31 C.F.R. § 1022.380)", t: "text" },
  ]},
  { title: "Owners & directors", why: "We verify ownership independently. Just tell us who you know — a tap, not paperwork.", fields: [
    { k: "ubos", label: "Beneficial owners / directors", t: "list", cols: [{ k: "name", label: "Name" }, { k: "role", label: "Role / %" }, { k: "nationality", label: "Nationality" }] },
    { k: "pep", label: "Are any owners or directors a politically exposed person (PEP)?", t: "yn", required: true },
    { k: "pepCustomers", label: "Does your business onboard politically exposed persons (PEPs) as customers? (Wolfsberg PEP Guidance 2017)", t: "yn", required: true },
  ]},
  { title: "Anything we should know", why: "It always lands better coming from you. We check public records either way, so a heads-up keeps us aligned.", fields: [
    { k: "priorIssues", label: "Any past regulatory action, enforcement, or material litigation?", t: "yn", required: true },
    { k: "priorNotes", label: "If yes, a short note (optional)", t: "area" },
  ]},
  { title: "Existing documents (optional)", why: "If you already hold these, share a link and we won't ask twice — we accept what you have.", fields: [
    { k: "artefacts", label: "Links to licences, audited financials, SOC 2, Wolfsberg CBDDQ, STR/SAR playbook, or subpoena response procedure", t: "area" },
  ]},
  { title: "Regulatory reporting & legal process", why: "Mal must align with your STR/SAR filing, sanctions interdiction, and legal-process notification — required for vendor oversight and periodic programme review.", fields: [
    { k: "strCapability", label: "You can file STR/SAR with your home regulator within required SLAs and notify Mal per contract", t: "yn", required: true },
    { k: "ctrCapability", label: "You can file US CTR where applicable to your programme", t: "yn" },
    { k: "subpoenaNotifyAttest", label: "You will notify Mal within 10 business days of any subpoena, levy, garnishment, or information request affecting Mal data or customers", t: "yn", required: true },
    { k: "interdictionAttest", label: "You maintain documented sanctions interdiction / freeze procedures (OFAC, UN, UAE TFS) and will report blocks to Mal per contract", t: "yn", required: true },
    { k: "a314Capable", label: "You can respond to FinCEN 314(a) searches if applicable to your US nexus", t: "yn" },
  ]},
  { title: "Ongoing oversight & programme review", why: "Supports Mal third-party risk monitoring and CBUAE outsourcing periodic review cadence.", fields: [
    { k: "periodicReviewCadence", label: "Your standard partner/vendor periodic review cycle", t: "select", options: ["Every 6 months", "Annual", "Every 24 months", "Risk-based / ad hoc"], required: true },
    { k: "lastProgrammeReview", label: "Date of your last AML/CFT programme review (if any)", t: "date" },
    { k: "lastIndependentAudit", label: "Date of last independent AML/BSA audit (if any)", t: "date" },
  ]},
  { title: "Our shared commitments", why: "These are the same commitments our own banks require of us. Agreeing up front is what keeps us aligned and the regulators comfortable.", fields: [
    { k: "sanctionsAttest", label: "You and your owners are not sanctioned, and you screen against OFAC SDN and applicable sanctions lists", t: "yn", required: true },
    { k: "amlAttest", label: "You maintain an AML/CFT/CPF programme appropriate to your activity and risk profile", t: "yn", required: true },
    { k: "prohibitedAttest", label: "None of your services, customers, or partners fall within Mal's prohibited categories (MAL-CMP-AML-01 §8)", t: "yn", required: true },
    { k: "boiAttest", label: "Beneficial ownership information is accurate and will be updated within 30 days of any change (AML Act 2020 / Corporate Transparency Act)", t: "yn", required: true },
    { k: "travelRuleAttest", label: "You support Travel Rule data transmission for transfers ≥ $3,000 (31 C.F.R. § 1010.410(f) / FATF R.16)", t: "yn", required: true },
    { k: "notifyAttest", label: "You'll tell Mal promptly of any change in ownership, licence, sanctions status, or a security incident", t: "yn", required: true },
    { k: "consent", label: "You authorise Mal to verify these details and screen you (registries, sanctions, adverse media)", t: "yn", required: true },
  ]},
];

const CATEGORY_LIGHT = {
  "Payout partners": [{ title: "Payout — quick check", why: "Payouts must reach beneficiaries only through authorised channels.", fields: [
    { k: "corridors", label: "Payout corridors", t: "text" },
    { k: "deliveryChannel", label: "How do you onboard customers? (Wolfsberg Digital Customer Lifecycle 2023)", t: "select", options: ["Fully digital (non-face-to-face)", "Face-to-face", "Hybrid"] },
    { k: "ivtsAttest", label: "You settle only through authorised channels — no hawala / hundi / IVTS", t: "yn", required: true },
    { k: "stablecoinAttest", label: "Any stablecoin settlement uses only GENIUS Act-compliant issuers (Pub.L. 119-27, July 2025) — or N/A if no stablecoin activity", t: "yn", required: true },
  ]}],
  "Banking partner": [{ title: "Banking — quick check", why: "Confirms the licence type behind the rails you provide.", fields: [
    { k: "charterType", label: "Charter / licence type", t: "text" },
    { k: "travelRuleCapable", label: "Your rails support Travel Rule data transmission for covered transfers (FATF R.16 / 31 C.F.R. § 1010.410(f))", t: "yn", required: true },
  ]}],
  "Card & settlement": [{ title: "Card & settlement — quick check", why: "Identifies the scheme rules that apply to the programme.", fields: [
    { k: "scheme", label: "Card scheme(s)", t: "text" },
    { k: "visaRulesAttest", label: "You agree to operate within applicable card scheme rules (Visa Core Rules / Mastercard Standards)", t: "yn", required: true },
  ]}],
  "Technology & processors": [{ title: "Technology — quick check", why: "We treat processors as never-CDD-reliance and validate your controls ourselves.", fields: [
    { k: "serviceType", label: "Service type", t: "select", options: ["Screening / KYT", "Core ledger", "Identity verification", "Other"] },
    { k: "dataResidency", label: "Data residency / primary hosting jurisdiction", t: "text" },
  ]}],
  "KYC & identity": [{ title: "KYC & identity — quick check", why: "Processor output is never relied on as customer due diligence — Mal validates independently.", fields: [
    { k: "serviceType", label: "Verification services offered", t: "select", options: ["Document verification", "Face / liveness", "OCR", "Other"] },
    { k: "dataResidency", label: "Data residency / primary hosting jurisdiction", t: "text" },
  ]}],
  "Risk platform": [{ title: "Risk platform — quick check", why: "Confirms fraud / device intelligence scope and integration model.", fields: [
    { k: "modules", label: "Modules in scope (device intel, case mgmt, SAR, etc.)", t: "text" },
    { k: "dataResidency", label: "Data residency / primary hosting jurisdiction", t: "text" },
  ]}],
  "System integrator": [{ title: "System integrator — quick check", why: "TM and screening integrations require documented go-live gates before production traffic.", fields: [
    { k: "integrationScope", label: "Integration scope (TM, screening, core, API)", t: "text", required: true },
    { k: "goLiveGatesAttest", label: "You will complete Mal TM pre-implementation assessment and BRD go-live gates before production", t: "yn", required: true },
  ]}],
  "Virtual accounts": [{ title: "Virtual accounts — quick check", why: "Confirms virtual-account rails and settlement model.", fields: [
    { k: "currency", label: "Account currencies offered", t: "text" },
    { k: "settlementModel", label: "Settlement / safeguarding model", t: "text" },
  ]}],
  "Lending": [{ title: "Lending — quick check", why: "Confirms lending product type and regulatory perimeter.", fields: [
    { k: "productType", label: "Lending product type", t: "text" },
    { k: "regulator", label: "Primary regulator", t: "text" },
  ]}],
};

export function schemaFor(category) {
  return [...COMMON_LIGHT, ...(CATEGORY_LIGHT[category] || [])];
}

export function exportPartnerSchemaPack(category) {
  return {
    version: "1.0",
    generatedAt: new Date().toISOString(),
    category: category || "All categories",
    pack: PARTNER_DD_PACK,
    intakeSections: schemaFor(category),
    ddChecklist: DD_ITEMS,
    reportingTypes: REPORT_TYPES,
    monitoringRegisters: REG_DEF.map((r) => r.t),
  };
}

export function downloadPartnerSchemaPack(category) {
  const payload = exportPartnerSchemaPack(category);
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Mal_Partner_DD_Pack_${(category || "all").replace(/\s+/g, "_")}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
