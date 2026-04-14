import React, { useEffect, useState, useRef, useCallback } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import "./App.css";
import Navbar from "./Navbar";
import Login from "./Login";
import Register from "./Register";
import { ForgotPassword, ResetPassword } from "./ResetPassword";
import { UserProfile, StaffProfile } from "./Profile";

const API = process.env.REACT_APP_API_URL || "http://localhost:8000";

const tripTypes = ["One Way", "Round Trip", "Multi-City"];

// ── DESTINATIONS DATA ──────────────────────────────────────────────────────────
const destinations = [
  {
    city: "Tokyo",
    country: "Japan",
    region: "Asia",
    code: "NRT",
    blurb: "Midnight city lights and seamless global connections.",
    image:
      "url('https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1200&q=80')",
    routes: [
      { from: "JFK", label: "New York → Tokyo" },
      { from: "SFO", label: "San Francisco → Tokyo" },
    ],
  },
  {
    city: "Dubai",
    country: "UAE",
    region: "Middle East",
    code: "DXB",
    blurb: "Iconic skylines, desert adventures, and world-class luxury.",
    image:
      "url('https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=1200&q=80')",
    routes: [{ from: "LHR", label: "London → Dubai" }],
  },
  {
    city: "Paris",
    country: "France",
    region: "Europe",
    code: "CDG",
    blurb: "Art, cuisine, and romance under Eiffel's eternal glow.",
    image:
      "url('https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80')",
    routes: [
      { from: "JFK", label: "New York → Paris" },
      { from: "SFO", label: "San Francisco → Paris" },
    ],
  },
];

// ── DEALS / OFFERS DATA ────────────────────────────────────────────────────────
const dealCategories = [
  {
    key: "flight-deals",
    label: "Flight Deals",
    icon: "✈️",
    offers: [
      {
        route: "JFK → LHR",
        title: "New York to London",
        price: "$540",
        badge: "Best Value",
        cabin: "Economy",
        from: "JFK",
        to: "LHR",
        image:
          "url('https://images.unsplash.com/photo-1486325212027-8081e485255e?auto=format&fit=crop&w=800&q=80')",
      },
      {
        route: "SFO → NRT",
        title: "San Francisco to Tokyo",
        price: "$740",
        badge: "Popular",
        cabin: "Economy",
        from: "SFO",
        to: "NRT",
        image:
          "url('https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=800&q=80')",
      },
      {
        route: "MIA → MAD",
        title: "Miami to Madrid",
        price: "$580",
        badge: "Limited",
        cabin: "Economy",
        from: "MIA",
        to: "MAD",
        image:
          "url('https://images.unsplash.com/photo-1539037116277-4db20889f2d4?auto=format&fit=crop&w=800&q=80')",
      },
    ],
  },
  {
    key: "business-class",
    label: "Business Class",
    icon: "💼",
    offers: [
      {
        route: "JFK → LHR",
        title: "NY London Business",
        price: "$1,240",
        badge: "Premium",
        cabin: "Business",
        from: "JFK",
        to: "LHR",
        image:
          "url('https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=800&q=80')",
      },
      {
        route: "LHR → DXB",
        title: "London Dubai Business",
        price: "$890",
        badge: "Luxury",
        cabin: "Business",
        from: "LHR",
        to: "DXB",
        image:
          "url('https://images.unsplash.com/photo-1578574577315-3fbeb0cecdc2?auto=format&fit=crop&w=800&q=80')",
      },
      {
        route: "JFK → NRT",
        title: "NY Tokyo Business",
        price: "$2,100",
        badge: "First Class",
        cabin: "Business",
        from: "JFK",
        to: "NRT",
        image:
          "url('https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=80')",
      },
    ],
  },
  {
    key: "holiday-packages",
    label: "Holiday Packages",
    icon: "🏖️",
    offers: [
      {
        route: "DXB → SYD",
        title: "Dubai to Sydney",
        price: "$810",
        badge: "Holiday",
        cabin: "Economy",
        from: "DXB",
        to: "SYD",
        image:
          "url('https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&w=800&q=80')",
      },
      {
        route: "SIN → BKK",
        title: "Singapore to Bangkok",
        price: "$180",
        badge: "Weekend",
        cabin: "Economy",
        from: "SIN",
        to: "BKK",
        image:
          "url('https://images.unsplash.com/photo-1563492065599-3520f775eeed?auto=format&fit=crop&w=800&q=80')",
      },
      {
        route: "LHR → SIN",
        title: "London to Singapore",
        price: "$620",
        badge: "Asia Tour",
        cabin: "Economy",
        from: "LHR",
        to: "SIN",
        image:
          "url('https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=800&q=80')",
      },
    ],
  },
  {
    key: "loyalty-rewards",
    label: "Loyalty Rewards",
    icon: "⭐",
    offers: [
      {
        route: "JFK → CDG",
        title: "NY Paris Premium",
        price: "$480",
        badge: "Members Only",
        cabin: "Economy",
        from: "JFK",
        to: "CDG",
        image:
          "url('https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=800&q=80')",
      },
      {
        route: "DXB → SIN",
        title: "Dubai to Singapore",
        price: "$420",
        badge: "Gold Member",
        cabin: "Economy",
        from: "DXB",
        to: "SIN",
        image:
          "url('https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=800&q=80')",
      },
    ],
  },
  {
    key: "student-fares",
    label: "Student Fares",
    icon: "🎓",
    offers: [
      {
        route: "LHR → JFK",
        title: "London to New York",
        price: "$399",
        badge: "Student",
        cabin: "Economy",
        from: "LHR",
        to: "JFK",
        image:
          "url('https://images.unsplash.com/photo-1496588152823-86ff7695e68f?auto=format&fit=crop&w=800&q=80')",
      },
      {
        route: "SFO → CDG",
        title: "SF to Paris Study Abroad",
        price: "$599",
        badge: "Student Deal",
        cabin: "Economy",
        from: "SFO",
        to: "CDG",
        image:
          "url('https://images.unsplash.com/photo-1543332164-6e82f355badc?auto=format&fit=crop&w=800&q=80')",
      },
    ],
  },
  {
    key: "group-bookings",
    label: "Group Bookings",
    icon: "👥",
    offers: [
      {
        route: "JFK → NRT",
        title: "Group NY Tokyo",
        price: "$820",
        badge: "Group 10+",
        cabin: "Economy",
        from: "JFK",
        to: "NRT",
        image:
          "url('https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=800&q=80')",
      },
      {
        route: "MIA → MAD",
        title: "Group Miami Madrid",
        price: "$520",
        badge: "Group Deal",
        cabin: "Economy",
        from: "MIA",
        to: "MAD",
        image:
          "url('https://images.unsplash.com/photo-1539037116277-4db20889f2d4?auto=format&fit=crop&w=800&q=80')",
      },
    ],
  },
];

const features = [
  {
    num: "01",
    title: "Global Reach",
    desc: "Connect to 180+ destinations through our blue corridor network with curated stopovers.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10" />
        <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
  },
  {
    num: "02",
    title: "Always On Time",
    desc: "Live schedule intelligence and real-time gate updates keep your departure predictable.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    num: "03",
    title: "Travel Protected",
    desc: "Enterprise-grade safety standards and secure digital boarding from check-in to landing.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    num: "04",
    title: "Seamless Booking",
    desc: "Book, manage, and cancel flights in seconds from any device, anywhere in the world.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="5" y="2" width="14" height="20" rx="2" />
        <line x1="12" y1="18" x2="12.01" y2="18" />
      </svg>
    ),
  },
];

// ── AIRPORT DROPDOWN ───────────────────────────────────────────────────────────
function AirportDropdown({ label, value, onChange, airports, placeholder }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const filtered = airports.filter((a) => {
    const q = query.toLowerCase();
    return (
      a.code.toLowerCase().includes(q) ||
      a.city.toLowerCase().includes(q) ||
      a.name.toLowerCase().includes(q) ||
      a.country.toLowerCase().includes(q)
    );
  });

  const selected = airports.find((a) => a.code === value);

  return (
    <div className="sf airport-dd" ref={ref} style={{ position: "relative" }}>
      <label>{label}</label>
      <div
        className={`dd-trigger${open ? " open" : ""}`}
        onClick={() => setOpen(!open)}
      >
        {selected ? (
          <span className="dd-selected">
            <span className="dd-code">{selected.code}</span>
            <span className="dd-city">{selected.city}</span>
          </span>
        ) : (
          <span className="dd-placeholder">{placeholder}</span>
        )}
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          style={{
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform .2s",
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
      {open && (
        <div className="dd-panel">
          <div className="dd-search-wrap">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#5a7a9e" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              autoFocus
              className="dd-search"
              placeholder="Search city or airport..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="dd-list">
            {filtered.length === 0 ? (
              <div className="dd-empty">No airports found</div>
            ) : (
              filtered.map((a) => (
                <div
                  key={a.code}
                  className={`dd-item${a.code === value ? " active" : ""}`}
                  onClick={() => {
                    onChange(a.code);
                    setQuery("");
                    setOpen(false);
                  }}
                >
                  <div className="dd-item-left">
                    <span className="dd-item-code">{a.code}</span>
                    <span className="dd-item-city">{a.city}</span>
                  </div>
                  <span className="dd-item-country">{a.country}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── SPINNER / DRUM ROLL SEARCH ANIMATION ───────────────────────────────────────
function SpinnerSearchIndicator({ searching }) {
  const cities = ["New York", "London", "Tokyo", "Dubai", "Paris", "Sydney", "Singapore", "Bangkok"];
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (!searching) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % cities.length), 200);
    return () => clearInterval(t);
  }, [searching, cities.length]);

  if (!searching) return null;

  return (
    <div className="spinner-search-wrap">
      <div className="spinner-drum">
        <div className="spinner-plane">✈</div>
        <div className="spinner-city">{cities[idx]}</div>
      </div>
      <span className="spinner-label">Searching flights...</span>
    </div>
  );
}

// ── BOOKING MODAL ──────────────────────────────────────────────────────────────
function BookingModal({ flight, passengers, onClose }) {
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem("skylink_token");

  const confirmBooking = async () => {
    if (!token) {
      navigate("/login");
      return;
    }
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch(`${API}/bookings/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          flight_id: flight.id,
          passengers,
          cabin_class: flight.cabin_class,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Booking failed");
      setStatus({ type: "success", ref: data.booking_ref, total: data.total_price });
    } catch (err) {
      setStatus({ type: "error", msg: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-box">
        <button className="modal-close" onClick={onClose}>✕</button>
        <h2 className="modal-title">Confirm Booking</h2>
        <div className="modal-route">
          <span className="modal-code">{flight.origin_code}</span>
          <span className="modal-arrow">✈</span>
          <span className="modal-code">{flight.destination_code}</span>
        </div>
        <div className="modal-details">
          <div className="modal-row">
            <span>Flight</span>
            <strong>{flight.flight_number}</strong>
          </div>
          <div className="modal-row">
            <span>Aircraft</span>
            <strong>{flight.aircraft_type || "—"}</strong>
          </div>
          <div className="modal-row">
            <span>Depart</span>
            <strong>
              {new Date(flight.departure_time).toLocaleString([], {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </strong>
          </div>
          <div className="modal-row">
            <span>Arrive</span>
            <strong>
              {new Date(flight.arrival_time).toLocaleString([], {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </strong>
          </div>
          <div className="modal-row">
            <span>Cabin</span>
            <strong>{flight.cabin_class}</strong>
          </div>
          <div className="modal-row">
            <span>Passengers</span>
            <strong>{passengers}</strong>
          </div>
          <div className="modal-row modal-total">
            <span>Total</span>
            <strong>
              ${(Number(flight.base_price) * passengers).toLocaleString()}
            </strong>
          </div>
        </div>

        {status?.type === "success" ? (
          <div className="modal-success">
            <div className="ms-icon">✓</div>
            <p className="ms-title">Booking Confirmed!</p>
            <p className="ms-ref">
              Reference: <strong>{status.ref}</strong>
            </p>
            <button
              className="auth-btn"
              onClick={() => navigate("/profile/user")}
            >
              View My Bookings
            </button>
          </div>
        ) : (
          <>
            {status?.type === "error" && (
              <div
                className="auth-error"
                style={{ marginBottom: "1rem" }}
              >
                {status.msg}
              </div>
            )}
            <button
              className="auth-btn"
              onClick={confirmBooking}
              disabled={loading}
            >
              {loading ? (
                <span className="auth-spinner" />
              ) : (
                `Book for $${(Number(flight.base_price) * passengers).toLocaleString()}`
              )}
            </button>
            {!token && (
              <p className="modal-hint">You'll be redirected to sign in first.</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── FLIGHT RESULTS ─────────────────────────────────────────────────────────────
function FlightResults({ results, loading, passengers, searching }) {
  const [selected, setSelected] = useState(null);

  if (loading)
    return (
      <div className="results-wrap">
        <SpinnerSearchIndicator searching={searching} />
      </div>
    );
  if (!results) return null;
  if (results.length === 0)
    return (
      <div className="results-wrap">
        <div className="results-empty">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#5a7a9e" strokeWidth="1.5">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p>No flights found for this route. Try different dates or cabin class.</p>
        </div>
      </div>
    );

  return (
    <>
      {selected && (
        <BookingModal
          flight={selected}
          passengers={passengers}
          onClose={() => setSelected(null)}
        />
      )}
      <div className="results-wrap">
        <div className="results-header">
          <span className="results-count">
            {results.length} flight{results.length !== 1 ? "s" : ""} found
          </span>
        </div>
        <div className="results-list">
          {results.map((f) => (
            <div className="result-card" key={f.id}>
              <div className="rc-route">
                <span className="rc-code">{f.origin_code}</span>
                <div className="rc-arrow">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1877f2" strokeWidth="2">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </div>
                <span className="rc-code">{f.destination_code}</span>
              </div>
              <div className="rc-details">
                <div className="rc-detail">
                  <span className="rc-label">Depart</span>
                  <span className="rc-val">
                    {new Date(f.departure_time).toLocaleString([], {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
                <div className="rc-detail">
                  <span className="rc-label">Arrive</span>
                  <span className="rc-val">
                    {new Date(f.arrival_time).toLocaleString([], {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
                <div className="rc-detail">
                  <span className="rc-label">Cabin</span>
                  <span className="rc-val">{f.cabin_class}</span>
                </div>
                <div className="rc-detail">
                  <span className="rc-label">Aircraft</span>
                  <span className="rc-val">{f.aircraft_type || "—"}</span>
                </div>
                <div className="rc-detail">
                  <span className="rc-label">Seats Left</span>
                  <span className="rc-val">{f.seats_available}</span>
                </div>
              </div>
              <div className="rc-price">
                <span className="rc-amount">
                  ${Number(f.base_price).toLocaleString()}
                </span>
                <span className="rc-per">per person</span>
                <button className="rc-btn" onClick={() => setSelected(f)}>
                  Select
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

// ── HOME ───────────────────────────────────────────────────────────────────────
function Home() {
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

  const fillRoute = (from, to) => {
    setFromCode(from);
    setToCode(to);
    setResults(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSearch = useCallback(async () => {
    setSearchErr("");
    if (!fromCode || !toCode) {
      setSearchErr("Please select both origin and destination airports.");
      return;
    }
    if (fromCode === toCode) {
      setSearchErr("Origin and destination cannot be the same.");
      return;
    }
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
  }, [fromCode, toCode, departDate, cabinClass, passengers]);

  // Quick search from destination card
  const handleDestinationSearch = (dest) => {
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
  };

  // Quick search from offer card
  const handleOfferSearch = (offer) => {
    setFromCode(offer.from);
    setToCode(offer.to);
    setCabinClass(offer.cabin || "Economy");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const currentDeals = dealCategories[activeDeal]?.offers || [];

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

          <div className="fields-row">
            <AirportDropdown
              label="From"
              value={fromCode}
              onChange={setFromCode}
              airports={airports}
              placeholder="Origin airport"
            />
            <button
              className="swap-btn"
              onClick={() => {
                setFromCode(toCode);
                setToCode(fromCode);
              }}
              title="Swap"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="17 1 21 5 17 9" />
                <path d="M3 11V9a4 4 0 0 1 4-4h14" />
                <polyline points="7 23 3 19 7 15" />
                <path d="M21 13v2a4 4 0 0 1-4 4H3" />
              </svg>
            </button>
            <AirportDropdown
              label="To"
              value={toCode}
              onChange={setToCode}
              airports={airports}
              placeholder="Destination airport"
            />
            <div className="sf">
              <label>Depart</label>
              <input
                type="date"
                value={departDate}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setDepartDate(e.target.value)}
              />
            </div>
            <div className="sf">
              <label>Cabin</label>
              <select
                value={cabinClass}
                onChange={(e) => setCabinClass(e.target.value)}
              >
                <option>Economy</option>
                <option>Premium Economy</option>
                <option>Business</option>
                <option>First</option>
              </select>
            </div>
            <button
              className="sbtn"
              onClick={handleSearch}
              disabled={searching}
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

          {searchErr && <div className="search-error">{searchErr}</div>}
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
                <div className="off-img" style={{ backgroundImage: o.image }}>
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
              <div className="bg" style={{ backgroundImage: d.image }} />
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
                <div className="feat-icon">{f.icon}</div>
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
}

export default function App() {
  return (
    <div className="app-shell">
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/profile/user" element={<UserProfile />} />
        <Route path="/profile/staff" element={<StaffProfile />} />
      </Routes>
    </div>
  );
}