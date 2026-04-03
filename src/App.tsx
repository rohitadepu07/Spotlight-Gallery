import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import LoginPage from "@/pages/LoginPage";
import AdminDashboard from "@/pages/AdminDashboard";
import ParticipantDashboard from "@/pages/ParticipantDashboard";

const queryClient = new QueryClient();

type AppScreen = "login" | "admin" | "participant";

function SpotlightApp() {
  const [screen, setScreen] = useState<AppScreen>("login");
  const [activeEventId, setActiveEventId] = useState<string | null>(null);

  const handleLogin = (role: "admin" | "participant", eventId?: string) => {
    if (eventId) setActiveEventId(eventId);
    setScreen(role);
  };

  const handleLogout = () => {
    setScreen("login");
    setActiveEventId(null);
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
          <AdminDashboard onLogout={handleLogout} />
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
          <ParticipantDashboard onLogout={handleLogout} eventId={activeEventId} />
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
