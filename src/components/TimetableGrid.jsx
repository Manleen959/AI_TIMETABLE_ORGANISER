import React from 'react';
import { Clock, MapPin, User, Sparkles, CalendarPlus } from 'lucide-react';

// Curated harmonious pastel palette for consistent subject colors everywhere
export const SUBJECT_PALETTE = [
  { bg: 'bg-blue-50/90', border: 'border-blue-200', text: 'text-blue-900', swatch: '#3B82F6' },
  { bg: 'bg-emerald-50/90', border: 'border-emerald-200', text: 'text-emerald-900', swatch: '#10B981' },
  { bg: 'bg-amber-50/90', border: 'border-amber-200', text: 'text-amber-900', swatch: '#F59E0B' },
  { bg: 'bg-purple-50/90', border: 'border-purple-200', text: 'text-purple-900', swatch: '#8B5CF6' },
  { bg: 'bg-rose-50/90', border: 'border-rose-200', text: 'text-rose-900', swatch: '#F43F5E' },
  { bg: 'bg-cyan-50/90', border: 'border-cyan-200', text: 'text-cyan-900', swatch: '#06B6D4' },
  { bg: 'bg-lime-50/90', border: 'border-lime-200', text: 'text-lime-900', swatch: '#84CC16' },
  { bg: 'bg-indigo-50/90', border: 'border-indigo-200', text: 'text-indigo-900', swatch: '#6366F1' },
  { bg: 'bg-orange-50/90', border: 'border-orange-200', text: 'text-orange-900', swatch: '#F97316' },
  { bg: 'bg-teal-50/90', border: 'border-teal-200', text: 'text-teal-900', swatch: '#14B8A6' },
];

export function getSubjectColorStyle(subjectName) {
  if (!subjectName) return SUBJECT_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < subjectName.length; i++) {
    hash = subjectName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % SUBJECT_PALETTE.length;
  return SUBJECT_PALETTE[index];
}

export default function TimetableGrid({ 
  entries = [], 
  periods = [], 
  days = [], 
  extraClasses = [],
  showClassInCell = false,
  highlightFree = true,
}) {
  const dayNames = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  const todayIndex = new Date().getDay();
  const currentWeekday = dayNames[todayIndex];

  function hasTimeGap(p1, p2) {
    if (!p1?.end || !p2?.start) return false;
    const [h1, m1] = p1.end.split(':').map(Number);
    const [h2, m2] = p2.start.split(':').map(Number);
    const endMinutes = h1 * 60 + m1;
    const startMinutes = h2 * 60 + m2;
    return (startMinutes - endMinutes) >= 15;
  }

  const gapsAfterPeriod = {};
  for (let i = 0; i < periods.length - 1; i++) {
    if (hasTimeGap(periods[i], periods[i + 1])) {
      gapsAfterPeriod[periods[i].no] = true;
    }
  }

  if (!days || days.length === 0 || !periods || periods.length === 0) {
    return (
      <div className="bg-white rounded-card p-12 text-center border border-line shadow-soft">
        <Clock className="w-12 h-12 text-muted/40 mx-auto mb-3" />
        <h3 className="text-lg font-serif font-bold text-navy-900">No Timetable Data Found</h3>
        <p className="text-sm text-muted mt-1 max-w-md mx-auto">
          Please upload a valid timetable Excel spreadsheet or select a class / faculty with scheduled sessions.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto pb-4">
      <div className="min-w-[850px] inline-block w-full align-middle">
        <table className="w-full border-separate border-spacing-2">
          {/* Table Header: Days / Periods */}
          <thead>
            <tr>
              <th className="bg-white/80 backdrop-blur-sm border border-line rounded-2xl px-4 py-3 text-left font-serif font-bold text-xs uppercase tracking-wider text-muted w-28 shadow-sm">
                Day / Time
              </th>
              {periods.map((period, idx) => {
                const hasGap = gapsAfterPeriod[period.no];
                return (
                  <React.Fragment key={period.no || idx}>
                    <th className="bg-white border border-line rounded-2xl px-3 py-2.5 text-center shadow-sm">
                      <div className="text-xs font-serif font-bold text-navy-900">
                        Period {period.label || period.no}
                      </div>
                      <div className="text-[11px] font-sans font-medium text-muted flex items-center justify-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-navy-700/60" />
                        <span>{period.start} - {period.end}</span>
                      </div>
                    </th>
                    {hasGap && (
                      <th className="bg-amber-50/70 border border-amber-200/60 rounded-2xl px-2 py-2 text-center shadow-sm w-12 select-none">
                        <span className="text-[10px] font-bold text-amber-800 uppercase tracking-widest writing-mode-vertical">
                          Break
                        </span>
                      </th>
                    )}
                  </React.Fragment>
                );
              })}
            </tr>
          </thead>

          {/* Table Body: Days rows */}
          <tbody>
            {days.map((day) => {
              const isToday = day.toUpperCase() === currentWeekday;

              return (
                <tr 
                  key={day}
                  className={isToday ? 'relative z-10' : ''}
                >
                  {/* Day Column Header */}
                  <td className={`p-3 rounded-2xl border transition-all text-left align-top ${
                    isToday 
                      ? 'bg-navy-900 text-white border-navy-900 shadow-soft-lg ring-2 ring-navy-700/50' 
                      : 'bg-white text-navy-900 border-line shadow-sm'
                  }`}>
                    <div className="flex flex-col h-full justify-between">
                      <span className="font-serif font-bold text-sm tracking-wide">
                        {day}
                      </span>
                      {isToday ? (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-lime-300 text-ink font-bold px-2 py-0.5 rounded-full mt-2 w-max shadow-sm">
                          <Sparkles className="w-2.5 h-2.5" /> TODAY
                        </span>
                      ) : (
                        <span className="text-[10px] text-muted font-medium mt-2">
                          Weekday
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Period Cells */}
                  {periods.map((period, idx) => {
                    const hasGap = gapsAfterPeriod[period.no];

                    // Find regular timetable entry
                    const cellEntry = entries.find(
                      e => e.day?.toUpperCase() === day.toUpperCase() && 
                           (Number(e.period) === Number(period.no) || e.periodLabel === period.label)
                    );

                    // Check if an extra class exists for this day and period
                    const extra = extraClasses.find(
                      ec => Number(ec.period) === Number(period.no)
                    );

                    const isLab = cellEntry?.subject && /lab/i.test(cellEntry.subject);
                    const colorToken = getSubjectColorStyle(cellEntry?.subject || extra?.subject);

                    return (
                      <React.Fragment key={period.no || idx}>
                        <td className="p-0 align-top h-24">
                          {extra ? (
                            // Render Extra Class
                            <div className="h-full p-3 rounded-2xl border transition-all duration-200 shadow-md bg-amber-50/90 border-amber-300 ring-2 ring-amber-400/40 flex flex-col justify-between">
                              <div>
                                <div className="flex items-center justify-between gap-1 mb-1">
                                  <span className="text-[9px] font-bold uppercase tracking-wide bg-amber-500 text-white px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <CalendarPlus className="w-2.5 h-2.5" /> Extra
                                  </span>
                                  <span className="text-[10px] font-bold text-navy-900 bg-white px-1.5 py-0.2 rounded border border-amber-200">
                                    Room {extra.venue}
                                  </span>
                                </div>
                                <div className="font-serif font-bold text-xs sm:text-[13px] text-amber-950 leading-snug line-clamp-2">
                                  {extra.subject}
                                </div>
                              </div>
                              <div className="pt-1.5 mt-1 border-t border-amber-200 text-[10px] text-amber-900 font-semibold truncate">
                                Prof. {extra.facultyCode}
                              </div>
                            </div>
                          ) : cellEntry ? (
                            // Regular Class with Subject Color Token
                            <div className={`h-full p-3 rounded-2xl border transition-all duration-200 hover:shadow-md flex flex-col justify-between ${
                              isLab
                                ? 'bg-green-50/90 border-green-300 text-green-950'
                                : `${colorToken.bg} ${colorToken.border} ${colorToken.text}`
                            }`}>
                              <div>
                                <div className="flex items-center justify-between gap-1 mb-1">
                                  {isLab && (
                                    <span className="text-[9px] font-bold uppercase tracking-wide bg-green-200/80 text-green-900 px-1.5 py-0.5 rounded-full">
                                      LAB
                                    </span>
                                  )}
                                  {showClassInCell && cellEntry.classId && (
                                    <span className="text-[10px] font-bold uppercase bg-navy-900 text-white px-1.5 py-0.5 rounded-md">
                                      {cellEntry.classId}
                                    </span>
                                  )}
                                </div>
                                
                                <div className="font-serif font-bold text-xs sm:text-[13px] leading-snug line-clamp-2">
                                  {cellEntry.subject}
                                </div>
                              </div>

                              <div className="pt-2 mt-2 border-t border-navy-900/10 flex flex-col gap-0.5 text-[11px] opacity-90">
                                {!showClassInCell && cellEntry.faculty && (
                                  <div className="flex items-center gap-1 truncate font-medium">
                                    <User className="w-3 h-3 flex-shrink-0" />
                                    <span className="truncate">{cellEntry.faculty}</span>
                                  </div>
                                )}
                                {cellEntry.venue && (
                                  <div className="flex items-center gap-1 truncate font-bold">
                                    <MapPin className="w-3 h-3 text-orange-500 flex-shrink-0" />
                                    <span className="truncate">{cellEntry.venue}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            // Free Period Highlight
                            <div className="h-full rounded-2xl border border-dashed border-line/80 bg-slate-50/50 hover:bg-lime-50/50 hover:border-lime-300 transition-colors p-3 flex flex-col items-center justify-center text-center">
                              <span className="text-[11px] text-muted/60 font-semibold select-none">
                                Free Slot
                              </span>
                              {highlightFree && (
                                <span className="text-[9px] text-green-700/70 font-medium">
                                  Self Study
                                </span>
                              )}
                            </div>
                          )}
                        </td>

                        {/* Visible gap for Break/Lunch */}
                        {hasGap && (
                          <td className="p-0 align-middle">
                            <div className="h-full min-h-[96px] bg-amber-50/40 border border-dashed border-amber-200/50 rounded-2xl flex flex-col items-center justify-center p-1 text-center">
                              <span className="text-[9px] font-bold text-amber-700 uppercase tracking-widest writing-mode-vertical">
                                •••
                              </span>
                            </div>
                          </td>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
