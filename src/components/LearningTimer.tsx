import React, { useState, useEffect, useRef } from "react";
import { Timer, ChevronRight, Pause, Play } from "lucide-react";

interface LearningTimerProps {
  isLoggedIn: boolean;
  uid?: string;
}

export default function LearningTimer({ isLoggedIn, uid }: LearningTimerProps) {
  // Requirement: starts from 0 upon entry, and resets to 0 if page is closed/exited and re-entered
  const [seconds, setSeconds] = useState<number>(0);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [isPageVisible, setIsPageVisible] = useState<boolean>(!document.hidden);
  // Starts counting immediately upon student entry
  const [isTouchActive, setIsTouchActive] = useState<boolean>(true);

  const touchTimeoutRef = useRef<any>(null);

  // Sync state on student login / entry: always begins at 0 on each new entry/session
  useEffect(() => {
    if (isLoggedIn) {
      setSeconds(0);
      setIsTouchActive(true);
    } else {
      setSeconds(0);
      setIsTouchActive(false);
    }
  }, [isLoggedIn, uid]);

  // Handle visibility changes (stop when minimized/tab changed/page hidden)
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPageVisible(!document.hidden);
    };

    const handleWindowFocus = () => setIsPageVisible(true);
    const handleWindowBlur = () => setIsPageVisible(false);

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleWindowFocus);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleWindowFocus);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, []);

  // Requirement: "يبدا يعد فور دخول الطالب ولو توقف اللمس يتوقف العد"
  // Detect touch and interaction: touchstart, touchmove, touchend, pointerdown, pointermove, mousedown, click, scroll, keydown
  useEffect(() => {
    const INACTIVITY_TIMEOUT_MS = 5000; // If touch ceases for 5 seconds, pause counting

    const handleTouchOrInteraction = () => {
      setIsTouchActive(true);

      if (touchTimeoutRef.current) {
        clearTimeout(touchTimeoutRef.current);
      }
      touchTimeoutRef.current = setTimeout(() => {
        setIsTouchActive(false);
      }, INACTIVITY_TIMEOUT_MS);
    };

    // Upon entry/mount, start active immediately for 5s then pause if no touch occurs
    setIsTouchActive(true);
    if (touchTimeoutRef.current) clearTimeout(touchTimeoutRef.current);
    touchTimeoutRef.current = setTimeout(() => {
      setIsTouchActive(false);
    }, INACTIVITY_TIMEOUT_MS);

    const eventOptions: AddEventListenerOptions = { passive: true };
    const interactionEvents = [
      "touchstart",
      "touchmove",
      "touchend",
      "pointerdown",
      "pointermove",
      "mousedown",
      "click",
      "keydown",
      "scroll"
    ];

    interactionEvents.forEach((evt) => {
      window.addEventListener(evt, handleTouchOrInteraction, eventOptions);
    });

    return () => {
      if (touchTimeoutRef.current) {
        clearTimeout(touchTimeoutRef.current);
      }
      interactionEvents.forEach((evt) => {
        window.removeEventListener(evt, handleTouchOrInteraction);
      });
    };
  }, [isLoggedIn]);

  // Update timer every second only if student is logged in, page is visible, and touch interaction is active
  useEffect(() => {
    let interval: any = null;
    if (isLoggedIn && isPageVisible && isTouchActive) {
      interval = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (interval) clearInterval(interval);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLoggedIn, isPageVisible, isTouchActive]);

  // Format time as HH:MM:SS
  const formatTime = (totalSecs: number): string => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;

    const pad = (num: number) => num.toString().padStart(2, "0");
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  };

  if (!isLoggedIn) return null;

  return (
    <div 
      id="learning-timer-widget"
      className="fixed bottom-24 right-4 z-40 sm:bottom-6 sm:right-6 transition-all duration-300 ease-in-out select-none"
      dir="rtl"
    >
      {isCollapsed ? (
        // Collapsed State: Sleek interactive circle button
        <button
          type="button"
          onClick={() => setIsCollapsed(false)}
          className={`flex items-center justify-center p-3 text-white rounded-full shadow-xl hover:scale-110 active:scale-95 transition-all cursor-pointer border border-white/20 ${
            isTouchActive && isPageVisible
              ? "bg-gradient-to-tr from-pink-600 to-purple-600 shadow-pink-500/20"
              : "bg-gradient-to-tr from-slate-600 to-slate-800"
          }`}
          title={isTouchActive ? "مؤقت التعلم (نشط ويعد 🟢)" : "مؤقت التعلم (متوقف - المس الشاشة ⏸️)"}
        >
          <Timer className={`w-5 h-5 ${isTouchActive && isPageVisible ? "animate-pulse" : "opacity-80"}`} />
        </button>
      ) : (
        // Expanded State: Elegant Glassmorphism control card
        <div className={`bg-white/95 backdrop-blur-md rounded-2xl p-3 shadow-xl border flex items-center gap-3 animate-fadeIn max-w-[300px] transition-colors ${
          isTouchActive && isPageVisible ? "border-pink-200 shadow-pink-500/10" : "border-slate-200"
        }`}>
          {/* Collapse toggle button */}
          <button
            type="button"
            onClick={() => setIsCollapsed(true)}
            className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-purple-600 transition-colors cursor-pointer"
            title="تصغير المؤقت"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Time & Title Info */}
          <div className="flex flex-col text-right">
            <div className="flex items-center gap-1.5">
              <span className={`inline-block w-2 h-2 rounded-full ${
                isTouchActive && isPageVisible ? "bg-emerald-500 animate-ping" : "bg-amber-400"
              }`}></span>
              <span className="text-[11px] font-black text-purple-950">
                مؤقت التعلم
              </span>
              <span className={`text-[9px] font-extrabold px-1.5 py-0.2 rounded-md ${
                isTouchActive && isPageVisible
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                  : "bg-amber-50 text-amber-700 border border-amber-200/60"
              }`}>
                {isTouchActive && isPageVisible ? "نشط ويعد 🟢" : "متوقف (المس الشاشة) ⏸️"}
              </span>
            </div>

            <div className="flex items-center justify-between gap-2 mt-1">
              <span className="text-base font-black text-slate-900 font-mono tracking-wider dir-ltr select-all">
                {formatTime(seconds)}
              </span>
              {!(isTouchActive && isPageVisible) && (
                <span className="text-[9.5px] text-slate-400 font-bold">
                  توقف اللمس
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
