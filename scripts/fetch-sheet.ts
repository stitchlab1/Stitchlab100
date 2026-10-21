import fs from "fs";
import path from "path";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

interface SheetWord {
  id: string;
  semester: string;
  word: string;
  meaning: string;
  ipa?: string;
  imageUrl?: string;
  group?: string;
  level?: number;
}

const DEFAULT_SHEET_URL = "https://docs.google.com/spreadsheets/d/1BtCUNuf34uVEaQS_hPbINw0-ogACWzyKsN426QftNwI/edit?usp=drivesdk";

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
  if (clean.includes("nine") || clean.includes("nineth") || clean.includes("ninth")) return 9;

  return 1;
};

async function fetchGoogleSheet() {
  const sheetUrlOrId = process.env.GOOGLE_SHEET_URL || process.env.VITE_GOOGLE_SHEET_URL || DEFAULT_SHEET_URL;
  console.log(`[SSG Build] Preparing to fetch Google Sheet data from: ${sheetUrlOrId}`);

  let spreadsheetId = sheetUrlOrId.trim();
  const matches = sheetUrlOrId.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (matches && matches[1]) {
    spreadsheetId = matches[1];
  }

  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch Google Sheet, status: ${res.status}`);
    }

    const text = await res.text();
    const jsonStart = text.indexOf("google.visualization.Query.setResponse(");
    if (jsonStart === -1) {
      throw new Error("Invalid response format from Google Sheets API query.");
    }

    const rawJson = text.substring(jsonStart + "google.visualization.Query.setResponse(".length, text.length - 2);
    const data = JSON.parse(rawJson);

    if (!data?.table?.rows) {
      throw new Error("No rows found in the parsed sheets table structure.");
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
    const meanIdx = findColumnIndex(["المعنى", "معنى", "ترجمة", "meaning", "translation", "arabic", "ar", "definition", "التعريف", "تعريف"]);
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
      const meaning = getVal(meanIdx);

      if (!word || word.toLowerCase() === "word" || word === "الكلمة") return;

      parsedWords.push({
        id: `ssg-${rIdx}-${Math.random().toString(36).substring(4)}`,
        semester: getVal(semIdx) || "الفصل الدراسي الأول",
        word: word,
        meaning: meaning,
        ipa: getVal(ipaIdx) || "",
        imageUrl: convertToDirectImageUrl(getVal(imgIdx)),
        group: getVal(grpIdx) || "عادية",
        level: parseLevelNum(getVal(levelIdx), rIdx)
      });
    });

    if (parsedWords.length === 0) {
      throw new Error("No words mapped correctly to headers.");
    }

    console.log(`[SSG Build] Successfully crawled and parsed ${parsedWords.length} words from Google Sheet!`);

    const dataDirPath = path.resolve("./src/data");
    if (!fs.existsSync(dataDirPath)) {
      fs.mkdirSync(dataDirPath, { recursive: true });
    }

    const outputFilePath = path.join(dataDirPath, "staticSheetWords.json");
    fs.writeFileSync(outputFilePath, JSON.stringify(parsedWords, null, 2), "utf8");
    console.log(`[SSG Build] Saved generated static data to: ${outputFilePath}`);

  } catch (error: any) {
    console.error("[SSG Build Error] Failed to generate static JSON for SSG. Falling back to default backup.");
    console.error(error);
    
    // Create an empty fallback file or ensure file space if not exists
    const dataDirPath = path.resolve("./src/data");
    if (!fs.existsSync(dataDirPath)) {
      fs.mkdirSync(dataDirPath, { recursive: true });
    }
    const outputFilePath = path.join(dataDirPath, "staticSheetWords.json");
    if (!fs.existsSync(outputFilePath)) {
      fs.writeFileSync(outputFilePath, JSON.stringify([], null, 2), "utf8");
    }
  }
}

fetchGoogleSheet();
