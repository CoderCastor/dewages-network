# Rating System Implementation - DeWages Network

## Overview
Implemented a comprehensive Web2-based rating system where both companies and workers rate each other after job completion. The rating popup appears before critical actions (End OTP generation/verification).

---

## Backend Changes

### 1. New Controller: `ratingController.js`
**Location:** `/backend/controller/ratingController.js`

**Functions:**
- `submitCompanyRating(req, res)` - Company rates worker (1-5 stars + optional review)
- `submitWorkerRating(req, res)` - Worker rates company (1-5 stars + optional review)
- `checkRatingStatus(req, res)` - Check if ratings have been submitted for a job

**Features:**
- Validates rating (1-5 range)
- Prevents duplicate ratings
- Updates average ratings in user profiles (CompanyProfile & WorkerProfile)
- Stores ratings in Job model

### 2. Updated Router: `jobRouter.js`
**Location:** `/backend/router/jobRouter.js`

**New Routes:**
```javascript
POST /api/job/rating/company  - Company submits rating for worker
POST /api/job/rating/worker   - Worker submits rating for company
GET  /api/job/:jobId/rating-status - Check rating status
```

### 3. Database Schema (Already Exists in Job Model)
**Fields in Job Model:**
- `workerRating` - Rating given by company to worker (1-5)
- `workerReview` - Optional review text from company
- `employerRating` - Rating given by worker to company (1-5)
- `employerReview` - Optional review text from worker

**Profile Updates:**
- `CompanyProfile.rating` - Average rating calculated from all jobs
- `WorkerProfile.rating` - Average rating calculated from all jobs

---

## Frontend Changes

### 1. New Component: `RatingModal.jsx`
**Location:** `/frontend/src/components/common/RatingModal.jsx`

**Features:**
- Beautiful, modern UI with gradient backgrounds
- Interactive star rating (1-5 stars with hover effects)
- Optional review textarea (500 char limit)
- Animated transitions using Framer Motion
- Rating labels: Poor, Fair, Good, Very Good, Excellent
- Submit and Skip buttons
- Loading states

**Props:**
- `isOpen` - Boolean to control modal visibility
- `onClose` - Callback when modal closes
- `onSubmit(rating, review)` - Callback with rating data
- `targetName` - Name of person being rated
- `targetType` - "worker" or "company"

### 2. New Component: `CompanyOTPGenerator.jsx`
**Location:** `/frontend/src/components/common/CompanyOTPGenerator.jsx`

**Purpose:** Handles End OTP generation with rating integration for companies

**Flow:**
1. Company clicks "Generate End Job OTP"
2. If worker not rated → Show rating modal
3. After rating submitted → Generate OTP automatically
4. Display OTP to share with worker

**Features:**
- Checks if worker is already rated
- Shows rating modal before OTP generation
- Handles OTP generation after rating
- Displays generated OTP with copy functionality
- Shows OTP status (generated, used, expired)

### 3. Updated Component: `JobDetailsModalWorker.jsx`
**Location:** `/frontend/src/pages/JobDetailsModalWorker.jsx`

**Changes:**
- Added `showRatingModal` state
- Added `handleRatingSubmit()` function
- Modified `handleOTPSubmit()` to check for company rating before End OTP
- Integrated `RatingModal` component
- Split OTP verification logic into separate `verifyOTP()` function

**Flow for Worker:**
1. Worker enters End Job OTP
2. If company not rated → Show rating modal
3. After rating submitted → Verify OTP automatically
4. Job marked as completed

### 4. Updated Component: `JobCard.jsx`
**Location:** `/frontend/src/pages/JobCard.jsx`

**Changes:**
- Imported `CompanyOTPGenerator` component
- Modified `renderOTPCard()` function
- For End OTP: Uses `CompanyOTPGenerator` instead of inline button
- For Start OTP: Keeps existing logic

---

## User Flow

### Company Side (Employer)
1. Job is in progress
2. Worker completes work and uses Start OTP
3. Company wants to generate End Job OTP
4. **Rating Popup Appears** → Company rates worker (1-5 stars + review)
5. After rating → End OTP is generated automatically
6. Company shares End OTP with worker
7. Worker enters End OTP → Job completed

### Worker Side
1. Job is in progress
2. Worker receives End Job OTP from company
3. Worker clicks "Enter End Job OTP"
4. **Rating Popup Appears** → Worker rates company (1-5 stars + review)
5. After rating → OTP is verified automatically
6. Job marked as completed
7. Dispute period starts

---

## Rating Calculation

### Average Rating Formula
```javascript
const completedJobsWithRatings = await Job.find({
  [walletField]: userWallet,
  [ratingField]: { $exists: true, $ne: null }
});

const totalRatings = completedJobsWithRatings.reduce(
  (sum, job) => sum + (job[ratingField] || 0), 0
);

const avgRating = totalRatings / completedJobsWithRatings.length;
profile.rating = parseFloat(avgRating.toFixed(2));
```

### Rating Display
- Stored as decimal (e.g., 4.25)
- Displayed with 1-2 decimal places
- Star visualization in UI
- Updated in real-time after each job

---

## API Endpoints

### Submit Company Rating
```http
POST /api/job/rating/company
Authorization: Bearer <token>
Content-Type: application/json

{
  "jobId": "65f1a2b3c4d5e6f7g8h9i0j1",
  "rating": 5,
  "review": "Excellent worker, very professional!"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Rating submitted successfully",
  "rating": {
    "workerRating": 5,
    "workerReview": "Excellent worker, very professional!"
  }
}
```

### Submit Worker Rating
```http
POST /api/job/rating/worker
Authorization: Bearer <token>
Content-Type: application/json

{
  "jobId": "65f1a2b3c4d5e6f7g8h9i0j1",
  "rating": 4,
  "review": "Good company to work with"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Rating submitted successfully",
  "rating": {
    "employerRating": 4,
    "employerReview": "Good company to work with"
  }
}
```

### Check Rating Status
```http
GET /api/job/:jobId/rating-status
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "ratingStatus": {
    "workerRated": true,
    "employerRated": false,
    "canRateWorker": false,
    "canRateEmployer": true
  }
}
```

---

## Validation & Error Handling

### Backend Validation
- Rating must be between 1-5
- Job must exist
- User must be authorized (company or worker)
- Job must be in "in_progress" status
- Prevents duplicate ratings
- Review text limited to 500 characters

### Frontend Validation
- Rating selection required before submit
- OTP must be 6 digits
- Loading states during API calls
- Toast notifications for success/error
- Modal can be skipped (optional rating)

---

## Design Features

### Rating Modal
- Gradient background (amber → orange → pink)
- Animated star interactions
- Smooth transitions
- Responsive design
- Modern glassmorphism effects
- Character counter for review
- Clear visual feedback

### Integration Points
- Non-intrusive popup
- Appears at critical moments
- Can be skipped if needed
- Doesn't block workflow
- Seamless with existing UI

---

## Testing Checklist

### Company Flow
- [ ] Generate Start OTP
- [ ] Worker uses Start OTP
- [ ] Click "Generate End Job OTP"
- [ ] Rating modal appears
- [ ] Submit rating (1-5 stars)
- [ ] End OTP generated automatically
- [ ] OTP displayed correctly
- [ ] Worker can use End OTP

### Worker Flow
- [ ] Receive End OTP from company
- [ ] Click "Enter End Job OTP"
- [ ] Rating modal appears
- [ ] Submit rating (1-5 stars)
- [ ] OTP verified automatically
- [ ] Job status updated to completed
- [ ] Dispute period starts

### Rating Persistence
- [ ] Ratings saved in database
- [ ] Average rating calculated correctly
- [ ] Profile ratings updated
- [ ] Ratings displayed in job history
- [ ] Cannot rate twice for same job

---

## Files Modified/Created

### Backend
- ✅ Created: `/backend/controller/ratingController.js`
- ✅ Modified: `/backend/router/jobRouter.js`

### Frontend
- ✅ Created: `/frontend/src/components/common/RatingModal.jsx`
- ✅ Created: `/frontend/src/components/common/CompanyOTPGenerator.jsx`
- ✅ Modified: `/frontend/src/pages/JobDetailsModalWorker.jsx`
- ✅ Modified: `/frontend/src/pages/JobCard.jsx`

---

## Future Enhancements (Optional)

1. **Rating Analytics Dashboard**
   - View rating trends over time
   - Compare ratings across categories
   - Top-rated workers/companies

2. **Rating Filters**
   - Filter jobs by minimum rating
   - Sort by rating in job listings

3. **Rating Badges**
   - Award badges for high ratings
   - Display achievements on profiles

4. **Detailed Rating Breakdown**
   - Rate on multiple criteria (punctuality, quality, communication)
   - Show rating distribution (5★: 60%, 4★: 30%, etc.)

5. **Rating Reminders**
   - Email/notification reminders to rate
   - Incentives for providing ratings

---

## Notes

- **No Smart Contract Changes:** All rating logic is Web2-based (MongoDB)
- **Backward Compatible:** Existing jobs without ratings work normally
- **Optional Reviews:** Users can skip review text, only rating required
- **Privacy:** Reviews are visible to both parties
- **Immutable:** Once submitted, ratings cannot be changed (prevents gaming)

---

## Support

For issues or questions:
1. Check console logs for errors
2. Verify API endpoints are accessible
3. Ensure authentication tokens are valid
4. Check MongoDB connection
5. Verify job status is "in_progress" for rating

---

**Implementation Status:** ✅ Complete
**Testing Status:** ⏳ Pending
**Deployment Status:** ⏳ Pending
