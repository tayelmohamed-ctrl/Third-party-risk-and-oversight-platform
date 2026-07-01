// Re-export PostgreSQL append-only audit store (single persistence layer).
export type { AuditLogEntry, MlroAlert } from "./db/auditStore";
export {
  appendAssessment, appendFeedEvent, appendAudit, appendMlroAlert,
  allAssessments, latestByCustomer, historyFor, allFeedEvents,
  processedIds, allAuditLog, openMlroAlerts, storeEmpty,
  pgStore as serverStore,
} from "./db/auditStore";
