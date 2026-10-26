# InternTrack AI — Smart Internship Review & Automated Feedback Email System

**InternTrack AI** is an intelligent, automated supervisory platform designed to streamline internship progress tracking. It monitors incoming project submissions via Gmail OAuth and Web Portals, runs grounded, evidence-backed AI evaluations against project requirements, automatically dispatches formatted review feedback emails to verified intern addresses, dynamically schedules upcoming reviews, and sends automatic reminders.

---

## Architecture & Core Workflow

```
       [ Intern ]
    (Submits via Email
   or Intern Web Portal)
            │
            ▼
┌───────────────────────────────────────────────┐
│ 1. Automatic Submission Detection             │
│    • Gmail API (OAuth 2.0) with attachment dl │
│    • Duplicate detection & hash verification  │
│    • Demo / Sandbox Mode for offline testing  │
└──────────────────────┬────────────────────────┘
                       │
                       ▼
┌───────────────────────────────────────────────┐
│ 2. AI-Powered Grounded Project Review         │
│    • Google Gemini API (Flash/Pro)            │
│    • Grounded Heuristic Evaluator Fallback    │
│    • Requirement verification & AST checks    │
│    • Unresolved issue tracking from past revs │
│    • Score & Status assignment                │
└──────────────────────┬────────────────────────┘
                       │
                       ▼
┌───────────────────────────────────────────────┐
│ 3. Automated Review Feedback Email            │
│    • Responsive executive HTML template       │
│    • Verified intern email targeting          │
│    • Strict provider delivery confirmation    │
│    • Safe retry & duplicate prevention        │
└──────────────────────┬────────────────────────┘
                       │
                       ▼
┌───────────────────────────────────────────────┐
│ 4. Dynamic Milestone Scheduling               │
│    • Auto-calculates next review due date     │
│    • Needs Improvement: accelerated (2-3 d)   │
│    • In Progress: standard cadence (5-7 d)    │
│    • Background worker for 24-48h reminders   │
└───────────────────────────────────────────────┘
```

---

## Key Features

### 1. Automatic Email Submission Detection
- **Gmail API & Google OAuth 2.0**: Connects securely via official `googleapis` OAuth client.
- **Intern Verification**: Identifies incoming emails by matching sender address against registered interns.
- **Attachment Support**: Downloads and indexes project files (PDF, JS, TS, PY, Markdown, text, archives).
- **Duplicate Prevention**: Tracks Gmail Message IDs and computes SHA-256 content hashes to eliminate duplicate submissions.
- **Demo Mode Sandbox**: Full simulation environment enabled by default, allowing supervisors to test the entire receipt, review, scheduling, and feedback loop without requiring active Google Cloud credentials immediately.

### 2. AI-Powered Project Review
- **Grounded Evidence Analysis**: Strictly compares submitted content against project requirements. Never invents errors or claims requirements are missing without evidence citations.
- **Deficiency & Correction Engine**: Flags flaws and provides concrete, syntax-highlighted code corrections.
- **Unresolved Issues Tracking**: Carries forward issues from past reviews, evaluating whether the intern successfully resolved them (`[RESOLVED]` vs `[UNRESOLVED]`).
- **Objective Scoring & Status**:
  - `Needs Improvement`: Score < 60 or critical requirements missing
  - `In Progress`: Score 60–84, good progress with minor corrections
  - `Ready for Final Review`: Score ≥ 85, all core requirements satisfied

### 3. Automatically Sent Review Emails
- **Responsive HTML Template**: Clean executive layout with score badge, metadata, strengths, identified issues, and next milestone banner.
- **Clear Subject**: `InternTrack AI — Project Review Feedback: [Project] (Status: [Status])`.
- **Strict Delivery Verification**: Emails in Live Mode are only marked as `SENT` when the provider confirms transmission. In Demo Mode, deliveries are logged as `SIMULATED`.
- **Safe Retries**: Dedicated retry handler preventing duplicate sends with retry limit caps.

### 4. Dynamic Milestone Scheduling & Reminders
- **Smart Next Review Dates**: Adapts review intervals based on status and deadline.
- **Automated Reminder Worker**: Background interval checks for upcoming reviews due within 24–48 hours and dispatches friendly reminder emails.
- **Multi-Channel Revision**: Interns can submit revisions by replying to feedback emails or via the self-service web portal.

### 5. Role-Based Views & Dashboard
- **Supervisor Command Center**: 8 KPI cards, intern directory, AI review studio, email outbox, audit log drawer, and settings.
- **Intern Self-Service Portal**: Restricted access view where interns only see their assigned project, requirements checklist, past feedback, and can upload revisions.

---

## Quickstart & Local Setup

### 1. Prerequisites
- Node.js v18+ (tested on Node v22)
- npm v9+

### 2. Start the Application
Run the server:
```bash
# Start backend server (serves API and built client)
npm start
```

Or run in development mode with concurrent client hot-reloading:
```bash
npm run dev
```

The application is accessible at:
- **Web Application & API**: `http://localhost:5000`
- **Vite Dev Server** (if running `npm run client`): `http://localhost:5173`

---

## Configuration & Integrations

Access the **Settings Modal** from the top right gear icon in the UI:

| Setting | Description |
|---|---|
| `DEMO_MODE` | Toggle between Demo/Sandbox Mode (`true`) and Live Gmail OAuth (`false`). |
| `GMAIL_CLIENT_ID` | Google OAuth Client ID from Google Cloud Console. |
| `GMAIL_CLIENT_SECRET` | Google OAuth Client Secret (stored securely server-side). |
| `GMAIL_REDIRECT_URI` | `http://localhost:5000/api/auth/google/callback` |
| `GEMINI_API_KEY` | Google Gemini API key for deep reasoning (heuristic engine active as fallback). |
| `EMAIL_PROVIDER` | `demo` (Sandbox Outbox), `gmail_oauth`, or `smtp`. |
| `SMTP_HOST` / `PORT` / `USER` / `PASS` | Custom SMTP configuration. |
| `AUTO_SYNC_ENABLED` | Background worker automatic polling toggle. |

---

## Database Schema (SQLite)

The database is stored locally at `server/data/interntrack.db` with WAL mode enabled:
- `interns`: Profile information, verified email, role, department.
- `projects`: Assigned project, requirements JSON, deadline, current score, status.
- `submissions`: Email and web submissions, source, content hashes, message IDs.
- `attachments`: File paths, mime types, and snippet extracts.
- `reviews`: Scores, strengths, issues, corrections, unresolved tracking, next review date.
- `email_logs`: Outbox logs, recipient, HTML content, status (`SENT`, `FAILED`, `SIMULATED`, `QUEUED`), provider message ID, retries.
- `review_schedules`: Milestone dates, reminder status.
- `activity_logs`: Detailed supervisor audit trail.
- `settings`: Secure key-value configuration.
