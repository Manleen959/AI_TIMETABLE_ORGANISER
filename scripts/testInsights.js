import * as XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { findBestSheet, detectLayout, parseWithLayout } from '../src/utils/parseTimetable.js';
import { 
  findClashes, 
  facultyWorkload, 
  kmeans, 
  roomUsage, 
  freeRooms, 
  freeFaculty, 
  dataQuality,
  buildCompactStats
} from '../src/utils/insights.js';

function testDataset(filePath) {
  console.log('Testing insights on:', filePath);
  const buf = fs.readFileSync(filePath);
  const wb = XLSX.read(buf, { type: 'buffer' });
  const { rows, sheet } = findBestSheet(wb);
  const layout = detectLayout(rows, sheet['!merges']);
  const parsed = parseWithLayout(rows, layout);

  console.log(`  Parsed ${parsed.entries.length} entries across ${parsed.days.length} days and ${parsed.periods.length} periods.`);

  // 1. Clashes
  const clashRes = findClashes(parsed.entries);
  console.log(`  Real Clashes: ${clashRes.clashes.length}`);
  console.log(`  Combined Classes: ${clashRes.combinedClasses.length}`);

  // 2. Workload & K-Means
  const workload = facultyWorkload(parsed.entries);
  console.log(`  Faculty count in workload: ${workload.length}`);
  const clustered = kmeans(workload, 3);
  console.log('  K-Means clusters:');
  for (const f of clustered.slice(0, 6)) {
    console.log(`    - ${f.faculty}: ${f.weeklyPeriods} periods (${f.labPeriods} labs, ${f.distinctClasses} classes) -> ${f.clusterLabel}`);
  }

  // 3. Room Usage
  const rooms = roomUsage(parsed.entries, parsed.days, parsed.periods);
  console.log(`  Unique rooms tracked: ${rooms.venueUsageList.length}`);
  const topRoom = rooms.venueUsageList[0];
  console.log(`    Busiest room: ${topRoom?.venueName} (${topRoom?.periodsUsed} periods)`);

  // 4. Free slot test
  if (parsed.days[0] && parsed.periods[0]) {
    const fRooms = freeRooms(parsed.entries, parsed.days[0], parsed.periods[0].no, parsed.venues);
    const fFaculty = freeFaculty(parsed.entries, parsed.days[0], parsed.periods[0].no, parsed.faculty);
    console.log(`  Free on ${parsed.days[0]} P${parsed.periods[0].no}: ${fRooms.length} rooms free, ${fFaculty.length} faculty free`);
  }

  // 5. Data Quality
  const quality = dataQuality(parsed.entries);
  console.log(`  Data health score: ${quality.healthScore}% (missing fac: ${quality.missingFacultyCount}, missing ven: ${quality.missingVenueCount})`);

  // 6. Compact Stats
  const stats = buildCompactStats(parsed.entries, parsed.days, parsed.periods, clashRes.clashes, clashRes.combinedClasses, clustered);
  console.log('  Compact stats summary:', JSON.stringify(stats));
  console.log('--------------------------------------------------\n');
}

testDataset(path.resolve('public/Updated_w_e_f_26-10-2026.xlsx'));
testDataset(path.resolve('public/sample_5period_timetable.xlsx'));
