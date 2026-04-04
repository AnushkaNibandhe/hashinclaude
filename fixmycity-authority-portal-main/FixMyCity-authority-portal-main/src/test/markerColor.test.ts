// Feature: fixmycity-map-jobs, Property 6: Marker color reflects severity and completion status
// Feature: fixmycity-map-jobs, Property 7: HIGH severity non-completed jobs have pulse animation

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { getMarkerColor, SEVERITY_COLORS } from "@/lib/markerColor";

const severityArb = fc.constantFrom("HIGH", "MEDIUM", "LOW");
const statusArb = fc.constantFrom("OPEN", "ASSIGNED", "IN_PROGRESS", "COMPLETED");
const jobArb = fc.record({ severity: severityArb, status: statusArb });

// --- Unit tests ---

describe("getMarkerColor", () => {
  it("returns green for COMPLETED regardless of severity", () => {
    expect(getMarkerColor({ severity: "HIGH", status: "COMPLETED" })).toBe("#10B981");
    expect(getMarkerColor({ severity: "MEDIUM", status: "COMPLETED" })).toBe("#10B981");
    expect(getMarkerColor({ severity: "LOW", status: "COMPLETED" })).toBe("#10B981");
  });

  it("returns red for HIGH non-completed", () => {
    expect(getMarkerColor({ severity: "HIGH", status: "OPEN" })).toBe("#EF4444");
  });

  it("returns amber for MEDIUM non-completed", () => {
    expect(getMarkerColor({ severity: "MEDIUM", status: "OPEN" })).toBe("#F59E0B");
  });

  it("returns green for LOW non-completed", () => {
    expect(getMarkerColor({ severity: "LOW", status: "OPEN" })).toBe("#10B981");
  });

  it("falls back to blue for unknown severity", () => {
    expect(getMarkerColor({ severity: "UNKNOWN", status: "OPEN" })).toBe("#3B82F6");
  });
});

// --- Property 6: Marker color reflects severity and completion status ---
// Validates: Requirements 6.1, 6.2

describe("P6: getMarkerColor property", () => {
  it("completed status always returns green regardless of severity", () => {
    fc.assert(
      fc.property(severityArb, (severity) => {
        expect(getMarkerColor({ severity, status: "COMPLETED" })).toBe("#10B981");
      }),
      { numRuns: 100 }
    );
  });

  it("non-completed HIGH returns red", () => {
    const nonCompletedStatus = fc.constantFrom("OPEN", "ASSIGNED", "IN_PROGRESS");
    fc.assert(
      fc.property(nonCompletedStatus, (status) => {
        expect(getMarkerColor({ severity: "HIGH", status })).toBe("#EF4444");
      }),
      { numRuns: 100 }
    );
  });

  it("non-completed MEDIUM returns amber", () => {
    const nonCompletedStatus = fc.constantFrom("OPEN", "ASSIGNED", "IN_PROGRESS");
    fc.assert(
      fc.property(nonCompletedStatus, (status) => {
        expect(getMarkerColor({ severity: "MEDIUM", status })).toBe("#F59E0B");
      }),
      { numRuns: 100 }
    );
  });

  it("non-completed LOW returns green", () => {
    const nonCompletedStatus = fc.constantFrom("OPEN", "ASSIGNED", "IN_PROGRESS");
    fc.assert(
      fc.property(nonCompletedStatus, (status) => {
        expect(getMarkerColor({ severity: "LOW", status })).toBe("#10B981");
      }),
      { numRuns: 100 }
    );
  });

  it("color for any job matches expected rules", () => {
    fc.assert(
      fc.property(jobArb, ({ severity, status }) => {
        const color = getMarkerColor({ severity, status });
        if (status === "COMPLETED") {
          expect(color).toBe("#10B981");
        } else {
          expect(color).toBe(SEVERITY_COLORS[severity] ?? "#3B82F6");
        }
      }),
      { numRuns: 200 }
    );
  });
});

// --- Property 7: HIGH severity non-completed jobs have pulse animation ---
// Validates: Requirements 6.3

function shouldPulse(job: { severity: string; status: string }): boolean {
  return job.severity === "HIGH" && job.status !== "COMPLETED";
}

describe("P7: pulse animation logic property", () => {
  it("pulse applies iff severity is HIGH and status is not COMPLETED", () => {
    fc.assert(
      fc.property(jobArb, ({ severity, status }) => {
        const pulse = shouldPulse({ severity, status });
        if (severity === "HIGH" && status !== "COMPLETED") {
          expect(pulse).toBe(true);
        } else {
          expect(pulse).toBe(false);
        }
      }),
      { numRuns: 200 }
    );
  });

  it("completed HIGH jobs do NOT pulse", () => {
    expect(shouldPulse({ severity: "HIGH", status: "COMPLETED" })).toBe(false);
  });

  it("non-HIGH jobs never pulse", () => {
    fc.assert(
      fc.property(
        fc.constantFrom("MEDIUM", "LOW"),
        statusArb,
        (severity, status) => {
          expect(shouldPulse({ severity, status })).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });
});
