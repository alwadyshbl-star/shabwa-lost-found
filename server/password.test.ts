import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("local password hashing", () => {
  it("stores a salted hash instead of the original password", async () => {
    const password = "AhtarPass2026";
    const hash = await hashPassword(password);
    expect(hash).toMatch(/^scrypt\$[a-f0-9]+\$[a-f0-9]+$/);
    expect(hash).not.toContain(password);
  });

  it("accepts the correct password and rejects a wrong one", async () => {
    const hash = await hashPassword("AhtarPass2026");
    await expect(verifyPassword("AhtarPass2026", hash)).resolves.toBe(true);
    await expect(verifyPassword("wrong-password", hash)).resolves.toBe(false);
  });
});
