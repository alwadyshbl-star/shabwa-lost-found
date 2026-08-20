export type ReportDraft = {
  name: string;
  description: string;
  incidentDate: string;
  location: string;
  contactPhone?: string;
};

export function validateReportDraft(draft: ReportDraft): string | null {
  if (draft.name.trim().length < 2) return "اكتب اسمًا أو عنوانًا مختصرًا من حرفين على الأقل للبلاغ.";
  if (draft.description.trim().length < 8) return "أضف وصفًا أوضح من 8 أحرف على الأقل ليساعد في العثور على تطابق.";
  if (!draft.incidentDate) return "اختر تاريخ حدوث الحالة.";
  if (Number.isNaN(Date.parse(draft.incidentDate))) return "تاريخ الحادثة غير صالح. اختر تاريخًا صحيحًا.";
  if (new Date(`${draft.incidentDate}T23:59:59`).getTime() > Date.now()) return "لا يمكن أن يكون تاريخ الحادثة في المستقبل.";
  if (draft.location.trim().length < 2) return "اكتب المدينة أو الحي أو معلمًا قريبًا للموقع.";
  if (draft.contactPhone?.trim() && !/^[+\d\s()-]{7,32}$/.test(draft.contactPhone.trim())) return "أدخل رقم تواصل صالحًا، أو اترك الحقل فارغًا.";
  return null;
}
