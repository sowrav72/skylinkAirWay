import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";

const NAV_LINKS = [
  { label: "Home",         href: "/#home" },
  { label: "Destinations", href: "/#destinations" },
  { label: "Offers",       href: "/#offers" },
  { label: "Experience",   href: "/#experience" },
  { label: "About",        href: "/#about" },
];

export default function Navbar() {
  const [scrolled,  setScrolled]  = useState(false);
  const [menuOpen,  setMenuOpen]  = useState(false);
  const [dropOpen,  setDropOpen]  = useState(false);
  const [user,      setUser]      = useState(null);
  const navigate  = useNavigate();
  const location  = useLocation();
  const dropRef   = useRef(null);

  // Read auth from localStorage
  useEffect(() => {
    const token    = localStorage.getItem("skylink_token");
    const name     = localStorage.getItem("skylink_name");
    const role     = localStorage.getItem("skylink_role");
    if (token && name) setUser({ name, role });
  }, [location]);

  // Scroll shadow
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", h);
    return () => window.removeEventListener("scroll", h);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const h = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const handleAnchor = (e, href) => {
    setMenuOpen(false);
    if (href.startsWith("/#")) {
      e.preventDefault();
      const id = href.slice(2);
      if (location.pathname !== "/") {
        navigate("/");
        setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }), 200);
      } else {
        document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
      }
    }
  };

  const logout = () => {
    localStorage.removeItem("skylink_token");
    localStorage.removeItem("skylink_name");
    localStorage.removeItem("skylink_role");
    setUser(null);
    setDropOpen(false);
    navigate("/");
  };

  const profilePath = user?.role === "passenger" ? "/profile/user" : "/profile/staff";

  return (
    <nav className={`navbar${scrolled ? " navbar-scrolled" : ""}`}>
      <div className="nav-inner">
        {/* Logo */}
        <Link to="/" className="nav-logo" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
          </svg>
          Skylink <em>AirWay</em>
        </Link>

        {/* Desktop nav links */}
        <ul className="nav-links">
          {NAV_LINKS.map(({ label, href }) => (
            <li key={label}>
              <a href={href} className="nav-link" onClick={(e) => handleAnchor(e, href)}>
                {label}
              </a>
            </li>
          ))}
        </ul>

        {/* Auth area */}
        <div className="nav-auth">
          {user ? (
            <div className="nav-user" ref={dropRef}>
              <button className="nav-avatar" onClick={() => setDropOpen(!dropOpen)}>
                <span className="avatar-initials">{user.name.charAt(0).toUpperCase()}</span>
                <span className="avatar-name">{user.name.split(" ")[0]}</span>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                  style={{ transform: dropOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
              {dropOpen && (
                <div className="nav-dropdown">
                  <div className="nd-role">{user.role}</div>
                  <Link to={profilePath} className="nd-item" onClick={() => setDropOpen(false)}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                    </svg>
                    My Profile
                  </Link>
                  <button className="nd-item nd-logout" onClick={logout}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                      <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
                    </svg>
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/login"    className="nav-btn-ghost">Login</Link>
              <Link to="/register" className="nav-btn-solid">Register</Link>
            </>
          )}
        </div>

        {/* Hamburger */}
        <button className={`hamburger${menuOpen ? " open" : ""}`} onClick={() => setMenuOpen(!menuOpen)}>
          <span /><span /><span />
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="mobile-menu">
          {NAV_LINKS.map(({ label, href }) => (
            <a key={label} href={href} className="mob-link" onClick={(e) => handleAnchor(e, href)}>
              {label}
            </a>
          ))}
          <div className="mob-divider" />
          {user ? (
            <>
              <Link to={profilePath} className="mob-link" onClick={() => setMenuOpen(false)}>My Profile</Link>
              <button className="mob-logout" onClick={logout}>Logout</button>
            </>
          ) : (
            <>
              <Link to="/login"    className="mob-link"   onClick={() => setMenuOpen(false)}>Login</Link>
              <Link to="/register" className="mob-btn"    onClick={() => setMenuOpen(false)}>Register</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}