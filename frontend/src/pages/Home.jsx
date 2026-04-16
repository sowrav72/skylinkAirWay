import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Home = () => {
  const [search, setSearch] = useState({
    origin: '',
    destination: '',
    date: '',
  });
  const navigate = useNavigate();

  const handleChange = (e) => {
    setSearch({ ...search, [e.target.name]: e.target.value });
  };

  const handleSearch = (e) => {
    e.preventDefault();
    navigate(`/search?origin=${search.origin}&destination=${search.destination}&date=${search.date}`);
  };

  return (
    <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">
            Welcome to Skylink Airways
          </h1>
          <p className="text-xl mb-8">
            Book your next flight with ease
          </p>
          <form onSubmit={handleSearch} className="max-w-md mx-auto bg-white rounded-lg p-6 shadow-lg">
            <div className="mb-4">
              <input
                type="text"
                name="origin"
                placeholder="Origin"
                value={search.origin}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                required
              />
            </div>
            <div className="mb-4">
              <input
                type="text"
                name="destination"
                placeholder="Destination"
                value={search.destination}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                required
              />
            </div>
            <div className="mb-4">
              <input
                type="date"
                name="date"
                value={search.date}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600"
            >
              Search Flights
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Home;