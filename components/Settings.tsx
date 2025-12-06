import React, { useState, useEffect } from 'react';
import { Database, Copy, Check, Trash, Clock, Save, Server, ShieldAlert, Settings2, Download } from 'lucide-react';
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

  const handleCopy = () => {
    navigator.clipboard.writeText(sql);
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
        <div className="bg-white rounded-b-2xl rounded-tr-2xl shadow-sm border border-slate-200 p-8">
            <div className="mb-8 border-b border-slate-100 pb-4">
                <h3 className="text-xl font-bold text-slate-800 mb-1">إعدادات الاتصال (ZKTeco / USB)</h3>
                <p className="text-slate-500">تكوين عنوان IP ومنفذ الاتصال لجهاز البصمة الشبكي.</p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-5 mb-8 shadow-sm">
                <div className="flex items-start gap-4">
                    <div className="bg-blue-100 p-2 rounded-full mt-1">
                        <Download className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <h4 className="font-bold text-blue-900 mb-2">برنامج الوسيط (Bridge Agent)</h4>
                        <p className="text-sm text-blue-800 leading-relaxed mb-4">
                            يتطلب النظام تثبيت <strong>برنامج الوسيط (Agent)</strong> على جهاز الكمبيوتر المتصل بالشبكة المحلية. 
                            يقوم هذا البرنامج باستقبال الطلبات من المتصفح وتمريرها لجهاز البصمة (ZKTeco) ثم إعادة النتائج.
                        </p>
                        <a href="#" onClick={(e) => e.preventDefault()} className="inline-flex items-center gap-2 bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm">
                            <Download className="w-4 h-4" />
                            تحميل البرنامج (Windows 64-bit)
                        </a>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
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
            
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                 <p className="text-xs text-slate-400">
                    * يتم حفظ الإعدادات محلياً في المتصفح بشكل تلقائي عند الضغط على حفظ.
                 </p>
                 <button onClick={handleSaveSettings} className="px-6 py-3 bg-slate-800 text-white rounded-xl hover:bg-slate-700 font-medium transition-all shadow-lg shadow-slate-800/20">حفظ إعدادات الاتصال</button>
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
                        onClick={handleCopy}
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