import React, { useState } from 'react';
import {
  Globe,
  ShieldCheck,
  CheckCircle2,
  Mail,
  User,
  KeyRound,
  Lock,
  Sparkles,
  Info
} from 'lucide-react';

interface SettingsPageProps {
  userEmail: string;
  studentName: string;
  onUpdateEmail?: (email: string) => void;
  onUpdateStudentName?: (name: string) => void;
  isGoogleUser: boolean;
  hasIssuedPassword: boolean;
  isGoogleWithPassword?: boolean;
  onOpenIssuePassword: () => void;
  onOpenChangePassword: () => void;
}

export default function SettingsPage({
  userEmail,
  studentName,
  onUpdateEmail,
  onUpdateStudentName,
  isGoogleUser,
  hasIssuedPassword,
  isGoogleWithPassword: propIsGoogleWithPassword,
  onOpenIssuePassword,
  onOpenChangePassword,
}: SettingsPageProps) {
  const [emailInput, setEmailInput] = useState(userEmail);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [nameInput, setNameInput] = useState(studentName);
  const [isEditingName, setIsEditingName] = useState(false);

  const isGoogleWithPassword = propIsGoogleWithPassword ?? ((isGoogleUser && hasIssuedPassword) || hasIssuedPassword);

  const handleSaveEmail = (e: React.FormEvent) => {
    e.preventDefault();
    if (emailInput.trim() && onUpdateEmail) {
      onUpdateEmail(emailInput.trim().toLowerCase());
      setIsEditingEmail(false);
    }
  };

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (nameInput.trim() && onUpdateStudentName) {
      onUpdateStudentName(nameInput.trim());
      setIsEditingName(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-fadeIn" dir="rtl">
      {/* رأس صفحة الإعدادات */}
      <div className="bg-white rounded-3xl p-6 border border-purple-100 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-2 bg-gradient-to-tr from-purple-600 to-pink-600 text-white rounded-xl shadow-xs">
              <Globe className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-black text-slate-900">
              إعدادات الحساب والأمان
            </h2>
          </div>
          <p className="text-xs text-slate-500 font-bold">
            إدارة بيانات الدخول وكلمة المرور وحسابك التعليمي في StitchLab
          </p>
        </div>

        {/* Dynamic Registration Badge */}
        <div className="flex items-center gap-2">
          <span className={`text-xs font-black px-3.5 py-1.5 rounded-xl border shadow-xs flex items-center gap-1.5 ${
            isGoogleWithPassword
              ? "bg-emerald-50 border-emerald-300 text-emerald-800"
              : isGoogleUser
              ? "bg-purple-50 border-purple-300 text-purple-800"
              : "bg-blue-50 border-blue-300 text-blue-800"
          }`}>
            {isGoogleWithPassword ? (
              <>
                <span>🔑🌐</span>
                <span>حساب مسجل بقوقل وكلمة مرور</span>
              </>
            ) : isGoogleUser ? (
              <>
                <span>🌐</span>
                <span>حساب مسجل بقوقل</span>
              </>
            ) : (
              <>
                <span>🔑</span>
                <span>حساب مسجل ببريد إلكتروني وكلمة مرور</span>
              </>
            )}
          </span>
        </div>
      </div>

      {/* ℹ️ Pre-Issue Guidance Instructions (تختفي فوراً وبالكامل عند إصدار كلمة المرور) */}
      {isGoogleUser && !hasIssuedPassword && !isGoogleWithPassword && (
        <div className="bg-gradient-to-br from-amber-50 to-orange-50/70 border-2 border-amber-300/80 rounded-3xl p-6 shadow-sm space-y-3.5 animate-fadeIn text-right">
          <div className="flex items-center gap-2 text-amber-950">
            <span className="p-1.5 bg-amber-200 text-amber-900 rounded-xl text-lg">💡</span>
            <h3 className="text-sm font-black">
              إرشادات إصدار كلمة مرور لحساب قوقل
            </h3>
          </div>

          <p className="text-xs text-amber-900 leading-relaxed font-bold">
            حسابك مسجل حالياً عبر قوقل فقط. عند إصدار كلمة مرور لحسابك، ستتمكن من تسجيل الدخول ببريدك الإلكتروني وكلمة المرور مباشرة من أي متصفح أو جهاز دون الحاجة لتسجيل دخول قوقل، وستتحول طريقة تسجيلك رسمياً إلى <strong>«حساب مسجل بقوقل وكلمة مرور»</strong> ويعامل معاملة حساب مسجل ببريد إلكتروني وكلمة المرور وتختفي كل هذه الإرشادات تلقائياً فور إصدار كلمة المرور.
          </p>

          <button
            type="button"
            onClick={onOpenIssuePassword}
            className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500 hover:opacity-95 text-white font-black text-xs rounded-2xl shadow-md cursor-pointer transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            <KeyRound className="w-4 h-4" />
            <span>🔑 إصدار كلمة مرور لحسابي الآن</span>
          </button>
        </div>
      )}

      {/* بطاقة معلومات الحساب والبريد */}
      <div className="bg-white rounded-3xl p-6 border border-purple-100 shadow-xs space-y-4">
        <h3 className="text-sm font-black text-purple-950 flex items-center gap-2 pb-2 border-b border-slate-100">
          <User className="w-4 h-4 text-purple-600" />
          <span>البيانات الأساسية للحساب</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* اسم الطالب */}
          <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-2">
            <span className="text-[11px] font-bold text-slate-500 block">اسم الطالب للعرض:</span>
            {isEditingName ? (
              <form onSubmit={handleSaveName} className="flex items-center gap-2">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="flex-1 text-xs px-3 py-1.5 rounded-xl border border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white"
                  autoFocus
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-purple-600 text-white text-xs font-bold rounded-xl hover:bg-purple-700 cursor-pointer"
                >
                  حفظ
                </button>
              </form>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-sm font-black text-slate-800">{studentName}</span>
                {onUpdateStudentName && (
                  <button
                    type="button"
                    onClick={() => setIsEditingName(true)}
                    className="text-xs text-purple-600 hover:text-purple-800 font-extrabold cursor-pointer"
                  >
                    تعديل
                  </button>
                )}
              </div>
            )}
          </div>

          {/* البريد الإلكتروني المسجل */}
          <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/80 space-y-2">
            <span className="text-[11px] font-bold text-slate-500 block">البريد الإلكتروني المعتمد:</span>
            {isEditingEmail ? (
              <form onSubmit={handleSaveEmail} className="flex items-center gap-2">
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="flex-1 text-xs px-3 py-1.5 rounded-xl border border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-400 bg-white font-mono"
                  autoFocus
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-purple-600 text-white text-xs font-bold rounded-xl hover:bg-purple-700 cursor-pointer"
                >
                  حفظ
                </button>
              </form>
            ) : (
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-slate-800 truncate max-w-[200px]" dir="ltr">
                  {userEmail}
                </span>
                {onUpdateEmail && (
                  <button
                    type="button"
                    onClick={() => setIsEditingEmail(true)}
                    className="text-xs text-purple-600 hover:text-purple-800 font-extrabold cursor-pointer"
                  >
                    تعديل
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* بطاقة إدارة كلمة المرور (تظهر عندما يملك المستخدم كلمة مرور أو عند إصدارها لحساب قوقل) */}
      {(hasIssuedPassword || isGoogleWithPassword || !isGoogleUser) && (
        <div className="bg-white rounded-3xl p-6 border border-purple-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-purple-100 text-purple-700 rounded-xl">
                <Lock className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-black text-slate-900">
                  إدارة كلمة المرور
                </h3>
                <span className="text-[10px] text-slate-400 font-bold block">
                  {isGoogleWithPassword
                    ? "حساب مسجل بقوقل وكلمة مرور (يعامل معاملة حساب مسجل ببريد إلكتروني وكلمة مرور)"
                    : "حساب مسجل ببريد إلكتروني وكلمة مرور"}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onOpenChangePassword}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-black text-xs rounded-xl shadow-xs cursor-pointer transition-all active:scale-95 flex items-center gap-1.5"
            >
              <span>🔒 تغيير كلمة المرور</span>
            </button>
          </div>

          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            {isGoogleWithPassword
              ? "حسابك الآن يعامل معاملة حساب مسجل ببريد إلكتروني وكلمة مرور. يمكنك تسجيل الدخول في أي وقت باستخدام بريدك الإلكتروني وكلمة المرور الخاصة بك مباشرة عبر نموذج تسجيل الدخول وتغييرها متى شئت."
              : "يمكنك تسجيل الدخول في أي وقت باستخدام بريدك الإلكتروني وكلمة المرور الخاصة بك مباشرة عبر نموذج تسجيل الدخول."}
          </p>
        </div>
      )}

      {/* خصوصية وأمان الحساب */}
      <div className="p-4 bg-purple-50/50 rounded-2xl border border-purple-100 text-xs text-slate-600 flex items-center gap-2.5">
        <ShieldCheck className="w-5 h-5 text-purple-600 shrink-0" />
        <span className="font-bold leading-relaxed">
          جميع بياناتك وجلساتك محمية بأعلى معايير التشفير والأمان من Firebase وGoogle.
        </span>
      </div>
    </div>
  );
}
