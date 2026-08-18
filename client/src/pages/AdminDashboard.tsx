import { useAuth } from "@/_core/hooks/useAuth";
import AppFrame from "@/components/AppFrame";
import { Button } from "@/components/ui/button";
import { formatDate, reportTypeLabels, statusLabels } from "@/lib/report-utils";
import { trpc } from "@/lib/trpc";
import { AlertCircle, CheckCircle2, Eye, ShieldCheck } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";

export default function AdminDashboard() {
  const { user, loading } = useAuth();
  const reports = trpc.report.adminList.useQuery(undefined, { enabled: user?.role === "admin" });
  const moderate = trpc.report.moderate.useMutation({ onSuccess: () => reports.refetch() });
  const moderationSummary = (reports.data ?? []).reduce(
    (summary, report) => {
      summary.total += 1;
      if (report.moderationStatus === "under_review") summary.pending += 1;
      if (report.moderationStatus === "published") summary.published += 1;
      return summary;
    },
    { total: 0, pending: 0, published: 0 },
  );

  const changeStatus = async (id: number, moderationStatus: "published" | "under_review") => {
    try {
      await moderate.mutateAsync({ id, moderationStatus });
      toast.success(moderationStatus === "published" ? "تم نشر البلاغ." : "تم وضع البلاغ قيد المراجعة.");
    } catch {
      toast.error("تعذر تحديث حالة المراجعة.");
    }
  };

  if (!loading && user?.role !== "admin") {
    return <AppFrame><section className="container py-20"><div className="empty-state mx-auto max-w-xl"><ShieldCheck size={28} /><h1>هذه الصفحة للمشرف فقط</h1><p>تتوفر مراجعة المحتوى للحسابات المصرح لها بالإدارة.</p></div></section></AppFrame>;
  }

  return (
    <AppFrame>
      <section className="page-heading"><div className="container"><p className="eyebrow">الإشراف</p><h1 className="page-title">لوحة مراجعة البلاغات</h1><p className="page-subtitle">راجع المحتوى المنشور وتحكم في ظهوره العام بحذر وشفافية.</p></div></section>
      <section className="container -mt-5">
        <div className="mb-6 grid gap-3 sm:grid-cols-3">
          <div className="journey-summary-card"><span className="journey-summary-label">إجمالي الطابور</span><strong>{moderationSummary.total}</strong><span>كل البلاغات المتاحة للمشرف</span></div>
          <div className="journey-summary-card journey-summary-card-warm"><span className="journey-summary-label">تحتاج قرارًا</span><strong>{moderationSummary.pending}</strong><span>بلاغات تنتظر النشر أو المراجعة</span></div>
          <div className="journey-summary-card journey-summary-card-success"><span className="journey-summary-label">منشورة للعامة</span><strong>{moderationSummary.published}</strong><span>بلاغات ظاهرة في البحث العام</span></div>
        </div>
        <div className="overflow-hidden rounded-[1.7rem] border border-[#e1e8e2] bg-white shadow-[0_15px_38px_rgba(27,75,61,0.06)]">
          <div className="flex items-center gap-3 border-b border-[#edf1ed] p-5 sm:p-6"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e3f0eb] text-[#0d5a4d]"><ShieldCheck size={20} /></span><div><h2 className="font-display text-xl font-black text-[#173e35]">البلاغات الحديثة</h2><p className="text-sm text-[#708078]">ابدأ بالبلاغات قيد المراجعة، ثم راجع المحتوى المنشور عند الحاجة.</p></div></div>
          {reports.isLoading ? <div className="p-6"><div className="h-56 animate-pulse rounded-2xl bg-[#edf1ed]" /></div> : reports.data?.length ? <>
            <div className="space-y-3 p-4 md:hidden">{reports.data.map(report => <article key={report.id} className="rounded-2xl border border-[#e2ebe5] p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-extrabold text-[#25473d]">{report.name}</p><p className="mt-1 text-xs text-[#7b8982]">{report.location} · {formatDate(report.createdAt)}</p></div><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${report.moderationStatus === "published" ? "bg-[#e3f1e9] text-[#176143]" : "bg-[#edf0f5] text-[#4b5f7c]"}`}>{report.moderationStatus === "published" ? "منشور" : "قيد المراجعة"}</span></div><div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-[#68786f]"><span className="rounded-lg bg-[#f2f6f3] px-2 py-1">{reportTypeLabels[report.reportType]}</span><span className="rounded-lg bg-[#f2f6f3] px-2 py-1">{statusLabels[report.status]}</span></div><div className="mt-4 flex gap-2"><Link href={`/reports/${report.id}`}><Button variant="outline" className="h-9 rounded-lg border-[#dce7e0] px-3 text-xs text-[#1b5a4c]"><Eye size={15} />عرض</Button></Link><Button onClick={() => changeStatus(report.id, report.moderationStatus === "published" ? "under_review" : "published")} disabled={moderate.isPending} className="h-9 rounded-lg bg-[#edf4f0] px-3 text-xs font-bold text-[#155944] hover:bg-[#dfede6]">{report.moderationStatus === "published" ? "مراجعة" : "نشر"}</Button></div></article>)}</div>
            <div className="hidden overflow-x-auto md:block"><table className="min-w-[760px] w-full text-right"><thead className="bg-[#f6f8f6] text-xs font-extrabold text-[#73827a]"><tr><th className="px-6 py-4">البلاغ</th><th className="px-4 py-4">النوع</th><th className="px-4 py-4">الحالة</th><th className="px-4 py-4">المراجعة</th><th className="px-4 py-4">التاريخ</th><th className="px-6 py-4">إجراء</th></tr></thead><tbody>{reports.data.map(report => <tr key={report.id} className="border-t border-[#edf1ed] text-sm"><td className="px-6 py-4"><p className="font-bold text-[#25473d]">{report.name}</p><p className="mt-1 text-xs text-[#7b8982]">{report.location}</p></td><td className="px-4 py-4 text-[#65756c]">{reportTypeLabels[report.reportType]}</td><td className="px-4 py-4 text-[#65756c]">{statusLabels[report.status]}</td><td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${report.moderationStatus === "published" ? "bg-[#e3f1e9] text-[#176143]" : "bg-[#edf0f5] text-[#4b5f7c]"}`}>{report.moderationStatus === "published" ? "منشور" : "قيد المراجعة"}</span></td><td className="px-4 py-4 text-xs text-[#74827b]">{formatDate(report.createdAt)}</td><td className="px-6 py-4"><div className="flex gap-2"><Link href={`/reports/${report.id}`}><Button variant="outline" className="h-8 rounded-lg border-[#dce7e0] px-2.5 text-[#1b5a4c]"><Eye size={15} /></Button></Link><Button onClick={() => changeStatus(report.id, report.moderationStatus === "published" ? "under_review" : "published")} disabled={moderate.isPending} className="h-8 rounded-lg bg-[#edf4f0] px-3 text-xs font-bold text-[#155944] hover:bg-[#dfede6]">{report.moderationStatus === "published" ? "مراجعة" : "نشر"}</Button></div></td></tr>)}</tbody></table></div>
          </> : <div className="empty-state"><AlertCircle size={27} /><h2>لا توجد بلاغات للمراجعة</h2><p>ستظهر البلاغات هنا بعد إنشائها.</p></div>}
        </div>
      </section>
    </AppFrame>
  );
}
