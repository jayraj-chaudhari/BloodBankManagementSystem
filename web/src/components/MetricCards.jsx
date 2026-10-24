import React from 'react';
import { ArrowUpRight, ArrowDownLeft, ChevronLeft, ChevronRight } from 'lucide-react';

export default function MetricCards({ stats }) {
  const cards = [
    {
      title: 'Total Stock',
      value: stats?.totalUnits ? `${stats.totalUnits.toLocaleString()} Units` : '1,420 Units',
      percent: 78,
      trend: 'up',
      color: '#3A57E8', // Blue
    },
    {
      title: 'Active Donors',
      value: stats?.activeDonors ? `${stats.activeDonors.toLocaleString()} Donors` : '850 Donors',
      percent: 45,
      trend: 'down',
      color: '#08B1BA', // Teal
    },
    {
      title: 'Pending Requests',
      value: stats?.pendingRequests ? `${stats.pendingRequests} Urgent` : '28 Urgent',
      percent: 62,
      trend: 'down',
      color: '#3A57E8',
    },
    {
      title: 'Transfusions Served',
      value: stats?.completedTransfusions ? `${stats.completedTransfusions.toLocaleString()}` : '3,842 Units',
      percent: 86,
      trend: 'up',
      color: '#08B1BA',
    },
  ];

  return (
    <div className="relative mb-6">
      {/* Subtle Side Navigation Buttons from the image */}
      <button className="hidden xl:flex absolute -left-3 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white shadow-md border border-slate-200 items-center justify-center text-slate-400 hover:text-slate-700 hover:scale-105 transition">
        <ChevronLeft className="w-4 h-4" />
      </button>
      <button className="hidden xl:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white shadow-md border border-slate-200 items-center justify-center text-slate-400 hover:text-slate-700 hover:scale-105 transition">
        <ChevronRight className="w-4 h-4" />
      </button>

      {/* Grid of 4 cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {cards.map((c, idx) => {
          // Circular SVG parameters
          const radius = 22;
          const circumference = 2 * Math.PI * radius;
          const strokeDashoffset = circumference - (c.percent / 100) * circumference;

          return (
            <div
              key={idx}
              className="bg-white rounded-2xl p-5 shadow-card hover:shadow-card-hover border border-slate-100 flex items-center gap-4 transition-all"
            >
              {/* Radial Progress Ring with Arrow */}
              <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
                <svg className="w-14 h-14 -rotate-90">
                  {/* Background Track */}
                  <circle
                    cx="28"
                    cy="28"
                    r={radius}
                    stroke="#F1F3F9"
                    strokeWidth="4"
                    fill="transparent"
                  />
                  {/* Progress Stroke */}
                  <circle
                    cx="28"
                    cy="28"
                    r={radius}
                    stroke={c.color}
                    strokeWidth="4"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    fill="transparent"
                    className="transition-all duration-700 ease-out"
                  />
                </svg>

                {/* Center Arrow Icon */}
                <div className="absolute inset-0 flex items-center justify-center text-slate-600">
                  {c.trend === 'up' ? (
                    <ArrowUpRight className="w-4 h-4" style={{ color: c.color }} />
                  ) : (
                    <ArrowDownLeft className="w-4 h-4" style={{ color: c.color }} />
                  )}
                </div>
              </div>

              {/* Text Info */}
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-400 truncate">
                  {c.title}
                </p>
                <h3 className="text-xl sm:text-2xl font-extrabold text-slate-800 tracking-tight mt-0.5">
                  {c.value}
                </h3>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
