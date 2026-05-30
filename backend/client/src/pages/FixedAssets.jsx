import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

export default function FixedAssets() {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState('registry'); // registry, categories, logs, operations, maintenance
  const [loading, setLoading] = useState(true);
  const [assets, setAssets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [projects, setProjects] = useState([]);
  const [logs, setLogs] = useState([]);
  const [operations, setOperations] = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [summary, setSummary] = useState({ totalCost: 0, totalBookValue: 0 });
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [isDepModalOpen, setIsDepModalOpen] = useState(false);
  const [isOpsModalOpen, setIsOpsModalOpen] = useState(false);
  const [isMaintModalOpen, setIsMaintModalOpen] = useState(false);
  const [isCompleteMaintModalOpen, setIsCompleteMaintModalOpen] = useState(false);
  const [selectedMaintId, setSelectedMaintId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [detailModal, setDetailModal] = useState({ isOpen: false, asset: null });

  // Forms
  const [assetForm, setAssetForm] = useState({
    name: '', category_id: '', purchase_date: new Date().toISOString().split('T')[0],
    purchase_cost: '', scrap_value: 0, location_id: '', asset_code: '', project_id: ''
  });
  
  const [opsForm, setOpsForm] = useState({
    asset_id: '', date: new Date().toISOString().split('T')[0],
    hourmeter_reading: '', odometer_reading: '', fuel_liters: '', fuel_cost: '',
    operator_name: '', project_name: '', notes: ''
  });

  const [maintForm, setMaintForm] = useState({
    asset_id: '', service_date: new Date().toISOString().split('T')[0],
    service_type: 'Preventive', description: '', service_cost: '', parts_used: ''
  });

  const [completeMaintForm, setCompleteMaintForm] = useState({
    completed_date: new Date().toISOString().split('T')[0], actual_cost: '', payment_method: 'Cash'
  });

  const [depPeriod, setDepPeriod] = useState(new Date().toISOString().slice(5, 7) + '-' + new Date().getFullYear());

  const t = {
    ar: {
      title: "إدارة الأصول الثابتة",
      subtitle: "النظام المركزي لمتابعة الأصول الرأسمالية والاحتسابات الضريبية",
      tabs: {
        registry: "سجل الأصول",
        categories: "تصنيفات الأصول",
        logs: "سجل الإهلاك",
        operations: "تشغيل المعدات",
        maintenance: "صيانة المعدات"
      },
      stats: {
        totalCost: "إجمالي قيمة الأصول",
        bookValue: "القيمة الدفترية الحالية",
        accumulatedDep: "مجمع الإهلاك المتراكم"
      },
      actions: {
        search: "البحث في الأصول (الاسم، الكود، الموقع)...",
        depWizard: "معالج الإهلاك",
        addAsset: "إضافة أصل جديد"
      },
      table: {
        code: "الكود",
        asset: "الأصل الرأسمالي",
        date: "تاريخ الاقتناء",
        cost: "التكلفة (LCY)",
        book: "الدفترية (LCY)",
        status: "الموقع / الحالة"
      },
      categoriesTab: {
        depMethod: "طريقة الإهلاك",
        life: "العمر الإنتاجي",
        edit: "تعديل الإعدادات →"
      },
      logsTab: {
        ref: "رقم القيد",
        period: "الفترة المحاسبية",
        amt: "قيمة الإهلاك (LCY)",
        date: "تاريخ التنفيذ",
        by: "بواسطة"
      },
      modalAsset: {
        title: "تسجيل أصل رأسمالي",
        desc: "وصف الأصل / المسمى",
        code: "كود الأصل (Serial/Tag)",
        cat: "التصنيف المحاسبي",
        cost: "قيمة الاقتناء (LCY)",
        date: "تاريخ الشراء / التفعيل",
        save: "ترحيل وحفظ البيانات"
      },
      modalDep: {
        title: "معالج الإهلاك الدوري",
        desc: "سيتم حساب قيمة الإهلاك لكافة الأصول للفترة المحددة وتوليد القيود المحاسبية المقابلة آلياً في دفتر الأستاذ.",
        period: "فترة المعالجة (MM-YYYY)",
        cancel: "إلغاء",
        run: "تشغيل المعالجة 🚀"
      },
      loadingText: "جاري تحميل سجل الأصول والاستثمارات...",
      empty: "لا توجد سجلات لعرضها حالياً."
    },
    en: {
      title: "Fixed Assets Management",
      subtitle: "Centralized system for tracking capital assets and fiscal depreciation",
      tabs: {
        registry: "Asset Registry",
        categories: "Categories",
        logs: "Depreciation Logs",
        operations: "Equipment Ops",
        maintenance: "Equipment Maintenance"
      },
      stats: {
        totalCost: "Total Asset Cost",
        bookValue: "Current Book Value",
        accumulatedDep: "Accumulated Depreciation"
      },
      actions: {
        search: "Search assets (Name, Code, Location)...",
        depWizard: "Depreciation Wizard",
        addAsset: "New Asset"
      },
      table: {
        code: "Code",
        asset: "Capital Asset",
        date: "Acquisition Date",
        cost: "Cost (LCY)",
        book: "Book Value (LCY)",
        status: "Location / Status"
      },
      categoriesTab: {
        depMethod: "Dep. Method",
        life: "Useful Life",
        edit: "Edit Settings →"
      },
      logsTab: {
        ref: "Entry Ref",
        period: "Fiscal Period",
        amt: "Dep. Amount (LCY)",
        date: "Executed At",
        by: "Executed By"
      },
      modalAsset: {
        title: "Register Capital Asset",
        desc: "Asset Description / Name",
        code: "Asset Code (Serial/Tag)",
        cat: "Accounting Category",
        cost: "Acquisition Cost (LCY)",
        date: "Purchase / Activation Date",
        save: "Post & Save Asset"
      },
      modalDep: {
        title: "Periodic Depreciation Wizard",
        desc: "The system will calculate depreciation for all assets for the selected period and generate corresponding ledger entries automatically.",
        period: "Processing Period (MM-YYYY)",
        cancel: "Cancel",
        run: "Run Processing 🚀"
      },
      loadingText: "Loading asset and investment registry...",
      empty: "No records found to display."
    }
  };
  const cur = t[language === 'en' ? 'en' : 'ar'];

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const catRes = await api.get('/table/asset_categories?limit=100');
      setCategories(catRes.data.data || []);
      
      const assetsRes = await api.get('/table/fixed_assets?limit=500');
      const assetsData = assetsRes.data.data || [];
      setAssets(assetsData);

      if (activeTab === 'registry') {
        const totalCost = assetsData.reduce((sum, a) => sum + Number(a.purchase_cost), 0);
        const totalBookValue = assetsData.reduce((sum, a) => sum + Number(a.current_book_value), 0);
        setSummary({ totalCost, totalBookValue });
      } else if (activeTab === 'logs') {
        const res = await api.get('/table/asset_depreciation_logs?limit=500');
        setLogs(res.data.data || []);
      } else if (activeTab === 'operations') {
        const res = await api.get('/table/equipment_operations?limit=500');
        setOperations(res.data.data || []);
      } else if (activeTab === 'maintenance') {
        const res = await api.get('/table/equipment_maintenance?limit=500');
        setMaintenance(res.data.data || []);
      }
      const projRes = await api.get('/table/projects?limit=100');
      setProjects(projRes.data.data || []);
    } catch (error) { console.error(error); } 
    finally { setLoading(false); }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post('/assets/register', assetForm);
      alert(cur.alerts?.success || (language === 'ar' ? "تم تسجيل الأصل بنجاح!" : "Asset registered successfully!"));
      setIsAssetModalOpen(false);
      fetchData();
    } catch (error) { alert(error.response?.data?.error || "Error"); } 
    finally { setIsSubmitting(false); }
  };

  const handleLogOperation = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post('/equipment/operations', opsForm);
      alert(language === 'ar' ? "تم تسجيل تشغيل المعدة بنجاح!" : "Operation logged successfully!");
      setIsOpsModalOpen(false);
      fetchData();
    } catch (error) { alert(error.response?.data?.error || "Error"); }
    finally { setIsSubmitting(false); }
  };

  const handleScheduleMaintenance = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post('/equipment/maintenance', maintForm);
      alert(language === 'ar' ? "تم جدولة الصيانة بنجاح!" : "Maintenance scheduled successfully!");
      setIsMaintModalOpen(false);
      fetchData();
    } catch (error) { alert(error.response?.data?.error || "Error"); }
    finally { setIsSubmitting(false); }
  };

  const handleCompleteMaintenance = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post(`/equipment/maintenance/${selectedMaintId}/complete`, completeMaintForm);
      alert(language === 'ar' ? "تم إكمال الصيانة وتسجيل القيود بنجاح!" : "Maintenance completed successfully!");
      setIsCompleteMaintModalOpen(false);
      fetchData();
    } catch (error) { alert(error.response?.data?.error || "Error"); }
    finally { setIsSubmitting(false); }
  };

  const handleRunDepreciation = async () => {
    const confirmMsg = language === 'ar' 
      ? `هل أنت متأكد من ترحيل إهلاك شهر ${depPeriod}؟ سيقوم النظام بتوليد قيود محاسبية آلياً.`
      : `Are you sure you want to post depreciation for ${depPeriod}? The system will generate ledger entries automatically.`;
    if (!window.confirm(confirmMsg)) return;
    setIsSubmitting(true);
    try {
      const res = await api.post('/assets/run-depreciation', { period: depPeriod });
      alert(res.data.message);
      setIsDepModalOpen(false);
      fetchData();
    } catch (error) { alert(error.response?.data?.error || "Error"); } 
    finally { setIsSubmitting(false); }
  };

  const openAssetAudit = (asset) => {
    setDetailModal({ isOpen: true, asset });
  };

  const filteredAssets = assets.filter(a => 
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.asset_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-[#f8fafc]/50 min-h-screen p-4 sm:p-10 space-y-10" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      
      {/* --- ASSET STRATEGIC AUDIT MODAL (ELITE UI) --- */}
      {detailModal.isOpen && detailModal.asset && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl" onClick={() => setDetailModal({ isOpen: false, asset: null })}></div>
          <div className="bg-white w-full max-w-5xl rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden border border-white/20 animate-in slide-in-from-bottom-10 duration-500 flex flex-col max-h-[90vh]">
            
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
               <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-slate-950 text-white rounded-2xl flex items-center justify-center text-3xl shadow-xl shadow-slate-900/30">🏢</div>
                  <div>
                     <h3 className="text-2xl font-black text-slate-900 tracking-tighter uppercase">{detailModal.asset.name}</h3>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Lifecycle Asset Audit • Code {detailModal.asset.asset_code}</p>
                  </div>
               </div>
               <button onClick={() => setDetailModal({ isOpen: false, asset: null })} className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-xl hover:bg-rose-50 hover:text-rose-500 hover:border-rose-100 transition-all shadow-sm active:scale-90">✕</button>
            </div>

            <div className="p-10 overflow-y-auto custom-scrollbar flex-1 bg-white space-y-12">
               <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="bg-slate-900 p-8 rounded-[2rem] text-white">
                     <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Initial Acquisition Cost</p>
                     <p className="text-3xl font-black font-mono tracking-tighter">{Number(detailModal.asset.purchase_cost).toLocaleString()}</p>
                     <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mt-2">Validated LCY</p>
                  </div>
                  <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-200">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Current Book Value</p>
                     <p className="text-3xl font-black font-mono tracking-tighter text-emerald-600">{Number(detailModal.asset.current_book_value).toLocaleString()}</p>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Active Valuation</p>
                  </div>
                  <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-200">
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Accumulated Depreciation</p>
                     <p className="text-3xl font-black font-mono tracking-tighter text-rose-500">{(Number(detailModal.asset.purchase_cost) - Number(detailModal.asset.current_book_value)).toLocaleString()}</p>
                     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Fiscal Erosion</p>
                  </div>
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  <div className="bg-slate-50 rounded-[2rem] p-8 border border-slate-200">
                     <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8">Technical Parameters</h4>
                     <div className="space-y-6">
                        <div className="flex justify-between items-center border-b border-slate-200 pb-4">
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Asset Category</span>
                           <span className="font-bold text-slate-900">{categories.find(c => c.id === detailModal.asset.category_id)?.category_name || 'Generic'}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-slate-200 pb-4">
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Operational Location</span>
                           <span className="font-bold text-slate-900">{projects.find(p => p.id === detailModal.asset.project_id)?.name || detailModal.asset.location_id || 'HQ Central'}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-slate-200 pb-4">
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Acquisition Node</span>
                           <span className="font-bold text-slate-900">{new Date(detailModal.asset.purchase_date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status Vector</span>
                           <span className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${detailModal.asset.status === 'Active' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-200 text-slate-500'}`}>{detailModal.asset.status}</span>
                        </div>
                     </div>
                  </div>

                  <div className="bg-slate-950 rounded-[2rem] p-8 text-white relative overflow-hidden">
                     <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl"></div>
                     <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-8">Asset Persistence (JSON)</h4>
                     <pre className="text-[10px] font-mono text-emerald-400/80 max-h-[250px] overflow-y-auto custom-scrollbar-dark">
                        {JSON.stringify(detailModal.asset, null, 4)}
                     </pre>
                  </div>
               </div>
            </div>

            <div className="p-8 bg-slate-950 flex justify-between items-center border-t border-white/5 relative">
               <p className="text-white/40 font-black text-[10px] uppercase tracking-widest">TED ERP • FIXED ASSET INTELLIGENCE NODE</p>
               <div className="flex gap-4">
                  <button className="px-6 py-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all">Print Tag</button>
                  <button className="px-6 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[10px] font-black uppercase tracking-widest shadow-xl shadow-rose-900/20 transition-all">Decommission Asset</button>
               </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-[1600px] mx-auto space-y-10">
        
        {/* --- HEADER --- */}
        <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-center gap-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full -translate-y-32 translate-x-32 blur-3xl opacity-50"></div>
          
            <div className="flex items-center gap-6 relative z-10">
            <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center text-3xl shadow-xl shadow-slate-900/20 transform -rotate-6">🏢</div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">{cur.title}</h1>
                <span className="bg-slate-900 text-white px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg shadow-slate-900/10">ASSET-MG</span>
              </div>
              <p className="text-slate-400 font-bold text-sm mt-1">{cur.subtitle}</p>
            </div>
          </div>

          <div className="bg-slate-100/50 p-1.5 rounded-2xl border border-slate-200 flex gap-1 relative z-10">
            {Object.keys(cur.tabs).map(tab => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)} 
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs transition-all duration-200 whitespace-nowrap ${
                  activeTab === tab 
                  ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10' 
                  : 'text-slate-500 hover:bg-white hover:text-slate-900'
                }`}
              >
                <span>{tab === 'registry' ? '📋' : tab === 'categories' ? '📁' : tab === 'operations' ? '⚙️' : tab === 'maintenance' ? '🔧' : '⚖️'}</span> {cur.tabs[tab]}
              </button>
            ))}
          </div>
        </div>

        {/* --- STATS GRID --- */}
        {activeTab === 'registry' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <StatCard title={cur.stats.totalCost} value={summary.totalCost} type="cost" icon="💰" />
            <StatCard title={cur.stats.bookValue} value={summary.totalBookValue} type="book" icon="📊" />
            <StatCard title={cur.stats.accumulatedDep} value={summary.totalCost - summary.totalBookValue} type="dep" icon="📉" />
          </div>
        )}

        {/* --- ACTION BAR --- */}
        <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-6">
          <div className="relative w-full sm:w-[400px]">
            <input 
              type="text" 
              placeholder={cur.actions.search} 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-12 pl-4 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-slate-900/5 transition-all shadow-inner" 
            />
            <span className={`absolute ${language === 'ar' ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-slate-400 text-lg`}>🔍</span>
          </div>
          
          <div className="flex gap-4 w-full sm:w-auto">
            {activeTab === 'operations' ? (
              <button onClick={() => setIsOpsModalOpen(true)} className="flex-1 sm:flex-none px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20 flex items-center justify-center gap-3 active:scale-95">
                <span className="text-lg leading-none">+</span> {language === 'ar' ? 'تسجيل تشغيل معدة' : 'Log Equipment Ops'}
              </button>
            ) : activeTab === 'maintenance' ? (
              <button onClick={() => setIsMaintModalOpen(true)} className="flex-1 sm:flex-none px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20 flex items-center justify-center gap-3 active:scale-95">
                <span className="text-lg leading-none">+</span> {language === 'ar' ? 'جدولة صيانة معدة' : 'Schedule Maintenance'}
              </button>
            ) : (
              <>
                <button onClick={() => setIsDepModalOpen(true)} className="flex-1 sm:flex-none px-8 py-4 bg-white border border-slate-200 text-slate-700 rounded-2xl font-black text-xs hover:bg-slate-50 transition-all shadow-sm flex items-center justify-center gap-3 active:scale-95">
                  <span>🔄</span> {cur.actions.depWizard}
                </button>
                <button onClick={() => setIsAssetModalOpen(true)} className="flex-1 sm:flex-none px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20 flex items-center justify-center gap-3 active:scale-95">
                  <span className="text-lg leading-none">+</span> {cur.actions.addAsset}
                </button>
              </>
            )}
          </div>
        </div>

        {/* --- MAIN CONTENT AREA --- */}
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-visible relative min-h-[600px]">
          {activeTab === 'registry' && (
            <div className="overflow-x-auto custom-scrollbar">
               <table className={`w-full ${language === 'ar' ? 'text-right' : 'text-left'} whitespace-nowrap`}>
                <thead className="bg-slate-50/50 border-b border-slate-100 rounded-t-[2rem]">
                  <tr className="text-slate-400 text-[10px] uppercase tracking-widest">
                    <th className="px-8 py-5 font-black">{cur.table.code}</th>
                    <th className="px-8 py-5 font-black">{cur.table.asset}</th>
                    <th className="px-8 py-5 font-black">{cur.table.date}</th>
                    <th className={`px-8 py-5 font-black ${language === 'ar' ? 'text-left' : 'text-right'}`}>{cur.table.cost}</th>
                    <th className={`px-8 py-5 font-black bg-slate-100/30 text-slate-900 ${language === 'ar' ? 'text-left' : 'text-right'}`}>{cur.table.book}</th>
                    <th className="px-8 py-5 font-black">{cur.table.status}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr><td colSpan="6" className="p-20 text-center text-slate-400 font-bold animate-pulse">{cur.loadingText}</td></tr>
                  ) : filteredAssets.length === 0 ? (
                    <tr><td colSpan="6" className="p-20 text-center text-slate-400 font-bold">{cur.empty}</td></tr>
                  ) : filteredAssets.map(asset => (
                    <tr key={asset.id} className="hover:bg-slate-50/50 transition-all group cursor-pointer" onClick={() => openAssetAudit(asset)}>
                      <td className="px-8 py-6">
                        <span className="font-mono text-[10px] font-black text-slate-400 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200/50">{asset.asset_code}</span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col">
                          <span className="font-black text-slate-900 text-sm group-hover:text-slate-600 transition-colors">{asset.name}</span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-1">{categories.find(c => c.id === asset.category_id)?.category_name || 'Generic'}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6 font-bold text-slate-500 text-xs">{new Date(asset.purchase_date).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}</td>
                      <td className={`px-8 py-6 font-black text-slate-400 font-mono text-sm ${language === 'ar' ? 'text-left' : 'text-right'}`}>{Number(asset.purchase_cost).toLocaleString()}</td>
                      <td className={`px-8 py-6 font-black text-emerald-600 font-mono text-lg bg-slate-50/30 ${language === 'ar' ? 'text-left' : 'text-right'}`}>{Number(asset.current_book_value).toLocaleString()}</td>
                      <td className="px-8 py-6">
                        <div className={`flex items-center gap-4 ${language === 'ar' ? 'justify-end' : 'justify-start'}`}>
                          <div className={`flex flex-col ${language === 'ar' ? 'items-end' : 'items-start'}`}>
                            <span className="text-xs font-black text-slate-700">{projects.find(p => p.id === asset.project_id)?.name || asset.location_id || 'HQ'}</span>
                            <span className={`text-[9px] font-black uppercase tracking-[0.2em] mt-1 ${asset.status === 'Active' ? 'text-emerald-500' : 'text-slate-300'}`}>{asset.status === 'Active' ? 'Operational' : 'Retired'}</span>
                          </div>
                          <div className={`w-3 h-3 rounded-full shadow-sm ${asset.status === 'Active' ? 'bg-emerald-400 shadow-emerald-500/20 animate-pulse' : 'bg-slate-200'}`}></div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'categories' && (
            <div className="p-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 animate-fade-in">
               {categories.map(cat => (
                 <div key={cat.id} className="p-8 bg-slate-50/50 border border-slate-200 rounded-[2rem] hover:bg-white hover:shadow-xl hover:shadow-slate-200/50 transition-all group relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-6 text-4xl opacity-[0.05] group-hover:scale-125 transition-transform">📁</div>
                    <h4 className="text-xl font-black text-slate-900 mb-8 border-b border-slate-100 pb-4">{cat.category_name}</h4>
                    <div className="space-y-6">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{cur.categoriesTab.depMethod}</span>
                        <span className="px-3 py-1 bg-slate-900 text-white rounded-lg text-[9px] font-black uppercase tracking-tighter">{cat.depreciation_method}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{cur.categoriesTab.life}</span>
                        <span className="font-black text-slate-900 text-sm font-mono">{cat.useful_life_months} Month</span>
                      </div>
                    </div>
                    <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
                       <button className="text-[10px] font-black text-slate-300 uppercase tracking-widest hover:text-slate-900 transition-colors">{cur.categoriesTab.edit}</button>
                    </div>
                 </div>
               ))}
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="overflow-x-auto custom-scrollbar animate-fade-in">
              <table className={`w-full ${language === 'ar' ? 'text-right' : 'text-left'} whitespace-nowrap`}>
                <thead className="bg-slate-50/50 border-b border-slate-100">
                  <tr className="text-slate-400 text-[10px] uppercase tracking-widest">
                    <th className="px-8 py-5 font-black">{cur.logsTab.ref}</th>
                    <th className="px-8 py-5 font-black">{cur.logsTab.period}</th>
                    <th className="px-8 py-5 font-black">{cur.logsTab.amt}</th>
                    <th className="px-8 py-5 font-black">{cur.logsTab.date}</th>
                    <th className="px-8 py-5 font-black">{cur.logsTab.by}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {logs.length === 0 ? (
                    <tr><td colSpan="5" className="p-20 text-center text-slate-400 font-bold">{cur.empty}</td></tr>
                  ) : logs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-all">
                      <td className="px-8 py-6 font-mono text-[10px] font-black text-slate-400">#DEP-{log.id}</td>
                      <td className="px-8 py-6">
                        <span className="px-3 py-1 bg-slate-100 text-slate-900 rounded-lg text-[10px] font-black border border-slate-200">{log.period}</span>
                      </td>
                      <td className="px-8 py-6 font-black text-rose-500 font-mono text-sm">{Number(log.amount).toLocaleString()}</td>
                      <td className="px-8 py-6 font-bold text-slate-500 text-xs">{new Date(log.created_at).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')}</td>
                      <td className="px-8 py-6 font-black text-slate-400 text-[10px] uppercase tracking-widest">{log.created_by || 'System'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'operations' && (
            <div className="overflow-x-auto custom-scrollbar animate-fade-in">
              <table className={`w-full ${language === 'ar' ? 'text-right' : 'text-left'} whitespace-nowrap`}>
                <thead className="bg-slate-50/50 border-b border-slate-100">
                  <tr className="text-slate-400 text-[10px] uppercase tracking-widest">
                    <th className="px-8 py-5 font-black">{language === 'ar' ? 'المعدة' : 'Equipment'}</th>
                    <th className="px-8 py-5 font-black">{language === 'ar' ? 'التاريخ' : 'Date'}</th>
                    <th className="px-8 py-5 font-black">{language === 'ar' ? 'قراءة العداد (ساعة)' : 'Hourmeter (hrs)'}</th>
                    <th className="px-8 py-5 font-black">{language === 'ar' ? 'عداد المسافة (كم)' : 'Odometer (km)'}</th>
                    <th className="px-8 py-5 font-black">{language === 'ar' ? 'الوقود (لتر)' : 'Fuel (Ltrs)'}</th>
                    <th className="px-8 py-5 font-black">{language === 'ar' ? 'تكلفة الوقود' : 'Fuel Cost'}</th>
                    <th className="px-8 py-5 font-black">{language === 'ar' ? 'المشغل' : 'Operator'}</th>
                    <th className="px-8 py-5 font-black">{language === 'ar' ? 'الموقع/المشروع' : 'Location/Project'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {operations.length === 0 ? (
                    <tr><td colSpan="8" className="p-20 text-center text-slate-400 font-bold">{cur.empty}</td></tr>
                  ) : operations.map(op => (
                    <tr key={op.id} className="hover:bg-slate-50/50 transition-all text-xs font-bold text-slate-700">
                      <td className="px-8 py-6 text-slate-900 font-black">{assets.find(a => a.id === op.asset_id)?.name || `Asset #${op.asset_id}`}</td>
                      <td className="px-8 py-6">{new Date(op.date).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}</td>
                      <td className="px-8 py-6 font-mono">{Number(op.hourmeter_reading || 0).toLocaleString()} hrs</td>
                      <td className="px-8 py-6 font-mono">{Number(op.odometer_reading || 0).toLocaleString()} km</td>
                      <td className="px-8 py-6 font-mono">{Number(op.fuel_liters || 0).toLocaleString()} L</td>
                      <td className="px-8 py-6 font-mono text-emerald-600">{Number(op.fuel_cost || 0).toLocaleString()} LCY</td>
                      <td className="px-8 py-6">{op.operator_name || '-'}</td>
                      <td className="px-8 py-6">{op.project_name || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'maintenance' && (
            <div className="overflow-x-auto custom-scrollbar animate-fade-in">
              <table className={`w-full ${language === 'ar' ? 'text-right' : 'text-left'} whitespace-nowrap`}>
                <thead className="bg-slate-50/50 border-b border-slate-100">
                  <tr className="text-slate-400 text-[10px] uppercase tracking-widest">
                    <th className="px-8 py-5 font-black">{language === 'ar' ? 'المعدة' : 'Equipment'}</th>
                    <th className="px-8 py-5 font-black">{language === 'ar' ? 'تاريخ الخدمة' : 'Service Date'}</th>
                    <th className="px-8 py-5 font-black">{language === 'ar' ? 'نوع الصيانة' : 'Type'}</th>
                    <th className="px-8 py-5 font-black">{language === 'ar' ? 'الوصف' : 'Description'}</th>
                    <th className="px-8 py-5 font-black">{language === 'ar' ? 'التكلفة المقدرة/الفعيلة' : 'Cost'}</th>
                    <th className="px-8 py-5 font-black">{language === 'ar' ? 'القطع المستخدمة' : 'Parts Used'}</th>
                    <th className="px-8 py-5 font-black">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                    <th className="px-8 py-5 font-black">{language === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {maintenance.length === 0 ? (
                    <tr><td colSpan="8" className="p-20 text-center text-slate-400 font-bold">{cur.empty}</td></tr>
                  ) : maintenance.map(maint => (
                    <tr key={maint.id} className="hover:bg-slate-50/50 transition-all text-xs font-bold text-slate-700">
                      <td className="px-8 py-6 text-slate-900 font-black">{assets.find(a => a.id === maint.asset_id)?.name || `Asset #${maint.asset_id}`}</td>
                      <td className="px-8 py-6">{new Date(maint.service_date).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}</td>
                      <td className="px-8 py-6">
                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase ${
                          maint.service_type === 'Preventive' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                          maint.service_type === 'Breakdown' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                          'bg-amber-50 text-amber-600 border border-amber-100'
                        }`}>{maint.service_type}</span>
                      </td>
                      <td className="px-8 py-6 max-w-xs truncate" title={maint.description}>{maint.description || '-'}</td>
                      <td className="px-8 py-6 font-mono text-emerald-600">{Number(maint.service_cost || 0).toLocaleString()} LCY</td>
                      <td className="px-8 py-6 max-w-xs truncate">{maint.parts_used || '-'}</td>
                      <td className="px-8 py-6">
                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          maint.status === 'Completed' ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/10' : 'bg-slate-100 text-slate-500'
                        }`}>{maint.status}</span>
                      </td>
                      <td className="px-8 py-6">
                        {maint.status !== 'Completed' && (
                          <button
                            onClick={() => {
                              setSelectedMaintId(maint.id);
                              setCompleteMaintForm({
                                completed_date: new Date().toISOString().split('T')[0],
                                actual_cost: maint.service_cost || '',
                                payment_method: 'Cash'
                              });
                              setIsCompleteMaintModalOpen(true);
                            }}
                            className="px-4 py-1.5 bg-slate-900 text-white rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-slate-800 transition-all active:scale-95"
                          >
                            {language === 'ar' ? 'إكمال وتأكيد' : 'Complete'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* --- ASSET MODAL --- */}
      {isAssetModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
           <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden animate-scale-in">
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center text-xl shadow-lg">➕</div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">{cur.modalAsset.title}</h3>
                 </div>
                 <button onClick={() => setIsAssetModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-400 hover:text-slate-900 transition-all shadow-sm">✕</button>
              </div>
              <form onSubmit={handleRegister} className="p-10 space-y-10">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="md:col-span-2 space-y-3">
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">{cur.modalAsset.desc}</label>
                       <input type="text" value={assetForm.name} onChange={e => setAssetForm({...assetForm, name: e.target.value})} required className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all" />
                    </div>
                    <div className="space-y-3">
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">{cur.modalAsset.code}</label>
                       <input type="text" value={assetForm.asset_code} onChange={e => setAssetForm({...assetForm, asset_code: e.target.value})} required className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl font-black font-mono text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all" />
                    </div>
                    <div className="space-y-3">
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">{cur.modalAsset.cat}</label>
                       <select value={assetForm.category_id} onChange={e => setAssetForm({...assetForm, category_id: e.target.value})} required className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all appearance-none cursor-pointer">
                          <option value="">-- Select --</option>
                          {categories.map(c => <option key={c.id} value={c.id}>{c.category_name}</option>)}
                       </select>
                    </div>
                    <div className="space-y-3">
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">{cur.modalAsset.cost}</label>
                       <input type="number" value={assetForm.purchase_cost} onChange={e => setAssetForm({...assetForm, purchase_cost: e.target.value})} required className="w-full px-6 py-5 bg-slate-50 border-none rounded-2xl font-black font-mono text-slate-900 text-2xl outline-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all shadow-inner text-center" />
                    </div>
                    <div className="space-y-3">
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">{cur.modalAsset.date}</label>
                       <input type="date" value={assetForm.purchase_date} onChange={e => setAssetForm({...assetForm, purchase_date: e.target.value})} required className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all" />
                    </div>
                    <div className="space-y-3">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">{language === 'ar' ? 'المشروع المرتبط' : 'Linked Project'}</label>
                        <select value={assetForm.project_id} onChange={e => setAssetForm({...assetForm, project_id: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all appearance-none cursor-pointer">
                           <option value="">-- {language === 'ar' ? 'اختر المشروع' : 'Select Project'} --</option>
                           {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                    </div>
                 </div>
                 <button type="submit" disabled={isSubmitting} className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black text-xl hover:bg-slate-800 transition-all shadow-2xl shadow-slate-900/20 flex items-center justify-center gap-4 active:scale-[0.98]">
                    {isSubmitting ? <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div> : <>{cur.modalAsset.save}</>}
                 </button>
              </form>
           </div>
        </div>
      )}

      {/* --- DEPRECIATION MODAL --- */}
      {isDepModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[110] p-4">
           <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl p-12 text-center border border-slate-200 animate-scale-in">
              <div className="w-24 h-24 bg-slate-900 text-white rounded-[2rem] flex items-center justify-center text-5xl mx-auto mb-10 shadow-2xl shadow-slate-900/30 transform rotate-12">⚖️</div>
              <h3 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">{cur.modalDep.title}</h3>
              <p className="text-slate-400 font-bold text-sm mb-12 leading-relaxed">{cur.modalDep.desc}</p>
              <div className="mb-12 space-y-4">
                 <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">{cur.modalDep.period}</label>
                 <input type="text" value={depPeriod} onChange={e => setDepPeriod(e.target.value)} className="w-full bg-slate-50 border-none rounded-[2rem] py-6 text-center text-4xl font-black text-slate-900 outline-none focus:bg-white focus:ring-8 focus:ring-slate-900/5 transition-all shadow-inner" />
              </div>
            </div>
         </div>
      )}

      {/* --- EQUIPMENT OPERATIONS LOG MODAL --- */}
      {isOpsModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
           <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden animate-scale-in">
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center text-xl shadow-lg">⚙️</div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                      {language === 'ar' ? 'تسجيل تشغيل معدة' : 'Log Equipment Operation'}
                    </h3>
                 </div>
                 <button onClick={() => setIsOpsModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-400 hover:text-slate-900 transition-all shadow-sm">✕</button>
              </div>
              <form onSubmit={handleLogOperation} className="p-10 space-y-8">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{language === 'ar' ? 'اختر المعدة / الأصل' : 'Select Equipment / Asset'}</label>
                       <select value={opsForm.asset_id} onChange={e => setOpsForm({...opsForm, asset_id: e.target.value})} required className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-xl font-bold text-slate-900 outline-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all">
                          <option value="">-- {language === 'ar' ? 'اختر المعدة' : 'Select Equipment'} --</option>
                          {assets.map(a => <option key={a.id} value={a.id}>{a.name} ({a.asset_code})</option>)}
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{language === 'ar' ? 'التاريخ' : 'Date'}</label>
                       <input type="date" value={opsForm.date} onChange={e => setOpsForm({...opsForm, date: e.target.value})} required className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-xl font-bold text-slate-900 outline-none focus:bg-white" />
                    </div>
                    <div className="space-y-2">
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{language === 'ar' ? 'عداد الساعات' : 'Hourmeter (hrs)'}</label>
                       <input type="number" step="0.01" value={opsForm.hourmeter_reading} onChange={e => setOpsForm({...opsForm, hourmeter_reading: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-xl font-bold text-slate-900 outline-none focus:bg-white" />
                    </div>
                    <div className="space-y-2">
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{language === 'ar' ? 'عداد المسافة (كم)' : 'Odometer (km)'}</label>
                       <input type="number" step="0.01" value={opsForm.odometer_reading} onChange={e => setOpsForm({...opsForm, odometer_reading: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-xl font-bold text-slate-900 outline-none focus:bg-white" />
                    </div>
                    <div className="space-y-2">
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{language === 'ar' ? 'الوقود (لتر)' : 'Fuel Liters'}</label>
                       <input type="number" step="0.01" value={opsForm.fuel_liters} onChange={e => setOpsForm({...opsForm, fuel_liters: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-xl font-bold text-slate-900 outline-none focus:bg-white" />
                    </div>
                    <div className="space-y-2">
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{language === 'ar' ? 'تكلفة الوقود (LCY)' : 'Fuel Cost (LCY)'}</label>
                       <input type="number" step="0.01" value={opsForm.fuel_cost} onChange={e => setOpsForm({...opsForm, fuel_cost: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-xl font-bold text-slate-900 outline-none focus:bg-white" />
                    </div>
                    <div className="space-y-2">
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{language === 'ar' ? 'اسم المشغل' : 'Operator Name'}</label>
                       <input type="text" value={opsForm.operator_name} onChange={e => setOpsForm({...opsForm, operator_name: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-xl font-bold text-slate-900 outline-none focus:bg-white" />
                    </div>
                    <div className="space-y-2">
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{language === 'ar' ? 'اسم المشروع/الموقع' : 'Project/Location'}</label>
                       <input type="text" value={opsForm.project_name} onChange={e => setOpsForm({...opsForm, project_name: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-xl font-bold text-slate-900 outline-none focus:bg-white" />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{language === 'ar' ? 'ملاحظات' : 'Notes'}</label>
                       <textarea value={opsForm.notes} onChange={e => setOpsForm({...opsForm, notes: e.target.value})} rows="2" className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-xl font-bold text-slate-900 outline-none focus:bg-white resize-none" />
                    </div>
                 </div>
                 <button type="submit" disabled={isSubmitting} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-3">
                    {isSubmitting ? <div className="w-5 h-5 border-4 border-white/30 border-t-white rounded-full animate-spin"></div> : (language === 'ar' ? 'حفظ سجل التشغيل' : 'Save Operation Log')}
                 </button>
              </form>
           </div>
        </div>
      )}

      {/* --- SCHEDULE MAINTENANCE MODAL --- */}
      {isMaintModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
           <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden animate-scale-in">
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center text-xl shadow-lg">🔧</div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                      {language === 'ar' ? 'جدولة صيانة معدة' : 'Schedule Equipment Maintenance'}
                    </h3>
                 </div>
                 <button onClick={() => setIsMaintModalOpen(false)} className="w-10 h-10 flex items-center justify-center rounded-full bg-white border border-slate-200 text-slate-400 hover:text-slate-900 transition-all shadow-sm">✕</button>
              </div>
              <form onSubmit={handleScheduleMaintenance} className="p-10 space-y-8">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{language === 'ar' ? 'اختر المعدة / الأصل' : 'Select Equipment / Asset'}</label>
                       <select value={maintForm.asset_id} onChange={e => setMaintForm({...maintForm, asset_id: e.target.value})} required className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-xl font-bold text-slate-900 outline-none focus:bg-white">
                          <option value="">-- {language === 'ar' ? 'اختر المعدة' : 'Select Equipment'} --</option>
                          {assets.map(a => <option key={a.id} value={a.id}>{a.name} ({a.asset_code})</option>)}
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{language === 'ar' ? 'تاريخ الصيانة' : 'Service Date'}</label>
                       <input type="date" value={maintForm.service_date} onChange={e => setMaintForm({...maintForm, service_date: e.target.value})} required className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-xl font-bold text-slate-900 outline-none focus:bg-white" />
                    </div>
                    <div className="space-y-2">
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{language === 'ar' ? 'نوع الخدمة' : 'Service Type'}</label>
                       <select value={maintForm.service_type} onChange={e => setMaintForm({...maintForm, service_type: e.target.value})} required className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-xl font-bold text-slate-900 outline-none focus:bg-white">
                          <option value="Preventive">{language === 'ar' ? 'وقائية' : 'Preventive'}</option>
                          <option value="Breakdown">{language === 'ar' ? 'إصلاح أعطال' : 'Breakdown'}</option>
                          <option value="Inspection">{language === 'ar' ? 'فحص دوري' : 'Inspection'}</option>
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{language === 'ar' ? 'التكلفة المقدرة (LCY)' : 'Estimated Cost (LCY)'}</label>
                       <input type="number" value={maintForm.service_cost} onChange={e => setMaintForm({...maintForm, service_cost: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-xl font-bold text-slate-900 outline-none focus:bg-white" />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{language === 'ar' ? 'وصف العمل المطلوبة' : 'Description of Maintenance'}</label>
                       <textarea value={maintForm.description} onChange={e => setMaintForm({...maintForm, description: e.target.value})} rows="2" className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-xl font-bold text-slate-900 outline-none focus:bg-white resize-none" />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{language === 'ar' ? 'قطع الغيار المستخدمة / المطلوبة' : 'Parts Used / Needed'}</label>
                       <input type="text" value={maintForm.parts_used} onChange={e => setMaintForm({...maintForm, parts_used: e.target.value})} className="w-full px-5 py-3.5 bg-slate-50 border-none rounded-xl font-bold text-slate-900 outline-none focus:bg-white" />
                    </div>
                 </div>
                 <button type="submit" disabled={isSubmitting} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-black text-lg hover:bg-slate-800 transition-all flex items-center justify-center gap-3">
                    {isSubmitting ? <div className="w-5 h-5 border-4 border-white/30 border-t-white rounded-full animate-spin"></div> : (language === 'ar' ? 'جدولة الصيانة' : 'Schedule Maintenance')}
                 </button>
              </form>
           </div>
        </div>
      )}

      {/* --- COMPLETE MAINTENANCE MODAL --- */}
      {isCompleteMaintModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[110] p-4">
           <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl p-12 text-center border border-slate-200 animate-scale-in">
              <div className="w-20 h-20 bg-emerald-500 text-white rounded-[2rem] flex items-center justify-center text-4xl mx-auto mb-8 shadow-xl shadow-emerald-500/20 transform rotate-12">✓</div>
              <h3 className="text-2xl font-black text-slate-900 mb-2 tracking-tight">
                {language === 'ar' ? 'تأكيد وإكمال الصيانة' : 'Complete Maintenance'}
              </h3>
              <p className="text-slate-400 font-bold text-xs mb-8">
                {language === 'ar' ? 'يرجى إدخال التكلفة الفعلية وتاريخ الانتهاء لتوليد القيود المحاسبية للمصروف.' : 'Provide the actual completion date and final cost to post to accounting.'}
              </p>
              <form onSubmit={handleCompleteMaintenance} className="space-y-6 text-left">
                 <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{language === 'ar' ? 'تاريخ الانتهاء الفعلي' : 'Completed Date'}</label>
                    <input type="date" value={completeMaintForm.completed_date} onChange={e => setCompleteMaintForm({...completeMaintForm, completed_date: e.target.value})} required className="w-full px-5 py-3 bg-slate-50 border-none rounded-xl font-bold text-slate-900 outline-none" />
                 </div>
                 <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{language === 'ar' ? 'التكلفة الفعلية (LCY)' : 'Actual Cost (LCY)'}</label>
                    <input type="number" value={completeMaintForm.actual_cost} onChange={e => setCompleteMaintForm({...completeMaintForm, actual_cost: e.target.value})} required className="w-full px-5 py-3 bg-slate-50 border-none rounded-xl font-bold text-slate-900 outline-none text-lg text-center font-mono" />
                 </div>
                 <div className="space-y-2">
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{language === 'ar' ? 'طريقة الدفع' : 'Payment Method'}</label>
                    <select value={completeMaintForm.payment_method} onChange={e => setCompleteMaintForm({...completeMaintForm, payment_method: e.target.value})} className="w-full px-5 py-3 bg-slate-50 border-none rounded-xl font-bold text-slate-900 outline-none">
                       <option value="Cash">{language === 'ar' ? 'نقداً (الصندوق)' : 'Cash'}</option>
                       <option value="Bank">{language === 'ar' ? 'تحويل بنكي' : 'Bank Transfer'}</option>
                    </select>
                 </div>
                 <div className="flex gap-4 pt-4">
                    <button type="button" onClick={() => setIsCompleteMaintModalOpen(false)} className="flex-1 py-4 bg-white border border-slate-200 text-slate-400 rounded-xl font-black text-xs hover:text-slate-900 transition-all uppercase tracking-widest">{language === 'ar' ? 'إلغاء' : 'Cancel'}</button>
                    <button type="submit" disabled={isSubmitting} className="flex-[2] py-4 bg-slate-900 text-white rounded-xl font-black text-xs hover:bg-slate-800 transition-all shadow-lg uppercase tracking-widest">
                       {isSubmitting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto"></div> : (language === 'ar' ? 'ترحيل وإغلاق' : 'Post & Close')}
                    </button>
                 </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ title, value, type, icon }) {
  return (
    <div className={`p-8 rounded-[2.5rem] border shadow-sm transition-all hover:shadow-xl hover:shadow-slate-200/50 group relative overflow-hidden ${type === 'book' ? 'bg-emerald-50/10 border-emerald-100' : type === 'dep' ? 'bg-rose-50/10 border-rose-100' : 'bg-white border-slate-200'}`}>
       <div className="absolute top-0 right-0 p-6 text-6xl opacity-[0.03] group-hover:scale-110 transition-transform">{icon}</div>
       <div className="flex flex-col relative z-10">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">{title}</p>
          <div className="flex items-baseline gap-3">
            <span className={`text-4xl lg:text-5xl font-black font-mono tracking-tighter ${type === 'book' ? 'text-emerald-500' : type === 'dep' ? 'text-rose-500' : 'text-slate-900'}`}>{(Number(value) || 0).toLocaleString()}</span>
            <span className="text-xs font-black text-slate-300 uppercase tracking-widest leading-none">LCY</span>
          </div>
          <div className="mt-6 flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${type === 'dep' ? 'bg-rose-400' : 'bg-emerald-400'} shadow-sm`}></div>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest opacity-60">Verified Balance</span>
          </div>
       </div>
    </div>
  );
}
