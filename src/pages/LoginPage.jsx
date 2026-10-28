import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';
import { Sparkles, ArrowRight, Lock, Mail, ShieldCheck, Briefcase, GraduationCap } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetting, setResetting] = useState(false);
  const { login, demoLogin, signInWithGoogle, resetPassword } = useAuth();
  const navigate = useNavigate();

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  async function handleGoogleSignIn() {
    try {
      setSubmitting(true);
      await signInWithGoogle('BCA-1A');
      toast.success('Signed in with Google!');
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/unauthorized-domain') {
        toast.error('Domain not authorized in Firebase! In Firebase Console, add "ai-timetable-organiser.vercel.app" to Auth > Settings > Authorized domains.', { duration: 6000 });
      } else if (err.code !== 'auth/popup-closed-by-user') {
        toast.error(err.message || 'Google Sign-In failed');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      toast.error('Please enter both email and password');
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
      await login(cleanEmail, password);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Login failed. Please check credentials or use Quick Demo.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleForgotPassword(e) {
    e.preventDefault();
    const targetEmail = (resetEmail || email).trim();
    if (!targetEmail) {
      toast.error('Please enter your email to receive a password reset link');
      return;
    }
    if (!EMAIL_REGEX.test(targetEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    try {
      setResetting(true);
      await resetPassword(targetEmail);
      toast.success(`Password reset email sent to ${targetEmail}! Check your inbox.`);
      setForgotOpen(false);
    } catch (err) {
      toast.error(err.message || 'Failed to send reset email');
    } finally {
      setResetting(false);
    }
  }

  function handleQuickDemo(role) {
    demoLogin(role);
    toast.success(`Logged in as Demo ${role.toUpperCase()}`);
    navigate('/dashboard');
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
            PCTE Ludhiana Academic Timetable
          </div>
        </div>

        <div className="relative z-10 my-auto py-12 max-w-md">
          <h2 className="font-serif text-3xl xl:text-4xl font-semibold leading-tight text-white mb-4">
            Welcome back to the intelligent timetable hub.
          </h2>
          <p className="text-white/80 text-sm leading-relaxed">
            Access your personalized classes, review room changes, verify clash-free lab allocations, and monitor faculty schedule updates in real-time.
          </p>

          <div className="mt-8 space-y-3">
            <div className="flex items-center gap-3 text-xs text-white/90">
              <div className="w-5 h-5 rounded-full bg-green-600/40 flex items-center justify-center text-lime-300 font-bold">✓</div>
              <span>Single Sign-On with verified PCTE credentials</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-white/90">
              <div className="w-5 h-5 rounded-full bg-green-600/40 flex items-center justify-center text-lime-300 font-bold">✓</div>
              <span>Automatic notification of rescheduled periods</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-white/90">
              <div className="w-5 h-5 rounded-full bg-green-600/40 flex items-center justify-center text-lime-300 font-bold">✓</div>
              <span>Instant timetable change archives &amp; version tracking</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-xs text-white/40">
          &copy; {new Date().getFullYear()} PCTE Group of Institutes. Final Year Project.
        </div>
      </div>

      {/* Right Form Area */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md bg-white rounded-panel p-8 sm:p-10 border border-line shadow-soft">
          {/* Logo on mobile */}
          <div className="lg:hidden mb-6">
            <Logo size="default" linkTo="/" />
          </div>

          <div className="mb-6">
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-navy-900">
              Sign In
            </h1>
            <p className="text-xs sm:text-sm text-muted mt-1">
              Enter your credentials to access your SmartSchedule dashboard
            </p>
          </div>

          {/* Quick Demo Access (One-Click) */}
          <div className="mb-6 p-3.5 bg-surface rounded-2xl border border-line">
            <div className="text-[11px] font-bold uppercase tracking-wider text-muted mb-2 flex items-center justify-between">
              <span>Quick Demo Test Accounts</span>
              <Sparkles className="w-3.5 h-3.5 text-orange-500" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemo('admin')}
                className="bg-navy-900 text-white hover:bg-navy-700 py-1.5 px-2 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer"
              >
                <ShieldCheck className="w-3 h-3" />
                <span>Admin</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo('teacher')}
                className="bg-orange-500 text-white hover:bg-orange-600 py-1.5 px-2 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer"
              >
                <Briefcase className="w-3 h-3" />
                <span>Faculty</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo('student')}
                className="bg-green-600 text-white hover:bg-green-700 py-1.5 px-2 rounded-xl text-[11px] font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer"
              >
                <GraduationCap className="w-3 h-3" />
                <span>Student</span>
              </button>
            </div>
          </div>

          {/* Google Sign In Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
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
            <span>Sign in with Google</span>
          </button>

          {/* Divider */}
          <div className="relative flex items-center justify-center mb-5">
            <div className="border-t border-line w-full" />
            <span className="bg-white px-3 text-[11px] font-medium text-muted uppercase tracking-wider absolute">
              or email &amp; password
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-navy-900 uppercase tracking-wide mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="e.g. rahul.bca@pcte.edu.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-surface border border-line rounded-xl pl-10 pr-4 py-2.5 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-700/20 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-navy-900 uppercase tracking-wide">
                  Password (min 8 chars)
                </label>
                <button
                  type="button"
                  onClick={() => setForgotOpen(!forgotOpen)}
                  className="text-[11px] font-semibold text-green-700 hover:text-green-800 hover:underline cursor-pointer"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-surface border border-line rounded-xl pl-10 pr-4 py-2.5 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-700/20 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Inline Forgot Password Box */}
            {forgotOpen && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-3 animate-in fade-in">
                <div className="text-xs font-bold text-amber-950">
                  Reset your password
                </div>
                <p className="text-[11px] text-amber-800">
                  Enter your email address and we will send you a secure password reset link.
                </p>
                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="Enter registered email"
                    value={resetEmail || email}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="flex-1 bg-white border border-amber-300 rounded-xl px-3 py-1.5 text-xs text-navy-900 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={resetting}
                    className="bg-amber-900 hover:bg-amber-800 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
                  >
                    {resetting ? 'Sending...' : 'Send Link'}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-navy-900 hover:bg-navy-700 text-white py-3 rounded-full text-sm font-bold transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <span>Signing in...</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-line text-center space-y-2">
            <p className="text-xs text-muted">
              Are you a student without an account?{' '}
              <Link to="/register" className="font-bold text-green-600 hover:underline">
                Register here
              </Link>
            </p>
            <p className="text-[11px] text-muted">
              First time admin?{' '}
              <Link to="/setup-admin" className="font-semibold text-navy-700 hover:underline">
                Setup Admin
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
