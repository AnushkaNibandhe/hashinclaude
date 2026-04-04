import { useState, useEffect, useRef } from "react";
import { MapPin, Clock, Tag, Search as SearchIcon, Loader2, CheckCircle2, X } from "lucide-react";
import SeverityBadge from "@/components/SeverityBadge";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useJobs, type ApiJob } from "@/hooks/useJobs";

const tabs = ["Open Jobs", "Map View", "My Bids", "Awarded to Me"] as const;

const SEV_MAP: Record<string, "low" | "medium" | "high" | "critical"> = {
  LOW: "low", MEDIUM: "medium", HIGH: "high", CRITICAL: "critical",
};

export default function JobsPage() {
  const { openJobs, myJobs, loading, error, submitBid } = useJobs();
  const [myBidsData, setMyBidsData] = useState<Array<{_id:string;jobId:string;eta:string;cost:number;note:string;status:string;createdAt:string;jobTitle?:string}>>([]);
  const [bidsLoading, setBidsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("Open Jobs");
  const [search, setSearch] = useState("");
  const mapRef = useRef<HTMLDivElement>(null);
  const [catFilter, setCatFilter] = useState("all");
  const [sevFilter, setSevFilter] = useState("all");
  const [bidJob, setBidJob] = useState<ApiJob | null>(null);
  const [bidAmount, setBidAmount] = useState("");
  const [bidTime, setBidTime] = useState("");
  const [bidNote, setBidNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Fetch my bids from all jobs I've ever bid on
  useEffect(() => {
    if (activeTab !== "My Bids") return;
    const fetchMyBids = async () => {
      setBidsLoading(true);
      try {
        const userId = localStorage.getItem("userId");
        // Fetch all jobs, then filter bids for each one where I am the contractor
        const { default: API } = await import("@/services/api");
        const res = await API.get("/jobs");
        const allJobs = res.data;
        const bidResults: any[] = [];
        for (const job of allJobs) {
          try {
            const bidRes = await API.get(`/bids/${job._id}`);
            const myBids = bidRes.data.filter((b: any) => b.contractorId?._id === userId || b.contractorId === userId);
            myBids.forEach((b: any) => bidResults.push({ ...b, jobTitle: job.title }));
          } catch {}
        }
        setMyBidsData(bidResults);
      } catch (err) {
        console.error("Failed to fetch bids", err);
      } finally {
        setBidsLoading(false);
      }
    };
    fetchMyBids();
  }, [activeTab]);


  // Map View logic
  useEffect(() => {
    if (activeTab !== "Map View" || !mapRef.current) return;
    let mapInstance: any = null;
    
    import("leaflet").then((L) => {
      const loadCss = (href: string) => {
        if (!document.querySelector(`link[href="${href}"]`)) {
          const l = document.createElement("link");
          l.rel = "stylesheet"; l.href = href;
          document.head.appendChild(l);
        }
      };
      loadCss("https://unpkg.com/leaflet@1.9.4/dist/leaflet.css");

      const map = L.map(mapRef.current!).setView([18.5204, 73.8567], 13);
      mapInstance = map;
      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: "OSM", maxZoom: 19
      }).addTo(map);

      openJobs.forEach(j => {
        if (!j.location?.lat || !j.location?.lng) return;
        const color = j.severity === "HIGH" ? "#EF4444" : j.severity === "MEDIUM" ? "#F59E0B" : "#10B981";
        const icon = L.divIcon({
          className: "custom-pin",
          html: `<div style="width:24px;height:24px;background:${color}22;border:2px solid ${color};border-radius:50%;display:flex;align-items:center;justify-content:center;"><div style="width:8px;height:8px;background:${color};border-radius:50%;"></div></div>`,
        });
        
        const marker = L.marker([j.location.lat, j.location.lng], { icon }).addTo(map);
        marker.on('click', () => setBidJob(j));
        marker.bindTooltip(j.title, { direction: "top", offset: [0, -10] });
      });
      setTimeout(() => map.invalidateSize(), 200);
    });

    return () => { if (mapInstance) mapInstance.remove(); };
  }, [activeTab, openJobs]);

  const filtered = openJobs.filter((j) => {
    const loc = j.location?.address || "";
    if (search && !j.title.toLowerCase().includes(search.toLowerCase()) && !loc.toLowerCase().includes(search.toLowerCase())) return false;
    if (catFilter !== "all" && j.category !== catFilter) return false;
    if (sevFilter !== "all" && j.severity?.toUpperCase() !== sevFilter.toUpperCase()) return false;
    return true;
  });

  const handleSubmitBid = async () => {
    if (!bidTime) { toast.error("Please select a completion time"); return; }
    if (!bidJob) return;
    setSubmitting(true);
    try {
      await submitBid(bidJob._id, {
        eta: bidTime,
        cost: bidAmount ? parseFloat(bidAmount) : 0,
        note: bidNote,
      });
      toast.success("Bid submitted!", { description: `Your bid for "${bidJob.title}" has been placed.` });
      setBidJob(null); setBidAmount(""); setBidTime(""); setBidNote("");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to submit bid");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Job Discovery</h1>
        <p className="text-muted-foreground mt-1">Find and bid on municipal repair jobs.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/[0.03] p-1 rounded-xl w-fit">
        {tabs.map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === tab ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}>
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Open Jobs" && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search jobs or locations..." value={search} onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-white/[0.03] border-white/[0.06]" />
            </div>
            <Select value={catFilter} onValueChange={setCatFilter}>
              <SelectTrigger className="w-[150px] bg-white/[0.03] border-white/[0.06]"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {["Roads", "Drainage", "Electrical", "Power Cut", "Water", "Sanitation", "Parks"].map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sevFilter} onValueChange={setSevFilter}>
              <SelectTrigger className="w-[140px] bg-white/[0.03] border-white/[0.06]"><SelectValue placeholder="Severity" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severity</SelectItem>
                {["LOW", "MEDIUM", "HIGH"].map((s) => (
                  <SelectItem key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" /> Loading jobs...
            </div>
          ) : error ? (
            <div className="text-center py-12 text-destructive">{error}</div>
          ) : (
            <div className="grid gap-4">
              {filtered.map((job, i) => (
                <div key={job._id} className="glass-card p-5 hover-lift opacity-0 animate-fade-in"
                  style={{ animationDelay: `${i * 80}ms` }}>
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-foreground">{job.title}</h3>
                        <SeverityBadge severity={SEV_MAP[job.severity?.toUpperCase()] || "medium"} />
                        <span className="text-xs px-2 py-0.5 rounded-full bg-white/[0.06] text-muted-foreground">{job.category}</span>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{job.description}</p>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {job.location?.address || "Location not specified"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Tag className="w-3 h-3" />{job.category}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(job.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <Button onClick={() => setBidJob(job)} className="rounded-xl font-semibold hover-lift">
                      Place Bid
                    </Button>
                  </div>
                </div>
              ))}
              {filtered.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  {openJobs.length === 0 ? "No open jobs available yet. Check back soon." : "No jobs match your filters."}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {activeTab === "Map View" && (
        <div className="glass-card rounded-2xl overflow-hidden relative h-[60vh] border border-white/[0.06]">
          <div className="absolute top-4 right-4 z-[400] flex flex-col gap-2 pointer-events-none">
            <div className="bg-background/90 backdrop-blur-md px-3 py-2 rounded-xl border border-white/[0.06] text-xs font-semibold flex items-center gap-2">
               <span className="w-3 h-3 rounded-full bg-red-500" /> High
            </div>
            <div className="bg-background/90 backdrop-blur-md px-3 py-2 rounded-xl border border-white/[0.06] text-xs font-semibold flex items-center gap-2">
               <span className="w-3 h-3 rounded-full bg-amber-500" /> Medium
            </div>
          </div>
          <div ref={mapRef} className="w-full h-full z-0" />
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[400] bg-background/90 backdrop-blur-md px-4 py-2 rounded-full border border-white/[0.08] text-sm text-foreground shadow-lg">
             Click on a marker to place bid
          </div>
        </div>
      )}

      {activeTab === "My Bids" && (
        <div className="grid gap-4">
          {bidsLoading ? (
            <div className="flex items-center justify-center py-12 gap-3 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" /> Loading your bids...
            </div>
          ) : myBidsData.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">No bids submitted yet.</div>
          ) : (
            myBidsData.map((bid, i) => (
              <div key={bid._id} className="glass-card p-5 opacity-0 animate-fade-in" style={{ animationDelay: `${i * 80}ms` }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-foreground">{bid.jobTitle || bid.jobId}</h3>
                    {bid.note && <p className="text-sm text-muted-foreground">{bid.note}</p>}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      {bid.cost > 0 && <span className="text-foreground font-medium">₹{bid.cost.toLocaleString()}</span>}
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> ETA: {bid.eta}</span>
                      <span>Submitted {new Date(bid.createdAt || Date.now()).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full shrink-0 ${
                    bid.status === "ACCEPTED" ? "bg-green-500/15 text-green-400" :
                    bid.status === "REJECTED" ? "bg-red-500/15 text-red-400" :
                    "bg-yellow-500/15 text-yellow-400"
                  }`}>
                    {bid.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}


      {activeTab === "Awarded to Me" && (
        <div className="grid gap-4">
          {myJobs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No jobs awarded to you yet. Place bids on open jobs to get started.
            </div>
          ) : (
            myJobs.map((job, i) => (
              <div key={job._id} className="glass-card p-5 opacity-0 animate-fade-in" style={{ animationDelay: `${i * 80}ms` }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-foreground">{job.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2">{job.description}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location?.address || "—"}</span>
                    </div>
                  </div>
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-success/15 text-success">
                    {job.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Bid Modal */}
      <Dialog open={!!bidJob} onOpenChange={() => setBidJob(null)}>
        <DialogContent className="glass-card border-white/[0.06] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-foreground">Place Bid</DialogTitle>
            <DialogDescription>{bidJob?.title}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Proposed Amount (optional)</label>
              <Input placeholder="₹ Enter amount" value={bidAmount} onChange={(e) => setBidAmount(e.target.value)}
                className="bg-white/[0.03] border-white/[0.06]" />
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Completion Time *</label>
              <Select value={bidTime} onValueChange={setBidTime}>
                <SelectTrigger className="bg-white/[0.03] border-white/[0.06]"><SelectValue placeholder="Select timeframe" /></SelectTrigger>
                <SelectContent>
                  {["1 day", "2 days", "3 days", "5 days", "1 week", "2 weeks"].map((t) => (
                    <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Notes</label>
              <Textarea placeholder="Brief note about your experience or approach..." value={bidNote}
                onChange={(e) => setBidNote(e.target.value)} className="bg-white/[0.03] border-white/[0.06] resize-none" rows={3} />
            </div>
            <Button onClick={handleSubmitBid} disabled={submitting} className="w-full rounded-xl font-semibold hover-lift">
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Submitting...</> : "Submit Bid"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
