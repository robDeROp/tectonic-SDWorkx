CREATE TABLE "answer_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"ticket_id" text NOT NULL,
	"generation" integer NOT NULL,
	"version" integer NOT NULL,
	"content" text NOT NULL,
	"source" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deliveries" (
	"id" text PRIMARY KEY NOT NULL,
	"ticket_id" text NOT NULL,
	"review_id" text NOT NULL,
	"recipient" text NOT NULL,
	"subject" text NOT NULL,
	"content" text NOT NULL,
	"overridden" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" text PRIMARY KEY NOT NULL,
	"ticket_id" text NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"date" text,
	"content" text NOT NULL,
	"fictional" boolean DEFAULT false NOT NULL,
	"storage_key" text,
	"assessment" jsonb,
	"assessed_version" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" text PRIMARY KEY NOT NULL,
	"ticket_id" text NOT NULL,
	"job_id" text,
	"label" text NOT NULL,
	"detail" text,
	"tone" text DEFAULT 'info' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"ticket_id" text NOT NULL,
	"kind" text NOT NULL,
	"state" text DEFAULT 'queued' NOT NULL,
	"generation" integer NOT NULL,
	"document_version" integer NOT NULL,
	"answer_version" integer NOT NULL,
	"input" jsonb NOT NULL,
	"result" jsonb,
	"lease_token" text,
	"lease_until" timestamp with time zone,
	"error" text,
	"dispatch_error" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "tickets" (
	"id" text PRIMARY KEY NOT NULL,
	"number" serial NOT NULL,
	"customer" text NOT NULL,
	"company" text NOT NULL,
	"email" text NOT NULL,
	"subject" text NOT NULL,
	"question" text NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	"phase" text DEFAULT 'idle' NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"generation" integer DEFAULT 1 NOT NULL,
	"document_version" integer DEFAULT 1 NOT NULL,
	"answer_version" integer DEFAULT 0 NOT NULL,
	"answer" text DEFAULT '' NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "answer_versions" ADD CONSTRAINT "answer_versions_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_review_id_jobs_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."jobs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "answer_version_unique" ON "answer_versions" USING btree ("ticket_id","generation","version");--> statement-breakpoint
CREATE UNIQUE INDEX "one_delivery_per_review" ON "deliveries" USING btree ("review_id");--> statement-breakpoint
CREATE INDEX "documents_ticket_idx" ON "documents" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "events_ticket_idx" ON "events" USING btree ("ticket_id");--> statement-breakpoint
CREATE INDEX "jobs_queue_idx" ON "jobs" USING btree ("state","lease_until");--> statement-breakpoint
CREATE INDEX "jobs_ticket_idx" ON "jobs" USING btree ("ticket_id");