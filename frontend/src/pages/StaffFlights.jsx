import { useState, useEffect } from 'react';
import axios from 'axios';

const StaffFlights = () => {
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFlights = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('/api/flights/staff/assigned', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setFlights(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchFlights();
  }, []);

  const updateStatus = async (id, status) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(`/api/flights/${id}`, { status }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFlights(flights.map(f => f.id === id ? { ...f, status } : f));
    } catch (err) {
      alert('Update failed');
    }
  };

  if (loading) return <div className="text-center mt-10">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto mt-10 px-4">
      <h2 className="text-2xl font-bold mb-4">Assigned Flights</h2>
      {flights.length === 0 ? (
        <p>No assigned flights.</p>
      ) : (
        <div className="space-y-4">
          {flights.map((flight) => (
            <div key={flight.id} className="bg-white p-4 rounded-lg shadow-md">
              <p className="text-lg font-semibold">
                {flight.origin} to {flight.destination}
              </p>
              <p>Departure: {new Date(flight.departure_time).toLocaleString()}</p>
              <p>Current Status: {flight.status}</p>
              <div className="mt-4 space-x-2">
                <button
                  onClick={() => updateStatus(flight.id, 'ON_TIME')}
                  className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                >
                  On Time
                </button>
                <button
                  onClick={() => updateStatus(flight.id, 'DELAYED')}
                  className="bg-yellow-500 text-white px-3 py-1 rounded hover:bg-yellow-600"
                >
                  Delayed
                </button>
                <button
                  onClick={() => updateStatus(flight.id, 'CANCELLED')}
                  className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                >
                  Cancelled
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StaffFlights;