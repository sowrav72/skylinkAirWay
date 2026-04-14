import React, { useState, memo } from "react";
import BookingModal from "./BookingModal";
import SpinnerSearchIndicator from "./SpinnerSearchIndicator";
import LoadingSkeleton from "./LoadingSkeleton";

const FlightResults = memo(function FlightResults({ results, loading, passengers, searching }) {
  const [selected, setSelected] = useState(null);

  if (loading)
    return (
      <div className="results-wrap">
        {searching && <SpinnerSearchIndicator searching={searching} />}
        <div className="results-header">
          <LoadingSkeleton variant="text" style={{ width: "200px", height: "20px" }} />
        </div>
        <div className="results-list">
          {[...Array(3)].map((_, index) => (
            <div className="result-card" key={index}>
              <div className="rc-route">
                <LoadingSkeleton variant="circle" style={{ width: "60px", height: "60px" }} />
                <LoadingSkeleton variant="text" style={{ width: "20px", height: "20px", margin: "0 10px" }} />
                <LoadingSkeleton variant="circle" style={{ width: "60px", height: "60px" }} />
              </div>
              <div className="rc-details">
                {[...Array(5)].map((_, i) => (
                  <div className="rc-detail" key={i}>
                    <LoadingSkeleton variant="text" style={{ width: "60px", height: "12px", marginBottom: "4px" }} />
                    <LoadingSkeleton variant="text" style={{ width: "120px", height: "14px" }} />
                  </div>
                ))}
              </div>
              <div className="rc-price">
                <LoadingSkeleton variant="text" style={{ width: "80px", height: "24px", marginBottom: "8px" }} />
                <LoadingSkeleton variant="text" style={{ width: "60px", height: "12px", marginBottom: "12px" }} />
                <LoadingSkeleton variant="text" style={{ width: "100px", height: "36px", borderRadius: "6px" }} />
              </div>
            </div>
          ))}
        </div>
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
        <div className="results-list" role="list" aria-label="Flight search results">
          {results.map((f) => (
            <div className="result-card" key={f.id} role="listitem" aria-label={`Flight from ${f.origin_code} to ${f.destination_code}`}>
              <div className="rc-route" aria-label="Flight route">
                <span className="rc-code" aria-label={`Origin airport: ${f.origin_code}`}>{f.origin_code}</span>
                <div className="rc-arrow" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1877f2" strokeWidth="2">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </div>
                <span className="rc-code" aria-label={`Destination airport: ${f.destination_code}`}>{f.destination_code}</span>
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
                <button
                  className="rc-btn"
                  onClick={() => setSelected(f)}
                  aria-label={`Select flight ${f.flight_number} from ${f.origin_code} to ${f.destination_code} for $${Number(f.base_price).toLocaleString()}`}
                >
                  Select
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
});

export default FlightResults;