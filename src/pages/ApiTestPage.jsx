import React, { useState, useEffect } from 'react';
import { checkAIConfig, callAI } from '../utils/aiClient';
import { 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Play, 
  Terminal, 
  ShieldCheck, 
  Clock, 
  Layers 
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function ApiTestPage() {
  const [config, setConfig] = useState(null);
  const [checkingConfig, setCheckingConfig] = useState(true);
  const [activeTest, setActiveTest] = useState(null);
  const [testResults, setTestResults] = useState({});

  async function loadConfig() {
    setCheckingConfig(true);
    try {
      const cfg = await checkAIConfig();
      setConfig(cfg);
    } catch (err) {
      toast.error('Could not load AI configuration: ' + err.message);
    } finally {
      setCheckingConfig(false);
    }
  }

  useEffect(() => {
    loadConfig();
  }, []);

  async function runModeTest(mode, payload) {
    setActiveTest(mode);
    const start = Date.now();
    try {
      const res = await callAI(mode, payload);
      const elapsed = Date.now() - start;
      setTestResults(prev => ({
        ...prev,
        [mode]: {
          status: 'success',
          ms: res.ms || elapsed,
          data: res.data || res.text,
        },
      }));
      toast.success(`Mode "${mode}" passed in ${res.ms || elapsed}ms!`);
    } catch (err) {
      const elapsed = Date.now() - start;
      setTestResults(prev => ({
        ...prev,
        [mode]: {
          status: 'error',
          ms: elapsed,
          error: err.message,
        },
      }));
    } finally {
      setActiveTest(null);
    }
  }

  const testSuites = [
    {
      mode: 'ping',
      title: '1. Health Ping',
      desc: 'Verify endpoint connectivity and rapid responsiveness',
      payload: {},
    },
    {
      mode: 'summary',
      title: '2. Clash & Workload Summary',
      desc: 'Generate bullet insights and recommendations from timetable stats',
      payload: {
        stats: {
          totalEntries: 233,
          clashesCount: 0,
          facultyCount: 12,
          overloadedCount: 1,
        },
      },
    },
    {
      mode: 'notice',
      title: '3. Substitute Notice Draft',
      desc: 'Draft circular notice when a faculty member is absent',
      payload: {
        teacherName: 'Dr. Sharma',
        substituteName: 'Prof. Gurjeet Singh',
        subject: 'Database Systems',
        day: 'Monday',
        period: 'Period 2',
      },
    },
    {
      mode: 'command',
      title: '4. Natural Language Solver Command',
      desc: 'Parse "Move Dr. Sharma Mathematics from Monday P1 to Tuesday P2" to JSON',
      payload: {
        command: 'Move Dr. Sharma Mathematics on Monday Period 1 to Tuesday Period 2',
        context: {
          days: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
          periods: ['1', '2', '3', '4', '5', '6', '7'],
        },
      },
    },
    {
      mode: 'mapping',
      title: '5. Excel Mapping Wizard',
      desc: 'Detect spreadsheet layout columns and period offsets in JSON format',
      payload: {
        rows: [
          'DAY,CLASS,PERIOD 1,PERIOD 2,PERIOD 3',
          'MONDAY,BCA-1A,HVPE/ET-203,MATHS/ET-310,DS/ET-407',
        ],
      },
    },
    {
      mode: 'chat',
      title: '6. Timetable AI Buddy Q&A',
      desc: 'Natural language question answering grounded in timetable data',
      payload: {
        question: 'Who teaches BCA-1A on Monday?',
        data: 'DAY,CLASS,PERIOD,SUBJECT,FACULTY,VENUE\nMONDAY,BCA-1A,1,HVPE,ANURAG,ET-203',
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-panel p-6 border border-line shadow-soft flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-navy-50 text-navy-700 text-[11px] font-bold uppercase mb-2">
            <Terminal className="w-3.5 h-3.5" />
            <span>Admin Diagnostics</span>
          </div>
          <h1 className="font-serif text-2xl font-bold text-navy-900">
            AI Engine &amp; API Mode Test
          </h1>
          <p className="text-xs text-muted mt-1">
            Validate active LLM provider (NVIDIA NIM or Google Gemini), rate limits, authentication tokens, and JSON reasoning modes.
          </p>
        </div>

        <button
          onClick={loadConfig}
          disabled={checkingConfig}
          className="flex items-center gap-2 bg-surface hover:bg-slate-100 text-navy-900 border border-line px-4 py-2 rounded-full text-xs font-bold transition-all shadow-xs self-start md:self-auto cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${checkingConfig ? 'animate-spin' : ''}`} />
          <span>Refresh Config</span>
        </button>
      </div>

      {/* Configuration Status Card */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-card border border-line shadow-soft">
          <div className="text-[11px] font-bold uppercase text-muted mb-1">Provider</div>
          <div className="font-serif font-bold text-lg text-navy-900 capitalize">
            {config?.provider || 'Detecting...'}
          </div>
          <div className="text-xs text-green-700 font-semibold mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>{config?.provider === 'nvidia' ? 'NVIDIA NIM High Speed' : 'Google Gemini'}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-card border border-line shadow-soft">
          <div className="text-[11px] font-bold uppercase text-muted mb-1">Model Name</div>
          <div className="font-serif font-bold text-base text-navy-900 truncate">
            {config?.model || 'Loading...'}
          </div>
          <div className="text-[11px] text-muted mt-1">Sub-second inference</div>
        </div>

        <div className="bg-white p-5 rounded-card border border-line shadow-soft">
          <div className="text-[11px] font-bold uppercase text-muted mb-1">API Key Configured</div>
          <div className="font-serif font-bold text-lg text-navy-900">
            {config?.keyPresent ? (
              <span className="text-green-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-green-600" /> Active
              </span>
            ) : (
              <span className="text-red-600 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-red-500" /> Not Set
              </span>
            )}
          </div>
          <div className="text-[11px] text-muted mt-1">Stored securely on server</div>
        </div>

        <div className="bg-white p-5 rounded-card border border-line shadow-soft">
          <div className="text-[11px] font-bold uppercase text-muted mb-1">Security &amp; Rate Limit</div>
          <div className="font-serif font-bold text-lg text-navy-900">
            20 req / min
          </div>
          <div className="text-[11px] text-green-700 font-semibold mt-1 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-navy-700" />
            <span>Token auth enforced</span>
          </div>
        </div>
      </div>

      {/* Test Suites Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {testSuites.map((suite) => {
          const result = testResults[suite.mode];
          const isRunning = activeTest === suite.mode;

          return (
            <div
              key={suite.mode}
              className="bg-white rounded-panel p-5 border border-line shadow-soft flex flex-col justify-between space-y-4"
            >
              <div>
                <div className="flex items-center justify-between">
                  <h3 className="font-serif font-bold text-base text-navy-900">
                    {suite.title}
                  </h3>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-navy-700 font-semibold">
                    mode: &quot;{suite.mode}&quot;
                  </span>
                </div>
                <p className="text-xs text-muted mt-1">{suite.desc}</p>
              </div>

              {/* Output Preview */}
              {result && (
                <div
                  className={`p-3.5 rounded-xl border text-xs font-mono max-h-48 overflow-y-auto ${
                    result.status === 'success'
                      ? 'bg-green-50/50 border-green-200 text-green-950'
                      : 'bg-red-50/50 border-red-200 text-red-950'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold text-[11px] mb-1.5 pb-1 border-b border-line">
                    <span className="flex items-center gap-1">
                      {result.status === 'success' ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                      )}
                      {result.status.toUpperCase()}
                    </span>
                    <span className="text-muted flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {result.ms}ms
                    </span>
                  </div>
                  <pre className="whitespace-pre-wrap break-words text-[11px] font-mono">
                    {typeof result.data === 'object'
                      ? JSON.stringify(result.data, null, 2)
                      : result.data || result.error}
                  </pre>
                </div>
              )}

              <div className="pt-2 flex items-center justify-between border-t border-line">
                <span className="text-[11px] text-muted">
                  Payload: {JSON.stringify(suite.payload).length} bytes
                </span>
                <button
                  onClick={() => runModeTest(suite.mode, suite.payload)}
                  disabled={isRunning}
                  className="bg-navy-900 hover:bg-navy-700 text-white px-4 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Play className={`w-3 h-3 ${isRunning ? 'animate-spin' : ''}`} />
                  <span>{isRunning ? 'Running...' : 'Run Test'}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
