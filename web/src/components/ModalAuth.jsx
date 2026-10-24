import React, { useState } from 'react';
import { X, ShieldCheck, Key, UserCheck, CheckCircle } from 'lucide-react';

export default function ModalAuth({ isOpen, onClose, onLogin, currentUser }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('Password123!');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const quickRoles = [
    { label: 'System Admin', email: 'admin@bloodbank.org', role: 'admin' },
    { label: 'BB Officer', email: 'officer@bloodbank.org', role: 'bb_officer' },
    { label: 'Lab Tech', email: 'labtech@bloodbank.org', role: 'lab_tech' },
    { label: 'Hospital User', email: 'hospital@apollo.org', role: 'hospital_user' },
    { label: 'Donor Profile', email: 'donor@example.com', role: 'donor' },
  ];

  const handleSelectQuickRole = (r) => {
    setEmail(r.email);
    setPassword('SecretPass123!');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onLogin(email, password);
    setLoading(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-brand-500 to-brand-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-brand-200" />
            <h3 className="text-base font-bold">Authentication & Role Switch</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/20 text-white/90 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current User Info */}
        {currentUser && (
          <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Logged in as:</span>
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              {currentUser.full_name} ({currentUser.role_name})
            </span>
          </div>
        )}

        {/* Quick Role Selection */}
        <div className="p-6 pb-2">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
            Quick Select Role
          </p>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {quickRoles.map((qr) => (
              <button
                key={qr.role}
                type="button"
                onClick={() => handleSelectQuickRole(qr)}
                className={`px-3 py-2 text-xs font-semibold rounded-xl border text-left transition ${
                  email === qr.email
                    ? 'border-brand-500 bg-brand-50 text-brand-600'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div>{qr.label}</div>
                <div className="text-[10px] text-slate-400 truncate">{qr.email}</div>
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-3 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@bloodbank.org"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-800"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-800"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-1.5 px-4 py-2 bg-brand-500 hover:bg-brand-600 active:scale-95 text-white rounded-lg font-bold shadow-md shadow-brand-500/30 transition disabled:opacity-50"
              >
                <Key className="w-3.5 h-3.5" />
                <span>{loading ? 'Authenticating...' : 'Sign In'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
