import { useState, useEffect } from "react";
import API from "@/services/api";
import { Complaint } from "@/types";

interface MappedJob {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  ward: string;
  severity: string;
  deadline: string;
  status: string;
  postedDate: string;
}

export function useComplaints() {
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchComplaints = async () => {
    try {
      const res = await API.get("/complaints");
      setComplaints(res.data);
    } catch (err) {
      console.error("Failed to fetch complaints:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComplaints();
  }, []);

  // Map Complaint to MappedJob for the UI
  const mappedJobs: MappedJob[] = complaints.map((c, i) => ({
    id: c._id || `C${i}`,
    title: c.category ? `${c.category} Issue` : "Public Issue",
    description: c.description || "",
    category: c.category || "Roads",
    location: "View description for details",
    ward: "Assigned Ward",
    severity: "medium",
    deadline: new Date(Date.now() + 7 * 86400000).toISOString(),
    status: c.status === "COMPLETED" ? "completed" : c.status === "IN_PROGRESS" ? "in_progress" : "open",
    postedDate: c.createdAt || new Date().toISOString(),
  }));

  const openJobs = mappedJobs.filter(j => j.status === "open");
  const activeJobs = mappedJobs.filter(j => j.status === "in_progress");

  const updateStatus = async (id: string, status: string) => {
    try {
      await API.patch(`/complaints/${id}/status`, { status });
      await fetchComplaints();
    } catch (err) {
      console.error("Failed to update status:", err);
      throw err;
    }
  };

  return { complaints, mappedJobs, openJobs, activeJobs, loading, updateStatus };
}
