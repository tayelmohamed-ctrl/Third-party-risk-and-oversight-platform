import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Card, AiTag } from "../components/ui";
import {
  type AssessmentCapture, type KycQualityContext, scoreWithDataQualityGate,
} from "../engine/dataQualityGate";
import type { Boundary, PepStatus, Score, ScreenResult, AdverseResult, CustomerLegalForm, UboVerificationStatus } from "../engine/types";
import { MONTHLY_BAND_LABEL, MONTHLY_BAND_LABEL_USD } from "../engine/activityProfile";
import { COUNTRIES, lookupCountry } from "../engine/data";
import { activityDropdownGroupsForPerimeter, professionGroupsForEmployment } from "../config/activityRegisterOptions";
import { buildAssessment } from "../engine/rerating";
import { addAssessment } from "../store/assessmentStore";
import { getPlatformUserId, setPlatformUser } from "../lib/authSession";
import { PLATFORM_USERS, canOverride as checkCanOverride, PLATFORM_USER_BY_ID, type PlatformUserId } from "../config/platformUsers";
import { apiPartnerSync, apiStartOnboarding, apiSimulateOscilarAlert, isApiAvailable } from "../lib/api";
import {
  CFG, CONTROL_LABELS, CONTROL_OPTIONS, SEGMENT_OPTIONS, OWNERSHIP_LAYERS,
  entityTypeToLegalForm, ENTITY_LEGAL_TYPE_GROUPS, entityLegalTypeSummary, type ControlInputs, type ControlKey, type CustomerMode,
} from "../engine/cramSuiteConfig";
import { DELIVERY_CHANNELS, INITIATION_CHANNELS } from "../config/channelRisk";
import { BEHAVIOUR_STATUSES, suggestBehaviourStatus } from "../config/behaviourGate";
import { computeGoldenThread, handoffSignature } from "../engine/goldenThread";
import { buildRiskAssessmentSummary } from "../engine/riskExplainability";
import {
  isProfessionCompatibleWithEmployment,
  suggestedActivitiesForProfession,
} from "../engine/professionRiskIntelligence";
import HandoffPanel, { type HandoffOps } from "../components/cramSuite/HandoffPanel";
import KybChecklistPanel, { KybChecklistEmpty } from "../components/cram/KybChecklistPanel";
import { inferKybProductsFromProductName } from "../config/kybDocumentMatrix";
import type { KybCaseContext } from "../lib/kybChecklistBuilder";
import RiskSummaryPanel from "../components/cramSuite/RiskSummaryPanel";
import RiskVisualizationDashboard from "../components/cramSuite/RiskVisualizationDashboard";
import RbmScoreBreakdown from "../components/rbm/RbmScoreBreakdown";
import { usePerimeter } from "../context/PerimeterContext";
import { CRAM_METHODOLOGY_US, CRAM_METHODOLOGY_UAE } from "../lib/cramMethodologyExport";
import { scoreCaptureWithRbm } from "../lib/cramRbmBridge";
import { corridorFilterToRegistryId } from "../lib/rbmCorridorMap";
import { allUseCases, defaultProductNameForPerimeter, nraSourceForPerimeter, perimeterLabel, productNamesForPerimeter, registryMeta } from "../registries/master/registryService";
import { nraRegistryForPerimeter } from "../registries/nraRegistry";
import CorporateStructureDiagram from "../components/cramSuite/CorporateStructureDiagram";
import CramMethodologyPanel from "../components/cramSuite/CramMethodologyPanel";
import TestBenchDecisionBox, { type RecordedBenchDecision } from "../components/cramSuite/TestBenchDecisionBox";
import OverrideRiskAcceptancePanel from "../components/cramSuite/OverrideRiskAcceptancePanel";
import { buildDecisionFrame } from "../lib/cramDecisionFrame";
import {
  CramGamifiedShell, GamifiedSec, DriverChip, ControlStars,
  sectionScoreBadge, controlsScoreBadge,
} from "../components/cramSuite/CramGamifiedLayout";
import {
  computeRiskConfidence,
  computeTrendDelta,
  approverFromGt,
} from "../components/cramSuite/CramWorkspaceSections";
import type { EntityStructureInput } from "../engine/corporateStructureGraph";

function AssessmentContextBanner({ perimeter, registryVersion, nraSource }: { perimeter: string; registryVersion: string; nraSource: string }) {
  const isUs = perimeter === "global_account";
  return (
    <div className="aml-context-banner">
      <div className="aml-context-banner__item">
        <span className="aml-context-banner__label">License</span>
        <span className="aml-context-banner__value">{isUs ? "US Global Account" : "Mal Bank UAE"}</span>
      </div>
      <div className="aml-context-banner__sep" />
      <div className="aml-context-banner__item">
        <span className="aml-context-banner__label">Methodology</span>
        <span className="aml-context-banner__value">RBM Composite · {registryVersion}</span>
      </div>
      <div className="aml-context-banner__sep" />
      <div className="aml-context-banner__item">
        <span className="aml-context-banner__label">Scoring inputs</span>
        <span className="aml-context-banner__value">Identity · Geography · Activity · Product · Use Case · Corridor · Screening</span>
      </div>
      <div className="aml-context-banner__sep" />
      <div className="aml-context-banner__item">
        <span className="aml-context-banner__label">Rules</span>
        <span className="aml-context-banner__value">{isUs ? "US BSA/AML · FinCEN/OFAC · " : "UAE AML/CFT · CBUAE · "}{nraSource}</span>
      </div>
    </div>
  );
}

const EMP_IND = [["Salaried employee", 1], ["Pensioner", 1], ["Student", 1], ["Self-employed", 2], ["Freelancer / consultant", 2], ["Business owner", 2], ["Unemployed (with activity)", 3]] as const;
const EMP_ENT = [["Director / signatory", 1], ["Authorised manager", 2], ["Controlling person", 2], ["Not applicable", 1]] as const;
// State stores the employment LABEL (unique) so the dropdown can display the exact selection;
// several labels share a risk score, so keying the <option> by score would collapse the display.
// Scoring only ever reads the numeric score, resolved here from the label.
const EMP_SCORE_BY_LABEL: Record<string, number> = Object.fromEntries([...EMP_IND, ...EMP_ENT].map(([label, score]) => [label, score]));
function empScoreFor(label: string): number { return EMP_SCORE_BY_LABEL[label] ?? 1; }
const SVC = [["Standard domestic", 1], ["Cross-border", 2], ["Third-party / beneficiary payments", 2], ["Trade finance", 3], ["Correspondent / nested", 3], ["Crypto / VA off-ramp", 3]] as const;
const INV_STR = [["None / clear", 1], ["Under review", 2], ["Confirmed / filed", 3]] as const;
const EVENTS = ["Onboarding", "Periodic review", "Trigger event", "Manual rerating"] as const;
type BenchView = "workbench" | "methodology";

const DEFAULT_CONTROLS: ControlInputs = { cdd: 2, sow: 2, mon: 2, scr: 2, edd: 1, ovs: 2 };

export default function CramRiskTestBench() {
  const [mode, setMode] = useState<CustomerMode>("individual");
  const [benchView, setBenchView] = useState<BenchView>("workbench");
  const [boundary, setBoundary] = useState<Boundary>("calculator");
  const [controls, setControls] = useState<ControlInputs>(DEFAULT_CONTROLS);
  const [ops, setOps] = useState<HandoffOps>({ checks: {}, approved: false, approvedBy: "", approvedAt: "", deployed: false, deployedAt: "" });
  const [approverInput, setApproverInput] = useState("");
  const [sig, setSig] = useState("");
  const [poaOnFile, setPoaOnFile] = useState(true);
  const [deviceIpCaptured, setDeviceIpCaptured] = useState(false);
  const [benchDecision, setBenchDecision] = useState<RecordedBenchDecision | null>(null);
  const { perimeter, corridor } = usePerimeter();

  useEffect(() => {
    const prod = defaultProductNameForPerimeter(perimeter);
    setF((s) => ({
      ...s,
      prod,
      useCaseId: perimeter === "global_account" ? "operating_expenses" : "operating_expenses",
      ...(perimeter === "global_account"
        ? {
          cres: "United States of America", nat: "United States of America", cbirth: "United States of America",
          sow: "United States of America", sof: "United States of America",
          opco: "United States of America", incco: "United States of America", uboco: "United States of America",
        }
        : {
          cres: "United Arab Emirates", nat: "India", cbirth: "India",
          sow: "United Arab Emirates", sof: "Germany",
          opco: "United Arab Emirates", incco: "United Arab Emirates", uboco: "United Arab Emirates",
        }),
    }));
    setKyc((k) => ({
      ...k,
      identitySource: perimeter === "global_account" ? "document" : "emirates_id",
    }));
  }, [perimeter]);

  const [f, setF] = useState({
    name: "Omar Khalid", id: "ACT00005", rel: "Existing", event: "Periodic review",
    seg: "HNW", expected: "2", actual: "3", pep: "None" as PepStatus,
    legalForm: "natural" as CustomerLegalForm, ubo: "na" as UboVerificationStatus, uboLayers: "1",
    entityType: "Limited Liability Company (LLC)", ownership: "Direct — 1 layer",
    cres: "United Arab Emirates", cbirth: "India", nat: "India", sow: "United Arab Emirates", sof: "Germany",
    opco: "United Arab Emirates", incco: "United Arab Emirates", uboco: "United Arab Emirates",
    scrS: "Clear" as ScreenResult, scrW: "Clear", scrA: "None" as AdverseResult,
    emp: "Self-employed",
    activity: "Information technology (including manufacturing, trade and repair of computers, peripheral equipment and software)",
    profession: "Computer Engineer",
    isicCode: "",
    prod: "",
    useCaseId: "operating_expenses",
    svc: "2", initChan: "1", delChan: "2", behaviour: "moderately_above", inv: "1", str: "1", mo: "" as "" | "Low" | "Medium" | "High", moJust: "",
    simulateIncomplete: false,
  });

  const [kyc, setKyc] = useState<KycQualityContext>(() => {
    const now = new Date();
    const refresh = new Date(now);
    refresh.setMonth(refresh.getMonth() - 6);
    const issued = new Date(now);
    issued.setFullYear(issued.getFullYear() - 2);
    return {
      identitySource: "emirates_id",
      identityVerified: true,
      documentIssuedAt: issued.toISOString().slice(0, 10),
      lastKycRefreshAt: refresh.toISOString().slice(0, 10),
      screeningCompletedAt: now.toISOString(),
      livenessPass: true,
    };
  });
  const setKycField = <K extends keyof KycQualityContext>(k: K, v: KycQualityContext[K]) =>
    setKyc((s) => ({ ...s, [k]: v }));

  const [persona, setPersonaState] = useState<PlatformUserId>(() => getPlatformUserId());
  const canOverride = useMemo(() => checkCanOverride(PLATFORM_USER_BY_ID[persona]), [persona]);
  const set = (k: string, v: string) => setF((s) => ({ ...s, [k]: v }));
  const setRel = (v: string) => setF((s) => ({
    ...s,
    rel: v,
    ...(v === "New" ? { inv: "1", str: "1" } : {}),
  }));
  const setCtrl = (k: ControlKey, v: number) => setControls((c) => ({ ...c, [k]: v as ControlInputs[ControlKey] }));

  function switchMode(m: CustomerMode) {
    setMode(m);
    setF((s) => {
      const next = { ...s };
      if (m === "individual") {
        next.legalForm = "natural";
        next.ubo = "na";
        next.uboLayers = "1";
        if (!EMP_IND.some((e) => e[0] === s.emp)) next.emp = "Self-employed";
        if (!SEGMENT_OPTIONS.individual.includes(s.seg)) next.seg = "Retail";
      } else {
        next.legalForm = entityTypeToLegalForm(s.entityType);
        next.ubo = s.ubo === "na" ? "verified" : s.ubo;
        next.uboLayers = OWNERSHIP_LAYERS[s.ownership] ?? "1";
        next.emp = "Director / signatory";
        if (!SEGMENT_OPTIONS.entity.includes(s.seg)) next.seg = "SME";
      }
      return next;
    });
  }

  function setOwnership(v: string) {
    setF((s) => ({
      ...s,
      ownership: v,
      uboLayers: OWNERSHIP_LAYERS[v] ?? "1",
      ubo: v === "Nominee / opaque"
        ? "complex_pending"
        : (s.ubo === "refused" ? "refused" : "verified"),
    }));
  }

  function setEntityType(v: string) {
    setF((s) => ({ ...s, entityType: v, legalForm: entityTypeToLegalForm(v) }));
  }

  function setEmployment(v: string) {
    setF((s) => {
      const empScore = empScoreFor(v);
      let profession = s.profession;
      if (profession && !isProfessionCompatibleWithEmployment(profession, empScore)) {
        profession = "";
      }
      return { ...s, emp: v, profession };
    });
  }

  function setProfession(v: string) {
    setF((s) => {
      const next = { ...s, profession: v };
      const suggested = suggestedActivitiesForProfession(v);
      if (empScoreFor(s.emp) >= 2 && suggested.length > 0 && !suggested.includes(s.activity)) {
        next.activity = suggested[0];
      }
      return next;
    });
  }

  const professionGroups = useMemo(
    () => professionGroupsForEmployment(empScoreFor(f.emp)),
    [f.emp],
  );
  const activityGroups = useMemo(
    () => activityDropdownGroupsForPerimeter(perimeter),
    [perimeter],
  );
  const countryOptions = useMemo(
    () => [...COUNTRIES].sort((a, b) => a.country.localeCompare(b.country)).map((c) => c.country),
    [],
  );
  const productOptions = useMemo(() => productNamesForPerimeter(perimeter), [perimeter]);
  const isNewCustomer = f.rel === "New";
  const professionMismatch = mode === "individual" && f.profession
    && !isProfessionCompatibleWithEmployment(f.profession, empScoreFor(f.emp));
  const entityMeta = mode === "entity" ? entityLegalTypeSummary(f.entityType) : null;

  const segmentOpts = SEGMENT_OPTIONS[mode];
  const empOpts = mode === "individual" ? EMP_IND : EMP_ENT;
  const bandLabel = perimeter === "global_account" ? MONTHLY_BAND_LABEL_USD : MONTHLY_BAND_LABEL;
  // Identity source options are perimeter-scoped — uae_pass / emirates_id are UAE-only digital IDs.
  const identitySourceOpts = perimeter === "global_account"
    ? ["document", "idsp", "branch"]
    : ["uae_pass", "emirates_id", "idsp", "document", "branch"];

  const suggestedBehaviour = useMemo(
    () => suggestBehaviourStatus(+f.expected as Score, +f.actual as Score, f.rel === "New" ? "New" : "Existing"),
    [f.expected, f.actual, f.rel],
  );
  const behaviourMismatch = f.behaviour !== suggestedBehaviour;

  const capture = useMemo<AssessmentCapture>(() => ({
    customerId: f.simulateIncomplete ? "" : f.id,
    customerName: f.name,
    segment: f.seg,
    lifecycle: f.rel === "Existing" ? "Existing" : "New",
    mode,
    compliancePerimeter: perimeter,
    useCaseId: f.useCaseId,
    corridorId: corridor !== "all" ? corridorFilterToRegistryId(perimeter, corridor) : undefined,
    residenceCountry: f.cres,
    nationalityCountry: f.nat,
    birthCountry: f.cbirth,
    sowCountry: f.sow,
    sofCountry: f.sof,
    opcoCountry: f.opco,
    incorpCountry: f.incco,
    uboCountry: f.uboco,
    activity: f.activity,
    profession: mode === "individual" ? f.profession : "",
    providedIsicCode: f.isicCode,
    product: f.prod,
    pep: f.pep,
    expectedMonthlyBand: f.simulateIncomplete ? "" : f.expected,
    actualMonthlyBand: f.actual,
    legalForm: f.legalForm,
    uboStatus: f.ubo,
    uboLayers: f.uboLayers,
    employment: String(empScoreFor(f.emp)),
    service: f.svc,
    initChannel: f.initChan,
    deliveryChannel: f.delChan,
    behaviour: f.behaviour,
    investigations: isNewCustomer ? "1" : f.inv,
    strs: isNewCustomer ? "1" : f.str,
    sanctions: f.scrS,
    watchlist: f.scrW as "Clear" | "True Match",
    adverse: f.scrA,
    entityType: f.entityType,
    manualOverride: f.mo,
  }), [f, mode, perimeter, corridor, isNewCustomer]);

  const gated = useMemo(() => scoreWithDataQualityGate(capture, kyc, boundary), [capture, kyc, boundary]);
  const dq = gated.verdict;
  const input = gated.ready ? gated.input : null;
  const result = gated.ready ? gated.result : null;
  const labels = useMemo(() => {
    const o = {} as Record<ControlKey, string>;
    (Object.keys(CONTROL_LABELS) as ControlKey[]).forEach((k) => { o[k] = CONTROL_LABELS[k][mode]; });
    return o;
  }, [mode]);

  const gt = useMemo(
    () => (input && result ? computeGoldenThread(mode, input, result, controls, labels, new Date()) : null),
    [mode, input, result, controls, labels],
  );

  const riskSummary = useMemo(
    () => (input && result && gt ? buildRiskAssessmentSummary(mode, input, result, gt) : null),
    [mode, input, result, gt],
  );

  const rbmAssessment = useMemo(
    () => (gated.ready ? scoreCaptureWithRbm(capture, perimeter, corridor, f.useCaseId) : null),
    [gated.ready, capture, perimeter, corridor, f.useCaseId],
  );

  const nraRegistry = useMemo(() => nraRegistryForPerimeter(perimeter), [perimeter]);

  const decisionFrame = useMemo(
    () => buildDecisionFrame(capture, kyc, dq, gt, riskSummary, { poaOnFile, deviceIpCaptured }, {
      manualOverride: f.mo,
      overrideJustification: f.moJust,
      approvedBy: ops.approvedBy,
      approvedAt: ops.approvedAt,
    }),
    [capture, kyc, dq, gt, riskSummary, poaOnFile, deviceIpCaptured, f.mo, f.moJust, ops.approvedBy, ops.approvedAt],
  );

  const evidenceCompletenessPct = useMemo(() => {
    const required = decisionFrame.evidenceItems.filter((i) => i.requiredForApprove);
    if (!required.length) return 100;
    const complete = required.filter((i) => i.status === "complete").length;
    return Math.round((complete / required.length) * 100);
  }, [decisionFrame]);

  const riskConfidencePct = useMemo(
    () => computeRiskConfidence(
      evidenceCompletenessPct,
      dq.status === "READY",
      f.scrS === "Clear" && f.scrW === "Clear",
      gated.ready && !!result,
    ),
    [evidenceCompletenessPct, dq.status, f.scrS, f.scrW, gated.ready, result],
  );

  const trendDelta = useMemo(
    () => computeTrendDelta(result, +f.expected),
    [result, f.expected],
  );

  const kybContext = useMemo<KybCaseContext | null>(() => {
    if (mode !== "entity" || !gated.ready || !gt || !result) return null;
    const products = inferKybProductsFromProductName(f.prod);
    return {
      caseRef: `ONB-${new Date().getFullYear()}-${f.id.slice(-4)}`,
      customerName: f.name,
      customerId: f.id,
      entityType: f.entityType,
      segment: f.seg,
      products: products.length ? products : ["uae_iban"],
      cramRating: String(result.finalRating),
      inherentScore: gt.inherentScore,
      residualScore: gt.residual.residualScore,
      ddLevel: gt.dueDiligence,
      reviewMonths: gt.reviewMonths ?? 36,
      eddRequired: gt.eddRequired,
      uboLayers: +f.uboLayers,
      hasFinancingFacility: products.includes("financing"),
    };
  }, [mode, gated.ready, gt, result, f]);

  const entityStructureInput = useMemo<EntityStructureInput | null>(() => {
    if (mode !== "entity") return null;
    return {
      customerId: f.id,
      customerName: f.name,
      entityType: f.entityType,
      segment: f.seg,
      lifecycle: f.rel === "Existing" ? "Existing" : "New",
      ownership: f.ownership,
      uboStatus: f.ubo,
      uboCountry: f.uboco,
      incorpCountry: f.incco,
      opcoCountry: f.opco,
      pep: f.pep,
      sanctions: f.scrS,
      watchlist: f.scrW as "Clear" | "True Match",
      adverse: f.scrA,
      kyc,
      lastReviewDate: gt?.nextReviewDate ?? null,
    };
  }, [mode, f, kyc, gt?.nextReviewDate]);

  useEffect(() => {
    if (!gt) return;
    const nextSig = handoffSignature(gt);
    if (nextSig !== sig) {
      setSig(nextSig);
      setOps({ checks: {}, approved: false, approvedBy: "", approvedAt: "", deployed: false, deployedAt: "" });
    }
  }, [gt, sig]);

  const [saved, setSaved] = useState("");
  const [saveErr, setSaveErr] = useState(false);
  const [partnerMsg, setPartnerMsg] = useState("");
  const [apiLive, setApiLive] = useState(false);

  useEffect(() => {
    isApiAvailable().then(setApiLive).catch(() => setApiLive(false));
  }, []);

  async function syncFromPartners() {
    setPartnerMsg("");
    if (!f.id) {
      setPartnerMsg("Customer ID required for partner sync");
      return;
    }
    try {
      const sync = await apiPartnerSync(f.id);
      if (sync.kyc) setKyc(sync.kyc);
      if (sync.screening) {
        setF((s) => ({
          ...s,
          scrS: sync.screening!.sanctions as ScreenResult,
          scrW: sync.screening!.watchlist,
          scrA: sync.screening!.adverse as AdverseResult,
          pep: sync.screening!.pep as PepStatus,
        }));
      }
      setPartnerMsg(`Synced · onboarding ${sync.onboarding.state}${sync.onboarding.finalRating ? ` · ${sync.onboarding.finalRating}` : ""}`);
    } catch (e) {
      setPartnerMsg(String(e instanceof Error ? e.message : e));
    }
  }

  async function startPartnerOnboarding() {
    setPartnerMsg("");
    try {
      const ob = await apiStartOnboarding({
        customerId: f.id || "ACT-NEW",
        customerName: f.name || "(unnamed)",
        licenseRegion: perimeter === "global_account" ? "US" : "UAE",
        mode,
        subject: {
          type: mode === "entity" ? "entity" : "individual",
          fullName: f.name,
          nationality: f.nat,
          country: f.cres,
        },
        capture,
      });
      setPartnerMsg(`Onboarding ${ob.state}${ob.finalRating ? ` · rated ${ob.finalRating}` : ""}`);
      await syncFromPartners();
    } catch (e) {
      setPartnerMsg(String(e instanceof Error ? e.message : e));
    }
  }

  async function simulateOscilarAlert(listHit: boolean) {
    setPartnerMsg("");
    if (!f.id) {
      setPartnerMsg("Customer ID required for Oscilar simulate");
      return;
    }
    try {
      const alert = await apiSimulateOscilarAlert({
        customerId: f.id,
        customerName: f.name || f.id,
        licenseRegion: perimeter === "global_account" ? "US" : "UAE",
        listHit,
        severity: listHit ? "critical" : "high",
        alertType: listHit ? "transaction_screening" : "transaction_monitoring",
        channel: "transfer",
      });
      setPartnerMsg(
        `Oscilar alert ${alert.oscilarAlertId} · ${alert.status}${alert.vital4CaseId ? ` · mirrored V4 ${alert.vital4CaseId}` : ""}${alert.feedOutcome ? ` · feed ${alert.feedOutcome}` : ""}`,
      );
    } catch (e) {
      setPartnerMsg(String(e instanceof Error ? e.message : e));
    }
  }

  async function submit() {
    setSaveErr(false);
    if (!gated.ready || !input || !result || !gt) {
      setSaved(`Blocked: ${dq.summary}`);
      setSaveErr(true);
      return;
    }
    if (f.mo && !canOverride) { setSaved("Blocked: MLRO access required for override (Tayel or Walid)."); setSaveErr(true); return; }
    if (f.mo && f.moJust.trim().length < 20) { setSaved("Blocked: justification required (min 20 chars)."); setSaveErr(true); return; }
    const gate = computeGoldenThread(mode, input, result, controls, labels);
    if (gate.eddRequired && !ops.approved && gate.approval.cls !== "LOW") {
      setSaved("Blocked: complete EDD workflow and record approval before submit."); setSaveErr(true); return;
    }
    try {
      const a = buildAssessment({
        customerId: f.id || "ACT-NEW", customerName: f.name || "(unnamed)",
        input, result, trigger: f.rel === "Existing" ? "MANUAL_REVIEW" : "ONBOARDING",
        triggerNote: `${mode} · ${f.event}`, actor: "MLRO (test bench)", boundary,
        capture, kycContext: kyc,
      });
      const savedAssessment = await addAssessment({
        ...a,
        overrideJustification: f.mo ? f.moJust.trim() : undefined,
        handoff: {
          mode, controls, ops, monitoring: gt.monitoring,
          disposition: gt.dispositionText, dueDiligence: gt.dueDiligence,
          approvalAuthority: gt.approval.who, reviewMonths: gt.reviewMonths,
          monitoringIntensity: gt.monitoringIntensity, residualLevel: String(gt.residual.residualLevel),
        },
      }, { capture, kycContext: kyc });
      setSaved(`Saved ${savedAssessment.rating} · ${gt.dueDiligence} · monitoring ${ops.deployed ? "deployed" : "pending"}`);
      setTimeout(() => setSaved(""), 5000);
    } catch (e) {
      setSaved(String(e instanceof Error ? e.message : e));
      setSaveErr(true);
    }
  }

  return (
    <div className="cram-bench-page">
      <AssessmentContextBanner
        perimeter={perimeter}
        registryVersion={registryMeta().version}
        nraSource={nraSourceForPerimeter(perimeter)}
      />
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="cram-bench-mode-toggle">
          {(["individual", "entity"] as CustomerMode[]).map((m) => (
            <button key={m} type="button"
              className={benchView === "workbench" && mode === m ? "cram-bench-mode-toggle--active" : ""}
              onClick={() => { switchMode(m); setBenchView("workbench"); }}>
              {m === "individual" ? "Individual CRAM Card" : "Entity CRAM Card"}
            </button>
          ))}
          <button
            type="button"
            className={benchView === "methodology" ? "cram-bench-mode-toggle--active cram-bench-mode-toggle--method" : "cram-bench-mode-toggle--method"}
            onClick={() => setBenchView("methodology")}
          >
            CRAM Methodology
          </button>
        </div>
        <AiTag color="#39B9ED">{perimeterLabel(perimeter)} · golden thread wired</AiTag>
        <span className="text-[11px] text-muted ml-auto">Inherent → obligations → controls → residual → TM deploy</span>
        <div className="flex items-center gap-2">
          <a
            href={perimeter === "global_account" ? "/CRAM_Risk_Architecture_Blueprint_v2_4.pdf" : "/CRAM_Risk_Architecture_Blueprint.pdf"}
            download={perimeter === "global_account" ? "CRAM_Risk_Architecture_Blueprint_v2_4.pdf" : "CRAM_Risk_Architecture_Blueprint.pdf"}
            className="btn btn-ghost text-[11px] px-3 py-1.5 flex items-center gap-1.5 no-underline"
            title={perimeter === "global_account"
              ? "Download US system blueprint PDF (REV 2.4 · CRAM-US-2026-07-FREEZE-03)"
              : "Download system blueprint PDF"}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d="M6 1v7M3.5 5.5 6 8l2.5-2.5M2 10h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Blueprint PDF
          </a>
          <details className="relative">
            <summary
              className="btn btn-ghost text-[11px] px-3 py-1.5 flex items-center gap-1.5 no-underline cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden"
              title="Authoritative CRAM methodology — UAE & US"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M5 2H2a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V7M7 1h4m0 0v4m0-4L5.5 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Engine Reference
              <svg width="9" height="9" viewBox="0 0 10 10" fill="none" aria-hidden="true"><path d="M2 3.5 5 6.5 8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </summary>
            <div
              className="absolute right-0 mt-1 z-50 rounded-lg p-1.5 flex flex-col gap-0.5"
              style={{ minWidth: 320, background: "#10103C", border: "1px solid #26285C", boxShadow: "0 8px 24px rgba(0,0,0,.45)" }}
            >
              <div className="text-[9px] uppercase tracking-[0.12em] text-muted px-2 pt-1 pb-1">Authoritative CRAM methodology</div>
              {[
                { label: "US · Global Account", doc: CRAM_METHODOLOGY_US },
                { label: "UAE · Mal Bank", doc: CRAM_METHODOLOGY_UAE },
              ].map(({ label, doc }) => (
                <a
                  key={doc.modelVersionId}
                  href={doc.url}
                  download={doc.filename}
                  className="no-underline rounded-md px-2 py-1.5 flex flex-col gap-0.5 hover:bg-white/5"
                  title={`Download ${doc.label}`}
                >
                  <span className="text-[11px] font-semibold" style={{ color: "#F8F6FE" }}>{label}</span>
                  <span className="text-[10px] text-muted">{doc.label} · {doc.modelVersionId}</span>
                </a>
              ))}
            </div>
          </details>
        </div>
      </div>

      <div className={`cram-bench-grid ${benchView === "methodology" ? "cram-bench-grid--methodology" : ""}`}>
        <div className="cram-bench-main">
          {benchView === "methodology" ? (
            <>
              <div className="cram-method__mode-switch mb-3">
                <span className="text-[11px] text-muted mr-2">Customer-type lens:</span>
                {(["individual", "entity"] as CustomerMode[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={mode === m ? "cram-method__mode-btn cram-method__mode-btn--on" : "cram-method__mode-btn"}
                    onClick={() => switchMode(m)}
                  >
                    {m === "individual" ? "Natural person (NP)" : "Legal person (LP/MER)"}
                  </button>
                ))}
              </div>
              <CramMethodologyPanel
                mode={mode}
                boundary={boundary}
                dq={dq}
                result={result}
                gt={gt}
                variant="explorer"
              />
            </>
          ) : (
          <CramGamifiedShell
            mode={mode}
            name={f.name}
            customerId={f.id}
            segment={f.seg}
            relationship={f.rel}
            dq={dq}
            kyc={kyc}
            result={result}
            gt={gt}
            riskSummary={riskSummary}
            screeningSanctions={f.scrS}
            screeningWatchlist={f.scrW}
            partnerMsg={partnerMsg}
            decisionFrame={gated.ready ? decisionFrame : null}
            evidenceCompletenessPct={evidenceCompletenessPct}
            riskConfidencePct={riskConfidencePct}
            trendDelta={trendDelta}
          >
            <GamifiedSec
              section="identity"
              title="1 · Customer Identity"
              hint={mode === "entity" ? "Legal person — entity type, ownership, UBO" : "Natural person — name, ID, relationship"}
              scoreBadge={sectionScoreBadge(result, "customerType")}
            >
              <Row3>
                <Fld label="Customer name"><input className="input" value={f.name} onChange={(e) => set("name", e.target.value)} /></Fld>
                <Fld label="Customer ID"><input className="input" value={f.id} onChange={(e) => set("id", e.target.value)} /></Fld>
                <Sel label="Relationship" v={f.rel} set={setRel} opts={["New", "Existing"]} />
              </Row3>
              <Row3>
                <Sel label="Assessment event" v={f.event} set={(v) => set("event", v)} opts={EVENTS} />
              </Row3>
              {mode === "entity" && (
                <Row3>
                  <Sel label="Entity legal type" v={f.entityType} set={setEntityType} groups={[...ENTITY_LEGAL_TYPE_GROUPS]} />
                  <Sel label="Ownership structure" v={f.ownership} set={setOwnership} opts={["Direct — 1 layer", "2 layers", "3+ layers (complex)", "Nominee / opaque"]} />
                  <Sel label="UBO verification" v={f.ubo} set={(v) => set("ubo", v)} opts={["verified", "complex_pending", "refused", "listed_exempt"]} />
                </Row3>
              )}
              {mode === "entity" && entityMeta && (
                <div className={`text-[11px] px-2 py-1.5 rounded border ${entityMeta.prohibited ? "bg-proh/15 border-proh/30 text-proh" : entityMeta.score >= 3 ? "bg-med/10 border-med/20 text-muted" : "bg-panel2 border-lineSoft text-muted"}`}>
                  <span className="font-semibold text-ink">{entityMeta.name}</span>
                  {" · "}Score {entityMeta.score}/4 ({entityMeta.rating})
                  {entityMeta.prohibited && " · PROHIBITED — relationship blocked (OVR-006)"}
                  {entityMeta.eddTrigger && !entityMeta.prohibited && " · EDD trigger active"}
                  <div className="mt-0.5">{entityMeta.rationale}</div>
                </div>
              )}
              <Row3>
                <Sel label="Segment" v={f.seg} set={(v) => set("seg", v)} opts={segmentOpts} />
                <Sel label="Expected activity (onboarding)" v={f.expected} set={(v) => set("expected", v)} optsV={[["1", bandLabel[1]], ["2", bandLabel[2]], ["3", bandLabel[3]]]} />
                <Sel label="Observed activity (TM)" v={f.actual} set={(v) => set("actual", v)} optsV={[["1", bandLabel[1]], ["2", bandLabel[2]], ["3", bandLabel[3]]]} />
              </Row3>
              <Row2>
                <Sel label="Transaction behaviour — expected vs actual" v={f.behaviour} set={(v) => set("behaviour", v)} optsV={BEHAVIOUR_STATUSES.map((b) => [b.id, b.label])} />
                <div className="text-[11px] text-muted self-end pb-2">
                  {behaviourMismatch
                    ? `TM band suggests: ${BEHAVIOUR_STATUSES.find((b) => b.id === suggestedBehaviour)?.label ?? suggestedBehaviour}`
                    : "Gate drives review / override · transaction factor uses light uplift only"}
                </div>
              </Row2>
            </GamifiedSec>

            {mode === "entity" && entityStructureInput && (
              <CorporateStructureDiagram input={entityStructureInput} />
            )}

            <GamifiedSec section="kyc" title="2 · Verification Results" hint="FR-007 · identity verification · liveness · document freshness · screening timestamp">
              <div className="aml-source-row">
                <span className="aml-source-badge">Source: Shufti KYC · Vital4 Screening · CRAM DQ Gate</span>
              </div>
              <Row3>
                <Sel label="Identity source" v={kyc.identitySource} set={(v) => setKycField("identitySource", v as KycQualityContext["identitySource"])}
                  opts={identitySourceOpts} />
                <Sel label="Identity verified" v={kyc.identityVerified ? "yes" : "no"} set={(v) => setKycField("identityVerified", v === "yes")}
                  opts={["yes", "no"]} />
                <Sel label="Liveness pass" v={kyc.livenessPass ? "yes" : "no"} set={(v) => setKycField("livenessPass", v === "yes")}
                  opts={["yes", "no"]} />
              </Row3>
              <Row3>
                <Fld label="Document issued"><input type="date" className="input" value={kyc.documentIssuedAt} onChange={(e) => setKycField("documentIssuedAt", e.target.value)} /></Fld>
                <Fld label="Last KYC refresh"><input type="date" className="input" value={kyc.lastKycRefreshAt} onChange={(e) => setKycField("lastKycRefreshAt", e.target.value)} /></Fld>
                <Fld label="Screening completed"><input type="datetime-local" className="input" value={kyc.screeningCompletedAt.slice(0, 16)} onChange={(e) => setKycField("screeningCompletedAt", new Date(e.target.value).toISOString())} /></Fld>
              </Row3>
              <label className="flex items-center gap-2 text-[12px] text-muted cursor-pointer">
                <input type="checkbox" checked={!!f.simulateIncomplete} onChange={(e) => setF((s) => ({ ...s, simulateIncomplete: e.target.checked }))} />
                Simulate incomplete capture (GV-19 demo — clears customer ID & expected activity)
              </label>
              <div className={`aml-dq-badge ${dq.status === "READY" ? "aml-dq-badge--pass" : "aml-dq-badge--fail"}`}>
                {dq.status === "READY"
                  ? "✓ Data quality gate passed — composite scoring enabled"
                  : `⛔ DQ gate blocked · ${dq.summary}`}
              </div>
              {apiLive && (
                <div className="mt-3 pt-3 border-t border-lineSoft space-y-2">
                  <div className="text-[11px] text-muted">Phase 1b · Shufti KYC → Vital4 screening (live API)</div>
                  <div className="flex gap-2 flex-wrap">
                    <button type="button" className="btn btn-ghost text-[11px] px-3 py-1.5" onClick={startPartnerOnboarding}>Start partner onboarding</button>
                    <button type="button" className="btn btn-ghost text-[11px] px-3 py-1.5" onClick={syncFromPartners}>Sync KYC + screening</button>
                  </div>
                  <div className="text-[11px] text-muted pt-1">Phase 2 · Oscilar TM → Vital4 mirror + CRAM feed</div>
                  <div className="flex gap-2 flex-wrap">
                    <button type="button" className="btn btn-ghost text-[11px] px-3 py-1.5" onClick={() => void simulateOscilarAlert(false)}>Simulate TM alert (high)</button>
                    <button type="button" className="btn btn-ghost text-[11px] px-3 py-1.5" onClick={() => void simulateOscilarAlert(true)}>Simulate list hit (critical + V4 mirror)</button>
                  </div>
                  {partnerMsg && <div className="text-[11px] text-muted">{partnerMsg}</div>}
                </div>
              )}
            </GamifiedSec>

            <GamifiedSec
              section="geography"
              title="3 · Geography"
              hint={mode === "entity" ? "Worst of opco · incorp · UBO · SoW · SoF · UN/US/UAE sanctions floors" : "Residence · birth · nationality · SoW · SoF · UN/US/UAE sanctions floors"}
              scoreBadge={sectionScoreBadge(result, "geography", 20)}
            >
              <Row3>
                <Sel label={mode === "entity" ? "Operating country" : "Country of residence"} v={mode === "entity" ? f.opco : f.cres} set={(v) => set(mode === "entity" ? "opco" : "cres", v)} opts={countryOptions} />
                <Sel label={mode === "entity" ? "Incorporation country" : "Country of birth"} v={mode === "entity" ? f.incco : f.cbirth} set={(v) => set(mode === "entity" ? "incco" : "cbirth", v)} opts={countryOptions} />
                <Sel label={mode === "entity" ? "UBO country" : "Primary nationality"} v={mode === "entity" ? f.uboco : f.nat} set={(v) => set(mode === "entity" ? "uboco" : "nat", v)} opts={countryOptions} />
              </Row3>
              <Row2>
                <Sel label="Source-of-wealth country" v={f.sow} set={(v) => set("sow", v)} opts={countryOptions} />
                <Sel label="Source-of-funds country" v={f.sof} set={(v) => set("sof", v)} opts={countryOptions} />
              </Row2>
            </GamifiedSec>

            {/* ── 4 · Business Activity ─────────────────────────────── */}
            <GamifiedSec
              section="drivers"
              title="4 · Business Activity"
              hint={mode === "individual" ? "Employment · profession · ISIC · nature of work" : "Entity ISIC · nature of business · 22% weight"}
              scoreBadge={sectionScoreBadge(result, "transaction")}
            >
              <div className="aml-source-row">
                <span className="aml-source-badge">Source: RAKEZ Activity Register · ISIC Rev.5 · {nraSourceForPerimeter(perimeter)}</span>
              </div>
              <Row2>
                <Sel label={mode === "individual" ? "Employment status" : "Authorised signatory role"} v={f.emp} set={setEmployment} optsV={empOpts.map((e) => [e[0], e[0]])} />
                <div className="text-[11px] text-muted self-end pb-2">{mode === "individual" ? "ISIC activity scored when self-employed (emp ≥ 2)" : "Entity ISIC drives nature-of-business factor (22%)"}</div>
              </Row2>
              <Row2>
                {mode === "individual" ? (
                  <>
                    <Sel label="Profession / occupation" v={f.profession} set={setProfession} groups={professionGroups} />
                    <Sel label="Self-employed activity (ISIC)" v={f.activity} set={(v) => set("activity", v)} groups={activityGroups} />
                  </>
                ) : (
                  <>
                    <Sel label="Registered business activity (ISIC Rev.5)" v={f.activity} set={(v) => set("activity", v)} groups={activityGroups} />
                    <Fld label="ISIC code (optional)"><input className="input mono" placeholder="e.g. 6419" value={f.isicCode} onChange={(e) => set("isicCode", e.target.value)} /></Fld>
                  </>
                )}
              </Row2>
              {mode === "individual" && (
                <Row2>
                  <Fld label="ISIC code (optional)"><input className="input mono" placeholder="e.g. 6201" value={f.isicCode} onChange={(e) => set("isicCode", e.target.value)} /></Fld>
                  <div className="text-[11px] text-muted self-end pb-2">
                    {professionMismatch
                      ? "⚠ Profession incompatible with employment — select a valid option"
                      : "Profession filtered by employment · activity auto-suggested when typology matches"}
                  </div>
                </Row2>
              )}
              <div className="cram-driver-grid" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
                <DriverChip icon="💼" label="Employment" value={f.emp} />
                <DriverChip icon="🏭" label="ISIC activity" value={f.activity.slice(0, 32) + (f.activity.length > 32 ? "…" : "")} />
              </div>
            </GamifiedSec>

            {/* ── 5 · Products & Use Cases ──────────────────────────── */}
            <GamifiedSec
              section="products"
              title="5 · Products & Use Cases"
              hint="Product · use case · service · channel — NRA product risk + typology-based use case scoring"
              scoreBadge={sectionScoreBadge(result, "product")}
            >
              <div className="aml-source-row">
                <span className="aml-source-badge">Source: {registryMeta().version} · {nraSourceForPerimeter(perimeter)}</span>
                {input?.masterRegistryActivityId && (
                  <span className="aml-source-badge">Activity: {input.masterRegistryActivityId}</span>
                )}
              </div>
              <Row3>
                <Sel label="Product" v={f.prod} set={(v) => set("prod", v)} opts={productOptions} />
                <Sel
                  label="Reason of payment (use case)"
                  v={f.useCaseId}
                  set={(v) => set("useCaseId", v)}
                  optsV={allUseCases().map((u) => {
                    const j = perimeter === "global_account" ? u.us : u.uae;
                    return [u.id, `${u.useCaseName} (${j.rating})`];
                  })}
                />
                <Sel label="Service" v={f.svc} set={(v) => set("svc", v)} optsV={SVC.map((s) => [String(s[1]), s[0]])} />
              </Row3>
              <Row2>
                <Sel label="Initiation channel" v={f.initChan} set={(v) => set("initChan", v)} optsV={INITIATION_CHANNELS.map((c) => [String(c.score), c.label])} />
                <Sel label="Delivery channel" v={f.delChan} set={(v) => set("delChan", v)} optsV={DELIVERY_CHANNELS.map((c) => [String(c.score), c.label])} />
              </Row2>
              <div className="cram-driver-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
                <DriverChip icon="📦" label="Product" value={f.prod.length > 22 ? f.prod.slice(0, 22) + "…" : f.prod} />
                <DriverChip icon="🔄" label="Service" value={SVC.find((s) => String(s[1]) === f.svc)?.[0] ?? f.svc} />
                <DriverChip icon="📱" label="Channel" value={DELIVERY_CHANNELS.find((c) => String(c.score) === f.delChan)?.label ?? f.delChan} />
              </div>
            </GamifiedSec>

            {/* ── 6 · Corridor Risk ─────────────────────────────────── */}
            <GamifiedSec
              section="corridor"
              title="6 · Corridor Risk"
              hint="Country risk scores per perimeter — residence · nationality · SoW · SoF · FATF · sanctions floors"
              scoreBadge={sectionScoreBadge(result, "geography", 20)}
            >
              <div className="aml-source-row">
                <span className="aml-source-badge">Source: countries.json · {perimeterLabel(perimeter)} · FATF · Basel AML Index 2024</span>
              </div>
              <div className="aml-corridor-table">
                {[
                  { label: mode === "entity" ? "Operating country" : "Residence", val: mode === "entity" ? f.opco : f.cres },
                  { label: mode === "entity" ? "Incorporation" : "Nationality", val: mode === "entity" ? f.incco : f.nat },
                  { label: mode === "entity" ? "UBO country" : "Country of birth", val: mode === "entity" ? f.uboco : f.cbirth },
                  { label: "Source of wealth", val: f.sow },
                  { label: "Source of funds", val: f.sof },
                ].map(({ label, val }) => {
                  const cr = val ? lookupCountry(val, perimeter) : null;
                  if (!cr) return null;
                  const bandClass = cr.band === "Prohibited" ? "aml-band--prohibited" : cr.band === "High" ? "aml-band--high" : cr.band === "Medium" ? "aml-band--medium" : "aml-band--low";
                  return (
                    <div key={label} className="aml-corridor-row">
                      <span className="aml-corridor-label">{label}</span>
                      <span className="aml-corridor-country">{val}</span>
                      <span className={`aml-band-chip ${bandClass}`}>{cr.band}</span>
                      <span className="aml-corridor-firm">{cr.firm.toFixed(2)}</span>
                      {cr.fatf === 2 && <span className="aml-fatf-chip aml-fatf-chip--grey">FATF Grey</span>}
                      {cr.fatf === 3 && <span className="aml-fatf-chip aml-fatf-chip--black">FATF Black</span>}
                      {cr.sanctions > 0 && <span className="aml-fatf-chip aml-fatf-chip--sanctions">Sanctions</span>}
                    </div>
                  );
                })}
              </div>
            </GamifiedSec>

            {/* ── 7 · Screening & Risk Indicators ──────────────────── */}
            <GamifiedSec
              section="screening"
              title="7 · Screening & Risk Indicators"
              hint="PEP · sanctions / TFS · watchlist · adverse media · investigations · STR/SAR history"
            >
              <div className="aml-source-row">
                <span className="aml-source-badge">Source: Vital4 · OFAC / UN / UAE TFS · FinCEN 314(a)</span>
              </div>
              <div className="cram-driver-grid">
                <DriverChip icon="🏛️" label="PEP" value={f.pep} hot={f.pep !== "None"} />
                <DriverChip icon="🚫" label="Sanctions" value={f.scrS} hot={f.scrS !== "Clear"} />
                <DriverChip icon="📋" label="Watchlist" value={f.scrW} hot={f.scrW !== "Clear"} />
                <DriverChip icon="📰" label="Adverse" value={f.scrA} hot={f.scrA !== "None"} />
                <DriverChip icon="🔍" label="Investigations" value={isNewCustomer ? "N/A — new customer" : (INV_STR.find((s) => String(s[1]) === f.inv)?.[0] ?? f.inv)} hot={!isNewCustomer && +f.inv >= 2} />
                <DriverChip icon="📄" label="STR / SAR" value={isNewCustomer ? "N/A — new customer" : (INV_STR.find((s) => String(s[1]) === f.str)?.[0] ?? f.str)} hot={!isNewCustomer && +f.str >= 2} />
              </div>
              <Row3>
                <Sel label="PEP status" v={f.pep} set={(v) => set("pep", v)} opts={["None", "Domestic", "Foreign", "IO"]} />
                <Sel label="Sanctions / TFS" v={f.scrS} set={(v) => set("scrS", v)} opts={["Clear", "Potential Match", "True Match"]} />
                <Sel label="Watchlist" v={f.scrW} set={(v) => set("scrW", v)} opts={["Clear", "True Match"]} />
              </Row3>
              <Row3>
                <Sel label="Adverse media" v={f.scrA} set={(v) => set("scrA", v)} opts={["None", "Potential", "True Match"]} />
                <Sel label="Investigations" v={f.inv} set={(v) => set("inv", v)} optsV={INV_STR.map((s) => [String(s[1]), s[0]])} disabled={isNewCustomer} />
                <Sel label="STR / SAR status" v={f.str} set={(v) => set("str", v)} optsV={INV_STR.map((s) => [String(s[1]), s[0]])} disabled={isNewCustomer} />
              </Row3>
            </GamifiedSec>

            <GamifiedSec
              section="controls"
              title="Control effectiveness"
              hint="Drives residual · never cures gates"
              scoreBadge={controlsScoreBadge(controls)}
            >
              <div className="grid grid-cols-2 gap-2 max-md:grid-cols-1">
                {(Object.keys(CONTROL_LABELS) as ControlKey[]).map((k) => (
                  <div key={k} className="cram-control-row">
                    <div className="cram-control-row__head">
                      <label className="field-label">{labels[k]} · {CFG.controlWeights[k]}%</label>
                      <ControlStars value={controls[k]} />
                    </div>
                    <select className="input" value={String(controls[k])} onChange={(e) => setCtrl(k, +e.target.value)}>
                      {CONTROL_OPTIONS.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </GamifiedSec>
          </CramGamifiedShell>
          )}
        </div>

        {benchView === "workbench" && (
          <div className="cram-bench-decision-col sticky top-[84px] space-y-3.5 max-lg:static">
            <TestBenchDecisionBox
              frame={decisionFrame}
              disabled={!gated.ready}
              recorded={benchDecision}
              onRecordDecision={setBenchDecision}
              customerName={f.name}
              customerId={f.id}
              rating={result?.finalRating ? String(result.finalRating) : "—"}
              requiredAction={gt?.dueDiligence ?? "—"}
              approver={approverFromGt(gt)}
              confidencePct={riskConfidencePct}
              evidenceItems={decisionFrame.evidenceItems}
              evidenceCompletenessPct={evidenceCompletenessPct}
            />

            {!gated.ready ? (
              <Card className="p-4 border border-hi/30 bg-hi/5">
                <div className="text-[10px] uppercase tracking-wide text-hi font-semibold">Assessment blocked</div>
                <div className="font-display font-bold text-2xl mt-1 text-hi">BLOCKED</div>
                <div className="text-[12px] text-muted mt-2">Workflow: <b className="text-ink">{dq.workflowState}</b> — no composite computed (FR-007)</div>
                <ul className="text-[11px] mt-3 space-y-1.5 m-0 pl-4">
                  {dq.issues.slice(0, 8).map((issue) => (
                    <li key={`${issue.code}-${issue.field}`} className="text-muted">{issue.message}</li>
                  ))}
                </ul>
              </Card>
            ) : (
              <>
                <OverrideRiskAcceptancePanel records={decisionFrame.riskAcceptance} />
                <HandoffPanel
                  gt={gt!} ops={ops} approverInput={approverInput}
                  onToggleCheck={(id, checked) => setOps((o) => ({ ...o, checks: { ...o.checks, [id]: checked } }))}
                  onApprove={() => {
                    if (!approverInput.trim()) return;
                    setOps((o) => ({
                      ...o, approved: true,
                      approvedBy: `${approverInput.trim()} — ${gt!.approval.who.replace(" required", "")}`,
                      approvedAt: new Date().toISOString().slice(0, 16).replace("T", " "),
                    }));
                  }}
                  onDeploy={() => setOps((o) => ({ ...o, deployed: true, deployedAt: new Date().toISOString().slice(0, 16).replace("T", " ") }))}
                  onApproverChange={setApproverInput}
                />
              </>
            )}

            <Card className="p-4">
              <div className="sec mb-2">Evidence simulation</div>
              <label className="flex items-center gap-2 text-[12px] text-muted cursor-pointer mb-2">
                <input type="checkbox" checked={poaOnFile} onChange={(e) => setPoaOnFile(e.target.checked)} />
                PoA on file
              </label>
              <label className="flex items-center gap-2 text-[12px] text-muted cursor-pointer">
                <input type="checkbox" checked={deviceIpCaptured} onChange={(e) => setDeviceIpCaptured(e.target.checked)} />
                Device / IP captured
              </label>
            </Card>

            <Card className="p-4">
              <div className="sec mb-2">Override & submit</div>
              <Sel label="Signed-in user (RBAC)" v={persona} set={(v) => { setPlatformUser(v as PlatformUserId); setPersonaState(v as PlatformUserId); }} optsV={PLATFORM_USERS.map((u) => [u.id, `${u.name} — ${u.title}`])} />
              <Sel label="Manual override" v={f.mo} set={(v) => set("mo", v)} opts={["", "Low", "Medium", "High"]} disabled={!canOverride || !gated.ready} />
              {f.mo && (
                <Fld label="Justification">
                  <textarea className="input min-h-[60px]" value={f.moJust} onChange={(e) => set("moJust", e.target.value)} disabled={!canOverride} />
                </Fld>
              )}
              <div className="flex gap-2 mt-3">
                <button className="btn flex-1" onClick={submit} disabled={!gated.ready}>Submit assessment</button>
                <button className="btn btn-ghost" onClick={() => setBoundary(boundary === "calculator" ? "cram" : "calculator")}>Boundary</button>
              </div>
              {saved && <div className={`text-[11px] mt-2 px-2 py-1 rounded ${saveErr ? "bg-hi/15 text-hi" : "bg-low/15 text-low"}`}>{saved}</div>}
            </Card>
          </div>
        )}

        {benchView === "workbench" && (
          <div className="cram-bench-method-rail max-xl:hidden">
            {/* ── Live Risk Visualization Dashboard ──────────── */}
            <div className="cram-viz-rail">
              <div className="cram-viz-rail__header">
                <span className="cram-viz-rail__title">Risk Visualization Dashboard</span>
                <span className="cram-viz-rail__perimeter">{perimeterLabel(perimeter)}</span>
              </div>
              {gated.ready && riskSummary ? (
                <>
                  <RiskVisualizationDashboard summary={riskSummary} mode={mode} />
                  {gt && (
                    <div className="cram-viz-residual">
                      <div className="cram-viz-residual__label">Residual — management info only · does not change treatment</div>
                      <div className="cram-viz-residual__row">
                        <span className="cram-viz-residual__score">{gt.residual.residualScore.toFixed(2)}</span>
                        <span className="cram-viz-residual__band" data-band={String(gt.residual.residualLevel).toLowerCase()}>{String(gt.residual.residualLevel)}</span>
                      </div>
                      <div className="cram-viz-residual__meta">Effectiveness {Math.round(gt.residual.effectiveness * 100)}% · {gt.residual.appetiteText}</div>
                      {gt.residual.controlGap && (
                        <div className="cram-viz-residual__gap">Control gap — strengthen EDD / monitoring</div>
                      )}
                    </div>
                  )}
                  {rbmAssessment && (
                    <div className="cram-viz-rbm">
                      <div className="cram-viz-rbm__label">RBM composite · {registryMeta().version}</div>
                      <div className="cram-viz-rbm__sub">{nraSourceForPerimeter(perimeter)}</div>
                      <RbmScoreBreakdown result={rbmAssessment} />
                    </div>
                  )}
                </>
              ) : (
                <div className="cram-viz-rail__placeholder">
                  <div className="cram-viz-rail__placeholder-icon">📊</div>
                  <div className="cram-viz-rail__placeholder-title">Awaiting data quality gate</div>
                  <div className="cram-viz-rail__placeholder-body">
                    Complete identity, KYC, and geography fields to unlock live risk visualisation — radar chart, factor bars, and residual adjustment will appear here.
                  </div>
                  <div className="cram-viz-rail__placeholder-dq">
                    {dq.issues.slice(0, 4).map((issue) => (
                      <div key={`${issue.code}-${issue.field}`} className="cram-viz-rail__dq-issue">· {issue.message}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── Compact methodology rail below ─────────────── */}
            <details className="cram-viz-method-details mt-3">
              <summary className="cram-viz-method-details__toggle">Six-factor methodology</summary>
              <CramMethodologyPanel
                mode={mode}
                boundary={boundary}
                dq={dq}
                result={result}
                gt={gt}
                variant="rail"
              />
            </details>
          </div>
        )}

        {benchView === "methodology" && (
        <div className="cram-bench-sidebar sticky top-[84px] space-y-3.5 max-lg:static">
          <TestBenchDecisionBox
            frame={decisionFrame}
            disabled={!gated.ready}
            recorded={benchDecision}
            onRecordDecision={setBenchDecision}
            customerName={f.name}
            customerId={f.id}
            rating={result?.finalRating ? String(result.finalRating) : "—"}
            requiredAction={gt?.dueDiligence ?? "—"}
            approver={approverFromGt(gt)}
            confidencePct={riskConfidencePct}
            evidenceItems={decisionFrame.evidenceItems}
            evidenceCompletenessPct={evidenceCompletenessPct}
          />
          {!gated.ready ? (
            <Card className="p-4 border border-hi/30 bg-hi/5">
              <div className="text-[10px] uppercase tracking-wide text-hi font-semibold">Supporting detail</div>
              <p className="text-[12px] text-muted mt-2 m-0">Complete mandatory fields to unlock RBM breakdown and residual view.</p>
            </Card>
          ) : (
            <>
              {riskSummary && <RiskSummaryPanel summary={riskSummary} mode={mode} />}

              {rbmAssessment && (
                <Card className="p-4 border border-ai/25">
                  <div className="text-[10px] uppercase tracking-wide text-ai font-semibold mb-1">
                    RBM composite · {registryMeta().version}
                  </div>
                  <div className="text-[11px] text-muted mb-3">
                    Product + business activity (NRA) + use case + corridor — {nraSourceForPerimeter(perimeter)}
                  </div>
                  <RbmScoreBreakdown result={rbmAssessment} />
                </Card>
              )}

              <Card className="p-4">
                <div className="text-[10px] uppercase tracking-wide text-faint mb-2">Residual — management info only · does not change treatment</div>
                <div className="flex justify-between items-center">
                  <span className="font-mono text-2xl font-bold">{gt!.residual.residualScore.toFixed(2)}</span>
                  <span className="pill text-[11px]">{String(gt!.residual.residualLevel)}</span>
                </div>
                <div className="text-[11px] text-muted mt-1">Effectiveness {Math.round(gt!.residual.effectiveness * 100)}% · {gt!.residual.appetiteText}</div>
                {gt!.residual.controlGap && (
                  <div className="text-[11px] mt-2 px-2 py-1 rounded bg-med/15 text-med">Control gap — strengthen EDD / monitoring</div>
                )}
              </Card>

              {kybContext ? (
                <KybChecklistPanel context={kybContext} compact />
              ) : mode === "entity" ? (
                <KybChecklistEmpty />
              ) : null}

              <Card className="p-4">
                <div className="sec mb-2">Override & gate flags</div>
                <div className="space-y-1">
                  {gt!.gates.flags.map((fl) => (
                    <div key={fl.name} className="flex justify-between text-[11px] py-1 border-b border-lineSoft">
                      <span className="text-muted">{fl.name}</span>
                      <span className={fl.status === "PROHIBIT" ? "text-hi" : fl.on ? "text-med" : "text-low"}>{fl.status}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          )}
        </div>
        )}
      </div>
    </div>
  );
}

const Row2 = ({ children }: { children: ReactNode }) => <div className="grid grid-cols-2 gap-2.5">{children}</div>;
const Row3 = ({ children }: { children: ReactNode }) => <div className="grid grid-cols-3 gap-2.5 max-md:grid-cols-1">{children}</div>;
function Fld({ label, children }: { label: string; children: ReactNode }) { return <div><label className="field-label">{label}</label>{children}</div>; }
function Sel({ label, v, set, opts, optsV, groups, disabled }: {
  label: string; v: string; set: (v: string) => void;
  opts?: readonly string[]; optsV?: [string, string][];
  groups?: { label: string; options: string[] }[];
  disabled?: boolean;
}) {
  return (
    <Fld label={label}>
      <select className="input" value={v} disabled={disabled} onChange={(e) => set(e.target.value)}>
        {groups
          ? groups.map((g) => (
              <optgroup key={g.label} label={g.label}>
                {g.options.map((o) => <option key={o} value={o}>{o}</option>)}
              </optgroup>
            ))
          : optsV
            ? optsV.map(([val, lbl]) => <option key={`${val}-${lbl}`} value={val}>{lbl}</option>)
            : opts!.map((o) => <option key={o} value={o}>{o === "" ? "— none —" : o}</option>)}
      </select>
    </Fld>
  );
}
