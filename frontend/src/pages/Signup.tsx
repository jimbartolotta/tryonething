import React, { useState, type FormEvent } from "react";
import { useAuth } from "../auth/AuthContext";

interface Props {
  onToggle: () => void;
}

export default function Signup({ onToggle }: Props) {
  const { signup } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await signup(name, email, password);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "60px auto", padding: "0 20px" }}>
      <h1 style={{ marginBottom: 8 }}>Try One Thing</h1>
      <p style={{ color: "#666", marginBottom: 24 }}>Create your coach account</p>
      <form onSubmit={handleSubmit}>
        {error && <p style={{ color: "#dc2626", marginBottom: 12 }}>{error}</p>}
        <input
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          style={inputStyle}
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={inputStyle}
        />
        <input
          type="password"
          placeholder="Password (8+ characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          style={inputStyle}
        />
        <button type="submit" disabled={busy} style={btnStyle}>
          {busy ? "Creating account..." : "Create Account"}
        </button>
      </form>
      <p style={{ marginTop: 16, fontSize: 14, color: "#666" }}>
        Already have an account?{" "}
        <button onClick={onToggle} style={linkStyle}>
          Sign in
        </button>
      </p>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "10px 12px",
  marginBottom: 12,
  borderRadius: 6,
  border: "1px solid #ddd",
  fontSize: 16,
  boxSizing: "border-box",
};

const btnStyle: React.CSSProperties = {
  ...inputStyle,
  background: "#1d4ed8",
  color: "#fff",
  border: "none",
  cursor: "pointer",
  fontWeight: 600,
};

const linkStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "#1d4ed8",
  cursor: "pointer",
  textDecoration: "underline",
  fontSize: 14,
  padding: 0,
};