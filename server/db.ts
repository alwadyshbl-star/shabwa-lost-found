import { and, desc, eq, gte, like, lte, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertReport,
  InsertUser,
  notifications,
  Report,
  reportMatches,
  reports,
  users,
} from "../drizzle/schema";
import { calculateMatchScore, MATCH_THRESHOLD } from "./matching";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the database instance so type checks can run without a local DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId, lastSignedIn: new Date() };
  const updateSet: Record<string, unknown> = { lastSignedIn: new Date() };
  (["name", "email", "loginMethod"] as const).forEach(field => {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  });
  values.role = user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : "user");
  updateSet.role = values.role;
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export type PublicReportFilters = {
  query?: string;
  itemKind?: "person" | "animal" | "item";
  reportType?: "lost" | "found";
  status?: "open" | "recovered" | "under_review";
  location?: string;
  dateFrom?: string;
  dateTo?: string;
};

export async function listPublicReports(filters?: PublicReportFilters) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(reports.isPublic, true), eq(reports.moderationStatus, "published")];
  if (filters?.itemKind) conditions.push(eq(reports.itemKind, filters.itemKind));
  if (filters?.reportType) conditions.push(eq(reports.reportType, filters.reportType));
  if (filters?.status) conditions.push(eq(reports.status, filters.status));
  if (filters?.location) conditions.push(like(reports.location, `%${filters.location}%`));
  if (filters?.dateFrom) conditions.push(gte(reports.incidentDate, filters.dateFrom));
  if (filters?.dateTo) conditions.push(lte(reports.incidentDate, filters.dateTo));
  if (filters?.query) {
    conditions.push(or(like(reports.name, `%${filters.query}%`), like(reports.description, `%${filters.query}%`))!);
  }
  return db.select().from(reports).where(and(...conditions)).orderBy(desc(reports.createdAt)).limit(36);
}

export async function getPublicReport(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(reports)
    .where(and(eq(reports.id, id), eq(reports.isPublic, true), eq(reports.moderationStatus, "published")))
    .limit(1);
  return result[0];
}

export async function createReport(data: InsertReport) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.insert(reports).values(data);
  return getReportById(Number(result[0].insertId));
}

export async function getReportById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(reports).where(eq(reports.id, id)).limit(1);
  return result[0];
}

export async function listReportsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(reports).where(eq(reports.userId, userId)).orderBy(desc(reports.createdAt));
}

export async function getReportForOwner(id: number, userId: number, isAdmin: boolean) {
  const report = await getReportById(id);
  if (!report || (!isAdmin && report.userId !== userId)) return undefined;
  return report;
}

export async function markReportRecovered(id: number, userId: number, isAdmin: boolean) {
  const report = await getReportForOwner(id, userId, isAdmin);
  if (!report) return undefined;
  const db = await getDb();
  if (!db) return undefined;
  await db.update(reports).set({ status: "recovered", closedAt: new Date() }).where(eq(reports.id, id));
  return getReportById(id);
}

export async function updateReport(
  id: number,
  userId: number,
  isAdmin: boolean,
  values: Pick<
    InsertReport,
    "reportType" | "itemKind" | "name" | "description" | "incidentDate" | "location" | "imageUrl" | "contactName" | "contactPhone"
  >,
) {
  const report = await getReportForOwner(id, userId, isAdmin);
  if (!report) return undefined;
  const db = await getDb();
  if (!db) return undefined;
  await db.update(reports).set({ ...values, updatedAt: new Date() }).where(eq(reports.id, id));
  return getReportById(id);
}

export async function getReportStats() {
  const db = await getDb();
  const blank = { lost: 0, found: 0, recovered: 0 };
  if (!db) return blank;
  const [lostRows, foundRows, recoveredRows] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(reports).where(eq(reports.reportType, "lost")),
    db.select({ count: sql<number>`count(*)` }).from(reports).where(eq(reports.reportType, "found")),
    db.select({ count: sql<number>`count(*)` }).from(reports).where(eq(reports.status, "recovered")),
  ]);
  return {
    lost: Number(lostRows[0]?.count ?? 0),
    found: Number(foundRows[0]?.count ?? 0),
    recovered: Number(recoveredRows[0]?.count ?? 0),
  };
}

export async function createPotentialMatches(sourceReport: Report) {
  const db = await getDb();
  if (!db) return [];
  const oppositeType = sourceReport.reportType === "lost" ? "found" : "lost";
  const candidates = await db
    .select()
    .from(reports)
    .where(
      and(
        eq(reports.reportType, oppositeType),
        eq(reports.status, "open"),
        eq(reports.moderationStatus, "published"),
        eq(reports.isPublic, true),
      ),
    )
    .orderBy(desc(reports.createdAt))
    .limit(100);
  const matches = candidates
    .map(candidate => ({ candidate, score: calculateMatchScore(sourceReport, candidate) }))
    .filter(match => match.score >= MATCH_THRESHOLD)
    .sort((first, second) => second.score - first.score)
    .slice(0, 8);

  for (const match of matches) {
    await db
      .insert(reportMatches)
      .values({ sourceReportId: sourceReport.id, candidateReportId: match.candidate.id, score: match.score })
      .onDuplicateKeyUpdate({ set: { score: match.score } });
    if (match.candidate.userId !== sourceReport.userId) {
      await db.insert(notifications).values({
        userId: match.candidate.userId,
        reportId: match.candidate.id,
        type: "match",
        title: "تطابق محتمل جديد",
        message: `ظهر بلاغ جديد قد يتوافق مع بلاغك «${match.candidate.name}».`,
      });
    }
  }
  return matches;
}

export async function getMatchesForReport(reportId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({ id: reportMatches.id, score: reportMatches.score, status: reportMatches.status, candidate: reports })
    .from(reportMatches)
    .innerJoin(reports, eq(reportMatches.candidateReportId, reports.id))
    .where(eq(reportMatches.sourceReportId, reportId))
    .orderBy(desc(reportMatches.score));
}

export async function flagMatchForReview(reportId: number, candidateReportId: number) {
  const db = await getDb();
  if (!db) return false;
  await db
    .update(reportMatches)
    .set({ status: "reported" })
    .where(and(eq(reportMatches.sourceReportId, reportId), eq(reportMatches.candidateReportId, candidateReportId)));
  return true;
}

export async function listAllReports() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(reports).orderBy(desc(reports.createdAt)).limit(100);
}

export async function updateModerationStatus(id: number, moderationStatus: "published" | "under_review") {
  const db = await getDb();
  if (!db) return undefined;
  await db.update(reports).set({ moderationStatus }).where(eq(reports.id, id));
  return getReportById(id);
}

export async function listNotificationsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(30);
}

export async function markNotificationRead(id: number, userId: number) {
  const db = await getDb();
  if (!db) return false;
  await db.update(notifications).set({ isRead: true }).where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
  return true;
}
