import React, { useEffect, useState, memo } from "react";

const SpinnerSearchIndicator = memo(function SpinnerSearchIndicator({ searching }) {
  const cities = ["New York", "London", "Tokyo", "Dubai", "Paris", "Sydney", "Singapore", "Bangkok"];
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (!searching) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % cities.length), 200);
    return () => clearInterval(t);
  }, [searching, cities.length]);

  if (!searching) return null;

  return (
    <div className="spinner-search-wrap">
      <div className="spinner-drum">
        <div className="spinner-plane">✈</div>
        <div className="spinner-city">{cities[idx]}</div>
      </div>
      <span className="spinner-label">Searching flights...</span>
    </div>
  );
});

export default SpinnerSearchIndicator;