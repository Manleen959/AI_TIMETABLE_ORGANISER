/**
 * src/utils/substitutionService.js - Manage faculty substitutions in Firestore & LocalStorage
 */
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase';

const LOCAL_SUBSTITUTIONS_KEY = 'smartschedule_substitutions';

function getLocalSubstitutions() {
  try {
    const raw = localStorage.getItem(LOCAL_SUBSTITUTIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveLocalSubstitution(sub) {
  const list = getLocalSubstitutions();
  list.unshift(sub);
  localStorage.setItem(LOCAL_SUBSTITUTIONS_KEY, JSON.stringify(list));
  return list;
}

/**
 * Assign a new substitution
 */
export async function assignSubstitution(data) {
  const subRecord = {
    ...data,
    id: data.id || `sub_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
  };

  if (isFirebaseConfigured) {
    try {
      const docRef = await addDoc(collection(db, 'substitutions'), subRecord);
      subRecord.firestoreId = docRef.id;
    } catch (err) {
      console.warn('Firestore substitution save failed, using local store:', err);
    }
  }

  saveLocalSubstitution(subRecord);
  return subRecord;
}

/**
 * Query substitutions for a specific date (Format: YYYY-MM-DD)
 * Uses single-field query only on 'date'
 */
export async function getSubstitutionsForDate(dateStr) {
  if (isFirebaseConfigured) {
    try {
      const q = query(collection(db, 'substitutions'), where('date', '==', dateStr));
      const snap = await getDocs(q);
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      if (list.length > 0) return list;
    } catch (err) {
      console.warn('Error querying Firestore substitutions for date:', err);
    }
  }

  const local = getLocalSubstitutions();
  return local.filter(s => s.date === dateStr);
}

/**
 * Query all substitutions
 */
export async function getAllSubstitutions() {
  if (isFirebaseConfigured) {
    try {
      const snap = await getDocs(collection(db, 'substitutions'));
      const list = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      if (list.length > 0) {
        return list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
      }
    } catch (err) {
      console.warn('Error fetching all substitutions from Firestore:', err);
    }
  }

  return getLocalSubstitutions().sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
}
