import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Plane, Shield, Clock, Award, ChevronDown, Globe, Star } from 'lucide-react'
import SearchForm from '../components/flights/SearchForm'
import api from '../utils/api'
import FlightCard from '../components/flights/FlightCard'

const DESTINATIONS = [
  { city: 'Dubai', code: 'DXB', tagline: 'City of Gold', img: '🏙️' },
  { city: 'Paris', code: 'CDG', tagline: 'City of Light', img: '🗼' },
  { city: 'Tokyo', code: 'NRT', tagline: 'Land of Rising Sun', img: '🗾' },
  { city: 'New York', code: 'JFK', tagline: 'The Big Apple', img: '🗽' },
  { city: 'Singapore', code: 'SIN', tagline: 'The Lion City', img: '🦁' },
  { city: 'London', code: 'LHR', tagline: 'The Old Smoke', img: '🎡' },
]

const FEATURES = [
  { icon: Shield, title: 'Safe & Secure', desc: 'Industry-leading safety standards with 99.9% on-time performance.' },
  { icon: Award, title: 'Award Winning', desc: 'Voted best airline 5 years running by World Travel Awards.' },
  { icon: Globe, title: 'Global Network', desc: 'Connecting 150+ destinations across 60 countries worldwide.' },
  { icon: Clock, title: '24/7 Support', desc: 'Round-the-clock assistance in 30 languages whenever you need.' },
]

export default function HomePage() {
  const [featured, setFeatured] = useState([])

  useEffect(() => {
    api.get('/api/flights').then(r => setFeatured(r.data.slice(0, 3))).catch(() => {})
  }, [])

  return (
    <div className="overflow-hidden">

      {/* ── HERO ──────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center pt-20 pb-32 px-4">
        {/* Background orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-navy-700/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-navy-800/40 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gold-600/5 rounded-full blur-3xl pointer-events-none" />

        {/* Floating plane icon */}
        <div className="animate-float mb-8">
          <div className="relative w-20 h-20">
            <div className="absolute inset-0 bg-gold-gradient rounded-2xl rotate-12 opacity-90" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Plane className="w-10 h-10 text-navy-950 -rotate-12" strokeWidth={2} />
            </div>
          </div>
        </div>

        {/* Headline */}
        <div className="text-center max-w-5xl mx-auto animate-fade-up">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-gold-500/10 border border-gold-500/25 rounded-full text-gold-400 text-xs font-body uppercase tracking-widest mb-6">
            <Star className="w-3 h-3 fill-gold-400" /> 5-Star Airline Experience
          </div>

          <h1 className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-light text-white leading-[0.95] mb-6">
            Fly Beyond
            <br />
            <em className="gold-text italic">Imagination</em>
          </h1>

          <p className="text-white/50 text-lg font-body font-light max-w-2xl mx-auto leading-relaxed mb-12">
            Experience the pinnacle of air travel. From seamless booking to world-class in-flight service,
            every journey with SkyWings is a destination in itself.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Link to="/flights" className="btn-primary py-4 px-8 text-base">
              <Plane className="w-5 h-5" /> Explore Flights
            </Link>
            <Link to="/register" className="btn-ghost py-4 px-8 text-base">
              Create Account
            </Link>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-12 text-center">
            {[['150+', 'Destinations'], ['2M+', 'Happy Travelers'], ['99.9%', 'On-Time Rate'], ['5★', 'Service Rating']].map(([val, lbl]) => (
              <div key={lbl}>
                <div className="font-display text-3xl font-semibold gold-text">{val}</div>
                <div className="text-xs text-white/40 uppercase tracking-widest font-body mt-1">{lbl}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 animate-bounce">
          <span className="text-xs text-white/30 font-body uppercase tracking-widest">Search</span>
          <ChevronDown className="w-4 h-4 text-white/30" />
        </div>
      </section>

      {/* ── SEARCH ──────────────────────────────────────── */}
      <section className="relative -mt-20 px-4 pb-20 max-w-6xl mx-auto">
        <div className="card-glass p-8 shadow-navy-lg">
          <h2 className="font-display text-2xl text-white font-light mb-6">
            Find Your <span className="gold-text italic">Perfect Flight</span>
          </h2>
          <SearchForm />
        </div>
      </section>

      {/* ── POPULAR DESTINATIONS ────────────────────────── */}
      <section className="px-4 py-20 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-xs text-gold-500 uppercase tracking-widest font-body mb-3">Explore the World</p>
          <h2 className="section-title">Popular <em className="italic">Destinations</em></h2>
          <div className="divider-gold mx-auto mt-4" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {DESTINATIONS.map((dest, i) => (
            <Link
              key={dest.code}
              to={`/flights?destination=${dest.city}`}
              className={`card-navy p-5 text-center hover:border-gold-500/30 transition-all duration-300 hover:-translate-y-1 group
                         opacity-0 animate-fade-up`}
              style={{ animationDelay: `${i * 0.08}s`, animationFillMode: 'forwards' }}
            >
              <div className="text-3xl mb-3">{dest.img}</div>
              <p className="font-mono text-gold-400 text-sm font-medium tracking-widest">{dest.code}</p>
              <p className="font-display text-base text-white font-medium mt-0.5">{dest.city}</p>
              <p className="text-xs text-white/40 font-body mt-1">{dest.tagline}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── FEATURED FLIGHTS ────────────────────────────── */}
      {featured.length > 0 && (
        <section className="px-4 py-10 max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-xs text-gold-500 uppercase tracking-widest font-body mb-2">Available Now</p>
              <h2 className="section-title">Featured <em className="italic">Flights</em></h2>
            </div>
            <Link to="/flights" className="btn-outline-gold py-2.5 px-5 text-sm">
              View All →
            </Link>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {featured.map(f => <FlightCard key={f.id} flight={f} />)}
          </div>
        </section>
      )}

      {/* ── FEATURES ────────────────────────────────────── */}
      <section className="px-4 py-20 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-xs text-gold-500 uppercase tracking-widest font-body mb-3">Why Choose Us</p>
          <h2 className="section-title">The <em className="italic">SkyWings</em> Difference</h2>
          <div className="divider-gold mx-auto mt-4" />
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {FEATURES.map(({ icon: Icon, title, desc }, i) => (
            <div key={title}
              className={`card-navy p-6 hover:border-gold-500/20 transition-all duration-300 group opacity-0 animate-fade-up`}
              style={{ animationDelay: `${i * 0.1}s`, animationFillMode: 'forwards' }}
            >
              <div className="w-12 h-12 rounded-xl bg-gold-500/10 border border-gold-500/20 flex items-center justify-center mb-4 group-hover:bg-gold-500/20 transition-colors">
                <Icon className="w-6 h-6 text-gold-400" strokeWidth={1.5} />
              </div>
              <h3 className="font-display text-lg text-white font-medium mb-2">{title}</h3>
              <p className="text-sm text-white/45 font-body leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA BANNER ──────────────────────────────────── */}
      <section className="px-4 py-10 max-w-7xl mx-auto mb-10">
        <div className="relative card-glass overflow-hidden p-10 md:p-16 text-center">
          <div className="absolute inset-0 bg-gold-gradient opacity-5" />
          <div className="absolute -top-20 -right-20 w-60 h-60 bg-gold-500/10 rounded-full blur-3xl" />
          <div className="relative">
            <p className="text-xs text-gold-500 uppercase tracking-widest font-body mb-4">Limited Time Offer</p>
            <h2 className="font-display text-4xl md:text-5xl text-white font-light mb-4">
              Your Next Adventure <br />
              <em className="gold-text italic">Awaits You</em>
            </h2>
            <p className="text-white/50 font-body mb-8 max-w-lg mx-auto">
              Join over 2 million travelers who trust SkyWings for every journey. Sign up today and get exclusive deals.
            </p>
            <Link to="/register" className="btn-primary py-4 px-10 text-base inline-flex">
              Start Your Journey <Plane className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
