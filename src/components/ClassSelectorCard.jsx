import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { normalizeClassId } from '../hooks/useMyEntries';
import { ALL_PCTE_CLASSES } from '../utils/timetableService';
import { BookOpen, AlertCircle, CheckCircle2, Save, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ClassSelectorCard({ availableClasses = [], notFound = false, onSaved }) {
  const { profile, updateProfile } = useAuth();
  const classList = (availableClasses && availableClasses.length >= 20) 
    ? [...availableClasses].sort() 
    : ALL_PCTE_CLASSES;
  const initialClass = classList.length > 0 ? classList[0] : '';
  const [selectedClass, setSelectedClass] = useState(profile?.classId || initialClass);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!selectedClass) {
      toast.error('Please select a valid class from the list');
      return;
    }

    const normalized = normalizeClassId(selectedClass);
    setSaving(true);
    try {
      await updateProfile({ classId: normalized });
      toast.success(`Class profile updated to ${normalized}!`);
      if (onSaved) onSaved(normalized);
    } catch (err) {
      console.error(err);
      toast.error('Failed to update class: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-panel p-8 sm:p-10 border border-line shadow-soft max-w-xl mx-auto text-center space-y-6 animate-in fade-in">
      <div className="w-14 h-14 rounded-3xl bg-green-50 text-green-700 flex items-center justify-center mx-auto shadow-xs">
        {notFound ? (
          <AlertCircle className="w-7 h-7 text-orange-500" />
        ) : (
          <BookOpen className="w-7 h-7 text-green-600" />
        )}
      </div>

      <div className="space-y-2">
        <h3 className="font-serif text-xl sm:text-2xl font-bold text-navy-900">
          {notFound 
            ? 'Your class was not found in the latest timetable' 
            : 'Select your class to see your timetable'}
        </h3>
        <p className="text-muted text-xs sm:text-sm leading-relaxed max-w-md mx-auto">
          {notFound 
            ? 'The master timetable was recently updated and your previous cohort code does not match. Please re-select your active batch below.'
            : 'To view your tailored clash-free periods, rooms, and professors, please select your assigned cohort.'}
        </p>
      </div>

      <div className="bg-surface p-6 rounded-2xl border border-line/80 space-y-4 text-left">
        <label className="block text-xs font-bold text-navy-900 uppercase tracking-wider">
          Class / Section
        </label>
        
        {classList.length > 0 ? (
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full bg-white border border-line rounded-xl px-4 py-3 text-sm font-bold text-navy-900 focus:outline-none focus:ring-2 focus:ring-green-600/20 focus:border-green-600 transition-all cursor-pointer shadow-xs"
          >
            {classList.map((cls) => (
              <option key={cls} value={cls}>
                {cls}
              </option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value.toUpperCase())}
            placeholder="e.g. BCA-1A"
            className="w-full bg-white border border-line rounded-xl px-4 py-3 text-sm font-bold text-navy-900 focus:outline-none focus:ring-2 focus:ring-green-600/20 focus:border-green-600 transition-all shadow-xs"
          />
        )}

        <button
          onClick={handleSave}
          disabled={saving || !selectedClass}
          className="w-full py-3 px-6 rounded-full bg-navy-900 hover:bg-navy-700 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? (
            <span>Saving Profile...</span>
          ) : (
            <>
              <Save className="w-4 h-4 text-lime-300" />
              <span>Save &amp; View Timetable</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
