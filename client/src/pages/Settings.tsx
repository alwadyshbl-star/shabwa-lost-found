import { useAuth } from "@/_core/hooks/useAuth";
import AppFrame from "@/components/AppFrame";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { getFriendlyErrorMessage } from "@/lib/error-utils";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, ArrowRight, CheckCircle2, Eye, EyeOff, KeyRound, Loader2, LockKeyhole, Mail, ShieldCheck, Trash2, UserRound } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

export default function Settings() {
  const { user, isAuthenticated, loading } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const changePassword = trpc.auth.changePassword.useMutation();
  const deleteAccount = trpc.auth.deleteAccount.useMutation();

  const submitPasswordChange = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!currentPassword) return setPasswordError("اكتب كلمة المرور الحالية أولًا.");
    if (newPassword.length < 8) return setPasswordError("كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل.");
    if (newPassword !== confirmPassword) return setPasswordError("تأكيد كلمة المرور لا يطابق كلمة المرور الجديدة.");

    setPasswordError("");
    try {
      await changePassword.mutateAsync({ currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("تم تغيير كلمة المرور بنجاح.");
    } catch (error) {
      const message = getFriendlyErrorMessage(error, "تعذر تغيير كلمة المرور حاليًا. حاول مرة أخرى.");
      setPasswordError(message);
      toast.error(message);
    }
  };

  const submitAccountDeletion = async () => {
    if (!deletePassword) return setDeleteError("اكتب كلمة المرور لتأكيد الحذف.");
    if (deleteConfirmation.trim() !== "حذف حسابي") return setDeleteError("اكتب «حذف حسابي» لتأكيد الحذف النهائي.");

    setDeleteError("");
    try {
      await deleteAccount.mutateAsync({ password: deletePassword, confirmation: deleteConfirmation });
      setDeleteOpen(false);
      toast.success("تم حذف حسابك وبياناته المرتبطة نهائيًا.");
      window.location.assign("/");
    } catch (error) {
      const message = getFriendlyErrorMessage(error, "تعذر حذف الحساب حاليًا. حاول مرة أخرى.");
      setDeleteError(message);
      toast.error(message);
    }
  };

  if (!loading && !isAuthenticated) {
    return <AppFrame><section className="container py-20"><div className="empty-state mx-auto max-w-xl"><ShieldCheck size={28} /><h1>سجّل دخولك لإدارة إعدادات حسابك</h1><p>ستتمكن من مراجعة بيانات الحساب وتغيير كلمة المرور وإدارة حذف الحساب من مكان واحد.</p><Link href="/auth"><Button className="mt-3 rounded-xl bg-[#0d5a4d] font-bold text-white">تسجيل الدخول</Button></Link></div></section></AppFrame>;
  }

  const pending = loading || changePassword.isPending;
  return <AppFrame><section className="page-heading"><div className="container"><Link href="/my-reports" className="inline-flex items-center gap-2 text-sm font-bold text-[#58726a] transition hover:text-[#0d5a4d]"><ArrowRight size={17} />العودة إلى بلاغاتي</Link><p className="eyebrow mt-5">الحساب والخصوصية</p><h1 className="page-title">إعدادات الحساب</h1><p className="page-subtitle">راجع بياناتك، حدّث كلمة المرور، وأدر الخيارات الحساسة من مساحة واحدة.</p></div></section><section className="container -mt-5 pb-14"><div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[0.82fr_1.18fr]"><aside className="space-y-5"><article className="rounded-[1.65rem] border border-[#dfe9e2] bg-white p-6 shadow-[0_15px_38px_rgba(27,75,61,0.06)]"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#e3f1eb] text-[#0d5a4d]"><UserRound size={24} /></span><h2 className="mt-5 font-display text-2xl font-black text-[#173e35]">بيانات الحساب</h2><p className="mt-2 text-sm leading-6 text-[#6b7a72]">هذه هي البيانات المرتبطة بجلسة حسابك الحالية.</p><dl className="mt-6 space-y-4"><div className="rounded-xl bg-[#f5f8f6] p-4"><dt className="text-xs font-bold text-[#718078]">الاسم</dt><dd className="mt-1 font-extrabold text-[#24473c]">{user?.name || "لم يُضف اسم بعد"}</dd></div><div className="rounded-xl bg-[#f5f8f6] p-4"><dt className="flex items-center gap-1 text-xs font-bold text-[#718078]"><Mail size={14} />البريد الإلكتروني</dt><dd dir="ltr" className="mt-1 break-all text-sm font-extrabold text-[#24473c]">{user?.email || "لا يوجد بريد مرتبط"}</dd></div></dl></article><article className="rounded-[1.65rem] bg-[#173e35] p-6 text-white"><span className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-[#b9dbce]"><ShieldCheck size={20} /></span><h2 className="mt-4 text-lg font-extrabold">حماية الحساب</h2><p className="mt-2 text-sm leading-7 text-[#d0dfd8]">لا تشارك كلمة مرورك مع أي شخص، واستخدم كلمة مرور طويلة يصعب تخمينها.</p></article></aside><div className="space-y-6"><article className="rounded-[1.65rem] border border-[#dfe9e2] bg-white p-6 shadow-[0_15px_38px_rgba(27,75,61,0.06)] sm:p-8"><div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#e3f1eb] text-[#0d5a4d]"><KeyRound size={21} /></span><div><h2 className="font-display text-2xl font-black text-[#173e35]">تغيير كلمة المرور</h2><p className="mt-1 text-sm leading-6 text-[#6b7a72]">أدخل كلمة المرور الحالية أولًا، ثم اختر كلمة مرور جديدة لا تقل عن 8 أحرف.</p></div></div><form noValidate onSubmit={submitPasswordChange} className="mt-7 space-y-5">{passwordError && <p className="form-error" role="alert">{passwordError}</p>}<label className="form-field"><span>كلمة المرور الحالية</span><div className="relative"><LockKeyhole size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#718078]" /><input type={showPasswords ? "text" : "password"} value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} className="pr-10" autoComplete="current-password" maxLength={128} /></div></label><div className="grid gap-5 sm:grid-cols-2"><label className="form-field"><span>كلمة المرور الجديدة</span><div className="relative"><LockKeyhole size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#718078]" /><input type={showPasswords ? "text" : "password"} value={newPassword} onChange={event => setNewPassword(event.target.value)} className="pr-10" autoComplete="new-password" maxLength={128} /></div></label><label className="form-field"><span>تأكيد كلمة المرور الجديدة</span><div className="relative"><LockKeyhole size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#718078]" /><input type={showPasswords ? "text" : "password"} value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} className="pr-10" autoComplete="new-password" maxLength={128} /></div></label></div><button type="button" onClick={() => setShowPasswords(!showPasswords)} className="inline-flex items-center gap-2 text-sm font-bold text-[#397262] hover:text-[#0d5a4d]">{showPasswords ? <EyeOff size={16} /> : <Eye size={16} />}{showPasswords ? "إخفاء كلمات المرور" : "إظهار كلمات المرور"}</button><div className="flex justify-end border-t border-[#edf1ed] pt-5"><Button type="submit" disabled={pending} className="rounded-xl bg-[#0d5a4d] px-6 font-bold text-white hover:bg-[#07473d]">{changePassword.isPending ? <><Loader2 size={17} className="animate-spin" />جارٍ الحفظ</> : <><CheckCircle2 size={17} />حفظ كلمة المرور الجديدة</>}</Button></div></form></article><article className="rounded-[1.65rem] border border-[#f0d9d7] bg-[#fff9f8] p-6 sm:p-8"><div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#fde9e6] text-[#b4453e]"><AlertTriangle size={21} /></span><div><p className="text-xs font-extrabold tracking-wide text-[#b4453e]">منطقة حساسة</p><h2 className="mt-1 font-display text-2xl font-black text-[#652e29]">حذف الحساب نهائيًا</h2><p className="mt-2 text-sm leading-6 text-[#8c5a55]">سيُحذف حسابك وبلاغاتك ومطابقاتك وإشعاراتك نهائيًا. لا يمكن التراجع عن هذه العملية.</p></div></div><Button type="button" onClick={() => { setDeleteError(""); setDeleteOpen(true); }} variant="outline" className="mt-6 rounded-xl border-[#e8c5c1] text-[#ad3f39] hover:bg-[#fde9e6] hover:text-[#96342f]"><Trash2 size={17} />حذف حسابي نهائيًا</Button></article></div></div></section><AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}><AlertDialogContent dir="rtl" className="max-w-lg border-[#f0d9d7] bg-[#fffdfc] text-right"><AlertDialogHeader className="text-right"><div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-[#fde9e6] text-[#b4453e]"><AlertTriangle size={23} /></div><AlertDialogTitle className="font-display text-2xl font-black text-[#652e29]">تأكيد حذف الحساب</AlertDialogTitle><AlertDialogDescription className="leading-6 text-[#8c5a55]">للحماية، أدخل كلمة المرور الحالية واكتب العبارة <strong>حذف حسابي</strong>. ستُحذف البلاغات والمطابقات والإشعارات المرتبطة بك نهائيًا.</AlertDialogDescription></AlertDialogHeader><div className="space-y-4 py-2">{deleteError && <p className="form-error" role="alert">{deleteError}</p>}<label className="form-field"><span>كلمة المرور الحالية</span><input type="password" value={deletePassword} onChange={event => setDeletePassword(event.target.value)} autoComplete="current-password" maxLength={128} /></label><label className="form-field"><span>اكتب «حذف حسابي» للتأكيد</span><input value={deleteConfirmation} onChange={event => setDeleteConfirmation(event.target.value)} maxLength={32} /></label></div><AlertDialogFooter className="sm:flex-row-reverse sm:justify-start"><Button type="button" onClick={submitAccountDeletion} disabled={deleteAccount.isPending} className="bg-[#b4453e] text-white hover:bg-[#96342f]">{deleteAccount.isPending ? <><Loader2 size={17} className="animate-spin" />جارٍ الحذف</> : <><Trash2 size={17} />حذف الحساب نهائيًا</>}</Button><AlertDialogCancel disabled={deleteAccount.isPending}>إلغاء</AlertDialogCancel></AlertDialogFooter></AlertDialogContent></AlertDialog></AppFrame>;
}
