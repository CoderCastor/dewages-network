# DeWages — Codebase Walkthrough for Presentation

Use this when a reviewer asks "where in the code does X happen?"
Open the file they name, scroll to the line, and explain the one-liner below.

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
