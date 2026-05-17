import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

export default function Expenses() {
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [projects, setProjects] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [summary, setSummary] = useState({ totalAmount: 0, totalTax: 0, count: 0, byCategory: {} });
  const [analytics, setAnalytics] = useState({ monthly: [], projectCosts: [] });
  
  // Filters & Search
  const [filters, setFilters] = useState({ category_id: '', project_id: '', status: '', search: '', start_date: '', end_date: '' });
  
  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [detailModal, setDetailModal] = useState({ isOpen: false, expense: null });
  const [attachModal, setAttachModal] = useState({ isOpen: false, expense: null, attachments: [], uploading: false });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [form, setForm] = useState({
    description: '', amount: '', category_id: '', project_id: '', 
    expense_date: new Date().toISOString().split('T')[0], 
    payment_method: 'Cash', supplier_name: '', is_billable: false, 
    tax_amount: 0, company_entity: '',
    currency: 'EGP',
    exchange_rate: 1,
    metadata: {
        cost_center_type: 'Project', // 'Project' or 'Corporate'
        cost_code: 'Materials', // 'Materials', 'Labor', 'Subcontractor', 'Overhead'
        payment_detail: 'Cash', // 'Cash', 'Bank', 'Petty Cash'
        reference_no: ''
    }
  });

  const t = {
    ar: {
      title: "إدارة المصروفات والنفقات",
      subtitle: "النظام المتكامل لمراقبة التكاليف التشغيلية ومصروفات المشاريع",
      newBtn: "تسجيل مصروف جديد",
      stats: {
        total: "إجمالي النفقات",
        tax: "إجمالي الضرائب",
        count: "عدد المعاملات",
        pending: "بانتظار الاعتماد"
      },
      table: {
        date: "التاريخ",
        desc: "الوصف / المسمى",
        cat: "التصنيف",
        amt: "القيمة (LCY)",
        status: "الحالة",
        project: "المشروع المرتبط",
        actions: "الإجراءات"
      },
      form: {
        title: "تسجيل قيد مصروفات ذكي",
        editTitle: "تعديل بيانات المصروف",
        desc: "وصف المصروف",
        amt: "المبلغ الأساسي",
        tax: "قيمة الضريبة",
        cat: "تصنيف النفقة",
        proj: "المشروع (اختياري)",
        comp: "الشركة / الكيان",
        method: "طريقة الدفع",
        supplier: "المورد / الجهة المستلمة",
        save: "ترحيل وحفظ القيد",
        update: "حفظ التعديلات",
        type: "نوع مركز التكلفة",
        costCode: "بند التكلفة",
        ref: "رقم الفاتورة / المرجع"
      },
      analytics: {
        monthly: "تطور النفقات الشهري",
        projects: "أعلى المشاريع استهلاكاً"
      },
      currency: {
        label: "العملة",
        rate: "سعر الصرف (FX Rate)"
      },
      attachments: {
        title: "مرفقات ومستندات المصروف",
        uploadBtn: "رفع مستند جديد",
        noFiles: "لا توجد ملفات مرفقة بهذا المصروف",
        uploading: "جاري الرفع...",
        deleteConfirm: "هل أنت متأكد من حذف هذا المرفق؟",
        deleteExpConfirm: "هل أنت متأكد من حذف هذا المصروف نهائياً؟"
      }
    },
    en: {
      title: "Expense Management",
      subtitle: "Integrated system for monitoring operational costs and project expenditures",
      newBtn: "Register New Expense",
      stats: {
        total: "Total Expenditures",
        tax: "Total Tax Recoverable",
        count: "Transaction Count",
        pending: "Pending Approval"
      },
      table: {
        date: "Date",
        desc: "Description",
        cat: "Category",
        amt: "Amount (LCY)",
        status: "Status",
        project: "Linked Project",
        actions: "Actions"
      },
      form: {
        title: "Smart Expense Entry",
        editTitle: "Edit Expense Details",
        desc: "Expense Description",
        amt: "Base Amount",
        tax: "Tax Amount",
        cat: "Expense Category",
        proj: "Project (Optional)",
        comp: "Company / Entity",
        method: "Payment Method",
        supplier: "Supplier / Recipient",
        save: "Post & Save Entry",
        update: "Update Entry",
        type: "Cost Center Type",
        costCode: "Cost Item",
        ref: "Invoice / Ref #"
      },
      analytics: {
        monthly: "Monthly Expense Trends",
        projects: "Top Project Cost Distribution"
      },
      currency: {
        label: "Currency",
        rate: "Exchange Rate (FX)"
      },
      attachments: {
        title: "Expense Documents & Attachments",
        uploadBtn: "Upload New Document",
        noFiles: "No documents attached to this expense",
        uploading: "Uploading...",
        deleteConfirm: "Are you sure you want to delete this attachment?",
        deleteExpConfirm: "Are you sure you want to delete this expense?"
      }
    }
  };

  const cur = t[language === 'en' ? 'en' : 'ar'];

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [filters]);

  const fetchInitialData = async () => {
    try {
        const [catRes, dropRes, anaRes] = await Promise.all([
            api.get('/table/expense_categories?limit=100'),
            api.get('/dropdowns'),
            api.get('/expenses/analytics')
        ]);
        setCategories(catRes.data?.data || []);
        setProjects(dropRes.data?.projects_dd || []);
        setCompanies(dropRes.data?.companies_dd?.map(c => ({ id: c, name: c })) || []);
        setAnalytics(anaRes.data || { monthly: [], projectCosts: [] });
    } catch (err) { console.error("Expense Init Data Error:", err); }
  };

  const fetchExpenses = async () => {
    setLoading(true);
    try {
        const params = new URLSearchParams(filters).toString();
        const { data } = await api.get(`/expenses?${params}`);
        setExpenses(data?.data || []);
        setSummary(data?.summary || { totalAmount: 0, totalTax: 0, count: 0, byCategory: {} });
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleOpenCreateModal = () => {
    setEditId(null);
    setForm({
      description: '', amount: '', category_id: '', project_id: '', 
      expense_date: new Date().toISOString().split('T')[0], 
      payment_method: 'Cash', supplier_name: '', is_billable: false, 
      tax_amount: 0, company_entity: '',
      currency: 'EGP',
      exchange_rate: 1,
      metadata: {
          cost_center_type: 'Project',
          cost_code: 'Materials',
          payment_detail: 'Cash',
          reference_no: ''
      }
    });
    setIsModalOpen(true);
  };

  const handleEditClick = (exp) => {
    setEditId(exp.id);
    setForm({
      description: exp.description || '',
      amount: exp.metadata?.original_amount || exp.amount || '',
      currency: exp.currency || 'EGP',
      exchange_rate: exp.metadata?.applied_exchange_rate || 1,
      category_id: exp.category_id || '',
      project_id: exp.project_id || '',
      expense_date: exp.expense_date ? new Date(exp.expense_date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      payment_method: exp.payment_method || 'Cash',
      supplier_name: exp.supplier_name || '',
      is_billable: exp.is_billable || false,
      tax_amount: exp.tax_amount || 0,
      company_entity: exp.company_entity || '',
      metadata: {
        cost_center_type: exp.metadata?.cost_center_type || (exp.project_id ? 'Project' : 'Corporate'),
        cost_code: exp.metadata?.cost_code || 'Materials',
        payment_detail: exp.metadata?.payment_detail || exp.payment_method || 'Cash',
        reference_no: exp.metadata?.reference_no || ''
      }
    });
    setIsModalOpen(true);
  };

  const handleDeleteClick = async (id) => {
    if (window.confirm(cur.attachments.deleteExpConfirm)) {
      try {
        await api.delete(`/expenses/${id}`);
        fetchExpenses();
      } catch (err) { alert(err.response?.data?.error || err.message); }
    }
  };

  const handleAttachClick = (exp) => {
    setAttachModal({ isOpen: true, expense: exp, attachments: [], uploading: false });
    fetchAttachments(exp.id);
  };

  const fetchAttachments = async (id) => {
    try {
      const { data } = await api.get(`/files/attachments/expenses/${id}`);
      setAttachModal(prev => ({ ...prev, attachments: data || [] }));
    } catch (err) { console.error("Fetch attachments error:", err); }
  };

  const handleFileUpload = async (e, id) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setAttachModal(prev => ({ ...prev, uploading: true }));
    try {
      await api.post(`/files/upload/expenses/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      fetchAttachments(id);
    } catch (err) { alert(err.response?.data?.error || err.message); }
    finally { setAttachModal(prev => ({ ...prev, uploading: false })); }
  };

  const handleDeleteAttachment = async (attId, expId) => {
    if (window.confirm(cur.attachments.deleteConfirm)) {
      try {
        await api.delete(`/files/delete_attachment/${attId}`);
        fetchAttachments(expId);
      } catch (err) { alert(err.response?.data?.error || err.message); }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
        const lcyAmount = form.currency === 'EGP' ? parseFloat(form.amount) : parseFloat(form.amount) * parseFloat(form.exchange_rate);
        
        const payload = {
            ...form,
            amount: lcyAmount,
            auto_post: !editId, // Auto post only for new creations
            metadata: {
                ...form.metadata,
                original_amount: form.amount,
                original_currency: form.currency,
                applied_exchange_rate: form.exchange_rate
            }
        };

        if (editId) {
            await api.put(`/expenses/${editId}`, payload);
        } else {
            await api.post('/expenses', payload);
        }
        
        setIsModalOpen(false);
        setEditId(null);
        setForm({
            description: '', amount: '', category_id: '', project_id: '', 
            expense_date: new Date().toISOString().split('T')[0], 
            payment_method: 'Cash', supplier_name: '', is_billable: false, 
            tax_amount: 0, company_entity: '',
            currency: 'EGP',
            exchange_rate: 1,
            metadata: {
                cost_center_type: 'Project',
                cost_code: 'Materials',
                payment_detail: 'Cash',
                reference_no: ''
            }
        });
        await fetchExpenses();
    } catch (err) { alert(err.response?.data?.error || "Error"); }
    finally { setIsSubmitting(false); }
  };

  const updateStatus = async (id, status) => {
    try {
        await api.patch(`/expenses/${id}/status`, { status });
        fetchExpenses();
        if (detailModal.isOpen) setDetailModal({ ...detailModal, expense: { ...detailModal.expense, status } });
    } catch (err) { console.error(err); }
  };

  return (
    <div className="space-y-10 animate-fade-in" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      
      {/* --- HEADER --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
           <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center text-3xl shadow-xl shadow-slate-900/20">💸</div>
              <div>
                 <h1 className="text-3xl font-black text-slate-900 tracking-tight">{cur.title}</h1>
                 <p className="text-slate-400 font-bold text-sm mt-1">{cur.subtitle}</p>
              </div>
           </div>
        </div>
        <button 
          onClick={handleOpenCreateModal}
          className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20 flex items-center gap-3 active:scale-95"
        >
          <span className="text-xl leading-none">+</span> {cur.newBtn}
        </button>
      </div>

      {/* --- ELITE STATS GRID --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         <StatCard title={cur.stats.total} value={summary?.totalAmount || 0} type="primary" icon="💰" />
         <StatCard title={cur.stats.tax} value={summary?.totalTax || 0} type="secondary" icon="⚖️" />
         <StatCard title={cur.stats.count} value={summary?.count || 0} type="neutral" icon="📊" suffix="" />
         <StatCard title={cur.stats.pending} value={summary?.byStatus?.['Pending'] || 0} type="warning" icon="⏳" suffix="" />
      </div>

      {/* --- ANALYTICS & TRENDS --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-10 border border-slate-200 shadow-sm relative overflow-hidden h-[400px]">
            <div className="flex justify-between items-center mb-10">
               <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">{cur.analytics.monthly}</h3>
               <span className="text-[10px] font-black text-emerald-500 bg-emerald-50 px-3 py-1 rounded-lg">Fiscal Performance</span>
            </div>
            <div className="flex items-end justify-between h-[220px] gap-4 px-4">
               {analytics.monthly?.slice().reverse().map((m, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-4 group">
                     <div className="w-full relative bg-slate-50 rounded-full overflow-hidden flex flex-col justify-end h-full">
                        <div 
                           className="w-full bg-slate-900 rounded-full transition-all duration-1000 delay-300 group-hover:bg-emerald-500 shadow-lg shadow-slate-900/10" 
                           style={{ height: `${(m.total_amount / Math.max(...analytics.monthly.map(x => x.total_amount))) * 100}%` }}
                        ></div>
                     </div>
                     <span className="text-[9px] font-black text-slate-400 rotate-45 mt-2">{m.month}</span>
                  </div>
               ))}
            </div>
         </div>

         <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white shadow-2xl shadow-slate-900/30 relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -translate-y-32 translate-x-32"></div>
            <div>
               <h3 className="text-sm font-black text-emerald-400 uppercase tracking-widest mb-10">{cur.analytics.projects}</h3>
               <div className="space-y-8">
                  {analytics.projectCosts?.map((p, i) => (
                     <div key={i} className="space-y-2">
                        <div className="flex justify-between text-xs font-black">
                           <span className="text-slate-300">{p.project_name || 'Corporate'}</span>
                           <span className="text-white font-mono">{Number(p.total_cost || 0).toLocaleString()}</span>
                        </div>
                        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                           <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(p.total_cost / (analytics.projectCosts[0]?.total_cost || 1)) * 100}%` }}></div>
                        </div>
                     </div>
                  ))}
               </div>
            </div>
            <div className="pt-10 border-t border-white/5 mt-auto">
               <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Operational Cost Audit Unit</p>
            </div>
         </div>
      </div>

      {/* --- LEDGER TABLE --- */}
      <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-visible">
         <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-between items-center gap-6 rounded-t-[2.5rem]">
            <div className="flex gap-4">
               <select 
                  value={filters.category_id} 
                  onChange={e => setFilters({...filters, category_id: e.target.value})}
                  className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-[11px] font-black text-slate-600 outline-none hover:border-slate-900 transition-colors cursor-pointer"
               >
                  <option value="">-- All Categories --</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
               </select>
               <select 
                  value={filters.project_id} 
                  onChange={e => setFilters({...filters, project_id: e.target.value})}
                  className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-[11px] font-black text-slate-600 outline-none hover:border-slate-900 transition-colors cursor-pointer"
               >
                  <option value="">-- General / All Projects --</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
               </select>
            </div>
            <div className="relative w-full md:w-80">
               <input 
                  type="text" 
                  placeholder="Search ledger..." 
                  value={filters.search}
                  onChange={e => setFilters({...filters, search: e.target.value})}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 focus:ring-4 focus:ring-slate-900/5 outline-none transition-all"
               />
               <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
            </div>
         </div>

         <div className="overflow-x-auto custom-scrollbar">
            <table className={`w-full ${language === 'ar' ? 'text-right' : 'text-left'} whitespace-nowrap`}>
               <thead className="bg-slate-50/20 border-b border-slate-50">
                  <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                     <th className="px-10 py-6">{cur.table.date}</th>
                     <th className="px-10 py-6">{cur.table.desc}</th>
                     <th className="px-10 py-6">{cur.table.cat}</th>
                     <th className="px-10 py-6">{cur.table.project}</th>
                     <th className={`px-10 py-6 ${language === 'ar' ? 'text-left' : 'text-right'}`}>{cur.table.amt}</th>
                     <th className="px-10 py-6">{cur.table.status}</th>
                     <th className="px-10 py-6 text-center">{cur.table.actions}</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                  {loading ? (
                     <tr><td colSpan="7" className="p-20 text-center text-slate-300 font-bold animate-pulse">Synchronizing ledger data...</td></tr>
                  ) : expenses.map(exp => (
                     <tr 
                        key={exp.id} 
                        onClick={() => setDetailModal({ isOpen: true, expense: exp })}
                        className="hover:bg-slate-50/50 transition-all cursor-pointer group"
                     >
                        <td className="px-10 py-6">
                           <span className="font-mono text-[11px] font-black text-slate-400">{new Date(exp.expense_date).toLocaleDateString()}</span>
                        </td>
                        <td className="px-10 py-6">
                           <div className="flex flex-col">
                              <span className="font-black text-slate-900 group-hover:text-slate-600 transition-colors">{exp.description || 'N/A'}</span>
                              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-1">{exp.supplier_name || 'N/A'}</span>
                           </div>
                        </td>
                        <td className="px-10 py-6">
                           <span className="px-3 py-1 bg-slate-100 text-slate-900 rounded-lg text-[10px] font-black border border-slate-200">{exp.category_name || 'General'}</span>
                        </td>
                        <td className="px-10 py-6">
                           {exp.project_name ? (
                              <div className="flex items-center gap-3">
                                 <div className="w-8 h-8 bg-slate-900 text-white rounded-lg flex items-center justify-center text-xs shadow-lg shadow-slate-900/10">🏗️</div>
                                 <span className="text-xs font-black text-slate-700">{exp.project_name}</span>
                              </div>
                           ) : (
                              <span className="text-[10px] font-black text-slate-300 uppercase italic">General / Corporate</span>
                           )}
                        </td>
                        <td className={`px-10 py-6 ${language === 'ar' ? 'text-left' : 'text-right'}`}>
                           <div className="flex flex-col">
                              <span className="font-black text-slate-900 font-mono text-lg tracking-tighter">{Number(exp.amount || 0).toLocaleString()}</span>
                              <span className="text-[9px] font-black text-slate-400 uppercase">LCY</span>
                           </div>
                        </td>
                        <td className="px-10 py-6">
                           <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm ${
                              exp.status === 'Approved' ? 'bg-emerald-500 text-white' : 
                              exp.status === 'Pending' ? 'bg-amber-400 text-white' : 
                              exp.status === 'Rejected' ? 'bg-rose-500 text-white' : 'bg-slate-200 text-slate-500'
                           }`}>
                              {exp.status || 'Pending'}
                           </span>
                        </td>
                        <td className="px-10 py-6 text-center" onClick={e => e.stopPropagation()}>
                           <div className="flex items-center justify-center gap-2">
                              <button 
                                 onClick={() => handleAttachClick(exp)}
                                 title={cur.attachments.title}
                                 className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-600 flex items-center justify-center text-sm transition-all shadow-sm active:scale-95"
                              >
                                 📎
                              </button>
                              <button 
                                 onClick={() => handleEditClick(exp)}
                                 title={cur.form.editTitle}
                                 className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-amber-500 hover:text-white text-slate-600 flex items-center justify-center text-sm transition-all shadow-sm active:scale-95"
                              >
                                 ✏️
                              </button>
                              <button 
                                 onClick={() => handleDeleteClick(exp.id)}
                                 title="Delete"
                                 className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-rose-500 hover:text-white text-slate-600 flex items-center justify-center text-sm transition-all shadow-sm active:scale-95"
                              >
                                 🗑️
                              </button>
                           </div>
                        </td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>

      {/* --- CREATION / EDIT MODAL --- */}
      {isModalOpen && (
         <div className="fixed top-0 left-0 w-screen h-screen z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xl">
            <div className="absolute inset-0 cursor-pointer" onClick={() => setIsModalOpen(false)}></div>
            <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl relative z-10 overflow-hidden animate-scale-up border border-white/10 flex flex-col max-h-[90vh]">
              <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                 <div className="flex items-center gap-6">
                    <div className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center text-2xl shadow-xl shadow-slate-900/30">✍️</div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">{editId ? cur.form.editTitle : cur.form.title}</h3>
                 </div>
                 <button onClick={() => setIsModalOpen(false)} className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-xl hover:bg-rose-50 hover:text-rose-500 transition-all shadow-sm active:scale-90">✕</button>
              </div>
              <form onSubmit={handleSubmit} className="p-10 space-y-10 max-h-[70vh] overflow-y-auto custom-scrollbar">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="md:col-span-2 space-y-3">
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] ml-1">{cur.form.desc}</label>
                       <input type="text" name="description" required value={form.description} onChange={e => setForm({...form, description: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all shadow-inner" />
                    </div>

                    <div className="md:col-span-2 space-y-3">
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] ml-1">{cur.form.comp}</label>
                       <select 
                          required 
                          name="company_entity"
                          value={form.company_entity} 
                          onChange={e => setForm({...form, company_entity: e.target.value})} 
                          className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all appearance-none cursor-pointer"
                       >
                          <option value="">-- Select Company --</option>
                          {companies.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                       </select>
                    </div>

                    <div className="space-y-3">
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] ml-1">{cur.form.type}</label>
                       <select 
                          required 
                          value={form.metadata.cost_center_type} 
                          onChange={e => setForm({...form, metadata: {...form.metadata, cost_center_type: e.target.value}, project_id: e.target.value === 'Corporate' ? '' : form.project_id})} 
                          className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all appearance-none cursor-pointer"
                       >
                          <option value="Project">🏗️ Project-Specific</option>
                          <option value="Corporate">🏛️ Corporate / General</option>
                       </select>
                    </div>

                    <div className="space-y-3">
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] ml-1">{cur.form.costCode}</label>
                       <select 
                          required 
                          value={form.metadata.cost_code} 
                          onChange={e => setForm({...form, metadata: {...form.metadata, cost_code: e.target.value}})} 
                          className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all appearance-none cursor-pointer"
                       >
                          <option value="Materials">📦 Materials</option>
                          <option value="Labor">👥 Labor / Wages</option>
                          <option value="Subcontractor">👷 Subcontractor Payment</option>
                          <option value="Equipment">🚜 Equipment / Fuel</option>
                          <option value="Admin">📑 Administrative</option>
                          <option value="Other">🌀 Other / Misc</option>
                       </select>
                    </div>

                    <div className="space-y-3">
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] ml-1">{cur.form.amt}</label>
                       <input type="number" name="amount" required value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} className="w-full px-6 py-5 bg-slate-50 border-none rounded-2xl font-black font-mono text-2xl text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all shadow-inner text-center" />
                    </div>

                    <div className="space-y-3">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] ml-1">{cur.currency.label}</label>
                        <select 
                           value={form.currency} 
                           onChange={e => setForm({...form, currency: e.target.value, exchange_rate: e.target.value === 'EGP' ? 1 : form.exchange_rate})} 
                           className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all appearance-none cursor-pointer"
                        >
                           <option value="EGP">🇪🇬 EGP - Egyptian Pound</option>
                           <option value="USD">🇺🇸 USD - US Dollar</option>
                           <option value="EUR">🇪🇺 EUR - Euro</option>
                           <option value="SAR">🇸🇦 SAR - Saudi Riyal</option>
                           <option value="AED">🇦🇪 AED - UAE Dirham</option>
                        </select>
                     </div>

                     {form.currency !== 'EGP' && (
                        <div className="space-y-3 animate-fade-in">
                           <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] ml-1">{cur.currency.rate}</label>
                           <input 
                              type="number" 
                              step="0.01"
                              required 
                              value={form.exchange_rate} 
                              onChange={e => setForm({...form, exchange_rate: e.target.value})} 
                              className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl font-black font-mono text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all shadow-inner" 
                           />
                        </div>
                     )}

                    <div className="space-y-3">
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] ml-1">{cur.form.cat}</label>
                       <select required name="category" value={form.category_id} onChange={e => setForm({...form, category_id: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all appearance-none cursor-pointer">
                          <option value="">-- Select Category --</option>
                          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                       </select>
                    </div>

                    <div className="space-y-3">
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] ml-1">{cur.form.proj}</label>
                       <select 
                          disabled={form.metadata.cost_center_type === 'Corporate'}
                          value={form.project_id} 
                          onChange={e => setForm({...form, project_id: e.target.value})} 
                          className={`w-full px-6 py-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all appearance-none cursor-pointer ${form.metadata.cost_center_type === 'Corporate' ? 'opacity-50 cursor-not-allowed' : ''}`}
                       >
                          <option value="">-- Select Project --</option>
                          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                       </select>
                    </div>

                    <div className="space-y-3">
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] ml-1">{cur.form.method}</label>
                       <select 
                          required 
                          value={form.metadata.payment_detail} 
                          onChange={e => setForm({...form, metadata: {...form.metadata, payment_detail: e.target.value}, payment_method: e.target.value})} 
                          className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all appearance-none cursor-pointer"
                       >
                          <option value="Cash">💵 Cash on Hand</option>
                          <option value="Bank">🏦 Bank Transfer</option>
                          <option value="Petty Cash">👝 Petty Cash (Engineer)</option>
                          <option value="Credit">💳 Corporate Credit</option>
                       </select>
                    </div>

                    <div className="space-y-3">
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] ml-1">{cur.form.supplier}</label>
                       <input type="text" value={form.supplier_name} onChange={e => setForm({...form, supplier_name: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all shadow-inner" />
                    </div>

                    <div className="space-y-3">
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.25em] ml-1">{cur.form.ref}</label>
                       <input 
                          type="text" 
                          placeholder="e.g. INV-2024-001"
                          value={form.metadata.reference_no} 
                          onChange={e => setForm({...form, metadata: {...form.metadata, reference_no: e.target.value}})} 
                          className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all shadow-inner" 
                       />
                    </div>
                 </div>
                 <button type="submit" disabled={isSubmitting} className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black text-xl hover:bg-slate-800 transition-all shadow-2xl shadow-slate-900/30 flex items-center justify-center gap-4 active:scale-[0.98]">
                    {isSubmitting ? <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div> : <>{editId ? cur.form.update : cur.form.save}</>}
                 </button>
              </form>
           </div>
        </div>
      )}

      {/* --- ATTACHMENTS MODAL --- */}
      {attachModal.isOpen && attachModal.expense && (
         <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xl animate-fade-in">
            <div className="absolute inset-0 cursor-pointer" onClick={() => setAttachModal({ isOpen: false, expense: null, attachments: [], uploading: false })}></div>
            <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl relative z-10 overflow-hidden border border-white/10 flex flex-col max-h-[90vh]">
               <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <div className="flex items-center gap-6">
                     <div className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center text-2xl shadow-xl shadow-slate-900/30">📎</div>
                     <div>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">{cur.attachments.title}</h3>
                        <p className="text-xs font-bold text-slate-400 mt-1">{attachModal.expense.description || 'N/A'}</p>
                     </div>
                  </div>
                  <button onClick={() => setAttachModal({ isOpen: false, expense: null, attachments: [], uploading: false })} className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-xl hover:bg-rose-50 hover:text-rose-500 transition-all shadow-sm active:scale-90">✕</button>
               </div>

               <div className="p-10 flex-1 overflow-y-auto custom-scrollbar space-y-6">
                  {/* Upload Area */}
                  <div className="border-2 border-dashed border-slate-200 rounded-[2.5rem] p-8 text-center bg-slate-50/50 hover:border-slate-900 transition-colors relative group cursor-pointer">
                     <input 
                        type="file" 
                        id="expense-file-upload" 
                        onChange={e => handleFileUpload(e, attachModal.expense.id)} 
                        disabled={attachModal.uploading}
                        className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                     />
                     <div className="flex flex-col items-center gap-3">
                        <span className="text-4xl">📤</span>
                        <p className="text-xs font-black text-slate-700 uppercase tracking-widest">
                           {attachModal.uploading ? cur.attachments.uploading : cur.attachments.uploadBtn}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400">PDF, JPG, PNG, DOCX (Max 50MB)</p>
                     </div>
                  </div>

                  {/* Attachments List */}
                  <div className="space-y-4">
                     {attachModal.attachments.length === 0 ? (
                        <p className="text-center py-10 text-xs font-bold text-slate-400 italic">{cur.attachments.noFiles}</p>
                     ) : attachModal.attachments.map(att => (
                        <div key={att.id} className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-slate-300 transition-all">
                           <div className="flex items-center gap-4 overflow-hidden">
                              <span className="text-2xl">📄</span>
                              <div className="flex flex-col overflow-hidden">
                                 <a 
                                    href={att.file_path?.startsWith('/uploads') ? att.file_path : `/uploads/${att.file_name}`} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="text-xs font-black text-slate-900 hover:text-emerald-600 truncate transition-colors"
                                 >
                                    {att.original_name || att.file_name}
                                 </a>
                                 <span className="text-[9px] font-bold text-slate-400 font-mono mt-0.5">{new Date(att.upload_date || att.created_at).toLocaleString()}</span>
                              </div>
                           </div>
                           <div className="flex items-center gap-2">
                              <a 
                                 href={att.file_path?.startsWith('/uploads') ? att.file_path : `/uploads/${att.file_name}`} 
                                 target="_blank" 
                                 rel="noopener noreferrer"
                                 className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-xs hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                                 title="Download / View"
                              >
                                 👁️
                              </a>
                              <button 
                                 onClick={() => handleDeleteAttachment(att.id, attachModal.expense.id)}
                                 className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-xs hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                                 title="Delete Attachment"
                              >
                                 🗑️
                              </button>
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
            </div>
         </div>
      )}

      {/* --- STRATEGIC AUDIT MODAL --- */}
      {detailModal.isOpen && detailModal.expense && (
         <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-2xl" onClick={() => setDetailModal({ isOpen: false, expense: null })}></div>
            <div className="bg-white w-full max-w-5xl rounded-[3rem] shadow-2xl relative z-10 overflow-hidden border border-white/20 animate-in slide-in-from-bottom-10 duration-500 flex flex-col max-h-[90vh]">
               <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <div className="flex items-center gap-8">
                     <div className="w-20 h-20 bg-slate-950 text-white rounded-3xl flex items-center justify-center text-4xl shadow-2xl shadow-slate-900/40 transform -rotate-3">⚖️</div>
                     <div>
                        <h3 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">{detailModal.expense.description || 'N/A'}</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mt-1">Strategic Fiscal Audit Node • Ref {detailModal.expense.id}</p>
                     </div>
                  </div>
                  <button onClick={() => setDetailModal({ isOpen: false, expense: null })} className="w-14 h-14 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-2xl hover:bg-rose-50 hover:text-rose-500 transition-all shadow-sm active:scale-90">✕</button>
               </div>

               <div className="p-12 overflow-y-auto custom-scrollbar flex-1 bg-white space-y-16">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                     <div className="bg-slate-900 p-10 rounded-[2.5rem] text-white shadow-xl shadow-slate-900/20">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Post-Tax Expenditure</p>
                        <p className="text-4xl font-black font-mono tracking-tighter">{(Number(detailModal.expense.amount || 0) + Number(detailModal.expense.tax_amount || 0)).toLocaleString()}</p>
                        <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mt-2">Verified Ledger Value</p>
                     </div>
                     <div className="bg-slate-50 p-10 rounded-[2.5rem] border border-slate-200">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Expense Category</p>
                        <p className="text-2xl font-black text-slate-900 uppercase tracking-tight">{detailModal.expense.category_name || 'General'}</p>
                        <div className="flex items-center gap-2 mt-4">
                           <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Classification</span>
                        </div>
                     </div>
                     <div className="bg-slate-50 p-10 rounded-[2.5rem] border border-slate-200">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Current Status</p>
                        <span className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg ${
                           detailModal.expense.status === 'Approved' ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 
                           detailModal.expense.status === 'Pending' ? 'bg-amber-400 text-white shadow-amber-400/20' : 'bg-rose-500 text-white shadow-rose-500/20'
                        }`}>
                           {detailModal.expense.status || 'Pending'}
                        </span>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                     <div className="space-y-10">
                        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] border-b border-slate-100 pb-4">Transactional Metadata</h4>
                        <div className="space-y-8">
                           <MetaRow label="Execution Date" value={new Date(detailModal.expense.expense_date).toLocaleDateString('en-US', { dateStyle: 'full' })} />
                           <MetaRow label="Payment Vector" value={detailModal.expense.metadata?.payment_detail || detailModal.expense.payment_method || 'Cash'} />
                           <MetaRow label="Cost Center" value={detailModal.expense.metadata?.cost_center_type || (detailModal.expense.project_id ? 'Project' : 'Corporate')} />
                           <MetaRow label="Cost Classification" value={detailModal.expense.metadata?.cost_code || 'General'} />
                           <MetaRow label="Beneficiary Node" value={detailModal.expense.supplier_name || 'N/A'} />
                           <MetaRow label="Reference #" value={detailModal.expense.metadata?.reference_no || 'N/A'} />
                           <MetaRow label="Associated Project" value={detailModal.expense.project_name || 'Corporate Overhead'} />
                           <MetaRow label="Company Entity" value={detailModal.expense.company_entity || 'N/A'} />
                           <MetaRow label="Audit Lead" value={detailModal.expense.creator_name || 'System'} />
                        </div>
                     </div>

                     <div className="bg-slate-950 rounded-[3rem] p-12 text-white relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-1000"></div>
                        <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] mb-10">Digital Compliance Archive</h4>
                        <div className="flex flex-col items-center justify-center h-[200px] border-2 border-dashed border-white/5 rounded-[2rem] gap-4">
                           <span className="text-4xl opacity-20">📎</span>
                           <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Manage Documents & Receipts</p>
                           <button 
                              onClick={() => { setDetailModal({ isOpen: false, expense: null }); handleAttachClick(detailModal.expense); }}
                              className="text-[10px] font-black text-emerald-400 uppercase tracking-widest hover:text-emerald-300 transition-colors"
                           >
                              Open Attachments Archive →
                           </button>
                        </div>
                     </div>
                  </div>
               </div>

               <div className="p-10 bg-slate-950 flex flex-col md:flex-row justify-between items-center gap-8 border-t border-white/5">
                  <div className="flex items-center gap-4">
                     <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                     <span className="text-white/40 font-black text-[10px] uppercase tracking-[0.3em]">Integrity Verified by Enterprise Security Matrix</span>
                  </div>
                  <div className="flex gap-4 w-full md:w-auto">
                     {detailModal.expense.status === 'Pending' && (
                        <>
                           <button 
                              onClick={() => updateStatus(detailModal.expense.id, 'Rejected')}
                              className="flex-1 md:flex-none px-10 py-4 bg-white/5 hover:bg-rose-600 hover:text-white text-rose-500 border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-slate-950/20"
                           >
                              Reject Entry
                           </button>
                           <button 
                              onClick={() => updateStatus(detailModal.expense.id, 'Approved')}
                              className="flex-1 md:flex-none px-10 py-4 bg-emerald-500 hover:bg-emerald-400 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-emerald-900/40"
                           >
                              Approve & Post
                           </button>
                        </>
                     )}
                     <button className="flex-1 md:flex-none px-10 py-4 bg-white/10 text-white border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-white/20 transition-all">Print Audit Trail</button>
                  </div>
               </div>
            </div>
         </div>
      )}
    </div>
  );
}

function StatCard({ title, value, type, icon, suffix = "LCY" }) {
  const colors = {
    primary: "bg-white border-slate-200",
    secondary: "bg-emerald-50/10 border-emerald-100",
    warning: "bg-amber-50/10 border-amber-100",
    neutral: "bg-slate-50/20 border-slate-200"
  };

  const textColors = {
    primary: "text-slate-900",
    secondary: "text-emerald-500",
    warning: "text-amber-500",
    neutral: "text-slate-700"
  };

  return (
    <div className={`p-8 rounded-[2.5rem] border shadow-sm transition-all hover:shadow-xl hover:shadow-slate-200/50 group relative overflow-hidden ${colors[type]}`}>
       <div className="absolute top-0 right-0 p-6 text-6xl opacity-[0.03] group-hover:scale-110 transition-transform">{icon}</div>
       <div className="flex flex-col relative z-10">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">{title}</p>
          <div className="flex items-baseline gap-3">
            <span className={`text-4xl font-black font-mono tracking-tighter ${textColors[type]}`}>{Number(value || 0).toLocaleString()}</span>
            <span className="text-xs font-black text-slate-300 uppercase tracking-widest leading-none">{suffix}</span>
          </div>
          <div className="mt-6 flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${type === 'warning' ? 'bg-amber-400' : 'bg-emerald-400'} shadow-sm`}></div>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest opacity-60">Verified Balance</span>
          </div>
       </div>
    </div>
  );
}

function MetaRow({ label, value }) {
   return (
      <div className="flex justify-between items-center border-b border-slate-50 pb-4">
         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</span>
         <span className="font-bold text-slate-900 text-sm">{value}</span>
      </div>
   );
}
