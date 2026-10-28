import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTimetable } from '../context/TimetableContext';
import useMyEntries, { normalizeClassId, normalizeFaculty } from '../hooks/useMyEntries';
import { 
  createAnnouncement, 
  getAnnouncements, 
  deleteAnnouncement,
  createResource,
  getResourcesForClass,
  deleteResource,
  createExtraClass,
  getExtraClassesForDate,
  deleteExtraClass
} from '../utils/featureService';
import { 
  Megaphone, 
  BookOpen, 
  CalendarPlus, 
  Trash2, 
  Plus, 
  ExternalLink, 
  Clock, 
  Sparkles, 
  CheckCircle2, 
  Users,
  MapPin,
  Calendar
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function ClassHubPage() {
  const { user, profile, role } = useAuth();
  const { entries: allTimetableEntries, periods, days, venues: allVenues } = useTimetable();
  const { entries: myTeachingEntries } = useMyEntries();

  // Active sub-tab: 'announcements' | 'resources' | 'extraClass'
  const [activeTab, setActiveTab] = useState('announcements');
  const [loading, setLoading] = useState(true);

  // Data lists
  const [announcements, setAnnouncements] = useState([]);
  const [resources, setResources] = useState([]);
  const [extraClasses, setExtraClasses] = useState([]);

  // Teacher's classes
  const teacherClasses = useMemo(() => {
    const list = Array.from(new Set(myTeachingEntries.map(e => e.classId).filter(Boolean)));
    return list.length > 0 ? list : ['BTEC-4-CSE-4A', 'BTEC-4-CSE-4B'];
  }, [myTeachingEntries]);

  // Form states: Post Announcement
  const [annTitle, setAnnTitle] = useState('');
  const [annMessage, setAnnMessage] = useState('');
  const [annTargetClass, setAnnTargetClass] = useState(teacherClasses[0] || 'ALL');
  const [submittingAnn, setSubmittingAnn] = useState(false);

  // Form states: Post Resource
  const [resTitle, setResTitle] = useState('');
  const [resUrl, setNewUrl] = useState('');
  const [resSubject, setResSubject] = useState('');
  const [resTargetClass, setResTargetClass] = useState(teacherClasses[0] || 'BTEC-4-CSE-4A');
  const [resNote, setResNote] = useState('');
  const [submittingRes, setSubmittingRes] = useState(false);

  // Form states: T3 Extra Class Scheduler
  const [extraDate, setExtraDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [extraClassId, setExtraClassId] = useState(teacherClasses[0] || 'BTEC-4-CSE-4A');
  const [extraSubject, setExtraSubject] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [chosenVenue, setChosenVenue] = useState('');
  const [extraNote, setExtraNote] = useState('');
  const [submittingExtra, setSubmittingExtra] = useState(false);

  useEffect(() => {
    loadAllPosts();
  }, [profile?.facultyCode]);

  async function loadAllPosts() {
    setLoading(true);
    try {
      const annList = await getAnnouncements();
      const myFaculty = normalizeFaculty(profile?.facultyCode);
      const filteredAnn = (role === 'admin' || !myFaculty)
        ? annList 
        : annList.filter(a => normalizeFaculty(a.facultyCode) === myFaculty);
      setAnnouncements(filteredAnn);

      // Load resources for teacher's classes
      const allRes = [];
      for (const c of teacherClasses) {
        const rList = await getResourcesForClass(c);
        allRes.push(...rList);
      }
      setResources(allRes);

      // Extra classes
      const extraList = await getExtraClassesForDate(extraDate);
      setExtraClasses(extraList);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load class hub data');
    } finally {
      setLoading(false);
    }
  }

  // Reload extra classes on date change
  useEffect(() => {
    getExtraClassesForDate(extraDate).then(setExtraClasses).catch(console.error);
  }, [extraDate]);

  // -------------------------------------------------------------
  // POST ANNOUNCEMENT
  // -------------------------------------------------------------
  async function handleCreateAnnouncement(e) {
    e.preventDefault();
    if (!annTitle.trim() || !annMessage.trim()) {
      toast.error('Please enter announcement title and message');
      return;
    }
    setSubmittingAnn(true);
    try {
      await createAnnouncement({
        title: annTitle.trim(),
        message: annMessage.trim(),
        targetClass: annTargetClass,
        facultyCode: profile?.facultyCode || 'FACULTY',
      });
      toast.success('Announcement broadcasted to class!', { icon: '📢' });
      setAnnTitle('');
      setAnnMessage('');
      await loadAllPosts();
    } catch (err) {
      console.error(err);
      toast.error('Failed to publish announcement');
    } finally {
      setSubmittingAnn(false);
    }
  }

  async function handleDeleteAnnouncement(id) {
    try {
      await deleteAnnouncement(id);
      setAnnouncements(prev => prev.filter(a => a.id !== id));
      toast.success('Announcement deleted');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete announcement');
    }
  }

  // -------------------------------------------------------------
  // POST RESOURCE
  // -------------------------------------------------------------
  async function handleCreateResource(e) {
    e.preventDefault();
    if (!resTitle.trim() || !resUrl.trim()) {
      toast.error('Please provide a title and valid link');
      return;
    }
    setSubmittingRes(true);
    try {
      await createResource({
        classId: resTargetClass,
        subject: resSubject || 'General',
        title: resTitle.trim(),
        url: resUrl.trim(),
        note: resNote.trim(),
        facultyCode: profile?.facultyCode || 'FACULTY',
      });
      toast.success('Study resource published!', { icon: '📚' });
      setResTitle('');
      setNewUrl('');
      setResNote('');
      await loadAllPosts();
    } catch (err) {
      console.error(err);
      toast.error('Failed to publish resource');
    } finally {
      setSubmittingRes(false);
    }
  }

  async function handleDeleteResource(id) {
    try {
      await deleteResource(id);
      setResources(prev => prev.filter(r => r.id !== id));
      toast.success('Resource deleted');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete resource');
    }
  }

  // -------------------------------------------------------------
  // T3: COMPUTE FREE SLOTS FOR EXTRA CLASS SCHEDULER
  // -------------------------------------------------------------
  const extraClassDay = useMemo(() => {
    const d = new Date(extraDate);
    const dayMap = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    return dayMap[d.getDay()] || 'MONDAY';
  }, [extraDate]);

  const availableExtraSlots = useMemo(() => {
    if (!periods || periods.length === 0) return [];
    const normClass = normalizeClassId(extraClassId);
    const normFaculty = normalizeFaculty(profile?.facultyCode);
    const slots = [];

    // All known venues
    const venueList = (allVenues && allVenues.length > 0)
      ? allVenues
      : ['ET-301', 'ET-302', 'ET-303', 'ETCC-209', 'ETCC-407', 'ETCC-507', 'MTCL-1', 'MTCL-2'];

    periods.forEach(p => {
      const pNum = Number(p.no);

      // Check 1: Is the class free in this period on this day?
      const classEntry = allTimetableEntries.find(
        e => e.day === extraClassDay && Number(e.period) === pNum && normalizeClassId(e.classId) === normClass
      );
      // Also check if an extra class is already scheduled on this exact date for this class
      const classHasExtra = extraClasses.some(
        ec => ec.date === extraDate && Number(ec.period) === pNum && normalizeClassId(ec.classId) === normClass
      );
      if (classEntry || classHasExtra) return; // Class is busy

      // Check 2: Is the teacher free in this period on this day?
      if (normFaculty) {
        const teacherEntry = allTimetableEntries.find(
          e => e.day === extraClassDay && Number(e.period) === pNum && normalizeFaculty(e.faculty) === normFaculty
        );
        const teacherHasExtra = extraClasses.some(
          ec => ec.date === extraDate && Number(ec.period) === pNum && normalizeFaculty(ec.facultyCode) === normFaculty
        );
        if (teacherEntry || teacherHasExtra) return; // Teacher is busy
      }

      // Check 3: Is at least one room free?
      const occupiedVenuesOnSlot = new Set(
        allTimetableEntries
          .filter(e => e.day === extraClassDay && Number(e.period) === pNum && e.venue)
          .map(e => e.venue.toUpperCase())
      );
      // Also remove rooms occupied by extra classes on this date
      extraClasses
        .filter(ec => ec.date === extraDate && Number(ec.period) === pNum && ec.venue)
        .forEach(ec => occupiedVenuesOnSlot.add(ec.venue.toUpperCase()));

      const freeRooms = venueList.filter(v => !occupiedVenuesOnSlot.has(v.toUpperCase()));
      if (freeRooms.length === 0) return; // No free room

      slots.push({
        period: pNum,
        label: p.label,
        start: p.start,
        end: p.end,
        freeRooms,
      });
    });

    return slots;
  }, [allTimetableEntries, periods, extraClassDay, extraDate, extraClassId, profile?.facultyCode, allVenues, extraClasses]);

  async function handleScheduleExtraClass(e) {
    e.preventDefault();
    if (!selectedSlot) {
      toast.error('Please select an available free period');
      return;
    }
    if (!chosenVenue) {
      toast.error('Please select an available venue room');
      return;
    }
    if (!extraSubject.trim()) {
      toast.error('Please specify the subject');
      return;
    }

    setSubmittingExtra(true);
    try {
      await createExtraClass({
        date: extraDate,
        classId: extraClassId,
        period: selectedSlot.period,
        subject: extraSubject.trim(),
        facultyCode: profile?.facultyCode || 'FACULTY',
        venue: chosenVenue,
        note: extraNote.trim(),
      });

      // Broadcast an announcement as well so all students receive instant notification!
      await createAnnouncement({
        title: `Extra Class: ${extraSubject.trim()}`,
        message: `Scheduled on ${extraDate} during Period ${selectedSlot.period} (${selectedSlot.start}-${selectedSlot.end}) in Room ${chosenVenue}. Prof: ${profile?.facultyCode || 'Faculty'}. ${extraNote.trim()}`,
        targetClass: extraClassId,
        facultyCode: profile?.facultyCode || 'FACULTY',
      });

      toast.success('Extra class scheduled & students notified!', { icon: '🎉' });
      setSelectedSlot(null);
      setChosenVenue('');
      setExtraNote('');
      await loadAllPosts();
    } catch (err) {
      console.error(err);
      toast.error('Failed to schedule extra class');
    } finally {
      setSubmittingExtra(false);
    }
  }

  async function handleDeleteExtraClass(id) {
    try {
      await deleteExtraClass(id);
      setExtraClasses(prev => prev.filter(ec => ec.id !== id));
      toast.success('Extra class cancelled');
    } catch (err) {
      console.error(err);
      toast.error('Failed to cancel extra class');
    }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white rounded-panel p-6 border border-line shadow-soft flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center font-bold">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-serif text-2xl font-bold text-navy-900">
              Teacher Class Hub
            </h1>
            <p className="text-xs text-muted">
              Publish circulars, share study materials & schedule conflict-free extra lectures
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {[
            { id: 'announcements', label: 'Announcements', icon: Megaphone },
            { id: 'resources', label: 'Materials', icon: BookOpen },
            { id: 'extraClass', label: 'Extra Class Scheduler', icon: CalendarPlus },
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? 'bg-navy-900 text-white shadow-sm'
                    : 'bg-slate-100 text-muted hover:text-navy-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: ANNOUNCEMENTS */}
      {/* ========================================================= */}
      {activeTab === 'announcements' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Post Form */}
          <div className="bg-white rounded-panel p-6 border border-line shadow-soft space-y-4 md:col-span-1">
            <h2 className="font-serif text-base font-bold text-navy-900 flex items-center gap-2">
              <Megaphone className="w-4 h-4 text-orange-500" />
              <span>Post Announcement</span>
            </h2>

            <form onSubmit={handleCreateAnnouncement} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted mb-1">
                  Target Class
                </label>
                <select
                  value={annTargetClass}
                  onChange={e => setAnnTargetClass(e.target.value)}
                  className="w-full bg-slate-50 border border-line rounded-xl px-3 py-2 text-xs font-semibold text-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-700/20"
                >
                  <option value="ALL">All Classes (Campus-Wide)</option>
                  {teacherClasses.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted mb-1">
                  Notice Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lab Project Submission Deadline"
                  value={annTitle}
                  onChange={e => setAnnTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-line rounded-xl px-3 py-2 text-xs font-semibold text-navy-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted mb-1">
                  Message Content
                </label>
                <textarea
                  required
                  rows="4"
                  placeholder="Enter notice details for students..."
                  value={annMessage}
                  onChange={e => setAnnMessage(e.target.value)}
                  className="w-full bg-slate-50 border border-line rounded-xl px-3 py-2 text-xs font-medium text-navy-900 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={submittingAnn}
                className="w-full py-2.5 rounded-full bg-navy-900 hover:bg-navy-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
              >
                {submittingAnn ? 'Broadcasting...' : 'Broadcast Notice'}
              </button>
            </form>
          </div>

          {/* Posts List */}
          <div className="md:col-span-2 space-y-4">
            <h2 className="font-serif text-base font-bold text-navy-900">
              Published Circulars ({announcements.length})
            </h2>

            {announcements.length === 0 ? (
              <div className="bg-white rounded-panel p-8 border border-line text-center text-xs text-muted shadow-soft">
                No announcements posted yet. Broadcast circulars directly to your student classes.
              </div>
            ) : (
              <div className="space-y-3">
                {announcements.map(ann => (
                  <div key={ann.id} className="bg-white rounded-card p-4 border border-line shadow-soft flex items-start justify-between gap-3">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase px-2 py-0.2 rounded-md bg-orange-50 text-orange-600">
                          {ann.targetClass === 'ALL' ? 'Campus-Wide' : ann.targetClass}
                        </span>
                        <span className="text-[10px] text-muted">
                          {new Date(ann.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-navy-900">{ann.title}</h4>
                      <p className="text-xs text-muted leading-relaxed">{ann.message}</p>
                    </div>

                    <button
                      onClick={() => handleDeleteAnnouncement(ann.id)}
                      className="text-muted hover:text-rose-600 p-1.5 cursor-pointer"
                      title="Delete notice"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: STUDY RESOURCES */}
      {/* ========================================================= */}
      {activeTab === 'resources' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Post Resource Form */}
          <div className="bg-white rounded-panel p-6 border border-line shadow-soft space-y-4 md:col-span-1">
            <h2 className="font-serif text-base font-bold text-navy-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-navy-700" />
              <span>Share Study Material</span>
            </h2>

            <form onSubmit={handleCreateResource} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted mb-1">
                  Target Class
                </label>
                <select
                  value={resTargetClass}
                  onChange={e => setResTargetClass(e.target.value)}
                  className="w-full bg-slate-50 border border-line rounded-xl px-3 py-2 text-xs font-semibold text-navy-900 focus:outline-none"
                >
                  {teacherClasses.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Distributed Systems"
                  value={resSubject}
                  onChange={e => setResSubject(e.target.value)}
                  className="w-full bg-slate-50 border border-line rounded-xl px-3 py-2 text-xs font-semibold text-navy-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted mb-1">
                  Resource Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Unit 3 Architecture Slides (PDF)"
                  value={resTitle}
                  onChange={e => setResTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-line rounded-xl px-3 py-2 text-xs font-semibold text-navy-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted mb-1">
                  Resource Link (URL)
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://drive.google.com/..."
                  value={resUrl}
                  onChange={e => setNewUrl(e.target.value)}
                  className="w-full bg-slate-50 border border-line rounded-xl px-3 py-2 text-xs font-semibold text-navy-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted mb-1">
                  Note (Optional)
                </label>
                <textarea
                  rows="2"
                  placeholder="Brief note or instructions..."
                  value={resNote}
                  onChange={e => setResNote(e.target.value)}
                  className="w-full bg-slate-50 border border-line rounded-xl px-3 py-2 text-xs font-medium text-navy-900 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={submittingRes}
                className="w-full py-2.5 rounded-full bg-navy-900 hover:bg-navy-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
              >
                {submittingRes ? 'Publishing...' : 'Publish Study Material'}
              </button>
            </form>
          </div>

          {/* Resources List */}
          <div className="md:col-span-2 space-y-4">
            <h2 className="font-serif text-base font-bold text-navy-900">
              Uploaded Study Materials ({resources.length})
            </h2>

            {resources.length === 0 ? (
              <div className="bg-white rounded-panel p-8 border border-line text-center text-xs text-muted shadow-soft">
                No materials published yet. Share drive links or question papers with your students.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {resources.map(res => (
                  <div key={res.id} className="bg-white rounded-card p-4 border border-line shadow-soft flex flex-col justify-between gap-3">
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <span className="text-[10px] font-bold uppercase px-2 py-0.2 rounded bg-slate-100 text-navy-900">
                          {res.classId} • {res.subject}
                        </span>
                        <button
                          onClick={() => handleDeleteResource(res.id)}
                          className="text-muted hover:text-rose-600 p-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <h4 className="text-xs font-bold text-navy-900">{res.title}</h4>
                      {res.note && <p className="text-[11px] text-muted mt-1">{res.note}</p>}
                    </div>

                    <a
                      href={res.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-navy-900"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-navy-700" />
                      <span>Access Material</span>
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: T3 EXTRA CLASS SCHEDULER */}
      {/* ========================================================= */}
      {activeTab === 'extraClass' && (
        <div className="space-y-6">
          <div className="bg-white rounded-panel p-6 border border-line shadow-soft space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-green-600/10 text-green-700 flex items-center justify-center font-bold">
                <CalendarPlus className="w-5 h-5" />
              </div>
              <div>
                <h2 className="font-serif text-lg font-bold text-navy-900">
                  Conflict-Free Extra Class Scheduler
                </h2>
                <p className="text-xs text-muted">
                  The smart solver verifies that the class, teacher, and room are all 100% free with zero clashes.
                </p>
              </div>
            </div>

            {/* Pick Class and Date */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted mb-1.5">
                  Target Class
                </label>
                <select
                  value={extraClassId}
                  onChange={e => {
                    setExtraClassId(e.target.value);
                    setSelectedSlot(null);
                  }}
                  className="w-full bg-slate-50 border border-line rounded-xl px-3 py-2 text-xs font-semibold text-navy-900 focus:outline-none"
                >
                  {teacherClasses.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted mb-1.5">
                  Extra Session Date
                </label>
                <input
                  type="date"
                  value={extraDate}
                  onChange={e => {
                    setExtraDate(e.target.value);
                    setSelectedSlot(null);
                  }}
                  className="w-full bg-slate-50 border border-line rounded-xl px-3 py-2 text-xs font-semibold text-navy-900 focus:outline-none"
                />
                <div className="text-[11px] text-muted mt-1">
                  Day of week: <strong>{extraClassDay}</strong>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted mb-1.5">
                  Subject Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Distributed Computing"
                  value={extraSubject}
                  onChange={e => setExtraSubject(e.target.value)}
                  className="w-full bg-slate-50 border border-line rounded-xl px-3 py-2 text-xs font-semibold text-navy-900 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Verified Available Free Slots */}
          <div className="bg-white rounded-panel p-6 border border-line shadow-soft space-y-4">
            <h3 className="font-serif text-base font-bold text-navy-900 flex items-center justify-between">
              <span>Verified Available Slots on {extraDate}</span>
              <span className="text-xs text-muted font-normal">
                {availableExtraSlots.length} clash-free periods found
              </span>
            </h3>

            {availableExtraSlots.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-card border border-dashed border-line text-xs text-muted">
                No mutually free periods found on {extraDate} ({extraClassDay}) for {extraClassId} and Prof. {profile?.facultyCode}.
                Try selecting a different date.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {availableExtraSlots.map(slot => {
                  const isSelected = selectedSlot?.period === slot.period;
                  return (
                    <div
                      key={slot.period}
                      onClick={() => {
                        setSelectedSlot(slot);
                        setChosenVenue(slot.freeRooms[0] || '');
                      }}
                      className={`p-4 rounded-card border cursor-pointer transition-all ${
                        isSelected
                          ? 'border-green-600 bg-green-50/70 shadow-sm ring-2 ring-green-600/20'
                          : 'border-line bg-white hover:border-navy-700/40 hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-serif font-bold text-sm text-navy-900">
                          Period {slot.period}
                        </span>
                        <span className="text-[11px] font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
                          100% Free
                        </span>
                      </div>
                      <div className="text-xs text-muted flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{slot.start} - {slot.end}</span>
                      </div>
                      <div className="text-[11px] text-muted mt-2">
                        {slot.freeRooms.length} available rooms: <strong>{slot.freeRooms.slice(0, 3).join(', ')}</strong>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Slot Confirmation & Venue Selection */}
            {selectedSlot && (
              <form onSubmit={handleScheduleExtraClass} className="pt-4 border-t border-line space-y-4">
                <div className="bg-lime-50/60 border border-lime-200 rounded-card p-4 space-y-3">
                  <h4 className="font-serif text-sm font-bold text-ink">
                    Configure Extra Lecture Details
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-muted mb-1">
                        Choose Available Room
                      </label>
                      <select
                        value={chosenVenue}
                        onChange={e => setChosenVenue(e.target.value)}
                        className="w-full bg-white border border-line rounded-xl px-3 py-2 text-xs font-semibold text-navy-900"
                      >
                        {selectedSlot.freeRooms.map(rm => (
                          <option key={rm} value={rm}>{rm}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-muted mb-1">
                        Session Agenda / Note
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Makeup lecture for Unit 3 review"
                        value={extraNote}
                        onChange={e => setExtraNote(e.target.value)}
                        className="w-full bg-white border border-line rounded-xl px-3 py-2 text-xs font-semibold text-navy-900"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={submittingExtra}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-full bg-navy-900 hover:bg-navy-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 className="w-4 h-4 text-lime-300" />
                      <span>{submittingExtra ? 'Scheduling...' : 'Confirm & Notify Students'}</span>
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>

          {/* Already Scheduled Extra Classes */}
          <div className="bg-white rounded-panel p-6 border border-line shadow-soft space-y-4">
            <h3 className="font-serif text-base font-bold text-navy-900">
              Scheduled Extra Classes on {extraDate} ({extraClasses.length})
            </h3>
            {extraClasses.length === 0 ? (
              <div className="text-center py-6 text-xs text-muted">
                No extra sessions scheduled for this date.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {extraClasses.map(ec => (
                  <div key={ec.id} className="p-3.5 rounded-xl border border-line bg-slate-50 flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-[10px] font-bold uppercase bg-green-100 text-green-700 px-2 py-0.2 rounded">
                          Extra • P{ec.period}
                        </span>
                        <span className="text-xs font-bold text-navy-900">{ec.classId}</span>
                      </div>
                      <div className="text-xs font-bold text-navy-900">{ec.subject}</div>
                      <div className="text-[11px] text-muted">
                        Room: <strong>{ec.venue}</strong> • Prof. {ec.facultyCode}
                      </div>
                      {ec.note && <div className="text-[10px] text-muted italic mt-0.5">{ec.note}</div>}
                    </div>

                    <button
                      onClick={() => handleDeleteExtraClass(ec.id)}
                      className="text-muted hover:text-rose-600 p-1 cursor-pointer"
                      title="Cancel session"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
