/**
 * src/utils/aiClient.js
 * Client helper for invoking /api/ai with Firebase ID token, error normalization, and toasts
 */
import { auth, isFirebaseConfigured } from '../firebase';
import toast from 'react-hot-toast';

export async function callAI(mode, payload = {}) {
  let idToken = '';

  try {
    if (isFirebaseConfigured && auth.currentUser) {
      idToken = await auth.currentUser.getIdToken();
    } else {
      // Check if demo user is stored
      const demoUser = localStorage.getItem('smartschedule_demo_user');
      if (demoUser) {
        try {
          const parsed = JSON.parse(demoUser);
          idToken = `demo-${parsed.uid || 'demo_user'}`;
        } catch {
          idToken = 'demo-user';
        }
      } else {
        idToken = 'demo-guest';
      }
    }
  } catch (tokenErr) {
    console.warn('Could not retrieve auth token:', tokenErr);
    idToken = 'demo-guest';
  }

  let response;
  try {
    response = await fetch('/api/ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        mode,
        ...payload,
      }),
    });
  } catch {
    const errorMsg = 'API route not found - run vercel dev';
    toast.error(errorMsg);
    throw new Error(errorMsg);
  }

  const contentType = response.headers.get('content-type') || '';
  const text = await response.text();

  // Handle non-JSON responses such as an HTML 404 page from static hosts
  if (
    !contentType.includes('application/json') &&
    (text.trim().startsWith('<!DOCTYPE') ||
      text.trim().startsWith('<html') ||
      response.status === 404)
  ) {
    const errorMsg = 'API route not found - run vercel dev';
    toast.error(errorMsg);
    throw new Error(errorMsg);
  }

  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    const errorMsg = !response.ok
      ? `Server returned status ${response.status}: ${text.slice(0, 80)}`
      : 'API route not found - run vercel dev';
    toast.error(errorMsg);
    throw new Error(errorMsg);
  }

  if (!response.ok || data?.error) {
    const errorMsg =
      data?.error || `AI request failed with status ${response.status}`;
    toast.error(errorMsg);
    throw new Error(errorMsg);
  }

  return data;
}

/**
 * Check configuration via GET /api/ai?check=1
 */
export async function checkAIConfig() {
  let res;
  try {
    res = await fetch('/api/ai?check=1', { method: 'GET' });
  } catch {
    throw new Error('API route not found - run vercel dev');
  }

  const contentType = res.headers.get('content-type') || '';
  const text = await res.text();

  if (
    !contentType.includes('application/json') &&
    (text.trim().startsWith('<!DOCTYPE') ||
      text.trim().startsWith('<html') ||
      res.status === 404)
  ) {
    throw new Error('API route not found - run vercel dev');
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error('API route not found - run vercel dev');
  }
}

/**
 * Health check ping via POST /api/ai { mode: "ping" }
 */
export async function pingAI() {
  return await callAI('ping');
}
