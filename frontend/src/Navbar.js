import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";

export default function Navbar() {
  const [scrolled,  setScrolled]  = useState(false);
  const [menuOpen,  setMenuOpen]  = useState(false);
  const [user,      setUser]      = useState(null);
  const [dropOpen,  setDropOpen]  = useState(false);
  const dropRef = useRef(null);
  const navigate  = useNavigate();
  const location  = useLocation();

  // Sync user from localStorage on every route change
  useEffect(() => {
    const stored = localStorage.getItem("skylink_user");
    setUser(stored ? JSON.parse(stored) : null);
  }, [location.pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const h = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const logout = () => {
    localStorage.removeItem("skylink_token");
    localStorage.removeItem("skylink_user");
    setUser(null);
    setDropOpen(false);
    navigate("/");
  };

  const navLinks = [
    { label: "Flights",      href: "/#home" },
    { label: "Destinations", href: "/#destinations" },
    { label: "Offers",       href: "/#offers" },
    { label: "About",        href: "/#about" },
  ];

  const initials = user ? user.full_name.split(" ").map(w => w[0]).join("").slice(0,2).toUpperCase() : "";

  return (
    <nav className={`navbar${scrolled ? " scrolled" : ""}`}>
      <div className="nav-inner">
        {/* LOGO */}
        <Link to="/" className="nav-logo" onClick={() => setMenuOpen(false)}>
          <span className="logo-icon">✈</span>
          Skylink <em>AirWay</em>
        </Link>

        {/* DESKTOP LINKS */}
        <div className="nav-links">
          {navLinks.map(l => (
            <a key={l.label} href={l.href} className="nav-link">{l.label}</a>
          ))}
        </div>

        {/* AUTH AREA */}
        <div className="nav-auth">
          {user ? (
            <div className="nav-user-wrap" ref={dropRef}>
              <button className="nav-avatar" onClick={() => setDropOpen(!dropOpen)}>
                <span className="avatar-initials">{initials}</span>
                <span className="avatar-name">{user.full_name.split(" ")[0]}</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                  style={{ transform: dropOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
              {dropOpen && (
                <div className="nav-drop">
                  <div className="nav-drop-head">
                    <span className="nd-name">{user.full_name}</span>
                    <span className="nd-role">{user.role}</span>
                  </div>
                  <Link
                    className="nd-item"
                    to={user.role === "passenger" ? "/profile/user" : "/profile/staff"}
                    onClick={() => setDropOpen(false)}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                    My Profile
                  </Link>
                  {user.role !== "passenger" && (
                    <Link className="nd-item" to="/profile/staff" onClick={() => setDropOpen(false)}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                        <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                      </svg>
                      Staff Dashboard
                    </Link>
                  )}
                  <button className="nd-item nd-logout" onClick={logout}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                      <polyline points="16 17 21 12 16 7"/>
                      <line x1="21" y1="12" x2="9" y2="12"/>
                    </svg>
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/login"    className="nav-btn-ghost">Sign In</Link>
              <Link to="/register" className="nav-btn-solid">Register</Link>
            </>
          )}
        </div>

        {/* HAMBURGER */}
        <button className={`nav-burger${menuOpen ? " open" : ""}`} onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
          <span /><span /><span />
        </button>
      </div>

      {/* MOBILE MENU */}
      {menuOpen && (
        <div className="nav-mobile">
          {navLinks.map(l => (
            <a key={l.label} href={l.href} className="nm-link" onClick={() => setMenuOpen(false)}>{l.label}</a>
          ))}
          <div className="nm-divider" />
          {user ? (
            <>
              <span className="nm-user">{user.full_name}</span>
              <Link className="nm-link" to={user.role === "passenger" ? "/profile/user" : "/profile/staff"} onClick={() => setMenuOpen(false)}>My Profile</Link>
              <button className="nm-link nm-logout" onClick={() => { logout(); setMenuOpen(false); }}>Sign Out</button>
            </>
          ) : (
            <>
              <Link to="/login"    className="nm-link" onClick={() => setMenuOpen(false)}>Sign In</Link>
              <Link to="/register" className="nm-link" onClick={() => setMenuOpen(false)}>Register</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}