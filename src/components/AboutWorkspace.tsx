import React from "react";

export default function AboutWorkspace() {
  return (
    <div className="space-y-6 text-right leading-relaxed" dir="rtl">
      
      {/* Brand Card with elegant logo container */}
      <div className="bg-gradient-to-tr from-[#dd7390] to-indigo-600 text-white p-6 md:p-8 rounded-3xl shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-14 h-14 bg-white/95 rounded-2xl p-1.5 shadow-md overflow-hidden shrink-0">
            <img src="https://raw.githubusercontent.com/stitchlab1/stitchlab2/0ceec11a5ca77c5d4607a90cab424bc9ec880155/stitchlab_icon_hd.png" alt="StitchLab Logo" referrerPolicy="no-referrer" className="w-full h-full object-contain" />
          </div>
          <div>
            <h2 className="text-2xl font-black font-serif tracking-tight">StitchLab</h2>
            <p className="text-[10px] text-indigo-100 font-semibold tracking-wider uppercase mt-1 antialiased">
              مساحة تعليمية مبتكرة
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Areas with exact text requested */}
      <div className="bg-slate-900 border border-slate-850 p-6 md:p-8 rounded-3xl space-y-6 shadow-sm">
        <p id="about-info-par1" className="text-sm md:text-base text-slate-200 font-bold leading-relaxed whitespace-pre-line antialiased">
          StitchLab هو مساحة تعليمية مبتكرة تساعد على تعلم الكلمات والقواعد بطريقة ممتعة وتفاعلية. لنصنع معاً مستقبلاً مليئاً بالإبداع والمعرفة.
        </p>
        
        <div className="w-16 h-[2px] bg-gradient-to-r from-[#ff758c] to-[#4f46e5] rounded-full"></div>

        <p id="about-info-par2" className="text-xs md:text-sm text-slate-400 font-medium leading-relaxed antialiased">
          محتوانا مصمم وفق معايير الجودة الأكاديمية العالمية.
        </p>
      </div>

    </div>
  );
}
