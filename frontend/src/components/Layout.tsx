/**
 * MPLADS RISE — Sidebar Layout
 * SIH26102: Core navigation — Dashboard, Projects, Alerts, Analytics
 */
import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FolderSearch, BarChart3,
  Bell, Landmark, LogOut, Menu, X, ChevronRight, ShieldAlert
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const NAV_ITEMS = [
  { path: '/', icon: LayoutDashboard, label: 'Executive Overview', desc: 'KPIs & risk distribution' },
  { path: '/projects', icon: FolderSearch, label: 'Project Explorer', desc: 'Browse & filter all works' },
  { path: '/alerts', icon: Bell, label: 'Alerts & Flags', desc: 'Active risk alerts' },
  { path: '/analytics', icon: BarChart3, label: 'Analytics', desc: 'Trends & anomaly charts' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-slate-900 border-r border-slate-800 flex flex-col transform transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo */}
        <div className="p-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 rounded-lg p-2 flex-shrink-0">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-white font-bold text-sm leading-tight">MPLADS RISE</div>
              <div className="text-blue-400 text-xs truncate">Risk Intelligence System</div>
            </div>
            <button
              className="ml-auto lg:hidden text-slate-400 hover:text-white"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Ministry badge */}
        <div className="px-4 py-2.5 bg-slate-800/50 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Landmark className="w-3 h-3 text-slate-400 flex-shrink-0" />
            <p className="text-xs text-slate-400">Ministry of Statistics &amp; PI · GoI</p>
          </div>
          <p className="text-xs text-blue-400 font-medium mt-0.5 ml-5">SIH26102</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 overflow-y-auto">
          <p className="px-4 pb-2 text-xs text-slate-600 uppercase tracking-wider font-semibold">
            Platform
          </p>
          {NAV_ITEMS.map(({ path, icon: Icon, label, desc }) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 mx-2 rounded-lg text-sm transition-all ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`
              }
              onClick={() => setSidebarOpen(false)}
            >
              {({ isActive }) => (
                <>
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-blue-400' : ''}`} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-xs leading-tight">{label}</div>
                    <div className="text-xs opacity-50 mt-0.5 truncate">{desc}</div>
                  </div>
                  {isActive && <ChevronRight className="w-3 h-3 ml-auto text-blue-400 flex-shrink-0" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">
                {user?.username?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-200 truncate">{user?.username}</p>
              <p className="text-xs text-slate-500 capitalize">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-500 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Top bar */}
        <header className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center gap-3 flex-shrink-0">
          <button
            className="lg:hidden text-slate-400 hover:text-white"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 ml-1">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-xs text-slate-500">System Operational</span>
          </div>
          <div className="ml-auto text-xs text-slate-600">
            SIH26102 · MPLADS eSAKSHI AI Risk Platform
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
