import { DashboardLayout } from "@/components/DashboardLayout";
import { useComplaints } from "@/hooks/useComplaints";
import { useJobs } from "@/hooks/useJobs";
import { SEVERITY_COLORS, getMarkerColor } from "@/lib/markerColor";
import { MapPin, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

const statusColors: Record<string, string> = {
  RECEIVED: "#3B82F6",
  JOB_CREATED: "#3B82F6",
  IN_PROGRESS: "#F59E0B",
  COMPLETED: "#10B981",
};

export default function MapDashboard() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const { complaints, loading: complaintsLoading, error: complaintsError } = useComplaints();
  const { jobs, loading: jobsLoading, error: jobsError } = useJobs();

  const loading = complaintsLoading || jobsLoading;
  const hasError = jobsError !== null || complaintsError !== null;

  useEffect(() => {
    if (!mapRef.current || loading) return;

    let mapInstance: any = null;

    import("leaflet").then(async (L) => {
      // Setup global L for plugins
      (window as any).L = L;

      const loadCss = (href: string) => {
        if (!document.querySelector(`link[href="${href}"]`)) {
          const l = document.createElement("link");
          l.rel = "stylesheet", l.href = href;
          document.head.appendChild(l);
        }
      };
      
      loadCss("https://unpkg.com/leaflet@1.9.4/dist/leaflet.css");
      loadCss("https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.css");
      loadCss("https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.Default.css");

      const loadScript = (src: string) => new Promise((res) => {
        if (document.querySelector(`script[src="${src}"]`)) return res(true);
        const script = document.createElement("script");
        script.src = src;
        script.onload = () => res(true);
        document.head.appendChild(script);
      });

      await loadScript("https://unpkg.com/leaflet.markercluster@1.4.1/dist/leaflet.markercluster.js");

      // Clean up previous map if exists
      if (mapInstance) return;

      mapInstance = L.map(mapRef.current!, { zoomControl: false }).setView([18.5204, 73.8567], 13);
      L.control.zoom({ position: "bottomright" }).addTo(mapInstance);

      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: "OSM", maxZoom: 19,
      }).addTo(mapInstance);

      // Plugin attaches to window.L, not the ES module import
      const LG = (window as any).L;

      // We'll use marker clustering
      const markers = LG.markerClusterGroup({
        chunkedLoading: true,
        iconCreateFunction: function(cluster: any) {
          const count = cluster.getChildCount();
          return L.divIcon({
            html: `<div style="background:#3B82F6;color:white;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;box-shadow:0 0 10px #3B82F688;">${count}</div>`,
            className: "custom-cluster-icon",
            iconSize: L.point(30, 30)
          });
        }
      });

      // 1. Plot complaints (small dots)
      complaints.forEach((c) => {
        if (!c.location?.lat || !c.location?.lng) return;
        
        // Skip complaints that have already been converted to jobs to avoid duplicates
        const hasJob = jobs.some(j => j.complaintId?._id === c._id);
        if (hasJob) return;

        const color = getMarkerColor(c);
        const icon = L.divIcon({
          className: "custom-pin",
          html: `<div style="width:16px;height:16px;background:${color}22;border:1px solid ${color};border-radius:50%;display:flex;align-items:center;justify-content:center;"><div style="width:6px;height:6px;background:${color};border-radius:50%;"></div></div>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        });

        const marker = L.marker([c.location.lat, c.location.lng], { icon })
          .bindPopup(`
            <div style="font-family: Inter, sans-serif; min-width: 180px;">
              <div style="font-weight: 600; font-size: 13px; margin-bottom: 4px;">Citizen Complaint</div>
              <div style="font-size: 11px; color: #aaa; margin-bottom: 6px;">${c.description || ""}</div>
            </div>
          `, { className: "dark-popup" });
        markers.addLayer(marker);
      });

      // 2. Plot Jobs (large pins with styling)
      jobs.forEach((j) => {
        if (!j.location?.lat || !j.location?.lng) return;
        const complete = j.status === "COMPLETED";
        const color = getMarkerColor(j);
        
        // Pulsing animation for HIGH severity open jobs
        const isCritical = j.severity === "HIGH" && !complete;
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

        const imgHtml = j.imageUrl || j.complaintId?.imageUrl 
          ? `<img src="${j.imageUrl || j.complaintId?.imageUrl}" style="width:100%;height:100px;object-fit:cover;border-radius:8px;margin-bottom:8px;"/>`
          : "";

        const marker = L.marker([j.location.lat, j.location.lng], { icon, zIndexOffset: isCritical ? 1000 : 0 })
          .bindPopup(`
            <div style="font-family: Inter, sans-serif; min-width: 200px; padding-bottom:4px;">
              ${imgHtml}
              <div style="font-weight: 600; font-size: 14px; margin-bottom: 4px;">${j.title}</div>
              <div style="font-size: 11px; color: #888; margin-bottom: 6px; line-height: 1.4;">${j.description?.slice(0,80) || ""}...</div>
              <div style="display: flex; gap: 6px; margin-bottom:4px;">
                <span style="font-size: 10px; padding: 2px 8px; border-radius: 999px; background: ${color}22; color: ${color}; font-weight: 600;">${j.severity}</span>
                <span style="font-size: 10px; padding: 2px 8px; border-radius: 999px; background: ${statusColors[j.status] ?? color}22; color: ${statusColors[j.status] ?? color}; font-weight: 600;">${j.status.replace("_", " ")}</span>
              </div>
            </div>
          `, { className: "dark-popup" });
        markers.addLayer(marker);

        // 3. Plot completion lines & markers
        if (complete && j.completionLocation?.lat) {
          const compIcon = L.divIcon({
            className: "custom-pin-completion",
            html: `<div style="width:28px;height:28px;background:#10B98122;border:2px solid #10B981;border-radius:8px;display:flex;align-items:center;justify-content:center;box-shadow:0 0 12px #10B98155;font-size:12px;">✅</div>`,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          });

          const compHtml = j.completionImage ? `<img src="${j.completionImage}" style="width:100%; height:80px; object-fit:cover; border-radius:8px; margin-top:4px;" />` : "";
          
          const compMarker = L.marker([j.completionLocation.lat, j.completionLocation.lng], { icon: compIcon })
            .bindPopup(`
              <div style="font-family: Inter, sans-serif; min-width: 180px;">
                <div style="font-weight: 600; font-size: 13px; margin-bottom: 2px;">Resolution Proof</div>
                <div style="font-size: 11px; color: #10B981; margin-bottom: 6px;">COMPLETED</div>
                ${compHtml}
              </div>
            `, { className: "dark-popup" });
          markers.addLayer(compMarker);

          // Draw dashed line connecting issue and completion
          const line = L.polyline(
            [[j.location.lat, j.location.lng], [j.completionLocation.lat, j.completionLocation.lng]], 
            { color: '#10B981', weight: 2, dashArray: '5, 8', opacity: 0.6 }
          );
          mapInstance.addLayer(line);
        }
      });

      mapInstance.addLayer(markers);
      setMapLoaded(true);
    });

    return () => {
      if (mapInstance) mapInstance.remove();
    };
  }, [complaints, jobs]);

  const criticalCount = complaints.filter(c => c.severity === "HIGH" && c.status !== "COMPLETED").length;
  const mediumCount = complaints.filter(c => c.severity === "MEDIUM" && c.status !== "COMPLETED").length;
  const resolvedCount = complaints.filter(c => c.status === "COMPLETED").length;
  const completedJobsWithProof = jobs.filter(j => j.completionLocation?.lat).length;

  return (
    <DashboardLayout title="Map Dashboard">
      <div className="max-w-7xl mx-auto h-[calc(100vh-8rem)] flex flex-col gap-4">
        {/* Legend overlay */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-wrap gap-3"
        >
          <div className="glass-card px-4 py-2.5 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" style={{ color: "#EF4444" }} />
            <span className="text-sm text-foreground font-medium">{criticalCount} Critical</span>
          </div>
          <div className="glass-card px-4 py-2.5 flex items-center gap-2">
            <Clock className="w-4 h-4" style={{ color: "#F59E0B" }} />
            <span className="text-sm text-foreground font-medium">{mediumCount} Medium</span>
          </div>
          <div className="glass-card px-4 py-2.5 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" style={{ color: "#10B981" }} />
            <span className="text-sm text-foreground font-medium">{resolvedCount} Resolved</span>
          </div>
          {completedJobsWithProof > 0 && (
            <div className="glass-card px-4 py-2.5 flex items-center gap-2">
              <MapPin className="w-4 h-4" style={{ color: "#10B981" }} />
              <span className="text-sm text-foreground font-medium">{completedJobsWithProof} Verified Completions</span>
            </div>
          )}
          <div className="glass-card px-4 py-2.5 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">📍 Complaint  ✅ Completion</span>
          </div>
          {/* Severity color legend */}
          <div className="glass-card px-4 py-2.5 flex items-center gap-3">
            <span className="text-xs text-muted-foreground font-medium mr-1">Severity:</span>
            {[
              { label: "HIGH", color: SEVERITY_COLORS.HIGH },
              { label: "MEDIUM", color: SEVERITY_COLORS.MEDIUM },
              { label: "LOW", color: SEVERITY_COLORS.LOW },
            ].map(({ label, color }) => (
              <span key={label} className="flex items-center gap-1.5">
                <span
                  data-testid={`severity-swatch-${label}`}
                  style={{ background: color, width: 10, height: 10, borderRadius: "50%", display: "inline-block" }}
                />
                <span className="text-xs text-foreground">{label}</span>
              </span>
            ))}
          </div>
        </motion.div>

        {/* Map */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex-1 glass-card overflow-hidden rounded-2xl relative"
        >
          {loading ? (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
              <MapPin className="w-5 h-5 mr-2 animate-pulse" />
              Loading map data...
            </div>
          ) : hasError ? (
            <div className="w-full h-full flex items-center justify-center">
              <div className="flex items-center gap-3 bg-destructive/10 border border-destructive/30 text-destructive rounded-xl px-6 py-4 text-sm font-medium">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <span>
                  {jobsError ?? complaintsError ?? "Failed to load map data. Please try again."}
                </span>
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
              0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
              70% { box-shadow: 0 0 0 15px rgba(239, 68, 68, 0); }
              100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
            }
          `}</style>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
