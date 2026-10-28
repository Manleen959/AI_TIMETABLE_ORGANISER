import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getCurrentTimetable } from '../utils/timetableService';
import { Users, UserPlus, Mail, Lock, KeyRound, ShieldCheck, CheckCircle2, UserCheck } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ManageTeachersPage() {
  const { createTeacher, getTeachersList } = useAuth();
  const [teachers, setTeachers] = useState([]);
  const [facultyCodes, setFacultyCodes] = useState([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [facultyCode, setFacultyCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  async function loadData() {
    try {
      const timetable = await getCurrentTimetable();
      if (timetable && timetable.faculty) {
        setFacultyCodes(timetable.faculty);
        if (timetable.faculty.length > 0) {
          setFacultyCode(timetable.faculty[0]);
        }
      }
      const list = await getTeachersList();
      setTeachers(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name || !email || !password || !facultyCode) {
      toast.error('Please complete all teacher fields');
      return;
    }

    try {
      setSubmitting(true);
      await createTeacher({ name, email, password, facultyCode });
      toast.success(`Faculty profile created for Prof. ${facultyCode}!`);
      setName('');
      setEmail('');
      setPassword('');
      await loadData();
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Failed to create teacher account');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-panel p-6 border border-line shadow-soft flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-600 text-[11px] font-bold uppercase mb-2">
            <Users className="w-3.5 h-3.5" />
            <span>Faculty Administration</span>
          </div>
          <h1 className="font-serif text-2xl font-bold text-navy-900">
            Manage Teachers &amp; Faculty Codes
          </h1>
          <p className="text-xs text-muted mt-1">
            Provision faculty accounts mapped to timetable codes. Uses isolated authentication instance so administrator session remains uninterrupted.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-surface px-4 py-2 rounded-full border border-line text-xs font-semibold text-navy-900">
          <UserCheck className="w-4 h-4 text-green-600" />
          <span>{teachers.length} Active Faculty</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create Teacher Form */}
        <div className="bg-white rounded-panel p-6 border border-line shadow-soft">
          <div className="flex items-center gap-2 mb-4">
            <UserPlus className="w-5 h-5 text-orange-500" />
            <h2 className="font-serif font-bold text-lg text-navy-900">
              Create Teacher Account
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-navy-900 uppercase tracking-wide mb-1.5">
                Teacher Full Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Er. Gurjeet Singh"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-surface border border-line rounded-xl px-3.5 py-2 text-xs font-medium text-navy-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-navy-900 uppercase tracking-wide mb-1.5">
                Faculty Email (Login ID)
              </label>
              <div className="relative">
                <Mail className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="gurjeet@pcte.edu.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-surface border border-line rounded-xl pl-8 pr-3 py-2 text-xs font-medium text-navy-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-navy-900 uppercase tracking-wide mb-1.5">
                Timetable Faculty Code
              </label>
              <div className="relative">
                <KeyRound className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                {facultyCodes && facultyCodes.length > 0 ? (
                  <select
                    value={facultyCode}
                    onChange={(e) => setFacultyCode(e.target.value)}
                    className="w-full bg-surface border border-line rounded-xl pl-8 pr-3 py-2 text-xs font-bold text-navy-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:bg-white cursor-pointer"
                  >
                    {facultyCodes.map((code) => (
                      <option key={code} value={code}>
                        {code}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    required
                    placeholder="e.g. GURJEET or SHARMA"
                    value={facultyCode}
                    onChange={(e) => setFacultyCode(e.target.value.toUpperCase())}
                    className="w-full bg-surface border border-line rounded-xl pl-8 pr-3 py-2 text-xs font-bold text-navy-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:bg-white"
                  />
                )}
              </div>
              <p className="text-[10px] text-muted mt-1">
                Codes extracted from uploaded master schedule.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-navy-900 uppercase tracking-wide mb-1.5">
                Temporary Password
              </label>
              <div className="relative">
                <Lock className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="Minimum 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-surface border border-line rounded-xl pl-8 pr-3 py-2 text-xs font-medium text-navy-900 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:bg-white"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white py-2.5 rounded-full text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{submitting ? 'Creating Teacher...' : 'Register Teacher'}</span>
            </button>
          </form>
        </div>

        {/* Existing Teachers List */}
        <div className="lg:col-span-2 bg-white rounded-panel p-6 border border-line shadow-soft space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-serif font-bold text-lg text-navy-900">
              Registered Faculty Profiles
            </h2>
            <span className="text-xs bg-slate-100 text-muted font-bold px-2.5 py-1 rounded-full">
              {teachers.length} Faculty
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-line text-muted uppercase font-bold text-[10px]">
                  <th className="py-2.5 px-3">Faculty Member</th>
                  <th className="py-2.5 px-3">Faculty Code</th>
                  <th className="py-2.5 px-3">Email ID</th>
                  <th className="py-2.5 px-3">Role</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/60">
                {teachers.map((t, idx) => (
                  <tr key={t.id || t.uid || idx} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3 font-semibold text-navy-900">
                      {t.name}
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-mono font-bold bg-navy-50 text-navy-800 px-2 py-0.5 rounded-md text-[11px]">
                        {t.facultyCode}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-muted">
                      {t.email}
                    </td>
                    <td className="py-3 px-3">
                      <span className="bg-orange-50 text-orange-700 font-bold px-2 py-0.5 rounded-full text-[10px]">
                        Teacher
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1 text-[11px] text-green-600 font-semibold">
                        <CheckCircle2 className="w-3 h-3" /> Active
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
