# DeWages — Codebase Walkthrough for Presentation

Use this when a reviewer asks "where in the code does X happen?"
Open the file they name, scroll to the line, and explain the one-liner below.

---

## Architecture — The Big Picture

**Short answer if they ask:** *"We use a three-layer architecture — a React frontend, a Node.js REST API backend, and a Solana smart contract. The frontend talks to the backend via HTTP, and both the frontend and backend talk directly to Solana via RPC."*

---

### Layer 1 — Frontend (Component-Based Architecture)

**What it is:** React with Vite. Component-based means the UI is broken into small reusable pieces that each manage their own look and behaviour.

**How it's organised — 4 levels:**

```
main.jsx          ← Entry point. Mounts the whole app into the HTML page.
App.jsx           ← Wraps everything in providers (wallet, i18n, router)
router.js         ← Maps URLs to pages  e.g. /worker/profile → WorkerProfilePage
pages/            ← Full screens. One file = one screen.
components/       ← Reusable pieces used inside pages.
  ProofCaptureModal.jsx   ← The camera + GPS + OTP component
  common/                 ← Buttons, language switcher, etc.
hooks/            ← Reusable logic.  useAuth.js, useApi.js
context/          ← Global shared state.  WalletContext.jsx
```

**State management:** No Redux. Just React's built-in `useState` (local state per component) and `Context API` (global state shared across the whole app). The wallet address is kept in `WalletContext` so every page can read it without passing it around.

**How pages talk to the backend:** Axios. Every page that needs data does `axios.get(BACKEND_URL + "/worker/profile/me")` — a simple HTTP call. The backend URL is set in `frontend/src/env-variables.js`.

**How pages talk to Solana:** Directly via `@solana/web3.js` and `@coral-xyz/anchor`. Some pages (PostJobModal, WorkerProfilePage) bypass the backend entirely and call Solana RPC directly. This is what the On-Chain Data tab does.

**Multilingual:** `i18n.js` + `locales/` folder. Strings are stored in JSON files per language (`en.json`, `hi.json`, `mr.json`). The `useTranslation()` hook swaps them at runtime.

---

### Layer 2 — Backend (Module-Based MVC Architecture)

**What it is:** Express.js (Node.js). Module-based means each domain (workers, companies, jobs, admin) has its own independent module. MVC means each module is split into three parts: Router → Controller → Model.

**The pattern for every domain:**

```
router/jobRouter.js         ← "Which URL goes to which function?"
controller/jobController.js ← "What does that function actually do?"
model/jobModel.js           ← "What does the data look like in MongoDB?"
```

**Concrete example — posting a job:**
1. Frontend sends `POST /v1/job/create`
2. `jobRouter.js` receives it, checks the JWT via `authMiddleware`, passes to `createJob`
3. `jobController.js → createJob()` validates the payload, saves to MongoDB via `Job.create()`
4. `jobModel.js` defines what fields a job has (`title`, `paymentAmount`, `status`, etc.)

**Authentication:** JWT tokens. When a worker/company signs in, the backend issues a JWT token signed with a secret key. Every protected request must include this token in the `Authorization` header. `authMiddleware.js` verifies it on every request — if it's missing or fake, the request is rejected with 401.

**Cron jobs — this is the closest thing to event-based:** `cronController.js` runs on a timer and automatically releases payments after the dispute window expires. It's not reacting to an event — it polls regularly and checks if any jobs are ready. Think of it as a scheduled task, not a real-time event listener.

**File uploads:** Multer receives the file (photo, document, logo), holds it in memory as a buffer, and passes it to `s3UploadService.js` which pushes it to AWS S3 and returns a public URL.

---

### Layer 3 — Smart Contract (Instruction-Based Architecture)

**What it is:** A Rust program on the Solana blockchain, written using the Anchor framework. It lives in `smart-contract/employment_contract.rs`.

**How Solana programs work — key concept:**
Unlike a regular database, Solana doesn't have functions that "look up" data. Instead everything is an **instruction** — a transaction signed by a wallet that changes state on-chain. Each function in the smart contract = one instruction.

**The instructions in your contract:**

| Instruction | What it does |
|---|---|
| `initialize_platform` | One-time setup |
| `create_user_profile` | Admin creates an on-chain profile for a verified worker/company |
| `post_job` | Employer locks SOL into escrow PDA |
| `assign_worker` | Links a worker to the job on-chain |
| `submit_proof_of_work` | Records proof hash on-chain |
| `release_payment` | Moves SOL from escrow PDA to worker wallet |
| `create_dispute` | Flags a job as disputed on-chain |
| `resolve_dispute` | Admin splits or awards the escrowed SOL |
| `rate_user` | Records rating on-chain |

**PDAs (Program Derived Addresses) — the key innovation:**
A PDA is a Solana account that has no private key. It's derived mathematically from the program ID + some seeds (like the job ID). Because nobody holds the private key, **only the smart contract can sign transactions from that account**. This is how escrow works — the employer's SOL goes into a PDA, and only `release_payment` or `resolve_dispute` can move it out.

**Say it simply:** *"A PDA is like a bank locker where the lock combination is controlled by code, not by a person. The employer deposits money, and only the contract's rules can open it."*

---

### How the Three Layers Connect

```
[Phantom Wallet] ──signs──► [Frontend React]
                                   │
                    ┌──────────────┴──────────────┐
                    │                             │
              HTTP (Axios)              Solana RPC (Anchor)
                    │                             │
            [Backend Express]           [Solana Blockchain]
                    │                       smart contract
              [MongoDB]                     + escrow PDAs
```

- **Frontend → Backend:** REST API calls (Axios, JSON, JWT auth)
- **Frontend → Solana:** Direct RPC — builds a transaction, asks Phantom to sign it, submits to Solana network
- **Backend → Solana:** Also direct RPC — for cron-triggered actions like auto payment release
- **Backend → MongoDB:** Mongoose queries (find, create, update)
- **MongoDB and Solana are independent** — MongoDB has the off-chain data (descriptions, photos, bios), Solana has the on-chain financial state (escrow, ratings, profiles)

---

### What Architecture Type Is This?

If they ask directly:

| Term | Does DeWages use it? | Where |
|---|---|---|
| **Component-based** | Yes | Frontend — React components |
| **Module-based** | Yes | Backend — each domain is a separate module (router + controller + model) |
| **MVC** | Partially | Backend follows Router→Controller→Model pattern |
| **Event-based** | Not really | The cron job is a scheduled poll, not a true event listener. No WebSockets, no message queue. |
| **Microservices** | No | It's a monolith backend — one Express server handles everything |
| **Layered / N-tier** | Yes | Three clear layers: Frontend, Backend, Blockchain |

**Best one-liner:** *"It's a three-tier layered architecture — presentation layer (React), business logic layer (Express + MongoDB), and a trustless settlement layer (Solana smart contract). Within each tier we use component-based design on the frontend and module-based MVC on the backend."*

---

---

## Complete Cheat Sheet — Every File, What It Does

Use this to navigate instantly. If a reviewer asks about any feature, find the keyword, open the file.

---

### BACKEND

#### `backend/app.js`
The entry point of the server. Starts Express, connects to MongoDB, registers all routers under `/v1/...`, sets up CORS. If a route isn't working, check here first — the router might not be mounted.

#### `backend/middleware/authMiddleware.js`
Two guards:
- `authMiddleware` — verifies the JWT token on every protected route. Extracts `walletAddress` and `userType` and puts them on `req.user` so every controller knows who is calling.
- `adminAuthMiddleware` — additionally checks that the wallet matches the hardcoded admin wallet. Only the admin wallet can call admin routes.

#### `backend/router/authRouter.js` + `backend/controller/authController.js`
**Worker signin, company signin, logout, get current user.**
- `workerSignin` — checks wallet signature, issues a JWT
- `companySignin` — same for companies
- `getCurrentUser` — returns the logged-in user's profile from the token
This is how the frontend knows who is logged in after page refresh.

#### `backend/router/workerRouter.js` + `backend/controller/workerController.js`
**Everything about worker accounts.**
- `verifyWorkerWallet` — called on signup to confirm the wallet exists
- `signupUser` — creates the worker's MongoDB document
- `verifyPAN` — calls the third-party PAN API, stores result in `panDetails`, sets `verificationStatus.identity = true`
- `/profile/me` — returns the worker's own profile
- `/profile/update` — edits name, phone, bio, skills, location
- `/profile/avatar` — uploads photo to S3, saves URL

#### `backend/router/companyRouter.js` + `backend/controller/companyController.js`
**Everything about company accounts.**
- `signupCompany` — creates company document, validates with Zod schema
- `getCompanyProfile` — public profile by wallet address
- `/profile/me` — company's own profile
- `/profile/update` — edits company info
- `/profile/logo` — uploads logo to S3 (new)
- `/upload-document` — uploads verification document (GST cert, etc.)

#### `backend/router/jobRouter.js` + `backend/controller/jobController.js`
**The core of the platform — job lifecycle.**
- `createJob` — saves job to MongoDB after the smart contract transaction is done on-chain
- `GET /available` — worker sees all open jobs they haven't applied to
- `GET /company/jobs` — company sees their own jobs
- `GET /worker/completed` — worker's completed jobs (used for the PDF certificate)
- `applyForJob` — worker applies, creates an application on the job document
- `approve-worker` / `reject-worker` — company accepts or rejects an applicant
- `/status` — syncs job status between MongoDB and what happened on-chain
- `/generate-otp` and `/verify-otp` — creates and checks the 6-digit OTP for job start/end
- `/submit-proof` — saves GPS + photo URL to the job document after OTP verified
- `/rating/company` and `/rating/worker` — submit ratings after completion

#### `backend/router/adminRouter.js` + `backend/controller/adminController.js`
**Admin-only actions.**
- `adminGetNonce` + `adminLogin` — wallet-signature-based admin login (no password)
- `fetchWorkers` — list all workers for the admin dashboard
- `fetchWorkerByWallet` — single worker detail
- `verifyWorker` — admin approves a worker (calls the smart contract `create_user_profile` instruction)
- `fetchCompanies` — list all companies
- Company approval — same flow as worker

#### `backend/controller/disputeController.js`
**Dispute lifecycle.**
- `raiseDispute` — worker or company raises a dispute, changes job status to `disputed`
- `adminGetDisputes` — admin sees all open disputes
- `adminResolveDispute` — admin calls this, which then calls `resolve_dispute` on the smart contract. Funds split per admin decision.
- `getDisputeHistory` — log of resolved disputes

#### `backend/controller/cronController.js`
**Automatic payment release.**
`runDisbursement` — runs on a schedule. Finds all jobs in `pending_verification` state where the 3-day dispute window has passed with no dispute raised. For each, calls `release_payment` on the smart contract and marks the job `completed` in MongoDB.

#### `backend/controller/otpController.js`
**Email OTP for signup verification.**
- `sendOTP` — generates a 6-digit code, stores it in memory (`otpStore` Map with 10-minute TTL), sends via email
- `verifyOTP` — checks the code, marks email as verified
Not the same as the job start/end OTP — that one lives in `jobController`.

#### `backend/controller/ratingController.js`
**Post-job ratings.**
- `submitWorkerRating` — company rates the worker (1–5 stars + review text)
- `submitCompanyRating` — worker rates the company
- `checkRatingStatus` — have both sides rated yet? Used to show/hide the rating UI.
Ratings update the running average on both the worker and company MongoDB documents.

#### `backend/services/s3UploadService.js`
**All S3 file uploads in one place.**
- `uploadProofPhoto` — proof photos (before/after work)
- `uploadWorkerAvatar` — worker profile photo
- `uploadCompanyLogo` — company logo
- `uploadCompanyDocument` — verification documents
All functions take a file buffer, push to S3, return a public URL.

---

#### MODELS (what the data looks like)

| Model file | What it stores |
|---|---|
| `model/workerModel.js` | Worker profile: name, phone, PAN details, skills, location, rating, avatar URL, verification status |
| `model/companyModel.js` | Company profile: name, type, registration number, logo URL, contact person, documents |
| `model/jobModel.js` | Job: title, category, payment amount, status, applications array, OTP, proof photos, GPS, dispute flag |
| `model/disputeHistoryModel.js` | Record of every resolved dispute: jobId, winner, evidence summary, admin notes |
| `model/adminModel.js` | Admin account (minimal — admin auth is wallet-based, not DB-based) |

**The job status flow (important to know):**
```
open → in_progress → pending_verification → completed
                  ↘ disputed → resolved
```

---

### SMART CONTRACT

#### `smart-contract/employment_contract.rs`
One file. Everything on-chain lives here.

**Key structs (the data stored on Solana):**
- `UserProfile` — on-chain profile: name, type (worker/employer), rating, total jobs, earnings
- `Job` — on-chain job: title, payment amount, status, worker assigned, employer
- `Escrow` — holds the SOL amount locked for a specific job

**Key instructions (functions that change blockchain state):**
- `post_job` (line ~46) — employer deposits SOL into escrow PDA
- `assign_worker` (line ~97) — links worker to job on-chain
- `submit_proof_of_work` (line ~116) — records proof hash on-chain
- `release_payment` (line ~150) — escrow → worker wallet
- `create_dispute` (line ~193) — flags job disputed
- `resolve_dispute` (line ~226) — admin splits/awards escrow
- `rate_user` (line ~304) — records rating on-chain
- `skip_dispute_period_for_testing` (line ~329) — dev-only shortcut

---

### FRONTEND

#### `frontend/src/main.jsx`
Entry point. Mounts the React app into `index.html`. Nothing else.

#### `frontend/src/App.jsx`
Wraps the entire app in providers — Solana wallet adapter, WalletContext, i18n, React Router. Think of it as the outermost shell.

#### `frontend/src/router.js`
URL → Page mapping. Every route in the app is defined here. If you want to know what happens when you go to `/worker/profile`, look here.

#### `frontend/src/env-variables.js`
`BACKEND_URL`, `RPC_URL`, `PROGRAM_ID`. All environment-specific values used across the app come from here.

---

#### PAGES

| File | Screen | What it does |
|---|---|---|
| `LandingPage.jsx` | `/` | Home screen with features, stats, signup/signin buttons |
| `WorkerSignup.jsx` | `/worker/signup` | Multi-step signup: wallet → email OTP → PAN verify → profile details |
| `WorkerSigninPage.jsx` | `/worker/signin` | Wallet connect → JWT issued → redirect to dashboard |
| `WorkerDashboard.jsx` | `/worker/dashboard` | Worker's main screen: available jobs, applied jobs, completed jobs |
| `WorkerJobPage.jsx` | `/worker` | Browse and apply for jobs (job listings for the worker) |
| `WorkerProfilePage.jsx` | `/worker/profile` | Full profile view: edit details, avatar upload, on-chain data tab, PDF certificate download |
| `CompanySignupForm.jsx` | `/company/signup` | Company registration form |
| `CompanySigninPage.jsx` | `/company/signin` | Company wallet connect → JWT |
| `CompanyDashboard.jsx` | `/company/dashboard` | Company's main screen: their jobs, applicants, stats |
| `CompanyJobPostingPage.jsx` | `/company` | Alternative job posting page (INR-based, older flow) |
| `CompanyProfilePage.jsx` | `/company/profile` | Company profile: edit details, logo upload, on-chain tab |
| `PostJobModal.jsx` | Modal on company dashboard | The main job posting form: SOL payment, category, duration, location, min-wage hint |
| `EducatePage.jsx` | `/learn` | FAQ and explainer for non-tech workers |
| `ProfileTestPage.jsx` | `/profile-test` | Dev testing page for on-chain profile reading |

#### ADMIN PAGES (`pages/admin/`)

| File | What it does |
|---|---|
| `AdminLogin.jsx` | Wallet-signature login for admin — no password, just sign a nonce |
| `AdminDashboard.jsx` | Lists pending workers and companies awaiting approval |
| `WorkerDetailPage.jsx` | Full worker detail for admin: KYC status, PAN result, approve/reject button |
| `CompanyDetails.jsx` | Full company detail for admin |
| `DisputePanel.jsx` | Shows all open disputes with evidence — photo, GPS, OTP proof. Admin resolves here. |

---

#### COMPONENTS

| File | What it does |
|---|---|
| `ProofCaptureModal.jsx` | The most important component. Opens camera, verifies OTP, captures GPS, uploads photo. Used by workers on their phone during job start/end. |
| `JobCard.jsx` | Job card shown to companies — shows applicants, lets company accept/reject |
| `JobListingCard.jsx` | Job card shown to workers — apply button, job details preview |
| `JobDetailsModal.jsx` | Full job details popup for company side |
| `JobDetailsModalWorker.jsx` | Full job details popup for worker side |
| `PostJobModal.jsx` | Job creation form (used from CompanyDashboard) |
| `common/CompanyOTPGenerator.jsx` | Company-side OTP generation for job start/end |
| `common/RatingModal.jsx` | Star rating popup after job completion |
| `common/LanguageSwitcher.jsx` | Dropdown to switch between English / Hindi / Marathi |
| `common/StatefulButton.jsx` | Button that shows loading spinner while an async action runs |
| `Wallet/wallet-bar-signup.jsx` | Phantom wallet connect button used during signup |

---

#### UTILS & CONFIG

| File | What it does |
|---|---|
| `utils/generateWorkerPDF.js` | Generates the downloadable work history certificate PDF using jsPDF. Pulls worker profile + completed jobs, draws the entire PDF layout. |
| `context/WalletContext.jsx` | React Context that stores the connected wallet address globally so all components can read it without prop-drilling |
| `hooks/useAuth.js` | Custom hook — checks if a JWT token is in localStorage, validates it, handles logout |
| `i18n.js` | Sets up react-i18next with English as default. Loads translation files from `locales/`. |
| `locales/en.json` `hi.json` `mr.json` | Translation strings for English, Hindi, Marathi |
| `idl/employment_platform.json` | The smart contract interface definition — tells the frontend how to call each instruction and decode account data. Auto-generated by Anchor when the contract compiles. |

---

## Demo Step 3 — Admin approves company / worker

**Q: "Where is the KYC and approval logic?"**

| File | What it does |
|---|---|
| `backend/router/authRouter.js` | Worker signup, PAN verification API call, email OTP |
| `backend/router/adminRouter.js` | Admin-only routes for approving/rejecting workers and companies |
| `backend/model/workerModel.js` lines 54–65 | `panDetails` and `verificationStatus` fields updated after KYC |

**Say:** *"Signup calls a third-party PAN API. The result lands in the worker's MongoDB document. Admin approval is a separate manual step — the admin sees the KYC result and clicks approve."*

---

## Demo Step 4 — Completed Job A (evidence bundle)

**Q: "How does GPS and photo proof get attached to a job?"**

| File | What it does |
|---|---|
| `frontend/src/components/ProofCaptureModal.jsx` | Opens camera, captures GPS via `navigator.geolocation`, enforces OTP before camera activates |
| `backend/router/jobRouter.js` → `/submit-proof` route | Receives photo buffer via multer, uploads to S3, saves URL + GPS + timestamp to the job document |
| `backend/services/s3UploadService.js` → `uploadProofPhoto()` | Pushes the file to S3 with public-read ACL, returns the URL |

**Say:** *"The worker's phone runs ProofCaptureModal — OTP is checked before the camera even opens. Photo and GPS go to S3, the URL is saved permanently on the job record in MongoDB."*

---

## Demo Step 6 — Employer accepts, SOL locks in escrow

**Q: "Where does the money actually get locked? How do we know the employer can't take it back?"**

| File | What it does |
|---|---|
| `smart-contract/employment_contract.rs` line 46 → `fn post_job()` | Solana instruction that moves SOL from employer wallet into a PDA (Program Derived Address) |
| `frontend/src/pages/PostJobModal.jsx` around line 260 | Builds and signs the Anchor transaction, sends it to Solana |

**Say:** *"A PDA is a Solana account whose private key nobody holds — not us, not the employer. The smart contract is the only thing that can move funds out of it. The employer literally cannot get their money back until the contract says so."*

---

## Demo Step 8 — End OTP + after photo → payment arrives in wallet

**Q: "Where does payment actually release? Can you stop it?"**

| File | What it does |
|---|---|
| `smart-contract/employment_contract.rs` line 150 → `fn release_payment()` | Moves lamports from escrow PDA directly to worker's wallet |
| `backend/controller/cronController.js` | Cron job that calls `release_payment` automatically after the dispute window with no dispute raised |

**Say:** *"Payment release is a Rust function in the smart contract. The backend cron triggers it after the dispute window. The employer doesn't have to do anything — and can't block it either."*

---

## Demo Step 9 — Dispute panel

**Q: "Where does dispute resolution live? Who controls it?"**

| File | What it does |
|---|---|
| `frontend/src/pages/admin/DisputePanel.jsx` | Admin UI — shows worker's photo, GPS, OTP confirmation, pulled from MongoDB |
| `backend/controller/disputeController.js` | Logic for raising and resolving disputes, updating job status |
| `smart-contract/employment_contract.rs` line 226 → `fn resolve_dispute()` | On-chain instruction — admin calls this to split or award the escrowed SOL |

**Say:** *"The admin sees immutable evidence — the GPS and photo came from the worker's phone, not from us. The admin can't fabricate it or change it. Resolving the dispute calls an on-chain function that moves funds — it's recorded permanently on Solana."*

---

## Demo Step 10 — On-Chain Data tab

**Q: "How do you prove the data is actually on-chain and not just in your database?"**

| File | What it does |
|---|---|
| `frontend/src/pages/WorkerProfilePage.jsx` → `fetchOnChainData()` line ~181 | Reads raw account data directly from Solana RPC, decodes using the IDL |

Key lines to point at:
```js
const accountInfo = await connection.getAccountInfo(pda);   // direct Solana read
const coder = new BorshCoder(idl);                          // IDL = smart contract interface
const data = coder.accounts.decode("UserProfile", accountInfo.data);
```

**Say:** *"This tab bypasses our backend entirely. It calls Solana RPC directly and decodes raw bytes using the smart contract's IDL. If our backend was shut down right now, this would still work."*

---

## The question you WILL get

**Q: "Why do you need MongoDB if everything is on the blockchain?"**

**Say:** *"The blockchain stores the critical financial state — escrow, payment release, dispute resolution. MongoDB stores everything that doesn't need to be immutable: job descriptions, profile bios, search filters, photos. Storing a 500-character job description on Solana costs real money in rent and makes every search a blockchain call. The split is intentional — blockchain for trust, database for convenience."*

---

## The question about disputes

**Q: "There's still human intervention for disputes — isn't that centralised?"**

**Say:** *"The human admin isn't deciding based on trust — they're reading cryptographic evidence. The GPS coordinates, the timestamped photo, the OTP confirmation — none of that was generated by us. It came from the worker's phone and is stored immutably. The admin is a reader, not an arbiter. And compare this to the alternative: a daily-wage worker's only option today is to take an employer to labour court, which takes three years and ₹50,000 in fees."*

---

## The question about minimum wage

**Q: "How do you enforce fair wages?"**

**Say:** *"Currently the platform flags when a posted wage is below the Maharashtra government minimum (₹563/day base per the Jan 2026 Labour Department notification). The employer sees the warning when they fill in the payment amount. Enforcement — blocking the job — is a configurable next step once we expand to all states, since each state has different rates."*

---

## Quick file map for "where is X?"

| Thing | File |
|---|---|
| Smart contract (all on-chain logic) | `smart-contract/employment_contract.rs` |
| Job creation + escrow lock | `frontend/src/pages/PostJobModal.jsx` |
| Worker signup + PAN KYC | `backend/router/authRouter.js` |
| Admin approval routes | `backend/router/adminRouter.js` |
| Photo + GPS proof capture | `frontend/src/components/ProofCaptureModal.jsx` |
| S3 file uploads | `backend/services/s3UploadService.js` |
| Payment release cron | `backend/controller/cronController.js` |
| Dispute logic | `backend/controller/disputeController.js` |
| On-chain data reader | `frontend/src/pages/WorkerProfilePage.jsx` → `fetchOnChainData()` |
| Worker profile + certificate | `frontend/src/pages/WorkerProfilePage.jsx` |
| Company profile + logo upload | `frontend/src/pages/CompanyProfilePage.jsx` |
| Job posting form (min wage hint) | `frontend/src/pages/PostJobModal.jsx` |
| Worker model (schema) | `backend/model/workerModel.js` |
| Job model (schema) | `backend/model/jobModel.js` |
