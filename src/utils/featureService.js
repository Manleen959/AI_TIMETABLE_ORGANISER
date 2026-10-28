/**
 * src/utils/featureService.js
 * Unified Firestore & local-storage service for:
 * - Attendance (P/A/L records)
 * - Tasks & Exams planner
 * - Resources
 * - Extra Classes
 * - Faculty Swaps
 * - Notifications (derived)
 * 
 * RULE: Query Firestore on ONE field only and filter in JS.
 */
import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  serverTimestamp 
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase';
import { normalizeClassId, normalizeFaculty } from '../hooks/useMyEntries';

// LocalStorage Keys for demo / offline fallback
const LS_ATTENDANCE = 'smartschedule_attendance';
const LS_TASKS = 'smartschedule_tasks';
const LS_RESOURCES = 'smartschedule_resources';
const LS_EXTRA_CLASSES = 'smartschedule_extra_classes';
const LS_SWAPS = 'smartschedule_swaps';
const LS_ANNOUNCEMENTS = 'smartschedule_announcements';

function getLocal(key, defaultVal = []) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultVal;
  } catch {
    return defaultVal;
  }
}

function setLocal(key, val) {
  try {
    localStorage.setItem(key, JSON.stringify(val));
  } catch {}
}

// -------------------------------------------------------------
// 1. ATTENDANCE SERVICE
// -------------------------------------------------------------
export async function saveAttendanceRecord({ date, classId, period, subject, facultyCode, records }) {
  const normClass = normalizeClassId(classId);
  const normFaculty = normalizeFaculty(facultyCode);
  const recordId = `${date}_${normClass}_P${period}`;

  const payload = {
    date,
    classId: normClass,
    period: Number(period),
    subject,
    facultyCode: normFaculty,
    records: records || {}, // { [studentUid]: "P" | "A" | "L" }
    createdAt: new Date().toISOString(),
  };

  if (isFirebaseConfigured) {
    try {
      await setDoc(doc(db, 'attendance', recordId), {
        ...payload,
        createdAt: serverTimestamp(),
      });
    } catch (e) {
      console.warn('Firestore attendance save failed, falling back to local:', e);
    }
  }

  // Local fallback
  const list = getLocal(LS_ATTENDANCE);
  const existingIdx = list.findIndex(a => a.id === recordId || (a.date === date && a.classId === normClass && a.period === Number(period)));
  if (existingIdx >= 0) {
    list[existingIdx] = { id: recordId, ...payload };
  } else {
    list.push({ id: recordId, ...payload });
  }
  setLocal(LS_ATTENDANCE, list);
  return { id: recordId, ...payload };
}

export async function getAttendanceForClass(classId) {
  const normClass = normalizeClassId(classId);
  if (!normClass) return [];

  if (isFirebaseConfigured) {
    try {
      // Query on ONE field only
      const q = query(collection(db, 'attendance'), where('classId', '==', normClass));
      const snap = await getDocs(q);
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (docs.length > 0) return docs;
    } catch (e) {
      console.warn('Firestore attendance fetch failed:', e);
    }
  }

  // Local fallback
  const list = getLocal(LS_ATTENDANCE);
  return list.filter(a => normalizeClassId(a.classId) === normClass);
}

export async function getAttendanceForDate(date) {
  if (isFirebaseConfigured) {
    try {
      // Query on ONE field only
      const q = query(collection(db, 'attendance'), where('date', '==', date));
      const snap = await getDocs(q);
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (docs.length > 0) return docs;
    } catch (e) {
      console.warn('Firestore attendance fetch failed:', e);
    }
  }

  const list = getLocal(LS_ATTENDANCE);
  return list.filter(a => a.date === date);
}

export async function getAllAttendance() {
  if (isFirebaseConfigured) {
    try {
      const snap = await getDocs(collection(db, 'attendance'));
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.warn('Firestore all attendance fetch failed:', e);
    }
  }
  return getLocal(LS_ATTENDANCE);
}

// -------------------------------------------------------------
// 2. TASKS & EXAMS PLANNER SERVICE
// -------------------------------------------------------------
export async function getTasksForUser(uid) {
  if (!uid) return [];

  if (isFirebaseConfigured) {
    try {
      // Query on ONE field: uid
      const q = query(collection(db, 'tasks'), where('uid', '==', uid));
      const snap = await getDocs(q);
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (docs.length > 0) {
        return docs.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
      }
    } catch (e) {
      console.warn('Firestore tasks fetch failed:', e);
    }
  }

  const list = getLocal(LS_TASKS);
  return list
    .filter(t => t.uid === uid)
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
}

export async function createTask({ uid, title, subject, dueDate, type = 'assignment' }) {
  const payload = {
    uid,
    title: title.trim(),
    subject: subject.trim(),
    dueDate,
    type, // 'assignment' | 'exam' | 'other'
    done: false,
    createdAt: new Date().toISOString(),
  };

  let id = `task_${Date.now()}`;
  if (isFirebaseConfigured) {
    try {
      const docRef = await addDoc(collection(db, 'tasks'), {
        ...payload,
        createdAt: serverTimestamp(),
      });
      id = docRef.id;
    } catch (e) {
      console.warn('Firestore task create failed:', e);
    }
  }

  const item = { id, ...payload };
  const list = getLocal(LS_TASKS);
  list.push(item);
  setLocal(LS_TASKS, list);
  return item;
}

export async function toggleTaskDone(taskId, currentStatus) {
  const newStatus = !currentStatus;
  if (isFirebaseConfigured) {
    try {
      await updateDoc(doc(db, 'tasks', taskId), { done: newStatus });
    } catch (e) {
      console.warn('Firestore task toggle failed:', e);
    }
  }

  const list = getLocal(LS_TASKS);
  const idx = list.findIndex(t => t.id === taskId);
  if (idx >= 0) {
    list[idx].done = newStatus;
    setLocal(LS_TASKS, list);
  }
  return newStatus;
}

export async function deleteTask(taskId) {
  if (isFirebaseConfigured) {
    try {
      await deleteDoc(doc(db, 'tasks', taskId));
    } catch (e) {
      console.warn('Firestore task delete failed:', e);
    }
  }

  const list = getLocal(LS_TASKS).filter(t => t.id !== taskId);
  setLocal(LS_TASKS, list);
  return true;
}

// -------------------------------------------------------------
// 3. CLASS RESOURCES SERVICE
// -------------------------------------------------------------
export async function getResourcesForClass(classId) {
  const normClass = normalizeClassId(classId);
  if (!normClass) return [];

  if (isFirebaseConfigured) {
    try {
      // Query on ONE field: classId
      const q = query(collection(db, 'resources'), where('classId', '==', normClass));
      const snap = await getDocs(q);
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (docs.length > 0) return docs;
    } catch (e) {
      console.warn('Firestore resources fetch failed:', e);
    }
  }

  const list = getLocal(LS_RESOURCES);
  return list.filter(r => normalizeClassId(r.classId) === normClass);
}

export async function createResource({ classId, subject, title, url, note = '', facultyCode }) {
  const payload = {
    classId: normalizeClassId(classId),
    subject: subject.trim(),
    title: title.trim(),
    url: url.trim(),
    note: note.trim(),
    facultyCode: normalizeFaculty(facultyCode),
    createdAt: new Date().toISOString(),
  };

  let id = `res_${Date.now()}`;
  if (isFirebaseConfigured) {
    try {
      const docRef = await addDoc(collection(db, 'resources'), {
        ...payload,
        createdAt: serverTimestamp(),
      });
      id = docRef.id;
    } catch (e) {
      console.warn('Firestore resource create failed:', e);
    }
  }

  const item = { id, ...payload };
  const list = getLocal(LS_RESOURCES);
  list.unshift(item);
  setLocal(LS_RESOURCES, list);
  return item;
}

export async function deleteResource(resourceId) {
  if (isFirebaseConfigured) {
    try {
      await deleteDoc(doc(db, 'resources', resourceId));
    } catch (e) {
      console.warn('Firestore resource delete failed:', e);
    }
  }

  const list = getLocal(LS_RESOURCES).filter(r => r.id !== resourceId);
  setLocal(LS_RESOURCES, list);
  return true;
}

// -------------------------------------------------------------
// 4. EXTRA CLASSES SERVICE
// -------------------------------------------------------------
export async function getExtraClassesForClass(classId) {
  const normClass = normalizeClassId(classId);
  if (!normClass) return [];

  if (isFirebaseConfigured) {
    try {
      // Query on ONE field: classId
      const q = query(collection(db, 'extraClasses'), where('classId', '==', normClass));
      const snap = await getDocs(q);
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (docs.length > 0) return docs;
    } catch (e) {
      console.warn('Firestore extraClasses fetch failed:', e);
    }
  }

  const list = getLocal(LS_EXTRA_CLASSES);
  return list.filter(ec => normalizeClassId(ec.classId) === normClass);
}

export async function getExtraClassesForDate(date) {
  if (isFirebaseConfigured) {
    try {
      // Query on ONE field: date
      const q = query(collection(db, 'extraClasses'), where('date', '==', date));
      const snap = await getDocs(q);
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (docs.length > 0) return docs;
    } catch (e) {
      console.warn('Firestore extraClasses for date fetch failed:', e);
    }
  }

  const list = getLocal(LS_EXTRA_CLASSES);
  return list.filter(ec => ec.date === date);
}

export async function createExtraClass({ date, classId, period, subject, facultyCode, venue, note = '' }) {
  const payload = {
    date,
    classId: normalizeClassId(classId),
    period: Number(period),
    subject: subject.trim(),
    facultyCode: normalizeFaculty(facultyCode),
    venue: venue.trim().toUpperCase(),
    note: note.trim(),
    createdAt: new Date().toISOString(),
  };

  let id = `extra_${Date.now()}`;
  if (isFirebaseConfigured) {
    try {
      const docRef = await addDoc(collection(db, 'extraClasses'), {
        ...payload,
        createdAt: serverTimestamp(),
      });
      id = docRef.id;
    } catch (e) {
      console.warn('Firestore extraClass create failed:', e);
    }
  }

  const item = { id, ...payload };
  const list = getLocal(LS_EXTRA_CLASSES);
  list.push(item);
  setLocal(LS_EXTRA_CLASSES, list);
  return item;
}

export async function deleteExtraClass(extraId) {
  if (isFirebaseConfigured) {
    try {
      await deleteDoc(doc(db, 'extraClasses', extraId));
    } catch (e) {
      console.warn('Firestore extraClass delete failed:', e);
    }
  }

  const list = getLocal(LS_EXTRA_CLASSES).filter(e => e.id !== extraId);
  setLocal(LS_EXTRA_CLASSES, list);
  return true;
}

// -------------------------------------------------------------
// 5. SWAPS SERVICE
// -------------------------------------------------------------
export async function createSwapRequest({ fromFaculty, toFaculty, day, period, date, classId, subject = '' }) {
  const payload = {
    fromFaculty: normalizeFaculty(fromFaculty),
    toFaculty: normalizeFaculty(toFaculty),
    day: day.toUpperCase(),
    period: Number(period),
    date,
    classId: normalizeClassId(classId),
    subject,
    status: 'pending', // 'pending' | 'accepted' | 'declined'
    createdAt: new Date().toISOString(),
  };

  let id = `swap_${Date.now()}`;
  if (isFirebaseConfigured) {
    try {
      const docRef = await addDoc(collection(db, 'swaps'), {
        ...payload,
        createdAt: serverTimestamp(),
      });
      id = docRef.id;
    } catch (e) {
      console.warn('Firestore swap create failed:', e);
    }
  }

  const item = { id, ...payload };
  const list = getLocal(LS_SWAPS);
  list.unshift(item);
  setLocal(LS_SWAPS, list);
  return item;
}

export async function getSwapsForFaculty(facultyCode) {
  const normFaculty = normalizeFaculty(facultyCode);
  if (!normFaculty) return [];

  let results = [];
  if (isFirebaseConfigured) {
    try {
      // Query on ONE field: toFaculty
      const qIncoming = query(collection(db, 'swaps'), where('toFaculty', '==', normFaculty));
      const snapIn = await getDocs(qIncoming);
      const incoming = snapIn.docs.map(d => ({ id: d.id, ...d.data() }));

      // Query on ONE field: fromFaculty
      const qOutgoing = query(collection(db, 'swaps'), where('fromFaculty', '==', normFaculty));
      const snapOut = await getDocs(qOutgoing);
      const outgoing = snapOut.docs.map(d => ({ id: d.id, ...d.data() }));

      results = [...incoming, ...outgoing.filter(o => !incoming.some(i => i.id === o.id))];
      if (results.length > 0) return results;
    } catch (e) {
      console.warn('Firestore swaps fetch failed:', e);
    }
  }

  const list = getLocal(LS_SWAPS);
  return list.filter(s => s.fromFaculty === normFaculty || s.toFaculty === normFaculty);
}

export async function getAllSwaps() {
  if (isFirebaseConfigured) {
    try {
      const snap = await getDocs(collection(db, 'swaps'));
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.warn('Firestore all swaps fetch failed:', e);
    }
  }
  return getLocal(LS_SWAPS);
}

export async function updateSwapStatus(swapId, newStatus) {
  if (isFirebaseConfigured) {
    try {
      await updateDoc(doc(db, 'swaps', swapId), { status: newStatus });
    } catch (e) {
      console.warn('Firestore swap update status failed:', e);
    }
  }

  const list = getLocal(LS_SWAPS);
  const idx = list.findIndex(s => s.id === swapId);
  if (idx >= 0) {
    list[idx].status = newStatus;
    setLocal(LS_SWAPS, list);
    return list[idx];
  }
  return null;
}

// -------------------------------------------------------------
// 6. ANNOUNCEMENTS (CLASS HUB)
// -------------------------------------------------------------
export async function createAnnouncement({ title, message, targetClass = 'ALL', facultyCode = 'ADMIN' }) {
  const payload = {
    title: title.trim(),
    message: message.trim(),
    targetClass: targetClass === 'ALL' ? 'ALL' : normalizeClassId(targetClass),
    facultyCode: normalizeFaculty(facultyCode),
    createdAt: new Date().toISOString(),
  };

  let id = `ann_${Date.now()}`;
  if (isFirebaseConfigured) {
    try {
      const docRef = await addDoc(collection(db, 'announcements'), {
        ...payload,
        createdAt: serverTimestamp(),
      });
      id = docRef.id;
    } catch (e) {
      console.warn('Firestore announcement create failed:', e);
    }
  }

  const item = { id, ...payload };
  const list = getLocal(LS_ANNOUNCEMENTS);
  list.unshift(item);
  setLocal(LS_ANNOUNCEMENTS, list);
  return item;
}

export async function getAnnouncements() {
  if (isFirebaseConfigured) {
    try {
      const snap = await getDocs(collection(db, 'announcements'));
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.warn('Firestore announcements fetch failed:', e);
    }
  }
  return getLocal(LS_ANNOUNCEMENTS);
}

export async function deleteAnnouncement(annId) {
  if (isFirebaseConfigured) {
    try {
      await deleteDoc(doc(db, 'announcements', annId));
    } catch (e) {
      console.warn('Firestore announcement delete failed:', e);
    }
  }
  const list = getLocal(LS_ANNOUNCEMENTS).filter(a => a.id !== annId);
  setLocal(LS_ANNOUNCEMENTS, list);
  return true;
}

// -------------------------------------------------------------
// 7. DERIVED NOTIFICATIONS (S1)
// -------------------------------------------------------------
/**
 * Merges announcements, cancellations, substitutions, extra classes,
 * resources, and swaps relevant to the student's class or teacher's code.
 */
export async function getDerivedNotifications({ role, classId, facultyCode, lastSeen = null }) {
  const normClass = normalizeClassId(classId);
  const normFaculty = normalizeFaculty(facultyCode);
  const notifications = [];

  try {
    // 1. Announcements
    const announcements = await getAnnouncements();
    for (const ann of announcements) {
      if (ann.targetClass === 'ALL' || ann.targetClass === normClass || role === 'admin') {
        notifications.push({
          id: `ann_${ann.id}`,
          type: 'announcement',
          title: ann.title,
          message: ann.message,
          badge: ann.targetClass === 'ALL' ? 'Campus' : `Class ${ann.targetClass}`,
          timestamp: ann.createdAt || new Date().toISOString(),
        });
      }
    }

    // 2. Extra Classes
    if (normClass || role === 'admin') {
      const extraList = normClass ? await getExtraClassesForClass(normClass) : getLocal(LS_EXTRA_CLASSES);
      for (const ec of extraList) {
        notifications.push({
          id: `extra_${ec.id}`,
          type: 'extraClass',
          title: `Extra Class: ${ec.subject}`,
          message: `Scheduled on ${ec.date} (Period ${ec.period}) in Room ${ec.venue}. Prof: ${ec.facultyCode}`,
          badge: 'Extra Class',
          timestamp: ec.createdAt || ec.date,
        });
      }
    }

    // 3. New Resources
    if (normClass || role === 'admin') {
      const resList = normClass ? await getResourcesForClass(normClass) : getLocal(LS_RESOURCES);
      for (const res of resList) {
        notifications.push({
          id: `res_${res.id}`,
          type: 'resource',
          title: `New Study Material: ${res.title}`,
          message: `${res.subject} resource uploaded by Prof. ${res.facultyCode}. ${res.note || ''}`,
          badge: 'Resource',
          url: res.url,
          timestamp: res.createdAt || new Date().toISOString(),
        });
      }
    }

    // 4. Swaps (if teacher or admin)
    if (role === 'teacher' && normFaculty) {
      const swapList = await getSwapsForFaculty(normFaculty);
      for (const sw of swapList) {
        if (sw.toFaculty === normFaculty && sw.status === 'pending') {
          notifications.push({
            id: `swap_${sw.id}`,
            type: 'swap',
            title: `Swap Request from Prof. ${sw.fromFaculty}`,
            message: `Requesting to swap Period ${sw.period} (${sw.classId}) on ${sw.date}.`,
            badge: 'Swap Request',
            timestamp: sw.createdAt || new Date().toISOString(),
          });
        }
      }
    }
  } catch (err) {
    console.warn('Error deriving notifications:', err);
  }

  // Sort descending by timestamp
  notifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const lastSeenDate = lastSeen ? new Date(lastSeen) : new Date(0);
  const unreadCount = notifications.filter(n => new Date(n.timestamp) > lastSeenDate).length;

  return { notifications, unreadCount };
}
