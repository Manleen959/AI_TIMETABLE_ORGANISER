# SmartSchedule - Production Deployment Guide (Vercel & GitHub)

SmartSchedule is an AI-powered timetable organiser, substitute cover planner, and attendance management system built for **PCTE Ludhiana** (BTech Final Year Project).

This guide walks you through deploying SmartSchedule on **Vercel** with GitHub integration and **Firebase** backend.

---

## 1. Environment Variables Configuration

Configure these environment variables in your **Vercel Project Settings** (`Project Settings > Environment Variables`) and in your local `.env.local` for development:

| Variable | Environment | Description | Example / Note |
| :--- | :--- | :--- | :--- |
| `VITE_FIREBASE_API_KEY` | Client & Server | Firebase Web API Key | `AIzaSy...` |
| `VITE_FIREBASE_AUTH_DOMAIN` | Client | Firebase Authentication domain | `your-app.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Client & Server | Firebase Project ID | `your-app-id` |
| `VITE_FIREBASE_STORAGE_BUCKET` | Client | Firebase Storage bucket | `your-app.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID`| Client | Cloud Messaging sender ID | `123456789012` |
| `VITE_FIREBASE_APP_ID` | Client | Firebase Web Application ID | `1:123456789012:web:...` |
| `FIREBASE_API_KEY` | Server (`/api/ai`) | Server-side key to verify ID tokens | Same as `VITE_FIREBASE_API_KEY` |
| `GEMINI_API_KEY` | Server (`/api/ai`) | Google Gemini or NVIDIA NIM API Key | `AIzaSy...` or `nvapi-...` |
| `GEMINI_MODEL` | Server (`/api/ai`) | Model Identifier | `gemini-2.5-flash` or `nvidia/nemotron-3.5-bolt-e4b` |
| `NVIDIA_API_KEY` | Server (`/api/ai`) | Optional: NVIDIA NIM API Key | `nvapi-H6nHLY...` |
| `NVIDIA_MODEL` | Server (`/api/ai`) | Optional: NVIDIA Model Name | `nvidia/nemotron-3.5-bolt-e4b` |

> [!NOTE]
> All `VITE_*` variables are bundled into the client browser bundle at build time. Server variables (`FIREBASE_API_KEY`, `GEMINI_API_KEY`, `NVIDIA_API_KEY`) remain strictly confidential on Vercel Serverless functions.

---

## 2. Firebase Authorized Domains Configuration

For Google Sign-In and Firebase Authentication to work on your live production domain:

1. Open the [Firebase Console](https://console.firebase.google.com/).
2. Navigate to **Authentication** > **Settings** > **Authorized domains**.
3. Click **Add domain**.
4. Add your Vercel production domain:
   - `your-app.vercel.app`
   - Custom domain (e.g., `smartschedule.pcte.edu.in` if applicable)
   - `localhost` is already included by default for development.

---

## 3. Deploy Firestore Security Rules

To enforce strict, secure read/write permissions for students, teachers, and admins:

Deploy the verified rules defined in [`firestore.rules`](file:///c:/Users/Lenovo/Downloads/Gurjeet_Final/firestore.rules):

```bash
# Using the Firebase CLI
npx -y firebase-tools@latest deploy --only firestore:rules
```

Or copy the contents of `firestore.rules` directly into the [Firebase Console Firestore Rules tab](https://console.firebase.google.com/).

---

## 4. Root Administrator Credentials (`/login` & `/setup-admin`)

You can instantly log in to the administrative dashboard using the configured root administrator credentials:
- **Email**: `gurjeet@gmail.com`
- **Password**: `12345678`
- **Role**: `admin` (Full authority over timetable imports, room re-allocations, faculty swaps, absence reporting, and audit history)

Alternatively, on the Login page (`/login`), click the **Admin** button under **Quick Demo Test Accounts** to sign in instantly with one click.

---

## 5. Importing the First Timetable

1. Log in with your admin credentials.
2. In the sidebar, navigate to **Import Timetable** (`/import`).
3. Upload your college master timetable spreadsheet (`.xlsx` or `.xls`).
4. The SmartSchedule engine automatically:
   - Identifies active days (Monday through Saturday, 6 full days).
   - Extracts period slots, time bands, and lunch/tea breaks.
   - Normalizes faculty codes and venue allocations.
   - Detects combined batch classes (e.g. multi-section shared lectures).
5. Click **Publish Master Timetable** to write the active schedule into Firestore `timetables/current`.

---

## 6. Production Troubleshooting Guide

| Issue | Root Cause | Solution |
| :--- | :--- | :--- |
| **Blank White Screen** | Uncaught JavaScript error during first render | Check browser DevTools console. The top-level `ErrorBoundary` in `main.jsx` captures errors and offers a 1-click Reload button. Ensure all `VITE_*` keys are set in Vercel. |
| **404 on Page Refresh** | SPA router request intercepted by server as static file | Verify `vercel.json` contains `"rewrites": [{"source": "/((?!api/).*)", "destination": "/index.html"}]`. This ensures React Router handles deep URLs. |
| **Login Fails on Live Site** | Vercel domain not whitelisted in Firebase Auth | Add your Vercel deployment URL (`*.vercel.app`) to Firebase Console > Authentication > Settings > Authorized domains. |
| **API 401 Unauthorized** | Expired or missing Firebase ID Token | Ensure the client passes the Bearer ID token in the `Authorization` header (`Bearer <idToken>`). |
| **API 429 Rate Limit** | Client exceeded 20 requests/minute | The in-memory sliding window rate limiter protects backend AI endpoints. Wait 60 seconds before making additional AI requests. |
| **API 500 Server Error** | Missing `GEMINI_API_KEY` or `NVIDIA_API_KEY` | Set `GEMINI_API_KEY` (or `NVIDIA_API_KEY`) in Vercel Environment Variables and redeploy. |
| **CORS or Rules Error** | Querying multiple fields without composite indexes | Firestore rules strictly enforce querying on **ONE field only** (e.g. `where('classId', '==', id)`), with all secondary filtering handled client-side in JS memory. |

---

## 7. Push to GitHub Commands

To link and push your local production build to GitHub:

```bash
# 1. Add your GitHub remote repository
git remote add origin https://github.com/Manleen959/AI_TIMETABLE_ORGANISER.git

# 2. Push to the main branch
git push -u origin main
```
