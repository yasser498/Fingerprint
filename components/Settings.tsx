import React, { useState, useEffect } from 'react';
import { Database, Copy, Check, Trash, Clock, Save, Server, ShieldAlert, Settings2, Terminal, Play, AlertCircle, Download, FileJson, FileText, Network, Plus, X, MessageCircle } from 'lucide-react';
import QRCode from 'qrcode';
import { generateSQLSchema } from '../services/sqlGenerator';
import { StorageService } from '../services/storageService';
import { AppSettings, FingerprintDevice } from '../types';

const Settings: React.FC = () => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'device' | 'whatsapp' | 'database'>('general');
  const [settings, setSettings] = useState<AppSettings>(StorageService.getSettings());
  
  // WhatsApp State
  const [waStatus, setWaStatus] = useState<any>({ connected: false, qr: '' });
  const [qrDataUrl, setQrDataUrl] = useState('');

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

  // Poll WhatsApp Status when tab is active
  useEffect(() => {
      let interval: any;
      if (activeTab === 'whatsapp') {
          const checkStatus = async () => {
              const status = await StorageService.getWhatsAppStatus();
              setWaStatus(status);
              if (status.qr) {
                  QRCode.toDataURL(status.qr, (err, url) => {
                      if (!err) setQrDataUrl(url);
                  });
              } else {
                  setQrDataUrl('');
              }
          };
          checkStatus();
          interval = setInterval(checkStatus, 3000);
      }
      return () => clearInterval(interval);
  }, [activeTab]);

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
    // 1. Prepare server.js content (Pure JS)
    const serverJsContent = `
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const ZKLib = require('node-zklib');
const { Client, LocalAuth } = require('whatsapp-web.js');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- WHATSAPP SETUP ---
let waClient = null, waQR = null, waStatus = 'DISCONNECTED', waInfo = null;

function initWhatsApp() {
    console.log('[WhatsApp] Initializing...');
    try {
        waClient = new Client({
            authStrategy: new LocalAuth(),
            puppeteer: { headless: true, args: ['--no-sandbox'] }
        });

        waClient.on('qr', (qr) => { 
            waQR = qr; 
            waStatus = 'QR_READY'; 
            console.log('[WhatsApp] QR Generated');
        });

        waClient.on('ready', () => { 
            console.log('[WhatsApp] Ready!'); 
            waStatus = 'CONNECTED'; 
            waQR = null; 
            waInfo = waClient.info; 
        });

        waClient.on('authenticated', () => {
            console.log('[WhatsApp] Authenticated');
        });

        waClient.on('disconnected', (reason) => { 
            console.log('[WhatsApp] Disconnected:', reason);
            waStatus = 'DISCONNECTED'; 
            // Optional: waClient.initialize(); 
        });

        waClient.initialize();
    } catch (err) {
        console.error('[WhatsApp] Init Error:', err);
    }
}

initWhatsApp();

// --- ZK HELPER ---
async function withZK(ip, port, callback) {
    const zk = new ZKLib(ip, port, 10000, 4000);
    try {
        await zk.createSocket();
        const result = await callback(zk);
        try { await zk.disconnect(); } catch(e){}
        return result;
    } catch (e) {
        try { await zk.disconnect(); } catch(e){}
        throw e;
    }
}

// --- ROUTES ---
app.get('/logs', async (req, res) => {
    const { ip, port } = req.query;
    if(!ip) return res.json({success:false});
    try {
        const logs = await withZK(ip, port || 4370, async (zk) => await zk.getAttendances());
        res.json({ success: true, data: logs });
    } catch(e) { 
        console.error('ZK Logs Error:', e);
        res.status(500).json({success: false, err: e.message}); 
    }
});

app.get('/enroll', async (req, res) => {
    const { ip, port, id } = req.query;
    try {
        // Simple registration command simulation or real command if library supports
        // ZKLib implementation varies. We check connection mostly here.
        await withZK(ip, port || 4370, async (zk) => {
             // ensure user exists
             await zk.setUser(id, '1234', 'User ' + id, ''); 
        });
        res.json({ success: true, template: 'FP_' + id });
    } catch (e) { 
        console.error('Enroll Error:', e);
        res.status(500).json({ success: false, message: e.message }); 
    }
});

app.get('/whatsapp/status', (req, res) => {
    res.json({ 
        connected: waStatus === 'CONNECTED', 
        qr: waQR, 
        info: waInfo,
        status: waStatus
    });
});

app.post('/whatsapp/send', async (req, res) => {
    if (waStatus !== 'CONNECTED') return res.status(400).json({success: false, message: 'Not connected'});
    try {
        const chatId = req.body.phone.replace(/[^0-9]/g, '') + '@c.us';
        await waClient.sendMessage(chatId, req.body.message);
        res.json({ success: true });
    } catch (e) { 
        res.status(500).json({ success: false, error: e.message }); 
    }
});

app.get('/status', (req, res) => res.json({ status: 'running' }));

app.listen(PORT, () => console.log('Bridge Agent Running on port ' + PORT));
`;

    // 2. Prepare package.json content
    const packageJsonContent = JSON.stringify({
        name: "bridge-agent",
        version: "4.0.0",
        main: "server.js",
        dependencies: {
            "express": "^4.18.2",
            "cors": "^2.8.5",
            "body-parser": "^1.20.2",
            "node-zklib": "^5.0.0",
            "whatsapp-web.js": "^1.23.0",
            "qrcode-terminal": "^0.12.0"
        }
    }, null, 2);

    // 3. Convert to Base64 (To allow safe writing via Batch)
    const b64Server = btoa(serverJsContent);
    const b64Package = btoa(packageJsonContent);

    // 4. Create the Batch File Content
    const batContent = `@echo off
setlocal EnableDelayedExpansion
title Fingerprint & WhatsApp Bridge Agent (Safe Mode)
color 0A
cls
echo ===================================================
echo   System Agent v4.1 (Safe Install)
echo ===================================================
echo   1. Hardware Bridge (Fingerprint)
echo   2. WhatsApp Integration
echo ===================================================
echo.

:: 1. Check for Node.js
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Node.js is NOT installed. Downloading...
    powershell -Command "Invoke-WebRequest -Uri 'https://nodejs.org/dist/v18.19.0/node-v18.19.0-x64.msi' -OutFile 'node_installer.msi'"
    start /wait msiexec /i node_installer.msi /qn
    del node_installer.msi
    set "PATH=%PATH%;%ProgramFiles%\\nodejs"
)

:: 2. Setup Directory
if not exist "BridgeAgent" mkdir BridgeAgent
cd BridgeAgent

:: 3. Create Files using Base64 Decode (Prevents Syntax Errors)
echo [3] Creating application files...

echo ${b64Package} > package.b64
certutil -decode package.b64 package.json >nul 2>&1
del package.b64

echo ${b64Server} > server.b64
certutil -decode server.b64 server.js >nul 2>&1
del server.b64

:: 4. Install Dependencies
if not exist node_modules (
    echo [4] Installing libraries (First time only)...
    call npm install
)

:: 5. Run
cls
color 0B
echo ===================================================
echo   Bridge Agent is Running
echo ===================================================
echo   Log Output:
echo.
node server.js
pause
`;

    const blob = new Blob([batContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'مشغل_النظام_الشامل_مصحح.bat'; 
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const tabs = [
    { id: 'general', label: 'الدوام الرسمي', icon: Clock },
    { id: 'device', label: 'إدارة الأجهزة', icon: Server },
    { id: 'whatsapp', label: 'ربط واتساب', icon: MessageCircle },
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
                            الوسيط الشامل (Universal Agent)
                        </h3>
                        <p className="text-slate-300">
                           ملف التشغيل المطلوب للربط مع أجهزة البصمة (ZKTeco) وتفعيل واتساب.
                        </p>
                        <div className="flex items-center gap-2 text-xs text-blue-200 bg-blue-500/10 w-fit px-3 py-1 rounded-full border border-blue-500/20 mt-2">
                             <Check className="w-4 h-4" />
                             يجب أن يبقى قيد التشغيل في الخلفية
                        </div>
                     </div>
                     
                     <div className="flex flex-col items-center gap-2">
                         <button 
                            onClick={handleDownloadAgent}
                            className="flex items-center gap-3 px-8 py-4 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold shadow-lg shadow-green-900/50 hover:scale-105 active:scale-95 transition-all w-full md:w-auto justify-center"
                         >
                            <Download className="w-6 h-6" />
                            تحميل المشغل (مصحح)
                         </button>
                     </div>
                 </div>
            </div>
        </div>
      )}

      {activeTab === 'whatsapp' && (
          <div className="space-y-6">
               <div className="bg-white rounded-b-2xl rounded-tr-2xl shadow-sm border border-slate-200 p-8">
                   <div className="mb-8 border-b border-slate-100 pb-4 flex justify-between items-center">
                       <div>
                            <h3 className="text-xl font-bold text-slate-800 mb-1 flex items-center gap-2">
                                <MessageCircle className="w-6 h-6 text-green-600" />
                                ربط واتساب (WhatsApp Web)
                            </h3>
                            <p className="text-slate-500">قم بمسح الكود لربط النظام بواتساب وإرسال إشعارات الحضور.</p>
                       </div>
                       
                       <div className={`px-4 py-2 rounded-full border flex items-center gap-2 font-bold text-sm
                           ${waStatus.connected 
                               ? 'bg-green-50 text-green-700 border-green-200' 
                               : 'bg-slate-50 text-slate-500 border-slate-200'
                           }`}
                       >
                           <span className={`w-3 h-3 rounded-full ${waStatus.connected ? 'bg-green-600 animate-pulse' : 'bg-slate-400'}`}></span>
                           {waStatus.connected ? 'متصل' : 'غير متصل'}
                       </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                       <div className="space-y-6">
                           <ol className="list-decimal list-inside space-y-4 text-slate-600 font-medium">
                               <li className="p-3 bg-slate-50 rounded-lg border border-slate-100">تأكد من تشغيل "الوسيط الشامل" (Bridge Agent) على هذا الجهاز.</li>
                               <li className="p-3 bg-slate-50 rounded-lg border border-slate-100">افتح تطبيق واتساب على هاتفك.</li>
                               <li className="p-3 bg-slate-50 rounded-lg border border-slate-100">اضغط على القائمة (أو الإعدادات) واختر "الأجهزة المرتبطة".</li>
                               <li className="p-3 bg-slate-50 rounded-lg border border-slate-100">اضغط على "ربط جهاز" وقم بمسح الكود المقابل.</li>
                           </ol>
                           
                           {waStatus.connected && (
                               <div className="bg-green-50 border border-green-200 rounded-xl p-6 mt-6">
                                   <h4 className="font-bold text-green-800 mb-2">تم الاتصال بنجاح!</h4>
                                   <p className="text-green-700 text-sm">
                                       النظام جاهز الآن لإرسال رسائل الغياب والتأخير.
                                       سيظل الاتصال نشطاً طالما أن الوسيط يعمل.
                                   </p>
                                   <div className="mt-4 pt-4 border-t border-green-200/50 flex gap-4 text-xs text-green-800">
                                       <span><strong>المستخدم:</strong> {waStatus.info?.pushname || 'Unknown'}</span>
                                       <span><strong>الرقم:</strong> {waStatus.info?.wid?.user || 'Unknown'}</span>
                                   </div>
                               </div>
                           )}
                       </div>

                       <div className="flex flex-col items-center justify-center p-8 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 min-h-[300px]">
                           {waStatus.connected ? (
                               <div className="text-center animate-in zoom-in duration-300">
                                   <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                       <Check className="w-12 h-12" />
                                   </div>
                                   <h3 className="text-xl font-bold text-slate-800">الجهاز متصل</h3>
                               </div>
                           ) : qrDataUrl ? (
                               <div className="text-center">
                                   <div className="bg-white p-4 rounded-xl shadow-lg mb-4 inline-block">
                                        <img src={qrDataUrl} alt="WhatsApp QR" className="w-64 h-64 object-contain" />
                                   </div>
                                   <p className="text-sm text-slate-500 animate-pulse">جاري انتظار المسح...</p>
                               </div>
                           ) : (
                               <div className="text-center text-slate-400">
                                   <LoaderSpinner />
                                   <p className="mt-4">جاري تحميل رمز QR...</p>
                                   <p className="text-xs mt-2 text-red-400 opacity-80">(تأكد من تشغيل ملف .bat)</p>
                               </div>
                           )}
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

const LoaderSpinner = () => (
    <svg className="animate-spin h-8 w-8 text-slate-300 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

export default Settings;