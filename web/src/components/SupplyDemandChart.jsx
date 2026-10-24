import React, { useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid
} from 'recharts';
import { ChevronDown } from 'lucide-react';

export default function SupplyDemandChart({ trends }) {
  const [timeFilter, setTimeFilter] = useState('This Week');

  // Smooth sinusoidal wave data matching Hope UI curve points
  const defaultChartData = [
    { month: 'Jan', collected: 94, dispatched: 71 },
    { month: 'Feb', collected: 80, dispatched: 59 },
    { month: 'Mar', collected: 92, dispatched: 76 },
    { month: 'Apr', collected: 75, dispatched: 58 },
    { month: 'Jun', collected: 93, dispatched: 74 },
    { month: 'Jul', collected: 78, dispatched: 60 },
    { month: 'Aug', collected: 94, dispatched: 73 },
  ];

  const chartData = trends && trends.length > 0 ? trends : defaultChartData;

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/90 backdrop-blur-md text-white p-3 rounded-xl shadow-xl text-xs border border-slate-800">
          <p className="font-bold text-slate-300 mb-1">{label}</p>
          <p className="text-brand-300 font-semibold">
            Collected / Donations: <span className="font-extrabold text-white">{payload[0]?.value} Units</span>
          </p>
          <p className="text-accent-teal font-semibold">
            Dispatched / Transfused: <span className="font-extrabold text-white">{payload[1]?.value} Units</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-card border border-slate-100 flex flex-col justify-between h-full">
      {/* Chart Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">
            $855.8K
          </h2>
          <p className="text-xs font-semibold text-slate-400 mt-0.5">
            Gross Blood Products Processed
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-5 text-xs font-semibold">
          <div className="flex items-center gap-1.5 text-slate-600">
            <span className="w-2.5 h-2.5 rounded-full bg-[#3A57E8]"></span>
            <span>Donations (Inflow)</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-600">
            <span className="w-2.5 h-2.5 rounded-full bg-[#08B1BA]"></span>
            <span>Dispatched (Outflow)</span>
          </div>
        </div>

        {/* Filter Dropdown */}
        <div className="relative">
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition">
            <span>{timeFilter}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="w-full h-72 sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorCollected" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3A57E8" stopOpacity={0.18} />
                <stop offset="95%" stopColor="#3A57E8" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="colorDispatched" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#08B1BA" stopOpacity={0.18} />
                <stop offset="95%" stopColor="#08B1BA" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F3F9" />

            <XAxis
              dataKey="month"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#8A92A6', fontSize: 12, fontWeight: 500 }}
              dy={10}
            />

            <YAxis
              domain={[54, 99]}
              ticks={[54, 63, 72, 81, 90, 99]}
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#8A92A6', fontSize: 12, fontWeight: 500 }}
            />

            <Tooltip content={<CustomTooltip />} />

            {/* Smooth sinusoidal wave line 1: Blue (#3A57E8) */}
            <Area
              type="monotone"
              dataKey="collected"
              stroke="#3A57E8"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorCollected)"
              dot={false}
              activeDot={{ r: 6, fill: '#3A57E8', stroke: '#fff', strokeWidth: 2 }}
            />

            {/* Smooth sinusoidal wave line 2: Teal (#08B1BA) */}
            <Area
              type="monotone"
              dataKey="dispatched"
              stroke="#08B1BA"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorDispatched)"
              dot={false}
              activeDot={{ r: 6, fill: '#08B1BA', stroke: '#fff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
