import React from 'react';
import { X, Megaphone, Bell, Calendar, MapPin } from 'lucide-react';

export default function ModalAnnouncement({ isOpen, onClose }) {
  if (!isOpen) return null;

  const announcements = [
    {
      title: 'Mega Voluntary Blood Donation Camp - Surat Central',
      date: 'Upcoming Sunday, 9:00 AM - 5:00 PM',
      location: 'Civil Hospital Campus, Surat',
      tag: 'DONATION CAMP',
      tagColor: 'bg-emerald-100 text-emerald-700',
      description: 'Targeting 500 units collection with special focus on negative Rh groups (O-, A-, B-, AB-).'
    },
    {
      title: 'Rare Blood Group Alert: AB Negative Urgent Requirement',
      date: 'Active Alert',
      location: 'Apollo Trauma Centre',
      tag: 'URGENT REQUIREMENT',
      tagColor: 'bg-rose-100 text-rose-700',
      description: 'Compatible donors with AB- and O- are requested to visit nearest collection center.'
    },
    {
      title: 'System Upgrade: Immutable Audit Chain Active',
      date: 'Version 2.4 Deployed',
      location: 'Platform-wide',
      tag: 'SYSTEM NOTICE',
      tagColor: 'bg-blue-100 text-blue-700',
      description: 'All blood unit lifecycle transitions are cryptographically verified and hashed.'
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-brand-500 to-brand-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Megaphone className="w-5 h-5 text-amber-300" />
            <h3 className="text-base font-bold">Platform Announcements</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/20 text-white/90 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List */}
        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {announcements.map((item, idx) => (
            <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${item.tagColor}`}>
                  {item.tag}
                </span>
                <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {item.date}
                </span>
              </div>
              <h4 className="text-sm font-bold text-slate-800">{item.title}</h4>
              <p className="text-xs text-slate-600 leading-relaxed">{item.description}</p>
              <div className="text-[11px] text-slate-400 flex items-center gap-1 pt-1">
                <MapPin className="w-3 h-3 text-slate-400" />
                <span>{item.location}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-lg text-xs transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
