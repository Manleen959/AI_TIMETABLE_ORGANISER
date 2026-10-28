import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getDerivedNotifications } from '../utils/featureService';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../firebase';
import { 
  Bell, 
  Megaphone, 
  BookOpen, 
  CalendarPlus, 
  ArrowLeftRight, 
  CheckCheck, 
  ExternalLink,
  Filter,
  Clock,
  Sparkles
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function NotificationsPage() {
  const { user, profile, role } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all');
  const [markingRead, setMarkingRead] = useState(false);

  useEffect(() => {
    loadNotifications();
  }, [profile?.classId, profile?.facultyCode, profile?.lastSeen, role]);

  async function loadNotifications() {
    setLoading(true);
    try {
      const { notifications: list } = await getDerivedNotifications({
        role,
        classId: profile?.classId,
        facultyCode: profile?.facultyCode,
        lastSeen: profile?.lastSeen,
      });
      setNotifications(list);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkAllAsRead() {
    if (!user?.uid) return;
    setMarkingRead(true);
    const nowIso = new Date().toISOString();

    try {
      if (isFirebaseConfigured) {
        await updateDoc(doc(db, 'users', user.uid), {
          lastSeen: serverTimestamp(),
        });
      }
      // Update local storage fallback
      const localProfile = JSON.parse(localStorage.getItem('smartschedule_profile') || '{}');
      localProfile.lastSeen = nowIso;
      localStorage.setItem('smartschedule_profile', JSON.stringify(localProfile));

      toast.success('Marked all notifications as read', { icon: '✨' });
      await loadNotifications();
    } catch (err) {
      console.error(err);
      toast.error('Failed to mark read');
    } finally {
      setMarkingRead(false);
    }
  }

  const filtered = notifications.filter(n => {
    if (filterType === 'all') return true;
    if (filterType === 'announcements') return n.type === 'announcement';
    if (filterType === 'extra') return n.type === 'extraClass';
    if (filterType === 'resources') return n.type === 'resource';
    if (filterType === 'swaps') return n.type === 'swap';
    return true;
  });

  const lastSeenDate = profile?.lastSeen ? new Date(profile.lastSeen) : new Date(0);

  const filterTabs = [
    { id: 'all', label: 'All Notices', count: notifications.length },
    { id: 'announcements', label: 'Announcements', count: notifications.filter(n => n.type === 'announcement').length },
    { id: 'extra', label: 'Extra Classes', count: notifications.filter(n => n.type === 'extraClass').length },
    { id: 'resources', label: 'Resources', count: notifications.filter(n => n.type === 'resource').length },
    ...(role === 'teacher' || role === 'admin' ? [
      { id: 'swaps', label: 'Swaps', count: notifications.filter(n => n.type === 'swap').length }
    ] : [])
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-panel p-6 border border-line shadow-soft flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center font-bold">
            <Bell className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-serif text-2xl font-bold text-navy-900">
              Notification Centre
            </h1>
            <p className="text-xs text-muted mt-0.5">
              Live updates, announcements, extra sessions & timetable adjustments
            </p>
          </div>
        </div>

        <button
          onClick={handleMarkAllAsRead}
          disabled={markingRead || notifications.length === 0}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-navy-900 transition-colors cursor-pointer disabled:opacity-50"
        >
          <CheckCheck className="w-4 h-4 text-green-600" />
          <span>{markingRead ? 'Updating...' : 'Mark all as read'}</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {filterTabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilterType(tab.id)}
            className={`px-4 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 ${
              filterType === tab.id
                ? 'bg-navy-900 text-white shadow-sm'
                : 'bg-white text-muted hover:text-navy-900 border border-line'
            }`}
          >
            <span>{tab.label}</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              filterType === tab.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-muted'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* List / States */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-card p-5 border border-line animate-pulse flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-slate-100 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-slate-100 rounded w-1/3" />
                <div className="h-3 bg-slate-100 rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-panel p-12 border border-line text-center shadow-soft">
          <div className="w-14 h-14 rounded-full bg-slate-100 text-muted flex items-center justify-center mx-auto mb-3">
            <CheckCheck className="w-7 h-7 text-green-600" />
          </div>
          <h3 className="font-serif text-lg font-bold text-navy-900">All Caught Up!</h3>
          <p className="text-xs text-muted max-w-sm mx-auto mt-1">
            No active notices or updates for this filter. Check back later for real-time adjustments.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(item => {
            const isUnread = new Date(item.timestamp) > lastSeenDate;
            let Icon = Megaphone;
            let iconBg = 'bg-orange-500/10 text-orange-500';
            if (item.type === 'extraClass') {
              Icon = CalendarPlus;
              iconBg = 'bg-green-600/10 text-green-600';
            } else if (item.type === 'resource') {
              Icon = BookOpen;
              iconBg = 'bg-navy-700/10 text-navy-700';
            } else if (item.type === 'swap') {
              Icon = ArrowLeftRight;
              iconBg = 'bg-purple-500/10 text-purple-600';
            }

            return (
              <div
                key={item.id}
                className={`bg-white rounded-card p-5 border transition-all ${
                  isUnread
                    ? 'border-navy-700/30 shadow-md ring-1 ring-navy-700/10'
                    : 'border-line shadow-soft'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-2xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-navy-900">
                          {item.badge}
                        </span>
                        {isUnread && (
                          <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" title="Unread" />
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-muted">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(item.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>

                    <h4 className="text-sm font-bold text-navy-900 mb-1">
                      {item.title}
                    </h4>
                    <p className="text-xs text-muted leading-relaxed">
                      {item.message}
                    </p>

                    {item.url && (
                      <div className="mt-3">
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-navy-900 text-xs font-semibold transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5 text-navy-700" />
                          <span>Access Study Material</span>
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
