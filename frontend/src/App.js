import React, { useEffect, useState, useRef, useCallback, useMemo, memo } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import "./App.css";
import Navbar from "./Navbar";
import Login from "./Login";
import Register from "./Register";
import { ForgotPassword, ResetPassword } from "./ResetPassword";
import { UserProfile, StaffProfile } from "./Profile";
import AirportDropdown from "./components/AirportDropdown";
import BookingModal from "./components/BookingModal";
import FlightResults from "./components/FlightResults";
import LazyImage from "./components/LazyImage";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import PassengerProfile from "./components/PassengerProfile";
import StaffDashboard from "./components/StaffDashboard";

// ── IMPORT DATA ───────────────────────────────────────────────────────────────
import destinations from "./data/destinations.json";
import dealCategories from "./data/deals.json";
import features from "./data/features.json";

const API = process.env.REACT_APP_API_URL || "http://localhost:8000";

const tripTypes = ["One Way", "Round Trip", "Multi-City"];









// ── HOME ───────────────────────────────────────────────────────────────────────
const Home = memo(function Home() {
  const [health, setHealth] = useState("loading...");
  const [tripType, setTripType] = useState("One Way");
  const [activeDeal, setActiveDeal] = useState(0);
  const [airports, setAirports] = useState([]);
  const [fromCode, setFromCode] = useState("");
  const [toCode, setToCode] = useState("");
  const [departDate, setDepartDate] = useState("");
  const [cabinClass, setCabinClass] = useState("Economy");
  const [passengers, setPassengers] = useState(1);
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searchErr, setSearchErr] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  // For deal offer quick search
  const [offerModal, setOfferModal] = useState(null);

  useEffect(() => {
    fetch(`${API}/health`)
      .then((r) => r.json())
      .then((d) => setHealth(d.status))
      .catch(() => setHealth("offline"));
    fetch(`${API}/flights/airports`)
      .then((r) => r.json())
      .then((d) => setAirports(d.airports || []))
      .catch(() => {});
  }, []);

  const fillRoute = useCallback((from, to) => {
    setFromCode(from);
    setToCode(to);
    setResults(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const validateSearchForm = useCallback(() => {
    const errors = [];
    const fieldErrs = {};

    if (!fromCode) {
      errors.push("Please select an origin airport.");
      fieldErrs.from = true;
    }
    if (!toCode) {
      errors.push("Please select a destination airport.");
      fieldErrs.to = true;
    }
    if (fromCode && toCode && fromCode === toCode) {
      errors.push("Origin and destination airports cannot be the same.");
      fieldErrs.from = true;
      fieldErrs.to = true;
    }
    if (!departDate) {
      errors.push("Please select a departure date.");
      fieldErrs.date = true;
    } else {
      const selectedDate = new Date(departDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today) {
        errors.push("Departure date cannot be in the past.");
        fieldErrs.date = true;
      }
    }

    setFieldErrors(fieldErrs);
    return errors;
  }, [fromCode, toCode, departDate]);

  const handleSearch = useCallback(async () => {
    const validationErrors = validateSearchForm();
    if (validationErrors.length > 0) {
      setSearchErr(validationErrors.join(" "));
      // Focus on first error field
      if (!fromCode) {
        document.getElementById('airport-dropdown-from')?.focus();
      } else if (!toCode) {
        document.getElementById('airport-dropdown-to')?.focus();
      } else if (!departDate) {
        document.getElementById('depart-date')?.focus();
      }
      return;
    }
    setSearchErr("");
    setFieldErrors({});
    setSearching(true);
    setResults(null);
    try {
      const res = await fetch(`${API}/flights/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin_code: fromCode,
          destination_code: toCode,
          departure_date:
            departDate || new Date().toISOString().slice(0, 10),
          cabin_class: cabinClass,
          passengers,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Search failed");
      setResults(data.flights);
      setTimeout(
        () =>
          document
            .getElementById("results")
            ?.scrollIntoView({ behavior: "smooth" }),
        100
      );
    } catch (err) {
      setSearchErr(err.message);
    } finally {
      setSearching(false);
    }
  }, [fromCode, toCode, departDate, cabinClass, passengers, validateSearchForm]);

  // Quick search from destination card
  const handleDestinationSearch = useCallback((dest) => {
    // Find a popular route for this destination
    if (dest.routes?.length > 0) {
      const route = dest.routes[0];
      setFromCode(route.from);
      setToCode(dest.code);
      setCabinClass("Economy");
      window.scrollTo({ top: 0, behavior: "smooth" });
      setTimeout(() => {
        document.getElementById("search-bar")?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, []);

  // Quick search from offer card
  const handleOfferSearch = useCallback((offer) => {
    setFromCode(offer.from);
    setToCode(offer.to);
    setCabinClass(offer.cabin || "Economy");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const currentDeals = useMemo(() =>
    dealCategories[activeDeal]?.offers || [],
    [dealCategories, activeDeal]
  );

  return (
    <main>
      {/* HERO */}
      <section className="hero" id="home">
        <div className="hero-bg" />
        <div className="hero-dim" />
        <div className="hero-content">
          <p className="hero-eyebrow">Premium Air Travel</p>
          <h1>
            Explore the World
            <br />
            with <em>Skylink</em>
          </h1>
          <p className="hero-sub">
            Discover seamless journeys, exclusive offers, and world-class
            service crafted for the discerning traveller.
          </p>
        </div>

        {/* SEARCH BAR */}
        <div className="search-bar" id="search-bar">
          <div className="tab-row">
            {tripTypes.map((t) => (
              <button
                key={t}
                className={`stab${tripType === t ? " on" : ""}`}
                onClick={() => setTripType(t)}
              >
                {t}
              </button>
            ))}
            <div className="pax-control">
              <button
                className="pax-btn"
                onClick={() => setPassengers((p) => Math.max(1, p - 1))}
              >
                −
              </button>
              <span className="pax-num">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                {passengers}
              </span>
              <button
                className="pax-btn"
                onClick={() => setPassengers((p) => Math.min(9, p + 1))}
              >
                +
              </button>
            </div>
          </div>

          <form
            className="search-form"
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            role="search"
            aria-label="Flight search form"
          >
            <div className="fields-row">
              <div className={fieldErrors.from ? "field-error" : ""}>
                <AirportDropdown
                  label="From"
                  value={fromCode}
                  onChange={(value) => {
                    setFromCode(value);
                    if (fieldErrors.from) {
                      setFieldErrors(prev => ({ ...prev, from: false }));
                    }
                  }}
                  airports={airports}
                  placeholder="Origin airport"
                />
              </div>
              <button
                type="button"
                className="swap-btn"
                onClick={() => {
                  setFromCode(toCode);
                  setToCode(fromCode);
                }}
                title="Swap origin and destination"
                aria-label="Swap origin and destination airports"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <polyline points="17 1 21 5 17 9" />
                  <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                  <polyline points="7 23 3 19 7 15" />
                  <path d="M21 13v2a4 4 0 0 1-4 4H3" />
                </svg>
              </button>
              <div className={fieldErrors.to ? "field-error" : ""}>
                <AirportDropdown
                  label="To"
                  value={toCode}
                  onChange={(value) => {
                    setToCode(value);
                    if (fieldErrors.to) {
                      setFieldErrors(prev => ({ ...prev, to: false }));
                    }
                  }}
                  airports={airports}
                  placeholder="Destination airport"
                />
              </div>
              <div className={`sf ${fieldErrors.date ? "field-error" : ""}`}>
                <label htmlFor="depart-date">Depart</label>
                <input
                  id="depart-date"
                  type="date"
                  value={departDate}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => {
                    setDepartDate(e.target.value);
                    if (fieldErrors.date) {
                      setFieldErrors(prev => ({ ...prev, date: false }));
                    }
                  }}
                  aria-describedby="depart-date-help"
                  aria-invalid={fieldErrors.date}
                />
                <div id="depart-date-help" className="sr-only">Select your departure date</div>
              </div>
              <div className="sf">
                <label htmlFor="cabin-class">Cabin</label>
                <select
                  id="cabin-class"
                  value={cabinClass}
                  onChange={(e) => setCabinClass(e.target.value)}
                  aria-describedby="cabin-class-help"
                >
                  <option>Economy</option>
                  <option>Premium Economy</option>
                  <option>Business</option>
                  <option>First</option>
                </select>
                <div id="cabin-class-help" className="sr-only">Select your preferred cabin class</div>
              </div>
              <button
                type="submit"
                className="sbtn"
                disabled={searching}
                aria-describedby={searching ? "searching-status" : undefined}
              >
              {searching ? (
                <span className="sbtn-spinner" />
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  Search
                </>
              )}
            </button>
            </div>
            {searching && (
              <div id="searching-status" className="sr-only" aria-live="polite">
                Searching for flights...
              </div>
            )}
          </form>

          <div className="popular-row">
            <span className="pop-lbl">Popular:</span>
            {[
              { label: "JFK → LHR", from: "JFK", to: "LHR" },
              { label: "SFO → NRT", from: "SFO", to: "NRT" },
              { label: "MIA → MAD", from: "MIA", to: "MAD" },
              { label: "DXB → SYD", from: "DXB", to: "SYD" },
            ].map((r) => (
              <button
                key={r.label}
                className="spill"
                onClick={() => fillRoute(r.from, r.to)}
              >
                {r.label}
              </button>
            ))}
            <div className="status-pill">
              <span className={`sdot${health === "ok" ? " green" : ""}`} />
              System: {health}
            </div>
          </div>

          {searchErr && (
            <div className="search-error" role="alert" aria-live="polite">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{searchErr}</span>
            </div>
          )}
        </div>
      </section>

      {/* RESULTS */}
      <div id="results">
        <FlightResults
          results={results}
          loading={searching}
          passengers={passengers}
          searching={searching}
        />
      </div>

      {/* DEALS STRIP */}
      <div className="deals-strip">
        <div className="deals-inner">
          {dealCategories.map((d, i) => (
            <div
              key={d.key}
              className={`deal-badge${activeDeal === i ? " active" : ""}`}
              onClick={() => setActiveDeal(i)}
            >
              <span className="deal-icon">{d.icon}</span>
              <span className="deal-dot" />
              {d.label}
            </div>
          ))}
        </div>
      </div>

      {/* ACTIVE DEALS OFFERS */}
      <section className="offers-section" id="offers">
        <div className="offers-inner">
          <div className="sec-row">
            <div>
              <p className="sec-eyebrow">
                {dealCategories[activeDeal].icon}{" "}
                {dealCategories[activeDeal].label}
              </p>
              <h2 className="sec-title">
                Exclusive <em>Deals</em>
              </h2>
            </div>
            <span className="sec-link" onClick={() => setActiveDeal((a) => (a + 1) % dealCategories.length)}>
              Next Category →
            </span>
          </div>
          <div className="off-grid">
            {currentDeals.map((o) => (
              <article className="off-card" key={o.title}>
                <div className="off-img">
                  <LazyImage
                    src={o.image.replace("url('", "").replace("')", "")}
                    alt={o.title}
                    placeholder="https://via.placeholder.com/280x190/e0e0e0/cccccc?text=Loading..."
                  />
                  <span className="off-badge">{o.badge}</span>
                </div>
                <div className="off-body">
                  <p className="off-route">{o.route}</p>
                  <h3 className="off-title">{o.title}</h3>
                  <p className="off-price">
                    From <strong>{o.price}</strong> per person
                  </p>
                  <button
                    className="off-search-btn"
                    onClick={() => handleOfferSearch(o)}
                  >
                    Search This Flight →
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* DESTINATIONS */}
      <div className="section" id="destinations">
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
              <LazyImage
                src={d.image.replace("url('", "").replace("')", "")}
                alt={d.city}
                className="bg"
                placeholder="https://via.placeholder.com/400x600/e0e0e0/cccccc?text=Loading..."
              />
              <div className="glass-layer" />
              <div className="dest-tag">{d.region}</div>
              <div className="dest-info">
                <p className="dest-region">{d.country}</p>
                <h3 className="dest-city">{d.city}</h3>
                <p className="dest-blurb">{d.blurb}</p>
                <div className="dest-routes">
                  {d.routes.map((r) => (
                    <button
                      key={r.label}
                      className="dest-route-btn"
                      onClick={() => handleDestinationSearch(d)}
                    >
                      ✈ {r.label}
                    </button>
                  ))}
                </div>
                <button
                  className="dest-btn"
                  onClick={() => handleDestinationSearch(d)}
                >
                  Search Flights →
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>

      {/* FEATURES */}
      <section className="feat-section" id="experience">
        <div className="feat-inner">
          <p className="feat-eyebrow">What Sets Us Apart</p>
          <h2 className="feat-title">
            Why Travelers Choose <em>Blue</em>
          </h2>
          <p className="feat-sub">
            World-class service, unmatched reliability, and experiences
            crafted for every kind of traveller.
          </p>
          <div className="feat-grid">
            {features.map((f) => (
              <article className="feat-card" key={f.title}>
                <div className="feat-icon">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <path d={f.icon} />
                  </svg>
                </div>
                <p className="feat-num">{f.num}</p>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section className="about-section" id="about">
        <div className="sec-row">
          <div>
            <p className="sec-eyebrow">Our Story</p>
            <h2 className="sec-title">
              About <em>Skylink</em>
            </h2>
          </div>
        </div>
        <div className="about-card">
          <p>
            We blend precision aviation operations with refined hospitality,
            creating blue-sky journeys designed around comfort, reliability,
            and global access. From the moment you book to the moment you
            land, every detail of your Skylink experience is crafted to
            exceed expectations.
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="foot-logo">
          Skylink <em>AirWay</em>
        </div>
        <p className="foot-copy">
          © {new Date().getFullYear()} Skylink AirWay. All rights reserved.
        </p>
      </footer>
    </main>
  );
});

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <div className="app-shell">
          <Navbar />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/profile/user" element={<PassengerProfile />} />
          <Route path="/profile/staff" element={<StaffDashboard />} />
        </Routes>
        </div>
      </ThemeProvider>
    </ErrorBoundary>
  );
}