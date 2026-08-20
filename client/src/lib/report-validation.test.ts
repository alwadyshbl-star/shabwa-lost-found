import { describe, expect, it } from "vitest";
import { validateReportDraft } from "./report-validation";

const validDraft = { name: "محفظة", description: "محفظة جلدية بنية قرب السوق المركزي", incidentDate: "2026-08-18", location: "عتق", contactPhone: "771234567" };

describe("validateReportDraft", () => {
  it("explains the first incomplete field in Arabic", () => {
    expect(validateReportDraft({ ...validDraft, description: "قصير" })).toContain("وصفًا أوضح");
  });

  it("rejects an invalid contact number without blocking an empty optional phone", () => {
    expect(validateReportDraft({ ...validDraft, contactPhone: "abc" })).toContain("رقم تواصل صالح");
    expect(validateReportDraft({ ...validDraft, contactPhone: "" })).toBeNull();
  });
});
