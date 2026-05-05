CREATE TABLE "transcription_usage" (
"id" serial PRIMARY KEY NOT NULL,
"event_id" integer NOT NULL,
"audio_bytes" integer NOT NULL,
"estimated_seconds" real NOT NULL,
"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "transcription_usage" ADD CONSTRAINT "transcription_usage_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "transcription_usage_event_id_idx" ON "transcription_usage" USING btree ("event_id");
