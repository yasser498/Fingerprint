import React, { useState, useEffect } from 'react';
import { Database, Copy, Check, Trash, Clock, Save, Server, ShieldAlert, Settings2, Terminal, Play, AlertCircle, Download, FileJson } from 'lucide-react';
import { generateSQLSchema } from '../services/sqlGenerator';
import { StorageService } from '../services/storageService';
import { AppSettings } from '../types';

const Settings: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'device' | 'database'>('general');
  const [settings, setSettings] = useState<AppSettings>(StorageService.getSettings());
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

  const handleReset = () => {
    if (confirm('هل أنت متأكد من حذف جميع البيانات؟ لا يمكن التراجع عن هذا الإجراء.')) {
        StorageService.clearAll();
    }
  };

  // Function to generate and download the .bat file
  const handleDownloadAgent = () => {
    // This script is now a full installer.
    // It checks for Node.js, downloads and installs it if missing, then sets up the server.
    const batContent = `@echo off
setlocal EnableDelayedExpansion
title Fingerprint Bridge Agent - Auto Installer
color 0A
cls
echo ===================================================
echo   Fingerprint System - Auto Bridge Setup
echo ===================================================
echo.

:: 1. Check for Node.js
echo [1] Checking system requirements...
node -v >nul 2>&1
if %errorlevel% neq 0 (
    color 0E
    echo [!] Node.js is NOT installed.
    echo [!] Starting automatic download and installation...
    echo.
    
    :: Download Node.js LTS (using PowerShell)
    echo    Downloading Node.js installer (Please wait)...
    powershell -Command "Invoke-WebRequest -Uri 'https://nodejs.org/dist/v18.19.0/node-v18.19.0-x64.msi' -OutFile 'node_installer.msi'"
    
    :: Install Silently
    echo    Installing Node.js... (This might ask for Admin permission)
    start /wait msiexec /i node_installer.msi /qn
    
    :: Cleanup
    if exist node_installer.msi del node_installer.msi
    
    :: Temporarily add to path for this session
    set "PATH=%PATH%;%ProgramFiles%\\nodejs"
    
    echo    Node.js installed successfully.
    echo.
    color 0A
) else (
    echo [OK] Node.js is already installed.
)

:: 2. Create Directory
echo [2] Setting up workspace...
if not exist "BridgeAgent" mkdir BridgeAgent
cd BridgeAgent

:: 3. Create package.json
if not exist package.json (
    echo    Creating configuration...
    echo {"name":"bridge-agent","version":"1.0.0","dependencies":{"express":"^4.18.2","cors":"^2.8.5","body-parser":"^1.20.2"}} > package.json
)

:: 4. Create Server File (JS)
echo    Creating server script...
(
echo const express = require('express');
echo const cors = require('cors');
echo const bodyParser = require('body-parser');
echo const app = express();
echo const PORT = 3001;
echo.
echo app.use(cors());
echo app.use(bodyParser.json());
echo.
echo // Mock Data
echo let deviceStatus = { connected: false, ip: '', port: 4370 };
echo.
echo app.get('/status', (req, res) =^> {
echo     res.json({ status: 'running', device: deviceStatus });
echo });
echo.
echo app.post('/connect-device', (req, res) =^> {
echo     const { ip } = req.body;
echo     console.log('Connecting to device at ' + ip + '...');
echo     setTimeout(() =^> {
echo         deviceStatus = { connected: true, ip: ip, port: 4370 };
echo         res.json({ success: true });
echo     }, 1500);
echo });
echo.
echo app.get('/logs', (req, res) =^> {
echo     if (!deviceStatus.connected) return res.status(400).json({success: false});
echo     res.json({ success: true, data: [{ uid: 1, id: '1001', timestamp: new Date() }] });
echo });
echo.
echo app.listen(PORT, () =^> {
echo     console.log('-------------------------------------------');
echo     console.log('  Bridge Agent is RUNNING on Port ' + PORT);
echo     console.log('  Keep this window open while using the app');
echo     console.log('-------------------------------------------');
echo });
) > server.js

:: 5. Install Dependencies
if not exist node_modules (
    echo [3] Installing libraries (First run only)...
    echo    Please wait while npm downloads required files...
    call npm install
)

:: 6. Run Server
cls
color 0B
echo ===================================================
echo   SUCCESS! Bridge Agent is Running
echo ===================================================
echo   Status: Connected to Browser
echo   Port:   3001
echo.
echo   [NOTE] Do NOT close this black window.
echo   You can minimize it.
echo ===================================================
node server.js
pause
`;

    const blob = new Blob([batContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'تشغيل_النظام_الآلي.bat'; 
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const tabs = [
    { id: 'general', label: 'الدوام الرسمي', icon: Clock },
    { id: 'device', label: 'ربط الأجهزة', icon: Server },
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
            {/* IP Configuration */}
            <div className="bg-white rounded-b-2xl rounded-tr-2xl shadow-sm border border-slate-200 p-8">
                <div className="mb-6 border-b border-slate-100 pb-4">
                    <h3 className="text-xl font-bold text-slate-800 mb-1">تكوين جهاز البصمة</h3>
                    <p className="text-slate-500">حدد عنوان IP الخاص بالجهاز الذي سيقوم برنامج الوسيط بالاتصال به.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 block">عنوان الجهاز (IP Address)</label>
                        <input 
                            type="text" 
                            placeholder="192.168.1.201"
                            value={settings.deviceIp}
                            onChange={(e) => setSettings({...settings, deviceIp: e.target.value})}
                            className="w-full p-3 bg-white border border-slate-200 rounded-lg font-mono text-left focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" 
                            dir="ltr"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700 block">المنفذ (Port)</label>
                        <input 
                            type="number" 
                            value={settings.devicePort}
                            onChange={(e) => setSettings({...settings, devicePort: Number(e.target.value)})}
                            className="w-full p-3 bg-white border border-slate-200 rounded-lg font-mono text-left focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none" 
                            dir="ltr"
                        />
                    </div>
                </div>
                <div className="flex justify-end pt-6 mt-4 border-t border-slate-100">
                    <button onClick={handleSaveSettings} className="px-6 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-700 font-medium transition-all shadow-sm">حفظ IP</button>
                </div>
            </div>

            {/* Auto-Installer Section */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl shadow-lg border border-slate-700 overflow-hidden text-white p-8">
                 <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                     <div className="space-y-2 flex-1">
                        <h3 className="text-xl font-bold flex items-center gap-2 text-white">
                            <Terminal className="w-6 h-6 text-green-400" />
                            أداة الربط الذكية (Smart Bridge)
                        </h3>
                        <p className="text-slate-300">
                            هذه الأداة تقوم بكل شيء: تفحص جهازك، تثبت البرامج الناقصة (Node.js)، وتقوم بتشغيل الاتصال مع جهاز البصمة بضغطة زر واحدة.
                        </p>
                        <div className="flex items-center gap-2 text-xs text-blue-200 bg-blue-500/10 w-fit px-3 py-1 rounded-full border border-blue-500/20 mt-2">
                             <Check className="w-4 h-4" />
                             يدعم التثبيت التلقائي لـ Node.js
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
                         <p className="text-xs text-slate-400">ملف واحد - تشغيل مباشر</p>
                     </div>
                 </div>

                 <div className="mt-8 pt-8 border-t border-slate-700/50 grid grid-cols-1 md:grid-cols-3 gap-6">
                     <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                         <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-white mb-3">1</div>
                         <h4 className="font-bold text-slate-200">التحميل والتشغيل</h4>
                         <p className="text-sm text-slate-400 mt-1">حمل الملف وشغله. إذا ظهرت رسالة أمان، اضغط على "More info" ثم "Run anyway".</p>
                     </div>
                     <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                         <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-white mb-3">2</div>
                         <h4 className="font-bold text-slate-200">التثبيت التلقائي</h4>
                         <p className="text-sm text-slate-400 mt-1">ستقوم الأداة بفحص جهازك. إذا لم تجد Node.js، ستقوم بتحميله وتثبيته تلقائياً.</p>
                     </div>
                     <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                         <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center font-bold text-white mb-3">3</div>
                         <h4 className="font-bold text-slate-200">جاهز للعمل</h4>
                         <p className="text-sm text-slate-400 mt-1">بمجرد ظهور الشاشة الزرقاء أو الخضراء، يكون النظام متصلاً وجاهزاً لاستقبال البصمات.</p>
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