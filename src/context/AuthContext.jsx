import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  serverTimestamp 
} from 'firebase/firestore';
import { auth, db, secondaryAuth, isFirebaseConfigured } from '../firebase';
import { getLocalTeachers, saveLocalTeacher } from '../utils/timetableService';
import { normalizeClassId } from '../hooks/useMyEntries';

const AuthContext = createContext(null);

const DEMO_USERS_KEY = 'smartschedule_demo_user';
const LOCAL_USERS_KEY = 'smartschedule_local_users';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load profile from Firestore or local storage
  async function fetchProfile(uid, email) {
    if (isFirebaseConfigured) {
      try {
        const userDoc = await getDoc(doc(db, 'users', uid));
        if (userDoc.exists()) {
          const data = userDoc.data() || {};
          const role = data.role || 'student';
          const normalized = {
            ...data,
            role,
            classId: data.classId ? normalizeClassId(data.classId) : '',
          };
          setProfile(normalized);
          return normalized;
        }
      } catch (err) {
        console.warn('Could not read user profile from Firestore:', err);
      }
    }

    // Check local fallback
    try {
      const localUsers = JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || '{}');
      if (localUsers[uid]) {
        setProfile(localUsers[uid]);
        return localUsers[uid];
      }
      if (email) {
        // Find by email in local users
        const match = Object.values(localUsers).find(u => u.email?.toLowerCase() === email.toLowerCase());
        if (match) {
          setProfile(match);
          return match;
        }
      }
    } catch (e) {}

    // Dedicated root admin fallback
    if (email?.toLowerCase() === 'gurjeet@gmail.com') {
      const adminProf = {
        uid: uid || 'admin_gurjeet_root',
        name: 'Er. Gurjeet Singh (Admin)',
        email: 'gurjeet@gmail.com',
        role: 'admin',
      };
      setProfile(adminProf);
      return adminProf;
    }

    // Default fallback profile if not found
    const fallback = {
      name: email?.split('@')[0] || 'User',
      email: email,
      role: 'student',
      classId: 'BCA-1A',
    };
    setProfile(fallback);
    return fallback;
  }

  useEffect(() => {
    // Check if demo user is stored
    const storedDemo = localStorage.getItem(DEMO_USERS_KEY);
    if (storedDemo) {
      try {
        const parsed = JSON.parse(storedDemo);
        setUser({ uid: parsed.uid, email: parsed.email, displayName: parsed.name });
        setProfile(parsed);
        setLoading(false);
        return;
      } catch (e) {}
    }

    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await fetchProfile(currentUser.uid, currentUser.email);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Standard Email/Password login
  async function login(email, password) {
    const cleanEmail = email.trim().toLowerCase();

    // Dedicated Root Administrator Credentials: gurjeet@gmail.com / 12345678
    if (cleanEmail === 'gurjeet@gmail.com' && password === '12345678') {
      let uid = 'admin_gurjeet_root';
      const adminProfile = {
        uid,
        name: 'Er. Gurjeet Singh (Admin)',
        email: 'gurjeet@gmail.com',
        role: 'admin',
      };

      if (isFirebaseConfigured) {
        try {
          let cred;
          try {
            cred = await signInWithEmailAndPassword(auth, 'gurjeet@gmail.com', '12345678');
            uid = cred.user.uid;
            adminProfile.uid = uid;
          } catch (signErr) {
            if (signErr.code === 'auth/user-not-found' || signErr.code === 'auth/invalid-credential') {
              try {
                cred = await createUserWithEmailAndPassword(auth, 'gurjeet@gmail.com', '12345678');
                uid = cred.user.uid;
                adminProfile.uid = uid;
              } catch (createErr) {
                console.warn('Auto-provisioning admin in Firebase Auth:', createErr);
              }
            }
          }

          if (uid) {
            try {
              await setDoc(doc(db, 'users', uid), {
                ...adminProfile,
                createdAt: serverTimestamp(),
              }, { merge: true });
            } catch (fsErr) {
              console.warn('Could not set admin doc in Firestore:', fsErr);
            }
          }
        } catch (e) {
          console.warn('Admin Firebase Auth notice:', e);
        }
      }

      localStorage.setItem(DEMO_USERS_KEY, JSON.stringify(adminProfile));
      setUser({ uid: adminProfile.uid, email: adminProfile.email, displayName: adminProfile.name });
      setProfile(adminProfile);
      return adminProfile;
    }

    // Check local users store first if not configured or for quick credentials
    const localUsers = JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || '{}');
    const localMatch = Object.values(localUsers).find(
      u => u.email?.toLowerCase() === email.toLowerCase() && u.password === password
    );

    if (localMatch) {
      const demoUserObj = { uid: localMatch.uid || `local_${Date.now()}`, ...localMatch };
      localStorage.setItem(DEMO_USERS_KEY, JSON.stringify(demoUserObj));
      setUser({ uid: demoUserObj.uid, email: demoUserObj.email, displayName: demoUserObj.name });
      setProfile(demoUserObj);
      return demoUserObj;
    }

    if (isFirebaseConfigured) {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      localStorage.removeItem(DEMO_USERS_KEY);
      const prof = await fetchProfile(cred.user.uid, cred.user.email);
      return prof;
    }

    throw new Error('User not found. Try Demo Login or register as a student.');
  }

  // Sign in with Google
  async function signInWithGoogle(preferredClassId = 'BCA-1E') {
    if (isFirebaseConfigured) {
      try {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        const result = await signInWithPopup(auth, provider);
        const gUser = result.user;
        localStorage.removeItem(DEMO_USERS_KEY);

        // Check if user already exists in Firestore
        let prof = null;
        try {
          const userDoc = await getDoc(doc(db, 'users', gUser.uid));
          if (userDoc.exists()) {
            prof = userDoc.data();
          }
        } catch (e) {
          console.warn('Error reading user doc on Google sign-in:', e);
        }

        if (!prof) {
          // Create initial student profile for new Google user
          prof = {
            uid: gUser.uid,
            name: gUser.displayName || 'Google User',
            email: gUser.email,
            role: 'student',
            classId: preferredClassId,
            photoURL: gUser.photoURL || '',
            createdAt: serverTimestamp(),
          };
          try {
            await setDoc(doc(db, 'users', gUser.uid), prof);
          } catch (e) {
            console.warn('Could not save Google user doc to Firestore:', e);
          }
        }

        setUser(gUser);
        setProfile(prof);
        return prof;
      } catch (err) {
        console.error('Google sign-in popup error:', err);
        throw err;
      }
    }

    // Fallback if in local demo mode
    const mockGoogleProfile = {
      uid: `google_${Date.now()}`,
      name: 'Google User (Demo)',
      email: 'student.google@pcte.edu.in',
      role: 'student',
      classId: preferredClassId,
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem(DEMO_USERS_KEY, JSON.stringify(mockGoogleProfile));
    setUser({ uid: mockGoogleProfile.uid, email: mockGoogleProfile.email, displayName: mockGoogleProfile.name });
    setProfile(mockGoogleProfile);
    return mockGoogleProfile;
  }

  // Student registration
  async function registerStudent({ name, email, password, classId }) {
    let uid = `std_${Date.now()}`;
    const userData = {
      uid,
      name,
      email,
      role: 'student',
      classId,
      createdAt: new Date().toISOString(),
      password, // for local fallback matching
    };

    if (isFirebaseConfigured) {
      try {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        uid = cred.user.uid;
        userData.uid = uid;
        delete userData.password;
        await setDoc(doc(db, 'users', uid), {
          ...userData,
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        console.warn('Firebase register failed, using local registration fallback:', err);
      }
    }

    // Save to local users backup
    const localUsers = JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || '{}');
    localUsers[uid] = userData;
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(localUsers));

    localStorage.setItem(DEMO_USERS_KEY, JSON.stringify(userData));
    setUser({ uid: userData.uid, email: userData.email, displayName: userData.name });
    setProfile(userData);
    return userData;
  }

  // One-time Admin creation
  async function setupAdmin({ name, email, password }) {
    let uid = `adm_${Date.now()}`;
    const userData = {
      uid,
      name,
      email,
      role: 'admin',
      createdAt: new Date().toISOString(),
      password,
    };

    if (isFirebaseConfigured) {
      try {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        uid = cred.user.uid;
        userData.uid = uid;
        delete userData.password;
        await setDoc(doc(db, 'users', uid), {
          ...userData,
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        console.warn('Firebase admin creation failed, using local fallback:', err);
      }
    }

    const localUsers = JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || '{}');
    localUsers[uid] = userData;
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(localUsers));

    localStorage.setItem(DEMO_USERS_KEY, JSON.stringify(userData));
    setUser({ uid: userData.uid, email: userData.email, displayName: userData.name });
    setProfile(userData);
    return userData;
  }

  // Check if admin already exists
  async function checkAdminExists() {
    if (isFirebaseConfigured) {
      try {
        const q = query(collection(db, 'users'), where('role', '==', 'admin'));
        const snap = await getDocs(q);
        if (!snap.empty) return true;
      } catch (e) {
        console.warn('Could not query admin from Firestore:', e);
      }
    }

    const localUsers = JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || '{}');
    return Object.values(localUsers).some(u => u.role === 'admin');
  }

  // Teacher creation by Admin via secondary app instance so admin remains logged in
  async function createTeacher({ name, email, password, facultyCode }) {
    let uid = `tch_${Date.now()}`;
    const teacherData = {
      uid,
      name,
      email,
      role: 'teacher',
      facultyCode,
      createdAt: new Date().toISOString(),
    };

    if (isFirebaseConfigured) {
      try {
        // Create user in secondary app
        const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
        uid = cred.user.uid;
        teacherData.uid = uid;
        // Sign out secondaryAuth immediately so it doesn't linger
        await signOut(secondaryAuth);

        // Store teacher profile in Firestore under primary db
        await setDoc(doc(db, 'users', uid), {
          ...teacherData,
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        console.warn('Secondary auth teacher creation failed, storing locally:', err);
      }
    }

    // Save to local teachers
    saveLocalTeacher(teacherData);
    const localUsers = JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || '{}');
    localUsers[uid] = { ...teacherData, password };
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(localUsers));

    return teacherData;
  }

  // Get list of teachers
  async function getTeachersList() {
    if (isFirebaseConfigured) {
      try {
        const q = query(collection(db, 'users'), where('role', '==', 'teacher'));
        const snap = await getDocs(q);
        const list = [];
        snap.forEach(docSnap => {
          list.push({ id: docSnap.id, ...docSnap.data() });
        });
        if (list.length > 0) return list;
      } catch (e) {
        console.warn('Could not list teachers from Firestore:', e);
      }
    }

    return getLocalTeachers();
  }

  // Demo Login Helper for rapid testing
  function demoLogin(role = 'admin', customData = {}) {
    let demoProfile;
    if (role === 'admin') {
      demoProfile = {
        uid: 'admin_gurjeet_root',
        name: 'Er. Gurjeet Singh (Admin)',
        email: 'gurjeet@gmail.com',
        role: 'admin',
      };
    } else if (role === 'teacher') {
      demoProfile = {
        uid: 'demo_teacher_gurjeet',
        name: 'Er. Gurjeet Singh',
        email: 'gurjeet@pcte.edu.in',
        role: 'teacher',
        facultyCode: customData.facultyCode || 'GURJEET',
      };
    } else {
      demoProfile = {
        uid: 'demo_student_rahul',
        name: 'Rahul Sharma',
        email: 'rahul.bca@pcte.edu.in',
        role: 'student',
        classId: customData.classId || 'BCA-1A',
      };
    }

    localStorage.setItem(DEMO_USERS_KEY, JSON.stringify(demoProfile));
    setUser({ uid: demoProfile.uid, email: demoProfile.email, displayName: demoProfile.name });
    setProfile(demoProfile);
    return demoProfile;
  }

  async function updateProfile(updates) {
    if (!user) return;
    const uid = user.uid;
    const updated = { ...(profile || {}), ...updates };

    if (isFirebaseConfigured) {
      try {
        await setDoc(doc(db, 'users', uid), updates, { merge: true });
      } catch (e) {
        console.warn('Could not update profile in Firestore:', e);
      }
    }

    try {
      const localUsers = JSON.parse(localStorage.getItem(LOCAL_USERS_KEY) || '{}');
      if (localUsers[uid]) {
        localUsers[uid] = { ...localUsers[uid], ...updates };
        localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(localUsers));
      }
      const demo = localStorage.getItem(DEMO_USERS_KEY);
      if (demo) {
        const parsed = JSON.parse(demo);
        if (parsed.uid === uid) {
          localStorage.setItem(DEMO_USERS_KEY, JSON.stringify({ ...parsed, ...updates }));
        }
      }
    } catch (e) {}

    setProfile(updated);
    return updated;
  }

  async function resetPassword(email) {
    if (!email) throw new Error('Please enter your registered email address');
    if (isFirebaseConfigured) {
      await sendPasswordResetEmail(auth, email);
      return true;
    }
    // In local demo mode, simulate success
    return true;
  }

  async function logout() {
    if (isFirebaseConfigured && auth) {
      try {
        await signOut(auth);
      } catch (err) {
        console.warn('Firebase signout error:', err);
      }
    }
    localStorage.removeItem(DEMO_USERS_KEY);
    localStorage.removeItem('smartschedule_profile');
    setUser(null);
    setProfile(null);
  }

  const role = profile?.role || (user ? 'student' : null);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        loading,
        login,
        signInWithGoogle,
        registerStudent,
        setupAdmin,
        checkAdminExists,
        createTeacher,
        getTeachersList,
        demoLogin,
        updateProfile,
        resetPassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
