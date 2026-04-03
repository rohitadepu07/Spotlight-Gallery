import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Camera, User, Mail, Phone, ArrowLeft, LogOut,
  Check, Pencil, Shield, Bell, Lock,
} from "lucide-react";
import { UserProfile } from "@/types";

interface ProfileViewProps {
  onBack: () => void;
  onLogout: () => void;
  role: "admin" | "participant";
  initialProfile?: UserProfile | null;
}

type EditableProfile = {
  name: string;
  email: string;
  phone: string;
  bio: string;
  avatar: string | null;
};

const INITIAL: EditableProfile = {
  name: "Alex Johnson",
  email: "alex@example.com",
  phone: "+1 (555) 012-3456",
  bio: "Event photography enthusiast.",
  avatar: null as string | null,
};

function buildInitialProfile(role: "admin" | "participant", profile?: UserProfile | null): EditableProfile {
  if (!profile) return INITIAL;
  return {
    name: profile.name || INITIAL.name,
    email: profile.email || INITIAL.email,
    phone: profile.phone || "",
    bio: profile.bio || (role === "admin" ? "Event organizer" : "Event guest"),
    avatar: null,
  };
}

export default function ProfileView({ onBack, onLogout, role, initialProfile }: ProfileViewProps) {
  const [profile, setProfile] = useState<EditableProfile>(buildInitialProfile(role, initialProfile));
  const [draft, setDraft] = useState<EditableProfile>(buildInitialProfile(role, initialProfile));
  const [editing, setEditing] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const seeded = buildInitialProfile(role, initialProfile);
    setProfile(seeded);
    setDraft(seeded);
  }, [initialProfile, role]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      setDraft((d) => ({ ...d, avatar: src }));
      setProfile((p) => ({ ...p, avatar: src }));
    };
    reader.readAsDataURL(file);
  };

  const save = () => {
    setProfile(draft);
    setEditing(null);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const field = (key: keyof typeof draft, label: string, icon: React.ReactNode, type = "text") => {
    const isActive = editing === key;
    return (
      <motion.div
        layout
        className={`border-[3px] border-black bg-white p-5 transition-all duration-200 rounded-[24px] ${
          isActive ? "shadow-[8px_8px_0px_0px_#2563eb] translate-x-[-2px] translate-y-[-2px]" : "shadow-[5px_5px_0px_0px_#000]"
        }`}
      >
        <div className="flex items-center gap-2 mb-3">
          <div className="w-12 h-12 border-2 border-black bg-gray-100 flex items-center justify-center text-black shadow-[3px_3px_0px_0px_#000] rounded-full">
            {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { size: 20 }) : icon}
          </div>
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
          {!isActive && (
            <button
              onClick={() => setEditing(key)}
              className="ml-auto w-8 h-8 border-2 border-black bg-white hover:bg-gray-100 flex items-center justify-center text-black shadow-[2px_2px_0px_0px_#000] transition-all rounded-lg"
            >
              <Pencil size={13} />
            </button>
          )}
        </div>

        {isActive ? (
          <div className="space-y-4">
            <input
              type={type}
              value={draft[key] as string}
              onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
              autoFocus
              className="w-full bg-white border-[3px] border-black px-4 py-3 text-black font-black placeholder:text-gray-400 focus:outline-none focus:shadow-[4px_4px_0px_0px_#2563eb] transition-all rounded-[12px]"
            />
            <div className="flex gap-2">
              <button
                onClick={save}
                className="flex-1 bg-primary text-white text-[10px] font-black uppercase tracking-widest py-3 border-[3px] border-black shadow-[4px_4px_0px_0px_#000] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all flex items-center justify-center gap-2"
              >
                <Check size={14} /> Save
              </button>
              <button
                onClick={() => { setDraft((d) => ({ ...d, [key]: profile[key] })); setEditing(null); }}
                className="flex-1 bg-white text-black text-[10px] font-black uppercase tracking-widest py-3 border-[3px] border-black shadow-[4px_4px_0px_0px_#000] hover:bg-gray-100 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="text-sm font-black text-black uppercase tracking-tight">{profile[key] as string || <span className="text-gray-400 italic">Not set</span>}</div>
        )}
      </motion.div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      transition={{ duration: 0.22 }}
      className="min-h-screen bg-background"
    >
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b-[3px] border-black px-5 h-16 flex items-center gap-4 shadow-sm">
        <button
          onClick={onBack}
          className="w-14 h-14 border-2 border-black bg-white flex items-center justify-center text-black shadow-[4px_4px_0px_0px_#000] hover:bg-gray-50 transition-all rounded-full"
        >
          <ArrowLeft size={24} />
        </button>
        <span className="font-black text-lg uppercase italic tracking-tighter">Profile</span>
        <div className="flex-1" />
        {saved && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-green-600"
          >
            <Check size={14} /> Saved
          </motion.div>
        )}
      </header>

      <main className="p-4 max-w-xl mx-auto space-y-4 pb-12">

        {/* ── Avatar hero card ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
          className="border-[3px] border-black bg-white p-8 flex flex-col items-center gap-6 shadow-[10px_10px_0px_0px_#000] -rotate-1 relative overflow-hidden rounded-[32px]"
        >
          <div className="absolute inset-0 grid-bg opacity-10" />
          <div className="relative z-10">
            <div className="w-28 h-28 border-[3px] border-black bg-gray-100 flex items-center justify-center shadow-[5px_5px_0px_0px_#000] rotate-2 overflow-hidden">
              {profile.avatar
                ? <img src={profile.avatar} alt="" className="w-full h-full object-cover" />
                : <User size={48} className="text-gray-400" />}
            </div>
            <label className="absolute -bottom-2 -right-2 w-10 h-10 border-2 border-black bg-primary flex items-center justify-center cursor-pointer shadow-[3px_3px_0px_0px_#000] hover:translate-x-[-1px] hover:translate-y-[-1px] transition-all">
              <Camera size={20} className="text-white" />
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </label>
          </div>

          <div className="text-center relative z-10">
            <div className="text-2xl font-black text-black uppercase italic tracking-tighter">{profile.name}</div>
            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">{profile.email}</div>
            <div className={`mt-4 inline-block text-[10px] font-black uppercase tracking-[0.2em] px-4 py-1.5 border-2 border-black shadow-[3px_3px_0px_0px_#000] ${
              role === "admin" ? "bg-primary text-white" : "bg-green-500 text-white"
            }`}>
              {role === "admin" ? "Organizer" : "Attendee"}
            </div>
          </div>
        </motion.div>

        {/* ── Field cards ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}>
          {field("name", "Full Name", <User size={14} />)}
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.09 }}>
          {field("email", "Email Address", <Mail size={14} />, "email")}
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
          {field("phone", "Phone Number", <Phone size={14} />, "tel")}
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
          {field("bio", "Bio", <Pencil size={14} />)}
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.17 }}>
          <div className="border-[3px] border-black bg-white p-5 shadow-[5px_5px_0px_0px_#000] rounded-[24px]">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-12 h-12 border-2 border-black bg-gray-100 flex items-center justify-center text-black shadow-[3px_3px_0px_0px_#000] rounded-full">
                <Shield size={20} />
              </div>
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Role</span>
            </div>
            <div className="text-sm font-black text-black uppercase tracking-tight">
              {role === "admin" ? "Organizer" : "Participant"}
            </div>
          </div>
        </motion.div>

        {/* ── Preferences bento row ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
          className="grid grid-cols-2 gap-6">
          <div className="border-[3px] border-black bg-white p-6 shadow-[8px_8px_0px_0px_#000] flex flex-col gap-4 rotate-1 rounded-[24px]">
            <div className="w-10 h-10 border-2 border-black bg-purple-500 flex items-center justify-center shadow-[3px_3px_0px_0px_#000]">
              <Bell size={20} className="text-white" />
            </div>
            <div>
              <div className="text-sm font-black text-black uppercase tracking-tight">Notifications</div>
              <div className="text-[10px] font-bold text-gray-500 uppercase mt-1">Photo alerts</div>
            </div>
            <label className="flex items-center gap-3 cursor-pointer mt-auto">
              <div className="relative w-12 h-6 border-2 border-black bg-primary">
                <div className="absolute right-1 top-1 w-3 h-3 bg-white border border-black shadow" />
              </div>
              <span className="text-[10px] text-primary font-black uppercase tracking-widest">On</span>
            </label>
          </div>

          <div className="border-[3px] border-black bg-white p-6 shadow-[8px_8px_0px_0px_#000] flex flex-col gap-4 -rotate-1 rounded-[24px]">
            <div className="w-10 h-10 border-2 border-black bg-orange-500 flex items-center justify-center shadow-[3px_3px_0px_0px_#000]">
              <Lock size={20} className="text-white" />
            </div>
            <div>
              <div className="text-sm font-black text-black uppercase tracking-tight">Privacy</div>
              <div className="text-[10px] font-bold text-gray-500 uppercase mt-1">Profile visibility</div>
            </div>
            <div className="mt-auto text-[10px] font-black text-orange-600 uppercase tracking-widest">Members only</div>
          </div>
        </motion.div>

        {/* ── Account security card ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.21 }}
          className="border-[3px] border-black bg-white p-6 shadow-[8px_8px_0px_0px_#000] rounded-[24px]">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 border-2 border-black bg-gray-100 flex items-center justify-center shadow-[2px_2px_0px_0px_#000]">
              <Shield size={16} className="text-black" />
            </div>
            <span className="text-[10px] font-black text-black uppercase tracking-widest">Security Configuration</span>
          </div>
          <div className="space-y-2">
            {["Change Password", "Two-Factor Auth", "Connected Devices"].map((item) => (
              <button key={item}
                className="w-full flex items-center justify-between px-4 py-4 border-2 border-transparent hover:border-black hover:bg-gray-50 transition-all group">
                <span className="text-xs font-black text-black uppercase tracking-tight">{item}</span>
                <ArrowLeft size={16} className="text-black rotate-180 group-hover:translate-x-1 transition-transform" />
              </button>
            ))}
          </div>
        </motion.div>

        {/* ── Danger zone: sign out ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }}>
          <button
            onClick={onLogout}
            className="w-full border-[3px] border-black bg-white hover:bg-red-50 p-6 flex items-center gap-5 transition-all group text-left shadow-[8px_8px_0px_0px_#ef4444] rounded-[24px]"
          >
            <div className="w-16 h-16 border-2 border-black bg-red-500 flex items-center justify-center flex-shrink-0 shadow-[4px_4px_0px_0px_#000] rounded-full">
              <LogOut size={28} className="text-white" />
            </div>
            <div>
              <div className="text-sm font-black text-red-600 uppercase italic">Sign Out</div>
              <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Exit secure session</div>
            </div>
          </button>
        </motion.div>

      </main>
    </motion.div>
  );
}
