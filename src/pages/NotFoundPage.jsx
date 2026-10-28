import React from 'react';
import { Link } from 'react-router-dom';
import { Compass, Home, ArrowLeft } from 'lucide-react';
import Logo from '../components/Logo';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-surface flex flex-col justify-between p-6 sm:p-10 antialiased">
      <div>
        <Logo size="default" linkTo="/" />
      </div>

      <div className="max-w-md mx-auto w-full text-center space-y-6 my-auto py-12">
        <div className="w-20 h-20 rounded-3xl bg-navy-50 text-navy-900 flex items-center justify-center mx-auto shadow-sm">
          <Compass className="w-10 h-10 text-navy-700 animate-spin" style={{ animationDuration: '10s' }} />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-orange-500 bg-orange-50 px-3 py-1 rounded-full border border-orange-200">
            Error 404
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-navy-900 pt-2">
            Page Not Found
          </h1>
          <p className="text-xs sm:text-sm text-muted max-w-sm mx-auto leading-relaxed">
            The timetable page or resource you are looking for has been moved or does not exist.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4">
          <Link
            to="/dashboard"
            className="w-full sm:w-auto bg-navy-900 hover:bg-navy-700 text-white px-6 py-2.5 rounded-full text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4 text-lime-300" />
            <span>Go to Dashboard</span>
          </Link>
          <button
            onClick={() => window.history.back()}
            className="w-full sm:w-auto bg-white hover:bg-slate-50 text-navy-900 border border-line px-6 py-2.5 rounded-full text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-muted" />
            <span>Go Back</span>
          </button>
        </div>
      </div>

      <div className="text-center text-xs text-muted">
        &copy; {new Date().getFullYear()} PCTE SmartSchedule Timetable Organiser.
      </div>
    </div>
  );
}
