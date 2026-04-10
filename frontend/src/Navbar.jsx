import React, { useState } from "react";
import "./Navbar.css";

const Navbar = ({ navItems = [] }) => {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="navbar">
      <div className="nav-inner">
        <div className="logo">
          Skylink <em>AirWay</em>
        </div>

        <nav className={`nav-links ${menuOpen ? "open" : ""}`}>
          {navItems.map((item) => (
            <a key={item.label} href={item.href} onClick={() => setMenuOpen(false)}>
              {item.label}
            </a>
          ))}
        </nav>

        <div className="nav-right">
          <a href="#account" className="nbtn-ghost">Sign In</a>
          <a href="#account" className="nbtn-solid">Register</a>
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