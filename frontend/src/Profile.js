import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

const API = process.env.REACT_APP_API_URL || "http://localhost:8000";

function authHeaders() {
  return { Authorization: `Bearer ${localStorage.getItem("skylink_token")}`, "Content-Type": "application/json" };
}

function StatusBadge({ status }) {
  const color = {
    confirmed: "#22c55e", cancelled: "#ef4444", pending: "#f59e0b",
    scheduled: "#1877f2", delayed: "#f59e0b", completed: "#6b7280",
  }[status] || "#5a7a9e";
  return (
    <span style={{ display:"inline-block", padding:"2px 10px", borderRadius:99, fontSize:11,
      fontWeight:600, color:"#fff", background:color, textTransform:"capitalize" }}>
      {status}
    </span>
  );
}


// ── USER PROFILE ──────────────────────────────────────────────────────────────
export function UserProfile() {
  const [user,      setUser]      = useState(null);
  const [bookings,  setBookings]  = useState([]);
  const [editing,   setEditing]   = useState(false);
  const [form,      setForm]      = useState({ full_name: "", phone: "" });
  const [loading,   setLoading]   = useState(true);
  const [saveMsg,   setSaveMsg]   = useState("");
  const [error,     setError]     = useState("");
  const navigate = useNavigate();

  const load = useCallback(async () => {
    try {
      const [uRes, bRes] = await Promise.all([
        fetch(`${API}/auth/me`,       { headers: authHeaders() }),
        fetch(`${API}/bookings/my`,   { headers: authHeaders() }),
      ]);
      if (uRes.status === 401) { navigate("/login"); return; }
      const uData = await uRes.json();
      const bData = await bRes.json();
      setUser(uData);
      setBookings(bData.bookings || []);
      setForm({ full_name: uData.full_name, phone: uData.phone || "" });
    } catch {
      setError("Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    try {
      const res = await fetch(`${API}/auth/me`, {
        method: "PATCH",
        headers: authHeaders(),
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Update failed");
      const data = await res.json();
      setUser(data);
      localStorage.setItem("skylink_name", data.full_name);
      setEditing(false);
      setSaveMsg("Profile updated!");
      setTimeout(() => setSaveMsg(""), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCancel = async (bookingId) => {
    if (!window.confirm("Cancel this booking?")) return;
    try {
      const res = await fetch(`${API}/bookings/${bookingId}`, { method: "DELETE", headers: authHeaders() });
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail); }
      load();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div className="profile-loading"><div className="results-spinner" /></div>;
  if (error)   return <div className="profile-error">{error}</div>;

  return (
    <div className="profile-page">
      <div className="profile-inner">
        {/* Header */}
        <div className="profile-header">
          <div className="profile-avatar">
            {user?.full_name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="profile-name">{user?.full_name}</h1>
            <p className="profile-email">{user?.email}</p>
            <StatusBadge status={user?.role} />
          </div>
        </div>

        {saveMsg && <div className="profile-success">{saveMsg}</div>}

        {/* Info card */}
        <div className="profile-card">
          <div className="pc-head">
            <h3>Personal Information</h3>
            {!editing && (
              <button className="pc-edit-btn" onClick={() => setEditing(true)}>Edit</button>
            )}
          </div>
          {editing ? (
            <div className="pc-edit-form">
              <div className="auth-field">
                <label>Full Name</label>
                <input type="text" value={form.full_name}
                  onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} />
              </div>
              <div className="auth-field">
                <label>Phone</label>
                <input type="tel" value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="pc-edit-btns">
                <button className="auth-submit" style={{ width:"auto", padding:"0.55rem 1.6rem" }} onClick={handleSave}>Save</button>
                <button className="pc-cancel-btn" onClick={() => { setEditing(false); setForm({ full_name: user.full_name, phone: user.phone || "" }); }}>Cancel</button>
              </div>
            </div>
          ) : (
            <div className="pc-info-grid">
              <div className="pc-info-item"><span className="pc-label">Full Name</span><span>{user?.full_name}</span></div>
              <div className="pc-info-item"><span className="pc-label">Email</span><span>{user?.email}</span></div>
              <div className="pc-info-item"><span className="pc-label">Phone</span><span>{user?.phone || "—"}</span></div>
              <div className="pc-info-item"><span className="pc-label">Member since</span><span>{new Date(user?.created_at).toLocaleDateString([], { dateStyle: "medium" })}</span></div>
            </div>
          )}
        </div>

        {/* Bookings */}
        <div className="profile-card">
          <div className="pc-head"><h3>My Bookings ({bookings.length})</h3></div>
          {bookings.length === 0 ? (
            <div className="pc-empty">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#5a7a9e" strokeWidth="1.5">
                <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
              </svg>
              <p>No bookings yet. <a href="/">Search for flights</a> to get started.</p>
            </div>
          ) : (
            <div className="bookings-list">
              {bookings.map((b) => (
                <div className="booking-row" key={b.id}>
                  <div className="br-route">
                    <span className="br-code">{b.flight?.origin_code}</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1877f2" strokeWidth="2">
                      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                    </svg>
                    <span className="br-code">{b.flight?.destination_code}</span>
                  </div>
                  <div className="br-details">
                    <span>{b.flight?.flight_number}</span>
                    <span>{b.flight ? new Date(b.flight.departure_time).toLocaleDateString([], { dateStyle: "medium" }) : "—"}</span>
                    <span>{b.flight?.cabin_class}</span>
                    <span>Seats: {b.seat_numbers}</span>
                    <span className="br-price">${b.total_price.toLocaleString()}</span>
                  </div>
                  <div className="br-status">
                    <StatusBadge status={b.status} />
                    {b.status === "confirmed" && (
                      <button className="br-cancel" onClick={() => handleCancel(b.id)}>Cancel</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


// ── STAFF PROFILE ─────────────────────────────────────────────────────────────
export function StaffProfile() {
  const [user,     setUser]     = useState(null);
  const [tab,      setTab]      = useState("flights");
  const [flights,  setFlights]  = useState([]);
  const [bookings, setBookings] = useState([]);
  const [stats,    setStats]    = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState("");
  const [showForm, setShowForm] = useState(false);
  const [airports, setAirports] = useState([]);
  const [flightForm, setFlightForm] = useState({
    flight_number: "", origin_code: "", destination_code: "",
    departure_time: "", arrival_time: "", cabin_class: "Economy",
    seats_total: 150, base_price: "",
  });
  const [formErr, setFormErr] = useState("");
  const navigate = useNavigate();

  const load = useCallback(async () => {
    try {
      const [uRes, fRes, bRes, sRes, aRes] = await Promise.all([
        fetch(`${API}/auth/me`,          { headers: authHeaders() }),
        fetch(`${API}/flights/all`,      { headers: authHeaders() }),
        fetch(`${API}/admin/bookings`,   { headers: authHeaders() }),
        fetch(`${API}/admin/stats`,      { headers: authHeaders() }),
        fetch(`${API}/flights/airports`),
      ]);
      if (uRes.status === 401) { navigate("/login"); return; }
      const uData = await uRes.json();
      if (uData.role === "passenger") { navigate("/profile/user"); return; }
      setUser(uData);
      if (fRes.ok) setFlights((await fRes.json()).flights || []);
      if (bRes.ok) setBookings((await bRes.json()).bookings || []);
      if (sRes.ok) setStats(await sRes.json());
      if (aRes.ok) setAirports((await aRes.json()).airports || []);
    } catch {
      setError("Failed to load staff data");
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => { load(); }, [load]);

  const handleCreateFlight = async (e) => {
    e.preventDefault(); setFormErr("");
    try {
      const res = await fetch(`${API}/flights/`, {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ ...flightForm, seats_total: Number(flightForm.seats_total), base_price: Number(flightForm.base_price) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed");
      setShowForm(false);
      setFlightForm({ flight_number: "", origin_code: "", destination_code: "", departure_time: "", arrival_time: "", cabin_class: "Economy", seats_total: 150, base_price: "" });
      load();
    } catch (err) { setFormErr(err.message); }
  };

  const handleStatusChange = async (flightId, status) => {
    try {
      await fetch(`${API}/flights/${flightId}`, {
        method: "PUT", headers: authHeaders(),
        body: JSON.stringify({ status }),
      });
      load();
    } catch { alert("Update failed"); }
  };

  const sf = (k) => (e) => setFlightForm((f) => ({ ...f, [k]: e.target.value }));

  if (loading) return <div className="profile-loading"><div className="results-spinner" /></div>;
  if (error)   return <div className="profile-error">{error}</div>;

  return (
    <div className="profile-page">
      <div className="profile-inner">
        {/* Header */}
        <div className="profile-header">
          <div className="profile-avatar staff-avatar">
            {user?.full_name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="profile-name">{user?.full_name}</h1>
            <p className="profile-email">{user?.email}</p>
            <StatusBadge status={user?.role} />
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="stats-row">
            {[
              { label: "Total Users",    val: stats.total_users },
              { label: "Total Flights",  val: stats.total_flights },
              { label: "Total Bookings", val: stats.total_bookings },
              { label: "Confirmed",      val: stats.confirmed_bookings },
            ].map((s) => (
              <div className="stat-card" key={s.label}>
                <span className="stat-val">{s.val}</span>
                <span className="stat-label">{s.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Tabs */}
        <div className="staff-tabs">
          {["flights", "bookings"].map((t) => (
            <button key={t} className={`staff-tab${tab === t ? " active" : ""}`} onClick={() => setTab(t)}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Flights tab */}
        {tab === "flights" && (
          <div className="profile-card">
            <div className="pc-head">
              <h3>Flights ({flights.length})</h3>
              <button className="pc-edit-btn" onClick={() => setShowForm(!showForm)}>
                {showForm ? "✕ Close" : "+ Add Flight"}
              </button>
            </div>

            {showForm && (
              <form className="flight-form" onSubmit={handleCreateFlight}>
                {formErr && <div className="auth-error">{formErr}</div>}
                <div className="auth-row">
                  <div className="auth-field">
                    <label>Flight Number</label>
                    <input type="text" placeholder="SK101" value={flightForm.flight_number} onChange={sf("flight_number")} required />
                  </div>
                  <div className="auth-field">
                    <label>Cabin Class</label>
                    <select value={flightForm.cabin_class} onChange={sf("cabin_class")}>
                      <option>Economy</option><option>Premium Economy</option><option>Business</option><option>First</option>
                    </select>
                  </div>
                </div>
                <div className="auth-row">
                  <div className="auth-field">
                    <label>From (IATA Code)</label>
                    <input type="text" placeholder="JFK" maxLength={4} value={flightForm.origin_code} onChange={sf("origin_code")} required />
                  </div>
                  <div className="auth-field">
                    <label>To (IATA Code)</label>
                    <input type="text" placeholder="LHR" maxLength={4} value={flightForm.destination_code} onChange={sf("destination_code")} required />
                  </div>
                </div>
                <div className="auth-row">
                  <div className="auth-field">
                    <label>Departure Time</label>
                    <input type="datetime-local" value={flightForm.departure_time} onChange={sf("departure_time")} required />
                  </div>
                  <div className="auth-field">
                    <label>Arrival Time</label>
                    <input type="datetime-local" value={flightForm.arrival_time} onChange={sf("arrival_time")} required />
                  </div>
                </div>
                <div className="auth-row">
                  <div className="auth-field">
                    <label>Total Seats</label>
                    <input type="number" min={1} value={flightForm.seats_total} onChange={sf("seats_total")} required />
                  </div>
                  <div className="auth-field">
                    <label>Base Price (USD)</label>
                    <input type="number" min={1} step="0.01" placeholder="499.00" value={flightForm.base_price} onChange={sf("base_price")} required />
                  </div>
                </div>
                <button type="submit" className="auth-submit" style={{ width:"auto", padding:"0.55rem 2rem" }}>
                  Create Flight
                </button>
              </form>
            )}

            <div className="bookings-list">
              {flights.length === 0 ? (
                <div className="pc-empty"><p>No flights yet. Add one above.</p></div>
              ) : flights.map((f) => (
                <div className="booking-row" key={f.id}>
                  <div className="br-route">
                    <span className="br-code">{f.origin_code}</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1877f2" strokeWidth="2">
                      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                    </svg>
                    <span className="br-code">{f.destination_code}</span>
                  </div>
                  <div className="br-details">
                    <span><strong>{f.flight_number}</strong></span>
                    <span>{new Date(f.departure_time).toLocaleString([], { dateStyle:"medium", timeStyle:"short" })}</span>
                    <span>{f.cabin_class}</span>
                    <span>Seats: {f.seats_available}/{f.seats_total || "?"}</span>
                    <span className="br-price">${f.base_price}</span>
                  </div>
                  <div className="br-status">
                    <StatusBadge status={f.status} />
                    <select
                      value={f.status}
                      onChange={(e) => handleStatusChange(f.id, e.target.value)}
                      className="status-select"
                    >
                      <option value="scheduled">Scheduled</option>
                      <option value="delayed">Delayed</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bookings tab */}
        {tab === "bookings" && (
          <div className="profile-card">
            <div className="pc-head"><h3>All Bookings ({bookings.length})</h3></div>
            <div className="bookings-list">
              {bookings.length === 0 ? (
                <div className="pc-empty"><p>No bookings found.</p></div>
              ) : bookings.map((b) => (
                <div className="booking-row" key={b.id}>
                  <div className="br-route">
                    <span className="br-code">{b.flight?.origin_code}</span>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1877f2" strokeWidth="2">
                      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                    </svg>
                    <span className="br-code">{b.flight?.destination_code}</span>
                  </div>
                  <div className="br-details">
                    <span>#{b.id}</span>
                    <span>{b.flight?.flight_number}</span>
                    <span>{b.passengers} pax</span>
                    <span>{new Date(b.booked_at).toLocaleDateString()}</span>
                    <span className="br-price">${b.total_price}</span>
                  </div>
                  <div className="br-status">
                    <StatusBadge status={b.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}