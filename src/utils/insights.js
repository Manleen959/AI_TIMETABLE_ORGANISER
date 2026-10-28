/**
 * Pure functions for timetable AI & ML insights
 */

/**
 * 1. findClashes(entries)
 * Group by (day, period, faculty) and by (day, period, venueKey).
 * A group is a REAL clash only if it contains more than one distinct entry
 * that does NOT share the same subject, faculty AND venue.
 * If several classes share the same subject + faculty + venue in a slot,
 * it is a COMBINED CLASS (e.g. French for BCA-1A/1B/1C), not a clash.
 * Skip entries with null faculty or venue.
 */
export function findClashes(entries = []) {
  const validEntries = entries.filter(e => e.day && e.period);
  const facultyGroups = new Map();
  const venueGroups = new Map();

  for (const entry of validEntries) {
    // Group by (day, period, faculty)
    if (entry.faculty) {
      const key = `${entry.day}__P${entry.period}__FAC__${entry.faculty.toUpperCase()}`;
      if (!facultyGroups.has(key)) facultyGroups.set(key, []);
      facultyGroups.get(key).push(entry);
    }

    // Group by (day, period, venueKey)
    if (entry.venueKey) {
      const key = `${entry.day}__P${entry.period}__VEN__${entry.venueKey}`;
      if (!venueGroups.has(key)) venueGroups.set(key, []);
      venueGroups.get(key).push(entry);
    }
  }

  const clashes = [];
  const combinedClasses = [];
  const processedClashKeys = new Set();
  const processedCombinedKeys = new Set();

  function evaluateGroup(group, type) {
    if (group.length <= 1) return;

    // Check if all entries share the exact same subject, faculty, and venue
    const first = group[0];
    const isCombined = group.every(e => 
      e.subject === first.subject &&
      e.faculty === first.faculty &&
      e.venueKey === first.venueKey
    );

    const classesList = Array.from(new Set(group.map(e => e.classId))).sort();

    if (isCombined) {
      const combinedKey = `${first.day}__P${first.period}__${first.faculty}__${first.venueKey}__${first.subject}`;
      if (!processedCombinedKeys.has(combinedKey)) {
        processedCombinedKeys.add(combinedKey);
        combinedClasses.push({
          id: combinedKey,
          day: first.day,
          period: first.period,
          periodLabel: first.periodLabel || `P${first.period}`,
          subject: first.subject,
          faculty: first.faculty,
          venue: first.venue,
          classes: classesList,
          count: group.length,
          type: 'Combined Section Lecture'
        });
      }
    } else {
      // Real Clash: multiple distinct lectures competing for same teacher or room
      const clashKey = `${first.day}__P${first.period}__${type}__${type === 'faculty' ? first.faculty : first.venueKey}`;
      if (!processedClashKeys.has(clashKey)) {
        processedClashKeys.add(clashKey);
        clashes.push({
          id: clashKey,
          type, // 'faculty' | 'venue'
          day: first.day,
          period: first.period,
          periodLabel: first.periodLabel || `P${first.period}`,
          target: type === 'faculty' ? first.faculty : (first.venue || first.venueKey),
          targetKey: type === 'faculty' ? first.faculty : first.venueKey,
          classes: classesList,
          conflictingEntries: group.map(e => ({
            id: e.id,
            classId: e.classId,
            subject: e.subject,
            faculty: e.faculty,
            venue: e.venue,
          })),
          count: group.length,
          description: type === 'faculty'
            ? `Faculty ${first.faculty} assigned to multiple distinct classes simultaneously`
            : `Room ${first.venue || first.venueKey} double-booked across different sessions`
        });
      }
    }
  }

  for (const group of facultyGroups.values()) {
    evaluateGroup(group, 'faculty');
  }

  for (const group of venueGroups.values()) {
    evaluateGroup(group, 'venue');
  }

  return { clashes, combinedClasses };
}

/**
 * 2. facultyWorkload(entries)
 * Per faculty: weeklyPeriods, labPeriods, distinctClasses, daysActive, periodsPerDay.
 * Combined classes counted ONCE per slot.
 */
export function facultyWorkload(entries = []) {
  const facultyMap = new Map();

  // Deduplicate slots for combined classes (same day, period, faculty, subject)
  const slotMap = new Map();
  for (const e of entries) {
    if (!e.faculty) continue;
    const slotKey = `${e.day}__P${e.period}__${e.faculty.toUpperCase()}__${e.subject}`;
    if (!slotMap.has(slotKey)) {
      slotMap.set(slotKey, {
        day: e.day,
        period: e.period,
        faculty: e.faculty.toUpperCase(),
        subject: e.subject,
        isLab: /lab/i.test(e.subject || ''),
        classes: new Set(),
      });
    }
    if (e.classId) {
      slotMap.get(slotKey).classes.add(e.classId);
    }
  }

  for (const slot of slotMap.values()) {
    const fac = slot.faculty;
    if (!facultyMap.has(fac)) {
      facultyMap.set(fac, {
        faculty: fac,
        weeklyPeriods: 0,
        labPeriods: 0,
        classesSet: new Set(),
        daysSet: new Set(),
        periodsPerDay: {},
      });
    }

    const item = facultyMap.get(fac);
    item.weeklyPeriods += 1;
    if (slot.isLab) item.labPeriods += 1;
    item.daysSet.add(slot.day);
    slot.classes.forEach(c => item.classesSet.add(c));
    item.periodsPerDay[slot.day] = (item.periodsPerDay[slot.day] || 0) + 1;
  }

  const list = Array.from(facultyMap.values()).map(f => ({
    faculty: f.faculty,
    weeklyPeriods: f.weeklyPeriods,
    labPeriods: f.labPeriods,
    distinctClasses: f.classesSet.size,
    daysActive: f.daysSet.size,
    periodsPerDay: f.periodsPerDay,
    classesList: Array.from(f.classesSet).sort(),
  }));

  return list.sort((a, b) => b.weeklyPeriods - a.weeklyPeriods);
}

/**
 * 3. kmeans(points, k=3)
 * Plain JS K-means (no library).
 * Features = [weeklyPeriods, labPeriods, distinctClasses, daysActive], min-max normalized.
 * Deterministic init (sort by weeklyPeriods, pick evenly spaced seeds).
 * 20 iterations.
 * Label clusters by centroid weeklyPeriods: lowest "Under-loaded", middle "Balanced", highest "Overloaded".
 */
export function kmeans(points = [], k = 3) {
  if (!points || points.length === 0) return [];
  const actualK = Math.min(k, points.length);

  // Feature keys
  const featureKeys = ['weeklyPeriods', 'labPeriods', 'distinctClasses', 'daysActive'];

  // Calculate min and max for normalization
  const minMax = {};
  for (const key of featureKeys) {
    const vals = points.map(p => p[key] || 0);
    minMax[key] = {
      min: Math.min(...vals),
      max: Math.max(...vals),
    };
  }

  function normalize(point) {
    return featureKeys.map(key => {
      const range = minMax[key].max - minMax[key].min;
      return range === 0 ? 0.5 : (point[key] - minMax[key].min) / range;
    });
  }

  const normalizedVectors = points.map(p => normalize(p));

  // Deterministic seed initialization: sort by weeklyPeriods
  const sortedIndices = points
    .map((p, idx) => ({ idx, val: p.weeklyPeriods }))
    .sort((a, b) => a.val - b.val);

  let centroids = [];
  for (let i = 0; i < actualK; i++) {
    const seedIndex = sortedIndices[Math.floor((i * (sortedIndices.length - 1)) / Math.max(1, actualK - 1))].idx;
    centroids.push([...normalizedVectors[seedIndex]]);
  }

  function euclideanDistance(v1, v2) {
    let sum = 0;
    for (let i = 0; i < v1.length; i++) {
      const d = v1[i] - v2[i];
      sum += d * d;
    }
    return Math.sqrt(sum);
  }

  let assignments = new Array(points.length).fill(0);

  // 20 Iterations
  for (let iter = 0; iter < 20; iter++) {
    // Assignment step
    let changed = false;
    for (let pIdx = 0; pIdx < points.length; pIdx++) {
      const vec = normalizedVectors[pIdx];
      let bestCluster = 0;
      let bestDist = Infinity;
      for (let cIdx = 0; cIdx < actualK; cIdx++) {
        const dist = euclideanDistance(vec, centroids[cIdx]);
        if (dist < bestDist) {
          bestDist = dist;
          bestCluster = cIdx;
        }
      }
      if (assignments[pIdx] !== bestCluster) {
        assignments[pIdx] = bestCluster;
        changed = true;
      }
    }

    if (!changed && iter > 0) break;

    // Update centroids step
    const newCentroids = Array.from({ length: actualK }, () => new Array(featureKeys.length).fill(0));
    const counts = new Array(actualK).fill(0);

    for (let pIdx = 0; pIdx < points.length; pIdx++) {
      const cluster = assignments[pIdx];
      counts[cluster]++;
      for (let f = 0; f < featureKeys.length; f++) {
        newCentroids[cluster][f] += normalizedVectors[pIdx][f];
      }
    }

    for (let cIdx = 0; cIdx < actualK; cIdx++) {
      if (counts[cIdx] > 0) {
        for (let f = 0; f < featureKeys.length; f++) {
          newCentroids[cIdx][f] /= counts[cIdx];
        }
        centroids[cIdx] = newCentroids[cIdx];
      }
    }
  }

  // Calculate average weeklyPeriods for each cluster to rank them
  const clusterAverages = [];
  for (let cIdx = 0; cIdx < actualK; cIdx++) {
    const clusterPoints = points.filter((_, idx) => assignments[idx] === cIdx);
    const avgWeekly = clusterPoints.length > 0 
      ? clusterPoints.reduce((sum, p) => sum + p.weeklyPeriods, 0) / clusterPoints.length 
      : 0;
    clusterAverages.push({ cluster: cIdx, avgWeekly });
  }

  clusterAverages.sort((a, b) => a.avgWeekly - b.avgWeekly);

  // Map cluster indices to semantic labels
  const labelMap = {};
  if (actualK === 1) {
    labelMap[clusterAverages[0].cluster] = { label: 'Balanced', color: '#0E7C5A' };
  } else if (actualK === 2) {
    labelMap[clusterAverages[0].cluster] = { label: 'Under-loaded', color: '#0A44A8' };
    labelMap[clusterAverages[1].cluster] = { label: 'Overloaded', color: '#F26B21' };
  } else {
    labelMap[clusterAverages[0].cluster] = { label: 'Under-loaded', color: '#0A44A8' };
    labelMap[clusterAverages[1].cluster] = { label: 'Balanced', color: '#0E7C5A' };
    labelMap[clusterAverages[2].cluster] = { label: 'Overloaded', color: '#F26B21' };
  }

  return points.map((p, idx) => {
    const c = assignments[idx];
    const mapping = labelMap[c] || { label: 'Balanced', color: '#0E7C5A' };
    return {
      ...p,
      cluster: c,
      clusterLabel: mapping.label,
      clusterColor: mapping.color,
    };
  });
}

/**
 * 4. roomUsage(entries)
 * Per venueKey periods used, and a day x period occupancy count matrix.
 */
export function roomUsage(entries = [], days = [], periods = []) {
  const venueCounts = new Map();
  const matrix = {};

  // Initialize matrix: matrix[day][periodNo] = { count: 0, entries: [] }
  for (const day of days) {
    matrix[day] = {};
    for (const p of periods) {
      matrix[day][p.no] = { count: 0, entries: [] };
    }
  }

  // Count usage (deduplicate combined classes in same room)
  const roomSlots = new Set();
  for (const e of entries) {
    if (!e.venueKey || !e.day || !e.period) continue;
    const slotKey = `${e.day}__P${e.period}__${e.venueKey}`;
    
    if (!roomSlots.has(slotKey)) {
      roomSlots.add(slotKey);
      
      const vKey = e.venueKey;
      const vName = e.venue || vKey;
      if (!venueCounts.has(vKey)) {
        venueCounts.set(vKey, { venueKey: vKey, venueName: vName, periodsUsed: 0 });
      }
      venueCounts.get(vKey).periodsUsed += 1;

      if (matrix[e.day] && matrix[e.day][e.period]) {
        matrix[e.day][e.period].count += 1;
        matrix[e.day][e.period].entries.push(e);
      }
    }
  }

  const list = Array.from(venueCounts.values()).sort((a, b) => b.periodsUsed - a.periodsUsed);
  return { venueUsageList: list, occupancyMatrix: matrix };
}

/**
 * 5. freeRooms(entries, day, period, allVenues)
 * Known venues not occupied in that slot.
 */
export function freeRooms(entries = [], day, period, allVenues = []) {
  if (!day || !period) return [];
  const occupiedVenues = new Set();

  for (const e of entries) {
    if (e.day?.toUpperCase() === day.toUpperCase() && Number(e.period) === Number(period)) {
      if (e.venueKey) occupiedVenues.add(e.venueKey);
      if (e.venue) occupiedVenues.add(e.venue.toUpperCase().replace(/[\s\-_]/g, ''));
    }
  }

  return allVenues.filter(v => {
    const key = v.toUpperCase().replace(/[\s\-_]/g, '');
    return !occupiedVenues.has(key);
  });
}

/**
 * 6. freeFaculty(entries, day, period, allFaculty)
 * Faculty codes with no entry in that slot.
 */
export function freeFaculty(entries = [], day, period, allFaculty = []) {
  if (!day || !period) return [];
  const busyFaculty = new Set();

  for (const e of entries) {
    if (e.day?.toUpperCase() === day.toUpperCase() && Number(e.period) === Number(period)) {
      if (e.faculty) busyFaculty.add(e.faculty.toUpperCase());
    }
  }

  return allFaculty.filter(f => !busyFaculty.has(f.toUpperCase()));
}

/**
 * 7. dataQuality(entries)
 * Entries missing faculty or venue.
 */
export function dataQuality(entries = []) {
  const missingFaculty = [];
  const missingVenue = [];
  const validCount = entries.filter(e => e.faculty && e.venue).length;

  for (const e of entries) {
    if (!e.faculty) {
      missingFaculty.push(e);
    }
    if (!e.venue) {
      missingVenue.push(e);
    }
  }

  return {
    missingFaculty,
    missingVenue,
    missingFacultyCount: missingFaculty.length,
    missingVenueCount: missingVenue.length,
    totalEntries: entries.length,
    healthScore: entries.length > 0 ? Math.round((validCount / entries.length) * 100) : 100,
  };
}

/**
 * Build Compact Stats JSON for AI Summary
 */
export function buildCompactStats(entries = [], days = [], periods = [], clashes = [], combined = [], clusteredFaculty = []) {
  // Find busiest day and period
  const dayCounts = {};
  const periodCounts = {};
  for (const e of entries) {
    if (e.day) dayCounts[e.day] = (dayCounts[e.day] || 0) + 1;
    if (e.period) periodCounts[e.period] = (periodCounts[e.period] || 0) + 1;
  }

  let busiestDay = 'N/A';
  let maxDayCount = 0;
  for (const [d, c] of Object.entries(dayCounts)) {
    if (c > maxDayCount) {
      maxDayCount = c;
      busiestDay = d;
    }
  }

  let busiestPeriod = 'N/A';
  let maxPeriodCount = 0;
  for (const [p, c] of Object.entries(periodCounts)) {
    if (c > maxPeriodCount) {
      maxPeriodCount = c;
      busiestPeriod = `Period ${p}`;
    }
  }

  const overloaded = clusteredFaculty.filter(f => f.clusterLabel === 'Overloaded').slice(0, 5);
  const underloaded = clusteredFaculty.filter(f => f.clusterLabel === 'Under-loaded').slice(0, 5);

  return {
    totalEntries: entries.length,
    totalDays: days.length,
    totalPeriods: periods.length,
    realClashesCount: clashes.length,
    combinedClassesCount: combined.length,
    clashFreePercentage: entries.length > 0 
      ? Math.round(((entries.length - clashes.reduce((s, c) => s + c.count, 0)) / entries.length) * 100) 
      : 100,
    busiestDay: `${busiestDay} (${maxDayCount} lectures)`,
    busiestPeriod: `${busiestPeriod} (${maxPeriodCount} lectures)`,
    topOverloadedFaculty: overloaded.map(f => ({ faculty: f.faculty, periods: f.weeklyPeriods, labs: f.labPeriods })),
    topUnderloadedFaculty: underloaded.map(f => ({ faculty: f.faculty, periods: f.weeklyPeriods })),
    sampleClashes: clashes.slice(0, 3).map(c => `${c.day} P${c.period}: ${c.description}`),
  };
}

/**
 * Compact CSV String of entries for AI Chat (capped at 60k characters)
 */
export function buildCompactCSV(entries = []) {
  const header = 'day,period,class,subject,faculty,venue\n';
  let csv = header;

  for (const e of entries) {
    const row = `${e.day || ''},P${e.period || ''},${e.classId || ''},"${(e.subject || '').replace(/"/g, '""')}",${e.faculty || ''},${e.venue || ''}\n`;
    if (csv.length + row.length > 58000) break;
    csv += row;
  }

  return csv;
}

/**
 * Rank best substitute faculty candidates for an absent teacher in a specific slot
 * Formula:
 * +40 if they teach the same subject name anywhere in the week
 * +20 if they already teach that classId
 * +30 * (1 - candidateDayLoad / maxDayLoad)
 * +10 if they have no class in the adjacent previous or next period
 */
export function rankSubstitutes(entries = [], absentFaculty, day, period, targetEntry = null) {
  if (!entries.length || !absentFaculty || !day || !period) return [];

  const entry = targetEntry || entries.find(e => 
    e.day === day && 
    String(e.period) === String(period) && 
    e.faculty === absentFaculty
  );

  const targetSubject = (entry?.subject || '').trim().toUpperCase();
  const targetClass = entry?.classId;
  const pNum = Number(period);

  // All known faculty except absent one
  const allFaculty = Array.from(new Set(entries.map(e => e.faculty).filter(Boolean)))
    .filter(f => f !== absentFaculty);

  // Busy faculty in this slot
  const busyInSlot = new Set(
    entries
      .filter(e => e.day === day && String(e.period) === String(period))
      .map(e => e.faculty)
      .filter(Boolean)
  );

  // Free candidates
  const freeCandidates = allFaculty.filter(f => !busyInSlot.has(f));

  // Day loads
  const dayLoads = {};
  for (const f of allFaculty) {
    dayLoads[f] = entries.filter(e => e.day === day && e.faculty === f).length;
  }
  const maxDayLoad = Math.max(1, ...Object.values(dayLoads));

  const ranked = freeCandidates.map(f => {
    let score = 0;
    const reasons = [];

    // +40: Same subject anywhere in week
    if (targetSubject) {
      const sameSubject = entries.some(e => 
        e.faculty === f && 
        (e.subject || '').trim().toUpperCase() === targetSubject
      );
      if (sameSubject) {
        score += 40;
        reasons.push(`+40 Teaches same subject (${entry.subject})`);
      }
    }

    // +20: Already teaches that classId
    if (targetClass) {
      const teachesClass = entries.some(e => e.faculty === f && e.classId === targetClass);
      if (teachesClass) {
        score += 20;
        reasons.push(`+20 Teaches batch ${targetClass}`);
      }
    }

    // +30 * (1 - candidateDayLoad / maxDayLoad)
    const load = dayLoads[f] || 0;
    const loadPts = Math.round(30 * (1 - (load / maxDayLoad)));
    score += loadPts;
    reasons.push(`+${loadPts} Workload balance (${load} periods today)`);

    // +10: No class in adjacent previous or next period
    if (!isNaN(pNum)) {
      const hasAdjacent = entries.some(e => 
        e.day === day && 
        e.faculty === f && 
        (Number(e.period) === pNum - 1 || Number(e.period) === pNum + 1)
      );
      if (!hasAdjacent) {
        score += 10;
        reasons.push('+10 Adjacent periods free');
      }
    }

    return {
      faculty: f,
      score,
      reasons,
      dayLoad: load,
    };
  });

  return ranked.sort((a, b) => b.score - a.score).slice(0, 3);
}
