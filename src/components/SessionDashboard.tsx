import React from 'react';
import {
  Clock,
  Activity,
  History,
  CheckCircle2,
  Calendar,
  Zap,
  Info,
  MousePointer,
  Moon,
  Sparkles,
} from 'lucide-react';
import type { StudentSessionRecord } from '../utils/timeTracker';

interface SessionDashboardProps {
  studentName: string;
  formattedSessionTime: string;
  formattedTotalTime: string;
  sessionSeconds: number;
  totalSeconds: number;
  isIdle: boolean;
  isActive: boolean;
  isPageVisible: boolean;
  idleCountdownSeconds: number;
  onEndSession: () => void;
  pastSessions: StudentSessionRecord[];
}

export default function SessionDashboard({
  studentName,
  formattedSessionTime,
  formattedTotalTime,
  sessionSeconds,
  totalSeconds,
  isIdle,
  isActive,
  isPageVisible,
  idleCountdownSeconds,
  onEndSession,
  pastSessions,
}: SessionDashboardProps) {
  return (
    <div className="space-y-6" dir="rtl">
      {/* البطاقة الرئيسية للجلسة الحالية */}
      <div className="bg-gradient-to-br from-purple-700 via-pink-600 to-rose-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        {/* خلفية جمالية */}
        <div className="absolute top-0 left-0 w-72 h-72 bg-white/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-xs font-bold border border-white/20">
                مؤقت الجلسة الحالية للطالب
              </span>
              {isIdle ? (
                <span className="px-3 py-1 bg-amber-400 text-amber-950 rounded-full text-xs font-black flex items-center gap-1.5 shadow-sm">
                  <Moon className="w-3.5 h-3.5" />
                  متوقف (لا توجد حركة)
                </span>
              ) : (
                <span className="px-3 py-1 bg-emerald-400 text-emerald-950 rounded-full text-xs font-black flex items-center gap-1.5 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-emerald-950 animate-ping"></span>
                  نشط ويحسب الآن
                </span>
              )}
            </div>

            <h2 className="text-2xl sm:text-3xl font-black">
              أهلاً بك يا {studentName} 🎓
            </h2>
            <p className="text-xs sm:text-sm text-purple-100 max-w-lg leading-relaxed">
              المؤقت مضبوط على جلستك الحالية ويبدأ الحساب فور دخولك. إذا تركت الصفحة مفتوحة بدون حركة يتوقف العد تلقائياً لحفظ وقتك الحقيقي.
            </p>
          </div>

          {/* العداد العملاق للجلسة الحالية */}
          <div className="bg-black/25 backdrop-blur-xl border border-white/20 rounded-3xl p-5 text-center min-w-[240px] shadow-2xl">
            <span className="text-xs font-medium text-pink-200 block mb-1">
              الوقت المنقضي في الجلسة
            </span>
            <span className="text-4xl sm:text-5xl font-mono font-black tracking-wider drop-shadow-md select-all">
              {formattedSessionTime}
            </span>

            <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-purple-200">
              <span>إجمالي وقت الطالب:</span>
              <span className="font-mono font-bold text-white">{formattedTotalTime}</span>
            </div>
          </div>
        </div>

        {/* شريط الإجراءات وسرعة التفاعل */}
        <div className="mt-6 pt-4 border-t border-white/15 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-purple-100">
            <MousePointer className="w-4 h-4 text-pink-300" />
            <span>حالة كشف الحركة:</span>
            {isIdle ? (
              <span className="font-bold text-amber-300">
                المؤقت متوقف لعدم رصد حركة في الصفحة
              </span>
            ) : (
              <span className="font-bold text-emerald-300">
                الحركة مستمرة والعد جارٍ بدقة
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={onEndSession}
            disabled={sessionSeconds < 1}
            className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all shadow-md flex items-center gap-2 ${
              sessionSeconds >= 1
                ? 'bg-white text-purple-900 hover:bg-purple-50 hover:scale-105 active:scale-95 cursor-pointer'
                : 'bg-white/30 text-white/60 cursor-not-allowed'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-purple-700" />
            <span>إنهاء الجلسة وحفظ الإنجاز</span>
          </button>
        </div>
      </div>

      {/* بطاقة توضيح آلية عمل المؤقت وكشف الخمول */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-purple-100 shadow-xs flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-purple-100 text-purple-700 shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800 mb-1">
              بدء فوري عند الدخول
            </h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              يبدأ المؤقت بعد الثواني فور دخول الطالب للصفحة مباشرة دون الحاجة لأي ضغط يدوي.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-purple-100 shadow-xs flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-amber-100 text-amber-700 shrink-0">
            <Moon className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800 mb-1">
              توقف تلقائي عند انعدام الحركة
            </h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              لو بقيت الصفحة مفتوحة بدون حركة يتوقف العد تماماً. تحريك الماوس أو اللمس يستأنفه فوراً.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-purple-100 shadow-xs flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-700 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800 mb-1">
              توثيق حتى الخروج
            </h4>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              عند الضغط على إنهاء الجلسة أو إغلاق الصفحة يتم توثيق المدة بدقة في سجل الطالب.
            </p>
          </div>
        </div>
      </div>

      {/* جدول سجل الجلسات السابقة للطالب */}
      <div className="bg-white rounded-3xl p-6 border border-purple-100 shadow-xs">
        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-purple-100 text-purple-700 rounded-xl">
              <History className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-black text-slate-800">
                سجل جلسات الطالب المكتملة
              </h3>
              <p className="text-xs text-slate-400">
                جميع الجلسات الدراسية الموثقة لـ {studentName}
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-purple-600 bg-purple-50 px-3 py-1 rounded-full">
            {pastSessions.length} جلسة موثقة
          </span>
        </div>

        {pastSessions.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <Clock className="w-10 h-10 mx-auto mb-2 opacity-30 text-purple-600" />
            <p className="text-sm font-semibold text-slate-600">لا توجد جلسات سابقة بعد</p>
            <p className="text-xs text-slate-400 mt-1">
              عند الضغط على "إنهاء الجلسة وحفظ الإنجاز" ستظهر جلستك هنا
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold">
                  <th className="py-2.5 px-3">رقم الجلسة</th>
                  <th className="py-2.5 px-3">اسم الطالب</th>
                  <th className="py-2.5 px-3">تاريخ وتوقيت الجلسة</th>
                  <th className="py-2.5 px-3 text-left">مدة الجلسة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pastSessions.map((sess, idx) => (
                  <tr key={sess.id} className="hover:bg-purple-50/40 transition-colors">
                    <td className="py-3 px-3 font-mono text-slate-400">#{idx + 1}</td>
                    <td className="py-3 px-3 font-bold text-slate-800">{sess.studentName}</td>
                    <td className="py-3 px-3 text-slate-500">{sess.dateStr}</td>
                    <td className="py-3 px-3 text-left">
                      <span className="font-mono font-black text-purple-700 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-100">
                        {sess.formattedDuration}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
