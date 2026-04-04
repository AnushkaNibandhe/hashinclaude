import { useState, useEffect } from "react";
import { Mail, Phone, Calendar, Briefcase, Clock, Star, Loader2 } from "lucide-react";
import ReputationRing from "@/components/ReputationRing";
import { useJobs } from "@/hooks/useJobs";
import API from "@/services/api";

interface BidWithJob {
  _id: string;
  jobTitle: string;
  eta: string;
  cost: number;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  createdAt: string;
}

export default function ProfilePage() {
  const { myJobs, loading: jobsLoading } = useJobs();
  const [bids, setBids] = useState<BidWithJob[]>([]);
  const [bidsLoading, setBidsLoading] = useState(true);

  const name = localStorage.getItem("name") || "Contractor";
  const userId = localStorage.getItem("userId") || "";
  const initials = name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  const completedJobs = myJobs.filter(j => j.status === "COMPLETED");
  const acceptedBids = bids.filter(b => b.status === "ACCEPTED").length;
  const totalBids = bids.length;
  const winRate = totalBids > 0 ? Math.round((acceptedBids / totalBids) * 100) : 0;
  const reputationScore = Math.min(100, completedJobs.length * 8 + winRate * 0.3 + 40);

  useEffect(() => {
    const fetchMyBids = async () => {
      setBidsLoading(true);
      try {
        const res = await API.get("/jobs");
        const results: BidWithJob[] = [];
        for (const job of res.data) {
          try {
            const bidRes = await API.get(`/bids/${job._id}`);
            const mine = bidRes.data.filter(
              (b: any) => b.contractorId?._id === userId || b.contractorId === userId
            );
            mine.forEach((b: any) => results.push({ ...b, jobTitle: job.title }));
          } catch {}
        }
        setBids(results);
      } catch {}
      finally { setBidsLoading(false); }
    };
    if (userId) fetchMyBids();
    else setBidsLoading(false);
  }, [userId]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Contractor Profile</h1>
        <p className="text-muted-foreground mt-1">Your performance metrics and history.</p>
      </div>

      {/* Profile Header */}
      <div className="glass-card p-6 flex flex-col sm:flex-row items-center gap-6">
        <div className="w-20 h-20 rounded-2xl bg-primary/20 flex items-center justify-center text-primary text-2xl font-bold">
          {initials}
        </div>
        <div className="text-center sm:text-left flex-1">
          <h2 className="text-xl font-bold text-foreground">{name}</h2>
          <p className="text-muted-foreground text-sm">Contractor</p>
        </div>
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Jobs Completed</span>
          <span className="text-3xl font-bold text-foreground">{jobsLoading ? "…" : completedJobs.length}</span>
        </div>
      </div>

      {/* Reputation */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6 flex flex-col items-center">
          <h3 className="text-lg font-semibold text-foreground mb-6">Reputation Score</h3>
          <ReputationRing score={Math.round(reputationScore)} size={160} strokeWidth={10} />
          <p className="text-xs text-muted-foreground mt-4">Based on completed jobs and bid win rate</p>
        </div>

        <div className="glass-card p-6">
          <h3 className="text-lg font-semibold text-foreground mb-6">Performance Breakdown</h3>
          <div className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Star className="w-4 h-4 text-warning" /> Bid Win Rate
                </span>
                <span className="text-sm font-bold text-foreground">{winRate}%</span>
              </div>
              <div className="h-2 rounded-full bg-white/[0.06]">
                <div className="h-full rounded-full bg-warning transition-all duration-1000" style={{ width: `${winRate}%` }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Briefcase className="w-4 h-4 text-success" /> Jobs Completed
                </span>
                <span className="text-sm font-bold text-foreground">{jobsLoading ? "…" : completedJobs.length}</span>
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4 text-primary" /> Total Bids Submitted
                </span>
                <span className="text-sm font-bold text-foreground">{bidsLoading ? "…" : totalBids}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bid History */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Bid History</h3>
        {bidsLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading bids...
          </div>
        ) : bids.length === 0 ? (
          <p className="text-sm text-muted-foreground">No bids submitted yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left py-3 text-muted-foreground font-medium">Job</th>
                  <th className="text-left py-3 text-muted-foreground font-medium">Amount</th>
                  <th className="text-left py-3 text-muted-foreground font-medium">ETA</th>
                  <th className="text-left py-3 text-muted-foreground font-medium">Date</th>
                  <th className="text-right py-3 text-muted-foreground font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {bids.map((bid) => (
                  <tr key={bid._id} className="border-b border-white/[0.03]">
                    <td className="py-3 text-foreground">{bid.jobTitle}</td>
                    <td className="py-3 text-foreground">{bid.cost > 0 ? `₹${bid.cost.toLocaleString()}` : "—"}</td>
                    <td className="py-3 text-muted-foreground">{bid.eta}</td>
                    <td className="py-3 text-muted-foreground">{new Date(bid.createdAt).toLocaleDateString()}</td>
                    <td className="py-3 text-right">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                        bid.status === "ACCEPTED" ? "bg-green-500/15 text-green-400" :
                        bid.status === "REJECTED" ? "bg-red-500/15 text-red-400" :
                        "bg-yellow-500/15 text-yellow-400"
                      }`}>
                        {bid.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
