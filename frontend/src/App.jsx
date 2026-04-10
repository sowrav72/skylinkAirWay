import React, { useEffect, useMemo, useState } from "react";
import { Routes, Route } from "react-router-dom";
import "./App.css";
import Navbar from "./Navbar";
import Login from "./Login";
import Register from "./Register";

const navItems = [
  { label: "Home", href: "#home" },
  { label: "Destinations", href: "#destinations" },
  { label: "Experience", href: "#experience" },
  { label: "Offers", href: "#offers" },
  { label: "About", href: "#about" },
];

const tripTypes = ["One Way", "Round Trip", "Multi-City"];
const popularRoutes = ["JFK → LHR", "SFO → NRT", "MIA → MAD", "DXB → SYD"];

const offers = [
  "Flight Deals",
  "Holiday Packages",
  "Business Class Offers",
  "Loyalty Rewards",
  "Student Fares",
  "Group Bookings",
];

const destinations = [
  {
    city: "Maldives",
    blurb: "Crystal lagoons and private villa arrivals.",
    gradient: "linear-gradient(160deg, #e0ffff 0%, #4f9fff 45%, #00308f 100%)",
  },
  {
    city: "Zurich",
    blurb: "Alpine elegance with seamless rail-air connections.",
    gradient: "linear-gradient(160deg, #e1ebee 0%, #6ea8ff 40%, #1b3787 100%)",
  },
  {
    city: "Seoul",
    blurb: "Smart city culture and premium lounge experiences.",
    gradient: "linear-gradient(160deg, #98c8ff 0%, #1877f2 50%, #00308f 100%)",
  },
];

const features = [
  {
    id: 1,
    title: "Global Reach",
    description:
      "Connect to 180+ destinations through our blue corridor network.",
    icon: "🌐",
    iconColor: "#1877f2",
  },
  {
    id: 2,
    title: "Always On Time",
    description:
      "Live schedule intelligence helps keep departures predictable.",
    icon: "🕒",
    iconColor: "#e0ffff",
  },
  {
    id: 3,
    title: "Travel Protected",
    description:
      "Enterprise-grade security and resilient operations every flight.",
    icon: "🛡️",
    iconColor: "#e1ebee",
  },
];

// Home page component
function Home() {
  const [health, setHealth] = useState("loading...");
  const [activeTripType, setActiveTripType] = useState(tripTypes[0]);

  useEffect(() => {
    const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:8000";

    fetch(`${apiUrl}/health`)
      .then((res) => res.json())
      .then((data) => setHealth(data.status))
      .catch(() => setHealth("offline"));
  }, []);

  // ✅ FIXED useMemo
  const stars = useMemo(
    () =>
      Array.from({ length: 36 }, (_, index) => ({
        id: index,
        top: `${(index * 11) % 100}%`,
        left: `${(index * 19) % 100}%`,
        size: `${(index % 3) + 2}px`,
        delay: `${(index % 8) * 0.5}s`,
      })),
    []
  );

  return (
    <main>
        {/* HERO */}
        <section className="hero" id="home">
          <div className="stars">
            {stars.map((star) => (
              <div
                key={star.id}
                className="star"
                style={{
                  top: star.top,
                  left: star.left,
                  width: star.size,
                  height: star.size,
                  animationDelay: star.delay,
                }}
              />
            ))}
          </div>

          <div className="hero-content">
            <span className="tagline">Premium Air Travel</span>
            <h1>Explore the world with Skylink</h1>
            <p className="subtitle">
              Discover seamless journeys, exclusive offers, and world-class
              service.
            </p>

            <div className="search-panel">
              <div className="trip-type-row">
                {tripTypes.map((type) => (
                  <button
                    key={type}
                    className={`trip-type ${
                      activeTripType === type ? "active" : ""
                    }`}
                    onClick={() => setActiveTripType(type)}
                  >
                    {type}
                  </button>
                ))}
              </div>

              <div className="actions">
                <button className="search-btn">Search Flights</button>

                <div className="popular-links">
                  <span>Popular:</span>
                  {popularRoutes.map((route) => (
                    <span key={route} className="pill">
                      {route}
                    </span>
                  ))}
                </div>
              </div>

              <p className="health">API Status: {health}</p>
            </div>
          </div>
        </section>

        {/* DESTINATIONS */}
        <section className="section" id="destinations">
          <h2>Destinations</h2>
          <div className="destination-grid">
            {destinations.map((dest) => (
              <div
                key={dest.city}
                className="destination-card"
                style={{ background: dest.gradient }}
              >
                <div className="destination-overlay"></div>
                <div className="destination-content">
                  <h3>{dest.city}</h3>
                  <p>{dest.blurb}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* OFFERS */}
        <section className="section" id="offers">
          <h2>Offers</h2>
          <ul className="offer-grid">
            {offers.map((offer) => (
              <li key={offer} className="offer-item">
                {offer}
              </li>
            ))}
          </ul>
        </section>

        {/* FEATURES */}
        <section className="section features" id="experience">
          <h2>Experience</h2>
          <div className="features-grid">
            {features.map((feature) => (
              <article className="feature-card" key={feature.id}>
                <div
                  className="feature-icon"
                  style={{ color: feature.iconColor }}
                >
                  {feature.icon}
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ABOUT */}
        <section className="section about" id="about">
          <h2>About Skylink</h2>
          <p>
            We blend precision aviation operations with refined hospitality,
            creating blue-sky journeys designed around comfort, reliability,
            and global access.
          </p>
        </section>
      </main>
    );
}

export default function App() {
  return (
    <div className="app-shell">
      <Navbar navItems={navItems} />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Routes>
    </div>
  );
}