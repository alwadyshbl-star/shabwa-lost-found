import { Eye, UserRoundPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GuestBanner({ onCreateAccount }: { onCreateAccount: () => void }) {
  return (
    <div className="guest-banner">
      <div className="container flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2 text-xs font-bold leading-6 text-[#41665a]"><span className="grid h-7 w-7 place-items-center rounded-lg bg-[#dceee6] text-[#0d5a4d]"><Eye size={15} /></span>أنت تتصفح كزائر. يمكنك البحث وقراءة البلاغات العامة، وستحتاج حسابًا لإضافة بلاغ أو إرسال تطابق.</p>
        <Button onClick={onCreateAccount} variant="outline" className="h-9 shrink-0 rounded-lg border-[#a8ccbe] bg-white px-3 text-xs font-extrabold text-[#0d5a4d] hover:bg-[#eff8f3]"><UserRoundPlus size={15} />إنشاء حساب</Button>
      </div>
    </div>
  );
}
