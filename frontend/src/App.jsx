import React, { useEffect, useState } from "react";
import Navbar from "./Navbar";
import "./App.css";

const destinations = [
  {
    city: "Santorini",
    country: "Greece",
    region: "Europe",
    blurb: "Sunset cliff escapes with premium sky lounge access.",
    image:
      "url('https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=1200&q=80')",
  },
  {
    city: "Tokyo",
    country: "Japan",
    region: "Asia",
    blurb: "Midnight city lights and seamless global connections.",
    image:
      "url('https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1200&q=80')",
  },
  {
    city: "Reykjavík",
    country: "Iceland",
    region: "Nordic",
    blurb: "Arctic adventures guided by precision flight planning.",
    image:
      "url('https://images.unsplash.com/photo-1539650116574-8efeb43e2750?auto=format&fit=crop&w=1200&q=80')",
  },
];

const offers = [
  {
    route: "JFK → NRT",
    title: "Tokyo Business Escape",
    price: "$1,240",
    badge: "Limited Time",
    image:
      "url('https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=800&q=80')",
  },
  {
    route: "LHR → DXB",
    title: "Dubai Luxury Getaway",
    price: "$890",
    badge: "Sale",
    image:
      "url('https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=800&q=80')",
  },
  {
    route: "SFO → CDG",
    title: "Paris Summer Special",
    price: "$740",
    badge: "Best Value",
    image:
      "url('https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=800&q=80')",
  },
];

const features = [
  {
    icon: "🌐",
    num: "01",
    title: "Worldwide Routes",
    desc: "Fly across six continents with curated stopovers and flexible connections for every itinerary.",
  },
  {
    icon: "🕒",
    num: "02",
    title: "On-Time Precision",
    desc: "Industry-leading departure reliability with live gate updates keeping your journey on schedule.",
  },
  {
    icon: "🛡️",
    num: "03",
    title: "Trusted Security",
    desc: "Advanced safety standards and a secure digital boarding experience from check-in to landing.",
  },
];

const dealCategories = [
  "Flight Deals",
  "Holiday Packages",
  "Business Class Offers",
  "Loyalty Rewards",
  "Student Fares",
  "Group Bookings",
];

export default function App() {
  const [health, setHealth] = useState("loading...");
  const [tripType, setTripType] = useState("One Way");

  useEffect(() => {
    const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:8000";
    fetch(`${apiUrl}/health`)
      .then((res) => res.json())
      .then((data) => setHealth(data.status))
      .catch(() => setHealth("offline"));
  }, []);

  return (
    <main className="app-shell">
      <Navbar />

      {/* ── HERO ── */}
      <section className="hero" id="home">
        <div className="hero-bg" />
        <div className="hero-dim" />

        <div className="hero-content">
          <p className="hero-eyebrow">Global Blue Airlines</p>
          <h1>
            Where Every Journey<br />
            Meets the <em>Horizon</em>
          </h1>
          <p className="hero-sub">
            Discover modern luxury with seamless booking, refined cabins, and
            destinations that bring the world closer.
          </p>
        </div>

        {/* SEARCH BAR */}
        <div className="search-bar">
          <div className="tab-row">
            {["One Way", "Round Trip", "Multi-City"].map((t) => (
              <button
                key={t}
                className={`stab${tripType === t ? " on" : ""}`}
                onClick={() => setTripType(t)}
              >
                {t}
              </button>
            ))}
          </div>

          <div className="fields-row">
            <div className="sf">
              <label>From</label>
              <input placeholder="City or Airport" />
            </div>
            <div className="sf">
              <label>To</label>
              <input placeholder="City or Airport" />
            </div>
            <div className="sf">
              <label>Depart</label>
              <input type="date" />
            </div>
            <div className="sf">
              <label>Cabin</label>
              <select>
                <option>Economy</option>
                <option>Premium Economy</option>
                <option>Business</option>
                <option>First Class</option>
              </select>
            </div>
            <button className="sbtn">Search</button>
          </div>

          <div className="popular-row">
            <span className="pop-lbl">Popular:</span>
            {["JFK → LHR", "SFO → NRT", "MIA → MAD", "DXB → SYD"].map((r) => (
              <button key={r} className="spill">{r}</button>
            ))}
            <div className="status-pill">
              <span className="sdot" />
              System: {health}
            </div>
          </div>
        </div>
      </section>

      {/* ── DEALS STRIP ── */}
      <div className="deals-strip">
        <div className="deals-inner">
          {dealCategories.map((d, i) => (
            <div key={d} className={`deal-badge${i === 0 ? " active" : ""}`}>
              <span className="deal-dot" />
              {d}
            </div>
          ))}
        </div>
      </div>

      {/* ── DESTINATIONS ── */}
      <section className="section" id="destinations">
        <div className="sec-row">
          <div>
            <p className="sec-eyebrow">Explore the World</p>
            <h2 className="sec-title">
              Popular <em>Destinations</em>
            </h2>
          </div>
          <span className="sec-link">View All →</span>
        </div>

        <div className="dest-grid">
          {destinations.map((d) => (
            <article className="dest-card" key={d.city}>
              <div className="bg" style={{ backgroundImage: d.image }} />
              <div className="glass-layer" />
              <div className="dest-tag">{d.region}</div>
              <div className="dest-info">
                <p className="dest-region">{d.country}</p>
                <h3 className="dest-city">{d.city}</h3>
                <p className="dest-blurb">{d.blurb}</p>
                <button className="dest-btn">Explore →</button>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ── SPECIAL OFFERS ── */}
      <section className="offers-section" id="offers">
        <div className="offers-inner">
          <div className="sec-row">
            <div>
              <p className="sec-eyebrow">Exclusive Deals</p>
              <h2 className="sec-title">
                Special <em>Offers</em>
              </h2>
            </div>
            <span className="sec-link">All Offers →</span>
          </div>

          <div className="off-grid">
            {offers.map((o) => (
              <article className="off-card" key={o.title}>
                <div
                  className="off-img"
                  style={{ backgroundImage: o.image }}
                >
                  <span className="off-badge">{o.badge}</span>
                </div>
                <div className="off-body">
                  <p className="off-route">{o.route}</p>
                  <h3 className="off-title">{o.title}</h3>
                  <p className="off-price">
                    From <strong>{o.price}</strong> return
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="feat-section" id="features">
        <div className="feat-inner">
          <p className="feat-eyebrow">What Sets Us Apart</p>
          <h2 className="feat-title">
            Why Travelers Choose <em>Blue</em>
          </h2>
          <p className="feat-sub">
            World-class service, unmatched reliability, and experiences crafted
            for every kind of traveller.
          </p>

          <div className="feat-grid">
            {features.map((f) => (
              <article className="feat-card" key={f.title}>
                <span className="feat-icon">{f.icon}</span>
                <p className="feat-num">{f.num}</p>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="footer">
        <div className="foot-logo">
          Skylink <em>AirWay</em>
        </div>
        <p className="foot-copy">© 2026 Skylink AirWay. All rights reserved.</p>
      </footer>
    </main>
  );
}