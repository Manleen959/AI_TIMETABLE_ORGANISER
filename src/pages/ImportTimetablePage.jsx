import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { 
  findBestSheet, 
  detectLayout, 
  parseWithLayout, 
  extractWefDate, 
  DEFAULT_PERIOD_TIMES 
} from '../utils/parseTimetable';
import { 
  publishTimetable, 
  getTimetableHistory, 
  restoreTimetableVersion 
} from '../utils/timetableService';
import { useAuth } from '../context/AuthContext';
import { useTimetable } from '../context/TimetableContext';
import { callAI } from '../utils/aiClient';
import { 
  UploadCloud, 
  FileSpreadsheet, 
  Settings2, 
  History, 
  RotateCcw, 
  Sparkles,
  AlertTriangle,
  Save
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function ImportTimetablePage() {
  const { user } = useAuth();
  const { refreshTimetable } = useTimetable();
  const fileInputRef = useRef(null);

  const [fileName, setFileName] = useState('');
  const [rawRows, setRawRows] = useState([]);
  const [layout, setLayout] = useState(null);
  const [showWizard, setShowWizard] = useState(false);
  const [wefDate, setWefDate] = useState(new Date().toISOString().split('T')[0]);
  const [parsedData, setParsedData] = useState(null);
  const [historyList, setHistoryList] = useState([]);
  const [publishing, setPublishing] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [aiSuggesting, setAiSuggesting] = useState(false);

  // Load version history on mount
  async function loadHistory() {
    const list = await getTimetableHistory();
    setHistoryList(list || []);
  }

  useEffect(() => {
    loadHistory();
  }, []);

  // Process Workbook File
  function processWorkbook(fileOrBuffer, name) {
    try {
      const wb = XLSX.read(fileOrBuffer, { type: typeof fileOrBuffer === 'string' ? 'binary' : 'array' });
      const { rows, sheet } = findBestSheet(wb);
      const sheetMerges = sheet['!merges'] || [];

      setFileName(name);
      setRawRows(rows);
      setMerges(sheetMerges);

      // Prefill w.e.f date from filename
      const detectedWef = extractWefDate(name);
      setWefDate(detectedWef);

      // Auto detect layout
      const detected = detectLayout(rows, sheetMerges);
      setLayout(detected);

      // Parse with detected layout
      const result = parseWithLayout(rows, detected);
      setParsedData(result);

      if (detected.confidence !== 'high') {
        setShowWizard(true);
        toast('Layout detected with warnings. Wizard opened for verification.', { icon: '⚠️' });
      } else {
        toast.success(`Successfully analyzed ${name}`);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to parse spreadsheet: ' + err.message);
    }
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      processWorkbook(evt.target.result, file.name);
    };
    reader.readAsArrayBuffer(file);
  }

  // Drag and drop handlers
  function handleDragOver(e) {
    e.preventDefault();
    setDragActive(true);
  }

  function handleDragLeave(e) {
    e.preventDefault();
    setDragActive(false);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        processWorkbook(evt.target.result, file.name);
      };
      reader.readAsArrayBuffer(file);
    }
  }

  // Load sample files from public directory
  async function loadBundledSample(url, name) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Could not fetch sample file');
      const buf = await res.arrayBuffer();
      processWorkbook(buf, name);
    } catch (e) {
      toast.error('Error loading bundled sample: ' + e.message);
    }
  }

  // Update layout from wizard and re-compute parsed data
  function updateLayoutField(field, value) {
    if (!layout) return;
    const updated = { ...layout, [field]: value };

    // If changing columns per period or start col, re-generate periodGroups
    if (field === 'colsPerPeriod' || field === 'firstPeriodCol' || field === 'numPeriods') {
      const colsPer = Number(updated.colsPerPeriod || 3);
      const startC = Number(updated.firstPeriodCol || 2);
      const count = Number(updated.numPeriods || 7);

      const newGroups = [];
      for (let i = 0; i < count; i++) {
        const pNo = i + 1;
        const pCol = startC + i * colsPer;
        const def = DEFAULT_PERIOD_TIMES[i] || { label: `P${pNo}`, start: '09:00', end: '10:00' };

        newGroups.push({
          no: pNo,
          label: def.label || `P${pNo}`,
          start: def.start,
          end: def.end,
          subjectCol: pCol,
          facultyCol: colsPer > 1 ? pCol + 1 : null,
          venueCol: colsPer > 2 ? pCol + 2 : null,
        });
      }
      updated.periodGroups = newGroups;
    }

    setLayout(updated);
    const newParsed = parseWithLayout(rawRows, updated);
    setParsedData(newParsed);
  }

  // Update specific period start/end time
  function updatePeriodTime(index, field, val) {
    if (!layout) return;
    const newGroups = [...layout.periodGroups];
    if (newGroups[index]) {
      newGroups[index] = { ...newGroups[index], [field]: val };
      const updated = { ...layout, periodGroups: newGroups };
      setLayout(updated);
      const newParsed = parseWithLayout(rawRows, updated);
      setParsedData(newParsed);
    }
  }

  // Ask AI to suggest column mapping
  async function handleAskAiMapping() {
    if (!rawRows || rawRows.length === 0) {
      toast.error('Please upload or load a spreadsheet first');
      return;
    }

    try {
      setAiSuggesting(true);
      const csvSnippet = rawRows.slice(0, 40).map(row => 
        (row || []).map(cell => `"${String(cell || '').replace(/"/g, '""')}"`).join(',')
      ).join('\n');

      const resJson = await callAI('mapping', {
        rows: csvSnippet,
      });

      const proposal = resJson.data;
      if (!proposal || typeof proposal !== 'object') {
        throw new Error('AI could not return a structured column mapping. Check API configuration.');
      }

      const updated = { ...layout };
      if (typeof proposal.dayCol === 'number') updated.dayCol = proposal.dayCol;
      if (typeof proposal.classCol === 'number') updated.classCol = proposal.classCol;
      if (typeof proposal.headerRow === 'number') updated.headerRow = proposal.headerRow;
      if (typeof proposal.firstDataRow === 'number') {
        updated.firstDataRow = proposal.firstDataRow;
      } else if (typeof proposal.headerRow === 'number') {
        updated.firstDataRow = proposal.headerRow + 1;
      }

      if (proposal.columnsPerPeriod || proposal.firstPeriodCol) {
        const colsPer = Number(proposal.columnsPerPeriod || 3);
        const startC = Number(proposal.firstPeriodCol || 2);
        const count = Number(proposal.numPeriods || 7);

        const newGroups = [];
        for (let i = 0; i < count; i++) {
          const pNo = i + 1;
          const pCol = startC + i * colsPer;
          const def = DEFAULT_PERIOD_TIMES[i] || { label: `P${pNo}`, start: '09:00', end: '10:00' };

          newGroups.push({
            no: pNo,
            label: def.label || `P${pNo}`,
            start: def.start,
            end: def.end,
            subjectCol: pCol,
            facultyCol: colsPer > 1 ? pCol + 1 : null,
            venueCol: colsPer > 2 ? pCol + 2 : null,
          });
        }
        updated.periodGroups = newGroups;
        updated.colsPerPeriod = colsPer;
        updated.firstPeriodCol = startC;
        updated.numPeriods = count;
      }

      setLayout(updated);
      const newParsed = parseWithLayout(rawRows, updated);
      setParsedData(newParsed);
      toast.success('AI Mapping Applied! Live preview recomputed.');
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Error getting AI mapping');
    } finally {
      setAiSuggesting(false);
    }
  }

  // Publish Timetable
  async function handlePublish() {
    if (!parsedData || parsedData.entries.length === 0) {
      toast.error('No valid timetable entries to publish');
      return;
    }

    try {
      setPublishing(true);
      const payload = {
        wef: wefDate,
        uploadedAt: new Date().toISOString(),
        uploadedBy: user?.email || 'admin@pcte.edu.in',
        fileName: fileName || 'Timetable.xlsx',
        entries: parsedData.entries,
        periods: parsedData.periods,
        days: parsedData.days,
        classes: parsedData.classes,
        faculty: parsedData.faculty,
        venues: parsedData.venues,
        importLayout: layout,
      };

      await publishTimetable(payload);
      await refreshTimetable();
      toast.success('Timetable published successfully!');
      await loadHistory();
    } catch (err) {
      console.error(err);
      toast.error('Failed to publish timetable: ' + err.message);
    } finally {
      setPublishing(false);
    }
  }

  // Restore previous version
  async function handleRestore(version) {
    if (window.confirm(`Restore timetable from ${version.savedAt?.slice(0, 10)} (W.E.F ${version.wef})?`)) {
      try {
        await restoreTimetableVersion(version);
        await refreshTimetable();
        toast.success('Restored timetable version successfully!');
        await loadHistory();
      } catch (e) {
        toast.error('Failed to restore version: ' + e.message);
      }
    }
  }

  // Column letters helper: 0 -> A, 1 -> B, 25 -> Z, 26 -> AA...
  function colLetter(i) {
    return XLSX.utils.encode_col(i);
  }

  const confidenceBadges = {
    high: { label: 'High Confidence', color: 'bg-green-100 text-green-800 border-green-300' },
    medium: { label: 'Medium Confidence', color: 'bg-amber-100 text-amber-800 border-amber-300' },
    low: { label: 'Low Confidence (Review Wizard)', color: 'bg-rose-100 text-rose-800 border-rose-300' },
  };

  const badge = layout ? (confidenceBadges[layout.confidence] || confidenceBadges.medium) : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-panel p-6 border border-line shadow-soft flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-navy-50 text-navy-700 text-[11px] font-bold uppercase mb-2">
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Universal Timetable Import Engine</span>
          </div>
          <h1 className="font-serif text-2xl font-bold text-navy-900">
            Import Master Spreadsheet
          </h1>
          <p className="text-xs text-muted mt-1">
            Universal parser automatically expands merged period headers, normalizes teacher codes, and audits clash points.
          </p>
        </div>

        {/* Quick Sample Load Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => loadBundledSample('/Updated_w_e_f_26-10-2026.xlsx', 'Updated_w_e_f_26-10-2026.xlsx')}
            className="text-[11px] font-bold bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 px-3 py-1.5 rounded-full transition-colors cursor-pointer"
          >
            Sample 1: PCTE 7-Period Format
          </button>
          <button
            onClick={() => loadBundledSample('/sample_5period_timetable.xlsx', 'sample_5period_timetable.xlsx')}
            className="text-[11px] font-bold bg-navy-50 text-navy-700 hover:bg-navy-100 border border-navy-200 px-3 py-1.5 rounded-full transition-colors cursor-pointer"
          >
            Sample 2: 5-Period Alternate
          </button>
        </div>
      </div>

      {/* Drag & Drop Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`bg-white rounded-panel border-2 border-dashed p-8 text-center cursor-pointer transition-all ${
          dragActive
            ? 'border-green-600 bg-green-50/40 scale-[1.01]'
            : 'border-line hover:border-navy-700/40 hover:bg-slate-50/60'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".xlsx,.xls,.csv"
          className="hidden"
        />
        <div className="w-14 h-14 rounded-2xl bg-navy-50 text-navy-700 flex items-center justify-center mx-auto mb-3 shadow-sm">
          <FileSpreadsheet className="w-7 h-7 text-navy-900" />
        </div>
        <h3 className="font-serif font-bold text-lg text-navy-900">
          {fileName ? `Loaded: ${fileName}` : 'Drop Excel File (.xlsx, .xls, .csv) here or browse'}
        </h3>
        <p className="text-xs text-muted mt-1 max-w-md mx-auto">
          SheetJS reads your document, identifies days and class columns, and automatically maps multi-column period groups.
        </p>
      </div>

      {/* STEP 1: DETECTED LAYOUT CARD */}
      {layout && (
        <div className="bg-white rounded-panel p-6 border border-line shadow-soft space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-line">
            <div className="flex items-center gap-3">
              <span className="text-sm font-serif font-bold text-navy-900">
                Step 1: Detected Layout
              </span>
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${badge.color}`}>
                {badge.label}
              </span>
            </div>

            <button
              onClick={() => setShowWizard(!showWizard)}
              className="text-xs font-bold text-navy-700 hover:text-navy-900 flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
            >
              <Settings2 className="w-4 h-4 text-orange-500" />
              <span>{showWizard ? 'Hide Mapping Wizard' : 'Fix Mapping / Edit Columns'}</span>
            </button>
          </div>

          {/* Quick summary of detected specs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-surface border border-line">
              <span className="text-muted text-[10px] uppercase font-bold block">Day Column</span>
              <span className="font-serif font-bold text-navy-900 text-sm">
                Col {colLetter(layout.dayCol)} ({layout.dayCol})
              </span>
            </div>

            <div className="p-3 rounded-xl bg-surface border border-line">
              <span className="text-muted text-[10px] uppercase font-bold block">Class Column</span>
              <span className="font-serif font-bold text-navy-900 text-sm">
                Col {colLetter(layout.classCol)} ({layout.classCol})
              </span>
            </div>

            <div className="p-3 rounded-xl bg-surface border border-line">
              <span className="text-muted text-[10px] uppercase font-bold block">Periods Identified</span>
              <span className="font-serif font-bold text-navy-900 text-sm">
                {layout.periodGroups.length} Periods
              </span>
            </div>

            <div className="p-3 rounded-xl bg-surface border border-line">
              <span className="text-muted text-[10px] uppercase font-bold block">Ignored (Breaks)</span>
              <span className="font-serif font-bold text-navy-900 text-sm">
                {layout.ignoredCols?.length > 0 ? layout.ignoredCols.map(c => colLetter(c)).join(', ') : 'None'}
              </span>
            </div>
          </div>

          {/* Warnings */}
          {layout.warnings?.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>Parser Notices:</span>
              </div>
              <ul className="list-disc pl-5 text-[11px] space-y-0.5">
                {layout.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {/* MAPPING WIZARD */}
          {showWizard && (
            <div className="mt-4 pt-4 border-t border-line space-y-4 bg-slate-50/60 p-4 rounded-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h4 className="font-serif font-bold text-sm text-navy-900 flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-orange-500" />
                  <span>Mapping Wizard &amp; Column Overrides</span>
                </h4>

                <button
                  type="button"
                  onClick={handleAskAiMapping}
                  disabled={aiSuggesting}
                  className="bg-navy-900 hover:bg-navy-700 text-white px-4 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 self-start sm:self-auto cursor-pointer disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5 text-lime-300" />
                  <span>{aiSuggesting ? 'AI Analyzing Matrix...' : 'ASK AI TO SUGGEST MAPPING'}</span>
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-muted mb-1">Day Column</label>
                  <select
                    value={layout.dayCol}
                    onChange={(e) => updateLayoutField('dayCol', Number(e.target.value))}
                    className="w-full bg-white border border-line rounded-lg p-2 font-bold"
                  >
                    {rawRows[0]?.map((_, idx) => (
                      <option key={idx} value={idx}>
                        Col {colLetter(idx)} ({idx})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-muted mb-1">Class Column</label>
                  <select
                    value={layout.classCol}
                    onChange={(e) => updateLayoutField('classCol', Number(e.target.value))}
                    className="w-full bg-white border border-line rounded-lg p-2 font-bold"
                  >
                    {rawRows[0]?.map((_, idx) => (
                      <option key={idx} value={idx}>
                        Col {colLetter(idx)} ({idx})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-muted mb-1">First Data Row</label>
                  <input
                    type="number"
                    min="1"
                    max="15"
                    value={layout.firstDataRow}
                    onChange={(e) => updateLayoutField('firstDataRow', Number(e.target.value))}
                    className="w-full bg-white border border-line rounded-lg p-2 font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-muted mb-1">Cols per Period</label>
                  <select
                    value={layout.colsPerPeriod || 3}
                    onChange={(e) => updateLayoutField('colsPerPeriod', Number(e.target.value))}
                    className="w-full bg-white border border-line rounded-lg p-2 font-bold"
                  >
                    <option value={1}>1 (Combined Subject [Room])</option>
                    <option value={2}>2 (Subject, Faculty [Room])</option>
                    <option value={3}>3 (Subject, Faculty, Room)</option>
                    <option value={4}>4 (Sub, Fac, Room, Extra)</option>
                  </select>
                </div>
              </div>

              {/* Editable Period Times Table */}
              <div className="pt-2">
                <span className="text-xs font-bold text-navy-900 block mb-2">
                  Configure Period Labels &amp; Timestamps:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-xs">
                  {layout.periodGroups.map((p, idx) => (
                    <div key={idx} className="bg-white p-2.5 rounded-xl border border-line space-y-1.5 shadow-sm">
                      <div className="font-bold text-navy-900 text-center font-serif">
                        Period {p.no}
                      </div>
                      <div>
                        <input
                          type="text"
                          value={p.label}
                          onChange={(e) => updatePeriodTime(idx, 'label', e.target.value)}
                          className="w-full text-center border border-line rounded py-0.5 font-bold text-[11px]"
                          placeholder="Label"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          value={p.start}
                          onChange={(e) => updatePeriodTime(idx, 'start', e.target.value)}
                          className="w-1/2 text-center border border-line rounded py-0.5 text-[10px]"
                        />
                        <span>-</span>
                        <input
                          type="text"
                          value={p.end}
                          onChange={(e) => updatePeriodTime(idx, 'end', e.target.value)}
                          className="w-1/2 text-center border border-line rounded py-0.5 text-[10px]"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Raw Data Reference Table (First 15 Rows with column letters A, B, C...) */}
              <div className="pt-2">
                <span className="text-xs font-bold text-navy-900 block mb-2">
                  Raw Spreadsheet Matrix (A, B, C... Column Index Reference):
                </span>
                <div className="overflow-x-auto max-h-60 border border-line rounded-xl bg-white text-[11px]">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 text-muted sticky top-0 font-mono text-[10px]">
                      <tr>
                        <th className="p-1.5 border-b border-line">Row #</th>
                        {rawRows[0]?.map((_, c) => (
                          <th key={c} className="p-1.5 border-b border-line whitespace-nowrap">
                            {colLetter(c)} ({c})
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line/40 font-mono text-[10px]">
                      {rawRows.slice(0, 15).map((row, rIdx) => (
                        <tr key={rIdx} className={rIdx === layout.headerRow ? 'bg-amber-50/60 font-bold' : ''}>
                          <td className="p-1.5 bg-slate-50 text-muted font-bold">{rIdx}</td>
                          {row?.map((cell, cIdx) => (
                            <td key={cIdx} className="p-1.5 truncate max-w-[120px] whitespace-nowrap">
                              {cell !== null && cell !== undefined ? String(cell) : ''}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* STEP 2: PREVIEW & PUBLISH */}
      {parsedData && (
        <div className="bg-white rounded-panel p-6 border border-line shadow-soft space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-line">
            <div>
              <span className="text-sm font-serif font-bold text-navy-900">
                Step 2: Timetable Preview &amp; Audit
              </span>
              <p className="text-xs text-muted mt-0.5">
                Review parsed records before publishing to the live PCTE student and faculty portal.
              </p>
            </div>

            {/* Effective Date (w.e.f) Input */}
            <div className="flex items-center gap-2">
              <label className="text-xs font-bold text-navy-900 whitespace-nowrap">
                Effective From (W.E.F):
              </label>
              <input
                type="date"
                value={wefDate}
                onChange={(e) => setWefDate(e.target.value)}
                className="bg-surface border border-line rounded-lg px-3 py-1.5 text-xs font-bold text-navy-900 focus:outline-none focus:ring-1 focus:ring-green-600"
              />
            </div>
          </div>

          {/* 7 Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            <div className="p-3 rounded-card bg-surface border border-line">
              <span className="text-[10px] uppercase font-bold text-muted">Total Entries</span>
              <div className="font-serif font-bold text-lg text-navy-900 mt-1">{parsedData.entries.length}</div>
            </div>

            <div className="p-3 rounded-card bg-surface border border-line">
              <span className="text-[10px] uppercase font-bold text-muted">Classes</span>
              <div className="font-serif font-bold text-lg text-navy-900 mt-1">{parsedData.classes.length}</div>
            </div>

            <div className="p-3 rounded-card bg-surface border border-line">
              <span className="text-[10px] uppercase font-bold text-muted">Faculty</span>
              <div className="font-serif font-bold text-lg text-navy-900 mt-1">{parsedData.faculty.length}</div>
            </div>

            <div className="p-3 rounded-card bg-surface border border-line">
              <span className="text-[10px] uppercase font-bold text-muted">Rooms / Labs</span>
              <div className="font-serif font-bold text-lg text-navy-900 mt-1">{parsedData.venues.length}</div>
            </div>

            <div className="p-3 rounded-card bg-surface border border-line">
              <span className="text-[10px] uppercase font-bold text-muted">Days Found</span>
              <div className="font-serif font-bold text-lg text-navy-900 mt-1">{parsedData.days.length}</div>
            </div>

            <div className="p-3 rounded-card bg-surface border border-line">
              <span className="text-[10px] uppercase font-bold text-muted">Periods</span>
              <div className="font-serif font-bold text-lg text-navy-900 mt-1">{parsedData.periods.length}</div>
            </div>

            <div className="p-3 rounded-card bg-surface border border-line">
              <span className="text-[10px] uppercase font-bold text-muted">Incomplete</span>
              <div className="font-serif font-bold text-lg text-amber-600 mt-1">{parsedData.incomplete}</div>
            </div>
          </div>

          {/* Scrollable table of first 50 entries */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-navy-900">
                Sample Output (First 50 of {parsedData.entries.length} Entries):
              </span>
              <span className="text-[11px] text-muted">
                Showing sanitized, normalized records
              </span>
            </div>

            <div className="overflow-x-auto max-h-72 border border-line rounded-2xl bg-white">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-muted uppercase font-bold text-[10px] sticky top-0">
                  <tr>
                    <th className="py-2.5 px-3">Day</th>
                    <th className="py-2.5 px-3">Class</th>
                    <th className="py-2.5 px-3">Period</th>
                    <th className="py-2.5 px-3">Time</th>
                    <th className="py-2.5 px-3">Subject</th>
                    <th className="py-2.5 px-3">Faculty</th>
                    <th className="py-2.5 px-3">Venue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {parsedData.entries.slice(0, 50).map((row, idx) => {
                    const isLab = /lab/i.test(row.subject);
                    return (
                      <tr key={row.id || idx} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2 px-3 font-semibold text-navy-900">{row.day}</td>
                        <td className="py-2 px-3 font-bold text-navy-700">{row.classId}</td>
                        <td className="py-2 px-3">P{row.period}</td>
                        <td className="py-2 px-3 text-muted">{row.start} - {row.end}</td>
                        <td className={`py-2 px-3 font-medium ${isLab ? 'text-green-700 font-bold' : ''}`}>
                          {row.subject}
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-700">{row.faculty || '—'}</td>
                        <td className="py-2 px-3 font-bold text-orange-600">{row.venue || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Publish Button */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-line">
            <div className="text-xs text-muted">
              Publishing will archive current active timetable into history and deploy this version instantly.
            </div>

            <button
              onClick={handlePublish}
              disabled={publishing}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 rounded-full text-xs sm:text-sm font-bold transition-all shadow-md hover:shadow-lg flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{publishing ? 'Publishing Timetable...' : 'PUBLISH TIMETABLE'}</span>
            </button>
          </div>
        </div>
      )}

      {/* VERSION HISTORY */}
      <div className="bg-white rounded-panel p-6 border border-line shadow-soft space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-navy-900" />
            <h2 className="font-serif font-bold text-lg text-navy-900">
              Timetable Version History
            </h2>
          </div>
          <span className="text-xs bg-slate-100 text-muted font-bold px-2.5 py-1 rounded-full">
            {historyList.length} Archived Versions
          </span>
        </div>

        {historyList.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted border border-dashed border-line rounded-2xl">
            No previous versions archived yet. Backups will appear here automatically upon subsequent timetable uploads.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-line text-muted uppercase font-bold text-[10px]">
                  <th className="py-2 px-3">Archived On</th>
                  <th className="py-2 px-3">Effective Date</th>
                  <th className="py-2 px-3">File / Label</th>
                  <th className="py-2 px-3">Entries</th>
                  <th className="py-2 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {historyList.map((hist) => (
                  <tr key={hist.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 text-muted">
                      {hist.savedAt ? new Date(hist.savedAt).toLocaleString() : 'Recent'}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-navy-900">
                      {hist.wef}
                    </td>
                    <td className="py-2.5 px-3 text-navy-700">
                      {hist.fileName || hist.label}
                    </td>
                    <td className="py-2.5 px-3 font-semibold">
                      {hist.entries?.length || 0} sessions
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => handleRestore(hist)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-navy-900 hover:text-green-700 bg-surface hover:bg-green-50 border border-line px-3 py-1 rounded-full transition-all cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Restore</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
