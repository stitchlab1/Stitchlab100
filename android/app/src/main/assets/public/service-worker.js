const CACHE_VERSION = "v4";
const STATIC_CACHE_NAME = `stitchlab-static-${CACHE_VERSION}`;
const IMAGE_CACHE_NAME = `stitchlab-images-${CACHE_VERSION}`;

const ASSETS_TO_PRECACHE = [
  "/",
  "/index.html",
  "/manifest.json",
  "/stitchlab_icon_hd.png"
];

// Install Event - Pre-cache core files for immediate offline load
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Pre-caching critical assets...");
      return cache.addAll(ASSETS_TO_PRECACHE);
    }).then(() => {
      console.log("[Service Worker] Pre-cache complete. Skipping waiting...");
      return self.skipWaiting();
    })
  );
});

// Activate Event - Clean up stale caches from previous versions
self.addEventListener("activate", (event) => {
  const activeCaches = [STATIC_CACHE_NAME, IMAGE_CACHE_NAME];
  event.waitUntil(
    caches.keys().then((allCacheNames) => {
      return Promise.all(
        allCacheNames.map((cacheName) => {
          if (!activeCaches.includes(cacheName)) {
            console.log(`[Service Worker] Deleting obsolete cache: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log("[Service Worker] Claiming clients...");
      return self.clients.claim();
    })
  );
});

// Fetch Interceptor
self.addEventListener("fetch", (event) => {
  const { request } = event;
  
  // We only intercept GET operations
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // 1. SMART ADSTERRA HANDLING (Intercept ad requests when offline to show warning modal)
  const isAdRequest = 
    url.hostname.includes("highperformanceformat.com") || 
    url.hostname.includes("adsterra") || 
    url.hostname.includes("highrevenuegate.com") ||
    url.pathname.includes("invoke.js") ||
    url.hostname.includes("onclickads") ||
    url.hostname.includes("popads") ||
    url.hostname.includes("exoclick");

  if (isAdRequest) {
    event.respondWith(
      fetch(request).catch(() => {
        // Device is offline or request failed: return a custom JavaScript script that alerts the user visually
        return new Response(`
          console.log("StitchLab Adsterra Interceptor: User is offline during ad request.");
          (function() {
            const alertId = "sw-offline-ad-banner";
            if (!document.getElementById(alertId)) {
              const banner = document.createElement("div");
              banner.id = alertId;
              banner.style.position = "fixed";
              banner.style.bottom = "85px";
              banner.style.left = "20px";
              banner.style.right = "20px";
              banner.style.background = "linear-gradient(135deg, #FFF5F7, #FFF9FA)";
              banner.style.border = "2px dashed #EC4899";
              banner.style.borderRadius = "24px";
              banner.style.padding = "18px";
              banner.style.zIndex = "999999";
              banner.style.direction = "rtl";
              banner.style.textAlign = "center";
              banner.style.boxShadow = "0 20px 45px rgba(236, 72, 153, 0.25)";
              banner.style.fontFamily = "system-ui, -apple-system, BlinkMacSystemFont, sans-serif";
              
              banner.innerHTML = \`
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;">
                  <span style="font-size: 28px; filter: drop-shadow(0 42px 10px rgba(0,0,0,0.15));">🚫 🔒</span>
                  <strong style="color: #6B21A8; font-size: 15px; font-weight: 900;">يرجى الإتصال بالإنترنت لمشاهدة الإعلان!</strong>
                  <p style="color: #DB2777; font-size: 11.5px; margin: 0; font-weight: 700; line-height: 1.5;">الفيديو الإعلاني يتطلب اتصالاً بشبكة الإنترنت لتتمكن من زيادة وقت التعلم أو فتح الحزم الجديدة.</p>
                </div>
              \`;
              document.body.appendChild(banner);
              
              // Vibration pattern if supported
              if (navigator.vibrate) {
                navigator.vibrate([100, 50, 100]);
              }

              setTimeout(() => {
                const el = document.getElementById(alertId);
                if (el) {
                  el.style.transition = "transform 0.5s ease, opacity 0.5s ease";
                  el.style.transform = "translateY(30px)";
                  el.style.opacity = "0";
                  setTimeout(() => el.remove(), 500);
                }
              }, 6500);
            }
          })();
        `, {
          headers: { "Content-Type": "application/javascript; charset=utf-8" }
        });
      })
    );
    return;
  }

  // 2. IMAGE CACHING STRATEGY (Cache-First for crochet / logo images)
  const isImage = 
    request.destination === "image" || 
    url.pathname.match(/\.(png|jpg|jpeg|gif|webp|svg|ico)$/) ||
    url.pathname.includes("/assets/") ||
    url.hostname.includes("firebasestorage.googleapis.com");

  if (isImage) {
    event.respondWith(
      caches.open(IMAGE_CACHE_NAME).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            // Already in cache! Return instantly and save data
            return cachedResponse;
          }
          
          // Fetch from network, store in Cache Storage, and return
          return fetch(request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => {
            // Return an offline icon placeholder if network load fails and not cached
            return caches.match("/stitchlab_icon_hd.png");
          });
        });
      })
    );
    return;
  }

  // 3. CORE SITE FILES STRATEGY (Network-First, falling back to cache when offline)
  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(STATIC_CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Offline fallback: try cache match
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Fallback for navigation page requests when totally offline
          if (request.mode === "navigate") {
            return caches.match("/");
          }
        });
      })
  );
});
