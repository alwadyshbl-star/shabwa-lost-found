import { useAuth } from "@/_core/hooks/useAuth";
import AppFrame from "@/components/AppFrame";
import { Button } from "@/components/ui/button";
import { formatDate, reportTypeLabels, statusLabels } from "@/lib/report-utils";
import { getFriendlyErrorMessage } from "@/lib/error-utils";
import { trpc } from "@/lib/trpc";
import { Activity, AlertCircle, BarChart3, Eye, FileText, PenLine, ShieldCheck, Trash2, Users, UserRoundCog } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";

type AdminTab = "overview" | "reports" | "users";

export default function AdminDashboard() {
  const { user, loading } = useAuth();
  const [tab, setTab] = useState<AdminTab>("overview");
  const enabled = user?.role === "admin";
  const stats = trpc.admin.stats.useQuery(undefined, { enabled });
  const users = trpc.admin.users.useQuery(undefined, { enabled });
  const reports = trpc.report.adminList.useQuery(undefined, { enabled });
  const moderate = trpc.report.moderate.useMutation({ onSuccess: () => { reports.refetch(); stats.refetch(); } });
  const deleteReport = trpc.admin.deleteReport.useMutation({ onSuccess: () => { reports.refetch(); stats.refetch(); toast.success("تم حذف البلاغ نهائيًا."); } });
  const setUserRole = trpc.admin.setUserRole.useMutation({ onSuccess: () => { users.refetch(); toast.success("تم تحديث صلاحية المستخدم."); } });
  const deleteUser = trpc.admin.deleteUser.useMutation({ onSuccess: () => { users.refetch(); reports.refetch(); stats.refetch(); toast.success("تم حذف المستخدم وبياناته المرتبطة."); } });

  const updateModeration = async (id: number, moderationStatus: "published" | "under_review") => {
    try {
      await moderate.mutateAsync({ id, moderationStatus });
      toast.success(moderationStatus === "published" ? "تم نشر البلاغ للعامة." : "تم إخفاء البلاغ ووضعه قيد المراجعة.");
    } catch (error) { toast.error(getFriendlyErrorMessage(error, "تعذر تحديث حالة البلاغ. حاول مرة أخرى.")); }
  };

  const removeReport = async (id: number) => {
    if (!window.confirm("سيُحذف البلاغ والمطابقات المرتبطة به نهائيًا. هل تريد المتابعة؟")) return;
    try { await deleteReport.mutateAsync({ reportId: id }); } catch (error) { toast.error(getFriendlyErrorMessage(error, "تعذر حذف البلاغ. حاول مرة أخرى.")); }
  };

  const changeRole = async (userId: number, role: "user" | "admin") => {
    try { await setUserRole.mutateAsync({ userId, role }); } catch (error) { toast.error(getFriendlyErrorMessage(error, "تعذر تحديث الصلاحية. حاول مرة أخرى.")); }
  };

  const removeUser = async (userId: number, name: string | null) => {
    if (!window.confirm(`سيُحذف حساب ${name || "هذا المستخدم"} وكل بلاغاته ومطابقاته نهائيًا. هل تريد المتابعة؟`)) return;
    try { await deleteUser.mutateAsync({ userId }); } catch (error) { toast.error(getFriendlyErrorMessage(error, "تعذر حذف المستخدم. حاول مرة أخرى.")); }
  };

  if (!loading && user?.role !== "admin") return <AppFrame><section className="container py-20"><div className="empty-state mx-auto max-w-xl"><ShieldCheck size={28} /><h1>هذه الصفحة للمشرف فقط</h1><p>تتوفر إدارة بيانات المنصة للحسابات المصرح لها بالإشراف.</p></div></section></AppFrame>;

  const statCards = [
    { label: "المستخدمون", value: stats.data?.users ?? 0, icon: Users, tone: "admin-stat-mint" },
    { label: "إجمالي البلاغات", value: stats.data?.reports ?? 0, icon: FileText, tone: "admin-stat-blue" },
    { label: "بلاغات مفتوحة", value: stats.data?.open ?? 0, icon: Activity, tone: "admin-stat-sand" },
    { label: "تم الاسترجاع", value: stats.data?.recovered ?? 0, icon: ShieldCheck, tone: "admin-stat-success" },
  ];

  return <AppFrame><section className="admin-hero"><div className="container"><div><p className="eyebrow">الإدارة والتحكم</p><h1 className="page-title">مركز إدارة أثر</h1><p className="page-subtitle">راقب نشاط المنصة، وأدر المستخدمين والبلاغات من مساحة واحدة مرتبطة مباشرة بقاعدة البيانات.</p></div><div className="admin-hero-mark"><BarChart3 size={32} /><span>بيانات حية</span></div></div></section><section className="container -mt-5 pb-14"><div className="admin-stat-grid">{statCards.map(card => <article key={card.label} className={`admin-stat-card ${card.tone}`}><span><card.icon size={20} /></span><p>{card.label}</p><strong>{card.value}</strong></article>)}</div><div className="admin-workspace"><div className="admin-tabs" role="tablist"><button onClick={() => setTab("overview")} className={tab === "overview" ? "admin-tab-active" : ""}><BarChart3 size={17} />نظرة عامة</button><button onClick={() => setTab("reports")} className={tab === "reports" ? "admin-tab-active" : ""}><FileText size={17} />إدارة البلاغات <span>{stats.data?.reports ?? 0}</span></button><button onClick={() => setTab("users")} className={tab === "users" ? "admin-tab-active" : ""}><Users size={17} />إدارة المستخدمين <span>{stats.data?.users ?? 0}</span></button></div>{tab === "overview" && <section className="admin-overview"><div className="admin-insight-card"><div><span className="admin-insight-icon"><AlertCircle size={20} /></span><p>طابور المراجعة</p><strong>{stats.data?.underReview ?? 0}</strong><small>بلاغات تحتاج قرار النشر أو الإخفاء.</small></div><Button onClick={() => setTab("reports")} className="rounded-xl bg-[#0d5a4d]">مراجعة البلاغات</Button></div><div className="admin-insight-card"><div><span className="admin-insight-icon admin-insight-icon-sand"><BarChart3 size={20} /></span><p>توزيع الحالات</p><strong>{stats.data?.lost ?? 0} مفقود / {stats.data?.found ?? 0} موجود</strong><small>هذه الأرقام تُحسب مباشرة من البلاغات المسجلة.</small></div><Button variant="outline" onClick={() => setTab("users")} className="rounded-xl border-[#d8e4dd] text-[#155944]">إدارة المستخدمين</Button></div><div className="admin-guide"><UserRoundCog size={24} /><div><h2>إدارة مسؤولة للمنصة</h2><p>تغيير الدور أو الحذف إجراءات حساسة. لا يمكن للمشرف حذف حسابه الحالي أو إزالة دور المشرف من نفسه من هذه اللوحة.</p></div></div></section>}{tab === "reports" && <section className="admin-section"><div className="admin-section-heading"><div><p className="eyebrow">المحتوى</p><h2>كل البلاغات</h2><p>انشر البلاغات أو أخفها للمراجعة، وعدّل أو احذف المحتوى المخالف عند الضرورة.</p></div><span>{reports.data?.length ?? 0} بلاغ</span></div>{reports.isLoading ? <div className="admin-loading" /> : reports.data?.length ? <div className="admin-report-list">{reports.data.map(report => <article key={report.id} className="admin-report-row"><div className="admin-row-primary"><strong>{report.name}</strong><span>{report.location} · {formatDate(report.createdAt)}</span></div><div className="admin-row-meta"><span>{reportTypeLabels[report.reportType]}</span><span>{statusLabels[report.status]}</span><span className={report.moderationStatus === "published" ? "admin-status-live" : "admin-status-review"}>{report.moderationStatus === "published" ? "منشور" : "قيد المراجعة"}</span></div><div className="admin-row-actions"><Link href={`/reports/${report.id}`}><Button variant="outline" className="h-9 rounded-lg border-[#dbe6df] px-3 text-[#155944]"><Eye size={15} />عرض</Button></Link><Link href={`/reports/${report.id}/edit`}><Button variant="outline" className="h-9 rounded-lg border-[#dbe6df] px-3 text-[#155944]"><PenLine size={15} />تعديل</Button></Link><Button onClick={() => updateModeration(report.id, report.moderationStatus === "published" ? "under_review" : "published")} disabled={moderate.isPending} className="h-9 rounded-lg bg-[#eef5f1] px-3 text-[#155944] hover:bg-[#dbece3]">{report.moderationStatus === "published" ? "مراجعة" : "نشر"}</Button><Button onClick={() => removeReport(report.id)} disabled={deleteReport.isPending} variant="outline" className="h-9 rounded-lg border-[#f0d9d7] px-3 text-[#b43f39] hover:bg-[#fdf0ef]"><Trash2 size={15} />حذف</Button></div></article>)}</div> : <div className="empty-state"><FileText size={27} /><h2>لا توجد بلاغات بعد</h2><p>ستظهر البلاغات المسجلة هنا لإدارتها.</p></div>}</section>}{tab === "users" && <section className="admin-section"><div className="admin-section-heading"><div><p className="eyebrow">الحسابات</p><h2>المستخدمون والصلاحيات</h2><p>تُضاف الحسابات من صفحة التسجيل، ويمكنك هنا ضبط صلاحيتها أو حذف حسابها ومحتواها بعد تأكيد صريح.</p></div><span>{users.data?.length ?? 0} مستخدم</span></div>{users.isLoading ? <div className="admin-loading" /> : users.data?.length ? <div className="admin-user-list">{users.data.map(member => <article key={member.id} className="admin-user-row"><div className="admin-user-avatar">{member.name?.slice(0, 1) || "م"}</div><div className="admin-row-primary"><strong>{member.name || "مستخدم بلا اسم"}{member.id === user?.id && <small>أنت</small>}</strong><span>{member.email || "لا يوجد بريد مسجل"} · {member.reportCount} بلاغ</span></div><div className="admin-row-meta"><span>{formatDate(member.createdAt)}</span><span>{member.role === "admin" ? "مشرف" : "مستخدم"}</span></div><div className="admin-row-actions"><select value={member.role} onChange={event => changeRole(member.id, event.target.value as "user" | "admin")} disabled={member.id === user?.id || setUserRole.isPending} className="admin-role-select"><option value="user">مستخدم عادي</option><option value="admin">مشرف</option></select><Button onClick={() => removeUser(member.id, member.name)} disabled={member.id === user?.id || deleteUser.isPending} variant="outline" className="h-9 rounded-lg border-[#f0d9d7] px-3 text-[#b43f39] hover:bg-[#fdf0ef]"><Trash2 size={15} />حذف</Button></div></article>)}</div> : <div className="empty-state"><Users size={27} /><h2>لا توجد حسابات بعد</h2><p>ستظهر الحسابات التي تنشئ حسابًا في المنصة هنا.</p></div>}</section>}</div></section></AppFrame>;
}
