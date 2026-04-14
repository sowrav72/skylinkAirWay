import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import * as Icons from "./icons";

const API = process.env.REACT_APP_API_URL || "http://localhost:8000";

// Staff IDs that are valid (in real world this would be backend-verified)
const VALID_STAFF_IDS = ["STAFF001", "STAFF002", "STAFF003", "SKY-STAFF", "SKYLINK-STAFF"];

export default function Register() {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirm: "",
    role: "passenger",
    staffId: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const set = (k) => (e) => setForm((prev) => ({ ...prev, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.fullName || !form.email || !form.password) {
      setError("Please fill in all required fields.");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (form.role === "staff" && !form.staffId.trim()) {
      setError("Staff ID is required for staff registration.");
      return;
    }
    if (
      form.role === "staff" &&
      !VALID_STAFF_IDS.includes(form.staffId.trim().toUpperCase())
    ) {
      setError(
        "Invalid Staff ID. Please contact your administrator for a valid staff ID."
      );
      return;
    }

    setLoading(true);
    try {
      // Register as passenger first (backend only supports passenger on register)
      const res = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: form.fullName.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
          phone: form.phone || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Registration failed");

      // If staff role requested, upgrade role via API using the token
      if (form.role === "staff") {
        const upgradeRes = await fetch(`${API}/auth/upgrade-to-staff`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${data.access_token}`,
          },
          body: JSON.stringify({ staff_id: form.staffId.trim().toUpperCase() }),
        });
        if (upgradeRes.ok) {
          const upgraded = await upgradeRes.json();
          localStorage.setItem("skylink_token", data.access_token);
          localStorage.setItem("skylink_user", JSON.stringify(upgraded.user || data.user));
          navigate("/profile/staff");
          return;
        }
      }

      localStorage.setItem("skylink_token", data.access_token);
      localStorage.setItem("skylink_user", JSON.stringify(data.user));
      navigate(data.user.role === "passenger" ? "/" : "/profile/staff");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card auth-card--wide">
        <div className="auth-logo"><Icons.AirplaneIcon /> Skylink <em>AirWay</em></div>
        <h2 className="auth-title">Create Account</h2>
        <p className="auth-sub">Join Skylink and start exploring the world</p>

        {/* ROLE TOGGLE */}
        <div className="role-toggle-wrap">
          <button
            type="button"
            className={`role-toggle-btn${form.role === "passenger" ? " active" : ""}`}
            onClick={() => setForm((p) => ({ ...p, role: "passenger", staffId: "" }))}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            Passenger
          </button>
          <button
            type="button"
            className={`role-toggle-btn${form.role === "staff" ? " active" : ""}`}
            onClick={() => setForm((p) => ({ ...p, role: "staff" }))}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="7" width="20" height="14" rx="2" />
              <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
            </svg>
            Staff Member
          </button>
        </div>

        {form.role === "staff" && (
          <div className="staff-notice">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            Staff registration requires a valid Staff ID issued by Skylink administration.
          </div>
        )}

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-row-2">
            <div className="auth-field">
              <label>Full Name <span className="req">*</span></label>
              <input
                type="text"
                value={form.fullName}
                onChange={set("fullName")}
                placeholder="John Doe"
                autoComplete="name"
              />
            </div>
            <div className="auth-field">
              <label>Phone Number</label>
              <input
                type="tel"
                value={form.phone}
                onChange={set("phone")}
                placeholder="+1 (555) 000-0000"
                autoComplete="tel"
              />
            </div>
          </div>

          <div className="auth-field">
            <label>Email Address <span className="req">*</span></label>
            <input
              type="email"
              value={form.email}
              onChange={set("email")}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          {form.role === "staff" && (
            <div className="auth-field">
              <label>
                Staff ID <span className="req">*</span>
                <span className="field-hint"> (provided by administration)</span>
              </label>
              <input
                type="text"
                value={form.staffId}
                onChange={set("staffId")}
                placeholder="e.g. STAFF001"
                autoComplete="off"
                style={{ fontFamily: "monospace", letterSpacing: ".08em" }}
              />
            </div>
          )}

          <div className="auth-row-2">
            <div className="auth-field">
              <label>Password <span className="req">*</span></label>
              <input
                type="password"
                value={form.password}
                onChange={set("password")}
                placeholder="Min. 8 characters"
                autoComplete="new-password"
              />
            </div>
            <div className="auth-field">
              <label>Confirm Password <span className="req">*</span></label>
              <input
                type="password"
                value={form.confirm}
                onChange={set("confirm")}
                placeholder="Repeat password"
                autoComplete="new-password"
              />
            </div>
          </div>

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? (
              <span className="auth-spinner" />
            ) : (
              `Create ${form.role === "staff" ? "Staff" : ""} Account`
            )}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account?{" "}
          <Link to="/login" className="auth-link">Sign In</Link>
        </p>
      </div>
    </div>
  );
}