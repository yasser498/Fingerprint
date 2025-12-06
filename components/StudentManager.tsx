import React, { useState, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Plus, Search, FileDown, FileUp, Trash2, Fingerprint, ScanLine, Laptop, Save, X, AlertCircle, Loader2, CheckCircle2, Wifi, Filter, RefreshCw, Database } from 'lucide-react';
import { Student } from '../types';
import { StorageService } from '../services/storageService';

interface StudentManagerProps {
  students: Student[];
  onAdd: (s: Student) => void;
  onDelete: (id: string) => void;
  onUpdate: (s: Student) => void;
}

const StudentManager: React.FC<StudentManagerProps> = ({ students, onAdd, onDelete, onUpdate }) => {
  // --- UI State ---
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFingerprintModalOpen, setIsFingerprintModalOpen] = useState(false);
  const [selectedStudentForFP, setSelectedStudentForFP] = useState<Student | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const settings = StorageService.getSettings();
  
  // --- Filter State ---
  const [filterGrade, setFilterGrade] = useState<string>('all');
  const [filterClassroom, setFilterClassroom] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'registered' | 'not_registered'>('all');

  // --- Scanning State ---
  const [scanStatus, setScanStatus] = useState<'idle' | 'connecting' | 'waiting_finger' | 'scanning' | 'success'>('idle');

  // --- Form State ---
  const [formData, setFormData] = useState<Partial<Student>>({
    name: '', studentId: '', grade: '', classroom: '', phone: ''
  });

  // --- Derived Data for Filters ---
  const uniqueGrades = useMemo(() => Array.from(new Set(students.map(s => s.grade).filter(Boolean))), [students]);
  const uniqueClassrooms = useMemo(() => Array.from(new Set(students.map(s => s.classroom).filter(Boolean))), [students]);

  // --- Filtering Logic ---
  const filteredStudents = useMemo(() => {
      return students.filter(s => {
          // 1. Text Search
          const matchesSearch = 
            s.name.includes(searchTerm) || 
            s.studentId.includes(searchTerm) || 
            s.phone.includes(searchTerm);
          
          // 2. Grade Filter
          const matchesGrade = filterGrade === 'all' || s.grade === filterGrade;

          // 3. Classroom Filter
          const matchesClassroom = filterClassroom === 'all' || s.classroom === filterClassroom;

          // 4. Fingerprint Status Filter
          const matchesStatus = 
            filterStatus === 'all' ? true :
            filterStatus === 'registered' ? !!s.fingerprintId :
            !s.fingerprintId;

          return matchesSearch && matchesGrade && matchesClassroom && matchesStatus;
      });
  }, [students, searchTerm, filterGrade, filterClassroom, filterStatus]);

  // --- Stats for Mini Dashboard ---
  const stats = useMemo(() => {
      return {
          total: students.length,
          registered: students.filter(s => s.fingerprintId).length,
          notRegistered: students.filter(s => !s.fingerprintId).length
      };
  }, [students]);

  // --- Handlers ---

  const handleExportTemplate = () => {
    const headers = [
      { name: 'اسم الطالب', key: 'name' },
      { name: 'رقم الطالب', key: 'studentId' },
      { name: 'رقم الصف', key: 'grade' },
      { name: 'الفصل', key: 'classroom' },
      { name: 'الجوال', key: 'phone' }
    ];
    
    const sample = [
      { name: 'مثال: محمد أحمد', studentId: '1001', grade: 'الأول', classroom: 'أ', phone: '05xxxxxxxx' }
    ];

    const ws = XLSX.utils.json_to_sheet(sample, { header: headers.map(h => h.key) });
    XLSX.utils.sheet_add_aoa(ws, [headers.map(h => h.name)], { origin: "A1" });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students_Template");
    XLSX.writeFile(wb, "نموذج_استيراد_الطلاب.xlsx");
  };

  // --- Full Database Backup (Preserves State) ---
  const handleFullBackup = () => {
      const dataStr = JSON.stringify(students, null, 2);
      const blob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup_students_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  };

  // --- Smart Sync Import ---
  const handleSmartSync = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm(`
    ⚠️ تنبيه هام: أنت على وشك إجراء "مزامنة ذكية":
    1. سيتم تحديث بيانات الطلاب الموجودين (مع الحفاظ على بصماتهم).
    2. سيتم إضافة الطلاب الجدد.
    3. سيتم حذف أي طالب موجود في النظام وغير موجود في الملف!
    
    هل أنت متأكد من المتابعة؟
    `)) {
        e.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
      
      const rows = data.slice(1) as any[]; // Skip header
      
      // 1. Process Excel Data into a Map
      const excelStudentsMap = new Map<string, any>();
      rows.forEach(row => {
          // Check mandatory fields (Name & ID) - Adjust indices based on your template
          // Assuming: 0:Name, 1:ID, 2:Grade, 3:Class, 4:Phone
          if(row[1]) {
             excelStudentsMap.set(String(row[1]).trim(), {
                 name: row[0],
                 studentId: String(row[1]).trim(),
                 grade: row[2] ? String(row[2]) : '',
                 classroom: row[3] ? String(row[3]) : '',
                 phone: row[4] ? String(row[4]) : ''
             });
          }
      });

      const currentStudents = [...students];
      const newStudentList: Student[] = [];
      let added = 0;
      let updated = 0;
      let deleted = 0;

      // 2. Iterate Excel Map: Update Existing or Create New
      excelStudentsMap.forEach((excelData, studentId) => {
          const existing = currentStudents.find(s => s.studentId === studentId);
          
          if (existing) {
              // Update logic: Preserve ID, FP ID, FP Data, CreatedAt
              newStudentList.push({
                  ...existing,
                  name: excelData.name, // Update Name
                  grade: excelData.grade, // Update Grade
                  classroom: excelData.classroom, // Update Class
                  phone: excelData.phone // Update Phone
              });
              updated++;
          } else {
              // Create New
              newStudentList.push({
                  id: Math.random().toString(36).substr(2, 9),
                  name: excelData.name,
                  studentId: studentId,
                  grade: excelData.grade,
                  classroom: excelData.classroom,
                  phone: excelData.phone,
                  fingerprintId: null,
                  createdAt: new Date().toISOString()
              });
              added++;
          }
      });

      // 3. Calculation Deletions (Those in DB but NOT in New List)
      // Note: newStudentList only contains people from Excel.
      // So anyone not in newStudentList is effectively deleted.
      deleted = currentStudents.length - updated; // (Total Old) - (Found & Updated)

      // 4. Save
      StorageService.setStudents(newStudentList);
      
      // Force UI Refresh (Parent Component needs to reload data, simpler to reload page or call a prop)
      alert(`تمت المزامنة بنجاح:\n- تم إضافة: ${added}\n- تم تحديث: ${updated}\n- تم حذف: ${deleted}`);
      window.location.reload(); // Simple refresh to ensure all states update
    };
    reader.readAsBinaryString(file);
    e.target.value = ''; 
  };

  const handleBulkDelete = () => {
      const count = filteredStudents.length;
      if (count === 0) return;

      if(confirm(`هل أنت متأكد من حذف (${count}) طالب؟\nسيتم حذفهم من قاعدة البيانات ومحاولة إزالتهم من سجلات البصمة.`)) {
          // Extract IDs
          const idsToDelete = filteredStudents.map(s => s.id);
          
          // Delete from Local Storage
          StorageService.deleteStudentsBulk(idsToDelete);

          // Simulate Device Deletion
          console.log(`[Device Simulation] Sending delete command for ${count} users...`);
          
          alert('تم الحذف بنجاح');
          window.location.reload();
      }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.studentId) return;
    
    onAdd({
      id: Math.random().toString(36).substr(2, 9),
      name: formData.name!,
      studentId: formData.studentId!,
      grade: formData.grade || '',
      classroom: formData.classroom || '',
      phone: formData.phone || '',
      fingerprintId: null, // Always null on manual creation
      createdAt: new Date().toISOString()
    });
    setIsModalOpen(false);
    setFormData({ name: '', studentId: '', grade: '', classroom: '', phone: '' });
  };

  const openFingerprintModal = (student: Student) => {
    setSelectedStudentForFP(student);
    setIsFingerprintModalOpen(true);
    setScanStatus('idle');
  };

  const simulateScan = () => {
    setScanStatus('connecting');
    setTimeout(() => {
        setScanStatus('waiting_finger');
        setTimeout(() => {
            setScanStatus('scanning');
            setTimeout(() => {
                if (selectedStudentForFP) {
                    const updated = {
                        ...selectedStudentForFP,
                        fingerprintId: `FP_${selectedStudentForFP.studentId}`,
                        fingerprintData: 'mock_hash_xyz_123'
                    };
                    onUpdate(updated);
                    setScanStatus('success');
                    setTimeout(() => {
                        setIsFingerprintModalOpen(false);
                        setScanStatus('idle');
                    }, 1500);
                }
            }, 2000);
        }, 3000);
    }, 2000);
  };

  const getStatusText = () => {
      const targetDevice = settings.devices[0];
      const deviceLabel = targetDevice ? (targetDevice.ip || targetDevice.name) : 'No Device';

      switch(scanStatus) {
          case 'connecting': return `جاري الاتصال بجهاز البصمة (${deviceLabel})...`;
          case 'waiting_finger': return 'يرجى وضع إصبع الطالب على الجهاز الآن...';
          case 'scanning': return 'جاري مسح البصمة ومعالجة البيانات...';
          case 'success': return 'تم تسجيل البصمة بنجاح!';
          default: return 'قم بوضع إصبع الطالب على جهاز الماسح الضوئي المتصل';
      }
  };

  return (
    <div className="space-y-6">
      
      {/* --- Mini Dashboard (Quick Stats) --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                  <p className="text-sm text-slate-500 font-bold mb-1">إجمالي الطلاب</p>
                  <h3 className="text-3xl font-bold text-slate-800">{stats.total}</h3>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg text-blue-600"><CheckCircle2 className="w-6 h-6" /></div>
          </div>
          <div 
             className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between cursor-pointer hover:border-green-300 transition-colors"
             onClick={() => setFilterStatus('registered')}
          >
              <div>
                  <p className="text-sm text-slate-500 font-bold mb-1">لديهم بصمة</p>
                  <h3 className="text-3xl font-bold text-green-600">{stats.registered}</h3>
              </div>
              <div className="bg-green-50 p-3 rounded-lg text-green-600"><Fingerprint className="w-6 h-6" /></div>
          </div>
          <div 
             className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between cursor-pointer hover:border-red-300 transition-colors"
             onClick={() => setFilterStatus('not_registered')}
          >
              <div>
                  <p className="text-sm text-slate-500 font-bold mb-1">بدون بصمة</p>
                  <h3 className="text-3xl font-bold text-red-500">{stats.notRegistered}</h3>
              </div>
              <div className="bg-red-50 p-3 rounded-lg text-red-500"><ScanLine className="w-6 h-6" /></div>
          </div>
      </div>

      {/* --- Controls Header --- */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        
        {/* Filters */}
        <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 flex items-center gap-1"><Filter className="w-3 h-3" /> المرحلة / الصف</label>
                <select 
                    value={filterGrade} 
                    onChange={e => setFilterGrade(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-primary/20"
                >
                    <option value="all">الكل</option>
                    {uniqueGrades.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
            </div>
            <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 flex items-center gap-1"><Filter className="w-3 h-3" /> الفصل</label>
                <select 
                    value={filterClassroom} 
                    onChange={e => setFilterClassroom(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-primary/20"
                >
                    <option value="all">الكل</option>
                    {uniqueClassrooms.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            </div>
            <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 flex items-center gap-1"><Fingerprint className="w-3 h-3" /> حالة البصمة</label>
                <select 
                    value={filterStatus} 
                    onChange={e => setFilterStatus(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-primary/20"
                >
                    <option value="all">الجميع</option>
                    <option value="registered">مسجل فقط</option>
                    <option value="not_registered">غير مسجل</option>
                </select>
            </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
            <button 
                onClick={handleFullBackup}
                title="تصدير قاعدة البيانات كاملة للحفاظ على حالة البصمة"
                className="flex items-center gap-2 px-3 py-2.5 bg-slate-800 text-white rounded-lg hover:bg-slate-700 shadow-sm text-sm"
            >
                <Database className="w-4 h-4" />
                <span className="hidden lg:inline">نسخ احتياطي (JSON)</span>
            </button>

            <button 
                onClick={handleExportTemplate}
                className="flex items-center gap-2 px-3 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 text-sm"
            >
                <FileDown className="w-4 h-4" />
                <span className="hidden lg:inline">نموذج</span>
            </button>

            <div className="relative">
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-3 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-sm shadow-green-200 text-sm"
                >
                    <RefreshCw className="w-4 h-4" />
                    <span>مزامنة Excel</span>
                </button>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleSmartSync} 
                    accept=".xlsx, .xls" 
                    className="hidden" 
                />
            </div>

            <button 
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 px-3 py-2.5 bg-primary text-white rounded-lg hover:bg-indigo-700 shadow-sm shadow-indigo-200 text-sm"
            >
                <Plus className="w-4 h-4" />
                <span>إضافة</span>
            </button>
        </div>
      </div>

      {/* Bulk Action Header (Only shows if filtered results exist) */}
      <div className="flex items-center justify-between bg-slate-100 p-3 rounded-xl border border-slate-200">
         <div className="text-sm text-slate-600 font-bold px-2">
             الطلاب المعروضين: <span className="text-primary">{filteredStudents.length}</span> طالب
         </div>
         {filteredStudents.length > 0 && (
             <button 
                onClick={handleBulkDelete}
                className="flex items-center gap-2 px-4 py-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 font-bold text-sm transition-colors"
             >
                <Trash2 className="w-4 h-4" />
                حذف القائمة الحالية ({filteredStudents.length})
             </button>
         )}
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
        <input 
          type="text" 
          placeholder="بحث سريع بالاسم، رقم الطالب أو الجوال..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-4 pr-12 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-right">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">رقم الطالب</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">الاسم</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">الصف / الفصل</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">حالة البصمة</th>
              <th className="px-6 py-4 text-sm font-semibold text-slate-600">إجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredStudents.length === 0 ? (
                <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-400">لا يوجد طلاب مطابقين للفلتر</td>
                </tr>
            ) : (
                filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-slate-600 font-mono">{student.studentId}</td>
                    <td className="px-6 py-4 font-medium text-slate-800">{student.name}</td>
                    <td className="px-6 py-4 text-slate-600">
                        <span className="px-2 py-1 bg-slate-100 rounded text-xs font-bold text-slate-600">
                            {student.grade} - {student.classroom}
                        </span>
                    </td>
                    <td className="px-6 py-4">
                        {student.fingerprintId ? (
                            <div className="flex items-center gap-1.5 text-green-600">
                                <Fingerprint className="w-4 h-4" />
                                <span className="text-sm font-medium">مسجل ({student.fingerprintId})</span>
                            </div>
                        ) : (
                            <button 
                                onClick={() => openFingerprintModal(student)}
                                className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-3 py-1 rounded-full hover:bg-amber-100 text-sm transition-colors border border-amber-100"
                            >
                                <ScanLine className="w-4 h-4" />
                                <span>تسجيل البصمة</span>
                            </button>
                        )}
                    </td>
                    <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => onDelete(student.id)}
                                title="حذف الطالب"
                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </td>
                </tr>
                ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Student Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-800">إضافة طالب جديد</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg flex items-start gap-2">
                 <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5" />
                 <p className="text-sm text-blue-700">
                    عند الإضافة اليدوية، لا يتم تسجيل البصمة فوراً. يمكنك إضافة البصمة لاحقاً من زر "تسجيل البصمة" في الجدول.
                 </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">رقم الطالب</label>
                    <input required type="text" className="w-full p-2 border border-slate-200 rounded-lg" value={formData.studentId} onChange={e => setFormData({...formData, studentId: e.target.value})} />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">الاسم الكامل</label>
                    <input required type="text" className="w-full p-2 border border-slate-200 rounded-lg" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">الصف الدراسي</label>
                    <input type="text" className="w-full p-2 border border-slate-200 rounded-lg" value={formData.grade} onChange={e => setFormData({...formData, grade: e.target.value})} />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">الفصل</label>
                    <input type="text" className="w-full p-2 border border-slate-200 rounded-lg" value={formData.classroom} onChange={e => setFormData({...formData, classroom: e.target.value})} />
                </div>
                <div className="col-span-2 space-y-2">
                    <label className="text-sm font-medium text-slate-700">رقم الجوال</label>
                    <input type="tel" className="w-full p-2 border border-slate-200 rounded-lg" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                </div>
              </div>
              <div className="pt-4">
                <button type="submit" className="w-full py-2.5 bg-primary text-white rounded-lg hover:bg-indigo-700 font-medium">حفظ البيانات</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Fingerprint Enrollment Modal */}
      {isFingerprintModalOpen && selectedStudentForFP && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-slate-900 text-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-700 transition-all">
                <div className="p-6 text-center">
                    
                    {/* Status Icon */}
                    <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 relative transition-all duration-500
                        ${scanStatus === 'success' ? 'bg-green-500/20' : 
                          scanStatus === 'waiting_finger' ? 'bg-amber-500/20' : 
                          scanStatus === 'scanning' ? 'bg-blue-500/20' : 
                          scanStatus === 'connecting' ? 'bg-indigo-500/20' : 'bg-slate-800'}
                    `}>
                        {scanStatus === 'idle' && <Fingerprint className="w-12 h-12 text-slate-400" />}
                        {scanStatus === 'connecting' && (
                           <>
                              <Wifi className="w-10 h-10 text-indigo-400 animate-pulse" />
                              <div className="absolute inset-0 border-4 border-indigo-500/30 rounded-full animate-[spin_3s_linear_infinite]"></div>
                           </>
                        )}
                        {scanStatus === 'waiting_finger' && (
                            <>
                                <Fingerprint className="w-12 h-12 text-amber-400 animate-pulse" />
                                <div className="absolute top-0 right-0 animate-bounce">
                                    <ScanLine className="w-6 h-6 text-amber-200" />
                                </div>
                            </>
                        )}
                        {scanStatus === 'scanning' && (
                            <>
                                <Fingerprint className="w-12 h-12 text-blue-400" />
                                <div className="absolute inset-0 border-4 border-blue-500/50 rounded-full animate-ping"></div>
                            </>
                        )}
                        {scanStatus === 'success' && <CheckCircle2 className="w-14 h-14 text-green-500 animate-in zoom-in" />}
                    </div>

                    <h3 className="text-xl font-bold mb-2">
                        {scanStatus === 'idle' ? `تسجيل بصمة: ${selectedStudentForFP.name}` : getStatusText()}
                    </h3>
                    
                    <p className={`text-sm mb-8 transition-colors ${
                        scanStatus === 'waiting_finger' ? 'text-amber-300 font-bold' : 
                        scanStatus === 'connecting' ? 'text-indigo-300' : 'text-slate-400'
                    }`}>
                        {getStatusText()}
                    </p>
                    
                    <div className="space-y-3">
                        {scanStatus === 'idle' && (
                            <button 
                                onClick={simulateScan}
                                className="w-full py-3 bg-primary rounded-xl font-bold hover:bg-indigo-600 transition-all flex items-center justify-center gap-2"
                            >
                                <ScanLine className="w-5 h-5" /> بدء عملية المسح
                            </button>
                        )}

                        {(scanStatus === 'connecting' || scanStatus === 'waiting_finger' || scanStatus === 'scanning') && (
                            <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                                <div className={`h-full transition-all duration-[2000ms] ease-out rounded-full
                                    ${scanStatus === 'connecting' ? 'w-1/4 bg-indigo-500' : 
                                      scanStatus === 'waiting_finger' ? 'w-1/2 bg-amber-500' : 
                                      'w-full bg-green-500'}`}
                                ></div>
                            </div>
                        )}
                        
                        {scanStatus === 'idle' && (
                            <div className="relative">
                                <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" />
                                <button className="w-full py-3 bg-slate-800 rounded-xl font-medium hover:bg-slate-700 transition-all flex items-center justify-center gap-2 border border-slate-700">
                                    <Laptop className="w-5 h-5" />
                                    رفع ملف بصمة (PC)
                                </button>
                            </div>
                        )}
                    </div>

                    {scanStatus !== 'success' && (
                        <button 
                            onClick={() => setIsFingerprintModalOpen(false)}
                            className="mt-6 text-slate-500 hover:text-white text-sm"
                            disabled={scanStatus !== 'idle'}
                        >
                            إلغاء العملية
                        </button>
                    )}
                </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default StudentManager;