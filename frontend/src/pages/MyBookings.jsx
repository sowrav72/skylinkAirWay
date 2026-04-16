import { useState, useEffect } from 'react';
import axios from 'axios';

const MyBookings = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBookings = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('/api/bookings/user', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setBookings(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchBookings();
  }, []);

  const handleCancel = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`/api/bookings/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBookings(bookings.filter(b => b.id !== id));
    } catch (err) {
      alert('Cancel failed');
    }
  };

  const handleDownloadTicket = (id) => {
    window.open(`/api/tickets/${id}/download`, '_blank');
  };

  const handleDownloadReceipt = (id) => {
    window.open(`/api/receipts/${id}/download`, '_blank');
  };

  if (loading) return <div className="text-center mt-10">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto mt-10 px-4">
      <h2 className="text-2xl font-bold mb-4">My Bookings</h2>
      {bookings.length === 0 ? (
        <p>No bookings found.</p>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <div key={booking.id} className="bg-white p-4 rounded-lg shadow-md">
              <p>Flight ID: {booking.flightId}</p>
              <p>Seat: {booking.seatNo}</p>
              <p>Status: {booking.status}</p>
              <p>Booked on: {new Date(booking.createdAt).toLocaleDateString()}</p>
              <div className="mt-4 space-x-2">
                <button
                  onClick={() => handleDownloadTicket(booking.id)}
                  className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                >
                  Download Ticket
                </button>
                <button
                  onClick={() => handleDownloadReceipt(booking.id)}
                  className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                >
                  Download Receipt
                </button>
                {booking.status !== 'cancelled' && (
                  <button
                    onClick={() => handleCancel(booking.id)}
                    className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                  >
                    Cancel Booking
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyBookings;