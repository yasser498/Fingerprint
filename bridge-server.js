const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

// إعداد الخادم
const app = express();
const PORT = 3001; // المنفذ الذي سيتصل به المتصفح

app.use(cors());
app.use(bodyParser.json());

// محاكاة حالة الاتصال بجهاز البصمة
let deviceStatus = {
    connected: false,
    ip: '',
    port: 4370
};

// مكتبة محاكاة لبروتوكول ZKTeco
// في البيئة الحقيقية، ستقوم بتثبيت مكتبة مثل 'node-zklib' واستخدامها هنا
const MockZKLib = {
    connect: (ip, port) => new Promise((resolve, reject) => {
        console.log(`[Agent] Connecting to ZK Device at ${ip}:${port}...`);
        setTimeout(() => {
            // محاكاة نجاح الاتصال دائماً للأغراض التعليمية
            resolve(true);
        }, 1500);
    }),
    disconnect: () => {
        console.log('[Agent] Disconnecting...');
    },
    getAttendance: () => {
        // بيانات وهمية تحاكي ما يأتي من الجهاز
        return [
            { uid: 1, id: '1001', timestamp: new Date() },
            { uid: 2, id: '1002', timestamp: new Date() }
        ];
    }
};

// 1. فحص حالة الخادم
app.get('/status', (req, res) => {
    res.json({ 
        status: 'running', 
        device: deviceStatus 
    });
});

// 2. طلب الاتصال بجهاز البصمة
app.post('/connect-device', async (req, res) => {
    const { ip, port } = req.body;
    try {
        await MockZKLib.connect(ip, port);
        deviceStatus = { connected: true, ip, port };
        res.json({ success: true, message: 'Connected to ZK Device successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Failed to connect to device' });
    }
});

// 3. طلب سحب السجلات (Logs)
app.get('/logs', async (req, res) => {
    if (!deviceStatus.connected) {
        return res.status(400).json({ success: false, message: 'Device not connected' });
    }
    const logs = MockZKLib.getAttendance();
    res.json({ success: true, data: logs });
});

// تشغيل الخادم
app.listen(PORT, () => {
    console.log(`
    🚀 Bridge Agent Running!
    ----------------------------------------
    1. Local Address:   http://localhost:${PORT}
    2. Status:          Ready to accept browser requests
    ----------------------------------------
    `);
});
