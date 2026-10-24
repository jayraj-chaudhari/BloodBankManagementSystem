import React from 'react';
import { 
  Search, 
  Send, 
  Bell, 
  Mail, 
  Menu, 
  ChevronLeft, 
  CheckCircle2, 
  AlertCircle,
  LogOut,
  User
} from 'lucide-react';

export default function Header({ 
  sidebarOpen, 
  setSidebarOpen, 
  backendStatus, 
  currentUser, 
  onOpenAuth, 
  onOpenNewRequest 
}) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-3.5 bg-white border-b border-slate-100 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.04)]">
      {/* Left: Hamburger & Search */}
      <div className="flex items-center gap-4 flex-1 max-w-xl">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="w-9 h-9 rounded-full bg-brand-500 hover:bg-brand-600 text-white flex items-center justify-center transition-all shadow-sm"
          title="Toggle Navigation"
        >
          <ChevronLeft className={`w-5 h-5 transition-transform duration-300 ${!sidebarOpen ? 'rotate-180' : ''}`} />
        </button>

        <div className="relative w-full max-w-md hidden sm:block">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search donors, blood units, requests..."
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 text-slate-700 placeholder-slate-400 transition"
          />
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Backend Connectivity Status Pill */}
        <div className="hidden lg:flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-600 border border-slate-200">
          <span className={`w-2 h-2 rounded-full ${backendStatus.isLive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
          {backendStatus.isLive ? 'Backend API Live' : 'API Mock Mode'}
        </div>

        {/* Action Button: Emergency / Go Pro styled */}
        <button
          onClick={onOpenNewRequest}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-brand-500 to-brand-600 hover:from-brand-600 hover:to-brand-700 text-white text-xs sm:text-sm font-semibold rounded-lg shadow-sm hover:shadow transition"
        >
          <Send className="w-3.5 h-3.5" />
          <span>New Request</span>
        </button>

        {/* Locale / Flag */}
        <div className="w-8 h-8 rounded-full overflow-hidden border border-slate-200 hidden sm:flex items-center justify-center bg-slate-50 text-xs font-bold" title="Region: India / US">
          <span className="text-sm">🇮🇳</span>
        </div>

        {/* Notification Bell */}
        <button 
          onClick={onOpenNewRequest}
          className="relative p-2 rounded-lg text-slate-500 hover:text-brand-500 hover:bg-slate-50 transition" 
          title="Urgent Alerts"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white"></span>
        </button>

        {/* Mail Icon */}
        <button className="relative p-2 rounded-lg text-slate-500 hover:text-brand-500 hover:bg-slate-50 transition hidden sm:block">
          <Mail className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-brand-500 rounded-full ring-2 ring-white"></span>
        </button>

        {/* User Profile */}
        <div 
          onClick={onOpenAuth}
          className="flex items-center gap-3 pl-2 sm:pl-3 border-l border-slate-200 cursor-pointer hover:opacity-90 transition"
        >
          <div className="relative">
            <img
              src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80"
              alt="Avatar"
              className="w-9 h-9 rounded-full object-cover ring-2 ring-brand-100"
            />
            <span className="bottom-0 right-0 absolute w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></span>
          </div>
          <div className="hidden md:block text-left">
            <p className="text-xs font-bold text-slate-800 leading-tight">
              {currentUser?.full_name || 'Austin Robertson'}
            </p>
            <p className="text-[11px] text-slate-400 capitalize">
              {currentUser?.role_name || 'Marketing Administrator'}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
