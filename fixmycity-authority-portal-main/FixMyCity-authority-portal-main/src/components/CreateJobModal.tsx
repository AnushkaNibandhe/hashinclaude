import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin, Camera, Navigation, Loader2, Zap } from "lucide-react";
import { toast } from "sonner";
import { useJobs } from "@/hooks/useJobs";

export interface CreateJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDemoCreate: (preset: number) => void;
  demoPresets: any[];
}

const CATEGORIES = ["Roads", "Drainage", "Electrical", "Power Cut", "Water", "Sanitation", "Footpath", "Parks"];

export function CreateJobModal({ isOpen, onClose, onDemoCreate, demoPresets }: CreateJobModalProps) {
  const { createJob, uploadImage } = useJobs();
  
  const [mode, setMode] = useState<"REAL" | "DEMO">("REAL");
  
  // Real Job State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Roads");
  const [severity, setSeverity] = useState<"LOW" | "MEDIUM" | "HIGH">("MEDIUM");
  const [address, setAddress] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  
  const [submitting, setSubmitting] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  
  const mapRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<any>(null);
  const mapInstanceRef = useRef<any>(null);

  // Reset form only when modal is freshly opened
  const prevOpenRef = useRef(false);
  useEffect(() => {
    if (isOpen && !prevOpenRef.current) {
      resetForm();
    }
    prevOpenRef.current = isOpen;
  }, [isOpen]);
  useEffect(() => {
    if (!isOpen || mode === "DEMO" || !mapRef.current) return;

    let isMounted = true;

    import("leaflet").then((L) => {
      if (!isMounted || mapInstanceRef.current) return;

      const existingLink = document.querySelector('link[href*="leaflet"]');
      if (!existingLink) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }

      const defaultPos: [number, number] = [18.5204, 73.8567]; // Pune

      const map = L.map(mapRef.current!).setView(defaultPos, 14);
      mapInstanceRef.current = map;

      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: "OSM",
        maxZoom: 19,
      }).addTo(map);

      const icon = L.divIcon({
        className: "custom-pin",
        html: `<div style="width:24px;height:24px;background:#EAB30822;border:2px solid #EAB308;border-radius:50%;display:flex;align-items:center;justify-content:center;"><div style="width:6px;height:6px;background:#EAB308;border-radius:50%;"></div></div>`,
      });

      markerRef.current = L.marker(defaultPos, { icon, draggable: true }).addTo(map);

      markerRef.current.on('dragend', (e: any) => {
        const latlng = e.target.getLatLng();
        setCoords({ lat: latlng.lat, lng: latlng.lng });
        fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latlng.lat}&lon=${latlng.lng}&format=json`)
          .then(r => r.json()).then(d => setAddress(d.display_name || "")).catch(() => {});
      });

      map.on('click', (e: any) => {
        const { lat, lng } = e.latlng;
        setCoords({ lat, lng });
        markerRef.current?.setLatLng([lat, lng]);
        fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`)
          .then(r => r.json()).then(d => setAddress(d.display_name || "")).catch(() => {});
      });

      setTimeout(() => map.invalidateSize(), 100);
    });

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, [isOpen, mode]);

  // Pan map & move marker when coords change (e.g. after GPS capture)
  useEffect(() => {
    if (!mapInstanceRef.current || !markerRef.current || !coords) return;
    markerRef.current.setLatLng([coords.lat, coords.lng]);
    mapInstanceRef.current.setView([coords.lat, coords.lng], 16);
  }, [coords]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImage(file);
    setPreview(URL.createObjectURL(file));
  };

  const captureGPS = () => {
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCoords({ lat, lng });

        // Reverse geocode to get a human-readable address
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
          );
          const data = await res.json();
          const addr = data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
          setAddress(addr);
        } catch {
          setAddress(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        }

        setGpsLoading(false);
        toast.success("Location captured!");
      },
      (err) => {
        setGpsLoading(false);
        toast.error("Location denied — please pick on map manually.");
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description || !coords) {
      toast.error("Please fill title, description, and select a location.");
      return;
    }

    setSubmitting(true);
    try {
      let imageUrl = undefined;
      if (image) {
        imageUrl = await uploadImage(image);
      }

      await createJob({
        title,
        description,
        category,
        severity,
        location: { lat: coords.lat, lng: coords.lng, address: address || `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}` },
        imageUrl
      });

      toast.success("Job created successfully!");
      resetForm();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || "Failed to create job");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setCategory("Roads");
    setSeverity("MEDIUM");
    setAddress("");
    setCoords(null);
    setImage(null);
    setPreview(null);
    setMode("REAL");
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex flex-col sm:items-center justify-center sm:p-4">
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={!submitting ? onClose : undefined} />
            
          <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full h-full sm:h-auto sm:max-h-[90vh] max-w-3xl glass-card flex flex-col shadow-2xl rounded-none sm:rounded-2xl z-50 overflow-hidden">
            
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/[0.06] shrink-0">
              <div>
                <h3 className="font-bold text-lg text-foreground flex items-center gap-2">
                  {mode === "REAL" ? <><MapPin className="w-5 h-5 text-primary" /> Create Civic Job</> : <><Zap className="w-5 h-5 text-amber-500" /> Create Demo Job</>}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">Publish a civic issue for contractors to resolve.</p>
              </div>
              <button disabled={submitting} onClick={handleClose} className="w-8 h-8 rounded-lg hover:bg-muted/50 flex items-center justify-center">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* Content -> scrollable */}
            <div className="p-5 overflow-y-auto flex-1 custom-scrollbar">
              
              {/* Toggle Mode */}
              <div className="flex bg-white/[0.03] p-1 rounded-xl mb-6 w-fit mx-auto border border-white/[0.06]">
                <button onClick={() => setMode("REAL")} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${mode === "REAL" ? "bg-primary text-primary-foreground shadow-md" : "text-muted-foreground"}`}>Real Job</button>
                <button onClick={() => setMode("DEMO")} className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-1.5 ${mode === "DEMO" ? "bg-amber-500 text-white shadow-md" : "text-muted-foreground"}`}>
                  <Zap className="w-3.5 h-3.5" /> Demo
                </button>
              </div>

              {mode === "REAL" ? (
                <form id="jobForm" onSubmit={handleSubmit} className="space-y-6">
                  
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground uppercase">Job Title</label>
                      <input required value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Massive Pothole on FC Road"
                        className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary/50" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground uppercase">Category</label>
                      <select value={category} onChange={e => setCategory(e.target.value)}
                        className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary/50 text-foreground">
                        {CATEGORIES.map(c => <option key={c} value={c} className="bg-background text-foreground">{c}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Description</label>
                    <textarea required value={description} onChange={e => setDescription(e.target.value)} rows={3} placeholder="Provide details about the issue..."
                      className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm outline-none focus:border-primary/50 resize-none" />
                  </div>

                  {/* Severity */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-muted-foreground uppercase">Severity</label>
                    <div className="flex gap-3">
                      {(["LOW", "MEDIUM", "HIGH"] as const).map(s => (
                        <button type="button" key={s} onClick={() => setSeverity(s)}
                          className={`flex-1 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                            severity === s 
                              ? s === "HIGH" ? "bg-red-500/20 border-red-500 text-red-500"
                              : s === "MEDIUM" ? "bg-yellow-500/20 border-yellow-500 text-yellow-500"
                              : "bg-green-500/20 border-green-500 text-green-500"
                              : "bg-transparent border-white/[0.08] text-muted-foreground hover:bg-white/[0.02]"
                          }`}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Image & Map Row */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Image */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-muted-foreground uppercase">Cover Image</label>
                      <div className="h-48 border-2 border-dashed border-white/[0.08] rounded-xl overflow-hidden cursor-pointer hover:border-primary/40 transition-colors flex flex-col items-center justify-center relative group bg-white/[0.01]"
                        onClick={() => fileRef.current?.click()}>
                        {preview ? (
                          <>
                            <img src={preview} className="absolute inset-0 w-full h-full object-cover" alt="Preview" />
                            <div className="absolute inset-0 bg-background/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity">
                              <Camera className="w-6 h-6 text-white mb-1" />
                              <span className="text-xs font-medium text-white shadow-sm">Change Image</span>
                            </div>
                          </>
                        ) : (
                          <>
                            <Camera className="w-8 h-8 flex-shrink-0 text-muted-foreground mb-3" />
                            <span className="text-sm text-muted-foreground font-medium">Click to upload photo</span>
                            <span className="text-xs text-muted-foreground/60 mt-1">PNG, JPG, WEPB up to 5MB</span>
                          </>
                        )}
                        <input type="file" ref={fileRef} onChange={handleImageSelect} accept="image/*" className="hidden" />
                      </div>
                    </div>

                    {/* Location */}
                    <div className="space-y-2 flex flex-col h-full">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-muted-foreground uppercase">Location *</label>
                        <button type="button" onClick={captureGPS} disabled={gpsLoading} className="text-xs text-primary flex items-center gap-1 hover:underline">
                          {gpsLoading ? <Loader2 className="w-3 h-3 animate-spin"/> : <Navigation className="w-3 h-3" />} Get GPS
                        </button>
                      </div>
                      <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Type Address / Landmark"
                        className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-2 text-sm outline-none focus:border-primary/50 mb-2" />
                      
                      {/* Leaflet minimap */}
                      <div className="flex-1 min-h-[140px] border border-white/[0.08] rounded-xl overflow-hidden relative">
                         <div ref={mapRef} className="absolute inset-0 z-0 bg-muted/20" />
                         <div className="pointer-events-none absolute bottom-2 left-2 right-2 flex justify-center z-[400] drop-shadow-md">
                           <div className="bg-background/90 backdrop-blur-md px-3 py-1 rounded-full text-[10px] text-foreground font-medium border border-white/10">
                              {coords ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}` : "Click map to set pin"}
                           </div>
                         </div>
                      </div>
                    </div>
                  </div>

                </form>
              ) : (
                <div className="space-y-3 pb-8">
                  {demoPresets.map((p) => (
                    <motion.button key={p.index} whileHover={{ x: 4 }}
                      onClick={() => onDemoCreate(p.index)}
                      className="w-full text-left p-4 rounded-xl bg-muted/30 hover:bg-muted/60 border border-white/[0.04] hover:border-white/10 transition-all flex items-center justify-between group">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{p.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{p.address} · {p.category}</p>
                      </div>
                      <div className="flex items-center gap-2 ml-3 shrink-0">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${p.severity === "HIGH" ? "bg-red-400/10 text-red-500" : p.severity === "MEDIUM" ? "bg-yellow-400/10 text-yellow-500" : "bg-green-400/10 text-green-500"}`}>{p.severity}</span>
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}

            </div>

            {/* Footer */}
            {mode === "REAL" && (
              <div className="p-5 border-t border-white/[0.06] bg-background shrink-0 flex gap-3">
                 <button type="button" onClick={() => { resetForm(); onClose(); }} disabled={submitting}
                   className="flex-1 py-3 border border-white/10 rounded-xl text-sm font-semibold hover:bg-white/[0.02]">
                   Cancel
                 </button>
                 <button type="submit" form="jobForm" disabled={submitting}
                   className="flex-[2] py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 disabled:opacity-70 flex items-center justify-center">
                   {submitting ? <><Loader2 className="w-4 h-4 animate-spin mr-2"/> Publishing...</> : "Publish Job"}
                 </button>
              </div>
            )}
            
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
