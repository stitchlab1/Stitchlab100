import React from "react";
import { ArrowLeftRight, Sparkles, Lightbulb } from "lucide-react";

interface AnalyzerResult {
  dissection: Array<{
    token: string;
    pos: string;
    explanation: string;
  }>;
  translation: string;
  summary: string;
}

interface AnalyzerPanelProps {
  analyzerInputValue: string;
  setAnalyzerInputValue: (val: string) => void;
  analyzerLoading: boolean;
  analyzerResult: AnalyzerResult | null;
  analyzerError: string;
  onAnalyzeSubmit: (e: React.FormEvent) => void;
  onQuickPaste: (phrase: string, target: "analyzer") => void;
}

export default function AnalyzerPanel({
  analyzerInputValue,
  setAnalyzerInputValue,
  analyzerLoading,
  analyzerResult,
  analyzerError,
  onAnalyzeSubmit,
  onQuickPaste
}: AnalyzerPanelProps) {
  return (
    <div className="space-y-6 text-right leading-relaxed" dir="rtl">
      
      {/* Intro Banner */}
      <div className="glass-card-dark p-4 space-y-2">
        <h3 className="text-xs font-black text-indigo-400 flex items-center gap-1.5">
          <ArrowLeftRight className="w-4 h-4" />
          <span>مُشرح ومُفصّل الجمل النحوي (Sentence Analyzer Lab)</span>
        </h3>
        <p className="text-[11px] text-slate-400 leading-normal">
          أدخل أيّ جُملة إنجليزية معقدة أو غامضة، وسيقوم المحلّل الذكي بتجزيئها كلمة كلمة، ونقش أجزاء الكلام اللغوي (Noun, Verb, Adjective, etc.) مع ترجمتها النحوية لتستند لعلمٍ متين.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Input Card Form */}
        <div className="lg:col-span-5 space-y-4">
          <form onSubmit={onAnalyzeSubmit} className="glass-card-dark p-5 space-y-4">
            <div className="space-y-1">
              <label htmlFor="analyzer-input" className="text-xs font-black text-slate-300 block">الجملة المراد تشريحها:</label>
              <textarea
                id="analyzer-input"
                rows={3}
                value={analyzerInputValue}
                onChange={(e) => setAnalyzerInputValue(e.target.value)}
                disabled={analyzerLoading}
                placeholder="مثال: I would highly recommend learning vocabulary day by day."
                className="w-full bg-slate-850 text-slate-100 border border-slate-800 rounded-xl p-3 text-xs font-sans font-medium focus:outline-none focus:border-indigo-500/50"
                dir="ltr"
              />
            </div>

            <button
              id="analyzer-submit-btn"
              type="submit"
              disabled={analyzerLoading || !analyzerInputValue.trim()}
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-800 disabled:text-slate-500 text-white font-extrabold rounded-2xl text-xs transition-colors shadow-md cursor-pointer flex items-center justify-center gap-2"
            >
              {analyzerLoading ? (
                <>
                  <Sparkles className="w-4 h-4 animate-spin" />
                  <span>جاري تحليل الجملة بدقة...</span>
                </>
              ) : (
                <span>شرّح الجملة النحوية الآن 🔍</span>
              )}
            </button>
          </form>

          {/* Quick Paste triggers inside analyzer */}
          <div className="glass-card-dark p-4 space-y-2">
            <h4 className="text-[10px] font-black text-indigo-400 flex items-center gap-1">
              <Lightbulb className="w-3.5 h-3.5" />
              <span>جمل نموذجية معقدة للتجريب:</span>
            </h4>
            <div className="space-y-2 pt-1 font-mono">
              <button
                type="button"
                onClick={() => onQuickPaste("If you stitch your hours of learning, you will master English.", "analyzer")}
                className="w-full text-left text-[9px] bg-slate-850 hover:bg-slate-800 p-2 rounded-lg border border-slate-800 border-none transition-colors truncate"
              >
                "If you stitch your hours of learning, you..."
              </button>
              <button
                type="button"
                onClick={() => onQuickPaste("Despite having a busy schedule today, I had a lovely coffee chat.", "analyzer")}
                className="w-full text-left text-[9px] bg-slate-850 hover:bg-slate-800 p-2 rounded-lg border border-slate-800 border-none transition-colors truncate"
              >
                "Despite having a busy schedule today, I had..."
              </button>
            </div>
          </div>
        </div>

        {/* Output Side */}
        <div className="lg:col-span-7">
          <div className="glass-card-dark p-5 min-h-[300px] flex flex-col justify-between">
            {analyzerError && (
              <div className="bg-rose-500/10 border border-rose-500/20 text-rose-300 p-4 rounded-2xl text-xs">
                {analyzerError}
              </div>
            )}

            {!analyzerResult && !analyzerError && !analyzerLoading && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-2">
                <div className="text-3xl">🔬</div>
                <p className="text-xs font-black text-slate-300">مختبر تشريح الجمل بانتظار مدخلاتك</p>
                <p className="text-[10px] text-slate-500 max-w-xs mx-auto">
                  اكتب جملة في الصندوق الأيمن ثم انقر على "شرّح الجملة" للتجربة الفورية.
                </p>
              </div>
            )}

            {analyzerLoading && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-3">
                <div className="w-9 h-9 border-4 border-t-indigo-500 border-r-indigo-500 border-slate-700 rounded-full animate-spin"></div>
                <p className="text-[10px] text-slate-400 font-bold">جاري إرسال الجملة إلى مدقق stitchLab الذكي...</p>
              </div>
            )}

            {analyzerResult && !analyzerLoading && (
              <div className="space-y-5">
                
                {/* Result metadata banner */}
                <div className="bg-slate-850 p-4 rounded-2xl border border-slate-800 text-right space-y-2">
                  <h4 className="text-xs font-black text-indigo-400">🌿 الترجمة والموجز العام:</h4>
                  <p className="text-[11px] font-bold text-slate-200" dir="rtl">{analyzerResult.translation}</p>
                  <p className="text-[10px] text-slate-400 italic leading-relaxed" dir="rtl">موجز السير: {analyzerResult.summary}</p>
                </div>

                {/* Token Cards Grid */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-slate-400">📋 تحليل أجزاء ومفاصل الجملة (Dissection):</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {analyzerResult.dissection.map((item, idx) => (
                      <div key={idx} className="bg-slate-850 p-3 rounded-2xl border border-slate-800 text-left font-mono space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-white select-all">{item.token}</span>
                          <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.2 rounded border border-indigo-500/20 font-bold">{item.pos}</span>
                        </div>
                        <p className="text-[9px] text-slate-400 leading-normal text-right pt-1 font-sans" dir="rtl">
                          {item.explanation}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}

            <div className="text-center pt-4 border-t border-slate-800 mt-4 text-[9px] text-slate-600">
              جميع دراسات التشريح تدار بذكاء بواسطة Gemini 3.5 لضمان جودة الأوصاف النحوية.
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
