import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';

export default function ProjectWorkspace() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('overview');
  
  const [project, setProject] = useState(null);
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [coa, setCoa] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // BOQ & Material Requisition States
  const [boqList, setBoqList] = useState([]);
  const [materialUsage, setMaterialUsage] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  
  // Modals for manual entry
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [entryForm, setEntryForm] = useState({
    account_name: '', debit: '', credit: '', description: ''
  });
  
  // Requisition Modal
  const [isReqModalOpen, setIsReqModalOpen] = useState(false);
  const [selectedBoq, setSelectedBoq] = useState(null);
  const [reqForm, setReqForm] = useState({
    warehouse_id: '',
    inventory_id: '',
    qty: '',
    notes: ''
  });

  // Create BOQ Modal
  const [isBoqModalOpen, setIsBoqModalOpen] = useState(false);
  const [boqForm, setBoqForm] = useState({
    item_name: '',
    uom: '',
    est_qty: '',
    est_unit_price: '',
    est_material_qty: '',
    est_material_cost: '',
    est_labor_cost: '',
    est_subcontractor_cost: '',
    material_category: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchWorkspaceData();
  }, [id]);

  const fetchWorkspaceData = async () => {
    setLoading(true);
    try {
      // 1. Get Project Details
      const projRes = await api.get(`/dynamic/table/projects?limit=100`);
      const foundProject = projRes.data.data.find(p => p.id === parseInt(id));
      setProject(foundProject);

      if (foundProject) {
        // 2. Get Ledger, COA, BOQ, Material Usage, Inventory, and Warehouses in parallel
        const [ledgerRes, coaRes, boqRes, matRes, invRes, whRes] = await Promise.all([
          api.get(`/dynamic/table/ledger?limit=2000&filter=${encodeURIComponent(foundProject.name)}`),
          api.get(`/dynamic/table/chart_of_accounts?limit=500`),
          api.get(`/dynamic/table/boq?limit=500&filter=${encodeURIComponent(foundProject.name)}`),
          api.get(`/dynamic/table/material_usage?limit=500&filter=${encodeURIComponent(foundProject.name)}`),
          api.get(`/dynamic/table/inventory_items?limit=1000`),
          api.get(`/dynamic/table/warehouses?limit=100`)
        ]);
        setLedgerEntries(ledgerRes.data.data || []);
        setCoa(coaRes.data.data || []);
        setBoqList(boqRes.data.data || []);
        setMaterialUsage(matRes.data.data || []);
        setInventoryItems(invRes.data.data || []);
        setWarehouses(whRes.data.data || []);
      }
    } catch (err) {
      console.error("Error fetching workspace data", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEntrySubmit = async (e) => {
    e.preventDefault();
    if (!entryForm.debit && !entryForm.credit) {
      alert("يجب إدخال قيمة في الجانب مدين أو دائن.");
      return;
    }
    setIsSubmitting(true);
    try {
      await api.post('/dynamic/add/ledger', {
        ...entryForm,
        cost_center: project.name,
        debit: Number(entryForm.debit) || 0,
        credit: Number(entryForm.credit) || 0
      });
      alert("تم تسجيل القيد في دفتر اليومية بنجاح!");
      setIsEntryModalOpen(false);
      setEntryForm({ account_name: '', debit: '', credit: '', description: '' });
      fetchWorkspaceData();
    } catch (error) {
      alert(error.response?.data?.error || "حدث خطأ أثناء التسجيل.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReqSubmit = async (e) => {
    e.preventDefault();
    if (!reqForm.inventory_id || !reqForm.qty || Number(reqForm.qty) <= 0) {
      alert("يرجى اختيار الصنف وإدخال كمية صالحة.");
      return;
    }
    const selectedItem = inventoryItems.find(i => i.id === parseInt(reqForm.inventory_id));
    if (!selectedItem) return;

    if (Number(reqForm.qty) > Number(selectedItem.remaining_qty || 0)) {
      alert(`الكمية المطلوبة تتجاوز المتاح في المخزن (${selectedItem.remaining_qty || 0})`);
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/dynamic/add/material_usage', {
        project_name: project.name,
        boq_id: selectedBoq?.id,
        inventory_id: selectedItem.id,
        material: selectedItem.item_name || selectedItem.name,
        qty: Number(reqForm.qty),
        notes: reqForm.notes || ''
      });
      alert("تم صرف المواد للمشروع وربطها بالبند وتوليد القيود المحاسبية بنجاح!");
      setIsReqModalOpen(false);
      setReqForm({ warehouse_id: '', inventory_id: '', qty: '', notes: '' });
      fetchWorkspaceData();
    } catch (error) {
      alert(error.response?.data?.error || "حدث خطأ أثناء الصرف.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevertUsage = async (usageId) => {
    if (!window.confirm("هل أنت متأكد من إلغاء حركة الصرف هذه؟ سيتم استرجاع البضاعة وتوليد قيد عكسي محاسبي تلقائي.")) return;
    setIsSubmitting(true);
    try {
      await api.delete(`/dynamic/delete/material_usage/${usageId}`);
      alert("تم إلغاء حركة الصرف واسترجاع المواد وعكس القيود بنجاح!");
      fetchWorkspaceData();
    } catch (error) {
      alert(error.response?.data?.error || "حدث خطأ أثناء الإلغاء.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBoqSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const estQty = Number(boqForm.est_qty) || 0;
      const estPrice = Number(boqForm.est_unit_price) || 0;
      await api.post('/dynamic/add/boq', {
        ...boqForm,
        project_name: project.name,
        est_qty: estQty,
        est_unit_price: estPrice,
        est_total_price: estQty * estPrice,
        est_material_qty: Number(boqForm.est_material_qty) || 0,
        est_material_cost: Number(boqForm.est_material_cost) || 0,
        est_labor_cost: Number(boqForm.est_labor_cost) || 0,
        est_subcontractor_cost: Number(boqForm.est_subcontractor_cost) || 0
      });
      alert("تم إضافة بند الأعمال بنجاح للمقايسة!");
      setIsBoqModalOpen(false);
      setBoqForm({
        item_name: '', uom: '', est_qty: '', est_unit_price: '',
        est_material_qty: '', est_material_cost: '', est_labor_cost: '',
        est_subcontractor_cost: '', material_category: ''
      });
      fetchWorkspaceData();
    } catch (error) {
      alert(error.response?.data?.error || "حدث خطأ أثناء إضافة البند.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSync = async () => {
    setIsSubmitting(true);
    try {
      await api.get(`/projects/sync/${id}`);
      alert("تمت مزامنة وإعادة حساب البيانات المالية للمشروع بنجاح!");
      fetchWorkspaceData();
    } catch (error) {
      console.error("Sync Error:", error);
      alert(error.response?.data?.error || "فشلت عملية المزامنة. يرجى التأكد من اتصال السيرفر.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      <p className="font-black text-slate-400 animate-pulse text-xl">جاري استحضار البيانات المالية للمشروع...</p>
    </div>
  );

  if (!project) return <div className="p-8 text-center font-bold text-red-500 bg-red-50 rounded-3xl border border-red-100">⚠️ المشروع غير موجود أو تم حذفه.</div>;

  // --- Financial Calculations ---
  const budget = Number(project.budget || 0);
  const totalRevenue = ledgerEntries
    .filter(e => {
        const acc = coa.find(a => a.account_name === e.account_name);
        return acc?.account_type === 'Revenue';
    })
    .reduce((sum, e) => sum + (Number(e.credit) - Number(e.debit)), 0);

  const totalExpenses = ledgerEntries
    .filter(e => {
        const acc = coa.find(a => a.account_name === e.account_name);
        return acc?.account_type === 'Expense';
    })
    .reduce((sum, e) => sum + (Number(e.debit) - Number(e.credit)), 0);

  const totalFunding = ledgerEntries
    .filter(e => {
        const acc = coa.find(a => a.account_name === e.account_name);
        return acc?.account_type === 'Equity';
    })
    .reduce((sum, e) => sum + (Number(e.credit) - Number(e.debit)), 0);

  const netProfit = totalRevenue - totalExpenses;
  const projectLiquidity = totalFunding + totalRevenue - totalExpenses; // Capital + Profit
  const margin = totalRevenue > 0 ? (netProfit / totalRevenue * 100).toFixed(1) : 0;
  const consumptionPercent = budget > 0 ? (totalExpenses / budget) * 100 : 0;

  // --- BOQ & Materials Calculations ---
  const totalEstMaterialCost = boqList.reduce((sum, item) => sum + Number(item.est_material_cost || 0), 0);
  const totalActualMaterialCost = boqList.reduce((sum, item) => sum + Number(item.actual_material_cost || 0), 0);
  const materialVariance = totalEstMaterialCost > 0 ? (totalActualMaterialCost / totalEstMaterialCost) * 100 : 0;

  // --- Dynamic Monthly Analysis ---
  const monthlyMap = ledgerEntries.reduce((acc, entry) => {
    const date = new Date(entry.created_at);
    const mLabel = date.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });
    if (!acc[mLabel]) acc[mLabel] = { month: mLabel, rev: 0, exp: 0 };
    
    const entryAcc = coa.find(a => a.account_name === entry.account_name);
    if (entryAcc?.account_type === 'Revenue') {
      acc[mLabel].rev += (Number(entry.credit) - Number(entry.debit));
    } else if (entryAcc?.account_type === 'Expense') {
      acc[mLabel].exp += (Number(entry.debit) - Number(entry.credit));
    }
    return acc;
  }, {});

  const dynamicMonths = Object.values(monthlyMap).sort((a, b) => new Date(b.month) - new Date(a.month)).slice(0, 3).reverse();
  const maxMonthlyRev = Math.max(...dynamicMonths.map(m => m.rev), 1000);

  // --- Filtering ---
  const filteredLedger = ledgerEntries.filter(e => 
    e.account_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.created_by && e.created_by.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // --- Tabs Configuration ---
  const tabs = [
    { id: 'overview', name: 'نظرة عامة', icon: '📊' },
    { id: 'boq', name: 'المقايسة والتموين (BOQ)', icon: '🏗️' },
    { id: 'expenses', name: 'المصروفات والقيود', icon: '💸' },
    { id: 'ledger', name: 'دفتر الأستاذ (GL)', icon: '📘' },
    { id: 'pnl', name: 'الأرباح والخسائر (P&L)', icon: '📈' },
  ];

  return (
    <div className="animate-fade-in space-y-8 p-4 md:p-8 bg-slate-50/50 min-h-screen" dir="rtl">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-6">
            <Link to="/projects" className="w-12 h-12 flex items-center justify-center bg-white rounded-2xl shadow-sm border border-slate-200 hover:bg-slate-50 transition-all text-slate-400 group">
                <span className="group-hover:translate-x-1 transition-transform">▶</span>
            </Link>
            <div>
                <div className="flex items-center gap-3">
                    <h2 className="text-4xl font-black text-slate-800 tracking-tight">{project.name}</h2>
                    <span className="bg-blue-600 text-white px-4 py-1.5 rounded-xl text-xs font-black shadow-lg shadow-blue-100">
                        {project.project_serial || project.code}
                    </span>
                </div>
                <div className="flex items-center gap-4 mt-2 text-slate-400 font-bold text-sm">
                    <span className="flex items-center gap-1.5"><span className="text-lg">👔</span> {project.project_manager || 'بدون مدير'}</span>
                    <span className="w-1.5 h-1.5 bg-slate-300 rounded-full"></span>
                    <span className="flex items-center gap-1.5"><span className="text-lg">🏢</span> {project.company || 'تيد كابيتال'}</span>
                </div>
            </div>
        </div>

        <div className="flex items-center gap-2">
            <button 
              onClick={handleSync} 
              disabled={isSubmitting}
              className="bg-amber-50 text-amber-700 hover:bg-amber-100 px-5 py-3 rounded-xl font-bold transition-all flex items-center gap-2 border border-amber-200 text-sm shadow-sm"
              title="إعادة حساب الأرباح والمصروفات من دفتر اليومية"
            >
              <span>🔄</span> {isSubmitting ? 'جاري المزامنة...' : 'مزامنة وتحديث'}
            </button>
            <button className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-slate-200 hover:bg-black transition-all flex items-center gap-2 text-sm">
                <span>🖨️</span> طباعة التقرير
            </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-5">
        <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 relative overflow-hidden group">
            <div className="absolute -right-2 -top-2 text-6xl opacity-[0.03] group-hover:scale-110 transition-transform">💰</div>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">الميزانية المرصودة</p>
            <h4 className="text-2xl font-black text-slate-800 font-mono tracking-tight">{budget.toLocaleString()}</h4>
            <div className="mt-3 h-1 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500" style={{ width: '100%' }}></div>
            </div>
        </div>

        <div className={`bg-white p-5 rounded-[2rem] shadow-sm border relative overflow-hidden group ${consumptionPercent > 100 ? 'border-rose-200 ring-2 ring-rose-50' : 'border-slate-100'}`}>
            <div className="absolute -right-2 -top-2 text-6xl opacity-[0.03] group-hover:scale-110 transition-transform">📉</div>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">إجمالي المصروفات</p>
            <h4 className={`text-2xl font-black font-mono tracking-tight ${consumptionPercent > 100 ? 'text-rose-600' : 'text-slate-800'}`}>{totalExpenses.toLocaleString()}</h4>
            <div className="mt-3 h-1 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full transition-all duration-1000 ${consumptionPercent > 100 ? 'bg-rose-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(consumptionPercent, 100)}%` }}></div>
            </div>
            {consumptionPercent > 100 && <p className="text-[9px] font-black text-rose-500 mt-2 flex items-center gap-1">⚠️ تجاوز الميزانية ({consumptionPercent.toFixed(0)}%)</p>}
        </div>

        <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 relative overflow-hidden group border-r-4 border-r-emerald-500">
            <div className="absolute -right-2 -top-2 text-6xl opacity-[0.03] group-hover:scale-110 transition-transform">📈</div>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">صافي الربح (المحقق)</p>
            <h4 className={`text-2xl font-black font-mono tracking-tight ${netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{netProfit.toLocaleString()}</h4>
            <p className={`text-[9px] font-black mt-2 ${netProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>Margin: {margin}%</p>
        </div>

        <div className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 relative overflow-hidden group border-r-4 border-r-amber-500">
            <div className="absolute -right-2 -top-2 text-6xl opacity-[0.03] group-hover:scale-110 transition-transform">🏛️</div>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1">إجمالي التمويل (Funding)</p>
            <h4 className="text-2xl font-black text-amber-600 font-mono tracking-tight">{totalFunding.toLocaleString()}</h4>
            <p className="text-[9px] font-black text-amber-500 mt-2">إيداعات الشركاء والتمويل الذاتي</p>
        </div>

        <div className={`p-5 rounded-[2rem] shadow-sm relative overflow-hidden group transition-all duration-500 ${projectLiquidity >= 0 ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white'}`}>
            <div className="absolute -right-2 -top-2 text-6xl opacity-10 group-hover:scale-110 transition-transform text-white">⚖️</div>
            <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest mb-1">الموقف النقدي (Liquidity)</p>
            <h4 className="text-2xl font-black font-mono tracking-tight">{ projectLiquidity.toLocaleString() }</h4>
            <div className="mt-3 flex items-center gap-2">
                <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${projectLiquidity >= 0 ? 'bg-white' : 'bg-rose-500'}`}></span>
                <span className="text-[9px] font-bold text-white/70">{projectLiquidity >= 0 ? 'تدفق نقدي إيجابي' : 'عجز في السيولة'}</span>
            </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white/50 backdrop-blur-md p-1.5 rounded-2xl shadow-sm border border-slate-100 flex gap-1 overflow-x-auto sticky top-4 z-10 scrollbar-none">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all whitespace-nowrap text-xs ${
              activeTab === tab.id 
                ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' 
                : 'text-slate-500 hover:bg-white hover:text-slate-800'
            }`}
          >
            <span className="text-lg">{tab.icon}</span> {tab.name}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="bg-white rounded-[3rem] shadow-xl shadow-slate-200/40 border border-slate-100 overflow-hidden min-h-[500px]">
        {activeTab === 'overview' && (
          <div className="p-10 animate-fade-in grid grid-cols-1 md:grid-cols-2 gap-10">
            <div>
                <h3 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-3">
                    <span className="p-2 bg-blue-50 text-blue-600 rounded-xl text-sm">📊</span> تفاصيل أداء المشروع
                </h3>
                <div className="space-y-6">
                    <div className={`p-6 rounded-[2rem] border transition-all ${consumptionPercent > 100 ? 'bg-rose-50 border-rose-200 animate-pulse' : 'bg-slate-50 border-slate-100'}`}>
                        <div className="flex justify-between items-center mb-4">
                            <span className="font-black text-slate-500 text-sm">استهلاك الميزانية</span>
                            <span className={`font-black ${consumptionPercent > 100 ? 'text-rose-600' : 'text-slate-800'}`}>{consumptionPercent.toFixed(1)}%</span>
                        </div>
                        <div className="h-4 bg-white rounded-full overflow-hidden border p-0.5">
                            <div className={`h-full rounded-full transition-all duration-1000 ${consumptionPercent > 100 ? 'bg-rose-500' : 'bg-gradient-to-r from-blue-500 to-emerald-500'}`} style={{ width: `${Math.min(consumptionPercent, 100)}%` }}></div>
                        </div>
                        {consumptionPercent > 100 && <p className="text-[10px] font-black text-rose-600 mt-3 text-center uppercase tracking-widest">⚠️ Danger: Budget Overrun detected</p>}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-6 bg-emerald-50/50 rounded-[2rem] border border-emerald-100">
                            <p className="text-[10px] font-black text-emerald-600 mb-1">إجمالي الإيرادات</p>
                            <h5 className="text-2xl font-black text-emerald-700 font-mono">{totalRevenue.toLocaleString()}</h5>
                        </div>
                        <div className="p-6 bg-rose-50/50 rounded-[2rem] border border-rose-100">
                            <p className="text-[10px] font-black text-rose-600 mb-1">إجمالي التكاليف</p>
                            <h5 className="text-2xl font-black text-rose-700 font-mono">{totalExpenses.toLocaleString()}</h5>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full -translate-y-32 translate-x-32 blur-3xl"></div>
                <h3 className="text-xl font-black mb-8 flex items-center gap-3">📈 تحليل الربحية الشهري</h3>
                <div className="space-y-4">
                    {dynamicMonths.length === 0 ? (
                       <p className="text-slate-500 text-sm italic py-10 text-center">لا توجد بيانات كافية للتحليل الشهري حالياً.</p>
                    ) : (
                      dynamicMonths.map((m, i) => (
                        <div key={i} className="flex items-center gap-4 group/row">
                           <span className="w-24 text-xs font-bold text-slate-400 whitespace-nowrap">{m.month}</span>
                           <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden flex">
                              <div className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] transition-all duration-1000" style={{ width: `${(m.rev/maxMonthlyRev)*100}%` }}></div>
                           </div>
                           <span className="font-mono text-[10px] font-black text-emerald-400">+{m.rev.toLocaleString()}</span>
                        </div>
                      ))
                    )}
                </div>
                <div className="mt-8 pt-6 border-t border-white/10">
                   <p className="text-[10px] text-slate-500 font-black mb-2 italic">* تعتمد هذه الأرقام على ترحيلات دفتر اليومية المعتمدة.</p>
                   <button className="w-full py-3 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-black transition-all">تحميل التقرير التفصيلي (PDF)</button>
                </div>
            </div>
          </div>
        )}

        {/* 🌟 🏗️ BOQ & MATERIALS MANAGEMENT TAB 🌟 */}
        {activeTab === 'boq' && (
          <div className="p-10 animate-fade-in space-y-10">
            {/* Deviation Metrics cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-slate-50 border border-slate-100 p-6 rounded-[2rem] shadow-sm relative overflow-hidden group">
                <p className="text-slate-400 text-[10px] font-black uppercase mb-1">ميزانية الخامات التقديرية (BOQ)</p>
                <h4 className="text-3xl font-black text-slate-800 font-mono">{totalEstMaterialCost.toLocaleString()}</h4>
                <p className="text-[9px] text-slate-500 font-bold mt-2">إجمالي تكاليف المواد المخصصة لبنود الأعمال</p>
              </div>

              <div className={`border p-6 rounded-[2rem] shadow-sm relative overflow-hidden group transition-all ${materialVariance > 100 ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-100'}`}>
                <p className="text-slate-400 text-[10px] font-black uppercase mb-1">المنصرف الفعلي للتموين</p>
                <h4 className={`text-3xl font-black font-mono ${materialVariance > 100 ? 'text-rose-600' : 'text-slate-800'}`}>{totalActualMaterialCost.toLocaleString()}</h4>
                <p className={`text-[9px] font-bold mt-2 ${materialVariance > 100 ? 'text-rose-500' : 'text-slate-500'}`}>مجموع حركات الصرف الفعلي المعتمدة</p>
              </div>

              <div className={`p-6 rounded-[2rem] shadow-sm relative overflow-hidden group border text-white transition-all duration-500 ${materialVariance > 100 ? 'bg-rose-600 border-rose-500 animate-pulse' : 'bg-emerald-600 border-emerald-500'}`}>
                <p className="text-white/60 text-[10px] font-black uppercase mb-1">معدل الانحراف الفعلي (Variance)</p>
                <h4 className="text-3xl font-black font-mono">{materialVariance.toFixed(1)}%</h4>
                <p className="text-[9px] text-white/80 font-bold mt-2">{materialVariance > 100 ? '⚠️ تجاوز التكاليف المخصصة للمواد!' : '🟢 تحت السيطرة والموازنة'}</p>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="flex justify-between items-center bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
              <div>
                <h3 className="text-xl font-black text-slate-800">📋 مقايسة الأعمال وبنود المشروع</h3>
                <p className="text-slate-400 text-xs font-bold mt-1">إجمالي البنود المعرفة: {boqList.length} بنود أعمال</p>
              </div>
              <button 
                onClick={() => setIsBoqModalOpen(true)}
                className="bg-slate-900 hover:bg-black text-white px-6 py-3.5 rounded-2xl font-black text-xs shadow-lg transition-all"
              >
                + إضافة بند مقايسة (BOQ)
              </button>
            </div>

            {/* BOQ Grid */}
            <div className="overflow-x-auto rounded-[2rem] border border-slate-100 shadow-sm">
              <table className="w-full text-right whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-400">
                  <tr>
                    <th className="p-6 font-black text-xs">كود/اسم البند</th>
                    <th className="p-6 font-black text-xs text-center">وحدة القياس</th>
                    <th className="p-6 font-black text-xs text-center">الكمية المقدرة</th>
                    <th className="p-6 font-black text-xs text-center bg-slate-100/30">المنصرف الفعلي</th>
                    <th className="p-6 font-black text-xs text-center">التكلفة المقدرة</th>
                    <th className="p-6 font-black text-xs text-center bg-slate-100/30">المنصرف الفعلي ($)</th>
                    <th className="p-6 font-black text-xs text-center">الاستهلاك</th>
                    <th className="p-6 font-black text-xs text-center">الحالة</th>
                    <th className="p-6 font-black text-xs text-left">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {boqList.length === 0 ? (
                    <tr><td colSpan="9" className="p-20 text-center text-slate-400 font-bold">لا توجد بنود أعمال مسجلة في هذا المشروع حتى الآن.</td></tr>
                  ) : (
                    boqList.map(item => {
                      const estCost = Number(item.est_material_cost || 0);
                      const actCost = Number(item.actual_material_cost || 0);
                      const costUsagePercent = estCost > 0 ? (actCost / estCost) * 100 : 0;
                      
                      return (
                        <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-6">
                            <div className="flex flex-col">
                              <span className="font-black text-slate-800 text-sm">{item.item_name}</span>
                              <span className="text-[10px] text-blue-500 font-bold">{item.material_category || 'عام'}</span>
                            </div>
                          </td>
                          <td className="p-6 text-center font-bold text-slate-500 text-sm">{item.uom || 'متر'}</td>
                          <td className="p-6 text-center font-mono font-bold text-slate-600 text-sm">{Number(item.est_qty).toLocaleString()}</td>
                          <td className="p-6 text-center font-mono font-black text-blue-600 bg-slate-50/50 text-sm">{Number(item.actual_material_qty || 0).toLocaleString()}</td>
                          <td className="p-6 text-center font-mono font-bold text-slate-600 text-sm">{estCost.toLocaleString()}</td>
                          <td className="p-6 text-center font-mono font-black bg-slate-50/50 text-sm text-slate-800">{actCost.toLocaleString()}</td>
                          <td className="p-6">
                            <div className="w-28 mx-auto flex flex-col items-center gap-1.5">
                              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden border p-0.5">
                                <div className={`h-full rounded-full transition-all duration-1000 ${costUsagePercent > 100 ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(costUsagePercent, 100)}%` }}></div>
                              </div>
                              <span className={`text-[9px] font-black ${costUsagePercent > 100 ? 'text-rose-500' : 'text-slate-400'}`}>{costUsagePercent.toFixed(0)}%</span>
                            </div>
                          </td>
                          <td className="p-6 text-center">
                            <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black ${
                              item.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' :
                              item.status === 'In Progress' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {item.status || 'Not Started'}
                            </span>
                          </td>
                          <td className="p-6 text-left">
                            <button
                              onClick={() => {
                                setSelectedBoq(item);
                                setIsReqModalOpen(true);
                              }}
                              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-black text-[10px] px-3.5 py-2 rounded-xl transition-all"
                            >
                              🏗️ صرف خامات
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Material Usage Requisitions Logs */}
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h4 className="text-lg font-black text-slate-800">🚚 سجل صرف وتموين الخامات الفعلي</h4>
                <span className="text-[10px] text-slate-400 font-bold">الحركات التراكمية: {materialUsage.length} حركة صرف</span>
              </div>

              <div className="overflow-x-auto rounded-[2rem] border border-slate-100 shadow-sm">
                <table className="w-full text-right whitespace-nowrap">
                  <thead className="bg-slate-50 text-slate-400">
                    <tr>
                      <th className="p-6 font-black text-xs">التاريخ</th>
                      <th className="p-6 font-black text-xs">بند المقايسة</th>
                      <th className="p-6 font-black text-xs">اسم الخامة المصروفة</th>
                      <th className="p-6 font-black text-xs text-center">الكمية</th>
                      <th className="p-6 font-black text-xs text-center">سعر الوحدة</th>
                      <th className="p-6 font-black text-xs text-center">التكلفة الإجمالية</th>
                      <th className="p-6 font-black text-xs text-center">موقع الصرف</th>
                      <th className="p-6 font-black text-xs text-left">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {materialUsage.length === 0 ? (
                      <tr><td colSpan="8" className="p-20 text-center text-slate-400 font-bold">لم يتم صرف أي خامات للمشروع حتى الآن.</td></tr>
                    ) : (
                      materialUsage.map(use => (
                        <tr key={use.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-6 font-bold text-slate-400 text-xs">{new Date(use.created_at).toLocaleDateString('ar-EG')}</td>
                          <td className="p-6 font-black text-slate-800 text-xs">{boqList.find(b => b.id === use.boq_id)?.item_name || 'بند عام'}</td>
                          <td className="p-6 font-bold text-slate-600 text-sm">{use.material}</td>
                          <td className="p-6 text-center font-mono font-black text-blue-600 text-sm">{Number(use.qty).toLocaleString()}</td>
                          <td className="p-6 text-center font-mono font-bold text-slate-400 text-xs">{Number(use.unit_cost || 0).toLocaleString()}</td>
                          <td className="p-6 text-center font-mono font-black text-slate-800 text-sm">{Number(use.est_cost).toLocaleString()}</td>
                          <td className="p-6 text-center font-bold text-slate-400 text-xs">{use.issued_by || 'أمين المستودع'}</td>
                          <td className="p-6 text-left">
                            <button
                              onClick={() => handleRevertUsage(use.id)}
                              className="text-rose-600 hover:bg-rose-50 font-black text-[10px] px-3.5 py-2 rounded-xl transition-all"
                            >
                              ✕ إلغاء وتراجع
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
        )}

        {activeTab === 'expenses' && (
          <div className="p-10 animate-fade-in">
            <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-slate-800">💸 سجل المصروفات والقيود</h3>
                <div className="flex gap-3">
                    <button 
                      onClick={() => setIsEntryModalOpen(true)}
                      className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-black shadow-lg shadow-emerald-100 hover:bg-emerald-700 transition-all text-sm"
                    >
                      + إضافة قيد مصروفات
                    </button>
                    <input 
                      type="text" 
                      placeholder="بحث في القيود (اسم الحساب، البيان...)" 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="p-3 bg-slate-50 border rounded-xl text-sm font-bold outline-none focus:border-blue-500 w-80 shadow-sm" 
                    />
                </div>
            </div>
            
            <div className="overflow-x-auto rounded-[2rem] border border-slate-100 shadow-sm">
                <table className="w-full text-right whitespace-nowrap">
                    <thead className="bg-slate-50 text-slate-400">
                        <tr>
                            <th className="p-6 font-black text-xs">التاريخ</th>
                            <th className="p-6 font-black text-xs">الحساب</th>
                            <th className="p-6 font-black text-xs">البيان / الوصف</th>
                            <th className="p-6 font-black text-xs text-center">مدين (DR)</th>
                            <th className="p-6 font-black text-xs text-center">دائن (CR)</th>
                            <th className="p-6 font-black text-xs text-left">بواسطة</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {filteredLedger.length === 0 ? (
                            <tr><td colSpan="6" className="p-20 text-center text-slate-400 font-bold">لا توجد قيود تطابق بحثك.</td></tr>
                        ) : (
                            filteredLedger.map(e => (
                                <tr key={e.id} className="hover:bg-slate-50 transition-colors group">
                                    <td className="p-6 font-bold text-slate-400 text-xs">{new Date(e.created_at).toLocaleDateString('ar-EG')}</td>
                                    <td className="p-6">
                                        <div className="flex flex-col">
                                            <span className="font-black text-slate-800">{e.account_name}</span>
                                            <span className="text-[10px] text-blue-500 font-bold uppercase">{coa.find(a => a.account_name === e.account_name)?.account_code}</span>
                                        </div>
                                    </td>
                                    <td className="p-6 font-bold text-slate-500 text-sm max-w-xs truncate">{e.description}</td>
                                    <td className="p-6 text-center font-mono font-black text-blue-600">{Number(e.debit) > 0 ? Number(e.debit).toLocaleString() : '-'}</td>
                                    <td className="p-6 text-center font-mono font-black text-rose-600">{Number(e.credit) > 0 ? Number(e.credit).toLocaleString() : '-'}</td>
                                    <td className="p-6 text-left font-black text-slate-400 text-xs">{e.created_by}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
          </div>
        )}

        {activeTab === 'ledger' && (
          <div className="p-10 animate-fade-in">
            <h3 className="text-2xl font-black text-slate-800 mb-8">📘 دفتر الأستاذ (GL) للمشروع</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {coa.filter(a => ledgerEntries.some(e => e.account_name === a.account_name)).map(acc => {
                    const accEntries = ledgerEntries.filter(e => e.account_name === acc.account_name);
                    const bal = accEntries.reduce((sum, e) => sum + (acc.account_type === 'Asset' || acc.account_type === 'Expense' ? (Number(e.debit) - Number(e.credit)) : (Number(e.credit) - Number(e.debit))), 0);
                    return (
                        <div key={acc.id} className="bg-slate-50 rounded-[2.5rem] p-8 border border-slate-100 group hover:border-blue-500/30 transition-all shadow-sm">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h4 className="font-black text-slate-800 text-lg">{acc.account_name}</h4>
                                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-1">{acc.account_code} | {acc.account_type}</p>
                                </div>
                                <div className="text-left">
                                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">الرصيد النهائي</p>
                                    <p className={`text-2xl font-black font-mono ${bal >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{bal.toLocaleString()}</p>
                                </div>
                            </div>
                            <div className="space-y-3 opacity-60 group-hover:opacity-100 transition-opacity">
                                {accEntries.slice(0, 3).map(e => (
                                    <div key={e.id} className="flex justify-between text-xs font-bold border-b border-slate-200/50 pb-2">
                                        <span className="text-slate-500">{e.description}</span>
                                        <span className={Number(e.debit) > 0 ? 'text-blue-600' : 'text-rose-600'}>
                                            {Number(e.debit) > 0 ? `+${Number(e.debit).toLocaleString()}` : `-${Number(e.credit).toLocaleString()}`}
                                        </span>
                                    </div>
                                ))}
                                {accEntries.length > 3 && <p className="text-[10px] text-center text-slate-400 pt-2 font-black italic">...+ {accEntries.length - 3} حركات إضافية</p>}
                            </div>
                        </div>
                    );
                })}
            </div>
          </div>
        )}

        {activeTab === 'pnl' && (
          <div className="p-10 animate-fade-in max-w-4xl mx-auto">
            <div className="text-center mb-12">
                <h3 className="text-4xl font-black text-slate-800 mb-3">📈 تقرير الأرباح والخسائر للمشروع</h3>
                <p className="text-slate-400 font-bold">بناءً على قيود دفتر اليومية المسجلة لهذا المشروع</p>
            </div>

            <div className="space-y-10">
                {/* REVENUE SECTION */}
                <section>
                    <div className="flex justify-between items-center border-b-4 border-slate-900 pb-4 mb-6">
                        <h4 className="text-2xl font-black text-slate-900 flex items-center gap-3"><span>💰</span> إجمالي الإيرادات</h4>
                        <span className="text-2xl font-black font-mono">{totalRevenue.toLocaleString()}</span>
                    </div>
                    <div className="space-y-4 px-6">
                        {coa.filter(a => a.account_type === 'Revenue' && ledgerEntries.some(e => e.account_name === a.account_name)).map(acc => {
                            const bal = ledgerEntries.filter(e => e.account_name === acc.account_name).reduce((sum, e) => sum + (Number(e.credit) - Number(e.debit)), 0);
                            return (
                                <div key={acc.id} className="flex justify-between items-center text-lg hover:bg-slate-50 p-2 rounded-xl transition-colors">
                                    <span className="font-bold text-slate-600">{acc.account_name}</span>
                                    <span className="font-black text-slate-800 font-mono">{bal.toLocaleString()}</span>
                                </div>
                            );
                        })}
                        {totalRevenue === 0 && <p className="text-center text-slate-400 italic">لا توجد إيرادات مسجلة.</p>}
                    </div>
                </section>

                {/* EXPENSES SECTION */}
                <section>
                    <div className="flex justify-between items-center border-b-4 border-rose-600 pb-4 mb-6">
                        <h4 className="text-2xl font-black text-rose-600 flex items-center gap-3"><span>💸</span> إجمالي المصروفات</h4>
                        <span className="text-2xl font-black font-mono text-rose-600">({totalExpenses.toLocaleString()})</span>
                    </div>
                    <div className="space-y-4 px-6">
                        {coa.filter(a => a.account_type === 'Expense' && ledgerEntries.some(e => e.account_name === a.account_name)).map(acc => {
                            const bal = ledgerEntries.filter(e => e.account_name === acc.account_name).reduce((sum, e) => sum + (Number(e.debit) - Number(e.credit)), 0);
                            return (
                                <div key={acc.id} className="flex justify-between items-center text-lg hover:bg-rose-50/30 p-2 rounded-xl transition-colors">
                                    <span className="font-bold text-slate-600">{acc.account_name}</span>
                                    <span className="font-black text-rose-500 font-mono">{bal.toLocaleString()}</span>
                                </div>
                            );
                        })}
                        {totalExpenses === 0 && <p className="text-center text-slate-400 italic">لا توجد مصروفات مسجلة.</p>}
                    </div>
                </section>

                {/* FINAL NET PROFIT */}
                <section className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-blue-600/20 to-transparent"></div>
                    <div className="relative z-10 flex justify-between items-center">
                        <div>
                            <h4 className="text-3xl font-black mb-2">صافي ربح المشروع</h4>
                            <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">PROJECT NET PROFIT</p>
                        </div>
                        <div className="text-left">
                            <h5 className={`text-5xl font-black font-mono ${netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {netProfit.toLocaleString()}
                            </h5>
                        </div>
                    </div>
                </section>
            </div>
          </div>
        )}
      </div>

      {/* Requisition Material Issuance Modal */}
      {isReqModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-fade-in text-right">
            <div className="bg-slate-900 px-8 py-6 flex justify-between items-center text-white">
              <h3 className="text-xl font-black">🏗️ صرف مواد لبند المقايسة</h3>
              <button onClick={() => setIsReqModalOpen(false)} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>
            <form onSubmit={handleReqSubmit} className="p-8 space-y-5">
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl">
                <p className="text-xs font-black text-blue-700">البند المستهدف: {selectedBoq?.item_name}</p>
                <p className="text-[10px] text-blue-500 font-bold mt-1">التكلفة التقديرية للبند: {Number(selectedBoq?.est_material_cost).toLocaleString()} ريال</p>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 mb-2 mr-2">المستودع (Warehouse) *</label>
                <select 
                  value={reqForm.warehouse_id} 
                  onChange={(e) => setReqForm({...reqForm, warehouse_id: e.target.value, inventory_id: ''})} 
                  required 
                  className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-blue-500 outline-none font-black text-slate-700 text-sm"
                >
                  <option value="">-- اختر المستودع --</option>
                  {warehouses.map(w => <option key={w.id} value={w.id}>{w.name} ({w.location})</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 mb-2 mr-2">الصنف المطلوب صرفه *</label>
                <select 
                  value={reqForm.inventory_id} 
                  onChange={(e) => setReqForm({...reqForm, inventory_id: e.target.value})} 
                  required 
                  className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-blue-500 outline-none font-black text-slate-700 text-sm"
                >
                  <option value="">-- اختر الصنف المخزني --</option>
                  {inventoryItems
                    .filter(item => {
                      if (!reqForm.warehouse_id) return true;
                      const selectedWh = warehouses.find(w => w.id === parseInt(reqForm.warehouse_id));
                      if (!selectedWh) return true;
                      
                      // Robust multi-criteria matching
                      if (item.warehouse_id === selectedWh.id) return true;
                      if (item.warehouse && item.warehouse.trim().toLowerCase() === selectedWh.name.trim().toLowerCase()) return true;
                      
                      // Semantic keyword fallback (e.g. Main Store vs المخزن الرئيسي)
                      const isMainWhMatch = (
                        (selectedWh.name.toLowerCase().includes('main') || selectedWh.name.includes('رئيسي')) &&
                        (item.warehouse?.toLowerCase().includes('main') || item.warehouse?.includes('رئيسي'))
                      );
                      if (isMainWhMatch) return true;
                      
                      return false;
                    })
                    .map(item => (
                      <option key={item.id} value={item.id}>
                        {item.item_name || item.name} (المتاح: {item.remaining_qty} {item.uom})
                      </option>
                    ))
                  }
                </select>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 mb-2 mr-2">الكمية المطلوبة صرفها *</label>
                <input 
                  type="number" 
                  step="any"
                  value={reqForm.qty} 
                  onChange={(e) => setReqForm({...reqForm, qty: e.target.value})} 
                  required 
                  className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-blue-500 outline-none font-mono font-black text-center text-lg" 
                  placeholder="0.00" 
                />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 mb-2 mr-2">ملاحظات / مستلم المواد</label>
                <input 
                  type="text" 
                  value={reqForm.notes} 
                  onChange={(e) => setReqForm({...reqForm, notes: e.target.value})} 
                  className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-blue-500 outline-none font-bold" 
                  placeholder="اسم المهندس أو رقم التوزيع"
                />
              </div>

              <div className="pt-4">
                <button type="submit" disabled={isSubmitting} className="w-full bg-slate-900 hover:bg-black text-white py-4 rounded-2xl font-black shadow-xl transition-all disabled:opacity-50 text-sm">
                  {isSubmitting ? 'جاري ترحيل الحركة وصرف المواد...' : 'اعتماد وصرف المواد'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add BOQ Modal */}
      {isBoqModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-fade-in text-right">
            <div className="bg-slate-900 px-8 py-6 flex justify-between items-center text-white">
              <h3 className="text-xl font-black">🏗️ إضافة بند أعمال جديد (BOQ)</h3>
              <button onClick={() => setIsBoqModalOpen(false)} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>
            <form onSubmit={handleBoqSubmit} className="p-8 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-500 mb-2 mr-2">اسم البند *</label>
                  <input type="text" value={boqForm.item_name} onChange={(e) => setBoqForm({...boqForm, item_name: e.target.value})} required className="w-full p-4 rounded-2xl bg-slate-50 border border-transparent focus:border-blue-500 outline-none font-bold text-sm" placeholder="مثال: خرسانة مسلحة للأساسات" />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 mb-2 mr-2">فئة المواد (التصنيف)</label>
                  <input type="text" value={boqForm.material_category} onChange={(e) => setBoqForm({...boqForm, material_category: e.target.value})} className="w-full p-4 rounded-2xl bg-slate-50 border border-transparent focus:border-blue-500 outline-none font-bold text-sm" placeholder="مثال: أسمنت، حديد" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-500 mb-2 mr-2">وحدة القياس *</label>
                  <input type="text" value={boqForm.uom} onChange={(e) => setBoqForm({...boqForm, uom: e.target.value})} required className="w-full p-4 rounded-2xl bg-slate-50 border border-transparent focus:border-blue-500 outline-none font-bold text-center text-sm" placeholder="M3, LM, Ton" />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 mb-2 mr-2">الكمية المقدرة *</label>
                  <input type="number" value={boqForm.est_qty} onChange={(e) => setBoqForm({...boqForm, est_qty: e.target.value})} required className="w-full p-4 rounded-2xl bg-slate-50 border border-transparent focus:border-blue-500 outline-none font-bold text-center text-sm" placeholder="0" />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 mb-2 mr-2">سعر الفئة المقدر *</label>
                  <input type="number" value={boqForm.est_unit_price} onChange={(e) => setBoqForm({...boqForm, est_unit_price: e.target.value})} required className="w-full p-4 rounded-2xl bg-slate-50 border border-transparent focus:border-blue-500 outline-none font-bold text-center text-sm" placeholder="0.00" />
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl space-y-3">
                <p className="text-xs font-black text-slate-600 mb-2">💰 تفصيل الميزانية الهندسية (المواد، العمالة، المقاولين):</p>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 mb-1 mr-2">كمية المواد المطلوبة للتشغيل</label>
                    <input type="number" value={boqForm.est_material_qty} onChange={(e) => setBoqForm({...boqForm, est_material_qty: e.target.value})} className="w-full p-3 rounded-xl bg-white border outline-none text-center text-xs font-bold" placeholder="0.00" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 mb-1 mr-2">تكلفة الخامات التقديرية (Est. Material Cost)</label>
                    <input type="number" value={boqForm.est_material_cost} onChange={(e) => setBoqForm({...boqForm, est_material_cost: e.target.value})} className="w-full p-3 rounded-xl bg-white border outline-none text-center text-xs font-bold" placeholder="0.00" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 mb-1 mr-2">تكلفة المصنعية والعمالة (Labor)</label>
                    <input type="number" value={boqForm.est_labor_cost} onChange={(e) => setBoqForm({...boqForm, est_labor_cost: e.target.value})} className="w-full p-3 rounded-xl bg-white border outline-none text-center text-xs font-bold" placeholder="0.00" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 mb-1 mr-2">مقاولي الباطن (Subcontractor Cost)</label>
                    <input type="number" value={boqForm.est_subcontractor_cost} onChange={(e) => setBoqForm({...boqForm, est_subcontractor_cost: e.target.value})} className="w-full p-3 rounded-xl bg-white border outline-none text-center text-xs font-bold" placeholder="0.00" />
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <button type="submit" disabled={isSubmitting} className="w-full bg-slate-900 hover:bg-black text-white py-4 rounded-2xl font-black shadow-xl transition-all text-sm">
                  {isSubmitting ? 'جاري الحفظ البند...' : 'حفظ البند في المقايسة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Entry Modal */}
      {isEntryModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-fade-in text-right">
            <div className="bg-slate-900 px-8 py-6 flex justify-between items-center text-white">
              <h3 className="text-xl font-black">📝 قيد مالي جديد للمشروع</h3>
              <button onClick={() => setIsEntryModalOpen(false)} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>
            <form onSubmit={handleEntrySubmit} className="p-8 space-y-5">
              <div>
                <label className="block text-xs font-black text-slate-500 mb-2 mr-2">الحساب المحاسبي *</label>
                <select 
                  value={entryForm.account_name} 
                  onChange={(e) => setEntryForm({...entryForm, account_name: e.target.value})} 
                  required 
                  className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-blue-500 outline-none font-black text-slate-700 text-sm"
                >
                  <option value="">-- اختر الحساب --</option>
                  {coa.filter(a => a.manual_entry_allowed).map(acc => <option key={acc.id} value={acc.account_name}>{acc.account_name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-emerald-600 mb-2 mr-2">مدين (Debit)</label>
                  <input type="number" value={entryForm.debit} onChange={(e) => setEntryForm({...entryForm, debit: e.target.value})} className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-emerald-500 outline-none font-mono font-black text-center" placeholder="0" />
                </div>
                <div>
                  <label className="block text-xs font-black text-rose-600 mb-2 mr-2">دائن (Credit)</label>
                  <input type="number" value={entryForm.credit} onChange={(e) => setEntryForm({...entryForm, credit: e.target.value})} className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-rose-500 outline-none font-mono font-black text-center" placeholder="0" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-black text-slate-500 mb-2 mr-2">الوصف / البيان *</label>
                <input type="text" value={entryForm.description} onChange={(e) => setEntryForm({...entryForm, description: e.target.value})} required className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-blue-500 outline-none font-bold" />
              </div>
              <div className="pt-4">
                <button type="submit" disabled={isSubmitting} className="w-full bg-slate-900 hover:bg-black text-white py-4 rounded-2xl font-black shadow-xl transition-all active:scale-95 disabled:opacity-50 text-sm">
                  {isSubmitting ? 'جاري التسجيل...' : 'اعتماد وترحيل القيد'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}