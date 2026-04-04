<<<<<<< HEAD
# FixMyCity — Civic Issue Management System

> A full-stack platform for reporting, tracking, and resolving civic infrastructure issues across a city. Built for municipal authorities and contractors, with a future-ready pipeline for citizen-submitted complaints.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Tech Stack](#3-tech-stack)
4. [Applications](#4-applications)
   - [Authority Dashboard](#41-authority-dashboard)
   - [Contractor Dashboard](#42-contractor-dashboard)
   - [Citizen App (Future)](#43-citizen-app-future)
5. [Core Workflow](#5-core-workflow)
6. [Features](#6-features)
7. [Data Models](#7-data-models)
8. [API Reference](#8-api-reference)
9. [Authentication & Security](#9-authentication--security)
10. [Map System](#10-map-system)
11. [Image Uploads](#11-image-uploads)
12. [Demo Mode](#12-demo-mode)
13. [Status Lifecycles](#13-status-lifecycles)
14. [Testing Strategy](#14-testing-strategy)
15. [Project Structure](#15-project-structure)
16. [Environment Variables](#16-environment-variables)
17. [Getting Started](#17-getting-started)

---

## 1. Project Overview

FixMyCity is a civic issue management system that connects three stakeholders:

- **Municipal Authorities** — create and manage civic issues (potholes, broken lights, drainage problems, etc.), assign contractors, and monitor resolution on a live map.
- **Contractors** — discover open jobs on a map, place competitive bids, and submit GPS-verified completion proof with photos.
- **Citizens** (future) — report issues directly via a mobile/web app. The backend is already structured to accept citizen data without any code changes.

The system is designed around a **source-agnostic data pipeline**: whether a job is created by an authority or a citizen, it flows through the exact same backend logic. This means the Citizen App can be integrated later with zero backend changes.

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                          CLIENTS                            │
│                                                             │
│  Authority Dashboard     Contractor Dashboard   Citizen App │
│  (React + Vite + TS)     (React + Vite + TS)   (future)    │
│         │                        │                  │       │
└─────────┼────────────────────────┼──────────────────┼───────┘
          │   JWT Bearer Token     │                  │
          ▼                        ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                   Node.js / Express API                     │
│                                                             │
│   JWT Auth Middleware (protects all non-auth routes)        │
│                                                             │
│   /api/auth    /api/jobs    /api/bids    /api/complaints     │
│   /api/upload  /api/seed                                    │
└──────────────────────┬──────────────────────┬──────────────┘
                       │                      │
              ┌────────▼────────┐    ┌────────▼────────┐
              │   MongoDB Atlas  │    │  Cloudinary CDN  │
              │  (all documents) │    │  (image storage) │
              └─────────────────┘    └─────────────────┘
```

### Key Architectural Decisions

| Decision | Rationale |
|---|---|
| Single shared backend | Both dashboards and the future Citizen App hit the same API — no separate BFF layers |
| Source-agnostic job pipeline | The `source` field on Job is stored but never branched on in controller logic |
| Cloudinary for media | Images are streamed from multer memory storage directly to Cloudinary — nothing written to disk |
| JWT authentication | All routes except `/api/auth/*` require a valid Bearer token; role is embedded in the token |
| 30-second live polling | Both dashboards use `setInterval`-based polling — keeps the backend stateless, no WebSockets needed |

---

## 3. Tech Stack

### Backend
| Layer | Technology |
|---|---|
| Runtime | Node.js (ESM modules) |
| Framework | Express.js 4.x |
| Database | MongoDB via Mongoose 8.x |
| Authentication | JWT (jsonwebtoken) + bcryptjs |
| File Uploads | Multer (memory storage) → Cloudinary SDK 2.x |
| Email | Nodemailer |
| Testing | Jest + Supertest + fast-check + mongodb-memory-server |

### Frontend (Both Dashboards)
| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| Build Tool | Vite 5 |
| Routing | React Router DOM v6 |
| State / Data Fetching | TanStack Query (React Query) v5 |
| UI Components | shadcn/ui (Radix UI primitives) |
| Styling | Tailwind CSS 3 |
| Maps | Leaflet 1.9 + React Leaflet 5 |
| Forms | React Hook Form + Zod validation |
| Charts | Recharts |
| Animations | Framer Motion |
| Notifications | Sonner (toast) |
| Testing | Vitest + Testing Library + fast-check + Playwright |

---

## 4. Applications

### 4.1 Authority Dashboard

The web portal used by municipal authorities. It acts as the **temporary issue creator** while the Citizen App is not yet integrated.

**Pages:**
- `/` — Landing page
- `/login`, `/signup` — Authority authentication
- `/dashboard` — Live analytics overview (stat cards + severity distribution)
- `/jobs` — Kanban board for all jobs across all statuses
- `/complaints` — Complaint management
- `/map` — Full-screen interactive map with all job markers

**Key Capabilities:**
- Create civic issues via a full form (title, description, category, severity, image, GPS/map location)
- View all jobs in a Kanban board (OPEN → ASSIGNED → IN_PROGRESS → COMPLETED)
- Review contractor bids for each open job
- Assign a contractor to a job (accepts winning bid, auto-rejects all others)
- View completion proof (photo + GPS location) on the map
- One-click demo job creation from preset templates
- Live analytics: total issues, active hotspots, completed issues, severity breakdown

### 4.2 Contractor Dashboard

The web portal used by contractors to find and complete work.

**Pages:**
- `/contractor/login`, `/contractor/signup` — Contractor authentication
- `/contractor/app/` — Contractor dashboard with personal stats
- `/contractor/app/jobs` — Browse all open jobs available for bidding
- `/contractor/app/bids` — View submitted bids and their statuses
- `/contractor/app/my-jobs` — Jobs assigned to this contractor
- `/contractor/app/map` — Interactive map showing open jobs with bid popup
- `/contractor/app/profile` — Contractor profile and reputation ring

**Key Capabilities:**
- Discover open jobs on an interactive map
- Click a map marker to see job details and place a bid directly from the popup
- Submit bids with ETA, cost estimate, and notes
- Mark assigned jobs as complete with GPS capture and photo proof
- Track bid statuses (PENDING / ACCEPTED / REJECTED)

### 4.3 Citizen App (Future)

Not yet integrated. The backend is already structured to accept:
- `POST /api/complaints` — citizen-submitted complaints
- `POST /api/jobs` with `source: "CITIZEN"` — direct job creation

No backend changes are required when this app is built. The `source` field is stored for reference but never used in conditional logic.

---

## 5. Core Workflow

```
1. Authority creates a civic issue
        │
        ▼
2. Job appears on the map (status: OPEN)
        │
        ▼
3. Contractors view the job on their map
        │
        ▼
4. Contractor places a bid (ETA + cost + note)
        │
        ▼
5. Authority reviews bids and assigns one contractor
   → Winning bid: ACCEPTED
   → All other bids: REJECTED
   → Job status: ASSIGNED
        │
        ▼
6. Contractor works on the job
   → Job status: IN_PROGRESS
        │
        ▼
7. Contractor submits completion proof
   → Uploads photo
   → Captures GPS coordinates
   → Job status: COMPLETED
        │
        ▼
8. Map updates: completion marker + dashed line to original location
   Authority can view proof photo in popup
```

---

## 6. Features

### Issue Creation
- Full form with title, description, category (POTHOLE, ELECTRICAL, DRAINAGE, FOOTPATH, WATER, OTHER), and severity (LOW / MEDIUM / HIGH)
- Image upload with live preview (PNG, JPG, WEBP)
- GPS capture via browser geolocation API (`enableHighAccuracy: true`)
- Embedded map picker (centered on Pune: `[18.5204, 73.8567]`) for click/drag pin placement
- Coordinates displayed as text overlay on the map picker
- Validation blocks submission if title, description, or location is missing

### Interactive Map
- Leaflet-based map on both dashboards
- Severity-based color-coded markers: HIGH → red (`#EF4444`), MEDIUM → yellow (`#F59E0B`), LOW → green (`#10B981`)
- Completed jobs always render green regardless of severity
- HIGH severity jobs (not completed) have a CSS pulse animation
- Marker clustering via `leaflet.markercluster` with count badges
- Severity legend on the map
- 30-second live polling for real-time updates
- Completion markers (checkmark icon) at contractor GPS location
- Dashed green polyline connecting original job location to completion location
- Popup on completion marker shows "Resolution Proof" + photo thumbnail

### Map Popups
- Click any marker to see: job title, description (truncated to 80 chars), severity badge, status badge, image thumbnail
- Dark-themed popups (`#1a1a1a` background, white text)
- Contractor map popup includes a "Place Bid" button

### Analytics Dashboard
- Total Issues count
- Active Hotspots (non-completed jobs)
- Completed Issues count
- Severity Distribution (HIGH / MEDIUM / LOW counts)
- All derived from live API data — no hardcoded values

### Bid System
- Contractors submit bids with ETA, cost, and optional notes
- Authority sees all bids per job with contractor username
- One-click assignment: accepts winner, rejects all others atomically
- Bid status tracking: PENDING → ACCEPTED or REJECTED

### Job Completion with Proof
- GPS capture required (blocks submission if denied)
- Photo upload to Cloudinary
- Completion location, image, timestamp, and verification flag all persisted
- Completion visualized on authority map

### Demo Mode
- 5 built-in preset job templates (realistic civic issues)
- One-click demo job creation from the Create Job modal
- Demo jobs tagged with `isDemoJob: true` and a "demo" badge in the UI
- Random preset selection if no index specified

### Status Badges & UI Feedback
- Status badges for all four job states: OPEN, ASSIGNED, IN_PROGRESS, COMPLETED
- `isVerified: true` → "VERIFIED ✅" indicator
- `isVerifiedCompletion: true` → "COMPLETION VERIFIED ✅" indicator
- Loading states during API fetches
- Error banners on API failure (no page crashes)

---

## 7. Data Models

### User
```js
{
  username: String,       // required, unique
  name: String,           // display name (defaults to username)
  password: String,       // bcrypt hashed (10 rounds)
  role: "CITIZEN" | "ADMIN" | "CONTRACTOR"  // required
}
```

### Job
```js
{
  complaintId: ObjectId,          // optional ref to Complaint
  title: String,                  // required
  description: String,
  category: String,               // POTHOLE | ELECTRICAL | DRAINAGE | FOOTPATH | WATER | OTHER
  severity: "LOW" | "MEDIUM" | "HIGH",  // default: LOW
  imageUrl: String,               // Cloudinary URL
  location: {
    lat: Number,
    lng: Number,
    address: String
  },
  status: "OPEN" | "ASSIGNED" | "IN_PROGRESS" | "COMPLETED",  // default: OPEN
  source: String,                 // "ADMIN" or "CITIZEN", default: "ADMIN"
  isVerified: Boolean,            // default: false
  assignedTo: ObjectId,           // ref to User (contractor)
  completionImage: String,        // Cloudinary URL of proof photo
  completionLocation: {
    lat: Number,
    lng: Number
  },
  completedAt: Date,
  isVerifiedCompletion: Boolean,  // default: false
  isDemoJob: Boolean,             // default: false
  createdAt: Date,                // auto (timestamps)
  updatedAt: Date                 // auto (timestamps)
}
```

### Bid
```js
{
  jobId: ObjectId,         // required ref to Job
  contractorId: ObjectId,  // required ref to User
  eta: String,             // estimated time of arrival/completion
  cost: Number,            // bid amount
  note: String,            // optional notes
  status: "PENDING" | "ACCEPTED" | "REJECTED",  // default: PENDING
  createdAt: Date          // default: now
}
```

### Complaint
```js
{
  userId: ObjectId,        // required ref to User
  description: String,
  imageUrl: String,        // Cloudinary URL
  category: String,
  severity: "LOW" | "MEDIUM" | "HIGH",
  location: {
    lat: Number,
    lng: Number,
    address: String
  },
  status: "RECEIVED" | "JOB_CREATED" | "IN_PROGRESS" | "COMPLETED",  // default: RECEIVED
  createdAt: Date,         // auto (timestamps)
  updatedAt: Date          // auto (timestamps)
}
```

---

## 8. API Reference

All routes except `/api/auth/*` require a valid JWT Bearer token in the `Authorization` header.

### Authentication
| Method | Route | Description |
|---|---|---|
| POST | `/api/auth/signup` | Register a new user (any role) |
| POST | `/api/auth/login` | Login and receive JWT token |

**Login response:**
```json
{ "token": "...", "role": "ADMIN", "userId": "...", "name": "..." }
```

### Jobs
| Method | Route | Description |
|---|---|---|
| GET | `/api/jobs` | Get all jobs (sorted by createdAt desc) |
| POST | `/api/jobs` | Create a new job |
| GET | `/api/jobs/open` | Get only OPEN jobs |
| PUT | `/api/jobs/:id/assign` | Assign a contractor to a job |
| PUT | `/api/jobs/:id/status` | Update job status (including completion proof) |
| POST | `/api/jobs/demo` | Create a demo job from preset or custom payload |
| GET | `/api/jobs/demo/presets` | Get the 5 built-in demo preset templates |

**Create job payload:**
```json
{
  "title": "Pothole on MG Road",
  "description": "Large pothole causing traffic issues",
  "category": "POTHOLE",
  "severity": "HIGH",
  "imageUrl": "https://res.cloudinary.com/...",
  "location": { "lat": 18.5204, "lng": 73.8567, "address": "MG Road, Pune" },
  "status": "OPEN",
  "source": "ADMIN",
  "isVerified": true
}
```

**Assign job payload:**
```json
{ "contractorId": "...", "bidId": "..." }
```

**Complete job payload:**
```json
{
  "status": "COMPLETED",
  "completionImage": "https://res.cloudinary.com/...",
  "completionLocation": { "lat": 18.5210, "lng": 73.8570 },
  "completedAt": "2026-04-04T10:00:00Z",
  "isVerifiedCompletion": true
}
```

### Bids
| Method | Route | Description |
|---|---|---|
| POST | `/api/bids` | Submit a new bid |
| GET | `/api/bids/:jobId` | Get all bids for a job (with contractor details) |

**Create bid payload:**
```json
{
  "jobId": "...",
  "contractorId": "...",
  "eta": "3 days",
  "cost": 15000,
  "note": "Experienced team, can start immediately"
}
```

### Complaints
| Method | Route | Description |
|---|---|---|
| POST | `/api/complaints` | Create a new complaint |
| GET | `/api/complaints` | Get all complaints |
| GET | `/api/complaints/:id` | Get a single complaint |
| PATCH | `/api/complaints/:id/status` | Update complaint status |

### Upload
| Method | Route | Description |
|---|---|---|
| POST | `/api/upload` | Upload an image to Cloudinary (multipart/form-data, field: `image`) |

**Upload response:**
```json
{ "imageUrl": "https://res.cloudinary.com/..." }
```

### Error Responses
| Scenario | Status | Response |
|---|---|---|
| Missing JWT token | 401 | `{ "error": "No token" }` |
| Invalid/expired JWT | 401 | `{ "error": "Invalid token" }` |
| Upload without image | 400 | `{ "error": "No image provided" }` |
| Bid with non-existent jobId | 404 | `{ "error": "Job not found" }` |
| Assign with non-existent contractorId | 404 | `{ "error": "Contractor not found" }` |
| Complaint not found | 404 | `{ "error": "Complaint not found" }` |
| Invalid complaint status | 400 | `{ "error": "status must be one of: ..." }` |
| Server error | 500 | `{ "error": "<message>" }` |

---

## 9. Authentication & Security

- Passwords are hashed using **bcrypt** with 10 salt rounds before storage
- JWT tokens are signed with `JWT_SECRET` and expire per `JWT_EXPIRES_IN` config
- Token payload contains `{ id, role }` — role is used for route-level access control
- All non-auth routes are protected by the `authMiddleware` which:
  1. Extracts the Bearer token from the `Authorization` header
  2. Verifies it with `JWT_SECRET`
  3. Attaches the decoded payload to `req.user`
  4. Returns HTTP 401 on missing or invalid token
- Three user roles: `ADMIN` (authority), `CONTRACTOR`, `CITIZEN` (future)

---

## 10. Map System

Both dashboards use **Leaflet** with **React Leaflet** for interactive maps.

### Marker Color System
```
Severity HIGH   + not COMPLETED  →  #EF4444  (red)
Severity MEDIUM + not COMPLETED  →  #F59E0B  (yellow)
Severity LOW    + not COMPLETED  →  #10B981  (green)
Any severity    + COMPLETED      →  #10B981  (green, always)
```

### Map Features
- **Hotspot Markers** — colored `divIcon` markers per job
- **Pulse Animation** — HIGH severity non-completed jobs pulse with CSS animation
- **Marker Clustering** — `leaflet.markercluster` groups nearby markers with count badges
- **Completion Markers** — checkmark-style icon at contractor's GPS location
- **Completion Line** — dashed green polyline from original job location to completion location
- **Map Picker** — embedded minimap in the issue creation form for click/drag pin placement
- **Live Polling** — `setInterval` re-fetches every 30 seconds
- **Memory Leak Prevention** — `mapInstance.remove()` called on component unmount
- **Missing Location Guard** — jobs without `location.lat`/`location.lng` are silently skipped

---

## 11. Image Uploads

Images are handled via a two-step process:

1. Client POSTs image to `POST /api/upload` as `multipart/form-data`
2. Backend uses **Multer** with `memoryStorage()` (no disk writes) to buffer the file
3. Buffer is streamed to **Cloudinary** via `upload_stream`
4. Cloudinary returns a secure URL which is stored in the Job/Complaint document

This applies to both:
- Issue cover images (uploaded by authority during job creation)
- Completion proof photos (uploaded by contractor during job completion)

---

## 12. Demo Mode

The system includes 5 built-in preset job templates for quick demonstration:

- Accessible via `GET /api/jobs/demo/presets`
- Create a specific preset: `POST /api/jobs/demo` with `{ "preset": 0 }` (index 0–4)
- Create a random preset: `POST /api/jobs/demo` with no body
- Create a custom demo job: `POST /api/jobs/demo` with full payload
- All demo jobs have `isDemoJob: true` and `status: "OPEN"`
- Authority Dashboard shows a "Demo" toggle in the Create Job modal
- Demo jobs display a "demo" badge in the jobs list

---

## 13. Status Lifecycles

### Job Status
```
OPEN  →  ASSIGNED  →  IN_PROGRESS  →  COMPLETED
```
- `OPEN`: Job created, awaiting bids
- `ASSIGNED`: Authority has selected a contractor
- `IN_PROGRESS`: Contractor has started work
- `COMPLETED`: Contractor submitted proof, work done

### Bid Status
```
PENDING  →  ACCEPTED  (one per job, max)
         →  REJECTED  (all others when a bid is accepted)
```

### Complaint Status (synced with linked Job)
```
RECEIVED  →  JOB_CREATED  →  IN_PROGRESS  →  COMPLETED
```
When a Job has a `complaintId`, the linked Complaint's status is automatically updated in the same request handler whenever the Job status changes.

---

## 14. Testing Strategy

### Backend Tests (Jest + Supertest + fast-check)
Uses `mongodb-memory-server` for in-memory MongoDB — no real database needed for tests.

**Property-Based Tests (100+ iterations each):**
| Property | What it tests |
|---|---|
| Source-agnostic job creation | ADMIN and CITIZEN source produce identical document shapes |
| Job schema defaults | Omitted fields always get correct defaults |
| Bid always starts PENDING | Any valid bid payload → status: PENDING |
| Assignment bid exclusivity | After assign: exactly 1 ACCEPTED, all others REJECTED |
| Complaint status sync | Job status change → linked complaint status updates |
| Completion proof persistence | All 4 completion fields persisted on COMPLETED |
| Protected route 401 enforcement | Any protected route without token → 401 |
| Demo job flags | Any demo creation → isDemoJob: true, status: OPEN |
| Complaint round-trip | All submitted fields preserved with status: RECEIVED |

### Frontend Tests (Vitest + Testing Library + fast-check)
**Property-Based Tests:**
| Property | What it tests |
|---|---|
| Map skips missing-location jobs | No runtime error, correct marker count |
| Marker color mapping | getMarkerColor returns correct hex for all severity/status combos |
| Popup description truncation | Descriptions > 80 chars are truncated in popup HTML |
| Analytics count derivation | All 4 stat counts correctly derived from job arrays |
| Form validation blocks API calls | Missing required fields → no API call, error shown |
| Status badge rendering | All 4 status values render a visible badge |

### Integration Tests
- Full job lifecycle: create → bid → assign → complete (all status transitions + complaint sync)
- Image upload: real image buffer → Cloudinary URL returned
- Marker clustering: `leaflet.markercluster` loaded, markers added to cluster group

### Smoke Tests
- All protected routes return 401 without a token
- Auth routes accessible without token
- MongoDB connects via `process.env.MONGO_URI`
- Multer uses `memoryStorage()` (no disk writes)
- No `if (source === "ADMIN")` or `if (source === "CITIZEN")` branches in jobController.js
- No hardcoded data arrays in production code paths

---

## 15. Project Structure

```
fixmycity/
├── backend/                          # Node.js/Express API
│   ├── config/
│   │   ├── db.js                     # MongoDB connection
│   │   └── cloudinary.js             # Cloudinary SDK config
│   ├── controllers/
│   │   ├── authController.js         # Signup + Login
│   │   ├── jobController.js          # Job CRUD, assign, status, demo
│   │   ├── bidController.js          # Bid creation + retrieval
│   │   └── complaintController.js    # Complaint CRUD
│   ├── middleware/
│   │   └── authMiddleware.js         # JWT verification
│   ├── models/
│   │   ├── User.js                   # User schema
│   │   ├── Job.js                    # Job schema
│   │   ├── Bid.js                    # Bid schema
│   │   └── Complaint.js              # Complaint schema
│   ├── routes/                       # Express route definitions
│   ├── utils/
│   │   └── mailer.js                 # Nodemailer utility
│   ├── tests/
│   │   ├── app.js                    # Test app setup
│   │   └── setup.js                  # Jest setup (mongodb-memory-server)
│   ├── .env                          # Environment variables
│   ├── server.js                     # Express app entry point
│   └── package.json
│
└── fixmycity-authority-portal-main/
    └── FixMyCity-authority-portal-main/   # React frontend (both dashboards)
        ├── src/
        │   ├── pages/
        │   │   ├── Dashboard.tsx          # Authority analytics dashboard
        │   │   ├── Jobs.tsx               # Authority Kanban board
        │   │   ├── Complaints.tsx         # Complaint management
        │   │   ├── MapDashboard.tsx       # Authority map view
        │   │   ├── Landing.tsx            # Landing page
        │   │   ├── Login.tsx / Signup.tsx # Authority auth
        │   │   └── contractor/            # All contractor pages
        │   │       ├── Dashboard.tsx
        │   │       ├── Jobs.tsx
        │   │       ├── Bids.tsx
        │   │       ├── MyJobs.tsx
        │   │       ├── MapPage.tsx
        │   │       └── Profile.tsx
        │   ├── components/
        │   │   ├── CreateJobModal.tsx     # Issue creation form (real + demo mode)
        │   │   ├── DashboardLayout.tsx    # Authority layout wrapper
        │   │   ├── ProtectedRoute.tsx     # Authority auth guard
        │   │   ├── StatCard.tsx           # Analytics stat card
        │   │   └── contractor/
        │   │       ├── ContractorLayout.tsx
        │   │       ├── ContractorProtectedRoute.tsx
        │   │       ├── ReputationRing.tsx
        │   │       ├── SeverityBadge.tsx
        │   │       ├── StatusStepper.tsx
        │   │       └── ThemeToggle.tsx
        │   └── App.tsx                   # Root router
        └── package.json
```

---

## 16. Environment Variables

### Backend (`backend/.env`)
```env
MONGO_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/fixmycity
JWT_SECRET=your_jwt_secret_key
JWT_EXPIRES_IN=7d
PORT=5000
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

---

## 17. Getting Started

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (or local MongoDB)
- Cloudinary account

### Backend Setup
```bash
cd backend
npm install
# Configure .env with your MongoDB URI, JWT secret, and Cloudinary credentials
npm start
# Server runs on http://localhost:5000
```

### Frontend Setup
```bash
cd fixmycity-authority-portal-main/FixMyCity-authority-portal-main
npm install
npm run dev
# App runs on http://localhost:5173
```

### Running Tests
```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd fixmycity-authority-portal-main/FixMyCity-authority-portal-main
npm test
```

### First-Time Setup
1. Start the backend server
2. Register an ADMIN user via `POST /api/auth/signup` with `role: "ADMIN"`
3. Register a CONTRACTOR user via `POST /api/auth/signup` with `role: "CONTRACTOR"`
4. Log in to the Authority Dashboard at `/login`
5. Create a job using the "Create Issue" button
6. Log in to the Contractor Dashboard at `/contractor/login`
7. Find the job on the map and place a bid
8. Back in the Authority Dashboard, assign the bid
9. In the Contractor Dashboard, mark the job complete with GPS + photo proof

---

## Key Design Principles

- **Future-ready**: The backend is designed so the Citizen App can be integrated without any changes to existing controller logic. The `source` field is stored but never branched on.
- **Source-agnostic**: `POST /api/jobs` accepts any `source` value and processes all jobs identically.
- **Stateless backend**: 30-second polling instead of WebSockets keeps the API stateless and horizontally scalable.
- **No disk writes**: All images go directly from memory to Cloudinary — the server never writes files to disk.
- **Graceful degradation**: Missing location data, API failures, and GPS denial are all handled without crashing the UI.
- **Property-based testing**: Core invariants (bid exclusivity, status sync, color mapping, analytics derivation) are verified with 100+ randomized iterations using fast-check.
=======
# FixMyCity - Team hashinclaude
>>>>>>> 5c7fa3d0cc52c42ad30a4278fceac9a43b07d2fe
