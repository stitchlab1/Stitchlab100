import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, writeBatch, doc } from "firebase/firestore";
import * as fs from "fs";

async function runReset() {
  console.log("Starting client-sdk bulk student reset script...");

  // Load config to initialize client app
  const firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf8"));
  console.log("Firebase config loaded. Project ID:", firebaseConfig.projectId);

  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  try {
    const studentsCol = collection(db, "students");
    const snapshot = await getDocs(studentsCol);

    if (snapshot.empty) {
      console.log("No student documents found in 'students' collection.");
      return;
    }

    console.log(`Found ${snapshot.size} student documents. Initiating bulk update...`);

    let batch = writeBatch(db);
    let count = 0;
    let batchCount = 1;

    for (const snapshotDoc of snapshot.docs) {
      const studentId = snapshotDoc.id;
      const docRef = doc(db, "students", studentId);
      const studentData = snapshotDoc.data();

      console.log(`Staging reset for student: ${studentId} (${studentData.name || "Unknown"})`);

      batch.update(docRef, {
        points: 0,
        completedWordsCount: 0,
        quizAttempts: 0,
        quizScore: 0,
        completedGroups: [],
        updatedAt: new Date().toISOString()
      });

      count++;

      // Firestore batch limit is 500
      if (count % 450 === 0) {
        console.log(`Committing batch ${batchCount}...`);
        await batch.commit();
        batch = writeBatch(db);
        batchCount++;
      }
    }

    if (count % 450 !== 0) {
      console.log(`Committing final batch ${batchCount}...`);
      await batch.commit();
    }

    console.log(`Successfully completed bulk reset. Resetted ${count} student documents.`);
  } catch (error) {
    console.error("Error executing bulk reset:", error);
    process.exit(1);
  }
}

runReset();
