import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera, Shield, ChevronRight, Zap, Mail, Lock,
  ImageIcon, Users, Star, TrendingUp, UserPlus
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { UserProfile } from "@/types";
import { toast } from "sonner";

interface LoginPageProps {
  onLogin: (role: "admin" | "participant", eventId?: string, userProfile?: UserProfile) => void;
}
type AdminMode = "signin" | "signup";
type ParticipantMode = "signin" | "signup";
const STUDENT_AVATAR_KEY_PREFIX = "spotlight_student_avatar:";

const toAvatarKey = (email: string) => `${STUDENT_AVATAR_KEY_PREFIX}${email.trim().toLowerCase()}`;

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Could not read image file"));
    reader.readAsDataURL(file);
  });
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [activeTab, setActiveTab] = useState<"admin" | "participant">("participant");
  const [participantMode, setParticipantMode] = useState<ParticipantMode>("signin");
  const [participantName, setParticipantName] = useState("");
  const [participantEmail, setParticipantEmail] = useState("");
  const [participantPassword, setParticipantPassword] = useState("");
  const [participantSelfie, setParticipantSelfie] = useState<File | null>(null);
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
  const participantSignupMissingSelfie = participantMode === "signup" && !participantSelfie;

  const handleParticipantAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (participantMode === "signin") {
        const auth = await api.studentLogin(participantEmail.trim(), participantPassword);
        const savedAvatar = localStorage.getItem(toAvatarKey(auth.profile.email));
        toast.success("Signed in successfully.");
        onLogin("participant", undefined, {
          ...auth.profile,
          avatarUrl: savedAvatar || auth.profile.avatarUrl,
        });
        return;
      }

      if (!participantSelfie) {
        toast.error("Please upload a clear selfie to create your account.");
        return;
      }

      const selfieDataUrl = await fileToDataUrl(participantSelfie);
      const auth = await api.studentRegister(
        participantName.trim(),
        participantEmail.trim(),
        participantPassword,
        participantSelfie
      );
      localStorage.setItem(toAvatarKey(auth.profile.email), selfieDataUrl);
      toast.success("Student account created.");
      onLogin("participant", undefined, {
        ...auth.profile,
        avatarUrl: selfieDataUrl,
      });
    } catch (error) {
      if (
        (error instanceof ApiError && (error.status === 400 || error.status === 401)) ||
        (error instanceof Error && /invalid credentials|invalid username or password/i.test(error.message))
      ) {
        toast.error("Invalid username or password.");
      } else if (error instanceof ApiError && error.status === 409) {
        toast.error("Email already registered. Please sign in instead.");
      } else if (error instanceof Error && /no face detected/i.test(error.message)) {
        toast.error("No face detected in selfie. Please upload a clearer image.");
      } else {
        toast.error("Unable to continue right now. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const auth = await api.adminLogin(adminEmail.trim(), adminPassword);
      onLogin("admin", undefined, auth.profile);
    } catch (error) {
      if (
        (error instanceof ApiError && (error.status === 400 || error.status === 401)) ||
        (error instanceof Error && /invalid credentials/i.test(error.message))
      ) {
        toast.error("Invalid username or password.");
      } else {
        toast.error("Unable to sign in right now. Please try again.");
      }
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
    setParticipantMode("signin");
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

              {activeTab === "participant" && (
                <motion.form
                  key="participant-auth"
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handleParticipantAuth}
                  className="p-8 space-y-5"
                >
                  <div>
                    <div className="text-[10px] text-primary font-black uppercase tracking-[0.2em] mb-2">Student Access</div>
                    <h2 className="text-4xl font-black text-black uppercase italic mb-1">
                      {participantMode === "signin" ? "Student Login" : "Create Student Account"}
                    </h2>
                    <p className="text-xs font-bold text-gray-500 uppercase">
                      {participantMode === "signin" ? "View your enrolled event photos" : "Sign up to auto-match your event photos"}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 border-2 border-black p-1 rounded-[16px]">
                    <button
                      type="button"
                      onClick={() => setParticipantMode("signin")}
                      className={`text-[10px] font-black uppercase tracking-widest py-2 border-2 border-black transition-all rounded-[12px] ${
                        participantMode === "signin" ? "bg-primary text-white" : "bg-white text-black"
                      }`}
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      onClick={() => setParticipantMode("signup")}
                      className={`text-[10px] font-black uppercase tracking-widest py-2 border-2 border-black transition-all rounded-[12px] ${
                        participantMode === "signup" ? "bg-primary text-white" : "bg-white text-black"
                      }`}
                    >
                      Sign Up
                    </button>
                  </div>

                  <div className="space-y-4">
                    {participantMode === "signup" && (
                      <div className="relative">
                        <UserPlus size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-black" />
                        <input
                          type="text"
                          value={participantName}
                          onChange={(e) => setParticipantName(e.target.value)}
                          placeholder="Full Name"
                          required
                          className="w-full bg-white border-[3px] border-black px-12 py-4 font-bold focus:shadow-[4px_4px_0px_0px_#2563eb] transition-all"
                        />
                      </div>
                    )}
                    <div className="relative">
                      <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-black" />
                      <input
                        type="email"
                        value={participantEmail}
                        onChange={(e) => setParticipantEmail(e.target.value)}
                        placeholder="Email"
                        required
                        className="w-full bg-white border-[3px] border-black px-12 py-4 font-bold focus:shadow-[4px_4px_0px_0px_#2563eb] transition-all"
                      />
                    </div>
                    <div className="relative">
                      <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-black" />
                      <input
                        type="password"
                        value={participantPassword}
                        onChange={(e) => setParticipantPassword(e.target.value)}
                        placeholder="Password"
                        required
                        className="w-full bg-white border-[3px] border-black px-12 py-4 font-bold focus:shadow-[4px_4px_0px_0px_#2563eb] transition-all"
                      />
                    </div>

                    {participantMode === "signup" && (
                      <label className="block w-full bg-white border-[3px] border-black px-5 py-4 font-bold cursor-pointer hover:bg-gray-50 transition-all">
                        {participantSelfie ? `Selfie: ${participantSelfie.name}` : "Upload Selfie (Required)"}
                        <input
                          type="file"
                          accept="image/*"
                          required={participantMode === "signup"}
                          className="hidden"
                          onChange={(e) => setParticipantSelfie(e.target.files?.[0] ?? null)}
                        />
                      </label>
                    )}
                  </div>

                  <button type="submit" disabled={loading || participantSignupMissingSelfie}
                    className={`w-full border-[3px] border-black font-black uppercase tracking-widest py-5 shadow-[6px_6px_0px_0px_#000] transition-all flex items-center justify-center gap-3 ${
                      participantSignupMissingSelfie || loading
                        ? "bg-gray-300 text-gray-700 cursor-not-allowed"
                        : "bg-primary text-white hover:shadow-[10px_10px_0px_0px_#000]"
                    }`}>
                    {loading ? <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" /> : (
                      <>
                        <span>{participantMode === "signin" ? "Sign In" : "Create Account"}</span>
                        <ChevronRight size={20} />
                      </>
                    )}
                  </button>
                  {participantSignupMissingSelfie && (
                    <p className="text-[10px] font-black text-red-600 uppercase tracking-widest text-center">
                      Selfie upload is required to register.
                    </p>
                  )}

                  <div className="text-center">
                    <button type="button" onClick={() => onLogin("participant")} className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline">Quick Demo Skip</button>
                  </div>
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
