import { useState, useEffect, useCallback } from "react";
import API from "@/services/api";

export interface BidWithJob {
  _id: string;
  jobId: string;
  jobTitle: string;
  contractorId: { _id: string; username: string; role: string };
  eta: string;
  cost: number;
  note: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  createdAt: string;
}

export function useContractorBids() {
  const [bids, setBids] = useState<BidWithJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchBids = useCallback(async () => {
    const userId = localStorage.getItem("userId");
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      // 1. Fetch all jobs
      const jobsRes = await API.get("/jobs");
      const allJobs: Array<{ _id: string; title: string }> = jobsRes.data;

      // 2. For each job, fetch bids and filter to this contractor's bids
      const bidPromises = allJobs.map(async (job) => {
        try {
          const bidsRes = await API.get(`/bids/${job._id}`);
          const jobBids: Array<{
            _id: string;
            jobId: string;
            contractorId: { _id: string; username: string; role: string };
            eta: string;
            cost: number;
            note: string;
            status: "PENDING" | "ACCEPTED" | "REJECTED";
            createdAt: string;
          }> = bidsRes.data;

          return jobBids
            .filter((b) => b.contractorId?._id === userId)
            .map((b) => ({ ...b, jobTitle: job.title }));
        } catch {
          return [];
        }
      });

      const results = await Promise.all(bidPromises);
      const flat = results.flat().sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      setBids(flat);
      setError("");
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to fetch bids");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBids();
    const interval = setInterval(fetchBids, 30_000);
    return () => clearInterval(interval);
  }, [fetchBids]);

  return { bids, loading, error, refetch: fetchBids };
}
