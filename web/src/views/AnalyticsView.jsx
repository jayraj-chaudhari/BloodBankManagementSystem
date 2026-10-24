import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';
import { Activity, ShieldAlert, Award, TrendingUp } from 'lucide-react';

export default function AnalyticsView() {
  const demandData = [
    { day: 'Mon', actual: 42, rollingAvg: 38 },
    { day: 'Tue', actual: 55, rollingAvg: 41 },
    { day: 'Wed', actual: 39, rollingAvg: 40 },
    { day: 'Thu', actual: 61, rollingAvg: 46 },
    { day: 'Fri', actual: 70, rollingAvg: 52 },
    { day: 'Sat', actual: 48, rollingAvg: 51 },
    { day: 'Sun', actual: 35, rollingAvg: 50 },
  ];

  const regionalRanks = [
    { rank: 1, name: 'Vikram Mehta', region: 'SUR', count: 14, badge: 'Diamond' },
    { rank: 2, name: 'Ananya Desai', region: 'SUR', count: 11, badge: 'Gold' },
    { rank: 3, name: 'Rajesh Sharma', region: 'AHM', count: 9, badge: 'Silver' },
    { rank: 4, name: 'Pooja Patel', region: 'VAD', count: 8, badge: 'Bronze' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">
          Clinical Analytics & Intelligence
        </h2>
        <p className="text-xs text-slate-400">
          Powered by SQL window functions (rolling 7-day demand, DENSE_RANK & FEFO)
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Demand Rolling Average Chart (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-card border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-800">
                Blood Demand vs 7-Day Rolling Average
              </h3>
              <p className="text-xs text-slate-400">Actual daily units needed vs smoothed trend</p>
            </div>
            <TrendingUp className="w-5 h-5 text-brand-500" />
          </div>

          <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={demandData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F3F9" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#8A92A6', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8A92A6', fontSize: 12 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                <Line type="monotone" dataKey="actual" name="Daily Demand Units" stroke="#3A57E8" strokeWidth={3} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="rollingAvg" name="7-Day Rolling Avg" stroke="#08B1BA" strokeWidth={2} strokeDasharray="4 4" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Donor Rankings */}
        <div className="bg-white rounded-2xl p-6 shadow-card border border-slate-100 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-800">Regional Leaderboard</h3>
              <Award className="w-5 h-5 text-amber-500" />
            </div>

            <div className="space-y-3">
              {regionalRanks.map((r) => (
                <div key={r.rank} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-brand-500 text-white flex items-center justify-center font-bold text-xs">
                      {r.rank}
                    </span>
                    <div>
                      <h4 className="font-bold text-xs text-slate-800">{r.name}</h4>
                      <p className="text-[10px] text-slate-400">Region: {r.region}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-extrabold text-brand-600">{r.count} Donations</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 text-center">
            <span className="text-[11px] text-slate-400">DENSE_RANK() OVER (PARTITION BY region_code)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
