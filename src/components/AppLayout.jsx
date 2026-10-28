import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Logo from './Logo';
import { getDerivedNotifications } from '../utils/featureService';
import { 
  LayoutDashboard, 
  Calendar, 
  UploadCloud, 
  Search, 
  Users, 
  LogOut, 
  Menu, 
  X, 
  ShieldCheck, 
  GraduationCap, 
  Briefcase, 
  Sparkles,
  Compass,
  Wand2,
  UserCheck,
  Terminal,
  Bell,
  BookOpen,
  CheckSquare,
  ArrowLeftRight,
  User,
  Settings
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AppLayout() {
  const { user, profile, role, logout } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    async function checkUnread() {
      try {
        const { unreadCount: count } = await getDerivedNotifications({
          role,
          classId: profile?.classId,
          facultyCode: profile?.facultyCode,
          lastSeen: profile?.lastSeen,
        });
        setUnreadCount(count);
      } catch (e) {
        console.warn('Error reading unread notifications:', e);
      }
    }
    checkUnread();
  }, [role, profile?.classId, profile?.facultyCode, profile?.lastSeen]);

  async function handleLogout() {
    await logout();
    toast.success('Signed out successfully');
    navigate('/login');
  }

  function handleSearchSubmit(e) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    if (role === 'admin') {
      navigate(`/browse?q=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      toast(`Searching timetable for "${searchQuery}"`, { icon: '🔍' });
    }
  }

  // Navigation items based on role
  const navItems = [];
  if (role === 'student') {
    navItems.push(
      { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { label: 'My Timetable', path: '/my-timetable', icon: Calendar },
      { label: 'Attendance', path: '/attendance', icon: UserCheck },
      { label: 'Planner', path: '/planner', icon: CheckSquare },
      { label: 'Resources', path: '/resources', icon: BookOpen },
      { label: 'Notifications', path: '/notifications', icon: Bell },
      { label: 'Profile', path: '/profile', icon: User }
    );
  } else if (role === 'teacher') {
    navItems.push(
      { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { label: 'My Schedule', path: '/my-schedule', icon: Calendar },
      { label: 'Attendance', path: '/attendance', icon: UserCheck },
      { label: 'Class Hub', path: '/class-hub', icon: Users },
      { label: 'Swaps', path: '/swaps', icon: ArrowLeftRight },
      { label: 'Report Absence', path: '/report-absence', icon: UserCheck },
      { label: 'Notifications', path: '/notifications', icon: Bell },
      { label: 'Profile', path: '/profile', icon: User }
    );
  } else if (role === 'admin') {
    navItems.push(
      { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
      { label: 'Auto-Organiser', path: '/auto-organiser', icon: Wand2 },
      { label: 'AI Insights', path: '/insights', icon: Sparkles },
      { label: 'Substitutes', path: '/substitutes', icon: UserCheck },
      { label: 'Swaps', path: '/swaps', icon: ArrowLeftRight },
      { label: 'Import Timetable', path: '/import', icon: UploadCloud },
      { label: 'Browse Timetable', path: '/browse', icon: Compass },
      { label: 'Manage Teachers', path: '/manage-teachers', icon: Users },
      { label: 'API Test', path: '/api-test', icon: Terminal },
      { label: 'Profile', path: '/profile', icon: User }
    );
  } else {
    navItems.push(
      { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard }
    );
  }

  const roleBadges = {
    admin: { label: 'Admin', color: 'bg-navy-900 text-white', icon: ShieldCheck },
    teacher: { label: 'Faculty', color: 'bg-orange-500 text-white', icon: Briefcase },
    student: { label: 'Student', color: 'bg-green-600 text-white', icon: GraduationCap },
  };

  const currentBadge = roleBadges[role] || roleBadges.student;
  const RoleIcon = currentBadge.icon;

  return (
    <div className="min-h-screen bg-surface flex flex-col antialiased">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-line px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          {/* Left: Mobile trigger & Logo */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-navy-900 rounded-xl hover:bg-slate-100 cursor-pointer"
              aria-label="Toggle Navigation"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <Logo size="small" linkTo="/dashboard" />
          </div>

          {/* Middle: Search Pill */}
          <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md hidden sm:block">
            <div className="relative">
              <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={role === 'admin' ? "Search class, teacher, or venue..." : "Quick search subjects..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-line rounded-full pl-9 pr-4 py-2 text-xs font-medium text-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-700/20 focus:bg-white transition-all shadow-sm"
              />
            </div>
          </form>

          {/* Right: Notification Bell, User name, Role badge, Logout */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* S1: Top Bar Notification Bell with Unread Badge */}
            <Link
              to="/notifications"
              className="relative p-2 rounded-full text-navy-900 hover:bg-slate-100 transition-colors"
              title="Notification Centre"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-orange-500 text-white font-bold text-[9px] w-4 h-4 rounded-full flex items-center justify-center animate-pulse shadow-sm">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>

            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-bold text-navy-900">
                {profile?.name || user?.displayName || user?.email?.split('@')[0] || 'User'}
              </span>
              <span className="text-[10px] text-muted">
                {profile?.classId ? `Class: ${profile.classId}` : (profile?.facultyCode ? `Code: ${profile.facultyCode}` : profile?.email)}
              </span>
            </div>

            {/* Role Badge */}
            <div className={`px-2.5 py-1 rounded-full text-[11px] font-bold flex items-center gap-1.5 shadow-sm ${currentBadge.color}`}>
              <RoleIcon className="w-3.5 h-3.5" />
              <span>{currentBadge.label}</span>
            </div>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              title="Logout"
              className="p-2 rounded-full text-muted hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Body with Sidebar */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto p-4 sm:p-6 gap-6">
        {/* Desktop Left Icon Sidebar */}
        <aside className="hidden md:flex flex-col w-56 flex-shrink-0 bg-white rounded-panel p-4 border border-line shadow-soft sticky top-20 h-[calc(100vh-6rem)] overflow-y-auto scrollbar-none">
          <div className="text-[11px] font-bold uppercase text-muted tracking-wider px-3 mb-3">
            Navigation
          </div>

          <nav className="flex flex-col gap-1.5 flex-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                      isActive
                        ? 'bg-green-600 text-white shadow-sm shadow-green-600/20'
                        : 'text-muted hover:text-navy-900 hover:bg-slate-50'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Quick AI Timetable Insight Card at bottom of sidebar */}
          <div className="bg-navy-900 text-white p-3.5 rounded-2xl relative overflow-hidden mt-4 shadow-md">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-5 h-5 rounded-full bg-lime-300 flex items-center justify-center text-ink">
                <Sparkles className="w-3 h-3" />
              </div>
              <span className="text-[11px] font-serif font-bold text-lime-300">SmartEngine</span>
            </div>
            <p className="text-[10px] text-white/80 leading-snug">
              PCTE schedule auto-synchronized and clash-verified.
            </p>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 min-w-0 pb-16 md:pb-0">
          <Outlet />
        </main>
      </div>

      {/* Mobile Drawer (When hamburger clicked) */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-navy-900/40 backdrop-blur-sm flex">
          <div className="w-64 bg-white h-full p-4 flex flex-col justify-between shadow-2xl animate-in slide-in-from-left">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-line mb-3">
                <Logo size="small" />
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded-lg text-muted hover:text-navy-900"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex flex-col gap-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold ${
                          isActive
                            ? 'bg-green-600 text-white font-bold'
                            : 'text-muted hover:text-navy-900 hover:bg-slate-50'
                        }`
                      }
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </nav>
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 p-3 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}

      {/* Mobile Bottom Bar navigation (top 5 essential items) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-line px-2 py-1.5 flex items-center justify-around shadow-lg">
        {navItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex flex-col items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] font-medium transition-colors ${
                  isActive
                    ? 'text-green-600 font-bold'
                    : 'text-muted hover:text-navy-900'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              <span className="truncate max-w-[60px]">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
