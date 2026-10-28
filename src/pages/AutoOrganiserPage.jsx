import React, { useState, useEffect } from 'react';
import { getCurrentTimetable, publishTimetable, getTimetableHistory, restoreTimetableVersion } from '../utils/timetableService';
import { findClashes, buildCompactCSV } from '../utils/insights';
import { autoResolve, checkMove, applyChanges } from '../utils/solver';
import { callAI } from '../utils/aiClient';
import { useTimetable } from '../context/TimetableContext';
import { 
  Wand2, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowRight, 
  RotateCcw, 
  Bot, 
  ShieldCheck, 
  RefreshCw,
  XCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AutoOrganiserPage() {
  const { refreshTimetable } = useTimetable();
  const [timetable, setTimetable] = useState(null);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);
  const [applying, setApplying] = useState(false);
  const [undoing, setUndoing] = useState(false);

  // Auto-resolve diff state
  const [resolvedChanges, setResolvedChanges] = useState(null);
  const [unresolvedClashes, setUnresolvedClashes] = useState([]);
  const [clashesBeforeCount, setClashesBeforeCount] = useState(0);
  const [clashesAfterCount, setClashesAfterCount] = useState(0);

  // Natural Language AI Command state
  const [aiCommand, setAiCommand] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiProposal, setAiProposal] = useState(null); // { entry, newDay, newPeriod, validation }

  // History tracking for Undo
  const [lastHistoryItem, setLastHistoryItem] = useState(null);

  useEffect(() => {
    loadTimetableData();
  }, []);

  async function loadTimetableData() {
    setLoading(true);
    const data = await getCurrentTimetable();
    setTimetable(data);

    if (data?.entries) {
      const { clashes } = findClashes(data.entries);
      setClashesBeforeCount(clashes.length);
    }

    // Check history for undo button
    const history = await getTimetableHistory();
    if (history && history.length > 0) {
      setLastHistoryItem(history[0]);
    } else {
      setLastHistoryItem(null);
    }

    setLoading(false);
  }

  // 1. Solve with SmartSchedule Auto-Resolve
  function handleAutoResolve() {
    if (!timetable?.entries) return;
    setResolving(true);

    try {
      const result = autoResolve(timetable.entries, timetable.periods, timetable.days);
      const newEntries = applyChanges(timetable.entries, result.changes);
      const afterClashes = findClashes(newEntries).clashes;

      setResolvedChanges(result.changes);
      setUnresolvedClashes(result.unresolved);
      setClashesAfterCount(afterClashes.length);

      if (result.changes.length === 0) {
        toast('No clash modifications needed or all clashes resolved!', { icon: '✨' });
      } else {
        toast.success(`Generated ${result.changes.length} optimal schedule changes!`);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to run auto-resolve: ' + err.message);
    } finally {
      setResolving(false);
    }
  }

  // Apply auto-resolve changes to current timetable with history backup
  async function handleApplyAutoResolve() {
    if (!resolvedChanges || !timetable) return;
    setApplying(true);

    try {
      const newEntries = applyChanges(timetable.entries, resolvedChanges);
      const updated = {
        ...timetable,
        entries: newEntries,
        updatedAt: new Date().toISOString(),
        updatedBy: 'SmartSchedule Auto-Organiser',
        fileName: timetable.fileName ? `AutoResolved_${timetable.fileName}` : 'AutoResolved_Timetable.xlsx',
      };

      await publishTimetable(updated);
      await refreshTimetable();
      toast.success('Clash-free timetable applied and saved live!');
      setResolvedChanges(null);
      await loadTimetableData();
    } catch (err) {
      console.error(err);
      toast.error('Error applying changes: ' + err.message);
    } finally {
      setApplying(false);
    }
  }

  // Undo and restore last history version
  async function handleUndo() {
    if (!lastHistoryItem) return;
    setUndoing(true);

    try {
      await restoreTimetableVersion(lastHistoryItem);
      await refreshTimetable();
      toast.success(`Restored previous timetable version (${lastHistoryItem.label || lastHistoryItem.wef})`);
      setResolvedChanges(null);
      setAiProposal(null);
      await loadTimetableData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to restore history: ' + err.message);
    } finally {
      setUndoing(false);
    }
  }

  // 2. Natural Language AI Command handling
  async function handleAskAiCommand(e) {
    e.preventDefault();
    if (!aiCommand.trim() || !timetable?.entries) return;

    setAiLoading(true);
    setAiProposal(null);

    try {
      const compactCsv = buildCompactCSV(timetable.entries);
      const payload = {
        command: aiCommand.trim(),
        context: {
          days: timetable.days || [],
          periods: timetable.periods || [],
          csv: compactCsv,
        },
      };

      const res = await callAI('command', payload);
      const data = res.data || (typeof res.text === 'string' ? JSON.parse(res.text) : res);

      if (!data || data.action === 'error') {
        toast.error(data?.message || 'AI could not interpret the schedule command');
        return;
      }

      // Find the matching entry in timetable
      const matching = timetable.entries.find(e => {
        const matchDay = !data.day || e.day?.toUpperCase() === data.day?.toUpperCase();
        const matchPeriod = !data.period || String(e.period) === String(data.period);
        const matchFac = !data.faculty || (e.faculty && e.faculty.toUpperCase().includes(data.faculty.toUpperCase()));
        const matchClass = !data.classId || (e.classId && e.classId.toUpperCase().includes(data.classId.toUpperCase()));
        const matchSubj = !data.subject || (e.subject && e.subject.toUpperCase().includes(data.subject.toUpperCase()));

        return matchDay && matchPeriod && (matchFac || matchClass || matchSubj);
      });

      if (!matching) {
        toast.error(`Could not locate a class matching "${aiCommand}" in the timetable.`);
        return;
      }

      const targetDay = data.newDay || matching.day;
      const targetPeriod = data.newPeriod || matching.period;

      // Validate move purely in code
      const validation = checkMove(timetable.entries, matching.id, targetDay, targetPeriod);

      setAiProposal({
        entry: matching,
        proposedDay: targetDay,
        proposedPeriod: targetPeriod,
        validation,
      });

      if (validation.ok) {
        toast.success('AI proposal validated: Slot is completely conflict-free!');
      } else {
        toast.error('AI proposal conflict detected: See reasons below.');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'AI command failed');
    } finally {
      setAiLoading(false);
    }
  }

  // Apply single AI proposal
  async function handleApplyAiProposal() {
    if (!aiProposal?.validation?.ok || !timetable?.entries) return;
    setApplying(true);

    try {
      const change = {
        entryId: aiProposal.entry.id,
        to: {
          day: aiProposal.proposedDay,
          period: aiProposal.proposedPeriod,
          venueKey: aiProposal.validation.chosenVenueKey,
          venue: aiProposal.validation.chosenVenue,
        },
      };

      const newEntries = applyChanges(timetable.entries, [change]);
      const updated = {
        ...timetable,
        entries: newEntries,
        updatedAt: new Date().toISOString(),
        updatedBy: 'AI Command Organiser',
      };

      await publishTimetable(updated);
      toast.success('Proposed schedule move applied successfully!');
      setAiProposal(null);
      setAiCommand('');
      await loadTimetableData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to apply move: ' + err.message);
    } finally {
      setApplying(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px]">
        <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
        <p className="mt-4 text-muted text-sm font-medium">Loading SmartSchedule Auto-Organiser...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header Banner */}
      <div className="bg-white rounded-panel p-6 sm:p-8 border border-line shadow-soft flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-bold uppercase tracking-wider mb-2">
            <Wand2 className="w-3.5 h-3.5" />
            <span>Autonomous Timetable Solver</span>
          </div>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-navy-900">
            Auto-Organiser &amp; Conflict Engine
          </h1>
          <p className="text-muted text-sm mt-1 max-w-2xl">
            Automatically resolve faculty &amp; room overlaps with pure constraint satisfaction, or command adjustments via natural language AI.
          </p>
        </div>

        {/* Undo History Button */}
        {lastHistoryItem && (
          <button
            onClick={handleUndo}
            disabled={undoing}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-line hover:border-navy-700 bg-surface hover:bg-white text-navy-900 text-xs font-semibold transition-all shadow-sm active:scale-95 disabled:opacity-50"
          >
            <RotateCcw className={`w-4 h-4 ${undoing ? 'animate-spin' : ''}`} />
            <span>Undo to {lastHistoryItem.label ? lastHistoryItem.label.slice(0, 20) : 'Previous Version'}</span>
          </button>
        )}
      </div>

      {/* Grid: Card 1 & Card 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* CARD 1: Fix All Clashes */}
        <div className="bg-white rounded-panel p-6 sm:p-8 border border-line shadow-soft flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center font-bold">
                  1
                </div>
                <div>
                  <h2 className="font-serif text-xl font-bold text-navy-900">Fix All Clashes</h2>
                  <p className="text-xs text-muted">Constraint Solver Algorithm</p>
                </div>
              </div>

              <span className={`px-3 py-1 rounded-full text-xs font-bold ${clashesBeforeCount > 0 ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'}`}>
                {clashesBeforeCount} active {clashesBeforeCount === 1 ? 'clash' : 'clashes'}
              </span>
            </div>

            <p className="text-sm text-muted mb-6 leading-relaxed">
              Analyzes overlapping faculty lectures and double-booked rooms. Automatically shifts conflicting classes to the nearest optimal free period while preserving combined cohorts and laboratory blocks.
            </p>

            {/* Clashes Donut Stats Comparison */}
            <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-surface border border-line/60 mb-6">
              <div className="text-center">
                <div className="relative inline-flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full border-4 border-orange-500/20 border-t-orange-500 flex items-center justify-center">
                    <span className="font-serif text-lg font-bold text-navy-900">{clashesBeforeCount}</span>
                  </div>
                </div>
                <p className="text-[11px] font-bold text-muted uppercase mt-2">Clashes Before</p>
              </div>

              <div className="text-center">
                <div className="relative inline-flex items-center justify-center">
                  <div className={`w-16 h-16 rounded-full border-4 ${resolvedChanges ? 'border-green-600 border-t-green-600' : 'border-line'} flex items-center justify-center`}>
                    <span className="font-serif text-lg font-bold text-green-700">
                      {resolvedChanges ? clashesAfterCount : '—'}
                    </span>
                  </div>
                </div>
                <p className="text-[11px] font-bold text-muted uppercase mt-2">Clashes After</p>
              </div>
            </div>
          </div>

          <div>
            <button
              onClick={handleAutoResolve}
              disabled={resolving || clashesBeforeCount === 0}
              className="w-full inline-flex items-center justify-center gap-2 py-3 px-6 rounded-full bg-navy-900 hover:bg-navy-700 text-white font-medium text-sm transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              {resolving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Computing Optimal Schedule...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 text-lime-300" />
                  <span>RESOLVE WITH SMARTSCHEDULE</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* CARD 2: Ask AI to Change the Timetable */}
        <div className="bg-white rounded-panel p-6 sm:p-8 border border-line shadow-soft flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-green-50 text-green-600 flex items-center justify-center font-bold">
                  2
                </div>
                <div>
                  <h2 className="font-serif text-xl font-bold text-navy-900">Ask AI to Change Timetable</h2>
                  <p className="text-xs text-muted">Natural Language Command Interpreter</p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-navy-50 text-navy-700">
                AI Proposes &bull; Code Validates
              </span>
            </div>

            <p className="text-sm text-muted mb-4 leading-relaxed">
              Describe schedule adjustments in plain English. The AI parses the request and our validation engine tests the proposal against all student and faculty constraints.
            </p>

            <form onSubmit={handleAskAiCommand} className="space-y-4 mb-4">
              <div className="relative">
                <textarea
                  value={aiCommand}
                  onChange={(e) => setAiCommand(e.target.value)}
                  placeholder='e.g. "Move KJS Wednesday period 5 to Thursday" or "Reschedule BCA-1A Math from Monday P1 to Period 4"'
                  rows={3}
                  className="w-full p-4 rounded-2xl bg-surface border border-line focus:outline-none focus:border-green-600 text-sm text-navy-900 placeholder:text-muted/60 transition-all resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={aiLoading || !aiCommand.trim()}
                className="w-full inline-flex items-center justify-center gap-2 py-3 px-6 rounded-full bg-green-600 hover:bg-green-700 text-white font-medium text-sm transition-all shadow-md active:scale-95 disabled:opacity-50"
              >
                {aiLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Analyzing Request &amp; Validating...</span>
                  </>
                ) : (
                  <>
                    <Bot className="w-4 h-4 text-lime-300" />
                    <span>Ask AI</span>
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="text-[11px] text-muted flex items-center gap-2 pt-2 border-t border-line/40">
            <ShieldCheck className="w-4 h-4 text-green-600 shrink-0" />
            <span>Strict guarantee: AI can never write illegal or overlapping schedule modifications directly.</span>
          </div>
        </div>

      </div>

      {/* PROPOSED DIFF TABLE: Auto-Resolve Solution */}
      {resolvedChanges && (
        <div className="bg-white rounded-panel p-6 sm:p-8 border border-line shadow-soft animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-bold uppercase mb-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Proposed Auto-Resolution ({resolvedChanges.length} Changes)</span>
              </div>
              <h3 className="font-serif text-xl font-bold text-navy-900">
                Schedule Modifications Diff
              </h3>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setResolvedChanges(null)}
                className="px-5 py-2.5 rounded-full border border-line hover:bg-surface text-muted text-xs font-semibold transition-all active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={handleApplyAutoResolve}
                disabled={applying || resolvedChanges.length === 0}
                className="px-6 py-2.5 rounded-full bg-green-600 hover:bg-green-700 text-white text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50 inline-flex items-center gap-2"
              >
                {applying ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>APPLY CHANGES LIVE</span>
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-2xl border border-line">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface text-muted uppercase font-bold text-[11px] tracking-wider border-b border-line">
                <tr>
                  <th className="py-3 px-4">Class</th>
                  <th className="py-3 px-4">Subject</th>
                  <th className="py-3 px-4">Faculty</th>
                  <th className="py-3 px-4">From Slot</th>
                  <th className="py-3 px-4"></th>
                  <th className="py-3 px-4">To Slot</th>
                  <th className="py-3 px-4">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {resolvedChanges.map((change, idx) => (
                  <tr key={idx} className="hover:bg-surface/50 transition-colors">
                    <td className="py-3 px-4 font-bold text-navy-900">{change.classId}</td>
                    <td className="py-3 px-4 font-medium text-navy-900">{change.subject}</td>
                    <td className="py-3 px-4 text-muted">{change.faculty || '—'}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-orange-50 text-orange-700 font-medium">
                        {change.from.day} P{change.from.period} ({change.from.venue || 'No Venue'})
                      </span>
                    </td>
                    <td className="py-3 px-2 text-center text-muted">
                      <ArrowRight className="w-3.5 h-3.5 inline" />
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-green-50 text-green-700 font-bold">
                        {change.to.day} P{change.to.period} ({change.to.venue || 'No Venue'})
                      </span>
                    </td>
                    <td className="py-3 px-4 text-muted max-w-xs truncate">{change.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Unresolved alerts if any */}
          {unresolvedClashes.length > 0 && (
            <div className="mt-4 p-4 rounded-2xl bg-orange-50/70 border border-orange-200 text-orange-900 text-xs flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">{unresolvedClashes.length} clashes could not be automatically shifted</span> because every slot across the week resulted in a faculty or room conflict.
              </div>
            </div>
          )}
        </div>
      )}

      {/* PROPOSED AI COMMAND RESULT MODAL / CARD */}
      {aiProposal && (
        <div className="bg-white rounded-panel p-6 sm:p-8 border border-line shadow-soft animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold ${aiProposal.validation.ok ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {aiProposal.validation.ok ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="font-serif text-xl font-bold text-navy-900">
                  {aiProposal.validation.ok ? 'Valid Move Proposed' : 'Invalid Move Detected'}
                </h3>
                <p className="text-xs text-muted">
                  Code validation check result for "{aiCommand}"
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setAiProposal(null)}
                className="px-5 py-2.5 rounded-full border border-line hover:bg-surface text-muted text-xs font-semibold transition-all active:scale-95"
              >
                Cancel
              </button>
              {aiProposal.validation.ok && (
                <button
                  onClick={handleApplyAiProposal}
                  disabled={applying}
                  className="px-6 py-2.5 rounded-full bg-green-600 hover:bg-green-700 text-white text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {applying ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  <span>APPLY THIS MOVE</span>
                </button>
              )}
            </div>
          </div>

          {/* Details Box */}
          <div className="p-4 rounded-2xl bg-surface border border-line/80 space-y-3 text-xs">
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <span className="text-muted block text-[10px] uppercase font-bold">Class &amp; Subject</span>
                <span className="font-bold text-navy-900">{aiProposal.entry.classId} — {aiProposal.entry.subject}</span>
              </div>
              <div>
                <span className="text-muted block text-[10px] uppercase font-bold">Faculty</span>
                <span className="text-navy-900">{aiProposal.entry.faculty || '—'}</span>
              </div>
              <div>
                <span className="text-muted block text-[10px] uppercase font-bold">Original Slot</span>
                <span className="px-2 py-0.5 rounded bg-orange-50 text-orange-700 font-semibold">
                  {aiProposal.entry.day} Period {aiProposal.entry.period}
                </span>
              </div>
              <ArrowRight className="w-4 h-4 text-muted" />
              <div>
                <span className="text-muted block text-[10px] uppercase font-bold">Proposed Slot</span>
                <span className="px-2 py-0.5 rounded bg-green-50 text-green-700 font-bold">
                  {aiProposal.proposedDay} Period {aiProposal.proposedPeriod}
                </span>
              </div>
            </div>

            {/* Validation Feedback */}
            {!aiProposal.validation.ok && (
              <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-900 space-y-1">
                <span className="font-bold block">Cannot apply this move due to conflicts:</span>
                <ul className="list-disc list-inside space-y-0.5 pl-1">
                  {aiProposal.validation.reasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
