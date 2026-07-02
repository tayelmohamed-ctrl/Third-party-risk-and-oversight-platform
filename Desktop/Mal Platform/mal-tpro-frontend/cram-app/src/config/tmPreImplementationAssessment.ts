/**
 * TM System Pre-Implementation Assessment — Mal Bank questionnaire (2026-06-22).
 * Source: TM_System_Pre_Implementation_Assessment_Questionnaire_Mal Bank.xlsx
 */
import questionnaire from "../data/tm_pre_implementation_questionnaire.json";

export type AssessmentResponse = "Yes" | "Partial" | "No" | "";
export type GapRating = "Critical" | "High" | "Medium" | "Low" | "No Gap" | "";

export interface TmAssessmentQuestion {
  id: string;
  section: string;
  controlArea: string;
  question: string;
  requirementType: string;
  applicability: "Mandatory" | "Conditional" | string;
  brdRef: string;
  systemConfig: string;
  dataEvidence: string;
  response: AssessmentResponse;
  gapRating: GapRating;
  comments: string;
}

export interface TmAssessmentSection {
  id: string;
  sheetName: string;
  title: string;
  questions: TmAssessmentQuestion[];
}

export interface NoGoCondition {
  id: string;
  condition: string;
  riskImpact: string;
  evidence: string;
  owner: string;
}

export const TM_ASSESSMENT_META = {
  version: questionnaire.version,
  date: questionnaire.date,
  title: "Transaction Monitoring System Pre-Implementation Assessment",
  scoring: {
    yes: 1,
    partial: 0.5,
    no: 0,
    goLiveReady: 0.9,
    conditional: 0.75,
    notReady: 0.6,
  },
  ratings: [
    { min: 0.9, label: "Go-live ready", decision: "Approved" },
    { min: 0.75, label: "Conditionally ready", decision: "Approved with conditions" },
    { min: 0.6, label: "Not ready", decision: "Deferred pending remediation" },
    { min: 0, label: "Blocked", decision: "No-go" },
  ],
} as const;

export const TM_ASSESSMENT_SECTIONS = questionnaire.sections as TmAssessmentSection[];
export const TM_NO_GO_CONDITIONS = questionnaire.noGoConditions as NoGoCondition[];

/** Section IDs relevant by partner integration category. */
export const TM_SECTIONS_BY_PARTNER_CATEGORY: Record<string, string[]> = {
  "Risk platform": TM_ASSESSMENT_SECTIONS.map((s) => s.id),
  "System integrator": TM_ASSESSMENT_SECTIONS.map((s) => s.id),
  "KYC & identity": ["05", "08", "24", "26", "27", "28", "29", "32", "36", "39", "40"],
  "Banking partner": ["05", "06", "08", "11", "12", "15", "24", "26", "27", "28", "29", "31", "36", "39"],
  "Payout partners": ["05", "06", "11", "12", "15", "16", "24", "26", "27", "29", "36", "39"],
  "Card & settlement": ["05", "06", "09", "10", "14", "25", "26", "27", "29", "36", "39"],
  "Virtual accounts": ["05", "06", "08", "17", "24", "26", "27", "28", "29", "31", "36"],
  "Lending": ["05", "06", "09", "08", "11", "26", "27", "28", "36", "39"],
};

export function sectionsForPartnerCategory(category: string): TmAssessmentSection[] {
  const ids = TM_SECTIONS_BY_PARTNER_CATEGORY[category] ?? ["05", "26", "27", "36", "39"];
  const set = new Set(ids);
  return TM_ASSESSMENT_SECTIONS.filter((s) => set.has(s.id));
}

export function scoreSection(questions: TmAssessmentQuestion[]): number {
  const applicable = questions.filter((q) => q.applicability !== "N/A");
  if (!applicable.length) return 1;
  let sum = 0;
  for (const q of applicable) {
    if (q.response === "Yes") sum += TM_ASSESSMENT_META.scoring.yes;
    else if (q.response === "Partial") sum += TM_ASSESSMENT_META.scoring.partial;
  }
  return sum / applicable.length;
}

export function scoreAssessment(responses: Record<string, AssessmentResponse>): {
  overall: number;
  rating: string;
  decision: string;
  sections: { id: string; title: string; score: number; total: number; answered: number }[];
  criticalGaps: string[];
} {
  const sections = TM_ASSESSMENT_SECTIONS.map((sec) => {
    const qs = sec.questions.map((q) => ({
      ...q,
      response: responses[q.id] ?? "",
    }));
    return {
      id: sec.id,
      title: sec.title,
      score: scoreSection(qs),
      total: qs.filter((q) => q.applicability !== "N/A").length,
      answered: qs.filter((q) => q.response).length,
    };
  });
  const overall = sections.reduce((a, s) => a + s.score, 0) / Math.max(sections.length, 1);
  const rating = TM_ASSESSMENT_META.ratings.find((r) => overall >= r.min) ?? TM_ASSESSMENT_META.ratings.at(-1)!;
  const criticalGaps = TM_NO_GO_CONDITIONS
    .filter((_, i) => i < 7 && Object.values(responses).includes("No"))
    .map((n) => n.id);
  return { overall, rating: rating.label, decision: rating.decision, sections, criticalGaps };
}

export function requiresTmAssessment(category: string): boolean {
  return category in TM_SECTIONS_BY_PARTNER_CATEGORY;
}
