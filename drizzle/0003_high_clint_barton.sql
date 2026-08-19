ALTER TABLE `notifications` ADD `matchReportId` int;
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_match_unique` UNIQUE(`userId`,`reportId`,`matchReportId`);
