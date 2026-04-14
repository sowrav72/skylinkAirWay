import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '', full_name: '', password: '', role: 'passenger', staff_id: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.role === 'staff' && !formData.staff_id) {
      alert("Staff ID is required for staff registration");
      return;
    }
    
    try {
      await api.post('/register', formData);
      alert("Registration Successful. Please Login.");
      navigate('/login');
    } catch (err) {
      alert("Registration Failed: " + (err.response?.data?.detail || "Unknown error"));
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-8 bg-white rounded-xl shadow-lg border">
      <h2 className="text-2xl font-bold text-center mb-6">Create an Account</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input 
          type="text" placeholder="Full Name" required
          className="w-full p-3 border rounded-lg focus:ring-2 outline-none"
          onChange={(e) => setFormData({...formData, full_name: e.target.value})} 
        />
        <input 
          type="email" placeholder="Email" required
          className="w-full p-3 border rounded-lg focus:ring-2 outline-none"
          onChange={(e) => setFormData({...formData, email: e.target.value})} 
        />
        <input 
          type="password" placeholder="Password" required
          className="w-full p-3 border rounded-lg focus:ring-2 outline-none"
          onChange={(e) => setFormData({...formData, password: e.target.value})} 
        />
        
        <select 
          value={formData.role} 
          onChange={(e) => setFormData({...formData, role: e.target.value})}
          className="w-full p-3 border rounded-lg focus:ring-2 outline-none bg-white"
        >
          <option value="passenger">Passenger</option>
          <option value="staff">Airline Staff</option>
        </select>

        {formData.role === 'staff' && (
          <div className="animate-slide-down">
            <label className="text-sm font-semibold text-gray-600">Staff Employee ID</label>
            <input 
              type="text" placeholder="Enter your 8-digit Staff ID" required 
              className="w-full p-3 border border-green-500 rounded-lg focus:ring-2 ring-green-200 outline-none"
              onChange={(e) => setFormData({...formData, staff_id: e.target.value})} 
            />
          </div>
        )}

        <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition">
          Register
        </button>
      </form>
    </div>
  );
};

export default Register;