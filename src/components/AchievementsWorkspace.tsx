import React from "react";
import { 
  Trophy, 
  Star, 
  BookOpen, 
  PenTool, 
  GraduationCap, 
  Flame, 
  Award, 
  Zap, 
  Lock, 
  CheckCircle 
} from "lucide-react";
import { getFilteredCompletedAndSkipped } from "../utils/wordFilters";

interface DailyQuote {
  quote: string;
  author: string;
  translation: string;
}

interface AchievementsWorkspaceProps {
  conversationsHad: number;
  quizScore: number;
  quizAttempts: number;
  customFlashcardsCount: number;
  unlockedLevel: number;
  completedLevels: number[];
  onResetProgress: () => void;
  DAILY_QUOTES: DailyQuote[];
  quoteIndex: number;
  setQuoteIndex: React.Dispatch<React.SetStateAction<number>>;
  completedGroupsProp?: string[];
  analyzedCountProp?: number;
  points?: number;
  completedWordsCount?: number;
  studentSemester?: string;
  completedWordKeys?: string[];
}

export default function AchievementsWorkspace({
  conversationsHad,
  quizScore,
  quizAttempts,
  customFlashcardsCount,
  unlockedLevel,
  completedLevels,
  onResetProgress,
  DAILY_QUOTES,
  quoteIndex,
  setQuoteIndex,
  completedGroupsProp,
  analyzedCountProp,
  points = 0,
  completedWordsCount = 0,
  studentSemester = "الفصل الدراسي الأول",
  completedWordKeys = []
}: AchievementsWorkspaceProps) {
  
  // Load supporting states with prop priority, falling back manually to localStorage
  const completedGroups = React.useMemo(() => {
    if (completedGroupsProp !== undefined) return completedGroupsProp;
    try {
      const saved = localStorage.getItem("stitchlab_completed_groups");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  }, [completedGroupsProp]);

  const analyzedCount = React.useMemo(() => {
    if (analyzedCountProp !== undefined) return analyzedCountProp;
    const val = localStorage.getItem("stitchlab_analyzed_count");
    return val ? parseInt(val, 10) : 0;
  }, [analyzedCountProp]);


  const customCardsCount = React.useMemo(() => {
    try {
      const saved = localStorage.getItem("stitchlab_custom_cards");
      return saved ? JSON.parse(saved).length : 0;
    } catch (e) {
      return 0;
    }
  }, []);

  // Compute calculated values
  const totalWordsLearned = React.useMemo(() => {
    // 1. Get words from completedWordKeys prop or fallback to localStorage
    const savedKeys = localStorage.getItem("stitchlab_completed_word_keys");
    let localKeys: string[] = [];
    if (savedKeys) {
      try {
        localKeys = JSON.parse(savedKeys);
      } catch (e) {}
    }
    const activeKeys = (completedWordKeys && completedWordKeys.length > 0) ? completedWordKeys : localKeys;

    // 2. Get skipped words to filter accurately
    const savedSkipped = localStorage.getItem("stitchlab_skipped_word_keys");
    let localSkipped: string[] = [];
    if (savedSkipped) {
      try {
        localSkipped = JSON.parse(savedSkipped);
      } catch (e) {}
    }

    // 3. Filter completed list strictly to only those belonging to completed groups
    const { filteredCompleted } = getFilteredCompletedAndSkipped(activeKeys, localSkipped, completedGroups);

    // This is the exact number of completed words (الكلمات المنجزة) that the student has processed and completed!
    return filteredCompleted.length;
  }, [completedWordKeys, completedGroups]);
  
  const streakDays = React.useMemo(() => {
    const savedVisitDates = localStorage.getItem("stitchlab_visit_dates");
    let dates: string[] = [];
    try {
      dates = savedVisitDates ? JSON.parse(savedVisitDates) : [];
    } catch (e) {
      dates = [];
    }
    
    const todayStr = new Date().toISOString().split('T')[0];
    if (!dates.includes(todayStr)) {
      dates.push(todayStr);
      dates.sort();
      localStorage.setItem("stitchlab_visit_dates", JSON.stringify(dates));
    }
    
    if (dates.length === 0) return 0;
    
    let streak = 0;
    let cursor = new Date();
    while (true) {
      const cursorStr = cursor.toISOString().split('T')[0];
      if (dates.includes(cursorStr)) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }
    
    if (streak === 0 && dates.length > 0) {
      let yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      if (dates.includes(yesterdayStr)) {
        streak = 1;
        let cursor = new Date(yesterday);
        cursor.setDate(cursor.getDate() - 1);
        while (true) {
          const cursorStr = cursor.toISOString().split('T')[0];
          if (dates.includes(cursorStr)) {
            streak++;
            cursor.setDate(cursor.getDate() - 1);
          } else {
            break;
          }
        }
      }
    }
    return streak;
  }, []);

  const BADGES = [
    {
      id: "first_10_words",
      title: "أول 10 كلمات",
      requirement: "تعلم 10 كلمات جديدة وممارسة نطقها",
      icon: BookOpen,
      iconColor: "text-purple-600 bg-purple-50 border-purple-100",
      unlocked: totalWordsLearned >= 10,
      progress: `${Math.min(totalWordsLearned, 10)} / 10 كلمة`
    },
    {
      id: "first_grammar",
      title: "أول قاعدة",
      requirement: "أكمل تحليل ونطق أول قاعدة نحوية بنجاح",
      icon: PenTool,
      iconColor: "text-amber-600 bg-amber-50 border-amber-100",
      unlocked: analyzedCount >= 1 || completedLevels.length >= 1,
      progress: `${(analyzedCount >= 1 || completedLevels.length >= 1) ? 1 : 0} / 1 قاعدة`
    },
    {
      id: "semester_1_complete",
      title: "إنهاء الترم الأول",
      requirement: "أنهِ جميع المستويات والدروس الخاصة بالترم الدراسي الأول",
      icon: GraduationCap,
      iconColor: "text-[#dd7390] bg-[#dd7390]/5 border-[#dd7390]/10",
      unlocked: completedLevels.includes(1) && completedLevels.includes(2) && completedLevels.includes(3),
      progress: `${[1, 2, 3].filter(l => completedLevels.includes(l)).length} / 3 مستويات`
    },
    {
      id: "streak_7_days",
      title: "دخول 7 أيام متتالية",
      requirement: "حافظ على حماسك وادخل لمراجعة الكلمات 7 أيام بالتتابع",
      icon: Flame,
      iconColor: "text-orange-600 bg-orange-50 border-orange-100",
      unlocked: streakDays >= 7,
      progress: `${streakDays} / 7 أيام`
    },
    {
      id: "full_level_complete",
      title: "إنهاء مستوى كامل",
      requirement: "اجتز جميع اختبارات وبطاقات مستوى تعليمي كامل",
      icon: Trophy,
      iconColor: "text-emerald-600 bg-emerald-50 border-emerald-100",
      unlocked: completedLevels.length >= 1,
      progress: `${completedLevels.length} / 1 مستويات`
    },
    {
      id: "words_hero",
      title: "بطل الكلمات اللغوية",
      requirement: "عزز حصيلتك المعرفية وتعلم 100 كلمة جديدة",
      icon: Award,
      iconColor: "text-indigo-600 bg-indigo-50 border-indigo-100",
      unlocked: totalWordsLearned >= 100,
      progress: `${Math.min(totalWordsLearned, 100)} / 100 كلمة`
    },
    {
      id: "grammar_star",
      title: "نجم القواعد اللغوية",
      requirement: "قم بتحليل وإتقان 10 قواعد وتراكيب لغوية",
      icon: Star,
      iconColor: "text-yellow-600 bg-yellow-50 border-yellow-100",
      unlocked: analyzedCount >= 10 || completedLevels.length >= 5,
      progress: `${Math.min(analyzedCount, 10)} / 10 قواعد`
    },
    {
      id: "persistent_learner",
      title: "متعلم مثابر ونشيط",
      requirement: "أنجز إتمام 30 درسًا من دروس الأطلس التعليمي",
      icon: Zap,
      iconColor: "text-pink-600 bg-pink-50 border-pink-100",
      unlocked: completedGroups.length >= 30,
      progress: `${Math.min(completedGroups.length, 30)} / 30 درسًا`
    }
  ];

  return (
    <div id="achievements-section" className="space-y-6 text-right scroll-smooth" dir="rtl">
      {/* Title Header: Centered on gradient box of Mauve, Pink and Gray */}
      <div className="bg-gradient-to-r from-purple-100/80 via-pink-100/80 to-slate-100/80 border border-purple-200/60 rounded-3xl p-6 text-center space-y-3 shadow-sm">
        <div className="w-12 h-12 bg-gradient-to-tr from-purple-500 via-pink-400 to-slate-400 text-white rounded-2xl flex items-center justify-center mx-auto shadow-md transform hover:scale-110 transition-all select-none duration-300">
          <Trophy className="w-6 h-6 animate-pulse" />
        </div>
        <h3 className="text-2xl font-black text-slate-800 tracking-tight font-sans">الإنجازات</h3>
        <p className="text-sm text-slate-600 font-bold max-w-xl mx-auto leading-relaxed">
          تابع إنجازاتك وافتح الأقفال الذهبية بممارسة الدروس والأنشطة التفاعلية اليومية
        </p>
      </div>

      {/* Grid List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {BADGES.map((badge) => {
          const IconComponent = badge.icon;
          return (
            <div
              key={badge.id}
              id={`badge-card-${badge.id}`}
              className={`p-5 rounded-3xl border flex items-start gap-4 transition-all relative overflow-hidden ${
                badge.unlocked
                  ? "bg-white hover:shadow-md border-indigo-100 shadow-sm"
                  : "bg-slate-50/70 border-slate-200/80"
              }`}
            >
              {/* Responsive Icon Container with custom Overlays */}
              <div className="relative shrink-0 select-none">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all border ${
                  badge.unlocked 
                    ? `${badge.iconColor} shadow-sm scale-110` 
                    : "bg-slate-100 text-slate-400 border-slate-200 grayscale opacity-45 blur-[0.3px]"
                }`}>
                  <IconComponent className="w-7 h-7" />
                </div>
                
                {/* Lock Overlay on Top of Icon if Locked */}
                {!badge.unlocked ? (
                  <div 
                    id={`lock-overlay-${badge.id}`}
                    className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white w-6 h-6 rounded-full flex items-center justify-center shadow-lg border-2 border-white"
                    title="هذا الإنجاز مقفل حالياً"
                  >
                    <Lock className="w-3.5 h-3.5 fill-current" />
                  </div>
                ) : (
                  /* Active state: Check Circle Overlay */
                  <div 
                    id={`unlocked-overlay-${badge.id}`}
                    className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-white w-6 h-6 rounded-full flex items-center justify-center shadow-md border-2 border-white"
                    title="تم فتح الإنجاز بنجاح!"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>

              {/* Achievement description and details */}
              <div className="space-y-1.5 flex-1 select-none">
                <div className="flex items-center justify-between gap-2">
                  <h4 className={`text-sm font-black ${badge.unlocked ? "text-slate-800" : "text-slate-500"}`}>
                    {badge.title}
                  </h4>
                  {badge.unlocked ? (
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-black">
                      مكتمل ✓
                    </span>
                  ) : (
                    <span className="text-[10px] bg-slate-250 text-slate-500 px-2.5 py-0.5 rounded-full font-bold">
                      مغلق 🔒
                    </span>
                  )}
                </div>

                <p className={`text-xs ${badge.unlocked ? "text-slate-600 font-medium" : "text-slate-400"}`}>
                  {badge.requirement}
                </p>

                {/* Progress bar info */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100/80 mt-2 text-[10px]">
                  <span className="text-slate-400">مؤشر الإنجاز الحالي:</span>
                  <span className={`font-mono font-black ${badge.unlocked ? "text-indigo-600" : "text-slate-400"}`}>
                    {badge.progress}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>


    </div>
  );
}
