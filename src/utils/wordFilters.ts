import staticSheetWords from "../data/staticSheetWords.json";

export interface SheetWord {
  word: string;
  meaning: string;
  level: string | number;
  semester: string;
  group: string;
  image?: string;
  id?: string | number;
}

/**
 * Calculates completed and uncompleted words belonging strictly to the completed groups.
 * If the group of a word is NOT in completedGroups, the word doesn't count as completed or skipped/uncompleted.
 */
export function getFilteredCompletedAndSkipped(
  completedWordKeys: string[],
  skippedWordKeys: string[],
  completedGroups: string[]
) {
  const completedGroupsSet = new Set(completedGroups.map(g => g.trim()));
  const completedSet = new Set(completedWordKeys.map(k => k.toLowerCase().trim()));
  const skippedSet = new Set(skippedWordKeys.map(k => k.toLowerCase().trim()));

  const allWordsList: SheetWord[] = [];
  
  if (Array.isArray(staticSheetWords)) {
    allWordsList.push(...(staticSheetWords as SheetWord[]));
  }

  try {
    const cached = localStorage.getItem("stitchlab_sheet_words");
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) {
        parsed.forEach((item: any) => {
          if (item && item.word && item.group) {
            const exists = allWordsList.some(w => 
              w.word?.toLowerCase().trim() === item.word?.toLowerCase().trim() && 
              w.group?.toLowerCase().trim() === item.group?.toLowerCase().trim() &&
              w.level === item.level
            );
            if (!exists) {
              allWordsList.push(item);
            }
          }
        });
      }
    }
  } catch (_) {}

  const filteredCompleted: string[] = [];
  const filteredSkipped: string[] = [];

  // 1. Process words based on completed groups
  allWordsList.forEach((item) => {
    if (item && item.word && item.group && item.semester && item.level) {
      const groupKey = `${item.level}_${item.semester.trim()}_${item.group.trim()}`;
      const wVal = item.word.toLowerCase().trim();
      
      if (completedGroupsSet.has(groupKey)) {
        if (completedSet.has(wVal)) {
          if (!filteredCompleted.includes(wVal)) {
            filteredCompleted.push(wVal);
          }
        } else {
          if (!filteredSkipped.includes(wVal)) {
            filteredSkipped.push(wVal);
          }
        }
      }
    }
  });

  // 2. Also ensure ANY word that has been explicitly skipped by the student
  // is instantly counted as "Skipped" (uncompleted) even if its group is not yet completed!
  skippedSet.forEach((wVal) => {
    if (wVal && !completedSet.has(wVal) && !filteredSkipped.includes(wVal)) {
      filteredSkipped.push(wVal);
    }
  });

  return {
    filteredCompleted,
    filteredSkipped
  };
}
