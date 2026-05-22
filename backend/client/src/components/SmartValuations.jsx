import React, { useState, useEffect } from 'react';
import api from '../services/api';

export default function SmartValuations({ projectId, projectName, fetchWorkspaceData }) {
  const [activeSubTab, setActiveSubTab] = useState('client'); // 'client' or 'subcontractor'
  const [valuations, setValuations] = useState([]);
  const [subInvoices, setSubInvoices] = useState([]);
  const [boqList, setBoqList] = useState([]);
  const [subcontractors, setSubcontractors] = useState([]);
  const [subcontractorItems, setSubcontractorItems] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [isNewValModalOpen, setIsNewValModalOpen] = useState(false);
  const [isNewSubValModalOpen, setIsNewSubValModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedValuation, setSelectedValuation] = useState(null);

  // Client Valuation Form State
  const [valForm, setValForm] = useState({
    valuation_no: '',
    valuation_date: new Date().toISOString().split('T')[0],
    period_from: '',
    period_to: '',
    retention_percent: 10,
    advance_deduction: 0,
    tax_percent: 5,
    penalty_deduction: 0,
    other_deduction: 0,
    notes: ''
  });
  const [valuationItems, setValuationItems] = useState([]); // Items from BOQ

  // Subcontractor Invoice Form State
  const [subForm, setSubForm] = useState({
    subcontractor_id: '',
    client_valuation_id: '',
    date: new Date().toISOString().split('T')[0],
    gross_amount: 0,
    retention_deduction: 0,
    dp_recovery: 0,
    material_deduction: 0,
    tax_deduction: 0,
    description: '',
    notes: ''
  });
  const [subFinancialSummary, setSubFinancialSummary] = useState(null);

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [valRes, subInvRes, boqRes, subRes] = await Promise.all([
        api.get(`/dynamic/table/client_valuations?limit=100&filter=${projectId}`),
        api.get(`/dynamic/table/subcontractor_invoices?limit=100&filter=${projectId}`),
        api.get(`/dynamic/table/boq?limit=500&filter=${encodeURIComponent(projectName)}`),
        api.get(`/dynamic/table/subcontractors?limit=200`)
      ]);
      setValuations(valRes.data?.data || []);
      setSubInvoices(subInvRes.data?.data || []);
      setBoqList(boqRes.data?.data || []);
      setSubcontractors(subRes.data?.data || []);
    } catch (err) {
      console.error("Error fetching valuation data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Open Client Valuation Modal & populate with current BOQ items and their previous quantities
  const handleOpenNewVal = async () => {
    // 1. Get all previously approved valuation items for this project to calculate previous quantities
    let prevQtyMap = {};
    try {
      const prevItemsRes = await api.get(`/dynamic/table/client_valuation_items?limit=2000`);
      const allPrevItems = prevItemsRes.data?.data || [];
      
      // Filter items that belong to approved valuations of this project
      const approvedValuationIds = valuations
        .filter(v => v.status === 'Approved')
        .map(v => v.id);

      allPrevItems.forEach(item => {
        if (approvedValuationIds.includes(item.valuation_id)) {
          prevQtyMap[item.boq_id] = (prevQtyMap[item.boq_id] || 0) + Number(item.curr_qty || 0);
        }
      });
    } catch (e) {
      console.error("Error loading previous quantities:", e);
    }

    // 2. Initialize valuation items from BOQ list
    const items = boqList.map(b => {
      const prevQty = prevQtyMap[b.id] || 0;
      const contractRate = Number(b.client_rate || b.unit_price || 0);
      return {
        boq_id: b.id,
        item_description: b.item_name || b.item_desc || 'بدون اسم',
        uom: b.uom || b.unit || 'متر',
        contract_qty: Number(b.est_qty || 0),
        contract_rate: contractRate,
        prev_qty: prevQty,
        curr_qty: 0,
        cumulative_qty: prevQty,
        amount: 0
      };
    });

    setValuationItems(items);
    setValForm({
      valuation_no: `VAL-${projectName}-${valuations.length + 1}`,
      valuation_date: new Date().toISOString().split('T')[0],
      period_from: '',
      period_to: '',
      retention_percent: 10,
      advance_deduction: 0,
      tax_percent: 5,
      penalty_deduction: 0,
      other_deduction: 0,
      notes: ''
    });
    setIsNewValModalOpen(true);
  };

  // Handle quantity change on item row
  const handleItemQtyChange = (index, val) => {
    const value = parseFloat(val) || 0;
    const updated = [...valuationItems];
    const item = updated[index];
    
    item.curr_qty = value;
    item.cumulative_qty = Number(item.prev_qty || 0) + value;
    item.amount = value * Number(item.contract_rate || 0);
    
    setValuationItems(updated);
  };

  // Calculate gross, deductions, and net for the new client valuation
  const grossAmount = valuationItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const retentionDeduction = (grossAmount * (Number(valForm.retention_percent) || 0)) / 100;
  const taxDeduction = (grossAmount * (Number(valForm.tax_percent) || 0)) / 100;
  const netAmount = grossAmount - retentionDeduction - Number(valForm.advance_deduction || 0) - taxDeduction - Number(valForm.penalty_deduction || 0) - Number(valForm.other_deduction || 0);

  const handleSaveClientValuation = async (e) => {
    e.preventDefault();
    if (valuationItems.filter(i => i.curr_qty > 0).length === 0) {
      alert("يجب إدخال كمية منجزة لبند واحد على الأقل في هذا المستخلص.");
      return;
    }

    try {
      // 1. Save Main Client Valuation Record
      const valRecord = {
        project_id: parseInt(projectId),
        valuation_no: valForm.valuation_no,
        valuation_date: valForm.valuation_date,
        period_from: valForm.period_from || null,
        period_to: valForm.period_to || null,
        gross_amount: grossAmount,
        retention_deduction: retentionDeduction,
        advance_deduction: Number(valForm.advance_deduction) || 0,
        tax_deduction: taxDeduction,
        penalty_deduction: Number(valForm.penalty_deduction) || 0,
        other_deduction: Number(valForm.other_deduction) || 0,
        net_amount: netAmount,
        status: 'Draft',
        notes: valForm.notes
      };

      const saveRes = await api.post('/dynamic/add/client_valuations', valRecord);
      const newValuationId = saveRes.data?.id;

      if (newValuationId) {
        // 2. Save items that have quantities billed
        const activeItems = valuationItems
          .filter(item => item.curr_qty > 0)
          .map(item => ({
            ...item,
            valuation_id: newValuationId
          }));

        for (const item of activeItems) {
          await api.post('/dynamic/add/client_valuation_items', item);
        }

        alert("تم حفظ مسودة المستخلص وتفاصيل البنود بنجاح!");
        setIsNewValModalOpen(false);
        fetchData();
        if (fetchWorkspaceData) fetchWorkspaceData();
      }
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "حدث خطأ أثناء حفظ المستخلص.");
    }
  };

  const handleApproveValuation = async (valId) => {
    if (!window.confirm("هل أنت متأكد من اعتماد وترحيل هذا المستخلص مالياً؟ سيقوم النظام بتوليد القيد المزدوج فوراً.")) return;
    try {
      const val = valuations.find(v => v.id === valId);
      if (!val) return;

      // Update status to Approved
      await api.put(`/dynamic/update/client_valuations/${valId}`, { status: 'Approved', approved_by: 'Admin', approved_at: new Date() });

      // Generate Auto-Journal Double Entries in Ledger
      // Dr. Accounts Receivable (Net)
      // Dr. Retention Receivable (Retention Amount)
      // Cr. Project Operational Revenue (Gross)
      await api.post('/dynamic/add/ledger', {
        account_name: 'عملاء (حسابات مدينة - AR)',
        debit: Number(val.net_amount || 0),
        credit: 0,
        description: `قيد مستخلص العميل رقم ${val.valuation_no} - صافي مستحق - مشروع ${projectName}`,
        cost_center: projectName
      });

      if (Number(val.retention_deduction) > 0) {
        await api.post('/dynamic/add/ledger', {
          account_name: 'تأمين وضمان أعمال طرف الغير',
          debit: Number(val.retention_deduction),
          credit: 0,
          description: `قيد استقطاع ضمان مستخلص العميل رقم ${val.valuation_no} - مشروع ${projectName}`,
          cost_center: projectName
        });
      }

      await api.post('/dynamic/add/ledger', {
        account_name: 'إيرادات مستخلصات وخدمات',
        debit: 0,
        credit: Number(val.gross_amount || 0),
        description: `قيد إيراد مستخلص العميل رقم ${val.valuation_no} - مشروع ${projectName}`,
        cost_center: projectName
      });

      alert("تم اعتماد وترحيل قيد إيرادات المستخلص بنجاح للميزانية العمومية!");
      fetchData();
      if (fetchWorkspaceData) fetchWorkspaceData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "حدث خطأ أثناء اعتماد المستخلص.");
    }
  };

  const handleOpenSubValModal = () => {
    setSubForm({
      subcontractor_id: '',
      client_valuation_id: '',
      date: new Date().toISOString().split('T')[0],
      gross_amount: 0,
      retention_deduction: 0,
      dp_recovery: 0,
      material_deduction: 0,
      tax_deduction: 0,
      description: '',
      notes: ''
    });
    setSubFinancialSummary(null);
    setIsNewSubValModalOpen(true);
  };

  const handleSubcontractorChange = async (subId) => {
    setSubForm(prev => ({ ...prev, subcontractor_id: subId }));
    setSubFinancialSummary(null);
    if (!subId) return;
    try {
      // Get subcontractor items & contracts, and financial summary
      const [itemsRes, summaryRes] = await Promise.all([
        api.get(`/projects/subcontractor_items/${subId}`),
        api.get(`/subcontractors/${subId}/financial_summary`)
      ]);
      setSubcontractorItems(itemsRes.data || []);
      setSubFinancialSummary(summaryRes.data || null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveSubValuation = async (e) => {
    e.preventDefault();
    if (!subForm.subcontractor_id || Number(subForm.gross_amount) <= 0) {
      alert("يرجى اختيار المقاول وإدخال قيمة إجمالية صالحة للمستخلص.");
      return;
    }

    const sub = subcontractors.find(s => s.id === parseInt(subForm.subcontractor_id));
    const gross = Number(subForm.gross_amount) || 0;
    const retention = Number(subForm.retention_deduction) || 0;
    const dp = Number(subForm.dp_recovery) || 0;
    const mat = Number(subForm.material_deduction) || 0;
    const tax = Number(subForm.tax_deduction) || 0;
    const net = gross - retention - dp - mat - tax;

    try {
      const subRecord = {
        subcontractor_id: parseInt(subForm.subcontractor_id),
        subcontractor_name: sub?.name || 'مقاول غير معروف',
        gross_amount: gross,
        retention_deduction: retention,
        dp_recovery: dp,
        material_deduction: mat,
        tax_deduction: tax,
        net_amount: net,
        amount: net,
        description: subForm.description || `مستخلص أعمال المقاول ${sub?.name || ''}`,
        date: subForm.date,
        project_id: parseInt(projectId),
        client_valuation_id: subForm.client_valuation_id ? parseInt(subForm.client_valuation_id) : null,
        status: 'Approved' // Subcontractor bills are marked approved upon review
      };

      await api.post('/dynamic/add/subcontractor_invoices', subRecord);

      // Create Ledger Entry
      // Dr. Project Operational Expenses (Gross)
      // Cr. Subcontractors Payables (Net)
      // Cr. Retention Held Liability (Retention)
      await api.post('/dynamic/add/ledger', {
        account_name: 'تكلفة مقاولي الباطن',
        debit: gross,
        credit: 0,
        description: `قيد إثبات أعمال المقاول ${sub?.name} - مستخلص مشروع ${projectName}`,
        cost_center: projectName
      });

      await api.post('/dynamic/add/ledger', {
        account_name: 'مقاولي الباطن',
        debit: 0,
        credit: net,
        description: `قيد صافي مستحق المقاول ${sub?.name} - مستخلص مشروع ${projectName}`,
        cost_center: projectName
      });

      if (retention > 0) {
        await api.post('/dynamic/add/ledger', {
          account_name: 'تأمينات مستقطعة لجهات خارجية',
          debit: 0,
          credit: retention,
          description: `ضمان أعمال محتجز للمقاول ${sub?.name} - مستخلص مشروع ${projectName}`,
          cost_center: projectName
        });
      }

      alert("تم حفظ مستخلص المقاول وتوليد القيد المزدوج بنجاح!");
      setIsNewSubValModalOpen(false);
      fetchData();
      if (fetchWorkspaceData) fetchWorkspaceData();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "حدث خطأ أثناء حفظ المستخلص.");
    }
  };

  const handleViewValuation = async (valuation) => {
    try {
      const itemsRes = await api.get(`/dynamic/table/client_valuation_items?limit=100`);
      const allItems = itemsRes.data?.data || [];
      const valItems = allItems.filter(item => item.valuation_id === valuation.id);
      setSelectedValuation({ ...valuation, items: valItems });
      setIsViewModalOpen(true);
    } catch (e) {
      console.error(e);
      alert("فشل تحميل بنود المستخلص.");
    }
  };

  return (
    <div className="p-8 space-y-8 animate-fade-in" dir="rtl">
      
      {/* Sub Tabs Selection */}
      <div className="flex justify-between items-center border-b border-slate-100 pb-4">
        <div className="flex gap-4">
          <button 
            onClick={() => setActiveSubTab('client')}
            className={`px-5 py-2.5 rounded-xl font-black text-sm transition-all ${activeSubTab === 'client' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            📋 مستخلصات العميل (Client Valuations)
          </button>
          <button 
            onClick={() => setActiveSubTab('sub')}
            className={`px-5 py-2.5 rounded-xl font-black text-sm transition-all ${activeSubTab === 'sub' ? 'bg-rose-600 text-white shadow-lg shadow-rose-100' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            🔧 مستخلصات مقاولي الباطن
          </button>
        </div>

        {activeSubTab === 'client' ? (
          <button onClick={handleOpenNewVal} className="bg-slate-900 text-white px-5 py-3 rounded-xl font-black shadow-md hover:bg-black text-xs transition-all flex items-center gap-2">
            <span>📐</span> إنشاء مستخلص تفصيلي بالكميات
          </button>
        ) : (
          <button onClick={handleOpenSubValModal} className="bg-slate-900 text-white px-5 py-3 rounded-xl font-black shadow-md hover:bg-black text-xs transition-all flex items-center gap-2">
            <span>🔧</span> إنشاء مستخلص مقاول باطن
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-20 font-black text-slate-400 animate-pulse">جاري سحب المستخلصات وتفاصيل الأعمال...</div>
      ) : activeSubTab === 'client' ? (
        
        /* CLIENT VALUATIONS VIEW */
        <div className="space-y-6">
          {valuations.length === 0 ? (
            <div className="bg-slate-50 text-center py-16 rounded-[2rem] border border-slate-100 font-bold text-slate-400">
              لا توجد مستخلصات مسجلة للعميل حتى الآن. قم بإنشاء أول مستخلص تفصيلي بالكميات.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {valuations.map(val => (
                <div key={val.id} className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex gap-4 items-center">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center font-black text-lg">📄</div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-slate-800">{val.valuation_no || 'مستخلص بدون رقم'}</h4>
                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black ${val.status === 'Approved' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                          {val.status === 'Approved' ? 'معتمد ومرحل محاسبياً' : 'مسودة قيد المراجعة'}
                        </span>
                      </div>
                      <p className="text-slate-400 text-xs mt-1">تاريخ المستخلص: {val.valuation_date ? new Date(val.valuation_date).toLocaleDateString('ar-EG') : 'غير محدد'}</p>
                    </div>
                  </div>

                  <div className="flex gap-6 items-center">
                    <div className="text-left font-mono">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">الكمية الإجمالية</p>
                      <span className="font-black text-slate-700">{Number(val.gross_amount || 0).toLocaleString()} ج.م</span>
                    </div>
                    <div className="text-left font-mono border-r border-slate-100 pr-6">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">الصافي المستحق</p>
                      <span className="font-black text-blue-600">{Number(val.net_amount || 0).toLocaleString()} ج.م</span>
                    </div>

                    <div className="flex gap-2 mr-4">
                      <button onClick={() => handleViewValuation(val)} className="p-3.5 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl font-bold text-xs transition-all">تفاصيل البنود</button>
                      {val.status === 'Draft' && (
                        <button onClick={() => handleApproveValuation(val.id)} className="px-5 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs transition-all shadow-md">اعتماد وترحيل 🚀</button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        
        /* SUBCONTRACTOR INVOICES VIEW */
        <div className="space-y-6">
          {subInvoices.length === 0 ? (
            <div className="bg-slate-50 text-center py-16 rounded-[2rem] border border-slate-100 font-bold text-slate-400">
              لا توجد مستخلصات مقاولين باطن مسجلة للمشروع.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {subInvoices.map(invoice => (
                <div key={invoice.id} className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex gap-4 items-center">
                    <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center font-black text-lg">🔧</div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-black text-slate-800">{invoice.subcontractor_name || 'مقاول غير معروف'}</h4>
                        {(() => {
                          const linkedVal = valuations.find(v => v.id === invoice.client_valuation_id);
                          return linkedVal ? (
                            <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-lg text-[9px] font-black">
                              مربوط بمستخلص عميل: {linkedVal.valuation_no}
                            </span>
                          ) : null;
                        })()}
                      </div>
                      <p className="text-slate-400 text-xs mt-1">{invoice.description || 'مستخلص أعمال بياض وتشطيبات'} - {invoice.date ? new Date(invoice.date).toLocaleDateString('ar-EG') : 'غير محدد'}</p>
                    </div>
                  </div>

                  <div className="flex gap-6 items-center">
                    <div className="text-left font-mono">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">قيمة الإنجاز</p>
                      <span className="font-black text-slate-700">{Number(invoice.gross_amount || 0).toLocaleString()} ج.م</span>
                    </div>
                    <div className="text-left font-mono border-r border-slate-100 pr-6">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">المتبقي غير المسدد</p>
                      <span className="font-black text-rose-600">
                        {Number(invoice.remaining_amount !== undefined ? invoice.remaining_amount : (invoice.net_amount || 0)).toLocaleString()} ج.م
                      </span>
                      {invoice.remaining_amount !== undefined && (
                        <div className="text-[9px] text-slate-400 font-normal mt-0.5">
                          تم صرف {Number(invoice.total_paid || 0).toLocaleString()} من {Number(invoice.net_amount || 0).toLocaleString()}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mr-4 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl text-xs font-black shadow-sm">
                      <span>✓</span> معتمد ومرحل مالياً
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* 🚀 STEP-BY-STEP DETAILED CLIENT VALUATION CREATION MODAL 🚀 */}
      {/* ============================================================== */}
      {isNewValModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-6xl p-8 max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
              <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">📐 إنشاء مستخلص تفصيلي بالكميات والبنود</h3>
              <button onClick={() => setIsNewValModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold text-xl">✕</button>
            </div>

            <form onSubmit={handleSaveClientValuation} className="space-y-8">
              {/* Header Info */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 mb-1">رقم المستخلص *</label>
                  <input type="text" required value={valForm.valuation_no} onChange={e => setValForm({...valForm, valuation_no: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 text-xs font-bold" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 mb-1">التاريخ *</label>
                  <input type="date" required value={valForm.valuation_date} onChange={e => setValForm({...valForm, valuation_date: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 text-xs font-bold" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 mb-1">الفترة من (اختياري)</label>
                  <input type="date" value={valForm.period_from} onChange={e => setValForm({...valForm, period_from: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 text-xs font-bold" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 mb-1">الفترة إلى (اختياري)</label>
                  <input type="date" value={valForm.period_to} onChange={e => setValForm({...valForm, period_to: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 text-xs font-bold" />
                </div>
              </div>

              {/* BOQ Grid Progress */}
              <div className="space-y-4">
                <h4 className="text-md font-black text-slate-700 flex items-center gap-2"><span>🏗️</span> قياس وتحديد الكميات المنفذة بالموقع</h4>
                <div className="overflow-x-auto border border-slate-100 rounded-3xl">
                  <table className="w-full text-right border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100 text-slate-400">
                        <th className="p-4 font-black">بند الأعمال / التوصيف</th>
                        <th className="p-4 font-black text-center">الوحدة</th>
                        <th className="p-4 font-black text-center">الكمية التعاقدية</th>
                        <th className="p-4 font-black text-center">سعر الفئة</th>
                        <th className="p-4 font-black text-center">الكمية السابقة</th>
                        <th className="p-4 font-black text-center">الكمية الحالية</th>
                        <th className="p-4 font-black text-center">الكمية التراكمية</th>
                        <th className="p-4 font-black text-left">قيمة المنجز الحالي</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 font-bold">
                      {valuationItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="p-4 font-black text-slate-800">{item.item_description}</td>
                          <td className="p-4 text-center text-slate-500">{item.uom}</td>
                          <td className="p-4 text-center font-mono">{item.contract_qty.toLocaleString()}</td>
                          <td className="p-4 text-center font-mono text-blue-600">{item.contract_rate.toLocaleString()} ج.م</td>
                          <td className="p-4 text-center font-mono text-slate-400">{item.prev_qty.toLocaleString()}</td>
                          <td className="p-4 text-center">
                            <input 
                              type="number" 
                              step="any"
                              value={item.curr_qty || ''} 
                              onChange={e => handleItemQtyChange(idx, e.target.value)} 
                              placeholder="0"
                              className="w-20 p-2 rounded-lg border border-slate-200 text-center font-mono font-bold text-slate-900 bg-white"
                            />
                          </td>
                          <td className="p-4 text-center font-mono text-slate-700">{item.cumulative_qty.toLocaleString()}</td>
                          <td className="p-4 text-left font-mono text-emerald-600">{Number(item.amount || 0).toLocaleString()} ج.م</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Deductions & Financial Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Deductions Config */}
                <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 space-y-4">
                  <h4 className="font-black text-slate-700 flex items-center gap-2">⚙️ الاستقطاعات والخصومات الذكية</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 mb-1">نسبة استقطاع الضمان (%)</label>
                      <input type="number" value={valForm.retention_percent} onChange={e => setValForm({...valForm, retention_percent: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 text-xs font-bold" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 mb-1">نسبة الضرائب (%)</label>
                      <input type="number" value={valForm.tax_percent} onChange={e => setValForm({...valForm, tax_percent: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 text-xs font-bold" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 mb-1">خصم دفعة مقدمة (ج.م)</label>
                      <input type="number" value={valForm.advance_deduction} onChange={e => setValForm({...valForm, advance_deduction: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 text-xs font-bold" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 mb-1">غرامات موقعية (ج.م)</label>
                      <input type="number" value={valForm.penalty_deduction} onChange={e => setValForm({...valForm, penalty_deduction: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 text-xs font-bold" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 mb-1">استقطاعات أخرى (ج.م)</label>
                      <input type="number" value={valForm.other_deduction} onChange={e => setValForm({...valForm, other_deduction: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 text-xs font-bold" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 mb-1">ملاحظات المستخلص</label>
                    <textarea value={valForm.notes} onChange={e => setValForm({...valForm, notes: e.target.value})} rows="2" className="w-full p-3 rounded-xl border border-slate-200 text-xs font-bold" placeholder="أي تفاصيل أو ملاحظات للتسجيل..." />
                  </div>
                </div>

                {/* Final Bill Breakdown & Ledgers Preview */}
                <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden flex flex-col justify-between">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -translate-y-32"></div>
                  
                  <div className="space-y-4">
                    <h4 className="font-black text-emerald-400 flex items-center gap-2 mb-4">⚖️ التحليل المالي والختامي للمستخلص</h4>
                    
                    <div className="space-y-3 font-bold text-sm">
                      <div className="flex justify-between items-center text-white/70">
                        <span>إجمالي المنجز الحالي (الخام):</span>
                        <span className="font-mono text-white text-md">{grossAmount.toLocaleString()} ج.م</span>
                      </div>
                      <div className="flex justify-between items-center text-rose-400">
                        <span>ضمان أعمال محتجز ({valForm.retention_percent}%):</span>
                        <span className="font-mono text-rose-300">- {retentionDeduction.toLocaleString()} ج.م</span>
                      </div>
                      {Number(valForm.advance_deduction) > 0 && (
                        <div className="flex justify-between items-center text-rose-400">
                          <span>تسوية دفعة مقدمة مستردة:</span>
                          <span className="font-mono text-rose-300">- {Number(valForm.advance_deduction).toLocaleString()} ج.م</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center text-rose-400">
                        <span>مصلحة الضرائب والدمغات ({valForm.tax_percent}%):</span>
                        <span className="font-mono text-rose-300">- {taxDeduction.toLocaleString()} ج.م</span>
                      </div>
                      {(Number(valForm.penalty_deduction) > 0 || Number(valForm.other_deduction) > 0) && (
                        <div className="flex justify-between items-center text-rose-400">
                          <span>غرامات وخصومات إضافية:</span>
                          <span className="font-mono text-rose-300">- {(Number(valForm.penalty_deduction) + Number(valForm.other_deduction)).toLocaleString()} ج.م</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-white/10 pt-6 mt-6">
                    <div className="flex justify-between items-center text-emerald-400 mb-6">
                      <span className="text-md font-black">الصافي المستحق المتبقي:</span>
                      <span className="font-mono text-2xl font-black">{netAmount.toLocaleString()} ج.م</span>
                    </div>

                    <button type="submit" className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-sm shadow-xl shadow-emerald-950/20 active:scale-95 transition-all">
                      حفظ واعتماد مسودة المستخلص التفصيلي 📐
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 🚀 NEW SUBCONTRACTOR VALUATION CREATION MODAL 🚀 */}
      {/* ============================================================== */}
      {isNewSubValModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-xl p-8" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
              <h3 className="text-xl font-black text-slate-800">🔧 تسجيل مستخلص أعمال مقاول باطن</h3>
              <button onClick={() => setIsNewSubValModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold text-xl">✕</button>
            </div>

            <form onSubmit={handleSaveSubValuation} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-1">اختر مقاول الباطن *</label>
                <select 
                  required 
                  value={subForm.subcontractor_id} 
                  onChange={e => handleSubcontractorChange(e.target.value)} 
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs font-bold"
                >
                  <option value="">-- اختر مقاول الباطن من القائمة * --</option>
                  {subcontractors.map(s => <option key={s.id} value={s.id}>{s.name} ({s.trade || 'تشطيبات'})</option>)}
                </select>
              </div>

              {/* Financial summary of the subcontractor */}
              {subFinancialSummary && (
                <div className="grid grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center font-mono">
                  <div>
                    <span className="block text-[9px] font-bold text-slate-400">إجمالي معتمد سابقاً</span>
                    <span className="font-black text-slate-700 text-xs">{Number(subFinancialSummary.total_invoiced || 0).toLocaleString()} ج.م</span>
                  </div>
                  <div>
                    <span className="block text-[9px] font-bold text-slate-400">ما تم صرفه سابقاً</span>
                    <span className="font-black text-emerald-600 text-xs">{Number(subFinancialSummary.total_disbursed || 0).toLocaleString()} ج.م</span>
                  </div>
                  <div className="border-r border-slate-200 pr-2">
                    <span className="block text-[9px] font-bold text-slate-400">الرصيد المتبقي المستحق</span>
                    <span className="font-black text-rose-600 text-xs">{Number(subFinancialSummary.remaining_balance || 0).toLocaleString()} ج.م</span>
                  </div>
                </div>
              )}

              {/* Dropdown to link with Client Valuation */}
              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-1">ربط بمستخلص العميل</label>
                <select 
                  value={subForm.client_valuation_id || ''} 
                  onChange={e => setSubForm({...subForm, client_valuation_id: e.target.value})} 
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs font-bold"
                >
                  <option value="">-- اختياري: ربط بمستخلص عميل --</option>
                  {valuations.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.valuation_no} ({new Date(v.valuation_date).toLocaleDateString('ar-EG')}) - صافي: {Number(v.net_amount).toLocaleString()} ج.م
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 mb-1">التاريخ *</label>
                  <input type="date" required value={subForm.date} onChange={e => setSubForm({...subForm, date: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 text-xs font-bold" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 mb-1">إجمالي الأعمال المنجزة (ج.م) *</label>
                  <input type="number" required value={subForm.gross_amount || ''} onChange={e => setSubForm({...subForm, gross_amount: e.target.value})} placeholder="0" className="w-full p-3 rounded-xl border border-slate-200 text-xs font-bold" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 mb-1">خصم ضمان أعمال (%)</label>
                  <input type="number" value={subForm.retention_deduction || ''} onChange={e => setSubForm({...subForm, retention_deduction: e.target.value})} placeholder="5% or 10%" className="w-full p-3 rounded-xl border border-slate-200 text-xs font-bold" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 mb-1">خصم دفعة مقدمة (ج.م)</label>
                  <input type="number" value={subForm.dp_recovery || ''} onChange={e => setSubForm({...subForm, dp_recovery: e.target.value})} placeholder="0" className="w-full p-3 rounded-xl border border-slate-200 text-xs font-bold" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 mb-1">خصم سحبيات مواد/خامات (ج.م)</label>
                  <input type="number" value={subForm.material_deduction || ''} onChange={e => setSubForm({...subForm, material_deduction: e.target.value})} placeholder="0" className="w-full p-3 rounded-xl border border-slate-200 text-xs font-bold" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 mb-1">خصم ضرائب ودمغات (ج.م)</label>
                  <input type="number" value={subForm.tax_deduction || ''} onChange={e => setSubForm({...subForm, tax_deduction: e.target.value})} placeholder="0" className="w-full p-3 rounded-xl border border-slate-200 text-xs font-bold" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 mb-1">بيان الأعمال التوصيفي</label>
                <input type="text" required value={subForm.description} onChange={e => setSubForm({...subForm, description: e.target.value})} placeholder="مثال: مستخلص أعمال بياض محارة تخشين..." className="w-full p-3 rounded-xl border border-slate-200 text-xs font-bold" />
              </div>

              {/* Net Payable calculation banner */}
              <div className="p-4 bg-emerald-50 text-center rounded-2xl font-mono font-black text-md text-emerald-700">
                الصافي الفعلي للمقاول: {
                  (
                    (Number(subForm.gross_amount) || 0) -
                    (Number(subForm.retention_deduction) || 0) -
                    (Number(subForm.dp_recovery) || 0) -
                    (Number(subForm.material_deduction) || 0) -
                    (Number(subForm.tax_deduction) || 0)
                  ).toLocaleString()
                } ج.م
              </div>

              <button type="submit" className="w-full py-4 bg-slate-900 hover:bg-black text-white rounded-2xl font-black text-sm transition-all shadow-md mt-4">
                تأكيد واعتماد مستخلص مقاول الباطن 🚀
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* 🚀 DETAILED VIEW MODAL FOR SAVED VALUATIONS 🚀 */}
      {/* ============================================================== */}
      {isViewModalOpen && selectedValuation && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-5xl p-8 max-h-[88vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-6">
              <div>
                <h3 className="text-xl font-black text-slate-800">{selectedValuation.valuation_no}</h3>
                <p className="text-slate-400 text-xs mt-1">تاريخ الإثبات: {new Date(selectedValuation.valuation_date).toLocaleDateString('ar-EG')}</p>
              </div>
              <button onClick={() => setIsViewModalOpen(false)} className="text-slate-400 hover:text-slate-600 font-bold text-xl">✕</button>
            </div>

            <div className="space-y-6">
              {/* Items Grid */}
              <div className="overflow-x-auto border border-slate-100 rounded-3xl">
                <table className="w-full text-right border-collapse text-xs">
                  <thead className="bg-slate-50 border-b border-slate-100 text-slate-400">
                    <tr>
                      <th className="p-4 font-black">البند / التوصيف</th>
                      <th className="p-4 font-black text-center">الوحدة</th>
                      <th className="p-4 font-black text-center">الكمية المتعاقدية</th>
                      <th className="p-4 font-black text-center">سعر الفئة</th>
                      <th className="p-4 font-black text-center">الكمية السابقة</th>
                      <th className="p-4 font-black text-center">الكمية الحالية</th>
                      <th className="p-4 font-black text-center">الكمية التراكمية</th>
                      <th className="p-4 font-black text-left">قيمة البند الحالي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-bold">
                    {selectedValuation.items?.map((item, idx) => (
                      <tr key={idx}>
                        <td className="p-4 text-slate-800 font-black">{item.item_description}</td>
                        <td className="p-4 text-center text-slate-500">{item.uom}</td>
                        <td className="p-4 text-center font-mono">{Number(item.contract_qty).toLocaleString()}</td>
                        <td className="p-4 text-center font-mono text-blue-600">{Number(item.contract_rate).toLocaleString()} ج.م</td>
                        <td className="p-4 text-center font-mono text-slate-400">{Number(item.prev_qty).toLocaleString()}</td>
                        <td className="p-4 text-center font-mono text-slate-900 bg-slate-50/50">{Number(item.curr_qty).toLocaleString()}</td>
                        <td className="p-4 text-center font-mono text-slate-700">{Number(item.cumulative_qty).toLocaleString()}</td>
                        <td className="p-4 text-left font-mono text-emerald-600">{Number(item.amount).toLocaleString()} ج.م</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Ledger Summary */}
              <div className="grid grid-cols-3 gap-6 bg-slate-50 p-6 rounded-[2rem] border border-slate-100 text-sm">
                <div>
                  <span className="font-bold text-slate-400 block text-xs">إجمالي الإنجاز الحالي (الخام)</span>
                  <span className="font-black text-slate-800 text-lg font-mono">{Number(selectedValuation.gross_amount || 0).toLocaleString()} ج.م</span>
                </div>
                <div>
                  <span className="font-bold text-slate-400 block text-xs">مجموع الاستقطاعات والخصومات</span>
                  <span className="font-black text-rose-600 text-lg font-mono">
                    {- (
                      Number(selectedValuation.retention_deduction || 0) +
                      Number(selectedValuation.advance_deduction || 0) +
                      Number(selectedValuation.tax_deduction || 0) +
                      Number(selectedValuation.penalty_deduction || 0) +
                      Number(selectedValuation.other_deduction || 0)
                    ).toLocaleString()} ج.m
                  </span>
                </div>
                <div className="border-r border-slate-200 pr-6">
                  <span className="font-bold text-slate-400 block text-xs">صافي الإيراد / الصافي المستحق</span>
                  <span className="font-black text-emerald-600 text-lg font-mono">{Number(selectedValuation.net_amount || 0).toLocaleString()} ج.م</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
