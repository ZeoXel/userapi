ALTER TABLE "api_keys" ADD COLUMN "user_name" text;--> statement-breakpoint
ALTER TABLE "api_keys" ADD COLUMN "user_phone" text;--> statement-breakpoint
ALTER TABLE "credit_transactions" ADD COLUMN "user_name" text;--> statement-breakpoint
ALTER TABLE "usage_logs" ADD COLUMN "user_name" text;--> statement-breakpoint

-- 填充现有数据
UPDATE api_keys SET user_name = u.name, user_phone = u.phone FROM users u WHERE api_keys.user_id = u.id;--> statement-breakpoint
UPDATE credit_transactions SET user_name = u.name FROM users u WHERE credit_transactions.user_id = u.id;--> statement-breakpoint
UPDATE usage_logs SET user_name = u.name FROM users u WHERE usage_logs.user_id = u.id;