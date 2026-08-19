import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "../db";
import { storagePut } from "../storage";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";

const reportTypes = ["lost", "found"] as const;
const itemKinds = ["person", "animal", "item"] as const;
const reportStatuses = ["open", "recovered", "under_review"] as const;
const moderationStatuses = ["published", "under_review"] as const;

const reportInput = z.object({
  reportType: z.enum(reportTypes),
  itemKind: z.enum(itemKinds),
  name: z.string().trim().min(2).max(160),
  description: z.string().trim().min(8).max(2_000),
  incidentDate: z.string().min(8).max(32),
  location: z.string().trim().min(2).max(240),
  imageUrl: z.string().url().max(1_024).optional().or(z.literal("")),
  contactName: z.string().trim().max(120).optional().or(z.literal("")),
  contactPhone: z.string().trim().max(32).optional().or(z.literal("")),
});

function requireAdmin(role: string) {
  if (role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "هذه العملية متاحة للمشرف فقط." });
  }
}

function decodeImage(dataUrl: string, mimeType: "image/jpeg" | "image/png" | "image/webp") {
  const [prefix, base64] = dataUrl.split(",", 2);
  if (!prefix || !base64 || prefix !== `data:${mimeType};base64`) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "صيغة الصورة غير صالحة." });
  }
  const buffer = Buffer.from(base64, "base64");
  if (buffer.length === 0 || buffer.length > 4 * 1024 * 1024) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "حجم الصورة يجب ألا يتجاوز 4 ميجابايت." });
  }
  return buffer;
}

export const reportRouter = router({
  stats: publicProcedure.query(() => db.getReportStats()),

  uploadImage: protectedProcedure
    .input(
      z.object({
        dataUrl: z.string().min(32).max(6_000_000),
        mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const extension = input.mimeType === "image/jpeg" ? "jpg" : input.mimeType === "image/png" ? "png" : "webp";
      const buffer = decodeImage(input.dataUrl, input.mimeType);
      const uploaded = await storagePut(`reports/${ctx.user.id}/${Date.now()}.${extension}`, buffer, input.mimeType);
      return { url: uploaded.url };
    }),

  list: publicProcedure
    .input(
      z
        .object({
          query: z.string().trim().max(160).optional(),
          itemKind: z.enum(itemKinds).optional(),
          reportType: z.enum(reportTypes).optional(),
          status: z.enum(reportStatuses).optional(),
          location: z.string().trim().max(160).optional(),
          dateFrom: z.string().max(32).optional(),
          dateTo: z.string().max(32).optional(),
        })
        .optional(),
    )
    .query(({ input }) => db.listPublicReports(input)),

  get: publicProcedure.input(z.object({ id: z.number().int().positive() })).query(({ input }) =>
    db.getPublicReport(input.id),
  ),

  create: protectedProcedure.input(reportInput).mutation(async ({ ctx, input }) => {
    const report = await db.createReport({
      ...input,
      imageUrl: input.imageUrl || null,
      contactName: input.contactName || null,
      contactPhone: input.contactPhone || null,
      userId: ctx.user.id,
    });
    if (!report) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "تعذر حفظ البلاغ." });
    }

    const matches = await db.createPotentialMatches(report);
    return { report, matches };
  }),

  mine: protectedProcedure.query(({ ctx }) => db.listReportsByUser(ctx.user.id)),

  getMine: protectedProcedure.input(z.object({ id: z.number().int().positive() })).query(({ ctx, input }) =>
    db.getReportForOwner(input.id, ctx.user.id, ctx.user.role === "admin"),
  ),

  update: protectedProcedure
    .input(reportInput.extend({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const updated = await db.updateReport(input.id, ctx.user.id, ctx.user.role === "admin", {
        reportType: input.reportType,
        itemKind: input.itemKind,
        name: input.name,
        description: input.description,
        incidentDate: input.incidentDate,
        location: input.location,
        imageUrl: input.imageUrl || null,
        contactName: input.contactName || null,
        contactPhone: input.contactPhone || null,
      });
      if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "لا يمكن تعديل هذا البلاغ." });
      return updated;
    }),

  recover: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const updated = await db.markReportRecovered(input.id, ctx.user.id, ctx.user.role === "admin");
      if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "لم يتم العثور على البلاغ." });
      return updated;
    }),

  matches: protectedProcedure
    .input(z.object({ reportId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const report = await db.getReportForOwner(input.reportId, ctx.user.id, ctx.user.role === "admin");
      if (!report) throw new TRPCError({ code: "NOT_FOUND", message: "لا يمكن الوصول إلى هذا البلاغ." });
      return db.getMatchesForReport(input.reportId);
    }),

  reportMatch: protectedProcedure
    .input(z.object({ reportId: z.number().int().positive(), candidateReportId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const report = await db.getReportForOwner(input.reportId, ctx.user.id, ctx.user.role === "admin");
      if (!report) throw new TRPCError({ code: "FORBIDDEN", message: "لا يمكنك الإبلاغ عن تطابق لهذا البلاغ." });
      await db.flagMatchForReview(input.reportId, input.candidateReportId);
      return { success: true };
    }),

  adminList: protectedProcedure.query(({ ctx }) => {
    requireAdmin(ctx.user.role);
    return db.listAllReports();
  }),

  moderate: protectedProcedure
    .input(z.object({ id: z.number().int().positive(), moderationStatus: z.enum(moderationStatuses) }))
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.user.role);
      const updated = await db.updateModerationStatus(input.id, input.moderationStatus);
      if (!updated) throw new TRPCError({ code: "NOT_FOUND", message: "لم يتم العثور على البلاغ." });
      return updated;
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      requireAdmin(ctx.user.role);
      await db.deleteReportAsAdmin(input.id);
      return { success: true } as const;
    }),
});
