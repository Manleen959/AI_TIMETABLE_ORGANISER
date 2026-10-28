import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import useMyEntries from '../hooks/useMyEntries';
import { 
  getTasksForUser, 
  createTask, 
  toggleTaskDone, 
  deleteTask 
} from '../utils/featureService';
import { 
  CheckSquare, 
  Square, 
  Plus, 
  Trash2, 
  Calendar, 
  Clock, 
  AlertCircle, 
  Sparkles, 
  BookOpen, 
  Award,
  Filter
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function PlannerPage() {
  const { user } = useAuth();
  const { entries } = useMyEntries();

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all'); // all, active, completed, exams
  const [showAddModal, setShowAddModal] = useState(false);

  // New task form state
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [dueDate, setDueDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [type, setType] = useState('assignment'); // assignment | exam | other
  const [submitting, setSubmitting] = useState(false);

  // Distinct enrolled subjects from useMyEntries
  const enrolledSubjects = useMemo(() => {
    const set = new Set(entries.map(e => e.subject).filter(Boolean));
    return Array.from(set).sort();
  }, [entries]);

  useEffect(() => {
    if (user?.uid) {
      loadTasks();
    }
  }, [user?.uid]);

  useEffect(() => {
    if (enrolledSubjects.length > 0 && !subject) {
      setSubject(enrolledSubjects[0]);
    }
  }, [enrolledSubjects]);

  async function loadTasks() {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const list = await getTasksForUser(user.uid);
      setTasks(list);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateTask(e) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Please enter a task title');
      return;
    }
    setSubmitting(true);
    try {
      await createTask({
        uid: user.uid,
        title: title.trim(),
        subject: subject || 'General',
        dueDate,
        type,
      });

      toast.success('Task scheduled successfully!', { icon: '🎯' });
      setTitle('');
      setShowAddModal(false);
      await loadTasks();
    } catch (err) {
      console.error(err);
      toast.error('Failed to schedule task');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleDone(taskId, currentDone) {
    try {
      await toggleTaskDone(taskId, currentDone);
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, done: !currentDone } : t));
      toast.success(!currentDone ? 'Task completed! Great job!' : 'Task reopened');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update task status');
    }
  }

  async function handleDeleteTask(taskId) {
    try {
      await deleteTask(taskId);
      setTasks(prev => prev.filter(t => t.id !== taskId));
      toast.success('Task removed');
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete task');
    }
  }

  // Grouping tasks: Overdue, Today, This week, Later
  const groupedTasks = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    const todayDate = new Date(todayStr);
    
    // One week ahead
    const weekAhead = new Date(todayDate);
    weekAhead.setDate(weekAhead.getDate() + 7);

    const filtered = tasks.filter(t => {
      if (filterType === 'active') return !t.done;
      if (filterType === 'completed') return t.done;
      if (filterType === 'exams') return t.type === 'exam';
      return true;
    });

    const overdue = [];
    const today = [];
    const thisWeek = [];
    const later = [];

    filtered.forEach(task => {
      const taskDate = new Date(task.dueDate);
      if (!task.done && task.dueDate < todayStr) {
        overdue.push(task);
      } else if (task.dueDate === todayStr) {
        today.push(task);
      } else if (taskDate <= weekAhead) {
        thisWeek.push(task);
      } else {
        later.push(task);
      }
    });

    return { overdue, today, thisWeek, later };
  }, [tasks, filterType]);

  function getCountdownChip(dueDateStr, done) {
    if (done) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700">
          Completed
        </span>
      );
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const msPerDay = 1000 * 60 * 60 * 24;
    const diffDays = Math.round((new Date(dueDateStr) - new Date(todayStr)) / msPerDay);

    if (diffDays < 0) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 animate-pulse">
          Overdue by {Math.abs(diffDays)}d
        </span>
      );
    }
    if (diffDays === 0) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
          Due Today
        </span>
      );
    }
    if (diffDays === 1) {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-lime-100 text-green-800">
          Due Tomorrow
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-muted">
        In {diffDays} days
      </span>
    );
  }

  function renderTaskCard(task) {
    return (
      <div
        key={task.id}
        className={`bg-white rounded-card p-4 border transition-all flex items-center justify-between gap-4 ${
          task.done
            ? 'opacity-60 bg-slate-50/50 border-line'
            : task.dueDate < new Date().toISOString().split('T')[0]
            ? 'border-rose-200 shadow-sm ring-1 ring-rose-200/50'
            : 'border-line shadow-soft hover:shadow-md'
        }`}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            onClick={() => handleToggleDone(task.id, task.done)}
            type="button"
            className="p-1 rounded-lg text-muted hover:text-navy-900 cursor-pointer flex-shrink-0"
          >
            {task.done ? (
              <CheckSquare className="w-5 h-5 text-green-600" />
            ) : (
              <Square className="w-5 h-5 text-muted hover:text-navy-700" />
            )}
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.2 rounded-md bg-slate-100 text-navy-900">
                {task.subject}
              </span>
              {task.type === 'exam' && (
                <span className="text-[10px] font-bold uppercase px-2 py-0.2 rounded-md bg-rose-50 text-rose-600">
                  Exam
                </span>
              )}
              {getCountdownChip(task.dueDate, task.done)}
            </div>

            <h4 className={`text-xs font-bold truncate ${
              task.done ? 'line-through text-muted' : 'text-navy-900'
            }`}>
              {task.title}
            </h4>

            <div className="text-[10px] text-muted flex items-center gap-1 mt-0.5">
              <Calendar className="w-3 h-3" />
              <span>Due: {task.dueDate}</span>
            </div>
          </div>
        </div>

        <button
          onClick={() => handleDeleteTask(task.id)}
          className="p-2 text-muted hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors cursor-pointer flex-shrink-0"
          title="Delete task"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white rounded-panel p-6 border border-line shadow-soft flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-green-600/10 text-green-700 flex items-center justify-center font-bold">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-serif text-2xl font-bold text-navy-900">
              Tasks & Exams Planner
            </h1>
            <p className="text-xs text-muted">
              Organize assignments, exams, and project submissions with deadline tracking
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-navy-900 hover:bg-navy-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Task / Exam</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'all', label: 'All Tasks', count: tasks.length },
          { id: 'active', label: 'Pending', count: tasks.filter(t => !t.done).length },
          { id: 'completed', label: 'Done', count: tasks.filter(t => t.done).length },
          { id: 'exams', label: 'Exams Only', count: tasks.filter(t => t.type === 'exam').length },
        ].map(tab => (
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

      {/* Task Sections */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-card p-4 border border-line animate-pulse h-16" />
          ))}
        </div>
      ) : tasks.length === 0 ? (
        <div className="bg-white rounded-panel p-12 border border-line text-center shadow-soft">
          <div className="w-14 h-14 rounded-full bg-slate-100 text-muted flex items-center justify-center mx-auto mb-3">
            <CheckSquare className="w-7 h-7 text-green-600" />
          </div>
          <h3 className="font-serif text-lg font-bold text-navy-900">Your Planner is Empty</h3>
          <p className="text-xs text-muted max-w-sm mx-auto mt-1 mb-4">
            No assignments or exam deadlines added yet. Keep ahead of schedule by adding your upcoming deadlines.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 rounded-full bg-navy-900 text-white text-xs font-bold cursor-pointer hover:bg-navy-700"
          >
            + Add First Task
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Overdue */}
          {groupedTasks.overdue.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-serif text-xs font-bold uppercase tracking-wider text-rose-600 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Overdue ({groupedTasks.overdue.length})</span>
              </h3>
              <div className="space-y-2">
                {groupedTasks.overdue.map(renderTaskCard)}
              </div>
            </div>
          )}

          {/* Today */}
          {groupedTasks.today.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-serif text-xs font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>Due Today ({groupedTasks.today.length})</span>
              </h3>
              <div className="space-y-2">
                {groupedTasks.today.map(renderTaskCard)}
              </div>
            </div>
          )}

          {/* This Week */}
          {groupedTasks.thisWeek.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-serif text-xs font-bold uppercase tracking-wider text-navy-900 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-navy-700" />
                <span>This Week ({groupedTasks.thisWeek.length})</span>
              </h3>
              <div className="space-y-2">
                {groupedTasks.thisWeek.map(renderTaskCard)}
              </div>
            </div>
          )}

          {/* Later */}
          {groupedTasks.later.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-serif text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-muted" />
                <span>Upcoming / Later ({groupedTasks.later.length})</span>
              </h3>
              <div className="space-y-2">
                {groupedTasks.later.map(renderTaskCard)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-navy-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-panel max-w-md w-full p-6 shadow-2xl border border-line space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-line">
              <h3 className="font-serif text-lg font-bold text-navy-900">
                Schedule Task or Exam
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-muted hover:text-navy-900 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted mb-1">
                  Task Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Unit 2 Assignment or Mid-term Exam"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-line rounded-xl px-3 py-2 text-xs font-semibold text-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-700/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-muted mb-1">
                    Subject
                  </label>
                  <select
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    className="w-full bg-slate-50 border border-line rounded-xl px-3 py-2 text-xs font-semibold text-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-700/20"
                  >
                    {enrolledSubjects.length > 0 ? (
                      enrolledSubjects.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))
                    ) : (
                      <option value="General">General</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-muted mb-1">
                    Category
                  </label>
                  <select
                    value={type}
                    onChange={e => setType(e.target.value)}
                    className="w-full bg-slate-50 border border-line rounded-xl px-3 py-2 text-xs font-semibold text-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-700/20"
                  >
                    <option value="assignment">Assignment</option>
                    <option value="exam">Exam</option>
                    <option value="other">Project / Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-muted mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  required
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="w-full bg-slate-50 border border-line rounded-xl px-3 py-2 text-xs font-semibold text-navy-900 focus:outline-none focus:ring-2 focus:ring-navy-700/20"
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
                  {submitting ? 'Saving...' : 'Add to Planner'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
