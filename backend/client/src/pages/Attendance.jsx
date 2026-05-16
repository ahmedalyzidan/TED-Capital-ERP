import React, { useState, useEffect } from 'react';
import api from '../services/api';

export default function Attendance() {
  const [activeTab, setActiveTab] = useState('self_service'); // self_service, qr, batch, log
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [projects, setProjects] = useState([]);
  
  // GPS & Self Service State
  const [location, setLocation] = useState({ lat: null, lng: null });
  const [locError, setLocError] = useState('');
  const [selectedProject, setSelectedProject] = useState('');

  // Dynamic QR State
  const [dynamicQR, setDynamicQR] = useState('');

  // Batch Upload State
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    if (activeTab === 'log') fetchLogs();
    if (activeTab === 'self_service') fetchProjects();
    
    // 🌟 نظام الـ QR المتغير (يتغير كل 10 ثوانٍ لمنع تصويره وإرساله بالواتساب)
    if (activeTab === 'qr') {
      generateQR();
      const interval = setInterval(generateQR, 10000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      // افتراض وجود هذا المسار في الباك إند
      const res = await api.get('/table/attendance?limit=100');
      setLogs(res.data.data || []);
    } catch (error) {
      console.error("خطأ في جلب السجل", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await api.get('/dropdowns');
      setProjects(res.data.projects || []);
    } catch (error) {
      console.error(error);
    }
  };

  const generateQR = () => {
    // توليد كود مشفر يحتوي على الوقت الحالي ليكون صالحاً لثواني معدودة فقط
    const token = btoa(Date.now().toString() + "_SECURE_TED_ERP").substring(0, 15);
    setDynamicQR(token);
  };

  // 🌟 نظام سحب الإحداثيات الجغرافية (Geofencing)
  const getLocation = () => {
    if (!navigator.geolocation) {
      setLocError('متصفحك لا يدعم تحديد الموقع الجغرافي.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        setLocError('');
      },
      (error) => {
        setLocError('يجب السماح بالوصول لموقعك الجغرافي لتسجيل الحضور!');
      },
      { enableHighAccuracy: true }
    );
  };

  const handleSelfService = async (type) => {
    if (!location.lat || !location.lng) {
      alert("الرجاء تحديد موقعك الجغرافي أولاً!");
      return;
    }
    if (!selectedProject) {
      alert("الرجاء تحديد المشروع/الموقع!");
      return;
    }

    setLoading(true);
    try {
      // سيقوم الباك إند بالتحقق من الـ IP والـ GPS
      await api.post('/attendance/check', {
        type, // 'Check-In' or 'Check-Out'
        lat: location.lat,
        lng: location.lng,
        project_name: selectedProject
      });
      alert(`تم تسجيل الـ ${type} بنجاح!`);
    } catch (error) {
      // هنا يظهر إبداع النظام الصارم: رسالة رفض بناءً على المسافة أو الـ IP
      alert(`🛑 تم الرفض: ${error.response?.data?.error || "حدث خطأ"}`);
    } finally {
      setLoading(false);
    }
  };

  // 🌟 نظام الرفع المجمع (Batch Upload)
  const handleFileUpload = (e) => setSelectedFile(e.target.files[0]);

  const submitBatchFile = async (e) => {
    e.preventDefault();
    if (!selectedFile) return alert("الرجاء اختيار ملف CSV أولاً.");

    const formData = new FormData();
    formData.append('file', selectedFile);

    setLoading(true);
    try {
      // إرسال الملف للباك إند لمعالجته عبر Multer و csv-parser
      const res = await api.post('/attendance/batch-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert(`تم رفع الملف بنجاح! تم تسجيل ${res.data.insertedRows || 0} حركة.`);
      setSelectedFile(null);
      e.target.reset();
    } catch (error) {
      alert(error.response?.data?.error || "حدث خطأ أثناء معالجة الملف. تأكد من تطابق الأعمدة.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in relative">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-black text-slate-800">ضبط الحضور والانصراف (Time & Attendance)</h2>
          <p className="text-slate-500 font-bold text-sm mt-1">سياج جغرافي، IP Whitelisting، ورفع مجمع لبيانات البصمة</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setActiveTab('self_service')} className={`px-4 py-2 rounded-xl font-bold transition ${activeTab === 'self_service' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600'}`}>الحضور الذاتي (GPS)</button>
          <button onClick={() => setActiveTab('qr')} className={`px-4 py-2 rounded-xl font-bold transition ${activeTab === 'qr' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600'}`}>الـ QR المتغير</button>
          <button onClick={() => setActiveTab('batch')} className={`px-4 py-2 rounded-xl font-bold transition ${activeTab === 'batch' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600'}`}>الرفع المجمع (CSV)</button>
          <button onClick={() => setActiveTab('log')} className={`px-4 py-2 rounded-xl font-bold transition ${activeTab === 'log' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600'}`}>سجل الرقابة</button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden min-h-[400px]">
        
        {/* ================= 1. SELF SERVICE (GPS + IP) ================= */}
        {activeTab === 'self_service' && (
          <div className="p-8 max-w-xl mx-auto text-center space-y-6">
            <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100">
              <h3 className="text-xl font-black text-blue-800 mb-2">تسجيل الحضور عبر السياج الجغرافي</h3>
              <p className="text-sm font-bold text-slate-500 mb-6">لن يتم قبول التسجيل إلا إذا كنت داخل نطاق الموقع (50 متر) ومتصل بشبكة الشركة.</p>
              
              <div className="text-left mb-4">
                <label className="block text-sm font-bold text-slate-700 mb-2">تحديد الموقع / المشروع *</label>
                <select value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)} className="w-full p-3 rounded-xl bg-white border border-slate-200 font-bold outline-none focus:border-blue-500">
                  <option value="">-- اختر موقع العمل --</option>
                  <option value="General">المقر الرئيسي (الإدارة)</option>
                  {projects.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              {!location.lat ? (
                <button onClick={getLocation} className="w-full bg-slate-800 text-white font-black py-4 rounded-xl shadow-lg hover:bg-slate-900 transition flex items-center justify-center gap-2">
                  📍 اضغط لتحديد موقعك الجغرافي (GPS)
                </button>
              ) : (
                <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 mb-4 text-emerald-800 font-mono text-xs font-bold text-left">
                  Lat: {location.lat.toFixed(6)} <br/> Lng: {location.lng.toFixed(6)} <br/>
                  <span className="text-emerald-600">✓ تم التقاط الإحداثيات</span>
                </div>
              )}
              {locError && <p className="text-red-500 font-bold text-sm mt-2">{locError}</p>}
            </div>

            <div className="flex gap-4">
              <button disabled={loading} onClick={() => handleSelfService('Check-In')} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-4 rounded-2xl font-black text-xl shadow-lg transition disabled:opacity-50">
                تسجيل الدخول
              </button>
              <button disabled={loading} onClick={() => handleSelfService('Check-Out')} className="flex-1 bg-red-500 hover:bg-red-600 text-white py-4 rounded-2xl font-black text-xl shadow-lg transition disabled:opacity-50">
                تسجيل الانصراف
              </button>
            </div>
          </div>
        )}

        {/* ================= 2. DYNAMIC QR ================= */}
        {activeTab === 'qr' && (
          <div className="p-8 text-center flex flex-col items-center justify-center min-h-[400px] bg-slate-50">
            <h3 className="text-2xl font-black text-slate-800 mb-2">امسح الرمز لتسجيل الحضور</h3>
            <p className="text-sm font-bold text-rose-500 mb-8">يتم تحديث هذا الرمز تلقائياً كل 10 ثوانٍ لمنع التلاعب.</p>
            
            <div className="bg-white p-8 rounded-3xl shadow-xl border-4 border-slate-800 inline-block">
               {/* كود وهمي للعرض، في التطبيق الحقيقي نستخدم مكتبة qrcode.react */}
               <div className="w-64 h-64 bg-slate-100 flex items-center justify-center text-slate-300 border-2 border-dashed border-slate-300 mb-4">
                 [ مساحة الـ QR Code ]
               </div>
               <p className="font-mono font-black text-3xl tracking-widest text-slate-800">{dynamicQR}</p>
            </div>
          </div>
        )}

        {/* ================= 3. BATCH UPLOAD (EXCEL/CSV) ================= */}
        {activeTab === 'batch' && (
          <div className="p-8 max-w-2xl mx-auto">
            <div className="bg-amber-50 p-6 rounded-3xl border border-amber-100 mb-6 text-amber-800">
              <h3 className="font-black text-lg mb-2">تعليمات الرفع المجمع (Batch File)</h3>
              <ul className="list-disc list-inside text-sm font-bold space-y-1">
                <li>يجب أن يكون الملف بصيغة <b>.csv</b>.</li>
                <li>الأعمدة المطلوبة: <code>staff_id, project_name, check_in, check_out</code>.</li>
                <li>صيغة التاريخ والوقت: <code>YYYY-MM-DD HH:MM:SS</code>.</li>
              </ul>
            </div>

            <form onSubmit={submitBatchFile} className="space-y-6">
              <div className="border-4 border-dashed border-slate-200 rounded-3xl p-10 text-center hover:border-blue-400 transition bg-slate-50 cursor-pointer">
                <input type="file" accept=".csv" onChange={handleFileUpload} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                {!selectedFile && <p className="text-slate-400 font-bold mt-4">اسحب وأفلت ملف الـ CSV هنا</p>}
              </div>
              
              <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white font-black py-4 rounded-xl shadow-lg hover:bg-blue-700 transition disabled:opacity-50">
                {loading ? 'جاري المعالجة والمطابقة...' : 'رفع واعتماد الملف المجمع'}
              </button>
            </form>
          </div>
        )}

        {/* ================= 4. ATTENDANCE LOG ================= */}
        {activeTab === 'log' && (
          <div className="overflow-x-auto">
            <table className="w-full text-right whitespace-nowrap text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="p-4 font-black text-slate-600">كود الموظف</th>
                  <th className="p-4 font-black text-slate-600">المشروع / الموقع</th>
                  <th className="p-4 font-black text-emerald-600">وقت الدخول (Check-In)</th>
                  <th className="p-4 font-black text-rose-600">وقت الانصراف (Check-Out)</th>
                  <th className="p-4 font-black text-slate-600">الحالة / الرقابة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {loading ? (
                  <tr><td colSpan="5" className="p-8 text-center animate-pulse font-bold text-slate-400">جاري التحميل...</td></tr>
                ) : logs.length === 0 ? (
                  <tr><td colSpan="5" className="p-8 text-center text-slate-400 font-bold">لا توجد سجلات حضور.</td></tr>
                ) : (
                  logs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50 transition">
                      <td className="p-4 font-bold text-slate-500">EMP-{log.staff_id}</td>
                      <td className="p-4 font-bold text-slate-800 font-sans">{log.project_name}</td>
                      <td className="p-4 font-bold text-emerald-700">{new Date(log.check_in).toLocaleString('ar-EG')}</td>
                      <td className="p-4 font-bold text-rose-700">{log.check_out ? new Date(log.check_out).toLocaleString('ar-EG') : 'لم ينصرف'}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold font-sans ${log.status === 'Present' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                          {log.status || 'مسجل (GPS/IP)'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}