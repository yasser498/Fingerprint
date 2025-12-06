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
  const [isConnected, setIsConnected] = useState(false);

  // Initialize Data
  useEffect(() => {
    setStudents(StorageService.getStudents());
    setAttendance(StorageService.getAttendance());
    setSchoolName(StorageService.getSettings().schoolName);
    
    // Initial Sync
    StorageService.syncWithDevice().then(() => {
        setAttendance(StorageService.getAttendance());
    });

    // Real-time Sync Loop (Every 10 seconds)
    const interval = setInterval(() => {
        StorageService.syncWithDevice().then(() => {
             // If sync succeeds (or fails silently), update local state
             setAttendance(StorageService.getAttendance());
             // Simple check if localhost:3001 is up (StorageService doesn't return status explicitly, 
             // but we could infer connection if attendance updates, for now we keep it simple)
             checkConnection();
        });
    }, 10000); 

    return () => clearInterval(interval);
  }, []);

  const checkConnection = async () => {
      try {
          const res = await fetch('http://localhost:3001/status');
          if(res.ok) setIsConnected(true);
          else setIsConnected(false);
      } catch (e) {
          setIsConnected(false);
      }
  };

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
    <div className="h-screen bg-slate-50 flex font-sans overflow-hidden" dir="rtl">
      {/* Sidebar - Hidden when printing */}
      <Sidebar currentView={currentView} onNavigate={setCurrentView} />
      
      {/* Main Content */}
      <main className="flex-1 md:mr-64 p-8 transition-all duration-300 print:mr-0 print:p-0 w-full overflow-x-hidden h-full overflow-y-auto scroll-smooth">
        
        {/* Header - Hidden when printing */}
        <header className="flex justify-between items-center mb-8 no-print sticky top-0 z-10 bg-slate-50/95 backdrop-blur-sm py-2">
            <div>
                <h1 className="text-sm text-slate-500 font-medium">نظام الإدارة المدرسية</h1>
                <p className="text-2xl text-slate-800 font-bold tracking-tight">{schoolName}</p>
            </div>
            <div className="flex items-center gap-4">
                <div className={`p-2 px-4 rounded-full border shadow-sm flex items-center gap-2 transition-colors ${isConnected ? 'bg-white border-slate-200' : 'bg-red-50 border-red-100'}`}>
                    <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-secondary animate-pulse' : 'bg-red-500'}`}></span>
                    <span className={`text-sm font-medium hidden sm:inline ${isConnected ? 'text-slate-600' : 'text-red-600'}`}>
                        {isConnected ? 'الخادم متصل' : 'الخادم غير متصل'}
                    </span>
                </div>
                <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold shadow-md">
                    A
                </div>
            </div>
        </header>

        {renderContent()}
        
        {/* Bottom spacer to ensure last element is not cut off */}
        <div className="h-10"></div>
      </main>
    </div>
  );
};

export default App;