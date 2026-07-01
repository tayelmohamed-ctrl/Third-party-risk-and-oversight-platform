import { TRAINING_COURSES, TRAINING_COURSE_BY_ID, coursesForRoles } from "../../src/config/trainingCatalogue";
import { PLATFORM_USERS } from "../../src/config/platformUsers";
import { appendAudit } from "../db/auditStore";
import {
  createTraining,
  findTrainingById,
  listTraining,
  trainingCount,
  trainingStats,
  updateTraining,
} from "./store";
import type { CreateTrainingInput, TrainingRecord, TrainingStats, UpdateTrainingInput } from "./types";

export { TRAINING_COURSES, coursesForRoles };

export async function getTrainingStats(): Promise<TrainingStats> {
  const raw = await trainingStats();
  const actionable = raw.total - raw.waived;
  return {
    ...raw,
    completionPct: actionable > 0 ? Math.round((raw.completed / actionable) * 100) : 100,
  };
}

export async function getTrainingRecords(opts?: {
  status?: string;
  userEmail?: string;
  courseId?: string;
}): Promise<TrainingRecord[]> {
  return listTraining(opts);
}

export async function getTrainingRecord(id: string): Promise<TrainingRecord | null> {
  return findTrainingById(id);
}

export async function assignTraining(
  input: CreateTrainingInput,
  actor: string,
): Promise<TrainingRecord> {
  const course = TRAINING_COURSE_BY_ID[input.courseId as keyof typeof TRAINING_COURSE_BY_ID];
  if (!course) {
    throw new Error(`unknown course: ${input.courseId}`);
  }

  const dueAt = input.dueAt ?? defaultDueDate(course.frequencyMonths);
  const created = await createTraining({
    ...input,
    courseName: course.name,
    dueAt,
  });

  await appendAudit({
    actor,
    action: "training.assigned",
    entity: "training_record",
    entityId: created.id,
    detail: `${course.id} · ${course.name} → ${created.userEmail} · due ${dueAt.slice(0, 10)}`,
    after: created.status,
  });

  return created;
}

export async function patchTrainingRecord(
  id: string,
  input: UpdateTrainingInput,
  actor: string,
): Promise<TrainingRecord | null> {
  const updated = await updateTraining(id, input);
  if (!updated) return null;

  const action =
    input.status === "completed"
      ? "training.completed"
      : input.status === "waived"
        ? "training.waived"
        : "training.updated";

  await appendAudit({
    actor,
    action,
    entity: "training_record",
    entityId: updated.id,
    detail: `${updated.courseId} · ${updated.userEmail} · ${input.status ?? "metadata"}`,
    after: updated.status,
  });

  return updated;
}

export async function completeTraining(
  id: string,
  actor: string,
  attestedBy?: string,
): Promise<TrainingRecord | null> {
  return patchTrainingRecord(
    id,
    {
      status: "completed",
      completedAt: new Date().toISOString(),
      attestedBy: attestedBy ?? actor,
    },
    actor,
  );
}

function defaultDueDate(monthsFromNow: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + monthsFromNow);
  return d.toISOString();
}

/** Idempotent seed — one assignment per required course per platform user. */
export async function seedTrainingIfEmpty(): Promise<number> {
  if ((await trainingCount()) > 0) return 0;

  let created = 0;
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  for (const user of PLATFORM_USERS) {
    const courses = coursesForRoles(user.roles);
    for (let i = 0; i < courses.length; i++) {
      const course = courses[i];
      const dueOffset = (i + 1) * 45 * day;
      const dueAt = new Date(now + dueOffset).toISOString();
      const completed = i === 0 && user.id === "walid_elsheikha";

      await createTraining({
        userEmail: user.email,
        userName: user.name,
        courseId: course.id,
        courseName: course.name,
        dueAt,
      });

      if (completed) {
        const rows = await listTraining({ userEmail: user.email, courseId: course.id });
        const row = rows[0];
        if (row) {
          await updateTraining(row.id, {
            status: "completed",
            completedAt: new Date(now - 14 * day).toISOString(),
            attestedBy: "walid.elsheikha@mal.ae",
          });
        }
      }

      if (user.id === "david_henry" && course.id === "AML-FCC-101") {
        const rows = await listTraining({ userEmail: user.email, courseId: course.id });
        const row = rows[0];
        if (row) {
          await updateTraining(row.id, {
            status: "assigned",
            dueAt: new Date(now - 7 * day).toISOString(),
          });
        }
      }

      created++;
    }
  }

  await appendAudit({
    actor: "system",
    action: "training.seed",
    entity: "training_record",
    entityId: "seed",
    detail: `Seeded ${created} AML training assignments for platform users`,
    after: "seeded",
  });

  return created;
}
