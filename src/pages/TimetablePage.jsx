import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useMyEntries, normalizeClassId, normalizeFaculty } from '../hooks/useMyEntries';
import ClassSelectorCard from '../components/ClassSelectorCard';
import TimetableGrid, { getSubjectColorStyle } from '../components/TimetableGrid';
import { TimetableSkeleton } from '../components/Skeleton';
import { getExtraClassesForClass } from '../utils/featureService';
import { Calendar, Printer, Sparkles, Filter, Users, BookOpen, Download, Palette } from 'lucide-react';
import { downloadIcsFile } from '../utils/ics';
import toast from 'react-hot-toast';

export default function TimetablePage({ viewType = 'student' }) {
  const { profile, role } = useAuth();
  const {
    entries: myEntries,
    allEntries,
    periods,
    days,
    availableClasses,
    availableFaculty,
    wef,
    loading,
    needsClass,
    notFound,
    refetch,
  } = useMyEntries();

  const isTeacher = viewType === 'teacher' || role === 'teacher';
  const isAdmin = role === 'admin';

  // S5: View Switcher state ('all' | 'today' | 'tomorrow')
  const [viewFilter, setViewFilter] = useState('all');
  const [extraClasses, setExtraClasses] = useState([]);

  // For Admin view only: allow browsing any class or faculty
  const [adminSelectedClass, setAdminSelectedClass] = useState('');
  const [adminSelectedFaculty, setAdminSelectedFaculty] = useState('');

  useEffect(() => {
    if (availableClasses.length > 0 && !adminSelectedClass) {
      setAdminSelectedClass(availableClasses[0]);
    }
    if (availableFaculty.length > 0 && !adminSelectedFaculty) {
      setAdminSelectedFaculty(availableFaculty[0]);
    }
  }, [availableClasses, availableFaculty, adminSelectedClass, adminSelectedFaculty]);

  // Load Extra Classes
  useEffect(() => {
    const targetClass = isAdmin ? adminSelectedClass : profile?.classId;
    if (targetClass) {
      getExtraClassesForClass(targetClass).then(setExtraClasses).catch(console.error);
    }
  }, [profile?.classId, adminSelectedClass, isAdmin]);

  // Compute entries to display
  let displayEntries = myEntries;
  let displayTitle = '';

  if (isAdmin) {
    if (isTeacher) {
      displayEntries = allEntries.filter(
        e => normalizeFaculty(e.faculty) === normalizeFaculty(adminSelectedFaculty)
      );
      displayTitle = `Schedule for Prof. ${adminSelectedFaculty || 'Faculty'}`;
    } else {
      displayEntries = allEntries.filter(
        e => normalizeClassId(e.classId) === normalizeClassId(adminSelectedClass)
      );
      displayTitle = `Class Timetable: ${adminSelectedClass || 'Class'}`;
    }
  } else if (isTeacher) {
    displayTitle = `Schedule for Prof. ${profile?.facultyCode || 'Faculty'}`;
  } else {
    displayTitle = `Class Timetable: ${profile?.classId || 'Class'}`;
  }

  // Filter days based on S5 "Today / Tomorrow / Full week" switcher
  const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  const todayIndex = new Date().getDay();
  const currentWeekday = dayNames[todayIndex];
  const tomorrowIndex = (todayIndex + 1) % 7;
  const tomorrowWeekday = dayNames[tomorrowIndex];

  const displayedDays = useMemo(() => {
    if (!days || days.length === 0) return [];
    if (viewFilter === 'today') {
      const match = days.find(d => d.toUpperCase() === currentWeekday);
      return match ? [match] : [days[0]];
    }
    if (viewFilter === 'tomorrow') {
      const match = days.find(d => d.toUpperCase() === tomorrowWeekday);
      return match ? [match] : [days[0]];
    }
    return days; // Full week
  }, [days, viewFilter, currentWeekday, tomorrowWeekday]);

  // Distinct subjects for Color Legend
  const distinctSubjects = useMemo(() => {
    const set = new Set(displayEntries.map(e => e.subject).filter(Boolean));
    return Array.from(set).sort();
  }, [displayEntries]);

  function handlePrint() {
    window.print();
  }

  function handleExportCalendar() {
    if (!displayEntries || displayEntries.length === 0) {
      toast.error('No schedule entries to export');
      return;
    }
    const calTitle = isTeacher 
      ? `Prof. ${profile?.facultyCode || adminSelectedFaculty} Schedule` 
      : `Class ${profile?.classId || adminSelectedClass} Timetable`;

    downloadIcsFile(displayEntries, {
      wefDate: wef || '2026-10-26',
      title: calTitle,
      fileName: `${calTitle.replace(/[\s.]+/g, '_')}.ics`,
      isTeacher,
    });
    toast.success('Calendar (.ics) downloaded! Open to import to Google Calendar.');
  }

  if (loading) {
    return <TimetableSkeleton />;
  }

  if (!isAdmin && needsClass) {
    return (
      <div className="py-8">
        <ClassSelectorCard
          availableClasses={availableClasses}
          notFound={notFound}
          onSaved={refetch}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Filters */}
      <div className="bg-white rounded-panel p-6 border border-line shadow-soft flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-green-50 text-green-700 text-[11px] font-bold uppercase mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isTeacher ? 'Faculty Teaching Schedule' : 'Student Batch Timetable'}</span>
          </div>
          <h1 className="font-serif text-2xl font-bold text-navy-900">
            {displayTitle}
          </h1>
          <p className="text-xs text-muted mt-1">
            W.E.F: <span className="font-semibold text-navy-900">{wef}</span> &bull; {displayEntries.length} total sessions scheduled
          </p>
        </div>

        {/* Filter controls & Actions */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Admin selector: only shown to admin */}
          {isAdmin && (
            isTeacher ? (
              <div className="flex items-center gap-2 bg-surface px-3 py-1.5 rounded-full border border-line text-xs font-semibold text-navy-900">
                <Users className="w-4 h-4 text-orange-500" />
                <span>Faculty:</span>
                <select
                  value={adminSelectedFaculty}
                  onChange={(e) => setAdminSelectedFaculty(e.target.value)}
                  className="bg-transparent font-bold focus:outline-none cursor-pointer"
                >
                  {availableFaculty.map(f => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-surface px-3 py-1.5 rounded-full border border-line text-xs font-semibold text-navy-900">
                <BookOpen className="w-4 h-4 text-green-600" />
                <span>Section:</span>
                <select
                  value={adminSelectedClass}
                  onChange={(e) => setAdminSelectedClass(e.target.value)}
                  className="bg-transparent font-bold focus:outline-none cursor-pointer"
                >
                  {availableClasses.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            )
          )}

          {/* S5: Today / Tomorrow / Full week Switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-full border border-line text-xs font-bold text-navy-900">
            {[
              { id: 'today', label: 'Today' },
              { id: 'tomorrow', label: 'Tomorrow' },
              { id: 'all', label: 'Full Week' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setViewFilter(tab.id)}
                className={`px-3 py-1.5 rounded-full transition-all cursor-pointer ${
                  viewFilter === tab.id
                    ? 'bg-white text-navy-900 shadow-sm font-bold'
                    : 'text-muted hover:text-navy-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Export to Google Calendar */}
          <button
            onClick={handleExportCalendar}
            disabled={displayEntries.length === 0}
            className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-full text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>ADD TO CALENDAR</span>
          </button>

          {/* Print / Save PDF */}
          <button
            onClick={handlePrint}
            disabled={displayEntries.length === 0}
            className="flex items-center gap-1.5 bg-navy-900 hover:bg-navy-700 text-white px-4 py-2 rounded-full text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print PDF</span>
          </button>
        </div>
      </div>

      {/* S5: Persistent Subject Colour Legend */}
      {distinctSubjects.length > 0 && (
        <div className="bg-white rounded-panel p-4 border border-line shadow-soft flex items-center gap-3 overflow-x-auto scrollbar-none">
          <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted flex-shrink-0">
            <Palette className="w-4 h-4 text-navy-700" />
            <span>Subject Legend:</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {distinctSubjects.map(sub => {
              const style = getSubjectColorStyle(sub);
              return (
                <div
                  key={sub}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${style.bg} ${style.border} ${style.text}`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shadow-xs"
                    style={{ backgroundColor: style.swatch }}
                  />
                  <span>{sub}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Timetable View */}
      <div className="bg-white rounded-panel p-4 sm:p-6 border border-line shadow-soft">
        {displayEntries.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-10 h-10 text-muted/40 mx-auto mb-2" />
            <h3 className="font-serif font-bold text-navy-900">No sessions scheduled</h3>
            <p className="text-xs text-muted mt-1">There are no classes scheduled for this cohort in the current timetable.</p>
          </div>
        ) : (
          <TimetableGrid
            entries={displayEntries}
            periods={periods}
            days={displayedDays}
            extraClasses={extraClasses}
            showClassInCell={isTeacher}
            highlightFree={true}
          />
        )}
      </div>
    </div>
  );
}
