import { COOKIE_NAME } from "@shared/const";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getSessionCookieOptions } from "./_core/cookies";
import { createLocalSessionToken, LOCAL_SESSION_MAX_AGE_MS } from "./localAuth";
import { hashPassword, normalizeEmail, verifyPassword } from "./password";
import * as db from "./db";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { notificationRouter } from "./routers/notifications";
import { reportRouter } from "./routers/reports";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    register: publicProcedure
      .input(z.object({ name: z.string().trim().min(2).max(120), email: z.string().trim().email().max(320), password: z.string().min(8).max(128) }))
      .mutation(async ({ ctx, input }) => {
        const email = normalizeEmail(input.email);
        const passwordHash = await hashPassword(input.password);
        const user = await db.createLocalAccount({ name: input.name, email, passwordHash });
        if (user === null) throw new TRPCError({ code: "CONFLICT", message: "هذا البريد الإلكتروني مستخدم بالفعل. سجّل الدخول بدلًا من إنشاء حساب جديد." });
        if (!user) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "تعذر إنشاء الحساب حاليًا." });
        const token = await createLocalSessionToken(user.id);
        ctx.res.cookie(COOKIE_NAME, token, { ...getSessionCookieOptions(ctx.req), maxAge: LOCAL_SESSION_MAX_AGE_MS });
        return user;
      }),
    login: publicProcedure
      .input(z.object({ email: z.string().trim().email().max(320), password: z.string().min(1).max(128) }))
      .mutation(async ({ ctx, input }) => {
        const account = await db.getLocalAccountByEmail(normalizeEmail(input.email));
        const valid = account ? await verifyPassword(input.password, account.passwordHash) : false;
        if (!account || !valid) throw new TRPCError({ code: "UNAUTHORIZED", message: "البريد الإلكتروني أو كلمة المرور غير صحيحة." });
        await db.updateLocalLastSignedIn(account.user.id);
        const token = await createLocalSessionToken(account.user.id);
        ctx.res.cookie(COOKIE_NAME, token, { ...getSessionCookieOptions(ctx.req), maxAge: LOCAL_SESSION_MAX_AGE_MS });
        return account.user;
      }),
    setPassword: protectedProcedure
      .input(z.object({ email: z.string().trim().email().max(320), password: z.string().min(8).max(128) }))
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
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  report: reportRouter,
  notification: notificationRouter,
});

export type AppRouter = typeof appRouter;
