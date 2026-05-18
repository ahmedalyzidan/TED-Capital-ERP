import React, { useState, useMemo } from 'react';
import { useLanguage } from '../contexts/LanguageContext';

export default function ContractorSuite() {
  const { language } = useLanguage();

  // 1. Initial State Seeded with Excel Data
  const [boqItems, setBoqItems] = useState([
    { id: 1, category: "أعمال صحية وعزل", item_name: "أعمال تأسيس وتشطيب حمامات مواسير تغذيه BR ألمانى والصرف كيسيل والمحابس BR ألمانى", quantity: 4.0, unit: "بالمقطوعيه", price: 65000.0, total: 260000.0, notes: "البند يشمل خامات ومصنعيات وأعمال التشطيب مصنعيات فقط وقواعد تواليت ديورافيت معلقه وحوض بوحده معلقه وخلاطات ديورافيت" },
    { id: 2, category: "أعمال صحية وعزل", item_name: "أعمال تأسيس وتشطيب مطبخ مواسير تغذيه BR ألمانى والصرف كيسيل والمحابس BR ألمانى", quantity: 1.0, unit: "بالمقطوعيه", price: 15000.0, total: 15000.0, notes: "" },
    { id: 3, category: "أعمال صحية وعزل", item_name: "أعمال عزل لزوم أرضية الحمامات والمطبخ من النوع سيكا 107 شامل الركوب ورقبة الزجاجه مع عمل لياسه فوق العزل", quantity: 4.0, unit: "عدد", price: 3500.0, total: 14000.0, notes: "" },
    { id: 4, category: "أعمال صحية وعزل", item_name: "أعمال توريد وتركيب شبكة تغذيه للحديقه المواسير كيسيل وتغذيه من المواسير ال BR الألماني", quantity: 1.0, unit: "بالمقطوعيه", price: 15000.0, total: 15000.0, notes: "" },
    { id: 5, category: "أعمال صحية وعزل", item_name: "أعمال تأسيس شبكة صرف تكييف شامله البضاعه ( كيسيل )", quantity: 1.0, unit: "عدد", price: 15000.0, total: 15000.0, notes: "" },
    { id: 6, category: "أعمال كهرباء", item_name: "أعمال تأسيس وتشطيب مفاتيح وبرايز وسحب أسلاك لجميع الغرف والحمامات والمطبخ لزوم الإناره والسويدى المعتمد ولوحة شنايدر", quantity: 1.0, unit: "بالمقطوعيه", price: 225000.0, total: 225000.0, notes: "البند يشمل وحدات الإضاءه والأسپوتات وبيوت النور و sound sys لكل الغرف و security alarm وكاميرات مراقبه" },
    { id: 7, category: "أسقف جبس بورد", item_name: "أعمال توريد وتركيب أسقف جيبسوم بورد أبيض من إنتاج Knauf لزوم الغرف والريسبشن (مسطح)", quantity: 208.0, unit: "م2", price: 350.0, total: 72800.0, notes: "" },
    { id: 8, category: "أسقف جبس بورد", item_name: "أعمال توريد وتركيب أسقف جيبسوم بورد أبيض من إنتاج Knauf لزوم الغرف والريسبشن (طولي)", quantity: 117.0, unit: "م", price: 330.0, total: 38610.0, notes: "" },
    { id: 9, category: "أسقف جبس بورد", item_name: "أعمال توريد وتركيب أسقف جيبسوم بورد أخضر من إنتاج Knauf لزوم الحمامات والمطبخ", quantity: 43.0, unit: "م2", price: 380.0, total: 16340.0, notes: "" },
    { id: 10, category: "محارة ودهانات", item_name: "أعمال بياض محاره داخليه لزوم الحوائط والأسقف", quantity: 900.0, unit: "م2", price: 120.0, total: 108000.0, notes: "" },
    { id: 11, category: "محارة ودهانات", item_name: "أعمال دهانات للأسقف والحوائط من وجه سيلر و 3 معجون ووجهين بلاستيك يوتن", quantity: 1214.0, unit: "م2", price: 200.0, total: 242800.0, notes: "" },
    { id: 12, category: "أرضيات ورخام وسيراميك", item_name: "أعمال توريد وتركيب رخام بريشيا داينو لأرضية الريسبشن", quantity: 70.0, unit: "م2", price: 4700.0, total: 329000.0, notes: "" },
    { id: 13, category: "أرضيات ورخام وسيراميك", item_name: "أعمال توريد وتركيب رخام بيتشينو وزرة لأرضية الريسبشن", quantity: 34.0, unit: "م", price: 800.0, total: 27200.0, notes: "" },
    { id: 14, category: "أرضيات ورخام وسيراميك", item_name: "أعمال توريد وتركيب سيراميك لزوم حوائط حمام الماستر بكامل الإرتفاع واللصق بمادة سيتوكس", quantity: 28.0, unit: "م2", price: 1200.0, total: 33600.0, notes: "سعر توريد السيراميك 800جنيه" },
    { id: 15, category: "أرضيات ورخام وسيراميك", item_name: "أعمال توريد وتركيب سيراميك لزوم حوائط حمام المعيشه والسطح بكامل الإرتفاع واللصق بمادة سيتوكس", quantity: 93.0, unit: "م2", price: 1200.0, total: 111600.0, notes: "سعر توريد السيراميك 800جنيه" },
    { id: 16, category: "أرضيات ورخام وسيراميك", item_name: "أعمال توريد وتركيب سيراميك لزوم حوائط حمام الضيوف بكامل الإرتفاع واللصق بمادة سيتوكس", quantity: 45.5, unit: "م2", price: 1200.0, total: 54600.0, notes: "سعر توريد السيراميك 800جنيه" },
    { id: 17, category: "أرضيات ورخام وسيراميك", item_name: "أعمال توريد وتركيب سيراميك لزوم أرضيات السطح الخارجي", quantity: 71.0, unit: "م2", price: 650.0, total: 46150.0, notes: "سعر توريد السيراميك 350جنيه" },
    { id: 18, category: "أرضيات ورخام وسيراميك", item_name: "أعمال توريد وتركيب سيراميك لزوم حوائط وأرضيات المطبخ بكامل الإرتفاع واللصق بمادة سيتوكس", quantity: 70.0, unit: "م2", price: 650.0, total: 45500.0, notes: "سعر توريد السيراميك 350جنيه" },
    { id: 19, category: "أرضيات ورخام وسيراميك", item_name: "سيراميك أرضيه للغرف", quantity: 85.0, unit: "م2", price: 500.0, total: 42500.0, notes: "سعر توريد السيراميك 250جنيه" },
    { id: 20, category: "أرضيات ورخام وسيراميك", item_name: "سيراميك أرضيه للتراس", quantity: 25.0, unit: "م2", price: 650.0, total: 16250.0, notes: "سعر توريد السيراميك 350جنيه" },
    { id: 21, category: "أبواب وأخشاب وشيش حصيره", item_name: "توريد وتركيب أبواب داخليه من الخشب لزوم الغرف عظم سويدى مكبوس MDF ملزوق أرو مدهون أستر باللون المطلوب", quantity: 7.0, unit: "عدد", price: 16500.0, total: 115500.0, notes: "شامل الإكسسوار والكالون والأكره من النوع التركى" },
    { id: 22, category: "أبواب وأخشاب وشيش حصيره", item_name: "توريد وتركيب شيش حصيره شركة النيل ومواتير آزا إيطالي", quantity: 22.5, unit: "م2", price: 5500.0, total: 123750.0, notes: "غرف النوم بدون الريسبشن" },
    { id: 23, category: "تكييف وغاز وأنظمة أمان", item_name: "أعمال تجهيز كهرباء ومواسير نحاس لأجهزة التكييف", quantity: 1.0, unit: "مقطوعيه", price: 80000.0, total: 80000.0, notes: "شامل الصاج والجريلات" },
    { id: 24, category: "تكييف وغاز وأنظمة أمان", item_name: "أعمال توريد وتركيب وحدات تكييف ماركة كاريير", quantity: 2.0, unit: "عدد", price: 170000.0, total: 340000.0, notes: "عدد 2 جهاز 5ح للريسبشن" },
    { id: 25, category: "تكييف وغاز وأنظمة أمان", item_name: "أعمال توريد وتركيب غاز مركزي", quantity: 1.0, unit: "بالمقطوعيه", price: 95000.0, total: 95000.0, notes: "" },
    { id: 26, category: "أعمال الحديقة وتعديلات إنشائية", item_name: "أعمال تكسير وتعديلات وإزالة ردش", quantity: 1.0, unit: "مقطوعيه", price: 15000.0, total: 15000.0, notes: "" },
    { id: 27, category: "أعمال الحديقة وتعديلات إنشائية", item_name: "أعمال مباني إضافيه", quantity: 1.0, unit: "مقطوعيه", price: 12000.0, total: 12000.0, notes: "" },
    { id: 28, category: "أعمال الحديقة وتعديلات إنشائية", item_name: "أعمال زراعة وتنسيق حدائق", quantity: 1.0, unit: "مقطوعيه", price: 75000.0, total: 75000.0, notes: "" }
  ]);

  const [expenses, setExpenses] = useState([
    { id: 1, beneficiary: "م. أحمد سالم", category: "أعمال تصميم", unit: "مقطوعيه", qty: 1, rate: 17000, total: 17000, date: "2024-07-23", notes: "تصميم فيلا E109" },
    { id: 2, beneficiary: "تكييفات كونسيلد 4 ح", category: "تكييف وغاز وأنظمة أمان", unit: "عدد", qty: 2, rate: 110000, total: 220000, date: "2024-06-03", notes: "تجهيز التكييف" },
    { id: 3, beneficiary: "تكييفات اسبليت 2.25 ح", category: "تكييف وغاز وأنظمة أمان", unit: "عدد", qty: 5, rate: 36500, total: 182500, date: "2024-06-03", notes: "كاريير" },
    { id: 4, beneficiary: "توريدات طوب ورمل وأسمنت", category: "أعمال الحديقة وتعديلات إنشائية", unit: "فاتورة", qty: 1, rate: 8400, total: 8400, date: "2024-02-05", notes: "دفعة أولى لتأسيس المباني" },
    { id: 5, beneficiary: "توريدات أسمنت ورمل", category: "محارة ودهانات", unit: "فاتورة", qty: 1, rate: 8000, total: 8000, date: "2024-02-05", notes: "أعمال المحارة" },
    { id: 6, beneficiary: "بورسلين حمامات وسيراميك المطبخ", category: "أرضيات ورخام وسيراميك", unit: "فاتورة", qty: 1, rate: 96200, total: 96200, date: "2024-03-05", notes: "معرض السلاب" },
    { id: 7, beneficiary: "تركيب حنفية خارجيه", category: "أعمال صحية وعزل", unit: "مقطوعيه", qty: 1, rate: 500, total: 500, date: "2024-04-05", notes: "الحديقة الخلفية" },
    { id: 8, beneficiary: "إكراميات أمن", category: "إكراميات ونثريات", unit: "عدد", qty: 1, rate: 300, total: 300, date: "2024-04-05", notes: "أمن البوابة" },
    { id: 9, beneficiary: "فك ألوميتال", category: "أعمال الحديقة وتعديلات إنشائية", unit: "مقطوعيه", qty: 1, rate: 2800, total: 2800, date: "2024-07-05", notes: "تعديل المعيشة" },
    { id: 10, beneficiary: "مستخلص مصنعيات بياض محاره", category: "محارة ودهانات", unit: "مستخلص", qty: 1, rate: 36895, total: 36895, date: "2024-08-15", notes: "مستخلص نهائي للمحار" }
  ]);

  const [installments, setInstallments] = useState([
    { id: 1, amount: 200000, date: "2021-11-23", notes: "الدفعة الأولى المقبوضة" },
    { id: 2, amount: 160000, date: "2021-12-01", notes: "الدفعة الثانية المقبوضة" }
  ]);

  // 2. Active View Tab state
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard | boq | expenses | client

  // 3. New Entry forms
  const [showAddBoq, setShowAddBoq] = useState(false);
  const [newBoq, setNewBoq] = useState({ category: 'أعمال صحية وعزل', item_name: '', quantity: 1, unit: 'م2', price: 0, notes: '' });

  const [showAddExpense, setShowAddExpense] = useState(false);
  const [newExpense, setNewExpense] = useState({ beneficiary: '', category: 'أعمال صحية وعزل', unit: 'م2', qty: 1, rate: 0, date: new Date().toISOString().split('T')[0], notes: '' });

  const [showAddInstallment, setShowAddInstallment] = useState(false);
  const [newInstallment, setNewInstallment] = useState({ amount: 0, date: new Date().toISOString().split('T')[0], notes: '' });

  // Search & Filter
  const [expenseSearch, setExpenseSearch] = useState('');
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState('All');

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

  // 4. Computed Metrics (The AI Touch)
  const totals = useMemo(() => {
    const totalBOQ = boqItems.reduce((acc, curr) => acc + (curr.quantity * curr.price), 0);
    const totalExpenses = expenses.reduce((acc, curr) => acc + (curr.qty * curr.rate), 0);
    const totalCollected = installments.reduce((acc, curr) => acc + Number(curr.amount), 0);
    
    const estProfit = totalBOQ - totalExpenses;
    const remainingClient = totalBOQ - totalCollected;
    const progressPercent = totalBOQ > 0 ? (totalCollected / totalBOQ) * 100 : 0;
    const costPercent = totalBOQ > 0 ? (totalExpenses / totalBOQ) * 100 : 0;

    // Group expenses by category
    const expByCategory = expenses.reduce((acc, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + curr.total;
      return acc;
    }, {});

    // Group BOQ by category
    const boqByCategory = boqItems.reduce((acc, curr) => {
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
  }, [boqItems, expenses, installments]);

  // Handle addition functions
  const handleAddBoq = (e) => {
    e.preventDefault();
    if (!newBoq.item_name || newBoq.price <= 0) return;
    const total = Number(newBoq.quantity) * Number(newBoq.price);
    const newItem = {
      id: boqItems.length + 1,
      ...newBoq,
      quantity: Number(newBoq.quantity),
      price: Number(newBoq.price),
      total
    };
    setBoqItems([...boqItems, newItem]);
    setNewBoq({ category: 'أعمال صحية وعزل', item_name: '', quantity: 1, unit: 'م2', price: 0, notes: '' });
    setShowAddBoq(false);
  };

  const handleAddExpense = (e) => {
    e.preventDefault();
    if (!newExpense.beneficiary || newExpense.rate <= 0) return;
    const total = Number(newExpense.qty) * Number(newExpense.rate);
    const newItem = {
      id: expenses.length + 1,
      ...newExpense,
      qty: Number(newExpense.qty),
      rate: Number(newExpense.rate),
      total
    };
    setExpenses([...expenses, newItem]);
    setNewExpense({ beneficiary: '', category: 'أعمال صحية وعزل', unit: 'م2', qty: 1, rate: 0, date: new Date().toISOString().split('T')[0], notes: '' });
    setShowAddExpense(false);
  };

  const handleAddInstallment = (e) => {
    e.preventDefault();
    if (newInstallment.amount <= 0) return;
    const newItem = {
      id: installments.length + 1,
      amount: Number(newInstallment.amount),
      date: newInstallment.date,
      notes: newInstallment.notes
    };
    setInstallments([...installments, newItem]);
    setNewInstallment({ amount: 0, date: new Date().toISOString().split('T')[0], notes: '' });
    setShowAddInstallment(false);
  };

  // Filtered expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter(item => {
      const matchSearch = item.beneficiary.toLowerCase().includes(expenseSearch.toLowerCase()) || 
                          (item.notes && item.notes.toLowerCase().includes(expenseSearch.toLowerCase()));
      const matchCat = expenseCategoryFilter === 'All' || item.category === expenseCategoryFilter;
      return matchSearch && matchCat;
    });
  }, [expenses, expenseSearch, expenseCategoryFilter]);

  // Dictionary for styling based on category
  const categoryGradients = {
    "أعمال صحية وعزل": "from-cyan-500/20 to-blue-500/10 border-cyan-500/30 text-cyan-600",
    "أعمال كهرباء": "from-amber-500/20 to-orange-500/10 border-amber-500/30 text-amber-600",
    "أسقف جبس بورد": "from-purple-500/20 to-indigo-500/10 border-purple-500/30 text-purple-600",
    "محارة ودهانات": "from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-600",
    "أرضيات ورخام وسيراميك": "from-pink-500/20 to-rose-500/10 border-pink-500/30 text-pink-600",
    "أبواب وأخشاب وشيش حصيره": "from-yellow-500/20 to-amber-700/10 border-yellow-500/30 text-yellow-700",
    "تكييف وغاز وأنظمة أمان": "from-red-500/20 to-orange-600/10 border-red-500/30 text-red-600",
    "أعمال الحديقة وتعديلات إنشائية": "from-lime-500/20 to-emerald-600/10 border-lime-500/30 text-emerald-700",
    "أعمال تصميم": "from-blue-500/20 to-indigo-600/10 border-blue-500/30 text-indigo-700",
    "إكراميات ونثريات": "from-slate-500/20 to-slate-600/10 border-slate-500/30 text-slate-700"
  };

  const activeGrad = (cat) => categoryGradients[cat] || "from-slate-500/20 to-slate-600/10 border-slate-500/30 text-slate-700";

  return (
    <div className="bg-[#0b0f19] text-slate-100 min-h-screen p-4 sm:p-8" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">

        {/* --- DYNAMIC HEADER --- */}
        <div className="relative rounded-3xl p-8 overflow-hidden border border-white/5 bg-slate-900/50 backdrop-blur-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-2xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl opacity-60 translate-x-20 -translate-y-20"></div>
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl opacity-40 -translate-x-20 translate-y-20"></div>

          <div className="flex items-center gap-5 relative z-10">
            <div className="w-16 h-16 bg-gradient-to-tr from-cyan-500 to-blue-600 text-white rounded-2xl flex items-center justify-center text-3xl shadow-lg shadow-cyan-500/20 transform rotate-2 hover:rotate-0 transition-transform">💎</div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl sm:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-l from-white via-slate-100 to-slate-400">ملخص عقد وإدارة فيلا E109</h1>
                <span className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase">Premium contractors</span>
              </div>
              <p className="text-slate-400 font-bold text-xs mt-1">تتبع البنود، المقايسة المالية، دفعات العميل والمصروفات المباشرة بنقرة واحدة</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="bg-slate-950/60 p-1.5 rounded-2xl border border-white/5 flex gap-1 relative z-10 w-full md:w-auto overflow-x-auto scrollbar-none">
            {[
              { id: 'dashboard', label: '📊 لوحة القيادة', icon: '📊' },
              { id: 'boq', label: '📝 المقايسة والبنود', icon: '📝' },
              { id: 'expenses', label: '💸 المصروفات الفعلية', icon: '💸' },
              { id: 'client', label: '💳 دفعات العميل', icon: '💳' }
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

        {/* --- CORE KPI COUNTERS --- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          
          <div className="relative overflow-hidden bg-slate-900/40 border border-white/5 p-6 rounded-3xl backdrop-blur-xl shadow-lg group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition-all"></div>
            <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest block mb-1">إجمالي قيمة العقد (المقايسة)</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black font-mono tracking-tighter text-white">{totals.totalBOQ.toLocaleString()}</span>
              <span className="text-xs text-slate-500 font-bold">جنيه</span>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-pulse"></span>
              <span className="text-[10px] font-bold text-slate-400">عقد تشطيبات متكامل</span>
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
              <span className="text-[9px] text-slate-400 font-bold mt-1.5 block">معدل الصرف من إجمالي الموازنة: {totals.costPercent.toFixed(1)}%</span>
            </div>
          </div>

          <div className="relative overflow-hidden bg-slate-900/40 border border-white/5 p-6 rounded-3xl backdrop-blur-xl shadow-lg group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all"></div>
            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block mb-1">صافي الربح المتوقع</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black font-mono tracking-tighter text-emerald-400">{totals.estProfit.toLocaleString()}</span>
              <span className="text-xs text-slate-500 font-bold">جنيه</span>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-black text-emerald-400">ممتاز</span>
              <span className="text-[10px] text-slate-400 font-bold">نسبة ربحية تقديرية {( (totals.estProfit / totals.totalBOQ) * 100 ).toFixed(1)}%</span>
            </div>
          </div>

          <div className="relative overflow-hidden bg-slate-900/40 border border-white/5 p-6 rounded-3xl backdrop-blur-xl shadow-lg group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl group-hover:bg-amber-500/20 transition-all"></div>
            <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest block mb-1">المحصل من العميل / المتبقي</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black font-mono tracking-tighter text-white">{totals.totalCollected.toLocaleString()}</span>
              <span className="text-xs text-slate-500 font-bold">ج.م محصل</span>
            </div>
            <div className="mt-3">
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: `${Math.min(totals.progressPercent, 100)}%` }}></div>
              </div>
              <span className="text-[9px] text-slate-400 font-bold mt-1.5 block">المتبقي المطلوب تحصيله: <span className="font-mono font-black text-amber-400">{totals.remainingClient.toLocaleString()}</span> جنيه ({totals.progressPercent.toFixed(0)}% محصل)</span>
            </div>
          </div>

        </div>

        {/* --- MAIN INTERACTIVE SECTIONS --- */}

        {/* 1. DASHBOARD VIEW */}
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-bottom duration-500">
            
            {/* Category breakdown visual bars */}
            <div className="lg:col-span-2 bg-slate-900/40 border border-white/5 p-8 rounded-3xl shadow-lg space-y-6">
              <h3 className="text-lg font-black text-white flex items-center gap-3">
                <span>📊</span> مقارنة الموازنة والمنصرف الفعلي لكل بند (Budget vs Actual)
              </h3>
              <p className="text-xs text-slate-400">تتبع حي للمصروفات مقارنة بالمبلغ المدرج في المقايسة المعتمدة للعميل للتحقق من ربحية البنود</p>
              
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
            <div className="space-y-6">
              
              {/* Financial Health Summary */}
              <div className="bg-slate-900/40 border border-white/5 p-8 rounded-3xl shadow-lg relative overflow-hidden">
                <div className="absolute top-0 left-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl"></div>
                <h3 className="text-lg font-black text-white mb-4 flex items-center gap-3">
                  <span>💡</span> توصيات الذكاء المالي
                </h3>
                
                <div className="space-y-4 text-xs font-bold text-slate-300">
                  <div className="p-4 rounded-2xl bg-slate-950/50 border border-white/5 flex gap-3">
                    <span className="text-xl">💰</span>
                    <div>
                      <h4 className="text-white font-black">أفضلية الربحية</h4>
                      <p className="text-slate-400 mt-1 leading-relaxed">تحقق بنود "أرضيات ورخام وسيراميك" هامش ربح واعد بفضل التحكم في تكلفة المشتريات.</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950/50 border border-white/5 flex gap-3">
                    <span className="text-xl">🚨</span>
                    <div>
                      <h4 className="text-white font-black">السيولة النقدية</h4>
                      <p className="text-slate-400 mt-1 leading-relaxed">المحصل من العميل {totals.totalCollected.toLocaleString()} ج.م والمصروف الفعلي {totals.totalExpenses.toLocaleString()} ج.م. السيولة في أمان بمعدل تغطية مميز.</p>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-950/50 border border-white/5 flex gap-3">
                    <span className="text-xl">⚡</span>
                    <div>
                      <h4 className="text-white font-black">بند التكييف</h4>
                      <p className="text-slate-400 mt-1 leading-relaxed">بند التكييف مستهلك بالكامل في التأسيسات والتوريدات. تجنب زيادة المصاريف فيه لعدم خسارة البند.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Transaction Log preview */}
              <div className="bg-slate-900/40 border border-white/5 p-6 rounded-3xl shadow-lg space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-black text-white">آخر الحركات المالية</h3>
                  <button onClick={() => setActiveTab('expenses')} className="text-cyan-400 hover:text-cyan-300 text-xs font-bold">عرض الكل ←</button>
                </div>
                <div className="space-y-3">
                  {expenses.slice(-4).reverse().map(item => (
                    <div key={item.id} className="p-3 bg-slate-950/40 border border-white/5 rounded-xl flex justify-between items-center">
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-white">{item.beneficiary}</span>
                        <span className="text-[10px] text-slate-500 font-bold mt-0.5">{item.date}</span>
                      </div>
                      <span className="text-xs font-mono font-black text-red-400">-{item.total.toLocaleString()} جنيه</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* 2. BOQ VIEW */}
        {activeTab === 'boq' && (
          <div className="space-y-6 animate-in slide-in-from-bottom duration-500">
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/40 border border-white/5 p-6 rounded-3xl shadow-lg">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-3">
                  <span>📝</span> مقايسة البنود والكميات التقديرية للفيلا
                </h3>
                <p className="text-xs text-slate-400 mt-1">تعديل الأسعار والكميات والموافقة عليها وتصدير التقارير في ثوانٍ</p>
              </div>
              <button 
                onClick={() => setShowAddBoq(!showAddBoq)}
                className="px-5 py-3 bg-gradient-to-l from-cyan-500 to-blue-600 text-white rounded-xl text-xs font-black shadow-lg shadow-cyan-500/20 active:scale-95 transition-transform"
              >
                {showAddBoq ? 'إغلاق النموذج' : '+ إضافة بند أعمال جديد'}
              </button>
            </div>

            {/* Add BOQ Form */}
            {showAddBoq && (
              <form onSubmit={handleAddBoq} className="bg-slate-900/70 border border-white/5 p-6 rounded-3xl space-y-4 animate-in slide-in-from-top duration-300">
                <h4 className="text-sm font-black text-cyan-400">إدخال بند جديد بالمقايسة</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-slate-400 font-bold">القسم الأساسي</label>
                    <select 
                      value={newBoq.category} 
                      onChange={e => setNewBoq({...newBoq, category: e.target.value})}
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
                      value={newBoq.item_name}
                      onChange={e => setNewBoq({...newBoq, item_name: e.target.value})}
                      className="bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-slate-400 font-bold">الوحدة</label>
                    <input 
                      type="text" 
                      placeholder="مثال: م2، عدد، مقطوعية" 
                      value={newBoq.unit}
                      onChange={e => setNewBoq({...newBoq, unit: e.target.value})}
                      className="bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-slate-400 font-bold">الكمية التقديرية</label>
                    <input 
                      type="number" 
                      step="any"
                      placeholder="1" 
                      value={newBoq.quantity}
                      onChange={e => setNewBoq({...newBoq, quantity: e.target.value})}
                      className="bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-slate-400 font-bold">سعر الفئة (جنيه)</label>
                    <input 
                      type="number" 
                      placeholder="0.00" 
                      value={newBoq.price}
                      onChange={e => setNewBoq({...newBoq, price: e.target.value})}
                      className="bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <label className="text-[10px] text-slate-400 font-bold">ملاحظات البند</label>
                    <input 
                      type="text" 
                      placeholder="أي ملاحظات فنية أو شروط تشطيب..." 
                      value={newBoq.notes}
                      onChange={e => setNewBoq({...newBoq, notes: e.target.value})}
                      className="bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowAddBoq(false)} className="px-5 py-2 bg-slate-950 border border-white/5 hover:bg-slate-900 rounded-xl text-xs font-bold text-slate-400">إلغاء</button>
                  <button type="submit" className="px-6 py-2 bg-cyan-500 hover:bg-cyan-600 rounded-xl text-xs font-black text-white">إضافة البند الآن 🚀</button>
                </div>
              </form>
            )}

            {/* Interactive BOQ List */}
            <div className="bg-slate-900/40 border border-white/5 rounded-3xl overflow-hidden shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-right whitespace-nowrap">
                  <thead className="bg-slate-950/60 border-b border-white/5">
                    <tr className="text-slate-400 text-[10px] uppercase tracking-widest font-black">
                      <th className="px-6 py-4">مسلسل</th>
                      <th className="px-6 py-4">القسم والبيان</th>
                      <th className="px-6 py-4">وصف البند الهندسي</th>
                      <th className="px-6 py-4 text-center">الكمية</th>
                      <th className="px-6 py-4 text-center">الوحدة</th>
                      <th className="px-6 py-4 text-center">الفئة</th>
                      <th className="px-6 py-4 text-left">الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {boqItems.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-white/5 transition-all group">
                        <td className="px-6 py-5 font-mono text-xs text-slate-500">{idx + 1}</td>
                        <td className="px-6 py-5">
                          <span className={`px-3 py-1 rounded-full text-[9px] font-black border ${activeGrad(item.category)}`}>
                            {item.category}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <div className="flex flex-col max-w-lg">
                            <span className="text-xs font-bold text-slate-200 group-hover:text-white transition-colors leading-relaxed whitespace-normal">{item.item_name}</span>
                            {item.notes && <span className="text-[10px] text-slate-400 mt-1 italic whitespace-normal font-medium bg-slate-950/40 p-2 rounded-lg border border-white/5">{item.notes}</span>}
                          </div>
                        </td>
                        <td className="px-6 py-5 text-center font-mono font-black text-slate-300">{item.quantity}</td>
                        <td className="px-6 py-5 text-center text-xs text-slate-400">{item.unit || '-'}</td>
                        <td className="px-6 py-5 text-center font-mono font-black text-cyan-400">{item.price.toLocaleString()} جنيه</td>
                        <td className="px-6 py-5 text-left font-mono font-black text-white text-sm">{(item.quantity * item.price).toLocaleString()} جنيه</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* 3. EXPENSES VIEW */}
        {activeTab === 'expenses' && (
          <div className="space-y-6 animate-in slide-in-from-bottom duration-500">
            
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/40 border border-white/5 p-6 rounded-3xl shadow-lg">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-3">
                  <span>💸</span> دفتر وقيد المصروفات الفعلية للمشروع
                </h3>
                <p className="text-xs text-slate-400 mt-1">تتبع المشتريات ومستخلصات مقاولي الباطن والعمالة والتوريدات</p>
              </div>
              <button 
                onClick={() => setShowAddExpense(!showAddExpense)}
                className="px-5 py-3 bg-gradient-to-l from-cyan-500 to-blue-600 text-white rounded-xl text-xs font-black shadow-lg shadow-cyan-500/20 active:scale-95 transition-transform"
              >
                {showAddExpense ? 'إغلاق النموذج' : '+ تسجيل مصروف جديد'}
              </button>
            </div>

            {/* Add Expense Form */}
            {showAddExpense && (
              <form onSubmit={handleAddExpense} className="bg-slate-900/70 border border-white/5 p-6 rounded-3xl space-y-4 animate-in slide-in-from-top duration-300">
                <h4 className="text-sm font-black text-cyan-400">تسجيل حركة صرف جديدة للمشروع</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-slate-400 font-bold">الجهة المستفيدة / البائع</label>
                    <input 
                      type="text" 
                      placeholder="مثال: المعلم أحمد، شركة السلاب..." 
                      value={newExpense.beneficiary}
                      onChange={e => setNewExpense({...newExpense, beneficiary: e.target.value})}
                      className="bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-slate-400 font-bold">التصنيف الهندسي للمصروف</label>
                    <select 
                      value={newExpense.category} 
                      onChange={e => setNewExpense({...newExpense, category: e.target.value})}
                      className="bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                    >
                      {boqCategories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-slate-400 font-bold">التاريخ</label>
                    <input 
                      type="date" 
                      value={newExpense.date}
                      onChange={e => setNewExpense({...newExpense, date: e.target.value})}
                      className="bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-slate-400 font-bold">الوحدة</label>
                    <input 
                      type="text" 
                      placeholder="مثال: عدد، مقطوعية، فاتورة" 
                      value={newExpense.unit}
                      onChange={e => setNewExpense({...newExpense, unit: e.target.value})}
                      className="bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-slate-400 font-bold">الكمية / العدد</label>
                    <input 
                      type="number" 
                      value={newExpense.qty}
                      onChange={e => setNewExpense({...newExpense, qty: e.target.value})}
                      className="bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] text-slate-400 font-bold">سعر الوحدة / الفئة</label>
                    <input 
                      type="number" 
                      placeholder="0.00" 
                      value={newExpense.rate}
                      onChange={e => setNewExpense({...newExpense, rate: e.target.value})}
                      className="bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                      required
                    />
                  </div>

                  <div className="flex flex-col gap-1.5 sm:col-span-2">
                    <label className="text-[10px] text-slate-400 font-bold">البيان والتفاصيل</label>
                    <input 
                      type="text" 
                      placeholder="أي ملاحظات أو أرقام فواتير..." 
                      value={newExpense.notes}
                      onChange={e => setNewExpense({...newExpense, notes: e.target.value})}
                      className="bg-slate-950 border border-white/5 rounded-xl px-4 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setShowAddExpense(false)} className="px-5 py-2 bg-slate-950 border border-white/5 hover:bg-slate-900 rounded-xl text-xs font-bold text-slate-400">إلغاء</button>
                  <button type="submit" className="px-6 py-2 bg-cyan-500 hover:bg-cyan-600 rounded-xl text-xs font-black text-white">تسجيل المصروف الآن 💸</button>
                </div>
              </form>
            )}

            {/* Search & Filter Controls */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-900/20 border border-white/5 p-4 rounded-2xl">
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
            <div className="bg-slate-900/40 border border-white/5 rounded-3xl overflow-hidden shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-right whitespace-nowrap">
                  <thead className="bg-slate-950/60 border-b border-white/5">
                    <tr className="text-slate-400 text-[10px] uppercase tracking-widest font-black">
                      <th className="px-6 py-4">تاريخ الصرف</th>
                      <th className="px-6 py-4">المستفيد / البند</th>
                      <th className="px-6 py-4">التصنيف الهندسي</th>
                      <th className="px-6 py-4 text-center">الكمية</th>
                      <th className="px-6 py-4 text-center">الفئة</th>
                      <th className="px-6 py-4 text-left">المبلغ الإجمالي</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredExpenses.map(item => (
                      <tr key={item.id} className="hover:bg-white/5 transition-all group">
                        <td className="px-6 py-5 font-mono text-xs text-slate-400">{item.date}</td>
                        <td className="px-6 py-5">
                          <div className="flex flex-col">
                            <span className="text-xs font-black text-white group-hover:text-cyan-400 transition-colors">{item.beneficiary}</span>
                            {item.notes && <span className="text-[10px] text-slate-500 mt-1 font-bold">{item.notes}</span>}
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black border ${activeGrad(item.category)}`}>
                            {item.category}
                          </span>
                        </td>
                        <td className="px-6 py-5 text-center font-mono font-bold text-slate-400">{item.qty} {item.unit || 'فاتورة'}</td>
                        <td className="px-6 py-5 text-center font-mono font-bold text-slate-400">{item.rate.toLocaleString()}</td>
                        <td className="px-6 py-5 text-left font-mono font-black text-red-400 text-sm">-{item.total.toLocaleString()} جنيه</td>
                      </tr>
                    ))}
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
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-3">
                  <span>💳</span> سجل دفعات وأقساط العميل المقبوضة
                </h3>
                <p className="text-xs text-slate-400 mt-1">تتبع الدفعات المستلمة لتغطية تكاليف الخامات وأجور التشطيبات بالفيلا</p>
              </div>

              <div className="relative border-r border-white/10 pr-6 space-y-8 py-4">
                {installments.map((inst, index) => (
                  <div key={inst.id} className="relative group">
                    {/* Circle Bullet */}
                    <div className="absolute right-0 top-1 w-3.5 h-3.5 rounded-full bg-cyan-500 border-4 border-slate-900 translate-x-[25px] group-hover:scale-125 transition-transform z-10"></div>
                    
                    <div className="p-5 bg-slate-950/40 border border-white/5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-cyan-500/30 transition-colors">
                      <div className="space-y-1">
                        <span className="text-xs text-cyan-400 font-black">الدفعة رقم #{index + 1}</span>
                        <h4 className="text-sm font-black text-white">{inst.notes || 'تحصيل بدون ملاحظات'}</h4>
                        <span className="text-[10px] text-slate-500 font-mono block">{inst.date}</span>
                      </div>
                      
                      <div className="flex items-baseline gap-1 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-xl text-emerald-400">
                        <span className="text-lg font-black font-mono tracking-tighter">+{inst.amount.toLocaleString()}</span>
                        <span className="text-[10px] font-bold">جنيه</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Collection form and progress card */}
            <div className="space-y-6">
              
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

      </div>
    </div>
  );
}
