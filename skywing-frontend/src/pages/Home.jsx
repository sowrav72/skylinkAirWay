/**
 * Home.jsx — Phase 4
 *
 * Features:
 *  1. Public flight search — no login required to search or view results
 *  2. Inline results rendered below the search bar (no page navigation)
 *  3. Autocomplete typeahead on From/To inputs (debounced, static airport data)
 *  4. Booking CTA respects auth: visitor → /register, passenger → /book, staff → none
 *  5. Popular Routes with real Unsplash images + dark overlay
 *  6. Full UX flow per spec: visitor can search freely, only booking is gated
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth }                  from '../contexts/AuthContext'
import { publicSearchFlights, searchFlights } from '../api/client'
import AutocompleteInput            from '../components/AutocompleteInput'
import FlightResultCard             from '../components/FlightResultCard'

const MAX_RESULTS = 20   // FIX 5: cap displayed results

// ─── Star field (memoised — computed once at module load) ─────────────────────
const STARS = Array.from({ length: 80 }, (_, i) => ({
  id: i,
  x:  Math.random() * 100,
  y:  Math.random() * 100,
  r:  Math.random() * 1.5 + 0.3,
  d:  Math.random() * 4 + 2,
  o:  Math.random() * 0.5 + 0.1,
}))

// ─── Popular routes with Unsplash images ─────────────────────────────────────
// Each image is a direct Unsplash photo URL (no API key required for src display)
const ROUTES = [
  {
    from: 'New York',
    to:   'London',
    code: 'JFK → LHR',
    duration: '7h 20m',
    tag:  'Most Popular',
    img:  'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=800&q=80&auto=format&fit=crop',
    // Brooklyn Bridge / NYC skyline
  },
  {
    from: 'Dubai',
    to:   'Singapore',
    code: 'DXB → SIN',
    duration: '7h 10m',
    tag:  'Trending',
    img:  'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&q=80&auto=format&fit=crop',
    // Dubai skyline at night
  },
  {
    from: 'Paris',
    to:   'Tokyo',
    code: 'CDG → NRT',
    duration: '12h 45m',
    tag:  'Long-haul',
    img:  'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&q=80&auto=format&fit=crop',
    // Eiffel Tower Paris
  },
  {
    from: 'Los Angeles',
    to:   'Sydney',
    code: 'LAX → SYD',
    duration: '15h 30m',
    tag:  'Adventure',
    img:  'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=800&q=80&auto=format&fit=crop',
    // Sydney Opera House
  },
  {
    from: 'London',
    to:   'Cape Town',
    code: 'LHR → CPT',
    duration: '11h 15m',
    tag:  'Explorer',
    img:  'https://images.unsplash.com/photo-1580060839134-75a5edca2e99?w=800&q=80&auto=format&fit=crop',
    // Cape Town landscape
  },
  {
    from: 'Bangkok',
    to:   'Tokyo',
    code: 'BKK → NRT',
    duration: '6h 30m',
    tag:  'Asia Special',
    img:  'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=800&q=80&auto=format&fit=crop',
    // Tokyo streets
  },
]

// ─── Features ─────────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: (
      <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10">
        <path d="M24 4L6 16v24h36V16L24 4z" strokeLinejoin="round"/>
        <path d="M16 40V28h16v12"/><circle cx="24" cy="20" r="4"/>
      </svg>
    ),
    title: 'Premium Comfort',
    desc: 'Spacious seating with extra legroom across all cabin classes.',
  },
  {
    icon: (
      <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10">
        <path d="M8 24l10 10 22-20"/><circle cx="24" cy="24" r="20"/>
      </svg>
    ),
    title: 'On-Time Performance',
    desc: 'Industry-leading 98.2% on-time departure rate, every flight.',
  },
  {
    icon: (
      <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10">
        <path d="M24 4c-8 0-14 6-14 14 0 10 14 26 14 26s14-16 14-26c0-8-6-14-14-14z"/>
        <circle cx="24" cy="18" r="4"/>
      </svg>
    ),
    title: '150+ Destinations',
    desc: 'Fly to over 150 cities across 6 continents with SkyWing.',
  },
  {
    icon: (
      <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10">
        <rect x="6" y="10" width="36" height="28" rx="2"/>
        <path d="M6 18h36M16 10v8M32 10v8"/>
        <path d="M14 26h4v4h-4zM22 26h4v4h-4zM30 26h4v4h-4z"/>
      </svg>
    ),
    title: 'Easy Booking',
    desc: 'Book your seat in under 2 minutes, from search to boarding pass.',
  },
]

// ─── Intersection observer hook ───────────────────────────────────────────────
function useInView(threshold = 0.15) {
  const ref = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold }
    )
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [threshold])
  return [ref, visible]
}

// ─── Animated counter ─────────────────────────────────────────────────────────
function useCounter(target, duration = 2000, start = false) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!start) return
    let t0 = null
    const step = (ts) => {
      if (!t0) t0 = ts
      const p = Math.min((ts - t0) / duration, 1)
      const e = 1 - Math.pow(1 - p, 3)
      setCount(Math.floor(e * target))
      if (p < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [start, target, duration])
  return count
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
function PublicNav({ scrolled }) {
  const { token, role } = useAuth()
  const dashLink = role === 'staff' ? '/staff/flights' : '/passenger/flights'

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300
      ${scrolled ? 'bg-[#050A14]/95 backdrop-blur-md border-b border-white/5 py-3' : 'py-5'}`}>
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <div className="w-8 h-8">
            <svg viewBox="0 0 32 32" fill="none" className="w-full h-full">
              <path d="M4 20L16 4l12 16H4z" fill="#1E6FFF" opacity="0.9"/>
              <path d="M8 20l8-10 8 10H8z" fill="#1E6FFF" opacity="0.5"/>
              <path d="M2 24h28" stroke="#C9A84C" strokeWidth="1.5"/>
            </svg>
          </div>
          <span className="font-display text-xl font-bold text-white tracking-wide">
            Sky<span style={{ color: '#C9A84C' }}>Wing</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {['Destinations', 'Experience', 'About'].map(l => (
            <a key={l} href={`#${l.toLowerCase()}`}
              className="text-sm font-body text-white/60 hover:text-white transition-colors duration-200">
              {l}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {token ? (
            <Link to={dashLink}
              className="text-sm font-medium text-white border border-white/20
                         px-4 py-2 hover:border-white/50 hover:bg-white/5 transition-all duration-200">
              Dashboard →
            </Link>
          ) : (
            <>
              <Link to="/login"
                className="text-sm font-medium text-white/70 hover:text-white transition-colors px-3 py-2">
                Sign In
              </Link>
              <Link to="/register"
                className="text-sm font-medium text-[#050A14] px-4 py-2 hover:opacity-90 transition-opacity"
                style={{ background: '#C9A84C' }}>
                Get Started
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Home() {
  const navigate        = useNavigate()
  const { token, role } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()   // FIX 8

  // ── Scroll state ─────────────────────────────────────────────────────────────
  const [scrolled, setScrolled] = useState(false)

  // ── Search form state — initialised from URL params (FIX 8) ──────────────────
  const [from,   setFrom]   = useState(() => searchParams.get('origin')      || '')
  const [to,     setTo]     = useState(() => searchParams.get('destination') || '')
  const [date,   setDate]   = useState(() => searchParams.get('date')        || '')

  // ── Results state ─────────────────────────────────────────────────────────────
  const [results,  setResults]  = useState([])
  const [searched, setSearched] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [searchErr, setSearchErr] = useState('')   // validation / form errors
  const [apiError,  setApiError]  = useState('')   // FIX 1+2: API-level errors, separate state

  // ── Section visibility ────────────────────────────────────────────────────────
  const [statsRef,  statsVisible] = useInView(0.2)
  const [routesRef, routesVisible]= useInView(0.1)
  const [featRef,   featVisible]  = useInView(0.1)
  const resultsRef = useRef(null)

  // ── Counters ──────────────────────────────────────────────────────────────────
  const c1 = useCounter(150, 1800, statsVisible)
  const c2 = useCounter(2,   1800, statsVisible)
  const c3 = useCounter(98,  1800, statsVisible)
  const c4 = useCounter(24,  1800, statsVisible)

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', h, { passive: true })
    return () => window.removeEventListener('scroll', h)
  }, [])

  // FIX 8: auto-run search when page loads with URL params already set
  useEffect(() => {
    const o = searchParams.get('origin')
    const d = searchParams.get('destination')
    if (o && d) {
      handleSearch(null, o, d)
    }
    // Only run on mount — intentionally omit handleSearch from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Search handler ────────────────────────────────────────────────────────────
  // Visitors CAN search — no auth required.
  const handleSearch = useCallback(async (e, prefillFrom, prefillTo) => {
    if (e) e.preventDefault()
    const origin      = (prefillFrom ?? from).trim()
    const destination = (prefillTo   ?? to).trim()

    // Form validation — these are NOT API errors
    if (!origin || !destination) {
      setSearchErr('Please enter both origin and destination.')
      return
    }

    // Clear all states before fetching
    setSearchErr('')
    setApiError('')       // FIX 1: clear API error so states don't overlap
    setLoading(true)
    setSearched(false)
    setResults([])

    // FIX 8: sync search params into URL
    const urlParams = { origin, destination }
    if (date) urlParams.date = date
    setSearchParams(urlParams, { replace: true })

    try {
      const params = { origin, destination, ...(date && { date }) }
      let data = []

      if (token) {
        const res = await searchFlights(params)
        data = res.data.flights ?? []
      } else {
        // FIX 2: propagate error instead of silently returning []
        const res = await publicSearchFlights(params)
        data = res.data.flights ?? []
      }

      setResults(data)
      setSearched(true)
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 80)
    } catch (err) {
      // FIX 1+2: set apiError (not searchErr) so results section shows error state
      setApiError('Unable to fetch flights. Please try again.')
      setSearched(true)   // show results section so error is visible
    } finally {
      setLoading(false)
    }
  }, [from, to, date, token, setSearchParams])

  // ── Booking CTA handler ───────────────────────────────────────────────────────
  const handleBook = useCallback((flightId, isAuth) => {
    if (!isAuth) {
      // Visitor — send to register
      navigate('/register')
    } else {
      // Passenger — go to booking page
      navigate(`/passenger/flights/${flightId}/book`)
    }
  }, [navigate])

  // ── Route card click handler ──────────────────────────────────────────────────
  const handleRouteClick = useCallback((route) => {
    setFrom(route.from)
    setTo(route.to)
    setDate('')

    // Scroll to top so user sees the search bar fill
    window.scrollTo({ top: 0, behavior: 'smooth' })

    if (!token) {
      // Visitor — take them to register
      setTimeout(() => navigate('/register'), 400)
    } else {
      // Logged in — trigger a search with prefilled values
      setTimeout(() => {
        handleSearch(null, route.from, route.to)
      }, 400)
    }
  }, [token, navigate, handleSearch])

  return (
    <div className="bg-[#050A14] text-white min-h-screen overflow-x-hidden">
      <PublicNav scrolled={scrolled} />

      {/* ══════════════════════════════════════════════════════════════════
          HERO + SEARCH
      ══════════════════════════════════════════════════════════════════ */}
      <section className="relative min-h-screen flex flex-col justify-center overflow-hidden">

        {/* Star field */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
          {STARS.map(s => (
            <circle key={s.id} cx={`${s.x}%`} cy={`${s.y}%`} r={s.r}
              fill="white" opacity={s.o}
              style={{ animation: `star-pulse ${s.d}s ease-in-out ${s.id * 0.07}s infinite` }}/>
          ))}
        </svg>

        {/* Horizon glow */}
        <div className="absolute bottom-0 left-0 right-0 h-64 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 100%, rgba(30,111,255,0.18) 0%, transparent 70%)' }}/>

        {/* Grid */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.025]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '80px 80px',
          }}/>

        {/* Flying airplane */}
        <div className="absolute top-[30%] left-0 w-full pointer-events-none anim-fly">
          <div className="relative w-44">
            <div className="absolute inset-y-1/2 left-0 right-14 -translate-y-1/2 h-px bg-[linear-gradient(90deg,rgba(255,255,255,0),rgba(147,197,253,0.24),rgba(255,255,255,0))]" />
            <svg viewBox="0 0 220 82" fill="none" className="w-44 opacity-95 drop-shadow-[0_10px_30px_rgba(255,255,255,0.08)]" aria-hidden="true">
              <path d="M198 39c0 4-3 7-7 7h-48l-28 19c-2 1-5 0-5-3l7-16H76L59 61c-2 2-6 1-7-2l6-13H34l-11 7c-3 2-7 0-7-4s4-6 7-6l11 7h24l-6-13c-1-3 5-4 7-2l17 15h41l-7-16c0-3 3-4 5-3l28 19h48c4 0 7 3 7 7z" fill="#F8FBFF"/>
              <path d="M84 42h36" stroke="#A7C7F6" strokeWidth="2.2" strokeLinecap="round"/>
              <path d="M146 39h21" stroke="#B9D5FB" strokeWidth="2.4" strokeLinecap="round"/>
              <path d="M159 31h18" stroke="#D7E7FF" strokeWidth="2" strokeLinecap="round" opacity="0.8"/>
              <circle cx="174" cy="39" r="2.2" fill="#4C89FF" opacity="0.8"/>
              <path d="M136 26l9-6 11 8" stroke="#DCEBFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M137 54l9 6 11-8" stroke="#DCEBFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>

        <div className="relative max-w-7xl mx-auto px-6 pt-32 pb-12 w-full">

          {/* Headline */}
          <div className="max-w-3xl mb-12">
            <div className="flex items-center gap-3 mb-5 anim-reveal-up">
              <div className="h-px w-10" style={{ background: '#C9A84C' }}/>
              <span className="text-xs font-mono uppercase tracking-[0.3em]"
                style={{ color: '#C9A84C' }}>World-Class Aviation</span>
            </div>
            <h1 className="font-display leading-none mb-5">
              <span className="block text-6xl md:text-8xl font-light text-white anim-reveal-up delay-100"
                style={{ letterSpacing: '-0.02em' }}>Fly Beyond</span>
              <span className="block text-6xl md:text-8xl font-bold anim-shimmer anim-reveal-up delay-200"
                style={{ letterSpacing: '-0.02em' }}>The Horizon</span>
            </h1>
            <p className="font-body text-white/50 text-lg max-w-xl leading-relaxed anim-reveal-up delay-300">
              Search hundreds of routes instantly — no account needed.
              Book your perfect flight in minutes.
            </p>
            <div className="mt-6 flex flex-wrap gap-3 anim-reveal-up delay-400">
              <span className="text-xs font-mono px-3 py-1.5 border border-white/10 bg-white/[0.03] text-white/55 rounded-full">Live route search</span>
              <span className="text-xs font-mono px-3 py-1.5 border border-white/10 bg-white/[0.03] text-white/55 rounded-full">Fast booking flow</span>
              <span className="text-xs font-mono px-3 py-1.5 border border-white/10 bg-white/[0.03] text-white/55 rounded-full">Downloadable travel docs</span>
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────────
              SEARCH FORM
              Visitors can use this freely — no login required to search.
          ───────────────────────────────────────────────────────────────── */}
          <form
            onSubmit={handleSearch}
            className="anim-reveal-up delay-400 max-w-5xl"
          >
            {/* Search bar */}
            <div className="rounded-md border border-white/15 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.03))] backdrop-blur-md shadow-[0_25px_80px_rgba(0,0,0,0.28)] overflow-hidden">
              <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-white/10">

                {/* From — autocomplete */}
                <div className="flex-1 relative">
                  <AutocompleteInput
                    id="search-from"
                    value={from}
                    onChange={setFrom}
                    placeholder="Flying from…"
                    icon={
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                        stroke="#C9A84C" strokeWidth="2">
                        <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
                      </svg>
                    }
                  />
                </div>

                {/* To — autocomplete */}
                <div className="flex-1 relative">
                  <AutocompleteInput
                    id="search-to"
                    value={to}
                    onChange={setTo}
                    placeholder="Flying to…"
                    icon={
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                        stroke="#C9A84C" strokeWidth="2">
                        <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/>
                        <circle cx="12" cy="10" r="3"/>
                      </svg>
                    }
                  />
                </div>

                {/* Date */}
                <div className="flex-1 flex items-center">
                  <div className="relative w-full">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                        stroke="#C9A84C" strokeWidth="2">
                        <rect x="3" y="4" width="18" height="18" rx="2"/>
                        <path d="M16 2v4M8 2v4M3 10h18"/>
                      </svg>
                    </div>
                    <input type="date"
                      className="w-full bg-transparent text-white/60 text-sm font-body
                                 pl-10 pr-4 py-4 outline-none [color-scheme:dark]"
                      value={date}
                      onChange={e => setDate(e.target.value)}
                    />
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="px-8 py-4 text-sm font-semibold font-body text-[#050A14]
                             transition-opacity hover:opacity-90 whitespace-nowrap
                             flex items-center justify-center gap-2 disabled:opacity-60"
                  style={{ background: '#C9A84C', minWidth: '160px' }}
                >
                  {loading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-[#050A14]/30 border-t-[#050A14]
                                       rounded-full animate-spin inline-block"/>
                      Searching…
                    </>
                  ) : (
                    <>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" strokeWidth="2.5">
                        <circle cx="11" cy="11" r="8"/>
                        <path d="m21 21-4.35-4.35"/>
                      </svg>
                      Search Flights
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {searchErr && (
              <p className="mt-2 text-xs font-mono text-red-400 ml-1">{searchErr}</p>
            )}

            {/* Visitor nudge */}
            {!token && !searched && (
              <p className="mt-2 text-xs text-white/25 font-mono ml-1">
                Search is free · Sign up to book seats
              </p>
            )}
          </form>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          SEARCH RESULTS — 3 mutually exclusive states: loading | error | data
      ══════════════════════════════════════════════════════════════════ */}
      {(searched || loading) && (
        <section
          ref={resultsRef}
          className="py-10 px-6 border-t border-white/8 bg-[#060C18]"
        >
          <div className="max-w-5xl mx-auto">

            {/* Header — only when not loading */}
            {!loading && (
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-xs text-white/30 font-mono uppercase tracking-wider mb-1">
                    Results for
                  </p>
                  <h2 className="font-display text-2xl font-semibold text-white">
                    {from} <span className="text-white/30 font-light mx-2">→</span> {to}
                  </h2>
                </div>
                {!apiError && results.length > 0 && (
                  <span className="text-xs font-mono border border-white/15 px-3 py-1.5 text-white/40">
                    {results.length > MAX_RESULTS
                      ? `Showing ${MAX_RESULTS} of ${results.length}`
                      : `${results.length} flight${results.length !== 1 ? 's' : ''} found`}
                  </span>
                )}
              </div>
            )}

            {/* ── STATE 1: LOADING ─────────────────────────────────────── */}
            {loading && (
              <div className="space-y-3">
                <p className="text-sm text-white/40 font-mono animate-pulse mb-4">
                  Searching available flights…
                </p>
                {[1, 2, 3].map(i => (
                  <div key={i} className="border border-white/8 p-5 animate-pulse">
                    <div className="flex gap-6">
                      <div className="h-8 w-20 bg-white/5 rounded"/>
                      <div className="flex-1 h-8 bg-white/5 rounded"/>
                      <div className="h-8 w-24 bg-white/5 rounded"/>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* ── STATE 2: API ERROR ───────────────────────────────────── */}
            {!loading && apiError && (
              <div className="border border-red-500/20 bg-red-500/5 py-12 text-center">
                <svg width="36" height="36" viewBox="0 0 24 24" fill="none"
                  stroke="rgba(239,68,68,0.5)" strokeWidth="1.5"
                  className="mx-auto mb-3">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="12" y1="8" x2="12" y2="12"/>
                  <line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
                <p className="text-red-400 font-body mb-1 text-sm">{apiError}</p>
                <p className="text-white/20 text-xs font-mono">
                  Check your connection and try again
                </p>
              </div>
            )}

            {/* ── STATE 3a: EMPTY (no error, no results) ───────────────── */}
            {!loading && !apiError && searched && results.length === 0 && (
              <div className="border border-white/8 py-14 text-center">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none"
                  stroke="rgba(255,255,255,0.15)" strokeWidth="1.5"
                  className="mx-auto mb-4">
                  <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
                </svg>
                <p className="text-white/40 font-body mb-1">No flights found</p>
                <p className="text-white/20 text-sm font-mono">
                  Try different cities or dates
                </p>
                {!token && (
                  <div className="mt-6">
                    <Link to="/register"
                      className="text-xs font-semibold font-body px-5 py-2.5
                                 text-[#050A14] inline-block hover:opacity-90 transition-opacity"
                      style={{ background: '#C9A84C' }}>
                      Create account to see more routes →
                    </Link>
                  </div>
                )}
              </div>
            )}

            {/* ── STATE 3b: RESULTS (capped at MAX_RESULTS) ────────────── */}
            {!loading && !apiError && results.length > 0 && (
              <div className="space-y-2">
                {results.slice(0, MAX_RESULTS).map(f => (
                  <FlightResultCard
                    key={f.id}
                    flight={f}
                    token={token}
                    role={role}
                    onBook={handleBook}
                  />
                ))}

                {/* Overflow notice */}
                {results.length > MAX_RESULTS && (
                  <p className="text-xs text-white/25 font-mono text-center py-2">
                    Showing first {MAX_RESULTS} results — refine your search to see others
                  </p>
                )}

                {/* Visitor register nudge */}
                {!token && (
                  <div className="border border-white/8 bg-white/[0.02] p-5
                                  flex flex-col sm:flex-row items-center
                                  justify-between gap-4 mt-2">
                    <div>
                      <p className="text-sm font-body text-white/70">
                        Ready to book? Create a free account in 60 seconds.
                      </p>
                      <p className="text-xs text-white/30 font-mono mt-0.5">
                        No credit card required to register.
                      </p>
                    </div>
                    <div className="flex gap-3 shrink-0">
                      <Link to="/register"
                        className="text-sm font-semibold font-body px-5 py-2.5
                                   text-[#050A14] hover:opacity-90 transition-opacity"
                        style={{ background: '#C9A84C' }}>
                        Register free
                      </Link>
                      <Link to="/login"
                        className="text-sm font-medium font-body px-5 py-2.5
                                   text-white border border-white/20
                                   hover:border-white/40 hover:bg-white/5 transition-all">
                        Sign in
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          STATS
      ══════════════════════════════════════════════════════════════════ */}
      <section ref={statsRef}
        className="border-y border-white/5 py-16"
        style={{ background: 'linear-gradient(180deg,#050A14 0%,#060D1A 100%)' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: c1, suffix: '+',  label: 'Destinations worldwide' },
              { value: c2, suffix: 'M+', label: 'Passengers per year'    },
              { value: c3, suffix: '%',  label: 'On-time performance'    },
              { value: c4, suffix: '/7', label: 'Hour customer support'  },
            ].map(({ value, suffix, label }, i) => (
              <div key={label}
                className={`text-center ${statsVisible ? 'anim-count' : 'opacity-0'}`}
                style={{ animationDelay: `${i * 100}ms` }}>
                <p className="font-display text-5xl md:text-6xl font-bold leading-none mb-2"
                  style={{ color: '#C9A84C' }}>
                  {value}{suffix}
                </p>
                <p className="font-body text-sm text-white/40 uppercase tracking-wider">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          POPULAR ROUTES — with real Unsplash images
      ══════════════════════════════════════════════════════════════════ */}
      <section id="destinations" ref={routesRef} className="py-24 px-6">
        <div className="max-w-7xl mx-auto">

          <div className={`mb-10 ${routesVisible ? 'anim-reveal-up' : 'opacity-0'}`}>
            <div className="flex items-center gap-3 mb-3">
              <div className="h-px w-8" style={{ background: '#C9A84C' }}/>
              <span className="text-xs font-mono uppercase tracking-[0.3em] text-white/40">
                Popular routes
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
              <h2 className="font-display text-5xl md:text-6xl font-light text-white">
                Where Will You <span className="font-bold italic">Go?</span>
              </h2>
              <p className="font-body text-sm text-white/30 max-w-xs leading-relaxed">
                {token
                  ? 'Click any route to instantly search available flights.'
                  : 'Click a route — visitors are taken to registration, members see live results.'}
              </p>
            </div>
          </div>

          {/* 3-column grid with 2 tall cards on left */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {ROUTES.map((route, i) => (
              <RouteCard
                key={route.code}
                route={route}
                index={i}
                visible={routesVisible}
                token={token}
                onClick={handleRouteClick}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          WHY SKYWING
      ══════════════════════════════════════════════════════════════════ */}
      <section id="experience" ref={featRef}
        className="py-24 px-6 border-t border-white/5"
        style={{ background: 'linear-gradient(180deg,#050A14 0%,#070F1C 100%)' }}>
        <div className="max-w-7xl mx-auto">
          <div className={`mb-14 max-w-2xl ${featVisible ? 'anim-reveal-up' : 'opacity-0'}`}>
            <div className="flex items-center gap-3 mb-3">
              <div className="h-px w-8" style={{ background: '#C9A84C' }}/>
              <span className="text-xs font-mono uppercase tracking-[0.3em] text-white/40">
                Why SkyWing
              </span>
            </div>
            <h2 className="font-display text-5xl md:text-6xl font-light text-white mb-4">
              The <span className="font-bold italic">SkyWing</span><br/>Experience
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map(({ icon, title, desc }, i) => (
              <div key={title}
                className={`group p-6 border border-white/8 hover:border-white/20
                           transition-all duration-300 hover:bg-white/[0.03]
                           ${featVisible ? 'anim-reveal-up' : 'opacity-0'}`}
                style={{ animationDelay: `${i * 120}ms` }}>
                <div className="text-white/30 group-hover:text-white/60 transition-colors mb-5">
                  {icon}
                </div>
                <h3 className="font-display text-xl font-semibold text-white mb-2">{title}</h3>
                <p className="font-body text-sm text-white/40 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════
          CTA (shown only to visitors)
      ══════════════════════════════════════════════════════════════════ */}
      {!token && (
        <section className="py-24 px-6 border-t border-white/5 text-center"
          style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 100%, rgba(30,111,255,0.1) 0%, transparent 70%)' }}>
          <div className="max-w-2xl mx-auto">
            <div className="flex justify-center mb-4">
              <div className="h-px w-16" style={{ background: 'linear-gradient(90deg,transparent,#C9A84C,transparent)' }}/>
            </div>
            <h2 className="font-display text-5xl md:text-6xl font-light text-white mb-4">
              Ready to<br/><span className="font-bold italic anim-shimmer">Take Off?</span>
            </h2>
            <p className="font-body text-white/40 text-lg mb-10 leading-relaxed">
              Join over 2 million travellers who choose SkyWing.
              Register free in 60 seconds and start booking.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/register"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2
                           px-8 py-4 text-base font-semibold font-body text-[#050A14]
                           hover:opacity-90 transition-opacity"
                style={{ background: '#C9A84C' }}>
                Create Free Account →
              </Link>
              <Link to="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2
                           px-8 py-4 text-base font-medium font-body text-white
                           border border-white/20 hover:border-white/50
                           hover:bg-white/5 transition-all">
                I already have an account
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          FOOTER
      ══════════════════════════════════════════════════════════════════ */}
      <footer className="border-t border-white/5 py-10 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center
                        justify-between gap-4">
          <div className="flex items-center gap-3">
            <svg viewBox="0 0 32 32" fill="none" className="w-6 h-6">
              <path d="M4 20L16 4l12 16H4z" fill="#1E6FFF" opacity="0.9"/>
              <path d="M2 24h28" stroke="#C9A84C" strokeWidth="1.5"/>
            </svg>
            <span className="font-display text-white/60">
              Sky<span style={{ color: '#C9A84C' }}>Wing</span>
            </span>
            <span className="text-white/20 text-xs font-mono">© 2026</span>
          </div>
          <div className="flex items-center gap-6">
            {['Privacy', 'Terms', 'Contact'].map(l => (
              <a key={l} href="#"
                className="text-xs font-mono text-white/30 hover:text-white/60 transition-colors">
                {l}
              </a>
            ))}
          </div>
          <p className="text-xs font-mono text-white/20">Airline Management System v4.0</p>
        </div>
      </footer>
    </div>
  )
}

// ─── Route Card component ─────────────────────────────────────────────────────
// Defined outside Home to prevent remount issues
function RouteCard({ route, index, visible, token, onClick }) {
  const [imgError, setImgError] = useState(false)

  return (
    <div
      className={`group relative overflow-hidden cursor-pointer
                  border border-white/10 hover:border-white/30
                  transition-all duration-300
                  ${visible ? 'anim-reveal-up' : 'opacity-0'}`}
      style={{
        animationDelay: `${index * 90}ms`,
        minHeight: index < 2 ? '280px' : '200px',
      }}
      onClick={() => onClick(route)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick(route)}
      aria-label={`Explore route ${route.from} to ${route.to}`}
    >
      {/* Background image */}
      {!imgError ? (
        <img
          src={route.img}
          alt={`${route.to} destination`}
          className="absolute inset-0 w-full h-full object-cover transition-transform
                     duration-700 group-hover:scale-105"
          onError={() => setImgError(true)}
          loading="lazy"
        />
      ) : (
        /* Fallback gradient if image fails */
        <div className="absolute inset-0 bg-[#0A1628]"
          style={{ background: `linear-gradient(135deg, #0a1628 0%, #050a14 100%)` }}/>
      )}

      {/* Dark overlay — always present for text readability */}
      <div className="absolute inset-0 bg-[#050A14]/60 group-hover:bg-[#050A14]/45
                      transition-colors duration-300"/>

      {/* Bottom gradient */}
      <div className="absolute inset-0"
        style={{ background: 'linear-gradient(to top, rgba(5,10,20,0.95) 0%, transparent 55%)' }}/>

      {/* Content */}
      <div className="relative h-full flex flex-col justify-between p-5">
        {/* Tag */}
        <div className="self-start">
          <span className="text-xs font-mono px-2 py-1 border border-white/20
                           bg-black/40 text-white/60 backdrop-blur-sm">
            {route.tag}
          </span>
        </div>

        {/* Route text */}
        <div>
          <p className="font-display text-2xl font-light text-white/80 leading-tight">
            {route.from}
          </p>
          <div className="flex items-center gap-2 my-1.5">
            <div className="h-px flex-1 border-t border-dashed border-white/20"/>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="rgba(201,168,76,0.7)" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </div>
          <p className="font-display text-2xl font-bold text-white leading-tight">
            {route.to}
          </p>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs font-mono text-white/40">{route.code}</span>
            <span className="text-xs font-mono" style={{ color: '#C9A84C' }}>
              {route.duration}
            </span>
          </div>

          {/* Auth-aware CTA hint */}
          <p className="text-xs text-white/30 font-mono mt-2 group-hover:text-white/50 transition-colors">
            {token ? 'Click to search →' : 'Click to register →'}
          </p>
        </div>
      </div>
    </div>
  )
}
