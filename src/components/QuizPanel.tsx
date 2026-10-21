import React from "react";
import { GraduationCap, Sparkles, Check, AlertCircle } from "lucide-react";

interface QuizQuestion {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

interface QuizPanelProps {
  quizTopic: string;
  setQuizTopic: (val: string) => void;
  quizCustomTopic: string;
  setQuizCustomTopic: (val: string) => void;
  quizLevel: string;
  setQuizLevel: (val: any) => void;
  quizLoading: boolean;
  quizQuestions: QuizQuestion[];
  selectedAnswers: Record<number, number>;
  submittedQuiz: boolean;
  quizError: string;
  quizScore: number;
  onGenerateQuiz: (e: React.FormEvent) => void;
  onSelectAnswer: (qIndex: number, optionIndex: number) => void;
  onGradeQuiz: () => void;
}

export default function QuizPanel({
  quizTopic,
  setQuizTopic,
  quizCustomTopic,
  setQuizCustomTopic,
  quizLevel,
  setQuizLevel,
  quizLoading,
  quizQuestions,
  selectedAnswers,
  submittedQuiz,
  quizError,
  quizScore,
  onGenerateQuiz,
  onSelectAnswer,
  onGradeQuiz
}: QuizPanelProps) {
  const answeredCount = Object.keys(selectedAnswers).length;
  const isAllAnswered = answeredCount === quizQuestions.length && quizQuestions.length > 0;

  return (
    <div className="space-y-6 text-right leading-relaxed animate-fadeIn" dir="rtl">
      
      {/* Intro info banner */}
      <div className="glass-card-dark p-4 space-y-2">
        <h3 className="text-xs font-black text-indigo-400 flex items-center gap-1.5">
          <GraduationCap className="w-4.5 h-4.5" />
          <span>مُولد الاختبارات الذكية التفصيلية (Interactive Quiz Generator)</span>
        </h3>
        <p className="text-[11px] text-slate-400 leading-normal">
          اختر موضوع اختبارك أو صغ موضوعك المميّز حسب ميزاجك، وستقوم عقول Gemini اللغوية بصياغة أسئلة اختيار من متعدد فورية مع تبريرات مفصّلة لتأكيد الفائدة.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Control Card */}
        <div className="lg:col-span-4">
          <form onSubmit={onGenerateQuiz} className="glass-card-dark p-5 space-y-4">
            
            <div className="space-y-1">
              <label htmlFor="quiz-preset-topic" className="text-xs font-black text-slate-350 block">1. اختر موضوعاً رائجاً:</label>
              <select
                id="quiz-preset-topic"
                value={quizTopic}
                onChange={(e) => setQuizTopic(e.target.value)}
                disabled={quizLoading}
                className="w-full bg-slate-850 text-slate-250 border border-slate-800 rounded-xl p-2.5 text-xs focus:outline-none"
              >
                <option value="الماضي البسيط وترتيب الظروف الزمنية (Past Simple)">Past Simple vs Past Continuous</option>
                <option value="حروف الجر المناسبة لوسائل النقل والمطارات">Prepositions in Airport & Transport</option>
                <option value="قواعد الشرط والتراخي اللغوي (If Conditional Level 1 & 2)">If Conditionals (Type 1 & 2)</option>
                <option value="عبارات الإقناع والمقابلات المهنية الطموحة">Job Interview Vocabulary & Politeness</option>
                <option value="طلب المأكل والمشارب في المطاعم (At the Restaurant)">Restaurant & Food Ordering Phrases</option>
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="quiz-custom-topic" className="text-xs font-black text-slate-350 block">أو ابتكر موضوعك الخاص (تحديد حر):</label>
              <input
                id="quiz-custom-topic"
                type="text"
                value={quizCustomTopic}
                onChange={(e) => setQuizCustomTopic(e.target.value)}
                disabled={quizLoading}
                placeholder="مثال: جمل طلب المساعدة في الفندق"
                className="w-full bg-slate-850 text-slate-150 border border-slate-800 rounded-xl p-2.5 text-xs focus:outline-none focus:border-indigo-500/50"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="quiz-level-select" className="text-xs font-black text-slate-350 block">2. صعوبة الأسئلة المطروحة:</label>
              <select
                id="quiz-level-select"
                value={quizLevel}
                onChange={(e) => setQuizLevel(e.target.value)}
                disabled={quizLoading}
                className="w-full bg-slate-850 text-slate-250 border border-slate-800 rounded-xl p-2.5 text-xs focus:outline-none"
              >
                <option value="Beginner">مبتدئ (Easy Grammar & Basic Vocabulary)</option>
                <option value="Intermediate">متوسط (Practical Situations & Common idioms)</option>
                <option value="Advanced">متقدم (Professional Nuances & Advanced structures)</option>
              </select>
            </div>

            <button
              id="quiz-submit-generation"
              type="submit"
              disabled={quizLoading}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-800 disabled:text-slate-500 text-white font-extrabold rounded-2xl text-xs transition-colors shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              {quizLoading ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin" />
                  <span>جاري صياغة الأسئلة الآن...</span>
                </>
              ) : (
                <span>ولّد اختبارك الذكي الآن 🎓</span>
              )}
            </button>
          </form>
        </div>

        {/* Right Questions List Side */}
        <div className="lg:col-span-8">
          <div className="glass-card-dark p-5 min-h-[300px] flex flex-col justify-between">
            
            {quizError && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 p-4 rounded-2xl text-xs flex items-center gap-2">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{quizError}</span>
              </div>
            )}

            {/* Inactive state */}
            {quizQuestions.length === 0 && !quizLoading && !quizError && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-2">
                <div className="text-3xl">📝</div>
                <p className="text-xs font-black text-slate-300">الاختبار جاهز للتصميم والتوليد</p>
                <p className="text-[10px] text-slate-500 max-w-xs mx-auto">
                  اختر موضوعك من الجانب الأيمن ثم انقر على زر التوليد لصياغة اختبار مبهج ومفاجئ بمستوى ذكاء بليغ.
                </p>
              </div>
            )}

            {/* Loading state */}
            {quizLoading && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3">
                <div className="w-10 h-10 border-4 border-t-indigo-500 border-r-indigo-500 border-slate-700 rounded-full animate-spin"></div>
                <p className="text-[10px] text-slate-400 font-bold">يقوم الذكاء الاصطناعي الآن بصياغة أسئلة تفاعلية خاصة بك...</p>
              </div>
            )}

            {/* Quiz content state */}
            {quizQuestions.length > 0 && !quizLoading && (
              <div className="space-y-6">
                
                {/* Grading Summary header */}
                {submittedQuiz && (
                  <div className={`p-5 rounded-2xl border text-center space-y-2 ${
                    quizScore >= 70
                      ? "bg-emerald-500/10 border-emerald-500/35 text-emerald-300"
                      : "bg-rose-500/10 border-rose-500/35 text-rose-350"
                  }`}>
                    <h4 className="text-sm font-black flex items-center justify-center gap-2">
                      {quizScore >= 70 ? "🎉 Great job! أحسنت صنعاً" : "⚠️ Try again! حاول مجدداً"}
                    </h4>
                    <p className="text-3xl font-black font-mono">{quizScore}%</p>
                    <p className="text-[10px] text-slate-350 leading-relaxed" dir="rtl">
                      {quizScore >= 70 
                        ? "رائع جداً! لقد تفوقت في هذا الموضوع وفهمت مفاصل المادة اللغوية وعززت مهاراتك بجدارة تامة!" 
                        : "مستوى متوسط، ننصحك بقراءة تبريرات المعلم المرفقة أسفل كل سؤال، وصقل معلوماتك للمحاولة مجدداً."}
                    </p>
                  </div>
                )}

                {/* Questions List */}
                <div className="space-y-5">
                  {quizQuestions.map((q, qIdx) => {
                    return (
                      <div key={qIdx} className="bg-slate-850 p-4 rounded-2xl border border-slate-800 space-y-3 text-left" dir="ltr">
                        <div className="flex items-start gap-2">
                          <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-300 text-[10px] font-mono flex items-center justify-center shrink-0">Q{qIdx+1}</span>
                          <p className="text-xs font-black text-slate-200 select-all leading-normal">{q.question}</p>
                        </div>

                        {/* Options */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1 font-mono">
                          {q.options.map((opt, oIdx) => {
                            const isSelected = selectedAnswers[qIdx] === oIdx;
                            const isCorrect = q.answerIndex === oIdx;
                            
                            let optBg = "bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-300";
                            if (isSelected) {
                              optBg = "bg-indigo-600 border-indigo-500 text-white font-bold";
                            }
                            if (submittedQuiz) {
                              if (isCorrect) {
                                optBg = "bg-emerald-500/20 border-emerald-500 text-emerald-400 font-bold";
                              } else if (isSelected && !isCorrect) {
                                optBg = "bg-rose-500/20 border-rose-500 text-rose-400";
                              } else {
                                optBg = "bg-slate-900 border-slate-800/50 text-slate-600";
                              }
                            }

                            return (
                              <button
                                key={oIdx}
                                type="button"
                                disabled={submittedQuiz}
                                onClick={() => onSelectAnswer(qIdx, oIdx)}
                                className={`p-3 text-left rounded-xl border text-xs leading-normal transition-colors cursor-pointer ${optBg}`}
                              >
                                {opt}
                              </button>
                            );
                          })}
                        </div>

                        {/* Explanation block if graded */}
                        {submittedQuiz && (
                          <div className="bg-slate-900 border border-slate-850 p-3 rounded-xl mt-3 text-right" dir="rtl">
                            <span className="text-[9px] font-black text-slate-400 block mb-0.5">🌱 تبرير المدرب ولحمة التعلم:</span>
                            <p className="text-[10px] text-slate-300 leading-normal select-all">
                              {q.explanation}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Score submissions footer */}
                {!submittedQuiz && (
                  <div className="pt-3 border-t border-slate-800 flex justify-between items-center flex-wrap gap-3">
                    <p className="text-[10px] text-slate-500 font-bold">لقد أجبت على ({answeredCount} / {quizQuestions.length}) أسئلة.</p>
                    <button
                      type="button"
                      onClick={onGradeQuiz}
                      disabled={!isAllAnswered}
                      className="px-6 py-2.5 bg-[#2d9e83] hover:bg-[#25826b] disabled:bg-slate-800 disabled:text-slate-500 text-white font-extrabold rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-1.5"
                    >
                      <Check className="w-4 h-4" />
                      <span>سلّم وصحّح إجاباتي الآن 🎓</span>
                    </button>
                  </div>
                )}

              </div>
            )}

            <div className="text-center pt-4 border-t border-slate-800 mt-4 text-[9px] text-slate-600">
              جميع محتويات وتبريرات الاختبارات تدار بذخيرة Gemini 3.5 اللغوية الشاملة.
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
