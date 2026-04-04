import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { useJobs, Job } from "@/hooks/useJobs";
import { useBids, Bid } from "@/hooks/useBids";
import { Clock, Users, CheckCircle2, Briefcase, UserCheck, X, Zap, Plus, Loader2, Image, MapPin, BarChart2, PlusCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { CreateJobModal } from "@/components/CreateJobModal";
import { toast } from "sonner";

const columns: { status: Job["status"]; label: string; icon: React.ElementType; color: string }[] = [
  { status: "OPEN", label: "Open", icon: Briefcase, color: "#EAB308" },
  { status: "ASSIGNED", label: "Assigned", icon: UserCheck, color: "#3B82F6" },
  { status: "IN_PROGRESS", label: "In Progress", icon: Clock, color: "#F97316" },
  { status: "COMPLETED", label: "Completed", icon: CheckCircle2, color: "#22C55E" },
];

const badgeClass: Record<Job["status"], string> = {
  OPEN: "badge-status-open",
  ASSIGNED: "badge-status-progress",
  IN_PROGRESS: "badge-status-progress",
  COMPLETED: "badge-status-completed",
};

const DEMO_PRESETS = [
  { index: 0, title: "Pothole Repair - FC Road", category: "POTHOLE", severity: "HIGH", address: "FC Road, Pune" },
  { index: 1, title: "Street Light Outage - Baner", category: "ELECTRICAL", severity: "MEDIUM", address: "Baner Road, Pune" },
  { index: 2, title: "Drainage Blockage - Koregaon Park", category: "DRAINAGE", severity: "HIGH", address: "Koregaon Park, Pune" },
  { index: 3, title: "Broken Footpath - Kothrud", category: "FOOTPATH", severity: "LOW", address: "Kothrud Depot, Pune" },
  { index: 4, title: "Water Pipe Leak - Aundh", category: "WATER", severity: "HIGH", address: "Aundh ITI Road, Pune" },
];

export default function Jobs() {
  const { jobs, loading, error, refetch, assignJob, createDemoJob, fetchDemoPresets, demoPresets, jobsByCategory, completionRate } = useJobs();
  const { bids, loading: bidsLoading, fetchBids } = useBids();
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [proofJob, setProofJob] = useState<Job | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);

  useEffect(() => {
    fetchDemoPresets();
  }, [fetchDemoPresets]);

  const handleJobClick = (job: Job) => {
    if (job.status === "OPEN") {
      fetchBids(job._id);
      setSelectedJob(job);
    } else if (job.status === "COMPLETED" && job.completionImage) {
      setProofJob(job);
    }
  };

  const handleAssign = async (bid: Bid) => {
    if (!selectedJob) return;
    try {
      await assignJob(selectedJob._id, bid.contractorId._id, bid._id);
      toast.success("Contractor assigned!", { description: `${bid.contractorId.username} has been assigned the job.` });
      setSelectedJob(null);
    } catch {
      toast.error("Failed to assign contractor");
    }
  };

  const handleCreateDemo = async (preset: number) => {
    try {
      const job = await createDemoJob(preset);
      toast.success("Demo job created!", { description: `"${job.title}" is now open for bids.` });
      setModalOpen(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to create demo job");
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Jobs Board">
        <div className="flex items-center justify-center h-64 text-muted-foreground gap-2">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading jobs...
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Jobs Board">
        <div className="flex items-center justify-center h-64 text-destructive">{error}</div>
      </DashboardLayout>
    );
  }

  const topCategories = Object.entries(jobsByCategory).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <DashboardLayout title="Jobs Board">
      <div className="max-w-7xl mx-auto space-y-5">
        {/* Header actions */}
        <div className="flex items-center gap-3 flex-wrap">
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-semibold text-sm shadow-lg shadow-blue-500/20 transition-all"
          >
            <PlusCircle className="w-4 h-4" /> Create Job
          </motion.button>
          <button
            onClick={() => setShowAnalytics(!showAnalytics)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all ${showAnalytics ? "bg-primary/15 border-primary/30 text-primary" : "border-border/50 text-muted-foreground hover:text-foreground hover:border-border"}`}
          >
            <BarChart2 className="w-4 h-4" /> Analytics
          </button>
          <div className="ml-auto text-xs text-muted-foreground">
            {jobs.length} total · {jobs.filter(j => j.status === "COMPLETED").length} completed · {completionRate}% resolution rate
          </div>
        </div>

        {/* Analytics panel */}
        <AnimatePresence>
          {showAnalytics && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="glass-card p-5 overflow-hidden"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-3">Jobs by Category</h4>
                  <div className="space-y-2.5">
                    {topCategories.map(([cat, count]) => {
                      const pct = jobs.length > 0 ? Math.round((count / jobs.length) * 100) : 0;
                      return (
                        <div key={cat}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-muted-foreground">{cat}</span>
                            <span className="font-medium text-foreground">{count} ({pct}%)</span>
                          </div>
                          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8 }}
                              className="h-full bg-primary rounded-full" />
                          </div>
                        </div>
                      );
                    })}
                    {topCategories.length === 0 && <p className="text-sm text-muted-foreground">No job data yet.</p>}
                  </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-3">Status Pipeline</h4>
                  <div className="grid grid-cols-2 gap-3">
                    {columns.map(col => {
                      const count = jobs.filter(j => j.status === col.status).length;
                      return (
                        <div key={col.status} className="p-3 rounded-xl bg-muted/30 border border-border/30">
                          <div className="flex items-center gap-2 mb-1">
                            <col.icon className="w-3.5 h-3.5" style={{ color: col.color }} />
                            <span className="text-xs text-muted-foreground">{col.label}</span>
                          </div>
                          <p className="text-2xl font-bold text-foreground">{count}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Kanban + bids sidebar */}
        <div className="flex gap-6">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-6">
            {columns.map((col, ci) => {
              const colJobs = jobs.filter((j) => j.status === col.status);
              return (
                <motion.div
                  key={col.status}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: ci * 0.05 }}
                  className="space-y-3"
                >
                  <div className="flex items-center gap-2 px-1">
                    <col.icon className="w-4 h-4" style={{ color: col.color }} />
                    <h3 className="text-sm font-semibold text-foreground">{col.label}</h3>
                    <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full ml-auto">{colJobs.length}</span>
                  </div>
                  <div className="space-y-3">
                    {colJobs.map((j) => (
                      <div
                        key={j._id}
                        className="glass-card-hover p-4 space-y-2 cursor-pointer"
                        onClick={() => handleJobClick(j)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            {j.isDemoJob && <span className="text-[9px] font-bold px-1.5 py-0.5 bg-amber-500/15 text-amber-400 rounded-full uppercase">demo</span>}
                            <span className="text-xs font-mono text-muted-foreground truncate max-w-[70px]">{j._id.slice(-6)}</span>
                          </div>
                          <span className={badgeClass[j.status]}>{j.status.replace("_", " ")}</span>
                        </div>
                        <p className="text-sm font-medium text-foreground line-clamp-2">{j.title}</p>
                        {j.location?.address && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-2.5 h-2.5" /> {j.location.address}
                          </p>
                        )}
                        {j.assignedTo?.username && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Users className="w-2.5 h-2.5" /> {j.assignedTo.username}
                          </p>
                        )}
                        {j.status === "COMPLETED" && j.completionImage && (
                          <div className="mt-2 rounded-lg overflow-hidden">
                            <img src={j.completionImage} alt="Completion proof" className="w-full h-20 object-cover" />
                            <div className="flex items-center gap-1 text-[10px] text-green-400 mt-1">
                              <CheckCircle2 className="w-3 h-3" /> Proof submitted
                            </div>
                          </div>
                        )}
                        {j.status === "OPEN" && (
                          <p className="text-xs text-primary">Click to view bids →</p>
                        )}
                        {j.status === "COMPLETED" && !j.completionImage && (
                          <p className="text-xs text-muted-foreground">No proof uploaded</p>
                        )}
                      </div>
                    ))}
                    {colJobs.length === 0 && (
                      <div className="glass-card p-8 text-center text-sm text-muted-foreground">No jobs</div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Bids sidebar */}
          <AnimatePresence>
            {selectedJob && (
              <motion.div
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 24 }}
                transition={{ duration: 0.3 }}
                className="w-80 shrink-0 glass-card p-4 space-y-4 self-start"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">Bids for Job</h3>
                  <button onClick={() => setSelectedJob(null)} className="text-muted-foreground hover:text-foreground">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">{selectedJob.title}</p>
                {selectedJob.location?.address && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {selectedJob.location.address}
                  </p>
                )}

                {bidsLoading && <p className="text-xs text-muted-foreground">Loading bids...</p>}

                {!bidsLoading && bids.length === 0 && (
                  <div className="glass-card p-6 text-center text-xs text-muted-foreground">
                    No bids yet. Contractors will submit bids shortly.
                  </div>
                )}

                {!bidsLoading && bids.map((bid) => (
                  <div key={bid._id} className="glass-card p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">{bid.contractorId.username}</span>
                      {bid.cost > 0 && <span className="text-xs font-semibold text-foreground">₹{bid.cost.toLocaleString()}</span>}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" /> <span>ETA: {bid.eta}</span>
                    </div>
                    {bid.note && <p className="text-xs text-muted-foreground italic">"{bid.note}"</p>}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAssign(bid)}
                        className="flex-1 text-xs bg-primary text-primary-foreground rounded-lg px-3 py-2 hover:bg-primary/90 transition-colors font-semibold"
                      >
                        ✓ Accept Bid
                      </button>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Completion Proof Modal */}
      <AnimatePresence>
        {proofJob && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/60 backdrop-blur-sm z-40" onClick={() => setProofJob(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="w-full max-w-md glass-card p-6 space-y-4 shadow-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-400" />
                    <h3 className="font-semibold text-foreground">Completion Proof</h3>
                  </div>
                  <button onClick={() => setProofJob(null)}><X className="w-4 h-4 text-muted-foreground" /></button>
                </div>
                <p className="text-sm text-muted-foreground">{proofJob.title}</p>
                {proofJob.completionImage && (
                  <img src={proofJob.completionImage} alt="Completion" className="w-full h-48 rounded-xl object-cover" />
                )}
                {proofJob.completionLocation && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground p-3 bg-muted/30 rounded-lg">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span>Location verified: {proofJob.completionLocation.lat.toFixed(4)}, {proofJob.completionLocation.lng.toFixed(4)}</span>
                  </div>
                )}
                {proofJob.assignedTo && (
                  <p className="text-xs text-muted-foreground">Completed by: <span className="text-foreground font-medium">{proofJob.assignedTo.username}</span></p>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <CreateJobModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onDemoCreate={handleCreateDemo}
        demoPresets={demoPresets.length > 0 ? demoPresets : DEMO_PRESETS}
      />
    </DashboardLayout>
  );
}
