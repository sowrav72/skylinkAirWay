import React, { useState, useRef, useEffect, memo } from "react";

const AirportDropdown = memo(function AirportDropdown({ label, value, onChange, airports, placeholder }) {
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
      <label htmlFor={`airport-dropdown-${label.toLowerCase().replace(/\s+/g, '-')}`}>{label}</label>
      <div
        id={`airport-dropdown-${label.toLowerCase().replace(/\s+/g, '-')}`}
        className={`dd-trigger${open ? " open" : ""}`}
        onClick={() => setOpen(!open)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen(!open);
          } else if (e.key === 'Escape' && open) {
            setOpen(false);
          }
        }}
        tabIndex={0}
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-describedby={`airport-dropdown-${label.toLowerCase().replace(/\s+/g, '-')}-help`}
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
        <div className="dd-panel" role="listbox" aria-label={`${label} options`}>
          <div className="dd-search-wrap">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#5a7a9e" strokeWidth="2" aria-hidden="true">
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
              aria-label="Search airports"
              aria-describedby={`airport-dropdown-${label.toLowerCase().replace(/\s+/g, '-')}-help`}
            />
          </div>
          <div className="dd-list" role="group" aria-label="Airport options">
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
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onChange(a.code);
                      setQuery("");
                      setOpen(false);
                    }
                  }}
                  tabIndex={0}
                  role="option"
                  aria-selected={a.code === value}
                  aria-label={`${a.city} (${a.code}) - ${a.country}`}
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
});

export default AirportDropdown;