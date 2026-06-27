import React, { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import CycleDetail from "./pages/CycleDetail";

function getPath(): string {
  return window.location.pathname;
}

function AppInner() {
  const { coach, loading } = useAuth();
  const [showLogin, setShowLogin] = useState(true);
  const [path, setPath] = useState(getPath);

  // Listen for navigation events from CycleDetail/Dashboard
  useEffect(() => {
    const handlePop = () => setPath(getPath());
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", fontFamily: "system-ui, sans-serif" }}>
        Loading...
      </div>
    );
  }

  // Route: Cycle detail (requires auth)
  if (coach && path.startsWith("/cycles/")) {
    return <CycleDetail />;
  }

  // Route: Dashboard (requires auth)
  if (coach) {
    return <Dashboard />;
  }

  // Not authenticated — show login/signup
  return showLogin ? (
    <Login onToggle={() => setShowLogin(false)} />
  ) : (
    <Signup onToggle={() => setShowLogin(true)} />
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}