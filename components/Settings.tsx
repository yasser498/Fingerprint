import React, { useState, useEffect } from 'react';
import { Database, Copy, Check, Trash, Clock, Save, Server, ShieldAlert, Settings2, Terminal, Play, AlertCircle, Download, FileJson, FileText, Network, Plus, X } from 'lucide-react';
import { generateSQLSchema } from '../services/sqlGenerator';
import { StorageService } from '../services/storageService';
import { AppSettings, FingerprintDevice } from '../types';

const Settings: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'device' | 'database'>('general');
  const [settings, setSettings] = useState<AppSettings>(StorageService.getSettings());
  
  // State for adding/editing a device
  const [isAddingDevice, setIsAddingDevice] = useState(false);
  const [newDevice, setNewDevice] = useState<Partial<FingerprintDevice>>({
      type: 'zk_direct',
      name: '',
      port: 4370,
      ip: '',
      filePath: ''
  });

  const sql = generateSQLSchema();

  useEffect(() => {
    setSettings(StorageService.getSettings());
  }, []);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    StorageService.saveSettings(settings);
    alert('تم حفظ الإعدادات بنجاح');
  };

  const handleAddDevice = (e: React.FormEvent) => {
      e.preventDefault();
      if(!newDevice.name) return;

      const deviceToAdd: FingerprintDevice = {
          id: Math.random().toString(36).substr(2, 9),
          name: newDevice.name,
          type: newDevice.type as any,
          ip: newDevice.ip,
          port: newDevice.port,
          filePath: newDevice.filePath,
          lastSync: '-'
      };

      const updatedDevices = [...settings.devices, deviceToAdd];
      setSettings({...settings, devices: updatedDevices});
      StorageService.saveSettings({...settings, devices: updatedDevices});
      
      setIsAddingDevice(false);
      setNewDevice({ type: 'zk_direct', name: '', port: 4370, ip: '', filePath: '' });
  };

  const handleDeleteDevice = (id: string) => {
      if(confirm('هل أنت متأكد من حذف هذا الجهاز؟')) {
          const updatedDevices = settings.devices.filter(d => d.id !== id);
          setSettings({...settings, devices: updatedDevices});
          StorageService.saveSettings({...settings, devices: updatedDevices});
      }
  };

  const handleReset = () => {
    if (confirm('هل أنت متأكد من حذف جميع البيانات؟ لا يمكن التراجع عن هذا الإجراء.')) {
        StorageService.clearAll();
    }
  };

  const handleDownloadAgent = () => {
    const batContent = `@echo off
setlocal EnableDelayedExpansion
title Fingerprint Universal Bridge Agent
color 0A
cls
echo ===================================================
echo   Fingerprint System - Universal Agent
echo ===================================================
echo   Supports: ZKTeco Direct & Text File Monitoring
echo ===================================================
echo.

:: 1. Check for Node.js
echo [1] Checking system requirements...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    color 0E
    echo [!] Node.js is NOT installed.
    echo [!] Starting automatic download...
    echo.
    powershell -Command "Invoke-WebRequest -Uri 'https://nodejs.org/dist/v18.19.0/node-v18.19.0-x64.msi' -OutFile 'node_installer.msi'"
    start /wait msiexec /i node_installer.msi /qn
    if exist node_installer.msi del node_installer.msi
    set "PATH=%PATH%;%ProgramFiles%\\nodejs"
    echo    Node.js installed successfully.
    echo.
    color 0A
)

:: 2. Setup Directory
echo [2] Setting up workspace...
if not exist "BridgeAgent" mkdir BridgeAgent
cd BridgeAgent

:: 3. Create package.json
if not exist package.json (
    echo    Creating configuration...
    echo {"name":"bridge-agent","version":"2.0.0","dependencies":{"express":"^4.18.2","cors":"^2.8.5","body-parser":"^1.20.2","node-zklib":"^5.0.0"}} > package.json
)

:: 4. Create Universal Server (JS)
echo    Creating smart server script...
(
echo const express = require('express');
echo const cors = require('cors');
echo const bodyParser = require('body-parser');
echo const fs = require('fs');
echo const ZKLib = require('node-zklib');
echo const app = express();
echo const PORT = 3001;
echo.
echo app.use(cors());
echo app.use(bodyParser.json());
echo.
echo // --- MODE 1: ZKTeco Logic ---
echo async function getZKLogs(ip, port) {
echo     const zk = new ZKLib(ip, port, 10000, 4000);
echo     try {
echo         await zk.createSocket();
echo         const logs = await zk.getAttendances();
echo         await zk.disconnect();
echo         return logs;
echo     } catch (e) {
echo         console.error('ZK Error:', e);
echo         return [];
echo     }
echo }
echo.
echo // --- MODE 2: File Logic ---
echo function getFileLogs(filePath) {
echo     if (!fs.existsSync(filePath)) {
echo         console.error('File not found: ' + filePath);
echo         return [];
echo     }
echo     try {
echo         const content = fs.readFileSync(filePath, 'utf8');
echo         const lines = content.split(/\\r?\\n/);
echo         const logs = [];
echo         lines.forEach(line =^> {
echo             const parts = line.split(/[,;\\t|]/);
echo             if (parts.length ^>= 2) {
echo                 const id = parts[0].trim();
echo                 const dateStr = parts.slice(1).join(' ').trim(); 
echo                 const timestamp = new Date(dateStr);
echo                 if (!isNaN(timestamp.getTime())) {
echo                     logs.push({ id: id, timestamp: timestamp });
echo                 }
echo             }
echo         });
echo         return logs;
echo     } catch (e) {
echo         console.error('File Read Error:', e);
echo         return [];
echo     }
echo }
echo.
echo app.get('/status', (req, res) =^> res.json({ status: 'running' }));
echo.
echo app.get('/logs', async (req, res) =^> {
echo     const mode = req.query.mode || 'zk_direct';
echo     let data = [];
echo     
echo     if (mode === 'zk_direct') {
echo         const { ip, port } = req.query;
echo         if(ip) {
echo             console.log('[ZK] Fetching from ' + ip + '...');
echo             data = await getZKLogs(ip, port || 4370);
echo         }
echo     } else if (mode === 'file_monitor') {
echo         const path = req.query.path;
echo         if(path) {
echo             console.log('[File] Reading from ' + path);
echo             data = getFileLogs(path);
echo         }
echo     }
echo     
echo     console.log('Returned ' + data.length + ' records.');
echo     res.json({ success: true, data: data });
echo });
echo.
echo app.listen(PORT, () =^> {
echo     console.log('-------------------------------------------');
echo     console.log('  Universal Bridge Agent Running (Port ' + PORT + ')');
echo     console.log('-------------------------------------------');
echo });
) > server.js

:: 5. Install Dependencies
if not exist node_modules (
    echo [3] Installing libraries...
    call npm install
)

:: 6. Run Server
cls
color 0B
echo ===================================================
echo   Bridge Agent is Running
echo ===================================================
echo   Supported Modes:
echo   1. ZKTeco Direct (via IP)
echo   2. Universal File (CSV/TXT)
echo.
echo   Keep this window open.
echo ===================================================
node server.js
pause
`;

    const blob = new Blob([batContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'مشغل_البصمة_الشامل.bat'; 
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const tabs = [
    { id: 'general', label: 'الدوام الرسمي', icon: Clock },
    { id: 'device', label: 'إدارة الأجهزة', icon: Server },
    { id: 'database', label: 'قواعد البيانات', icon: Database },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-white rounded-lg border border-slate-200 shadow-sm">
            <Settings2 className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">إعدادات النظام</h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 mb-6 overflow-x-auto pb-1">
          {tabs.map(tab => (
            <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-6 py-3 rounded-t-lg text-sm font-bold transition-all relative
                    ${activeTab === tab.id 
                        ? 'text-primary bg-white border-x border-t border-slate-200 shadow-[0_-2px_4px_rgba(0,0,0,0.02)] z-10' 
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                    }`}
            >
                <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? 'text-secondary' : 'text-slate-400'}`} />
                {tab.label}
                {activeTab === tab.id && <div className="absolute bottom-[-1px] left-0 right-0 h-1 bg-white"></div>}
            </button>
          ))}
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-2">
      {activeTab === 'general' && (
        <form onSubmit={handleSaveSettings} className="bg-white rounded-b-2xl rounded-tr-2xl shadow-sm border border-slate-200 p-8">
            <div className="mb-8 border-b border-slate-100 pb-4">
                <h3 className="text-xl font-bold text-slate-800 mb-1">تكوين أوقات الدوام</h3>
                <p className="text-slate-500">ضبط ساعات الحضور والانصراف لحساب تقارير التأخير بدقة.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 mb-8">
                <div className="col-span-1 md:col-span-2 space-y-2">
                    <label className="text-sm font-bold text-slate-700 block">اسم المنشأة التعليمية</label>
                    <input 
                        type="text" 
                        value={settings.schoolName}
                        onChange={(e) => setSettings({...settings, schoolName: e.target.value})}
                        className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" 
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 block">بداية الدوام (حضور)</label>
                    <div className="relative">
                        <Clock className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input 
                            type="time" 
                            value={settings.startTime}
                            onChange={(e) => setSettings({...settings, startTime: e.target.value})}
                            className="w-full p-3 pr-10 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-mono" 
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 block">حد احتساب التأخير</label>
                    <div className="relative">
                        <Clock className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-500 w-4 h-4" />
                        <input 
                            type="time" 
                            value={settings.lateThreshold}
                            onChange={(e) => setSettings({...settings, lateThreshold: e.target.value})}
                            className="w-full p-3 pr-10 bg-amber-50/30 border border-amber-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all font-mono text-amber-900" 
                        />
                    </div>
                    <p className="text-xs text-amber-600 mt-1">سيتم احتساب الطالب "متأخر" بعد هذا الوقت.</p>
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 block">نهاية الدوام (انصراف)</label>
                    <div className="relative">
                        <Clock className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input 
                            type="time" 
                            value={settings.endTime}
                            onChange={(e) => setSettings({...settings, endTime: e.target.value})}
                            className="w-full p-3 pr-10 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-mono" 
                        />
                    </div>
                </div>
            </div>

            <div className="flex justify-end pt-6 border-t border-slate-100">
                <button type="submit" className="flex items-center gap-2 px-8 py-3 bg-primary text-white rounded-xl hover:bg-primary-dark font-bold shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95">
                    <Save className="w-5 h-5" />
                    حفظ الإعدادات
                </button>
            </div>
        </form>
      )}

      {activeTab === 'device' && (
        <div className="space-y-6">
            <div className="bg-white rounded-b-2xl rounded-tr-2xl shadow-sm border border-slate-200 p-8">
                <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800 mb-1">أجهزة البصمة المتصلة</h3>
                        <p className="text-slate-500">قم بإضافة الأجهزة التي تريد سحب البيانات منها (ZKTeco أو ملفات).</p>
                    </div>
                    <button 
                        onClick={() => setIsAddingDevice(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors shadow-lg shadow-primary/20 font-bold"
                    >
                        <Plus className="w-5 h-5" />
                        <span>إضافة جهاز</span>
                    </button>
                </div>

                {/* Add Device Form */}
                {isAddingDevice && (
                    <div className="bg-slate-50 border border-primary/20 rounded-xl p-6 mb-8 animate-in fade-in slide-in-from-top-4">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="font-bold text-slate-800">بيانات الجهاز الجديد</h4>
                            <button onClick={() => setIsAddingDevice(false)} className="text-slate-400 hover:text-red-500">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleAddDevice} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-bold text-slate-700 block mb-1">اسم الجهاز (للتعريف)</label>
                                    <input 
                                        type="text" 
                                        required
                                        placeholder="مثلاً: البوابة الرئيسية"
                                        value={newDevice.name}
                                        onChange={e => setNewDevice({...newDevice, name: e.target.value})}
                                        className="w-full p-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none" 
                                    />
                                </div>
                                <div>
                                    <label className="text-sm font-bold text-slate-700 block mb-1">نوع الاتصال</label>
                                    <select
                                        value={newDevice.type}
                                        onChange={e => setNewDevice({...newDevice, type: e.target.value as any})}
                                        className="w-full p-2.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 outline-none" 
                                    >
                                        <option value="zk_direct">اتصال شبكي (ZKTeco IP)</option>
                                        <option value="file_monitor">ملف نصي (Universal File)</option>
                                    </select>
                                </div>
                            </div>

                            {newDevice.type === 'zk_direct' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-lg border border-slate-200">
                                     <div>
                                        <label className="text-sm font-bold text-slate-700 block mb-1">IP Address</label>
                                        <input 
                                            type="text" 
                                            required
                                            placeholder="192.168.1.201"
                                            value={newDevice.ip}
                                            onChange={e => setNewDevice({...newDevice, ip: e.target.value})}
                                            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-left"
                                            dir="ltr"
                                        />
                                     </div>
                                     <div>
                                        <label className="text-sm font-bold text-slate-700 block mb-1">Port</label>
                                        <input 
                                            type="number" 
                                            required
                                            value={newDevice.port}
                                            onChange={e => setNewDevice({...newDevice, port: Number(e.target.value)})}
                                            className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-left"
                                            dir="ltr"
                                        />
                                     </div>
                                </div>
                            ) : (
                                <div className="bg-white p-4 rounded-lg border border-slate-200">
                                    <label className="text-sm font-bold text-slate-700 block mb-1">مسار الملف (Full Path)</label>
                                    <input 
                                        type="text" 
                                        required
                                        placeholder="C:\Attendance\logs.txt"
                                        value={newDevice.filePath}
                                        onChange={e => setNewDevice({...newDevice, filePath: e.target.value})}
                                        className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-mono text-left"
                                        dir="ltr"
                                    />
                                    <p className="text-xs text-slate-500 mt-1">تأكد أن المسار صحيح وقابل للقراءة.</p>
                                </div>
                            )}

                            <div className="flex justify-end pt-2">
                                <button type="submit" className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold shadow-sm">
                                    حفظ وإضافة
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Device List */}
                <div className="space-y-3">
                    {settings.devices.length === 0 ? (
                        <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                            <Server className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                            <p className="text-slate-500">لا توجد أجهزة مضافة حالياً.</p>
                        </div>
                    ) : (
                        settings.devices.map((device) => (
                            <div key={device.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:shadow-md transition-all bg-white group">
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-lg ${device.type === 'zk_direct' ? 'bg-blue-50 text-blue-600' : 'bg-amber-50 text-amber-600'}`}>
                                        {device.type === 'zk_direct' ? <Network className="w-6 h-6" /> : <FileText className="w-6 h-6" />}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-800">{device.name}</h4>
                                        <div className="flex items-center gap-3 text-sm text-slate-500 mt-0.5">
                                            <span className="font-mono bg-slate-100 px-1.5 rounded text-xs">
                                                {device.type === 'zk_direct' ? `${device.ip}:${device.port}` : 'File Monitor'}
                                            </span>
                                            {device.lastSync && device.lastSync !== '-' && (
                                                <span className="text-xs text-green-600 flex items-center gap-1">
                                                    <Check className="w-3 h-3" /> متصل
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => handleDeleteDevice(device.id)}
                                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                    <Trash className="w-5 h-5" />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Auto-Installer Section */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-lg border border-slate-700 overflow-hidden text-white p-8">
                 <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                     <div className="space-y-2 flex-1">
                        <h3 className="text-xl font-bold flex items-center gap-2 text-white">
                            <Terminal className="w-6 h-6 text-green-400" />
                            الوسيط الشامل (Universal Bridge)
                        </h3>
                        <p className="text-slate-300">
                            أداة واحدة تدعم الجميع. قم بإضافة جميع أجهزتك في القائمة أعلاه، ثم حمل وشغل هذا الملف مرة واحدة.
                        </p>
                        <div className="flex items-center gap-2 text-xs text-blue-200 bg-blue-500/10 w-fit px-3 py-1 rounded-full border border-blue-500/20 mt-2">
                             <Check className="w-4 h-4" />
                             يدعم تعدد الأجهزة تلقائياً
                        </div>
                     </div>
                     
                     <div className="flex flex-col items-center gap-2">
                         <button 
                            onClick={handleDownloadAgent}
                            className="flex items-center gap-3 px-8 py-4 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold shadow-lg shadow-green-900/50 hover:scale-105 active:scale-95 transition-all w-full md:w-auto justify-center"
                         >
                            <Download className="w-6 h-6" />
                            تحميل الأداة الشاملة
                            <span className="bg-green-800 text-xs px-2 py-0.5 rounded text-green-200 font-mono">.bat</span>
                         </button>
                         <p className="text-xs text-slate-400">ملف واحد - تشغيل دائم</p>
                     </div>
                 </div>
            </div>
        </div>
      )}

      {activeTab === 'database' && (
        <div className="space-y-8">
            <div className="bg-white rounded-b-2xl rounded-tr-2xl shadow-sm border border-slate-200 p-8">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800">تصدير قاعدة البيانات</h3>
                        <p className="text-slate-500 mt-1">كود SQL لإنشاء الجداول في حال نقل النظام إلى خادم محلي (Localhost).</p>
                    </div>
                    <button 
                        onClick={() => handleCopy(sql)}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-primary bg-primary/5 hover:bg-primary/10 rounded-lg border border-primary/20 transition-colors"
                    >
                        {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                        {copied ? 'تم النسخ' : 'نسخ الكود'}
                    </button>
                </div>
                
                <div className="relative bg-slate-900 rounded-xl overflow-hidden shadow-inner" dir="ltr">
                    <div className="absolute top-0 left-0 right-0 h-8 bg-slate-800 flex items-center px-4 space-x-2">
                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    </div>
                    <pre className="p-6 pt-12 text-sm text-blue-300 font-mono overflow-x-auto whitespace-pre-wrap leading-relaxed">
                        {sql}
                    </pre>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-6 overflow-hidden relative group">
                <div className="absolute inset-0 bg-red-50/50 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-500"></div>
                <div className="relative flex items-center gap-4 z-10">
                    <div className="p-3 bg-red-100 rounded-full">
                        <ShieldAlert className="w-6 h-6 text-red-600" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-red-900">منطقة الخطر</h3>
                        <p className="text-sm text-red-700 mt-1">سيؤدي هذا الإجراء إلى مسح جميع البيانات المحلية وإعادة التطبيق إلى حالته الأولية.</p>
                    </div>
                    <button onClick={handleReset} className="px-6 py-3 bg-white border-2 border-red-100 text-red-600 rounded-xl hover:bg-red-600 hover:text-white hover:border-red-600 font-bold transition-all flex items-center gap-2">
                        <Trash className="w-4 h-4" />
                        حذف كافة البيانات
                    </button>
                </div>
            </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default Settings;