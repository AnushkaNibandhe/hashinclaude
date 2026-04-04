export const SEVERITY_COLORS: Record<string, string> = {
  HIGH: "#EF4444",
  MEDIUM: "#F59E0B",
  LOW: "#10B981",
};

const COMPLETED_COLOR = "#10B981";

export function getMarkerColor(job: { severity: string; status: string }): string {
  if (job.status === "COMPLETED") return COMPLETED_COLOR;
  return SEVERITY_COLORS[job.severity] ?? "#3B82F6";
}
