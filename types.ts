export interface Student {
  id: string;
  name: string;
  studentId: string; // رقم الطالب
  grade: string;     // رقم الصف (مثلاً: الأول متوسط)
  classroom: string; // الفصل (مثلاً: أ، ب)
  phone: string;
  fingerprintId: string | null;
  fingerprintData?: string; // Simulated Base64 or hash
  createdAt: string;
}

export interface AttendanceRecord {
  id: string;
  studentId: string;
  studentName: string;
  timestamp: string;
  date: string; // YYYY-MM-DD for grouping
  status: 'present' | 'late' | 'absent';
  deviceId: string;
}

export interface AppSettings {
  schoolName: string;
  startTime: string;      // وقت بداية الدوام (مثلاً 07:00)
  lateThreshold: string;  // وقت احتساب التأخير (مثلاً 07:30)
  endTime: string;        // وقت نهاية الدوام
  deviceIp: string;       // عنوان جهاز البصمة
  devicePort: number;     // منفذ الاتصال
}

export type ViewState = 'dashboard' | 'students' | 'attendance' | 'reports' | 'settings';

export interface StatSummary {
  totalStudents: number;
  presentToday: number;
  lateToday: number;
  absentToday: number;
}