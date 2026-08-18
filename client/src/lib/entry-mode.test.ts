import { describe, expect, it } from "vitest";
import { hasChosenGuestMode, shouldShowAccessWelcome } from "./entry-mode";

describe("entry mode", () => {
  it("shows the first-entry decision to unauthenticated visitors", () => {
    expect(shouldShowAccessWelcome(false, null)).toBe(true);
  });

  it("does not show the decision again after visitor mode is selected", () => {
    expect(hasChosenGuestMode("guest")).toBe(true);
    expect(shouldShowAccessWelcome(false, "guest")).toBe(false);
  });

  it("never blocks an authenticated account", () => {
    expect(shouldShowAccessWelcome(true, null)).toBe(false);
  });
});
