import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Download, Share2, X, Zap, Plus,
  CheckCircle2, ScanFace, ImageIcon, User, RefreshCw
} from "lucide-react";
import ProfileView from "@/components/ProfileView";
import { type Photo, type Event, type UserProfile } from "@/types";
import { api, ApiError } from "@/lib/api";
import { toast } from "sonner";

interface ParticipantDashboardProps { 
  onLogout: () => void; 
  eventId: string | null;
  photoId: string | null;
  userProfile: UserProfile | null;
}
type AppView = "events" | "gallery" | "profile";
type SearchState = "idle" | "searching" | "done";

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    return error.message || fallback;
  }
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
}

export default function ParticipantDashboard({ onLogout, eventId, photoId, userProfile }: ParticipantDashboardProps) {
  const studentId = userProfile?.id?.trim();
  const isStudentAuthenticated = Boolean(studentId);
  const [view, setView] = useState<AppView>(eventId ? "gallery" : "events");
  const [events, setEvents] = useState<Event[]>([]);
  const [activeEvent, setActiveEvent] = useState<Event | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [searchState, setSearchState] = useState<SearchState>("idle");
  const [searchProgress, setSearchProgress] = useState(0);
  const [matchedIds, setMatchedIds] = useState<Set<string>>(new Set());
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [highlightOnly, setHighlightOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchData();
  }, [eventId, photoId]);

  const fetchEventPhotosForCurrentUser = useCallback(
    async (targetEventId: string): Promise<Photo[]> => {
      if (isStudentAuthenticated && studentId) {
        return api.getStudentMatchedPhotos(studentId, targetEventId);
      }
      return api.getEventPhotos(targetEventId);
    },
    [isStudentAuthenticated, studentId]
  );

  const fetchData = async () => {
    try {
      if (eventId) {
        if (isStudentAuthenticated && studentId) {
          // Accessing an event link should auto-enroll the logged-in student.
          await api.enrollStudentInEvent(studentId, eventId);
        }
        const eventData = await api.getEvent(eventId);
        setActiveEvent(eventData);
        const photoData = await fetchEventPhotosForCurrentUser(eventData.id);
        setPhotos(photoData);
        if (isStudentAuthenticated) {
          setSearchState("done");
          setMatchedIds(new Set(photoData.map((photo) => photo.id)));
        }
        if (photoId) {
          const matchedPhoto = photoData.find((photo) => photo.id === photoId) || null;
          setSelectedPhoto(matchedPhoto);
        }
        setView("gallery");
      } else {
        const eventsData = isStudentAuthenticated && studentId
          ? await api.getStudentEvents(studentId)
          : await api.getEvents({ includePrivate: false });
        setEvents(eventsData);
        setSelectedPhoto(null);
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to load event data"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setIsJoining(true);
    try {
      const event = isStudentAuthenticated && studentId
        ? await api.enrollStudentInEvent(studentId, joinCode)
        : await api.getEvent(joinCode);
      if (event) {
        setEvents(prev => {
          if (prev.find(e => e.id === event.id)) return prev;
          return [event, ...prev];
        });
        toast.success(`Joined ${event.name}!`);
        setIsJoinModalOpen(false);
        setJoinCode("");
        openEvent(event);
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Invalid event code"));
    } finally {
      setIsJoining(false);
    }
  };

  const openEvent = async (event: Event) => {
    setActiveEvent(event);
    setView("gallery");
    setSelectedPhoto(null);
    setSearchState(isStudentAuthenticated ? "done" : "idle");
    setMatchedIds(new Set());
    setHighlightOnly(false);
    try {
      const photoData = await fetchEventPhotosForCurrentUser(event.id);
      setPhotos(photoData);
      if (isStudentAuthenticated) {
        setMatchedIds(new Set(photoData.map((photo) => photo.id)));
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to load photos"));
    }
  };

  const startFaceSearch = useCallback(async (file: File) => {
    if (!activeEvent) return;
    const reader = new FileReader();
    reader.onload = (e) => setSelfiePreview(e.target?.result as string);
    reader.readAsDataURL(file);
    setSearchState("searching");
    setSearchProgress(10);

    let progress = 10;
    const progressTicker = window.setInterval(() => {
      progress = Math.min(progress + 8, 92);
      setSearchProgress(progress);
    }, 250);

    try {
      const results = await api.matchSelfie(activeEvent.id, file);
      setMatchedIds(new Set(results.map((p) => p.id)));
      setSearchProgress(100);
      setSearchState("done");
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not process selfie. Try a clearer photo with one face."));
      setSearchState("idle");
      setSearchProgress(0);
      setMatchedIds(new Set());
    } finally {
      window.clearInterval(progressTicker);
    }
  }, [activeEvent]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) startFaceSearch(file);
  };

  const clearSearch = () => {
    setSearchState("idle");
    setMatchedIds(new Set());
    setSelfiePreview(null);
    setHighlightOnly(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const triggerDownload = (url: string, filename: string) => {
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.rel = "noopener";
    anchor.target = "_blank";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

  const handleDownloadPhoto = async (photo: Photo, event?: React.MouseEvent) => {
    event?.stopPropagation();
    try {
      const links = await api.getPhotoLinks(photo.id);
      triggerDownload(links.downloadUrl, `${photo.eventId}-${photo.id}.jpg`);
      toast.success("Download started.");
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not download photo."));
    }
  };

  const handleSharePhoto = async (photo: Photo) => {
    try {
      const links = await api.getPhotoLinks(photo.id);
      if (navigator.share) {
        await navigator.share({
          title: `${photo.event} - Spotlight`,
          text: "Found this photo in Spotlight",
          url: links.shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(links.shareUrl);
        toast.success("Share link copied!");
      }
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not create share link."));
    }
  };

  const currentPhotos = photos;
  const displayPhotos = isStudentAuthenticated
    ? currentPhotos
    : highlightOnly
      ? currentPhotos.filter((p) => matchedIds.has(p.id))
      : currentPhotos;

  const searchStages = [
    { label: "Detecting face", max: 30 },
    { label: "Building embedding", max: 60 },
    { label: "Searching gallery", max: 90 },
    { label: "Ranking matches", max: 100 },
  ];
  const stageIdx = (() => { const i = searchStages.findIndex((s) => searchProgress < s.max); return i === -1 ? searchStages.length - 1 : i; })();

  const bentoPattern = ["1x1", "1x1", "1x2", "1x1", "2x1", "1x1", "1x1", "1x1", "1x2", "2x1"];

  return (
    <div className="min-h-screen bg-background">
      <AnimatePresence>
        {view === "profile" && (
          <motion.div
            key="profile-overlay"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 32 }}
            className="fixed inset-0 z-50 overflow-auto bg-background"
          >
            <ProfileView
              onBack={() => setView("events")}
              onLogout={onLogout}
              role="participant"
              initialProfile={userProfile}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b-[3px] border-black px-5 h-24 flex items-center gap-4 shadow-sm rounded-b-[32px]">
        {view === "gallery" && (
          <button onClick={() => setView("events")}
            className="w-14 h-14 rounded-full border-[3px] border-black hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-all">
            <ArrowLeft size={28} />
          </button>
        )}
        <div className="w-14 h-14 border-[3px] border-black bg-primary flex items-center justify-center shadow-[4px_4px_0px_0px_#000] rounded-full">
          <Zap size={28} className="text-white" />
        </div>
        <span className="font-bold text-sm tracking-tight truncate uppercase italic">
          {view === "gallery" && activeEvent ? activeEvent.name : "Spotlight"}
        </span>
        <div className="flex-1" />
        {view === "gallery" && !isStudentAuthenticated && searchState === "done" && (
          <button onClick={() => setHighlightOnly(!highlightOnly)}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 border-2 border-black font-bold text-xs transition-all rounded-full ${
              highlightOnly ? "bg-primary text-white shadow-[2px_2px_0px_0px_#000]" : "bg-white text-black"
            }`}>
            <ScanFace size={13} />
            Mine {highlightOnly && <span className="bg-white/20 px-1.5 ml-1">{matchedIds.size}</span>}
          </button>
        )}
        <button
          onClick={() => setView("profile")}
          className={`w-14 h-14 rounded-full border-[3px] border-black flex items-center justify-center transition-all ${
            view === "profile" ? "bg-primary text-white shadow-[4px_4px_0px_0px_#000]" : "bg-white text-black hover:bg-gray-100"
          }`}
        >
          <User size={28} />
        </button>
      </header>

      <main className="p-4 max-w-5xl mx-auto">
        <AnimatePresence mode="wait">
          {view === "events" && (
            <motion.div key="events" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
          <div className="mb-6 flex items-end justify-between">
            <div>
              <div className="text-xs text-primary font-black uppercase tracking-[0.2em] mb-1">
                {isStudentAuthenticated ? "Enrolled Events" : "Your Events"}
              </div>
              <h1 className="text-4xl font-black text-black uppercase italic -rotate-1 origin-left">Photo Gallery</h1>
            </div>
            <button
              onClick={() => setIsJoinModalOpen(true)}
              className="w-14 h-14 bg-primary text-white border-[3px] border-black shadow-[6px_6px_0px_0px_#000] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[0px_0px_0px_0px_#000] transition-all rounded-full flex items-center justify-center mb-1"
            >
              <Plus size={32} />
            </button>
          </div>

              {isLoading ? (
                <div className="flex items-center justify-center p-20">
                  <RefreshCw className="animate-spin text-primary" size={48} />
                </div>
              ) : events.length === 0 ? (
                <div className="border-[3px] border-black bg-white p-12 text-center rounded-[32px] shadow-[8px_8px_0px_0px_#000]">
                  <ImageIcon size={48} className="mx-auto mb-4 text-gray-300" />
                  <p className="font-black uppercase italic text-gray-500">
                    {isStudentAuthenticated ? "No enrolled events yet. Join one with an event code." : "No active events found"}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-6 gap-6">
                  {events[0] && (
                    <motion.button initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0 }}
                      onClick={() => openEvent(events[0])}
                      className="col-span-2 md:col-span-4 row-span-2 group relative border-[3px] border-black bg-white shadow-[8px_8px_0px_0px_#000] hover:shadow-[12px_12px_0px_0px_#000] transition-all text-left min-h-[320px] rounded-[24px] overflow-hidden">
                      <img src={events[0].coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      <div className="absolute top-4 left-4 flex gap-2">
                        <div className="bg-black/50 backdrop-blur-md text-white text-xs font-medium px-2.5 py-1 rounded-full flex items-center gap-1.5 border border-white/20">
                          <ImageIcon size={11} />
                          {events[0].photoCount} photos
                        </div>
                        <div className={`text-xs font-medium px-2.5 py-1 rounded-full border border-white/20 ${events[0].isPublic ? "bg-green-600/80 text-white" : "bg-black/50 text-gray-300"}`}>
                          {events[0].isPublic ? "Public" : "Private"}
                        </div>
                      </div>
                      <div className="absolute bottom-6 left-6 right-6">
                        <div className="text-white h-auto">
                          <div className="text-[10px] font-black uppercase tracking-[0.2em] mb-1 opacity-80">{events[0].date}</div>
                          <h3 className="text-3xl font-black uppercase italic italic">{events[0].name}</h3>
                        </div>
                      </div>
                    </motion.button>
                  )}

                  {events.slice(1).map((event, i) => (
                    <motion.button key={event.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: (i + 1) * 0.1 }}
                      onClick={() => openEvent(event)}
                      className="col-span-2 group relative border-[3px] border-black bg-white shadow-[8px_8px_0px_0px_#000] hover:shadow-[12px_12px_0px_0px_#000] transition-all text-left aspect-[4/5] md:aspect-auto rounded-[24px] overflow-hidden">
                      <img src={event.coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
                      <div className="absolute bottom-5 left-5 right-5">
                        <div className="text-[10px] font-black text-white/70 uppercase mb-1">{event.date}</div>
                        <div className="text-xl font-black text-white uppercase italic">{event.name}</div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {view === "gallery" && (
            <motion.div key="gallery" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="text-xs text-muted-foreground font-bold tracking-tight uppercase italic">{activeEvent?.date} · {displayPhotos.length} photos</div>
                  {(isStudentAuthenticated || searchState === "done") && (
                    <div className="text-xs text-primary font-black mt-1 uppercase tracking-wider">{matchedIds.size} photos match you</div>
                  )}
                </div>
                {!isStudentAuthenticated && searchState === "done" && (
                  <button onClick={clearSearch} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors uppercase font-bold">
                    <X size={13} /> Clear search
                  </button>
                )}
              </div>

              <div className="grid grid-cols-3 md:grid-cols-4 gap-2 auto-rows-[120px] md:auto-rows-[140px]">
                {displayPhotos.map((photo, i) => {
                  const sizeKey = bentoPattern[i % bentoPattern.length];
                  const isMatch = isStudentAuthenticated ? true : matchedIds.has(photo.id);
                  const isSearchDone = isStudentAuthenticated ? true : searchState === "done";
                  const colSpan = sizeKey === "2x1" ? "col-span-2" : "col-span-1";
                  const rowSpan = sizeKey === "1x2" ? "row-span-2" : "row-span-1";

                  return (
                    <motion.div
                      key={photo.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: isSearchDone && !isMatch ? 0.2 : 1, scale: 1 }}
                      transition={{ delay: Math.min(i * 0.04, 0.5), duration: 0.4 }}
                      className={`${colSpan} ${rowSpan} group relative border-2 border-black shadow-[4px_4px_0px_0px_#000] hover:shadow-[6px_6px_0px_0px_#000] transition-all cursor-pointer bg-muted rounded-[24px] overflow-hidden`}
                      onClick={() => setSelectedPhoto(photo)}
                    >
                      <img src={photo.thumbnail} alt="" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                      {isSearchDone && isMatch && (
                        <div className="absolute inset-0 border-[3px] border-primary pointer-events-none" />
                      )}
                      {isSearchDone && isMatch && (
                        <div className="absolute top-2 left-2 flex items-center gap-1 bg-primary text-white text-[10px] font-black px-2 py-0.5 border-2 border-black shadow-[2px_2px_0px_0px_#000] rounded-lg">
                          <ScanFace size={10} />
                          YOU
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors duration-150" />
                      <div className="absolute bottom-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => handleDownloadPhoto(photo, e)} className="w-10 h-10 rounded-full bg-white border-2 border-black flex items-center justify-center hover:bg-gray-100 transition-all shadow-[2px_2px_0px_0px_#000]">
                          <Download size={14} className="text-black" />
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
              <div className="h-28" />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {!isStudentAuthenticated && view === "gallery" && searchState === "idle" && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 20, delay: 0.4 }}
            className="fixed bottom-6 right-5 z-50 flex items-center gap-3"
          >
            <motion.div
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1 }}
              className="bg-white border-2 border-black text-black text-[10px] font-black px-3.5 py-2 whitespace-nowrap shadow-[4px_4px_0px_0px_#000] pointer-events-none uppercase tracking-widest rounded-full"
            >
              <span className="text-primary">AI</span> · FIND MY PHOTOS
            </motion.div>
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 animate-ping rounded-full" />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="relative w-16 h-16 bg-primary border-[3px] border-black shadow-[6px_6px_0px_0px_#000] flex items-center justify-center hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_#000] transition-all rounded-full"
              >
                <ScanFace size={28} className="text-white" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!isStudentAuthenticated && searchState === "searching" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-white/90 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="w-full max-w-sm">
              <div className="relative w-28 h-28 mx-auto mb-6 border-[3px] border-black shadow-[6px_6px_0px_0px_#000] rounded-full overflow-hidden">
                {selfiePreview
                  ? <img src={selfiePreview} alt="" className="w-full h-full object-cover rounded-full" />
                  : <div className="w-full h-full bg-primary/10 flex items-center justify-center"><ScanFace size={44} className="text-primary" /></div>
                }
                <div className="absolute inset-0 overflow-hidden">
                  <div className="absolute inset-x-0 h-1 bg-primary/80 scan-animation" />
                </div>
              </div>
              <div className="text-center mb-7">
                <h2 className="text-2xl font-black text-black uppercase italic -rotate-1 mb-1">Scanning...</h2>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">{searchStages[stageIdx]?.label}</p>
              </div>
              <div className="w-full bg-gray-200 border-2 border-black h-4 mb-2 overflow-hidden shadow-[3px_3px_0px_0px_#000] rounded-full">
                <motion.div className="h-full bg-primary" animate={{ width: `${searchProgress}%` }} transition={{ duration: 0.3, ease: "linear" }} />
              </div>
              <div className="text-center text-xs font-black text-primary mb-7">{searchProgress}% COMPLETE</div>
              <div className="grid grid-cols-2 gap-2">
                {searchStages.map((stage, i) => {
                  const done = i < stageIdx;
                  const active = i === stageIdx;
                  return (
                    <div key={stage.label} className={`p-3 border-2 border-black transition-all shadow-[4px_4px_0px_0px_#000] rounded-2xl ${
                      active ? "bg-primary text-white" : done ? "bg-gray-100 opacity-70" : "bg-white opacity-40"
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        {done ? <CheckCircle2 size={13} className="text-green-600" />
                          : active ? <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          : <div className="w-3.5 h-3.5 border-2 border-black/20" />}
                        <span className={`text-[10px] font-black uppercase tracking-tighter ${active ? "text-white" : "text-black"}`}>STEP {i + 1}</span>
                      </div>
                      <p className={`text-[10px] font-bold ${active ? "text-white/80" : "text-gray-500"}`}>{stage.label}</p>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedPhoto && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4" onClick={() => setSelectedPhoto(null)}>
            <motion.div initial={{ scale: 0.92 }} animate={{ scale: 1 }} exit={{ scale: 0.92 }} transition={{ duration: 0.18 }} className="relative max-w-lg w-full" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setSelectedPhoto(null)} className="absolute -top-11 right-0 w-10 h-10 rounded-full bg-white border-2 border-black flex items-center justify-center hover:bg-gray-100 transition-all shadow-[3px_3px_0px_0px_#000]">
                <X size={20} className="text-black" />
              </button>
              <img src={selectedPhoto.url} alt="" className="w-full border-[3px] border-black shadow-[12px_12px_0px_0px_#000] object-contain max-h-[70vh] rounded-[32px] bg-white p-2" />
              <div className="mt-6 flex items-center justify-between gap-4">
                <div className="bg-white border-[3px] border-black p-4 shadow-[6px_6px_0px_0px_#000] rounded-[20px] flex-1">
                  <div className="text-xs font-black text-black uppercase tracking-tight italic">Spotlight Discovery</div>
                  <div className="text-[10px] font-bold text-gray-500 uppercase mt-0.5">Found at {selectedPhoto.event}</div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => handleDownloadPhoto(selectedPhoto)} className="flex items-center justify-center w-14 h-14 bg-primary text-white border-[3px] border-black shadow-[4px_4px_0px_0px_#000] hover:translate-x-[-1px] hover:translate-y-[-1px] rounded-[20px]">
                    <Download size={24} />
                  </button>
                  <button onClick={() => handleSharePhoto(selectedPhoto)} className="flex items-center justify-center w-14 h-14 bg-white text-black border-[3px] border-black shadow-[4px_4px_0px_0px_#000] hover:translate-x-[-1px] hover:translate-y-[-1px] rounded-[20px]">
                    <Share2 size={24} />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isJoinModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsJoinModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative bg-white border-[3px] border-black shadow-[12px_12px_0px_0px_#000] w-full max-w-md p-8 rounded-[32px]">
              <button onClick={() => setIsJoinModalOpen(false)} className="absolute top-4 right-4 w-10 h-10 border-2 border-black bg-white hover:bg-gray-100 flex items-center justify-center rounded-full shadow-[2px_2px_0px_0px_#000] transition-all">
                <X size={20} />
              </button>
              <div className="text-center mb-8">
                <div className="w-16 h-16 border-[3px] border-black bg-primary flex items-center justify-center mx-auto mb-4 shadow-[4px_4px_0px_0px_#000] -rotate-3 rounded-full">
                  <Zap size={32} className="text-white" />
                </div>
                <h2 className="text-3xl font-black text-black uppercase italic">Join Event</h2>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Enter your unique access code</p>
              </div>
              <form onSubmit={handleJoinEvent} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-black uppercase tracking-widest ml-1">Event Code</label>
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="E.G. ABCD-1234"
                    className="w-full bg-white border-[3px] border-black px-5 py-4 text-lg font-black placeholder:text-gray-300 focus:outline-none focus:shadow-[6px_6px_0px_0px_#000] transition-all rounded-[20px]"
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  disabled={isJoining || !joinCode.trim()}
                  className="w-full bg-primary text-white text-xs font-black uppercase tracking-[0.2em] py-5 border-[3px] border-black shadow-[6px_6px_0px_0px_#000] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[8px_8px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[0px_0px_0px_0px_#000] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3 rounded-[24px]"
                >
                  {isJoining ? <RefreshCw className="animate-spin" size={18} /> : <Zap size={18} />}
                  {isJoining ? "JOINING..." : "ENTER GALLERY"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
