import {
  boolean,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

/** Core user identity supplied by the authentication layer. */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

/** First-party email/password credentials. Passwords are stored only as hashes. */
export const localAccounts = mysqlTable(
  "local_accounts",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    email: varchar("email", { length: 320 }).notNull(),
    passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    userUnique: uniqueIndex("local_accounts_user_unique").on(table.userId),
    emailUnique: uniqueIndex("local_accounts_email_unique").on(table.email),
  }),
);

/** A public or private lost-and-found case, owned by one registered user. */
export const reports = mysqlTable(
  "reports",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    reportType: mysqlEnum("reportType", ["lost", "found"]).notNull(),
    itemKind: mysqlEnum("itemKind", ["person", "animal", "item"]).notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    description: text("description").notNull(),
    incidentDate: varchar("incidentDate", { length: 32 }).notNull(),
    location: varchar("location", { length: 240 }).notNull(),
    imageUrl: varchar("imageUrl", { length: 1024 }),
    contactName: varchar("contactName", { length: 120 }),
    contactPhone: varchar("contactPhone", { length: 32 }),
    status: mysqlEnum("status", ["open", "recovered", "under_review"]).default("open").notNull(),
    moderationStatus: mysqlEnum("moderationStatus", ["published", "under_review"])
      .default("published")
      .notNull(),
    isPublic: boolean("isPublic").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
    closedAt: timestamp("closedAt"),
  },
  table => ({
    userIdx: index("reports_user_idx").on(table.userId),
    publicIdx: index("reports_public_idx").on(table.isPublic, table.status, table.createdAt),
    searchIdx: index("reports_search_idx").on(table.itemKind, table.reportType, table.incidentDate),
  }),
);

/** A scored candidate relation created when a new report is submitted. */
export const reportMatches = mysqlTable(
  "report_matches",
  {
    id: int("id").autoincrement().primaryKey(),
    sourceReportId: int("sourceReportId").notNull(),
    candidateReportId: int("candidateReportId").notNull(),
    score: int("score").notNull(),
    status: mysqlEnum("status", ["pending", "reported", "dismissed"]).default("pending").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    sourceIdx: index("matches_source_idx").on(table.sourceReportId),
    candidateIdx: index("matches_candidate_idx").on(table.candidateReportId),
    uniquePair: uniqueIndex("matches_source_candidate_unique").on(table.sourceReportId, table.candidateReportId),
  }),
);

/** In-app notices, including a potential-match notification to report owners. */
export const notifications = mysqlTable(
  "notifications",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").notNull(),
    reportId: int("reportId"),
    matchReportId: int("matchReportId"),
    type: mysqlEnum("type", ["match", "system"]).default("system").notNull(),
    title: varchar("title", { length: 160 }).notNull(),
    message: text("message").notNull(),
    isRead: boolean("isRead").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    userIdx: index("notifications_user_idx").on(table.userId, table.isRead, table.createdAt),
    uniqueMatchNotice: uniqueIndex("notifications_match_unique").on(table.userId, table.reportId, table.matchReportId),
  }),
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type LocalAccount = typeof localAccounts.$inferSelect;
export type Report = typeof reports.$inferSelect;
export type InsertReport = typeof reports.$inferInsert;
