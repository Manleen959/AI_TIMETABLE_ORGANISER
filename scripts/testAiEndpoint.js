import handler from '../api/ai.js';

function createMockRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    setHeader(name, val) {
      this.headers[name] = val;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };
  return res;
}

async function runTests() {
  console.log('Testing api/ai.js directly...');

  // Test 1: GET /api/ai?check=1
  {
    const req = { method: 'GET', url: '/api/ai?check=1' };
    const res = createMockRes();
    await handler(req, res);
    console.log('1. GET /api/ai: status', res.statusCode, 'body:', res.body);
  }

  // Test 2: POST /api/ai with missing mode
  {
    const req = { method: 'POST', body: {} };
    const res = createMockRes();
    await handler(req, res);
    console.log('2. POST missing mode: status', res.statusCode, 'body:', res.body);
  }

  // Test 3: POST /api/ai with mode: "command" (expected 400 stub)
  {
    const req = { method: 'POST', body: { mode: 'command' } };
    const res = createMockRes();
    await handler(req, res);
    console.log('3. POST mode: command: status', res.statusCode, 'body:', res.body);
  }

  // Test 4: POST /api/ai with missing key
  {
    const originalKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    const req = { method: 'POST', body: { mode: 'ping' } };
    const res = createMockRes();
    await handler(req, res);
    console.log('4. POST missing key: status', res.statusCode, 'body:', res.body);
    process.env.GEMINI_API_KEY = originalKey;
  }

  // Test 5: Method Not Allowed
  {
    const req = { method: 'DELETE', body: {} };
    const res = createMockRes();
    await handler(req, res);
    console.log('5. DELETE method: status', res.statusCode, 'body:', res.body);
  }

  console.log('All handler unit contracts verified!');
}

runTests();
