import React, { useState } from "react";
import { Link } from "react-router-dom";
import "./Navbar.css";

const Navbar = ({ navItems = [] }) => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="navbar">
      <div className="nav-inner">
        <div className="logo">
          <Link to="/" style={{ textDecoration: "none", color: "inherit" }}>
            Skylink <em>AirWay</em>
          </Link>
        </div>

        <nav className={`nav-links ${menuOpen ? "open" : ""}`}>
          {navItems.map((item) => (
            <a key={item.label} href={item.href} onClick={() => setMenuOpen(false)}>
              {item.label}
            </a>
          ))}
        </nav>

        <div className="nav-right">
          <Link to="/login" className="nbtn-ghost" onClick={() => setMenuOpen(false)}>Sign In</Link>
          <Link to="/register" className="nbtn-solid" onClick={() => setMenuOpen(false)}>Register</Link>
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