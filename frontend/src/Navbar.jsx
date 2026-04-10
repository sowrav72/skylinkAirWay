import React from 'react';
import './Navbar.css';

const Navbar = () => {
  return (
    <header className="navbar">
      <div className="nav-container">
        <div className="brand">
          <span className="brand-icon">✈</span>
          <span className="brand-name">Skylink AirWay</span>
        </div>
        <nav className="nav-links">
          <a href="#home">Home</a>
          <a href="#destinations">Destinations</a>
          <a href="#features">Experience</a>
          <a href="#about">About</a>
          <button className="nav-btn">Check In</button>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;