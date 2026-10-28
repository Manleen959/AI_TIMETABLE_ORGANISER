/**
 * src/hooks/useMyEntries.js - Single source of truth for user timetable entries
 * Strictly filters entries for logged-in Student (by classId) or Teacher (by facultyCode).
 * Uses TimetableContext to avoid re-reading Firestore repeatedly.
 * NEVER falls back to unfiltered entries for students or teachers.
 */
import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTimetable } from '../context/TimetableContext';

/**
 * Normalizes a Class ID:
 * Trim, uppercase, and replace any whitespace or underscores with a single hyphen.
 * e.g. "bca 1a" -> "BCA-1A", "BCA_1A" -> "BCA-1A", "bca-1a " -> "BCA-1A"
 */
export function normalizeClassId(val) {
  if (!val) return '';
  return String(val)
    .trim()
    .toUpperCase()
    .replace(/[\s_]+/g, '-');
}

/**
 * Normalizes a Faculty Code:
 * Trim, uppercase, and strip leading "DR." or "DR " prefixes.
 * e.g. "Dr. Sharma" -> "SHARMA", "Dr Anurag" -> "ANURAG", "PRK" -> "PRK"
 */
export function normalizeFaculty(val) {
  if (!val) return '';
  return String(val)
    .trim()
    .toUpperCase()
    .replace(/^DR\.?\s*/i, '');
}

export function useMyEntries() {
  const { profile, role: rawRole } = useAuth();
  const {
    timetable,
    loading,
    entries: rawEntries,
    periods,
    days,
    classes: availableClasses,
    faculty: availableFaculty,
    wef,
    fileName,
    refreshTimetable,
  } = useTimetable();

  // If role is missing or not admin/teacher, default role to student
  const role = rawRole || profile?.role || 'student';

  const { filteredEntries, needsClass, notFound } = useMemo(() => {
    if (loading) {
      return { filteredEntries: [], needsClass: false, notFound: false };
    }

    if (role === 'admin') {
      return { filteredEntries: rawEntries, needsClass: false, notFound: false };
    }

    if (role === 'teacher') {
      const targetFaculty = normalizeFaculty(profile?.facultyCode);
      if (!targetFaculty) {
        return { filteredEntries: [], needsClass: true, notFound: false };
      }

      const matches = rawEntries.filter(
        (e) => normalizeFaculty(e.faculty) === targetFaculty
      );

      if (matches.length === 0) {
        return { filteredEntries: [], needsClass: true, notFound: true };
      }

      return { filteredEntries: matches, needsClass: false, notFound: false };
    }

    // Role is 'student' (or any other non-admin role)
    const targetClass = normalizeClassId(profile?.classId);
    if (!targetClass) {
      return { filteredEntries: [], needsClass: true, notFound: false };
    }

    const matches = rawEntries.filter(
      (e) => normalizeClassId(e.classId) === targetClass
    );

    if (matches.length === 0) {
      return { filteredEntries: [], needsClass: true, notFound: true };
    }

    return { filteredEntries: matches, needsClass: false, notFound: false };
  }, [rawEntries, role, profile?.classId, profile?.facultyCode, loading]);

  return {
    entries: filteredEntries,
    allEntries: role === 'admin' ? rawEntries : [],
    periods,
    days,
    availableClasses,
    availableFaculty,
    wef,
    fileName,
    loading,
    needsClass,
    notFound,
    timetable,
    refetch: refreshTimetable,
  };
}

export default useMyEntries;
