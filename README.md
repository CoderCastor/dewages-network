# 🌐 DeWages Network

> A decentralized employment platform leveraging Solana blockchain and automated escrow to enable fair, trustless payments between employers and daily-wage workers.  
> ⚠️ Status: **In Active Development** (not deployed yet)

---

## 📌 Overview

DeWages Network is a blockchain-powered employment platform that connects employers with daily-wage workers while ensuring transparent, dispute-resistant, and trustless payments using on-chain escrow accounts. The system combines Solana smart contracts with a modern web stack to manage the entire job lifecycle from posting to payment release.

---

## ✨ Core Features

- **On-chain Escrow Payments**
  - Employer funds are locked in a Solana PDA-based escrow account when a job is posted.
  - Funds are released automatically to the worker after a dispute period if no dispute is raised.

- **End-to-End Job Lifecycle**
  - Job posting with category, location, duration, and requirements.
  - Worker assignment and status transitions: `Open → InProgress → PendingVerification → Completed / Disputed`.

- **Proof of Work & Disputes**
  - Workers submit proof of work (photo, GPS, QR, OTP, etc.).
  - 3-day dispute window for employers to raise issues before funds are released.
  - Admin-controlled dispute resolution (favor worker, favor employer, or split payment).

- **User Profiles & Ratings**
  - On-chain user profiles for employers and workers.
  - Ratings and reviews after job completion.
  - Aggregate reputation metrics (total jobs, total earnings, rating).

- **Admin Governance**
  - Admin-only actions for user verification and dispute resolution.
  - Testing-only instruction to skip dispute period during development.

---

## 🛠 Tech Stack

- **Frontend**
  - Next.js, React, TypeScript
  - Tailwind CSS
  - Solana Wallet Adapter (for wallet connection & transaction signing)

- **Backend**
  - Node.js, Express.js
  - MongoDB + Mongoose (off-chain persistence for jobs, users, proofs, disputes)
  - Scripts for batch operations (fund disbursement, dispute-period skipping in tests)

- **Blockchain / Smart Contracts**
  - Solana
  - Rust
  - Anchor framework
  - Program Derived Accounts (PDAs) for escrow and profile management

- **Development**
  - Local Solana test validator
  - Anchor CLI
  - Environment-based configuration (`.env` for backend, `.env.local` for frontend)

---

## 🏗 Architecture (High Level)

- **Frontend (Next.js)**
  - Admin dashboard for user verification, disputes, and platform control.
  - Employer UI for job posting, assigning workers, and raising disputes.
  - Worker UI for browsing jobs, accepting assignments, and submitting proof of work.

- **Backend (Node.js + MongoDB)**
  - REST API to manage off-chain data and glue on-chain events with UI.
  - Uses Solana SDK to:
    - Call smart contract instructions.
    - Derive PDAs (jobs, escrow, profiles).
    - Trigger payment release via raw instructions or Anchor-style clients.

- **On-Chain Program (Rust + Anchor)**
  - Manages all critical state and operations related to:
    - Escrow funds.
    - Job lifecycle.
    - Disputes and resolutions.
    - User profiles and ratings.

---

## 📂 Project Structure (Conceptual)
dewages-network/
├── frontend/ # ReactJS app (UI + wallet integration)
│ ├── src/app/ # App Router pages (admin, jobs, workers, companies)
│ ├── src/components/ # UI components
│ └── src/lib/ # Frontend utilities (hooks, API clients)
│
├── backend/ # Node.js REST API
│ ├── model/ # Mongoose models (Job, UserProfile, Dispute, etc.)
│ ├── routes/ # API route definitions
│ ├── controllers/ # Business logic and Solana integration
│ ├── scripts/ # Helper scripts (fundDisbursement, dispute-modify)
│ └── server.js # Express server entry
│
├── smart-contract/
│ └── employment_contract.rs
│
├── Anchor.toml # Anchor configuration
├── package.json
└── README.md