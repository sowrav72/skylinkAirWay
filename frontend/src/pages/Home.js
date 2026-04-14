import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api'; // Adjust path if needed

const Home = () => {
  const navigate = useNavigate();
  const [airports, setAirports] = useState([]);
  const [search, setSearch] = useState({ origin: '', destination: '' });

  useEffect(() => {
    // Fetch airports for the spinner-style dropdowns
    api.get('/airports').then(res => setAirports(res.data)).catch(() => console.error("Failed to fetch airports"));
  }, []);

  const handleSearch = () => {
    if (!search.origin || !search.destination) {
      alert("Please select both origin and destination.");
      return;
    }
    navigate(`/search?from=${search.origin}&to=${search.destination}`);
  };

  return (
    <div className="space-y-16 pb-16">
      {/* HERO SECTION & QUICK SEARCH */}
      <div className="relative h-[500px] bg-blue-600 flex items-center justify-center text-white">
        <div className="absolute inset-0 bg-black/30"></div>
        <div className="relative z-10 w-full max-w-4xl px-4 text-center">
          <h1 className="text-5xl font-bold mb-6">Explore the World with Skylink</h1>
          
          <div className="bg-white p-4 rounded-xl shadow-2xl flex flex-col md:flex-row gap-4 items-end text-left">
            <div className="flex-1 w-full">
              <label className="text-xs font-bold text-gray-500 uppercase">From</label>
              <select 
                className="w-full p-3 bg-gray-50 border rounded-lg text-gray-800 outline-none"
                value={search.origin}
                onChange={(e) => setSearch({...search, origin: e.target.value})}
              >
                <option value="">Select Origin</option>
                {airports.map(ap => <option key={ap.id} value={ap.code}>{ap.city} ({ap.code})</option>)}
              </select>
            </div>
            
            <div className="flex-1 w-full">
              <label className="text-xs font-bold text-gray-500 uppercase">To</label>
              <select 
                className="w-full p-3 bg-gray-50 border rounded-lg text-gray-800 outline-none"
                value={search.destination}
                onChange={(e) => setSearch({...search, destination: e.target.value})}
              >
                <option value="">Select Destination</option>
                {airports.map(ap => <option key={ap.id} value={ap.code}>{ap.city} ({ap.code})</option>)}
              </select>
            </div>

            <button onClick={handleSearch} className="w-full md:w-auto bg-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700 transition">
              Search Flights
            </button>
          </div>
        </div>
      </div>

      {/* EXCLUSIVE DEALS SECTION */}
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-3xl font-bold mb-6 text-gray-800">Exclusive Deals</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div onClick={() => navigate('/search?deal=summer')} className="bg-orange-100 p-6 rounded-2xl cursor-pointer hover:shadow-lg hover:-translate-y-1 transition">
            <h3 className="text-xl font-bold text-orange-800">Summer Getaways</h3>
            <p className="text-orange-600 mt-2">Up to 20% off on all European flights.</p>
            <span className="inline-block mt-4 text-orange-700 font-bold">Book Now &rarr;</span>
          </div>
          
          <div onClick={() => navigate('/search?deal=business')} className="bg-purple-100 p-6 rounded-2xl cursor-pointer hover:shadow-lg hover:-translate-y-1 transition">
            <h3 className="text-xl font-bold text-purple-800">Business Class Upgrade</h3>
            <p className="text-purple-600 mt-2">Experience luxury for less.</p>
            <span className="inline-block mt-4 text-purple-700 font-bold">Claim Deal &rarr;</span>
          </div>
        </div>
      </div>

      {/* POPULAR DESTINATIONS SECTION */}
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-3xl font-bold mb-6 text-gray-800">Popular Destinations</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { code: 'LHR', city: 'London', img: 'https://images.unsplash.com/photo-1513635269975-5969336cd100?w=500&q=80' },
            { code: 'DXB', city: 'Dubai', img: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=500&q=80' },
            { code: 'NRT', city: 'Tokyo', img: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=500&q=80' }
          ].map((dest) => (
            <div key={dest.code} onClick={() => navigate(`/search?to=${dest.code}`)} className="relative h-64 rounded-xl overflow-hidden cursor-pointer group">
              <img src={dest.img} alt={dest.city} className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition duration-500" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
              <div className="absolute bottom-4 left-4 text-white">
                <h3 className="text-2xl font-bold">{dest.city}</h3>
                <p className="text-sm opacity-90">Flights to {dest.code}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Home;