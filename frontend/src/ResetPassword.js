import React, { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import * as Icons from "./icons";

const API = process.env.REACT_APP_API_URL || "http://localhost:8000";

export function ForgotPassword() {
  const [email,   setEmail]   = useState("");
  const [status,  setStatus]  = useState(null); // { type: "success"|"error", msg, token, userEmail }
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      const res  = await fetch(`${API}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Request failed");
      // For demo: server returns the token directly
      setStatus({ type: "success", msg: data.message, token: data.token, userEmail: data.email });
    } catch (err) {
      setStatus({ type: "error", msg: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">✈ Skylink <em>AirWay</em></div>
        <h2 className="auth-title">Reset Password</h2>
        <p className="auth-sub">Enter your email and we'll send a reset token</p>

        {status && (
          <div className={`auth-${status.type === "success" ? "success" : "error"}`}>
            <p>{status.msg}</p>
            {status.token && (
              <div style={{ marginTop: "0.75rem" }}>
                <p style={{ fontSize: "0.8rem", marginBottom: "0.3rem" }}>Demo reset token (copy this):</p>
                <code style={{ wordBreak: "break-all", fontSize: "0.75rem", background: "rgba(0,0,0,0.15)", padding: "0.4rem 0.6rem", borderRadius: "6px", display: "block" }}>
                  {status.token}
                </code>
                <Link
                  to={`/reset-password?token=${encodeURIComponent(status.token)}&email=${encodeURIComponent(status.userEmail)}`}
                  className="auth-link" style={{ display: "block", marginTop: "0.5rem" }}
                >
                  → Go to Reset Password page
                </Link>
              </div>
            )}
          </div>
        )}

        {!status?.token && (
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="auth-field">
              <label>Email Address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? <span className="auth-spinner" /> : "Send Reset Token"}
            </button>
          </form>
        )}

        <p className="auth-switch"><Link to="/login" className="auth-link">← Back to Sign In</Link></p>
      </div>
    </div>
  );
}


export function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const prefillToken = searchParams.get("token") || "";
  const prefillEmail = searchParams.get("email") || "";

  const [form,    setForm]    = useState({ token: prefillToken, email: prefillEmail, password: "", confirm: "" });
  const [status,  setStatus]  = useState(null);
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus(null);
    if (!form.token || !form.email || !form.password) { setStatus({ type: "error", msg: "All fields are required." }); return; }
    if (form.password.length < 8) { setStatus({ type: "error", msg: "Password must be at least 8 characters." }); return; }
    if (form.password !== form.confirm) { setStatus({ type: "error", msg: "Passwords do not match." }); return; }

    setLoading(true);
    try {
      const params = new URLSearchParams({
        token: form.token, email: form.email, new_password: form.password,
      });
      const res  = await fetch(`${API}/auth/reset-password-confirm?${params}`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Reset failed");
      setStatus({ type: "success", msg: "Password updated! Redirecting to login..." });
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setStatus({ type: "error", msg: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">✈ Skylink <em>AirWay</em></div>
        <h2 className="auth-title">New Password</h2>
        <p className="auth-sub">Enter your reset token and choose a new password</p>

        {status && (
          <div className={`auth-${status.type === "success" ? "success" : "error"}`}>{status.msg}</div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label>Email Address</label>
            <input type="email" value={form.email} onChange={set("email")} placeholder="you@example.com" />
          </div>
          <div className="auth-field">
            <label>Reset Token</label>
            <input type="text" value={form.token} onChange={set("token")} placeholder="Paste token here" />
          </div>
          <div className="auth-field">
            <label>New Password</label>
            <input type="password" value={form.password} onChange={set("password")} placeholder="Min. 8 characters" />
          </div>
          <div className="auth-field">
            <label>Confirm New Password</label>
            <input type="password" value={form.confirm} onChange={set("confirm")} placeholder="Repeat password" />
          </div>
          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? <span className="auth-spinner" /> : "Update Password"}
          </button>
        </form>

        <p className="auth-switch"><Link to="/login" className="auth-link">← Back to Sign In</Link></p>
      </div>
    </div>
  );
}