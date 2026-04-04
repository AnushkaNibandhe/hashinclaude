import { useState, useEffect, useCallback } from "react";
import API from "@/services/api";

export interface Job {
  _id: string;
  complaintId?: { _id: string; description: string; category: string; imageUrl?: string };
  title: string;
  description: string;
  category: string;
  severity: string;
  location: { lat: number; lng: number; address: string };
  status: "OPEN" | "ASSIGNED" | "IN_PROGRESS" | "COMPLETED";
  source?: string;
  isVerified?: boolean;
  isVerifiedCompletion?: boolean;
  assignedTo?: { _id: string; username: string; role: string };
  completionImage?: string;
  completionLocation?: { lat: number; lng: number };
  completedAt?: string;
  isDemoJob?: boolean;
  imageUrl?: string;
  createdAt: string;
}

export interface DemoPreset {
  index: number;
  title: string;
  category: string;
  severity: string;
  location: { lat: number; lng: number; address: string };
}

export function useJobs() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [demoPresets, setDemoPresets] = useState<DemoPreset[]>([]);

  const fetchJobs = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const { data } = await API.get<Job[]>("/jobs");
      setJobs(data);
    } catch (err) {
      console.error("useJobs fetch error:", err);
      setError("Failed to fetch jobs");
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs(true);
    // Silent background polls — don't show loading spinner
    const interval = setInterval(() => fetchJobs(false), 30000);
    return () => clearInterval(interval);
  }, [fetchJobs]);

  const fetchDemoPresets = useCallback(async () => {
    try {
      const { data } = await API.get<DemoPreset[]>("/jobs/demo/presets");
      setDemoPresets(data);
      return data;
    } catch (err) {
      console.error("Failed to fetch demo presets:", err);
      return [];
    }
  }, []);

  const createJob = async (payload: Omit<Job, "_id" | "status" | "createdAt" | "assignedTo">) => {
    const { data } = await API.post<Job>("/jobs", {
      ...payload,
      status: "OPEN",
      source: "ADMIN",
      isVerified: true,
    });
    await fetchJobs();
    return data;
  };

  const createDemoJob = async (preset?: number | object) => {
    let body: object = {};
    if (typeof preset === "number") {
      body = { preset };
    } else if (preset && typeof preset === "object") {
      body = preset;
    }
    const { data } = await API.post<Job>("/jobs/demo", body);
    await fetchJobs();
    return data;
  };

  const assignJob = async (jobId: string, contractorId: string, bidId: string) => {
    const { data } = await API.put<Job>(`/jobs/${jobId}/assign`, { contractorId, bidId });
    await fetchJobs();
    return data;
  };

  const uploadImage = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("image", file);
    const { data } = await API.post("/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data.imageUrl;
  };

  const updateJobStatus = async (jobId: string, status: Job["status"]) => {
    const { data } = await API.put<Job>(`/jobs/${jobId}/status`, { status });
    await fetchJobs();
    return data;
  };

  // Analytics helpers
  const jobsByCategory = jobs.reduce<Record<string, number>>((acc, j) => {
    const cat = j.category || "Unknown";
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  const completionRate = jobs.length > 0
    ? Math.round((jobs.filter(j => j.status === "COMPLETED").length / jobs.length) * 100)
    : 0;

  const totalIssues = jobs.length;
  const activeHotspots = jobs.filter(j => j.status !== "COMPLETED").length;
  const completedIssues = jobs.filter(j => j.status === "COMPLETED").length;
  const jobsBySeverity = jobs.reduce<{ HIGH: number; MEDIUM: number; LOW: number }>(
    (acc, j) => {
      const sev = j.severity as "HIGH" | "MEDIUM" | "LOW";
      if (sev in acc) acc[sev]++;
      return acc;
    },
    { HIGH: 0, MEDIUM: 0, LOW: 0 }
  );

  return {
    jobs,
    loading,
    error,
    demoPresets,
    refetch: fetchJobs,
    fetchDemoPresets,
    createJob,
    createDemoJob,
    assignJob,
    updateJobStatus,
    uploadImage,
    jobsByCategory,
    completionRate,
    totalIssues,
    activeHotspots,
    completedIssues,
    jobsBySeverity,
  };
}
