ALTER TABLE "documents" ADD COLUMN "origin" text DEFAULT 'knowledge' NOT NULL;--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "source_ticket_id" text;--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "lifecycle" text DEFAULT 'open' NOT NULL;--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "intake_channel" text DEFAULT 'email' NOT NULL;--> statement-breakpoint
ALTER TABLE "tickets" ADD COLUMN "completion" jsonb;--> statement-breakpoint
UPDATE "documents" SET "origin" = 'work'
WHERE "storage_key" IS NOT NULL OR "id" LIKE '%-colleague-email-attachment';
