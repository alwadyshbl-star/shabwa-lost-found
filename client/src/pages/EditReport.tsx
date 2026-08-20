import { useAuth } from "@/_core/hooks/useAuth";
import AppFrame from "@/components/AppFrame";
import { Button } from "@/components/ui/button";
import { itemKindLabels, ItemKind, reportTypeLabels, ReportType } from "@/lib/report-utils";
import { getFriendlyErrorMessage } from "@/lib/error-utils";
import { validateReportDraft } from "@/lib/report-validation";
import { trpc } from "@/lib/trpc";
import { ArrowRight, ImageOff, Loader2, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation, useRoute } from "wouter";
import { toast } from "sonner";

export default function EditReport() {
  const [, params] = useRoute("/reports/:id/edit");
  const reportId = Number(params?.id);
  const { isAuthenticated, loading } = useAuth();
  const report = trpc.report.getMine.useQuery({ id: reportId }, { enabled: isAuthenticated && Number.isFinite(reportId) && reportId > 0 });
  const update = trpc.report.update.useMutation();
  const [, navigate] = useLocation();
  const [reportType, setReportType] = useState<ReportType>("lost");
  const [itemKind, setItemKind] = useState<ItemKind>("item");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [incidentDate, setIncidentDate] = useState("");
  const [location, setLocation] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!report.data) return;
    setReportType(report.data.reportType);
    setItemKind(report.data.itemKind);
    setName(report.data.name);
    setDescription(report.data.description);
    setIncidentDate(report.data.incidentDate);
    setLocation(report.data.location);
    setContactName(report.data.contactName ?? "");
    setContactPhone(report.data.contactPhone ?? "");
  }, [report.data]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const validationError = validateReportDraft({ name, description, incidentDate, location, contactPhone });
    if (validationError) {
      setFormError(validationError);
      toast.error(validationError);
      return;
    }
    setFormError("");
    try {
      await update.mutateAsync({ id: reportId, reportType, itemKind, name: name.trim(), description: description.trim(), incidentDate, location: location.trim(), imageUrl: report.data?.imageUrl ?? "", contactName: contactName.trim(), contactPhone: contactPhone.trim() });
      toast.success("تم تحديث البلاغ.");
      navigate("/my-reports");
    } catch (error) {
      const message = getFriendlyErrorMessage(error, "تعذر تحديث البلاغ حاليًا. حاول مرة أخرى.");
      setFormError(message);
      toast.error(message);
    }
  };

  if (!loading && !isAuthenticated) return <AppFrame><section className="container py-20"><div className="empty-state mx-auto max-w-xl"><h1>تحتاج إلى تسجيل الدخول</h1><p>سجّل دخولك لتعديل بلاغاتك الخاصة.</p></div></section></AppFrame>;
  if (report.isLoading) return <AppFrame><div className="container py-20"><div className="mx-auto h-[520px] max-w-4xl animate-pulse rounded-[1.7rem] bg-[#e9eeea]" /></div></AppFrame>;
  if (!report.data) return <AppFrame><section className="container py-20"><div className="empty-state mx-auto max-w-xl"><h1>لا يمكن الوصول إلى البلاغ</h1><p>قد لا يكون البلاغ موجودًا أو لا يخص حسابك.</p></div></section></AppFrame>;

  return <AppFrame><section className="page-heading"><div className="container"><Link href="/my-reports" className="inline-flex items-center gap-1 text-sm font-bold text-[#59746a]"><ArrowRight size={16} />العودة إلى بلاغاتي</Link><p className="eyebrow mt-5">تعديل البلاغ</p><h1 className="page-title">حدّث تفاصيل البلاغ</h1><p className="page-subtitle">تساعد التفاصيل الدقيقة في إبقاء نتائج البحث والمطابقة أكثر فائدة.</p></div></section><section className="container -mt-5"><form noValidate onSubmit={submit} className="mx-auto max-w-4xl rounded-[1.7rem] border border-[#e3e9e4] bg-white p-5 shadow-[0_18px_45px_rgba(27,75,61,0.07)] sm:p-8">{formError && <div className="form-error" role="alert">{formError}</div>}<div className="mb-8 grid gap-5 border-b border-[#edf0ed] pb-7 sm:grid-cols-2"><div><p className="field-label">نوع البلاغ</p><div className="segmented-control">{(["lost", "found"] as ReportType[]).map(type => <button key={type} type="button" onClick={() => setReportType(type)} className={reportType === type ? "segmented-active" : ""}>{reportTypeLabels[type]}</button>)}</div></div><div><p className="field-label">نوع الحالة</p><div className="segmented-control">{(["person", "animal", "item"] as ItemKind[]).map(kind => <button key={kind} type="button" onClick={() => setItemKind(kind)} className={itemKind === kind ? "segmented-active" : ""}>{itemKindLabels[kind]}</button>)}</div></div></div><div className="grid gap-5 sm:grid-cols-2"><label className="form-field sm:col-span-2"><span>الاسم أو العنوان المختصر</span><input value={name} onChange={event => setName(event.target.value)} maxLength={160} /></label><label className="form-field sm:col-span-2"><span>الوصف</span><textarea value={description} onChange={event => setDescription(event.target.value)} maxLength={2000} rows={5} /></label><label className="form-field"><span>تاريخ الحادثة</span><input type="date" value={incidentDate} onChange={event => setIncidentDate(event.target.value)} /></label><label className="form-field"><span>الموقع</span><input value={location} onChange={event => setLocation(event.target.value)} maxLength={240} /></label><label className="form-field"><span>اسم للتواصل <em>اختياري</em></span><input value={contactName} onChange={event => setContactName(event.target.value)} maxLength={120} /></label><label className="form-field"><span>رقم للتواصل <em>اختياري</em></span><input value={contactPhone} onChange={event => setContactPhone(event.target.value)} maxLength={32} /></label></div><div className="coming-soon-panel mt-6"><ImageOff size={26} /><strong>رفع وتغيير الصور قيد التطوير</strong><span className="mt-1 text-xs">تُحفظ الصورة الحالية إن وُجدت، ولا يمكن إضافة صورة جديدة الآن.</span></div><div className="mt-7 flex justify-end border-t border-[#edf0ed] pt-6"><Button type="submit" disabled={update.isPending} className="h-11 rounded-xl bg-[#0d5a4d] px-6 font-bold text-white hover:bg-[#07473d]">{update.isPending ? <><Loader2 size={17} className="animate-spin" />جارٍ الحفظ</> : <><Save size={17} />حفظ التعديلات</>}</Button></div></form></section></AppFrame>;
}
