import React from 'react';
import { AlertCircle, Clock, CheckCircle2, ChevronRight, Phone } from 'lucide-react';

export default function UrgentRequests({ requests, onAllocate, onNewRequest }) {
  const getUrgencyBadge = (urgency) => {
    switch (urgency) {
      case 'CRITICAL':
        return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'HIGH':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      default:
        return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'FULFILLED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'DISPATCHED':
        return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'ALLOCATING':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      default:
        return 'bg-amber-50 text-amber-700 border-amber-200';
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-card border border-slate-100 mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <h3 className="text-lg font-bold text-slate-800">Hospital Blood Requests</h3>
          <p className="text-xs text-slate-400">Emergency transfusion matching pipeline</p>
        </div>
        <button
          onClick={onNewRequest}
          className="text-xs font-bold text-brand-500 hover:text-brand-600 flex items-center gap-1 self-start sm:self-auto"
        >
          <span>Create Request</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 text-slate-400 uppercase font-semibold">
              <th className="pb-3 pl-2">Hospital</th>
              <th className="pb-3">Group</th>
              <th className="pb-3">Component</th>
              <th className="pb-3">Units</th>
              <th className="pb-3">Urgency</th>
              <th className="pb-3">Status</th>
              <th className="pb-3 pr-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {requests?.map((req) => (
              <tr key={req.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="py-3.5 pl-2 font-bold text-slate-800">
                  {req.hospital}
                  <div className="text-[11px] font-normal text-slate-400 flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {req.created_at}
                  </div>
                </td>
                <td className="py-3.5">
                  <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-lg bg-rose-50 text-rose-600 font-extrabold text-xs">
                    {req.blood_group}
                  </span>
                </td>
                <td className="py-3.5 font-medium text-slate-600">
                  {req.component.replace('_', ' ')}
                </td>
                <td className="py-3.5 font-bold text-slate-800">
                  {req.units_needed}
                </td>
                <td className="py-3.5">
                  <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] border ${getUrgencyBadge(req.urgency)}`}>
                    {req.urgency}
                  </span>
                </td>
                <td className="py-3.5">
                  <span className={`px-2 py-0.5 rounded-full font-semibold text-[11px] border ${getStatusBadge(req.status)}`}>
                    {req.status}
                  </span>
                </td>
                <td className="py-3.5 pr-2 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {req.status === 'PENDING' && (
                      <button
                        onClick={() => onAllocate(req)}
                        className="px-2.5 py-1 bg-brand-500 hover:bg-brand-600 text-white rounded-lg font-semibold text-[11px] transition shadow-sm"
                      >
                        Allocate
                      </button>
                    )}
                    {req.contact && (
                      <a
                        href={`tel:${req.contact}`}
                        className="p-1.5 text-slate-400 hover:text-brand-500 hover:bg-brand-50 rounded-lg transition"
                        title={req.contact}
                      >
                        <Phone className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
