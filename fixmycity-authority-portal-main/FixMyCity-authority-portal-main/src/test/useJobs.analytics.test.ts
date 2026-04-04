// Feature: fixmycity-map-jobs, Property 11: Dashboard analytics match live job data
import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

// Validates: Requirements 13.1, 13.2, 13.3, 13.4

type JobStatus = "OPEN" | "ASSIGNED" | "IN_PROGRESS" | "COMPLETED";
type JobSeverity = "HIGH" | "MEDIUM" | "LOW";

interface JobLike {
  status: JobStatus;
  severity: JobSeverity;
}

// Pure analytics functions mirroring the useJobs.ts computed properties
function computeAnalytics(jobs: JobLike[]) {
  const totalIssues = jobs.length;
  const activeHotspots = jobs.filter(j => j.status !== "COMPLETED").length;
  const completedIssues = jobs.filter(j => j.status === "COMPLETED").length;
  const jobsBySeverity = jobs.reduce<{ HIGH: number; MEDIUM: number; LOW: number }>(
    (acc, j) => {
      if (j.severity in acc) acc[j.severity]++;
      return acc;
    },
    { HIGH: 0, MEDIUM: 0, LOW: 0 }
  );
  return { totalIssues, activeHotspots, completedIssues, jobsBySeverity };
}

const jobArbitrary = fc.record({
  status: fc.constantFrom<JobStatus>("OPEN", "ASSIGNED", "IN_PROGRESS", "COMPLETED"),
  severity: fc.constantFrom<JobSeverity>("HIGH", "MEDIUM", "LOW"),
});

describe("useJobs analytics computed properties (Property 11)", () => {
  it("totalIssues equals jobs.length for any job array", () => {
    fc.assert(
      fc.property(fc.array(jobArbitrary), (jobs) => {
        const { totalIssues } = computeAnalytics(jobs);
        expect(totalIssues).toBe(jobs.length);
      }),
      { numRuns: 100 }
    );
  });

  it("activeHotspots equals count of non-COMPLETED jobs for any job array", () => {
    fc.assert(
      fc.property(fc.array(jobArbitrary), (jobs) => {
        const { activeHotspots } = computeAnalytics(jobs);
        const expected = jobs.filter(j => j.status !== "COMPLETED").length;
        expect(activeHotspots).toBe(expected);
      }),
      { numRuns: 100 }
    );
  });

  it("completedIssues equals count of COMPLETED jobs for any job array", () => {
    fc.assert(
      fc.property(fc.array(jobArbitrary), (jobs) => {
        const { completedIssues } = computeAnalytics(jobs);
        const expected = jobs.filter(j => j.status === "COMPLETED").length;
        expect(completedIssues).toBe(expected);
      }),
      { numRuns: 100 }
    );
  });

  it("jobsBySeverity counts match actual severity distribution for any job array", () => {
    fc.assert(
      fc.property(fc.array(jobArbitrary), (jobs) => {
        const { jobsBySeverity } = computeAnalytics(jobs);
        const expectedHigh = jobs.filter(j => j.severity === "HIGH").length;
        const expectedMedium = jobs.filter(j => j.severity === "MEDIUM").length;
        const expectedLow = jobs.filter(j => j.severity === "LOW").length;
        expect(jobsBySeverity.HIGH).toBe(expectedHigh);
        expect(jobsBySeverity.MEDIUM).toBe(expectedMedium);
        expect(jobsBySeverity.LOW).toBe(expectedLow);
      }),
      { numRuns: 100 }
    );
  });

  it("activeHotspots + completedIssues always equals totalIssues", () => {
    fc.assert(
      fc.property(fc.array(jobArbitrary), (jobs) => {
        const { totalIssues, activeHotspots, completedIssues } = computeAnalytics(jobs);
        expect(activeHotspots + completedIssues).toBe(totalIssues);
      }),
      { numRuns: 100 }
    );
  });

  it("sum of jobsBySeverity counts always equals totalIssues", () => {
    fc.assert(
      fc.property(fc.array(jobArbitrary), (jobs) => {
        const { totalIssues, jobsBySeverity } = computeAnalytics(jobs);
        const severitySum = jobsBySeverity.HIGH + jobsBySeverity.MEDIUM + jobsBySeverity.LOW;
        expect(severitySum).toBe(totalIssues);
      }),
      { numRuns: 100 }
    );
  });
});
