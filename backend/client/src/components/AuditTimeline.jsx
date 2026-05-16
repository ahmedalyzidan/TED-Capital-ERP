import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

const AuditTimeline = ({ tableName, recordId, onClose }) => {
  const { language } = useLanguage();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const t = {
    en: {
      title: 'Record History',
      subtitle: 'Immutable Audit Trail & Version Control',
      action: 'Action',
      user: 'User',
      date: 'Timestamp',
      details: 'Change Details',
      noLogs: 'No audit history found for this record.',
      close: 'Close'
    },
    ar: {
      title: 'سجل الحركات',
      subtitle: 'سجل المراجعة غير القابل للتعديل وإدارة الإصدارات',
      action: 'الإجراء',
      user: 'المستخدم',
      date: 'التاريخ والوقت',
      details: 'تفاصيل التغيير',
      noLogs: 'لم يتم العثور على سجل حركات لهذا السجل.',
      close: 'إغلاق'
    }
  };

  const cur = t[language === 'en' ? 'en' : 'ar'];

  useEffect(() => {
    if (tableName && recordId) {
      fetchLogs();
    }
  }, [tableName, recordId]);

  const fetchLogs = async () => {
    try {
      const res = await api.get(`/system/audit/logs?table_name=${tableName}&record_id=${recordId}`);
      setLogs(res.rows || res.data?.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[110] p-4 animate-fade-in" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center text-xl shadow-lg shadow-emerald-500/20">📜</div>
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">{cur.title}</h3>
              <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">{cur.subtitle}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-12 h-12 flex items-center justify-center bg-slate-50 text-slate-400 hover:text-slate-900 rounded-2xl transition-all border border-slate-200 hover:border-slate-900 active:scale-95">{cur.close}</button>
        </div>

        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar space-y-8 bg-slate-50/30">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-10 h-10 border-4 border-slate-200 border-t-emerald-500 rounded-full animate-spin"></div>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-20 text-slate-400 font-bold italic">{cur.noLogs}</div>
          ) : (
            <div className="relative">
              {/* Vertical Line */}
              <div className={`absolute ${language === 'ar' ? 'right-6' : 'left-6'} top-0 bottom-0 w-0.5 bg-slate-200`}></div>

              <div className="space-y-12">
                {logs.map((log, idx) => (
                  <div key={log.id} className="relative flex gap-10 items-start group">
                    {/* Circle */}
                    <div className={`absolute ${language === 'ar' ? 'right-[21px]' : 'left-[21px]'} w-3 h-3 bg-white border-2 border-emerald-500 rounded-full z-10 group-hover:scale-150 transition-transform shadow-sm shadow-emerald-500/20 mt-1.5`}></div>
                    
                    <div className={`flex-1 ${language === 'ar' ? 'pr-14' : 'pl-14'}`}>
                      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                          <div className="flex items-center gap-3">
                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                              log.action === 'INSERT' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                              log.action === 'UPDATE' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                              'bg-rose-50 text-rose-600 border-rose-100'
                            }`}>
                              {log.action}
                            </span>
                            <span className="text-slate-900 font-black text-sm">{log.username}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono font-bold bg-slate-50 px-2 py-1 rounded-md">{new Date(log.created_at).toLocaleString()}</span>
                        </div>

                        {log.action === 'UPDATE' && log.old_data && log.new_data && (
                          <div className="space-y-3">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{cur.details}</p>
                            <div className="grid grid-cols-1 gap-2">
                                {Object.keys(log.new_data).map(key => {
                                  if (JSON.stringify(log.old_data[key]) !== JSON.stringify(log.new_data[key])) {
                                    return (
                                      <div key={key} className="flex flex-col p-3 bg-slate-50 rounded-xl border border-slate-100 text-[11px]">
                                        <span className="font-black text-slate-400 uppercase text-[9px] mb-1">{key.replace('_', ' ')}</span>
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="text-rose-500 line-through opacity-50 font-mono">{String(log.old_data[key] || 'NULL')}</span>
                                          <span className="text-slate-400">➡️</span>
                                          <span className="text-emerald-600 font-black font-mono">{String(log.new_data[key] || 'NULL')}</span>
                                        </div>
                                      </div>
                                    );
                                  }
                                  return null;
                                })}
                            </div>
                          </div>
                        )}

                        {log.action === 'INSERT' && (
                          <div className="bg-emerald-50/30 p-4 rounded-2xl border border-emerald-100/50">
                             <p className="text-emerald-700 font-bold text-xs">Record created with ID #{recordId}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuditTimeline;
