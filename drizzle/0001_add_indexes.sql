CREATE INDEX "api_keys_prefix_status_idx" ON "api_keys" USING btree ("key_prefix","status");--> statement-breakpoint
CREATE INDEX "api_keys_user_id_idx" ON "api_keys" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "api_keys_status_idx" ON "api_keys" USING btree ("status");--> statement-breakpoint
CREATE INDEX "credit_tx_user_created_idx" ON "credit_transactions" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "credit_tx_user_type_idx" ON "credit_transactions" USING btree ("user_id","type");--> statement-breakpoint
CREATE INDEX "credit_tx_service_idx" ON "credit_transactions" USING btree ("service","created_at");--> statement-breakpoint
CREATE INDEX "usage_logs_user_created_idx" ON "usage_logs" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "usage_logs_key_created_idx" ON "usage_logs" USING btree ("key_id","created_at");--> statement-breakpoint
CREATE INDEX "usage_logs_provider_created_idx" ON "usage_logs" USING btree ("provider","created_at");--> statement-breakpoint
CREATE INDEX "usage_logs_error_idx" ON "usage_logs" USING btree ("error_code");--> statement-breakpoint
CREATE UNIQUE INDEX "users_provider_provider_id_idx" ON "users" USING btree ("provider","provider_id");--> statement-breakpoint
CREATE INDEX "users_email_idx" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "users_status_idx" ON "users" USING btree ("status");