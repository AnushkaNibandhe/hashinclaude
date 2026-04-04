import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FileText, Clock, Loader2 } from "lucide-react";
import API from "@/services/api";

interface BidWithJob {
  _id: string;
  jobId: string;
  jobTitle: string;
  eta: string;
  cost: number;
  note: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  createdAt: string;
}

export default function BidsPage() {
  const [bids, setBids] = useState<BidWithJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMyBids = async () => {
      setLoading(true);
      try {
        const userId = localStorage.getItem("userId");
        const res = await API.get("/jobs");
        const allJobs = res.data;
        const results: BidWithJob[] = [];
        for (const job of allJobs) {
          try {
            const bidRes = await API.get(`/bids/${job._id}`);
            const mine = bidRes.data.filter(
              (b: any) => b.contractorId?._id === userId || b.contractorId === userId
            );
            mine.forEach((b: any) => results.push({ ...b, jobTitle: job.title }));
          } catch {}
        }
        setBids(results);
      } catch (err) {
        console.error("Failed to fetch bids", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMyBids();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin" /> Loading your bids...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">My Bids</h1>
        <p className="text-muted-foreground mt-1">Track all your submitted bids in one place.</p>
      </div>

      {bids.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <FileText className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>No bids yet. <Link to="/app/jobs" className="text-primary hover:underline">Browse open jobs</Link> to get started.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bids.map((bid, i) => (
            <div key={bid._id} className="glass-card p-5 hover-lift opacity-0 animate-fade-in" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1 min-w-0 space-y-1">
                  <h3 className="font-semibold text-foreground">{bid.jobTitle}</h3>
                  {bid.note && <p className="text-sm text-muted-foreground">{bid.note}</p>}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {bid.cost > 0 && <span className="text-foreground font-medium">₹{bid.cost.toLocaleString()}</span>}
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> ETA: {bid.eta}</span>
                    <span>{new Date(bid.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <span className={`text-xs font-bold px-3 py-1.5 rounded-full shrink-0 ${
                  bid.status === "ACCEPTED" ? "bg-green-500/15 text-green-400" :
                  bid.status === "REJECTED" ? "bg-red-500/15 text-red-400" :
                  "bg-yellow-500/15 text-yellow-400"
                }`}>
                  {bid.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
