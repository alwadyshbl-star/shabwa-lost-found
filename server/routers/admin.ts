import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "../db";
import { adminProcedure, router } from "../_core/trpc";

export const adminRouter = router({
  stats: adminProcedure.query(() => db.getAdminStats()),
  users: adminProcedure.query(() => db.listAdminUsers()),
  setUserRole: adminProcedure
    .input(z.object({ userId: z.number().int().positive(), role: z.enum(["user", "admin"]) }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.id === input.userId && input.role !== "admin") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "لا يمكنك إزالة دور المشرف من حسابك الحالي." });
      }
      const user = await db.setUserRole(input.userId, input.role);
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "لم يتم العثور على المستخدم." });
      return user;
    }),
  deleteUser: adminProcedure
    .input(z.object({ userId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.id === input.userId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "لا يمكنك حذف حسابك الحالي من لوحة الإدارة." });
      }
      await db.deleteUserAsAdmin(input.userId);
      return { success: true } as const;
    }),
  deleteReport: adminProcedure
    .input(z.object({ reportId: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      await db.deleteReportAsAdmin(input.reportId);
      return { success: true } as const;
    }),
});
