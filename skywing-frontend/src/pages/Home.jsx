import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

// ─── Stars background ────────────────────────────────────────────────────────
const STARS = Array.from({ length: 80 }, (_, i) => ({
  id: i,
  x:  Math.random() * 100,
  y:  Math.random() * 100,
  r:  Math.random() * 1.5 + 0.3,
  d:  Math.random() * 4 + 2,
  o:  Math.random() * 0.5 + 0.1,
}))

// ─── Destinations data ───────────────────────────────────────────────────────
const DESTINATIONS = [
  { from: 'New York',   to: 'London',    code: 'JFK → LHR', time: '7h 20m', tag: 'Popular',   color: '#1E3A5F' },
  { from: 'Dubai',      to: 'Singapore', code: 'DXB → SIN', time: '7h 10m', tag: 'Trending',  color: '#2D1F00' },
  { from: 'Paris',      to: 'Tokyo',     code: 'CDG → NRT', time: '12h 45m',tag: 'Long-haul', color: '#1A2940' },
  { from: 'Los Angeles',to: 'Sydney',    code: 'LAX → SYD', time: '15h 30m',tag: 'Adventure', color: '#0F2A1A' },
]

// ─── Features data ───────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: (
      <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10">
        <path d="M24 4L6 16v24h36V16L24 4z" strokeLinejoin="round"/>
        <path d="M16 40V28h16v12"/>
        <circle cx="24" cy="20" r="4"/>
      </svg>
    ),
    title: 'Premium Comfort',
    desc: 'Spacious seating with extra legroom across all cabin classes. Your comfort is our priority on every flight.',
  },
  {
    icon: (
      <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10">
        <path d="M8 24l10 10 22-20"/>
        <circle cx="24" cy="24" r="20"/>
      </svg>
    ),
    title: 'On-Time Performance',
    desc: 'Industry-leading 98.2% on-time departure rate. We respect your schedule as much as you do.',
  },
  {
    icon: (
      <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-10 h-10">
        <path d="M24 4c-8 0-14 6-14 14 0 10 14 26 14 26s14-16 14-26c0-8-6-14-14-14z"/>
        <circle cx="24" cy="18" r="4"/>
      </svg>
    ),
    title: '150+ Destinations',
    desc: 'Fly to over 150 cities across 6 continents. Wherever your journey takes you, SkyWing gets you there.',
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
    desc: 'Book your seat in under 2 minutes. Our streamlined system handles everything from search to boarding pass.',
  },
]

// ─── Animated counter hook ────────────────────────────────────────────────────
function useCounter(target, duration = 2000, start = false) {
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!start) return
    let startTime = null
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      const ease = 1 - Math.pow(1 - progress, 3)
      setCount(Math.floor(ease * target))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [start, target, duration])
  return count
}

// ─── Intersection observer hook ──────────────────────────────────────────────
function useInView(threshold = 0.2) {
  const ref  = useRef(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisible(true); obs.disconnect() }
    }, { threshold })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [threshold])
  return [ref, visible]
}

// ─── Public navbar ────────────────────────────────────────────────────────────
function PublicNav({ scrolled }) {
  const { token, role } = useAuth()

  const dashLink = role === 'staff' ? '/staff/flights' : '/passenger/flights'

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300
      ${scrolled ? 'bg-[#050A14]/95 backdrop-blur-md border-b border-white/5 py-3' : 'py-5'}`}>
      <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3">
          <div className="w-8 h-8 relative">
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

        {/* Nav links */}
        <div className="hidden md:flex items-center gap-8">
          {['Destinations', 'Experience', 'About'].map(l => (
            <a key={l} href={`#${l.toLowerCase()}`}
              className="text-sm font-body text-white/60 hover:text-white transition-colors duration-200">
              {l}
            </a>
          ))}
        </div>

        {/* CTA */}
        <div className="flex items-center gap-3">
          {token ? (
            <Link to={dashLink}
              className="flex items-center gap-2 text-sm font-medium text-white
                         border border-white/20 px-4 py-2 hover:border-white/50
                         hover:bg-white/5 transition-all duration-200">
              Dashboard →
            </Link>
          ) : (
            <>
              <Link to="/login"
                className="text-sm font-medium text-white/70 hover:text-white transition-colors px-3 py-2">
                Sign In
              </Link>
              <Link to="/register"
                className="text-sm font-medium text-[#050A14] px-4 py-2
                           transition-all duration-200 hover:opacity-90"
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

// ─── Plane SVG ────────────────────────────────────────────────────────────────
function PlaneSVG({ className = '' }) {
  return (
    <svg viewBox="0 0 120 40" fill="none" className={className} aria-hidden="true">
      <path d="M110 20L60 8 20 14 8 20l12 6 40-6 50 12 0-12z" fill="white" opacity="0.95"/>
      <path d="M55 14L50 6l-6 8 11 0z" fill="white" opacity="0.8"/>
      <path d="M58 26l-5 10-5-10 10 0z" fill="white" opacity="0.7"/>
      <circle cx="100" cy="20" r="1.5" fill="#1E6FFF" opacity="0.9"
        style={{ animation: 'blink-dot 1s ease-in-out infinite' }}/>
    </svg>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Home() {
  const navigate  = useNavigate()
  const { token, role } = useAuth()
  const [scrolled, setScrolled]   = useState(false)
  const [searchForm, setSearch]   = useState({ from: '', to: '', date: '' })
  const [statsRef, statsVisible]  = useInView(0.3)
  const [featRef,  featVisible]   = useInView(0.1)
  const [destRef,  destVisible]   = useInView(0.1)

  const c1 = useCounter(150, 1800, statsVisible)
  const c2 = useCounter(2,   1800, statsVisible)
  const c3 = useCounter(98,  1800, statsVisible)
  const c4 = useCounter(24,  1800, statsVisible)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    if (!token) { navigate('/login'); return }
    const params = new URLSearchParams()
    if (searchForm.from) params.set('origin',      searchForm.from)
    if (searchForm.to)   params.set('destination', searchForm.to)
    if (searchForm.date) params.set('date',        searchForm.date)
    const base = role === 'staff' ? '/staff/flights' : '/passenger/flights'
    navigate(`${base}?${params.toString()}`)
  }

  return (
    <div className="bg-[#050A14] text-white min-h-screen overflow-x-hidden">
      <PublicNav scrolled={scrolled} />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
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
        <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
          style={{ background: 'linear-gradient(to top, rgba(201,168,76,0.06), transparent)' }}/>

        {/* Grid overlay */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '80px 80px',
          }}/>

        {/* Flying plane */}
        <div className="absolute top-1/3 left-0 w-full pointer-events-none anim-fly"
          style={{ willChange: 'transform' }}>
          <PlaneSVG className="w-36 opacity-90"/>
        </div>

        {/* Hero content */}
        <div className="relative max-w-7xl mx-auto px-6 pt-32 pb-16">
          <div className="max-w-4xl">

            {/* Eyebrow */}
            <div className="flex items-center gap-3 mb-6 anim-reveal-up">
              <div className="h-px w-10" style={{ background: '#C9A84C' }}/>
              <span className="text-xs font-mono uppercase tracking-[0.3em]"
                style={{ color: '#C9A84C' }}>
                World-Class Aviation
              </span>
            </div>

            {/* Main heading */}
            <h1 className="font-display leading-none mb-6">
              <span className="block text-6xl md:text-8xl font-light text-white anim-reveal-up delay-100"
                style={{ letterSpacing: '-0.02em' }}>
                Fly Beyond
              </span>
              <span className="block text-6xl md:text-8xl font-bold anim-reveal-up delay-200 anim-shimmer"
                style={{ letterSpacing: '-0.02em' }}>
                The Horizon
              </span>
            </h1>

            <p className="font-body text-white/50 text-lg md:text-xl max-w-xl leading-relaxed
                          anim-reveal-up delay-300">
              Discover a world of destinations with seamless booking, premium comfort,
              and service that goes the extra mile — every flight, every time.
            </p>

            {/* Stats bar */}
            <div className="flex flex-wrap gap-6 mt-8 mb-10 anim-reveal-up delay-400">
              {[['150+', 'Destinations'], ['2M+', 'Passengers/yr'], ['98%', 'On-Time']].map(([v, l]) => (
                <div key={l} className="flex items-center gap-2">
                  <span className="font-display text-2xl font-bold" style={{ color: '#C9A84C' }}>{v}</span>
                  <span className="text-xs text-white/40 font-body">{l}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Search bar ──────────────────────────────────────────────── */}
          <div className="anim-reveal-up delay-500 max-w-4xl">
            <form onSubmit={handleSearch}
              className="border border-white/10 bg-white/5 backdrop-blur-sm p-1">
              <div className="flex flex-col md:flex-row">
                {/* From */}
                <div className="flex-1 relative border-b md:border-b-0 md:border-r border-white/10">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                      stroke="#C9A84C" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
                    </svg>
                  </div>
                  <input
                    className="w-full bg-transparent text-white placeholder-white/30 text-sm
                               font-body pl-10 pr-4 py-4 outline-none"
                    placeholder="Flying from…"
                    value={searchForm.from}
                    onChange={e => setSearch(f => ({ ...f, from: e.target.value }))}
                  />
                </div>

                {/* To */}
                <div className="flex-1 relative border-b md:border-b-0 md:border-r border-white/10">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                      stroke="#C9A84C" strokeWidth="2">
                      <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z"/>
                      <circle cx="12" cy="10" r="3"/>
                    </svg>
                  </div>
                  <input
                    className="w-full bg-transparent text-white placeholder-white/30 text-sm
                               font-body pl-10 pr-4 py-4 outline-none"
                    placeholder="Flying to…"
                    value={searchForm.to}
                    onChange={e => setSearch(f => ({ ...f, to: e.target.value }))}
                  />
                </div>

                {/* Date */}
                <div className="flex-1 relative border-b md:border-b-0 md:border-r border-white/10">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                      stroke="#C9A84C" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2"/>
                      <path d="M16 2v4M8 2v4M3 10h18"/>
                    </svg>
                  </div>
                  <input type="date"
                    className="w-full bg-transparent text-white/60 text-sm
                               font-body pl-10 pr-4 py-4 outline-none
                               [color-scheme:dark]"
                    value={searchForm.date}
                    onChange={e => setSearch(f => ({ ...f, date: e.target.value }))}
                  />
                </div>

                {/* Submit */}
                <button type="submit"
                  className="px-8 py-4 text-sm font-semibold font-body text-[#050A14]
                             transition-opacity duration-200 hover:opacity-90 whitespace-nowrap"
                  style={{ background: '#C9A84C' }}>
                  Search Flights →
                </button>
              </div>
            </form>

            <p className="text-xs text-white/25 font-mono mt-2 ml-1">
              {token ? 'Search across all available routes' : 'Sign in to book · passenger registration is free'}
            </p>
          </div>

          {/* Scroll hint */}
          <div className="mt-16 flex items-center gap-2 text-white/25 anim-reveal-up delay-600">
            <div className="w-px h-10 bg-white/10 relative overflow-hidden">
              <div className="absolute top-0 w-full"
                style={{
                  height: '40%',
                  background: 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.4), transparent)',
                  animation: 'fly-path 2s ease-in-out infinite',
                }}/>
            </div>
            <span className="text-xs font-mono uppercase tracking-widest">Scroll to explore</span>
          </div>
        </div>
      </section>

      {/* ── STATS ─────────────────────────────────────────────────────────── */}
      <section ref={statsRef}
        className="relative border-y border-white/5 py-16"
        style={{ background: 'linear-gradient(180deg, #050A14 0%, #060D1A 100%)' }}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: c1, suffix: '+',  label: 'Destinations worldwide', delay: 0    },
              { value: c2, suffix: 'M+', label: 'Passengers per year',    delay: 100  },
              { value: c3, suffix: '%',  label: 'On-time performance',    delay: 200  },
              { value: c4, suffix: '/7', label: 'Hour customer support',  delay: 300  },
            ].map(({ value, suffix, label, delay }) => (
              <div key={label}
                className={`text-center ${statsVisible ? 'anim-count' : 'opacity-0'}`}
                style={{ animationDelay: `${delay}ms` }}>
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

      {/* ── DESTINATIONS ─────────────────────────────────────────────────── */}
      <section id="destinations" ref={destRef} className="py-24 px-6">
        <div className="max-w-7xl mx-auto">

          <div className={`mb-12 ${destVisible ? 'anim-reveal-up' : 'opacity-0'}`}>
            <div className="flex items-center gap-3 mb-3">
              <div className="h-px w-8" style={{ background: '#C9A84C' }}/>
              <span className="text-xs font-mono uppercase tracking-[0.3em] text-white/40">
                Where to fly
              </span>
            </div>
            <h2 className="font-display text-5xl md:text-6xl font-light text-white">
              Popular <span className="font-bold italic">Routes</span>
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {DESTINATIONS.map(({ from, to, code, time, tag, color }, i) => (
              <div key={code}
                className={`group relative overflow-hidden border border-white/10 cursor-pointer
                           hover:border-white/30 transition-all duration-300
                           ${destVisible ? 'anim-reveal-up' : 'opacity-0'}`}
                style={{
                  animationDelay: `${i * 100}ms`,
                  background: `linear-gradient(135deg, ${color} 0%, #050A14 100%)`,
                  minHeight: '220px',
                }}
                onClick={() => navigate(token ? (role === 'staff' ? '/staff/flights' : '/passenger/flights') : '/login')}>

                {/* Background accent */}
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10 -translate-y-1/2 translate-x-1/2"
                  style={{ background: '#1E6FFF', filter: 'blur(40px)' }}/>

                <div className="relative p-5 h-full flex flex-col justify-between">
                  {/* Tag */}
                  <span className="self-start text-xs font-mono px-2 py-0.5 border border-white/20 text-white/50">
                    {tag}
                  </span>

                  <div>
                    {/* Route */}
                    <div className="mb-2">
                      <p className="font-display text-2xl font-light text-white/80 leading-tight">{from}</p>
                      <div className="flex items-center gap-2 my-1">
                        <div className="h-px flex-1 border-t border-dashed border-white/20"/>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                          stroke="rgba(201,168,76,0.6)" strokeWidth="2">
                          <path d="M5 12h14M12 5l7 7-7 7"/>
                        </svg>
                      </div>
                      <p className="font-display text-2xl font-bold text-white leading-tight">{to}</p>
                    </div>

                    {/* Meta */}
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs font-mono text-white/40">{code}</span>
                      <span className="text-xs font-mono" style={{ color: '#C9A84C' }}>{time}</span>
                    </div>
                  </div>

                  {/* Hover arrow */}
                  <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                      stroke="#C9A84C" strokeWidth="2">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── EXPERIENCE SECTION ────────────────────────────────────────────── */}
      <section id="experience" ref={featRef}
        className="py-24 px-6 border-t border-white/5"
        style={{ background: 'linear-gradient(180deg, #050A14 0%, #070F1C 100%)' }}>
        <div className="max-w-7xl mx-auto">

          <div className={`mb-16 max-w-2xl ${featVisible ? 'anim-reveal-up' : 'opacity-0'}`}>
            <div className="flex items-center gap-3 mb-3">
              <div className="h-px w-8" style={{ background: '#C9A84C' }}/>
              <span className="text-xs font-mono uppercase tracking-[0.3em] text-white/40">
                Why SkyWing
              </span>
            </div>
            <h2 className="font-display text-5xl md:text-6xl font-light text-white mb-4">
              The <span className="font-bold italic">SkyWing</span><br/>Experience
            </h2>
            <p className="font-body text-white/40 text-lg leading-relaxed">
              Every detail engineered for the discerning traveller.
              From booking to landing, we redefine what flying should feel like.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map(({ icon, title, desc }, i) => (
              <div key={title}
                className={`group p-6 border border-white/8 hover:border-white/20
                           transition-all duration-300 hover:bg-white/[0.03]
                           ${featVisible ? 'anim-reveal-up' : 'opacity-0'}`}
                style={{ animationDelay: `${i * 120}ms` }}>
                <div className="text-white/30 group-hover:text-white/60 transition-colors duration-300 mb-5">
                  {icon}
                </div>
                <h3 className="font-display text-xl font-semibold text-white mb-2">{title}</h3>
                <p className="font-body text-sm text-white/40 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── ROUTE MAP VISUAL ──────────────────────────────────────────────── */}
      <section className="py-24 px-6 border-t border-white/5 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="relative border border-white/8 p-8 md:p-12"
            style={{ background: 'linear-gradient(135deg, #060D1A 0%, #050A14 100%)' }}>

            {/* Decorative world map dots */}
            <div className="absolute inset-0 opacity-5 pointer-events-none"
              style={{
                backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
                backgroundSize: '24px 24px',
              }}/>

            <div className="relative z-10 flex flex-col md:flex-row items-center gap-10">
              {/* Text */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-px w-8" style={{ background: '#C9A84C' }}/>
                  <span className="text-xs font-mono uppercase tracking-[0.3em] text-white/40">
                    Global Network
                  </span>
                </div>
                <h2 className="font-display text-4xl md:text-5xl font-light text-white mb-4 leading-tight">
                  Connecting<br/>
                  <span className="font-bold italic" style={{ color: '#C9A84C' }}>
                    the World
                  </span>
                </h2>
                <p className="font-body text-white/40 leading-relaxed max-w-md mb-8">
                  Our network spans 6 continents and 150+ cities. Whether it's a
                  business trip or a dream holiday, SkyWing connects you to the world.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link to={token ? (role === 'staff' ? '/staff/flights' : '/passenger/flights') : '/register'}
                    className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold
                               font-body text-[#050A14] transition-opacity hover:opacity-90"
                    style={{ background: '#C9A84C' }}>
                    {token ? 'View Flights' : 'Join SkyWing'}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2.5">
                      <path d="M5 12h14M12 5l7 7-7 7"/>
                    </svg>
                  </Link>
                  {!token && (
                    <Link to="/login"
                      className="inline-flex items-center gap-2 px-6 py-3 text-sm font-medium
                                 font-body text-white border border-white/20
                                 hover:border-white/50 hover:bg-white/5 transition-all duration-200">
                      Sign In
                    </Link>
                  )}
                </div>
              </div>

              {/* SVG globe-style illustration */}
              <div className="flex-shrink-0 w-64 h-64 relative">
                <svg viewBox="0 0 240 240" fill="none" className="w-full h-full">
                  {/* Globe circles */}
                  <circle cx="120" cy="120" r="100" stroke="rgba(30,111,255,0.15)" strokeWidth="1"/>
                  <circle cx="120" cy="120" r="70"  stroke="rgba(30,111,255,0.1)"  strokeWidth="1"/>
                  <circle cx="120" cy="120" r="40"  stroke="rgba(201,168,76,0.15)" strokeWidth="1"/>
                  {/* Latitude lines */}
                  <ellipse cx="120" cy="120" rx="100" ry="30" stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>
                  <ellipse cx="120" cy="120" rx="100" ry="60" stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>
                  {/* Longitude lines */}
                  <path d="M120 20 C 160 60 160 180 120 220" stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>
                  <path d="M120 20 C  80 60  80 180 120 220" stroke="rgba(255,255,255,0.05)" strokeWidth="1"/>
                  {/* Route lines */}
                  <path d="M50 90 Q 120 50 190 100"  stroke="#1E6FFF" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.6"/>
                  <path d="M70 150 Q 140 100 200 140" stroke="#C9A84C" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.5"/>
                  <path d="M40 130 Q 100 160 180 110" stroke="#1E6FFF" strokeWidth="1"   strokeDasharray="3 3" opacity="0.4"/>
                  {/* City dots */}
                  {[[50,90],[190,100],[70,150],[200,140],[40,130],[180,110],[120,60],[130,170]].map(([x,y],i)=>(
                    <circle key={i} cx={x} cy={y} r="3" fill="#C9A84C" opacity="0.8"
                      style={{ animation: `star-pulse ${2+i*0.3}s ease-in-out ${i*0.2}s infinite` }}/>
                  ))}
                  {/* Center logo */}
                  <circle cx="120" cy="120" r="12" fill="rgba(30,111,255,0.2)" stroke="#1E6FFF" strokeWidth="1"/>
                  <path d="M114 120l6-8 6 8h-12z" fill="#C9A84C" opacity="0.9"/>
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      {!token && (
        <section className="py-24 px-6 border-t border-white/5 text-center"
          style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 100%, rgba(30,111,255,0.12) 0%, transparent 70%)' }}>
          <div className="max-w-2xl mx-auto">
            <div className="flex justify-center mb-4">
              <div className="h-px w-16" style={{ background: 'linear-gradient(90deg, transparent, #C9A84C, transparent)' }}/>
            </div>
            <h2 className="font-display text-5xl md:text-6xl font-light text-white mb-4">
              Ready to<br/>
              <span className="font-bold italic anim-shimmer">Take Off?</span>
            </h2>
            <p className="font-body text-white/40 text-lg mb-10 leading-relaxed">
              Join over 2 million travellers who choose SkyWing.
              Register free in 60 seconds and start booking.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/register"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2
                           px-8 py-4 text-base font-semibold font-body text-[#050A14]
                           transition-opacity hover:opacity-90"
                style={{ background: '#C9A84C' }}>
                Create Free Account
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.5">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </Link>
              <Link to="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2
                           px-8 py-4 text-base font-medium font-body text-white
                           border border-white/20 hover:border-white/50
                           hover:bg-white/5 transition-all duration-200">
                I already have an account
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── FOOTER ───────────────────────────────────────────────────────── */}
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
          <p className="text-xs font-mono text-white/20">
            Airline Management System v3.0
          </p>
        </div>
      </footer>
    </div>
  )
}