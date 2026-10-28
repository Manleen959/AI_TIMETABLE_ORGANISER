import * as XLSX from 'xlsx';

export const VALID_DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'];

export const DAY_ALIASES = {
  MON: 'MONDAY',
  MONDAY: 'MONDAY',
  TUE: 'TUESDAY',
  TUES: 'TUESDAY',
  TUESDAY: 'TUESDAY',
  WED: 'WEDNESDAY',
  WEDNESDAY: 'WEDNESDAY',
  THU: 'THURSDAY',
  THUR: 'THURSDAY',
  THURS: 'THURSDAY',
  THURSDAY: 'THURSDAY',
  FRI: 'FRIDAY',
  FRIDAY: 'FRIDAY',
  SAT: 'SATURDAY',
  SATURDAY: 'SATURDAY',
  SUN: 'SUNDAY',
  SUNDAY: 'SUNDAY',
};

export const DEFAULT_PERIOD_TIMES = [
  { no: 1, label: 'I', start: '09:00', end: '10:00' },
  { no: 2, label: 'II', start: '10:05', end: '11:05' },
  { no: 3, label: 'III', start: '11:25', end: '12:25' },
  { no: 4, label: 'IV', start: '12:30', end: '13:30' },
  { no: 5, label: 'V', start: '13:35', end: '14:35' },
  { no: 6, label: 'VI', start: '14:40', end: '15:40' },
  { no: 7, label: 'VII', start: '15:40', end: '16:40' },
];

export function normalizeDay(val) {
  if (!val) return null;
  const clean = String(val).trim().toUpperCase();
  return DAY_ALIASES[clean] || null;
}

export function normalizeClassId(val) {
  if (!val) return '';
  return String(val)
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-');
}

export function normalizeFaculty(val) {
  if (!val) return null;
  let clean = String(val).trim().toUpperCase();
  // Strip title prefixes: Dr., Prof., Er., Mr., Ms., Mrs.
  clean = clean.replace(/^(DR\.|DR\s+|PROF\.|PROF\s+|ER\.|ER\s+|MR\.|MR\s+|MS\.|MS\s+|MRS\.|MRS\s+)/i, '').trim();
  return clean || null;
}

export function extractFacultyAndVenue(val) {
  if (!val) return { faculty: null, venue: null };
  const str = String(val).trim();
  // Check for Name [Room]
  const brMatch = str.match(/^([^[]+)\s*\[([^\]]+)\]$/);
  if (brMatch) {
    return {
      faculty: normalizeFaculty(brMatch[1]),
      venue: normalizeVenue(brMatch[2]),
    };
  }
  // Check for Name (Room)
  const prMatch = str.match(/^([^(]+)\s*\(([^)]+)\)$/);
  if (prMatch) {
    return {
      faculty: normalizeFaculty(prMatch[1]),
      venue: normalizeVenue(prMatch[2]),
    };
  }
  return {
    faculty: normalizeFaculty(str),
    venue: null,
  };
}

export function normalizeVenue(val) {
  if (!val) return null;
  return String(val).trim().toUpperCase() || null;
}

export function normalizeVenueKey(val) {
  if (!val) return '';
  return String(val).toUpperCase().replace(/[\s\-_]/g, '');
}

/**
 * Expand merged cells so values populate every cell in the merged range
 */
export function expandMerges(sheet, rows) {
  const merges = sheet['!merges'] || [];
  const expanded = rows.map(r => (Array.isArray(r) ? [...r] : []));
  
  for (const merge of merges) {
    const { s, e } = merge;
    const originVal = expanded[s.r]?.[s.c];
    if (originVal !== undefined && originVal !== null && originVal !== '') {
      for (let r = s.r; r <= e.r; r++) {
        if (!expanded[r]) expanded[r] = [];
        for (let c = s.c; c <= e.c; c++) {
          if (r !== s.r || c !== s.c) {
            expanded[r][c] = originVal;
          }
        }
      }
    }
  }
  return expanded;
}

/**
 * Find the sheet with the most non-empty cells
 */
export function findBestSheet(workbook) {
  let bestSheetName = workbook.SheetNames[0];
  let maxCells = -1;

  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name];
    if (!sheet) continue;
    let count = 0;
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');
    for (let r = range.s.r; r <= range.e.r; r++) {
      for (let c = range.s.c; c <= range.e.c; c++) {
        const cell = sheet[XLSX.utils.encode_cell({ r, c })];
        if (cell && cell.v !== undefined && cell.v !== null && String(cell.v).trim() !== '') {
          count++;
        }
      }
    }
    if (count > maxCells) {
      maxCells = count;
      bestSheetName = name;
    }
  }

  const chosenSheet = workbook.Sheets[bestSheetName];
  const rawRows = XLSX.utils.sheet_to_json(chosenSheet, { header: 1, defval: null });
  const expandedRows = expandMerges(chosenSheet, rawRows);
  return { sheetName: bestSheetName, rows: expandedRows, sheet: chosenSheet };
}

/**
 * Extract time range e.g. "9:00-10:00" or "09.00 - 10.00"
 */
export function extractTimeRange(text) {
  if (!text) return null;
  const match = String(text).match(/(\d{1,2}[:.]\d{2})\s*(?:-|to)\s*(\d{1,2}[:.]\d{2})/i);
  if (match) {
    const start = match[1].replace('.', ':').padStart(5, '0');
    const end = match[2].replace('.', ':').padStart(5, '0');
    return { start, end };
  }
  return null;
}

/**
 * Detect layout automatically from 2D array of rows
 */
export function detectLayout(rows, merges = []) {
  const warnings = [];
  const maxSearchRows = Math.min(rows.length, 15);

  let dayCol = -1;
  let classCol = -1;
  let headerRow = -1;
  let subHeaderRow = -1;

  // 1. Find Day and Class column
  const dayVotes = {};
  for (let r = 0; r < maxSearchRows; r++) {
    const row = rows[r] || [];
    for (let c = 0; c < row.length; c++) {
      const val = String(row[c] || '').trim();
      if (!val) continue;

      if (/^day$/i.test(val)) {
        if (dayCol === -1) dayCol = c;
      }
      if (/^(class|section|batch|course|programme|branch)$/i.test(val)) {
        if (classCol === -1) classCol = c;
      }
      if (normalizeDay(val)) {
        dayVotes[c] = (dayVotes[c] || 0) + 1;
      }
    }
  }

  if (dayCol === -1) {
    let topCol = -1;
    let topCount = 0;
    for (const [col, count] of Object.entries(dayVotes)) {
      if (count > topCount) {
        topCount = count;
        topCol = Number(col);
      }
    }
    if (topCount >= 2) {
      dayCol = topCol;
    }
  }

  // If classCol not found by header keyword, try column immediately adjacent to dayCol
  if (classCol === -1 && dayCol !== -1) {
    const candidate = dayCol + 1;
    // Check if candidate column has alphanumeric entries that look like class IDs
    let classLike = 0;
    for (let r = 0; r < Math.min(rows.length, 25); r++) {
      const v = String(rows[r]?.[candidate] || '').trim();
      if (v && !normalizeDay(v) && /[A-Z0-9]/i.test(v)) classLike++;
    }
    if (classLike >= 3) {
      classCol = candidate;
    }
  }

  // 2. Find Period header row
  // Roman numerals: I, II, III, IV, V, VI, VII, VIII, IX, X, XI, XII
  // Or: Period 1, P1, 1, 2, 3...
  const romanOrPeriodRegex = /^(?:period\s*)?(?:[1-9]|1[0-2]|i|ii|iii|iv|v|vi|vii|viii|ix|x|xi|xii)$/i;

  let bestHeaderRow = -1;
  let maxPeriodsFound = 0;

  for (let r = 0; r < maxSearchRows; r++) {
    const row = rows[r] || [];
    let periodHits = 0;
    for (let c = 0; c < row.length; c++) {
      if (c === dayCol || c === classCol) continue;
      const text = String(row[c] || '').trim();
      if (!text) continue;
      if (romanOrPeriodRegex.test(text) || extractTimeRange(text)) {
        periodHits++;
      }
    }
    if (periodHits > maxPeriodsFound) {
      maxPeriodsFound = periodHits;
      bestHeaderRow = r;
    }
  }

  headerRow = bestHeaderRow;

  // Check row beneath headerRow for possible sub-headers (Subject, Faculty, Venue)
  if (headerRow !== -1 && headerRow + 1 < rows.length) {
    const nextRow = rows[headerRow + 1] || [];
    let subHits = 0;
    for (let c = 0; c < nextRow.length; c++) {
      const txt = String(nextRow[c] || '').trim().toLowerCase();
      if (/sub|course|fac|teach|staff|prof|room|venue|lab/i.test(txt)) {
        subHits++;
      }
    }
    if (subHits >= 2) {
      subHeaderRow = headerRow + 1;
    }
  }

  // 3. Identify Period Groups
  const periodGroups = [];
  const ignoredCols = [];

  if (headerRow !== -1) {
    const hRow = rows[headerRow] || [];
    const subRow = subHeaderRow !== -1 ? rows[subHeaderRow] || [] : null;

    // Collect columns that look like period starts or contain break/lunch
    const colMarkers = [];
    for (let c = 0; c < hRow.length; c++) {
      if (c === dayCol || c === classCol) continue;
      const cell = String(hRow[c] || '').trim();
      if (!cell) continue;

      if (/break|lunch|tea|recess/i.test(cell)) {
        ignoredCols.push(c);
        continue;
      }

      if (romanOrPeriodRegex.test(cell) || extractTimeRange(cell)) {
        // Only treat as new period if it's distinct from previous or separated
        colMarkers.push({ col: c, text: cell });
      }
    }

    // Merge identical contiguous merged header cells or group columns
    // If headers were merged over e.g. 3 cols: [ "I", "I", "I", "II", "II", "II" ]
    const distinctMarkers = [];
    let lastMarkerText = null;
    let lastMarkerCol = -1;

    for (const m of colMarkers) {
      if (m.text !== lastMarkerText || (m.col - lastMarkerCol > 4)) {
        distinctMarkers.push(m);
        lastMarkerText = m.text;
      }
      lastMarkerCol = m.col;
    }

    // Determine the span of each period
    for (let i = 0; i < distinctMarkers.length; i++) {
      const current = distinctMarkers[i];
      const nextCol = distinctMarkers[i + 1] ? distinctMarkers[i + 1].col : (hRow.length);
      const spanCols = [];
      for (let c = current.col; c < nextCol; c++) {
        if (ignoredCols.includes(c)) break;
        spanCols.push(c);
      }

      const pNo = i + 1;
      const def = DEFAULT_PERIOD_TIMES[i] || { 
        no: pNo, 
        label: `P${pNo}`, 
        start: `${8 + pNo}:00`.padStart(5, '0'), 
        end: `${9 + pNo}:00`.padStart(5, '0') 
      };

      const extractedTime = extractTimeRange(current.text);
      const start = extractedTime?.start || def.start;
      const end = extractedTime?.end || def.end;
      const label = current.text.length <= 6 ? current.text : (def.label || `P${pNo}`);

      let subjectCol = spanCols[0] ?? current.col;
      let facultyCol = spanCols[1] ?? null;
      let venueCol = spanCols[2] ?? null;

      // If sub-headers exist, match column roles precisely
      if (subRow && spanCols.length > 1) {
        let matchedSub = null;
        let matchedFac = null;
        let matchedVen = null;

        for (const c of spanCols) {
          const subText = String(subRow[c] || '').trim().toLowerCase();
          if (/sub|course|paper/i.test(subText)) matchedSub = c;
          else if (/fac|teach|prof|staff|instructor/i.test(subText)) matchedFac = c;
          else if (/room|venue|lab|loc/i.test(subText)) matchedVen = c;
        }

        if (matchedSub !== null) subjectCol = matchedSub;
        if (matchedFac !== null) facultyCol = matchedFac;
        if (matchedVen !== null) venueCol = matchedVen;
      }

      periodGroups.push({
        no: pNo,
        label,
        start,
        end,
        startCol: current.col,
        spanCount: spanCols.length,
        subjectCol,
        facultyCol,
        venueCol,
      });
    }
  }

  // Warnings & confidence calculation
  if (dayCol === -1) warnings.push('Could not automatically identify the DAY column.');
  if (classCol === -1) warnings.push('Could not automatically identify the CLASS column.');
  if (periodGroups.length < 3) warnings.push(`Only found ${periodGroups.length} period(s). At least 3 expected.`);

  let confidence = 'high';
  if (dayCol === -1 || classCol === -1 || periodGroups.length < 3) {
    confidence = 'low';
  } else if (periodGroups.length < 5 || dayCol === classCol) {
    confidence = 'medium';
  }

  const firstDataRow = (subHeaderRow !== -1 ? subHeaderRow + 1 : (headerRow !== -1 ? headerRow + 1 : 2));

  return {
    dayCol: dayCol !== -1 ? dayCol : 0,
    classCol: classCol !== -1 ? classCol : 1,
    headerRow: headerRow !== -1 ? headerRow : 1,
    subHeaderRow,
    firstDataRow,
    periodGroups,
    ignoredCols,
    confidence,
    warnings,
  };
}

/**
 * Parse a combined cell text e.g. "DBMS (AK) ET-103" or "Maths - Dr Sharma [Lab 1]"
 */
export function parseCombinedCell(text) {
  if (!text) return { subject: '', faculty: null, venue: null };
  const raw = String(text).trim();
  if (!raw) return { subject: '', faculty: null, venue: null };

  // Match: Subject (Faculty) Room
  const parenMatch = raw.match(/^([^(]+)\s*\(([^)]+)\)\s*(.*)$/);
  if (parenMatch) {
    return {
      subject: parenMatch[1].trim(),
      faculty: normalizeFaculty(parenMatch[2]),
      venue: normalizeVenue(parenMatch[3]),
    };
  }

  // Match: Subject [Room] or Subject - Faculty
  const bracketMatch = raw.match(/^([^[]+)\s*\[([^\]]+)\]\s*(.*)$/);
  if (bracketMatch) {
    return {
      subject: bracketMatch[1].trim(),
      faculty: normalizeFaculty(bracketMatch[3]),
      venue: normalizeVenue(bracketMatch[2]),
    };
  }

  // Fallback: whole text is subject
  return {
    subject: raw,
    faculty: null,
    venue: null,
  };
}

/**
 * Parse rows with layout mapping into normalized entries
 */
export function parseWithLayout(rows, layout) {
  const entries = [];
  const classesSet = new Set();
  const facultySet = new Set();
  const venuesSet = new Set();
  const daysSet = new Set();
  let incompleteCount = 0;
  const warnings = [];

  if (!rows || rows.length === 0) {
    return { entries, classes: [], faculty: [], venues: [], days: [], periods: [], incomplete: 0, warnings: ['File has no rows'] };
  }

  const { dayCol, classCol, firstDataRow = 2, periodGroups = [] } = layout;

  let currentDay = null;

  for (let r = firstDataRow; r < rows.length; r++) {
    const row = rows[r] || [];
    
    // Check if entire row is empty
    const isRowEmpty = row.every(c => c === null || c === undefined || String(c).trim() === '');
    if (isRowEmpty) continue;

    // Check Day column
    const rawDay = row[dayCol];
    const detectedDay = normalizeDay(rawDay);
    if (detectedDay) {
      currentDay = detectedDay;
    }

    // Must have an active forward-filled day
    if (!currentDay) continue;

    // Check Class column
    const rawClass = row[classCol];
    const classId = normalizeClassId(rawClass);
    if (!classId) continue; // Not a class row

    daysSet.add(currentDay);
    classesSet.add(classId);

    // Extract each period entry
    for (const group of periodGroups) {
      let subject = '';
      let faculty = null;
      let venue = null;

      if (group.facultyCol === null && group.venueCol === null) {
        // Single column per period
        const cellVal = row[group.subjectCol];
        if (cellVal) {
          const parsed = parseCombinedCell(cellVal);
          subject = parsed.subject;
          faculty = parsed.faculty;
          venue = parsed.venue;
        }
      } else {
        // Multi-column per period
        const subVal = row[group.subjectCol];
        subject = subVal !== undefined && subVal !== null ? String(subVal).trim() : '';
        
        if (group.facultyCol !== null && group.facultyCol !== undefined) {
          const facCell = row[group.facultyCol];
          if (group.venueCol === null) {
            // Venue might be inside the faculty cell e.g. "Dr. Sharma [R-101]"
            const extracted = extractFacultyAndVenue(facCell);
            faculty = extracted.faculty;
            venue = extracted.venue;
          } else {
            faculty = normalizeFaculty(facCell);
          }
        }
        if (group.venueCol !== null && group.venueCol !== undefined) {
          venue = normalizeVenue(row[group.venueCol]);
        }
      }

      // Ignore BREAK or LUNCH entries
      if (!subject || /^(break|lunch|tea|recess|free|-)$/i.test(subject)) {
        continue;
      }

      if (faculty) facultySet.add(faculty);
      if (venue) venuesSet.add(venue);

      if (!faculty || !venue) {
        incompleteCount++;
      }

      const venueKey = normalizeVenueKey(venue);
      const id = `${currentDay}_${classId}_P${group.no}_${entries.length}`;

      entries.push({
        id,
        day: currentDay,
        classId,
        period: group.no,
        periodLabel: group.label,
        start: group.start,
        end: group.end,
        subject,
        faculty,
        venue,
        venueKey,
      });
    }
  }

  // Deduplicate and order days according to standard weekly calendar (Monday to Saturday)
  const SIX_DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  const sortedDays = daysSet.has('SUNDAY') ? [...SIX_DAYS, 'SUNDAY'] : SIX_DAYS;

  const periods = periodGroups.map(p => ({
    no: p.no,
    label: p.label,
    start: p.start,
    end: p.end,
  }));

  return {
    entries,
    classes: Array.from(classesSet).sort(),
    faculty: Array.from(facultySet).sort(),
    venues: Array.from(venuesSet).sort(),
    days: sortedDays,
    periods,
    incomplete: incompleteCount,
    warnings,
  };
}

/**
 * Extract w.e.f date from filename or return current date
 */
export function extractWefDate(fileName) {
  if (!fileName) return new Date().toISOString().split('T')[0];

  // Matches 26-10-2026 or 26_10_2026 or 2026-10-26
  const dmyMatch = fileName.match(/(\d{1,2})[-_](\d{1,2})[-_](\d{4})/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  const ymdMatch = fileName.match(/(\d{4})[-_](\d{1,2})[-_](\d{1,2})/);
  if (ymdMatch) {
    const [, y, m, d] = ymdMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  return new Date().toISOString().split('T')[0];
}
