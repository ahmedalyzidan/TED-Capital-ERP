import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

const ApprovalInbox = () => {
  const { language } = useLanguage();
  const [view, setView] = useState('pending'); // pending | config
  const [pending, setPending] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);

  const t = {
    en: {
      title: 'Workflow Command Center',
      subtitle: 'Centralized Approval & Policy Management',
      pendingTab: 'Pending Requests',
      configTab: 'Workflow Configuration',
      noPending: 'Clean Desk! No pending authorizations.',
      module: 'Module',
      recordId: 'ID',
      amount: 'Amount',
      maker: 'Requested By',
      date: 'Date',
      actions: 'Actions',
      approve: 'Approve',
      reject: 'Reject',
      confirmApprove: 'Are you sure you want to approve this?',
      success: 'Action successful',
      config: {
        threshold: 'Authorization Threshold',
        status: 'Status',
        autoApprove: 'Auto-Approve Below',
        active: 'Active',
        save: 'Save Changes'
      }
    },
    ar: {
      title: 'مركز قيادة المسارات',
      subtitle: 'إدارة الاعتمادات والسياسات المركزية',
      pendingTab: 'الطلبات المعلقة',
      configTab: 'إعدادات المسارات',
      noPending: 'مكتب نظيف! لا توجد اعتمادات معلقة.',
      module: 'الموديول',
      recordId: 'الرقم',
      amount: 'المبلغ',
      maker: 'بواسطة',
      date: 'التاريخ',
      actions: 'الإجراءات',
      approve: 'اعتماد',
      reject: 'رفض',
      confirmApprove: 'هل أنت متأكد من رغبتك في الاعتماد؟',
      success: 'تمت العملية بنجاح',
      config: {
        threshold: 'حد الاعتماد',
        status: 'الحالة',
        autoApprove: 'اعتماد تلقائي تحت',
        active: 'نشط',
        save: 'حفظ الإعدادات'
      }
    }
  };

  const cur = t[language === 'en' ? 'en' : 'ar'];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pendingRes, configRes] = await Promise.all([
        api.get('/system/authorizations/pending'),
        api.get('/system/authorizations/workflows').catch(() => ({ data: { data: [] } }))
      ]);
      setPending(pendingRes.data?.data || []);
      setWorkflows(configRes.data?.data || []);
    } catch (err) {
      console.error("❌ [Approvals] Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (instanceId, action) => {
    if (action === 'Approve' && !window.confirm(cur.confirmApprove)) return;
    
    setProcessing(instanceId);
    try {
      await api.post('/system/authorizations/authorize', {
        instance_id: instanceId,
        action: action,
        comments: 'Authorized via Command Center'
      });
      alert(cur.success);
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Error processing request');
    } finally {
      setProcessing(null);
    }
  };

  const updateWorkflow = async (id, data) => {
    try {
      await api.put(`/system/authorizations/workflows/${id}`, data);
      alert(cur.success);
      fetchData();
    } catch (err) { alert('Error updating policy'); }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-20 font-sans" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Header Section */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm backdrop-blur-md bg-white/80">
        <div className="max-w-7xl mx-auto px-8 py-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-slate-900 text-white rounded-3xl flex items-center justify-center text-2xl shadow-xl shadow-slate-900/20">
              🛡️
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">{cur.title}</h1>
              <p className="text-slate-400 font-bold text-xs mt-1 uppercase tracking-widest">{cur.subtitle}</p>
            </div>
          </div>
          
          <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button 
              onClick={() => setView('pending')}
              className={`px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${view === 'pending' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {cur.pendingTab}
            </button>
            <button 
              onClick={() => setView('config')}
              className={`px-6 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${view === 'config' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              {cur.configTab}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 mt-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {loading ? (
          <div className="flex items-center justify-center py-40">
            <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
          </div>
        ) : view === 'pending' ? (
          pending.length === 0 ? (
            <div className="bg-white rounded-[2.5rem] border border-slate-200 p-24 text-center shadow-sm">
              <div className="text-6xl mb-6">🏆</div>
              <h2 className="text-2xl font-black text-slate-900">{cur.noPending}</h2>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              {pending.map((item) => (
                <div key={item.id} className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-full -translate-y-12 translate-x-12 opacity-50 group-hover:scale-150 transition-transform"></div>
                  
                  <div className="flex flex-col md:flex-row justify-between items-center gap-8 relative z-10">
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                        {item.module_name?.includes('PURCHASE') ? '🛒' : '📄'}
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1">
                          <span className="font-black text-slate-900 text-lg uppercase tracking-tight">{item.module_name?.replace('_', ' ')}</span>
                          <span className="px-2 py-0.5 bg-slate-900 text-white rounded text-[9px] font-black font-mono">#{item.record_id}</span>
                        </div>
                        <p className="text-slate-400 font-bold text-xs uppercase tracking-widest flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[8px] text-slate-600">{item.maker_username?.[0]}</span>
                          {item.maker_username} • {new Date(item.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-center md:items-end">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{cur.amount}</span>
                      <span className="text-3xl font-black text-slate-900 font-mono tracking-tighter">
                        {parseFloat(item.amount || 0).toLocaleString()} <span className="text-sm text-slate-300">LCY</span>
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-3 w-full md:w-auto justify-center md:justify-end">
                      <button 
                        onClick={() => handleAction(item.id, 'Reject')}
                        disabled={processing === item.id}
                        className="flex-1 md:flex-none px-6 py-2.5 bg-white text-rose-500 border border-rose-100 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all shadow-sm active:scale-95"
                      >
                        {cur.reject}
                      </button>
                      <button 
                        onClick={() => handleAction(item.id, 'Approve')}
                        disabled={processing === item.id}
                        className="flex-1 md:flex-none px-6 py-2.5 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20 active:scale-95 flex items-center justify-center gap-2"
                      >
                        {processing === item.id ? '...' : cur.approve}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          /* --- CONFIGURATION VIEW --- */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {workflows.map((wf) => (
              <div key={wf.id} className="bg-white rounded-[2.5rem] border border-slate-200 p-10 shadow-sm hover:border-slate-400 transition-all">
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-xl">⚙️</div>
                  <h3 className="font-black text-slate-900 uppercase tracking-tight">{wf.module_name?.replace('_', ' ')}</h3>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">{cur.config.threshold}</label>
                    <input 
                      type="number" 
                      defaultValue={wf.min_amount}
                      onBlur={(e) => updateWorkflow(wf.id, { ...wf, min_amount: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 font-mono font-bold text-slate-700 focus:outline-none focus:border-slate-900 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">{cur.config.autoApprove}</label>
                    <input 
                      type="number" 
                      defaultValue={wf.auto_approve_below || 0}
                      onBlur={(e) => updateWorkflow(wf.id, { ...wf, auto_approve_below: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 font-mono font-bold text-slate-700 focus:outline-none focus:border-slate-900 transition-colors"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{cur.config.active}</span>
                    <button 
                      onClick={() => updateWorkflow(wf.id, { ...wf, is_active: !wf.is_active })}
                      className={`w-12 h-6 rounded-full relative transition-all ${wf.is_active ? 'bg-emerald-500' : 'bg-slate-200'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${wf.is_active ? 'right-1' : 'left-1'}`}></div>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ApprovalInbox;
