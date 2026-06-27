import React, { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../auth/AuthContext";

interface Client {
  id: string;
  name: string;
  email: string | null;
  activeCycle: {
    id: string;
    change: string;
    stage: string;
    checkInCount: number;
    createdAt: string;
  } | null;
  completedCycles: number;
}

interface DashboardData {
  coach: { id: string; name: string; email: string };
  clients: Client[];
}

function navigate(path: string) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new Event("popstate"));
}

export default function Dashboard() {
  const { coach, token, logout } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddClient, setShowAddClient] = useState(false);
  const [newClientName, setNewClientName] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");

  // Start cycle state
  const [startCycleFor, setStartCycleFor] = useState<string | null>(null);
  const [newChange, setNewChange] = useState("");
  const [startError, setStartError] = useState("");

  const fetchDashboard = async () => {
    try {
      const res = await fetch("/api/dashboard", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load");
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [token]);

  const handleAddClient = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/dashboard/clients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newClientName,
          email: newClientEmail || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to add client");
      setNewClientName("");
      setNewClientEmail("");
      setShowAddClient(false);
      fetchDashboard();
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartCycle = async (e: FormEvent) => {
    e.preventDefault();
    if (!startCycleFor) return;
    setStartError("");
    try {
      const res = await fetch("/api/cycles", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ clientId: startCycleFor, change: newChange }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Failed to start cycle");
      }
      setNewChange("");
      setStartCycleFor(null);
      fetchDashboard();
    } catch (err) {
      setStartError((err as Error).message);
    }
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: "center" }}>Loading...</div>;
  }

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "20px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div>
          <h1 style={{ margin: 0 }}>Try One Thing</h1>
          <p style={{ color: "#666", margin: "4px 0 0" }}>
            Welcome, {data?.coach?.name ?? coach?.name}
          </p>
        </div>
        <button onClick={logout} style={logoutBtnStyle}>
          Sign Out
        </button>
      </div>

      {/* Clients section */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Clients</h2>
        <button onClick={() => setShowAddClient(!showAddClient)} style={addBtnStyle}>
          {showAddClient ? "Cancel" : "+ Add Client"}
        </button>
      </div>

      {showAddClient && (
        <form onSubmit={handleAddClient} style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <input
            type="text"
            placeholder="Client name"
            value={newClientName}
            onChange={(e) => setNewClientName(e.target.value)}
            required
            style={{ flex: 1, padding: "8px 12px", borderRadius: 6, border: "1px solid #ddd", fontSize: 14 }}
          />
          <input
            type="email"
            placeholder="Email (optional)"
            value={newClientEmail}
            onChange={(e) => setNewClientEmail(e.target.value)}
            style={{ flex: 1, padding: "8px 12px", borderRadius: 6, border: "1px solid #ddd", fontSize: 14 }}
          />
          <button type="submit" style={saveBtnStyle}>Save</button>
        </form>
      )}

      {/* Start cycle form */}
      {startCycleFor && (
        <div style={{ marginBottom: 16, padding: 16, borderRadius: 8, border: "1px solid #e5e7eb", background: "#f9fafb" }}>
          <p style={{ margin: "0 0 8px", fontWeight: 600, fontSize: 14 }}>
            One change per cycle. What's the one thing?
          </p>
          <form onSubmit={handleStartCycle}>
            <input
              type="text"
              placeholder='e.g. "Morning walk by 7am"'
              value={newChange}
              onChange={(e) => setNewChange(e.target.value)}
              required
              style={{ display: "block", width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #ddd", fontSize: 14, marginBottom: 8, boxSizing: "border-box" }}
            />
            {startError && <p style={{ color: "#dc2626", fontSize: 13, margin: "0 0 8px" }}>{startError}</p>}
            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" style={saveBtnStyle}>Start Cycle</button>
              <button onClick={() => { setStartCycleFor(null); setNewChange(""); setStartError(""); }} style={logoutBtnStyle}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {/* Client list */}
      {data?.clients && data.clients.length > 0 ? (
        <div style={{ display: "grid", gap: 12 }}>
          {data.clients.map((client) => (
            <div key={client.id} style={cardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <strong style={{ fontSize: 16 }}>{client.name}</strong>
                  {client.email && (
                    <span style={{ color: "#666", marginLeft: 8, fontSize: 14 }}>{client.email}</span>
                  )}
                </div>
                <span style={{ fontSize: 13, color: "#666" }}>
                  {client.completedCycles} completed
                </span>
              </div>
              {client.activeCycle ? (
                <div
                  onClick={() => navigate(`/cycles/${client.activeCycle.id}`)}
                  style={{ marginTop: 12, padding: 12, background: "#f0fdf4", borderRadius: 6, border: "1px solid #bbf7d0", cursor: "pointer" }}
                >
                  <p style={{ margin: "0 0 4px", fontSize: 14, color: "#166534" }}>
                    <strong>Active cycle</strong> — {client.activeCycle.stage}
                  </p>
                  <p style={{ margin: 0, fontSize: 14, color: "#166534" }}>
                    {client.activeCycle.change}
                  </p>
                  <p style={{ margin: "4px 0 0", fontSize: 12, color: "#166534" }}>
                    Check-ins: {client.activeCycle.checkInCount} — Click to view
                  </p>
                </div>
              ) : (
                <button
                  onClick={() => setStartCycleFor(client.id)}
                  style={startCycleBtnStyle}
                >
                  + Start New Cycle
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div style={emptyStyle}>
          <p style={{ margin: 0, color: "#666" }}>No clients yet. Add your first client above.</p>
        </div>
      )}

      {/* Footer */}
      <footer style={{ marginTop: 48, paddingTop: 16, borderTop: "1px solid #eee", fontSize: 12, color: "#999" }}>
        <strong>Methodology:</strong> Commit → Track → Gauge → Verdict → Bank — Honest verdicts only. No streaks. No gamification.
      </footer>
    </div>
  );
}

const cardStyle: React.CSSProperties = {
  padding: 16,
  borderRadius: 8,
  border: "1px solid #e5e7eb",
  background: "#fff",
};

const emptyStyle: React.CSSProperties = {
  ...cardStyle,
  textAlign: "center",
  padding: 40,
};

const logoutBtnStyle: React.CSSProperties = {
  padding: "8px 16px",
  borderRadius: 6,
  border: "1px solid #ddd",
  background: "#fff",
  cursor: "pointer",
  fontSize: 14,
};

const addBtnStyle: React.CSSProperties = {
  padding: "8px 16px",
  borderRadius: 6,
  border: "none",
  background: "#1d4ed8",
  color: "#fff",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 600,
};

const saveBtnStyle: React.CSSProperties = {
  ...addBtnStyle,
  padding: "8px 20px",
};

const startCycleBtnStyle: React.CSSProperties = {
  marginTop: 12,
  padding: "10px 16px",
  borderRadius: 6,
  border: "1px dashed #1d4ed8",
  background: "#f0f4ff",
  color: "#1d4ed8",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 500,
  width: "100%",
  textAlign: "center",
};