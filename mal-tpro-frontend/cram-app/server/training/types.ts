export type TrainingStatus = "assigned" | "in_progress" | "completed" | "overdue" | "waived";

export interface TrainingRecord {
  id: string;
  userEmail: string;
  userName: string | null;
  courseId: string;
  courseName: string;
  status: TrainingStatus;
  dueAt: string | null;
  completedAt: string | null;
  attestedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TrainingStats {
  total: number;
  completed: number;
  inProgress: number;
  assigned: number;
  overdue: number;
  waived: number;
  completionPct: number;
  dueWithin30Days: number;
}

export interface CreateTrainingInput {
  userEmail: string;
  userName?: string;
  courseId: string;
  dueAt?: string;
}

export interface UpdateTrainingInput {
  status?: TrainingStatus;
  dueAt?: string | null;
  completedAt?: string | null;
  attestedBy?: string | null;
}
