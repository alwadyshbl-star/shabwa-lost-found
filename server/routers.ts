import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { timingSafeEqual } from "node:crypto";
import { getSessionCookieOptions } from "./_core/cookies";
import { createLocalSessionToken, LOCAL_SESSION_MAX_AGE_MS } from "./localAuth";
import { hashPassword, normalizeEmail, verifyPassword } from "./password";
import * as db from "./db";
import { ENV } from "./_core/env";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { notificationRouter } from "./routers/notifications";
import { reportRouter } from "./routers/reports";
import { adminRouter } from "./routers/admin";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    register: publicProcedure
      .input(z.object({ name: z.string().trim().min(2, "اكتب الاسم من حرفين على الأقل.").max(120, "الاسم طويل جدًا."), email: z.string().trim().email("أدخل بريدًا إلكترونيًا صحيحًا.").max(320, "البريد الإلكتروني طويل جدًا."), password: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل.").max(128, "كلمة المرور طويلة جدًا."), role: z.enum(["user", "admin"]).default("user"), adminSetupCode: z.string().max(256, "رمز التفعيل طويل جدًا.").optional() }))
      .mutation(async ({ ctx, input }) => {
        const requestedAdmin = input.role === "admin";
        const expectedCode = Buffer.from(ENV.adminSetupCode);
        const suppliedCode = Buffer.from(input.adminSetupCode ?? "");
        const isValidAdminCode = expectedCode.length >= 8 && expectedCode.length === suppliedCode.length && timingSafeEqual(expectedCode, suppliedCode);
        if (requestedAdmin && !isValidAdminCode) {
          throw new TRPCError({ code: "FORBIDDEN", message: "رمز تفعيل المشرف غير صحيح." });
        }
        const email = normalizeEmail(input.email);
        const passwordHash = await hashPassword(input.password);
        const user = await db.createLocalAccount({ name: input.name, email, passwordHash, role: requestedAdmin ? "admin" : "user" });
        if (user === null) throw new TRPCError({ code: "CONFLICT", message: "هذا البريد الإلكتروني مستخدم بالفعل. سجّل الدخول بدلًا من إنشاء حساب جديد." });
        if (!user) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "تعذر إنشاء الحساب حاليًا." });
        const token = await createLocalSessionToken(user.id);
        ctx.res.cookie(COOKIE_NAME, token, { ...getSessionCookieOptions(ctx.req), maxAge: LOCAL_SESSION_MAX_AGE_MS });
        return user;
      }),
    login: publicProcedure
      .input(z.object({ email: z.string().trim().email("أدخل بريدًا إلكترونيًا صحيحًا.").max(320, "البريد الإلكتروني طويل جدًا."), password: z.string().min(1, "اكتب كلمة المرور أولًا.").max(128, "كلمة المرور طويلة جدًا.") }))
      .mutation(async ({ ctx, input }) => {
        const account = await db.getLocalAccountByEmail(normalizeEmail(input.email));
        if (!account) throw new TRPCError({ code: "UNAUTHORIZED", message: "لا يوجد حساب مرتبط بهذا البريد الإلكتروني. تحقق من البريد أو أنشئ حسابًا جديدًا." });
        const valid = await verifyPassword(input.password, account.passwordHash);
        if (!valid) throw new TRPCError({ code: "UNAUTHORIZED", message: "كلمة المرور غير صحيحة. تأكد من كتابتها ثم حاول مجددًا." });
        await db.updateLocalLastSignedIn(account.user.id);
        const token = await createLocalSessionToken(account.user.id);
        ctx.res.cookie(COOKIE_NAME, token, { ...getSessionCookieOptions(ctx.req), maxAge: LOCAL_SESSION_MAX_AGE_MS });
        return account.user;
      }),
    setPassword: protectedProcedure
      .input(z.object({ email: z.string().trim().email("أدخل بريدًا إلكترونيًا صحيحًا.").max(320, "البريد الإلكتروني طويل جدًا."), password: z.string().min(8, "كلمة المرور يجب أن تكون 8 أحرف على الأقل.").max(128, "كلمة المرور طويلة جدًا.") }))
      .mutation(async ({ ctx, input }) => {
        const email = normalizeEmail(input.email);
        if (ctx.user.email && normalizeEmail(ctx.user.email) !== email) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "استخدم البريد المرتبط بحسابك السابق." });
        }
        const user = await db.setLocalPasswordForUser({ userId: ctx.user.id, email, passwordHash: await hashPassword(input.password) });
        if (user === null) throw new TRPCError({ code: "CONFLICT", message: "هذا البريد مرتبط بحساب آخر." });
        if (!user) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "تعذر حفظ كلمة المرور حاليًا." });
        const token = await createLocalSessionToken(user.id);
        ctx.res.cookie(COOKIE_NAME, token, { ...getSessionCookieOptions(ctx.req), maxAge: LOCAL_SESSION_MAX_AGE_MS });
        return user;
      }),
    changePassword: protectedProcedure
      .input(z.object({ currentPassword: z.string().min(1, "اكتب كلمة المرور الحالية أولًا."), newPassword: z.string().min(8, "كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل.").max(128, "كلمة المرور الجديدة طويلة جدًا.") }))
      .mutation(async ({ ctx, input }) => {
        const account = await db.getLocalAccountByUserId(ctx.user.id);
        if (!account) throw new TRPCError({ code: "BAD_REQUEST", message: "لا توجد كلمة مرور محلية لهذا الحساب حاليًا." });
        if (!await verifyPassword(input.currentPassword, account.passwordHash)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "كلمة المرور الحالية غير صحيحة." });
        }
        const updated = await db.updateLocalPasswordHash(ctx.user.id, await hashPassword(input.newPassword));
        if (!updated) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "تعذر تغيير كلمة المرور حاليًا. حاول مرة أخرى." });
        return { success: true } as const;
      }),
    deleteAccount: protectedProcedure
      .input(z.object({ password: z.string().min(1, "اكتب كلمة المرور لتأكيد الحذف."), confirmation: z.string().trim() }))
      .mutation(async ({ ctx, input }) => {
        if (input.confirmation !== "حذف حسابي") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "اكتب «حذف حسابي» لتأكيد الحذف النهائي." });
        }
        const account = await db.getLocalAccountByUserId(ctx.user.id);
        if (!account) throw new TRPCError({ code: "BAD_REQUEST", message: "لا يمكن حذف هذا الحساب عبر كلمة المرور المحلية حاليًا." });
        if (!await verifyPassword(input.password, account.passwordHash)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "كلمة المرور غير صحيحة. لم يُحذف الحساب." });
        }
        const deleted = await db.deleteUserAccount(ctx.user.id);
        if (!deleted) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "تعذر حذف الحساب حاليًا. حاول مرة أخرى." });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
        return { success: true } as const;
      }),
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  report: reportRouter,
  notification: notificationRouter,
  admin: adminRouter,
});

export type AppRouter = typeof appRouter;
