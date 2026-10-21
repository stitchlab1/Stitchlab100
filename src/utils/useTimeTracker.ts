import { useState, useEffect, useRef, useCallback } from 'react';
import {
  TimeTrackerEngine,
  type TimeTrackerConfig,
  type TimeTrackerState,
  type DeviceRecordItem,
  type StudentSessionRecord,
} from './timeTracker';
import { getFullChromeDeviceInfo, type ChromeDeviceInfo } from './deviceDetector';

export interface UseTimeTrackerOptions {
  /** معرف الطالب أو الإيميل (مثل stitchlab2027@gmail.com) */
  userId?: string | null;
  /** اسم الطالب للعرض والتوثيق */
  studentName?: string;
  /** تفعيل أو إيقاف التتبع */
  enabled?: boolean;
  /** مهلة انعدام الحركة بالثواني قبل إيقاف المؤقت (افتراضياً 45 ثانية) */
  idleTimeoutSeconds?: number;
  /** نقطة نهاية المزامنة المجمعة */
  syncEndpoint?: string;
  /** نقطة جلب الأجهزة السحابية */
  devicesEndpoint?: string;
}

export interface UseTimeTrackerReturn extends TimeTrackerState {
  /** وقت الجلسة الحالية منسقاً (HH:MM:SS) */
  formattedSessionTime: string;
  /** وقت التعلم التراكمي على هذا الجهاز بالذات منسقاً (HH:MM:SS) */
  formattedDeviceTime: string;
  /** إجمالي وقت التعلم المجمع لكافة أجهزة الطالب منسقاً (HH:MM:SS) */
  formattedTotalTime: string;
  /** دالة إنهاء الجلسة الحالية وتوثيقها ومزامنتها */
  endCurrentSession: () => StudentSessionRecord | null;
  /** دالة مزامنة مجمعة فورية (Lazy Batch Sync Manual Trigger) */
  syncBatchNow: () => Promise<void>;
  /** دالة إعادة جلب وتحديث قائمة الأجهزة المرتبطة بالحساب */
  refreshDevices: () => Promise<void>;
  /** دالة استرجاع سجل الجلسات السابقة */
  getSessionHistory: () => StudentSessionRecord[];
  /** تنسيق أي عدد من الثواني */
  formatSeconds: (seconds: number) => string;
}

export function formatTime(totalSecs: number): string {
  const safeSecs = Math.max(0, Math.floor(totalSecs || 0));
  const hrs = Math.floor(safeSecs / 3600);
  const mins = Math.floor((safeSecs % 3600) / 60);
  const secs = safeSecs % 60;

  const pad = (num: number) => num.toString().padStart(2, '0');
  return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
}

export function useTimeTracker({
  userId = 'stitchlab2027@gmail.com',
  studentName = 'طالب StitchLab',
  enabled = true,
  idleTimeoutSeconds = 45,
  syncEndpoint = '/api/time-tracker/sync',
  devicesEndpoint = '/api/time-tracker/devices',
}: UseTimeTrackerOptions): UseTimeTrackerReturn {
  const engineRef = useRef<TimeTrackerEngine | null>(null);

  const initialDevInfo = useRef<ChromeDeviceInfo>(getFullChromeDeviceInfo()).current;

  const [state, setState] = useState<TimeTrackerState>({
    totalSeconds: 0,
    deviceTotalSeconds: 0,
    sessionSeconds: 0,
    pendingSyncSeconds: 0,
    isIdle: false,
    isActive: false,
    isPageVisible: true,
    isSyncing: false,
    lastSyncedAt: null,
    idleCountdownSeconds: idleTimeoutSeconds,
    sessionStartTime: Date.now(),
    studentName,
    currentDeviceInfo: initialDevInfo,
    devicesList: [],
  });

  useEffect(() => {
    if (!userId || !enabled) {
      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
      }
      return;
    }

    const engine = new TimeTrackerEngine({
      userId,
      studentName,
      idleTimeoutSeconds,
      syncEndpoint,
      devicesEndpoint,
      onTick: (latestState) => {
        setState({ ...latestState });
      },
      onStateChange: (latestState) => {
        setState({ ...latestState });
      },
    });

    engineRef.current = engine;
    setState(engine.getState());

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [userId, studentName, enabled, idleTimeoutSeconds, syncEndpoint, devicesEndpoint]);

  const endCurrentSession = useCallback((): StudentSessionRecord | null => {
    if (engineRef.current) {
      return engineRef.current.endSession();
    }
    return null;
  }, []);

  const syncBatchNow = useCallback(async (): Promise<void> => {
    if (engineRef.current) {
      await engineRef.current.syncBatchNow();
    }
  }, []);

  const refreshDevices = useCallback(async (): Promise<void> => {
    if (engineRef.current) {
      await engineRef.current.fetchUserDevicesFromCloud();
    }
  }, []);

  const getSessionHistory = useCallback((): StudentSessionRecord[] => {
    if (typeof window === 'undefined' || !userId) return [];
    try {
      const raw = localStorage.getItem(`stitchlab_tracker_history_${userId}`);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }, [userId]);

  return {
    ...state,
    formattedSessionTime: formatTime(state.sessionSeconds),
    formattedDeviceTime: formatTime(state.deviceTotalSeconds),
    formattedTotalTime: formatTime(state.totalSeconds),
    endCurrentSession,
    syncBatchNow,
    refreshDevices,
    getSessionHistory,
    formatSeconds: formatTime,
  };
}
