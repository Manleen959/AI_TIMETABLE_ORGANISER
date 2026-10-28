import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Logo from './Logo';
import { useAuth } from '../context/AuthContext';
import { ArrowRight, Play, Sparkles } from 'lucide-react';

export default function Navbar() {
  const { user, role, demoLogin } = useAuth();
  const navigate = useNavigate();

  function scrollToSection(id) {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  }

  function handleViewDemo() {
    demoLogin('student', { classId: 'BCA-1E' });
    navigate('/dashboard');
  }

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-line px-4 sm:px-8 py-3.5 transition-all">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Logo Left */}
        <Logo size="default" linkTo="/" />

        {/* Links Middle (smooth scroll) */}
        <div className="hidden md:flex items-center gap-7 text-sm font-medium text-muted">
          <button
            onClick={() => scrollToSection('product')}
            className="hover:text-navy-900 transition-colors cursor-pointer"
          >
            Product
          </button>
          <button
            onClick={() => scrollToSection('how-it-works')}
            className="hover:text-navy-900 transition-colors cursor-pointer"
          >
            How it works
          </button>
          <button
            onClick={() => scrollToSection('for-faculty')}
            className="hover:text-navy-900 transition-colors cursor-pointer"
          >
            For Faculty
          </button>
          <button
            onClick={() => scrollToSection('for-students')}
            className="hover:text-navy-900 transition-colors cursor-pointer"
          >
            For Students
          </button>
        </div>

        {/* Right CTA */}
        <div className="flex items-center gap-3 sm:gap-4">
          {user ? (
            <Link
              to="/dashboard"
              className="bg-navy-900 text-white hover:bg-navy-700 px-5 py-2.5 rounded-full text-xs sm:text-sm font-medium transition-all shadow-sm flex items-center gap-2"
            >
              <span>Go to App</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="text-xs sm:text-sm font-medium text-navy-900 hover:text-navy-700 transition-colors px-2 py-1"
              >
                Login
              </Link>

              <button
                onClick={handleViewDemo}
                className="hidden sm:inline-flex items-center gap-1.5 border border-navy-900 text-navy-900 hover:bg-navy-50/60 px-4 py-2 rounded-full text-xs sm:text-sm font-medium transition-all"
              >
                <Play className="w-3.5 h-3.5 fill-navy-900" />
                <span>View demo</span>
              </button>

              <Link
                to="/register"
                className="bg-green-600 hover:bg-green-700 text-white px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all shadow-sm hover:shadow-md flex items-center gap-1.5"
              >
                <span>Get started</span>
                <Sparkles className="w-3.5 h-3.5" />
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
