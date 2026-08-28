/**
 * MPLADS RISE — Sidebar Layout
 */
import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FolderKanban, BarChart3,
  Bell, Bot, Landmark, LogOut, Menu, X, ChevronRight,
  Map, Trophy
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import FloatingChatWidget from './FloatingChatWidget';

const NAV_ITEMS = [
  { path: '/', icon: LayoutDashboard, label: 'Executive Overview' },
  { path: '/projects', icon: FolderKanban, label: 'Project Explorer' },
  { path: '/alerts', icon: Bell, label: 'Alerts & Flags' },
  { path: '/analytics', icon: BarChart3, label: 'Analytics' },
  { path: '/map', icon: Map, label: 'Risk Heat Map' },
  { path: '/mps', icon: Trophy, label: 'MP Leaderboard' },
  { path: '/knowledge', icon: Bot, label: 'Settings & Knowledge' },
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
    <div className="flex h-screen overflow-hidden bg-slate-100">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-slate-200 flex flex-col transform transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo */}
        <div className="gov-header p-4 flex items-center gap-3">
          <div className="bg-white/20 rounded-lg p-2">
            <Landmark className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="text-white font-bold text-sm leading-tight">MPLADS RISE</div>
            <div className="text-blue-200 text-xs">Risk Intelligence Engine</div>
          </div>
          <button
            className="ml-auto lg:hidden text-white"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Ministry badge */}
        <div className="px-4 py-2.5 bg-blue-50 border-b border-blue-100">
          <p className="text-xs text-blue-700 font-medium">Ministry of Statistics & PI</p>
          <p className="text-xs text-blue-500">Government of India</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-3 overflow-y-auto">
          {NAV_ITEMS.map(({ path, icon: Icon, label }) => (
            <NavLink
              key={path}
              to={path}
              end={path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-900 font-semibold'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
              onClick={() => setSidebarOpen(false)}
            >
              {({ isActive }) => (
                <>
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-blue-700' : ''}`} />
                  {label}
                  {isActive && <ChevronRight className="w-3 h-3 ml-auto text-blue-400" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-blue-900 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">
                {user?.username?.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">{user?.username}</p>
              <p className="text-xs text-slate-400 capitalize">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-3 flex-shrink-0">
          <button
            className="lg:hidden text-slate-600 hover:text-slate-900"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 ml-1">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs text-slate-500">System Operational</span>
          </div>
          <div className="ml-auto text-xs text-slate-400">
            SIH26102 · MPLADS eSAKSHI Integration
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {children}
        </main>
      </div>

      {/* Floating Chat Widget */}
      <FloatingChatWidget />
    </div>
  );
}
