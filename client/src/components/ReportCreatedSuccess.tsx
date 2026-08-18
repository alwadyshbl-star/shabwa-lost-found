import { ArrowLeft, CheckCircle2, MapPin, Sparkles } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { reportTypeLabels, ReportType } from "@/lib/report-utils";

type PotentialMatch = {
  score: number;
  candidate: { id: number; name: string; location: string; reportType: ReportType };
};

export default function ReportCreatedSuccess({ result }: { result: { id: number; matches: PotentialMatch[] } }) {
  const hasMatches = result.matches.length > 0;
  return (
    <section className="container py-16">
      <div className="mx-auto max-w-3xl rounded-[2rem] border border-[#d8e8df] bg-white p-8 text-center shadow-[0_18px_42px_rgba(24,70,57,0.08)] sm:p-12">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-[#def2e7] text-[#087253]"><CheckCircle2 size={31} /></span>
        <p className="mt-6 eyebrow">تم الحفظ</p>
        <h1 className="font-display text-3xl font-black text-[#173e35]">تم نشر البلاغ بنجاح</h1>
        <p className="mx-auto mt-4 max-w-xl leading-7 text-[#66756d]">{hasMatches ? `وجدنا ${result.matches.length} بلاغات محتملة للمراجعة. المطابقة مؤشر مساعد وليست إثباتًا للملكية.` : "سنواصل مقارنة البلاغ مع الحالات المناسبة. ستظهر التطابقات في لوحة بلاغاتك عند وجودها."}</p>
        {hasMatches && <div className="mt-7 text-right"><div className="mb-3 flex items-center gap-2 text-sm font-extrabold text-[#185a4c]"><Sparkles size={17} />التطابقات المقترحة</div><div className="grid gap-3 sm:grid-cols-2">{result.matches.map(match => <Link key={match.candidate.id} href={`/reports/${match.candidate.id}`} className="rounded-xl border border-[#dce9e2] bg-[#f8fbf9] p-4 text-right transition hover:border-[#83b3a2] hover:bg-[#f0f8f4]"><div className="flex items-center justify-between gap-3"><p className="font-bold text-[#24473c]">{match.candidate.name}</p><span className="rounded-full bg-[#e0f0e8] px-2 py-1 text-[11px] font-extrabold text-[#0d5a4d]">{match.score}%</span></div><p className="mt-2 flex items-center gap-1.5 text-xs text-[#6c7c73]"><MapPin size={13} />{match.candidate.location} · {reportTypeLabels[match.candidate.reportType]}</p></Link>)}</div></div>}
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><Link href={`/reports/${result.id}`}><Button className="rounded-xl bg-[#0d5a4d] px-5 font-bold text-white hover:bg-[#07473d]">عرض البلاغ <ArrowLeft size={16} /></Button></Link><Link href="/my-reports"><Button variant="outline" className="rounded-xl border-[#bcd5ca] font-bold text-[#185a4c]">الذهاب إلى بلاغاتي</Button></Link></div>
      </div>
    </section>
  );
}
