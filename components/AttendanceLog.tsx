import React, { useMemo } from 'react';
import { AttendanceRecord, AppSettings } from '../types';
import { StorageService } from '../services/storageService';
import { Clock, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

interface AttendanceLogProps {
  attendance: AttendanceRecord[];
}

const AttendanceLog: React.FC<AttendanceLogProps> = ({ attendance }) => {
  const settings = StorageService.getSettings();

  // Helper to calculate late minutes
  const calculateLateMinutes = (record: AttendanceRecord): number => {
    if (record.status !== 'late') return 0;
    
    const recordTime = new Date(record.timestamp);
    const [startH, startM] = settings.startTime.split(':').map(Number);
    
    // Create a date object for the start time on the same day as the record
    const startTimeDate = new Date(recordTime);
    startTimeDate.setHours(startH, startM, 0, 0);

    const diffMs = recordTime.getTime() - startTimeDate.getTime();
    return Math.max(0, Math.floor(diffMs / 60000));
  };

  const sortedAttendance = useMemo(() => {
    return [...attendance].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [attendance]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
         <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Clock className="w-6 h-6 text-primary" />
            سجل الحضور اليومي
         </h2>
         <div className="text-sm text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200">
            وقت بداية الدوام: <span className="font-mono font-bold text-slate-800">{settings.startTime}</span>
         </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-right">
                <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                        <th className="px-6 py-4 text-sm font-bold text-slate-700">الطالب</th>
                        <th className="px-6 py-4 text-sm font-bold text-slate-700">التاريخ</th>
                        <th className="px-6 py-4 text-sm font-bold text-slate-700">وقت البصمة</th>
                        <th className="px-6 py-4 text-sm font-bold text-slate-700">الحالة</th>
                        <th className="px-6 py-4 text-sm font-bold text-slate-700">مقدار التأخر</th>
                        <th className="px-6 py-4 text-sm font-bold text-slate-700">الجهاز</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {sortedAttendance.length === 0 ? (
                        <tr>
                            <td colSpan={6} className="px-6 py-12 text-center text-slate-400">لا توجد سجلات حضور حتى الآن</td>
                        </tr>
                    ) : (
                        sortedAttendance.map(record => {
                            const lateMinutes = calculateLateMinutes(record);
                            return (
                                <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4 font-semibold text-slate-800">{record.studentName}</td>
                                    <td className="px-6 py-4 text-slate-600 font-medium">{record.date}</td>
                                    <td className="px-6 py-4 font-mono text-slate-600 bg-slate-50/50 w-fit">{new Date(record.timestamp).toLocaleTimeString('ar-SA')}</td>
                                    <td className="px-6 py-4">
                                        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                                            record.status === 'present' ? 'bg-green-50 text-green-700 border-green-200' :
                                            record.status === 'late' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-red-50 text-red-700 border-red-200'
                                        }`}>
                                            {record.status === 'present' && <CheckCircle2 className="w-3.5 h-3.5" />}
                                            {record.status === 'late' && <Clock className="w-3.5 h-3.5" />}
                                            {record.status === 'absent' && <XCircle className="w-3.5 h-3.5" />}
                                            <span>
                                                {record.status === 'present' ? 'حضور' : record.status === 'late' ? 'تأخير' : 'غياب'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {record.status === 'late' ? (
                                            <span className="flex items-center gap-1 text-red-600 font-bold text-sm">
                                                <AlertTriangle className="w-4 h-4" />
                                                {lateMinutes} دقيقة
                                            </span>
                                        ) : (
                                            <span className="text-slate-400">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-slate-400 text-xs font-mono">{record.deviceId}</td>
                                </tr>
                            );
                        })
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default AttendanceLog;