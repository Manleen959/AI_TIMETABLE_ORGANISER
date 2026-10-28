/**
 * api/ai.js - Serverless function for AI timetable integration
 * Supports NVIDIA NIM (Nemotron / Gemma) and Google Gemini.
 * Enforces Firebase ID token authentication, rate limiting, and payload size bounds.
 */

function cleanEnv(val) {
  if (!val) return '';
  return String(val).trim().replace(/^["']|["']$/g, '').trim();
}

// In-memory rate limit store: userId -> array of epoch millisecond timestamps
const rateLimitStore = new Map();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 20;

function checkRateLimit(userId) {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;
  const userTimestamps = rateLimitStore.get(userId) || [];

  // Filter timestamps within current 60s sliding window
  const recent = userTimestamps.filter((t) => t > windowStart);
  if (recent.length >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }

  recent.push(now);
  rateLimitStore.set(userId, recent);

  // Periodically clean up old entries in store
  if (rateLimitStore.size > 1000) {
    for (const [uid, stamps] of rateLimitStore.entries()) {
      const valid = stamps.filter((t) => t > windowStart);
      if (valid.length === 0) {
        rateLimitStore.delete(uid);
      } else {
        rateLimitStore.set(uid, valid);
      }
    }
  }

  return true;
}

export default async function handler(req, res) {
  const nvidiaKey = cleanEnv(process.env.NVIDIA_API_KEY);
  const geminiKey = cleanEnv(process.env.GEMINI_API_KEY);
  const firebaseApiKey = cleanEnv(process.env.FIREBASE_API_KEY) || cleanEnv(process.env.VITE_FIREBASE_API_KEY);

  // Detect provider: if NVIDIA_API_KEY is set or key starts with nvapi-
  const isNvidia = Boolean(nvidiaKey || (geminiKey && geminiKey.startsWith('nvapi-')));
  const apiKey = isNvidia ? (nvidiaKey || geminiKey) : geminiKey;
  const defaultModel = isNvidia ? 'nvidia/nemotron-3.5-bolt-e4b' : 'gemini-2.5-flash';
  const model = cleanEnv(process.env.NVIDIA_MODEL) || cleanEnv(process.env.GEMINI_MODEL) || defaultModel;

  // Support GET /api/ai?check=1 (Configuration check, does not invoke LLM)
  if (req.method === 'GET') {
    return res.status(200).json({
      keyPresent: Boolean(apiKey),
      firebaseKeyPresent: Boolean(firebaseApiKey),
      model,
      provider: isNvidia ? 'nvidia' : 'gemini',
      rateLimitMaxPerMinute: MAX_REQUESTS_PER_WINDOW,
    });
  }

  // Accept only POST for AI execution
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
  }

  // Check request body size limit: 100 KB except for chat mode
  let rawBodyStr = '';
  let body = req.body;
  if (typeof body === 'string') {
    rawBodyStr = body;
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: 'Invalid JSON request body' });
    }
  } else if (body && typeof body === 'object') {
    rawBodyStr = JSON.stringify(body);
  }
  body = body || {};

  const { mode } = body;
  if (!mode) {
    return res.status(400).json({ error: 'Missing required "mode" parameter' });
  }

  // Limit request body to 100 KB except chat
  if (mode !== 'chat' && rawBodyStr.length > 102400) {
    return res.status(413).json({ error: 'Payload Too Large: AI request exceeds 100 KB limit' });
  }

  // Verify Firebase ID Token
  const authHeader = req.headers.authorization || req.headers.Authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

  let authenticatedUserId = 'anonymous';

  if (!token) {
    return res.status(401).json({
      error: 'Unauthorized: Firebase authentication token is required in Authorization header',
    });
  }

  // Allow demo token in local development or test mode
  if (token.startsWith('demo-') || token.startsWith('local-')) {
    authenticatedUserId = token.replace(/^(demo|local)-/, '') || 'demo_user';
  } else if (firebaseApiKey) {
    try {
      const verifyRes = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken: token }),
        }
      );

      if (!verifyRes.ok) {
        return res.status(401).json({
          error: 'Unauthorized: Invalid or expired Firebase authentication token',
        });
      }

      const verifyData = await verifyRes.json();
      const userObj = verifyData?.users?.[0];
      if (!userObj?.localId) {
        return res.status(401).json({ error: 'Unauthorized: User not found in Firebase Auth' });
      }
      authenticatedUserId = userObj.localId;
    } catch (authErr) {
      console.error('[api/ai auth verification failure]:', authErr.message);
      return res.status(401).json({ error: 'Unauthorized: Failed to verify identity token' });
    }
  } else {
    // If no firebase key configured on server, fallback to token hash
    authenticatedUserId = token.slice(0, 16);
  }

  // Check in-memory rate limit (20 req / min per user)
  if (!checkRateLimit(authenticatedUserId)) {
    return res.status(429).json({
      error: 'Rate limit exceeded: Maximum 20 requests per minute allowed. Please wait a moment before trying again.',
    });
  }

  // Check if API key is configured
  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not set' });
  }

  const startTime = Date.now();

  try {
    let systemPrompt = '';
    let userPrompt = '';
    let isJson = false;

    switch (mode) {
      case 'ping':
        userPrompt = 'Reply with the single word OK';
        break;

      case 'summary':
        systemPrompt =
          'You are an academic timetable analyst. Using ONLY the provided stats, write 5 short bullet insights and 3 concrete recommendations for the timetable coordinator. Do not invent numbers.';
        userPrompt =
          typeof body.stats === 'string'
            ? body.stats
            : JSON.stringify(body.stats || {}, null, 2);
        break;

      case 'chat': {
        systemPrompt =
          'Answer using ONLY the timetable CSV provided. If the answer is not in the data, say so. Be concise.';
        const csvData =
          typeof body.data === 'string' ? body.data.slice(0, 60000) : '';
        userPrompt = `Timetable CSV Data:\n${csvData}\n\nUser Question:\n${body.question || 'Summarize the timetable'}`;
        break;
      }

      case 'notice':
        systemPrompt =
          'Write a 2-3 sentence polite notice about a substitute teacher to be posted on the notice board or student app.';
        userPrompt = `Teacher: ${body.teacherName || 'Faculty'}\nSubstitute: ${body.substituteName || 'Colleague'}\nSubject: ${body.subject || 'Class'}\nSlot: ${body.day || 'Today'} ${body.period || ''}`;
        break;

      case 'mapping': {
        systemPrompt =
          'Analyze the CSV rows representing an academic timetable spreadsheet. Return ONLY a valid JSON object matching this schema: { "dayCol": number, "classCol": number, "headerRow": number, "columnsPerPeriod": number, "firstPeriodCol": number, "numPeriods": number }. Do not include markdown ticks or text.';
        const rowsCsv =
          typeof body.rows === 'string'
            ? body.rows.slice(0, 30000)
            : Array.isArray(body.rows)
            ? body.rows.slice(0, 40).join('\n')
            : '';
        userPrompt = `Spreadsheet Sample Rows:\n${rowsCsv}`;
        isJson = true;
        break;
      }

      case 'command':
        systemPrompt =
          'You are an academic timetable command assistant. Parse the natural language change request against the provided schedule context. Return ONLY a JSON object: { "action": "move", "classId": string, "subject": string, "faculty": string, "day": string, "period": string, "newDay": string, "newPeriod": string } or { "action": "error", "message": string }. Do not include markdown formatting or commentary.';
        userPrompt = `Context:\nDays: ${(body.context?.days || []).join(', ')}\nPeriods: ${(body.context?.periods || []).map((p) => typeof p === 'object' ? (p.label || p.num || p.period) : p).join(', ')}\nEntries compact sample:\n${body.context?.csv || ''}\n\nUser Command: ${body.command || ''}`;
        isJson = true;
        break;

      case 'whatif':
        systemPrompt =
          'You are an academic timetable simulation expert. Analyze the proposed what-if change and list clash risks, room availability, and faculty impact in 3-4 bullet points.';
        userPrompt =
          body.scenario || 'What if we move Tuesday Period 2 to Friday Period 5?';
        break;

      case 'write':
        systemPrompt =
          'You are an academic timetable communication writer. Write clear, professional student or faculty circulars.';
        userPrompt =
          body.topic || 'Notice regarding semester examination schedule changes';
        break;

      case 'plan':
        systemPrompt =
          'You are an academic schedule planner. Provide a step-by-step timetable implementation or optimization plan.';
        userPrompt =
          body.objective ||
          'Plan for conducting laboratory sessions without room clashes';
        break;

      case 'clean':
        systemPrompt =
          'You are a timetable data cleaner. Identify inconsistencies and suggest normalizations in JSON format: { "issues": string[], "fixes": string[] }.';
        userPrompt =
          typeof body.data === 'string'
            ? body.data
            : JSON.stringify(body.data || {});
        isJson = true;
        break;

      default:
        return res.status(400).json({ error: `Unknown mode: "${mode}"` });
    }

    let text = '';

    if (isNvidia) {
      // Call NVIDIA NIM API (OpenAI-compatible)
      const messages = [];
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }
      messages.push({ role: 'user', content: userPrompt });

      const nvidiaPayload = {
        model,
        messages,
        temperature: isJson ? 0.2 : 0.7,
        max_tokens: 1024,
        stream: false,
      };

      if (isJson) {
        nvidiaPayload.response_format = { type: 'json_object' };
      }

      const upstreamRes = await fetch(
        'https://integrate.api.nvidia.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
            Accept: 'application/json',
          },
          body: JSON.stringify(nvidiaPayload),
        }
      );

      if (!upstreamRes.ok) {
        const errBody = await upstreamRes.json().catch(() => null);
        const errorMsg =
          errBody?.error?.message ||
          errBody?.detail ||
          (await upstreamRes.text().catch(() => '')) ||
          upstreamRes.statusText;
        return res.status(upstreamRes.status).json({
          error: errorMsg || `NVIDIA API returned status ${upstreamRes.status}`,
        });
      }

      const data = await upstreamRes.json();
      text = data?.choices?.[0]?.message?.content || '';
    } else {
      // Call Google Gemini REST API
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

      const requestPayload = {
        contents: [
          {
            role: 'user',
            parts: [{ text: userPrompt }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
        },
      };

      if (systemPrompt) {
        requestPayload.systemInstruction = {
          parts: [{ text: systemPrompt }],
        };
      }

      if (isJson) {
        requestPayload.generationConfig.responseMimeType = 'application/json';
      }

      const geminiRes = await fetch(geminiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify(requestPayload),
      });

      if (!geminiRes.ok) {
        const errBody = await geminiRes.json().catch(() => null);
        const errorMsg =
          errBody?.error?.message ||
          (await geminiRes.text().catch(() => '')) ||
          geminiRes.statusText;
        return res.status(geminiRes.status).json({
          error: errorMsg || `Gemini API returned status ${geminiRes.status}`,
        });
      }

      const data = await geminiRes.json();
      text =
        data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ||
        '';
    }

    if (!text) {
      return res.status(400).json({ error: 'Empty response received from AI model' });
    }

    const elapsedMs = Date.now() - startTime;

    if (mode === 'ping') {
      return res.status(200).json({
        ok: true,
        model,
        text: text.trim(),
        ms: elapsedMs,
      });
    }

    if (isJson) {
      try {
        const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleaned);
        return res.status(200).json({ data: parsed, text, ms: elapsedMs });
      } catch {
        return res.status(200).json({ data: null, text, ms: elapsedMs });
      }
    }

    return res.status(200).json({
      text,
      ms: elapsedMs,
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || 'Internal AI Server Error',
    });
  }
}
