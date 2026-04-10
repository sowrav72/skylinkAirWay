import React, { useEffect, useMemo, useState } from "react";
import "./App.css";

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
    gradient: "linear-gradient(160deg, #2d9cdb 0%, #1550af 45%, #012169 100%)",
  },
  {
    city: "Zurich",
    blurb: "Alpine elegance with seamless rail-air connections.",
    gradient: "linear-gradient(160deg, #73c2fb 0%, #2f80ed 40%, #1b2a72 100%)",
  },
  {
    city: "Seoul",
    blurb: "Smart city culture and premium lounge experiences.",
    gradient: "linear-gradient(160deg, #4a8dd8 0%, #1f75fe 50%, #012169 100%)",
  },
];

const features = [
  {
    title: "Global Reach",
    description: "Connect to 180+ destinations through our blue corridor network.",
    icon: "🌐",
    iconColor: "#1f75fe",
  },
  {
    title: "Always On Time",
    description: "Live schedule intelligence helps keep departures predictable.",
    icon: "🕒",
    iconColor: "#73c2fb",
  },
  {
    title: "Travel Protected",
    description: "Enterprise-grade security and resilient operations every flight.",
    icon: "🛡️",
    iconColor: "#73c2fb",
  },
];

export default function App() {
  const [health, setHealth] = useState("loading...");
  const [activeTripType, setActiveTripType] = useState(tripTypes[0]);

  useEffect(() => {
    const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:8000";

    fetch(`${apiUrl}/health`)
      .then((res) => res.json())
      .then((data) => setHealth(data.status))
      .catch(() => setHealth("offline"));
  }, []);
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
<main className="app-shell" id="home">
      <header className="top-nav">
        <div className="nav-inner">
          <div className="brand">Skylink <em>AirWay</em></div>
          <nav>
            <ul className="nav-links">
              {navItems.map((item) => (
                <li key={item.label}>
                  <a href={item.href}>{item.label}</a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="nav-actions">
            <button type="button" className="ghost-btn">Sign In</button>
            <button type="button" className="primary-btn">Check In</button>
          </div>
        </div>
      </header>

      <section className="hero">
        <div className="stars" aria-hidden="true">
          {stars.map((star) => (
            <span
              key={star.id}
              className="star"
              style={{ top: star.top, left: star.left, width: star.size, height: star.size, animationDelay: star.delay }}
            />
          ))}
        </div>

        <div className="hero-content">
          <span className="tagline">Global Blue Airlines</span>
          <h1>Where Every Journey<br />Meets the Horizon</h1>
          <p className="subtitle">
            Discover modern luxury with seamless booking, refined cabins, and destinations that bring the world closer.
          </p>

          <div className="search-panel">
            <div className="trip-type-row">
              {tripTypes.map((tripType) => (
                <button
                  key={tripType}
                  type="button"
                  className={`trip-type ${activeTripType === tripType ? "active" : ""}`}
                  onClick={() => setActiveTripType(tripType)}
                >
                  {tripType}
                </button>
              ))}
            </div>

            <div className="search-grid">
              <div className="field"><label htmlFor="from">From</label><input id="from" type="text" placeholder="City or Airport" /></div>
              <div className="field"><label htmlFor="to">To</label><input id="to" type="text" placeholder="City or Airport" /></div>
              <div className="field"><label htmlFor="depart">Depart</label><input id="depart" type="date" /></div>
              <div className="field">
                <label htmlFor="cabin">Cabin</label>
                <select id="cabin" defaultValue="Economy">
                  <option>Economy</option><option>Premium Economy</option><option>Business</option><option>First</option>
                </select>
              </div>
            </div>

            <div className="actions">
              <button className="search-btn" type="button">Search</button>
              <div className="popular-links">
                <span>Popular:</span>
                {popularRoutes.map((route) => (
                  <button key={route} className="pill" type="button">{route}</button>
                ))}
              </div>
            </div>
            <p className="health">System: {health}</p>
          </div>
        </div>
      </section>

      <section className="section" id="offers">
        <h2>Offers</h2>
        <ul className="offer-grid">
          {offers.map((offer) => (
            <li key={offer} className="offer-item">{offer}</li>
          ))}
        </ul>
      </section>

      <section className="section" id="destinations">
        <h2>Destinations</h2>
        <div className="destination-grid">
          {destinations.map((destination) => (
            <article className="destination-card" key={destination.city}>
              <div className="destination-image" style={{ background: destination.gradient }} />
              <div className="destination-overlay" />
              <div className="destination-content">
                <h3>{destination.city}</h3>
                <p>{destination.blurb}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section features" id="experience">
        <h2>Experience</h2>
        <div className="features-grid">
          {features.map((feature) => (
            <article className="feature-card" key={feature.title}>
              <div className="feature-icon" style={{ color: feature.iconColor }}>{feature.icon}</div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section about" id="about">
        <h2>About Skylink</h2>
        <p>
          We blend precision aviation operations with refined hospitality, creating blue-sky journeys designed around comfort,
          reliability, and global access.
        </p>
      </section>
    </main>
  );
}