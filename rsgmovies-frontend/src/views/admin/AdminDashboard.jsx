import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Users,
  HardDrive,
  Activity,
  HeartPulse,
  AlertTriangle,
  LayoutDashboard,
  Shield,
} from 'lucide-react';
import AdminUsers from './AdminUsers';
import AdminSeedr from './AdminSeedr';
import AdminActivity from './AdminActivity';
import AdminHealth from './AdminHealth';
import AdminMaintenance from './AdminMaintenance';

export const AdminDashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'users';

  const setTab = (tab) => {
    setSearchParams({ tab });
  };

  const navTabs = [
    { id: 'users', label: 'User Management', icon: <Users size={16} /> },
    { id: 'seedr', label: 'Seedr Accounts', icon: <HardDrive size={16} /> },
    { id: 'activity', label: 'Audit & Activity Logs', icon: <Activity size={16} /> },
    { id: 'health', label: 'System Health', icon: <HeartPulse size={16} /> },
    { id: 'maintenance', label: 'Maintenance Mode', icon: <AlertTriangle size={16} /> },
  ];

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider mb-1">
            <Shield size={16} />
            <span>Administrator Control Suite</span>
          </div>
          <h1 className="text-3xl font-black font-display text-white tracking-tight">
            Admin Dashboard
          </h1>
          <p className="text-sm text-gray-400">
            Authoritative management of users, sessions, Seedr pools, audit logs, and system operations.
          </p>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar bg-surface p-1.5 rounded-2xl border border-white/5">
        {navTabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === t.id
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                : 'text-gray-400 hover:text-white hover:bg-surface-elevated'
            }`}
          >
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Active Tab Panel */}
      <div>
        {activeTab === 'users' && <AdminUsers />}
        {activeTab === 'seedr' && <AdminSeedr />}
        {activeTab === 'activity' && <AdminActivity />}
        {activeTab === 'health' && <AdminHealth />}
        {activeTab === 'maintenance' && <AdminMaintenance />}
      </div>
    </div>
  );
};

export default AdminDashboard;
