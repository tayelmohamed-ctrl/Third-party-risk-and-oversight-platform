-- Override governance: immutable MLRO justification + enforcement record
ALTER TABLE "assessments" ADD COLUMN IF NOT EXISTS "governance" JSONB;
ALTER TABLE "assessments" ADD COLUMN IF NOT EXISTS "override_justification" TEXT;
