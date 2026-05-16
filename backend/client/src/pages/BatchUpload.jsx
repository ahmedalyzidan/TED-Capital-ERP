import React, { useState, useEffect } from 'react';
import api from '../services/api';

export default function BatchUpload() {
  const [modules, setModules] = useState([
    { id: 'inventory_items', name: 'المخزون (Inventory)' },
    { id: 'boq', name: 'مقايسة الأعمال (BOQ)' },
    { id: 'customers', name: 'العملاء (Customers)' },
    { id: 'subcontractors', name: 'مقاولي الباطن' }
  ]);
  const [selectedModule, setSelectedModule] = useState('inventory_items');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [previewData, setPreviewData] = useState([]);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);
    // In a real app, use PapaParse or XLSX to preview here.
  };

  const handleUpload = async () => {
    if (!file) return alert("يرجى اختيار ملف أولاً");
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('module', selectedModule);

    try {
      // 🌟 Generic Batch Import Endpoint (to be implemented in dynamicController)
      await api.post(`/dynamic/import/${selectedModule}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      alert("تم استيراد البيانات بنجاح!");
      setFile(null);
    } catch (error) {
      alert(error.response?.data?.error || "حدث خطأ أثناء الرفع.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="animate-fade-in space-y-8">
      <div className="glass-card p-10 border-r-8 border-r-indigo-600 bg-white/80">
        <h2 className="text-4xl font-black text-slate-800 flex items-center gap-4">
          <span className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg">🚀</span>
          محرك الرفع المجمع والبيانات الضخمة
        </h2>
        <p className="text-slate-500 font-bold mt-2">استيراد آلاف السجلات آلياً من ملفات CSV / Excel إلى قاعدة البيانات</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 bg-white p-8 rounded-[2.5rem] border shadow-sm space-y-6">
          <h3 className="text-xl font-black text-slate-800">1. إعدادات الرفع</h3>
          
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-400 uppercase ml-2">الموديول المستهدف</label>
            <select 
              value={selectedModule} 
              onChange={(e) => setSelectedModule(e.target.value)}
              className="w-full p-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-indigo-500 font-black outline-none transition-all"
            >
              {modules.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>

          <div className="p-6 bg-indigo-50 rounded-2xl border-2 border-dashed border-indigo-200">
            <p className="text-[10px] font-black text-indigo-400 uppercase mb-2">تعليمات التنسيق</p>
            <p className="text-xs font-bold text-indigo-700 leading-relaxed">
              تأكد من أن أسماء الأعمدة في الملف تطابق الحقول البرمجية. يمكنك تحميل قالب فارغ للمساعدة.
            </p>
            <button className="mt-4 text-xs font-black text-indigo-600 underline">تحميل قالب Excel (.xlsx)</button>
          </div>
        </div>

        <div className="md:col-span-2 bg-slate-900 rounded-[3rem] p-12 text-white shadow-2xl relative overflow-hidden">
          <div className="relative z-10 space-y-8">
            <h3 className="text-3xl font-black">2. اختيار الملف والمعالجة</h3>
            
            <div className="group relative border-4 border-dashed border-slate-700 rounded-[2rem] p-16 text-center hover:border-indigo-500 transition-all cursor-pointer">
              <input 
                type="file" 
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer" 
                accept=".csv, .xlsx, .xls"
              />
              <div className="space-y-4">
                <span className="text-6xl">📄</span>
                <p className="text-xl font-black text-slate-300">
                  {file ? file.name : "اسحب الملف هنا أو اضغط للاختيار"}
                </p>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">CSV, XLSX, XLS (Max 50MB)</p>
              </div>
            </div>

            {file && (
              <button 
                onClick={handleUpload}
                disabled={uploading}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-6 rounded-3xl font-black text-2xl shadow-2xl transition-all disabled:opacity-50"
              >
                {uploading ? "جاري المعالجة والرفع..." : "🚀 تأكيد الرفع والاستيراد الآن"}
              </button>
            )}
          </div>
          
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/20 blur-[120px] rounded-full"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-600/10 blur-[150px] rounded-full"></div>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] border p-10 shadow-sm">
        <h3 className="text-2xl font-black text-slate-800 mb-6">سجل الرفع الأخير (Last Activity)</h3>
        <div className="bg-slate-50 rounded-2xl p-8 border border-dashed text-center text-slate-400 font-bold">
          لا توجد عمليات رفع حالية. ابدأ باختيار ملف.
        </div>
      </div>
    </div>
  );
}
