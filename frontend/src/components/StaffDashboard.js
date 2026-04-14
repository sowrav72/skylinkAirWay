import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import "../Profile.css";

const API = process.env.REACT_APP_API_URL || "http://localhost:8000";

function StaffDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [dashboardStats, setDashboardStats] = useState(null);
  const [flights, setFlights] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [users, setUsers] = useState([]);
  const [crew, setCrew] = useState([]);
  const [aircraft, setAircraft] = useState([]);
  const [error, setError] = useState(null);

  const token = localStorage.getItem("skylink_token");

  const loadDashboardData = useCallback(async () => {
    try {
      // Load critical data first (dashboard stats and flights)
      const [statsRes, flightsRes] = await Promise.all([
        fetch(`${API}/staff/dashboard/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API}/flights/?limit=50`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      console.log('Critical API responses:', {
        stats: statsRes.status,
        flights: flightsRes.status
      });

      if (!statsRes.ok) {
        const errorText = await statsRes.text();
        console.error('Dashboard stats error:', errorText);
        throw new Error(`Failed to load dashboard stats: ${statsRes.status} - ${errorText}`);
      }
      if (!flightsRes.ok) {
        const errorText = await flightsRes.text();
        console.error('Flights error:', errorText);
        throw new Error(`Failed to load flights: ${flightsRes.status} - ${errorText}`);
      }

      const [statsData, flightsData] = await Promise.all([
        statsRes.json(),
        flightsRes.json()
      ]);

      setDashboardStats(statsData);
      setFlights(flightsData.flights || []);

      // Get current user info first
      const userInfo = JSON.parse(localStorage.getItem("skylink_user"));
      setUser(userInfo);

      // Load optional data (don't fail if these don't exist or user lacks permissions)
      try {
        const [bookingsRes, crewRes, aircraftRes] = await Promise.all([
          fetch(`${API}/staff/bookings/search?limit=50`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(`${API}/staff/crew/roster`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch(`${API}/staff/aircraft`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        console.log('API responses:', {
          bookings: bookingsRes.status,
          crew: crewRes.status,
          aircraft: aircraftRes.status
        });

        if (bookingsRes.ok) {
          const bookingsData = await bookingsRes.json();
          setBookings(bookingsData.bookings || []);
        } else {
          console.warn('Bookings API failed:', bookingsRes.status, await bookingsRes.text());
        }

        if (crewRes.ok) {
          const crewData = await crewRes.json();
          setCrew(crewData.crew || []);
        } else {
          console.warn('Crew API failed:', crewRes.status, await crewRes.text());
        }

        if (aircraftRes.ok) {
          const aircraftData = await aircraftRes.json();
          setAircraft(aircraftData || []);
        } else {
          console.warn('Aircraft API failed:', aircraftRes.status, await aircraftRes.text());
        }

        // Load users only if user is admin
        if (userInfo?.role === 'admin') {
          try {
            const usersRes = await fetch(`${API}/users/?limit=50`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (usersRes.ok) {
              const usersData = await usersRes.json();
              setUsers(usersData || []);
            }
          } catch (usersError) {
            console.warn("Could not load users (admin only):", usersError);
          }
        }
      } catch (optionalError) {
        console.warn("Some optional data failed to load:", optionalError);
        // Don't fail the whole component for optional data
      }

    } catch (error) {
      console.error("Error loading dashboard data:", error);
      setError(error.message || "Failed to load dashboard data");
      setUser(null); // This will show the error message
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    // Check if user has staff privileges
    const userInfo = JSON.parse(localStorage.getItem("skylink_user"));
    const allowedRoles = ['agent', 'pilot', 'ground_crew', 'operations_manager', 'admin'];

    console.log('Current user info:', userInfo);
    console.log('User role:', userInfo?.role);
    console.log('Allowed roles:', allowedRoles);

    if (!userInfo || !allowedRoles.includes(userInfo.role)) {
      console.error('User does not have staff privileges. Current role:', userInfo?.role, 'Allowed roles:', allowedRoles);
      alert(`Access denied. Your current role (${userInfo?.role || 'none'}) does not have staff privileges. Redirecting to passenger profile.`);
      navigate("/profile/user"); // Redirect to passenger profile
      return;
    }

    loadDashboardData();
  }, [token, loadDashboardData, navigate]);

  const updateFlightStatus = async (flightId, newStatus) => {
    try {
      const response = await fetch(`${API}/staff/flights/${flightId}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      if (response.ok) {
        // Refresh flights data
        const flightsRes = await fetch(`${API}/flights/?limit=50`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const flightsData = await flightsRes.json();
        setFlights(flightsData.flights || []);
      }
    } catch (error) {
      console.error("Error updating flight status:", error);
    }
  };

  const updateBookingStatus = async (bookingRef, newStatus) => {
    try {
      await fetch(`${API}/staff/bookings/${bookingRef}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      // Refresh bookings data
      const bookingsRes = await fetch(`${API}/staff/bookings/search?limit=50`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const bookingsData = await bookingsRes.json();
      setBookings(bookingsData.bookings || []);
    } catch (error) {
      console.error("Error updating booking status:", error);
    }
  };

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="prof-spinner" />
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="profile-error">
        <h2>Unable to Load Dashboard</h2>
        <p>{error || "Unable to load dashboard data. Please try refreshing the page."}</p>
        <button onClick={() => window.location.reload()} className="btn-primary">
          Refresh Page
        </button>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-inner profile-inner--wide">
        {/* Dashboard Header */}
        <div className="profile-header">
          <div className="profile-avatar profile-avatar--staff">
            {user.full_name.charAt(0).toUpperCase()}
          </div>
          <div className="profile-info">
            <h1 className="profile-name">{user.full_name}</h1>
            <p className="profile-email">{user.email}</p>
            <div className="profile-meta">
              <span className="profile-badge profile-badge--staff">
                {user.role.replace('_', ' ').toUpperCase()}
              </span>
              {user.employee_id && (
                <span className="employee-id">ID: {user.employee_id}</span>
              )}
            </div>
          </div>
        </div>

        {/* Dashboard Tabs */}
        <div className="profile-tabs">
          {[
            { key: "dashboard", label: "Dashboard", icon: "📊" },
            { key: "flights", label: "Flight Management", icon: "✈️" },
            { key: "bookings", label: "Booking Admin", icon: "📋" },
            { key: "crew", label: "Crew Management", icon: "👥" },
            { key: "aircraft", label: "Aircraft Inventory", icon: "🛩️" },
            { key: "reports", label: "Reports & Analytics", icon: "📈" },
            ...(user.role === 'admin' ? [{ key: "users", label: "User Management", icon: "👤" }] : [])
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
          {activeTab === "dashboard" && (
            <DashboardTab stats={dashboardStats} recentBookings={bookings.slice(0, 5)} />
          )}

          {activeTab === "flights" && (
            <FlightsTab flights={flights} onStatusUpdate={updateFlightStatus} />
          )}

          {activeTab === "bookings" && (
            <BookingsTab bookings={bookings} onStatusUpdate={updateBookingStatus} />
          )}

          {activeTab === "crew" && (
            <CrewTab crew={crew} />
          )}

          {activeTab === "aircraft" && (
            <AircraftTab aircraft={aircraft} />
          )}

          {activeTab === "reports" && (
            <ReportsTab />
          )}

          {activeTab === "users" && user.role === 'admin' && (
            <UsersTab users={users} />
          )}
        </div>
      </div>
    </div>
  );
}

// Dashboard Tab Component
function DashboardTab({ stats, recentBookings }) {
  if (!stats) return <div>Loading dashboard...</div>;

  return (
    <div className="dashboard-overview">
      {/* Key Metrics */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-value">{stats.total_bookings}</div>
            <div className="stat-label">Total Bookings</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <div className="stat-value">${stats.total_revenue.toLocaleString()}</div>
            <div className="stat-label">Total Revenue</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">✈️</div>
          <div className="stat-content">
            <div className="stat-value">{stats.active_flights}</div>
            <div className="stat-label">Active Flights</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <div className="stat-value">{stats.staff_count}</div>
            <div className="stat-label">Staff Members</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🟢</div>
          <div className="stat-content">
            <div className="stat-value">{stats.available_seats}</div>
            <div className="stat-label">Available Seats</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📈</div>
          <div className="stat-content">
            <div className="stat-value">${stats.today_revenue.toLocaleString()}</div>
            <div className="stat-label">Today's Revenue</div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="dashboard-section">
        <h3>Recent Bookings</h3>
        <div className="activity-list">
          {recentBookings.map(booking => (
            <div key={booking.id} className="activity-item">
              <div className="activity-icon">🎫</div>
              <div className="activity-content">
                <div className="activity-title">
                  Booking {booking.booking_ref} - {booking.passenger_name}
                </div>
                <div className="activity-meta">
                  {booking.flight_number} • {booking.route} • {new Date(booking.created_at).toLocaleDateString()}
                </div>
              </div>
              <div className={`activity-status status-${booking.status}`}>
                {booking.status}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="dashboard-section">
        <h3>Quick Actions</h3>
        <div className="quick-actions">
          <button className="action-btn primary">Add New Flight</button>
          <button className="action-btn secondary">Generate Report</button>
          <button className="action-btn secondary">Send Notification</button>
        </div>
      </div>
    </div>
  );
}

// Flights Tab Component
function FlightsTab({ flights, onStatusUpdate }) {
  return (
    <div className="flights-management">
      <div className="section-header">
        <h3>Flight Management</h3>
        <button className="btn-primary">Add New Flight</button>
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Flight Number</th>
              <th>Route</th>
              <th>Departure</th>
              <th>Aircraft</th>
              <th>Seats</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {flights.map(flight => (
              <tr key={flight.id}>
                <td><strong>{flight.flight_number}</strong></td>
                <td>{flight.origin_code} → {flight.destination_code}</td>
                <td>{new Date(flight.departure_time).toLocaleString()}</td>
                <td>{flight.aircraft_type || 'N/A'}</td>
                <td>{flight.seats_available}/{flight.total_seats}</td>
                <td>
                  <select
                    value={flight.status}
                    onChange={(e) => onStatusUpdate(flight.id, e.target.value)}
                    className="status-select"
                  >
                    <option value="Scheduled">Scheduled</option>
                    <option value="Boarding">Boarding</option>
                    <option value="Departed">Departed</option>
                    <option value="Arrived">Arrived</option>
                    <option value="Cancelled">Cancelled</option>
                    <option value="Delayed">Delayed</option>
                  </select>
                </td>
                <td>
                  <button className="btn-sm">Edit</button>
                  <button className="btn-sm danger">Cancel</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Bookings Tab Component
function BookingsTab({ bookings, onStatusUpdate }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = !searchQuery ||
      booking.booking_ref.toLowerCase().includes(searchQuery.toLowerCase()) ||
      booking.passenger_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (booking.flight_number && booking.flight_number.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = statusFilter === "all" || booking.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="bookings-management">
      <div className="section-header">
        <h3>Booking Administration</h3>
        <div className="filters">
          <input
            type="text"
            placeholder="Search bookings..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
            <option value="refunded">Refunded</option>
          </select>
        </div>
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Booking Ref</th>
              <th>Passenger</th>
              <th>Flight</th>
              <th>Route</th>
              <th>Status</th>
              <th>Revenue</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredBookings.map(booking => (
              <tr key={booking.id}>
                <td><strong>{booking.booking_ref}</strong></td>
                <td>{booking.passenger_name}</td>
                <td>{booking.flight_number}</td>
                <td>{booking.route}</td>
                <td>
                  <select
                    value={booking.status}
                    onChange={(e) => onStatusUpdate(booking.booking_ref, e.target.value)}
                    className="status-select"
                  >
                    <option value="pending">Pending</option>
                    <option value="confirmed">Confirmed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="refunded">Refunded</option>
                  </select>
                </td>
                <td>${booking.total_price}</td>
                <td>
                  <button className="btn-sm">View Details</button>
                  <button className="btn-sm">Contact</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Crew Tab Component
function CrewTab({ crew }) {
  return (
    <div className="crew-management">
      <div className="section-header">
        <h3>Crew Management</h3>
        <button className="btn-primary">Add Crew Member</button>
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Employee ID</th>
              <th>Name</th>
              <th>Role</th>
              <th>Base Location</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {crew.map(member => (
              <tr key={member.id}>
                <td><strong>{member.employee_id}</strong></td>
                <td>{member.name}</td>
                <td>{member.role}</td>
                <td>{member.base_location || 'N/A'}</td>
                <td>
                  <span className={`status-badge ${member.is_active ? 'active' : 'inactive'}`}>
                    {member.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <button className="btn-sm">Edit</button>
                  <button className="btn-sm">Assign Flight</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Aircraft Tab Component
function AircraftTab({ aircraft }) {
  return (
    <div className="aircraft-management">
      <div className="section-header">
        <h3>Aircraft Inventory</h3>
        <button className="btn-primary">Add Aircraft</button>
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Registration</th>
              <th>Type</th>
              <th>Model</th>
              <th>Capacity</th>
              <th>Status</th>
              <th>Last Maintenance</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {aircraft.map(plane => (
              <tr key={plane.id}>
                <td><strong>{plane.registration_number}</strong></td>
                <td>{plane.aircraft_type}</td>
                <td>{plane.model}</td>
                <td>{plane.total_seats}</td>
                <td>
                  <span className={`status-badge ${plane.status}`}>
                    {plane.status}
                  </span>
                </td>
                <td>{plane.last_maintenance ? new Date(plane.last_maintenance).toLocaleDateString() : 'N/A'}</td>
                <td>
                  <button className="btn-sm">Edit</button>
                  <button className="btn-sm">Maintenance</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Reports Tab Component
function ReportsTab() {
  const [reportType, setReportType] = useState("revenue");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reportData, setReportData] = useState(null);

  const generateReport = async () => {
    if (!startDate || !endDate) return;

    try {
      const token = localStorage.getItem("skylink_token");
      const response = await fetch(`${API}/staff/reports/${reportType}?start_date=${startDate}&end_date=${endDate}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setReportData(data);
      }
    } catch (error) {
      console.error("Error generating report:", error);
    }
  };

  return (
    <div className="reports-section">
      <div className="section-header">
        <h3>Reports & Analytics</h3>
        <div className="report-controls">
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
            className="report-select"
          >
            <option value="revenue">Revenue Report</option>
            <option value="flights">Flight Performance</option>
          </select>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            placeholder="Start Date"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            placeholder="End Date"
          />
          <button onClick={generateReport} className="btn-primary">Generate Report</button>
        </div>
      </div>

      {reportData && (
        <div className="report-results">
          <div className="report-summary">
            <h4>Report Summary</h4>
            {reportType === "revenue" && reportData.summary && (
              <div className="summary-stats">
                <div className="stat">Total Bookings: {reportData.summary.total_bookings}</div>
                <div className="stat">Total Revenue: ${reportData.summary.total_revenue}</div>
                <div className="stat">Avg Booking Value: ${reportData.summary.avg_booking_value}</div>
              </div>
            )}
          </div>

          {reportData.daily_breakdown && (
            <div className="report-table">
              <h4>Daily Breakdown</h4>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Bookings</th>
                    <th>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.daily_breakdown.map((day, index) => (
                    <tr key={index}>
                      <td>{day.date}</td>
                      <td>{day.bookings}</td>
                      <td>${day.revenue}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Users Tab Component (Admin Only)
function UsersTab({ users }) {
  return (
    <div className="users-management">
      <div className="section-header">
        <h3>User Management</h3>
      </div>

      <div className="data-table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td>{user.id}</td>
                <td>{user.full_name}</td>
                <td>{user.email}</td>
                <td>
                  <span className={`role-badge ${user.role}`}>
                    {user.role}
                  </span>
                </td>
                <td>
                  <span className={`status-badge ${user.is_active ? 'active' : 'inactive'}`}>
                    {user.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>{new Date(user.created_at).toLocaleDateString()}</td>
                <td>
                  <button className="btn-sm">Edit</button>
                  <button className="btn-sm">Change Role</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default StaffDashboard;