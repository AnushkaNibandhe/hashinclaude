import { useState, useRef } from "react";
import { useJobs } from "@/hooks/contractor/useJobs";
import { MapPin, Clock, Camera, Loader2, CheckCircle2, X, Navigation } from "lucide-react";
import SeverityBadge from "@/components/contractor/SeverityBadge";
import { toast } from "sonner";

const SEV_MAP: Record<string, "low" | "medium" | "high" | "critical"> = {
  LOW: "low", MEDIUM: "medium", HIGH: "high", CRITICAL: "critical",
};

const STATUS_BADGES: Record<string, string> = {
  ASSIGNED: "bg-blue-500/15 text-blue-400 border border-blue-500/20",
  IN_PROGRESS: "bg-orange-500/15 text-orange-400 border border-orange-500/20",
  COMPLETED: "bg-green-500/15 text-green-400 border border-green-500/20",
};

export default function ContractorMyJobs() {
  const { myJobs, loading, updateJobStatus, uploadImage } = useJobs();
  const [completingJobId, setCompletingJobId] = useState<string | null>(null);
  const [proofImage, setProofImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleStartWork = async (jobId: string) => {
    try {
      await updateJobStatus(jobId, "IN_PROGRESS");
      toast.success("Status updated: IN PROGRESS", {
        description: "You are now en route / working on this job.",
      });
    } catch {
      toast.error("Failed to update status");
    }
  };

  const captureGPS = () => {
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsLoading(false);
        toast.success("Location captured!", { description: `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}` });
      },
      (err) => {
        setGpsLoading(false);
        toast.error("Location denied", { description: "Please allow location access and try again." });
        console.error("GPS error:", err);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setProofImage(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSubmitCompletion = async () => {
    if (!completingJobId) return;
    if (!proofImage) { toast.error("Please upload a completion photo"); return; }
    if (!gpsLocation) { toast.error("Please capture your GPS location"); return; }

    setSubmitting(true);
    try {
      // 1. Upload image
      const imageUrl = await uploadImage(proofImage);

      // 2. Update job status with proof
      await updateJobStatus(completingJobId, "COMPLETED", {
        completionImage: imageUrl,
        completionLocation: gpsLocation,
        completedAt: new Date().toISOString(),
        isVerifiedCompletion: true,
      });

      toast.success("🎉 Job marked as Completed!", {
        description: "Completion proof submitted. The authority will verify.",
      });

      // Reset
      setCompletingJobId(null);
      setProofImage(null);
      setPreviewUrl(null);
      setGpsLocation(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to submit completion");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
      <Loader2 className="w-5 h-5 animate-spin" /> Loading your jobs...
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">My Jobs</h1>
        <p className="text-muted-foreground mt-1">Track and update your awarded jobs.</p>
      </div>

      {myJobs.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          No active jobs. Browse open jobs and place bids to get started.
        </div>
      ) : (
        <div className="grid gap-4">
          {myJobs.map((job, i) => (
            <div key={job._id} className="glass-card p-6 space-y-4 opacity-0 animate-fade-in" style={{ animationDelay: `${i * 80}ms` }}>
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-foreground">{job.title}</h3>
                    <SeverityBadge severity={SEV_MAP[job.severity?.toUpperCase()] || "medium"} />
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{job.description}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {job.location?.address && (
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {job.location.address}</span>
                    )}
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(job.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-3">
                  <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${STATUS_BADGES[job.status] || "bg-muted text-muted-foreground"}`}>
                    {job.status.replace("_", " ")}
                  </span>
                  {job.status !== "COMPLETED" && (
                    <div className="flex flex-col gap-2 items-end">
                      {job.status === "ASSIGNED" && (
                        <button
                          onClick={() => handleStartWork(job._id)}
                          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-sm font-semibold transition-all flex items-center gap-2"
                        >
                          ▶ Start Work
                        </button>
                      )}
                      <button
                        onClick={() => setCompletingJobId(job._id)}
                        className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-white rounded-xl text-sm font-semibold transition-all flex items-center gap-2"
                      >
                        ✓ Complete Job
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Completion proof (if completed) */}
              {job.status === "COMPLETED" && (
                <div className="border-t border-border/30 pt-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm text-green-400 font-medium">
                    <CheckCircle2 className="w-4 h-4" /> Completion Proof Submitted
                  </div>
                  {job.completionImage && (
                    <img src={job.completionImage} alt="Completion" className="w-full h-32 object-cover rounded-xl" />
                  )}
                  {job.completionLocation && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground p-2.5 bg-muted/30 rounded-lg">
                      <Navigation className="w-3.5 h-3.5 text-primary" />
                      Location: {job.completionLocation.lat.toFixed(5)}, {job.completionLocation.lng.toFixed(5)}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Completion Proof Modal */}
      {completingJobId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => !submitting && setCompletingJobId(null)}>
          <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-foreground">Submit Completion Proof</h3>
                <p className="text-sm text-muted-foreground mt-0.5">Upload photo & capture location</p>
              </div>
              <button onClick={() => setCompletingJobId(null)} disabled={submitting}>
                <X className="w-5 h-5 text-muted-foreground hover:text-foreground" />
              </button>
            </div>

            {/* Image upload */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                Completion Photo *
              </label>
              <div
                className="border-2 border-dashed border-border rounded-xl p-4 text-center cursor-pointer hover:border-amber-500/50 transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                {previewUrl ? (
                  <div className="space-y-2">
                    <img src={previewUrl} alt="Preview" className="w-full h-32 object-cover rounded-lg" />
                    <p className="text-xs text-muted-foreground">Click to change photo</p>
                  </div>
                ) : (
                  <div className="py-4">
                    <Camera className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Click to upload completion photo</p>
                    <p className="text-xs text-muted-foreground mt-1">JPG, PNG supported</p>
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
            </div>

            {/* GPS capture */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                Location Proof *
              </label>
              {gpsLocation ? (
                <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
                  <Navigation className="w-4 h-4 text-green-400 shrink-0" />
                  <div className="text-sm">
                    <span className="text-green-400 font-medium">Location captured ✓</span>
                    <p className="text-xs text-muted-foreground">{gpsLocation.lat.toFixed(5)}, {gpsLocation.lng.toFixed(5)}</p>
                  </div>
                  <button onClick={captureGPS} className="ml-auto text-xs text-muted-foreground hover:text-foreground">Retry</button>
                </div>
              ) : (
                <button
                  onClick={captureGPS}
                  disabled={gpsLoading}
                  className="w-full flex items-center justify-center gap-2 py-3 border border-border rounded-xl text-sm font-medium hover:bg-muted/30 transition-colors disabled:opacity-60"
                >
                  {gpsLoading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Getting location...</>
                  ) : (
                    <><Navigation className="w-4 h-4" /> Capture GPS Location</>
                  )}
                </button>
              )}
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmitCompletion}
              disabled={submitting || !proofImage || !gpsLocation}
              className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</>
              ) : (
                <><CheckCircle2 className="w-4 h-4" /> Submit & Mark Completed</>
              )}
            </button>

            {(!proofImage || !gpsLocation) && (
              <p className="text-xs text-center text-muted-foreground">
                Both photo and location are required to complete the job.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
