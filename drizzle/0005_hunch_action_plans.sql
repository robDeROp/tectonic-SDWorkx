CREATE TABLE "hunch_action_plans" (
	"hunch_id" text PRIMARY KEY NOT NULL,
	"context_hash" text NOT NULL,
	"plan" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "hunch_action_plans" ADD CONSTRAINT "hunch_action_plans_hunch_id_hunches_id_fk" FOREIGN KEY ("hunch_id") REFERENCES "public"."hunches"("id") ON DELETE cascade ON UPDATE no action;