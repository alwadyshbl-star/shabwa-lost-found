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

    expect(score).toBeGreaterThanOrEqual(50);
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

    expect(score).toBeLessThan(50);
  });

  it("matches Arabic spelling variants when the rest of the evidence aligns", () => {
    const score = calculateMatchScore(
      { ...lostWallet, name: "محفظة جلدية سوداء", description: "محفظه سوداء فيها بطاقه هوية ومفتاح صغير" },
      { reportType: "found", itemKind: "item", name: "محفظه جلديه سوداء", description: "وجدت محفظة سوداء تحتوي على بطاقة هوية ومفتاح", location: "سوق عتق المركزي", incidentDate: "2026-08-12" },
    );
    expect(score).toBeGreaterThanOrEqual(50);
  });

  it("rejects same-kind reports with no shared name or description evidence", () => {
    const score = calculateMatchScore(lostWallet, {
      reportType: "found",
      itemKind: "item",
      name: "هاتف أزرق",
      description: "هاتف حديث عثر عليه قرب المستشفى",
      location: "سوق عتق المركزي",
      incidentDate: "2026-08-10",
    });
    expect(score).toBe(0);
  });
});
