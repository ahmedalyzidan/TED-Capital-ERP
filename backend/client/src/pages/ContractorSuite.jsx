import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import api from '../services/api';
import DirectStockIssue from './DirectStockIssue';

export default function ContractorSuite() {
  const { language } = useLanguage();

  // --- 1. PERSISTED STATE / MULTI-PROJECT ENGINE ---
  // We initialize the state by reading from localStorage, or using the preloaded "Villa E109" as our seed project.
  const [projects, setProjects] = useState(() => {
    const saved = localStorage.getItem('contractor_projects');
    if (saved) return JSON.parse(saved);
    return [
      { id: 'villa-e109', name: 'فيلا E109 - التجمع الخامس', clientName: 'الأستاذ محمد', company: 'TED CAPITAL' },
      { id: 'villa-e110', name: 'فيلا E110 - زايد الجديد', clientName: 'المهندس أحمد سالم', company: 'PRIMEMED PHARMA' }
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
      const [orgRes, projRes, salesRes] = await Promise.all([
        api.get('/dynamic/table/org_units?limit=1000').catch(() => ({ data: { data: [] } })),
        api.get('/dynamic/table/projects?limit=500').catch(() => ({ data: { data: [] } })),
        api.get('/dynamic/table/inventory_sales?limit=2000').catch(() => ({ data: { data: [] } }))
      ]);

      // 1. Set Org Units
      setOrgUnits(orgRes.data?.data || []);

      // 2. Set Projects (Merge database projects with localStorage projects)
      const dbProjects = projRes.data?.data || [];
      const mappedProjects = dbProjects.map(p => ({
        id: String(p.id),
        name: p.name,
        clientName: p.client_name || p.client || 'عميل عام',
        company: p.company || 'TED CAPITAL'
      }));

      setProjects(prev => {
        const merged = [...prev];
        mappedProjects.forEach(mp => {
          if (!merged.some(p => String(p.id) === String(mp.id))) {
            merged.push(mp);
          }
        });
        return merged;
      });

      // 3. Set DB inventory sales as expenses
      const sales = salesRes.data?.data || [];
      setRawSales(sales);

      const mappedExpenses = sales
        .filter(s => s.project_id && !s.is_deleted && s.is_deleted !== 1 && s.is_deleted !== 'true')
        .map(s => {
          const qtyVal = Number(s.qty || 0);
          const isReturn = qtyVal > 0;
          return {
            id: `db-sale-${s.id}`,
            projectId: String(s.project_id),
            beneficiary: isReturn ? 'مرتجع مواد فائضة للمستودع' : 'صرف مخزني مباشر - مستودع المواد',
            category: 'مواد ومستلزمات',
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
      setDbExpenses(mappedExpenses);

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
  const [newProjectForm, setNewProjectForm] = useState({ name: '', clientName: '', company: 'TED CAPITAL' });

  const [showAddBoq, setShowAddBoq] = useState(false);
  const [newBoq, setNewBoq] = useState({ category: 'أعمال صحي', item_name: '', quantity: 1, unit: 'م٢', price: 0, notes: '' });

  const [showAddExpense, setShowAddExpense] = useState(false);
  const [newExpense, setNewExpense] = useState({ beneficiary: '', category: 'أعمال صحي', unit: 'م٢', qty: 1, rate: 0, date: new Date().toISOString().split('T')[0], notes: '', allocationType: 'project' });

  const [showAddInstallment, setShowAddInstallment] = useState(false);
  const [newInstallment, setNewInstallment] = useState({ amount: 0, date: new Date().toISOString().split('T')[0], notes: '', valuationId: '' });

  // 🏗️ Progress Claims (Valuations) Wizard States
  const [showAddValuation, setShowAddValuation] = useState(false);
  const [valuationDate, setValuationDate] = useState(new Date().toISOString().split('T')[0]);
  const [newValuationItems, setNewValuationItems] = useState({});
  const [valuationDiscount, setValuationDiscount] = useState('');
  const [valuationTax, setValuationTax] = useState('');

  // 🏗️ Contractor-Side Progress Claims Wizard States
  const [showAddContractorValuation, setShowAddContractorValuation] = useState(false);
  const [contractorValuationDate, setContractorValuationDate] = useState(new Date().toISOString().split('T')[0]);
  const [contractorValuationLines, setContractorValuationLines] = useState([]);
  const [contractorValuationDiscount, setContractorValuationDiscount] = useState('');
  const [contractorValuationTax, setContractorValuationTax] = useState('');

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
    "أعمال توريدات"
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
      if (val.projectId === activeProjectId && val.id !== currentValuationId) {
        const item = val.items?.find(it => it.boqItemId === boqItemId);
        if (item) {
          total += Number(item.completionPercent || 0);
        }
      }
    });
    return Math.min(100, total);
  };

  // --- 4. CRUD OPERATIONS (WITH AUTOMATIC REVERSAL IMPLEMENTED) ---

  // Projects CRUD
  const handleCreateProject = (e) => {
    e.preventDefault();
    if (!newProjectForm.name) return;
    const newId = `project-${Date.now()}`;
    const newProj = {
      id: newId,
      name: newProjectForm.name,
      clientName: newProjectForm.clientName || 'عميل عام',
      company: newProjectForm.company || 'TED CAPITAL'
    };
    setProjects([...projects, newProj]);
    setActiveProjectId(newId);
    setNewProjectForm({ name: '', clientName: '', company: 'TED CAPITAL' });
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
    setNewBoq({ category: 'أعمال صحي', item_name: '', quantity: 1, unit: 'م٢', price: 0, notes: '' });
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
    const activeCompany = activeProject?.company || 'TED CAPITAL';
    const newItem = {
      id: Date.now(),
      projectId: newExpense.allocationType === 'company' ? `company-overhead-${activeCompany}` : activeProjectId,
      ...newExpense,
      qty: Number(newExpense.qty),
      rate: Number(newExpense.rate),
      total
    };
    setExpenses([...expenses, newItem]);
    setNewExpense({ beneficiary: '', category: 'أعمال صحي', unit: 'م٢', qty: 1, rate: 0, date: new Date().toISOString().split('T')[0], notes: '', allocationType: 'project' });
    setShowAddExpense(false);
    triggerNotification('💸 تم تسجيل مصروف جديد وتثبيت القيد المالي في النظام!');
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

  const handleSaveEditExpense = (e) => {
    e.preventDefault();
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
    setEditingItemType(null);
    setEditingItemId(null);
    triggerNotification('✍️ تم تعديل المصروف وإعادة توزيع التكاليف الفعليه.');
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
      setExpenses(prev => prev.filter(item => item.id !== itemId));
      triggerNotification('💥 تم حذف المصروف وعكس الحركة المالية بنجاح! زاد صافي الربح بمقدار المبلغ المسترد.', 'warning');
    }
  };

  // Client Installments CRUD
  // Client Installments CRUD
  const handleAddInstallment = (e) => {
    e.preventDefault();
    if (newInstallment.amount <= 0) return;
    const newItem = {
      id: Date.now(),
      projectId: activeProjectId,
      amount: Number(newInstallment.amount),
      date: newInstallment.date,
      notes: newInstallment.notes,
      valuationId: newInstallment.valuationId || ''
    };

    // Auto-fill valuation reference to notes if selected
    if (newInstallment.valuationId) {
      const selectedVal = valuations.find(v => v.id === newInstallment.valuationId);
      if (selectedVal) {
        newItem.notes = newItem.notes || `سداد دفعة للمستخلص رقم ${selectedVal.claimNo}`;
      }
    }

    setInstallments([...installments, newItem]);
    setNewInstallment({ amount: 0, date: new Date().toISOString().split('T')[0], notes: '', valuationId: '' });
    setShowAddInstallment(false);
    triggerNotification('💳 تم قيد الدفعة المستلمة من العميل وربطها بالمستخلص بنجاح!');
  };

  // 🏗️ Progress Claim / Valuation Billing Actions
  const handleStartNewValuation = () => {
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
    setShowAddValuation(true);
  };

  // 📦 Contractor Valuation Line Helpers
  const newContractorLine = () => ({ id: Date.now() + Math.random(), boqItemId: '', contractorName: '', description: '', quantity: 1, unit: 'م٢', unitPrice: 0 });

  const addContractorLine = () => setContractorValuationLines(prev => [...prev, newContractorLine()]);

  const updateContractorLine = (lineId, field, value) =>
    setContractorValuationLines(prev => prev.map(l => l.id === lineId ? { ...l, [field]: value } : l));

  const removeContractorLine = (lineId) =>
    setContractorValuationLines(prev => prev.filter(l => l.id !== lineId));

  const handleStartContractorValuation = () => {
    setContractorValuationLines([newContractorLine()]);
    setContractorValuationDate(new Date().toISOString().split('T')[0]);
    setContractorValuationDiscount('');
    setContractorValuationTax('');
    setShowAddContractorValuation(true);
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
    const taxRate = valuationTax ? Number(valuationTax) / 100 : 0;
    const afterDiscount = totalClaimAmount - discountAmt;
    const taxAmt = afterDiscount * taxRate;
    const totalAfterAll = afterDiscount + taxAmt;

    const valuationId = `val-${Date.now()}`;
    const claimNo = `VAL-${activeProject?.name.slice(0, 3).replace(/\s+/g, '').toUpperCase()}-${currentValuations.length + 1}`;
    const invoiceNo = `INV-${claimNo}-${Date.now().toString().slice(-4)}`;

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
      taxRate: Number(valuationTax || 0),
      totalAfterDiscount: afterDiscount,
      taxAmount: taxAmt,
      totalFinal: totalAfterAll,
      status: 'issued'
    };

    try {
      await api.post('/dynamic/add/ledger', {
        date: valuationDate,
        account_name: 'عملاء عقود مقاولات - أرصدة مدينة',
        debit: Number((totalAfterAll).toFixed(2)),
        credit: 0,
        description: `فاتورة مستخلص إنجاز أعمال رقم ${claimNo} - للمشروع: ${activeProject?.name} - للعميل: ${activeProject?.clientName}`,
        cost_center: activeProject?.name,
        company: activeProject?.company || 'TED CAPITAL',
        company_id: activeProject?.company === 'PRIMEMED PHARMA' ? 4 : 1
      });
      await api.post('/dynamic/add/ledger', {
        date: valuationDate,
        account_name: 'إيرادات عقود مقاولات وإنشاءات',
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
          account_name: 'ضريبة القيمة المضافة',
          debit: 0,
          credit: Number(taxAmt.toFixed(2)),
          description: `ضريبة مستخلص رقم ${claimNo} (${valuationTax}%) - للمشروع: ${activeProject?.name}`,
          cost_center: activeProject?.name,
          company: activeProject?.company || 'TED CAPITAL',
          company_id: activeProject?.company === 'PRIMEMED PHARMA' ? 4 : 1
        });
      }
      triggerNotification(`🎉 تم اعتماد مستخلص العميل ${claimNo} بنجاح وقيد الفاتورة والقيود المحاسبية التلقائية بالكامل!`);
    } catch (err) {
      console.error('Failed to post ledger entries for valuation:', err);
      triggerNotification(`تم إصدار المستخلص ${claimNo} محلياً بنجاح!`, 'warning');
    }

    setValuations([...valuations, newValuation]);
    setShowAddValuation(false);
  };

  const handleAddContractorValuation = async (e) => {
    e.preventDefault();

    if (contractorValuationLines.length === 0) {
      alert('الرجاء إضافة سطر واحد على الأقل.');
      return;
    }

    let totalClaimAmount = 0;
    const linesList = contractorValuationLines.map(line => {
      const total = Number(line.quantity) * Number(line.unitPrice);
      totalClaimAmount += total;
      return {
        ...line,
        quantity: Number(line.quantity),
        unitPrice: Number(line.unitPrice),
        total
      };
    });

    if (totalClaimAmount <= 0) {
      alert('إجمالي قيمة المستخلص يجب أن تكون أكبر من صفر. تأكد من إدخال الكميات والأسعار بشكل صحيح.');
      return;
    }

    const discountAmt = contractorValuationDiscount ? Number(contractorValuationDiscount) : 0;
    const taxRate = contractorValuationTax ? Number(contractorValuationTax) / 100 : 0;
    const afterDiscount = totalClaimAmount - discountAmt;
    const taxAmt = afterDiscount * taxRate;
    const totalAfterAll = afterDiscount + taxAmt;

    const valuationId = `cval-${Date.now()}`;
    const claimNo = `CVAL-${activeProject?.name.slice(0, 3).replace(/\s+/g, '').toUpperCase()}-${currentValuations.length + 1}`;
    const invoiceNo = `CINV-${claimNo}-${Date.now().toString().slice(-4)}`;

    const newContractorVal = {
      id: valuationId,
      projectId: activeProjectId,
      claimNo,
      invoiceNo,
      date: contractorValuationDate,
      lines: linesList,
      totalCurrent: totalClaimAmount,
      discount: discountAmt,
      taxRate: Number(contractorValuationTax || 0),
      totalAfterDiscount: afterDiscount,
      taxAmount: taxAmt,
      totalFinal: totalAfterAll,
      isContractor: true,
      status: 'issued'
    };

    try {
      // Group ledger entries by contractor name for clarity
      const contractorGroups = {};
      linesList.forEach(l => {
        const key = l.contractorName || 'مقاول غير محدد';
        contractorGroups[key] = (contractorGroups[key] || 0) + l.total;
      });

      await api.post('/dynamic/add/ledger', {
        date: contractorValuationDate,
        account_name: 'مقاولون من الباطن - أرصدة دائنة',
        debit: 0,
        credit: Number(totalAfterAll.toFixed(2)),
        description: `مستخلص مقاول رقم ${claimNo} - ${Object.keys(contractorGroups).join(' / ')} - للمشروع: ${activeProject?.name}`,
        cost_center: activeProject?.name,
        company: activeProject?.company || 'TED CAPITAL',
        company_id: activeProject?.company === 'PRIMEMED PHARMA' ? 4 : 1
      });
      await api.post('/dynamic/add/ledger', {
        date: contractorValuationDate,
        account_name: 'تكلفة أعمال مقاولين',
        debit: Number(totalClaimAmount.toFixed(2)),
        credit: 0,
        description: `تكلفة مستخلص مقاول رقم ${claimNo} - للمشروع: ${activeProject?.name}`,
        cost_center: activeProject?.name,
        company: activeProject?.company || 'TED CAPITAL',
        company_id: activeProject?.company === 'PRIMEMED PHARMA' ? 4 : 1
      });
      if (taxAmt > 0) {
        await api.post('/dynamic/add/ledger', {
          date: contractorValuationDate,
          account_name: 'ضريبة القيمة المضافة - مدخلات',
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

    setValuations([...valuations, newContractorVal]);
    setShowAddContractorValuation(false);
  };

  const handleDeleteValuation = (valId) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا المستخلص نهائياً؟ سيتم إلغاء قيده وعكس تأثيراته المالية.')) return;
    setValuations(prev => prev.filter(v => v.id !== valId));
    // also clean up any payment links
    setInstallments(prev => prev.map(inst => {
      if (inst.valuationId === valId) {
        return { ...inst, valuationId: '' };
      }
      return inst;
    }));
    triggerNotification('💥 تم حذف مستخلص الإنجاز وعكس تأثيراته المالية بنجاح.', 'warning');
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

  return (
    <div className="bg-[#03060c] text-slate-100 min-h-screen p-4 sm:p-8 selection:bg-cyan-500 selection:text-slate-950 font-sans print:bg-white print:text-black relative overflow-hidden" dir="rtl">
      {/* Background Radial Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[350px] bg-gradient-to-b from-indigo-500/10 via-sky-500/5 to-transparent rounded-full blur-[140px] pointer-events-none no-print"></div>

      {/* Printable page layout adjustments */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @media print {
          body { background: white !important; color: black !important; font-family: 'Inter', sans-serif !important; font-size: 11px !important; }
          .no-print { display: none !important; }
          .print-full-width { width: 100% !important; max-width: 100% !important; padding: 0 !important; margin: 0 !important; }
          .print\:grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)) !important; }
          table { width: 100% !important; border-collapse: collapse !important; page-break-inside: auto !important; margin-top: 15px !important; }
          tr { page-break-inside: avoid !important; page-break-after: auto !important; }
          thead { display: table-header-group !important; }
          th { border: 1px solid #000 !important; padding: 10px 12px !important; background-color: #f8fafc !important; color: #0f172a !important; font-weight: bold !important; text-align: right !important; font-size: 12px !important; }
          th.text-center { text-align: center !important; }
          td { border: 1px solid #000 !important; padding: 10px 12px !important; color: #0f172a !important; font-size: 11px !important; vertical-align: top !important; }
          td.text-center { text-align: center !important; }
          .print\:text-black { color: #0f172a !important; }
          .print\:bg-transparent { background: transparent !important; }
          .print\:border-none { border: none !important; }
          .print\:shadow-none { box-shadow: none !important; }
          .print\:p-0 { padding: 0 !important; }
          .print\:p-4 { padding: 12px !important; }
          .print\:border-black { border-color: #0f172a !important; }
          .print\:border { border: 1px solid #0f172a !important; }
          .print\:rounded-xl { border-radius: 8px !important; }
          .print\:mb-6 { margin-bottom: 24px !important; }
          .print\:grid { display: grid !important; }
          .print\:gap-4 { gap: 16px !important; }
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
                onClick={() => setShowAddProject(!showAddProject)}
                className="bg-cyan-500/10 hover:bg-cyan-500/20 border border-slate-800 hover:border-cyan-500/40 text-cyan-400 text-[10px] font-black px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5"
              >
                <span>{showAddProject ? '✕ إغلاق' : '+ مشروع جديد'}</span>
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
            
            <div className="bg-[#1b2336] border border-slate-800 rounded-2xl p-4 min-w-[130px] flex flex-col justify-between h-24">
              <span className="text-[9px] font-black text-slate-450 uppercase tracking-wider">قيمة المقايسة</span>
              <div className="mt-1">
                <span className="text-base font-black font-mono text-cyan-400">{totals.totalBOQ.toLocaleString()}</span>
                <span className="text-[9px] text-slate-500 font-bold block">جنيه</span>
              </div>
            </div>

            <div className="bg-[#1b2336] border border-slate-800 rounded-2xl p-4 min-w-[130px] flex flex-col justify-between h-24">
              <span className="text-[9px] font-black text-slate-455 uppercase tracking-wider">المصروفات الفعلية</span>
              <div className="mt-1">
                <span className="text-base font-black font-mono text-rose-400">{totals.totalExpenses.toLocaleString()}</span>
                <span className="text-[9px] text-slate-500 font-bold block">جنيه</span>
              </div>
            </div>

            <div className="bg-[#1b2336] border border-slate-800 rounded-2xl p-4 min-w-[130px] flex flex-col justify-between h-24">
              <span className="text-[9px] font-black text-slate-450 uppercase tracking-wider">الربح المتوقع</span>
              <div className="mt-1">
                <span className="text-base font-black font-mono text-emerald-400">{totals.estProfit.toLocaleString()}</span>
                <span className="text-[9px] text-slate-500 font-bold block">جنيه</span>
              </div>
            </div>

            <div className="bg-[#1b2336] border border-slate-800 rounded-2xl p-4 min-w-[130px] flex flex-col justify-between h-24">
              <span className="text-[9px] font-black text-slate-455 uppercase tracking-wider">المحصل من العميل</span>
              <div className="mt-1">
                <span className="text-base font-black font-mono text-amber-400">{totals.totalCollected.toLocaleString()}</span>
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
              { id: 'direct_issue', label: 'صرف مخزني مباشر', icon: '🚚' },
              { id: 'direct_returns', label: 'مرتجع مباشر', icon: '🔄' },
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                <label className="text-[10px] text-slate-400 font-bold">اسم العميل المتعاقد</label>
                <input
                  type="text"
                  placeholder="مثال: الأستاذ محمد عبد الرحمن"
                  value={newProjectForm.clientName}
                  onChange={e => setNewProjectForm({ ...newProjectForm, clientName: e.target.value })}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  required
                />
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
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowAddProject(false)} className="px-5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-400">إلغاء</button>
              <button type="submit" className="px-6 py-2 bg-cyan-500 rounded-xl text-xs font-black text-white">تأسيس المشروع الآن 🏢</button>
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
                          <span className={`px-2 py-0.5 rounded text-[10px] ${usagePercent > 100 ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                            usagePercent > 70 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            }`}>
                            {usagePercent > 0 ? `${usagePercent.toFixed(0)}%` : 'بدون صرف'}
                          </span>
                        </div>
                      </div>

                      {/* Interactive Bar */}
                      <div className="w-full bg-[#070a13] h-3 rounded-full overflow-hidden p-0.5 border border-slate-800 relative">
                        <div
                          className={`h-full rounded-full transition-all duration-1000 ${usagePercent > 100 ? 'bg-gradient-to-l from-red-600 to-rose-400' :
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
                      <p className="text-slate-400 mt-1 leading-relaxed">إجمالي المحصل {totals.totalCollected.toLocaleString()} ج.م والمصروف الفعلي {totals.totalExpenses.toLocaleString()} ج.م. السيولة في وضع آمن بنسبة تغطية مريحة.</p>
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
                        <td className="px-6 py-5 text-center font-mono font-black text-cyan-400 print:text-black">{item.price.toLocaleString()} ج.م</td>
                        <td className="px-6 py-5 text-center font-mono font-black text-white text-sm print:text-black">{(item.quantity * item.price).toLocaleString()} ج.م</td>
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
                    <label className="text-[10px] text-slate-400 font-bold">التصنيف الهندسي للمصروف</label>
                    <select
                      value={editingItemId ? editForm.category : newExpense.category}
                      onChange={e => editingItemId ? setEditForm({ ...editForm, category: e.target.value }) : setNewExpense({ ...newExpense, category: e.target.value })}
                      className="bg-[#111827] border border-slate-800 focus:border-cyan-600 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none"
                    >
                      {boqCategories.map(c => <option key={c} value={c}>{c}</option>)}
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
                className="bg-[#111827] border border-slate-800 focus:border-cyan-600 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none w-full"
              >
                <option value="All">كل الفئات والتصنيفات</option>
                {boqCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              <div className="text-xs font-bold flex items-center justify-end text-slate-400">
                إجمالي المصاريف المصفاة: <span className="font-mono text-cyan-400 font-black text-sm mr-2 bg-cyan-500/10 border border-slate-850 px-3 py-1.5 rounded-xl">{filteredExpenses.reduce((acc, curr) => acc + curr.total, 0).toLocaleString()} ج.م</span>
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
                      <th className="px-6 py-5">التصنيف الهندسي</th>
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
                        <td className="px-6 py-5 text-center font-mono font-bold text-slate-400 print:text-black">{item.rate.toLocaleString()}</td>
                        <td className="px-6 py-5 text-center font-mono font-black text-rose-400 text-sm print:text-black">-{item.total.toLocaleString()} جنيه</td>
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
                <div className="text-xl font-black text-white font-mono">{totals.totalBOQ.toLocaleString()} <span className="text-xs">ج.م</span></div>
                <div className="text-[9px] text-slate-500 font-bold">مجموع بنود مقايسة البنود والكميات</div>
              </div>
              <div className="bg-[#131b2e] border border-slate-800 p-6 rounded-[2rem] shadow-2xl space-y-2 hover:scale-[1.02] transition-all duration-300">
                <span className="text-[10px] font-black text-cyan-400">إجمالي المستخلصات المعتمدة</span>
                <div className="text-xl font-black text-cyan-400 font-mono">
                  {totals.totalValuations.toLocaleString()} <span className="text-xs">ج.م</span>
                  <span className="mr-2 text-xs font-black px-1.5 py-0.5 rounded bg-cyan-500/10 border border-slate-850">{totals.valuationProgressPercent.toFixed(1)}%</span>
                </div>
                <div className="text-[9px] text-slate-500 font-bold">قيمة مستخلصات الإنجاز الصادرة</div>
              </div>
              <div className="bg-[#131b2e] border border-slate-800 p-6 rounded-[2rem] shadow-2xl space-y-2 hover:scale-[1.02] transition-all duration-300">
                <span className="text-[10px] font-black text-emerald-400">إجمالي التحصيلات الفعلية</span>
                <div className="text-xl font-black text-emerald-400 font-mono">
                  {totals.totalCollected.toLocaleString()} <span className="text-xs">ج.م</span>
                  <span className="mr-2 text-xs font-black px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">{totals.progressPercent.toFixed(1)}%</span>
                </div>
                <div className="text-[9px] text-slate-500 font-bold">المبالغ المقبوضة نقدياً وبنكياً</div>
              </div>
              <div className="bg-[#131b2e] border border-slate-800 p-6 rounded-[2rem] shadow-2xl space-y-2 hover:scale-[1.02] transition-all duration-300">
                <span className="text-[10px] font-black text-amber-400">مستخلصات غير مسددة / ذمم مدينة</span>
                <div className="text-xl font-black text-amber-400 font-mono">{(Math.max(0, totals.totalValuations - totals.totalCollected)).toLocaleString()} <span className="text-xs">ج.م</span></div>
                <div className="text-[9px] text-slate-500 font-bold">مستخلصات معتمدة بانتظار سداد العميل</div>
              </div>
            </div>

            {/* 4.2 Dynamic Progress Claims (Valuations) Wizard Modal / Section */}
            {showAddValuation && (
              <form onSubmit={handleAddValuation} className="bg-[#131b2e] border border-slate-800 p-8 rounded-[2rem] space-y-6 no-print animate-in slide-in-from-top duration-300 shadow-2xl">
                <div className="flex justify-between items-center pb-3 border-b border-slate-800">
                  <h4 className="text-sm font-black text-cyan-400 flex items-center gap-2">
                    <span className="p-1.5 bg-cyan-500/10 rounded-lg text-cyan-400">🏗️</span> إنشاء مستخلص إنجاز أعمال تراكمي جديد (حسب الكميات المنفذة)
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
                            <td className="p-3 text-center font-mono text-cyan-400">{item.price.toLocaleString()}</td>
                            <td className="p-3 text-center font-mono text-slate-400">{(item.quantity * item.price).toLocaleString()}</td>
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
                            <td className="p-3 text-center font-mono font-black text-emerald-400">{netClaimVal.toLocaleString(undefined,{maximumFractionDigits:0})} ج.م</td>
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
                    const taxRate = valuationTax ? Number(valuationTax) / 100 : 0;
                    const afterDiscount = gross - discountAmt;
                    const taxAmt = afterDiscount * taxRate;
                    const totalFinal = afterDiscount + taxAmt;
                    return (
                      <>
                        <div className="flex items-center justify-between flex-wrap gap-3">
                          <span className="text-xs font-bold text-slate-400">إجمالي صافي قيمة المستخلص المالي المقدر:</span>
                          <span className="font-mono text-lg font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-xl">{gross.toLocaleString(undefined,{maximumFractionDigits:0})} ج.م</span>
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
                            <span className="text-xs font-mono font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-xl">- {discountAmt.toLocaleString(undefined,{maximumFractionDigits:0})} ج.م ({discountRate}%)</span>
                          )}
                        </div>

                        {/* After Discount */}
                        {discountRate > 0 && (
                          <div className="flex items-center justify-between flex-wrap gap-3">
                            <span className="text-xs font-bold text-slate-400">الإجمالي بعد الخصم:</span>
                            <span className="font-mono text-base font-black text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-3 py-1 rounded-xl">{afterDiscount.toLocaleString(undefined,{maximumFractionDigits:0})} ج.م</span>
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
                          {taxAmt > 0 && (
                            <span className="text-xs font-mono font-black text-purple-400 bg-purple-500/10 border border-purple-500/20 px-3 py-1 rounded-xl">+ {taxAmt.toLocaleString()} ج.م ضريبة</span>
                          )}
                        </div>

                        {/* Final Total */}
                        {(discountRate > 0 || taxAmt > 0) && (
                          <div className="flex items-center justify-between flex-wrap gap-3 pt-3 border-t border-slate-700">
                            <span className="text-xs font-black text-white">🏆 الإجمالي النهائي بعد الخصم والضريبة:</span>
                            <span className="font-mono text-xl font-black text-emerald-300 bg-emerald-500/15 border border-emerald-400/30 px-4 py-1.5 rounded-xl">{totalFinal.toLocaleString(undefined,{maximumFractionDigits:0})} ج.م</span>
                          </div>
                        )}
                      </>
                    );
                  })()}

                  <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={() => setShowAddValuation(false)} className="px-5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-400 hover:text-white transition-all">إلغاء</button>
                    <button type="submit" className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-600 rounded-xl text-xs font-black text-slate-950 transition-all">اعتماد وتوليد الفاتورة 🏗️</button>
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
                    إنشاء مستخلص إنجاز أعمال تراكمي جديد (حسب الكميات المنفذة) للمقاول
                  </h4>
                  <div className="flex items-center gap-3">
                    <label className="text-xs text-slate-400 font-bold">تاريخ المستخلص:</label>
                    <input
                      type="date"
                      value={contractorValuationDate}
                      onChange={e => setContractorValuationDate(e.target.value)}
                      className="bg-[#111827] border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500"
                      required
                    />
                  </div>
                </div>

                {/* ═══ Dynamic Contractor Lines Table ═══ */}
                <div className="overflow-x-auto rounded-2xl border border-orange-500/20">
                  <table className="w-full text-right text-xs min-w-[900px]">
                    <thead className="bg-[#111827] text-slate-400 font-bold">
                      <tr>
                        <th className="p-3 text-right">البند المرتبط (BOQ)</th>
                        <th className="p-3 text-right">اسم المقاول</th>
                        <th className="p-3 text-right">وصف العمل</th>
                        <th className="p-3 text-center w-16">الوحدة</th>
                        <th className="p-3 text-center w-20">الكمية</th>
                        <th className="p-3 text-center w-28">سعر الوحدة ج.م</th>
                        <th className="p-3 text-center w-28">الإجمالي ج.م</th>
                        <th className="p-3 text-center w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {contractorValuationLines.map((line, idx) => {
                        const lineTotal = Number(line.quantity) * Number(line.unitPrice);
                        return (
                          <tr key={line.id} className="bg-slate-950/20 hover:bg-orange-500/[0.03] transition-colors">
                            {/* BOQ Item Selector */}
                            <td className="p-2">
                              <select
                                value={line.boqItemId}
                                onChange={e => updateContractorLine(line.id, 'boqItemId', e.target.value)}
                                className="bg-[#111827] border border-slate-700 focus:border-orange-500 rounded-xl px-2 py-1.5 text-[10px] text-white w-full focus:outline-none"
                              >
                                <option value="">— اختر البند —</option>
                                {currentBoqItems.map(item => (
                                  <option key={item.id} value={item.id}>
                                    [{item.category}] {item.item_name}
                                  </option>
                                ))}
                              </select>
                            </td>
                            {/* Contractor Name */}
                            <td className="p-2">
                              <input
                                type="text"
                                value={line.contractorName}
                                onChange={e => updateContractorLine(line.id, 'contractorName', e.target.value)}
                                placeholder="اسم المقاول..."
                                className="bg-[#111827] border border-slate-700 focus:border-orange-500 rounded-xl px-3 py-1.5 text-xs text-white w-full focus:outline-none"
                              />
                            </td>
                            {/* Description */}
                            <td className="p-2">
                              <input
                                type="text"
                                value={line.description}
                                onChange={e => updateContractorLine(line.id, 'description', e.target.value)}
                                placeholder="وصف نطاق العمل..."
                                className="bg-[#111827] border border-slate-700 focus:border-orange-500 rounded-xl px-3 py-1.5 text-xs text-white w-full focus:outline-none"
                              />
                            </td>
                            {/* Unit */}
                            <td className="p-2">
                              <select
                                value={line.unit}
                                onChange={e => updateContractorLine(line.id, 'unit', e.target.value)}
                                className="bg-[#111827] border border-slate-700 focus:border-orange-500 rounded-xl px-2 py-1.5 text-xs text-white w-full focus:outline-none"
                              >
                                {['م٢','م٣','م.ط','كجم','طن','عدد','بالمقطوعية','نقطة','طقم','يومية','ساعة'].map(u => (
                                  <option key={u} value={u}>{u}</option>
                                ))}
                              </select>
                            </td>
                            {/* Quantity */}
                            <td className="p-2">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={line.quantity}
                                onChange={e => updateContractorLine(line.id, 'quantity', e.target.value)}
                                className="bg-[#111827] border border-slate-700 focus:border-orange-500 rounded-xl px-2 py-1.5 text-xs text-white font-mono text-center w-full focus:outline-none"
                                required
                              />
                            </td>
                            {/* Unit Price */}
                            <td className="p-2">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={line.unitPrice}
                                onChange={e => updateContractorLine(line.id, 'unitPrice', e.target.value)}
                                className="bg-[#111827] border border-slate-700 focus:border-orange-500 rounded-xl px-2 py-1.5 text-xs text-white font-mono text-center w-full focus:outline-none"
                                required
                              />
                            </td>
                            {/* Line Total */}
                            <td className="p-2 text-center font-mono font-black text-emerald-400">
                              {lineTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </td>
                            {/* Delete */}
                            <td className="p-2 text-center">
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
                    const gross = contractorValuationLines.reduce((s, l) => s + (Number(l.quantity) * Number(l.unitPrice)), 0);
                    const discountAmt = contractorValuationDiscount ? Number(contractorValuationDiscount) : 0;
                    const taxRate = contractorValuationTax ? Number(contractorValuationTax) / 100 : 0;
                    const afterDiscount = gross - discountAmt;
                    const taxAmt = afterDiscount * taxRate;
                    const totalFinal = afterDiscount + taxAmt;
                    const clientGross = currentValuations.filter(v => !v.isContractor).reduce((s, v) => s + (v.totalCurrent || 0), 0);
                    const allContractorCost = currentValuations.filter(v => v.isContractor).reduce((s, v) => s + (v.totalCurrent || 0), 0);
                    const totalContractorWithNew = allContractorCost + gross;
                    const profitEstimate = clientGross - totalContractorWithNew;

                    return (
                      <>
                        {/* Profit comparison banner */}
                        {clientGross > 0 && (
                          <div className="grid grid-cols-3 gap-3 p-4 bg-slate-900/50 rounded-2xl border border-slate-700">
                            <div className="text-center">
                              <div className="text-[10px] text-cyan-400 font-bold mb-1">💰 إجمالي فواتير العميل</div>
                              <div className="font-mono font-black text-cyan-300 text-sm">{clientGross.toLocaleString(undefined, { maximumFractionDigits: 0 })} ج.م</div>
                            </div>
                            <div className="text-center border-x border-slate-700">
                              <div className="text-[10px] text-orange-400 font-bold mb-1">🏗️ إجمالي تكلفة مقاولين</div>
                              <div className="font-mono font-black text-orange-300 text-sm">{totalContractorWithNew.toLocaleString(undefined, { maximumFractionDigits: 0 })} ج.م</div>
                              <div className="text-[9px] text-slate-500 mt-0.5">({allContractorCost.toLocaleString(undefined,{maximumFractionDigits:0})} سابق + {gross.toLocaleString(undefined,{maximumFractionDigits:0})} حالي)</div>
                            </div>
                            <div className="text-center">
                              <div className="text-[10px] font-bold mb-1" style={{ color: profitEstimate >= 0 ? '#4ade80' : '#f87171' }}>
                                {profitEstimate >= 0 ? '📈 صافي الربح المتوقع' : '📉 خسارة متوقعة'}
                              </div>
                              <div className="font-mono font-black text-sm" style={{ color: profitEstimate >= 0 ? '#4ade80' : '#f87171' }}>
                                {profitEstimate.toLocaleString(undefined, { maximumFractionDigits: 0 })} ج.م
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between flex-wrap gap-3">
                          <span className="text-xs font-bold text-slate-400">إجمالي قيمة المستخلص:</span>
                          <span className="font-mono text-lg font-black text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-xl">{gross.toLocaleString(undefined, { maximumFractionDigits: 0 })} ج.م</span>
                        </div>

                        {/* Discount — fixed amount */}
                        <div className="flex items-center gap-3 flex-wrap">
                          <label className="text-xs text-slate-400 font-bold whitespace-nowrap">خصم مبلغ (ج.م) — اختياري:</label>
                          <input
                            type="number" min="0" step="0.01"
                            value={contractorValuationDiscount}
                            onChange={e => setContractorValuationDiscount(e.target.value)}
                            placeholder="0.00"
                            className="bg-[#111827] border border-slate-700 focus:border-amber-500 rounded-xl px-4 py-2 text-xs text-white font-mono focus:outline-none w-36"
                          />
                          {discountAmt > 0 && (
                            <span className="text-xs font-mono font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-xl">
                              - {discountAmt.toLocaleString(undefined, { maximumFractionDigits: 2 })} ج.م
                            </span>
                          )}
                        </div>

                        {discountAmt > 0 && (
                          <div className="flex items-center justify-between flex-wrap gap-3">
                            <span className="text-xs font-bold text-slate-400">الإجمالي بعد الخصم:</span>
                            <span className="font-mono text-base font-black text-orange-400 bg-orange-500/10 border border-orange-500/20 px-3 py-1 rounded-xl">
                              {afterDiscount.toLocaleString(undefined, { maximumFractionDigits: 0 })} ج.م
                            </span>
                          </div>
                        )}

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
                          {taxAmt > 0 && (
                            <span className="text-xs font-mono font-black text-purple-400 bg-purple-500/10 border border-purple-500/20 px-3 py-1 rounded-xl">
                              + {taxAmt.toLocaleString(undefined, { maximumFractionDigits: 0 })} ج.م ضريبة
                            </span>
                          )}
                        </div>

                        {(discountRate > 0 || taxAmt > 0) && (
                          <div className="flex items-center justify-between flex-wrap gap-3 pt-3 border-t border-orange-500/20">
                            <span className="text-xs font-black text-white">🏆 الإجمالي النهائي بعد الخصم والضريبة:</span>
                            <span className="font-mono text-xl font-black text-orange-300 bg-orange-500/15 border border-orange-400/30 px-4 py-1.5 rounded-xl">
                              {totalFinal.toLocaleString(undefined, { maximumFractionDigits: 0 })} ج.م
                            </span>
                          </div>
                        )}
                      </>
                    );
                  })()}

                  <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={() => setShowAddContractorValuation(false)} className="px-5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-400 hover:text-white transition-all">إلغاء</button>
                    <button type="submit" className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 rounded-xl text-xs font-black text-white transition-all">اعتماد مستخلص المقاول 🏗️</button>
                  </div>
                </div>

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
                          const it = v.items?.find(i => i.boqItemId === item.id);
                          return s + (it ? it.currentAmount : 0);
                        }, 0);
                      const clientBilledPct = boqValue > 0 ? Math.min(100, (clientBilledAmt / boqValue) * 100) : 0;

                      // Total contractor cost for this item (from contractor lines linked to this boqItemId)
                      const contractorCost = currentValuations
                        .filter(v => v.isContractor && v.lines)
                        .reduce((s, v) => {
                          return s + v.lines.filter(l => l.boqItemId === item.id).reduce((a, l) => a + (l.total || 0), 0);
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
                            <div className="font-mono text-white">{totalBoq.toLocaleString(undefined,{maximumFractionDigits:0})} ج.م</div>
                          </div>
                          <div className="bg-cyan-500/10 rounded-xl p-2.5 border border-cyan-500/20">
                            <div className="text-cyan-400 mb-1">مُستخلص للعميل</div>
                            <div className="font-mono text-cyan-300">{totalBilled.toLocaleString(undefined,{maximumFractionDigits:0})} ج.م</div>
                            <div className="text-[9px] text-slate-400">{totalBoq > 0 ? ((totalBilled/totalBoq)*100).toFixed(1) : 0}%</div>
                          </div>
                          <div className="bg-orange-500/10 rounded-xl p-2.5 border border-orange-500/20">
                            <div className="text-orange-400 mb-1">تكلفة مقاولين</div>
                            <div className="font-mono text-orange-300">{totalContractor.toLocaleString(undefined,{maximumFractionDigits:0})} ج.م</div>
                          </div>
                          <div className={`rounded-xl p-2.5 border ${totalProfit >= 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20'}`}>
                            <div className={`mb-1 ${totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{totalProfit >= 0 ? '📈 ربح' : '📉 خسارة'}</div>
                            <div className={`font-mono font-black ${totalProfit >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{totalProfit.toLocaleString(undefined,{maximumFractionDigits:0})} ج.م</div>
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
                                  <td className="p-2.5 text-center font-mono text-slate-300">{boqValue.toLocaleString(undefined,{maximumFractionDigits:0})}</td>
                                  <td className="p-2.5 text-center font-mono text-cyan-400 font-bold">{clientBilledAmt.toLocaleString(undefined,{maximumFractionDigits:0})}</td>
                                  <td className="p-2.5 text-center">
                                    <div className="flex items-center gap-1.5 justify-center">
                                      <div className="flex-1 bg-slate-800 rounded-full h-1.5 max-w-[50px]">
                                        <div className="h-1.5 rounded-full bg-cyan-500" style={{ width: `${clientBilledPct}%` }} />
                                      </div>
                                      <span className="font-mono font-black text-cyan-400">{clientBilledPct.toFixed(1)}%</span>
                                    </div>
                                  </td>
                                  <td className="p-2.5 text-center font-mono text-orange-400">{contractorCost.toLocaleString(undefined,{maximumFractionDigits:0})}</td>
                                  <td className="p-2.5 text-center font-mono font-black" style={{ color: profit >= 0 ? '#4ade80' : '#f87171' }}>
                                    {profit >= 0 ? '+' : ''}{profit.toLocaleString(undefined,{maximumFractionDigits:0})}
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
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-black text-cyan-400">{val.claimNo}</span>
                              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-black border border-emerald-500/20">فاتورة رقم: {val.invoiceNo}</span>
                              {/* ✨ Badge: client or contractor */}
                              {val.isContractor
                                ? <span className="px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-400 text-[10px] font-black border border-orange-500/30">🏗️ مستخلص مقاول</span>
                                : <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 text-[10px] font-black border border-cyan-500/30">💰 مستخلص عميل</span>
                              }
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
                                <div className="text-[9px] text-cyan-400 font-bold mt-0.5">شامل القيمة المضافة ({val.taxRate}%): {val.totalFinal?.toLocaleString() || (val.totalCurrent * (1 + val.taxRate / 100)).toLocaleString()} ج.م</div>
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
                              <div className="overflow-x-auto rounded-xl border border-orange-500/20 bg-slate-950/20">
                                <table className="w-full text-right text-[10px]">
                                  <thead className="bg-[#070a13] text-slate-400 font-bold">
                                    <tr>
                                      <th className="p-2.5">البند المرتبط</th>
                                      <th className="p-2.5">اسم المقاول</th>
                                      <th className="p-2.5">وصف العمل</th>
                                      <th className="p-2.5 text-center">الوحدة</th>
                                      <th className="p-2.5 text-center">الكمية</th>
                                      <th className="p-2.5 text-center">سعر الوحدة</th>
                                      <th className="p-2.5 text-center">الإجمالي</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-white/5">
                                    {val.lines.map((ln, li) => {
                                      const linkedBoq = boqItems.find(b => b.id === ln.boqItemId);
                                      return (
                                        <tr key={li} className="hover:bg-white/5 text-slate-300">
                                          <td className="p-2.5 text-slate-400 text-[9px]">{linkedBoq ? `[${linkedBoq.category}] ${linkedBoq.item_name}` : 'غير مرتبط'}</td>
                                          <td className="p-2.5 font-bold text-orange-400">{ln.contractorName || '—'}</td>
                                          <td className="p-2.5 text-slate-400">{ln.description || '—'}</td>
                                          <td className="p-2.5 text-center font-mono">{ln.unit}</td>
                                          <td className="p-2.5 text-center font-mono">{ln.quantity}</td>
                                          <td className="p-2.5 text-center font-mono">{Number(ln.unitPrice).toLocaleString()}</td>
                                          <td className="p-2.5 text-center font-mono font-black text-emerald-400">{Number(ln.total).toLocaleString()} ج.م</td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
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
                                      const boqItem = boqItems.find(b => b.id === it.boqItemId);
                                      if (!boqItem) return null;
                                      const prevPercent = it.completionPercent - it.netPercent;
                                      if (it.netPercent <= 0) return null;
                                      return (
                                        <tr key={it.boqItemId} className="hover:bg-white/5 text-slate-300">
                                          <td className="p-2.5 font-bold">{boqItem.item_name}<div className="text-[8px] text-slate-500">{boqItem.category}</div></td>
                                          <td className="p-2.5 text-center font-mono text-slate-400">{boqItem.unit}</td>
                                          <td className="p-2.5 text-center font-mono">{boqItem.price.toLocaleString()}</td>
                                          <td className="p-2.5 text-center font-mono text-amber-500/80">{prevPercent.toFixed(1)}%</td>
                                          <td className="p-2.5 text-center font-mono text-cyan-400 font-bold">{it.completionPercent.toFixed(1)}%</td>
                                          <td className="p-2.5 text-center font-mono text-emerald-400 font-bold">+{it.netPercent.toFixed(1)}%</td>
                                          <td className="p-2.5 text-center font-mono text-emerald-400 font-black">{it.currentAmount.toLocaleString()} ج.م</td>
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
                              <span className="text-[10px] text-slate-500 font-mono block">{inst.date}</span>
                            </div>

                            <div className="flex items-center gap-4">
                              <div className="flex items-baseline gap-1 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-xl text-emerald-400 font-black">
                                <span className="text-lg font-black font-mono tracking-tighter">+{inst.amount.toLocaleString()}</span>
                                <span className="text-[10px] font-bold">جنيه</span>
                              </div>
                              <div className="flex flex-col gap-1.5 no-print">
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
                <div className="bg-[#131b2e] border border-slate-800 p-6 rounded-[2rem] shadow-2xl space-y-4">
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <span className="p-1.5 bg-emerald-500/10 rounded-lg text-emerald-455">💰</span> تسجيل تحصيل دفعة جديدة وتسويتها
                  </h3>

                  <form onSubmit={handleAddInstallment} className="space-y-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-slate-400 font-bold">المبلغ المستلم (جنيه)</label>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={newInstallment.amount}
                        onChange={e => setNewInstallment({ ...newInstallment, amount: e.target.value })}
                        className="bg-[#111827] border border-slate-800 focus:border-cyan-600 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none w-full"
                        required
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-slate-400 font-bold">ربط الدفعة بمستخلص معين (اختياري)</label>
                      <select
                        value={newInstallment.valuationId}
                        onChange={e => setNewInstallment({ ...newInstallment, valuationId: e.target.value })}
                        className="bg-[#111827] border border-slate-800 focus:border-cyan-600 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none w-full"
                      >
                        <option value="">-- تحصيل دفعة عامة (غير مرتبطة بمستخلص) --</option>
                        {currentValuations.map(val => (
                          <option key={val.id} value={val.id}>
                            {val.claimNo} (غير مسدد: {((val.totalCurrent * 1.14) - currentInstallments.filter(i => i.valuationId === val.id).reduce((acc, curr) => acc + curr.amount, 0)).toLocaleString()} ج.م)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-slate-400 font-bold">تاريخ استلام الدفعة</label>
                      <input
                        type="date"
                        value={newInstallment.date}
                        onChange={e => setNewInstallment({ ...newInstallment, date: e.target.value })}
                        className="bg-[#111827] border border-slate-800 focus:border-cyan-600 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none w-full"
                        required
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] text-slate-400 font-bold">البيان الهندسي / ملاحظات</label>
                      <input
                        type="text"
                        placeholder="مثال: دفعة تحت حساب التشطيبات..."
                        value={newInstallment.notes}
                        onChange={e => setNewInstallment({ ...newInstallment, notes: e.target.value })}
                        className="bg-[#111827] border border-slate-800 focus:border-cyan-600 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none w-full"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 rounded-xl text-xs font-black transition-all active:scale-95"
                    >
                      تسجيل وقيد الدفعة بنجاح 🟢
                    </button>
                  </form>
                </div>

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
                    محصل <span className="font-mono text-cyan-400 font-black">{totals.totalCollected.toLocaleString()}</span> ج.م من عقد بقيمة <span className="font-mono text-white font-black">{totals.totalBOQ.toLocaleString()}</span> ج.م.
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

        {/* 5.1 DIRECT STOCK ISSUE VIEW */}
        {activeTab === 'direct_issue' && (
          <div className="animate-in slide-in-from-bottom duration-500">
            <DirectStockIssue defaultTab="issue" embedded={true} projectId={activeProjectId} />
          </div>
        )}

        {/* 5.2 DIRECT RETURNS VIEW */}
        {activeTab === 'direct_returns' && (
          <div className="animate-in slide-in-from-bottom duration-500">
            <DirectStockIssue defaultTab="return" embedded={true} projectId={activeProjectId} />
          </div>
        )}

      </div>

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
                    <h1 className="text-xl font-black tracking-tight text-slate-900">{activeProject?.company || 'TED CAPITAL'}</h1>
                    <p className="text-[10px] text-slate-500 font-bold">لإدارة المشاريع والاستشارات الهندسية والمقاولات</p>
                    <p className="text-[9px] text-slate-400 font-mono">القاهرة الجديدة - التجمع الخامس - مصر</p>
                  </div>
                  <div className="text-left space-y-1">
                    <h2 className="text-lg font-black text-slate-900">فاتورة مستخلص إنجاز أعمال</h2>
                    <div className="text-[10px] font-mono font-bold text-slate-600">
                      <div>رقم الفاتورة: <span className="text-slate-900 font-black">{selectedPrintValuation.invoiceNo}</span></div>
                      <div>رقم المستخلص: <span className="text-cyan-600 font-black">{selectedPrintValuation.claimNo}</span></div>
                      <div>التاريخ: <span className="text-slate-900 font-black">{selectedPrintValuation.date}</span></div>
                    </div>
                  </div>
                </div>

                {/* Bill To & Project Details */}
                <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl text-[11px] border border-slate-100">
                  <div className="space-y-1">
                    <div className="text-slate-400 font-bold">العميل الكريم:</div>
                    <div className="font-black text-slate-900 text-sm">{activeProject?.clientName}</div>
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
                        const boqItem = boqItems.find(b => b.id === it.boqItemId);
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
                            <td className="p-2 border border-slate-200 text-center font-mono">{boqItem.price.toLocaleString()}</td>
                            <td className="p-2 border border-slate-200 text-center font-mono">{totalQty}</td>
                            <td className="p-2 border border-slate-200 text-center font-mono text-slate-500">{prevQty}</td>
                            <td className="p-2 border border-slate-200 text-center font-mono text-slate-800">{currQty}</td>
                            <td className="p-2 border border-slate-200 text-center font-mono text-cyan-750">+{netQty}</td>
                            <td className="p-2 border border-slate-200 text-center font-mono text-slate-900">{it.currentAmount.toLocaleString()} ج.م</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Calculation breakdown */}
                <div className="flex justify-end">
                  <div className="w-80 text-[11px] font-bold space-y-2 border-t-2 border-slate-950 pt-3">
                    <div className="flex justify-between">
                      <span>إجمالي الأعمال المعتمدة للفترة:</span>
                      <span className="font-mono">{selectedPrintValuation.totalCurrent.toLocaleString()} ج.م</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>ضريبة القيمة المضافة (14%):</span>
                      <span className="font-mono">{(selectedPrintValuation.totalCurrent * 0.14).toLocaleString()} ج.م</span>
                    </div>
                    <div className="flex justify-between text-sm font-black border-t border-slate-200 pt-2 text-slate-950">
                      <span>إجمالي القيمة المستحقة شامل الضريبة:</span>
                      <span className="font-mono">{(selectedPrintValuation.totalCurrent * 1.14).toLocaleString()} ج.م</span>
                    </div>
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
        <div className="hidden print:block print-full-width text-slate-900 bg-white p-8 font-sans" dir="rtl">
          <div className="space-y-6">

            {/* Invoice Header */}
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-5">
              <div className="space-y-1">
                <h1 className="text-xl font-black tracking-tight text-slate-900">{activeProject?.company || 'TED CAPITAL'}</h1>
                <p className="text-[10px] text-slate-500 font-bold">لإدارة المشاريع والاستشارات الهندسية والمقاولات</p>
                <p className="text-[9px] text-slate-400 font-mono">القاهرة الجديدة - التجمع الخامس - مصر</p>
              </div>
              <div className="text-left space-y-1">
                <h2 className="text-lg font-black text-slate-900">فاتورة مستخلص إنجاز أعمال</h2>
                <div className="text-[10px] font-mono font-bold text-slate-600">
                  <div>رقم الفاتورة: <span className="text-slate-900 font-black">{selectedPrintValuation.invoiceNo}</span></div>
                  <div>رقم المستخلص: <span className="text-cyan-600 font-black">{selectedPrintValuation.claimNo}</span></div>
                  <div>التاريخ: <span className="text-slate-900 font-black">{selectedPrintValuation.date}</span></div>
                </div>
              </div>
            </div>

            {/* Bill To & Project Details */}
            <div className="grid grid-cols-2 gap-6 bg-slate-50 p-4 rounded-xl text-[11px] border border-slate-100">
              <div className="space-y-1">
                <div className="text-slate-400 font-bold">العميل الكريم:</div>
                <div className="font-black text-slate-900 text-sm">{activeProject?.clientName}</div>
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
                    const boqItem = boqItems.find(b => b.id === it.boqItemId);
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
                        <td className="p-2 border border-slate-200 text-center font-mono">{boqItem.price.toLocaleString()}</td>
                        <td className="p-2 border border-slate-200 text-center font-mono">{totalQty}</td>
                        <td className="p-2 border border-slate-200 text-center font-mono text-slate-500">{prevQty}</td>
                        <td className="p-2 border border-slate-200 text-center font-mono text-slate-800">{currQty}</td>
                        <td className="p-2 border border-slate-200 text-center font-mono text-cyan-750">+{netQty}</td>
                        <td className="p-2 border border-slate-200 text-center font-mono text-slate-900">{it.currentAmount.toLocaleString()} ج.م</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Calculation breakdown */}
            <div className="flex justify-end">
              <div className="w-80 text-[11px] font-bold space-y-2 border-t-2 border-slate-950 pt-3">
                <div className="flex justify-between">
                  <span>إجمالي الأعمال المعتمدة للفترة:</span>
                  <span className="font-mono">{selectedPrintValuation.totalCurrent.toLocaleString()} ج.م</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>ضريبة القيمة المضافة (14%):</span>
                  <span className="font-mono">{(selectedPrintValuation.totalCurrent * 0.14).toLocaleString()} ج.م</span>
                </div>
                <div className="flex justify-between text-sm font-black border-t border-slate-200 pt-2 text-slate-950">
                  <span>إجمالي القيمة المستحقة شامل الضريبة:</span>
                  <span className="font-mono">{(selectedPrintValuation.totalCurrent * 1.14).toLocaleString()} ج.م</span>
                </div>
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
    </div>
  );
}

