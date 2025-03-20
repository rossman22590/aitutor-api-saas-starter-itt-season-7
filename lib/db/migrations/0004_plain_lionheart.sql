CREATE TABLE "files" (
	"id" serial PRIMARY KEY NOT NULL,
	"file_id" text NOT NULL,
	"file_name" varchar(255) NOT NULL,
	"file_type" varchar(50) DEFAULT 'pdf' NOT NULL,
	"team_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "files" ADD CONSTRAINT "files_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;