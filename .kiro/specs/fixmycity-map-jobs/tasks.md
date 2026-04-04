# Implementation Plan: fixmycity-map-jobs

## Overview

All backend work is already complete. Implementation is purely frontend TypeScript/React:
1. Add analytics computed properties to `useJobs.ts`
2. Add severity-distribution stat cards to `Dashboard.tsx`
3. Add a severity color legend to `MapDashboard.tsx` and wire its error state
4. Create the new `ContractorMapPage` with Leaflet map + bid modal integration
5. Register the new route in `App.tsx` and add the sidebar nav item in `ContractorLayout.tsx`
6. Write fast-check property-based tests for the pure logic functions

## Tasks

- [x] 1. Extend `useJobs.ts` with analytics computed properties
  - Add `jobsBySeverity: { HIGH: number; MEDIUM: number; LOW: number }` computed from `jobs`
  - Add `totalIssues: number` (= `jobs.length`)
  - Add `activeHotspots: number` (= `jobs.filter(j => j.status !== "COMPLETED").length`)
  - Add `completedIssues: number` (= `jobs.filter(j => j.status === "COMPLETED").length`)
  - Export all four from the hook's return object
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

  - [ ]* 1.1 Write property test for analytics computed properties (P11)
    - **Property 11: Dashboard analytics match live job data**
    - Use `fc.array(jobArbitrary)` to generate random job arrays; assert `totalIssues`, `activeHotspots`, `completedIssues`, and `jobsBySeverity` match the expected derived values
    - **Validates: Requirements 13.1, 13.2, 13.3, 13.4**
    - Tag: `// Feature: fixmycity-map-jobs, Property 11`

- [x] 2. Update `Dashboard.tsx` to display live analytics stat cards
  - Destructure `totalIssues`, `activeHotspots`, `completedIssues`, `jobsBySeverity` from `useJobs()`
  - Replace or supplement the existing `liveStats` object with these values
  - Add a "Total Issues" `StatCard` using `totalIssues`
  - Add an "Active Hotspots" `StatCard` using `activeHotspots`
  - Update the existing "Completed Issues" `StatCard` to use `completedIssues`
  - Add a "Severity Distribution" card showing HIGH / MEDIUM / LOW counts from `jobsBySeverity`
  - All values must come from live API data — no hardcoded numbers
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

  - [ ]* 2.1 Write unit tests for Dashboard analytics rendering
    - Mock `useJobs` to return a known job array; assert each stat card renders the correct value
    - Test that severity distribution counts match the mocked data
    - _Requirements: 13.1, 13.2, 13.3, 13.4_

- [x] 3. Add severity color legend and error state to `MapDashboard.tsx`
  - Add a legend card to the existing overlay row showing three color swatches: HIGH → `#EF4444`, MEDIUM → `#F59E0B`, LOW → `#10B981` with their labels
  - Destructure `error` from `useJobs()` and `useComplaints()`; if either is non-null, render an error message banner inside the map container instead of (or above) the map
  - _Requirements: 6.4, 14.4_

  - [ ]* 3.1 Write unit tests for legend and error state
    - Assert legend renders all three severity/color pairs (req 6.4)
    - Mock `useJobs` to return `error: "Failed"` and assert error message is displayed (req 14.4)
    - _Requirements: 6.4, 14.4_

- [x] 4. Extract and export `getMarkerColor` pure function
  - Create `src/lib/markerColor.ts` exporting:
    - `SEVERITY_COLORS: Record<string, string>` constant
    - `getMarkerColor(job: { severity: string; status: string }): string` function
  - Import and use this function in `MapDashboard.tsx` (replacing the inline `severityColors` object)
  - _Requirements: 6.1, 6.2_

  - [ ]* 4.1 Write property test for `getMarkerColor` (P6)
    - **Property 6: Marker color reflects severity and completion status**
    - Use `fc.record({ severity: fc.constantFrom("HIGH","MEDIUM","LOW"), status: fc.constantFrom("OPEN","ASSIGNED","IN_PROGRESS","COMPLETED") })` to generate arbitrary jobs; assert color rules hold for all combinations
    - **Validates: Requirements 6.1, 6.2**
    - Tag: `// Feature: fixmycity-map-jobs, Property 6`

  - [ ]* 4.2 Write property test for pulse animation logic (P7)
    - **Property 7: HIGH severity non-completed jobs have pulse animation**
    - Generate arbitrary `{ severity, status }` combinations; assert pulse is applied iff `severity === "HIGH" && status !== "COMPLETED"`
    - **Validates: Requirements 6.3**
    - Tag: `// Feature: fixmycity-map-jobs, Property 7`

- [x] 5. Write property test for marker count vs valid-location records (P5)
  - **Property 5: Marker count equals valid-location record count**
  - Generate arbitrary arrays of jobs and complaints with mixed valid/null/undefined `location.lat` and `location.lng`; assert the count of markers added equals the count of records with both fields non-null, and no exception is thrown
  - _Requirements: 5.2, 5.3, 5.4, 14.1_
  - Tag: `// Feature: fixmycity-map-jobs, Property 5`

- [x] 6. Create `ContractorMapPage` (`src/pages/contractor/MapPage.tsx`)
  - Fetch open jobs via the existing `useJobs` hook from `@/hooks/contractor/useJobs` (already polls every 30 s via `GET /api/jobs` — filter to `openJobs`)
  - Initialize a Leaflet map centered on `[18.5204, 73.8567]` with the dark CartoDB tile layer
  - Use `leaflet.markercluster` for marker grouping (same CDN loading pattern as `MapDashboard.tsx`)
  - For each open job with valid `location.lat` / `location.lng`, render a `divIcon` Hotspot_Marker using `getMarkerColor` from `src/lib/markerColor.ts`
  - Apply pulse animation for HIGH severity jobs (same CSS as `MapDashboard.tsx`)
  - On marker click, show a popup with: `title`, `description` truncated to 80 chars, `severity` badge, `location.address`, and a "Place Bid" button
  - On "Place Bid" click, set `selectedJob` state and open the existing bid submission UI (reuse the bid form from `src/pages/contractor/Jobs.tsx`)
  - Show a loading spinner while `loading === true`
  - Clean up the Leaflet instance on unmount with `isMounted` flag pattern
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5, 14.2, 14.3, 14.5_

  - [ ]* 6.1 Write unit tests for `ContractorMapPage`
    - Mock `useJobs` to return a known set of open jobs; assert the page renders without crashing
    - Assert loading spinner is shown when `loading === true`
    - Assert "Place Bid" button click sets selected job state
    - _Requirements: 9.1, 9.4, 14.2_

  - [ ]* 6.2 Write property test for popup content (P8)
    - **Property 8: Job popup contains all required fields**
    - Generate arbitrary jobs with various field combinations; assert popup HTML contains `title`, truncated description (≤ 80 chars), `severity`, and `status`; assert `<img>` present iff `imageUrl` is set
    - **Validates: Requirements 8.1**
    - Tag: `// Feature: fixmycity-map-jobs, Property 8`

- [x] 7. Register `ContractorMapPage` route and add sidebar nav item
  - In `App.tsx`, add a new `<Route path="/contractor/app/map">` wrapped in `ContractorProtectedRoute` + `ContractorLayout`, rendering `ContractorMapPage`
  - In `ContractorLayout.tsx`, add `{ title: "Map", path: "/contractor/app/map", icon: MapPin }` to the `navItems` array
  - Import `MapPin` from `lucide-react` in `ContractorLayout.tsx`
  - _Requirements: 9.1_

- [x] 8. Checkpoint — ensure all tests pass
  - Run `vitest --run` from the frontend directory; all existing and new tests must pass
  - Verify `ContractorMapPage` is reachable at `/contractor/app/map` in the browser
  - Verify Dashboard stat cards show live values
  - Verify MapDashboard legend shows all three severity colors
  - Ask the user if any questions arise before proceeding

- [ ] 9. Write remaining property-based tests
  - [ ]* 9.1 Property test for GPS coordinate capture (P3)
    - **Property 3: GPS coordinate capture updates location state**
    - Mock `navigator.geolocation.getCurrentPosition` with arbitrary `(lat, lng)` via fast-check; assert `CreateJobModal` location state equals `{ lat, lng }`
    - **Validates: Requirements 3.2**
    - Tag: `// Feature: fixmycity-map-jobs, Property 3`

  - [ ]* 9.2 Property test for map interaction location state (P4)
    - **Property 4: Map interaction updates location state**
    - Simulate arbitrary Leaflet click/drag events with `fc.tuple(fc.float({min:-90,max:90}), fc.float({min:-180,max:180}))`; assert location state and coordinate overlay text match
    - **Validates: Requirements 4.2, 4.3, 4.4**
    - Tag: `// Feature: fixmycity-map-jobs, Property 4`

  - [ ]* 9.3 Property test for completion visualization (P9)
    - **Property 9: Completion visualization for completed jobs with location**
    - Generate arbitrary completed jobs with valid `completionLocation`; assert a completion marker and dashed polyline are rendered
    - **Validates: Requirements 10.1, 10.3**
    - Tag: `// Feature: fixmycity-map-jobs, Property 9`

  - [ ]* 9.4 Property test for completion marker popup (P10)
    - **Property 10: Completion marker popup contains resolution proof**
    - Generate arbitrary completed jobs with `completionImage`; assert popup HTML contains "Resolution Proof" and an `<img>` with that URL
    - **Validates: Requirements 10.4**
    - Tag: `// Feature: fixmycity-map-jobs, Property 10`

  - [ ]* 9.5 Property test for API error resilience (P13)
    - **Property 13: API error does not crash the Map_View**
    - Mock `useJobs` and `useComplaints` to throw arbitrary errors; assert `MapDashboard` remains mounted and renders an error message without an unhandled exception
    - **Validates: Requirements 14.4**
    - Tag: `// Feature: fixmycity-map-jobs, Property 13`

- [x] 10. Final checkpoint — ensure all tests pass
  - Run `vitest --run` from the frontend directory; all tests must pass
  - Ask the user if any questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- The backend requires zero changes — all API endpoints are already complete
- `getMarkerColor` (task 4) must be extracted before `ContractorMapPage` (task 6) to share the color logic
- fast-check is the PBT library; each property test runs a minimum of 100 iterations
- Property tests reference design document properties P3–P13 for traceability
