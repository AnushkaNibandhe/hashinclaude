# Requirements Document

## Introduction

FixMyCity is a civic issue management system composed of three apps: a Citizen App (future integration, do not modify), an Authority Dashboard (React/TypeScript/Vite), and a Contractor Dashboard (React/TypeScript/Vite), all backed by a shared Node.js/Express/Mongoose API.

This spec covers the **complete end-to-end system** in its current working state: the Authority Dashboard acts as the temporary issue creator (simulating future citizen input), the Contractor Dashboard handles bidding and job completion, and the backend serves as the single source of truth for all data. The architecture is explicitly designed so the Citizen App can be integrated later without any backend changes.

The system flow is: Authority creates issue → issue appears on map → Contractor views and bids → Authority assigns → Contractor completes with proof → map updates.

## Glossary

- **System**: The complete FixMyCity backend API (Node.js/Express/Mongoose)
- **Authority_Dashboard**: The React/TypeScript admin web app used by municipal authorities to create issues, manage jobs, assign contractors, and monitor the map
- **Contractor_Dashboard**: The React/TypeScript web app used by contractors to discover open jobs on a map, place bids, and submit completion proof
- **Citizen_App**: The future mobile/web app that will allow citizens to submit complaints directly; currently not integrated — the Authority acts as a stand-in
- **Job_Controller**: The Express controller at `backend/controllers/jobController.js` handling job CRUD, assignment, and status transitions
- **Bid_Controller**: The Express controller at `backend/controllers/bidController.js` handling bid creation and retrieval
- **Complaint_Controller**: The Express controller at `backend/controllers/complaintController.js` handling complaint CRUD
- **Upload_Controller**: The Express controller handling image uploads via multer memory storage to Cloudinary
- **Auth_Controller**: The Express controller handling user registration and JWT login
- **Auth_Middleware**: The JWT verification middleware that protects all non-auth routes
- **Issue**: A civic problem (pothole, broken light, drainage blockage, etc.) that needs resolution; created by the Authority now, by citizens in the future
- **Job**: A MongoDB document representing a work order derived from an Issue, with fields: `title`, `description`, `category`, `severity`, `imageUrl`, `location {lat, lng, address}`, `status`, `source`, `isVerified`, `assignedTo`, `completionImage`, `completionLocation {lat, lng}`, `completedAt`, `isVerifiedCompletion`, `isDemoJob`, timestamps
- **Bid**: A MongoDB document representing a contractor's offer to complete a Job, with fields: `jobId`, `contractorId`, `eta`, `cost`, `note`, `status`
- **Complaint**: A MongoDB document representing a citizen-submitted issue (future use); shares the same location/severity/category structure as Job
- **Severity**: An enum value — `LOW`, `MEDIUM`, or `HIGH` — indicating urgency
- **Job_Status**: The lifecycle enum for a Job: `OPEN` → `ASSIGNED` → `IN_PROGRESS` → `COMPLETED`
- **Bid_Status**: The lifecycle enum for a Bid: `PENDING` → `ACCEPTED` or `REJECTED`
- **Map_View**: The Leaflet-based interactive map rendered on both dashboards
- **Hotspot_Marker**: A colored Leaflet `divIcon` marker representing a Job on the Map_View, colored by Severity
- **Hotspot_Color**: The color assigned to a Hotspot_Marker: HIGH → `#EF4444` (red), MEDIUM → `#F59E0B` (yellow), LOW → `#10B981` (green); COMPLETED jobs always render green
- **Cluster_Marker**: A Leaflet MarkerCluster bubble grouping nearby Hotspot_Markers with a count badge
- **Completion_Marker**: A Leaflet marker placed at the contractor's GPS location when a Job is marked COMPLETED
- **Completion_Line**: A dashed green Leaflet polyline connecting the original Job location to the Completion_Marker
- **GPS_Capture**: Using `navigator.geolocation.getCurrentPosition()` to obtain device coordinates
- **Map_Picker**: A Leaflet minimap embedded in the issue creation form allowing click/drag pin placement
- **Live_Poll**: A `setInterval`-based mechanism re-fetching API data every 30 seconds
- **Issue_Form**: The issue creation form in the Authority Dashboard used to create Jobs that simulate future citizen complaints
- **Source**: A field on Job indicating origin: `"ADMIN"` (authority-created) or `"CITIZEN"` (future citizen-created); backend logic must not branch on this value

---

## Requirements

### Requirement 1: Unified Job Schema — Future-Ready Data Pipeline

**User Story:** As a developer, I want the Job schema to be unified and source-agnostic so that authority-created jobs and future citizen-created jobs follow the same data structure without any backend logic changes.

#### Acceptance Criteria

1. THE Job model SHALL include fields: `title` (String, required), `description` (String), `category` (String), `severity` (enum: LOW, MEDIUM, HIGH, default: LOW), `imageUrl` (String), `location` (object: `lat` Number, `lng` Number, `address` String), `status` (enum: OPEN, ASSIGNED, IN_PROGRESS, COMPLETED, default: OPEN), `source` (String, default: "ADMIN"), `isVerified` (Boolean, default: false), `assignedTo` (ref: User), `completionImage` (String), `completionLocation` (object: `lat` Number, `lng` Number), `completedAt` (Date), `isVerifiedCompletion` (Boolean, default: false), `isDemoJob` (Boolean, default: false), `complaintId` (ref: Complaint, optional), and timestamps
2. WHEN a POST request is made to `/api/jobs` with `{ title, description, category, severity, imageUrl, location, status, source, isVerified }`, THE Job_Controller SHALL persist all provided fields and return the created Job document with HTTP 201
3. THE Job_Controller SHALL NOT contain any conditional logic that branches on the `source` field value
4. WHEN the Citizen_App is integrated in the future and calls `POST /api/jobs` or `POST /api/complaints`, THE System SHALL process those requests using the same controller logic as authority-created jobs, requiring zero backend code changes

---

### Requirement 2: Authority Issue Creation Form

**User Story:** As an authority, I want to create civic issues using a full form so that I can act as the temporary issue source while the Citizen App is not yet integrated.

#### Acceptance Criteria

1. THE Issue_Form SHALL include input fields for: `title` (text, required), `description` (textarea, required), `category` (select: POTHOLE, ELECTRICAL, DRAINAGE, FOOTPATH, WATER, OTHER, required), and `severity` (toggle: LOW / MEDIUM / HIGH, required)
2. THE Issue_Form SHALL include an image upload control accepting PNG, JPG, and WEBP files
3. WHEN an image file is selected, THE Issue_Form SHALL display a preview of the selected image before submission
4. THE Issue_Form SHALL include a "Get GPS" button that calls GPS_Capture with `enableHighAccuracy: true`
5. THE Issue_Form SHALL embed a Map_Picker centered on `[18.5204, 73.8567]` (Pune) when no GPS coordinates are available
6. WHEN the authority submits the Issue_Form with all required fields, THE Issue_Form SHALL POST to `/api/upload` first (if an image is selected), then POST to `/api/jobs` with payload `{ title, description, category, severity, imageUrl, location: {lat, lng, address}, status: "OPEN", source: "ADMIN", isVerified: true, createdAt: timestamp }`
7. IF the authority submits the Issue_Form without `title`, `description`, or `location`, THEN THE Issue_Form SHALL display a validation error and SHALL NOT call any API
8. WHEN the Job is successfully created, THE Authority_Dashboard SHALL immediately trigger a data refetch so the new marker appears on the map without a page reload

---

### Requirement 3: Image Upload

**User Story:** As an authority or contractor, I want to upload photos so that visual evidence is attached to issues and completion proofs.

#### Acceptance Criteria

1. WHEN a POST request is made to `/api/upload` with a multipart form containing an `image` field, THE Upload_Controller SHALL upload the image to Cloudinary and return `{ imageUrl }` with the Cloudinary secure URL
2. IF a POST request is made to `/api/upload` without an `image` field, THEN THE Upload_Controller SHALL return HTTP 400 with `{ error: "No image provided" }`
3. IF the `/api/upload` request fails, THEN THE Issue_Form SHALL display an error toast and SHALL NOT proceed to create the Job
4. THE Upload_Controller SHALL use multer memory storage so that no files are written to the local filesystem

---

### Requirement 4: GPS Capture and Map Picker

**User Story:** As an authority or contractor, I want to capture GPS coordinates or click a map to set a location so that issues and completions are pinned to exact geographic positions.

#### Acceptance Criteria

1. WHEN GPS_Capture succeeds, THE Issue_Form SHALL update the location state with `{ lat, lng }` and pan the Map_Picker to those coordinates
2. IF the browser denies geolocation permission, THEN THE Issue_Form SHALL display an error toast instructing the user to set location manually via the Map_Picker
3. WHILE a GPS request is in progress, THE Issue_Form SHALL display a loading indicator on the "Get GPS" button
4. WHEN the authority clicks anywhere on the Map_Picker, THE Issue_Form SHALL place a draggable pin at the clicked coordinates and update the location state with `{ lat, lng }`
5. WHEN the authority drags the pin to a new position, THE Issue_Form SHALL update the location state with the new `{ lat, lng }` coordinates
6. THE Map_Picker SHALL display the current coordinates as a text overlay at the bottom of the map tile

---

### Requirement 5: Authority Map Dashboard

**User Story:** As an authority, I want to see all jobs plotted on a live map with severity-based color coding so that I can monitor the geographic distribution and urgency of civic issues.

#### Acceptance Criteria

1. THE Authority_Dashboard Map_View SHALL fetch all jobs from `GET /api/jobs` on mount and re-fetch every 30 seconds via Live_Poll
2. WHEN jobs are loaded, THE Authority_Dashboard Map_View SHALL render one Hotspot_Marker per job at `job.location.lat` / `job.location.lng`
3. IF a job has no `location.lat` or `location.lng`, THEN THE Authority_Dashboard Map_View SHALL skip rendering a marker for that job without throwing a runtime error
4. THE Authority_Dashboard Map_View SHALL render Hotspot_Markers using Hotspot_Color: HIGH → `#EF4444`, MEDIUM → `#F59E0B`, LOW → `#10B981`
5. WHEN a job has `status: "COMPLETED"`, THE Authority_Dashboard Map_View SHALL render its Hotspot_Marker in green (`#10B981`) regardless of severity
6. WHEN a job has `severity: "HIGH"` and `status` is not `"COMPLETED"`, THE Authority_Dashboard Map_View SHALL apply a CSS pulse animation to the Hotspot_Marker
7. THE Authority_Dashboard Map_View SHALL display a legend showing the three Hotspot_Color values and their severity labels
8. THE Authority_Dashboard Map_View SHALL use `leaflet.markercluster` to group nearby Hotspot_Markers into Cluster_Markers showing a count badge

---

### Requirement 6: Authority Map — Completed Job Visualization

**User Story:** As an authority, I want to see where a contractor completed a job on the map so that I can verify the work was done at the correct location.

#### Acceptance Criteria

1. WHEN a job has `status: "COMPLETED"` and `completionLocation.lat` is present, THE Authority_Dashboard Map_View SHALL render a Completion_Marker at `completionLocation.lat` / `completionLocation.lng`
2. THE Completion_Marker SHALL use a distinct icon (checkmark style) visually different from the Hotspot_Marker
3. WHEN both a Hotspot_Marker and a Completion_Marker exist for the same job, THE Authority_Dashboard Map_View SHALL draw a Completion_Line (dashed green polyline) connecting the two markers
4. WHEN the authority clicks a Completion_Marker, THE Authority_Dashboard Map_View SHALL display a popup showing "Resolution Proof" and the `completionImage` thumbnail if available

---

### Requirement 7: Map Marker Popups

**User Story:** As an authority or contractor, I want to click a map marker and see job details in a popup so that I can assess the issue without leaving the map.

#### Acceptance Criteria

1. WHEN a Hotspot_Marker is clicked, THE Map_View SHALL display a popup containing: job `title`, `description` truncated to 80 characters, `severity` badge, `status` badge, and `imageUrl` thumbnail if available
2. THE Map_View SHALL style popups with a dark background (`#1a1a1a`) and white text to match the dashboard theme
3. WHEN a Cluster_Marker is clicked, THE Map_View SHALL zoom in to reveal the individual Hotspot_Markers within the cluster

---

### Requirement 8: Authority Dashboard Analytics

**User Story:** As an authority, I want to see live summary statistics on the dashboard so that I can quickly assess the current state of civic issues.

#### Acceptance Criteria

1. THE Authority_Dashboard SHALL display a "Total Issues" count equal to `jobs.length` from `GET /api/jobs`
2. THE Authority_Dashboard SHALL display an "Active Hotspots" count equal to `jobs.filter(j => j.status !== "COMPLETED").length`
3. THE Authority_Dashboard SHALL display a "Completed Issues" count equal to `jobs.filter(j => j.status === "COMPLETED").length`
4. THE Authority_Dashboard SHALL display a "Severity Distribution" breakdown showing the count of HIGH, MEDIUM, and LOW severity jobs
5. THE Authority_Dashboard SHALL derive all analytics counts from live API data — no hardcoded or mock values SHALL be used

---

### Requirement 9: Contractor Map Dashboard

**User Story:** As a contractor, I want to see all open jobs on a map so that I can discover nearby work opportunities and place bids directly from the map.

#### Acceptance Criteria

1. THE Contractor_Dashboard SHALL include a Map_View page that fetches open jobs from `GET /api/jobs/open` on mount and re-fetches every 30 seconds via Live_Poll
2. WHEN open jobs are loaded, THE Contractor_Dashboard Map_View SHALL render one Hotspot_Marker per open job using the Hotspot_Color system
3. IF an open job has no `location.lat` or `location.lng`, THEN THE Contractor_Dashboard Map_View SHALL skip rendering a marker for that job without throwing a runtime error
4. WHEN the contractor clicks a Hotspot_Marker, THE Contractor_Dashboard Map_View SHALL display a popup with job `title`, `description` truncated to 80 characters, `severity` badge, `location.address`, and a "Place Bid" button
5. WHEN the contractor clicks "Place Bid" in the popup, THE Contractor_Dashboard Map_View SHALL open the bid submission form pre-filled with the selected job

---

### Requirement 10: Contractor Bid Submission

**User Story:** As a contractor, I want to place a bid on an open job so that I can be selected to complete the work.

#### Acceptance Criteria

1. WHEN a POST request is made to `/api/bids` with `{ jobId, contractorId, eta, cost, note }`, THE Bid_Controller SHALL create a Bid document with `status: "PENDING"` and return HTTP 201
2. IF a POST request is made to `/api/bids` with a `jobId` that does not reference an existing Job, THEN THE Bid_Controller SHALL return HTTP 404 with `{ error: "Job not found" }`
3. WHEN a GET request is made to `/api/bids/:jobId`, THE Bid_Controller SHALL return all bids for that job with `contractorId` populated with `username` and `role`
4. THE Contractor_Dashboard bid form SHALL include fields for `eta` (text), `cost` (number), and `note` (textarea)
5. WHEN a bid is successfully submitted, THE Contractor_Dashboard SHALL display a success confirmation and close the bid form

---

### Requirement 11: Authority Job Assignment

**User Story:** As an authority, I want to review bids and assign a job to a contractor so that the best-qualified contractor is selected for each issue.

#### Acceptance Criteria

1. WHEN a GET request is made to `/api/bids/:jobId`, THE Authority_Dashboard Jobs page SHALL display all bids for that job showing `contractorId.username`, `eta`, `cost`, and `note`
2. WHEN the authority selects a bid and clicks "Assign", THE Authority_Dashboard SHALL PUT to `/api/jobs/:id/assign` with `{ contractorId, bidId }`
3. WHEN a PUT request is made to `/api/jobs/:id/assign`, THE Job_Controller SHALL set `job.assignedTo` to `contractorId`, set `job.status` to `ASSIGNED`, set the winning Bid's `status` to `ACCEPTED`, and set all other Bids for that job to `REJECTED`
4. IF a PUT request is made to `/api/jobs/:id/assign` with a `contractorId` that does not reference an existing User, THEN THE Job_Controller SHALL return HTTP 404 with `{ error: "Contractor not found" }`
5. WHEN a job is successfully assigned, THE Authority_Dashboard SHALL refresh the job list and update the job's status badge to `ASSIGNED`

---

### Requirement 12: Contractor Job Completion with Proof

**User Story:** As a contractor, I want to mark a job as complete with a photo and my GPS location so that the authority can verify the work was done correctly.

#### Acceptance Criteria

1. THE Contractor_Dashboard SHALL include a "Complete Job" action for jobs where `status` is `ASSIGNED` or `IN_PROGRESS`
2. WHEN the contractor initiates job completion, THE Contractor_Dashboard SHALL capture the contractor's current GPS coordinates via GPS_Capture
3. THE Contractor_Dashboard SHALL include an image upload control for the completion proof photo
4. WHEN the contractor submits completion, THE Contractor_Dashboard SHALL first POST the completion image to `/api/upload`, then PUT to `/api/jobs/:id/status` with payload `{ status: "COMPLETED", completionImage, completionLocation: {lat, lng}, completedAt: timestamp, isVerifiedCompletion: true }`
5. WHEN a PUT request is made to `/api/jobs/:id/status` with `status: "COMPLETED"` and `completionLocation`, THE Job_Controller SHALL persist `completionLocation`, `completionImage`, `completedAt`, and `isVerifiedCompletion` on the Job document
6. IF GPS_Capture is denied during job completion, THEN THE Contractor_Dashboard SHALL display an error toast and SHALL NOT submit the completion without a location

---

### Requirement 13: Job Status Lifecycle and Sync

**User Story:** As a system operator, I want job and complaint statuses to stay in sync throughout the lifecycle so that the data pipeline is always consistent.

#### Acceptance Criteria

1. THE Job_Controller SHALL enforce the status lifecycle: OPEN → ASSIGNED → IN_PROGRESS → COMPLETED
2. WHEN a Job is created for a Complaint (via `complaintId`), THE Job_Controller SHALL update the Complaint's `status` to `JOB_CREATED` in the same request handler
3. WHEN a Job's `status` is updated to `IN_PROGRESS`, THE Job_Controller SHALL update the linked Complaint's `status` to `IN_PROGRESS` if `complaintId` is present
4. WHEN a Job's `status` is updated to `COMPLETED`, THE Job_Controller SHALL update the linked Complaint's `status` to `COMPLETED` if `complaintId` is present
5. WHEN a bid is accepted via `/api/jobs/:id/assign`, THE Job_Controller SHALL set all other Bids for that job to `REJECTED` in the same request handler, ensuring at most one Bid per job has `status: "ACCEPTED"` at any time

---

### Requirement 14: Status Badges and UI Feedback

**User Story:** As an authority or contractor, I want to see clear status indicators and loading states throughout the UI so that I always know the current state of each job.

#### Acceptance Criteria

1. THE Authority_Dashboard and Contractor_Dashboard SHALL display status badges for all four Job_Status values: OPEN, ASSIGNED, IN_PROGRESS, COMPLETED
2. WHEN a job has `isVerified: true`, THE Authority_Dashboard SHALL display a "VERIFIED ✅" indicator on that job
3. WHEN a job has `isVerifiedCompletion: true`, THE Authority_Dashboard SHALL display a "COMPLETION VERIFIED ✅" indicator on that job
4. THE Authority_Dashboard and Contractor_Dashboard SHALL display a loading state while API data is being fetched
5. IF an API request fails, THEN THE Authority_Dashboard or Contractor_Dashboard SHALL display an error message and SHALL NOT crash the page

---

### Requirement 15: Backend API — Complete Route Surface

**User Story:** As a developer, I want all required API routes registered and protected so that both dashboards can operate fully.

#### Acceptance Criteria

1. THE System SHALL expose the following routes, all protected by Auth_Middleware except `/api/auth/*`:
   - `POST /api/auth/signup`, `POST /api/auth/login`
   - `GET /api/jobs`, `POST /api/jobs`, `GET /api/jobs/open`
   - `PUT /api/jobs/:id/assign`, `PUT /api/jobs/:id/status`
   - `GET /api/bids/:jobId`, `POST /api/bids`
   - `GET /api/complaints`, `POST /api/complaints`, `GET /api/complaints/:id`, `PATCH /api/complaints/:id/status`
   - `POST /api/upload`
2. THE System SHALL apply `cors()` and `express.json()` middleware before all route handlers
3. THE System SHALL connect to MongoDB using the `MONGO_URI` environment variable on startup
4. WHEN a request is made to a protected route without a valid JWT bearer token, THE Auth_Middleware SHALL return HTTP 401

---

### Requirement 16: Demo Job Presets

**User Story:** As an authority, I want to quickly create realistic demo jobs from preset templates so that I can populate the system with representative data for testing and demonstration without filling out the full form.

#### Acceptance Criteria

1. THE System SHALL expose `POST /api/jobs/demo` (protected) that accepts an optional `preset` index (0–4) and creates a Job from the corresponding preset template with `isDemoJob: true` and `status: "OPEN"`
2. WHEN `POST /api/jobs/demo` is called without a `preset` index, THE Job_Controller SHALL select a random preset from the five built-in templates
3. WHEN `POST /api/jobs/demo` is called with a full custom payload (`title`, `description`, `category`, `severity`, `location`), THE Job_Controller SHALL create a Job from that payload with `isDemoJob: true`
4. THE System SHALL expose `GET /api/jobs/demo/presets` (protected) that returns the list of preset templates with `index`, `title`, `category`, `severity`, and `location`
5. THE Authority_Dashboard SHALL display a "Demo" mode toggle in the Create Job modal that shows the preset list and allows one-click creation of a demo job
6. WHEN a job has `isDemoJob: true`, THE Authority_Dashboard Jobs page SHALL display a "demo" badge on that job card

---

### Requirement 17: Future Citizen App Compatibility

**User Story:** As a developer, I want the backend to be structured so that the Citizen App can be integrated later without any changes to existing backend logic.

#### Acceptance Criteria

1. THE System SHALL accept `POST /api/complaints` with `{ description, imageUrl, category, severity, location }` and create a Complaint document — this endpoint SHALL remain unchanged when the Citizen App is integrated
2. THE System SHALL accept `POST /api/jobs` with any `source` value (`"ADMIN"` or `"CITIZEN"`) and process both identically
3. THE Job_Controller SHALL NOT contain any `if (source === "ADMIN")` or `if (source === "CITIZEN")` conditional branches
4. THE Complaint model and Job model schemas SHALL NOT be modified when the Citizen App is integrated, as the unified schema already accommodates citizen-submitted data

---

### Requirement 18: Performance and Reliability

**User Story:** As a user, I want the map and dashboards to handle missing data and errors gracefully so that the experience is reliable.

#### Acceptance Criteria

1. THE Map_View SHALL handle jobs with missing `location` fields by skipping marker rendering without throwing a runtime error
2. THE Map_View SHALL display a loading indicator while job data is being fetched
3. IF an API request fails, THEN THE Map_View SHALL display an error message and SHALL NOT crash the page
4. THE Map_View SHALL clean up the Leaflet map instance on component unmount to prevent memory leaks
5. THE Authority_Dashboard and Contractor_Dashboard SHALL fetch all data exclusively from the API — no mock or hardcoded data SHALL be used in any production code path
