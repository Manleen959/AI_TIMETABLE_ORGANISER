import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import HeroMockup from '../components/HeroMockup';
import Logo from '../components/Logo';
import { useAuth } from '../context/AuthContext';
import { 
  Sparkles, 
  ArrowRight, 
  FileSpreadsheet, 
  CheckCircle2, 
  UserCheck, 
  Bot, 
  CalendarRange, 
  CalendarDays, 
  Users2, 
  Zap, 
  ShieldAlert, 
  DownloadCloud 
} from 'lucide-react';

export default function LandingPage() {
  const { demoLogin } = useAuth();
  const navigate = useNavigate();

  function handleDemoClick() {
    demoLogin('student', { classId: 'BCA-1E' });
    navigate('/dashboard');
  }

  return (
    <div className="min-h-screen bg-surface text-ink flex flex-col selection:bg-lime-300 selection:text-ink">
      {/* Top Navbar */}
      <Navbar />

      {/* Hero Section */}
      <section className="px-4 sm:px-8 lg:px-12 pt-6 sm:pt-10 pb-16">
        <div className="max-w-[1400px] mx-auto bg-gradient-to-br from-navy-900 via-navy-800 to-navy-700 rounded-hero p-6 sm:p-12 lg:p-16 text-white relative shadow-hero overflow-hidden border border-navy-700/60">
          {/* Subtle background glow effect */}
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-navy-700/40 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-green-600/20 rounded-full blur-3xl pointer-events-none" />

          {/* Centered Hero Content */}
          <div className="max-w-4xl mx-auto text-center relative z-10">
            {/* Small light line */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs sm:text-sm font-medium text-lime-200 mb-6">
              <Sparkles className="w-4 h-4 text-lime-300" />
              <span>AI timetable organiser for PCTE Ludhiana</span>
            </div>

            {/* Huge Serif White Heading */}
            <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-semibold leading-[1.12] tracking-tight text-white mb-8">
              Upload once. Clash-free by design. Organised by AI.
            </h1>

            {/* Two CTA Blocks Side by Side separated by a thin vertical divider */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-10 my-8 py-3 max-w-xl mx-auto">
              {/* Left CTA: Outlined White Pill "View demo" */}
              <div className="flex flex-col items-center text-center">
                <button
                  onClick={handleDemoClick}
                  className="border-2 border-white text-white hover:bg-white hover:text-navy-900 px-7 py-3 rounded-full text-sm font-bold transition-all duration-300 shadow-sm hover:shadow-lg flex items-center gap-2 cursor-pointer"
                >
                  <span>View demo</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <span className="text-[11px] text-white/70 mt-2 font-medium">
                  See a sample timetable
                </span>
              </div>

              {/* Thin Vertical Divider (horizontal on mobile) */}
              <div className="hidden sm:block w-[1px] h-12 bg-white/20" />
              <div className="sm:hidden w-24 h-[1px] bg-white/20" />

              {/* Right CTA: Lime-300 Pill "Get started" with dark text */}
              <div className="flex flex-col items-center text-center">
                <Link
                  to="/register"
                  className="bg-lime-300 hover:bg-lime-200 text-ink px-8 py-3 rounded-full text-sm font-bold transition-all duration-300 shadow-md hover:shadow-xl hover:scale-105 flex items-center gap-2"
                >
                  <span>Get started</span>
                  <Sparkles className="w-4 h-4 fill-ink" />
                </Link>
                <span className="text-[11px] text-white/70 mt-2 font-medium">
                  Students: register in 30 seconds
                </span>
              </div>
            </div>
          </div>

          {/* Bottom of the Hero: HeroMockup Peeking up */}
          <div className="mt-8 lg:mt-12 -mb-6 sm:-mb-12 lg:-mb-16">
            <HeroMockup />
          </div>
        </div>
      </section>

      {/* "How it works" in 3 numbered cards */}
      <section id="how-it-works" className="py-20 px-4 sm:px-8 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-xs font-bold text-green-600 uppercase tracking-widest bg-green-50 px-3 py-1 rounded-full">
            Streamlined Workflow
          </span>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-navy-900 mt-3">
            How SmartSchedule works
          </h2>
          <p className="text-sm sm:text-base text-muted mt-2">
            Transform complex spreadsheets into conflict-free, personalized class schedules in seconds.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="bg-white rounded-card p-8 border border-line shadow-soft relative overflow-hidden group hover:border-navy-700/30 transition-all duration-300">
            <div className="w-12 h-12 rounded-2xl bg-navy-50 text-navy-900 flex items-center justify-center font-serif font-bold text-xl mb-6 group-hover:bg-navy-900 group-hover:text-white transition-colors">
              1
            </div>
            <h3 className="font-serif font-bold text-xl text-navy-900 mb-2">
              Upload Excel
            </h3>
            <p className="text-sm text-muted leading-relaxed">
              Drag and drop any PCTE master schedule spreadsheet (.xlsx, .xls, .csv). Our intelligent parser automatically identifies days, class sections, periods, and room mappings.
            </p>
            <div className="mt-6 pt-4 border-t border-line/60 flex items-center gap-2 text-xs font-semibold text-navy-700">
              <FileSpreadsheet className="w-4 h-4 text-orange-500" />
              <span>Universal layout detection</span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white rounded-card p-8 border border-line shadow-soft relative overflow-hidden group hover:border-navy-700/30 transition-all duration-300">
            <div className="w-12 h-12 rounded-2xl bg-green-50 text-green-700 flex items-center justify-center font-serif font-bold text-xl mb-6 group-hover:bg-green-600 group-hover:text-white transition-colors">
              2
            </div>
            <h3 className="font-serif font-bold text-xl text-navy-900 mb-2">
              AI finds &amp; fixes clashes
            </h3>
            <p className="text-sm text-muted leading-relaxed">
              Autonomous clash verification audits faculty overlaps, room double-bookings, lab requirements, and contiguous tea breaks before any schedule goes live.
            </p>
            <div className="mt-6 pt-4 border-t border-line/60 flex items-center gap-2 text-xs font-semibold text-green-700">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span>100% clash-free validation</span>
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-white rounded-card p-8 border border-line shadow-soft relative overflow-hidden group hover:border-navy-700/30 transition-all duration-300">
            <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center font-serif font-bold text-xl mb-6 group-hover:bg-orange-500 group-hover:text-white transition-colors">
              3
            </div>
            <h3 className="font-serif font-bold text-xl text-navy-900 mb-2">
              Everyone gets a personal timetable
            </h3>
            <p className="text-sm text-muted leading-relaxed">
              Students see their specific batch timetable and next upcoming class. Faculty see their personal teaching rooms, slots, and lab duties with one-click substitute finding.
            </p>
            <div className="mt-6 pt-4 border-t border-line/60 flex items-center gap-2 text-xs font-semibold text-navy-900">
              <UserCheck className="w-4 h-4 text-navy-700" />
              <span>Role-tailored dashboards</span>
            </div>
          </div>
        </div>
      </section>

      {/* 6-Card Features Section */}
      <section id="product" className="py-16 px-4 sm:px-8 max-w-7xl mx-auto w-full">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <span className="text-xs font-bold text-navy-700 uppercase tracking-widest bg-navy-50 px-3 py-1 rounded-full">
            Engineering Excellence
          </span>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-navy-900 mt-3">
            Designed for Academic Scale
          </h2>
          <p className="text-sm sm:text-base text-muted mt-2">
            Built ground-up for PCTE Ludhiana with modular architecture, strict role separation, and responsive design.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Feature 1 */}
          <div className="bg-white rounded-card p-6 border border-line shadow-soft hover:shadow-soft-lg transition-all">
            <div className="w-10 h-10 rounded-2xl bg-navy-50 text-navy-900 flex items-center justify-center mb-4">
              <Users2 className="w-5 h-5 text-navy-900" />
            </div>
            <h4 className="font-serif font-bold text-lg text-navy-900 mb-1.5">
              Role-based access
            </h4>
            <p className="text-xs sm:text-sm text-muted leading-relaxed">
              Granular access control for Students, Faculty, and Admin. Students self-register to their section; faculty accounts are securely provisioned by administration.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-white rounded-card p-6 border border-line shadow-soft hover:shadow-soft-lg transition-all">
            <div className="w-10 h-10 rounded-2xl bg-green-50 text-green-700 flex items-center justify-center mb-4">
              <FileSpreadsheet className="w-5 h-5 text-green-600" />
            </div>
            <h4 className="font-serif font-bold text-lg text-navy-900 mb-1.5">
              Smart Excel import
            </h4>
            <p className="text-xs sm:text-sm text-muted leading-relaxed">
              Dynamic SheetJS engine handles merged period headers, multi-column sub-headers, breaks, and arbitrary period structures without requiring code changes.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-white rounded-card p-6 border border-line shadow-soft hover:shadow-soft-lg transition-all">
            <div className="w-10 h-10 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mb-4">
              <Bot className="w-5 h-5 text-orange-500" />
            </div>
            <h4 className="font-serif font-bold text-lg text-navy-900 mb-1.5">
              AI insights
            </h4>
            <p className="text-xs sm:text-sm text-muted leading-relaxed">
              Instant schedule diagnostics identify underutilized laboratories, uneven faculty workloads, and recommend optimal schedule distribution.
            </p>
          </div>

          {/* Feature 4 */}
          <div className="bg-white rounded-card p-6 border border-line shadow-soft hover:shadow-soft-lg transition-all">
            <div className="w-10 h-10 rounded-2xl bg-lime-100 text-ink flex items-center justify-center mb-4">
              <Zap className="w-5 h-5 text-ink" />
            </div>
            <h4 className="font-serif font-bold text-lg text-navy-900 mb-1.5">
              Auto-Organiser
            </h4>
            <p className="text-xs sm:text-sm text-muted leading-relaxed">
              Dynamic timetable grid reads timestamps directly from Firestore, renders break spacing, highlights active days, and color-codes computer labs.
            </p>
          </div>

          {/* Feature 5 */}
          <div className="bg-white rounded-card p-6 border border-line shadow-soft hover:shadow-soft-lg transition-all">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-4">
              <ShieldAlert className="w-5 h-5 text-rose-600" />
            </div>
            <h4 className="font-serif font-bold text-lg text-navy-900 mb-1.5">
              Substitute finder
            </h4>
            <p className="text-xs sm:text-sm text-muted leading-relaxed">
              When faculty take leave, SmartSchedule immediately identifies colleagues who teach similar subjects and are completely free during that specific period.
            </p>
          </div>

          {/* Feature 6 */}
          <div className="bg-white rounded-card p-6 border border-line shadow-soft hover:shadow-soft-lg transition-all">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center mb-4">
              <DownloadCloud className="w-5 h-5 text-indigo-600" />
            </div>
            <h4 className="font-serif font-bold text-lg text-navy-900 mb-1.5">
              Calendar export &amp; History
            </h4>
            <p className="text-xs sm:text-sm text-muted leading-relaxed">
              Every import archives previous versions into immutable Firestore history with single-click restore and full effective-from date tracking.
            </p>
          </div>
        </div>
      </section>

      {/* For Faculty & Students Sections */}
      <section id="for-faculty" className="py-12 px-4 sm:px-8 max-w-7xl mx-auto w-full">
        <div className="bg-gradient-to-r from-navy-900 to-navy-800 rounded-panel p-8 sm:p-12 text-white flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-xl">
            <span className="text-xs font-bold text-lime-300 uppercase tracking-widest">
              Empowering Professors
            </span>
            <h3 className="text-2xl sm:text-3xl font-serif font-bold mt-2">
              Never check an outdated notice board again.
            </h3>
            <p className="text-sm text-white/80 mt-2 leading-relaxed">
              Log in to see your exact teaching commitments for today, room allocations across ET and CS blocks, and instant student batch details.
            </p>
          </div>
          <button
            onClick={() => {
              demoLogin('teacher', { facultyCode: 'GURJEET' });
              navigate('/dashboard');
            }}
            className="bg-lime-300 hover:bg-lime-200 text-ink px-6 py-3 rounded-full text-xs sm:text-sm font-bold transition-all shadow-md flex-shrink-0 cursor-pointer"
          >
            Preview Faculty Schedule
          </button>
        </div>
      </section>

      <section id="for-students" className="py-12 px-4 sm:px-8 max-w-7xl mx-auto w-full">
        <div className="bg-white border border-line rounded-panel p-8 sm:p-12 shadow-soft flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="max-w-xl">
            <span className="text-xs font-bold text-green-600 uppercase tracking-widest">
              For PCTE Students
            </span>
            <h3 className="text-2xl sm:text-3xl font-serif font-bold text-navy-900 mt-2">
              Your entire week in your pocket.
            </h3>
            <p className="text-sm text-muted mt-2 leading-relaxed">
              Select your class section (BCA 1E, BCA 2A, BTech CSE 7A...) and get real-time room directions, subject alerts, and today&apos;s next class counter.
            </p>
          </div>
          <Link
            to="/register"
            className="bg-green-600 hover:bg-green-700 text-white px-7 py-3 rounded-full text-xs sm:text-sm font-bold transition-all shadow-md flex-shrink-0"
          >
            Register Student Account
          </Link>
        </div>
      </section>

      {/* Dark Footer */}
      <footer className="mt-auto bg-navy-900 text-white border-t border-navy-800 py-12 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col items-center md:items-start">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-orange-500 flex items-center justify-center text-white">
                <Sparkles className="w-4 h-4 fill-white" />
              </div>
              <span className="font-serif font-bold text-xl tracking-tight text-white">smartschedule</span>
            </div>
            <p className="text-xs text-white/60 mt-2 text-center md:text-left">
              PCTE Group of Institutes, Ludhiana — BTech Final Year Project.
            </p>
          </div>

          <div className="flex items-center gap-6 text-xs text-white/70">
            <Link to="/login" className="hover:text-white transition-colors">Admin Login</Link>
            <Link to="/register" className="hover:text-white transition-colors">Student Register</Link>
            <Link to="/setup-admin" className="hover:text-white transition-colors">Setup Admin</Link>
          </div>

          <div className="text-xs text-white/40 text-center md:text-right">
            &copy; {new Date().getFullYear()} PCTE Ludhiana. All rights reserved.
          </div>
        </div>
      </footer>

      {/* Fixed bottom-right dark-blue pill with sparkle icon "Ask SmartSchedule AI" linking to /login */}
      <Link
        to="/login"
        className="fixed bottom-6 right-6 z-50 bg-navy-900 hover:bg-navy-700 text-white px-5 py-3 rounded-full shadow-soft-lg border border-navy-700/80 flex items-center gap-2.5 text-xs sm:text-sm font-semibold transition-all duration-300 hover:scale-105"
      >
        <div className="w-5 h-5 rounded-full bg-lime-300 text-ink flex items-center justify-center">
          <Sparkles className="w-3.5 h-3.5 fill-ink" />
        </div>
        <span>Ask SmartSchedule AI</span>
      </Link>
    </div>
  );
}
