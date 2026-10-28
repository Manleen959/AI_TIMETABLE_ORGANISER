import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { getResourcesForClass, deleteResource, createResource } from '../utils/featureService';
import useMyEntries from '../hooks/useMyEntries';
import { 
  BookOpen, 
  Search, 
  ExternalLink, 
  Trash2, 
  Plus, 
  FileText, 
  Sparkles, 
  FolderOpen,
  Filter
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function ResourcesPage() {
  const { user, profile, role } = useAuth();
  const { entries } = useMyEntries();

  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('ALL');
  const [showAddModal, setShowAddModal] = useState(false);

  // Add resource modal state (for teachers / admins)
  const [newTitle, setNewTitle] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newNote, setNewNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const distinctSubjects = useMemo(() => {
    const fromEntries = entries.map(e => e.subject).filter(Boolean);
    const fromRes = resources.map(r => r.subject).filter(Boolean);
    return Array.from(new Set([...fromEntries, ...fromRes])).sort();
  }, [entries, resources]);

  useEffect(() => {
    loadResources();
  }, [profile?.classId]);

  async function loadResources() {
    setLoading(true);
    try {
      const classId = profile?.classId || 'BTEC-4-CSE-4A';
      const list = await getResourcesForClass(classId);
      setResources(list);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load study resources');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(resourceId) {
    try {
      await deleteResource(resourceId);
      setResources(prev => prev.filter(r => r.id !== resourceId));
      toast.success('Resource removed');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete resource');
    }
  }

  async function handleAddResource(e) {
    e.preventDefault();
    if (!newTitle.trim() || !newUrl.trim()) {
      toast.error('Please enter title and valid resource URL');
      return;
    }
    setSubmitting(true);
    try {
      await createResource({
        classId: profile?.classId || 'BTEC-4-CSE-4A',
        subject: newSubject || distinctSubjects[0] || 'General',
        title: newTitle.trim(),
        url: newUrl.trim(),
        note: newNote.trim(),
        facultyCode: profile?.facultyCode || 'FACULTY',
      });

      toast.success('Study resource published!', { icon: '📚' });
      setNewTitle('');
      setNewUrl('');
      setNewNote('');
      setShowAddModal(false);
      await loadResources();
    } catch (err) {
      console.error(err);
      toast.error('Failed to publish resource');
    } finally {
      setSubmitting(false);
    }
  }

  // Filtered & Grouped by Subject
  const filteredResources = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return resources.filter(r => {
      const matchSearch = !q || 
        r.title?.toLowerCase().includes(q) || 
        r.subject?.toLowerCase().includes(q) || 
        r.note?.toLowerCase().includes(q) ||
        r.facultyCode?.toLowerCase().includes(q);

      const matchSubject = selectedSubject === 'ALL' || r.subject === selectedSubject;
      return matchSearch && matchSubject;
    });
  }, [resources, searchQuery, selectedSubject]);

  const groupedBySubject = useMemo(() => {
    const map = {};
    filteredResources.forEach(res => {
      const sub = res.subject || 'General';
      if (!map[sub]) map[sub] = [];
      map[sub].push(res);
    });
    return map;
  }, [filteredResources]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white rounded-panel p-6 border border-line shadow-soft flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-navy-700/10 text-navy-700 flex items-center justify-center font-bold">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-serif text-2xl font-bold text-navy-900">
              Class Study Resources
            </h1>
            <p className="text-xs text-muted">
              Course notes, lecture presentations, lab manuals and question banks for {profile?.classId || 'your class'}
            </p>
          </div>
        </div>

        {(role === 'teacher' || role === 'admin') && (
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-navy-900 hover:bg-navy-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Upload Material</span>
          </button>
        )}
      </div>

      {/* Search and Subject Filter Bar */}
      <div className="bg-white rounded-panel p-4 border border-line shadow-soft flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search notes, chapters, topics or teacher..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-line rounded-xl pl-9 pr-4 py-2 text-xs font-medium text-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-700/20"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-muted flex-shrink-0" />
          <select
            value={selectedSubject}
            onChange={e => setSelectedSubject(e.target.value)}
            className="bg-slate-50 border border-line rounded-xl px-3 py-2 text-xs font-semibold text-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-700/20 w-full sm:w-48"
          >
            <option value="ALL">All Subjects</option>
            {distinctSubjects.map(sub => (
              <option key={sub} value={sub}>{sub}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Resources List / Grouped View */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2].map(i => (
            <div key={i} className="bg-white rounded-panel p-6 border border-line animate-pulse space-y-3">
              <div className="h-5 bg-slate-100 rounded w-1/4" />
              <div className="h-12 bg-slate-50 rounded" />
            </div>
          ))}
        </div>
      ) : Object.keys(groupedBySubject).length === 0 ? (
        <div className="bg-white rounded-panel p-12 border border-line text-center shadow-soft">
          <div className="w-14 h-14 rounded-full bg-slate-100 text-muted flex items-center justify-center mx-auto mb-3">
            <FolderOpen className="w-7 h-7 text-navy-700" />
          </div>
          <h3 className="font-serif text-lg font-bold text-navy-900">No Resources Found</h3>
          <p className="text-xs text-muted max-w-sm mx-auto mt-1 mb-4">
            No study materials have been uploaded for the selected filter. Teachers will publish lecture slides and lab files here.
          </p>
          {(role === 'teacher' || role === 'admin') && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 rounded-full bg-navy-900 text-white text-xs font-bold cursor-pointer hover:bg-navy-700"
            >
              + Upload Study Material
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedBySubject).map(([subjectName, items]) => (
            <div key={subjectName} className="bg-white rounded-panel p-6 border border-line shadow-soft space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-line">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-navy-700" />
                  <h2 className="font-serif text-base font-bold text-navy-900">
                    {subjectName}
                  </h2>
                </div>
                <span className="text-[11px] font-semibold text-muted bg-slate-100 px-2.5 py-0.5 rounded-full">
                  {items.length} file{items.length !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {items.map(res => (
                  <div
                    key={res.id}
                    className="p-4 rounded-card border border-line bg-slate-50/50 hover:bg-white hover:shadow-md transition-all flex flex-col justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h4 className="text-xs font-bold text-navy-900 leading-snug">
                          {res.title}
                        </h4>
                        {(role === 'admin' || (role === 'teacher' && res.facultyCode === profile?.facultyCode)) && (
                          <button
                            onClick={() => handleDelete(res.id)}
                            className="text-muted hover:text-rose-600 p-1 cursor-pointer"
                            title="Delete resource"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      {res.note && (
                        <p className="text-[11px] text-muted line-clamp-2 mt-1">
                          {res.note}
                        </p>
                      )}

                      <div className="text-[10px] text-muted mt-2">
                        Uploaded by: <strong>Prof. {res.facultyCode || 'Faculty'}</strong>
                      </div>
                    </div>

                    <a
                      href={res.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-2 w-full py-2 rounded-xl bg-white border border-line hover:border-navy-700 text-xs font-bold text-navy-900 shadow-sm transition-all cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-navy-700" />
                      <span>Open Study Resource</span>
                    </a>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Resource Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-navy-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-panel max-w-md w-full p-6 shadow-2xl border border-line space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-line">
              <h3 className="font-serif text-lg font-bold text-navy-900">
                Publish Study Resource
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-muted hover:text-navy-900 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddResource} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted mb-1">
                  Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Unit 3 Compiler Optimization Slides"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-line rounded-xl px-3 py-2 text-xs font-semibold text-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-700/20"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted mb-1">
                  Subject
                </label>
                <select
                  value={newSubject}
                  onChange={e => setNewSubject(e.target.value)}
                  className="w-full bg-slate-50 border border-line rounded-xl px-3 py-2 text-xs font-semibold text-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-700/20"
                >
                  {distinctSubjects.length > 0 ? (
                    distinctSubjects.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))
                  ) : (
                    <option value="General">General</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted mb-1">
                  URL / Cloud Drive Link
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://drive.google.com/... or https://..."
                  value={newUrl}
                  onChange={e => setNewUrl(e.target.value)}
                  className="w-full bg-slate-50 border border-line rounded-xl px-3 py-2 text-xs font-semibold text-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-700/20"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted mb-1">
                  Notes / Instructions (optional)
                </label>
                <textarea
                  rows="2"
                  placeholder="Read chapters 4 & 5 before Thursday lab"
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  className="w-full bg-slate-50 border border-line rounded-xl px-3 py-2 text-xs font-medium text-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-700/20"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-full bg-slate-100 text-muted hover:bg-slate-200 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-full bg-navy-900 text-white hover:bg-navy-700 text-xs font-bold cursor-pointer shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Publishing...' : 'Publish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
