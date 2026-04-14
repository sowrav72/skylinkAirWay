import React, { useState, memo } from "react";
import { useNavigate } from "react-router-dom";

const API = process.env.REACT_APP_API_URL || "http://localhost:8000";

const BookingModal = memo(function BookingModal({ flight, passengers, onClose }) {
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
});

export default BookingModal;