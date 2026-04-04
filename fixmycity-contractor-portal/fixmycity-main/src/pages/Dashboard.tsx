import { Briefcase, Search, TrendingUp, Clock, ArrowRight, FileText, Award, CheckCircle, Send } from "lucide-react";
import { Link } from "react-router-dom";
import ReputationRing from "@/components/ReputationRing";
import { useJobs } from "@/hooks/useJobs";

export default function Dashboard() {
  const { openJobs, myJobs, loading } = useJobs();
  const name = localStorage.getItem("name") || "Contractor";

  const activeJobs = myJobs.filter(j => j.status === "ASSIGNED" || j.status === "IN_PROGRESS");
  const completedJobs = myJobs.filter(j => j.status === "COMPLETED");

  const statCards = [
    { label: "Open Jobs Available", value: loading ? "…" : openJobs.length.toString(), icon: Search, color: "text-primary" },
    { label: "Jobs In Progress", value: loading ? "…" : activeJobs.length.toString(), icon: Briefcase, color: "text-warning" },
    { label: "Jobs Completed", value: loading ? "…" : completedJobs.length.toString(), icon: CheckCircle, color: "text-success" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          Welcome back, {name.split(" ")[0]} 👋
        </h1>
        <p className="text-muted-foreground mt-1">Here's your work overview for today.</p>
      </div>

      {/* Stats + Reputation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <div key={card.label} className="glass-card p-5 hover-lift opacity-0 animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
            <div className="flex items-center justify-between mb-3">
              <card.icon className={`w-5 h-5 ${card.color}`} />
              <span className="text-xs text-muted-foreground uppercase tracking-wider">{card.label}</span>
            </div>
            <p className="text-3xl font-bold text-foreground">{card.value}</p>
          </div>
        ))}
        <div className="glass-card p-5 flex items-center justify-center hover-lift opacity-0 animate-fade-in" style={{ animationDelay: "300ms" }}>
          <ReputationRing score={completedJobs.length > 0 ? Math.min(100, completedJobs.length * 10 + 50) : 50} size={100} strokeWidth={6} />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Link to="/app/jobs" className="flex-1 glass-card p-4 flex items-center justify-between hover-lift group">
          <div className="flex items-center gap-3">
            <Search className="w-5 h-5 text-primary" />
            <span className="font-semibold text-foreground">Browse Open Jobs</span>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </Link>
        <Link to="/app/my-jobs" className="flex-1 glass-card p-4 flex items-center justify-between hover-lift group">
          <div className="flex items-center gap-3">
            <Briefcase className="w-5 h-5 text-success" />
            <span className="font-semibold text-foreground">View My Jobs</span>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-success transition-colors" />
        </Link>
      </div>

      {/* Active Jobs */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-warning" /> Active Jobs
        </h2>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : activeJobs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active jobs. <Link to="/app/jobs" className="text-primary hover:underline">Browse open jobs</Link> to place bids.</p>
        ) : (
          <div className="space-y-3">
            {activeJobs.slice(0, 4).map((job) => (
              <div key={job._id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/[0.04]">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{job.title}</p>
                  <p className="text-xs text-muted-foreground">{job.location?.address || "—"}</p>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ml-3 ${
                  job.status === "IN_PROGRESS" ? "bg-orange-500/15 text-orange-400" : "bg-blue-500/15 text-blue-400"
                }`}>
                  {job.status.replace("_", " ")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
