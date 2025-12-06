export const generateSQLSchema = (): string => {
  return `
-- جدول الإعدادات العامة (الدوام)
CREATE TABLE system_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    school_name VARCHAR(100) DEFAULT 'My School',
    start_time TIME DEFAULT '07:00:00',
    late_threshold TIME DEFAULT '07:30:00',
    end_time TIME DEFAULT '13:00:00',
    device_ip VARCHAR(45),
    device_port INT DEFAULT 4370,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- جدول الطلاب
CREATE TABLE students (
    id INT PRIMARY KEY AUTO_INCREMENT,
    student_uuid VARCHAR(36) NOT NULL UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    student_number VARCHAR(20) NOT NULL UNIQUE,
    grade_level VARCHAR(50),
    class_section VARCHAR(20),
    phone_number VARCHAR(20),
    fingerprint_id VARCHAR(100) UNIQUE,
    fingerprint_data TEXT, -- For storing template blob/hash
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- جدول أجهزة البصمة
CREATE TABLE fingerprint_devices (
    id INT PRIMARY KEY AUTO_INCREMENT,
    device_name VARCHAR(50),
    ip_address VARCHAR(45),
    location VARCHAR(100),
    last_sync TIMESTAMP
);

-- جدول الحضور
CREATE TABLE attendance_logs (
    id BIGINT PRIMARY KEY AUTO_INCREMENT,
    student_id INT,
    device_id INT,
    log_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('present', 'late', 'absent') DEFAULT 'present',
    date_only DATE, -- For faster querying by day
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    FOREIGN KEY (device_id) REFERENCES fingerprint_devices(id)
);

-- بيانات أولية للإعدادات
INSERT INTO system_settings (school_name, start_time, late_threshold) VALUES ('المدرسة النموذجية', '07:00:00', '07:30:00');

-- فهرس لسرعة البحث
CREATE INDEX idx_attendance_date ON attendance_logs(date_only);
CREATE INDEX idx_student_number ON students(student_number);
`;
};