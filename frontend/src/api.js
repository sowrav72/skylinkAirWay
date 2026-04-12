const BASE = process.env.REACT_APP_API_URL || "http://localhost:8000";

function getToken() {
  return localStorage.getItem("authToken") || "";
}

export async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.detail || data.message || "Request failed");
  }
  return data;
}

export const API = {
  post: (path, body)   => apiFetch(path, { method: "POST", body: JSON.stringify(body) }),
  put:  (path, body)   => apiFetch(path, { method: "PUT",  body: JSON.stringify(body) }),
  get:  (path)         => apiFetch(path, { method: "GET" }),
};