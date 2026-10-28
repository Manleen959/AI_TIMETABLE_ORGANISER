import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTimetable } from '../context/TimetableContext';
import useMyEntries, { normalizeFaculty, normalizeClassId } from '../hooks/useMyEntries';
import { 
  createSwapRequest, 
  getSwapsForFaculty, 
  getAllSwaps, 
  updateSwapStatus 
} from '../utils/featureService';
import { assignSubstitution } from '../utils/substitutionService';
import { 
  ArrowLeftRight, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle, 
  ShieldCheck, 
  Users, 
  Calendar,
  Filter
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function SwapsPage() {
  const { user, profile, role } = useAuth();
  const { entries: allTimetableEntries, faculty: allFacultyList, periods } = useTimetable();
  const { entries: myTeachingEntries } = useMyEntries();

  const [swaps, setSwaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [showRequestModal, setShowRequestModal] = useState(false);

  // New Swap Request form
  const [swapDate, setSwapDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedOwnSlotId, setSelectedOwnSlotId] = useState('');
  const [targetFacultyCode, setTargetFacultyCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const swapDay = useMemo(() => {
    const d = new Date(swapDate);
    const dayMap = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    return dayMap[d.getDay()] || 'MONDAY';
  }, [swapDate]);

  // Own teaching periods on this day
  const mySlotsOnDay = useMemo(() => {
    return myTeachingEntries.filter(e => e.day === swapDay);
  }, [myTeachingEntries, swapDay]);

  // List of other teachers
  const otherFacultyList = useMemo(() => {
    const myCode = normalizeFaculty(profile?.facultyCode);
    const list = (allFacultyList && allFacultyList.length > 0)
      ? allFacultyList
      : ['PRT', 'SMB', 'PRK', 'RNJ', 'HSD', 'VS'];
    return list.filter(f => normalizeFaculty(f) !== myCode);
  }, [allFacultyList, profile?.facultyCode]);

  useEffect(() => {
    loadSwaps();
  }, [profile?.facultyCode, role]);

  async function loadSwaps() {
    setLoading(true);
    try {
      if (role === 'admin') {
        const list = await getAllSwaps();
        setSwaps(list);
      } else {
        const list = await getSwapsForFaculty(profile?.facultyCode);
        setSwaps(list);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load swap requests');
    } finally {
      setLoading(false);
    }
  }

  // Check target teacher availability for selected slot
  const selectedSlot = useMemo(() => {
    return mySlotsOnDay.find(s => s.id === selectedOwnSlotId);
  }, [mySlotsOnDay, selectedOwnSlotId]);

  const targetTeacherIsFree = useMemo(() => {
    if (!selectedSlot || !targetFacultyCode) return true;
    const targetNorm = normalizeFaculty(targetFacultyCode);
    // Find if target faculty has a class in that same period & day
    const clash = allTimetableEntries.find(
      e => e.day === swapDay && 
           Number(e.period) === Number(selectedSlot.period) && 
           normalizeFaculty(e.faculty) === targetNorm
    );
    return !clash;
  }, [selectedSlot, targetFacultyCode, allTimetableEntries, swapDay]);

  async function handleCreateSwap(e) {
    e.preventDefault();
    if (!selectedSlot) {
      toast.error('Please select one of your teaching periods to swap');
      return;
    }
    if (!targetFacultyCode) {
      toast.error('Please choose a colleague teacher');
      return;
    }
    if (!targetTeacherIsFree) {
      toast.error(`Prof. ${targetFacultyCode} already has a lecture in Period ${selectedSlot.period}!`);
      return;
    }

    setSubmitting(true);
    try {
      await createSwapRequest({
        fromFaculty: profile?.facultyCode || 'ME',
        toFaculty: targetFacultyCode,
        day: swapDay,
        period: selectedSlot.period,
        date: swapDate,
        classId: selectedSlot.classId,
        subject: selectedSlot.subject,
      });

      toast.success(`Swap request sent to Prof. ${targetFacultyCode}!`, { icon: '🤝' });
      setShowRequestModal(false);
      setSelectedOwnSlotId('');
      setTargetFacultyCode('');
      await loadSwaps();
    } catch (err) {
      console.error(err);
      toast.error('Failed to create swap request');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAcceptSwap(swap) {
    try {
      await updateSwapStatus(swap.id, 'accepted');

      // Create substitution record for that date for both
      await assignSubstitution({
        date: swap.date,
        absentFaculty: swap.fromFaculty,
        substituteFaculty: swap.toFaculty,
        period: swap.period,
        classId: swap.classId,
        subject: swap.subject || 'Swapped Lecture',
        reason: `Mutual Period Swap with Prof. ${swap.fromFaculty}`,
      });

      toast.success('Swap request accepted & substitution registered!', { icon: '✅' });
      await loadSwaps();
    } catch (err) {
      console.error(err);
      toast.error('Failed to accept swap');
    }
  }

  async function handleDeclineSwap(swap) {
    try {
      await updateSwapStatus(swap.id, 'declined');
      toast.success('Swap request declined');
      await loadSwaps();
    } catch (err) {
      console.error(err);
      toast.error('Failed to decline swap');
    }
  }

  // Filtered swaps
  const filteredSwaps = useMemo(() => {
    return swaps.filter(s => {
      if (filterStatus === 'all') return true;
      return s.status === filterStatus;
    });
  }, [swaps, filterStatus]);

  const myFacultyNorm = normalizeFaculty(profile?.facultyCode);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-panel p-6 border border-line shadow-soft flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">
            <ArrowLeftRight className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-serif text-2xl font-bold text-navy-900">
              {role === 'admin' ? 'Faculty Lecture Swaps (Admin Override)' : 'Mutual Lecture Swaps'}
            </h1>
            <p className="text-xs text-muted">
              {role === 'admin' 
                ? 'Review and override teacher mutual lecture exchange requests'
                : 'Exchange scheduled teaching periods with available faculty colleagues'}
            </p>
          </div>
        </div>

        {role !== 'admin' && (
          <button
            onClick={() => setShowRequestModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-navy-900 hover:bg-navy-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Request Swap</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'all', label: 'All Requests', count: swaps.length },
          { id: 'pending', label: 'Pending', count: swaps.filter(s => s.status === 'pending').length },
          { id: 'accepted', label: 'Accepted', count: swaps.filter(s => s.status === 'accepted').length },
          { id: 'declined', label: 'Declined', count: swaps.filter(s => s.status === 'declined').length },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilterStatus(tab.id)}
            className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${
              filterStatus === tab.id
                ? 'bg-navy-900 text-white shadow-sm'
                : 'bg-white text-muted hover:text-navy-900 border border-line'
            }`}
          >
            <span>{tab.label}</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              filterStatus === tab.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-muted'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-card p-5 border border-line animate-pulse h-20" />
          ))}
        </div>
      ) : filteredSwaps.length === 0 ? (
        <div className="bg-white rounded-panel p-12 border border-line text-center shadow-soft">
          <div className="w-14 h-14 rounded-full bg-slate-100 text-muted flex items-center justify-center mx-auto mb-3">
            <ArrowLeftRight className="w-7 h-7 text-purple-600" />
          </div>
          <h3 className="font-serif text-lg font-bold text-navy-900">No Swap Requests Found</h3>
          <p className="text-xs text-muted max-w-sm mx-auto mt-1 mb-4">
            No mutual swap requests under this filter. Initiate a period exchange with a free colleague.
          </p>
          {role !== 'admin' && (
            <button
              onClick={() => setShowRequestModal(true)}
              className="px-4 py-2 rounded-full bg-navy-900 text-white text-xs font-bold cursor-pointer hover:bg-navy-700"
            >
              + Initiate Swap Request
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredSwaps.map(swap => {
            const isIncoming = normalizeFaculty(swap.toFaculty) === myFacultyNorm;
            const isOutgoing = normalizeFaculty(swap.fromFaculty) === myFacultyNorm;

            return (
              <div
                key={swap.id}
                className="bg-white rounded-card p-5 border border-line shadow-soft flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-50 text-purple-700">
                      Period {swap.period} • {swap.day}
                    </span>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-slate-100 text-navy-900">
                      Class: {swap.classId}
                    </span>
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      swap.status === 'accepted'
                        ? 'bg-green-100 text-green-700'
                        : swap.status === 'declined'
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {swap.status}
                    </span>
                  </div>

                  <div className="text-xs font-bold text-navy-900 pt-1">
                    Prof. <strong>{swap.fromFaculty}</strong> ➔ Prof. <strong>{swap.toFaculty}</strong>
                  </div>

                  <div className="text-[11px] text-muted">
                    Subject: <strong>{swap.subject || 'Lecture'}</strong> • Date: <strong>{swap.date}</strong>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* If incoming and pending, or admin */}
                  {(isIncoming && swap.status === 'pending') || role === 'admin' ? (
                    <>
                      <button
                        onClick={() => handleAcceptSwap(swap)}
                        className="flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-green-600 hover:bg-green-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>
                      <button
                        onClick={() => handleDeclineSwap(swap)}
                        className="flex items-center gap-1 px-3.5 py-1.5 rounded-full bg-slate-100 hover:bg-rose-50 text-muted hover:text-rose-600 text-xs font-bold transition-all cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Decline</span>
                      </button>
                    </>
                  ) : (
                    <div className="text-xs font-semibold text-muted">
                      {isOutgoing ? 'Awaiting colleague response' : 'Resolved'}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Swap Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 bg-navy-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-panel max-w-md w-full p-6 shadow-2xl border border-line space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-line">
              <h3 className="font-serif text-lg font-bold text-navy-900">
                New Period Swap Request
              </h3>
              <button
                onClick={() => setShowRequestModal(false)}
                className="text-muted hover:text-navy-900 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSwap} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted mb-1">
                  Swap Date
                </label>
                <input
                  type="date"
                  required
                  value={swapDate}
                  onChange={e => {
                    setSwapDate(e.target.value);
                    setSelectedOwnSlotId('');
                  }}
                  className="w-full bg-slate-50 border border-line rounded-xl px-3 py-2 text-xs font-semibold text-navy-900"
                />
                <div className="text-[10px] text-muted mt-0.5">
                  Day: <strong>{swapDay}</strong>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted mb-1">
                  Select Your Lecture to Swap
                </label>
                {mySlotsOnDay.length === 0 ? (
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-line text-xs text-muted">
                    No classes scheduled for you on {swapDay}
                  </div>
                ) : (
                  <select
                    value={selectedOwnSlotId}
                    onChange={e => setSelectedOwnSlotId(e.target.value)}
                    className="w-full bg-slate-50 border border-line rounded-xl px-3 py-2 text-xs font-semibold text-navy-900"
                  >
                    <option value="">-- Choose your slot --</option>
                    {mySlotsOnDay.map(s => (
                      <option key={s.id} value={s.id}>
                        Period {s.period} ({s.start}-{s.end}) • {s.classId} • {s.subject}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted mb-1">
                  Request Colleague Teacher
                </label>
                <select
                  value={targetFacultyCode}
                  onChange={e => setTargetFacultyCode(e.target.value)}
                  className="w-full bg-slate-50 border border-line rounded-xl px-3 py-2 text-xs font-semibold text-navy-900"
                >
                  <option value="">-- Select Faculty Member --</option>
                  {otherFacultyList.map(f => (
                    <option key={f} value={f}>Prof. {f}</option>
                  ))}
                </select>
              </div>

              {/* Clash / Conflict verification message */}
              {selectedSlot && targetFacultyCode && (
                <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  targetTeacherIsFree
                    ? 'bg-green-50 border-green-200 text-green-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}>
                  {targetTeacherIsFree ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                      <span>Verified: Prof. {targetFacultyCode} is completely free in Period {selectedSlot.period}!</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                      <span>Clash Detected: Prof. {targetFacultyCode} is busy teaching another class in Period {selectedSlot.period}.</span>
                    </>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowRequestModal(false)}
                  className="px-4 py-2 rounded-full bg-slate-100 text-muted hover:bg-slate-200 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting || !selectedSlot || !targetFacultyCode || !targetTeacherIsFree}
                  className="px-5 py-2 rounded-full bg-navy-900 text-white hover:bg-navy-700 text-xs font-bold cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Sending...' : 'Send Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
