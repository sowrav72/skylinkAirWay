import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

const API = process.env.REACT_APP_API_URL || "http://localhost:8000";

// ── FORGOT PASSWORD ───────────────────────────────────────────────────────────
export function ForgotPassword() {
  const [email,   setEmail]   = useState("");
  const [token,   setToken]   = useState("");
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const [done,    setDone]    = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const res  = await fetch(`${API}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Request failed");
      setToken(data.token || "");
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1877f2" strokeWidth="1.8">
            <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
          </svg>
          <span>Skylink <em>AirWay</em></span>
        </div>

        {!done ? (
          <>
            <h2 className="auth-title">Forgot Password?</h2>
            <p className="auth-sub">Enter your email and we'll send you a reset token.</p>

            {error && <div className="auth-error">{error}</div>}

            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="auth-field">
                <label>Email address</label>
                <input type="email" placeholder="you@example.com"
                  value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <button type="submit" className="auth-submit" disabled={loading}>
                {loading ? <span className="auth-spinner" /> : "Send Reset Token"}
              </button>
            </form>
          </>
        ) : (
          <div className="auth-success-box">
            <div className="auth-success-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <h3>Token Generated!</h3>
            <p>Your password reset token is ready. Copy it and use it on the reset page.</p>

            {token && (
              <div className="token-box">
                <code>{token}</code>
                <button className="token-copy" onClick={() => navigator.clipboard.writeText(token)}>
                  Copy
                </button>
              </div>
            )}

            <p className="auth-note">
              ⚠️ In a production system, this token would be sent to your email address.
            </p>
            <Link to="/reset-password" className="auth-submit" style={{ display:"block", textAlign:"center", marginTop:"1rem" }}>
              Go to Reset Password →
            </Link>
          </div>
        )}

        <p className="auth-switch">
          Remember your password? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}


// ── RESET PASSWORD ────────────────────────────────────────────────────────────
export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const [token,    setToken]    = useState(searchParams.get("token") || "");
  const [password, setPassword] = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [done,     setDone]     = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirm)  { setError("Passwords do not match"); return; }
    if (password.length < 6)   { setError("Password must be at least 6 characters"); return; }
    setLoading(true);
    try {
      const res  = await fetch(`${API}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, new_password: password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Reset failed");
      setDone(true);
      setTimeout(() => navigate("/login"), 2500);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1877f2" strokeWidth="1.8">
            <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
          </svg>
          <span>Skylink <em>AirWay</em></span>
        </div>

        {!done ? (
          <>
            <h2 className="auth-title">Reset Password</h2>
            <p className="auth-sub">Paste your reset token and choose a new password.</p>

            {error && <div className="auth-error">{error}</div>}

            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="auth-field">
                <label>Reset Token</label>
                <input type="text" placeholder="Paste your token here"
                  value={token} onChange={(e) => setToken(e.target.value)} required />
              </div>
              <div className="auth-field">
                <label>New Password</label>
                <input type="password" placeholder="Min 6 characters"
                  value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <div className="auth-field">
                <label>Confirm New Password</label>
                <input type="password" placeholder="Repeat new password"
                  value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
              </div>
              <button type="submit" className="auth-submit" disabled={loading}>
                {loading ? <span className="auth-spinner" /> : "Reset Password"}
              </button>
            </form>
          </>
        ) : (
          <div className="auth-success-box">
            <div className="auth-success-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                <polyline points="22 4 12 14.01 9 11.01"/>
              </svg>
            </div>
            <h3>Password Reset Successful!</h3>
            <p>Your password has been updated. Redirecting to login…</p>
          </div>
        )}

        <p className="auth-switch">
          <Link to="/login">← Back to Login</Link>
        </p>
      </div>
    </div>
  );
}