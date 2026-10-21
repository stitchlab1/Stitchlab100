import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.text({ type: ['text/plain', 'text/*'] }));

// Security Headers & Nonce generation middleware (active for production)
app.use((req, res, next) => {
  const isProd = process.env.NODE_ENV === "production";
  
  // Always generate a strong random cryptographic nonce
  const nonce = crypto.randomBytes(16).toString("base64");
  res.locals.nonce = nonce;

  if (isProd) {
    // 1. Cross-Origin-Opener-Policy (COOP)
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin-allow-popups");

    // 2. X-Frame-Options (Clickjacking mitigation)
    res.setHeader("X-Frame-Options", "SAMEORIGIN");

    // 3. Content-Security-Policy (CSP)
    const frameAncestors = "frame-ancestors 'self' https://*.google.com https://*.run.app https://ai.studio https://*.googleusercontent.com";
    
    const csp = [
      "default-src 'self'",
      `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval' 'unsafe-inline' https: http:`,
      "style-src 'self' 'unsafe-inline' https:",
      "img-src 'self' data: blob: https: http:",
      "font-src 'self' data: https:",
      "connect-src 'self' https: wss: http: ws:",
      "object-src 'none'",
      "base-uri 'self'",
      frameAncestors,
      "require-trusted-types-for 'script'",
      "trusted-types *"
    ].join("; ");

    res.setHeader("Content-Security-Policy", csp);
  }
  next();
});

// Helper to serve index.html with dynamically injected nonces and Open Graph tags
const serveIndexHtml = (req: express.Request, res: express.Response) => {
  const isProd = process.env.NODE_ENV === "production";
  const hasDist = fs.existsSync(path.join(process.cwd(), "dist", "index.html"));
  const baseDir = (isProd || hasDist) ? "dist" : ".";
  const filePath = path.join(process.cwd(), baseDir, "index.html");

  if (!fs.existsSync(filePath)) {
    res.status(404).send("Index file not found");
    return;
  }

  let html = fs.readFileSync(filePath, "utf8");

  // In production, support dynamic Open Graph tags for academyInvite query parameter
  const academyInvite = req.query.academyInvite;
  if (academyInvite && isProd) {
    const inviterName = req.query.inviterName ? String(req.query.inviterName) : "";
    const previewImage = req.query.previewImage ? String(req.query.previewImage) : "";

    const title = inviterName 
      ? `لقد دعاك صديقك ${inviterName} للانضمام إلى صفوف StitchLab!` 
      : `لقد دعاك صديقك للانضمام إلى صفوف StitchLab!`;
    const description = `اضغط هنا لقبول الدعوة والبدء في التحدي الدراسي`;
    const image = previewImage || "https://raw.githubusercontent.com/stitchlab1/stitchlab2/0ceec11a5ca77c5d4607a90cab424bc9ec880155/stitchlab_icon_hd.png";

    const protocol = req.protocol;
    const host = req.get("host");
    const fullUrl = `${protocol}://${host}${req.originalUrl || req.url}`;

    const ogTags = `
    <!-- Dynamically Injected Open Graph tags by StitchLab server -->
    <meta property="og:type" content="website" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:image" content="${image}" />
    <meta property="og:url" content="${fullUrl}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />
    <meta name="twitter:image" content="${image}" />
    `;
    html = html.replace("<head>", `<head>${ogTags}`);
  }

  // Inject nonce into all script tags for secure CSP in production
  const nonce = res.locals.nonce;
  if (nonce && isProd) {
    html = html.replace(/<script/g, `<script nonce="${nonce}"`);
  }

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
};

// Intercept GET "/" to serve customized index.html with Open Graph tags and nonces in production
app.get("/", (req, res, next) => {
  if (process.env.NODE_ENV === "production") {
    serveIndexHtml(req, res);
  } else {
    next();
  }
});

// Lazy-loaded Gemini AI client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// 1. Interactive AI Assistant / Conversational Buddy Route
app.post("/api/gemini/chat", async (req, res) => {
  try {
    const { message, history, personaId, personaName, personaDescription, userLevel } = req.body;
    
    if (!message) {
      res.status(400).json({ error: "Message is required" });
      return;
    }

    const ai = getGeminiClient();

    const systemInstruction = `
You are an expert English Language Coach designed for Arabic speakers.
The user is practicing English by talking to a character of their choice.
Character Persona Name: "${personaName}"
Character Role/Description: "${personaDescription}"
User's English Level: "${userLevel || 'Intermediate'}" (Adjust vocabulary density/complexity accordingly)

Your job is to:
1. Roleplay cleanly as the character. Keep your English reply relevant, engaging, and in character.
2. In the feedback, inspect the user's latest message ("${message}"). Check for spelling, grammar, preposition errors, or natural phrasing. 
   - Write this feedback in clear, constructive, and friendly Arabic.
   - If their input was English and contained zero errors and was perfectly natural, set "feedback" to empty string ("").
   - If they wrote in Arabic, translate it to natural English for them, and gently explain how they would say it in the feedback field.
3. Suggest 1 to 3 useful words or expressions that they can use in this context, with translations and examples.

You MUST respond strictly in valid JSON format matching this schema:
{
  "reply": "Your contextual English reply in character",
  "arabicTranslation": "A smooth Arabic translation of your reply (helps the learner check their understanding)",
  "feedback": "Arabic grammatical or vocabulary correction on the user's latest input. Keep it positive: 'أحسنت! تصحيح بسيط...' or 'من الأفضل قول...'. Return empty string if the input was perfect.",
  "vocabularySuggestions": [
    { "word": "English word or idiom", "meaning": "Arabic translation", "example": "English example sentence" }
  ]
}

Strictly output valid JSON only. Do not wrap in markdown \`\`\`json fences.
`;

    // Construct history parts for conversational context
    const contents: any[] = [];
    if (history && Array.isArray(history)) {
      history.forEach((h: any) => {
        contents.push({ role: h.role === "user" ? "user" : "model", parts: [{ text: h.text }] });
      });
    }
    contents.push({ role: "user", parts: [{ text: message }] });

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reply: { type: Type.STRING },
            arabicTranslation: { type: Type.STRING },
            feedback: { type: Type.STRING },
            vocabularySuggestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  word: { type: Type.STRING },
                  meaning: { type: Type.STRING },
                  example: { type: Type.STRING }
                },
                required: ["word", "meaning", "example"]
              }
            }
          },
          required: ["reply", "arabicTranslation", "feedback", "vocabularySuggestions"]
        }
      }
    });

    const textOutput = response.text || "{}";
    const data = JSON.parse(textOutput.trim());
    res.json(data);
  } catch (error: any) {
    console.error("Chat API Error:", error);
    res.status(500).json({ error: error.message || "An error occurred with the AI model" });
  }
});

// 2. Grammar & Sentence Analyzer Route
app.post("/api/gemini/analyze", async (req, res) => {
  try {
    const { sentence } = req.body;
    if (!sentence) {
      res.status(400).json({ error: "Sentence is required" });
      return;
    }

    const ai = getGeminiClient();

    const systemInstruction = `
You are an expert English Grammarian and Instructor for Arabic speakers.
Analyze the user's submitted English statement, phrase, or sentence.
Break it down beautifully into grammatical segments and highlight idioms or useful phonic/pronunciation keys.

Respond strictly in valid JSON format matching this schema:
{
  "translation": "Natural Arabic translation of the sentence",
  "grammarBreakdown": [
    { "part": "segment, verb, tense or word analyzed", "role": "Grammatical function (verb tense, subject-verb agreement etc) in Arabic", "explanation": "Easy-to-understand explanation of the grammar rule in Arabic" }
  ],
  "idiomsOrPhonics": [
    { "term": "Key phrase, word, or pronunciation aspect", "detail": "Advice on how to speak it naturally, silent letters, link sounds, or idiomatic meaning (in Arabic)" }
  ],
  "alternatives": [
    { "phrase": "Clean, natural English alternative sentence", "level": "Beginner, Intermediate, or Advanced", "meaning": "Arabic translation of this alternative phrase" }
  ]
}

No markdown code fences. Strictly output valid JSON.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Sentence: "${sentence}"`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            translation: { type: Type.STRING },
            grammarBreakdown: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  part: { type: Type.STRING },
                  role: { type: Type.STRING },
                  explanation: { type: Type.STRING }
                },
                required: ["part", "role", "explanation"]
              }
            },
            idiomsOrPhonics: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  term: { type: Type.STRING },
                  detail: { type: Type.STRING }
                },
                required: ["term", "detail"]
              }
            },
            alternatives: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  phrase: { type: Type.STRING },
                  level: { type: Type.STRING },
                  meaning: { type: Type.STRING }
                },
                required: ["phrase", "level", "meaning"]
              }
            }
          },
          required: ["translation", "grammarBreakdown", "idiomsOrPhonics", "alternatives"]
        }
      }
    });

    const textOutput = response.text || "{}";
    const data = JSON.parse(textOutput.trim());
    res.json(data);
  } catch (error: any) {
    console.error("Analyze API Error:", error);
    res.status(500).json({ error: error.message || "An error occurred with the AI model" });
  }
});

// 3. Dynamic Quiz Generator Route
app.post("/api/gemini/quiz", async (req, res) => {
  try {
    const { topic, level } = req.body;
    const ai = getGeminiClient();

    const systemInstruction = `
You are an English test generator. Generate a 3-question interactive multiple choice test checking vocabulary, common grammar patterns, or preposition rules.
Topic: "${topic || 'General Grammar'}"
Target Level: "${level || 'Intermediate'}" (Beginner, Intermediate, or Advanced)

The questions should be practical, clear, and highly educational for Arabic speakers.
Respond strictly in valid JSON format matching this schema:
{
  "questions": [
    {
      "question": "The quiz question in English (such as fill in the gap, tense correction, prepositions etc.)",
      "options": ["A", "B", "C", "D"],
      "answerIndex": 0, // 0-based index of the correct option
      "explanation": "A complete, helpful pedagogical explanation of the correct answer and grammatical rule written in Arabic."
    }
  ]
}

No markdown code fences. Strictly output valid JSON.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Generate 3 questions for topic "${topic || 'General Grammar'}" at "${level || 'Intermediate'}" level`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  options: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                  },
                  answerIndex: { type: Type.INTEGER },
                  explanation: { type: Type.STRING }
                },
                required: ["question", "options", "answerIndex", "explanation"]
              }
            }
          },
          required: ["questions"]
        }
      }
    });

    const textOutput = response.text || "{}";
    const data = JSON.parse(textOutput.trim());
    res.json(data);
  } catch (error: any) {
    console.error("Quiz API Error:", error);
    res.status(500).json({ error: error.message || "An error occurred with the AI model" });
  }
});

// Persistent Per-Device Time Tracker Store (File-backed for high durability & zero DB costs)
interface DeviceRecord {
  deviceId: string;
  deviceName: string;
  totalSeconds: number;
  lastActive: number;
  lastSyncedAt: number;
}

interface UserTrackerStore {
  [userId: string]: {
    userId: string;
    devices: { [deviceId: string]: DeviceRecord };
    lastUpdated: number;
  };
}

const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
const DEVICES_STORE_FILE = path.join(DATA_DIR, "device-tracker-store.json");

function loadDevicesStore(): UserTrackerStore {
  try {
    if (fs.existsSync(DEVICES_STORE_FILE)) {
      const content = fs.readFileSync(DEVICES_STORE_FILE, "utf-8");
      return JSON.parse(content);
    }
  } catch (err) {
    console.error("Failed to read devices store file:", err);
  }

  // Pre-seed default realistic sample data for stitchlab2027@gmail.com if empty
  const defaultStore: UserTrackerStore = {
    "stitchlab2027@gmail.com": {
      userId: "stitchlab2027@gmail.com",
      devices: {
        "dev_chrome_android_sample": {
          deviceId: "dev_chrome_android_sample",
          deviceName: "Chrome on Android",
          totalSeconds: 3840, // ~ 1 hour 4 mins
          lastActive: Date.now() - 1000 * 60 * 60 * 26, // yesterday
          lastSyncedAt: Date.now() - 1000 * 60 * 60 * 26,
        },
        "dev_chrome_win_sample": {
          deviceId: "dev_chrome_win_sample",
          deviceName: "Chrome on Windows",
          totalSeconds: 5520, // ~ 1 hour 32 mins
          lastActive: Date.now() - 1000 * 60 * 60 * 5, // 5 hours ago
          lastSyncedAt: Date.now() - 1000 * 60 * 60 * 5,
        }
      },
      lastUpdated: Date.now(),
    }
  };

  try {
    fs.writeFileSync(DEVICES_STORE_FILE, JSON.stringify(defaultStore, null, 2), "utf-8");
  } catch (e) {}

  return defaultStore;
}

function saveDevicesStore(store: UserTrackerStore): void {
  try {
    fs.writeFileSync(DEVICES_STORE_FILE, JSON.stringify(store, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to persist devices store:", err);
  }
}

// In-memory cache loaded once
let devicesStore: UserTrackerStore = loadDevicesStore();

// 4. Scalable & Free-Tier Friendly Time Tracker Sync Endpoint (Per-Device & Lazy Batch Sync)
app.post("/api/time-tracker/sync", (req, res) => {
  try {
    let payload = req.body;
    if (typeof payload === "string") {
      try {
        payload = JSON.parse(payload);
      } catch {
        // Keep as is if parsing fails
      }
    }

    const {
      userId,
      deviceId,
      deviceName,
      deltaSeconds,
      deviceTotalSeconds,
      sessionSeconds,
      timestamp,
    } = payload || {};

    const normalizedUserId = String(userId || "stitchlab2027@gmail.com").trim().toLowerCase();
    const effectiveDeviceId = String(deviceId || "dev_current_chrome").trim();
    const effectiveDeviceName = String(deviceName || "Google Chrome").trim();
    const addedSeconds = Math.max(0, Number(deltaSeconds) || 0);
    const reportedDeviceTotal = Number(deviceTotalSeconds) || 0;

    // Find or initialize user entry
    if (!devicesStore[normalizedUserId]) {
      devicesStore[normalizedUserId] = {
        userId: normalizedUserId,
        devices: {},
        lastUpdated: Date.now(),
      };
    }

    const userEntry = devicesStore[normalizedUserId];

    // Find or initialize device entry
    if (!userEntry.devices[effectiveDeviceId]) {
      userEntry.devices[effectiveDeviceId] = {
        deviceId: effectiveDeviceId,
        deviceName: effectiveDeviceName,
        totalSeconds: 0,
        lastActive: timestamp || Date.now(),
        lastSyncedAt: Date.now(),
      };
    }

    const deviceRecord = userEntry.devices[effectiveDeviceId];
    deviceRecord.deviceName = effectiveDeviceName;
    deviceRecord.lastActive = timestamp || Date.now();
    deviceRecord.lastSyncedAt = Date.now();

    // Increment device total seconds or use the maximum reported
    if (addedSeconds > 0) {
      deviceRecord.totalSeconds += addedSeconds;
    }
    if (reportedDeviceTotal > deviceRecord.totalSeconds) {
      deviceRecord.totalSeconds = reportedDeviceTotal;
    }

    userEntry.lastUpdated = Date.now();

    // Persist changes
    saveDevicesStore(devicesStore);

    // Compute aggregated total across all devices
    const devicesList = Object.values(userEntry.devices);
    const aggregatedTotalSeconds = devicesList.reduce((acc, dev) => acc + (dev.totalSeconds || 0), 0);

    res.status(200).json({
      success: true,
      message: "Device batch sync processed successfully",
      userId: normalizedUserId,
      deviceId: effectiveDeviceId,
      deviceName: effectiveDeviceName,
      deviceTotalSeconds: deviceRecord.totalSeconds,
      aggregatedTotalSeconds,
      devices: devicesList,
      syncedAt: Date.now(),
    });
  } catch (error: any) {
    console.error("Time Tracker Sync Error:", error);
    res.status(500).json({ error: "Failed to process device time sync" });
  }
});

// 5. Get all registered devices and learning time breakdown for a student/email
app.get("/api/time-tracker/devices", (req, res) => {
  try {
    const rawUserId = String(req.query.userId || "stitchlab2027@gmail.com").trim().toLowerCase();
    const userEntry = devicesStore[rawUserId];

    if (!userEntry || !userEntry.devices) {
      res.status(200).json({
        success: true,
        userId: rawUserId,
        aggregatedTotalSeconds: 0,
        devices: [],
      });
      return;
    }

    const devicesList = Object.values(userEntry.devices);
    const aggregatedTotalSeconds = devicesList.reduce((acc, dev) => acc + (dev.totalSeconds || 0), 0);

    res.status(200).json({
      success: true,
      userId: rawUserId,
      aggregatedTotalSeconds,
      devices: devicesList,
    });
  } catch (error: any) {
    console.error("Error fetching user devices:", error);
    res.status(500).json({ error: "Failed to fetch device list" });
  }
});

// Google Drive OAuth 2.0 Callback handler page for Client-Side Access Token parsing
app.get('/auth/callback', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>تأكيد الاتصال بـ Google Drive</title>
      <style>
        body {
          font-family: system-ui, -apple-system, sans-serif;
          background: #f8fafc;
          color: #1e293b;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100vh;
          margin: 0;
        }
        .card {
          background: white;
          padding: 2.5rem;
          border-radius: 1.5rem;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
          text-align: center;
          max-width: 420px;
          border: 1px solid #f1f5f9;
        }
        .spinner {
          border: 4px solid #f1f5f9;
          border-top: 4px solid #d946ef;
          border-radius: 50%;
          width: 48px;
          height: 48px;
          animation: spin 1s linear infinite;
          margin: 1.5rem auto;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        h2 {
          font-size: 1.5rem;
          margin-bottom: 0.5rem;
          color: #0f172a;
        }
        p {
          font-size: 0.875rem;
          color: #64748b;
          line-height: 1.5;
        }
      </style>
    </head>
    <body>
      <div class="card">
        <div id="spinner" class="spinner"></div>
        <h2 id="title">جاري ربط حساب Google Drive...</h2>
        <p id="desc">يرجى الانتظار، سيتم إغلاق هذه النافذة تلقائياً بعد المصادقة بنجاح.</p>
        <div style="margin-top: 1.5rem; padding-top: 1.2rem; border-top: 1px dashed #e2e8f0; font-size: 0.75rem; color: #64748b;">
          باستخدام هذه الخدمة، فإنك توافق على 
          <br/>
          <a href="https://stitchlab2.vercel.app/privacy-policy" target="_blank" style="color: #6366f1; text-decoration: underline; font-weight: bold; display: inline-block; margin-top: 0.25rem;">سياسة الخصوصية الخاصة بـ StitchLab (Privacy Policy)</a>
        </div>
      </div>
      <script>
        // Parse access_token from the URL hash fragment or query params
        const params = new URLSearchParams(window.location.hash.substring(1) || window.location.search);
        const accessToken = params.get('access_token');
        
        if (accessToken) {
          // Store token in localStorage immediately so the parent app can successfully poll it (crucial for null window.opener fallbacks)
          try {
            localStorage.setItem("stitchlab_drive_token", accessToken);
          } catch (e) {
            console.error("Failed to write token directly to localStorage:", e);
          }

          if (window.opener) {
            try {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', token: accessToken }, '*');
            } catch (e) {
              console.error("postMessage failed:", e);
            }
            setTimeout(() => {
              window.close();
            }, 1000);
          } else {
            // No window.opener available (common in iOS/Safari and manual email logins). 
            // Since localStorage already has the token, we can safely instruct them of the successful link!
            document.getElementById('title').textContent = "تم الاتصال سحابياً بنجاح! 🎉";
            document.getElementById('desc').textContent = "لقد تم ربط حسابك بـ Google Drive ومزامنة مهاراتك بنجاح على هذا المتصفح. سيتم إغلاق هذه النافذة تلقائياً الآن.";
            document.getElementById('spinner').style.display = 'none';
            setTimeout(() => {
              window.close();
            }, 2500);
          }
        } else {
          const authError = params.get('error') || 'unknown';
          if (window.opener) {
            try {
              window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error: authError }, '*');
            } catch (e) {}
          }
          document.getElementById('title').textContent = "صلاحيات غير مكتملة";
          document.getElementById('desc').textContent = "لم نتمكن من الحصول على صلاحية الوصول لـ Google Drive. يرجى إغلاق النافذة والمحاولة مرة أخرى.";
          document.getElementById('spinner').style.display = 'none';
        }
      </script>
    </body>
    </html>
  `);
});

// Vite/Static assets server configuration
async function startServer() {
  const hasSrc = fs.existsSync(path.join(process.cwd(), "src", "main.tsx"));
  if (process.env.NODE_ENV !== "production" && hasSrc) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, { 
      index: false,
      maxAge: '31536000s', // 1 year cache
      setHeaders: (res, path) => {
        if (path.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)$/i)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        } else {
          res.setHeader('Cache-Control', 'public, max-age=3600');
        }
      }
    }));
    app.get('*', (req, res) => {
      serveIndexHtml(req, res);
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running at http://localhost:${PORT}`);
  });
}

startServer();
