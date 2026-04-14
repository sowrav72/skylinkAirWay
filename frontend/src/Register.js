import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const API = process.env.REACT_APP_API_URL || "http://localhost:8000";

export default function Register() {
  const [form,    setForm]    = useState({ fullName: "", email: "", phone: "", password: "", confirm: "" });
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const set = (k) => (e) => setForm(prev => ({ ...prev, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.fullName || !form.email || !form.password) { setError("Please fill in all required fields."); return; }
    if (form.password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (form.password !== form.confirm) { setError("Passwords do not match."); return; }

    setLoading(true);
    try {
      const res  = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: form.fullName.trim(),
          email:     form.email.trim(),
          password:  form.password,
          phone:     form.phone || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Registration failed");
      localStorage.setItem("skylink_token", data.access_token);
      localStorage.setItem("skylink_user",  JSON.stringify(data.user));
      navigate("/");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card auth-card--wide">
        <div className="auth-logo">✈ Skylink <em>AirWay</em></div>
        <h2 className="auth-title">Create Account</h2>
        <p className="auth-sub">Join Skylink and start exploring the world</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-row-2">
            <div className="auth-field">
              <label>Full Name <span className="req">*</span></label>
              <input type="text" value={form.fullName} onChange={set("fullName")} placeholder="John Doe" autoComplete="name" />
            </div>
            <div className="auth-field">
              <label>Phone Number</label>
              <input type="tel" value={form.phone} onChange={set("phone")} placeholder="+1 (555) 000-0000" autoComplete="tel" />
            </div>
          </div>

          <div className="auth-field">
            <label>Email Address <span className="req">*</span></label>
            <input type="email" value={form.email} onChange={set("email")} placeholder="you@example.com" autoComplete="email" />
          </div>

          <div className="auth-row-2">
            <div className="auth-field">
              <label>Password <span className="req">*</span></label>
              <input type="password" value={form.password} onChange={set("password")} placeholder="Min. 8 characters" autoComplete="new-password" />
            </div>
            <div className="auth-field">
              <label>Confirm Password <span className="req">*</span></label>
              <input type="password" value={form.confirm} onChange={set("confirm")} placeholder="Repeat password" autoComplete="new-password" />
            </div>
          </div>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? <span className="auth-spinner" /> : "Create Account"}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login" className="auth-link">Sign In</Link>
        </p>
      </div>
    </div>
  );
}