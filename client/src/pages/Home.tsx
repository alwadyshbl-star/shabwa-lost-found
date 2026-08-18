import AppFrame from "@/components/AppFrame";
import ReportCard from "@/components/ReportCard";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, CheckCircle2, ChevronLeft, ClipboardPlus, HandHeart, MapPin, Search, ShieldCheck, Sparkles } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";

const steps = [
  { number: "١", title: "أضف بلاغك", text: "سجّل التفاصيل التي تتذكرها في دقائق، وأضف صورة عند توفرها.", icon: ClipboardPlus },
  { number: "٢", title: "دعنا نبحث", text: "نقارن وصف البلاغ بالمحتوى المقابل ونبرز التشابهات المحتملة.", icon: Sparkles },
  { number: "٣", title: "تواصل بثقة", text: "عند وجود تطابق، تتبع خطوات التحقق قبل تسليم الغرض.", icon: HandHeart },
];

export default function Home() {
  const stats = trpc.report.stats.useQuery();
  const latestReports = trpc.report.list.useQuery({ status: "open" });
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const data = stats.data ?? { lost: 0, found: 0, recovered: 0 };

  return (
    <AppFrame>
      <section className="hero-surface relative overflow-hidden">
        <div className="hero-orb hero-orb-one" />
        <div className="hero-orb hero-orb-two" />
        <div className="container relative grid items-center gap-12 py-16 lg:grid-cols-[1.08fr_0.92fr] lg:py-24">
          <div className="max-w-2xl">
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#b7d2c7] bg-white/80 px-3.5 py-1.5 text-xs font-extrabold text-[#246857]"><Sparkles size={14} />منصة مجتمعية موثوقة</p>
            <h1 className="font-display text-4xl font-black leading-[1.24] tracking-tight text-[#153d34] sm:text-5xl lg:text-[3.7rem]">كل أثرٍ يستحق أن يعود إلى صاحبه.</h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-[#567067] sm:text-lg">منصة عربية منظمة للمفقودات والموجودات. أبلغ، ابحث، وتابع التطابقات المحتملة بخطوات واضحة تحمي خصوصيتك.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/reports/new"><Button className="h-12 w-full rounded-xl bg-[#0d5a4d] px-6 font-bold text-white shadow-[0_13px_30px_rgba(13,90,77,0.18)] hover:bg-[#07473d] sm:w-auto"><ClipboardPlus size={18} /> أبلغ عن مفقود أو موجود</Button></Link>
              <Link href="/search"><Button variant="outline" className="h-12 w-full rounded-xl border-[#afc9bf] bg-white/70 px-6 font-bold text-[#185a4c] hover:bg-white sm:w-auto"><Search size={18} /> استكشف البلاغات</Button></Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold text-[#527067]">
              <span className="flex items-center gap-2"><ShieldCheck size={17} className="text-[#168267]" />بيانات تواصل محمية</span>
              <span className="flex items-center gap-2"><CheckCircle2 size={17} className="text-[#168267]" />مطابقة مساعدة وليست إثبات ملكية</span>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[470px] lg:mr-auto">
            <div className="absolute -inset-3 rounded-[2.1rem] border border-white/60 bg-white/25 rotate-[-3deg]" />
            <div className="relative rounded-[1.85rem] border border-white/80 bg-white/85 p-5 shadow-[0_28px_70px_rgba(24,78,65,0.16)] backdrop-blur-sm sm:p-7">
              <div className="mb-6 flex items-center justify-between"><div><p className="text-sm font-extrabold text-[#183e35]">ابحث عن أثر</p><p className="mt-1 text-xs text-[#7a8982]">بالاسم، الوصف أو المكان</p></div><span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#e3f0eb] text-[#0d5a4d]"><Search size={20} /></span></div>
              <form onSubmit={event => { event.preventDefault(); navigate(`/search?query=${encodeURIComponent(search)}`); }} className="space-y-3">
                <label className="field-label" htmlFor="home-search">ما الذي تبحث عنه؟</label>
                <div className="flex gap-2 rounded-xl border border-[#d9e4dd] bg-[#fbfdfb] p-1.5 focus-within:ring-2 focus-within:ring-[#87b6a8]">
                  <input id="home-search" value={search} onChange={event => setSearch(event.target.value)} placeholder="مثال: محفظة بنية" className="min-w-0 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-[#9aa59f]" />
                  <Button type="submit" className="h-9 rounded-lg bg-[#0d5a4d] px-3 text-white hover:bg-[#07473d]" aria-label="بدء البحث"><ArrowLeft size={17} /></Button>
                </div>
              </form>
              <div className="my-6 border-t border-[#edf1ed]" />
              <div className="grid grid-cols-3 gap-2 text-center">
                <div><span className="block font-display text-2xl font-black text-[#185a4c]">{data.lost}</span><span className="mt-1 block text-[11px] font-bold text-[#77857d]">مفقودات</span></div>
                <div className="border-x border-[#e7ece8]"><span className="block font-display text-2xl font-black text-[#185a4c]">{data.found}</span><span className="mt-1 block text-[11px] font-bold text-[#77857d]">موجودات</span></div>
                <div><span className="block font-display text-2xl font-black text-[#185a4c]">{data.recovered}</span><span className="mt-1 block text-[11px] font-bold text-[#77857d]">تم استرجاعها</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container pt-20">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="eyebrow">آخر ما نُشر</p><h2 className="section-title">بلاغات تحتاج إلى أثرٍ منك</h2><p className="section-subtitle">تصفح أحدث البلاغات المفتوحة، أو ابدأ بحثًا بتصفية دقيقة.</p></div><Link href="/search" className="inline-flex items-center gap-1 self-start text-sm font-extrabold text-[#0d5a4d] hover:gap-2 sm:self-auto">عرض كل البلاغات <ChevronLeft size={17} /></Link></div>
        {latestReports.isLoading ? <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"><div className="skeleton-card" /><div className="skeleton-card" /><div className="skeleton-card" /></div> : latestReports.data?.length ? <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{latestReports.data.slice(0, 3).map(report => <ReportCard key={report.id} report={report} />)}</div> : <div className="empty-state mt-8"><MapPin size={26} /><h3>لم تُنشر بلاغات بعد</h3><p>كن أول من يضيف بلاغًا منظّمًا يساعد المجتمع على البحث.</p><Link href="/reports/new"><Button className="mt-2 rounded-xl bg-[#0d5a4d] font-bold text-white">إضافة بلاغ</Button></Link></div>}
      </section>

      <section className="container mt-20"><div className="rounded-[2rem] bg-[#173e35] px-6 py-10 text-white sm:px-10 lg:px-14"><div className="mb-10 max-w-xl"><p className="eyebrow !text-[#a8d4c4]">كيف تعمل المنصة؟</p><h2 className="font-display text-3xl font-black sm:text-4xl">مسار بسيط، وخصوصية في كل خطوة.</h2></div><div className="grid gap-7 md:grid-cols-3">{steps.map(step => { const Icon = step.icon; return <div key={step.number} className="relative border-t border-white/15 pt-5 md:border-t-0 md:border-l md:border-white/15 md:pr-7 md:pt-0 first:md:border-l-0"><span className="mb-4 flex items-center justify-between text-[#a8d4c4]"><span className="font-display text-3xl font-black">{step.number}</span><Icon size={22} /></span><h3 className="text-lg font-extrabold">{step.title}</h3><p className="mt-2 text-sm leading-7 text-[#d0dfd8]">{step.text}</p></div>; })}</div></div></section>
    </AppFrame>
  );
}
