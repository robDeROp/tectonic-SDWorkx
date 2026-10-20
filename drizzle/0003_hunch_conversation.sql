CREATE TABLE "hunch_messages" (
	"id" text PRIMARY KEY NOT NULL,
	"hunch_id" text NOT NULL,
	"author_id" text,
	"author_name" text NOT NULL,
	"author_detail" text,
	"source" text DEFAULT 'hunch' NOT NULL,
	"content" text NOT NULL,
	"attachment_name" text,
	"attachment_text" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "hunches" ADD COLUMN "source" text DEFAULT 'hunch' NOT NULL;--> statement-breakpoint
ALTER TABLE "hunches" ADD COLUMN "source_label" text;--> statement-breakpoint
ALTER TABLE "hunch_messages" ADD CONSTRAINT "hunch_messages_hunch_id_hunches_id_fk" FOREIGN KEY ("hunch_id") REFERENCES "public"."hunches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "hunch_messages_hunch_idx" ON "hunch_messages" USING btree ("hunch_id","created_at");--> statement-breakpoint
-- Existing hunches: their description becomes the opening message.
INSERT INTO "hunch_messages" ("id", "hunch_id", "author_id", "author_name", "content", "created_at")
SELECT gen_random_uuid()::text, "id", "author_id", "author_id", "working_on", "created_at" FROM "hunches";
