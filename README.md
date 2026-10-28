# SmartSchedule — AI Timetable Organiser for PCTE Ludhiana
**B.Tech Final Year Capstone Project**

SmartSchedule is an intelligent academic timetable organiser designed specifically for **PCTE Group of Institutes, Ludhiana**. It automatically transforms raw multi-period institutional Excel master spreadsheets into clash-free, personalized class and faculty schedules.

---

## 🚀 Tech Stack

- **Frontend Core**: React 19 + Vite 8
- **Styling**: Tailwind CSS + Curated Design Tokens (`navy-900`, `green-600`, `lime-300`, `orange-500`, Fraunces serif + Inter sans)
- **State & Context**:
  - `TimetableContext`: Single source of truth reading `timetables/current` once and memoizing heavy insights (K-Means, clash analysis, room occupancy).
  - `AuthContext`: Firebase Auth + local fallback with normalized role and cohort IDs.
  - `useMyEntries`: Strict hook preventing unauthorized data leakage across student sections.
- **Backend & Cloud**:
  - **Firebase Auth**: Email/Password + Google Sign-In (`GoogleAuthProvider`) + Secondary Auth Instance.
  - **Cloud Firestore**: Real-time collections: `timetables/current`, `timetableHistory`, `substitutions`, and `users/{uid}`.
  - **Security Rules**: Robust `firestore.rules` deployed live with role protection and student cohort immutability.
- **AI Engine (Dual-Provider Architecture)**:
  - **Option 1 (Default)**: NVIDIA NIM API (`nvidia/nemotron-3.5-bolt-e4b`) for sub-500ms JSON responses.
  - **Option 2**: Google Gemini API (`gemini-2.5-flash`) via REST API.
  - **Security**: Server-side Firebase ID token verification, 100 KB payload boundary, and 20 req/min in-memory rate limiting.
- **Parser Engine**: SheetJS (`xlsx`) with custom layout detector (`src/utils/parseTimetable.js`).
- **Export Engine**: RFC 5545 iCalendar (`.ics`) exporter for Google Calendar with `Asia/Kolkata` `VTIMEZONE`.

---

## 🎨 Design System Tokens

- `navy-900`: `#052A66`
- `navy-700`: `#0A44A8`
- `green-600`: `#0E7C5A`
- `lime-300`: `#C6EBA0`
- `orange-500`: `#F26B21`
- `ink`: `#0B1B3A`
- `muted`: `#5B6B8A`
- `surface / bg`: `#F4F7FD`
- `line`: `#E3E9F5`
- **Radii**: Cards (`20px`), Panels (`28px`), Hero Panel (`48px`), Buttons (fully rounded pills).
- **Typography**: Google Fonts `"Fraunces"` for headings; `"Inter"` for body.

---

## 🛠️ How to Run Locally

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local` and `.env`:
```bash
cp .env.example .env.local
```
Fill in your Firebase credentials and your preferred AI key (`NVIDIA_API_KEY` or `GEMINI_API_KEY`).

### 3. Start Development Server
```bash
npm run dev
```
Open [http://localhost:5173](http://localhost:5173). The Vite dev server includes built-in middleware routing `/api/ai` directly to `api/ai.js`.

---

## 🚀 Deployment Steps

### Option A: Vercel (Recommended for full Serverless support)
1. Push your repository to GitHub.
2. Import project in the [Vercel Dashboard](https://vercel.com).
3. Under **Project Settings > Environment Variables**, add:
   - `FIREBASE_API_KEY`
   - `NVIDIA_API_KEY` (or `GEMINI_API_KEY`)
   - `NVIDIA_MODEL` (e.g. `nvidia/nemotron-3.5-bolt-e4b`)
   - All client `VITE_FIREBASE_*` variables.
4. Click **Deploy**. Vercel will host both the React client bundle and the serverless endpoint `/api/ai`.

### Option B: Firebase Hosting & Firestore Rules
```bash
# Deploy Firestore security rules
firebase deploy --only firestore:rules

# Deploy static web assets
npm run build
firebase deploy --only hosting
```

---

## 🔍 Troubleshooting Guide

### 1. Student sees "233 Periods Today" instead of their class
- **Cause**: Student profile has no `classId` set, or the stored `classId` does not match the active timetable.
- **Fix**: The single source of truth hook `useMyEntries` detects missing or mismatched classes and renders the friendly `ClassSelectorCard`. Select your cohort (e.g., `BCA-1A`) and click "Save & View Timetable". All timetable entries are normalized (`BCA 1A` ➔ `BCA-1A`).

### 2. "API route not found - run vercel dev"
- **Cause**: The application is running on a static file server without serverless function execution.
- **Fix**: Run `npm run dev` (which includes Vite middleware for `/api/ai`) or `npx vercel dev`.

### 3. Rate Limit Exceeded (Status 429)
- **Cause**: User issued more than 20 AI requests within a single minute.
- **Fix**: The in-memory sliding window rate limiter protects backend quotas. Wait 60 seconds before issuing additional AI reasoning requests.

### 4. Excel Spreadsheet Import Layout Recognition
- **Cause**: Spreadsheets with custom merged headers or shifted day columns.
- **Fix**: Navigate to **Import Timetable > Mapping Wizard** and click **"ASK AI TO SUGGEST MAPPING"**. The AI parser will scan the matrix and configure the exact column indices for Day, Section, and Period slots automatically.
