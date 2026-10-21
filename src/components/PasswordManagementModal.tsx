import React, { useState } from "react";
import { Lock, Eye, EyeOff, ShieldCheck, CheckCircle2, AlertCircle, X, KeyRound } from "lucide-react";
import { auth, db } from "../firebaseClient";
import { updatePassword, EmailAuthProvider, linkWithCredential } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

interface PasswordManagementModalProps {
  mode: "issue" | "change"; // "issue" for Google user setting password first time, "change" for updating password
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  userEmail: string;
}

export default function PasswordManagementModal({
  mode,
  isOpen,
  onClose,
  onSuccess,
  userEmail,
}: PasswordManagementModalProps) {
  const [newPassword, setNewPassword] = useState<string>("");
  const [confirmPassword, setConfirmPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!newPassword || !confirmPassword) {
      setError("يرجى إدخال كلمة المرور وتأكيدها.");
      return;
    }

    if (newPassword.length < 6) {
      setError("يجب ألا تقل كلمة المرور عن 6 خانات.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("كلمتا المرور غير متطابقتين. يرجى إعادة التأكد.");
      return;
    }

    const currentUser = auth.currentUser;
    if (!currentUser) {
      setError("لم يتم العثور على جلسة تسجيل دخول نشطة.");
      return;
    }

    setLoading(true);

    try {
      if (mode === "issue") {
        // Link email and password credential to the existing Google account
        const credential = EmailAuthProvider.credential(currentUser.email || userEmail, newPassword);
        
        try {
          await linkWithCredential(currentUser, credential);
        } catch (linkErr: any) {
          console.warn("linkWithCredential note:", linkErr);
          // If already linked or provider exists, update password directly
          await updatePassword(currentUser, newPassword);
        }

        // Persist hasIssuedPassword flag to Firestore and localStorage
        const uid = currentUser.uid;
        const email = (currentUser.email || userEmail || "").toLowerCase();

        try {
          await currentUser.reload();
        } catch (reloadErr) {
          console.warn("User reload notice:", reloadErr);
        }

        try {
          const studentDocRef = doc(db, "students", uid);
          await setDoc(studentDocRef, {
            hasIssuedPassword: true,
            authProviderType: "google_and_password",
            registrationMethod: "حساب مسجل بقوقل وكلمة مرور",
            isGoogleWithPassword: true,
            treatAsEmailPasswordAccount: true,
            passwordIssuedAt: new Date().toISOString(),
          }, { merge: true });
        } catch (dbErr) {
          console.warn("Firestore password flag save warning:", dbErr);
        }

        localStorage.setItem(`stitchlab_has_issued_password_${uid}`, "true");
        localStorage.setItem(`stitchlab_registration_method_${uid}`, "حساب مسجل بقوقل وكلمة مرور");
        if (email) {
          localStorage.setItem(`stitchlab_has_issued_password_${email}`, "true");
          localStorage.setItem(`stitchlab_registration_method_${email}`, "حساب مسجل بقوقل وكلمة مرور");
        }

        // Dispatch window event so App updates immediately
        window.dispatchEvent(new CustomEvent("stitchlab_password_issued", {
          detail: {
            uid,
            email,
            registrationMethod: "حساب مسجل بقوقل وكلمة مرور",
          }
        }));

        onSuccess("تم إصدار وتفعيل كلمة المرور بنجاح! تحولت طريقة تسجيلك إلى «حساب مسجل بقوقل وكلمة مرور» وأصبح يعامل معاملة حساب مسجل ببريد إلكتروني وكلمة المرور.");
      } else {
        // Change existing password
        await updatePassword(currentUser, newPassword);
        onSuccess("تم تحديث كلمة المرور بنجاح! يمكنك الآن استخدام كلمة المرور الجديدة.");
      }

      setNewPassword("");
      setConfirmPassword("");
      onClose();
    } catch (err: any) {
      console.error("Password operation error:", err);
      let errMsg = "حدث خطأ أثناء حفظ كلمة المرور. يرجى المحاولة مرة أخرى.";

      if (err.code === "auth/requires-recent-login") {
        errMsg = "لأسباب أمنية تطلبها Google، يرجى تسجيل الخروج ثم تسجيل الدخول مجددًا لإكمال إصدار كلمة المرور.";
      } else if (err.code === "auth/weak-password") {
        errMsg = "كلمة المرور ضعيفة جدًا، يرجى اختيار كلمة مرور أقوى تحتوي على أرقام وحروف.";
      } else if (err.code === "auth/credential-already-in-use") {
        errMsg = "بيانات الاعتماد مستخدمة بالفعل لحساب آخر.";
      }

      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const isIssueMode = mode === "issue";

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[110] flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-[28px] p-6 max-w-md w-full border border-purple-150 shadow-2xl text-right space-y-4 animate-fadeIn relative">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 left-4 p-2 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer transition-colors text-sm font-bold disabled:opacity-50"
        >
          ✕
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-2.5 pb-3 border-b border-purple-100">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 text-white flex items-center justify-center shadow-md">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-purple-950">
              {isIssueMode ? "إصدار كلمة مرور لحساب قوقل 🔑" : "تغيير كلمة المرور 🔒"}
            </h3>
            <span className="text-[10px] text-slate-500 font-bold block truncate max-w-[220px]" dir="ltr">
              {userEmail}
            </span>
          </div>
        </div>

        {/* Info description */}
        <p className="text-[11px] text-slate-600 font-bold leading-relaxed">
          {isIssueMode
            ? "أدخل كلمة مرور قوية لحسابك. بعد إصدارها، ستتحول طريقة تسجيلك رسميًا إلى «حساب مسجل بقوقل وكلمة مرور» وتتم معاملة الحساب كحساب مسجل ببريد إلكتروني وكلمة المرور، وتختفي كل الإرشادات السابقة."
            : "أدخل كلمة المرور الجديدة التي ترغب في تعيينها لحسابك التعليمي."}
        </p>

        {/* Error notification */}
        {error && (
          <div className="p-3 rounded-xl text-xs bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="font-extrabold leading-snug">{error}</span>
          </div>
        )}

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="space-y-1 text-right">
            <label className="text-[10.5px] font-black text-slate-800 block">
              {isIssueMode ? "كلمة المرور الجديدة 🔒" : "كلمة المرور الجديدة 🔒"}
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="أدخل 6 أحرف أو أرقام على الأقل"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-purple-600 focus:bg-white transition-all pl-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-purple-600 cursor-pointer"
                title={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1 text-right">
            <label className="text-[10.5px] font-black text-slate-800 block">
              تأكيد كلمة المرور الجديدة 🔒
            </label>
            <input
              type={showPassword ? "text" : "password"}
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="أعد إدخال كلمة المرور للتأكيد"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 placeholder-slate-400 focus:outline-purple-600 focus:bg-white transition-all"
            />
          </div>

          <div className="pt-2 flex items-center gap-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white font-black text-xs rounded-xl shadow-md cursor-pointer transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin ml-1" />
                  <span>جاري حفظ كلمة المرور...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>{isIssueMode ? "إصدار وتفعيل كلمة المرور 🔑" : "حفظ كلمة المرور الجديدة ✓"}</span>
                </>
              )}
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold text-xs rounded-xl cursor-pointer transition-all disabled:opacity-50"
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
