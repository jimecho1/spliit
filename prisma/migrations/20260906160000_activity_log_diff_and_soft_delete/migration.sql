-- Activity log: record who did it and what changed (before -> after),
-- and stop hard-deleting expenses so the log stays complete.

-- AlterEnum
ALTER TYPE "ActivityType" ADD VALUE 'RESTORE_EXPENSE';

-- AlterTable: soft delete for expenses
ALTER TABLE "Expense" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Expense_groupId_deletedAt_idx" ON "Expense"("groupId", "deletedAt");

-- AlterTable: richer activity records
ALTER TABLE "Activity" ADD COLUMN "actorName" TEXT;
ALTER TABLE "Activity" ADD COLUMN "payload" JSONB;
