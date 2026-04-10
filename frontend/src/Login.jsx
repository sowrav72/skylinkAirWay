import React, { useState } from "react";
import { Link } from "react-router-dom";

export default function Login() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    remember: false,
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState("");

  // handle input change
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  // basic validation
  const validate = () => {
    const newErrors = {};

    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 6) {
      newErrors.password = "Minimum 6 characters required";
    }

    return newErrors;
  };

  // handle submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || ""}/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed");
      }

      // success (store token, redirect, etc.)
      console.log("Login success:", data);

    } catch (err) {
      setServerError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="glass-container">
        <h2>Welcome Back</h2>
        <p className="auth-subtitle">Sign in to continue your journey ✈️</p>

        <form className="auth-form" onSubmit={handleSubmit}>
        {/* EMAIL */}
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          placeholder="you@example.com"
          value={formData.email}
          onChange={handleChange}
        />
        {errors.email && <span className="error">{errors.email}</span>}

        {/* PASSWORD */}
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          placeholder="••••••••"
          value={formData.password}
          onChange={handleChange}
        />
        {errors.password && <span className="error">{errors.password}</span>}

        {/* OPTIONS */}
        <div className="auth-options">
          <label className="remember">
            <input
              type="checkbox"
              name="remember"
              checked={formData.remember}
              onChange={handleChange}
            />
            Remember me
          </label>

          <a href="#" className="forgot-link">
            Forgot password?
          </a>
        </div>

        {/* ERROR */}
        {serverError && <div className="server-error">{serverError}</div>}

        {/* BUTTON */}
        <button type="submit" className="primary-btn" disabled={loading}>
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      {/* FOOTER */}
      <p className="auth-footer">
        Don't have an account? <Link to="/register">Sign up</Link>
      </p>
      </div>
    </div>
  );
}