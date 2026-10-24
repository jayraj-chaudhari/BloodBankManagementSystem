import React from 'react';
import { ChevronDown, Droplet, ArrowUpRight, AlertTriangle } from 'lucide-react';

export default function InventoryOverview({ inventory }) {
  const bloodGroups = inventory || [
    { group: 'O+', units: 480, status: 'Optimal', color: 'bg-emerald-500', percentage: 78 },
    { group: 'A+', units: 320, status: 'Adequate', color: 'bg-blue-500', percentage: 65 },
    { group: 'B+', units: 290, status: 'Adequate', color: 'bg-indigo-500', percentage: 58 },
    { group: 'AB+', units: 140, status: 'Low', color: 'bg-amber-500', percentage: 42 },
    { group: 'O-', units: 65, status: 'Critical', color: 'bg-rose-500', percentage: 22 },
    { group: 'A-', units: 50, status: 'Critical', color: 'bg-rose-500', percentage: 18 },
    { group: 'B-', units: 45, status: 'Critical', color: 'bg-rose-500', percentage: 15 },
    { group: 'AB-', units: 30, status: 'Urgent', color: 'bg-red-600', percentage: 10 },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      {/* Card 1: Stock Status / Earnings Style */}
      <div className="bg-white rounded-2xl p-6 shadow-card border border-slate-100">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-lg font-bold text-slate-800">Blood Stock Level</h3>
            <p className="text-xs text-slate-400">Available units by blood group</p>
          </div>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition">
            <span>This Week</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>

        {/* Progress List */}
        <div className="space-y-3.5">
          {bloodGroups.slice(0, 4).map((item, idx) => (
            <div key={idx} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-brand-500" />
                  Type {item.group}
                </span>
                <span className="font-semibold text-slate-500">
                  {item.units} Units ({item.status})
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full rounded-full ${item.color} transition-all duration-500`}
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Card 2: Rare & Critical Stock / Conversions Style */}
      <div className="bg-white rounded-2xl p-6 shadow-card border border-slate-100">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-slate-800">Critical Stock (Rh-ve)</h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700">
              High Priority
            </span>
          </div>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition">
            <span>This Week</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>

        {/* Rare Types List */}
        <div className="space-y-3.5">
          {bloodGroups.slice(4).map((item, idx) => (
            <div key={idx} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  Type {item.group}
                </span>
                <span className="font-semibold text-rose-600">
                  {item.units} Units left ({item.status})
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className={`h-full rounded-full ${item.color} transition-all duration-500`}
                  style={{ width: `${item.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
