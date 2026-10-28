/**
 * src/utils/solver.js - Pure functions for timetable clash resolution and move validation
 */
import { findClashes } from './insights.js';

/**
 * Determine if a venue is a laboratory type
 * Names containing "LAB", "ETCC", or "MTCL" are lab-type, others classroom-type
 */
export function isLabVenue(venueName = '', venueKey = '') {
  const combined = `${venueName} ${venueKey}`.toUpperCase();
  return /LAB|ETCC|MTCL/.test(combined);
}

/**
 * Check if a proposed move of an entry (or combined group) to a new slot is valid
 * 
 * Rules:
 * 1. Lunch and tea breaks are never valid target periods
 * 2. In the new slot:
 *    - The entry's class has no other entry
 *    - The faculty (if any) has no other entry
 *    - The venue (if any) is free (if original venue busy, tries other known venues of same type)
 * 3. Moving a combined class moves all its entries together
 */
export function checkMove(entries = [], entryId, newDay, newPeriod, newVenueKey = null) {
  const target = entries.find(e => e.id === entryId);
  if (!target) {
    return { ok: false, reasons: ['Target entry not found in timetable'] };
  }

  // Reject break slots
  const periodStr = String(newPeriod || '').toUpperCase();
  if (periodStr.includes('TEA') || periodStr.includes('LUNCH') || periodStr.includes('BREAK')) {
    return { ok: false, reasons: ['Cannot schedule class in tea or lunch break intervals'] };
  }

  // Find all entries that move together (if part of a combined class)
  // A combined class shares the same day, period, subject, faculty, and venueKey
  const movingEntries = entries.filter(e => 
    e.day === target.day &&
    String(e.period) === String(target.period) &&
    e.faculty === target.faculty &&
    e.subject === target.subject &&
    e.venueKey === target.venueKey
  );

  const movingIds = new Set(movingEntries.map(e => e.id));
  const otherEntries = entries.filter(e => !movingIds.has(e.id));

  const reasons = [];

  // 1. Class conflict check in new slot
  for (const m of movingEntries) {
    if (m.classId) {
      const classClash = otherEntries.find(e => 
        e.day === newDay && 
        String(e.period) === String(newPeriod) && 
        e.classId === m.classId
      );
      if (classClash) {
        reasons.push(`Class ${m.classId} is already scheduled for ${classClash.subject || 'another session'} in ${newDay} Period ${newPeriod}`);
      }
    }
  }

  // 2. Faculty conflict check in new slot
  if (target.faculty) {
    const facultyClash = otherEntries.find(e => 
      e.day === newDay && 
      String(e.period) === String(newPeriod) && 
      e.faculty === target.faculty
    );
    if (facultyClash) {
      reasons.push(`Faculty ${target.faculty} already teaches ${facultyClash.subject} (${facultyClash.classId}) in ${newDay} Period ${newPeriod}`);
    }
  }

  // 3. Venue check in new slot
  let chosenVenueKey = newVenueKey || target.venueKey;
  let chosenVenue = target.venue || chosenVenueKey;

  if (target.venueKey) {
    const isVenueOccupied = (vKey) => otherEntries.some(e => 
      e.day === newDay && 
      String(e.period) === String(newPeriod) && 
      e.venueKey === vKey
    );

    if (isVenueOccupied(chosenVenueKey)) {
      // Try to find another venue of the same type (lab vs classroom)
      const targetIsLab = isLabVenue(target.venue, target.venueKey);
      
      // Collect all known venues in dataset
      const venueMap = new Map();
      for (const e of entries) {
        if (e.venueKey && !venueMap.has(e.venueKey)) {
          venueMap.set(e.venueKey, {
            key: e.venueKey,
            name: e.venue || e.venueKey,
            isLab: isLabVenue(e.venue, e.venueKey)
          });
        }
      }

      // Filter compatible and free venues
      const freeAlternative = Array.from(venueMap.values()).find(v => 
        v.isLab === targetIsLab && !isVenueOccupied(v.key)
      );

      if (freeAlternative) {
        chosenVenueKey = freeAlternative.key;
        chosenVenue = freeAlternative.name;
      } else {
        reasons.push(
          `Venue ${target.venueKey} is occupied in ${newDay} P${newPeriod} and no alternative ${targetIsLab ? 'lab' : 'classroom'} is free`
        );
      }
    }
  }

  return {
    ok: reasons.length === 0,
    reasons,
    chosenVenueKey,
    chosenVenue,
    movingEntriesCount: movingEntries.length,
  };
}

/**
 * Auto-resolve clashes in a timetable
 * Chooses movable non-combined clash entries and finds the best scoring free slot
 */
export function autoResolve(entries = [], periods = [], days = []) {
  const { clashes, combinedClasses } = findClashes(entries);

  // Set of entry IDs in combined classes (never move members of combined class individually)
  const combinedEntryIds = new Set();
  for (const c of combinedClasses) {
    const matching = entries.filter(e => 
      e.day === c.day && 
      String(e.period) === String(c.period) && 
      e.faculty === c.faculty && 
      e.subject === c.subject
    );
    matching.forEach(m => combinedEntryIds.add(m.id));
  }

  // Available days and periods
  const daysList = (days && days.length > 0)
    ? days
    : Array.from(new Set(entries.map(e => e.day).filter(Boolean)));

  // Filter periods to valid numbers / non-breaks
  let periodList = (periods && periods.length > 0)
    ? periods.map(p => typeof p === 'object' ? p.period : p)
    : Array.from(new Set(entries.map(e => e.period).filter(Boolean)));

  // Exclude breaks from target periods
  periodList = periodList.filter(p => {
    const s = String(p).toUpperCase();
    return !s.includes('TEA') && !s.includes('LUNCH') && !s.includes('BREAK');
  });

  const changes = [];
  const unresolved = [];
  let workingEntries = [...entries];

  for (const clash of clashes) {
    const clashEntryIds = (clash.conflictingEntries || []).map(ce => ce.id);

    // Check if clash is still active in workingEntries
    const activeEntries = workingEntries.filter(we => 
      clashEntryIds.includes(we.id) &&
      we.day === clash.day &&
      String(we.period) === String(clash.period)
    );

    if (activeEntries.length <= 1) {
      continue; // Clash already resolved by an earlier move
    }

    // Pick an entry to move (prefer non-combined)
    const movable = activeEntries.filter(e => !combinedEntryIds.has(e.id));
    if (movable.length === 0) {
      unresolved.push({
        clashId: clash.id,
        reason: 'All entries in clash belong to combined classes',
        entries: activeEntries,
      });
      continue;
    }

    const entryToMove = movable[0];

    // Check if entry is a 2-period lab block (subject contains LAB and next period is same entry)
    const isLab = /LAB/i.test(entryToMove.subject || '');
    const currentPeriodNum = Number(entryToMove.period);
    const nextPeriodNum = currentPeriodNum + 1;
    
    const companionLabEntry = isLab && !isNaN(currentPeriodNum)
      ? workingEntries.find(e => 
          e.day === entryToMove.day && 
          Number(e.period) === nextPeriodNum && 
          e.classId === entryToMove.classId && 
          e.subject === entryToMove.subject
        )
      : null;

    // Generate candidate slots (day, period)
    const candidateSlots = [];
    for (const d of daysList) {
      for (const p of periodList) {
        if (d === entryToMove.day && String(p) === String(entryToMove.period)) continue;

        const pNum = Number(p);
        const origNum = Number(entryToMove.period) || 1;
        const periodDiff = isNaN(pNum) ? 3 : Math.abs(pNum - origNum);
        const score = (d === entryToMove.day ? 0 : 5) + periodDiff;

        candidateSlots.push({ day: d, period: p, score });
      }
    }

    // Sort by score ascending: same day first, closest period first
    candidateSlots.sort((a, b) => a.score - b.score);

    let resolved = false;

    for (const slot of candidateSlots) {
      if (companionLabEntry) {
        // Need two consecutive periods
        const nextP = Number(slot.period) + 1;
        if (!periodList.map(String).includes(String(nextP))) continue;

        const move1 = checkMove(workingEntries, entryToMove.id, slot.day, slot.period);
        if (!move1.ok) continue;

        // Temporarily apply move1 to test move2
        const tempEntries = workingEntries.map(e => 
          e.id === entryToMove.id 
            ? { ...e, day: slot.day, period: slot.period, venueKey: move1.chosenVenueKey, venue: move1.chosenVenue }
            : e
        );

        const move2 = checkMove(tempEntries, companionLabEntry.id, slot.day, nextP, move1.chosenVenueKey);
        if (!move2.ok) continue;

        // Both moves valid! Record changes
        changes.push({
          entryId: entryToMove.id,
          classId: entryToMove.classId,
          subject: entryToMove.subject,
          faculty: entryToMove.faculty,
          from: { day: entryToMove.day, period: entryToMove.period, venue: entryToMove.venue, venueKey: entryToMove.venueKey },
          to: { day: slot.day, period: slot.period, venue: move1.chosenVenue, venueKey: move1.chosenVenueKey },
          reason: `Resolved clash with ${activeEntries.find(x => x.id !== entryToMove.id)?.subject || 'concurrent class'} (Lab part 1)`,
        });

        changes.push({
          entryId: companionLabEntry.id,
          classId: companionLabEntry.classId,
          subject: companionLabEntry.subject,
          faculty: companionLabEntry.faculty,
          from: { day: companionLabEntry.day, period: companionLabEntry.period, venue: companionLabEntry.venue, venueKey: companionLabEntry.venueKey },
          to: { day: slot.day, period: nextP, venue: move2.chosenVenue, venueKey: move2.chosenVenueKey },
          reason: `Consecutive lab slot for ${entryToMove.subject} (Lab part 2)`,
        });

        workingEntries = applyChanges(workingEntries, changes);
        resolved = true;
        break;
      } else {
        const move = checkMove(workingEntries, entryToMove.id, slot.day, slot.period);
        if (move.ok) {
          changes.push({
            entryId: entryToMove.id,
            classId: entryToMove.classId,
            subject: entryToMove.subject,
            faculty: entryToMove.faculty,
            from: { day: entryToMove.day, period: entryToMove.period, venue: entryToMove.venue, venueKey: entryToMove.venueKey },
            to: { day: slot.day, period: slot.period, venue: move.chosenVenue, venueKey: move.chosenVenueKey },
            reason: `Resolved clash with ${activeEntries.find(x => x.id !== entryToMove.id)?.subject || 'concurrent session'}`,
          });

          workingEntries = applyChanges(workingEntries, changes);
          resolved = true;
          break;
        }
      }
    }

    if (!resolved) {
      unresolved.push({
        clashId: clash.id,
        reason: 'No open conflict-free slot found across timetable',
        entries: activeEntries,
      });
    }
  }

  return {
    changes,
    unresolved,
  };
}

/**
 * Apply a list of changes to an entries array and return the new entries
 */
export function applyChanges(entries = [], changes = []) {
  if (!changes || changes.length === 0) return [...entries];

  const changeMap = new Map();
  for (const c of changes) {
    changeMap.set(c.entryId, c);
  }

  return entries.map(entry => {
    const change = changeMap.get(entry.id);
    if (!change) return entry;

    return {
      ...entry,
      day: change.to.day,
      period: change.to.period,
      venueKey: change.to.venueKey || entry.venueKey,
      venue: change.to.venue || entry.venue,
    };
  });
}
