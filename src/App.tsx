import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import LoginPage from "@/pages/LoginPage";
import AdminDashboard from "@/pages/AdminDashboard";
import ParticipantDashboard from "@/pages/ParticipantDashboard";
import { UserProfile } from "@/types";

const queryClient = new QueryClient();

type AppScreen = "login" | "admin" | "participant";
const SESSION_KEY = "spotlight.session.v1";
const STUDENT_AVATAR_KEY_PREFIX = "spotlight_student_avatar:";

interface PersistedSession {
  screen: AppScreen;
  activeEventId: string | null;
  activePhotoId: string | null;
  currentUser: UserProfile | null;
}

const toAvatarKey = (email: string) => `${STUDENT_AVATAR_KEY_PREFIX}${email.trim().toLowerCase()}`;

function hydrateParticipantAvatar(profile: UserProfile | null): UserProfile | null {
  if (!profile || profile.role !== "participant" || profile.avatarUrl || !profile.email) {
    return profile;
  }
  const cachedAvatar = window.localStorage.getItem(toAvatarKey(profile.email));
  if (!cachedAvatar) {
    return profile;
  }
  return { ...profile, avatarUrl: cachedAvatar };
}

function SpotlightApp() {
  const [screen, setScreen] = useState<AppScreen>("login");
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [activePhotoId, setActivePhotoId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const eventParam = params.get("event");
    const photoParam = params.get("photo");
    const savedRaw = window.localStorage.getItem(SESSION_KEY);
    let saved: PersistedSession | null = null;
    if (savedRaw) {
      try {
        saved = JSON.parse(savedRaw) as PersistedSession;
      } catch {
        saved = null;
      }
    }

    if (eventParam) {
      setActiveEventId(eventParam);
      setActivePhotoId(photoParam);
      setScreen("participant");
      if (saved?.currentUser?.role === "participant") {
        setCurrentUser(hydrateParticipantAvatar(saved.currentUser));
      }
      setIsHydrated(true);
      return;
    }

    if (saved && saved.screen !== "login") {
      setScreen(saved.screen);
      setActiveEventId(saved.activeEventId ?? null);
      setActivePhotoId(saved.activePhotoId ?? null);
      setCurrentUser(hydrateParticipantAvatar(saved.currentUser ?? null));
    }
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    if (screen === "login") {
      window.localStorage.removeItem(SESSION_KEY);
      return;
    }

    const payload: PersistedSession = {
      screen,
      activeEventId,
      activePhotoId,
      currentUser,
    };
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(payload));
  }, [isHydrated, screen, activeEventId, activePhotoId, currentUser]);

  const handleLogin = (
    role: "admin" | "participant",
    eventId?: string,
    userProfile?: UserProfile
  ) => {
    if (eventId) {
      setActiveEventId(eventId);
      setActivePhotoId(null);
    }
    if (!eventId) {
      setActiveEventId(null);
      setActivePhotoId(null);
    }
    setCurrentUser(hydrateParticipantAvatar(userProfile ?? null));
    setScreen(role);
  };

  const handleLogout = () => {
    setScreen("login");
    setActiveEventId(null);
    setActivePhotoId(null);
    setCurrentUser(null);
    window.localStorage.removeItem(SESSION_KEY);
  };

  return (
    <AnimatePresence mode="wait">
      {screen === "login" && (
        <motion.div
          key="login"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <LoginPage onLogin={handleLogin} />
        </motion.div>
      )}

      {screen === "admin" && (
        <motion.div
          key="admin"
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        >
          <AdminDashboard onLogout={handleLogout} userProfile={currentUser} />
        </motion.div>
      )}

      {screen === "participant" && (
        <motion.div
          key="participant"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -24 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        >
          <ParticipantDashboard
            onLogout={handleLogout}
            eventId={activeEventId}
            photoId={activePhotoId}
            userProfile={currentUser}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SpotlightApp />
      <Toaster position="top-right" richColors closeButton />
    </QueryClientProvider>
  );
}
