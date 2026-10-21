/**
 * ============================================================================
 * TimeTrackerEngine - منظومة تتبع الوقت حسب الجهاز والمزامنة المجمعة مع الإيميل
 * Per-Device Time Tracking in Google Chrome (Zero DB Writes during Active Session)
 * ============================================================================
 *
 * الخصائص والمواصفات:
 * 1. التعرف الذكي على نوع جهاز Google Chrome (Chrome on Windows / Android / Mac / iOS / etc.)
 * 2. الحفاظ على الصفر تكلفة وسرعة الأداء المطلقة:
 *    - صفر طلبات شبكة (Zero API calls) أثناء العد المستمر للثواني.
 * 3. المزامنة المجمعة عند الخروج فقط (Lazy Batch Sync on Exit):
 *    - إرسال طلب واحد مجمع وخفيف جداً عند مغادرة الصفحة أو تسجيل الخروج عبر navigator.sendBeacon.
 * 4. تجميع أوقات كل الأجهزة المرتبطة بنفس الإيميل (Auth-Linked Aggregation).
 * 5. كشف الخمول التلقائي (Idle Detection) دون تأثر، مع إيقاف العد فور انعدام الحركة.
 */

import { getFullChromeDeviceInfo, type ChromeDeviceInfo } from './deviceDetector';

export interface DeviceRecordItem {
  deviceId: string;
  deviceName: string;
  totalSeconds: number;
  lastActive: number;
  isCurrentDevice?: boolean;
}

export interface TimeTrackerConfig {
  /** معرف الطالب أو الإيميل المميز */
  userId: string;
  /** اسم الطالب للعرض والتوثيق */
  studentName?: string;
  /** مهلة انعدام الحركة بالثواني قبل إيقاف المؤقت (افتراضياً 45 ثانية) */
  idleTimeoutSeconds?: number;
  /** بادئة مفاتيح التخزين */
  storagePrefix?: string;
  /** نقطة نهاية المزامنة المجمعة */
  syncEndpoint?: string;
  /** نقطة جلب أجهزة الحساب */
  devicesEndpoint?: string;
  /** كولباك يتم استدعاؤه كل ثانية لتحديث الواجهة */
  onTick?: (state: TimeTrackerState) => void;
  /** كولباك يتم استدعاؤه عند تغير الحالة (نشط / خامل / تزامن / تحديث أجهزة) */
  onStateChange?: (state: TimeTrackerState) => void;
}

export interface DeviceTimeSyncPayload {
  userId: string;
  deviceId: string;
  deviceName: string;
  deltaSeconds: number;
  deviceTotalSeconds: number;
  sessionSeconds: number;
  timestamp: number;
}

export interface StudentSessionRecord {
  id: string;
  userId: string;
  studentName: string;
  deviceId: string;
  deviceName: string;
  startTime: number;
  endTime: number;
  durationSeconds: number;
  formattedDuration: string;
  dateStr: string;
}

export interface TimeTrackerState {
  totalSeconds: number; // إجمالي الوقت المجمع لكافة أجهزة الطالب المرتبطة بالإيميل
  deviceTotalSeconds: number; // الوقت التراكمي على هذا الجهاز بالذات
  sessionSeconds: number; // وقت الجلسة الحالية
  pendingSyncSeconds: number; // الثواني غير المزامنة بعد
  isIdle: boolean;
  isActive: boolean;
  isPageVisible: boolean;
  isSyncing: boolean;
  lastSyncedAt: number | null;
  idleCountdownSeconds: number;
  sessionStartTime: number;
  studentName?: string;
  currentDeviceInfo: ChromeDeviceInfo;
  devicesList: DeviceRecordItem[]; // قائمة كافة الأجهزة المرتبطة بالحساب
}

export class TimeTrackerEngine {
  private config: Required<Pick<TimeTrackerConfig, 'userId' | 'idleTimeoutSeconds' | 'storagePrefix'>> & TimeTrackerConfig;

  // معلومات الجهاز الحالي
  private currentDeviceInfo: ChromeDeviceInfo;

  // الحالات الزمنية
  private totalSeconds: number = 0; // إجمالي كل الأجهزة المجمع
  private deviceTotalSeconds: number = 0; // إجمالي هذا الجهاز
  private sessionSeconds: number = 0; // الجلسة الحالية
  private pendingSyncSeconds: number = 0; // الثواني بانتظار المزامنة عند الخروج
  private isIdle: boolean = false;
  private isPageVisible: boolean = typeof document !== 'undefined' ? !document.hidden : true;
  private isSyncing: boolean = false;
  private lastSyncedAt: number | null = null;
  private sessionStartTime: number = Date.now();
  private devicesList: DeviceRecordItem[] = [];

  // مستشعرات الحركة وتوقيت الخمول
  private lastActivityTimestamp: number = Date.now();
  private tickIntervalId: any = null;
  private throttledTimeout: any = null;
  private isDestroyed: boolean = false;

  private readonly activityEvents: string[] = [
    'mousemove',
    'pointermove',
    'mousedown',
    'keydown',
    'click',
    'touchstart',
    'touchmove',
    'scroll',
    'wheel',
  ];

  constructor(config: TimeTrackerConfig) {
    this.config = {
      idleTimeoutSeconds: 45, // 45 ثانية خمول
      storagePrefix: 'stitchlab_tracker_',
      syncEndpoint: '/api/time-tracker/sync',
      devicesEndpoint: '/api/time-tracker/devices',
      ...config,
    };

    // 1. التعرف الذكي على جهاز Google Chrome الحالي وتوليد المعرف
    this.currentDeviceInfo = getFullChromeDeviceInfo();

    // 2. استرجاع البيانات المخزنة محلياً لهذا الجهاز والجلسة
    this.restoreFromLocalStorages();

    // 3. ربط مستمعي أحداث الحركة والنافذة
    this.attachEventListeners();

    // 4. بدء حلقة التحديث المستمر محلياً (Zero DB Writes)
    this.startEngineLoop();

    // 5. جلب الأجهزة وسجل الأوقات المجمعة المرتبطة بالإيميل (مرة واحدة عند التحميل)
    this.fetchUserDevicesFromCloud();
  }

  /** مفاتيح التخزين المخصصة */
  private getDeviceStorageKey(): string {
    return `${this.config.storagePrefix}dev_${this.config.userId}_${this.currentDeviceInfo.deviceId}`;
  }

  private getSessionStorageKey(): string {
    return `${this.config.storagePrefix}sess_${this.config.userId}_${this.currentDeviceInfo.deviceId}`;
  }

  private getHistoryStorageKey(): string {
    return `${this.config.storagePrefix}history_${this.config.userId}`;
  }

  /** استرجاع وقت الجهاز والجلسة محلياً */
  private restoreFromLocalStorages(): void {
    if (typeof window === 'undefined') return;

    // أ) وقت الجهاز الحالي التراكمي
    try {
      const rawDev = localStorage.getItem(this.getDeviceStorageKey());
      if (rawDev) {
        const parsed = JSON.parse(rawDev);
        this.deviceTotalSeconds = Math.max(0, Number(parsed.deviceTotalSeconds) || 0);
        this.lastSyncedAt = parsed.lastSyncedAt || null;
      }
    } catch (e) {
      this.deviceTotalSeconds = 0;
    }

    // ب) الجلسة الحالية من sessionStorage
    try {
      const rawSess = sessionStorage.getItem(this.getSessionStorageKey());
      if (rawSess) {
        const parsedSess = JSON.parse(rawSess);
        this.sessionSeconds = Math.max(0, Number(parsedSess.sessionSeconds) || 0);
        this.sessionStartTime = Number(parsedSess.sessionStartTime) || Date.now();
      } else {
        this.sessionSeconds = 0;
        this.sessionStartTime = Date.now();
        this.persistSessionLocally();
      }
    } catch {
      this.sessionSeconds = 0;
      this.sessionStartTime = Date.now();
    }

    // تعيين القيمة المبدئية للإجمالي المجمع
    this.totalSeconds = Math.max(this.totalSeconds, this.deviceTotalSeconds);
  }

  /** حفظ بيانات الجلسة محلياً فقط (صفر طلبات شبكة) */
  private persistSessionLocally(): void {
    if (this.isDestroyed || typeof sessionStorage === 'undefined') return;
    try {
      sessionStorage.setItem(
        this.getSessionStorageKey(),
        JSON.stringify({
          sessionSeconds: this.sessionSeconds,
          sessionStartTime: this.sessionStartTime,
          deviceId: this.currentDeviceInfo.deviceId,
          deviceName: this.currentDeviceInfo.deviceName,
          lastUpdated: Date.now(),
        })
      );
    } catch (e) {}
  }

  /** حفظ وقت الجهاز الحالي محلياً فقط */
  private persistDeviceLocally(): void {
    if (this.isDestroyed || typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(
        this.getDeviceStorageKey(),
        JSON.stringify({
          deviceId: this.currentDeviceInfo.deviceId,
          deviceName: this.currentDeviceInfo.deviceName,
          deviceTotalSeconds: this.deviceTotalSeconds,
          lastSyncedAt: this.lastSyncedAt || 0,
          lastUpdated: Date.now(),
        })
      );
    } catch (e) {}
  }

  /** جلب وتجميع سجل أجهزة الطالب المرتبطة بنفس الإيميل (عند الدخول) */
  public async fetchUserDevicesFromCloud(): Promise<void> {
    if (!this.config.devicesEndpoint || typeof fetch === 'undefined') return;

    try {
      const url = `${this.config.devicesEndpoint}?userId=${encodeURIComponent(this.config.userId)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.devices)) {
          // تحديث قائمة الأجهزة وتحديد الجهاز الحالي
          const formattedDevices: DeviceRecordItem[] = data.devices.map((dev: any) => ({
            deviceId: dev.deviceId,
            deviceName: dev.deviceName || 'Google Chrome',
            totalSeconds: Number(dev.totalSeconds) || 0,
            lastActive: Number(dev.lastActive) || Date.now(),
            isCurrentDevice: dev.deviceId === this.currentDeviceInfo.deviceId,
          }));

          // التأكد من وجود الجهاز الحالي بالقائمة
          const currentInList = formattedDevices.find((d) => d.deviceId === this.currentDeviceInfo.deviceId);
          if (!currentInList) {
            formattedDevices.unshift({
              deviceId: this.currentDeviceInfo.deviceId,
              deviceName: this.currentDeviceInfo.deviceName,
              totalSeconds: this.deviceTotalSeconds,
              lastActive: Date.now(),
              isCurrentDevice: true,
            });
          } else {
            // مزامنة التراكمي الأحدث بين السيرفر والمحلي
            if (currentInList.totalSeconds > this.deviceTotalSeconds) {
              this.deviceTotalSeconds = currentInList.totalSeconds;
              this.persistDeviceLocally();
            } else {
              currentInList.totalSeconds = this.deviceTotalSeconds;
            }
          }

          this.devicesList = formattedDevices;
          this.totalSeconds = formattedDevices.reduce((sum, d) => sum + d.totalSeconds, 0);
          this.notifyState();
        }
      }
    } catch (err) {
      console.warn('[TimeTracker] لم نتمكن من جلب الأجهزة السحابية، سنعتمد على التخزين المحلي:', err);
    }
  }

  /** معالجة نشاط وحركة المستخدم لإلغاء الخمول فوراً */
  private handleUserMovement = (): void => {
    this.lastActivityTimestamp = Date.now();

    if (this.isIdle) {
      this.isIdle = false;
      this.notifyState();
    }
  };

  private onUserActivityThrottled = (): void => {
    if (this.throttledTimeout) return;
    this.handleUserMovement();
    this.throttledTimeout = setTimeout(() => {
      this.throttledTimeout = null;
    }, 400);
  };

  private handleVisibilityChange = (): void => {
    if (typeof document === 'undefined') return;
    const isHidden = document.hidden;
    this.isPageVisible = !isHidden;

    if (isHidden) {
      // إخفاء التبويب -> إيقاف مؤقت ومزامنة مجمعة عبر Beacon
      this.notifyState();
      this.syncOnExitBeacon();
    } else {
      // عودة الطالب للتبويب -> استئناف العد فوراً
      this.lastActivityTimestamp = Date.now();
      this.isIdle = false;
      this.notifyState();
    }
  };

  private handleBeforeUnload = (): void => {
    this.syncOnExitBeacon();
  };

  private attachEventListeners(): void {
    if (typeof window === 'undefined') return;

    this.activityEvents.forEach((ev) => {
      window.addEventListener(ev, this.onUserActivityThrottled, { passive: true });
    });

    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    window.addEventListener('beforeunload', this.handleBeforeUnload);
    window.addEventListener('pagehide', this.handleBeforeUnload);
  }

  private detachEventListeners(): void {
    if (typeof window === 'undefined') return;

    this.activityEvents.forEach((ev) => {
      window.removeEventListener(ev, this.onUserActivityThrottled);
    });

    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
    window.removeEventListener('pagehide', this.handleBeforeUnload);
  }

  /**
   * حلقة العد الفائق الكفاءة:
   * شرط العد: وجود حركة حديثة (غير خامل) + الصفحة مرئية.
   * لا توجد أي اتصالات شبكة أثناء العد (Zero Network Requests).
   */
  private startEngineLoop(): void {
    if (typeof window === 'undefined') return;

    this.tickIntervalId = setInterval(() => {
      if (this.isDestroyed) return;

      const now = Date.now();
      const inactiveSeconds = Math.floor((now - this.lastActivityTimestamp) / 1000);

      // كشف الخمول وانعدام الحركة
      if (inactiveSeconds >= this.config.idleTimeoutSeconds) {
        if (!this.isIdle) {
          this.isIdle = true;
          this.notifyState();
        }
      } else {
        if (this.isIdle) {
          this.isIdle = false;
          this.notifyState();
        }
      }

      // شرط احتساب الثواني
      const canCount = this.isPageVisible && !this.isIdle;

      if (canCount) {
        this.sessionSeconds += 1;
        this.deviceTotalSeconds += 1;
        this.totalSeconds += 1;
        this.pendingSyncSeconds += 1;

        // تحديث الجهاز الحالي في قائمة الأجهزة المحلية
        if (this.devicesList.length > 0) {
          const currentDev = this.devicesList.find((d) => d.deviceId === this.currentDeviceInfo.deviceId);
          if (currentDev) {
            currentDev.totalSeconds = this.deviceTotalSeconds;
            currentDev.lastActive = now;
          }
        }

        // حفظ محلي خفيف
        this.persistSessionLocally();
        if (this.sessionSeconds % 5 === 0) {
          this.persistDeviceLocally();
        }
      }

      if (this.config.onTick) {
        this.config.onTick(this.getState());
      }
    }, 1000);
  }

  /**
   * المزامنة المجمعة الخفيفة عند الخروج عبر navigator.sendBeacon
   * (Lazy Batch Sync on Exit)
   */
  public syncOnExitBeacon(): boolean {
    if (this.pendingSyncSeconds <= 0 || typeof navigator === 'undefined') return true;

    const payload: DeviceTimeSyncPayload = {
      userId: this.config.userId,
      deviceId: this.currentDeviceInfo.deviceId,
      deviceName: this.currentDeviceInfo.deviceName,
      deltaSeconds: this.pendingSyncSeconds,
      deviceTotalSeconds: this.deviceTotalSeconds,
      sessionSeconds: this.sessionSeconds,
      timestamp: Date.now(),
    };

    if (navigator.sendBeacon && this.config.syncEndpoint) {
      try {
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        const ok = navigator.sendBeacon(this.config.syncEndpoint, blob);
        if (ok) {
          this.pendingSyncSeconds = 0;
          this.lastSyncedAt = Date.now();
          this.persistDeviceLocally();
          return true;
        }
      } catch (e) {
        console.warn('[TimeTracker] فشل إرسال Beacon:', e);
      }
    }
    return false;
  }

  /**
   * المزامنة المجمعة اليدوية أو عند إنهاء الجلسة عبر fetch
   */
  public async syncBatchNow(): Promise<void> {
    if (this.isSyncing || typeof fetch === 'undefined') return;

    this.isSyncing = true;
    this.notifyState();

    const deltaToSync = this.pendingSyncSeconds;
    const payload: DeviceTimeSyncPayload = {
      userId: this.config.userId,
      deviceId: this.currentDeviceInfo.deviceId,
      deviceName: this.currentDeviceInfo.deviceName,
      deltaSeconds: deltaToSync,
      deviceTotalSeconds: this.deviceTotalSeconds,
      sessionSeconds: this.sessionSeconds,
      timestamp: Date.now(),
    };

    try {
      const res = await fetch(this.config.syncEndpoint || '/api/time-tracker/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      });

      if (res.ok) {
        const data = await res.json();
        this.pendingSyncSeconds = Math.max(0, this.pendingSyncSeconds - deltaToSync);
        this.lastSyncedAt = Date.now();
        this.persistDeviceLocally();

        if (data.devices && Array.isArray(data.devices)) {
          this.devicesList = data.devices.map((d: any) => ({
            deviceId: d.deviceId,
            deviceName: d.deviceName || 'Google Chrome',
            totalSeconds: Number(d.totalSeconds) || 0,
            lastActive: Number(d.lastActive) || Date.now(),
            isCurrentDevice: d.deviceId === this.currentDeviceInfo.deviceId,
          }));
          this.totalSeconds = Number(data.aggregatedTotalSeconds) || this.totalSeconds;
        }
      }
    } catch (err) {
      console.warn('[TimeTracker] تعذر إتمام المزامنة المجمعة عبر Fetch:', err);
    } finally {
      this.isSyncing = false;
      this.notifyState();
    }
  }

  /**
   * إنهاء الجلسة الحالية وتوثيقها
   */
  public endSession(): StudentSessionRecord {
    const finalSessionSeconds = this.sessionSeconds;
    const now = Date.now();

    const record: StudentSessionRecord = {
      id: 'sess_' + Math.random().toString(36).substring(2, 9),
      userId: this.config.userId,
      studentName: this.config.studentName || this.config.userId,
      deviceId: this.currentDeviceInfo.deviceId,
      deviceName: this.currentDeviceInfo.deviceName,
      startTime: this.sessionStartTime,
      endTime: now,
      durationSeconds: finalSessionSeconds,
      formattedDuration: this.formatDuration(finalSessionSeconds),
      dateStr: new Date(now).toLocaleDateString('ar-SA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
    };

    // حفظ في سجل الجلسات
    try {
      const historyRaw = localStorage.getItem(this.getHistoryStorageKey());
      const historyList: StudentSessionRecord[] = historyRaw ? JSON.parse(historyRaw) : [];
      historyList.unshift(record);
      localStorage.setItem(this.getHistoryStorageKey(), JSON.stringify(historyList.slice(0, 30)));
    } catch (e) {}

    // مسح الجلسة من sessionStorage
    try {
      sessionStorage.removeItem(this.getSessionStorageKey());
    } catch (e) {}

    this.sessionSeconds = 0;
    this.sessionStartTime = Date.now();

    // مزامنة مجمعة فورية عند الإنهاء
    this.syncBatchNow();
    this.notifyState();

    return record;
  }

  private formatDuration(secs: number): string {
    const s = Math.max(0, Math.floor(secs));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const rem = s % 60;
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(h)}:${pad(m)}:${pad(rem)}`;
  }

  public getState(): TimeTrackerState {
    const now = Date.now();
    const inactiveSeconds = Math.floor((now - this.lastActivityTimestamp) / 1000);
    const idleCountdown = Math.max(0, this.config.idleTimeoutSeconds - inactiveSeconds);

    return {
      totalSeconds: this.totalSeconds,
      deviceTotalSeconds: this.deviceTotalSeconds,
      sessionSeconds: this.sessionSeconds,
      pendingSyncSeconds: this.pendingSyncSeconds,
      isIdle: this.isIdle,
      isActive: this.isPageVisible && !this.isIdle,
      isPageVisible: this.isPageVisible,
      isSyncing: this.isSyncing,
      lastSyncedAt: this.lastSyncedAt,
      idleCountdownSeconds: idleCountdown,
      sessionStartTime: this.sessionStartTime,
      studentName: this.config.studentName,
      currentDeviceInfo: this.currentDeviceInfo,
      devicesList: this.devicesList,
    };
  }

  private notifyState(): void {
    if (this.config.onStateChange) {
      this.config.onStateChange(this.getState());
    }
  }

  public destroy(): void {
    this.isDestroyed = true;
    if (this.tickIntervalId) clearInterval(this.tickIntervalId);
    if (this.throttledTimeout) clearTimeout(this.throttledTimeout);
    this.detachEventListeners();
    this.syncOnExitBeacon();
  }
}
