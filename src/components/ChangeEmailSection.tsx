import React, { useState } from "react";
import { 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Copy, 
  Check, 
  Sparkles,
  Key
} from "lucide-react";
import { 
  auth, 
  googleProvider 
} from "../firebaseClient";
import { 
  EmailAuthProvider, 
  GoogleAuthProvider, 
  reauthenticateWithCredential, 
  reauthenticateWithPopup, 
  verifyBeforeUpdateEmail 
} from "firebase/auth";

interface ChangeEmailSectionProps {
  onBack: () => void;
  showToast: (message: string, type: "success" | "error" | "info") => void;
}

export default function ChangeEmailSection({ onBack, showToast }: ChangeEmailSectionProps) {
  const currentUser = auth.currentUser;
  const currentEmail = currentUser?.email || "";

  // Identify providers
  const providerData = currentUser?.providerData || [];
  const hasGoogleProvider = providerData.some((p) => p.providerId === "google.com");
  const hasPasswordProvider = providerData.some((p) => p.providerId === "password");

  // Check if a password was previously extracted/generated for this user
  const [passwordExtracted, setPasswordExtracted] = useState<boolean>(() => {
    if (typeof window === "undefined" || !currentUser?.uid) return false;
    return localStorage.getItem(`stitchlab_pwd_extracted_${currentUser.uid}`) === "true";
  });

  const [isExtractingPassword, setIsExtractingPassword] = useState<boolean>(false);

  // Computed account statuses
  const isGoogleWithPassword = hasGoogleProvider && (hasPasswordProvider || passwordExtracted);
  const isOnlyGoogle = hasGoogleProvider && !hasPasswordProvider && !passwordExtracted;
  const isOnlyPassword = !hasGoogleProvider && hasPasswordProvider;

  // Form State
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [copiedCurrent, setCopiedCurrent] = useState(false);

  // Email format validation helper
  const isValidEmail = (emailStr: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr);
  };

  // Convert Firebase error codes to friendly Arabic notifications
  const getArabicErrorMessage = (error: any): string => {
    const code = error?.code || "";
    switch (code) {
      case "auth/wrong-password":
      case "auth/invalid-credential":
        return "كلمة المرور الحالية غير صحيحة. يرجى التأكد وإعادة المحاولة.";
      case "auth/invalid-email":
        return "صيغة البريد الإلكتروني الجديد غير صالحة. يرجى إدخال بريد صحيح.";
      case "auth/email-already-in-use":
        return "البريد الإلكتروني الجديد مستخدم بالفعل في حساب آخر.";
      case "auth/requires-recent-login":
        return "يتطلب هذا الإجراء تسجيل دخول حديث لتأكيد هويتك. يرجى تسجيل الخروج وإعادة الدخول.";
      case "auth/user-mismatch":
        return "حساب Google الذي تم اختياره لا يتطابق مع الحساب المسجل به حالياً.";
      case "auth/popup-closed-by-user":
        return "تم إغلاق نافذة التحقق بـ Google قبل إكمال العملية. يرجى إعادة المحاولة.";
      case "auth/popup-blocked":
        return "تم حظر النافذة المنبثقة من قبل المتصفح. يرجى السماح بالنوافذ المنبثقة والمحاولة مجدداً.";
      case "auth/too-many-requests":
        return "تم حظر المحاولات مؤقتاً بسبب تكرار العمليات. يرجى الانتظار دقيقة والمحاولة مجدداً.";
      case "auth/network-request-failed":
        return "تعذر الاتصال بالشبكة. يرجى التحقق من اتصالك بالإنترنت.";
      case "auth/operation-not-allowed":
        return "خدمة تحديث البريد الإلكتروني غير مفعلة في خادم المصادقة.";
      default:
        if (error?.message) {
          return `فشل التحديث: ${error.message}`;
        }
        return "حدث خطأ غير متوقع أثناء تحديث البريد الإلكتروني. يرجى المحاولة مرة أخرى.";
    }
  };

  // Requirement: "واستخراج كلمة مرور للحساب تختفي جميع الارشادات المخصصة بحساب مسجل بقوقل ويتغير إلى حساب مسجل بقوقل وكلمة مرور"
  const handleExtractPassword = async () => {
    if (!currentUser?.email) {
      const msg = "لا يوجد بريد إلكتروني مسجل للمستخدم الحالي.";
      setStatusMessage({ type: "error", text: msg });
      showToast(msg, "error");
      return;
    }

    setIsExtractingPassword(true);
    setStatusMessage(null);

    try {
      const { sendPasswordResetEmail } = await import("firebase/auth");
      await sendPasswordResetEmail(auth, currentUser.email);

      // Persist password extracted flag
      localStorage.setItem(`stitchlab_pwd_extracted_${currentUser.uid}`, "true");
      setPasswordExtracted(true);

      // Notify App.tsx to update header / settings badge synchronously
      window.dispatchEvent(new CustomEvent("stitchlab_account_type_changed", {
        detail: { uid: currentUser.uid, hasPassword: true }
      }));

      const successMsg = "تم إرسال رابط استخراج وتعيين كلمة المرور إلى بريدك الإلكتروني بنجاح! تم تغيير الحساب إلى (حساب مسجل بقوقل وكلمة مرور).";
      setStatusMessage({ type: "success", text: successMsg });
      showToast(successMsg, "success");
    } catch (err: any) {
      console.error("Password extraction failed:", err);
      const errMsg = "تعذر إرسال رابط استخراج كلمة المرور. يرجى المحاولة مرة أخرى.";
      setStatusMessage({ type: "error", text: errMsg });
      showToast(errMsg, "error");
    } finally {
      setIsExtractingPassword(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    const trimmedNewEmail = newEmail.trim();

    // 1. Validation checks
    if (!currentUser) {
      const msg = "لم يتم العثور على جلسة مستخدم مسجلة. يرجى تسجيل الدخول أولاً.";
      setStatusMessage({ type: "error", text: msg });
      showToast(msg, "error");
      return;
    }

    if (!trimmedNewEmail) {
      const msg = "يرجى كتابة البريد الإلكتروني الجديد.";
      setStatusMessage({ type: "error", text: msg });
      showToast(msg, "error");
      return;
    }

    if (!isValidEmail(trimmedNewEmail)) {
      const msg = "صيغة البريد الإلكتروني الجديد غير صالحة (مثال: name@example.com).";
      setStatusMessage({ type: "error", text: msg });
      showToast(msg, "error");
      return;
    }

    if (currentEmail && trimmedNewEmail.toLowerCase() === currentEmail.toLowerCase()) {
      const msg = "البريد الإلكتروني الجديد مطابق تماماً لبريدك الحالي! يرجى إدخال بريد مختلف.";
      setStatusMessage({ type: "error", text: msg });
      showToast(msg, "error");
      return;
    }

    // If account has password (password user or google with password), require password
    if ((isOnlyPassword || isGoogleWithPassword) && !currentPassword) {
      const msg = "يرجى إدخال كلمة المرور لتأكيد هويتك ومتابعة تغيير البريد.";
      setStatusMessage({ type: "error", text: msg });
      showToast(msg, "error");
      return;
    }

    setIsLoading(true);

    try {
      // 2. Re-authentication Logic
      if (currentPassword) {
        // Authenticate with Email/Password
        const credential = EmailAuthProvider.credential(currentUser.email || "", currentPassword);
        try {
          await reauthenticateWithCredential(currentUser, credential);
        } catch (credErr) {
          // If user also has Google provider, allow Google popup fallback if credentials mismatched
          if (hasGoogleProvider) {
            const provider = new GoogleAuthProvider();
            provider.setCustomParameters({ prompt: "select_account" });
            await reauthenticateWithPopup(currentUser, provider);
          } else {
            throw credErr;
          }
        }
      } else if (isOnlyGoogle) {
        // Re-authenticate with Google Popup
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: "select_account" });
        await reauthenticateWithPopup(currentUser, provider);
      }

      // 3. Trigger verifyBeforeUpdateEmail
      await verifyBeforeUpdateEmail(currentUser, trimmedNewEmail);

      // 4. Post-Action UX: Success state & toast
      const successMsg = "تم إرسال رابط التأكيد إلى بريدك الإلكتروني الجديد. يرجى التحقق من صندوق الوارد لإتمام التغيير.";
      setStatusMessage({ type: "success", text: successMsg });
      showToast(successMsg, "success");

      // Reset sensitive fields
      setCurrentPassword("");
      setNewEmail("");
    } catch (err: any) {
      console.error("Change Email Error:", err);
      const arabicError = getArabicErrorMessage(err);
      setStatusMessage({ type: "error", text: arabicError });
      showToast(arabicError, "error");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4 animate-fadeIn text-right" dir="rtl">
      {/* Sub-header with Back Button */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2 text-purple-950">
          <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center text-sm shadow-2xs">
            <Mail className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black text-purple-950 leading-tight">تغيير البريد الإلكتروني</h3>
            <span className="text-[10px] text-slate-500 font-bold block">إعدادات الأمان والتحقق</span>
          </div>
        </div>

        <button 
          onClick={onBack}
          type="button"
          className="py-1.5 px-3 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl cursor-pointer font-bold text-xs transition-colors flex items-center gap-1 active:scale-95"
        >
          <ArrowRight className="w-3.5 h-3.5" />
          <span>عودة للإعدادات</span>
        </button>
      </div>

      {/* Security Context Notice */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-100/80 text-[11px] font-bold text-purple-950 leading-relaxed flex items-start gap-2.5">
        <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
        <div>
          <span>لحماية حسابك ومحتوياتك، يتم التحقق من هويتك أولاً ثم يُرسل رابط تأكيد فوري إلى بريدك الجديد لتوثيق التغيير.</span>
        </div>
      </div>

      {/* Status Banner */}
      {statusMessage && (
        <div className={`p-3.5 rounded-2xl border text-xs font-black flex items-start gap-2.5 animate-fadeIn ${
          statusMessage.type === "success"
            ? "bg-emerald-50 text-emerald-900 border-emerald-200"
            : "bg-rose-50 text-rose-900 border-rose-200"
        }`}>
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 leading-relaxed">
            <p>{statusMessage.text}</p>
            {statusMessage.type === "success" && (
              <div className="mt-2 text-[10.5px] font-bold text-emerald-800 bg-white/70 p-2 rounded-xl border border-emerald-100/60 space-y-1">
                <p>📩 خطوات استكمال التحديث:</p>
                <ol className="list-decimal list-inside pr-1 space-y-0.5 text-slate-700">
                  <li>افتح بريدك الإلكتروني الجديد وافحص صندوق الوارد (أو الرسائل غير المرغوبة).</li>
                  <li>انقر على رابط التأكيد المُرسل لتفعيل التغيير.</li>
                  <li>بعد التأكيد، ستتمكن من تسجيل الدخول فوراً ببريدك الجديد!</li>
                </ol>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 🔑 Extract Password Option for Google users */}
      {hasGoogleProvider && (
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-50/90 via-orange-50/60 to-purple-50/50 border border-amber-200 space-y-2 text-right shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-950 font-black text-xs">
              <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center text-xs shadow-2xs">
                <Key className="w-3.5 h-3.5" />
              </div>
              <span>استخراج كلمة مرور للحساب</span>
            </div>
            {isGoogleWithPassword ? (
              <span className="text-[9.5px] font-black px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-200">
                مفعّل بكلمة مرور ✓
              </span>
            ) : null}
          </div>
          <p className="text-[10.5px] text-amber-900 font-bold leading-relaxed">
            {isGoogleWithPassword
              ? "تم استخراج كلمة مرور لهذا الحساب. أصبح حسابك الآن (مسجل بقوقل وكلمة مرور)، ويمكنك استخدام كلمة المرور لتأكيد التغييرات والدخول في أي وقت."
              : "يمكنك استخراج وإنشاء كلمة مرور لحسابك المسجل بقوقل لتسجيل الدخول بالبريد وكلمة المرور وتأكيد العمليات بكل سهولة."}
          </p>
          {!isGoogleWithPassword && (
            <button
              type="button"
              disabled={isExtractingPassword || isLoading}
              onClick={handleExtractPassword}
              className="py-2 px-3.5 bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-700 hover:to-orange-600 disabled:opacity-50 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs active:scale-95 flex items-center justify-center gap-1.5"
            >
              {isExtractingPassword ? (
                <>
                  <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                  <span>جاري استخراج الرابط وإرساله...</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>استخراج كلمة مرور للحساب الآن 🔑</span>
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* 💡 Styled Alert Box for Google Users - ONLY shown when user is pure Google without password */}
      {isOnlyGoogle && (
        <div 
          className="p-3.5 sm:p-4 rounded-2xl bg-sky-50 border border-sky-200 text-sky-950 text-right space-y-2 shadow-2xs animate-fadeIn" 
          dir="rtl"
        >
          <div className="flex items-center gap-2 text-sky-900">
            <span className="text-base select-none">💡</span>
            <h4 className="text-xs sm:text-sm font-black tracking-tight">
              إرشادات مهمة لمستخدمي Google:
            </h4>
          </div>
          <div className="text-[11px] sm:text-xs font-bold text-sky-900/90 leading-relaxed pr-2 space-y-1.5">
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0 mt-1.5"></span>
              <span>أدخل بريدك الجديد واضغط حفظ.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0 mt-1.5"></span>
              <span>افتح البريد الجديد واضغط على رابط التأكيد المرسل.</span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0 mt-1.5"></span>
              <span>في شاشة الدخول، اضغط &quot;نسيت كلمة المرور؟&quot; أو اضغط &quot;استخراج كلمة مرور&quot; أعلاه لإنشاء كلمة سر لبريدك والدخول بحسابك.</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Change Email Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 1. Current Email (Read-only) */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-black text-slate-700 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-purple-600" />
              <span>البريد الإلكتروني الحالي</span>
            </span>
            <span className="text-[9.5px] font-extrabold text-slate-400">للقراءة فقط</span>
          </label>
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700">
            <span className="flex-1 font-mono text-[11px] select-all truncate dir-ltr text-left">
              {currentEmail || "لا يوجد بريد مسجل"}
            </span>
            {currentEmail && (
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(currentEmail);
                  setCopiedCurrent(true);
                  setTimeout(() => setCopiedCurrent(false), 2000);
                }}
                className="text-slate-400 hover:text-purple-600 transition-colors p-1 rounded-md"
                title="نسخ البريد الحالي"
              >
                {copiedCurrent ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>

          {/* Account Registration Type Badge */}
          <div className="flex items-center gap-1.5 text-[10px] text-purple-800/80 font-bold pr-1">
            <span>نوع التسجيل:</span>
            <span className="px-2 py-0.5 rounded-md bg-purple-100/80 text-purple-900 font-black">
              {isGoogleWithPassword 
                ? "حساب مسجل بقوقل وكلمة مرور 🌐🔑" 
                : isOnlyGoogle 
                ? "حساب مسجل بقوقل 🌐" 
                : isOnlyPassword 
                ? "بريد وكلمة مرور 🔑" 
                : "حساب مسجل"}
            </span>
          </div>
        </div>

        {/* 2. New Email Field */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-black text-slate-700 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-pink-500" />
            <span>البريد الإلكتروني الجديد</span>
            <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="مثال: student@gmail.com"
              required
              disabled={isLoading}
              dir="ltr"
              className="w-full bg-white border border-purple-200 rounded-xl px-3.5 py-2.5 text-xs text-left font-sans font-bold text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500 transition-all shadow-2xs"
            />
          </div>
          <span className="text-[9.5px] text-slate-400 font-bold block pr-1">
            سيتم إرسال رابط التفعيل إلى هذا العنوان قبل اعتماده رسمياً.
          </span>

          {/* Conditional note for password users */}
          {(isOnlyPassword || isGoogleWithPassword) && (
            <p className="text-[10.5px] text-slate-500 font-bold pr-1 pt-0.5 leading-relaxed">
              ملاحظة: عند تغيير بريدك وتأكيده، ستظل كلمة المرور الحالية كما هي دون تغيير.
            </p>
          )}
        </div>

        {/* 3. Provider Authentication Section */}
        {(isOnlyPassword || isGoogleWithPassword) ? (
          // Accounts with password: Show Password Field
          <div className="space-y-1.5 pt-1 border-t border-slate-100">
            <label className="text-[11px] font-black text-slate-700 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-purple-600" />
                <span>كلمة المرور الحالية</span>
                <span className="text-rose-500">*</span>
              </span>
              <span className="text-[9.5px] text-purple-600 font-extrabold">تأكيد الأمان</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="أدخل كلمة المرور الحالية لحسابك..."
                required
                disabled={isLoading}
                dir="ltr"
                className="w-full bg-white border border-purple-200 rounded-xl px-3.5 py-2.5 pr-10 text-xs text-left font-sans font-bold text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500 transition-all shadow-2xs"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                title={showPassword ? "إخفاء كلمة المرور" : "عرض كلمة المرور"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <span className="text-[9.5px] text-slate-400 font-bold block pr-1">
              مطلوبة لإثبات ملكيتك للحساب وحمايته من التغييرات غير المصرح بها.
            </span>
          </div>
        ) : isOnlyGoogle ? (
          // Pure Google Sign-In Users: Show Google prompt
          <div className="p-3.5 rounded-2xl bg-sky-50/70 border border-sky-100 space-y-1.5 text-right">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-white border border-sky-200 flex items-center justify-center text-xs shrink-0 shadow-2xs">
                🌐
              </div>
              <h5 className="text-[11px] font-black text-sky-950">تأكيد الحساب عبر Google</h5>
            </div>
            <p className="text-[10px] text-sky-800 font-bold leading-relaxed">
              نظراً لأنك مسجل عبر Google فقط، اضغط على زر الحفظ أدناه للتحقق من هويتك عبر نافذة Google وإرسال رابط التفعيل، أو يمكنك استخراج كلمة مرور لحسابك أعلاه.
            </p>
          </div>
        ) : (
          // Fallback
          <div className="space-y-1.5 pt-1 border-t border-slate-100">
            <label className="text-[11px] font-black text-slate-700 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-purple-600" />
              <span>كلمة المرور الحالية (إن وجدت)</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="أدخل كلمة المرور إن كان حسابك يعتمد عليها..."
                disabled={isLoading}
                dir="ltr"
                className="w-full bg-white border border-purple-200 rounded-xl px-3.5 py-2.5 pr-10 text-xs text-left font-sans font-bold text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500 transition-all shadow-2xs"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}

        {/* 4. Action Buttons */}
        <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
          <button
            type="submit"
            disabled={isLoading}
            className="flex-1 py-3 px-4 bg-gradient-to-r from-purple-600 via-pink-600 to-purple-700 hover:from-purple-700 hover:to-pink-700 text-white font-black rounded-xl text-xs transition-all shadow-md hover:shadow-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-98"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                <span>جاري التحقق وتحديث البريد...</span>
              </>
            ) : isOnlyGoogle ? (
              <>
                <span>🌐 حفظ وتأكيد الهوية بـ Google</span>
              </>
            ) : (
              <>
                <Mail className="w-4 h-4" />
                <span>حفظ وإرسال رابط التأكيد 🚀</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onBack}
            disabled={isLoading}
            className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            إلغاء
          </button>
        </div>
      </form>
    </div>
  );
}
