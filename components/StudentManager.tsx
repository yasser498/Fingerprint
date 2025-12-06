import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Plus, Search, FileDown, FileUp, Trash2, Fingerprint, ScanLine, Laptop, Save, X, AlertCircle } from 'lucide-react';
import { Student } from '../types';

interface StudentManagerProps {
  students: Student[];
  onAdd: (s: Student) => void;
  onDelete: (id: string) => void;
  onUpdate: (s: Student) => void;
}

const StudentManager: React.FC<StudentManagerProps> = ({ students, onAdd, onDelete, onUpdate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFingerprintModalOpen, setIsFingerprintModalOpen] = useState(false);
  const [selectedStudentForFP, setSelectedStudentForFP] = useState<Student | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState(false);

  // New Student Form State
  const [formData, setFormData] = useState<Partial<Student>>({
    name: '', studentId: '', grade: '', classroom: '', phone: ''
  });

  const filteredStudents = students.filter(s => 
    s.name.includes(searchTerm) || s.studentId.includes(searchTerm) || s.phone.includes(searchTerm)
  );

  const handleExportTemplate = () => {
    const headers = [
      { name: 'اسم الطالب', key: 'name' },
      { name: 'رقم الطالب', key: 'studentId' },
      { name: 'رقم الصف', key: 'grade' },
      { name: 'الفصل', key: 'classroom' },
      { name: 'الجوال', key: 'phone' },
      { name: 'رقم البصمة', key: 'fingerprintId' },
    ];
    
    // Create a sample row
    const sample = [
      { name: 'مثال: محمد أحمد', studentId: '1001', grade: 'الأول', classroom: 'أ', phone: '05xxxxxxxx', fingerprintId: 'FP_1001' }
    ];

    const ws = XLSX.utils.json_to_sheet(sample, { header: headers.map(h => h.key) });
    
    // Fix headers in Arabic
    XLSX.utils.sheet_add_aoa(ws, [headers.map(h => h.name)], { origin: "A1" });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Students");
    XLSX.writeFile(wb, "نموذج_الطلاب.xlsx");
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
      
      // Basic parsing logic (assuming row 1 is header)
      const rows = data.slice(1) as any[];
      let addedCount = 0;

      rows.forEach((row) => {
        if (row[0] && row[1]) {
           const newStudent: Student = {
             id: Math.random().toString(36).substr(2, 9),
             name: row[0],
             studentId: row[1]?.toString(),
             grade: row[2]?.toString() || '',
             classroom: row[3]?.toString() || '',
             phone: row[4]?.toString() || '',
             fingerprintId: row[5]?.toString() || null,
             createdAt: new Date().toISOString()
           };
           onAdd(newStudent);
           addedCount++;
        }
      });
      alert(`تم استيراد ${addedCount} طالب بنجاح`);
    };
    reader.readAsBinaryString(file);
    e.target.value = ''; // Reset
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
    setScanning(false);
  };

  const simulateScan = () => {
    setScanning(true);
    setTimeout(() => {
        setScanning(false);
        if (selectedStudentForFP) {
            const updated = {
                ...selectedStudentForFP,
                fingerprintId: `FP_${selectedStudentForFP.studentId}`,
                fingerprintData: 'mock_hash_xyz_123'
            };
            onUpdate(updated);
            setIsFingerprintModalOpen(false);
            alert('تم تسجيل البصمة وربطها بالجهاز بنجاح');
        }
    }, 2500);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-slate-800">إدارة الطلاب</h2>
        <div className="flex gap-2">
          <button 
            onClick={handleExportTemplate}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50"
          >
            <FileDown className="w-4 h-4" />
            <span>تصدير نموذج</span>
          </button>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50"
          >
            <FileUp className="w-4 h-4" />
            <span>استيراد اكسل</span>
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImport} 
            accept=".xlsx, .xls" 
            className="hidden" 
          />
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>طالب جديد</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
        <input 
          type="text" 
          placeholder="بحث بالاسم، رقم الطالب أو الجوال..." 
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
                    <td colSpan={5} className="px-6 py-8 text-center text-slate-400">لا يوجد طلاب مطابقين للبحث</td>
                </tr>
            ) : (
                filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-slate-600 font-mono">{student.studentId}</td>
                    <td className="px-6 py-4 font-medium text-slate-800">{student.name}</td>
                    <td className="px-6 py-4 text-slate-600">
                        <span className="px-2 py-1 bg-slate-100 rounded text-xs">
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
                                className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-3 py-1 rounded-full hover:bg-amber-100 text-sm"
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
            <div className="bg-slate-900 text-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-700">
                <div className="p-6 text-center">
                    <div className="w-20 h-20 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4 relative">
                        <Fingerprint className={`w-10 h-10 text-primary ${scanning ? 'animate-ping opacity-50' : ''}`} />
                        {scanning && <div className="absolute inset-0 border-2 border-primary rounded-full animate-ping"></div>}
                    </div>
                    <h3 className="text-xl font-bold mb-2">تسجيل بصمة: {selectedStudentForFP.name}</h3>
                    <p className="text-slate-400 text-sm mb-8">قم بوضع إصبع الطالب على جهاز الماسح الضوئي المتصل أو ارفع ملف البصمة</p>
                    
                    <div className="space-y-3">
                        <button 
                            onClick={simulateScan}
                            disabled={scanning}
                            className="w-full py-3 bg-primary rounded-xl font-bold hover:bg-indigo-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {scanning ? (
                                <>جاري المسح...</>
                            ) : (
                                <><ScanLine /> بدء المسح من الجهاز</>
                            )}
                        </button>
                        
                        <div className="relative">
                             <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" />
                             <button className="w-full py-3 bg-slate-800 rounded-xl font-medium hover:bg-slate-700 transition-all flex items-center justify-center gap-2 border border-slate-700">
                                <Laptop className="w-5 h-5" />
                                رفع ملف بصمة (PC)
                             </button>
                        </div>
                    </div>

                    <button 
                        onClick={() => setIsFingerprintModalOpen(false)}
                        className="mt-6 text-slate-500 hover:text-white text-sm"
                    >
                        إلغاء العملية
                    </button>
                </div>
            </div>
         </div>
      )}
    </div>
  );
};

export default StudentManager;