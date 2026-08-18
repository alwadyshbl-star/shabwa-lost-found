import { useAuth } from "@/_core/hooks/useAuth";
import AppFrame from "@/components/AppFrame";
import { StatusPill } from "@/components/ReportCard";
import { Button } from "@/components/ui/button";
import { formatDate, reportTypeLabels } from "@/lib/report-utils";
import { trpc } from "@/lib/trpc";
import {
  AlertCircle,
  BellRing,
  CheckCircle2,
  ClipboardPlus,
  Eye,
  Loader2,
  MapPin,
  Pencil,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

export default function MyReports() {
  const { isAuthenticated, loading } = useAuth();
  const reports = trpc.report.mine.useQuery(undefined, { enabled: isAuthenticated });
  const [selected, setSelected] = useState<number | null>(null);
  const matches = trpc.report.matches.useQuery(
    { reportId: selected ?? 0 },
    { enabled: Boolean(selected) },
  );
  const recover = trpc.report.recover.useMutation();

  const markRecovered = async (id: number) => {
    try {
      await recover.mutateAsync({ id });
      await reports.refetch();
      toast.success("تم إغلاق البلاغ بالحالة «تم الاسترجاع».");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر تحديث البلاغ.");
    }
  };

  if (!loading && !isAuthenticated) {
    return <AppFrame><section className="container py-20"><div className="empty-state mx-auto max-w-xl"><ClipboardPlus size={28} /><h1>سجّل دخولك لعرض بلاغاتك</h1><p>من لوحة البلاغات يمكنك متابعة الحالات، الاطلاع على التطابقات، وإغلاق البلاغ بعد الاسترجاع.</p></div></section></AppFrame>;
  }

  return (
    <AppFrame>
      <section className="page-heading">
        <div className="container">
          <p className="eyebrow">لوحتي</p>
          <h1 className="page-title">بلاغاتي ومطابقاتي</h1>
          <p className="page-subtitle">تابع كل بلاغ، راجع التطابقات المحتملة، وأغلق البلاغ عند الاسترجاع.</p>
        </div>
      </section>
      <section className="container -mt-5">
        <div className="grid gap-7 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="rounded-[1.7rem] border border-[#e1e8e2] bg-white p-5 shadow-[0_15px_38px_rgba(27,75,61,0.06)] sm:p-7">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="font-display text-2xl font-black text-[#173e35]">بلاغاتي</h2>
              <Link href="/reports/new"><Button className="rounded-xl bg-[#0d5a4d] text-xs font-bold text-white hover:bg-[#07473d]"><ClipboardPlus size={16} />إضافة بلاغ</Button></Link>
            </div>
            {reports.isLoading ? (
              <div className="space-y-3"><div className="h-24 animate-pulse rounded-2xl bg-[#edf1ed]" /><div className="h-24 animate-pulse rounded-2xl bg-[#edf1ed]" /></div>
            ) : reports.data?.length ? (
              <div className="space-y-3">
                {reports.data.map(report => (
                  <div key={report.id} className={`rounded-2xl border p-4 transition ${selected === report.id ? "border-[#78aa9b] bg-[#f4f9f6]" : "border-[#edf0ed] bg-white"}`}>
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2"><h3 className="truncate font-extrabold text-[#24473c]">{report.name}</h3><StatusPill status={report.status} /></div>
                        <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-[#718078]"><span>{reportTypeLabels[report.reportType]}</span><span className="inline-flex items-center gap-1"><MapPin size={13} />{report.location}</span><span>{formatDate(report.incidentDate)}</span></p>
                      </div>
                      <div className="flex flex-wrap shrink-0 gap-2">
                        <Link href={`/reports/${report.id}`}><Button variant="outline" className="h-9 rounded-lg border-[#dbe6df] px-3 text-xs font-bold text-[#225b4d]"><Eye size={15} />عرض</Button></Link>
                        <Link href={`/reports/${report.id}/edit`}><Button variant="outline" className="h-9 rounded-lg border-[#dbe6df] px-3 text-xs font-bold text-[#225b4d]"><Pencil size={15} />تعديل</Button></Link>
                        <Button variant="outline" onClick={() => setSelected(report.id)} className="h-9 rounded-lg border-[#dbe6df] px-3 text-xs font-bold text-[#225b4d]"><Sparkles size={15} />مطابقات</Button>
                        {report.status === "open" && <Button onClick={() => markRecovered(report.id)} disabled={recover.isPending} className="h-9 rounded-lg bg-[#e2f2e8] px-3 text-xs font-bold text-[#166541] hover:bg-[#d2eadb]"><CheckCircle2 size={15} />تم الاسترجاع</Button>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : <div className="empty-state"><ClipboardPlus size={26} /><h3>لا توجد بلاغات في حسابك</h3><p>أضف أول بلاغ، وسنبدأ البحث عن حالات مشابهة.</p></div>}
          </div>
          <aside className="rounded-[1.7rem] border border-[#e1e8e2] bg-white p-6 shadow-[0_15px_38px_rgba(27,75,61,0.06)]">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#e6f2ed] text-[#0d5a4d]"><BellRing size={20} /></span>
            <h2 className="mt-4 font-display text-2xl font-black text-[#173e35]">التطابقات المحتملة</h2>
            {!selected ? <p className="mt-3 text-sm leading-7 text-[#6b7a72]">اختر «مطابقات» بجانب أي بلاغ لمراجعة النتائج المقترحة.</p> : matches.isLoading ? <p className="mt-5 flex items-center gap-2 text-sm text-[#6b7a72]"><Loader2 size={17} className="animate-spin" />جارٍ البحث في التطابقات...</p> : matches.data?.length ? <div className="mt-5 space-y-3">{matches.data.map(match => <Link key={match.id} href={`/reports/${match.candidate.id}`} className="block rounded-xl border border-[#e2ebe5] p-4 transition hover:border-[#87b9a9] hover:bg-[#f7fbf8]"><div className="flex items-center justify-between gap-2"><p className="font-bold text-[#24473c]">{match.candidate.name}</p><span className="rounded-full bg-[#e3f0eb] px-2 py-1 text-[11px] font-extrabold text-[#0d5a4d]">{match.score}%</span></div><p className="mt-2 text-xs leading-5 text-[#77857d]">{match.candidate.location} · {reportTypeLabels[match.candidate.reportType]}</p></Link>)}</div> : <div className="mt-5 rounded-xl bg-[#f5f8f6] p-4 text-sm leading-6 text-[#6b7a72]"><AlertCircle size={17} className="mb-2 text-[#bd7f25]" />لا توجد تطابقات محتملة لهذا البلاغ حتى الآن.</div>}
          </aside>
        </div>
      </section>
    </AppFrame>
  );
}
