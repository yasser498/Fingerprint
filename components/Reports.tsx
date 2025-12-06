import React, { useState, useMemo } from 'react';
import { AttendanceRecord, Student } from '../types';
import { StorageService } from '../services/storageService';
import { Printer, Filter, Calendar as CalendarIcon, FileDown, PieChart, Table } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ReportsProps {
  attendance: AttendanceRecord[];
  students: Student[];
}

const Reports: React.FC<ReportsProps> = ({ attendance, students }) => {
  const settings = StorageService.getSettings();
  
  // State
  const [reportType, setReportType] = useState<'detailed' | 'stats'>('detailed');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'present' | 'late' | 'absent'>('all');

  // Filter Data
  const reportData = useMemo(() => {
    return attendance.filter(record => {
      const recordDate = record.date;
      const isDateInRange = recordDate >= startDate && recordDate <= endDate;
      const isStatusMatch = statusFilter === 'all' || record.status === statusFilter;
      return isDateInRange && isStatusMatch;
    }).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [attendance, startDate, endDate, statusFilter]);

  // Statistics Calculation
  const statsData = useMemo(() => {
    // 1. Student Stats
    const studentStats = new Map<string, {name: string, absent: number, late: number}>();
    // 2. Class Stats
    const classStats = new Map<string, {grade: string, room: string, present: number, late: number, absent: number, total: number}>();
    // 3. Day Stats
    const dayStats = new Map<string, {date: string, absent: number, late: number}>();

    reportData.forEach(record => {
        // Student Stats
        if (!studentStats.has(record.studentId)) {
            studentStats.set(record.studentId, { name: record.studentName, absent: 0, late: 0 });
        }
        const sStat = studentStats.get(record.studentId)!;
        if (record.status === 'absent') sStat.absent++;
        if (record.status === 'late') sStat.late++;

        // Day Stats
        if (!dayStats.has(record.date)) {
            dayStats.set(record.date, { date: record.date, absent: 0, late: 0 });
        }
        const dStat = dayStats.get(record.date)!;
        if (record.status === 'absent') dStat.absent++;
        if (record.status === 'late') dStat.late++;

        // Class Stats
        const student = students.find(s => s.id === record.studentId);
        if (student) {
            const classKey = `${student.grade} - ${student.classroom}`;
            if (!classStats.has(classKey)) {
                classStats.set(classKey, { grade: student.grade, room: student.classroom, present: 0, late: 0, absent: 0, total: 0 });
            }
            const cStat = classStats.get(classKey)!;
            cStat.total++;
            if (record.status === 'present') cStat.present++;
            if (record.status === 'late') cStat.late++;
            if (record.status === 'absent') cStat.absent++;
        }
    });

    const topAbsentStudents = Array.from(studentStats.values()).sort((a, b) => b.absent - a.absent).slice(0, 5).filter(s => s.absent > 0);
    const topLateStudents = Array.from(studentStats.values()).sort((a, b) => b.late - a.late).slice(0, 5).filter(s => s.late > 0);
    
    const topAbsentDays = Array.from(dayStats.values()).sort((a, b) => b.absent - a.absent).slice(0, 5).filter(d => d.absent > 0);
    const topLateDays = Array.from(dayStats.values()).sort((a, b) => b.late - a.late).slice(0, 5).filter(d => d.late > 0);

    const classesPerformance = Array.from(classStats.values()).map(c => ({
        ...c,
        presentPct: (c.present / c.total) * 100,
        latePct: (c.late / c.total) * 100,
        absentPct: (c.absent / c.total) * 100
    })).sort((a, b) => b.presentPct - a.presentPct);

    return { topAbsentStudents, topLateStudents, topAbsentDays, topLateDays, classesPerformance };
  }, [reportData, students]);

  // General Summary
  const summary = useMemo(() => {
    return {
      total: reportData.length,
      present: reportData.filter(r => r.status === 'present').length,
      late: reportData.filter(r => r.status === 'late').length,
      absent: reportData.filter(r => r.status === 'absent').length,
    };
  }, [reportData]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(reportData.map(r => ({
        'الطالب': r.studentName,
        'التاريخ': r.date,
        'الوقت': new Date(r.timestamp).toLocaleTimeString('ar-SA'),
        'الحالة': r.status === 'present' ? 'حضور' : r.status === 'late' ? 'تأخير' : 'غياب',
        'الجهاز': r.deviceId
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Attendance Report");
    XLSX.writeFile(wb, "تقرير_الحضور.xlsx");
  };

  const calculateLateMinutes = (record: AttendanceRecord): number => {
    if (record.status !== 'late') return 0;
    const recordTime = new Date(record.timestamp);
    const [startH, startM] = settings.startTime.split(':').map(Number);
    const startTimeDate = new Date(recordTime);
    startTimeDate.setHours(startH, startM, 0, 0);
    const diffMs = recordTime.getTime() - startTimeDate.getTime();
    return Math.max(0, Math.floor(diffMs / 60000));
  };

  // Official Header Component
  const OfficialHeader = ({ title }: { title: string }) => (
    <div className="flex justify-between items-start border-b border-slate-300 pb-6 mb-8 print:mb-4">
        <div className="text-center w-1/4 pt-2">
            <p className="font-bold text-sm text-slate-800">المملكة العربية السعودية</p>
            <p className="font-bold text-sm text-slate-800">وزارة التعليم</p>
            <p className="font-bold text-sm mt-1 text-slate-800">{settings.schoolName}</p>
            <p className="text-xs text-slate-500 mt-1">قسم شؤون الطلاب</p>
        </div>
        <div className="text-center flex-1 flex flex-col items-center">
            <img src="https://www.raed.net/img?id=1479025" alt="Ministry Logo" className="h-24 w-auto object-contain mb-2 opacity-90" />
            <h1 className="text-xl font-bold text-slate-900">{title}</h1>
        </div>
        <div className="text-left w-1/4 pt-2 text-sm space-y-1 text-slate-600">
            <p><span className="font-bold text-slate-800">تاريخ التقرير:</span> {new Date().toLocaleDateString('ar-SA')}</p>
            <p><span className="font-bold text-slate-800">من:</span> {startDate}</p>
            <p><span className="font-bold text-slate-800">إلى:</span> {endDate}</p>
        </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
      
      {/* Controls Section (Hidden on Print) */}
      <div className="no-print space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <FileDown className="w-6 h-6 text-primary" />
                التقارير والإحصائيات
            </h2>
          </div>

          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
             <div className="flex items-center gap-4 mb-4 border-b border-slate-100 pb-4">
                 <button 
                    onClick={() => setReportType('detailed')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all ${reportType === 'detailed' ? 'bg-primary text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                 >
                    <Table className="w-4 h-4" />
                    سجل الحضور التفصيلي
                 </button>
                 <button 
                    onClick={() => setReportType('stats')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all ${reportType === 'stats' ? 'bg-primary text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
                 >
                    <PieChart className="w-4 h-4" />
                    الإحصائيات الشاملة
                 </button>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
                        <CalendarIcon className="w-3.5 h-3.5" /> من تاريخ
                    </label>
                    <input 
                        type="date" 
                        value={startDate} 
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none text-sm text-slate-700"
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
                        <CalendarIcon className="w-3.5 h-3.5" /> إلى تاريخ
                    </label>
                    <input 
                        type="date" 
                        value={endDate} 
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none text-sm text-slate-700"
                    />
                </div>
                {reportType === 'detailed' && (
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-slate-700 flex items-center gap-1">
                            <Filter className="w-3.5 h-3.5" /> حالة الحضور
                        </label>
                        <select 
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as any)}
                            className="w-full p-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none text-sm text-slate-700"
                        >
                            <option value="all">الكل</option>
                            <option value="present">حضور فقط</option>
                            <option value="late">تأخير فقط</option>
                            <option value="absent">غياب فقط</option>
                        </select>
                    </div>
                )}
                <div className="flex gap-2 col-span-1 md:col-start-4">
                    {reportType === 'detailed' && (
                    <button 
                        onClick={handleExportExcel}
                        className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
                    >
                        <FileDown className="w-4 h-4" /> Excel
                    </button>
                    )}
                    <button 
                        onClick={handlePrint}
                        className="flex-1 bg-primary text-white py-2 px-4 rounded-lg hover:bg-primary-dark transition-colors flex items-center justify-center gap-2 text-sm font-medium shadow-lg shadow-primary/20"
                    >
                        <Printer className="w-4 h-4" /> طباعة
                    </button>
                </div>
             </div>
          </div>
      </div>

      {/* Report Content Container */}
      <div className="bg-white p-8 rounded-none md:rounded-2xl shadow-none md:shadow-lg border-0 md:border border-slate-200 print:shadow-none print:border-0 print:w-full min-h-[600px]">
         
         {/* DETAILED REPORT VIEW */}
         {reportType === 'detailed' && (
             <>
                 <OfficialHeader title="تقرير الحضور والانصراف" />
                 
                 {/* Summary Cards */}
                 <div className="grid grid-cols-4 gap-4 mb-8 print:mb-4">
                     <div className="border border-slate-200 rounded-lg p-3 text-center bg-slate-50/50 print:bg-white">
                         <p className="text-xs text-slate-500 font-bold">إجمالي السجلات</p>
                         <p className="text-xl font-bold text-slate-800">{summary.total}</p>
                     </div>
                     <div className="border border-green-200 rounded-lg p-3 text-center bg-green-50/30 print:bg-white print:border-slate-200">
                         <p className="text-xs text-green-700 print:text-slate-600 font-bold">حضور</p>
                         <p className="text-xl font-bold text-green-700 print:text-slate-800">{summary.present}</p>
                     </div>
                     <div className="border border-amber-200 rounded-lg p-3 text-center bg-amber-50/30 print:bg-white print:border-slate-200">
                         <p className="text-xs text-amber-700 print:text-slate-600 font-bold">تأخير</p>
                         <p className="text-xl font-bold text-amber-700 print:text-slate-800">{summary.late}</p>
                     </div>
                     <div className="border border-red-200 rounded-lg p-3 text-center bg-red-50/30 print:bg-white print:border-slate-200">
                         <p className="text-xs text-red-700 print:text-slate-600 font-bold">غياب</p>
                         <p className="text-xl font-bold text-red-700 print:text-slate-800">{summary.absent}</p>
                     </div>
                 </div>

                 {/* Data Table */}
                 <table className="w-full text-right border-collapse border border-slate-200 rounded-lg overflow-hidden">
                     <thead>
                         <tr className="bg-slate-50 print:bg-slate-100 text-slate-700 text-sm">
                             <th className="border border-slate-200 px-4 py-2 font-bold">م</th>
                             <th className="border border-slate-200 px-4 py-2 font-bold">اسم الطالب</th>
                             <th className="border border-slate-200 px-4 py-2 font-bold">التاريخ</th>
                             <th className="border border-slate-200 px-4 py-2 font-bold">وقت الدخول</th>
                             <th className="border border-slate-200 px-4 py-2 font-bold">الحالة</th>
                             <th className="border border-slate-200 px-4 py-2 font-bold">التأخر (دقيقة)</th>
                             <th className="border border-slate-200 px-4 py-2 font-bold">ملاحظات</th>
                         </tr>
                     </thead>
                     <tbody>
                         {reportData.map((record, index) => {
                             const lateMins = calculateLateMinutes(record);
                             return (
                                <tr key={index} className="text-sm text-slate-700 hover:bg-slate-50">
                                    <td className="border border-slate-200 px-4 py-2 text-center text-slate-500">{index + 1}</td>
                                    <td className="border border-slate-200 px-4 py-2 font-medium text-slate-800">{record.studentName}</td>
                                    <td className="border border-slate-200 px-4 py-2 text-slate-600">{record.date}</td>
                                    <td className="border border-slate-200 px-4 py-2 font-mono text-slate-600">
                                        {record.status === 'absent' ? '-' : new Date(record.timestamp).toLocaleTimeString('ar-SA')}
                                    </td>
                                    <td className="border border-slate-200 px-4 py-2 text-center">
                                        <span className={`font-bold ${
                                            record.status === 'present' ? 'text-green-700' :
                                            record.status === 'late' ? 'text-amber-700' : 'text-red-700'
                                        }`}>
                                            {record.status === 'present' ? 'حضور' : record.status === 'late' ? 'تأخير' : 'غياب'}
                                        </span>
                                    </td>
                                    <td className="border border-slate-200 px-4 py-2 text-center font-mono text-slate-600">
                                        {lateMins > 0 ? `${lateMins}` : '-'}
                                    </td>
                                    <td className="border border-slate-200 px-4 py-2"></td>
                                </tr>
                             )
                         })}
                     </tbody>
                 </table>
             </>
         )}

         {/* COMPREHENSIVE STATS VIEW */}
         {reportType === 'stats' && (
             <>
                <OfficialHeader title="التقرير الإحصائي الشامل" />
                
                <div className="grid grid-cols-2 gap-8 mb-8 break-inside-avoid">
                    {/* Top Absent Students */}
                    <div className="border border-slate-200 rounded-lg p-4">
                        <h3 className="font-bold text-red-800 mb-2 border-b border-red-100 pb-2">الطلاب الأكثر غياباً</h3>
                        <table className="w-full text-sm">
                            <thead className="bg-red-50 text-red-900">
                                <tr>
                                    <th className="p-2 border border-slate-200 rounded-tr-lg">اسم الطالب</th>
                                    <th className="p-2 border border-slate-200 w-24 rounded-tl-lg">عدد الأيام</th>
                                </tr>
                            </thead>
                            <tbody>
                                {statsData.topAbsentStudents.length > 0 ? statsData.topAbsentStudents.map((s, i) => (
                                    <tr key={i} className="text-center border-b border-slate-100 last:border-0">
                                        <td className="p-2 border-x border-slate-100 text-right text-slate-700">{s.name}</td>
                                        <td className="p-2 border-x border-slate-100 font-bold text-red-700">{s.absent}</td>
                                    </tr>
                                )) : <tr><td colSpan={2} className="p-4 text-center text-slate-400">لا يوجد بيانات</td></tr>}
                            </tbody>
                        </table>
                    </div>

                    {/* Top Late Students */}
                    <div className="border border-slate-200 rounded-lg p-4">
                        <h3 className="font-bold text-amber-800 mb-2 border-b border-amber-100 pb-2">الطلاب الأكثر تأخيراً</h3>
                        <table className="w-full text-sm">
                            <thead className="bg-amber-50 text-amber-900">
                                <tr>
                                    <th className="p-2 border border-slate-200 rounded-tr-lg">اسم الطالب</th>
                                    <th className="p-2 border border-slate-200 w-24 rounded-tl-lg">عدد الأيام</th>
                                </tr>
                            </thead>
                            <tbody>
                                {statsData.topLateStudents.length > 0 ? statsData.topLateStudents.map((s, i) => (
                                    <tr key={i} className="text-center border-b border-slate-100 last:border-0">
                                        <td className="p-2 border-x border-slate-100 text-right text-slate-700">{s.name}</td>
                                        <td className="p-2 border-x border-slate-100 font-bold text-amber-700">{s.late}</td>
                                    </tr>
                                )) : <tr><td colSpan={2} className="p-4 text-center text-slate-400">لا يوجد بيانات</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-8 mb-8 break-inside-avoid">
                    {/* Days with most absence */}
                    <div className="border border-slate-200 rounded-lg p-4">
                        <h3 className="font-bold text-slate-800 mb-2 border-b border-slate-100 pb-2">أكثر الأيام غياباً</h3>
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-slate-900">
                                <tr>
                                    <th className="p-2 border border-slate-200 rounded-tr-lg">التاريخ</th>
                                    <th className="p-2 border border-slate-200 w-24 rounded-tl-lg">العدد</th>
                                </tr>
                            </thead>
                            <tbody>
                                {statsData.topAbsentDays.length > 0 ? statsData.topAbsentDays.map((d, i) => (
                                    <tr key={i} className="text-center border-b border-slate-100 last:border-0">
                                        <td className="p-2 border-x border-slate-100 text-right text-slate-600">{d.date}</td>
                                        <td className="p-2 border-x border-slate-100 font-bold text-red-600">{d.absent}</td>
                                    </tr>
                                )) : <tr><td colSpan={2} className="p-4 text-center text-slate-400">لا يوجد بيانات</td></tr>}
                            </tbody>
                        </table>
                    </div>
                    {/* Days with most late */}
                    <div className="border border-slate-200 rounded-lg p-4">
                        <h3 className="font-bold text-slate-800 mb-2 border-b border-slate-100 pb-2">أكثر الأيام تأخراً</h3>
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 text-slate-900">
                                <tr>
                                    <th className="p-2 border border-slate-200 rounded-tr-lg">التاريخ</th>
                                    <th className="p-2 border border-slate-200 w-24 rounded-tl-lg">العدد</th>
                                </tr>
                            </thead>
                            <tbody>
                                {statsData.topLateDays.length > 0 ? statsData.topLateDays.map((d, i) => (
                                    <tr key={i} className="text-center border-b border-slate-100 last:border-0">
                                        <td className="p-2 border-x border-slate-100 text-right text-slate-600">{d.date}</td>
                                        <td className="p-2 border-x border-slate-100 font-bold text-amber-600">{d.late}</td>
                                    </tr>
                                )) : <tr><td colSpan={2} className="p-4 text-center text-slate-400">لا يوجد بيانات</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Classroom Stats */}
                <div className="break-inside-avoid border border-slate-200 rounded-lg p-4">
                    <h3 className="font-bold text-primary mb-2 border-b border-slate-100 pb-2">إحصائيات أداء الفصول (مرتبة حسب نسبة الحضور)</h3>
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50 text-slate-800">
                            <tr>
                                <th className="p-2 border border-slate-200 rounded-tr-lg">الصف / الفصل</th>
                                <th className="p-2 border border-slate-200">إجمالي السجلات</th>
                                <th className="p-2 border border-slate-200">نسبة الحضور</th>
                                <th className="p-2 border border-slate-200">نسبة التأخر</th>
                                <th className="p-2 border border-slate-200 rounded-tl-lg">نسبة الغياب</th>
                            </tr>
                        </thead>
                        <tbody>
                            {statsData.classesPerformance.length > 0 ? statsData.classesPerformance.map((c, i) => (
                                <tr key={i} className="text-center hover:bg-slate-50 border-b border-slate-100 last:border-0">
                                    <td className="p-2 border-x border-slate-100 text-right font-bold text-slate-700">{c.grade} - {c.room}</td>
                                    <td className="p-2 border-x border-slate-100 text-slate-600">{c.total}</td>
                                    <td className="p-2 border-x border-slate-100 text-green-700 font-bold" dir="ltr">{c.presentPct.toFixed(1)}%</td>
                                    <td className="p-2 border-x border-slate-100 text-amber-700" dir="ltr">{c.latePct.toFixed(1)}%</td>
                                    <td className="p-2 border-x border-slate-100 text-red-700" dir="ltr">{c.absentPct.toFixed(1)}%</td>
                                </tr>
                            )) : <tr><td colSpan={5} className="p-4 text-center text-slate-400">لا يوجد بيانات للفصول</td></tr>}
                        </tbody>
                    </table>
                </div>

             </>
         )}

         {/* Footer Signature */}
         <div className="mt-16 flex justify-between px-8 print:flex hidden">
             <div className="text-center">
                 <p className="font-bold text-slate-800 mb-16">مسؤول النظام</p>
                 <p className="text-slate-400">.......................</p>
             </div>
             <div className="text-center">
                 <p className="font-bold text-slate-800 mb-16">مدير المدرسة</p>
                 <p className="text-slate-400">.......................</p>
             </div>
             <div className="text-center">
                 <p className="font-bold text-slate-800 mb-4">الختم الرسمي</p>
                 <div className="w-24 h-24 border-2 border-slate-200 rounded-full mx-auto border-dashed"></div>
             </div>
         </div>
      </div>
    </div>
  );
};

export default Reports;