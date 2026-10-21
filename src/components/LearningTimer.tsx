import React, { useState, useEffect } from "react";
import { Timer, ChevronRight } from "lucide-react";

interface LearningTimerProps {
  isLoggedIn: boolean;
  uid?: string;
}

export default function LearningTimer({ isLoggedIn, uid }: LearningTimerProps) {
  const [seconds, setSeconds] = useState<number>(0);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [isPageVisible, setIsPageVisible] = useState<boolean>(!document.hidden);

  // Sync internal state when isLoggedIn/uid changes or on mount
  useEffect(() => {
    if (isLoggedIn && uid) {
      const storageKey = `stitchlab_learning_seconds_${uid}`;
      const savedTime = localStorage.getItem(storageKey);
      if (savedTime) {
        setSeconds(parseInt(savedTime, 10));
      } else {
        // First login: starts at 0
        setSeconds(0);
        localStorage.setItem(storageKey, "0");
      }
    } else {
      // Stopped/reset if not logged in
      setSeconds(0);
    }
  }, [isLoggedIn, uid]);

  // Handle visibility changes to stop timer when minimized/hidden/tab switched ("عند اغلاق البرنامج اجعله يتوقف")
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPageVisible(!document.hidden);
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    // Also listen to window unload/pagehide to stop the timer and ensure it persists the correct time
    const handleUnloadAndStop = () => {
      setIsPageVisible(false);
    };
    
    // Listen to focus and blur of window to stop/resume precisely
    const handleWindowFocus = () => setIsPageVisible(true);
    const handleWindowBlur = () => setIsPageVisible(false);

    window.addEventListener("beforeunload", handleUnloadAndStop);
    window.addEventListener("pagehide", handleUnloadAndStop);
    window.addEventListener("focus", handleWindowFocus);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleUnloadAndStop);
      window.removeEventListener("pagehide", handleUnloadAndStop);
      window.removeEventListener("focus", handleWindowFocus);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, []);

  // Update timer every second only if student is logged in AND page is active/visible
  useEffect(() => {
    let interval: any = null;
    if (isLoggedIn && uid && isPageVisible) {
      interval = setInterval(() => {
        setSeconds((prev) => {
          const next = prev + 1;
          const storageKey = `stitchlab_learning_seconds_${uid}`;
          localStorage.setItem(storageKey, next.toString());
          return next;
        });
      }, 1000);
    } else {
      if (interval) clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLoggedIn, uid, isPageVisible]);

  // Format time as HH:MM:SS
  const formatTime = (totalSecs: number): string => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;

    const pad = (num: number) => num.toString().padStart(2, "0");
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  };

  return (
    <div 
      id="learning-timer-widget"
      className="fixed bottom-24 right-4 z-40 sm:bottom-6 sm:right-6 transition-all duration-300 ease-in-out"
      dir="rtl"
    >
      {isCollapsed ? (
        // Collapased State: Sleek interactive small circle button
        <button
          type="button"
          onClick={() => setIsCollapsed(false)}
          className="flex items-center justify-center p-3 bg-gradient-to-tr from-pink-600 to-purple-600 text-white rounded-full shadow-lg hover:scale-110 active:scale-95 transition-all cursor-pointer border border-white/20"
          title="فتح مؤقت التعلم"
        >
          <Timer className="w-5 h-5 animate-pulse" />
        </button>
      ) : (
        // Expanded State: Elegant Glassmorphism control card
        <div className="bg-white/90 backdrop-blur-md rounded-2xl p-3 shadow-xl border border-pink-100 flex items-center gap-3 animate-fadeIn max-w-[280px]">
          {/* Collapse toggle button */}
          <button
            type="button"
            onClick={() => setIsCollapsed(true)}
            className="p-1 hover:bg-pink-50 rounded-lg text-slate-400 hover:text-pink-600 transition-colors cursor-pointer"
            title="تصغير المؤقت"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Time & Title Info */}
          <div className="flex flex-col text-right">
            <span className="text-[10px] font-bold text-pink-600 flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
              مؤقت التعلم
            </span>
            <span className="text-sm font-extrabold text-slate-800 font-mono tracking-wider mt-0.5 select-all">
              {formatTime(seconds)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
