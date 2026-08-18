export type ReportType = "lost" | "found";
export type ItemKind = "person" | "animal" | "item";
export type ReportStatus = "open" | "recovered" | "under_review";

export const itemKindLabels: Record<ItemKind, string> = {
  person: "شخص",
  animal: "حيوان",
  item: "غرض",
};

export const reportTypeLabels: Record<ReportType, string> = {
  lost: "مفقود",
  found: "موجود",
};

export const statusLabels: Record<ReportStatus, string> = {
  open: "مفتوح",
  recovered: "تم الاسترجاع",
  under_review: "قيد المراجعة",
};

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(date.getTime())
    ? String(value)
    : new Intl.DateTimeFormat("ar-YE", { day: "numeric", month: "long", year: "numeric" }).format(date);
}
