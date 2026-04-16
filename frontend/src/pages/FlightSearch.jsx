import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import axios from 'axios';

const FlightSearch = () => {
  const [searchParams] = useSearchParams();
  const [flights, setFlights] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFlights = async () => {
      try {
        const origin = searchParams.get('origin');
        const destination = searchParams.get('destination');
        const date = searchParams.get('date');
        const res = await axios.get('/api/flights', {
          params: { origin, destination, date }
        });
        setFlights(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchFlights();
  }, [searchParams]);

  if (loading) return <div className="text-center mt-10">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto mt-10 px-4">
      <h2 className="text-2xl font-bold mb-4">Flight Results</h2>
      {flights.length === 0 ? (
        <p>No flights found.</p>
      ) : (
        <div className="space-y-4">
          {flights.map((flight) => (
            <div key={flight.id} className="bg-white p-4 rounded-lg shadow-md">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-lg font-semibold">
                    {flight.origin} to {flight.destination}
                  </p>
                  <p>Departure: {new Date(flight.departure_time).toLocaleString()}</p>
                  <p>Arrival: {new Date(flight.arrival_time).toLocaleString()}</p>
                  <p>Price: ${flight.price}</p>
                  <p>Status: {flight.status}</p>
                </div>
                <Link
                  to={`/booking/${flight.id}`}
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  Book Now
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FlightSearch;