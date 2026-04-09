import React, { useEffect, useState } from "react";

export default function App() {
  const [health, setHealth] = useState("loading...");

  useEffect(() => {
    const apiUrl = process.env.REACT_APP_API_URL || "http://localhost:8000";

    fetch(`${apiUrl}/health`)
      .then((res) => res.json())
      .then((data) => setHealth(data.status))
      .catch(() => setHealth("unreachable"));
  }, []);

  return (
    <main style={{ fontFamily: "sans-serif", maxWidth: 700, margin: "48px auto" }}>
      <h1>SkyLink AirWay</h1>
      <p>React frontend is running.</p>
      <p>
        Backend health: <strong>{health}</strong>
      </p>
    </main>
  );
}
