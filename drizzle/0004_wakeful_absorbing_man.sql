CREATE TABLE "login_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"count" integer DEFAULT 1 NOT NULL,
	"window_start" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "login_attempts_key_unique" UNIQUE("key")
);
