CREATE TABLE "feedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"attendee_id" integer,
	"display_name" text,
	"message" text NOT NULL,
	"rating" smallint,
	"ip_hash" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "event_poll_sets" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"poll_set_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "event_poll_sets_event_id_poll_set_id_unique" UNIQUE("event_id","poll_set_id")
);
--> statement-breakpoint
CREATE TABLE "poll_questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"poll_set_id" integer NOT NULL,
	"question" text NOT NULL,
	"options" jsonb NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "poll_responses" (
	"id" serial PRIMARY KEY NOT NULL,
	"poll_question_id" integer NOT NULL,
	"event_id" integer NOT NULL,
	"attendee_id" integer,
	"attendee_name" text,
	"option_index" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "poll_sets" (
	"id" serial PRIMARY KEY NOT NULL,
	"host_user_id" varchar NOT NULL,
	"title" text NOT NULL,
	"share_token" varchar,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "poll_sets_share_token_unique" UNIQUE("share_token")
);
--> statement-breakpoint
CREATE TABLE "expense_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"date" date NOT NULL,
	"amount" double precision NOT NULL,
	"category" varchar(100) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "time_entries" (
	"id" serial PRIMARY KEY NOT NULL,
	"project_id" integer NOT NULL,
	"date" date NOT NULL,
	"hours" double precision NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tracked_projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "flyer_tagline" text;--> statement-breakpoint
ALTER TABLE "events" ADD COLUMN "flyer_options" jsonb;--> statement-breakpoint
ALTER TABLE "feedback" ADD CONSTRAINT "feedback_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_poll_sets" ADD CONSTRAINT "event_poll_sets_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "event_poll_sets" ADD CONSTRAINT "event_poll_sets_poll_set_id_poll_sets_id_fk" FOREIGN KEY ("poll_set_id") REFERENCES "public"."poll_sets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poll_questions" ADD CONSTRAINT "poll_questions_poll_set_id_poll_sets_id_fk" FOREIGN KEY ("poll_set_id") REFERENCES "public"."poll_sets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poll_responses" ADD CONSTRAINT "poll_responses_poll_question_id_poll_questions_id_fk" FOREIGN KEY ("poll_question_id") REFERENCES "public"."poll_questions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "poll_responses" ADD CONSTRAINT "poll_responses_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "expense_entries" ADD CONSTRAINT "expense_entries_project_id_tracked_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."tracked_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_project_id_tracked_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."tracked_projects"("id") ON DELETE cascade ON UPDATE no action;