import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import StudentManager from './components/StudentManager';
import AttendanceLog from './components/AttendanceLog';
import Reports from './components/Reports';
import Settings from './components/Settings';
import { StorageService } from './services/storageService';
import { ViewState, Student, AttendanceRecord } from './types';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [schoolName, setSchoolName] = useState(StorageService.getSettings().schoolName);

  // Initialize Data
  useEffect(() => {
    setStudents(StorageService.getStudents());
    setAttendance(StorageService.getAttendance());
    setSchoolName(StorageService.getSettings().schoolName);
    
    // Simulate real-time updates / scanning for demo
    const interval = setInterval(() => {
        StorageService.simulateAttendance();
        setAttendance(StorageService.getAttendance());
    }, 10000); 

    return () => clearInterval(interval);
  }, []);

  // Refresh school name when navigating (e.g. back from settings)
  useEffect(() => {
    setSchoolName(StorageService.getSettings().schoolName);
  }, [currentView]);

  const handleAddStudent = (student: Student) => {
    StorageService.saveStudent(student);
    setStudents(StorageService.getStudents());
  };

  const handleUpdateStudent = (student: Student) => {
    StorageService.saveStudent(student);
    setStudents(StorageService.getStudents());
  };

  const handleDeleteStudent = (id: string) => {
    if(confirm('هل أنت متأكد من حذف الطالب؟')) {
        StorageService.deleteStudent(id);
        setStudents(StorageService.getStudents());
    }
  };

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard students={students} attendance={attendance} />;
      case 'students':
        return (
          <StudentManager 
            students={students} 
            onAdd={handleAddStudent} 
            onDelete={handleDeleteStudent}
            onUpdate={handleUpdateStudent}
          />
        );
      case 'attendance':
        return <AttendanceLog attendance={attendance} />;
      case 'reports':
        return <Reports attendance={attendance} students={students} />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard students={students} attendance={attendance} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans" dir="rtl">
      {/* Sidebar - Hidden when printing */}
      <Sidebar currentView={currentView} onNavigate={setCurrentView} />
      
      {/* Main Content */}
      <main className="flex-1 md:mr-64 p-8 transition-all duration-300 print:mr-0 print:p-0 w-full overflow-x-hidden">
        
        {/* Header - Hidden when printing */}
        <header className="flex justify-between items-center mb-8 no-print">
            <div>
                <h1 className="text-sm text-slate-500 font-medium">نظام الإدارة المدرسية</h1>
                <p className="text-2xl text-slate-800 font-bold tracking-tight">{schoolName}</p>
            </div>
            <div className="flex items-center gap-4">
                <div className="bg-white p-2 px-4 rounded-full border border-slate-200 shadow-sm flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-secondary animate-pulse"></span>
                    <span className="text-sm font-medium text-slate-600 hidden sm:inline">النظام متصل</span>
                </div>
                <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold shadow-md">
                    A
                </div>
            </div>
        </header>

        {renderContent()}
      </main>
    </div>
  );
};

export default App;