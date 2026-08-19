import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { GUEST_MODE_STORAGE_KEY } from "@/lib/entry-mode";
import { trpc } from "@/lib/trpc";
import { startLegacyAccountLink } from "@/const";
import { Eye, EyeOff, HeartHandshake, LockKeyhole, Mail, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

type AuthMode = "login" | "register";

export default function Auth() {
  const [location, setLocation] = useLocation();
  const query = new URLSearchParams(typeof window === "undefined" ? "" : window.location.search);
  const requestedTarget = query.get("next") || "/my-reports";
  const target = requestedTarget.startsWith("/") && !requestedTarget.startsWith("//") ? requestedTarget : "/my-reports";
  const legacyMode = query.get("legacy") === "1";
  const { user, isAuthenticated, loading, refresh } = useAuth();
  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accountRole, setAccountRole] = useState<"user" | "admin">("user");
  const [adminSetupCode, setAdminSetupCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const register = trpc.auth.register.useMutation();
  const login = trpc.auth.login.useMutation();
  const setLocalPassword = trpc.auth.setPassword.useMutation();

  useEffect(() => {
    if (isAuthenticated && !legacyMode) setLocation(target);
  }, [isAuthenticated, legacyMode, setLocation, target]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      if (mode === "register") {
        await register.mutateAsync({ name, email, password, role: accountRole, adminSetupCode: accountRole === "admin" ? adminSetupCode : undefined });
        toast.success("تم إنشاء حسابك بنجاح.");
      } else {
        await login.mutateAsync({ email, password });
        toast.success("مرحبًا بعودتك إلى أثر.");
      }
      window.localStorage.removeItem(GUEST_MODE_STORAGE_KEY);
      await refresh();
      setLocation(target);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر إتمام العملية. حاول مرة أخرى.");
    }
  };

  const linkLegacyAccount = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await setLocalPassword.mutateAsync({ email: email || user?.email || "", password });
      window.localStorage.removeItem(GUEST_MODE_STORAGE_KEY);
      await refresh();
      toast.success("تم ربط كلمة المرور بحسابك السابق.");
      setLocation(target);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر ربط الحساب حاليًا.");
    }
  };

  const pending = register.isPending || login.isPending || setLocalPassword.isPending || loading;
  const legacyEmail = user?.email ?? "";
  if (legacyMode && isAuthenticated) return <main dir="rtl" className="auth-page"><section className="auth-panel"><Link href="/" className="auth-brand"><span><HeartHandshake size={23} /></span><strong>أثر</strong><small>للمفقودات والموجودات</small></Link><div className="auth-copy"><p className="eyebrow">انتقال الحساب</p><h1>احتفظ ببلاغاتك</h1><p>أنشئ كلمة مرور لحسابك السابق، ثم ستدخل إلى أثر بالبريد وكلمة المرور دون الاعتماد على تسجيل الدخول السابق.</p></div><form onSubmit={linkLegacyAccount} className="auth-form"><label><span>البريد الإلكتروني المرتبط</span><div><Mail size={18} /><input type="email" value={email || legacyEmail} onChange={event => setEmail(event.target.value)} placeholder="name@example.com" required /></div></label><label><span>كلمة المرور الجديدة</span><div><LockKeyhole size={18} /><input type={showPassword ? "text" : "password"} value={password} onChange={event => setPassword(event.target.value)} placeholder="8 أحرف على الأقل" minLength={8} maxLength={128} autoComplete="new-password" required /><button type="button" aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label><p className="auth-help">بعد الحفظ ستبقى البلاغات والمطابقات المرتبطة بحسابك كما هي.</p><Button type="submit" disabled={pending} className="auth-submit">{pending ? "جارٍ الحفظ..." : "حفظ كلمة المرور والمتابعة"}</Button></form></section><aside className="auth-aside"><div><p>انتقال آمن</p><h2>نفس البلاغات، وطريقة دخول مستقلة.</h2></div></aside></main>;
  return <main dir="rtl" className="auth-page"><section className="auth-panel"><Link href="/" className="auth-brand"><span><HeartHandshake size={23} /></span><strong>أثر</strong><small>للمفقودات والموجودات</small></Link><div className="auth-copy"><p className="eyebrow">حسابك في أثر</p><h1>{mode === "login" ? "أهلًا بعودتك" : "أنشئ حسابك بثقة"}</h1><p>{mode === "login" ? "ادخل بحسابك لتتابع بلاغاتك وتطابقاتك وإشعاراتك." : "احتفظ ببلاغاتك في مكان واحد، وتابع التطابقات المحتملة بأمان."}</p></div><div className="auth-tabs"><button type="button" onClick={() => setMode("login")} className={mode === "login" ? "auth-tab-active" : ""}>تسجيل الدخول</button><button type="button" onClick={() => setMode("register")} className={mode === "register" ? "auth-tab-active" : ""}>إنشاء حساب</button></div><form onSubmit={submit} className="auth-form">{mode === "register" && <><label><span>الاسم</span><div><UserRound size={18} /><input value={name} onChange={event => setName(event.target.value)} placeholder="اسمك الأول يكفي" minLength={2} maxLength={120} required /></div></label><fieldset className="role-picker"><legend>نوع الحساب</legend><div><label className={accountRole === "user" ? "role-option-active" : ""}><input type="radio" checked={accountRole === "user"} onChange={() => setAccountRole("user")} /> مستخدم عادي</label><label className={accountRole === "admin" ? "role-option-active" : ""}><input type="radio" checked={accountRole === "admin"} onChange={() => setAccountRole("admin")} /> مشرف</label></div></fieldset>{accountRole === "admin" && <label><span>رمز تفعيل المشرف</span><div><LockKeyhole size={18} /><input type="password" value={adminSetupCode} onChange={event => setAdminSetupCode(event.target.value)} placeholder="الرمز الذي حدده مالك المنصة" minLength={8} maxLength={256} required /></div></label>}</>}<label><span>البريد الإلكتروني</span><div><Mail size={18} /><input type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="name@example.com" autoComplete="email" required /></div></label><label><span>كلمة المرور</span><div><LockKeyhole size={18} /><input type={showPassword ? "text" : "password"} value={password} onChange={event => setPassword(event.target.value)} placeholder="8 أحرف على الأقل" minLength={8} maxLength={128} autoComplete={mode === "login" ? "current-password" : "new-password"} required /><button type="button" aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div></label>{mode === "register" && <p className="auth-help">لن نحفظ كلمة المرور بصيغتها الأصلية؛ تحفظ كتجزئة آمنة داخل قاعدة البيانات.</p>}<Button type="submit" disabled={pending} className="auth-submit">{pending ? "جارٍ المعالجة..." : mode === "login" ? "تسجيل الدخول" : "إنشاء الحساب"}</Button></form><div className="auth-guest"><span>تريد التصفح فقط؟</span><Link href="/">الدخول كزائر</Link></div><button type="button" onClick={startLegacyAccountLink} className="auth-legacy-link">لديك بلاغات مرتبطة بتسجيل دخول سابق؟ اربط كلمة مرور</button></section><aside className="auth-aside"><div><p>مسار واضح وخصوصية مسؤولة</p><h2>كل أثر يستحق أن يعود إلى صاحبه.</h2><ul><li>أدر بلاغاتك من لوحة واحدة.</li><li>راجع التطابقات المحتملة بحذر.</li><li>أغلق الحالة عند «تم الاسترجاع».</li></ul></div></aside></main>;
}
