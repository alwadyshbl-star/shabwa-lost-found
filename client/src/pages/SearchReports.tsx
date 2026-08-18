import AppFrame from "@/components/AppFrame";
import ReportCard from "@/components/ReportCard";
import { Button } from "@/components/ui/button";
import { ItemKind, ReportStatus, ReportType } from "@/lib/report-utils";
import { trpc } from "@/lib/trpc";
import { Filter, Search, SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";

export default function SearchReports() {
  const [location] = useLocation();
  const initialQuery = new URLSearchParams(location.split("?")[1]).get("query") ?? "";
  const [query, setQuery] = useState(initialQuery);
  const [itemKind, setItemKind] = useState<ItemKind | "">("");
  const [reportType, setReportType] = useState<ReportType | "">("");
  const [status, setStatus] = useState<ReportStatus | "">("");
  const [place, setPlace] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [submitted, setSubmitted] = useState({ query: initialQuery, itemKind: "", reportType: "", status: "", location: "", dateFrom: "", dateTo: "" });
  const filters = useMemo(() => ({
    ...(submitted.query ? { query: submitted.query } : {}),
    ...(submitted.itemKind ? { itemKind: submitted.itemKind as ItemKind } : {}),
    ...(submitted.reportType ? { reportType: submitted.reportType as ReportType } : {}),
    ...(submitted.status ? { status: submitted.status as ReportStatus } : {}),
    ...(submitted.location ? { location: submitted.location } : {}),
    ...(submitted.dateFrom ? { dateFrom: submitted.dateFrom } : {}),
    ...(submitted.dateTo ? { dateTo: submitted.dateTo } : {}),
  }), [submitted]);
  const results = trpc.report.list.useQuery(filters);
  const submit = (event: React.FormEvent) => { event.preventDefault(); setSubmitted({ query, itemKind, reportType, status, location: place, dateFrom, dateTo }); };
  const clear = () => { setQuery(""); setItemKind(""); setReportType(""); setStatus(""); setPlace(""); setDateFrom(""); setDateTo(""); setSubmitted({ query: "", itemKind: "", reportType: "", status: "", location: "", dateFrom: "", dateTo: "" }); };

  return <AppFrame><section className="page-heading"><div className="container"><p className="eyebrow">بحث متقدم</p><h1 className="page-title">ابحث بتفاصيل أدق</h1><p className="page-subtitle">صفِّ البلاغات حسب النوع والحالة والموقع والتاريخ للوصول إلى النتائج الأقرب.</p></div></section><section className="container -mt-5"><form onSubmit={submit} className="filter-panel"><div className="grid gap-3 lg:grid-cols-[1.8fr_repeat(3,1fr)]"><label className="search-field"><Search size={19} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="ابحث بالاسم أو الوصف" /></label><select className="select-field" value={itemKind} onChange={event => setItemKind(event.target.value as ItemKind | "")}><option value="">كل الأنواع</option><option value="person">شخص</option><option value="animal">حيوان</option><option value="item">غرض</option></select><select className="select-field" value={reportType} onChange={event => setReportType(event.target.value as ReportType | "")}><option value="">مفقود وموجود</option><option value="lost">مفقود</option><option value="found">موجود</option></select><select className="select-field" value={status} onChange={event => setStatus(event.target.value as ReportStatus | "")}><option value="">كل الحالات</option><option value="open">مفتوح</option><option value="recovered">تم الاسترجاع</option><option value="under_review">قيد المراجعة</option></select></div><div className="mt-3 grid gap-3 sm:grid-cols-[1.4fr_1fr_1fr_auto_auto]"><label className="search-field"><Filter size={17} /><input value={place} onChange={event => setPlace(event.target.value)} placeholder="الموقع أو الحي" /></label><input className="select-field" type="date" value={dateFrom} onChange={event => setDateFrom(event.target.value)} aria-label="من تاريخ" /><input className="select-field" type="date" value={dateTo} onChange={event => setDateTo(event.target.value)} aria-label="إلى تاريخ" /><Button type="submit" className="h-11 rounded-xl bg-[#0d5a4d] px-5 font-bold text-white hover:bg-[#07473d]"><SlidersHorizontal size={17} />تطبيق</Button><Button type="button" variant="ghost" onClick={clear} className="h-11 rounded-xl px-3 text-[#607068]"><X size={17} />مسح</Button></div></form></section><section className="container mt-10"><div className="mb-6 flex items-center justify-between"><p className="text-sm font-bold text-[#607068]">{results.isLoading ? "جارٍ البحث..." : `${results.data?.length ?? 0} نتيجة`}</p></div>{results.isLoading ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"><div className="skeleton-card" /><div className="skeleton-card" /><div className="skeleton-card" /></div> : results.data?.length ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{results.data.map(report => <ReportCard key={report.id} report={report} />)}</div> : <div className="empty-state"><Search size={27} /><h2>لا توجد نتائج مطابقة</h2><p>جرّب توسيع نطاق البحث أو إزالة بعض المرشحات، أو أنشئ بلاغًا لتبدأ المنصة بالمقارنة نيابةً عنك.</p><div className="mt-4 flex flex-wrap justify-center gap-2"><Button variant="outline" onClick={clear} className="rounded-xl border-[#bfd8cc] font-bold text-[#1c5a4c]">إزالة المرشحات</Button><Link href="/reports/new"><Button className="rounded-xl bg-[#0d5a4d] font-bold text-white hover:bg-[#07473d]">إضافة بلاغ</Button></Link></div></div>}</section></AppFrame>;
}
