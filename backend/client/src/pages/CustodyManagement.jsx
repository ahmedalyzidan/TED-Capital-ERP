import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

export default function CustodyManagement({ projectId = '' }) {
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [custodies, setCustodies] = useState([]);
  const [selectedCustody, setSelectedCustody] = useState(null);
  const [custodyDetails, setCustodyDetails] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [attachmentsMap, setAttachmentsMap] = useState({});
  const [uploadingExpenseId, setUploadingExpenseId] = useState(null);
  const [projects, setProjects] = useState([]);
  const [boqItems, setBoqItems] = useState([]);
  const [loadingBoqs, setLoadingBoqs] = useState(false);

  // Modals / Drawers States
  const [isCustodyModalOpen, setIsCustodyModalOpen] = useState(false);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [activeExpenseToApprove, setActiveExpenseToApprove] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Forms
  const [custodyForm, setCustodyForm] = useState({
    custodian_name: '',
    assigned_amount: '',
    notes: '',
    company: localStorage.getItem('active_company') || ''
  });

  const [expenseForm, setExpenseForm] = useState({
    expense_category: '',
    amount: '',
    expense_date: new Date().toISOString().split('T')[0],
    recipient_name: '',
    project_id: '',
    boq_id: '',
    cost_type: '',
    notes: ''
  });

  const [approveForm, setApproveForm] = useState({
    debit_account: ''
  });

  const t = {
    ar: {
      title: "إدارة العهد والمصروفات النقدية 💼",
      subtitle: "متابعة المبالغ النقدية المخصصة للموظفين والمحاسبين واعتماد بنود المصروفات",
      newCustodyBtn: "صرف عهدة جديدة +",
      stats: {
        total: "إجمالي العهد المفتوحة",
        remaining: "الرصيد المتبقي الإجمالي",
        activeCount: "العهود النشطة",
        settledCount: "العهود المسواة"
      },
      filters: {
        searchPlaceholder: "البحث باسم مستلم العهدة...",
        all: "كل الحالات",
        active: "نشطة",
        settled: "مسواة"
      },
      table: {
        custodian: "مستلم العهدة",
        assigned: "المبلغ المخصص",
        remaining: "الرصيد المتبقي",
        status: "الحالة",
        date: "تاريخ الصرف",
        actions: "الإجراءات"
      },
      status: {
        active: "نشطة",
        settled: "مسواة",
        pending: "معلق",
        approved: "معتمد",
        rejected: "مرفوض"
      },
      form: {
        title: "صرف وتسليم عهدة جديدة",
        custodianName: "اسم مستلم العهدة (المحاسب/الموظف) *",
        amount: "قيمة العهدة النقدية *",
        notes: "ملاحظات وتفاصيل العهدة",
        custodianPlaceholder: "أدخل اسم مستلم العهدة...",
        amountPlaceholder: "0.00",
        notesPlaceholder: "اكتب هنا الغرض من العهدة أو أي تفاصيل إضافية...",
        submit: "صرف وإثبات العهدة 💵",
        submitting: "جاري المعالجة..."
      },
      details: {
        title: "تفاصيل العهدة والمسحوبات",
        info: "بيانات العهدة الأساسية",
        custodian: "المستلم:",
        assigned: "القيمة الكلية:",
        remaining: "المتبقي بالعهدة:",
        status: "الحالة:",
        notes: "البيان/الملاحظات:",
        date: "تاريخ الإنشاء:",
        expensesHeader: "سجل مصروفات وبنود العهدة",
        noExpenses: "لا توجد مصروفات مسجلة لهذه العهدة بعد.",
        addExpense: "تسجيل بند مصروف +",
        settleBtn: "تصفية وإقفال العهدة 🔒",
        approve: "اعتماد",
        reject: "رفض",
        viewAttachment: "عرض المرفق",
        noAttachment: "لا يوجد فاتورة",
        uploadReceipt: "إرفاق فاتورة 📤",
        uploading: "جاري الرفع...",
        actionBy: "بواسطة:"
      },
      expenseForm: {
        title: "تسجيل بند مصروف جديد من العهدة",
        category: "تصنيف المصروف (مثال: ضيافة، قرطاسية، صيانة) *",
        categoryPlaceholder: "اختر أو اكتب التصنيف...",
        amount: "المبلغ المخصوم *",
        date: "تاريخ المصروف *",
        recipient: "الجهة المستلمة للمصروف (المستفيد)",
        recipientPlaceholder: "مثال: شركة النور للأدوات المكتبية...",
        project: "المشروع المرتبط",
        projectPlaceholder: "اختر المشروع (اختياري)...",
        boqItem: "بند المقايسة المرتبط",
        boqPlaceholder: "اختر بند المقايسة...",
        loadingBoqs: "جاري تحميل البنود...",
        noBoqs: "لا توجد بنود مقايسة لهذا المشروع",
        costType: "نوع التكلفة",
        costTypePlaceholder: "اختر نوع التكلفة...",
        costTypes: {
          materials: "مواد وخامات",
          labor: "أجور وعمالة",
          subcontractor: "مقاولين باطن",
          equipment: "معدات وآلات",
          other: "مصاريف أخرى"
        },
        notes: "شرح وتفاصيل المصروف",
        notesPlaceholder: "اكتب بيان الفاتورة هنا بالتفصيل...",
        submit: "حفظ وتسجيل المصروف"
      },
      approveForm: {
        title: "اعتماد بند المصروف وترحيل القيد للدفتر العام",
        selectAccount: "تحديد الحساب المدين المحمل بالمصروف *",
        defaultAccount: "-- الحساب التلقائي (صيدليات وأدوية) --",
        submit: "ترحيل واعتماد المصروف 🖋️"
      },
      alerts: {
        settleConfirm: "هل أنت متأكد من تصفية وإقفال هذه العهدة؟ سيتم إرجاع الرصيد المتبقي بالكامل ( {amount} EGP ) إلى الصندوق الرئيسي وتصفير رصيد العهدة دفترياً.",
        rejectConfirm: "هل أنت متأكد من رفض هذا المصروف؟ سيتم إعادة المبلغ المخصوم تلقائياً لرصيد العهدة المتبقي.",
        successCustody: "✅ تم صرف وتسليم العهدة النقدية بنجاح وإثباتها محاسبياً.",
        successExpense: "✅ تم تسجيل بند المصروف بنجاح وتخفيض الرصيد مؤقتاً.",
        successApprove: "✅ تم اعتماد المصروف بنجاح وترحيل القيد المزدوج المقابل للدفتر العام.",
        successReject: "✅ تم رفض المصروف واسترجاع القيمة للعهدة.",
        successSettle: "✅ تم إقفال وتصفية العهدة وإرجاع المتبقي للصندوق بنجاح.",
        error: "حدث خطأ أثناء تنفيذ العملية:"
      },
      currency: "ج.م"
    },
    en: {
      title: "Custody & Petty Cash 💼",
      subtitle: "Track employee cash balances, log expenditures, approve expenses, and reconcile books",
      newCustodyBtn: "Issue New Custody +",
      stats: {
        total: "Total Active Custodies",
        remaining: "Total Remaining Cash",
        activeCount: "Active Custodies",
        settledCount: "Settled Custodies"
      },
      filters: {
        searchPlaceholder: "Search by custodian name...",
        all: "All Statuses",
        active: "Active",
        settled: "Settled"
      },
      table: {
        custodian: "Custodian",
        assigned: "Assigned Amount",
        remaining: "Remaining Balance",
        status: "Status",
        date: "Issue Date",
        actions: "Actions"
      },
      status: {
        active: "Active",
        settled: "Settled",
        pending: "Pending",
        approved: "Approved",
        rejected: "Rejected"
      },
      form: {
        title: "Issue New Custody",
        custodianName: "Custodian Name (Accountant/Employee) *",
        amount: "Custody Amount *",
        notes: "Custody Notes & Details",
        custodianPlaceholder: "Enter custodian name...",
        amountPlaceholder: "0.00",
        notesPlaceholder: "Enter purpose of custody or details...",
        submit: "Issue & Record Custody 💵",
        submitting: "Processing..."
      },
      details: {
        title: "Custody Operations & Ledger",
        info: "Custody Metadata",
        custodian: "Custodian:",
        assigned: "Assigned Amount:",
        remaining: "Remaining Balance:",
        status: "Status:",
        notes: "Purpose / Notes:",
        date: "Created Date:",
        expensesHeader: "Custody Expense Records",
        noExpenses: "No expenditures logged for this custody yet.",
        addExpense: "Log New Expense +",
        settleBtn: "Settle & Close Custody 🔒",
        approve: "Approve",
        reject: "Reject",
        viewAttachment: "View Receipt",
        noAttachment: "No Receipt Attached",
        uploadReceipt: "Upload Receipt 📤",
        uploading: "Uploading...",
        actionBy: "By:"
      },
      expenseForm: {
        title: "Log Custody Expenditure",
        category: "Expense Category (e.g. Hospitality, Stationery) *",
        categoryPlaceholder: "Choose or type category...",
        amount: "Spent Amount *",
        date: "Expense Date *",
        recipient: "Recipient / Supplier Name",
        recipientPlaceholder: "Enter vendor name...",
        project: "Linked Project",
        projectPlaceholder: "Select Project (Optional)...",
        boqItem: "Linked BOQ Item",
        boqPlaceholder: "Select BOQ Item...",
        loadingBoqs: "Loading items...",
        noBoqs: "No BOQ items for this project",
        costType: "Cost Type",
        costTypePlaceholder: "Select Cost Type...",
        costTypes: {
          materials: "Materials & Supplies",
          labor: "Labor & Wages",
          subcontractor: "Subcontractors",
          equipment: "Equipment & Machinery",
          other: "Other Expenses"
        },
        notes: "Description / Notes",
        notesPlaceholder: "Enter detailed invoice explanation...",
        submit: "Save & Log Expenditure"
      },
      approveForm: {
        title: "Approve Expense & Post Ledger Entry",
        selectAccount: "Select GL Account to Debit *",
        defaultAccount: "-- Default Account (Pharmacy Expense) --",
        submit: "Post & Approve Expense 🖋️"
      },
      alerts: {
        settleConfirm: "Are you sure you want to close this custody? The remaining balance ( {amount} EGP ) will be fully refunded back to the main Cash account.",
        rejectConfirm: "Are you sure you want to reject this expense? The amount will be refunded back to the custody balance.",
        successCustody: "✅ Custody issued successfully and accounting entry recorded.",
        successExpense: "✅ Expense logged successfully and remaining balance reduced.",
        successApprove: "✅ Expense approved and double entry posted to General Ledger.",
        successReject: "✅ Expense rejected and amount returned to custody balance.",
        successSettle: "✅ Custody settled and remaining balance refunded to Cash successfully.",
        error: "An error occurred:"
      },
      currency: "EGP"
    }
  };

  const cur = t[language === 'en' ? 'en' : 'ar'];

  useEffect(() => {
    fetchCustodies();
    fetchAccounts();
    fetchCompanies();
  }, []);

  const fetchCustodies = async () => {
    setLoading(true);
    try {
      const res = await api.get('/custodies');
      if (res.data.success) {
        const activeComp = localStorage.getItem('active_company') || '';
        const filtered = (res.data.custodies || []).filter(c => !c.company || c.company.toLowerCase() === activeComp.toLowerCase());
        setCustodies(filtered);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const res = await api.get('/dropdowns');
      if (res.data.accounts_dd) {
        setAccounts(res.data.accounts_dd);
      }
      if (res.data.projects_dd) {
        const activeComp = localStorage.getItem('active_company') || '';
        const filteredProj = (res.data.projects_dd || []).filter(p => !p.company || p.company.toLowerCase() === activeComp.toLowerCase());
        setProjects(filteredProj);
      }
    } catch (error) {
      console.error("Error fetching accounts:", error);
    }
  };

  const fetchCompanies = async () => {
    try {
      const res = await api.get('/dynamic/table/companies?limit=50');
      if (res.data?.data) {
        setCompanies(res.data.data);
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  };

  const fetchBOQItems = async (projectName) => {
    setLoadingBoqs(true);
    try {
      const res = await api.get(`/dynamic/table/boq?filter=${encodeURIComponent(projectName)}&limit=200`);
      if (res.data && res.data.data) {
        setBoqItems(res.data.data);
      }
    } catch (error) {
      console.error("Error fetching BOQ items:", error);
    } finally {
      setLoadingBoqs(false);
    }
  };

  useEffect(() => {
    if (!expenseForm.project_id) {
      setBoqItems([]);
      setExpenseForm(prev => ({ ...prev, boq_id: '', cost_type: '' }));
      return;
    }
    const selectedProj = projects.find(p => p.id === parseInt(expenseForm.project_id));
    if (selectedProj) {
      fetchBOQItems(selectedProj.name);
    }
  }, [expenseForm.project_id, projects]);

  // Auto-fill active project when modal is open and projectId prop is passed
  useEffect(() => {
    if (isExpenseModalOpen && projectId && projects.length > 0) {
      let matched = projects.find(p => String(p.id) === String(projectId));
      if (!matched) {
        let localProjName = '';
        const savedLocalProjs = localStorage.getItem('contractor_projects');
        if (savedLocalProjs) {
          try {
            const parsed = JSON.parse(savedLocalProjs);
            const foundLocal = parsed.find(lp => String(lp.id) === String(projectId));
            if (foundLocal) {
              localProjName = foundLocal.name;
            }
          } catch (e) {}
        }
        if (!localProjName) {
          if (projectId === 'villa-e109') localProjName = 'فيلا E109';
          else if (projectId === 'villa-e110') localProjName = 'فيلا E110';
        }
        if (localProjName) {
          matched = projects.find(p => 
            p.name.toLowerCase().includes(localProjName.toLowerCase()) || 
            localProjName.toLowerCase().includes(p.name.toLowerCase())
          );
        }
      }
      if (matched) {
        setExpenseForm(prev => ({
          ...prev,
          project_id: String(matched.id)
        }));
      }
    }
  }, [isExpenseModalOpen, projectId, projects]);

  const handleCustodyClick = async (custody) => {
    setSelectedCustody(custody);
    try {
      const res = await api.get(`/custodies/${custody.id}`);
      if (res.data.success) {
        setCustodyDetails(res.data.custody);
        setExpenses(res.data.expenses);
        // Fetch attachments for all custody expenses in parallel
        res.data.expenses.forEach(exp => {
          fetchExpenseAttachments(exp.id);
        });
      }
    } catch (error) {
      console.error(error);
    }
  };

  const fetchExpenseAttachments = async (expenseId) => {
    try {
      const res = await api.get(`/files/attachments/custody_expenses/${expenseId}`);
      setAttachmentsMap(prev => ({
        ...prev,
        [expenseId]: res.data || []
      }));
    } catch (error) {
      console.error("Error fetching attachments:", error);
    }
  };

  const handleCustodySubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await api.post('/custodies', custodyForm);
      if (res.data.success) {
        alert(cur.alerts.successCustody);
        setIsCustodyModalOpen(false);
        setCustodyForm({
          custodian_name: '',
          assigned_amount: '',
          notes: '',
          company: localStorage.getItem('active_company') || ''
        });
        fetchCustodies();
      }
    } catch (error) {
      alert(`${cur.alerts.error} ${error.response?.data?.error || error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await api.post(`/custodies/${selectedCustody.id}/expenses`, expenseForm);
      if (res.data.success) {
        alert(cur.alerts.successExpense);
        setIsExpenseModalOpen(false);
        setExpenseForm({
          expense_category: '',
          amount: '',
          expense_date: new Date().toISOString().split('T')[0],
          recipient_name: '',
          project_id: '',
          boq_id: '',
          cost_type: '',
          notes: ''
        });
        // refresh selected custody details
        handleCustodyClick(selectedCustody);
        fetchCustodies();
      }
    } catch (error) {
      alert(`${cur.alerts.error} ${error.response?.data?.error || error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const triggerSettleCustody = async (custodyId, remainingAmount) => {
    const confirmMsg = cur.alerts.settleConfirm.replace('{amount}', remainingAmount);
    if (!window.confirm(confirmMsg)) return;

    try {
      const res = await api.post(`/custodies/${custodyId}/settle`);
      if (res.data.success) {
        alert(cur.alerts.successSettle);
        fetchCustodies();
        if (selectedCustody && selectedCustody.id === custodyId) {
          setSelectedCustody(null);
          setCustodyDetails(null);
          setExpenses([]);
        }
      }
    } catch (error) {
      alert(`${cur.alerts.error} ${error.response?.data?.error || error.message}`);
    }
  };

  const triggerApproveExpense = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const res = await api.put(`/custodies/expenses/${activeExpenseToApprove.id}/approve`, {
        debit_account: approveForm.debit_account || null
      });
      if (res.data.success) {
        alert(cur.alerts.successApprove);
        setIsApproveModalOpen(false);
        setActiveExpenseToApprove(null);
        setApproveForm({ debit_account: '' });
        // Refresh details
        handleCustodyClick(selectedCustody);
        fetchCustodies();
      }
    } catch (error) {
      alert(`${cur.alerts.error} ${error.response?.data?.error || error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const triggerRejectExpense = async (expenseId) => {
    if (!window.confirm(cur.alerts.rejectConfirm)) return;
    try {
      const res = await api.put(`/custodies/expenses/${expenseId}/reject`);
      if (res.data.success) {
        alert(cur.alerts.successReject);
        // Refresh details
        handleCustodyClick(selectedCustody);
        fetchCustodies();
      }
    } catch (error) {
      alert(`${cur.alerts.error} ${error.response?.data?.error || error.message}`);
    }
  };

  const handleExpenseFileUpload = async (e, expenseId) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    setUploadingExpenseId(expenseId);
    try {
      await api.post(`/files/upload/custody_expenses/${expenseId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      fetchExpenseAttachments(expenseId);
    } catch (error) {
      alert(`${cur.alerts.error} ${error.response?.data?.error || error.message}`);
    } finally {
      setUploadingExpenseId(null);
    }
  };

  // Stats derivation
  const totalAssigned = custodies.reduce((sum, c) => c.status === 'Active' ? sum + parseFloat(c.assigned_amount) : sum, 0);
  const totalRemaining = custodies.reduce((sum, c) => c.status === 'Active' ? sum + parseFloat(c.remaining_amount) : sum, 0);
  const activeCount = custodies.filter(c => c.status === 'Active').length;
  const settledCount = custodies.filter(c => c.status === 'Settled').length;

  return (
    <div className="space-y-10 animate-fade-in" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center text-3xl shadow-xl shadow-slate-900/20">💼</div>
            <div>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">{cur.title}</h1>
              <p className="text-slate-400 font-bold text-sm mt-1">{cur.subtitle}</p>
            </div>
          </div>
        </div>
        <button
          onClick={() => setIsCustodyModalOpen(true)}
          className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs hover:bg-slate-800 transition-all shadow-xl shadow-slate-900/20 flex items-center gap-3 active:scale-95"
        >
          <span className="text-xl leading-none">+</span> {cur.newCustodyBtn}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm flex items-center gap-6 hover:shadow-md transition-all">
          <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-2xl">💵</div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{cur.stats.total}</p>
            <h4 className="text-2xl font-extrabold text-slate-900 mt-1 font-mono">
              {totalAssigned.toLocaleString()} <span className="text-xs font-sans text-slate-400">{cur.currency}</span>
            </h4>
          </div>
        </div>

        <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm flex items-center gap-6 hover:shadow-md transition-all">
          <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-2xl text-emerald-600">🛡️</div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{cur.stats.remaining}</p>
            <h4 className="text-2xl font-extrabold text-emerald-600 mt-1 font-mono">
              {totalRemaining.toLocaleString()} <span className="text-xs font-sans text-slate-400">{cur.currency}</span>
            </h4>
          </div>
        </div>

        <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm flex items-center gap-6 hover:shadow-md transition-all">
          <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-2xl text-blue-600">👥</div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{cur.stats.activeCount}</p>
            <h4 className="text-2xl font-extrabold text-blue-600 mt-1 font-mono">{activeCount}</h4>
          </div>
        </div>

        <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-sm flex items-center gap-6 hover:shadow-md transition-all">
          <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-2xl text-slate-500">🔒</div>
          <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{cur.stats.settledCount}</p>
            <h4 className="text-2xl font-extrabold text-slate-500 mt-1 font-mono">{settledCount}</h4>
          </div>
        </div>
      </div>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left/Middle Column - List of Custodies */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">
                {language === 'ar' ? 'سجل العهد النقدية' : 'Custody List'}
              </h3>
            </div>

            <div className="overflow-x-auto custom-scrollbar">
              <table className={`w-full ${language === 'ar' ? 'text-right' : 'text-left'} whitespace-nowrap`}>
                <thead className="bg-slate-50/20 border-b border-slate-50">
                  <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="px-8 py-5">{cur.table.custodian}</th>
                    <th className="px-8 py-5">{cur.table.assigned}</th>
                    <th className="px-8 py-5">{cur.table.remaining}</th>
                    <th className="px-8 py-5">{cur.table.status}</th>
                    <th className="px-8 py-5">{cur.table.date}</th>
                    <th className="px-8 py-5 text-center">{cur.table.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="p-16 text-center text-slate-300 font-bold animate-pulse">
                        {language === 'ar' ? 'جاري جلب بيانات العهد...' : 'Loading custody data...'}
                      </td>
                    </tr>
                  ) : custodies.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="p-16 text-center text-slate-400 font-bold">
                        {language === 'ar' ? 'لا يوجد سجل عهد حتى الآن.' : 'No custody entries found.'}
                      </td>
                    </tr>
                  ) : (
                    custodies.map(custody => (
                      <tr
                        key={custody.id}
                        onClick={() => handleCustodyClick(custody)}
                        className={`hover:bg-slate-50/50 transition-all cursor-pointer group ${selectedCustody?.id === custody.id ? 'bg-slate-50/80 font-bold' : ''}`}
                      >
                        <td className="px-8 py-5">
                          <div className="flex flex-col">
                            <span className="font-black text-slate-900 group-hover:text-slate-600 transition-colors">
                              {custody.custodian_name}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono mt-0.5">#CUST-{custody.id}</span>
                          </div>
                        </td>
                        <td className="px-8 py-5 font-mono text-slate-700">
                          {parseFloat(custody.assigned_amount).toLocaleString()} {cur.currency}
                        </td>
                        <td className="px-8 py-5 font-mono text-emerald-600 font-extrabold">
                          {parseFloat(custody.remaining_amount).toLocaleString()} {cur.currency}
                        </td>
                        <td className="px-8 py-5">
                          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm ${
                            custody.status === 'Active' ? 'bg-emerald-500 text-white' : 'bg-slate-400 text-white'
                          }`}>
                            {custody.status === 'Active' ? cur.status.active : cur.status.settled}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-slate-400 text-xs font-mono">
                          {new Date(custody.created_at).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}
                        </td>
                        <td className="px-8 py-5 text-center" onClick={e => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleCustodyClick(custody)}
                              title={language === 'ar' ? 'عرض التفاصيل والمسحوبات' : 'View Details'}
                              className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-600 flex items-center justify-center text-sm transition-all"
                            >
                              👁️
                            </button>
                            {custody.status === 'Active' && (
                              <button
                                onClick={() => triggerSettleCustody(custody.id, custody.remaining_amount)}
                                title={cur.details.settleBtn}
                                className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-rose-500 hover:text-white text-slate-600 flex items-center justify-center text-sm transition-all"
                              >
                                🔒
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right/Side Column - Selected Custody Details & Expenses */}
        <div className="lg:col-span-1">
          {selectedCustody ? (
            <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden p-8 space-y-8 animate-fade-in relative">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">{cur.details.title}</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">#CUST-{selectedCustody.id}</p>
                </div>
                <button
                  onClick={() => { setSelectedCustody(null); setCustodyDetails(null); setExpenses([]); }}
                  className="text-slate-400 hover:text-slate-900 text-xl font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Custody Info Block */}
              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 space-y-4">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-500">{cur.details.custodian}</span>
                  <span className="font-black text-slate-900">{selectedCustody.custodian_name}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-500">{cur.details.assigned}</span>
                  <span className="font-mono font-black text-slate-900">{parseFloat(selectedCustody.assigned_amount).toLocaleString()} {cur.currency}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-500">{cur.details.remaining}</span>
                  <span className="font-mono font-black text-emerald-600 text-lg">{parseFloat(selectedCustody.remaining_amount).toLocaleString()} {cur.currency}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-slate-500">{cur.details.status}</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${
                    selectedCustody.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {selectedCustody.status === 'Active' ? cur.status.active : cur.status.settled}
                  </span>
                </div>
                {selectedCustody.notes && (
                  <div className="text-xs border-t border-slate-200 pt-3">
                    <p className="font-bold text-slate-500 mb-1">{cur.details.notes}</p>
                    <p className="text-slate-600 bg-white p-2 rounded-lg border border-slate-100 italic">{selectedCustody.notes}</p>
                  </div>
                )}
              </div>

              {/* Actions & Expenses Header */}
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">{cur.details.expensesHeader}</h4>
                {selectedCustody.status === 'Active' && (
                  <button
                    onClick={() => setIsExpenseModalOpen(true)}
                    className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase hover:bg-slate-800 transition-all active:scale-95"
                  >
                    {cur.details.addExpense}
                  </button>
                )}
              </div>

              {/* Expenses List */}
              <div className="space-y-4 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                {expenses.length === 0 ? (
                  <p className="text-center py-8 text-xs text-slate-400 italic">{cur.details.noExpenses}</p>
                ) : (
                  expenses.map(exp => {
                    const fileAttachments = attachmentsMap[exp.id] || [];
                    return (
                      <div key={exp.id} className="bg-white p-5 rounded-2xl border border-slate-200 space-y-3 relative group shadow-sm hover:shadow-md transition-all">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="px-2.5 py-0.5 bg-slate-100 text-slate-800 rounded-lg text-[9px] font-black border border-slate-200/50">
                              {exp.expense_category}
                            </span>
                            <h5 className="font-extrabold text-slate-900 text-sm mt-2">{exp.recipient_name || 'General Expense'}</h5>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="font-mono font-black text-slate-900 text-base">{parseFloat(exp.amount).toLocaleString()}</span>
                            <span className="text-[9px] font-bold text-slate-400 font-mono">{new Date(exp.expense_date).toLocaleDateString()}</span>
                          </div>
                        </div>

                        {exp.project_name && (
                          <div className="flex flex-wrap gap-2 mt-1">
                            <span className="px-2.5 py-0.5 bg-blue-50/80 text-blue-700 rounded-lg text-[9px] font-black border border-blue-200/30">
                              📁 {exp.project_name}
                            </span>
                            {exp.cost_type && (
                              <span className="px-2.5 py-0.5 bg-indigo-50/80 text-indigo-700 rounded-lg text-[9px] font-black border border-indigo-200/30">
                                🏷️ {
                                  language === 'ar' 
                                    ? (exp.cost_type === 'Materials' ? 'مواد وخامات' :
                                       exp.cost_type === 'Labor' ? 'أجور وعمالة' :
                                       exp.cost_type === 'Subcontractor' ? 'مقاولين باطن' :
                                       exp.cost_type === 'Equipment' ? 'معدات وآلات' : 'مصاريف أخرى')
                                    : exp.cost_type
                                }
                              </span>
                            )}
                          </div>
                        )}

                        {exp.notes && <p className="text-xs text-slate-500 italic bg-slate-50 p-2 rounded-lg border border-slate-100">{exp.notes}</p>}

                        {/* Status Badge */}
                        <div className="flex justify-between items-center pt-2 border-t border-slate-100 text-xs">
                          <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${
                            exp.status === 'Approved' ? 'bg-emerald-100 text-emerald-800' :
                            exp.status === 'Pending' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                          }`}>
                            {exp.status === 'Pending' ? cur.status.pending :
                             exp.status === 'Approved' ? cur.status.approved : cur.status.rejected}
                          </span>

                          {/* Approval Meta */}
                          {exp.approved_by && (
                            <span className="text-[10px] text-slate-400 font-semibold">
                              {cur.details.actionBy} {exp.approved_by}
                            </span>
                          )}
                        </div>

                        {/* Attachments Section */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 bg-slate-50/70 p-3 rounded-xl border border-slate-100">
                          {fileAttachments.length > 0 ? (
                            <a
                              href={fileAttachments[0].file_path}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] font-black text-blue-600 hover:underline flex items-center gap-1"
                            >
                              📎 {cur.details.viewAttachment}
                            </a>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-semibold">{cur.details.noAttachment}</span>
                          )}

                          {exp.status === 'Pending' && (
                            <div className="relative overflow-hidden cursor-pointer">
                              <input
                                type="file"
                                onChange={e => handleExpenseFileUpload(e, exp.id)}
                                disabled={uploadingExpenseId === exp.id}
                                className="absolute inset-0 opacity-0 cursor-pointer z-10"
                              />
                              <button
                                type="button"
                                className="px-2.5 py-1 bg-white border border-slate-200 text-slate-600 rounded-lg text-[9px] font-black hover:border-slate-900 transition-colors"
                              >
                                {uploadingExpenseId === exp.id ? cur.details.uploading : cur.details.uploadReceipt}
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Approval / Rejection buttons (Manager panel only for Pending expenses) */}
                        {exp.status === 'Pending' && (
                          <div className="flex gap-2 pt-1">
                            <button
                              onClick={() => {
                                setActiveExpenseToApprove(exp);
                                setIsApproveModalOpen(true);
                              }}
                              className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black transition-colors"
                            >
                              {cur.details.approve} ✓
                            </button>
                            <button
                              onClick={() => triggerRejectExpense(exp.id)}
                              className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-[10px] font-black transition-colors"
                            >
                              {cur.details.reject} ✕
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Settle Custody Button at the bottom */}
              {selectedCustody.status === 'Active' && (
                <div className="pt-4 border-t border-slate-100">
                  <button
                    onClick={() => triggerSettleCustody(selectedCustody.id, selectedCustody.remaining_amount)}
                    className="w-full py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black text-xs transition-all shadow-lg shadow-rose-500/20 active:scale-95"
                  >
                    {cur.details.settleBtn}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-50 border border-dashed border-slate-200 rounded-[2.5rem] p-16 text-center text-slate-400 italic">
              <span className="text-4xl block mb-4">📂</span>
              {language === 'ar' ? 'اختر عهدة من الجدول لعرض تفاصيل الحركة والمصروفات واعتمادها.' : 'Select a custody entry from the list to view expenditures ledger and process approvals.'}
            </div>
          )}
        </div>
      </div>

      {/* --- CUSTODY CREATION MODAL --- */}
      {isCustodyModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xl">
          <div className="absolute inset-0 cursor-pointer" onClick={() => setIsCustodyModalOpen(false)}></div>
          <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl relative z-10 overflow-hidden animate-scale-up border border-white/10 flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center text-xl shadow-xl">💵</div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">{cur.form.title}</h3>
              </div>
              <button
                onClick={() => setIsCustodyModalOpen(false)}
                className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-lg hover:bg-rose-50 hover:text-rose-500 transition-all active:scale-90"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleCustodySubmit} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{cur.form.custodianName}</label>
                <input
                  type="text"
                  required
                  placeholder={cur.form.custodianPlaceholder}
                  value={custodyForm.custodian_name}
                  onChange={e => setCustodyForm({ ...custodyForm, custodian_name: e.target.value })}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-slate-900 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{cur.form.amount}</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder={cur.form.amountPlaceholder}
                  value={custodyForm.assigned_amount}
                  onChange={e => setCustodyForm({ ...custodyForm, assigned_amount: e.target.value })}
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl text-xl font-mono text-center font-black text-slate-900 outline-none focus:bg-white focus:border-slate-900 transition-all"
                />
              </div>

              {/* Company Field */}
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  {language === 'ar' ? 'الشركة *' : 'Company *'}
                </label>
                <select
                  required
                  disabled
                  value={custodyForm.company || localStorage.getItem('active_company') || ''}
                  onChange={e => setCustodyForm({ ...custodyForm, company: e.target.value })}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-slate-900 transition-all opacity-70"
                >
                  <option value={localStorage.getItem('active_company') || ''}>{localStorage.getItem('active_company') || ''}</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{cur.form.notes}</label>
                <textarea
                  placeholder={cur.form.notesPlaceholder}
                  rows="3"
                  value={custodyForm.notes}
                  onChange={e => setCustodyForm({ ...custodyForm, notes: e.target.value })}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-slate-900 transition-all resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm hover:bg-slate-800 transition-all shadow-lg active:scale-95"
              >
                {isSubmitting ? cur.form.submitting : cur.form.submit}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- EXPENSE LOGGING MODAL --- */}
      {isExpenseModalOpen && selectedCustody && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xl">
          <div className="absolute inset-0 cursor-pointer" onClick={() => setIsExpenseModalOpen(false)}></div>
          <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl relative z-10 overflow-hidden animate-scale-up border border-white/10 flex flex-col max-h-[90vh]">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center text-xl shadow-xl">📤</div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">{cur.expenseForm.title}</h3>
              </div>
              <button
                onClick={() => setIsExpenseModalOpen(false)}
                className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-lg hover:bg-rose-50 hover:text-rose-500 transition-all active:scale-90"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleExpenseSubmit} className="p-8 space-y-5">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{cur.expenseForm.category}</label>
                <input
                  type="text"
                  required
                  placeholder={cur.expenseForm.categoryPlaceholder}
                  value={expenseForm.expense_category}
                  onChange={e => setExpenseForm({ ...expenseForm, expense_category: e.target.value })}
                  list="categories-list"
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-slate-900 transition-all"
                />
                <datalist id="categories-list">
                  <option value="قرطاسية وأدوات مكتبية" />
                  <option value="بوفيه وضيافة" />
                  <option value="صيانة وإصلاحات" />
                  <option value="نثرية ومصروفات عامة" />
                  <option value="انتقالات ومواصلات" />
                  <option value="إيجارات وخدمات" />
                </datalist>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{cur.expenseForm.amount}</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={expenseForm.amount}
                    onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-center font-black text-slate-900 outline-none focus:bg-white focus:border-slate-900 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{cur.expenseForm.date}</label>
                  <input
                    type="date"
                    required
                    value={expenseForm.expense_date}
                    onChange={e => setExpenseForm({ ...expenseForm, expense_date: e.target.value })}
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-slate-900 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{cur.expenseForm.recipient}</label>
                <input
                  type="text"
                  placeholder={cur.expenseForm.recipientPlaceholder}
                  value={expenseForm.recipient_name}
                  onChange={e => setExpenseForm({ ...expenseForm, recipient_name: e.target.value })}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-slate-900 transition-all"
                />
              </div>

              {/* Project Selection Dropdown */}
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  {cur.expenseForm.project}
                </label>
                <select
                  value={expenseForm.project_id}
                  onChange={e => setExpenseForm({ ...expenseForm, project_id: e.target.value })}
                  disabled={!!projectId}
                  className={`w-full px-5 py-3.5 border-none rounded-xl text-xs font-bold outline-none transition-all ${
                    projectId 
                      ? 'bg-slate-150 text-slate-500 cursor-not-allowed appearance-none' 
                      : 'bg-slate-50 border border-slate-200 text-slate-900 cursor-pointer focus:bg-white focus:border-slate-900'
                  }`}
                >
                  <option value="">{cur.expenseForm.projectPlaceholder}</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Conditional BOQ Selection */}
              {expenseForm.project_id && (
                <div className="space-y-2 animate-fade-in">
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    {cur.expenseForm.boqItem}
                  </label>
                  <select
                    required
                    value={expenseForm.boq_id}
                    onChange={e => {
                      const boqId = e.target.value;
                      const selectedBoq = boqItems.find(item => item.id === parseInt(boqId));
                      let resolvedCostType = 'Materials';
                      if (selectedBoq) {
                        const cat = (selectedBoq.material_category || '').toLowerCase();
                        if (cat.includes('labor') || cat.includes('أجور') || cat.includes('عمال')) {
                          resolvedCostType = 'Labor';
                        } else if (cat.includes('subcontractor') || cat.includes('مقاول')) {
                          resolvedCostType = 'Subcontractor';
                        } else if (cat.includes('equipment') || cat.includes('معدات')) {
                          resolvedCostType = 'Equipment';
                        }
                      }
                      setExpenseForm({ ...expenseForm, boq_id: boqId, cost_type: resolvedCostType });
                    }}
                    disabled={loadingBoqs}
                    className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-slate-900 transition-all cursor-pointer"
                  >
                    <option value="">
                      {loadingBoqs ? cur.expenseForm.loadingBoqs : cur.expenseForm.boqPlaceholder}
                    </option>
                    {boqItems.map(item => (
                      <option key={item.id} value={item.id}>
                        [{item.material_category || 'عام'}] {item.item_name}
                      </option>
                    ))}
                  </select>
                  {!loadingBoqs && boqItems.length === 0 && (
                    <p className="text-[10px] font-bold text-rose-500 mt-1">{cur.expenseForm.noBoqs}</p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{cur.expenseForm.notes}</label>
                <textarea
                  placeholder={cur.expenseForm.notesPlaceholder}
                  rows="3"
                  value={expenseForm.notes}
                  onChange={e => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none focus:bg-white focus:border-slate-900 transition-all resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-sm hover:bg-slate-800 transition-all shadow-lg active:scale-95"
              >
                {isSubmitting ? cur.form.submitting : cur.expenseForm.submit}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- MANAGER APPROVAL DEBIT ACCOUNT SELECTION MODAL --- */}
      {isApproveModalOpen && activeExpenseToApprove && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xl">
          <div className="absolute inset-0 cursor-pointer" onClick={() => setIsApproveModalOpen(false)}></div>
          <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl relative z-10 overflow-hidden border border-white/10 flex flex-col">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center text-xl shadow-xl">🖋️</div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">{cur.approveForm.title}</h3>
              </div>
              <button
                onClick={() => setIsApproveModalOpen(false)}
                className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-lg hover:bg-rose-50 hover:text-rose-500 transition-all active:scale-90"
              >
                ✕
              </button>
            </div>
            <form onSubmit={triggerApproveExpense} className="p-8 space-y-6">
              <div className="space-y-3">
                <p className="text-xs text-slate-600 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  {language === 'ar' ? 'بند المصروف المراد اعتماده:' : 'Expense item being approved:'} <strong className="text-slate-900">{activeExpenseToApprove.expense_category}</strong><br />
                  {language === 'ar' ? 'المستفيد:' : 'Beneficiary:'} <strong className="text-slate-900">{activeExpenseToApprove.recipient_name || 'N/A'}</strong><br />
                  {language === 'ar' ? 'المبلغ:' : 'Amount:'} <strong className="text-slate-900">{parseFloat(activeExpenseToApprove.amount).toLocaleString()} {cur.currency}</strong>
                </p>
                
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  {cur.approveForm.selectAccount}
                </label>
                <select
                  value={approveForm.debit_account}
                  onChange={e => setApproveForm({ ...approveForm, debit_account: e.target.value })}
                  disabled={true}
                  className="w-full px-5 py-3.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 outline-none cursor-not-allowed opacity-80"
                >
                  {accounts.map((acc, index) => (
                    <option key={index} value={acc}>{acc}</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-sm hover:bg-emerald-700 transition-all shadow-lg active:scale-95"
              >
                {isSubmitting ? cur.form.submitting : cur.approveForm.submit}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
