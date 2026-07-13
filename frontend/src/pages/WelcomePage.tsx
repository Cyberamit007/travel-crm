import { Link } from 'react-router-dom';
import { Mountain, ArrowRight } from 'lucide-react';

export default function WelcomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-900 via-primary-900 to-mountain-900 relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <svg width="100%" height="100%">
          <defs>
            <pattern id="mountains" x="0" y="0" width="120" height="80" patternUnits="userSpaceOnUse">
              <polygon points="0,80 60,20 120,80" fill="white" opacity="0.3" />
              <polygon points="20,80 80,10 140,80" fill="white" opacity="0.2" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#mountains)" />
        </svg>
      </div>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center p-6">
        <div className="w-20 h-20 bg-white/10 backdrop-blur-sm rounded-3xl flex items-center justify-center mb-6 border border-white/20">
          <Mountain className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-4xl sm:text-5xl font-black text-white mb-3">Travel CRM</h1>
        <p className="text-xl text-primary-200 font-medium mb-4">Trek & Pilgrimage</p>
        <p className="text-slate-300 text-sm max-w-md mb-10">
          The all-in-one platform for trek and pilgrimage travel companies — manage leads,
          campaigns, bookings, and your team from a single dashboard.
        </p>

        <Link
          to="/login"
          className="inline-flex items-center gap-2 bg-white text-slate-900 font-semibold px-6 py-3 rounded-xl hover:bg-slate-100 transition-colors"
        >
          Sign In
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <p className="relative z-10 text-center text-xs text-slate-400 pb-6">
        Travel CRM &copy; {new Date().getFullYear()} · Trek & Pilgrimage
      </p>
    </div>
  );
}
