import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

const API = process.env.REACT_APP_API_URL || "http://localhost:8000";

function useAuth() {
  const navigate = useNavigate();
  const token = localStorage.getItem("skylink_token");
  const user = JSON.parse(localStorage.getItem("skylink_user") || "null");

  const authFetch = useCallback(
    async (url, opts = {}) => {
      const res = await fetch(url, {
        ...opts,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...(opts.headers || {}),
        },
      });
      if (res.status === 401) {
        localStorage.removeItem("skylink_token");
        localStorage.removeItem("skylink_user");
        navigate("/login");
        throw new Error("Session expired");
      }
      return res;
    },
    [token, navigate]
  );

  return { token, user, authFetch };
}

// ── USER PROFILE ───────────────────────────────────────────────────────────────
export function UserProfile() {
  const { user: storedUser, authFetch } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [tab, setTab] = useState("profile");
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [pwForm, setPwForm] = useState({
    current_password: "",
    new_password: "",
    confirm: "",
  });
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!storedUser) {
      navigate("/login");
      return;
    }
    if (storedUser.role !== "passenger") {
      navigate("/profile/staff");
      return;
    }
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pRes, bRes] = await Promise.all([
        authFetch(`${API}/users/me`),
        authFetch(`${API}/bookings/my`),
      ]);
      if (pRes.ok) {
        const d = await pRes.json();
        setProfile(d);
        setForm({
          full_name: d.full_name,
          phone: d.phone || "",
          passport_number: d.passport_number || "",
          nationality: d.nationality || "",
        });
      }
      if (bRes.ok) {
        const d = await bRes.json();
        setBookings(d.bookings || []);
      }
    } catch (_) {}
    finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    setStatus(null);
    setSaving(true);
    try {
      const payload = {};
      if (form.full_name?.trim()) payload.full_name = form.full_name.trim();
      if (form.phone !== undefined) payload.phone = form.phone || null;
      if (form.passport_number !== undefined)
        payload.passport_number = form.passport_number || null;
      if (form.nationality !== undefined)
        payload.nationality = form.nationality || null;

      const res = await authFetch(`${API}/users/me`, {
        method: "PUT",
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Update failed");
      setProfile(data);
      localStorage.setItem("skylink_user", JSON.stringify(data));
      setEditing(false);
      setStatus({ type: "success", msg: "Profile updated successfully!" });
    } catch (err) {
      setStatus({ type: "error", msg: err.message });
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async () => {
    setStatus(null);
    if (pwForm.new_password.length < 8) {
      setStatus({ type: "error", msg: "Password must be at least 8 characters." });
      return;
    }
    if (pwForm.new_password !== pwForm.confirm) {
      setStatus({ type: "error", msg: "Passwords do not match." });
      return;
    }
    setSaving(true);
    try {
      const res = await authFetch(`${API}/users/me/password`, {
        method: "PUT",
        body: JSON.stringify({
          current_password: pwForm.current_password,
          new_password: pwForm.new_password,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Update failed");
      setPwForm({ current_password: "", new_password: "", confirm: "" });
      setStatus({ type: "success", msg: "Password updated successfully!" });
    } catch (err) {
      setStatus({ type: "error", msg: err.message });
    } finally {
      setSaving(false);
    }
  };

  const cancelBooking = async (ref) => {
    if (!window.confirm(`Cancel booking ${ref}? This cannot be undone.`)) return;
    try {
      const res = await authFetch(`${API}/bookings/${ref}/cancel`, {
        method: "POST",
      });
      if (res.ok) {
        await loadData();
        setStatus({ type: "success", msg: `Booking ${ref} cancelled.` });
      } else {
        const d = await res.json();
        setStatus({ type: "error", msg: d.detail || "Cancel failed" });
      }
    } catch (err) {
      setStatus({ type: "error", msg: err.message });
    }
  };

  if (loading)
    return (
      <div className="profile-loading">
        <div className="prof-spinner" />
      </div>
    );

  const initials = profile?.full_name
    ?.split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="profile-page">
      <div className="profile-inner">
        {/* HEADER */}
        <div className="profile-header">
          <div className="profile-avatar">{initials}</div>
          <div>
            <h1 className="profile-name">{profile?.full_name}</h1>
            <p className="profile-email">{profile?.email}</p>
            <span className="profile-badge">{profile?.role}</span>
          </div>
        </div>

        {/* TABS */}
        <div className="profile-tabs">
          {[
            { key: "profile", label: "Profile" },
            { key: "bookings", label: `Bookings (${bookings.length})` },
            { key: "password", label: "Password" },
          ].map((t) => (
            <button
              key={t.key}
              className={`ptab${tab === t.key ? " active" : ""}`}
              onClick={() => {
                setTab(t.key);
                setStatus(null);
                setEditing(false);
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {status && (
          <div className={`prof-${status.type}`}>{status.msg}</div>
        )}

        {/* ── PROFILE TAB ── */}
        {tab === "profile" && (
          <div className="profile-card">
            <div className="pc-header">
              <h3>Personal Information</h3>
              <button
                className="pc-edit-btn"
                onClick={() => {
                  setEditing(!editing);
                  setStatus(null);
                  // Reset form to current profile values when opening edit
                  if (!editing) {
                    setForm({
                      full_name: profile?.full_name || "",
                      phone: profile?.phone || "",
                      passport_number: profile?.passport_number || "",
                      nationality: profile?.nationality || "",
                    });
                  }
                }}
              >
                {editing ? "Cancel" : "Edit"}
              </button>
            </div>

            {editing ? (
              <div className="prof-form">
                {[
                  { label: "Full Name", key: "full_name", type: "text", placeholder: "John Doe" },
                  { label: "Phone", key: "phone", type: "tel", placeholder: "+1 (555) 000-0000" },
                  { label: "Passport Number", key: "passport_number", type: "text", placeholder: "A12345678" },
                  { label: "Nationality", key: "nationality", type: "text", placeholder: "American" },
                ].map((f) => (
                  <div className="auth-field" key={f.key}>
                    <label>{f.label}</label>
                    <input
                      type={f.type}
                      value={form[f.key] || ""}
                      placeholder={f.placeholder}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, [f.key]: e.target.value }))
                      }
                    />
                  </div>
                ))}
                <button
                  className="auth-btn"
                  onClick={saveProfile}
                  disabled={saving}
                >
                  {saving ? <span className="auth-spinner" /> : "Save Changes"}
                </button>
              </div>
            ) : (
              <div className="prof-info-grid">
                {[
                  { label: "Full Name", val: profile?.full_name },
                  { label: "Email", val: profile?.email },
                  { label: "Phone", val: profile?.phone || "—" },
                  { label: "Passport", val: profile?.passport_number || "—" },
                  { label: "Nationality", val: profile?.nationality || "—" },
                  {
                    label: "Member Since",
                    val: new Date(profile?.created_at).toLocaleDateString(),
                  },
                ].map((f) => (
                  <div className="prof-info-item" key={f.label}>
                    <span className="pii-label">{f.label}</span>
                    <span className="pii-val">{f.val}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── BOOKINGS TAB ── */}
        {tab === "bookings" && (
          <div className="profile-card">
            <h3 style={{ marginBottom: "1.25rem" }}>
              My Bookings ({bookings.length})
            </h3>
            {bookings.length === 0 ? (
              <p className="empty-msg">
                No bookings yet.{" "}
                <a href="/" className="auth-link">Search for flights →</a>
              </p>
            ) : (
              <div className="bookings-list">
                {bookings.map((b) => (
                  <div className="booking-card" key={b.id}>
                    <div className="bc-ref">
                      <span className="bc-ref-label">Ref</span>
                      <span className="bc-ref-val">{b.booking_ref}</span>
                    </div>
                    {b.flight && (
                      <div className="bc-route">
                        <span className="bc-code">{b.flight.origin_code}</span>
                        <Icons.AirplaneIcon className="bc-arrow" />
                        <span className="bc-code">{b.flight.destination_code}</span>
                      </div>
                    )}
                    <div className="bc-meta">
                      {b.flight && (
                        <span>
                          {new Date(b.flight.departure_time).toLocaleString([], {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </span>
                      )}
                      <span>
                        {b.cabin_class} · {b.passengers} pax
                      </span>
                      <span className="bc-price">
                        ${Number(b.total_price).toLocaleString()}
                      </span>
                    </div>
                    <div className="bc-footer">
                      <span className={`bc-status bc-status--${b.status}`}>
                        {b.status}
                      </span>
                      {b.status === "confirmed" && (
                        <button
                          className="bc-cancel-btn"
                          onClick={() => cancelBooking(b.booking_ref)}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── PASSWORD TAB ── */}
        {tab === "password" && (
          <div className="profile-card">
            <h3 style={{ marginBottom: "1.25rem" }}>Change Password</h3>
            <div className="prof-form">
              {[
                {
                  label: "Current Password",
                  key: "current_password",
                  type: "password",
                  placeholder: "Your current password",
                },
                {
                  label: "New Password",
                  key: "new_password",
                  type: "password",
                  placeholder: "Min. 8 characters",
                },
                {
                  label: "Confirm New Password",
                  key: "confirm",
                  type: "password",
                  placeholder: "Repeat new password",
                },
              ].map((f) => (
                <div className="auth-field" key={f.key}>
                  <label>{f.label}</label>
                  <input
                    type={f.type}
                    value={pwForm[f.key]}
                    placeholder={f.placeholder}
                    onChange={(e) =>
                      setPwForm((p) => ({ ...p, [f.key]: e.target.value }))
                    }
                  />
                </div>
              ))}
              <button
                className="auth-btn"
                onClick={savePassword}
                disabled={saving}
              >
                {saving ? <span className="auth-spinner" /> : "Update Password"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── STAFF PROFILE ──────────────────────────────────────────────────────────────
export function StaffProfile() {
  const { user: storedUser, authFetch } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [profile, setProfile] = useState(null);
  const [flights, setFlights] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [users, setUsers] = useState([]);
  const [tab, setTab] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);

  // New flight form
  const emptyFlight = {
    flight_number: "",
    origin_code: "",
    destination_code: "",
    departure_time: "",
    arrival_time: "",
    cabin_class: "Economy",
    base_price: "",
    total_seats: 180,
    aircraft_type: "",
  };
  const [flightForm, setFlightForm] = useState(emptyFlight);
  const [flightErr, setFlightErr] = useState("");

  useEffect(() => {
    if (!storedUser) {
      navigate("/login");
      return;
    }
    if (storedUser.role === "passenger") {
      navigate("/profile/user");
      return;
    }
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const promises = [
        authFetch(`${API}/staff/dashboard`),
        authFetch(`${API}/staff/profile`),
        authFetch(`${API}/flights/?limit=50`),
        authFetch(`${API}/bookings/?limit=50`),
      ];
      // Admin can also list users
      if (storedUser?.role === "admin") {
        promises.push(authFetch(`${API}/users/?limit=50`));
      }

      const results = await Promise.all(promises);
      const [sRes, pRes, fRes, bRes, uRes] = results;

      if (sRes.ok) setStats(await sRes.json());
      if (pRes.ok) setProfile(await pRes.json());
      if (fRes.ok) {
        const d = await fRes.json();
        setFlights(d.flights || []);
      }
      if (bRes.ok) {
        const d = await bRes.json();
        setBookings(d.bookings || []);
      }
      if (uRes?.ok) {
        const d = await uRes.json();
        setUsers(Array.isArray(d) ? d : []);
      }
    } catch (_) {}
    finally {
      setLoading(false);
    }
  };

  const createFlight = async () => {
    setFlightErr("");
    if (
      !flightForm.flight_number ||
      !flightForm.origin_code ||
      !flightForm.destination_code ||
      !flightForm.departure_time ||
      !flightForm.arrival_time ||
      !flightForm.base_price
    ) {
      setFlightErr("Please fill in all required fields.");
      return;
    }
    setSaving(true);
    try {
      const res = await authFetch(`${API}/flights/`, {
        method: "POST",
        body: JSON.stringify({
          ...flightForm,
          base_price: parseFloat(flightForm.base_price),
          total_seats: parseInt(flightForm.total_seats, 10),
          origin_code: flightForm.origin_code.toUpperCase(),
          destination_code: flightForm.destination_code.toUpperCase(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Create failed");
      setFlightForm(emptyFlight);
      setStatus({ type: "success", msg: `Flight ${data.flight_number} created!` });
      setTab("flights");
      await loadAll();
    } catch (err) {
      setFlightErr(err.message);
    } finally {
      setSaving(false);
    }
  };

  const updateFlightStatus = async (id, newStatus) => {
    try {
      const res = await authFetch(`${API}/flights/${id}`, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        await loadAll();
        setStatus({ type: "success", msg: "Flight status updated." });
      } else {
        const d = await res.json();
        setStatus({ type: "error", msg: d.detail || "Update failed" });
      }
    } catch (err) {
      setStatus({ type: "error", msg: err.message });
    }
  };

  const updateUserRole = async (userId, newRole) => {
    try {
      const res = await authFetch(
        `${API}/users/${userId}/role?role=${newRole}`,
        { method: "PATCH" }
      );
      if (res.ok) {
        await loadAll();
        setStatus({ type: "success", msg: "User role updated." });
      } else {
        const d = await res.json();
        setStatus({ type: "error", msg: d.detail || "Update failed" });
      }
    } catch (err) {
      setStatus({ type: "error", msg: err.message });
    }
  };

  if (loading)
    return (
      <div className="profile-loading">
        <div className="prof-spinner" />
      </div>
    );

  const initials =
    profile?.full_name
      ?.split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "ST";

  const isAdmin = storedUser?.role === "admin";

  const tabs = [
    { key: "dashboard", label: "Dashboard" },
    { key: "flights", label: `Flights (${flights.length})` },
    { key: "bookings", label: `Bookings (${bookings.length})` },
    { key: "add-flight", label: "+ Add Flight" },
    ...(isAdmin ? [{ key: "users", label: `Users (${users.length})` }] : []),
  ];

  return (
    <div className="profile-page">
      <div className="profile-inner profile-inner--wide">
        {/* HEADER */}
        <div className="profile-header">
          <div className="profile-avatar profile-avatar--staff">{initials}</div>
          <div>
            <h1 className="profile-name">{profile?.full_name}</h1>
            <p className="profile-email">{profile?.email}</p>
            <span className="profile-badge profile-badge--staff">
              {profile?.role}
            </span>
          </div>
        </div>

        {/* TABS */}
        <div className="profile-tabs">
          {tabs.map((t) => (
            <button
              key={t.key}
              className={`ptab${tab === t.key ? " active" : ""}`}
              onClick={() => {
                setTab(t.key);
                setStatus(null);
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {status && (
          <div className={`prof-${status.type}`}>{status.msg}</div>
        )}

        {/* ── DASHBOARD ── */}
        {tab === "dashboard" && stats && (
          <div>
            <div className="dash-grid">
              {[
                { label: "Total Users", val: stats.total_users, color: "#1877f2" },
                { label: "Total Flights", val: stats.total_flights, color: "#00308f" },
                { label: "Confirmed", val: stats.confirmed, color: "#22c55e" },
                { label: "Cancelled", val: stats.cancelled, color: "#e53935" },
                { label: "Total Bookings", val: stats.total_bookings, color: "#90caf9" },
                {
                  label: "Revenue (USD)",
                  val: `$${Number(stats.revenue).toLocaleString()}`,
                  color: "#22c55e",
                },
              ].map((s) => (
                <div
                  className="stat-card"
                  key={s.label}
                  style={{ "--accent": s.color }}
                >
                  <span className="stat-val">{s.val}</span>
                  <span className="stat-label">{s.label}</span>
                </div>
              ))}
            </div>

            {/* Recent bookings preview */}
            <div className="profile-card" style={{ marginTop: "1.5rem" }}>
              <div className="pc-header">
                <h3>Recent Bookings</h3>
                <button
                  className="pc-edit-btn"
                  onClick={() => setTab("bookings")}
                >
                  View All
                </button>
              </div>
              <div className="staff-table-wrap">
                <table className="staff-table">
                  <thead>
                    <tr>
                      <th>Ref</th>
                      <th>Route</th>
                      <th>Cabin</th>
                      <th>Pax</th>
                      <th>Total</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.slice(0, 5).map((b) => (
                      <tr key={b.id}>
                        <td>
                          <strong>{b.booking_ref}</strong>
                        </td>
                        <td>
                          {b.flight
                            ? `${b.flight.origin_code} → ${b.flight.destination_code}`
                            : "—"}
                        </td>
                        <td>{b.cabin_class}</td>
                        <td>{b.passengers}</td>
                        <td>${Number(b.total_price).toLocaleString()}</td>
                        <td>
                          <span className={`bc-status bc-status--${b.status}`}>
                            {b.status}
                          </span>
                        </td>
                        <td>
                          {new Date(b.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── FLIGHTS LIST ── */}
        {tab === "flights" && (
          <div className="profile-card">
            <div className="pc-header">
              <h3>All Flights ({flights.length})</h3>
              <button
                className="pc-edit-btn"
                onClick={() => setTab("add-flight")}
              >
                + Add Flight
              </button>
            </div>
            <div className="staff-table-wrap">
              <table className="staff-table">
                <thead>
                  <tr>
                    <th>Flight #</th>
                    <th>Route</th>
                    <th>Departure</th>
                    <th>Cabin</th>
                    <th>Seats</th>
                    <th>Price</th>
                    <th>Status</th>
                    <th>Update</th>
                  </tr>
                </thead>
                <tbody>
                  {flights.map((f) => (
                    <tr key={f.id}>
                      <td>
                        <strong>{f.flight_number}</strong>
                      </td>
                      <td>
                        {f.origin_code} → {f.destination_code}
                      </td>
                      <td>
                        {new Date(f.departure_time).toLocaleString([], {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </td>
                      <td>{f.cabin_class}</td>
                      <td>
                        {f.seats_available}/{f.total_seats}
                      </td>
                      <td>${f.base_price}</td>
                      <td>
                        <span
                          className={`fs-badge fs-${f.status?.toLowerCase()}`}
                        >
                          {f.status}
                        </span>
                      </td>
                      <td>
                        <select
                          className="st-select"
                          value={f.status}
                          onChange={(e) =>
                            updateFlightStatus(f.id, e.target.value)
                          }
                        >
                          {[
                            "Scheduled",
                            "Boarding",
                            "Departed",
                            "Arrived",
                            "Cancelled",
                            "Delayed",
                          ].map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── BOOKINGS LIST ── */}
        {tab === "bookings" && (
          <div className="profile-card">
            <h3 style={{ marginBottom: "1.25rem" }}>
              All Bookings ({bookings.length})
            </h3>
            <div className="staff-table-wrap">
              <table className="staff-table">
                <thead>
                  <tr>
                    <th>Ref</th>
                    <th>Route</th>
                    <th>Flight #</th>
                    <th>Cabin</th>
                    <th>Pax</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Booked</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((b) => (
                    <tr key={b.id}>
                      <td>
                        <strong>{b.booking_ref}</strong>
                      </td>
                      <td>
                        {b.flight
                          ? `${b.flight.origin_code} → ${b.flight.destination_code}`
                          : "—"}
                      </td>
                      <td>{b.flight?.flight_number || "—"}</td>
                      <td>{b.cabin_class}</td>
                      <td>{b.passengers}</td>
                      <td>${Number(b.total_price).toLocaleString()}</td>
                      <td>
                        <span className={`bc-status bc-status--${b.status}`}>
                          {b.status}
                        </span>
                      </td>
                      <td>{new Date(b.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── ADD FLIGHT ── */}
        {tab === "add-flight" && (
          <div className="profile-card">
            <h3 style={{ marginBottom: "1.25rem" }}>Create New Flight</h3>
            {flightErr && (
              <div className="auth-error" style={{ marginBottom: "1rem" }}>
                {flightErr}
              </div>
            )}
            <div className="prof-form">
              <div className="auth-row-2">
                <div className="auth-field">
                  <label>Flight Number <span className="req">*</span></label>
                  <input
                    type="text"
                    value={flightForm.flight_number}
                    onChange={(e) =>
                      setFlightForm((p) => ({
                        ...p,
                        flight_number: e.target.value.toUpperCase(),
                      }))
                    }
                    placeholder="SK101"
                  />
                </div>
                <div className="auth-field">
                  <label>Aircraft Type</label>
                  <input
                    type="text"
                    value={flightForm.aircraft_type}
                    onChange={(e) =>
                      setFlightForm((p) => ({
                        ...p,
                        aircraft_type: e.target.value,
                      }))
                    }
                    placeholder="Boeing 787"
                  />
                </div>
              </div>
              <div className="auth-row-2">
                <div className="auth-field">
                  <label>Origin Code <span className="req">*</span></label>
                  <input
                    type="text"
                    maxLength={3}
                    value={flightForm.origin_code}
                    onChange={(e) =>
                      setFlightForm((p) => ({
                        ...p,
                        origin_code: e.target.value.toUpperCase(),
                      }))
                    }
                    placeholder="JFK"
                    style={{ fontFamily: "monospace", letterSpacing: ".08em" }}
                  />
                </div>
                <div className="auth-field">
                  <label>Destination Code <span className="req">*</span></label>
                  <input
                    type="text"
                    maxLength={3}
                    value={flightForm.destination_code}
                    onChange={(e) =>
                      setFlightForm((p) => ({
                        ...p,
                        destination_code: e.target.value.toUpperCase(),
                      }))
                    }
                    placeholder="LHR"
                    style={{ fontFamily: "monospace", letterSpacing: ".08em" }}
                  />
                </div>
              </div>
              <div className="auth-row-2">
                <div className="auth-field">
                  <label>Departure Time <span className="req">*</span></label>
                  <input
                    type="datetime-local"
                    value={flightForm.departure_time}
                    onChange={(e) =>
                      setFlightForm((p) => ({
                        ...p,
                        departure_time: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="auth-field">
                  <label>Arrival Time <span className="req">*</span></label>
                  <input
                    type="datetime-local"
                    value={flightForm.arrival_time}
                    onChange={(e) =>
                      setFlightForm((p) => ({
                        ...p,
                        arrival_time: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div className="auth-row-2">
                <div className="auth-field">
                  <label>Cabin Class</label>
                  <select
                    value={flightForm.cabin_class}
                    onChange={(e) =>
                      setFlightForm((p) => ({
                        ...p,
                        cabin_class: e.target.value,
                      }))
                    }
                  >
                    <option>Economy</option>
                    <option>Premium Economy</option>
                    <option>Business</option>
                    <option>First</option>
                  </select>
                </div>
                <div className="auth-field">
                  <label>Total Seats</label>
                  <input
                    type="number"
                    min={1}
                    max={600}
                    value={flightForm.total_seats}
                    onChange={(e) =>
                      setFlightForm((p) => ({
                        ...p,
                        total_seats: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div className="auth-field">
                <label>Base Price (USD) <span className="req">*</span></label>
                <input
                  type="number"
                  min={1}
                  step="0.01"
                  value={flightForm.base_price}
                  onChange={(e) =>
                    setFlightForm((p) => ({
                      ...p,
                      base_price: e.target.value,
                    }))
                  }
                  placeholder="499.99"
                />
              </div>
              <button
                className="auth-btn"
                onClick={createFlight}
                disabled={saving}
              >
                {saving ? <span className="auth-spinner" /> : "Create Flight"}
              </button>
            </div>
          </div>
        )}

        {/* ── USERS (Admin only) ── */}
        {tab === "users" && isAdmin && (
          <div className="profile-card">
            <h3 style={{ marginBottom: "1.25rem" }}>
              All Users ({users.length})
            </h3>
            <div className="staff-table-wrap">
              <table className="staff-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Role</th>
                    <th>Active</th>
                    <th>Joined</th>
                    <th>Change Role</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>#{u.id}</td>
                      <td>
                        <strong>{u.full_name}</strong>
                      </td>
                      <td>{u.email}</td>
                      <td>{u.phone || "—"}</td>
                      <td>
                        <span
                          className="fs-badge"
                          style={{
                            background:
                              u.role === "admin"
                                ? "rgba(245,158,11,.15)"
                                : u.role === "staff"
                                ? "rgba(124,58,237,.15)"
                                : "rgba(24,119,242,.1)",
                            color:
                              u.role === "admin"
                                ? "#92400e"
                                : u.role === "staff"
                                ? "#5b21b6"
                                : "#1877f2",
                          }}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            color: u.is_active ? "#22c55e" : "#e53935",
                            fontWeight: 600,
                            fontSize: ".8rem",
                          }}
                        >
                          {u.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>{new Date(u.created_at).toLocaleDateString()}</td>
                      <td>
                        <select
                          className="st-select"
                          value={u.role}
                          onChange={(e) =>
                            updateUserRole(u.id, e.target.value)
                          }
                        >
                          <option value="passenger">passenger</option>
                          <option value="staff">staff</option>
                          <option value="admin">admin</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}