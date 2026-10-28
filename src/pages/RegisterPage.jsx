import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTimetable } from '../context/TimetableContext';
import Logo from '../components/Logo';
import { normalizeClassId } from '../hooks/useMyEntries';
import { ALL_PCTE_CLASSES } from '../utils/timetableService';
import { Sparkles, ArrowRight, User, Mail, Lock, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { classes: timetableClasses } = useTimetable();
  const [classId, setClassId] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { registerStudent, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  const availableClasses = useMemo(() => {
    if (timetableClasses && timetableClasses.length >= 20) {
      return [...timetableClasses].sort();
    }
    return ALL_PCTE_CLASSES;
  }, [timetableClasses]);

  useEffect(() => {
    if (availableClasses.length > 0 && !classId) {
      setClassId(availableClasses[0]);
    }
  }, [availableClasses, classId]);

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  async function handleGoogleSignUp() {
    try {
      setSubmitting(true);
      const chosen = normalizeClassId(classId || availableClasses[0] || 'BCA-1A');
      await signInWithGoogle(chosen);
      toast.success('Registered with Google!');
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/unauthorized-domain') {
        toast.error('Domain not authorized in Firebase! In Firebase Console, add "ai-timetable-organiser.vercel.app" to Auth > Settings > Authorized domains.', { duration: 6000 });
      } else if (err.code !== 'auth/popup-closed-by-user') {
        toast.error(err.message || 'Google registration failed');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const cleanName = name.trim();
    const cleanEmail = email.trim();

    if (!cleanName || !cleanEmail || !password || !classId) {
      toast.error('Please fill in all registration fields');
      return;
    }

    if (!EMAIL_REGEX.test(cleanEmail)) {
      toast.error('Please enter a valid email address (e.g. name@domain.com)');
      return;
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    try {
      setSubmitting(true);
      const normalizedClass = normalizeClassId(classId);
      await registerStudent({ name: cleanName, email: cleanEmail, password, classId: normalizedClass });
      toast.success('Registration successful! Welcome to SmartSchedule.');
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Registration failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface flex items-stretch">
      {/* Left Navy Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-navy-900 via-navy-800 to-navy-700 text-white p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-green-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500 flex items-center justify-center text-white shadow-md">
              <Sparkles className="w-5 h-5 fill-white" />
            </div>
            <span className="font-serif font-bold text-2xl tracking-tight text-white">smartschedule</span>
          </div>
          <div className="inline-block mt-4 text-[11px] font-semibold text-lime-300 uppercase tracking-widest bg-white/10 px-3 py-1 rounded-full">
            PCTE Student Portal
          </div>
        </div>

        <div className="relative z-10 my-auto py-12 max-w-md">
          <h2 className="font-serif text-3xl xl:text-4xl font-semibold leading-tight text-white mb-4">
            Create your personalized student timetable in seconds.
          </h2>
          <p className="text-white/80 text-sm leading-relaxed">
            Select your exact academic batch or section to sync real-time lecture times, lab sessions, and classroom numbers right to your device.
          </p>

          <div className="mt-8 space-y-3">
            <div className="flex items-center gap-3 text-xs text-white/90">
              <div className="w-5 h-5 rounded-full bg-lime-300/20 text-lime-300 flex items-center justify-center font-bold">✓</div>
              <span>Filtered strictly to your enrolled class section</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-white/90">
              <div className="w-5 h-5 rounded-full bg-lime-300/20 text-lime-300 flex items-center justify-center font-bold">✓</div>
              <span>Live &apos;Next Class&apos; countdown and room indicator</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-white/90">
              <div className="w-5 h-5 rounded-full bg-lime-300/20 text-lime-300 flex items-center justify-center font-bold">✓</div>
              <span>Instant alerts when a lecture moves to a different venue</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-xs text-white/40">
          Faculty and staff accounts are provisioned directly by PCTE Administration.
        </div>
      </div>

      {/* Right Form Area */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md bg-white rounded-panel p-8 sm:p-10 border border-line shadow-soft">
          <div className="lg:hidden mb-6">
            <Logo size="default" linkTo="/" />
          </div>

          <div className="mb-6">
            <div className="inline-block px-2.5 py-0.5 rounded-full bg-green-50 text-green-700 text-[11px] font-bold uppercase mb-2">
              Student Registration
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-navy-900">
              Join SmartSchedule
            </h1>
            <p className="text-xs sm:text-sm text-muted mt-1">
              Create your account to view your section&apos;s clash-free timetable
            </p>
          </div>

          {/* Google Sign Up Button */}
          <button
            type="button"
            onClick={handleGoogleSignUp}
            disabled={submitting}
            className="w-full bg-white hover:bg-slate-50 text-navy-900 border border-line hover:border-slate-300 py-2.5 px-4 rounded-full text-xs sm:text-sm font-semibold transition-all shadow-sm hover:shadow flex items-center justify-center gap-3 cursor-pointer disabled:opacity-50 mb-5"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Sign up with Google (Class: {classId || 'BCA-1E'})</span>
          </button>

          {/* Divider */}
          <div className="relative flex items-center justify-center mb-5">
            <div className="border-t border-line w-full" />
            <span className="bg-white px-3 text-[11px] font-medium text-muted uppercase tracking-wider absolute">
              or fill details manually
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-navy-900 uppercase tracking-wide mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="e.g. Rahul Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-surface border border-line rounded-xl pl-10 pr-4 py-2.5 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-green-600/20 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-navy-900 uppercase tracking-wide mb-1.5">
                Student Email (PCTE Domain or Personal)
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="e.g. rahul.bca@pcte.edu.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-surface border border-line rounded-xl pl-10 pr-4 py-2.5 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-green-600/20 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-navy-900 uppercase tracking-wide mb-1.5">
                Class / Section
              </label>
              <div className="relative">
                <BookOpen className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                {availableClasses && availableClasses.length > 0 ? (
                  <select
                    value={classId}
                    onChange={(e) => setClassId(e.target.value)}
                    className="w-full bg-surface border border-line rounded-xl pl-10 pr-4 py-2.5 text-sm font-semibold text-navy-900 focus:outline-none focus:ring-2 focus:ring-green-600/20 focus:bg-white transition-all"
                  >
                    {availableClasses.map((cls) => (
                      <option key={cls} value={cls}>
                        {cls}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    placeholder="e.g. BCA-1E or BTECH-CSE-7A"
                    value={classId}
                    onChange={(e) => setClassId(e.target.value.toUpperCase())}
                    className="w-full bg-surface border border-line rounded-xl pl-10 pr-4 py-2.5 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-green-600/20 focus:bg-white transition-all"
                  />
                )}
              </div>
              <p className="text-[11px] text-muted mt-1">
                Classes are populated directly from the published PCTE master schedule.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-navy-900 uppercase tracking-wide mb-1.5">
                Create Password (min 8 chars)
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-surface border border-line rounded-xl pl-10 pr-4 py-2.5 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-green-600/20 focus:bg-white transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-full text-sm font-bold transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
            >
              {submitting ? (
                <span>Registering student...</span>
              ) : (
                <>
                  <span>Complete Student Registration</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-line text-center">
            <p className="text-xs text-muted">
              Already have an account?{' '}
              <Link to="/login" className="font-bold text-navy-900 hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
