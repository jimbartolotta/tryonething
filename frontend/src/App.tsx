import React, { useState } from "react";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";

function AppInner() {
  const { coach, loading } = useAuth();
  const [showLogin, setShowLogin] = useState(true);

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: "center", fontFamily: "system-ui, sans-serif" }}>
        Loading...
      </div>
    );
  }

  if (coach) {
    return <Dashboard />;
  }

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