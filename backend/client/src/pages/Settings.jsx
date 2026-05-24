import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

export default function Settings() {
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [backups, setBackups] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ company_name: '', currency: 'EGP', tax_rate: '14', financial_year: '2024' });
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [purgeableTables, setPurgeableTables] = useState([]);
  const [selectedPurgeTables, setSelectedPurgeTables] = useState([]);
  const [resetKey, setResetKey] = useState('');

  const t = {
    ar: {
      title: "إعدادات النظام والصيانة",
      subtitle: "إدارة الهوية المؤسسية، النسخ الاحتياطي، وإعادة ضبط المصنع",
      companyInfo: "بيانات المؤسسة والمالية",
      save: "حفظ التعديلات",
      backupTitle: "إدارة النسخ الاحتياطي",
      manualBackup: "إنشاء نسخة احتياطية",
      restore: "استعادة",
      dangerZone: "منطقة العمليات الحساسة",
      factoryReset: "إعادة ضبط المصنع",
      resetWarning: "تحذير: سيتم مسح كافة البيانات التشغيلية نهائياً! لا يمكن التراجع عن هذا الإجراء.",
      backupTable: { name: "اسم النسخة", type: "النوع", size: "الحجم", date: "التاريخ", action: "إجراء" }
    },
    en: {
      title: "Settings & Maintenance",
      subtitle: "Manage company identity, backups, and system reset",
      companyInfo: "General Company Info",
      save: "Save Changes",
      backupTitle: "Backup & Recovery",
      manualBackup: "Create Manual Backup",
      restore: "Restore",
      dangerZone: "Danger Zone",
      factoryReset: "Factory Reset",
      resetWarning: "Warning: All operational data will be purged! This action cannot be undone.",
      backupTable: { name: "Backup Name", type: "Type", size: "Size", date: "Date", action: "Action" }
    }
  }[language === 'en' ? 'en' : 'ar'];

  const [whatsappStatus, setWhatsappStatus] = useState({ status: 'disconnected', qr: null });

  useEffect(() => {
    let interval = null;
    if (formData.whatsapp_enabled && formData.metadata?.whatsapp_type === 'self-hosted') {
      const getStatus = async () => {
        try {
          const { data } = await api.get('/system/whatsapp/status');
          setWhatsappStatus(data);
        } catch (e) {
          console.error("Failed to fetch WhatsApp status:", e);
        }
      };

      getStatus();
      interval = setInterval(getStatus, 3000);
    } else {
      setWhatsappStatus({ status: 'disconnected', qr: null });
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [formData.whatsapp_enabled, formData.metadata?.whatsapp_type]);

  const handleWhatsappInit = async () => {
    try {
      await api.post('/system/whatsapp/initialize');
      setWhatsappStatus(prev => ({ ...prev, status: 'connecting' }));
    } catch (e) {
      alert("Failed to initialize WhatsApp connection");
    }
  };

  const handleWhatsappLogout = async () => {
    if (!window.confirm(language === 'ar' ? "هل تريد قطع اتصال واتساب ومسح الجلسة الحالية؟" : "Disconnect WhatsApp and clear current session?")) return;
    try {
      await api.post('/system/whatsapp/logout');
      setWhatsappStatus({ status: 'disconnected', qr: null });
    } catch (e) {
      alert("Failed to log out");
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchBackups();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data } = await api.get('/table/settings?limit=1');
      if (data.data?.length > 0) setFormData(data.data[0]);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchBackups = async () => {
    try {
      const { data } = await api.get('/system/backups');
      setBackups(data.data || []);
    } catch (e) { console.error(e); }
  };

  const handleManualBackup = async () => {
    if (!window.confirm("هل تريد بدء النسخ الاحتياطي الآن؟")) return;
    setIsSubmitting(true);
    try {
      await api.post('/system/backups/manual');
      alert("تم إنشاء النسخة الاحتياطية بنجاح.");
      fetchBackups();
    } catch (e) { alert("فشل النسخ."); }
    finally { setIsSubmitting(false); }
  };

  const handleRestore = async (id) => {
    const key = window.prompt("⚠️ استعادة النظام ستمسح البيانات الحالية وتستبدلها بالنسخة. أدخل الكلمة التأكيدية (RESTORE_CONFIRMED) للمتابعة:");
    if (key !== 'RESTORE_CONFIRMED') return;
    setIsSubmitting(true);
    try {
      await api.post('/system/backups/restore', { backup_id: id, confirmation_key: key });
      alert("تم استعادة النظام بنجاح. يرجى إعادة تسجيل الدخول.");
      window.location.reload();
    } catch (e) { alert("فشل الاستعادة."); }
    finally { setIsSubmitting(false); }
  };

  const fetchPurgeableTables = async () => {
    try {
      const { data } = await api.get('/system/purgeable-tables');
      setPurgeableTables(data.data || []);
      setSelectedPurgeTables(data.data || []);
    } catch (e) { console.error(e); }
  };

  const handleFactoryReset = async () => {
    if (resetKey !== 'FACTORY_RESET_ALL') { alert("الكلمة التأكيدية غير صحيحة."); return; }
    if (selectedPurgeTables.length === 0) { alert("يرجى اختيار جدول واحد على الأقل."); return; }
    setIsSubmitting(true);
    try {
      await api.post('/system/factory-reset', { confirmation_key: resetKey, tables: selectedPurgeTables });
      alert("تمت إعادة ضبط المصنع بنجاح.");
      window.location.reload();
    } catch (e) { alert("فشلت العملية."); }
    finally { setIsSubmitting(false); }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
       await api.put('/update/settings/' + formData.id, formData);
       alert("تم حفظ الإعدادات بنجاح.");
    } catch (e) { alert("فشل التحديث."); }
    finally { setIsSubmitting(false); }
  };

  if (loading) return (
    <div className="h-[600px] flex items-center justify-center bg-white rounded-3xl p-20">
       <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
          <p className="font-black text-slate-400 uppercase tracking-widest text-xs animate-pulse">Syncing System Configurations...</p>
       </div>
    </div>
  );

  return (
    <div className="bg-[#f8fafc]/50 min-h-screen p-4 sm:p-10 space-y-10">
      <div className="max-w-[1600px] mx-auto space-y-10">
        
        {/* --- HEADER --- */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50/30 rounded-full -translate-y-32 translate-x-32 blur-3xl opacity-50"></div>
          
          <div className="flex items-center gap-6 relative z-10">
            <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center text-3xl shadow-xl shadow-slate-900/20 transform rotate-3">⚙️</div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">{t.title}</h1>
                <span className="bg-indigo-600 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-200">MAINT-PRO</span>
              </div>
              <p className="text-slate-400 font-bold text-sm mt-1">{t.subtitle}</p>
            </div>
          </div>

          <div className="flex gap-4 relative z-10">
             <button onClick={handleManualBackup} disabled={isSubmitting} className="px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2 transform active:scale-95">
                💾 {t.manualBackup}
             </button>
             <button onClick={() => { fetchPurgeableTables(); setIsResetModalOpen(true); }} className="px-8 py-4 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white border border-rose-100 rounded-xl font-black text-xs transition-all shadow-sm flex items-center gap-2 transform active:scale-95">
                🚀 {t.factoryReset}
             </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
           {/* --- COMPANY SETTINGS --- */}
           <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-8 border-b border-slate-100 bg-slate-50/30 flex justify-between items-center">
                <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
                  <span className="p-2 bg-white rounded-xl shadow-sm border border-slate-100">🏢</span>
                  {t.companyInfo}
                </h3>
              </div>
              <form onSubmit={handleSaveSettings} className="p-8 space-y-8">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">اسم المؤسسة (Identity)</label>
                    <input type="text" value={formData.company_name} onChange={e => setFormData({...formData, company_name: e.target.value})} className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-inner" />
                 </div>
                 <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">العملة الافتراضية</label>
                       <input type="text" value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value})} className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black font-mono text-slate-900 outline-none" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">السنة المالية الحالية</label>
                       <input type="text" value={formData.financial_year} onChange={e => setFormData({...formData, financial_year: e.target.value})} className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black font-mono text-slate-900 outline-none" />
                    </div>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">نسبة الضريبة الافتراضية (%)</label>
                    <input type="number" value={formData.tax_rate} onChange={e => setFormData({...formData, tax_rate: e.target.value})} className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black font-mono text-slate-900 outline-none" />
                 </div>
                 <button type="submit" disabled={isSubmitting} className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black text-lg hover:bg-slate-800 transition-all shadow-2xl shadow-slate-900/20 flex items-center justify-center gap-4 active:scale-[0.98] mt-4">
                    {isSubmitting ? (
                      <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                    ) : (
                      <>💾 {t.save}</>
                    )}
                 </button>
              </form>
           </div>

           {/* --- BACKUPS MANAGEMENT --- */}
           <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden flex flex-col">
              <div className="p-8 border-b border-slate-100 bg-emerald-50/30 flex justify-between items-center">
                <h3 className="text-xl font-black text-emerald-900 flex items-center gap-3">
                  <span className="p-2 bg-white rounded-xl shadow-sm border border-emerald-100">📦</span>
                  {t.backupTitle}
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto max-h-[500px] custom-scrollbar">
                <table className="w-full text-right whitespace-nowrap">
                  <thead className="bg-slate-50/50 border-b border-slate-100">
                    <tr className="text-slate-400 text-[10px] uppercase tracking-widest font-black">
                      <th className="px-8 py-5">اسم النسخة / التاريخ</th>
                      <th className="px-8 py-5 text-center">الحجم</th>
                      <th className="px-8 py-5 text-center">الإجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-mono">
                    {backups.map(b => (
                      <tr key={b.id} className="hover:bg-slate-50/50 transition-all group">
                        <td className="px-8 py-6">
                           <div className="flex flex-col">
                              <span className="font-black text-slate-900 text-[11px] truncate max-w-xs">{b.backup_name}</span>
                              <span className="text-[9px] text-slate-400 font-bold uppercase mt-1">{new Date(b.created_at).toLocaleString('ar-EG')}</span>
                           </div>
                        </td>
                        <td className="px-8 py-6 text-center">
                           <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-black border border-slate-200">
                              {(b.size_bytes / 1024 / 1024).toFixed(2)} MB
                           </span>
                        </td>
                        <td className="px-8 py-6 text-center">
                          <button onClick={() => handleRestore(b.id)} className="px-4 py-2 bg-amber-50 text-amber-600 border border-amber-100 rounded-xl text-[9px] font-black uppercase hover:bg-amber-600 hover:text-white transition-all shadow-sm active:scale-95">
                             Restore ⚡
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
           </div>

           {/* --- INTELLIGENCE & ALERT SETTINGS --- */}
           <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden xl:col-span-2">
              <div className="p-8 border-b border-slate-100 bg-[#0f172a] text-white flex justify-between items-center">
                <h3 className="text-xl font-black flex items-center gap-3 text-white">
                  <span className="p-2 bg-white/10 rounded-xl backdrop-blur-md text-white">🧠</span>
                  {language === 'ar' ? 'إعدادات الذكاء الاصطناعي والتنبيهات' : 'Strategic Intelligence & Alerts'}
                </h3>
                <div className="flex items-center gap-3">
                   <span className="text-[11px] font-black uppercase tracking-widest text-white/60">Status:</span>
                   <div className="flex items-center gap-2 px-4 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30">
                      <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></div>
                      <span className="text-[10px] font-black uppercase tracking-widest">Active Engine</span>
                   </div>
                </div>
              </div>
              <div className="p-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                 
                 {/* Trigger Toggles */}
                 <div className="space-y-6">
                    <h4 className="text-xs font-black text-slate-600 uppercase tracking-[0.2em] mb-4">Core Engine Toggles</h4>
                    <label className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer">
                       <span className="text-sm font-bold text-slate-700">Intelligence Engine</span>
                       <input 
                        type="checkbox" 
                        checked={formData.intelligence_enabled} 
                        onChange={e => setFormData({...formData, intelligence_enabled: e.target.checked})}
                        className="w-6 h-6 rounded-lg accent-[#0f172a]" 
                       />
                    </label>
                    <label className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 cursor-pointer">
                       <span className="text-sm font-bold text-slate-700">WhatsApp Alerts</span>
                       <input 
                        type="checkbox" 
                        checked={formData.whatsapp_enabled} 
                        onChange={e => setFormData({...formData, whatsapp_enabled: e.target.checked})}
                        className="w-6 h-6 rounded-lg accent-[#0f172a]" 
                       />
                    </label>
                    {formData.whatsapp_enabled && (
                      <div className="space-y-4 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 mt-2 text-slate-900">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-indigo-900 uppercase tracking-widest block text-right">نوع بوابة الواتساب (Gateway Type)</label>
                          <select
                            value={formData.metadata?.whatsapp_type || 'ultramsg'}
                            onChange={e => {
                              const meta = formData.metadata || {};
                              setFormData({...formData, metadata: {...meta, whatsapp_type: e.target.value}});
                            }}
                            className="w-full p-3 bg-white rounded-xl text-xs text-slate-800 border border-indigo-200 outline-none"
                          >
                            <option value="ultramsg">بوابة Ultramsg المدفوعة</option>
                            <option value="self-hosted">استضافة ذاتية محلية (Self-Hosted Baileys)</option>
                          </select>
                        </div>

                        {formData.metadata?.whatsapp_type !== 'self-hosted' ? (
                          <>
                            <div className="space-y-1">
                              <label className="text-[10px] font-black text-indigo-900 uppercase tracking-widest block text-right">معرف مثيل واتساب (Instance ID)</label>
                              <input 
                                type="text" 
                                value={formData.metadata?.whatsapp_instance_id || ''} 
                                onChange={e => {
                                  const meta = formData.metadata || {};
                                  setFormData({...formData, metadata: {...meta, whatsapp_instance_id: e.target.value}});
                                }}
                                placeholder="instance9912"
                                className="w-full p-3 bg-white rounded-xl text-xs font-mono text-slate-800 border border-indigo-200 outline-none text-left" 
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="text-[10px] font-black text-indigo-900 uppercase tracking-widest block text-right">رمز مرور البوابة (API Token)</label>
                              <input 
                                type="text" 
                                value={formData.metadata?.whatsapp_token || ''} 
                                onChange={e => {
                                  const meta = formData.metadata || {};
                                  setFormData({...formData, metadata: {...meta, whatsapp_token: e.target.value}});
                                }}
                                placeholder="token_value"
                                className="w-full p-3 bg-white rounded-xl text-xs font-mono text-slate-800 border border-indigo-200 outline-none text-left" 
                              />
                            </div>
                            <p className="text-[10px] text-indigo-700 font-bold leading-normal text-right">
                              💡 يرجى استخدام بوابة **Ultramsg** لربط رقمك {`01114704004`} مباشرة عبر مسح رمز QR.
                            </p>
                          </>
                        ) : (
                          <div className="space-y-3 bg-white p-4 rounded-xl border border-indigo-100 flex flex-col items-center">
                            <div className="flex items-center justify-between w-full">
                              <span className="text-xs font-bold text-slate-700">حالة الاتصال:</span>
                              {whatsappStatus.status === 'connected' ? (
                                <span className="px-2 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-lg">متصل ✅</span>
                              ) : whatsappStatus.status === 'qr' ? (
                                <span className="px-2 py-1 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-lg animate-pulse">انتظار المسح 📷</span>
                              ) : whatsappStatus.status === 'connecting' ? (
                                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-[10px] font-bold rounded-lg animate-pulse">جاري تشغيل الخدمة... ⏳</span>
                              ) : (
                                <span className="px-2 py-1 bg-rose-100 text-rose-800 text-[10px] font-bold rounded-lg">غير متصل ❌</span>
                              )}
                            </div>

                            {whatsappStatus.status === 'disconnected' && (
                              <button
                                type="button"
                                onClick={handleWhatsappInit}
                                className="mt-2 w-full p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all text-center"
                              >
                                بدء تشغيل الخدمة ومسح الرمز
                              </button>
                            )}

                            {whatsappStatus.status === 'connecting' && (
                              <div className="flex flex-col items-center gap-2 py-4">
                                <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                <span className="text-[10px] text-slate-400">جاري الاتصال...</span>
                              </div>
                            )}

                            {whatsappStatus.status === 'qr' && whatsappStatus.qr && (
                              <div className="flex flex-col items-center gap-2 py-2">
                                <p className="text-[10px] text-amber-700 text-center font-semibold">
                                  قم بمسح رمز الـ QR التالي عبر تطبيق واتساب (الأجهزة المرتبطة) من رقمك {`01114704004`}
                                </p>
                                <img
                                  src={whatsappStatus.qr}
                                  alt="WhatsApp QR Code"
                                  className="w-48 h-48 border border-slate-200 p-2 rounded-lg bg-white"
                                />
                              </div>
                            )}

                            {whatsappStatus.status === 'connected' && (
                              <button
                                type="button"
                                onClick={handleWhatsappLogout}
                                className="mt-2 w-full p-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all text-center"
                              >
                                تسجيل الخروج وإلغاء الربط
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                 </div>

                 {/* Thresholds */}
                 <div className="space-y-6">
                    <h4 className="text-xs font-black text-slate-600 uppercase tracking-[0.2em] mb-4">Sensitivity Thresholds</h4>
                    <div className="space-y-2">
                       <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Budget Burn Alert (%)</label>
                       <input 
                        type="number" 
                        value={formData.budget_threshold_pct} 
                        onChange={e => setFormData({...formData, budget_threshold_pct: e.target.value})}
                        className="w-full p-4 bg-slate-50 rounded-2xl font-black font-mono text-[#0f172a] outline-none border border-transparent focus:border-slate-200" 
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Liquidity Gap Alert (LCY)</label>
                       <input 
                        type="number" 
                        value={formData.liquidity_threshold} 
                        onChange={e => setFormData({...formData, liquidity_threshold: e.target.value})}
                        className="w-full p-4 bg-slate-50 rounded-2xl font-black font-mono text-[#0f172a] outline-none border border-transparent focus:border-slate-200" 
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Inventory Shortage Alert (%)</label>
                       <input 
                        type="number" 
                        value={formData.inventory_threshold_pct} 
                        onChange={e => setFormData({...formData, inventory_threshold_pct: e.target.value})}
                        className="w-full p-4 bg-slate-50 rounded-2xl font-black font-mono text-emerald-600 outline-none border border-transparent focus:border-emerald-100" 
                       />
                    </div>
                 </div>

                 {/* SLA Settings */}
                 <div className="space-y-6">
                    <h4 className="text-xs font-black text-slate-600 uppercase tracking-[0.2em] mb-4">Strategic SLAs</h4>
                    <div className="space-y-2">
                       <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Approval SLA (Hours)</label>
                       <input 
                        type="number" 
                        value={formData.approval_sla_hours} 
                        onChange={e => setFormData({...formData, approval_sla_hours: e.target.value})}
                        className="w-full p-4 bg-slate-50 rounded-2xl font-black font-mono text-[#0f172a] outline-none border border-transparent focus:border-slate-200" 
                       />
                    </div>
                    <div className="p-6 bg-indigo-50/50 rounded-2xl border border-indigo-100 mt-4">
                       <p className="text-[11px] text-indigo-700 font-bold leading-relaxed">
                          ⚠️ These settings directly impact the **Intelligence Engine**. Changes will take effect during the next diagnostic cycle.
                       </p>
                    </div>
                 </div>

                 {/* ADVANCED STRATEGIC RISKS */}
                 <div className="md:col-span-2 lg:col-span-3 pt-10 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-10">
                    <div className="space-y-2">
                       <h5 className="text-[11px] font-black text-slate-800 uppercase tracking-widest mb-3 flex items-center gap-2">
                          <span className="w-2.5 h-2.5 bg-rose-500 rounded-full"></span>
                          High-Value PO Alert
                       </h5>
                       <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Threshold (LCY)</label>
                       <input 
                        type="number" 
                        value={formData.high_value_po_threshold} 
                        onChange={e => setFormData({...formData, high_value_po_threshold: e.target.value})}
                        className="w-full p-4 bg-slate-50 rounded-2xl font-black font-mono text-rose-600 outline-none border border-transparent focus:border-rose-100" 
                       />
                    </div>

                    <div className="space-y-2">
                       <h5 className="text-[11px] font-black text-slate-800 uppercase tracking-widest mb-3 flex items-center gap-2">
                          <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full"></span>
                          Inactive Client Detection
                       </h5>
                       <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Days of Inactivity</label>
                       <input 
                        type="number" 
                        value={formData.inactive_client_days} 
                        onChange={e => setFormData({...formData, inactive_client_days: e.target.value})}
                        className="w-full p-4 bg-slate-50 rounded-2xl font-black font-mono text-indigo-600 outline-none border border-transparent focus:border-indigo-100" 
                       />
                    </div>

                    <div className="space-y-2">
                       <h5 className="text-[11px] font-black text-slate-800 uppercase tracking-widest mb-3 flex items-center gap-2">
                          <span className="w-2.5 h-2.5 bg-amber-500 rounded-full"></span>
                          Vendor Concentration Risk
                       </h5>
                       <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Max Share per Vendor (%)</label>
                       <input 
                        type="number" 
                        value={formData.vendor_concentration_pct} 
                        onChange={e => setFormData({...formData, vendor_concentration_pct: e.target.value})}
                        className="w-full p-4 bg-slate-50 rounded-2xl font-black font-mono text-amber-600 outline-none border border-transparent focus:border-amber-100" 
                       />
                    </div>
                 </div>

              </div>
           </div>
        </div>
      </div>

      {/* --- MODAL: FACTORY RESET --- */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
          <div className="bg-white w-full max-w-3xl rounded-[3.5rem] shadow-2xl border border-slate-200 overflow-hidden animate-scale-in flex flex-col max-h-[90vh]">
            <div className="p-12 bg-rose-600 text-white flex flex-col items-center text-center gap-4 relative">
               <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-32 translate-x-32"></div>
               <div className="w-20 h-20 bg-white/20 rounded-[2rem] flex items-center justify-center text-5xl mb-2 backdrop-blur-xl">🚨</div>
               <h3 className="text-4xl font-black tracking-tighter">إعادة ضبط المصنع (Purge)</h3>
               <p className="text-rose-100 font-bold max-w-md">{t.resetWarning}</p>
            </div>
            
            <div className="p-12 flex-1 overflow-y-auto space-y-10 custom-scrollbar">
              <div className="flex justify-between items-center bg-slate-50 p-6 rounded-3xl border border-slate-100">
                 <div className="flex items-center gap-4">
                    <input 
                      type="checkbox" 
                      checked={selectedPurgeTables.length === purgeableTables.length}
                      onChange={(e) => setSelectedPurgeTables(e.target.checked ? [...purgeableTables] : [])}
                      className="w-7 h-7 rounded-xl accent-rose-600 cursor-pointer shadow-sm"
                    />
                    <span className="font-black text-slate-800 text-lg">تحديد كافة الجداول التشغيلية</span>
                 </div>
                 <span className="bg-white px-4 py-2 rounded-xl text-[10px] font-black text-slate-400 border border-slate-200 uppercase tracking-widest">{selectedPurgeTables.length} Selected</span>
              </div>

              <div className="grid grid-cols-1 gap-10">
                {/* Categorized Tables */}
                {[
                  { 
                    id: 'finance', 
                    icon: '💰', 
                    title: language === 'ar' ? 'المالية والمحاسبة' : 'Finance & Accounting',
                    tables: ['ledger', 'chart_of_accounts', 'ar_invoices', 'ar_invoice_items', 'fixed_assets', 'gl_mappings', 'fiscal_periods'] 
                  },
                  { 
                    id: 'inventory', 
                    icon: '📦', 
                    title: language === 'ar' ? 'المخازن والمشتريات' : 'Inventory & Procurement',
                    tables: ['inventory_items', 'inventory_movements', 'inventory_sales', 'purchase_orders', 'inventory_bookings', 'material_usage'] 
                  },
                  { 
                    id: 'operations', 
                    icon: '🏗️', 
                    title: language === 'ar' ? 'المشاريع والعمليات' : 'Projects & Ops',
                    tables: ['projects', 'subcontractors', 'subcontractor_invoices', 'clients', 'customers', 'partners'] 
                  },
                  { 
                    id: 'system', 
                    icon: '🛡️', 
                    title: language === 'ar' ? 'النظام والأمان' : 'System & Security',
                    tables: ['users', 'roles', 'permissions', 'audit_logs', 'workflow_instances', 'active_sessions', 'email_logs', 'system_events'] 
                  }
                ].map(group => {
                  const groupTables = purgeableTables.filter(t => group.tables.includes(t.toLowerCase()));
                  if (groupTables.length === 0) return null;

                  return (
                    <div key={group.id} className="space-y-4">
                       <div className="flex items-center gap-3 px-2">
                          <span className="text-xl">{group.icon}</span>
                          <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">{group.title}</h4>
                       </div>
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {groupTables.map(table => (
                          <label key={table} className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer group ${selectedPurgeTables.includes(table) ? 'border-rose-300 bg-rose-50/50' : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'}`}>
                            <span className="font-bold text-[11px] uppercase tracking-tight text-slate-600 group-hover:text-rose-600 transition-colors">{table.replace(/_/g, ' ')}</span>
                            <input 
                              type="checkbox" 
                              checked={selectedPurgeTables.includes(table)}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedPurgeTables([...selectedPurgeTables, table]);
                                else setSelectedPurgeTables(selectedPurgeTables.filter(t => t !== table));
                              }}
                              className="w-5 h-5 rounded-lg accent-rose-600"
                            />
                          </label>
                        ))}
                       </div>
                    </div>
                  );
                })}

                {/* Other Tables not caught in groups */}
                {purgeableTables.filter(t => !['ledger', 'chart_of_accounts', 'ar_invoices', 'ar_invoice_items', 'fixed_assets', 'gl_mappings', 'fiscal_periods', 'inventory_items', 'inventory_movements', 'inventory_sales', 'purchase_orders', 'inventory_bookings', 'material_usage', 'projects', 'subcontractors', 'subcontractor_invoices', 'clients', 'customers', 'partners', 'users', 'roles', 'permissions', 'audit_logs', 'workflow_instances', 'active_sessions', 'email_logs', 'system_events'].includes(t.toLowerCase())).length > 0 && (
                  <div className="space-y-4">
                     <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">Other Data</h4>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {purgeableTables.filter(t => !['ledger', 'chart_of_accounts', 'ar_invoices', 'ar_invoice_items', 'fixed_assets', 'gl_mappings', 'fiscal_periods', 'inventory_items', 'inventory_movements', 'inventory_sales', 'purchase_orders', 'inventory_bookings', 'material_usage', 'projects', 'subcontractors', 'subcontractor_invoices', 'clients', 'customers', 'partners', 'users', 'roles', 'permissions', 'audit_logs', 'workflow_instances', 'active_sessions', 'email_logs', 'system_events'].includes(t.toLowerCase())).map(table => (
                          <label key={table} className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer group ${selectedPurgeTables.includes(table) ? 'border-rose-300 bg-rose-50/50' : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'}`}>
                            <span className="font-bold text-[11px] uppercase tracking-tight text-slate-600 group-hover:text-rose-600 transition-colors">{table.replace(/_/g, ' ')}</span>
                            <input 
                              type="checkbox" 
                              checked={selectedPurgeTables.includes(table)}
                              onChange={(e) => {
                                if (e.target.checked) setSelectedPurgeTables([...selectedPurgeTables, table]);
                                else setSelectedPurgeTables(selectedPurgeTables.filter(t => t !== table));
                              }}
                              className="w-5 h-5 rounded-lg accent-rose-600"
                            />
                          </label>
                        ))}
                     </div>
                  </div>
                )}
              </div>

              <div className="space-y-4 pt-10 border-t border-slate-100">
                <label className="block text-[10px] font-black text-rose-600 uppercase tracking-[0.2em] ml-2">لتأكيد العملية، يرجى كتابة الرمز التالي:</label>
                <div className="bg-rose-50 p-6 rounded-3xl border border-rose-100 space-y-4">
                   <p className="text-rose-700 font-mono font-black text-center text-2xl tracking-widest select-none">FACTORY_RESET_ALL</p>
                   <input 
                    type="text" 
                    value={resetKey} 
                    onChange={e => setResetKey(e.target.value)} 
                    placeholder="اكتب الرمز هنا..."
                    className="w-full p-5 rounded-2xl bg-white border-2 border-rose-100 font-black text-center text-rose-600 text-xl outline-none focus:border-rose-500 transition-all shadow-inner"
                  />
                </div>
              </div>
            </div>

            <div className="p-10 bg-slate-50 border-t border-slate-100 flex gap-6">
              <button onClick={() => setIsResetModalOpen(false)} className="flex-1 py-5 bg-white text-slate-400 rounded-[2rem] font-black text-lg border border-slate-200 hover:bg-slate-100 transition-all active:scale-95">إلغاء العملية</button>
              <button 
                onClick={handleFactoryReset}
                disabled={isSubmitting || resetKey !== 'FACTORY_RESET_ALL' || selectedPurgeTables.length === 0}
                className="flex-[2] py-5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:grayscale text-white rounded-[2rem] font-black text-lg shadow-2xl shadow-rose-500/20 transition-all active:scale-95"
              >
                {isSubmitting ? 'جاري التنفيذ...' : '🚀 تنفيذ المسح النهائي'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}