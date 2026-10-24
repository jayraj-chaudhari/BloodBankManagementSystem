import React, { useState } from 'react';
import { UserPlus, Search, Phone, Mail, MapPin, Heart, CheckCircle2, AlertCircle } from 'lucide-react';

export default function DonorsView({ donors, onOpenNewDonor }) {
  const [search, setSearch] = useState('');
  const [filterGroup, setFilterGroup] = useState('ALL');

  const filtered = donors.filter((d) => {
    const matchesSearch = d.name?.toLowerCase().includes(search.toLowerCase()) ||
                          d.email?.toLowerCase().includes(search.toLowerCase()) ||
                          d.city?.toLowerCase().includes(search.toLowerCase());
    const matchesGroup = filterGroup === 'ALL' || d.blood_group === filterGroup;
    return matchesSearch && matchesGroup;
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">
            Registered Voluntary Donors
          </h2>
          <p className="text-xs text-slate-400">
            Secure donor registry with encrypted contact numbers and eligibility tracking
          </p>
        </div>

        <button
          onClick={onOpenNewDonor}
          className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white text-xs font-bold rounded-xl shadow-md shadow-brand-500/20 transition self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Register New Donor</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-4 shadow-card border border-slate-100 flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search donors by name, email or city..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {['ALL', 'O+', 'A+', 'B+', 'AB+', 'O-', 'A-', 'B-', 'AB-'].map((bg) => (
            <button
              key={bg}
              onClick={() => setFilterGroup(bg)}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition ${
                filterGroup === bg
                  ? 'bg-brand-500 text-white'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {bg}
            </button>
          ))}
        </div>
      </div>

      {/* Donor Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {filtered.map((donor) => (
          <div
            key={donor.id}
            className="bg-white rounded-2xl p-5 shadow-card hover:shadow-card-hover border border-slate-100 flex flex-col justify-between transition-all"
          >
            <div>
              <div className="flex items-start justify-between mb-3">
                <span className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-extrabold text-sm border border-rose-100">
                  {donor.blood_group}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  donor.status.includes('Eligible')
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                  {donor.status}
                </span>
              </div>

              <h3 className="font-bold text-slate-800 text-sm">{donor.name}</h3>
              <p className="text-xs text-slate-400 mt-0.5">{donor.email}</p>

              <div className="space-y-1.5 mt-3 pt-3 border-t border-slate-100 text-xs text-slate-600">
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{donor.phone}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{donor.city}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 text-rose-500" />
                  <span>{donor.donations} Life Donations</span>
                </div>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span>Last donated:</span>
              <span className="font-semibold text-slate-700">{donor.last_donated}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
