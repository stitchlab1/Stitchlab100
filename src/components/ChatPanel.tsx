import React, { useRef, useEffect } from "react";
import { MessageSquare, UserCheck, Lightbulb, Send, Volume2, Trash2, ArrowRight } from "lucide-react";
import { Persona, ChatMessage, PRESET_PERSONAS } from "./types";

interface ChatPanelProps {
  selectedPersona: Persona;
  onChangePersona: (p: Persona) => void;
  chatInputValue: string;
  setChatInputValue: (val: string) => void;
  chatHistory: ChatMessage[];
  chatLoading: boolean;
  chatTranslateToggle: boolean;
  setChatTranslateToggle: (val: boolean) => void;
  onSendMessage: (e: React.FormEvent) => void;
  onClearHistory: () => void;
  speakText: (text: string) => void;
  onQuickPaste: (phrase: string, target: "chat") => void;
}

export default function ChatPanel({
  selectedPersona,
  onChangePersona,
  chatInputValue,
  setChatInputValue,
  chatHistory,
  chatLoading,
  setChatTranslateToggle,
  chatTranslateToggle,
  onSendMessage,
  onClearHistory,
  speakText,
  onQuickPaste
}: ChatPanelProps) {
  const feedEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll
  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-right leading-relaxed" dir="rtl">
      
      {/* Sidebar selection */}
      <div className="lg:col-span-4 space-y-4">
        <div className="glass-card-dark p-4 space-y-3">
          <div className="flex items-center gap-2">
            <UserCheck className="w-4 h-4 text-indigo-400" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">1. اختر قرين التدريب الذكي:</h3>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            لكل شخصية دور وسياق محاكاة يساعدك على صياغة الجمل وتطوير حواراتك في مواقف حيوية مختلفة.
          </p>

          <div className="space-y-2.5 pt-1">
            {PRESET_PERSONAS.map((persona) => {
              const isActive = selectedPersona.id === persona.id;
              return (
                <button
                  type="button"
                  key={persona.id}
                  onClick={() => onChangePersona(persona)}
                  className={`w-full p-3 rounded-xl transition-all text-right border flex items-start gap-3 ${
                    isActive
                      ? "bg-indigo-600/10 border-indigo-500 text-white"
                      : "bg-slate-850 hover:bg-slate-800 border-slate-800 text-slate-300"
                  }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${persona.avatar}`}>
                    {persona.emoji}
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-bold flex items-center gap-1.5">
                      <span>{persona.name}</span>
                      {isActive && <span className="text-[8px] bg-indigo-500 text-white px-1.5 py-0.2 rounded font-mono">ON</span>}
                    </h4>
                    <p className="text-[10px] text-slate-400 font-bold leading-tight mt-0.5">{persona.arabicName}</p>
                    <p className="text-[9px] text-slate-500 line-clamp-1 leading-snug">{persona.arabicRole}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Floating suggestion lists */}
        <div className="glass-card-dark p-4 space-y-3">
          <div className="flex items-center gap-1.5 text-indigo-400">
            <Lightbulb className="w-4 h-4 shrink-0" />
            <h4 className="text-xs font-bold">💡 العبارات المقترحة للبدء السريع:</h4>
          </div>
          <p className="text-[10px] text-slate-400 font-medium">انقر على أي عِبارة لإدراجِها في صندوق الحديث فورياً ومقاومة رعب البدايات:</p>
          
          <div className="flex flex-wrap gap-2 pt-1 font-mono">
            {selectedPersona.id === "linda" && (
              <>
                <button type="button" onClick={() => onQuickPaste("Hello Linda! I am looking for a warm, cozy corner to read my favorite English books.", "chat")} className="text-[9px] bg-indigo-550/20 text-indigo-300 px-2 py-1 rounded-lg border border-indigo-500/10 hover:bg-indigo-500/20 text-left" dir="ltr">"Hello Linda! I am looking for a warm place..."</button>
                <button type="button" onClick={() => onQuickPaste("Could you please recommend a strong espresso and a typical English muffin?", "chat")} className="text-[9px] bg-indigo-550/20 text-indigo-300 px-2 py-1 rounded-lg border border-indigo-500/10 hover:bg-indigo-500/20 text-left" dir="ltr">"Could you recommend a strong espresso?"</button>
              </>
            )}
            {selectedPersona.id === "robert" && (
              <>
                <button type="button" onClick={() => onQuickPaste("Hi Robert. Here is my current resume. I am extremely eager to join StitchLab's engineering team.", "chat")} className="text-[9px] bg-indigo-550/20 text-indigo-300 px-2 py-1 rounded-lg border border-indigo-500/10 hover:bg-indigo-500/20 text-left" dir="ltr">"Hi Robert. Here is my current resume..."</button>
                <button type="button" onClick={() => onQuickPaste("What are the most valued skills and habits within your high-performing workforce?", "chat")} className="text-[9px] bg-indigo-550/20 text-indigo-300 px-2 py-1 rounded-lg border border-indigo-500/10 hover:bg-indigo-500/20 text-left" dir="ltr">"What are the most valued skills here?"</button>
              </>
            )}
            {selectedPersona.id === "lucas" && (
              <>
                <button type="button" onClick={() => onQuickPaste("Good afternoon officer. Yes, I am visiting New York for a two-week technology conference.", "chat")} className="text-[9px] bg-indigo-550/20 text-indigo-300 px-2 py-1 rounded-lg border border-indigo-500/10 hover:bg-indigo-500/20 text-left" dir="ltr">"Good afternoon officer. Yes, I am visiting..."</button>
                <button type="button" onClick={() => onQuickPaste("Here is my return air ticket and my hotel accommodation details.", "chat")} className="text-[9px] bg-indigo-550/20 text-indigo-300 px-2 py-1 rounded-lg border border-indigo-500/10 hover:bg-indigo-500/20 text-left" dir="ltr">"Here is my return ticket and hotel details..."</button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Chat pane wrapper */}
      <div className="lg:col-span-8 flex flex-col h-[520px] glass-card-dark rounded-3xl overflow-hidden shadow-inner">
        
        {/* Chat Header badge info */}
        <div className="p-4 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg ${selectedPersona.avatar}`}>
              {selectedPersona.emoji}
            </div>
            <div>
              <h3 className="text-xs font-serif font-black text-white">{selectedPersona.name}</h3>
              <p className="text-[9px] text-slate-400 font-bold">قرين المحادثة: {selectedPersona.arabicName}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClearHistory}
              title="تصفير ومسح المحادثة بالكامل"
              className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-bold rounded-lg text-[10px] transition-all flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">تصفير</span>
            </button>
          </div>
        </div>

        {/* Message Feed Canvas */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-915">
          {chatHistory.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center text-xl font-mono">
                💬
              </div>
              <div>
                <p className="text-xs font-black text-slate-300">الصالون جاهز ومحبوك لتلقي صياغاتك اللغوية!</p>
                <p className="text-[10px] text-slate-500 mt-1 max-w-xs mx-auto">
                  أرسل أول جملة ترحيبية بالإنجليزية، أو استخدم أحد المقترحات للبدء فورياً بالتبادل مع المدرب.
                </p>
              </div>
            </div>
          ) : (
            chatHistory.map((msg) => {
              const isUser = msg.role === "user";

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? "items-start text-left" : "items-end text-right"}`}
                >
                  <div className={`max-w-[85%] rounded-2xl p-3.5 ${
                    isUser
                      ? "bg-indigo-600 text-white rounded-tl-none font-mono font-medium"
                      : "bg-slate-800 text-slate-100 rounded-tr-none font-sans"
                  }`}>
                    
                    {/* Speak Button for bots only */}
                    {!isUser && (
                      <div className="flex justify-between items-center gap-2 border-b border-slate-700/50 pb-1 mb-1 text-[9px] text-indigo-300 font-mono">
                        <span>BOT WEAVE RESPONSE:</span>
                        <button
                          type="button"
                          onClick={() => speakText(msg.text)}
                          className="hover:text-white flex items-center gap-1 cursor-pointer"
                        >
                          <Volume2 className="w-3 h-3" />
                          <span>انطق</span>
                        </button>
                      </div>
                    )}

                    <p className="text-xs leading-relaxed select-all" dir={isUser ? "ltr" : "ltr"}>{msg.text}</p>

                    {/* Show Translation If Present */}
                    {msg.translation && (
                      <p className="text-[10px] text-indigo-200 border-r-2 border-indigo-400 pr-2 mt-2 font-sans select-all text-right" dir="rtl">
                        ترجمة: {msg.translation}
                      </p>
                    )}

                    {/* Show Feedback if Present */}
                    {msg.feedback && (
                      <div className="mt-2 bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 rounded-lg p-2 text-[10px] font-sans text-right" dir="rtl">
                        <span className="font-extrabold text-emerald-400 block mb-0.5">🌱 صيانة الجملة وتصحيح المدرب:</span>
                        <p className="select-all block leading-relaxed">{msg.feedback}</p>
                      </div>
                    )}

                  </div>

                  <span className="text-[8px] text-slate-500 mt-1 font-mono">{msg.timestamp}</span>
                </div>
              );
            })
          )}
          <div ref={feedEndRef} />
        </div>

        {/* Input area */}
        <form onSubmit={onSendMessage} className="p-3 bg-slate-950/60 border-t border-slate-800/80 flex gap-2">
          <input
            id="chat-send-input"
            type="text"
            value={chatInputValue}
            onChange={(e) => setChatInputValue(e.target.value)}
            disabled={chatLoading}
            placeholder={chatLoading ? "جاري صياغة الرد الذكي..." : "اكتب جملتك بالإنجليزية هنا لتبدأ الممارسة..."}
            className="flex-1 bg-slate-900 border border-slate-800 text-xs px-4 py-3 rounded-2xl focus:outline-none focus:border-indigo-500/50 text-white font-mono"
            dir="auto"
          />
          <button
            id="chat-send-submit"
            type="submit"
            disabled={chatLoading || !chatInputValue.trim()}
            className="w-12 h-12 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-800 disabled:text-slate-500 text-white flex items-center justify-center rounded-2xl transition-colors cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

      </div>

    </div>
  );
}
