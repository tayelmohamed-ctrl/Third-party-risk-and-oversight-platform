import { prisma } from "../db/client";
import type { CreateTrainingInput, TrainingRecord, TrainingStatus, UpdateTrainingInput } from "./types";

function uid(): string {
  return `trn_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function effectiveStatus(
  status: string,
  dueAt: Date | null,
  completedAt: Date | null,
): TrainingStatus {
  if (status === "completed" || status === "waived") return status as TrainingStatus;
  if (dueAt && dueAt.getTime() < Date.now() && !completedAt) return "overdue";
  return status as TrainingStatus;
}

function mapRecord(r: {
  id: string;
  userEmail: string;
  userName: string | null;
  courseId: string;
  courseName: string;
  status: string;
  dueAt: Date | null;
  completedAt: Date | null;
  attestedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}): TrainingRecord {
  return {
    id: r.id,
    userEmail: r.userEmail,
    userName: r.userName,
    courseId: r.courseId,
    courseName: r.courseName,
    status: effectiveStatus(r.status, r.dueAt, r.completedAt),
    dueAt: r.dueAt?.toISOString() ?? null,
    completedAt: r.completedAt?.toISOString() ?? null,
    attestedBy: r.attestedBy,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export async function findTrainingById(id: string): Promise<TrainingRecord | null> {
  const row = await prisma.trainingRecord.findUnique({ where: { id } });
  return row ? mapRecord(row) : null;
}

export async function listTraining(opts?: {
  status?: string;
  userEmail?: string;
  courseId?: string;
  limit?: number;
}): Promise<TrainingRecord[]> {
  const rows = await prisma.trainingRecord.findMany({
    where: {
      ...(opts?.userEmail ? { userEmail: opts.userEmail } : {}),
      ...(opts?.courseId ? { courseId: opts.courseId } : {}),
      ...(opts?.status && opts.status !== "overdue"
        ? { status: opts.status }
        : {}),
    },
    orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
    take: opts?.limit ?? 500,
  });
  const mapped = rows.map(mapRecord);
  if (opts?.status === "overdue") {
    return mapped.filter((r) => r.status === "overdue");
  }
  return mapped;
}

export async function createTraining(input: CreateTrainingInput & { courseName: string }): Promise<TrainingRecord> {
  const row = await prisma.trainingRecord.create({
    data: {
      id: uid(),
      userEmail: input.userEmail.toLowerCase(),
      userName: input.userName ?? null,
      courseId: input.courseId,
      courseName: input.courseName,
      status: "assigned",
      dueAt: input.dueAt ? new Date(input.dueAt) : null,
    },
  });
  return mapRecord(row);
}

export async function updateTraining(
  id: string,
  input: UpdateTrainingInput,
): Promise<TrainingRecord | null> {
  const existing = await findTrainingById(id);
  if (!existing) return null;

  const row = await prisma.trainingRecord.update({
    where: { id },
    data: {
      status: input.status === "overdue" ? existing.status : input.status,
      dueAt: input.dueAt === null ? null : input.dueAt ? new Date(input.dueAt) : undefined,
      completedAt: input.completedAt === null
        ? null
        : input.completedAt
          ? new Date(input.completedAt)
          : input.status === "completed"
            ? new Date()
            : undefined,
      attestedBy: input.attestedBy,
    },
  });
  return mapRecord(row);
}

export async function trainingCount(): Promise<number> {
  return prisma.trainingRecord.count();
}

export async function trainingStats(): Promise<{
  total: number;
  completed: number;
  inProgress: number;
  assigned: number;
  overdue: number;
  waived: number;
  dueWithin30Days: number;
}> {
  const rows = await prisma.trainingRecord.findMany();
  const mapped = rows.map(mapRecord);
  const in30 = Date.now() + 30 * 24 * 60 * 60 * 1000;

  return {
    total: mapped.length,
    completed: mapped.filter((r) => r.status === "completed").length,
    inProgress: mapped.filter((r) => r.status === "in_progress").length,
    assigned: mapped.filter((r) => r.status === "assigned").length,
    overdue: mapped.filter((r) => r.status === "overdue").length,
    waived: mapped.filter((r) => r.status === "waived").length,
    dueWithin30Days: mapped.filter(
      (r) =>
        r.dueAt &&
        r.status !== "completed" &&
        r.status !== "waived" &&
        new Date(r.dueAt).getTime() <= in30,
    ).length,
  };
}
