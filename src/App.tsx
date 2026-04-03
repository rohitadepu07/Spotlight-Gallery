import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import LoginPage from "@/pages/LoginPage";
import AdminDashboard from "@/pages/AdminDashboard";
import ParticipantDashboard from "@/pages/ParticipantDashboard";
import { UserProfile } from "@/types";

const queryClient = new QueryClient();

type AppScreen = "login" | "admin" | "participant";

function SpotlightApp() {
  const [screen, setScreen] = useState<AppScreen>("login");
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [activePhotoId, setActivePhotoId] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const eventParam = params.get("event");
    const photoParam = params.get("photo");
    if (eventParam) {
      setActiveEventId(eventParam);
      setActivePhotoId(photoParam);
      setScreen("participant");
    }
  }, []);

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
    setCurrentUser(userProfile ?? null);
    setScreen(role);
  };

  const handleLogout = () => {
    setScreen("login");
    setActiveEventId(null);
    setActivePhotoId(null);
    setCurrentUser(null);
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
    </QueryClientProvider>
  );
}
