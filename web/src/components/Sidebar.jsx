import React from 'react';
import {
  LayoutDashboard,
  Layers,
  Palette,
  Users,
  ShieldCheck,
  Droplet,
  HeartHandshake,
  Activity,
  FileSpreadsheet,
  Settings,
  FolderGit2,
  ChevronRight,
  Database,
  Lock,
  GitBranch
} from 'lucide-react';

export default function Sidebar({ 
  currentTab, 
  setCurrentTab, 
  sidebarOpen, 
  onOpenAuth 
}) {
  const navSections = [
    {
      title: 'Home',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: null },
        { id: 'menu_style', label: 'Menu Style', icon: Layers, hasSub: true },
        { id: 'design_system', label: 'Design System', icon: Palette, badge: 'UI', badgeColor: 'bg-emerald-500' },
      ],
    },
    {
      title: 'Pages',
      items: [
        { id: 'inventory', label: 'Blood Inventory', icon: Droplet, hasSub: true },
        { id: 'requests', label: 'Blood Requests', icon: Activity, hasSub: true },
        { id: 'donors', label: 'Users & Donors', icon: Users, hasSub: true },
        { id: 'authentication', label: 'Authentication', icon: ShieldCheck, hasSub: true },
        { id: 'admin', label: 'Admin Portal', icon: Lock, hasSub: true },
      ],
    },
    {
      title: 'Elements',
      items: [
        { id: 'analytics', label: 'Analytics & Maps', icon: FileSpreadsheet, hasSub: true },
        { id: 'audit', label: 'Audit Trail (Hash)', icon: Database, hasSub: true },
        { id: 'settings', label: 'DB & Branch Config', icon: Settings, hasSub: true },
      ],
    },
  ];

  return (
    <aside
      className={`fixed lg:static top-0 left-0 z-40 h-screen bg-white border-r border-slate-100 flex flex-col transition-all duration-300 ease-in-out ${
        sidebarOpen ? 'w-64 translate-x-0' : '-translate-x-full lg:translate-x-0 lg:w-20'
      }`}
    >
      {/* Brand Logo Header */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100/60">
        <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center text-white shadow-md shadow-brand-500/30 shrink-0">
          {/* Hope UI / LifeFlow clover icon */}
          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
            <path d="M12 2a4 4 0 0 0-4 4v2H6a4 4 0 1 0 4 4h2v-2a4 4 0 0 0-4-4zm6 6h-2v2a4 4 0 1 0 4-4h-2zm-6 6h-2v2a4 4 0 1 0 4 4v-2h-2zm6 0v2a4 4 0 1 0 4-4h-2a4 4 0 0 0-2 2z"/>
          </svg>
        </div>
        {sidebarOpen && (
          <div>
            <span className="text-xl font-extrabold tracking-tight text-slate-900">
              Hope <span className="text-brand-500">UI</span>
            </span>
            <p className="text-[10px] text-slate-400 font-medium tracking-wide uppercase">
              Blood Bank System
            </p>
          </div>
        )}
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {navSections.map((sec, secIdx) => (
          <div key={secIdx}>
            {sidebarOpen && (
              <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2">
                {sec.title}
              </h3>
            )}
            <div className="space-y-1">
              {sec.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (item.id === 'authentication') {
                        onOpenAuth();
                      } else {
                        setCurrentTab(item.id);
                      }
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all group ${
                      isActive
                        ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/30'
                        : 'text-slate-600 hover:text-brand-500 hover:bg-slate-50'
                    }`}
                    title={item.label}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`w-5 h-5 shrink-0 transition-transform group-hover:scale-105 ${
                        isActive ? 'text-white' : 'text-slate-400 group-hover:text-brand-500'
                      }`} />
                      {sidebarOpen && <span>{item.label}</span>}
                    </div>

                    {sidebarOpen && (
                      <div className="flex items-center gap-1.5">
                        {item.badge && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded text-white ${item.badgeColor || 'bg-brand-500'}`}>
                            {item.badge}
                          </span>
                        )}
                        {item.hasSub && (
                          <ChevronRight className={`w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-transform ${
                            isActive ? 'text-white/80' : ''
                          }`} />
                        )}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Info */}
      {sidebarOpen && (
        <div className="p-4 mx-4 mb-4 rounded-xl bg-slate-50 border border-slate-200/70 text-xs text-slate-500">
          <div className="flex items-center gap-1.5 font-semibold text-slate-700 mb-1">
            <GitBranch className="w-3.5 h-3.5 text-brand-500" />
            <span>Branch: feature/frontend</span>
          </div>
          <p className="text-[11px] text-slate-400">PostgreSQL RLS & Mongo Audit</p>
        </div>
      )}
    </aside>
  );
}
