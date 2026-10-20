CREATE TABLE "hunch_context" (
	"hunch_id" text NOT NULL,
	"kind" text NOT NULL,
	"ref_id" text NOT NULL,
	"relevance" integer NOT NULL,
	"reason" text NOT NULL,
	CONSTRAINT "hunch_context_hunch_id_kind_ref_id_pk" PRIMARY KEY("hunch_id","kind","ref_id")
);
--> statement-breakpoint
ALTER TABLE "hunch_context" ADD CONSTRAINT "hunch_context_hunch_id_hunches_id_fk" FOREIGN KEY ("hunch_id") REFERENCES "public"."hunches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hunches" DROP COLUMN "topic_id";--> statement-breakpoint
ALTER TABLE "hunches" DROP COLUMN "topic_reason";