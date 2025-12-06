
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
  deviceId: string; // اسم الجهاز الذي سجل الحضور
}

export interface FingerprintDevice {
  id: string;
  name: string;          // اسم الجهاز (مثلاً: بوابة 1)
  type: 'zk_direct' | 'file_monitor';
  ip?: string;           // لـ ZKTeco
  port?: number;         // لـ ZKTeco
  filePath?: string;     // للملفات
  lastSync?: string;
}

export interface AppSettings {
  schoolName: string;
  startTime: string;      
  lateThreshold: string;  
  endTime: string;        
  
  // New: List of devices instead of single config
  devices: FingerprintDevice[];
}

export type ViewState = 'dashboard' | 'students' | 'attendance' | 'reports' | 'settings';

export interface StatSummary {
  totalStudents: number;
  presentToday: number;
  lateToday: number;
  absentToday: number;
}
