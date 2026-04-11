import React, { useEffect, useState, useRef, useCallback } from "react";
import { Routes, Route } from "react-router-dom";
import "./App.css";
import Navbar from "./Navbar";
import Login from "./Login";
import Register from "./Register";
import { ForgotPassword, ResetPassword } from "./ResetPassword";
import { UserProfile, StaffProfile } from "./Profile";

const API = process.env.REACT_APP_API_URL || "http://localhost:8000";

const tripTypes     = ["One Way", "Round Trip", "Multi-City"];
const dealCategories = ["Flight Deals","Holiday Packages","Business Class Offers","Loyalty Rewards","Student Fares","Group Bookings"];

const destinations = [
  { city:"Santorini", country:"Greece",  region:"Europe", blurb:"Sunset cliff escapes with premium sky lounge access.", image:"url('https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=1200&q=80')" },
  { city:"Tokyo",     country:"Japan",   region:"Asia",   blurb:"Midnight city lights and seamless global connections.", image:"url('https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1200&q=80')" },
  { city:"Reykjavík", country:"Iceland", region:"Nordic", blurb:"Arctic adventures guided by precision flight planning.", image:"url('https://images.unsplash.com/photo-1539650116574-8efeb43e2750?auto=format&fit=crop&w=1200&q=80')" },
];

const offers = [
  { route:"JFK → NRT", title:"Tokyo Business Escape",  price:"$1,240", badge:"Limited Time", image:"url('https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=800&q=80')" },
  { route:"LHR → DXB", title:"Dubai Luxury Getaway",   price:"$890",   badge:"Sale",         image:"url('https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=800&q=80')" },
  { route:"SFO → CDG", title:"Paris Summer Special",   price:"$740",   badge:"Best Value",   image:"url('https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=800&q=80')" },
];

const features = [
  { num:"01", title:"Global Reach",    desc:"Connect to 180+ destinations through our blue corridor network with curated stopovers.", icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg> },
  { num:"02", title:"Always On Time",  desc:"Live schedule intelligence and real-time gate updates keep your departure predictable.",  icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> },
  { num:"03", title:"Travel Protected",desc:"Enterprise-grade safety standards and secure digital boarding from check-in to landing.",  icon:<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> },
];

// ── AIRPORT DROPDOWN ───────────────────────
function AirportDropdown({ label, value, onChange, airports, placeholder }) {
  const [open, setOpen]   = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const filtered = airports.filter((a) => {
    const q = query.toLowerCase();
    return a.code.toLowerCase().includes(q) || a.city.toLowerCase().includes(q) ||
           a.name.toLowerCase().includes(q)  || a.country.toLowerCase().includes(q);
  });

  const selected = airports.find((a) => a.code === value);

  return (
    <div className="sf airport-dd" ref={ref}>
      <label>{label}</label>
      <div className={`dd-trigger${open ? " open" : ""}`} onClick={() => setOpen(!open)}>
        {selected ? (
          <span className="dd-selected">
            <span className="dd-code">{selected.code}</span>
            <span className="dd-city">{selected.city}</span>
          </span>
        ) : (
          <span className="dd-placeholder">{placeholder}</span>
        )}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          className="dd-chevron" style={{ transform: open ? "rotate(180deg)" : "none", transition:"transform .2s" }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>

      {open && (
        <div className="dd-panel">
          <div className="dd-search-wrap">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#5a7a9e" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
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
            {filtered.length === 0
              ? <div className="dd-empty">No airports found</div>
              : filtered.map((a) => (
                  <div
                    key={a.code}
                    className={`dd-item${a.code === value ? " active" : ""}`}
                    onClick={() => { onChange(a.code); setQuery(""); setOpen(false); }}
                  >
                    <div className="dd-item-left">
                      <span className="dd-item-code">{a.code}</span>
                      <span className="dd-item-city">{a.city}</span>
                    </div>
                    <span className="dd-item-country">{a.country}</span>
                  </div>
                ))
            }
          </div>
        </div>
      )}
    </div>
  );
}

// ── FLIGHT RESULTS ─────────────────────────
function FlightResults({ results, loading }) {
  if (loading) return (
    <div className="results-wrap">
      <div className="results-loading">
        <div className="results-spinner" />
        <p>Searching available flights...</p>
      </div>
    </div>
  );

  if (!results) return null;

  if (results.length === 0) return (
    <div className="results-wrap">
      <div className="results-empty">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#5a7a9e" strokeWidth="1.5">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <p>No flights found for this route. Try different dates or cabin class.</p>
      </div>
    </div>
  );

  return (
    <div className="results-wrap">
      <div className="results-header">
        <span className="results-count">{results.length} flight{results.length !== 1 ? "s" : ""} found</span>
      </div>
      <div className="results-list">
        {results.map((f) => (
          <div className="result-card" key={f.id}>
            <div className="rc-route">
              <span className="rc-code">{f.origin_code}</span>
              <div className="rc-arrow">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1877f2" strokeWidth="2">
                  <line x1="5" y1="12" x2="19" y2="12"/>
                  <polyline points="12 5 19 12 12 19"/>
                </svg>
              </div>
              <span className="rc-code">{f.destination_code}</span>
            </div>
            <div className="rc-details">
              <div className="rc-detail"><span className="rc-label">Depart</span><span className="rc-val">{new Date(f.departure_time).toLocaleString([],{dateStyle:"medium",timeStyle:"short"})}</span></div>
              <div className="rc-detail"><span className="rc-label">Arrive</span><span className="rc-val">{new Date(f.arrival_time).toLocaleString([],{dateStyle:"medium",timeStyle:"short"})}</span></div>
              <div className="rc-detail"><span className="rc-label">Cabin</span><span className="rc-val">{f.cabin_class}</span></div>
              <div className="rc-detail"><span className="rc-label">Seats Left</span><span className="rc-val">{f.seats_available}</span></div>
            </div>
            <div className="rc-price">
              <span className="rc-amount">${Number(f.base_price).toLocaleString()}</span>
              <span className="rc-per">per person</span>
              <button className="rc-btn">Select</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── HOME ───────────────────────────────────
function Home() {
  const [health,      setHealth]      = useState("loading...");
  const [tripType,    setTripType]    = useState("One Way");
  const [activeTab,   setActiveTab]   = useState(0);
  const [airports,    setAirports]    = useState([]);
  const [fromCode,    setFromCode]    = useState("");
  const [toCode,      setToCode]      = useState("");
  const [departDate,  setDepartDate]  = useState("");
  const [cabinClass,  setCabinClass]  = useState("Economy");
  const [passengers,  setPassengers]  = useState(1);
  const [results,     setResults]     = useState(null);
  const [searching,   setSearching]   = useState(false);
  const [searchErr,   setSearchErr]   = useState("");

  useEffect(() => {
    fetch(`${API}/health`).then(r=>r.json()).then(d=>setHealth(d.status)).catch(()=>setHealth("offline"));
    fetch(`${API}/flights/airports`).then(r=>r.json()).then(d=>setAirports(d.airports||[])).catch(()=>{});
  }, []);

  const fillRoute = (route) => {
    const [f, t] = route.split(" → ");
    setFromCode(f.trim()); setToCode(t.trim()); setResults(null);
  };

  const handleSearch = useCallback(async () => {
    setSearchErr("");
    if (!fromCode || !toCode) { setSearchErr("Please select both origin and destination airports."); return; }
    if (fromCode === toCode)  { setSearchErr("Origin and destination cannot be the same."); return; }
    setSearching(true); setResults(null);
    try {
      const res  = await fetch(`${API}/flights/search`, {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ origin_code:fromCode, destination_code:toCode,
          departure_date: departDate || new Date().toISOString().slice(0,10),
          cabin_class: cabinClass, passengers }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Search failed");
      setResults(data.flights);
      // Scroll to results
      setTimeout(()=>document.getElementById("results")?.scrollIntoView({behavior:"smooth"}),100);
    } catch(err) {
      setSearchErr(err.message);
    } finally {
      setSearching(false);
    }
  }, [fromCode, toCode, departDate, cabinClass, passengers]);

  return (
    <main>
      {/* HERO */}
      <section className="hero" id="home">
        <div className="hero-bg" />
        <div className="hero-dim" />

        <div className="hero-content">
          <p className="hero-eyebrow">Premium Air Travel</p>
          <h1>Explore the World<br />with <em>Skylink</em></h1>
          <p className="hero-sub">
            Discover seamless journeys, exclusive offers, and world-class
            service crafted for the discerning traveller.
          </p>
        </div>

        {/* SEARCH BAR */}
        <div className="search-bar">
          <div className="tab-row">
            {tripTypes.map(t=>(
              <button key={t} className={`stab${tripType===t?" on":""}`} onClick={()=>setTripType(t)}>{t}</button>
            ))}
            <div className="pax-control">
              <button className="pax-btn" onClick={()=>setPassengers(p=>Math.max(1,p-1))}>−</button>
              <span className="pax-num">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                {passengers}
              </span>
              <button className="pax-btn" onClick={()=>setPassengers(p=>Math.min(9,p+1))}>+</button>
            </div>
          </div>

          <div className="fields-row">
            <AirportDropdown label="From" value={fromCode} onChange={setFromCode} airports={airports} placeholder="Origin airport" />

            <button className="swap-btn" onClick={()=>{setFromCode(toCode);setToCode(fromCode);}} title="Swap">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/>
                <polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>
              </svg>
            </button>

            <AirportDropdown label="To" value={toCode} onChange={setToCode} airports={airports} placeholder="Destination airport" />

            <div className="sf">
              <label>Depart</label>
              <input type="date" value={departDate} min={new Date().toISOString().slice(0,10)}
                onChange={e=>setDepartDate(e.target.value)} />
            </div>

            <div className="sf">
              <label>Cabin</label>
              <select value={cabinClass} onChange={e=>setCabinClass(e.target.value)}>
                <option>Economy</option>
                <option>Premium Economy</option>
                <option>Business</option>
                <option>First</option>
              </select>
            </div>

            <button className="sbtn" onClick={handleSearch} disabled={searching}>
              {searching
                ? <span className="sbtn-spinner" />
                : <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> Search</>
              }
            </button>
          </div>

          <div className="popular-row">
            <span className="pop-lbl">Popular:</span>
            {["JFK → LHR","SFO → NRT","MIA → MAD","DXB → SYD"].map(r=>(
              <button key={r} className="spill" onClick={()=>fillRoute(r)}>{r}</button>
            ))}
            <div className="status-pill">
              <span className={`sdot${health==="ok"?" green":""}`} />
              System: {health}
            </div>
          </div>

          {searchErr && <div className="search-error">{searchErr}</div>}
        </div>
      </section>

      {/* RESULTS */}
      <div id="results"><FlightResults results={results} loading={searching} /></div>

      {/* DEALS STRIP */}
      <div className="deals-strip">
        <div className="deals-inner">
          {dealCategories.map((d,i)=>(
            <div key={d} className={`deal-badge${activeTab===i?" active":""}`} onClick={()=>setActiveTab(i)}>
              <span className="deal-dot" />{d}
            </div>
          ))}
        </div>
      </div>

      {/* DESTINATIONS */}
      <div className="section" id="destinations">
        <div className="sec-row">
          <div><p className="sec-eyebrow">Explore the World</p><h2 className="sec-title">Popular <em>Destinations</em></h2></div>
          <span className="sec-link">View All →</span>
        </div>
        <div className="dest-grid">
          {destinations.map(d=>(
            <article className="dest-card" key={d.city}>
              <div className="bg" style={{backgroundImage:d.image}} />
              <div className="glass-layer" />
              <div className="dest-tag">{d.region}</div>
              <div className="dest-info">
                <p className="dest-region">{d.country}</p>
                <h3 className="dest-city">{d.city}</h3>
                <p className="dest-blurb">{d.blurb}</p>
                <button className="dest-btn" onClick={()=>window.scrollTo({top:0,behavior:"smooth"})}>Explore →</button>
              </div>
            </article>
          ))}
        </div>
      </div>

      {/* OFFERS */}
      <section className="offers-section" id="offers">
        <div className="offers-inner">
          <div className="sec-row">
            <div><p className="sec-eyebrow">Exclusive Deals</p><h2 className="sec-title">Special <em>Offers</em></h2></div>
            <span className="sec-link">All Offers →</span>
          </div>
          <div className="off-grid">
            {offers.map(o=>(
              <article className="off-card" key={o.title}>
                <div className="off-img" style={{backgroundImage:o.image}}>
                  <span className="off-badge">{o.badge}</span>
                </div>
                <div className="off-body">
                  <p className="off-route">{o.route}</p>
                  <h3 className="off-title">{o.title}</h3>
                  <p className="off-price">From <strong>{o.price}</strong> return</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="feat-section" id="experience">
        <div className="feat-inner">
          <p className="feat-eyebrow">What Sets Us Apart</p>
          <h2 className="feat-title">Why Travelers Choose <em>Blue</em></h2>
          <p className="feat-sub">World-class service, unmatched reliability, and experiences crafted for every kind of traveller.</p>
          <div className="feat-grid">
            {features.map(f=>(
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
          <div><p className="sec-eyebrow">Our Story</p><h2 className="sec-title">About <em>Skylink</em></h2></div>
        </div>
        <div className="about-card">
          <p>We blend precision aviation operations with refined hospitality, creating blue-sky journeys designed around comfort, reliability, and global access. From the moment you book to the moment you land, every detail of your Skylink experience is crafted to exceed expectations.</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="foot-logo">Skylink <em>AirWay</em></div>
        <p className="foot-copy">© 2026 Skylink AirWay. All rights reserved.</p>
      </footer>
    </main>
  );
}

export default function App() {
  return (
    <div className="app-shell">
      <Navbar />
      <Routes>
        <Route path="/"                element={<Home />} />
        <Route path="/login"           element={<Login />} />
        <Route path="/register"        element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password"  element={<ResetPassword />} />
        <Route path="/profile/user"    element={<UserProfile />} />
        <Route path="/profile/staff"   element={<StaffProfile />} />
      </Routes>
    </div>
  );
}