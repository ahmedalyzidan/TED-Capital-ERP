import React, { useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import Subcontractor360 from '../components/Subcontractor360';
import SubcontractorAnalytics from '../components/SubcontractorAnalytics';

export default function Subcontractors() {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState('subs');
  const [loading, setLoading] = useState(false);
  const [boqList, setBoqList] = useState([]);
  const [subcontractors, setSubcontractors] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [projects, setProjects] = useState([]);
  
  // Modals & Analytics States
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [selectedSubId, setSelectedSubId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [globalStats, setGlobalStats] = useState(null);

  const [subForm, setSubForm] = useState({
    name: '',
    phone: '',
    project_id: '',
    company: '',
    tax_id: '',
    license_number: '',
    insurance_expiry: ''
  });

  const t = {
    ar: {
      title: "المقاولات والمقايسات",
      subtitle: "إدارة البنود، عقود مقاولي الباطن، واعتماد المستخلصات الهندسية",
      tabs: {
        subs: "مقاولو الباطن",
        boq: "جدول المقايسة (BOQ)",
        invoices: "المستخلصات",
        analytics: "الذكاء المالي"
      },
      boqTab: {
        title: "تتبع بنود المقايسة والكميات المنفذة",
        item: "بند الأعمال",
        project: "المشروع",
        est: "المقدرة (Est)",
        assigned: "المسندة (Assigned)",
        actual: "المنفذة (Actual)",
        remaining: "المتبقي",
        loading: "جاري تحميل بيانات المقايسة..."
      },
      subsTab: {
        title: "قاعدة بيانات مقاولي الباطن",
        add: "إضافة مقاول جديد",
        name: "المقاول / الشركة",
        contact: "معلومات الاتصال",
        currentProj: "المشروع الحالي",
        totalInvoices: "إجمالي المستخلصات",
        loading: "جاري تحميل بيانات الشركاء..."
      },
      invoicesTab: {
        title: "مراجعة واعتماد المستخلصات الجارية",
        ref: "المرجع / التاريخ",
        desc: "البيان الهندسي",
        qty: "الكمية المنجزة",
        net: "الصافي المالي",
        status: "الحالة / الإجراء",
        approved: "اعتماد مالي",
        pending: "قيد المراجعة",
        approveBtn: "اعتماد الآن 🚀",
        loading: "جاري تحميل المستخلصات..."
      },
      modalSub: {
        title: "تسجيل مقاول جديد",
        name: "اسم المقاول / الاسم التجاري",
        phone: "رقم الهاتف الجوال",
        project: "المشروع المسند",
        company: "جهة العمل / الشركة",
        save: "حفظ بيانات المقاول"
      },
      alerts: {
        success: "تم تسجيل مقاول الباطن بنجاح!",
        confirmApprove: "هل أنت متأكد من مراجعة واعتماد هذا المستخلص؟",
        updateSuccess: "تم التحديث بنجاح. الحالة الجديدة: "
      }
    },
    en: {
      title: "Contracts & BOQ Management",
      subtitle: "Manage line items, subcontractor contracts, and engineering payment certificates",
      tabs: {
        subs: "Subcontractors",
        boq: "Bill of Quantities (BOQ)",
        invoices: "Payment Certificates",
        analytics: "Financial Intelligence"
      },
      boqTab: {
        title: "Track BOQ Items and Executed Quantities",
        item: "Work Item",
        project: "Project",
        est: "Estimated (Est)",
        assigned: "Assigned (Assigned)",
        actual: "Executed (Actual)",
        remaining: "Remaining",
        loading: "Loading BOQ intelligence..."
      },
      subsTab: {
        title: "Subcontractor Intelligence Database",
        add: "Onboard New Partner",
        name: "Contractor / Entity",
        contact: "Communication",
        currentProj: "Active Project",
        totalInvoices: "Financial Exposure",
        loading: "Syncing partner data..."
      },
      invoicesTab: {
        title: "Review & Authorize Payment Certificates",
        ref: "Reference / Date",
        desc: "Engineering Statement",
        qty: "Certified Qty",
        net: "Net Payable",
        status: "Status / Action",
        approved: "Approved",
        pending: "Pending Review",
        approveBtn: "Approve Now 🚀",
        loading: "Loading Invoices..."
      },
      modalSub: {
        title: "Register New Subcontractor",
        name: "Contractor Name / Trade Name",
        phone: "Mobile Phone Number",
        project: "Assigned Project",
        company: "Employer / Company",
        save: "Save Contractor Data"
      },
      alerts: {
        success: "Subcontractor registered successfully!",
        confirmApprove: "Are you sure you want to review and approve this certificate?",
        updateSuccess: "Update successful. New status: "
      }
    }
  };
  const cur = t[language === 'en' ? 'en' : 'ar'];

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchGlobalStats = async () => {
    try {
      const res = await api.get('/subcontractors/global/stats');
      setGlobalStats(res.data.stats);
    } catch (err) { console.error(err); }
  };

  const fetchData = async () => {
    setLoading(true);
    fetchGlobalStats();
    try {
      if (activeTab === 'boq') {
        const res = await api.get('/table/boq?limit=100');
        setBoqList(res.data.data || []);
      } else if (activeTab === 'subs') {
        const res = await api.get('/table/subcontractors?limit=100');
        setSubcontractors(res.data.data || []);
      } else if (activeTab === 'invoices') {
        const res = await api.get('/table/subcontractor_invoices?limit=100');
        setInvoices(res.data.data || []);
      }

      const projRes = await api.get('/dynamic/table/projects?limit=500');
      setProjects(projRes.data.data || []);
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  const handleSubChange = (e) => setSubForm({ ...subForm, [e.target.name]: e.target.value });

  const fetchProjects = async () => {
    try {
      const projRes = await api.get('/dynamic/table/projects?limit=500');
      setProjects(projRes.data.data || []);
    } catch (error) { console.error("Failed to fetch projects:", error); }
  };

  const openSubModal = () => {
    fetchProjects();
    setIsSubModalOpen(true);
  };

  const submitSubcontractor = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post('/add/subcontractors', subForm);
      alert(cur.alerts.success);
      setIsSubModalOpen(false);
      setSubForm({ name: '', phone: '', project_id: '', company: '', tax_id: '', license_number: '', insurance_expiry: '' });
      fetchData();
    } catch (error) { alert(error.response?.data?.error || "Error"); }
    finally { setIsSubmitting(false); }
  };

  const approveInvoice = async (invoiceId) => {
    if (!window.confirm(cur.alerts.confirmApprove)) return;
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      const res = await api.post(`/action/approve_sub_invoice/${invoiceId}`, {
        action: 'approve',
        username: user?.username || 'System'
      });
      alert(`${cur.alerts.updateSuccess} ${res.data.newStatus}`);
      fetchData();
    } catch (error) { alert(error.response?.data?.error || "Error"); }
  };

  return (
    <div className="bg-[#f8fafc]/50 min-h-screen p-4 sm:p-10 space-y-10" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-[1600px] mx-auto space-y-10">

        {/* --- HEADER --- */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/30 rounded-full -translate-y-32 translate-x-32 blur-3xl opacity-50"></div>

          <div className="flex items-center gap-6 relative z-10">
            <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center text-3xl shadow-xl shadow-slate-900/20 transform rotate-3">👷‍♂️</div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">{cur.title}</h1>
                <span className="bg-blue-600 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-200">SUBCON-PRO</span>
              </div>
              <p className="text-slate-400 font-bold text-sm mt-1">{cur.subtitle}</p>
            </div>
          </div>

          <div className="bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200 flex gap-1 relative z-10 overflow-x-auto scrollbar-none">
            {Object.keys(cur.tabs).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-xs transition-all duration-200 whitespace-nowrap ${activeTab === tab
                    ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10'
                    : 'text-slate-500 hover:bg-white hover:text-slate-900'
                  }`}
              >
                <span>{tab === 'boq' ? '📝' : tab === 'subs' ? '🤝' : tab === 'invoices' ? '📄' : '📊'}</span> {cur.tabs[tab]}
              </button>
            ))}
          </div>
        </div>

        {/* --- GLOBAL KPI HEADER --- */}
        {globalStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-in fade-in slide-in-from-top duration-700">
            <div className="bg-slate-950 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group border border-white/5">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-transparent"></div>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2 italic">Portfolio Volume</span>
              <div className="flex items-end justify-between">
                <span className="text-3xl font-black font-mono tracking-tighter text-indigo-400">
                  {Number(globalStats.total_contract_value).toLocaleString()} <span className="text-[10px] opacity-40 font-sans">LCY</span>
                </span>
                <span className="text-2xl opacity-20">🏗️</span>
              </div>
            </div>
            
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-all">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Strategic Partners</span>
              <div className="flex items-end justify-between">
                <span className="text-3xl font-black text-slate-900 font-mono tracking-tighter">{globalStats.total_subs}</span>
                <span className="px-2 py-1 bg-slate-50 text-slate-400 rounded-lg text-[8px] font-black uppercase tracking-widest italic border border-slate-100">Active Entities</span>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-all">
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Pending Certifications</span>
               <div className="flex items-end justify-between">
                  <span className={`text-3xl font-black font-mono tracking-tighter ${Number(globalStats.pending_claims) > 0 ? 'text-amber-500' : 'text-slate-900'}`}>
                     {globalStats.pending_claims}
                  </span>
                  <span className="text-xl">📋</span>
               </div>
            </div>

            <div className={`p-8 rounded-[2.5rem] border shadow-sm transition-all hover:shadow-md ${Number(globalStats.expired_compliance) > 0 ? 'bg-rose-50/50 border-rose-100' : 'bg-white border-slate-100'}`}>
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Risk Exposure</span>
               <div className="flex items-end justify-between">
                  <span className={`text-3xl font-black font-mono tracking-tighter ${Number(globalStats.expired_compliance) > 0 ? 'text-rose-600' : 'text-emerald-500'}`}>
                     {globalStats.expired_compliance}
                  </span>
                  <span className="text-[9px] font-black uppercase tracking-widest opacity-60">
                    {Number(globalStats.expired_compliance) > 0 ? 'Critical Alerts' : 'Fully Compliant'}
                  </span>
               </div>
            </div>
          </div>
        )}

        {/* --- MAIN CONTENT AREA --- */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden min-h-[600px]">

          {activeTab === 'boq' && (
            <div className="animate-fade-in">
              <div className="p-8 border-b border-slate-100 bg-slate-50/30 flex justify-between items-center">
                <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
                  <span className="p-2 bg-white rounded-xl shadow-sm border border-slate-100">📋</span>
                  {cur.boqTab.title}
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className={`w-full ${language === 'ar' ? 'text-right' : 'text-left'} whitespace-nowrap`}>
                  <thead className="bg-slate-50/50 border-b border-slate-100">
                    <tr className="text-slate-400 text-[10px] uppercase tracking-widest font-black">
                      <th className="px-8 py-5">{cur.boqTab.item}</th>
                      <th className="px-8 py-5">{cur.boqTab.project}</th>
                      <th className="px-8 py-5 text-center">{cur.boqTab.est}</th>
                      <th className="px-8 py-5 text-center">{cur.boqTab.assigned}</th>
                      <th className="px-8 py-5 text-center bg-slate-100/30 text-slate-900">{cur.boqTab.actual}</th>
                      <th className="px-8 py-5 text-center">{cur.boqTab.remaining}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {loading ? (
                      <tr><td colSpan="6" className="p-20 text-center animate-pulse font-black text-slate-400">{cur.boqTab.loading}</td></tr>
                    ) : boqList.map(item => {
                      const unassigned = Number(item.est_qty) - Number(item.assigned_qty);
                      const isWarning = unassigned > (Number(item.est_qty) * 0.2);
                      return (
                        <tr key={item.id} className="hover:bg-slate-50/50 transition-all group">
                          <td className="px-8 py-6">
                            <div className="flex flex-col">
                              <span className="font-black text-slate-900 text-sm group-hover:text-blue-600 transition-colors leading-tight">{item.item_name}</span>
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-1">{item.category}</span>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <span className="font-bold text-slate-600 text-xs">{item.project_name}</span>
                          </td>
                          <td className="px-8 py-6 text-center font-black text-slate-900 font-mono text-sm">
                            {Number(item.est_qty).toLocaleString()} <span className="text-[8px] opacity-60 font-sans">{item.uom}</span>
                          </td>
                          <td className="px-8 py-6 text-center font-black text-amber-600 font-mono text-sm">
                            {Number(item.assigned_qty).toLocaleString()} <span className="text-[8px] opacity-60 font-sans">{item.uom}</span>
                          </td>
                          <td className="px-8 py-6 text-center font-black text-emerald-600 font-mono text-lg bg-emerald-50/10">
                            {Number(item.dynamic_act_qty || 0).toLocaleString()} <span className="text-[8px] opacity-60 font-sans">{item.uom}</span>
                          </td>
                          <td className={`px-8 py-6 text-center`}>
                            <span className={`px-4 py-1.5 rounded-xl font-black font-mono text-sm border shadow-sm ${isWarning ? 'bg-rose-50 text-rose-600 border-rose-200 animate-pulse' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                              {unassigned.toLocaleString()}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'subs' && (
            <div className="animate-fade-in">
              <div className="p-8 border-b border-slate-100 bg-slate-50/30 flex justify-between items-center">
                <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
                  <span className="p-2 bg-white rounded-xl shadow-sm border border-slate-100">🤝</span>
                  {cur.subsTab.title}
                </h3>
                <button onClick={openSubModal} className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black text-xs transition-all shadow-lg shadow-slate-900/20 flex items-center gap-2 transform active:scale-95">
                  <span className="text-lg leading-none">+</span> {cur.subsTab.add}
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className={`w-full ${language === 'ar' ? 'text-right' : 'text-left'} whitespace-nowrap`}>
                  <thead className="bg-slate-50/50 border-b border-slate-100">
                    <tr className="text-slate-400 text-[10px] uppercase tracking-widest font-black">
                      <th className="px-8 py-5">{cur.subsTab.name}</th>
                      <th className="px-8 py-5">{cur.subsTab.contact}</th>
                      <th className="px-8 py-5">{cur.subsTab.currentProj}</th>
                      <th className={`px-8 py-5 text-center bg-slate-100/30 text-slate-900`}>{cur.subsTab.totalInvoices}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {loading ? (
                      <tr><td colSpan="4" className="p-20 text-center animate-pulse font-black text-slate-400">{cur.subsTab.loading}</td></tr>
                    ) : subcontractors.map(sub => (
                      <tr 
                        key={sub.id} 
                        onClick={() => setSelectedSubId(sub.id)}
                        className="hover:bg-slate-50/50 transition-all group cursor-pointer"
                      >
                        <td className="px-8 py-6">
                          <div className="flex flex-col">
                            <span className="font-black text-slate-900 text-sm group-hover:text-blue-600 transition-colors leading-tight">{sub.name}</span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-1">{sub.company || 'Private Entity'}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <span className="font-bold text-slate-600 text-xs font-mono bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">{sub.phone || 'No Contact'}</span>
                        </td>
                        <td className="px-8 py-6 text-slate-500 font-bold text-xs">{sub.project_name || 'Standby'}</td>
                        <td className={`px-8 py-6 text-center font-black text-emerald-600 text-xl bg-emerald-50/10`}>
                          {Number(sub.total_invoices || 0).toLocaleString()} <span className="text-[10px] opacity-60 mr-1 font-sans">LCY</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'invoices' && (
            <div className="animate-fade-in">
              <div className="p-8 border-b border-slate-100 bg-slate-50/30">
                <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
                  <span className="p-2 bg-white rounded-xl shadow-sm border border-slate-100">📄</span>
                  {cur.invoicesTab.title}
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className={`w-full ${language === 'ar' ? 'text-right' : 'text-left'} whitespace-nowrap`}>
                  <thead className="bg-slate-50/50 border-b border-slate-100">
                    <tr className="text-slate-400 text-[10px] uppercase tracking-widest font-black">
                      <th className="px-8 py-5">{cur.invoicesTab.ref}</th>
                      <th className="px-8 py-5">{cur.invoicesTab.desc}</th>
                      <th className="px-8 py-5 text-center">{cur.invoicesTab.qty}</th>
                      <th className={`px-8 py-5 ${language === 'ar' ? 'text-left' : 'text-right'}`}>{cur.invoicesTab.net}</th>
                      <th className="px-8 py-5 text-center">{cur.invoicesTab.status}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {loading ? (
                      <tr><td colSpan="5" className="p-20 text-center animate-pulse font-black text-slate-400">{cur.invoicesTab.loading}</td></tr>
                    ) : invoices.map(inv => {
                      const isApproved = inv.status === 'Approved' || inv.status === 'Paid';
                      return (
                        <tr key={inv.id} className="hover:bg-slate-50/50 transition-all group">
                          <td className="px-8 py-6">
                            <div className="flex flex-col">
                              <span className="font-black text-slate-400 text-[10px] uppercase tracking-widest">INV-#{inv.id}</span>
                              <span className="text-[11px] text-slate-900 font-black mt-1">{new Date(inv.date).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}</span>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <span className="font-bold text-slate-700 text-xs font-sans whitespace-normal block max-w-md">{inv.description}</span>
                          </td>
                          <td className="px-8 py-6 text-center font-black text-blue-600 text-sm">
                            {Number(inv.curr_qty).toLocaleString()}
                          </td>
                          <td className={`px-8 py-6 ${language === 'ar' ? 'text-left' : 'text-right'} font-black text-emerald-600 text-xl bg-emerald-50/10`}>
                            {Number(inv.net_amount).toLocaleString()} <span className="text-[10px] opacity-60 mr-1 font-sans">LCY</span>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex flex-col gap-2 items-center">
                              <span className={`px-4 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border shadow-sm w-full text-center ${isApproved ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                                {isApproved ? cur.invoicesTab.approved : cur.invoicesTab.pending}
                              </span>
                              {!isApproved && (
                                <button onClick={() => approveInvoice(inv.id)} className="w-full py-2 bg-slate-900 text-white rounded-lg text-[9px] font-black uppercase tracking-[0.2em] hover:bg-blue-600 transition-all shadow-sm active:scale-95">
                                  {cur.invoicesTab.approveBtn}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <SubcontractorAnalytics language={language} />
          )}
        </div>
      </div>

      {isSubModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl" onClick={() => setIsSubModalOpen(false)}></div>
          <form onSubmit={submitSubcontractor} className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden flex flex-col p-10 border border-white/20 animate-in zoom-in-95 duration-300">
             <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black uppercase text-slate-900 italic tracking-tighter">{cur.modalSub.title}</h2>
                <button type="button" onClick={() => setIsSubModalOpen(false)} className="text-slate-400 hover:text-slate-900 transition-colors text-2xl">✖</button>
             </div>
             
             <div className="space-y-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{cur.modalSub.name}</label>
                   <input type="text" name="name" value={subForm.name} onChange={handleSubChange} className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs outline-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all shadow-inner" required />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{cur.modalSub.phone}</label>
                   <input type="text" name="phone" value={subForm.phone} onChange={handleSubChange} className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs outline-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all shadow-inner" required />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{cur.modalSub.project}</label>
                   <select 
                      name="project_id" 
                      value={subForm.project_id} 
                      onChange={handleSubChange} 
                      className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs outline-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all shadow-inner appearance-none cursor-pointer"
                   >
                      <option value="">-- {language === 'ar' ? 'اختر المشروع' : 'Select Project'} --</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                   </select>
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{cur.modalSub.company}</label>
                   <input type="text" name="company" value={subForm.company} onChange={handleSubChange} className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs outline-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all shadow-inner" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tax ID / VAT</label>
                      <input type="text" name="tax_id" value={subForm.tax_id} onChange={handleSubChange} className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs outline-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all shadow-inner" />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">License No.</label>
                      <input type="text" name="license_number" value={subForm.license_number} onChange={handleSubChange} className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs outline-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all shadow-inner" />
                   </div>
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Insurance Expiry Date</label>
                   <input type="date" name="insurance_expiry" value={subForm.insurance_expiry} onChange={handleSubChange} className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs outline-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all shadow-inner" />
                </div>
             </div>
             <button type="submit" disabled={isSubmitting} className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black text-lg hover:bg-slate-800 transition-all shadow-2xl shadow-slate-900/20 flex items-center justify-center gap-4 active:scale-[0.98] mt-4">
                {isSubmitting ? <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div> : <>{cur.modalSub.save}</>}
             </button>
          </form>
        </div>
      )}

      {selectedSubId && (
        <Subcontractor360 
          subId={selectedSubId} 
          onClose={() => setSelectedSubId(null)} 
          language={language} 
        />
      )}
    </div>
  );
}
