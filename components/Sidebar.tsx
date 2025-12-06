import React from 'react';
import { LayoutDashboard, Users, Fingerprint, Database, FileText } from 'lucide-react';
import { ViewState } from '../types';

interface SidebarProps {
  currentView: ViewState;
  onNavigate: (view: ViewState) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onNavigate }) => {
  const menuItems = [
    { id: 'dashboard', label: 'لوحة التحكم', icon: LayoutDashboard },
    { id: 'students', label: 'الطلاب والبصمات', icon: Users },
    { id: 'attendance', label: 'سجل الحضور', icon: Fingerprint },
    { id: 'reports', label: 'التقارير الرسمية', icon: FileText },
    { id: 'settings', label: 'الإعدادات', icon: Database },
  ];

  return (
    <div className="w-64 bg-slate-900 text-white h-screen fixed right-0 top-0 hidden md:flex flex-col shadow-2xl z-20 transition-all duration-300 no-print">
      <div className="p-6 border-b border-slate-700 flex items-center gap-3">
        <div className="bg-primary-light p-2 rounded-lg shadow-lg shadow-primary-light/20">
          <Fingerprint className="w-6 h-6 text-white" />
        </div>
        <div>
           <h1 className="text-lg font-bold tracking-wide leading-tight">نظام البصمة</h1>
           <span className="text-xs text-slate-400 font-normal">الإصدار التعليمي</span>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id as ViewState)}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 group relative overflow-hidden
              ${currentView === item.id 
                ? 'bg-primary text-white shadow-lg shadow-primary/40' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
          >
            <item.icon className={`w-5 h-5 z-10 ${currentView === item.id ? 'animate-pulse' : ''}`} />
            <span className="font-medium z-10">{item.label}</span>
            {currentView === item.id && (
               <div className="absolute inset-0 bg-gradient-to-r from-primary to-primary-light opacity-100 z-0"></div>
            )}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-700">
        <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700/50 backdrop-blur-sm">
          <p className="text-xs text-slate-400 mb-1">حالة الاتصال</p>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-secondary shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse"></span>
            <span className="text-sm font-semibold text-slate-200">الخادم متصل</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;