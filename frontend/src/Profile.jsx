import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Profile.css";

const API = process.env.REACT_APP_API_URL || "http://localhost:8000";

// ── Read session from localStorage ────────
function getSession() {
  return {
    userId:     localStorage.getItem("userId")     || "",
    userRole:   localStorage.getItem("userRole")   || "",
    userName:   localStorage.getItem("userName")   || "",
    userEmail:  localStorage.getItem("userEmail")  || "",
    userPhone:  localStorage.getItem("userPhone")  || "",
    createdAt:  localStorage.getItem("createdAt")  || "",
    staffId:    localStorage.getItem("staffId")    || "",
    department: localStorage.getItem("department") || "",
    isLoggedIn: localStorage.getItem("isLoggedIn") === "true",
  };
}

// ── Shared field component ─────────────────
function ProfileField({ label, name, value, editing, onChange }) {
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

// ══════════════════════════════════════════
//  USER PROFILE
// ══════════════════════════════════════════
export function UserProfile() {
  const navigate = useNavigate();
  const session  = getSession();

  const [profile, setProfile]   = useState(null);
  const [editing, setEditing]   = useState(false);
  const [editData, setEditData] = useState({});
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");

  // Redirect if not logged in
  useEffect(() => {
    if (!session.isLoggedIn) { navigate("/login"); return; }
    if (session.userRole === "staff") { navigate("/profile/staff"); return; }
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res  = await fetch(`${API}/profile/me?user_id=${encodeURIComponent(session.userId)}&role=user`, {
        method:  "GET",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      setProfile(data.profile);
    } catch (err) {
      setError(err.message || "Failed to load profile");
      // Fallback: show localStorage data
      setProfile({
        full_name:  session.userName,
        email:      session.userEmail,
        phone:      session.userPhone,
        created_at: session.createdAt,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!Object.keys(editData).length) { setEditing(false); return; }
    setSaving(true);
    try {
       const res  = await fetch(`${API}/profile/user?user_id=${encodeURIComponent(session.userId)}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(editData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);

      // Update localStorage too
      if (editData.full_name) localStorage.setItem("userName",  editData.full_name);
      if (editData.phone)     localStorage.setItem("userPhone", editData.phone);

      setProfile({ ...profile, ...editData });
      setEditing(false);
      setEditData({});
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
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <div className="profile-header-info">
            <h2>{profile?.full_name || session.userName}</h2>
            <span className="role-badge user">Passenger</span>
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
            <ProfileField label="Full Name" name="full_name" value={profile?.full_name}
              editing={editing} onChange={e => setEditData({...editData, full_name: e.target.value})} />
            <ProfileField label="Email" name="email" value={profile?.email || session.userEmail}
              editing={false} onChange={() => {}} />
            <ProfileField label="Phone" name="phone" value={profile?.phone}
              editing={editing} onChange={e => setEditData({...editData, phone: e.target.value})} />
            <ProfileField label="Role" name="role" value="Passenger"
              editing={false} onChange={() => {}} />
            <ProfileField label="Member Since" name="created_at"
              value={profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : "—"}
              editing={false} onChange={() => {}} />
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
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
              <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
            </svg>
            Explore Destinations
          </a>
          <a href="/#offers" className="plink">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
              <line x1="7" y1="7" x2="7.01" y2="7"/>
            </svg>
            View Offers
          </a>
          <a href="/" className="plink">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            Search Flights
          </a>
        </div>
      </div>
    </div>
  );
}


// ══════════════════════════════════════════
//  STAFF PROFILE
// ══════════════════════════════════════════
export function StaffProfile() {
  const navigate = useNavigate();
  const session  = getSession();

  const [profile, setProfile]   = useState(null);
  const [editing, setEditing]   = useState(false);
  const [editData, setEditData] = useState({});
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");

  useEffect(() => {
    if (!session.isLoggedIn) { navigate("/login"); return; }
    if (session.userRole === "user") { navigate("/profile/user"); return; }
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res  = await fetch(`${API}/profile/me?user_id=${encodeURIComponent(session.userId)}&role=staff`, {
        method:  "GET",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      setProfile(data.profile);
    } catch (err) {
      setError(err.message || "Failed to load profile");
      // Fallback to localStorage
      setProfile({
        full_name:  session.userName,
        email:      session.userEmail,
        phone:      session.userPhone,
        staff_id:   session.staffId,
        department: session.department,
        created_at: session.createdAt,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!Object.keys(editData).length) { setEditing(false); return; }
    setSaving(true);
    try {
      const res  = await fetch(`${API}/profile/staff?user_id=${encodeURIComponent(session.userId)}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(editData ),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);

      if (editData.full_name)  localStorage.setItem("userName",   editData.full_name);
      if (editData.phone)      localStorage.setItem("userPhone",  editData.phone);
      if (editData.department) localStorage.setItem("department", editData.department);

      setProfile({ ...profile, ...editData });
      setEditing(false);
      setEditData({});
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
            <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5">
              <rect x="2" y="7" width="20" height="14" rx="2"/>
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
            </svg>
          </div>
          <div className="profile-header-info">
            <h2>{profile?.full_name || session.userName}</h2>
            <span className="role-badge staff">Staff — {profile?.department || session.department}</span>
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
            <ProfileField label="Full Name" name="full_name" value={profile?.full_name}
              editing={editing} onChange={e => setEditData({...editData, full_name: e.target.value})} />
            <ProfileField label="Email" name="email" value={profile?.email || session.userEmail}
              editing={false} onChange={() => {}} />
            <ProfileField label="Staff ID" name="staff_id" value={profile?.staff_id || session.staffId}
              editing={false} onChange={() => {}} />
            <ProfileField label="Department" name="department" value={profile?.department}
              editing={editing} onChange={e => setEditData({...editData, department: e.target.value})} />
            <ProfileField label="Phone" name="phone" value={profile?.phone}
              editing={editing} onChange={e => setEditData({...editData, phone: e.target.value})} />
            <ProfileField label="Joined"
              value={profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : "—"}
              name="created_at" editing={false} onChange={() => {}} />
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

        {/* STAFF LINKS */}
        <div className="profile-links">
          <a href="/flights" className="plink">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            </svg>
            Manage Flights
          </a>
          <a href="/" className="plink">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            Flight Search
          </a>
        </div>
      </div>
    </div>
  );
}