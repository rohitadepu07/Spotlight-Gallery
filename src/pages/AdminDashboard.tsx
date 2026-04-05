import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, Image as ImageIcon, Users, QrCode,
  RefreshCw, TrendingUp, Calendar, Zap,
  ArrowUpRight, Plus, Scan, User, X,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Event, Photo, UserProfile } from "@/types";
import ProfileView from "@/components/ProfileView";
import { toast } from "sonner";

interface AdminDashboardProps {
  onLogout: () => void;
  userProfile: UserProfile | null;
}
type UploadState = "idle" | "uploading" | "scanning" | "done";

export default function AdminDashboard({ onLogout, userProfile }: AdminDashboardProps) {
  const [activeView, setActiveView] = useState<"home" | "events" | "upload" | "photos" | "settings" | "profile">("home");
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [uploadedCount, setUploadedCount] = useState(0);
  const [facesDetected, setFacesDetected] = useState(0);
  const [selectedUploadEventId, setSelectedUploadEventId] = useState("");
  const [selectedEventPhotos, setSelectedEventPhotos] = useState<Photo[]>([]);
  const [isPhotosLoading, setIsPhotosLoading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [isEventsLoading, setIsEventsLoading] = useState(false);
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [visibilityLoadingEventId, setVisibilityLoadingEventId] = useState<string | null>(null);
  const [shareLoadingEventId, setShareLoadingEventId] = useState<string | null>(null);

  const [newEvent, setNewEvent] = useState({
    name: "",
    description: "",
    date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    isPublic: true,
    coverUrl: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&q=80"
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (!selectedUploadEventId) {
      setSelectedEventPhotos([]);
      return;
    }
    void fetchSelectedEventPhotos(selectedUploadEventId);
  }, [selectedUploadEventId]);

  const fetchEvents = async () => {
    setIsEventsLoading(true);
    try {
      const data = await api.getEvents({ includePrivate: true });
      setEvents(data);
      setSelectedUploadEventId((prev) => {
        if (prev && data.some((event) => event.id === prev)) return prev;
        return data[0]?.id ?? "";
      });
    } catch (error) {
      toast.error("Failed to load events");
    } finally {
      setIsEventsLoading(false);
    }
  };

  const fetchSelectedEventPhotos = async (eventId: string) => {
    setIsPhotosLoading(true);
    try {
      const photos = await api.getEventPhotos(eventId);
      setSelectedEventPhotos(photos);
    } catch (error) {
      toast.error("Failed to load uploaded photos for this event.");
      setSelectedEventPhotos([]);
    } finally {
      setIsPhotosLoading(false);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedName = newEvent.name.trim();
    const normalizedDate = newEvent.date.trim();
    const normalizedCoverUrl = newEvent.coverUrl.trim();

    if (!normalizedName) {
      toast.error("Event name is required.");
      return;
    }
    if (!normalizedDate) {
      toast.error("Event date is required.");
      return;
    }
    if (Number.isNaN(new Date(normalizedDate).getTime())) {
      toast.error("Please enter a valid event date.");
      return;
    }
    if (!normalizedCoverUrl) {
      toast.error("Cover image URL is required.");
      return;
    }
    try {
      new URL(normalizedCoverUrl);
    } catch {
      toast.error("Please enter a valid cover image URL.");
      return;
    }

    setIsCreatingEvent(true);
    try {
      const qrCode = `EVT-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const created = await api.createEvent({
        ...newEvent,
        name: normalizedName,
        date: normalizedDate,
        coverUrl: normalizedCoverUrl,
        qrCode,
      });
      toast.success("Event created successfully!");
      setIsCreateModalOpen(false);
      setNewEvent({
        name: "",
        description: "",
        date: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
        isPublic: true,
        coverUrl: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&q=80",
      });
      await fetchEvents();
      setSelectedUploadEventId(created.id);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        toast.error("Event name already exists. Please use a different name.");
      } else if (error instanceof ApiError && error.status === 400) {
        toast.error(error.message || "Invalid event data.");
      } else {
        toast.error("Failed to create event");
      }
    } finally {
      setIsCreatingEvent(false);
    }
  };

  const uploadFiles = async (inputFiles: File[] | FileList) => {
    const files = Array.isArray(inputFiles) ? inputFiles : Array.from(inputFiles);
    if (files.length === 0) return;
    const nonImage = files.find((file) => !file.type.startsWith("image/"));
    if (nonImage) {
      toast.error("Only image files are allowed for upload.");
      return;
    }
    if (events.length === 0) {
      toast.error("Create an event first, then upload images.");
      setIsCreateModalOpen(true);
      return;
    }
    if (!selectedUploadEventId) {
      toast.error("Create or select an event before uploading.");
      return;
    }

    setUploadedCount(files.length);
    setFacesDetected(0);
    setUploadState("uploading");
    setUploadProgress(0);

    const uploadTicker = window.setInterval(() => {
      setUploadProgress((prev) => Math.min(prev + 4, 72));
    }, 140);

    try {
      const summary = await api.uploadEventPhotos(selectedUploadEventId, files);
      window.clearInterval(uploadTicker);
      setUploadState("scanning");
      setUploadProgress(78);

      for (let i = 78; i <= 96; i += 3) {
        // Small UX step while backend result is being shown as finalized scan.
        await new Promise((resolve) => setTimeout(resolve, 45));
        setUploadProgress(i);
      }

      setUploadedCount(summary.uploaded);
      setFacesDetected(summary.facesDetected);
      setUploadProgress(100);
      setUploadState("done");
      await fetchEvents();
      await fetchSelectedEventPhotos(selectedUploadEventId);
      toast.success(`Uploaded ${summary.uploaded} photos.`);
    } catch (error) {
      window.clearInterval(uploadTicker);
      setUploadState("idle");
      setUploadProgress(0);
      toast.error("Upload failed. Please retry.");
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    await uploadFiles(e.dataTransfer.files);
  };

  const toggleVisibility = async (id: string) => {
    setVisibilityLoadingEventId(id);
    try {
      const updated = await api.toggleEventVisibility(id);
      setEvents((prev) => prev.map((e) => (e.id === id ? updated : e)));
      toast.success(`Event is now ${updated.isPublic ? "public" : "private"}`);
    } catch (error) {
      toast.error("Failed to update event visibility");
    } finally {
      setVisibilityLoadingEventId(null);
    }
  };

  const handleCopyEventCode = async (event: Event) => {
    try {
      await navigator.clipboard.writeText(event.qrCode);
      toast.success("Event code copied!");
    } catch (error) {
      toast.error("Could not copy event code.");
    }
  };

  const handleShareJoinLink = async (event: Event) => {
    setShareLoadingEventId(event.id);
    try {
      let joinUrl = `${window.location.origin}/?event=${encodeURIComponent(event.qrCode)}`;
      try {
        const link = await api.getEventJoinLink(event.id);
        if (link.joinUrl?.trim()) {
          joinUrl = link.joinUrl.trim();
        }
      } catch {
        // Fallback to local URL construction when API link generation fails.
      }

      const popup = window.open(joinUrl, "_blank", "noopener,noreferrer");
      if (!popup) {
        toast.error("Popup blocked. Allow popups to open join links.");
      }

      try {
        await navigator.clipboard.writeText(joinUrl);
        toast.success("Join link opened and copied.");
      } catch {
        toast.success("Join link opened.");
      }
    } catch (error) {
      toast.error("Failed to generate join link.");
    } finally {
      setShareLoadingEventId(null);
    }
  };

  const handleOpenEventPhotos = (event: Event) => {
    setSelectedUploadEventId(event.id);
    setActiveView("photos");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* â”€â”€ Profile overlay â”€â”€ */}
      <AnimatePresence>
        {activeView === "profile" && (
          <motion.div
            key="profile-overlay"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 32 }}
            className="fixed inset-0 z-50 overflow-auto bg-background"
          >
            <ProfileView onBack={() => setActiveView("home")} onLogout={onLogout} role="admin" initialProfile={userProfile} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top bar */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b-[3px] border-black px-5 h-24 flex items-center gap-4 shadow-sm rounded-b-[32px]">
        <div className="w-14 h-14 border-[3px] border-black bg-primary flex items-center justify-center shadow-[4px_4px_0px_0px_#000] rounded-full">
          <Zap size={28} className="text-white" />
        </div>
        <span className="font-black text-lg tracking-tighter uppercase italic">Spotlight</span>
        <span className="text-[10px] font-black text-black border-2 border-black px-2 py-0.5 uppercase tracking-widest bg-gray-100 shadow-[2px_2px_0px_0px_#000]">Admin</span>
        <div className="flex-1" />
        <nav className="hidden sm:flex items-center gap-3">
          {([["home", "Overview"], ["events", "Events"], ["upload", "Upload"], ["photos", "Photos"], ["settings", "Settings"]] as const).map(([key, label]) => (
            <button key={key} onClick={() => setActiveView(key)}
              className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 border-2 border-black transition-all ${
                activeView === key ? "bg-primary text-white shadow-[3px_3px_0px_0px_#000] translate-x-[-1px] translate-y-[-1px]" : "bg-white text-black hover:bg-gray-100"
              }`}>
              {label}
            </button>
          ))}
        </nav>
        <button
          onClick={() => setActiveView("profile")}
          className={`w-14 h-14 border-[3px] border-black bg-white flex items-center justify-center text-black shadow-[4px_4px_0px_0px_#000] hover:bg-gray-50 transition-all rounded-full ${
            activeView === "profile" ? "bg-primary text-white shadow-[3px_3px_0px_0px_#000]" : "bg-white text-black hover:bg-gray-100"
          }`}
        >
          <User size={28} />
        </button>
      </header>

      <main className="p-4 md:p-6 max-w-7xl mx-auto">
        <AnimatePresence mode="wait">

          {/* â”€â”€ HOME BENTO GRID â”€â”€ */}
          {activeView === "home" && (
            <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>

              {/* Bento grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 auto-rows-auto">

                {/* â”€â”€ Hero greeting card â”€â”€ */}
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}
                  className="col-span-2 md:col-span-4 lg:col-span-4 border-[3px] border-black bg-white p-8 relative overflow-hidden min-h-[180px] flex flex-col justify-between shadow-[10px_10px_0px_0px_#000] -rotate-1">
                  <div className="absolute inset-0 grid-bg opacity-20" />
                  <div className="relative z-10">
                    <div className="text-[10px] text-primary font-black uppercase tracking-[0.2em] mb-2">Good evening</div>
                    <h1 className="text-4xl font-black text-black uppercase italic italic">Event Overview</h1>
                    <p className="text-xs font-bold text-gray-500 uppercase mt-1">
                      {events.length} active events Â· {events.reduce((sum: number, e: Event) => sum + (e.photoCount || 0), 0)} photos processed
                    </p>
                  </div>
                  <div className="relative z-10 flex gap-3 mt-6">
                    <button onClick={() => setIsCreateModalOpen(true)}
                      className="flex items-center gap-2 bg-primary text-white text-[10px] font-black uppercase px-5 py-3 border-[3px] border-black shadow-[6px_6px_0px_0px_#000] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[0px_0px_0px_0px_#000] transition-all">
                      <Plus size={16} />
                      New Event
                    </button>
                    <button onClick={() => setActiveView("upload")}
                      className="flex items-center gap-2 bg-white text-black text-[10px] font-black uppercase px-5 py-3 border-[3px] border-black shadow-[6px_6px_0px_0px_#000] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_#000] transition-all">
                      <Upload size={16} />
                      Bulk Upload
                    </button>
                  </div>
                </motion.div>

                {/* â”€â”€ Match rate card â”€â”€ */}
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
                  className="col-span-2 md:col-span-2 lg:col-span-2 border-[3px] border-black bg-white p-6 flex flex-col justify-between min-h-[140px] shadow-[8px_8px_0px_0px_#000] rotate-1">
                  <div className="w-12 h-12 border-2 border-black bg-orange-500 flex items-center justify-center shadow-[3px_3px_0px_0px_#000]">
                    <TrendingUp size={24} className="text-white" />
                  </div>
                  <div>
                    <div className="text-4xl font-black text-black">95%</div>
                    <div className="text-[10px] font-black text-gray-500 uppercase">Average Accuracy</div>
                  </div>
                </motion.div>

                {/* â”€â”€ Stats: Photos â”€â”€ */}
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
                  className="col-span-1 border-[3px] border-black bg-white p-5 flex flex-col justify-between min-h-[140px] shadow-[6px_6px_0px_0px_#000] rounded-[24px]">
                  <div className="w-16 h-16 border-[3px] border-black bg-primary flex items-center justify-center mb-6 shadow-[4px_4px_0px_0px_#000] -rotate-3 rounded-full">
                    <ImageIcon size={28} className="text-white" />
                  </div>
                  <div>
                    <div className="text-3xl font-black text-black">{events.reduce((sum, e) => sum + (e.photoCount || 0), 0).toLocaleString()}</div>
                    <div className="text-[10px] font-black text-gray-500 uppercase">Photos</div>
                  </div>
                </motion.div>

                {/* â”€â”€ Stats: Matches â”€â”€ */}
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
                  className="col-span-1 border-[3px] border-black bg-white p-5 flex flex-col justify-between min-h-[140px] shadow-[6px_6px_0px_0px_#000] rounded-[24px]">
                  <div className="w-16 h-16 border-[3px] border-black bg-green-500 flex items-center justify-center mb-6 shadow-[4px_4px_0px_0px_#000] rounded-full">
                    <Users size={28} className="text-white" />
                  </div>
                  <div>
                    <div className="text-3xl font-black text-black">{events.reduce((sum, e) => sum + (e.matchCount || 0), 0).toLocaleString()}</div>
                    <div className="text-[10px] font-black text-gray-500 uppercase">Matches</div>
                  </div>
                </motion.div>

                {/* â”€â”€ Stats: Events â”€â”€ */}
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}
                  className="col-span-1 border-[3px] border-black bg-white p-5 flex flex-col justify-between min-h-[140px] shadow-[6px_6px_0px_0px_#000] rounded-[24px]">
                  <div className="w-16 h-16 border-[3px] border-black bg-purple-500 flex items-center justify-center mb-6 shadow-[4px_4px_0px_0px_#000] rounded-full">
                    <Calendar size={28} className="text-white" />
                  </div>
                  <div>
                    <div className="text-3xl font-black text-black">{events.length}</div>
                    <div className="text-[10px] font-black text-gray-500 uppercase">Events</div>
                  </div>
                </motion.div>

                {/* â”€â”€ Events list card â”€â”€ */}
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.14 }}
                  className="col-span-2 md:col-span-4 lg:col-span-4 border-[3px] border-black bg-white shadow-[10px_10px_0px_0px_#000] rounded-[24px] overflow-hidden">
                  <div className="flex items-center justify-between px-6 py-5 border-b-[3px] border-black bg-gray-50 font-black uppercase text-xs tracking-widest">
                    <span>Active Events</span>
                    <button className="text-primary hover:underline flex items-center gap-2">
                      View all <ArrowUpRight size={14} />
                    </button>
                  </div>
                  <div className="divide-y divide-border">
                    {events.map((event, i) => (
                      <motion.div key={event.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.18 + i * 0.06 }}
                        className="flex items-center gap-4 px-6 py-5 border-b border-black last:border-b-0 hover:bg-gray-50 transition-colors">
                        <div className="w-20 h-20 border-[3px] border-black flex-shrink-0 shadow-[4px_4px_0px_0px_#000] rounded-full overflow-hidden">
                          <img src={event.coverUrl} alt="" className="w-full h-full object-cover rounded-full" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-black text-black uppercase tracking-tight truncate">{event.name}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 border border-primary/20 uppercase tracking-widest">{event.id.split('-')[0].toUpperCase()}</div>
                            <button onClick={() => handleCopyEventCode(event)}
                              className="text-[10px] font-bold text-gray-400 hover:text-black uppercase underline decoration-2 underline-offset-2">Copy Code</button>
                          </div>
                        </div>
                        <div className="hidden sm:flex items-center gap-6 text-right">
                          <div>
                            <div className="text-sm font-black text-black">{event.photoCount}</div>
                            <div className="text-[10px] font-bold text-gray-400 uppercase">photos</div>
                          </div>
                          <div>
                            <div className="text-sm font-black text-black">{event.matchCount}</div>
                            <div className="text-[10px] font-bold text-gray-400 uppercase">matches</div>
                          </div>
                        </div>
                        <div className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 border-2 border-black flex-shrink-0 shadow-[2px_2px_0px_0px_#000] rounded-full ${
                          event.isPublic ? "bg-green-500 text-white" : "bg-gray-100 text-black"
                        }`}>
                          {event.isPublic ? "Public" : "Private"}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

                {/* â”€â”€ Upload quick card â”€â”€ */}
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                  onClick={() => setActiveView("upload")}
                  className="col-span-2 md:col-span-2 border-[3px] border-dashed border-primary/40 hover:border-primary bg-primary/5 hover:bg-primary p-6 cursor-pointer transition-all group flex flex-col gap-4 min-h-[160px] shadow-[6px_6px_0px_0px_#000] rounded-[24px]">
                  <div className="w-16 h-16 border-2 border-black bg-white group-hover:bg-black flex items-center justify-center transition-all shadow-[3px_3px_0px_0px_#000] rounded-full">
                    <Upload size={28} className="text-primary group-hover:text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-black text-black group-hover:text-white uppercase">Bulk Upload</div>
                    <div className="text-[10px] font-bold text-gray-500 group-hover:text-white/70 uppercase mt-1">Drag photos for AI scanning</div>
                  </div>
                  <div className="mt-auto flex items-center gap-1 text-[10px] font-black uppercase text-primary group-hover:text-white transition-colors">
                    Open uploader <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </div>
                </motion.div>

                {/* â”€â”€ Settings card â”€â”€ */}
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}
                  onClick={() => setActiveView("settings")}
                  className="col-span-2 md:col-span-2 border-[3px] border-black bg-white p-6 cursor-pointer hover:bg-gray-50 transition-all group flex flex-col gap-4 min-h-[160px] shadow-[6px_6px_0px_0px_#000] rounded-[24px]">
                  <div className="w-16 h-16 border-2 border-black bg-gray-100 flex items-center justify-center shadow-[3px_3px_0px_0px_#000] rounded-full">
                    <QrCode size={28} className="text-black" />
                  </div>
                  <div>
                    <div className="text-sm font-black text-black uppercase">QR & Settings</div>
                    <div className="text-[10px] font-bold text-gray-500 uppercase mt-1">Manage access & configuration</div>
                  </div>
                  <div className="mt-auto flex items-center gap-1 text-[10px] font-black uppercase text-gray-400 group-hover:text-black transition-colors">
                    Configure <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </div>
                </motion.div>

                {/* â”€â”€ AI badge card â”€â”€ */}
                <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }}
                  className="col-span-2 border-[3px] border-black bg-primary/10 p-6 flex items-center gap-5 min-h-[100px] shadow-[6px_6px_0px_0px_#000] rounded-[24px]">
                  <div className="w-16 h-16 border-2 border-black bg-primary flex items-center justify-center flex-shrink-0 shadow-[3px_3px_0px_0px_#000] rounded-full">
                    <Scan size={28} className="text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-black text-black uppercase">AI Engine Active</div>
                    <div className="text-[10px] font-bold text-gray-500 uppercase mt-1">Real-time processing Â· 98% Match accuracy</div>
                  </div>
                  <div className="ml-auto flex-shrink-0">
                    <div className="w-3.5 h-3.5 border-2 border-black bg-green-500 animate-pulse" />
                  </div>
                </motion.div>

              </div>
            </motion.div>
          )}

          {/* â”€â”€ UPLOAD VIEW â”€â”€ */}
          {/* Events View */}
          {activeView === "events" && (
            <motion.div key="events" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }}>
              <div className="mb-6 flex items-end justify-between gap-4">
                <div>
                  <div className="text-[10px] text-primary font-black uppercase tracking-[0.2em] mb-1">Management</div>
                  <h1 className="text-4xl font-black text-black uppercase italic italic">All Events</h1>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(true)}
                  className="bg-primary text-white text-xs font-black uppercase tracking-widest py-3 px-5 border-[3px] border-black shadow-[6px_6px_0px_0px_#000] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all rounded-[16px] flex items-center gap-2"
                >
                  <Plus size={16} />
                  New Event
                </button>
              </div>

              {events.length === 0 ? (
                <div className="border-[3px] border-black bg-white p-12 text-center rounded-[24px] shadow-[8px_8px_0px_0px_#000]">
                  <div className="text-sm font-black text-black uppercase">No events yet</div>
                  <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-2">Create an event to start uploading photos</div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {events.map((event) => (
                    <div key={event.id} className="border-[3px] border-black bg-white rounded-[24px] shadow-[8px_8px_0px_0px_#000] overflow-hidden">
                      <div className="h-36 border-b-[3px] border-black overflow-hidden">
                        <img src={event.coverUrl} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="p-5 space-y-4">
                        <div>
                          <div className="text-lg font-black text-black uppercase leading-tight">{event.name}</div>
                          <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-1">{event.date}</div>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                          <span>{event.photoCount} photos</span>
                          <span>·</span>
                          <span>{event.matchCount} matches</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => handleCopyEventCode(event)}
                            className="text-[10px] font-black uppercase bg-white text-black px-3 py-2 border-2 border-black shadow-[2px_2px_0px_0px_#000] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all rounded-full"
                          >
                            Copy Code
                          </button>
                          <button
                            type="button"
                            onClick={() => handleShareJoinLink(event)}
                            disabled={shareLoadingEventId === event.id}
                            className="text-[10px] font-black uppercase bg-primary text-white px-3 py-2 border-2 border-black shadow-[2px_2px_0px_0px_#000] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all rounded-full"
                          >
                            {shareLoadingEventId === event.id ? "Opening..." : "Join Link"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEventPhotos(event)}
                            className="text-[10px] font-black uppercase bg-black text-white px-3 py-2 border-2 border-black shadow-[2px_2px_0px_0px_#000] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all rounded-full"
                          >
                            Open Photos
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
          {activeView === "upload" && (
            <motion.div key="upload" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }}>
              <div className="mb-6">
                <div className="text-[10px] text-primary font-black uppercase tracking-[0.2em] mb-1">Bulk Upload</div>
                <h1 className="text-4xl font-black text-black uppercase italic italic">Upload Photos</h1>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Drop zone */}
                <div className="md:col-span-2 border-[3px] border-black bg-white shadow-[10px_10px_0px_0px_#000] overflow-hidden rounded-[24px]">
                  {events.length > 0 && (
                    <div className="p-6 border-b-[3px] border-black bg-gray-50 flex items-center justify-between">
                      <label className="text-[10px] font-black text-black uppercase tracking-widest">Target Event</label>
                      <select
                        value={selectedUploadEventId}
                        onChange={(e) => setSelectedUploadEventId(e.target.value)}
                        className="bg-white border-2 border-black px-4 py-2 text-[10px] font-black uppercase tracking-widest focus:outline-none shadow-[3px_3px_0px_0px_#000] rounded-lg"
                      >
                        {events.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                      </select>
                    </div>
                  )}

                  <AnimatePresence mode="wait">
                    {events.length === 0 ? (
                      <motion.div
                        key="no-events"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="p-16 text-center"
                      >
                        <h3 className="text-xl font-black text-black uppercase mb-3">Create Event First</h3>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-8">
                          Images can be uploaded only inside an event.
                        </p>
                        <button
                          type="button"
                          onClick={() => setIsCreateModalOpen(true)}
                          className="bg-primary text-white text-xs font-black uppercase tracking-widest py-4 px-8 border-[3px] border-black shadow-[6px_6px_0px_0px_#000] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all rounded-[20px]"
                        >
                          Create Event
                        </button>
                      </motion.div>
                    ) : uploadState === "idle" ? (
                      <motion.div key="drop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                        onDragLeave={() => setIsDragOver(false)}
                        onDrop={handleDrop}
                        className={`p-16 text-center transition-all duration-200 ${isDragOver ? "bg-primary/5" : ""}`}>
                        <div className="w-full h-48 border-[3px] border-black border-dashed rounded-[24px] flex flex-col items-center justify-center gap-3 bg-gray-50 hover:bg-primary/5 transition-all cursor-pointer group shadow-[5px_5px_0px_0px_#000]">
                          <Upload size={32} className="text-primary" />
                        </div>
                        <h3 className="text-xl font-black text-black uppercase mb-2 mt-8">Drop photos here</h3>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-8">or click to browse local files</p>
                        <label className="flex-1 bg-primary text-white text-xs font-black uppercase tracking-widest py-4 px-8 border-[3px] border-black shadow-[6px_6px_0px_0px_#000] hover:translate-x-[-2px] hover:translate-y-[-2px] transition-all rounded-[20px] cursor-pointer">
                          Browse Files
                          <input type="file" multiple accept="image/*" className="hidden"
                            onChange={(e) => e.target.files?.length && uploadFiles(e.target.files)} />
                        </label>
                        <p className="text-[10px] font-bold text-gray-400 uppercase mt-8 tracking-tighter">JPG, PNG, HEIC Â· Up to 500 photos Â· AI face matching enabled</p>
                      </motion.div>
                    ) : null}

                    {(uploadState === "uploading" || uploadState === "scanning") && (
                      <motion.div key="progress" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-12 text-center">
                        <div className={`w-20 h-20 border-[3px] border-black flex items-center justify-center mx-auto mb-6 relative overflow-hidden shadow-[5px_5px_0px_0px_#000] rounded-2xl ${
                          uploadState === "scanning" ? "bg-purple-500" : "bg-primary"
                        }`}>
                          {uploadState === "scanning"
                            ? <><Users size={32} className="text-white" /><div className="absolute inset-x-0 h-1 bg-white/70 scan-animation" /></>
                            : <Upload size={32} className="text-white" />}
                        </div>
                        <h3 className="text-xl font-black text-black uppercase mb-1">
                          {uploadState === "scanning" ? "Scanning for Faces..." : `Uploading ${uploadedCount} photos...`}
                        </h3>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-8">
                          {uploadState === "scanning" ? "AI detecting and indexing faces" : "Transferring securely to cloud"}
                        </p>
                        <div className="w-full bg-gray-100 border-2 border-black h-4 mb-3 shadow-[3px_3px_0px_0px_#000] overflow-hidden rounded-full">
                          <motion.div className={`h-full ${uploadState === "scanning" ? "bg-purple-500" : "bg-primary"}`}
                            animate={{ width: `${uploadProgress}%` }} transition={{ duration: 0.3 }} />
                        </div>
                        <div className="text-[10px] font-black text-black uppercase tracking-widest">{uploadProgress}% COMPLETE</div>
                      </motion.div>
                    )}

                    {uploadState === "done" && (
                      <motion.div key="done" initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="p-12 text-center">
                        <div className="w-20 h-20 border-[3px] border-black bg-green-500 flex items-center justify-center mx-auto mb-6 shadow-[5px_5px_0px_0px_#000] rounded-2xl">
                          <div className="text-white text-3xl font-black">âœ“</div>
                        </div>
                        <h3 className="text-xl font-black text-black uppercase mb-1">Upload Complete!</h3>
                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">{uploadedCount} photos processed</p>
                        <div className="text-[10px] font-black text-green-600 uppercase mb-8 tracking-[0.2em]">{facesDetected} faces detected</div>
                        <button onClick={() => { setUploadState("idle"); setUploadProgress(0); setFacesDetected(0); }}
                          className="flex items-center gap-3 mx-auto px-8 py-4 border-[3px] border-black bg-white hover:bg-gray-50 text-[10px] font-black uppercase tracking-widest shadow-[6px_6px_0px_0px_#000] rotate-1 transition-all rounded-[20px]">
                          <RefreshCw size={16} />Upload More
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Tips column */}
                <div className="space-y-6">
                  {[
                    { title: "Face Detection", desc: "AI scans every face in each photo automatically", color: "blue" },
                    { title: "Bulk Processing", desc: "Up to 500 photos processed simultaneously", color: "purple" },
                    { title: "Instant Index", desc: "Photos searchable within seconds of upload", color: "green" },
                  ].map(({ title, desc, color }) => (
                    <div key={title} className="border-[3px] border-black bg-white p-6 shadow-[6px_6px_0px_0px_#000] rotate-1 group hover:shadow-[10px_10px_0px_0px_#000] transition-all rounded-[24px]">
                      <div className={`w-4 h-4 border-2 border-black mb-4 shadow-[2px_2px_0px_0px_#000] rounded-full ${
                        color === "blue" ? "bg-primary" : color === "purple" ? "bg-purple-500" : "bg-green-500"
                      }`} />
                      <div className="text-sm font-black text-black uppercase tracking-tight mb-2">{title}</div>
                      <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest leading-relaxed">{desc}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 border-[3px] border-black bg-white shadow-[8px_8px_0px_0px_#000] rounded-[24px] overflow-hidden">
                <div className="px-6 py-4 border-b-[3px] border-black bg-gray-50 flex items-center justify-between">
                  <div className="text-[10px] font-black text-black uppercase tracking-widest">
                    Uploaded Images for Selected Event
                  </div>
                  <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                    {selectedEventPhotos.length} photos
                  </div>
                </div>

                {isPhotosLoading ? (
                  <div className="p-10 flex items-center justify-center">
                    <RefreshCw size={24} className="animate-spin text-primary" />
                  </div>
                ) : selectedEventPhotos.length === 0 ? (
                  <div className="p-10 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest">
                    No uploaded photos in this event yet.
                  </div>
                ) : (
                  <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                    {selectedEventPhotos.slice(0, 24).map((photo) => (
                      <a
                        key={photo.id}
                        href={photo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block border-2 border-black shadow-[3px_3px_0px_0px_#000] overflow-hidden rounded-[16px] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
                      >
                        <img src={photo.thumbnailUrl || photo.thumbnail || photo.url} alt="" className="w-full h-28 object-cover" />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* â”€â”€ SETTINGS VIEW â”€â”€ */}
          {activeView === "photos" && (
            <motion.div key="photos" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }}>
              <div className="mb-6 flex items-end justify-between gap-4">
                <div>
                  <div className="text-[10px] text-primary font-black uppercase tracking-[0.2em] mb-1">Gallery</div>
                  <h1 className="text-4xl font-black text-black uppercase italic italic">Event Photos</h1>
                </div>
                <select
                  value={selectedUploadEventId}
                  onChange={(e) => setSelectedUploadEventId(e.target.value)}
                  className="bg-white border-2 border-black px-4 py-3 text-[10px] font-black uppercase tracking-widest focus:outline-none shadow-[3px_3px_0px_0px_#000] rounded-lg"
                >
                  {events.map((event) => (
                    <option key={event.id} value={event.id}>{event.name}</option>
                  ))}
                </select>
              </div>

              <div className="border-[3px] border-black bg-white shadow-[10px_10px_0px_0px_#000] rounded-[24px] overflow-hidden">
                <div className="px-6 py-4 border-b-[3px] border-black bg-gray-50 flex items-center justify-between">
                  <div className="text-[10px] font-black text-black uppercase tracking-widest">Uploaded Photos</div>
                  <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest">{selectedEventPhotos.length} photos</div>
                </div>

                {isPhotosLoading ? (
                  <div className="p-10 flex items-center justify-center">
                    <RefreshCw size={24} className="animate-spin text-primary" />
                  </div>
                ) : selectedEventPhotos.length === 0 ? (
                  <div className="p-10 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest">
                    No photos found for this event.
                  </div>
                ) : (
                  <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {selectedEventPhotos.map((photo) => (
                      <button
                        key={photo.id}
                        type="button"
                        onClick={() => setSelectedPhoto(photo)}
                        className="block border-2 border-black shadow-[3px_3px_0px_0px_#000] overflow-hidden rounded-[16px] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
                      >
                        <img src={photo.thumbnailUrl || photo.thumbnail || photo.url} alt="" className="w-full h-28 object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeView === "settings" && (
            <motion.div key="settings" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }}>
              <div className="mb-6">
                <div className="text-[10px] text-primary font-black uppercase tracking-[0.2em] mb-1">Settings</div>
                <h1 className="text-4xl font-black text-black uppercase italic italic">Configuration</h1>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {events.map((event, i) => (
                  <motion.div key={event.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
                    className="border-[3px] border-black bg-white shadow-[8px_8px_0px_0px_#000] overflow-hidden -rotate-1">

                    {/* Cover */}
                    <div className="relative h-32 border-b-[3px] border-black overflow-hidden">
                      <img src={event.coverUrl} alt="" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                      <div className="absolute bottom-4 left-5 text-sm font-black text-white uppercase italic tracking-widest">{event.name}</div>
                    </div>

                    <div className="p-6 space-y-5">
                      {/* Toggle */}
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-[10px] font-black text-black uppercase tracking-widest">Public Access</div>
                        </div>
                        <button onClick={() => toggleVisibility(event.id)}
                          className={`relative w-12 h-6 border-2 border-black transition-all duration-300 ${event.isPublic ? "bg-green-500" : "bg-gray-100"}`}>
                          <motion.div className="absolute top-1 w-3.5 h-3.5 bg-white border border-black shadow-sm"
                            animate={{ left: event.isPublic ? "calc(100% - 18px)" : "4px" }}
                            transition={{ duration: 0.2 }} />
                        </button>
                      </div>

                      {/* QR */}
                      <div className="bg-gray-50 border-2 border-black p-4 flex items-center gap-4 shadow-[4px_4px_0px_0px_#000]">
                        <div className="w-16 h-16 border-2 border-black bg-white p-1 flex-shrink-0">
                          <QrCodeDisplay code={event.qrCode} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] font-black text-primary truncate uppercase tracking-tighter">{event.qrCode}</div>
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={() => handleShareJoinLink(event)}
                              disabled={shareLoadingEventId === event.id}
                              className="text-[10px] font-black uppercase bg-primary text-white px-3 py-1.5 border-2 border-black shadow-[2px_2px_0px_0px_#000] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
                            >
                              {shareLoadingEventId === event.id ? "..." : "QR"}
                            </button>
                            <button
                              onClick={() => handleCopyEventCode(event)}
                              className="text-[10px] font-black uppercase bg-white text-black px-3 py-1.5 border-2 border-black shadow-[2px_2px_0px_0px_#000] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all"
                            >
                              Copy
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        <span>{event.photoCount} photos</span>
                        <span>Â·</span>
                        <span>{event.matchCount} matches</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>
      {/* â”€â”€ CREATE EVENT MODAL â”€â”€ */}
      <AnimatePresence>
        {selectedPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            onClick={() => setSelectedPhoto(null)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="relative max-w-5xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setSelectedPhoto(null)}
                className="absolute -top-12 right-0 w-10 h-10 bg-white border-2 border-black shadow-[3px_3px_0px_0px_#000] rounded-full flex items-center justify-center"
              >
                <X size={18} />
              </button>
              <img
                src={selectedPhoto.url}
                alt=""
                className="w-full max-h-[80vh] object-contain border-[3px] border-black bg-white rounded-[24px] p-2 shadow-[10px_10px_0px_0px_#000]"
              />
            </motion.div>
          </motion.div>
        )}
        {isCreateModalOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-white/90 backdrop-blur-sm flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-md border-[3px] border-black bg-white shadow-[12px_12px_0px_0px_#000] overflow-hidden rounded-[32px]">
              <div className="p-6 border-b-[3px] border-black bg-gray-50 flex items-center justify-between">
                <h2 className="text-xl font-black text-black uppercase italic">Create Event</h2>
                <button onClick={() => setIsCreateModalOpen(false)} className="w-8 h-8 rounded-full border-2 border-black flex items-center justify-center hover:bg-gray-200 transition-all">
                  <Plus size={20} className="rotate-45" />
                </button>
              </div>
              <form onSubmit={handleCreateEvent} className="p-8 space-y-6">
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Event Name</label>
                  <input type="text" value={newEvent.name} onChange={(e) => setNewEvent({...newEvent, name: e.target.value})}
                    placeholder="e.g. Summer Gala 2025"
                    className="w-full border-2 border-black p-3 font-bold text-sm focus:outline-none focus:bg-primary/5 transition-all rounded-xl" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Description (Optional)</label>
                  <textarea value={newEvent.description} onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                    placeholder="A brief detail about the event..."
                    className="w-full border-2 border-black p-3 font-bold text-sm focus:outline-none focus:bg-primary/5 transition-all h-24 rounded-xl" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Date</label>
                    <input type="text" value={newEvent.date} onChange={(e) => setNewEvent({...newEvent, date: e.target.value})}
                      className="w-full border-2 border-black p-3 font-bold text-sm focus:outline-none rounded-xl" />
                  </div>
                  <div className="flex items-center gap-3 pt-6">
                    <button type="button" onClick={() => setNewEvent({...newEvent, isPublic: !newEvent.isPublic})}
                      className={`w-12 h-6 border-2 border-black transition-all relative ${newEvent.isPublic ? "bg-green-500" : "bg-gray-100"}`}>
                      <motion.div animate={{ left: newEvent.isPublic ? "26px" : "4px" }} className="absolute top-1 w-3.5 h-3.5 bg-white border border-black" />
                    </button>
                    <span className="text-[10px] font-black uppercase">Public</span>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2 block">Cover Image URL</label>
                  <input type="text" value={newEvent.coverUrl} onChange={(e) => setNewEvent({...newEvent, coverUrl: e.target.value})}
                    className="w-full border-2 border-black p-3 font-bold text-sm focus:outline-none rounded-xl" />
                </div>
                <button type="submit" disabled={isCreatingEvent}
                  className="w-full bg-primary text-white font-black uppercase py-4 border-[3px] border-black shadow-[6px_6px_0px_0px_#000] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_#000] transition-all rounded-2xl">
                  {isCreatingEvent ? "Launching..." : "Launch Event"}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

function QrCodeDisplay({ code }: { code: string }) {
  const bits = Array.from(code).map((c) => c.charCodeAt(0) % 2 === 0);
  const size = 8;
  const grid: boolean[][] = [];
  for (let r = 0; r < size; r++) {
    grid.push([]);
    for (let c = 0; c < size; c++) {
      const idx = (r * size + c) % bits.length;
      const isCorner = (r < 3 && c < 3) || (r < 3 && c >= size - 3) || (r >= size - 3 && c < 3);
      grid[r].push(isCorner ? true : bits[idx]);
    }
  }
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-full" style={{ imageRendering: "pixelated" }}>
      {grid.map((row, r) => row.map((on, c) => on ? <rect key={`${r}-${c}`} x={c} y={r} width={1} height={1} fill="#1e293b" /> : null))}
    </svg>
  );
}



