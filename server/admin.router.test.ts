import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", () => ({
  getAdminStats: vi.fn().mockResolvedValue({ users: 3, reports: 8, open: 4, recovered: 2, underReview: 1, lost: 5, found: 3 }),
  listAdminUsers: vi.fn().mockResolvedValue([]),
  setUserRole: vi.fn(),
  deleteUserAsAdmin: vi.fn(),
  deleteReportAsAdmin: vi.fn(),
  updateReport: vi.fn().mockResolvedValue({ id: 12, name: "بلاغ معدّل" }),
}));

import * as db from "./db";
import { appRouter } from "./routers";

function context(role: "user" | "admin"): TrpcContext {
  return {
    user: { id: 7, openId: "local:test", name: "اختبار", email: "test@example.com", loginMethod: "local", role, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { cookie: vi.fn(), clearCookie: vi.fn() } as TrpcContext["res"],
  };
}

describe("admin router authorization", () => {
  it("rejects dashboard data for a normal user", async () => {
    const caller = appRouter.createCaller(context("user"));
    await expect(caller.admin.stats()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("returns dashboard data to an administrator", async () => {
    const caller = appRouter.createCaller(context("admin"));
    await expect(caller.admin.stats()).resolves.toMatchObject({ users: 3, reports: 8, underReview: 1 });
  });

  it("prevents an administrator from removing their own administrator role", async () => {
    const caller = appRouter.createCaller(context("admin"));
    await expect(caller.admin.setUserRole({ userId: 7, role: "user" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("allows an administrator to remove another user and a report", async () => {
    const caller = appRouter.createCaller(context("admin"));
    await expect(caller.admin.deleteUser({ userId: 12 })).resolves.toEqual({ success: true });
    await expect(caller.admin.deleteReport({ reportId: 29 })).resolves.toEqual({ success: true });
    expect(db.deleteUserAsAdmin).toHaveBeenCalledWith(12);
    expect(db.deleteReportAsAdmin).toHaveBeenCalledWith(29);
  });

  it("allows an administrator to update a report from the management workflow", async () => {
    const caller = appRouter.createCaller(context("admin"));
    await expect(caller.report.update({ id: 12, reportType: "found", itemKind: "item", name: "بلاغ معدّل", description: "وصف إداري معدل للبلاغ.", incidentDate: "2026-08-19", location: "عتق", imageUrl: "", contactName: "", contactPhone: "" })).resolves.toMatchObject({ id: 12, name: "بلاغ معدّل" });
    expect(db.updateReport).toHaveBeenCalledWith(12, 7, true, expect.objectContaining({ name: "بلاغ معدّل" }));
  });
});
