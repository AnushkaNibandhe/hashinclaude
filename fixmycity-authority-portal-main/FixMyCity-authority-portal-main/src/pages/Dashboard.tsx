import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { StatCard } from "@/components/StatCard";
import { FileWarning, Briefcase, CheckCircle2, AlertTriangle, TrendingUp, ArrowUpRight, Plus, Zap, Loader2, X, PlusCircle, MapPin, BarChart2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { CreateJobModal } from "@/components/CreateJobModal";
import { useComplaints } from "@/hooks/useComplaints";
import { useJobs } from "@/hooks/useJobs";
import { toast } from "sonner";

const DEMO_PRESETS = [
  { index: 0, title: "Pothole Repair - FC Road", category: "POTHOLE", severity: "HIGH", address: "FC Road, Pune" },
  { index: 1, title: "Street Light Outage - Baner", category: "ELECTRICAL", severity: "MEDIUM", address: "Baner Road, Pune" },
  { index: 2, title: "Drainage Blockage - Koregaon Park", category: "DRAINAGE", severity: "HIGH", address: "Koregaon Park, Pune" },
  { index: 3, title: "Broken Footpath - Kothrud", category: "FOOTPATH", severity: "LOW", address: "Kothrud Depot, Pune" },
  { index: 4, title: "Water Pipe Leak - Aundh", category: "WATER", severity: "HIGH", address: "Aundh ITI Road, Pune" },
];

const SEV_COLORS: Record<string, string> = {
  HIGH: "text-red-400 bg-red-400/10",
  MEDIUM: "text-yellow-400 bg-yellow-400/10",
  LOW: "text-green-400 bg-green-400/10",
};

export default function Dashboard() {
  const { complaints } = useComplaints();
  const {
    jobs,
    createDemoJob,
    jobsByCategory,
    completionRate,
    demoPresets,
    fetchDemoPresets,
    totalIssues,
    activeHotspots,
    completedIssues,
    jobsBySeverity,
  } = useJobs();
  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchDemoPresets();
  }, [fetchDemoPresets]);

  const recentComplaints = complaints.slice(0, 5).map(c => ({
    id: c._id,
    image: c.imageUrl || "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&q=80&w=100",
    title: c.description || c.category || "Issue",
    location: c.location?.address || "Unknown Location",
    severity: c.severity.toLowerCase(),
    status: c.status === "IN_PROGRESS" ? "progress" : c.status.toLowerCase()
  }));

  const activeJobsList = jobs.filter(j => j.status !== "COMPLETED").slice(0, 4).map(j => ({
    id: j._id,
    status: j.status === "IN_PROGRESS" ? "progress" : j.status.toLowerCase(),
    complaintTitle: j.title,
    isDemoJob: j.isDemoJob,
    createdAt: j.createdAt,
  }));

  const handleCreateDemo = async (preset: number) => {
    setCreating(true);
    try {
      const job = await createDemoJob(preset);
      toast.success("Demo job created!", {
        description: `"${job.title}" is now open for bids.`,
      });
      setModalOpen(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to create demo job");
    } finally {
      setCreating(false);
    }
  };

  // Top categories for analytics
  const topCategories = Object.entries(jobsByCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  return (
    <DashboardLayout title="Dashboard">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header row with Create Demo Job button */}
        <div className="flex items-center justify-between">
          <div />
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-semibold text-sm shadow-lg shadow-blue-500/20 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            Create Job
          </motion.button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Total Issues" value={totalIssues} icon={MapPin} accentColor="#3B82F6" delay={0} />
          <StatCard title="Active Hotspots" value={activeHotspots} icon={Briefcase} accentColor="#F59E0B" delay={0.05} />
          <StatCard title="Completed Issues" value={completedIssues} change="+8%" changeType="positive" icon={CheckCircle2} accentColor="#10B981" delay={0.1} />
          <StatCard title="Critical Alerts" value={complaints.filter(c => c.severity === "HIGH" && c.status !== "COMPLETED").length} change="−2" changeType="positive" icon={AlertTriangle} accentColor="#EF4444" delay={0.15} />
        </div>

        {/* Severity Distribution */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.18 }}
          className="glass-card p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
              <BarChart2 className="w-4 h-4 text-primary" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">Severity Distribution</h3>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex flex-col items-center gap-1 p-3 rounded-xl bg-red-500/10">
              <span className="text-2xl font-bold text-red-400">{jobsBySeverity.HIGH}</span>
              <span className="text-xs font-medium text-red-400">HIGH</span>
            </div>
            <div className="flex flex-col items-center gap-1 p-3 rounded-xl bg-yellow-500/10">
              <span className="text-2xl font-bold text-yellow-400">{jobsBySeverity.MEDIUM}</span>
              <span className="text-xs font-medium text-yellow-400">MEDIUM</span>
            </div>
            <div className="flex flex-col items-center gap-1 p-3 rounded-xl bg-green-500/10">
              <span className="text-2xl font-bold text-green-400">{jobsBySeverity.LOW}</span>
              <span className="text-xs font-medium text-green-400">LOW</span>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Recent complaints */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="lg:col-span-3 glass-card p-0 overflow-hidden"
          >
            <div className="flex items-center justify-between p-5 border-b border-border/50">
              <h3 className="text-sm font-semibold text-foreground">Recent Complaints</h3>
              <a href="/complaints" className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
                View all <ArrowUpRight className="w-3 h-3" />
              </a>
            </div>
            <div className="divide-y divide-border/30">
              {recentComplaints.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">No complaints yet.</div>
              ) : recentComplaints.map((c) => (
                <div key={c.id} className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
                  <img src={c.image} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&q=80&w=100"; }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{c.title}</p>
                    <p className="text-xs text-muted-foreground">{c.location}</p>
                  </div>
                  <span className={`badge-severity-${c.severity}`}>{c.severity}</span>
                  <span className={`badge-status-${c.status === "in-progress" ? "progress" : c.status}`}>{c.status}</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Active jobs */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
            className="lg:col-span-2 glass-card p-0 overflow-hidden"
          >
            <div className="flex items-center justify-between p-5 border-b border-border/50">
              <h3 className="text-sm font-semibold text-foreground">Active Jobs</h3>
              <a href="/jobs" className="text-xs text-primary hover:text-primary/80 flex items-center gap-1 transition-colors">
                View all <ArrowUpRight className="w-3 h-3" />
              </a>
            </div>
            <div className="divide-y divide-border/30">
              {activeJobsList.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No active jobs yet.{" "}
                  <button onClick={() => setModalOpen(true)} className="text-primary hover:underline">Create a job</button>
                </div>
              ) : activeJobsList.map((j) => (
                <div key={j.id} className="p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      {j.isDemoJob && <span className="text-[9px] font-bold px-1.5 py-0.5 bg-amber-500/15 text-amber-400 rounded-full uppercase tracking-wider">demo</span>}
                      <span className="text-xs font-mono text-muted-foreground truncate max-w-[100px]">{j.id.slice(-8)}</span>
                    </div>
                    <span className={`badge-status-${j.status === "in-progress" ? "progress" : j.status}`}>{j.status}</span>
                  </div>
                  <p className="text-sm font-medium text-foreground truncate">{j.complaintTitle}</p>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(j.createdAt).toLocaleDateString()}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Analytics row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Category breakdown */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="glass-card p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                <Briefcase className="w-4 h-4 text-primary" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Jobs by Category</h3>
            </div>
            {topCategories.length === 0 ? (
              <p className="text-sm text-muted-foreground">No jobs yet.</p>
            ) : (
              <div className="space-y-3">
                {topCategories.map(([cat, count]) => {
                  const pct = Math.round((count / jobs.length) * 100);
                  return (
                    <div key={cat}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-muted-foreground">{cat}</span>
                        <span className="font-medium text-foreground">{count} ({pct}%)</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, delay: 0.4 }}
                          className="h-full bg-primary rounded-full"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>

          {/* Completion rate + trend */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.35 }}
            className="glass-card p-6"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-primary" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Resolution Trend</h3>
              <span className="ml-auto text-2xl font-bold text-primary">{completionRate}%</span>
            </div>
            <div className="flex items-end gap-1 h-24">
              {[35, 48, 42, 55, 60, 52, 68, 72, 65, 78, 82, 75, 88, 92, 85, 95, 89, 98, 92, completionRate || 0].map((h, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-t-sm bg-primary/20 hover:bg-primary/40 transition-colors relative group"
                  style={{ height: `${h}%` }}
                >
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] text-primary font-mono opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {h}%
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-[10px] text-muted-foreground/60">
              <span>Mar 1</span>
              <span>Today</span>
            </div>
          </motion.div>
        </div>
      </div>

      <CreateJobModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onDemoCreate={handleCreateDemo}
        demoPresets={demoPresets.length > 0 ? demoPresets : DEMO_PRESETS}
      />
    </DashboardLayout>
  );
}
