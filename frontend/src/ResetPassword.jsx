import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { API } from "./api";
import "./Auth.css";

// ── FORGOT PASSWORD ────────────────────────
export function ForgotPassword() {
  const [email,   setEmail]   = useState("");
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);   // { token, message }
  const [error,   setError]   = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email) { setError("Email is required"); return; }

    setLoading(true);
    try {
      const data = await API.post("/auth/forgot-password", { email });
      setResult(data);
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
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
            <path d="M4 20L16 4L28 20L22 18L16 28L10 18L4 20Z" fill="#1877f2" opacity="0.9"/>
          </svg>
          <span>Skylink AirWay</span>
        </div>

        {result ? (
          /* ── SHOW RESET TOKEN ── */
          <div>
            <h2>Reset Token Generated</h2>
            <p className="auth-subtitle">Copy the token below and use it to reset your password</p>

            <div className="token-box">
              <p className="token-label">Your Reset Token</p>
              <textarea
                className="token-value"
                readOnly
                value={result.reset_token || ""}
                rows={4}
                onClick={e => e.target.select()}
              />
              <p className="token-hint">Click the box to select all, then copy it.</p>
            </div>

            <Link
              to="/reset-password"
              state={{ token: result.reset_token }}
              className="auth-btn"
              style={{ display: "block", textAlign: "center", marginTop: "1rem", textDecoration: "none" }}
            >
              Continue to Reset Password →
            </Link>
          </div>
        ) : (
          /* ── EMAIL FORM ── */
          <>
            <h2>Forgot Password?</h2>
            <p className="auth-subtitle">Enter your email to generate a reset token</p>

            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Email Address</label>
                <input type="email" placeholder="you@example.com"
                  value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              {error && <div className="server-error">{error}</div>}
              <button type="submit" className="auth-btn" disabled={loading}>
                {loading ? <span className="spinner" /> : "Get Reset Token"}
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


// ── RESET PASSWORD ─────────────────────────
export function ResetPassword() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [token,       setToken]       = useState(location?.state?.token || "");
  const [newPassword, setNewPassword] = useState("");
  const [confirm,     setConfirm]     = useState("");
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!token)       { setError("Reset token is required"); return; }
    if (!newPassword) { setError("New password is required"); return; }
    if (newPassword.length < 6) { setError("Min 6 characters"); return; }
    if (newPassword !== confirm) { setError("Passwords do not match"); return; }

    setLoading(true);
    try {
      await API.post("/auth/reset-password", { token, new_password: newPassword });
      navigate("/login", { state: { message: "Password updated! You can now sign in." } });
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
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
            <path d="M4 20L16 4L28 20L22 18L16 28L10 18L4 20Z" fill="#1877f2" opacity="0.9"/>
          </svg>
          <span>Skylink AirWay</span>
        </div>

        <h2>Set New Password</h2>
        <p className="auth-subtitle">Paste your reset token and choose a new password</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Reset Token</label>
            <textarea
              className="pf-input token-input"
              rows={3}
              placeholder="Paste your reset token here..."
              value={token}
              onChange={e => setToken(e.target.value)}
              style={{ resize: "vertical", fontFamily: "monospace", fontSize: ".75rem" }}
            />
          </div>

          <div className="form-group">
            <label>New Password</label>
            <input type="password" placeholder="Min 6 characters"
              value={newPassword} onChange={e => setNewPassword(e.target.value)} />
          </div>

          <div className="form-group">
            <label>Confirm New Password</label>
            <input type="password" placeholder="Repeat new password"
              value={confirm} onChange={e => setConfirm(e.target.value)} />
          </div>

          {error && <div className="server-error">{error}</div>}

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? <span className="spinner" /> : "Update Password"}
          </button>
        </form>

        <p className="auth-footer">
          <Link to="/forgot-password">← Get a new reset token</Link>
        </p>
      </div>
    </div>
  );
}
