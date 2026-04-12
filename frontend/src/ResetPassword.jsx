import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "./Auth.css";

const API = process.env.REACT_APP_API_URL || "http://localhost:8000";

// ── FORGOT PASSWORD PAGE ───────────────────
export function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef(null);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (cooldownRef.current) clearInterval(cooldownRef.current);
    };
  }, []);

  const startCooldown = () => {
    setCooldown(60);
    cooldownRef.current = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cooldownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email) { setError("Email is required"); return; }
    
    // Check cooldown
    if (cooldown > 0) {
      setError(`Please wait ${cooldown} seconds before trying again`);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed");
      setSent(true);
      startCooldown();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="glass-container">
        <div className="auth-logo">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <path d="M4 20L16 4L28 20L22 18L16 28L10 18L4 20Z" fill="#1877f2" opacity="0.9"/>
          </svg>
          <span>Skylink AirWay</span>
        </div>

        {sent ? (
          <div className="success-box">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.5">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13 19.79 19.79 0 0 1 1.61 4.35 2 2 0 0 1 3.6 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.06 6.06l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.73 17"/>
            </svg>
            <h2>Check Your Email</h2>
            <p>We sent a password reset link to <strong>{email}</strong></p>
            {cooldown > 0 && (
              <p style={{ fontSize: "0.85rem", color: "#888" }}>
                You can request another link in {cooldown} seconds
              </p>
            )}
            <Link to="/login" className="auth-btn" style={{display:"block",textAlign:"center",marginTop:"1rem"}}>
              Back to Sign In
            </Link>
          </div>
        ) : (
          <>
            <h2>Forgot Password?</h2>
            <p className="auth-subtitle">Enter your email and we'll send you a reset link</p>

            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Email Address</label>
                <input
                  type="email" placeholder="you@example.com"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              {error && <div className="server-error">{error}</div>}
              <button type="submit" className="auth-btn" disabled={loading || cooldown > 0}>
                {loading 
                  ? <span className="spinner" /> 
                  : cooldown > 0 
                    ? `Wait ${cooldown}s` 
                    : "Send Reset Link"
                }
              </button>
            </form>

            <p className="auth-footer">
              Remember your password? <Link to="/login">Sign in</Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// ── RESET PASSWORD PAGE ────────────────────
export function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({ newPassword: "", confirmPassword: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");
  const [accessToken, setAccessToken] = useState("");

  useEffect(() => {
    // Supabase puts token in URL hash: #access_token=...
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.replace("#", "?"));
    const token = params.get("access_token");
    if (token) setAccessToken(token);
    else setServerError("Invalid or expired reset link. Please request a new one.");
  }, [location]);

  const validate = () => {
    const e = {};
    if (!formData.newPassword) e.newPassword = "Password is required";
    else if (formData.newPassword.length < 6) e.newPassword = "Min 6 characters";
    if (formData.newPassword !== formData.confirmPassword)
      e.confirmPassword = "Passwords do not match";
    return e;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    setServerError("");
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ access_token: accessToken, new_password: formData.newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Reset failed");
      navigate("/login", { state: { message: "Password updated! You can now sign in." } });
    } catch (err) {
      setServerError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="glass-container">
        <div className="auth-logo">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <path d="M4 20L16 4L28 20L22 18L16 28L10 18L4 20Z" fill="#1877f2" opacity="0.9"/>
          </svg>
          <span>Skylink AirWay</span>
        </div>

        <h2>Set New Password</h2>
        <p className="auth-subtitle">Enter your new password below</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>New Password</label>
            <input type="password" placeholder="Create a new password"
              value={formData.newPassword}
              onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
              className={errors.newPassword ? "err" : ""} />
            {errors.newPassword && <span className="error">{errors.newPassword}</span>}
          </div>

          <div className="form-group">
            <label>Confirm New Password</label>
            <input type="password" placeholder="Repeat new password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              className={errors.confirmPassword ? "err" : ""} />
            {errors.confirmPassword && <span className="error">{errors.confirmPassword}</span>}
          </div>

          {serverError && <div className="server-error">{serverError}</div>}

          <button type="submit" className="auth-btn" disabled={loading || !accessToken}>
            {loading ? <span className="spinner" /> : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
