/**
 * Google Drive App Data Folder Backup Service
 * Standard REST implementation using Drive API v3.
 * Storing private configuration/progress data in: 'appDataFolder'
 */

export interface BackupPayload {
  Level: string;
  SavedWords: any[];
  WordCounter: {
    completedWordsCount: number;
    analyzedCount: number;
  };
  Achievements: {
    points: number;
    unlockedLevel: number;
    completedLevels: number[];
    completedGroups: string[];
    conversationsHad: number;
    quizScore: number;
    quizAttempts: number;
    studentSemester: string;
  };
  completedWordKeys?: string[];
  skippedWordKeys?: string[];
  updatedAt: string; // ISO String timestamp
}

const BACKUP_FILE_NAME = "stitchlab_backup.json";

/**
 * Searches for an existing progress backup file in the private appDataFolder.
 */
export async function findBackupFile(token: string): Promise<{ id: string; name: string; modifiedTime?: string } | null> {
  const q = `name = '${BACKUP_FILE_NAME}'`;
  const url = `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${encodeURIComponent(q)}&fields=files(id,name,modifiedTime)`;
  
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Google Drive API search failed:", errorText);
      throw new Error(`Google Drive API Search error: ${res.status}`);
    }

    const data = await res.json();
    if (data.files && data.files.length > 0) {
      return data.files[0];
    }
    return null;
  } catch (error) {
    console.error("Failed to find Google Drive backup file:", error);
    return null;
  }
}

/**
 * Downloads and parses the BackupPayload from a specific file ID.
 */
export async function getBackupContent(token: string, fileId: string): Promise<BackupPayload | null> {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Google Drive API download failed:", errorText);
      throw new Error(`Google Drive API download error: ${res.status}`);
    }

    const backupData = await res.json();
    return backupData as BackupPayload;
  } catch (error) {
    console.error("Failed to get Google Drive backup content:", error);
    return null;
  }
}

/**
 * Compresses (minified JSON string) and saves the user’s progress payload to Google Drive appDataFolder.
 * If existingFileId is present, updates the existing file. Otherwise, creates a new file.
 */
export async function saveBackup(
  token: string,
  data: BackupPayload,
  existingFileId?: string | null
): Promise<{ id: string }> {
  const compressedJson = JSON.stringify(data); // Minified, stripped white-spaces
  
  if (existingFileId) {
    // 1. UPDATE EXISTING FILE
    const url = `https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=media`;
    const res = await fetch(url, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: compressedJson,
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Google Drive API update failed:", errorText);
      throw new Error(`Google Drive API update error: ${res.status}`);
    }

    const dataRes = await res.json();
    return { id: dataRes.id || existingFileId };
  } else {
    // 2. CREATE NEW FILE inside 'appDataFolder' (requires Multipart upload format)
    const url = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";
    const metadata = {
      name: BACKUP_FILE_NAME,
      parents: ["appDataFolder"],
    };

    const boundary = "stitchlab_drive_multipart_boundary";
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const body = 
      delimiter +
      "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
      JSON.stringify(metadata) +
      delimiter +
      "Content-Type: application/json\r\n\r\n" +
      compressedJson +
      closeDelimiter;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: body,
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("Google Drive API creation failed:", errorText);
      throw new Error(`Google Drive API creation error: ${res.status}`);
    }

    const dataRes = await res.json();
    return { id: dataRes.id };
  }
}

/**
 * Uploads a base64 PNG snapshot image to a public location in Google Drive
 * and sets permission to "anyone" can view. Returns the direct access link.
 */
export async function uploadPublicImage(token: string, base64Png: string, fileName: string): Promise<string> {
  // Convert base64 data URL to binary bytes
  const base64Clean = base64Png.replace(/^data:image\/png;base64,/, "");
  const binaryString = atob(base64Clean);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  
  // Upload file metadata and media using multipart/related
  const url = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id";
  const metadata = {
    name: fileName,
    mimeType: "image/png"
  };

  const boundary = "stitchlab_image_upload_boundary";
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const encoder = new TextEncoder();
  const part1Header = delimiter + "Content-Type: application/json; charset=UTF-8\r\n\r\n" + JSON.stringify(metadata) + delimiter + "Content-Type: image/png\r\n\r\n";
  const part1Bytes = encoder.encode(part1Header);
  const closingBytes = encoder.encode(closeDelimiter);

  const combinedBytes = new Uint8Array(part1Bytes.length + bytes.length + closingBytes.length);
  combinedBytes.set(part1Bytes, 0);
  combinedBytes.set(bytes, part1Bytes.length);
  combinedBytes.set(closingBytes, part1Bytes.length + bytes.length);

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body: combinedBytes,
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("Google Drive Image upload failed:", errorText);
    throw new Error(`Google Drive Image upload error: ${res.status}`);
  }

  const fileData = await res.json();
  const fileId = fileData.id;

  // Make the file publicly readable
  try {
    const permissionUrl = `https://www.googleapis.com/drive/v3/files/${fileId}/permissions`;
    const permRes = await fetch(permissionUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        role: "reader",
        type: "anyone",
      }),
    });
    if (!permRes.ok) {
      console.warn("Could not set permission to public:", await permRes.text());
    }
  } catch (e) {
    console.warn("Failed to update file permissions:", e);
  }

  // Return Google Drive's direct content view URL
  return `https://drive.google.com/uc?export=view&id=${fileId}`;
}
