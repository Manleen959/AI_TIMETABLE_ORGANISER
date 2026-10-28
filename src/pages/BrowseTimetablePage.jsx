import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTimetable } from '../context/TimetableContext';
import TimetableGrid from '../components/TimetableGrid';
import { Compass, BookOpen, Users, MapPin, Search, Printer } from 'lucide-react';

export default function BrowseTimetablePage() {
  const [searchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const { timetable, entries: rawEntries, periods, days } = useTimetable();
  const [mode, setMode] = useState('class'); // 'class' | 'faculty' | 'venue'
  const [selectedValue, setSelectedValue] = useState('');
  const [filterSearch, setFilterSearch] = useState(initialQuery);

  useEffect(() => {
    if (timetable) {
      if (mode === 'class' && timetable.classes?.length > 0) {
        setSelectedValue(prev => prev || timetable.classes[0]);
      } else if (mode === 'faculty' && timetable.faculty?.length > 0) {
        setSelectedValue(prev => prev || timetable.faculty[0]);
      } else if (mode === 'venue' && timetable.venues?.length > 0) {
        setSelectedValue(prev => prev || timetable.venues[0]);
      }
    }
  }, [mode, timetable]);

  // Options list based on mode
  let options = [];
  if (mode === 'class') options = timetable?.classes || [];
  else if (mode === 'faculty') options = timetable?.faculty || [];
  else if (mode === 'venue') options = timetable?.venues || [];

  const filteredOptions = options.filter(opt =>
    opt.toLowerCase().includes(filterSearch.toLowerCase())
  );

  // Filter entries based on mode & selectedValue
  const currentSelection = selectedValue || (filteredOptions[0] || '');
  let entries = [];
  if (mode === 'class') {
    entries = rawEntries.filter(e => e.classId === currentSelection);
  } else if (mode === 'faculty') {
    entries = rawEntries.filter(e => e.faculty === currentSelection);
  } else if (mode === 'venue') {
    entries = rawEntries.filter(e => e.venue === currentSelection);
  }

  function handleModeChange(newMode) {
    setMode(newMode);
    setFilterSearch('');
    if (timetable) {
      if (newMode === 'class') setSelectedValue(timetable.classes?.[0] || '');
      else if (newMode === 'faculty') setSelectedValue(timetable.faculty?.[0] || '');
      else if (newMode === 'venue') setSelectedValue(timetable.venues?.[0] || '');
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Console */}
      <div className="bg-white rounded-panel p-6 border border-line shadow-soft space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-navy-50 text-navy-700 text-[11px] font-bold uppercase mb-2">
              <Compass className="w-3.5 h-3.5" />
              <span>Timetable Master Explorer</span>
            </div>
            <h1 className="font-serif text-2xl font-bold text-navy-900">
              Browse Academic Matrix
            </h1>
            <p className="text-xs text-muted mt-1">
              Analyze room occupancy, student batch schedules, and faculty teaching timetables across PCTE.
            </p>
          </div>

          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 bg-navy-900 hover:bg-navy-700 text-white px-4 py-2 rounded-full text-xs font-bold transition-all shadow-sm self-start md:self-auto cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print View</span>
          </button>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-line">
          <div className="flex items-center gap-2 bg-surface p-1 rounded-full border border-line">
            <button
              onClick={() => handleModeChange('class')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                mode === 'class'
                  ? 'bg-green-600 text-white shadow-sm'
                  : 'text-muted hover:text-navy-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>By Class</span>
            </button>

            <button
              onClick={() => handleModeChange('faculty')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                mode === 'faculty'
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'text-muted hover:text-navy-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>By Faculty</span>
            </button>

            <button
              onClick={() => handleModeChange('venue')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                mode === 'venue'
                  ? 'bg-navy-900 text-white shadow-sm'
                  : 'text-muted hover:text-navy-900'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>By Room / Lab</span>
            </button>
          </div>

          {/* Searchable Select */}
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={`Filter ${mode}s...`}
                value={filterSearch}
                onChange={(e) => setFilterSearch(e.target.value)}
                className="w-full bg-surface border border-line rounded-full pl-8 pr-3 py-1.5 text-xs text-navy-900 focus:outline-none focus:ring-1 focus:ring-navy-700"
              />
            </div>

            <select
              value={currentSelection}
              onChange={(e) => setSelectedValue(e.target.value)}
              className="bg-white border border-line rounded-full px-4 py-1.5 text-xs font-bold text-navy-900 shadow-sm focus:outline-none focus:ring-1 focus:ring-navy-700 cursor-pointer min-w-[140px]"
            >
              {filteredOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Grid View */}
      <div className="bg-white rounded-panel p-4 sm:p-6 border border-line shadow-soft">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-xs font-bold text-navy-900">
            Showing timetable for: <span className="text-green-700 bg-green-50 px-2 py-0.5 rounded-md font-mono">{currentSelection || 'None'}</span>
          </span>
          <span className="text-xs text-muted">
            {entries.length} scheduled slots
          </span>
        </div>

        <TimetableGrid
          entries={entries}
          periods={periods}
          days={days}
          showClassInCell={mode !== 'class'}
        />
      </div>
    </div>
  );
}
