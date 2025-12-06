import React, { useMemo, useState } from 'react';
import { AttendanceRecord, AppSettings, Student } from '../types';
import { StorageService } from '../services/storageService';
import { Clock, CheckCircle2, XCircle, AlertTriangle, MessageCircle, Send, Check } from 'lucide-react';

interface AttendanceLogProps {
  attendance: AttendanceRecord[];
}

const AttendanceLog: React.FC<AttendanceLogProps> = ({ attendance }) => {
  const settings = StorageService.getSettings();
  const students = StorageService.getStudents(); // Need students to get phone numbers
  
  const [isSending, setIsSending] = useState(false);
  const [sendReport, setSendReport] = useState<{total: number, sent: number, failed: number} | null>(null);

  // Helper to calculate late minutes
  const calculateLateMinutes = (record: AttendanceRecord): number => {
    if (record.status !== 'late') return 0;
    
    const recordTime = new Date(record.timestamp);
    const [startH, startM] = settings.startTime.split(':').map(Number);
    
    const startTimeDate = new Date(recordTime);
    startTimeDate.setHours(startH, startM, 0, 0);

    const diffMs = recordTime.getTime() - startTimeDate.getTime();
    return Math.max(0, Math.floor(diffMs / 60000));
  };

  const sortedAttendance = useMemo(() => {
    return [...attendance].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [attendance]);

  // Handle Sending WhatsApp Notifications
  const handleSendNotifications = async () => {
      // 1. Identify today's Absent and Late students
      const today = new Date().toISOString().split('T')[0];
      const todayRecords = attendance.filter(r => r.date === today);
      
      // Calculate Absentees: Students in DB but not in today's attendance logs (or explicitly marked absent if implemented)
      // Current system implies if no record -> absent.
      // But let's assume we want to notify LATE students and anyone marked explicitly ABSENT in logs.
      // *Correction*: System generates 'present'/'late' on sync. Absent is calculated in Dashboard but not stored as a record unless logic added.
      // For this feature, we will iterate ALL students.
      
      const studentsToNotify = students.filter(student => {
          const record = todayRecords.find(r => r.studentId === student.id);
          // Condition: Notify if Late OR No Record (Absent)
          if (!record) return true; // Absent
          if (record.status === 'late') return true; // Late
          return false;
      });

      if (studentsToNotify.length === 0) {
          alert('لا يوجد طلاب غائبين أو متأخرين اليوم لإرسال إشعارات لهم.');
          return;
      }

      if (!confirm(`سيتم إرسال رسائل واتساب لـ ${studentsToNotify.length} طالب (غائب/متأخر). هل أنت متأكد؟`)) return;

      setIsSending(true);
      setSendReport({ total: studentsToNotify.length, sent: 0, failed: 0 });

      let sentCount = 0;
      let failedCount = 0;

      for (const student of studentsToNotify) {
          const record = todayRecords.find(r => r.studentId === student.id);
          const status = record ? 'late' : 'absent';
          const phone = student.phone;

          if (!phone || phone.length < 8) {
              failedCount++;
              continue;
          }

          let message = '';
          if (status === 'absent') {
              message = `ولي أمر الطالب/ة ${student.name} المحترم،\nنفيدكم بأن ابنكم/ابنتكم *غائب* عن المدرسة اليوم ${today}.\nنرجو التواصل مع الإدارة.\n- ${settings.schoolName}`;
          } else {
              const lateMins = calculateLateMinutes(record!);
              message = `ولي أمر الطالب/ة ${student.name} المحترم،\nنفيدكم بأن ابنكم/ابنتكم *تأخر* عن الحضور اليوم ${today} لمدة ${lateMins} دقيقة.\n- ${settings.schoolName}`;
          }

          const result = await StorageService.sendWhatsAppMessage(phone, message);
          if (result.success) sentCount++;
          else failedCount++;

          setSendReport({ total: studentsToNotify.length, sent: sentCount, failed: failedCount });
          
          // Small delay to avoid ban
          await new Promise(r => setTimeout(r, 1000));
      }

      setIsSending(false);
      alert(`اكتملت العملية:\n- تم الإرسال: ${sentCount}\n- فشل: ${failedCount}`);
      setSendReport(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
         <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Clock className="w-6 h-6 text-primary" />
                سجل الحضور اليومي
            </h2>
         </div>
         <div className="flex items-center gap-3">
             <div className="text-sm text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200 hidden md:block">
                وقت بداية الدوام: <span className="font-mono font-bold text-slate-800">{settings.startTime}</span>
             </div>
             
             <button 
                onClick={handleSendNotifications}
                disabled={isSending}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-white shadow-lg transition-all
                    ${isSending ? 'bg-slate-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 hover:scale-105'}
                `}
             >
                 {isSending ? (
                     <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        <span>جاري الإرسال ({sendReport?.sent}/{sendReport?.total})</span>
                     </>
                 ) : (
                     <>
                        <MessageCircle className="w-5 h-5" />
                        <span>إشعار الغياب والتأخير</span>
                     </>
                 )}
             </button>
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