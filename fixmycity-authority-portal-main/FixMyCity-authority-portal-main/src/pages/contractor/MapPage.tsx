import { useEffect, useRef, useState } from "react";
import { MapPin, Loader2, AlertTriangle } from "lucide-react";
import { useJobs, type ApiJob } from "@/hooks/contractor/useJobs";
import { getMarkerColor } from "@/lib/markerColor";
import { toast } from "sonner";

const inputClass =
  "w-full bg-input border border-border rounded-xl px-4 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/10 transition-all";

export default function ContractorMapPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const { openJobs, loading, error, submitBid } = useJobs();

  // Bid modal state
  const [selectedJob, setSelectedJob] = useState<ApiJob | null>(null);
  const [bidAmount, setBidAmount] = useState("");
  const [bidTime, setBidTime] = useState("");
  const [bidNote, setBidNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmitBid = async () => {
    if (!bidTime) { toast.error("Please select a completion time"); return; }
    if (!selectedJob) return;
    setSubmitting(true);
    try {
      await submitBid(selectedJob._id, {
        eta: bidTime,
        cost: bidAmount ? parseFloat(bidAmount) : 0,
        note: bidNote,
      });
      toast.success("Bid submitted!", {
        description: `Your bid for "${selectedJob.title}" has been placed.`,
      });
      setSelectedJob(null);
      setBidAmount("");
      setBidTime("");
      setBidNote("");
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to submit bid");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!mapRef.current || loading) return;

    let isMounted = true;
    let mapInstance: any = null;

    import("leaflet").then(async (L) => {
      if (!isMounted || !mapRef.current) return;

      // Set global L for plugins
      (window as any).L = L;

      const loadCss = (href: string) => {
        if (!document.querySelector(`link[href="${href}"]`)) {
          const link = document.createElement("link");
          link.rel = "stylesheet";
          link.href = href;
          document.head.appendChild(link);
        }
      };

      loadCss("https://unpkg.com/leaflet@1.9.4/dist/leaflet.css");
      loadCss("https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.css");
      loadCss("https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.Default.css");

      const loadScript = (src: string) =>
        new Promise((res) => {
          if (document.querySelector(`script[src="${src}"]`)) return res(true);
          const script = document.createElement("script");
          script.src = src;
          script.onload = () => res(true);
          document.head.appendChild(script);
        });

      await loadScript(
        "https://unpkg.com/leaflet.markercluster@1.4.1/dist/leaflet.markercluster.js"
      );

      if (!isMounted || !mapRef.current) return;

      mapInstance = L.map(mapRef.current, { zoomControl: false }).setView(
        [18.5204, 73.8567],
        13
      );
      L.control.zoom({ position: "bottomright" }).addTo(mapInstance);

      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        { attribution: "OSM", maxZoom: 19 }
      ).addTo(mapInstance);

      const markers = (L as any).markerClusterGroup({
        chunkedLoading: true,
        iconCreateFunction: function (cluster: any) {
          const count = cluster.getChildCount();
          return L.divIcon({
            html: `<div style="background:#F59E0B;color:white;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;box-shadow:0 0 10px #F59E0B88;">${count}</div>`,
            className: "custom-cluster-icon",
            iconSize: L.point(30, 30),
          });
        },
      });

      openJobs.forEach((job) => {
        if (!job.location?.lat || !job.location?.lng) return;

        const color = getMarkerColor(job);
        const isCritical = job.severity === "HIGH" && job.status !== "COMPLETED";
        const pulseAnim = isCritical ? `animation: pulseMarker 2s infinite;` : "";

        const icon = L.divIcon({
          className: "custom-pin",
          html: `<div style="
            width: 36px; height: 36px;
            background: ${color}22;
            border: 2px solid ${color};
            border-radius: 50%;
            display: flex; align-items: center; justify-content: center;
            box-shadow: 0 0 16px ${color}66;
            ${pulseAnim}
          "><div style="width: 12px; height: 12px; background: ${color}; border-radius: 50%;"></div></div>`,
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });

        const desc = job.description
          ? job.description.slice(0, 80) + (job.description.length > 80 ? "..." : "")
          : "";
        const address = job.location?.address || "Location not specified";

        const popupNode = document.createElement("div");
        popupNode.innerHTML = `
          <div style="font-family: Inter, sans-serif; min-width: 200px; padding-bottom: 4px;">
            <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">${job.title}</div>
            <div style="font-size: 11px; color: #888; margin-bottom: 6px; line-height: 1.4;">${desc}</div>
            <div style="display: flex; gap: 6px; margin-bottom: 6px;">
              <span style="font-size: 10px; padding: 2px 8px; border-radius: 999px; background: ${color}22; color: ${color}; font-weight: 600;">${job.severity}</span>
            </div>
            <div style="font-size: 11px; color: #aaa; margin-bottom: 8px;">📍 ${address}</div>
            <button
              id="place-bid-btn-${job._id}"
              style="width:100%;padding:6px 0;background:#F59E0B;color:white;border:none;border-radius:8px;font-weight:600;font-size:12px;cursor:pointer;"
            >Place Bid</button>
          </div>
        `;

        const marker = L.marker([job.location.lat, job.location.lng], {
          icon,
          zIndexOffset: isCritical ? 1000 : 0,
        }).bindPopup(popupNode, { className: "dark-popup" });

        marker.on("popupopen", () => {
          const btn = document.getElementById(`place-bid-btn-${job._id}`);
          if (btn) {
            btn.addEventListener("click", () => {
              if (isMounted) {
                setSelectedJob(job);
                marker.closePopup();
              }
            });
          }
        });

        markers.addLayer(marker);
      });

      mapInstance.addLayer(markers);
    });

    return () => {
      isMounted = false;
      if (mapInstance) mapInstance.remove();
    };
  }, [openJobs, loading]);

  return (
    <div className="space-y-4 h-[calc(100vh-8rem)] flex flex-col">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Job Map</h1>
        <p className="text-muted-foreground mt-1">
          Discover open jobs near you and place bids directly from the map.
        </p>
      </div>

      <div className="flex-1 glass-card overflow-hidden rounded-2xl relative">
        {loading ? (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Loading map data...
          </div>
        ) : error ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="flex items-center gap-3 bg-destructive/10 border border-destructive/30 text-destructive rounded-xl px-6 py-4 text-sm font-medium">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>{error || "Failed to load map data. Please try again."}</span>
            </div>
          </div>
        ) : (
          <div ref={mapRef} className="w-full h-full" />
        )}

        <style>{`
          .dark-popup .leaflet-popup-content-wrapper {
            background: #1a1a1a;
            color: #fff;
            border: 1px solid #333;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.4);
          }
          .dark-popup .leaflet-popup-tip {
            background: #1a1a1a;
            border: 1px solid #333;
          }
          .leaflet-control-zoom a {
            background: #1a1a1a !important;
            color: #fff !important;
            border-color: #333 !important;
          }
          .leaflet-control-zoom a:hover {
            background: #2a2a2a !important;
          }
          @keyframes pulseMarker {
            0%   { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
            70%  { box-shadow: 0 0 0 15px rgba(239, 68, 68, 0); }
            100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
          }
        `}</style>
      </div>

      {/* Bid Modal */}
      {selectedJob && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm"
          onClick={() => setSelectedJob(null)}
        >
          <div
            className="w-full max-w-md bg-card border border-border rounded-2xl shadow-2xl p-8 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h3 className="text-lg font-bold text-foreground">Place Bid</h3>
              <p className="text-sm text-muted-foreground">{selectedJob.title}</p>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Proposed Amount (optional)
              </label>
              <input
                placeholder="Enter amount"
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                className={inputClass}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Completion Time *
              </label>
              <select
                value={bidTime}
                onChange={(e) => setBidTime(e.target.value)}
                className="w-full bg-input border border-border rounded-xl px-4 py-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              >
                <option value="">Select timeframe</option>
                {["1 day", "2 days", "3 days", "5 days", "1 week", "2 weeks"].map((t) => (
                  <option key={t} value={t}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Notes
              </label>
              <textarea
                placeholder="Brief note about your approach..."
                value={bidNote}
                onChange={(e) => setBidNote(e.target.value)}
                className={`${inputClass} resize-none`}
                rows={3}
              />
            </div>
            <button
              onClick={handleSubmitBid}
              disabled={submitting}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-white rounded-xl font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Bid"
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
