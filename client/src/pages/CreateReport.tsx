import { useAuth } from "@/_core/hooks/useAuth";
import AppFrame from "@/components/AppFrame";
import { Button } from "@/components/ui/button";
import { startLogin } from "@/const";
import { itemKindLabels, ItemKind, reportTypeLabels, ReportType } from "@/lib/report-utils";
import { trpc } from "@/lib/trpc";
import { AlertCircle, ArrowLeft, CheckCircle2, ImagePlus, Loader2, Sparkles, UploadCloud } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import ReportCreatedSuccess from "@/components/ReportCreatedSuccess";

type ImageDraft = { dataUrl: string; mimeType: "image/jpeg" | "image/png" | "image/webp"; name: string };

export default function CreateReport() {
  const { isAuthenticated, loading } = useAuth();
  const [reportType, setReportType] = useState<ReportType>("lost");
  const [itemKind, setItemKind] = useState<ItemKind>("item");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [incidentDate, setIncidentDate] = useState("");
  const [location, setLocation] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [image, setImage] = useState<ImageDraft | null>(null);
  const [result, setResult] = useState<{ id: number; matches: Array<{ score: number; candidate: { id: number; name: string; location: string; reportType: ReportType } }> } | null>(null);
  const upload = trpc.report.uploadImage.useMutation();
  const create = trpc.report.create.useMutation();

  const handleImage = (file?: File) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { toast.error("اختر صورة بصيغة JPG أو PNG أو WebP."); return; }
    if (file.size > 4 * 1024 * 1024) { toast.error("الحد الأقصى لحجم الصورة هو 4 ميجابايت."); return; }
    const reader = new FileReader();
    reader.onload = () => setImage({ dataUrl: String(reader.result), mimeType: file.type as ImageDraft["mimeType"], name: file.name });
    reader.readAsDataURL(file);
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      let imageUrl = "";
      if (image) imageUrl = (await upload.mutateAsync({ dataUrl: image.dataUrl, mimeType: image.mimeType })).url;
      const response = await create.mutateAsync({ reportType, itemKind, name, description, incidentDate, location, imageUrl, contactName, contactPhone });
      setResult({ id: response.report.id, matches: response.matches });
      toast.success("تم حفظ البلاغ بنجاح.");
    } catch (error) { toast.error(error instanceof Error ? error.message : "تعذر حفظ البلاغ. حاول مجددًا."); }
  };

  if (!loading && !isAuthenticated) return <AppFrame><section className="container py-20"><div className="mx-auto max-w-xl rounded-[2rem] border border-[#deebe5] bg-white p-8 text-center shadow-[0_18px_42px_rgba(24,70,57,0.08)]"><span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#e6f2ed] text-[#0d5a4d]"><UploadCloud size={25} /></span><h1 className="mt-5 font-display text-3xl font-black text-[#173e35]">أضف بلاغك بثقة</h1><p className="mt-3 leading-7 text-[#68766e]">ستحتاج إلى تسجيل الدخول أو إنشاء حساب لإدارة بلاغك، واستقبال تنبيهات التطابقات، وتحديث الحالة إلى «تم الاسترجاع» لاحقًا.</p><Button onClick={startLogin} className="mt-7 h-11 rounded-xl bg-[#0d5a4d] px-6 font-bold text-white hover:bg-[#07473d]">تسجيل الدخول أو إنشاء حساب</Button></div></section></AppFrame>;
  if (result) return <AppFrame><ReportCreatedSuccess result={result} /></AppFrame>;

  return <AppFrame><section className="page-heading"><div className="container"><p className="eyebrow">بلاغ جديد</p><h1 className="page-title">أخبرنا بما حدث</h1><p className="page-subtitle">كلما كانت التفاصيل أوضح، كانت المطابقة والبحث أكثر فائدة للمجتمع.</p></div></section><section className="container -mt-5 pb-5"><form onSubmit={submit} className="mx-auto max-w-4xl rounded-[1.7rem] border border-[#e3e9e4] bg-white p-5 shadow-[0_18px_45px_rgba(27,75,61,0.07)] sm:p-8"><div className="mb-8 grid gap-5 border-b border-[#edf0ed] pb-7 sm:grid-cols-2"><div><p className="field-label">نوع البلاغ</p><div className="segmented-control">{(["lost", "found"] as ReportType[]).map(type => <button key={type} type="button" onClick={() => setReportType(type)} className={reportType === type ? "segmented-active" : ""}>{reportTypeLabels[type]}</button>)}</div></div><div><p className="field-label">نوع الحالة</p><div className="segmented-control">{(["person", "animal", "item"] as ItemKind[]).map(kind => <button key={kind} type="button" onClick={() => setItemKind(kind)} className={itemKind === kind ? "segmented-active" : ""}>{itemKindLabels[kind]}</button>)}</div></div></div><div className="grid gap-5 sm:grid-cols-2"><label className="form-field sm:col-span-2"><span>الاسم أو العنوان المختصر</span><input value={name} onChange={event => setName(event.target.value)} placeholder="مثال: محفظة جلدية بنية" required minLength={2} maxLength={160} /></label><label className="form-field sm:col-span-2"><span>الوصف</span><textarea value={description} onChange={event => setDescription(event.target.value)} placeholder="اذكر العلامات المميزة، الحالة، اللون، وما يساعد على التعرّف عليه." required minLength={8} maxLength={2000} rows={5} /></label><label className="form-field"><span>تاريخ الحادثة</span><input type="date" value={incidentDate} onChange={event => setIncidentDate(event.target.value)} required /></label><label className="form-field"><span>الموقع</span><input value={location} onChange={event => setLocation(event.target.value)} placeholder="المدينة، الحي أو المعلم القريب" required minLength={2} maxLength={240} /></label><label className="form-field"><span>اسم للتواصل <em>اختياري</em></span><input value={contactName} onChange={event => setContactName(event.target.value)} placeholder="الاسم الأول يكفي" maxLength={120} /></label><label className="form-field"><span>رقم للتواصل <em>اختياري</em></span><input value={contactPhone} onChange={event => setContactPhone(event.target.value)} placeholder="مثال: 77xxxxxxxx" maxLength={32} /></label></div><div className="mt-6"><p className="field-label">صورة <span className="font-normal text-[#8a9890]">اختيارية — JPG أو PNG أو WebP، حتى 4 م.ب</span></p><label className="image-dropzone"><input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => handleImage(event.target.files?.[0])} className="sr-only" />{image ? <><img src={image.dataUrl} alt="معاينة الصورة المرفوعة" /><span className="absolute inset-x-3 bottom-3 rounded-lg bg-[#173e35]/85 px-3 py-2 text-xs font-bold text-white">{image.name}</span></> : <><ImagePlus size={28} /><span className="mt-2 font-bold">اختر صورة للبلاغ</span><span className="mt-1 text-xs text-[#74827a]">تساعد الصورة في التحقق، ولا تُشترط للنشر.</span></>}</label></div><div className="mt-8 flex flex-col-reverse justify-between gap-4 border-t border-[#edf0ed] pt-6 sm:flex-row sm:items-center"><p className="flex max-w-xl items-start gap-2 text-xs leading-6 text-[#748279]"><AlertCircle size={16} className="mt-0.5 shrink-0 text-[#bb7c1f]" />لا تنشر وثائق هوية أو بيانات حساسة. لا تعتمد على المطابقة وحدها قبل التحقق من الملكية.</p><Button type="submit" disabled={create.isPending || upload.isPending} className="h-11 rounded-xl bg-[#0d5a4d] px-6 font-bold text-white hover:bg-[#07473d]">{create.isPending || upload.isPending ? <><Loader2 className="animate-spin" size={17} />جارٍ الحفظ</> : <><Sparkles size={17} />نشر البلاغ ومقارنة التطابقات</>}</Button></div></form></section></AppFrame>;
}
