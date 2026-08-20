import { useAuth } from "@/_core/hooks/useAuth";
import AppFrame from "@/components/AppFrame";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/report-utils";
import { getFriendlyErrorMessage } from "@/lib/error-utils";
import { trpc } from "@/lib/trpc";
import { Bell, Check, Sparkles, Target } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";

export default function Notifications() {
  const { isAuthenticated, loading } = useAuth();
  const notifications = trpc.notification.mine.useQuery(undefined, { enabled: isAuthenticated });
  const read = trpc.notification.markRead.useMutation({
    onSuccess: () => notifications.refetch(),
    onError: error => toast.error(getFriendlyErrorMessage(error, "تعذر تحديث حالة الإشعار. حاول مرة أخرى.")),
  });
  const unreadCount = notifications.data?.filter(item => !item.isRead).length ?? 0;
  if (!loading && !isAuthenticated) return <AppFrame><section className="container py-20"><div className="empty-state mx-auto max-w-xl"><Bell size={28} /><h1>سجّل دخولك لعرض الإشعارات</h1><p>سنخبرك عند ظهور تطابقات محتملة لبلاغاتك.</p></div></section></AppFrame>;
  return <AppFrame><section className="page-heading"><div className="container"><p className="eyebrow">التحديثات</p><h1 className="page-title">إشعاراتك</h1><p className="page-subtitle">تابع التطابقات المحتملة والرسائل المهمة المتعلقة ببلاغاتك.</p></div></section><section className="container -mt-5"><div className="mx-auto max-w-3xl"><div className="notification-summary mb-5"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/70 text-[#0d5a4d]"><Bell size={20} /></span><div><p className="text-sm font-extrabold text-[#24473c]">{unreadCount ? `لديك ${unreadCount} تحديثات تحتاج مراجعتك` : "أنت مطّلع على آخر المستجدات"}</p><p className="mt-1 text-xs leading-5 text-[#658076]">راجع تفاصيل التطابق أولًا، ثم اختر الإجراء المناسب دون استعجال.</p></div></div><div className="rounded-[1.7rem] border border-[#e1e8e2] bg-white p-5 shadow-[0_15px_38px_rgba(27,75,61,0.06)] sm:p-7">{notifications.isLoading ? <div className="space-y-3"><div className="h-20 animate-pulse rounded-2xl bg-[#edf1ed]" /><div className="h-20 animate-pulse rounded-2xl bg-[#edf1ed]" /></div> : notifications.data?.length ? <div className="space-y-3">{notifications.data.map(item => <div key={item.id} className={`rounded-2xl border p-4 transition ${item.isRead ? "border-[#edf0ed] bg-white" : "border-[#cfe4d9] bg-[#f4f9f6] shadow-[0_8px_22px_rgba(24,70,57,0.04)]"}`}><div className="flex gap-3"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${item.type === "match" ? "bg-[#e2f3eb] text-[#0d6b54]" : item.isRead ? "bg-[#edf2ee] text-[#6c8177]" : "bg-[#e1f0e9] text-[#0d5a4d]"}`}>{item.type === "match" ? <Target size={18} /> : <Sparkles size={18} />}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-bold text-[#24473c]">{item.title}</h2><span className="text-xs text-[#819087]">{formatDate(item.createdAt)}</span></div>{item.type === "match" && <div className="mt-2 flex flex-wrap items-center gap-2"><span className="match-notice-label">لديك تطابق محتمل</span>{item.matchScore !== null && <span className="match-notice-score">تشابه {item.matchScore}%</span>}</div>}<p className="mt-2 text-sm leading-6 text-[#68776e]">{item.message}</p><div className="mt-3 flex flex-wrap gap-2">{item.reportId && <Link href={`/reports/${item.reportId}`}><Button variant="outline" className="h-8 rounded-lg border-[#dbe6df] px-3 text-xs font-bold text-[#1c5a4c]">{item.type === "match" ? "مراجعة التطابق" : "مراجعة البلاغ"}</Button></Link>}{!item.isRead && <Button variant="ghost" onClick={() => read.mutate({ id: item.id })} className="h-8 px-2 text-xs font-bold text-[#607168]"><Check size={15} />تمت القراءة</Button>}</div></div></div></div>)}</div> : <div className="empty-state"><Bell size={27} /><h2>لا توجد إشعارات جديدة</h2><p>عند ظهور تطابق محتمل، سيظهر إشعار هنا تلقائيًا.</p></div>}</div></div></section></AppFrame>;
}
