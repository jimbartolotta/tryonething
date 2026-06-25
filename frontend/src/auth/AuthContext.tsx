import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";

const API_BASE = "/api";

interface Coach {
  id: string;
  name: string;
  email: string;
}

interface AuthState {
  coach: Coach | null;
  token: string | null;
  loading: boolean;
}

interface AuthContextType extends AuthState {
  signup: (name: string, email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    coach: null,
    token: null,
    loading: true,
  });

  // On mount, try to restore session from localStorage
  useEffect(() => {
    const token = localStorage.getItem("tot-token");
    if (token) {
      fetch(`${API_BASE}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => {
          if (!res.ok) throw new Error("Session expired");
          return res.json();
        })
        .then((data) => {
          setState({ coach: data.coach, token, loading: false });
        })
        .catch(() => {
          localStorage.removeItem("tot-token");
          setState({ coach: null, token: null, loading: false });
        });
    } else {
      setState((s) => ({ ...s, loading: false }));
    }
  }, []);

  const signup = useCallback(async (name: string, email: string, password: string) => {
    const res = await fetch(`${API_BASE}/auth/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Signup failed");
    localStorage.setItem("tot-token", data.token);
    setState({ coach: data.coach, token: data.token, loading: false });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Login failed");
    localStorage.setItem("tot-token", data.token);
    setState({ coach: data.coach, token: data.token, loading: false });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("tot-token");
    setState({ coach: null, token: null, loading: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, signup, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}