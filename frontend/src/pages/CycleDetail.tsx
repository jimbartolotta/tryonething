import React, { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../auth/AuthContext";

interface Cycle {
  id: string;
  coach_id: string;
  client_id: string;
  change: string;
  stage: "commit" | "track" | "gauge" | "verdict" | "bank";
  verdict: string | null;
  check_in_count: number;
  created_at: string;
  completed_at: string | null;
}

interface CheckIn {
  id: string;
  cycle_id: string;
  note: string;
  rating: number;
  created_at: string;
}

// Simple minimal router — no react-router dependency
function useSimpleParams() {
  const path = window.location.pathname;
  const parts = path.split("/");
  // /cycles/:id
  return { id: parts[2] || "" };
}

function useSimpleNavigate() {
  return (path: string) => {
    window.history.pushState({}, "", path);
    window.dispatchEvent(new Event("popstate"));
  };
}

export default function CycleDetail() {
  const { token } = useAuth();
  const params = useSimpleParams();
  const navigate = useSimpleNavigate();
  const [cycle, setCycle] = useState<Cycle | null>(null);
  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Check-in form
  const [note, setNote] = useState("");
  const [rating, setRating] = useState(3);
  const [submitting, setSubmitting] = useState(false);

  // Modify form
  const [newChange, setNewChange] = useState("");
  const [showModify, setShowModify] = useState(false);

  const fetchCycle = async () => {
    try {
      const res = await fetch(`/api/cycles/${params.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Cycle not found");
      const data = await res.json();
      setCycle(data.cycle);
      setCheckIns(data.checkIns);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (params.id) fetchCycle();
  }, [params.id]);

  const handleCheckIn = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/cycles/${params.id}/checkin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ note, rating }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error ?? "Check-in failed");
      }
      setNote("");
      setRating(3);
      fetchCycle();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAdvance = async () => {
    try {
      const res = await fetch(`/api/cycles/${params.id}/advance`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error ?? "Failed to advance");
      }
      fetchCycle();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleVerdict = async (verdict: string) => {
    try {
      const res = await fetch(`/api/cycles/${params.id}/verdict`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ verdict }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error ?? "Verdict failed");
      }
      fetchCycle();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleModify = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/cycles/${params.id}/modify`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ change: newChange }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error ?? "Modify failed");
      }
      setShowModify(false);
      setNewChange("");
      fetchCycle();
    } catch (err) {
      setError((err as Error).message);
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center" }}>Loading cycle...</div>;
  if (error) return <div style={{ padding: 40, textAlign: "center", color: "#dc2626" }}>{error}</div>;
  if (!cycle) return <div style={{ padding: 40, textAlign: "center" }}>Cycle not found</div>;

  const stageLabel = cycle.stage.charAt(0).toUpperCase() + cycle.stage.slice(1);

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: 20 }}>
      {/* Back button */}
      <button onClick={() => navigate("/dashboard")} style={backBtnStyle}>
        ← Back to Dashboard
      </button>

      {/* Stage indicator */}
      <div style={{ marginTop: 16, marginBottom: 24 }}>
        <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
          {["commit", "track", "gauge", "verdict", "bank"].map((s) => (
            <div
              key={s}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                background: stageOrderIndex(s) <= stageOrderIndex(cycle.stage) ? "#1d4ed8" : "#e5e7eb",
              }}
            />
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#999" }}>
          <span>Commit</span><span>Track</span><span>Gauge</span><span>Verdict</span><span>Bank</span>
        </div>
      </div>

      {/* Cycle info */}
      <h2 style={{ margin: "0 0 4px", fontSize: 20 }}>{cycle.change}</h2>
      <p style={{ margin: "0 0 24px", color: "#666", fontSize: 14 }}>
        Stage: {stageLabel} · Check-ins: {cycle.check_in_count}
      </p>

      {/* Error display */}
      {error && <p style={{ color: "#dc2626", marginBottom: 12, fontSize: 14 }}>{error}</p>}

      {/* Stage-specific content */}
      {cycle.stage === "commit" && <CommitView onAdvance={handleAdvance} />}
      {cycle.stage === "track" && (
        <TrackView
          note={note}
          setNote={setNote}
          rating={rating}
          setRating={setRating}
          submitting={submitting}
          onSubmit={handleCheckIn}
          onAdvance={handleAdvance}
          checkIns={checkIns}
        />
      )}
      {cycle.stage === "gauge" && (
        <GaugeView checkIns={checkIns} onAdvance={handleAdvance} change={cycle.change} />
      )}
      {cycle.stage === "verdict" && (
        <VerdictView
          change={cycle.change}
          checkIns={checkIns}
          onVerdict={handleVerdict}
          onModifyStart={() => {
            setNewChange(cycle.change);
            setShowModify(true);
          }}
        />
      )}
      {cycle.stage === "bank" && (
        <BankView
          change={cycle.change}
          verdict={cycle.verdict}
          checkIns={checkIns}
          completedAt={cycle.completed_at}
          showModify={showModify}
          newChange={newChange}
          setNewChange={setNewChange}
          onModify={handleModify}
        />
      )}
    </div>
  );
}

// ─── Stage Views ───────────────────────────────────────────────────────────

function CommitView({ onAdvance }: { onAdvance: () => void }) {
  return (
    <div style={sectionStyle}>
      <h3 style={{ margin: "0 0 8px" }}>Commit</h3>
      <p style={{ color: "#666", fontSize: 14, margin: "0 0 16px" }}>
        One change per cycle. The commitment is set. When ready, move to tracking.
      </p>
      <button onClick={onAdvance} style={primaryBtnStyle}>
        Start Tracking →
      </button>
    </div>
  );
}

function TrackView({
  note, setNote, rating, setRating, submitting, onSubmit, onAdvance, checkIns,
}: {
  note: string; setNote: (v: string) => void;
  rating: number; setRating: (v: number) => void;
  submitting: boolean; onSubmit: (e: FormEvent) => void;
  onAdvance: () => void; checkIns: CheckIn[];
}) {
  return (
    <div style={sectionStyle}>
      <h3 style={{ margin: "0 0 8px" }}>Track — How's it going?</h3>
      <p style={{ color: "#666", fontSize: 14, margin: "0 0 16px" }}>
        A brief note and an honest 1-5 gauge. No streaks, no celebrations — just the data.
      </p>

      <form onSubmit={onSubmit} style={{ marginBottom: 24 }}>
        <textarea
          placeholder="What happened? How did it feel?"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          required
          rows={3}
          style={{ ...inputStyle, resize: "vertical" }}
        />
        <div style={{ marginBottom: 12 }}>
          <p style={{ margin: "0 0 8px", fontSize: 14, fontWeight: 600 }}>Honest Gauge</p>
          <div style={{ display: "flex", gap: 8 }}>
            {[1, 2, 3, 4, 5].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRating(r)}
                style={{
                  ...gaugeBtnStyle,
                  background: r <= rating ? "#1d4ed8" : "#e5e7eb",
                  color: r <= rating ? "#fff" : "#666",
                }}
              >
                {r}
              </button>
            ))}
          </div>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#999" }}>
            {rating === 1 ? "Tough" : rating === 3 ? "Okay" : rating === 5 ? "Great" : ""}
          </p>
        </div>
        <button type="submit" disabled={submitting} style={primaryBtnStyle}>
          {submitting ? "Saving..." : "Log Check-in"}
        </button>
      </form>

      {checkIns.length > 0 && (
        <>
          <h4 style={{ margin: "0 0 8px" }}>Recent Check-ins</h4>
          {checkIns.slice(0, 3).map((ci) => (
            <div key={ci.id} style={checkInCardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <strong>Gauge: {ci.rating}/5</strong>
                <span style={{ fontSize: 12, color: "#999" }}>
                  {new Date(ci.created_at).toLocaleDateString()}
                </span>
              </div>
              <p style={{ margin: "4px 0 0", fontSize: 14 }}>{ci.note}</p>
            </div>
          ))}
          <button onClick={onAdvance} style={secondaryBtnStyle}>
            Ready for Review → Gauge
          </button>
        </>
      )}
    </div>
  );
}

function GaugeView({
  checkIns, onAdvance, change,
}: {
  checkIns: CheckIn[]; onAdvance: () => void; change: string;
}) {
  const avgRating = checkIns.length > 0
    ? (checkIns.reduce((s, ci) => s + ci.rating, 0) / checkIns.length).toFixed(1)
    : "—";

  return (
    <div style={sectionStyle}>
      <h3 style={{ margin: "0 0 8px" }}>Gauge — Review the Data</h3>
      <p style={{ color: "#666", fontSize: 14, margin: "0 0 16px" }}>
        Look at the check-ins before deciding. No rush.
      </p>

      <div style={{ marginBottom: 16, padding: 12, background: "#f0fdf4", borderRadius: 6, border: "1px solid #bbf7d0" }}>
        <p style={{ margin: "0 0 4px", fontSize: 14 }}><strong>Change:</strong> {change}</p>
        <p style={{ margin: 0, fontSize: 14 }}>
          <strong>Average Gauge:</strong> {avgRating}/5 · <strong>Total check-ins:</strong> {checkIns.length}
        </p>
      </div>

      {checkIns.map((ci) => (
        <div key={ci.id} style={checkInCardStyle}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <strong>Gauge: {ci.rating}/5</strong>
            <span style={{ fontSize: 12, color: "#999" }}>
              {new Date(ci.created_at).toLocaleDateString()}
            </span>
          </div>
          <p style={{ margin: "4px 0 0", fontSize: 14 }}>{ci.note}</p>
        </div>
      ))}

      <button onClick={onAdvance} style={primaryBtnStyle}>

        Make a Decision → Verdict
      </button>
    </div>
  );
}

function VerdictView({
  change, checkIns, onVerdict, onModifyStart,
}: {
  change: string; checkIns: CheckIn[];
  onVerdict: (v: string) => void;
  onModifyStart: () => void;
}) {
  return (
    <div style={sectionStyle}>
      <h3 style={{ margin: "0 0 8px" }}>Verdict — The Critical Moment</h3>
      <p style={{ color: "#666", fontSize: 14, margin: "0 0 4px" }}>
        Three equal choices. What's the honest call on "{change}"?
      </p>
      <p style={{ color: "#999", fontSize: 12, margin: "0 0 20px" }}>
        {checkIns.length} check-in{checkIns.length !== 1 ? "s" : ""} logged
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <button onClick={() => onVerdict("keep")} style={verdictBtnStyle("#166534", "#dcfce7")}>
          <strong>Keep it</strong>
          <span style={{ fontSize: 13, opacity: 0.8 }}> — This change stuck. Bank it.</span>
        </button>
        <button onClick={() => onVerdict("modify")} style={verdictBtnStyle("#92400e", "#fef3c7")}>
          <strong>Modify it</strong>
          <span style={{ fontSize: 13, opacity: 0.8 }}> — Refine the change and try again.</span>
        </button>
        <button onClick={() => onVerdict("drop")} style={verdictBtnStyle("#991b1b", "#fee2e2")}>
          <strong>Drop it</strong>
          <span style={{ fontSize: 13, opacity: 0.8 }}> — Not working. Archive it.</span>
        </button>
      </div>
    </div>
  );
}

function BankView({
  change, verdict, checkIns, completedAt, showModify, newChange, setNewChange, onModify,
}: {
  change: string; verdict: string | null; checkIns: CheckIn[]; completedAt: string | null;
  showModify: boolean; newChange: string; setNewChange: (v: string) => void;
  onModify: (e: FormEvent) => void;
}) {
  const verdictColors: Record<string, { bg: string; text: string }> = {
    keep: { bg: "#dcfce7", text: "#166534" },
    modify: { bg: "#fef3c7", text: "#92400e" },
    drop: { bg: "#fee2e2", text: "#991b1b" },
  };

  const vc = verdictColors[verdict ?? "keep"] ?? verdictColors.keep;

  return (
    <div style={sectionStyle}>
      <h3 style={{ margin: "0 0 8px" }}>Bank — Cycle Complete</h3>
      <div style={{ padding: 12, background: vc.bg, borderRadius: 6, border: `1px solid ${vc.text}20`, marginBottom: 16 }}>
        <p style={{ margin: "0 0 4px", color: vc.text, fontSize: 14 }}>
          <strong>Verdict: {verdict}</strong>
        </p>
        <p style={{ margin: 0, color: vc.text, fontSize: 14 }}>{change}</p>
        {completedAt && (
          <p style={{ margin: "4px 0 0", color: vc.text, fontSize: 12 }}>
            Completed: {new Date(completedAt).toLocaleDateString()}
          </p>
        )}
      </div>

      {checkIns.length > 0 && (
        <>
          <h4 style={{ margin: "0 0 8px" }}>Check-in History</h4>
          {checkIns.map((ci) => (
            <div key={ci.id} style={checkInCardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <strong>Gauge: {ci.rating}/5</strong>
                <span style={{ fontSize: 12, color: "#999" }}>
                  {new Date(ci.created_at).toLocaleDateString()}
                </span>
              </div>
              <p style={{ margin: "4px 0 0", fontSize: 14 }}>{ci.note}</p>
            </div>
          ))}
        </>
      )}

      {verdict === "modify" && !showModify && (
        <button onClick={() => setShowModify(true)} style={secondaryBtnStyle}>
          Refine and Try Again
        </button>
      )}

      {showModify && (
        <form onSubmit={onModify} style={{ marginTop: 16 }}>
          <textarea
            placeholder="What's the refined change?"
            value={newChange}
            onChange={(e) => setNewChange(e.target.value)}
            required
            rows={2}
            style={{ ...inputStyle, resize: "vertical" }}
          />
          <button type="submit" style={primaryBtnStyle}>
            Start New Cycle with Refined Change
          </button>
        </form>
      )}
    </div>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function stageOrderIndex(s: string): number {
  return ["commit", "track", "gauge", "verdict", "bank"].indexOf(s);
}

// ─── Styles ────────────────────────────────────────────────────────────────

const sectionStyle: React.CSSProperties = {
  padding: 20,
  borderRadius: 8,
  border: "1px solid #e5e7eb",
  background: "#fff",
};

const inputStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "10px 12px",
  marginBottom: 12,
  borderRadius: 6,
  border: "1px solid #ddd",
  fontSize: 16,
  boxSizing: "border-box",
  fontFamily: "inherit",
};

const primaryBtnStyle: React.CSSProperties = {
  padding: "10px 20px",
  borderRadius: 6,
  border: "none",
  background: "#1d4ed8",
  color: "#fff",
  cursor: "pointer",
  fontSize: 15,
  fontWeight: 600,
};

const secondaryBtnStyle: React.CSSProperties = {
  padding: "10px 20px",
  borderRadius: 6,
  border: "1px solid #ddd",
  background: "#fff",
  cursor: "pointer",
  fontSize: 15,
  fontWeight: 500,
  marginTop: 12,
};

const gaugeBtnStyle: React.CSSProperties = {
  width: 44,
  height: 44,
  borderRadius: 8,
  border: "none",
  fontSize: 16,
  fontWeight: 700,
  cursor: "pointer",
};

const verdictBtnStyle = (text: string, bg: string): React.CSSProperties => ({
  display: "block",
  width: "100%",
  padding: "14px 16px",
  borderRadius: 8,
  border: `1px solid ${text}30`,
  background: bg,
  color: text,
  cursor: "pointer",
  fontSize: 15,
  textAlign: "left",
});

const checkInCardStyle: React.CSSProperties = {
  padding: "10px 12px",
  marginBottom: 8,
  borderRadius: 6,
  border: "1px solid #eee",
  background: "#fafafa",
};

const backBtnStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "#1d4ed8",
  cursor: "pointer",
  fontSize: 14,
  padding: 0,
};