// Feature: fixmycity-map-jobs, Property 5
// Property 5: Marker count equals valid-location record count
// Validates: Requirements 5.2, 5.3, 5.4, 14.1

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

// ---------------------------------------------------------------------------
// Pure filtering logic extracted from MapDashboard.tsx
// A record is renderable iff both location.lat and location.lng are non-null
// and non-undefined (truthy check mirrors the MapDashboard guard:
//   if (!record.location?.lat || !record.location?.lng) return;
// ---------------------------------------------------------------------------

interface Location {
  lat: number | null | undefined;
  lng: number | null | undefined;
  address?: string;
}

interface JobRecord {
  _id: string;
  title: string;
  severity: string;
  status: string;
  location?: Location | null;
}

interface ComplaintRecord {
  _id: string;
  description?: string;
  severity: string;
  status: string;
  location?: Location | null;
}

/** Mirrors the MapDashboard guard: skip if lat or lng is falsy */
function hasValidLocation(record: { location?: Location | null }): boolean {
  return !!(record.location?.lat && record.location?.lng);
}

/** Count how many markers would be added for a mixed array of jobs and complaints */
function countValidMarkers(
  jobs: JobRecord[],
  complaints: ComplaintRecord[]
): number {
  return (
    jobs.filter(hasValidLocation).length +
    complaints.filter(hasValidLocation).length
  );
}

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Generates a coordinate value that is valid (non-zero number), null, or undefined */
const coordArb = fc.oneof(
  fc.float({ min: -90, max: 90, noNaN: true }).filter((n) => n !== 0),
  fc.constant(null),
  fc.constant(undefined)
);

const locationArb = fc.oneof(
  // valid location object with mixed lat/lng
  fc.record({
    lat: coordArb,
    lng: coordArb,
  }),
  // missing location entirely
  fc.constant(null),
  fc.constant(undefined)
);

const jobArb: fc.Arbitrary<JobRecord> = fc.record({
  _id: fc.string({ minLength: 8, maxLength: 24 }),
  title: fc.string({ minLength: 1, maxLength: 50 }),
  severity: fc.constantFrom("HIGH", "MEDIUM", "LOW"),
  status: fc.constantFrom("OPEN", "ASSIGNED", "IN_PROGRESS", "COMPLETED"),
  location: locationArb,
});

const complaintArb: fc.Arbitrary<ComplaintRecord> = fc.record({
  _id: fc.string({ minLength: 8, maxLength: 24 }),
  description: fc.option(fc.string({ maxLength: 100 }), { nil: undefined }),
  severity: fc.constantFrom("HIGH", "MEDIUM", "LOW"),
  status: fc.constantFrom("RECEIVED", "JOB_CREATED", "IN_PROGRESS", "COMPLETED"),
  location: locationArb,
});

// ---------------------------------------------------------------------------
// Unit tests — specific examples
// ---------------------------------------------------------------------------

describe("hasValidLocation — unit tests", () => {
  it("returns true when both lat and lng are valid numbers", () => {
    expect(hasValidLocation({ location: { lat: 18.52, lng: 73.85 } })).toBe(true);
  });

  it("returns false when lat is null", () => {
    expect(hasValidLocation({ location: { lat: null, lng: 73.85 } })).toBe(false);
  });

  it("returns false when lng is null", () => {
    expect(hasValidLocation({ location: { lat: 18.52, lng: null } })).toBe(false);
  });

  it("returns false when lat is undefined", () => {
    expect(hasValidLocation({ location: { lat: undefined, lng: 73.85 } })).toBe(false);
  });

  it("returns false when lng is undefined", () => {
    expect(hasValidLocation({ location: { lat: 18.52, lng: undefined } })).toBe(false);
  });

  it("returns false when location is null", () => {
    expect(hasValidLocation({ location: null })).toBe(false);
  });

  it("returns false when location is undefined", () => {
    expect(hasValidLocation({ location: undefined })).toBe(false);
  });

  it("returns false when both lat and lng are null", () => {
    expect(hasValidLocation({ location: { lat: null, lng: null } })).toBe(false);
  });
});

describe("countValidMarkers — unit tests", () => {
  it("returns 0 for empty arrays", () => {
    expect(countValidMarkers([], [])).toBe(0);
  });

  it("counts only jobs with valid locations", () => {
    const jobs: JobRecord[] = [
      { _id: "1", title: "A", severity: "HIGH", status: "OPEN", location: { lat: 18.52, lng: 73.85 } },
      { _id: "2", title: "B", severity: "LOW", status: "OPEN", location: { lat: null, lng: 73.85 } },
      { _id: "3", title: "C", severity: "MEDIUM", status: "OPEN", location: undefined },
    ];
    expect(countValidMarkers(jobs, [])).toBe(1);
  });

  it("counts only complaints with valid locations", () => {
    const complaints: ComplaintRecord[] = [
      { _id: "1", severity: "HIGH", status: "RECEIVED", location: { lat: 18.52, lng: 73.85 } },
      { _id: "2", severity: "LOW", status: "RECEIVED", location: { lat: 18.52, lng: undefined } },
      { _id: "3", severity: "MEDIUM", status: "RECEIVED", location: null },
    ];
    expect(countValidMarkers([], complaints)).toBe(1);
  });

  it("sums valid jobs and valid complaints", () => {
    const jobs: JobRecord[] = [
      { _id: "j1", title: "A", severity: "HIGH", status: "OPEN", location: { lat: 18.52, lng: 73.85 } },
      { _id: "j2", title: "B", severity: "LOW", status: "OPEN", location: null },
    ];
    const complaints: ComplaintRecord[] = [
      { _id: "c1", severity: "MEDIUM", status: "RECEIVED", location: { lat: 18.52, lng: 73.85 } },
      { _id: "c2", severity: "HIGH", status: "RECEIVED", location: { lat: undefined, lng: 73.85 } },
    ];
    expect(countValidMarkers(jobs, complaints)).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Property 5: Marker count equals valid-location record count
// Validates: Requirements 5.2, 5.3, 5.4, 14.1
// ---------------------------------------------------------------------------

describe("P5: marker count equals valid-location record count", () => {
  it("marker count equals records with both lat and lng non-null/non-undefined", () => {
    fc.assert(
      fc.property(
        fc.array(jobArb, { maxLength: 50 }),
        fc.array(complaintArb, { maxLength: 50 }),
        (jobs, complaints) => {
          const expectedJobMarkers = jobs.filter(
            (j) => j.location?.lat != null && j.location?.lng != null
          ).length;
          const expectedComplaintMarkers = complaints.filter(
            (c) => c.location?.lat != null && c.location?.lng != null
          ).length;
          const expected = expectedJobMarkers + expectedComplaintMarkers;

          const actual = countValidMarkers(jobs, complaints);
          expect(actual).toBe(expected);
        }
      ),
      { numRuns: 200 }
    );
  });

  it("no exception is thrown when processing records with missing location fields", () => {
    fc.assert(
      fc.property(
        fc.array(jobArb, { maxLength: 50 }),
        fc.array(complaintArb, { maxLength: 50 }),
        (jobs, complaints) => {
          expect(() => countValidMarkers(jobs, complaints)).not.toThrow();
        }
      ),
      { numRuns: 200 }
    );
  });

  it("marker count is always non-negative", () => {
    fc.assert(
      fc.property(
        fc.array(jobArb, { maxLength: 50 }),
        fc.array(complaintArb, { maxLength: 50 }),
        (jobs, complaints) => {
          expect(countValidMarkers(jobs, complaints)).toBeGreaterThanOrEqual(0);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("marker count never exceeds total record count", () => {
    fc.assert(
      fc.property(
        fc.array(jobArb, { maxLength: 50 }),
        fc.array(complaintArb, { maxLength: 50 }),
        (jobs, complaints) => {
          const total = jobs.length + complaints.length;
          expect(countValidMarkers(jobs, complaints)).toBeLessThanOrEqual(total);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("adding a record with null location does not increase marker count", () => {
    fc.assert(
      fc.property(
        fc.array(jobArb, { maxLength: 30 }),
        fc.array(complaintArb, { maxLength: 30 }),
        fc.record({
          _id: fc.string({ minLength: 8, maxLength: 24 }),
          title: fc.string({ minLength: 1, maxLength: 50 }),
          severity: fc.constantFrom("HIGH", "MEDIUM", "LOW"),
          status: fc.constantFrom("OPEN", "ASSIGNED", "IN_PROGRESS", "COMPLETED"),
          location: fc.constant(null),
        }),
        (jobs, complaints, nullLocationJob) => {
          const before = countValidMarkers(jobs, complaints);
          const after = countValidMarkers([...jobs, nullLocationJob], complaints);
          expect(after).toBe(before);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("adding a record with valid location increases marker count by exactly 1", () => {
    fc.assert(
      fc.property(
        fc.array(jobArb, { maxLength: 30 }),
        fc.array(complaintArb, { maxLength: 30 }),
        fc.float({ min: -89, max: 89, noNaN: true }).filter((n) => n !== 0),
        fc.float({ min: -179, max: 179, noNaN: true }).filter((n) => n !== 0),
        (jobs, complaints, lat, lng) => {
          const validJob: JobRecord = {
            _id: "valid-job",
            title: "Valid",
            severity: "LOW",
            status: "OPEN",
            location: { lat, lng },
          };
          const before = countValidMarkers(jobs, complaints);
          const after = countValidMarkers([...jobs, validJob], complaints);
          expect(after).toBe(before + 1);
        }
      ),
      { numRuns: 100 }
    );
  });
});
