import React, { useState } from "react";
import { Link } from "react-router-dom";
import "./Navbar.css";

const Navbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const isLoggedIn = localStorage.getItem("authToken") ? true : false;

  const handleLogout = () => {
    localStorage.removeItem("authToken");
    setProfileOpen(false);
    window.location.reload();
  };

  return (
    <header className="navbar">
      <div className="nav-inner">
        {/* LOGO */}
        <Link to="/" className="logo">
          Skylink <em>AirWay</em>
        </Link>

        {/* CENTER NAV */}
        <nav className={`nav-center ${menuOpen ? "open" : ""}`}>
          <Link to="/#home" onClick={() => setMenuOpen(false)}>Home</Link>
          <Link to="/#destinations" onClick={() => setMenuOpen(false)}>Destinations</Link>
          <Link to="/#offers" onClick={() => setMenuOpen(false)}>Offers</Link>
          <Link to="/#experience" onClick={() => setMenuOpen(false)}>Experience</Link>
          <Link to="/#about" onClick={() => setMenuOpen(false)}>About</Link>
        </nav>

        {/* RIGHT ACTIONS */}
        <div className="nav-right">
          {/* QUICK SEARCH */}
          <button className="nav-icon-btn" title="Search Bookings">🔍</button>

          {/* NOTIFICATIONS */}
          <div className="nav-dropdown">
            <button
              className="nav-icon-btn"
              onClick={() => {
                setNotificationsOpen(!notificationsOpen);
                setProfileOpen(false);
              }}
              title="Notifications"
            >
              🔔
              <span className="notification-badge">2</span>
            </button>
            {notificationsOpen && (
              <div className="dropdown-menu notification-dropdown">
                <div className="dropdown-item">✈️ Your flight is confirmed!</div>
                <div className="dropdown-item">🎉 New deal: 20% off to Paris</div>
                <div className="dropdown-link">View All →</div>
              </div>
            )}
          </div>

          {/* HELP */}
          <button className="nav-icon-btn" title="Help & Support">❓</button>

          {/* AUTH */}
          {isLoggedIn ? (
            <div className="nav-dropdown">
              <button
                className="nav-icon-btn"
                onClick={() => {
                  setProfileOpen(!profileOpen);
                  setNotificationsOpen(false);
                }}
                title="Profile"
              >
                👤
              </button>
              {profileOpen && (
                <div className="dropdown-menu profile-dropdown">
                  <Link to="/profile" className="dropdown-link">My Profile</Link>
                  <Link to="/bookings" className="dropdown-link">My Bookings</Link>
                  <Link to="/saved-flights" className="dropdown-link">Saved Flights</Link>
                  <Link to="/rewards" className="dropdown-link">Rewards & Miles</Link>
                  <hr className="dropdown-divider" />
                  <button className="dropdown-link logout-btn" onClick={handleLogout}>
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <Link to="/login" className="nbtn-ghost" onClick={() => setMenuOpen(false)}>
                Sign In
              </Link>
              <Link to="/register" className="nbtn-solid" onClick={() => setMenuOpen(false)}>
                Sign Up
              </Link>
            </>
          )}

          {/* HAMBURGER */}
          <button
            className="hamburger"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;