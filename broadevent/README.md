# BroadEvent AutoAlert

AI-powered platform for broadcasting professionals to automatically search,
track, and report on domestic and international media industry events.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS |
| Calendar | FullCalendar (React) |
| State | Zustand |
| Auth / DB | Firebase Authentication + Firestore |
| File Storage | Firebase Storage |
| AI (default) | **OpenAI GPT-4o (Codex)** via `openai` SDK |
| AI (alt) | Anthropic Claude API |
| AI Proxy | Cloudflare Worker (production) |
| Report Gen | `docx` npm library → `.docx` download |
| Deploy | Cloudflare Pages + Cloudflare Workers |

---

## Quick Start

### 1. Clone & install

```bash
git clone https://github.com/your-org/broadevent-autoalert.git
cd broadevent-autoalert
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Fill in values in .env
```

Minimum required in `.env`:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...

VITE_AI_PROVIDER=codex
VITE_AI_MODEL=gpt-4o
VITE_OPENAI_API_KEY=sk-...
```

### 3. Run locally

```bash
npm run dev
# Vite dev server: http://localhost:5173
```

Optional: run Firebase Emulator Suite alongside:

```bash
firebase emulators:start
```

---

## AI Provider Configuration

The AI provider can be changed **without touching any code**:

| Setting | Value | Description |
|---|---|---|
| `VITE_AI_PROVIDER` | `codex` | OpenAI GPT-4o (default, recommended) |
| `VITE_AI_PROVIDER` | `claude` | Anthropic Claude (dev only) |
| `VITE_AI_PROVIDER` | `worker` | Cloudflare Worker proxy (production) |
| `VITE_AI_MODEL` | `gpt-4o` / `gpt-4o-mini` / `o3` | Override model for Codex |
| `VITE_AI_MODEL` | `claude-sonnet-4-20250514` | Override model for Claude |

Users can also switch the provider at runtime via the **AI button** in the top nav (⚙ AI).

### Switching to Claude

```env
VITE_AI_PROVIDER=claude
VITE_AI_MODEL=claude-sonnet-4-20250514
VITE_CLAUDE_API_KEY=sk-ant-...
```

### Production (Cloudflare Worker proxy — recommended)

```env
VITE_AI_PROVIDER=worker
VITE_WORKER_URL=https://broadevent-worker.your-subdomain.workers.dev
```

Deploy the worker:

```bash
# Set secrets server-side (keys never touch the browser)
wrangler secret put OPENAI_API_KEY
wrangler secret put CLAUDE_API_KEY

# Deploy
wrangler deploy
```

---

## Build & Deploy

### Frontend → Cloudflare Pages

```bash
npm run build          # outputs dist/
# Push to GitHub → Cloudflare Pages auto-deploys on push to main
```

Cloudflare Pages settings:
- Build command: `npm run build`
- Build output directory: `dist`

### Firebase

```bash
firebase deploy --only firestore:rules,storage
```

---

## Project Structure

```
broadevent-autoalert/
├── src/
│   ├── components/
│   │   ├── auth/          LoginPage
│   │   ├── dashboard/     Dashboard, InterestFilterPanel, AiSettingsModal
│   │   ├── calendar/      EventCalendar (FullCalendar)
│   │   ├── events/        EventTable, ManualEventForm, FileUploadCell,
│   │   │                  NewsSummaryModal
│   │   ├── reports/       SeminarReportPage, ExhibitionReportPage,
│   │   │                  ReportTypeModal, ReportFormShared
│   │   └── shared/        LoadingSpinner, Modal, FileDropzone, Toast
│   ├── hooks/             useAuth
│   ├── lib/               ai.ts (multi-provider), firebase.ts,
│   │                      firestore.ts, storageHelpers.ts, docxGenerator.ts
│   ├── store/             Zustand global store
│   └── types/             TypeScript interfaces
├── worker/
│   └── index.js           Cloudflare Worker AI proxy
├── public/                Static assets
├── firestore.rules
├── storage.rules
├── firebase.json
├── wrangler.toml
└── .env.example
```

---

## Feature Reference (PRD Numbering)

| PRD Ref | Feature | Component |
|---|---|---|
| ① | Interest filter (3-row) | `InterestFilterPanel` |
| ② | Free-text keyword search | `InterestFilterPanel` |
| ③ | Monthly calendar | `EventCalendar` |
| ④ | Event list table (9 cols) | `EventTable` |
| ⑤ | Manual event entry form | `ManualEventForm` |
| ⑥ | Image OCR auto-fill | `ManualEventForm` + `ai.ts` |
| ⑦ | Presentation paper upload | `FileUploadCell` |
| ⑧ | Meeting result upload | `FileUploadCell` |
| ⑪ | News summary (AI) | `NewsSummaryModal` |
| ⑨ | Report column | `EventTable` |
| ⑬ | Write report → popup | `ReportTypeModal` |
| ⑭ | Seminar report tab | `SeminarReportPage` |
| ⑮ | Exhibition report tab | `ExhibitionReportPage` |
| ⑰ | Type selection popup | `ReportTypeModal` |
| ⑯/⑳ | Page count / font size | `ReportFormShared` |
| Save/Load | Firestore sync | `Dashboard` + `firestore.ts` |
