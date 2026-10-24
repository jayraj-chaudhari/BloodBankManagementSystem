import React from 'react';
import { Megaphone, Sparkles, Activity } from 'lucide-react';

export default function Banner({ onOpenAnnouncement }) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#1B3BB3] via-[#2D56E1] to-[#407BFF] text-white p-6 sm:p-8 shadow-card mb-6">
      {/* Decorative Wave SVGs & Radial Glow */}
      <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-white/10 blur-2xl pointer-events-none" />
      <div className="absolute right-0 bottom-0 opacity-20 pointer-events-none">
        <svg width="450" height="140" viewBox="0 0 450 140" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 60C120 120 220 10 330 70C390 100 420 40 450 60V140H0V60Z" fill="white" fillOpacity="0.4" />
          <path d="M0 90C100 130 200 40 320 95C380 120 410 70 450 85V140H0V90Z" fill="white" fillOpacity="0.6" />
        </svg>
      </div>

      <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Hello Devs!
            </h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/20 text-white backdrop-blur-sm">
              <Sparkles className="w-3 h-3 text-amber-300" />
              Live System
            </span>
          </div>
          <p className="text-blue-100 text-sm sm:text-base leading-relaxed">
            We are on a mission to help healthcare providers monitor real-time blood stock, donor drives, and emergency transfusions for FREE.
          </p>
        </div>

        {/* Announcements Pill Button */}
        <div className="shrink-0">
          <button
            onClick={onOpenAnnouncement}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 active:bg-white/30 text-white text-xs sm:text-sm font-semibold backdrop-blur-md border border-white/20 transition-all shadow-sm"
          >
            <Megaphone className="w-4 h-4 text-white" />
            <span>Announcements</span>
          </button>
        </div>
      </div>
    </div>
  );
}
