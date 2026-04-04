# Implementation Plan: FixMyCity Full System

## Overview

Implement the complete FixMyCity system end-to-end: patch the backend data model and controllers, wire all routes, build shared frontend utilities, complete the Authority Dashboard, complete the Contractor Dashboard, and add property-based tests. Tasks are ordered so each step builds on the previous one — backend first, then shared utilities, then Authority Dashboard, then Contractor Dashboard, then tests.

## Tasks

- [x] 1. Patch Job model and backend controllers
  - [x] 1.1 Add missing fields to `backend/models/Job.js`
    - Add `source` (String, default: `"ADMIN"`), `isVerified` (Boolean, default: false), `completedAt` (Date), `isVerifiedCompletion` (Boolean, default: false) to the Mongoose schema
    - Confirm `isDemoJob`, `completionImage`, `completionLocation`, `complaintId` are already present (they are — no change needed)
    - _Requirements: 1.1_

  - [x] 1.2 Patch `backend/controllers/jobController.js` — `createJob` and `updateJobStatus`
    - In `createJob`: accept and persist `source`, `isVerified` from `req.body`; default `source` to `"ADMIN"` if omitted; do NOT branch on `source` value
    - In `updateJobStatus`: accept and persist `completedAt` and `isVerifiedCompletion` from `req.body` when `status === "COMPLETED"`
    - _Requirements: 1.2, 1.3, 12.5, 13.1_

  - [x] 1.3 Patch `backend/controllers/bidController.js` — validate `jobId` on bid creation
    - `createBid` already queries `Job.findById(jobId)` and returns 404 — verify the 404 response body is exactly `{ error: "Job not found" }` and no other changes are needed
    - _Requirements: 10.2_

  - [x] 1.4 Verify `backend/controllers/complaintController.js` is complete
    - Confirm all five handlers exist: `createComplaint`, `getComplaints`, `getComplaintById`, `getMyComplaints`, `updateComplaintStatus`
    - Confirm `updateComplaintStatus` validates against the enum and returns 400 on invalid status
    - _Requirements: 15.1, 17.1_

  - [x] 1.5 Verify upload route returns 400 on missing image
    - Confirm `backend/routes/uploadRoutes.js` already returns `HTTP 400 { error: "No image provided" }` when `req.file` is absent (it does — no change needed)
    - _Requirements: 3.2_

  - [x] 1.6 Verify auth middleware returns 401 correctly
    - Confirm `backend/middleware/authMiddleware.js` returns `HTTP 401` for missing token (`"No token"`) and invalid token (`"Invalid token"`) — already implemented
    - _Requirements: 15.4_

  - [x] 1.7 Verify `backend/server.js` has all routes registered
    - Confirm `authRoutes`, `complaintRoutes`, `uploadRoutes`, `jobRoutes`, `bidRoutes` are all mounted — already present in `server.js`
    - Confirm `cors()` and `express.json()` are applied before route handlers — already present
    - _Requirements: 15.1, 15.2, 15.3_

- [x] 2. Checkpoint — backend is complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Shared frontend utility — `markerColor` lib
  - [x] 3.1 Verify `src/lib/markerColor.ts` exports `getMarkerColor` and `SEVERITY_COLORS`
    - File already exists with correct implementation; confirm both `MapDashboard.tsx` and `ContractorMapPage.tsx` import from `@/lib/markerColor`
    - _Requirements: 5.4, 5.5, 9.2_

- [x] 4. Authority Dashboard — Dashboard page analytics
  - [x] 4.1 Verify `src/pages/Dashboard.tsx` stat cards use live API data
    - Confirm `totalIssues`, `activeHotspots`, `completedIssues`, `jobsBySeverity` are sourced from `useJobs()` (not hardcoded) — already implemented
    - Confirm the Severity Distribution panel renders HIGH / MEDIUM / LOW counts from `jobsBySeverity`
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 5. Authority Dashboard — CreateJobModal real and demo modes
  - [x] 5.1 Verify `CreateJobModal` real mode form fields and GPS capture
    - Confirm fields: `title`, `description`, `category` (select), `severity` (toggle LOW/MEDIUM/HIGH), image upload with preview, "Get GPS" button with `enableHighAccuracy: true`, Map Picker centered on Pune `[18.5204, 73.8567]`
    - Confirm submit POSTs to `/api/upload` first (if image selected), then POSTs to `/api/jobs` with `{ title, description, category, severity, location, imageUrl, status: "OPEN", source: "ADMIN", isVerified: true }`
    - Confirm validation blocks submission when `title`, `description`, or `location` is missing
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 3.3, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 5.2 Verify `CreateJobModal` demo mode preset list
    - Confirm demo mode toggle shows preset list fetched from `GET /api/jobs/demo/presets`
    - Confirm clicking a preset calls `onDemoCreate(preset.index)` which POSTs to `/api/jobs/demo`
    - _Requirements: 16.4, 16.5_

- [x] 6. Authority Dashboard — MapDashboard page
  - [x] 6.1 Verify `MapDashboard.tsx` fetches jobs and complaints with 30s polling
    - Confirm `useJobs()` and `useComplaints()` are called on mount; confirm `setInterval` polling at 30s is in `useJobs` hook
    - _Requirements: 5.1_

  - [x] 6.2 Verify marker rendering with clustering, severity colors, and pulse animation
    - Confirm `leaflet.markercluster` is loaded and markers are added to a cluster group
    - Confirm `getMarkerColor` is used for each job marker
    - Confirm HIGH-severity non-completed jobs have `animation: pulseMarker 2s infinite` in their icon HTML
    - Confirm jobs with missing `location.lat` or `location.lng` are skipped without error
    - _Requirements: 5.2, 5.3, 5.4, 5.5, 5.6, 5.8_

  - [x] 6.3 Verify severity legend is rendered
    - Confirm the legend panel renders three swatches using `SEVERITY_COLORS.HIGH`, `SEVERITY_COLORS.MEDIUM`, `SEVERITY_COLORS.LOW` with labels
    - _Requirements: 5.7_

  - [x] 6.4 Verify completion markers and dashed lines
    - Confirm completed jobs with `completionLocation.lat` render a checkmark-style `Completion_Marker`
    - Confirm a dashed green `L.polyline` is drawn between `job.location` and `job.completionLocation`
    - Confirm clicking the completion marker shows a popup with "Resolution Proof" and `completionImage` thumbnail
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [x] 6.5 Verify popup content and dark styling
    - Confirm job marker popups contain: `title`, `description` truncated to 80 chars, severity badge, status badge, `imageUrl` thumbnail if present
    - Confirm popup CSS class `dark-popup` applies dark background `#1a1a1a` and white text
    - _Requirements: 7.1, 7.2_

  - [x] 6.6 Verify loading state, error state, and map cleanup
    - Confirm a loading indicator renders while `loading === true`
    - Confirm an error banner renders (without crash) when `hasError === true`
    - Confirm `useEffect` cleanup calls `mapInstance.remove()` on unmount
    - _Requirements: 14.4, 14.5, 18.2, 18.3, 18.4_

- [x] 7. Authority Dashboard — Jobs page bid sidebar and assignment
  - [x] 7.1 Verify Jobs page Kanban board and bid sidebar
    - Confirm clicking an OPEN job calls `fetchBids(job._id)` and opens the bid sidebar
    - Confirm bid sidebar shows `contractorId.username`, `eta`, `cost`, `note` for each bid
    - Confirm "Accept Bid" button calls `assignJob(jobId, bid.contractorId._id, bid._id)` which PUTs to `/api/jobs/:id/assign`
    - Confirm job list refreshes after assignment and status badge updates to `ASSIGNED`
    - _Requirements: 11.1, 11.2, 11.3, 11.5_

  - [x] 7.2 Verify demo badge on job cards
    - Confirm jobs with `isDemoJob: true` display a "demo" badge on the job card
    - _Requirements: 16.6_

  - [x] 7.3 Verify `isVerified` and `isVerifiedCompletion` indicators
    - Add "VERIFIED ✅" indicator to job cards where `job.isVerified === true`
    - Add "COMPLETION VERIFIED ✅" indicator to job cards where `job.isVerifiedCompletion === true`
    - _Requirements: 14.2, 14.3_

- [x] 8. Checkpoint — Authority Dashboard is complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Contractor Dashboard — Map page
  - [x] 9.1 Verify `ContractorMapPage.tsx` fetches open jobs with 30s polling
    - Confirm `useJobs()` contractor hook fetches from `GET /api/jobs` and filters `status === "OPEN"` client-side for `openJobs`
    - Add `setInterval` 30s polling to `src/hooks/contractor/useJobs.ts` (currently missing — only fetches once on mount)
    - _Requirements: 9.1_

  - [x] 9.2 Verify contractor map marker rendering and popup with Place Bid button
    - Confirm `getMarkerColor` is used for each open job marker
    - Confirm jobs with missing `location.lat` or `location.lng` are skipped without error
    - Confirm popup contains: `title`, `description` truncated to 80 chars, severity badge, `location.address`, "Place Bid" button
    - Confirm clicking "Place Bid" opens the bid form pre-filled with the selected job
    - _Requirements: 9.2, 9.3, 9.4, 9.5_

  - [x] 9.3 Verify bid submission form and success flow
    - Confirm bid form fields: `eta` (select), `cost` (number input), `note` (textarea)
    - Confirm submitting calls `POST /api/bids` with `{ jobId, contractorId, eta, cost, note }`
    - Confirm success toast is shown and form closes after successful submission
    - _Requirements: 10.4, 10.5_

- [x] 10. Contractor Dashboard — My Jobs page completion flow
  - [x] 10.1 Verify My Jobs page shows ASSIGNED and IN_PROGRESS jobs with Complete Job action
    - Confirm "Complete Job" action is available for jobs with `status === "ASSIGNED"` or `status === "IN_PROGRESS"`
    - _Requirements: 12.1_

  - [x] 10.2 Verify completion proof modal — GPS capture, image upload, and submission
    - Confirm GPS capture uses `navigator.geolocation.getCurrentPosition` with `enableHighAccuracy: true`
    - Confirm GPS denial shows error toast and blocks submission
    - Confirm image upload POSTs to `/api/upload` first, then PUTs to `/api/jobs/:id/status` with `{ status: "COMPLETED", completionImage, completionLocation: {lat, lng}, completedAt: new Date().toISOString(), isVerifiedCompletion: true }`
    - _Requirements: 12.2, 12.3, 12.4, 12.6_

- [x] 11. Contractor Dashboard — Bids page
  - [x] 11.1 Implement `ContractorBids.tsx` with live bid data
    - Replace the placeholder with a real implementation that fetches the contractor's bids
    - Add a `getMyBids` function to `src/hooks/contractor/useJobs.ts` that calls `GET /api/bids/:jobId` for each of the contractor's jobs, or add a dedicated `useContractorBids` hook
    - Display each bid with: job title, `eta`, `cost`, `note`, and `status` badge (PENDING / ACCEPTED / REJECTED)
    - _Requirements: 10.1, 10.3, 14.1_

- [x] 12. Checkpoint — Contractor Dashboard is complete
  - Ensure all tests pass, ask the user if questions arise.

- [-] 13. Backend property-based tests (Jest + Supertest + fast-check)
  - [x] 13.1 Set up backend test infrastructure
    - Install `mongodb-memory-server` as a dev dependency in `backend/`
    - Create `backend/tests/setup.js` that starts an in-memory MongoDB instance before all tests and tears it down after
    - Create a minimal Express app factory `backend/tests/app.js` that wires all routes without calling `app.listen`, for use with Supertest
    - _Requirements: (test infrastructure)_

  - [ ]* 13.2 Write property test for Property 1: source-agnostic job creation
    - Create `backend/tests/job.property.test.js`
    - For any valid job payload, POST with `source: "ADMIN"` and `source: "CITIZEN"` both return HTTP 201 with identical field shapes (excluding `source`)
    - Tag: `// Feature: fixmycity-full-system, Property 1`
    - _Requirements: 1.2, 1.4, 17.2_

  - [ ]* 13.3 Write property test for Property 2: job schema defaults
    - In `backend/tests/job.property.test.js`
    - For any payload omitting optional fields, created Job has `status: "OPEN"`, `isVerified: false`, `isVerifiedCompletion: false`, `isDemoJob: false`
    - Tag: `// Feature: fixmycity-full-system, Property 2`
    - _Requirements: 1.1_

  - [ ]* 13.4 Write property test for Property 7: bid creation always PENDING
    - Create `backend/tests/bid.property.test.js`
    - For any valid bid payload referencing an existing job, POST `/api/bids` returns HTTP 201 and `status: "PENDING"`
    - Tag: `// Feature: fixmycity-full-system, Property 7`
    - _Requirements: 10.1_

  - [ ]* 13.5 Write property test for Property 8: assignment bid exclusivity
    - In `backend/tests/bid.property.test.js`
    - For any job with N bids, after PUT `/api/jobs/:id/assign`, exactly one bid has `status: "ACCEPTED"` and all others have `status: "REJECTED"`
    - Tag: `// Feature: fixmycity-full-system, Property 8`
    - _Requirements: 11.3, 13.5_

  - [ ]* 13.6 Write property test for Property 9: complaint status sync
    - Create `backend/tests/complaint.property.test.js`
    - For any job with a `complaintId`, updating job status to `IN_PROGRESS` or `COMPLETED` syncs the linked complaint's status
    - Tag: `// Feature: fixmycity-full-system, Property 9`
    - _Requirements: 13.2, 13.3, 13.4_

  - [ ]* 13.7 Write property test for Property 10: completion proof persistence
    - In `backend/tests/job.property.test.js`
    - For any completion payload, PUT `/api/jobs/:id/status` with `status: "COMPLETED"` persists `completionImage`, `completionLocation`, `completedAt`, `isVerifiedCompletion`
    - Tag: `// Feature: fixmycity-full-system, Property 10`
    - _Requirements: 12.5_

  - [ ]* 13.8 Write property test for Property 11: protected routes reject without token
    - Create `backend/tests/auth.property.test.js`
    - For any protected route (GET /api/jobs, POST /api/bids, etc.), a request without a Bearer token returns HTTP 401
    - Tag: `// Feature: fixmycity-full-system, Property 11`
    - _Requirements: 15.4_

  - [ ]* 13.9 Write property test for Property 12: demo job always sets isDemoJob and status
    - In `backend/tests/job.property.test.js`
    - For any preset index 0–4 or custom payload, POST `/api/jobs/demo` returns `isDemoJob: true` and `status: "OPEN"`
    - Tag: `// Feature: fixmycity-full-system, Property 12`
    - _Requirements: 16.1, 16.3_

  - [ ]* 13.10 Write property test for Property 13: complaint creation round-trip
    - In `backend/tests/complaint.property.test.js`
    - For any valid complaint payload, POST `/api/complaints` returns HTTP 201 with all submitted fields and `status: "RECEIVED"`
    - Tag: `// Feature: fixmycity-full-system, Property 13`
    - _Requirements: 17.1_

- [x] 14. Frontend property-based tests (Vitest + fast-check)
  - [x] 14.1 Verify existing frontend property tests pass
    - Run `vitest --run` in the frontend directory; confirm `markerColor.test.ts`, `markerCount.property.test.ts`, and `useJobs.analytics.test.ts` all pass (Properties 3, 4, 6 are already covered)
    - _Requirements: (test verification)_

  - [ ]* 14.2 Write property test for Property 5: popup description truncation
    - Create `src/test/popupDescription.property.test.ts`
    - For any job whose `description.length > 80`, the popup HTML contains the description truncated to at most 80 characters
    - Tag: `// Feature: fixmycity-full-system, Property 5`
    - _Requirements: 7.1, 9.4_

  - [ ]* 14.3 Write property test for Property 14: form validation blocks API calls
    - Create `src/test/createJobModal.property.test.tsx`
    - For any form state missing at least one of `title`, `description`, or `location`, submitting the form does not invoke any API call and displays a validation error
    - Use `@testing-library/react` to render `CreateJobModal` and mock the API module
    - Tag: `// Feature: fixmycity-full-system, Property 14`
    - _Requirements: 2.7_

  - [ ]* 14.4 Write property test for Property 15: status badges render for all Job_Status values
    - Create `src/test/statusBadge.property.test.tsx`
    - For any job with `status ∈ {OPEN, ASSIGNED, IN_PROGRESS, COMPLETED}`, the job card renders a visible status badge matching that status value
    - Tag: `// Feature: fixmycity-full-system, Property 15`
    - _Requirements: 14.1_

- [x] 15. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Many backend routes and frontend pages are already substantially implemented; tasks 1.3–1.7, 3.1, 4.1, 5.x, 6.x, 7.1–7.2 are verification/patch tasks — read the existing code first and only modify what is missing
- Backend tests require `mongodb-memory-server`; install it before writing test files
- Frontend PBT tasks 14.2–14.4 build on the existing test setup in `src/test/setup.ts`
- All property tests must run a minimum of 100 iterations and be tagged with `// Feature: fixmycity-full-system, Property N`
