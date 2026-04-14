import React from 'react';
import { useAuth } from '../AuthContext';
import { Navigate } from 'react-router-dom';

const StaffDashboard = () => {
  const { user } = useAuth();

  // Security Check: Kick out anyone who isn't staff
  if (!user || user.role !== 'staff') {
    return <Navigate to="/" />;
  }

  return (
    <div className="max-w-6xl mx-auto p-8 mt-10">
      <div className="bg-white rounded-2xl shadow-sm border p-6 mb-8 flex justify-between items-center border-l-4 border-l-green-500">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Staff Portal</h1>
          <p className="text-gray-500 mt-1">Welcome back, {user.full_name}.</p>
        </div>
        <div className="bg-green-100 text-green-800 px-4 py-2 rounded-lg font-bold">
          ID: {user.staff_id || 'VERIFIED'}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition cursor-pointer">
          <span className="material-icons text-blue-500 text-4xl mb-4">airplane_ticket</span>
          <h3 className="text-xl font-bold">Manage Check-ins</h3>
          <p className="text-gray-500 text-sm mt-2">Process passengers for today's departures.</p>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition cursor-pointer">
          <span className="material-icons text-purple-500 text-4xl mb-4">flight_takeoff</span>
          <h3 className="text-xl font-bold">Flight Status</h3>
          <p className="text-gray-500 text-sm mt-2">Update boarding and departure times.</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border hover:shadow-md transition cursor-pointer">
          <span className="material-icons text-red-500 text-4xl mb-4">support_agent</span>
          <h3 className="text-xl font-bold">Passenger Support</h3>
          <p className="text-gray-500 text-sm mt-2">Handle special requests and seat changes.</p>
        </div>
      </div>
    </div>
  );
};

export default StaffDashboard;