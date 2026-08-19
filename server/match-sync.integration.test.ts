import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { and, eq, or } from "drizzle-orm";
import { notifications, reportMatches, reports, users } from "../drizzle/schema";
import { createPotentialMatches, getDb, getMatchesForReport, listNotificationsWithMatchSummary } from "./db";

const token = `match-sync-${Date.now()}`;
let sourceUserId = 0;
let candidateUserId = 0;
let sourceReportId = 0;
let candidateReportId = 0;

describe("match synchronization", () => {
  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database connection is required for match synchronization integration coverage.");

    const sourceUser = await db.insert(users).values({ openId: `${token}-source`, name: "اختبار مصدر", email: `${token}-source@example.invalid`, loginMethod: "test", role: "user" });
    const candidateUser = await db.insert(users).values({ openId: `${token}-candidate`, name: "اختبار مرشح", email: `${token}-candidate@example.invalid`, loginMethod: "test", role: "user" });
    sourceUserId = Number(sourceUser[0].insertId);
    candidateUserId = Number(candidateUser[0].insertId);

    const sourceReport = await db.insert(reports).values({ userId: sourceUserId, reportType: "lost", itemKind: "item", name: "محفظة اختبار سوداء", description: "محفظة سوداء فيها بطاقة هوية ومفتاح صغير", incidentDate: "2026-08-18", location: "سوق عتق المركزي", status: "open", moderationStatus: "published", isPublic: true });
    const candidateReport = await db.insert(reports).values({ userId: candidateUserId, reportType: "found", itemKind: "item", name: "محفظه اختبار سوداء", description: "وجدت محفظة سوداء تحتوي على بطاقة هوية ومفتاح", incidentDate: "2026-08-19", location: "السوق المركزي في عتق", status: "open", moderationStatus: "published", isPublic: true });
    sourceReportId = Number(sourceReport[0].insertId);
    candidateReportId = Number(candidateReport[0].insertId);
  });

  afterAll(async () => {
    const db = await getDb();
    if (!db) return;
    await db.delete(notifications).where(or(eq(notifications.reportId, sourceReportId), eq(notifications.reportId, candidateReportId), eq(notifications.matchReportId, sourceReportId), eq(notifications.matchReportId, candidateReportId)));
    await db.delete(reportMatches).where(or(eq(reportMatches.sourceReportId, sourceReportId), eq(reportMatches.candidateReportId, sourceReportId), eq(reportMatches.sourceReportId, candidateReportId), eq(reportMatches.candidateReportId, candidateReportId)));
    await db.delete(reports).where(or(eq(reports.id, sourceReportId), eq(reports.id, candidateReportId)));
    await db.delete(users).where(or(eq(users.id, sourceUserId), eq(users.id, candidateUserId)));
  });

  it("removes the stored pair and both users' match notifications when evidence no longer matches", async () => {
    const db = await getDb();
    if (!db) throw new Error("Database connection is required.");
    const source = (await db.select().from(reports).where(eq(reports.id, sourceReportId)).limit(1))[0];
    if (!source) throw new Error("Source report was not created.");

    await createPotentialMatches(source);
    expect((await getMatchesForReport(sourceReportId)).some(item => item.candidate.id === candidateReportId)).toBe(true);
    expect((await listNotificationsWithMatchSummary(sourceUserId)).some(item => item.type === "match")).toBe(true);
    expect((await listNotificationsWithMatchSummary(candidateUserId)).some(item => item.type === "match")).toBe(true);

    await db.update(reports).set({ name: "هاتف أزرق اختبار", description: "هاتف أزرق مختلف تمامًا عثر عليه قرب المستشفى", location: "حي المطار" }).where(eq(reports.id, sourceReportId));
    const changedSource = (await db.select().from(reports).where(eq(reports.id, sourceReportId)).limit(1))[0];
    if (!changedSource) throw new Error("Changed source report was not found.");
    await createPotentialMatches(changedSource);

    expect(await getMatchesForReport(sourceReportId)).toEqual([]);
    expect(await getMatchesForReport(candidateReportId)).toEqual([]);
    expect((await listNotificationsWithMatchSummary(sourceUserId)).filter(item => item.type === "match")).toEqual([]);
    expect((await listNotificationsWithMatchSummary(candidateUserId)).filter(item => item.type === "match")).toEqual([]);
  });
});
