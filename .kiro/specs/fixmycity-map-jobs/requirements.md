# Requirements Document

## Introduction

This spec upgrades the FixMyCity civic platform from a demo-job system to a fully interactive, real-time job management platform. It covers: real job creation with image upload and GPS/map-pin location, a live Leaflet map with severity-based hotspot markers for both the Authority and Contractor dashboards, hotspot clustering, completion location visualization, live data polling, and Authority dashboard analytics. The existing backend (Node.js/Express/Mongoose) and Authority portal frontend (React/TypeScript/Vite) are extended — no mock data is used.

## Glossary

- **Authority_Dashboard**: The React/TypeScript admin web app used by municipal authorities to create and manage jobs
- **Contractor_Dashboard**: The React/TypeScript web app used by contractors to discover jobs, place bids, and submit completion proof
- **Job_Controller**: The Express controller handling job CRUD, assignment, and status updates (`backend/controllers/jobController.js`)
- **Upload_Controller**: The Express controller handling image uploads via multer memory storage → Cloudinary (`backend/routes/uploadRoutes.js`)
- **Job_Form**: The real job creation form inside `CreateJobModal` on the Authority Dashboard
- **Map_View**: The Leaflet-based interactive map rendered on both the Authority and Contractor dashboards
- **Hotspot_Marker**: A colored Leaflet `divIcon` marker representing a job or complaint on the Map_View, colored by severity
- **Cluster_Marker**: A Leaflet MarkerCluster bubble that groups nearby Hotspot_Markers with a count badge
- **Completion_Marker**: A Leaflet marker placed at the contractor's GPS location when a job is marked COMPLETED
- **Job**: A work order document in MongoDB with fields: `title`, `description`, `category`, `severity`, `imageUrl`, `location {lat, lng, address}`, `status`, `assignedTo`, `completionImage`, `completionLocation {lat, lng}`, `isDemoJob`, timestamps
- **Severity**: An enum value — `LOW`, `MEDIUM`, or `HIGH` — indicating urgency of a job or complaint
- **Hotspot_Color**: The color assigned to a Hotspot_Marker based on Severity: HIGH → red (`#EF4444`), MEDIUM → yellow (`#F59E0B`), LOW → green (`#10B981`)
- **Live_Poll**: A `setInterval`-based mechanism that re-fetches API data every 30 seconds to reflect updates across dashboards
- **GPS_Capture**: Using `navigator.geolocation.getCurrentPosition()` to obtain the device's current coordinates
- **Map_Picker**: A Leaflet minimap embedded in the Job_Form that allows the authority to click or drag a pin to set job coordinates
- **Completion_Line**: A dashed Leaflet `polyline` drawn between the original job location and the Completion_Marker

---

## Requirements

### Requirement 1: Real Job Creation Form

**User Story:** As an authority, I want to create real civic jobs with a full form (title, description, category, severity, image, location) so that jobs reflect actual issues rather than hardcoded demo data.

#### Acceptance Criteria

1. THE Job_Form SHALL include input fields for: `title` (text, required), `description` (textarea, required), `category` (select from predefined list, required), and `severity` (toggle between LOW / MEDIUM / HIGH, required)
2. WHEN the authority submits the Job_Form with all required fields, THE Job_Controller SHALL create a Job document with `status: "OPEN"` and return the created job
3. IF the authority submits the Job_Form without a `title`, `description`, or `location`, THEN THE Job_Form SHALL display a validation error and SHALL NOT call the API
4. THE Job_Form SHALL remain accessible alongside the existing Demo Job mode via a mode toggle within the same modal

---

### Requirement 2: Image Upload in Job Creation

**User Story:** As an authority, I want to attach a photo to a job so that contractors can visually assess the issue before bidding.

#### Acceptance Criteria

1. THE Job_Form SHALL include an image upload control that accepts PNG, JPG, and WEBP files
2. WHEN an image file is selected, THE Job_Form SHALL display a preview of the selected image before submission
3. WHEN the authority submits the Job_Form with an image selected, THE Job_Form SHALL first POST the image to `/api/upload` and receive an `imageUrl`, then include `imageUrl` in the job creation payload
4. IF the `/api/upload` request fails, THEN THE Job_Form SHALL display an error toast and SHALL NOT proceed to create the job
5. WHERE no image is selected, THE Job_Form SHALL submit the job without an `imageUrl` field

---

### Requirement 3: Location Input — GPS Capture

**User Story:** As an authority, I want to capture my current GPS location for a job so that the job is pinned to the exact site of the issue.

#### Acceptance Criteria

1. THE Job_Form SHALL include a "Get GPS" button that calls `navigator.geolocation.getCurrentPosition()` with `enableHighAccuracy: true`
2. WHEN GPS coordinates are successfully obtained, THE Job_Form SHALL update the location state with `{ lat, lng }` and display the coordinates in the Map_Picker
3. IF the browser denies geolocation permission, THEN THE Job_Form SHALL display an error toast instructing the authority to set the location manually via the Map_Picker
4. WHILE a GPS request is in progress, THE Job_Form SHALL display a loading indicator on the "Get GPS" button

---

### Requirement 4: Location Input — Map Picker

**User Story:** As an authority, I want to click on a map to set a job's location so that I can pin issues precisely even without GPS.

#### Acceptance Criteria

1. THE Job_Form SHALL embed a Leaflet Map_Picker centered on a default city coordinate (Pune: `[18.5204, 73.8567]`) when no GPS coordinates are available
2. WHEN the authority clicks anywhere on the Map_Picker, THE Job_Form SHALL place a draggable pin at the clicked coordinates and update the location state with `{ lat, lng }`
3. WHEN the authority drags the pin to a new position, THE Job_Form SHALL update the location state with the new `{ lat, lng }` coordinates
4. THE Map_Picker SHALL display the current coordinates as a text overlay at the bottom of the map tile
5. WHEN GPS coordinates are captured via the "Get GPS" button, THE Map_Picker SHALL pan to and re-center on those coordinates

---

### Requirement 5: Authority Map Dashboard — All Jobs Display

**User Story:** As an authority, I want to see all jobs and complaints plotted on a live map so that I can understand the geographic distribution of civic issues.

#### Acceptance Criteria

1. THE Map_View SHALL fetch all jobs from `GET /api/jobs` and all complaints from `GET /api/complaints` on mount
2. WHEN jobs and complaints are loaded, THE Map_View SHALL render one Hotspot_Marker per job at `job.location.lat` / `job.location.lng`
3. WHEN complaints are loaded that have no corresponding job, THE Map_View SHALL render a smaller dot marker per complaint at `complaint.location.lat` / `complaint.location.lng`
4. IF a job or complaint has no `location.lat` or `location.lng`, THEN THE Map_View SHALL skip rendering a marker for that record
5. THE Map_View SHALL use the Live_Poll mechanism to re-fetch jobs and complaints every 30 seconds

---

### Requirement 6: Hotspot Color System

**User Story:** As an authority, I want job markers to be colored by severity so that I can instantly identify critical issues on the map.

#### Acceptance Criteria

1. THE Map_View SHALL render Hotspot_Markers using Hotspot_Color: HIGH severity → `#EF4444` (red), MEDIUM → `#F59E0B` (yellow), LOW → `#10B981` (green)
2. WHEN a job has `status: "COMPLETED"`, THE Map_View SHALL render its Hotspot_Marker in green (`#10B981`) regardless of severity
3. WHEN a job has `severity: "HIGH"` and `status` is not `"COMPLETED"`, THE Map_View SHALL apply a CSS pulse animation to the Hotspot_Marker
4. THE Map_View SHALL display a legend showing the three Hotspot_Color values and their severity labels

---

### Requirement 7: Hotspot Clustering

**User Story:** As an authority, I want nearby markers to be grouped into clusters so that the map remains readable when many issues are reported in the same area.

#### Acceptance Criteria

1. THE Map_View SHALL use `leaflet.markercluster` to group Hotspot_Markers that are geographically close at the current zoom level
2. WHEN multiple markers are clustered, THE Map_View SHALL display a Cluster_Marker showing the count of grouped markers
3. WHEN the authority clicks a Cluster_Marker, THE Map_View SHALL zoom in to reveal the individual Hotspot_Markers within the cluster

---

### Requirement 8: Marker Popup

**User Story:** As an authority or contractor, I want to click a map marker and see job details in a popup so that I can assess the issue without leaving the map.

#### Acceptance Criteria

1. WHEN the authority or contractor clicks a Hotspot_Marker, THE Map_View SHALL display a popup containing: job `title`, `description` (truncated to 80 characters), `severity` badge, `status` badge, and `imageUrl` thumbnail if available
2. THE Map_View SHALL style popups with a dark background (`#1a1a1a`) and white text to match the dashboard theme
3. WHEN the authority or contractor clicks a complaint dot marker, THE Map_View SHALL display a popup containing the complaint `description` and `category`

---

### Requirement 9: Contractor Map Dashboard

**User Story:** As a contractor, I want to see all open jobs on a map so that I can discover nearby work opportunities and place bids directly from the map.

#### Acceptance Criteria

1. THE Contractor_Dashboard SHALL include a Map_View page that fetches open jobs from `GET /api/jobs/open`
2. WHEN open jobs are loaded, THE Contractor_Dashboard Map_View SHALL render one Hotspot_Marker per open job using the Hotspot_Color system
3. WHEN the contractor clicks a Hotspot_Marker, THE Contractor_Dashboard Map_View SHALL display a popup with job `title`, `description`, `severity`, `location.address`, and a "Place Bid" button
4. WHEN the contractor clicks "Place Bid" in the popup, THE Contractor_Dashboard Map_View SHALL open the existing bid submission modal pre-filled with the selected job
5. THE Contractor_Dashboard Map_View SHALL use the Live_Poll mechanism to re-fetch open jobs every 30 seconds

---

### Requirement 10: Completion Location Visualization

**User Story:** As an authority, I want to see where a contractor completed a job on the map so that I can verify the work was done at the correct location.

#### Acceptance Criteria

1. WHEN a job has `status: "COMPLETED"` and `completionLocation.lat` is present, THE Map_View SHALL render a Completion_Marker at `completionLocation.lat` / `completionLocation.lng`
2. THE Completion_Marker SHALL use a distinct icon (checkmark style) visually different from the Hotspot_Marker
3. WHEN both a Hotspot_Marker and a Completion_Marker exist for the same job, THE Map_View SHALL draw a Completion_Line (dashed green polyline) connecting the two markers
4. WHEN the authority clicks a Completion_Marker, THE Map_View SHALL display a popup showing "Resolution Proof" and the `completionImage` thumbnail if available

---

### Requirement 11: Live Data Flow

**User Story:** As an authority or contractor, I want the map and dashboards to reflect the latest job state so that I always see current information without manually refreshing.

#### Acceptance Criteria

1. THE Map_View SHALL re-render markers automatically when the Live_Poll fetches updated job or complaint data
2. WHEN a new job is created via the Job_Form, THE Authority_Dashboard SHALL immediately trigger a data refetch so the new job appears on the map without a page reload
3. WHEN a job status changes (assigned, in-progress, completed), THE Map_View SHALL update the affected marker's color and style on the next Live_Poll cycle
4. THE Authority_Dashboard SHALL display a loading state on the Map_View while initial data is being fetched

---

### Requirement 12: Backend — Job Model Completeness

**User Story:** As a developer, I want the Job model to include all fields required by the map and completion features so that the API can store and return complete job data.

#### Acceptance Criteria

1. THE Job model SHALL include: `title` (String, required), `description` (String), `imageUrl` (String), `severity` (enum: LOW, MEDIUM, HIGH), `location` (object: `lat` Number, `lng` Number, `address` String), `completionImage` (String), `completionLocation` (object: `lat` Number, `lng` Number), `isDemoJob` (Boolean, default false), and timestamps
2. WHEN a POST request is made to `/api/jobs` with `imageUrl` and `location`, THE Job_Controller SHALL persist both fields on the created Job document
3. WHEN a PUT request is made to `/api/jobs/:id/status` with `status: "COMPLETED"` and `completionLocation`, THE Job_Controller SHALL persist `completionLocation` on the Job document
4. WHEN a PUT request is made to `/api/jobs/:id/status` with `status: "COMPLETED"` and `completionImage`, THE Job_Controller SHALL persist `completionImage` on the Job document

---

### Requirement 13: Authority Dashboard Analytics

**User Story:** As an authority, I want to see summary statistics on the dashboard so that I can quickly assess the current state of civic issues.

#### Acceptance Criteria

1. THE Authority_Dashboard SHALL display a "Total Issues" count equal to the total number of jobs fetched from `GET /api/jobs`
2. THE Authority_Dashboard SHALL display an "Active Hotspots" count equal to the number of jobs where `status` is not `"COMPLETED"`
3. THE Authority_Dashboard SHALL display a "Completed Issues" count equal to the number of jobs where `status` is `"COMPLETED"`
4. THE Authority_Dashboard SHALL display a "Severity Distribution" breakdown showing the count of HIGH, MEDIUM, and LOW severity jobs
5. THE Authority_Dashboard SHALL derive all analytics counts from live API data — no hardcoded or mock values

---

### Requirement 14: Performance and Reliability

**User Story:** As a user, I want the map and dashboards to handle missing data gracefully and always show real data so that the experience is reliable.

#### Acceptance Criteria

1. THE Map_View SHALL handle jobs or complaints with missing `location` fields by skipping marker rendering without throwing a runtime error
2. THE Map_View SHALL display a loading indicator while job and complaint data is being fetched
3. THE Authority_Dashboard and Contractor_Dashboard SHALL fetch all data exclusively from the API — no mock or hardcoded data SHALL be used
4. IF an API request fails, THEN THE Map_View SHALL display an error message and SHALL NOT crash the page
5. THE Map_View SHALL clean up the Leaflet map instance on component unmount to prevent memory leaks
