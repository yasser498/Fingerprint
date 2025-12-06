import { Student, AttendanceRecord, AppSettings } from '../types';

const KEYS = {
  STUDENTS: 'fp_sys_students',
  ATTENDANCE: 'fp_sys_attendance',
  SETTINGS: 'fp_sys_settings',
};

// Seed Data
const initialStudents: Student[] = [
  { id: '1', name: 'أحمد محمد علي', studentId: '2024001', grade: 'الأول', classroom: 'أ', phone: '0501234567', fingerprintId: 'FP_001', createdAt: new Date().toISOString() },
  { id: '2', name: 'خالد سيف الله', studentId: '2024002', grade: 'الأول', classroom: 'ب', phone: '0509876543', fingerprintId: 'FP_002', createdAt: new Date().toISOString() },
  { id: '3', name: 'سعيد عبدالله', studentId: '2024003', grade: 'الثاني', classroom: 'أ', phone: '0555555555', fingerprintId: null, createdAt: new Date().toISOString() },
  { id: '4', name: 'عمر المختار', studentId: '2024004', grade: 'الثالث', classroom: 'ج', phone: '0566666666', fingerprintId: 'FP_004', createdAt: new Date().toISOString() },
  { id: '5', name: 'يوسف الصديق', studentId: '2024005', grade: 'الثاني', classroom: 'ب', phone: '0599999999', fingerprintId: 'FP_005', createdAt: new Date().toISOString() },
];

const initialSettings: AppSettings = {
  schoolName: 'المدرسة النموذجية الحديثة',
  startTime: '07:00',
  lateThreshold: '07:30',
  endTime: '13:00',
  deviceIp: '192.168.1.201',
  devicePort: 4370
};

export const StorageService = {
  getStudents: (): Student[] => {
    const data = localStorage.getItem(KEYS.STUDENTS);
    if (!data) {
      localStorage.setItem(KEYS.STUDENTS, JSON.stringify(initialStudents));
      return initialStudents;
    }
    return JSON.parse(data);
  },

  saveStudent: (student: Student) => {
    const students = StorageService.getStudents();
    const existingIndex = students.findIndex(s => s.id === student.id);
    if (existingIndex >= 0) {
      students[existingIndex] = student;
    } else {
      students.push(student);
    }
    localStorage.setItem(KEYS.STUDENTS, JSON.stringify(students));
  },

  deleteStudent: (id: string) => {
    const students = StorageService.getStudents().filter(s => s.id !== id);
    localStorage.setItem(KEYS.STUDENTS, JSON.stringify(students));
  },

  getAttendance: (): AttendanceRecord[] => {
    const data = localStorage.getItem(KEYS.ATTENDANCE);
    return data ? JSON.parse(data) : [];
  },

  addAttendance: (record: AttendanceRecord) => {
    const logs = StorageService.getAttendance();
    logs.push(record);
    localStorage.setItem(KEYS.ATTENDANCE, JSON.stringify(logs));
  },

  getSettings: (): AppSettings => {
    const data = localStorage.getItem(KEYS.SETTINGS);
    if (!data) {
        return initialSettings;
    }
    return JSON.parse(data);
  },

  saveSettings: (settings: AppSettings) => {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  },

  // Mock function to simulate "Scanning" attendance for demo purposes
  simulateAttendance: () => {
    const students = StorageService.getStudents();
    const logs = StorageService.getAttendance();
    const today = new Date().toISOString().split('T')[0];
    const settings = StorageService.getSettings();
    
    // Check if we already have records for today to avoid duplicates in demo
    const hasRecords = logs.some(l => l.date === today);
    if (hasRecords) return;

    const [startH, startM] = settings.startTime.split(':').map(Number);
    const [lateH, lateM] = settings.lateThreshold.split(':').map(Number);

    const newLogs: AttendanceRecord[] = students.map((s, idx) => {
      // Logic relies on random for demo
      const rand = Math.random();
      let status: 'present' | 'late' | 'absent' = 'present';
      
      if (rand > 0.85) status = 'absent';
      else if (rand > 0.65) status = 'late';

      if (status === 'absent') return null; // Don't log if absent in this simple model

      // Generate realistic time based on status
      let logTime = new Date();
      if (status === 'late') {
         // Random minutes between 1 and 60 after late threshold
         const delay = Math.floor(Math.random() * 55) + 1;
         logTime.setHours(lateH, lateM + delay, 0); 
      } else {
         // Random minutes between start and late threshold
         // Simplified: Just 15 mins after start
         logTime.setHours(startH, startM + Math.floor(Math.random() * 25), 0);
      }

      return {
        id: Math.random().toString(36).substr(2, 9),
        studentId: s.id,
        studentName: s.name,
        timestamp: logTime.toISOString(),
        date: today,
        status: status,
        deviceId: `DEV_0${(idx % 2) + 1}`
      };
    }).filter(Boolean) as AttendanceRecord[];

    localStorage.setItem(KEYS.ATTENDANCE, JSON.stringify([...logs, ...newLogs]));
  },
  
  clearAll: () => {
    localStorage.removeItem(KEYS.STUDENTS);
    localStorage.removeItem(KEYS.ATTENDANCE);
    localStorage.removeItem(KEYS.SETTINGS);
    window.location.reload();
  }
};