import { describe, expect, it } from "vitest";
import { getFriendlyErrorMessage } from "./error-utils";

describe("getFriendlyErrorMessage", () => {
  it("translates generic validation messages to a useful Arabic instruction", () => {
    expect(getFriendlyErrorMessage(new Error("Invalid email"), "تعذر الحفظ.")).toContain("بريدًا إلكترونيًا صحيحًا");
    expect(getFriendlyErrorMessage(new Error("Too small"), "تعذر الحفظ.")).toContain("الحقول المطلوبة");
  });

  it("keeps specific Arabic server messages intact", () => {
    const message = "هذا البريد الإلكتروني مستخدم بالفعل. سجّل الدخول بدلًا من إنشاء حساب جديد.";
    expect(getFriendlyErrorMessage(new Error(message), "تعذر الحفظ.")).toBe(message);
  });

  it("keeps authorization messages for match reporting and administration intact", () => {
    const matchMessage = "لا يمكنك الإبلاغ عن تطابق لهذا البلاغ.";
    const adminMessage = "هذه العملية متاحة للمشرف فقط.";

    expect(getFriendlyErrorMessage(new Error(matchMessage), "تعذر إرسال طلب التطابق.")).toBe(matchMessage);
    expect(getFriendlyErrorMessage(new Error(adminMessage), "تعذر تنفيذ الإجراء الإداري.")).toBe(adminMessage);
  });
});
