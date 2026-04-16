import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Search, SlidersHorizontal, Plane, ChevronDown } from 'lucide-react'
import api from '../utils/api'
import FlightCard from '../components/flights/FlightCard'
import SearchForm from '../components/flights/SearchForm'
import { SkeletonList } from '../components/common/Skeleton'

const STATUS_FILTERS = ['ALL', 'ON_TIME', 'DELAYED', 'CANCELLED']

export default function FlightResultsPage() {
  const [searchParams] = useSearchParams()
  const [flights, setFlights] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [sortBy, setSortBy] = useState('departure')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    setLoading(true)
    const params = {}
    if (searchParams.get('origin')) params.origin = searchParams.get('origin')
    if (searchParams.get('destination')) params.destination = searchParams.get('destination')
    if (searchParams.get('date')) params.date = searchParams.get('date')

    api.get('/api/flights', { params })
      .then(r => setFlights(r.data))
      .catch(() => setFlights([]))
      .finally(() => setLoading(false))
  }, [searchParams.toString()])

  const filtered = flights
    .filter(f => statusFilter === 'ALL' || f.status === statusFilter)
    .sort((a, b) => {
      if (sortBy === 'price') return Number(a.price) - Number(b.price)
      if (sortBy === 'price_desc') return Number(b.price) - Number(a.price)
      return new Date(a.departureTime) - new Date(b.departureTime)
    })

  const hasQuery = searchParams.get('origin') || searchParams.get('destination') || searchParams.get('date')

  return (
    <div className="min-h-screen pt-20">
      {/* Search Header */}
      <div className="bg-navy-900/60 backdrop-blur-xl border-b border-white/8 py-8 px-4">
        <div className="max-w-6xl mx-auto">
          <SearchForm compact />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10">
        {/* Results header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display text-2xl text-white font-light">
              {hasQuery ? 'Search Results' : 'All Flights'}
            </h1>
            {!loading && (
              <p className="text-white/40 text-sm font-body mt-1">
                {filtered.length} flight{filtered.length !== 1 ? 's' : ''} found
                {hasQuery && searchParams.get('origin') && searchParams.get('destination') && (
                  <span> · {searchParams.get('origin')} → {searchParams.get('destination')}</span>
                )}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Sort */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="input-field py-2 pr-8 pl-3 text-sm appearance-none cursor-pointer"
                style={{ colorScheme: 'dark' }}
              >
                <option value="departure">Sort: Departure</option>
                <option value="price">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40 pointer-events-none" />
            </div>

            {/* Filter toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={"flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-body transition-all " + (showFilters ? 'border-gold-500 text-gold-400 bg-gold-500/10' : 'border-white/15 text-white/60 hover:border-white/30')}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
            </button>
          </div>
        </div>

        {/* Status filters */}
        {showFilters && (
          <div className="card-navy p-5 mb-6 animate-fade-in">
            <p className="text-xs text-white/40 uppercase tracking-widest font-body mb-3">Filter by Status</p>
            <div className="flex flex-wrap gap-2">
              {STATUS_FILTERS.map(s => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={"px-4 py-1.5 rounded-lg text-sm font-body border transition-all " + (statusFilter === s ? 'bg-gold-500 border-gold-400 text-navy-950 font-medium' : 'border-white/15 text-white/50 hover:border-white/30 hover:text-white')}
                >
                  {s === 'ON_TIME' ? 'On Time' : s === 'ALL' ? 'All Status' : s.charAt(0) + s.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {loading ? (
          <SkeletonList count={4} />
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 rounded-2xl bg-navy-800/60 border border-white/10 flex items-center justify-center mx-auto mb-5">
              <Plane className="w-10 h-10 text-white/20" strokeWidth={1} />
            </div>
            <h3 className="font-display text-xl text-white/60 mb-2">No Flights Found</h3>
            <p className="text-white/30 font-body text-sm mb-6">Try adjusting your search or removing filters</p>
            <Link to="/flights" className="btn-outline-gold py-2.5 px-6">Browse All Flights</Link>
          </div>
        ) : (
          <div className="grid gap-4">
            {filtered.map((f, i) => (
              <div key={f.id} className="opacity-0 animate-fade-up" style={{ animationDelay: `${i * 0.06}s`, animationFillMode: 'forwards' }}>
                <FlightCard flight={f} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
