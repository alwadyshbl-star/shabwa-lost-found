import { Camera, MapPin, ShieldAlert } from "lucide-react";

const guidance = [
  { icon: MapPin, title: "حدّد المكان بقدر مناسب", text: "يكفي الحي أو المعلم القريب؛ لا تنشر عنوانًا حساسًا." },
  { icon: Camera, title: "أضف علامة مميزة", text: "وصف واضح أو صورة اختيارية يرفعان فائدة المطابقة." },
  { icon: ShieldAlert, title: "احمِ معلوماتك", text: "لا تذكر أرقام هويات أو بيانات خاصة داخل الوصف." },
];

export default function ReportFormGuide() {
  return (
    <div className="report-form-guide">
      <div className="container grid gap-3 py-3 md:grid-cols-3">
        {guidance.map(item => {
          const Icon = item.icon;
          return <div key={item.title} className="report-form-guide-item"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white text-[#0d5a4d] shadow-sm"><Icon size={16} /></span><div><p>{item.title}</p><span>{item.text}</span></div></div>;
        })}
      </div>
    </div>
  );
}
