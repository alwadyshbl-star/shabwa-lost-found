import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../_core/context";

vi.mock("../db", () => ({
  getReportStats: vi.fn(),
  listPublicReports: vi.fn(),
  getPublicReport: vi.fn(),
  createReport: vi.fn(),
  createPotentialMatches: vi.fn(),
  listReportsByUser: vi.fn(),
  getReportForOwner: vi.fn(),
  updateReport: vi.fn(),
  markReportRecovered: vi.fn(),
  getMatchesForReport: vi.fn(),
  flagMatchForReview: vi.fn(),
  listAllReports: vi.fn(),
  updateModerationStatus: vi.fn(),
}));

vi.mock("../storage", () => ({ storagePut: vi.fn() }));

import * as db from "../db";
import { reportRouter } from "./reports";

function context(role: "user" | "admin" = "user"): TrpcContext {
  return {
    user: {
      id: 7,
      openId: "report-test-user",
      name: "مستخدم الاختبار",
      email: "user@example.com",
      loginMethod: "manus",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: {} as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

const updatePayload = {
  id: 12,
  reportType: "lost" as const,
  itemKind: "item" as const,
  name: "محفظة بنية",
  description: "محفظة جلدية بنية قرب السوق المركزي",
  incidentDate: "2026-08-15",
  location: "عتق",
  imageUrl: "",
  contactName: "أحمد",
  contactPhone: "771234567",
};

describe("report router", () => {
  beforeEach(() => vi.clearAllMocks());

  it("passes the advanced search filters to the data layer", async () => {
    vi.mocked(db.listPublicReports).mockResolvedValue([]);
    const caller = reportRouter.createCaller(context());

    await caller.list({
      query: "محفظة",
      itemKind: "item",
      reportType: "lost",
      status: "open",
      location: "عتق",
      dateFrom: "2026-08-01",
      dateTo: "2026-08-31",
    });

    expect(db.listPublicReports).toHaveBeenCalledWith({
      query: "محفظة",
      itemKind: "item",
      reportType: "lost",
      status: "open",
      location: "عتق",
      dateFrom: "2026-08-01",
      dateTo: "2026-08-31",
    });
  });

  it("marks an owned report as recovered with the current user's identity", async () => {
    vi.mocked(db.markReportRecovered).mockResolvedValue({ id: 12, status: "recovered" } as never);
    const caller = reportRouter.createCaller(context());

    await expect(caller.recover({ id: 12 })).resolves.toMatchObject({ id: 12, status: "recovered" });
    expect(db.markReportRecovered).toHaveBeenCalledWith(12, 7, false);
  });

  it("rejects editing a report the current user does not own", async () => {
    vi.mocked(db.updateReport).mockResolvedValue(undefined);
    const caller = reportRouter.createCaller(context());

    await expect(caller.update(updatePayload)).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "لا يمكن تعديل هذا البلاغ.",
    });
  });

  it("blocks the administration list for a non-admin account", async () => {
    const caller = reportRouter.createCaller(context("user"));
    await expect(caller.adminList()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
