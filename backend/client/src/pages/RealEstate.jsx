import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

export default function RealEstate() {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState('projects');
  const [loading, setLoading] = useState(true);

  // States
  const [projects, setProjects] = useState([]);
  const [mainProjects, setMainProjects] = useState([]);
  const [units, setUnits] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [installments, setInstallments] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [customers, setCustomers] = useState([]);

  // New: Cost + Rental States
  const [selectedCostProject, setSelectedCostProject] = useState('');
  const [projectCosts, setProjectCosts] = useState([]);
  const [costSummary, setCostSummary] = useState([]);
  const [grandTotal, setGrandTotal] = useState(0);
  const [unitCosts, setUnitCosts] = useState([]);
  const [rentalContracts, setRentalContracts] = useState([]);
  const [rentalInvoices, setRentalInvoices] = useState([]);
  const [costForm, setCostForm] = useState({ project_id: '', cost_category: 'أرض', description: '', amount: '', supplier: '', invoice_ref: '', cost_date: new Date().toISOString().split('T')[0] });
  const [rentalForm, setRentalForm] = useState({ project_id: '', unit_id: '', tenant_name: '', tenant_phone: '', monthly_rent: '', annual_increment_pct: 10, security_deposit: '', deposit_paid: false, start_date: '', end_date: '', payment_day: 1, notes: '' });
  const [isCostFormOpen, setIsCostFormOpen] = useState(false);
  const [isRentalFormOpen, setIsRentalFormOpen] = useState(false);
  const [allocating, setAllocating] = useState(false);
  const [targetMargin, setTargetMargin] = useState(30);


  // Modals
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [editingUnit, setEditingUnit] = useState(null);
  const [editingContract, setEditingContract] = useState(null);
  const [editingInstallment, setEditingInstallment] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');

  // Forms
  const [projectForm, setProjectForm] = useState({ name: '', type: 'Building', location: '', total_units: '' });
  const [unitForm, setUnitForm] = useState({ project_id: '', unit_number: '', type: 'Apartment', area: '', floor: '', price: '' });
  const [contractForm, setContractForm] = useState({ 
    unit_id: '', customer_id: '', total_price: '', 
    down_payment: '', installment_years: '', contract_date: new Date().toISOString().split('T')[0],
    salesperson_id: '', commission_rate: '', frequency: 'Monthly'
  });
  const [payForm, setPayForm] = useState({ installment_id: '', paymentAmount: '', payment_method: 'Cash', reference_no: '' });
  const [selectedInst, setSelectedInst] = useState(null);

  // Translations
  const t = {
    ar: {
      title: 'إدارة الأصول والمبيعات العقارية',
      subtitle: 'النظام المركزي لمتابعة المشاريع والوحدات وعقود المبيعات',
      projects: 'المشاريع',
      units: 'الوحدات',
      sales: 'المبيعات',
      collection: 'التحصيل',
      salesPortfolio: 'محفظة المبيعات',
      occupancyRate: 'نسبة الإشغال',
      collectionEfficiency: 'كفاءة التحصيل',
      inventoryValue: 'قيمة المخزون المتاح',
      collected: 'المحصل',
      pending: 'المتبقي',
      unitsSold: 'تم بيع {sold} وحدة من {total}',
      unitsAvailable: '{count} وحدة متاحة للبيع حالياً',
      searchPlaceholder: 'ابحث عن مشروع، وحدة، أو عميل...',
      allTypes: 'جميع الأنواع',
      buildings: 'مباني',
      compounds: 'كمبوندات',
      malls: 'مولات',
      reset: 'إعادة تعيين',
      projectRegistry: 'سجل المشاريع العقارية',
      projectSubtitle: 'قائمة المشاريع العقارية والمجمعات السكنية',
      addNewProject: 'إضافة مشروع جديد',
      editProject: 'تعديل مشروع',
      location: 'الموقع',
      unitCount: 'الوحدات',
      edit: 'تعديل',
      delete: 'حذف',
      available: 'متاح',
      sold: 'مباع',
      addUnit: 'إضافة وحدة',
      editUnit: 'تعديل وحدة',
      salesRegistry: 'سجل المبيعات والعقود',
      salesSubtitle: 'إدارة عقود الوحدات والمبيعات العقارية',
      newContract: 'عقد جديد',
      contract: 'العقد',
      customer: 'العميل',
      unit: 'الوحدة',
      totalPrice: 'القيمة الإجمالية',
      date: 'تاريخ التعاقد',
      actions: 'إجراءات',
      totalCollected: 'إجمالي المحصل',
      currentReceivables: 'المستحقات الحالية',
      transactions: 'عدد العمليات',
      dueDate: 'تاريخ الاستحقاق',
      status: 'الحالة',
      amount: 'المبلغ',
      collect: 'تحصيل',
      paid: 'تم التحصيل',
      waiting: 'انتظار',
      centralProject: 'اسم المشروع المركزي',
      type: 'النوع',
      building: 'مبنى',
      compound: 'كمبوند',
      mall: 'مول',
      saveProject: 'حفظ بيانات المشروع',
      collectInstallment: 'تحصيل قسط عقاري',
      paymentProcess: 'معالجة الدفع',
      dueAmount: 'المبلغ المطلوب',
      paymentMethod: 'طريقة السداد',
      cash: 'كاش',
      bankDeposit: 'إيداع بنكي',
      transfer: 'تحويل',
      wallet: 'محفظة العميل 💳',
      referenceNo: 'مرجع العملية',
      refPlaceholder: 'رقم الشيك أو الحوالة',
      confirmCollection: 'تأكيد التحصيل',
      unitNumber: 'رقم الوحدة',
      area: 'المساحة',
      floor: 'الدور',
      price: 'السعر',
      saveUnit: 'حفظ بيانات الوحدة',
      createContract: 'إنشاء عقد مبيعات جديد',
      contractWizard: 'مساعد إنشاء العقود',
      selectedUnit: 'الوحدة المختارة',
      downPayment: 'الدفعة المقدمة',
      installmentYears: 'سنوات التقسيط',
      frequency: 'دورية السداد',
      monthly: 'شهري',
      quarterly: 'ربع سنوي',
      semiAnnual: 'نصف سنوي',
      annual: 'سنوي',
      saveContract: 'تثبيت العقد وتوليد الأقساط',
      loading: 'جاري التحميل...',
      noUnitsFound: 'لم يتم العثور على وحدات تطابق البحث',
      confirmDelete: 'هل أنت متأكد من الحذف؟',
      error: 'خطأ',
      vsLastMonth: 'عن الشهر السابق'
    },
    en: {
      title: 'Real Estate Asset Management',
      subtitle: 'Central system for tracking projects, units, and sales contracts',
      projects: 'Projects',
      units: 'Units',
      sales: 'Sales',
      collection: 'Collection',
      salesPortfolio: 'Sales Portfolio',
      occupancyRate: 'Occupancy Rate',
      collectionEfficiency: 'Collection Efficiency',
      inventoryValue: 'Inventory Value',
      collected: 'Collected',
      pending: 'Pending',
      unitsSold: '{sold} units sold out of {total}',
      unitsAvailable: '{count} units currently available',
      searchPlaceholder: 'Search for project, unit, or customer...',
      allTypes: 'All Types',
      buildings: 'Buildings',
      compounds: 'Compounds',
      malls: 'Malls',
      reset: 'Reset',
      projectRegistry: 'Real Estate Project Registry',
      projectSubtitle: 'List of real estate projects and housing complexes',
      addNewProject: 'Add New Project',
      editProject: 'Edit Project',
      location: 'Location',
      unitCount: 'Units',
      edit: 'Edit',
      delete: 'Delete',
      available: 'Available',
      sold: 'Sold',
      addUnit: 'Add Unit',
      editUnit: 'Edit Unit',
      salesRegistry: 'Sales & Contracts Registry',
      salesSubtitle: 'Manage unit contracts and real estate sales',
      newContract: 'New Contract',
      contract: 'Contract',
      customer: 'Customer',
      unit: 'Unit',
      totalPrice: 'Total Price',
      date: 'Contract Date',
      actions: 'Actions',
      totalCollected: 'Total Collected',
      currentReceivables: 'Current Receivables',
      transactions: 'Transactions',
      dueDate: 'Due Date',
      status: 'Status',
      amount: 'Amount',
      collect: 'Collect',
      paid: 'Paid',
      waiting: 'Pending',
      centralProject: 'Central Project Name',
      type: 'Type',
      building: 'Building',
      compound: 'Compound',
      mall: 'Mall',
      saveProject: 'Save Project Data',
      collectInstallment: 'Collect Installment',
      paymentProcess: 'Payment Process',
      dueAmount: 'Due Amount',
      paymentMethod: 'Payment Method',
      cash: 'Cash',
      bankDeposit: 'Bank Deposit',
      transfer: 'Transfer',
      wallet: 'Customer Wallet 💳',
      referenceNo: 'Reference No.',
      refPlaceholder: 'Check or Transfer No.',
      confirmCollection: 'Confirm Collection',
      unitNumber: 'Unit Number',
      area: 'Area',
      floor: 'Floor',
      price: 'Price',
      saveUnit: 'Save Unit Data',
      createContract: 'Create New Sales Contract',
      contractWizard: 'Contract Creation Wizard',
      selectedUnit: 'Selected Unit',
      downPayment: 'Down Payment',
      installmentYears: 'Installment Years',
      frequency: 'Frequency',
      monthly: 'Monthly',
      quarterly: 'Quarterly',
      semiAnnual: 'Semi-Annual',
      annual: 'Annual',
      saveContract: 'Save Contract & Generate Installments',
      loading: 'Loading...',
      noUnitsFound: 'No units found matching search.',
      confirmDelete: 'Are you sure you want to delete?',
      error: 'Error',
      vsLastMonth: 'vs last month'
    }
  };

  const cur = t[language] || t.ar;

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [projRes, mainProjRes, unitRes, contRes, instRes, staffRes, custRes, dropdownsRes] = await Promise.all([
        api.get('/table/real_estate_projects?limit=5000').catch(() => ({ data: { data: [] } })),
        api.get('/table/projects?limit=5000').catch(() => ({ data: { data: [] } })),
        api.get('/table/real_estate_units?limit=5000').catch(() => ({ data: { data: [] } })),
        api.get('/table/real_estate_contracts?limit=5000').catch(() => ({ data: { data: [] } })),
        api.get('/table/real_estate_installments?limit=5000').catch(() => ({ data: { data: [] } })),
        api.get('/table/staff?limit=1000').catch(() => ({ data: { data: [] } })),
        api.get('/table/customers?limit=5000').catch(() => ({ data: { data: [] } })),
        api.get('/dropdowns').catch(() => ({ data: { projects_dd: [] } }))
      ]);

      const activeComp = localStorage.getItem('active_company') || '';
      const activeLower = activeComp.toLowerCase();

      let dbRealEstateProjects = projRes.data?.data || projRes.data || [];
      if (activeComp && !['all', 'كل الشركات', 'all companies'].includes(activeLower)) {
        dbRealEstateProjects = dbRealEstateProjects.filter(p => {
          const projCompLower = (p.company || '').toLowerCase();
          if (activeLower.includes('ted') && projCompLower.includes('ted')) return true;
          if (activeLower.includes('design') && projCompLower.includes('design')) return true;
          if (activeLower.includes('master') && projCompLower.includes('master')) return true;
          if (activeLower.includes('prime') && (projCompLower.includes('prime') || projCompLower.includes('pharma'))) return true;
          return projCompLower.includes(activeLower) || activeLower.includes(projCompLower);
        });
      }
      setProjects(dbRealEstateProjects);
      
      const mProj = mainProjRes.data?.data || mainProjRes.data || [];
      const ddProj = dropdownsRes.data?.projects_dd || [];
      const combinedProjects = [...mProj, ...ddProj];
      const uniqueProjects = Array.from(new Map(combinedProjects.map(item => [item.name, item])).values());
      
      // Filter mainProjects by active company as well
      const filteredMainProjects = uniqueProjects.filter(p => {
        if (!activeComp || ['all', 'كل الشركات', 'all companies'].includes(activeLower)) return true;
        const projCompLower = (p.company || '').toLowerCase();
        if (activeLower.includes('ted') && projCompLower.includes('ted')) return true;
        if (activeLower.includes('design') && projCompLower.includes('design')) return true;
        if (activeLower.includes('master') && projCompLower.includes('master')) return true;
        if (activeLower.includes('prime') && (projCompLower.includes('prime') || projCompLower.includes('pharma'))) return true;
        return projCompLower.includes(activeLower) || activeLower.includes(projCompLower);
      });
      setMainProjects(filteredMainProjects);

      const resolvedProjectIds = new Set(dbRealEstateProjects.map(p => Number(p.id)));

      let dbUnits = unitRes.data?.data || unitRes.data || [];
      if (activeComp && !['all', 'كل الشركات', 'all companies'].includes(activeLower)) {
        dbUnits = dbUnits.filter(u => resolvedProjectIds.has(Number(u.project_id)));
      }
      setUnits(dbUnits);

      let dbContracts = contRes.data?.data || contRes.data || [];
      const resolvedUnitIds = new Set(dbUnits.map(u => Number(u.id)));
      if (activeComp && !['all', 'كل الشركات', 'all companies'].includes(activeLower)) {
        dbContracts = dbContracts.filter(c => resolvedUnitIds.has(Number(c.unit_id)));
      }
      setContracts(dbContracts);

      let dbInstallments = instRes.data?.data || instRes.data || [];
      const resolvedContractIds = new Set(dbContracts.map(c => Number(c.id)));
      if (activeComp && !['all', 'كل الشركات', 'all companies'].includes(activeLower)) {
        dbInstallments = dbInstallments.filter(i => resolvedContractIds.has(Number(i.contract_id)));
      }
      setInstallments(dbInstallments);

      setStaffList(staffRes.data?.data || staffRes.data || []);
      
      let dbCustomers = custRes.data?.data || custRes.data || [];
      if (activeComp && !['all', 'كل الشركات', 'all companies'].includes(activeLower)) {
        dbCustomers = dbCustomers.filter(c => {
          const cCompLower = (c.company_name || c.company || '').toLowerCase();
          if (activeLower.includes('ted') && cCompLower.includes('ted')) return true;
          if (activeLower.includes('design') && cCompLower.includes('design')) return true;
          if (activeLower.includes('master') && cCompLower.includes('master')) return true;
          if (activeLower.includes('prime') && (cCompLower.includes('prime') || cCompLower.includes('pharma'))) return true;
          return cCompLower.includes(activeLower) || activeLower.includes(cCompLower) || !cCompLower;
        });
      }
      setCustomers(dbCustomers);

      // Fetch rental contracts & invoices
      try {
        const [rcRes, riRes] = await Promise.all([
          api.get('/real-estate/rental-contracts').catch(()=>({data:{data:[]}})),
          api.get('/real-estate/rental-invoices').catch(()=>({data:{data:[]}})),
        ]);
        setRentalContracts(rcRes.data?.data || []);
        setRentalInvoices(riRes.data?.data || []);
      } catch(_) {}

    } catch (error) {
      console.error("Error fetching Real Estate Data", error);
    } finally {
      setLoading(false);
    }
  };

  const handleProjectSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const sanitizedForm = {
        ...projectForm,
        total_units: projectForm.total_units === '' ? 0 : Number(projectForm.total_units)
      };

      if (editingProject) {
        await api.put(`/real-estate/projects/${editingProject.id}`, sanitizedForm);
      } else {
        await api.post('/real-estate/projects', sanitizedForm);
      }
      setIsProjectModalOpen(false);
      setEditingProject(null);
      setProjectForm({ name: '', type: 'Building', location: '', total_units: '' });
      fetchData();
    } catch (error) {
      alert(error.response?.data?.error || cur.error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnitSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const sanitizedForm = {
        ...unitForm,
        area: unitForm.area === '' ? null : Number(unitForm.area),
        floor: unitForm.floor === '' ? null : Number(unitForm.floor),
        price: unitForm.price === '' ? null : Number(unitForm.price),
        project_id: unitForm.project_id === '' ? null : Number(unitForm.project_id)
      };

      if (sanitizedForm.project_id) {
        const targetProj = projects.find(p => Number(p.id) === Number(sanitizedForm.project_id));
        if (targetProj) {
          const limit = Number(targetProj.total_units || 0);
          const isNew = !editingUnit;
          const isProjectChanged = editingUnit && Number(editingUnit.project_id) !== Number(sanitizedForm.project_id);
          if (isNew || isProjectChanged) {
            const currentCount = units.filter(u => Number(u.project_id) === Number(sanitizedForm.project_id)).length;
            if (currentCount >= limit) {
              const errMsg = language === 'ar' 
                ? `خطأ: تم الوصول للحد الأقصى لعدد الوحدات في هذا المشروع (${limit} وحدة) ولا يمكن إضافة المزيد.`
                : `Error: The maximum limit of units for this project (${limit}) has been reached.`;
              alert(errMsg);
              setIsSubmitting(false);
              return;
            }
          }
        }
      }

      if (editingUnit) {
        await api.put(`/real-estate/units/${editingUnit.id}`, sanitizedForm);
      } else {
        await api.post('/real-estate/units', sanitizedForm);
      }
      setIsUnitModalOpen(false);
      setEditingUnit(null);
      setUnitForm({ project_id: '', unit_number: '', type: 'Apartment', area: '', floor: '', price: '' });
      fetchData();
    } catch (error) {
      alert(error.response?.data?.error || cur.error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (type, id) => {
    if (!window.confirm(cur.confirmDelete)) return;
    try {
      await api.delete(`/real-estate/${type}/${id}`);
      fetchData();
    } catch (error) {
      alert(cur.error);
    }
  };

  const handleQuickAddCustomer = async (name, phone) => {
    try {
      setIsSubmitting(true);
      const activeComp = localStorage.getItem('active_company') || '';
      let resolvedCompanyId = 1;
      let resolvedCompanyName = 'TED CAPITAL';

      const compLower = activeComp.toLowerCase();
      if (compLower.includes('design') || compLower.includes('ديزاين')) {
        resolvedCompanyId = 2; resolvedCompanyName = 'Design Concept';
      } else if (compLower.includes('master') || compLower.includes('ماستر')) {
        resolvedCompanyId = 3; resolvedCompanyName = 'Master Builder';
      } else if (compLower.includes('prime') || compLower.includes('فارما') || compLower.includes('بريم')) {
        resolvedCompanyId = 4; resolvedCompanyName = 'PRIMEMED PHARMA';
      } else if (activeComp === 'all' || activeComp === 'كل الشركات' || activeComp === '') {
        if (contractForm.unit_id) {
          const selectedUnitObj = units.find(u => Number(u.id) === Number(contractForm.unit_id));
          const selectedProj = selectedUnitObj ? projects.find(p => Number(p.id) === Number(selectedUnitObj.project_id)) : null;
          if (selectedProj && selectedProj.company) {
            resolvedCompanyName = selectedProj.company;
            const projCompLower = selectedProj.company.toLowerCase();
            if (projCompLower.includes('design') || projCompLower.includes('ديزاين')) resolvedCompanyId = 2;
            else if (projCompLower.includes('master') || projCompLower.includes('ماستر')) resolvedCompanyId = 3;
            else if (projCompLower.includes('prime') || projCompLower.includes('فارما')) resolvedCompanyId = 4;
            else resolvedCompanyId = 1;
          }
        }
      }

      const payload = {
        name: name.trim(),
        phone: phone.trim() || '',
        company: resolvedCompanyName,
        company_id: resolvedCompanyId,
        customer_type: 'Real Estate',
        created_at: new Date().toISOString()
      };
      const res = await api.post('/dynamic/add/customers', payload);
      const newCust = { id: res.data?.id || res.data?.data?.id || Date.now(), ...payload };
      setCustomers(prev => [...prev, newCust]);
      setContractForm(prev => ({ ...prev, customer_id: String(newCust.id) }));
    } catch (error) {
      console.error(error);
      alert(language === 'ar' ? 'حدث خطأ أثناء إضافة العميل.' : 'Error adding customer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleContractSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const sanitizedForm = {
        ...contractForm,
        customer_id: Number(contractForm.customer_id),
        unit_id: Number(contractForm.unit_id),
        total_price: Number(contractForm.total_price),
        down_payment: Number(contractForm.down_payment || 0),
        installment_years: Number(contractForm.installment_years || 1)
      };

      if (editingContract) {
         await api.put(`/real-estate/contracts/${editingContract.id}`, sanitizedForm);
      } else {
         await api.post('/real-estate/contracts', sanitizedForm);
      }
      setIsContractModalOpen(false);
      setEditingContract(null);
      fetchData();
    } catch (error) {
      alert(error.response?.data?.error || cur.error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openPayModal = (inst) => {
    setSelectedInst(inst);
    setPayForm({ 
      installment_id: inst.id, 
      paymentAmount: inst.amount, 
      payment_method: 'Cash', 
      reference_no: '' 
    });
    setIsPayModalOpen(true);
  };

  const handlePaySubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingInstallment) {
        await api.put(`/real-estate/installments/${editingInstallment.id}`, {
          amount: payForm.paymentAmount,
          due_date: editingInstallment.due_date,
          status: editingInstallment.status
        });
      } else {
        await api.post('/real-estate/installments/pay', payForm);
      }
      setIsPayModalOpen(false);
      setEditingInstallment(null);
      fetchData();
    } catch (error) {
      alert(error.response?.data?.error || cur.error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Stats Calculation ---
  const stats = {
    totalSales: contracts.reduce((sum, c) => sum + Number(c.total_price || 0), 0),
    collectedAmount: installments.filter(i => i.status === 'Paid').reduce((sum, i) => sum + Number(i.amount || 0), 0),
    totalReceivable: installments.reduce((sum, i) => sum + Number(i.amount || 0), 0),
    occupancyRate: units.length > 0 ? Math.round((units.filter(u => u.status === 'Sold').length / units.length) * 100) : 0,
    availableCount: units.filter(u => u.status === 'Available').length,
    inventoryValue: units.reduce((sum, u) => sum + Number(u.price || 0), 0)
  };

  const collectionProgress = stats.totalReceivable > 0 ? Math.round((stats.collectedAmount / stats.totalReceivable) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-20 font-sans selection:bg-slate-900 selection:text-white" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      
      {/* Enterprise Header - Modern Style */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8 bg-white p-10 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden mb-8">
          <div className="flex items-center gap-6 z-10 relative">
            <div className="w-20 h-20 bg-slate-900 text-white rounded-3xl flex items-center justify-center text-3xl shadow-2xl shadow-slate-900/20 transform hover:rotate-3 transition-transform duration-500">
              🏢
            </div>
            <div>
              <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
                {cur.title}
              </h1>
              <p className="text-slate-400 font-medium text-sm mt-1">
                {cur.subtitle}
              </p>
            </div>
          </div>

          <div className="bg-slate-50 p-2 rounded-2xl border border-slate-200 flex flex-wrap gap-2 shadow-inner">
            {[
              { id: 'projects', label: cur.projects, icon: '🏗️' },
              { id: 'units', label: cur.units, icon: '🗺️' },
              { id: 'contracts', label: cur.sales, icon: '📝' },
              { id: 'installments', label: cur.collection, icon: '💰' },
              { id: 'costs', label: 'تكاليف المشروع', icon: '📊' },
              { id: 'unit-costs', label: 'تكلفة الوحدات', icon: '📐' },
              { id: 'rentals', label: 'عقود الإيجار', icon: '🏭' },

            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center gap-3 px-8 py-3.5 rounded-xl font-bold text-sm transition-all duration-300 whitespace-nowrap
                  ${activeTab === tab.id 
                    ? 'bg-white text-slate-900 shadow-md border border-slate-200 transform scale-105' 
                    : 'text-slate-500 hover:bg-white/50 hover:text-slate-900'}
                `}
              >
                <span className="text-xl">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* --- KPI Dashboard Section --- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white border border-slate-200 p-8 rounded-[2rem] shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-slate-50 rounded-bl-[3rem] -mr-6 -mt-6 group-hover:scale-125 transition-transform duration-500"></div>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">{cur.salesPortfolio}</p>
            <h3 className="text-3xl font-black text-slate-900 font-mono mb-2 tracking-tighter">{stats.totalSales.toLocaleString()} <span className="text-xs text-slate-400 font-sans">EGP</span></h3>
            <div className="flex items-center gap-2 text-emerald-600 font-bold text-[11px]">
              <span className="bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100 shadow-sm">↑ 12%</span>
              <span className="text-slate-400 font-black uppercase tracking-tighter">{cur.vsLastMonth}</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-8 rounded-[2rem] shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-amber-50 rounded-bl-[3rem] -mr-6 -mt-6 group-hover:scale-125 transition-transform duration-500"></div>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">{cur.occupancyRate}</p>
            <div className="flex items-end gap-3 mb-2">
              <h3 className="text-4xl font-black text-slate-900 font-mono tracking-tighter">{stats.occupancyRate}%</h3>
              <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden mb-3.5 shadow-inner">
                <div className="h-full bg-amber-500 rounded-full shadow-lg" style={{ width: `${stats.occupancyRate}%` }}></div>
              </div>
            </div>
            <p className="text-[11px] font-bold text-slate-400 italic">
              {cur.unitsSold.replace('{sold}', units.length - stats.availableCount).replace('{total}', units.length)}
            </p>
          </div>

          <div className="bg-white border border-slate-200 p-8 rounded-[2rem] shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-50 rounded-bl-[3rem] -mr-6 -mt-6 group-hover:scale-125 transition-transform duration-500"></div>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">{cur.collectionEfficiency}</p>
            <h3 className="text-3xl font-black text-emerald-600 font-mono mb-2 tracking-tighter">{collectionProgress}%</h3>
            <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase mt-2 border-t border-slate-100 pt-4">
              <span>{cur.collected}: {stats.collectedAmount.toLocaleString()}</span>
              <span>{cur.pending}: {(stats.totalReceivable - stats.collectedAmount).toLocaleString()}</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-8 rounded-[2rem] shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-slate-50 rounded-bl-[3rem] -mr-6 -mt-6 group-hover:scale-125 transition-transform duration-500"></div>
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">{cur.inventoryValue}</p>
            <h3 className="text-3xl font-black text-slate-900 font-mono mb-2 tracking-tighter">{stats.inventoryValue.toLocaleString()} <span className="text-xs text-slate-400 font-sans">EGP</span></h3>
            <p className="text-[11px] font-bold text-slate-400 italic">
              {cur.unitsAvailable.replace('{count}', stats.availableCount)}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-4">
        
        {/* --- Global Filter & Search Bar --- */}
        <div className="flex flex-col md:flex-row gap-4 mb-8 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl">
          <div className="relative flex-1">
            <span className={`absolute inset-y-0 ${language === 'ar' ? 'right-6' : 'left-6'} flex items-center text-slate-400 text-xl`}>🔍</span>
            <input 
              type="text" 
              placeholder={cur.searchPlaceholder}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full ${language === 'ar' ? 'pr-16 pl-6' : 'pl-16 pr-6'} py-4 bg-slate-50 border border-slate-200 rounded-2xl text-base font-bold text-slate-900 outline-none focus:border-slate-900 focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all shadow-inner`}
            />
          </div>
          <div className="flex gap-3">
            {activeTab === 'projects' && (
              <select 
                value={filterType} 
                onChange={(e) => setFilterType(e.target.value)}
                className="px-8 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black text-slate-600 outline-none focus:border-slate-900 transition-all appearance-none min-w-[180px] text-center shadow-sm"
              >
                <option value="All">{cur.allTypes}</option>
                <option value="Building">{cur.buildings}</option>
                <option value="Compound">{cur.compounds}</option>
                <option value="Mall">{cur.malls}</option>
              </select>
            )}
            <button 
              onClick={() => { setSearchTerm(''); setFilterType('All'); }}
              className="px-10 py-4 bg-white border border-slate-200 text-slate-400 rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:text-slate-900 hover:border-slate-900 transition-all shadow-sm active:scale-95"
            >
              {cur.reset} 🔄
            </button>
          </div>
        </div>

        {/* Dynamic Content Container */}
        <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-200 overflow-hidden min-h-[700px]">
          
          {/* Projects Tab */}
          {activeTab === 'projects' && (
            <div className="animate-fade-in">
              <div className="p-10 border-b border-slate-100 bg-slate-50/30 flex flex-col sm:flex-row justify-between items-center gap-8">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-white text-slate-900 rounded-[1.5rem] text-3xl border border-slate-200 shadow-md flex items-center justify-center transform -rotate-3">🏗️</div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">{cur.projectRegistry}</h3>
                    <p className="text-slate-400 font-medium text-sm mt-1">{cur.projectSubtitle}</p>
                  </div>
                </div>
                <button 
                  onClick={() => { setEditingProject(null); setProjectForm({ name: '', type: 'Building', location: '', total_units: '' }); setIsProjectModalOpen(true); }}
                  className="px-10 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-sm transition-all shadow-xl shadow-slate-900/20 flex items-center gap-3 hover:-translate-y-1 active:translate-y-0"
                >
                  <span className="text-xl">+</span> {cur.addNewProject}
                </button>
              </div>

              <div className="p-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                {loading ? (
                  <div className="col-span-full py-40 text-center">
                    <div className="inline-block w-12 h-12 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin mb-4"></div>
                    <p className="text-slate-400 font-black uppercase tracking-[0.3em] text-xs italic">{cur.loading}</p>
                  </div>
                ) : projects
                    .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) && (filterType === 'All' || p.type === filterType))
                    .map(p => (
                  <div key={p.id} className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-sm hover:shadow-2xl transition-all duration-500 group relative overflow-hidden border-b-8 border-b-slate-100 hover:border-b-slate-900">
                    <div className="flex justify-between items-start mb-8">
                      <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1 rounded-lg border border-slate-100 shadow-inner">ID-#{p.id}</span>
                      <span className="px-5 py-1.5 bg-slate-900 text-white text-[10px] font-black rounded-full uppercase tracking-widest shadow-lg shadow-slate-900/20">{cur[p.type.toLowerCase() + 's'] || p.type}</span>
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 mb-8 leading-tight group-hover:text-slate-700 transition-colors">{p.name}</h3>
                    <div className="grid grid-cols-2 gap-8 py-8 border-y border-slate-100 mb-8">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{cur.location}</p>
                        <p className="text-sm font-extrabold text-slate-800">{p.location || '---'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{cur.unitCount}</p>
                        <p className="text-sm font-extrabold text-slate-800">{p.total_units} {cur.units}</p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button 
                        onClick={() => { setEditingProject(p); setProjectForm(p); setIsProjectModalOpen(true); }}
                        className="flex-1 py-4 bg-slate-50 border border-slate-200 text-slate-500 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all duration-300 shadow-sm active:scale-95"
                      >
                        {cur.edit} ✏️
                      </button>
                      <button 
                        onClick={() => handleDelete('projects', p.id)}
                        className="w-14 h-14 bg-white border border-slate-200 text-rose-500 rounded-2xl flex items-center justify-center hover:bg-rose-50 hover:border-rose-200 hover:scale-110 transition-all shadow-sm active:scale-95"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Units Tab */}
          {activeTab === 'units' && (
            <div className="animate-fade-in">
              <div className="p-10 border-b border-slate-100 bg-slate-50/30 flex flex-col sm:flex-row justify-between items-center gap-8">
                <div className="flex items-center gap-8">
                  <div className="w-16 h-16 bg-white text-slate-900 rounded-[1.5rem] text-3xl border border-slate-200 shadow-md flex items-center justify-center transform rotate-3">🗺️</div>
                  <div className="flex gap-6 items-center">
                    <div className="flex items-center gap-3 bg-white px-5 py-2 rounded-2xl border border-slate-200 shadow-sm">
                      <span className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></span> 
                      <span className="text-xs font-black text-slate-600 uppercase tracking-widest">{cur.available}</span>
                    </div>
                    <div className="flex items-center gap-3 bg-white px-5 py-2 rounded-2xl border border-slate-200 shadow-sm">
                      <span className="w-3 h-3 bg-rose-500 rounded-full shadow-[0_0_10px_rgba(244,63,94,0.5)]"></span> 
                      <span className="text-xs font-black text-slate-600 uppercase tracking-widest">{cur.sold}</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => { setEditingUnit(null); setUnitForm({ project_id: '', unit_number: '', type: 'Apartment', area: '', floor: '', price: '' }); setIsUnitModalOpen(true); }}
                  className="px-10 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-sm transition-all shadow-xl shadow-slate-900/20 flex items-center gap-3 hover:-translate-y-1 active:translate-y-0"
                >
                  <span className="text-xl">+</span> {cur.addUnit}
                </button>
              </div>

              <div className="p-10 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
                {units.filter(u => u.unit_number?.toLowerCase().includes(searchTerm.toLowerCase()) || u.project_name?.toLowerCase().includes(searchTerm.toLowerCase())).length === 0 && !loading && (
                  <div className="col-span-full py-40 text-center text-slate-400 font-black uppercase tracking-[0.3em] text-xs italic">{cur.noUnitsFound}</div>
                )}
                {units
                  .filter(u => u.unit_number?.toLowerCase().includes(searchTerm.toLowerCase()) || u.project_name?.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map(u => (
                  <div key={u.id} className="bg-white border-2 border-slate-100 rounded-[2rem] p-8 hover:border-slate-900 transition-all duration-500 relative group shadow-sm hover:shadow-2xl hover:-translate-y-1">
                    <div className={`absolute top-4 ${language === 'ar' ? 'left-4' : 'right-4'} opacity-0 group-hover:opacity-100 transition-all flex gap-2 scale-90 group-hover:scale-100`}>
                      <button onClick={() => { setEditingUnit(u); setUnitForm(u); setIsUnitModalOpen(true); }} className="w-10 h-10 bg-white border border-slate-200 rounded-xl text-lg flex items-center justify-center hover:bg-slate-900 hover:text-white transition-all shadow-md">✏️</button>
                      <button onClick={() => handleDelete('units', u.id)} className="w-10 h-10 bg-white border border-slate-200 rounded-xl text-lg flex items-center justify-center text-rose-500 hover:bg-rose-500 hover:text-white transition-all shadow-md">🗑️</button>
                    </div>
                    <div className="text-center pt-2">
                      <p className="text-[10px] font-black text-slate-400 mb-2 uppercase tracking-[0.2em]">{cur.unit} {u.unit_number || '---'}</p>
                      <h4 className="text-3xl font-black text-slate-900 font-mono mb-2 tracking-tighter">
                        {u.floor || '0'}-{(u.unit_number || '').slice(-2) || '??'}
                      </h4>
                      <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-50 pb-4">
                        {u.type} | {u.area}M²
                      </p>
                      <span className={`inline-block px-5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm ${u.status === 'Available' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
                        {u.status === 'Available' ? cur.available : cur.sold}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Contracts Tab */}
          {activeTab === 'contracts' && (
            <div className="animate-fade-in">
              <div className="p-10 border-b border-slate-100 bg-slate-50/30 flex flex-col sm:flex-row justify-between items-center gap-8">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-white text-slate-900 rounded-[1.5rem] text-3xl border border-slate-200 shadow-md flex items-center justify-center transform -rotate-6">📝</div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">{cur.salesRegistry}</h3>
                    <p className="text-slate-400 font-medium text-sm mt-1">{cur.salesSubtitle}</p>
                  </div>
                </div>
                <button 
                  onClick={() => { setEditingContract(null); setContractForm({ 
                    unit_id: '', customer_id: '', total_price: '', 
                    down_payment: '', installment_years: '', contract_date: new Date().toISOString().split('T')[0],
                    salesperson_id: '', commission_rate: '', frequency: 'Monthly'
                  }); setIsContractModalOpen(true); }}
                  className="px-10 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-sm transition-all shadow-xl shadow-slate-900/20 flex items-center gap-3 hover:-translate-y-1 active:translate-y-0"
                >
                  <span className="text-xl">+</span> {cur.newContract}
                </button>
              </div>
              <div className="overflow-x-auto p-4">
                <table className={`w-full ${language === 'ar' ? 'text-right' : 'text-left'} whitespace-nowrap border-separate border-spacing-y-4`}>
                  <thead>
                    <tr className="text-slate-400 text-[11px] font-black uppercase tracking-[0.3em]">
                      <th className="px-8 py-4">{cur.contract}</th>
                      <th className="px-8 py-4">{cur.customer}</th>
                      <th className="px-8 py-4">{cur.unit}</th>
                      <th className="px-8 py-4">{cur.totalPrice}</th>
                      <th className="px-8 py-4">{cur.date}</th>
                      <th className="px-8 py-4 text-center">{cur.actions}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contracts
                      .filter(c => c.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) || c.unit_id?.toString().includes(searchTerm))
                      .map(c => (
                      <tr key={c.id} className="bg-white border-2 border-slate-100 rounded-3xl shadow-sm hover:shadow-xl transition-all duration-500 group">
                        <td className="px-8 py-6 first:rounded-r-[2rem] last:rounded-l-[2rem] font-black text-slate-400 text-xs tracking-widest border-y border-r border-slate-100 group-hover:border-slate-200">CONT-#{c.id}</td>
                        <td className="px-8 py-6 border-y border-slate-100 group-hover:border-slate-200 font-extrabold text-slate-900 text-base">
                          {c.customer_name}
                          {c.customer_id && (
                            <a 
                              href={`/clients?clientId=${c.customer_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block text-[10px] text-violet-600 hover:text-slate-900 transition-colors mt-1 font-black"
                            >
                              👤 {language === 'ar' ? 'عرض ملف 360°' : 'View 360° Profile'}
                            </a>
                          )}
                        </td>
                        <td className="px-8 py-6 border-y border-slate-100 group-hover:border-slate-200">
                          <span className="text-[11px] font-black text-slate-600 bg-slate-100 px-4 py-1.5 rounded-xl border border-slate-200 shadow-inner">
                            {units.find(u => u.id === c.unit_id)?.unit_number || '---'}
                          </span>
                        </td>
                        <td className="px-8 py-6 border-y border-slate-100 group-hover:border-slate-200 font-black text-slate-900 font-mono text-lg tracking-tighter">{Number(c.total_price).toLocaleString()}</td>
                        <td className="px-8 py-6 border-y border-slate-100 group-hover:border-slate-200 font-extrabold text-slate-500 text-sm">{new Date(c.contract_date).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}</td>
                        <td className="px-8 py-6 first:rounded-r-[2rem] last:rounded-l-[2rem] border-y border-l border-slate-100 group-hover:border-slate-200">
                          <div className="flex items-center justify-center gap-3">
                            <button onClick={() => { setEditingContract(c); setContractForm(c); setIsContractModalOpen(true); }} className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 hover:bg-slate-900 hover:text-white transition-all flex items-center justify-center shadow-sm">✏️</button>
                            <button onClick={() => handleDelete('contracts', c.id)} className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center shadow-sm">🗑️</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Installments Tab */}
          {activeTab === 'installments' && (
            <div className="animate-fade-in">
              <div className="p-10 border-b border-slate-100 bg-slate-50/30 grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-white border-2 border-slate-100 p-8 rounded-[2.5rem] shadow-sm relative overflow-hidden group hover:shadow-xl transition-all duration-500">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-50 rounded-bl-[3rem] -mr-6 -mt-6 group-hover:scale-125 transition-transform duration-500"></div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{cur.totalCollected}</p>
                  <h3 className="text-3xl font-black text-emerald-600 font-mono tracking-tighter">
                    {Number(installments.filter(i => i.status === 'Paid').reduce((acc, curr) => acc + Number(curr.amount), 0)).toLocaleString()} <span className="text-xs font-sans text-slate-400 uppercase">EGP</span>
                  </h3>
                </div>
                <div className="bg-white border-2 border-slate-100 p-8 rounded-[2.5rem] shadow-sm relative overflow-hidden group hover:shadow-xl transition-all duration-500">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-amber-50 rounded-bl-[3rem] -mr-6 -mt-6 group-hover:scale-125 transition-transform duration-500"></div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{cur.currentReceivables}</p>
                  <h3 className="text-3xl font-black text-amber-600 font-mono tracking-tighter">
                    {Number(installments.filter(i => i.status !== 'Paid').reduce((acc, curr) => acc + Number(curr.amount), 0)).toLocaleString()} <span className="text-xs font-sans text-slate-400 uppercase">EGP</span>
                  </h3>
                </div>
                <div className="bg-white border-2 border-slate-100 p-8 rounded-[2.5rem] shadow-sm relative overflow-hidden group hover:shadow-xl transition-all duration-500">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-slate-50 rounded-bl-[3rem] -mr-6 -mt-6 group-hover:scale-125 transition-transform duration-500"></div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">{cur.transactions}</p>
                  <h3 className="text-3xl font-black text-slate-900 font-mono tracking-tighter">{installments.length} <span className="text-xs font-sans text-slate-400 uppercase">{language === 'ar' ? 'قسط' : 'Inst.'}</span></h3>
                </div>
              </div>

              <div className="overflow-x-auto p-4">
                <table className={`w-full ${language === 'ar' ? 'text-right' : 'text-left'} whitespace-nowrap border-separate border-spacing-y-4`}>
                  <thead>
                    <tr className="text-slate-400 text-[11px] font-black uppercase tracking-[0.3em]">
                      <th className="px-8 py-4">{cur.unitNumber}</th>
                      <th className="px-8 py-4">{cur.customer}</th>
                      <th className="px-8 py-4">{cur.dueDate}</th>
                      <th className="px-8 py-4 text-center">{cur.status}</th>
                      <th className="px-8 py-4">{cur.amount}</th>
                      <th className="px-8 py-4 text-center">{cur.actions}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {installments
                      .filter(i => i.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) || i.unit_number?.toLowerCase().includes(searchTerm.toLowerCase()))
                      .map(i => (
                      <tr key={i.id} className="bg-white border-2 border-slate-100 rounded-3xl shadow-sm hover:shadow-xl transition-all duration-500 group">
                        <td className="px-8 py-6 first:rounded-r-[2rem] last:rounded-l-[2rem] font-black text-slate-900 text-base border-y border-r border-slate-100 group-hover:border-slate-200">{i.unit_number || '---'}</td>
                        <td className="px-8 py-6 border-y border-slate-100 group-hover:border-slate-200 font-extrabold text-slate-500 text-sm">
                          {i.customer_name || '---'}
                          {i.customer_id && (
                            <a 
                              href={`/clients?clientId=${i.customer_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block text-[10px] text-violet-600 hover:text-slate-900 transition-colors mt-1 font-black"
                            >
                              👤 {language === 'ar' ? 'عرض ملف 360°' : 'View 360° Profile'}
                            </a>
                          )}
                        </td>
                        <td className="px-8 py-6 border-y border-slate-100 group-hover:border-slate-200 font-mono text-xs font-black text-slate-400 tracking-widest">{new Date(i.due_date).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}</td>
                        <td className="px-8 py-6 border-y border-slate-100 group-hover:border-slate-200 text-center">
                          <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-[0.1em] border shadow-sm ${i.status === 'Paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100 animate-pulse'}`}>
                            {i.status === 'Paid' ? cur.paid : cur.waiting}
                          </span>
                        </td>
                        <td className="px-8 py-6 border-y border-slate-100 group-hover:border-slate-200 font-black text-slate-900 font-mono text-lg tracking-tighter">{Number(i.amount).toLocaleString()}</td>
                        <td className="px-8 py-6 first:rounded-r-[2rem] last:rounded-l-[2rem] border-y border-l border-slate-100 group-hover:border-slate-200">
                          <div className="flex items-center justify-center gap-3">
                            {i.status !== 'Paid' && (
                              <button onClick={() => openPayModal(i)} className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 active:scale-95">{cur.collect}</button>
                            )}
                            <button onClick={() => handleDelete('installments', i.id)} className="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center shadow-sm">🗑️</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ═══ PROJECT COSTS TAB ══════════════════════════════════════════════ */}
          {activeTab === 'costs' && (
            <div className="animate-fade-in p-10">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-6 mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-white border border-slate-200 rounded-[1.5rem] text-3xl flex items-center justify-center shadow-md">📊</div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900">تكاليف المشروع العقاري</h3>
                    <p className="text-slate-400 text-sm font-medium">أدخل كل بنود التكلفة — النظام يوزعها على الوحدات تلقائياً</p>
                  </div>
                </div>
                <div className="flex gap-3 flex-wrap">
                  <select
                    value={selectedCostProject}
                    onChange={async (e) => {
                      setSelectedCostProject(e.target.value);
                      if (e.target.value) {
                        try {
                          const r = await api.get(`/real-estate/project-costs/${e.target.value}`);
                          setProjectCosts(r.data?.data || []);
                          setCostSummary(r.data?.summary || []);
                          setGrandTotal(r.data?.grand_total || 0);
                        } catch(_) {}
                      }
                    }}
                    className="px-6 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm text-slate-700 outline-none focus:border-slate-900 min-w-[220px]"
                  >
                    <option value="">-- اختر المشروع --</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <button
                    onClick={() => setIsCostFormOpen(true)}
                    className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-black text-sm hover:-translate-y-1 transition-all shadow-xl shadow-slate-900/20"
                  >+ إضافة بند تكلفة</button>
                </div>
              </div>

              {/* Cost Summary Cards */}
              {costSummary.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
                  {['أرض','بناء','تشطيب','تراخيص','مصاريف عمومية','أخرى'].map(cat => {
                    const found = costSummary.find(s => s.cost_category === cat);
                    const amt = parseFloat(found?.total || 0);
                    const pct = grandTotal > 0 ? ((amt/grandTotal)*100).toFixed(1) : 0;
                    const colors = { 'أرض':'from-amber-500 to-orange-500', 'بناء':'from-blue-500 to-cyan-500', 'تشطيب':'from-emerald-500 to-teal-500', 'تراخيص':'from-violet-500 to-purple-500', 'مصاريف عمومية':'from-pink-500 to-rose-500', 'أخرى':'from-slate-500 to-slate-400' };
                    return (
                      <div key={cat} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-lg transition-all">
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-2">{cat}</p>
                        <p className="text-lg font-black text-slate-900 font-mono">{amt > 0 ? (amt/1000).toFixed(0)+'K' : '—'}</p>
                        <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full bg-gradient-to-r ${colors[cat]} rounded-full`} style={{width:`${pct}%`}}></div>
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 mt-1">{pct}%</p>
                      </div>
                    );
                  })}
                </div>
              )}

              {grandTotal > 0 && (
                <div className="bg-gradient-to-r from-slate-900 to-slate-700 text-white rounded-2xl p-6 flex justify-between items-center mb-8">
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">إجمالي تكاليف المشروع</p>
                    <p className="text-3xl font-black font-mono">{Number(grandTotal).toLocaleString()} <span className="text-sm text-slate-400">EGP</span></p>
                  </div>
                  <div className="flex gap-3">
                    <div className="text-center">
                      <p className="text-xs text-slate-400 mb-1">هامش مستهدف</p>
                      <input type="number" value={targetMargin} onChange={e=>setTargetMargin(e.target.value)} className="w-16 text-center bg-white/10 border border-white/20 rounded-xl py-1 font-black text-white text-sm outline-none"/>
                      <span className="text-xs text-slate-400 mr-1">%</span>
                    </div>
                    <button
                      disabled={!selectedCostProject || allocating}
                      onClick={async () => {
                        if (!selectedCostProject) return;
                        setAllocating(true);
                        try {
                          const r = await api.post(`/real-estate/project-costs/${selectedCostProject}/allocate`, { target_margin_pct: targetMargin });
                          const uc = await api.get(`/real-estate/unit-costs-by-project/${selectedCostProject}`);
                          setUnitCosts(uc.data?.data || []);
                          setActiveTab('unit-costs');
                          alert(`✅ ${r.data?.message}`);
                        } catch(err) { alert(err?.response?.data?.error || 'خطأ في التوزيع'); }
                        finally { setAllocating(false); }
                      }}
                      className="px-6 py-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl font-black text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {allocating ? '⏳ جاري...' : '📐 وزّع على الوحدات'}
                    </button>
                  </div>
                </div>
              )}

              {/* Cost Entries Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-right border-separate border-spacing-y-2">
                  <thead><tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="px-4 py-3">الفئة</th><th className="px-4 py-3">الوصف</th><th className="px-4 py-3">المورد</th>
                    <th className="px-4 py-3">التاريخ</th><th className="px-4 py-3 text-left">المبلغ</th><th className="px-4 py-3"></th>
                  </tr></thead>
                  <tbody>
                    {projectCosts.map(c => (
                      <tr key={c.id} className="bg-white border border-slate-100 rounded-xl shadow-sm hover:shadow-md transition-all">
                        <td className="px-4 py-4"><span className="px-3 py-1 bg-slate-100 rounded-lg text-xs font-black text-slate-700">{c.cost_category}</span></td>
                        <td className="px-4 py-4 text-sm font-bold text-slate-700">{c.description || '—'}</td>
                        <td className="px-4 py-4 text-sm text-slate-500">{c.supplier || '—'}</td>
                        <td className="px-4 py-4 text-xs text-slate-400">{c.cost_date?.split('T')[0] || '—'}</td>
                        <td className="px-4 py-4 font-black text-slate-900 font-mono text-left">{Number(c.amount).toLocaleString()}</td>
                        <td className="px-4 py-4">
                          <button onClick={async()=>{await api.delete(`/real-estate/project-costs/${c.id}`);setProjectCosts(prev=>prev.filter(x=>x.id!==c.id));}} className="w-8 h-8 rounded-lg bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white flex items-center justify-center text-sm transition-all">🗑</button>
                        </td>
                      </tr>
                    ))}
                    {projectCosts.length === 0 && (
                      <tr><td colSpan="6" className="text-center py-16 text-slate-400 font-black text-sm">اختر مشروعاً ثم أضف بنود التكاليف</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Add Cost Form */}
              {isCostFormOpen && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl flex items-center justify-center z-[100] p-4">
                  <div className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl p-10">
                    <div className="flex justify-between items-center mb-8">
                      <h3 className="text-xl font-black text-slate-900">إضافة بند تكلفة</h3>
                      <button onClick={()=>setIsCostFormOpen(false)} className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-900 hover:text-white transition-all">✕</button>
                    </div>
                    <form onSubmit={async(e)=>{
                      e.preventDefault();
                      try {
                        const payload = {...costForm, project_id: selectedCostProject||costForm.project_id};
                        await api.post('/real-estate/project-costs', payload);
                        const r = await api.get(`/real-estate/project-costs/${payload.project_id}`);
                        setProjectCosts(r.data?.data||[]);setCostSummary(r.data?.summary||[]);setGrandTotal(r.data?.grand_total||0);
                        setIsCostFormOpen(false);
                        setCostForm({project_id:'',cost_category:'أرض',description:'',amount:'',supplier:'',invoice_ref:'',cost_date:new Date().toISOString().split('T')[0]});
                      } catch(err){alert(err?.response?.data?.error||'خطأ');}
                    }} className="space-y-4">
                      <select required value={costForm.project_id||selectedCostProject} onChange={e=>setCostForm({...costForm,project_id:e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-slate-900">
                        <option value="">-- اختر المشروع --</option>
                        {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <select value={costForm.cost_category} onChange={e=>setCostForm({...costForm,cost_category:e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-slate-900">
                        {['أرض','بناء','تشطيب','تراخيص','مصاريف عمومية','أخرى'].map(c=><option key={c}>{c}</option>)}
                      </select>
                      <input required placeholder="الوصف" value={costForm.description} onChange={e=>setCostForm({...costForm,description:e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-slate-900"/>
                      <input required type="number" placeholder="المبلغ (EGP)" value={costForm.amount} onChange={e=>setCostForm({...costForm,amount:e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-slate-900"/>
                      <input placeholder="المورد" value={costForm.supplier} onChange={e=>setCostForm({...costForm,supplier:e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-slate-900"/>
                      <input type="date" value={costForm.cost_date} onChange={e=>setCostForm({...costForm,cost_date:e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-slate-900"/>
                      <button type="submit" className="w-full py-4 bg-slate-900 text-white rounded-xl font-black hover:bg-slate-800 transition-all">حفظ البند</button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══ UNIT COSTS TAB ═════════════════════════════════════════════════ */}
          {activeTab === 'unit-costs' && (
            <div className="animate-fade-in p-10">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-6 mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-white border border-slate-200 rounded-[1.5rem] text-3xl flex items-center justify-center shadow-md">📐</div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900">تكلفة الوحدات</h3>
                    <p className="text-slate-400 text-sm font-medium">التكلفة المخصصة لكل وحدة — التكلفة/م² — هامش الربح — السعر المقترح</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <select
                    onChange={async(e)=>{
                      if(!e.target.value) return;
                      const r = await api.get(`/real-estate/unit-costs-by-project/${e.target.value}`).catch(()=>({data:{data:[]}}));
                      setUnitCosts(r.data?.data||[]);
                    }}
                    className="px-6 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm text-slate-700 outline-none focus:border-slate-900 min-w-[220px]"
                  >
                    <option value="">-- اختر المشروع --</option>
                    {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              </div>

              {unitCosts.length > 0 && (
                <div className="bg-gradient-to-r from-slate-50 to-white border border-slate-200 rounded-2xl p-6 mb-8 grid grid-cols-3 gap-6">
                  <div className="text-center">
                    <p className="text-xs font-black text-slate-400 uppercase mb-1">إجمالي تكلفة المشروع</p>
                    <p className="text-2xl font-black text-slate-900 font-mono">{Number(unitCosts[0]?.total_project_cost||0).toLocaleString()}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-black text-slate-400 uppercase mb-1">إجمالي المساحة</p>
                    <p className="text-2xl font-black text-slate-900 font-mono">{Number(unitCosts[0]?.total_project_area||0).toLocaleString()} م²</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-black text-slate-400 uppercase mb-1">تكلفة م² للمشروع</p>
                    <p className="text-2xl font-black text-emerald-600 font-mono">{Number(unitCosts[0]?.cost_per_meter||0).toLocaleString()} EGP</p>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-right border-separate border-spacing-y-2">
                  <thead><tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="px-4 py-3">الوحدة</th><th className="px-4 py-3">م²</th>
                    <th className="px-4 py-3">التكلفة الإجمالية</th><th className="px-4 py-3">التكلفة/م²</th>
                    <th className="px-4 py-3">سعر البيع</th><th className="px-4 py-3">هامش الربح</th>
                    <th className="px-4 py-3">السعر المقترح</th><th className="px-4 py-3">آخر حساب</th>
                  </tr></thead>
                  <tbody>
                    {unitCosts.map(uc => {
                      const marginColor = uc.margin_pct >= 30 ? 'text-emerald-600 bg-emerald-50 border-emerald-200' : uc.margin_pct >= 10 ? 'text-amber-600 bg-amber-50 border-amber-200' : 'text-rose-600 bg-rose-50 border-rose-200';
                      const marginEmoji = uc.margin_pct >= 30 ? '🟢' : uc.margin_pct >= 10 ? '🟡' : '🔴';
                      return (
                        <tr key={uc.id} className="bg-white border border-slate-100 rounded-xl shadow-sm hover:shadow-md transition-all">
                          <td className="px-4 py-4 font-black text-slate-900">{uc.unit_number} <span className="text-xs text-slate-400 font-normal">({uc.unit_type})</span></td>
                          <td className="px-4 py-4 font-mono font-bold text-slate-700">{Number(uc.unit_area).toLocaleString()}</td>
                          <td className="px-4 py-4 font-mono font-black text-slate-900">{Number(uc.allocated_cost).toLocaleString()}</td>
                          <td className="px-4 py-4 font-mono font-black text-blue-600">{Number(uc.cost_per_meter).toLocaleString()}</td>
                          <td className="px-4 py-4 font-mono font-bold text-slate-700">{Number(uc.selling_price).toLocaleString()}</td>
                          <td className="px-4 py-4">
                            <span className={`px-3 py-1 rounded-xl text-xs font-black border ${marginColor}`}>
                              {marginEmoji} {Number(uc.margin_pct).toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-4 py-4 font-mono font-black text-emerald-700">{Number(uc.suggested_price).toLocaleString()}</td>
                          <td className="px-4 py-4 text-xs text-slate-400">{uc.last_calculated_at ? new Date(uc.last_calculated_at).toLocaleDateString('ar-EG') : '—'}</td>
                        </tr>
                      );
                    })}
                    {unitCosts.length === 0 && (
                      <tr><td colSpan="8" className="text-center py-16 text-slate-400 font-black text-sm">اختر مشروعاً لعرض تكاليف وحداته — تأكد من تنفيذ "توزيع التكاليف" أولاً</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ═══ RENTALS TAB ════════════════════════════════════════════════════ */}
          {activeTab === 'rentals' && (
            <div className="animate-fade-in p-10">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-6 mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-white border border-slate-200 rounded-[1.5rem] text-3xl flex items-center justify-center shadow-md">🏭</div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900">عقود الإيجار</h3>
                    <p className="text-slate-400 text-sm font-medium">إدارة عقود الإيجار + توليد الفواتير الشهرية + تسجيل المدفوعات</p>
                  </div>
                </div>
                <button onClick={()=>setIsRentalFormOpen(true)} className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-black text-sm hover:-translate-y-1 transition-all shadow-xl shadow-slate-900/20">+ عقد إيجار جديد</button>
              </div>

              {/* Rental KPIs */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {[
                  { label:'عقود نشطة', val: rentalContracts.filter(r=>r.status==='Active').length, color:'emerald', icon:'📋' },
                  { label:'إجمالي الإيجار الشهري', val: rentalContracts.filter(r=>r.status==='Active').reduce((s,r)=>s+parseFloat(r.monthly_rent||0),0).toLocaleString()+' EGP', color:'blue', icon:'💰' },
                  { label:'فواتير معلقة', val: rentalInvoices.filter(r=>r.status==='Pending').length, color:'amber', icon:'📄' },
                  { label:'إجمالي محصل (الشهر)', val: rentalInvoices.filter(r=>r.status==='Paid').reduce((s,r)=>s+parseFloat(r.amount||0),0).toLocaleString()+' EGP', color:'violet', icon:'✅' },
                ].map(kpi=>(
                  <div key={kpi.label} className={`bg-white border border-slate-200 rounded-2xl p-6 shadow-sm`}>
                    <p className="text-2xl mb-2">{kpi.icon}</p>
                    <p className="text-xs font-black text-slate-400 uppercase mb-1">{kpi.label}</p>
                    <p className="text-xl font-black text-slate-900 font-mono">{kpi.val}</p>
                  </div>
                ))}
              </div>

              {/* Rental Contracts */}
              <h4 className="text-base font-black text-slate-700 mb-4 border-b border-slate-100 pb-3">عقود الإيجار النشطة</h4>
              <div className="space-y-3 mb-10">
                {rentalContracts.filter(r=>r.status==='Active').map(rc=>(
                  <div key={rc.id} className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-wrap justify-between items-center gap-4 hover:shadow-lg transition-all">
                    <div>
                      <p className="text-xs text-slate-400 font-black uppercase mb-1">{rc.contract_number}</p>
                      <p className="font-black text-slate-900 text-base">{rc.tenant_name}</p>
                      <p className="text-sm text-slate-500">{rc.unit_number} — {rc.project_name}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-slate-400 font-black uppercase mb-1">الإيجار الشهري</p>
                      <p className="text-xl font-black text-emerald-600 font-mono">{Number(rc.monthly_rent).toLocaleString()} EGP</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-slate-400 font-black uppercase mb-1">المدة</p>
                      <p className="text-sm font-bold text-slate-700">{rc.start_date?.split('T')[0]} → {rc.end_date?.split('T')[0]}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={async()=>{
                          try {
                            const now = new Date();
                            await api.post(`/real-estate/rental-contracts/${rc.id}/generate-invoice`,{period_month:now.getMonth()+1,period_year:now.getFullYear()});
                            const r2 = await api.get('/real-estate/rental-invoices');
                            setRentalInvoices(r2.data?.data||[]);
                            alert('✅ تم توليد فاتورة الشهر الحالي');
                          } catch(err){alert(err?.response?.data?.error||'خطأ');}
                        }}
                        className="px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-xs font-black hover:bg-blue-600 hover:text-white transition-all"
                      >📄 توليد فاتورة</button>
                      <button
                        onClick={async()=>{if(!window.confirm('إنهاء العقد؟'))return;await api.patch(`/real-estate/rental-contracts/${rc.id}/terminate`);fetchData();}}
                        className="px-4 py-2 bg-rose-50 text-rose-600 border border-rose-200 rounded-xl text-xs font-black hover:bg-rose-600 hover:text-white transition-all"
                      >إنهاء</button>
                    </div>
                  </div>
                ))}
                {rentalContracts.filter(r=>r.status==='Active').length === 0 && (
                  <p className="text-center text-slate-400 font-black text-sm py-10">لا توجد عقود إيجار نشطة — أضف عقداً جديداً</p>
                )}
              </div>

              {/* Rental Invoices */}
              <h4 className="text-base font-black text-slate-700 mb-4 border-b border-slate-100 pb-3">فواتير الإيجار</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-right border-separate border-spacing-y-2">
                  <thead><tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="px-4 py-3">رقم الفاتورة</th><th className="px-4 py-3">المستأجر</th>
                    <th className="px-4 py-3">الشهر</th><th className="px-4 py-3">المبلغ</th>
                    <th className="px-4 py-3">تاريخ الاستحقاق</th><th className="px-4 py-3 text-center">الحالة</th>
                    <th className="px-4 py-3 text-center">إجراء</th>
                  </tr></thead>
                  <tbody>
                    {rentalInvoices.slice(0,30).map(inv=>(
                      <tr key={inv.id} className="bg-white border border-slate-100 rounded-xl shadow-sm hover:shadow-md transition-all">
                        <td className="px-4 py-4 text-xs font-black text-slate-400">{inv.invoice_number}</td>
                        <td className="px-4 py-4 font-bold text-slate-900">{inv.tenant_name}</td>
                        <td className="px-4 py-4 text-sm text-slate-600">{inv.period_month}/{inv.period_year}</td>
                        <td className="px-4 py-4 font-black font-mono text-slate-900">{Number(inv.amount).toLocaleString()}</td>
                        <td className="px-4 py-4 text-xs text-slate-500">{inv.due_date?.split('T')[0]}</td>
                        <td className="px-4 py-4 text-center">
                          <span className={`px-3 py-1 rounded-xl text-xs font-black border ${inv.status==='Paid'?'bg-emerald-50 text-emerald-700 border-emerald-200':inv.status==='Overdue'?'bg-rose-50 text-rose-700 border-rose-200':'bg-amber-50 text-amber-700 border-amber-200'}`}>
                            {inv.status==='Paid'?'✅ مدفوع':inv.status==='Overdue'?'⚠️ متأخر':'⏳ معلق'}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          {inv.status !== 'Paid' && (
                            <button
                              onClick={async()=>{
                                const method = prompt('طريقة الدفع؟ (Cash/Transfer/Cheque)', 'Cash');
                                if(!method) return;
                                try {
                                  await api.post(`/real-estate/rental-invoices/${inv.id}/pay`, { payment_method: method });
                                  const r2 = await api.get('/real-estate/rental-invoices');
                                  setRentalInvoices(r2.data?.data||[]);
                                  alert('✅ تم تسجيل الدفع والقيد المحاسبي');
                                } catch(err){alert(err?.response?.data?.error||'خطأ');}
                              }}
                              className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-xs font-black hover:bg-emerald-600 transition-all"
                            >تحصيل</button>
                          )}
                        </td>
                      </tr>
                    ))}
                    {rentalInvoices.length===0 && <tr><td colSpan="7" className="text-center py-10 text-slate-400 font-black text-sm">لا توجد فواتير — اضغط "توليد فاتورة" من قائمة العقود</td></tr>}
                  </tbody>
                </table>
              </div>

              {/* Add Rental Contract Form */}
              {isRentalFormOpen && (
                <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl flex items-center justify-center z-[100] p-4 overflow-y-auto">
                  <div className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl p-10 my-8">
                    <div className="flex justify-between items-center mb-8">
                      <h3 className="text-xl font-black text-slate-900">عقد إيجار جديد</h3>
                      <button onClick={()=>setIsRentalFormOpen(false)} className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-900 hover:text-white transition-all">✕</button>
                    </div>
                    <form onSubmit={async(e)=>{
                      e.preventDefault();
                      try {
                        await api.post('/real-estate/rental-contracts', rentalForm);
                        fetchData();
                        setIsRentalFormOpen(false);
                        setRentalForm({project_id:'',unit_id:'',tenant_name:'',tenant_phone:'',monthly_rent:'',annual_increment_pct:10,security_deposit:'',deposit_paid:false,start_date:'',end_date:'',payment_day:1,notes:''});
                      } catch(err){alert(err?.response?.data?.error||'خطأ');}
                    }} className="space-y-4">
                      <select required value={rentalForm.project_id} onChange={e=>setRentalForm({...rentalForm,project_id:e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-slate-900">
                        <option value="">-- المشروع --</option>
                        {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                      <select value={rentalForm.unit_id} onChange={e=>setRentalForm({...rentalForm,unit_id:e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-slate-900">
                        <option value="">-- الوحدة (اختياري) --</option>
                        {units.filter(u=>!rentalForm.project_id||u.project_id==rentalForm.project_id).map(u=><option key={u.id} value={u.id}>{u.unit_number} ({u.area} م²)</option>)}
                      </select>
                      <input required placeholder="اسم المستأجر" value={rentalForm.tenant_name} onChange={e=>setRentalForm({...rentalForm,tenant_name:e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-slate-900"/>
                      <input placeholder="رقم الهاتف" value={rentalForm.tenant_phone} onChange={e=>setRentalForm({...rentalForm,tenant_phone:e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-slate-900"/>
                      <div className="grid grid-cols-2 gap-3">
                        <input required type="number" placeholder="الإيجار الشهري (EGP)" value={rentalForm.monthly_rent} onChange={e=>setRentalForm({...rentalForm,monthly_rent:e.target.value})} className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-slate-900"/>
                        <input type="number" placeholder="ضمان (EGP)" value={rentalForm.security_deposit} onChange={e=>setRentalForm({...rentalForm,security_deposit:e.target.value})} className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-slate-900"/>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <input required type="date" placeholder="تاريخ البداية" value={rentalForm.start_date} onChange={e=>setRentalForm({...rentalForm,start_date:e.target.value})} className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-slate-900"/>
                        <input required type="date" placeholder="تاريخ النهاية" value={rentalForm.end_date} onChange={e=>setRentalForm({...rentalForm,end_date:e.target.value})} className="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-slate-900"/>
                      </div>
                      <div className="flex items-center gap-3">
                        <input type="number" placeholder="زيادة سنوية %" value={rentalForm.annual_increment_pct} onChange={e=>setRentalForm({...rentalForm,annual_increment_pct:e.target.value})} className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-slate-900"/>
                        <label className="flex items-center gap-2 text-sm font-black text-slate-600 cursor-pointer">
                          <input type="checkbox" checked={rentalForm.deposit_paid} onChange={e=>setRentalForm({...rentalForm,deposit_paid:e.target.checked})} className="w-4 h-4"/>
                          الضمان محصل
                        </label>
                      </div>
                      <textarea placeholder="ملاحظات" value={rentalForm.notes} onChange={e=>setRentalForm({...rentalForm,notes:e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-slate-900 h-20 resize-none"/>
                      <button type="submit" className="w-full py-4 bg-slate-900 text-white rounded-xl font-black hover:bg-slate-800 transition-all">حفظ عقد الإيجار</button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Project Modal */}
      {isProjectModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl flex items-center justify-center z-[100] p-4 animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-white/20 overflow-hidden transform transition-all scale-100">
            <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-white/50 backdrop-blur-md">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">{editingProject ? cur.editProject : cur.addNewProject}</h3>
                <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.3em] mt-1">Real Estate Development Unit</p>
              </div>
              <button onClick={() => setIsProjectModalOpen(false)} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-slate-50 hover:bg-slate-900 hover:text-white text-slate-400 transition-all duration-300 shadow-sm border border-slate-200">✕</button>
            </div>
            <form onSubmit={handleProjectSubmit} className="p-10 space-y-8">
              <div className="space-y-3">
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">{cur.centralProject} *</label>
                <div className="relative group">
                  <select 
                    value={projectForm.name} 
                    onChange={(e) => setProjectForm({...projectForm, name: e.target.value})} 
                    required 
                    className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-base font-bold text-slate-900 focus:bg-white focus:border-slate-900 outline-none transition-all appearance-none shadow-inner"
                  >
                    <option value="">-- {cur.centralProject} --</option>
                    {mainProjects.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                  </select>
                  <div className={`absolute inset-y-0 ${language === 'ar' ? 'left-6' : 'right-6'} flex items-center pointer-events-none text-slate-300 group-focus-within:text-slate-900 transition-colors`}>▼</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">{cur.type}</label>
                  <div className="relative group">
                    <select 
                      value={projectForm.type} 
                      onChange={(e) => setProjectForm({...projectForm, type: e.target.value})} 
                      className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-base font-bold text-slate-900 focus:bg-white focus:border-slate-900 outline-none transition-all appearance-none shadow-inner"
                    >
                      <option value="Building">{cur.building}</option>
                      <option value="Compound">{cur.compound}</option>
                      <option value="Mall">{cur.mall}</option>
                    </select>
                    <div className={`absolute inset-y-0 ${language === 'ar' ? 'left-6' : 'right-6'} flex items-center pointer-events-none text-slate-300 group-focus-within:text-slate-900 transition-colors`}>▼</div>
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">{cur.unitCount}</label>
                  <input 
                    type="number" 
                    value={projectForm.total_units} 
                    onChange={(e) => setProjectForm({...projectForm, total_units: e.target.value})} 
                    className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-base font-black text-slate-900 focus:bg-white focus:border-slate-900 outline-none transition-all font-mono shadow-inner" 
                  />
                </div>
              </div>
              <div className="space-y-3">
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">{cur.location}</label>
                <input 
                  type="text" 
                  value={projectForm.location} 
                  onChange={(e) => setProjectForm({...projectForm, location: e.target.value})} 
                  className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-base font-bold text-slate-900 focus:bg-white focus:border-slate-900 outline-none transition-all shadow-inner" 
                  placeholder={cur.location}
                />
              </div>
              <div className="pt-6">
                <button 
                  type="submit" 
                  disabled={isSubmitting} 
                  className="w-full bg-slate-900 text-white py-5 rounded-[1.5rem] font-black text-base hover:bg-slate-800 transition-all shadow-2xl shadow-slate-900/30 active:scale-[0.98] hover:-translate-y-1"
                >
                  {isSubmitting ? cur.loading : cur.saveProject}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Unit Modal */}
      {isUnitModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl flex items-center justify-center z-[100] p-4 animate-fade-in">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-white/20 overflow-hidden transform transition-all scale-100">
            <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-white/50 backdrop-blur-md">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">{editingUnit ? cur.editUnit : cur.addUnit}</h3>
                <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.3em] mt-1">Property Unit Details</p>
              </div>
              <button onClick={() => setIsUnitModalOpen(false)} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-slate-50 hover:bg-slate-900 hover:text-white text-slate-400 transition-all duration-300 shadow-sm border border-slate-200">✕</button>
            </div>
            <form onSubmit={handleUnitSubmit} className="p-10 space-y-8">
              <div className="space-y-3">
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">{cur.projects}</label>
                <div className="relative group">
                  <select 
                    value={unitForm.project_id} 
                    onChange={(e) => setUnitForm({...unitForm, project_id: e.target.value})} 
                    required 
                    className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-base font-bold text-slate-900 focus:bg-white focus:border-slate-900 outline-none transition-all appearance-none shadow-inner"
                  >
                    <option value="">-- {cur.centralProject} --</option>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                  <div className={`absolute inset-y-0 ${language === 'ar' ? 'left-6' : 'right-6'} flex items-center pointer-events-none text-slate-300 group-focus-within:text-slate-900 transition-colors`}>▼</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">{cur.unitNumber}</label>
                  <input 
                    type="text" 
                    value={unitForm.unit_number} 
                    onChange={(e) => setUnitForm({...unitForm, unit_number: e.target.value})} 
                    required 
                    className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-base font-black text-slate-900 focus:bg-white focus:border-slate-900 outline-none transition-all font-mono shadow-inner" 
                  />
                </div>
                <div className="space-y-3">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">{cur.type}</label>
                  <div className="relative group">
                    <select 
                      value={unitForm.type} 
                      onChange={(e) => setUnitForm({...unitForm, type: e.target.value})} 
                      className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-base font-bold text-slate-900 focus:bg-white focus:border-slate-900 outline-none transition-all appearance-none shadow-inner"
                    >
                      <option value="Apartment">شقة</option>
                      <option value="Villa">فيلا</option>
                      <option value="Shop">محل تجاري</option>
                      <option value="Office">مكتب</option>
                    </select>
                    <div className={`absolute inset-y-0 ${language === 'ar' ? 'left-6' : 'right-6'} flex items-center pointer-events-none text-slate-300 group-focus-within:text-slate-900 transition-colors`}>▼</div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-6">
                <div className="space-y-3">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">{cur.area}</label>
                  <input 
                    type="number" 
                    value={unitForm.area} 
                    onChange={(e) => setUnitForm({...unitForm, area: e.target.value})} 
                    className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-base font-black text-slate-900 focus:bg-white focus:border-slate-900 outline-none transition-all font-mono shadow-inner text-center" 
                  />
                </div>
                <div className="space-y-3">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">{cur.floor}</label>
                  <input 
                    type="number" 
                    value={unitForm.floor} 
                    onChange={(e) => setUnitForm({...unitForm, floor: e.target.value})} 
                    className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-base font-black text-slate-900 focus:bg-white focus:border-slate-900 outline-none transition-all font-mono shadow-inner text-center" 
                  />
                </div>
                <div className="space-y-3">
                  <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">{cur.price}</label>
                  <input 
                    type="number" 
                    value={unitForm.price} 
                    onChange={(e) => setUnitForm({...unitForm, price: e.target.value})} 
                    className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-base font-black text-slate-900 focus:bg-white focus:border-slate-900 outline-none transition-all font-mono shadow-inner text-center" 
                  />
                </div>
              </div>
              <div className="pt-6">
                <button 
                  type="submit" 
                  disabled={isSubmitting} 
                  className="w-full bg-slate-900 text-white py-5 rounded-[1.5rem] font-black text-base hover:bg-slate-800 transition-all shadow-2xl shadow-slate-900/30 active:scale-[0.98] hover:-translate-y-1"
                >
                  {isSubmitting ? cur.loading : cur.saveUnit}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Modal */}
      {isPayModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl flex items-center justify-center z-[100] p-4 animate-fade-in">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl border border-emerald-100 overflow-hidden transform transition-all scale-100">
            <div className="px-10 py-8 border-b border-emerald-50 flex justify-between items-center bg-emerald-50/30 backdrop-blur-md">
              <div>
                <h3 className="text-2xl font-black text-emerald-900 tracking-tight">{cur.collectInstallment}</h3>
                <p className="text-emerald-600 font-black text-[10px] uppercase tracking-[0.3em] mt-1">{cur.paymentProcess}</p>
              </div>
              <button onClick={() => setIsPayModalOpen(false)} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white hover:bg-emerald-600 hover:text-white text-emerald-400 transition-all duration-300 shadow-md border border-emerald-100">✕</button>
            </div>
            <form onSubmit={handlePaySubmit} className="p-10 space-y-8">
              <div className="text-center p-10 bg-emerald-50/50 rounded-[2rem] border-2 border-emerald-100/50 mb-4 shadow-inner">
                <p className="text-[11px] font-black text-emerald-800/40 uppercase tracking-[0.3em] mb-4">{cur.dueAmount}</p>
                <p className="text-5xl font-black text-emerald-900 font-mono tracking-tighter shadow-sm">{selectedInst ? Number(selectedInst.amount).toLocaleString() : 0}</p>
                <p className="text-xs font-black text-emerald-800/60 mt-2 uppercase tracking-widest tracking-tighter">EGP CURRENCY</p>
              </div>
              <div className="space-y-3">
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">{cur.paymentMethod}</label>
                <div className="relative group">
                  <select 
                    value={payForm.payment_method} 
                    onChange={(e) => setPayForm({...payForm, payment_method: e.target.value})} 
                    className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-base font-bold text-slate-900 focus:bg-white focus:border-emerald-500 outline-none transition-all appearance-none shadow-inner"
                  >
                    <option value="Cash">{cur.cash}</option>
                    <option value="Bank">{cur.bankDeposit}</option>
                    <option value="Transfer">{cur.transfer}</option>
                    <option value="Wallet">{cur.wallet}</option>
                  </select>
                  <div className={`absolute inset-y-0 ${language === 'ar' ? 'left-6' : 'right-6'} flex items-center pointer-events-none text-slate-300 group-focus-within:text-emerald-500 transition-colors`}>▼</div>
                </div>
              </div>
              <div className="space-y-3">
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">{cur.referenceNo}</label>
                <input 
                  type="text" 
                  value={payForm.reference_no} 
                  onChange={(e) => setPayForm({...payForm, reference_no: e.target.value})} 
                  className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-base font-black text-slate-900 focus:bg-white focus:border-emerald-500 outline-none transition-all font-mono shadow-inner" 
                  placeholder={cur.refPlaceholder} 
                />
              </div>

              <div className="pt-6">
                <button 
                  type="submit" 
                  disabled={isSubmitting} 
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-5 rounded-[1.5rem] font-black shadow-[0_20px_40px_-15px_rgba(16,185,129,0.3)] transition-all text-base uppercase tracking-[0.2em] disabled:opacity-50 active:scale-[0.98] hover:-translate-y-1"
                >
                   {isSubmitting ? cur.loading : cur.confirmCollection}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contract Modal */}
      {isContractModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl flex items-center justify-center z-[100] p-4 animate-fade-in">
          <div className="bg-white w-full max-w-5xl rounded-[3rem] shadow-2xl border border-white/20 overflow-hidden transform transition-all scale-100">
            <div className="px-12 py-10 border-b border-slate-100 flex justify-between items-center bg-white/50 backdrop-blur-md">
              <div>
                <h3 className="text-3xl font-black text-slate-900 tracking-tight">{cur.createContract}</h3>
                <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.4em] mt-2">{cur.contractWizard}</p>
              </div>
              <button onClick={() => setIsContractModalOpen(false)} className="w-14 h-14 flex items-center justify-center rounded-[1.5rem] bg-slate-50 hover:bg-slate-900 hover:text-white text-slate-400 transition-all duration-300 shadow-sm border border-slate-200 text-xl font-black">✕</button>
            </div>
            <form onSubmit={handleContractSubmit} className="p-12">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-12">
                <div className="space-y-8">
                  <div className="space-y-3">
                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">{cur.selectedUnit} *</label>
                    <div className="relative group">
                      <select 
                        value={contractForm.unit_id} 
                        onChange={(e) => setContractForm({...contractForm, unit_id: e.target.value})} 
                        required 
                        className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-base font-bold text-slate-900 focus:bg-white focus:border-slate-900 outline-none transition-all appearance-none shadow-inner"
                      >
                        <option value="">-- {cur.unit} --</option>
                        {units.filter(u => u.status === 'Available' || u.id === contractForm.unit_id).map(u => (
                          <option key={u.id} value={u.id}>{u.unit_number} - {u.project_name}</option>
                        ))}
                      </select>
                      <div className={`absolute inset-y-0 ${language === 'ar' ? 'left-6' : 'right-6'} flex items-center pointer-events-none text-slate-300 group-focus-within:text-slate-900 transition-colors`}>▼</div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">{cur.customer} *</label>
                      <button 
                        type="button"
                        onClick={() => {
                          const name = prompt(language === 'ar' ? 'اسم العميل الجديد:' : 'New Customer Name:');
                          if (!name) return;
                          const phone = prompt(language === 'ar' ? 'رقم الهاتف (اختياري):' : 'Phone Number (Optional):') || '';
                          handleQuickAddCustomer(name, phone);
                        }}
                        className="text-xs font-black text-violet-600 hover:text-slate-950 transition-colors uppercase tracking-wider"
                      >
                        + {language === 'ar' ? 'عميل جديد' : 'New Customer'}
                      </button>
                    </div>
                    <div className="relative group">
                      <select 
                        value={contractForm.customer_id} 
                        onChange={(e) => setContractForm({...contractForm, customer_id: e.target.value})} 
                        required 
                        className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-base font-bold text-slate-900 focus:bg-white focus:border-slate-900 outline-none transition-all appearance-none shadow-inner"
                      >
                        <option value="">-- {cur.customer} --</option>
                        {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      <div className={`absolute inset-y-0 ${language === 'ar' ? 'left-6' : 'right-6'} flex items-center pointer-events-none text-slate-300 group-focus-within:text-slate-900 transition-colors`}>▼</div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">{cur.date}</label>
                    <input 
                      type="date" 
                      value={contractForm.contract_date} 
                      onChange={(e) => setContractForm({...contractForm, contract_date: e.target.value})} 
                      className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-base font-bold text-slate-900 focus:bg-white focus:border-slate-900 outline-none transition-all shadow-inner" 
                    />
                  </div>
                </div>
                <div className="space-y-8">
                  <div className="space-y-3">
                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">{cur.totalPrice} *</label>
                    <input 
                      type="number" 
                      name="total_price"
                      value={contractForm.total_price} 
                      onChange={(e) => setContractForm({...contractForm, total_price: e.target.value})} 
                      required 
                      className="w-full px-8 py-5 bg-slate-900/5 border-2 border-slate-200 rounded-2xl text-2xl font-black text-slate-900 focus:bg-white focus:border-slate-900 outline-none transition-all font-mono tracking-tighter shadow-inner" 
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-3">
                      <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">{cur.downPayment}</label>
                      <input 
                        type="number" 
                        name="down_payment"
                        value={contractForm.down_payment} 
                        onChange={(e) => setContractForm({...contractForm, down_payment: e.target.value})} 
                        className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-base font-black text-slate-900 focus:bg-white focus:border-slate-900 outline-none transition-all font-mono shadow-inner" 
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">{cur.installmentYears}</label>
                      <input 
                        type="number" 
                        value={contractForm.installment_years} 
                        onChange={(e) => setContractForm({...contractForm, installment_years: e.target.value})} 
                        className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-base font-black text-slate-900 focus:bg-white focus:border-slate-900 outline-none transition-all font-mono shadow-inner text-center" 
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] ml-2">{cur.frequency}</label>
                    <div className="relative group">
                      <select 
                        value={contractForm.frequency} 
                        onChange={(e) => setContractForm({...contractForm, frequency: e.target.value})} 
                        className="w-full px-6 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-base font-bold text-slate-900 focus:bg-white focus:border-slate-900 outline-none transition-all appearance-none shadow-inner"
                      >
                        <option value="Monthly">{cur.monthly}</option>
                        <option value="Quarterly">{cur.quarterly}</option>
                        <option value="Semi-Annual">{cur.semiAnnual}</option>
                        <option value="Annual">{cur.annual}</option>
                      </select>
                      <div className={`absolute inset-y-0 ${language === 'ar' ? 'left-6' : 'right-6'} flex items-center pointer-events-none text-slate-300 group-focus-within:text-slate-900 transition-colors`}>▼</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="pt-10 border-t border-slate-100 flex justify-end">
                <button 
                  type="submit" 
                  disabled={isSubmitting} 
                  className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black text-xl hover:bg-slate-800 transition-all shadow-2xl shadow-slate-900/30 active:scale-[0.98] hover:-translate-y-1"
                >
                  {isSubmitting ? cur.loading : cur.saveContract}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
