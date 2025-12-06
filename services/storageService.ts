import { Student, AttendanceRecord, AppSettings, FingerprintDevice } from '../types';

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
  devices: [
    { 
        id: 'dev_1', 
        name: 'البوابة الرئيسية (ZK)', 
        type: 'zk_direct', 
        ip: '192.168.1.201', 
        port: 4370 
    }
  ]
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

  // BULK SAVE (For Smart Sync)
  setStudents: (students: Student[]) => {
      localStorage.setItem(KEYS.STUDENTS, JSON.stringify(students));
  },

  deleteStudent: (id: string) => {
    const students = StorageService.getStudents().filter(s => s.id !== id);
    localStorage.setItem(KEYS.STUDENTS, JSON.stringify(students));
  },

  // BULK DELETE
  deleteStudentsBulk: (ids: string[]) => {
      const students = StorageService.getStudents().filter(s => !ids.includes(s.id));
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
    const parsed = JSON.parse(data);
    // Migration: ensure devices array exists if upgrading from old version
    if (!parsed.devices) {
        return { 
            ...initialSettings, 
            ...parsed, 
            devices: initialSettings.devices 
        };
    }
    return parsed;
  },

  saveSettings: (settings: AppSettings) => {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  },

  // MULTI-DEVICE SYNC
  syncWithDevice: async () => {
    const settings = StorageService.getSettings();
    const students = StorageService.getStudents();
    let existingLogs = StorageService.getAttendance(); // Let is mutable
    let totalNew = 0;

    // Loop through all configured devices
    for (const device of settings.devices) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 sec timeout per device

            // Build URL based on device config
            let url = `http://localhost:3001/logs?mode=${device.type}`;
            if (device.type === 'zk_direct') {
                if (!device.ip) continue;
                url += `&ip=${device.ip}&port=${device.port || 4370}`;
            } else {
                if (!device.filePath) continue;
                url += `&path=${encodeURIComponent(device.filePath)}`;
            }

            const response = await fetch(url, {
                method: 'GET',
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!response.ok) continue;

            const result = await response.json();
            
            if (result.success && Array.isArray(result.data)) {
                const rawLogs = result.data; 
                const newRecords: AttendanceRecord[] = [];

                for (const log of rawLogs) {
                    const student = students.find(s => s.studentId == log.id);
                    
                    if (student) {
                        const logDate = new Date(log.timestamp);
                        if (isNaN(logDate.getTime())) continue;

                        const dateStr = logDate.toISOString().split('T')[0];
                        // Unique ID includes device ID now to prevent collisions if timestamps match exactly
                        const recordId = `${student.id}_${logDate.getTime()}`; 

                        const exists = existingLogs.some(r => r.id === recordId);
                        
                        if (!exists) {
                            const timeStr = logDate.toTimeString().split(' ')[0];
                            const [h, m] = timeStr.split(':').map(Number);
                            const [lateH, lateM] = settings.lateThreshold.split(':').map(Number);
                            
                            let status: 'present' | 'late' = 'present';
                            if (h > lateH || (h === lateH && m > lateM)) {
                                status = 'late';
                            }

                            newRecords.push({
                                id: recordId,
                                studentId: student.id,
                                studentName: student.name,
                                timestamp: log.timestamp,
                                date: dateStr,
                                status: status,
                                deviceId: device.name // Store the friendly name
                            });
                        }
                    }
                }

                if (newRecords.length > 0) {
                    existingLogs = [...existingLogs, ...newRecords];
                    totalNew += newRecords.length;
                    
                    // Update last sync time for this device (optional, in memory only for now unless saved)
                    device.lastSync = new Date().toISOString();
                }
            }

        } catch (error) {
            console.debug(`Skipping device ${device.name}:`, error);
        }
    }

    if (totalNew > 0) {
        localStorage.setItem(KEYS.ATTENDANCE, JSON.stringify(existingLogs));
        // Save settings to update lastSync times if we implemented that fully
        StorageService.saveSettings(settings);
        console.log(`Synced total ${totalNew} new records.`);
    }
  },
  
  clearAll: () => {
    localStorage.removeItem(KEYS.STUDENTS);
    localStorage.removeItem(KEYS.ATTENDANCE);
    localStorage.removeItem(KEYS.SETTINGS);
    window.location.reload();
  }
};