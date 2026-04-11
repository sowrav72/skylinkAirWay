import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "./Navbar.css";

const Navbar = () => {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const token    = localStorage.getItem("authToken");
  const userRole = localStorage.getItem("userRole");
  const userName = localStorage.getItem("userName") || "Account";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const close = () => { setProfileOpen(false); };
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    setProfileOpen(false);
    navigate("/login");
  };

  const profilePath = userRole === "staff" ? "/profile/staff" : "/profile/user";

  return (
    <header className={`navbar${scrolled ? " scrolled" : ""}`}>
      <div className="nav-inner">

        {/* LOGO */}
        <Link to="/" className="logo">
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none" className="logo-icon">
            <path d="M4 20L16 4L28 20L22 18L16 28L10 18L4 20Z" fill="#90caf9" opacity="0.9"/>
          </svg>
          Skylink <em>AirWay</em>
        </Link>

        {/* CENTER NAV */}
        <nav className={`nav-center ${menuOpen ? "open" : ""}`}>
          <Link to="/#home"         onClick={() => setMenuOpen(false)}>Home</Link>
          <Link to="/#destinations" onClick={() => setMenuOpen(false)}>Destinations</Link>
          <Link to="/#offers"       onClick={() => setMenuOpen(false)}>Offers</Link>
          <Link to="/#experience"   onClick={() => setMenuOpen(false)}>Experience</Link>
          <Link to="/#about"        onClick={() => setMenuOpen(false)}>About</Link>
        </nav>

        {/* RIGHT */}
        <div className="nav-right">
          {token ? (
            /* LOGGED IN */
            <div className="nav-dropdown" onClick={(e) => e.stopPropagation()}>
              <button
                className="nav-profile-btn"
                onClick={() => setProfileOpen(!profileOpen)}
              >
                {/* Person icon */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                <span className="nav-username">{userName.split(" ")[0]}</span>
                {/* Chevron */}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                  style={{ transform: profileOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>

              {profileOpen && (
                <div className="dropdown-menu">
                  <div className="dropdown-header">
                    <span className="dh-name">{userName}</span>
                    <span className={`dh-role ${userRole}`}>{userRole}</span>
                  </div>
                  <hr className="dropdown-divider" />
                  <Link to={profilePath} className="dropdown-link" onClick={() => setProfileOpen(false)}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                    My Profile
                  </Link>
                  {userRole === "user" && (
                    <Link to="/bookings" className="dropdown-link" onClick={() => setProfileOpen(false)}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                      </svg>
                      My Bookings
                    </Link>
                  )}
                  {userRole === "staff" && (
                    <Link to="/flights" className="dropdown-link" onClick={() => setProfileOpen(false)}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                      </svg>
                      Manage Flights
                    </Link>
                  )}
                  <hr className="dropdown-divider" />
                  <button className="dropdown-link logout" onClick={handleLogout}>
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
            /* LOGGED OUT */
            <>
              <Link to="/login"    className="nbtn-ghost">Sign In</Link>
              <Link to="/register" className="nbtn-solid">Sign Up</Link>
            </>
          )}

          {/* HAMBURGER */}
          <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)} aria-label="Menu">
            <span className={menuOpen ? "open" : ""} />
            <span className={menuOpen ? "open" : ""} />
            <span className={menuOpen ? "open" : ""} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;