/**
 * src/utils/ics.js - iCalendar (.ics) export generator with Asia/Kolkata timezone
 */

const DAY_MAP = {
  SUNDAY: 0,
  MONDAY: 1,
  TUESDAY: 2,
  WEDNESDAY: 3,
  THURSDAY: 4,
  FRIDAY: 5,
  SATURDAY: 6,
};

// Fallback period timings if start/end times are missing
const DEFAULT_PERIOD_TIMES = {
  1: { start: '09:00', end: '09:50' },
  2: { start: '09:50', end: '10:40' },
  3: { start: '10:40', end: '11:30' },
  4: { start: '11:30', end: '12:20' },
  5: { start: '12:50', end: '13:40' },
  6: { start: '13:40', end: '14:30' },
  7: { start: '14:30', end: '15:20' },
  8: { start: '15:20', end: '16:10' },
};

function parseTimeToHoursMinutes(timeStr, fallbackPeriod = 1, isEnd = false) {
  if (timeStr && typeof timeStr === 'string') {
    const clean = timeStr.trim();
    const match = clean.match(/^(\d{1,2}):(\d{2})/);
    if (match) {
      let h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      // Check 12-hour format with PM
      if (/pm/i.test(clean) && h < 12) h += 12;
      if (/am/i.test(clean) && h === 12) h = 0;
      return {
        hours: String(h).padStart(2, '0'),
        minutes: String(m).padStart(2, '0'),
      };
    }
  }

  const defaultSlot = DEFAULT_PERIOD_TIMES[fallbackPeriod] || DEFAULT_PERIOD_TIMES[1];
  const targetTime = isEnd ? defaultSlot.end : defaultSlot.start;
  const [h, m] = targetTime.split(':');
  return { hours: h, minutes: m };
}

function formatDateToICS(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}${m}${d}`;
}

/**
 * Generate RFC 5545 iCalendar content for an array of timetable entries
 */
export function buildIcsCalendar(entries = [], options = {}) {
  const {
    wefDate = '2026-10-26',
    title = 'SmartSchedule Timetable',
    isTeacher = false,
  } = options;

  let baseDate = new Date(wefDate + 'T00:00:00');
  if (isNaN(baseDate.getTime())) {
    baseDate = new Date();
  }

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PCTE Ludhiana//SmartSchedule AI//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${title.replace(/[,;]/g, '')}`,
    'X-WR-TIMEZONE:Asia/Kolkata',
    'BEGIN:VTIMEZONE',
    'TZID:Asia/Kolkata',
    'X-LIC-LOCATION:Asia/Kolkata',
    'BEGIN:STANDARD',
    'TZOFFSETFROM:+0530',
    'TZOFFSETTO:+0530',
    'TZNAME:IST',
    'DTSTART:19700101T000000',
    'END:STANDARD',
    'END:VTIMEZONE',
  ];

  const nowStamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  for (const entry of entries) {
    if (!entry.day || !entry.subject) continue;

    const dayName = entry.day.toUpperCase();
    const targetDayIndex = DAY_MAP[dayName];
    if (targetDayIndex === undefined) continue;

    // Calculate first matching weekday on or after w.e.f date
    const daysToAdd = (targetDayIndex - baseDate.getDay() + 7) % 7;
    const eventDate = new Date(baseDate);
    eventDate.setDate(baseDate.getDate() + daysToAdd);

    const dateStr = formatDateToICS(eventDate);
    const pNum = Number(entry.period) || 1;

    const startTime = parseTimeToHoursMinutes(entry.start, pNum, false);
    const endTime = parseTimeToHoursMinutes(entry.end, pNum, true);

    const dtStart = `${dateStr}T${startTime.hours}${startTime.minutes}00`;
    const dtEnd = `${dateStr}T${endTime.hours}${endTime.minutes}00`;

    const summary = entry.subject.replace(/[,;\n]/g, ' ');
    const location = (entry.venue || entry.venueKey || '').replace(/[,;\n]/g, ' ');
    const description = isTeacher
      ? `Class: ${entry.classId || 'N/A'}${entry.venue ? ' | Venue: ' + entry.venue : ''}`
      : `Faculty: ${entry.faculty || 'N/A'}${entry.venue ? ' | Venue: ' + entry.venue : ''}`;

    const uid = `${entry.id || Math.random().toString(36).slice(2)}@smartschedule.pcte.edu.in`;

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${nowStamp}`);
    lines.push(`DTSTART;TZID=Asia/Kolkata:${dtStart}`);
    lines.push(`DTEND;TZID=Asia/Kolkata:${dtEnd}`);
    lines.push('RRULE:FREQ=WEEKLY');
    lines.push(`SUMMARY:${summary}`);
    if (location) lines.push(`LOCATION:${location}`);
    lines.push(`DESCRIPTION:${description}`);
    lines.push('STATUS:CONFIRMED');
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/**
 * Trigger download of the .ics file in browser
 */
export function downloadIcsFile(entries = [], options = {}) {
  const content = buildIcsCalendar(entries, options);
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const fileName = options.fileName || 'SmartSchedule_Timetable.ics';
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
