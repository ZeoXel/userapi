CREATE TABLE "tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"key_id" text,
	"user_name" text,
	"task_id" text NOT NULL,
	"platform" text NOT NULL,
	"action" text NOT NULL,
	"status" text DEFAULT 'submitted' NOT NULL,
	"progress" text DEFAULT '0%',
	"fail_reason" text,
	"quota_pre_consumed" integer DEFAULT 0,
	"quota_actual" integer,
	"submit_time" timestamp with time zone DEFAULT now() NOT NULL,
	"start_time" timestamp with time zone,
	"finish_time" timestamp with time zone,
	"request_data" text,
	"response_data" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_key_id_api_keys_id_fk" FOREIGN KEY ("key_id") REFERENCES "public"."api_keys"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tasks_task_id_idx" ON "tasks" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "tasks_user_id_status_idx" ON "tasks" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "tasks_platform_status_idx" ON "tasks" USING btree ("platform","status");--> statement-breakpoint
CREATE INDEX "tasks_created_at_idx" ON "tasks" USING btree ("created_at");