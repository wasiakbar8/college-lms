import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetMsg, setResetMsg] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const { login, resetPassword } = useAuth();

  async function handleLogin(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      const msg =
        err.code === "auth/user-not-found" || err.code === "auth/wrong-password" || err.code === "auth/invalid-credential"
          ? "Invalid email or password. Please try again."
          : err.code === "auth/too-many-requests"
          ? "Too many failed attempts. Please try again later."
          : "Login failed. Please check your credentials.";
      setError(msg);
    }
    setLoading(false);
  }

  async function handleReset(e) {
    e.preventDefault();
    setResetLoading(true); setResetMsg("");
    try {
      await resetPassword(resetEmail);
      setResetMsg("Password reset email sent! Check your inbox.");
    } catch (err) {
      setResetMsg("Error: " + (err.code === "auth/user-not-found" ? "No account found with this email." : err.message));
    }
    setResetLoading(false);
  }

  return (
    <div style={s.page}>
      {/* ── Left panel ── */}
      <div style={s.left}>
        <div style={s.leftInner}>
          <div style={s.logoRow}>
            <span style={s.logoIcon}>🎓</span>
            <div>
              <div style={s.logoTitle}>University LMS</div>
              <div style={s.logoSub}>Learning Management System</div>
            </div>
          </div>
          <h1 style={s.tagH}>Your complete academic portal</h1>
          <p style={s.tagP}>
            Access results, attendance, fee records, transcripts, timetables and more — all in one place.
          </p>
          <div style={s.featureList}>
            {[
              "📊 CGPA & Semester Results",
              "✅ Attendance Tracking",
              "💰 Fee Vouchers & History",
              "📋 Academic Transcript",
              "🗓️ Class Timetable",
              "👤 Student Profile",
            ].map(f => (
              <div key={f} style={s.featureItem}>
                <span style={s.check}>✓</span>
                <span style={s.featureText}>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel ── */}
      <div style={s.right}>
        <div style={s.card}>
          {!showForgot ? (
            <>
              <div style={s.cardHeader}>
                <h2 style={s.cardTitle}>Welcome Back</h2>
                <p style={s.cardSub}>Sign in to access your portal</p>
              </div>

              {error && (
                <div className="alert alert-danger">{error}</div>
              )}

              <form onSubmit={handleLogin}>
                <div className="form-group">
                  <label>Email Address</label>
                  <input
                    className="form-control"
                    type="email"
                    placeholder="you@university.edu"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
                <div className="form-group">
                  <label>Password</label>
                  <input
                    className="form-control"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                </div>
                <div style={{ textAlign:"right", marginBottom:20 }}>
                  <button type="button" style={s.link} onClick={() => setShowForgot(true)}>
                    Forgot password?
                  </button>
                </div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width:"100%", justifyContent:"center", padding:"13px", fontSize:15 }}
                  disabled={loading}
                >
                  {loading ? "Signing in..." : "Sign In →"}
                </button>
              </form>

              <div style={s.chips}>
                <div style={s.chip}>👨‍💼 Admin Portal</div>
                <div style={s.chip}>👨‍🎓 Student Portal</div>
              </div>
              <p style={s.hint}>You'll be redirected based on your role automatically.</p>
            </>
          ) : (
            <>
              <div style={s.cardHeader}>
                <h2 style={s.cardTitle}>Reset Password</h2>
                <p style={s.cardSub}>Enter your email to receive a reset link</p>
              </div>
              {resetMsg && (
                <div className={`alert ${resetMsg.startsWith("Error") ? "alert-danger" : "alert-success"}`}>
                  {resetMsg}
                </div>
              )}
              <form onSubmit={handleReset}>
                <div className="form-group">
                  <label>Email Address</label>
                  <input
                    className="form-control"
                    type="email"
                    placeholder="you@university.edu"
                    value={resetEmail}
                    onChange={e => setResetEmail(e.target.value)}
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ width:"100%", justifyContent:"center", padding:"13px", marginBottom:14 }}
                  disabled={resetLoading}
                >
                  {resetLoading ? "Sending..." : "Send Reset Email"}
                </button>
              </form>
              <button style={s.link} onClick={() => { setShowForgot(false); setResetMsg(""); }}>
                ← Back to Login
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Styles ── */
const s = {
  page: {
    display: "flex",
    minHeight: "100vh",
    flexDirection: "row",
  },
  left: {
    flex: 1,
    background: "linear-gradient(145deg, #0f2340 0%, #1a3a5c 50%, #1e5fb5 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "48px 40px",
  },
  leftInner: {
    maxWidth: 440,
    width: "100%",
  },
  logoRow: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    marginBottom: 40,
  },
  logoIcon: { fontSize: 44 },
  logoTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 24,
    fontWeight: 700,
    color: "white",
  },
  logoSub: { color: "rgba(255,255,255,0.5)", fontSize: 13, marginTop: 2 },
  tagH: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 26,
    fontWeight: 700,
    color: "white",
    lineHeight: 1.3,
    marginBottom: 14,
  },
  tagP: {
    color: "rgba(255,255,255,0.65)",
    fontSize: 15,
    lineHeight: 1.7,
    marginBottom: 32,
  },
  featureList: { display: "flex", flexDirection: "column", gap: 10 },
  featureItem: { display: "flex", alignItems: "center", gap: 12 },
  check: {
    width: 22, height: 22, borderRadius: "50%",
    background: "rgba(232,160,32,0.2)", color: "#e8a020",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 12, fontWeight: 700, flexShrink: 0,
  },
  featureText: { color: "rgba(255,255,255,0.8)", fontSize: 14 },
  right: {
    width: 480,
    minWidth: 320,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "32px 24px",
    background: "#f0f4f8",
  },
  card: {
    background: "white",
    borderRadius: 16,
    padding: "40px 36px",
    width: "100%",
    boxShadow: "0 8px 40px rgba(0,0,0,0.1)",
  },
  cardHeader: { marginBottom: 28 },
  cardTitle: {
    fontFamily: "'Playfair Display', serif",
    fontSize: 26, color: "#1a3a5c", marginBottom: 6,
  },
  cardSub: { color: "#64748b", fontSize: 14 },
  link: {
    background: "none", border: "none", color: "#2563a8",
    fontSize: 13, cursor: "pointer",
    fontFamily: "'Inter', sans-serif", fontWeight: 500,
  },
  chips: { display: "flex", gap: 10, marginTop: 28, justifyContent: "center", flexWrap: "wrap" },
  chip: {
    padding: "6px 14px", background: "#f0f4f8",
    borderRadius: 20, fontSize: 12, color: "#475569", fontWeight: 500,
  },
  hint: { textAlign: "center", fontSize: 12, color: "#94a3b8", marginTop: 10 },
};

/* ── Responsive via injected style tag ── */
const styleTag = document.createElement("style");
styleTag.textContent = `
  @media (max-width: 768px) {
    .login-page-left { display: none !important; }
    .login-page-right {
      width: 100% !important;
      min-height: 100vh;
      padding: 24px 16px !important;
    }
    .login-page-card {
      padding: 28px 20px !important;
    }
  }
`;
if (!document.getElementById("login-responsive")) {
  styleTag.id = "login-responsive";
  document.head.appendChild(styleTag);
}