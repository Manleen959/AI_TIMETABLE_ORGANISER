import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';
import { ShieldCheck, ArrowRight, User, Mail, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SetupAdminPage() {
  const [adminExists, setAdminExists] = useState(false);
  const [checking, setChecking] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { checkAdminExists, setupAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    async function verify() {
      const exists = await checkAdminExists();
      setAdminExists(exists);
      setChecking(false);
    }
    verify();
  }, [checkAdminExists]);

  async function handleSetup(e) {
    e.preventDefault();
    if (!name || !email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      setSubmitting(true);
      await setupAdmin({ name, email, password });
      toast.success('Administrator account provisioned successfully!');
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Admin setup failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-surface flex items-stretch">
      {/* Left Navy Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-navy-900 via-navy-800 to-navy-700 text-white p-12 flex-col justify-between relative overflow-hidden">
        <div className="relative z-10">
          <Logo size="default" linkTo="/" />
          <div className="inline-block mt-4 text-[11px] font-semibold text-lime-300 uppercase tracking-widest bg-white/10 px-3 py-1 rounded-full">
            PCTE System Administration
          </div>
        </div>

        <div className="relative z-10 my-auto py-12 max-w-md">
          <h2 className="font-serif text-3xl xl:text-4xl font-semibold leading-tight text-white mb-4">
            Master Timetable Provisioning
          </h2>
          <p className="text-white/80 text-sm leading-relaxed">
            One-time administrative root setup for PCTE Ludhiana. The system administrator possesses authority to upload Excel schedules, manage faculty profiles, audit version history, and broadcast timetable revisions.
          </p>
        </div>

        <div className="relative z-10 text-xs text-white/40">
          Protected route: Setup is permanently locked once an administrator is registered.
        </div>
      </div>

      {/* Right Form Area */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md bg-white rounded-panel p-8 sm:p-10 border border-line shadow-soft">
          <div className="lg:hidden mb-6">
            <Logo size="default" linkTo="/" />
          </div>

          {checking ? (
            <div className="py-12 text-center text-muted text-sm">
              Checking administrative status...
            </div>
          ) : adminExists ? (
            <div className="text-center py-6">
              <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="font-serif text-2xl font-bold text-navy-900 mb-2">
                Administrator Already Provisioned
              </h2>
              <p className="text-sm text-muted mb-6">
                An administrator account already exists for this PCTE SmartSchedule installation. For security, additional root accounts cannot be initialized via this route.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 bg-navy-900 hover:bg-navy-700 text-white px-6 py-2.5 rounded-full text-sm font-bold transition-all shadow-sm"
              >
                <span>Proceed to Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div>
              <div className="mb-6">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 text-[11px] font-bold uppercase mb-2">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                  <span>One-Time System Initialization</span>
                </div>
                <h1 className="font-serif text-2xl sm:text-3xl font-bold text-navy-900">
                  Setup Admin
                </h1>
                <p className="text-xs sm:text-sm text-muted mt-1">
                  Create the primary administrator account for PCTE SmartSchedule
                </p>
              </div>

              <form onSubmit={handleSetup} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-navy-900 uppercase tracking-wide mb-1.5">
                    Admin Full Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dr. Anurag Sharma"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-surface border border-line rounded-xl pl-10 pr-4 py-2.5 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-700/20 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-navy-900 uppercase tracking-wide mb-1.5">
                    Admin Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      placeholder="e.g. admin@pcte.edu.in"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-surface border border-line rounded-xl pl-10 pr-4 py-2.5 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-700/20 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-navy-900 uppercase tracking-wide mb-1.5">
                    Master Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      placeholder="••••••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-surface border border-line rounded-xl pl-10 pr-4 py-2.5 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-700/20 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-navy-900 hover:bg-navy-700 text-white py-3 rounded-full text-sm font-bold transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-2"
                >
                  {submitting ? (
                    <span>Initializing Admin...</span>
                  ) : (
                    <>
                      <span>Provision Root Admin</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
