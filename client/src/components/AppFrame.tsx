import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Bell, ClipboardList, Eye, HeartHandshake, LayoutDashboard, Menu, Search, ShieldCheck, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import AccessWelcome from "@/components/AccessWelcome";
import GuestBanner from "@/components/GuestBanner";
import JourneyProgress, { type JourneyStage } from "@/components/JourneyProgress";
import ReportFormGuide from "@/components/ReportFormGuide";
import { GUEST_MODE_STORAGE_KEY, hasChosenGuestMode, shouldShowAccessWelcome } from "@/lib/entry-mode";

type AppFrameProps = { children: React.ReactNode };

const navigation = [
  { href: "/search", label: "استكشف البلاغات", icon: Search },
  { href: "/reports/new", label: "إضافة بلاغ", icon: ClipboardList },
  { href: "/my-reports", label: "بلاغاتي", icon: LayoutDashboard },
];

export default function AppFrame({ children }: AppFrameProps) {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const notificationFeed = trpc.notification.mine.useQuery(undefined, { enabled: isAuthenticated });
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [guestMode, setGuestMode] = useState(() =>
    typeof window !== "undefined" && hasChosenGuestMode(window.localStorage.getItem(GUEST_MODE_STORAGE_KEY)),
  );

  useEffect(() => {
    if (isAuthenticated && guestMode) {
      window.localStorage.removeItem(GUEST_MODE_STORAGE_KEY);
      setGuestMode(false);
    }
  }, [guestMode, isAuthenticated]);

  const continueAsGuest = () => {
    window.localStorage.setItem(GUEST_MODE_STORAGE_KEY, "guest");
    setGuestMode(true);
  };
  const showAccessWelcome = !loading && shouldShowAccessWelcome(isAuthenticated, guestMode ? "guest" : null);
  const unreadNotifications = notificationFeed.data?.filter(notification => !notification.isRead).length ?? 0;
  const journeyStage: JourneyStage | null =
    location === "/search" ? "discover" :
    location === "/reports/new" ? "report" :
    location === "/my-reports" || location === "/notifications" || location.startsWith("/reports/") ? "match" :
    null;

  const navLinks = navigation.map(item => {
    const Icon = item.icon;
    const active = location === item.href;
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setMobileOpen(false)}
        className={`nav-link ${active ? "nav-link-active" : ""}`}
      >
        <Icon size={17} strokeWidth={2.1} />
        {item.label}
      </Link>
    );
  });

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#f8f8f5] text-[#17211e]" dir="rtl">
      <header className="sticky top-0 z-40 border-b border-[#e7e8e0]/90 bg-[#f8f8f5]/92 backdrop-blur-xl">
        <div className="container flex h-[76px] items-center justify-between gap-4">
          <Link href="/" className="group flex items-center gap-3" aria-label="العودة إلى الصفحة الرئيسية">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#0d5a4d] text-white shadow-[0_10px_20px_rgba(13,90,77,0.18)] transition-transform duration-200 group-hover:-rotate-3 group-hover:scale-105">
              <HeartHandshake size={22} />
            </span>
            <span className="hidden leading-tight sm:block">
              <span className="block font-display text-lg font-extrabold tracking-tight">أثر</span>
              <span className="block text-[10px] font-bold tracking-[0.13em] text-[#7c877f]">للمفقودات والموجودات</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="التنقل الرئيسي">
            {navLinks}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            {isAuthenticated ? (
              <>
                <Link href="/notifications" className="icon-button relative" aria-label="الإشعارات">
                  <Bell size={19} />
                  {unreadNotifications > 0 && <span className="notification-nav-badge">{unreadNotifications > 9 ? "9+" : unreadNotifications}</span>}
                </Link>
                {user?.role === "admin" && (
                  <Link href="/admin" className="icon-button" aria-label="لوحة المشرف">
                    <ShieldCheck size={19} />
                  </Link>
                )}
                <Link href="/my-reports" className="hidden rounded-full bg-[#e8f1ee] px-4 py-2 text-sm font-bold text-[#0d5a4d] transition-colors hover:bg-[#dcebe5] xl:block">
                  {user?.name || "حسابي"}
                </Link>
                <Button variant="ghost" className="h-9 px-2 text-xs font-bold text-[#69756d]" onClick={logout}>
                  خروج
                </Button>
              </>
            ) : guestMode ? (
              <>
                <span className="rounded-full bg-[#edf3ef] px-3 py-2 text-xs font-bold text-[#607168]">تتصفح كزائر</span>
                <Button onClick={startLogin} className="rounded-xl bg-[#0d5a4d] px-4 font-bold text-white hover:bg-[#07473d]">إنشاء حساب</Button>
              </>
            ) : (
              <Button onClick={startLogin} disabled={loading} className="rounded-xl bg-[#0d5a4d] px-5 font-bold text-white shadow-sm hover:bg-[#07473d]">
                تسجيل الدخول
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2 md:hidden">
            {isAuthenticated && <Link href="/notifications" className="icon-button relative" aria-label="الإشعارات"><Bell size={19} />{unreadNotifications > 0 && <span className="notification-nav-badge">{unreadNotifications > 9 ? "9+" : unreadNotifications}</span>}</Link>}
            <button className="icon-button" onClick={() => setMobileOpen(!mobileOpen)} aria-label="فتح القائمة">
              {mobileOpen ? <X size={21} /> : <Menu size={21} />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="border-t border-[#e7e8e0] bg-[#f8f8f5] px-4 py-4 md:hidden">
            <nav className="container grid gap-2" aria-label="التنقل على الجوال">
              {navLinks}
              {isAuthenticated ? (
                <>
                  <Link href="/notifications" onClick={() => setMobileOpen(false)} className="nav-link"><Bell size={17} />الإشعارات</Link>
                  {user?.role === "admin" && <Link href="/admin" onClick={() => setMobileOpen(false)} className="nav-link"><ShieldCheck size={17} />لوحة المشرف</Link>}
                  <Button variant="ghost" className="justify-start px-3 font-bold" onClick={logout}>تسجيل الخروج</Button>
                </>
              ) : guestMode ? (
                <><span className="nav-link"><Eye size={17} />تتصفح كزائر</span><Button onClick={startLogin} className="mt-2 rounded-xl bg-[#0d5a4d] font-bold text-white">إنشاء حساب</Button></>
              ) : (
                <Button onClick={startLogin} className="mt-2 rounded-xl bg-[#0d5a4d] font-bold text-white">تسجيل الدخول أو إنشاء حساب</Button>
              )}
            </nav>
          </div>
        )}
      </header>

      {guestMode && <GuestBanner onCreateAccount={startLogin} />}
      {journeyStage && <div className="border-b border-[#e6ece7] bg-white/70"><div className="container py-3"><JourneyProgress active={journeyStage} /></div></div>}
      {location === "/reports/new" && <ReportFormGuide />}

      <main>{children}</main>

      <footer className="mt-20 border-t border-[#e4e6df] bg-[#f1f3ee]">
        <div className="container grid gap-7 py-10 sm:grid-cols-[1.35fr_1fr_1fr]">
          <div>
            <div className="mb-3 flex items-center gap-2 font-display text-xl font-extrabold text-[#124e43]"><HeartHandshake size={21} /> أثر</div>
            <p className="max-w-sm text-sm leading-7 text-[#68746c]">مساحة مجتمعية منظمة تساعد على إعادة ما فُقد إلى أصحابه، باحترام وخصوصية ومسار واضح للتحقق.</p>
          </div>
          <div className="text-sm leading-8 text-[#657168]">
            <p className="mb-2 font-bold text-[#273630]">روابط سريعة</p>
            <Link href="/search" className="block hover:text-[#0d5a4d]">استكشف البلاغات</Link>
            <Link href="/reports/new" className="block hover:text-[#0d5a4d]">إضافة بلاغ</Link>
          </div>
          <div className="text-sm leading-8 text-[#657168]">
            <p className="mb-2 font-bold text-[#273630]">الثقة والخصوصية</p>
            <p>لا تظهر بيانات التواصل إلا في صفحة البلاغ، ولا تكفي المطابقة وحدها لإثبات الملكية.</p>
          </div>
        </div>
      </footer>
      {showAccessWelcome && <AccessWelcome onContinueGuest={continueAsGuest} onStartAccount={startLogin} />}
    </div>
  );
}
