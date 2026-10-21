import React from "react";
import { Layers, Plus, Search, Trash2, Volume2, X } from "lucide-react";

interface Flashcard {
  id: string;
  word: string;
  ipa: string;
  partOfSpeech: string;
  meaning: string;
  example: string;
  exampleTranslation: string;
  level: string;
}

interface FlashcardsPanelProps {
  flashcardSearch: string;
  setFlashcardSearch: (val: string) => void;
  flashcardLevelFilter: string;
  setFlashcardLevelFilter: (val: string) => void;
  showAddCardModal: boolean;
  setShowAddCardModal: (val: boolean) => void;
  newCardWord: string;
  setNewCardWord: (val: string) => void;
  newCardIpa: string;
  setNewCardIpa: (val: string) => void;
  newCardPartOfSpeech: string;
  setNewCardPartOfSpeech: (val: string) => void;
  newCardMeaning: string;
  setNewCardMeaning: (val: string) => void;
  newCardExample: string;
  setNewCardExample: (val: string) => void;
  newCardExampleTranslation: string;
  setNewCardExampleTranslation: (val: string) => void;
  newCardLevel: string;
  setNewCardLevel: (val: any) => void;
  onAddFlashcard: (e: React.FormEvent) => void;
  onDeleteFlashcard: (id: string) => void;
  filteredFlashcards: Flashcard[];
  speakText: (text: string) => void;
}

export default function FlashcardsPanel({
  flashcardSearch,
  setFlashcardSearch,
  flashcardLevelFilter,
  setFlashcardLevelFilter,
  showAddCardModal,
  setShowAddCardModal,
  newCardWord,
  setNewCardWord,
  newCardIpa,
  setNewCardIpa,
  newCardPartOfSpeech,
  setNewCardPartOfSpeech,
  newCardMeaning,
  setNewCardMeaning,
  newCardExample,
  setNewCardExample,
  newCardExampleTranslation,
  setNewCardExampleTranslation,
  newCardLevel,
  setNewCardLevel,
  onAddFlashcard,
  onDeleteFlashcard,
  filteredFlashcards,
  speakText
}: FlashcardsPanelProps) {
  const [visibleCount, setVisibleCount] = React.useState<number>(6);

  React.useEffect(() => {
    setVisibleCount(6);
  }, [flashcardSearch, flashcardLevelFilter]);

  return (
    <div className="space-y-6 text-right leading-relaxed animate-fadeIn" dir="rtl">
      
      {/* Search and control bar */}
      <div className="glass-card-dark p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-indigo-400" />
          <div>
            <h3 className="text-xs font-black text-slate-350">أطلس الكلمات والبطاقات الاستذكارية الذكية</h3>
            <p className="text-[10px] text-slate-500">راجع مخزون كلماتك، واستمع لنطقها الفصيح، أو اصنع بطاقاتك يدويًا.</p>
          </div>
        </div>

        {/* Action triggers */}
        <button
          type="button"
          onClick={() => setShowAddCardModal(true)}
          className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-xs flex items-center gap-1.5 transition-all select-none cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>اصنع بطاقة استذكار لغوية جديدة</span>
        </button>
      </div>

      {/* Filters area */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        <div className="md:col-span-8 glass-card-dark rounded-2xl px-3 py-2 flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-500 shrink-0" />
          <input
            type="text"
            value={flashcardSearch}
            onChange={(e) => setFlashcardSearch(e.target.value)}
            placeholder="ابحث بين البطاقات بالكلمة، المعنى، أو سياق المثال..."
            className="w-full bg-transparent text-xs text-slate-100 placeholder-slate-500 border-none focus:outline-none"
          />
        </div>

        <div className="md:col-span-4 glass-card-dark rounded-2xl px-2 py-1.5 flex items-center gap-2">
          <span className="text-[10px] text-slate-400 whitespace-nowrap shrink-0">تصنيف الصعوبة:</span>
          <select
            value={flashcardLevelFilter}
            onChange={(e) => setFlashcardLevelFilter(e.target.value)}
            className="w-full bg-transparent text-xs text-slate-200 border-none focus:outline-none focus:ring-0 cursor-pointer"
          >
            <option value="All">جميع الكلمات والأطلس (All)</option>
            <option value="Beginner">مبتدئ (Beginner)</option>
            <option value="Intermediate">متوسط (Intermediate)</option>
            <option value="Advanced">متقدم (Advanced)</option>
          </select>
        </div>
      </div>

      {/* Grid count stats */}
      <p className="text-[10px] text-slate-400 font-bold">تم العثور على <strong>{filteredFlashcards.length}</strong> بطاقة استذكارية متقنة.</p>

      {/* Empty states handling */}
      {filteredFlashcards.length === 0 ? (
        <div className="glass-card-dark p-12 text-center space-y-2">
          <div className="text-3xl">🎴</div>
          <p className="text-xs font-black text-slate-300">لا يوجد بطاقات استذكارية تطابق فلاتر البحث</p>
          <p className="text-[10px] text-slate-500">جرب البحث بكلمة مغايرة أو اضغط على زر "اصنع بطاقة" لإدراج مرادف جديد خاص بك.</p>
        </div>
      ) : (
        <div className="space-y-6" id="flashcards-lazy-container">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFlashcards.slice(0, visibleCount).map((card) => {
              const isCustom = card.id.startsWith("custom-");

              return (
                <div
                  key={card.id}
                  className="glass-card-dark p-5 flex flex-col justify-between min-h-[220px] shadow-sm relative hover:shadow-md transition-all font-sans"
                >
                  
                  {/* Word specs */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-start gap-2 text-left" dir="ltr">
                      <span className={`text-[8px] font-mono tracking-wider font-extrabold px-1.5 py-0.2 rounded ${
                        card.level === "Beginner" 
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : card.level === "Intermediate"
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          : "bg-pink-500/10 text-pink-400 border border-pink-500/20"
                      }`}>
                        {card.level}
                      </span>

                      {isCustom && (
                        <button
                          type="button"
                          onClick={() => onDeleteFlashcard(card.id)}
                          className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                          title="حذف هذه البطاقة المضافة"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-left">
                      <h4 className="text-lg font-black tracking-wide text-white select-all">
                        {card.word}
                      </h4>
                      <button
                        type="button"
                        onClick={() => speakText(card.word)}
                        className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white flex items-center justify-center text-xs transition-colors"
                        title="استمع لنطق الكلمة"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </div>

                    <p className="text-[10px] text-slate-400 font-mono italic select-all text-left" dir="ltr">{card.ipa}</p>

                    <p className="text-xs pt-1.5 font-bold select-all text-right text-indigo-300" dir="rtl">
                      المعنى: {card.meaning}
                    </p>
                  </div>

                  {/* Example box segment */}
                  <div className="bg-slate-950 p-3 rounded-2xl border border-slate-850/80 leading-normal space-y-1.5 text-left mt-4" dir="ltr">
                    <div className="flex justify-between items-center text-[8px] text-slate-500 border-b border-slate-900 pb-1">
                      <span>EXAMPLE USE CASE:</span>
                      <button
                        type="button"
                        onClick={() => speakText(card.example)}
                        className="text-slate-400 hover:text-white underline text-[8px]"
                      >
                        انطق الجملة الكاملة
                      </button>
                    </div>
                    <p className="text-[11px] font-sans font-semibold italic text-slate-200 select-all leading-relaxed">
                      "{card.example}"
                    </p>
                    <p className="text-[10px] text-slate-450 font-sans text-right leading-relaxed border-t border-slate-900 pt-1 font-medium" dir="rtl">
                      ترجمة المثال: {card.exampleTranslation}
                    </p>
                  </div>

                </div>
              );
            })}
          </div>

          {filteredFlashcards.length > visibleCount && (
            <div className="flex justify-center pt-2" id="flashcards-lazy-load-container">
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => prev + 6)}
                className="px-6 py-2.5 bg-indigo-950/40 hover:bg-indigo-900/50 text-indigo-300 hover:text-indigo-200 border border-indigo-500/20 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <span>➕ تحميل المزيد من بطاقات المفردات (On-Demand ⚡)</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* CREATE FLASHCARD DIALOG MODAL */}
      {showAddCardModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <form
            onSubmit={onAddFlashcard}
            className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-5 md:p-6 space-y-4 shadow-2xl text-right leading-relaxed"
            dir="rtl"
          >
            <div className="flex justify-between items-center border-b border-slate-850 pb-3">
              <h3 className="text-sm font-black text-white">صنع حجر مخصص من الكلمات الراقية 🎴</h3>
              <button
                type="button"
                onClick={() => setShowAddCardModal(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-300 block">الكلمة بالإنجليزية:</label>
                <input
                  type="text"
                  required
                  value={newCardWord}
                  onChange={(e) => setNewCardWord(e.target.value)}
                  placeholder="e.g. Needle"
                  className="w-full bg-slate-850 text-slate-100 border border-slate-800 rounded-lg p-2.5 text-xs focus:outline-none"
                  dir="ltr"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-300 block">النطق الفونيتي (IPA) - اختياري:</label>
                <input
                  type="text"
                  value={newCardIpa}
                  onChange={(e) => setNewCardIpa(e.target.value)}
                  placeholder="e.g. /ˈniːdl/"
                  className="w-full bg-slate-850 text-slate-100 border border-slate-800 rounded-lg p-2.5 text-xs focus:outline-none"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-300 block">نوع الكلمة (Part of speech):</label>
                <select
                  value={newCardPartOfSpeech}
                  onChange={(e) => setNewCardPartOfSpeech(e.target.value)}
                  className="w-full bg-slate-850 text-slate-200 border border-slate-800 rounded-lg p-2.5 text-xs focus:outline-none cursor-pointer"
                >
                  <option value="Noun">اسم (Noun)</option>
                  <option value="Verb">فعل (Verb)</option>
                  <option value="Adjective">صفة (Adjective)</option>
                  <option value="Adverb">ظرف (Adverb)</option>
                  <option value="Phrase">تعبير/عبارة (Phrase)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-300 block">درجة الكلمة (Level):</label>
                <select
                  value={newCardLevel}
                  onChange={(e) => setNewCardLevel(e.target.value)}
                  className="w-full bg-slate-850 text-slate-200 border border-slate-800 rounded-lg p-2.5 text-xs focus:outline-none cursor-pointer"
                >
                  <option value="Beginner">مبتدئ (Beginner)</option>
                  <option value="Intermediate">متوسط (Intermediate)</option>
                  <option value="Advanced">متقدم (Advanced)</option>
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-300 block font-bold">المعنى بالعربية:</label>
              <input
                type="text"
                required
                value={newCardMeaning}
                onChange={(e) => setNewCardMeaning(e.target.value)}
                placeholder="مثال: الفهم والاستيعاب اللغوي"
                className="w-full bg-slate-850 text-slate-100 border border-slate-800 rounded-lg p-2.5 text-xs focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-300 block">مثال توضيحي بالإنجليزية (Example):</label>
              <input
                type="text"
                required
                value={newCardExample}
                onChange={(e) => setNewCardExample(e.target.value)}
                placeholder="e.g. Understanding new words helps you communicate clearly."
                className="w-full bg-slate-850 text-slate-100 border border-slate-800 rounded-lg p-2.5 text-xs focus:outline-none"
                dir="ltr"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-300 block">ترجمة المثال التوضيحي بالبليغ:</label>
              <input
                type="text"
                value={newCardExampleTranslation}
                onChange={(e) => setNewCardExampleTranslation(e.target.value)}
                placeholder="مثال: الفهم والقراءة الدقيقة تمهد الطريق لكسب ثقة المستمع والتعلم المستمر."
                className="w-full bg-slate-850 text-slate-100 border border-slate-800 rounded-lg p-2.5 text-xs focus:outline-none"
              />
            </div>

            <button
              id="newcard-submit-btn"
              type="submit"
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-2xl text-xs transition-colors shadow-md cursor-pointer text-center"
            >
              تصميم وإضافة بطاقتي الجديدة للأطلس 🏷️
            </button>
          </form>
        </div>
      )}

    </div>
  );
}
