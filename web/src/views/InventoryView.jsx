import React, { useState } from 'react';
import { Droplet, AlertTriangle, ShieldCheck, CheckCircle2, Clock, Filter } from 'lucide-react';

export default function InventoryView({ inventory }) {
  const [selectedBranch, setSelectedBranch] = useState('ALL');

  const stockRows = [
    { branch: 'Surat Central Hub', group: 'O+', component: 'RED_CELLS', available: 140, quarantine: 8, reserved: 15, nearest_exp: '2026-11-20', status: 'STABLE' },
    { branch: 'Surat Central Hub', group: 'O-', component: 'RED_CELLS', available: 12, quarantine: 2, reserved: 8, nearest_exp: '2026-11-04', status: 'CRITICAL' },
    { branch: 'Ahmedabad North Branch', group: 'A+', component: 'WHOLE_BLOOD', available: 95, quarantine: 4, reserved: 10, nearest_exp: '2026-11-18', status: 'STABLE' },
    { branch: 'Ahmedabad North Branch', group: 'AB-', component: 'PLATELETS', available: 6, quarantine: 1, reserved: 4, nearest_exp: '2026-10-28', status: 'CRITICAL' },
    { branch: 'Vadodara Regional Depot', group: 'B+', component: 'PLASMA', available: 180, quarantine: 0, reserved: 20, nearest_exp: '2027-08-15', status: 'OPTIMAL' },
    { branch: 'Rajkot South Unit', group: 'B-', component: 'RED_CELLS', available: 15, quarantine: 2, reserved: 5, nearest_exp: '2026-11-09', status: 'LOW' },
  ];

  const filtered = selectedBranch === 'ALL'
    ? stockRows
    : stockRows.filter((r) => r.branch.includes(selectedBranch));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">
            Real-Time Blood Stock & Quarantine
          </h2>
          <p className="text-xs text-slate-400">
            Automated FEFO (First-Expired, First-Out) shelf-life tracker across branches
          </p>
        </div>

        {/* Branch Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold bg-white border border-slate-200 rounded-lg text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20"
          >
            <option value="ALL">All Branches & Hubs</option>
            <option value="Surat">Surat Central Hub</option>
            <option value="Ahmedabad">Ahmedabad North Branch</option>
            <option value="Vadodara">Vadodara Regional Depot</option>
            <option value="Rajkot">Rajkot South Unit</option>
          </select>
        </div>
      </div>

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-card flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-lg font-bold text-slate-800">448 Units</h4>
            <p className="text-xs text-slate-400">Verified Available</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-card flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-lg font-bold text-slate-800">17 Units</h4>
            <p className="text-xs text-slate-400">Under Lab Quarantine</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-card flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-lg font-bold text-slate-800">8 Units</h4>
            <p className="text-xs text-slate-400">Expiring Within 7 Days</p>
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-2xl p-6 shadow-card border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 uppercase font-semibold">
                <th className="pb-3 pl-2">Branch / Facility</th>
                <th className="pb-3">Group</th>
                <th className="pb-3">Component</th>
                <th className="pb-3 text-center">Available</th>
                <th className="pb-3 text-center">Quarantine</th>
                <th className="pb-3 text-center">Reserved</th>
                <th className="pb-3">Nearest Expiry</th>
                <th className="pb-3 pr-2 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50 transition">
                  <td className="py-3.5 pl-2 font-bold text-slate-800">{r.branch}</td>
                  <td className="py-3.5">
                    <span className="px-2 py-0.5 rounded-lg bg-rose-50 text-rose-600 font-extrabold text-xs">
                      {r.group}
                    </span>
                  </td>
                  <td className="py-3.5 font-medium text-slate-600">{r.component.replace('_', ' ')}</td>
                  <td className="py-3.5 text-center font-extrabold text-emerald-600">{r.available}</td>
                  <td className="py-3.5 text-center font-semibold text-amber-600">{r.quarantine}</td>
                  <td className="py-3.5 text-center font-semibold text-slate-500">{r.reserved}</td>
                  <td className="py-3.5 font-mono text-slate-600">{r.nearest_exp}</td>
                  <td className="py-3.5 pr-2 text-right">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      r.status === 'OPTIMAL' ? 'bg-emerald-100 text-emerald-700' :
                      r.status === 'STABLE' ? 'bg-blue-100 text-blue-700' :
                      r.status === 'LOW' ? 'bg-amber-100 text-amber-700' :
                      'bg-rose-100 text-rose-700'
                    }`}>
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
