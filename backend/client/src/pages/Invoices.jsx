import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

export default function Invoices() {
  const { language } = useLanguage();
  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPrintMode, setIsPrintMode] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState({
    invoice_no: '', client_id: '', project_id: '',
    issue_date: new Date().toISOString().split('T')[0],
    due_date: '', tax_amount: 0, notes: '', source_module: 'General',
    items: [{ description: '', quantity: 1, unit_price: 0 }]
  });

  const t = {
    ar: {
      title: "فواتير المبيعات والمطالبات",
      subtitle: "إصدار الفواتير الضريبية، متابعة المستخلصات، والتحصيل المالي",
      addBtn: "إصدار فاتورة جديدة",
      searchPlaceholder: "بحث برقم الفاتورة أو العميل...",
      totalRegistered: "إجمالي المسجل",
      table: {
        ref: "المرجع / التاريخ",
        client: "العميل",
        source: "الموديل المسبب",
        total: "القيمة الإجمالية (LCY)",
        status: "الحالة",
        actions: "إجراءات",
        print: "طباعة الفاتورة",
        paid: "تم التحصيل",
        unpaid: "انتظار الدفع"
      },
      modal: {
        title: "إصدار فاتورة مبيعات جديدة",
        ref: "رقم الفاتورة (المرجع)",
        client: "العميل المستهدف",
        source: "الموديل المسبب",
        sourceOptions: { general: "عام", realestate: "التطوير العقاري", projects: "المقاولات والمشاريع" },
        itemsTitle: "بنود وتفاصيل الفاتورة",
        addItem: "+ إضافة بند جديد",
        desc: "الوصف / البند الهندسي",
        qty: "الكمية",
        price: "سعر الوحدة",
        notes: "ملاحظات وشروط الدفع",
        totalNet: "إجمالي القيمة الصافية",
        submit: "تأكيد وإصدار الفاتورة مالياً"
      },
      print: {
        taxInvoice: "Tax Invoice / فاتورة ضريبية",
        date: "التاريخ",
        clientInfo: "بيانات العميل المستلم",
        projectInfo: "المشروع / المرجع الهندسي",
        genericSales: "مبيعات وتوريدات عامة",
        genericRef: "GEN-SALES",
        tableDesc: "بند الأعمال / الوصف",
        tableQty: "الكمية",
        tablePrice: "سعر الوحدة",
        tableTotal: "الإجمالي الصافي",
        summaryTotal: "المجموع الفرعي (Subtotal)",
        grandTotal: "الإجمالي الكلي",
        footer1: "Thank you for choosing PRIMEMED PHARMA ENTERPRISE SYSTEM",
        footer2: "تم إنشاء هذه الفاتورة إلكترونياً ولا تحتاج لختم أو توقيع."
      },
      alerts: {
        success: "تم إصدار الفاتورة بنجاح وتأثيرها مالياً."
      },
      loadingText: "جاري تحميل الفواتير والمطالبات المالية..."
    },
    en: {
      title: "Sales Invoices & Claims",
      subtitle: "Issue tax invoices, track receivables, and manage fiscal collections",
      addBtn: "Issue New Invoice",
      searchPlaceholder: "Search by invoice no. or customer...",
      totalRegistered: "Total Registered",
      table: {
        ref: "Ref / Date",
        client: "Customer",
        source: "Source Module",
        total: "Total Value (LCY)",
        status: "Status",
        actions: "Actions",
        print: "Print Invoice",
        paid: "Paid",
        unpaid: "Pending Payment"
      },
      modal: {
        title: "Issue New Sales Invoice",
        ref: "Invoice No. (Reference)",
        client: "Target Customer",
        source: "Source Module",
        sourceOptions: { general: "General", realestate: "Real Estate", projects: "Projects & Contracting" },
        itemsTitle: "Invoice Items & Details",
        addItem: "+ Add New Item",
        desc: "Description / Work Item",
        qty: "Quantity",
        price: "Unit Price",
        notes: "Notes & Payment Terms",
        totalNet: "Total Net Value",
        submit: "Confirm & Issue Fiscal Invoice"
      },
      print: {
        taxInvoice: "Tax Invoice",
        date: "Date",
        clientInfo: "Client Recipient Information",
        projectInfo: "Project / Engineering Reference",
        genericSales: "General Sales & Supplies",
        genericRef: "GEN-SALES",
        tableDesc: "Work Item / Description",
        tableQty: "Quantity",
        tablePrice: "Unit Price",
        tableTotal: "Net Total",
        summaryTotal: "Subtotal",
        grandTotal: "Grand Total",
        footer1: "Thank you for choosing PRIMEMED PHARMA ENTERPRISE SYSTEM",
        footer2: "This invoice was generated electronically and does not require a stamp or signature."
      },
      alerts: {
        success: "Invoice issued successfully with financial impact."
      },
      loadingText: "Loading invoices and financial claims..."
    }
  };
  const cur = t[language === 'en' ? 'en' : 'ar'];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [invRes, cliRes, projRes] = await Promise.all([
        api.get('/table/ar_invoices?limit=100'),
        api.get('/table/clients?limit=100'),
        api.get('/table/projects?limit=100')
      ]);
      setInvoices(invRes.data.data || []);
      setClients(cliRes.data.data || []);
      setProjects(projRes.data.data || []);
    } catch (error) { console.error(error); } 
    finally { setLoading(false); }
  };

  const addItem = () => {
    setFormData({ ...formData, items: [...formData.items, { description: '', quantity: 1, unit_price: 0 }] });
  };

  const removeItem = (index) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    newItems[index][field] = value;
    setFormData({ ...formData, items: newItems });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/invoices/create', formData);
      alert(cur.alerts.success);
      setIsModalOpen(false);
      fetchData();
    } catch (error) { alert(error.response?.data?.error || "Error"); }
  };

  const handlePrint = (invoice) => {
    setSelectedInvoice(invoice);
    setIsPrintMode(true);
    setTimeout(() => {
      window.print();
      setIsPrintMode(false);
    }, 500);
  };

  const filteredInvoices = invoices.filter(inv => 
    inv.invoice_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
    clients.find(c => c.id === inv.client_id)?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isPrintMode && selectedInvoice) {
    return <PrintView invoice={selectedInvoice} clients={clients} projects={projects} t={cur.print} language={language} />;
  }

  return (
    <div className="bg-[#f8fafc]/50 min-h-screen p-4 sm:p-10 space-y-10" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className="max-w-[1600px] mx-auto space-y-10">
        
        {/* --- HEADER --- */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50/30 rounded-full -translate-y-32 translate-x-32 blur-3xl opacity-50"></div>
          
            <div className="flex items-center gap-6 relative z-10">
            <div className="w-16 h-16 bg-emerald-600 text-white rounded-2xl flex items-center justify-center text-3xl shadow-xl shadow-emerald-600/20 transform -rotate-3">🧾</div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">{cur.title}</h1>
                <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-emerald-200">AR-INVOICING</span>
              </div>
              <p className="text-slate-400 font-bold text-sm mt-1">{cur.subtitle}</p>
            </div>
          </div>

          <button onClick={() => setIsModalOpen(true)} className="relative z-10 px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-sm hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20 flex items-center gap-3 active:scale-95">
            <span className="text-xl leading-none">+</span> {cur.addBtn}
          </button>
        </div>

        {/* --- ACTION BAR --- */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-6">
          <div className="relative w-full sm:w-[400px]">
            <input 
              type="text" 
              placeholder={cur.searchPlaceholder} 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-12 pl-4 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-slate-900/5 transition-all shadow-inner" 
            />
            <span className={`absolute ${language === 'ar' ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-slate-400 text-lg`}>🔍</span>
          </div>
          <div className="flex gap-4">
             <div className={`flex flex-col ${language === 'ar' ? 'items-end' : 'items-start'}`}>
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{cur.totalRegistered}</span>
                <span className="text-xl font-black text-slate-900 font-mono">{filteredInvoices.reduce((sum, i) => sum + Number(i.total_amount), 0).toLocaleString()} <span className="text-[10px] opacity-40">LCY</span></span>
             </div>
          </div>
        </div>

        {/* --- MAIN CONTENT AREA --- */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden min-h-[600px]">
           <div className="overflow-x-auto">
              <table className={`w-full ${language === 'ar' ? 'text-right' : 'text-left'} whitespace-nowrap`}>
                <thead className="bg-slate-50/50 border-b border-slate-100">
                  <tr className="text-slate-400 text-[10px] uppercase tracking-widest font-black">
                    <th className="px-8 py-5">{cur.table.ref}</th>
                    <th className="px-8 py-5">{cur.table.client}</th>
                    <th className="px-8 py-5">{cur.table.source}</th>
                    <th className={`px-8 py-5 ${language === 'ar' ? 'text-left' : 'text-right'} bg-slate-100/30 text-slate-900`}>{cur.table.total}</th>
                    <th className="px-8 py-5 text-center">{cur.table.status}</th>
                    <th className="px-8 py-5 text-center">{cur.table.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {loading ? (
                      <tr><td colSpan="6" className="p-20 text-center animate-pulse font-black text-slate-400 uppercase tracking-widest">{cur.loadingText}</td></tr>
                    ) : filteredInvoices.length === 0 ? (
                    <tr><td colSpan="6" className="p-20 text-center text-slate-400 font-bold uppercase tracking-widest italic">No Data Records Found</td></tr>
                  ) : filteredInvoices.map(inv => (
                    <tr key={inv.id} className="hover:bg-slate-50/50 transition-all group">
                      <td className="px-8 py-6">
                        <div className="flex flex-col">
                          <span className="font-black font-mono text-emerald-600 text-sm group-hover:text-emerald-700 transition-colors">{inv.invoice_no}</span>
                          <span className="text-[10px] text-slate-400 font-bold mt-1">{new Date(inv.issue_date).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <span className="font-black text-slate-900 text-sm">{clients.find(c => c.id === inv.client_id)?.name || 'N/A'}</span>
                      </td>
                      <td className="px-8 py-6">
                        <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-lg text-[9px] font-black uppercase tracking-widest border border-slate-200">
                          {inv.source_module === 'General' ? cur.modal.sourceOptions.general : inv.source_module === 'RealEstate' ? cur.modal.sourceOptions.realestate : cur.modal.sourceOptions.projects}
                        </span>
                      </td>
                      <td className={`px-8 py-6 font-black text-slate-900 font-mono text-lg bg-slate-50/30 ${language === 'ar' ? 'text-left' : 'text-right'}`}>
                        {Number(inv.total_amount).toLocaleString()}
                      </td>
                      <td className="px-8 py-6 text-center">
                        <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border shadow-sm ${inv.status === 'Paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                          {inv.status === 'Paid' ? cur.table.paid : cur.table.unpaid}
                        </span>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <button onClick={() => handlePrint(inv)} className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase hover:bg-slate-900 hover:text-white transition-all shadow-sm flex items-center gap-2 mx-auto active:scale-95">
                          <span>🖨️</span> {cur.table.print}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
           </div>
        </div>
      </div>

      {/* --- INVOICE MODAL --- */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
           <div className="bg-white w-full max-w-5xl rounded-[3rem] shadow-2xl border border-slate-200 overflow-hidden animate-scale-in max-h-[90vh] flex flex-col" dir={language === 'ar' ? 'rtl' : 'ltr'}>
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-600 text-white rounded-xl flex items-center justify-center text-xl shadow-lg shadow-emerald-500/20">📄</div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">{cur.modal.title}</h3>
                 </div>
                 <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-400 hover:text-rose-500 transition-all shadow-sm">✕</button>
              </div>
              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar text-right">
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="space-y-2 text-right">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{cur.modal.ref}</label>
                       <input type="text" value={formData.invoice_no} onChange={e => setFormData({...formData, invoice_no: e.target.value})} required className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black font-mono text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all shadow-inner" placeholder="INV-0000" />
                    </div>
                    <div className="space-y-2 text-right">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{cur.modal.client}</label>
                       <select value={formData.client_id} onChange={e => setFormData({...formData, client_id: e.target.value})} required className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all appearance-none cursor-pointer">
                          <option value="">-- Select --</option>
                          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                       </select>
                    </div>
                    <div className="space-y-2 text-right">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{cur.modal.source}</label>
                       <select value={formData.source_module} onChange={e => setFormData({...formData, source_module: e.target.value})} required className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all appearance-none cursor-pointer">
                          <option value="General">{cur.modal.sourceOptions.general}</option>
                          <option value="RealEstate">{cur.modal.sourceOptions.realestate}</option>
                          <option value="Projects">{cur.modal.sourceOptions.projects}</option>
                       </select>
                    </div>
                    {(formData.source_module === 'Projects' || formData.source_module === 'RealEstate') && (
                       <div className="col-span-full space-y-2 text-right animate-fade-in">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{language === 'ar' ? 'المشروع المرتبط' : 'Linked Project'}</label>
                          <select value={formData.project_id} onChange={e => setFormData({...formData, project_id: e.target.value})} required className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all appearance-none cursor-pointer">
                             <option value="">-- {language === 'ar' ? 'اختر المشروع' : 'Select Project'} --</option>
                             {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                       </div>
                    )}
                 </div>
                 <div className="space-y-6">
                    <div className="flex justify-between items-center px-2">
                       <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{cur.modal.itemsTitle}</h4>
                       <button type="button" onClick={addItem} className="text-[10px] font-black text-emerald-600 uppercase tracking-widest hover:text-emerald-700 transition-colors">{cur.modal.addItem}</button>
                    </div>
                    <div className="space-y-4 bg-slate-50/50 p-6 rounded-[2.5rem] border border-slate-100">
                       {formData.items.map((item, index) => (
                         <div key={index} className="grid grid-cols-12 gap-4 items-center animate-fade-in">
                            <div className="col-span-12 md:col-span-6">
                               <input type="text" placeholder={cur.modal.desc} value={item.description} onChange={e => handleItemChange(index, 'description', e.target.value)} className="w-full p-4 bg-white border-none rounded-2xl font-black text-slate-900 text-xs outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all shadow-sm" />
                            </div>
                            <div className="col-span-5 md:col-span-2">
                               <input type="number" placeholder={cur.modal.qty} value={item.quantity} onChange={e => handleItemChange(index, 'quantity', e.target.value)} className="w-full p-4 bg-white border-none rounded-2xl font-black text-center text-slate-900 outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all shadow-sm" />
                            </div>
                            <div className="col-span-5 md:col-span-3">
                               <input type="number" placeholder={cur.modal.price} value={item.unit_price} onChange={e => handleItemChange(index, 'unit_price', e.target.value)} className="w-full p-4 bg-white border-none rounded-2xl font-black text-center text-emerald-600 font-mono outline-none focus:ring-4 focus:ring-emerald-500/5 transition-all shadow-sm" />
                            </div>
                            <div className="col-span-2 md:col-span-1 flex justify-center">
                               <button type="button" onClick={() => removeItem(index)} className="w-10 h-10 flex items-center justify-center text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all">✕</button>
                            </div>
                         </div>
                       ))}
                    </div>
                 </div>
                 <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-10 pt-10 border-t border-slate-100">
                    <div className="w-full md:w-96 space-y-3 text-right">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{cur.modal.notes}</label>
                       <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full p-6 bg-slate-50 border-none rounded-3xl font-black text-slate-900 text-xs outline-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all h-32 shadow-inner" />
                    </div>
                    <div className={`flex flex-col ${language === 'ar' ? 'items-end' : 'items-start'}`}>
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">{cur.modal.totalNet}</p>
                       <div className="flex items-baseline gap-4">
                          <span className="text-6xl font-black text-slate-900 tracking-tighter font-mono">{formData.items.reduce((sum, i) => sum + (i.quantity * i.unit_price), 0).toLocaleString()}</span>
                          <span className="text-xl font-black text-slate-300 uppercase tracking-widest">LCY</span>
                       </div>
                    </div>
                 </div>
                 <button type="submit" className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black text-xl hover:bg-slate-800 transition-all shadow-2xl shadow-slate-900/20 flex items-center justify-center gap-4 active:scale-[0.98] mt-4">{cur.modal.submit}</button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}

function PrintView({ invoice, clients, projects, t, language }) {
  const cur = t;
  const client = clients.find(c => c.id === invoice.client_id);
  const project = projects.find(p => p.id === invoice.project_id);
  const isMasterBuilder = project?.company && (project.company.toUpperCase().includes('MASTER BUILDER') || project.company.includes('ماستر بيلدر'));
  return (
    <div className="bg-white p-20 min-h-screen font-sans print:p-0" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <div className={`flex justify-between items-start border-b-8 border-slate-900 pb-10 mb-10 ${language === 'en' ? 'flex-row-reverse' : ''}`}>
         <div className={language === 'ar' ? 'text-right' : 'text-left'}>
            {isMasterBuilder ? (
               <img src="/master_builder_logo.png" alt="Master Builder" className="h-16 w-auto object-contain mb-2" />
            ) : (
               <h1 className="text-5xl font-black text-slate-900 mb-2 tracking-tighter uppercase">PRIMEMED PHARMA ERP</h1>
            )}
            <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-xs">{cur.taxInvoice}</p>
         </div>
         <div className={language === 'ar' ? 'text-left' : 'text-right'}>
            <div className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black font-mono text-xl mb-4 inline-block">{invoice.invoice_no}</div>
            <p className="text-slate-500 font-bold text-sm">{cur.date}: {new Date(invoice.issue_date).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}</p>
         </div>
      </div>
      <div className="grid grid-cols-2 gap-20 mb-20">
         <div className="p-10 bg-slate-50 rounded-[2.5rem] border border-slate-100">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">{cur.clientInfo}</h4>
            <h3 className="text-3xl font-black text-slate-900 mb-3">{client?.name}</h3>
            <div className="space-y-1">
               <p className="font-bold text-slate-500 text-sm">{client?.email || 'N/A'}</p>
               <p className="font-bold text-slate-500 text-sm">{client?.phone || 'N/A'}</p>
            </div>
         </div>
         <div className="p-10 bg-slate-50 rounded-[2.5rem] border border-slate-100">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">{cur.projectInfo}</h4>
            <h3 className="text-3xl font-black text-slate-900 mb-3">{project?.name || cur.genericSales}</h3>
            <p className="font-bold text-slate-500 text-sm">{project?.code || cur.genericRef}</p>
         </div>
      </div>
      <table className="w-full mb-20 border-collapse">
         <thead>
            <tr className="bg-slate-900 text-white">
               <th className={`p-6 font-black ${language === 'ar' ? 'text-right rounded-r-2xl' : 'text-left rounded-l-2xl'}`}>{cur.tableDesc}</th>
               <th className="p-6 text-center font-black">{cur.tableQty}</th>
               <th className="p-6 text-center font-black">{cur.tablePrice}</th>
               <th className={`p-6 font-black ${language === 'ar' ? 'text-left rounded-l-2xl' : 'text-right rounded-r-2xl'}`}>{cur.tableTotal}</th>
            </tr>
         </thead>
         <tbody className="divide-y divide-slate-100">
            {invoice.items ? JSON.parse(invoice.items).map((item, idx) => (
              <tr key={idx}>
                 <td className="p-6 font-bold text-slate-800">{item.description}</td>
                 <td className="p-6 text-center font-black font-mono">{Number(item.quantity).toLocaleString()}</td>
                 <td className="p-6 text-center font-black font-mono">{Number(item.unit_price).toLocaleString()}</td>
                 <td className={`p-6 font-black font-mono text-xl text-slate-900 ${language === 'ar' ? 'text-left' : 'text-right'}`}>{ (item.quantity * item.unit_price).toLocaleString() }</td>
              </tr>
            )) : (
              <tr>
                 <td className="p-6 font-bold text-slate-800">{cur.genericSales}</td>
                 <td className="p-6 text-center font-black font-mono">1</td>
                 <td className="p-6 text-center font-black font-mono">{Number(invoice.total_amount).toLocaleString()}</td>
                 <td className={`p-6 font-black font-mono text-xl text-slate-900 ${language === 'ar' ? 'text-left' : 'text-right'}`}>{Number(invoice.total_amount).toLocaleString()}</td>
              </tr>
            )}
         </tbody>
      </table>
      <div className={`flex ${language === 'ar' ? 'justify-end pr-20' : 'justify-start pl-20'}`}>
         <div className="w-96 space-y-6">
            <div className={`flex justify-between items-center font-bold text-slate-400 ${language === 'en' ? 'flex-row-reverse' : ''}`}>
               <span className="uppercase tracking-widest text-[10px]">{cur.summaryTotal}</span>
               <span className="font-mono">{Number(invoice.total_amount).toLocaleString()}</span>
            </div>
            <div className={`flex justify-between items-center font-black text-4xl pt-6 border-t-8 border-slate-900 ${language === 'en' ? 'flex-row-reverse' : ''}`}>
               <span className="tracking-tighter">{cur.grandTotal}</span>
               <div className="flex items-baseline gap-2">
                  <span className="font-mono">{Number(invoice.total_amount).toLocaleString()}</span>
                  <span className="text-sm font-black text-slate-300">LCY</span>
               </div>
            </div>
         </div>
      </div>
      <div className="mt-40 pt-10 border-t border-slate-100 text-center space-y-2">
         <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-[10px]">{isMasterBuilder ? "Thank you for choosing MASTER BUILDER HOUSING & CONTRACTING" : cur.footer1}</p>
         <p className="text-slate-900 font-black text-sm">{cur.footer2}</p>
      </div>
    </div>
  );
}
