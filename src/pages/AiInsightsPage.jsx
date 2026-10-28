import React, { useState, useEffect, useMemo } from 'react';
import { useTimetable } from '../context/TimetableContext';
import { 
  freeRooms, 
  freeFaculty, 
  buildCompactStats, 
  buildCompactCSV 
} from '../utils/insights';
import { callAI } from '../utils/aiClient';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';
import { 
  Sparkles, 
  Bot, 
  Send, 
  AlertTriangle, 
  CheckCircle2, 
  Layers, 
  Users, 
  MapPin, 
  BarChart3, 
  ShieldAlert, 
  RefreshCw 
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AiInsightsPage() {
  const {
    entries,
    days,
    periods,
    venues,
    faculty: allFaculty,
    loading,
    clashesResult,
    clusteredFaculty,
    roomAnalytics,
    qualityReport,
  } = useTimetable();

  const [activeTab, setActiveTab] = useState('clashes'); // 'clashes' | 'workload' | 'rooms' | 'quality'

  // AI Summary State
  const [aiSummary, setAiSummary] = useState('');
  const [generatingSummary, setGeneratingSummary] = useState(false);

  // AI Chat State
  const [chatMessages, setChatMessages] = useState([
    {
      role: 'assistant',
      text: 'Hello! I am SmartSchedule AI. Ask me anything about PCTE faculty schedules, room occupancy, lab slots, or lecture conflicts.',
    },
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // Free Finder State
  const [selectedDay, setSelectedDay] = useState('MONDAY');
  const [selectedPeriod, setSelectedPeriod] = useState(1);

  useEffect(() => {
    if (days?.length > 0) {
      setSelectedDay(days[0]);
    }
    if (periods?.length > 0) {
      setSelectedPeriod(periods[0].no || 1);
    }
  }, [days, periods]);

  // Clash-free calculation
  const totalEntries = entries.length;
  const clashedEntriesCount = clashesResult.clashes.reduce((sum, c) => sum + (c.count || 2), 0);
  const clashFreePercentage = totalEntries > 0 
    ? Math.max(0, Math.round(((totalEntries - clashedEntriesCount) / totalEntries) * 100)) 
    : 100;

  // Free Rooms & Free Faculty in selected slot
  const currentlyFreeRooms = useMemo(
    () => freeRooms(entries, selectedDay, selectedPeriod, venues),
    [entries, selectedDay, selectedPeriod, venues]
  );

  const currentlyFreeFaculty = useMemo(
    () => freeFaculty(entries, selectedDay, selectedPeriod, allFaculty),
    [entries, selectedDay, selectedPeriod, allFaculty]
  );

  // Overloaded count
  const overloadedCount = clusteredFaculty.filter(f => f.clusterLabel === 'Overloaded').length;

  // Handlers
  async function handleGenerateSummary() {
    try {
      setGeneratingSummary(true);
      const compactStats = buildCompactStats(entries, days, periods, clashesResult.clashes, clashesResult.combinedClasses, clusteredFaculty);

      const data = await callAI('summary', { stats: compactStats });
      setAiSummary(data.text);
      toast.success('AI Timetable Analysis Generated!');
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Error generating AI summary');
    } finally {
      setGeneratingSummary(false);
    }
  }

  async function handleSendChat(e) {
    e?.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const question = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', text: question }]);

    try {
      setChatLoading(true);
      const compactCsv = buildCompactCSV(entries);

      const json = await callAI('chat', {
        question,
        data: compactCsv,
      });

      setChatMessages(prev => [...prev, { role: 'assistant', text: json.text }]);
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to query AI');
      setChatMessages(prev => [
        ...prev,
        { role: 'assistant', text: `Sorry, I encountered an error: ${err.message}` },
      ]);
    } finally {
      setChatLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-3">
        <RefreshCw className="w-8 h-8 text-navy-700 animate-spin" />
        <span className="text-xs font-semibold text-muted">Computing Timetable Intelligence...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-panel p-6 border border-line shadow-soft flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-navy-50 text-navy-700 text-[11px] font-bold uppercase mb-2">
            <Sparkles className="w-3.5 h-3.5 text-orange-500" />
            <span>Phase 2 • AI &amp; Machine Learning Engine</span>
          </div>
          <h1 className="font-serif text-2xl font-bold text-navy-900">
            Timetable AI Insights &amp; Diagnostics
          </h1>
          <p className="text-xs text-muted mt-1">
            Autonomous clash detection, K-Means workload distribution, room heatmap analytics, and intelligent schedule Q&amp;A.
          </p>
        </div>

        <button
          onClick={handleGenerateSummary}
          disabled={generatingSummary}
          className="bg-navy-900 hover:bg-navy-700 text-white px-5 py-2.5 rounded-full text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50 self-start md:self-auto"
        >
          {generatingSummary ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Analyzing Timetable...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 text-lime-300" />
              <span>Generate AI Summary</span>
            </>
          )}
        </button>
      </div>

      {/* AI Summary Banner (if generated) */}
      {aiSummary && (
        <div className="bg-gradient-to-r from-navy-900 to-navy-800 text-white rounded-panel p-6 shadow-soft-lg relative overflow-hidden animate-fade-in border border-navy-700">
          <div className="flex items-center gap-2 text-lime-300 text-xs font-serif font-bold mb-2">
            <Sparkles className="w-4 h-4 fill-lime-300" />
            <span>AI Academic Executive Summary</span>
          </div>
          <div className="text-xs sm:text-sm text-white/90 whitespace-pre-line leading-relaxed font-sans">
            {aiSummary}
          </div>
        </div>
      )}

      {/* 5 Stat Cards + SVG Donut */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <div className="bg-white p-4 rounded-card border border-line shadow-soft">
          <span className="text-[10px] font-bold uppercase text-muted tracking-wider">Total Sessions</span>
          <div className="font-serif font-bold text-2xl text-navy-900 mt-1">{totalEntries}</div>
          <div className="text-[10px] text-muted mt-0.5">{days.length} active weekdays</div>
        </div>

        <div className="bg-white p-4 rounded-card border border-line shadow-soft">
          <span className="text-[10px] font-bold uppercase text-muted tracking-wider">Real Clashes</span>
          <div className={`font-serif font-bold text-2xl mt-1 ${clashesResult.clashes.length > 0 ? 'text-rose-600' : 'text-green-600'}`}>
            {clashesResult.clashes.length}
          </div>
          <div className="text-[10px] text-muted mt-0.5">Faculty / Room double-bookings</div>
        </div>

        <div className="bg-white p-4 rounded-card border border-line shadow-soft">
          <span className="text-[10px] font-bold uppercase text-muted tracking-wider">Combined Classes</span>
          <div className="font-serif font-bold text-2xl text-navy-900 mt-1">
            {clashesResult.combinedClasses.length}
          </div>
          <div className="text-[10px] text-green-700 font-semibold mt-0.5">Merged section lectures</div>
        </div>

        <div className="bg-white p-4 rounded-card border border-line shadow-soft">
          <span className="text-[10px] font-bold uppercase text-muted tracking-wider">Overloaded Staff</span>
          <div className={`font-serif font-bold text-2xl mt-1 ${overloadedCount > 0 ? 'text-orange-500' : 'text-green-600'}`}>
            {overloadedCount}
          </div>
          <div className="text-[10px] text-muted mt-0.5">K-Means peak cluster</div>
        </div>

        <div className="bg-white p-4 rounded-card border border-line shadow-soft">
          <span className="text-[10px] font-bold uppercase text-muted tracking-wider">Quality Issues</span>
          <div className={`font-serif font-bold text-2xl mt-1 ${qualityReport.missingFacultyCount + qualityReport.missingVenueCount > 0 ? 'text-amber-600' : 'text-green-600'}`}>
            {qualityReport.missingFacultyCount + qualityReport.missingVenueCount}
          </div>
          <div className="text-[10px] text-muted mt-0.5">Missing room or teacher</div>
        </div>

        {/* SVG Donut "Clash-Free %" */}
        <div className="bg-white p-4 rounded-card border border-line shadow-soft flex items-center justify-between col-span-2 sm:col-span-1">
          <div className="relative w-16 h-16 flex-shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-100"
                strokeWidth="4"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className={clashFreePercentage > 90 ? 'text-green-600' : 'text-orange-500'}
                strokeDasharray={`${clashFreePercentage}, 100`}
                strokeWidth="4"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-xs font-serif font-bold text-navy-900 leading-none">{clashFreePercentage}%</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[9px] uppercase font-bold text-muted block">Integrity</span>
            <span className="text-[11px] font-bold text-navy-900 block">Clash-Free</span>
          </div>
        </div>
      </div>

      {/* Main Tabs Console */}
      <div className="bg-white rounded-panel border border-line shadow-soft overflow-hidden">
        {/* Tab Headers */}
        <div className="flex border-b border-line bg-surface/60 overflow-x-auto">
          <button
            onClick={() => setActiveTab('clashes')}
            className={`px-5 py-3.5 text-xs font-bold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'clashes'
                ? 'border-navy-900 text-navy-900 bg-white'
                : 'border-transparent text-muted hover:text-navy-900'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            <span>Clashes &amp; Combined ({clashesResult.clashes.length} / {clashesResult.combinedClasses.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('workload')}
            className={`px-5 py-3.5 text-xs font-bold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'workload'
                ? 'border-navy-900 text-navy-900 bg-white'
                : 'border-transparent text-muted hover:text-navy-900'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-navy-700" />
            <span>Faculty Workload &amp; K-Means ML</span>
          </button>

          <button
            onClick={() => setActiveTab('rooms')}
            className={`px-5 py-3.5 text-xs font-bold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'rooms'
                ? 'border-navy-900 text-navy-900 bg-white'
                : 'border-transparent text-muted hover:text-navy-900'
            }`}
          >
            <MapPin className="w-4 h-4 text-green-600" />
            <span>Room Heatmap &amp; Free Slot Finder</span>
          </button>

          <button
            onClick={() => setActiveTab('quality')}
            className={`px-5 py-3.5 text-xs font-bold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap cursor-pointer ${
              activeTab === 'quality'
                ? 'border-navy-900 text-navy-900 bg-white'
                : 'border-transparent text-muted hover:text-navy-900'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-amber-500" />
            <span>Data Quality ({qualityReport.healthScore}%)</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6">
          {/* TAB 1: CLASHES */}
          {activeTab === 'clashes' && (
            <div className="space-y-6">
              {/* Clashes Table */}
              <div>
                <h3 className="font-serif font-bold text-base text-navy-900 mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  <span>Real Timetable Conflicts</span>
                </h3>
                {clashesResult.clashes.length === 0 ? (
                  <div className="bg-green-50/70 border border-green-200 rounded-xl p-6 text-center">
                    <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <h4 className="font-serif font-bold text-navy-900">Zero Conflicts Detected!</h4>
                    <p className="text-xs text-muted mt-0.5">
                      No professors or lecture halls are double-booked at the same time slot across PCTE.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-line rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-rose-50/60 text-rose-950 font-bold uppercase text-[10px]">
                        <tr>
                          <th className="py-2.5 px-3">Day &amp; Slot</th>
                          <th className="py-2.5 px-3">Clash Type</th>
                          <th className="py-2.5 px-3">Target (Faculty or Room)</th>
                          <th className="py-2.5 px-3">Conflicting Classes</th>
                          <th className="py-2.5 px-3">Details</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line/60">
                        {clashesResult.clashes.map((c, i) => (
                          <tr key={i} className="hover:bg-rose-50/20">
                            <td className="py-2.5 px-3 font-semibold text-navy-900">
                              {c.day} • {c.periodLabel}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full font-bold text-[10px] uppercase">
                                {c.type === 'faculty' ? 'Teacher Overlap' : 'Room Collision'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-bold text-navy-900">
                              {c.target}
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="flex gap-1 flex-wrap">
                                {c.classes.map(cls => (
                                  <span key={cls} className="bg-slate-100 text-navy-900 font-bold px-1.5 py-0.5 rounded text-[10px]">
                                    {cls}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-muted">
                              {c.description}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Combined Classes Table */}
              <div className="pt-4 border-t border-line">
                <h3 className="font-serif font-bold text-base text-navy-900 mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span>Legitimate Combined Lectures (Merged Sections)</span>
                </h3>
                <p className="text-xs text-muted mb-3">
                  Identified slots where multiple classes attend the same subject in the same room with the same faculty (e.g. combined BCA sections or common electives).
                </p>

                {clashesResult.combinedClasses.length === 0 ? (
                  <p className="text-xs text-muted">No combined section lectures in this timetable.</p>
                ) : (
                  <div className="overflow-x-auto border border-line rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-muted font-bold uppercase text-[10px]">
                        <tr>
                          <th className="py-2.5 px-3">Day &amp; Slot</th>
                          <th className="py-2.5 px-3">Subject</th>
                          <th className="py-2.5 px-3">Faculty</th>
                          <th className="py-2.5 px-3">Venue</th>
                          <th className="py-2.5 px-3">Combined Sections</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line/60">
                        {clashesResult.combinedClasses.map((cb, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 font-semibold text-navy-900">{cb.day} • {cb.periodLabel}</td>
                            <td className="py-2.5 px-3 font-bold text-navy-900">{cb.subject}</td>
                            <td className="py-2.5 px-3 text-slate-700">{cb.faculty}</td>
                            <td className="py-2.5 px-3 font-bold text-orange-600">{cb.venue}</td>
                            <td className="py-2.5 px-3">
                              <span className="font-semibold text-green-700 bg-green-50 px-2 py-0.5 rounded-full text-[11px]">
                                {cb.classes.join(', ')}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: WORKLOAD & K-MEANS */}
          {activeTab === 'workload' && (
            <div className="space-y-6">
              {/* Legend */}
              <div className="flex flex-wrap items-center justify-between gap-4 p-3.5 bg-surface rounded-2xl border border-line">
                <span className="text-xs font-bold text-navy-900">K-Means ML Clustering Legend:</span>
                <div className="flex items-center gap-6 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#0A44A8]" />
                    <span className="font-semibold text-navy-900">Under-loaded</span>
                    <span className="text-[10px] text-muted">(&lt; 10 periods)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#0E7C5A]" />
                    <span className="font-semibold text-green-800">Balanced</span>
                    <span className="text-[10px] text-muted">(10-18 periods)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#F26B21]" />
                    <span className="font-semibold text-orange-600">Overloaded</span>
                    <span className="text-[10px] text-muted">(&gt; 18 periods / high lab)</span>
                  </div>
                </div>
              </div>

              {/* Bar Chart */}
              <div className="h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={clusteredFaculty} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                    <XAxis 
                      dataKey="faculty" 
                      angle={-30} 
                      textAnchor="end" 
                      tick={{ fontSize: 10, fill: '#5B6B8A' }} 
                      interval={0}
                    />
                    <YAxis tick={{ fontSize: 10, fill: '#5B6B8A' }} />
                    <Tooltip 
                      formatter={(val, name, item) => [`${val} periods`, `Cluster: ${item.payload.clusterLabel}`]}
                      contentStyle={{ borderRadius: '12px', border: '1px solid #E3E9F5', fontSize: '11px' }}
                    />
                    <Bar dataKey="weeklyPeriods" radius={[6, 6, 0, 0]}>
                      {clusteredFaculty.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.clusterColor} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Workload Table */}
              <div className="overflow-x-auto border border-line rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-muted font-bold uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Faculty Code</th>
                      <th className="py-2.5 px-3">Weekly Periods</th>
                      <th className="py-2.5 px-3">Lab Sessions</th>
                      <th className="py-2.5 px-3">Batches</th>
                      <th className="py-2.5 px-3">Days Active</th>
                      <th className="py-2.5 px-3">ML Cluster</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/60">
                    {clusteredFaculty.map(f => (
                      <tr key={f.faculty} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-bold text-navy-900">{f.faculty}</td>
                        <td className="py-2.5 px-3 font-semibold">{f.weeklyPeriods} slots</td>
                        <td className="py-2.5 px-3 text-green-700 font-bold">{f.labPeriods}</td>
                        <td className="py-2.5 px-3 text-muted">{f.distinctClasses} batches ({f.classesList.join(', ')})</td>
                        <td className="py-2.5 px-3">{f.daysActive} days</td>
                        <td className="py-2.5 px-3">
                          <span 
                            className="px-2 py-0.5 rounded-full font-bold text-[10px] text-white"
                            style={{ backgroundColor: f.clusterColor }}
                          >
                            {f.clusterLabel}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: ROOMS HEATMAP & FREE FINDER */}
          {activeTab === 'rooms' && (
            <div className="space-y-6">
              {/* Day x Period Occupancy Heatmap */}
              <div>
                <h3 className="font-serif font-bold text-base text-navy-900 mb-2 flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-green-600" />
                  <span>Day &times; Period Room Occupancy Heatmap</span>
                </h3>
                <p className="text-xs text-muted mb-3">
                  Shows number of simultaneous rooms utilized across campus in each period.
                </p>

                <div className="overflow-x-auto border border-line rounded-2xl p-3 bg-slate-50/40">
                  <div className="min-w-[600px] grid gap-2">
                    {/* Header Row */}
                    <div className="grid grid-cols-8 gap-2 text-center text-[10px] font-bold uppercase text-muted">
                      <div className="text-left pl-2">Day</div>
                      {periods.map(p => (
                        <div key={p.no}>P{p.label || p.no}</div>
                      ))}
                    </div>

                    {/* Day Rows */}
                    {days.map(d => (
                      <div key={d} className="grid grid-cols-8 gap-2 items-center">
                        <div className="text-xs font-bold text-navy-900 pl-2">{d}</div>
                        {periods.map(p => {
                          const cell = roomAnalytics.occupancyMatrix[d]?.[p.no];
                          const count = cell?.count || 0;
                          
                          // Color saturation based on occupancy
                          let bg = 'bg-slate-100 text-slate-400';
                          if (count === 1) bg = 'bg-blue-100 text-blue-800';
                          else if (count === 2) bg = 'bg-blue-200 text-blue-900';
                          else if (count >= 3) bg = 'bg-navy-700 text-white font-bold';

                          return (
                            <div
                              key={p.no}
                              title={`${d} P${p.no}: ${count} rooms occupied`}
                              className={`h-10 rounded-xl flex items-center justify-center text-xs transition-all ${bg}`}
                            >
                              {count}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Free Slot Interactive Finder */}
              <div className="pt-4 border-t border-line grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Free Room Finder */}
                <div className="bg-surface p-5 rounded-2xl border border-line space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-serif font-bold text-sm text-navy-900 flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-orange-500" />
                      <span>Free Room &amp; Lab Finder</span>
                    </h4>
                    <span className="text-[11px] bg-green-100 text-green-800 font-bold px-2 py-0.5 rounded-full">
                      {currentlyFreeRooms.length} Available
                    </span>
                  </div>

                  {/* Selectors */}
                  <div className="flex gap-3 text-xs">
                    <select
                      value={selectedDay}
                      onChange={(e) => setSelectedDay(e.target.value)}
                      className="bg-white border border-line rounded-lg px-3 py-1.5 font-bold text-navy-900"
                    >
                      {days.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>

                    <select
                      value={selectedPeriod}
                      onChange={(e) => setSelectedPeriod(Number(e.target.value))}
                      className="bg-white border border-line rounded-lg px-3 py-1.5 font-bold text-navy-900"
                    >
                      {periods.map(p => (
                        <option key={p.no} value={p.no}>Period {p.label || p.no} ({p.start}-{p.end})</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                    {currentlyFreeRooms.map(r => (
                      <span key={r} className="bg-white border border-line text-navy-900 font-bold px-2.5 py-1 rounded-lg text-xs shadow-sm">
                        {r}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Right: Free Faculty Finder */}
                <div className="bg-surface p-5 rounded-2xl border border-line space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-serif font-bold text-sm text-navy-900 flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-navy-700" />
                      <span>Free Faculty Available for Substitution</span>
                    </h4>
                    <span className="text-[11px] bg-navy-100 text-navy-800 font-bold px-2 py-0.5 rounded-full">
                      {currentlyFreeFaculty.length} Free
                    </span>
                  </div>

                  <p className="text-[11px] text-muted">
                    Teachers with no lecture scheduled on <strong>{selectedDay}</strong> during <strong>Period {selectedPeriod}</strong>:
                  </p>

                  <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                    {currentlyFreeFaculty.map(f => (
                      <span key={f} className="bg-white border border-line text-navy-900 font-semibold px-2.5 py-1 rounded-lg text-xs shadow-sm">
                        Prof. {f}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: DATA QUALITY */}
          {activeTab === 'quality' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-line">
                <div>
                  <h3 className="font-serif font-bold text-base text-navy-900">
                    Timetable Integrity &amp; Hygiene Audit
                  </h3>
                  <p className="text-xs text-muted">
                    Validates that every slot has assigned teaching personnel and allocated room numbers.
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-serif font-bold text-green-700">{qualityReport.healthScore}%</span>
                  <span className="text-[10px] text-muted uppercase font-bold block">Health Score</span>
                </div>
              </div>

              {qualityReport.missingFacultyCount === 0 && qualityReport.missingVenueCount === 0 ? (
                <div className="bg-green-50 rounded-xl p-8 text-center border border-green-200">
                  <CheckCircle2 className="w-10 h-10 text-green-600 mx-auto mb-2" />
                  <h4 className="font-serif font-bold text-navy-900">Complete Data Quality!</h4>
                  <p className="text-xs text-muted mt-1">
                    All {qualityReport.totalEntries} sessions have verified faculty codes and room keys.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {qualityReport.missingFaculty.length > 0 && (
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs">
                      <span className="font-bold text-amber-900 block mb-1">
                        Missing Faculty ({qualityReport.missingFaculty.length} slots):
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {qualityReport.missingFaculty.slice(0, 10).map((m, i) => (
                          <span key={i} className="bg-white px-2 py-0.5 rounded text-[10px] font-mono border">
                            {m.day} P{m.period} ({m.classId} - {m.subject})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {qualityReport.missingVenue.length > 0 && (
                    <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs">
                      <span className="font-bold text-amber-900 block mb-1">
                        Missing Venue ({qualityReport.missingVenue.length} slots):
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {qualityReport.missingVenue.slice(0, 10).map((m, i) => (
                          <span key={i} className="bg-white px-2 py-0.5 rounded text-[10px] font-mono border">
                            {m.day} P{m.period} ({m.classId} - {m.subject})
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* "Ask your timetable" Chat Box */}
      <div className="bg-white rounded-panel p-6 border border-line shadow-soft space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-orange-500 text-white flex items-center justify-center shadow-sm">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-serif font-bold text-base text-navy-900">
              Ask Your Timetable (AI Assistant)
            </h3>
            <p className="text-[11px] text-muted">
              Powered by Google Gemini / LLM serverless reasoning engine with full CSV timetable context.
            </p>
          </div>
        </div>

        {/* Chat History Box */}
        <div className="bg-surface rounded-2xl p-4 border border-line h-64 overflow-y-auto space-y-3">
          {chatMessages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-navy-900 text-white rounded-br-none shadow-sm'
                    : 'bg-white text-navy-900 rounded-bl-none border border-line shadow-sm'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}

          {chatLoading && (
            <div className="flex justify-start">
              <div className="bg-white text-muted rounded-2xl p-3 text-xs border border-line flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-orange-500" />
                <span>Consulting master timetable...</span>
              </div>
            </div>
          )}
        </div>

        {/* Quick Question Chips */}
        <div className="flex flex-wrap gap-2 text-[11px]">
          <button
            type="button"
            onClick={() => setChatInput('Which room is free for BCA-1E on Friday Period 3?')}
            className="bg-slate-100 hover:bg-slate-200 text-navy-900 px-3 py-1 rounded-full transition-colors cursor-pointer"
          >
            &quot;Where is Lab free on Friday?&quot;
          </button>
          <button
            type="button"
            onClick={() => setChatInput('How many total periods does Dr. Sharma teach across the week?')}
            className="bg-slate-100 hover:bg-slate-200 text-navy-900 px-3 py-1 rounded-full transition-colors cursor-pointer"
          >
            &quot;How many periods does Dr. Sharma teach?&quot;
          </button>
          <button
            type="button"
            onClick={() => setChatInput('List all laboratory sessions scheduled on Monday.')}
            className="bg-slate-100 hover:bg-slate-200 text-navy-900 px-3 py-1 rounded-full transition-colors cursor-pointer"
          >
            &quot;List all Monday lab sessions&quot;
          </button>
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSendChat} className="flex gap-2">
          <input
            type="text"
            placeholder="Ask anything about rooms, teachers, clashes, or class timings..."
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            className="flex-1 bg-surface border border-line rounded-full px-4 py-2.5 text-xs text-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-700/20 focus:bg-white"
          />
          <button
            type="submit"
            disabled={chatLoading || !chatInput.trim()}
            className="bg-navy-900 hover:bg-navy-700 text-white px-5 py-2.5 rounded-full text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Ask</span>
          </button>
        </form>
      </div>
    </div>
  );
}
