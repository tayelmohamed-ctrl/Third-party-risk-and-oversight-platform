/**
 * AML training course catalogue — FFIEC BSA/AML examination expectations.
 * Role-based assignments support examiner requests for training evidence.
 */
export type TrainingCourseId =
  | "AML-FCC-101"
  | "AML-STR-201"
  | "AML-TM-301"
  | "AML-SAN-401"
  | "AML-MLRO-501";

export interface TrainingCourse {
  id: TrainingCourseId;
  name: string;
  description: string;
  frequencyMonths: number;
  requiredRoles: ("Analyst" | "Reviewer" | "MLRO" | "ConfigMaker" | "ConfigChecker")[];
  regulatorRef: string;
}

export const TRAINING_COURSES: TrainingCourse[] = [
  {
    id: "AML-FCC-101",
    name: "AML/CFT Fundamentals",
    description: "Core AML/CFT programme, CBUAE obligations, customer risk, record-keeping.",
    frequencyMonths: 12,
    requiredRoles: ["Analyst", "Reviewer", "MLRO", "ConfigMaker", "ConfigChecker"],
    regulatorRef: "CBUAE 3354/2022 · FFIEC BSA/AML §Training",
  },
  {
    id: "AML-STR-201",
    name: "STR/SAR Filing & Narrative Quality",
    description: "goAML filing, Who/What/When/Where/Why/How, Annex 1 deficiencies, defensive filing.",
    frequencyMonths: 12,
    requiredRoles: ["Reviewer", "MLRO"],
    regulatorRef: "CBUAE Notice 3354/2022 · FFIEC Appendix L",
  },
  {
    id: "AML-TM-301",
    name: "Transaction Monitoring & Investigations",
    description: "TM alert triage, investigation pipeline, disposition, escalation to MLRO.",
    frequencyMonths: 12,
    requiredRoles: ["Analyst", "Reviewer", "MLRO"],
    regulatorRef: "FFIEC BSA/AML · TM examination procedures",
  },
  {
    id: "AML-SAN-401",
    name: "Sanctions & PEP Screening",
    description: "Vital4 disposition, true/false match handling, PEP and adverse media.",
    frequencyMonths: 12,
    requiredRoles: ["Analyst", "Reviewer", "MLRO"],
    regulatorRef: "CBUAE sanctions guidance · OFAC alignment",
  },
  {
    id: "AML-MLRO-501",
    name: "MLRO Responsibilities & Governance",
    description: "MLRO independence, STR approval, regulatory engagement, board reporting.",
    frequencyMonths: 12,
    requiredRoles: ["MLRO"],
    regulatorRef: "CBUAE MLRO circular · FFIEC BSA/AML governance",
  },
];

export const TRAINING_COURSE_BY_ID = Object.fromEntries(
  TRAINING_COURSES.map((c) => [c.id, c]),
) as Record<TrainingCourseId, TrainingCourse>;

export function coursesForRoles(roles: string[]): TrainingCourse[] {
  return TRAINING_COURSES.filter((c) =>
    c.requiredRoles.some((r) => roles.includes(r)),
  );
}
