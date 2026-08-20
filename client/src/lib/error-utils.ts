export function getFriendlyErrorMessage(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message.trim() : "";
  if (!message) return fallback;

  const normalized = message.toLowerCase();
  if (normalized.includes("invalid email") || normalized.includes("invalid format")) return "أدخل بريدًا إلكترونيًا صحيحًا، مثل name@example.com.";
  if (normalized.includes("too small") || normalized.includes("too short")) return "أكمل الحقول المطلوبة بالتفاصيل الكافية قبل المتابعة.";
  if (normalized.includes("required") || normalized.includes("invalid input")) return "تحقق من الحقول المطلوبة ثم حاول مرة أخرى.";
  if (normalized.includes("unauthorized")) return "انتهت جلسة الدخول أو لا تملك صلاحية لهذه العملية. سجّل الدخول ثم حاول مجددًا.";
  if (normalized.includes("network") || normalized.includes("failed to fetch")) return "تعذر الاتصال بالخدمة حاليًا. تحقق من الإنترنت ثم حاول مرة أخرى.";
  return message;
}
