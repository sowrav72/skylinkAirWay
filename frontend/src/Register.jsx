import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API } from "./api";
import "./Auth.css";

export default function Register() {
  const navigate = useNavigate();
  const [role, setRole] = useState("user");
  const [formData, setFormData] = useState({
    full_name: "", email: "", password: "", confirmPassword: "",
    staff_id: "", department: "General", phone: "",
    agree: false,
  });
  const [errors,      setErrors]      = useState({});
  const [loading,     setLoading]     = useState(false);
  const [serverError, setServerError] = useState("");

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({ ...formData, [name]: type === "checkbox" ? checked : value });
    setErrors({ ...errors, [name]: "" });
    setServerError("");
  };

  const validate = () => {
    const e = {};
    if (!formData.full_name.trim()) e.full_name = "Full name is required";
    if (!formData.email)            e.email     = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(formData.email)) e.email = "Invalid email format";
    if (!formData.password)         e.password  = "Password is required";
    else if (formData.password.length < 6) e.password = "Min 6 characters";
    if (formData.password !== formData.confirmPassword)
      e.confirmPassword = "Passwords do not match";
    if (role === "staff" && !formData.staff_id.trim())
      e.staff_id = "Staff ID is required";
    if (!formData.agree) e.agree = "You must accept the terms";
    return e;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    setServerError("");
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setLoading(true);

    const endpoint = role === "staff"
      ? "/auth/register/staff"
      : "/auth/register/user";

    const payload = role === "staff"
      ? {
          full_name:  formData.full_name,
          email:      formData.email,
          password:   formData.password,
          staff_id:   formData.staff_id,
          department: formData.department,
          phone:      formData.phone || null,
        }
      : {
          full_name: formData.full_name,
          email:     formData.email,
          password:  formData.password,
          phone:     formData.phone || null,
        };

    try {
      await API.post(endpoint, payload);
      navigate("/login", {
        state: { message: "Account created successfully! You can now sign in." },
      });
    } catch (err) {
      setServerError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="glass-container wide">

        <div className="auth-logo">
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
            <path d="M4 20L16 4L28 20L22 18L16 28L10 18L4 20Z" fill="#1877f2" opacity="0.9"/>
          </svg>
          <span>Skylink AirWay</span>
        </div>

        <h2>Create Account</h2>
        <p className="auth-subtitle">Join Skylink and start your journey</p>

        {/* ROLE TOGGLE */}
        <div className="role-toggle">
          <button type="button" className={`rtab${role === "user" ? " active" : ""}`}
            onClick={() => setRole("user")}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
            Passenger
          </button>
          <button type="button" className={`rtab${role === "staff" ? " active" : ""}`}
            onClick={() => setRole("staff")}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="7" width="20" height="14" rx="2"/>
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
            </svg>
            Staff Member
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-grid">

            <div className="form-group">
              <label>Full Name</label>
              <input name="full_name" type="text" placeholder="Jane Doe"
                value={formData.full_name} onChange={handleChange}
                className={errors.full_name ? "err" : ""} />
              {errors.full_name && <span className="error">{errors.full_name}</span>}
            </div>

            <div className="form-group">
              <label>Email Address</label>
              <input name="email" type="email" placeholder="you@example.com"
                value={formData.email} onChange={handleChange}
                className={errors.email ? "err" : ""} />
              {errors.email && <span className="error">{errors.email}</span>}
            </div>

            <div className="form-group">
              <label>Phone <span style={{fontWeight:300,opacity:.6}}>(optional)</span></label>
              <input name="phone" type="tel" placeholder="+880 1234 567890"
                value={formData.phone} onChange={handleChange} />
            </div>

            <div className="form-group">
              <label>Password</label>
              <input name="password" type="password" placeholder="Min 6 characters"
                value={formData.password} onChange={handleChange}
                className={errors.password ? "err" : ""} />
              {errors.password && <span className="error">{errors.password}</span>}
            </div>

            <div className="form-group">
              <label>Confirm Password</label>
              <input name="confirmPassword" type="password" placeholder="Repeat password"
                value={formData.confirmPassword} onChange={handleChange}
                className={errors.confirmPassword ? "err" : ""} />
              {errors.confirmPassword && <span className="error">{errors.confirmPassword}</span>}
            </div>

            {/* STAFF ONLY FIELDS */}
            {role === "staff" && (
              <>
                <div className="form-group">
                  <label>Staff ID</label>
                  <input name="staff_id" type="text" placeholder="e.g. SKY-STAFF-001"
                    value={formData.staff_id} onChange={handleChange}
                    className={errors.staff_id ? "err" : ""} />
                  {errors.staff_id && <span className="error">{errors.staff_id}</span>}
                </div>

                <div className="form-group">
                  <label>Department</label>
                  <select name="department" value={formData.department} onChange={handleChange}>
                    <option>General</option>
                    <option>Operations</option>
                    <option>Customer Service</option>
                    <option>Ground Crew</option>
                    <option>Cabin Crew</option>
                    <option>Technical</option>
                  </select>
                </div>
              </>
            )}
          </div>

          <div className="form-group checkbox-group">
            <label className="checkbox-label">
              <input type="checkbox" name="agree"
                checked={formData.agree} onChange={handleChange} />
              I agree to the Terms &amp; Conditions and Privacy Policy
            </label>
            {errors.agree && <span className="error">{errors.agree}</span>}
          </div>

          {serverError && <div className="server-error">{serverError}</div>}

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading
              ? <span className="spinner" />
              : `Create ${role === "staff" ? "Staff" : "Passenger"} Account`
            }
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}