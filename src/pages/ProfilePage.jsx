import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTimetable } from '../context/TimetableContext';
import { normalizeClassId } from '../hooks/useMyEntries';
import { ALL_PCTE_CLASSES } from '../utils/timetableService';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { deleteUser } from 'firebase/auth';
import { db, auth, isFirebaseConfigured } from '../firebase';
import { 
  User, 
  Settings, 
  Moon, 
  Sun, 
  Bell, 
  Globe, 
  Trash2, 
  Check, 
  AlertTriangle,
  GraduationCap,
  Briefcase,
  ShieldCheck,
  Save
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { user, profile, role, logout } = useAuth();
  const { classes } = useTimetable();

  const [name, setName] = useState(profile?.name || user?.displayName || '');
  const [selectedClass, setSelectedClass] = useState(profile?.classId || 'BTEC-4-CSE-4A');
  const [remindersEnabled, setRemindersEnabled] = useState(() => {
    return localStorage.getItem('smartschedule_reminders') !== 'false';
  });
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('smartschedule_theme') === 'dark';
  });
  const [aiLanguage, setAiLanguage] = useState(() => {
    return localStorage.getItem('smartschedule_ai_lang') || 'English';
  });

  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (profile?.name) setName(profile.name);
    if (profile?.classId) setSelectedClass(profile.classId);
  }, [profile]);

  // Synchronize dark mode class on html root
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('smartschedule_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('smartschedule_theme', 'light');
    }
  }, [darkMode]);

  async function handleSaveProfile(e) {
    e.preventDefault();
    setSaving(true);
    const normClass = normalizeClassId(selectedClass);

    try {
      if (isFirebaseConfigured && user?.uid) {
        await updateDoc(doc(db, 'users', user.uid), {
          name: name.trim(),
          classId: normClass,
          remindersEnabled,
          aiLanguage,
        });
      }

      // Local storage fallback sync
      const localProfile = JSON.parse(localStorage.getItem('smartschedule_profile') || '{}');
      localProfile.name = name.trim();
      localProfile.classId = normClass;
      localStorage.setItem('smartschedule_profile', JSON.stringify(localProfile));
      localStorage.setItem('smartschedule_reminders', String(remindersEnabled));
      localStorage.setItem('smartschedule_ai_lang', aiLanguage);

      toast.success('Profile and preferences updated!', { icon: '✨' });
    } catch (err) {
      console.error(err);
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      if (isFirebaseConfigured && user) {
        try {
          await deleteDoc(doc(db, 'users', user.uid));
        } catch (e) {
          console.warn('Doc deletion error:', e);
        }
        await deleteUser(user);
      }
      localStorage.clear();
      toast.success('Account deleted successfully');
      await logout();
      window.location.href = '/login';
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to delete account. Please re-login first.');
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
    }
  }

  // Complete PCTE classes list
  const availableClasses = (classes && classes.length >= 20) 
    ? [...classes].sort() 
    : ALL_PCTE_CLASSES;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-panel p-6 border border-line shadow-soft flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-navy-900 text-white flex items-center justify-center font-bold">
            <User className="w-6 h-6 text-lime-300" />
          </div>
          <div>
            <h1 className="font-serif text-2xl font-bold text-navy-900">
              Profile & Preferences
            </h1>
            <p className="text-xs text-muted">
              Manage your personal details, academic class mapping and application settings
            </p>
          </div>
        </div>

        <div className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-100 text-navy-900">
          {role}
        </div>
      </div>

      <form onSubmit={handleSaveProfile} className="space-y-6">
        {/* Personal & Academic Details */}
        <div className="bg-white rounded-panel p-6 border border-line shadow-soft space-y-4">
          <h2 className="font-serif text-base font-bold text-navy-900 flex items-center gap-2">
            <Settings className="w-4 h-4 text-navy-700" />
            <span>Academic Identity</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-muted mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Gurjeet Singh"
                className="w-full bg-slate-50 border border-line rounded-xl px-3.5 py-2.5 text-xs font-semibold text-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-700/20"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-muted mb-1.5">
                Email Address (Read-only)
              </label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full bg-slate-100 border border-line rounded-xl px-3.5 py-2.5 text-xs font-semibold text-muted cursor-not-allowed"
              />
            </div>

            {role === 'student' && (
              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted mb-1.5">
                  Assigned Class Section
                </label>
                <select
                  value={selectedClass}
                  onChange={e => setSelectedClass(e.target.value)}
                  className="w-full bg-slate-50 border border-line rounded-xl px-3.5 py-2.5 text-xs font-semibold text-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-700/20"
                >
                  {availableClasses.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <p className="text-[11px] text-muted mt-1">
                  Changing your class section automatically updates your personalized timetable and attendance tracking.
                </p>
              </div>
            )}

            {role === 'teacher' && (
              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted mb-1.5">
                  Faculty Code
                </label>
                <input
                  type="text"
                  disabled
                  value={profile?.facultyCode || 'Not Assigned'}
                  className="w-full bg-slate-100 border border-line rounded-xl px-3.5 py-2.5 text-xs font-semibold text-muted cursor-not-allowed"
                />
              </div>
            )}
          </div>
        </div>

        {/* Application Preferences */}
        <div className="bg-white rounded-panel p-6 border border-line shadow-soft space-y-4">
          <h2 className="font-serif text-base font-bold text-navy-900 flex items-center gap-2">
            <Moon className="w-4 h-4 text-navy-700" />
            <span>Application Settings & Appearance</span>
          </h2>

          <div className="divide-y divide-line/60">
            {/* Dark mode toggle */}
            <div className="py-3.5 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-navy-900 flex items-center gap-2">
                  {darkMode ? <Moon className="w-4 h-4 text-purple-600" /> : <Sun className="w-4 h-4 text-amber-500" />}
                  <span>Dark Mode Theme</span>
                </h4>
                <p className="text-[11px] text-muted">
                  Switch between crisp white and midnight high-contrast palette
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDarkMode(!darkMode)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  darkMode ? 'bg-navy-900' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    darkMode ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Reminder toggle */}
            <div className="py-3.5 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-navy-900 flex items-center gap-2">
                  <Bell className="w-4 h-4 text-green-600" />
                  <span>Class & Deadline Reminders</span>
                </h4>
                <p className="text-[11px] text-muted">
                  Receive notifications before upcoming lecture periods and assignment deadlines
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRemindersEnabled(!remindersEnabled)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  remindersEnabled ? 'bg-green-600' : 'bg-slate-200'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    remindersEnabled ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* AI Language Preference */}
            <div className="py-3.5 flex items-center justify-between flex-wrap gap-2">
              <div>
                <h4 className="text-xs font-bold text-navy-900 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-orange-500" />
                  <span>Language Preference for AI Notices</span>
                </h4>
                <p className="text-[11px] text-muted">
                  Generated AI notices and WhatsApp circulars will be composed in this language
                </p>
              </div>
              <select
                value={aiLanguage}
                onChange={e => setAiLanguage(e.target.value)}
                className="bg-slate-50 border border-line rounded-xl px-3 py-1.5 text-xs font-semibold text-navy-900 focus:outline-none"
              >
                <option value="English">English</option>
                <option value="Hindi">Hindi (हिंदी)</option>
                <option value="Punjabi">Punjabi (ਪੰਜਾਬੀ)</option>
              </select>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-navy-900 hover:bg-navy-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </div>

        {/* Danger Zone: Delete Account */}
        <div className="bg-rose-50/60 rounded-panel p-6 border border-rose-200 space-y-3">
          <div className="flex items-center gap-2 text-rose-700">
            <AlertTriangle className="w-5 h-5" />
            <h3 className="font-serif text-base font-bold">Danger Zone</h3>
          </div>
          <p className="text-xs text-rose-800 leading-relaxed">
            Permanently delete your SmartSchedule account, custom task items, and associated preferences. This action cannot be reversed.
          </p>
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete Account</span>
          </button>
        </div>
      </form>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-navy-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-panel max-w-sm w-full p-6 shadow-2xl border border-line space-y-4 animate-in fade-in zoom-in-95">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="font-serif text-lg font-bold text-navy-900">
                Confirm Account Deletion
              </h3>
              <p className="text-xs text-muted mt-1 leading-relaxed">
                Are you sure you want to permanently delete your account? All your personal task reminders and settings will be permanently erased.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2 rounded-full bg-slate-100 text-navy-900 text-xs font-semibold hover:bg-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleting}
                className="flex-1 py-2 rounded-full bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 cursor-pointer disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
