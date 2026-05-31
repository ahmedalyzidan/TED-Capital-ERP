import React, { useState, useEffect, useContext } from 'react';
import api from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import Subcontractor360 from '../components/Subcontractor360';
import SubcontractorAnalytics from '../components/SubcontractorAnalytics';

export default function Subcontractors() {
  const { language, theme } = useLanguage();
  const isDark = theme === 'dark';
  const activeCompany = localStorage.getItem('active_company') || '';
  const [activeTab, setActiveTab] = useState('subs');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [boqList, setBoqList] = useState([]);
  const [subcontractors, setSubcontractors] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [projects, setProjects] = useState([]);

  // Requisition & BOQ States
  const [inventoryItems, setInventoryItems] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [selectedBoq, setSelectedBoq] = useState(null);
  const [isReqModalOpen, setIsReqModalOpen] = useState(false);
  const [reqForm, setReqForm] = useState({
    warehouse_id: '',
    inventory_id: '',
    qty: '',
    notes: ''
  });

  const [isBoqModalOpen, setIsBoqModalOpen] = useState(false);
  const [boqForm, setBoqForm] = useState({
    item_name: '',
    project_name: '',
    uom: '',
    est_qty: '',
    est_unit_price: '',
    est_material_qty: '',
    est_material_cost: '',
    est_labor_cost: '',
    est_subcontractor_cost: '',
    material_category: ''
  });

  // Modals & Analytics States
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [selectedSubId, setSelectedSubId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [globalStats, setGlobalStats] = useState(null);
  const [isEditSubModalOpen, setIsEditSubModalOpen] = useState(false);
  const [editSubForm, setEditSubForm] = useState({
    id: '',
    name: '',
    phone: '',
    project_id: '',
    company: '',
    tax_id: '',
    license_number: '',
    insurance_expiry: ''
  });

  const [subForm, setSubForm] = useState({
    name: '',
    phone: '',
    project_id: '',
    company: '',
    tax_id: '',
    license_number: '',
    insurance_expiry: ''
  });

  // --- New Subcontractor Progress Claim States ---
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [isSubmittingClaim, setIsSubmittingClaim] = useState(false);
  const [selectedPrintInvoice, setSelectedPrintInvoice] = useState(null);

  // --- Subcontractor Payment States ---
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [paymentForm, setPaymentForm] = useState({
    subcontractor_id: '',
    project_name: '',
    invoice_id: '',
    amount_paid: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'InstaPay',
    reference_no: '',
    notes: '',
    source_account: 'نقدية بالبنوك والصندوق'
  });
  const [coaAccounts, setCoaAccounts] = useState([]);
  const [subcontractorIntelligence, setSubcontractorIntelligence] = useState({ contracts: [], boqs: [], stats: {} });
  const [claimForm, setClaimForm] = useState({
    subcontractor_id: '',
    contract_id: '',
    sub_item_id: '',
    curr_qty: '',
    prev_qty: 0,
    gross_amount: 0,
    retention_deduction: 0,
    dp_recovery: 0,
    material_deduction: '',
    tax_deduction: '',
    net_amount: 0,
    progress_percent: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
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
        title: "تتبع بنود المقايسة والكميات المنفذة والمواد",
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
        title: "Track BOQ Items, Quantities, and Warehouse Materials",
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
        const [boqRes, invRes, whRes] = await Promise.all([
          api.get('/dynamic/table/boq?limit=500'),
          api.get('/dynamic/table/inventory_items?limit=1000'),
          api.get('/dynamic/table/warehouses?limit=100')
        ]);
        setBoqList(boqRes.data.data || []);
        setInventoryItems(invRes.data.data || []);
        setWarehouses(whRes.data.data || []);
      } else if (activeTab === 'subs') {
        const res = await api.get('/table/subcontractors?limit=100');
        setSubcontractors(res.data.data || []);
      } else if (activeTab === 'invoices') {
        const res = await api.get('/table/subcontractor_invoices?limit=100');
        setInvoices(res.data.data || []);
      }

      const [projRes, coaRes] = await Promise.all([
        api.get('/dynamic/table/projects?limit=500'),
        api.get('/dynamic/table/chart_of_accounts?limit=1000').catch(() => ({ data: { data: [] } }))
      ]);
      setProjects(projRes.data.data || []);
      const allCoa = coaRes.data?.data || [];
      const filteredCoa = allCoa.filter(acc => {
        const code = acc.account_code || '';
        return (code.startsWith('110') || code.startsWith('111')) && code !== '1100' && code !== '1110';
      });
      setCoaAccounts(filteredCoa);
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  const handleSubChange = (e) => setSubForm({ ...subForm, [e.target.name]: e.target.value });
  const handleEditSubChange = (e) => setEditSubForm({ ...editSubForm, [e.target.name]: e.target.value });

  const fetchProjects = async () => {
    try {
      const projRes = await api.get('/dynamic/table/projects?limit=500');
      setProjects(projRes.data.data || []);
    } catch (error) { console.error("Failed to fetch projects:", error); }
  };

  const openSubModal = () => {
    fetchProjects();
    setSubForm({
      name: '',
      phone: '',
      project_id: '',
      company: localStorage.getItem('active_company') || '',
      tax_id: '',
      license_number: '',
      insurance_expiry: ''
    });
    setIsSubModalOpen(true);
  };

  const openEditSubModal = (sub) => {
    fetchProjects();
    setEditSubForm({
      id: sub.id,
      name: sub.name || '',
      phone: sub.phone || '',
      project_id: sub.project_id || '',
      company: sub.company || '',
      tax_id: sub.tax_id || '',
      license_number: sub.license_number || '',
      insurance_expiry: sub.insurance_expiry ? sub.insurance_expiry.split('T')[0] : ''
    });
    setIsEditSubModalOpen(true);
  };

  const submitEditSubcontractor = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const selectedProj = projects.find(p => Number(p.id) === Number(editSubForm.project_id));
      let resolvedCompanyId = null;
      if (selectedProj && selectedProj.company_id) {
        resolvedCompanyId = selectedProj.company_id;
      } else if (editSubForm.company) {
        const pMatch = projects.find(p => p.company && p.company.toLowerCase() === editSubForm.company.toLowerCase());
        if (pMatch && pMatch.company_id) resolvedCompanyId = pMatch.company_id;
      }
      const payload = { ...editSubForm, company_id: resolvedCompanyId };
      await api.put(`/update/subcontractors/${editSubForm.id}`, payload);
      alert(language === 'ar' ? "تم تحديث بيانات المقاول بنجاح!" : "Subcontractor updated successfully!");
      setIsEditSubModalOpen(false);
      fetchData();
    } catch (error) {
      alert(error.response?.data?.error || "Error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubDelete = async (subId) => {
    if (!window.confirm(language === 'ar' ? "هل أنت متأكد من حذف هذا المقاول؟" : "Are you sure you want to delete this subcontractor?")) return;
    try {
      await api.delete(`/delete/subcontractors/${subId}`);
      alert(language === 'ar' ? "تم حذف المقاول بنجاح!" : "Subcontractor deleted successfully!");
      fetchData();
    } catch (error) {
      alert(error.response?.data?.error || "Error");
    }
  };

  const submitSubcontractor = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const selectedProj = projects.find(p => Number(p.id) === Number(subForm.project_id));
      let resolvedCompanyId = null;
      if (selectedProj && selectedProj.company_id) {
        resolvedCompanyId = selectedProj.company_id;
      } else if (subForm.company) {
        const pMatch = projects.find(p => p.company && p.company.toLowerCase() === subForm.company.toLowerCase());
        if (pMatch && pMatch.company_id) resolvedCompanyId = pMatch.company_id;
      }
      const payload = { ...subForm, company_id: resolvedCompanyId };
      await api.post('/add/subcontractors', payload);
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

  const deleteInvoice = async (invoiceId) => {
    if (!window.confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذه الفاتورة وعكس القيود المحاسبية وكميات المقايسة؟' : 'Are you sure you want to delete this invoice and reverse its accounting & BOQ entries?')) return;
    try {
      const res = await api.delete(`/subcontractors/delete_invoice/${invoiceId}`);
      alert(res.data?.message || (language === 'ar' ? 'تم حذف الفاتورة بنجاح.' : 'Invoice deleted successfully.'));
      fetchData();
    } catch (error) {
      alert(error.response?.data?.error || 'Error deleting invoice');
    }
  };

  const handleClaimSubcontractorChange = async (subId) => {
    setClaimForm(prev => ({
      ...prev,
      subcontractor_id: subId,
      contract_id: '',
      sub_item_id: '',
      curr_qty: '',
      prev_qty: 0,
      gross_amount: 0,
      retention_deduction: 0,
      dp_recovery: 0,
      material_deduction: '',
      tax_deduction: '',
      net_amount: 0,
      progress_percent: '',
      description: ''
    }));
    setSubcontractorIntelligence({ contracts: [], boqs: [], stats: {} });

    if (!subId) return;

    try {
      const res = await api.get(`/subcontractors/intelligence/${subId}`);
      if (res.data.success) {
        setSubcontractorIntelligence({
          contracts: res.data.contracts || [],
          boqs: res.data.boqs || [],
          stats: res.data.stats || {}
        });
      }
    } catch (err) {
      console.error("Failed to fetch subcontractor intelligence:", err);
    }
  };

  const handleClaimFieldChange = (field, value) => {
    const updatedForm = { ...claimForm, [field]: value };

    const activeContract = subcontractorIntelligence.contracts.find(c => c.id === parseInt(updatedForm.contract_id));
    const activeBoq = subcontractorIntelligence.boqs.find(b => b.boq_id === parseInt(updatedForm.sub_item_id));

    let prevQty = 0;
    if (activeBoq) {
      prevQty = invoices
        .filter(inv => inv.subcontractor_id === parseInt(updatedForm.subcontractor_id) && inv.sub_item_id === activeBoq.boq_id && (inv.status === 'Approved' || inv.status === 'Paid'))
        .reduce((sum, curr) => sum + Number(curr.curr_qty || 0), 0);

      updatedForm.prev_qty = prevQty;

      const currQtyVal = parseFloat(field === 'curr_qty' ? value : updatedForm.curr_qty) || 0;
      const subUnitPrice = parseFloat(activeBoq.sub_unit_price) || 0;
      const grossVal = currQtyVal * subUnitPrice;
      updatedForm.gross_amount = Math.round(grossVal * 100) / 100;

      const retentionPct = activeContract ? parseFloat(activeContract.retention_percent) || 0 : 5;
      updatedForm.retention_deduction = Math.round((grossVal * (retentionPct / 100)) * 100) / 100;

      const advancePct = activeContract ? parseFloat(activeContract.advance_percent) || 0 : 10;
      updatedForm.dp_recovery = Math.round((grossVal * (advancePct / 100)) * 100) / 100;

      const assignedQty = parseFloat(activeBoq.assigned_qty) || parseFloat(activeBoq.est_qty) || 1;
      const totalExecutedQty = prevQty + currQtyVal;
      updatedForm.progress_percent = Math.round(((totalExecutedQty / assignedQty) * 100) * 100) / 100;
    }

    const gross = parseFloat(updatedForm.gross_amount) || 0;
    const ret = parseFloat(updatedForm.retention_deduction) || 0;
    const adv = parseFloat(updatedForm.dp_recovery) || 0;
    const mat = parseFloat(updatedForm.material_deduction) || 0;
    const tax = parseFloat(updatedForm.tax_deduction) || 0;

    updatedForm.net_amount = Math.round((gross - ret - adv - mat - tax) * 100) / 100;

    if (activeBoq && field === 'curr_qty') {
      updatedForm.description = language === 'ar'
        ? `مستخلص جاري لبند: ${activeBoq.item_name} - كمية: ${value} ${activeBoq.uom}`
        : `Progress Claim for: ${activeBoq.item_name} - Qty: ${value} ${activeBoq.uom}`;
    }

    setClaimForm(updatedForm);
  };

  const handleClaimSubmit = async (e) => {
    e.preventDefault();
    if (!claimForm.subcontractor_id || !claimForm.contract_id || !claimForm.sub_item_id || !claimForm.curr_qty) {
      alert(language === 'ar' ? "يرجى ملء جميع الحقول المطلوبة!" : "Please fill in all required fields!");
      return;
    }

    setIsSubmittingClaim(true);
    try {
      const activeBoq = subcontractorIntelligence.boqs.find(b => b.boq_id === parseInt(claimForm.sub_item_id));

      const payload = {
        ...claimForm,
        project_name: activeBoq?.project_name || 'General',
        sub_item_id: activeBoq?.boq_id
      };

      await api.post('/subcontractors/progress_claim_detailed', payload);
      alert(language === 'ar' ? "تم إرسال مستخلص مقاول الباطن للمراجعة والاعتماد بنجاح!" : "Subcontractor progress claim submitted successfully!");
      setIsClaimModalOpen(false);
      setClaimForm({
        subcontractor_id: '',
        contract_id: '',
        sub_item_id: '',
        curr_qty: '',
        prev_qty: 0,
        gross_amount: 0,
        retention_deduction: 0,
        dp_recovery: 0,
        material_deduction: '',
        tax_deduction: '',
        net_amount: 0,
        progress_percent: '',
        description: '',
        date: new Date().toISOString().split('T')[0]
      });
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || "Error registering claim");
    } finally {
      setIsSubmittingClaim(false);
    }
  };

  const openPaymentModal = (invoice) => {
    const projName = invoice.project_name || invoice.project_id || '';
    const proj = projects.find(p => String(p.name).toLowerCase().trim() === String(projName).toLowerCase().trim() || String(p.id) === String(projName));
    
    let defaultSource = 'نقدية بالبنوك والصندوق';
    if (proj && proj.company) {
      const matchingAcc = coaAccounts.find(acc => 
        acc.company_entity === proj.company && 
        acc.account_code.startsWith('110')
      );
      if (matchingAcc) {
        defaultSource = matchingAcc.account_name;
      } else {
        const matchingAny = coaAccounts.find(acc => acc.company_entity === proj.company);
        if (matchingAny) {
          defaultSource = matchingAny.account_name;
        }
      }
    }

    setPaymentForm({
      subcontractor_id: invoice.subcontractor_id,
      project_name: invoice.project_name || invoice.project_id || 'General',
      invoice_id: invoice.id,
      amount_paid: invoice.remaining_amount !== undefined ? invoice.remaining_amount : (invoice.net_amount || invoice.amount || ''),
      payment_date: new Date().toISOString().split('T')[0],
      payment_method: 'InstaPay',
      reference_no: '',
      notes: language === 'ar' 
        ? `صرف مستخلص جاري رقم ${invoice.id} للمقاول` 
        : `Disbursement for claim #${invoice.id}`,
      source_account: defaultSource
    });
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    if (!paymentForm.subcontractor_id || !paymentForm.amount_paid || Number(paymentForm.amount_paid) <= 0) {
      alert(language === 'ar' ? "يرجى إدخال مبلغ الصرف بشكل صحيح." : "Please enter a valid disbursement amount.");
      return;
    }
    setIsSubmittingPayment(true);
    try {
      await api.post('/subcontractors/record_payment', paymentForm);
      alert(language === 'ar' ? "تم تسجيل عملية الصرف بنجاح وترحيلها للحسابات!" : "Disbursement recorded and ledger posted successfully!");
      setIsPaymentModalOpen(false);
      fetchData();
    } catch (error) {
      alert(error.response?.data?.error || "Error recording payment");
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // BOQ Item creation inside global tab
  const handleBoqSubmit = async (e) => {
    e.preventDefault();
    if (!boqForm.project_name) {
      alert(language === 'ar' ? 'يرجى اختيار المشروع.' : 'Please select a project.');
      return;
    }
    setIsSubmitting(true);
    try {
      const estQty = Number(boqForm.est_qty) || 0;
      const estPrice = Number(boqForm.est_unit_price) || 0;
      await api.post('/dynamic/add/boq', {
        ...boqForm,
        est_qty: estQty,
        est_unit_price: estPrice,
        est_total_price: estQty * estPrice,
        est_material_qty: Number(boqForm.est_material_qty) || 0,
        est_material_cost: Number(boqForm.est_material_cost) || 0,
        est_labor_cost: Number(boqForm.est_labor_cost) || 0,
        est_subcontractor_cost: Number(boqForm.est_subcontractor_cost) || 0
      });
      alert(language === 'ar' ? "تم إضافة بند الأعمال بنجاح!" : "BOQ item added successfully!");
      setIsBoqModalOpen(false);
      setBoqForm({
        item_name: '', project_name: '', uom: '', est_qty: '', est_unit_price: '',
        est_material_qty: '', est_material_cost: '', est_labor_cost: '',
        est_subcontractor_cost: '', material_category: ''
      });
      fetchData();
    } catch (error) {
      alert(error.response?.data?.error || "Error");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Requisition submission inside global tab
  const handleReqSubmit = async (e) => {
    e.preventDefault();
    if (!reqForm.inventory_id || !reqForm.qty || Number(reqForm.qty) <= 0) {
      alert("يرجى اختيار الصنف وإدخل كمية صالحة.");
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
        project_name: selectedBoq.project_name,
        boq_id: selectedBoq.id,
        inventory_id: selectedItem.id,
        material: selectedItem.item_name || selectedItem.name,
        qty: Number(reqForm.qty),
        notes: reqForm.notes || ''
      });
      alert(language === 'ar' ? "تم صرف المواد للمشروع وربطها بالبند وتوليد الحسابات بنجاح!" : "Materials issued and double-entry ledger triggered successfully!");
      setIsReqModalOpen(false);
      setReqForm({ warehouse_id: '', inventory_id: '', qty: '', notes: '' });
      fetchData();
    } catch (error) {
      alert(error.response?.data?.error || "Error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`${isDark ? 'subcontractors-dark' : 'subcontractors-light'} min-h-screen p-6 sm:p-10 space-y-8`}
      style={{ backgroundColor: isDark ? '#1d2026' : '#f8fafc', color: isDark ? '#f1f5f9' : '#0f172a' }}
      dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <style dangerouslySetInnerHTML={{
        __html: isDark ? `
        /* ═══════════════════════════════════════════════════════════
           DARK THEME ENGINE — Subcontractors Scoped
        ═══════════════════════════════════════════════════════════ */
        .subcontractors-dark .bg-slate-900\/90 {
          background-color: #272a33 !important;
          border-color: #3e4452 !important;
          color: #f1f5f9 !important;
        }
        .subcontractors-dark .bg-slate-950 {
          background-color: #171920 !important;
          border-color: #2e323d !important;
          color: #f1f5f9 !important;
        }
        .subcontractors-dark .bg-white,
        .subcontractors-dark [class*="bg-white"] {
          background-color: #272a33 !important;
          border-color: #3e4452 !important;
          color: #f1f5f9 !important;
        }
        .subcontractors-dark .bg-slate-100 {
          background-color: #22252e !important;
        }
        .subcontractors-dark .bg-slate-200 {
          background-color: #2e323d !important;
        }
        .subcontractors-dark .bg-\\[\\#0b0f19\\]\/90 {
          background-color: #171920 !important;
          border-color: #2e323d !important;
        }
        .subcontractors-dark button.bg-\\[\\#1e293b\\]\/80 {
          background-color: #29384e !important;
          border: 1.8px solid rgba(217,167,112,0.6) !important;
          color: #d9a770 !important;
        }
        .subcontractors-dark button.bg-\\[\\#131d31\\]\/50 {
          background-color: #22252e !important;
          border: 1px solid #3e4452 !important;
          color: #94a3b8 !important;
        }
        .subcontractors-dark .text-slate-900 { color: #f1f5f9 !important; }
        .subcontractors-dark .text-slate-700 { color: #cbd5e1 !important; }
        .subcontractors-dark .text-slate-500,
        .subcontractors-dark .text-slate-400 { color: #94a3b8 !important; }
        .subcontractors-dark .border-slate-200,
        .subcontractors-dark .border-slate-100 { border-color: #3e4452 !important; }
        .subcontractors-dark input,
        .subcontractors-dark select,
        .subcontractors-dark textarea {
          background-color: #22252e !important;
          border-color: #3e4452 !important;
          color: #f1f5f9 !important;
        }
        .subcontractors-dark tr:hover { background-color: rgba(41,56,78,0.3) !important; }
        .subcontractors-dark thead { background-color: #171920 !important; }
        .subcontractors-dark th { color: #94a3b8 !important; border-color: #3e4452 !important; }
        .subcontractors-dark td { color: #f1f5f9 !important; border-color: #2e323d !important; }
        ` : `
        /* ═══════════════════════════════════════════════════════════
           PREMIUM WHITE THEME ENGINE — Subcontractors Scoped
        ═══════════════════════════════════════════════════════════ */
        .subcontractors-light {
          --sub-bg-page: #f8fafc;
          --sub-bg-card: #ffffff;
          --sub-bg-alt: #f1f5f9;
          --sub-border: #e2e8f0;
          --sub-text-primary: #0f172a;
          --sub-text-secondary: #475569;
        }

        .subcontractors-light .bg-slate-900\\/90 {
          background-color: #ffffff !important;
          border-color: var(--sub-border) !important;
          color: var(--sub-text-primary) !important;
        }
        .subcontractors-light .bg-slate-900\\/90 h1,
        .subcontractors-light .bg-slate-900\\/90 p,
        .subcontractors-light .bg-slate-900\\/90 div {
          color: var(--sub-text-primary) !important;
        }
        .subcontractors-light .bg-slate-900\\/90 .text-slate-300 {
          color: var(--sub-text-secondary) !important;
        }
        .subcontractors-light .bg-slate-900\\/90 .bg-\\[\\#1e293b\\] {
          background-color: #f1f5f9 !important;
          border-color: #e2e8f0 !important;
          color: #0f172a !important;
        }

        .subcontractors-light .bg-\\[\\#0b0f19\\]\\/90 {
          background-color: #f1f5f9 !important;
          border-color: #e2e8f0 !important;
        }
        .subcontractors-light button.bg-\\[\\#1e293b\\]\\/80 {
          background-color: #ffffff !important;
          border: 1.8px solid #0f172a !important;
          color: #d97706 !important;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05) !important;
        }
        .subcontractors-light button.bg-\\[\\#131d31\\]\\/50 {
          background-color: #ffffff !important;
          border: 1.8px solid #f1f5f9 !important;
          color: #64748b !important;
        }
        .subcontractors-light button.bg-\\[\\#131d31\\]\\/50:hover {
          background-color: #f8fafc !important;
          color: #0f172a !important;
        }

        .subcontractors-light .bg-slate-950 {
          background-color: #ffffff !important;
          border-color: #e2e8f0 !important;
          color: #0f172a !important;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05) !important;
        }
        .subcontractors-light .bg-slate-950 .text-indigo-400 {
          color: #4f46e5 !important;
        }
        .subcontractors-light .bg-slate-950 .text-slate-500 {
          color: #64748b !important;
        }
        .subcontractors-light .bg-slate-950 .bg-gradient-to-br {
          display: none !important;
        }
        .subcontractors-light .bg-slate-900\\/60 {
          background-color: rgba(15, 23, 42, 0.3) !important;
        }
        `
      }} />
      <div className="max-w-[1600px] mx-auto space-y-8">

        {/* --- HEADER --- */}
        <div className="bg-slate-900/90 backdrop-blur-2xl border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full -translate-y-32 translate-x-32 blur-3xl opacity-50"></div>

          <div className="flex items-center gap-6 relative z-10">
            <div className="w-16 h-16 bg-[#1e293b] border border-slate-850 text-white rounded-2xl flex items-center justify-center text-3xl shadow-xl shadow-slate-900/20 transform rotate-3">👷‍♂️</div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-black text-white tracking-tight">{cur.title}</h1>
                <span className="bg-blue-600 border border-blue-500/30 text-white px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/20">SUBCON-PRO</span>
              </div>
              <p className="text-slate-300 font-bold text-xs mt-2 max-w-xl leading-relaxed">{cur.subtitle}</p>
            </div>
          </div>

          <div className="bg-[#0b0f19]/90 border border-slate-800/80 p-1.5 rounded-2xl flex gap-1 relative z-10 overflow-x-auto scrollbar-none">
            {Object.keys(cur.tabs).map(tab => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setSearchQuery(''); }}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-xs transition-all duration-300 whitespace-nowrap ${activeTab === tab
                  ? 'bg-[#1e293b]/80 border-2 border-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                  : 'bg-[#131d31]/50 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/40'
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
            <div className="bg-slate-950 p-6 rounded-[2rem] text-white shadow-xl relative overflow-hidden group border border-white/5">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-transparent"></div>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2 italic">Portfolio Volume</span>
              <div className="flex items-end justify-between">
                <span className="text-2xl font-black font-mono tracking-tighter text-indigo-400">
                  {Number(globalStats.total_contract_value).toLocaleString()} <span className="text-[9px] opacity-40 font-sans">LCY</span>
                </span>
                <span className="text-xl opacity-20">🏗️</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-md transition-all">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Strategic Partners</span>
              <div className="flex items-end justify-between">
                <span className="text-2xl font-black text-slate-900 font-mono tracking-tighter">{globalStats.total_subs}</span>
                <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-lg text-[8px] font-black uppercase tracking-widest italic border border-slate-200">Active Entities</span>
              </div>
            </div>

            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-md transition-all">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Pending Certifications</span>
              <div className="flex items-end justify-between">
                <span className={`text-2xl font-black font-mono tracking-tighter ${Number(globalStats.pending_claims) > 0 ? 'text-amber-500' : 'text-slate-900'}`}>
                  {globalStats.pending_claims}
                </span>
                <span className="text-xl">📋</span>
              </div>
            </div>

            <div className={`p-6 rounded-[2rem] border shadow-sm transition-all hover:shadow-md ${Number(globalStats.expired_compliance) > 0 ? 'bg-rose-50/30 border-rose-200' : 'bg-white border-slate-200'}`}>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Risk Exposure</span>
              <div className="flex items-end justify-between">
                <span className={`text-2xl font-black font-mono tracking-tighter ${Number(globalStats.expired_compliance) > 0 ? 'text-rose-600' : 'text-emerald-500'}`}>
                  {globalStats.expired_compliance}
                </span>
                <span className="text-[9px] font-black uppercase tracking-widest opacity-60">
                  {Number(globalStats.expired_compliance) > 0 ? 'Critical Alerts' : 'Fully Compliant'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* --- SEARCH BAR --- */}
        {activeTab !== 'analytics' && (
          <div className="bg-white rounded-[2rem] p-4 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-md border border-slate-200">
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <div className="relative w-full sm:w-80">
                <input
                  type="text"
                  className="w-full bg-slate-100 border border-slate-200 text-slate-700 placeholder-slate-400 rounded-full pl-10 pr-4 py-2 text-xs focus:outline-none focus:border-slate-300"
                  placeholder={
                    activeTab === 'boq'
                      ? (language === 'ar' ? 'بحث بالبند أو المشروع...' : 'Search by item or project...')
                      : activeTab === 'subs'
                        ? (language === 'ar' ? 'بحث بالمقاول أو الشركة...' : 'Search by contractor or company...')
                        : (language === 'ar' ? 'بحث بالوصف أو الرقم...' : 'Search by claim or ID...')
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <span className="absolute left-3.5 top-2.5 text-slate-400 text-xs">🔍</span>
              </div>
            </div>
            <span className="text-xs text-slate-500 font-semibold hidden sm:inline">
              💡 Tip: {language === 'ar' ? 'يمكنك تصفية البيانات والبحث في الجدول مباشرة وبسرعة.' : 'Filter metrics in real-time using search field.'}
            </span>
          </div>
        )}

        {/* --- MAIN CONTENT AREA --- */}
        <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-200 overflow-hidden min-h-[600px]">

          {activeTab === 'boq' && (
            <div className="animate-fade-in">
              <div className="p-8 border-b border-slate-100 bg-slate-50/30 flex justify-between items-center">
                <h3 className="text-lg font-black text-slate-800 flex items-center gap-3">
                  <span className="p-2 bg-white rounded-xl shadow-sm border border-slate-200">📋</span>
                  {cur.boqTab.title}
                </h3>
                <button
                  onClick={() => setIsBoqModalOpen(true)}
                  className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs transition-all shadow-lg shadow-slate-900/20 flex items-center gap-2 transform active:scale-95"
                >
                  <span>+</span> {language === 'ar' ? 'إضافة بند مقايسة جديد (BOQ)' : 'Add New BOQ Item'}
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className={`w-full ${language === 'ar' ? 'text-right' : 'text-left'} whitespace-nowrap text-slate-700`}>
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr className="text-slate-500 text-[10px] uppercase tracking-widest font-black">
                      <th className="px-8 py-4">{cur.boqTab.item}</th>
                      <th className="px-8 py-4">{cur.boqTab.project}</th>
                      <th className="px-8 py-4 text-center">{cur.boqTab.est}</th>
                      <th className="px-8 py-4 text-center">{language === 'ar' ? 'المنصرف الفعلي' : 'Actual Issued'}</th>
                      <th className="px-8 py-4 text-center">{language === 'ar' ? 'تكلفة المواد المقدرة' : 'Est. Material Cost'}</th>
                      <th className="px-8 py-4 text-center text-slate-900">{language === 'ar' ? 'تكلفة المواد الفعلية' : 'Act. Material Cost'}</th>
                      <th className="px-8 py-4 text-center">{language === 'ar' ? 'الاستهلاك' : 'Consumption'}</th>
                      <th className="px-8 py-4 text-center">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                      <th className="px-8 py-4 text-left">{language === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr><td colSpan="9" className="p-20 text-center animate-pulse font-black text-slate-400">{cur.boqTab.loading}</td></tr>
                    ) : boqList.filter(item => !searchQuery || item.item_name?.toLowerCase().includes(searchQuery.toLowerCase()) || item.project_name?.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                      <tr><td colSpan="9" className="p-20 text-center text-slate-400 font-bold">{language === 'ar' ? 'لا توجد بنود أعمال بالمقايسة حالياً.' : 'No BOQ items in list.'}</td></tr>
                    ) : boqList.filter(item => !searchQuery || item.item_name?.toLowerCase().includes(searchQuery.toLowerCase()) || item.project_name?.toLowerCase().includes(searchQuery.toLowerCase())).map(item => {
                      const estCost = Number(item.est_material_cost || 0);
                      const actCost = Number(item.actual_material_cost || 0);
                      const costUsagePercent = estCost > 0 ? (actCost / estCost) * 100 : 0;

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/50 transition-all group">
                          <td className="px-8 py-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-950 text-sm group-hover:text-blue-600 transition-colors leading-tight">{item.item_name}</span>
                              <span className="text-[10px] text-slate-400 font-black uppercase tracking-tight mt-1">{item.material_category || item.category || 'عام'}</span>
                            </div>
                          </td>
                          <td className="px-8 py-4">
                            <span className="font-bold text-slate-600 text-xs">{item.project_name}</span>
                          </td>
                          <td className="px-8 py-4 text-center font-bold text-slate-900 font-mono text-sm">
                            {Number(item.est_qty).toLocaleString()} <span className="text-[8px] opacity-60 font-sans">{item.uom}</span>
                          </td>
                          <td className="px-8 py-4 text-center font-bold text-blue-600 font-mono text-sm">
                            {Number(item.actual_material_qty || 0).toLocaleString()} <span className="text-[8px] opacity-60 font-sans">{item.uom}</span>
                          </td>
                          <td className="px-8 py-4 text-center font-bold text-slate-700 font-mono text-sm">
                            {estCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-8 py-4 text-center font-bold text-emerald-650 font-mono text-sm">
                            {actCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-8 py-4 text-center">
                            <div className="w-20 mx-auto flex flex-col items-center gap-1">
                              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden border p-0.5">
                                <div className={`h-full rounded-full transition-all duration-1000 ${costUsagePercent > 100 ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(costUsagePercent, 100)}%` }}></div>
                              </div>
                              <span className={`text-[8px] font-black ${costUsagePercent > 100 ? 'text-rose-500' : 'text-slate-400'}`}>{costUsagePercent.toFixed(0)}%</span>
                            </div>
                          </td>
                          <td className="px-8 py-4 text-center">
                            <span className={`px-3 py-1 rounded-xl text-[9px] font-black ${item.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                item.status === 'In Progress' ? 'bg-amber-50 text-amber-600 border border-amber-100' : 'bg-slate-100 text-slate-500'
                              }`}>
                              {item.status || 'Not Started'}
                            </span>
                          </td>
                          <td className="px-8 py-4 text-left">
                            <button
                              onClick={() => {
                                setSelectedBoq(item);
                                setIsReqModalOpen(true);
                              }}
                              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-black text-[9px] px-3.5 py-2 rounded-xl transition-all"
                            >
                              🏗️ صرف مواد
                            </button>
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
                <h3 className="text-lg font-black text-slate-800 flex items-center gap-3">
                  <span className="p-2 bg-white rounded-xl shadow-sm border border-slate-100">🤝</span>
                  {cur.subsTab.title}
                </h3>
                <button onClick={openSubModal} className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold text-xs transition-all shadow-lg shadow-slate-900/20 flex items-center gap-2 transform active:scale-95">
                  <span className="text-lg leading-none">+</span> {cur.subsTab.add}
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className={`w-full ${language === 'ar' ? 'text-right' : 'text-left'} whitespace-nowrap text-slate-700`}>
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr className="text-slate-500 text-[10px] uppercase tracking-widest font-black">
                      <th className="px-8 py-4">{cur.subsTab.name}</th>
                      <th className="px-8 py-4">{cur.subsTab.contact}</th>
                      <th className="px-8 py-4">{cur.subsTab.currentProj}</th>
                      <th className="px-8 py-4 text-center text-slate-900">{cur.subsTab.totalInvoices}</th>
                      <th className="px-8 py-4 text-center">{language === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr><td colSpan="5" className="p-20 text-center animate-pulse font-black text-slate-400">{cur.subsTab.loading}</td></tr>
                    ) : subcontractors.filter(sub => !searchQuery || sub.name?.toLowerCase().includes(searchQuery.toLowerCase()) || sub.company?.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                      <tr><td colSpan="5" className="p-20 text-center text-slate-400 font-bold">{language === 'ar' ? 'لا توجد نتائج مطابقة.' : 'No matching partners.'}</td></tr>
                    ) : subcontractors.filter(sub => !searchQuery || sub.name?.toLowerCase().includes(searchQuery.toLowerCase()) || sub.company?.toLowerCase().includes(searchQuery.toLowerCase())).map(sub => (
                      <tr
                        key={sub.id}
                        onClick={() => setSelectedSubId(sub.id)}
                        className="hover:bg-slate-50/50 transition-all group cursor-pointer"
                      >
                        <td className="px-8 py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-950 text-sm group-hover:text-blue-600 transition-colors leading-tight">{sub.name}</span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tight mt-1">{sub.company || 'Private Entity'}</span>
                          </div>
                        </td>
                        <td className="px-8 py-4">
                          <span className="font-bold text-slate-600 text-xs font-mono bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">{sub.phone || 'No Contact'}</span>
                        </td>
                        <td className="px-8 py-4 text-slate-500 font-bold text-xs">{sub.project_name || 'Standby'}</td>
                        <td className="px-8 py-4 text-center font-bold text-emerald-650 text-base">
                          {Number(sub.total_invoices || 0).toLocaleString()} <span className="text-[10px] opacity-60 mr-1 font-sans">LCY</span>
                        </td>
                        <td className="px-8 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => openEditSubModal(sub)}
                              className="px-3 py-2 bg-slate-100 hover:bg-slate-900 hover:text-white rounded-xl font-bold text-[10px] transition-all"
                            >
                              ✏️ {language === 'ar' ? 'تعديل' : 'Edit'}
                            </button>
                            <button
                              onClick={() => handleSubDelete(sub.id)}
                              className="px-3 py-2 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-xl font-bold text-[10px] transition-all"
                            >
                              🗑️ {language === 'ar' ? 'حذف' : 'Delete'}
                            </button>
                          </div>
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
              <div className="p-8 border-b border-slate-100 bg-slate-50/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h3 className="text-xl font-black text-slate-800 flex items-center gap-3">
                  <span className="p-2 bg-white rounded-xl shadow-sm border border-slate-100">📄</span>
                  {cur.invoicesTab.title}
                </h3>
                <button
                  onClick={() => setIsClaimModalOpen(true)}
                  className="px-6 py-3 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-lg shadow-slate-950/10 hover:bg-blue-600 transition-all active:scale-[0.98] flex items-center gap-2"
                >
                  <span>📝</span>
                  {language === 'ar' ? 'إصدار مستخلص جديد' : 'Draft New Claim'}
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className={`w-full ${language === 'ar' ? 'text-right' : 'text-left'} whitespace-nowrap text-slate-700`}>
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr className="text-slate-500 text-[10px] uppercase tracking-widest font-black">
                      <th className="px-8 py-4">{cur.invoicesTab.ref}</th>
                      <th className="px-8 py-4">{cur.invoicesTab.desc}</th>
                      <th className="px-8 py-4 text-center">{cur.invoicesTab.qty}</th>
                      <th className={`px-8 py-4 ${language === 'ar' ? 'text-left' : 'text-right'}`}>{cur.invoicesTab.net}</th>
                      <th className="px-8 py-4 text-center">{cur.invoicesTab.status}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr><td colSpan="5" className="p-20 text-center animate-pulse font-black text-slate-400">{cur.invoicesTab.loading}</td></tr>
                    ) : invoices.filter(inv => !searchQuery || String(inv.id).includes(searchQuery) || inv.description?.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
                      <tr><td colSpan="5" className="p-20 text-center text-slate-400 font-bold">{language === 'ar' ? 'لا توجد نتائج مطابقة.' : 'No matching claims.'}</td></tr>
                    ) : invoices.filter(inv => !searchQuery || String(inv.id).includes(searchQuery) || inv.description?.toLowerCase().includes(searchQuery.toLowerCase())).map(inv => {
                      const isApproved = inv.status === 'Approved' || inv.status === 'Paid' || inv.status === 'اعتماد مالي';
                      return (
                        <tr key={inv.id} className="hover:bg-slate-50/50 transition-all group">
                          <td className="px-8 py-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-400 text-[10px] uppercase tracking-widest font-mono">INV-#{inv.id}</span>
                              <span className="text-[11px] text-slate-900 font-bold mt-1">{new Date(inv.date).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}</span>
                            </div>
                          </td>
                          <td className="px-8 py-4">
                            <span className="font-bold text-slate-700 text-xs font-sans whitespace-normal block max-w-md">{inv.description}</span>
                          </td>
                          <td className="px-8 py-4 text-center font-bold text-blue-600 text-sm">
                            {Number(inv.curr_qty || 0).toLocaleString()}
                          </td>
                          <td className={`px-8 py-4 ${language === 'ar' ? 'text-left' : 'text-right'} font-bold text-emerald-650 text-base`}>
                            <div className="flex flex-col">
                              <span>
                                {Number(inv.remaining_amount !== undefined ? inv.remaining_amount : (inv.net_amount || inv.amount || 0)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-[10px] opacity-60 mr-1 font-sans">LCY</span>
                              </span>
                              {inv.remaining_amount !== undefined && (
                                <span className="text-[10px] text-slate-450 font-normal mt-0.5">
                                  {language === 'ar' 
                                    ? `تم صرف: ${Number(inv.total_paid || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} من أصل ${Number(inv.net_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                                    : `Paid: ${Number(inv.total_paid || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} of ${Number(inv.net_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-8 py-4">
                            <div className="flex flex-col sm:flex-row gap-2 items-center justify-center">
                              <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border shadow-sm text-center ${isApproved ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                                {isApproved ? cur.invoicesTab.approved : cur.invoicesTab.pending}
                              </span>
                              <div className="flex gap-1.5 w-full">
                                <button
                                  onClick={() => setSelectedPrintInvoice(inv)}
                                  className="w-full py-2 bg-slate-100 text-slate-700 rounded-lg text-[9px] font-bold uppercase hover:bg-slate-200 transition-all shadow-sm flex items-center justify-center gap-1 active:scale-95"
                                >
                                  🖨️ {language === 'ar' ? 'طباعة' : 'Print'}
                                </button>
                                {isApproved && inv.status !== 'Paid' && (
                                  <button
                                    onClick={() => openPaymentModal(inv)}
                                    className="w-full py-2 bg-emerald-600 text-white rounded-lg text-[9px] font-bold uppercase hover:bg-emerald-700 transition-all shadow-sm flex items-center justify-center gap-1 active:scale-95 text-center"
                                  >
                                    💸 {language === 'ar' ? 'صرف' : 'Disburse'}
                                  </button>
                                )}
                                {!isApproved && (
                                  <button onClick={() => approveInvoice(inv.id)} className="w-full py-2 bg-slate-900 text-white rounded-lg text-[9px] font-bold uppercase tracking-wider hover:bg-blue-650 transition-all shadow-sm active:scale-95 text-center">
                                    {cur.invoicesTab.approveBtn}
                                  </button>
                                )}
                                <button
                                  onClick={() => deleteInvoice(inv.id)}
                                  className="w-full py-2 bg-rose-50 text-rose-600 rounded-lg text-[9px] font-bold uppercase hover:bg-rose-650 hover:text-white transition-all shadow-sm flex items-center justify-center gap-1 active:scale-95"
                                >
                                  🗑️ {language === 'ar' ? 'حذف' : 'Delete'}
                                </button>
                              </div>
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

    {/* Register Subcontractor Modal */}
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
              <input 
                type="text" 
                name="company" 
                value={subForm.company} 
                onChange={handleSubChange} 
                disabled={activeCompany && activeCompany !== 'كل الشركات' && activeCompany !== 'All Companies'}
                className={`w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs outline-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all shadow-inner ${
                  activeCompany && activeCompany !== 'كل الشركات' && activeCompany !== 'All Companies' ? 'pointer-events-none opacity-80' : ''
                }`}
              />
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
    )
  }

  {/* Edit Subcontractor Modal */ }
  {
    isEditSubModalOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl" onClick={() => setIsEditSubModalOpen(false)}></div>
        <form onSubmit={submitEditSubcontractor} className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden flex flex-col p-10 border border-white/20 animate-in zoom-in-95 duration-300">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-black uppercase text-slate-900 italic tracking-tighter">
              {language === 'ar' ? 'تعديل بيانات المقاول' : 'Edit Subcontractor'}
            </h2>
            <button type="button" onClick={() => setIsEditSubModalOpen(false)} className="text-slate-400 hover:text-slate-900 transition-colors text-2xl">✖</button>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{cur.modalSub.name}</label>
              <input type="text" name="name" value={editSubForm.name} onChange={handleEditSubChange} className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs outline-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all shadow-inner" required />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{cur.modalSub.phone}</label>
              <input type="text" name="phone" value={editSubForm.phone} onChange={handleEditSubChange} className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs outline-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all shadow-inner" required />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{cur.modalSub.project}</label>
              <select
                name="project_id"
                value={editSubForm.project_id}
                onChange={handleEditSubChange}
                className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs outline-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all shadow-inner appearance-none cursor-pointer"
              >
                <option value="">-- {language === 'ar' ? 'اختر المشروع' : 'Select Project'} --</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{cur.modalSub.company}</label>
              <input 
                type="text" 
                name="company" 
                value={editSubForm.company} 
                onChange={handleEditSubChange} 
                disabled={activeCompany && activeCompany !== 'كل الشركات' && activeCompany !== 'All Companies'}
                className={`w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs outline-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all shadow-inner ${
                  activeCompany && activeCompany !== 'كل الشركات' && activeCompany !== 'All Companies' ? 'pointer-events-none opacity-80' : ''
                }`}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tax ID / VAT</label>
                <input type="text" name="tax_id" value={editSubForm.tax_id} onChange={handleEditSubChange} className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs outline-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all shadow-inner" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">License No.</label>
                <input type="text" name="license_number" value={editSubForm.license_number} onChange={handleEditSubChange} className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs outline-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all shadow-inner" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Insurance Expiry Date</label>
              <input type="date" name="insurance_expiry" value={editSubForm.insurance_expiry} onChange={handleEditSubChange} className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs outline-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all shadow-inner" />
            </div>
          </div>
          <button type="submit" disabled={isSubmitting} className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black text-lg hover:bg-slate-800 transition-all shadow-2xl shadow-slate-900/20 flex items-center justify-center gap-4 active:scale-[0.98] mt-4">
            {isSubmitting ? <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div> : <>{language === 'ar' ? 'تحديث البيانات' : 'Update Data'}</>}
          </button>
        </form>
      </div>
    )
  }

  {/* Global Add BOQ Modal */ }
  {
    isBoqModalOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl" onClick={() => setIsBoqModalOpen(false)}></div>
        <form onSubmit={handleBoqSubmit} className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden flex flex-col p-10 border border-white/20 animate-in zoom-in-95 duration-300 text-right">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-black text-slate-900">{language === 'ar' ? 'إضافة بند أعمال جديد (BOQ)' : 'Add New BOQ Item'}</h2>
            <button type="button" onClick={() => setIsBoqModalOpen(false)} className="text-slate-400 hover:text-slate-900 transition-colors text-2xl">✖</button>
          </div>

          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{language === 'ar' ? 'المشروع المستهدف *' : 'Target Project *'}</label>
              <select
                value={boqForm.project_name}
                onChange={(e) => setBoqForm({ ...boqForm, project_name: e.target.value })}
                required
                className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs outline-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all shadow-inner appearance-none cursor-pointer"
              >
                <option value="">-- {language === 'ar' ? 'اختر المشروع' : 'Select Project'} --</option>
                {projects.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{language === 'ar' ? 'اسم البند *' : 'Item Name *'}</label>
                <input type="text" value={boqForm.item_name} onChange={(e) => setBoqForm({ ...boqForm, item_name: e.target.value })} required className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs outline-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all shadow-inner" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{language === 'ar' ? 'فئة المواد (التصنيف)' : 'Material Category'}</label>
                <input type="text" value={boqForm.material_category} onChange={(e) => setBoqForm({ ...boqForm, material_category: e.target.value })} className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs outline-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all shadow-inner" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{language === 'ar' ? 'وحدة القياس *' : 'UOM *'}</label>
                <input type="text" value={boqForm.uom} onChange={(e) => setBoqForm({ ...boqForm, uom: e.target.value })} required className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs outline-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all shadow-inner text-center" placeholder="M3, LM" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{language === 'ar' ? 'الكمية المقدرة *' : 'Est. Qty *'}</label>
                <input type="number" value={boqForm.est_qty} onChange={(e) => setBoqForm({ ...boqForm, est_qty: e.target.value })} required className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs outline-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all shadow-inner text-center" />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{language === 'ar' ? 'سعر الوحدة المقدر *' : 'Est. Price *'}</label>
                <input type="number" value={boqForm.est_unit_price} onChange={(e) => setBoqForm({ ...boqForm, est_unit_price: e.target.value })} required className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs outline-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all shadow-inner text-center" />
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl space-y-3">
              <p className="text-[10px] font-black text-slate-500">{language === 'ar' ? '💰 تفصيل ميزانية التكاليف المقدرة:' : '💰 Estimated Cost Breakdown:'}</p>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-slate-400 block">{language === 'ar' ? 'الكمية التشغيلية للمواد' : 'Est. Material Qty'}</label>
                  <input type="number" value={boqForm.est_material_qty} onChange={(e) => setBoqForm({ ...boqForm, est_material_qty: e.target.value })} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-center outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-slate-400 block">{language === 'ar' ? 'تكلفة المواد التقديرية' : 'Est. Material Cost'}</label>
                  <input type="number" value={boqForm.est_material_cost} onChange={(e) => setBoqForm({ ...boqForm, est_material_cost: e.target.value })} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-center outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-slate-400 block">{language === 'ar' ? 'تكلفة العمالة المقدرة' : 'Est. Labor Cost'}</label>
                  <input type="number" value={boqForm.est_labor_cost} onChange={(e) => setBoqForm({ ...boqForm, est_labor_cost: e.target.value })} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-center outline-none" />
                </div>
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-slate-400 block">{language === 'ar' ? 'تكلفة المقاولين التقديرية' : 'Est. Subcontractor Cost'}</label>
                  <input type="number" value={boqForm.est_subcontractor_cost} onChange={(e) => setBoqForm({ ...boqForm, est_subcontractor_cost: e.target.value })} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-center outline-none" />
                </div>
              </div>
            </div>
          </div>

          <button type="submit" disabled={isSubmitting} className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black text-sm hover:bg-slate-800 transition-all shadow-2xl active:scale-[0.98] mt-4">
            {isSubmitting ? <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin mx-auto"></div> : <>{language === 'ar' ? 'حفظ البند بالمقايسة' : 'Save BOQ Item'}</>}
          </button>
        </form>
      </div>
    )
  }

  {/* Global Requisition Modal */ }
  {
    isReqModalOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl" onClick={() => setIsReqModalOpen(false)}></div>
        <form onSubmit={handleReqSubmit} className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden flex flex-col p-10 border border-white/20 animate-in zoom-in-95 duration-300 text-right">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-black text-slate-900">{language === 'ar' ? '🏗️ صرف مواد للبند المعتمد' : '🏗️ Issue Materials to BOQ'}</h2>
            <button type="button" onClick={() => setIsReqModalOpen(false)} className="text-slate-400 hover:text-slate-900 transition-colors text-2xl">✖</button>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-2xl text-xs font-bold text-blue-700">
              {language === 'ar' ? `البند المستهدف: ${selectedBoq?.item_name} (${selectedBoq?.project_name})` : `Target BOQ: ${selectedBoq?.item_name} (${selectedBoq?.project_name})`}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{language === 'ar' ? 'المستودع (Warehouse) *' : 'Warehouse *'}</label>
              <select
                value={reqForm.warehouse_id}
                onChange={(e) => setReqForm({ ...reqForm, warehouse_id: e.target.value, inventory_id: '' })}
                required
                className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs outline-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all shadow-inner appearance-none cursor-pointer"
              >
                <option value="">-- {language === 'ar' ? 'اختر المستودع' : 'Select Warehouse'} --</option>
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name} ({w.location})</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{language === 'ar' ? 'الصنف المطلوب صرفه *' : 'Inventory Item *'}</label>
              <select
                value={reqForm.inventory_id}
                onChange={(e) => setReqForm({ ...reqForm, inventory_id: e.target.value })}
                required
                className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs outline-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all shadow-inner appearance-none cursor-pointer"
              >
                <option value="">-- {language === 'ar' ? 'اختر الصنف المخزني' : 'Select Inventory Item'} --</option>
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

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{language === 'ar' ? 'الكمية المطلوب صرفها *' : 'Qty to Issue *'}</label>
              <input
                type="number"
                step="any"
                value={reqForm.qty}
                onChange={(e) => setReqForm({ ...reqForm, qty: e.target.value })}
                required
                className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-lg outline-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all shadow-inner text-center"
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{language === 'ar' ? 'ملاحظات / مستلم المواد' : 'Notes / Receiver Name'}</label>
              <input
                type="text"
                value={reqForm.notes}
                onChange={(e) => setReqForm({ ...reqForm, notes: e.target.value })}
                className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs outline-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all shadow-inner"
                placeholder={language === 'ar' ? 'اسم المهندس أو رقم التوزيع' : 'Engineer name / distribution ID'}
              />
            </div>
          </div>

          <button type="submit" disabled={isSubmitting} className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black text-sm hover:bg-slate-800 transition-all shadow-2xl active:scale-[0.98] mt-4">
            {isSubmitting ? <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin mx-auto"></div> : <>{language === 'ar' ? 'اعتماد وصرف المواد للمشروع' : 'Authorize & Issue Materials'}</>}
          </button>
        </form>
      </div>
    )
  }

  {/* 📝 Subcontractor Progress Claim Wizard Modal */ }
  {
    isClaimModalOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto no-print">
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl" onClick={() => setIsClaimModalOpen(false)}></div>
        <div className="bg-white w-full max-w-6xl rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden flex flex-col border border-white/20 animate-in zoom-in-95 duration-300 max-h-[90vh]">

          <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div className="flex items-center gap-3">
              <span className="p-2 bg-slate-900 text-white rounded-xl text-xl">📝</span>
              <div className="text-right">
                <h2 className="text-xl font-black text-slate-950">
                  {language === 'ar' ? 'منشئ مستخلصات الباطن الذكي' : 'Engineering Subcontractor Claim Wizard'}
                </h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
                  {language === 'ar' ? 'نظام الحسابات والكميات المزدوجة المتوافق مع معايير IFRS' : 'IFRS-Compliant Double-Entry Quantity System'}
                </p>
              </div>
            </div>
            <button onClick={() => setIsClaimModalOpen(false)} className="text-slate-400 hover:text-slate-950 transition-colors text-2xl">✖</button>
          </div>

          <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Form Side */}
            <form onSubmit={handleClaimSubmit} className="lg:col-span-7 space-y-6 text-right" dir={language === 'ar' ? 'rtl' : 'ltr'}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Subcontractor Select */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                    {language === 'ar' ? 'مقاول الباطن المستهدف *' : 'Target Subcontractor *'}
                  </label>
                  <select
                    value={claimForm.subcontractor_id}
                    onChange={(e) => handleClaimSubcontractorChange(e.target.value)}
                    required
                    className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs outline-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all shadow-inner cursor-pointer"
                  >
                    <option value="">-- {language === 'ar' ? 'اختر مقاول الباطن' : 'Select Subcontractor'} --</option>
                    {subcontractors.map(s => <option key={s.id} value={s.id}>{s.name} ({s.company || 'Private'})</option>)}
                  </select>
                </div>

                {/* Contract Select */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                    {language === 'ar' ? 'عقد المقاولة المسند *' : 'Active Contract *'}
                  </label>
                  <select
                    value={claimForm.contract_id}
                    onChange={(e) => handleClaimFieldChange('contract_id', e.target.value)}
                    required
                    disabled={!claimForm.subcontractor_id}
                    className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs outline-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all shadow-inner disabled:opacity-50 cursor-pointer"
                  >
                    <option value="">-- {language === 'ar' ? 'اختر العقد النشط' : 'Select Contract'} --</option>
                    {subcontractorIntelligence.contracts.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.contract_number} (قيمة: {Number(c.total_value).toLocaleString()} LCY)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* BOQ Item Select */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                    {language === 'ar' ? 'بند الأعمال الهندسي *' : 'BOQ Work Item *'}
                  </label>
                  <select
                    value={claimForm.sub_item_id}
                    onChange={(e) => handleClaimFieldChange('sub_item_id', e.target.value)}
                    required
                    disabled={!claimForm.contract_id}
                    className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs outline-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all shadow-inner disabled:opacity-50 cursor-pointer"
                  >
                    <option value="">-- {language === 'ar' ? 'اختر بند الأعمال' : 'Select BOQ Item'} --</option>
                    {subcontractorIntelligence.boqs.map(b => (
                      <option key={b.boq_id} value={b.boq_id}>
                        {b.item_name} ({b.assigned_qty} {b.uom} | فئة: {Number(b.sub_unit_price).toLocaleString()} LCY)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quantity Executed */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                    {language === 'ar' ? 'الكمية المنفذة الحالية *' : 'Current Executed Qty *'}
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    disabled={!claimForm.sub_item_id}
                    value={claimForm.curr_qty}
                    onChange={(e) => handleClaimFieldChange('curr_qty', e.target.value)}
                    placeholder="0.00"
                    className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-sm outline-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all shadow-inner text-center disabled:opacity-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Materials Deduction */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                    {language === 'ar' ? 'خصم خامات مجهزة (المقاول الرئيسي)' : 'Materials Supplied Deduction'}
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={claimForm.material_deduction}
                    onChange={(e) => handleClaimFieldChange('material_deduction', e.target.value)}
                    placeholder="0.00 LCY"
                    className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs outline-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all shadow-inner text-center"
                  />
                </div>

                {/* Tax Deduction */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                    {language === 'ar' ? 'خصم ضرائب وأعباء استقطاع' : 'Tax / Withholding Deduction'}
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={claimForm.tax_deduction}
                    onChange={(e) => handleClaimFieldChange('tax_deduction', e.target.value)}
                    placeholder="0.00 LCY"
                    className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs outline-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all shadow-inner text-center"
                  />
                </div>

                {/* Date Input */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                    {language === 'ar' ? 'تاريخ المستخلص' : 'Claim Date'}
                  </label>
                  <input
                    type="date"
                    value={claimForm.date}
                    onChange={(e) => handleClaimFieldChange('date', e.target.value)}
                    className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs outline-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all shadow-inner text-center"
                  />
                </div>
              </div>

              {/* Description Statement */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                  {language === 'ar' ? 'البيان الهندسي للمستخلص *' : 'Engineering Description *'}
                </label>
                <textarea
                  required
                  value={claimForm.description}
                  onChange={(e) => handleClaimFieldChange('description', e.target.value)}
                  rows="2"
                  placeholder={language === 'ar' ? 'ادخل تفاصيل الأعمال المنجزة والنسب الهندسية...' : 'Describe the progress of works...'}
                  className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs outline-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all shadow-inner resize-none"
                ></textarea>
              </div>

              <button
                type="submit"
                disabled={isSubmittingClaim}
                className="w-full py-5 bg-slate-900 hover:bg-slate-950 text-white rounded-[2rem] font-black text-sm transition-all shadow-2xl flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {isSubmittingClaim ? (
                  <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <span>🚀</span>
                    {language === 'ar' ? 'تسجيل المستخلص واعتماد التوازن المالي' : 'Register Claim & Commit Ledger'}
                  </>
                )}
              </button>
            </form>

            {/* Real-time Calculation Waterfall & IFRS Double Entry Preview */}
            <div className="lg:col-span-5 flex flex-col gap-6 text-right" dir={language === 'ar' ? 'rtl' : 'ltr'}>

              {/* Real-time Cascade Container */}
              <div className="bg-slate-950 text-white rounded-[2.5rem] p-8 border border-white/10 relative overflow-hidden flex flex-col justify-between flex-1 min-h-[350px]">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-amber-500/5"></div>

                <div className="relative z-10 space-y-6">
                  <div className="flex justify-between items-center border-b border-white/5 pb-4">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                      {language === 'ar' ? 'شلال تصفية المستخلص الهندسي' : 'Progress claim waterfall'}
                    </span>
                    <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded text-[9px] font-bold">
                      {language === 'ar' ? 'احتساب تلقائي' : 'Auto Calculate'}
                    </span>
                  </div>

                  <div className="space-y-4">
                    {/* Subtotal metrics */}
                    <div className="flex justify-between text-xs font-bold text-slate-400">
                      <span>{language === 'ar' ? 'الكمية السابقة المنفذة:' : 'Previous Executed Qty:'}</span>
                      <span className="font-mono text-white">{claimForm.prev_qty}</span>
                    </div>
                    <div className="flex justify-between text-xs font-bold text-slate-400">
                      <span>{language === 'ar' ? 'الكمية المنفذة الحالية:' : 'Current Executed Qty:'}</span>
                      <span className="font-mono text-white">{claimForm.curr_qty || 0}</span>
                    </div>
                    <div className="flex justify-between text-xs font-bold text-slate-400 border-b border-white/5 pb-3">
                      <span>{language === 'ar' ? 'نسبة الإنجاز الإجمالية:' : 'Total Progress Percent:'}</span>
                      <span className="font-mono text-indigo-400">{claimForm.progress_percent || 0}%</span>
                    </div>

                    {/* Financials waterfall */}
                    <div className="flex justify-between text-sm font-black text-slate-200">
                      <span>{language === 'ar' ? 'قيمة الأعمال الإجمالية (Gross):' : 'Total Work Value (Gross):'}</span>
                      <span className="font-mono text-slate-100">{Number(claimForm.gross_amount).toLocaleString()} LCY</span>
                    </div>
                    <div className="flex justify-between text-xs font-bold text-rose-400">
                      <span>{language === 'ar' ? '(-) استقطاع ضمان أعمال (تأمين 5%):' : '(-) Retention Guarantee (5%):'}</span>
                      <span className="font-mono">-{Number(claimForm.retention_deduction).toLocaleString()} LCY</span>
                    </div>
                    <div className="flex justify-between text-xs font-bold text-amber-500">
                      <span>{language === 'ar' ? '(-) استرداد دفعة مقدمة (10%):' : '(-) Advance Recovery (10%):'}</span>
                      <span className="font-mono">-{Number(claimForm.dp_recovery).toLocaleString()} LCY</span>
                    </div>
                    <div className="flex justify-between text-xs font-bold text-slate-400">
                      <span>{language === 'ar' ? '(-) خصم خامات ومواد مجهزة:' : '(-) Materials Supplied Offset:'}</span>
                      <span className="font-mono">-{Number(claimForm.material_deduction || 0).toLocaleString()} LCY</span>
                    </div>
                    <div className="flex justify-between text-xs font-bold text-slate-400">
                      <span>{language === 'ar' ? '(-) أعباء وضرائب الخصم:' : '(-) Tax & WHT Withheld:'}</span>
                      <span className="font-mono">-{Number(claimForm.tax_deduction || 0).toLocaleString()} LCY</span>
                    </div>
                  </div>
                </div>

                <div className="relative z-10 border-t border-white/5 pt-6 mt-6">
                  <span className="text-[10px] font-black text-slate-500 uppercase block mb-1">
                    {language === 'ar' ? 'صافي مستحق الصرف (Net Payable)' : 'Net Amount Payable'}
                  </span>
                  <div className="text-3xl font-black text-emerald-400 font-mono tracking-tighter">
                    {Number(claimForm.net_amount).toLocaleString()} <span className="text-xs text-white opacity-40 font-sans">LCY</span>
                  </div>
                </div>
              </div>

              {/* IFRS Entry Preview Widget */}
              <div className="bg-slate-50 rounded-[2rem] p-6 border border-slate-200 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                    <span>📊</span> {language === 'ar' ? 'معاينة القيد المزدوج المعياري (IFRS)' : 'IFRS Ledger Entry Preview'}
                  </span>
                  <span className="text-[9px] font-black bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                    {language === 'ar' ? 'متوازن' : 'Balanced'}
                  </span>
                </div>

                <div className="space-y-2.5 text-xs">
                  {/* Debit Line */}
                  <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex flex-col">
                      <span className="font-black text-indigo-600">{language === 'ar' ? 'Debit (مدين)' : 'Debit'}</span>
                      <span className="text-[10px] font-bold text-slate-600">تكلفة مقاولي الباطن (COGS)</span>
                    </div>
                    <span className="font-mono font-black text-slate-900">+{Number(claimForm.gross_amount).toLocaleString()} LCY</span>
                  </div>

                  {/* Credit Line 1 */}
                  <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex flex-col">
                      <span className="font-black text-emerald-600">{language === 'ar' ? 'Credit (دائن)' : 'Credit'}</span>
                      <span className="text-[10px] font-bold text-slate-600">مقاولي الباطن (Accounts Payable)</span>
                    </div>
                    <span className="font-mono font-black text-slate-900">-{Number(claimForm.net_amount).toLocaleString()} LCY</span>
                  </div>

                  {/* Credit Line 2 (Retention) */}
                  {parseFloat(claimForm.retention_deduction) > 0 && (
                    <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm">
                      <div className="flex flex-col">
                        <span className="font-black text-slate-500">{language === 'ar' ? 'Credit (دائن)' : 'Credit'}</span>
                        <span className="text-[10px] font-bold text-slate-600">تأمينات مستقطعة لجهات خارجية</span>
                      </div>
                      <span className="font-mono font-black text-slate-900">-{Number(claimForm.retention_deduction).toLocaleString()} LCY</span>
                    </div>
                  )}

                  {/* Credit Line 3 (Advance Recovery) */}
                  {parseFloat(claimForm.dp_recovery) > 0 && (
                    <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm">
                      <div className="flex flex-col">
                        <span className="font-black text-slate-500">{language === 'ar' ? 'Credit (دائن)' : 'Credit'}</span>
                        <span className="text-[10px] font-bold text-slate-600">دفعات مقدمة لمقاولي الباطن</span>
                      </div>
                      <span className="font-mono font-black text-slate-900">-{Number(claimForm.dp_recovery).toLocaleString()} LCY</span>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    )
  }

  {/* 🖨️ Printable Engineering Payment Certificate Modal */ }
  {
    selectedPrintInvoice && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto bg-slate-900/60 backdrop-blur-xl">

        <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl relative z-10 flex flex-col border border-white/20 animate-in zoom-in-95 duration-300 max-h-[95vh] overflow-hidden">

          {/* Modal Actions Bar (Non-Printable) */}
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 no-print">
            <span className="text-sm font-black text-slate-950 flex items-center gap-2">
              <span>🖨️</span> {language === 'ar' ? 'أمر طباعة وتوجيه المستخلص الهندسي' : 'Print Subcontractor Progress Certificate'}
            </span>
            <div className="flex gap-3">
              <button
                onClick={() => window.print()}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black shadow-lg shadow-blue-200 active:scale-95 transition-all"
              >
                {language === 'ar' ? '🖨️ طباعة المستخلص' : 'Print Certificate'}
              </button>
              <button
                onClick={() => setSelectedPrintInvoice(null)}
                className="px-5 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-black active:scale-95 transition-all"
              >
                {language === 'ar' ? 'إغلاق' : 'Close'}
              </button>
            </div>
          </div>

          {/* Printable Paper Mockup Content Area */}
          <div className="flex-1 overflow-y-auto p-12 bg-white font-sans" id="printable-certificate" dir="rtl">
            <div className="space-y-10">

              {/* Certificate Header */}
              <div className="flex justify-between items-start border-b-4 border-slate-900 pb-8">
                <div className="text-right">
                  <h1 className="text-3xl font-black text-slate-950 tracking-tighter">{selectedPrintInvoice.company || localStorage.getItem('active_company') || 'شركة تيد كابيتال للمقاولات العامة'}</h1>
                  <p className="text-xs text-slate-400 font-bold tracking-widest mt-1">TED CAPITAL ERP | IFRS DOUBLE-ENTRY SYSTEM</p>
                  <div className="text-xs text-slate-600 space-y-0.5 mt-4 font-bold">
                    <div>المكتب الرئيسي: القاهرة الجديدة، التجمع الخامس</div>
                    <div>الهاتف: +20 2 2489 1234</div>
                    <div>الرقم الضريبي: 489-125-987</div>
                  </div>
                </div>
                <div className="text-left">
                  <div className="w-16 h-16 bg-slate-950 text-white rounded-2xl flex items-center justify-center text-3xl font-bold font-sans">PMP</div>
                  <div className="mt-4 text-xs font-black text-slate-900 space-y-1 text-right">
                    <div className="bg-slate-900 text-white px-3 py-1 rounded text-center text-[10px] font-black uppercase tracking-wider">مستخلص أعمال مقاولة باطن جاري</div>
                    <div>رقم المستخلص: <span className="font-mono text-sm">#INV-{selectedPrintInvoice.id}</span></div>
                    <div>التاريخ: <span className="font-mono">{new Date(selectedPrintInvoice.date || selectedPrintInvoice.created_at).toLocaleDateString('ar-EG')}</span></div>
                  </div>
                </div>
              </div>

              {/* Subcontractor & Contract Metadata Grid */}
              <div className="grid grid-cols-2 gap-8 bg-slate-50 p-6 rounded-2xl border border-slate-200 text-right">
                <div className="space-y-2 text-xs font-bold text-slate-700">
                  <div><span className="text-slate-400 ml-2">المشروع المستهدف:</span> {selectedPrintInvoice.project_name || 'العام'}</div>
                  <div><span className="text-slate-400 ml-2">مقاول الباطن:</span> {selectedPrintInvoice.subcontractor_name || 'غير محدد'}</div>
                  <div><span className="text-slate-400 ml-2">طبيعة الأعمال:</span> {selectedPrintInvoice.description || 'مستخلص أعمال جارية'}</div>
                </div>
                <div className="space-y-2 text-xs font-bold text-slate-700 text-left" dir="ltr">
                  <div>Contract Ref: <span className="font-mono">{selectedPrintInvoice.contract_id ? `#CNT-${selectedPrintInvoice.contract_id}` : 'General'}</span></div>
                  <div>Status: <span className="font-mono uppercase text-blue-600">{selectedPrintInvoice.status}</span></div>
                  <div>Currency: <span className="font-mono">LCY (EGP)</span></div>
                </div>
              </div>

              {/* Quantities & Pricing Ledger Table */}
              <table className="w-full border-collapse border border-slate-300 text-xs text-right">
                <thead>
                  <tr className="bg-slate-100 text-slate-900 font-black">
                    <th className="border border-slate-300 px-4 py-3 text-center">البيان ومواصفة البند</th>
                    <th className="border border-slate-300 px-4 py-3 text-center">الوحدة</th>
                    <th className="border border-slate-300 px-4 py-3 text-center">الكمية السابقة</th>
                    <th className="border border-slate-300 px-4 py-3 text-center">الكمية الحالية</th>
                    <th className="border border-slate-300 px-4 py-3 text-center">الكمية الإجمالية</th>
                    <th className="border border-slate-300 px-4 py-3 text-center">القيمة الإجمالية</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="text-slate-800 font-bold">
                    <td className="border border-slate-300 px-4 py-4 text-center">{selectedPrintInvoice.description || 'أعمال هندسية مقاولة باطن'}</td>
                    <td className="border border-slate-300 px-4 py-4 text-center">متر طولي / LM</td>
                    <td className="border border-slate-300 px-4 py-4 text-center font-mono">{Number(selectedPrintInvoice.prev_qty || 0).toLocaleString()}</td>
                    <td className="border border-slate-300 px-4 py-4 text-center font-mono text-indigo-600">{Number(selectedPrintInvoice.curr_qty || 0).toLocaleString()}</td>
                    <td className="border border-slate-300 px-4 py-4 text-center font-mono">{Number((parseFloat(selectedPrintInvoice.prev_qty) || 0) + (parseFloat(selectedPrintInvoice.curr_qty) || 0)).toLocaleString()}</td>
                    <td className="border border-slate-300 px-4 py-4 text-left font-mono">{Number(selectedPrintInvoice.gross_amount || selectedPrintInvoice.amount || 0).toLocaleString()} LCY</td>
                  </tr>
                </tbody>
              </table>

              {/* Deductions Waterfall Cascade */}
              <div className="w-full max-w-md mr-auto bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-3 text-right">
                <h3 className="text-xs font-black text-slate-900 border-b border-slate-300 pb-2 mb-3 flex items-center justify-between">
                  <span>شلال التسويات والاستقطاعات المالية</span>
                  <span className="text-[10px] text-slate-400 font-bold font-mono">FINANCIAL CASCADE</span>
                </h3>

                <div className="flex justify-between text-xs font-bold text-slate-700">
                  <span>إجمالي قيمة الأعمال الحالية المنفذة (Gross):</span>
                  <span className="font-mono text-slate-900">{Number(selectedPrintInvoice.gross_amount || selectedPrintInvoice.amount || 0).toLocaleString()} LCY</span>
                </div>

                {parseFloat(selectedPrintInvoice.retention_deduction) > 0 && (
                  <div className="flex justify-between text-xs font-bold text-rose-600">
                    <span>(-) استقطاع ضمان أعمال نهائي (5%):</span>
                    <span className="font-mono">-{Number(selectedPrintInvoice.retention_deduction).toLocaleString()} LCY</span>
                  </div>
                )}

                {parseFloat(selectedPrintInvoice.dp_recovery) > 0 && (
                  <div className="flex justify-between text-xs font-bold text-amber-600">
                    <span>(-) استرداد دفعة مقدمة مستلمة (10%):</span>
                    <span className="font-mono">-{Number(selectedPrintInvoice.dp_recovery).toLocaleString()} LCY</span>
                  </div>
                )}

                {parseFloat(selectedPrintInvoice.material_deduction) > 0 && (
                  <div className="flex justify-between text-xs font-bold text-slate-500">
                    <span>(-) خصم خامات ومواد مجهزة للشركاء:</span>
                    <span className="font-mono">-{Number(selectedPrintInvoice.material_deduction).toLocaleString()} LCY</span>
                  </div>
                )}

                {parseFloat(selectedPrintInvoice.tax_deduction) > 0 && (
                  <div className="flex justify-between text-xs font-bold text-slate-500">
                    <span>(-) استقطاع ضرائب الخصم المنبع:</span>
                    <span className="font-mono">-{Number(selectedPrintInvoice.tax_deduction).toLocaleString()} LCY</span>
                  </div>
                )}

                <div className="flex justify-between text-sm font-black text-slate-900 border-t border-slate-300 pt-3 mt-3">
                  <span>صافي القيمة المستحقة للصرف (Net Payable):</span>
                  <span className="font-mono text-emerald-600 text-base">{Number(selectedPrintInvoice.net_amount || selectedPrintInvoice.amount || 0).toLocaleString()} LCY</span>
                </div>
              </div>

              {/* Signatures & Execution Section */}
              <div className="grid grid-cols-3 gap-8 pt-12 border-t border-slate-200">
                <div className="space-y-4 text-center">
                  <div className="text-xs font-black text-slate-900">إعداد / مهندس الموقع</div>
                  <div className="h-16 border-b border-dashed border-slate-400"></div>
                  <div className="text-[10px] text-slate-400 font-bold">التوقيع والختم</div>
                </div>
                <div className="space-y-4 text-center">
                  <div className="text-xs font-black text-slate-900">مراجعة / المدير المالي للحسابات</div>
                  <div className="h-16 border-b border-dashed border-slate-400"></div>
                  <div className="text-[10px] text-slate-400 font-bold">التوقيع والختم</div>
                </div>
                <div className="space-y-4 text-center">
                  <div className="text-xs font-black text-slate-900">اعتماد / رئيس مجلس الإدارة</div>
                  <div className="h-16 border-b border-dashed border-slate-400"></div>
                  <div className="text-[10px] text-slate-400 font-bold">التوقيع والختم</div>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    )
  }

  {/* Inject Print-CSS Rules dynamically */ }
  <style dangerouslySetInnerHTML={{
    __html: `
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-certificate, #printable-certificate * {
            visibility: visible !important;
          }
          #printable-certificate {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 2cm !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}} />

  {isPaymentModalOpen && (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl" onClick={() => setIsPaymentModalOpen(false)}></div>
      <form onSubmit={handlePaymentSubmit} className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden flex flex-col p-10 border border-slate-200 animate-in zoom-in-95 duration-300 text-right" dir={language === 'ar' ? 'rtl' : 'ltr'}>
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl shadow-sm text-xl">💸</span>
            <h2 className="text-xl font-black text-slate-900">
              {language === 'ar' ? 'صرف مستخلص للمقاول الباطن' : 'Disburse Subcontractor Payment'}
            </h2>
          </div>
          <button type="button" onClick={() => setIsPaymentModalOpen(false)} className="text-slate-400 hover:text-slate-900 transition-colors text-2xl">✖</button>
        </div>

        <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
          {/* Info Cards */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-5 rounded-[2rem] border border-slate-100">
            <div>
              <span className="text-[10px] font-black text-slate-400 block mb-1 uppercase tracking-widest">
                {language === 'ar' ? 'المقاول' : 'Subcontractor'}
              </span>
              <span className="font-bold text-slate-900 text-sm">
                {subcontractors.find(s => s.id === paymentForm.subcontractor_id)?.name || (language === 'ar' ? 'مقاول غير معروف' : 'Unknown Subcontractor')}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-black text-slate-400 block mb-1 uppercase tracking-widest">
                {language === 'ar' ? 'المشروع' : 'Project'}
              </span>
              <span className="font-bold text-slate-900 text-sm">
                {paymentForm.project_name}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-black text-slate-400 block mb-1 uppercase tracking-widest">
                {language === 'ar' ? 'رقم المستخلص' : 'Claim ID'}
              </span>
              <span className="font-bold text-blue-600 text-sm font-mono">
                INV-#{paymentForm.invoice_id}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-black text-slate-400 block mb-1 uppercase tracking-widest">
                {language === 'ar' ? 'صافي القيمة المستحقة' : 'Net Amount Due'}
              </span>
              <span className="font-black text-emerald-650 text-sm font-mono">
                {Number(invoices.find(i => i.id === paymentForm.invoice_id)?.net_amount || 0).toLocaleString()} LCY
              </span>
            </div>
          </div>

          {/* Inputs */}
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">
                  {language === 'ar' ? 'مبلغ الصرف الفعلي *' : 'Amount Paid *'}
                </label>
                <input 
                  type="number" 
                  step="0.01"
                  value={paymentForm.amount_paid} 
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount_paid: e.target.value })} 
                  required 
                  className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs outline-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all shadow-inner text-center font-mono" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">
                  {language === 'ar' ? 'تاريخ الصرف *' : 'Payment Date *'}
                </label>
                <input 
                  type="date" 
                  value={paymentForm.payment_date} 
                  onChange={(e) => setPaymentForm({ ...paymentForm, payment_date: e.target.value })} 
                  required 
                  className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs outline-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all shadow-inner text-center font-mono" 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">
                  {language === 'ar' ? 'طريقة الدفع *' : 'Payment Method *'}
                </label>
                <select
                  value={paymentForm.payment_method}
                  onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                  required
                  className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs outline-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all shadow-inner appearance-none cursor-pointer"
                >
                  <option value="Cash">{language === 'ar' ? 'نقدي (Cash)' : 'Cash'}</option>
                  <option value="Bank Transfer">{language === 'ar' ? 'تحويل بنكي' : 'Bank Transfer'}</option>
                  <option value="InstaPay">{language === 'ar' ? 'إنيستاباي (InstaPay)' : 'InstaPay'}</option>
                  <option value="Cheque">{language === 'ar' ? 'شيك (Cheque)' : 'Cheque'}</option>
                  <option value="Wallet">{language === 'ar' ? 'محفظة إلكترونية' : 'Digital Wallet'}</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">
                  {language === 'ar' ? 'حساب الصرف المالي *' : 'Financial Source Account *'}
                </label>
                <select
                  value={paymentForm.source_account}
                  onChange={(e) => setPaymentForm({ ...paymentForm, source_account: e.target.value })}
                  required
                  disabled
                  className="w-full p-4 bg-slate-150 border-none rounded-2xl font-black text-slate-500 text-xs outline-none cursor-not-allowed appearance-none"
                >
                  <option value="">{language === 'ar' ? '-- اختر حساب الصرف --' : '-- Select Source Account --'}</option>
                  {coaAccounts.map(acc => (
                    <option key={acc.id} value={acc.account_name}>
                      {acc.account_name} ({acc.account_code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">
                {language === 'ar' ? 'رقم المعاملة / مرجع الدفع' : 'Transaction Ref No.'}
              </label>
              <input 
                type="text" 
                value={paymentForm.reference_no} 
                onChange={(e) => setPaymentForm({ ...paymentForm, reference_no: e.target.value })} 
                placeholder={language === 'ar' ? 'مثال: TXN987654321 أو رقم الشيك' : 'e.g. TXN987654321 or Cheque number'}
                className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs outline-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all shadow-inner" 
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">
                {language === 'ar' ? 'ملاحظات الصرف والبيان' : 'Payment Notes'}
              </label>
              <textarea 
                value={paymentForm.notes} 
                onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })} 
                rows="2"
                className="w-full p-4 bg-slate-50 border-none rounded-2xl font-black text-slate-900 text-xs outline-none focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all shadow-inner resize-none" 
              />
            </div>
          </div>
        </div>

        <button 
          type="submit" 
          disabled={isSubmittingPayment} 
          className="w-full py-5 bg-emerald-600 text-white rounded-[2rem] font-black text-sm hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-900/10 flex items-center justify-center gap-3 active:scale-[0.98] mt-6"
        >
          {isSubmittingPayment ? (
            <div className="w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : (
            <>
              <span>💸</span>
              {language === 'ar' ? 'ترحيل قيد الصرف وتأكيد السداد' : 'Post Payment & Confirm Payout'}
            </>
          )}
        </button>
      </form>
    </div>
  )}

  {
    selectedSubId && (
      <Subcontractor360
        subId={selectedSubId}
        onClose={() => setSelectedSubId(null)}
        language={language}
      />
    )
  }
    </div >
  );
}
