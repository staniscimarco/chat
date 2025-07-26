DROP TABLE "topic_messages";--> statement-breakpoint
DROP TABLE "topics";--> statement-breakpoint
ALTER TABLE "messages" ALTER COLUMN "chat_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_email_unique" UNIQUE("email");