import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", () => ({
  createLocalAccount: vi.fn(),
  getLocalAccountByEmail: vi.fn(),
  setLocalPasswordForUser: vi.fn(),
  updateLocalLastSignedIn: vi.fn(),
}));

vi.mock("./localAuth", () => ({
  createLocalSessionToken: vi.fn(),
  LOCAL_SESSION_MAX_AGE_MS: 2_592_000_000,
}));

import * as db from "./db";
import { createLocalSessionToken } from "./localAuth";
import { appRouter } from "./routers";
import { hashPassword } from "./password";
import { COOKIE_NAME } from "../shared/const";

const user = {
  id: 41,
  openId: "local:test-user",
  name: "صالح",
  email: "saleh@example.com",
  loginMethod: "local",
  role: "user" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

function context(): { ctx: TrpcContext; cookies: Array<{ name: string; value: string }> } {
  const cookies: Array<{ name: string; value: string }> = [];
  return {
    ctx: {
      user: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: { cookie: (name: string, value: string) => cookies.push({ name, value }), clearCookie: vi.fn() } as TrpcContext["res"],
    },
    cookies,
  };
}

describe("local auth router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createLocalSessionToken).mockResolvedValue("local-session-token");
  });

  it("creates a first-party account and writes a secure session cookie", async () => {
    vi.mocked(db.createLocalAccount).mockResolvedValue(user);
    const { ctx, cookies } = context();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.auth.register({ name: "صالح", email: "SALEH@example.com", password: "AhtarPass2026" })).resolves.toMatchObject({ id: 41, email: "saleh@example.com" });
    expect(db.createLocalAccount).toHaveBeenCalledWith(expect.objectContaining({ email: "saleh@example.com", name: "صالح", role: "user", passwordHash: expect.stringMatching(/^scrypt\$/) }));
    expect(cookies).toEqual([{ name: COOKIE_NAME, value: "local-session-token" }]);
  });

  it("accepts an administrator registration only when the configured setup code is supplied", async () => {
    const setupCode = process.env.ADMIN_SETUP_CODE;
    if (!setupCode) throw new Error("ADMIN_SETUP_CODE must be configured for the admin activation test");
    vi.mocked(db.createLocalAccount).mockResolvedValue({ ...user, role: "admin" });
    const { ctx } = context();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.auth.register({ name: "مدير", email: "admin@example.com", password: "AhtarPass2026", role: "admin", adminSetupCode: setupCode })).resolves.toMatchObject({ role: "admin" });
    expect(db.createLocalAccount).toHaveBeenCalledWith(expect.objectContaining({ role: "admin" }));
  });

  it("rejects administrator registration with an invalid setup code", async () => {
    const { ctx } = context();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.auth.register({ name: "مدير", email: "blocked@example.com", password: "AhtarPass2026", role: "admin", adminSetupCode: "incorrect-code" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("explains that an email has no registered local account", async () => {
    vi.mocked(db.getLocalAccountByEmail).mockResolvedValue(null);
    const { ctx, cookies } = context();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.auth.login({ email: "unknown@example.com", password: "AhtarPass2026" })).rejects.toThrow("لا يوجد حساب مرتبط بهذا البريد الإلكتروني. تحقق من البريد أو أنشئ حسابًا جديدًا.");
    expect(cookies).toEqual([]);
  });

  it("explains that a registered account has an incorrect password without creating a session", async () => {
    vi.mocked(db.getLocalAccountByEmail).mockResolvedValue({ user, passwordHash: await hashPassword("AhtarPass2026") });
    const { ctx, cookies } = context();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.auth.login({ email: "saleh@example.com", password: "wrong-password" })).rejects.toThrow("كلمة المرور غير صحيحة. تأكد من كتابتها ثم حاول مجددًا.");
    expect(cookies).toEqual([]);
  });

  it("signs in an existing local account and exposes it through auth.me", async () => {
    vi.mocked(db.getLocalAccountByEmail).mockResolvedValue({ user, passwordHash: await hashPassword("AhtarPass2026") });
    const { ctx, cookies } = context();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.auth.login({ email: "SALEH@example.com", password: "AhtarPass2026" })).resolves.toMatchObject({ id: 41, email: "saleh@example.com" });
    expect(db.updateLocalLastSignedIn).toHaveBeenCalledWith(41);
    expect(cookies).toEqual([{ name: COOKIE_NAME, value: "local-session-token" }]);

    const authenticatedCaller = appRouter.createCaller({ ...ctx, user });
    await expect(authenticatedCaller.auth.me()).resolves.toMatchObject({ id: 41, email: "saleh@example.com" });
  });

  it("blocks password linking when no authenticated user is present", async () => {
    const { ctx } = context();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.auth.setPassword({ email: "saleh@example.com", password: "AhtarPass2026" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
