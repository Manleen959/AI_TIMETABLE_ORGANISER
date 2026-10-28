import * as XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import { findBestSheet, detectLayout, parseWithLayout, extractWefDate } from '../src/utils/parseTimetable.js';

function testFile(filePath) {
  console.log('Testing file:', filePath);
  const buf = fs.readFileSync(filePath);
  const wb = XLSX.read(buf, { type: 'buffer' });
  const { rows, sheet } = findBestSheet(wb);
  const layout = detectLayout(rows, sheet['!merges']);
  console.log('Detected layout:');
  console.log('  dayCol:', layout.dayCol, 'classCol:', layout.classCol);
  console.log('  headerRow:', layout.headerRow, 'subHeaderRow:', layout.subHeaderRow);
  console.log('  confidence:', layout.confidence, 'periods count:', layout.periodGroups.length);
  console.log('  periods:', layout.periodGroups.map(p => `${p.label} (${p.start}-${p.end}) cols:[${p.subjectCol},${p.facultyCol},${p.venueCol}]`).join(' | '));

  const result = parseWithLayout(rows, layout);
  console.log('Parsed result:');
  console.log('  entries:', result.entries.length);
  console.log('  classes:', result.classes.join(', '));
  console.log('  faculty:', result.faculty.slice(0, 5).join(', '), '... (total:', result.faculty.length, ')');
  console.log('  venues:', result.venues.join(', '));
  console.log('  days:', result.days.join(', '));
  console.log('  sample entry:', JSON.stringify(result.entries[0]));
  console.log('  wef date:', extractWefDate(path.basename(filePath)));
  console.log('--------------------------------------------------\n');
}

testFile(path.resolve('public/Updated_w_e_f_26-10-2026.xlsx'));
testFile(path.resolve('public/sample_5period_timetable.xlsx'));
