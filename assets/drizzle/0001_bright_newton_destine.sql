CREATE TABLE `label_tab` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`uuid` text NOT NULL,
	`create_at` integer,
	`update_at` integer,
	`color_hex` text(7),
	`title` text
);
--> statement-breakpoint
CREATE TABLE `library_tab` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`uuid` text NOT NULL,
	`create_at` integer,
	`update_at` integer,
	`name` text
);
--> statement-breakpoint
CREATE TABLE `snippet_label_tab` (
	`snippet_id` integer NOT NULL,
	`label_id` integer NOT NULL,
	PRIMARY KEY(`label_id`, `snippet_id`),
	FOREIGN KEY (`snippet_id`) REFERENCES `snippet_tab`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`label_id`) REFERENCES `label_tab`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE snippet_tab ADD `uuid` text NOT NULL;--> statement-breakpoint
ALTER TABLE snippet_tab ADD `create_at` integer;--> statement-breakpoint
ALTER TABLE snippet_tab ADD `update_at` integer;--> statement-breakpoint
ALTER TABLE snippet_tab ADD `title` text;--> statement-breakpoint
CREATE UNIQUE INDEX `label_tab_uuid_unique` ON `label_tab` (`uuid`);--> statement-breakpoint
CREATE UNIQUE INDEX `library_tab_uuid_unique` ON `library_tab` (`uuid`);--> statement-breakpoint
CREATE UNIQUE INDEX `snippet_tab_uuid_unique` ON `snippet_tab` (`uuid`);--> statement-breakpoint
ALTER TABLE `snippet_tab` DROP COLUMN `data`;