import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTimetable } from '../context/TimetableContext';
import { rankSubstitutes } from '../utils/insights';
import { assignSubstitution, getSubstitutionsForDate, getAllSubstitutions } from '../utils/substitutionService';
import { callAI } from '../utils/aiClient';
import { 
  Users, 
  Calendar, 
  Clock, 
  UserCheck, 
  Send, 
  Sparkles, 
  CheckCircle2, 
  Copy, 
  Bot, 
  AlertCircle, 
  FileText, 
  RefreshCw,
  Search,
  Check
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function SubstitutesPage({ isTeacherMode = false }) {
  const { user, profile, role } = useAuth();
  const { timetable, loading: ttLoading } = useTimetable();
  const [loading, setLoading] = useState(true);

  // Selected Date & Multi-day Range Support (T6)
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [isMultiDay, setIsMultiDay] = useState(false);

  // Selected Faculty
  const [selectedFaculty, setSelectedFaculty] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Existing substitutions
  const [activeSubstitutions, setActiveSubstitutions] = useState([]);

  // Draft Notice Modal / Card state
  const [draftingPeriod, setDraftingPeriod] = useState(null);
  const [noticeDraft, setNoticeDraft] = useState('');
  const [draftLoading, setDraftLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadSubs() {
      // Default faculty selection
      if (isTeacherMode || role === 'teacher') {
        setSelectedFaculty(profile?.facultyCode || 'GURJEET');
      } else if (timetable?.faculty && timetable.faculty.length > 0) {
        setSelectedFaculty(prev => prev || timetable.faculty[0]);
      }

      try {
        const subs = await getSubstitutionsForDate(selectedDate);
        setActiveSubstitutions(subs);
      } catch (err) {
        console.warn('Could not load substitutions:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSubs();
  }, [isTeacherMode, role, profile, timetable, selectedDate]);

  // When date changes, refresh substitutions
  useEffect(() => {
    async function refreshSubs() {
      if (!selectedDate) return;
      const subs = await getSubstitutionsForDate(selectedDate);
      setActiveSubstitutions(subs);
    }
    refreshSubs();
  }, [selectedDate]);

  // Generate date array for multi-day range
  const datesInRange = React.useMemo(() => {
    if (!isMultiDay || !endDate || endDate <= selectedDate) {
      return [selectedDate];
    }
    const list = [];
    let cur = new Date(selectedDate + 'T00:00:00');
    const stop = new Date(endDate + 'T00:00:00');
    while (cur <= stop) {
      list.push(cur.toISOString().split('T')[0]);
      cur.setDate(cur.getDate() + 1);
    }
    return list;
  }, [selectedDate, endDate, isMultiDay]);

  // Derive Weekday from selected date
  const weekdays = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  const targetDay = selectedDate 
    ? weekdays[new Date(selectedDate + 'T00:00:00').getDay()] 
    : 'MONDAY';

  const rawEntries = timetable?.entries || [];

  // Find affected periods for the absent faculty across all dates in range
  const allAffectedClassesInRange = React.useMemo(() => {
    if (!selectedFaculty) return [];
    const results = [];
    datesInRange.forEach(dStr => {
      const dayName = weekdays[new Date(dStr + 'T00:00:00').getDay()];
      const dayEntries = rawEntries
        .filter(e => e.day?.toUpperCase() === dayName && e.faculty === selectedFaculty)
        .sort((a, b) => Number(a.period || 0) - Number(b.period || 0));
      dayEntries.forEach(entry => {
        results.push({ ...entry, targetDate: dStr, targetDay: dayName });
      });
    });
    return results;
  }, [datesInRange, selectedFaculty, rawEntries]);

  // Find affected periods for the absent faculty on currently selected single day
  const affectedClasses = selectedFaculty
    ? rawEntries
        .filter(e => e.day?.toUpperCase() === targetDay && e.faculty === selectedFaculty)
        .sort((a, b) => Number(a.period || 0) - Number(b.period || 0))
    : [];

  // Assign substitute handler
  async function handleAssign(entry, candidate, customDate = null, customDay = null) {
    setSubmitting(true);
    const useDate = customDate || selectedDate;
    const useDay = customDay || targetDay;

    try {
      const record = {
        date: useDate,
        day: useDay,
        period: entry.period,
        classId: entry.classId,
        subject: entry.subject,
        absentFaculty: selectedFaculty,
        substituteFaculty: candidate.faculty,
        venue: entry.venue || '',
      };

      await assignSubstitution(record);
      toast.success(`Assigned ${candidate.faculty} to ${entry.classId} (${entry.subject}) on ${useDate}!`);

      // Refresh list
      const updated = await getSubstitutionsForDate(selectedDate);
      setActiveSubstitutions(updated);
    } catch (err) {
      console.error(err);
      toast.error('Failed to assign substitute: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  }

  // Generate Consolidated Multi-Day Copyable Notice (T6)
  function getMultiDayNoticeText() {
    const periodLines = allAffectedClassesInRange.map(ac => {
      const sub = activeSubstitutions.find(s => 
        String(s.period) === String(ac.period) && 
        s.classId === ac.classId && 
        s.date === ac.targetDate
      );
      const subStr = sub ? `Cover: Prof. ${sub.substituteFaculty}` : 'Cover: Arranged by Department';
      return `• ${ac.targetDate} (${ac.targetDay}) - Period ${ac.period} (${ac.classId}): ${ac.subject} [${subStr}]`;
    });

    const rangeHeader = isMultiDay 
      ? `from ${selectedDate} to ${endDate}`
      : `on ${selectedDate} (${targetDay})`;

    return `📢 *PCTE LUDHIANA - FACULTY ABSENCE & ARRANGEMENT NOTICE*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Prof. ${selectedFaculty} will be on approved leave ${rangeHeader}.

*AFFECTED CLASSES & SUBSTITUTE COVER SCHEDULE:*
${periodLines.length > 0 ? periodLines.join('\n') : 'No regular lectures affected.'}

Students are instructed to report to designated lecture halls as scheduled.
Issued by SmartSchedule AI Timetable Organiser.`;
  }

  // Draft AI notice for substitution
  async function handleDraftNotice(entry, candidate) {
    setDraftingPeriod(entry.period);
    setDraftLoading(true);
    setNoticeDraft('');
    setCopied(false);

    try {
      const res = await callAI('notice', {
        teacherName: selectedFaculty,
        substituteName: candidate.faculty,
        subject: entry.subject,
        day: targetDay,
        period: `Period ${entry.period}`,
      });

      const text = res.text || (typeof res === 'string' ? res : 'Class substitution notice drafted.');
      setNoticeDraft(text.trim());
      toast.success('AI Substitution Notice drafted!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to draft notice: ' + err.message);
    } finally {
      setDraftLoading(false);
    }
  }

  function handleCopyNotice() {
    if (!noticeDraft) return;
    navigator.clipboard.writeText(noticeDraft);
    setCopied(true);
    toast.success('Notice copied to clipboard!');
    setTimeout(() => setCopied(false), 2500);
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px]">
        <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-muted text-sm font-medium">Loading Substitute Finder Engine...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Banner */}
      <div className="bg-white rounded-panel p-6 sm:p-8 border border-line shadow-soft flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-50 text-orange-700 text-xs font-bold uppercase tracking-wider mb-2">
            <UserCheck className="w-3.5 h-3.5" />
            <span>{isTeacherMode ? 'Faculty Absence Portal' : 'Smart Substitute Finder'}</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-navy-900">
            {isTeacherMode ? 'Report Absence & Arrange Cover' : 'Automated Faculty Substitutions'}
          </h1>
          <p className="text-muted text-sm mt-1 max-w-2xl">
            {isTeacherMode 
              ? 'Mark your absence date. SmartSchedule evaluates faculty free in your slots and ranks the best subject-matching peers.'
              : 'Rank available substitute teachers based on subject expertise, class familiarity, and workload balance.'}
          </p>
        </div>

        {/* Date & Faculty Selectors */}
        <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3">
          {/* Multi-day toggle */}
          <label className="flex items-center gap-2 text-xs font-bold text-navy-900 bg-surface border border-line rounded-2xl px-3 py-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isMultiDay}
              onChange={e => setIsMultiDay(e.target.checked)}
              className="accent-orange-500 rounded cursor-pointer"
            />
            <span>Multi-Day Range</span>
          </label>

          {/* Date Picker (Start Date) */}
          <div className="bg-surface border border-line rounded-2xl px-3 py-2 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted shrink-0" />
            <span className="text-[10px] text-muted font-bold uppercase">{isMultiDay ? 'From:' : 'Date:'}</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                if (endDate < e.target.value) setEndDate(e.target.value);
              }}
              className="bg-transparent text-xs font-semibold text-navy-900 focus:outline-none cursor-pointer"
            />
          </div>

          {/* End Date Picker (if multi-day) */}
          {isMultiDay && (
            <div className="bg-surface border border-line rounded-2xl px-3 py-2 flex items-center gap-2 animate-in fade-in">
              <Calendar className="w-4 h-4 text-orange-500 shrink-0" />
              <span className="text-[10px] text-muted font-bold uppercase">To:</span>
              <input
                type="date"
                value={endDate}
                min={selectedDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-xs font-semibold text-navy-900 focus:outline-none cursor-pointer"
              />
            </div>
          )}

          {/* Faculty Selector (locked for teachers) */}
          <div className="bg-surface border border-line rounded-2xl px-3 py-2 flex items-center gap-2">
            <Users className="w-4 h-4 text-muted shrink-0" />
            {isTeacherMode ? (
              <span className="text-xs font-bold text-navy-900 px-1">
                {selectedFaculty} (You)
              </span>
            ) : (
              <select
                value={selectedFaculty}
                onChange={(e) => setSelectedFaculty(e.target.value)}
                className="bg-transparent text-xs font-bold text-navy-900 focus:outline-none cursor-pointer"
              >
                {timetable?.faculty?.map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Multi-Day Summary & Copyable Notice (T6) */}
      {isMultiDay && allAffectedClassesInRange.length > 0 && (
        <div className="bg-white rounded-panel p-6 border border-orange-200 shadow-soft space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-3 border-b border-line">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase bg-orange-100 text-orange-700 px-2.5 py-0.5 rounded-full">
                  Multi-Day Absence Summary
                </span>
                <span className="text-xs text-muted">
                  {datesInRange.length} days ({selectedDate} to {endDate})
                </span>
              </div>
              <h3 className="font-serif text-lg font-bold text-navy-900 mt-1">
                All Affected Classes & Assigned Covers ({allAffectedClassesInRange.length} Sessions)
              </h3>
            </div>

            <button
              onClick={() => {
                navigator.clipboard.writeText(getMultiDayNoticeText());
                toast.success('Multi-day leave notice copied to clipboard!', { icon: '📋' });
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-navy-900 hover:bg-navy-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              <Copy className="w-4 h-4 text-lime-300" />
              <span>Copy Notice to Clipboard</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-line text-[11px] text-muted uppercase font-bold">
                  <th className="py-2 px-3">Date & Day</th>
                  <th className="py-2 px-3">Period</th>
                  <th className="py-2 px-3">Class</th>
                  <th className="py-2 px-3">Subject</th>
                  <th className="py-2 px-3">Assigned Cover</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {allAffectedClassesInRange.map((ac, idx) => {
                  const sub = activeSubstitutions.find(s => 
                    String(s.period) === String(ac.period) && 
                    s.classId === ac.classId && 
                    s.date === ac.targetDate
                  );
                  return (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2.5 px-3 font-semibold text-navy-900">
                        {ac.targetDate} ({ac.targetDay})
                      </td>
                      <td className="py-2.5 px-3 font-bold text-orange-600">
                        Period {ac.period}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-navy-900">
                        {ac.classId}
                      </td>
                      <td className="py-2.5 px-3 text-muted">
                        {ac.subject}
                      </td>
                      <td className="py-2.5 px-3">
                        {sub ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                            <CheckCircle2 className="w-3 h-3 text-green-600" />
                            <span>Prof. {sub.substituteFaculty}</span>
                          </span>
                        ) : (
                          <span className="text-[11px] text-muted italic">Pending assignment</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Main Content: Affected Sessions for Date */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-serif text-xl font-bold text-navy-900">
              Affected Lectures on {targetDay} ({selectedDate})
            </h2>
            <p className="text-xs text-muted">
              {affectedClasses.length} {affectedClasses.length === 1 ? 'lecture' : 'lectures'} scheduled for {selectedFaculty}
            </p>
          </div>

          <span className="px-3 py-1 rounded-full text-xs font-bold bg-surface border border-line text-muted">
            Weekday: {targetDay}
          </span>
        </div>

        {affectedClasses.length === 0 ? (
          <div className="bg-white rounded-panel p-12 text-center border border-line shadow-soft">
            <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3" />
            <h3 className="font-serif text-lg font-bold text-navy-900">No Teaching Sessions</h3>
            <p className="text-muted text-xs mt-1 max-w-md mx-auto">
              Faculty member <span className="font-semibold text-navy-900">{selectedFaculty}</span> has no scheduled periods on {targetDay}.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {affectedClasses.map((entry) => {
              // Rank candidates for this specific slot
              const candidates = rankSubstitutes(rawEntries, selectedFaculty, targetDay, entry.period, entry);

              // Check if already assigned
              const existingSub = activeSubstitutions.find(s => 
                String(s.period) === String(entry.period) && 
                s.classId === entry.classId
              );

              return (
                <div key={entry.id} className="bg-white rounded-panel p-6 sm:p-7 border border-line shadow-soft space-y-6">
                  {/* Period Slot Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-line">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex flex-col items-center justify-center font-bold">
                        <span className="text-[10px] uppercase font-bold text-orange-600">Period</span>
                        <span className="text-base font-bold leading-none">{entry.period}</span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-serif text-lg font-bold text-navy-900">
                            {entry.subject}
                          </h3>
                          <span className="px-2 py-0.5 rounded-full bg-navy-50 text-navy-700 text-[11px] font-bold">
                            {entry.classId}
                          </span>
                        </div>
                        <p className="text-xs text-muted flex items-center gap-2 mt-0.5">
                          <span>Venue: {entry.venue || 'TBA'}</span>
                          <span>&bull;</span>
                          <span>Slot: {entry.periodLabel || `Period ${entry.period}`}</span>
                        </p>
                      </div>
                    </div>

                    {existingSub && (
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-50 border border-green-200 text-green-800 text-xs font-bold">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <span>Cover Assigned: {existingSub.substituteFaculty}</span>
                      </div>
                    )}
                  </div>

                  {/* Top 3 Substitute Candidates */}
                  <div>
                    <h4 className="text-xs font-bold text-muted uppercase tracking-wider mb-3">
                      Top Recommended Substitute Faculty (Weighted Score)
                    </h4>

                    {candidates.length === 0 ? (
                      <p className="text-xs text-muted italic">No free faculty members available in this period.</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {candidates.map((cand, idx) => {
                          const isAssigned = existingSub?.substituteFaculty === cand.faculty;

                          return (
                            <div 
                              key={cand.faculty} 
                              className={`rounded-2xl p-4 border transition-all flex flex-col justify-between ${
                                isAssigned 
                                  ? 'bg-green-50/60 border-green-300 ring-2 ring-green-600/20' 
                                  : 'bg-surface border-line hover:border-green-600/40'
                              }`}
                            >
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-navy-900 text-white flex items-center justify-center text-[10px] font-bold">
                                      #{idx + 1}
                                    </div>
                                    <span className="font-bold text-navy-900 text-sm">
                                      {cand.faculty}
                                    </span>
                                  </div>

                                  <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-800 font-bold text-[11px]">
                                    {cand.score} pts
                                  </span>
                                </div>

                                {/* Reasons Tags */}
                                <div className="space-y-1 mb-4">
                                  {cand.reasons.map((r, rIdx) => (
                                    <div key={rIdx} className="text-[11px] text-muted flex items-start gap-1">
                                      <span className="text-green-600 font-bold">&bull;</span>
                                      <span>{r}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Action Buttons */}
                              <div className="flex items-center gap-2 pt-2 border-t border-line/60">
                                <button
                                  onClick={() => handleAssign(entry, cand)}
                                  disabled={submitting}
                                  className={`flex-1 py-1.5 px-3 rounded-full text-xs font-bold transition-all active:scale-95 ${
                                    isAssigned 
                                      ? 'bg-green-600 text-white shadow-sm' 
                                      : 'bg-navy-900 hover:bg-navy-700 text-white'
                                  }`}
                                >
                                  {isAssigned ? 'ASSIGNED' : 'ASSIGN'}
                                </button>

                                <button
                                  onClick={() => handleDraftNotice(entry, cand)}
                                  title="Draft student circular with AI"
                                  className="p-1.5 rounded-full bg-white border border-line hover:border-green-600 text-muted hover:text-green-700 transition-all active:scale-95"
                                >
                                  <Sparkles className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* AI Notice Draft Box if active */}
                  {draftingPeriod === entry.period && (
                    <div className="mt-4 p-4 rounded-2xl bg-surface border border-line space-y-3 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Bot className="w-4 h-4 text-green-600" />
                          <span className="text-xs font-bold text-navy-900">AI Student Notice Circular</span>
                        </div>

                        <div className="flex items-center gap-2">
                          {noticeDraft && (
                            <button
                              onClick={handleCopyNotice}
                              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-line hover:border-navy-700 text-navy-900 text-xs font-semibold transition-all active:scale-95"
                            >
                              {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                              <span>{copied ? 'Copied' : 'Copy Notice'}</span>
                            </button>
                          )}
                          <button
                            onClick={() => setDraftingPeriod(null)}
                            className="text-xs text-muted hover:text-navy-900"
                          >
                            Dismiss
                          </button>
                        </div>
                      </div>

                      {draftLoading ? (
                        <div className="flex items-center gap-2 text-xs text-muted py-2">
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-green-600" />
                          <span>Drafting polite circular with AI...</span>
                        </div>
                      ) : (
                        <p className="text-xs text-navy-900 leading-relaxed bg-white p-3 rounded-xl border border-line">
                          {noticeDraft}
                        </p>
                      )}
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Active Substitutions for Date */}
      {activeSubstitutions.length > 0 ? (
        <div className="bg-white rounded-panel p-6 sm:p-8 border border-line shadow-soft">
          <h3 className="font-serif text-lg font-bold text-navy-900 mb-4">
            Active Substitutions Confirmed for {selectedDate}
          </h3>

          <div className="overflow-x-auto rounded-2xl border border-line">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface text-muted uppercase font-bold text-[11px] border-b border-line">
                <tr>
                  <th className="py-3 px-4">Period</th>
                  <th className="py-3 px-4">Class</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Absent Faculty</th>
                  <th className="py-3 px-4">Cover Faculty</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {activeSubstitutions.map((sub, i) => (
                  <tr key={i} className="hover:bg-surface/50">
                    <td className="py-3 px-4 font-bold text-navy-900">Period {sub.period}</td>
                    <td className="py-3 px-4 font-bold text-navy-900">{sub.classId}</td>
                    <td className="py-3 px-4 font-medium text-navy-900">{sub.subject}</td>
                    <td className="py-3 px-4 text-orange-700 font-semibold">{sub.absentFaculty}</td>
                    <td className="py-3 px-4 text-green-700 font-bold">{sub.substituteFaculty}</td>
                    <td className="py-3 px-4">
                      <span className="px-2.5 py-0.5 rounded-full bg-green-100 text-green-800 font-bold text-[10px]">
                        CONFIRMED
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-panel p-8 border border-line shadow-soft text-center space-y-2">
          <UserCheck className="w-8 h-8 text-muted/40 mx-auto mb-1" />
          <h4 className="font-serif font-bold text-navy-900 text-sm">
            No substitutions recorded for {selectedDate}
          </h4>
          <p className="text-xs text-muted max-w-sm mx-auto">
            All lectures for this date are currently running with their regular scheduled faculty.
          </p>
        </div>
      )}

    </div>
  );
}
