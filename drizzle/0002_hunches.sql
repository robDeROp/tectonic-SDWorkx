CREATE TABLE "help_calls" (
	"id" text PRIMARY KEY NOT NULL,
	"hunch_id" text NOT NULL,
	"recipient_id" text NOT NULL,
	"state" text NOT NULL,
	"note" text,
	"emailed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hunches" (
	"id" text PRIMARY KEY NOT NULL,
	"number" serial NOT NULL,
	"author_id" text NOT NULL,
	"title" text NOT NULL,
	"working_on" text NOT NULL,
	"topic_id" text NOT NULL,
	"topic_reason" text NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "help_calls" ADD CONSTRAINT "help_calls_hunch_id_hunches_id_fk" FOREIGN KEY ("hunch_id") REFERENCES "public"."hunches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "help_calls_hunch_idx" ON "help_calls" USING btree ("hunch_id");--> statement-breakpoint
CREATE INDEX "help_calls_recipient_idx" ON "help_calls" USING btree ("recipient_id","state");