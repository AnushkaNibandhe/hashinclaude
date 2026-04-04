import { useState, useRef } from "react";
import { MapPin, Clock, Camera, Loader2, CheckCircle2, X, Navigation, ShieldCheck, ShieldX } from "lucide-react";
import SeverityBadge from "@/components/SeverityBadge";
import { useJobs } from "@/hooks/useJobs";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const SEV_MAP: Record<string, "low" | "medium" | "high" | "critical"> = {
  LOW: "low", MEDIUM: "medium", HIGH: "high", CRITICAL: "critical",
};

const STATUS_BADGES: Record<string, string> = {
  ASSIGNED: "bg-blue-500/15 text-blue-400 border border-blue-500/20",
  IN_PROGRESS: "bg-orange-500/15 text-orange-400 border border-orange-500/20",
  COMPLETED: "bg-green-500/15 text-green-400 border border-green-500/20",
};

/** Haversine distance in metres between two lat/lng points */
function haversineMetres(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

interface VerificationResult {
  verified: boolean;
  reasons: string[];
}

/**
 * Verifies the completion proof by checking:
 * 1. EXIF DateTimeOriginal vs captureTime  — must be within 60 seconds
 * 2. EXIF GPS (if present) vs device GPS   — must be within 150 metres
 *
 * If EXIF data is absent (common on mobile live captures before OS writes it),
 * those checks are skipped and the proof is still considered verified.
 */
async function verifyProof(
  file: File,
  captureTime: Date,
  gps: { lat: number; lng: number }
): Promise<VerificationResult> {
  const reasons: string[] = [];

  try {
    const exifr = await import("exifr");
    const exif = await exifr.parse(file, {
      tiff: true,
      exif: true,
      gps: true,
      pick: ["DateTimeOriginal", "CreateDate", "latitude", "longitude"],
    });

    // ── Timestamp check ──────────────────────────────────────────────────────
    const exifDate: Date | undefined =
      exif?.DateTimeOriginal instanceof Date
        ? exif.DateTimeOriginal
        : exif?.CreateDate instanceof Date
        ? exif.CreateDate
        : undefined;

    if (exifDate) {
      const diffSeconds = Math.abs(captureTime.getTime() - exifDate.getTime()) / 1000;
      if (diffSeconds > 60) {
        reasons.push(
          `Image timestamp is ${Math.round(diffSeconds)}s away from capture time (max 60s allowed — please take a live photo)`
        );
      }
    }
    // No EXIF timestamp → skip (mobile OS often writes EXIF after file is saved)

    // ── GPS check ────────────────────────────────────────────────────────────
    const exifLat: number | undefined = exif?.latitude;
    const exifLng: number | undefined = exif?.longitude;

    if (exifLat != null && exifLng != null) {
      const dist = haversineMetres({ lat: exifLat, lng: exifLng }, gps);
      if (dist > 150) {
        reasons.push(
          `Image GPS is ${Math.round(dist)}m from your captured location (max 150m allowed)`
        );
      }
    }
    // No EXIF GPS → skip (many phones strip GPS from camera images)
  } catch (err) {
    // EXIF parse failure is non-fatal — treat as unverifiable but don't block
    console.warn("EXIF parse failed:", err);
  }

  return { verified: reasons.length === 0, reasons };
}

export default function MyJobsPage() {
  const { myJobs, loading, updateJobStatus, uploadImage } = useJobs();
  const [completingJobId, setCompletingJobId] = useState<string | null>(null);
  const [proofImage, setProofImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageCaptureTime, setImageCaptureTime] = useState<Date | null>(null);
  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const resetModal = () => {
    setCompletingJobId(null);
    setProofImage(null);
    setPreviewUrl(null);
    setImageCaptureTime(null);
    setGpsLocation(null);
    setVerificationResult(null);
  };

  const handleAdvance = async (jobId: string, currentStatus: string) => {
    if (currentStatus === "IN_PROGRESS") {
      setCompletingJobId(jobId);
      return;
    }
    try {
      await updateJobStatus(jobId, "IN_PROGRESS");
      toast.info("Status updated: In Progress", { description: "You are now working on this job." });
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
        // Reset verification when location changes
        setVerificationResult(null);
        toast.success("Location captured!", {
          description: `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`,
        });
      },
      () => {
        setGpsLoading(false);
        toast.error("Location denied", { description: "Please allow location access and try again." });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Record the moment the image was selected — this is our capture timestamp
    setImageCaptureTime(new Date());
    setProofImage(file);
    setPreviewUrl(URL.createObjectURL(file));
    // Reset verification when image changes
    setVerificationResult(null);
  };

  const handleVerifyAndSubmit = async () => {
    if (!completingJobId || !proofImage || !gpsLocation || !imageCaptureTime) {
      toast.error("Photo and location are both required");
      return;
    }

    setVerifying(true);
    const result = await verifyProof(proofImage, imageCaptureTime, gpsLocation);
    setVerificationResult(result);
    setVerifying(false);

    if (!result.verified) {
      toast.error("Verification failed", {
        description: result.reasons[0],
        duration: 6000,
      });
      return;
    }

    // Verification passed — submit
    setSubmitting(true);
    try {
      const imageUrl = await uploadImage(proofImage);
      await updateJobStatus(completingJobId, "COMPLETED", {
        completionImage: imageUrl,
        completionLocation: gpsLocation,
        completedAt: imageCaptureTime.toISOString(),
        isVerifiedCompletion: true,
      });
      toast.success("🎉 Job Completed & Verified!", {
        description: "Proof verified. Completion submitted to the authority.",
      });
      resetModal();
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
          No active jobs. Browse open jobs to place bids.
        </div>
      ) : (
        <div className="space-y-4">
          {myJobs.map((job, i) => (
            <div key={job._id} className="glass-card p-6 space-y-4 opacity-0 animate-fade-in" style={{ animationDelay: `${i * 100}ms` }}>
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-foreground">{job.title}</h3>
                    <SeverityBadge severity={SEV_MAP[job.severity?.toUpperCase()] || "medium"} />
                    {job.isDemoJob && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 bg-amber-500/15 text-amber-400 rounded-full uppercase tracking-wider">demo</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{job.description}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {job.location?.address && (
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {job.location.address}</span>
                    )}
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(job.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2 shrink-0">
                  <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${STATUS_BADGES[job.status] || "bg-muted text-muted-foreground"}`}>
                    {job.status.replace("_", " ")}
                  </span>
                  {job.status !== "COMPLETED" && (
                    <Button onClick={() => handleAdvance(job._id, job.status)} className="rounded-xl font-semibold hover-lift text-sm">
                      {job.status === "ASSIGNED" ? "▶ Start Work" : "✓ Mark Complete"}
                    </Button>
                  )}
                </div>
              </div>

              {job.status === "COMPLETED" && (
                <div className="border-t border-white/[0.04] pt-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    {job.isVerifiedCompletion
                      ? <><ShieldCheck className="w-4 h-4 text-green-400" /><span className="text-green-400">Verified Completion</span></>
                      : <><CheckCircle2 className="w-4 h-4 text-green-400" /><span className="text-green-400">Completion Submitted</span></>
                    }
                  </div>
                  {job.completionImage && (
                    <img src={job.completionImage} alt="Completion proof" className="w-full h-32 object-cover rounded-xl" />
                  )}
                  {job.completionLocation && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground p-3 rounded-xl bg-white/[0.03] border border-white/[0.04]">
                      <Navigation className="w-3.5 h-3.5 text-primary" />
                      {job.completionLocation.lat.toFixed(5)}, {job.completionLocation.lng.toFixed(5)}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm" onClick={() => !submitting && !verifying && resetModal()}>
          <div className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-foreground">Submit Completion Proof</h3>
                <p className="text-sm text-muted-foreground mt-0.5">Photo + GPS are verified before submission</p>
              </div>
              <button onClick={() => !submitting && !verifying && resetModal()}>
                <X className="w-5 h-5 text-muted-foreground hover:text-foreground" />
              </button>
            </div>

            {/* Photo */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                Completion Photo *
              </label>
              <div
                className="border-2 border-dashed border-white/[0.08] rounded-xl p-4 text-center cursor-pointer hover:border-primary/30 transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                {previewUrl ? (
                  <div className="space-y-2">
                    <img src={previewUrl} alt="Preview" className="w-full h-32 object-cover rounded-lg" />
                    <p className="text-xs text-muted-foreground">
                      Captured at {imageCaptureTime?.toLocaleTimeString()} · Click to change
                    </p>
                  </div>
                ) : (
                  <div className="py-4">
                    <Camera className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Take or upload a completion photo</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Timestamp will be verified</p>
                  </div>
                )}
              </div>
              {/* capture="environment" opens rear camera on mobile */}
              <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageSelect} />
            </div>

            {/* GPS */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 block">
                GPS Location *
              </label>
              {gpsLocation ? (
                <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
                  <Navigation className="w-4 h-4 text-green-400 shrink-0" />
                  <div>
                    <p className="text-sm text-green-400 font-medium">Location captured ✓</p>
                    <p className="text-xs text-muted-foreground">{gpsLocation.lat.toFixed(5)}, {gpsLocation.lng.toFixed(5)}</p>
                  </div>
                  <button onClick={captureGPS} className="ml-auto text-xs text-muted-foreground hover:text-foreground">Retry</button>
                </div>
              ) : (
                <button
                  onClick={captureGPS}
                  disabled={gpsLoading}
                  className="w-full flex items-center justify-center gap-2 py-3 border border-white/[0.08] rounded-xl text-sm text-muted-foreground hover:text-foreground hover:bg-white/[0.03] transition-all disabled:opacity-60"
                >
                  {gpsLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Getting location...</> : <><Navigation className="w-4 h-4" /> Capture GPS Location</>}
                </button>
              )}
            </div>

            {/* Verification result banner */}
            {verificationResult && !verificationResult.verified && (
              <div className="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm">
                <ShieldX className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-red-400 font-semibold">Verification Failed</p>
                  {verificationResult.reasons.map((r, i) => (
                    <p key={i} className="text-xs text-muted-foreground">{r}</p>
                  ))}
                </div>
              </div>
            )}

            {verificationResult?.verified && (
              <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-sm">
                <ShieldCheck className="w-4 h-4 text-green-400 shrink-0" />
                <p className="text-green-400 font-semibold">Proof verified — submitting...</p>
              </div>
            )}

            <Button
              onClick={handleVerifyAndSubmit}
              disabled={submitting || verifying || !proofImage || !gpsLocation}
              className="w-full rounded-xl font-semibold hover-lift"
            >
              {verifying ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Verifying proof...</>
              ) : submitting ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Submitting...</>
              ) : (
                <><ShieldCheck className="w-4 h-4 mr-2" /> Verify & Submit</>
              )}
            </Button>

            {(!proofImage || !gpsLocation) && (
              <p className="text-xs text-center text-muted-foreground">
                Both photo and GPS location are required.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
