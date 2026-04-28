'use strict';

const CITY_COORDS = {
  'New York': [40.7128, -74.0060],
  'Los Angeles': [34.0522, -118.2437],
  'Chicago': [41.8781, -87.6298],
  'San Francisco': [37.7749, -122.4194],
  'Miami': [25.7617, -80.1918],
  'Dallas': [32.7767, -96.7970],
  'Atlanta': [33.7490, -84.3880],
  'Seattle': [47.6062, -122.3321],
  'Denver': [39.7392, -104.9903],
  'Boston': [42.3601, -71.0589],
  'Houston': [29.7604, -95.3698],
  'Toronto': [43.6532, -79.3832],
  'Vancouver': [49.2827, -123.1207],
  'London': [51.5072, -0.1276],
  'Paris': [48.8566, 2.3522],
  'Amsterdam': [52.3676, 4.9041],
  'Frankfurt': [50.1109, 8.6821],
  'Madrid': [40.4168, -3.7038],
  'Barcelona': [41.3874, 2.1686],
  'Rome': [41.9028, 12.4964],
  'Dubai': [25.2048, 55.2708],
  'Doha': [25.2854, 51.5310],
  'Cairo': [30.0444, 31.2357],
  'Johannesburg': [-26.2041, 28.0473],
  'Singapore': [1.3521, 103.8198],
  'Tokyo': [35.6762, 139.6503],
  'Seoul': [37.5665, 126.9780],
  'Beijing': [39.9042, 116.4074],
  'Shanghai': [31.2304, 121.4737],
  'Hong Kong': [22.3193, 114.1694],
  'Bangkok': [13.7563, 100.5018],
  'Kuala Lumpur': [3.1390, 101.6869],
  'Jakarta': [-6.2088, 106.8456],
  'Manila': [14.5995, 120.9842],
  'Taipei': [25.0330, 121.5654],
  'Mumbai': [19.0760, 72.8777],
  'Delhi': [28.6139, 77.2090],
  'Bangalore': [12.9716, 77.5946],
  'Dhaka': [23.8103, 90.4125],
  'Colombo': [6.9271, 79.8612],
  'Kathmandu': [27.7172, 85.3240],
  'Karachi': [24.8607, 67.0011],
  'Lahore': [31.5204, 74.3587],
  'Sydney': [-33.8688, 151.2093],
  'Melbourne': [-37.8136, 144.9631],
  'Auckland': [-36.8509, 174.7645]
};

const MEAL_SURCHARGES = {
  standard: 0,
  vegetarian: 12,
  vegan: 15,
  kosher: 18,
  halal: 10,
  gluten_free: 15,
  premium: 24
};

const BAGGAGE_RATE_PER_KG = 8;

function normaliseMealPreference(mealPreference) {
  return String(mealPreference || 'standard').trim().toLowerCase() || 'standard';
}

function calculateAddOnTotal({ mealPreference, extraBaggageKg }) {
  const mealKey = normaliseMealPreference(mealPreference);
  const baggageKg = Math.max(parseInt(extraBaggageKg || 0, 10) || 0, 0);
  const mealCharge = MEAL_SURCHARGES[mealKey] || 0;
  const baggageCharge = baggageKg * BAGGAGE_RATE_PER_KG;

  return {
    mealPreference: mealKey,
    extraBaggageKg: baggageKg,
    mealCharge,
    baggageCharge,
    addOnTotal: Number((mealCharge + baggageCharge).toFixed(2))
  };
}

function tierFromPoints(points) {
  const total = Number(points || 0);
  if (total >= 20000) return 'Platinum';
  if (total >= 10000) return 'Gold';
  if (total >= 3000) return 'Silver';
  return 'Explorer';
}

function badgesFromSummary(summary) {
  const badges = [];
  if ((summary.completedTrips || 0) >= 1) {
    badges.push({ id: 'first_trip', label: 'First Trip', tone: 'blue' });
  }
  if ((summary.completedTrips || 0) >= 5) {
    badges.push({ id: 'frequent_flyer', label: 'Frequent Flyer', tone: 'green' });
  }
  if ((summary.totalMiles || 0) >= 10000) {
    badges.push({ id: 'distance_club', label: '10k Mile Club', tone: 'amber' });
  }
  if ((summary.totalSpend || 0) >= 5000) {
    badges.push({ id: 'premium_spender', label: 'Premium Spender', tone: 'red' });
  }
  return badges;
}

function toRad(value) {
  return (value * Math.PI) / 180;
}

function estimateRouteMiles(origin, destination) {
  const from = CITY_COORDS[origin];
  const to = CITY_COORDS[destination];

  if (!from || !to) return 0;

  const [lat1, lon1] = from;
  const [lat2, lon2] = to;
  const earthRadiusMiles = 3958.8;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(earthRadiusMiles * c);
}

module.exports = {
  MEAL_SURCHARGES,
  BAGGAGE_RATE_PER_KG,
  normaliseMealPreference,
  calculateAddOnTotal,
  tierFromPoints,
  badgesFromSummary,
  estimateRouteMiles
};
