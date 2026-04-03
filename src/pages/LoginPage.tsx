import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera, Shield, ChevronRight, Zap, User, Mail, Lock, ArrowLeft,
  ImageIcon, Users, Star, TrendingUp, RefreshCw, UserPlus
} from "lucide-react";
import { api } from "@/lib/api";
import { UserProfile } from "@/types";
import { toast } from "sonner";

interface LoginPageProps {
  onLogin: (role: "admin" | "participant", eventId?: string, userProfile?: UserProfile) => void;
}
type ParticipantStep = "login" | "join";
type AdminMode = "signin" | "signup";

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [activeTab, setActiveTab] = useState<"admin" | "participant">("participant");
  const [participantStep, setParticipantStep] = useState<ParticipantStep>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [eventCode, setEventCode] = useState("");
  const [participantProfile, setParticipantProfile] = useState<UserProfile | null>(null);
  const [adminMode, setAdminMode] = useState<AdminMode>("signin");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [homeMetrics, setHomeMetrics] = useState({
    photosIndexed: 0,
    facesIndexed: 0,
    publicEvents: 0,
    matchRate: 0,
    avgSearchSeconds: 0,
  });

  useEffect(() => {
    const loadMetrics = async () => {
      try {
        const metrics = await api.getHomeMetrics();
        setHomeMetrics(metrics);
      } catch (error) {
        // Keep graceful fallback values when backend is unavailable.
      }
    };
    loadMetrics();
  }, []);

  const formatCompact = (value: number) =>
    new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);

  const handleParticipantStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const session = await api.createParticipantSession(name.trim(), email.trim());
      setParticipantProfile(session.profile);
      setParticipantStep("join");
    } catch (error) {
      toast.error("Could not start participant session. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  const handleParticipantJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventCode) return;
    setLoading(true);
    try {
      const event = await api.getEvent(eventCode);
      setLoading(false);
      onLogin("participant", event.id, participantProfile ?? undefined);
    } catch (error) {
      setLoading(false);
      toast.error("Invalid event code. Please try again.");
    }
  };
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const auth = await api.adminLogin(adminEmail.trim(), adminPassword);
      onLogin("admin", undefined, auth.profile);
    } catch (error) {
      toast.error("Invalid credentials or backend unavailable.");
    } finally {
      setLoading(false);
    }
  };

  const handleAdminSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const auth = await api.adminRegister(adminName.trim(), adminEmail.trim(), adminPassword);
      toast.success("Account created. You are now signed in.");
      onLogin("admin", undefined, auth.profile);
    } catch (error) {
      toast.error("Signup failed. Email may already be registered.");
    } finally {
      setLoading(false);
    }
  };
  const switchTab = (t: "admin" | "participant") => {
    setActiveTab(t);
    setParticipantStep("login");
    if (t === "admin") {
      setAdminMode("signin");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Ambient glow */}
      <div className="fixed top-0 left-1/3 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-64 h-64 bg-secondary/10 rounded-full blur-2xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-4"
      >
        {/* ── LEFT BENTO COLUMN ── */}
        <div className="hidden lg:flex flex-col gap-4 lg:col-span-5">

          {/* Brand hero card */}
          <div className="relative border-[3px] border-black bg-white p-8 flex-1 shadow-[10px_10px_0px_0px_#000] -rotate-1 rounded-[24px]">
            <div className="absolute inset-0 grid-bg opacity-20" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-10">
                <div className="w-28 h-28 border-[3px] border-black bg-primary flex items-center justify-center mx-auto mb-8 shadow-[6px_6px_0px_0px_#000] -rotate-3 rounded-full">
                  <Zap size={40} className="text-white" />
                </div>
                <span className="text-3xl font-black tracking-tighter text-black uppercase italic">Spotlight</span>
              </div>
              <h1 className="text-4xl font-black text-black leading-[0.9] mb-4 uppercase">
                Your memories,<br />
                <span className="shimmer-text">instantly found.</span>
              </h1>
              <p className="text-sm font-bold text-gray-600 leading-relaxed uppercase tracking-tight">
                AI-powered face recognition that surfaces every photo of you across thousands of event shots.
              </p>
            </div>

            {/* Floating photo strip */}
            <div className="relative z-10 mt-10 grid grid-cols-3 gap-3">
              {[
                "https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=200&q=60",
                "https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=200&q=60",
                "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=200&q=60",
              ].map((url, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="aspect-square border-2 border-black shadow-[4px_4px_0px_0px_#000] overflow-hidden rotate-2 rounded-[16px]"
                >
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </motion.div>
              ))}
            </div>
          </div>

          {/* Stats row — two bento cards */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: ImageIcon, value: formatCompact(homeMetrics.photosIndexed), label: "Photos indexed", color: "blue" },
              { icon: Users, value: formatCompact(homeMetrics.facesIndexed), label: "Faces indexed", color: "green" },
            ].map(({ icon: Icon, value, label, color }) => (
              <div
                key={label}
                className="border-[3px] border-black bg-white p-5 shadow-[6px_6px_0px_0px_#000] rotate-1 rounded-[24px]"
              >
                <div className={`w-14 h-14 border-2 border-black flex items-center justify-center mb-3 shadow-[3px_3px_0px_0px_#000] rounded-full ${
                  color === "blue" ? "bg-primary text-white" : "bg-green-500 text-white"
                }`}>
                  <Icon size={24} />
                </div>
                <div className="text-3xl font-black text-black leading-none">{value}</div>
                <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-2">{label}</div>
              </div>
            ))}
          </div>

          {/* Feature pill cards */}
          <div className="grid grid-cols-2 gap-4">
            <div className="border-[3px] border-black bg-white p-4 shadow-[6px_6px_0px_0px_#000] flex items-center gap-3 -rotate-1 rounded-[24px]">
              <div className="w-14 h-14 border-2 border-black bg-purple-500 text-white flex items-center justify-center flex-shrink-0 shadow-[3px_3px_0px_0px_#000] rounded-full">
                <Star size={24} />
              </div>
              <div>
                <div className="text-[10px] font-black text-black uppercase">{homeMetrics.matchRate.toFixed(1)}% accuracy</div>
                <div className="text-[10px] font-bold text-gray-500 uppercase">Match rate</div>
              </div>
            </div>
            <div className="border-[3px] border-black bg-white p-4 shadow-[6px_6px_0px_0px_#000] flex items-center gap-3 rotate-1 rounded-[24px]">
              <div className="w-14 h-14 border-2 border-black bg-orange-500 text-white flex items-center justify-center flex-shrink-0 shadow-[3px_3px_0px_0px_#000] rounded-full">
                <TrendingUp size={24} />
              </div>
              <div>
                <div className="text-[10px] font-black text-black uppercase">{homeMetrics.avgSearchSeconds.toFixed(1)}s average</div>
                <div className="text-[10px] font-bold text-gray-500 uppercase">Search time</div>
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT BENTO COLUMN — Login form ── */}
        <div className="lg:col-span-7 flex flex-col gap-4">

          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 px-1 mb-4">
            <div className="w-14 h-14 border-[3px] border-black bg-primary flex items-center justify-center shadow-[3px_3px_0px_0px_#000] rounded-full">
              <Zap size={24} className="text-white" />
            </div>
            <span className="text-2xl font-black tracking-tight text-black uppercase italic">Spotlight</span>
          </div>

          {/* Tab toggle card */}
          <div className="border-[3px] border-black bg-white p-2 flex gap-2 shadow-[8px_8px_0px_0px_#000] rounded-[24px]">
            <button
              onClick={() => switchTab("participant")}
              className={`flex-1 flex items-center justify-center gap-3 py-4 px-4 border-[3px] font-black uppercase text-xs tracking-widest transition-all rounded-[18px] ${
                activeTab === "participant"
                  ? "bg-primary text-white border-black shadow-[4px_4px_0px_0px_#000] translate-x-[-2px] translate-y-[-2px]"
                  : "bg-white text-black border-transparent hover:bg-gray-50"
              }`}
            >
              <Camera size={16} />
              Find My Photos
            </button>
            <button
              onClick={() => switchTab("admin")}
              className={`flex-1 flex items-center justify-center gap-3 py-4 px-4 border-[3px] font-black uppercase text-xs tracking-widest transition-all rounded-[18px] ${
                activeTab === "admin"
                  ? "bg-primary text-white border-black shadow-[4px_4px_0px_0px_#000] translate-x-[-2px] translate-y-[-2px]"
                  : "bg-white text-black border-transparent hover:bg-gray-50"
              }`}
            >
              <Shield size={16} />
              Organizer Login
            </button>
          </div>

          {/* Form bento card */}
          <div className="border-[3px] border-black rounded-[32px] bg-white p-12 shadow-[12px_12px_0px_0px_#000] rotate-1 relative overflow-hidden flex-1 p-1">
            <div className="border-2 border-black/10 h-full">
            <AnimatePresence mode="wait">

              {activeTab === "participant" && participantStep === "login" && (
                <motion.form
                  key="p-login"
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handleParticipantStep1}
                  className="p-8 space-y-5"
                >
                  <div>
                    <div className="text-[10px] text-primary font-black uppercase tracking-[0.2em] mb-2">Step 1 of 2</div>
                    <h2 className="text-4xl font-black text-black uppercase italic mb-1">Welcome</h2>
                    <p className="text-xs font-bold text-gray-500 uppercase">Access your event photos here</p>
                  </div>

                  <div className="space-y-4">
                    <div className="relative group">
                      <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-black" />
                      <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full Name" required
                        className="w-full bg-white border-[3px] border-black px-12 py-4 text-black font-bold placeholder:text-gray-400 focus:outline-none focus:ring-0 focus:shadow-[4px_4px_0px_0px_#2563eb] transition-all rounded-[16px]" />
                    </div>
                    <div className="relative group">
                      <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-black" />
                      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email Address" required
                        className="w-full bg-white border-[3px] border-black px-12 py-4 text-black font-bold placeholder:text-gray-400 focus:outline-none focus:ring-0 focus:shadow-[4px_4px_0px_0px_#2563eb] transition-all rounded-[16px]" />
                    </div>
                  </div>

                  <button type="submit" disabled={loading}
                    className="w-full bg-primary text-white text-xs font-black uppercase tracking-widest py-5 border-[3px] border-black shadow-[8px_8px_0px_0px_#000] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[10px_10px_0px_0px_#000] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[0px_0px_0px_0px_#000] transition-all rounded-[24px] flex items-center justify-center gap-3">
                    {loading ? <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" /> : <><span>Continue</span><ChevronRight size={20} /></>}
                  </button>

                  <div className="text-center text-[10px] font-black uppercase tracking-widest text-gray-400">
                  <button type="button" onClick={() => onLogin("participant", undefined, participantProfile ?? undefined)} className="text-primary hover:underline">Quick Skip to Demo</button>
                  </div>
                </motion.form>
              )}

              {activeTab === "participant" && participantStep === "join" && (
                <motion.form
                  key="p-join"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handleParticipantJoin}
                  className="p-8 space-y-5"
                >
                  <div className="flex items-start gap-4">
                    <button type="button" onClick={() => setParticipantStep("login")}
                      className="w-10 h-10 border-2 border-black bg-white flex items-center justify-center text-black shadow-[3px_3px_0px_0px_#000] hover:bg-gray-50 transition-all flex-shrink-0">
                      <ArrowLeft size={18} />
                    </button>
                    <div>
                      <div className="text-[10px] text-primary font-black uppercase tracking-[0.2em] mb-1">Step 2 of 2</div>
                      <h2 className="text-3xl font-black text-black uppercase italic mb-1">Join Event</h2>
                      <p className="text-xs font-bold text-gray-500 uppercase tracking-tight">Enter your unique code</p>
                    </div>
                  </div>

                  {/* Step dots */}
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 border-2 border-black bg-green-500 shadow-[2px_2px_0px_0px_#000]" />
                    <div className="flex-1 h-1 bg-black/10" />
                    <div className="w-5 h-5 border-[3px] border-black bg-primary shadow-[2px_2px_0px_0px_#000]" />
                  </div>

                  <input type="text" value={eventCode} onChange={(e) => setEventCode(e.target.value.toUpperCase())} placeholder="EVENT-CODE-2025"
                    className="w-full bg-white border-[3px] border-black px-5 py-5 text-black font-black placeholder:text-gray-300 focus:outline-none focus:shadow-[4px_4px_0px_0px_#2563eb] text-center tracking-[0.2em] transition-all" />

                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest bg-gray-50 border-2 border-black p-4 text-center">
                    No code? You'll still see recent gallery activity.
                  </div>

                  <button type="submit" disabled={loading}
                    className="w-full bg-primary text-white border-[3px] border-black font-black uppercase tracking-widest py-5 shadow-[6px_6px_0px_0px_#000] hover:shadow-[10px_10px_0px_0px_#000] hover:translate-y-[-2px] active:translate-y-[2px] active:shadow-[0px_0px_0px_0px_#000] transition-all flex items-center justify-center gap-3">
                    {loading ? <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" /> : <><span>Enter Gallery</span><ChevronRight size={20} /></>}
                  </button>

                  <button type="button" onClick={() => onLogin("participant", undefined, participantProfile ?? undefined)}
                    className="w-full text-[10px] font-black uppercase text-gray-400 hover:text-black tracking-[0.2em] py-2 transition-colors">
                    Skip Registration
                  </button>
                </motion.form>
              )}

              {activeTab === "admin" && (
                <motion.form
                  key="admin"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -16 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={adminMode === "signin" ? handleAdminLogin : handleAdminSignup}
                  className="p-8 space-y-5"
                >
                  <div>
                    <div className="text-[10px] text-primary font-black uppercase tracking-[0.2em] mb-2">Organizer Access</div>
                    <h2 className="text-4xl font-black text-black uppercase italic mb-1">
                      {adminMode === "signin" ? "Admin Portal" : "Create Account"}
                    </h2>
                    <p className="text-xs font-bold text-gray-500 uppercase">
                      {adminMode === "signin" ? "Manage your events & collections" : "Sign up as an organizer"}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 border-2 border-black p-1 rounded-[16px]">
                    <button
                      type="button"
                      onClick={() => setAdminMode("signin")}
                      className={`text-[10px] font-black uppercase tracking-widest py-2 border-2 border-black transition-all rounded-[12px] ${
                        adminMode === "signin" ? "bg-primary text-white" : "bg-white text-black"
                      }`}
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdminMode("signup")}
                      className={`text-[10px] font-black uppercase tracking-widest py-2 border-2 border-black transition-all rounded-[12px] ${
                        adminMode === "signup" ? "bg-primary text-white" : "bg-white text-black"
                      }`}
                    >
                      Sign Up
                    </button>
                  </div>

                  <div className="space-y-4">
                    {adminMode === "signup" && (
                      <div className="relative">
                        <UserPlus size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-black" />
                        <input type="text" value={adminName} onChange={(e) => setAdminName(e.target.value)} placeholder="Full Name" required
                          className="w-full bg-white border-[3px] border-black px-12 py-4 font-bold focus:shadow-[4px_4px_0px_0px_#2563eb] transition-all" />
                      </div>
                    )}
                    <div className="relative">
                      <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-black" />
                      <input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} placeholder="Email" required
                        className="w-full bg-white border-[3px] border-black px-12 py-4 font-bold focus:shadow-[4px_4px_0px_0px_#2563eb] transition-all" />
                    </div>
                    <div className="relative">
                      <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-black" />
                      <input type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} placeholder="Password" required
                        className="w-full bg-white border-[3px] border-black px-12 py-4 font-bold focus:shadow-[4px_4px_0px_0px_#2563eb] transition-all" />
                    </div>
                  </div>

                  <button type="submit" disabled={loading}
                    className="w-full bg-primary text-white border-[3px] border-black font-black uppercase tracking-widest py-5 shadow-[6px_6px_0px_0px_#000] hover:shadow-[10px_10px_0px_0px_#000] transition-all flex items-center justify-center gap-3">
                    {loading ? <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" /> : (
                      <>
                        <span>{adminMode === "signin" ? "Sign In" : "Sign Up"}</span>
                        <ChevronRight size={20} />
                      </>
                    )}
                  </button>

                  <div className="text-center">
                    <button type="button" onClick={() => onLogin("admin")} className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline">Quick Admin Skip</button>
                  </div>
                </motion.form>
              )}

            </AnimatePresence>
            </div>
          </div>

          {/* Bottom tag */}
          <p className="text-center text-xs text-muted-foreground">
            Powered by AI face recognition · End-to-end encrypted
          </p>
        </div>
      </motion.div>
    </div>
  );
}
