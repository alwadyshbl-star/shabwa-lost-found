import { ArrowLeft, Eye, HeartHandshake, ShieldCheck, UserRoundPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

type AccessWelcomeProps = {
  onContinueGuest: () => void;
  onStartAccount: () => void;
};

export default function AccessWelcome({ onContinueGuest, onStartAccount }: AccessWelcomeProps) {
  return (
    <div className="fixed inset-0 z-[70] grid place-items-center overflow-y-auto bg-[#0d2f28]/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="access-welcome-title">
      <div className="relative w-full max-w-3xl overflow-hidden rounded-[2rem] border border-white/60 bg-[#fcfcf9] shadow-[0_30px_90px_rgba(4,40,31,0.36)]">
        <div className="access-welcome-art absolute inset-x-0 top-0 h-48" />
        <div className="relative p-6 sm:p-10">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#0d5a4d] text-white shadow-[0_12px_30px_rgba(13,90,77,0.25)]"><HeartHandshake size={28} /></div>
          <div className="mx-auto mt-5 max-w-xl text-center">
            <p className="eyebrow">مرحبًا بك في أثر</p>
            <h1 id="access-welcome-title" className="mt-3 font-display text-3xl font-black leading-[1.5] text-[#173e35] sm:text-4xl">كيف ترغب في البدء؟</h1>
            <p className="mt-3 text-sm leading-7 text-[#66776e] sm:text-base">أنشئ حسابًا لإضافة البلاغات وإدارة التطابقات، أو تصفح البلاغات العامة كزائر دون مشاركة أي بيانات.</p>
          </div>
          <div className="mx-auto mt-8 grid max-w-2xl gap-4 md:grid-cols-2">
            <button type="button" onClick={onStartAccount} className="access-choice access-choice-primary text-right">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/15 text-white"><UserRoundPlus size={21} /></span>
              <span className="mt-5 block text-lg font-extrabold">إنشاء حساب أو تسجيل الدخول</span>
              <span className="mt-2 block text-sm leading-6 text-[#d5e8df]">أضف بلاغاتك، راجع التطابقات، وتابع حالة الاسترجاع.</span>
              <span className="mt-6 inline-flex items-center gap-1 text-sm font-extrabold">ابدأ بحسابك <ArrowLeft size={16} /></span>
            </button>
            <button type="button" onClick={onContinueGuest} className="access-choice access-choice-guest text-right">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[#e1f0e9] text-[#0d5a4d]"><Eye size={21} /></span>
              <span className="mt-5 block text-lg font-extrabold text-[#23463b]">الدخول كزائر</span>
              <span className="mt-2 block text-sm leading-6 text-[#6b7b72]">استكشف وابحث في البلاغات العامة. ستحتاج حسابًا لإنشاء بلاغ أو الإبلاغ عن تطابق.</span>
              <span className="mt-6 inline-flex items-center gap-1 text-sm font-extrabold text-[#0d5a4d]">متابعة كزائر <ArrowLeft size={16} /></span>
            </button>
          </div>
          <p className="mt-6 flex items-center justify-center gap-2 text-center text-xs leading-6 text-[#718078]"><ShieldCheck size={16} className="shrink-0 text-[#31856e]" />لا نطلب أي بيانات قبل اختيارك، ويمكنك إنشاء حساب لاحقًا في أي وقت.</p>
        </div>
      </div>
    </div>
  );
}
