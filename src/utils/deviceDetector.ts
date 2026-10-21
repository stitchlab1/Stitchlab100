/**
 * ============================================================================
 * Chrome Device Identification Utility (التعرف الذكي على أجهزة Google Chrome)
 * ============================================================================
 *
 * الخصائص:
 * 1. تحليل دقيق للـ User-Agent وبيئة Google Chrome (Windows, Mac, Android, iOS, etc.)
 * 2. توليد وحفظ معرّف فريد ومستقل لكل جهاز deviceId في localStorage.
 * 3. تزويد الواجهة بأيقونات وتسميات عربية دقيقة لكل جهاز.
 */

export type DeviceType = 'desktop' | 'mobile' | 'tablet';

export interface ChromeDeviceInfo {
  deviceId: string;
  deviceName: string;
  platform: string;
  deviceType: DeviceType;
  chromeVersion: string;
  isCurrentDevice: boolean;
}

const DEVICE_ID_KEY = 'stitchlab_device_id';
const DEVICE_NAME_OVERRIDE_KEY = 'stitchlab_device_name_override';

/**
 * الحصول على أو توليد معرّف الجهاز الفريد deviceId من localStorage
 */
export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined') return 'dev_server_env';

  try {
    let deviceId = localStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
      // توليد معرّف عشوائي فريد ومستقر
      const randomPart = Math.random().toString(36).substring(2, 10);
      const timePart = Date.now().toString(36);
      deviceId = `dev_chrome_${randomPart}_${timePart}`;
      localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
  } catch {
    return 'dev_fallback_' + Math.random().toString(36).substring(2, 8);
  }
}

/**
 * فحص خصائص User-Agent لتحديد اسم ونوع الجهاز بدقة في بيئة Google Chrome
 */
export function detectChromeDevice(): {
  deviceName: string;
  platform: string;
  deviceType: DeviceType;
  chromeVersion: string;
} {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      deviceName: 'Chrome on Unknown Device',
      platform: 'Unknown',
      deviceType: 'desktop',
      chromeVersion: '',
    };
  }

  // فحص إذا كان المستخدم قد قام بتخصيص اسم جهازه
  try {
    const override = localStorage.getItem(DEVICE_NAME_OVERRIDE_KEY);
    if (override && override.trim()) {
      // نستمر لتحديد المنصة لكن بالاسم المخصص
    }
  } catch {}

  const ua = navigator.userAgent || '';
  const platformStr = navigator.platform || '';

  // استخراج إصدار متصفح Chrome إن وجد
  let chromeVersion = '';
  const chromeMatch = ua.match(/(?:Chrome|CriOS)\/([0-9]+)/);
  if (chromeMatch && chromeMatch[1]) {
    chromeVersion = `v${chromeMatch[1]}`;
  }

  let deviceName = 'Google Chrome';
  let platform = 'Unknown';
  let deviceType: DeviceType = 'desktop';

  // 1. Android (هاتف أو تابلت)
  if (/Android/i.test(ua)) {
    platform = 'Android';
    if (!/Mobile/i.test(ua)) {
      deviceName = 'Chrome on Android Tablet';
      deviceType = 'tablet';
    } else {
      deviceName = 'Chrome on Android';
      deviceType = 'mobile';
    }
  }
  // 2. iPhone (Chrome CriOS)
  else if (/iPhone/i.test(ua)) {
    platform = 'iOS';
    deviceName = 'Chrome on iPhone';
    deviceType = 'mobile';
  }
  // 3. iPad
  else if (/iPad/i.test(ua) || (platformStr === 'MacIntel' && navigator.maxTouchPoints > 1)) {
    platform = 'iPadOS';
    deviceName = 'Chrome on iPad';
    deviceType = 'tablet';
  }
  // 4. Windows
  else if (/Windows NT|Win64|Win32/i.test(ua)) {
    platform = 'Windows';
    if (/Windows NT 10.0/i.test(ua)) {
      deviceName = 'Chrome on Windows';
    } else {
      deviceName = 'Chrome on Windows';
    }
    deviceType = 'desktop';
  }
  // 5. Mac OS
  else if (/Macintosh|Mac OS X/i.test(ua)) {
    platform = 'macOS';
    deviceName = 'Chrome on Mac';
    deviceType = 'desktop';
  }
  // 6. ChromeOS / Chromebook
  else if (/CrOS/i.test(ua)) {
    platform = 'ChromeOS';
    deviceName = 'Chrome on Chromebook';
    deviceType = 'desktop';
  }
  // 7. Linux
  else if (/Linux/i.test(ua)) {
    platform = 'Linux';
    deviceName = 'Chrome on Linux';
    deviceType = 'desktop';
  }

  return {
    deviceName,
    platform,
    deviceType,
    chromeVersion,
  };
}

/**
 * جلب كائن معلومات الجهاز بالكامل
 */
export function getFullChromeDeviceInfo(): ChromeDeviceInfo {
  const deviceId = getOrCreateDeviceId();
  const detected = detectChromeDevice();

  return {
    deviceId,
    deviceName: detected.deviceName,
    platform: detected.platform,
    deviceType: detected.deviceType,
    chromeVersion: detected.chromeVersion,
    isCurrentDevice: true,
  };
}
