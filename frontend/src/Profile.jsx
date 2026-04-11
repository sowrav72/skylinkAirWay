import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Profile.css";

const API = process.env.REACT_APP_API_URL || "http://localhost:8000";

function ProfileField({ label, value, name, editing, onChange }) {
  return (
    <div className="pf-field">
      <span className="pf-label">{label}</span>
      {editing ? (
        <input className="pf-input" name={name} defaultValue={value} onChange={onChange} />
      ) : (
        <span className="pf-value">{value || "—"}</span>
      )}
    </div>
  );
}

// ── USER PROFILE ───────────────────────────
export function UserProfile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const token = localStorage.getItem("authToken");
  const userName = localStorage.getItem("userName") || "Passenger";

  useEffect(() => {
    if (!token) { navigate("/login"); return; }
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch(`${API}/profile/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) { handleLogout(); return; }
      const data = await res.json();
      if (data.role !== "user") { navigate("/profile/staff"); return; }
      setProfile(data.profile);
    } catch {
      setError("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/profile/user`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(editData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      setProfile({ ...profile, ...editData });
      setEditing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  if (loading) return <div className="profile-loading"><div className="spin-ring" /></div>;

  return (
    <div className="profile-page">
      <div className="profile-card">

        {/* HEADER */}
        <div className="profile-header">
          <div className="profile-avatar">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <div className="profile-header-info">
            <h2>{profile?.full_name || userName}</h2>
            <span className="role-badge user">Passenger</span>
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sign Out
          </button>
        </div>

        {/* BODY */}
        <div className="profile-body">
          <div className="pf-section-title">Personal Information</div>

          {error && <div className="profile-error">{error}</div>}

          <div className="pf-grid">
            <ProfileField label="Full Name" value={profile?.full_name} name="full_name"
              editing={editing} onChange={(e) => setEditData({ ...editData, full_name: e.target.value })} />
            <ProfileField label="Phone" value={profile?.phone} name="phone"
              editing={editing} onChange={(e) => setEditData({ ...editData, phone: e.target.value })} />
            <ProfileField label="Role" value="Passenger" name="role" editing={false} />
            <ProfileField label="Member Since"
              value={profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : "—"}
              name="created_at" editing={false} />
          </div>

          <div className="pf-actions">
            {editing ? (
              <>
                <button className="pf-btn primary" onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </button>
                <button className="pf-btn ghost" onClick={() => { setEditing(false); setEditData({}); }}>
                  Cancel
                </button>
              </>
            ) : (
              <button className="pf-btn primary" onClick={() => setEditing(true)}>
                Edit Profile
              </button>
            )}
          </div>
        </div>

        {/* QUICK LINKS */}
        <div className="profile-links">
          <a href="/#destinations" className="plink">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
            Explore Destinations
          </a>
          <a href="/#offers" className="plink">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
              <line x1="7" y1="7" x2="7.01" y2="7"/>
            </svg>
            View Offers
          </a>
        </div>
      </div>
    </div>
  );
}

// ── STAFF PROFILE ──────────────────────────
export function StaffProfile() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const token = localStorage.getItem("authToken");

  useEffect(() => {
    if (!token) { navigate("/login"); return; }
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch(`${API}/profile/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) { handleLogout(); return; }
      const data = await res.json();
      if (data.role !== "staff") { navigate("/profile/user"); return; }
      setProfile(data.profile);
    } catch {
      setError("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/profile/staff`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(editData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      setProfile({ ...profile, ...editData });
      setEditing(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  if (loading) return <div className="profile-loading"><div className="spin-ring" /></div>;

  return (
    <div className="profile-page">
      <div className="profile-card">

        {/* HEADER */}
        <div className="profile-header staff-header">
          <div className="profile-avatar staff-avatar">
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
              <rect x="2" y="7" width="20" height="14" rx="2"/>
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
            </svg>
          </div>
          <div className="profile-header-info">
            <h2>{profile?.full_name || "Staff Member"}</h2>
            <span className="role-badge staff">Staff — {profile?.department}</span>
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sign Out
          </button>
        </div>

        {/* BODY */}
        <div className="profile-body">
          <div className="pf-section-title">Staff Information</div>

          {error && <div className="profile-error">{error}</div>}

          <div className="pf-grid">
            <ProfileField label="Full Name" value={profile?.full_name} name="full_name"
              editing={editing} onChange={(e) => setEditData({ ...editData, full_name: e.target.value })} />
            <ProfileField label="Staff ID" value={profile?.staff_id} name="staff_id" editing={false} />
            <ProfileField label="Department" value={profile?.department} name="department"
              editing={editing} onChange={(e) => setEditData({ ...editData, department: e.target.value })} />
            <ProfileField label="Phone" value={profile?.phone} name="phone"
              editing={editing} onChange={(e) => setEditData({ ...editData, phone: e.target.value })} />
            <ProfileField label="Joined"
              value={profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : "—"}
              name="created_at" editing={false} />
          </div>

          <div className="pf-actions">
            {editing ? (
              <>
                <button className="pf-btn primary" onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : "Save Changes"}
                </button>
                <button className="pf-btn ghost" onClick={() => { setEditing(false); setEditData({}); }}>
                  Cancel
                </button>
              </>
            ) : (
              <button className="pf-btn primary" onClick={() => setEditing(true)}>
                Edit Profile
              </button>
            )}
          </div>
        </div>

        {/* STAFF TOOLS */}
        <div className="profile-links">
          <a href="/flights" className="plink">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            </svg>
            Manage Flights
          </a>
          <a href="/bookings" className="plink">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
            </svg>
            View Bookings
          </a>
        </div>
      </div>
    </div>
  );
}