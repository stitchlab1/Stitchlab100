import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Sparkles, Volume2, CheckCircle2, AlertCircle } from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  arabicTranslation?: string;
  feedback?: string;
  vocabularySuggestions?: Array<{
    word: string;
    meaning: string;
    example: string;
  }>;
  time: string;
}

const PERSONAS = [
  {
    id: 'sarah',
    name: 'Sarah (سارة)',
    role: 'مرشدة محادثة ودودة وصبورة',
    description: 'A friendly and supportive conversation partner who speaks clearly and encourages the student.',
  },
  {
    id: 'james',
    name: 'Prof. James (البروفيسور جيمس)',
    role: 'أستاذ أكاديمي خبير في القواعد',
    description: 'An academic English teacher focusing on precision, grammar mastery, and rich vocabulary.',
  },
  {
    id: 'alex',
    name: 'Alex (أليكس)',
    role: 'مواقف السفر والحياة اليومية',
    description: 'A casual native speaker teaching real-world idioms, street smarts, and daily scenarios.',
  },
];

export default function ChatTutor() {
  const [selectedPersona, setSelectedPersona] = useState(PERSONAS[0]);
  const [userLevel, setUserLevel] = useState('Intermediate (متوسط)');
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      role: 'model',
      text: "Hello there! Welcome to your learning session. How are you doing today? What would you like to practice?",
      arabicTranslation: "أهلاً بك! مرحباً بك في جلستك التعليمية. كيف حالك اليوم؟ ماذا تحب أن نمارس معاً؟",
      time: 'الآن',
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    const userText = inputMessage.trim();
    setInputMessage('');

    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: userText,
      time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, newMsg]);
    setIsLoading(true);

    try {
      // إرسال للـ API السيرفر
      const historyPayload = messages.map((m) => ({
        role: m.role,
        text: m.text,
      }));

      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userText,
          history: historyPayload,
          personaId: selectedPersona.id,
          personaName: selectedPersona.name,
          personaDescription: selectedPersona.description,
          userLevel,
        }),
      });

      if (!res.ok) {
        throw new Error('فشل الاتصال بالمعلم الذكي');
      }

      const data = await res.json();

      const botReply: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: data.reply || "I didn't quite catch that, could you repeat?",
        arabicTranslation: data.arabicTranslation,
        feedback: data.feedback,
        vocabularySuggestions: data.vocabularySuggestions,
        time: new Date().toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, botReply]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'model',
          text: "I'm having trouble connecting right now. Please try sending your message again!",
          arabicTranslation: "أواجه صعوبة مؤقتة في الاتصال. يرجى تجربة إرسال رسالتك مرة أخرى!",
          time: 'الآن',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSpeak = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-purple-100 flex flex-col h-[650px] overflow-hidden" dir="rtl">
      {/* رأس المحادثة واختيار الشخصية */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center font-bold shadow-md shadow-purple-500/20">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-slate-800 text-sm">{selectedPersona.name}</h2>
              <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                متصل
              </span>
            </div>
            <p className="text-xs text-slate-500">{selectedPersona.role}</p>
          </div>
        </div>

        {/* اختيار الشخصية والمستوى */}
        <div className="flex items-center gap-2">
          <select
            value={selectedPersona.id}
            onChange={(e) => {
              const p = PERSONAS.find((item) => item.id === e.target.value);
              if (p) setSelectedPersona(p);
            }}
            className="text-xs bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-400"
          >
            {PERSONAS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <select
            value={userLevel}
            onChange={(e) => setUserLevel(e.target.value)}
            className="text-xs bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-400"
          >
            <option value="Beginner (مبتدئ)">مبتدئ</option>
            <option value="Intermediate (متوسط)">متوسط</option>
            <option value="Advanced (متقدم)">متقدم</option>
          </select>
        </div>
      </div>

      {/* منطقة الرسائل */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-50/30">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-fadeIn`}
          >
            <div
              className={`max-w-[85%] sm:max-w-[75%] rounded-3xl p-4 shadow-xs ${
                msg.role === 'user'
                  ? 'bg-purple-600 text-white rounded-br-xs'
                  : 'bg-white text-slate-800 border border-slate-100 rounded-bl-xs'
              }`}
            >
              {/* نص الرسالة */}
              <div className="flex items-start justify-between gap-3 mb-1">
                <p className={`text-sm leading-relaxed ${msg.role === 'user' ? 'text-white' : 'text-slate-900'} font-sans font-medium`}>
                  {msg.text}
                </p>
                {msg.role === 'model' && (
                  <button
                    onClick={() => handleSpeak(msg.text)}
                    className="p-1 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors shrink-0"
                    title="استمع للنطق بالإنجليزية"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* الترجمة العربية لمساعدة الطالب */}
              {msg.arabicTranslation && (
                <div className="mt-2 pt-2 border-t border-slate-100 text-xs text-slate-500 bg-slate-50/70 p-2 rounded-xl">
                  <span className="font-bold text-purple-700 ml-1">الترجمة:</span>
                  {msg.arabicTranslation}
                </div>
              )}

              {/* تصحيح القواعد والملاحظة التعليمية */}
              {msg.feedback && (
                <div className="mt-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block mb-0.5">ملاحظة المعلم الذكي:</span>
                    <span>{msg.feedback}</span>
                  </div>
                </div>
              )}

              {/* المفردات المقترحة في السياق */}
              {msg.vocabularySuggestions && msg.vocabularySuggestions.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-slate-100">
                  <span className="text-[11px] font-bold text-purple-600 block mb-1">
                    💡 مفردات مفيدة لهذا السياق:
                  </span>
                  <div className="space-y-1">
                    {msg.vocabularySuggestions.map((item, idx) => (
                      <div
                        key={idx}
                        className="text-[11px] bg-purple-50/60 p-1.5 rounded-lg border border-purple-100 flex flex-wrap items-center justify-between gap-1"
                      >
                        <span className="font-bold text-purple-900 font-sans">{item.word}</span>
                        <span className="text-slate-600">({item.meaning})</span>
                        <span className="text-[10px] text-slate-400 italic w-full block">
                          مثال: {item.example}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <span
                className={`text-[9px] block mt-1 ${
                  msg.role === 'user' ? 'text-purple-200 text-left' : 'text-slate-400 text-right'
                }`}
              >
                {msg.time}
              </span>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 p-3 bg-white rounded-2xl border border-slate-100 max-w-[200px] animate-pulse">
            <Sparkles className="w-4 h-4 text-purple-600 animate-spin" />
            <span className="text-xs text-slate-500 font-medium">المعلم الذكي يكتب...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* حقل الإدخال */}
      <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-100 flex items-center gap-2">
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="اكتب بالإنجليزية أو العربية وتحدث مع معلمك الذكي..."
          disabled={isLoading}
          className="flex-1 text-xs sm:text-sm px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:bg-white transition-all"
        />
        <button
          type="submit"
          disabled={!inputMessage.trim() || isLoading}
          className={`p-2.5 rounded-2xl text-white transition-all cursor-pointer ${
            inputMessage.trim() && !isLoading
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 shadow-md hover:scale-105 active:scale-95'
              : 'bg-slate-300 cursor-not-allowed'
          }`}
          title="إرسال"
        >
          <Send className="w-4 h-4 transform rotate-180" />
        </button>
      </form>
    </div>
  );
}
