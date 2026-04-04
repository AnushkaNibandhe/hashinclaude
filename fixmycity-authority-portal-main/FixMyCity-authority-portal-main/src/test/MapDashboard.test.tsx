// Feature: fixmycity-map-jobs — MapDashboard legend and error state
// Validates: Requirements 6.4, 14.4

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";

// Mock framer-motion to avoid animation issues in tests
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) =>
      React.createElement("div", props, children),
  },
}));

// Mock DashboardLayout
vi.mock("@/components/DashboardLayout", () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) =>
    React.createElement("div", { "data-testid": "dashboard-layout" }, children),
}));

// Mock leaflet to prevent DOM errors in jsdom
const mockMapInstance = {
  setView: vi.fn().mockReturnThis(),
  addLayer: vi.fn(),
  remove: vi.fn(),
};
vi.mock("leaflet", () => ({
  default: {
    map: vi.fn(() => mockMapInstance),
    tileLayer: vi.fn(() => ({ addTo: vi.fn() })),
    control: { zoom: vi.fn(() => ({ addTo: vi.fn() })) },
    divIcon: vi.fn(() => ({})),
    marker: vi.fn(() => ({ bindPopup: vi.fn().mockReturnThis() })),
    polyline: vi.fn(() => ({})),
    point: vi.fn((x, y) => [x, y]),
    markerClusterGroup: vi.fn(() => ({ addLayer: vi.fn() })),
  },
  map: vi.fn(() => mockMapInstance),
  tileLayer: vi.fn(() => ({ addTo: vi.fn() })),
  control: { zoom: vi.fn(() => ({ addTo: vi.fn() })) },
  divIcon: vi.fn(() => ({})),
  marker: vi.fn(() => ({ bindPopup: vi.fn().mockReturnThis() })),
  polyline: vi.fn(() => ({})),
  point: vi.fn((x, y) => [x, y]),
  markerClusterGroup: vi.fn(() => ({ addLayer: vi.fn() })),
}));

const mockUseJobs = vi.fn();
const mockUseComplaints = vi.fn();

vi.mock("@/hooks/useJobs", () => ({
  useJobs: () => mockUseJobs(),
}));

vi.mock("@/hooks/useComplaints", () => ({
  useComplaints: () => mockUseComplaints(),
}));

// Default no-error state
const defaultJobs = {
  jobs: [],
  loading: false,
  error: null,
  totalIssues: 0,
  activeHotspots: 0,
  completedIssues: 0,
  jobsBySeverity: { HIGH: 0, MEDIUM: 0, LOW: 0 },
  refetch: vi.fn(),
};

const defaultComplaints = {
  complaints: [],
  loading: false,
  error: null,
  refetch: vi.fn(),
  updateStatus: vi.fn(),
};

beforeEach(() => {
  mockUseJobs.mockReturnValue(defaultJobs);
  mockUseComplaints.mockReturnValue(defaultComplaints);
});

// Lazy import after mocks are set up
async function renderMapDashboard() {
  const { default: MapDashboard } = await import("@/pages/MapDashboard");
  return render(React.createElement(MapDashboard));
}

describe("MapDashboard — severity color legend (req 6.4)", () => {
  it("renders HIGH severity label in the legend", async () => {
    await renderMapDashboard();
    expect(screen.getByText("HIGH")).toBeInTheDocument();
  });

  it("renders MEDIUM severity label in the legend", async () => {
    await renderMapDashboard();
    expect(screen.getByText("MEDIUM")).toBeInTheDocument();
  });

  it("renders LOW severity label in the legend", async () => {
    await renderMapDashboard();
    expect(screen.getByText("LOW")).toBeInTheDocument();
  });

  it("renders a color swatch for each severity level", async () => {
    await renderMapDashboard();
    expect(screen.getByTestId("severity-swatch-HIGH")).toBeInTheDocument();
    expect(screen.getByTestId("severity-swatch-MEDIUM")).toBeInTheDocument();
    expect(screen.getByTestId("severity-swatch-LOW")).toBeInTheDocument();
  });
});

describe("MapDashboard — error state (req 14.4)", () => {
  it("displays error banner when useJobs returns an error", async () => {
    mockUseJobs.mockReturnValue({ ...defaultJobs, error: "Failed to fetch jobs" });
    await renderMapDashboard();
    expect(screen.getByText("Failed to fetch jobs")).toBeInTheDocument();
  });

  it("displays error banner when useComplaints returns an error", async () => {
    mockUseComplaints.mockReturnValue({ ...defaultComplaints, error: "Failed to fetch complaints" });
    await renderMapDashboard();
    expect(screen.getByText("Failed to fetch complaints")).toBeInTheDocument();
  });

  it("does not render the map div when there is an error", async () => {
    mockUseJobs.mockReturnValue({ ...defaultJobs, error: "Network error" });
    const { container } = await renderMapDashboard();
    // The map ref div should not be present when in error state
    const mapDiv = container.querySelector('[class*="w-full h-full"]:not([class*="flex"])');
    expect(mapDiv).toBeNull();
  });

  it("does not show error banner when both hooks succeed", async () => {
    await renderMapDashboard();
    expect(screen.queryByText(/failed/i)).toBeNull();
  });
});
