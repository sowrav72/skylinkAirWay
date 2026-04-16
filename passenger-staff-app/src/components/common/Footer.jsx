import { Link } from 'react-router-dom'
import { Plane, Mail, Phone, MapPin } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="relative border-t border-white/8 bg-navy-950/60 backdrop-blur-sm mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link to="/" className="flex items-center gap-3 mb-4">
              <div className="relative w-9 h-9">
                <div className="absolute inset-0 bg-gold-gradient rounded-xl rotate-12" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Plane className="w-5 h-5 text-navy-950 -rotate-12" strokeWidth={2.5} />
                </div>
              </div>
              <span className="font-display text-xl">
                <span className="text-white">Sky</span>
                <span className="gold-text">Wings</span>
              </span>
            </Link>
            <p className="text-white/40 text-sm leading-relaxed font-body">
              Elevating your journey with world-class service and seamless travel experiences.
            </p>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-white/50 mb-4 font-body">Travel</h4>
            <ul className="space-y-2.5">
              {['Book a Flight', 'Flight Status', 'Check-in Online', 'Baggage Info'].map(item => (
                <li key={item}><Link to="/flights" className="text-white/50 hover:text-gold-400 text-sm transition-colors font-body">{item}</Link></li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-white/50 mb-4 font-body">Account</h4>
            <ul className="space-y-2.5">
              {['My Bookings', 'Profile', 'Notifications', 'Help Center'].map(item => (
                <li key={item}><Link to="/my-bookings" className="text-white/50 hover:text-gold-400 text-sm transition-colors font-body">{item}</Link></li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-widest text-white/50 mb-4 font-body">Contact</h4>
            <ul className="space-y-3">
              <li className="flex items-center gap-2.5 text-white/40 text-sm font-body">
                <Mail className="w-4 h-4 text-gold-600 flex-shrink-0" />
                support@skywings.com
              </li>
              <li className="flex items-center gap-2.5 text-white/40 text-sm font-body">
                <Phone className="w-4 h-4 text-gold-600 flex-shrink-0" />
                +1 (800) SKY-WING
              </li>
              <li className="flex items-center gap-2.5 text-white/40 text-sm font-body">
                <MapPin className="w-4 h-4 text-gold-600 flex-shrink-0" />
                Terminal 1, International Hub
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-8 border-t border-white/8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-white/25 text-xs font-body">© 2025 SkyWings Airlines. All rights reserved.</p>
          <div className="flex gap-6">
            {['Privacy', 'Terms', 'Cookies'].map(item => (
              <a key={item} href="#" className="text-white/25 hover:text-white/50 text-xs transition-colors font-body">{item}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
