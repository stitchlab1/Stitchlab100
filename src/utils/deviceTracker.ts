/**
 * StitchLab Device Tracker & Study Time Aggregator
 * ----------------------------------------------------
 * High-performance, Local-First, Zero-Server-Cost Architecture.
 * Designed to scale to 1,000,000+ students for FREE:
 * - 100% of second-by-second ticking runs in client memory and localStorage.
 * - Zero network writes while the student studies.
 * - Debounced synchronization to Firestore when authenticated.
 * - Multi-device aggregation: tracks study duration on every phone/device accessed.
 * - P2P / Offline pairing support via QR & quick codes.
 */

export interface DeviceRecord {
  id: string;
  name: string;
  model: string;
  brand: string;
  type: "mobile" | "tablet" | "desktop";
  os: string;
  browser: string;
  screenRes?: string;
  firstSeen: string;
  lastActive: string;
  totalSeconds: number;
  isCurrent?: boolean;
}

const STORAGE_DEVICE_ID_KEY = "stitchlab_current_device_id";
const STORAGE_DEVICES_REGISTRY_KEY = "stitchlab_study_devices_registry";
const STORAGE_LAST_IDLE_KEY = "stitchlab_last_active_timestamp";

/**
 * Generates or retrieves a persistent unique ID for this browser/device instance.
 */
export function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return "dev_server";
  let id = localStorage.getItem(STORAGE_DEVICE_ID_KEY);
  if (!id) {
    const randomPart = Math.random().toString(36).substring(2, 9);
    const timePart = Date.now().toString(36);
    id = `dev_${timePart}_${randomPart}`;
    localStorage.setItem(STORAGE_DEVICE_ID_KEY, id);
  }
  return id;
}

/**
 * Detects device hardware, model heuristics, operating system, and browser info.
 */
export function detectCurrentDeviceInfo(): Omit<DeviceRecord, "totalSeconds" | "firstSeen" | "lastActive"> {
  if (typeof window === "undefined") {
    return {
      id: "dev_server",
      name: "خادم",
      model: "Generic",
      brand: "Unknown",
      type: "desktop",
      os: "Server",
      browser: "Node.js",
    };
  }

  const id = getOrCreateDeviceId();
  const ua = navigator.userAgent || "";
  const platform = navigator.platform || "";
  const width = window.screen?.width || window.innerWidth || 360;
  const height = window.screen?.height || window.innerHeight || 640;
  const ratio = window.devicePixelRatio || 1;
  const screenRes = `${width}x${height} (@${ratio.toFixed(1)}x)`;

  let brand = "جهاز ذكي";
  let model = "هاتف محمول";
  let type: "mobile" | "tablet" | "desktop" = "mobile";
  let os = "نظام غير معروف";
  let browser = "متصفح الويب";

  // 1. Detect Device Type
  const isTablet = /(ipad|tablet|(android(?!.*mobile))|(windows(?!.*phone)(.*touch))|kindle|playbook|silk)/i.test(ua);
  const isMobile = /mobile|iphone|ipod|android.*mobile|blackberry|iemobile|opera mini/i.test(ua) || (width <= 768 && !isTablet);
  
  if (isTablet) {
    type = "tablet";
  } else if (isMobile) {
    type = "mobile";
  } else {
    type = "desktop";
  }

  // 2. Detect OS & Hardware Brand/Model
  if (/iPad/i.test(ua) || (platform === "MacIntel" && navigator.maxTouchPoints > 1 && !/iPhone/i.test(ua))) {
    type = "tablet";
    brand = "Apple";
    model = "iPad";
    os = "iPadOS";
  } else if (/iPhone/i.test(ua)) {
    type = "mobile";
    brand = "Apple";
    os = "iOS";
    
    // Heuristic iPhone model by screen resolution
    const maxDim = Math.max(width, height);
    const minDim = Math.min(width, height);
    if (maxDim >= 932) {
      model = "iPhone 15/16 Pro Max";
    } else if (maxDim >= 852) {
      model = "iPhone 15/16 / Pro";
    } else if (maxDim >= 926) {
      model = "iPhone 14/13/12 Pro Max";
    } else if (maxDim >= 844) {
      model = "iPhone 14/13/12";
    } else if (maxDim >= 812) {
      model = "iPhone 11 Pro / X / XS";
    } else if (maxDim >= 896) {
      model = "iPhone 11 / XR";
    } else if (maxDim <= 667) {
      model = "iPhone SE";
    } else {
      model = "Apple iPhone";
    }
  } else if (/Android/i.test(ua)) {
    brand = "Android";
    os = "Android";
    
    // Extract Android version
    const androidMatch = ua.match(/Android\s([0-9\.]+)/i);
    if (androidMatch) {
      os = `Android ${androidMatch[1]}`;
    }

    // Try extracting specific brand/model from Android UA build tag
    if (/SM-|Samsung/i.test(ua)) {
      brand = "Samsung";
      if (/SM-S92/i.test(ua)) model = "Samsung Galaxy S24";
      else if (/SM-S91/i.test(ua)) model = "Samsung Galaxy S23";
      else if (/SM-S90/i.test(ua)) model = "Samsung Galaxy S22";
      else if (/SM-A/i.test(ua)) model = "Samsung Galaxy A Series";
      else model = "Samsung Galaxy";
    } else if (/Pixel/i.test(ua)) {
      brand = "Google";
      const pixelMatch = ua.match(/Pixel\s?([0-9a-zA-Z\s]+)/i);
      model = pixelMatch ? `Google Pixel ${pixelMatch[1]}` : "Google Pixel";
    } else if (/Xiaomi|Redmi|POCO/i.test(ua)) {
      brand = "Xiaomi";
      model = /Redmi/i.test(ua) ? "Xiaomi Redmi" : /POCO/i.test(ua) ? "POCO Phone" : "Xiaomi Phone";
    } else if (/HUAWEI|Honor/i.test(ua)) {
      brand = "Huawei";
      model = /Honor/i.test(ua) ? "Honor Phone" : "Huawei Phone";
    } else if (/OnePlus/i.test(ua)) {
      brand = "OnePlus";
      model = "OnePlus Phone";
    } else if (/OPPO/i.test(ua)) {
      brand = "Oppo";
      model = "OPPO Phone";
    } else if (/vivo/i.test(ua)) {
      brand = "Vivo";
      model = "vivo Phone";
    } else {
      model = type === "tablet" ? "تابلت أندرويد" : "جوال أندرويد";
    }
  } else if (/Macintosh|Mac OS X/i.test(ua)) {
    brand = "Apple";
    model = "MacBook / iMac";
    type = "desktop";
    os = "macOS";
  } else if (/Windows NT/i.test(ua)) {
    brand = "PC";
    model = "كمبيوتر مكتبي / لابتوب";
    type = "desktop";
    os = "Windows";
    if (ua.includes("Windows NT 10.0")) os = "Windows 10/11";
  } else if (/Linux/i.test(ua)) {
    brand = "Linux";
    model = "جهاز Linux";
    type = "desktop";
    os = "Linux";
  }

  // 3. Detect Browser
  if (ua.includes("Capacitor") || (window as any).Capacitor?.isNativePlatform) {
    browser = "تطبيق StitchLab الرسمي";
  } else if (/EdgA?\/|Edge\//i.test(ua)) {
    browser = "Microsoft Edge";
  } else if (/SamsungBrowser/i.test(ua)) {
    browser = "Samsung Internet";
  } else if (/Chrome|CriOS/i.test(ua)) {
    browser = "Google Chrome";
  } else if (/Firefox|FxiOS/i.test(ua)) {
    browser = "Mozilla Firefox";
  } else if (/Safari/i.test(ua) && !/Chrome|CriOS/i.test(ua)) {
    browser = "Apple Safari";
  }

  // Build user-friendly display name
  const name = `${model}`;

  return {
    id,
    name,
    model,
    brand,
    type,
    os,
    browser,
    screenRes,
  };
}

/**
 * Returns all devices registered for this user in local storage.
 */
export function getLocalDevicesRegistry(uid?: string): Record<string, DeviceRecord> {
  if (typeof window === "undefined") return {};
  const userPrefix = uid ? `_${uid}` : "";
  const raw = localStorage.getItem(`${STORAGE_DEVICES_REGISTRY_KEY}${userPrefix}`);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null) {
      return parsed;
    }
  } catch (e) {
    console.warn("Failed to parse local devices registry:", e);
  }
  return {};
}

/**
 * Saves all devices registry to local storage.
 */
export function saveLocalDevicesRegistry(registry: Record<string, DeviceRecord>, uid?: string): void {
  if (typeof window === "undefined") return;
  const userPrefix = uid ? `_${uid}` : "";
  try {
    localStorage.setItem(`${STORAGE_DEVICES_REGISTRY_KEY}${userPrefix}`, JSON.stringify(registry));
    // Also dispatch an event so all listening components update synchronously
    window.dispatchEvent(new CustomEvent("stitchlab_device_registry_updated", {
      detail: { registry, uid }
    }));
  } catch (e) {
    console.error("Failed to save local devices registry:", e);
  }
}

/**
 * Ensures current device is registered in the devices list and returns its record.
 */
export function initializeCurrentDevice(uid?: string): DeviceRecord {
  const currentId = getOrCreateDeviceId();
  const registry = getLocalDevicesRegistry(uid);
  const info = detectCurrentDeviceInfo();
  const now = new Date().toISOString();

  if (registry[currentId]) {
    // Update dynamic fields like last active and browser, keep custom user-set name and totalSeconds
    registry[currentId] = {
      ...registry[currentId],
      lastActive: now,
      browser: info.browser,
      os: info.os,
      screenRes: info.screenRes,
    };
  } else {
    // Check if there was legacy standalone time
    const legacyKey = uid ? `stitchlab_learning_seconds_${uid}` : "stitchlab_learning_seconds";
    const legacySeconds = parseInt(localStorage.getItem(legacyKey) || "0", 10);

    registry[currentId] = {
      ...info,
      firstSeen: now,
      lastActive: now,
      totalSeconds: isNaN(legacySeconds) ? 0 : legacySeconds,
    };
  }

  saveLocalDevicesRegistry(registry, uid);
  return registry[currentId];
}

/**
 * Accurately commits added elapsed seconds to the current device and updates lastActive.
 * Local-First: runs in memory/localStorage without touching any network API!
 */
export function recordDeviceStudySeconds(additionalSeconds: number, uid?: string): { currentDeviceSeconds: number; grandTotalSeconds: number } {
  if (additionalSeconds <= 0) {
    const current = getLocalDevicesRegistry(uid);
    const curId = getOrCreateDeviceId();
    const curSecs = current[curId]?.totalSeconds || 0;
    return {
      currentDeviceSeconds: curSecs,
      grandTotalSeconds: calculateGrandTotalSeconds(current),
    };
  }

  const currentId = getOrCreateDeviceId();
  const registry = getLocalDevicesRegistry(uid);
  const now = new Date().toISOString();

  if (!registry[currentId]) {
    initializeCurrentDevice(uid);
  }

  const existing = registry[currentId] || {
    ...detectCurrentDeviceInfo(),
    firstSeen: now,
    totalSeconds: 0,
  };

  const newTotal = (existing.totalSeconds || 0) + additionalSeconds;
  registry[currentId] = {
    ...existing,
    totalSeconds: newTotal,
    lastActive: now,
  };

  saveLocalDevicesRegistry(registry, uid);

  // Also update legacy key for backward compatibility
  const legacyKey = uid ? `stitchlab_learning_seconds_${uid}` : "stitchlab_learning_seconds";
  try {
    localStorage.setItem(legacyKey, newTotal.toString());
  } catch (_) {}

  return {
    currentDeviceSeconds: newTotal,
    grandTotalSeconds: calculateGrandTotalSeconds(registry),
  };
}

/**
 * Calculates Grand Total Study Time across ALL registered mobile devices.
 */
export function calculateGrandTotalSeconds(registry: Record<string, DeviceRecord>): number {
  return Object.values(registry).reduce((sum, dev) => sum + (dev.totalSeconds || 0), 0);
}

/**
 * Merges remote devices from Firestore or QR/P2P sync cleanly without data loss.
 * Takes the MAX of totalSeconds per device so no student loses counted time.
 */
export function mergeDevicesRegistries(
  localRegistry: Record<string, DeviceRecord>,
  remoteRegistry: Record<string, DeviceRecord>
): Record<string, DeviceRecord> {
  const merged: Record<string, DeviceRecord> = { ...localRegistry };

  for (const [id, remoteDev] of Object.entries(remoteRegistry)) {
    if (!merged[id]) {
      merged[id] = { ...remoteDev };
    } else {
      const localDev = merged[id];
      // Keep user-customized name if changed from default
      const preservedName = localDev.name || remoteDev.name;
      const maxSeconds = Math.max(localDev.totalSeconds || 0, remoteDev.totalSeconds || 0);
      const latestActive = new Date(localDev.lastActive || 0) > new Date(remoteDev.lastActive || 0)
        ? localDev.lastActive
        : remoteDev.lastActive;
      const oldestSeen = new Date(localDev.firstSeen || Date.now()) < new Date(remoteDev.firstSeen || Date.now())
        ? localDev.firstSeen
        : remoteDev.firstSeen;

      merged[id] = {
        ...remoteDev,
        ...localDev,
        name: preservedName,
        totalSeconds: maxSeconds,
        lastActive: latestActive,
        firstSeen: oldestSeen,
      };
    }
  }

  return merged;
}

/**
 * Allows the student to rename a device in Settings (e.g. "جوالي الآيفون", "جوال سامسونج الشخصي").
 */
export function updateDeviceCustomName(deviceId: string, newName: string, uid?: string): void {
  const registry = getLocalDevicesRegistry(uid);
  if (registry[deviceId]) {
    registry[deviceId].name = newName.trim() || registry[deviceId].model;
    saveLocalDevicesRegistry(registry, uid);
  }
}

/**
 * Allows removing an old or unused device.
 */
export function deleteDeviceFromRegistry(deviceId: string, uid?: string): boolean {
  const registry = getLocalDevicesRegistry(uid);
  if (registry[deviceId]) {
    delete registry[deviceId];
    saveLocalDevicesRegistry(registry, uid);
    return true;
  }
  return false;
}

/**
 * Resets the study time for a device or all devices.
 */
export function resetDeviceStudyTime(deviceId?: string, uid?: string): void {
  const registry = getLocalDevicesRegistry(uid);
  if (deviceId && registry[deviceId]) {
    registry[deviceId].totalSeconds = 0;
  } else if (!deviceId) {
    Object.keys(registry).forEach((id) => {
      registry[id].totalSeconds = 0;
    });
  }
  saveLocalDevicesRegistry(registry, uid);
}

/**
 * Formats seconds into HH:MM:SS format.
 */
export function formatSecondsToDigital(totalSeconds: number): string {
  const safeSecs = Math.max(0, Math.floor(totalSeconds || 0));
  const hrs = Math.floor(safeSecs / 3600);
  const mins = Math.floor((safeSecs % 3600) / 60);
  const secs = safeSecs % 60;

  const pad = (n: number) => n.toString().padStart(2, "0");
  if (hrs > 0) {
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  }
  return `${pad(mins)}:${pad(secs)}`;
}

/**
 * Formats seconds into Arabic descriptive text.
 * e.g., "ساعتان و 15 دقيقة"
 */
export function formatSecondsToArabicText(totalSeconds: number): string {
  const safeSecs = Math.max(0, Math.floor(totalSeconds || 0));
  const hrs = Math.floor(safeSecs / 3600);
  const mins = Math.floor((safeSecs % 3600) / 60);
  const secs = safeSecs % 60;

  const parts: string[] = [];

  if (hrs > 0) {
    if (hrs === 1) parts.push("ساعة واحدة");
    else if (hrs === 2) parts.push("ساعتان");
    else if (hrs >= 3 && hrs <= 10) parts.push(`${hrs} ساعات`);
    else parts.push(`${hrs} ساعة`);
  }

  if (mins > 0) {
    if (mins === 1) parts.push("دقيقة واحدة");
    else if (mins === 2) parts.push("دقيقتان");
    else if (mins >= 3 && mins <= 10) parts.push(`${mins} دقائق`);
    else parts.push(`${mins} دقيقة`);
  }

  if (secs > 0 || parts.length === 0) {
    if (secs === 1) parts.push("ثانية واحدة");
    else if (secs === 2) parts.push("ثانيتان");
    else if (secs >= 3 && secs <= 10) parts.push(`${secs} ثوانٍ`);
    else parts.push(`${secs} ثانية`);
  }

  return parts.join(" و ");
}

/**
 * Formats relative timestamp in friendly Arabic (e.g., "نشط الآن", "منذ 5 دقائق").
 */
export function formatRelativeTimeArabic(isoDateStr: string): string {
  if (!isoDateStr) return "غير متوفر";
  try {
    const diffMs = Date.now() - new Date(isoDateStr).getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    if (diffSecs < 60) return "نشط الآن 🟢";
    const diffMins = Math.floor(diffSecs / 60);
    if (diffMins < 60) return `منذ ${diffMins} دقيقة`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `منذ ${diffHours} ساعة`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "أمس";
    if (diffDays < 7) return `منذ ${diffDays} أيام`;
    return new Date(isoDateStr).toLocaleDateString("ar-EG", { month: "short", day: "numeric" });
  } catch (_) {
    return "غير متوفر";
  }
}
