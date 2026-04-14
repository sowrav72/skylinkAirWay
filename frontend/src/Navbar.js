import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <nav className="bg-white shadow-md py-4 px-8 flex justify-between items-center sticky top-0 z-50">
      <Link to="/" className="text-2xl font-bold text-blue-600 flex items-center gap-2">
        <span className="material-icons">flight_takeoff</span> SKYLINK
      </Link>

      <div className="flex items-center gap-6">
        <Link to="/" className="hover:text-blue-600 font-medium">Home</Link>
        <Link to="/search" className="hover:text-blue-600 font-medium">Find Flights</Link>
        
        {user ? (
          <>
            {/* Role Indicators */}
            {user.role === 'passenger' && <Link to="/bookings" className="hover:text-blue-600 font-medium">My Bookings</Link>}
            {user.role === 'admin' && <Link to="/admin" className="text-red-600 font-bold border-b-2 border-red-600">Admin Panel</Link>}
            {user.role === 'staff' && <Link to="/staff-dashboard" className="text-green-600 font-bold border-b-2 border-green-600">Staff Portal</Link>}
            
            {/* Profile Dropdown */}
            <div className="group relative flex items-center gap-2 cursor-pointer" onClick={() => setShowDropdown(!showDropdown)}>
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 border-2 border-blue-600">
                <span className="material-icons">{user.role === 'admin' ? 'admin_panel_settings' : 'person'}</span>
              </div>
              
              {showDropdown && (
                <div className="absolute right-0 top-12 bg-white shadow-xl rounded-lg w-48 py-2 border">
                  <Link to="/profile" className="block px-4 py-2 hover:bg-gray-100" onClick={() => setShowDropdown(false)}>My Profile</Link>
                  <button onClick={() => { logout(); setShowDropdown(false); }} className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50">Logout</button>
                </div>
              )}
            </div>
          </>
        ) : (
          <Link to="/login" className="bg-blue-600 text-white px-6 py-2 rounded-full hover:bg-blue-700 transition">Login</Link>
        )}
      </div>
    </nav>
  );
};

export default Navbar;