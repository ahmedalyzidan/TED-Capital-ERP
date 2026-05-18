import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

export default function ContractorSuite() {
  const { language } = useLanguage();

  // --- 1. PERSISTED STATE / MULTI-PROJECT ENGINE ---
  // We initialize the state by reading from localStorage, or using the preloaded "Villa E109" as our seed project.
  const [projects, setProjects] = useState(() => {
    const saved = localStorage.getItem('contractor_projects');
    if (saved) return JSON.parse(saved);
    return [
      { id: 'villa-e109', name: 'فيلا E109 - التجمع الخامس', clientName: 'الأستاذ محمد' },
      { id: 'villa-e110', name: 'فيلا E110 - زايد الجديد', clientName: 'المهندس أحمد سالم' }
    ];
  });

  const [activeProjectId, setActiveProjectId] = useState(() => {
    const saved = localStorage.getItem('contractor_active_project_id');
    return saved || 'villa-e109';
  });

  // Seed data for Villa E109
  const defaultBoqItems = [
    { id: 1, projectId: 'villa-e109', category: "أعمال صحية وعزل", item_name: "أعمال تأسيس وتشطيب حمامات مواسير تغذيه BR ألمانى والصرف كيسيل والمحابس BR ألمانى", quantity: 4.0, unit: "بالمقطوعيه", price: 65000.0, total: 260000.0, notes: "البند يشمل خامات ومصنعيات وأعمال التشطيب مصنعيات فقط وقواعد تواليت ديورافيت معلقه وحوض بوحده معلقه وخلاطات ديورافيت" },
    { id: 2, projectId: 'villa-e109', category: "أعمال صحية وعزل", item_name: "أعمال تأسيس وتشطيب مطبخ مواسير تغذيه BR ألمانى والصرف كيسيل والمحابس BR ألمانى", quantity: 1.0, unit: "بالمقطوعيه", price: 15000.0, total: 15000.0, notes: "" },
    { id: 3, projectId: 'villa-e109', category: "أعمال صحية وعزل", item_name: "أعمال عزل لزوم أرضية الحمامات والمطبخ من النوع سيكا 107 شامل الركوب ورقبة الزجاجه مع عمل لياسه فوق العزل", quantity: 4.0, unit: "عدد", price: 3500.0, total: 14000.0, notes: "" },
    { id: 4, projectId: 'villa-e109', category: "أعمال صحية وعزل", item_name: "أعمال توريد وتركيب شبكة تغذيه للحديقه المواسير كيسيل وتغذيه من المواسير ال BR الألماني", quantity: 1.0, unit: "بالمقطوعيه", price: 15000.0, total: 15000.0, notes: "" },
    { id: 5, projectId: 'villa-e109', category: "أعمال صحية وعزل", item_name: "أعمال تأسيس شبكة صرف تكييف شامله البضاعه ( كيسيل )", quantity: 1.0, unit: "عدد", price: 15000.0, total: 15000.0, notes: "" },
    { id: 6, projectId: 'villa-e109', category: "أعمال كهرباء", item_name: "أعمال تأسيس وتشطيب مفاتيح وبرايز وسحب أسلاك لجميع الغرف والحمامات والمطبخ لزوم الإناره والسويدى المعتمد ولوحة شنايدر", quantity: 1.0, unit: "بالمقطوعيه", price: 225000.0, total: 225000.0, notes: "البند يشمل وحدات الإضاءه والأسپوتات وبيوت النور و sound sys لكل الغرف و security alarm وكاميرات مراقبه" },
    { id: 7, projectId: 'villa-e109', category: "أسقف جبس بورد", item_name: "أعمال توريد وتركيب أسقف جيبسوم بورد أبيض من إنتاج Knauf لزوم الغرف والريسبشن (مسطح)", quantity: 208.0, unit: "م2", price: 350.0, total: 72800.0, notes: "" },
    { id: 8, projectId: 'villa-e109', category: "أسقف جبس بورد", item_name: "أعمال توريد وتركيب أسقف جيبسوم بورد أبيض من إنتاج Knauf لزوم الغرف والريسبشن (طولي)", quantity: 117.0, unit: "م", price: 330.0, total: 38610.0, notes: "" },
    { id: 9, projectId: 'villa-e109', category: "أسقف جبس بورد", item_name: "أعمال توريد وتركيب أسقف جيبسوم بورد أخضر من إنتاج Knauf لزوم الحمامات والمطبخ", quantity: 43.0, unit: "م2", price: 380.0, total: 16340.0, notes: "" },
    { id: 10, projectId: 'villa-e109', category: "محارة ودهانات", item_name: "أعمال بياض محاره داخليه لزوم الحوائط والأسقف", quantity: 900.0, unit: "م2", price: 120.0, total: 108000.0, notes: "" },
    { id: 11, projectId: 'villa-e109', category: "محارة ودهانات", item_name: "أعمال دهانات للأسقف والحوائط من وجه سيلر و 3 معجون ووجهين بلاستيك يوتن", quantity: 1214.0, unit: "م2", price: 200.0, total: 242800.0, notes: "" },
    { id: 12, projectId: 'villa-e109', category: "أرضيات ورخام وسيراميك", item_name: "أعمال توريد وتركيب رخام بريشيا داينو لأرضية الريسبشن", quantity: 70.0, unit: "م2", price: 4700.0, total: 329000.0, notes: "" },
    { id: 13, projectId: 'villa-e109', category: "أرضيات ورخام وسيراميك", item_name: "أعمال توريد وتركيب رخام بيتشينو وزرة لأرضية الريسبشن", quantity: 34.0, unit: "م", price: 800.0, total: 27200.0, notes: "" },
    { id: 14, projectId: 'villa-e109', category: "أرضيات ورخام وسيراميك", item_name: "أعمال توريد وتركيب سيراميك لزوم حوائط حمام الماستر بكامل الإرتفاع واللصق بمادة سيتوكس", quantity: 28.0, unit: "م2", price: 1200.0, total: 33600.0, notes: "سعر توريد السيراميك 800جنيه" },
    { id: 15, projectId: 'villa-e109', category: "أرضيات ورخام وسيراميك", item_name: "أعمال توريد وتركيب سيراميك لزوم حوائط حمام المعيشه والسطح بكامل الإرتفاع واللصق بمادة سيتوكس", quantity: 93.0, unit: "م2", price: 1200.0, total: 111600.0, notes: "سعر توريد السيراميك 800جنيه" },
    { id: 16, projectId: 'villa-e109', category: "أرضيات ورخام وسيراميك", item_name: "أعمال توريد وتركيب سيراميك لزوم حوائط حمام الضيوف بكامل الإرتفاع واللصق بمادة سيتوكس", quantity: 45.5, unit: "م2", price: 1200.0, total: 54600.0, notes: "سعر توريد السيراميك 800جنيه" },
    { id: 17, projectId: 'villa-e109', category: "أرضيات ورخام وسيراميك", item_name: "أعمال توريد وتركيب سيراميك لزوم أرضيات السطح الخارجي", quantity: 71.0, unit: "م2", price: 650.0, total: 46150.0, notes: "سعر توريد السيراميك 350جنيه" },
    { id: 18, projectId: 'villa-e109', category: "أرضيات ورخام وسيراميك", item_name: "أعمال توريد وتركيب سيراميك لزوم حوائط وأرضيات المطبخ بكامل الإرتفاع واللصق بمادة سيتوكس", quantity: 70.0, unit: "م2", price: 650.0, total: 45500.0, notes: "سعر توريد السيراميك 350جنيه" },
    { id: 19, projectId: 'villa-e109', category: "أرضيات ورخام وسيراميك", item_name: "سيراميك أرضيه للغرف", quantity: 85.0, unit: "م2", price: 500.0, total: 42500.0, notes: "سعر توريد السيراميك 250جنيه" },
    { id: 20, projectId: 'villa-e109', category: "أرضيات ورخام وسيراميك", item_name: "سيراميك أرضيه للتراس", quantity: 25.0, unit: "م2", price: 650.0, total: 16250.0, notes: "سعر توريد السيراميك 350جنيه" },
    { id: 21, projectId: 'villa-e109', category: "أبواب وأخشاب وشيش حصيره", item_name: "توريد وتركيب أبواب داخليه من الخشب لزوم الغرف عظم سويدى مكبوس MDF ملزوق أرو مدهون أستر باللون المطلوب", quantity: 7.0, unit: "عدد", price: 16500.0, total: 115500.0, notes: "شامل الإكسسوار والكالون والأكره من النوع التركى" },
    { id: 22, projectId: 'villa-e109', category: "أبواب وأخشاب وشيش حصيره", item_name: "توريد وتركيب شيش حصيره شركة النيل ومواتير آزا إيطالي", quantity: 22.5, unit: "م2", price: 5500.0, total: 123750.0, notes: "غرف النوم بدون الريسبشن" },
    { id: 23, projectId: 'villa-e109', category: "تكييف وغاز وأنظمة أمان", item_name: "أعمال تجهيز كهرباء ومواسير نحاس لأجهزة التكييف", quantity: 1.0, unit: "مقطوعيه", price: 80000.0, total: 80000.0, notes: "شامل الصاج والجريلات" },
    { id: 24, projectId: 'villa-e109', category: "تكييف وغاز وأنظمة أمان", item_name: "أعمال توريد وتركيب وحدات تكييف ماركة كاريير", quantity: 2.0, unit: "عدد", price: 170000.0, total: 340000.0, notes: "عدد 2 جهاز 5ح للريسبشن" },
    { id: 25, projectId: 'villa-e109', category: "تكييف وغاز وأنظمة أمان", item_name: "أعمال توريد وتركيب غاز مركزي", quantity: 1.0, unit: "بالمقطوعيه", price: 95000.0, total: 95000.0, notes: "" },
    { id: 26, projectId: 'villa-e109', category: "أعمال الحديقة وتعديلات إنشائية", item_name: "أعمال تكسير وتعديلات وإزالة ردش", quantity: 1.0, unit: "مقطوعيه", price: 15000.0, total: 15000.0, notes: "" },
    { id: 27, projectId: 'villa-e109', category: "أعمال الحديقة وتعديلات إنشائية", item_name: "أعمال مباني إضافيه", quantity: 1.0, unit: "مقطوعيه", price: 12000.0, total: 12000.0, notes: "" },
    { id: 28, projectId: 'villa-e109', category: "أعمال الحديقة وتعديلات إنشائية", item_name: "أعمال زراعة وتنسيق حدائق", quantity: 1.0, unit: "مقطوعيه", price: 75000.0, total: 75000.0, notes: "" }
  ];

  const defaultExpenses = [
    { id: 1, projectId: 'villa-e109', beneficiary: "م. أحمد سالم", category: "أعمال تصميم", unit: "مقطوعيه", qty: 1, rate: 17000, total: 17000, date: "2024-07-23", notes: "تصميم فيلا E109" },
    { id: 2, projectId: 'villa-e109', beneficiary: "تكييفات كونسيلد 4 ح", category: "تكييف وغاز وأنظمة أمان", unit: "عدد", qty: 2, rate: 110000, total: 220000, date: "2024-06-03", notes: "تجهيز التكييف" },
    { id: 3, projectId: 'villa-e109', beneficiary: "تكييفات اسبليت 2.25 ح", category: "تكييف وغاز وأنظمة أمان", unit: "عدد", qty: 5, rate: 36500, total: 182500, date: "2024-06-03", notes: "كاريير" },
    { id: 4, projectId: 'villa-e109', beneficiary: "توريدات طوب ورمل وأسمنت", category: "أعمال الحديقة وتعديلات إنشائية", unit: "فاتورة", qty: 1, rate: 8400, total: 8400, date: "2024-02-05", notes: "دفعة أولى لتأسيس المباني" },
    { id: 5, projectId: 'villa-e109', beneficiary: "توريدات أسمنت ورمل", category: "محارة ودهانات", unit: "فاتورة", qty: 1, rate: 8000, total: 8000, date: "2024-02-05", notes: "أعمال المحارة" },
    { id: 6, projectId: 'villa-e109', beneficiary: "بورسلين حمامات وسيراميك المطبخ", category: "أرضيات ورخام وسيراميك", unit: "فاتورة", qty: 1, rate: 96200, total: 96200, date: "2024-03-05", notes: "معرض السلاب" },
    { id: 7, projectId: 'villa-e109', beneficiary: "تركيب حنفية خارجيه", category: "أعمال صحية وعزل", unit: "مقطوعيه", qty: 1, rate: 500, total: 500, date: "2024-04-05", notes: "الحديقة الخلفية" },
    { id: 8, projectId: 'villa-e109', beneficiary: "إكراميات أمن", category: "إكراميات ونثريات", unit: "عدد", qty: 1, rate: 300, total: 300, date: "2024-04-05", notes: "أمن البوابة" },
    { id: 9, projectId: 'villa-e109', beneficiary: "فك ألوميتال", category: "أعمال الحديقة وتعديلات إنشائية", unit: "مقطوعيه", qty: 1, rate: 2800, total: 2800, date: "2024-07-05", notes: "تعديل المعيشة" },
    { id: 10, projectId: 'villa-e109', beneficiary: "مستخلص مصنعيات بياض محاره", category: "محارة ودهانات", unit: "مستخلص", qty: 1, rate: 36895, total: 36895, date: "2024-08-15", notes: "مستخلص نهائي للمحار" }
  ];

  const defaultInstallments = [
    { id: 1, projectId: 'villa-e109', amount: 200000, date: "2021-11-23", notes: "الدفعة الأولى المقبوضة" },
    { id: 2, projectId: 'villa-e109', amount: 160000, date: "2021-12-01", notes: "الدفعة الثانية المقبوضة" }
  ];

  // Seed default files list
  const defaultFiles = [
    { id: 1, projectId: 'villa-e109', name: 'Quotation_E109_Notes.txt', type: 'text/plain', content: 'ملاحظات هامة حول تشطيب فيلا E109:\n1. التأكيد على عزل الحمامات مرتين باستخدام سيكا 107.\n2. التنسيق مع مهندس الديكور بخصوص أماكن الليد وجريلات التكييف الكونسيلد.\n3. توريد رخام الريسبشن بريشيا داينو فرز أول نخب ممتاز.\nتم التحديث تلقائياً.', date: '2026-05-18' },
    { id: 2, projectId: 'villa-e109', name: 'Contract_Specifications.txt', type: 'text/plain', content: 'الشروط الفنية والضوابط العامة للمشروع:\n- مدة تنفيذ المشروع 9 أشهر من تاريخ استلام الدفعة الأولى.\n- جميع الكابلات من السويدي الأصلي المعتمد.\n- الضمان الممنوح على التأسيسات 10 سنوات.', date: '2026-05-19' }
  ];

  const [boqItems, setBoqItems] = useState(() => {
    const saved = localStorage.getItem('contractor_boq');
    return saved ? JSON.parse(saved) : defaultBoqItems;
  });

  const [expenses, setExpenses] = useState(() => {
    const saved = localStorage.getItem('contractor_expenses');
    return saved ? JSON.parse(saved) : defaultExpenses;
  });

  const [installments, setInstallments] = useState(() => {
    const saved = localStorage.getItem('contractor_installments');
    return saved ? JSON.parse(saved) : defaultInstallments;
  });

  const [projectFiles, setProjectFiles] = useState(() => {
    const saved = localStorage.getItem('contractor_files');
    return saved ? JSON.parse(saved) : defaultFiles;
  });

  // Save state helpers
  useEffect(() => {
    localStorage.setItem('contractor_projects', JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem('contractor_active_project_id', activeProjectId);
  }, [activeProjectId]);

  useEffect(() => {
    localStorage.setItem('contractor_boq', JSON.stringify(boqItems));
  }, [boqItems]);

  useEffect(() => {
    localStorage.setItem('contractor_expenses', JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem('contractor_installments', JSON.stringify(installments));
  }, [installments]);

  useEffect(() => {
    localStorage.setItem('contractor_files', JSON.stringify(projectFiles));
  }, [projectFiles]);

  // Current active project details
  const activeProject = useMemo(() => {
    return projects.find(p => p.id === activeProjectId) || projects[0];
  }, [projects, activeProjectId]);

  // Filtered arrays by current project
  const currentBoqItems = useMemo(() => boqItems.filter(i => i.projectId === activeProjectId), [boqItems, activeProjectId]);
  const currentExpenses = useMemo(() => expenses.filter(e => e.projectId === activeProjectId), [expenses, activeProjectId]);
  const currentInstallments = useMemo(() => installments.filter(inst => inst.projectId === activeProjectId), [installments, activeProjectId]);
  const currentFiles = useMemo(() => projectFiles.filter(f => f.projectId === activeProjectId), [projectFiles, activeProjectId]);

  // --- 2. ACTIVE VIEW NAVIGATION TAB STATE ---
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard | boq | expenses | client | files

  // Modals & form display states
  const [showAddProject, setShowAddProject] = useState(false);
  const [newProjectForm, setNewProjectForm] = useState({ name: '', clientName: '' });

  const [showAddBoq, setShowAddBoq] = useState(false);
  const [newBoq, setNewBoq] = useState({ category: 'أعمال صحية وعزل', item_name: '', quantity: 1, unit: 'م2', price: 0, notes: '' });
  
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [newExpense, setNewExpense] = useState({ beneficiary: '', category: 'أعمال صحية وعزل', unit: 'م2', qty: 1, rate: 0, date: new Date().toISOString().split('T')[0], notes: '' });

  const [showAddInstallment, setShowAddInstallment] = useState(false);
  const [newInstallment, setNewInstallment] = useState({ amount: 0, date: new Date().toISOString().split('T')[0], notes: '' });

  // Inline editing states (CRUD updates)
  const [editingItemType, setEditingItemType] = useState(null); // 'boq' | 'expense' | 'installment'
  const [editingItemId, setEditingItemId] = useState(null);
  const [editForm, setEditForm] = useState({});

  // File Manager States
  const [openedFile, setOpenedFile] = useState(null);
  const [fileEditorContent, setFileEditorContent] = useState('');
  const [autoSaveStatus, setAutoSaveStatus] = useState('idle'); // idle | saving | saved
  const fileInputRef = useRef(null);

  // Search & Filter
  const [expenseSearch, setExpenseSearch] = useState('');
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState('All');

  // Reversal toasts / alerts notification state
  const [notification, setNotification] = useState(null);

  // Categories list mapping
  const boqCategories = [
    "أعمال صحية وعزل",
    "أعمال كهرباء",
    "أسقف جبس بورد",
    "محارة ودهانات",
    "أرضيات ورخام وسيراميك",
    "أبواب وأخشاب وشيش حصيره",
    "تكييف وغاز وأنظمة أمان",
    "أعمال الحديقة وتعديلات إنشائية",
    "أعمال تصميم",
    "إكراميات ونثريات"
  ];

  // Dynamic system notifications helper (Toast)
  const triggerNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  // --- 3. DYNAMIC METRICS & CASHFLOW COMPUTATIONS ---
  const totals = useMemo(() => {
    const totalBOQ = currentBoqItems.reduce((acc, curr) => acc + (curr.quantity * curr.price), 0);
    const totalExpenses = currentExpenses.reduce((acc, curr) => acc + (curr.qty * curr.rate), 0);
    const totalCollected = currentInstallments.reduce((acc, curr) => acc + Number(curr.amount), 0);
    
    const estProfit = totalBOQ - totalExpenses;
    const remainingClient = totalBOQ - totalCollected;
    const progressPercent = totalBOQ > 0 ? (totalCollected / totalBOQ) * 100 : 0;
    const costPercent = totalBOQ > 0 ? (totalExpenses / totalBOQ) * 100 : 0;

    // Group expenses by category
    const expByCategory = currentExpenses.reduce((acc, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + curr.total;
      return acc;
    }, {});

    // Group BOQ by category
    const boqByCategory = currentBoqItems.reduce((acc, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + curr.total;
      return acc;
    }, {});

    return {
      totalBOQ,
      totalExpenses,
      totalCollected,
      estProfit,
      remainingClient,
      progressPercent,
      costPercent,
      expByCategory,
      boqByCategory
    };
  }, [currentBoqItems, currentExpenses, currentInstallments]);

  // --- 4. CRUD OPERATIONS (WITH AUTOMATIC REVERSAL IMPLEMENTED) ---

  // Projects CRUD
  const handleCreateProject = (e) => {
    e.preventDefault();
    if (!newProjectForm.name) return;
    const newId = `project-${Date.now()}`;
    const newProj = {
      id: newId,
      name: newProjectForm.name,
      clientName: newProjectForm.clientName || 'عميل عام'
    };
    setProjects([...projects, newProj]);
    setActiveProjectId(newId);
    setNewProjectForm({ name: '', clientName: '' });
    setShowAddProject(false);
    triggerNotification(`تم إنشاء مشروع جديد: ${newProj.name} 🏢`);
  };

  const handleDeleteProject = (projId) => {
    if (projects.length <= 1) {
      alert('لا يمكن حذف المشروع الأخير المتبقي في النظام.');
      return;
    }
    if (!window.confirm('🚨 تحذير هام: هل أنت متأكد من حذف هذا المشروع بالكامل؟ سيؤدي ذلك إلى إلغاء جميع البنود والمصاريف المرتبطة به وعكس كل التأثيرات المالية.')) return;
    
    // Financial Impact Reversal: Clean up all items linked to this project
    setBoqItems(prev => prev.filter(i => i.projectId !== projId));
    setExpenses(prev => prev.filter(e => e.projectId !== projId));
    setInstallments(prev => prev.filter(inst => inst.projectId !== projId));
    setProjectFiles(prev => prev.filter(f => f.projectId !== projId));
    
    const remaining = projects.filter(p => p.id !== projId);
    setProjects(remaining);
    setActiveProjectId(remaining[0].id);
    triggerNotification('💥 تم حذف المشروع وعكس جميع تأثيراته المالية والقيود المحاسبية بنجاح!', 'warning');
  };

  // BOQ Item CRUD
  const handleAddBoq = (e) => {
    e.preventDefault();
    if (!newBoq.item_name || newBoq.price <= 0) return;
    const total = Number(newBoq.quantity) * Number(newBoq.price);
    const newItem = {
      id: Date.now(),
      projectId: activeProjectId,
      ...newBoq,
      quantity: Number(newBoq.quantity),
      price: Number(newBoq.price),
      total
    };
    setBoqItems([...boqItems, newItem]);
    setNewBoq({ category: 'أعمال صحية وعزل', item_name: '', quantity: 1, unit: 'م2', price: 0, notes: '' });
    setShowAddBoq(false);
    triggerNotification('📝 تم إضافة بند جديد للمقايسة وتحديث الميزانية بنجاح!');
  };

  const handleStartEditBoq = (item) => {
    setEditingItemType('boq');
    setEditingItemId(item.id);
    setEditForm({ ...item });
  };

  const handleSaveEditBoq = (e) => {
    e.preventDefault();
    setBoqItems(prev => prev.map(item => {
      if (item.id === editingItemId) {
        const qty = Number(editForm.quantity);
        const price = Number(editForm.price);
        return {
          ...item,
          category: editForm.category,
          item_name: editForm.item_name,
          quantity: qty,
          price,
          notes: editForm.notes,
          total: qty * price
        };
      }
      return item;
    }));
    setEditingItemType(null);
    setEditingItemId(null);
    triggerNotification('✍️ تم تعديل بند المقايسة وإعادة احتساب الأرباح بنجاح!');
  };

  const handleDeleteBoq = (itemId) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا البند من المقايسة وعكس جميع الحسابات ذات الصلة؟')) return;
    
    // Financial Impact Reversal is automatic here as the totals state re-calculates dynamically based on the items list
    setBoqItems(prev => prev.filter(item => item.id !== itemId));
    triggerNotification('💥 تم حذف بند المقايسة وعكس تأثيره المالي بالكامل من كشف حساب العميل والربحية.', 'warning');
  };

  // Expenses CRUD
  const handleAddExpense = (e) => {
    e.preventDefault();
    if (!newExpense.beneficiary || newExpense.rate <= 0) return;
    const total = Number(newExpense.qty) * Number(newExpense.rate);
    const newItem = {
      id: Date.now(),
      projectId: activeProjectId,
      ...newExpense,
      qty: Number(newExpense.qty),
      rate: Number(newExpense.rate),
      total
    };
    setExpenses([...expenses, newItem]);
    setNewExpense({ beneficiary: '', category: 'أعمال صحية وعزل', unit: 'م2', qty: 1, rate: 0, date: new Date().toISOString().split('T')[0], notes: '' });
    setShowAddExpense(false);
    triggerNotification('💸 تم تسجيل مصروف جديد وتثبيت القيد المالي في النظام!');
  };

  const handleStartEditExpense = (item) => {
    setEditingItemType('expense');
    setEditingItemId(item.id);
    setEditForm({ ...item });
  };

  const handleSaveEditExpense = (e) => {
    e.preventDefault();
    setExpenses(prev => prev.map(item => {
      if (item.id === editingItemId) {
        const qty = Number(editForm.qty);
        const rate = Number(editForm.rate);
        return {
          ...item,
          beneficiary: editForm.beneficiary,
          category: editForm.category,
          unit: editForm.unit,
          qty,
          rate,
          notes: editForm.notes,
          date: editForm.date,
          total: qty * rate
        };
      }
      return item;
    }));
    setEditingItemType(null);
    setEditingItemId(null);
    triggerNotification('✍️ تم تعديل المصروف وإعادة توزيع التكاليف الفعليه.');
  };

  const handleDeleteExpense = (itemId) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المصروف؟ سيتم إرجاع المبلغ المصروف بالكامل للميزانية وعكس القيد المالي.')) return;
    
    // Financial Impact Reversal
    setExpenses(prev => prev.filter(item => item.id !== itemId));
    triggerNotification('💥 تم حذف المصروف وعكس الحركة المالية بنجاح! زاد صافي الربح بمقدار المبلغ المسترد.', 'warning');
  };

  // Client Installments CRUD
  const handleAddInstallment = (e) => {
    e.preventDefault();
    if (newInstallment.amount <= 0) return;
    const newItem = {
      id: Date.now(),
      projectId: activeProjectId,
      amount: Number(newInstallment.amount),
      date: newInstallment.date,
      notes: newInstallment.notes
    };
    setInstallments([...installments, newItem]);
    setNewInstallment({ amount: 0, date: new Date().toISOString().split('T')[0], notes: '' });
    setShowAddInstallment(false);
    triggerNotification('💳 تم قيد الدفعة المستلمة من العميل وتحديث رصيد المتبقي.');
  };

  const handleStartEditInstallment = (item) => {
    setEditingItemType('installment');
    setEditingItemId(item.id);
    setEditForm({ ...item });
  };

  const handleSaveEditInstallment = (e) => {
    e.preventDefault();
    setInstallments(prev => prev.map(item => {
      if (item.id === editingItemId) {
        return {
          ...item,
          amount: Number(editForm.amount),
          notes: editForm.notes,
          date: editForm.date
        };
      }
      return item;
    }));
    setEditingItemType(null);
    setEditingItemId(null);
    triggerNotification('✍️ تم تعديل الدفعة النقدية وإعادة تحديث شريط تحصيل العميل.');
  };

  const handleDeleteInstallment = (itemId) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الدفعة المقبوضة وعكس تأثيرها من حساب المقبوضات؟')) return;
    
    // Financial Impact Reversal
    setInstallments(prev => prev.filter(item => item.id !== itemId));
    triggerNotification('💥 تم حذف الدفعة المستلمة وعكس تأثيرها من حسابات المقبوضات فوراً.', 'warning');
  };

  // --- 5. FILE MANAGER & INTERACTIVE AUTO-SAVE ENGINE ---
  const handleFileUpload = (e) => {
    const filesList = e.target.files;
    if (!filesList || filesList.length === 0) return;
    
    const file = filesList[0];
    const reader = new FileReader();
    reader.onload = () => {
      const newFileObj = {
        id: Date.now(),
        projectId: activeProjectId,
        name: file.name,
        type: file.type || 'text/plain',
        content: reader.result, // base64 or raw string
        date: new Date().toISOString().split('T')[0]
      };
      setProjectFiles([...projectFiles, newFileObj]);
      triggerNotification(`📁 تم رفع الملف بنجاح: ${file.name}`);
    };
    
    if (file.type.startsWith('text') || file.name.endsWith('.txt') || file.name.endsWith('.json') || file.name.endsWith('.html') || file.name.endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsDataURL(file); // base64
    }
  };

  const handleOpenFile = (file) => {
    setOpenedFile(file);
    setFileEditorContent(file.content);
    setAutoSaveStatus('idle');
  };

  // Automatic Editor Save mechanism (Auto-save)
  const handleEditorChange = (e) => {
    const newContent = e.target.value;
    setFileEditorContent(newContent);
    setAutoSaveStatus('saving');

    // Update in memory & persisted list
    setProjectFiles(prev => prev.map(f => {
      if (f.id === openedFile.id) {
        return { ...f, content: newContent };
      }
      return f;
    }));

    // Mock network latency for visual auto-save indicator
    setTimeout(() => {
      setAutoSaveStatus('saved');
    }, 1000);
  };

  const handleDeleteFile = (fileId) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الملف نهائياً من المشروع؟')) return;
    setProjectFiles(prev => prev.filter(f => f.id !== fileId));
    if (openedFile && openedFile.id === fileId) {
      setOpenedFile(null);
    }
    triggerNotification('🗑️ تم حذف الملف بنجاح.');
  };

  // --- 6. PRINTING ENGINE ---
  const handlePrint = () => {
    window.print();
  };

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    return currentExpenses.filter(item => {
      const matchSearch = item.beneficiary.toLowerCase().includes(expenseSearch.toLowerCase()) || 
                          (item.notes && item.notes.toLowerCase().includes(expenseSearch.toLowerCase()));
      const matchCat = expenseCategoryFilter === 'All' || item.category === expenseCategoryFilter;
      return matchSearch && matchCat;
    });
  }, [currentExpenses, expenseSearch, expenseCategoryFilter]);

  const categoryGradients = {
    "أعمال صحية وعزل": "from-cyan-500/20 to-blue-500/10 border-cyan-500/30 text-cyan-400 bg-cyan-500/5",
    "أعمال كهرباء": "from-amber-500/20 to-orange-500/10 border-amber-500/30 text-amber-400 bg-amber-500/5",
    "أسقف جبس بورد": "from-purple-500/20 to-indigo-500/10 border-purple-500/30 text-purple-400 bg-purple-500/5",
    "محارة ودهانات": "from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-400 bg-emerald-500/5",
    "أرضيات ورخام وسيراميك": "from-pink-500/20 to-rose-500/10 border-pink-500/30 text-pink-400 bg-pink-500/5",
    "أبواب وأخشاب وشيش حصيره": "from-yellow-500/20 to-amber-700/10 border-yellow-500/30 text-yellow-400 bg-yellow-500/5",
    "تكييف وغاز وأنظمة أمان": "from-red-500/20 to-orange-600/10 border-red-500/30 text-red-400 bg-red-500/5",
    "أعمال الحديقة وتعديلات إنشائية": "from-lime-500/20 to-emerald-600/10 border-lime-500/30 text-emerald-400 bg-lime-500/5",
    "أعمال تصميم": "from-blue-500/20 to-indigo-600/10 border-blue-500/30 text-indigo-400 bg-blue-500/5",
    "إكراميات ونثريات": "from-slate-500/20 to-slate-600/10 border-slate-500/30 text-slate-400 bg-slate-500/5"
  };

  const activeGrad = (cat) => categoryGradients[cat] || "from-slate-500/20 to-slate-600/10 border-slate-500/30 text-slate-400 bg-slate-500/5";

  return (
    <div className="bg-[#080b11] text-slate-100 min-h-screen p-4 sm:p-8 selection:bg-cyan-500 selection:text-slate-950 font-sans print:bg-white print:text-black" dir="rtl">
      
      {/* Printable page layout adjustments */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body { background: white !important; color: black !important; }
          .no-print { display: none !important; }
          .print-full-width { width: 100% !important; max-width: 100% !important; padding: 0 !important; }
          table { width: 100% !important; border-collapse: collapse !important; }
          th, td { border: 1px solid #ddd !important; padding: 8px !important; color: black !important; }
        }
      `}} />

      {/* --- TOAST NOTIFICATIONS --- */}
      {notification && (
        <div className="fixed top-6 left-6 z-50 animate-bounce">
          <div className={`px-6 py-4 rounded-2xl shadow-2xl backdrop-blur-xl border flex items-center gap-3 font-bold text-xs ${
            notification.type === 'warning' 
              ? 'bg-rose-950/90 border-rose-500/30 text-rose-300' 
              : 'bg-emerald-950/90 border-emerald-500/30 text-emerald-300'
          }`}>
            <span>{notification.type === 'warning' ? '🚨' : '✨'}</span>
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700 print-full-width">

        {/* --- DYNAMIC HEADER --- */}
        <div className="relative rounded-3xl p-8 overflow-hidden border border-white/5 bg-slate-900/40 backdrop-blur-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-2xl no-print">
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl opacity-60 translate-x-20 -translate-y-20"></div>
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl opacity-40 -translate-x-20 translate-y-20"></div>

          {/* Project selection & Add project */}
          <div className="flex flex-col md:flex-row items-start md:items-center gap-5 relative z-10 w-full md:w-auto">
            <div className="w-14 h-14 bg-gradient-to-tr from-cyan-500 to-indigo-600 text-white rounded-2xl flex items-center justify-center text-3xl shadow-lg shadow-cyan-500/20 transform rotate-2 hover:rotate-0 transition-transform">💎</div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={activeProjectId}
                  onChange={e => setActiveProjectId(e.target.value)}
                  className="bg-slate-950 border border-white/10 rounded-xl px-4 py-2 text-sm font-black text-transparent bg-clip-text bg-gradient-to-l from-white to-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id} className="text-slate-900 font-bold">{p.name}</option>
                  ))}
                </select>
                
                <button 
                  onClick={() => setShowAddProject(!showAddProject)}
                  className="bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 text-cyan-400 text-[10px] font-black px-3 py-1.5 rounded-xl transition-all"
                >
                  {showAddProject ? 'إغلاق ✕' : '+ مشروع جديد'}
                </button>
                
                <button 
                  onClick={() => handleDeleteProject(activeProjectId)}
                  className="bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 text-[10px] font-black px-3 py-1.5 rounded-xl transition-all"
                >
                  حذف المشروع 🗑️
                </button>
              </div>
              <p className="text-slate-400 font-bold text-xs mt-1">العميل الحالي للمشروع: <span className="text-white font-black">{activeProject.clientName}</span></p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="bg-slate-950/60 p-1.5 rounded-2xl border border-white/5 flex gap-1 relative z-10 w-full md:w-auto overflow-x-auto scrollbar-none">
            {[
              { id: 'dashboard', label: '📊 لوحة القيادة', icon: '📊' },
              { id: 'boq', label: '📝 المقايسة والبنود', icon: '📝' },
              { id: 'expenses', label: '💸 المصروفات الفعلية', icon: '💸' },
              { id: 'client', label: '💳 دفعات العميل', icon: '💳' },
              { id: 'files', label: '📁 ملفات ومستندات', icon: '📁' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl font-black text-xs transition-all duration-300 whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-l from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Modal / Form to create new project */}
        {showAddProject && (
          <form onSubmit={handleCreateProject} className="bg-slate-900/70 border border-white/5 p-6 rounded-3xl space-y-4 animate-in slide-in-from-top duration-300 no-print">
            <h4 className="text-sm font-black text-cyan-400">تأسيس مشروع إنشائي جديد</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-slate-400 font-bold">اسم المشروع / المعرف</label>
                <input 
                  type="text" 
                  placeholder="مثال: فيلا E111 - زايد الجديد" 
                  value={newProjectForm.name}
                  onChange={e => setNewProjectForm({...newProjectForm, name: e.target.value})}
                  className="bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-slate-400 font-bold">اسم العميل المتعاقد</label>
                <input 
                  type="text" 
                  placeholder="مثال: الأستاذ محمد عبد الرحمن" 
                  value={newProjectForm.clientName}
                  onChange={e => setNewProjectForm({...newProjectForm, clientName: e.target.value})}
                  className="bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowAddProject(false)} className="px-5 py-2 bg-slate-950 border border-white/5 rounded-xl text-xs text-slate-400">إلغاء</button>
              <button type="submit" className="px-6 py-2 bg-cyan-500 rounded-xl text-xs font-black text-white">تأسيس المشروع الآن 🏢</button>
            </div>
          </form>
        )}

        {/* --- PRINT HEADER (VISIBLE ONLY IN PRINTING) --- */}
        <div className="hidden print:block space-y-2 pb-6 border-b border-black">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">{activeProject.name}</h1>
            <span className="text-sm">تاريخ التقرير: {new Date().toLocaleDateString('ar-EG')}</span>
          </div>
          <p className="text-sm">اسم العميل: {activeProject.clientName}</p>
        </div>

        {/* --- CORE KPI COUNTERS --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          <div className="relative overflow-hidden bg-slate-900/40 border border-white/5 p-6 rounded-3xl backdrop-blur-xl shadow-lg group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition-all"></div>
            <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest block mb-1">قيمة العقد المعتمد (المقايسة)</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black font-mono tracking-tighter text-white">{totals.totalBOQ.toLocaleString()}</span>
              <span className="text-xs text-slate-500 font-bold">جنيه</span>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-pulse"></span>
              <span className="text-[10px] font-bold text-slate-400">عدد بنود المقايسة: {currentBoqItems.length}</span>
            </div>
          </div>

          <div className="relative overflow-hidden bg-slate-900/40 border border-white/5 p-6 rounded-3xl backdrop-blur-xl shadow-lg group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/10 rounded-full blur-2xl group-hover:bg-red-500/20 transition-all"></div>
            <span className="text-[10px] font-black text-red-400 uppercase tracking-widest block mb-1">إجمالي المصروفات الفعلية</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black font-mono tracking-tighter text-white">{totals.totalExpenses.toLocaleString()}</span>
              <span className="text-xs text-slate-500 font-bold">جنيه</span>
            </div>
            <div className="mt-3">
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="h-full bg-red-500 rounded-full" style={{ width: `${Math.min(totals.costPercent, 100)}%` }}></div>
              </div>
              <span className="text-[9px] text-slate-400 font-bold mt-1.5 block">معدل الصرف الفعلي: {totals.costPercent.toFixed(1)}%</span>
            </div>
          </div>

          <div className="relative overflow-hidden bg-slate-900/40 border border-white/5 p-6 rounded-3xl backdrop-blur-xl shadow-lg group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all"></div>
            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block mb-1">صافي هامش الربح المتوقع</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black font-mono tracking-tighter text-emerald-400">{totals.estProfit.toLocaleString()}</span>
              <span className="text-xs text-slate-500 font-bold">جنيه</span>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-black text-emerald-400">ممتاز</span>
              <span className="text-[10px] text-slate-400 font-bold">نسبة الربحية {( (totals.estProfit / (totals.totalBOQ || 1)) * 100 ).toFixed(1)}%</span>
            </div>
          </div>

          <div className="relative overflow-hidden bg-slate-900/40 border border-white/5 p-6 rounded-3xl backdrop-blur-xl shadow-lg group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all"></div>
            <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest block mb-1">المحصل من العميل</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black font-mono tracking-tighter text-white">{totals.totalCollected.toLocaleString()}</span>
              <span className="text-xs text-slate-500 font-bold">ج.م محصل</span>
            </div>
            <div className="mt-3">
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.min(totals.progressPercent, 100)}%` }}></div>
              </div>
              <span className="text-[9px] text-slate-400 font-bold mt-1.5 block">المتبقي: <span className="font-mono font-black text-amber-400">{totals.remainingClient.toLocaleString()}</span> جنيه ({totals.progressPercent.toFixed(0)}% محصل)</span>
            </div>
          </div>

        </div>

        {/* --- MAIN INTERACTIVE SECTIONS --- */}

        {/* 1. DASHBOARD VIEW */}
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-bottom duration-500">
            
            {/* Category breakdown visual bars */}
            <div className="lg:col-span-2 bg-slate-900/40 border border-white/5 p-8 rounded-3xl shadow-lg space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-black text-white flex items-center gap-3">
                  <span>📊</span> مقارنة الموازنة والمنصرف الفعلي لكل بند (Budget vs Actual)
                </h3>
                <button onClick={handlePrint} className="bg-slate-950 border border-white/10 hover:bg-slate-900 text-slate-300 px-4 py-2 rounded-xl text-xs font-black no-print flex items-center gap-2">
                  <span>🖨️</span> طباعة التقرير
                </button>
              </div>
              <p className="text-xs text-slate-400 no-print">تتبع حي للمصروفات مقارنة بالمبلغ المدرج في المقايسة المعتمدة للعميل للتحقق من ربحية البنود</p>
              
              <div className="space-y-5 pt-3">
                {boqCategories.map(cat => {
                  const boqVal = totals.boqByCategory[cat] || 0;
                  const expVal = totals.expByCategory[cat] || 0;
                  const usagePercent = boqVal > 0 ? (expVal / boqVal) * 100 : 0;
                  
                  // Skip displaying category if both values are 0
                  if (boqVal === 0 && expVal === 0) return null;

                  return (
                    <div key={cat} className="space-y-2 group">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-200 group-hover:text-cyan-400 transition-colors">{cat}</span>
                        <div className="flex gap-4 font-mono font-black">
                          <span className="text-red-400">المصروف: {expVal.toLocaleString()}</span>
                          <span className="text-slate-400">الموازنة: {boqVal.toLocaleString()}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] ${
                            usagePercent > 100 ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 
                            usagePercent > 70 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}>
                            {usagePercent > 0 ? `${usagePercent.toFixed(0)}%` : 'بدون صرف'}
                          </span>
                        </div>
                      </div>
                      
                      {/* Interactive Bar */}
                      <div className="w-full bg-slate-950/80 h-3 rounded-full overflow-hidden p-0.5 border border-white/5 relative">
                        <div 
                          className={`h-full rounded-full transition-all duration-1000 ${
                            usagePercent > 100 ? 'bg-gradient-to-l from-red-600 to-rose-400' :
                            usagePercent > 70 ? 'bg-gradient-to-l from-amber-600 to-orange-400' : 'bg-gradient-to-l from-emerald-600 to-teal-400'
                          }`}
                          style={{ width: `${Math.min(usagePercent || 1, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Smart analytics column */}
            <div className="space-y-6 no-print">
              
              {/* Financial Health Summary */}
              <div className="bg-slate-900/40 border border-white/5 p-8 rounded-3xl shadow-lg relative overflow-hidden">
                <div className="absolute top-0 left-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl"></div>
                <h3 className="text-lg font-black text-white mb-4 flex items-center gap-3">
                  <span>💡</span> توصيات الموقف المالي
                </h3>
                
                <div className="space-y-4 text-xs font-bold text-slate-300">
                  <div className="p-4 rounded-2xl bg-slate-950/50 border border-white/5 flex gap-3">
                    <span className="text-xl">💰</span>
                    <div>
                      <h4 className="text-white font-black">هامش الربح التشغيلي</h4>
                      <p className="text-slate-400 mt-1 leading-relaxed">المشروع يحقق كفاءة عالية بفضل ضبط أسعار الخامات ومصنعيات مقاولي الباطن.</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950/50 border border-white/5 flex gap-3">
                    <span className="text-xl">🚨</span>
                    <div>
                      <h4 className="text-white font-black">السيولة النقدية</h4>
                      <p className="text-slate-400 mt-1 leading-relaxed">إجمالي المحصل {totals.totalCollected.toLocaleString()} ج.م والمصروف الفعلي {totals.totalExpenses.toLocaleString()} ج.م. السيولة في وضع آمن بنسبة تغطية مريحة.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Transaction Log preview */}
              <div className="bg-slate-900/40 border border-white/5 p-6 rounded-3xl shadow-lg space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-black text-white">آخر الحركات المالية للمشروع</h3>
                  <button onClick={() => setActiveTab('expenses')} className="text-cyan-400 hover:text-cyan-300 text-xs font-bold">عرض الكل ←</button>
                </div>
                <div className="space-y-3">
                  {currentExpenses.slice(-4).reverse().map(item => (
                    <div key={item.id} className="p-3 bg-slate-950/40 border border-white/5 rounded-xl flex justify-between items-center">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-white">{item.beneficiary}</span>
                        <span className="text-[10px] text-slate-500 font-bold mt-0.5">{item.date}</span>
                      </div>
                      <span className="text-xs font-mono font-black text-red-400">-{item.total.toLocaleString()} جنيه</span>
                    </div>
                  ))}
                  {currentExpenses.length === 0 && (
                    <p className="text-xs text-slate-500 py-4 text-center">لا توجد حركات مالية مسجلة بعد.</p>
                  )}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* 2. BOQ VIEW */}
        {activeTab === 'boq' && (
          <div className="space-y-6 animate-in slide-in-from-bottom duration-500">
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/40 border border-white/5 p-6 rounded-3xl shadow-lg no-print">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-3">
                  <span>📝</span> مقايسة البنود والكميات التقديرية للفيلا
                </h3>
                <p className="text-xs text-slate-400 mt-1">تعديل الأسعار والكميات والموافقة عليها وتصدير التقارير في ثوانٍ</p>
              </div>
              <div className="flex gap-2">
                <button onClick={handlePrint} className="bg-slate-950 border border-white/10 hover:bg-slate-900 text-slate-300 px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2">
                  <span>🖨️</span> طباعة المقايسة
                </button>
                <button 
                  onClick={() => {
                    setEditingItemId(null);
                    setEditingItemType(null);
                    setShowAddBoq(!showAddBoq);
                  }}
                  className="px-5 py-2.5 bg-gradient-to-l from-cyan-500 to-blue-600 text-white rounded-xl text-xs font-black shadow-lg shadow-cyan-500/20 active:scale-95 transition-transform"
                >
                  {showAddBoq ? 'إغلاق النموذج' : '+ إضافة بند أعمال جديد'}
                </button>
              </div>
            </div>

            {/* Add / Edit BOQ Form */}
            {(showAddBoq || (editingItemType === 'boq' && editingItemId)) && (
              <form onSubmit={editingItemId ? handleSaveEditBoq : handleAddBoq} className="bg-slate-900/70 border border-white/5 p-6 rounded-3xl space-y-4 animate-in slide-in-from-top duration-300 no-print">
                <h4 className="text-sm font-black text-cyan-400">{editingItemId ? '✍️ تعديل بند بالمقايسة' : 'إدخال بند جديد بالمقايسة'}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-slate-400 font-bold">القسم الأساسي</label>
                    <select 
                      value={editingItemId ? editForm.category : newBoq.category} 
                      onChange={e => editingItemId ? setEditForm({...editForm, category: e.target.value}) : setNewBoq({...newBoq, category: e.target.value})}
                      className="bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                    >
                      {boqCategories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  
                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <label className="text-[10px] text-slate-400 font-bold">وصف وتوصيف البند الهندسي</label>
                    <input 
                      type="text" 
                      placeholder="مثال: توريد وتركيب رخام بريشيا داينو..." 
                      value={editingItemId ? editForm.item_name : newBoq.item_name}
                      onChange={e => editingItemId ? setEditForm({...editForm, item_name: e.target.value}) : setNewBoq({...newBoq, item_name: e.target.value})}
                      className="bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-slate-400 font-bold">الوحدة</label>
                    <input 
                      type="text" 
                      placeholder="مثال: م2، عدد، مقطوعية" 
                      value={editingItemId ? editForm.unit : newBoq.unit}
                      onChange={e => editingItemId ? setEditForm({...editForm, unit: e.target.value}) : setNewBoq({...newBoq, unit: e.target.value})}
                      className="bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-slate-400 font-bold">الكمية التقديرية</label>
                    <input 
                      type="number" 
                      step="any"
                      placeholder="1" 
                      value={editingItemId ? editForm.quantity : newBoq.quantity}
                      onChange={e => editingItemId ? setEditForm({...editForm, quantity: e.target.value}) : setNewBoq({...newBoq, quantity: e.target.value})}
                      className="bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-slate-400 font-bold">سعر الفئة (جنيه)</label>
                    <input 
                      type="number" 
                      placeholder="0.00" 
                      value={editingItemId ? editForm.price : newBoq.price}
                      onChange={e => editingItemId ? setEditForm({...editForm, price: e.target.value}) : setNewBoq({...newBoq, price: e.target.value})}
                      className="bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <label className="text-[10px] text-slate-400 font-bold">ملاحظات البند</label>
                    <input 
                      type="text" 
                      placeholder="أي ملاحظات فنية أو شروط تشطيب..." 
                      value={editingItemId ? editForm.notes : newBoq.notes}
                      onChange={e => editingItemId ? setEditForm({...editForm, notes: e.target.value}) : setNewBoq({...newBoq, notes: e.target.value})}
                      className="bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => { setShowAddBoq(false); setEditingItemId(null); }} className="px-5 py-2 bg-slate-950 border border-white/5 rounded-xl text-xs text-slate-400">إلغاء</button>
                  <button type="submit" className="px-6 py-2 bg-cyan-500 rounded-xl text-xs font-black text-white">
                    {editingItemId ? 'حفظ التعديلات 💾' : 'إضافة البند الآن 🚀'}
                  </button>
                </div>
              </form>
            )}

            {/* Interactive BOQ List */}
            <div className="bg-slate-900/40 border border-white/5 rounded-3xl overflow-hidden shadow-lg print:border-black print:bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-right whitespace-nowrap">
                  <thead className="bg-slate-950/60 border-b border-white/5 print:bg-slate-100 print:text-black">
                    <tr className="text-slate-400 text-[10px] uppercase tracking-widest font-black print:text-black">
                      <th className="px-6 py-4">مسلسل</th>
                      <th className="px-6 py-4">القسم والبيان</th>
                      <th className="px-6 py-4">وصف البند الهندسي</th>
                      <th className="px-6 py-4 text-center">الكمية</th>
                      <th className="px-6 py-4 text-center">الوحدة</th>
                      <th className="px-6 py-4 text-center">الفئة</th>
                      <th className="px-6 py-4 text-center">الإجمالي</th>
                      <th className="px-6 py-4 text-left no-print">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 print:divide-black">
                    {currentBoqItems.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-white/5 transition-all group print:bg-transparent">
                        <td className="px-6 py-5 font-mono text-xs text-slate-500 print:text-black">{idx + 1}</td>
                        <td className="px-6 py-5">
                          <span className={`px-3 py-1 rounded-full text-[9px] font-black border ${activeGrad(item.category)}`}>
                            {item.category}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex flex-col max-w-lg">
                            <span className="text-xs font-bold text-slate-200 group-hover:text-white transition-colors leading-relaxed whitespace-normal print:text-black">{item.item_name}</span>
                            {item.notes && <span className="text-[10px] text-slate-400 mt-1 italic whitespace-normal font-medium bg-slate-950/40 p-2 rounded-lg border border-white/5 print:text-slate-700 print:border-black">{item.notes}</span>}
                          </div>
                        </td>
                        <td className="px-6 py-5 text-center font-mono font-black text-slate-300 print:text-black">{item.quantity}</td>
                        <td className="px-6 py-5 text-center text-xs text-slate-400 print:text-black">{item.unit || '-'}</td>
                        <td className="px-6 py-5 text-center font-mono font-black text-cyan-400 print:text-black">{item.price.toLocaleString()} ج.م</td>
                        <td className="px-6 py-5 text-center font-mono font-black text-white text-sm print:text-black">{(item.quantity * item.price).toLocaleString()} ج.م</td>
                        <td className="px-6 py-5 text-left no-print">
                          <div className="flex gap-2 justify-end">
                            <button 
                              onClick={() => handleStartEditBoq(item)}
                              className="px-2.5 py-1.5 bg-slate-950 border border-white/10 hover:bg-cyan-500 hover:text-slate-950 rounded-lg text-[9px] font-black transition-all"
                            >
                              تعديل ✏️
                            </button>
                            <button 
                              onClick={() => handleDeleteBoq(item.id)}
                              className="px-2.5 py-1.5 bg-rose-950/30 border border-rose-500/20 hover:bg-rose-600 hover:text-white text-rose-400 rounded-lg text-[9px] font-black transition-all"
                            >
                              حذف 🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {currentBoqItems.length === 0 && (
                      <tr>
                        <td colSpan="8" className="p-12 text-center text-xs text-slate-500 font-bold">لا توجد بنود مقايسة مدخلة للمشروع حالياً.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* 3. EXPENSES VIEW */}
        {activeTab === 'expenses' && (
          <div className="space-y-6 animate-in slide-in-from-bottom duration-500">
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/40 border border-white/5 p-6 rounded-3xl shadow-lg no-print">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-3">
                  <span>💸</span> دفتر وقيد المصروفات الفعلية للمشروع
                </h3>
                <p className="text-xs text-slate-400 mt-1">تتبع المشتريات ومستخلصات مقاولي الباطن والعمالة والتوريدات</p>
              </div>
              <div className="flex gap-2">
                <button onClick={handlePrint} className="bg-slate-950 border border-white/10 hover:bg-slate-900 text-slate-300 px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2">
                  <span>🖨️</span> طباعة المصروفات
                </button>
                <button 
                  onClick={() => {
                    setEditingItemId(null);
                    setEditingItemType(null);
                    setShowAddExpense(!showAddExpense);
                  }}
                  className="px-5 py-2.5 bg-gradient-to-l from-cyan-500 to-blue-600 text-white rounded-xl text-xs font-black shadow-lg shadow-cyan-500/20 active:scale-95 transition-transform"
                >
                  {showAddExpense ? 'إغلاق النموذج' : '+ تسجيل مصروف جديد'}
                </button>
              </div>
            </div>

            {/* Add / Edit Expense Form */}
            {(showAddExpense || (editingItemType === 'expense' && editingItemId)) && (
              <form onSubmit={editingItemId ? handleSaveEditExpense : handleAddExpense} className="bg-slate-900/70 border border-white/5 p-6 rounded-3xl space-y-4 animate-in slide-in-from-top duration-300 no-print">
                <h4 className="text-sm font-black text-cyan-400">{editingItemId ? '✍️ تعديل مصروف مسجل' : 'تسجيل حركة صرف جديدة للمشروع'}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-slate-400 font-bold">الجهة المستفيدة / البائع</label>
                    <input 
                      type="text" 
                      placeholder="مثال: المعلم أحمد، شركة السلاب..." 
                      value={editingItemId ? editForm.beneficiary : newExpense.beneficiary}
                      onChange={e => editingItemId ? setEditForm({...editForm, beneficiary: e.target.value}) : setNewExpense({...newExpense, beneficiary: e.target.value})}
                      className="bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-slate-400 font-bold">التصنيف الهندسي للمصروف</label>
                    <select 
                      value={editingItemId ? editForm.category : newExpense.category} 
                      onChange={e => editingItemId ? setEditForm({...editForm, category: e.target.value}) : setNewExpense({...newExpense, category: e.target.value})}
                      className="bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                    >
                      {boqCategories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-slate-400 font-bold">التاريخ</label>
                    <input 
                      type="date" 
                      value={editingItemId ? editForm.date : newExpense.date}
                      onChange={e => editingItemId ? setEditForm({...editForm, date: e.target.value}) : setNewExpense({...newExpense, date: e.target.value})}
                      className="bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-slate-400 font-bold">الوحدة</label>
                    <input 
                      type="text" 
                      placeholder="مثال: عدد، مقطوعية، فاتورة" 
                      value={editingItemId ? editForm.unit : newExpense.unit}
                      onChange={e => editingItemId ? setEditForm({...editForm, unit: e.target.value}) : setNewExpense({...newExpense, unit: e.target.value})}
                      className="bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-slate-400 font-bold">الكمية / العدد</label>
                    <input 
                      type="number" 
                      value={editingItemId ? editForm.qty : newExpense.qty}
                      onChange={e => editingItemId ? setEditForm({...editForm, qty: e.target.value}) : setNewExpense({...newExpense, qty: e.target.value})}
                      className="bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-slate-400 font-bold">سعر الوحدة / الفئة</label>
                    <input 
                      type="number" 
                      placeholder="0.00" 
                      value={editingItemId ? editForm.rate : newExpense.rate}
                      onChange={e => editingItemId ? setEditForm({...editForm, rate: e.target.value}) : setNewExpense({...newExpense, rate: e.target.value})}
                      className="bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <label className="text-[10px] text-slate-400 font-bold">البيان والتفاصيل</label>
                    <input 
                      type="text" 
                      placeholder="أي ملاحظات أو أرقام فواتير..." 
                      value={editingItemId ? editForm.notes : newExpense.notes}
                      onChange={e => editingItemId ? setEditForm({...editForm, notes: e.target.value}) : setNewExpense({...newExpense, notes: e.target.value})}
                      className="bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => { setShowAddExpense(false); setEditingItemId(null); }} className="px-5 py-2 bg-slate-950 border border-white/5 rounded-xl text-xs text-slate-400">إلغاء</button>
                  <button type="submit" className="px-6 py-2 bg-cyan-500 rounded-xl text-xs font-black text-white">
                    {editingItemId ? 'حفظ التعديلات 💾' : 'تسجيل المصروف الآن 💸'}
                  </button>
                </div>
              </form>
            )}

            {/* Search & Filter Controls */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-900/20 border border-white/5 p-4 rounded-2xl no-print">
              <input 
                type="text" 
                placeholder="🔍 ابحث عن مصروف بالجهة أو الملاحظات..."
                value={expenseSearch}
                onChange={e => setExpenseSearch(e.target.value)}
                className="bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 w-full"
              />

              <select
                value={expenseCategoryFilter}
                onChange={e => setExpenseCategoryFilter(e.target.value)}
                className="bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 w-full"
              >
                <option value="All">كل الفئات والتصنيفات</option>
                {boqCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              
              <div className="text-xs font-bold flex items-center justify-end text-slate-400">
                إجمالي المصاريف المصفاة: <span className="font-mono text-cyan-400 font-black text-sm mr-2">{filteredExpenses.reduce((acc, curr) => acc + curr.total, 0).toLocaleString()} جنيه</span>
              </div>
            </div>

            {/* Expenses List */}
            <div className="bg-slate-900/40 border border-white/5 rounded-3xl overflow-hidden shadow-lg print:border-black">
              <div className="overflow-x-auto">
                <table className="w-full text-right whitespace-nowrap">
                  <thead className="bg-slate-950/60 border-b border-white/5 print:bg-slate-100 print:text-black">
                    <tr className="text-slate-400 text-[10px] uppercase tracking-widest font-black print:text-black">
                      <th className="px-6 py-4">تاريخ الصرف</th>
                      <th className="px-6 py-4">المستفيد / البيان</th>
                      <th className="px-6 py-4">التصنيف الهندسي</th>
                      <th className="px-6 py-4 text-center">الكمية</th>
                      <th className="px-6 py-4 text-center">الفئة</th>
                      <th className="px-6 py-4 text-center">المبلغ الإجمالي</th>
                      <th className="px-6 py-4 text-left no-print">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 print:divide-black">
                    {filteredExpenses.map(item => (
                      <tr key={item.id} className="hover:bg-white/5 transition-all group">
                        <td className="px-6 py-5 font-mono text-xs text-slate-400 print:text-black">{item.date}</td>
                        <td className="px-6 py-5">
                          <div className="flex flex-col">
                            <span className="text-xs font-black text-white group-hover:text-cyan-400 transition-colors print:text-black">{item.beneficiary}</span>
                            {item.notes && <span className="text-[10px] text-slate-500 font-bold mt-0.5 print:text-slate-700">{item.notes}</span>}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black border ${activeGrad(item.category)}`}>
                            {item.category}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-center font-mono font-bold text-slate-400 print:text-black">{item.qty} {item.unit || 'فاتورة'}</td>
                        <td className="px-6 py-5 text-center font-mono font-bold text-slate-400 print:text-black">{item.rate.toLocaleString()}</td>
                        <td className="px-6 py-5 text-center font-mono font-black text-red-400 text-sm print:text-black">-{item.total.toLocaleString()} جنيه</td>
                        <td className="px-6 py-5 text-left no-print">
                          <div className="flex gap-2 justify-end">
                            <button 
                              onClick={() => handleStartEditExpense(item)}
                              className="px-2.5 py-1.5 bg-slate-950 border border-white/10 hover:bg-cyan-500 hover:text-slate-950 rounded-lg text-[9px] font-black transition-all"
                            >
                              تعديل ✏️
                            </button>
                            <button 
                              onClick={() => handleDeleteExpense(item.id)}
                              className="px-2.5 py-1.5 bg-rose-950/30 border border-rose-500/20 hover:bg-rose-600 hover:text-white text-rose-400 rounded-lg text-[9px] font-black transition-all"
                            >
                              حذف 🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredExpenses.length === 0 && (
                      <tr>
                        <td colSpan="7" className="p-12 text-center text-xs text-slate-500 font-bold">لا توجد مصروفات مسجلة مطابقة للبحث في هذا المشروع.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* 4. CLIENT PAYMENTS VIEW */}
        {activeTab === 'client' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-bottom duration-500">
            
            {/* Installments timeline history */}
            <div className="lg:col-span-2 bg-slate-900/40 border border-white/5 p-8 rounded-3xl shadow-lg space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-3">
                    <span>💳</span> سجل دفعات وأقساط العميل المقبوضة
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">تتبع الدفعات المستلمة لتغطية تكاليف الخامات وأجور التشطيبات بالفيلا</p>
                </div>
                <button onClick={handlePrint} className="bg-slate-950 border border-white/10 hover:bg-slate-900 text-slate-300 px-4 py-2.5 rounded-xl text-xs font-black no-print flex items-center gap-2">
                  <span>🖨️</span> طباعة كشف التحصيل
                </button>
              </div>

              {editingItemType === 'installment' && editingItemId && (
                <form onSubmit={handleSaveEditInstallment} className="bg-slate-950 border border-cyan-500/20 p-5 rounded-2xl space-y-4 no-print">
                  <h4 className="text-xs font-black text-cyan-400">تعديل الدفعة النقدية المسجلة</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] text-slate-400">المبلغ</label>
                      <input 
                        type="number" 
                        value={editForm.amount}
                        onChange={e => setEditForm({...editForm, amount: e.target.value})}
                        className="bg-slate-900 border border-white/10 rounded-lg p-2 text-xs text-white"
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] text-slate-400">التاريخ</label>
                      <input 
                        type="date" 
                        value={editForm.date}
                        onChange={e => setEditForm({...editForm, date: e.target.value})}
                        className="bg-slate-900 border border-white/10 rounded-lg p-2 text-xs text-white"
                        required
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] text-slate-400">البيان</label>
                      <input 
                        type="text" 
                        value={editForm.notes}
                        onChange={e => setEditForm({...editForm, notes: e.target.value})}
                        className="bg-slate-900 border border-white/10 rounded-lg p-2 text-xs text-white"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 text-xs font-bold">
                    <button type="button" onClick={() => setEditingItemId(null)} className="px-3 py-1.5 bg-slate-900 text-slate-400 rounded-lg">إلغاء</button>
                    <button type="submit" className="px-4 py-1.5 bg-cyan-500 text-slate-950 rounded-lg">حفظ التغييرات 💾</button>
                  </div>
                </form>
              )}

              <div className="relative border-r border-white/10 pr-6 space-y-8 py-4">
                {currentInstallments.map((inst, index) => (
                  <div key={inst.id} className="relative group">
                    {/* Circle Bullet */}
                    <div className="absolute right-0 top-1 w-3.5 h-3.5 rounded-full bg-cyan-500 border-4 border-slate-900 translate-x-[25px] group-hover:scale-125 transition-transform z-10"></div>
                    
                    <div className="p-5 bg-slate-950/40 border border-white/5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-cyan-500/30 transition-colors">
                      <div className="space-y-1">
                        <span className="text-xs text-cyan-400 font-black">الدفعة رقم #{index + 1}</span>
                        <h4 className="text-sm font-black text-white">{inst.notes || 'تحصيل بدون ملاحظات'}</h4>
                        <span className="text-[10px] text-slate-500 font-mono block">{inst.date}</span>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="flex items-baseline gap-1 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-xl text-emerald-400 font-black">
                          <span className="text-lg font-black font-mono tracking-tighter">+{inst.amount.toLocaleString()}</span>
                          <span className="text-[10px] font-bold">جنيه</span>
                        </div>
                        <div className="flex flex-col gap-1.5 no-print">
                          <button 
                            onClick={() => handleStartEditInstallment(inst)}
                            className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300"
                          >
                            تعديل ✏️
                          </button>
                          <button 
                            onClick={() => handleDeleteInstallment(inst.id)}
                            className="text-[10px] font-bold text-rose-400 hover:text-rose-300"
                          >
                            حذف 🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                {currentInstallments.length === 0 && (
                  <p className="text-xs text-slate-500 py-8 text-center">لم يتم قيد أي دفعات نقدية مستلمة بعد.</p>
                )}
              </div>
            </div>

            {/* Collection form and progress card */}
            <div className="space-y-6 no-print">
              
              {/* Add Installment Form */}
              <div className="bg-slate-900/40 border border-white/5 p-6 rounded-3xl shadow-lg space-y-4">
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <span>💰</span> تسجيل تحصيل دفعة جديدة
                </h3>
                
                <form onSubmit={handleAddInstallment} className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-slate-400 font-bold">المبلغ المستلم (جنيه)</label>
                    <input 
                      type="number" 
                      placeholder="0.00" 
                      value={newInstallment.amount}
                      onChange={e => setNewInstallment({...newInstallment, amount: e.target.value})}
                      className="bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 w-full"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-slate-400 font-bold">تاريخ استلام الدفعة</label>
                    <input 
                      type="date" 
                      value={newInstallment.date}
                      onChange={e => setNewInstallment({...newInstallment, date: e.target.value})}
                      className="bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 w-full"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-slate-400 font-bold">البيان الهندسي / ملاحظات</label>
                    <input 
                      type="text" 
                      placeholder="مثال: الدفعة الثالثة..." 
                      value={newInstallment.notes}
                      onChange={e => setNewInstallment({...newInstallment, notes: e.target.value})}
                      className="bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 w-full"
                    />
                  </div>

                  <button 
                    type="submit" 
                    className="w-full py-3 bg-gradient-to-l from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white rounded-xl text-xs font-black shadow-lg shadow-emerald-500/10 transition-transform active:scale-95"
                  >
                    تسجيل وقيد الدفعة بنجاح 🟢
                  </button>
                </form>
              </div>

              {/* Progress Summary Gauge */}
              <div className="bg-slate-900/40 border border-white/5 p-6 rounded-3xl shadow-lg relative overflow-hidden flex flex-col items-center text-center space-y-4">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">إجمالي نسبة التحصيل من العقد</span>
                
                {/* Circular Gauge */}
                <div className="relative w-36 h-36 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle cx="72" cy="72" r="60" className="stroke-slate-800" strokeWidth="12" fill="transparent" />
                    <circle cx="72" cy="72" r="60" className="stroke-cyan-500 transition-all duration-1000" strokeWidth="12" fill="transparent" strokeDasharray="377" strokeDashoffset={377 - (377 * totals.progressPercent) / 100} />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-2xl font-black text-white font-mono">{totals.progressPercent.toFixed(0)}%</span>
                    <span className="text-[8px] font-black text-slate-500 tracking-wider">تحصيل فعلي</span>
                  </div>
                </div>

                <div className="text-xs text-slate-300 leading-relaxed font-bold">
                  محصل <span className="font-mono text-cyan-400 font-black">{totals.totalCollected.toLocaleString()}</span> ج.م من عقد بقيمة <span className="font-mono text-white font-black">{totals.totalBOQ.toLocaleString()}</span> ج.م.
                </div>
              </div>

            </div>

          </div>
        )}

        {/* 5. FILES MANAGER VIEW (WITH LIVE INLINE EDITING & AUTO-SAVE INDICATORS) */}
        {activeTab === 'files' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-bottom duration-500 no-print">
            
            {/* Files List Directory */}
            <div className="bg-slate-900/40 border border-white/5 p-6 rounded-3xl shadow-lg space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <span>📁</span> مستندات وملفات المشروع المتعلقة
                </h3>
                
                <button 
                  onClick={() => fileInputRef.current.click()}
                  className="bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 text-cyan-400 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all"
                >
                  + رفع ملف
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  className="hidden" 
                />
              </div>

              <div className="space-y-2.5">
                {currentFiles.map(file => (
                  <div 
                    key={file.id} 
                    onClick={() => handleOpenFile(file)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex justify-between items-center ${
                      openedFile && openedFile.id === file.id 
                        ? 'bg-cyan-500/10 border-cyan-500/30' 
                        : 'bg-slate-950/40 border-white/5 hover:bg-slate-950/80'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">📝</span>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-200">{file.name}</span>
                        <span className="text-[9px] text-slate-500 font-mono mt-0.5">{file.date}</span>
                      </div>
                    </div>

                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteFile(file.id);
                      }}
                      className="text-[10px] font-bold text-rose-500 hover:text-rose-400 px-2 py-1 hover:bg-rose-500/10 rounded-lg"
                    >
                      حذف 🗑️
                    </button>
                  </div>
                ))}
                {currentFiles.length === 0 && (
                  <p className="text-xs text-slate-500 py-12 text-center">لا توجد ملفات مرفوعة حالياً. ابدأ برفع ملاحظات أو ملفات نصية للمشروع.</p>
                )}
              </div>
            </div>

            {/* Premium Inline File Editor (Auto-Save built in) */}
            <div className="lg:col-span-2 bg-slate-900/40 border border-white/5 p-6 rounded-3xl shadow-lg flex flex-col min-h-[450px]">
              {openedFile ? (
                <div className="flex-1 flex flex-col space-y-4">
                  <div className="flex justify-between items-center pb-3 border-b border-white/5">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">📁</span>
                      <h4 className="text-sm font-black text-white">{openedFile.name}</h4>
                    </div>

                    {/* Auto Save Status Indicator */}
                    <div className="flex items-center gap-2 text-xs">
                      {autoSaveStatus === 'saving' && (
                        <span className="text-cyan-400 font-black flex items-center gap-1.5 animate-pulse">
                          <span className="w-2 h-2 rounded-full bg-cyan-500 animate-ping"></span>
                          جاري الحفظ تلقائياً...
                        </span>
                      )}
                      {autoSaveStatus === 'saved' && (
                        <span className="text-emerald-400 font-black flex items-center gap-1">
                          ✓ تم الحفظ تلقائياً في المتصفح
                        </span>
                      )}
                      {autoSaveStatus === 'idle' && (
                        <span className="text-slate-500">جاهز للتعديل</span>
                      )}
                    </div>
                  </div>

                  <textarea
                    value={fileEditorContent}
                    onChange={handleEditorChange}
                    placeholder="اكتب ملاحظاتك هنا..."
                    className="flex-1 w-full bg-slate-950/80 border border-white/10 rounded-2xl p-5 text-sm font-mono text-slate-200 leading-relaxed focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 resize-none min-h-[300px]"
                  />
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                  <span className="text-5xl mb-3">📁</span>
                  <h4 className="text-sm font-black text-slate-400">محرر مستندات المشروع التفاعلي</h4>
                  <p className="text-xs text-slate-500 mt-2 max-w-sm leading-relaxed">انقر على أي ملف نصي من القائمة الجانبية لفتحه وتعديله مباشرة. سيقوم النظام بحفظ أي تعديل بشكل تلقائي في المتصفح!</p>
                </div>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
