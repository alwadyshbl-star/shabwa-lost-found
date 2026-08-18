import { CalendarDays, MapPin, PawPrint, Tag, UserRound } from "lucide-react";
import { Link } from "wouter";
import { formatDate, itemKindLabels, ItemKind, ReportStatus, ReportType, reportTypeLabels, statusLabels } from "@/lib/report-utils";

export type ReportCardData = {
  id: number;
  reportType: ReportType;
  itemKind: ItemKind;
  name: string;
  description: string;
  location: string;
  incidentDate: string;
  imageUrl?: string | null;
  status: ReportStatus;
};

export function StatusPill({ status }: { status: ReportStatus }) {
  const classes = {
    open: "bg-[#fff2e1] text-[#9a5c13] ring-[#f8deb8]",
    recovered: "bg-[#e2f2e8] text-[#166541] ring-[#cde7d7]",
    under_review: "bg-[#e8edf4] text-[#415876] ring-[#d4dce8]",
  };
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold ring-1 ${classes[status]}`}>{statusLabels[status]}</span>;
}

export default function ReportCard({ report }: { report: ReportCardData }) {
  const KindIcon = report.itemKind === "person" ? UserRound : report.itemKind === "animal" ? PawPrint : Tag;
  const visualClass = `report-visual report-visual-${report.itemKind} report-visual-${report.reportType}`;
  return (
    <Link href={`/reports/${report.id}`} className="group block h-full">
      <article className="report-card h-full overflow-hidden">
        <div className="relative h-44 overflow-hidden bg-[#e7ece7]">
          {report.imageUrl ? (
            <img src={report.imageUrl} alt={`صورة البلاغ: ${report.name}`} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
          ) : (
            <div className={visualClass}>
              <span className="report-visual-orbit report-visual-orbit-one" />
              <span className="report-visual-orbit report-visual-orbit-two" />
              <span className="relative z-10 grid h-16 w-16 place-items-center rounded-[1.35rem] bg-white/85 text-[#0d5a4d] shadow-[0_12px_24px_rgba(24,70,57,0.12)]"><KindIcon size={28} /></span>
              <span className="absolute bottom-3 right-3 rounded-full bg-white/70 px-2.5 py-1 text-[10px] font-extrabold text-[#42675c]">{report.itemKind === "person" ? "حالة إنسانية" : report.itemKind === "animal" ? "رفيق ينتظر صاحبه" : "غرض بحاجة إلى أثر"}</span>
            </div>
          )}
          <div className="absolute inset-x-3 top-3 flex items-center justify-between gap-2">
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-extrabold shadow-sm ${report.reportType === "lost" ? "bg-[#fef0ec] text-[#b24d37]" : "bg-[#e8f3ee] text-[#0c6a56]"}`}>
              {reportTypeLabels[report.reportType]}
            </span>
            <StatusPill status={report.status} />
          </div>
        </div>
        <div className="p-5">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-[#79857d]"><KindIcon size={14} />{itemKindLabels[report.itemKind]}</p>
          <h3 className="line-clamp-1 font-display text-lg font-extrabold text-[#203029] transition-colors group-hover:text-[#0d5a4d]">{report.name}</h3>
          <p className="mt-2 line-clamp-2 min-h-12 text-sm leading-6 text-[#69756d]">{report.description}</p>
          <div className="mt-4 grid gap-2 border-t border-[#edf0eb] pt-4 text-xs font-medium text-[#718078]">
            <span className="flex items-center gap-1.5"><MapPin size={14} className="text-[#4d887b]" />{report.location}</span>
            <span className="flex items-center gap-1.5"><CalendarDays size={14} className="text-[#4d887b]" />{formatDate(report.incidentDate)}</span>
          </div>
        </div>
      </article>
    </Link>
  );
}
