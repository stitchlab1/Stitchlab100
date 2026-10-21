import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Plus, Check, Lock, Sparkles, Volume2, Globe, ArrowRight, X, RefreshCw, FileSpreadsheet, Mic, ChevronRight, ChevronLeft, AlertCircle, ThumbsUp, CheckCircle } from "lucide-react";
import { playAudioFeedback } from "./types";
import staticSheetWords from "../data/staticSheetWords.json";
import { getFilteredCompletedAndSkipped } from "../utils/wordFilters";
import { auth, db } from "../firebaseClient";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import domtoimage from "dom-to-image";
import confetti from "canvas-confetti";

const getTodayDateArabic = () => {
  const d = new Date();
  const months = ["يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
  return `${d.getDate()} ${months[d.getMonth()]}`;
};


interface LearningLevel {
  number: number;
  title: string;
  englishTitle: string;
  description: string;
  bilingualGoal: string;
  colorClass: string;
  icon: string;
  personaId: string;
  vocabTip: string;
}

interface HomeWorkspaceProps {
  unlockedLevel: number;
  completedLevels: number[];
  currentTickTime: string;
  bonusMinutes: number;
  setBonusMinutes: React.Dispatch<React.SetStateAction<number>>;
  onLevelStart: (level: LearningLevel) => void;
  onLevelComplete: (lvlNum: number) => void;
  onResetProgress: () => void;
  LEARNING_LEVELS: LearningLevel[];
  dailySecondsLeft: number;
  extraAdClaimsCount: number;
  unlockedAdvertiserGroups: string[];
  onUnlockGroup: (groupKey: string) => void;
  completedGroupsProp?: string[];
  setCompletedGroupsProp?: React.Dispatch<React.SetStateAction<string[]>>;
  completedWordsCount: number;
  setCompletedWordsCount?: React.Dispatch<React.SetStateAction<number>>;
  studentSemester?: string;
  onForceSaveProgress?: (overrides?: Partial<{
    completedGroups: string[];
    completedWordsCount: number;
    unlockedLevel: number;
    completedLevels: number[];
    completedWordKeys: string[];
    skippedWordKeys: string[];
  }>) => void;
  points?: number;
  setPoints?: React.Dispatch<React.SetStateAction<number>>;
  completedWordKeys?: string[];
  setCompletedWordKeys?: React.Dispatch<React.SetStateAction<string[]>>;
  skippedWordKeys?: string[];
  setSkippedWordKeys?: React.Dispatch<React.SetStateAction<string[]>>;
  reviewTargetWord?: string | null;
  setReviewTargetWord?: (w: string | null) => void;
}

interface SheetWord {
  id: string;
  semester: string; // الفصل الدراسي
  word: string;     // الكلمة بالإنجليزية
  meaning: string;  // المعنى بالكامل بالعربية
  definition?: string; // التعريف والترجمة التوضيحية
  ipa?: string;     // الرمز الصوتي والنطق
  imageUrl?: string;// رابط الصورة
  group?: string;   // المجموعة أو التصنيف
  level?: number;   // المستوى الرقمي (1-9)
}

const DEFAULT_SHEET_WORDS: SheetWord[] = [
  // الفصل الدراسي الأول
  {
    id: "def-1",
    semester: "الفصل الدراسي الأول",
    level: 1,
    word: "Understand",
    meaning: "يفهم / يستوعب",
    ipa: "/ˌʌn.dəˈstænd/",
    imageUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=150&auto=format&fit=crop&q=60",
    group: "أساسيات تواصل"
  },
  {
    id: "def-2",
    semester: "الفصل الدراسي الأول",
    level: 2,
    word: "Beautiful",
    meaning: "جميل / رائع وخلاب",
    ipa: "/ˈbjuː.tɪ.fəl/",
    imageUrl: "https://images.unsplash.com/photo-1447752875215-b2761acb3c5d?w=150&auto=format&fit=crop&q=60",
    group: "صفات شائعة"
  },
  {
    id: "def-3",
    semester: "الفصل الدراسي الأول",
    level: 3,
    word: "Language",
    meaning: "اللغة / نظام التواصل",
    ipa: "/ˈlæŋ.ɡwɪdʒ/",
    imageUrl: "https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=150&auto=format&fit=crop&q=60",
    group: "دراسة وتدريب"
  },
  // الفصل الدراسي الثاني
  {
    id: "def-4",
    semester: "الفصل الدراسي الثاني",
    level: 4,
    word: "Progress",
    meaning: "تقدّم / تطوّر نوعي",
    ipa: "/ˈprəʊ.ɡres/",
    imageUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=150&auto=format&fit=crop&q=60",
    group: "مفاهيم النجاح"
  },
  {
    id: "def-5",
    semester: "الفصل الدراسي الثاني",
    level: 5,
    word: "Challenge",
    meaning: "تحدّي / بذل المجهود",
    ipa: "/tʃæl.ɪndʒ/",
    imageUrl: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=150&auto=format&fit=crop&q=60",
    group: "مفاهيم النجاح"
  },
  {
    id: "def-6",
    semester: "الفصل الدراسي الثاني",
    level: 6,
    word: "Creative",
    meaning: "إبداعي / مبتكر ومُلهم",
    ipa: "/kriˈeɪ.tɪv/",
    imageUrl: "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=150&auto=format&fit=crop&q=60",
    group: "صفات شائعة"
  },
  // الفصل الدراسي الثالث
  {
    id: "def-7",
    semester: "الفصل الدراسي الثالث",
    level: 7,
    word: "Fluency",
    meaning: "الطلاقة / فصاحة التعبير",
    ipa: "/ˈfluː.ən.si/",
    imageUrl: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=150&auto=format&fit=crop&q=60",
    group: "دراسة وتدريب"
  },
  {
    id: "def-8",
    semester: "الفصل الدراسي الثالث",
    level: 8,
    word: "Vocabulary",
    meaning: "قاموس المفردات / الكلمات",
    ipa: "/vəˈkæb.jʊ.lər.i/",
    imageUrl: "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=150&auto=format&fit=crop&q=60",
    group: "دراسة وتدريب"
  },
  {
    id: "def-9",
    semester: "الفصل الدراسي الثالث",
    level: 9,
    word: "Mastery",
    meaning: "إتقان / تمكّن حقيقي",
    ipa: "/ˈmɑː.stər.i/",
    imageUrl: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=150&auto=format&fit=crop&q=60",
    group: "مفاهيم النجاح"
  }
];

const convertToDirectImageUrl = (url: string): string => {
  if (!url) return "";
  const trimmed = url.trim();

  if (trimmed.startsWith("data:") || trimmed.includes("unsplash.com") || trimmed.includes("images.unsplash.com")) {
    return trimmed;
  }

  if (trimmed.includes("drive.google.com")) {
    const fileIdMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
    if (fileIdMatch && fileIdMatch[1]) {
      return `https://docs.google.com/uc?export=view&id=${fileIdMatch[1]}`;
    }
    const queryIdMatch = trimmed.match(/[?&]id=([a-zA-Z0-9-_]+)/);
    if (queryIdMatch && queryIdMatch[1]) {
      return `https://docs.google.com/uc?export=view&id=${queryIdMatch[1]}`;
    }
  }
  
  return trimmed;
};

const parseLevelNum = (val: string, indexFallback: number): number => {
  if (!val) {
    return 1;
  }
  const clean = val.trim().toLowerCase();
  
  const digits = clean.replace(/\D/g, "");
  if (digits) {
    const num = parseInt(digits, 10);
    if (num >= 1 && num <= 9) return num;
  }

  if (clean.includes("one") || clean.includes("first")) return 1;
  if (clean.includes("two") || clean.includes("second")) return 2;
  if (clean.includes("three") || clean.includes("third")) return 3;
  if (clean.includes("four") || clean.includes("fourth")) return 4;
  if (clean.includes("five") || clean.includes("fifth")) return 5;
  if (clean.includes("six") || clean.includes("sixth")) return 6;
  if (clean.includes("seven") || clean.includes("seventh")) return 7;
  if (clean.includes("eight") || clean.includes("eighth")) return 8;
  if (clean.includes("nine") || clean.includes("ninth")) return 9;

  if (clean.includes("أول") || clean.includes("اول") || clean.includes("الأول") || clean.includes("الاول")) return 1;
  if (clean.includes("ثان") || clean.includes("ثني") || clean.includes("الثاني") || clean.includes("تاني")) return 2;
  if (clean.includes("ثالث") || clean.includes("الثالث") || clean.includes("تالت")) return 3;
  if (clean.includes("رابع") || clean.includes("الرابع")) return 4;
  if (clean.includes("خامس") || clean.includes("الخامس")) return 5;
  if (clean.includes("سادس") || clean.includes("السادس")) return 6;
  if (clean.includes("سابع") || clean.includes("السابع")) return 7;
  if (clean.includes("ثامن") || clean.includes("الثامن")) return 8;
  if (clean.includes("تاسع") || clean.includes("التاسع")) return 9;

  return 1;
};

const parseGoogleSheet = async (sheetUrlOrId: string): Promise<SheetWord[]> => {
  let spreadsheetId = sheetUrlOrId.trim();
  const matches = sheetUrlOrId.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (matches && matches[1]) {
    spreadsheetId = matches[1];
  }

  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error("فشلت عملية سحب جدول البيانات. يرجى مراجعة صلاحيات المشاركة للملف وجعله متاحاً للكل (Anyone with link).");
  }
  
  const text = await res.text();
  const jsonStart = text.indexOf("google.visualization.Query.setResponse(");
  if (jsonStart === -1) {
    throw new Error("تنسيق رد قوقل غير متوافق. تأكد من إعدادات الورقة.");
  }
  
  const rawJson = text.substring(jsonStart + "google.visualization.Query.setResponse(".length, text.length - 2);
  const data = JSON.parse(rawJson);
  
  if (!data?.table?.rows) {
    throw new Error("لا توجد الصفوف المطلوبة في ورقة بيانات قوقل.");
  }

  const table = data.table;
  const cols = table.cols.map((c: any) => (c?.label || "").trim().toLowerCase());
  
  const findColumnIndex = (possibleHeaders: string[]): number => {
    return cols.findIndex((col: string) => 
      possibleHeaders.some(h => col.includes(h) || h.includes(col))
    );
  };

  const semIdx = findColumnIndex(["الفصل", "فصل", "ترم", "term", "chapter", "semester"]);
  const wordIdx = findColumnIndex(["الكلمة", "كلمة", "مفردة", "word", "english", "en"]);
  const meanIdx = findColumnIndex(["المعنى", "معنى", "ترجمة", "meaning", "translation", "arabic", "ar"]);
  const defIdx = findColumnIndex(["definition", "التعريف", "تعريف", "التعاريف", "explanation", "details"]);
  const ipaIdx = findColumnIndex(["النطق", "صوت", "لفظ", "ipa", "pronunciation", "phonics"]);
  const imgIdx = findColumnIndex(["dirkt link", "direct link", "dirkt", "direct", "الصورة", "رابط", "image", "url", "link", "photo", "pic"]);
  const grpIdx = findColumnIndex(["group nama", "groupname", "المجموعة", "مجموعة", "تصنيف", "category", "group", "class"]);
  const levelIdx = findColumnIndex(["المستوى", "المستوي", "مستوي", "مستوى", "level", "lvl"]);

  const parsedWords: SheetWord[] = [];

  table.rows.forEach((row: any, rIdx: number) => {
    if (!row?.c) return;
    
    const getVal = (colIndex: number): string => {
      if (colIndex === -1) return "";
      const cell = row.c[colIndex];
      if (!cell) return "";
      if (cell.v === null || cell.v === undefined) return "";
      return String(cell.v).trim();
    };

    const word = getVal(wordIdx);
    const rawMeaning = getVal(meanIdx);
    const rawDefinition = getVal(defIdx);

    if (!word || word.toLowerCase() === "word" || word === "الكلمة") return;

    const meaning = rawMeaning || rawDefinition || "";
    const definition = rawDefinition || rawMeaning || "";

    parsedWords.push({
      id: `synced-${rIdx}-${Math.random().toString(36).substring(4)}`,
      semester: getVal(semIdx) || "الفصل الدراسي الأول",
      word: word,
      meaning: meaning,
      definition: definition,
      ipa: getVal(ipaIdx) || "",
      imageUrl: convertToDirectImageUrl(getVal(imgIdx)),
      group: getVal(grpIdx) || "عادية",
      level: parseLevelNum(getVal(levelIdx), rIdx)
    });
  });

  if (parsedWords.length === 0) {
    throw new Error("يتعذر العثور على أي كلمات مطابقة. يرجى التحقق من رؤوس ورقة البيانات.");
  }

  return parsedWords;
};

const isSpeechMatched = (targetWord: string, transcriptText: string): boolean => {
  const target = targetWord.toLowerCase().trim().replace(/[^a-z0-9]/g, "");
  const cleanSpeech = transcriptText.toLowerCase().trim().replace(/[^a-z0-9]/g, "");

  if (!target || !cleanSpeech) return false;

  // Exact or direct substring match
  if (cleanSpeech.includes(target) || target.includes(cleanSpeech)) {
    return true;
  }

  // Relax matching heavily for words with 1 or 2 characters so they are heard/accepted easily:
  if (target.length <= 2) {
    // If the transcript is extremely short as well, overlapping safe characters works
    if (cleanSpeech.length <= 4) {
      for (const char of target) {
        if (cleanSpeech.includes(char)) return true;
      }
    }

    // Phonetic mapping for typical failures when uttering short words
    const soundAlikes: { [key: string]: string[] } = {
      "a": ["ay", "ei", "hey", "i", "e", "eh", "one"],
      "an": ["and", "in", "am", "on", "any", "n"],
      "at": ["it", "cat", "ate", "et", "ad", "act", "as"],
      "be": ["bee", "by", "b", "me", "he", "we"],
      "by": ["buy", "bye", "by", "pi", "my", "hi", "p"],
      "do": ["due", "to", "dew", "duo", "you", "u"],
      "go": ["god", "gold", "good", "no", "co", "so", "u"],
      "he": ["she", "him", "her", "the", "hi", "hey", "h"],
      "hi": ["high", "hey", "hello", "how", "I", "i"],
      "if": ["is", "it", "eve", "off", "of", "f"],
      "in": ["inn", "on", "it", "an", "into", "and", "en"],
      "is": ["es", "it", "his", "as", "if", "ease", "s"],
      "it": ["eat", "its", "at", "in", "is", "et", "if", "t"],
      "me": ["my", "we", "be", "mi", "may", "m"],
      "my": ["me", "mi", "hi", "by", "may", "i"],
      "no": ["know", "nod", "not", "now", "so", "go", "n"],
      "of": ["off", "have", "on", "up", "if", "v"],
      "on": ["one", "un", "in", "of", "an", "own", "o"],
      "or": ["our", "are", "for", "her", "r"],
      "so": ["sew", "show", "saw", "no", "go", "to", "s"],
      "to": ["two", "too", "do", "so", "go", "through", "t"],
      "up": ["app", "off", "hope", "above", "p"],
      "us": ["as", "is", "bus", "use", "has", "s"],
      "we": ["with", "be", "me", "he", "way"]
    };

    if (soundAlikes[target]) {
      if (soundAlikes[target].some(alias => cleanSpeech.includes(alias) || alias.includes(cleanSpeech))) {
        return true;
      }
    }

    if (target.length === 1 && cleanSpeech.startsWith(target)) {
      return true;
    }
  }

  // Fallback fuzzy overlap mapping (share half the chars)
  if (target.length <= 3) {
    let matches = 0;
    const cleanChars = cleanSpeech.split("");
    for (const char of target.split("")) {
      const idx = cleanChars.indexOf(char);
      if (idx !== -1) {
        matches++;
        cleanChars.splice(idx, 1);
      }
    }
    const ratio = matches / target.length;
    if (ratio >= 0.5) return true;
  }

  return false;
};

export default function HomeWorkspace({
  unlockedLevel,
  completedLevels,
  currentTickTime,
  bonusMinutes,
  setBonusMinutes,
  onLevelStart,
  onLevelComplete,
  onResetProgress,
  LEARNING_LEVELS,
  dailySecondsLeft,
  extraAdClaimsCount,
  unlockedAdvertiserGroups,
  onUnlockGroup,
  completedGroupsProp,
  setCompletedGroupsProp,
  completedWordsCount,
  setCompletedWordsCount,
  studentSemester = "الفصل الدراسي الأول",
  onForceSaveProgress,
  points,
  setPoints,
  completedWordKeys = [],
  setCompletedWordKeys,
  skippedWordKeys = [],
  setSkippedWordKeys,
  reviewTargetWord,
  setReviewTargetWord
}: HomeWorkspaceProps) {
  const [sheetWords, setSheetWords] = useState<SheetWord[]>(() => {
    const saved = localStorage.getItem("stitchlab_sheet_words");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return (staticSheetWords && staticSheetWords.length > 0) ? (staticSheetWords as SheetWord[]) : DEFAULT_SHEET_WORDS;
  });

  // Automated background Google Sheets re-fetch/revalidate (auto-updates every 30 seconds on load/mount)
  useEffect(() => {
    const checkAndAutoRefetch = async () => {
      const savedLink = localStorage.getItem("stitchlab_sheet_link") || "https://docs.google.com/spreadsheets/d/1BtCUNuf34uVEaQS_hPbINw0-ogACWzyKsN426QftNwI/edit?usp=drivesdk";
      if (!savedLink) return;

      const lastFetchStr = localStorage.getItem("stitchlab_sheet_last_fetch_time");
      const lastFetch = lastFetchStr ? parseInt(lastFetchStr, 10) : 0;
      const now = Date.now();
      const updateIntervalMs = 30 * 1000; // 30 seconds for dynamic instant updates on reload

      if (now - lastFetch >= updateIntervalMs) {
        console.log("StitchLab Auto-Refetch: Fetching latest Google Sheet data dynamically...");
        try {
          const parsed = await parseGoogleSheet(savedLink);
          setSheetWords(parsed);
          localStorage.setItem("stitchlab_sheet_words", JSON.stringify(parsed));
          localStorage.setItem("stitchlab_sheet_last_fetch_time", now.toString());
          console.log(`StitchLab Auto-Refetch: Success. Synchronized ${parsed.length} cards in background.`);
        } catch (err) {
          console.error("StitchLab Background Auto-Refetch failed:", err);
        }
      }
    };

    // Run check on mount
    checkAndAutoRefetch();

    // Check periodically (e.g., every 5 minutes in case of long sessions)
    const interval = setInterval(checkAndAutoRefetch, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const [selectedLevel, setSelectedLevel] = useState<LearningLevel | null>(null);
  const [groupSearchQuery, setGroupSearchQuery] = useState("");
  const [lockedLevelNotice, setLockedLevelNotice] = useState<number | null>(null);

  const groupsInfo = useMemo(() => {
    const map = new Map<string, { group: string; levels: Set<number>; semesters: Set<string> }>();
    sheetWords.forEach(w => {
      if (w.group && w.group.trim()) {
        const gName = w.group.trim();
        const existing = map.get(gName) || { group: gName, levels: new Set<number>(), semesters: new Set<string>() };
        if (w.level) existing.levels.add(w.level);
        if (w.semester) existing.semesters.add(w.semester.trim());
        map.set(gName, existing);
      }
    });
    return Array.from(map.values()).map(info => ({
      group: info.group,
      levels: Array.from(info.levels).sort((a,b) => a - b),
      semesters: Array.from(info.semesters)
    }));
  }, [sheetWords]);

  // Word filtration based strictly on completed groups
  const { filteredCompleted: filteredCompletedKeys, filteredSkipped: filteredSkippedKeys } = useMemo(() => {
    return getFilteredCompletedAndSkipped(completedWordKeys, skippedWordKeys, completedGroupsProp || []);
  }, [completedWordKeys, skippedWordKeys, completedGroupsProp]);

  const filteredGroups = useMemo(() => {
    if (!groupSearchQuery.trim()) return [];
    const query = groupSearchQuery.toLowerCase().trim();
    return groupsInfo.filter(info => 
      info.group.toLowerCase().includes(query)
    );
  }, [groupsInfo, groupSearchQuery]);

  // Active Practice/Training States (Minimalist Tech-Style Training Screen)
  const [activeTrainingLevel, setActiveTrainingLevel] = useState<LearningLevel | null>(null);
  const [activeTrainingSemester, setActiveTrainingSemester] = useState<string>("");
  const [activeTrainingGroup, setActiveTrainingGroup] = useState<string>("");
  const [currentWordIndex, setCurrentWordIndex] = useState<number>(0);
  const [activeImageUrl, setActiveImageUrl] = useState<string>("");
  const [isImgLoading, setIsImgLoading] = useState<boolean>(false);
  const [singleInput, setSingleInput] = useState<string>("");
  const [successCount, setSuccessCount] = useState<number>(0);
  const [showTryAgain, setShowTryAgain] = useState<boolean>(false);
  const [spellingFeedback, setSpellingFeedback] = useState<{ type: "success" | "error" | null; msg: string }>({ type: null, msg: "" });
  
  const [isListening, setIsListening] = useState<boolean>(false);
  const [speechStatus, setSpeechStatus] = useState<string>("");
  const [speechText, setSpeechText] = useState<string>("");
  const [speechScore, setSpeechScore] = useState<boolean | null>(null);
  const [incorrectSpeechAttempts, setIncorrectSpeechAttempts] = useState<number>(0);

  const [hasListened, setHasListened] = useState<boolean>(false);
  const [dismissedSpecialBubble, setDismissedSpecialBubble] = useState<boolean>(false);
  const [showCompletionWarning, setShowCompletionWarning] = useState<boolean>(false);

  // Word state tracking for current group training session
  const [sessionSkippedWords, setSessionSkippedWords] = useState<string[]>([]);

  useEffect(() => {
    setSessionSkippedWords([]);
  }, [activeTrainingLevel, activeTrainingSemester, activeTrainingGroup]);

  // --- PROGRESSIVE WEB APP (PWA) AND OFFLINE / ADSTERRA ADVERTISING MANAGEMENT ---
  const [offlineError, setOfflineError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(() => typeof navigator !== "undefined" ? navigator.onLine : true);
  const [installPromptEvent, setInstallPromptEvent] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState<boolean>(false);
  const [showPwaGuideModal, setShowPwaGuideModal] = useState<boolean>(false);
  const [pwaGuideDeviceTab, setPwaGuideDeviceTab] = useState<"android" | "ios">("android");
  const [isInstalling, setIsInstalling] = useState<boolean>(false);
  const [installProgress, setInstallProgress] = useState<number>(0);
  const [installStatusText, setInstallStatusText] = useState<string>("");
  const [showAutoInstallOverlay, setShowAutoInstallOverlay] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.search.includes("install=true")) {
      setShowAutoInstallOverlay(true);
      // Clean up the URL search param so refresh doesn't force pop it, but keep state active
      try {
        const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
        window.history.replaceState({ path: newUrl }, "", newUrl);
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    const handleOnlineStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", handleOnlineStatus);
    window.addEventListener("offline", handleOnlineStatus);
    return () => {
      window.removeEventListener("online", handleOnlineStatus);
      window.removeEventListener("offline", handleOnlineStatus);
    };
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isAlreadyInstalled = localStorage.getItem("stitchlab_pwa_installed") === "true";
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
      if (isAlreadyInstalled || isStandalone) {
        setShowInstallBanner(false);
        return;
      }
    }

    // Check if the event is already stashed on window
    const savedPrompt = (window as any).deferredInstallPrompt;
    if (savedPrompt) {
      setInstallPromptEvent(savedPrompt);
      setShowInstallBanner(true);
    }

    const handleInstallable = (e: any) => {
      const isAlreadyInstalled = localStorage.getItem("stitchlab_pwa_installed") === "true";
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
      if (!isAlreadyInstalled && !isStandalone) {
        setInstallPromptEvent(e.detail || (window as any).deferredInstallPrompt);
        setShowInstallBanner(true);
      }
    };

    window.addEventListener("pwa-installable", handleInstallable);
    return () => window.removeEventListener("pwa-installable", handleInstallable);
  }, []);

  const handleInstallClick = async () => {
    // Check if running inside an iframe
    const isInIframe = typeof window !== "undefined" && window.self !== window.top;
    if (isInIframe) {
      // Open in a new window with ?install=true immediately on click gesture to bypass popup block
      const installUrl = window.location.origin + window.location.pathname + "?install=true";
      window.open(installUrl, "_blank");
      return;
    }

    setIsInstalling(true);
    setInstallProgress(0);
    setInstallStatusText("جاري تهيئة معالج التثبيت الذكي والتحقق من التوافق... 🔍");

    // Retrieve and immediately prompt the native installation dialogue
    let promptEvent = installPromptEvent || (window as any).deferredInstallPrompt || (window as any).deferredPrompt;
    let promptTriggered = false;

    // Wait up to 1.5s for the prompt event to fire if it hasn't yet (useful on redirect load)
    if (!promptEvent) {
      for (let i = 0; i < 15; i++) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        promptEvent = installPromptEvent || (window as any).deferredInstallPrompt || (window as any).deferredPrompt;
        if (promptEvent) {
          break;
        }
      }
    }

    if (promptEvent) {
      try {
        setInstallStatusText("جاري تشغيل نافذة التثبيت الرسمية للمتصفح... ⚡");
        await promptEvent.prompt();
        promptTriggered = true;
        
        const choiceResult = await promptEvent.userChoice;
        console.log(`User installation choice outcome: ${choiceResult.outcome}`);
        
        if (choiceResult.outcome === "accepted") {
          setInstallStatusText("تم قبول الطلب! جاري تنزيل ملفات التطبيق فوريًا (12.8 MB)... ⚡");
          setInstallPromptEvent(null);
          (window as any).deferredInstallPrompt = null;
          (window as any).deferredPrompt = null;
        } else {
          // If user dismissed/cancelled, close the install overlay to not obstruct them
          setIsInstalling(false);
          return;
        }
      } catch (err) {
        console.error("Direct native prompt execution bypassed:", err);
      }
    }

    let progress = 0;
    const interval = setInterval(() => {
      // Extremely responsive progressive download simulation (takes ~1.2 seconds)
      const increment = Math.floor(Math.random() * 14) + 11;
      progress += increment;
      
      if (progress >= 100) {
        progress = 100;
        setInstallProgress(100);
        clearInterval(interval);

        // Always save state in localStorage so the user is marked as installed and the banner is hidden permanently
        try {
          localStorage.setItem("stitchlab_pwa_installed", "true");
        } catch (e) {}

        if (promptTriggered) {
          setInstallStatusText("اكتمل التنزيل والتثبيت التلقائي بنجاح! ستجد StitchLab الآن كأيقونة على شاشتك الرئيسية 🎉📲");
          setShowInstallBanner(false);
          
          // Auto close after 2.5 seconds
          setTimeout(() => {
            setIsInstalling(false);
            setShowAutoInstallOverlay(false);
          }, 2500);
        } else {
          // If native prompt was not triggered (e.g. iOS or unsupported browsers), show guide
          const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
          if (isIOS) {
            setInstallStatusText("تم تجهيز الملفات! اضغط على زر المشاركة السفلي (📤) ثم اختر 'إضافة إلى الشاشة الرئيسية' (Add to Home Screen ➕) للتثبيت الفوري! 📲");
          } else {
            setInstallStatusText("تم تنزيل الحزمة! اضغط على زر الخيارات (⋮) بأعلى المتصفح ثم اختر 'تثبيت التطبيق' (Install App) للتثبيت الفوري كأي تطبيق من المتجر! 📲");
          }
        }
      } else {
        setInstallProgress(progress);
        const downloadedMB = ((progress * 12.8) / 100).toFixed(1);
        if (progress < 25) {
          setInstallStatusText(`جاري التحميل من Uptodown: ${downloadedMB} MB / 12.8 MB ⏳`);
        } else if (progress < 60) {
          setInstallStatusText(`جاري تنزيل ملفات التطبيق فائقة السرعة: ${downloadedMB} MB / 12.8 MB ⚡`);
        } else if (progress < 90) {
          setInstallStatusText(`جاري تهيئة الأكواد وتنزيل الأصول: ${downloadedMB} MB / 12.8 MB 📲`);
        } else {
          setInstallStatusText(`جاري تثبيت StitchLab كلياً وتهيئة الشاشة الرئيسية... 🚀`);
        }
      }
    }, 100);
  };

  const [completedGroupsLocal, setCompletedGroupsLocal] = useState<string[]>(() => {
    const saved = localStorage.getItem("stitchlab_completed_groups");
    try {
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const completedGroups = completedGroupsProp !== undefined ? completedGroupsProp : completedGroupsLocal;
  const [shakingGroupKey, setShakingGroupKey] = useState<string | null>(null);

  // ⚔️ Challenger / Competitor states
  const [opponents, setOpponents] = useState<{ name: string; timestamp: string; opponentLevel: string; wordsCount: number; pointsScored: number }[]>([]);
  const [shareModalOpen, setShareModalOpen] = useState<boolean>(false);
  const [generatedImage, setGeneratedImage] = useState<string>("");
  const [shareUrl, setShareUrl] = useState<string>("");
  const [isGeneratingShare, setIsGeneratingShare] = useState<boolean>(false);

  // Load opponents on mount & listen to acceptance event
  useEffect(() => {
    const loadOpponents = () => {
      try {
        const stored = localStorage.getItem("stitchlab_linked_opponents");
        if (stored) {
          setOpponents(JSON.parse(stored));
        } else {
          setOpponents([]);
        }
      } catch (e) {
        console.warn(e);
      }
    };
    loadOpponents();
    window.addEventListener("stitchlab_challenge_accepted", loadOpponents);
    return () => window.removeEventListener("stitchlab_challenge_accepted", loadOpponents);
  }, []);

  const generateChallengeCard = async () => {
    setIsGeneratingShare(true);
    try {
      const targetElement = document.getElementById("stitchlab-snapshot-results-card");
      if (!targetElement) {
        throw new Error("Target results layout not found");
      }

      // Render with dom-to-image!
      const snapshotB64 = await domtoimage.toPng(targetElement, {
        cacheBust: true,
        style: {
          transform: "scale(1)",
          transformOrigin: "top left"
        }
      });

      const userId = auth.currentUser?.uid || "unknown";
      const studentName = auth.currentUser?.displayName || "طالب مميز";

      // Save this challenge to Firestore challenges/[userId] collection!
      try {
        const docRef = doc(db, "challenges", userId);
        await setDoc(docRef, {
          challengerId: userId,
          challengerName: studentName,
          points: completedWordsCount * 10,
          level: `المستوى ${unlockedLevel}`,
          snapshotB64: snapshotB64,
          createdAt: serverTimestamp()
        });
        console.log("StitchLab Challenge document saved to Firestore successfully!");
      } catch (fError) {
        console.error("Firestore challenge save failed:", fError);
      }

      const redirectLink = `${window.location.origin}/challenge/${encodeURIComponent(userId)}`;
      setGeneratedImage(snapshotB64);
      setShareUrl(redirectLink);
      setShareModalOpen(true);
      setIsGeneratingShare(false);

    } catch (err) {
      console.error("StitchLab dom-to-image screenshot failed:", err);
      setIsGeneratingShare(false);
      alert("⚠️ فشل التقاط واجهة التحدي بواسطة dom-to-image. يرجى المحاولة لاحقاً.");
    }
  };
  
  const setCompletedGroups = (newVal: string[] | ((prev: string[]) => string[])) => {
    if (setCompletedGroupsProp) {
      if (typeof newVal === "function") {
        setCompletedGroupsProp(newVal);
      } else {
        setCompletedGroupsProp(newVal);
      }
    } else {
      if (typeof newVal === "function") {
        setCompletedGroupsLocal(newVal as any);
      } else {
        setCompletedGroupsLocal(newVal);
      }
    }
  };

  const allSortedGroups = useMemo(() => {
    const uniqueCombosMap = new Map<string, { level: number; semester: string; group: string; key: string; earliestIndex: number }>();
    sheetWords.forEach((w, idx) => {
      if (w.level && w.semester && w.group && w.group.trim() && w.semester.trim()) {
        const lvl = w.level;
        const sem = w.semester.trim();
        const grp = w.group.trim();
        const key = `${lvl}_${sem}_${grp}`;
        if (!uniqueCombosMap.has(key)) {
          uniqueCombosMap.set(key, { level: lvl, semester: sem, group: grp, key, earliestIndex: idx });
        }
      }
    });

    const list = Array.from(uniqueCombosMap.values());
    
    // Sort sequence: Order of addition (represented by earliestIndex chronologically)
    list.sort((a, b) => a.earliestIndex - b.earliestIndex);

    return list;
  }, [sheetWords]);

  const isGroupSequenceUnlocked = useCallback((groupKey: string): boolean => {
    const list = allSortedGroups;
    if (list.length === 0) return true;
    
    const index = list.findIndex(g => g.key === groupKey);
    if (index <= 0) {
      return true;
    }
    
    // If the group itself is already completed, it is always unlocked/accessible
    if (completedGroups.includes(groupKey)) {
      return true;
    }

    // Otherwise, it is unlocked only if the immediately previous group is completed
    const prevGroupKey = list[index - 1].key;
    return completedGroups.includes(prevGroupKey);
  }, [allSortedGroups, completedGroups]);

  const [pendingUnlockGroupKey, setPendingUnlockGroupKey] = useState<string | null>(null);
  const [lastAttemptedAction, setLastAttemptedAction] = useState<"extra_time" | "new_group">("extra_time");

  const handlePwaAction = (action: "extra_time" | "new_group", chosenGroupKey?: string) => {
    // Save current action so we can resume automatically as soon as internet returns
    setLastAttemptedAction(action);
    const resolvedGroupKey = chosenGroupKey || allSortedGroups.find(g => !isGroupSequenceUnlocked(g.key))?.key || null;
    if (resolvedGroupKey) {
      setPendingUnlockGroupKey(resolvedGroupKey);
    }

    // 1. Check navigator.onLine for smart internet detection
    if (!navigator.onLine) {
      setOfflineError("عذراً الجهاز غير متصل بالإنترنت. يرجى التحقق من اتصالك بالشبكة لتنزيل وفتح فصول المجموعات الجديدة وإضافة وقت التعلم المكافء! 📡");
      return;
    }

    setOfflineError(null);

    // Apply reward instantly
    if (action === "extra_time") {
      setBonusMinutes(prevBonus => prevBonus + 15);
      alert("🎉 مبارك! تمت إضافة 15 دقيقة إضافية مجاناً لحسابك لمواصلة التعلم.");
    } else {
      if (resolvedGroupKey) {
        onUnlockGroup(resolvedGroupKey);
        alert("🔓 مبارك! تم فتح قفل المجموعة الدراسية بنجاح.");
      } else {
        const firstLocked = allSortedGroups.find(g => !isGroupSequenceUnlocked(g.key));
        if (firstLocked) {
          onUnlockGroup(firstLocked.key);
          alert("🔓 مبارك! تم فتح قفل المجموعة الدراسية بنجاح.");
        }
      }
    }
  };

  // Re-connect trigger: as soon as internet returns, load ad automatically to reward/unlock item!
  useEffect(() => {
    const handleOnline = () => {
      if (offlineError) {
        setOfflineError(null);
        handlePwaAction(lastAttemptedAction, pendingUnlockGroupKey || undefined);
      }
    };
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [offlineError, lastAttemptedAction, pendingUnlockGroupKey]);

  const [sheetLinkInput, setSheetLinkInput] = useState(() => {
    return localStorage.getItem("stitchlab_sheet_link") || "https://docs.google.com/spreadsheets/d/1BtCUNuf34uVEaQS_hPbINw0-ogACWzyKsN426QftNwI/edit?usp=drivesdk";
  });

  const [selectedSemester, setSelectedSemester] = useState<string>("الفصل الدراسي الأول");
  const [modalSemester, setModalSemester] = useState<string>("");
  const [modalGroup, setModalGroup] = useState<string>("");

  const activeStudyWords = useMemo(() => {
    if (!selectedLevel || !modalSemester || !modalGroup) return [];
    return sheetWords.filter(w => 
      w.level === selectedLevel.number && 
      w.semester === modalSemester && 
      w.group === modalGroup
    );
  }, [sheetWords, selectedLevel, modalSemester, modalGroup]);

  const trainingWords = useMemo(() => {
    if (!activeTrainingLevel) return [];
    
    // Attempt filtering by selected semester & group first (from modal configuration)
    let words = sheetWords.filter(w => w.level === activeTrainingLevel.number);
    if (activeTrainingSemester) {
      words = words.filter(w => w.semester === activeTrainingSemester);
    }
    if (activeTrainingGroup) {
      words = words.filter(w => w.group === activeTrainingGroup);
    }
    
    if (words.length > 0) return words;
    
    // First fallback: retrieve any words for this level
    words = sheetWords.filter(w => w.level === activeTrainingLevel.number);
    if (words.length > 0) return words;
    
    // Second fallback: retrieve preset developer sample words
    return DEFAULT_SHEET_WORDS.filter(w => w.level === activeTrainingLevel.number);
  }, [activeTrainingLevel, sheetWords, activeTrainingSemester, activeTrainingGroup]);

  useEffect(() => {
    // When active group/semester/level changes, initialize sessionSkippedWords 
    // with any words of this training group that are already in skippedWordKeys!
    if (activeTrainingLevel && activeTrainingSemester && activeTrainingGroup && trainingWords.length > 0) {
      const activeGroupWords = trainingWords.map(w => w.word.toLowerCase().trim());
      const existingSkipped = (skippedWordKeys || []).filter(skKey => {
        const lowerSk = skKey.toLowerCase().trim();
        return activeGroupWords.includes(lowerSk);
      });
      setSessionSkippedWords(existingSkipped.map(k => k.toLowerCase().trim()));
    } else {
      setSessionSkippedWords([]);
    }
  }, [activeTrainingLevel, activeTrainingSemester, activeTrainingGroup, trainingWords, skippedWordKeys]);

  const filteredUniqueGroups = useMemo(() => {
    if (!groupSearchQuery.trim()) return [];
    const query = groupSearchQuery.toLowerCase().trim();
    return allSortedGroups.filter(item => 
      item.group.toLowerCase().includes(query)
    );
  }, [allSortedGroups, groupSearchQuery]);

  useEffect(() => {
    setSingleInput("");
    setSuccessCount(0);
    setShowTryAgain(false);
    setSpeechText("");
    setSpeechStatus("");
    setSpeechScore(null);
    setIsListening(false);
    setHasListened(false);
    setDismissedSpecialBubble(false);
    setShowCompletionWarning(false);
    setSpellingFeedback({ type: null, msg: "" });
    setIncorrectSpeechAttempts(0);
  }, [currentWordIndex, activeTrainingLevel]);

  // Instantly swap to fully loaded image or smoothly transition to indicate load
  useEffect(() => {
    if (activeTrainingLevel && trainingWords.length > 0) {
      const currentWord = trainingWords[currentWordIndex];
      if (currentWord && currentWord.imageUrl) {
        setIsImgLoading(true);
        const img = new Image();
        img.src = currentWord.imageUrl;
        img.onload = () => {
          setActiveImageUrl(currentWord.imageUrl || "");
          setIsImgLoading(false);
        };
        img.onerror = () => {
          setActiveImageUrl(currentWord.imageUrl || "");
          setIsImgLoading(false);
        };
      } else {
        setActiveImageUrl("");
        setIsImgLoading(false);
      }
    } else {
      setActiveImageUrl("");
      setIsImgLoading(false);
    }
  }, [currentWordIndex, trainingWords, activeTrainingLevel]);

  // Preload the next 2 images in background sequence
  useEffect(() => {
    if (activeTrainingLevel && trainingWords.length > 0) {
      const nextIndex = currentWordIndex + 1;
      if (nextIndex < trainingWords.length) {
        const nextWord = trainingWords[nextIndex];
        if (nextWord && nextWord.imageUrl) {
          const img = new Image();
          img.src = nextWord.imageUrl;
        }
      }
      const nextNextIndex = currentWordIndex + 2;
      if (nextNextIndex < trainingWords.length) {
        const nextNextWord = trainingWords[nextNextIndex];
        if (nextNextWord && nextNextWord.imageUrl) {
          const img = new Image();
          img.src = nextNextWord.imageUrl;
        }
      }
    }
  }, [currentWordIndex, trainingWords, activeTrainingLevel]);

  const uniqueSemestersInModal = useMemo(() => {
    if (!selectedLevel) return [];
    const sems = new Set<string>();
    sheetWords.forEach(w => {
      if (w.level === selectedLevel.number && w.semester) {
        sems.add(w.semester.trim());
      }
    });
    return Array.from(sems);
  }, [sheetWords, selectedLevel]);

  const uniqueGroupsInModal = useMemo(() => {
    if (!selectedLevel || !modalSemester) return [];
    
    // Filter our global allSortedGroups that match this level and semester
    // Since allSortedGroups is already sorted chronologically by addition, filtering it keeps that exact chronological order!
    const filtered = allSortedGroups.filter(g => 
      g.level === selectedLevel.number && 
      g.semester === modalSemester
    );
    
    // Extract the group names in their exact chronological order!
    return filtered.map(g => g.group);
  }, [allSortedGroups, selectedLevel, modalSemester]);

  useEffect(() => {
    setModalGroup("");
  }, [modalSemester, selectedLevel]);

  useEffect(() => {
    if (selectedLevel) {
      const levelSems = uniqueSemestersInModal;
      if (levelSems.length > 0) {
        if (levelSems.includes(selectedSemester)) {
          setModalSemester(selectedSemester);
        } else {
          setModalSemester(levelSems[0]);
        }
      } else {
        setModalSemester("");
      }
    } else {
      setModalSemester("");
    }
  }, [selectedLevel, uniqueSemestersInModal]);

  const [syncLoading, setSyncLoading] = useState(false);
  const [syncError, setSyncError] = useState("");
  const [syncSuccess, setSyncSuccess] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string>("All");

  useEffect(() => {
    // With Static Site Generation (SSG), we do not automatically fetch on client-side mount.
    // The data is pre-compiled at build-time, which guarantees instant loading and saves API quota.
    // The user can still trigger manual fetching at any time via the "Sync" settings button.
  }, []);

  const uniqueSemesters = useMemo(() => {
    const sems = new Set<string>();
    sheetWords.forEach(w => {
      if (w.semester) sems.add(w.semester);
    });
    if (sems.size === 0) {
      sems.add("الفصل الدراسي الأول");
    }
    return Array.from(sems);
  }, [sheetWords]);

  useEffect(() => {
    if (!uniqueSemesters.includes(selectedSemester)) {
      setSelectedSemester(uniqueSemesters[0] || "الفصل الدراسي الأول");
    }
  }, [uniqueSemesters, selectedSemester]);

  useEffect(() => {
    if (reviewTargetWord) {
      const trimmedWord = reviewTargetWord.toLowerCase().trim();
      const found = sheetWords.find(w => w.word.toLowerCase().trim() === trimmedWord);
      if (found) {
        const lvlObj = LEARNING_LEVELS.find(l => l.number === found.level);
        if (lvlObj) {
          setActiveTrainingLevel(lvlObj);
          setActiveTrainingSemester(found.semester);
          setActiveTrainingGroup(found.group || "عادية");

          // Let's filter level words
          let levelWords = sheetWords.filter(w => w.level === found.level);
          if (found.semester) {
            levelWords = levelWords.filter(w => w.semester === found.semester);
          }
          if (found.group) {
            levelWords = levelWords.filter(w => w.group === found.group);
          } else {
            levelWords = levelWords.filter(w => !w.group || w.group === "عادية" || w.group === "");
          }

          const wordIdx = levelWords.findIndex(w => w.word.toLowerCase().trim() === trimmedWord);
          if (wordIdx !== -1) {
            setCurrentWordIndex(wordIdx);
          } else {
            setCurrentWordIndex(0);
          }

          setIncorrectSpeechAttempts(0);
          setShowCompletionWarning(false);
          setSpeechStatus("");
          setSpeechScore(null);
        }
      }
      if (typeof setReviewTargetWord === "function") {
        setReviewTargetWord(null);
      }
    }
  }, [reviewTargetWord, sheetWords, LEARNING_LEVELS, setReviewTargetWord]);

  const semesterWords = useMemo(() => {
    return sheetWords.filter(w => w.semester === selectedSemester);
  }, [sheetWords, selectedSemester]);

  // Real-time group search logic (supports any single word match)
  const groupMatchingWordsResults = useMemo(() => {
    if (!groupSearchQuery.trim()) return [];
    const query = groupSearchQuery.toLowerCase().trim();
    return allSortedGroups.filter(item => item.group.toLowerCase().includes(query));
  }, [allSortedGroups, groupSearchQuery]);

  useEffect(() => {
    setSelectedGroup("All");
  }, [selectedSemester]);

  const handleSyncGoogleSheet = async () => {
    if (!sheetLinkInput.trim()) {
      setSyncError("الرجاء إدخال رابط أو معرف جدول قوقل أولاً.");
      return;
    }

    setSyncLoading(true);
    setSyncError("");
    setSyncSuccess(false);

    try {
      const parsed = await parseGoogleSheet(sheetLinkInput);
      setSheetWords(parsed);
      localStorage.setItem("stitchlab_sheet_words", JSON.stringify(parsed));
      localStorage.setItem("stitchlab_sheet_link", sheetLinkInput.trim());
      localStorage.setItem("stitchlab_sheet_synced_dirkt_v2", "true");
      localStorage.setItem("stitchlab_sheet_last_fetch_time", Date.now().toString());
      setSyncSuccess(true);
      
      setTimeout(() => {
        setSyncSuccess(false);
        setShowConfig(false);
      }, 3000);
    } catch (err: any) {
      console.error(err);
      setSyncError(err.message || "فشلت قراءة ورقة البيانات بسبب مشاكل اتصال أو الصلاحيات.");
    } finally {
      setSyncLoading(false);
    }
  };

  const handleLoadDemoSheet = () => {
    setSheetWords((staticSheetWords && staticSheetWords.length > 0) ? (staticSheetWords as SheetWord[]) : DEFAULT_SHEET_WORDS);
    localStorage.removeItem("stitchlab_sheet_words");
    localStorage.removeItem("stitchlab_sheet_link");
    setSheetLinkInput("");
    setSyncSuccess(true);
    setSyncError("");
    setTimeout(() => {
      setSyncSuccess(false);
      setShowConfig(false);
    }, 2000);
  };

  if (activeTrainingLevel && trainingWords.length > 0) {
    const currentWord = trainingWords[currentWordIndex];
    const isSpecialWord = ["am", "is", "are", "was", "were", "have", "has"].includes(currentWord.word.toLowerCase().trim());
    const isListeningDone = hasListened;
    const isSpellingDone = successCount >= 3;
    const isSpeakingDone = speechScore === true;
    const isCurrentWordFullyCompleted = isListeningDone && isSpellingDone && isSpeakingDone;

    const handlePrevWord = () => {
      if (currentWordIndex > 0) {
        setCurrentWordIndex(prev => prev - 1);
      }
    };

    const handleSkipWord = () => {
      // Mark as skipped in session skipped list!
      const wKey = currentWord.word.toLowerCase().trim();
      
      const nextSessionSkipped = sessionSkippedWords.includes(wKey)
        ? sessionSkippedWords
        : [...sessionSkippedWords, wKey];
      setSessionSkippedWords(nextSessionSkipped);

      // Add immediately to global skippedWordKeys to sync to settings/clouds instantly
      let updatedSkippedGlobal = [...skippedWordKeys];
      if (!updatedSkippedGlobal.includes(wKey)) {
        updatedSkippedGlobal.push(wKey);
        if (setSkippedWordKeys) {
          setSkippedWordKeys(updatedSkippedGlobal);
        }
        localStorage.setItem("stitchlab_skipped_word_keys", JSON.stringify(updatedSkippedGlobal));
      }

      // Remove from completed
      let updatedCompleted = [...completedWordKeys];
      if (updatedCompleted.includes(wKey)) {
        updatedCompleted = updatedCompleted.filter(k => k !== wKey);
        if (setCompletedWordKeys) {
          setCompletedWordKeys(updatedCompleted);
        }
        localStorage.setItem("stitchlab_completed_word_keys", JSON.stringify(updatedCompleted));
        if (setCompletedWordsCount) {
          setCompletedWordsCount(updatedCompleted.length);
        }
      }

      // 1. Deduct 10 points for skipping
      if (setPoints) {
        setPoints(prev => Math.max(0, prev - 10));
      } else {
        try {
          const currentPts = parseInt(localStorage.getItem("stitchlab_points") || "0", 10);
          localStorage.setItem("stitchlab_points", Math.max(0, currentPts - 10).toString());
        } catch (e) {}
      }

      // Reset incorrect speech attempts counter
      setIncorrectSpeechAttempts(0);
      setShowCompletionWarning(false);

      // 2. Go to the next word or handle completing the group/level
      if (currentWordIndex < trainingWords.length - 1) {
        setCurrentWordIndex(prev => prev + 1);
        if (onForceSaveProgress) {
          onForceSaveProgress({ 
            completedWordsCount: updatedCompleted.length,
            completedWordKeys: updatedCompleted,
            skippedWordKeys: updatedSkippedGlobal
          });
        }
      } else {
        // Complete the group
        const groupKey = `${activeTrainingLevel.number}_${activeTrainingSemester}_${activeTrainingGroup}`;
        const newCompleted = [...completedGroups];
        let newCompletedWordsCount = updatedCompleted.length;
        
        let finalSkipped = [...updatedSkippedGlobal];
        // Now that the group is fully complete, register all skipped words of this session as uncompleted
        nextSessionSkipped.forEach(skKey => {
          if (!finalSkipped.includes(skKey) && !updatedCompleted.includes(skKey)) {
            finalSkipped.push(skKey);
          }
        });

        if (setSkippedWordKeys) {
          setSkippedWordKeys(finalSkipped);
        }
        localStorage.setItem("stitchlab_skipped_word_keys", JSON.stringify(finalSkipped));

        if (!newCompleted.includes(groupKey)) {
          newCompleted.push(groupKey);
          setCompletedGroups(newCompleted);
          localStorage.setItem("stitchlab_completed_groups", JSON.stringify(newCompleted));
          
          if (setCompletedWordsCount) {
            setCompletedWordsCount(newCompletedWordsCount);
          }

          if (onUnlockGroup) {
            onUnlockGroup(groupKey);
          }
        }

        const currentLevelNumber = activeTrainingLevel.number;
        const groupsInCurrentLevel = allSortedGroups.filter(g => g.level === currentLevelNumber);
        const currentGroupIndex = groupsInCurrentLevel.findIndex(g => g.key === groupKey);

        const nextGroup = groupsInCurrentLevel[currentGroupIndex + 1];

        if (nextGroup) {
          // Transition directly to the next group
          setActiveTrainingSemester(nextGroup.semester);
          setActiveTrainingGroup(nextGroup.group);
          setCurrentWordIndex(0);
          
          if (onForceSaveProgress) {
            onForceSaveProgress({
              completedGroups: newCompleted,
              completedWordsCount: newCompletedWordsCount,
              completedWordKeys: updatedCompleted,
              skippedWordKeys: finalSkipped
            });
          }
        } else {
          // Finished all semesters in this level (Level Completed)
          onLevelComplete(currentLevelNumber);
          
          const nextLevelNumber = currentLevelNumber + 1;
          const nextLevelObj = LEARNING_LEVELS.find(l => l.number === nextLevelNumber);
          
          const nextCompletedLevels = [...completedLevels];
          if (!nextCompletedLevels.includes(currentLevelNumber)) {
            nextCompletedLevels.push(currentLevelNumber);
          }
          const nextUnlockedLevel = Math.min(9, currentLevelNumber + 1);

          if (onForceSaveProgress) {
            onForceSaveProgress({
              completedGroups: newCompleted,
              completedWordsCount: newCompletedWordsCount,
              completedLevels: nextCompletedLevels,
              unlockedLevel: nextUnlockedLevel,
              completedWordKeys: updatedCompleted,
              skippedWordKeys: finalSkipped
            });
          }

          if (nextLevelObj) {
            const groupsInNextLevel = allSortedGroups.filter(g => g.level === nextLevelNumber);
            const firstGroupOfNextLevel = groupsInNextLevel[0];
            
            if (firstGroupOfNextLevel) {
              setActiveTrainingLevel(nextLevelObj);
              setActiveTrainingSemester(firstGroupOfNextLevel.semester);
              setActiveTrainingGroup(firstGroupOfNextLevel.group);
              setCurrentWordIndex(0);
            } else {
              setActiveTrainingLevel(null);
            }
          } else {
            setActiveTrainingLevel(null);
          }
        }
      }
    };

    const handleNextWord = () => {
      const isWordDone = successCount >= 3 && hasListened && speechScore === true;
      if (!isWordDone) {
        setShowCompletionWarning(true);
        return;
      }

      setShowCompletionWarning(false);

      // Mark as completed!
      const wKey = currentWord.word.toLowerCase().trim();
      let updatedCompleted = [...completedWordKeys];
      if (!updatedCompleted.includes(wKey)) {
        updatedCompleted.push(wKey);
        if (setCompletedWordKeys) {
          setCompletedWordKeys(updatedCompleted);
        }
        localStorage.setItem("stitchlab_completed_word_keys", JSON.stringify(updatedCompleted));
        if (setCompletedWordsCount) {
          setCompletedWordsCount(updatedCompleted.length);
        }
      }
      // Remove from skipped
      let updatedSkipped = [...skippedWordKeys];
      if (updatedSkipped.includes(wKey)) {
        updatedSkipped = updatedSkipped.filter(k => k !== wKey);
        if (setSkippedWordKeys) {
          setSkippedWordKeys(updatedSkipped);
        }
        localStorage.setItem("stitchlab_skipped_word_keys", JSON.stringify(updatedSkipped));
      }

      // Trigger Confetti immediately for user engagement
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.7 }
        });
      } catch (confError) {
        console.warn("Confetti execution omitted:", confError);
      }

      if (currentWordIndex < trainingWords.length - 1) {
        setCurrentWordIndex(prev => prev + 1);
        if (onForceSaveProgress) {
          onForceSaveProgress({ 
            completedWordsCount: updatedCompleted.length,
            completedWordKeys: updatedCompleted,
            skippedWordKeys: updatedSkipped
          });
        }
      } else {
        // Save completed group key in completed groups!
        const groupKey = `${activeTrainingLevel.number}_${activeTrainingSemester}_${activeTrainingGroup}`;
        const newCompleted = [...completedGroups];
        let newCompletedWordsCount = updatedCompleted.length;
        
        let finalSkipped = [...updatedSkipped];
        // Now that the group is fully complete, register all skipped words of this session as uncompleted
        sessionSkippedWords.forEach(skKey => {
          if (!finalSkipped.includes(skKey) && !updatedCompleted.includes(skKey)) {
            finalSkipped.push(skKey);
          }
        });

        if (setSkippedWordKeys) {
          setSkippedWordKeys(finalSkipped);
        }
        localStorage.setItem("stitchlab_skipped_word_keys", JSON.stringify(finalSkipped));

        if (!newCompleted.includes(groupKey)) {
          newCompleted.push(groupKey);
          setCompletedGroups(newCompleted);
          localStorage.setItem("stitchlab_completed_groups", JSON.stringify(newCompleted));
          
          if (setCompletedWordsCount) {
            setCompletedWordsCount(newCompletedWordsCount);
          }

          // Update total groups count
          if (onUnlockGroup) {
            onUnlockGroup(groupKey);
          }
        }

        // Find current level's groups to navigate or switch
        const currentLevelNumber = activeTrainingLevel.number;
        const groupsInCurrentLevel = allSortedGroups.filter(g => g.level === currentLevelNumber);
        const currentGroupIndex = groupsInCurrentLevel.findIndex(g => g.key === groupKey);

        const nextGroup = groupsInCurrentLevel[currentGroupIndex + 1];

        if (nextGroup) {
          // Transition directly to the next group
          setActiveTrainingSemester(nextGroup.semester);
          setActiveTrainingGroup(nextGroup.group);
          setCurrentWordIndex(0);
          
          if (onForceSaveProgress) {
            onForceSaveProgress({
              completedGroups: newCompleted,
              completedWordsCount: newCompletedWordsCount,
              completedWordKeys: updatedCompleted,
              skippedWordKeys: finalSkipped
            });
          }
        } else {
          // Finished all semesters in this level (Level Completed)
          onLevelComplete(currentLevelNumber);
          
          const nextLevelNumber = currentLevelNumber + 1;
          const nextLevelObj = LEARNING_LEVELS.find(l => l.number === nextLevelNumber);
          
          const nextCompletedLevels = [...completedLevels];
          if (!nextCompletedLevels.includes(currentLevelNumber)) {
            nextCompletedLevels.push(currentLevelNumber);
          }
          const nextUnlockedLevel = Math.min(9, currentLevelNumber + 1);

          if (onForceSaveProgress) {
            onForceSaveProgress({
              completedGroups: newCompleted,
              completedWordsCount: newCompletedWordsCount,
              completedLevels: nextCompletedLevels,
              unlockedLevel: nextUnlockedLevel,
              completedWordKeys: updatedCompleted,
              skippedWordKeys: finalSkipped
            });
          }

          if (nextLevelObj) {
            const groupsInNextLevel = allSortedGroups.filter(g => g.level === nextLevelNumber);
            const firstGroupOfNextLevel = groupsInNextLevel[0];
            
            if (firstGroupOfNextLevel) {
              setActiveTrainingLevel(nextLevelObj);
              setActiveTrainingSemester(firstGroupOfNextLevel.semester);
              setActiveTrainingGroup(firstGroupOfNextLevel.group);
              setCurrentWordIndex(0);
            } else {
              setActiveTrainingLevel(null);
            }
          } else {
            setActiveTrainingLevel(null);
          }
        }
      }
    };

    const handleListenClick = () => {
      setHasListened(true);
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(currentWord.word);
        utterance.lang = "en-GB";
        utterance.rate = 0.82; // slightly slower for better British clarity
        
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          const britishVoices = voices.filter(v => 
            v.lang.toLowerCase().includes("gb") || 
            v.lang.toLowerCase().includes("uk") ||
            v.name.toLowerCase().includes("united kingdom") ||
            v.name.toLowerCase().includes("great britain")
          );
          const candidates = britishVoices.length > 0 ? britishVoices : voices;
          const matchedVoice = candidates.find(v => 
            v.name.toLowerCase().includes("david") || v.name.toLowerCase().includes("male") || v.name.toLowerCase().includes("george") || v.name.toLowerCase().includes("hazel") || v.name.toLowerCase().includes("susan")
          ) || candidates[0];
          if (matchedVoice) {
            utterance.voice = matchedVoice;
          }
        }
        window.speechSynthesis.speak(utterance);
      }
    };

    const handleMicrophoneClick = async () => {
      if (isListening) {
        setIsListening(false);
        return;
      }

      setSpeechStatus("جاري طلب إذن استخدام الميكروفون... 🎙️");

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setSpeechStatus("التعرف الصوتي غير مدعوم في متصفحك حالياً، تم تفعيل تجربة محاكاة التقييم.");
        setTimeout(() => {
          setSpeechText(currentWord.word);
          setSpeechScore(true);
          setSpeechStatus("Great job! 🎉 مستواك ممتاز! النطق صحيح ومطابق (محاكاة) ✓");
          playAudioFeedback(true);
        }, 1200);
        return;
      }

      // Explicitly request microphone permissions using the browser's MediaDevices API to prompt the user
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          // Stop all audio tracks immediately to release the microphone for the web speech recognition API
          stream.getTracks().forEach(track => track.stop());
        }
      } catch (err) {
        console.error("Microphone permission denied or error:", err);
        setSpeechStatus("تم رفض إذن الميكروفون أو لم يتم تفعيله. يرجى تفعيل إذن الميكروفون من إعدادات المتصفح للمتابعة.");
        return;
      }

      try {
        const recognition = new SpeechRecognition();
        recognition.lang = "en-GB"; // Enforce British English dialect input recognition
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
          setIsListening(true);
          setSpeechStatus("جاري الاستماع لنطقك... 🎙️");
          setSpeechScore(null);
        };

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setSpeechText(currentWord.word);
          
          if (isSpeechMatched(currentWord.word, transcript)) {
            setSpeechScore(true);
            setSpeechStatus(`نطق صحيح وممتاز! مستواك رائع. سمعنا: "${currentWord.word}" ✓`);
            playAudioFeedback(true);
          } else {
            setSpeechScore(false);
            setSpeechStatus(`نطق غير صحيح! حاول مرة أخرى. لم نسمع: "${currentWord.word}" ⚠️`);
            playAudioFeedback(false);
            setIncorrectSpeechAttempts(prev => {
              const nextVal = prev + 1;
              console.log("StitchLab debug: speech failure counter = ", nextVal);
              return nextVal;
            });
          }
        };

        recognition.onerror = (e: any) => {
          console.error(e);
          setIsListening(false);
          setSpeechStatus("لم يتم تفعيل الصوت بنجاح، يرجى المحاولة ثانية وتفعيل إذن الميكروفون.");
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognition.start();
      } catch (e) {
        console.error(e);
        setIsListening(false);
        setSpeechStatus("خطأ في تشغيل الميكروفون.");
      }
    };

    return (
      <div className="w-full min-h-screen bg-gradient-to-br from-[#FFF0F3] via-[#FFE3E8] to-[#FFD6DC] text-slate-900 flex flex-col justify-between py-6 px-4 md:px-6 animate-fadeIn" dir="rtl">
        {/* Header toolbar */}
        <div className="max-w-md w-full mx-auto bg-white/95 backdrop-blur-md border border-pink-200/50 rounded-2xl p-2 px-3 flex items-center justify-between mb-4 shadow-[0_4px_20px_rgba(244,63,94,0.05)] transition-all" id="training-header-toolbar">
          <button
            type="button"
            onClick={() => {
              const prev = activeTrainingLevel;
              setActiveTrainingLevel(null);
              setSelectedLevel(prev);
            }}
            className="w-9 h-9 bg-pink-50/50 hover:bg-pink-100 text-slate-700 hover:text-pink-600 border border-pink-100 rounded-xl flex items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95"
            title="رجوع لشاشة الاختيار"
          >
            <ChevronRight className="w-5 h-5 stroke-[2.5]" />
          </button>

          <div className="text-center flex flex-col items-center">
            <span className="text-[10px] text-purple-700 font-extrabold bg-purple-50/85 px-2 py-0.5 rounded-full border border-purple-100/30">
              {activeTrainingGroup}
            </span>
            <span className="text-[11px] text-slate-600 font-bold mt-0.5 font-sans">
              المستوى {activeTrainingLevel?.number} - {activeTrainingSemester}
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-100 rounded-xl px-2.5 py-1.5 text-[10px] font-black text-slate-600 font-mono">
            {currentWordIndex + 1} / {trainingWords.length}
          </div>
        </div>

        {/* 📊 Progress indicator/bar placed at the top of the training screen */}
        <div className="max-w-md w-full mx-auto bg-white/95 backdrop-blur-md border border-pink-100/70 rounded-2xl p-3.5 shadow-[0_6px_25px_rgba(244,63,94,0.03)] select-none mb-1" id="top-progress-indicator-box">
          <div className="flex items-center justify-between text-[11px] font-black text-slate-600 mb-2 font-sans">
            <span className="flex items-center gap-1 text-slate-700">🏆 مؤشر تقدم المجموعة: <span className="text-purple-700">{currentWordIndex + 1} / {trainingWords.length}</span></span>
            <span className="text-pink-600 font-black">{Math.round(((currentWordIndex + 1) / trainingWords.length) * 100)}%</span>
          </div>
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60 p-0.5 relative animate-pulse">
            <div 
              className="h-full bg-gradient-to-r from-purple-500 via-pink-400 to-pink-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${((currentWordIndex + 1) / trainingWords.length) * 100}%` }}
            />
          </div>
          {/* Uncompleted/Skipped words indicator inside the progress container */}
          <div className="flex justify-between items-center mt-2.5 pt-2 border-t border-slate-100 text-[10.5px] font-extrabold text-slate-500">
            <span className="flex items-center gap-1.5">
              <span>⏩ الكلمات التي لم تنجزها (تخطي):</span>
            </span>
            <span className="text-rose-600 font-black font-sans">{sessionSkippedWords.length} كلمة</span>
          </div>
        </div>

        {/* Practice Body Center Grid */}
        <div className="max-w-md w-full mx-auto space-y-5 flex-1 flex flex-col justify-start">
          
          {/* STEP 1: Full-Size Image & Beautiful Arabic Translation */}
          <div className="w-full glass-card p-6 relative overflow-hidden ring-1 ring-pink-100">
            {/* Word image card showing FULL IMAGE without crop restriction */}
            <div className="w-full min-h-[250px] md:min-h-[280px] max-h-[380px] mt-1 bg-white border-2 border-pink-100 rounded-2xl overflow-hidden flex items-center justify-center p-2 shadow-sm relative">
              {isImgLoading && (
                <div className="absolute inset-0 bg-white/75 backdrop-blur-[1px] flex items-center justify-center z-10 transition-all duration-300">
                  <div className="w-8 h-8 border-4 border-pink-100 border-t-pink-500 rounded-full animate-spin"></div>
                </div>
              )}
              {activeImageUrl || currentWord.imageUrl ? (
                <img 
                  src={activeImageUrl || currentWord.imageUrl} 
                  alt={currentWord.word} 
                  referrerPolicy="no-referrer"
                  className={`max-h-[350px] w-full h-auto object-contain rounded-xl select-none transition-all duration-300 ease-out ${
                    isImgLoading ? "opacity-30 scale-95 blur-[1px]" : "opacity-100 scale-100 blur-0"
                  }`}
                />
              ) : (
                <div className="text-center p-6 flex flex-col items-center justify-center">
                  <span className="text-5xl select-none mb-3">📸</span>
                  <span className="text-xs text-slate-400 font-mono tracking-wider mt-1">{currentWord.word.toUpperCase()}</span>
                </div>
              )}
            </div>
            
            {/* Semantic layout (Beautiful Arabic Meaning) */}
            <div className="text-center mt-5 space-y-1.5 w-full">
              <span className="text-[10px] font-black text-rose-400/90 uppercase tracking-widest block font-sans">Definition | التعريف اللغوي 📝</span>
              <div 
                className={`font-extrabold text-slate-800 leading-relaxed tracking-wide antialiased transition-all break-words whitespace-pre-wrap ${
                  (currentWord.definition || currentWord.meaning || "").length > 120 
                    ? "text-sm md:text-base animate-fadeIn" 
                    : (currentWord.definition || currentWord.meaning || "").length > 50 
                      ? "text-base md:text-lg animate-fadeIn" 
                      : "text-xl md:text-2xl animate-fadeIn"
                }`}
                dir="rtl"
              >
                {currentWord.definition || currentWord.meaning}
              </div>
            </div>
          </div>

          {/* STEP 2: Write 3 times using a single input field to track progress sequentially */}
          <div className="w-full glass-card p-6 space-y-4 relative overflow-hidden ring-1 ring-pink-100">
            
            <div className="flex justify-between items-center text-[11px] text-slate-505 font-bold border-b border-pink-100 pb-2.5 mb-1">
              <span className="text-slate-550">اكتب الكلمة بالإنجليزية (3 مرات):</span>
            </div>

            <div className="relative w-full">
              <input
                type="text"
                value={singleInput}
                disabled={successCount >= 3}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const typing = singleInput.trim().toLowerCase();
                    const target = currentWord.word.toLowerCase();
                    if (!typing) return;
                    if (typing === target) {
                      setShowTryAgain(false);
                      setSpellingFeedback({ type: "success", msg: "Great job! 🎉 إجابة صحيحة (أحسنت صنعاً!)" });
                      playAudioFeedback(true);
                      
                      try {
                        confetti({
                          particleCount: 50,
                          spread: 60,
                          origin: { y: 0.8 }
                        });
                      } catch (err) {}

                      setTimeout(() => {
                        setSuccessCount(prev => {
                          const next = prev + 1;
                          return next > 3 ? 3 : next;
                        });
                        setSingleInput("");
                        setSpellingFeedback({ type: null, msg: "" });
                      }, 1200);
                    } else {
                      setShowTryAgain(true);
                      setSpellingFeedback({ type: "error", msg: "Try again! ⚠️ تهجئة غير صحيحة (حاول مجدداً)" });
                      playAudioFeedback(false);
                    }
                  }
                }}
                onChange={(e) => {
                  const val = e.target.value;
                  setSingleInput(val);
                  const typing = val.trim().toLowerCase();
                  const target = currentWord.word.toLowerCase();
                  
                  if (typing === target) {
                    setShowTryAgain(false);
                    setSpellingFeedback({ type: "success", msg: "Great job! 🎉 إجابة صحيحة (أحسنت صنعاً!)" });
                    playAudioFeedback(true);
                    
                    try {
                      confetti({
                        particleCount: 50,
                        spread: 60,
                        origin: { y: 0.8 }
                      });
                    } catch (err) {}

                    setTimeout(() => {
                      setSuccessCount(prev => {
                        const next = prev + 1;
                        return next > 3 ? 3 : next;
                      });
                      setSingleInput("");
                      setSpellingFeedback({ type: null, msg: "" });
                    }, 1200);
                  } else {
                    // Check if this typed text is completely off (not a prefix or doesn't match)
                    if (typing.length > 0 && !target.startsWith(typing)) {
                      if (!showTryAgain) {
                        setShowTryAgain(true);
                        setSpellingFeedback({ type: "error", msg: "Try again! ⚠️ تهجئة غير صحيحة (حاول مجدداً)" });
                        playAudioFeedback(false);
                      }
                    } else {
                      setShowTryAgain(false);
                      setSpellingFeedback({ type: null, msg: "" });
                    }
                  }
                }}
                placeholder={successCount >= 3 ? "تمت الكتابة ٣ مرات بنجاح! 🎉" : "اكتب الكلمة بالإنجليزية هنا..."}
                className={`w-full bg-white/50 text-slate-900 border-2 ${
                  successCount >= 3 
                    ? "border-emerald-500 bg-emerald-50/10 ring-2 ring-emerald-500/10" 
                    : showTryAgain
                      ? "border-rose-400 focus:ring-rose-100 focus:border-rose-500"
                      : "border-slate-200/60 focus:border-pink-500 focus:ring-pink-100"
                } rounded-xl px-4 py-3 text-xs font-mono tracking-wide focus:outline-none transition-all text-left placeholder:text-slate-400 font-bold`}
                dir="ltr"
              />
            </div>

            {spellingFeedback.msg && (
              <p className={`text-xs font-black text-center mt-2.5 px-3 py-1.5 rounded-xl border animate-fadeIn transition-all ${
                spellingFeedback.type === "success"
                  ? "bg-emerald-50 border-emerald-250 text-emerald-700"
                  : "bg-rose-50 border-rose-250 text-rose-650"
              }`}>
                {spellingFeedback.msg}
              </p>
            )}

            {/* Display green circles representing successful writes */}
            <div className="flex justify-center items-center gap-3.5 pt-1">
              {[1, 2, 3].map((num) => {
                const isCompleted = successCount >= num;
                return (
                  <div 
                    key={num} 
                    className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                      isCompleted 
                        ? "bg-emerald-500 border-emerald-600 text-white scale-110 shadow-md shadow-emerald-500/25" 
                        : "bg-white/40 border-slate-200 text-slate-400"
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="w-4 h-4 font-black" />
                    ) : (
                      <span className="text-[10px] font-mono font-bold">{num}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* STEP 3: Pronunciation block (أستمع & انطق الكلمة) as distinct boxes */}
          <div className="w-full glass-card p-6 space-y-4 ring-1 ring-pink-100">
            
            {/* Box 1: أستمع */}
            <div className="bg-white/80 border border-pink-100/50 rounded-2xl p-4 flex items-center justify-between shadow-sm">
              <div className="space-y-0.5">
                <h4 className="text-xs font-extrabold text-slate-800">أستمع للكلمة</h4>
              </div>
              <button
                type="button"
                onClick={handleListenClick}
                className="py-2.5 px-5 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer text-xs font-bold active:scale-[0.96] shadow-md shadow-purple-600/10 hover:shadow-purple-600/20"
              >
                <span>أستمع 🔊</span>
              </button>
            </div>

            {/* Special bubble alert for pronoun linking on helper verbs */}
            {isSpecialWord && !dismissedSpecialBubble && (
              <div className="bg-amber-50 border border-amber-250/90 rounded-2xl p-4 text-right relative text-xs leading-relaxed animate-fadeIn shadow-sm">
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex gap-2 text-amber-900 font-extrabold items-center">
                    <span className="text-sm">🇬🇧</span>
                    <span>تنبيه تدريب النطق باللهجة البريطانية:</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDismissedSpecialBubble(true)}
                    className="text-amber-500 hover:text-amber-800 transition-colors cursor-pointer text-xs px-2 py-1 rounded-lg hover:bg-amber-100 shrink-0 font-black border border-amber-200/50"
                    title="قفل التنبيه"
                  >
                    قفل ✕
                  </button>
                </div>
                <p className="mt-2.5 text-xs font-black text-amber-950 font-sans leading-relaxed">
                  أضف ضمير عند النطق مثل Iam . He is. was is . were are
                </p>
              </div>
            )}

            {/* Box 2: انطق الكلمة */}
            <div className="bg-white/80 border border-pink-100/50 rounded-2xl p-4 flex flex-col gap-3.5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-extrabold text-slate-800">انطق الكلمة</h4>
                </div>
                <button
                  type="button"
                  onClick={handleMicrophoneClick}
                  className={`py-2.5 px-5 rounded-xl transition-all flex items-center justify-center gap-1.5 text-xs font-bold active:scale-[0.96] border ${
                    isListening 
                      ? "border-rose-500 bg-rose-500/10 text-rose-600 animate-pulse" 
                      : "border-pink-300 bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-200"
                  } cursor-pointer`}
                >
                  <Mic className="w-3.5 h-3.5" />
                  <span>انطق الكلمة 🎙️</span>
                </button>
              </div>

              {/* Microphone live feedback assessment message feedback */}
              {speechStatus && (
                <div className={`text-center text-[11px] font-bold p-3 rounded-xl border transition-all ${
                  speechScore === true 
                    ? "border-emerald-250 bg-emerald-50 text-emerald-700" 
                    : speechScore === false 
                      ? "border-rose-250 bg-rose-50/60 text-rose-650 animate-fadeIn" 
                      : "border-pink-100 bg-pink-50/50 text-purple-700"
                } font-sans leading-relaxed`}>
                  <div className="flex justify-center items-center gap-1.5 mb-1">
                    <span className="font-extrabold">{speechScore === true ? "🏆 نطق صحيح وممتاز!" : speechScore === false ? "⚠️ محاولة غير متطابقة" : "🎙️ حالة النطق"}</span>
                  </div>
                  <span>{speechStatus}</span>
                </div>
              )}
            </div>

          </div>

        </div>

        {/* Bottom Modern Elegant Navigation Bar (Prev left, Next right, with Skip in center) */}
        <div className="max-w-md w-full mx-auto flex flex-col gap-2.5 mt-4">
          
          <div className="w-full flex justify-between items-center bg-white border border-pink-100 rounded-2xl p-4 shadow-sm">
            {/* Previous (السابق) — Left Side of row in RTL layout */}
            <button
              type="button"
              onClick={handlePrevWord}
              disabled={currentWordIndex === 0}
              className="py-3 px-5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-850 hover:text-slate-950 text-xs font-bold transition-all cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed flex items-center gap-1 active:scale-[0.97]"
            >
              <ChevronRight className="w-4 h-4" />
              <span>السابق</span>
            </button>

            {/* Skip (تخطي) Button — Centered between Previous and Next */}
            <div className="flex flex-col items-center gap-1 select-none">
              <button
                type="button"
                onClick={handleSkipWord}
                disabled={incorrectSpeechAttempts < 5}
                className={`py-3 px-4 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 active:scale-[0.97] border ${
                  incorrectSpeechAttempts >= 5
                    ? "bg-rose-105 hover:bg-rose-200 text-rose-700 border-rose-300 shadow-sm scale-105 cursor-pointer"
                    : "bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed opacity-50"
                }`}
                title={incorrectSpeechAttempts >= 5 ? "تخطي هذه الكلمة والخصم من النقاط" : "يتفعل بعد 5 محاولات نطق خاطئة"}
              >
                <span>تخطي ⏩ ({sessionSkippedWords.length})</span>
              </button>
              <span className={`text-[9px] font-black ${incorrectSpeechAttempts >= 5 ? "text-rose-600 animate-pulse font-extrabold" : "text-slate-400 font-bold"}`}>
                {incorrectSpeechAttempts} / 5 خطأ
              </span>
            </div>

            {/* Next (التالي) -> Right Side of row in RTL layout */}
            <button
              type="button"
              onClick={handleNextWord}
              className="py-3 px-5 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white rounded-xl text-xs font-extrabold transition-all flex items-center gap-1 shadow-md active:scale-[0.97] cursor-pointer"
            >
              <span>{currentWordIndex === trainingWords.length - 1 ? "المجموعة التالية 🎓" : "التالي"}</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Guidelines hint for completion before moving forward, shown only when student attempts next and is incomplete */}
          {showCompletionWarning && (
            <p className="text-center text-[10.5px] font-black text-rose-600 bg-rose-50/50 border border-rose-200/35 rounded-xl py-2 px-4 max-w-sm mx-auto animate-fadeIn select-none">
              ⚠️ للمتابعة اكمل جميع انواع التدريبات (سماعاً 🔊، كتابةً ✍️، نطقاً 🎙️)
            </p>
          )}
        </div>

      </div>
    );
  }

  return (
    <div className="w-full text-right animate-fadeIn" dir="rtl">

      {/* 🔍 REAL-TIME DYNAMIC GROUP SEARCH BLOCK */}
      <div className="max-w-md mx-auto mb-6 px-3" id="group-search-card">
        <div className="bg-white rounded-[26px] p-5 border border-pink-100 shadow-[0_10px_35px_rgba(236,72,153,0.04)] space-y-4">
          <div className="flex items-center gap-2.5 pb-2 border-b border-pink-50">
            <span className="text-2xl">🔍</span>
            <div className="text-right">
              <h4 className="text-xs font-black text-slate-900">البحث السريع عن المجموعات</h4>
              <p className="text-[10px] text-slate-450 font-bold">حتى لو كتبت كلمة واحدة، ستظهر المجموعات المطابقة فوراً</p>
            </div>
          </div>

          <div className="relative">
            <input
              type="text"
              value={groupSearchQuery}
              onChange={(e) => setGroupSearchQuery(e.target.value)}
              placeholder="ابحث عن اسم المجموعة هنا..."
              className="w-full text-right bg-pink-50/20 hover:bg-pink-50/40 text-slate-850 border border-pink-205 rounded-xl py-3 px-4 text-xs font-bold focus:outline-none focus:border-pink-400 transition-all"
            />
            {groupSearchQuery && (
              <button
                type="button"
                onClick={() => setGroupSearchQuery("")}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 font-black text-xs cursor-pointer p-1"
              >
                ✕
              </button>
            )}
          </div>

          {/* Search Results */}
          {groupSearchQuery.trim() !== "" && (
            <div className="space-y-2 mt-2 animate-fadeIn">
              <div className="flex justify-between items-center text-[10px] text-slate-400 font-black px-1">
                <span>المجموعات المكتشفة ({groupMatchingWordsResults.length})</span>
                {groupMatchingWordsResults.length === 0 && <span>لم نجد أي مـجموعة مطابقة</span>}
              </div>

              <div className="max-h-[220px] overflow-y-auto space-y-2 pr-0.5">
                {groupMatchingWordsResults.map((item) => {
                  const isUnlocked = isGroupSequenceUnlocked(item.key);
                  const isCompleted = completedGroups.includes(item.key);

                  const isShaking = shakingGroupKey === item.key;

                  return (
                    <div 
                      key={item.key} 
                      onClick={() => {
                        if (!isUnlocked) return;
                        const lvlObj = LEARNING_LEVELS.find(l => l.number === item.level);
                        if (lvlObj) {
                          setActiveTrainingLevel(lvlObj);
                          setActiveTrainingSemester(item.semester);
                          setActiveTrainingGroup(item.group);
                          setCurrentWordIndex(0);
                        }
                      }}
                      className={`p-3 rounded-2xl border transition-all duration-200 flex items-center justify-between gap-3 ${
                        isUnlocked 
                          ? "cursor-pointer active:scale-[0.98] hover:bg-purple-200/55 hover:border-purple-300 bg-purple-100/90 border-purple-250 text-purple-950 shadow-xs" 
                          : "bg-slate-50/80 border-slate-150 text-slate-500"
                      } ${
                        isShaking ? "animate-shake border-red-300 bg-red-50/70" : ""
                      }`}
                    >
                      {/* Left Block -> action triggers directly if unlocked or locks display */}
                      <div className="flex items-center gap-2 text-right justify-start w-full">
                        {!isUnlocked ? (
                          <span className="text-slate-400 font-bold text-xs flex items-center gap-1 shrink-0">
                            <Lock className="w-3 h-3 text-slate-400" /> مغلقة
                          </span>
                        ) : (
                          <span className="text-purple-600 font-bold text-[10px] bg-purple-200/60 px-2.5 py-1 rounded-xl shrink-0">
                            دخول 🚀
                          </span>
                        )}
                        
                        <div className="flex flex-col text-right pr-2">
                          <span className="text-xs font-black text-slate-800">{item.group}</span>
                          <span className="text-[9px] text-purple-600 font-bold">المستوى {item.level} • {item.semester}</span>
                        </div>
                      </div>

                      {/* Right side completions info */}
                      <div className="flex items-center gap-1 text-slate-500 text-[10px] font-bold shrink-0">
                        {isCompleted ? (
                          <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full border border-emerald-250">مكتمل ✓</span>
                        ) : isUnlocked ? (
                          <span className="bg-purple-155 text-purple-800 px-2 py-0.5 rounded-full border border-purple-220">غير مكتمل</span>
                        ) : (
                          <span className="bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full border border-slate-200">مغلق</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 📊 ELEGANT VISIBLE METRICS & STATS GRID */}
      <div className="max-w-md mx-auto mb-6 px-3" id="visible-stats-panel">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-3xl border border-purple-100/80 p-4 flex flex-col items-center justify-center text-center shadow-xs">
            <div className="text-3xl mb-1 filter drop-shadow">📝</div>
            <div className="space-y-1.5 w-full">
              <div>
                <span className="block text-[10px] font-black text-slate-400 tracking-wide mb-0.5">الكلمات المنجزة</span>
                <div className="text-sm font-black text-emerald-600 leading-tight">
                  {filteredCompletedKeys.length} كلمة
                </div>
              </div>
              <div className="border-t border-slate-100/80 my-1 w-full"></div>
              <div>
                <span className="block text-[10px] font-black text-slate-400 tracking-wide mb-0.5">الكلمات التي لم تنجزها</span>
                <div className="text-sm font-black text-rose-600 leading-tight">
                  {filteredSkippedKeys.length} كلمة ❌
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-pink-100/80 p-4 flex flex-col items-center justify-center text-center shadow-xs">
            <div className="text-3xl mb-1.5 filter drop-shadow">⭐</div>
            <div className="space-y-0.5">
              <span className="block text-[10px] font-black text-slate-400 tracking-wide">المستوى الحالي</span>
              <div className="text-xl font-black text-slate-900 leading-tight">
                المستوى {unlockedLevel}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-sky-100/95 hover:border-sky-205 transition-all p-4 flex flex-col items-center justify-center text-center select-none">
            <div className="text-3xl mb-1.5 filter drop-shadow">📚</div>
            <div className="space-y-0.5">
              <span className="block text-[10px] font-black text-slate-400 tracking-wide">الفصل الدراسي</span>
              <div className="text-sm font-black text-sky-950 leading-tight">
                {getTodayDateArabic()}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-amber-100/80 p-4 flex flex-col items-center justify-center text-center shadow-xs">
            <div className="space-y-0.5">
              <span className="block text-[10px] font-black text-slate-400 tracking-wide">مجموع المجموعات</span>
              <div className="text-xl font-black text-slate-900 leading-tight">
                {(completedGroups || []).length || 0} مجموعات
              </div>
            </div>
          </div>
        </div>

        {/* Button removed by user request */}
      </div>

      {/* 📸 HIDDEN SNAPSHOT TARGET FOR DOM-TO-IMAGE */}
      <div 
        id="stitchlab-snapshot-results-card" 
        className="fixed top-0 left-[-9999px] w-[500px] p-6 bg-gradient-to-br from-[#120f2e] via-[#1a123a] to-[#25153a] border-4 border-purple-500 rounded-[32px] text-white space-y-6 select-none shadow-2xl"
        dir="rtl"
      >
        <div className="flex flex-col items-center justify-center gap-1.5 border-b border-white/10 pb-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-white/10 p-1 flex items-center justify-center shadow-lg">
            <img 
              src="https://raw.githubusercontent.com/stitchlab1/stitchlab2/0ceec11a5ca77c5d4607a90cab424bc9ec880155/stitchlab_icon_hd.png" 
              alt="StitchLab" 
              className="w-12 h-12 object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <h2 className="text-lg font-black text-amber-300 mt-1">StitchLab 🔮</h2>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/5 rounded-2xl border border-white/10 p-4 text-center space-y-1">
            <span className="text-[10px] font-bold text-purple-300">الكلمات المنجزة 📝</span>
            <div className="text-sm font-black text-emerald-400 font-sans">{filteredCompletedKeys.length} كلمة</div>
            <div className="border-t border-white/10 my-1"></div>
            <span className="text-[10px] font-bold text-purple-300">الكلمات التي لم تنجزها ⏳</span>
            <div className="text-sm font-black text-rose-400 font-sans">{filteredSkippedKeys.length} كلمة</div>
          </div>
          <div className="bg-white/5 rounded-2xl border border-white/10 p-4 text-center space-y-1">
            <span className="text-[10px] font-bold text-purple-300">المستوى الحالي ⭐</span>
            <div className="text-2xl font-black text-cyan-300 font-sans">المستوى {unlockedLevel}</div>
          </div>
          <div className="bg-white/5 rounded-2xl border border-white/10 p-4 text-center space-y-1">
            <span className="text-[10px] font-bold text-purple-300">الفصل الدراسي 📚</span>
            <div className="text-xs font-black text-white leading-tight mt-1 truncate">{studentSemester || "الفصل الدراسي الأول"}</div>
          </div>
          <div className="bg-white/5 rounded-2xl border border-white/10 p-4 text-center space-y-1">
            <span className="text-[10px] font-bold text-purple-300">مجموع المجموعات</span>
            <div className="text-xl font-black text-pink-300 font-sans">{(completedGroups || []).length || 0} مجموعات</div>
          </div>
        </div>
      </div>

      {/* 🔮 GORGEOUS CANVAS SHARE INTERACTIVE POPUP */}
      {shareModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-55 flex items-center justify-center p-4 text-slate-900" dir="rtl">
          <div className="bg-white rounded-[32px] border border-pink-100 shadow-2xl max-w-md w-full p-6 md:p-8 space-y-5 relative overflow-hidden text-right animate-fadeIn">
            
            <button
              type="button"
              onClick={() => setShareModalOpen(false)}
              className="absolute top-4 left-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full cursor-pointer transition-colors font-bold text-sm"
            >
              ✕
            </button>

            <div className="text-center space-y-1.5 pb-2">
              <span className="text-3xl">✨🏆</span>
              <h3 className="text-base font-black text-purple-950">بطاقة التحدي والمشاركة جاهزة!</h3>
              <p className="text-xs text-slate-500 font-bold">
                قم بمشاركة الصورة ورابط التحدي مع أصدقائك لبدء المبارزة فوراً
              </p>
            </div>

            {/* Generated Canvas Image Preview Option */}
            <div className="border border-purple-100 rounded-2xl overflow-hidden shadow-sm bg-slate-50">
              <img 
                src={generatedImage} 
                alt="StitchLab Challenge Card" 
                className="w-full h-auto object-cover max-h-[220px]"
              />
            </div>

            {/* Action options */}
            <div className="grid grid-cols-2 gap-3 pb-3">
              <button
                type="button"
                onClick={async () => {
                  const encouragingText = `🔥 لقد تحديتك في StitchLab! انضم إليّ الآن لنتعلم معاً ونرى من يتجاوز مراحل أكثر ويحصد المركز الأول! 🏆✨\n\nالموقع الرسمي للتطبيق:\nhttps://stitchlab2.vercel.app/\n\nرابط مبارزتي المباشرة:\n${shareUrl}`;

                  try {
                    if (navigator.share) {
                      let fileToShare: File | null = null;
                      try {
                        const response = await fetch(generatedImage);
                        const blob = await response.blob();
                        fileToShare = new File([blob], "stitchlab_challenge.png", { type: "image/png" });
                      } catch (errFile) {
                        console.warn("Could not prepare file for sharing:", errFile);
                      }

                      // Attempt sharing with file if supported
                      if (fileToShare && navigator.canShare && navigator.canShare({ files: [fileToShare] })) {
                        await navigator.share({
                          files: [fileToShare],
                          title: "تحدي StitchLab التعليمي ⚔️",
                          text: encouragingText
                        });
                      } else {
                        await navigator.share({
                          title: "تحدي StitchLab التعليمي ⚔️",
                          text: encouragingText,
                          url: "https://stitchlab2.vercel.app/"
                        });
                      }
                      return;
                    }
                  } catch (e) {
                    console.warn("Native share failed, attempting fallback:", e);
                  }

                  // Default Fallback: Open WhatsApp with the pre-filled encouraging text
                  try {
                    const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(encouragingText)}`;
                    window.open(waUrl, "_blank", "noopener,noreferrer");
                  } catch (fallbackErr) {
                    // Final backup: copy share URL to clipboard
                    try {
                      await navigator.clipboard.writeText(shareUrl);
                      alert("📋 تم نسخ رابط تحدي StitchLab المباشر بنجاح! شاركه الآن مع أصدقائك عبر أي تطبيق محادثة. 💬✨");
                    } catch (err) {
                      alert(`احصل على رابط التحدي الخاص بك:\n${shareUrl}`);
                    }
                  }
                }}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white text-xs font-black py-3 px-4 rounded-xl cursor-pointer shadow-md transition-colors text-center font-sans"
              >
                مشاركة وتحدي 📤
              </button>

              <a
                href={generatedImage}
                download="stitchlab_challenge.png"
                onClick={() => {
                  // copy automatically
                  try {
                    navigator.clipboard.writeText(shareUrl);
                  } catch (e) {}
                }}
                className="w-full bg-pink-500 hover:bg-pink-600 text-white text-xs font-black py-3 px-4 rounded-xl cursor-pointer shadow-md transition-colors text-center block font-sans"
              >
                تحميل الصورة 💾
              </a>
            </div>

            <div className="bg-purple-50/50 p-3 rounded-xl border border-purple-100/30 text-right space-y-1.5 select-all">
              <span className="block text-[10px] font-black text-purple-700">رابط الدعوة المباشر الخاص بك:</span>
              <div className="bg-white px-2 py-1.5 rounded border border-purple-100 text-[10px] font-mono text-purple-950 overflow-x-auto whitespace-nowrap scrollbar-thin">
                {shareUrl}
              </div>
            </div>

            <div className="text-[10px] text-center text-slate-400 font-bold">
              💡 نصيحة: عند تحميل الصورة، يتم نسخ رابط دعوة التحدي تلقائياً!
            </div>

          </div>
        </div>
      )}

      {/* Main Road Map Tablet Frame with elegant modern sapphire blue & white styling and clean borders */}
      <div className="bg-white rounded-[36px] shadow-[0_25px_60px_rgba(236,72,153,0.06),0_1px_3px_rgba(0,0,0,0.02)] border border-pink-100/40 p-6 max-w-md mx-auto relative overflow-hidden">
        
        {/* Absolute settings icon to keep UI perfectly clean but still functional for configs (admin only) */}
        {typeof window !== "undefined" && window.location.search.includes("admin=true") && (
          <button
            type="button"
            onClick={() => setShowConfig(true)}
            className="absolute top-4 left-4 p-1.5 rounded-full text-slate-400 hover:text-purple-600 hover:bg-slate-150 transition-all cursor-pointer z-20"
            title="إعدادات ورقة قوقل"
          >
            <FileSpreadsheet className="w-4 h-4" />
          </button>
        )}

        {/* Beautiful motivational heading above the grid */}
        <div className="text-center mb-2 mt-2 select-none">
          <span className="text-[13px] font-black text-purple-700 bg-pink-50/50 border border-pink-100/40 px-5 py-2 rounded-full inline-block tracking-wide shadow-sm">
            هيا نتعلم لنبني المستقبل ✨
          </span>
        </div>

        {/* Dynamic interactive notice box when clicking buttons */}
        <div className="h-11 my-2 flex items-center justify-center text-center">
          {lockedLevelNotice ? (
            <div className="bg-amber-50 border border-amber-200 text-amber-805 text-[11px] font-black px-4 py-1.5 rounded-2xl flex items-center gap-1.5 shadow-sm animate-bounce">
              <span>⚠️ عذراً! المستوى {lockedLevelNotice} مقفل حالياً. أكمل المستوى {lockedLevelNotice - 1} أولاً لفتحه! 🔒</span>
            </div>
          ) : (
            <div className="text-[11px] text-slate-500 font-bold bg-slate-50 border border-slate-100 px-4 py-1.5 rounded-2xl">
              🎯 اضغط على أرقام المستويات في المسار لبدء التحدي والتعلم
            </div>
          )}
        </div>

        {/* 3x3 Levels Grid Container - Sleek premium matte gray flat panel */}
        <div className="aspect-square w-full max-w-[340px] mx-auto bg-slate-200/60 border border-slate-300 rounded-[30px] p-5.5 grid grid-cols-3 gap-4.5 relative shadow-inner shadow-slate-300/30">
          {LEARNING_LEVELS.map((level) => {
            const isUnlocked = level.number <= unlockedLevel;
            const isCompleted = completedLevels.includes(level.number);
            
            let btnStyle = "";
            if (isUnlocked) {
              if (isCompleted) {
                // Highly elegant circular glass design for completed buttons (soft glass with green check dot)
                btnStyle = "bg-white/45 backdrop-blur-md border border-white/70 text-slate-800 shadow-[0_8px_32px_0_rgba(15,23,42,0.06)] cursor-pointer hover:bg-white/60 active:scale-95 hover:scale-105 transition-all duration-150";
              } else {
                // Highly elegant circular glass design for active buttons (ambient mauve/pink soft glass)
                btnStyle = "bg-pink-500/25 backdrop-blur-md border border-pink-400/65 text-purple-900 shadow-[0_8px_32px_0_rgba(236,72,153,0.12)] cursor-pointer hover:bg-pink-500/35 active:scale-95 hover:scale-105 transition-all duration-150 font-black";
              }
            } else {
              // Highly elegant circular glass design for locked buttons (soft blurred glassy lock card with lock symbol)
              btnStyle = "bg-slate-100/60 backdrop-blur-sm border border-slate-250 text-slate-450 shadow-sm hover:border-slate-300 hover:bg-slate-250/50 transition-all duration-150 active:scale-95";
            }

            return (
              <button
                key={level.number}
                type="button"
                onClick={() => {
                  if (isUnlocked) {
                    setSelectedLevel(level);
                  } else {
                    // Trigger the interactive locked level warning message
                    setLockedLevelNotice(level.number);
                    // Clear after 3 seconds
                    setTimeout(() => {
                      setLockedLevelNotice(prev => prev === level.number ? null : prev);
                    }, 3000);
                  }
                }}
                className={`group relative rounded-full aspect-square w-full flex flex-col items-center justify-center select-none cursor-pointer transition-all duration-150 ${btnStyle}`}
              >
                {/* Level Big Number */}
                <span className={`text-3xl font-extrabold tracking-tight font-sans transition-all ${!isUnlocked ? "opacity-35" : "group-hover:scale-110"}`}>
                  {level.number}
                </span>

                {/* Lock icon representing the level constraint */}
                {!isUnlocked && (
                  <span className="absolute bottom-1.5 bg-amber-50 border border-amber-200 text-amber-600 rounded-full p-1.5 shadow-sm transform scale-90 duration-150 group-hover:scale-110">
                    <Lock className="w-3.5 h-3.5" />
                  </span>
                )}

                {/* Completed Indicator Dot */}
                {isUnlocked && isCompleted && (
                  <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border border-white shadow-sm animate-pulse" />
                )}

                {/* Current Active Indicator */}
                {isUnlocked && !isCompleted && level.number === unlockedLevel && (
                  <span className="absolute top-2.5 right-2.5 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-300 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>



      {/* GOOGLE SHEETS CONFIG MODAL */}
      {showConfig && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl w-full max-w-sm border border-slate-200 shadow-2xl overflow-hidden text-right leading-relaxed" dir="rtl">
            <div className="p-5 text-white bg-slate-900 flex justify-between items-center gap-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-white" />
                <h3 className="text-sm font-black">ربط المصادر الخارجية 📊</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowConfig(false)}
                className="w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed font-semibold">
                اربط ملف قوقل شيت وسحب الكلمات والروابط بشكل فوري. يرجى تهيئة الملف كـ "عام للجميع كـ عارض" للوصول السلس.
              </p>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-600 block">رابط أو رمز الورقة (URL / ID):</label>
                <input
                  type="text"
                  value={sheetLinkInput}
                  onChange={(e) => setSheetLinkInput(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  className="w-full bg-slate-50 text-slate-800 border border-slate-200 rounded-xl p-2.5 text-xs focus:outline-none focus:border-indigo-500"
                  dir="ltr"
                />
              </div>

              {syncError && (
                <span className="text-xs text-rose-500 bg-rose-50/50 p-2.5 rounded-xl block font-bold leading-normal">
                  ⚠️ {syncError}
                </span>
              )}

              {syncSuccess && (
                <span className="text-xs text-emerald-600 bg-emerald-50/10 p-2.5 rounded-xl block font-bold leading-normal">
                  ✓ تم جلب وتعبئة {sheetWords.length} كارت بنجاح!
                </span>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleSyncGoogleSheet}
                  disabled={syncLoading}
                  className="flex-1 py-2.5 rounded-xl text-xs bg-slate-900 hover:bg-slate-800 text-white font-extrabold flex items-center justify-center gap-1 active:scale-95"
                >
                  {syncLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>جاري المعالجة...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      <span>تحديث البيانات 📥</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleLoadDemoSheet}
                  className="px-4 rounded-xl text-xs bg-slate-100 hover:bg-slate-200 text-slate-650 font-bold"
                >
                  الافتراضي
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DETAILED ROADMAP LEVEL CHALLENGE MODAL */}
      {selectedLevel && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn" dir="rtl">
          <div className="bg-white rounded-[28px] w-full max-w-sm border border-pink-100 shadow-2xl overflow-hidden text-right leading-relaxed">
            
            {/* Modal Header */}
            <div className="p-5 px-6 border-b border-pink-50 flex justify-between items-center bg-white">
              <h3 className="text-sm font-black text-purple-900">اختر التفاصيل للمستوى {selectedLevel.number}</h3>
              <button
                type="button"
                onClick={() => setSelectedLevel(null)}
                className="w-8 h-8 rounded-full bg-pink-50/50 hover:bg-pink-100 text-pink-500 hover:text-purple-750 flex items-center justify-center transition-all border border-pink-100/30 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 bg-gradient-to-b from-white to-pink-50/10">
              
              <div className="space-y-4">
                {/* Semester Option */}
                <div className="space-y-1.5 text-right">
                  <label className="text-[11px] font-bold text-purple-700 block">
                    الفصل الدراسي
                  </label>
                  <select
                    value={modalSemester}
                    onChange={(e) => {
                      const val = e.target.value;
                      setModalSemester(val);
                      setModalGroup("");
                    }}
                    className="w-full bg-white text-xs font-bold text-slate-800 border border-slate-200/80 rounded-xl p-3 focus:outline-none focus:border-purple-500 cursor-pointer text-right shadow-sm hover:bg-slate-50/50 transition-all font-sans"
                  >
                    <option value="">-- اختر الفصل الدراسي --</option>
                    {uniqueSemestersInModal.map(sem => (
                      <option key={sem} value={sem}>{sem}</option>
                    ))}
                  </select>
                </div>

                {/* Group Option as Interactive Card-Buttons Grid */}
                <div className="space-y-2 text-right">
                  <label className="text-[11px] font-black text-purple-900 block">
                    اختر المجموعة للتعلم والتدريب
                  </label>
                  {!modalSemester ? (
                    <div className="text-center p-4 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-[11px] text-slate-400 font-bold">
                      ⚠️ يرجى اختيار الفصل الدراسي لعرض المجموعات
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1" id="modal-groups-scroll-container">
                      {uniqueGroupsInModal.map((grp, idx) => {
                        const groupKey = `${selectedLevel.number}_${modalSemester}_${grp}`;
                        const isUnlocked = isGroupSequenceUnlocked(groupKey);
                        const isCompleted = completedGroups.includes(groupKey);
                        
                        // Student's active group is the first unlocked group that is NOT completed (or falls back to matching first unlocked)
                        const isActiveFrontier = isUnlocked && !isCompleted && 
                          uniqueGroupsInModal.findIndex(g => {
                            const gk = `${selectedLevel.number}_${modalSemester}_${g}`;
                            return isGroupSequenceUnlocked(gk) && !completedGroups.includes(gk);
                          }) === idx;

                        const isShaking = shakingGroupKey === groupKey;

                        return (
                          <button
                            key={grp}
                            type="button"
                            onClick={() => {
                              if (!isUnlocked) {
                                setShakingGroupKey(groupKey);
                                setTimeout(() => setShakingGroupKey(null), 350);
                                return;
                              }
                              setModalGroup(grp);
                              setActiveTrainingLevel(selectedLevel);
                              setActiveTrainingSemester(modalSemester);
                              setActiveTrainingGroup(grp);
                              setCurrentWordIndex(0);
                              setSelectedLevel(null);
                            }}
                            className={`w-full text-right p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 relative ${
                              isShaking 
                                ? "animate-shake border-red-400 bg-red-50/70 text-red-950" 
                                : isActiveFrontier
                                ? "bg-pink-100 border-pink-400 shadow-[0_0_12px_rgba(236,72,153,0.25)] ring-2 ring-pink-400 ring-offset-1 text-pink-950 hover:bg-pink-200/40"
                                : isCompleted
                                ? "bg-emerald-50/80 border-emerald-200 text-emerald-800 hover:bg-emerald-100/50"
                                : isUnlocked
                                ? "bg-purple-100 border-purple-300 hover:bg-purple-200/50 text-purple-950"
                                : "bg-slate-50/70 border-slate-200/60 text-slate-400 opacity-70 cursor-not-allowed"
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-sm">
                                {isCompleted ? (
                                  <span className="text-sm text-emerald-500 font-bold">✅</span>
                                ) : isActiveFrontier ? (
                                  <span className="text-base text-pink-600 font-extrabold animate-bounce inline-block transform -rotate-12 filter drop-shadow">🔓</span>
                                ) : isUnlocked ? (
                                  <span className="text-base text-purple-600 font-semibold inline-block transform -rotate-12 filter drop-shadow">🔓</span>
                                ) : (
                                  <span className="text-sm text-slate-400 inline-block">🔒</span>
                                )}
                              </span>
                              <div className="flex flex-col text-right">
                                <span className={`text-xs font-black ${isActiveFrontier ? "text-pink-950" : isUnlocked ? "text-purple-950" : ""}`}>
                                  {grp}
                                </span>
                                {isActiveFrontier && (
                                  <span className="text-[9px] text-pink-600 font-extrabold animate-pulse flex items-center gap-1 mt-0.5">
                                    <span>●</span> المجموعة الجديدة النشطة
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {isCompleted ? (
                                <span className="text-[9px] bg-emerald-100 text-emerald-800 font-black px-2 py-0.5 rounded-full border border-emerald-200">جاهز ✓</span>
                              ) : isActiveFrontier ? (
                                <span className="text-[9px] bg-pink-200 text-pink-800 font-black px-2 py-0.5 rounded-full border border-pink-300">الجديدة 🔓</span>
                              ) : isUnlocked ? (
                                <span className="text-[9px] bg-purple-200 text-purple-800 font-black px-2 py-0.5 rounded-full border border-purple-300">مفتوحة 🔓</span>
                              ) : (
                                <span className="text-[9px] bg-slate-100 text-slate-400 font-black px-2 py-0.5 rounded-full border border-slate-200">
                                  🔒 مغلقة
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Back to Home button */}
              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedLevel(null)}
                  className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-xl text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-[0.98]"
                >
                  <span>الرجوع للرئيسية ↩️</span>
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* AUTO INSTALL OVERLAY FOR INSTANT LAUNCH OUTSIDE IFRAME */}
      {showAutoInstallOverlay && !isInstalling && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4 z-[99]" dir="rtl">
          <div className="bg-white border border-pink-100 rounded-[36px] w-full max-w-sm p-6 text-center space-y-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-pink-500/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                <div className="absolute -inset-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-[32px] opacity-30 blur animate-pulse"></div>
                <div className="w-20 h-20 bg-white rounded-[28px] flex items-center justify-center p-3 shadow-lg relative z-10 border border-pink-100">
                  <img 
                    src="https://raw.githubusercontent.com/stitchlab1/stitchlab2/0ceec11a5ca77c5d4607a90cab424bc9ec880155/stitchlab_icon_hd.png" 
                    alt="StitchLab Logo" 
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>
              <div>
                <h3 className="text-base font-black text-slate-950">تثبيت StitchLab فوريًا 📥</h3>
                <p className="text-xs text-slate-500 font-bold mt-1">جاهز الآن للتحميل المباشر كأي تطبيق أصلي على جهازك</p>
              </div>
            </div>

            <div className="bg-purple-50 border border-purple-100/60 p-4 rounded-2xl text-xs text-purple-950 font-bold leading-relaxed space-y-1">
              <p>⚡ انقر على الزر أدناه ليقوم متصفح Chrome بتثبيت التطبيق تلقائياً وبلمحة بصر دون الحاجة للبحث في القوائم!</p>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={handleInstallClick}
                className="w-full py-4 bg-gradient-to-r from-purple-600 via-pink-500 to-purple-700 hover:from-purple-700 hover:to-pink-600 text-white font-black rounded-2xl text-xs transition-all shadow-lg active:scale-95 cursor-pointer animate-bounce text-center block"
              >
                تثبيت التطبيق فوراً الآن ⚡📲
              </button>
              
              <button
                type="button"
                onClick={() => setShowAutoInstallOverlay(false)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold rounded-xl text-[11px] transition-all cursor-pointer text-center block"
              >
                تخطي والدخول للتطبيق ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* NATIVE-LIKE GOOGLE PLAY / UPTODOWN INSTALLATION PROGRESS MODAL */}
      {isInstalling && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-[90] animate-fadeIn" dir="rtl">
          <div className="bg-white border border-pink-100 rounded-[36px] w-full max-w-sm p-6 text-center space-y-6 shadow-2xl relative overflow-hidden">
            {/* Ambient glows */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-pink-500/10 rounded-full blur-3xl pointer-events-none"></div>

            {/* Header / Logo Section */}
            <div className="flex flex-col items-center space-y-3">
              <div className="relative">
                {/* Circular pulsing borders */}
                <div className="absolute -inset-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-[28px] opacity-25 blur animate-pulse"></div>
                <div className="w-16 h-16 bg-white rounded-[24px] flex items-center justify-center p-2.5 shadow-md relative z-10 border border-pink-100">
                  <img 
                    src="https://raw.githubusercontent.com/stitchlab1/stitchlab2/0ceec11a5ca77c5d4607a90cab424bc9ec880155/stitchlab_icon_hd.png" 
                    alt="StitchLab Logo" 
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>
              <h3 className="text-sm font-black text-slate-950 mt-1">تثبيت تطبيق StitchLab 📲</h3>
              <p className="text-[10px] text-slate-400 font-bold">بناء المستقبل بالمعايير العالمية</p>
            </div>

            {/* Progress Circle or Bar */}
            <div className="space-y-4">
              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden border border-slate-200/50 relative shadow-inner">
                <div 
                  className="bg-gradient-to-r from-purple-600 via-pink-500 to-purple-700 h-full rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${installProgress}%` }}
                ></div>
              </div>
              
              <div className="flex justify-between items-center text-[11px] font-black text-slate-500 px-1">
                <span>جاري التحميل والتثبيت...</span>
                <span className="text-purple-700 font-mono text-xs">{installProgress}%</span>
              </div>
            </div>

            {/* Status dynamic message */}
            <div className="bg-purple-50/50 border border-purple-100/40 p-3.5 rounded-2xl text-[11px] text-purple-950 font-bold leading-relaxed shadow-sm min-h-[50px] flex items-center justify-center">
              {installStatusText}
            </div>

            {/* Footer actions depending on state */}
            <div className="pt-2">
              {installProgress < 100 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400 font-bold">
                    <span className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></span>
                    <span>الرجاء عدم إغلاق هذه الصفحة لتجنب مقاطعة التثبيت...</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsInstalling(false);
                      setShowAutoInstallOverlay(false);
                    }}
                    className="w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-500 font-bold rounded-xl text-[11px] transition-all cursor-pointer text-center block border border-slate-200/50"
                  >
                    إلغاء التثبيت ✕
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {typeof window !== "undefined" && window.self !== window.top ? (
                    <a
                      href={typeof window !== "undefined" ? window.location.href : "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white font-extrabold rounded-xl text-xs transition-all shadow-md active:scale-95 cursor-pointer text-center block"
                    >
                      فتح في نافذة مستقلة للتثبيت الفوري 🚀
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsInstalling(false)}
                      className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white font-extrabold rounded-xl text-xs transition-all shadow-md active:scale-95 cursor-pointer text-center block"
                    >
                      حسناً، تم بنجاح 👍
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsInstalling(false)}
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-[11px] transition-all cursor-pointer text-center block"
                  >
                    إغلاق النافذة ✕
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PWA INSTALLATION GUIDE MODAL - Sleek and compact 1-step instruction instead of old complex tabs */}
      {showPwaGuideModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn" dir="rtl">
          <div className="bg-white border border-pink-100 rounded-[32px] w-full max-w-sm p-6 space-y-5 shadow-2xl text-right leading-relaxed relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-pink-500/5 rounded-full blur-3xl pointer-events-none"></div>
            
            <div className="flex justify-between items-center border-b border-pink-50 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-2xl">📲</span>
                <div>
                  <h3 className="text-xs font-black text-slate-950">تثبيت تطبيق StitchLab</h3>
                  <p className="text-[9px] text-slate-400 font-bold">خطوة واحدة سهلة للتثبيت الفوري</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPwaGuideModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                ✕
              </button>
            </div>

            <div className="bg-purple-50/50 border border-purple-100/40 p-4 rounded-2xl text-xs text-purple-950 font-bold leading-relaxed space-y-3">
              <p>
                للتثبيت السريع وبدء استخدام التطبيق بشكل مستقل وملء الشاشة كأنه تطبيق هاتف ذكي أصلي:
              </p>
              <div className="bg-white p-3 rounded-xl border border-purple-100 text-[11px] font-bold text-slate-700 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-purple-600 font-black">🤖 أندرويد:</span>
                  <span>انقر على زر القائمة (⋮) ثم اختر <strong className="text-purple-700">"تثبيت التطبيق"</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-pink-600 font-black">🍎 آيفون:</span>
                  <span>انقر على زر المشاركة (📤) ثم اختر <strong className="text-pink-700">"إضافة إلى الشاشة الرئيسية"</strong></span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowPwaGuideModal(false);
                  handleInstallClick();
                }}
                className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white font-extrabold rounded-xl text-xs transition-all shadow-md active:scale-95 cursor-pointer text-center block"
              >
                تثبيت التطبيق تلقائياً الآن ⚡📲
              </button>
            </div>
          </div>
        </div>
      )}

      {/* OFFLINE ALERT OVERLAY */}
      {offlineError && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4 z-[60] animate-fadeIn" dir="rtl">
          <div className="bg-white rounded-[28px] max-w-sm w-full border border-purple-150 p-6 text-center space-y-4 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-purple-500 to-pink-500"></div>
            <div className="w-14 h-14 bg-rose-50 border border-rose-200 text-rose-500 rounded-2xl flex items-center justify-center mx-auto text-2xl animate-pulse">
              🚫
            </div>
            <h3 className="text-sm font-black text-slate-800">عذراً! الجهاز غير متصل بالإنترنت</h3>
            <p className="text-xs text-slate-500 leading-relaxed font-bold">
              {offlineError}
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setOfflineError(null)}
                className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-extrabold rounded-xl text-xs transition-all shadow-md active:scale-95"
              >
                موافق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADSTERRA ADVERTISER OVERLAY */}



    </div>
  );
}
