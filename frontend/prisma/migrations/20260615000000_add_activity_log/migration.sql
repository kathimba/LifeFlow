-- CreateEnum
CREATE TYPE "entity_type" AS ENUM ('TASK', 'GOAL', 'JOURNAL', 'DOCUMENT');

-- CreateEnum
CREATE TYPE "action_type" AS ENUM ('CREATED', 'UPDATED', 'COMPLETED', 'DELETED');

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "entity_type" "entity_type" NOT NULL,
    "entity_id" UUID NOT NULL,
    "action" "action_type" NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_logs_user" ON "activity_logs"("user_id");

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
