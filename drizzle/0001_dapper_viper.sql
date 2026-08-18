CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`reportId` int,
	`type` enum('match','system') NOT NULL DEFAULT 'system',
	`title` varchar(160) NOT NULL,
	`message` text NOT NULL,
	`isRead` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `report_matches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sourceReportId` int NOT NULL,
	`candidateReportId` int NOT NULL,
	`score` int NOT NULL,
	`status` enum('pending','reported','dismissed') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `report_matches_id` PRIMARY KEY(`id`),
	CONSTRAINT `matches_source_candidate_unique` UNIQUE(`sourceReportId`,`candidateReportId`)
);
--> statement-breakpoint
CREATE TABLE `reports` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`reportType` enum('lost','found') NOT NULL,
	`itemKind` enum('person','animal','item') NOT NULL,
	`name` varchar(160) NOT NULL,
	`description` text NOT NULL,
	`incidentDate` varchar(32) NOT NULL,
	`location` varchar(240) NOT NULL,
	`imageUrl` varchar(1024),
	`contactName` varchar(120),
	`contactPhone` varchar(32),
	`status` enum('open','recovered','under_review') NOT NULL DEFAULT 'open',
	`moderationStatus` enum('published','under_review') NOT NULL DEFAULT 'published',
	`isPublic` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`closedAt` timestamp,
	CONSTRAINT `reports_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `notifications_user_idx` ON `notifications` (`userId`,`isRead`,`createdAt`);--> statement-breakpoint
CREATE INDEX `matches_source_idx` ON `report_matches` (`sourceReportId`);--> statement-breakpoint
CREATE INDEX `matches_candidate_idx` ON `report_matches` (`candidateReportId`);--> statement-breakpoint
CREATE INDEX `reports_user_idx` ON `reports` (`userId`);--> statement-breakpoint
CREATE INDEX `reports_public_idx` ON `reports` (`isPublic`,`status`,`createdAt`);--> statement-breakpoint
CREATE INDEX `reports_search_idx` ON `reports` (`itemKind`,`reportType`,`incidentDate`);