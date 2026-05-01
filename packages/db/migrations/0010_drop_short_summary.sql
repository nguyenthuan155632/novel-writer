-- Custom SQL migration file for renaming detailed_summary to summary and dropping short_summary in chapter_summaries table

ALTER TABLE "chapter_summaries" RENAME COLUMN "detailed_summary" TO "summary";
ALTER TABLE "chapter_summaries" DROP COLUMN IF EXISTS "short_summary";
