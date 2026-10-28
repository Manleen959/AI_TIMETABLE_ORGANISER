import { doc, getDoc, setDoc, addDoc, collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase';
import { findBestSheet, detectLayout, parseWithLayout } from './parseTimetable';
import * as XLSX from 'xlsx';

const LOCAL_CURRENT_KEY = 'smartschedule_current_timetable';
const LOCAL_HISTORY_KEY = 'smartschedule_timetable_history';
const LOCAL_TEACHERS_KEY = 'smartschedule_teachers';

// Initialize default PCTE sample data into memory/localStorage if empty
export async function loadDefaultPCTESample() {
  try {
    const res = await fetch('/Updated_w_e_f_26-10-2026.xlsx');
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    const wb = XLSX.read(arrayBuffer, { type: 'array' });
    const { rows, sheet } = findBestSheet(wb);
    const layout = detectLayout(rows, sheet['!merges']);
    const parsed = parseWithLayout(rows, layout);

    return {
      wef: '2026-10-26',
      uploadedAt: new Date('2026-10-26T09:00:00Z').toISOString(),
      uploadedBy: 'admin@pcte.edu.in',
      fileName: 'Updated_w_e_f_26-10-2026.xlsx',
      entries: parsed.entries,
      periods: parsed.periods,
      days: parsed.days,
      classes: parsed.classes,
      faculty: parsed.faculty,
      venues: parsed.venues,
      importLayout: layout,
    };
  } catch (err) {
    console.warn('Failed to auto-fetch PCTE sample from public:', err);
    return null;
  }
}

// Complete PCTE Official Class Sections (49 Cohorts)
export const ALL_PCTE_CLASSES = [
  'B.PHARMA-1A', 'B.PHARMA-1B', 'BAJMC-1', 'BAJMC-3',
  'BBA-2A', 'BBA-2B', 'BBA-2C', 'BBA-2D', 'BBA-2E', 'BBA-2F',
  'BCA-1A', 'BCA-1B', 'BCA-1C', 'BCA-1D', 'BCA-1E',
  'BCA-2A', 'BCA-2B', 'BCA-2C', 'BCA-2D',
  'BCA-3A', 'BCA-3B', 'BCA-3C', 'BCA-3D', 'BCA-3E',
  'BCOM-2A', 'BCOM-2B', 'BCOM-2C', 'BCOM-2D',
  'BHMCT-1A', 'BHMCT-1B', 'BHMCT-2A', 'BHMCT-2B',
  'BSC-MLS',
  'BTECH-AIML-2C', 'BTECH-AIML-2D', 'BTECH-AIML-3',
  'BTECH-CSE-1A', 'BTECH-CSE-1B', 'BTECH-CSE-1C', 'BTECH-CSE-1D',
  'BTECH-CSE-2A', 'BTECH-CSE-2B',
  'BTECH-CSE-3A', 'BTECH-CSE-3B', 'BTECH-CSE-3C',
  'BTECH-CSE-4A', 'BTECH-CSE-4B', 'BTECH-CSE-4C',
  'BTTM-1'
];

/**
 * Get current timetable from Firestore (or LocalStorage fallback)
 */
export async function getCurrentTimetable() {
  if (isFirebaseConfigured) {
    try {
      const docRef = doc(db, 'timetables', 'current');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        // Ensure it is the full master timetable (has >= 20 classes)
        if (data?.classes && data.classes.length >= 20) {
          localStorage.setItem(LOCAL_CURRENT_KEY, JSON.stringify(data));
          return data;
        }
      }
    } catch (err) {
      console.warn('Firestore fetch failed, checking local store:', err);
    }
  }

  // Check local storage (ensure full schedule >= 20 classes)
  const cached = localStorage.getItem(LOCAL_CURRENT_KEY);
  if (cached) {
    try {
      const parsed = JSON.parse(cached);
      if (parsed?.classes && parsed.classes.length >= 20) {
        return parsed;
      }
    } catch (e) {
      // ignore
    }
  }

  // Fallback / Auto-sync: load from bundled PCTE sample with all 49 classes
  const sample = await loadDefaultPCTESample();
  if (sample) {
    localStorage.setItem(LOCAL_CURRENT_KEY, JSON.stringify(sample));
    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(db, 'timetables', 'current'), sample);
      } catch (e) {}
    }
    return sample;
  }

  return null;
}

/**
 * Publish a new timetable:
 * 1. Back up existing current timetable to timetableHistory
 * 2. Save new timetable to timetables/current
 */
export async function publishTimetable(newTimetableData) {
  const current = await getCurrentTimetable();

  // 1. Archive to history
  if (current && current.entries && current.entries.length > 0) {
    const historyEntry = {
      wef: current.wef || 'Previous',
      savedAt: new Date().toISOString(),
      label: `Before import of ${newTimetableData.fileName || 'new timetable'}`,
      entries: current.entries,
      periods: current.periods,
      days: current.days,
      fileName: current.fileName || 'Archive',
    };

    if (isFirebaseConfigured) {
      try {
        await addDoc(collection(db, 'timetableHistory'), historyEntry);
      } catch (e) {
        console.warn('Could not archive history to Firestore:', e);
      }
    }

    const existingHistory = getLocalHistory();
    existingHistory.unshift({ id: 'hist_' + Date.now(), ...historyEntry });
    localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(existingHistory.slice(0, 20)));
  }

  // 2. Write to timetables/current
  if (isFirebaseConfigured) {
    try {
      const docRef = doc(db, 'timetables', 'current');
      await setDoc(docRef, newTimetableData);
    } catch (e) {
      console.warn('Could not save to Firestore current timetable:', e);
    }
  }

  localStorage.setItem(LOCAL_CURRENT_KEY, JSON.stringify(newTimetableData));
  return newTimetableData;
}

/**
 * Get Timetable Version History
 */
export async function getTimetableHistory() {
  if (isFirebaseConfigured) {
    try {
      const q = query(collection(db, 'timetableHistory'), orderBy('savedAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const list = [];
      querySnapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      if (list.length > 0) {
        return list;
      }
    } catch (e) {
      console.warn('Error reading history from Firestore:', e);
    }
  }

  return getLocalHistory();
}

function getLocalHistory() {
  try {
    const raw = localStorage.getItem(LOCAL_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

/**
 * Restore an archived timetable version
 */
export async function restoreTimetableVersion(version) {
  const restored = {
    wef: version.wef,
    uploadedAt: new Date().toISOString(),
    uploadedBy: 'Restored from history',
    fileName: version.fileName || 'Restored_Version.xlsx',
    entries: version.entries,
    periods: version.periods,
    days: version.days,
  };

  return await publishTimetable(restored);
}

/**
 * Local teachers store helper for offline/demo/mocking
 */
export function getLocalTeachers() {
  try {
    const raw = localStorage.getItem(LOCAL_TEACHERS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}

  // Initial faculty members matching the PCTE timetable
  const initial = [
    { id: 't_1', name: 'Dr. Sharma', email: 'sharma@pcte.edu.in', role: 'teacher', facultyCode: 'SHARMA' },
    { id: 't_2', name: 'Er. Gurjeet Singh', email: 'gurjeet@pcte.edu.in', role: 'teacher', facultyCode: 'GURJEET' },
    { id: 't_3', name: 'Dr. Kapoor', email: 'kapoor@pcte.edu.in', role: 'teacher', facultyCode: 'KAPOOR' },
    { id: 't_4', name: 'Prof. Harpreet Kaur', email: 'harpreet@pcte.edu.in', role: 'teacher', facultyCode: 'HARPREET' },
    { id: 't_5', name: 'Dr. Verma', email: 'verma@pcte.edu.in', role: 'teacher', facultyCode: 'VERMA' },
    { id: 't_6', name: 'Prof. Aman Deep', email: 'aman@pcte.edu.in', role: 'teacher', facultyCode: 'AMAN' },
  ];
  localStorage.setItem(LOCAL_TEACHERS_KEY, JSON.stringify(initial));
  return initial;
}

export function saveLocalTeacher(teacher) {
  const list = getLocalTeachers();
  list.push(teacher);
  localStorage.setItem(LOCAL_TEACHERS_KEY, JSON.stringify(list));
  return list;
}
