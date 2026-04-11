import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Auth.css";

const API = process.env.REACT_APP_API_URL || "http://localhost:8000";

export default function Login() {
  const navigate = useNavigate();
  const [role, setRole] = useState("user");
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: "" });
  };

  const validate = () => {
    const e = {};
    if (!formData.email) e.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(formData.email)) e.email = "Invalid email";
    if (!formData.password) e.password = "Password is required";
    else if (formData.password.length < 6) e.password = "Min 6 characters";
    return e;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    setServerError("");
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Login failed");

      // Store session
      localStorage.setItem("authToken", data.access_token);
      localStorage.setItem("userRole", data.role);
      localStorage.setItem("userName", data.full_name);
      localStorage.setItem("userId", data.user_id);

      navigate(data.role === "staff" ? "/profile/staff" : "/profile/user");
    } catch (err) {
      setServerError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="glass-container">

        {/* LOGO */}
        <div className="auth-logo">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <path d="M4 20L16 4L28 20L22 18L16 28L10 18L4 20Z" fill="#1877f2" opacity="0.9"/>
          </svg>
          <span>Skylink AirWay</span>
        </div>

        <h2>Welcome Back</h2>
        <p className="auth-subtitle">Sign in to continue your journey</p>

        {/* ROLE TOGGLE */}
        <div className="role-toggle">
          <button
            type="button"
            className={`rtab${role === "user" ? " active" : ""}`}
            onClick={() => setRole("user")}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            Passenger
          </button>
          <button
            type="button"
            className={`rtab${role === "staff" ? " active" : ""}`}
            onClick={() => setRole("staff")}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
            </svg>
            Staff
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email Address</label>
            <input
              name="email" type="email"
              placeholder="you@example.com"
              value={formData.email}
              onChange={handleChange}
              className={errors.email ? "err" : ""}
            />
            {errors.email && <span className="error">{errors.email}</span>}
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              name="password" type="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              className={errors.password ? "err" : ""}
            />
            {errors.password && <span className="error">{errors.password}</span>}
          </div>

          <div className="form-row">
            <span />
            <Link to="/forgot-password" className="forgot-link">Forgot password?</Link>
          </div>

          {serverError && <div className="server-error">{serverError}</div>}

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? (
              <span className="spinner" />
            ) : (
              `Sign In as ${role === "staff" ? "Staff" : "Passenger"}`
            )}
          </button>
        </form>

        <p className="auth-footer">
          Don't have an account? <Link to="/register">Create account</Link>
        </p>
      </div>
    </div>
  );
}