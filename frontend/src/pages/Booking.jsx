import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';

const Booking = () => {
  const { flightId } = useParams();
  const [flight, setFlight] = useState(null);
  const [seats, setSeats] = useState([]);
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [flightRes, seatsRes] = await Promise.all([
          axios.get(`/api/flights/${flightId}`),
          axios.get(`/api/seats/${flightId}`)
        ]);
        setFlight(flightRes.data);
        setSeats(seatsRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [flightId]);

  const handleBook = async () => {
    if (!selectedSeat) return;
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/bookings', {
        flightId: parseInt(flightId),
        seatNo: selectedSeat
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      navigate('/my-bookings');
    } catch (err) {
      alert('Booking failed');
    }
  };

  if (loading) return <div className="text-center mt-10">Loading...</div>;

  const availableSeats = seats.filter(seat => seat.available);
  const bookedSeats = seats.filter(seat => !seat.available);

  return (
    <div className="max-w-4xl mx-auto mt-10 px-4">
      <h2 className="text-2xl font-bold mb-4">Book Flight</h2>
      {flight && (
        <div className="bg-white p-4 rounded-lg shadow-md mb-6">
          <p className="text-lg font-semibold">
            {flight.origin} to {flight.destination}
          </p>
          <p>Departure: {new Date(flight.departure_time).toLocaleString()}</p>
          <p>Price: ${flight.price}</p>
        </div>
      )}
      <h3 className="text-xl font-bold mb-4">Select Seat</h3>
      <div className="grid grid-cols-6 gap-2 mb-6">
        {Array.from({ length: flight?.total_seats || 60 }, (_, i) => {
          const seatNo = `${String.fromCharCode(65 + Math.floor(i / 6))}${i % 6 + 1}`;
          const isBooked = bookedSeats.some(seat => seat.seatNo === seatNo);
          const isSelected = selectedSeat === seatNo;
          return (
            <button
              key={seatNo}
              onClick={() => !isBooked && setSelectedSeat(seatNo)}
              className={`p-2 border rounded ${
                isBooked ? 'bg-red-500 text-white cursor-not-allowed' :
                isSelected ? 'bg-blue-500 text-white' : 'bg-green-500 text-white hover:bg-green-600'
              }`}
              disabled={isBooked}
            >
              {seatNo}
            </button>
          );
        })}
      </div>
      <button
        onClick={handleBook}
        disabled={!selectedSeat}
        className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
      >
        Confirm Booking
      </button>
    </div>
  );
};

export default Booking;