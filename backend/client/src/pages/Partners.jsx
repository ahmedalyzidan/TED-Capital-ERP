import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

export default function Partners() {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState('partners');
  const [loading, setLoading] = useState(true);

  // States
  const [partners, setPartners] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);

  // Modals
  const [isPartnerModalOpen, setIsPartnerModalOpen] = useState(false);
  const [isTrxModalOpen, setIsTrxModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Forms
  const [partnerForm, setPartnerForm] = useState({ 
    id: null,
    name: '', 
    company: '',
    partner_type: 'Partner', 
    project_name: '',
    investment_percentage: '', 
    management_percentage: '' 
  });
  
  const [trxForm, setTrxForm] = useState({ 
    id: null,
    partner_id: '', 
    type: 'Capital Injection', 
    amount: '', 
    currency: 'EGP',
    exchange_rate: 1,
    amount_fc: '',
    date: new Date().toISOString().split('T')[0], 
    description: '',
    project_name: '',
    company: '',
    payment_method: 'Cash',
    reference_no: ''
  });

  useEffect(() => {
    fetchData();
    fetchProjects();
  }, [activeTab, selectedProject]);

  const fetchProjects = async () => {
    try {
      const res = await api.get('/dynamic/table/projects?limit=100');
      setProjects(res.data?.data || []);
    } catch (error) {
      console.error("Error fetching projects", error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const filter = selectedProject ? `&filter=${encodeURIComponent(selectedProject.name)}` : '';
      const [partnersRes, trxRes] = await Promise.all([
        api.get(`/dynamic/table/partners?limit=100${filter}`).catch(() => ({ data: { data: [] } })),
        api.get(`/dynamic/table/partner_transactions?limit=100${filter}`).catch(() => ({ data: { data: [] } }))
      ]);
      setPartners(partnersRes.data?.data || []);
      setTransactions(trxRes.data?.data || []);
    } catch (error) {
      console.error("Error fetching partners data", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePartnerSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (partnerForm.id) {
        await api.put(`/dynamic/update/partners/${partnerForm.id}`, partnerForm);
      } else {
        await api.post('/dynamic/add/partners', partnerForm);
      }
      alert("تم حفظ بيانات الشريك بنجاح!");
      setIsPartnerModalOpen(false);
      resetPartnerForm();
      fetchData();
    } catch (error) {
      alert(error.response?.data?.error || "حدث خطأ");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTrxSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const dataToSubmit = {
        ...trxForm,
        amount: parseFloat(trxForm.amount) || 0,
        exchange_rate: parseFloat(trxForm.exchange_rate) || 1,
        amount_fc: parseFloat(trxForm.amount_fc) || 0
      };
      if (trxForm.id) {
        await api.put(`/dynamic/update/partner_transactions/${trxForm.id}`, dataToSubmit);
      } else {
        await api.post('/dynamic/add/partner_transactions', dataToSubmit);
      }
      alert("تم حفظ الحركة المالية بنجاح!");
      setIsTrxModalOpen(false);
      resetTrxForm();
      fetchData();
    } catch (error) {
      alert(error.response?.data?.error || "حدث خطأ أثناء حفظ الحركة.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTrxFormChange = (e) => {
    const { name, value } = e.target;
    let updatedTrx = { ...trxForm, [name]: value };

    // Auto-calculate LCY amount if FC or Rate changes
    if (name === 'amount_fc' || name === 'exchange_rate' || name === 'currency') {
      const fc = name === 'amount_fc' ? parseFloat(value) || 0 : parseFloat(trxForm.amount_fc) || 0;
      const rate = name === 'exchange_rate' ? parseFloat(value) || 0 : parseFloat(trxForm.exchange_rate) || 0;
      
      if (updatedTrx.currency === 'EGP') {
        updatedTrx.exchange_rate = 1;
        updatedTrx.amount = fc || updatedTrx.amount; // If EGP, amount is usually entered directly or via FC
        if (name === 'amount_fc') updatedTrx.amount = fc;
      } else {
        updatedTrx.amount = (fc * rate).toFixed(2);
      }
    }

    setTrxForm(updatedTrx);
  };

  const handleTrxDelete = async (id) => {
    if (!window.confirm("هل أنت متأكد من حذف هذه الحركة المالية؟ سيؤثر ذلك على رصيد الشريك.")) return;
    try {
      await api.delete(`/dynamic/delete/partner_transactions/${id}`);
      fetchData();
    } catch (error) {
      alert("فشل الحذف");
    }
  };

  const openEditTrx = (trx) => {
    setTrxForm({
      ...trx,
      currency: trx.currency || 'EGP',
      exchange_rate: trx.exchange_rate || 1,
      amount_fc: trx.amount_fc || trx.amount,
      date: trx.date ? trx.date.split('T')[0] : new Date().toISOString().split('T')[0],
      payment_method: trx.payment_method || 'Cash',
      reference_no: trx.reference_no || ''
    });
    setIsTrxModalOpen(true);
  };

  const resetPartnerForm = () => {
    setPartnerForm({ 
      id: null,
      name: '', 
      company: selectedProject?.company || '', 
      partner_type: 'Partner', 
      project_name: selectedProject?.name || '', 
      investment_percentage: '', 
      management_percentage: '' 
    });
  };

  const resetTrxForm = () => {
    setTrxForm({ 
      id: null,
      partner_id: '', 
      type: 'Capital Injection', 
      amount: '', 
      currency: 'EGP',
      exchange_rate: 1,
      amount_fc: '',
      date: new Date().toISOString().split('T')[0], 
      description: '', 
      project_name: selectedProject?.name || '',
      company: selectedProject?.company || '',
      payment_method: 'Cash',
      reference_no: ''
    });
  };

  const handleDistributeProfit = async () => {
    if (!selectedProject) return;
    if (!window.confirm(`هل أنت متأكد من ترحيل مبلغ ${Number(distributableProfit).toLocaleString()} لجميع الشركاء؟ سيتم إنشاء قيود محاسبية آلياً.`)) return;

    setIsSubmitting(true);
    try {
      await api.post(`/projects/distribute-profit/${selectedProject.id}`);
      alert("تم ترحيل الأرباح وتسجيل القيود المحاسبية بنجاح!");
      fetchProjects(); 
      fetchData();    
    } catch (error) {
      alert(error.response?.data?.error || "حدث خطأ أثناء التوزيع");
    } finally {
      setIsSubmitting(false);
    }
  };

  const distributableProfit = selectedProject ? (parseFloat(selectedProject.actual_profit) || 0) - (parseFloat(selectedProject.management_profit_amount) || 0) : 0;

  // 🌟 Calculate Aggregate Totals
  const projectTotals = transactions.reduce((acc, t) => {
    if (t.type === 'Capital Injection') acc.deposits += parseFloat(t.amount || 0);
    if (t.type === 'Withdrawal') acc.withdrawals += parseFloat(t.amount || 0);
    return acc;
  }, { deposits: 0, withdrawals: 0 });

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20 animate-fade-in">
      {/* Header Section --- */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-[1600px] mx-auto px-8 py-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-amber-500 rounded-2xl flex items-center justify-center text-3xl shadow-lg shadow-amber-500/20 text-white">
                🤝
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                  {language === 'ar' ? 'الشركاء وتوزيع الأرباح' : 'Partners & Profit Distribution'}
                </h1>
                <p className="text-slate-400 font-medium text-xs mt-1 uppercase tracking-widest">
                  {language === 'ar' ? 'إدارة الحصص الاستثمارية وتوزيعات الأرباح' : 'Management of investment shares and profit distributions'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-100">
              <select 
                className="px-6 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-amber-500 transition-all shadow-sm min-w-[200px]"
                onChange={(e) => {
                  const proj = projects.find(p => p.id === parseInt(e.target.value));
                  setSelectedProject(proj || null);
                }}
              >
                <option value="">{language === 'ar' ? '-- كل المشاريع --' : '-- All Projects --'}</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              
              <div className="flex p-1 bg-white rounded-xl border border-slate-200 shadow-sm">
                <button 
                  onClick={() => setActiveTab('partners')} 
                  className={`px-6 py-2 rounded-lg font-bold text-[10px] uppercase tracking-widest transition-all ${activeTab === 'partners' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                  {language === 'ar' ? 'هيكل الشركاء' : 'Partner Structure'}
                </button>
                <button 
                  onClick={() => setActiveTab('transactions')} 
                  className={`px-6 py-2 rounded-lg font-bold text-[10px] uppercase tracking-widest transition-all ${activeTab === 'transactions' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}
                >
                  {language === 'ar' ? 'سجل الحركات' : 'Transaction Log'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-8 py-10 space-y-10">
        {selectedProject && (
          <div className="space-y-8">
            {/* Project Summary Cards --- */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-slate-900 rounded-2xl p-6 text-white shadow-xl shadow-slate-900/10 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-10 text-6xl pointer-events-none group-hover:scale-110 transition-transform">🏛️</div>
                <p className="text-[9px] font-bold text-amber-500 uppercase tracking-widest mb-1">{language === 'ar' ? 'المشروع / الشركة' : 'Project / Company'}</p>
                <h4 className="text-xl font-bold tracking-tight truncate">{selectedProject.name}</h4>
                <p className="text-[10px] font-medium text-slate-400 mt-1">{selectedProject.company}</p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-5 text-6xl pointer-events-none group-hover:scale-110 transition-transform">💰</div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">{language === 'ar' ? 'إجمالي الإيداعات' : 'Total Deposits'}</p>
                <h4 className="text-2xl font-bold text-emerald-600 font-mono tracking-tighter">+{projectTotals.deposits.toLocaleString()}</h4>
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Investment</span>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-5 text-6xl pointer-events-none group-hover:scale-110 transition-transform">📉</div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">{language === 'ar' ? 'إجمالي السحوبات' : 'Total Withdrawals'}</p>
                <h4 className="text-2xl font-bold text-rose-600 font-mono tracking-tighter">-{projectTotals.withdrawals.toLocaleString()}</h4>
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Capital Returns</span>
                </div>
              </div>

              <div className="bg-amber-500 rounded-2xl p-6 text-white shadow-lg shadow-amber-500/20 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-20 text-6xl pointer-events-none group-hover:scale-110 transition-transform">⚖️</div>
                <p className="text-[9px] font-bold text-amber-100 uppercase tracking-widest mb-1">{language === 'ar' ? 'صافي السيولة' : 'Net Liquidity'}</p>
                <h4 className="text-2xl font-bold font-mono tracking-tighter">{(projectTotals.deposits - projectTotals.withdrawals).toLocaleString()}</h4>
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-white"></span>
                  <span className="text-[10px] font-bold text-amber-100 uppercase tracking-widest">Net Invested</span>
                </div>
              </div>
            </div>

            {/* Profit Distribution Section --- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm flex flex-col justify-between">
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">{language === 'ar' ? 'صافي الربح الفعلي' : 'Actual Net Profit'}</p>
                  <h4 className="text-4xl font-bold text-slate-900 font-mono tracking-tighter">{Number(selectedProject.actual_profit || 0).toLocaleString()}</h4>
                </div>
                <div className="mt-6 p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">{language === 'ar' ? 'نسبة الربح' : 'Profit Margin'}</span>
                  <span className="text-sm font-bold text-emerald-700">{selectedProject.actual_profit_percent || 0}%</span>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm flex flex-col justify-between">
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">{language === 'ar' ? 'نصيب الإدارة' : 'Management Share'}</p>
                  <h4 className="text-4xl font-bold text-slate-900 font-mono tracking-tighter">{Number(selectedProject.management_profit_amount || 0).toLocaleString()}</h4>
                </div>
                <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-blue-700 uppercase tracking-widest">{language === 'ar' ? 'نسبة الاستقطاع' : 'Deduction %'}</span>
                  <span className="text-sm font-bold text-blue-700">{selectedProject.management_profit_percent || 0}%</span>
                </div>
              </div>

              <div className="bg-slate-900 rounded-2xl p-8 shadow-xl shadow-slate-900/10 relative overflow-hidden">
                <div className="relative z-10">
                  <p className="text-[9px] font-bold text-amber-500 uppercase tracking-widest mb-1">{language === 'ar' ? 'الربح القابل للتوزيع' : 'Distributable Profit'}</p>
                  <h4 className="text-4xl font-bold text-white font-mono tracking-tighter">{Number(distributableProfit).toLocaleString()}</h4>
                  <p className="text-[10px] font-bold text-slate-400 mt-2">
                    {language === 'ar' ? `سيتم توزيعه على ${partners.length} شركاء` : `Distributed across ${partners.length} partners`}
                  </p>

                  <div className="mt-8">
                    {selectedProject.is_profit_distributed ? (
                      <div className="w-full py-4 bg-slate-800 rounded-xl border border-slate-700 flex items-center justify-center gap-3 text-emerald-400 font-bold text-[10px] uppercase tracking-widest">
                        <span className="text-sm">✓</span> {language === 'ar' ? 'تم ترحيل الأرباح مسبقاً' : 'Profits already distributed'}
                      </div>
                    ) : (
                      <button 
                        onClick={handleDistributeProfit}
                        disabled={isSubmitting || distributableProfit <= 0}
                        className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-amber-500/20 transition-all active:scale-[0.98] disabled:opacity-50"
                      >
                        {language === 'ar' ? 'ترحيل الأرباح دفترياً' : 'Finalize Profit Distribution'}
                      </button>
                    )}
                  </div>
                </div>
                <div className="absolute bottom-0 right-0 opacity-10 text-9xl transform translate-x-10 translate-y-10">⚖️</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'partners' && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm animate-fade-in">
             <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{language === 'ar' ? 'هيكل ملكية المشروع' : 'Project Ownership Structure'}</h3>
                  <p className="text-slate-400 font-medium text-[10px] uppercase tracking-widest mt-1">Equity and share management</p>
                </div>
                <button 
                  onClick={() => {
                    resetPartnerForm();
                    setIsPartnerModalOpen(true);
                  }} 
                  className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-slate-900/20 active:scale-[0.98]"
                >
                  {language === 'ar' ? '+ إضافة شريك جديد' : '+ Add New Partner'}
                </button>
             </div>
             <div className="overflow-x-auto">
              <table className={`w-full ${language === 'ar' ? 'text-right' : 'text-left'} whitespace-nowrap`}>
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] uppercase tracking-widest">
                    <th className="px-6 py-4 font-bold">{language === 'ar' ? 'اسم الشريك' : 'Partner Name'}</th>
                    <th className="px-6 py-4 font-bold">{language === 'ar' ? 'التصنيف' : 'Classification'}</th>
                    <th className="px-6 py-4 font-bold text-center">{language === 'ar' ? 'النسبة (I)' : 'Inv. %'}</th>
                    <th className="px-6 py-4 font-bold text-center">{language === 'ar' ? 'النسبة (M)' : 'Mgmt. %'}</th>
                    <th className="px-6 py-4 font-bold text-center">{language === 'ar' ? 'نصيب الأرباح' : 'Est. Share'}</th>
                    <th className="px-6 py-4 font-bold text-emerald-600">{language === 'ar' ? 'الإيداعات' : 'Deposits'}</th>
                    <th className="px-6 py-4 font-bold text-rose-600">{language === 'ar' ? 'السحوبات' : 'Withdrawals'}</th>
                    <th className="px-6 py-4 font-bold text-slate-900">{language === 'ar' ? 'صافي الاستثمار' : 'Net Investment'}</th>
                    <th className="px-6 py-4 font-bold text-center">{language === 'ar' ? 'إجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan="9" className="p-20 text-center animate-pulse font-bold text-slate-400">{language === 'ar' ? 'جاري تحميل البيانات...' : 'Loading data...'}</td></tr>
                  ) : partners.length === 0 ? (
                    <tr><td colSpan="9" className="p-20 text-center text-slate-400 font-bold italic">{language === 'ar' ? 'لا يوجد شركاء مرتبطين.' : 'No partners found.'}</td></tr>
                  ) : (
                    partners.map(p => {
                      const estimatedShare = (distributableProfit * (parseFloat(p.investment_percentage) || 0) / 100).toFixed(2);
                      const ptrDeposits = transactions.filter(t => t.partner_id === p.id && t.type === 'Capital Injection').reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
                      const ptrWithdrawals = transactions.filter(t => t.partner_id === p.id && t.type === 'Withdrawal').reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
                      return (
                        <tr key={p.id} className="hover:bg-slate-50 transition-all group">
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900 text-sm">{p.name}</span>
                              <span className="text-[10px] font-bold text-slate-400 uppercase">{p.company || '-'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-widest border ${
                              p.partner_type === 'Admin' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                              p.partner_type === 'Both' ? 'bg-purple-50 text-purple-700 border-purple-100' :
                              'bg-emerald-50 text-emerald-700 border-emerald-100'
                            }`}>
                              {p.partner_type === 'Admin' ? (language === 'ar' ? '👔 مدير إداري' : 'Admin') : 
                               p.partner_type === 'Both' ? (language === 'ar' ? '🌟 شريك وإداري' : 'Partner/Admin') : (language === 'ar' ? '🤝 شريك مستثمر' : 'Partner')}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center font-bold text-slate-500 text-sm">{p.investment_percentage}%</td>
                          <td className="px-6 py-4 text-center font-bold text-slate-500 text-sm">{p.management_percentage}%</td>
                          <td className="px-6 py-4 text-center">
                            <span className="font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md text-[11px] border border-emerald-100">
                              {Number(estimatedShare).toLocaleString()}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-bold text-emerald-700 font-mono text-sm">
                            {Number(ptrDeposits).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 font-bold text-rose-700 font-mono text-sm">
                            {Number(ptrWithdrawals).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 font-bold text-slate-900 font-mono text-sm">
                             {Number(ptrDeposits - ptrWithdrawals).toLocaleString()}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-center gap-2">
                               <button onClick={() => { setPartnerForm(p); setIsPartnerModalOpen(true); }} className="p-2 text-slate-400 hover:text-amber-600 transition-all">✏️</button>
                               <button onClick={async () => { if(window.confirm(language === 'ar' ? "حذف الشريك؟" : "Delete partner?")) { await api.delete(`/dynamic/delete/partners/${p.id}`); fetchData(); } }} className="p-2 text-slate-400 hover:text-rose-600 transition-all">🗑️</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm animate-fade-in">
             <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">{language === 'ar' ? 'سجل الحركات المالية' : 'Financial Transaction Log'}</h3>
                  <p className="text-slate-400 font-medium text-[10px] uppercase tracking-widest mt-1">Audit trail of capital moves</p>
                </div>
                <button 
                  onClick={() => { resetTrxForm(); setIsTrxModalOpen(true); }} 
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-emerald-900/20 active:scale-[0.98]"
                >
                  {language === 'ar' ? '+ تسجيل حركة جديدة' : '+ Register Transaction'}
                </button>
             </div>
             <div className="overflow-x-auto">
              <table className={`w-full ${language === 'ar' ? 'text-right' : 'text-left'} whitespace-nowrap`}>
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] uppercase tracking-widest">
                    <th className="px-6 py-4 font-bold">{language === 'ar' ? 'المرجع' : 'Ref.'}</th>
                    <th className="px-6 py-4 font-bold">{language === 'ar' ? 'التاريخ' : 'Date'}</th>
                    <th className="px-6 py-4 font-bold">{language === 'ar' ? 'المشروع' : 'Project'}</th>
                    <th className="px-6 py-4 font-bold">{language === 'ar' ? 'الشريك' : 'Partner'}</th>
                    <th className="px-6 py-4 font-bold">{language === 'ar' ? 'النوع' : 'Type'}</th>
                    <th className={`px-6 py-4 font-bold ${language === 'ar' ? 'text-left' : 'text-right'}`}>{language === 'ar' ? 'المبلغ' : 'Amount'}</th>
                    <th className="px-6 py-4 font-bold text-center">{language === 'ar' ? 'إجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan="7" className="p-20 text-center animate-pulse font-bold text-slate-400">{language === 'ar' ? 'جاري التحميل...' : 'Loading...'}</td></tr>
                  ) : transactions.length === 0 ? (
                    <tr><td colSpan="7" className="p-20 text-center text-slate-400 font-bold italic">{language === 'ar' ? 'لا توجد حركات مالية.' : 'No transactions found.'}</td></tr>
                  ) : (
                    transactions.map(t => {
                      const partner = partners.find(p => p.id === t.partner_id);
                      const isPositive = t.type === 'Capital Injection' || t.type === 'Profit Distribution';
                      return (
                        <tr key={t.id} className="hover:bg-slate-50 transition-all group">
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900 text-sm">#{t.id}</span>
                              <span className="text-[9px] font-bold text-amber-600 uppercase tracking-widest">{t.payment_method || 'Cash'}</span>
                              {t.reference_no && <span className="text-[10px] text-slate-400 font-mono">Ref: {t.reference_no}</span>}
                            </div>
                          </td>
                          <td className="px-6 py-4 font-bold text-slate-500 text-xs font-mono">{new Date(t.date).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}</td>
                          <td className="px-6 py-4">
                             <div className="flex flex-col">
                                <span className="text-xs font-bold text-slate-900">{t.project_name}</span>
                                <span className="text-[10px] font-medium text-slate-400">{t.company}</span>
                             </div>
                          </td>
                          <td className="px-6 py-4 font-bold text-slate-700 text-sm">{partner?.name || '---'}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-widest border ${
                              t.type === 'Capital Injection' ? 'bg-emerald-50 text-emerald-800 border-emerald-100' :
                              t.type === 'Withdrawal' ? 'bg-rose-50 text-rose-800 border-rose-100' :
                              'bg-blue-50 text-blue-800 border-blue-100'
                            }`}>
                              {t.type === 'Capital Injection' ? (language === 'ar' ? 'ضخ رأس مال' : 'Deposit') : t.type === 'Withdrawal' ? (language === 'ar' ? 'مسحوبات' : 'Withdrawal') : (language === 'ar' ? 'توزيع أرباح' : 'Distribution')}
                            </span>
                          </td>
                          <td className={`px-6 py-4 font-mono font-bold text-sm ${language === 'ar' ? 'text-left' : 'text-right'} ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                            <div className="flex flex-col">
                              <span>{isPositive ? '+' : '-'}{Number(t.amount).toLocaleString()} <span className="text-[10px] font-sans text-slate-400">LCY</span></span>
                              {t.currency && t.currency !== 'EGP' && (
                                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">
                                  {Number(t.amount_fc).toLocaleString()} {t.currency} @ {t.exchange_rate}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                             <div className="flex items-center justify-center gap-2">
                                <button onClick={() => openEditTrx(t)} className="p-2 text-slate-400 hover:text-blue-600 transition-all">✏️</button>
                                <button onClick={() => handleTrxDelete(t.id)} className="p-2 text-slate-400 hover:text-rose-600 transition-all">🗑️</button>
                             </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* PARTNER MODAL --- */}
      {isPartnerModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all scale-100">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white">
              <div>
                <h3 className="text-xl font-bold text-slate-900">{partnerForm.id ? (language === 'ar' ? 'تعديل بيانات الشريك' : 'Edit Partner Details') : (language === 'ar' ? 'تعريف شريك جديد' : 'Register New Partner')}</h3>
                <p className="text-slate-400 font-medium text-[10px] uppercase tracking-widest mt-1">Equity Registration</p>
              </div>
              <button onClick={() => setIsPartnerModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 transition-colors">✕</button>
            </div>
            
            <form onSubmit={handlePartnerSubmit} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{language === 'ar' ? 'المشروع المرتبط *' : 'Linked Project *'}</label>
                <select 
                  value={partnerForm.project_name} 
                  onChange={(e) => {
                    const proj = projects.find(p => p.name === e.target.value);
                    setPartnerForm({...partnerForm, project_name: e.target.value, company: proj?.company || ''});
                  }} 
                  required 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:border-slate-900 outline-none transition-all appearance-none"
                >
                  <option value="">{language === 'ar' ? '-- اختر المشروع --' : '-- Select Project --'}</option>
                  {projects.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{language === 'ar' ? 'اسم الشريك / الشخص *' : 'Partner Name *'}</label>
                <input type="text" value={partnerForm.name} onChange={(e) => setPartnerForm({...partnerForm, name: e.target.value})} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:border-slate-900 outline-none transition-all" />
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{language === 'ar' ? 'اسم الشركة التابع لها' : 'Company Name'}</label>
                <input type="text" value={partnerForm.company} className="w-full px-4 py-3 bg-slate-100 border border-slate-200 rounded-xl text-sm font-bold text-slate-400 outline-none" readOnly />
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{language === 'ar' ? 'تصنيف الشريك *' : 'Partner Classification *'}</label>
                <div className="grid grid-cols-3 gap-2">
                  <button type="button" onClick={() => setPartnerForm({...partnerForm, partner_type: 'Partner'})} className={`py-2.5 rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all border ${partnerForm.partner_type === 'Partner' ? 'bg-slate-900 border-slate-900 text-white shadow-md' : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-white'}`}>
                    {language === 'ar' ? '🤝 شريك' : 'Partner'}
                  </button>
                  <button type="button" onClick={() => setPartnerForm({...partnerForm, partner_type: 'Admin'})} className={`py-2.5 rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all border ${partnerForm.partner_type === 'Admin' ? 'bg-slate-900 border-slate-900 text-white shadow-md' : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-white'}`}>
                    {language === 'ar' ? '👔 إداري' : 'Admin'}
                  </button>
                  <button type="button" onClick={() => setPartnerForm({...partnerForm, partner_type: 'Both'})} className={`py-2.5 rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all border ${partnerForm.partner_type === 'Both' ? 'bg-slate-900 border-slate-900 text-white shadow-md' : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-white'}`}>
                    {language === 'ar' ? '🌟 كلاهما' : 'Both'}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{language === 'ar' ? 'حصة الاستثمار %' : 'Inv. %'}</label>
                  <input type="number" step="0.01" value={partnerForm.investment_percentage} onChange={(e) => setPartnerForm({...partnerForm, investment_percentage: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:border-slate-900 outline-none transition-all font-mono text-center" />
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{language === 'ar' ? 'حصة الإدارة %' : 'Mgmt. %'}</label>
                  <input type="number" step="0.01" value={partnerForm.management_percentage} onChange={(e) => setPartnerForm({...partnerForm, management_percentage: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:border-slate-900 outline-none transition-all font-mono text-center" />
                </div>
              </div>

              <div className="pt-4">
                <button type="submit" disabled={isSubmitting} className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20 active:scale-[0.98]">
                  {isSubmitting ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (language === 'ar' ? 'حفظ بيانات الشريك' : 'Save Partner Details')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TRANSACTION MODAL --- */}
      {isTrxModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all scale-100">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-emerald-50/50">
              <div>
                <h3 className="text-xl font-bold text-emerald-900">{language === 'ar' ? 'تسجيل حركة مالية' : 'Register Transaction'}</h3>
                <p className="text-emerald-600 font-bold text-[10px] uppercase tracking-widest mt-1">Audit Trail Entry</p>
              </div>
              <button onClick={() => setIsTrxModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white text-emerald-400 transition-colors shadow-sm border border-emerald-100">✕</button>
            </div>
            
            <form onSubmit={handleTrxSubmit} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{language === 'ar' ? 'المشروع المستهدف *' : 'Target Project *'}</label>
                  <select 
                    value={trxForm.project_name} 
                    onChange={(e) => {
                      const proj = projects.find(p => p.name === e.target.value);
                      setTrxForm({...trxForm, project_name: e.target.value, company: proj?.company || ''});
                    }} 
                    required 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:border-emerald-600 outline-none transition-all appearance-none"
                  >
                    <option value="">{language === 'ar' ? '-- اختر المشروع --' : '-- Select Project --'}</option>
                    {projects.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{language === 'ar' ? 'الشريك المستهدف *' : 'Target Partner *'}</label>
                  <select value={trxForm.partner_id} onChange={(e) => setTrxForm({...trxForm, partner_id: e.target.value})} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:border-emerald-600 outline-none transition-all appearance-none">
                    <option value="">{language === 'ar' ? '-- اختر الشريك --' : '-- Select Partner --'}</option>
                    {partners.map(p => <option key={p.id} value={p.id}>{p.name} ({p.partner_type})</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{language === 'ar' ? 'نوع المعاملة *' : 'Transaction Type *'}</label>
                  <select value={trxForm.type} onChange={(e) => setTrxForm({...trxForm, type: e.target.value})} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:border-emerald-600 outline-none transition-all appearance-none">
                    <option value="Capital Injection">{language === 'ar' ? 'ضخ رأس مال (إيداع)' : 'Capital Injection'}</option>
                    <option value="Withdrawal">{language === 'ar' ? 'مسحوبات شخصية (سحب)' : 'Personal Withdrawal'}</option>
                    <option value="Profit Distribution">{language === 'ar' ? 'توزيع أرباح' : 'Profit Distribution'}</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{language === 'ar' ? 'تاريخ الحركة *' : 'Transaction Date *'}</label>
                  <input type="date" value={trxForm.date} onChange={(e) => setTrxForm({...trxForm, date: e.target.value})} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:border-emerald-600 outline-none transition-all" />
                </div>
              </div>

              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-6 shadow-inner">
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">{language === 'ar' ? 'العملة' : 'Currency'}</label>
                    <select name="currency" value={trxForm.currency} onChange={handleTrxFormChange} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 outline-none">
                      <option value="EGP">EGP</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="SAR">SAR</option>
                      <option value="AED">AED</option>
                    </select>
                  </div>
                  <div className="col-span-2 space-y-2">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest ml-1">{language === 'ar' ? 'المبلغ بالعملة الأجنبية' : 'Amount in FC'}</label>
                    <input type="number" step="0.01" name="amount_fc" value={trxForm.amount_fc} onChange={handleTrxFormChange} placeholder="0.00" className="w-full px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 font-mono text-center outline-none" />
                  </div>
                </div>

                {trxForm.currency !== 'EGP' && (
                  <div className="animate-fade-in space-y-2">
                    <label className="block text-[9px] font-bold text-amber-600 uppercase tracking-widest ml-1">{language === 'ar' ? 'سعر الصرف' : 'Ex. Rate'}</label>
                    <input type="number" step="0.0001" name="exchange_rate" value={trxForm.exchange_rate} onChange={handleTrxFormChange} className="w-full px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl text-sm font-bold text-amber-700 font-mono text-center outline-none" />
                  </div>
                )}

                <div className="pt-4 border-t border-slate-200 text-center">
                  <label className="block text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-2">{language === 'ar' ? 'المبلغ النهائي (LCY) *' : 'Final Amount (LCY) *'}</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    name="amount"
                    value={trxForm.amount} 
                    onChange={handleTrxFormChange}
                    required 
                    readOnly={trxForm.currency !== 'EGP'}
                    className={`w-full py-4 bg-transparent font-mono font-bold text-4xl text-center outline-none ${trxForm.currency !== 'EGP' ? 'text-emerald-700' : 'text-emerald-600'}`} 
                  />
                  <p className="text-[9px] text-slate-400 mt-2 font-bold uppercase tracking-widest italic">{language === 'ar' ? 'هذا المبلغ هو الذي سيؤثر على ميزانية المشروع والحسابات' : 'This amount will affect project budget and accounts'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{language === 'ar' ? 'طريقة الدفع' : 'Payment Method'}</label>
                  <select 
                    value={trxForm.payment_method} 
                    onChange={(e) => setTrxForm({...trxForm, payment_method: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:border-emerald-600 outline-none transition-all appearance-none"
                  >
                    <option value="Cash">{language === 'ar' ? 'نقدي (Cash)' : 'Cash'}</option>
                    <option value="Bank Transfer">{language === 'ar' ? 'تحويل بنكي (Bank)' : 'Bank Transfer'}</option>
                    <option value="Cheque">{language === 'ar' ? 'شيك (Cheque)' : 'Cheque'}</option>
                    <option value="Other">{language === 'ar' ? 'أخرى (Other)' : 'Other'}</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{language === 'ar' ? 'رقم المرجع (Ref #)' : 'Reference No.'}</label>
                  <input 
                    type="text" 
                    value={trxForm.reference_no} 
                    onChange={(e) => setTrxForm({...trxForm, reference_no: e.target.value})}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:border-emerald-600 outline-none transition-all font-mono" 
                    placeholder="Ref #"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{language === 'ar' ? 'البيان / الملاحظات *' : 'Description / Notes *'}</label>
                <input type="text" value={trxForm.description} onChange={(e) => setTrxForm({...trxForm, description: e.target.value})} required className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:bg-white focus:border-emerald-600 outline-none transition-all" placeholder={language === 'ar' ? "مثال: دفعة تحت حساب الأرباح" : "e.g. Down payment for profits"} />
              </div>

              <div className="pt-4">
                <button type="submit" disabled={isSubmitting} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-xl font-bold text-sm uppercase tracking-widest shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98] disabled:opacity-50">
                  {isSubmitting ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (trxForm.id ? (language === 'ar' ? '💾 تحديث الحركة' : 'Update Transaction') : (language === 'ar' ? 'اعتماد وترحيل الحركة' : 'Authorize & Post'))}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
