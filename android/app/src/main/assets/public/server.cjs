var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_dotenv = __toESM(require("dotenv"), 1);
import_dotenv.default.config();
var app = (0, import_express.default)();
var PORT = 3e3;
app.use(import_express.default.json());
app.get("/", (req, res, next) => {
  const academyInvite = req.query.academyInvite;
  const inviterName = req.query.inviterName ? String(req.query.inviterName) : "";
  const previewImage = req.query.previewImage ? String(req.query.previewImage) : "";
  if (academyInvite && process.env.NODE_ENV === "production") {
    const filePath = import_path.default.join(process.cwd(), "dist", "index.html");
    if (import_fs.default.existsSync(filePath)) {
      let html = import_fs.default.readFileSync(filePath, "utf8");
      const title = inviterName ? `\u0644\u0642\u062F \u062F\u0639\u0627\u0643 \u0635\u062F\u064A\u0642\u0643 ${inviterName} \u0644\u0644\u0627\u0646\u0636\u0645\u0627\u0645 \u0625\u0644\u0649 \u0635\u0641\u0648\u0641 StitchLab!` : `\u0644\u0642\u062F \u062F\u0639\u0627\u0643 \u0635\u062F\u064A\u0642\u0643 \u0644\u0644\u0627\u0646\u0636\u0645\u0627\u0645 \u0625\u0644\u0649 \u0635\u0641\u0648\u0641 StitchLab!`;
      const description = `\u0627\u0636\u063A\u0637 \u0647\u0646\u0627 \u0644\u0642\u0628\u0648\u0644 \u0627\u0644\u062F\u0639\u0648\u0629 \u0648\u0627\u0644\u0628\u062F\u0621 \u0641\u064A \u0627\u0644\u062A\u062D\u062F\u064A \u0627\u0644\u062F\u0631\u0627\u0633\u064A`;
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
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.send(html);
      return;
    }
  }
  next();
});
var aiClient = null;
function getGeminiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required");
    }
    aiClient = new import_genai.GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return aiClient;
}
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
User's English Level: "${userLevel || "Intermediate"}" (Adjust vocabulary density/complexity accordingly)

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
  "feedback": "Arabic grammatical or vocabulary correction on the user's latest input. Keep it positive: '\u0623\u062D\u0633\u0646\u062A! \u062A\u0635\u062D\u064A\u062D \u0628\u0633\u064A\u0637...' or '\u0645\u0646 \u0627\u0644\u0623\u0641\u0636\u0644 \u0642\u0648\u0644...'. Return empty string if the input was perfect.",
  "vocabularySuggestions": [
    { "word": "English word or idiom", "meaning": "Arabic translation", "example": "English example sentence" }
  ]
}

Strictly output valid JSON only. Do not wrap in markdown \`\`\`json fences.
`;
    const contents = [];
    if (history && Array.isArray(history)) {
      history.forEach((h) => {
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
          type: import_genai.Type.OBJECT,
          properties: {
            reply: { type: import_genai.Type.STRING },
            arabicTranslation: { type: import_genai.Type.STRING },
            feedback: { type: import_genai.Type.STRING },
            vocabularySuggestions: {
              type: import_genai.Type.ARRAY,
              items: {
                type: import_genai.Type.OBJECT,
                properties: {
                  word: { type: import_genai.Type.STRING },
                  meaning: { type: import_genai.Type.STRING },
                  example: { type: import_genai.Type.STRING }
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
  } catch (error) {
    console.error("Chat API Error:", error);
    res.status(500).json({ error: error.message || "An error occurred with the AI model" });
  }
});
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
          type: import_genai.Type.OBJECT,
          properties: {
            translation: { type: import_genai.Type.STRING },
            grammarBreakdown: {
              type: import_genai.Type.ARRAY,
              items: {
                type: import_genai.Type.OBJECT,
                properties: {
                  part: { type: import_genai.Type.STRING },
                  role: { type: import_genai.Type.STRING },
                  explanation: { type: import_genai.Type.STRING }
                },
                required: ["part", "role", "explanation"]
              }
            },
            idiomsOrPhonics: {
              type: import_genai.Type.ARRAY,
              items: {
                type: import_genai.Type.OBJECT,
                properties: {
                  term: { type: import_genai.Type.STRING },
                  detail: { type: import_genai.Type.STRING }
                },
                required: ["term", "detail"]
              }
            },
            alternatives: {
              type: import_genai.Type.ARRAY,
              items: {
                type: import_genai.Type.OBJECT,
                properties: {
                  phrase: { type: import_genai.Type.STRING },
                  level: { type: import_genai.Type.STRING },
                  meaning: { type: import_genai.Type.STRING }
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
  } catch (error) {
    console.error("Analyze API Error:", error);
    res.status(500).json({ error: error.message || "An error occurred with the AI model" });
  }
});
app.post("/api/gemini/quiz", async (req, res) => {
  try {
    const { topic, level } = req.body;
    const ai = getGeminiClient();
    const systemInstruction = `
You are an English test generator. Generate a 3-question interactive multiple choice test checking vocabulary, common grammar patterns, or preposition rules.
Topic: "${topic || "General Grammar"}"
Target Level: "${level || "Intermediate"}" (Beginner, Intermediate, or Advanced)

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
      contents: `Generate 3 questions for topic "${topic || "General Grammar"}" at "${level || "Intermediate"}" level`,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: import_genai.Type.OBJECT,
          properties: {
            questions: {
              type: import_genai.Type.ARRAY,
              items: {
                type: import_genai.Type.OBJECT,
                properties: {
                  question: { type: import_genai.Type.STRING },
                  options: {
                    type: import_genai.Type.ARRAY,
                    items: { type: import_genai.Type.STRING }
                  },
                  answerIndex: { type: import_genai.Type.INTEGER },
                  explanation: { type: import_genai.Type.STRING }
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
  } catch (error) {
    console.error("Quiz API Error:", error);
    res.status(500).json({ error: error.message || "An error occurred with the AI model" });
  }
});
app.get("/auth/callback", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>\u062A\u0623\u0643\u064A\u062F \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0628\u0640 Google Drive</title>
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
        <h2 id="title">\u062C\u0627\u0631\u064A \u0631\u0628\u0637 \u062D\u0633\u0627\u0628 Google Drive...</h2>
        <p id="desc">\u064A\u0631\u062C\u0649 \u0627\u0644\u0627\u0646\u062A\u0638\u0627\u0631\u060C \u0633\u064A\u062A\u0645 \u0625\u063A\u0644\u0627\u0642 \u0647\u0630\u0647 \u0627\u0644\u0646\u0627\u0641\u0630\u0629 \u062A\u0644\u0642\u0627\u0626\u064A\u0627\u064B \u0628\u0639\u062F \u0627\u0644\u0645\u0635\u0627\u062F\u0642\u0629 \u0628\u0646\u062C\u0627\u062D.</p>
        <div style="margin-top: 1.5rem; padding-top: 1.2rem; border-top: 1px dashed #e2e8f0; font-size: 0.75rem; color: #64748b;">
          \u0628\u0627\u0633\u062A\u062E\u062F\u0627\u0645 \u0647\u0630\u0647 \u0627\u0644\u062E\u062F\u0645\u0629\u060C \u0641\u0625\u0646\u0643 \u062A\u0648\u0627\u0641\u0642 \u0639\u0644\u0649 
          <br/>
          <a href="https://stitchlab2.vercel.app/privacy-policy" target="_blank" style="color: #6366f1; text-decoration: underline; font-weight: bold; display: inline-block; margin-top: 0.25rem;">\u0633\u064A\u0627\u0633\u0629 \u0627\u0644\u062E\u0635\u0648\u0635\u064A\u0629 \u0627\u0644\u062E\u0627\u0635\u0629 \u0628\u0640 StitchLab (Privacy Policy)</a>
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
            document.getElementById('title').textContent = "\u062A\u0645 \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0633\u062D\u0627\u0628\u064A\u0627\u064B \u0628\u0646\u062C\u0627\u062D! \u{1F389}";
            document.getElementById('desc').textContent = "\u0644\u0642\u062F \u062A\u0645 \u0631\u0628\u0637 \u062D\u0633\u0627\u0628\u0643 \u0628\u0640 Google Drive \u0648\u0645\u0632\u0627\u0645\u0646\u0629 \u0645\u0647\u0627\u0631\u0627\u062A\u0643 \u0628\u0646\u062C\u0627\u062D \u0639\u0644\u0649 \u0647\u0630\u0627 \u0627\u0644\u0645\u062A\u0635\u0641\u062D. \u0633\u064A\u062A\u0645 \u0625\u063A\u0644\u0627\u0642 \u0647\u0630\u0647 \u0627\u0644\u0646\u0627\u0641\u0630\u0629 \u062A\u0644\u0642\u0627\u0626\u064A\u0627\u064B \u0627\u0644\u0622\u0646.";
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
          document.getElementById('title').textContent = "\u0635\u0644\u0627\u062D\u064A\u0627\u062A \u063A\u064A\u0631 \u0645\u0643\u062A\u0645\u0644\u0629";
          document.getElementById('desc').textContent = "\u0644\u0645 \u0646\u062A\u0645\u0643\u0646 \u0645\u0646 \u0627\u0644\u062D\u0635\u0648\u0644 \u0639\u0644\u0649 \u0635\u0644\u0627\u062D\u064A\u0629 \u0627\u0644\u0648\u0635\u0648\u0644 \u0644\u0640 Google Drive. \u064A\u0631\u062C\u0649 \u0625\u063A\u0644\u0627\u0642 \u0627\u0644\u0646\u0627\u0641\u0630\u0629 \u0648\u0627\u0644\u0645\u062D\u0627\u0648\u0644\u0629 \u0645\u0631\u0629 \u0623\u062E\u0631\u0649.";
          document.getElementById('spinner').style.display = 'none';
        }
      </script>
    </body>
    </html>
  `);
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running at http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
