CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" serial PRIMARY KEY NOT NULL,
	"host_user_id" varchar NOT NULL,
	"title" text NOT NULL,
	"logo_url" text,
	"promo_text" text,
	"start_time" timestamp with time zone,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"qr_code_token" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "events_qr_code_token_unique" UNIQUE("qr_code_token")
);
--> statement-breakpoint
CREATE TABLE "attendees" (
	"id" serial PRIMARY KEY NOT NULL,
	"event_id" integer NOT NULL,
	"session_id" varchar(128),
	"session_token" varchar(128),
	"display_name" text,
	"assigned_id" integer NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	"raised_hand" boolean DEFAULT false NOT NULL,
	"raised_hand_at" timestamp with time zone,
	CONSTRAINT "attendees_event_assigned_id_unique" UNIQUE("event_id","assigned_id")
);
--> statement-breakpoint
ALTER TABLE "attendees" ADD CONSTRAINT "attendees_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");