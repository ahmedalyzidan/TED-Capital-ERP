import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import api from '../services/api';
import DirectStockIssue from './DirectStockIssue';
import FinancialTransactions from './FinancialTransactions';

function tafqeet(number) {
  if (isNaN(number) || number === null) return '';
  const parts = Number(number).toFixed(2).split('.');
  const pounds = Number(parts[0]);
  const piastres = Number(parts[1]);
  
  const ones = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
  const tens = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const hundreds = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];
  
  function convertLessThanThousand(n) {
    if (n === 0) return '';
    let res = '';
    const h = Math.floor(n / 100);
    const remainder = n % 100;
    if (h > 0) {
      res += (h === 1 && remainder === 0) ? 'مائة' : (h === 2 && remainder === 0) ? 'مائتان' : hundreds[h];
      if (remainder > 0) res += ' و ';
    }
    if (remainder > 0) {
      if (remainder < 20) {
        res += ones[remainder];
      } else {
        const o = remainder % 10;
        const t = Math.floor(remainder / 10);
        if (o > 0) {
          res += ones[o] + ' و ';
        }
        res += tens[t];
      }
    }
    return res;
  }
  
  function convert(n) {
    if (n === 0) return 'صفر';
    let res = '';
    const billions = Math.floor(n / 1000000000);
    let remainder = n % 1000000000;
    const millions = Math.floor(remainder / 1000000);
    remainder = remainder % 1000000;
    const thousands = Math.floor(remainder / 1000);
    const hundredsVal = remainder % 1000;
    
    if (billions > 0) {
      res += (billions === 1 ? 'مليار' : billions === 2 ? 'ملياران' : convertLessThanThousand(billions) + ' مليار');
      if (remainder > 0) res += ' و ';
    }
    if (millions > 0) {
      res += (millions === 1 ? 'مليون' : millions === 2 ? 'مليونان' : convertLessThanThousand(millions) + ' مليون');
      const rem = remainder % 1000000;
      if (rem > 0) res += ' و ';
    }
    if (thousands > 0) {
      res += (thousands === 1 ? 'ألف' : thousands === 2 ? 'ألفان' : thousands >= 3 && thousands <= 10 ? convertLessThanThousand(thousands) + ' آلاف' : convertLessThanThousand(thousands) + ' ألف');
      const rem = remainder % 1000;
      if (rem > 0) res += ' و ';
    }
    if (hundredsVal > 0) {
      res += convertLessThanThousand(hundredsVal);
    }
    return res;
  }
  
  let result = convert(pounds) + ' جنيه مصري';
  if (piastres > 0) {
    result += ' و ' + convert(piastres) + ' قرشاً';
  }
  return result + ' فقط لا غير';
}

export default function ContractorSuite() {
  const { language } = useLanguage();

  // --- 1. PERSISTED STATE / MULTI-PROJECT ENGINE ---
  // We initialize the state by reading from localStorage, or using the preloaded "Villa E109" as our seed project.
  const [projects, setProjects] = useState(() => {
    const saved = localStorage.getItem('contractor_projects');
    if (saved) return JSON.parse(saved);
    return [
      { id: 'villa-e109', name: 'فيلا E109 - التجمع الخامس', clientName: 'الأستاذ محمد', company: 'TED CAPITAL', projectManager: 'المهندس أحمد', startDate: '2026-01-01' },
      { id: 'villa-e110', name: 'فيلا E110 - زايد الجديد', clientName: 'المهندس أحمد سالم', company: 'PRIMEMED PHARMA', projectManager: 'المهندس كريم', startDate: '2026-02-15' }
    ];
  });

  const [activeProjectId, setActiveProjectId] = useState(() => {
    const saved = localStorage.getItem('contractor_active_project_id');
    return saved || 'villa-e109';
  });

  // Seed data for Villa E109
  const defaultBoqItems = [
    { id: 1, projectId: 'villa-e109', category: "أعمال صحي", item_name: "أعمال تأسيس وتشطيب حمامات مواسير تغذيه BR ألمانى والصرف كيسيل والمحابس BR ألمانى", quantity: 4.0, unit: "مقطوعية", price: 65000.0, total: 260000.0, notes: "البند يشمل خامات ومصنعيات وأعمال التشطيب مصنعيات فقط وقواعد تواليت ديورافيت معلقه وحوض بوحده معلقه وخلاطات ديورافيت" },
    { id: 2, projectId: 'villa-e109', category: "أعمال صحي", item_name: "أعمال تأسيس وتشطيب مطبخ مواسير تغذيه BR ألمانى والصرف كيسيل والمحابس BR ألمانى", quantity: 1.0, unit: "مقطوعية", price: 15000.0, total: 15000.0, notes: "" },
    { id: 3, projectId: 'villa-e109', category: "أعمال صحي", item_name: "أعمال عزل لزوم أرضية الحمامات والمطبخ من النوع سيكا 107 شامل الركوب ورقبة الزجاجه مع عمل لياسه فوق العزل", quantity: 4.0, unit: "عدد", price: 3500.0, total: 14000.0, notes: "" },
    { id: 4, projectId: 'villa-e109', category: "أعمال صحي", item_name: "أعمال توريد وتركيب شبكة تغذيه للحديقه المواسير كيسيل وتغذيه من المواسير ال BR الألماني", quantity: 1.0, unit: "مقطوعية", price: 15000.0, total: 15000.0, notes: "" },
    { id: 5, projectId: 'villa-e109', category: "أعمال صحي", item_name: "أعمال تأسيس شبكة صرف تكييف شامله البضاعه ( كيسيل )", quantity: 1.0, unit: "عدد", price: 15000.0, total: 15000.0, notes: "" },
    { id: 6, projectId: 'villa-e109', category: "أعمال كهرباء", item_name: "أعمال تأسيس وتشطيب مفاتيح وبرايز وسحب أسلاك لجميع الغرف والحمامات والمطبخ لزوم الإناره والسويدى المعتمد ولوحة شنايدر", quantity: 1.0, unit: "مقطوعية", price: 225000.0, total: 225000.0, notes: "البند يشمل وحدات الإضاءه والأسپوتات وبيوت النور و sound sys لكل الغرف و security alarm وكاميرات مراقبه" },
    { id: 7, projectId: 'villa-e109', category: "أعمال جيبسوم بورد أبيض", item_name: "أعمال توريد وتركيب أسقف جيبسوم بورد أبيض من إنتاج Knauf لزوم الغرف والريسبشن (مسطح)", quantity: 208.0, unit: "م٢", price: 350.0, total: 72800.0, notes: "" },
    { id: 8, projectId: 'villa-e109', category: "أعمال جيبسوم بورد أبيض", item_name: "أعمال توريد وتركيب أسقف جيبسوم بورد أبيض من إنتاج Knauf لزوم الغرف والريسبشن (طولي)", quantity: 117.0, unit: "م", price: 330.0, total: 38610.0, notes: "" },
    { id: 9, projectId: 'villa-e109', category: "أعمال جيبسوم بورد أخضر ( MR )", item_name: "أعمال توريد وتركيب أسقف جيبسوم بورد أخضر من إنتاج Knauf لزوم الحمامات والمطبخ", quantity: 43.0, unit: "م٢", price: 380.0, total: 16340.0, notes: "" },
    { id: 10, projectId: 'villa-e109', category: "أعمال بياض محاره", item_name: "أعمال بياض محاره داخليه لزوم الحوائط والأسقف", quantity: 900.0, unit: "م٢", price: 120.0, total: 108000.0, notes: "" },
    { id: 11, projectId: 'villa-e109', category: "أعمال دهانات", item_name: "أعمال دهانات للأسقف والحوائط من وجه سيلر و 3 معجون ووجهين بلاستيك يوتن", quantity: 1214.0, unit: "م٢", price: 200.0, total: 242800.0, notes: "" },
    { id: 12, projectId: 'villa-e109', category: "أعمال رخام أرضيات", item_name: "أعمال توريد وتركيب رخام بريشيا داينو لأرضية الريسبشن", quantity: 70.0, unit: "م٢", price: 4700.0, total: 329000.0, notes: "" },
    { id: 13, projectId: 'villa-e109', category: "أعمال توريد وتركيب وزر رخام", item_name: "أعمال توريد وتركيب رخام بيتشينو وزرة لأرضية الريسبشن", quantity: 34.0, unit: "م", price: 800.0, total: 27200.0, notes: "" },
    { id: 14, projectId: 'villa-e109', category: "أعمال سيراميك حوائط", item_name: "أعمال توريد وتركيب سيراميك لزوم حوائط حمام الماستر بكامل الإرتفاع واللصق بمادة سيتوكس", quantity: 28.0, unit: "م٢", price: 1200.0, total: 33600.0, notes: "سعر توريد السيراميك 800جنيه" },
    { id: 15, projectId: 'villa-e109', category: "أعمال سيراميك حوائط", item_name: "أعمال توريد وتركيب سيراميك لزوم حوائط حمام المعيشه والسطح بكامل الإرتفاع واللصق بمادة سيتوكس", quantity: 93.0, unit: "م٢", price: 1200.0, total: 111600.0, notes: "سعر توريد السيراميك 800جنيه" },
    { id: 16, projectId: 'villa-e109', category: "أعمال سيراميك حوائط", item_name: "أعمال توريد وتركيب سيراميك لزوم حوائط حمام الضيوف بكامل الإرتفاع واللصق بمادة سيتوكس", quantity: 45.5, unit: "م٢", price: 1200.0, total: 54600.0, notes: "سعر توريد السيراميك 800جنيه" },
    { id: 17, projectId: 'villa-e109', category: "أعمال سيراميك حوائط", item_name: "أعمال توريد وتركيب سيراميك لزوم أرضيات السطح الخارجي", quantity: 71.0, unit: "م٢", price: 650.0, total: 46150.0, notes: "سعر توريد السيراميك 350جنيه" },
    { id: 18, projectId: 'villa-e109', category: "أعمال سيراميك حوائط", item_name: "أعمال توريد وتركيب سيراميك لزوم حوائط وأرضيات المطبخ بكامل الإرتفاع واللصق بمادة سيتوكس", quantity: 70.0, unit: "م٢", price: 650.0, total: 45500.0, notes: "سعر توريد السيراميك 350جنيه" },
    { id: 19, projectId: 'villa-e109', category: "أعمال سيراميك حوائط", item_name: "سيراميك أرضيه للغرف", quantity: 85.0, unit: "م٢", price: 500.0, total: 42500.0, notes: "سعر توريد السيراميك 250جنيه" },
    { id: 20, projectId: 'villa-e109', category: "أعمال سيراميك حوائط", item_name: "سيراميك أرضيه للتراس", quantity: 25.0, unit: "م٢", price: 650.0, total: 16250.0, notes: "سعر توريد السيراميك 350جنيه" },
    { id: 21, projectId: 'villa-e109', category: "أعمال توريد وتركيب أبواب داخلية", item_name: "توريد وتركيب أبواب داخليه من الخشب لزوم الغرف عظم سويدى مكبوس MDF ملزوق أرو مدهون أستر باللون المطلوب", quantity: 7.0, unit: "عدد", price: 16500.0, total: 115500.0, notes: "شامل الإكسسوار والكالون والأكره من النوع التركى" },
    { id: 22, projectId: 'villa-e109', category: "أعمال شيش حصره ( SHUTTER )", item_name: "توريد وتركيب شيش حصيره شركة النيل ومواتير آزا إيطالي", quantity: 22.5, unit: "م٢", price: 5500.0, total: 123750.0, notes: "غرف النوم بدون الريسبشن" },
    { id: 23, projectId: 'villa-e109', category: "أعمال تأسيس تكييف", item_name: "أعمال تجهيز كهرباء ومواسير نحاس لأجهزة التكييف", quantity: 1.0, unit: "مقطوعية", price: 80000.0, total: 80000.0, notes: "شامل الصاج والجريلات" },
    { id: 24, projectId: 'villa-e109', category: "أعمال توريد وتركيب تكييف - HVAC", item_name: "أعمال توريد وتركيب وحدات تكييف ماركة كاريير", quantity: 2.0, unit: "عدد", price: 170000.0, total: 340000.0, notes: "عدد 2 جهاز 5ح للريسبشن" },
    { id: 25, projectId: 'villa-e109', category: "أعمال تأسيس تكييف", item_name: "أعمال توريد وتركيب غاز مركزي", quantity: 1.0, unit: "مقطوعية", price: 95000.0, total: 95000.0, notes: "" },
    { id: 26, projectId: 'villa-e109', category: "أعمال تعديلات إنشائية", item_name: "أعمال تكسير وتعديلات وإزالة ردش", quantity: 1.0, unit: "مقطوعية", price: 15000.0, total: 15000.0, notes: "" },
    { id: 27, projectId: 'villa-e109', category: "أعمال تعديلات إنشائية", item_name: "أعمال مباني إضافيه", quantity: 1.0, unit: "مقطوعية", price: 12000.0, total: 12000.0, notes: "" },
    { id: 28, projectId: 'villa-e109', category: "أعمال لاند سكيب", item_name: "أعمال زراعة وتنسيق حدائق", quantity: 1.0, unit: "مقطوعية", price: 75000.0, total: 75000.0, notes: "" }
  ];

  const defaultExpenses = [
    { id: 1, projectId: 'villa-e109', beneficiary: "م. أحمد سالم", category: "أعمال تصميم", unit: "مقطوعية", qty: 1, rate: 17000, total: 17000, date: "2024-07-23", notes: "تصميم فيلا E109" },
    { id: 2, projectId: 'villa-e109', beneficiary: "تكييفات كونسيلد 4 ح", category: "أعمال تأسيس تكييف", unit: "عدد", qty: 2, rate: 110000, total: 220000, date: "2024-06-03", notes: "تجهيز التكييف" },
    { id: 3, projectId: 'villa-e109', beneficiary: "تكييفات اسبليت 2.25 ح", category: "أعمال تأسيس تكييف", unit: "عدد", qty: 5, rate: 36500, total: 182500, date: "2024-06-03", notes: "كاريير" },
    { id: 4, projectId: 'villa-e109', beneficiary: "توريدات طوب ورمل وأسمنت", category: "أعمال تعديلات إنشائية", unit: "عدد", qty: 1, rate: 8400, total: 8400, date: "2024-02-05", notes: "دفعة أولى لتأسيس المباني" },
    { id: 5, projectId: 'villa-e109', beneficiary: "توريدات أسمنت ورمل", category: "أعمال بياض محاره", unit: "عدد", qty: 1, rate: 8000, total: 8000, date: "2024-02-05", notes: "أعمال المحارة" },
    { id: 6, projectId: 'villa-e109', beneficiary: "بورسلين حمامات وسيراميك المطبخ", category: "أعمال سيراميك حوائط", unit: "عدد", qty: 1, rate: 96200, total: 96200, date: "2024-03-05", notes: "معرض السلاب" },
    { id: 7, projectId: 'villa-e109', beneficiary: "تركيب حنفية خارجيه", category: "أعمال صحي", unit: "مقطوعية", qty: 1, rate: 500, total: 500, date: "2024-04-05", notes: "الحديقة الخلفية" },
    { id: 8, projectId: 'villa-e109', beneficiary: "إكراميات أمن", category: "إكراميات ونثريات", unit: "عدد", qty: 1, rate: 300, total: 300, date: "2024-04-05", notes: "أمن البوابة" },
    { id: 9, projectId: 'villa-e109', beneficiary: "فك ألوميتال", category: "أعمال تعديلات إنشائية", unit: "مقطوعية", qty: 1, rate: 2800, total: 2800, date: "2024-07-05", notes: "تعديل المعيشة" },
    { id: 10, projectId: 'villa-e109', beneficiary: "مستخلص مصنعيات بياض محاره", category: "أعمال بياض محاره", unit: "مستخلص", qty: 1, rate: 36895, total: 36895, date: "2024-08-15", notes: "مستخلص نهائي للمحار" }
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

  // 📝 Progress Claims (Valuations) State
  const [valuations, setValuations] = useState(() => {
    const saved = localStorage.getItem('contractor_valuations');
    return saved ? JSON.parse(saved) : [];
  });

  // 🏢 Governance Organizational Units State
  const [orgUnits, setOrgUnits] = useState([]);

  // 📦 Database Inventory Sales/Expenses State
  const [dbExpenses, setDbExpenses] = useState([]);
  const [rawSales, setRawSales] = useState([]);

  // Cost Center Mode State ('project' | 'company')
  const [costCenterMode, setCostCenterMode] = useState('project');

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

  useEffect(() => {
    localStorage.setItem('contractor_valuations', JSON.stringify(valuations));
  }, [valuations]);

  // Load orgUnits from Governance registry, projects and inventory sales from DB
  const fetchAllData = async () => {
    try {
      const [orgRes, projRes, salesRes, subcontractorsRes, statementsRes, invoicesRes, subItemsRes, ledgerRes, compRes, clientPaymentHistoryRes, arInvoicesRes, boqRes, expensesRes, customersRes] = await Promise.all([
        api.get('/dynamic/table/org_units?limit=1000').catch(() => ({ data: { data: [] } })),
        api.get('/dynamic/table/projects?limit=500').catch(() => ({ data: { data: [] } })),
        api.get('/dynamic/table/inventory_sales?limit=2000').catch(() => ({ data: { data: [] } })),
        api.get('/dynamic/table/subcontractors?limit=1000').catch(() => ({ data: { data: [] } })),
        api.get('/dynamic/table/subcontractor_statements?limit=2000').catch(() => ({ data: { data: [] } })),
        api.get('/dynamic/table/subcontractor_invoices?limit=2000').catch(() => ({ data: { data: [] } })),
        api.get('/dynamic/table/subcontractor_items?limit=2000').catch(() => ({ data: { data: [] } })),
        api.get('/dynamic/table/ledger?limit=2000').catch(() => ({ data: { data: [] } })),
        api.get('/dynamic/table/companies?limit=100').catch(() => ({ data: { data: [] } })),
        api.get('/dynamic/table/client_payment_history?limit=2000').catch(() => ({ data: { data: [] } })),
        api.get('/dynamic/table/ar_invoices?limit=2000').catch(() => ({ data: { data: [] } })),
        api.get('/dynamic/table/boq?limit=2000').catch(() => ({ data: { data: [] } })),
        api.get('/expenses?limit=5000').catch(() => ({ data: { data: [] } })),
        api.get('/dynamic/table/customers?limit=1000').catch(() => ({ data: { data: [] } }))
      ]);

      // 1. Set Org Units
      setOrgUnits(orgRes.data?.data || []);
      const subsList = subcontractorsRes.data?.data || [];
      setSubcontractorsList(subsList);
      setCompanies(compRes.data?.data || []);
      setCustomers(customersRes.data?.data || []);

      // 2. Set Projects (Merge database projects with localStorage projects)
      const dbProjects = projRes.data?.data || [];
      const mappedProjects = dbProjects.map(p => ({
        id: String(p.id),
        name: p.name,
        clientName: p.client_name || p.client || 'عميل عام',
        company: p.company || 'TED CAPITAL',
        projectManager: p.project_manager || p.manager || '',
        startDate: p.start_date ? p.start_date.split('T')[0] : ''
      }));

      // --- Auto-migrate localStorage mock project references to DB IDs ---
      let migratedSomething = false;
      const migrationMap = {};
      const savedProjects = localStorage.getItem('contractor_projects');
      let localProjects = savedProjects ? JSON.parse(savedProjects) : [
        { id: 'villa-e109', name: 'فيلا E109 - التجمع الخامس', clientName: 'الأستاذ محمد', company: 'TED CAPITAL', projectManager: 'المهندس أحمد', startDate: '2026-01-01' },
        { id: 'villa-e110', name: 'فيلا E110 - زايد الجديد', clientName: 'المهندس أحمد سالم', company: 'PRIMEMED PHARMA', projectManager: 'المهندس كريم', startDate: '2026-02-15' }
      ];

      mappedProjects.forEach(mp => {
        const idx = localProjects.findIndex(lp => lp.name === mp.name && isNaN(Number(lp.id)));
        if (idx !== -1) {
          migrationMap[localProjects[idx].id] = mp.id;
          localProjects.splice(idx, 1);
          migratedSomething = true;
        }
      });

      if (migratedSomething) {
        localStorage.setItem('contractor_projects', JSON.stringify(localProjects));
        
        let newActiveId = activeProjectId;
        if (migrationMap[activeProjectId]) {
          newActiveId = migrationMap[activeProjectId];
          setActiveProjectId(newActiveId);
          localStorage.setItem('contractor_active_project_id', newActiveId);
        }

        const localBoq = JSON.parse(localStorage.getItem('contractor_boq') || '[]');
        const migratedBoq = localBoq.map(item => migrationMap[item.projectId] ? { ...item, projectId: migrationMap[item.projectId] } : item);
        localStorage.setItem('contractor_boq', JSON.stringify(migratedBoq));
        setBoqItems(migratedBoq);

        const localExp = JSON.parse(localStorage.getItem('contractor_expenses') || '[]');
        const migratedExp = localExp.map(item => migrationMap[item.projectId] ? { ...item, projectId: migrationMap[item.projectId] } : item);
        localStorage.setItem('contractor_expenses', JSON.stringify(migratedExp));
        setExpenses(migratedExp);

        const localInst = JSON.parse(localStorage.getItem('contractor_installments') || '[]');
        const migratedInst = localInst.map(item => migrationMap[item.projectId] ? { ...item, projectId: migrationMap[item.projectId] } : item);
        localStorage.setItem('contractor_installments', JSON.stringify(migratedInst));
        setInstallments(migratedInst);

        const localVal = JSON.parse(localStorage.getItem('contractor_valuations') || '[]');
        const migratedVal = localVal.map(item => migrationMap[item.projectId] ? { ...item, projectId: migrationMap[item.projectId] } : item);
        localStorage.setItem('contractor_valuations', JSON.stringify(migratedVal));
        setValuations(migratedVal);

        const localFiles = JSON.parse(localStorage.getItem('contractor_files') || '[]');
        const migratedFiles = localFiles.map(item => migrationMap[item.projectId] ? { ...item, projectId: migrationMap[item.projectId] } : item);
        localStorage.setItem('contractor_files', JSON.stringify(migratedFiles));
        setProjectFiles(migratedFiles);
      }

      const allCombinedProjects = [...localProjects];
      mappedProjects.forEach(mp => {
        if (!allCombinedProjects.some(p => String(p.id) === String(mp.id))) {
          allCombinedProjects.push(mp);
        }
      });

      setProjects(allCombinedProjects);

      // 3. Set DB inventory sales as expenses
      const sales = salesRes.data?.data || [];
      setRawSales(sales);

      const mappedSalesExpenses = sales
        .filter(s => s.project_id && !s.is_deleted && s.is_deleted !== 1 && s.is_deleted !== 'true')
        .map(s => {
          const qtyVal = Number(s.qty || 0);
          const isReturn = qtyVal > 0;
          return {
            id: `db-sale-${s.id}`,
            projectId: String(s.project_id),
            beneficiary: isReturn ? 'مرتجع مواد فائضة للمستودع' : 'صرف مخزني مباشر - مستودع المواد',
            category: s.metadata?.engineering_classification || (() => {
              const name = (s.item_name || '').toLowerCase();
              if (name.includes('حديد') || name.includes('خرسان') || name.includes('أسمنت') || name.includes('اسمنت')) {
                return 'أعمال توريد وصب خرسانه';
              }
              if (name.includes('سلك') || name.includes('كهرب') || name.includes('لوحة')) {
                return 'أعمال كهرباء';
              }
              if (name.includes('سباك') || name.includes('صحي') || name.includes('مواسير')) {
                return 'أعمال صحي';
              }
              return 'أعمال توريدات';
            })(),
            unit: s.uom || 'وحدة',
            qty: Math.abs(qtyVal),
            rate: Number(s.buy_price || s.sell_price || 0),
            total: Math.abs(qtyVal * Number(s.buy_price || s.sell_price || 0)),
            date: s.date ? s.date.split('T')[0] : (s.sale_date ? s.sale_date.split('T')[0] : new Date().toISOString().split('T')[0]),
            notes: isReturn
              ? `مرتجع مواد فائضة من موقع المشروع للصنف: ${s.item_name} (باتش: ${s.batch_no || 'N/A'}) | مستند رقم: ${s.reference_no || s.sale_no || 'N/A'}`
              : `صرف مخزني مباشر للصنف: ${s.item_name} (باتش: ${s.batch_no || 'N/A'}) | مستند رقم: ${s.reference_no || s.sale_no || 'N/A'}`,
            allocationType: 'project'
          };
        });

      // 4. Map DB subcontractor statements (payments) to dbExpenses
      const statements = statementsRes.data?.data || [];
      const ledgerRows = ledgerRes.data?.data || [];

      const mappedStatements = statements
        .filter(st => st.type === 'صرف مستخلص' && !st.is_deleted)
        .map(st => {
          const meta = typeof st.metadata === 'string' ? JSON.parse(st.metadata) : (st.metadata || {});
          const pName = meta.project_name;
          const proj = allCombinedProjects.find(p => p.name === pName);
          const pId = proj ? String(proj.id) : activeProjectId;

          return {
            id: `db-statement-${st.id}`,
            projectId: pId,
            beneficiary: st.sub_name,
            category: 'أعمال مقاولين من الباطن',
            unit: 'دفعة',
            qty: 1,
            rate: Number(st.amount || 0),
            total: Number(st.amount || 0),
            date: st.created_at ? st.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
            notes: st.details || `سداد دفعة للمقاول ${st.sub_name}`,
            allocationType: 'project'
          };
        });

      // Also map ledger entries as statements for fallback/completeness
      const mappedLedgerStatements = ledgerRows
        .filter(row => {
          if (row.account_name !== 'مقاولي الباطن' || !(Number(row.debit || 0) > 0) || row.is_deleted) {
            return false;
          }
          // Avoid duplicate entries: if there is a subcontractor statement with matching ID/reference, skip this ledger entry
          let refNo = row.reference_no || '';
          if (!refNo && row.description) {
            const match = row.description.match(/مرجع:\s*([^\s|]+)/);
            if (match) {
              refNo = match[1].trim();
            }
          }
          if (refNo) {
            if (refNo.startsWith('PMT-')) {
              const statementId = refNo.replace('PMT-', '');
              if (statements.some(st => String(st.id) === String(statementId) && !st.is_deleted)) {
                return false;
              }
            }
            const hasMatchingStatement = statements.some(st => {
              if (st.is_deleted) return false;
              const meta = typeof st.metadata === 'string' ? JSON.parse(st.metadata) : (st.metadata || {});
              return meta.reference_no && String(meta.reference_no) === String(refNo);
            });
            if (hasMatchingStatement) {
              return false;
            }
          }
          return true;
        })
        .map(row => {
          const pName = row.cost_center;
          const proj = allCombinedProjects.find(p => p.name === pName);
          const pId = proj ? String(proj.id) : activeProjectId;

          // Try to extract subcontractor name from description or match from subsList
          let subName = '';
          const desc = row.description || '';
          const matchedSub = subsList.find(s => s.name && (desc.includes(s.name) || desc.includes(s.name.trim())));
          if (matchedSub) {
            subName = matchedSub.name;
          } else {
            const match = desc.match(/(?:للمقاول|المقاول)\s+([^\s|-]+(?:\s+[^\s|-]+){0,2})/);
            subName = match ? match[1].trim() : '';
          }

          return {
            id: `db-ledger-${row.id}`,
            projectId: pId,
            beneficiary: subName,
            category: 'أعمال مقاولين من الباطن',
            unit: 'دفعة',
            qty: 1,
            rate: Number(row.debit || 0),
            total: Number(row.debit || 0),
            date: row.created_at ? row.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
            notes: row.description,
            allocationType: 'project'
          };
        })
        .filter(s => s.beneficiary);

      setDbExpenses([...mappedSalesExpenses, ...mappedStatements, ...mappedLedgerStatements]);

      // 4.5 Map DB manual expenses
      const dbManualExpenses = (expensesRes.data?.data || []).map(exp => {
        const meta = exp.metadata || {};
        return {
          id: exp.id,
          projectId: exp.project_id ? String(exp.project_id) : (meta.projectId || `company-overhead-${exp.company_entity || 'TED CAPITAL'}`),
          beneficiary: exp.supplier_name || meta.beneficiary || 'مورد عام',
          category: meta.category || exp.category_name || 'أعمال توريدات',
          unit: meta.unit || 'وحدة',
          qty: Number(meta.qty || 1),
          rate: Number(meta.rate || exp.amount || 0),
          total: Number(exp.amount || 0),
          date: exp.expense_date ? exp.expense_date.split('T')[0] : '',
          notes: exp.description || '',
          allocationType: meta.allocationType || (exp.project_id ? 'project' : 'company')
        };
      });

      setExpenses(prev => {
        const localFiltered = prev.filter(e => isNaN(Number(e.projectId)) && !String(e.projectId).startsWith('company-overhead-'));
        return [...localFiltered, ...dbManualExpenses];
      });

      // 5. Map DB subcontractor invoices (progress claims) to valuations
      const dbInvoices = invoicesRes.data?.data || [];
      const dbSubItems = subItemsRes.data?.data || [];

      const mappedValuations = dbInvoices
        .filter(inv => !inv.is_deleted)
        .map(inv => {
          // Find boqItemId from sub_item_id using dbSubItems
          let boqItemId = null;
          if (inv.sub_item_id) {
            const subItem = dbSubItems.find(item => Number(item.id) === Number(inv.sub_item_id));
            if (subItem) {
              boqItemId = subItem.boq_id;
            }
          }

          // If still null, try finding a BOQ item in the same project by matching keywords in description/category
          if (!boqItemId) {
            const projBoq = boqItems.filter(b => String(b.projectId) === String(inv.project_id));
            if (projBoq.length > 0) {
              const desc = (inv.description || '').toLowerCase();
              let matched = projBoq.find(b => desc.includes(b.category.toLowerCase()) || desc.includes((b.item_name || '').toLowerCase()));
              if (!matched) {
                if (desc.includes('صحي') || desc.includes('سباكة')) {
                  matched = projBoq.find(b => b.category.includes('صحي'));
                } else if (desc.includes('كهربا')) {
                  matched = projBoq.find(b => b.category.includes('كهرباء'));
                } else if (desc.includes('محار') || desc.includes('بياض')) {
                  matched = projBoq.find(b => b.category.includes('محاره') || b.category.includes('بياض'));
                } else if (desc.includes('دهان')) {
                  matched = projBoq.find(b => b.category.includes('دهانات'));
                } else if (desc.includes('تكييف')) {
                  matched = projBoq.find(b => b.category.includes('تكييف'));
                } else if (desc.includes('جيبس') || desc.includes('جبس')) {
                  matched = projBoq.find(b => b.category.includes('جيبسوم'));
                }
              }
              boqItemId = matched ? matched.id : projBoq[0].id;
            }
          }

          const meta = typeof inv.metadata === 'string' ? JSON.parse(inv.metadata) : (inv.metadata || {});
          const linesList = meta.lines || [{
            id: `sub-inv-line-${inv.id}`,
            boqItemId: boqItemId,
            contractorName: inv.subcontractor_name,
            description: inv.description,
            unit: 'مستخلص',
            unitPrice: Number(inv.gross_amount || inv.amount || 0),
            quantity: Number(inv.curr_qty || 1),
            prevQty: Number(inv.prev_qty || 0),
            cumulativeQty: Number(inv.curr_qty || 1) + Number(inv.prev_qty || 0),
            total: Number(inv.gross_amount || inv.amount || 0)
          }];

          return {
            id: `db-sub-inv-${inv.id}`,
            projectId: String(inv.project_id),
            claimNo: `SUB-VAL-${inv.id}`,
            invoiceNo: `SUB-INV-${inv.id}`,
            date: inv.date ? inv.date.split('T')[0] : new Date(inv.created_at).toISOString().split('T')[0],
            lines: linesList,
            totalCurrent: Number(inv.gross_amount || inv.amount || 0),
            discount: Number(inv.retention_deduction || 0) + Number(inv.dp_recovery || 0) + Number(inv.material_deduction || 0),
            discountReason: meta.discountReason || '',
            taxRate: meta.taxRate !== undefined ? meta.taxRate : (Number(inv.tax_deduction || 0) > 0 ? 14 : 0),
            taxMethod: meta.taxMethod || 'waived',
            totalAfterDiscount: Number(inv.gross_amount || inv.amount || 0) - (Number(inv.retention_deduction || 0) + Number(inv.dp_recovery || 0) + Number(inv.material_deduction || 0)),
            taxAmount: Number(inv.tax_deduction || 0),
            totalFinal: Number(inv.net_amount || inv.amount || 0),
            isContractor: true,
            linkedClientValuationId: inv.client_valuation_id || null,
            status: inv.status?.toLowerCase() === 'paid' ? 'paid' : 'issued'
          };
        });

      // Map DB client invoices to valuations
      const dbClientInvoices = arInvoicesRes.data?.data || [];
      const mappedClientValuations = dbClientInvoices
        .filter(inv => !inv.is_deleted)
        .map(inv => {
          const meta = typeof inv.metadata === 'string' ? JSON.parse(inv.metadata) : (inv.metadata || {});
          return {
            id: inv.id,
            projectId: String(inv.project_id),
            claimNo: meta.claimNo || `VAL-${inv.id}`,
            invoiceNo: meta.invoiceNo || inv.invoice_no || `INV-${inv.id}`,
            date: inv.date ? inv.date.split('T')[0] : '',
            items: meta.items || [],
            totalCurrent: Number(inv.base_amount || 0),
            discount: Number(meta.discount || 0),
            discountRate: Number(meta.discountRate || 0),
            taxRate: Number(inv.tax_percent || 0),
            taxMethod: meta.taxMethod || 'period',
            totalAfterDiscount: Number(meta.totalAfterDiscount || 0),
            taxAmount: Number(inv.tax_amount || 0),
            totalFinal: Number(inv.total_amount || 0),
            isContractor: false,
            status: inv.status?.toLowerCase() === 'paid' ? 'paid' : 'issued'
          };
        });

      setValuations(prev => {
        const localOnly = prev.filter(v => typeof v.id === 'string' && v.id.startsWith('val-'));
        return [...localOnly, ...mappedValuations, ...mappedClientValuations];
      });

      // Map DB BOQ items to boqItems state
      const dbBoqItems = boqRes.data?.data || [];
      const mappedDbBoq = dbBoqItems.map(item => {
        const proj = allCombinedProjects.find(p => p.name === item.project_name);
        return {
          id: item.id,
          projectId: proj ? String(proj.id) : activeProjectId,
          category: item.material_category || 'أعمال صحي',
          item_name: item.item_name,
          quantity: Number(item.est_qty || 0),
          unit: item.uom || 'م٢',
          price: Number(item.est_unit_price || 0),
          total: Number(item.est_total_price || 0),
          notes: item.item_desc || ''
        };
      });

      setBoqItems(prev => {
        const localFiltered = prev.filter(item => isNaN(Number(item.projectId)));
        return [...localFiltered, ...mappedDbBoq];
      });

      // Map DB client payments to installments state
      const dbClientPayments = clientPaymentHistoryRes.data?.data || [];
      const mappedDbPayments = dbClientPayments
        .filter(p => !p.is_deleted)
        .map(p => {
          const meta = typeof p.metadata === 'string' ? JSON.parse(p.metadata) : (p.metadata || {});
          return {
            id: p.id,
            projectId: String(p.project_id),
            amount: Number(p.amount_paid || 0),
            date: p.payment_date ? p.payment_date.split('T')[0] : '',
            notes: p.notes || '',
            valuationId: meta.valuation_id || p.delayed_payment_id || '',
            paymentMethod: p.payment_method || 'نقدًا',
            referenceNo: p.reference_no || ''
          };
        });

      setInstallments(prev => {
        const localFiltered = prev.filter(item => isNaN(Number(item.projectId)));
        return [...localFiltered, ...mappedDbPayments];
      });

      // ✅ Clean up old duplicate 'exp-stock-*' entries from localStorage.
      // These were previously saved by DirectStockIssue but are now duplicates
      // since we fetch directly from inventory_sales DB above.
      try {
        const savedExpStr = localStorage.getItem('contractor_expenses');
        if (savedExpStr) {
          const savedExp = JSON.parse(savedExpStr);
          const cleanedExp = savedExp.filter(e => !String(e.id).startsWith('exp-stock-'));
          if (cleanedExp.length !== savedExp.length) {
            localStorage.setItem('contractor_expenses', JSON.stringify(cleanedExp));
          }
        }
      } catch (_) { /* ignore cleanup errors */ }

    } catch (err) {
      console.error('Failed to fetch initial data:', err);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  const activeComp = localStorage.getItem('active_company') || '';

  const filteredProjects = useMemo(() => {
    const activeLower = activeComp.toLowerCase();
    return projects.filter(proj => {
      if (!activeComp || ['all', 'كل الشركات', 'all companies'].includes(activeLower)) return true;
      const projCompLower = (proj.company || '').toLowerCase();
      if (activeLower.includes('ted') && projCompLower.includes('ted')) return true;
      if (activeLower.includes('design') && projCompLower.includes('design')) return true;
      if (activeLower.includes('master') && projCompLower.includes('master')) return true;
      if (activeLower.includes('prime') && (projCompLower.includes('prime') || projCompLower.includes('pharma'))) return true;
      return projCompLower.includes(activeLower) || activeLower.includes(projCompLower);
    });
  }, [projects, activeComp]);

  // Current active project details
  const activeProject = useMemo(() => {
    return filteredProjects.find(p => p.id === activeProjectId) || filteredProjects[0] || projects[0];
  }, [filteredProjects, activeProjectId, projects]);

  useEffect(() => {
    if (filteredProjects.length > 0) {
      const exists = filteredProjects.some(p => p.id === activeProjectId);
      if (!exists) {
        setActiveProjectId(filteredProjects[0].id);
      }
    }
  }, [filteredProjects, activeProjectId]);

  // Derived company projects for company-level cost center calculation
  const companyProjects = useMemo(() => {
    if (!activeProject) return [];
    const activeCompany = activeProject.company || 'TED CAPITAL';
    return filteredProjects.filter(p => (p.company || 'TED CAPITAL') === activeCompany);
  }, [filteredProjects, activeProject]);

  const currentBoqItems = useMemo(() => {
    if (costCenterMode === 'company') {
      return boqItems.filter(i => companyProjects.some(cp => String(cp.id) === String(i.projectId)));
    }
    return boqItems.filter(i => String(i.projectId) === String(activeProjectId));
  }, [boqItems, activeProjectId, costCenterMode, companyProjects]);

  const currentExpenses = useMemo(() => {
    const allExpenses = [...expenses, ...dbExpenses];
    if (costCenterMode === 'company') {
      const activeCompany = activeProject?.company || 'TED CAPITAL';
      return allExpenses.filter(e => companyProjects.some(cp => String(cp.id) === String(e.projectId)) || String(e.projectId) === `company-overhead-${activeCompany}`);
    }
    return allExpenses.filter(e => String(e.projectId) === String(activeProjectId));
  }, [expenses, dbExpenses, activeProjectId, costCenterMode, companyProjects, activeProject]);

  const currentInstallments = useMemo(() => {
    if (costCenterMode === 'company') {
      return installments.filter(inst => companyProjects.some(cp => String(cp.id) === String(inst.projectId)));
    }
    return installments.filter(inst => String(inst.projectId) === String(activeProjectId));
  }, [installments, activeProjectId, costCenterMode, companyProjects]);

  const currentFiles = useMemo(() => {
    if (costCenterMode === 'company') {
      return projectFiles.filter(f => companyProjects.some(cp => String(cp.id) === String(f.projectId)));
    }
    return projectFiles.filter(f => String(f.projectId) === String(activeProjectId));
  }, [projectFiles, activeProjectId, costCenterMode, companyProjects]);

  const currentValuations = useMemo(() => {
    if (costCenterMode === 'company') {
      return valuations.filter(val => companyProjects.some(cp => String(cp.id) === String(val.projectId)));
    }
    return valuations.filter(val => String(val.projectId) === String(activeProjectId));
  }, [valuations, activeProjectId, costCenterMode, companyProjects]);

  // --- 2. ACTIVE VIEW NAVIGATION TAB STATE ---
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard | boq | expenses | client | files

  // Modals & form display states
  const [showAddProject, setShowAddProject] = useState(false);
  const [newProjectForm, setNewProjectForm] = useState({ name: '', clientName: '', company: 'TED CAPITAL', projectManager: '', startDate: '' });
  const [showEditProject, setShowEditProject] = useState(false);
  const [editProjectForm, setEditProjectForm] = useState({ name: '', clientName: '', company: 'TED CAPITAL', projectManager: '', startDate: '' });

  const [showAddBoq, setShowAddBoq] = useState(false);
  const [newBoq, setNewBoq] = useState({ category: 'أعمال صحي', item_name: '', quantity: 1, unit: 'م٢', price: 0, notes: '' });

  const [showAddExpense, setShowAddExpense] = useState(false);
  const [newExpense, setNewExpense] = useState({ beneficiary: '', category: 'أعمال صحي', unit: 'م٢', qty: 1, rate: 0, date: new Date().toISOString().split('T')[0], notes: '', allocationType: 'project' });

  const [selectedPrintInstallment, setSelectedPrintInstallment] = useState(null);
  const [showAddInstallment, setShowAddInstallment] = useState(false);
  const [newInstallment, setNewInstallment] = useState({
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    notes: '',
    valuationId: '',
    paymentMethod: 'نقدًا',
    referenceNo: ''
  });

  // 🏗️ Progress Claims (Valuations) Wizard States
  const [showAddValuation, setShowAddValuation] = useState(false);
  const [valuationDate, setValuationDate] = useState(new Date().toISOString().split('T')[0]);
  const [newValuationItems, setNewValuationItems] = useState({});
  const [valuationDiscount, setValuationDiscount] = useState('');
  const [valuationTax, setValuationTax] = useState('');
  const [valuationTaxMethod, setValuationTaxMethod] = useState('period'); // 'period' | 'cumulative' | 'waived'

  // 🏗️ Contractor-Side Progress Claims Wizard States
  const [showAddContractorValuation, setShowAddContractorValuation] = useState(false);
  const [contractorValuationDate, setContractorValuationDate] = useState(new Date().toISOString().split('T')[0]);
  const [contractorValuationLines, setContractorValuationLines] = useState([]);
  const [contractorValuationDiscount, setContractorValuationDiscount] = useState('');
  const [contractorValuationDiscountReason, setContractorValuationDiscountReason] = useState('');
  const [contractorValuationTax, setContractorValuationTax] = useState('');
  const [contractorValuationTaxMethod, setContractorValuationTaxMethod] = useState('waived'); // 'period' | 'cumulative' | 'waived'
  const [subcontractorsList, setSubcontractorsList] = useState([]);
  const [contractorValuationLinkedClientValId, setContractorValuationLinkedClientValId] = useState(''); // Keep variable name consistent if needed, but wait: the original is contractorValuationLinkedClientValId. Let's make sure it matches.
  const [contractorValuationPrevPaid, setContractorValuationPrevPaid] = useState('');
  const [contractorValuationContractorName, setContractorValuationContractorName] = useState('');

  // Quick Add Subcontractor States
  const [showQuickAddSub, setShowQuickAddSub] = useState(false);
  const [quickAddSubName, setQuickAddSubName] = useState('');
  const [quickAddSubPhone, setQuickAddSubPhone] = useState('');
  const [quickAddSubCompany, setQuickAddSubCompany] = useState('');
  const [quickAddSubEmail, setQuickAddSubEmail] = useState('');
  const [quickAddSubCompanyId, setQuickAddSubCompanyId] = useState('');
  const [companies, setCompanies] = useState([]);
  const [isAddingSub, setIsAddingSub] = useState(false);

  // Quick Add Customer States
  const [customers, setCustomers] = useState([]);
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerEmail, setNewCustomerEmail] = useState('');
  const [newCustomerCompanyId, setNewCustomerCompanyId] = useState('');
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [quickAddLineId, setQuickAddLineId] = useState(null);
  const [editingValuationId, setEditingValuationId] = useState(null);

  // Inline editing states (CRUD updates)
  const [editingItemType, setEditingItemType] = useState(null); // 'boq' | 'expense' | 'installment'
  const [editingItemId, setEditingItemId] = useState(null);
  const [editForm, setEditForm] = useState({});

  // File Manager States
  const [openedFile, setOpenedFile] = useState(null);
  const [fileEditorContent, setFileEditorContent] = useState('');
  const [autoSaveStatus, setAutoSaveStatus] = useState('idle'); // idle | saving | saved
  const fileInputRef = useRef(null);

  const getFileIcon = (fileName, fileType) => {
    const name = (fileName || '').toLowerCase();
    const type = (fileType || '').toLowerCase();
    if (name.endsWith('.pdf') || type === 'application/pdf') return '📕';
    if (name.endsWith('.xls') || name.endsWith('.xlsx') || name.endsWith('.csv') || type.includes('excel') || type.includes('spreadsheet') || type.includes('csv')) return '📊';
    if (name.endsWith('.doc') || name.endsWith('.docx') || type.includes('word') || type.includes('officedocument.wordprocessingml')) return '📘';
    if (name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.gif') || name.endsWith('.webp') || name.endsWith('.svg') || type.startsWith('image/')) return '🖼️';
    if (name.endsWith('.zip') || name.endsWith('.rar') || name.endsWith('.tar') || name.endsWith('.gz') || name.endsWith('.7z') || type.includes('zip') || type.includes('compressed')) return '📦';
    return '📝';
  };

  // Helper to dynamically style contractor notes
  const getNoteStyle = (note) => {
    if (!note) return {};
    const text = note.toLowerCase();
    if (text.includes('إداري') || text.includes('المبني') || text.includes('المبنى') || text.includes('اداري')) {
      return { backgroundColor: '#fdf6e2', borderColor: '#ffeeba', color: '#856404' };
    }
    if (text.includes('واجهة') || text.includes('واجهات') || text.includes('خارجي') || text.includes('خارجى')) {
      return { backgroundColor: '#e2f0fd', borderColor: '#b8daff', color: '#1b4a72' };
    }
    return {};
  };

  // Search & Filter
  const [expenseSearch, setExpenseSearch] = useState('');
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState('All');

  // Reversal toasts / alerts notification state
  const [notification, setNotification] = useState(null);

  // 🖨️ PDF Printing & Valuation History Details States
  const [selectedPrintValuation, setSelectedPrintValuation] = useState(null);
  const [expandedValuationId, setExpandedValuationId] = useState(null);

  // Categories list mapping
  const boqCategories = [
    "أعمال صحي",
    "أعمال عزل",
    "أعمال كهرباء",
    "أعمال تأسيس تكييف",
    "أعمال توريد وتركيب تكييف - HVAC",
    "أعمال تركيب تكييف",
    "أعمال بياض محاره",
    "أعمال دهانات",
    "أعمال دهانات MICRO CEMENT",
    "أعمال دهانات إيبوكسي",
    "أعمال دهانات أستر",
    "أعمال توريد وتركيب أبواب داخلية",
    "أعمال توريد وتركيب باب مصفح",
    "أعمال ألوميتال",
    "أعمال شيش حصره ( SHUTTER )",
    "أعمال سيراميك حوائط",
    "أعمال بورسلين أرضيات",
    "أعمال بورسلين طاولات",
    "أعمال رخام أرضيات",
    "أعمال رخام حوائط",
    "أعمال توريد وتركيب وزر رخام",
    "أعمال جلي وتلميع رخام",
    "أعمال رخام مطبخ",
    "أعمال تركيب زوايا حوائط",
    "أعمال جيبسوم بورد أبيض",
    "أعمال جيبسوم بورد أخضر ( MR )",
    "أعمال جيبسوم بورد أحمر ( FR )",
    "أعمال أسقف بلاطات",
    "أعمال تجاليد CEMENT BOARD",
    "أعمال بانوهات",
    "أعمال تجاليد خشبيه",
    "أعمال لاند سكيب",
    "أعمال شبكة رى",
    "أعمال أنظمة أمان وكاميرات",
    "أعمال موبيليا",
    "أعمال تنجيد",
    "أعمال تعديلات إنشائية",
    "أعمال سقاله",
    "أعمال نظافه",
    "أعمال تصميم",
    "إكراميات ونثريات",
    "أعمال توريد أجهزة كهربائية",
    "أعمال سيكا",
    "عماله",
    "أعمال مكافحة حريق",
    "أعمال نقل",
    "توريد وتركيب لوكرات واستندات",
    "أعمال فيرفورجيه ومشغولات حديد",
    "أعمال توريد كبائن سيكوريت",
    "أعمال توريد وتركيب سيكوريت",
    "أعمال توريد وتركيب أرضيات موكيت",
    "أعمال توريد وتركيب أرضيات HDF",
    "أعمال توريد وتركيب وزر خشبي",
    "أعمال مصاعد",
    "أعمال توريد وصب خرسانه",
    "أعمال مباني",
    "أعمال توريدات",
    "أعمال مقاولين من الباطن",
    "مصروفات المخازن",
    "مصروفات أخرى"
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
    const totalValuations = currentValuations.reduce((acc, curr) => acc + Number(curr.totalCurrent || 0), 0);

    const estProfit = totalBOQ - totalExpenses;
    const remainingClient = totalBOQ - totalCollected;
    const progressPercent = totalBOQ > 0 ? (totalCollected / totalBOQ) * 100 : 0;
    const valuationProgressPercent = totalBOQ > 0 ? (totalValuations / totalBOQ) * 100 : 0;
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
      totalValuations,
      estProfit,
      remainingClient,
      progressPercent,
      valuationProgressPercent,
      costPercent,
      expByCategory,
      boqByCategory
    };
  }, [currentBoqItems, currentExpenses, currentInstallments, currentValuations]);

  // Helper to fetch cumulative completion percent for a BOQ item prior to this claim
  const getPrevCompletionPercent = (boqItemId, currentValuationId = null) => {
    let total = 0;
    valuations.forEach(val => {
      if (val.projectId === activeProjectId && val.id !== currentValuationId && val.id !== editingValuationId) {
        const item = val.items?.find(it => String(it.boqItemId) === String(boqItemId));
        if (item) {
          total += Number(item.netPercent !== undefined ? item.netPercent : item.completionPercent || 0);
        }
      }
    });
    return Math.min(100, total);
  };

  // Helper to fetch contractor financial position: Cumulative Works, Previous Spent, Current Net Due
  const getContractorFinancialPosition = (contractorName, refDate, currentValuationId = null, currentLines = []) => {
    if (!contractorName) return { cumulativeWorks: 0, previousSpent: 0, currentNetDue: 0 };
    const cName = contractorName.trim().toLowerCase();

    // 1. Cumulative Works: Sum of quantity * unitPrice for each subcontractor line in all contractor valuations up to refDate
    let cumulativeWorks = 0;
    
    // Gather all contractor valuations for this project
    let contractorVals = valuations.filter(v => v.isContractor && String(v.projectId) === String(activeProjectId));
    
    // If refDate is specified, filter valuations up to refDate
    if (refDate) {
      contractorVals = contractorVals.filter(v => {
        if (v.id === currentValuationId || v.id === editingValuationId) return false;
        return (v.date || '') <= refDate;
      });
    }

    // Sum from historical contractor valuations
    contractorVals.forEach(val => {
      val.lines?.forEach(ln => {
        if (ln.contractorName?.trim().toLowerCase() === cName) {
          cumulativeWorks += ln.total !== undefined ? Number(ln.total) : (Number(ln.quantity || 0) * Number(ln.unitPrice || 0));
        }
      });
    });

    // Also include current lines if we are inside the wizard or viewing a specific unsaved valuation
    if (currentLines && currentLines.length > 0) {
      currentLines.forEach(ln => {
        const lnContractor = ln.contractorName || contractorValuationContractorName;
        if (lnContractor?.trim().toLowerCase() === cName) {
          cumulativeWorks += ln.total !== undefined ? Number(ln.total) : (Number(ln.quantity || 0) * Number(ln.unitPrice || 0));
        }
      });
    } else if (currentValuationId) {
      const activeValObj = valuations.find(v => v.id === currentValuationId);
      if (activeValObj) {
        activeValObj.lines?.forEach(ln => {
          if (ln.contractorName?.trim().toLowerCase() === cName) {
            cumulativeWorks += ln.total !== undefined ? Number(ln.total) : (Number(ln.quantity || 0) * Number(ln.unitPrice || 0));
          }
        });
      }
    }

    // 2. Previous Spent: Sum of all expenses (expenses + dbExpenses) matching the contractor's name (beneficiary) with a date earlier than or equal to the valuation date.
    // Summed at the project level (matching by project ID or name).
    const allExpenses = [...expenses, ...dbExpenses];
    
    let previousSpent = allExpenses
      .filter(e => {
        const projObj = projects.find(p => String(p.id) === String(e.projectId));
        const isProjectMatch = 
          String(e.projectId) === String(activeProjectId) ||
          (projObj && activeProject && projObj.name.trim().toLowerCase() === activeProject.name.trim().toLowerCase());

        const isBeneficiaryMatch = e.beneficiary?.trim().toLowerCase() === cName;
        let isDateEarlier = true;
        if (refDate && e.date) {
          isDateEarlier = e.date <= refDate;
        }
        return isProjectMatch && isBeneficiaryMatch && isDateEarlier;
      })
      .reduce((sum, e) => sum + Number(e.total || 0), 0);

    // Fallback: If previousSpent is 0, check the subcontractorsList paid_amount directly as a fallback
    if (previousSpent === 0) {
      const sub = subcontractorsList.find(s => 
        s.name?.trim().toLowerCase() === cName &&
        (!s.project_name || s.project_name === activeProject?.name)
      );
      if (sub && Number(sub.paid_amount) > 0) {
        previousSpent = Number(sub.paid_amount);
      }
    }

    // 3. Current Net Due: Cumulative Works - Previous Spent
    const currentNetDue = cumulativeWorks - previousSpent;

    return {
      cumulativeWorks: Math.round(cumulativeWorks * 100) / 100,
      previousSpent: Math.round(previousSpent * 100) / 100,
      currentNetDue: Math.round(currentNetDue * 100) / 100
    };
  };

  // --- 4. CRUD OPERATIONS (WITH AUTOMATIC REVERSAL IMPLEMENTED) ---

  // Projects CRUD
  const handleCreateProject = async (e) => {
    e.preventDefault();
    if (!newProjectForm.name) return;
    try {
      const payload = {
        name: newProjectForm.name,
        client_name: newProjectForm.clientName || 'عميل عام',
        company: newProjectForm.company || 'TED CAPITAL',
        project_manager: newProjectForm.projectManager || '',
        start_date: newProjectForm.startDate || null,
        status: 'Active'
      };

      const response = await api.post('/dynamic/add/projects', payload);
      const createdId = String(response.data.id);

      const newProj = {
        id: createdId,
        name: newProjectForm.name,
        clientName: newProjectForm.clientName || 'عميل عام',
        company: newProjectForm.company || 'TED CAPITAL',
        projectManager: newProjectForm.projectManager || '',
        startDate: newProjectForm.startDate || ''
      };

      setProjects([...projects, newProj]);
      setActiveProjectId(createdId);
      setNewProjectForm({ name: '', clientName: '', company: 'TED CAPITAL', projectManager: '', startDate: '' });
      setShowAddProject(false);
      triggerNotification(`تم إنشاء مشروع جديد: ${newProj.name} 🏢`);
    } catch (err) {
      console.error("Failed to create project on DB:", err);
      alert(err.response?.data?.error || 'فشل في إنشاء المشروع في قاعدة البيانات.');
    }
  };

  const handleStartEditProject = () => {
    if (!activeProject) return;
    setEditProjectForm({
      name: activeProject.name || '',
      clientName: activeProject.clientName || 'عميل عام',
      company: activeProject.company || 'TED CAPITAL',
      projectManager: activeProject.projectManager || '',
      startDate: activeProject.startDate || ''
    });
    setShowEditProject(true);
    setShowAddProject(false);
  };

  const handleEditProject = async (e) => {
    e.preventDefault();
    if (!editProjectForm.name) return;
    try {
      const payload = {
        name: editProjectForm.name,
        client_name: editProjectForm.clientName || 'عميل عام',
        company: editProjectForm.company || 'TED CAPITAL',
        project_manager: editProjectForm.projectManager || '',
        start_date: editProjectForm.startDate || null
      };

      const isDbProject = !isNaN(Number(activeProjectId));
      if (isDbProject) {
        await api.put(`/dynamic/update/projects/${activeProjectId}`, payload);
      }

      setProjects(prev => prev.map(p => {
        if (String(p.id) === String(activeProjectId)) {
          return {
            ...p,
            name: editProjectForm.name,
            clientName: editProjectForm.clientName || 'عميل عام',
            company: editProjectForm.company || 'TED CAPITAL',
            projectManager: editProjectForm.projectManager || '',
            startDate: editProjectForm.startDate || ''
          };
        }
        return p;
      }));

      setShowEditProject(false);
      triggerNotification(`تم تعديل بيانات المشروع بنجاح: ${editProjectForm.name} ✏️`);
    } catch (err) {
      console.error("Failed to edit project on DB:", err);
      alert(err.response?.data?.error || 'فشل في تحديث المشروع في قاعدة البيانات.');
    }
  };

  const handleDeleteProject = async (projId) => {
    if (projects.length <= 1) {
      alert('لا يمكن حذف المشروع الأخير المتبقي في النظام.');
      return;
    }
    if (!window.confirm('🚨 تحذير هام: هل أنت متأكد من حذف هذا المشروع بالكامل؟ سيؤدي ذلك إلى إلغاء جميع البنود والمصاريف المرتبطة به وعكس كل التأثيرات المالية.')) return;

    const isDbProject = !isNaN(Number(projId));
    if (isDbProject) {
      try {
        await api.put(`/dynamic/update/projects/${projId}`, { is_deleted: true });
        triggerNotification('💥 تم حذف المشروع من قاعدة البيانات وعكس جميع تأثيراته المالية والقيود المحاسبية بنجاح!', 'warning');
        await fetchAllData();
      } catch (err) {
        console.error("Failed to delete project on DB:", err);
        alert(err.response?.data?.error || 'فشل في حذف المشروع في قاعدة البيانات.');
      }
    } else {
      // Financial Impact Reversal: Clean up all items linked to this project
      setBoqItems(prev => prev.filter(i => i.projectId !== projId));
      setExpenses(prev => prev.filter(e => e.projectId !== projId));
      setInstallments(prev => prev.filter(inst => inst.projectId !== projId));
      setProjectFiles(prev => prev.filter(f => f.projectId !== projId));

      const remaining = projects.filter(p => p.id !== projId);
      setProjects(remaining);
      setActiveProjectId(remaining[0].id);
      triggerNotification('💥 تم حذف المشروع وعكس جميع تأثيراته المالية والقيود المحاسبية بنجاح!', 'warning');
    }
  };

  // BOQ Item CRUD
  const handleAddBoq = async (e) => {
    e.preventDefault();
    if (!newBoq.item_name || newBoq.price <= 0) return;
    const total = Number(newBoq.quantity) * Number(newBoq.price);

    const isDbProject = !isNaN(Number(activeProjectId));
    if (isDbProject) {
      try {
        const payload = {
          project_name: activeProject.name,
          item_name: newBoq.item_name,
          material_category: newBoq.category,
          uom: newBoq.unit,
          est_qty: Number(newBoq.quantity),
          est_unit_price: Number(newBoq.price),
          est_total_price: total,
          item_desc: newBoq.notes || ''
        };
        await api.post('/dynamic/add/boq', payload);
        triggerNotification('📝 تم إضافة بند جديد للمقايسة بنجاح!');
        await fetchAllData();
      } catch (err) {
        console.error("Failed to add BOQ to DB:", err);
        alert(err.response?.data?.error || 'فشل في إضافة البند في قاعدة البيانات.');
      }
    } else {
      const newItem = {
        id: Date.now(),
        projectId: activeProjectId,
        ...newBoq,
        quantity: Number(newBoq.quantity),
        price: Number(newBoq.price),
        total
      };
      setBoqItems([...boqItems, newItem]);
      triggerNotification('📝 تم إضافة بند جديد للمقايسة وتحديث الميزانية بنجاح!');
    }

    setNewBoq({ category: 'أعمال صحي', item_name: '', quantity: 1, unit: 'م٢', price: 0, notes: '' });
    setShowAddBoq(false);
  };

  const handleStartEditBoq = (item) => {
    setEditingItemType('boq');
    setEditingItemId(item.id);
    setEditForm({ ...item });
  };

  const handleSaveEditBoq = async (e) => {
    e.preventDefault();
    const qty = Number(editForm.quantity);
    const price = Number(editForm.price);
    const total = qty * price;

    const isDbItem = !isNaN(Number(editingItemId));
    if (isDbItem) {
      try {
        const payload = {
          material_category: editForm.category,
          item_name: editForm.item_name,
          uom: editForm.unit,
          est_qty: qty,
          est_unit_price: price,
          est_total_price: total,
          item_desc: editForm.notes || ''
        };
        await api.put(`/dynamic/update/boq/${editingItemId}`, payload);
        triggerNotification('✍️ تم تعديل بند المقايسة وإعادة احتساب الأرباح بنجاح!');
        await fetchAllData();
      } catch (err) {
        console.error("Failed to update BOQ on DB:", err);
        alert(err.response?.data?.error || 'فشل في تحديث البند في قاعدة البيانات.');
      }
    } else {
      setBoqItems(prev => prev.map(item => {
        if (item.id === editingItemId) {
          return {
            ...item,
            category: editForm.category,
            item_name: editForm.item_name,
            quantity: qty,
            price,
            notes: editForm.notes,
            total
          };
        }
        return item;
      }));
      triggerNotification('✍️ تم تعديل بند المقايسة وإعادة احتساب الأرباح بنجاح!');
    }

    setEditingItemType(null);
    setEditingItemId(null);
  };

  const handleDeleteBoq = async (itemId) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا البند من المقايسة وعكس جميع الحسابات ذات الصلة؟')) return;

    const isDbItem = !isNaN(Number(itemId));
    if (isDbItem) {
      try {
        await api.delete(`/dynamic/delete/boq/${itemId}`);
        triggerNotification('💥 تم حذف بند المقايسة من قاعدة البيانات وعكس تأثيره المالي.', 'warning');
        await fetchAllData();
      } catch (err) {
        console.error("Failed to delete BOQ from DB:", err);
        alert(err.response?.data?.error || 'فشل في حذف البند من قاعدة البيانات.');
      }
    } else {
      setBoqItems(prev => prev.filter(item => item.id !== itemId));
      triggerNotification('💥 تم حذف بند المقايسة وعكس تأثيره المالي بالكامل من كشف حساب العميل والربحية.', 'warning');
    }
  };

  // Expenses CRUD
  const handleAddExpense = async (e) => {
    e.preventDefault();
    if (!newExpense.beneficiary || newExpense.rate <= 0) return;
    const total = Number(newExpense.qty) * Number(newExpense.rate);
    const activeCompany = activeProject?.company || 'TED CAPITAL';

    const isDbProject = !isNaN(Number(activeProjectId));
    if (isDbProject) {
      try {
        const payload = {
          description: newExpense.notes || `${newExpense.category} - ${newExpense.beneficiary}`,
          amount: total,
          currency: 'EGP',
          category_id: 3, // Project Specific Costs
          project_id: newExpense.allocationType === 'company' ? null : parseInt(activeProjectId),
          expense_date: newExpense.date,
          payment_method: 'Cash',
          supplier_name: newExpense.beneficiary,
          company_entity: activeCompany,
          metadata: {
            category: newExpense.category,
            unit: newExpense.unit,
            qty: Number(newExpense.qty),
            rate: Number(newExpense.rate),
            allocationType: newExpense.allocationType,
            beneficiary: newExpense.beneficiary,
            projectId: newExpense.allocationType === 'company' ? `company-overhead-${activeCompany}` : activeProjectId
          },
          auto_post: true
        };
        await api.post('/expenses', payload);
        triggerNotification('💸 تم تسجيل مصروف جديد وتثبيت القيد المالي في قاعدة البيانات!');
        await fetchAllData();
      } catch (err) {
        console.error("Failed to save expense to DB:", err);
        alert(err.response?.data?.error || 'فشل في حفظ المصروف في قاعدة البيانات.');
      }
    } else {
      const newItem = {
        id: Date.now(),
        projectId: newExpense.allocationType === 'company' ? `company-overhead-${activeCompany}` : activeProjectId,
        ...newExpense,
        qty: Number(newExpense.qty),
        rate: Number(newExpense.rate),
        total
      };
      setExpenses([...expenses, newItem]);
      triggerNotification('💸 تم تسجيل مصروف جديد وتثبيت القيد المالي في النظام!');
    }

    setNewExpense({ beneficiary: '', category: 'أعمال صحي', unit: 'م٢', qty: 1, rate: 0, date: new Date().toISOString().split('T')[0], notes: '', allocationType: 'project' });
    setShowAddExpense(false);
  };

  const handleStartEditExpense = (item) => {
    setEditingItemType('expense');
    setEditingItemId(item.id);
    const isCompanyOverhead = String(item.projectId).startsWith('company-overhead-');
    setEditForm({
      ...item,
      allocationType: isCompanyOverhead ? 'company' : 'project'
    });
  };

  const handleSaveEditExpense = async (e) => {
    e.preventDefault();
    const isDbItem = !isNaN(Number(editingItemId));
    if (isDbItem) {
      try {
        const qty = Number(editForm.qty);
        const rate = Number(editForm.rate);
        const total = qty * rate;
        const activeCompany = activeProject?.company || 'TED CAPITAL';
        const payload = {
          description: editForm.notes || `${editForm.category} - ${editForm.beneficiary}`,
          amount: total,
          currency: 'EGP',
          category_id: 3, // Project Specific Costs
          project_id: editForm.allocationType === 'company' ? null : parseInt(activeProjectId),
          expense_date: editForm.date,
          payment_method: 'Cash',
          supplier_name: editForm.beneficiary,
          company_entity: activeCompany,
          metadata: {
            category: editForm.category,
            unit: editForm.unit,
            qty,
            rate,
            allocationType: editForm.allocationType,
            beneficiary: editForm.beneficiary,
            projectId: editForm.allocationType === 'company' ? `company-overhead-${activeCompany}` : activeProjectId
          }
        };
        await api.put(`/expenses/${editingItemId}`, payload);
        triggerNotification('✍️ تم تعديل المصروف بنجاح في قاعدة البيانات.');
        await fetchAllData();
      } catch (err) {
        console.error("Failed to update expense in DB:", err);
        alert(err.response?.data?.error || 'فشل في تحديث المصروف بقاعدة البيانات.');
      }
    } else {
      setExpenses(prev => prev.map(item => {
        if (item.id === editingItemId) {
          const qty = Number(editForm.qty);
          const rate = Number(editForm.rate);
          const activeCompany = activeProject?.company || 'TED CAPITAL';
          return {
            ...item,
            projectId: editForm.allocationType === 'company' ? `company-overhead-${activeCompany}` : activeProjectId,
            beneficiary: editForm.beneficiary,
            category: editForm.category,
            unit: editForm.unit,
            qty,
            rate,
            notes: editForm.notes,
            date: editForm.date,
            allocationType: editForm.allocationType,
            total: qty * rate
          };
        }
        return item;
      }));
      triggerNotification('✍️ تم تعديل المصروف وإعادة توزيع التكاليف الفعليه.');
    }
    setEditingItemType(null);
    setEditingItemId(null);
  };

  const handleDeleteExpense = async (itemId) => {
    // 1. If it's a database-backed stock issue/return transaction
    if (String(itemId).startsWith('db-sale-')) {
      const dbId = parseInt(itemId.replace('db-sale-', ''));
      const sale = rawSales.find(s => s.id === dbId);
      if (!sale) {
        alert('لم يتم العثور على سجل العملية في البيانات.');
        return;
      }

      const docNo = sale.reference_no;
      const linkedSales = docNo ? rawSales.filter(s => s.reference_no === docNo) : [sale];
      const docTypeLabel = Number(sale.qty || 0) < 0 ? 'صرف مخزني' : 'مرتجع مخزني';

      const confirmMsg = `⚠️ تحذير: هل أنت متأكد من حذف حركة ${docTypeLabel} رقم ${docNo || 'N/A'} بالكامل؟\n\nسيقوم النظام تلقائياً بـ:\n• حذف السجل من قاعدة البيانات\n• عكس جميع القيود المحاسبية المرتبطة بالكامل\n• إعادة البضاعة والكميات للمستودع`;
      if (!window.confirm(confirmMsg)) return;

      try {
        // Step A: Restore inventory quantities (reverse the original quantity change)
        const invRes = await api.get('/dynamic/table/inventory_items?limit=1000').catch(() => ({ data: { data: [] } }));
        const allItems = invRes.data?.data || [];

        const inventoryRestorePromises = linkedSales.map(async (saleItem) => {
          const qtyChange = Number(saleItem.qty || 0); // negative for issues, positive for returns
          if (saleItem.inventory_id && Math.abs(qtyChange) > 0) {
            const invItem = allItems.find(i => Number(i.id) === Number(saleItem.inventory_id));
            if (invItem) {
              const newQty = Number(invItem.remaining_qty || 0) - qtyChange; // reverse the change
              await api.put(`/dynamic/update/inventory_items/${saleItem.inventory_id}`, {
                remaining_qty: Math.max(0, newQty)
              });
            }
          }
        });
        await Promise.all(inventoryRestorePromises);

        // Step B: Soft-delete linked inventory_sales records
        const deleteSalesPromises = linkedSales.map(saleItem =>
          api.put(`/dynamic/update/inventory_sales/${saleItem.id}`, {
            is_deleted: true,
            deleted_by: 'Admin',
            deleted_at: new Date().toISOString()
          })
        );
        await Promise.all(deleteSalesPromises);

        // Step C: Post REVERSAL ledger entries (swap Dr/Cr)
        if (docNo) {
          const ledgerRes = await api.get(`/dynamic/table/ledger?limit=1000&filter=${encodeURIComponent(docNo)}`);
          const linkedLedger = ledgerRes.data?.data || [];

          const reversalDate = new Date().toISOString().split('T')[0];
          const reversalDocNo = `REV-${docNo}`;
          const activeCompany = activeProject?.company || 'TED CAPITAL';
          const activeCompanyId = activeCompany === 'PRIMEMED PHARMA' ? 4 : 1;

          const reversalPosts = linkedLedger.map(entry => ({
            date: reversalDate,
            account_name: entry.account_name,
            debit: Number(entry.credit || 0),
            credit: Number(entry.debit || 0),
            description: `[عكس قيد] ${reversalDocNo} — عكس: ${entry.description || ''}`,
            cost_center: entry.cost_center || 'تسوية حذف',
            company: entry.company || activeCompany,
            company_id: entry.company_id || activeCompanyId
          })).filter(p => p.debit > 0 || p.credit > 0);

          if (reversalPosts.length > 0) {
            await Promise.all(reversalPosts.map(post => api.post('/dynamic/add/ledger', post)));
          }
        }

        // Step D: Reload all data to reflect deletion
        await fetchAllData();
        triggerNotification('💥 تم حذف المصروف وعكس الحركة المالية والقيود وإعادة كميات المخزن بنجاح!', 'warning');

      } catch (err) {
        console.error('Failed to delete expense transaction:', err);
        alert('حدث خطأ أثناء تنفيذ عملية الحذف والعكس.');
      }

    } else {
      // 2. Otherwise delete local expense stored in localStorage
      if (!window.confirm('هل أنت متأكد من حذف هذا المصروف؟ سيتم إرجاع المبلغ المصروف بالكامل للميزانية وعكس القيد المالي.')) return;
      const isDbItem = !isNaN(Number(itemId));
      if (isDbItem) {
        try {
          await api.delete(`/expenses/${itemId}`);
          triggerNotification('💥 تم حذف المصروف وعكس الحركة المالية بنجاح من قاعدة البيانات!', 'warning');
          await fetchAllData();
        } catch (err) {
          console.error("Failed to delete expense from DB:", err);
          alert(err.response?.data?.error || 'فشل في حذف المصروف من قاعدة البيانات.');
        }
      } else {
        setExpenses(prev => prev.filter(item => item.id !== itemId));
        triggerNotification('💥 تم حذف المصروف وعكس الحركة المالية بنجاح! زاد صافي الربح بمقدار المبلغ المسترد.', 'warning');
      }
    }
  };

  // Client Installments CRUD
  // Client Installments CRUD
  const handleAddInstallment = async (e) => {
    e.preventDefault();
    if (newInstallment.amount <= 0) return;

    const isDbProject = !isNaN(Number(activeProjectId));
    const newItem = {
      id: Date.now(),
      projectId: activeProjectId,
      amount: Number(newInstallment.amount),
      date: newInstallment.date,
      notes: newInstallment.notes,
      valuationId: newInstallment.valuationId || '',
      paymentMethod: newInstallment.paymentMethod || 'نقدًا',
      referenceNo: newInstallment.referenceNo || ''
    };

    if (newInstallment.valuationId) {
      const selectedVal = valuations.find(v => v.id === newInstallment.valuationId);
      if (selectedVal) {
        newItem.notes = newItem.notes || `سداد دفعة للمستخلص رقم ${selectedVal.claimNo}`;
      }
    }

    if (isDbProject) {
      try {
        const payload = {
          project_id: Number(activeProjectId),
          amount: Number(newInstallment.amount),
          payment_date: newInstallment.date,
          payment_method: newInstallment.paymentMethod || 'نقدًا',
          reference_no: newInstallment.referenceNo || '',
          notes: newItem.notes || `تحصيل دفعة للمشروع`,
          valuation_id: newInstallment.valuationId ? (isNaN(Number(newInstallment.valuationId)) ? null : Number(newInstallment.valuationId)) : null
        };
        await api.post('/projects/record_collection', payload);
        triggerNotification('💳 تم تسجيل الدفعة بنجاح وقيد القيود المحاسبية وتعديل حالة المستخلص!');
        await fetchAllData();
      } catch (err) {
        console.error("Failed to save installment to DB:", err);
        alert(err.response?.data?.error || 'فشل في حفظ الدفعة بقاعدة البيانات.');
      }
    } else {
      setInstallments([...installments, newItem]);
      triggerNotification('💳 تم قيد الدفعة المستلمة من العميل وربطها بالمستخلص بنجاح!');
    }

    setNewInstallment({
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      notes: '',
      valuationId: '',
      paymentMethod: 'نقدًا',
      referenceNo: ''
    });
    setShowAddInstallment(false);
  };

  // Helper to dynamically calculate subcontractor cumulative work, payments (expenses), and outstanding balance
  const getSubcontractorFinancialPosition = (contractorName, projectId, targetValuation = null, currentLines = []) => {
    if (!contractorName) return { totalCumulative: 0, paidExpenses: 0, netOutstanding: 0 };
    const cName = contractorName.trim().toLowerCase();

    // Gather all contractor valuations for this project
    let contractorVals = valuations.filter(v => v.isContractor && String(v.projectId) === String(projectId));

    // If targetValuation is specified, filter valuations up to the target's date/id
    if (targetValuation) {
      contractorVals = contractorVals.filter(v => {
        if (v.date !== targetValuation.date) {
          return new Date(v.date) <= new Date(targetValuation.date);
        }
        return v.id <= targetValuation.id;
      });
    }

    const isUnsavedTarget = targetValuation && (targetValuation.id === 'temp' || !valuations.some(v => v.id === targetValuation.id));
    if (currentLines.length > 0 && (!targetValuation || isUnsavedTarget)) {
      const gross = currentLines.reduce((s, l) => s + (Number(l.quantity) * Number(l.unitPrice)), 0);
      const discountAmt = contractorValuationDiscount ? Number(contractorValuationDiscount) : 0;
      const afterDiscount = gross - discountAmt;
      const taxRatePercent = contractorValuationTax ? Number(contractorValuationTax) : 0;
      let taxAmt = 0;
      if (contractorValuationTaxMethod === 'period') {
        taxAmt = afterDiscount * (taxRatePercent / 100);
      } else if (contractorValuationTaxMethod === 'cumulative') {
        let cumulativeGross = 0;
        currentLines.forEach(ln => {
          let prevQty = 0;
          valuations.forEach(val => {
            if (val.isContractor && String(val.projectId) === String(projectId)) {
              val.lines?.forEach(prevLn => {
                if (
                  String(prevLn.boqItemId) === String(ln.boqItemId) &&
                  prevLn.contractorName?.trim().toLowerCase() === (ln.contractorName || contractorValuationContractorName)?.trim().toLowerCase()
                ) {
                  prevQty += Number(prevLn.quantity || 0);
                }
              });
            }
          });
          const cumulativeQty = prevQty + Number(ln.quantity || 0);
          cumulativeGross += cumulativeQty * Number(ln.unitPrice || 0);
        });
        const prevTaxPaid = valuations
          .filter(v => v.isContractor && String(v.projectId) === String(projectId))
          .reduce((sum, v) => sum + Number(v.taxAmount || 0), 0);
        const cumulativeTax = cumulativeGross * (taxRatePercent / 100);
        taxAmt = Math.max(0, cumulativeTax - prevTaxPaid);
      } else {
        taxAmt = 0;
      }

      if (!contractorVals.some(v => v.id === 'temp')) {
        contractorVals.push({
          id: 'temp',
          date: contractorValuationDate,
          lines: currentLines,
          totalCurrent: gross,
          discount: discountAmt,
          taxAmount: taxAmt,
          totalFinal: afterDiscount + taxAmt
        });
      }
    }

    let totalCumulative = 0;
    contractorVals.forEach(val => {
      const matchLines = val.lines?.filter(l => (l.contractorName || contractorValuationContractorName)?.trim().toLowerCase() === cName) || [];
      if (matchLines.length === 0) return;

      const contractorGross = matchLines.reduce((s, l) => s + Number(l.total || (Number(l.quantity) * Number(l.unitPrice)) || 0), 0);
      const totalValGross = val.totalCurrent || val.lines?.reduce((s, l) => s + (Number(l.quantity) * Number(l.unitPrice)), 0) || 1;
      const shareRatio = totalValGross > 0 ? (contractorGross / totalValGross) : 0;

      const contractorDiscount = (val.discount || 0) * shareRatio;
      const contractorTax = (val.taxAmount || 0) * shareRatio;

      const contractorNet = contractorGross - contractorDiscount + contractorTax;
      totalCumulative += contractorNet;
    });

    const refDate = targetValuation ? targetValuation.date : (currentLines.length > 0 ? contractorValuationDate : new Date().toISOString().split('T')[0]);
    const paidExpenses = currentExpenses
      .filter(e => e.beneficiary?.trim().toLowerCase() === cName && (e.date || '') <= refDate)
      .reduce((sum, e) => sum + Number(e.total || 0), 0);

    const netOutstanding = totalCumulative - paidExpenses;

    return {
      totalCumulative: Math.round(totalCumulative * 100) / 100,
      paidExpenses: Math.round(paidExpenses * 100) / 100,
      netOutstanding: Math.round(netOutstanding * 100) / 100
    };
  };

  // 🏗️ Progress Claim / Valuation Billing Actions
  const handleStartNewValuation = () => {
    setEditingValuationId(null);
    const initItems = {};
    currentBoqItems.forEach(item => {
      const prevPercent = getPrevCompletionPercent(item.id);
      const prevQty = Number(((prevPercent / 100) * item.quantity).toFixed(2));
      initItems[item.id] = prevQty;
    });
    setNewValuationItems(initItems);
    setValuationDate(new Date().toISOString().split('T')[0]);
    setValuationDiscount('');
    setValuationTax('');
    setValuationTaxMethod('period');
    setShowAddValuation(true);
    setShowAddContractorValuation(false);
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  };

  // 📦 Contractor Valuation Line Helpers
  const newContractorLine = (overrideName = contractorValuationContractorName) => ({
    id: Date.now() + Math.random(),
    boqItemId: '',
    contractorName: overrideName || '',
    description: '',
    quantity: 0,
    unit: 'م٢',
    unitPrice: 0,
    prevQty: 0,
    percentage: 100,
    notes: ''
  });

  const addContractorLine = () => setContractorValuationLines(prev => [...prev, newContractorLine()]);

  const updateContractorLine = (lineId, field, value) => {
    setContractorValuationLines(prev => prev.map(l => {
      if (l.id === lineId) {
        let updated = { ...l, [field]: value };
        
        // Auto-fill from BOQ item
        if (field === 'boqItemId' && value) {
          const selectedItem = currentBoqItems.find(item => String(item.id) === String(value));
          if (selectedItem) {
            updated.unit = selectedItem.unit || 'م٢';
            updated.unitPrice = 0; // Default to 0, user-defined
            updated.description = selectedItem.item_name || '';
          }
        }
        
        // Auto-calculate previous quantity
        if (field === 'boqItemId' || field === 'contractorName') {
          const targetBoqId = field === 'boqItemId' ? value : l.boqItemId;
          const targetContractor = field === 'contractorName' ? value : (l.contractorName || contractorValuationContractorName);
          
          if (targetBoqId && targetContractor) {
            let autoPrevQty = 0;
            valuations.forEach(val => {
              if (val.isContractor && String(val.projectId) === String(activeProjectId) && val.id !== editingValuationId) {
                val.lines?.forEach(prevLn => {
                  if (
                    String(prevLn.boqItemId) === String(targetBoqId) &&
                    (prevLn.contractorName || '').trim().toLowerCase() === targetContractor.trim().toLowerCase()
                  ) {
                    autoPrevQty += Number(prevLn.quantity || 0);
                  }
                });
              }
            });
            updated.prevQty = autoPrevQty;
          }
        }
        
        return updated;
      }
      return l;
    }));
  };

  const removeContractorLine = (lineId) =>
    setContractorValuationLines(prev => prev.filter(l => l.id !== lineId));

  const handleStartContractorValuation = () => {
    setEditingValuationId(null);
    setContractorValuationContractorName('');
    setContractorValuationLines([newContractorLine('')]);
    setContractorValuationDate(new Date().toISOString().split('T')[0]);
    setContractorValuationDiscount('');
    setContractorValuationDiscountReason('');
    setContractorValuationTax('');
    setContractorValuationLinkedClientValId('');
    setContractorValuationTaxMethod('waived');
    setContractorValuationPrevPaid('');
    setShowAddContractorValuation(true);
    setShowAddValuation(false);
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  };

  const handleStartEditValuation = (val) => {
    if (String(val.id).startsWith('db-sub-inv-')) {
      alert('لا يمكن تعديل هذا المستخلص المجلوب من قاعدة البيانات مباشرة.');
      return;
    }
    setEditingValuationId(val.id);
    setValuationDate(val.date);
    setValuationDiscount(val.discountRate !== undefined ? val.discountRate : '');
    setValuationTax(val.taxRate !== undefined ? val.taxRate : '');
    setValuationTaxMethod(val.taxMethod || 'period');
    
    const itemsMapping = {};
    val.items?.forEach(item => {
      itemsMapping[item.boqItemId] = item.currPercent !== undefined ? item.currPercent : item.completionPercent;
    });
    setNewValuationItems(itemsMapping);
    setShowAddValuation(true);
    setShowAddContractorValuation(false);
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  };

  const handleStartEditContractorValuation = (val) => {
    setEditingValuationId(val.id);
    setContractorValuationDate(val.date);
    setContractorValuationContractorName(val.lines?.[0]?.contractorName || '');
    setContractorValuationDiscount(val.discount !== undefined ? val.discount : '');
    setContractorValuationDiscountReason(val.discountReason || val.metadata?.discountReason || '');
    setContractorValuationTax(val.taxRate !== undefined ? val.taxRate : '');
    setContractorValuationTaxMethod(val.taxMethod || 'waived');
    setContractorValuationLinkedClientValId(val.linkedClientValuationId || '');
    setContractorValuationPrevPaid(val.prevPaid !== undefined ? val.prevPaid : '');
    setContractorValuationLines(val.lines || []);
    setShowAddContractorValuation(true);
    setShowAddValuation(false);
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  };

  const handleQuickAddSub = async (e) => {
    if (e) e.preventDefault();
    if (!quickAddSubName.trim()) {
      alert('الرجاء إدخال اسم المقاول');
      return;
    }
    setIsAddingSub(true);
    try {
      const parsedProjId = parseInt(activeProjectId, 10);
      const selectedComp = companies.find(c => Number(c.id) === Number(quickAddSubCompanyId));
      let resolvedCompanyId = selectedComp ? selectedComp.id : null;
      if (!resolvedCompanyId && activeProject?.company) {
        const matched = companies.find(c => c.name.toLowerCase() === activeProject.company.toLowerCase());
        if (matched) resolvedCompanyId = matched.id;
      }
      const payload = {
        name: quickAddSubName.trim(),
        phone: quickAddSubPhone.trim(),
        email: quickAddSubEmail.trim(),
        company: selectedComp ? selectedComp.name : (quickAddSubCompany.trim() || activeProject?.company || 'TED CAPITAL'),
        company_id: resolvedCompanyId,
        project_name: activeProject?.name || null,
        project_id: isNaN(parsedProjId) ? null : parsedProjId
      };
      await api.post('/add/subcontractors', payload);
      triggerNotification('🎉 تم تسجيل المقاول الجديد بنجاح!');
      // refresh subcontractorsList
      const subsRes = await api.get('/dynamic/table/subcontractors?limit=1000').catch(() => ({ data: { data: [] } }));
      const list = subsRes.data?.data || [];
      setSubcontractorsList(list);

      if (quickAddLineId) {
        updateContractorLine(quickAddLineId, 'contractorName', payload.name);
        setQuickAddLineId(null);
      } else {
        const newSub = payload.name;
        setContractorValuationContractorName(newSub);
        setContractorValuationLines(prev => prev.map(l => {
          let updated = { ...l, contractorName: newSub };
          if (l.boqItemId && newSub) {
            let autoPrevQty = 0;
            valuations.forEach(val => {
              if (val.isContractor && String(val.projectId) === String(activeProjectId) && val.id !== editingValuationId) {
                val.lines?.forEach(prevLn => {
                  if (
                    String(prevLn.boqItemId) === String(l.boqItemId) &&
                    (prevLn.contractorName || '').trim().toLowerCase() === newSub.trim().toLowerCase()
                  ) {
                    autoPrevQty += Number(prevLn.quantity || 0);
                  }
                });
              }
            });
            updated.prevQty = autoPrevQty;
          }
          return updated;
        }));
      }

      // clean up states
      setQuickAddSubName('');
      setQuickAddSubPhone('');
      setQuickAddSubEmail('');
      setQuickAddSubCompanyId('');
      setQuickAddSubCompany('');
      setShowQuickAddSub(false);
    } catch (err) {
      console.error('Failed to add subcontractor:', err);
      alert(err.response?.data?.error || 'حدث خطأ أثناء إضافة المقاول');
    } finally {
      setIsAddingSub(false);
    }
  };

  const handleQuickAddCustomer = async (e) => {
    if (e) e.preventDefault();
    if (!newCustomerName.trim()) {
      alert('الرجاء إدخال اسم العميل');
      return;
    }
    setIsAddingCustomer(true);

    const selectedComp = companies.find(c => Number(c.id) === Number(newCustomerCompanyId));

    try {
      const payload = {
        name: newCustomerName.trim(),
        phone: newCustomerPhone.trim() || '',
        company_name: selectedComp ? selectedComp.name : '',
        email: newCustomerEmail.trim() || '',
        company_id: newCustomerCompanyId ? Number(newCustomerCompanyId) : null,
        company: selectedComp ? selectedComp.name : null,
        created_at: new Date().toISOString()
      };
      const res = await api.post('/dynamic/add/customers', payload);
      const newCust = res.data?.data || { id: Date.now(), ...payload };
      
      setCustomers(prev => [newCust, ...prev]);
      
      if (showEditProject) {
        setEditProjectForm(prev => ({ ...prev, clientName: newCust.name }));
      } else {
        setNewProjectForm(prev => ({ ...prev, clientName: newCust.name }));
      }

      setNewCustomerName('');
      setNewCustomerPhone('');
      setNewCustomerEmail('');
      setNewCustomerCompanyId('');
      setShowAddCustomerModal(false);
      triggerNotification(`تمت إضافة العميل "${newCust.name}" واختياره بنجاح!`);
    } catch (err) {
      console.error('Error adding customer:', err);
      const fallbackCust = {
        id: Date.now(),
        name: newCustomerName.trim(),
        phone: newCustomerPhone.trim() || '',
        company_name: selectedComp ? selectedComp.name : '',
        email: newCustomerEmail.trim() || '',
        company_id: newCustomerCompanyId ? Number(newCustomerCompanyId) : null,
        company: selectedComp ? selectedComp.name : null
      };
      setCustomers(prev => [fallbackCust, ...prev]);
      if (showEditProject) {
        setEditProjectForm(prev => ({ ...prev, clientName: fallbackCust.name }));
      } else {
        setNewProjectForm(prev => ({ ...prev, clientName: fallbackCust.name }));
      }
      setNewCustomerName('');
      setNewCustomerPhone('');
      setNewCustomerEmail('');
      setNewCustomerCompanyId('');
      setShowAddCustomerModal(false);
      triggerNotification(`تمت إضافة العميل "${fallbackCust.name}" واختياره بنجاح!`);
    } finally {
      setIsAddingCustomer(false);
    }
  };

  const handleAddValuation = async (e) => {
    e.preventDefault();

    let totalClaimAmount = 0;
    const itemsList = [];

    currentBoqItems.forEach(item => {
      const prevPercent = getPrevCompletionPercent(item.id);
      const currPercentVal = newValuationItems[item.id] !== undefined ? newValuationItems[item.id] : prevPercent;
      const currPercent = Math.min(100, Math.max(prevPercent, Number(currPercentVal)));
      const netPercent = Math.max(0, currPercent - prevPercent);
      const netQty = (netPercent / 100) * item.quantity;
      const netClaimValue = netQty * item.price;
      totalClaimAmount += netClaimValue;
      itemsList.push({ boqItemId: item.id, completionPercent: currPercent, netPercent, currentAmount: netClaimValue, prevPercent, currPercent, netQty });
    });

    if (totalClaimAmount <= 0) {
      alert('إجمالي قيمة المستخلص الحالي يجب أن تكون أكبر من صفر. الرجاء زيادة نسبة الإنجاز عن النسبة السابقة.');
      return;
    }

    const discountRate = valuationDiscount ? Number(valuationDiscount) : 0;
    const discountAmt = totalClaimAmount * (discountRate / 100);
    const afterDiscount = totalClaimAmount - discountAmt;

    let taxAmt = 0;
    const taxRatePercent = valuationTax ? Number(valuationTax) : 0;
    if (valuationTaxMethod === 'period') {
      taxAmt = afterDiscount * (taxRatePercent / 100);
    } else if (valuationTaxMethod === 'cumulative') {
      let cumulativeGross = 0;
      itemsList.forEach(it => {
        const boqItem = boqItems.find(b => String(b.id) === String(it.boqItemId) && String(b.projectId) === String(activeProjectId));
        if (boqItem) {
          cumulativeGross += (it.currPercent / 100) * boqItem.quantity * boqItem.price;
        }
      });
      const prevTaxPaid = valuations
        .filter(v => !v.isContractor && String(v.projectId) === String(activeProjectId) && v.id !== editingValuationId)
        .reduce((sum, v) => sum + Number(v.taxAmount || 0), 0);
      const cumulativeTax = cumulativeGross * (taxRatePercent / 100);
      taxAmt = Math.max(0, cumulativeTax - prevTaxPaid);
    } else {
      taxAmt = 0;
    }

    const totalAfterAll = afterDiscount + taxAmt;

    const existingVal = editingValuationId ? valuations.find(v => v.id === editingValuationId) : null;
    const valuationId = existingVal ? existingVal.id : `val-${Date.now()}`;
    const claimNo = existingVal ? existingVal.claimNo : `VAL-${activeProject?.name.slice(0, 3).replace(/\s+/g, '').toUpperCase()}-${currentValuations.length + 1}`;
    const invoiceNo = existingVal ? existingVal.invoiceNo : `INV-${claimNo}-${Date.now().toString().slice(-4)}`;

    const newValuation = {
      id: valuationId,
      projectId: activeProjectId,
      claimNo,
      invoiceNo,
      date: valuationDate,
      items: itemsList,
      totalCurrent: totalClaimAmount,
      discount: discountAmt,
      discountRate: discountRate,
      taxRate: taxRatePercent,
      taxMethod: valuationTaxMethod,
      totalAfterDiscount: afterDiscount,
      taxAmount: taxAmt,
      totalFinal: totalAfterAll,
      status: 'issued'
    };

    const isDbProject = !isNaN(Number(activeProjectId));
    if (isDbProject) {
      try {
        const payload = {
          client_name: activeProject.clientName || 'عميل عام',
          project_name: activeProject.name,
          project_id: Number(activeProjectId),
          date: valuationDate,
          base_amount: totalClaimAmount,
          tax_percent: taxRatePercent,
          tax_amount: taxAmt,
          total_amount: totalAfterAll,
          status: 'issued',
          metadata: {
            claimNo,
            invoiceNo,
            discount: discountAmt,
            discountRate,
            taxRate: taxRatePercent,
            taxMethod: valuationTaxMethod,
            totalAfterDiscount: afterDiscount,
            taxAmount: taxAmt,
            totalFinal: totalAfterAll,
            items: itemsList
          }
        };

        if (editingValuationId && !isNaN(Number(editingValuationId))) {
          await api.put(`/dynamic/update/ar_invoices/${editingValuationId}`, payload);
          triggerNotification(`🎉 تم تعديل مستخلص العميل ${claimNo} في قاعدة البيانات بنجاح!`);
        } else {
          await api.post('/dynamic/add/ar_invoices', payload);

          // Manual ledger postings for DB project invoice
          await api.post('/dynamic/add/ledger', {
            date: valuationDate,
            account_name: 'عملاء (حسابات مدينة - AR)',
            debit: Number((totalAfterAll).toFixed(2)),
            credit: 0,
            description: `فاتورة مستخلص إنجاز أعمال رقم ${claimNo} - للمشروع: ${activeProject?.name} - للعميل: ${activeProject?.clientName}`,
            cost_center: activeProject?.name,
            company: activeProject?.company || 'TED CAPITAL',
            company_id: activeProject?.company === 'PRIMEMED PHARMA' ? 4 : 1
          });
          await api.post('/dynamic/add/ledger', {
            date: valuationDate,
            account_name: 'إيرادات مستخلصات وخدمات',
            debit: 0,
            credit: Number(totalClaimAmount.toFixed(2)),
            description: `إيرادات مستخلص إنجاز أعمال رقم ${claimNo} - للمشروع: ${activeProject?.name}`,
            cost_center: activeProject?.name,
            company: activeProject?.company || 'TED CAPITAL',
            company_id: activeProject?.company === 'PRIMEMED PHARMA' ? 4 : 1
          });
          if (taxAmt > 0) {
            await api.post('/dynamic/add/ledger', {
              date: valuationDate,
              account_name: 'ضريبة القيمة المضافة (VAT 14%)',
              debit: 0,
              credit: Number(taxAmt.toFixed(2)),
              description: `ضريبة مستخلص رقم ${claimNo} (${valuationTax}%) - للمشروع: ${activeProject?.name}`,
              cost_center: activeProject?.name,
              company: activeProject?.company || 'TED CAPITAL',
              company_id: activeProject?.company === 'PRIMEMED PHARMA' ? 4 : 1
            });
          }
          triggerNotification(`🎉 تم اعتماد مستخلص العميل ${claimNo} بنجاح وقيد الفاتورة والقيود المحاسبية التلقائية بالكامل!`);
        }
        await fetchAllData();
      } catch (err) {
        console.error("Failed to save client valuation to DB:", err);
        alert(err.response?.data?.error || 'فشل في حفظ المستخلص بقاعدة البيانات.');
      }
    } else {
      if (editingValuationId) {
        setValuations(prev => prev.map(v => v.id === editingValuationId ? newValuation : v));
        setEditingValuationId(null);
        triggerNotification(`🎉 تم تعديل مستخلص العميل ${claimNo} بنجاح!`);
      } else {
        setValuations([...valuations, newValuation]);
        triggerNotification(`تم إصدار المستخلص ${claimNo} محلياً بنجاح!`, 'warning');
      }
    }

    setShowAddValuation(false);
  };

  const handleAddContractorValuation = async (e) => {
    e.preventDefault();

    if (contractorValuationLines.length === 0) {
      alert('الرجاء إضافة سطر واحد على الأقل.');
      return;
    }

    // Verify remaining available quantities for BOQ items
    for (const line of contractorValuationLines) {
      if (line.boqItemId) {
        const boqItem = currentBoqItems.find(item => String(item.id) === String(line.boqItemId));
        if (boqItem) {
          const totalBilledByAll = valuations
            .filter(v => v.isContractor && String(v.projectId) === String(activeProjectId) && v.id !== editingValuationId)
            .reduce((sum, v) => {
              const matchLines = v.lines?.filter(l => String(l.boqItemId) === String(line.boqItemId)) || [];
              return sum + matchLines.reduce((s, l) => s + Number(l.quantity || 0), 0);
            }, 0);
          const availableQty = boqItem.quantity - totalBilledByAll;
          if (Number(line.quantity || 0) > availableQty) {
            alert(`الكمية الحالية المدخلة للبند [${boqItem.item_name}] هي ${line.quantity} وهي تتجاوز الكمية المتاحة المتبقية (${availableQty.toFixed(2)})`);
            return;
          }
        }
      }
    }

    let cumulativeGross = 0;
    const linesList = contractorValuationLines.map(line => {
      const prevQty = Number(line.prevQty || 0);
      const currQty = Number(line.quantity || 0);
      const cumQty = prevQty + currQty;
      const pct = Number(line.percentage !== undefined ? line.percentage : 100);
      const total = cumQty * Number(line.unitPrice || 0) * (pct / 100);
      cumulativeGross += total;

      return {
        ...line,
        contractorName: contractorValuationContractorName,
        quantity: currQty,
        prevQty,
        cumulativeQty: cumQty,
        percentage: pct,
        total
      };
    });

    if (!contractorValuationContractorName) {
      alert('الرجاء اختيار المقاول للمستخلص.');
      return;
    }

    if (cumulativeGross <= 0) {
      alert('إجمالي قيمة المستخلص يجب أن تكون أكبر من صفر. تأكد من إدخال الكميات والأسعار بشكل صحيح.');
      return;
    }

    const discountAmt = contractorValuationDiscount ? Number(contractorValuationDiscount) : 0;
    const uniqueContractorName = contractorValuationContractorName || '';
    const calculatedPrevPaid = uniqueContractorName 
      ? getContractorFinancialPosition(uniqueContractorName, contractorValuationDate, null, linesList).previousSpent 
      : 0;
    const prevPaidVal = contractorValuationPrevPaid !== '' ? Number(contractorValuationPrevPaid) : calculatedPrevPaid;

    const netDue = (cumulativeGross - discountAmt) - prevPaidVal;
    
    let taxAmt = 0;
    const taxRatePercent = contractorValuationTax ? Number(contractorValuationTax) : 0;
    if (contractorValuationTaxMethod === 'period') {
      taxAmt = netDue * (taxRatePercent / 100);
    } else {
      taxAmt = 0;
    }

    const totalAfterAll = netDue + taxAmt;

    const existingVal = editingValuationId ? valuations.find(v => v.id === editingValuationId) : null;
    const valuationId = existingVal ? existingVal.id : `cval-${Date.now()}`;
    const claimNo = existingVal ? existingVal.claimNo : `CVAL-${activeProject?.name.slice(0, 3).replace(/\s+/g, '').toUpperCase()}-${currentValuations.length + 1}`;
    const invoiceNo = existingVal ? existingVal.invoiceNo : `CINV-${claimNo}-${Date.now().toString().slice(-4)}`;

    const newContractorVal = {
      id: valuationId,
      projectId: activeProjectId,
      claimNo,
      invoiceNo,
      date: contractorValuationDate,
      lines: linesList,
      totalCurrent: netDue, // This is the net period gross before tax
      cumulativeGross: cumulativeGross,
      discount: discountAmt,
      discountReason: contractorValuationDiscountReason,
      prevPaid: prevPaidVal,
      taxRate: taxRatePercent,
      taxMethod: contractorValuationTaxMethod,
      totalAfterDiscount: netDue,
      taxAmount: taxAmt,
      totalFinal: totalAfterAll,
      isContractor: true,
      linkedClientValuationId: contractorValuationLinkedClientValId || null,
      status: 'issued'
    };

    if (!editingValuationId) {
      try {
        const contractorGroups = {};
        linesList.forEach(l => {
          const key = l.contractorName || 'مقاول غير محدد';
          contractorGroups[key] = (contractorGroups[key] || 0) + l.total;
        });

        await api.post('/dynamic/add/ledger', {
          date: contractorValuationDate,
          account_name: 'مقاولي الباطن',
          debit: 0,
          credit: Number(totalAfterAll.toFixed(2)),
          description: `مستخلص مقاول رقم ${claimNo} - ${Object.keys(contractorGroups).join(' / ')} - للمشروع: ${activeProject?.name}`,
          cost_center: activeProject?.name,
          company: activeProject?.company || 'TED CAPITAL',
          company_id: activeProject?.company === 'PRIMEMED PHARMA' ? 4 : 1
        });
        await api.post('/dynamic/add/ledger', {
          date: contractorValuationDate,
          account_name: 'تكلفة مقاولي الباطن',
          debit: Number(netDue.toFixed(2)),
          credit: 0,
          description: `تكلفة مستخلص مقاول رقم ${claimNo} - للمشروع: ${activeProject?.name}`,
          cost_center: activeProject?.name,
          company: activeProject?.company || 'TED CAPITAL',
          company_id: activeProject?.company === 'PRIMEMED PHARMA' ? 4 : 1
        });
        if (taxAmt > 0) {
          await api.post('/dynamic/add/ledger', {
            date: contractorValuationDate,
            account_name: 'ضريبة القيمة المضافة (VAT 14%)',
            debit: Number(taxAmt.toFixed(2)),
            credit: 0,
            description: `ضريبة مستخلص مقاول رقم ${claimNo} (${contractorValuationTax}%) - للمشروع: ${activeProject?.name}`,
            cost_center: activeProject?.name,
            company: activeProject?.company || 'TED CAPITAL',
            company_id: activeProject?.company === 'PRIMEMED PHARMA' ? 4 : 1
          });
        }
        triggerNotification(`🏗️ تم إصدار مستخلص المقاول ${claimNo} بنجاح وقيد جميع القيود المحاسبية!`);
      } catch (err) {
        console.error('Failed to post contractor valuation ledger entries:', err);
        triggerNotification(`تم إصدار مستخلص المقاول ${claimNo} محلياً بنجاح!`, 'warning');
      }
    } else {
      triggerNotification(`🏗️ تم تعديل مستخلص المقاول ${claimNo} بنجاح!`);
    }

    if (editingValuationId) {
      if (String(editingValuationId).startsWith('db-sub-inv-')) {
        const dbId = editingValuationId.replace('db-sub-inv-', '');
        try {
          const matchedSub = subcontractorsList.find(s => (s.name || s.contractor_name || '').trim().toLowerCase() === uniqueContractorName.trim().toLowerCase());
          const subId = matchedSub ? matchedSub.id : null;
          
          await api.put(`/dynamic/update/subcontractor_invoices/${dbId}`, {
            subcontractor_id: subId,
            subcontractor_name: uniqueContractorName,
            curr_qty: Number(linesList[0]?.quantity || 0),
            prev_qty: Number(linesList[0]?.prevQty || 0),
            gross_amount: cumulativeGross,
            retention_deduction: discountAmt,
            net_amount: totalAfterAll,
            amount: totalAfterAll,
            description: linesList[0]?.description || `مستخلص مقاول رقم ${claimNo}`,
            date: contractorValuationDate,
            project_id: activeProjectId,
            metadata: {
              lines: linesList,
              discountReason: contractorValuationDiscountReason,
              taxRate: taxRatePercent,
              taxMethod: contractorValuationTaxMethod
            }
          });
          
          fetchAllData();
          triggerNotification(`🏗️ تم تعديل مستخلص المقاول في قاعدة البيانات بنجاح!`);
        } catch (err) {
          console.error('Failed to update subcontractor invoice in DB:', err);
          triggerNotification(`حدث خطأ أثناء تعديل المستخلص في قاعدة البيانات!`, 'error');
        }
      } else {
        setValuations(prev => prev.map(v => v.id === editingValuationId ? newContractorVal : v));
        triggerNotification(`🏗️ تم تعديل مستخلص المقاول ${claimNo} بنجاح!`);
      }
      setEditingValuationId(null);
    } else {
      try {
        const matchedSub = subcontractorsList.find(s => (s.name || s.contractor_name || '').trim().toLowerCase() === uniqueContractorName.trim().toLowerCase());
        const subId = matchedSub ? matchedSub.id : null;

        const dbInvoiceRes = await api.post('/dynamic/add/subcontractor_invoices', {
          subcontractor_id: subId,
          subcontractor_name: uniqueContractorName,
          curr_qty: Number(linesList[0]?.quantity || 0),
          prev_qty: Number(linesList[0]?.prevQty || 0),
          gross_amount: cumulativeGross,
          retention_deduction: discountAmt,
          net_amount: totalAfterAll,
          amount: totalAfterAll,
          description: linesList[0]?.description || `مستخلص مقاول رقم ${claimNo}`,
          date: contractorValuationDate,
          project_id: activeProjectId,
          status: 'issued',
          company_id: activeProject?.company === 'PRIMEMED PHARMA' ? 4 : 1,
          created_by: 'Engineer',
          metadata: {
            lines: linesList,
            discountReason: contractorValuationDiscountReason,
            taxRate: taxRatePercent,
            taxMethod: contractorValuationTaxMethod
          }
        });

        const newDbId = dbInvoiceRes.data?.id;
        let finalVal = newContractorVal;
        if (newDbId) {
          finalVal = { ...newContractorVal, id: `db-sub-inv-${newDbId}` };
        }
        
        setValuations(prev => {
          const localOnly = prev.filter(v => !String(v.id).startsWith('db-sub-inv-'));
          return [...localOnly, finalVal];
        });
        
        fetchAllData();
        triggerNotification(`🏗️ تم إصدار مستخلص المقاول وحفظه في قاعدة البيانات بنجاح!`);
      } catch (err) {
        console.error('Failed to save contractor valuation to DB:', err);
        setValuations([...valuations, newContractorVal]);
        triggerNotification(`تم إصدار المستخلص محلياً بنجاح!`, 'warning');
      }
    }
    setShowAddContractorValuation(false);
  };

  const handleDeleteValuation = async (valId) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المستخلص نهائياً؟ سيتم إلغاء قيده وعكس تأثيراته المالية.')) return;
    
    const isDbSubInvoice = String(valId).startsWith('db-sub-inv-');
    const isDbClientInvoice = !isNaN(Number(valId));

    if (isDbSubInvoice) {
      const dbId = valId.replace('db-sub-inv-', '');
      try {
        await api.delete(`/subcontractors/delete_invoice/${dbId}`);
        fetchAllData();
        triggerNotification('💥 تم حذف المستخلص من قاعدة البيانات وعكس تأثيراته المالية بنجاح.', 'warning');
      } catch (err) {
        console.error('Failed to delete subcontractor invoice from DB:', err);
        triggerNotification('حدث خطأ أثناء حذف المستخلص من قاعدة البيانات!', 'error');
      }
    } else if (isDbClientInvoice) {
      try {
        const valObj = valuations.find(v => v.id === valId);
        const refNo = valObj ? valObj.claimNo : `VAL-${valId}`;

        await api.delete(`/dynamic/delete/ar_invoices/${valId}`);

        // Post accounting reversals swapping Dr/Cr
        await api.post('/dynamic/add/ledger', {
          date: new Date().toISOString().split('T')[0],
          account_name: 'عملاء (حسابات مدينة - AR)',
          debit: 0,
          credit: Number((valObj?.totalFinal || 0).toFixed(2)),
          description: `[عكس قيد حذف] إلغاء مستخلص إنجاز أعمال رقم ${refNo}`,
          cost_center: activeProject?.name,
          company: activeProject?.company || 'TED CAPITAL',
          company_id: activeProject?.company === 'PRIMEMED PHARMA' ? 4 : 1
        });
        await api.post('/dynamic/add/ledger', {
          date: new Date().toISOString().split('T')[0],
          account_name: 'إيرادات مستخلصات وخدمات',
          debit: Number((valObj?.totalCurrent || 0).toFixed(2)),
          credit: 0,
          description: `[عكس قيد حذف] إلغاء إيرادات مستخلص إنجاز أعمال رقم ${refNo}`,
          cost_center: activeProject?.name,
          company: activeProject?.company || 'TED CAPITAL',
          company_id: activeProject?.company === 'PRIMEMED PHARMA' ? 4 : 1
        });
        if (valObj?.taxAmount > 0) {
          await api.post('/dynamic/add/ledger', {
            date: new Date().toISOString().split('T')[0],
            account_name: 'ضريبة القيمة المضافة (VAT 14%)',
            debit: Number(valObj.taxAmount.toFixed(2)),
            credit: 0,
            description: `[عكس قيد حذف] إلغاء ضريبة مستخلص رقم ${refNo}`,
            cost_center: activeProject?.name,
            company: activeProject?.company || 'TED CAPITAL',
            company_id: activeProject?.company === 'PRIMEMED PHARMA' ? 4 : 1
          });
        }

        fetchAllData();
        triggerNotification('💥 تم حذف المستخلص من قاعدة البيانات وعكس تأثيراته المالية بنجاح.', 'warning');
      } catch (err) {
        console.error('Failed to delete client valuation from DB:', err);
        triggerNotification('حدث خطأ أثناء حذف المستخلص من قاعدة البيانات!', 'error');
      }
    } else {
      setValuations(prev => prev.filter(v => v.id !== valId));
      triggerNotification('💥 تم حذف مستخلص الإنجاز وعكس تأثيراته المالية بنجاح.', 'warning');
    }
    
    // clean up any payment links
    setInstallments(prev => prev.map(inst => {
      if (inst.valuationId === valId) {
        return { ...inst, valuationId: '' };
      }
      return inst;
    }));
  };

  const handleStartEditInstallment = (item) => {
    setEditingItemType('installment');
    setEditingItemId(item.id);
    setEditForm({ ...item });
  };

  const handleSaveEditInstallment = async (e) => {
    e.preventDefault();
    const isDbItem = !isNaN(Number(editingItemId));
    if (isDbItem) {
      try {
        const payload = {
          amount_paid: Number(editForm.amount),
          notes: editForm.notes,
          payment_date: editForm.date
        };
        await api.put(`/dynamic/update/client_payment_history/${editingItemId}`, payload);
        triggerNotification('✍️ تم تعديل الدفعة بنجاح في قاعدة البيانات.');
        await fetchAllData();
      } catch (err) {
        console.error("Failed to update installment on DB:", err);
        alert(err.response?.data?.error || 'فشل في تحديث الدفعة في قاعدة البيانات.');
      }
    } else {
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
      triggerNotification('✍️ تم تعديل الدفعة النقدية وإعادة تحديث شريط تحصيل العميل.');
    }
    setEditingItemType(null);
    setEditingItemId(null);
  };

  const handleDeleteInstallment = async (itemId) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الدفعة المقبوضة وعكس تأثيرها من حساب المقبوضات؟')) return;

    const isDbItem = !isNaN(Number(itemId));
    if (isDbItem) {
      try {
        await api.delete(`/dynamic/delete/client_payment_history/${itemId}`);
        triggerNotification('💥 تم حذف الدفعة المستلمة وعكس تأثيرها Accounting بنجاح من قاعدة البيانات.', 'warning');
        await fetchAllData();
      } catch (err) {
        console.error("Failed to delete installment from DB:", err);
        alert(err.response?.data?.error || 'فشل في حذف الدفعة من قاعدة البيانات.');
      }
    } else {
      setInstallments(prev => prev.filter(item => item.id !== itemId));
      triggerNotification('💥 تم حذف الدفعة المستلمة وعكس تأثيرها من حسابات المقبوضات فوراً.', 'warning');
    }
  };

  // --- 5. FILE MANAGER & INTERACTIVE AUTO-SAVE ENGINE ---
  const handleFileUpload = (e) => {
    const filesList = e.target.files;
    if (!filesList || filesList.length === 0) return;

    const file = filesList[0];
    const reader = new FileReader();
    reader.onload = () => {
      const fileExt = file.name.split('.').pop().toLowerCase();
      let fileType = file.type;
      if (fileExt === 'pdf') {
        fileType = 'application/pdf';
      } else if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(fileExt)) {
        fileType = `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`;
      } else if (['xls', 'xlsx', 'csv'].includes(fileExt)) {
        fileType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      } else if (['doc', 'docx'].includes(fileExt)) {
        fileType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      } else if (['zip', 'rar', '7z', 'tar', 'gz'].includes(fileExt)) {
        fileType = 'application/zip';
      } else if (!fileType) {
        fileType = 'text/plain';
      }

      const newFileObj = {
        id: Date.now(),
        projectId: activeProjectId,
        name: file.name,
        type: fileType,
        content: reader.result, // base64 or raw string
        date: new Date().toISOString().split('T')[0]
      };
      setProjectFiles([...projectFiles, newFileObj]);
      triggerNotification(`📁 تم رفع الملف بنجاح: ${file.name}`);
    };

    const fileExt = file.name.split('.').pop().toLowerCase();
    const isTextFile = ['txt', 'json', 'html'].includes(fileExt) || (file.type && file.type.startsWith('text') && !['csv', 'xls', 'xlsx', 'doc', 'docx'].includes(fileExt));

    if (isTextFile) {
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
      const beneficiaryStr = (item.beneficiary || '').toLowerCase();
      const notesStr = (item.notes || '').toLowerCase();
      const searchStr = (expenseSearch || '').toLowerCase();
      const matchSearch = beneficiaryStr.includes(searchStr) || notesStr.includes(searchStr);
      const matchCat = expenseCategoryFilter === 'All' || item.category === expenseCategoryFilter;
      return matchSearch && matchCat;
    });
  }, [currentExpenses, expenseSearch, expenseCategoryFilter]);

  const categoryGradients = {
    "أعمال صحي": "from-cyan-500/20 to-blue-500/10 border-cyan-600/30 text-cyan-400 bg-cyan-500/5",
    "أعمال عزل": "from-cyan-600/20 to-blue-600/10 border-cyan-700/30 text-cyan-300 bg-cyan-600/5",
    "أعمال كهرباء": "from-amber-500/20 to-orange-500/10 border-amber-500/30 text-amber-400 bg-amber-500/5",
    "أعمال جيبسوم بورد أبيض": "from-purple-500/20 to-indigo-500/10 border-purple-500/30 text-purple-400 bg-purple-500/5",
    "أعمال جيبسوم بورد أخضر ( MR )": "from-purple-500/20 to-indigo-500/10 border-purple-500/30 text-purple-400 bg-purple-500/5",
    "أعمال جيبسوم بورد أحمر ( FR )": "from-purple-500/20 to-indigo-500/10 border-purple-500/30 text-purple-400 bg-purple-500/5",
    "أعمال أسقف بلاطات": "from-purple-500/20 to-indigo-500/10 border-purple-500/30 text-purple-400 bg-purple-500/5",
    "أعمال بياض محاره": "from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-400 bg-emerald-500/5",
    "أعمال دهانات": "from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-400 bg-emerald-500/5",
    "أعمال دهانات MICRO CEMENT": "from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-400 bg-emerald-500/5",
    "أعمال دهانات إيبوكسي": "from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-400 bg-emerald-500/5",
    "أعمال دهانات أستر": "from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-400 bg-emerald-500/5",
    "أعمال تصميم": "from-blue-500/20 to-indigo-600/10 border-blue-500/30 text-indigo-400 bg-blue-500/5",
    "إكراميات ونثريات": "from-slate-500/20 to-slate-600/10 border-slate-500/30 text-slate-400 bg-slate-500/5"
  };

  const activeGrad = (cat) => categoryGradients[cat] || "from-slate-500/20 to-slate-600/10 border-slate-500/30 text-slate-400 bg-slate-500/5";

  const isMasterBuilder = activeProject?.company && (activeProject.company.toUpperCase().includes('MASTER BUILDER') || activeProject.company.includes('ماستر بيلدر'));

  return (
    <div className="contractor-suite-light bg-[#f7f8fc] text-slate-800 min-h-screen p-4 sm:p-8 selection:bg-cyan-500 selection:text-white font-sans print:bg-white print:text-black relative overflow-hidden" dir="rtl">
      {/* Background Radial Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[350px] bg-gradient-to-b from-indigo-500/10 via-sky-500/5 to-transparent rounded-full blur-[140px] pointer-events-none no-print"></div>

      {/* Printable page layout adjustments */}
      <style dangerouslySetInnerHTML={{
        __html: `
        /* ═══════════════════════════════════════════════════════════
           PREMIUM WHITE THEME ENGINE — ContractorSuite
           Scoped under .contractor-suite-light to avoid side effects
        ═══════════════════════════════════════════════════════════ */

        /* ── CSS Variables ───────────────────────────────────────── */
        .contractor-suite-light {
          --cs-bg-page: #f7f8fc;
          --cs-bg-card: #ffffff;
          --cs-bg-alt: #f1f5f9;
          --cs-bg-input: #ffffff;
          --cs-border: #e2e8f0;
          --cs-text-primary: #1e293b;
          --cs-text-secondary: #475569;
          --cs-text-muted: #94a3b8;
        }

        /* ── Tab Container & Active/Inactive Overrides ───────────── */
        .contractor-suite-light .bg-\\[\\#090d16\\] {
          background-color: #f1f5f9 !important;
          border-color: #e2e8f0 !important;
        }
        .contractor-suite-light button.bg-\\[\\#1e293b\\] {
          background-color: #ffffff !important;
          border: 1.8px solid #0f172a !important;
          color: #0891b2 !important;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05) !important;
        }
        .contractor-suite-light button.bg-\\[\\#0f172a\\]\\/40 {
          background-color: #ffffff !important;
          border: 1.8px solid #f1f5f9 !important;
          color: #64748b !important;
        }

        /* ── Dark Backgrounds → White/Light ──────────────────────── */
        .contractor-suite-light .bg-\\[\\#03060c\\],
        .contractor-suite-light .bg-\\[\\#090d16\\]:not(div),
        .contractor-suite-light .bg-\\[\\#0f172a\\]\\/40:not(button) {
          background-color: var(--cs-bg-page) !important;
        }
        .contractor-suite-light .bg-\\[\\#0f172a\\],
        .contractor-suite-light .bg-\\[\\#131b2e\\],
        .contractor-suite-light .bg-\\[\\#161e2f\\],
        .contractor-suite-light .bg-\\[\\#1b2336\\],
        .contractor-suite-light .bg-\\[\\#1e293b\\] {
          background-color: var(--cs-bg-card) !important;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04) !important;
        }
        .contractor-suite-light .bg-\\[\\#070a13\\] {
          background-color: var(--cs-bg-alt) !important;
        }
        .contractor-suite-light .bg-\\[\\#111827\\] {
          background-color: var(--cs-bg-input) !important;
        }
        .contractor-suite-light .bg-\\[\\#0d1117\\] {
          background-color: #f8fafc !important;
        }
        .contractor-suite-light .bg-slate-900,
        .contractor-suite-light .bg-slate-950 {
          background-color: var(--cs-bg-alt) !important;
        }
        .contractor-suite-light .bg-slate-900\\/80,
        .contractor-suite-light .bg-slate-900\\/50,
        .contractor-suite-light .bg-slate-900\\/60,
        .contractor-suite-light .bg-slate-950\\/50,
        .contractor-suite-light .bg-slate-955\\/50,
        .contractor-suite-light .bg-slate-950\\/40,
        .contractor-suite-light .bg-slate-955\\/40,
        .contractor-suite-light .bg-slate-950\\/20 {
          background-color: #f8fafc !important;
        }
        .contractor-suite-light .bg-slate-800 {
          background-color: #e2e8f0 !important;
        }

        /* ── Borders ─────────────────────────────────────────────── */
        .contractor-suite-light .border-slate-800,
        .contractor-suite-light .border-slate-700 {
          border-color: var(--cs-border) !important;
        }
        .contractor-suite-light .border-white\\/5,
        .contractor-suite-light .divide-white\\/5 > * + * {
          border-color: #f1f5f9 !important;
        }

        /* ── Text Colors ─────────────────────────────────────────── */
        .contractor-suite-light .text-white { color: var(--cs-text-primary) !important; }
        .contractor-suite-light .text-slate-100,
        .contractor-suite-light .text-slate-200 { color: #334155 !important; }
        .contractor-suite-light .text-slate-300 { color: #475569 !important; }
        .contractor-suite-light .text-slate-400,
        .contractor-suite-light .text-slate-450,
        .contractor-suite-light .text-slate-455 { color: #64748b !important; }
        .contractor-suite-light .text-slate-500 { color: #94a3b8 !important; }

        /* ── Accent Colors (boosted for white contrast) ──────────── */
        .contractor-suite-light .text-cyan-400 { color: #0891b2 !important; }
        .contractor-suite-light .text-cyan-300 { color: #06b6d4 !important; }
        .contractor-suite-light .text-emerald-400 { color: #059669 !important; }
        .contractor-suite-light .text-emerald-300 { color: #10b981 !important; }
        .contractor-suite-light .text-amber-400 { color: #d97706 !important; }
        .contractor-suite-light .text-amber-300 { color: #f59e0b !important; }
        .contractor-suite-light .text-rose-400 { color: #e11d48 !important; }
        .contractor-suite-light .text-rose-300 { color: #f43f5e !important; }
        .contractor-suite-light .text-orange-400 { color: #ea580c !important; }
        .contractor-suite-light .text-orange-300 { color: #f97316 !important; }
        .contractor-suite-light .text-purple-400 { color: #9333ea !important; }
        .contractor-suite-light .text-indigo-400 { color: #6366f1 !important; }

        /* ── Input Fields ────────────────────────────────────────── */
        .contractor-suite-light input,
        .contractor-suite-light select,
        .contractor-suite-light textarea {
          background-color: #ffffff !important;
          color: #1e293b !important;
          border-color: #e2e8f0 !important;
        }
        .contractor-suite-light input:focus,
        .contractor-suite-light select:focus,
        .contractor-suite-light textarea:focus {
          border-color: #0891b2 !important;
          box-shadow: 0 0 0 3px rgba(8,145,178,0.1) !important;
        }
        .contractor-suite-light input::placeholder { color: #94a3b8 !important; }
        .contractor-suite-light select option { color: #1e293b !important; background: #fff !important; }

        /* ── Hover States ────────────────────────────────────────── */
        .contractor-suite-light .hover\\:bg-white\\/5:hover,
        .contractor-suite-light .hover\\:bg-white\\/\\[0\\.02\\]:hover,
        .contractor-suite-light .hover\\:bg-\\[\\#131b2e\\]:hover,
        .contractor-suite-light .hover\\:bg-slate-800:hover {
          background-color: #f1f5f9 !important;
        }
        .contractor-suite-light .hover\\:text-white:hover { color: #0f172a !important; }
        .contractor-suite-light .hover\\:border-slate-700:hover { border-color: #cbd5e1 !important; }

        /* ── Semi-Transparent Accent Backgrounds ─────────────────── */
        .contractor-suite-light .bg-cyan-500\\/10 { background-color: rgba(8,145,178,0.08) !important; }
        .contractor-suite-light .bg-cyan-500\\/20 { background-color: rgba(8,145,178,0.12) !important; }
        .contractor-suite-light .bg-emerald-500\\/10 { background-color: rgba(5,150,105,0.08) !important; }
        .contractor-suite-light .bg-rose-500\\/10,
        .contractor-suite-light .bg-rose-950\\/20 { background-color: rgba(225,29,72,0.06) !important; }
        .contractor-suite-light .bg-amber-500\\/10 { background-color: rgba(217,119,6,0.08) !important; }
        .contractor-suite-light .bg-orange-500\\/10,
        .contractor-suite-light .bg-orange-500\\/15 { background-color: rgba(234,88,12,0.08) !important; }
        .contractor-suite-light .bg-purple-500\\/10 { background-color: rgba(147,51,234,0.08) !important; }
        .contractor-suite-light .bg-indigo-500\\/15 { background-color: rgba(99,102,241,0.08) !important; }

        /* ── Accent Borders ──────────────────────────────────────── */
        .contractor-suite-light .border-cyan-500\\/30,
        .contractor-suite-light .border-cyan-500\\/25,
        .contractor-suite-light .border-cyan-500\\/20,
        .contractor-suite-light .border-cyan-600\\/30 { border-color: rgba(8,145,178,0.25) !important; }
        .contractor-suite-light .border-emerald-500\\/20,
        .contractor-suite-light .border-emerald-500\\/30 { border-color: rgba(5,150,105,0.25) !important; }
        .contractor-suite-light .border-amber-500\\/25,
        .contractor-suite-light .border-amber-500\\/20,
        .contractor-suite-light .border-amber-500\\/30 { border-color: rgba(217,119,6,0.25) !important; }
        .contractor-suite-light .border-orange-500\\/20,
        .contractor-suite-light .border-orange-500\\/30,
        .contractor-suite-light .border-orange-400\\/30 { border-color: rgba(234,88,12,0.2) !important; }
        .contractor-suite-light .border-rose-500\\/20,
        .contractor-suite-light .border-rose-500\\/30 { border-color: rgba(225,29,72,0.2) !important; }
        .contractor-suite-light .border-purple-500\\/20 { border-color: rgba(147,51,234,0.2) !important; }
        .contractor-suite-light .border-indigo-500\\/30 { border-color: rgba(99,102,241,0.2) !important; }

        /* ── Table ───────────────────────────────────────────────── */
        .contractor-suite-light thead { background-color: #f8fafc !important; }
        .contractor-suite-light th { color: #475569 !important; }
        .contractor-suite-light td { color: #334155 !important; }
        .contractor-suite-light tbody tr:hover { background-color: #f8fafc !important; }

        /* ── Notification Toasts ─────────────────────────────────── */
        .contractor-suite-light .bg-emerald-950\\/90 { background-color: rgba(5,150,105,0.95) !important; }
        .contractor-suite-light .bg-emerald-950\\/90 * { color: white !important; }
        .contractor-suite-light .bg-rose-950\\/90 { background-color: rgba(225,29,72,0.95) !important; }
        .contractor-suite-light .bg-rose-950\\/90 * { color: white !important; }

        /* ── Card Shadows ────────────────────────────────────────── */
        .contractor-suite-light .rounded-\\[2rem\\] {
          box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04) !important;
        }
        .contractor-suite-light .shadow-2xl { box-shadow: 0 2px 8px rgba(0,0,0,0.06) !important; }

        /* ── Primary Action Buttons (keep visible) ──────────────── */
        .contractor-suite-light .bg-cyan-500 { background-color: #0891b2 !important; color: white !important; }
        .contractor-suite-light .bg-orange-500 { background-color: #ea580c !important; color: white !important; }
        .contractor-suite-light .bg-emerald-500 { background-color: #059669 !important; color: white !important; }
        .contractor-suite-light .bg-rose-600 { background-color: #e11d48 !important; color: white !important; }

        /* ── Scrollbar ───────────────────────────────────────────── */
        .contractor-suite-light ::-webkit-scrollbar { width: 6px; height: 6px; }
        .contractor-suite-light ::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 8px; }
        .contractor-suite-light ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 8px; }
        .contractor-suite-light ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }

        /* ═══ Print Styles ═══════════════════════════════════════ */
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body { background: white !important; color: #0f172a !important; font-family: 'Inter', sans-serif !important; font-size: 11px !important; }
          .no-print { display: none !important; }
          .print-full-width { width: 100% !important; max-width: 100% !important; padding: 0 !important; margin: 0 !important; }
          .print\\:grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)) !important; }
          table { width: 100% !important; border-collapse: collapse !important; page-break-inside: auto !important; margin-top: 15px !important; }
          tr { page-break-inside: avoid !important; page-break-after: auto !important; }
          thead { display: table-header-group !important; }
          th { border: 1px solid #e2e8f0 !important; padding: 10px 12px !important; background-color: #f8fafc !important; color: #0f172a !important; font-weight: bold !important; text-align: right !important; font-size: 12px !important; }
          th.text-center { text-align: center !important; }
          td { border: 1px solid #f1f5f9 !important; padding: 10px 12px !important; color: #334155 !important; font-size: 11px !important; vertical-align: top !important; }
          td.text-center { text-align: center !important; }
          .print\\:text-black { color: #0f172a !important; }
          .print\\:bg-transparent { background: transparent !important; }
          .print\\:border-none { border: none !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:p-0 { padding: 0 !important; }
          .print\\:p-4 { padding: 12px !important; }
          .print\\:border-black { border-color: #0f172a !important; }
          .print\\:border { border: 1px solid #cbd5e1 !important; }
          .print\\:rounded-xl { border-radius: 8px !important; }
          .print\\:mb-6 { margin-bottom: 24px !important; }
          .print\\:grid { display: grid !important; }
          .print\\:gap-4 { gap: 16px !important; }
        }
      `}} />

      {/* --- TOAST NOTIFICATIONS --- */}
      {notification && (
        <div className="fixed top-6 left-6 z-50 animate-bounce">
          <div className={`px-6 py-4 rounded-2xl shadow-2xl  border flex items-center gap-3 font-bold text-xs ${notification.type === 'warning'
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
        <div className="relative rounded-[2rem] p-8 overflow-hidden border border-slate-800 bg-[#161e2f] flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 shadow-2xl no-print">
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl opacity-60 translate-x-20 -translate-y-20"></div>
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl opacity-40 -translate-x-20 translate-y-20"></div>

          {/* Left Column: Project Details & Context */}
          <div className="flex flex-col items-start gap-2 relative z-10 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-amber-500/25 bg-amber-500/10 text-amber-500 text-[10px] font-black uppercase tracking-widest">
              💎 CONTRACTOR & SUBCONTRACTORS SUITE
            </div>
            
            <div className="flex items-center gap-2 mt-1">
              <select
                value={activeProjectId}
                onChange={e => setActiveProjectId(e.target.value)}
                className="bg-transparent border-none text-white text-3xl font-black tracking-tight focus:outline-none cursor-pointer p-0"
              >
                {filteredProjects.map(p => (
                  <option key={p.id} value={p.id} className="text-slate-900 font-bold">{p.name}</option>
                ))}
              </select>
            </div>
            
            <p className="text-slate-400 font-bold text-xs mt-1.5 leading-relaxed">
              العميل الحالي للمشروع: <span className="text-white font-black">{activeProject.clientName}</span> | الشركة: <span className="text-cyan-400 font-black">{activeProject.company || 'TED CAPITAL'}</span>
              {activeProject.projectManager && <> | مدير المشروع: <span className="text-emerald-450 font-black">{activeProject.projectManager}</span></>}
              {activeProject.startDate && <> | تاريخ البدء: <span className="text-amber-450 font-black">{activeProject.startDate}</span></>}
            </p>

            {/* Segmented Cost Center Toggle */}
            <div className="bg-[#070a13] p-1 rounded-xl border border-slate-800 flex gap-1 mt-2.5">
              <button
                type="button"
                onClick={() => {
                  setCostCenterMode('project');
                  triggerNotification('📁 تم تفعيل مركز تكلفة المشروع');
                }}
                className={`px-3.5 py-2 rounded-lg text-[10px] font-black transition-all border ${costCenterMode === 'project'
                  ? 'bg-[#1e293b] border-cyan-500/30 text-cyan-400 shadow-md'
                  : 'text-slate-450 border-transparent hover:text-slate-200'
                  }`}
              >
                📁 مركز تكلفة المشروع
              </button>
              <button
                type="button"
                onClick={() => {
                  setCostCenterMode('company');
                  triggerNotification(`🏢 تم تفعيل مركز تكلفة الشركة: ${activeProject.company || 'TED CAPITAL'}`);
                }}
                className={`px-3.5 py-2 rounded-lg text-[10px] font-black transition-all border ${costCenterMode === 'company'
                  ? 'bg-[#1e293b] border-indigo-500/30 text-indigo-400 shadow-md'
                  : 'text-slate-450 border-transparent hover:text-slate-200'
                  }`}
              >
                🏢 مركز تكلفة الشركة
              </button>
            </div>

            {/* Project Action buttons */}
            <div className="flex items-center gap-2 mt-4">
              <button
                onClick={() => {
                  setShowAddProject(!showAddProject);
                  setShowEditProject(false);
                }}
                className="bg-cyan-500/10 hover:bg-cyan-500/20 border border-slate-800 hover:border-cyan-500/40 text-cyan-400 text-[10px] font-black px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5"
              >
                <span>{showAddProject ? '✕ إغلاق' : '+ مشروع جديد'}</span>
              </button>
              <button
                onClick={handleStartEditProject}
                className="bg-amber-500/10 hover:bg-amber-500/20 border border-slate-850 hover:border-amber-500/40 text-amber-400 text-[10px] font-black px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5"
              >
                <span>تعديل المشروع ✏️</span>
              </button>
              <button
                onClick={() => handleDeleteProject(activeProjectId)}
                className="bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 hover:border-rose-500/40 text-rose-400 text-[10px] font-black px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5"
              >
                <span>حذف المشروع 🗑️</span>
              </button>
            </div>
          </div>

          {/* Right Column: Neat Horizontal KPI cards aligned exactly like the screenshot */}
          <div className="flex flex-wrap items-center gap-3 relative z-10 w-full lg:w-auto">
            
            <div 
              onClick={() => setActiveTab('boq')}
              className="bg-[#1b2336] border border-slate-800 hover:border-cyan-500/50 hover:bg-[#1f283d] cursor-pointer rounded-2xl p-4 min-w-[130px] flex flex-col justify-between h-24 transition-all duration-300 active:scale-95"
            >
              <span className="text-[9px] font-black text-slate-450 uppercase tracking-wider">قيمة المقايسة</span>
              <div className="mt-1">
                <span className="text-base font-black font-mono text-cyan-400">{totals.totalBOQ.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <span className="text-[9px] text-slate-500 font-bold block">جنيه</span>
              </div>
            </div>

            <div 
              onClick={() => setActiveTab('expenses')}
              className="bg-[#1b2336] border border-slate-800 hover:border-rose-500/50 hover:bg-[#1f283d] cursor-pointer rounded-2xl p-4 min-w-[130px] flex flex-col justify-between h-24 transition-all duration-300 active:scale-95"
            >
              <span className="text-[9px] font-black text-slate-455 uppercase tracking-wider">المصروفات الفعلية</span>
              <div className="mt-1">
                <span className="text-base font-black font-mono text-rose-400">{totals.totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <span className="text-[9px] text-slate-500 font-bold block">جنيه</span>
              </div>
            </div>

            <div 
              onClick={() => setActiveTab('dashboard')}
              className="bg-[#1b2336] border border-slate-800 hover:border-emerald-500/50 hover:bg-[#1f283d] cursor-pointer rounded-2xl p-4 min-w-[130px] flex flex-col justify-between h-24 transition-all duration-300 active:scale-95"
            >
              <span className="text-[9px] font-black text-slate-450 uppercase tracking-wider">الربح المتوقع</span>
              <div className="mt-1">
                <span className="text-base font-black font-mono text-emerald-400">{totals.estProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <span className="text-[9px] text-slate-500 font-bold block">جنيه</span>
              </div>
            </div>

            <div 
              onClick={() => setActiveTab('client')}
              className="bg-[#1b2336] border border-slate-800 hover:border-amber-500/50 hover:bg-[#1f283d] cursor-pointer rounded-2xl p-4 min-w-[130px] flex flex-col justify-between h-24 transition-all duration-300 active:scale-95"
            >
              <span className="text-[9px] font-black text-slate-455 uppercase tracking-wider">المحصل من العميل</span>
              <div className="mt-1">
                <span className="text-base font-black font-mono text-amber-400">{totals.totalCollected.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <span className="text-[9px] text-slate-500 font-bold block">ج.م محصل</span>
              </div>
            </div>

          </div>
        </div>

        {/* --- PREMIUM RESPONSIVE NAVIGATION GRID --- */}
        <div className="bg-[#090d16] p-2 rounded-2xl border border-slate-800 shadow-2xl no-print">
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            {[
              { id: 'dashboard', label: 'لوحة القيادة', icon: '📊' },
              { id: 'boq', label: 'المقايسة والبنود', icon: '📝' },
              { id: 'expenses', label: 'المصروفات الفعلية', icon: '💸' },
              { id: 'client', label: 'دفعات العميل', icon: '💳' },
              { id: 'warehouses', label: 'المخازن', icon: '📦' },
              { id: 'transactions', label: 'التحصيلات والمدفوعات', icon: '💸' },
              { id: 'files', label: 'ملفات ومستندات', icon: '📁' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-xl font-black text-xs transition-all duration-300 whitespace-nowrap border ${activeTab === tab.id
                  ? 'bg-[#1e293b] border-cyan-500/30 text-cyan-400 shadow-md transform -translate-y-[1px]'
                  : 'text-slate-450 bg-[#0f172a]/40 border-slate-800 hover:bg-[#131b2e] hover:text-white hover:border-slate-700'
                  }`}
              >
                <span className="text-sm">{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Modal / Form to create new project */}
        {showAddProject && (
          <form onSubmit={handleCreateProject} className="bg-slate-900/70 border border-slate-800 p-6 rounded-3xl space-y-4 animate-in slide-in-from-top duration-300 no-print">
            <h4 className="text-sm font-black text-cyan-400">تأسيس مشروع إنشائي جديد</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-slate-400 font-bold">اسم المشروع / المعرف</label>
                <input
                  type="text"
                  placeholder="مثال: فيلا E111 - زايد الجديد"
                  value={newProjectForm.name}
                  onChange={e => setNewProjectForm({ ...newProjectForm, name: e.target.value })}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] text-slate-400 font-bold">اسم العميل المتعاقد</label>
                  <button
                    type="button"
                    onClick={() => {
                      setNewCustomerCompanyId('');
                      setShowAddCustomerModal(true);
                    }}
                    className="text-[9px] font-black text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-0.5 rounded-lg border border-emerald-500/25 transition-all flex items-center gap-1 active:scale-95 cursor-pointer"
                  >
                    <span>➕</span> {language === 'ar' ? 'إضافة عميل سريع' : 'Quick Add'}
                  </button>
                </div>
                <select
                  value={newProjectForm.clientName || ''}
                  onChange={e => setNewProjectForm({ ...newProjectForm, clientName: e.target.value })}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="">{language === 'ar' ? '-- اختر العميل المتعاقد --' : '-- Select Contracted Client --'}</option>
                  <option value="عميل عام">عميل عام</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.name}>{c.name} {c.company_name ? `(${c.company_name})` : ''}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-slate-400 font-bold">الشركة المالكة / مركز التكلفة</label>
                <select
                  value={newProjectForm.company}
                  onChange={e => setNewProjectForm({ ...newProjectForm, company: e.target.value })}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="">-- اختر الشركة من الحوكمة --</option>
                  {orgUnits.map(unit => (
                    <option key={unit.id} value={unit.name}>{unit.name}</option>
                  ))}
                  {orgUnits.length === 0 && (
                    <>
                      <option value="TED CAPITAL">TED CAPITAL</option>
                      <option value="PRIMEMED PHARMA">PRIMEMED PHARMA</option>
                    </>
                  )}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-slate-400 font-bold">اسم مدير المشروع</label>
                <input
                  type="text"
                  placeholder="مثال: المهندس كريم محمود"
                  value={newProjectForm.projectManager}
                  onChange={e => setNewProjectForm({ ...newProjectForm, projectManager: e.target.value })}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-slate-400 font-bold">تاريخ بداية المشروع</label>
                <input
                  type="date"
                  value={newProjectForm.startDate}
                  onChange={e => setNewProjectForm({ ...newProjectForm, startDate: e.target.value })}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowAddProject(false)} className="px-5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-400">إلغاء</button>
              <button type="submit" className="px-6 py-2 bg-cyan-500 rounded-xl text-xs font-black text-white">تأسيس المشروع الآن 🏢</button>
            </div>
          </form>
        )}

        {/* Modal / Form to edit project */}
        {showEditProject && (
          <form onSubmit={handleEditProject} className="bg-slate-900/70 border border-slate-800 p-6 rounded-3xl space-y-4 animate-in slide-in-from-top duration-300 no-print">
            <h4 className="text-sm font-black text-cyan-400">تعديل بيانات المشروع الحالي</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-slate-400 font-bold">اسم المشروع / المعرف</label>
                <input
                  type="text"
                  placeholder="مثال: فيلا E111 - زايد الجديد"
                  value={editProjectForm.name}
                  onChange={e => setEditProjectForm({ ...editProjectForm, name: e.target.value })}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] text-slate-400 font-bold">اسم العميل المتعاقد</label>
                  <button
                    type="button"
                    onClick={() => {
                      setNewCustomerCompanyId('');
                      setShowAddCustomerModal(true);
                    }}
                    className="text-[9px] font-black text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-2 py-0.5 rounded-lg border border-emerald-500/25 transition-all flex items-center gap-1 active:scale-95 cursor-pointer"
                  >
                    <span>➕</span> {language === 'ar' ? 'إضافة عميل سريع' : 'Quick Add'}
                  </button>
                </div>
                <select
                  value={editProjectForm.clientName || ''}
                  onChange={e => setEditProjectForm({ ...editProjectForm, clientName: e.target.value })}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="">{language === 'ar' ? '-- اختر العميل المتعاقد --' : '-- Select Contracted Client --'}</option>
                  <option value="عميل عام">عميل عام</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.name}>{c.name} {c.company_name ? `(${c.company_name})` : ''}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-slate-400 font-bold">الشركة المالكة / مركز التكلفة</label>
                <select
                  value={editProjectForm.company}
                  onChange={e => setEditProjectForm({ ...editProjectForm, company: e.target.value })}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="">-- اختر الشركة من الحوكمة --</option>
                  {orgUnits.map(unit => (
                    <option key={unit.id} value={unit.name}>{unit.name}</option>
                  ))}
                  {orgUnits.length === 0 && (
                    <>
                      <option value="TED CAPITAL">TED CAPITAL</option>
                      <option value="PRIMEMED PHARMA">PRIMEMED PHARMA</option>
                    </>
                  )}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-slate-400 font-bold">اسم مدير المشروع</label>
                <input
                  type="text"
                  placeholder="مثال: المهندس كريم محمود"
                  value={editProjectForm.projectManager}
                  onChange={e => setEditProjectForm({ ...editProjectForm, projectManager: e.target.value })}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] text-slate-400 font-bold">تاريخ بداية المشروع</label>
                <input
                  type="date"
                  value={editProjectForm.startDate}
                  onChange={e => setEditProjectForm({ ...editProjectForm, startDate: e.target.value })}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowEditProject(false)} className="px-5 py-2 bg-slate-955 border border-slate-800 rounded-xl text-xs text-slate-400">إلغاء</button>
              <button type="submit" className="px-6 py-2 bg-cyan-500 rounded-xl text-xs font-black text-white">حفظ التغييرات 💾</button>
            </div>
          </form>
        )}

        {/* --- PRINT HEADER (VISIBLE ONLY IN PRINTING) --- */}
        <div className="hidden print:block space-y-3 pb-6 mb-6 border-b-2 border-black">
          <div className="text-xs font-black text-slate-500 print:text-black mb-1">{activeProject.company || localStorage.getItem('active_company') || 'TED CAPITAL'}</div>
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold print:text-black">{activeProject.name}</h1>
            <span className="text-xs font-bold print:text-black">تاريخ التقرير: {new Date().toLocaleDateString('ar-EG')}</span>
          </div>
          <div className="flex justify-between items-center text-xs print:text-black font-bold">
            <span>اسم العميل: {activeProject.clientName}</span>
            <span>تقرير الموقف التنفيذي والمالي للمشروع</span>
          </div>
        </div>

        {/* --- COMPANY COST CENTER INFO BANNER --- */}
        {costCenterMode === 'company' && (
          <div className="relative overflow-hidden rounded-3xl p-6 border border-indigo-500/20 bg-indigo-950/20 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-2xl animate-in slide-in-from-top duration-500 no-print">
            <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl opacity-60 translate-x-10 -translate-y-10"></div>
            <div className="flex items-center gap-4 relative z-10">
              <span className="text-3xl">🏢</span>
              <div className="space-y-1">
                <h4 className="text-sm font-black text-indigo-400">تجميع مركز التكلفة على مستوى الشركة نشط</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  أنت تعرض حالياً البيانات المالية المجمعة لكافة مشاريع شركة <span className="text-white font-black">{activeProject.company || 'TED CAPITAL'}</span>. تشمل الموازنة، المصاريف الفعلية، الإيرادات المجمعة، والمصاريف الإدارية والعمومية غير الموزعة.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setCostCenterMode('project');
                triggerNotification('📁 تم العودة إلى مركز تكلفة المشروع الفردي');
              }}
              className="bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-300 text-xs font-black px-4 py-2 rounded-xl transition-all relative z-10 self-start sm:self-auto whitespace-nowrap"
            >
              العودة للمشروع الفردي ←
            </button>
          </div>
        )}

        {/* --- MAIN INTERACTIVE SECTIONS --- */}

        {/* 1. DASHBOARD VIEW */}
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-bottom duration-500">

            {/* Category breakdown visual bars */}
            <div className="lg:col-span-2 bg-[#0f172a] border border-slate-800 p-8 rounded-3xl shadow-lg space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-black text-white flex items-center gap-3">
                  <span>📊</span> مقارنة الموازنة والمنصرف الفعلي لكل بند (Budget vs Actual)
                </h3>
                <button onClick={handlePrint} className="bg-slate-950 border border-slate-800 hover:bg-slate-900 text-slate-300 px-4 py-2 rounded-xl text-xs font-black no-print flex items-center gap-2">
                  <span>🖨️</span> طباعة التقرير
                </button>
              </div>
              <p className="text-xs text-slate-400 no-print">تتبع حي للمصروفات مقارنة بالمبلغ المدرج في المقايسة المعتمدة للعميل للتحقق من ربحية البنود</p>

              <div className="space-y-5 pt-3">
                {Array.from(new Set([...boqCategories, ...Object.keys(totals.expByCategory || {}), ...Object.keys(totals.boqByCategory || {})])).map(cat => {
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
                          <span className="text-red-400">المصروف: {expVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          <span className="text-slate-400">الموازنة: {boqVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] ${usagePercent > 100 || (boqVal === 0 && expVal > 0) ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                            usagePercent > 70 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            }`}>
                            {boqVal === 0 && expVal > 0 ? 'خارج الموازنة' : (usagePercent > 0 ? `${usagePercent.toFixed(0)}%` : 'بدون صرف')}
                          </span>
                        </div>
                      </div>

                      {/* Interactive Bar */}
                      <div className="w-full bg-[#070a13] h-3 rounded-full overflow-hidden p-0.5 border border-slate-800 relative">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ${usagePercent > 100 || (boqVal === 0 && expVal > 0) ? 'bg-gradient-to-l from-red-600 to-rose-400' :
                            usagePercent > 70 ? 'bg-gradient-to-l from-amber-600 to-orange-400' : 'bg-gradient-to-l from-emerald-600 to-teal-400'
                            }`}
                          style={{ width: `${Math.min(usagePercent || (boqVal === 0 && expVal > 0 ? 100 : 1), 100)}%` }}
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
              <div className="bg-[#0f172a] border border-slate-800 p-8 rounded-3xl shadow-lg relative overflow-hidden">
                <div className="absolute top-0 left-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl"></div>
                <h3 className="text-lg font-black text-white mb-4 flex items-center gap-3">
                  <span>💡</span> توصيات الموقف المالي
                </h3>

                <div className="space-y-4 text-xs font-bold text-slate-300">
                  <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800 flex gap-3">
                    <span className="text-xl">💰</span>
                    <div>
                      <h4 className="text-white font-black">هامش الربح التشغيلي</h4>
                      <p className="text-slate-400 mt-1 leading-relaxed">المشروع يحقق كفاءة عالية بفضل ضبط أسعار الخامات ومصنعيات مقاولي الباطن.</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800 flex gap-3">
                    <span className="text-xl">🚨</span>
                    <div>
                      <h4 className="text-white font-black">السيولة النقدية</h4>
                      <p className="text-slate-400 mt-1 leading-relaxed">إجمالي المحصل {totals.totalCollected.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م والمصروف الفعلي {totals.totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م. السيولة في وضع آمن بنسبة تغطية مريحة.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Transaction Log preview */}
              <div className="bg-[#0f172a] border border-slate-800 p-6 rounded-3xl shadow-lg space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-black text-white">آخر الحركات المالية للمشروع</h3>
                  <button onClick={() => setActiveTab('expenses')} className="text-cyan-400 hover:text-cyan-300 text-xs font-bold">عرض الكل ←</button>
                </div>
                <div className="space-y-3">
                  {currentExpenses.slice(-4).reverse().map(item => (
                    <div key={item.id} className="p-3 bg-[#070a13] border border-slate-800 rounded-xl flex justify-between items-center">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-white">{item.beneficiary}</span>
                        <span className="text-[10px] text-slate-500 font-bold mt-0.5">{item.date}</span>
                      </div>
                      <span className="text-xs font-mono font-black text-red-400">-{item.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} جنيه</span>
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

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#131b2e] border border-slate-800 p-6 rounded-[2rem] shadow-2xl no-print">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-3">
                  <span className="p-2 bg-cyan-500/10 rounded-xl border border-cyan-500/25 text-cyan-400">📝</span> مقايسة البنود والكميات التقديرية للفيلا
                </h3>
                <p className="text-xs text-slate-400 mt-1">تعديل الأسعار والكميات والموافقة عليها وتصدير التقارير في ثوانٍ</p>
              </div>
              <div className="flex gap-2">
                <button onClick={handlePrint} className="bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-800 text-slate-300 px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all">
                  <span>🖨️</span> طباعة المقايسة
                </button>
                <button
                  onClick={() => {
                    setEditingItemId(null);
                    setEditingItemType(null);
                    setShowAddBoq(!showAddBoq);
                  }}
                  className="px-5 py-2.5 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 rounded-xl text-xs font-black transition-all active:scale-95"
                >
                  {showAddBoq ? 'إغلاق النموذج' : '+ إضافة بند أعمال جديد'}
                </button>
              </div>
            </div>

            {/* Add / Edit BOQ Form */}
            {(showAddBoq || (editingItemType === 'boq' && editingItemId)) && (
              <form onSubmit={editingItemId ? handleSaveEditBoq : handleAddBoq} className="bg-[#131b2e] border border-slate-800 p-8 rounded-[2rem] space-y-4 animate-in slide-in-from-top duration-300 no-print shadow-2xl">
                <h4 className="text-sm font-black text-cyan-400 flex items-center gap-2">
                  <span>{editingItemId ? '✍️' : '✨'}</span>
                  {editingItemId ? 'تعديل بند بالمقايسة' : 'إدخال بند جديد بالمقايسة'}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-slate-400 font-bold">القسم الأساسي</label>
                    <select
                      value={editingItemId ? editForm.category : newBoq.category}
                      onChange={e => editingItemId ? setEditForm({ ...editForm, category: e.target.value }) : setNewBoq({ ...newBoq, category: e.target.value })}
                      className="bg-[#111827] border border-slate-800 focus:border-cyan-600 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none"
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
                      onChange={e => editingItemId ? setEditForm({ ...editForm, item_name: e.target.value }) : setNewBoq({ ...newBoq, item_name: e.target.value })}
                      className="bg-[#111827] border border-slate-800 focus:border-cyan-600 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-slate-400 font-bold">الوحدة</label>
                    <select
                      value={editingItemId ? editForm.unit : newBoq.unit}
                      onChange={e => editingItemId ? setEditForm({ ...editForm, unit: e.target.value }) : setNewBoq({ ...newBoq, unit: e.target.value })}
                      className="bg-[#111827] border border-slate-800 focus:border-cyan-600 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none w-full"
                    >
                      <option value="">اختر الوحدة...</option>
                      <option value="مقطوعية">مقطوعية</option>
                      <option value="م">م</option>
                      <option value="م٢">م٢</option>
                      <option value="م٣">م٣</option>
                      <option value="عدد">عدد</option>
                      <option value="يومية">يومية</option>
                      {editingItemId && editForm.unit && !['مقطوعية', 'م', 'م٢', 'م2', 'م٣', 'م3', 'عدد', 'يومية'].includes(editForm.unit) && (
                        <option value={editForm.unit}>{editForm.unit}</option>
                      )}
                      {!editingItemId && newBoq.unit && !['مقطوعية', 'م', 'م٢', 'م2', 'م٣', 'م3', 'عدد', 'يومية'].includes(newBoq.unit) && (
                        <option value={newBoq.unit}>{newBoq.unit}</option>
                      )}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-slate-400 font-bold">الكمية التقديرية</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="1"
                      value={editingItemId ? editForm.quantity : newBoq.quantity}
                      onChange={e => editingItemId ? setEditForm({ ...editForm, quantity: e.target.value }) : setNewBoq({ ...newBoq, quantity: e.target.value })}
                      className="bg-[#111827] border border-slate-800 focus:border-cyan-600 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-slate-400 font-bold">سعر الفئة (جنيه)</label>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={editingItemId ? editForm.price : newBoq.price}
                      onChange={e => editingItemId ? setEditForm({ ...editForm, price: e.target.value }) : setNewBoq({ ...newBoq, price: e.target.value })}
                      className="bg-[#111827] border border-slate-800 focus:border-cyan-600 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <label className="text-[10px] text-slate-400 font-bold">ملاحظات البند</label>
                    <input
                      type="text"
                      placeholder="أي ملاحظات فنية أو شروط تشطيب..."
                      value={editingItemId ? editForm.notes : newBoq.notes}
                      onChange={e => editingItemId ? setEditForm({ ...editForm, notes: e.target.value }) : setNewBoq({ ...newBoq, notes: e.target.value })}
                      className="bg-[#111827] border border-slate-800 focus:border-cyan-600 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => { setShowAddBoq(false); setEditingItemId(null); }} className="px-5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-400 hover:text-white transition-all">إلغاء</button>
                  <button type="submit" className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-600 rounded-xl text-xs font-black text-slate-955 transition-all">
                    {editingItemId ? 'حفظ التعديلات 💾' : 'إضافة البند الآن 🚀'}
                  </button>
                </div>
              </form>
            )}

            {/* Interactive BOQ List */}
            <div className="bg-[#131b2e] border border-slate-800 rounded-[2rem] overflow-hidden shadow-2xl print:border-black print:bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-right whitespace-nowrap">
                  <thead className="bg-[#111827] border-b border-slate-800 print:bg-slate-100 print:text-black">
                    <tr className="text-slate-400 text-[10px] uppercase tracking-widest font-black print:text-black">
                      <th className="px-6 py-5">مسلسل</th>
                      <th className="px-6 py-5">القسم والبيان</th>
                      <th className="px-6 py-5">وصف البند الهندسي</th>
                      <th className="px-6 py-5 text-center">الكمية</th>
                      <th className="px-6 py-5 text-center">الوحدة</th>
                      <th className="px-6 py-5 text-center">الفئة</th>
                      <th className="px-6 py-5 text-center">الإجمالي</th>
                      <th className="px-6 py-5 text-left no-print">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 print:divide-black">
                    {currentBoqItems.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-cyan-500/[0.03] hover:scale-[1.002] transition-all duration-300 group print:bg-transparent">
                        <td className="px-6 py-5 font-mono text-xs text-slate-500 print:text-black">{idx + 1}</td>
                        <td className="px-6 py-5">
                          <span className={`px-3 py-1 rounded-full text-[9px] font-black border ${activeGrad(item.category)} print:border-none print:p-0 print:text-black print:bg-transparent print:font-bold`}>
                            {item.category}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex flex-col max-w-lg print:max-w-none">
                            <span className="text-xs font-bold text-slate-200 group-hover:text-cyan-300 transition-colors leading-relaxed whitespace-normal print:text-black">{item.item_name}</span>
                            {item.notes && <span className="text-[10px] text-slate-400 mt-1 italic whitespace-normal font-medium bg-[#070a13] p-2 rounded-lg border border-slate-800 print:text-slate-600 print:border-none print:bg-transparent print:p-0 print:mt-1 print:block">{item.notes}</span>}
                          </div>
                        </td>
                        <td className="px-6 py-5 text-center font-mono font-black text-slate-300 print:text-black">{item.quantity}</td>
                        <td className="px-6 py-5 text-center text-xs text-slate-400 print:text-black">{item.unit || '-'}</td>
                        <td className="px-6 py-5 text-center font-mono font-black text-cyan-400 print:text-black">{item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م</td>
                        <td className="px-6 py-5 text-center font-mono font-black text-white text-sm print:text-black">{(item.quantity * item.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م</td>
                        <td className="px-6 py-5 text-left no-print">
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => handleStartEditBoq(item)}
                              className="px-3 py-1.5 bg-slate-900 border border-slate-800 hover:border-cyan-600 hover:bg-cyan-500 hover:text-slate-950 rounded-xl text-[9px] font-black transition-all"
                            >
                              تعديل ✏️
                            </button>
                            <button
                              onClick={() => handleDeleteBoq(item.id)}
                              className="px-3 py-1.5 bg-rose-955/30 border border-rose-500/20 hover:bg-rose-600 hover:text-white text-rose-400 rounded-xl text-[9px] font-black transition-all"
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

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#131b2e] border border-slate-800 p-6 rounded-[2rem] shadow-2xl no-print">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-3">
                  <span className="p-2 bg-rose-500/10 rounded-xl border border-rose-500/25 text-rose-400">💸</span> دفتر وقيد المصروفات الفعلية للمشروع
                </h3>
                <p className="text-xs text-slate-400 mt-1">تتبع المشتريات ومستخلصات مقاولي الباطن والعمالة والتوريدات</p>
              </div>
              <div className="flex gap-2">
                <button onClick={handlePrint} className="bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-800 text-slate-300 px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 transition-all">
                  <span>🖨️</span> طباعة المصروفات
                </button>
                <button
                  onClick={() => {
                    setEditingItemId(null);
                    setEditingItemType(null);
                    setShowAddExpense(!showAddExpense);
                  }}
                  className="px-5 py-2.5 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 rounded-xl text-xs font-black transition-all active:scale-95"
                >
                  {showAddExpense ? 'إغلاق النموذج' : '+ تسجيل مصروف جديد'}
                </button>
              </div>
            </div>

            {/* Add / Edit Expense Form */}
            {(showAddExpense || (editingItemType === 'expense' && editingItemId)) && (
              <form onSubmit={editingItemId ? handleSaveEditExpense : handleAddExpense} className="bg-[#131b2e] border border-slate-800 p-8 rounded-[2rem] space-y-4 animate-in slide-in-from-top duration-300 no-print shadow-2xl">
                <h4 className="text-sm font-black text-cyan-400 flex items-center gap-2">
                  <span>{editingItemId ? '✍️' : '✨'}</span>
                  {editingItemId ? 'تعديل مصروف مسجل' : 'تسجيل حركة صرف جديدة للمشروع'}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-slate-400 font-bold">الجهة المستفيدة / البائع</label>
                    <input
                      type="text"
                      placeholder="مثال: المعلم أحمد، شركة السلاب..."
                      value={editingItemId ? editForm.beneficiary : newExpense.beneficiary}
                      onChange={e => editingItemId ? setEditForm({ ...editForm, beneficiary: e.target.value }) : setNewExpense({ ...newExpense, beneficiary: e.target.value })}
                      className="bg-[#111827] border border-slate-800 focus:border-cyan-600 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-slate-400 font-bold">البند المرتبط (BOQ)</label>
                    <select
                      value={editingItemId ? editForm.category : newExpense.category}
                      onChange={e => editingItemId ? setEditForm({ ...editForm, category: e.target.value }) : setNewExpense({ ...newExpense, category: e.target.value })}
                      className="bg-[#111827] border border-slate-800 focus:border-cyan-600 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none w-full"
                    >
                      <option value="">— اختر البند —</option>
                      {currentBoqItems.map(item => (
                        <option key={item.id} value={`[${item.category}] ${item.item_name}`}>
                          [{item.category}] {item.item_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-slate-400 font-bold">التاريخ</label>
                    <input
                      type="date"
                      value={editingItemId ? editForm.date : newExpense.date}
                      onChange={e => editingItemId ? setEditForm({ ...editForm, date: e.target.value }) : setNewExpense({ ...newExpense, date: e.target.value })}
                      className="bg-[#111827] border border-slate-800 focus:border-cyan-600 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-slate-400 font-bold">الوحدة</label>
                    <select
                      value={editingItemId ? editForm.unit : newExpense.unit}
                      onChange={e => editingItemId ? setEditForm({ ...editForm, unit: e.target.value }) : setNewExpense({ ...newExpense, unit: e.target.value })}
                      className="bg-[#111827] border border-slate-800 focus:border-cyan-600 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none w-full"
                    >
                      <option value="">اختر الوحدة...</option>
                      <option value="مقطوعية">مقطوعية</option>
                      <option value="م">م</option>
                      <option value="م٢">م٢</option>
                      <option value="م٣">م٣</option>
                      <option value="عدد">عدد</option>
                      <option value="يومية">يومية</option>
                      {editingItemId && editForm.unit && !['مقطوعية', 'م', 'م٢', 'م2', 'م٣', 'م3', 'عدد', 'يومية'].includes(editForm.unit) && (
                        <option value={editForm.unit}>{editForm.unit}</option>
                      )}
                      {!editingItemId && newExpense.unit && !['مقطوعية', 'م', 'م٢', 'م2', 'م٣', 'م3', 'عدد', 'يومية'].includes(newExpense.unit) && (
                        <option value={newExpense.unit}>{newExpense.unit}</option>
                      )}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-slate-400 font-bold">الكمية / العدد</label>
                    <input
                      type="number"
                      value={editingItemId ? editForm.qty : newExpense.qty}
                      onChange={e => editingItemId ? setEditForm({ ...editForm, qty: e.target.value }) : setNewExpense({ ...newExpense, qty: e.target.value })}
                      className="bg-[#111827] border border-slate-800 focus:border-cyan-600 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-slate-400 font-bold">سعر الوحدة / الفئة</label>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={editingItemId ? editForm.rate : newExpense.rate}
                      onChange={e => editingItemId ? setEditForm({ ...editForm, rate: e.target.value }) : setNewExpense({ ...newExpense, rate: e.target.value })}
                      className="bg-[#111827] border border-slate-800 focus:border-cyan-600 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-slate-400 font-bold">مركز تخصيص المصروف</label>
                    <select
                      value={editingItemId ? (editForm.allocationType || 'project') : (newExpense.allocationType || 'project')}
                      onChange={e => editingItemId ? setEditForm({ ...editForm, allocationType: e.target.value }) : setNewExpense({ ...newExpense, allocationType: e.target.value })}
                      className="bg-[#111827] border border-slate-800 focus:border-cyan-600 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none"
                    >
                      <option value="project">📁 تخصيص مباشر للمشروع الحالي</option>
                      <option value="company">🏢 مصاريف إدارية عمومية للشركة</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <label className="text-[10px] text-slate-400 font-bold">البيان والتفاصيل</label>
                    <input
                      type="text"
                      placeholder="أي ملاحظات أو أرقام فواتير..."
                      value={editingItemId ? editForm.notes : newExpense.notes}
                      onChange={e => editingItemId ? setEditForm({ ...editForm, notes: e.target.value }) : setNewExpense({ ...newExpense, notes: e.target.value })}
                      className="bg-[#111827] border border-slate-800 focus:border-cyan-600 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => { setShowAddExpense(false); setEditingItemId(null); }} className="px-5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-400 hover:text-white transition-all">إلغاء</button>
                  <button type="submit" className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-600 rounded-xl text-xs font-black text-slate-955 transition-all">
                    {editingItemId ? 'حفظ التعديلات 💾' : 'تسجيل المصروف الآن 💸'}
                  </button>
                </div>
              </form>
            )}

            {/* Search & Filter Controls */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-[#131b2e] border border-slate-800 p-5 rounded-2xl no-print">
              <input
                type="text"
                placeholder="🔍 ابحث عن مصروف بالجهة أو الملاحظات..."
                value={expenseSearch}
                onChange={e => setExpenseSearch(e.target.value)}
                className="bg-[#111827] border border-slate-800 focus:border-cyan-600 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none w-full"
              />

              <select
                value={expenseCategoryFilter}
                onChange={e => setExpenseCategoryFilter(e.target.value)}
                className="bg-[#111827] border border-slate-800 focus:border-cyan-600 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none w-full font-bold"
              >
                <option value="All">كل البنود المرتبطة (BOQ)</option>
                {currentBoqItems.map(item => (
                  <option key={item.id} value={`[${item.category}] ${item.item_name}`}>
                    [{item.category}] {item.item_name}
                  </option>
                ))}
              </select>

              <div className="text-xs font-bold flex items-center justify-end text-slate-400">
                إجمالي المصاريف المصفاة: <span className="font-mono text-cyan-400 font-black text-sm mr-2 bg-cyan-500/10 border border-slate-850 px-3 py-1.5 rounded-xl">{filteredExpenses.reduce((acc, curr) => acc + curr.total, 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م</span>
              </div>
            </div>

            {/* Expenses List */}
            <div className="bg-[#131b2e] border border-slate-800 rounded-[2rem] overflow-hidden shadow-2xl print:border-black print:bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-right whitespace-nowrap">
                  <thead className="bg-[#111827] border-b border-slate-800 print:bg-slate-100 print:text-black">
                    <tr className="text-slate-400 text-[10px] uppercase tracking-widest font-black print:text-black">
                      <th className="px-6 py-5">تاريخ الصرف</th>
                      <th className="px-6 py-5">الجهة المستفيدة / البائع</th>
                      <th className="px-6 py-5">البيان والتفاصيل</th>
                      <th className="px-6 py-5">البند المرتبط (BOQ)</th>
                      <th className="px-6 py-5 text-center">الكمية</th>
                      <th className="px-6 py-5 text-center">الفئة</th>
                      <th className="px-6 py-5 text-center">المبلغ الإجمالي</th>
                      <th className="px-6 py-5 text-left no-print">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 print:divide-black">
                    {filteredExpenses.map(item => (
                      <tr key={item.id} className="hover:bg-cyan-500/[0.03] hover:scale-[1.002] transition-all duration-300 group">
                        <td className="px-6 py-5 font-mono text-xs text-slate-400 print:text-black">{item.date}</td>
                        <td className="px-6 py-5">
                          <span className="text-xs font-bold text-slate-200 group-hover:text-cyan-300 transition-colors print:text-black">{item.beneficiary}</span>
                        </td>
                        <td className="px-6 py-5">
                          <span className="text-xs text-slate-300 print:text-black whitespace-normal break-words max-w-[250px] inline-block">{item.notes || '-'}</span>
                        </td>
                        <td className="px-6 py-5">
                          <span className={`px-3 py-1 rounded-full text-[9px] font-black border ${activeGrad(item.category)}`}>
                            {item.category}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-center font-mono font-bold text-slate-400 print:text-black">{item.qty} {item.unit || 'فاتورة'}</td>
                        <td className="px-6 py-5 text-center font-mono font-bold text-slate-400 print:text-black">{item.rate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="px-6 py-5 text-center font-mono font-black text-rose-400 text-sm print:text-black">-{item.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} جنيه</td>
                        <td className="px-6 py-5 text-left no-print">
                          <div className="flex gap-2 justify-end">
                            {!String(item.id).startsWith('db-sale-') && (
                              <button
                                onClick={() => handleStartEditExpense(item)}
                                className="px-3 py-1.5 bg-slate-900 border border-slate-800 hover:border-cyan-600 hover:bg-cyan-500 hover:text-slate-955 rounded-xl text-[9px] font-black transition-all"
                              >
                                تعديل ✏️
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteExpense(item.id)}
                              className="px-3 py-1.5 bg-rose-955/30 border border-rose-500/20 hover:bg-rose-600 hover:text-white text-rose-400 rounded-xl text-[9px] font-black transition-all"
                            >
                              حذف 🗑️
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredExpenses.length === 0 && (
                      <tr>
                        <td colSpan="8" className="p-12 text-center text-xs text-slate-500 font-bold">لا توجد مصروفات مسجلة مطابقة للبحث في هذا المشروع.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* 4. CLIENT PAYMENTS & PROGRESS CLAIMS VIEW */}
        {activeTab === 'client' && (
          <div className="space-y-8 animate-in slide-in-from-bottom duration-500">

            {/* 4.1 Financial Highlights / Balances */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 no-print">
              <div className="bg-[#131b2e] border border-slate-800 p-6 rounded-[2rem] shadow-2xl space-y-2 hover:scale-[1.02] transition-all duration-300">
                <span className="text-[10px] font-black text-slate-400">قيمة العقد المعتمد (BOQ)</span>
                <div className="text-xl font-black text-white font-mono">{totals.totalBOQ.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs">ج.م</span></div>
                <div className="text-[9px] text-slate-500 font-bold">مجموع بنود مقايسة البنود والكميات</div>
              </div>
              <div className="bg-[#131b2e] border border-slate-800 p-6 rounded-[2rem] shadow-2xl space-y-2 hover:scale-[1.02] transition-all duration-300">
                <span className="text-[10px] font-black text-cyan-400">إجمالي المستخلصات المعتمدة</span>
                <div className="text-xl font-black text-cyan-400 font-mono">
                  {totals.totalValuations.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs">ج.م</span>
                  <span className="mr-2 text-xs font-black px-1.5 py-0.5 rounded bg-cyan-500/10 border border-slate-850">{totals.valuationProgressPercent.toFixed(1)}%</span>
                </div>
                <div className="text-[9px] text-slate-500 font-bold">قيمة مستخلصات الإنجاز الصادرة</div>
              </div>
              <div className="bg-[#131b2e] border border-slate-800 p-6 rounded-[2rem] shadow-2xl space-y-2 hover:scale-[1.02] transition-all duration-300">
                <span className="text-[10px] font-black text-emerald-400">إجمالي التحصيلات الفعلية</span>
                <div className="text-xl font-black text-emerald-400 font-mono">
                  {totals.totalCollected.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs">ج.م</span>
                  <span className="mr-2 text-xs font-black px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">{totals.progressPercent.toFixed(1)}%</span>
                </div>
                <div className="text-[9px] text-slate-500 font-bold">المبالغ المقبوضة نقدياً وبنكياً</div>
              </div>
              <div className="bg-[#131b2e] border border-slate-800 p-6 rounded-[2rem] shadow-2xl space-y-2 hover:scale-[1.02] transition-all duration-300">
                <span className="text-[10px] font-black text-amber-400">مستخلصات غير مسددة / ذمم مدينة</span>
                <div className="text-xl font-black text-amber-400 font-mono">{(Math.max(0, totals.totalValuations - totals.totalCollected)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs">ج.م</span></div>
                <div className="text-[9px] text-slate-500 font-bold">مستخلصات معتمدة بانتظار سداد العميل</div>
              </div>
            </div>

            {/* 4.2 Dynamic Progress Claims (Valuations) Wizard Modal / Section */}
            {showAddValuation && (
              <form onSubmit={handleAddValuation} className="bg-[#131b2e] border border-slate-800 p-8 rounded-[2rem] space-y-6 no-print animate-in slide-in-from-top duration-300 shadow-2xl">
                <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                  <h4 className="text-sm font-black text-cyan-400 flex items-center gap-2">
                    <span className="p-1.5 bg-cyan-500/10 rounded-lg text-cyan-400">🏗️</span> {editingValuationId ? 'تعديل مستخلص إنجاز أعمال تراكمي للعميل' : 'إنشاء مستخلص إنجاز أعمال تراكمي جديد (حسب الكميات المنفذة)'}
                  </h4>
                  <div className="flex items-center gap-3">
                    <label className="text-xs text-slate-400 font-bold">تاريخ المستخلص:</label>
                    <input
                      type="date"
                      value={valuationDate}
                      onChange={e => setValuationDate(e.target.value)}
                      className="bg-[#111827] border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-600"
                      required
                    />
                  </div>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-800">
                  <table className="w-full text-right text-xs">
                    <thead className="bg-[#111827] text-slate-400 font-bold">
                      <tr>
                        <th className="p-3">القسم</th>
                        <th className="p-3">البيان</th>
                        <th className="p-3 text-center">الوحدة</th>
                        <th className="p-3 text-center">الكمية</th>
                        <th className="p-3 text-center">الفئة</th>
                        <th className="p-3 text-center">القيمة الكلية</th>
                        <th className="p-3 text-center">الإنجاز السابق %</th>
                        <th className="p-3 text-center">الإنجاز التراكمي % ✏️</th>
                        <th className="p-3 text-center">إنجاز الفترة %</th>
                        <th className="p-3 text-center">قيمة المستخلص</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 bg-slate-950/20">
                      {currentBoqItems.map(item => {
                        const prevPercent = getPrevCompletionPercent(item.id);
                        const currPercentVal = newValuationItems[item.id] !== undefined ? newValuationItems[item.id] : prevPercent;
                        const currPercent = Math.min(100, Math.max(prevPercent, Number(currPercentVal)));
                        const netPercent = Math.max(0, currPercent - prevPercent);
                        const netQty = (netPercent / 100) * item.quantity;
                        const netClaimVal = netQty * item.price;
                        return (
                          <tr key={item.id} className="hover:bg-cyan-500/[0.02] transition-colors">
                            <td className="p-3 text-[10px] text-slate-400 font-bold">{item.category}</td>
                            <td className="p-3 font-black text-slate-200 max-w-[160px]">{item.item_name}</td>
                            <td className="p-3 text-center font-mono text-slate-450 text-[10px]">{item.unit}</td>
                            <td className="p-3 text-center font-mono text-slate-400">{item.quantity}</td>
                            <td className="p-3 text-center font-mono text-cyan-400">{item.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            <td className="p-3 text-center font-mono text-slate-400">{(item.quantity * item.price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            <td className="p-3 text-center font-mono font-black text-amber-400">{prevPercent.toFixed(1)}%</td>
                            <td className="p-3 text-center">
                              <div className="flex items-center gap-1 justify-center">
                                <input
                                  type="number"
                                  min={prevPercent}
                                  max={100}
                                  step="0.5"
                                  value={currPercentVal}
                                  onChange={e => setNewValuationItems({ ...newValuationItems, [item.id]: e.target.value })}
                                  className="bg-[#111827] border border-cyan-600/40 focus:border-cyan-500 rounded-xl p-1.5 text-center text-xs text-white font-mono w-16 focus:outline-none"
                                  required
                                />
                                <span className="text-[10px] text-slate-500">%</span>
                              </div>
                            </td>
                            <td className="p-3 text-center font-mono font-black text-cyan-400">+{netPercent.toFixed(1)}%</td>
                            <td className="p-3 text-center font-mono font-black text-emerald-400">{netClaimVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* ───── Summary + Optional Discount % & Tax ───── */}
                <div className="bg-[#0f172a] p-5 rounded-2xl border border-slate-800 space-y-4">
                  {(() => {
                    const gross = currentBoqItems.reduce((acc, curr) => {
                      const prevPercent = getPrevCompletionPercent(curr.id);
                      const currPercentVal = newValuationItems[curr.id] !== undefined ? newValuationItems[curr.id] : prevPercent;
                      const currPercent = Math.min(100, Math.max(prevPercent, Number(currPercentVal)));
                      const netPercent = Math.max(0, currPercent - prevPercent);
                      const netQty = (netPercent / 100) * curr.quantity;
                      return acc + (netQty * curr.price);
                    }, 0);
                    const discountRate = valuationDiscount ? Number(valuationDiscount) : 0;
                    const discountAmt = gross * (discountRate / 100);
                    const afterDiscount = gross - discountAmt;
                    const taxRatePercent = valuationTax ? Number(valuationTax) : 0;
                    let taxAmt = 0;
                    if (valuationTaxMethod === 'period') {
                      taxAmt = afterDiscount * (taxRatePercent / 100);
                    } else if (valuationTaxMethod === 'cumulative') {
                      let cumulativeGross = 0;
                      currentBoqItems.forEach(curr => {
                        const prevPercent = getPrevCompletionPercent(curr.id);
                        const currPercentVal = newValuationItems[curr.id] !== undefined ? newValuationItems[curr.id] : prevPercent;
                        const currPercent = Math.min(100, Math.max(prevPercent, Number(currPercentVal)));
                        cumulativeGross += (currPercent / 100) * curr.quantity * curr.price;
                      });
                      const prevTaxPaid = valuations
                        .filter(v => !v.isContractor && String(v.projectId) === String(activeProjectId))
                        .reduce((sum, v) => sum + Number(v.taxAmount || 0), 0);
                      const cumulativeTax = cumulativeGross * (taxRatePercent / 100);
                      taxAmt = Math.max(0, cumulativeTax - prevTaxPaid);
                    } else {
                      taxAmt = 0;
                    }
                    const totalFinal = afterDiscount + taxAmt;
                    return (
                      <>
                        <div className="flex items-center justify-between flex-wrap gap-3">
                          <span className="text-xs font-bold text-slate-400">إجمالي صافي قيمة المستخلص المالي المقدر:</span>
                          <span className="font-mono text-lg font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-xl">{gross.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م</span>
                        </div>

                        {/* Optional Discount % */}
                        <div className="flex items-center gap-3 flex-wrap">
                          <label className="text-xs text-slate-400 font-bold whitespace-nowrap">خصم % (اختياري):</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.5"
                            value={valuationDiscount}
                            onChange={e => setValuationDiscount(e.target.value)}
                            placeholder="0"
                            className="bg-[#111827] border border-slate-700 focus:border-amber-500 rounded-xl px-4 py-2 text-xs text-white font-mono focus:outline-none w-28"
                          />
                          {discountRate > 0 && (
                            <span className="text-xs font-mono font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-xl">- {discountAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م ({discountRate}%)</span>
                          )}
                        </div>

                        {/* After Discount */}
                        {discountRate > 0 && (
                          <div className="flex items-center justify-between flex-wrap gap-3">
                            <span className="text-xs font-bold text-slate-400">الإجمالي بعد الخصم:</span>
                            <span className="font-mono text-base font-black text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-3 py-1 rounded-xl">{afterDiscount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م</span>
                          </div>
                        )}

                        {/* Optional Tax */}
                        <div className="flex items-center gap-3 flex-wrap">
                          <label className="text-xs text-slate-400 font-bold whitespace-nowrap">ضريبة % (اختيارية):</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.5"
                            value={valuationTax}
                            onChange={e => setValuationTax(e.target.value)}
                            placeholder="مثال: 14"
                            className="bg-[#111827] border border-slate-700 focus:border-purple-500 rounded-xl px-4 py-2 text-xs text-white font-mono focus:outline-none w-40"
                          />
                          <select
                            value={valuationTaxMethod}
                            onChange={e => setValuationTaxMethod(e.target.value)}
                            className="bg-[#111827] border border-slate-700 focus:border-purple-500 rounded-xl px-4 py-2 text-xs text-white focus:outline-none w-48"
                          >
                            <option value="period">ضريبة على الفترة الحالية فقط</option>
                            <option value="cumulative">ضريبة تراكمية</option>
                            <option value="waived">إعفاء ضريبي</option>
                          </select>
                          {taxAmt > 0 && (
                            <span className="text-xs font-mono font-black text-purple-400 bg-purple-500/10 border border-purple-500/20 px-3 py-1 rounded-xl">+ {taxAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م ضريبة</span>
                          )}
                        </div>

                        {/* Final Total */}
                        {(discountRate > 0 || taxAmt > 0) && (
                          <div className="flex items-center justify-between flex-wrap gap-3 pt-3 border-t border-slate-700">
                            <span className="text-xs font-black text-white">🏆 الإجمالي النهائي بعد الخصم والضريبة:</span>
                            <span className="font-mono text-xl font-black text-emerald-300 bg-emerald-500/15 border border-emerald-400/30 px-4 py-1.5 rounded-xl">{totalFinal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م</span>
                          </div>
                        )}
                      </>
                    );
                  })()}

                  <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={() => { setShowAddValuation(false); setEditingValuationId(null); }} className="px-5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-400 hover:text-white transition-all">إلغاء</button>
                    <button type="submit" className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-600 rounded-xl text-xs font-black text-slate-950 transition-all">{editingValuationId ? 'حفظ التعديلات 💾' : 'اعتماد وتوليد الفاتورة 🏗️'}</button>
                  </div>
                </div>
              </form>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                 🏗️ CONTRACTOR VALUATION WIZARD — إنشاء مستخلص للمقاول
            ════════════════════════════════════════════════════════════════ */}
            {showAddContractorValuation && (
              <form onSubmit={handleAddContractorValuation} className="bg-[#131b2e] border border-orange-500/30 p-8 rounded-[2rem] space-y-6 no-print animate-in slide-in-from-top duration-300 shadow-2xl">
                <div className="flex justify-between items-center pb-3 border-b border-orange-500/20">
                  <h4 className="text-sm font-black text-orange-400 flex items-center gap-2">
                    <span className="p-1.5 bg-orange-500/10 rounded-lg text-orange-400">🏗️</span>
                    {editingValuationId ? 'تعديل مستخلص إنجاز أعمال تراكمي للمقاول' : 'إنشاء مستخلص إنجاز أعمال تراكمي جديد (حسب الكميات المنفذة) للمقاول'}
                  </h4>
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-slate-400 font-bold">اسم المقاول:</label>
                      <div className="flex items-center gap-1">
                        <select
                          value={contractorValuationContractorName}
                          onChange={e => {
                            const newSub = e.target.value;
                            setContractorValuationContractorName(newSub);
                            setContractorValuationLines(prev => prev.map(l => {
                              let updated = { ...l, contractorName: newSub };
                              if (l.boqItemId && newSub) {
                                let autoPrevQty = 0;
                                valuations.forEach(val => {
                                  if (val.isContractor && String(val.projectId) === String(activeProjectId) && val.id !== editingValuationId) {
                                    val.lines?.forEach(prevLn => {
                                      if (
                                        String(prevLn.boqItemId) === String(l.boqItemId) &&
                                        (prevLn.contractorName || '').trim().toLowerCase() === newSub.trim().toLowerCase()
                                      ) {
                                        autoPrevQty += Number(prevLn.quantity || 0);
                                      }
                                    });
                                  }
                                });
                                updated.prevQty = autoPrevQty;
                              }
                              return updated;
                            }));
                          }}
                          className="bg-[#111827] border border-orange-500/20 hover:border-orange-500 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500 transition-all font-bold"
                          required
                        >
                          <option value="">— اختر المقاول —</option>
                          {subcontractorsList.map((sub, sIdx) => {
                            const subName = sub.name || sub.contractor_name || '';
                            return (
                              <option key={sIdx} value={subName}>
                                {subName}
                              </option>
                            );
                          })}
                        </select>
                        <button
                          type="button"
                          onClick={() => {
                            const projComp = activeProject?.company || 'TED CAPITAL';
                            const matched = companies.find(c => c.name.toLowerCase() === projComp.toLowerCase());
                            setQuickAddSubCompanyId(matched ? String(matched.id) : '');
                            setQuickAddSubCompany(projComp);
                            setQuickAddSubEmail('');
                            setQuickAddSubName('');
                            setQuickAddSubPhone('');
                            setQuickAddLineId(null);
                            setShowQuickAddSub(true);
                          }}
                          className="text-[11px] font-black text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 px-2.5 py-1.5 rounded-xl border border-emerald-500/20 transition-all flex items-center gap-1 active:scale-95 shadow-sm cursor-pointer whitespace-nowrap"
                          title="إضافة مقاول جديد"
                        >
                          <span className="font-black text-emerald-400">+</span> Quick Add
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-slate-400 font-bold">مستخلص العميل المرتبط:</label>
                      <select
                        value={contractorValuationLinkedClientValId}
                        onChange={e => setContractorValuationLinkedClientValId(e.target.value)}
                        className="bg-[#111827] border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500 transition-all"
                      >
                        <option value="">— غير مرتبط —</option>
                        {currentValuations.filter(v => !v.isContractor).map(v => (
                          <option key={v.id} value={v.id}>{v.claimNo} ({v.date})</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-slate-400 font-bold">تاريخ المستخلص:</label>
                      <input
                        type="date"
                        value={contractorValuationDate}
                        onChange={e => setContractorValuationDate(e.target.value)}
                        className="bg-[#111827] border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500 transition-all"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* ═══ Dynamic Contractor Lines Table ═══ */}
                <div className="overflow-x-auto rounded-2xl border border-orange-500/20">
                  <table className="w-full text-right text-xs min-w-[1000px]">
                    <thead className="bg-[#111827] text-slate-400 font-bold">
                      <tr>
                        <th className="p-2 text-right text-[10px]">البند المرتبط (BOQ)</th>
                        <th className="p-2 text-right text-[10px] w-48">وصف البند</th>
                        <th className="p-2 text-center text-[10px] w-16">الوحدة</th>
                        <th className="p-2 text-center text-[10px] w-12">السابق</th>
                        <th className="p-2 text-center text-[10px] w-16">الكمية المتاحة</th>
                        <th className="p-2 text-center text-[10px] w-16">الحالي</th>
                        <th className="p-2 text-center text-[10px] w-16">سعر الفئة</th>
                        <th className="p-2 text-center text-[10px] w-12">النسبة %</th>
                        <th className="p-2 text-right text-[10px] w-24">ملاحظات</th>
                        <th className="p-2 text-center text-[10px] w-20">الإجمالي</th>
                        <th className="p-2 text-center text-[10px] w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {contractorValuationLines.map((line, idx) => {
                        const prevQty = Number(line.prevQty || 0);
                        const currQty = Number(line.quantity || 0);
                        const cumQty = prevQty + currQty;
                        const pct = Number(line.percentage !== undefined ? line.percentage : 100);
                        const lineTotal = cumQty * Number(line.unitPrice || 0) * (pct / 100);
                        
                        const boqItem = currentBoqItems.find(item => String(item.id) === String(line.boqItemId));
                        const totalBilledByAll = valuations
                          .filter(v => v.isContractor && String(v.projectId) === String(activeProjectId) && v.id !== editingValuationId)
                          .reduce((sum, v) => {
                            const matchLines = v.lines?.filter(l => String(l.boqItemId) === String(line.boqItemId)) || [];
                            return sum + matchLines.reduce((s, l) => s + Number(l.quantity || 0), 0);
                          }, 0);
                        const availableQty = boqItem ? (boqItem.quantity - totalBilledByAll) : 0;

                        return (
                          <tr key={line.id} className="bg-slate-950/20 hover:bg-orange-500/[0.03] transition-colors">
                            {/* BOQ Item Selector */}
                            <td className="p-1.5">
                              <select
                                value={line.boqItemId}
                                onChange={e => updateContractorLine(line.id, 'boqItemId', e.target.value)}
                                className="bg-[#111827] border border-slate-700 focus:border-orange-500 rounded-xl px-2 py-1 text-[10px] text-white w-full focus:outline-none"
                              >
                                <option value="">— اختر البند —</option>
                                {currentBoqItems.map(item => (
                                  <option key={item.id} value={item.id}>
                                    [{item.category}] {item.item_name}
                                  </option>
                                ))}
                              </select>
                            </td>
                            {/* Item Description */}
                            <td className="p-1.5">
                              <input
                                type="text"
                                value={line.description || ''}
                                onChange={e => updateContractorLine(line.id, 'description', e.target.value)}
                                placeholder="وصف البند..."
                                className="bg-[#111827] border border-slate-700 focus:border-orange-500 rounded-xl px-2 py-1 text-xs text-white w-full focus:outline-none"
                              />
                            </td>
                            {/* Unit */}
                            <td className="p-1.5">
                              <input
                                type="text"
                                value={line.unit}
                                onChange={e => updateContractorLine(line.id, 'unit', e.target.value)}
                                placeholder="م٢"
                                className="bg-[#111827] border border-slate-700 focus:border-orange-500 rounded-xl px-2 py-1 text-xs text-white text-center w-full focus:outline-none"
                              />
                            </td>
                            {/* Previous Qty */}
                            <td className="p-1.5">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={line.prevQty || 0}
                                onChange={e => updateContractorLine(line.id, 'prevQty', e.target.value)}
                                className="bg-[#111827] border border-slate-700 focus:border-orange-500 rounded-xl px-1 py-1 text-xs text-white font-mono text-center w-full focus:outline-none"
                              />
                            </td>
                            {/* Available Qty */}
                            <td className="p-1.5 text-center font-mono font-bold">
                              {boqItem ? (
                                <span className="px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-lg">
                                  {availableQty.toFixed(2)}
                                </span>
                              ) : (
                                <span className="text-slate-500">-</span>
                              )}
                            </td>
                            {/* Current Qty */}
                            <td className="p-1.5">
                              <input
                                type="number"
                                min="0"
                                max={boqItem ? Math.max(0, availableQty) : undefined}
                                step="0.01"
                                value={line.quantity || 0}
                                onChange={e => updateContractorLine(line.id, 'quantity', e.target.value)}
                                className="bg-[#111827] border border-slate-700 focus:border-orange-500 rounded-xl px-1 py-1 text-xs text-white font-mono text-center w-full focus:outline-none"
                                required
                              />
                            </td>
                            {/* Unit Price */}
                            <td className="p-1.5">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={line.unitPrice || 0}
                                onChange={e => updateContractorLine(line.id, 'unitPrice', e.target.value)}
                                className="bg-[#111827] border border-slate-700 focus:border-orange-500 rounded-xl px-1 py-1 text-xs text-white font-mono text-center w-full focus:outline-none"
                                required
                              />
                            </td>
                            {/* Percentage */}
                            <td className="p-1.5">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                step="1"
                                value={line.percentage !== undefined ? line.percentage : 100}
                                onChange={e => updateContractorLine(line.id, 'percentage', e.target.value)}
                                className="bg-[#111827] border border-slate-700 focus:border-orange-500 rounded-xl px-1 py-1 text-xs text-white font-mono text-center w-full focus:outline-none"
                              />
                            </td>
                            {/* Notes */}
                            <td className="p-1.5">
                              <input
                                type="text"
                                value={line.notes || ''}
                                onChange={e => updateContractorLine(line.id, 'notes', e.target.value)}
                                placeholder="ملاحظات..."
                                className="bg-[#111827] border border-slate-700 focus:border-orange-500 rounded-xl px-2 py-1 text-xs text-white w-full focus:outline-none"
                              />
                            </td>
                            {/* Line Total */}
                            <td className="p-1.5 text-center font-mono font-black text-emerald-400">
                              {lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            {/* Delete */}
                            <td className="p-1.5 text-center">
                              <button
                                type="button"
                                onClick={() => removeContractorLine(line.id)}
                                className="text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg p-1 transition-all"
                                title="حذف السطر"
                              >✕</button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Add Line Button */}
                <button
                  type="button"
                  onClick={addContractorLine}
                  className="w-full py-2.5 border border-dashed border-orange-500/40 hover:border-orange-500 text-orange-400 hover:text-orange-300 rounded-2xl text-xs font-black transition-all hover:bg-orange-500/5"
                >
                  + إضافة سطر مقاول جديد
                </button>

                {/* ───── Summary + Discount % & Tax ───── */}
                <div className="bg-[#0f172a] p-5 rounded-2xl border border-orange-500/20 space-y-4">
                  {(() => {
                    const gross = contractorValuationLines.reduce((s, l) => {
                      const prevQty = Number(l.prevQty || 0);
                      const currQty = Number(l.quantity || 0);
                      const cumQty = prevQty + currQty;
                      const pct = Number(l.percentage !== undefined ? l.percentage : 100);
                      return s + (cumQty * Number(l.unitPrice || 0) * (pct / 100));
                    }, 0);
                    const discountAmt = contractorValuationDiscount ? Number(contractorValuationDiscount) : 0;
                    const afterDiscount = gross - discountAmt;

                    const uniqueContractorName = contractorValuationContractorName || '';
                    const calculatedPrevPaid = uniqueContractorName 
                      ? getContractorFinancialPosition(uniqueContractorName, contractorValuationDate, null, contractorValuationLines).previousSpent 
                      : 0;
                    const prevPaidVal = contractorValuationPrevPaid !== '' ? Number(contractorValuationPrevPaid) : calculatedPrevPaid;
                    const netDue = afterDiscount - prevPaidVal;

                    const taxRatePercent = contractorValuationTax ? Number(contractorValuationTax) : 0;
                    let taxAmt = 0;
                    if (contractorValuationTaxMethod === 'period') {
                      taxAmt = netDue * (taxRatePercent / 100);
                    } else if (contractorValuationTaxMethod === 'cumulative') {
                      const prevTaxPaid = valuations
                        .filter(v => v.isContractor && String(v.projectId) === String(activeProjectId))
                        .reduce((sum, v) => sum + Number(v.taxAmount || 0), 0);
                      const cumulativeTax = gross * (taxRatePercent / 100);
                      taxAmt = Math.max(0, cumulativeTax - prevTaxPaid);
                    } else {
                      taxAmt = 0;
                    }
                    const totalFinal = netDue + taxAmt;

                    const clientGross = currentValuations.filter(v => !v.isContractor).reduce((s, v) => s + (v.totalCurrent || 0), 0);
                    const allContractorCost = currentValuations.filter(v => v.isContractor).reduce((s, v) => s + (v.totalCurrent || 0), 0);
                    const totalContractorWithNew = allContractorCost + netDue;
                    const profitEstimate = clientGross - totalContractorWithNew;

                    return (
                      <>
                        {/* Profit comparison banner */}
                        {clientGross > 0 && (
                          <div className="grid grid-cols-3 gap-3 p-4 bg-slate-900/50 rounded-2xl border border-slate-700">
                            <div className="text-center">
                              <div className="text-[10px] text-cyan-400 font-bold mb-1">💰 إجمالي فواتير العميل</div>
                              <div className="font-mono font-black text-cyan-300 text-sm">{clientGross.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م</div>
                            </div>
                            <div className="text-center border-x border-slate-700">
                              <div className="text-[10px] text-orange-400 font-bold mb-1">🏗️ إجمالي تكلفة مقاولين</div>
                              <div className="font-mono font-black text-orange-300 text-sm">{totalContractorWithNew.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م</div>
                              <div className="text-[9px] text-slate-500 mt-0.5">({allContractorCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} سابق + {netDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} حالي للفترة)</div>
                            </div>
                            <div className="text-center">
                              <div className="text-[10px] font-bold mb-1" style={{ color: profitEstimate >= 0 ? '#4ade80' : '#f87171' }}>
                                {profitEstimate >= 0 ? '📈 صافي الربح المتوقع' : '📉 خسارة متوقعة'}
                              </div>
                              <div className="font-mono font-black text-sm" style={{ color: profitEstimate >= 0 ? '#4ade80' : '#f87171' }}>
                                {profitEstimate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between flex-wrap gap-3">
                          <span className="text-xs font-bold text-slate-400">إجمالي قيمة المستخلص التراكمي:</span>
                          <span className="font-mono text-lg font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-xl">{gross.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م</span>
                        </div>

                        {/* Discount — fixed amount */}
                        <div className="flex items-center gap-3 flex-wrap">
                          <label className="text-xs text-slate-400 font-bold whitespace-nowrap">خصم مبلغ (ج.م) — اختياري:</label>
                          <input
                            type="number" min="0" step="0.01"
                            value={contractorValuationDiscount}
                            onChange={e => {
                              const v = e.target.value;
                              setContractorValuationDiscount(v);
                              if (Number(v) <= 0) setContractorValuationDiscountReason('');
                            }}
                            placeholder="0.00"
                            className="bg-[#111827] border border-slate-700 focus:border-amber-500 rounded-xl px-4 py-2 text-xs text-white font-mono focus:outline-none w-36"
                          />
                          {discountAmt > 0 && (
                            <span className="text-xs font-mono font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-xl">
                              - {discountAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م
                            </span>
                          )}
                        </div>

                        {discountAmt > 0 && (
                          <div className="flex items-center gap-3 flex-wrap animate-in fade-in duration-200">
                            <label className="text-xs text-slate-400 font-bold whitespace-nowrap">سبب الخصم:</label>
                            <input
                              type="text"
                              value={contractorValuationDiscountReason}
                              onChange={e => setContractorValuationDiscountReason(e.target.value)}
                              placeholder="مثال: خصم لعدم الالتزام بالجودة المطلوبة..."
                              className="bg-[#111827] border border-slate-700 focus:border-amber-500 rounded-xl px-4 py-2 text-xs text-white focus:outline-none w-80"
                              required
                            />
                          </div>
                        )}

                        {discountAmt > 0 && (
                          <div className="flex items-center justify-between flex-wrap gap-3">
                            <span className="text-xs font-bold text-slate-400">الإجمالي بعد الخصم:</span>
                            <span className="font-mono text-base font-black text-orange-400 bg-orange-500/10 border border-orange-500/20 px-3 py-1 rounded-xl">
                              {afterDiscount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م
                            </span>
                          </div>
                        )}

                        {/* Previously Paid override input */}
                        <div className="flex items-center gap-3 flex-wrap">
                          <label className="text-xs text-slate-400 font-bold whitespace-nowrap">ما سبق صرفه (ج.م) — تعديل أو ترك تلقائي:</label>
                          <input
                            type="number" min="0" step="0.01"
                            value={contractorValuationPrevPaid !== '' ? contractorValuationPrevPaid : (calculatedPrevPaid > 0 ? String(calculatedPrevPaid) : '0')}
                            onChange={e => setContractorValuationPrevPaid(e.target.value)}
                            placeholder={calculatedPrevPaid.toFixed(2)}
                            className="bg-[#111827] border border-slate-700 focus:border-cyan-500 rounded-xl px-4 py-2 text-xs text-white font-mono focus:outline-none w-44"
                          />
                          {prevPaidVal > 0 && (
                            <span className="text-xs font-mono font-black text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-3 py-1 rounded-xl">
                              سابق: {prevPaidVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م
                            </span>
                          )}
                        </div>

                        {/* Tax % */}
                        <div className="flex items-center gap-3 flex-wrap">
                          <label className="text-xs text-slate-400 font-bold whitespace-nowrap">ضريبة % (اختيارية):</label>
                          <input
                            type="number" min="0" max="100" step="0.5"
                            value={contractorValuationTax}
                            onChange={e => setContractorValuationTax(e.target.value)}
                            placeholder="مثال: 14"
                            className="bg-[#111827] border border-slate-700 focus:border-purple-500 rounded-xl px-4 py-2 text-xs text-white font-mono focus:outline-none w-40"
                          />
                          <select
                            value={contractorValuationTaxMethod}
                            onChange={e => setContractorValuationTaxMethod(e.target.value)}
                            className="bg-[#111827] border border-slate-700 focus:border-purple-500 rounded-xl px-4 py-2 text-xs text-white focus:outline-none w-48"
                          >
                            <option value="period">ضريبة على الفترة الحالية فقط</option>
                            <option value="cumulative">ضريبة تراكمية</option>
                            <option value="waived">إعفاء ضريبي</option>
                          </select>
                          {taxAmt > 0 && (
                            <span className="text-xs font-mono font-black text-purple-400 bg-purple-500/10 border border-purple-500/20 px-3 py-1 rounded-xl">
                              + {taxAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م ضريبة
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between flex-wrap gap-3 pt-3 border-t border-orange-500/20">
                          <span className="text-xs font-black text-white">🏆 الأجمالى المتبقى المستحق للفترة (شامل الضريبة):</span>
                          <span className="font-mono text-xl font-black text-orange-300 bg-orange-500/15 border border-orange-400/30 px-4 py-1.5 rounded-xl">
                            {totalFinal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م
                          </span>
                        </div>
                      </>
                    );
                  })()}

                  <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={() => { setShowAddContractorValuation(false); setEditingValuationId(null); }} className="px-5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-400 hover:text-white transition-all">إلغاء</button>
                    <button type="submit" className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 rounded-xl text-xs font-black text-white transition-all">{editingValuationId ? 'حفظ تعديل مستخلص المقاول 💾' : 'اعتماد مستخلص المقاول 🏗️'}</button>
                  </div>
                </div>
                <datalist id="subcontractors-datalist">
                  {subcontractorsList.map((sub, sIdx) => (
                    <option key={sIdx} value={sub.name || sub.contractor_name || ''} />
                  ))}
                </datalist>
              </form>
            )}



            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left 2 Cols: Valuations Claims and Invoices */}
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-[#131b2e] border border-slate-800 p-8 rounded-[2rem] shadow-2xl space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-black text-white flex items-center gap-3">
                        <span className="p-2 bg-cyan-500/10 rounded-xl border border-cyan-500/25 text-cyan-400">📑</span> مستخلصات وفواتير إنجاز الأعمال المعتمدة
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">المستخلصات الدورية الصادرة للعميل بناءً على نسب إنجاز البنود على أرض الواقع</p>
                    </div>
                    <div className="flex gap-2 flex-wrap justify-end">
                      <button
                        onClick={handleStartNewValuation}
                        className="px-5 py-2.5 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 rounded-xl text-xs font-black transition-all active:scale-95 no-print"
                      >
                        + مستخلص للعميل 🏗️
                      </button>
                      <button
                        onClick={handleStartContractorValuation}
                        className="px-5 py-2.5 bg-orange-500/10 border border-orange-500/30 text-orange-400 hover:bg-orange-500/20 rounded-xl text-xs font-black transition-all active:scale-95 no-print"
                      >
                        + مستخلص للمقاول 🏗️
                      </button>
                    </div>
                  </div>

                  {/* ════════════════════════════════════════
                      مقارنة المقايسة بالمستخلصات لكل بند
                  ════════════════════════════════════════ */}
                  {currentBoqItems.length > 0 && (() => {
                    // Per-item aggregation
                    const itemStats = currentBoqItems.map(item => {
                      const boqValue = item.quantity * item.price;

                      // Total % billed to client for this item
                      const clientBilledAmt = currentValuations
                        .filter(v => !v.isContractor)
                        .reduce((s, v) => {
                          const it = v.items?.find(i => String(i.boqItemId) === String(item.id));
                          return s + (it ? it.currentAmount : 0);
                        }, 0);
                      const clientBilledPct = boqValue > 0 ? Math.min(100, (clientBilledAmt / boqValue) * 100) : 0;

                      // Total contractor cost for this item (from contractor lines linked to this boqItemId)
                      const contractorCost = currentValuations
                        .filter(v => v.isContractor && v.lines)
                        .reduce((s, v) => {
                          return s + v.lines.filter(l => String(l.boqItemId) === String(item.id)).reduce((a, l) => a + (l.total || 0), 0);
                        }, 0);

                      const profit = clientBilledAmt - contractorCost;
                      const margin = clientBilledAmt > 0 ? (profit / clientBilledAmt) * 100 : null;
                      return { item, boqValue, clientBilledAmt, clientBilledPct, contractorCost, profit, margin };
                    });

                    const totalBoq = itemStats.reduce((s, r) => s + r.boqValue, 0);
                    const totalBilled = itemStats.reduce((s, r) => s + r.clientBilledAmt, 0);
                    const totalContractor = itemStats.reduce((s, r) => s + r.contractorCost, 0);
                    const totalProfit = totalBilled - totalContractor;

                    return (
                      <div className="mb-4 bg-[#070a13] border border-slate-800 rounded-2xl p-4 space-y-3">
                        <h5 className="text-xs font-black text-white flex items-center gap-2">
                          <span className="p-1.5 bg-purple-500/10 rounded-lg text-purple-400">📊</span>
                          مقارنة المقايسة بالمستخلصات — لكل بند
                        </h5>
                        {/* Summary row */}
                        <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-black">
                          <div className="bg-slate-900/60 rounded-xl p-2.5">
                            <div className="text-slate-400 mb-1">إجمالي المقايسة</div>
                            <div className="font-mono text-white">{totalBoq.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م</div>
                          </div>
                          <div className="bg-cyan-500/10 rounded-xl p-2.5 border border-cyan-500/20">
                            <div className="text-cyan-400 mb-1">مُستخلص للعميل</div>
                            <div className="font-mono text-cyan-300">{totalBilled.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م</div>
                            <div className="text-[9px] text-slate-400">{totalBoq > 0 ? ((totalBilled/totalBoq)*100).toFixed(1) : 0}%</div>
                          </div>
                          <div className="bg-orange-500/10 rounded-xl p-2.5 border border-orange-500/20">
                            <div className="text-orange-400 mb-1">تكلفة مقاولين</div>
                            <div className="font-mono text-orange-300">{totalContractor.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م</div>
                          </div>
                          <div className={`rounded-xl p-2.5 border ${totalProfit >= 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20'}`}>
                            <div className={`mb-1 ${totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{totalProfit >= 0 ? '📈 ربح' : '📉 خسارة'}</div>
                            <div className={`font-mono font-black ${totalProfit >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م</div>
                          </div>
                        </div>

                        {/* Per-item table */}
                        <div className="overflow-x-auto rounded-xl border border-slate-800">
                          <table className="w-full text-right text-[10px]">
                            <thead className="bg-slate-900/80 text-slate-400 font-bold">
                              <tr>
                                <th className="p-2.5">البند</th>
                                <th className="p-2.5 text-center">قيمة المقايسة</th>
                                <th className="p-2.5 text-center">مستخلص عميل</th>
                                <th className="p-2.5 text-center">نسبة الإنجاز %</th>
                                <th className="p-2.5 text-center">تكلفة مقاولين</th>
                                <th className="p-2.5 text-center">الربح / الخسارة</th>
                                <th className="p-2.5 text-center">هامش %</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                              {itemStats.map(({ item, boqValue, clientBilledAmt, clientBilledPct, contractorCost, profit, margin }) => (
                                <tr key={item.id} className="hover:bg-white/[0.02]">
                                  <td className="p-2.5">
                                    <div className="font-bold text-slate-200">{item.item_name}</div>
                                    <div className="text-[9px] text-slate-500">{item.category}</div>
                                  </td>
                                  <td className="p-2.5 text-center font-mono text-slate-300">{boqValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                  <td className="p-2.5 text-center font-mono text-cyan-400 font-bold">{clientBilledAmt.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                  <td className="p-2.5 text-center">
                                    <div className="flex items-center gap-1.5 justify-center">
                                      <div className="flex-1 bg-slate-800 rounded-full h-1.5 max-w-[50px]">
                                        <div className="h-1.5 rounded-full bg-cyan-500" style={{ width: `${clientBilledPct}%` }} />
                                      </div>
                                      <span className="font-mono font-black text-cyan-400">{clientBilledPct.toFixed(1)}%</span>
                                    </div>
                                  </td>
                                  <td className="p-2.5 text-center font-mono text-orange-400">{contractorCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                  <td className="p-2.5 text-center font-mono font-black" style={{ color: profit >= 0 ? '#4ade80' : '#f87171' }}>
                                    {profit >= 0 ? '+' : ''}{profit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </td>
                                  <td className="p-2.5 text-center font-mono font-black" style={{ color: margin === null ? '#64748b' : margin >= 0 ? '#4ade80' : '#f87171' }}>
                                    {margin === null ? '—' : `${margin.toFixed(1)}%`}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })()}

                  <div className="space-y-4">
                    {currentValuations.map(val => (
                      <div key={val.id} className="p-5 bg-[#070a13] border border-slate-800 rounded-2xl flex flex-col gap-4 hover:border-cyan-600/30 transition-colors">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                          <div className="space-y-1.5 flex-1">
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className="text-xs font-black text-cyan-400">{val.claimNo}</span>
                              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-black border border-emerald-500/20">فاتورة رقم: {val.invoiceNo || `INV-TEMP-${val.id}`}</span>
                              {/* ✨ Badge: client or contractor */}
                              {val.isContractor
                                ? <span className="px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400 text-[10px] font-black border border-orange-500/30">🏗️ مستخلص مقاول</span>
                                : <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 text-[10px] font-black border border-cyan-500/30">💰 مستخلص عميل</span>
                              }
                              {/* 🔗 Cross-referencing badges */}
                              {val.isContractor && val.linkedClientValuationId && (() => {
                                const linkedClientVal = valuations.find(v => v.id === val.linkedClientValuationId);
                                return linkedClientVal ? (
                                  <span className="px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 text-[10px] font-black border border-indigo-500/30">
                                    🔗 مرتبط بمستخلص عميل: {linkedClientVal.claimNo}
                                  </span>
                                ) : null;
                              })()}
                              {!val.isContractor && (() => {
                                const linkedContractorVals = valuations.filter(v => v.isContractor && v.linkedClientValuationId === val.id);
                                return linkedContractorVals.map(cv => (
                                  <span key={cv.id} className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-[10px] font-black border border-amber-500/30">
                                    🔗 مستخلص مقاول مرتبط: {cv.claimNo}
                                  </span>
                                ));
                              })()}
                            </div>
                            <h4 className="text-sm font-black text-white">
                              {val.isContractor ? 'مستخلص إنجاز أعمال مقاولين' : 'مستخلص إنجاز بنود المقايسة'} - {activeProject?.name}
                            </h4>
                            <div className="flex items-center gap-4 text-[10px] text-slate-500 font-bold">
                              <span>📅 تاريخ الإصدار: {val.date}</span>
                              <span>📊 عدد البنود المشمولة: {val.isContractor ? (val.lines?.length || 0) : (val.items?.filter(it => it.netPercent > 0).length || 0)} بنود</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-6 self-end md:self-auto">
                            <div className="text-left">
                              <div className="text-[9px] text-slate-500 font-bold">قيمة المستخلص (بدون ضريبة)</div>
                              <div className="font-mono font-black text-slate-200 text-sm">{val.totalCurrent.toLocaleString()} ج.م</div>
                              {/* VAT line: only if taxRate > 0 */}
                              {val.taxRate > 0 && (
                                <div className="text-[9px] text-cyan-400 font-bold mt-0.5">شامل القيمة المضافة ({val.taxRate}%): {val.totalFinal?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || (val.totalCurrent * (1 + val.taxRate / 100)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م</div>
                              )}
                            </div>

                            <div className="flex gap-2 no-print">
                              <button
                                onClick={() => setExpandedValuationId(expandedValuationId === val.id ? null : val.id)}
                                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-colors ${expandedValuationId === val.id
                                  ? 'bg-cyan-500/10 text-cyan-400 border-cyan-600/30'
                                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'
                                  }`}
                              >
                                {expandedValuationId === val.id ? 'إغلاق التفاصيل 📂' : 'عرض التفاصيل 📋'}
                              </button>
                              <button
                                onClick={() => val.isContractor ? handleStartEditContractorValuation(val) : handleStartEditValuation(val)}
                                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg text-[10px] font-bold flex items-center gap-1"
                                title="تعديل المستخلص"
                              >
                                ✏️ تعديل
                              </button>
                              <button
                                onClick={() => setSelectedPrintValuation(val)}
                                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg text-[10px] font-bold flex items-center gap-1"
                              >
                                🖨️ الفاتورة
                              </button>
                              <button
                                onClick={() => handleDeleteValuation(val.id)}
                                className="px-2 py-1.5 bg-rose-950/20 hover:bg-rose-600 hover:text-white border border-rose-500/20 text-rose-400 rounded-lg text-[10px] font-bold"
                              >
                                🗑️
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Dropdown details showing history breakdown */}
                        {expandedValuationId === val.id && (
                          <div className="pt-4 border-t border-slate-800 space-y-3 animate-in slide-in-from-top duration-300">
                            <h5 className="text-[10px] font-black text-cyan-400 flex items-center gap-1.5">
                              <span>📂</span> تفصيل بنود وكميات المستخلص {val.claimNo}:
                            </h5>

                            {val.isContractor && val.lines ? (
                              /* Contractor valuation lines */
                              <div className="space-y-4">
                                <div className="overflow-x-auto rounded-xl border border-orange-500/20 bg-slate-950/20">
                                  <table className="w-full text-right text-[10px]">
                                    <thead className="bg-[#070a13] text-slate-400 font-bold border-b border-slate-800">
                                      <tr>
                                        <th className="p-2.5 text-center">م</th>
                                        <th className="p-2.5 text-right">البند المرتبط</th>
                                        <th className="p-2.5 text-right">اسم المقاول</th>
                                        <th className="p-2.5 text-center w-24">الوحدة</th>
                                        <th className="p-2.5 text-center">الكمية السابقة</th>
                                        <th className="p-2.5 text-center">الكمية الحالية</th>
                                        <th className="p-2.5 text-center">سعر الفئة</th>
                                        <th className="p-2.5 text-center">النسبة %</th>
                                        <th className="p-2.5 text-center">الإجمالي جنيه</th>
                                        <th className="p-2.5 text-right">ملاحظات</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                      {val.lines.map((ln, li) => {
                                        const linkedBoq = boqItems.find(b => String(b.id) === String(ln.boqItemId) && String(b.projectId) === String(val.projectId || activeProjectId));
                                        const prevQty = Number(ln.prevQty || 0);
                                        const currQty = Number(ln.quantity || 0);
                                        const pct = Number(ln.percentage !== undefined ? ln.percentage : 100);
                                        const lineTotal = (prevQty + currQty) * Number(ln.unitPrice || 0) * (pct / 100);
                                        const noteText = ln.notes || ln.description || ln.note || '';

                                        return (
                                          <tr key={li} className="hover:bg-white/5 text-slate-300">
                                            <td className="p-2.5 text-center font-mono">{li + 1}</td>
                                            <td className="p-2.5 text-slate-400 text-[9px]">{linkedBoq ? `[${linkedBoq.category}] ${linkedBoq.item_name}` : 'غير مرتبط'}</td>
                                            <td className="p-2.5 font-bold text-orange-400">{ln.contractorName || '—'}</td>
                                            <td className="p-2.5 text-center font-mono w-24">{ln.unit}</td>
                                            <td className="p-2.5 text-center font-mono text-slate-500">{prevQty.toLocaleString()}</td>
                                            <td className="p-2.5 text-center font-mono text-cyan-400 font-bold">+{currQty.toLocaleString()}</td>
                                            <td className="p-2.5 text-center font-mono">{(ln.unitPrice || 0).toLocaleString()}</td>
                                            <td className="p-2.5 text-center font-mono">{pct}%</td>
                                            <td className="p-2.5 text-center font-mono text-emerald-400 font-bold">{lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م</td>
                                            <td 
                                              className="p-2.5 text-right font-bold transition-all border border-slate-800/30"
                                              style={{
                                                ...getNoteStyle(noteText),
                                                ...(noteText ? { borderStyle: 'solid', borderWidth: '1px' } : {})
                                              }}
                                            >
                                              {noteText || '—'}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                                
                                {/* Subcontractor Financial Position summary cards */}
                                {(() => {
                                  const uniqueSubs = Array.from(new Set(val.lines?.map(ln => ln.contractorName?.trim()).filter(Boolean)));
                                  if (uniqueSubs.length === 0) return null;
                                  return (
                                    <div className="space-y-3 p-4 bg-slate-950/40 rounded-2xl border border-slate-800">
                                      <h6 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                        <span>🏛️</span> الخلاصة المالية للمقاولين من الباطن في هذا المستخلص:
                                      </h6>
                                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {uniqueSubs.map(subName => {
                                          const pos = getContractorFinancialPosition(subName, val.date, val.id);
                                          return (
                                            <div key={subName} className="bg-[#070a13] border border-slate-800 rounded-xl p-3.5 space-y-2">
                                              <div className="flex justify-between items-center border-b border-white/5 pb-1.5">
                                                <span className="text-xs font-black text-orange-400">{subName}</span>
                                                <span className="text-[8px] px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/20">موقف مالي</span>
                                              </div>
                                              <div className="grid grid-cols-3 gap-1 text-center">
                                                <div>
                                                  <div className="text-[7.5px] text-slate-500 font-bold mb-0.5">إجمالي الأعمال</div>
                                                  <div className="font-mono text-[9px] font-black text-white">{pos.cumulativeWorks.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                                </div>
                                                <div className="border-r border-white/5">
                                                  <div className="text-[7.5px] text-slate-500 font-bold mb-0.5">المصروف/المدفوع</div>
                                                  <div className="font-mono text-[9px] font-black text-rose-400">{pos.previousSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                                </div>
                                                <div className="border-r border-white/5">
                                                  <div className="text-[7.5px] text-slate-500 font-bold mb-0.5">صافي المستحق</div>
                                                  <div className={`font-mono text-[9px] font-black ${pos.currentNetDue >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{pos.currentNetDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                            ) : (
                              /* Client valuation items */
                              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/20">
                                <table className="w-full text-right text-[10px]">
                                  <thead className="bg-[#070a13] text-slate-400 font-bold">
                                    <tr>
                                      <th className="p-2.5">بيان البند والتوصيف</th>
                                      <th className="p-2.5 text-center">الوحدة</th>
                                      <th className="p-2.5 text-center">الفئة</th>
                                      <th className="p-2.5 text-center">النسبة السابقة %</th>
                                      <th className="p-2.5 text-center">النسبة التراكمية %</th>
                                      <th className="p-2.5 text-center">إنجاز الفترة %</th>
                                      <th className="p-2.5 text-center">قيمة الفترة</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-white/5">
                                    {val.items?.map(it => {
                                      const boqItem = boqItems.find(b => String(b.id) === String(it.boqItemId) && String(b.projectId) === String(val.projectId || activeProjectId));
                                      if (!boqItem) return null;
                                      const prevPercent = it.completionPercent - it.netPercent;
                                      if (it.netPercent <= 0) return null;
                                      return (
                                        <tr key={it.boqItemId} className="hover:bg-white/5 text-slate-300">
                                          <td className="p-2.5 font-bold">{boqItem.item_name}<div className="text-[8px] text-slate-500">{boqItem.category}</div></td>
                                          <td className="p-2.5 text-center font-mono text-slate-400">{boqItem.unit}</td>
                                          <td className="p-2.5 text-center font-mono">{boqItem.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                          <td className="p-2.5 text-center font-mono text-amber-500/80">{prevPercent.toFixed(1)}%</td>
                                          <td className="p-2.5 text-center font-mono text-cyan-400 font-bold">{it.completionPercent.toFixed(1)}%</td>
                                          <td className="p-2.5 text-center font-mono text-emerald-400 font-bold">+{it.netPercent.toFixed(1)}%</td>
                                          <td className="p-2.5 text-center font-mono text-emerald-400 font-black">{it.currentAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م</td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}

                    {currentValuations.length === 0 && (
                      <div className="p-8 text-center text-xs text-slate-500 font-bold">لم يتم إصدار أي مستخلصات إنجاز مالي للعميل بعد لهذا المشروع.</div>
                    )}
                  </div>
                </div>

                {/* ════════════════════════════════════════
                    📊 الخلاصة المالية للمقاولين من الباطن
                ════════════════════════════════════════ */}
                <div className="bg-[#131b2e] border border-slate-800 p-8 rounded-[2rem] shadow-2xl space-y-6">
                  <div>
                    <h3 className="text-lg font-black text-white flex items-center gap-3">
                      <span className="p-2 bg-orange-500/10 rounded-xl border border-orange-500/25 text-orange-400">📊</span> الخلاصة المالية للمقاولين (موقف المقاولين)
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">ملخص القيمة التراكمية لمستخلصات المقاولين والمبالغ المنصرفة والمتبقية لهم على مستوى المشروع</p>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-800 bg-[#070a13]">
                    <table className="w-full text-right text-[11px]">
                      <thead className="bg-[#0b0f19] text-slate-400 font-bold border-b border-slate-800">
                        <tr>
                          <th className="p-3 text-right">اسم المقاول</th>
                          <th className="p-3 text-center">عدد المستخلصات</th>
                          <th className="p-3 text-center">إجمالي المستخلصات</th>
                          <th className="p-3 text-center">إجمالي المنصرف (المدفوع)</th>
                          <th className="p-3 text-center">إجمالي المتبقي</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {(() => {
                          const projectContractorVals = valuations.filter(v => v.isContractor && String(v.projectId) === String(activeProjectId));
                          const contractorNames = Array.from(new Set(
                            projectContractorVals.flatMap(v => v.lines?.map(ln => (ln.contractorName || contractorValuationContractorName)?.trim()).filter(Boolean) || [])
                          ));

                          if (contractorNames.length === 0) {
                            return (
                              <tr>
                                <td colSpan="5" className="p-8 text-center text-xs text-slate-500 font-bold">لم يتم تسجيل أي مستخلصات للمقاولين بعد لهذا المشروع.</td>
                              </tr>
                            );
                          }

                          return contractorNames.map(cName => {
                            const cVals = projectContractorVals.filter(v => 
                              v.lines?.some(ln => (ln.contractorName || contractorValuationContractorName)?.trim().toLowerCase() === cName.toLowerCase())
                            );
                            const countValuations = cVals.length;
                            const pos = getContractorFinancialPosition(cName, null, null, []);

                            return (
                              <tr key={cName} className="hover:bg-white/[0.02] text-slate-350 font-bold">
                                <td className="p-3 text-right text-orange-400 font-black">{cName}</td>
                                <td className="p-3 text-center font-mono text-slate-400">{countValuations}</td>
                                <td className="p-3 text-center font-mono text-white">{pos.cumulativeWorks.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م</td>
                                <td className="p-3 text-center font-mono text-rose-400">{pos.previousSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م</td>
                                <td className={`p-3 text-center font-mono font-black ${pos.currentNetDue >= 0 ? 'text-emerald-400' : 'text-rose-450'}`}>
                                  {pos.currentNetDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م
                                </td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Received Payments History with linked claims */}
                <div className="bg-[#131b2e] border border-slate-800 p-8 rounded-[2rem] shadow-2xl space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-lg font-black text-white flex items-center gap-3">
                        <span className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/25 text-emerald-400">💳</span> سجل دفعات وأقساط العميل المقبوضة
                      </h3>
                      <p className="text-xs text-slate-400 mt-1">تتبع التدفق النقدي الوارد من سداد الدفعات وربطها بالمستخلصات المعتمدة لبيان التسوية</p>
                    </div>
                  </div>

                  <div className="relative border-r border-slate-800 pr-6 space-y-6 py-4">
                    {currentInstallments.map((inst, index) => {
                      const linkedVal = valuations.find(v => v.id === inst.valuationId);
                      return (
                        <div key={inst.id} className="relative group">
                          <div className="absolute right-0 top-1 w-3 h-3 rounded-full bg-cyan-500 border-2 border-slate-900 translate-x-[24px] group-hover:scale-125 transition-transform z-10"></div>

                          <div className="p-5 bg-[#070a13] border border-slate-800 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-cyan-600/30 transition-colors">
                            <div className="space-y-1">
                              <div className="flex items-center gap-3">
                                <span className="text-xs text-cyan-400 font-black">الدفعة رقم #{index + 1}</span>
                                {linkedVal && (
                                  <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 text-[9px] font-black border border-slate-850">
                                    تسوية مستخلص: {linkedVal.claimNo}
                                  </span>
                                )}
                              </div>
                              <h4 className="text-sm font-black text-white">{inst.notes || 'تحصيل بدون ملاحظات'}</h4>
                              <span className="text-[10px] text-slate-500 font-mono block">
                                {inst.date} | طريقة الدفع: {inst.paymentMethod || 'نقدًا'}
                                {inst.referenceNo ? ` (الرقم المرجعي: ${inst.referenceNo})` : ''}
                              </span>
                            </div>

                            <div className="flex items-center gap-4">
                              <div className="flex items-baseline gap-1 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-xl text-emerald-400 font-black">
                                <span className="text-lg font-black font-mono tracking-tighter">+{inst.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                <span className="text-[10px] font-bold">جنيه</span>
                              </div>
                              <div className="flex flex-col gap-1.5 no-print text-left">
                                <button
                                  onClick={() => setSelectedPrintInstallment(inst)}
                                  className="text-[10px] font-black text-cyan-400 hover:text-cyan-300 transition-colors"
                                >
                                  طباعة الإيصال 🖨️
                                </button>
                                <button
                                  onClick={() => handleDeleteInstallment(inst.id)}
                                  className="text-[10px] font-bold text-rose-400 hover:text-rose-300 transition-colors"
                                >
                                  حذف 🗑️
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {currentInstallments.length === 0 && (
                      <p className="text-xs text-slate-500 py-8 text-center">لم يتم قيد أي دفعات نقدية مستلمة بعد.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Col: Collection wizard and payment linkage Form */}
              <div className="space-y-6 no-print">


                {/* Progress Summary Gauge */}
                <div className="bg-[#131b2e] border border-slate-800 p-6 rounded-[2rem] shadow-2xl relative overflow-hidden flex flex-col items-center text-center space-y-4 hover:scale-[1.02] transition-all duration-300">
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
                    محصل <span className="font-mono text-cyan-400 font-black">{totals.totalCollected.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> ج.م من عقد بقيمة <span className="font-mono text-white font-black">{totals.totalBOQ.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span> ج.م.
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* 5. FILES MANAGER VIEW (WITH LIVE INLINE EDITING & AUTO-SAVE INDICATORS) */}
        {activeTab === 'files' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-bottom duration-500 no-print">

            {/* Files List Directory */}
            <div className="bg-[#131b2e] border border-slate-800 p-6 rounded-[2rem] shadow-2xl space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-black text-white flex items-center gap-2">
                  <span>📁</span> مستندات وملفات المشروع المتعلقة
                </h3>

                <button
                  onClick={() => fileInputRef.current.click()}
                  className="bg-cyan-500/10 hover:bg-cyan-500/20 border border-slate-850 text-cyan-400 px-3.5 py-1.5 rounded-xl text-xs font-black transition-all"
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
                    className={`p-4 rounded-2xl border transition-all cursor-pointer flex justify-between items-center ${openedFile && openedFile.id === file.id
                      ? 'bg-cyan-500/10 border-cyan-500/35 text-cyan-400 font-bold'
                      : 'bg-[#0f172a] border-slate-800 hover:bg-[#111827] text-slate-350'
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{getFileIcon(file.name, file.type)}</span>
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
            <div className="lg:col-span-2 bg-[#131b2e] border border-slate-800 p-8 rounded-[2rem] shadow-2xl flex flex-col min-h-[450px]">
              {openedFile ? (
                <div className="flex-1 flex flex-col space-y-4">
                  <div className="flex justify-between items-center pb-3 border-b border-slate-800">
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

                  {(() => {
                    const fileExt = openedFile.name.split('.').pop().toLowerCase();
                    const isText = ((openedFile.type || '').startsWith('text') ||
                      openedFile.name.endsWith('.txt') ||
                      openedFile.name.endsWith('.json') ||
                      openedFile.name.endsWith('.html') ||
                      !openedFile.content.startsWith('data:')) &&
                      !['pdf', 'xls', 'xlsx', 'csv', 'doc', 'docx', 'zip', 'rar', '7z', 'tar', 'gz', 'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(fileExt);

                    if (isText) {
                      return (
                        <textarea
                          value={fileEditorContent}
                          onChange={handleEditorChange}
                          placeholder="اكتب ملاحظاتك هنا..."
                          className="flex-1 w-full bg-[#111827] border border-slate-800 focus:border-cyan-600 rounded-2xl p-5 text-sm font-mono text-slate-200 leading-relaxed focus:outline-none focus:ring-1 focus:ring-cyan-500/30 resize-none min-h-[300px]"
                        />
                      );
                    }

                    const isImage = (openedFile.type || '').startsWith('image/') ||
                      openedFile.content.startsWith('data:image/');

                    if (isImage) {
                      return (
                        <div className="flex-grow flex flex-col items-center justify-center bg-[#111827] border border-slate-800 rounded-2xl p-5 overflow-auto max-h-[500px]">
                          <img src={openedFile.content} className="max-w-full max-h-[400px] object-contain rounded-lg shadow-lg border border-slate-800" alt={openedFile.name} />
                          <div className="mt-4 flex gap-3">
                            <a href={openedFile.content} download={openedFile.name} className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-black text-xs px-4 py-2 rounded-xl transition-all flex items-center gap-2">
                              <span>⬇️</span> تحميل الصورة
                            </a>
                          </div>
                        </div>
                      );
                    }

                    const isPdf = (openedFile.type || '').includes('pdf') ||
                      openedFile.name.endsWith('.pdf') ||
                      openedFile.content.startsWith('data:application/pdf');

                    if (isPdf) {
                      return (
                        <div className="flex-grow flex flex-col space-y-4">
                          <iframe src={openedFile.content} className="flex-grow w-full bg-white rounded-2xl min-h-[400px] border-none" title={openedFile.name} />
                          <div className="flex justify-center pb-2">
                            <a href={openedFile.content} download={openedFile.name} className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-black text-xs px-5 py-2.5 rounded-xl transition-all flex items-center gap-2 shadow-lg">
                              <span>⬇️</span> تحميل ملف PDF
                            </a>
                          </div>
                        </div>
                      );
                    }

                    // Other binary files (e.g. Word, Excel, ZIP)
                    return (
                      <div className="flex-grow flex flex-col items-center justify-center bg-[#111827] border border-slate-800 rounded-2xl p-8 text-center">
                        <span className="text-6xl mb-4">{getFileIcon(openedFile.name, openedFile.type)}</span>
                        <h4 className="text-sm font-black text-slate-300">{openedFile.name}</h4>
                        <p className="text-xs text-slate-500 mt-2 max-w-xs">هذا الملف ثنائي ولا يمكن تحريره مباشرة. يمكنك تحميله أو استعراضه.</p>
                        <a href={openedFile.content} download={openedFile.name} className="mt-5 bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-black text-xs px-5 py-2.5 rounded-xl transition-all flex items-center gap-2">
                          <span>⬇️</span> تحميل وحفظ الملف
                        </a>
                      </div>
                    );
                  })()}
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

        {/* 5.1 WAREHOUSES VIEW */}
        {activeTab === 'warehouses' && (
          <div className="animate-in slide-in-from-bottom duration-500">
            <DirectStockIssue defaultTab="issue" embedded={true} projectId={activeProjectId} />
          </div>
        )}

        {/* 5.2 FINANCIAL TRANSACTIONS VIEW */}
        {activeTab === 'transactions' && (
          <div className="animate-in slide-in-from-bottom duration-500">
            <FinancialTransactions embedded={true} projectId={activeProjectId} />
          </div>
        )}

      </div>

      {/* 5.3 QUICK ADD SUBCONTRACTOR MODAL */}
      {showQuickAddSub && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-6 text-white flex justify-between items-center shadow-md">
              <div className="flex items-center gap-3">
                <span className="p-2.5 bg-white/10 rounded-2xl text-2xl backdrop-blur-md border border-white/20 shadow-inner">🏗️</span>
                <div>
                  <h3 className="text-lg font-black tracking-tight">{language === 'ar' ? 'إضافة مقاول جديد سريعاً' : 'Quick Add New Subcontractor'}</h3>
                  <p className="text-xs text-emerald-100 font-bold">{language === 'ar' ? 'أدخل بيانات المقاول لإضافته واختياره فوراً' : 'Enter details to instantly add & select subcontractor'}</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setShowQuickAddSub(false)}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all active:scale-95 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleQuickAddSub} className="p-8 space-y-6" dir={language === 'ar' ? 'rtl' : 'ltr'}>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-black text-slate-700 block mb-1.5">{language === 'ar' ? 'اسم المقاول / الشركة بالكامل *' : 'Full Subcontractor / Company Name *'}</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      required 
                      placeholder={language === 'ar' ? 'مثال: شركة المقاولات الحديثة أو البشير' : 'e.g. Modern Contracting or Al-Basheer'}
                      value={quickAddSubName}
                      onChange={(e) => setQuickAddSubName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-800 outline-none focus:bg-white focus:border-emerald-500 transition-all shadow-inner" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-black text-slate-700 block mb-1.5">{language === 'ar' ? 'رقم الهاتف' : 'Phone Number'}</label>
                    <input 
                      type="tel" 
                      placeholder={language === 'ar' ? 'الهاتف' : 'Phone'}
                      value={quickAddSubPhone}
                      onChange={(e) => setQuickAddSubPhone(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-800 outline-none focus:bg-white focus:border-emerald-500 transition-all shadow-inner" 
                    />
                  </div>

                  <div>
                    <label className="text-xs font-black text-slate-700 block mb-1.5">{language === 'ar' ? 'اسم المنشأة / الشركة' : 'Operating Company Name'}</label>
                    <select 
                      value={quickAddSubCompanyId}
                      onChange={(e) => setQuickAddSubCompanyId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-800 outline-none focus:bg-white focus:border-emerald-500 transition-all shadow-inner" 
                    >
                      <option value="">{language === 'ar' ? '-- اختر الشركة --' : '-- Select Company --'}</option>
                      {companies.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-black text-slate-700 block mb-1.5">{language === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}</label>
                  <input 
                    type="email" 
                    placeholder={language === 'ar' ? 'البريد الإلكتروني' : 'Email'}
                    value={quickAddSubEmail}
                    onChange={(e) => setQuickAddSubEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-800 outline-none focus:bg-white focus:border-emerald-500 transition-all shadow-inner" 
                  />
                </div>
              </div>

              {/* Modal Footer Controls */}
              <div className="pt-4 border-t border-slate-100 flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => setShowQuickAddSub(false)}
                  className="px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-black text-xs transition-all active:scale-95 cursor-pointer"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isAddingSub}
                  className={`px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs shadow-lg shadow-emerald-600/30 transition-all active:scale-95 cursor-pointer flex items-center gap-2 ${isAddingSub ? 'opacity-50 cursor-wait' : ''}`}
                >
                  <span>{isAddingSub ? '⏳' : '💾'}</span> {isAddingSub ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (language === 'ar' ? 'حفظ واختيار' : 'Save & Select')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAddCustomerModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-6 text-white flex justify-between items-center shadow-md">
              <div className="flex items-center gap-3">
                <span className="p-2.5 bg-white/10 rounded-2xl text-2xl backdrop-blur-md border border-white/20 shadow-inner">👤</span>
                <div>
                  <h3 className="text-lg font-black tracking-tight">{language === 'ar' ? 'إضافة عميل جديد سريعاً' : 'Quick Add New Customer'}</h3>
                  <p className="text-xs text-emerald-100 font-bold">{language === 'ar' ? 'أدخل بيانات العميل لإضافته واختياره فوراً' : 'Enter details to instantly add & select customer'}</p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setShowAddCustomerModal(false)}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all active:scale-95 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleQuickAddCustomer} className="p-8 space-y-6" dir={language === 'ar' ? 'rtl' : 'ltr'}>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-black text-slate-700 block mb-1.5">{language === 'ar' ? 'اسم العميل / الشركة بالكامل *' : 'Full Customer / Company Name *'}</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      required 
                      placeholder={language === 'ar' ? 'مثال: شركة الأمل الطبية أو د. خالد' : 'e.g. Al-Amal Medical or Dr. Khaled'}
                      value={newCustomerName}
                      onChange={(e) => setNewCustomerName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-800 outline-none focus:bg-white focus:border-emerald-500 transition-all shadow-inner" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-black text-slate-700 block mb-1.5">{language === 'ar' ? 'رقم الهاتف' : 'Phone Number'}</label>
                    <input 
                      type="tel" 
                      placeholder={language === 'ar' ? 'الهاتف' : 'Phone'}
                      value={newCustomerPhone}
                      onChange={(e) => setNewCustomerPhone(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-800 outline-none focus:bg-white focus:border-emerald-500 transition-all shadow-inner" 
                    />
                  </div>

                  <div>
                    <label className="text-xs font-black text-slate-700 block mb-1.5">{language === 'ar' ? 'اسم المنشأة / الشركة' : 'Operating Company Name'}</label>
                    <select 
                      value={newCustomerCompanyId}
                      onChange={(e) => setNewCustomerCompanyId(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-800 outline-none focus:bg-white focus:border-emerald-500 transition-all shadow-inner" 
                    >
                      <option value="">{language === 'ar' ? '-- اختر الشركة --' : '-- Select Company --'}</option>
                      {companies.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-black text-slate-700 block mb-1.5">{language === 'ar' ? 'البريد الإلكتروني' : 'Email Address'}</label>
                  <input 
                    type="email" 
                    placeholder={language === 'ar' ? 'البريد الإلكتروني' : 'Email'}
                    value={newCustomerEmail}
                    onChange={(e) => setNewCustomerEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-sm font-bold text-slate-800 outline-none focus:bg-white focus:border-emerald-500 transition-all shadow-inner" 
                  />
                </div>
              </div>

              {/* Modal Footer Controls */}
              <div className="pt-4 border-t border-slate-100 flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className="px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-black text-xs transition-all active:scale-95 cursor-pointer"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={isAddingCustomer}
                  className={`px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs shadow-lg shadow-emerald-600/30 transition-all active:scale-95 cursor-pointer flex items-center gap-2 ${isAddingCustomer ? 'opacity-50 cursor-wait' : ''}`}
                >
                  <span>{isAddingCustomer ? '⏳' : '💾'}</span> {isAddingCustomer ? (language === 'ar' ? 'جاري الحفظ...' : 'Saving...') : (language === 'ar' ? 'حفظ واختيار' : 'Save & Select')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. PRINT PREVIEW MODAL */}
      {selectedPrintValuation && (
        <div className="fixed inset-0 bg-[#070a13] flex items-center justify-center p-4 z-50 no-print animate-in fade-in duration-300">
          <div className="bg-[#0b0f19] border border-slate-800 rounded-3xl w-full max-w-4xl p-8 space-y-6 overflow-y-auto max-h-[90vh] shadow-2xl flex flex-col">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800">
              <h3 className="text-sm font-black text-cyan-400 flex items-center gap-2">
                <span>🧾</span> معاينة وطباعة فاتورة المستخلص المالي
              </h3>
              <button
                onClick={() => setSelectedPrintValuation(null)}
                className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 rounded-xl text-xs text-slate-400 font-bold"
              >
                إغلاق المعاينة ✕
              </button>
            </div>

            {/* HIGH-FIDELITY CORPORATE INVOICE PREVIEW */}
            <div className="flex-1 bg-white text-slate-900 p-8 rounded-2xl shadow-inner border border-slate-200 overflow-y-auto select-none" dir="rtl">
              <div className="space-y-6">

                {/* Invoice Header */}
                <div className="flex justify-between items-start border-b-2 border-slate-900 pb-5">
                  <div className="space-y-1">
                    {isMasterBuilder ? (
                      <img src="/master_builder_logo.png" alt="Master Builder" className="h-16 w-auto object-contain mb-2" />
                    ) : (
                      <>
                        <h1 className="text-xl font-black tracking-tight text-slate-900">{activeProject?.company || 'TED CAPITAL'}</h1>
                        <p className="text-[10px] text-slate-500 font-bold">لإدارة المشاريع والاستشارات الهندسية والمقاولات</p>
                        <p className="text-[9px] text-slate-400 font-mono">القاهرة الجديدة - التجمع الخامس - مصر</p>
                      </>
                    )}
                  </div>
                  <div className="text-left space-y-1">
                    <h2 className="text-lg font-black text-slate-900">فاتورة مستخلص إنجاز أعمال</h2>
                    <div className="text-[10px] font-mono font-bold text-slate-600">
                      <div>رقم الفاتورة: <span className="text-slate-900 font-black">{selectedPrintValuation.invoiceNo || `INV-TEMP-${selectedPrintValuation.id}`}</span></div>
                      <div>رقم المستخلص: <span className="text-cyan-600 font-black">{selectedPrintValuation.claimNo}</span></div>
                      <div>التاريخ: <span className="text-slate-900 font-black">{selectedPrintValuation.date}</span></div>
                    </div>
                  </div>
                </div>

                {/* Bill To & Project Details */}
                <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl text-[11px] border border-slate-100">
                  <div className="space-y-1">
                    <div className="text-slate-400 font-bold">
                      {selectedPrintValuation.isContractor ? 'المقاول:' : 'العميل الكريم:'}
                    </div>
                    <div className="font-black text-slate-900 text-sm">
                      {selectedPrintValuation.isContractor ? (
                        Array.from(new Set(selectedPrintValuation.lines?.map(ln => ln.contractorName?.trim()).filter(Boolean))).join('، ') || '—'
                      ) : (
                        activeProject?.clientName
                      )}
                    </div>
                    <div className="text-slate-500 font-bold">المشروع: <span className="text-slate-900">{activeProject?.name}</span></div>
                  </div>
                  <div className="space-y-1 text-left">
                    <div className="text-slate-400 font-bold">بيانات المقاولة:</div>
                    <div className="font-bold text-slate-900">طبيعة البنود: توريد وتركيب وتشطيبات متكاملة</div>
                    <div className="text-slate-500 font-bold">حالة المستخلص: <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[9px] font-black border border-emerald-200">معتمد وقائم الصرف</span></div>
                  </div>
                </div>

                {/* Items Table */}
                <div className="overflow-x-auto">
                  {selectedPrintValuation.isContractor ? (
                    <table className="w-full text-right text-[10px] border-collapse">
                      <thead>
                        <tr className="bg-slate-900 text-white font-bold">
                          <th className="p-2 border border-slate-200">م</th>
                          <th className="p-2 border border-slate-200">البند المرتبط</th>
                          <th className="p-2 border border-slate-200">وصف العمل</th>
                          <th className="p-2 border border-slate-200 text-center">الوحدة</th>
                          <th className="p-2 border border-slate-200 text-center">الفئة</th>
                          <th className="p-2 border border-slate-200 text-center">الكمية السابقة</th>
                          <th className="p-2 border border-slate-200 text-center">الكمية الحالية</th>
                          <th className="p-2 border border-slate-200 text-center">الكمية التراكمية</th>
                          <th className="p-2 border border-slate-200 text-center">قيمة الفترة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {selectedPrintValuation.lines?.map((ln, idx) => {
                          const linkedBoq = boqItems.find(b => String(b.id) === String(ln.boqItemId) && String(b.projectId) === String(selectedPrintValuation.projectId || activeProjectId));
                          const prevQty = Number(ln.prevQty || 0);
                          const currQty = Number(ln.quantity || 0);
                          const cumQty = Number(ln.cumulativeQty || (prevQty + currQty));
                          const periodVal = currQty * Number(ln.unitPrice || 0);

                          return (
                            <tr key={ln.id || idx} className="hover:bg-slate-50 text-slate-800 font-bold">
                              <td className="p-2 border border-slate-200 text-center font-mono">{idx + 1}</td>
                              <td className="p-2 border border-slate-200 text-slate-500">{linkedBoq ? `[${linkedBoq.category}] ${linkedBoq.item_name}` : 'غير مرتبط'}</td>
                              <td className="p-2 border border-slate-200 text-slate-600">{ln.description || '—'}</td>
                              <td className="p-2 border border-slate-200 text-center">{ln.unit}</td>
                              <td className="p-2 border border-slate-200 text-center font-mono">{Number(ln.unitPrice || 0).toLocaleString()}</td>
                              <td className="p-2 border border-slate-200 text-center font-mono text-slate-500">{prevQty.toLocaleString()}</td>
                              <td className="p-2 border border-slate-200 text-center font-mono text-cyan-800">+{currQty.toLocaleString()}</td>
                              <td className="p-2 border border-slate-200 text-center font-mono text-slate-900">{cumQty.toLocaleString()}</td>
                              <td className="p-2 border border-slate-200 text-center font-mono text-emerald-800">{periodVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <table className="w-full text-right text-[10px] border-collapse">
                      <thead>
                        <tr className="bg-slate-900 text-white font-bold">
                          <th className="p-2 border border-slate-200">م</th>
                          <th className="p-2 border border-slate-200">بيان الأعمال والتوصيف الهندسي للبنود</th>
                          <th className="p-2 border border-slate-200 text-center">الوحدة</th>
                          <th className="p-2 border border-slate-200 text-center">الفئة</th>
                          <th className="p-2 border border-slate-200 text-center">الكمية الكلية</th>
                          <th className="p-2 border border-slate-200 text-center">المنفذ السابق</th>
                          <th className="p-2 border border-slate-200 text-center">المنفذ التراكمي</th>
                          <th className="p-2 border border-slate-200 text-center">المنفذ للفترة</th>
                          <th className="p-2 border border-slate-200 text-center">قيمة الفترة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {selectedPrintValuation.items?.map((it, idx) => {
                          const boqItem = boqItems.find(b => String(b.id) === String(it.boqItemId) && String(b.projectId) === String(selectedPrintValuation.projectId || activeProjectId));
                          if (!boqItem) return null;

                          const totalQty = boqItem.quantity || 1;
                          const prevPercent = it.completionPercent - it.netPercent;
                          const prevQty = it.prevQty !== undefined ? it.prevQty : Number(((prevPercent / 100) * totalQty).toFixed(2));
                          const currQty = it.currQty !== undefined ? it.currQty : Number(((it.completionPercent / 100) * totalQty).toFixed(2));
                          const netQty = it.netQty !== undefined ? it.netQty : Number(((it.netPercent / 100) * totalQty).toFixed(2));

                          if (netQty <= 0) return null;

                          return (
                            <tr key={it.boqItemId} className="hover:bg-slate-50 text-slate-800 font-bold">
                              <td className="p-2 border border-slate-200 text-center font-mono">{idx + 1}</td>
                              <td className="p-2 border border-slate-200">{boqItem.item_name}</td>
                              <td className="p-2 border border-slate-200 text-center">{boqItem.unit}</td>
                              <td className="p-2 border border-slate-200 text-center font-mono">{boqItem.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                              <td className="p-2 border border-slate-200 text-center font-mono">{totalQty}</td>
                              <td className="p-2 border border-slate-200 text-center font-mono text-slate-500">{prevQty}</td>
                              <td className="p-2 border border-slate-200 text-center font-mono text-slate-800">{currQty}</td>
                              <td className="p-2 border border-slate-200 text-center font-mono text-cyan-750">+{netQty}</td>
                              <td className="p-2 border border-slate-200 text-center font-mono text-slate-900">{it.currentAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* Calculation breakdown and subcontractor positions */}
                <div className="flex justify-between items-start border-t-2 border-slate-950 pt-4 flex-col md:flex-row gap-6">
                  {/* Left: Subcontractor Financial Position summary cards (only if contractor) */}
                  <div className="flex-1 w-full max-w-lg">
                    {selectedPrintValuation.isContractor && (
                      <div className="space-y-2 text-slate-900">
                        <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-500">الموقف المالي الإجمالي للمقاولين في هذا المستخلص:</h4>
                        <div className="grid grid-cols-1 gap-1.5">
                          {Array.from(new Set(selectedPrintValuation.lines?.map(ln => ln.contractorName?.trim()).filter(Boolean))).map(subName => {
                            const pos = getContractorFinancialPosition(subName, selectedPrintValuation.date, selectedPrintValuation.id);
                            return (
                              <div key={subName} className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-[9px] flex justify-between items-center">
                                <span className="font-black text-slate-800">{subName}</span>
                                <div className="flex gap-3 font-mono">
                                  <div>تراكمي الأعمال: <span className="font-bold">{pos.cumulativeWorks.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م</span></div>
                                  <div>المصروف/المدفوع: <span className="font-bold text-rose-700">{pos.previousSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م</span></div>
                                  <div>صافي المستحق: <span className="font-black text-emerald-700">{pos.currentNetDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م</span></div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right: Totals Breakdown */}
                  <div className="w-80 text-[11px] font-bold space-y-2 self-end md:self-auto border border-slate-150 p-4 rounded-2xl bg-slate-50 text-slate-900">
                    {(() => {
                      const isContractor = selectedPrintValuation.isContractor;
                      const grossVal = isContractor
                        ? (selectedPrintValuation.cumulativeGross || selectedPrintValuation.totalCurrent || 0)
                        : (selectedPrintValuation.totalCurrent || 0);

                      const discountVal = selectedPrintValuation.discount || 0;
                      const afterDiscountVal = grossVal - discountVal;

                      const previouslyDisbursedVal = isContractor
                        ? (selectedPrintValuation.prevPaid || 0)
                        : installments
                            .filter(inst => String(inst.projectId) === String(selectedPrintValuation.projectId) && inst.date < selectedPrintValuation.date)
                            .reduce((sum, inst) => sum + Number(inst.amount || 0), 0);

                      const taxVal = selectedPrintValuation.taxAmount || 0;
                      const taxRateVal = selectedPrintValuation.taxRate || 0;

                      const remainingVal = isContractor
                        ? (selectedPrintValuation.totalFinal !== undefined ? selectedPrintValuation.totalFinal : (afterDiscountVal - previouslyDisbursedVal + taxVal))
                        : ((selectedPrintValuation.totalFinal || (afterDiscountVal + taxVal)) - previouslyDisbursedVal);

                      return (
                        <>
                          <div className="flex justify-between items-center text-slate-800">
                            <span>إجمالى المستخلص:</span>
                            <span className="font-mono text-xs">{grossVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م</span>
                          </div>
                          <div className="flex justify-between items-center text-rose-700">
                            <span>أجمالى الخصم:</span>
                            <span className="font-mono text-xs">-{discountVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م</span>
                          </div>
                          <div className="flex justify-between items-center text-slate-900 border-t border-slate-200 pt-1.5">
                            <span>الأجمالى بعد الخصم:</span>
                            <span className="font-mono text-xs">{afterDiscountVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م</span>
                          </div>
                          <div className="flex justify-between items-center text-slate-650">
                            <span>ماسبق صرفه:</span>
                            <span className="font-mono text-xs">{previouslyDisbursedVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م</span>
                          </div>
                          {taxVal > 0 && (
                            <div className="flex justify-between items-center text-slate-500 text-[10px]">
                              <span>ضريبة القيمة المضافة ({taxRateVal}%):</span>
                              <span className="font-mono text-xs">+{taxVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م</span>
                            </div>
                          )}
                          {taxVal === 0 && taxRateVal > 0 && (
                            <div className="flex justify-between items-center text-emerald-700 text-[10px]">
                              <span>ضريبة القيمة المضافة ({taxRateVal}%):</span>
                              <span className="font-mono text-[9px]">إعفاء / مسددة تراكمياً</span>
                            </div>
                          )}
                          <div className="flex justify-between items-center text-sm font-black border-t-2 border-slate-950 pt-2 text-slate-950">
                            <span>الأجمالى المتبقى:</span>
                            <span className="font-mono text-base font-black text-emerald-800">{remainingVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م</span>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* Corporate Footer Signatures */}
                <div className="grid grid-cols-3 gap-6 pt-12 text-[10px] font-bold text-center">
                  <div className="space-y-6">
                    <div>توقيع واعتماد العميل</div>
                    <div className="border-b border-dashed border-slate-400 w-32 mx-auto"></div>
                  </div>
                  <div className="space-y-6">
                    <div>المهندس المسؤول / المشرف</div>
                    <div className="border-b border-dashed border-slate-400 w-32 mx-auto"></div>
                  </div>
                  <div className="space-y-6">
                    <div>المدير المالي والاداري</div>
                    <div className="border-b border-dashed border-slate-400 w-32 mx-auto"></div>
                  </div>
                </div>

              </div>
            </div>

            {/* Modal Controls */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                onClick={() => setSelectedPrintValuation(null)}
                className="px-5 py-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-400 font-bold"
              >
                إلغاء
              </button>
              <button
                onClick={handlePrint}
                className="px-6 py-2.5 bg-cyan-500 rounded-xl text-xs font-black text-slate-950 shadow-lg shadow-cyan-500/20 active:scale-95 transition-transform"
              >
                طباعة الفاتورة أو الحفظ كـ PDF 🖨️
              </button>
            </div>

          </div>
        </div>
      )}

      {/* 7. PRINT-ONLY EXCLUSIVE INVOICE DOCUMENT */}
      {selectedPrintValuation && (
        <div className="hidden print:block print-full-width text-slate-900 bg-white p-8 font-sans exact-print-preview" dir="rtl">
          <div className="space-y-6">

            {/* Invoice Header */}
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-5">
              <div className="space-y-1">
                {isMasterBuilder ? (
                  <img src="/master_builder_logo.png" alt="Master Builder" className="h-16 w-auto object-contain mb-2" />
                ) : (
                  <>
                    <h1 className="text-xl font-black tracking-tight text-slate-900">{activeProject?.company || 'TED CAPITAL'}</h1>
                    <p className="text-[10px] text-slate-500 font-bold">لإدارة المشاريع والاستشارات الهندسية والمقاولات</p>
                    <p className="text-[9px] text-slate-400 font-mono">القاهرة الجديدة - التجمع الخامس - مصر</p>
                  </>
                )}
              </div>
              <div className="text-left space-y-1">
                <h2 className="text-lg font-black text-slate-900">فاتورة مستخلص إنجاز أعمال</h2>
                <div className="text-[10px] font-mono font-bold text-slate-600">
                  <div>رقم الفاتورة: <span className="text-slate-900 font-black">{selectedPrintValuation.invoiceNo || `INV-TEMP-${selectedPrintValuation.id}`}</span></div>
                  <div>رقم المستخلص: <span className="text-cyan-600 font-black">{selectedPrintValuation.claimNo}</span></div>
                  <div>التاريخ: <span className="text-slate-900 font-black">{selectedPrintValuation.date}</span></div>
                </div>
              </div>
            </div>

            {/* Bill To & Project Details */}
            <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl text-[11px] border border-slate-100">
              <div className="space-y-1">
                <div className="text-slate-400 font-bold">
                  {selectedPrintValuation.isContractor ? 'المقاول:' : 'العميل الكريم:'}
                </div>
                <div className="font-black text-slate-900 text-sm">
                  {selectedPrintValuation.isContractor ? (
                    Array.from(new Set(selectedPrintValuation.lines?.map(ln => ln.contractorName?.trim()).filter(Boolean))).join('، ') || '—'
                  ) : (
                    activeProject?.clientName
                  )}
                </div>
                <div className="text-slate-500 font-bold">المشروع: <span className="text-slate-900">{activeProject?.name}</span></div>
              </div>
              <div className="space-y-1 text-left">
                <div className="text-slate-400 font-bold">بيانات المقاولة:</div>
                <div className="font-bold text-slate-900">طبيعة البنود: توريد وتركيب وتشطيبات متكاملة</div>
                <div className="text-slate-500 font-bold">حالة المستخلص: <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[9px] font-black border border-emerald-200">معتمد وقائم الصرف</span></div>
              </div>
            </div>

            {/* Items Table */}
            <div className="overflow-x-auto">
              {selectedPrintValuation.isContractor ? (
                <table className="w-full text-right text-[10px] border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white font-bold">
                      <th className="p-2 border border-slate-200">م</th>
                      <th className="p-2 border border-slate-200">البند المرتبط</th>
                      <th className="p-2 border border-slate-200">وصف العمل</th>
                      <th className="p-2 border border-slate-200 text-center">الوحدة</th>
                      <th className="p-2 border border-slate-200 text-center">الفئة</th>
                      <th className="p-2 border border-slate-200 text-center">الكمية السابقة</th>
                      <th className="p-2 border border-slate-200 text-center">الكمية الحالية</th>
                      <th className="p-2 border border-slate-200 text-center">الكمية التراكمية</th>
                      <th className="p-2 border border-slate-200 text-center">قيمة الفترة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {selectedPrintValuation.lines?.map((ln, idx) => {
                      const linkedBoq = boqItems.find(b => String(b.id) === String(ln.boqItemId) && String(b.projectId) === String(selectedPrintValuation.projectId || activeProjectId));
                      const prevQty = Number(ln.prevQty || 0);
                      const currQty = Number(ln.quantity || 0);
                      const cumQty = Number(ln.cumulativeQty || (prevQty + currQty));
                      const periodVal = currQty * Number(ln.unitPrice || 0);

                      return (
                        <tr key={ln.id || idx} className="hover:bg-slate-50 text-slate-800 font-bold">
                          <td className="p-2 border border-slate-200 text-center font-mono">{idx + 1}</td>
                          <td className="p-2 border border-slate-200 text-slate-500">{linkedBoq ? `[${linkedBoq.category}] ${linkedBoq.item_name}` : 'غير مرتبط'}</td>
                          <td className="p-2 border border-slate-200 text-slate-600">{ln.description || '—'}</td>
                          <td className="p-2 border border-slate-200 text-center">{ln.unit}</td>
                          <td className="p-2 border border-slate-200 text-center font-mono">{Number(ln.unitPrice || 0).toLocaleString()}</td>
                          <td className="p-2 border border-slate-200 text-center font-mono text-slate-500">{prevQty.toLocaleString()}</td>
                          <td className="p-2 border border-slate-200 text-center font-mono text-cyan-800">+{currQty.toLocaleString()}</td>
                          <td className="p-2 border border-slate-200 text-center font-mono text-slate-900">{cumQty.toLocaleString()}</td>
                          <td className="p-2 border border-slate-200 text-center font-mono text-emerald-800">{periodVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-right text-[10px] border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white font-bold">
                      <th className="p-2 border border-slate-200">م</th>
                      <th className="p-2 border border-slate-200">بيان الأعمال والتوصيف الهندسي للبنود</th>
                      <th className="p-2 border border-slate-200 text-center">الوحدة</th>
                      <th className="p-2 border border-slate-200 text-center">الفئة</th>
                      <th className="p-2 border border-slate-200 text-center">الكمية الكلية</th>
                      <th className="p-2 border border-slate-200 text-center">المنفذ السابق</th>
                      <th className="p-2 border border-slate-200 text-center">المنفذ التراكمي</th>
                      <th className="p-2 border border-slate-200 text-center">المنفذ للفترة</th>
                      <th className="p-2 border border-slate-200 text-center">قيمة الفترة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {selectedPrintValuation.items?.map((it, idx) => {
                      const boqItem = boqItems.find(b => String(b.id) === String(it.boqItemId) && String(b.projectId) === String(selectedPrintValuation.projectId || activeProjectId));
                      if (!boqItem) return null;

                      const totalQty = boqItem.quantity || 1;
                      const prevPercent = it.completionPercent - it.netPercent;
                      const prevQty = it.prevQty !== undefined ? it.prevQty : Number(((prevPercent / 100) * totalQty).toFixed(2));
                      const currQty = it.currQty !== undefined ? it.currQty : Number(((it.completionPercent / 100) * totalQty).toFixed(2));
                      const netQty = it.netQty !== undefined ? it.netQty : Number(((it.netPercent / 100) * totalQty).toFixed(2));

                      if (netQty <= 0) return null;

                      return (
                        <tr key={it.boqItemId} className="hover:bg-slate-50 text-slate-800 font-bold">
                          <td className="p-2 border border-slate-200 text-center font-mono">{idx + 1}</td>
                          <td className="p-2 border border-slate-200">{boqItem.item_name}</td>
                          <td className="p-2 border border-slate-200 text-center">{boqItem.unit}</td>
                          <td className="p-2 border border-slate-200 text-center font-mono">{boqItem.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td className="p-2 border border-slate-200 text-center font-mono">{totalQty}</td>
                          <td className="p-2 border border-slate-200 text-center font-mono text-slate-500">{prevQty}</td>
                          <td className="p-2 border border-slate-200 text-center font-mono text-slate-800">{currQty}</td>
                          <td className="p-2 border border-slate-200 text-center font-mono text-cyan-750">+{netQty}</td>
                          <td className="p-2 border border-slate-200 text-center font-mono text-slate-900">{it.currentAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Calculation breakdown and subcontractor positions */}
            <div className="flex justify-between items-start border-t-2 border-slate-950 pt-4 flex-col md:flex-row gap-6">
              {/* Left: Subcontractor Financial Position summary cards (only if contractor) */}
              <div className="flex-1 w-full max-w-lg">
                {selectedPrintValuation.isContractor && (
                  <div className="space-y-2 text-slate-900">
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-500">الموقف المالي الإجمالي للمقاولين في هذا المستخلص:</h4>
                    <div className="grid grid-cols-1 gap-1.5">
                      {Array.from(new Set(selectedPrintValuation.lines?.map(ln => ln.contractorName?.trim()).filter(Boolean))).map(subName => {
                        const pos = getContractorFinancialPosition(subName, selectedPrintValuation.date, selectedPrintValuation.id);
                        return (
                          <div key={subName} className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-[9px] flex justify-between items-center">
                            <span className="font-black text-slate-800">{subName}</span>
                            <div className="flex gap-3 font-mono">
                              <div>تراكمي الأعمال: <span className="font-bold">{pos.cumulativeWorks.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م</span></div>
                              <div>المصروف/المدفوع: <span className="font-bold text-rose-700">{pos.previousSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م</span></div>
                              <div>صافي المستحق: <span className="font-black text-emerald-700">{pos.currentNetDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م</span></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Totals Breakdown */}
              <div className="w-80 text-[11px] font-bold space-y-2 self-end md:self-auto border border-slate-150 p-4 rounded-2xl bg-slate-50 text-slate-900">
                {(() => {
                  const isContractor = selectedPrintValuation.isContractor;
                  const grossVal = isContractor
                    ? (selectedPrintValuation.cumulativeGross || selectedPrintValuation.totalCurrent || 0)
                    : (selectedPrintValuation.totalCurrent || 0);

                  const discountVal = selectedPrintValuation.discount || 0;
                  const afterDiscountVal = grossVal - discountVal;

                  const previouslyDisbursedVal = isContractor
                    ? (selectedPrintValuation.prevPaid || 0)
                    : installments
                        .filter(inst => String(inst.projectId) === String(selectedPrintValuation.projectId) && inst.date < selectedPrintValuation.date)
                        .reduce((sum, inst) => sum + Number(inst.amount || 0), 0);

                  const taxVal = selectedPrintValuation.taxAmount || 0;
                  const taxRateVal = selectedPrintValuation.taxRate || 0;

                  const remainingVal = isContractor
                    ? (selectedPrintValuation.totalFinal !== undefined ? selectedPrintValuation.totalFinal : (afterDiscountVal - previouslyDisbursedVal + taxVal))
                    : ((selectedPrintValuation.totalFinal || (afterDiscountVal + taxVal)) - previouslyDisbursedVal);

                  return (
                    <>
                      <div className="flex justify-between items-center text-slate-800">
                        <span>إجمالى المستخلص:</span>
                        <span className="font-mono text-xs">{grossVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م</span>
                      </div>
                      <div className="flex justify-between items-center text-rose-700">
                        <span>أجمالى الخصم:</span>
                        <span className="font-mono text-xs">-{discountVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-900 border-t border-slate-200 pt-1.5">
                        <span>الأجمالى بعد الخصم:</span>
                        <span className="font-mono text-xs">{afterDiscountVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-650">
                        <span>ماسبق صرفه:</span>
                        <span className="font-mono text-xs">{previouslyDisbursedVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م</span>
                      </div>
                      {taxVal > 0 && (
                        <div className="flex justify-between items-center text-slate-500 text-[10px]">
                          <span>ضريبة القيمة المضافة ({taxRateVal}%):</span>
                          <span className="font-mono text-xs">+{taxVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م</span>
                        </div>
                      )}
                      {taxVal === 0 && taxRateVal > 0 && (
                        <div className="flex justify-between items-center text-emerald-700 text-[10px]">
                          <span>ضريبة القيمة المضافة ({taxRateVal}%):</span>
                          <span className="font-mono text-[9px]">إعفاء / مسددة تراكمياً</span>
                        </div>
                      )}
                      <div className="flex justify-between items-center text-sm font-black border-t-2 border-slate-950 pt-2 text-slate-950">
                        <span>الأجمالى المتبقى:</span>
                        <span className="font-mono text-base font-black text-emerald-800">{remainingVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م</span>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Corporate Footer Signatures */}
            <div className="grid grid-cols-3 gap-6 pt-12 text-[10px] font-bold text-center">
              <div className="space-y-6">
                <div>توقيع واعتماد العميل</div>
                <div className="border-b border-dashed border-slate-400 w-32 mx-auto"></div>
              </div>
              <div className="space-y-6">
                <div>المهندس المسؤول / المشرف</div>
                <div className="border-b border-dashed border-slate-400 w-32 mx-auto"></div>
              </div>
              <div className="space-y-6">
                <div>المدير المالي والاداري</div>
                <div className="border-b border-dashed border-slate-400 w-32 mx-auto"></div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* 8. PAYMENT RECEIPT PREVIEW MODAL */}
      {selectedPrintInstallment && (() => {
        const linkedVal = valuations.find(v => v.id === selectedPrintInstallment.valuationId);
        const isContractorVal = linkedVal?.isContractor;
        const nameToDisplay = isContractorVal ? (linkedVal.lines?.[0]?.contractorName || 'مقاول عام') : (activeProject?.clientName || 'عميل عام');
        const receiptTitle = isContractorVal ? 'إيصال صرف نقدية' : 'إيصال استلام نقدية';
        const relationText = isContractorVal ? 'صرفنا إلى السيد / السادة:' : 'وصلنا من السيد / السادة:';
        const themeColorClass = isContractorVal ? 'border-orange-500/25 bg-orange-500/5 text-orange-400' : 'border-emerald-500/25 bg-emerald-500/5 text-emerald-400';
        
        return (
          <div className="fixed inset-0 bg-[#070a13]/85 flex items-center justify-center p-4 z-50 no-print animate-in fade-in duration-300">
            <div className="bg-[#0b0f19] border border-slate-800 rounded-3xl w-full max-w-2xl p-8 space-y-6 overflow-y-auto max-h-[90vh] shadow-2xl flex flex-col">
              <div className="flex justify-between items-center pb-4 border-b border-slate-800">
                <h3 className="text-sm font-black text-slate-200 flex items-center gap-2">
                  <span className={`p-1.5 rounded-lg border ${themeColorClass}`}>💵</span> {receiptTitle} — معاينة وطباعة
                </h3>
                <button
                  onClick={() => setSelectedPrintInstallment(null)}
                  className="px-3 py-1.5 bg-slate-950 hover:bg-slate-850 border border-slate-800 rounded-xl text-xs text-slate-400 font-bold transition-all"
                >
                  إغلاق المعاينة ✕
                </button>
              </div>

              {/* HIGH-FIDELITY RECEIPT PREVIEW */}
              <div className="flex-1 bg-white text-slate-900 p-6 rounded-2xl shadow-inner border border-slate-200 overflow-y-auto select-none" dir="rtl">
                <div className="relative border-4 border-double border-slate-700 p-6 rounded-2xl bg-[#fcfcfc] overflow-hidden">
                  
                  {/* Seal Watermark */}
                  <div className="absolute bottom-16 right-16 w-24 h-24 border-2 border-dashed border-red-400 rounded-full flex items-center justify-center rotate-12 opacity-25 select-none pointer-events-none">
                    <div className="text-center font-bold text-red-500 text-[8px] leading-tight">
                      {activeProject?.company || 'TED CAPITAL'}<br/>
                      الختم الرسمي<br/>
                      OFFICIAL SEAL
                    </div>
                  </div>

                  {/* Header */}
                  <div className="flex justify-between items-center border-b-2 border-slate-800 pb-3 mb-4">
                    <div className="space-y-1">
                      {isMasterBuilder ? (
                        <img src="/master_builder_logo.png" alt="Master Builder" className="h-12 w-auto object-contain mb-1" />
                      ) : (
                        <>
                          <h1 className="text-base font-black tracking-tight text-slate-850">{activeProject?.company || 'TED CAPITAL'}</h1>
                          <p className="text-[8px] text-slate-500 font-bold">لإدارة المشاريع والاستشارات الهندسية والمقاولات</p>
                        </>
                      )}
                    </div>
                    <div className="text-center space-y-1">
                      <h2 className={`text-xs font-black px-4 py-1.5 rounded-lg border shadow-sm ${isContractorVal ? 'bg-orange-50 text-orange-950 border-orange-200' : 'bg-emerald-50 text-emerald-950 border-emerald-200'}`}>
                        {receiptTitle}
                      </h2>
                      <p className="text-[8px] text-slate-400 font-mono">VOUCHER RECORD</p>
                    </div>
                    <div className="text-left text-[9px] font-mono font-bold text-slate-600 space-y-0.5">
                      <div>رقم الإيصال: <span className="text-slate-900 font-black">REC-{selectedPrintInstallment.id}</span></div>
                      <div>التاريخ: <span className="text-slate-900 font-black">{selectedPrintInstallment.date}</span></div>
                    </div>
                  </div>

                  {/* Ledger-style structured Grid */}
                  <div className="border border-slate-300 rounded-xl overflow-hidden text-[11px] font-bold text-slate-800 bg-white shadow-sm">
                    <div className="grid grid-cols-2 border-b border-slate-300">
                      <div className="p-3 border-l border-slate-300 bg-slate-50/50">
                        <span className="text-slate-400 block text-[9px] mb-0.5">{relationText.split(':')[0]}</span>
                        <span className="text-slate-950 font-black text-xs">{nameToDisplay}</span>
                      </div>
                      <div className="p-3 bg-slate-50/50">
                        <span className="text-slate-400 block text-[9px] mb-0.5">حساب مشروع / Project:</span>
                        <span className="text-slate-950">{activeProject?.name}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 border-b border-slate-300">
                      <div className="p-3 border-l border-slate-300">
                        <span className="text-slate-400 block text-[9px] mb-0.5">طريقة الدفع / Payment Method:</span>
                        <span className="text-slate-950">{selectedPrintInstallment.paymentMethod || 'نقدًا'}</span>
                      </div>
                      <div className="p-3">
                        <span className="text-slate-400 block text-[9px] mb-0.5">الرقم المرجعي أو التفاصيل / Ref No:</span>
                        <span className="text-slate-950 font-mono">{selectedPrintInstallment.referenceNo || '—'}</span>
                      </div>
                    </div>

                    <div className="p-3 border-b border-slate-300 bg-slate-50/30">
                      <span className="text-slate-400 block text-[9px] mb-0.5">مبلغ وقدره تفقيطاً / Amount in Words:</span>
                      <span className="text-slate-950 text-xs font-black">{tafqeet(selectedPrintInstallment.amount)}</span>
                    </div>

                    <div className="p-3 border-b border-slate-300">
                      <span className="text-slate-400 block text-[9px] mb-0.5">وذلك عن بيان / Being:</span>
                      <span className="text-slate-800 font-medium leading-relaxed">{selectedPrintInstallment.notes || 'دفعة تحت الحساب للمشروع المذكور أعلاه.'}</span>
                    </div>

                    {linkedVal && (
                      <div className={`p-3 text-[10px] font-bold ${isContractorVal ? 'bg-orange-50/50 text-orange-950' : 'bg-cyan-50/50 text-cyan-950'}`}>
                        <span>🔗 ربط وتسوية مستخلص مالي رقم: </span>
                        <span className="font-black underline">{linkedVal.claimNo}</span>
                        {linkedVal.invoiceNo && <span> | فاتورة رقم: <span className="font-black">{linkedVal.invoiceNo}</span></span>}
                      </div>
                    )}
                  </div>

                  {/* Highlighted Amount Numeric Box */}
                  <div className={`flex justify-between items-center px-4 py-2.5 rounded-xl border-2 border-dashed mt-4 shadow-sm ${isContractorVal ? 'bg-orange-50/60 border-orange-300 text-orange-950' : 'bg-emerald-50/60 border-emerald-300 text-emerald-950'}`}>
                    <span className="text-[10px] uppercase font-mono tracking-wider">المبلغ الفعلي / Net Amount</span>
                    <span className="font-mono text-sm font-black">
                      {selectedPrintInstallment.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م
                    </span>
                  </div>

                  {/* Signatures */}
                  <div className="grid grid-cols-3 gap-4 pt-8 text-[9px] font-bold text-center text-slate-600">
                    <div className="space-y-4">
                      <div>المستلم / المستفيد</div>
                      <div className="border-b border-dashed border-slate-400 w-24 mx-auto"></div>
                    </div>
                    <div className="space-y-4">
                      <div>المدير المالي</div>
                      <div className="border-b border-dashed border-slate-400 w-24 mx-auto"></div>
                    </div>
                    <div className="space-y-4">
                      <div>المدير العام</div>
                      <div className="border-b border-dashed border-slate-400 w-24 mx-auto"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Controls */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  onClick={() => setSelectedPrintInstallment(null)}
                  className="px-5 py-2.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-400 font-bold"
                >
                  إلغاء
                </button>
                <button
                  onClick={handlePrint}
                  className={`px-6 py-2.5 rounded-xl text-xs font-black text-slate-950 shadow-lg active:scale-95 transition-all ${isContractorVal ? 'bg-orange-500 shadow-orange-500/20' : 'bg-emerald-500 shadow-emerald-500/20'}`}
                >
                  طباعة الإيصال 🖨️
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 9. PRINT-ONLY EXCLUSIVE PAYMENT RECEIPT DOCUMENT */}
      {selectedPrintInstallment && (() => {
        const linkedVal = valuations.find(v => v.id === selectedPrintInstallment.valuationId);
        const isContractorVal = linkedVal?.isContractor;
        const nameToDisplay = isContractorVal ? (linkedVal.lines?.[0]?.contractorName || 'مقاول عام') : (activeProject?.clientName || 'عميل عام');
        const receiptTitle = isContractorVal ? 'إيصال صرف نقدية' : 'إيصال استلام نقدية';
        const relationText = isContractorVal ? 'صرفنا إلى السيد / السادة:' : 'وصلنا من السيد / السادة:';
        
        return (
          <div className="hidden print:block print-full-width text-slate-900 bg-white p-6 font-sans exact-print-preview" dir="rtl">
            <div className="relative border-4 border-double border-slate-700 p-6 rounded-2xl bg-[#fcfcfc] overflow-hidden">
              
              {/* Seal Watermark */}
              <div className="absolute bottom-16 right-16 w-24 h-24 border-2 border-dashed border-red-400 rounded-full flex items-center justify-center rotate-12 opacity-25 select-none pointer-events-none">
                <div className="text-center font-bold text-red-500 text-[8px] leading-tight">
                  {activeProject?.company || 'TED CAPITAL'}<br/>
                  الختم الرسمي<br/>
                  OFFICIAL SEAL
                </div>
              </div>

              {/* Header */}
              <div className="flex justify-between items-center border-b-2 border-slate-800 pb-3 mb-4">
                <div className="space-y-1">
                  {isMasterBuilder ? (
                    <img src="/master_builder_logo.png" alt="Master Builder" className="h-12 w-auto object-contain mb-1" />
                  ) : (
                    <>
                      <h1 className="text-base font-black tracking-tight text-slate-850">{activeProject?.company || 'TED CAPITAL'}</h1>
                      <p className="text-[8px] text-slate-500 font-bold">لإدارة المشاريع والاستشارات الهندسية والمقاولات</p>
                    </>
                  )}
                </div>
                <div className="text-center space-y-1">
                  <h2 className={`text-xs font-black px-4 py-1.5 rounded-lg border shadow-sm ${isContractorVal ? 'bg-orange-50 text-orange-950 border-orange-200' : 'bg-emerald-50 text-emerald-950 border-emerald-200'}`}>
                    {receiptTitle}
                  </h2>
                  <p className="text-[8px] text-slate-400 font-mono">VOUCHER RECORD</p>
                </div>
                <div className="text-left text-[9px] font-mono font-bold text-slate-600 space-y-0.5">
                  <div>رقم الإيصال: <span className="text-slate-900 font-black">REC-{selectedPrintInstallment.id}</span></div>
                  <div>التاريخ: <span className="text-slate-900 font-black">{selectedPrintInstallment.date}</span></div>
                </div>
              </div>

              {/* Ledger-style structured Grid */}
              <div className="border border-slate-300 rounded-xl overflow-hidden text-[11px] font-bold text-slate-800 bg-white shadow-sm">
                <div className="grid grid-cols-2 border-b border-slate-300">
                  <div className="p-3 border-l border-slate-300 bg-slate-50/50">
                    <span className="text-slate-400 block text-[9px] mb-0.5">{relationText.split(':')[0]}</span>
                    <span className="text-slate-950 font-black text-xs">{nameToDisplay}</span>
                  </div>
                  <div className="p-3 bg-slate-50/50">
                    <span className="text-slate-400 block text-[9px] mb-0.5">حساب مشروع / Project:</span>
                    <span className="text-slate-950">{activeProject?.name}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 border-b border-slate-300">
                  <div className="p-3 border-l border-slate-300">
                    <span className="text-slate-400 block text-[9px] mb-0.5">طريقة الدفع / Payment Method:</span>
                    <span className="text-slate-950">{selectedPrintInstallment.paymentMethod || 'نقدًا'}</span>
                  </div>
                  <div className="p-3">
                    <span className="text-slate-400 block text-[9px] mb-0.5">الرقم المرجعي أو التفاصيل / Ref No:</span>
                    <span className="text-slate-950 font-mono">{selectedPrintInstallment.referenceNo || '—'}</span>
                  </div>
                </div>

                <div className="p-3 border-b border-slate-300 bg-slate-50/30">
                  <span className="text-slate-400 block text-[9px] mb-0.5">مبلغ وقدره تفقيطاً / Amount in Words:</span>
                  <span className="text-slate-950 text-xs font-black">{tafqeet(selectedPrintInstallment.amount)}</span>
                </div>

                <div className="p-3 border-b border-slate-300">
                  <span className="text-slate-400 block text-[9px] mb-0.5">وذلك عن بيان / Being:</span>
                  <span className="text-slate-800 font-medium leading-relaxed">{selectedPrintInstallment.notes || 'دفعة تحت الحساب للمشروع المذكور أعلاه.'}</span>
                </div>

                {linkedVal && (
                  <div className={`p-3 text-[10px] font-bold ${isContractorVal ? 'bg-orange-50/50 text-orange-950' : 'bg-cyan-50/50 text-cyan-950'}`}>
                    <span>🔗 ربط وتسوية مستخلص مالي رقم: </span>
                    <span className="font-black underline">{linkedVal.claimNo}</span>
                    {linkedVal.invoiceNo && <span> | فاتورة رقم: <span className="font-black">{linkedVal.invoiceNo}</span></span>}
                  </div>
                )}
              </div>

              {/* Highlighted Amount Numeric Box */}
              <div className={`flex justify-between items-center px-4 py-2.5 rounded-xl border-2 border-dashed mt-4 shadow-sm ${isContractorVal ? 'bg-orange-50/60 border-orange-300 text-orange-950' : 'bg-emerald-50/60 border-emerald-300 text-emerald-950'}`}>
                <span className="text-[10px] uppercase font-mono tracking-wider">المبلغ الفعلي / Net Amount</span>
                <span className="font-mono text-sm font-black">
                  {selectedPrintInstallment.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م
                </span>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-3 gap-4 pt-8 text-[9px] font-bold text-center text-slate-600">
                <div className="space-y-4">
                  <div>المستلم / المستفيد</div>
                  <div className="border-b border-dashed border-slate-400 w-24 mx-auto"></div>
                </div>
                <div className="space-y-4">
                  <div>المدير المالي</div>
                  <div className="border-b border-dashed border-slate-400 w-24 mx-auto"></div>
                </div>
                <div className="space-y-4">
                  <div>المدير العام</div>
                  <div className="border-b border-dashed border-slate-400 w-24 mx-auto"></div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

