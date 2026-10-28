import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { getCurrentTimetable } from '../utils/timetableService';
import { 
  findClashes, 
  facultyWorkload, 
  kmeans, 
  roomUsage, 
  dataQuality 
} from '../utils/insights';

const TimetableContext = createContext(null);

export function TimetableProvider({ children }) {
  const [timetable, setTimetable] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCurrent = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getCurrentTimetable();
      setTimetable(data);
    } catch (err) {
      console.warn('TimetableContext load failed:', err);
      setError(err?.message || 'Failed to load timetable');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrent();
  }, [fetchCurrent]);

  const entries = useMemo(() => timetable?.entries || [], [timetable]);
  const periods = useMemo(() => timetable?.periods || [], [timetable]);
  const days = useMemo(() => timetable?.days || [], [timetable]);
  const classes = useMemo(() => timetable?.classes || [], [timetable]);
  const faculty = useMemo(() => timetable?.faculty || [], [timetable]);
  const venues = useMemo(() => timetable?.venues || [], [timetable]);
  const wef = timetable?.wef || '2026-10-26';
  const fileName = timetable?.fileName || '';

  // Memoize heavy computations so pages do not recalculate on every render
  const clashesResult = useMemo(() => findClashes(entries), [entries]);
  const workloadList = useMemo(() => facultyWorkload(entries), [entries]);
  const clusteredFaculty = useMemo(() => kmeans(workloadList, 3), [workloadList]);
  const roomAnalytics = useMemo(() => roomUsage(entries, days, periods), [entries, days, periods]);
  const qualityReport = useMemo(() => dataQuality(entries), [entries]);

  const value = {
    timetable,
    loading,
    error,
    refreshTimetable: fetchCurrent,
    entries,
    periods,
    days,
    classes,
    faculty,
    venues,
    wef,
    fileName,
    // Memoized heavy insights
    clashesResult,
    workloadList,
    clusteredFaculty,
    roomAnalytics,
    qualityReport,
  };

  return (
    <TimetableContext.Provider value={value}>
      {children}
    </TimetableContext.Provider>
  );
}

export function useTimetable() {
  const context = useContext(TimetableContext);
  if (!context) {
    throw new Error('useTimetable must be used within a TimetableProvider');
  }
  return context;
}
