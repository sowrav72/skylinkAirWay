import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "../Profile.css";

const API = process.env.REACT_APP_API_URL || "http://localhost:8000";

function PassengerProfile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [bookings, setBookings] = useState([]);
  const [loyaltyData, setLoyaltyData] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [supportTickets, setSupportTickets] = useState([]);
  const [analytics, setAnalytics] = useState([]);
  const [preferences, setPreferences] = useState([]);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({});

  const token = localStorage.getItem("skylink_token");

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      // Load critical data first (user profile and bookings)
      const [userRes, bookingsRes] = await Promise.all([
        fetch(`${API}/passenger/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API}/bookings/my`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      if (!userRes.ok) {
        throw new Error(`Failed to load user profile: ${userRes.status}`);
      }
      if (!bookingsRes.ok) {
        throw new Error(`Failed to load bookings: ${bookingsRes.status}`);
      }

      const [userData, bookingsData] = await Promise.all([
        userRes.json(),
        bookingsRes.json()
      ]);

      setUser(userData);
      setBookings(bookingsData.bookings || []);

      // Load optional data (don't fail if these don't exist yet)
      try {
        const [loyaltyRes, notificationsRes, paymentsRes, ticketsRes, analyticsRes, prefsRes] = await Promise.all([
          fetch(`${API}/passenger/loyalty/tier`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API}/passenger/notifications`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API}/passenger/payment-methods`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API}/passenger/support/tickets`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API}/passenger/analytics`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API}/passenger/preferences`, { headers: { Authorization: `Bearer ${token}` } })
        ]);

        if (loyaltyRes.ok) setLoyaltyData(await loyaltyRes.json());
        if (notificationsRes.ok) setNotifications(await notificationsRes.json());
        if (paymentsRes.ok) setPaymentMethods(await paymentsRes.json());
        if (ticketsRes.ok) setSupportTickets(await ticketsRes.json());
        if (analyticsRes.ok) setAnalytics(await analyticsRes.json());
        if (prefsRes.ok) setPreferences(await prefsRes.json());
      } catch (optionalError) {
        console.warn("Some optional data failed to load:", optionalError);
        // Don't fail the whole component for optional data
      }

    } catch (error) {
      console.error("Error loading user data:", error);
      setError(error.message || "Failed to load profile data");
      setUser(null); // This will show the error message
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async () => {
    try {
      const response = await fetch(`${API}/passenger/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(editData)
      });

      if (response.ok) {
        setUser({ ...user, ...editData });
        setEditing(false);
        setEditData({});
      }
    } catch (error) {
      console.error("Error updating profile:", error);
    }
  };

  const markNotificationRead = async (notificationId) => {
    try {
      await fetch(`${API}/passenger/notifications/${notificationId}/read`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(notifications.map(n =>
        n.id === notificationId ? { ...n, is_read: true } : n
      ));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="prof-spinner" />
        <p>Loading your profile...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="profile-error">
        <h2>Unable to Load Profile</h2>
        <p>{error || "Unable to load profile data. Please try refreshing the page."}</p>
        <button onClick={() => window.location.reload()} className="btn-primary">
          Refresh Page
        </button>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-inner">
        {/* Profile Header */}
        <div className="profile-header">
          <div className="profile-avatar">
            {user.profile_photo_url ? (
              <img src={user.profile_photo_url} alt="Profile" />
            ) : (
              user.full_name.charAt(0).toUpperCase()
            )}
          </div>
          <div className="profile-info">
            <h1 className="profile-name">{user.full_name}</h1>
            <p className="profile-email">{user.email}</p>
            <div className="profile-meta">
              <span className="profile-badge">Passenger</span>
              {loyaltyData && (
                <span className="loyalty-badge">{loyaltyData.tier_name}</span>
              )}
            </div>
          </div>
        </div>

        {/* Profile Tabs */}
        <div className="profile-tabs">
          {[
            { key: "overview", label: "Overview", icon: "📊" },
            { key: "bookings", label: "My Bookings", icon: "✈️" },
            { key: "loyalty", label: "Loyalty & Rewards", icon: "⭐" },
            { key: "payments", label: "Payment Methods", icon: "💳" },
            { key: "support", label: "Support", icon: "🆘" },
            { key: "notifications", label: "Notifications", icon: "🔔" },
            { key: "preferences", label: "Preferences", icon: "⚙️" }
          ].map(tab => (
            <button
              key={tab.key}
              className={`ptab ${activeTab === tab.key ? "active" : ""}`}
              onClick={() => setActiveTab(tab.key)}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="profile-content">
          {activeTab === "overview" && (
            <OverviewTab
              user={user}
              bookings={bookings}
              loyaltyData={loyaltyData}
              analytics={analytics}
              editing={editing}
              setEditing={setEditing}
              editData={editData}
              setEditData={setEditData}
              handleProfileUpdate={handleProfileUpdate}
              setActiveTab={setActiveTab}
            />
          )}

          {activeTab === "bookings" && (
            <BookingsTab bookings={bookings} />
          )}

          {activeTab === "loyalty" && (
            <LoyaltyTab loyaltyData={loyaltyData} />
          )}

          {activeTab === "payments" && (
            <PaymentsTab paymentMethods={paymentMethods} />
          )}

          {activeTab === "support" && (
            <SupportTab supportTickets={supportTickets} />
          )}

          {activeTab === "notifications" && (
            <NotificationsTab
              notifications={notifications}
              markNotificationRead={markNotificationRead}
            />
          )}

          {activeTab === "preferences" && (
            <PreferencesTab preferences={preferences} />
          )}
        </div>
      </div>
    </div>
  );
}

// Overview Tab Component
function OverviewTab({ user, bookings, loyaltyData, analytics, editing, setEditing, editData, setEditData, handleProfileUpdate, setActiveTab }) {
  const recentBookings = bookings.slice(0, 3);
  const totalMiles = analytics.find(a => a.metric_type === 'total_miles')?.metric_value || 0;
  const totalSpent = analytics.find(a => a.metric_type === 'total_spent')?.metric_value || 0;

  return (
    <div className="overview-grid">
      {/* Personal Information */}
      <div className="profile-card">
        <div className="pc-header">
          <h3>Personal Information</h3>
          {!editing ? (
            <button className="pc-edit-btn" onClick={() => setEditing(true)}>
              Edit
            </button>
          ) : (
            <div>
              <button className="pc-edit-btn" onClick={handleProfileUpdate}>
                Save
              </button>
              <button className="pc-edit-btn" onClick={() => { setEditing(false); setEditData({}); }}>
                Cancel
              </button>
            </div>
          )}
        </div>

        <div className="prof-info-grid">
          <div className="prof-info-item">
            <span className="pii-label">Full Name</span>
            {editing ? (
              <input
                type="text"
                value={editData.full_name || user.full_name}
                onChange={(e) => setEditData({...editData, full_name: e.target.value})}
              />
            ) : (
              <span className="pii-val">{user.full_name}</span>
            )}
          </div>

          <div className="prof-info-item">
            <span className="pii-label">Email</span>
            <span className="pii-val">{user.email}</span>
          </div>

          <div className="prof-info-item">
            <span className="pii-label">Phone</span>
            {editing ? (
              <input
                type="tel"
                value={editData.phone || user.phone || ""}
                onChange={(e) => setEditData({...editData, phone: e.target.value})}
              />
            ) : (
              <span className="pii-val">{user.phone || "Not provided"}</span>
            )}
          </div>

          <div className="prof-info-item">
            <span className="pii-label">Passport Number</span>
            {editing ? (
              <input
                type="text"
                value={editData.passport_number || user.passport_number || ""}
                onChange={(e) => setEditData({...editData, passport_number: e.target.value})}
              />
            ) : (
              <span className="pii-val">{user.passport_number || "Not provided"}</span>
            )}
          </div>

          <div className="prof-info-item">
            <span className="pii-label">Date of Birth</span>
            {editing ? (
              <input
                type="date"
                value={editData.date_of_birth || user.date_of_birth || ""}
                onChange={(e) => setEditData({...editData, date_of_birth: e.target.value})}
              />
            ) : (
              <span className="pii-val">
                {user.date_of_birth ? new Date(user.date_of_birth).toLocaleDateString() : "Not provided"}
              </span>
            )}
          </div>

          <div className="prof-info-item">
            <span className="pii-label">Nationality</span>
            {editing ? (
              <input
                type="text"
                value={editData.nationality || user.nationality || ""}
                onChange={(e) => setEditData({...editData, nationality: e.target.value})}
              />
            ) : (
              <span className="pii-val">{user.nationality || "Not provided"}</span>
            )}
          </div>
        </div>
      </div>

      {/* Travel Summary */}
      <div className="profile-card">
        <h3>Travel Summary</h3>
        <div className="travel-stats">
          <div className="stat-item">
            <span className="stat-val">{totalMiles.toLocaleString()}</span>
            <span className="stat-label">Miles Flown</span>
          </div>
          <div className="stat-item">
            <span className="stat-val">${totalSpent.toLocaleString()}</span>
            <span className="stat-label">Total Spent</span>
          </div>
          <div className="stat-item">
            <span className="stat-val">{bookings.length}</span>
            <span className="stat-label">Total Bookings</span>
          </div>
        </div>
      </div>

      {/* Loyalty Status */}
      {loyaltyData && (
        <div className="profile-card">
          <h3>Loyalty Status</h3>
          <div className="loyalty-status">
            <div className="loyalty-tier">
              <span className="tier-name">{loyaltyData.tier_name}</span>
              <span className="tier-level">Level {loyaltyData.tier_level}</span>
            </div>
            <div className="benefits-list">
              <h4>Benefits:</h4>
              <ul>
                {loyaltyData.benefits.map((benefit, index) => (
                  <li key={index}>{benefit}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Recent Bookings */}
      <div className="profile-card">
        <div className="pc-header">
          <h3>Recent Bookings</h3>
          <button className="pc-edit-btn" onClick={() => setActiveTab("bookings")}>
            View All →
          </button>
        </div>

        {recentBookings.length > 0 ? (
          <div className="recent-bookings">
            {recentBookings.map(booking => (
              <div key={booking.id} className="recent-booking-item">
                <div className="booking-route">
                  {booking.flight?.origin_code} → {booking.flight?.destination_code}
                </div>
                <div className="booking-details">
                  <span>{booking.flight?.flight_number}</span>
                  <span>{new Date(booking.flight?.departure_time).toLocaleDateString()}</span>
                </div>
                <div className={`booking-status status-${booking.status}`}>
                  {booking.status}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-msg">No bookings yet. Start your journey!</div>
        )}
      </div>
    </div>
  );
}

// Bookings Tab Component
function BookingsTab({ bookings }) {
  const [filter, setFilter] = useState("all");

  const filteredBookings = bookings.filter(booking => {
    if (filter === "all") return true;
    return booking.status === filter;
  });

  return (
    <div className="bookings-section">
      <div className="bookings-header">
        <h3>My Bookings</h3>
        <div className="booking-filters">
          {["all", "pending", "confirmed", "cancelled"].map(status => (
            <button
              key={status}
              className={`filter-btn ${filter === status ? "active" : ""}`}
              onClick={() => setFilter(status)}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {filteredBookings.length > 0 ? (
        <div className="bookings-list">
          {filteredBookings.map(booking => (
            <div key={booking.id} className="booking-card">
              <div className="bc-ref">
                <span className="bc-ref-label">Booking Reference</span>
                <span className="bc-ref-val">{booking.booking_ref}</span>
              </div>

              <div className="bc-route">
                <span className="bc-code">{booking.flight?.origin_code}</span>
                <span className="bc-arrow">✈</span>
                <span className="bc-code">{booking.flight?.destination_code}</span>
              </div>

              <div className="bc-meta">
                <div>Flight: {booking.flight?.flight_number}</div>
                <div>Departure: {new Date(booking.flight?.departure_time).toLocaleString()}</div>
                <div>Passengers: {booking.passengers}</div>
                <div className="bc-price">Total: ${booking.total_price}</div>
              </div>

              <div className="bc-footer">
                <span className={`bc-status bc-status--${booking.status}`}>
                  {booking.status}
                </span>
                <div className="bc-actions">
                  <button className="bc-action-btn">View Details</button>
                  {booking.status === "confirmed" && (
                    <button className="bc-cancel-btn">Cancel</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-msg">No {filter === "all" ? "" : filter} bookings found.</div>
      )}
    </div>
  );
}

// Loyalty Tab Component
function LoyaltyTab({ loyaltyData }) {
  const [pointsHistory, setPointsHistory] = useState([]);
  const [badges, setBadges] = useState([]);

  useEffect(() => {
    // Load points history and badges
    const token = localStorage.getItem("skylink_token");
    Promise.all([
      fetch(`${API}/passenger/loyalty/points`, {
        headers: { Authorization: `Bearer ${token}` }
      }),
      fetch(`${API}/passenger/loyalty/badges`, {
        headers: { Authorization: `Bearer ${token}` }
      })
    ]).then(async ([pointsRes, badgesRes]) => {
      const [pointsData, badgesData] = await Promise.all([
        pointsRes.json(),
        badgesRes.json()
      ]);
      setPointsHistory(pointsData);
      setBadges(badgesData);
    });
  }, []);

  return (
    <div className="loyalty-section">
      {/* Current Tier */}
      {loyaltyData && (
        <div className="profile-card">
          <h3>Current Tier</h3>
          <div className="current-tier">
            <div className="tier-display">
              <span className="tier-name">{loyaltyData.tier_name}</span>
              <span className="tier-level">Level {loyaltyData.tier_level}</span>
            </div>
            <div className="tier-benefits">
              <h4>Your Benefits:</h4>
              <ul>
                {loyaltyData.benefits.map((benefit, index) => (
                  <li key={index}>✓ {benefit}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Points History */}
      <div className="profile-card">
        <h3>Points History</h3>
        {pointsHistory.length > 0 ? (
          <div className="points-history">
            {pointsHistory.map(point => (
              <div key={point.id} className="point-entry">
                <div className="point-info">
                  <span className="point-amount">
                    {point.points_earned > 0 ? "+" : ""}{point.points_earned}
                  </span>
                  <span className="point-source">{point.source}</span>
                  {point.related_booking_ref && (
                    <span className="point-booking">Booking: {point.related_booking_ref}</span>
                  )}
                </div>
                <span className="point-date">
                  {new Date(point.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-msg">No points activity yet.</div>
        )}
      </div>

      {/* Badges */}
      <div className="profile-card">
        <h3>Earned Badges</h3>
        {badges.length > 0 ? (
          <div className="badges-grid">
            {badges.map(badge => (
              <div key={badge.id} className="badge-item">
                <div className="badge-icon">{badge.badge_icon_url || "🏆"}</div>
                <div className="badge-info">
                  <h4>{badge.badge_name}</h4>
                  <p>{badge.badge_description}</p>
                  <span className="badge-date">
                    Earned {new Date(badge.earned_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-msg">No badges earned yet. Keep flying!</div>
        )}
      </div>
    </div>
  );
}

// Payments Tab Component
function PaymentsTab({ paymentMethods }) {
  const [showAddForm, setShowAddForm] = useState(false);

  return (
    <div className="payments-section">
      <div className="payments-header">
        <h3>Payment Methods</h3>
        <button
          className="add-payment-btn"
          onClick={() => setShowAddForm(true)}
        >
          Add Payment Method
        </button>
      </div>

      {paymentMethods.length > 0 ? (
        <div className="payment-methods-list">
          {paymentMethods.map(method => (
            <div key={method.id} className="payment-method-card">
              <div className="payment-info">
                <div className="payment-type">
                  {method.payment_type === 'credit_card' && '💳'}
                  {method.payment_type === 'bkash' && '📱'}
                  {method.payment_type === 'nagad' && '📱'}
                  {method.payment_type === 'apple_pay' && '📱'}
                  {method.payment_type === 'google_pay' && '📱'}
                  <span>{method.card_type || method.payment_type.replace('_', ' ').toUpperCase()}</span>
                </div>
                {method.last4_digits && (
                  <div className="card-number">**** **** **** {method.last4_digits}</div>
                )}
                {method.mobile_number && (
                  <div className="mobile-number">{method.mobile_number}</div>
                )}
                {method.is_default && (
                  <span className="default-badge">Default</span>
                )}
              </div>
              <div className="payment-actions">
                {!method.is_default && (
                  <button className="action-btn">Set as Default</button>
                )}
                <button className="action-btn delete">Remove</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-msg">No payment methods added yet.</div>
      )}

      {showAddForm && (
        <AddPaymentForm onClose={() => setShowAddForm(false)} />
      )}
    </div>
  );
}

// Support Tab Component
function SupportTab({ supportTickets }) {
  const [showNewTicketForm, setShowNewTicketForm] = useState(false);

  return (
    <div className="support-section">
      <div className="support-header">
        <h3>Support Tickets</h3>
        <button
          className="new-ticket-btn"
          onClick={() => setShowNewTicketForm(true)}
        >
          New Ticket
        </button>
      </div>

      {supportTickets.length > 0 ? (
        <div className="tickets-list">
          {supportTickets.map(ticket => (
            <div key={ticket.id} className="ticket-card">
              <div className="ticket-header">
                <div className="ticket-info">
                  <h4>{ticket.subject}</h4>
                  <span className="ticket-number">#{ticket.ticket_number}</span>
                </div>
                <span className={`ticket-status status-${ticket.status}`}>
                  {ticket.status}
                </span>
              </div>
              <div className="ticket-meta">
                <span>Priority: {ticket.priority}</span>
                <span>Responses: {ticket.response_count}</span>
                <span>Created: {new Date(ticket.created_at).toLocaleDateString()}</span>
              </div>
              <div className="ticket-preview">
                {ticket.message.substring(0, 150)}...
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-msg">No support tickets yet.</div>
      )}

      {showNewTicketForm && (
        <NewTicketForm onClose={() => setShowNewTicketForm(false)} />
      )}
    </div>
  );
}

// Notifications Tab Component
function NotificationsTab({ notifications, markNotificationRead }) {
  return (
    <div className="notifications-section">
      <h3>Notifications</h3>

      {notifications.length > 0 ? (
        <div className="notifications-list">
          {notifications.map(notification => (
            <div
              key={notification.id}
              className={`notification-item ${!notification.is_read ? 'unread' : ''}`}
            >
              <div className="notification-header">
                <h4>{notification.title}</h4>
                <span className="notification-date">
                  {new Date(notification.created_at).toLocaleDateString()}
                </span>
              </div>
              <p className="notification-message">{notification.message}</p>
              {!notification.is_read && (
                <button
                  className="mark-read-btn"
                  onClick={() => markNotificationRead(notification.id)}
                >
                  Mark as Read
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-msg">No notifications.</div>
      )}
    </div>
  );
}

// Preferences Tab Component
function PreferencesTab({ preferences }) {
  return (
    <div className="preferences-section">
      <h3>Preferences</h3>

      <div className="preferences-grid">
        {preferences.map(pref => (
          <div key={pref.preference_key} className="preference-item">
            <label>{pref.preference_key.replace('_', ' ').toUpperCase()}</label>
            <div className="preference-value">
              {typeof pref.preference_value === 'object'
                ? JSON.stringify(pref.preference_value, null, 2)
                : String(pref.preference_value)
              }
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Helper Components
function AddPaymentForm({ onClose }) {
  // Implementation for adding payment methods
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <h3>Add Payment Method</h3>
        <p>Payment method form would go here</p>
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

function NewTicketForm({ onClose }) {
  // Implementation for creating support tickets
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <h3>Create Support Ticket</h3>
        <p>Support ticket form would go here</p>
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

export default PassengerProfile;