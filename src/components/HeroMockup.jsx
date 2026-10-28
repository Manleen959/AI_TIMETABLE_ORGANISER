import React from 'react';
import { 
  Sparkles, 
  Search, 
  LayoutDashboard, 
  Calendar, 
  Users, 
  Layers, 
  Clock, 
  CheckCircle2, 
  SlidersHorizontal 
} from 'lucide-react';

export default function HeroMockup() {
  return (
    <div className="relative w-full max-w-5xl mx-auto pt-6 px-4">
      {/* Floating Pill Chips & Yellow 4-point stars */}
      
      {/* Star SVG 1 */}
      <div className="absolute -top-3 left-10 md:left-24 text-yellow-300 animate-pulse-subtle pointer-events-none">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0L14.6 9.4L24 12L14.6 14.6L12 24L9.4 14.6L0 12L9.4 9.4L12 0Z" />
        </svg>
      </div>

      {/* Star SVG 2 */}
      <div className="absolute top-12 right-8 md:right-28 text-yellow-300 animate-float pointer-events-none">
        <svg width="34" height="34" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0L14.6 9.4L24 12L14.6 14.6L12 24L9.4 14.6L0 12L9.4 9.4L12 0Z" />
        </svg>
      </div>

      {/* Floating Chip 1: Resolve clashes */}
      <div className="absolute -top-1 left-4 md:left-12 z-20 bg-white/95 backdrop-blur-md px-4 py-2 rounded-full shadow-soft-lg border border-line/80 flex items-center gap-2 animate-float text-xs md:text-sm font-semibold text-navy-900">
        <div className="w-5 h-5 rounded-full bg-green-50 flex items-center justify-center text-green-600">
          <Sparkles className="w-3.5 h-3.5 fill-green-600" />
        </div>
        <span>Resolve clashes</span>
        <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-bold">0 conflicts</span>
      </div>

      {/* Floating Chip 2: Find substitute */}
      <div className="absolute top-20 -right-2 md:right-8 z-20 bg-white/95 backdrop-blur-md px-4 py-2 rounded-full shadow-soft-lg border border-line/80 flex items-center gap-2 animate-float-delayed text-xs md:text-sm font-semibold text-navy-900">
        <div className="w-5 h-5 rounded-full bg-orange-50 flex items-center justify-center text-orange-500">
          <Sparkles className="w-3.5 h-3.5 fill-orange-500" />
        </div>
        <span>Find substitute</span>
        <span className="text-[10px] bg-lime-200 text-ink px-1.5 py-0.5 rounded-full font-bold">AI Matched</span>
      </div>

      {/* Floating Chip 3: Ask your timetable */}
      <div className="absolute -bottom-4 left-1/3 z-20 bg-white/95 backdrop-blur-md px-4 py-2 rounded-full shadow-soft-lg border border-line/80 hidden sm:flex items-center gap-2 animate-float text-xs md:text-sm font-semibold text-navy-900">
        <div className="w-5 h-5 rounded-full bg-navy-700/10 flex items-center justify-center text-navy-700">
          <Sparkles className="w-3.5 h-3.5 fill-navy-700" />
        </div>
        <span>Ask your timetable: &quot;Where is Lab 2 free on Friday?&quot;</span>
      </div>

      {/* Main Mockup Window peeking from bottom */}
      <div className="bg-white rounded-t-panel shadow-hero border-t border-x border-white/30 overflow-hidden transform transition-all duration-500 hover:-translate-y-1">
        {/* Top bar of mini window */}
        <div className="bg-slate-50/90 border-b border-line px-5 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-rose-400" />
            <div className="w-3 h-3 rounded-full bg-amber-400" />
            <div className="w-3 h-3 rounded-full bg-emerald-400" />
            <span className="text-xs font-semibold text-muted ml-2 hidden sm:inline">SmartSchedule PCTE Engine v2.4</span>
          </div>

          {/* Search pill */}
          <div className="flex-1 max-w-sm">
            <div className="bg-white border border-line rounded-full px-3.5 py-1.5 flex items-center gap-2 text-xs text-muted shadow-sm">
              <Search className="w-3.5 h-3.5 text-muted" />
              <span className="truncate">Search class, faculty (e.g. Gurjeet, BCA-1E)...</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-navy-700 bg-navy-50 px-3 py-1 rounded-full">
            <span className="w-2 h-2 rounded-full bg-green-600 animate-pulse" />
            <span className="hidden sm:inline">Live Engine</span>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex flex-col md:flex-row bg-[#F8FAFC]">
          {/* Mini Left Icon Rail */}
          <div className="hidden md:flex flex-col items-center py-5 px-3 border-r border-line bg-white gap-4 w-16">
            <div className="w-10 h-10 rounded-full bg-green-600 text-white flex items-center justify-center shadow-sm">
              <LayoutDashboard className="w-5 h-5" />
            </div>
            <div className="w-9 h-9 rounded-full hover:bg-slate-100 text-muted flex items-center justify-center transition-colors">
              <Calendar className="w-4 h-4" />
            </div>
            <div className="w-9 h-9 rounded-full hover:bg-slate-100 text-muted flex items-center justify-center transition-colors">
              <Users className="w-4 h-4" />
            </div>
            <div className="w-9 h-9 rounded-full hover:bg-slate-100 text-muted flex items-center justify-center transition-colors">
              <Layers className="w-4 h-4" />
            </div>
            <div className="w-9 h-9 rounded-full hover:bg-slate-100 text-muted flex items-center justify-center transition-colors mt-auto">
              <SlidersHorizontal className="w-4 h-4" />
            </div>
          </div>

          {/* Body Dashboard View */}
          <div className="flex-1 p-4 md:p-6 space-y-4">
            {/* Overview Row: 4 Small Stat Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="bg-white p-3.5 rounded-card border border-line/70 shadow-soft">
                <span className="text-[11px] font-semibold uppercase text-muted tracking-wide">Classes</span>
                <div className="text-xl font-serif font-bold text-navy-900 mt-1">24 Batches</div>
                <div className="text-[10px] text-green-600 font-medium mt-0.5">BCA, BTech, MBA</div>
              </div>

              <div className="bg-white p-3.5 rounded-card border border-line/70 shadow-soft">
                <span className="text-[11px] font-semibold uppercase text-muted tracking-wide">Faculty</span>
                <div className="text-xl font-serif font-bold text-navy-900 mt-1">42 Professors</div>
                <div className="text-[10px] text-green-600 font-medium mt-0.5">100% assigned</div>
              </div>

              <div className="bg-white p-3.5 rounded-card border border-line/70 shadow-soft">
                <span className="text-[11px] font-semibold uppercase text-muted tracking-wide">Clashes Resolved</span>
                <div className="text-xl font-serif font-bold text-navy-900 mt-1">0 Clashes</div>
                <div className="text-[10px] text-green-600 font-medium mt-0.5 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Auto-optimised
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-card border border-line/70 shadow-soft">
                <span className="text-[11px] font-semibold uppercase text-muted tracking-wide">Room Utilisation</span>
                <div className="text-xl font-serif font-bold text-navy-900 mt-1">88.4%</div>
                <div className="text-[10px] text-navy-700 font-medium mt-0.5">16 smart halls</div>
              </div>
            </div>

            {/* Split Row: Donut + Mini Week Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
              {/* SVG Donut "92% clash-free" */}
              <div className="bg-white p-4 rounded-card border border-line/70 shadow-soft flex items-center gap-4">
                <div className="relative w-20 h-20 flex-shrink-0">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-slate-100"
                      strokeWidth="3.8"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-green-600 transition-all duration-1000 ease-out"
                      strokeDasharray="92, 100"
                      strokeWidth="3.8"
                      strokeLinecap="round"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-sm font-serif font-bold text-navy-900 leading-none">92%</span>
                    <span className="text-[8px] text-muted uppercase font-bold mt-0.5">Free</span>
                  </div>
                </div>
                <div>
                  <h4 className="font-serif font-bold text-navy-900 text-sm">Clash-free by design</h4>
                  <p className="text-xs text-muted mt-1 leading-snug">
                    Zero teacher double-booking, room overlap, or missing periods across 117 sessions.
                  </p>
                </div>
              </div>

              {/* Mini Week Grid */}
              <div className="lg:col-span-2 bg-white p-4 rounded-card border border-line/70 shadow-soft overflow-hidden">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-xs font-bold text-navy-900 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-navy-700" />
                    Preview: BCA 1E &amp; BTech CSE 7A Schedule
                  </span>
                  <span className="text-[10px] font-semibold bg-lime-300 text-ink px-2 py-0.5 rounded-full">
                    Active Week
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-2 text-[11px]">
                  <div className="bg-slate-50 border border-line/60 rounded-xl p-2">
                    <span className="text-[9px] font-bold text-muted uppercase">P1 (09:00)</span>
                    <div className="font-semibold text-navy-900 truncate mt-0.5">C Programming</div>
                    <div className="text-[10px] text-muted truncate">Dr. Sharma · ET-101</div>
                  </div>

                  <div className="bg-slate-50 border border-line/60 rounded-xl p-2">
                    <span className="text-[9px] font-bold text-muted uppercase">P2 (10:05)</span>
                    <div className="font-semibold text-navy-900 truncate mt-0.5">Dig. Electronics</div>
                    <div className="text-[10px] text-muted truncate">Prof. Harpreet · ET-101</div>
                  </div>

                  <div className="bg-green-50/80 border border-green-200/60 rounded-xl p-2">
                    <span className="text-[9px] font-bold text-green-700 uppercase">P5 LAB (13:35)</span>
                    <div className="font-semibold text-green-900 truncate mt-0.5">Programming LAB</div>
                    <div className="text-[10px] text-green-700 truncate">Dr. Sharma · LAB-1</div>
                  </div>

                  <div className="bg-slate-50 border border-line/60 rounded-xl p-2">
                    <span className="text-[9px] font-bold text-muted uppercase">P7 (15:40)</span>
                    <div className="font-semibold text-navy-900 truncate mt-0.5">AI Mentoring</div>
                    <div className="text-[10px] text-muted truncate">Er. Gurjeet · ET-101</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
