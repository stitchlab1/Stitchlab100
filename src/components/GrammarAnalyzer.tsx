import React, { useState } from 'react';
import { Search, Sparkles, BookOpen, Volume2, ArrowRight, CheckCircle2 } from 'lucide-react';

interface GrammarBreakdownItem {
  part: string;
  role: string;
  explanation: string;
}

interface AlternativePhrase {
  phrase: string;
  level: string;
  meaning: string;
}

interface IdiomOrPhonic {
  term: string;
  detail: string;
}

interface AnalysisResult {
  translation: string;
  grammarBreakdown: GrammarBreakdownItem[];
  idiomsOrPhonics: IdiomOrPhonic[];
  alternatives: AlternativePhrase[];
}

export default function GrammarAnalyzer() {
  const [sentence, setSentence] = useState('She has been studying English since last year.');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sampleSentences = [
    'I look forward to meeting you soon.',
    'If I had studied harder, I would have passed.',
    'Neither of the students was prepared for the exam.',
  ];

  const handleAnalyze = async (textToAnalyze?: string) => {
    const target = textToAnalyze || sentence;
    if (!target.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/gemini/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sentence: target.trim() }),
      });

      if (!res.ok) {
        throw new Error('فشل تحليل الجملة، يرجى المحاولة ثانية');
      }

      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'حدث خطأ أثناء الاتصال بنموذج التحليل');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpeak = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US';
      window.speechSynthesis.speak(u);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-purple-100 p-6" dir="rtl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 text-white flex items-center justify-center shadow-md shadow-pink-500/20">
          <BookOpen className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-black text-slate-900">محلل القواعد وتفكيك الجمل الذكي</h2>
          <p className="text-xs text-slate-500">
            أدخل أي جملة إنجليزية لتحليل أزمنتها النحوية وأسلوب النطق وبدائلها الطبيعية
          </p>
        </div>
      </div>

      {/* حقل الإدخال */}
      <div className="space-y-3 mb-6">
        <div className="relative">
          <textarea
            value={sentence}
            onChange={(e) => setSentence(e.target.value)}
            placeholder="اكتب أو الصق الجملة بالإنجليزية هنا..."
            rows={3}
            className="w-full text-sm sm:text-base p-4 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:bg-white transition-all font-sans"
          />
        </div>

        {/* أمثلة سريعة */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">جمل نموذجية سريعة:</span>
          {sampleSentences.map((s, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setSentence(s);
                handleAnalyze(s);
              }}
              className="text-[11px] font-sans bg-purple-50 hover:bg-purple-100 text-purple-700 px-3 py-1 rounded-full border border-purple-100 transition-colors"
            >
              {s}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => handleAnalyze()}
          disabled={!sentence.trim() || isLoading}
          className={`w-full py-3 px-6 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2 shadow-md transition-all ${
            sentence.trim() && !isLoading
              ? 'bg-gradient-to-r from-purple-600 via-pink-600 to-rose-500 hover:scale-[1.01] active:scale-[0.99] cursor-pointer'
              : 'bg-slate-300 cursor-not-allowed'
          }`}
        >
          {isLoading ? (
            <>
              <Sparkles className="w-4 h-4 animate-spin" />
              <span>جاري التحليل النحوي الدقيق...</span>
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              <span>حلّل الجملة الآن</span>
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 mb-6">
          {error}
        </div>
      )}

      {/* نتائج التحليل */}
      {result && (
        <div className="space-y-6 pt-4 border-t border-slate-100 animate-fadeIn">
          {/* الترجمة العربية الموثوقة */}
          <div className="bg-purple-50/70 rounded-2xl p-4 border border-purple-100 flex items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-purple-700 block mb-0.5">
                الترجمة العربية السلسة:
              </span>
              <p className="text-sm font-semibold text-slate-800">{result.translation}</p>
            </div>
            <button
              onClick={() => handleSpeak(sentence)}
              className="p-2 bg-white rounded-xl shadow-xs text-purple-600 hover:bg-purple-100 transition-colors shrink-0"
              title="استمع لنطق الجملة"
            >
              <Volume2 className="w-5 h-5" />
            </button>
          </div>

          {/* تفكيك الجملة وقواعدها النحوية */}
          <div>
            <h3 className="text-sm font-black text-slate-800 mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              التفكيك النحوي وعناصر الجملة
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {result.grammarBreakdown?.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-slate-50/80 rounded-2xl p-3.5 border border-slate-200/80 flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="font-mono font-bold text-xs bg-white px-2 py-0.5 rounded-lg border border-slate-200 text-purple-700">
                      {item.part}
                    </span>
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                      {item.role}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{item.explanation}</p>
                </div>
              ))}
            </div>
          </div>

          {/* نصائح النطق والتعبيرات الاصطلاحية */}
          {result.idiomsOrPhonics && result.idiomsOrPhonics.length > 0 && (
            <div>
              <h3 className="text-sm font-black text-slate-800 mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                أسرار النطق والتعبيرات الاصطلاحية
              </h3>
              <div className="space-y-2">
                {result.idiomsOrPhonics.map((tip, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/80 text-xs flex items-start gap-2"
                  >
                    <span className="font-bold font-sans text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md shrink-0">
                      {tip.term}
                    </span>
                    <span className="text-amber-900 leading-relaxed">{tip.detail}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* صياغات بديلة طبيعية */}
          {result.alternatives && result.alternatives.length > 0 && (
            <div>
              <h3 className="text-sm font-black text-slate-800 mb-3 flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-purple-600" />
                طرق بديلة لقول نفس المعنى بطبيعية
              </h3>
              <div className="space-y-2">
                {result.alternatives.map((alt, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl bg-white border border-purple-100 flex flex-wrap items-center justify-between gap-2 hover:border-purple-300 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] bg-purple-100 text-purple-800 px-2 py-0.5 rounded-md font-bold">
                        {alt.level}
                      </span>
                      <span className="font-sans font-semibold text-xs sm:text-sm text-slate-800">
                        {alt.phrase}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500">{alt.meaning}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
