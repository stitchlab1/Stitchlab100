import React from 'react';
import { Sparkles, User, Clock, Activity, LogOut, CheckCircle, Settings, MessageSquare, BookOpen, Award, CheckCircle2 } from 'lucide-react';

export type AppTab = 'session' | 'chat' | 'analyzer' | 'quiz' | 'settings';

interface StudentHeaderProps {
  studentName: string;
  isLoggedIn: boolean;
  onStudentNameChange: (newName: string) => void;
  onEndSession: () => void;
  onLogout: () => void;
  formattedSessionTime: string;
  isIdle: boolean;
  isActive: boolean;
  activeTab: AppTab;
  onSelectTab: (tab: AppTab) => void;
  isGoogleUser?: boolean;
  hasIssuedPassword?: boolean;
  isGoogleWithPassword?: boolean;
}

export default function StudentHeader({
  studentName,
  isLoggedIn,
  onStudentNameChange,
  onEndSession,
  onLogout,
  formattedSessionTime,
  isIdle,
  isActive,
  activeTab,
  onSelectTab,
  isGoogleUser = false,
  hasIssuedPassword = false,
  isGoogleWithPassword: propIsGoogleWithPassword,
}: StudentHeaderProps) {
  const [isEditingName, setIsEditingName] = React.useState(false);
  const [tempName, setTempName] = React.useState(studentName);

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempName.trim()) {
      onStudentNameChange(tempName.trim());
      setIsEditingName(false);
    }
  };

  const isGoogleWithPassword = propIsGoogleWithPassword ?? (isGoogleUser && hasIssuedPassword);

  const navItems = [
    { id: 'session' as AppTab, label: 'الجلسة الحالية', icon: Clock },
    { id: 'chat' as AppTab, label: 'محادثة الذكاء الاصطناعي', icon: MessageSquare },
    { id: 'analyzer' as AppTab, label: 'محلل القواعد', icon: BookOpen },
    { id: 'quiz' as AppTab, label: 'الاختبارات الذكية', icon: Award },
    { id: 'settings' as AppTab, label: 'الإعدادات', icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-purple-100 shadow-xs select-none" dir="rtl">
      <div className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        {/* الشعار واسم المنصة */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 via-pink-600 to-rose-500 p-0.5 shadow-md shadow-purple-500/20 flex items-center justify-center">
            <span className="text-white font-black text-lg tracking-wider">S</span>
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-lg font-black bg-gradient-to-r from-purple-700 via-pink-600 to-rose-600 bg-clip-text text-transparent">
                StitchLab
              </h1>
              {/* Account badge */}
              <span className={`text-[9.5px] font-black px-2 py-0.5 rounded-full border shadow-2xs ${
                isGoogleWithPassword
                  ? "bg-emerald-50 border-emerald-250 text-emerald-800"
                  : isGoogleUser
                  ? "bg-purple-50 border-purple-200 text-purple-800"
                  : "bg-blue-50 border-blue-200 text-blue-800"
              }`}>
                {isGoogleWithPassword
                  ? "حساب مسجل بقوقل وكلمة مرور 🔑🌐"
                  : isGoogleUser
                  ? "حساب مسجل بقوقل 🌐"
                  : "حساب مسجل ببريد إلكتروني وكلمة مرور 🔑"}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block">
              إتقان اللغة الإنجليزية بدعم الذكاء الاصطناعي
            </p>
          </div>
        </div>

        {/* عداد الجلسة الحالية وحالة التفاعل */}
        <div className="flex items-center gap-2 bg-purple-50/80 border border-purple-100 px-3 py-1.5 rounded-2xl">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="p-1 rounded-lg bg-white shadow-xs text-purple-600">
              <Clock className="w-3.5 h-3.5" />
            </span>
            <div className="flex flex-col">
              <span className="text-[9.5px] text-purple-600 font-bold">
                الجلسة الحالية:
              </span>
              <span className="font-mono font-black text-slate-850 text-xs sm:text-sm tracking-wide">
                {formattedSessionTime}
              </span>
            </div>
          </div>

          <div className="h-6 w-px bg-purple-200 mx-1"></div>

          {/* حالة النشاط / الخمول (عدم التفاعل) */}
          {isIdle ? (
            <span className="inline-flex items-center gap-1 text-[10.5px] font-black text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
              متوقف لعدم التفاعل ⏸️
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[10.5px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              يحسب الآن ⏱️
            </span>
          )}
        </div>

        {/* تفاصيل الطالب وزر الخروج */}
        <div className="flex items-center gap-2">
          {isEditingName ? (
            <form onSubmit={handleSaveName} className="flex items-center gap-1">
              <input
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                placeholder="اسم الطالب"
                className="text-xs px-2.5 py-1.5 rounded-xl border border-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-400 w-28 bg-white"
                autoFocus
              />
              <button
                type="submit"
                className="p-1.5 bg-purple-600 text-white rounded-xl text-xs hover:bg-purple-700 cursor-pointer"
              >
                <CheckCircle className="w-3.5 h-3.5" />
              </button>
            </form>
          ) : (
            <button
              onClick={() => setIsEditingName(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white border border-slate-200 hover:border-purple-300 text-slate-700 hover:text-purple-700 text-xs font-semibold transition-all shadow-xs cursor-pointer"
              title="انقر لتعديل اسم الطالب"
            >
              <User className="w-3.5 h-3.5 text-purple-600" />
              <span className="font-bold">{studentName}</span>
            </button>
          )}

          {isLoggedIn && (
            <button
              onClick={onLogout}
              className="flex items-center gap-1 px-3 py-1.5 rounded-2xl bg-slate-100 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-600 hover:text-rose-700 text-xs font-bold transition-all shadow-xs cursor-pointer"
              title="تسجيل الخروج"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">خروج</span>
            </button>
          )}
        </div>
      </div>

      {/* شريط التبويبات الرئيسي (Main Navigation Tabs) */}
      <div className="border-t border-purple-100/70 bg-purple-50/30">
        <div className="max-w-6xl mx-auto px-4 flex items-center gap-1 overflow-x-auto scrollbar-none py-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isCurrent = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
                  isCurrent
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-purple-700 hover:bg-purple-100/50'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
