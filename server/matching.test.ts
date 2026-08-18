import { describe, expect, it } from "vitest";
import { calculateMatchScore } from "./matching";

const lostWallet = {
  reportType: "lost" as const,
  itemKind: "item" as const,
  name: "محفظة جلدية بنية",
  description: "محفظة بنية تحتوي على بطاقات شخصية",
  location: "سوق عتق المركزي",
  incidentDate: "2026-08-10",
};

describe("calculateMatchScore", () => {
  it("gives a meaningful score to opposite reports with shared evidence", () => {
    const score = calculateMatchScore(lostWallet, {
      reportType: "found",
      itemKind: "item",
      name: "محفظة بنية",
      description: "عثرت على محفظة جلدية وبداخلها بطاقات",
      location: "السوق المركزي في عتق",
      incidentDate: "2026-08-11",
    });

    expect(score).toBeGreaterThanOrEqual(45);
  });

  it("does not match reports of the same direction", () => {
    expect(calculateMatchScore(lostWallet, { ...lostWallet, reportType: "lost" })).toBe(0);
  });

  it("keeps unrelated reports below the likely-match threshold", () => {
    const score = calculateMatchScore(lostWallet, {
      reportType: "found",
      itemKind: "animal",
      name: "قطة بيضاء",
      description: "قطة صغيرة بالقرب من الحديقة",
      location: "حي المطار",
      incidentDate: "2025-01-01",
    });

    expect(score).toBeLessThan(45);
  });
});
