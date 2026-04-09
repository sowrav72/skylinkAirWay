import React, { useEffect, useMemo, useState } from "react";
import "./App.css";

const destinations = [
  {
    city: "Santorini",
    blurb: "Sunset cliff escapes with premium sky lounge access.",
    image:
      "linear-gradient(140deg, rgba(115,194,251,0.4), rgba(1,33,105,0.85)), url('https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=1200&q=80')",
  },
  {
    city: "Tokyo",
    blurb: "Midnight city lights and seamless global connections.",
    image:
      "linear-gradient(140deg, rgba(115,194,251,0.3), rgba(1,33,105,0.88)), url('https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1200&q=80')",
  },
  {
    city: "Reykjavík",
    blurb: "Arctic adventures guided by precision flight planning.",
    image:
      "linear-gradient(140deg, rgba(115,194,251,0.38), rgba(1,33,105,0.9)), url('https://images.unsplash.com/photo-1539650116574-8efeb43e2750?auto=format&fit=crop&w=1200&q=80')",
  },
];

const features = [
  {
    title: "Worldwide Routes",
    description: "Fly across six continents with curated stopovers and flexible connections.",
    icon: "🌐",
    iconColor: "#1f75fe",
  },
  {
    title: "On-Time Precision",
    description: "Industry-leading departure reliability with live gate updates.",
    icon: "🕒",
    iconColor: "#73c2fb",
  },
  {
    title: "Trusted Security",
    description: "Advanced safety standards and secure digital boarding experience.",
    icon: "🛡️",
    iconColor: "#73c2fb",
  },
];

export default function App() {
  const [health, setHealth] = useState("loading...");

  useEffect(() => {
    const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:8000";

    fetch(`${apiUrl}/health`)
      .then((res) => res.json())
      .then((data) => setHealth(data.status))
      .catch(() => setHealth("unreachable"));
  }, []);

  const stars = useMemo(
    () =>
      Array.from({ length: 34 }, (_, index) => ({
        id: index,
        top: `${(index * 17) % 100}%`,
        left: `${(index * 29) % 100}%`,
        size: `${(index % 3) + 2}px`,
        delay: `${(index % 7) * 0.55}s`,
      })),
    []
  );

  return (

     <main className="app-shell">
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
          <h1>Where Every Journey Meets the Horizon in Style</h1>
          <p className="subtitle">
            Discover modern luxury in motion with thoughtfully designed cabins, seamless booking, and destinations that bring
            the world closer.
          </p>

          <div className="search-panel">
            <div className="search-grid">
              <div className="field">
                <label htmlFor="from">From</label>
                <input id="from" type="text" placeholder="New York (JFK)" />
              </div>
              <div className="field">
                <label htmlFor="to">To</label>
                <input id="to" type="text" placeholder="Paris (CDG)" />
              </div>
              <div className="field">
                <label htmlFor="depart">Depart</label>
                <input id="depart" type="date" />
              </div>
              <div className="field">
                <label htmlFor="cabin">Cabin</label>
                <select id="cabin" defaultValue="Business">
                  <option>Economy</option>
                  <option>Premium Economy</option>
                  <option>Business</option>
                  <option>First</option>
                </select>
              </div>
            </div>
            <div className="actions">
              <button className="search-btn" type="button">
                Search Flights
              </button>
              <div className="popular-links">
                <button className="pill" type="button">
                  New York → London
                </button>
                <button className="pill" type="button">
                  San Francisco → Tokyo
                </button>
                <button className="pill" type="button">
                  Miami → Madrid
                </button>
              </div>
            </div>
            <p className="health">System status: {health}</p>
          </div>
        </div>
      </section>

      <section className="section">
        <h2>Popular Destinations</h2>
        <div className="destination-grid">
          {destinations.map((destination) => (
            <article className="destination-card" key={destination.city}>
              <div className="destination-image" style={{ backgroundImage: destination.image }} />
              <div className="destination-overlay" />
              <div className="destination-content">
                <h3>{destination.city}</h3>
                <p>{destination.blurb}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="section features">
        <h2>Why Travelers Choose Blue</h2>
        <div className="features-grid">
          {features.map((feature) => (
            <article className="feature-card" key={feature.title}>
              <div className="feature-icon" style={{ color: feature.iconColor }}>
                {feature.icon}
              </div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}