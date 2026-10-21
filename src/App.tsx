import React, { useState, useEffect, useMemo } from "react";
import {
  BookOpen,
  Send,
  AlertCircle,
  ArrowRight,
  LogOut,
  Mail,
  Lock,
  User,
  Volume2,
  Trash2,
  Compass,
  Trophy,
  Award,
  HelpCircle,
  X,
  Sparkles,
  Copy,
  Settings,
  Cloud,
  Pen,
  ShieldCheck
} from "lucide-react";
import ChangeEmailSection from "./components/ChangeEmailSection";
import { 
  Persona, 
  ChatMessage, 
  Flashcard, 
  PRESET_PERSONAS, 
  DAILY_QUOTES, 
  PRESET_FLASHCARDS,
  playAudioFeedback,
  playButtonClickSound
} from "./types";

// Import Firebase architecture & systems
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signOut,
  onAuthStateChanged,
  handleFirestoreError,
  OperationType
} from "./firebaseClient";
import { 
  doc, 
  getDoc, 
  getDocFromCache,
  setDoc, 
  updateDoc,
  serverTimestamp,
  collection,
  getDocs,
  writeBatch,
  onSnapshot
} from "firebase/firestore";
import { findBackupFile, getBackupContent, saveBackup, uploadPublicImage, type BackupPayload } from "./lib/googleDriveService";
import HomeWorkspace from "./components/HomeWorkspace";
import staticSheetWords from "./data/staticSheetWords.json";
import { getFilteredCompletedAndSkipped } from "./utils/wordFilters";
import confetti from "canvas-confetti";
import AchievementsWorkspace from "./components/AchievementsWorkspace";
import AboutWorkspace from "./components/AboutWorkspace";
import LearningTimer from "./components/LearningTimer";
import domtoimage from "dom-to-image";

// Import newly refactored dynamic panels
import ChatPanel from "./components/ChatPanel";
import AnalyzerPanel from "./components/AnalyzerPanel";
import QuizPanel from "./components/QuizPanel";
import FlashcardsPanel from "./components/FlashcardsPanel";

// Import motion & beautiful custom brand assets
import { motion, AnimatePresence } from "motion/react";
import welcomeRabbit from "./assets/1000000038.webp";

export default function App() {
  // Splash Screen State
  const [showSplash, setShowSplash] = useState<boolean>(true);

  // Detect if the user is running inside the mobile app/webview wrapper
  const [isAppMode] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    const ua = navigator.userAgent || "";
    const isWv = /wv|WebView|Android.*Version\/|iPhone.*(?!Safari)/i.test(ua);
    const isCap = !!(window as any).Capacitor?.isNativePlatform || window.location.protocol === "capacitor:";
    const isMedian = ua.toLowerCase().includes("median") || (window as any).median || !!(window as any).webkit?.messageHandlers?.median;
    return isWv || isCap || isMedian;
  });

  // Global Sound Click Listener for buttons and interactive items
  useEffect(() => {
    const handleGlobalClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target) return;

      const clickable = target.closest("button, [role='button'], a, input[type='submit'], input[type='button'], .cursor-pointer, [id*='level-card']") as HTMLElement;
      if (clickable) {
        // Only ignore if clicking nested select elements or textual input boxes to avoid typing sounds.
        const tagName = target.tagName.toLowerCase();
        if (tagName === "input" && (target as HTMLInputElement).type !== "button" && (target as HTMLInputElement).type !== "submit") {
          return;
        }
        if (tagName === "textarea" || tagName === "select") {
          return;
        }
        playButtonClickSound();

        // Make the button vibrate/shake!
        clickable.classList.add("animate-shake");
        setTimeout(() => {
          clickable.classList.remove("animate-shake");
        }, 360);
      }
    };

    document.addEventListener("click", handleGlobalClick, { capture: true });
    return () => {
      document.removeEventListener("click", handleGlobalClick, { capture: true });
    };
  }, []);

  // Save feedback state for snackbar
  const [saveStatus, setSaveStatus] = useState<{ show: boolean; success: boolean; message: string } | null>(null);

  // Deep-linking capture and Dynamic Route challenge document fetching
  useEffect(() => {
    const handleDynamicChallengeLoad = async () => {
      try {
        const pathname = window.location.pathname;
        const match = pathname.match(/^\/challenge\/([^/]+)/);
        let challengeId = "";
        
        if (match) {
          challengeId = decodeURIComponent(match[1]);
        } else {
          const urlParams = new URLSearchParams(window.location.search);
          challengeId = urlParams.get("challenge") || urlParams.get("id") || "";
        }

        if (challengeId) {
          console.log("StitchLab Challenge system active. ID detected:", challengeId);
          localStorage.setItem("stitchlab_challenge_id", challengeId);
          
          // Dynamically import Firestore getDoc function and execute
          const challengeRef = doc(db, "challenges", challengeId);
          const challengeSnap = await getDoc(challengeRef);
          if (challengeSnap.exists()) {
            const challengeData = challengeSnap.data();
            console.log("StitchLab loaded challenge card from Firestore:", challengeData);
            setActiveChallenge({
              id: challengeId,
              ...challengeData
            });
            setShowChallengeLanding(true);
            
            // Set the challenger reference so standard checkChallenge triggers if needed
            localStorage.setItem("stitchlab_challenger_ref", challengeData.challengerName || "طالب مميز");
          } else {
            console.warn("No active challenge document in Firestore under key:", challengeId);
          }
        } else {
          // Standard ref query backup check
          const urlParams = new URLSearchParams(window.location.search);
          const refParam = urlParams.get("ref") || urlParams.get("v");
          if (refParam) {
            localStorage.setItem("stitchlab_challenger_ref", refParam);
          }
        }

        // Capture StitchLab Academy invitation details
        const urlParams = new URLSearchParams(window.location.search);
        const academyInvite = urlParams.get("academyInvite");
        const inviterName = urlParams.get("inviterName");
        if (academyInvite) {
          console.log("StitchLab Academy Invite Detected! Inviter ID:", academyInvite);
          localStorage.setItem("stitchlab_academy_invite_id", academyInvite);
          setActiveAcademyInviteId(academyInvite);
          let decodedName = "زميلك الدراسي";
          if (inviterName) {
            try {
              decodedName = decodeURIComponent(inviterName);
            } catch (_) {}
            localStorage.setItem("stitchlab_academy_inviter_name", decodedName);
          }
          setActiveAcademyInviteName(decodedName);
          setShowAcademyLanding(true);
        }
      } catch (e) {
        console.warn("StitchLab Challenge deep link resolution error:", e);
      }
    };
    handleDynamicChallengeLoad();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 10000); // 10 seconds (شاشة ترحيبية بيضاء لمدة 10 ثوان)
    return () => clearTimeout(timer);
  }, []);

  // Login / Authentication States
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<"login" | "signup" | "forgot-password">("login");
  const [showEmailVerificationScreen, setShowEmailVerificationScreen] = useState<boolean>(false);
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [userLevel, setUserLevel] = useState<"Beginner" | "Intermediate" | "Advanced">(() => {
    if (typeof window === "undefined") return "Intermediate";
    return (localStorage.getItem("stitchlab_user_level") as any) || "Intermediate";
  });
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string; level: string; lastNameChangedAt?: string } | null>(null);
  const [authError, setAuthError] = useState<string>("");
  const [authSuccessMessage, setAuthSuccessMessage] = useState<string>("");
  const [authLoading, setAuthLoading] = useState<boolean>(false);
  const [agreedToTerms, setAgreedToTerms] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("stitchlab_agreed_to_terms") === "true";
  });
  const [showTermsModal, setShowTermsModal] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("stitchlab_agreed_to_terms", agreedToTerms ? "true" : "false");
    }
  }, [agreedToTerms]);

  // Firestore & Gamification states
  const [points, setPoints] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    return parseInt(localStorage.getItem("stitchlab_points") || "0", 10);
  });
  const [completedGroups, setCompletedGroups] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem("stitchlab_completed_groups");
      return saved ? JSON.parse(saved) : [];
    } catch (_) {
      return [];
    }
  });
  const [completedWordKeys, setCompletedWordKeys] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem("stitchlab_completed_word_keys");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [skippedWordKeys, setSkippedWordKeys] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem("stitchlab_skipped_word_keys");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [reviewTargetWord, setReviewTargetWord] = useState<string | null>(null);
  const [analyzedCount, setAnalyzedCount] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    return parseInt(localStorage.getItem("stitchlab_analyzed_count") || "0", 10);
  });
  const [completedWordsCount, setCompletedWordsCount] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    try {
      const savedKeys = localStorage.getItem("stitchlab_completed_word_keys");
      if (savedKeys) {
        const parsed = JSON.parse(savedKeys);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.length;
        }
      }
    } catch (e) {}
    return parseInt(localStorage.getItem("stitchlab_completed_words_count") || "0", 10);
  });
  const [studentSemester, setStudentSemester] = useState<string>(() => {
    if (typeof window === "undefined") return "الفصل الدراسي الأول";
    return localStorage.getItem("stitchlab_student_semester") || "الفصل الدراسي الأول";
  });
  const [isDataLoaded, setIsDataLoaded] = useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [isCloudSynced, setIsCloudSynced] = useState<boolean>(false);
  const isInitialLoad = React.useRef<boolean>(true);

  // Compute filtered completed and skipped word lists strictly for completed groups
  const { filteredCompleted: filteredCompletedKeys, filteredSkipped: filteredSkippedKeys } = useMemo(() => {
    return getFilteredCompletedAndSkipped(completedWordKeys, skippedWordKeys, completedGroups);
  }, [completedWordKeys, skippedWordKeys, completedGroups]);

  // Challenge states & modal triggers (Re-ordered after state definitions)
  const [challengeChallenger, setChallengeChallenger] = useState<string | null>(null);
  const [showChallengeModal, setShowChallengeModal] = useState<boolean>(false);
  const [activeChallenge, setActiveChallenge] = useState<any>(null);
  const [showChallengeLanding, setShowChallengeLanding] = useState<boolean>(false);

  // StitchLab Academy States & Operations
  const [academyViewOpen, setAcademyViewOpen] = useState<boolean>(false);
  const [isGeneratingAcademyInvite, setIsGeneratingAcademyInvite] = useState<boolean>(false);
  const [academyInviteUrl, setAcademyInviteUrl] = useState<string>("");
  const [academyInviteImage, setAcademyInviteImage] = useState<string>("");
  const [classmates, setClassmates] = useState<{ uid: string; name: string; email: string; joinedAt: string; studentSemester?: string; completedWordsCount?: number; completedGroupsCount?: number }[]>([]);
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [showNameEditLockHint, setShowNameEditLockHint] = useState<boolean>(false);
  const [editingNameValue, setEditingNameValue] = useState<string>("");
  const [loadingClassmates, setLoadingClassmates] = useState<boolean>(false);
  const [pendingAcademyInvite, setPendingAcademyInvite] = useState<{ id: string; name: string } | null>(null);
  const [activeAcademyInviteId, setActiveAcademyInviteId] = useState<string | null>(null);
  const [activeAcademyInviteName, setActiveAcademyInviteName] = useState<string | null>(null);
  const [showAcademyLanding, setShowAcademyLanding] = useState<boolean>(false);

  // 👑 ADMIN BULK RESET OPERATIONS
  const [adminResetStep, setAdminResetStep] = useState<"idle" | "confirm" | "resetting" | "success" | "error">("idle");
  const [resetErrorText, setResetErrorText] = useState<string>("");
  const [resetCount, setResetCount] = useState<number>(0);

  const triggerAdminBulkReset = async () => {
    setAdminResetStep("resetting");
    try {
      const studentsCol = collection(db, "students");
      const snap = await getDocs(studentsCol);

      if (snap.empty) {
        setResetCount(0);
        setAdminResetStep("success");
        return;
      }

      const batch = writeBatch(db);
      let count = 0;

      snap.forEach((snapshotDoc) => {
        const studentId = snapshotDoc.id;
        const docRef = doc(db, "students", studentId);
        
        batch.update(docRef, {
          points: 0,
          completedWordsCount: 0,
          quizAttempts: 0,
          quizScore: 0,
          completedGroups: [],
          updatedAt: new Date().toISOString()
        });
        count++;
      });

      await batch.commit();
      setResetCount(count);

      // Locally apply state resets if admin is also logged in as student
      if (auth.currentUser && auth.currentUser.email === "stitchlab2027@gmail.com") {
        setPoints(0);
        setCompletedWordsCount(0);
        setQuizAttempts(0);
        setQuizScore(0);
        setCompletedGroups([]);
        
        const userProgressKey = `stitchlab_student_${auth.currentUser.uid}_progress`;
        const savedProgressStr = localStorage.getItem(userProgressKey);
        if (savedProgressStr) {
          try {
            const parsed = JSON.parse(savedProgressStr);
            parsed.points = 0;
            parsed.completedWordsCount = 0;
            parsed.quizAttempts = 0;
            parsed.quizScore = 0;
            parsed.completedGroups = [];
            localStorage.setItem(userProgressKey, JSON.stringify(parsed));
          } catch (_) {}
        }
      }

      setAdminResetStep("success");
    } catch (err: any) {
      console.error("Error committing bulk reset on client-sdk:", err);
      setResetErrorText(err?.message || String(err));
      setAdminResetStep("error");
    }
  };

  const fetchClassmates = async () => {
    if (!auth.currentUser) return;
    setLoadingClassmates(true);
    try {
      const q = collection(db, "classrooms", auth.currentUser.uid, "members");
      const snap = await getDocs(q);
      const list: any[] = [];
      snap.forEach((docSnap) => {
        list.push({
          uid: docSnap.id,
          ...docSnap.data()
        });
      });
      setClassmates(list);
    } catch (err) {
      console.error("Error fetching classmates:", err);
    } finally {
      setLoadingClassmates(false);
    }
  };

  const safeCopyToClipboard = (text: string, successMessage: string = "📋 تم النسخ بنجاح!", silent: boolean = false) => {
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      textarea.style.top = "-9999px";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      textarea.setSelectionRange(0, 99999);
      const successful = document.execCommand("copy");
      document.body.removeChild(textarea);
      if (successful) {
        if (!silent) {
          alert(successMessage);
        }
      } else {
        throw new Error("Unable to execCommand('copy')");
      }
    } catch (err) {
      if (!silent) {
        window.prompt("🔒 تعذر النسخ التلقائي بسبب قيود المتصفح. يرجى نسخ النص يدوياً من الحقل المظلل بالأسفل:", text);
      }
    }
  };

  const generateAcademyInviteLink = async () => {
    setIsGeneratingAcademyInvite(true);
    let imgData = "";
    let publicImageUrl = "";
    
    const uid = auth.currentUser?.uid || "unknown";
    const studentName = currentUser?.name || auth.currentUser?.displayName || "طالب مميز";
    
    try {
      const target = document.getElementById("stitchlab-workspace") || document.body;
      if (domtoimage) {
        imgData = await domtoimage.toPng(target, {
          cacheBust: true,
          style: {
            transform: "scale(1)",
            transformOrigin: "top left"
          }
        });
        setAcademyInviteImage(imgData);

        // If Google Drive is integrated, upload the image to make it accessible to Open Graph crawlers!
        if (driveToken && imgData) {
          try {
            console.log("StitchLab: Uploading public invite snapshot card to Google Drive...");
            const fileName = `stitchlab_invite_${uid}_${Date.now()}.png`;
            publicImageUrl = await uploadPublicImage(driveToken, imgData, fileName);
            console.log("StitchLab: Public snapshot hosted at:", publicImageUrl);
          } catch (uploadErr) {
            console.error("Google Drive public upload failed:", uploadErr);
          }
        }
      }
      
      const paramImage = publicImageUrl ? `&previewImage=${encodeURIComponent(publicImageUrl)}` : "";
      const link = `${window.location.origin}/?academyInvite=${uid}&inviterName=${encodeURIComponent(studentName)}${paramImage}`;
      
      setAcademyInviteUrl(link);

      // No alerts shown as requested
    } catch (err) {
      console.error("StitchLab Academy snapshot failed:", err);
      // Fallback
      const link = `${window.location.origin}/?academyInvite=${uid}&inviterName=${encodeURIComponent(studentName)}`;
      setAcademyInviteUrl(link);
    } finally {
      setIsGeneratingAcademyInvite(false);
    }
  };

  const checkChallenge = React.useCallback(() => {
    try {
      const storedRef = localStorage.getItem("stitchlab_challenger_ref");
      if (!storedRef) return;

      const challengerClean = storedRef.trim();
      const currentUserName = currentUser?.name || auth.currentUser?.displayName || "طالب مميز";
      const currentUserUid = auth.currentUser?.uid;

      // Avoid challenging oneself
      if (
        challengerClean !== "طالب مميز" &&
        challengerClean !== currentUserName &&
        challengerClean !== currentUserUid
      ) {
        // Did user already process this specific challenger's requests?
        const resolvedChallenges = JSON.parse(localStorage.getItem("stitchlab_resolved_challenges") || "[]");
        if (!resolvedChallenges.includes(challengerClean)) {
          setChallengeChallenger(challengerClean);
          setShowChallengeModal(true);
        }
      }
    } catch (e) {
      console.warn("StitchLab checkChallenge failed:", e);
    }
  }, [currentUser]);

  // Invoke checkChallenge whenever the user successfully signs in and client progress loading wraps up
  useEffect(() => {
    if (isLoggedIn && isDataLoaded) {
      // Delay slightly to give page time to render beautifully after loading spinner transitions
      const delayTimer = setTimeout(() => {
        checkChallenge();
      }, 1000);
      return () => clearTimeout(delayTimer);
    }
  }, [isLoggedIn, isDataLoaded, checkChallenge]);

  // Online/Offline, Sync code states & Modals
  const [isOnline, setIsOnline] = useState<boolean>(() => typeof window !== "undefined" ? window.navigator.onLine : true);
  const [showSyncModal, setShowSyncModal] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [changeEmailViewOpen, setChangeEmailViewOpen] = useState<boolean>(false);
  const [appToast, setAppToast] = useState<{ id: number; message: string; type: "success" | "error" | "info" } | null>(null);

  const [accountTypeVersion, setAccountTypeVersion] = useState<number>(0);

  useEffect(() => {
    const handleAccountTypeChanged = () => {
      setAccountTypeVersion((prev) => prev + 1);
    };
    window.addEventListener("stitchlab_account_type_changed", handleAccountTypeChanged);
    return () => {
      window.removeEventListener("stitchlab_account_type_changed", handleAccountTypeChanged);
    };
  }, []);

  const triggerAppToast = (message: string, type: "success" | "error" | "info" = "info") => {
    setAppToast({ id: Date.now(), message, type });
  };

  useEffect(() => {
    if (!appToast) return;
    const timer = setTimeout(() => {
      setAppToast(null);
    }, 6500);
    return () => clearTimeout(timer);
  }, [appToast]);

  const [showSkippedWordsList, setShowSkippedWordsList] = useState<boolean>(false);
  const [syncInputCode, setSyncInputCode] = useState<string>("");
  const [currentSyncCode, setCurrentSyncCode] = useState<string>("");
  const [copiedUid, setCopiedUid] = useState<boolean>(false);

  // Google Drive backup states
  const [driveToken, setDriveToken] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("stitchlab_drive_token") || null;
  });
  const [driveFileId, setDriveFileId] = useState<string | null>(null);
  const [showContinueScreen, setShowContinueScreen] = useState<boolean>(false);
  const [googleSuccessMsg, setGoogleSuccessMsg] = useState<string>("");
  const [isBackupLoading, setIsBackupLoading] = useState<boolean>(false);
  const [isRestoreLoading, setIsRestoreLoading] = useState<boolean>(false);
  const [showOAuthHelper, setShowOAuthHelper] = useState<boolean>(false);
  const [cloudDriveBackup, setCloudDriveBackup] = useState<{
    id: string;
    modifiedTime?: string;
    level: string;
    points: number;
    updatedAt: string;
  } | null>(null);
  const [showRestoreSuggestion, setShowRestoreSuggestion] = useState<boolean>(false);

  useEffect(() => {
    const updateOnlineStatus = () => {
      setIsOnline(window.navigator.onLine);
    };
    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);
    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("stitchlab_completed_words_count", completedWordsCount.toString());
  }, [completedWordsCount]);

  useEffect(() => {
    if (completedWordsCount > completedWordKeys.length) {
      const diff = completedWordsCount - completedWordKeys.length;
      const updated = [...completedWordKeys];
      for (let i = 0; i < diff; i++) {
        updated.push(`retroactive_word_${updated.length + i + 1}`);
      }
      setCompletedWordKeys(updated);
      localStorage.setItem("stitchlab_completed_word_keys", JSON.stringify(updated));
    } else if (completedWordKeys.length > completedWordsCount) {
      setCompletedWordsCount(completedWordKeys.length);
    }
  }, [completedWordsCount, completedWordKeys]);

  useEffect(() => {
    localStorage.setItem("stitchlab_student_semester", studentSemester);
  }, [studentSemester]);

  // Main UI Tab States
  const [activeTab, setActiveTab] = useState<"chat" | "analyzer" | "quiz" | "flashcards">("chat");

  // Game map state & custom tabs
  const [unlockedLevel, setUnlockedLevel] = useState<number>(() => {
    if (typeof window === "undefined") return 1;
    return parseInt(localStorage.getItem("stitchlab_unlocked_level") || "1", 10);
  });
  const [completedLevels, setCompletedLevels] = useState<number[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem("stitchlab_completed_levels");
      return saved ? JSON.parse(saved) : [];
    } catch (_) {
      return [];
    }
  });
  const [mainTab, setMainTab] = useState<"home" | "training" | "achievements" | "about" | "certificates" | "support">("home");
  const [currentTickTime, setCurrentTickTime] = useState<string>("14:44");
  const [bonusMinutes, setBonusMinutes] = useState<number>(15);

  // Persistent 45 Minutes Daily Timer System for student users
  const [dailySecondsLeft, setDailySecondsLeft] = useState<number>(() => {
    if (typeof window === "undefined") return 2700;
    const today = new Date().toISOString().split("T")[0];
    const savedDate = localStorage.getItem("stitchlab_timer_date");
    if (savedDate !== today) {
      localStorage.setItem("stitchlab_timer_date", today);
      localStorage.setItem("stitchlab_seconds_left", "2700");
      localStorage.setItem("stitchlab_extra_ad_claims", "0");
      return 2700;
    } else {
      const savedSecs = localStorage.getItem("stitchlab_seconds_left");
      return savedSecs !== null ? parseInt(savedSecs, 10) : 2700;
    }
  });

  const [extraAdClaimsCount, setExtraAdClaimsCount] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    const today = new Date().toISOString().split("T")[0];
    const savedDate = localStorage.getItem("stitchlab_timer_date");
    if (savedDate !== today) {
      return 0;
    } else {
      const savedClaims = localStorage.getItem("stitchlab_extra_ad_claims");
      return savedClaims !== null ? parseInt(savedClaims, 10) : 0;
    }
  });

  // List of group keys unlocked via Adsterra ad gating
  const [unlockedAdvertiserGroups, setUnlockedAdvertiserGroups] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem("stitchlab_unlocked_ad_groups");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Retrospective Calculation and Synchronization of Completed/Skipped Words and Completed Groups
  useEffect(() => {
    // A. Gather all words in staticSheetWords + cached sheet words
    const allWordsList: any[] = [];
    if (Array.isArray(staticSheetWords)) {
      allWordsList.push(...staticSheetWords);
    }
    try {
      const cached = localStorage.getItem("stitchlab_sheet_words");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          parsed.forEach((item: any) => {
            if (item && item.word && item.group) {
              const exists = allWordsList.some(w => 
                w.word?.toLowerCase().trim() === item.word?.toLowerCase().trim() && 
                w.group?.toLowerCase().trim() === item.group?.toLowerCase().trim() &&
                w.level === item.level
              );
              if (!exists) {
                allWordsList.push(item);
              }
            }
          });
        }
      }
    } catch (_) {}

    // Group words of each group key ("level_semester_group")
    const groupWordsMap = new Map<string, Set<string>>();
    allWordsList.forEach((item: any) => {
      if (item && item.word && item.group && item.semester && item.level) {
        const key = `${item.level}_${item.semester.trim()}_${item.group.trim()}`;
        const wVal = item.word.toLowerCase().trim();
        if (wVal) {
          const s = groupWordsMap.get(key) || new Set<string>();
          s.add(wVal);
          groupWordsMap.set(key, s);
        }
      }
    });

    // 1. Level-to-Groups Retrospective Hydration
    const finalCompletedGroups = new Set<string>(completedGroups);
    if (Array.isArray(completedLevels) && completedLevels.length > 0) {
      allWordsList.forEach((item: any) => {
        if (item && item.group && item.semester && item.level && completedLevels.includes(item.level)) {
          const key = `${item.level}_${item.semester.trim()}_${item.group.trim()}`;
          finalCompletedGroups.add(key);
        }
      });
    }

    // 2. Groups-to-Words Retrospective Hydration (Hydrate completed word keys from completed groups, excluding skipped/uncompleted words)
    const finalCompletedWordsSet = new Set<string>(completedWordKeys.map(k => k.toLowerCase().trim()));
    const finalSkippedSet = new Set<string>(skippedWordKeys.map(k => k.toLowerCase().trim()));
    let completedWordKeysChanged = false;

    finalCompletedGroups.forEach(gKey => {
      const wordsSet = groupWordsMap.get(gKey);
      if (wordsSet) {
        wordsSet.forEach(w => {
          const lowerW = w.toLowerCase().trim();
          if (!finalCompletedWordsSet.has(lowerW) && !finalSkippedSet.has(lowerW)) {
            finalCompletedWordsSet.add(lowerW);
            completedWordKeysChanged = true;
          }
        });
      }
    });

    if (completedWordKeysChanged) {
      const sortedNewKeys = Array.from(finalCompletedWordsSet);
      setCompletedWordKeys(sortedNewKeys);
      localStorage.setItem("stitchlab_completed_word_keys", JSON.stringify(sortedNewKeys));
      if (completedWordsCount < sortedNewKeys.length) {
        setCompletedWordsCount(sortedNewKeys.length);
      }
    }

    // 3. Cleansing Skipped Words: Keep only those that the user explicitly skipped, and filter out any completed words.
    const cleanedSkippedList = skippedWordKeys.filter(k => {
      const trimmed = k.toLowerCase().trim();
      return trimmed && !finalCompletedWordsSet.has(trimmed);
    });

    const currentSkippedSorted = [...skippedWordKeys].map(k => k.toLowerCase().trim()).sort().join(",");
    const targetSkippedSorted = [...cleanedSkippedList].map(k => k.toLowerCase().trim()).sort().join(",");

    if (currentSkippedSorted !== targetSkippedSorted) {
      setSkippedWordKeys(cleanedSkippedList);
      localStorage.setItem("stitchlab_skipped_word_keys", JSON.stringify(cleanedSkippedList));
    }

    // 4. Words-to-Groups Retrospective Hydration
    // Check which group keys have ALL of their words fully completed in completedWordKeys list
    const finalUnlockedAdGroupsSet = new Set<string>(unlockedAdvertiserGroups);

    groupWordsMap.forEach((wordsSet, groupKey) => {
      if (wordsSet.size > 0) {
        let allCompleted = true;
        for (const w of wordsSet) {
          if (!finalCompletedWordsSet.has(w)) {
            allCompleted = false;
            break;
          }
        }
        if (allCompleted) {
          finalCompletedGroups.add(groupKey);
          finalUnlockedAdGroupsSet.add(groupKey);
        }
      }
    });

    // Save and update completed and unlocked advertiser group states if there are changes
    const targetCompletedGroupsList = Array.from(finalCompletedGroups);
    const targetUnlockedGroupsList = Array.from(finalUnlockedAdGroupsSet);

    const currentCompletedSorted = [...completedGroups].sort().join(",");
    const targetCompletedSorted = [...targetCompletedGroupsList].sort().join(",");

    const currentUnlockedSorted = [...unlockedAdvertiserGroups].sort().join(",");
    const targetUnlockedSorted = [...targetUnlockedGroupsList].sort().join(",");

    if (currentCompletedSorted !== targetCompletedSorted) {
      setCompletedGroups(targetCompletedGroupsList);
      localStorage.setItem("stitchlab_completed_groups", JSON.stringify(targetCompletedGroupsList));
    }

    if (currentUnlockedSorted !== targetUnlockedSorted) {
      setUnlockedAdvertiserGroups(targetUnlockedGroupsList);
      localStorage.setItem("stitchlab_unlocked_ad_groups", JSON.stringify(targetUnlockedGroupsList));
    }
  }, [completedWordKeys, skippedWordKeys, completedGroups, unlockedAdvertiserGroups, completedLevels]);

  // Quote state
  const [quoteIndex, setQuoteIndex] = useState<number>(0);

  // Statistics state
  const [quizScore, setQuizScore] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    return parseInt(localStorage.getItem("stitchlab_quiz_score") || "0", 10);
  });
  const [quizAttempts, setQuizAttempts] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    return parseInt(localStorage.getItem("stitchlab_quiz_attempts") || "0", 10);
  });
  const [conversationsHad, setConversationsHad] = useState<number>(() => {
    if (typeof window === "undefined") return 4;
    return parseInt(localStorage.getItem("stitchlab_conversations_had") || "4", 10);
  });
  const [customFlashcards, setCustomFlashcards] = useState<Flashcard[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const saved = localStorage.getItem("stitchlab_custom_cards");
      return saved ? JSON.parse(saved) : [];
    } catch (_) {
      return [];
    }
  });

  // Chat parameters
  const [selectedPersona, setSelectedPersona] = useState<Persona>(PRESET_PERSONAS[0]);
  const [chatInputValue, setChatInputValue] = useState<string>("Hello!");
  const [chatHistoryMap, setChatHistoryMap] = useState<Record<string, ChatMessage[]>>({});
  const [chatLoading, setChatLoading] = useState<boolean>(false);
  const [chatTranslateToggle, setChatTranslateToggle] = useState<Record<string, boolean>>({});

  // Sentence Analyzer structures
  const [analyzerInputValue, setAnalyzerInputValue] = useState<string>("");
  const [analyzerLoading, setAnalyzerLoading] = useState<boolean>(false);
  const [analyzerResult, setAnalyzerResult] = useState<any | null>(null);
  const [analyzerError, setAnalyzerError] = useState<string>("");

  // Interactive Quiz state
  const [quizTopic, setQuizTopic] = useState<string>("Rules of Prepositions & Tenses");
  const [quizCustomTopic, setQuizCustomTopic] = useState<string>("");
  const [quizLevel, setQuizLevel] = useState<"Beginner" | "Intermediate" | "Advanced">("Intermediate");
  const [quizLoading, setQuizLoading] = useState<boolean>(false);
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [submittedQuiz, setSubmittedQuiz] = useState<boolean>(false);
  const [quizError, setQuizError] = useState<string>("");

  // Flashcards state filters
  const [flashcardSearch, setFlashcardSearch] = useState<string>("");
  const [flashcardLevelFilter, setFlashcardLevelFilter] = useState<string>("All");
  const [newCardWord, setNewCardWord] = useState<string>("");
  const [newCardIpa, setNewCardIpa] = useState<string>("");
  const [newCardPartOfSpeech, setNewCardPartOfSpeech] = useState<string>("Noun");
  const [newCardMeaning, setNewCardMeaning] = useState<string>("");
  const [newCardExample, setNewCardExample] = useState<string>("");
  const [newCardExampleTranslation, setNewCardExampleTranslation] = useState<string>("");
  const [newCardLevel, setNewCardLevel] = useState<"Beginner" | "Intermediate" | "Advanced">("Intermediate");
  const [showAddCardModal, setShowAddCardModal] = useState<boolean>(false);

  // Client side Speech Synthesis Voice assistant
  const speakText = (text: string) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-GB";
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        const isMaleVoice = selectedPersona.id === "jack" || selectedPersona.id === "adam";
        const britishVoices = voices.filter(v => 
          v.lang.toLowerCase().includes("gb") || 
          v.lang.toLowerCase().includes("uk") ||
          v.name.toLowerCase().includes("united kingdom") ||
          v.name.toLowerCase().includes("great britain")
        );
        const candidates = britishVoices.length > 0 ? britishVoices : voices;
        const matchedVoice = candidates.find(v => 
          isMaleVoice 
            ? v.name.toLowerCase().includes("david") || v.name.toLowerCase().includes("male") || v.name.toLowerCase().includes("george")
            : v.name.toLowerCase().includes("zira") || v.name.toLowerCase().includes("female") || v.name.toLowerCase().includes("hazel") || v.name.toLowerCase().includes("susan")
        ) || candidates[0];
        if (matchedVoice) {
          utterance.voice = matchedVoice;
        }
      }
      window.speechSynthesis.speak(utterance);
    } else {
      alert("النطق الصوتي غير مدعوم في متصفحك الحالي.");
    }
  };

  // Tick time and pick daily quote
  useEffect(() => {
    const randIndex = Math.floor(Math.random() * DAILY_QUOTES.length);
    setQuoteIndex(randIndex);

    const savedChatHistory = localStorage.getItem("stitchlab_chat_history_map");
    if (savedChatHistory) {
      try {
        setChatHistoryMap(JSON.parse(savedChatHistory));
      } catch (e) {}
    }

    const updateTime = () => {
      const now = new Date();
      let hours = now.getHours().toString().padStart(2, "0");
      let minutes = now.getMinutes().toString().padStart(2, "0");
      setCurrentTickTime(`${hours}:${minutes}`);
    };
    updateTime();
    const timer = setInterval(updateTime, 60000);
    return () => clearInterval(timer);
  }, []);

  // Sync custom cards changes locally
  useEffect(() => {
    if (customFlashcards.length > 0) {
      localStorage.setItem("stitchlab_custom_cards", JSON.stringify(customFlashcards));
    }
  }, [customFlashcards]);

  // Firebase auth state listener & automatic cloud data sync bootstrap
  useEffect(() => {
    console.log("Loading saved progress...");
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setAuthError("");
        
        // Safe check for email verification with password login provider type
        const isEmailVerified = firebaseUser.emailVerified;
        const isPassProvider = firebaseUser.providerData.some(p => p.providerId === "password");

        if (isPassProvider && !isEmailVerified) {
          setIsLoggedIn(true);
          setShowEmailVerificationScreen(true);
          setIsDataLoaded(true);
          setAuthLoading(false);
          return;
        }

        setIsLoggedIn(true);
        setShowEmailVerificationScreen(false);
        setIsDataLoaded(false);
        setAuthLoading(true);
        
        const uid = firebaseUser.uid;
        let progress: any = null;
        
        // A. Read local UID specific progress first
        try {
          const userProgressKey = `stitchlab_student_${uid}_progress`;
          const savedProgressStr = localStorage.getItem(userProgressKey);
          if (savedProgressStr) {
            progress = JSON.parse(savedProgressStr);
          }
        } catch (localErr) {
          console.warn("StitchLab: Failed to read from local storage:", localErr);
        }

        // B. If progress was found in localStorage, restore it!
        if (progress) {
          setUserLevel(progress.level || "Intermediate");
          setPoints(progress.points !== undefined ? progress.points : 0);
          setUnlockedLevel(progress.unlockedLevel || 1);
          setCompletedLevels(progress.completedLevels || []);
          setCompletedGroups(progress.completedGroups || []);
          setUnlockedAdvertiserGroups(progress.unlockedAdvertiserGroups || []);
          setCustomFlashcards(progress.customFlashcards || []);
          setConversationsHad(progress.conversationsHad || 0);
          setQuizScore(progress.quizScore || 0);
          setQuizAttempts(progress.quizAttempts || 0);
          setAnalyzedCount(progress.analyzedCount || 0);
          setCompletedWordsCount(progress.completedWordsCount || 0);
          setStudentSemester(progress.studentSemester || "الفصل الدراسي الأول");
          
          setCurrentUser({
            name: progress.name || firebaseUser.displayName || "طالب مميز",
            email: firebaseUser.email || "",
            level: progress.level || "Intermediate",
            lastNameChangedAt: progress.lastNameChangedAt || ""
          });
          console.log("Progress restored successfully.");
          console.log(`[StitchLab Debug] تم استعادة التقدم بنجاح للطالب المسجل. النقاط: ${progress.points || 0}، المستوى: ${progress.level || "Intermediate"}، الكلمات: ${progress.completedWordsCount || 0}`);
        } else {
          // C. Warm-start fallback: Link previous offline guest / general progress to this user!
          const localUserLevel = localStorage.getItem("stitchlab_user_level") as any || "Intermediate";
          const localPoints = parseInt(localStorage.getItem("stitchlab_points") || "0", 10);
          const localUnlockedLevel = parseInt(localStorage.getItem("stitchlab_unlocked_level") || "1", 10);
          const localCompletedLevels = JSON.parse(localStorage.getItem("stitchlab_completed_levels") || "[]");
          const localCompletedGroups = JSON.parse(localStorage.getItem("stitchlab_completed_groups") || "[]");
          const localCustomFlashcards = JSON.parse(localStorage.getItem("stitchlab_custom_cards") || "[]");
          const localConversationsHad = parseInt(localStorage.getItem("stitchlab_conversations_had") || "0", 10);
          const localQuizScore = parseInt(localStorage.getItem("stitchlab_quiz_score") || "0", 10);
          const localQuizAttempts = parseInt(localStorage.getItem("stitchlab_quiz_attempts") || "0", 10);
          const localAnalyzedCount = parseInt(localStorage.getItem("stitchlab_analyzed_count") || "0", 10);
          const localCompletedWordsCount = parseInt(localStorage.getItem("stitchlab_completed_words_count") || "0", 10);
          const localStudentSemester = localStorage.getItem("stitchlab_student_semester") || "الفصل الدراسي الأول";

          const payload = {
            uid,
            name: firebaseUser.displayName || "طالب مميز",
            email: firebaseUser.email || "",
            level: localUserLevel,
            points: localPoints,
            unlockedLevel: localUnlockedLevel,
            completedLevels: localCompletedLevels,
            completedGroups: localCompletedGroups,
            unlockedAdvertiserGroups: JSON.parse(localStorage.getItem("stitchlab_unlocked_ad_groups") || "[]"),
            customFlashcards: localCustomFlashcards,
            conversationsHad: localConversationsHad,
            quizScore: localQuizScore,
            quizAttempts: localQuizAttempts,
            analyzedCount: localAnalyzedCount,
            completedWordsCount: localCompletedWordsCount,
            studentSemester: localStudentSemester
          };

          const userProgressKey = `stitchlab_student_${uid}_progress`;
          localStorage.setItem(userProgressKey, JSON.stringify(payload));

          setUserLevel(localUserLevel);
          setPoints(localPoints);
          setUnlockedLevel(localUnlockedLevel);
          setCompletedLevels(localCompletedLevels);
          setCompletedGroups(localCompletedGroups);
          setCustomFlashcards(localCustomFlashcards);
          setConversationsHad(localConversationsHad);
          setQuizScore(localQuizScore);
          setQuizAttempts(localQuizAttempts);
          setAnalyzedCount(localAnalyzedCount);
          setCompletedWordsCount(localCompletedWordsCount);
          setStudentSemester(localStudentSemester);

          setCurrentUser({
            name: payload.name,
            email: payload.email,
            level: localUserLevel,
            lastNameChangedAt: ""
          });
          console.log("Progress restored successfully.");
          console.log(`[StitchLab Debug] تم استعادة التقدم بنجاح (ربط تقدم الزائر بالرئيسي). النقاط: ${localPoints}، المستوى: ${localUserLevel}، الكلمات: ${localCompletedWordsCount}`);
        }
        
        setIsDataLoaded(true);
        setAuthLoading(false);
      } else {
        setIsLoggedIn(false);
        setCurrentUser(null);
        
        setDriveToken(null);
        setDriveFileId(null);
        setCloudDriveBackup(null);
        setShowRestoreSuggestion(false);
        
        // Force offline guest cache restoration so guest users are fully active without Google sign-in
        const localUserLevel = localStorage.getItem("stitchlab_user_level") as any || "Intermediate";
        const localPoints = parseInt(localStorage.getItem("stitchlab_points") || "0", 10);
        const localUnlockedLevel = parseInt(localStorage.getItem("stitchlab_unlocked_level") || "1", 10);
        const localCompletedLevels = JSON.parse(localStorage.getItem("stitchlab_completed_levels") || "[]");
        const localCompletedGroups = JSON.parse(localStorage.getItem("stitchlab_completed_groups") || "[]");
        const localCustomFlashcards = JSON.parse(localStorage.getItem("stitchlab_custom_cards") || "[]");
        const localConversationsHad = parseInt(localStorage.getItem("stitchlab_conversations_had") || "0", 10);
        const localQuizScore = parseInt(localStorage.getItem("stitchlab_quiz_score") || "0", 10);
        const localQuizAttempts = parseInt(localStorage.getItem("stitchlab_quiz_attempts") || "0", 10);
        const localAnalyzedCount = parseInt(localStorage.getItem("stitchlab_analyzed_count") || "0", 10);
        const localCompletedWordsCount = parseInt(localStorage.getItem("stitchlab_completed_words_count") || "0", 10);
        const localStudentSemester = localStorage.getItem("stitchlab_student_semester") || "الفصل الدراسي الأول";
        
        setUserLevel(localUserLevel);
        setPoints(localPoints);
        setUnlockedLevel(localUnlockedLevel);
        setCompletedLevels(localCompletedLevels);
        setCompletedGroups(localCompletedGroups);
        setCustomFlashcards(localCustomFlashcards);
        setConversationsHad(localConversationsHad);
        setQuizScore(localQuizScore);
        setQuizAttempts(localQuizAttempts);
        setAnalyzedCount(localAnalyzedCount);
        setCompletedWordsCount(localCompletedWordsCount);
        setStudentSemester(localStudentSemester);
        
        const guestName = localStorage.getItem("stitchlab_guest_name");
        const guestLastNameChangedAt = localStorage.getItem("stitchlab_guest_lastNameChangedAt");
        if (guestName) {
          setCurrentUser({
            name: guestName,
            email: "",
            level: localUserLevel,
            lastNameChangedAt: guestLastNameChangedAt || ""
          });
        } else {
          setCurrentUser(null);
        }

        setIsDataLoaded(true);
        setAuthLoading(false);
        console.log("Progress restored successfully.");
        console.log(`[StitchLab Debug] تم استعادة التقدم بنجاح للمستخدم الزائر. النقاط: ${localPoints}، المستوى: ${localUserLevel}، الكلمات: ${localCompletedWordsCount}`);
      }
    });

    return () => unsubscribe();
  }, []);

  // Check for pending StitchLab Academy invitations once logged in
  useEffect(() => {
    if (isLoggedIn && auth.currentUser) {
      const inviteId = localStorage.getItem("stitchlab_academy_invite_id");
      const inviterName = localStorage.getItem("stitchlab_academy_inviter_name") || "زميلك";
      
      // Make sure the student is not joining their own invited class
      if (inviteId && inviteId !== auth.currentUser.uid) {
        setPendingAcademyInvite({ id: inviteId, name: inviterName });
      }
    }
  }, [isLoggedIn, currentUser]);

  // Once data is loaded for the first time, allow detecting any subsequent state mutations as unsaved changes
  useEffect(() => {
    if (isDataLoaded) {
      const t = setTimeout(() => {
        isInitialLoad.current = false;
      }, 100);
      return () => clearTimeout(t);
    } else {
      isInitialLoad.current = true;
      setHasUnsavedChanges(false);
    }
  }, [isDataLoaded]);

  // Check Google Drive for any existing backup
  const checkGoogleDriveForBackup = async (token: string, silent = true) => {
    try {
      console.log("StitchLab Drive: Checking for backup...");
      const file = await findBackupFile(token);
      if (file) {
        setDriveFileId(file.id);
        const backup = await getBackupContent(token, file.id);
        if (backup) {
          const drivePoints = backup.Achievements?.points || 0;
          const driveWords = backup.WordCounter?.completedWordsCount || 0;
          console.log(`StitchLab Drive: Backup found with points: ${drivePoints} (local points: ${points})`);
          
          setCloudDriveBackup({
            id: file.id,
            modifiedTime: file.modifiedTime,
            level: backup.Level,
            points: drivePoints,
            updatedAt: backup.updatedAt || new Date().toISOString()
          });

          // Check if Google Drive backup is newer or has superior progress than local storage
          if (drivePoints > points || driveWords > completedWordsCount) {
            setShowRestoreSuggestion(true);
            if (!silent) {
              console.log("StitchLab Drive: Cloud backup is superior, suggesting restore.");
            }
          }
        }
      } else {
        console.log("StitchLab Drive: No backup file found on Google Drive.");
      }
    } catch (e) {
      console.warn("StitchLab Drive: Error while checking backup:", e);
    }
  };

  // Perform Backup to Google Drive
  const backupToGoogleDriveNow = async (forceToken?: string) => {
    const token = forceToken || driveToken;
    let finalToken = token;
    if (!finalToken) {
      // Prompt sign in popup to get permission token using our custom client-configured OAuth
      try {
        const customToken = await initGoogleDriveOAuth();
        finalToken = customToken;
        setDriveToken(customToken);
        localStorage.setItem("stitchlab_drive_token", customToken);
      } catch (err) {
        console.error("Popup Auth failed:", err);
        alert("⚠️ يرجى تفويض صلاحية الوصول إلى Google Drive لإتمام النسخ الاحتياطي السحابي.");
        return;
      }
    }

    setIsBackupLoading(true);
    try {
      const progressPayload: BackupPayload = {
        Level: userLevel,
        SavedWords: customFlashcards,
        WordCounter: {
          completedWordsCount: completedWordsCount,
          analyzedCount: analyzedCount
        },
        Achievements: {
          points: points,
          unlockedLevel: unlockedLevel,
          completedLevels: completedLevels,
          completedGroups: completedGroups,
          conversationsHad: conversationsHad,
          quizScore: quizScore,
          quizAttempts: quizAttempts,
          studentSemester: studentSemester
        },
        completedWordKeys: completedWordKeys,
        skippedWordKeys: skippedWordKeys,
        updatedAt: new Date().toISOString()
      };

      // Find file ID if we don't have it yet
      let fileId = driveFileId;
      if (!fileId) {
        const file = await findBackupFile(finalToken);
        if (file) {
          fileId = file.id;
          setDriveFileId(file.id);
        }
      }

      const res = await saveBackup(finalToken, progressPayload, fileId);
      if (res && res.id) {
        setDriveFileId(res.id);
        setHasUnsavedChanges(false);
        // Refresh cloud metadata on success
        setCloudDriveBackup({
          id: res.id,
          level: userLevel,
          points: points,
          updatedAt: progressPayload.updatedAt
        });
        alert("☁️ تم النسخ الاحتياطي التلقائي والمستدام لنقاطك ومستوياتك ومحفظتك إلى Google Drive بنجاح!");
        try { playAudioFeedback(true); } catch (_) {}
      }
    } catch (err: any) {
      console.error("Backup failed:", err);
      alert("❌ عذراً، فشل إجراء النسخ الاحتياطي إلى Google Drive. يرجى تكرار المحاولة.");
    } finally {
      setIsBackupLoading(false);
    }
  };

  // Perform Restore from Google Drive
  const restoreFromGoogleDriveNow = async (forceToken?: string) => {
    const token = forceToken || driveToken;
    let finalToken = token;
    if (!finalToken) {
      try {
        const customToken = await initGoogleDriveOAuth();
        finalToken = customToken;
        setDriveToken(customToken);
        localStorage.setItem("stitchlab_drive_token", customToken);
      } catch (err) {
        console.error("Auth popup failed:", err);
        alert("⚠️ يرجى تفويض صلاحية الوصول إلى حساب Google لإجراء الاستعادة.");
        return;
      }
    }

    setIsRestoreLoading(true);
    try {
      // Find backup file
      const file = await findBackupFile(finalToken);
      if (!file) {
        alert("⚠️ عذراً! لم نجد أي ملفات تقدم دراسي محفوظة مسبقاً لحساب Google هذا على Google Drive.");
        setIsRestoreLoading(false);
        return;
      }

      const backup = await getBackupContent(finalToken, file.id);
        if (backup) {
          // Apply state restorers!
          setUserLevel((backup.Level as any) || "Intermediate");
          setCustomFlashcards(backup.SavedWords || []);
          if (backup.WordCounter) {
            setCompletedWordsCount(backup.WordCounter.completedWordsCount || 0);
            setAnalyzedCount(backup.WordCounter.analyzedCount || 0);
          }
          if (backup.Achievements) {
            setPoints(backup.Achievements.points || 0);
            setUnlockedLevel(backup.Achievements.unlockedLevel || 1);
            setCompletedLevels(backup.Achievements.completedLevels || []);
            setCompletedGroups(backup.Achievements.completedGroups || []);
            setConversationsHad(backup.Achievements.conversationsHad || 0);
            setQuizScore(backup.Achievements.quizScore || 0);
            setQuizAttempts(backup.Achievements.quizAttempts || 0);
            setStudentSemester(backup.Achievements.studentSemester || "الفصل الدراسي الأول");
          }
          if (backup.completedWordKeys) {
            setCompletedWordKeys(backup.completedWordKeys);
            localStorage.setItem("stitchlab_completed_word_keys", JSON.stringify(backup.completedWordKeys));
          }
          if (backup.skippedWordKeys) {
            setSkippedWordKeys(backup.skippedWordKeys);
            localStorage.setItem("stitchlab_skipped_word_keys", JSON.stringify(backup.skippedWordKeys));
          }
        
        setHasUnsavedChanges(false);
        setShowRestoreSuggestion(false);
        alert("🎉 تهانينا! تم استعادة جميع الإنجازات ومجلد الكلمات والمستويات بنجاح تام بنقرة واحدة!");
        try { playAudioFeedback(true); } catch (_) {}
      } else {
        alert("❌ قراءة ملف النسخة الاحتياطية فارغة أو غير متوافقة.");
      }
    } catch (err) {
      console.error("Restore failed:", err);
      alert("❌ عذراً، تعذر إنهاء عملية الاستعادة بنقرة واحدة. يرجى المحاولة بشكل لاحق.");
    } finally {
      setIsRestoreLoading(false);
    }
  };

  // Silent automatic Google Drive background backup
  const backupProgressToGoogleDrive = async () => {
    if (!driveToken || !isDataLoaded) return;
    try {
      const progressPayload: BackupPayload = {
        Level: userLevel,
        SavedWords: customFlashcards,
        WordCounter: {
          completedWordsCount: completedWordsCount,
          analyzedCount: analyzedCount
        },
        Achievements: {
          points: points,
          unlockedLevel: unlockedLevel,
          completedLevels: completedLevels,
          completedGroups: completedGroups,
          conversationsHad: conversationsHad,
          quizScore: quizScore,
          quizAttempts: quizAttempts,
          studentSemester: studentSemester
        },
        completedWordKeys: completedWordKeys,
        skippedWordKeys: skippedWordKeys,
        updatedAt: new Date().toISOString()
      };
      
      const fileId = driveFileId || (await findBackupFile(driveToken))?.id;
      const res = await saveBackup(driveToken, progressPayload, fileId);
      if (res && res.id) {
        setDriveFileId(res.id);
        setHasUnsavedChanges(false);
        console.log("StitchLab Drive: Automatic background cloud backup succeeded ☁️");
      }
    } catch (err) {
      console.warn("StitchLab Drive: Auto background backup failed:", err);
    }
  };

  // Monitor user state edits to set unsaved changes flag and save immediately to localStorage for ultimate safe offline persistence
  useEffect(() => {
    if (!isDataLoaded) return;
    
    console.log("Saving progress...");
    try {
      // Write immediately to memory cache so progress is never lost even if they close without syncing
      localStorage.setItem("stitchlab_user_level", userLevel);
      localStorage.setItem("stitchlab_points", points.toString());
      localStorage.setItem("stitchlab_unlocked_level", unlockedLevel.toString());
      localStorage.setItem("stitchlab_completed_levels", JSON.stringify(completedLevels));
      localStorage.setItem("stitchlab_completed_groups", JSON.stringify(completedGroups));
      localStorage.setItem("stitchlab_custom_cards", JSON.stringify(customFlashcards));
      localStorage.setItem("stitchlab_conversations_had", conversationsHad.toString());
      localStorage.setItem("stitchlab_quiz_score", quizScore.toString());
      localStorage.setItem("stitchlab_quiz_attempts", quizAttempts.toString());
      localStorage.setItem("stitchlab_analyzed_count", analyzedCount.toString());
      localStorage.setItem("stitchlab_completed_words_count", completedWordsCount.toString());
      localStorage.setItem("stitchlab_student_semester", studentSemester);
      
      // If logged in, also immediately update user-specific progress payload in localStorage
      if (isLoggedIn && auth.currentUser) {
        const uid = auth.currentUser.uid;
        const userProgressKey = `stitchlab_student_${uid}_progress`;
        const progressPayload = {
          uid,
          name: currentUser?.name || auth.currentUser.displayName || "طالب مميز",
          lastNameChangedAt: currentUser?.lastNameChangedAt || "",
          email: auth.currentUser.email || "",
          level: userLevel,
          points: points,
          unlockedLevel: unlockedLevel,
          completedLevels: completedLevels,
          completedGroups: completedGroups,
          customFlashcards: customFlashcards,
          conversationsHad: conversationsHad,
          quizScore: quizScore,
          quizAttempts: quizAttempts,
          analyzedCount: analyzedCount,
          completedWordsCount: completedWordsCount,
          studentSemester: studentSemester,
          updatedAt: new Date().toISOString()
        };
        localStorage.setItem(userProgressKey, JSON.stringify(progressPayload));
      }

      // Verifying if the save succeeded
      const checkPoints = localStorage.getItem("stitchlab_points");
      const checkLevel = localStorage.getItem("stitchlab_user_level");
      if (checkPoints === points.toString() && checkLevel === userLevel) {
        console.log("Progress saved successfully.");
        console.log(`[StitchLab Debug] تم حفظ التقدم بنجاح ومطابقته دائمًا. النقاط: ${points}، المستوى: ${userLevel}، الكلمات المنجزة: ${completedWordsCount}`);
      } else {
        console.warn("StitchLab Debug: Progress written but verification check failed or value mismatched.");
      }
    } catch (saveErr) {
      console.error("StitchLab Debug: Progress save failed in localStorage:", saveErr);
    }

    if (isInitialLoad.current) {
      return;
    }
    
    // Google Drive background backup trigger
    if (isLoggedIn && auth.currentUser && driveToken) {
      setHasUnsavedChanges(true);

      // Debounce Google Drive backups by 5 seconds to avoid over-spamming API limits during interactions
      const timer = setTimeout(() => {
        backupProgressToGoogleDrive();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [
    isLoggedIn,
    isDataLoaded,
    driveToken,
    userLevel, 
    points, 
    unlockedLevel, 
    completedLevels, 
    completedGroups, 
    customFlashcards, 
    conversationsHad, 
    quizScore, 
    quizAttempts, 
    analyzedCount,
    completedWordsCount,
    studentSemester,
    currentUser
  ]);

  // 🔄 LIVE FIRESTORE STUDENT DATA SYNCHRONIZATION WITH ONSNAPSHOT
  useEffect(() => {
    if (!isLoggedIn || !auth.currentUser) {
      setIsCloudSynced(false);
      return;
    }
    
    const uid = auth.currentUser.uid;
    const docRef = doc(db, "students", uid);
    
    console.log("[StitchLab Cloud Sync] Setting up live onSnapshot listener for student UID:", uid);
    
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        console.log("[StitchLab Cloud Sync] Live data received from Firestore:", data);
        
        // Update name and lastNameChangedAt if they exist in firestore live data
        if (data.name !== undefined) {
          setCurrentUser(prev => {
            if (!prev) {
              return {
                name: data.name || "طالب مميز",
                email: auth.currentUser?.email || "",
                level: data.level || "Intermediate",
                lastNameChangedAt: data.lastNameChangedAt || ""
              };
            }
            if (prev.name !== data.name || prev.lastNameChangedAt !== data.lastNameChangedAt) {
              return {
                ...prev,
                name: data.name,
                lastNameChangedAt: data.lastNameChangedAt || ""
              };
            }
            return prev;
          });
        }
        
        // Update states only if they are genuinely different to prevent loops
        if (data.points !== undefined) {
          setPoints(prev => prev !== data.points ? data.points : prev);
        }
        if (data.completedWordsCount !== undefined) {
          setCompletedWordsCount(prev => prev !== data.completedWordsCount ? data.completedWordsCount : prev);
        }
        if (data.quizAttempts !== undefined) {
          setQuizAttempts(prev => prev !== data.quizAttempts ? data.quizAttempts : prev);
        }
        if (data.quizScore !== undefined) {
          setQuizScore(prev => prev !== data.quizScore ? data.quizScore : prev);
        }
        if (data.completedGroups !== undefined) {
          setCompletedGroups(prev => JSON.stringify(prev) !== JSON.stringify(data.completedGroups) ? data.completedGroups : prev);
        }
        if (data.unlockedAdvertiserGroups !== undefined) {
          setUnlockedAdvertiserGroups(prev => JSON.stringify(prev) !== JSON.stringify(data.unlockedAdvertiserGroups) ? data.unlockedAdvertiserGroups : prev);
        }
        if (data.completedWordKeys !== undefined) {
          setCompletedWordKeys(prev => JSON.stringify(prev) !== JSON.stringify(data.completedWordKeys) ? data.completedWordKeys : prev);
        }
        if (data.skippedWordKeys !== undefined) {
          setSkippedWordKeys(prev => JSON.stringify(prev) !== JSON.stringify(data.skippedWordKeys) ? data.skippedWordKeys : prev);
        }
        if (data.level !== undefined) {
          setUserLevel(prev => prev !== data.level ? data.level : prev);
        }
        if (data.studentSemester !== undefined) {
          setStudentSemester(prev => prev !== data.studentSemester ? data.studentSemester : prev);
        }
        if (data.analyzedCount !== undefined) {
          setAnalyzedCount(prev => prev !== data.analyzedCount ? data.analyzedCount : prev);
        }
        if (data.conversationsHad !== undefined) {
          setConversationsHad(prev => prev !== data.conversationsHad ? data.conversationsHad : prev);
        }
      } else {
        console.log("[StitchLab Cloud Sync] Firestore student document not found, launching initialization...");
        setDoc(docRef, {
          name: currentUser?.name || auth.currentUser?.displayName || "طالب مميز",
          email: auth.currentUser?.email || "",
          points: points,
          completedWordsCount: completedWordsCount,
          quizAttempts: quizAttempts,
          quizScore: quizScore,
          completedGroups: completedGroups,
          unlockedAdvertiserGroups: unlockedAdvertiserGroups,
          completedWordKeys: completedWordKeys,
          skippedWordKeys: skippedWordKeys,
          level: userLevel,
          studentSemester: studentSemester,
          analyzedCount: analyzedCount,
          conversationsHad: conversationsHad,
          updatedAt: new Date().toISOString()
        }, { merge: true }).catch(err => {
          console.error("[StitchLab Cloud Sync] Error initializing empty student document:", err);
        });
      }
      setIsCloudSynced(true);
    }, (error) => {
      console.error("[StitchLab Cloud Sync] Snapshot listener failed or was cancelled:", error);
    });
    
    return () => {
      console.log("[StitchLab Cloud Sync] Cleaning up onSnapshot listener for student UID:", uid);
      unsubscribe();
    };
  }, [isLoggedIn, auth.currentUser?.uid]);

  // 📤 AUTO-SYNC BACK LOCAL PROGRESS TO FIRESTORE
  useEffect(() => {
    if (!isLoggedIn || !auth.currentUser || !isCloudSynced) return;
    
    const uid = auth.currentUser.uid;
    const docRef = doc(db, "students", uid);
    
    const timer = setTimeout(async () => {
      try {
        await setDoc(docRef, {
          points: points,
          completedWordsCount: completedWordsCount,
          quizAttempts: quizAttempts,
          quizScore: quizScore,
          completedGroups: completedGroups,
          unlockedAdvertiserGroups: unlockedAdvertiserGroups,
          completedWordKeys: completedWordKeys,
          skippedWordKeys: skippedWordKeys,
          level: userLevel,
          studentSemester: studentSemester,
          analyzedCount: analyzedCount,
          conversationsHad: conversationsHad,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        console.log("[StitchLab Cloud Sync] Auto-write complete: local updates saved successfully.");
      } catch (err) {
        console.error("[StitchLab Cloud Sync] Auto-write update failed:", err);
      }
    }, 1200); // 1.2s debounce to allow multiple interactions to bundle cleanly

    return () => clearTimeout(timer);
  }, [
    isLoggedIn,
    isCloudSynced,
    points,
    completedWordsCount,
    quizAttempts,
    quizScore,
    completedGroups,
    unlockedAdvertiserGroups,
    completedWordKeys,
    skippedWordKeys,
    userLevel,
    studentSemester,
    analyzedCount,
    conversationsHad
  ]);

  // 🔄 LIVE FIRESTORE CLASSMATES SYNCHRONIZATION
  useEffect(() => {
    if (!isLoggedIn || !auth.currentUser || classmates.length === 0) return;

    const classmateUids = classmates.map(c => c.uid).join(",");
    console.log("[StitchLab Cloud Sync] Setting up live statistics listeners for classmates:", classmateUids);

    const unsubscribers = classmates.map((cl) => {
      const studentDocRef = doc(db, "students", cl.uid);
      return onSnapshot(studentDocRef, (docSnap) => {
        if (docSnap.exists()) {
          const studentData = docSnap.data();
          setClassmates((prevList) =>
            prevList.map((item) =>
              item.uid === cl.uid
                ? {
                    ...item,
                    studentSemester: studentData.studentSemester || "الفصل الدراسي الأول",
                    completedWordsCount: studentData.completedWordsCount || 0,
                    completedGroupsCount: (studentData.unlockedAdvertiserGroups || studentData.completedGroups || []).length || 0,
                  }
                : item
            )
          );
        }
      }, (err) => {
        console.error(`[StitchLab Cloud Sync] Failed to load statistics for classmate ${cl.uid}:`, err);
      });
    });

    return () => {
      console.log("[StitchLab Cloud Sync] Cleaning up live statistics listeners for classmates:", classmateUids);
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [isLoggedIn, classmates.length, classmates.map(c => c.uid).join(",")]);

  // Alert student if they try to close the tab without committing their database updates
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "لديك تقدم ومحفظة كلمات غير محفوظة سحابياً في StitchLab. هل تريد المغادرة فعلاً؟";
        return e.returnValue;
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Study timer: counts down the daily session seconds
  useEffect(() => {
    if (!isLoggedIn || showSplash) return;
    const interval = setInterval(() => {
      setDailySecondsLeft(prev => {
        if (prev <= 0) {
          clearInterval(interval);
          return 0;
        }
        const next = prev - 1;
        localStorage.setItem("stitchlab_seconds_left", next.toString());
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isLoggedIn, showSplash]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const triggerExtraTimeAd = () => {
    if (!navigator.onLine) {
      alert("عذراً، يرجى الاتصال بالإنترنت للحصول على وقت إضافي! 📡");
      return;
    }
    if (extraAdClaimsCount >= 3) {
      alert("عذراً! لقد استهلكت الحد الأقصى للزيادات المجانية المسموح بها اليوم (3 مرات).");
      return;
    }
    
    setDailySecondsLeft(prevSecs => {
      const next = prevSecs + (15 * 60); // +15 mins
      localStorage.setItem("stitchlab_seconds_left", next.toString());
      return next;
    });
    setExtraAdClaimsCount(prevClaims => {
      const next = Math.min(3, prevClaims + 1);
      localStorage.setItem("stitchlab_extra_ad_claims", next.toString());
      return next;
    });
    alert("🎉 مبارك! تمت إضافة 15 دقيقة إضافية بنجاح لمواصلة التعلم.");
  };

  // Custom Google Drive Client-ID & Scopes OAuth popup helper
  const initGoogleDriveOAuth = () => {
    return new Promise<string>((resolve, reject) => {
      // Clear any previous token to prevent false triggers
      localStorage.removeItem("stitchlab_drive_token");

      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || "658966518868-rdk28hfhp5bdvf73nl2s6r9rpriupchh.apps.googleusercontent.com";
      const redirectUri = `${window.location.origin}/auth/callback`;
      const scope = "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive.appdata";
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth` +
        `?client_id=${encodeURIComponent(clientId)}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_type=token` +
        `&scope=${encodeURIComponent(scope)}` +
        `&include_granted_scopes=true`;

      const width = 600;
      const height = 650;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      console.log("StitchLab custom OAuth flow: Opening popup with client_id:", clientId);
      const popup = window.open(
        authUrl,
        "google_drive_oauth",
        `width=${width},height=${height},top=${top},left=${left},scrollbars=yes`
      );

      if (!popup) {
        alert("⚠️ تم حجب النافذة المنبثقة! يرجى السماح بالنوافذ المنبثقة لـ StitchLab لتفعيل Google Drive.");
        reject(new Error("Popup blocked"));
        return;
      }

      const messageListener = (event: MessageEvent) => {
        // Validate origin matches current scheme and host
        if (event.origin !== window.location.origin) return;

        if (event.data?.type === 'OAUTH_AUTH_SUCCESS' && event.data?.token) {
          window.removeEventListener('message', messageListener);
          resolve(event.data.token);
        } else if (event.data?.type === 'OAUTH_AUTH_ERROR') {
          window.removeEventListener('message', messageListener);
          reject(new Error(event.data?.error || "Auth rejected by Google"));
        }
      };

      window.addEventListener('message', messageListener);

      const interval = setInterval(() => {
        // Active polling of localStorage (perfect fallback for when window.opener is null because of manual account typing)
        const tokenFromStorage = localStorage.getItem("stitchlab_drive_token");
        if (tokenFromStorage) {
          clearInterval(interval);
          window.removeEventListener('message', messageListener);
          try {
            if (popup && !popup.closed) {
              popup.close();
            }
          } catch (_) {}
          resolve(tokenFromStorage);
          return;
        }

        if (popup.closed) {
          clearInterval(interval);
          window.removeEventListener('message', messageListener);
          
          // Last check just in case
          const finalToken = localStorage.getItem("stitchlab_drive_token");
          if (finalToken) {
            resolve(finalToken);
          } else {
            reject(new Error("Popup closed by student"));
          }
        }
      }, 1000);
    });
  };

  // Handle email login & registration
  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreedToTerms) {
      setAuthError("يرجى الموافقة على شروط الاستخدام وسياسة الخصوصية للمتابعة وإكمال عملية التسجيل.");
      return;
    }
    if (!email || !password) {
      setAuthError("يرجى إدخال البريد الإلكتروني وكلمة المرور.");
      return;
    }
    setAuthError("");
    setAuthLoading(true);
    try {
      const { signInWithEmailAndPassword } = await import("firebase/auth");
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      // Update/reload verification status
      await userCredential.user.reload();
      if (!userCredential.user.emailVerified) {
        setShowEmailVerificationScreen(true);
        setShowContinueScreen(false);
      } else {
        setShowEmailVerificationScreen(false);
        setShowContinueScreen(false);
        setIsLoggedIn(true);
      }
    } catch (err: any) {
      console.error("Email login failed:", err);
      let errMsg = "فشل تسجيل الدخول. يرجى التثبت من البريد الإلكتروني وكلمة المرور.";
      if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password" || err.code === "auth/user-not-found") {
        errMsg = "البريد الإلكتروني أو كلمة المرور غير صحيحة. يرجى التثبت والمحاولة مجددًا.";
      } else if (err.code === "auth/invalid-email") {
        errMsg = "صيغة البريد الإلكتروني غير صالحة.";
      }
      setAuthError(errMsg);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreedToTerms) {
      setAuthError("يرجى الموافقة على شروط الاستخدام وسياسة الخصوصية للمتابعة وإكمال عملية التسجيل.");
      return;
    }
    if (!email || !password) {
      setAuthError("يرجى ملء جميع الحقول المطلوبة (البريد، كلمة المرور).");
      return;
    }
    if (password.length < 6) {
      setAuthError("يجب ألا تقل كلمة المرور عن 6 أحرف.");
      return;
    }
    setAuthError("");
    setAuthLoading(true);
    try {
      const { createUserWithEmailAndPassword, updateProfile, sendEmailVerification } = await import("firebase/auth");
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      const fallbackName = email.split('@')[0] || "طالب StitchLab";
      await updateProfile(userCredential.user, { displayName: fallbackName });
      
      // Send verification link immediately to new student inbox
      try {
        await sendEmailVerification(userCredential.user);
      } catch (verificationErr) {
        console.error("Verification email sending failed:", verificationErr);
      }
      
      // Intercept with verification pending flow
      setShowEmailVerificationScreen(true);
      setShowContinueScreen(false);
    } catch (err: any) {
      console.error("Email registration failed:", err);
      let errMsg = "فشل إنشاء الحساب. يرجى التثبت من صحة البريد الإلكتروني والمحاولة مرة أخرى.";
      if (err.code === "auth/email-already-in-use") {
        errMsg = "هذا البريد الإلكتروني مستخدم بالفعل وحسابك مسجل مسبقًا.";
      } else if (err.code === "auth/invalid-email") {
        errMsg = "صيغة البريد الإلكتروني غير صالحة.";
      } else if (err.code === "auth/weak-password") {
        errMsg = "كلمة المرور ضعيفة جدًا ونقترح اختيار كلمة مرور أقوى.";
      }
      setAuthError(errMsg);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setAuthError("يرجى إدخال البريد الإلكتروني لإعادة تعيين كلمة المرور.");
      return;
    }
    setAuthError("");
    setAuthSuccessMessage("");
    setAuthLoading(true);
    try {
      const { sendPasswordResetEmail } = await import("firebase/auth");
      await sendPasswordResetEmail(auth, email);
      if (auth.currentUser?.uid) {
        localStorage.setItem(`stitchlab_pwd_extracted_${auth.currentUser.uid}`, "true");
        window.dispatchEvent(new CustomEvent("stitchlab_account_type_changed", {
          detail: { uid: auth.currentUser.uid, hasPassword: true }
        }));
      }
      setAuthSuccessMessage("تم إرسال رابط/كود إعادة تعيين كلمة المرور بنجاح! يرجى التحقق من بريدك الإلكتروني (والرسائل غير المرغوب فيها Spam) وتغيير كلمة المرور بنجاح.");
    } catch (err: any) {
      console.error("Password reset error:", err);
      let errMsg = "فشل إرسال رسالة تعيين كلمة المرور. يرجى مراجعة البريد والمحاولة مرة أخرى.";
      if (err.code === "auth/user-not-found") {
        errMsg = "لم نجد حساباً مسجلاً بهذا البريد الإلكتروني. يرجى التحقق منه.";
      } else if (err.code === "auth/invalid-email") {
        errMsg = "صيغة البريد الإلكتروني غير صالحة.";
      }
      setAuthError(errMsg);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleActivateDrive = async () => {
    setAuthError("");
    setAuthLoading(true);
    try {
      // Direct OAuth with configured Client ID and Scope
      const token = await initGoogleDriveOAuth();
      setDriveToken(token);
      localStorage.setItem("stitchlab_drive_token", token);
      
      // Attempt to immediately sync backup
      await checkGoogleDriveForBackup(token, false);
      
      setGoogleSuccessMsg("تم تسجيل دخولك بنجاح");
      try { playAudioFeedback(true); } catch (_) {}
      
      setTimeout(() => {
        setIsLoggedIn(true);
        setShowContinueScreen(false);
        setGoogleSuccessMsg("");
      }, 2500);
    } catch (err: any) {
      console.error("Google Drive connection failed:", err);
      setAuthError("لم نتمكن من ربط Google Drive. يرجى المحاولة مرة أخرى للحصول على ميزة الحفظ السحابي التلقائي.");
    } finally {
      setAuthLoading(false);
    }
  };

  // Auth: handle Google Sign-In via Firebase Popup
  const handleGoogleSignIn = async () => {
    if (!agreedToTerms) {
      setAuthError("يرجى الموافقة على شروط الاستخدام وسياسة الخصوصية للمتابعة وإكمال عملية التسجيل.");
      return;
    }
    setAuthError("");
    setAuthLoading(true);
    try {
      const { GoogleAuthProvider } = await import("firebase/auth");
      await signInWithPopup(auth, googleProvider);
      console.log("StitchLab Auth: Google Sign-In successful with basic credentials.");
    } catch (err: any) {
      console.error("Google Sign-In failed:", err);
      const errStr = err.message || "";
      const isUnauthorizedDomain = err.code === "auth/unauthorized-domain" || errStr.includes("auth/unauthorized-domain") || errStr.includes("unauthorized-domain");
      
      if (isUnauthorizedDomain) {
        const currentHost = window.location.hostname;
        setAuthError(
          `⚠️ خطأ: النطاق الحالي (${currentHost}) غير مصرح به في إعدادات Firebase لخدمة تسجيل الدخول بـ Google.\n\n` +
          `لحل هذه المشكلة في ثوانٍ وتفعيل الدخول السريع:\n` +
          `1️⃣ اذهب إلى كونسول Firebase (console.firebase.google.com) لمشروعك "stitchlab-42087".\n` +
          `2️⃣ انتقل إلى زر Authentication 👥 ثم اختر التبويب Settings ⚙️ بالكلية.\n` +
          `3️⃣ من خيار Authorized domains (النطاقات المصرح بها) اضغط على زر "Add domain".\n` +
          `4️⃣ أضف النطاقات التالية:\n` +
          `   • ${currentHost}\n` +
          `   • stitchlab2.vercel.app\n` +
          `   • vercel.app\n` +
          `   • ais-pre-s3w4brjysehjqipqfcuhgi-220375696903.europe-west2.run.app\n` +
          `   • localhost\n\n` +
          `🔄 بعد الإضافة، قم بإعادة تنشيط الصفحة وحاول تسجيل الدخول مرة أخرى بحساب Google الخاص بك لتفادي العائق!`
        );
      } else if (err.message && err.message.includes("auth/popup-closed-by-user")) {
        setAuthError("تم إغلاق نافذة تسجيل الدخول قبل إكمال العملية. يرجى المحاولة مجددًا.");
      } else {
        setAuthError(err.message || "فشل تسجيل الدخول عبر Google. يرجى المحاولة مرة أخرى.");
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      if (hasUnsavedChanges) {
        const uid = auth.currentUser ? auth.currentUser.uid : "guest";
        const progressPayload = {
          uid,
          name: currentUser?.name || auth.currentUser?.displayName || "طالب مميز",
          email: auth.currentUser?.email || "",
          level: userLevel,
          points: points,
          unlockedLevel: unlockedLevel,
          completedLevels: completedLevels,
          completedGroups: completedGroups,
          customFlashcards: customFlashcards,
          conversationsHad: conversationsHad,
          quizScore: quizScore,
          quizAttempts: quizAttempts,
          analyzedCount: analyzedCount,
          completedWordsCount: completedWordsCount,
          studentSemester: studentSemester,
          updatedAt: new Date().toISOString()
        };
        localStorage.setItem(`stitchlab_student_${uid}_progress`, JSON.stringify(progressPayload));
        setHasUnsavedChanges(false);
      }
      await signOut(auth);
      // Clean up session caches
      localStorage.removeItem("stitchlab_user");
      localStorage.removeItem("stitchlab_completed_groups");
      localStorage.removeItem("stitchlab_custom_cards");
      localStorage.removeItem("stitchlab_unlocked_level");
      localStorage.removeItem("stitchlab_completed_levels");
      localStorage.removeItem("stitchlab_analyzed_count");
      localStorage.removeItem("stitchlab_learning_timer_seconds");
      setHasUnsavedChanges(false);
    } catch (e) {
      console.error("Sign out fail:", e);
    }
  };

  const LEARNING_LEVELS = [
    {
      number: 1,
      title: "الترحيب والتعارف الأساسي",
      englishTitle: "Greetings & Small Talk",
      description: "تبادل التحيات الودودة والتعريف عن نفسك واهتماماتك الشخصية واليومية في مدينة لندن الهادئة مع ليندا.",
      bilingualGoal: "الهدف: التحدث بطلاقة لمبادلة التحيات واجتياز كسر الجمود (Ice-breaking).",
      colorClass: "bg-[#f2a2b1] text-white border-[#fbcfe8] shadow-pink-250/20",
      icon: "🌸",
      personaId: "linda",
      vocabTip: "المفردات المفتاحية: Pleasure, Soho, Looking forward to, Cozy cafe"
    },
    {
      number: 2,
      title: "طلب القهوة والحديث في المقاهي",
      englishTitle: "Ordering Coffee & Brunch",
      description: "طلب فنجان من القهوة والحلوى، وإجراء حوار بسيط مع نادلة المقهى سارة في مقهى Sunny Side Brunch بنيويورك.",
      bilingualGoal: "الهدف: صياغة جمل الطلب المهذبة وتركيبات الوجبات الخفيفة والتبادل المالي.",
      colorClass: "bg-[#c0c6f4] text-white border-[#e0e7ff] shadow-indigo-250/20",
      icon: "☕",
      personaId: "sarah",
      vocabTip: "المفردات المفتاحية: Pancakes, Espresso, Sunny-side up, Bill, please"
    },
    {
      number: 3,
      title: "التقديم الوظيفي ومقابلة العمل",
      englishTitle: "Formal Job Interview Prep",
      description: "محاكاة مقابلة توظيف رسمية وشديدة الاحترافية مع جاك لتقييم المهارات وسيرتك الذاتية ومبررات التوظيف.",
      bilingualGoal: "الهدف: إتقان التعبير عن مشاريعك السابقة، وطموحاتك، والمصطلحات المهنية للمبتكرين.",
      colorClass: "bg-[#aadae9] text-slate-800 border-[#e0f2fe] shadow-sky-250/20",
      icon: "💼",
      personaId: "jack",
      vocabTip: "المفردات المفتاحية: Background, Innovation, Team player, Accomplish"
    },
    {
      number: 4,
      title: "عبور جوازات السفر والمطار الدولي",
      englishTitle: "JFK Airport Passport Control",
      description: "الوقوف في نقطة تفتيش جوازات السفر الصارمة مع الضابط آدم بجدية والإجابة على غرض الزيارة ومدة الإقامة بدقة.",
      bilingualGoal: "الهدف: صياغة إجابات واضحة وحازمة حول مستندات السفر، العناوين، والتأشيرات اللغوية.",
      colorClass: "bg-[#cad3be] text-slate-800 border-[#ecfccb] shadow-lime-250/20",
      icon: "✈️",
      personaId: "adam",
      vocabTip: "المفردات المفتاحية: Passport, Leisure, Intended duration, Landing card"
    },
    {
      number: 5,
      title: "الرحلات وحجز الفندق والخدمات",
      englishTitle: "Hotel Checkout & Room Request",
      description: "مكالمة موظف الفندق لطلب ترقية لغرفتك أو الاستفسار عن المرافق ومواعيد الخروج في رحلتك القادمة لبريطانيا.",
      bilingualGoal: "الهدف: ممارسة الطلبات غير المباشرة والتفاوض حول السعر والخدمات المشمولة.",
      colorClass: "bg-[#e9ccd0] text-slate-850 border-[#fce7f3] shadow-fuchsia-250/20",
      icon: "🏨",
      personaId: "linda",
      vocabTip: "المفردات المفتاحية: Reservation, Amenities, Complementary shuttle, Deluxe suite"
    },
    {
      number: 6,
      title: "التطرق للهوايات والأصدقاء بمرح",
      englishTitle: "Leisure Activities & Daily Vibe",
      description: "حوار دافئ حول أسلوب حياتك، الكتب المفضلة، المسلسلات أو الأفلام التي تحب مشاهدتها لرفع عفوية التواصل.",
      bilingualGoal: "الهدف: استخدام الزمن المضارع البسيط والماضي العفوي لوصف مغامراتك ونمطك الخاص.",
      colorClass: "bg-[#bfcaea] text-[#2d3748] border-[#e0e7ff] shadow-indigo-150/40",
      icon: "🎨",
      personaId: "linda",
      vocabTip: "المفردات المفتاحية: Passionate about, Binge-watching, Genre, Outdoor activities"
    },
    {
      number: 7,
      title: "التسوق المالي والنزاعات الفندقية",
      englishTitle: "Shopping & Bill Discrepancies",
      description: "التفاوض اللبق مع سارة حول فاتورة غير صحيحة أو استرجاع منتج تالف بكياسة وكفاءة نحوية ممتازة.",
      bilingualGoal: "الهدف: القدرة على الاعتراض والتعبير عن الرفض اللطيف والتفاوض بلغة راقية.",
      colorClass: "bg-[#adddeb] text-[#1a202c] border-[#e0f2fe] shadow-sky-150/40",
      icon: "🛍️",
      personaId: "sarah",
      vocabTip: "المفردات المفتاحية: Refund, Defective product, Overcharged bill, Policy"
    },
    {
      number: 8,
      title: "شرح الحالات الطارئة والاتصال بالطبيب",
      englishTitle: "Emergency Calls & Dr. Visit",
      description: "محاكاة مكالمة طارئة لوصف عارض صحي بدقة، أو الاستفسار عن العلاج في عيادة أمريكية.",
      bilingualGoal: "الهدف: التعرف على المصطلحات العيادية وطرح أسئلة تفصيلية حول السلامة البدنية.",
      colorClass: "bg-[#d6d9ce] text-[#2d3748] border-[#f1f5f9] shadow-slate-150/40",
      icon: "🩺",
      personaId: "adam",
      vocabTip: "المفردات المفتاحية: Prescription, Symptoms, Sore throat, Appointment slot"
    },
    {
      number: 9,
      title: "التفاوض النهائي وإقناع الإدارة",
      englishTitle: "Persuasion & High-level Negotiation",
      description: "مواجهة جاك للحصول على ترقية أو مناقشة شروط العقد الجديد بهدوء وإقناع لغوي تام باستخدام استراتيجيات دقيقة.",
      bilingualGoal: "الهدف: ممارسة صياغات الإقناع وبناء الحجج الداعمة واجتياز الاعتراضات القيادية.",
      colorClass: "bg-[#eecbd2] text-[#2d3748] border-[#ffe4e6] shadow-rose-150/40",
      icon: "☄️",
      personaId: "jack",
      vocabTip: "المفردات المفتاحية: Leverage, Salary review, Aligns with goals, Career objective"
    }
  ];

  const completeLevel = (lvlNum: number) => {
    if (!completedLevels.includes(lvlNum)) {
      const nextCompleted = [...completedLevels, lvlNum];
      setCompletedLevels(nextCompleted);
      localStorage.setItem("stitchlab_completed_levels", JSON.stringify(nextCompleted));
      
      const nextLvl = Math.min(9, lvlNum + 1);
      if (nextLvl > unlockedLevel) {
        setUnlockedLevel(nextLvl);
        localStorage.setItem("stitchlab_unlocked_level", nextLvl.toString());
      }
    }
  };

  const resetAllLevelsProgress = () => {
    setUnlockedLevel(1);
    setCompletedLevels([]);
    localStorage.setItem("stitchlab_unlocked_level", "1");
    localStorage.setItem("stitchlab_completed_levels", JSON.stringify([]));
  };

  const handleForceSaveProgress = (overrides?: Partial<{
    completedGroups: string[];
    completedWordsCount: number;
    unlockedLevel: number;
    completedLevels: number[];
    completedWordKeys: string[];
    skippedWordKeys: string[];
  }>) => {
    console.log("[StitchLab] Forcing immediate, synchronous save to localStorage...");
    try {
      const finalCompletedGroups = overrides?.completedGroups ?? completedGroups;
      const finalCompletedWordsCount = overrides?.completedWordsCount ?? completedWordsCount;
      const finalUnlockedLevel = overrides?.unlockedLevel ?? unlockedLevel;
      const finalCompletedLevels = overrides?.completedLevels ?? completedLevels;
      const finalCompletedWordKeys = overrides?.completedWordKeys ?? completedWordKeys;
      const finalSkippedWordKeys = overrides?.skippedWordKeys ?? skippedWordKeys;

      localStorage.setItem("stitchlab_completed_groups", JSON.stringify(finalCompletedGroups));
      localStorage.setItem("stitchlab_completed_words_count", finalCompletedWordsCount.toString());
      localStorage.setItem("stitchlab_unlocked_level", finalUnlockedLevel.toString());
      localStorage.setItem("stitchlab_completed_levels", JSON.stringify(finalCompletedLevels));

      localStorage.setItem("stitchlab_user_level", userLevel);
      localStorage.setItem("stitchlab_points", points.toString());
      localStorage.setItem("stitchlab_custom_cards", JSON.stringify(customFlashcards));
      localStorage.setItem("stitchlab_conversations_had", conversationsHad.toString());
      localStorage.setItem("stitchlab_quiz_score", quizScore.toString());
      localStorage.setItem("stitchlab_quiz_attempts", quizAttempts.toString());
      localStorage.setItem("stitchlab_analyzed_count", analyzedCount.toString());
      localStorage.setItem("stitchlab_student_semester", studentSemester);
      localStorage.setItem("stitchlab_completed_word_keys", JSON.stringify(finalCompletedWordKeys));
      localStorage.setItem("stitchlab_skipped_word_keys", JSON.stringify(finalSkippedWordKeys));

      if (isLoggedIn && auth.currentUser) {
        const uid = auth.currentUser.uid;
        const userProgressKey = `stitchlab_student_${uid}_progress`;
        const progressPayload = {
          uid,
          name: currentUser?.name || auth.currentUser.displayName || "طالب مميز",
          lastNameChangedAt: currentUser?.lastNameChangedAt || "",
          email: auth.currentUser.email || "",
          level: userLevel,
          points: points,
          unlockedLevel: finalUnlockedLevel,
          completedLevels: finalCompletedLevels,
          completedGroups: finalCompletedGroups,
          unlockedAdvertiserGroups: unlockedAdvertiserGroups,
          completedWordKeys: finalCompletedWordKeys,
          skippedWordKeys: finalSkippedWordKeys,
          customFlashcards: customFlashcards,
          conversationsHad: conversationsHad,
          quizScore: quizScore,
          quizAttempts: quizAttempts,
          analyzedCount: analyzedCount,
          completedWordsCount: finalCompletedWordsCount,
          studentSemester: studentSemester,
          updatedAt: new Date().toISOString()
        };
        localStorage.setItem(userProgressKey, JSON.stringify(progressPayload));
      }

      // Verify and match saved status
      const checkPoints = localStorage.getItem("stitchlab_points");
      const checkLevel = localStorage.getItem("stitchlab_user_level");
      if (checkPoints === points.toString() && checkLevel === userLevel) {
        console.log("[StitchLab Debug] Forced save completed and verified completely.");
      }
    } catch (err) {
      console.error("[StitchLab Debug] Immediate force-save failed:", err);
    }
  };

  const getActiveChatMessages = (): ChatMessage[] => {
    const history = chatHistoryMap[selectedPersona.id];
    if (history && history.length > 0) {
      return history;
    }
    return [
      {
        id: "starter",
        role: "model",
        text: selectedPersona.starterMessage,
        translation: selectedPersona.starterMessageTranslation,
        timestamp: new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })
      }
    ];
  };

  // Send message API caller to Backend Proxy
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInputValue.trim() || chatLoading) return;

    const userMsgText = chatInputValue.trim();
    setChatInputValue("");

    const timeString = new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
    const userMessage: ChatMessage = {
      id: Math.random().toString(36).substring(7),
      role: "user",
      text: userMsgText,
      timestamp: timeString
    };

    const currentMsgs = getActiveChatMessages();
    const updatedMsgs = [...currentMsgs, userMessage];
    const nextHistoryMap = {
      ...chatHistoryMap,
      [selectedPersona.id]: updatedMsgs
    };
    setChatHistoryMap(nextHistoryMap);
    localStorage.setItem("stitchlab_chat_history_map", JSON.stringify(nextHistoryMap));

    setConversationsHad(prev => prev + 1);
    setChatLoading(true);

    try {
      const reqPayload = {
        message: userMsgText,
        history: updatedMsgs.slice(-10).map(m => ({
          role: m.role,
          text: m.text
        })),
        personaId: selectedPersona.id,
        personaName: selectedPersona.name,
        personaDescription: selectedPersona.role,
        userLevel: userLevel
      };

      const response = await fetch("/api/gemini/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reqPayload)
      });

      if (!response.ok) {
        throw new Error("فشل في استلام رد ذكي من خادم stitchLab");
      }

      const rawData = await response.json();
      
      const botMessage: ChatMessage = {
        id: Math.random().toString(36).substring(7),
        role: "model",
        text: rawData.reply || "I didn't quite catch that. Let's try again!",
        translation: rawData.arabicTranslation,
        feedback: rawData.feedback,
        vocabularySuggestions: rawData.vocabularySuggestions,
        timestamp: new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })
      };

      const finalMsgs = [...updatedMsgs, botMessage];
      const finalHistoryMap = {
        ...chatHistoryMap,
        [selectedPersona.id]: finalMsgs
      };
      setChatHistoryMap(finalHistoryMap);
      localStorage.setItem("stitchlab_chat_history_map", JSON.stringify(finalHistoryMap));
    } catch (err) {
      console.error(err);
      const errorMsg: ChatMessage = {
        id: Math.random().toString(36).substring(7),
        role: "model",
        text: "I am having trouble connecting to the network right now. Could you check again later?",
        translation: "أواجه صعوبة مؤقتة في ربط الخوادم الشبكية. يرجى إعادة المحاولة.",
        timestamp: new Date().toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })
      };
      const finalMsgs = [...updatedMsgs, errorMsg];
      const finalHistoryMap = {
        ...chatHistoryMap,
        [selectedPersona.id]: finalMsgs
      };
      setChatHistoryMap(finalHistoryMap);
    } finally {
      setChatLoading(false);
    }
  };

  const clearChatHistory = () => {
    const finalHistoryMap = {
      ...chatHistoryMap,
      [selectedPersona.id]: []
    };
    setChatHistoryMap(finalHistoryMap);
    localStorage.setItem("stitchlab_chat_history_map", JSON.stringify(finalHistoryMap));
  };

  // Sentence dissecetion API trigger
  const handleAnalyzeSentence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!analyzerInputValue.trim() || analyzerLoading) return;

    setAnalyzerLoading(true);
    setAnalyzerError("");
    setAnalyzerResult(null);

    try {
      const response = await fetch("/api/gemini/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sentence: analyzerInputValue })
      });

      if (!response.ok) {
        throw new Error("فشل الخادم في تشريح الجملة المدخلة.");
      }

      const resData = await response.json();
      setAnalyzerResult(resData);
      
      // Increment the analyzed count for achievements tracking
      try {
        const curCount = parseInt(localStorage.getItem("stitchlab_analyzed_count") || "0", 10);
        localStorage.setItem("stitchlab_analyzed_count", (curCount + 1).toString());
      } catch (err) {}
    } catch (e: any) {
      setAnalyzerError(e.message || "عفواً، فشل الاتصال بمحلل القواعد الاصطناعي.");
    } finally {
      setAnalyzerLoading(false);
    }
  };

  const handleQuickPaste = (phrase: string, target: "chat" | "analyzer") => {
    if (target === "chat") {
      setChatInputValue(phrase);
    } else {
      setAnalyzerInputValue(phrase);
    }
  };

  // Quiz submission triggering
  const handleGenerateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    setQuizLoading(true);
    setQuizError("");
    setSubmittedQuiz(false);
    setSelectedAnswers({});
    setQuizQuestions([]);

    const selectedTopic = quizCustomTopic.trim() || quizTopic;

    try {
      const response = await fetch("/api/gemini/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: selectedTopic,
          level: quizLevel
        })
      });

      if (!response.ok) {
        throw new Error("تعذر جلب أسئلة الاختبار التفاعلية.");
      }

      const data = await response.json();
      if (data.questions && data.questions.length > 0) {
        setQuizQuestions(data.questions);
        setQuizAttempts(prev => prev + 1);
      } else {
        throw new Error("لم ترجع الصيغة بهيئة سليمة. حاول مرة أخرى.");
      }
    } catch (err: any) {
      setQuizError(err.message || "حدث خطأ غير متوقع أثناء توليد الاختبار.");
    } finally {
      setQuizLoading(false);
    }
  };

  const handleSelectAnswer = (qIndex: number, optionIndex: number) => {
    if (submittedQuiz) return;
    setSelectedAnswers(prev => ({
      ...prev,
      [qIndex]: optionIndex
    }));
  };

  const handleGradeQuiz = () => {
    if (Object.keys(selectedAnswers).length < quizQuestions.length) {
      alert("الرجاء الإجابة على جميع الأسئلة لتصحيح النتيجة!");
      return;
    }
    
    let correctCount = 0;
    quizQuestions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.answerIndex) {
        correctCount++;
      }
    });

    const scorePercent = Math.round((correctCount / quizQuestions.length) * 100);
    setQuizScore(prev => Math.max(prev, scorePercent));
    setSubmittedQuiz(true);

    // Play immediate audio check (Great job or Try again) based on target score threshold
    if (scorePercent >= 70) {
      playAudioFeedback(true);
    } else {
      playAudioFeedback(false);
    }
  };

  // Add custom vocabulary deck Flashcard
  const handleAddFlashcard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCardWord.trim() || !newCardMeaning.trim() || !newCardExample.trim()) {
      alert("الطلب يحتاج الكلمة، المعنى بالعربية ومثال توضيحي لإضافتها!");
      return;
    }

    const uniqueId = "custom-" + Math.random().toString(36).substring(7);
    const newCard: Flashcard = {
      id: uniqueId,
      word: newCardWord.trim(),
      ipa: newCardIpa.trim() || "/.../",
      partOfSpeech: newCardPartOfSpeech,
      meaning: newCardMeaning.trim(),
      example: newCardExample.trim(),
      exampleTranslation: newCardExampleTranslation.trim() || "ترجمة المثال متوفرة كمرجع تلقائي للقارئ.",
      level: newCardLevel
    };

    setCustomFlashcards(prev => [newCard, ...prev]);
    
    setNewCardWord("");
    setNewCardIpa("");
    setNewCardMeaning("");
    setNewCardExample("");
    setNewCardExampleTranslation("");
    setShowAddCardModal(false);
  };

  const deleteCustomFlashcard = (id: string) => {
    setCustomFlashcards(prev => prev.filter(c => c.id !== id));
  };

  const allFlashcards = [...customFlashcards, ...PRESET_FLASHCARDS];

  const filteredFlashcards = allFlashcards.filter((card) => {
    const matchesLevel = flashcardLevelFilter === "All" || card.level === flashcardLevelFilter;
    const matchesSearch = 
      card.word.toLowerCase().includes(flashcardSearch.toLowerCase()) ||
      card.meaning.includes(flashcardSearch) ||
      card.example.toLowerCase().includes(flashcardSearch.toLowerCase());
    return matchesLevel && matchesSearch;
  });

  if (showSplash) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-gradient-to-br from-[#FFF0F3] via-[#FFE3E8] to-[#FFD6DC] text-slate-800 text-center select-none font-sans relative overflow-hidden" dir="rtl">
        {/* Ambient background blur elements */}
        <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-pink-400/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-purple-300/10 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="max-w-md w-full relative z-10 space-y-6">
          <div className="text-center space-y-6 animate-fadeIn">
            <div className="inline-flex items-center justify-center w-36 h-36 rounded-[40px] bg-white border border-pink-100 shadow-2xl overflow-hidden p-2.5 mx-auto">
              <img 
                src="https://raw.githubusercontent.com/stitchlab1/stitchlab2/0ceec11a5ca77c5d4607a90cab424bc9ec880155/stitchlab_icon_hd.png" 
                alt="StitchLab Logo" 
                referrerPolicy="no-referrer" 
                className="w-full h-full object-contain rounded-[32px]" 
              />
            </div>
            <div className="space-y-2">
              <h1 className="text-5xl font-black tracking-tight font-sans">
                <span className="text-purple-600">Stitch</span>
                <span className="text-pink-500">Lab</span>
              </h1>
            </div>
            {/* Progress Bar Indicator for 10 seconds */}
            <div className="w-56 h-2 md:h-2.5 bg-pink-100/60 mx-auto rounded-full overflow-hidden relative border border-pink-200/50">
              <motion.div 
                className="h-full bg-gradient-to-r from-purple-600 via-pink-500 to-purple-700 rounded-full"
                initial={{ width: "0%" }}
                animate={{ width: "100%" }}
                transition={{ duration: 10, ease: "linear" }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isOnline) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 bg-gradient-to-br from-[#FFF0F3] via-[#FFE3E8] to-[#FFD6DC] text-slate-800 text-center select-none font-sans" dir="rtl">
        <div className="bg-white/90 backdrop-blur-md rounded-[32px] border border-pink-200/60 p-8 max-w-sm w-full shadow-2xl space-y-6">
          <div className="w-20 h-20 bg-rose-100 text-rose-500 rounded-[24px] flex items-center justify-center mx-auto border border-rose-200/50 text-4xl animate-bounce">
            📶
          </div>
          <h2 className="text-2xl font-black text-purple-950">انقطع الاتصال بالإنترنت!</h2>
          <p className="text-sm font-bold text-slate-600 leading-relaxed">
            يرجى التأكد من اتصالك بالإنترنت لمتابعة رحلتك التعليمية
          </p>
          <button 
            type="button"
            onClick={() => setIsOnline(window.navigator.onLine)} 
            className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white rounded-2xl font-extrabold transition-all shadow-md active:scale-95 text-xs cursor-pointer"
          >
            إعادة المحاولة 🔄
          </button>
        </div>
      </div>
    );
  }

  return (
    <div id="stitchlab-main" className="min-h-screen bg-slate-50 text-slate-900 font-sans antialiased selection:bg-purple-500 selection:text-white" dir="rtl">
      
      {/* 1. NOT LOGGED IN LAYOUT / OR LOADING SATELLITE */}
      {showEmailVerificationScreen && auth.currentUser ? (
        <div id="stitchlab-email-verify-step" className="flex min-h-screen flex-col items-center justify-center p-4 md:p-8 bg-gradient-to-br from-pink-50 via-[#FFF9FB] to-purple-50 text-slate-800 relative overflow-hidden" dir="rtl">
          {/* Ambient luminous flows */}
          <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-pink-400/10 rounded-full blur-[120px] pointer-events-none"></div>
          <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-purple-300/10 rounded-full blur-[120px] pointer-events-none"></div>
          
          <div className="w-full max-w-md space-y-6 relative z-10 text-center animate-fadeIn">
            <div className="space-y-2">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-white border border-pink-100 shadow-xl overflow-hidden mb-2 p-1.5">
                <img src="https://raw.githubusercontent.com/stitchlab1/stitchlab2/0ceec11a5ca77c5d4607a90cab424bc9ec880155/stitchlab_icon_hd.png" alt="stitchLab Logo" referrerPolicy="no-referrer" className="w-full h-full object-contain" />
              </div>
              <h1 id="email-verify-heading" className="text-3xl font-extrabold text-purple-950 tracking-tight">
                تأكيد البريد الإلكتروني ✉️
              </h1>
              <p className="text-sm text-purple-900/80 font-bold">
                خطوة واحدة لتفعيل حسابك والبدء!
              </p>
            </div>

            <div className="bg-white/95 backdrop-blur-md rounded-[32px] border border-pink-100/50 p-6 md:p-8 shadow-[0_25px_60px_rgba(236,72,153,0.06)] space-y-5 text-right">
              <div className="p-4 bg-purple-50 rounded-2xl border border-purple-100 text-purple-950 space-y-2 text-right">
                <p className="text-xs font-black">
                  📨 لقد أرسلنا رابط تفعيل الحساب إلى البريد الإلكتروني:
                </p>
                <p className="text-xs font-mono font-black text-pink-600 block text-right">
                  {auth.currentUser.email}
                </p>
              </div>

              <p className="text-xs leading-relaxed text-slate-600 font-bold leading-normal">
                يرجى الانتقال لعلبة الوارد في بريدك الإلكتروني والضغط على الرابط المرسل لتفعيل حسابك بنجاح. 
                <br />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  💡 إذا لم تجدها، تأكد من مراجعة صندوق الرسائل غير المرغوب فيها (Spam / Junk Mail).
                </span>
              </p>

              {authError && (
                <div className="p-4 rounded-2xl text-xs bg-rose-50 border border-rose-150 text-rose-800 flex items-start gap-2 text-right">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="leading-relaxed font-bold flex-1">{authError}</div>
                </div>
              )}

              {authSuccessMessage && (
                <div className="p-4 rounded-2xl text-xs bg-pink-50 border border-pink-100 text-pink-800 font-bold leading-relaxed text-right animate-fadeIn">
                  {authSuccessMessage}
                </div>
              )}

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={async () => {
                    setAuthLoading(true);
                    setAuthError("");
                    setAuthSuccessMessage("");
                    try {
                      await auth.currentUser?.reload();
                      if (auth.currentUser?.emailVerified) {
                        setAuthSuccessMessage("🎉 تمت عملية تفعيل حسابك بنجاح! جاري تحويلك...");
                        setTimeout(() => {
                          setShowEmailVerificationScreen(false);
                          if (isAppMode) {
                            setShowContinueScreen(false);
                            setIsLoggedIn(true);
                          } else {
                            setShowContinueScreen(true);
                          }
                          setAuthSuccessMessage("");
                        }, 1200);
                      } else {
                        setAuthError("❌ بريدك الإلكتروني غير مفعّل بعد. يرجى الضغط على الرابط المرسل لبريدك الإلكتروني للتفعيل، ثم النقر هنا مجدداً.");
                      }
                    } catch (err: any) {
                      setAuthError("فشل التحقق من التفعيل. يرجى إعادة المحاولة.");
                    } finally {
                      setAuthLoading(false);
                    }
                  }}
                  disabled={authLoading}
                  className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white font-extrabold rounded-2xl text-xs shadow-lg active:scale-95 hover:shadow-purple-500/10 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {authLoading ? (
                    <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                  ) : (
                    "لقد قمت بتفعيل بريدي بنجاح! استمر 🚀"
                  )}
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    setAuthLoading(true);
                    setAuthError("");
                    setAuthSuccessMessage("");
                    try {
                      const { sendEmailVerification } = await import("firebase/auth");
                      if (auth.currentUser) {
                        await sendEmailVerification(auth.currentUser);
                        setAuthSuccessMessage("📨 تم إعادة إرسال رابط التفعيل بنجاح! يرجى مراجعة بريدك الإلكتروني.");
                      }
                    } catch (err: any) {
                      console.error("Resend verification error:", err);
                      setAuthError("فشل إعادة إرسال رابط التفعيل. يرجى الانتظار دقيقة والمحاولة مجدداً.");
                    } finally {
                      setAuthLoading(false);
                    }
                  }}
                  disabled={authLoading}
                  className="w-full py-3 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-extrabold rounded-xl text-xs transition-all text-center cursor-pointer disabled:opacity-50"
                >
                  أعد إرسال رابط التفعيل بالبريد الإلكتروني ✉️
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    setShowEmailVerificationScreen(false);
                    await handleLogout();
                  }}
                  className="w-full py-2.5 text-[11px] text-slate-400 hover:text-rose-500 font-bold transition-all text-center cursor-pointer hover:underline"
                >
                  تسجيل الخروج والرجوع للخلف ↩
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : showContinueScreen ? (
        <div id="stitchlab-continue-step" className="flex min-h-screen flex-col items-center justify-center p-4 md:p-8 bg-gradient-to-br from-pink-50 via-[#FFF9FB] to-purple-50 text-slate-800 relative overflow-hidden" dir="rtl">
          {/* Ambient luminous flows */}
          <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-pink-400/10 rounded-full blur-[120px] pointer-events-none"></div>
          <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-purple-300/10 rounded-full blur-[120px] pointer-events-none"></div>
          
          <div className="w-full max-w-md space-y-6 relative z-10 text-center">
            <div className="space-y-2">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-white border border-pink-100 shadow-xl overflow-hidden mb-2 p-1.5 animate-bounce">
                <img src="https://raw.githubusercontent.com/stitchlab1/stitchlab2/0ceec11a5ca77c5d4607a90cab424bc9ec880155/stitchlab_icon_hd.png" alt="stitchLab Logo" referrerPolicy="no-referrer" className="w-full h-full object-contain" />
              </div>
              <h1 id="continue-heading" className="text-4xl font-extrabold text-purple-950 tracking-tight">
                هيا لنكمل 🚀
              </h1>
              <p className="text-xs text-purple-900/80 font-bold">
                لتفعيل ميزة المزامنة السحابية والحفظ التلقائي لتقدمك
              </p>
            </div>

            <div className="bg-white/95 backdrop-blur-md rounded-[32px] border border-pink-100/50 p-6 md:p-8 shadow-[0_25px_60px_rgba(236,72,153,0.06)] space-y-6 text-center">
              <p className="text-xs leading-relaxed text-slate-600 font-bold">
                لقد قمت بتسجيل الدخول بنجاح! لتبقى مهاراتك ونقاطك التفاعلية ومحفظة الكلمات محفوظة وآمنة دائمًا، يرجى تفعيل الاتصال بحساب Google Drive الخاص بك.
              </p>

              {authError && (
                <div className="p-4 mb-4 rounded-2xl text-xs bg-rose-50 border border-rose-150 text-rose-800 flex items-start gap-2 text-right" dir="rtl">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="leading-relaxed font-medium flex-1">{authError}</div>
                </div>
              )}

              {googleSuccessMsg ? (
                <div className="p-5 rounded-2xl bg-pink-50 border border-pink-100 text-pink-800 text-center text-xs font-black animate-pulse flex flex-col items-center justify-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-pink-500 text-white flex items-center justify-center text-xs font-black">✓</div>
                  <span>{googleSuccessMsg} 🌸</span>
                </div>
              ) : (
                <div className="space-y-4">
                  <button
                    onClick={handleActivateDrive}
                    disabled={authLoading}
                    className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white font-extrabold rounded-2xl text-xs shadow-lg active:scale-95 hover:shadow-purple-500/10 transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50"
                  >
                    {authLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                        <span>جاري تشغيل الاتصال السحابي...</span>
                      </span>
                    ) : (
                      <>
                        <Cloud className="w-5 h-5 shrink-0" />
                        <span>تنشيط Google Drive ☁️</span>
                      </>
                    )}
                  </button>

                  <div className="border-t border-dashed border-slate-100 pt-3 text-center">
                    <button
                      type="button"
                      onClick={() => setShowOAuthHelper(!showOAuthHelper)}
                      className="text-[11px] text-purple-600 hover:text-purple-700 font-extrabold focus:outline-none flex items-center justify-center gap-1 mx-auto cursor-pointer"
                    >
                      <span>💡 هل تواجه مشكلة (طلب غير صالح أو حظر الوصول)؟ اضغط للحل السريع</span>
                    </button>
                  </div>

                  {showOAuthHelper && (
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-150 text-right space-y-3 text-xs animate-fadeIn leading-relaxed max-h-[300px] overflow-y-auto">
                      <div className="flex items-center gap-2 text-purple-950 font-black border-b border-dashed border-slate-200 pb-1.5">
                        <span>⚙️ حل مشكلة حظر الوصول والمزامنة السحابية (OAuth 400)</span>
                      </div>
                      <p className="text-[10.5px] text-slate-500 font-bold">
                        هذا الخطأ يحدث عندما لا تتطابق روابط التطبيق مع الروابط المصرح بها في كونسول Google Cloud. اتبع الخطوات التالية للتصريح بها فوراً:
                      </p>
                      <ol className="list-decimal list-inside text-[10.5px] text-slate-600 space-y-2.5 font-semibold pr-1">
                        <li>
                          اذهب إلى <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-purple-600 underline font-bold">Google Cloud Console</a> لمشروعك.
                        </li>
                        <li>
                          انتقل إلى قسم <span className="font-bold">APIs & Services</span> ⬅️ <span className="font-bold">Credentials</span>.
                        </li>
                        <li>
                          قم بتحرير الـ <span className="font-bold">OAuth 2.0 Web Client ID</span> الخاص بك.
                        </li>
                        <li>
                          تحت <span className="font-bold">Authorized redirect URIs (العناوين المصرح بها لإعادة التوجيه)</span> اضغط على إضافة عنوان، ثم الصق العناوين التالية بالضبط:
                          <div className="bg-slate-900 text-slate-100 p-2 rounded-lg font-mono text-[9px] mt-1 space-y-1 select-all hover:bg-black transition-colors" dir="ltr text-left">
                            https://stitchlab2.vercel.app/auth/callback
                            <br />
                            https://vercel.app/auth/callback
                            <br />
                            http://localhost:3000/auth/callback
                            <br />
                            {window.location.origin}/auth/callback
                          </div>
                        </li>
                        <li>
                          تحت <span className="font-bold">Authorized JavaScript origins (مصادر JavaScript المصرح بها)</span> أضف العناوين التالية للسلامة أيضاً:
                          <div className="bg-slate-900 text-slate-100 p-2 rounded-lg font-mono text-[9px] mt-1 space-y-1 select-all hover:bg-black transition-colors" dir="ltr text-left">
                            https://stitchlab2.vercel.app
                            <br />
                            https://vercel.app
                            <br />
                            http://localhost:3000
                            <br />
                            {window.location.origin}
                          </div>
                        </li>
                        <li>
                          في تبويب <span className="font-bold">OAuth Consent Screen (شاشة موافقة OAuth)</span> تأكد من إدخال رابط سياسة الخصوصية <code className="text-pink-600 font-mono bg-pink-50 px-1 rounded" dir="ltr">https://stitchlab2.vercel.app/privacy-policy</code> في حقل Privacy Policy URL لتسريع عملية المراجعة وموافقة Google الفورية!
                        </li>
                        <li>
                          احفظ التعديلات وجرب المزامنة الآن لتغمر تقدمك بالسحاب ☁️!
                        </li>
                      </ol>
                    </div>
                  )}
                </div>
              )}


            </div>
          </div>
        </div>
      ) : !isLoggedIn ? (
        <main 
          id="stitchlab-auth-main"
          className="flex min-h-screen flex-col items-center justify-center p-4 md:p-8 bg-gradient-to-br from-pink-50 via-[#FFF9FB] to-purple-50 text-slate-800 relative overflow-hidden"
        >
          
          {/* Guest Challenge Invitation Card Overlay */}
          {showChallengeLanding && activeChallenge && (
            <div className="fixed inset-0 bg-[#09071f]/95 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-gradient-to-b from-[#1b1544] to-[#0e0929] border-2 border-purple-500/30 rounded-[32px] p-6 max-w-md w-full shadow-[0_0_50px_rgba(168,85,247,0.3)] text-white space-y-6 relative overflow-hidden text-center my-8"
              >
                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setShowChallengeLanding(false)}
                  className="absolute top-4 left-4 p-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full cursor-pointer transition-colors text-xs font-bold font-sans"
                >
                  ✕
                </button>

                <div className="space-y-1">
                  <span className="text-xs bg-amber-400 text-slate-950 font-black px-4 py-1.5 rounded-full inline-block animate-pulse">
                    مبارزة وتحدي نشط ⚔️🏆
                  </span>
                  <h3 className="text-xl font-black text-amber-300 pt-2 font-sans tracking-tight">
                    أنت مدعو لمبارزة {activeChallenge.challengerName}!
                  </h3>
                  <p className="text-xs text-purple-200/90 font-bold leading-relaxed">
                    لقد أرسل لك صديقك بطاقة مهارة لتحدّي الفهم والطلاقة وحفظ الكلمات.
                  </p>
                </div>

                {/* html2canvas Snapshot Image View */}
                {activeChallenge.snapshotB64 && (
                  <div className="border border-purple-500/20 rounded-2xl overflow-hidden shadow-lg shadow-purple-950/40 bg-[#120e35] relative">
                    <img 
                      src={activeChallenge.snapshotB64} 
                      alt="بطاقة نتائج المتحدي" 
                      className="w-full h-auto object-contain max-h-[250px] mx-auto md:max-h-[300px]"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#0e0929] to-transparent p-2 text-[9px] text-purple-200 font-bold text-center">
                      📸 نسخة مصوّرة من تحديات الطالب الفعلية
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="space-y-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowChallengeLanding(false);
                      try { playAudioFeedback(true); } catch (_) {}
                    }}
                    className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-xs font-black py-4 px-6 rounded-2xl cursor-pointer active:scale-95 transition-all shadow-md shadow-pink-500/20 font-sans"
                  >
                    قبول التحدي والبدء بالتسجيل الآن 🚀
                  </button>
                  <p className="text-[9px] text-slate-400 font-semibold leading-normal">
                    * قم بالتسجيل بحساب Google أو بالبريد الإلكتروني، وسوف يقبل حسابك التحدي تلقائيًا لتظهر في لوحة منافسيه!
                  </p>
                </div>

              </motion.div>
            </div>
          )}

          {/* Ambient luminous flows for modern feel */}
          <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] bg-pink-400/10 rounded-full blur-[120px] pointer-events-none"></div>
          <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-purple-300/10 rounded-full blur-[120px] pointer-events-none"></div>
          
          <div className="w-full max-w-md space-y-6 relative z-10">
            
            {/* 🎓 STITCHLAB ACADEMY PARTNER WELCOME GATEWAY CARD */}
            {showAcademyLanding && activeAcademyInviteId && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-gradient-to-br from-[#120e35] via-[#1b154c] to-[#251b66] border border-pink-500/30 rounded-[32px] p-6 shadow-2xl space-y-4 relative overflow-hidden text-right text-white"
                dir="rtl"
              >
                
                {/* Decorative glows */}
                <div className="absolute top-0 right-0 w-24 h-24 bg-pink-500/20 rounded-full blur-2xl pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500/20 rounded-full blur-2xl pointer-events-none"></div>

                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-pink-500 to-purple-600 flex items-center justify-center text-2xl shrink-0 shadow-lg">
                    🎓
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] bg-amber-400 text-slate-950 font-black px-3 py-1 rounded-full inline-block animate-pulse">
                      دعوة دراسة ومزاملة حصرية ✨
                    </span>
                    <h3 className="text-sm font-black text-white pt-1">
                      أكاديمية StitchLab للتميز والتحدث بطلاقة
                    </h3>
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 p-4 rounded-2xl space-y-2">
                  <p className="text-xs font-bold leading-relaxed text-purple-200">
                    أهلاً بك المبدع! لقد دعاك صديقك <span className="text-pink-400 font-extrabold underline">{activeAcademyInviteName || "زميلك"}</span> للانضمام إلى صفوف أكاديمية StitchLab.
                  </p>
                  <p className="text-[11px] text-slate-300 leading-relaxed font-bold">
                    بوابة آمنة تماماً تفتح للجميع مجاناً للتفاعل، وحفظ الكلمات ومشاركة تقدم المهارات ثنائياً!
                  </p>
                </div>

                <div className="space-y-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("signup");
                      const element = document.getElementById("stitchlab-brand-heading");
                      if (element) {
                        element.scrollIntoView({ behavior: "smooth" });
                      }
                    }}
                    className="w-full bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 text-white text-xs font-black py-3.5 px-6 rounded-2xl cursor-pointer active:scale-95 transition-all shadow-md shadow-pink-500/20 text-center flex items-center justify-center gap-1.5"
                  >
                    <span>قبول الدعوة وإنشاء حسابي المجاني للبدء 🚀</span>
                  </button>
                  <div className="flex justify-between items-center px-1">
                    <p className="text-[9px] text-slate-400 font-semibold leading-normal">
                      * إذا كان لديك حساب بالفعل، قم بتسجيل الدخول بالأسفل وسيقبل حسابك الدعوة فوراً.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowAcademyLanding(false)}
                      className="text-[10px] text-pink-400 hover:text-pink-300 font-bold underline shrink-0 cursor-pointer"
                    >
                      إغلاق ✕
                    </button>
                  </div>
                </div>

              </motion.div>
            )}
            
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-white border border-pink-100 shadow-xl overflow-hidden mb-2 p-1.5 animate-fadeIn">
                <img src="https://raw.githubusercontent.com/stitchlab1/stitchlab2/0ceec11a5ca77c5d4607a90cab424bc9ec880155/stitchlab_icon_hd.png" alt="stitchLab Logo" referrerPolicy="no-referrer" className="w-full h-full object-contain" />
              </div>
              <h1 id="stitchlab-brand-heading" className="text-5xl font-extrabold tracking-tight">
                <span className="text-purple-600 font-extrabold">Stitch</span>
                <span className="text-pink-500 font-black">Lab</span>
              </h1>
              <div className="w-20 h-1 bg-gradient-to-r from-purple-600 to-pink-500 mx-auto rounded-full mt-4"></div>
            </div>

            <div 
              className="bg-white/95 backdrop-blur-md rounded-[32px] border border-pink-100/50 p-6 md:p-8 shadow-[0_25px_60px_rgba(236,72,153,0.06)] relative overflow-hidden space-y-5"
              style={{ backgroundColor: "#ffffff" }}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-3xl pointer-events-none"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-pink-500/5 rounded-full blur-3xl pointer-events-none"></div>

              <div className="text-center space-y-1" style={{ borderColor: "#3d4657", color: "#6380b2" }}>
                <span className="text-xs bg-purple-100 text-purple-950 font-black px-3.5 py-1.5 rounded-full border border-purple-200 inline-block">
                  بوابة الطالب الذكية 🎓
                </span>
              </div>

                  {/* Selector Tabs (Login / Sign Up) */}
                  <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode("login");
                        setAuthError("");
                        setAuthSuccessMessage("");
                      }}
                      className={`flex-1 py-2.5 text-center text-xs font-black transition-all rounded-xl cursor-pointer ${
                        authMode === "login"
                          ? "bg-white text-purple-950 shadow-sm"
                          : "text-slate-700 hover:text-slate-900"
                      }`}
                    >
                      🗝️ تسجيل الدخول
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode("signup");
                        setAuthError("");
                        setAuthSuccessMessage("");
                      }}
                      className={`flex-1 py-1.5 text-center text-xs font-black transition-all rounded-xl cursor-pointer ${
                        authMode === "signup"
                          ? "bg-white text-purple-950 shadow-sm"
                          : "text-slate-700 hover:text-slate-900"
                      }`}
                      style={{ color: "#b82f94" }}
                    >
                      ➕ حساب جديد
                    </button>
                  </div>

              {authError && (
                <div className="p-4 rounded-2xl text-xs bg-rose-50 border border-rose-150 text-rose-800 flex items-start gap-2 text-right" dir="rtl">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div className="leading-relaxed font-bold flex-1">{authError}</div>
                </div>
              )}

              {authSuccessMessage && (
                <div className="p-4 rounded-2xl text-[11px] bg-pink-50 border border-pink-100 text-pink-800 font-bold leading-relaxed text-right animate-fadeIn">
                  🎉 {authSuccessMessage}
                </div>
              )}

              {/* Form implementation */}
              {authMode !== "forgot-password" ? (
                <form onSubmit={authMode === "login" ? handleEmailSignIn : handleEmailSignUp} className="space-y-3">

                  <div className="space-y-1 text-right">
                    <label className="text-[10px] font-black text-slate-800 mr-1 block">البريد الإلكتروني ✉️</label>
                    <input
                      type="email"
                      required
                      placeholder="student@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-xs font-bold focus:bg-white focus:ring-2 focus:ring-purple-400 outline-none transition-all text-right"
                      style={{ color: "#210606" }}
                    />
                  </div>

                  <div className="space-y-1 text-right">
                    <label className="text-[10px] font-black text-slate-800 mr-1 block">كلمة المرور 🔒</label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      placeholder="******"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-xs font-bold focus:bg-white focus:ring-2 focus:ring-purple-400 outline-none transition-all text-right"
                    />
                  </div>

                  {authMode === "login" && (
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode("forgot-password");
                          setAuthError("");
                          setAuthSuccessMessage("");
                        }}
                        className="text-[10px] text-purple-600 hover:text-purple-700 font-extrabold hover:underline cursor-pointer"
                      >
                        🔑 نسيت كلمة المرور؟ إعادة تعيين كلمة المرور
                      </button>
                    </div>
                  )}

                  {(authMode === "signup" || authMode === "login") && (
                    <div className="flex items-start gap-2.5 pt-2 pb-1 text-right animate-fadeIn" dir="rtl">
                      <button
                        type="button"
                        id="terms-checkbox-custom"
                        onClick={() => setAgreedToTerms(!agreedToTerms)}
                        className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200 cursor-pointer shrink-0 ${
                          agreedToTerms
                            ? "bg-purple-600 border-purple-600 text-white shadow-xs"
                            : "bg-white border-slate-350 hover:border-purple-400"
                        }`}
                        aria-checked={agreedToTerms}
                        aria-label="أوافق على شروط الاستخدام وسياسة الخصوصية"
                        role="checkbox"
                      >
                        {agreedToTerms && (
                          <svg
                            className="w-3.5 h-3.5 font-bold"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            strokeWidth="4"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                      <span 
                        onClick={() => setAgreedToTerms(!agreedToTerms)}
                        className="text-[11px] text-slate-700 font-bold select-none cursor-pointer leading-tight pt-0.5"
                      >
                        أوافق على{" "}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowTermsModal(true);
                          }}
                          className="text-purple-600 hover:text-pink-500 underline font-black focus:outline-none cursor-pointer inline"
                        >
                          شروط الاستخدام وسياسة الخصوصية
                        </button>
                      </span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full mt-3 py-4 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white font-extrabold rounded-2xl text-xs shadow-md hover:shadow-purple-500/15 transition-all text-center flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    style={{ backgroundColor: "#7e38a4" }}
                  >
                    {authLoading ? (
                      <span className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                    ) : authMode === "login" ? (
                      "دخول للمختبر 🗝️"
                    ) : (
                      "إنشاء الحساب والمتابعة 🎯"
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleForgotPassword} className="space-y-3.5">
                  <div className="text-right space-y-1">
                    <h3 className="text-xs font-black text-purple-950">إعادة تعيين كلمة المرور 🔑</h3>
                    <p className="text-[10px] text-slate-600 font-bold leading-relaxed">
                      أدخل بريدك الإلكتروني المسجل أدناه لإرسال كود/رابط تعيين كلمة مرور جديدة وتعيينها لحسابك مباشرة.
                    </p>
                  </div>

                  <div className="space-y-1 text-right">
                    <label className="text-[10px] font-black text-slate-800 mr-1 block">البريد الإلكتروني لحسابك ✉️</label>
                    <input
                      type="email"
                      required
                      placeholder="student@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-xs font-bold focus:bg-white focus:ring-2 focus:ring-purple-400 outline-none transition-all text-right"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white font-extrabold rounded-2xl text-xs shadow-md transition-all text-center flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {authLoading ? (
                      <span className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin"></span>
                    ) : (
                      "إرسال كود التعيين بالبريد 📤"
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode("login");
                      setAuthError("");
                      setAuthSuccessMessage("");
                    }}
                    className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all text-center cursor-pointer"
                  >
                    ↩ العودة لتسجيل الدخول
                  </button>
                </form>
              )}

              {/* Separator line & Google Sign-In (only displayed if NOT in mobile App wrapper) */}
              {!isAppMode && (
                <>
                  <div className="flex items-center gap-2 text-[10px] font-bold text-slate-700 py-1">
                    <hr className="flex-1 border-slate-300" />
                    <span>أو الدخول بـ Google</span>
                    <hr className="flex-1 border-slate-300" />
                  </div>

                  {/* Standard Google Sign-In */}
                  <button
                    id="submit-google-login-btn"
                    onClick={handleGoogleSignIn}
                    disabled={authLoading}
                    className="w-full py-4 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 font-extrabold rounded-2xl text-xs shadow-sm transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                    style={{ backgroundColor: "#f9f8fc", color: "#844358" }}
                  >
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                    </svg>
                    <span>متابعة باستخدام حساب Google</span>
                  </button>
                </>
              )}

              <div className="pt-1 flex justify-center items-center">
              </div>
            </div>

            <p className="text-[11px] text-center text-slate-600 font-bold font-sans">
              بالتسجيل في التطبيق، أنت توافق على{" "}
              <button
                type="button"
                onClick={() => setShowTermsModal(true)}
                className="text-purple-600 hover:text-pink-500 underline font-black focus:outline-none cursor-pointer"
              >
                شروط الاستخدام وسياسة الخصوصية
              </button>
              .
            </p>
          </div>
        </main>
      ) : isLoggedIn && !isDataLoaded ? (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-pink-50 via-[#FFF9FB] to-purple-50 text-slate-800" dir="rtl">
          <div className="text-center space-y-4 animate-fadeIn">
            <div className="relative w-16 h-16 mx-auto">
              <div className="w-16 h-16 rounded-full border-4 border-purple-200 border-t-purple-600 animate-spin"></div>
              <span className="absolute inset-0 flex items-center justify-center text-xl">🎓</span>
            </div>
          </div>
        </div>
      ) : (
        /* 2. LOGGED IN DASHBOARD WORKSPACE */
        <div id="stitchlab-workspace" className="flex flex-col min-h-screen bg-gradient-to-br from-[#FFF0F3] via-[#FFE3E8] to-[#FFD6DC] text-slate-900 antialiased font-sans relative overflow-hidden">
          
          {/* REGULAR STUDY INTERACTIVE DASHBOARD VIEW */}
          <>
              <header className="border-b border-pink-100 bg-white/95 backdrop-blur-md sticky top-0 z-40 px-4 md:px-8 py-3.5 shadow-[0_12px_35px_rgba(236,72,153,0.03)] relative z-10">
                <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                  
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-xl bg-white border border-pink-100 shadow-sm overflow-hidden p-0.5 flex-shrink-0 select-none">
                       <img src="https://raw.githubusercontent.com/stitchlab1/stitchlab2/0ceec11a5ca77c5d4607a90cab424bc9ec880155/stitchlab_icon_hd.png" alt="stitchLab Logo" referrerPolicy="no-referrer" className="w-full h-full object-contain" />
                    </div>
                    <div>
                      <h1 className="font-sans font-black text-xl tracking-tight">
                        <span className="text-purple-600 font-extrabold">Stitch</span>
                        <span className="text-pink-500 font-black">Lab</span>
                      </h1>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                    
                    {(() => {
                      let nameChangeDaysRemaining = 0;
                      if (currentUser?.lastNameChangedAt) {
                        const lastChangeDate = new Date(currentUser.lastNameChangedAt);
                        if (!isNaN(lastChangeDate.getTime())) {
                          const now = new Date();
                          const diffTime = now.getTime() - lastChangeDate.getTime();
                          const diffDays = diffTime / (1000 * 60 * 60 * 24);
                          if (diffDays < 60) {
                            nameChangeDaysRemaining = Math.ceil(60 - diffDays);
                          }
                        }
                      }
                      return (
                        <div className="flex flex-col items-start sm:items-end text-slate-700 gap-1" id="student-profile-text-container">
                          <span className="text-xs font-black flex items-center gap-1.5 justify-end">
                            <span>الطالب: {currentUser?.name || "طالب مميز"}</span>
                            <button
                              type="button"
                              onClick={() => {
                                if (nameChangeDaysRemaining > 0) {
                                  return;
                                }
                                setEditingNameValue(currentUser?.name || "طالب مميز");
                                setIsEditingName(true);
                              }}
                              className="hover:scale-110 active:scale-95 transition-transform p-1 text-purple-600 hover:text-pink-500 cursor-pointer rounded-lg bg-purple-50 hover:bg-purple-100 flex items-center justify-center shrink-0"
                              title={nameChangeDaysRemaining > 0 ? `تعديل الاسم مقفل مؤقتاً (متبقي ${nameChangeDaysRemaining} يوم)` : "تعديل اسم الطالب"}
                            >
                              {nameChangeDaysRemaining > 0 ? (
                                <Lock className="w-3.5 h-3.5 text-amber-500" />
                              ) : (
                                <Pen className="w-3 h-3 text-purple-600 hover:text-pink-600" />
                              )}
                            </button>
                          </span>

                          {/* Beautiful status remaining days indicator */}
                          {nameChangeDaysRemaining > 0 && (
                            <div className="text-[10px] font-sans font-extrabold text-amber-700 bg-amber-50 border border-amber-200/60 px-2.5 py-1 rounded-xl flex items-center gap-1.5 shadow-xs animate-fadeIn leading-none select-none">
                              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0"></span>
                              <span>تعديل الاسم متاح بعد {nameChangeDaysRemaining} يوم</span>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {isEditingName && (
                      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center pt-[15vh] z-50 p-4 overflow-y-auto" dir="rtl">
                        <div className="bg-white rounded-[24px] p-6 max-w-sm w-full border border-pink-100 shadow-2xl text-right animate-fadeIn">
                          <h3 className="text-sm font-black text-slate-800 mb-2">تعديل اسم الطالب ✏️</h3>
                          <div className="text-[11px] text-rose-600 font-bold mb-4 flex items-start gap-2 bg-rose-50 p-3 rounded-xl leading-relaxed border border-rose-100/65">
                            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                            <span>تأكد من كتابة اسمك بشكل صحيح، لأنه بمجرد تعديل الاسم لن تتمكن من تغييره مجدداً إلا بعد مرور 60 يوماً! ⚠️</span>
                          </div>
                          <input
                            type="text"
                            value={editingNameValue}
                            onChange={(e) => setEditingNameValue(e.target.value)}
                            placeholder="اكتب اسمك الكامل هنا..."
                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-purple-500 focus:outline-hidden text-right font-bold bg-slate-50/50"
                            maxLength={40}
                            autoFocus
                          />
                          <div className="flex gap-2 justify-end mt-4">
                            <button
                              type="button"
                              onClick={() => setIsEditingName(false)}
                              className="px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-all cursor-pointer"
                            >
                              إلغاء
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                const trimmed = editingNameValue.trim();
                                if (!trimmed || trimmed === "طالب مميز") {
                                  alert("⚠️ يرجى إدخال اسم صحيح غير الاسم الافتراضي!");
                                  return;
                                }
                                
                                // Keep UI updated
                                setCurrentUser(prev => prev ? { ...prev, name: trimmed, lastNameChangedAt: new Date().toISOString() } : { name: trimmed, email: "", level: "Intermediate", lastNameChangedAt: new Date().toISOString() });

                                // Persist in LocalStorage & Firestore
                                if (isLoggedIn && auth.currentUser) {
                                  try {
                                    const uid = auth.currentUser.uid;
                                    const docRef = doc(db, "students", uid);
                                    await setDoc(docRef, {
                                      name: trimmed,
                                      lastNameChangedAt: new Date().toISOString(),
                                      updatedAt: new Date().toISOString()
                                    }, { merge: true });
                                    
                                    // Update cached payload
                                    const userProgressKey = `stitchlab_student_${uid}_progress`;
                                    const savedProgressStr = localStorage.getItem(userProgressKey);
                                    if (savedProgressStr) {
                                      const parsed = JSON.parse(savedProgressStr);
                                      parsed.name = trimmed;
                                      parsed.lastNameChangedAt = new Date().toISOString();
                                      localStorage.setItem(userProgressKey, JSON.stringify(parsed));
                                    }
                                  } catch (err) {
                                    console.error("Cloud name update failed:", err);
                                  }
                                } else {
                                  localStorage.setItem("stitchlab_guest_name", trimmed);
                                  localStorage.setItem("stitchlab_guest_lastNameChangedAt", new Date().toISOString());
                                }

                                setIsEditingName(false);
                              }}
                              className="px-4 py-2 rounded-xl text-xs font-black text-white bg-gradient-to-r from-purple-600 to-pink-500 hover:opacity-95 transition-opacity cursor-pointer shadow-xs"
                            >
                              حفظ الاسم
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => setShowSettingsModal(true)}
                      className={`py-1.5 px-3.5 sm:px-4 rounded-xl text-xs font-black transition-all duration-300 flex items-center gap-1.5 border cursor-pointer active:bg-gradient-to-r active:from-pink-500 active:via-purple-500 active:to-slate-400 active:text-white active:border-transparent active:scale-95 ${
                        showSettingsModal
                          ? "text-white bg-gradient-to-r from-purple-600 to-pink-500 border-transparent shadow-md scale-105"
                          : "text-purple-700 bg-purple-50 hover:bg-purple-100 border-purple-100/60"
                      }`}
                    >
                      <Settings className={`w-3.5 h-3.5 ${showSettingsModal ? "animate-spin" : ""}`} style={showSettingsModal ? { animationDuration: "3s" } : undefined} />
                      <span>الإعدادات</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="bg-slate-100 hover:bg-slate-250 text-slate-800 py-1.5 px-2.5 sm:px-3 rounded-xl text-xs transition-colors flex items-center gap-1.5 border border-slate-200 cursor-pointer font-black"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">تسجيل خروج</span>
                    </button>
                  </div>

                </div>
              </header>

              <main className="flex-1 w-full max-w-7xl mx-auto px-4 md:px-6 py-6 pb-36 z-10">
                
                {/* Google Drive Restore Suggestion Alert Banner */}
                {isLoggedIn && showRestoreSuggestion && cloudDriveBackup && (
                  <motion.div
                    initial={{ opacity: 0, y: -15 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 p-4 md:p-5 rounded-2xl bg-gradient-to-r from-purple-50 via-white to-pink-50 border border-purple-200/60 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 text-right"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-lg shrink-0">
                        ☁️
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-purple-950">توجد نسخة احتياطية أحدث على Google Drive! 📥</h4>
                        <p className="text-slate-500 text-[11px] mt-0.5 leading-normal font-bold">
                          تحتوي النسخة السحابية لحسابك على <strong className="text-purple-700">{cloudDriveBackup.points} نقطة</strong> ومستوى <strong className="text-pink-900">{cloudDriveBackup.level}</strong> مقارنة بنقاطك المحلية الحالية (<strong className="text-slate-700">{points} نقطة</strong>).
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0 w-full md:w-auto">
                      <button
                        type="button"
                        disabled={isRestoreLoading}
                        onClick={() => restoreFromGoogleDriveNow()}
                        className="flex-1 md:flex-none py-2 px-4 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white font-black text-xs cursor-pointer shadow-sm active:scale-95 transition-all text-center"
                      >
                        {isRestoreLoading ? "جاري الاستعادة..." : "استعادة التقدم بنقرة واحدة ⚡"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowRestoreSuggestion(false)}
                        className="py-2 px-3 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs cursor-pointer active:scale-95 transition-all"
                      >
                        تجاهل
                      </button>
                    </div>
                  </motion.div>
                )}
                
                {mainTab === "home" && (
                  <>
                    {/* ⚔️ FLOATING CHALLENGE PENDING LINK BANNER */}
                    {isLoggedIn && activeChallenge && activeChallenge.challengerId !== auth.currentUser?.uid && (
                      <motion.div 
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="max-w-md mx-auto mb-6 px-3"
                        dir="rtl"
                      >
                        <div className="bg-gradient-to-r from-amber-500 via-amber-400 to-[#e2ad2b] text-slate-950 p-4 rounded-2xl shadow-xl flex items-center justify-between gap-4 border border-amber-300 animate-pulse">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl shrink-0">
                              ⚔️
                            </div>
                            <div className="text-right">
                              <h4 className="text-xs font-black text-slate-950">مستعد للمنافسة والمبارزة؟ 🏆</h4>
                              <p className="text-[10px] text-slate-900 font-bold leading-tight mt-0.5">
                                لقد دعاك صديقك <span className="font-extrabold underline">{activeChallenge.challengerName}</span> للانضمام ومبارزته!
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              // Trigger accept challenge modal properties manually!
                              setChallengeChallenger(activeChallenge.challengerName);
                              setShowChallengeModal(true);
                            }}
                            className="bg-slate-950 hover:bg-slate-900 text-amber-300 text-[10px] font-black px-3.5 py-2 rounded-xl transition-all active:scale-95 cursor-pointer shrink-0"
                          >
                            قبول الانضمام الآن ✨
                          </button>
                        </div>
                      </motion.div>
                    )}
                    <HomeWorkspace
                    unlockedLevel={unlockedLevel}
                    completedLevels={completedLevels}
                    currentTickTime={currentTickTime}
                    bonusMinutes={bonusMinutes}
                    setBonusMinutes={setBonusMinutes}
                    dailySecondsLeft={dailySecondsLeft}
                    extraAdClaimsCount={extraAdClaimsCount}
                    unlockedAdvertiserGroups={unlockedAdvertiserGroups}
                    completedGroupsProp={completedGroups}
                    setCompletedGroupsProp={setCompletedGroups}
                    completedWordsCount={completedWordsCount}
                    setCompletedWordsCount={setCompletedWordsCount}
                    studentSemester={studentSemester}
                    points={points}
                    setPoints={setPoints}
                    completedWordKeys={completedWordKeys}
                    setCompletedWordKeys={setCompletedWordKeys}
                    skippedWordKeys={skippedWordKeys}
                    setSkippedWordKeys={setSkippedWordKeys}
                    reviewTargetWord={reviewTargetWord}
                    setReviewTargetWord={setReviewTargetWord}
                    onUnlockGroup={(gKey) => {
                      if (unlockedAdvertiserGroups.includes(gKey)) return;
                      const prevTotal = unlockedAdvertiserGroups.length;
                      let nextGroups: string[];
                      if (prevTotal === 0) {
                        nextGroups = [gKey]; // if first group, set/put 1 in it
                      } else {
                        nextGroups = [...unlockedAdvertiserGroups, gKey]; // previous total + 1
                      }
                      setUnlockedAdvertiserGroups(nextGroups);
                      try {
                        localStorage.setItem("stitchlab_unlocked_ad_groups", JSON.stringify(nextGroups));
                      } catch (e) {}
                    }}
                    onLevelStart={(level) => {
                      setSelectedPersona(PRESET_PERSONAS.find(p => p.id === level.personaId) || PRESET_PERSONAS[0]);
                      setMainTab("training");
                      setActiveTab("chat");
                    }}
                    onLevelComplete={(lvlNum) => completeLevel(lvlNum)}
                    onResetProgress={resetAllLevelsProgress}
                    LEARNING_LEVELS={LEARNING_LEVELS}
                    onForceSaveProgress={handleForceSaveProgress}
                  />
                  </>
                )}

                {mainTab === "training" && (
                  <div className="space-y-6 animate-fadeIn text-right" dir="rtl">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white/60 backdrop-blur-md rounded-3xl p-5 border border-pink-100 shadow-sm">
                      <div className="text-right">
                        <h2 className="text-2xl font-black text-purple-950 font-sans flex items-center gap-2">
                          <span>🔮</span>
                          <span>المختبر والمدرب التفاعلي الذكي</span>
                        </h2>
                        <p className="text-xs text-slate-500 font-bold mt-1">
                          تحدث مع الذكاء الاصطناعي، تدرّب على صياغة الجمل، وسرّع من طلاقتك باستخدام الذكاء الاصطناعي من Gemini
                        </p>
                      </div>

                      {/* Sub tab buttons for practice type */}
                      <div className="flex items-center gap-1.5 p-1 bg-slate-100 border border-slate-200 rounded-2xl w-full md:w-auto overflow-x-auto">
                        <button
                          type="button"
                          onClick={() => setActiveTab("chat")}
                          className={`flex-1 md:flex-initial px-4 py-2 text-xs font-black rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                            activeTab === "chat"
                              ? "bg-purple-600 text-white shadow-md font-bold"
                              : "text-slate-600 hover:text-slate-850 hover:bg-white/40 font-medium"
                          }`}
                        >
                          🎙️ الدردشة الذكية
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTab("analyzer")}
                          className={`flex-1 md:flex-initial px-4 py-2 text-xs font-black rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                            activeTab === "analyzer"
                              ? "bg-purple-600 text-white shadow-md font-bold"
                              : "text-slate-600 hover:text-slate-850 hover:bg-white/40 font-medium"
                          }`}
                        >
                          🧠 محلل الجمل
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTab("quiz")}
                          className={`flex-1 md:flex-initial px-4 py-2 text-xs font-black rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                            activeTab === "quiz"
                              ? "bg-purple-600 text-white shadow-md font-bold"
                              : "text-slate-600 hover:text-slate-850 hover:bg-white/40 font-medium"
                          }`}
                        >
                          📝 الاختبار الذكي
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTab("flashcards")}
                          className={`flex-1 md:flex-initial px-4 py-2 text-xs font-black rounded-xl transition-all cursor-pointer whitespace-nowrap ${
                            activeTab === "flashcards"
                              ? "bg-purple-600 text-white shadow-md font-bold"
                              : "text-slate-600 hover:text-slate-850 hover:bg-white/40 font-medium"
                          }`}
                        >
                          🗂️ الكروت التعليمية
                        </button>
                      </div>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 rounded-[32px] p-6 shadow-2xl relative overflow-hidden ring-1 ring-slate-800/50">
                      {activeTab === "chat" && (
                        <ChatPanel
                          selectedPersona={selectedPersona}
                          onChangePersona={setSelectedPersona}
                          chatInputValue={chatInputValue}
                          setChatInputValue={setChatInputValue}
                          chatHistory={getActiveChatMessages()}
                          chatLoading={chatLoading}
                          chatTranslateToggle={!!chatTranslateToggle[selectedPersona.id]}
                          setChatTranslateToggle={(val) =>
                            setChatTranslateToggle((prev) => ({ ...prev, [selectedPersona.id]: val }))
                          }
                          onSendMessage={handleSendMessage}
                          onClearHistory={clearChatHistory}
                          speakText={speakText}
                          onQuickPaste={handleQuickPaste}
                        />
                      )}

                      {activeTab === "analyzer" && (
                        <AnalyzerPanel
                          analyzerInputValue={analyzerInputValue}
                          setAnalyzerInputValue={setAnalyzerInputValue}
                          analyzerLoading={analyzerLoading}
                          analyzerResult={analyzerResult}
                          analyzerError={analyzerError}
                          onAnalyzeSubmit={handleAnalyzeSentence}
                          onQuickPaste={handleQuickPaste}
                        />
                      )}

                      {activeTab === "quiz" && (
                        <QuizPanel
                          quizTopic={quizTopic}
                          setQuizTopic={setQuizTopic}
                          quizCustomTopic={quizCustomTopic}
                          setQuizCustomTopic={setQuizCustomTopic}
                          quizLevel={quizLevel}
                          setQuizLevel={setQuizLevel}
                          quizLoading={quizLoading}
                          quizQuestions={quizQuestions}
                          selectedAnswers={selectedAnswers}
                          submittedQuiz={submittedQuiz}
                          quizError={quizError}
                          quizScore={quizScore}
                          onGenerateQuiz={handleGenerateQuiz}
                          onSelectAnswer={handleSelectAnswer}
                          onGradeQuiz={handleGradeQuiz}
                        />
                      )}

                      {activeTab === "flashcards" && (
                        <FlashcardsPanel
                          flashcardSearch={flashcardSearch}
                          setFlashcardSearch={setFlashcardSearch}
                          flashcardLevelFilter={flashcardLevelFilter}
                          setFlashcardLevelFilter={setFlashcardLevelFilter}
                          showAddCardModal={showAddCardModal}
                          setShowAddCardModal={setShowAddCardModal}
                          newCardWord={newCardWord}
                          setNewCardWord={setNewCardWord}
                          newCardIpa={newCardIpa}
                          setNewCardIpa={setNewCardIpa}
                          newCardPartOfSpeech={newCardPartOfSpeech}
                          setNewCardPartOfSpeech={setNewCardPartOfSpeech}
                          newCardMeaning={newCardMeaning}
                          setNewCardMeaning={setNewCardMeaning}
                          newCardExample={newCardExample}
                          setNewCardExample={setNewCardExample}
                          newCardExampleTranslation={newCardExampleTranslation}
                          setNewCardExampleTranslation={setNewCardExampleTranslation}
                          newCardLevel={newCardLevel}
                          setNewCardLevel={setNewCardLevel}
                          onAddFlashcard={handleAddFlashcard}
                          onDeleteFlashcard={deleteCustomFlashcard}
                          filteredFlashcards={filteredFlashcards}
                          speakText={speakText}
                        />
                      )}
                    </div>
                  </div>
                )}

                {mainTab === "achievements" && (
                  <AchievementsWorkspace
                    conversationsHad={conversationsHad}
                    quizScore={quizScore}
                    quizAttempts={quizAttempts}
                    customFlashcardsCount={customFlashcards.length + PRESET_FLASHCARDS.length}
                    unlockedLevel={unlockedLevel}
                    completedLevels={completedLevels}
                    completedGroupsProp={completedGroups}
                    analyzedCountProp={analyzedCount}
                    onResetProgress={resetAllLevelsProgress}
                    DAILY_QUOTES={DAILY_QUOTES}
                    quoteIndex={quoteIndex}
                    setQuoteIndex={setQuoteIndex}
                    points={points}
                    completedWordsCount={completedWordsCount}
                    studentSemester={studentSemester}
                    completedWordKeys={completedWordKeys}
                  />
                )}

                {mainTab === "about" && (
                  <AboutWorkspace />
                )}

                {mainTab === "support" && (
                  <div className="max-w-md mx-auto text-center space-y-6 py-8 animate-fadeIn" dir="rtl">
                    <div className="w-20 h-20 bg-gradient-to-tr from-amber-100 to-amber-200 border border-amber-300 text-amber-800 rounded-3xl flex items-center justify-center mx-auto shadow-sm text-3xl">
                      🤝
                    </div>
                    
                    <div className="space-y-3 px-4">
                      <h2 className="text-xl font-black text-amber-950 font-serif">مركز جهود الدعم والمساعدة</h2>
                      <p className="text-slate-600 text-sm md:text-base leading-relaxed font-bold bg-white/50 p-4 border border-amber-100/50 rounded-2xl shadow-sm">
                        نحن هنا لمساعدتك. إذا واجهت أي مشكلة أو لديك استفسار، يُرجى التواصل معنا.
                      </p>
                    </div>

                    <div className="bg-white/80 backdrop-blur-md rounded-3xl border border-amber-200/40 p-6 shadow-md max-w-sm mx-auto space-y-4">
                      <span className="text-[10px] uppercase tracking-wider font-extrabold text-amber-900 bg-amber-50 px-3 py-1 rounded-full border border-amber-100">
                        صفحة التواصل الرسمية
                      </span>
                      
                      <a
                        href="https://www.facebook.com/profile.php?id=61578668730709"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3.5 px-5 rounded-2xl text-xs font-black shadow-md hover:from-blue-700 hover:to-indigo-700 active:scale-95 transition-all w-full cursor-pointer"
                      >
                        <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                        <span>صفحتنا على فيسبوك</span>
                      </a>
                      
                      <p className="text-[10px] text-amber-950 font-mono select-all bg-amber-50/50 p-2.5 rounded-xl border border-amber-100" dir="ltr">
                        https://www.facebook.com/profile.php?id=61578668730709
                      </p>
                    </div>
                  </div>
                )}


              </main>

              <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-pink-100 py-3 px-6 shadow-[0_-8px_30px_rgba(236,72,153,0.06)] z-40 w-full">
                <div className="max-w-md mx-auto flex items-center justify-center select-none" dir="rtl">
                  
                  <button
                    type="button"
                    onClick={() => setMainTab("home")}
                    className={`w-full max-w-[180px] flex flex-col items-center gap-1 py-1.5 px-3 rounded-2xl transition-all duration-350 cursor-pointer ${
                      mainTab === "home" || mainTab === "training"
                        ? "text-white bg-gradient-to-r from-purple-600 to-pink-500 shadow-md scale-105 font-black" 
                        : "text-slate-500 hover:text-slate-850 hover:bg-slate-100 border border-transparent hover:border-pink-100"
                    }`}
                  >
                    <BookOpen className="w-4.5 h-4.5" />
                    <span className="text-[10px] font-bold">الرئيسية</span>
                  </button>

                </div>
              </nav>

              {/* Educational Learning Stopwatch Timer */}
              <LearningTimer isLoggedIn={isLoggedIn} uid={auth.currentUser?.uid} />
            </>

        </div>
      )}

      {/* 2. GOOGLE DRIVE BACKUP & RESTORE MODAL */}
      {showSyncModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 text-slate-800" dir="rtl">
          <div className="bg-white rounded-[32px] max-w-md w-full border border-purple-100 shadow-2xl p-6 md:p-8 space-y-5 relative overflow-hidden text-right">
            
            <button
              onClick={() => {
                setShowSyncModal(false);
              }}
              className="absolute top-4 left-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full cursor-pointer transition-colors text-sm font-bold"
            >
              ✕
            </button>

            <div className="space-y-1.5">
              <span className="text-xs bg-purple-100 text-purple-950 font-black px-3.5 py-1 rounded-full border border-purple-200 inline-block">
                النسخ الاحتياطي السحابي التلقائي ☁️
              </span>
              <h3 className="text-xl font-black text-purple-950">مساحة Google Drive App Data</h3>
              <p className="text-xs text-slate-500 font-bold leading-relaxed">
                حافظ على تقدمك الدراسي، مجلد الكلمات الصعبة، النقاط، والأوسمة آمنة بنسبة 100% داخل مساحتك الخاصة على Google Drive واستعدها من أي جهاز متاح بنقرة واحدة!
              </p>
            </div>

            {!isLoggedIn ? (
              <div className="bg-amber-50/50 p-5 rounded-2xl border border-amber-100 text-center space-y-4">
                <p className="text-xs font-black text-amber-900 leading-relaxed">
                  ⚠️ يرجى تسجيل الدخول بحساب Google أولاً لتمكين عمليات النسخ السحابي واستعادة التقدم بنقرة واحدة.
                </p>
                <button
                  type="button"
                  onClick={async () => {
                    await handleGoogleSignIn();
                  }}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white font-black text-xs py-3 px-4 rounded-xl active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>🔑 تسجيل الدخول باستخدام حساب Google</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Connection Status Card */}
                {!driveToken ? (
                  <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 space-y-3">
                    <div className="flex items-center gap-1.5 text-blue-900 font-black text-xs">
                      <span>🔗 حساب Google متصل</span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-bold leading-normal">
                      يرجى تفويض الاتصال بـ Google App Data للاتصال بنظام النسخ الاحتياطي التلقائي وسحب آخر نسخة متوفرة:
                    </p>
                    <button
                      type="button"
                      onClick={async () => {
                        await handleActivateDrive();
                      }}
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl active:scale-95 transition-all cursor-pointer"
                    >
                      ربط وتفعيل ومزامنة Google Drive 🔄
                    </button>
                  </div>
                ) : (
                  <div className="bg-purple-50/60 p-4 rounded-2xl border border-purple-150 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2 rounded-full bg-purple-500 animate-pulse shrink-0"></span>
                      <span className="text-xs font-black text-purple-900">🟣 متصل بنجاح بمساحتك الخاصة على Drive</span>
                    </div>

                    <div className="bg-white/80 rounded-xl p-3 border border-purple-100/40 space-y-1.5 text-[11px] font-bold text-slate-700">
                      <div className="flex justify-between border-b border-dashed border-slate-100 pb-1.5 text-slate-500">
                        <span>النسخة الاحتياطية المتوفرة:</span>
                        <span className="text-purple-950 font-black">
                          {cloudDriveBackup ? "موجودة ☁️" : "لا توجد نسخة سحابية"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>آخر تحديث بالدرايف:</span>
                        <span className="text-slate-900 text-left" dir="ltr">
                          {cloudDriveBackup ? new Date(cloudDriveBackup.updatedAt).toLocaleString("ar-EG") : "-"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>المستوى السحابي:</span>
                        <span className="text-slate-900">
                          {cloudDriveBackup ? cloudDriveBackup.level : "-"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>إجمالي النقاط:</span>
                        <span className="text-purple-900 font-black">
                          {cloudDriveBackup ? `${cloudDriveBackup.points} نقطة` : "-"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Control Action Buttons */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    disabled={isBackupLoading}
                    onClick={() => backupToGoogleDriveNow()}
                    className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-350 text-white font-black text-xs py-3 px-4 rounded-xl active:scale-[0.97] transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    {isBackupLoading ? "🔄 جاري النسخ..." : "📤 نسخ احتياطي الآن"}
                  </button>

                  <button
                    type="button"
                    disabled={isRestoreLoading}
                    onClick={() => {
                      if (window.confirm("⚠️ هل أنت متأكد من رغبتك في استعادة التقدم الدراسي الآن واستبدال تقدمك على هذا الجهاز بالكامل بالبيانات المخزنة سحابياً؟")) {
                        restoreFromGoogleDriveNow();
                      }
                    }}
                    className="w-full bg-pink-600 hover:bg-pink-700 disabled:bg-pink-350 text-white font-black text-xs py-3 px-4 rounded-xl active:scale-[0.97] transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm"
                  >
                     {isRestoreLoading ? "🔄 جاري الاستعادة..." : "📥 استعادة التقدم"}
                  </button>
                </div>

                <div className="border-t border-dashed border-slate-100 pt-3 text-center">
                  <button
                    type="button"
                    onClick={() => setShowOAuthHelper(!showOAuthHelper)}
                    className="text-[11px] text-purple-600 hover:text-purple-700 font-extrabold focus:outline-none flex items-center justify-center gap-1 mx-auto cursor-pointer"
                  >
                    <span>💡 هل تواجه مشكلة (طلب غير صالح أو حظر الوصول)؟ اضغط للحل السريع</span>
                  </button>
                </div>

                {showOAuthHelper && (
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-150 text-right space-y-3 text-xs animate-fadeIn leading-relaxed max-h-[250px] overflow-y-auto">
                    <div className="flex items-center gap-2 text-purple-950 font-black border-b border-dashed border-slate-200 pb-1.5">
                      <span>⚙️ حل مشكلة حظر الوصول والمزامنة السحابية (OAuth 400)</span>
                    </div>
                    <p className="text-[10.5px] text-slate-500 font-bold">
                      هذا الخطأ يحدث عندما لا تتطابق روابط التطبيق مع الروابط المصرح بها في كونسول Google Cloud. اتبع الخطوات التالية للتصريح بها فوراً:
                    </p>
                    <ol className="list-decimal list-inside text-[10.5px] text-slate-600 space-y-2.5 font-semibold pr-1">
                      <li>
                        اذهب إلى <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-purple-600 underline font-bold">Google Cloud Console</a> لمشروعك.
                      </li>
                      <li>
                        انتقل إلى قسم <span className="font-bold">APIs & Services</span> ⬅️ <span className="font-bold">Credentials</span>.
                      </li>
                      <li>
                        قم بتحرير الـ <span className="font-bold">OAuth 2.0 Web Client ID</span> الخاص بك.
                      </li>
                      <li>
                        تحت <span className="font-bold">Authorized redirect URIs (العناوين المصرح بها لإعادة التوجيه)</span> اضغط على إضافة عنوان، ثم الصق العناوين التالية بالضبط:
                        <div className="bg-slate-900 text-slate-100 p-2 rounded-lg font-mono text-[9px] mt-1 space-y-1 select-all hover:bg-black transition-colors" dir="ltr text-left">
                          https://stitchlab2.vercel.app/auth/callback
                          <br />
                          https://vercel.app/auth/callback
                          <br />
                          http://localhost:3000/auth/callback
                          <br />
                          {window.location.origin}/auth/callback
                        </div>
                      </li>
                      <li>
                        تحت <span className="font-bold">Authorized JavaScript origins (مصادر JavaScript المصرح بها)</span> أضف العناوين التالية للسلامة أيضاً:
                        <div className="bg-slate-900 text-slate-100 p-2 rounded-lg font-mono text-[9px] mt-1 space-y-1 select-all hover:bg-black transition-colors" dir="ltr text-left">
                          https://stitchlab2.vercel.app
                          <br />
                          https://vercel.app
                          <br />
                          http://localhost:3000
                          <br />
                          {window.location.origin}
                        </div>
                      </li>
                      <li>
                        في تبويب <span className="font-bold">OAuth Consent Screen (شاشة موافقة OAuth)</span> تأكد من إدخال رابط سياسة الخصوصية <code className="text-pink-600 font-mono bg-pink-50 px-1 rounded" dir="ltr">https://stitchlab2.vercel.app/privacy-policy</code> في حقل Privacy Policy URL لتسريع عملية المراجعة وموافقة Google الفورية!
                      </li>
                      <li>
                        احفظ التعديلات وجرب المزامنة الآن لتغمر تقدمك بالسحاب ☁️!
                      </li>
                    </ol>
                  </div>
                )}
              </div>
            )}

            <div className="text-[10px] text-slate-400 font-bold border-t border-dashed border-slate-100 pt-3 text-center">
              🔒 خصوصية وأمان تام تضمنها Google: تطبيق StitchLab لا يستطيع الوصول لأي ملفات خارج البيانات الخاصة به.
            </div>
          </div>
        </div>
      )}

      {/* 🌟 GLOBAL APP TOAST NOTIFICATION */}
      {appToast && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[9999] max-w-md w-[92%] sm:w-auto animate-bounce-in" dir="rtl">
          <div className={`p-4 rounded-2xl shadow-2xl border flex items-center gap-3 backdrop-blur-xl ${
            appToast.type === "success" 
              ? "bg-emerald-950/95 text-emerald-100 border-emerald-500/40 shadow-emerald-900/30" 
              : appToast.type === "error"
              ? "bg-rose-950/95 text-rose-100 border-rose-500/40 shadow-rose-900/30"
              : "bg-purple-950/95 text-purple-100 border-purple-500/40 shadow-purple-900/30"
          }`}>
            <span className="text-xl">
              {appToast.type === "success" ? "✅" : appToast.type === "error" ? "⚠️" : "ℹ️"}
            </span>
            <p className="text-xs sm:text-sm font-extrabold flex-1 leading-snug">
              {appToast.message}
            </p>
            <button 
              onClick={() => setAppToast(null)}
              className="text-white/60 hover:text-white p-1 rounded-lg cursor-pointer text-xs"
              title="إغلاق التنبيه"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* 4. UNIFIED SETTINGS GEAR MODAL */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 text-slate-800" dir="rtl">
          <div className="bg-white rounded-[32px] max-w-md w-full border border-purple-100 shadow-2xl p-6 md:p-8 space-y-6 relative overflow-y-auto max-h-[88vh] text-right text-slate-800 animate-fadeIn scrollbar-thin">
            
            <button
              onClick={() => {
                setShowSettingsModal(false);
                setAcademyViewOpen(false);
                setChangeEmailViewOpen(false);
              }}
              className="absolute top-4 left-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full cursor-pointer transition-colors text-sm font-bold"
            >
              ✕
            </button>

            {changeEmailViewOpen ? (
              <ChangeEmailSection
                onBack={() => setChangeEmailViewOpen(false)}
                showToast={triggerAppToast}
              />
            ) : academyViewOpen ? (
              <div className="space-y-4 animate-fadeIn">
                {/* Academy Sub-header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2 text-purple-950">
                    <span className="text-xl">🎓</span>
                    <h3 className="text-lg font-black text-purple-950">أكاديمية StitchLab</h3>
                  </div>
                  <button 
                    onClick={() => setAcademyViewOpen(false)}
                    className="py-1 px-3 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-xl cursor-pointer font-bold text-xs transition-colors"
                    type="button"
                  >
                    ← عودة للإعدادات
                  </button>
                </div>

                <p className="text-[11px] text-slate-500 font-bold leading-relaxed">
                  أنشئ صفك الدراسي التفاعلي واجمع أصدقاءك لتخوضوا مغامرة دراسية مميزة وذكية معاً!
                </p>

                <div className="space-y-3.5">
                  {/* Action 1: Invite classmate */}
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-100/50 space-y-3 relative overflow-hidden text-right">
                    <div className="absolute top-[-20%] right-[-10%] w-20 h-20 bg-pink-100/30 rounded-full blur-xl pointer-events-none"></div>
                    <h4 className="text-[11.5px] font-black text-purple-950">ادع زميلك للانضمام إلى صفك التعليمي في StitchLab 🚀</h4>
                    
                    <button
                      type="button"
                      disabled={isGeneratingAcademyInvite}
                      onClick={generateAcademyInviteLink}
                      className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white font-black rounded-xl text-xs transition-colors shadow-sm cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 active:bg-gradient-to-r active:from-pink-500 active:via-purple-500 active:to-slate-400 active:text-white"
                    >
                      {isGeneratingAcademyInvite ? (
                        <>
                          <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin ml-1"></span>
                          <span>جاري إنشاء رابط دعوتك...</span>
                        </>
                      ) : (
                        <>
                          <span>🔗 إنشاء رابط الدعوة للأكاديمية</span>
                        </>
                      )}
                    </button>

                    {/* Copied link display */}
                    {academyInviteUrl && (
                      <div className="pt-3 border-t border-purple-100/70 space-y-2 animate-fadeIn text-right">
                        <p className="text-[10px] text-purple-950 font-extrabold leading-normal">
                          🔮 رابط دعوتك الذكي جاهز! انسخه الآن لمشاركته مع صديقك:
                        </p>
                        <div className="flex gap-1.5 items-center">
                          <input 
                            id="stitchlab-academy-invite-input"
                            type="text" 
                            readOnly 
                            value={academyInviteUrl} 
                            onClick={(e) => {
                              const target = e.currentTarget;
                              target.select();
                              target.setSelectionRange(0, 99999);
                            }}
                            className="flex-1 bg-white border border-purple-200 rounded-lg p-1.5 text-[9px] font-mono text-purple-900 select-all font-bold"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              safeCopyToClipboard(academyInviteUrl, "", true);
                            }}
                            className="py-1.5 px-3 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white rounded-lg text-[10px] font-black shrink-0 transition-all cursor-pointer shadow-xs active:scale-95 active:bg-gradient-to-r active:from-pink-500 active:via-purple-500 active:to-slate-400 active:text-white"
                          >
                            نسخ
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action 2: Show joined classmates */}
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5 text-right">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                      <span className="text-[11px] font-black text-slate-850">الزملاء المنضمون في صفي 👥</span>
                      <button
                        type="button"
                        onClick={fetchClassmates}
                        className="text-[10px] font-black text-purple-600 hover:text-purple-700 hover:underline cursor-pointer flex items-center gap-0.5"
                        disabled={loadingClassmates}
                      >
                        🔄 تحديث القائمة
                      </button>
                    </div>

                    {loadingClassmates ? (
                      <div className="text-center py-4 text-[10px] text-slate-400 font-bold animate-pulse">
                        جاري تحميل الزملاء...
                      </div>
                    ) : classmates.length === 0 ? (
                      <div className="text-center py-4 border border-dashed border-slate-200 bg-white rounded-xl">
                        <span className="text-slate-400 font-bold text-[9.5px]">لا يوجد زملاء منضمون في صفك حالياً.</span>
                      </div>
                    ) : (
                      <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                        {classmates.map((cl, idx) => (
                          <div key={cl.uid || idx} className="flex flex-col p-3 bg-white border border-slate-100 rounded-2xl hover:border-purple-200 transition-all shadow-xs gap-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-xl bg-pink-100 flex items-center justify-center text-[10.5px] font-black text-pink-700 select-none">
                                  {idx + 1}
                                </div>
                                <div className="text-right">
                                  <h4 className="text-[11.5px] font-extrabold text-slate-800 leading-tight">{cl.name}</h4>
                                  <span className="text-[9.5px] text-slate-450 block font-bold truncate max-w-[170px]">{cl.email || "بريد غير محدد"}</span>
                                </div>
                              </div>
                              <span className="text-[9.5px] bg-pink-50 text-pink-700 border border-pink-100 px-2 py-0.5 rounded-lg font-extrabold leading-none shrink-0">
                                منضم في صفي ✓
                              </span>
                            </div>

                            {/* Classmate Statistics Details */}
                            <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-dashed border-slate-100 text-center text-[10px] font-bold text-slate-650">
                              <div className="bg-slate-50 rounded-xl p-1.5 flex flex-col justify-center">
                                <span className="text-[9px] text-slate-400 font-extrabold mb-0.5">الفصل الدراسي 📚</span>
                                <span className="text-purple-900 font-black truncate text-[11px]">{(cl.studentSemester || "").includes("ثاني") || (cl.studentSemester || "").includes("الثاني") ? "2" : "1"}</span>
                              </div>
                              <div className="bg-slate-50 rounded-xl p-1.5 flex flex-col justify-center">
                                <span className="text-[9px] text-slate-400 font-extrabold mb-0.5">الكلمات المنجزة 📝</span>
                                <span className="text-pink-650 font-black text-[10.5px]">{cl.completedWordsCount || 0} كلمة</span>
                              </div>
                              <div className="bg-slate-50 rounded-xl p-1.5 flex flex-col justify-center">
                                {/* NO groups icon/unlock icon here, keeping it completely clean as text as requested */}
                                <span className="text-[9px] text-slate-400 font-extrabold mb-0.5">مجموع المجموعات</span>
                                <span className="text-amber-600 font-black text-[10.5px]">{cl.completedGroupsCount || 0} مجموعات</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-1.5 border-b border-slate-100 pb-4">
                  <div className="flex items-center gap-2 text-purple-950">
                    <Settings className="w-6 h-6 text-purple-600 animate-spin" style={{ animationDuration: "6s" }} />
                    <h3 className="text-xl font-black">إعدادات المنصة</h3>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {/* Account Settings & Security Block (إعدادات الحساب والأمان) */}
                  {auth.currentUser && (
                    <div className="p-4 rounded-2xl border border-purple-200/90 bg-gradient-to-br from-purple-50/70 via-pink-50/30 to-white space-y-3 text-right shadow-xs">
                      <div className="flex items-center justify-between pb-2.5 border-b border-purple-150/60">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center text-sm shadow-2xs">
                            <ShieldCheck className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-purple-950">إعدادات الحساب والأمان</h4>
                            <span className="text-[10px] text-slate-500 font-bold block truncate max-w-[200px]" dir="ltr">
                              {auth.currentUser.email || "حساب الطالب المسجل"}
                            </span>
                          </div>
                        </div>
                        <span className="text-[9.5px] font-black px-2 py-0.5 rounded-lg bg-white border border-purple-150 text-purple-700 shadow-2xs">
                          {(() => {
                            const pData = auth.currentUser?.providerData || [];
                            const hasG = pData.some((p) => p.providerId === "google.com");
                            const hasP = pData.some((p) => p.providerId === "password");
                            const isExtracted = typeof window !== "undefined" && auth.currentUser?.uid && localStorage.getItem(`stitchlab_pwd_extracted_${auth.currentUser.uid}`) === "true";
                            if (hasG && (hasP || isExtracted)) {
                              return "حساب مسجل بقوقل وكلمة مرور 🌐🔑";
                            }
                            if (hasG) {
                              return "حساب مسجل بقوقل 🌐";
                            }
                            if (hasP) {
                              return "بريد وكلمة مرور 🔑";
                            }
                            return "حساب مسجل";
                          })()}
                        </span>
                      </div>

                      {/* Option / Card: Change Email Address (تغيير البريد الإلكتروني) */}
                      <button
                        type="button"
                        onClick={() => setChangeEmailViewOpen(true)}
                        className="w-full flex items-center justify-between p-3 rounded-xl bg-white hover:bg-purple-50/60 border border-purple-100 hover:border-purple-300 transition-all text-right cursor-pointer group active:scale-[0.98] shadow-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-pink-100 text-pink-700 flex items-center justify-center text-sm group-hover:scale-110 transition-transform">
                            ✉️
                          </div>
                          <div className="text-right">
                            <h5 className="text-xs font-black text-purple-950">تغيير البريد الإلكتروني</h5>
                            <span className="text-[10px] text-slate-400 font-bold block">
                              {auth.currentUser.email ? `الحالي: ${auth.currentUser.email}` : "تحديث بريدك الإلكتروني المعتمد"}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-purple-600 font-black text-xs group-hover:-translate-x-1 transition-transform">
                          <span>تعديل</span>
                          <span className="text-sm">←</span>
                        </div>
                      </button>
                    </div>
                  )}

                  {/* Option 1: Student Unique ID with Copy button */}
                  {auth.currentUser?.uid && (
                    <div className="w-full flex items-center justify-between p-4 rounded-2xl border border-purple-100 bg-purple-50/20 text-right">
                      <div className="flex gap-3 items-center">
                        <div className="w-10 h-10 rounded-xl bg-purple-105 flex items-center justify-center text-purple-700 shrink-0 select-none text-lg">
                          🆔
                        </div>
                        <div className="text-right">
                          <h4 className="text-xs font-black text-purple-950">الرقم المميز للطالب</h4>
                          <span className="font-mono bg-white px-2 py-0.5 rounded text-[10px] select-all border border-purple-100/40 inline-block mt-0.5 max-w-[140px] truncate">
                            {auth.currentUser.uid}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          safeCopyToClipboard(auth.currentUser?.uid || "", "", true);
                          setCopiedUid(true);
                          setTimeout(() => setCopiedUid(false), 2000);
                        }}
                        className={`py-1.5 px-3 rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center cursor-pointer gap-1 text-xs font-black text-white ${
                          copiedUid 
                            ? "bg-purple-600 hover:bg-purple-700" 
                            : "bg-gradient-to-r from-purple-600 via-pink-500 to-slate-500 hover:opacity-95"
                        }`}
                        title="نسخ الرقم المميز"
                      >
                        {copiedUid ? <Sparkles className="w-3 h-3 text-purple-100 animate-spin" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedUid ? "تم النسخ! 📋" : "نسخ"}</span>
                      </button>
                    </div>
                  )}

                  {/* Option: StitchLab Academy 🎓 */}
                  <button
                    type="button"
                    onClick={() => {
                      setAcademyViewOpen(true);
                      fetchClassmates();
                    }}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl border border-pink-150 hover:border-pink-300 bg-pink-50/15 hover:bg-pink-50/40 transition-all text-right cursor-pointer group active:bg-gradient-to-r active:from-pink-500 active:via-purple-500 active:to-slate-400 active:text-white active:scale-[0.98]"
                  >
                    <div className="w-11 h-11 rounded-xl bg-pink-100 flex items-center justify-center text-pink-700 shrink-0 group-hover:scale-110 transition-transform">
                      <span className="text-xl">🎓</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-black text-pink-950">أكاديمية StitchLab 🎓</h4>
                    </div>
                  </button>

                  {/* Option 2: Achievements */}
                  <button
                    type="button"
                    onClick={() => {
                      setMainTab("achievements");
                      setShowSettingsModal(false);
                    }}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl border border-amber-100 hover:border-amber-200 bg-amber-50/20 hover:bg-amber-50/50 transition-all text-right cursor-pointer group active:bg-gradient-to-r active:from-pink-500 active:via-purple-500 active:to-slate-400 active:text-white active:scale-[0.98]"
                  >
                    <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0 group-hover:scale-110 transition-transform">
                      <Trophy className="w-5.5 h-5.5 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-black text-amber-950">الإنجازات 🏆</h4>
                    </div>
                  </button>

                  {/* Option 3: About Us */}
                  <button
                    type="button"
                    onClick={() => {
                      setMainTab("about");
                      setShowSettingsModal(false);
                    }}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl border border-indigo-100 hover:border-indigo-200 bg-indigo-50/20 hover:bg-indigo-50/50 transition-all text-right cursor-pointer group active:bg-gradient-to-r active:from-pink-500 active:via-purple-500 active:to-slate-400 active:text-white active:scale-[0.98]"
                  >
                    <div className="w-11 h-11 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700 shrink-0 group-hover:scale-110 transition-transform">
                      <Compass className="w-5.5 h-5.5 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-black text-indigo-950">من نحن ورؤيتنا 🔮</h4>
                    </div>
                  </button>

                  {/* Option 4: Support */}
                  <button
                    type="button"
                    onClick={() => {
                      setMainTab("support");
                      setShowSettingsModal(false);
                    }}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl border border-pink-100 hover:border-pink-200 bg-pink-50/20 hover:bg-pink-50/50 transition-all text-right cursor-pointer group active:bg-gradient-to-r active:from-pink-500 active:via-purple-500 active:to-slate-400 active:text-white active:scale-[0.98]"
                  >
                    <div className="w-11 h-11 rounded-xl bg-pink-100 flex items-center justify-center text-pink-700 shrink-0 group-hover:scale-110 transition-transform">
                      <HelpCircle className="w-5.5 h-5.5 text-pink-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-black text-pink-950">مركز الدعم والمساعدة المباشرة 🤝</h4>
                    </div>
                  </button>

                  {/* Option 5: Skipped Words Review Box */}
                  <div className="w-full rounded-2xl border border-rose-150 bg-rose-50/15 overflow-hidden transition-all duration-300">
                    <button
                      type="button"
                      onClick={() => setShowSkippedWordsList(!showSkippedWordsList)}
                      className="w-full p-4 flex items-center justify-between hover:bg-rose-50/30 transition-all text-right cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center text-rose-700 shrink-0 select-none text-lg">
                          ⏩
                        </div>
                        <div className="text-right">
                          <h4 className="text-sm font-black text-rose-950">الكلمات غير المنجزة ({filteredSkippedKeys.length})</h4>
                        </div>
                      </div>
                      <span className={`text-slate-400 font-bold text-xs transition-transform duration-200 ${showSkippedWordsList ? "rotate-180 text-rose-600" : ""}`}>
                        ▼
                      </span>
                    </button>

                    {showSkippedWordsList && (
                      <div className="p-4 pt-0 border-t border-rose-100/40 space-y-3 animate-fadeIn">
                        <div className="bg-rose-50/60 p-2.5 rounded-xl border border-rose-100/50 text-[10.5px] font-bold text-rose-950 leading-relaxed mt-2">
                          الكلمات التي تخطيتها أو صعبت عليك في نطقك لها وتريد مراجعتها للفوز بنقاطها 🎯
                        </div>

                        {filteredSkippedKeys.length === 0 ? (
                          <div className="text-xs text-slate-400 font-bold bg-slate-50/80 text-center py-4 rounded-xl border border-rose-100/30">
                            رائع! لا توجد كلمات متخطاة حالياً 🎉
                          </div>
                        ) : (
                          <div className="max-h-[180px] overflow-y-auto space-y-1.5 pr-0.5" id="skipped-words-settings-scoller">
                            {filteredSkippedKeys.map((wordKey) => {
                              // Try finding matching word definition for meaning from local GSheet cached words
                              let meaning = "";
                              try {
                                const staticMatch = (staticSheetWords as any[])?.find((w: any) => w.word?.toLowerCase().trim() === wordKey.toLowerCase().trim());
                                if (staticMatch) {
                                  meaning = staticMatch.meaning;
                                } else {
                                  const cached = localStorage.getItem("stitchlab_sheet_words");
                                  if (cached) {
                                    const parsed = JSON.parse(cached);
                                    const match = parsed.find((w: any) => w.word.toLowerCase().trim() === wordKey.toLowerCase().trim());
                                    if (match) {
                                      meaning = match.meaning;
                                    }
                                  }
                                }
                              } catch (e) {}

                              return (
                                <div 
                                  key={wordKey} 
                                  className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-rose-100/50 hover:border-rose-200 transition-all text-xs shadow-xs"
                                >
                                  <div className="text-right flex flex-col gap-0.5 max-w-[60%]">
                                    <span className="font-sans font-black text-slate-800 capitalize select-all">
                                      {wordKey}
                                    </span>
                                    {meaning && (
                                      <span className="text-[10.5px] text-slate-400 font-bold truncate">
                                        {meaning}
                                      </span>
                                    )}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setReviewTargetWord(wordKey);
                                      setShowSettingsModal(false);
                                      setAcademyViewOpen(false);
                                    }}
                                    className="py-1 px-3 bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white text-[10px] font-black rounded-lg transition-all cursor-pointer active:scale-95 shadow-xs"
                                  >
                                    العودة للمراجعة 🔁
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>


                </div>
              </>
            )}

          </div>
        </div>
      )}

      {/* ⚔️ GORGEOUS RESPONSIVE CHALLENGE ACCEPTANCE MODAL */}
      {showChallengeModal && challengeChallenger && (
        <div className="fixed inset-0 bg-[#090816]/75 backdrop-blur-xl z-50 flex items-center justify-center p-4" dir="rtl">
          <div className="bg-gradient-to-b from-[#191535] to-[#0d0a20] text-white rounded-[32px] max-w-md w-full border-2 border-amber-400/80 shadow-[0_0_50px_rgba(245,158,11,0.25)] p-6 md:p-8 space-y-6 relative overflow-hidden animate-fadeIn text-center">
            
            {/* Ambient background glow orb */}
            <div className="absolute top-[-20%] left-[-20%] w-44 h-44 bg-purple-600/30 rounded-full blur-[60px] pointer-events-none"></div>
            <div className="absolute bottom-[-20%] right-[-20%] w-44 h-44 bg-pink-600/20 rounded-full blur-[60px] pointer-events-none"></div>

            {/* Glowing Trophy / Sword Seal */}
            <div className="relative mx-auto w-20 h-20 bg-gradient-to-tr from-amber-400 to-amber-200 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/25 animate-bounce" style={{ animationDuration: "3s" }}>
              <span className="text-4xl">⚔️</span>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl md:text-2xl font-black text-amber-300 font-sans tracking-tight">قُبِلت المبارزة! تحدّي تعلَم جديد ⚔️🔥</h3>
              <p className="text-xs text-purple-200 font-bold tracking-wide leading-relaxed">
                دعوة مبارزة وتنافس تفاعلية حية حصرية على StitchLab منصة الذكاء الاصطناعي
              </p>
            </div>

            <div className="bg-white/5 p-4 rounded-2xl border border-white/10 text-right space-y-2.5">
              <p className="text-sm font-semibold text-slate-100 leading-relaxed">
                لقد تحدّاك الطالب المتميّز <span className="text-pink-400 font-black underline decoration-2">{challengeChallenger}</span> في تعلّم الكلمات والطلاقة والحصول على المركز الأول!
              </p>
              <div className="text-[11px] text-amber-200/90 font-extrabold flex items-center gap-1.5">
                <span>🏆</span>
                <span>عند قبول التحدي، سيتم ربط حسابكما في لوحة المنافسين ومكافأة الفائزين بنقاط إضافية!</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3.5 pt-2">
              <button
                type="button"
                onClick={() => {
                  try {
                    // Save to resolved list
                    const resolved = JSON.parse(localStorage.getItem("stitchlab_resolved_challenges") || "[]");
                    if (!resolved.includes(challengeChallenger)) {
                      resolved.push(challengeChallenger);
                    }
                    localStorage.setItem("stitchlab_resolved_challenges", JSON.stringify(resolved));

                    // Add opponent entry
                    const linked = JSON.parse(localStorage.getItem("stitchlab_linked_opponents") || "[]");
                    if (!linked.some((o: any) => o.name === challengeChallenger)) {
                      linked.push({
                        name: challengeChallenger,
                        timestamp: new Date().toLocaleDateString("ar-EG"),
                        opponentLevel: "Intermediate",
                        wordsCount: Math.floor(Math.random() * 25) + 15,
                        pointsScored: Math.floor(Math.random() * 220) + 70
                      });
                      localStorage.setItem("stitchlab_linked_opponents", JSON.stringify(linked));
                    }

                    // Dispatch reload event
                    window.dispatchEvent(new Event("stitchlab_challenge_accepted"));
                    setShowChallengeModal(false);

                    // Celebrate!
                    try {
                      playAudioFeedback(true);
                    } catch (e) {}

                    import("canvas-confetti").then((m) => {
                      m.default({
                        particleCount: 120,
                        spread: 70,
                        origin: { y: 0.65 },
                        colors: ["#F59E0B", "#D946EF", "#10B981"]
                      });
                    });
                  } catch (err) {
                    console.warn(err);
                    setShowChallengeModal(false);
                  }
                }}
                className="w-full bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-600 hover:to-amber-500 text-slate-950 text-xs font-black py-3.5 px-4 rounded-xl transition-all shadow-md shadow-amber-500/10 cursor-pointer active:scale-95"
              >
                أقبل التحدي! 🤝
              </button>

              <button
                type="button"
                onClick={() => {
                  try {
                    const resolved = JSON.parse(localStorage.getItem("stitchlab_resolved_challenges") || "[]");
                    if (!resolved.includes(challengeChallenger)) {
                      resolved.push(challengeChallenger);
                    }
                    localStorage.setItem("stitchlab_resolved_challenges", JSON.stringify(resolved));
                    setShowChallengeModal(false);
                  } catch (e) {
                    setShowChallengeModal(false);
                  }
                }}
                className="w-full bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-bold py-3.5 px-4 rounded-xl transition-all cursor-pointer active:scale-95"
              >
                لاحقاً ⏱️
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 🎓 STITCHLAB ACADEMY PARTNER INVITATION DIALOG */}
      {pendingAcademyInvite && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 text-slate-800" dir="rtl">
          <div className="bg-white rounded-[32px] max-w-sm w-full border-2 border-pink-100 shadow-2xl p-6 md:p-8 space-y-6 relative overflow-hidden text-center animate-fadeIn">
            
            {/* Soft decorative background circles */}
            <div className="absolute top-[-10%] right-[-10%] w-24 h-24 bg-purple-100/40 rounded-full blur-xl pointer-events-none"></div>
            <div className="absolute bottom-[-10%] left-[-10%] w-24 h-24 bg-pink-100/40 rounded-full blur-xl pointer-events-none"></div>

            {/* Icon */}
            <div className="relative mx-auto w-16 h-16 bg-gradient-to-br from-pink-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-md animate-bounce" style={{ animationDuration: "4s" }}>
              <span className="text-3xl">🎓</span>
            </div>

            <div className="space-y-2 text-center">
              <h3 className="text-xl font-black text-purple-950 font-sans">الانضمام إلى الأكاديمية!</h3>
              <p className="text-xs text-slate-405 font-bold leading-normal">
                دعوة حصرية للانضمام مع زميلك الدراسي في StitchLab
              </p>
            </div>

            <div className="bg-purple-50/50 p-4 rounded-2xl border border-purple-100/60 text-right space-y-2">
              <p className="text-xs font-semibold text-slate-700 leading-relaxed text-center">
                لقد دعاك زميلك <span className="text-purple-700 font-extrabold">{pendingAcademyInvite.name}</span> للانضمام معًا في صفه التعليمي في <span className="text-pink-600 font-black">أكاديمية StitchLab</span> لمشاركة مسارك وتحفيز تقدمك!
              </p>
            </div>

            {/* Action buttons with Reciprocal Link */}
            <div className="grid grid-cols-2 gap-3.5 pt-1">
              <button
                type="button"
                onClick={async () => {
                  if (!auth.currentUser) return;
                  try {
                    const classmateId = pendingAcademyInvite.id; 
                    const classmateName = pendingAcademyInvite.name; 
                    const myUid = auth.currentUser.uid;
                    const myName = currentUser?.name || auth.currentUser.displayName || "طالب مميز";
                    const myEmail = auth.currentUser.email || "";

                    // Reciprocal addition in Firestore
                    await setDoc(doc(db, "classrooms", myUid, "members", classmateId), {
                      name: classmateName,
                      email: "زميلي المباشر في الأكاديمية",
                      joinedAt: new Date().toISOString()
                    });

                    await setDoc(doc(db, "classrooms", classmateId, "members", myUid), {
                      name: myName,
                      email: myEmail,
                      joinedAt: new Date().toISOString()
                    });

                    // Trigger confetti!
                    import("canvas-confetti").then((m) => {
                      m.default({
                        particleCount: 150,
                        spread: 80,
                        origin: { y: 0.6 }
                      });
                    });

                    // Silent join success, absolutely no alerts
                  } catch (err) {
                    console.error("Error joining classroom:", err);
                  } finally {
                    localStorage.removeItem("stitchlab_academy_invite_id");
                    localStorage.removeItem("stitchlab_academy_inviter_name");
                    setPendingAcademyInvite(null);
                  }
                }}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-700 hover:to-pink-600 text-white text-xs font-extrabold py-3 px-4 rounded-xl shadow-md cursor-pointer transition-all active:scale-95"
              >
                نعم، موافق 👍
              </button>

              <button
                type="button"
                onClick={() => {
                  localStorage.removeItem("stitchlab_academy_invite_id");
                  localStorage.removeItem("stitchlab_academy_inviter_name");
                  setPendingAcademyInvite(null);
                  setMainTab("home"); // Go to main interface (Home)
                  alert("تم تخطي الانضمام؛ نأخذك الآن للواجهة الرئيسية.");
                }}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-500 text-xs font-black py-3 px-4 rounded-xl cursor-pointer transition-all active:scale-95"
              >
                ليس الآن ⏱️
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 📜 STITCHLAB Terms & Conditions and Privacy Policy Overlay Modal */}
      {showTermsModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-start justify-center pt-[10vh] z-[100] p-4 overflow-y-auto" dir="rtl">
          <div className="bg-white rounded-[24px] p-6 max-w-lg w-full border border-purple-100 shadow-2xl text-right animate-fadeIn my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-sm font-black text-slate-850">شروط الاستخدام وسياسة الخصوصية 📜</h3>
              <button
                type="button"
                onClick={() => setShowTermsModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4 text-xs text-slate-600 leading-relaxed overflow-y-auto max-h-[60vh] pr-1">
              {/* Terms of Service */}
              <div>
                <h4 className="font-extrabold text-purple-950 text-xs mb-1">شروط الخدمة (Terms of Service)</h4>
                <p className="font-semibold text-slate-500 mb-2 leading-relaxed">بمواصلتك استخدام تطبيق StitchLab، أنت تقر وتوافق على الشروط التالية:</p>
                <ul className="list-disc list-inside space-y-1.5 pl-2 font-medium">
                  <li><strong className="font-bold text-slate-700">طبيعة الخدمة:</strong> StitchLab هو تطبيق تعليمي مخصص لمساعدة الطلاب على تنظيم كلماتهم ومعلوماتهم الدراسية.</li>
                  <li><strong className="font-bold text-slate-700">حفظ البيانات:</strong> يعتمد التطبيق على حسابك الشخصي في Google Drive لتخزين بياناتك في مجلد مخصص باسم 'StitchLab_Data'. أنت المسؤول الوحيد عن إدارة هذا المجلد ومحتوياته.</li>
                  <li><strong className="font-bold text-slate-700">إخلاء المسؤولية:</strong> يتم توفير التطبيق "كما هو" (As-Is). نحن لا نتحمل المسؤولية عن أي فقدان للبيانات ناتج عن حذف المستخدم للملفات من Google Drive أو أي سوء استخدام للحساب.</li>
                  <li><strong className="font-bold text-slate-700">التعديلات:</strong> نحتفظ بالحق في تعديل هذه الشروط أو تحديث ميزات التطبيق في أي وقت. استمرارك في استخدام التطبيق يعني قبولك لأي تعديلات جديدة.</li>
                  <li><strong className="font-bold text-slate-700">التواصل:</strong> لأي استفسار أو ملاحظة، يمكنك التواصل معنا عبر <a href="https://www.facebook.com/profile.php?id=61578668730709" target="_blank" rel="noopener noreferrer" className="text-purple-650 hover:text-pink-600 underline font-extrabold cursor-pointer">صفحتنا على فيسبوك</a>.</li>
                </ul>
              </div>

              <hr className="border-slate-100" />

              {/* Privacy Policy */}
              <div>
                <h4 className="font-extrabold text-purple-950 text-xs mb-1">سياسة الخصوصية لتطبيق StitchLab</h4>
                <p className="font-semibold text-slate-500 mb-2 leading-relaxed">نلتزم في تطبيق StitchLab بحماية خصوصيتك. نحن نستخدم Google Drive API حصرياً لحفظ تقدمك التعليمي in مجلد خاص يُسمى 'StitchLab_Data' داخل حسابك الشخصي في Google Drive.</p>
                <ul className="list-disc list-inside space-y-1 text-slate-500 pl-2 font-medium">
                  <li>• لا نصل إلى أي ملفات أخرى في حسابك.</li>
                  <li>• لا نشارك بياناتك مع أي أطراف ثالثة.</li>
                  <li>• لا نبيع أي معلومات.</li>
                  <li>• عند تسجيل الدخول، نطلب إذن الوصول فقط للمجلد المخصص للتطبيق لضمان مزامنة تقدمك التعليمي بشكل آمن.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
