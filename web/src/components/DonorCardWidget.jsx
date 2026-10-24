import React from 'react';
import { Package, HeartHandshake, Download, Sparkles } from 'lucide-react';

export default function DonorCardWidget({ onDownloadReport }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-card border border-slate-100 flex flex-col justify-between h-full">
      {/* 1. Frosted Glassmorphic Smart Donor Card */}
      <div className="relative overflow-hidden rounded-2xl p-6 text-white bg-gradient-to-br from-[#2D56E1] via-[#3874FF] to-[#00C5C8] shadow-lg shadow-brand-500/20">
        {/* Subtle blur circles background */}
        <div className="absolute -top-12 -right-12 w-36 h-36 rounded-full bg-white/20 blur-xl pointer-events-none" />
        <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-[#00C5C8]/30 blur-lg pointer-events-none" />

        {/* Card Header */}
        <div className="flex items-start justify-between relative z-10">
          <div>
            <h4 className="text-xl font-extrabold tracking-wider">VISA</h4>
            <p className="text-[10px] font-semibold tracking-wider text-blue-100 uppercase">
              PREMIUM DONOR PASS
            </p>
          </div>

          {/* Dual overlapping circles logo */}
          <div className="flex items-center -space-x-3 opacity-90">
            <div className="w-8 h-8 rounded-full bg-white/40 backdrop-blur-sm"></div>
            <div className="w-8 h-8 rounded-full bg-white/60 backdrop-blur-sm"></div>
          </div>
        </div>

        {/* Card Number */}
        <div className="my-6 relative z-10">
          <p className="text-lg sm:text-xl font-mono tracking-widest font-bold">
            5789 **** **** 2847
          </p>
        </div>

        {/* Card Footer: Holder & Expiry */}
        <div className="flex items-end justify-between relative z-10 text-xs">
          <div>
            <p className="text-[10px] text-blue-200 uppercase font-medium">Card holder</p>
            <p className="font-bold tracking-wide mt-0.5">Mike Smith</p>
          </div>
          <div>
            <p className="text-[10px] text-blue-200 uppercase font-medium">Expire Date</p>
            <p className="font-bold tracking-wide mt-0.5">06/28</p>
          </div>
        </div>
      </div>

      {/* 2. Two Mini Stat Pills Below Card */}
      <div className="grid grid-cols-2 gap-4 my-5">
        {/* Safe Units */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-base font-bold text-slate-800">1,153</h4>
            <p className="text-xs text-slate-400 font-medium">Safe Units</p>
          </div>
        </div>

        {/* Lives Impacted */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center shrink-0">
            <HeartHandshake className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-base font-bold text-slate-800">81K</h4>
            <p className="text-xs text-slate-400 font-medium">Lives Served</p>
          </div>
        </div>
      </div>

      {/* 3. Bottom Big Metric with YoY badge & Download */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">
              $405,012,300
            </h3>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700">
              YoY 24%
            </span>
          </div>
          <p className="text-xs text-emerald-600 font-semibold mt-0.5">
            Life time donations value
          </p>
        </div>

        {/* Download Icon Button from image */}
        <button
          onClick={onDownloadReport}
          className="w-10 h-10 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white flex items-center justify-center shadow-md shadow-emerald-500/20 transition-all shrink-0"
          title="Download Report"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
