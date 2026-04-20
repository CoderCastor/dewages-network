# 📋 Validation & Testing Report — DeWages Network Backend

> **Project:** DeWages Network — Decentralized Employment Platform  
> **Component:** Node.js/Express Backend  
> **Date:** April 2026  
> **Total Tests:** 147 | **Passed:** 147 | **Failed:** 0 | **Success Rate:** 100%

---

## i. Testing Strategy

The following types of testing were performed on the backend:

| Type | Description | Test Files |
|------|-------------|------------|
| **Unit Testing** | Tests individual functions, model schemas, validation schemas, and middleware in isolation | `unit/models.test.js`, `unit/schemas.test.js`, `unit/middleware.test.js` |
| **Integration Testing** | Tests controller functions with actual MongoDB (Memory Server) database interactions | `integration/admin.test.js`, `integration/job.test.js` |
| **System Testing** | Tests complete end-to-end workflows (job lifecycle, dispute resolution, multi-user scenarios) | `system/workflow.test.js` |
| **User Acceptance Testing (UAT)** | Validates business rules: OTP flow, dispute periods, fund transfers, role-based access | Covered within system and integration tests |

### Tools & Frameworks Used

| Tool | Purpose |
|------|---------|
| **Jest** | JavaScript testing framework (test runner, assertions, mocking) |
| **MongoDB Memory Server** | In-memory MongoDB for isolated, fast database testing |
| **jsonwebtoken** | JWT token generation for auth testing |

---

## ii. Test Cases

### Unit Tests — Mongoose Models (39 Tests)

| Test ID | Input | Expected Output | Actual Output | Status |
|---------|-------|----------------|---------------|--------|
| TC-M01 | Valid worker profile data | Worker created with all fields | Worker created successfully | ✅ Pass |
| TC-M02 | Worker data without walletAddress | ValidationError thrown | ValidationError thrown | ✅ Pass |
| TC-M03 | Minimal worker (walletAddress only) | Default values set (rating=0, beginner, etc.) | Defaults applied correctly | ✅ Pass |
| TC-M04 | experienceLevel = "super_expert" | ValidationError (invalid enum) | ValidationError thrown | ✅ Pass |
| TC-M05 | jobCategories = ["invalid_category"] | ValidationError (invalid enum) | ValidationError thrown | ✅ Pass |
| TC-M06 | 21 skills (exceeds limit of 20) | ValidationError | ValidationError thrown | ✅ Pass |
| TC-M07 | Exactly 20 skills (boundary) | Worker created with 20 skills | 20 skills saved | ✅ Pass |
| TC-M08 | Save worker, wait, save again | updatedAt timestamp changes | Timestamp updated | ✅ Pass |
| TC-M09 | All verifications = true | isFullyVerified = true | Returns true | ✅ Pass |
| TC-M10 | identity verification = false | isFullyVerified = false | Returns false | ✅ Pass |
| TC-M11 | Bio with 501 characters | ValidationError (maxlength) | ValidationError thrown | ✅ Pass |
| TC-M12 | Valid worker skill data | Skill created | Skill created | ✅ Pass |
| TC-M13 | Skill without proficiencyLevel | Default = "basic" | Default applied | ✅ Pass |
| TC-M14 | experienceYears = 51 | ValidationError (max 50) | ValidationError thrown | ✅ Pass |
| TC-M15 | Valid company profile data | Company created | Company created | ✅ Pass |
| TC-M16 | Company without walletAddress | ValidationError | ValidationError thrown | ✅ Pass |
| TC-M17 | Company without companyType | Default = "individual" | Default applied | ✅ Pass |
| TC-M18 | companyType = "mega_corporation" | ValidationError | ValidationError thrown | ✅ Pass |
| TC-M19 | All verifications + isVerified = true | isFullyVerified = true | Returns true | ✅ Pass |
| TC-M20 | Save company, wait, save again | updatedAt changes | Timestamp updated | ✅ Pass |
| TC-M21 | New company (no stats provided) | All stats = 0 | Stats are 0 | ✅ Pass |
| TC-M22 | Valid job data | Job created with status "open" | Job created | ✅ Pass |
| TC-M23 | Job with only title | ValidationError (missing required) | ValidationError thrown | ✅ Pass |
| TC-M24 | status = "unknown_status" | ValidationError | ValidationError thrown | ✅ Pass |
| TC-M25 | category = "rocket_science" | ValidationError | ValidationError thrown | ✅ Pass |
| TC-M26 | Title with 101 characters | ValidationError (maxlength 100) | ValidationError thrown | ✅ Pass |
| TC-M27 | Description with 501 characters | ValidationError (maxlength 500) | ValidationError thrown | ✅ Pass |
| TC-M28 | paymentAmount = -100 | ValidationError (min 0) | ValidationError thrown | ✅ Pass |
| TC-M29 | durationHours = 0 | ValidationError (min 1) | ValidationError thrown | ✅ Pass |
| TC-M30 | Job without paymentAmountINR | Auto-calculates: 0.5 SOL × 8000 = ₹4000 | ₹4000 calculated | ✅ Pass |
| TC-M31 | Job with 3 applications (mixed status) | Virtuals compute correct counts | total=3, pending=1, approved=1, rejected=1 | ✅ Pass |
| TC-M32 | hasWorkerApplied("workerA") | Returns true for existing, false for non-existing | Correct boolean | ✅ Pass |
| TC-M33 | getApplicationByWorker("workerX") | Returns application object or undefined | Correct result | ✅ Pass |
| TC-M34 | addApplication (duplicate worker) | Throws "Worker has already applied" | Error thrown | ✅ Pass |
| TC-M35 | getAvailableForWorker (worker1 applied to 1 of 2) | Returns 1 job | 1 job returned | ✅ Pass |
| TC-M36 | Create two jobs with same jobPDA | Duplicate key error | Error thrown | ✅ Pass |
| TC-M37 | Valid job application data | Application created | Application created | ✅ Pass |
| TC-M38 | Application without status | Default = "pending" | Default applied | ✅ Pass |
| TC-M39 | Application status = "unknown" | ValidationError | ValidationError thrown | ✅ Pass |

### Unit Tests — Zod Validation Schemas (36 Tests)

| Test ID | Input | Expected Output | Actual Output | Status |
|---------|-------|----------------|---------------|--------|
| TC-S01 | Valid Solana public key | Validation passes | Passes | ✅ Pass |
| TC-S02 | Public key < 32 chars | Validation fails | Fails | ✅ Pass |
| TC-S03 | Public key > 88 chars | Validation fails | Fails | ✅ Pass |
| TC-S04 | Key with 0, O, I, l (non-Base58) | Validation fails | Fails | ✅ Pass |
| TC-S05 | Empty pubkey string | Validation fails | Fails | ✅ Pass |
| TC-S06 | Missing pubkey field | Validation fails | Fails | ✅ Pass |
| TC-S07 | Complete valid worker profile | Validation passes | Passes | ✅ Pass |
| TC-S08 | Profile without required name | Validation fails | Fails | ✅ Pass |
| TC-S09 | Name > 100 characters | Validation fails | Fails | ✅ Pass |
| TC-S10 | Bio > 500 characters | Validation fails | Fails | ✅ Pass |
| TC-S11 | 21 skills (limit = 20) | Validation fails | Fails | ✅ Pass |
| TC-S12 | experienceLevel = "master" | Validation fails | Fails | ✅ Pass |
| TC-S13 | All valid experience levels | All pass | All pass | ✅ Pass |
| TC-S14 | 6 job categories (max = 5) | Validation fails | Fails | ✅ Pass |
| TC-S15 | Invalid job category | Validation fails | Fails | ✅ Pass |
| TC-S16 | All 8 valid job categories | All pass | All pass | ✅ Pass |
| TC-S17 | email = "not-an-email" | Validation fails | Fails | ✅ Pass |
| TC-S18 | email = "UPPER@CASE.COM" | Lowercased to "upper@case.com" | Lowercased | ✅ Pass |
| TC-S19 | Partial update (name only) | Validation passes | Passes | ✅ Pass |
| TC-S20 | Partial update (bio only) | Validation passes | Passes | ✅ Pass |
| TC-S21 | Update with walletAddress | walletAddress stripped (omitted field) | Stripped | ✅ Pass |
| TC-S22 | Valid worker skill | Validation passes | Passes | ✅ Pass |
| TC-S23 | Skill name > 50 chars | Validation fails | Fails | ✅ Pass |
| TC-S24 | experienceYears > 50 | Validation fails | Fails | ✅ Pass |
| TC-S25 | category = "technical" | Validation passes (extended enum) | Passes | ✅ Pass |
| TC-S26 | All proficiency levels | All pass | All pass | ✅ Pass |
| TC-S27 | Empty pagination object | Defaults: page=1, limit=10 | Defaults applied | ✅ Pass |
| TC-S28 | page = 0 | Validation fails (min 1) | Fails | ✅ Pass |
| TC-S29 | limit = 101 | Validation fails (max 100) | Fails | ✅ Pass |
| TC-S30 | sortOrder = "asc" / "desc" | Both pass | Both pass | ✅ Pass |
| TC-S31 | Valid wallet → validateWithSchema | Returns parsed data | Data returned | ✅ Pass |
| TC-S32 | Invalid wallet → validateWithSchema | Error thrown | Error thrown | ✅ Pass |
| TC-S33 | Empty filters object | Validation passes | Passes | ✅ Pass |
| TC-S34 | minRating = 3.5 / 6 | 3.5 passes, 6 fails | Correct | ✅ Pass |
| TC-S35 | maxDistance = 0 / 50 / 101 | 0 fails, 50 passes, 101 fails | Correct | ✅ Pass |
| TC-S36 | lat=91, lng=181 (out of range) | Both fail | Both fail | ✅ Pass |

### Unit Tests — Authentication Middleware (13 Tests)

| Test ID | Input | Expected Output | Actual Output | Status |
|---------|-------|----------------|---------------|--------|
| TC-MW01 | Valid Bearer token | next() called, req.user set | Middleware passes | ✅ Pass |
| TC-MW02 | Token in x-access-token header | next() called | Middleware passes | ✅ Pass |
| TC-MW03 | Token in request body | next() called | Middleware passes | ✅ Pass |
| TC-MW04 | No token provided | 401 "Access denied" | 401 returned | ✅ Pass |
| TC-MW05 | Expired JWT token | 401 "Token expired" | 401 returned | ✅ Pass |
| TC-MW06 | Malformed token string | 401 "Invalid token" | 401 returned | ✅ Pass |
| TC-MW07 | Token signed with wrong secret | 401 returned | 401 returned | ✅ Pass |
| TC-MW08 | Header without "Bearer" prefix | 401 returned | 401 returned | ✅ Pass |
| TC-MW09 | Valid admin wallet token | next() called, isAdmin=true | Admin access granted | ✅ Pass |
| TC-MW10 | Non-admin wallet token | 403 "Admin privileges required" | 403 returned | ✅ Pass |
| TC-MW11 | No token on admin route | 401 returned | 401 returned | ✅ Pass |
| TC-MW12 | Expired admin token | 401 "Token expired" | 401 returned | ✅ Pass |
| TC-MW13 | Invalid token on admin route | 401 returned | 401 returned | ✅ Pass |

### Integration Tests — Admin Controller (15 Tests)

| Test ID | Input | Expected Output | Actual Output | Status |
|---------|-------|----------------|---------------|--------|
| TC-A01 | Correct admin credentials | 200 + JWT token | Token returned | ✅ Pass |
| TC-A02 | Wrong username | Error message | Error returned | ✅ Pass |
| TC-A03 | Wrong password | Error message | Error returned | ✅ Pass |
| TC-A04 | Empty credentials | Error message | Error returned | ✅ Pass |
| TC-A05 | Fetch all workers (2 in DB) | Array of 2 workers | 2 workers returned | ✅ Pass |
| TC-A06 | Fetch workers (empty DB) | Empty array | [] returned | ✅ Pass |
| TC-A07 | Fetch worker by valid wallet | Worker object | Worker found | ✅ Pass |
| TC-A08 | Fetch worker by non-existent wallet | 404 "Worker not found" | 404 returned | ✅ Pass |
| TC-A09 | Verify worker (set PDA + isVerified) | 200, DB updated | Worker verified | ✅ Pass |
| TC-A10 | Verify non-existent worker | 404 | 404 returned | ✅ Pass |
| TC-A11 | Fetch all companies | Array of companies | Companies returned | ✅ Pass |
| TC-A12 | Fetch company by wallet | Company object | Company found | ✅ Pass |
| TC-A13 | Fetch non-existent company | 404 | 404 returned | ✅ Pass |
| TC-A14 | Verify company (set PDA + isVerified) | 200, DB updated | Company verified | ✅ Pass |
| TC-A15 | Verify non-existent company | 404 | 404 returned | ✅ Pass |

### Integration Tests — Job Controller (33 Tests)

| Test ID | Input | Expected Output | Actual Output | Status |
|---------|-------|----------------|---------------|--------|
| TC-J01 | Valid job data + company | Job created with status "open" | Job created | ✅ Pass |
| TC-J02 | Job ID lookup | Job found with correct title | Job found | ✅ Pass |
| TC-J03 | Two open jobs | 2 results returned | 2 jobs | ✅ Pass |
| TC-J04 | Filter by category | Only matching category returned | Filtered correctly | ✅ Pass |
| TC-J05 | Filter by city | Only matching city returned | Filtered correctly | ✅ Pass |
| TC-J06 | 5 jobs, limit=2, paginate | Pages: 2, 2, 1 items | Paginated correctly | ✅ Pass |
| TC-J07 | Filter by non-existing category | 0 results | Empty array | ✅ Pass |
| TC-J08 | Worker applies to job | Application added | Application stored | ✅ Pass |
| TC-J09 | Duplicate application | Error thrown | Error thrown | ✅ Pass |
| TC-J10 | Approve application | Status → approved, job → in_progress | Updated correctly | ✅ Pass |
| TC-J11 | Reject application | Status → rejected | Updated | ✅ Pass |
| TC-J12 | Two workers apply | 2 applications, both pending | Stored correctly | ✅ Pass |
| TC-J13 | open → in_progress | Status updated, startedAt set | Transitioned | ✅ Pass |
| TC-J14 | in_progress → pending_verification | Status updated, disputeDeadline set | Transitioned | ✅ Pass |
| TC-J15 | pending_verification → completed | Status updated | Transitioned | ✅ Pass |
| TC-J16 | Set status to "disputed" | Dispute object stored | Stored | ✅ Pass |
| TC-J17 | Set status to "cancelled" | Status updated | Updated | ✅ Pass |
| TC-J18 | Store start OTP | OTP code + expiry saved | Stored | ✅ Pass |
| TC-J19 | Mark OTP as used | isUsed=true, usedAt set | Updated | ✅ Pass |
| TC-J20 | Store end OTP | OTP saved | Stored | ✅ Pass |
| TC-J21 | Set 3-day dispute period | isActive=true, 3-day diff | Set correctly | ✅ Pass |
| TC-J22 | Expire dispute period | isExpired=true, status=completed | Expired + completed | ✅ Pass |
| TC-J23 | Store proof of work | Proof details saved | Stored | ✅ Pass |
| TC-J24 | Record fund transfer | isTransferred=true, amount saved | Recorded | ✅ Pass |
| TC-J25 | Default fund transfer | isTransferred=false | Default applied | ✅ Pass |
| TC-J26 | Fetch company's jobs | Only company's jobs returned | Filtered | ✅ Pass |
| TC-J27 | Group jobs by status | Correct grouping | Grouped | ✅ Pass |
| TC-J28 | Available jobs for worker | Excludes applied jobs | Filtered | ✅ Pass |
| TC-J29 | Assigned to worker | Only in-progress returned | Filtered | ✅ Pass |
| TC-J30 | Completed by worker | Only completed returned | Filtered | ✅ Pass |
| TC-J31 | Rejected for worker | Only rejected applications | Filtered | ✅ Pass |
| TC-J32 | Store ratings (1-5) | Ratings saved | Stored | ✅ Pass |
| TC-J33 | Rating = 6 (out of range) | ValidationError | Error thrown | ✅ Pass |

### System Tests — End-to-End Workflows (11 Tests)

| Test ID | Input | Expected Output | Actual Output | Status |
|---------|-------|----------------|---------------|--------|
| TC-SYS01 | Full 14-step job lifecycle | Job completed + funds transferred | All steps verified | ✅ Pass |
| TC-SYS02 | Employer raises dispute | Job status → disputed | Status changed | ✅ Pass |
| TC-SYS03 | Admin resolves for worker | Dispute resolved + funds to worker | Resolved correctly | ✅ Pass |
| TC-SYS04 | Admin resolves for employer | Dispute resolved + job cancelled | Resolved correctly | ✅ Pass |
| TC-SYS05 | 2 workers apply, 1 approved | 1 approved, 1 rejected, job in_progress | Handled correctly | ✅ Pass |
| TC-SYS06 | Company stats after 3 jobs | Stats match actual job counts | Consistent | ✅ Pass |
| TC-SYS07 | Worker completed jobs count | Count matches DB query | Consistent | ✅ Pass |
| TC-SYS08 | Apply to non-open job | Application blocked | Blocked correctly | ✅ Pass |
| TC-SYS09 | Expired OTP detection | isExpired = true | Detected | ✅ Pass |
| TC-SYS10 | Fund transfer during active dispute | Transfer blocked | Blocked correctly | ✅ Pass |
| TC-SYS11 | Job view count increment | viewCount = 3 after 3 increments | Incremented correctly | ✅ Pass |

---

## iii. Validation Techniques

### How Correctness Was Verified

| Technique | Description |
|-----------|-------------|
| **Schema Validation** | Mongoose schema constraints (required, enum, min/max, maxlength, regex) tested with valid and invalid inputs |
| **Zod Input Validation** | Zod schemas tested for API input sanitization — format checks, type coercion, boundary values |
| **JWT Token Verification** | Tested valid, expired, invalid, and wrong-secret tokens against middleware |
| **Database State Assertions** | After each operation, queried the database to verify the persisted state matches expectations |
| **Virtual Field Computation** | Verified that Mongoose virtual fields (e.g., `isFullyVerified`, `totalApplications`) compute correctly |
| **Pre-save Hook Verification** | Confirmed auto-calculations (INR conversion, timestamp updates) run on save |
| **Business Logic Validation** | Tested domain rules (duplicate applications, status transitions, dispute periods, fund transfer blocking) |

### Data Validation Methods

| Method | Applied To |
|--------|-----------|
| **Required Field Validation** | walletAddress (Worker, Company), jobPDA, escrowPDA, title, description, category |
| **Enum Constraints** | experienceLevel, jobCategories, companyType, status, proficiencyLevel, document types |
| **Range/Boundary Validation** | rating (0-5), skills (max 20), categories (max 5), pagination (page ≥ 1, limit ≤ 100) |
| **Format Validation** | Email (regex), phone (regex), time format (HH:MM), IPFS hash, Solana public key (Base58) |
| **Uniqueness Constraints** | jobPDA (unique index), jobApplication (jobId + workerWallet composite unique) |
| **Default Value Verification** | Tested 15+ default values across all models |

---

## iv. Results & Analysis

### Test Execution Summary

```
Test Suites: 6 passed, 6 total
Tests:       147 passed, 147 total
Snapshots:   0 total
Time:        ~4.5 seconds
```

### Results Breakdown by Test Type

| Test Type | Test Count | Passed | Failed | Pass Rate |
|-----------|-----------|--------|--------|-----------|
| Unit Tests — Models | 39 | 39 | 0 | 100% |
| Unit Tests — Schemas | 36 | 36 | 0 | 100% |
| Unit Tests — Middleware | 13 | 13 | 0 | 100% |
| Integration Tests — Admin | 15 | 15 | 0 | 100% |
| Integration Tests — Jobs | 33 | 33 | 0 | 100% |
| System Tests — Workflows | 11 | 11 | 0 | 100% |
| **Total** | **147** | **147** | **0** | **100%** |

### Test Coverage by Component

| Backend Component | Files Tested | Test Count |
|-------------------|-------------|-----------|
| Models (Worker, Company, Job) | 4 | 39 |
| Schemas (Zod validation) | 2 | 36 |
| Middleware (Auth, Admin Auth) | 1 | 13 |
| Controllers (Admin) | 1 | 15 |
| Controllers (Job lifecycle) | 1 | 33 |
| End-to-End Workflows | Cross-cutting | 11 |

### Key Observations

1. **All 147 tests pass consistently** with zero flaky tests
2. **MongoDB Memory Server** provides isolated, reproducible test runs without external dependencies
3. **Complete job lifecycle** tested end-to-end from creation through fund disbursement
4. **Edge cases** covered: expired OTPs, duplicate applications, fund transfer during disputes
5. **Validation layers** tested at both Zod (API input) and Mongoose (database) levels

---

## How to Run Tests

```bash
# Run all tests
npm test

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Run only system tests
npm run test:system
```
