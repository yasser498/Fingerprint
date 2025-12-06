import React from 'react';
import { Users, UserCheck, Clock, UserX, TrendingUp } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Student, AttendanceRecord } from '../types';

interface DashboardProps {
  students: Student[];
  attendance: AttendanceRecord[];
}

const Dashboard: React.FC<DashboardProps> = ({ students, attendance }) => {
  // Calculate Stats
  const today = new Date().toISOString().split('T')[0];
  const todaysAttendance = attendance.filter(r => r.date === today);
  
  const presentCount = todaysAttendance.filter(r => r.status === 'present').length;
  const lateCount = todaysAttendance.filter(r => r.status === 'late').length;
  const absentCount = Math.max(0, students.length - (presentCount + lateCount));

  const stats = [
    { label: 'إجمالي الطلاب', value: students.length, icon: Users, color: 'bg-primary', bg: 'bg-blue-50', text: 'text-primary' },
    { label: 'حضور اليوم', value: presentCount, icon: UserCheck, color: 'bg-green-600', bg: 'bg-green-50', text: 'text-green-700' },
    { label: 'تأخير', value: lateCount, icon: Clock, color: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-700' },
    { label: 'غياب', value: absentCount, icon: UserX, color: 'bg-red-500', bg: 'bg-red-50', text: 'text-red-700' },
  ];

  // Chart Data
  const pieData = [
    { name: 'حضور', value: presentCount, color: '#059669' },
    { name: 'تأخير', value: lateCount, color: '#d97706' },
    { name: 'غياب', value: absentCount, color: '#dc2626' },
  ].filter(d => d.value > 0);

  const barData = [
    { name: 'الأحد', present: 40, late: 5, absent: 2 },
    { name: 'الإثنين', present: 38, late: 7, absent: 2 },
    { name: 'الثلاثاء', present: 42, late: 3, absent: 2 },
    { name: 'الأربعاء', present: 35, late: 8, absent: 4 },
    { name: 'الخميس', present: presentCount || 40, late: lateCount || 4, absent: absentCount || 3 },
  ];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex items-center justify-between hover:shadow-lg hover:border-primary/20 transition-all duration-300 group">
            <div>
              <p className="text-slate-500 text-sm font-medium mb-1">{stat.label}</p>
              <h3 className={`text-4xl font-bold ${stat.text} tracking-tight`}>{stat.value}</h3>
            </div>
            <div className={`p-4 rounded-xl ${stat.bg} group-hover:scale-110 transition-transform`}>
              <stat.icon className={`w-6 h-6 ${stat.text}`} />
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Trends */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-6">
             <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-slate-400" />
                إحصائيات الحضور الأسبوعية
             </h3>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} barSize={32}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b' }} />
                <Tooltip 
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="present" name="حضور" fill="#059669" radius={[6, 6, 0, 0]} />
                <Bar dataKey="late" name="تأخير" fill="#d97706" radius={[6, 6, 0, 0]} />
                <Bar dataKey="absent" name="غياب" fill="#dc2626" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Daily Distribution */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-6">توزيع اليوم</h3>
          <div className="h-64 w-full flex items-center justify-center relative">
            {pieData.length === 0 ? (
               <div className="text-slate-400 text-center flex flex-col items-center gap-2">
                 <UserX className="w-8 h-8 opacity-50" />
                 <span>لا توجد بيانات كافية</span>
               </div>
            ) : (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{borderRadius: '8px', border: 'none'}} />
              </PieChart>
            </ResponsiveContainer>
            )}
             <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                    <span className="text-3xl font-bold text-slate-800">{presentCount}</span>
                    <p className="text-xs text-slate-500 font-medium">حاضر الآن</p>
                </div>
            </div>
          </div>
          <div className="flex justify-center gap-4 mt-8">
            {pieData.map((d, i) => (
                <div key={i} className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{backgroundColor: d.color}}></span>
                    <span className="text-sm text-slate-600 font-medium">{d.name}</span>
                </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;