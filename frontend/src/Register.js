import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const API = process.env.REACT_APP_API_URL || "http://localhost:8000";

export default function Register() {
  const [form,    setForm]    = useState({ full_name: "", email: "", phone: "", password: "", confirm: "" });
  const [showPwd, setShowPwd] = useState(false);
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (form.password !== form.confirm) { setError("Passwords do not match"); return; }
    if (form.password.length < 6)       { setError("Password must be at least 6 characters"); return; }
    setLoading(true);
    try {
      const res  = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email:     form.email,
          full_name: form.full_name,
          password:  form.password,
          phone:     form.phone || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Registration failed");

      localStorage.setItem("skylink_token", data.access_token);
      localStorage.setItem("skylink_name",  data.full_name);
      localStorage.setItem("skylink_role",  data.role);
      navigate("/profile/user");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card auth-card-wide">
        <div className="auth-brand">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#1877f2" strokeWidth="1.8">
            <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
          </svg>
          <span>Skylink <em>AirWay</em></span>
        </div>

        <h2 className="auth-title">Create your account</h2>
        <p className="auth-sub">Join Skylink and start exploring the world</p>

        {error && <div className="auth-error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-row">
            <div className="auth-field">
              <label>Full Name</label>
              <input type="text" placeholder="John Smith" value={form.full_name}
                onChange={set("full_name")} required />
            </div>
            <div className="auth-field">
              <label>Phone <span className="opt">(optional)</span></label>
              <input type="tel" placeholder="+1 234 567 8900" value={form.phone}
                onChange={set("phone")} />
            </div>
          </div>

          <div className="auth-field">
            <label>Email address</label>
            <input type="email" placeholder="you@example.com" value={form.email}
              onChange={set("email")} required autoComplete="email" />
          </div>

          <div className="auth-row">
            <div className="auth-field">
              <label>Password</label>
              <div className="pwd-wrap">
                <input type={showPwd ? "text" : "password"} placeholder="Min 6 characters"
                  value={form.password} onChange={set("password")} required />
                <button type="button" className="pwd-eye" onClick={() => setShowPwd(!showPwd)}>
                  {showPwd
                    ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
              </div>
            </div>
            <div className="auth-field">
              <label>Confirm Password</label>
              <input type="password" placeholder="Repeat password"
                value={form.confirm} onChange={set("confirm")} required />
            </div>
          </div>

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? <span className="auth-spinner" /> : "Create Account"}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}