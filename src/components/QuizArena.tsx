import React, { useState } from 'react';
import { Award, CheckCircle2, XCircle, RotateCcw, Sparkles, HelpCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

interface QuizQuestion {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

export default function QuizArena() {
  const [topic, setTopic] = useState('Common Grammar & Prepositions');
  const [level, setLevel] = useState('Intermediate');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const fetchQuiz = async (selectedTopic?: string, selectedLevel?: string) => {
    setIsLoading(true);
    setQuestions([]);
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsAnswerSubmitted(false);
    setScore(0);
    setIsCompleted(false);

    try {
      const res = await fetch('/api/gemini/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: selectedTopic || topic,
          level: selectedLevel || level,
        }),
      });

      if (!res.ok) throw new Error('فشل توليد الاختبار');
      const data = await res.json();
      if (data.questions && data.questions.length > 0) {
        setQuestions(data.questions);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectOption = (idx: number) => {
    if (isAnswerSubmitted) return;
    setSelectedOption(idx);
  };

  const handleSubmitAnswer = () => {
    if (selectedOption === null || isAnswerSubmitted) return;
    setIsAnswerSubmitted(true);

    const isCorrect = selectedOption === questions[currentIndex].answerIndex;
    if (isCorrect) {
      setScore((prev) => prev + 1);
    }
  };

  const handleNextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsAnswerSubmitted(false);
    } else {
      setIsCompleted(true);
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
      });
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-purple-100 p-6" dir="rtl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-purple-500/20">
          <Award className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-black text-slate-900">حلبة الاختبارات التفاعلية</h2>
          <p className="text-xs text-slate-500">
            تحديات ذكية لاختبار القواعد والمفردات مع شرح تفصيلي باللغة العربية
          </p>
        </div>
      </div>

      {/* خيارات توليد الاختبار */}
      {questions.length === 0 && !isLoading && (
        <div className="space-y-4 max-w-lg mx-auto py-6 text-center">
          <p className="text-sm text-slate-600">اختر موضوع ومستوى التحدي لتوليد اختبار فوري:</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-right">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">الموضوع:</label>
              <select
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium"
              >
                <option value="Common Grammar & Prepositions">حروف الجر والقواعد الشائعة</option>
                <option value="Verb Tenses (Past, Present, Perfect)">أزمنة الأفعال (Tenses)</option>
                <option value="Daily Business & Travel English">مواقف السفر والعمل اليومية</option>
                <option value="Phrasal Verbs & Idioms">الأفعال المركبة والمصطلحات</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">المستوى:</label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50 font-medium"
              >
                <option value="Beginner">مبتدئ (Beginner)</option>
                <option value="Intermediate">متوسط (Intermediate)</option>
                <option value="Advanced">متقدم (Advanced)</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={() => fetchQuiz()}
            className="w-full py-3 px-6 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all cursor-pointer"
          >
            بدء التحدي الآن
          </button>
        </div>
      )}

      {isLoading && (
        <div className="py-16 text-center">
          <Sparkles className="w-8 h-8 text-purple-600 animate-spin mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-700">جاري إنشاء أسئلة الاختبار الذكي...</p>
          <p className="text-xs text-slate-400 mt-1">يتم تصميم الأسئلة بدقة لتناسب مستواك</p>
        </div>
      )}

      {/* شاشة السؤال */}
      {questions.length > 0 && !isCompleted && (
        <div className="space-y-6 animate-fadeIn">
          {/* شريط التقدم */}
          <div className="flex items-center justify-between text-xs text-slate-500 font-bold border-b border-slate-100 pb-3">
            <span>
              السؤال {currentIndex + 1} من {questions.length}
            </span>
            <span className="text-purple-600">النتيجة: {score} نقاط</span>
          </div>

          {/* نص السؤال */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
            <h3 className="text-base sm:text-lg font-bold font-sans text-slate-900 leading-relaxed text-left" dir="ltr">
              {questions[currentIndex].question}
            </h3>
          </div>

          {/* الخيارات */}
          <div className="space-y-2.5" dir="ltr">
            {questions[currentIndex].options.map((option, idx) => {
              const isSelected = selectedOption === idx;
              const isCorrectAnswer = idx === questions[currentIndex].answerIndex;

              let btnStyle = 'border-slate-200 bg-white hover:border-purple-300';
              if (isAnswerSubmitted) {
                if (isCorrectAnswer) {
                  btnStyle = 'border-emerald-500 bg-emerald-50 text-emerald-900 font-bold';
                } else if (isSelected) {
                  btnStyle = 'border-rose-500 bg-rose-50 text-rose-900';
                }
              } else if (isSelected) {
                btnStyle = 'border-purple-600 bg-purple-50 text-purple-900 font-bold shadow-xs';
              }

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectOption(idx)}
                  disabled={isAnswerSubmitted}
                  className={`w-full p-4 rounded-2xl border-2 text-left font-sans text-sm sm:text-base flex items-center justify-between transition-all cursor-pointer ${btnStyle}`}
                >
                  <span>{option}</span>
                  {isAnswerSubmitted && isCorrectAnswer && (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  )}
                  {isAnswerSubmitted && isSelected && !isCorrectAnswer && (
                    <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* الشرح التفصيلي بعد الإجابة */}
          {isAnswerSubmitted && (
            <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-100 text-xs sm:text-sm animate-fadeIn" dir="rtl">
              <span className="font-bold text-purple-800 block mb-1">الشرح النحوي باللغة العربية:</span>
              <p className="text-slate-700 leading-relaxed">{questions[currentIndex].explanation}</p>
            </div>
          )}

          {/* زر التأكيد أو الانتقال */}
          <div className="pt-3">
            {!isAnswerSubmitted ? (
              <button
                type="button"
                onClick={handleSubmitAnswer}
                disabled={selectedOption === null}
                className={`w-full py-3 px-6 rounded-2xl font-bold text-sm text-white transition-all ${
                  selectedOption !== null
                    ? 'bg-purple-600 hover:bg-purple-700 shadow-md cursor-pointer'
                    : 'bg-slate-300 cursor-not-allowed'
                }`}
              >
                تأكيد الإجابة
              </button>
            ) : (
              <button
                type="button"
                onClick={handleNextQuestion}
                className="w-full py-3 px-6 rounded-2xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold text-sm shadow-md transition-all cursor-pointer"
              >
                {currentIndex < questions.length - 1 ? 'السؤال التالي ←' : 'عرض النتيجة النهائية 🎉'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* شاشة اكتمال الاختبار */}
      {isCompleted && (
        <div className="py-8 text-center space-y-4 animate-scaleUp">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
            <Award className="w-8 h-8" />
          </div>

          <h3 className="text-xl font-black text-slate-900">اكتمل التحدي بنجاح!</h3>
          <p className="text-sm text-slate-600">
            أحرزت <span className="font-bold text-purple-600 font-mono text-lg">{score}</span> من{' '}
            <span className="font-bold font-mono text-lg">{questions.length}</span> نقاط
          </p>

          <button
            type="button"
            onClick={() => fetchQuiz()}
            className="py-2.5 px-6 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md transition-all flex items-center gap-2 mx-auto cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>خوض تحدٍ جديد</span>
          </button>
        </div>
      )}
    </div>
  );
}
