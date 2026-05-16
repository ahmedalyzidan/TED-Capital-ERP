import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

export default function Clients() {
  const { language } = useLanguage();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  // View States
  const [selectedClient, setSelectedClient] = useState(null);
  const [client360, setClient360] = useState(null);
  const [statement, setStatement] = useState([]);
  const [interactions, setInteractions] = useState([]);
  const [activeTab, setActiveTab] = useState('overview'); // overview, statement, payment, crm

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');

  // Interaction Form State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [interactionForm, setInteractionForm] = useState({ type: 'Call', summary: '', next_follow_up: '' });

  // Payment Modal State
  const [paymentForm, setPaymentForm] = useState({
    amount_paid: '', payment_method: 'Cash', reference_no: '', bank_name: '', cheque_date: '', notes: ''
  });

  // Client Modal State
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [clientForm, setClientForm] = useState({ name: '', company_name: '', phone: '', email: '', credit_limit: 0 });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setLoading(true);
    try {
      const response = await api.get('/table/customers?limit=100');
      setClients(response.data.data || []);
    } catch (error) {
      console.error("خطأ في جلب العملاء", error);
    } finally {
      setLoading(false);
    }
  };

  const openClient360 = async (client) => {
    setSelectedClient(client);
    setLoading(true);
    try {
      const [res360, resStatement, resInteractions] = await Promise.all([
        api.get(`/clients/client-360/${client.id}`),
        api.get(`/clients/${client.id}/statement`),
        api.get(`/customers/interactions/${client.id}`)
      ]);
      setClient360(res360.data);
      setStatement(resStatement.data.statement || []);
      setInteractions(resInteractions.data.data || []);
      setActiveTab('overview');
    } catch (error) {
      console.error("تفاصيل الخطأ:", error.response?.data || error);
    } finally {
      setLoading(false);
    }
  };

  const closeClient360 = () => {
    setSelectedClient(null);
    setClient360(null);
    setStatement([]);
    setInteractions([]);
    fetchClients();
  };

  const handlePaymentChange = (e) => setPaymentForm({ ...paymentForm, [e.target.name]: e.target.value });
  const handleClientChange = (e) => setClientForm({ ...clientForm, [e.target.name]: e.target.value });
  const handleInteractionChange = (e) => setInteractionForm({ ...interactionForm, [e.target.name]: e.target.value });

  const submitPayment = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post('/customers/pay-delayed-balance', {
        client_id: selectedClient.id,
        amount_paid: Number(paymentForm.amount_paid),
        payment_method: paymentForm.payment_method,
        reference_no: paymentForm.reference_no,
        bank_name: paymentForm.bank_name,
        cheque_date: paymentForm.cheque_date,
        notes: paymentForm.notes
      });
      alert("تم تسجيل السداد بنجاح!");
      setPaymentForm({ amount_paid: '', payment_method: 'Cash', reference_no: '', bank_name: '', cheque_date: '', notes: '' });
      openClient360(selectedClient);
    } catch (error) {
      alert(error.response?.data?.error || "حدث خطأ أثناء السداد.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitInteraction = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post('/customers/interactions', { ...interactionForm, client_id: selectedClient.id });
      setInteractionForm({ type: 'Call', summary: '', next_follow_up: '' });
      const res = await api.get(`/customers/interactions/${selectedClient.id}`);
      setInteractions(res.data.data || []);
    } catch (error) {
      alert("حدث خطأ أثناء تسجيل التفاعل.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitNewClient = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post('/add/customers', { ...clientForm, credit_limit: Number(clientForm.credit_limit) });
      setIsClientModalOpen(false);
      setClientForm({ name: '', company_name: '', phone: '', email: '', credit_limit: 0 });
      fetchClients();
    } catch (error) {
      alert("حدث خطأ أثناء حفظ العميل.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.company_name && c.company_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // ================= RENDER FULL 360 DASHBOARD =================
  if (selectedClient && client360) {
    const { profile, stats, aging } = client360;
    return (
      <div className="min-h-screen bg-[#f8fafc]/50 pb-20 animate-fade-in" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        {/* Header Section --- */}
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-[1600px] mx-auto px-10 py-10">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-10">
              <div className="flex items-center gap-8">
                <button
                  onClick={closeClient360}
                  className="w-14 h-14 bg-white text-slate-400 border border-slate-200 rounded-2xl flex items-center justify-center text-2xl shadow-sm hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all active:scale-90"
                >
                  {language === 'ar' ? '→' : '←'}
                </button>
                <div>
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-violet-50 text-violet-600 text-[10px] font-black uppercase tracking-widest rounded-lg border border-violet-100">
                      Entity 360° Intelligence
                    </span>
                  </div>
                  <h1 className="text-4xl font-black text-slate-900 tracking-tight mt-2">{profile.name}</h1>
                  <div className="text-slate-400 font-bold text-sm mt-2 uppercase tracking-widest flex items-center gap-6">
                    <span className="flex items-center gap-2"><span className="text-lg">🏢</span> {profile.company_name || (language === 'ar' ? 'عميل فردي' : 'Individual')}</span>
                    <span className="flex items-center gap-2"><span className="text-lg">📞</span> {profile.phone}</span>
                  </div>
                </div>
              </div>

              <div className="flex bg-white p-2 rounded-[2rem] border border-slate-200 shadow-xl shadow-slate-200/50">
                {[
                  { id: 'overview', label: (language === 'ar' ? 'التحليل المالي' : 'Financial Intelligence'), icon: '📊' },
                  { id: 'statement', label: (language === 'ar' ? 'كشف الحساب' : 'Ledger Statement'), icon: '📜' },
                  { id: 'crm', label: (language === 'ar' ? 'سجل المتابعة' : 'CRM Insights'), icon: '📞' },
                  { id: 'payment', label: (language === 'ar' ? 'تسجيل سداد' : 'Post Payment'), icon: '💰' },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-8 py-3.5 rounded-[1.5rem] text-[10px] uppercase font-black tracking-[0.1em] transition-all flex items-center gap-3 ${activeTab === tab.id
                        ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/20'
                        : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'
                      }`}
                  >
                    <span className="text-lg">{tab.icon}</span> {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-[1600px] mx-auto px-10 py-12">
          {/* TAB: Overview --- */}
          {activeTab === 'overview' && (
            <div className="space-y-12 animate-fade-in">
              {/* Stats Cards --- */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                <div className="bg-white border border-slate-200 p-10 rounded-[2.5rem] shadow-xl shadow-slate-200/50 relative overflow-hidden group hover:-translate-y-2 transition-all duration-500">
                  <div className="absolute top-0 right-0 p-10 opacity-5 text-8xl pointer-events-none group-hover:scale-125 transition-transform duration-700">📈</div>
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">{language === 'ar' ? 'إجمالي المبيعات' : 'Lifetime Revenue'}</p>
                  <h3 className="text-5xl font-black text-slate-900 font-mono tracking-tighter">{Number(stats.total_sales).toLocaleString()}</h3>
                  <div className="mt-6 flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-slate-300 animate-pulse"></div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">All-time Billing History</span>
                  </div>
                </div>

                <div className="bg-emerald-50 border border-emerald-100 p-10 rounded-[2.5rem] shadow-xl shadow-emerald-200/20 relative overflow-hidden group hover:-translate-y-2 transition-all duration-500">
                  <div className="absolute top-0 right-0 p-10 opacity-10 text-8xl pointer-events-none group-hover:scale-125 transition-transform duration-700 text-emerald-500">✅</div>
                  <p className="text-[11px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-4">{language === 'ar' ? 'المحصل الفعلي' : 'Total Recovered'}</p>
                  <h3 className="text-5xl font-black text-emerald-700 font-mono tracking-tighter">+{Number(stats.total_paid).toLocaleString()}</h3>
                  <div className="mt-6 flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50"></div>
                    <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest italic">Verified Cash Receipts</span>
                  </div>
                </div>

                <div className="bg-slate-900 p-10 rounded-[2.5rem] shadow-2xl shadow-slate-900/30 relative overflow-hidden group hover:-translate-y-2 transition-all duration-500">
                  <div className="absolute top-0 right-0 p-10 opacity-20 text-8xl pointer-events-none group-hover:scale-125 transition-transform duration-700 text-amber-500">⚠️</div>
                  <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">{language === 'ar' ? 'المديونية الحالية' : 'Outstanding Balance'}</p>
                  <h3 className="text-5xl font-black text-white font-mono tracking-tighter">{Number(stats.total_due).toLocaleString()}</h3>
                  <div className="mt-6 flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50"></div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Actionable Collection Debt</span>
                  </div>
                </div>
              </div>

              {/* Accounts Segmentation --- */}
              <div className="bg-white p-12 rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-200/30">
                <div className="flex items-center gap-6 mb-12">
                  <div className="w-2 h-10 bg-violet-600 rounded-full shadow-lg shadow-violet-600/50"></div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">{language === 'ar' ? 'تفصيل أرصدة القطاعات' : 'Multi-Module Financial Exposure'}</h3>
                    <p className="text-slate-400 text-[11px] font-black uppercase tracking-[0.2em] mt-1">Granular breakdown by business unit</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                  {[
                    { label: (language === 'ar' ? 'المقاولات والمشاريع' : 'Projects & Construction'), val: stats.segmented.inventory, color: 'violet', icon: '🏗️', link: 'Projects' },
                    { label: (language === 'ar' ? 'التطوير العقاري' : 'Real Estate Portfolio'), val: stats.segmented.real_estate, color: 'amber', icon: '🏢', link: 'RealEstate' },
                    { label: (language === 'ar' ? 'المبيعات العامة' : 'General Ledger Trading'), val: stats.segmented.finance, color: 'emerald', icon: '💹', link: 'General' }
                  ].map((seg, i) => (
                    <div key={i} className="p-10 rounded-3xl bg-slate-50 border border-slate-100 hover:border-violet-200 hover:bg-white transition-all duration-300 group shadow-sm hover:shadow-xl">
                      <div className="flex justify-between items-start mb-6">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{seg.label}</p>
                        <span className="text-2xl">{seg.icon}</span>
                      </div>
                      <p className={`text-4xl font-black font-mono tracking-tighter ${seg.val > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {Number(seg.val).toLocaleString()}
                      </p>
                      <a href={`/clients/${selectedClient.id}/soa?module=${seg.link}`} target="_blank" className="mt-8 py-3 w-full bg-white border border-slate-200 rounded-xl text-[10px] font-black text-slate-400 hover:text-white hover:bg-slate-900 hover:border-slate-900 flex items-center justify-center gap-3 uppercase tracking-widest transition-all">
                        {language === 'ar' ? 'تحميل كشف قطاعي' : 'Download Sector Statement'} <span className="text-xs">↗</span>
                      </a>
                    </div>
                  ))}
                </div>
              </div>

              {/* Aging Report --- */}
              <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-xl shadow-slate-200/30">
                <div className="px-10 py-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                  <span className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em]">{language === 'ar' ? 'تحليل أعمار الديون' : 'A/R Debt Aging Analysis'}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Actively Monitoring Collection Gap</span>
                  </div>
                </div>
                <div className="p-12 grid grid-cols-2 md:grid-cols-5 gap-12">
                  {[
                    { label: (language === 'ar' ? 'غير مستحق' : 'Not Due'), val: aging.not_due, color: 'bg-emerald-500' },
                    { label: (language === 'ar' ? '1-30 يوم' : '1-30 Days'), val: aging.days_1_30, color: 'bg-amber-500' },
                    { label: (language === 'ar' ? '31-60 يوم' : '31-60 Days'), val: aging.days_31_60, color: 'bg-orange-500' },
                    { label: (language === 'ar' ? '61-90 يوم' : '61-90 Days'), val: aging.days_61_90, color: 'bg-rose-500' },
                    { label: (language === 'ar' ? '+90 يوم' : 'Critical (+90)'), val: aging.days_over_90, color: 'bg-slate-900' },
                  ].map((item, idx) => (
                    <div key={idx} className="space-y-5 group">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] group-hover:text-slate-900 transition-colors">{item.label}</p>
                      <p className="text-3xl font-black text-slate-900 font-mono tracking-tighter">{Number(item.val).toLocaleString()}</p>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                        <div className={`h-full ${item.color} transition-all duration-1000 shadow-sm`} style={{ width: stats.total_due > 0 ? `${Math.min(100, (item.val / stats.total_due) * 100)}%` : '0%' }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB: Statement --- */}
          {activeTab === 'statement' && (
            <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-slate-200/50 animate-fade-in">
              <div className="p-12 border-b border-slate-100 flex justify-between items-center bg-white">
                <div>
                  <h3 className="text-3xl font-black text-slate-900 tracking-tight">{language === 'ar' ? 'كشف الحساب الاستراتيجي' : 'Strategic Account Statement'}</h3>
                  <p className="text-slate-400 font-bold text-[11px] uppercase tracking-[0.2em] mt-2">Authenticated transaction history & equity flow</p>
                </div>
                <button
                  onClick={() => window.print()}
                  className="bg-slate-900 hover:bg-slate-800 text-white px-10 py-5 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all shadow-2xl shadow-slate-900/30 active:scale-95 flex items-center gap-4"
                >
                  <span className="text-xl">🖨️</span> {language === 'ar' ? 'تحميل بصيغة PDF' : 'Export Full Statement'}
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className={`w-full ${language === 'ar' ? 'text-right' : 'text-left'} whitespace-nowrap`}>
                  <thead>
                    <tr className="bg-slate-900 text-white text-[10px] uppercase tracking-[0.2em] font-black">
                      <th className="px-10 py-6">{language === 'ar' ? 'التاريخ' : 'Effective Date'}</th>
                      <th className="px-10 py-6">{language === 'ar' ? 'البيان / الوصف' : 'Detailed Transaction Description'}</th>
                      <th className="px-10 py-6 text-center">{language === 'ar' ? 'مدين (+)' : 'Debit (+)'}</th>
                      <th className="px-10 py-6 text-center">{language === 'ar' ? 'دائن (-)' : 'Credit (-)'}</th>
                      <th className={`px-10 py-6 ${language === 'ar' ? 'text-left' : 'text-right'} bg-slate-800`}>{language === 'ar' ? 'الرصيد' : 'Running Balance'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {statement.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 transition-all group">
                        <td className="px-10 py-6 font-black text-slate-400 text-xs tracking-tighter">{new Date(row.date).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}</td>
                        <td className="px-10 py-6">
                          <span className="font-black text-slate-900 text-sm font-sans tracking-tight">{row.description}</span>
                        </td>
                        <td className="px-10 py-6 font-black text-rose-600 text-lg text-center">
                          {Number(row.debit) > 0 ? Number(row.debit).toLocaleString() : '-'}
                        </td>
                        <td className="px-10 py-6 font-black text-emerald-600 text-lg text-center">
                          {Number(row.credit) > 0 ? Number(row.credit).toLocaleString() : '-'}
                        </td>
                        <td className={`px-10 py-6 font-black text-slate-900 text-xl ${language === 'ar' ? 'text-left' : 'text-right'} bg-slate-50/30`}>
                          {Number(row.running_balance).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* CRM & Payment Tabs --- */}
          {activeTab === 'crm' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 animate-fade-in">
              <div className="lg:col-span-2 space-y-8">
                <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-xl shadow-slate-200/30">
                  <div className="p-10 border-b border-slate-100 bg-white">
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">{language === 'ar' ? 'سجل التفاعلات الذكي' : 'CRM Interaction Intelligence'}</h3>
                    <p className="text-slate-400 text-[11px] font-black uppercase tracking-[0.2em] mt-2">Comprehensive audit of customer touchpoints</p>
                  </div>
                  <div className="p-10 space-y-10">
                    {interactions.length === 0 ? (
                      <div className="p-24 text-center text-slate-300 font-black italic uppercase tracking-widest">{language === 'ar' ? 'لا يوجد سجل تواصل حتى الآن.' : 'No data-points registered.'}</div>
                    ) : (
                      interactions.map((trx, idx) => (
                        <div key={idx} className="flex gap-10 pb-10 border-b border-slate-100 last:border-0 last:pb-0 group">
                          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-3xl shadow-sm border border-slate-100 group-hover:bg-slate-900 group-hover:text-white group-hover:shadow-xl group-hover:shadow-slate-900/20 transition-all duration-500 transform group-hover:-rotate-3">
                            {trx.type === 'Call' ? '📞' : trx.type === 'Meeting' ? '🤝' : '📧'}
                          </div>
                          <div className="flex-1 space-y-3">
                            <div className="flex justify-between items-center">
                              <span className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">{trx.type} Interaction</span>
                              <span className="text-[10px] font-black text-slate-400 font-mono bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">{new Date(trx.created_at).toLocaleString()}</span>
                            </div>
                            <p className="text-base font-bold text-slate-600 leading-relaxed font-sans">{trx.summary}</p>
                            {trx.next_follow_up && (
                              <div className="mt-6 flex items-center gap-3">
                                <div className="px-4 py-2 bg-amber-50 text-amber-600 text-[10px] font-black uppercase tracking-[0.1em] rounded-xl border border-amber-100 flex items-center gap-3 shadow-sm">
                                  <span className="text-lg">⏰</span> {language === 'ar' ? 'المتابعة القادمة:' : 'Strategic Follow-up:'} {new Date(trx.next_follow_up).toLocaleDateString()}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-2xl shadow-slate-200/50 h-fit sticky top-10 border-t-8 border-t-violet-600">
                <div className="mb-10 text-center">
                  <div className="w-20 h-20 bg-violet-50 text-violet-600 rounded-3xl flex items-center justify-center text-3xl mx-auto shadow-sm border border-violet-100 mb-6">✍️</div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">{language === 'ar' ? 'تسجيل تواصل جديد' : 'Log Interaction'}</h3>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-2 italic">Institutional memory capture</p>
                </div>
                <form onSubmit={submitInteraction} className="space-y-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">{language === 'ar' ? 'نوع التواصل' : 'Engagement Type'}</label>
                    <select name="type" value={interactionForm.type} onChange={handleInteractionChange} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black text-slate-900 focus:bg-white focus:border-violet-600 transition-all outline-none appearance-none shadow-sm cursor-pointer">
                      <option value="Call">{language === 'ar' ? 'مكالمة هاتفية' : 'Voice Call'}</option>
                      <option value="Meeting">{language === 'ar' ? 'اجتماع عمل' : 'Face-to-Face Meeting'}</option>
                      <option value="Email">{language === 'ar' ? 'بريد إلكتروني' : 'Digital Correspondence'}</option>
                      <option value="Visit">{language === 'ar' ? 'زيارة ميدانية' : 'Strategic Site Visit'}</option>
                    </select>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">{language === 'ar' ? 'ملخص التواصل' : 'Minutes of Meeting'}</label>
                    <textarea name="summary" value={interactionForm.summary} onChange={handleInteractionChange} required className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:bg-white focus:border-violet-600 transition-all outline-none min-h-[160px] shadow-sm leading-relaxed" placeholder={language === 'ar' ? 'ماذا دار في التواصل؟' : 'Enter key takeaways...'} />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">{language === 'ar' ? 'تاريخ المتابعة القادمة' : 'Pipeline Date'}</label>
                    <input type="date" name="next_follow_up" value={interactionForm.next_follow_up} onChange={handleInteractionChange} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black text-slate-900 focus:bg-white focus:border-violet-600 transition-all outline-none shadow-sm" />
                  </div>
                  <button type="submit" disabled={isSubmitting} className="w-full bg-violet-600 text-white py-6 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-violet-700 transition-all shadow-2xl shadow-violet-600/30 active:scale-95 transform">
                    {isSubmitting ? (language === 'ar' ? 'جاري الحفظ...' : 'Capturing...') : (language === 'ar' ? 'حفظ المذكرة 🚀' : 'Authorize Log entry 🚀')}
                  </button>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'payment' && (
            <div className="bg-white border border-slate-200 rounded-[3rem] p-12 shadow-2xl shadow-slate-200/50 max-w-3xl mx-auto animate-fade-in border-t-8 border-t-emerald-600">
              <div className="text-center mb-12">
                <div className="w-24 h-24 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center text-4xl mx-auto shadow-sm border border-emerald-100 mb-6">💰</div>
                <h3 className="text-3xl font-black text-slate-900 tracking-tight">{language === 'ar' ? 'تسجيل دفعة نقدية' : 'Institutional Payment Capture'}</h3>
                <p className="text-slate-400 text-[11px] font-black uppercase tracking-[0.2em] mt-2">Direct treasury credit & automatic ledger reconciliation</p>
              </div>

              <form onSubmit={submitPayment} className="space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">{language === 'ar' ? 'المبلغ المسدد *' : 'Settlement Amount *'}</label>
                    <input type="number" name="amount_paid" value={paymentForm.amount_paid} onChange={handlePaymentChange} required className="w-full px-8 py-6 bg-slate-50 border border-slate-200 rounded-2xl text-3xl font-black text-slate-900 font-mono focus:bg-white focus:border-emerald-600 transition-all outline-none text-center shadow-inner" placeholder="0.00" />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">{language === 'ar' ? 'قناة التحصيل' : 'Treasury Channel'}</label>
                    <select name="payment_method" value={paymentForm.payment_method} onChange={handlePaymentChange} className="w-full px-6 py-6 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black text-slate-900 focus:bg-white focus:border-emerald-600 transition-all outline-none appearance-none h-full shadow-sm cursor-pointer">
                      <option value="Cash">{language === 'ar' ? 'نقدي (Cash)' : 'Cash Vault'}</option>
                      <option value="Bank Transfer">{language === 'ar' ? 'تحويل بنكي (Bank)' : 'Direct Bank Inward'}</option>
                      <option value="Cheque">{language === 'ar' ? 'شيك بنكي (Cheque)' : 'Cheque Settlement'}</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">{language === 'ar' ? 'المرجع البنكي / رقم الشيك' : 'Reference / Token ID'}</label>
                    <input type="text" name="reference_no" value={paymentForm.reference_no} onChange={handlePaymentChange} className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black text-slate-900 font-mono focus:bg-white focus:border-emerald-600 transition-all outline-none shadow-sm" placeholder="TXN-0000" />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">{language === 'ar' ? 'تاريخ الاستحقاق/التنفيذ' : 'Value Date'}</label>
                    <input type="date" name="cheque_date" value={paymentForm.cheque_date} onChange={handlePaymentChange} className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black text-slate-900 focus:bg-white focus:border-emerald-600 transition-all outline-none shadow-sm" />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">{language === 'ar' ? 'ملاحظات المعالجة' : 'Audit Trail Memo'}</label>
                  <textarea name="notes" value={paymentForm.notes} onChange={handlePaymentChange} className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:bg-white focus:border-emerald-600 transition-all outline-none min-h-[120px] shadow-sm leading-relaxed" placeholder={language === 'ar' ? 'بيان الدفعة...' : 'Enter payment context...'} />
                </div>

                <button type="submit" disabled={isSubmitting} className="w-full bg-emerald-600 text-white py-6 rounded-3xl font-black text-base uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-2xl shadow-emerald-500/30 active:scale-95 transform">
                  {isSubmitting ? (language === 'ar' ? 'جاري المعالجة...' : 'Securing Data...') : (language === 'ar' ? 'اعتماد وترحيل الدفعة ✅' : 'Authorize & Reconcile Payment ✅')}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ================= MAIN CLIENT LIST VIEW =================
  return (
    <div className="min-h-screen bg-[#f8fafc]/50 pb-20 animate-fade-in" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Header Section --- */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-[1600px] mx-auto px-10 py-10">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-10">
            <div className="flex items-center gap-8">
              <div className="w-20 h-20 bg-slate-900 rounded-3xl flex items-center justify-center text-4xl shadow-2xl shadow-slate-900/20 text-white transform hover:rotate-6 transition-all duration-500">
                👥
              </div>
              <div>
                <h1 className="text-4xl font-black text-slate-900 tracking-tight">
                  {language === 'ar' ? 'إدارة علاقات العملاء والشركاء' : 'Entity Master & CRM Hub'}
                </h1>
                <p className="text-slate-400 font-bold text-base mt-2 uppercase tracking-[0.05em]">
                  {language === 'ar' ? 'المركز الاستراتيجي لمتابعة مديونيات العملاء وتفاعلاتهم' : 'Strategic Partnership Intelligence and Receivable Hub'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsClientModalOpen(true)}
              className="bg-violet-600 hover:bg-violet-700 text-white px-10 py-5 rounded-[1.5rem] font-black text-[11px] uppercase tracking-widest transition-all shadow-2xl shadow-violet-600/30 active:scale-95 flex items-center gap-4 transform hover:-translate-y-1"
            >
              <span className="text-xl">+</span> {language === 'ar' ? 'إضافة شريك جديد' : 'Register New Entity'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-10 py-12 space-y-12">
        {/* Global Search & Filter --- */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/40 flex items-center gap-6 group focus-within:ring-4 focus-within:ring-violet-600/5 transition-all">
          <span className="text-3xl mr-2 opacity-30 group-focus-within:opacity-100 group-focus-within:text-violet-600 transition-all duration-500">🔍</span>
          <input
            type="text"
            placeholder={language === 'ar' ? 'ابحث عن عميل بالاسم أو رقم الهاتف أو اسم الشركة...' : 'Intelligence search: name, phone, or company...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full py-4 bg-transparent text-xl font-black text-slate-900 outline-none placeholder:text-slate-300 tracking-tight"
          />
        </div>

        {/* Stats Dashboard --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {[
            { label: (language === 'ar' ? 'إجمالي الشركاء' : 'Entity Base'), val: clients.length, sub: (language === 'ar' ? 'عملاء مسجلين بنجاح' : 'Registered Entities'), color: 'slate' },
            { label: (language === 'ar' ? 'علاقات نشطة' : 'Active Partnerships'), val: clients.filter(c => c.status === 'Active' || !c.status).length, sub: (language === 'ar' ? 'تفاعلات تجارية جارية' : 'Ongoing Relationships'), color: 'emerald' },
            { label: (language === 'ar' ? 'خط الائتمان الكلي' : 'Total Exposure'), val: clients.reduce((sum, c) => sum + Number(c.credit_limit || 0), 0).toLocaleString(), sub: (language === 'ar' ? 'القدرة الائتمانية' : 'Approved Liquidity'), color: 'violet' },
            { label: (language === 'ar' ? 'حالة المخاطر' : 'Risk Profile'), val: clients.filter(c => c.status === 'Inactive').length, sub: (language === 'ar' ? 'تحت الملاحظة' : 'Accounts Under Review'), color: 'rose', dark: true }
          ].map((stat, i) => (
            <div key={i} className={`${stat.dark ? 'bg-slate-900 text-white shadow-2xl shadow-slate-900/20' : 'bg-white border border-slate-200 text-slate-900 shadow-xl shadow-slate-200/50'} p-10 rounded-[2.5rem] group relative overflow-hidden transition-all hover:-translate-y-2 duration-500`}>
              <div className="absolute top-0 right-0 p-8 opacity-5 text-7xl pointer-events-none group-hover:scale-125 transition-transform duration-700">🏢</div>
              <p className={`text-[10px] font-black ${stat.dark ? 'text-slate-500' : 'text-slate-400'} uppercase tracking-[0.2em] mb-4`}>{stat.label}</p>
              <h3 className={`text-5xl font-black font-mono tracking-tighter ${!stat.dark && stat.color === 'emerald' ? 'text-emerald-600' : !stat.dark && stat.color === 'violet' ? 'text-violet-600' : ''}`}>{stat.val}</h3>
              <p className={`text-[11px] font-black ${stat.dark ? 'text-slate-600' : 'text-slate-400'} mt-3 uppercase tracking-widest italic`}>{stat.sub}</p>
            </div>
          ))}
        </div>

        {/* Client Data Table --- */}
        <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-slate-200/50 animate-fade-in">
          <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-white">
            <div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">{language === 'ar' ? 'دليل الشركاء الاستراتيجيين' : 'Strategic Entity Directory'}</h3>
              <p className="text-slate-400 font-bold text-[11px] uppercase tracking-[0.2em] mt-2">Comprehensive lifecycle management of institutional relationships</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className={`w-full ${language === 'ar' ? 'text-right' : 'text-left'} whitespace-nowrap`}>
              <thead>
                <tr className="bg-slate-900 text-white text-[10px] uppercase tracking-[0.2em] font-black">
                  <th className="px-10 py-6">{language === 'ar' ? 'هوية الشريك' : 'Entity Intelligence Profile'}</th>
                  <th className="px-10 py-6">{language === 'ar' ? 'النشاط / الصناعة' : 'Company / Strategic Activity'}</th>
                  <th className="px-10 py-6 text-center">{language === 'ar' ? 'الحد الائتماني' : 'Credit Facility'}</th>
                  <th className="px-10 py-6 text-center">{language === 'ar' ? 'الحالة' : 'Operational Status'}</th>
                  <th className="px-10 py-6 text-center bg-slate-800">{language === 'ar' ? 'الإجراءات' : 'Command Center'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan="5" className="p-32 text-center text-slate-300 font-black animate-pulse text-xl uppercase tracking-[0.3em] italic">Accessing Master Database...</td></tr>
                ) : filteredClients.length === 0 ? (
                  <tr><td colSpan="5" className="p-32 text-center text-slate-400 font-black italic uppercase tracking-widest">No Intelligence Matching the Query.</td></tr>
                ) : (
                  filteredClients.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50 transition-all group">
                      <td className="px-10 py-7">
                        <div className="flex items-center gap-6">
                          <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-black text-2xl shadow-xl shadow-slate-900/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                            {c.name ? c.name.charAt(0) : '?'}
                          </div>
                          <div>
                            <p className="font-black text-slate-900 text-xl tracking-tight">{c.name}</p>
                            <p className="text-[11px] font-black text-slate-400 font-mono mt-1 bg-slate-50 px-2 py-0.5 rounded border border-slate-100 w-fit">{c.phone || '---'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-10 py-7">
                        <p className="font-black text-slate-700 text-base font-sans tracking-tight">{c.company_name || (language === 'ar' ? 'عميل فردي' : 'Individual Client')}</p>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] mt-2 italic flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span> Registered since {c.customer_since ? new Date(c.customer_since).getFullYear() : '---'}
                        </p>
                      </td>
                      <td className="px-10 py-7 text-center">
                        <span className="font-mono font-black text-slate-900 text-base bg-slate-100 px-5 py-2 rounded-xl border border-slate-200 shadow-sm">{Number(c.credit_limit || 0).toLocaleString()}</span>
                      </td>
                      <td className="px-10 py-7 text-center">
                        <span className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-sm ${c.status === 'Active' || !c.status ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                          {c.status || 'Active'}
                        </span>
                      </td>
                      <td className="px-10 py-7 text-center bg-slate-50/30">
                        <button
                          onClick={() => openClient360(c)}
                          className="bg-slate-900 hover:bg-violet-600 text-white px-8 py-3.5 rounded-[1.2rem] font-black text-[11px] uppercase tracking-widest transition-all shadow-xl shadow-slate-900/20 active:scale-90 transform group-hover:-translate-y-1"
                        >
                          {language === 'ar' ? 'الملف 360°' : 'Open Entity 360°'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL: ADD CLIENT --- */}
      {isClientModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-fade-in">
          <div className="bg-white w-full max-w-3xl rounded-[3rem] shadow-2xl border border-slate-200 overflow-hidden transform transition-all duration-500 scale-100 border-t-8 border-t-violet-600">
            <div className="px-12 py-10 border-b border-slate-100 flex justify-between items-center bg-white">
              <div>
                <h3 className="text-3xl font-black text-slate-900 tracking-tight">{language === 'ar' ? 'إضافة شريك عمل جديد' : 'New Strategic Entity Registry'}</h3>
                <p className="text-slate-400 font-bold text-[11px] uppercase tracking-[0.2em] mt-2 italic">Institutional relationship baseline capture</p>
              </div>
              <button onClick={() => setIsClientModalOpen(false)} className="w-14 h-14 flex items-center justify-center rounded-2xl bg-slate-50 text-slate-400 hover:bg-slate-900 hover:text-white transition-all shadow-sm border border-slate-100">✕</button>
            </div>

            <form onSubmit={submitNewClient} className="p-12 space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="col-span-1 md:col-span-2 space-y-3">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">{language === 'ar' ? 'الاسم القانوني بالكامل *' : 'Full Legal Entity Name *'}</label>
                  <input type="text" name="name" value={clientForm.name} onChange={handleClientChange} required className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-base font-black text-slate-900 focus:bg-white focus:border-violet-600 transition-all outline-none shadow-inner" />
                </div>
                <div className="col-span-1 md:col-span-2 space-y-3">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">{language === 'ar' ? 'اسم المنشأة / الشركة' : 'Operating Company Name'}</label>
                  <input type="text" name="company_name" value={clientForm.company_name} onChange={handleClientChange} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-base font-bold text-slate-900 focus:bg-white focus:border-violet-600 transition-all outline-none shadow-sm" />
                </div>
                <div className="space-y-3">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">{language === 'ar' ? 'رقم التواصل المعتمد' : 'Primary Contact Phone'}</label>
                  <input type="text" name="phone" value={clientForm.phone} onChange={handleClientChange} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black text-slate-900 font-mono focus:bg-white focus:border-violet-600 transition-all outline-none shadow-sm" />
                </div>
                <div className="space-y-3">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">{language === 'ar' ? 'عنوان المراسلات الرقمية' : 'Primary Email Correspondence'}</label>
                  <input type="email" name="email" value={clientForm.email} onChange={handleClientChange} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-900 focus:bg-white focus:border-violet-600 transition-all outline-none shadow-sm" />
                </div>
                <div className="col-span-1 md:col-span-2 space-y-3">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">{language === 'ar' ? 'الحد الائتماني المعتمد (Credit Limit)' : 'Authorized Credit Facility'}</label>
                  <input type="number" name="credit_limit" value={clientForm.credit_limit} onChange={handleClientChange} className="w-full px-10 py-6 bg-slate-50 border border-slate-200 rounded-2xl text-3xl font-black text-slate-900 font-mono focus:bg-white focus:border-violet-600 transition-all outline-none text-center shadow-inner" />
                </div>
              </div>

              <button type="submit" disabled={isSubmitting} className="w-full bg-violet-600 text-white py-6 rounded-3xl font-black text-base uppercase tracking-widest shadow-2xl shadow-violet-600/30 hover:bg-violet-700 transition-all active:scale-95 disabled:opacity-50 transform">
                {isSubmitting ? (language === 'ar' ? 'جاري الحفظ...' : 'Securing Data Hub...') : (language === 'ar' ? 'اعتماد إضافة الشريك 🚀' : 'Authorize Strategic Entity Creation 🚀')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}