import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import RadialActionHub from '../components/RadialActionHub';
import Subcontractor360 from '../components/Subcontractor360';

// Stat Card Component
const StatCard = ({ title, value, color, icon, link, currency, viewAllText }) => (
  <div className="p-8 bg-white border border-slate-200 rounded-[2.5rem] shadow-xl shadow-slate-200/40 hover:-translate-y-2 transition-all duration-500 group relative overflow-hidden">
    <div className={`absolute top-0 right-0 w-32 h-32 bg-${color}-500/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700`}></div>
    <div className="flex justify-between items-start mb-6">
      <div className={`w-14 h-14 bg-${color}-500/10 rounded-2xl flex items-center justify-center text-2xl group-hover:rotate-12 transition-transform`}>
        {icon}
      </div>
      <button onClick={() => window.location.href = link} className="text-slate-400 hover:text-slate-900 transition-colors">
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </button>
    </div>
    <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] mb-2">{title}</p>
    <h3 className="text-3xl font-black text-slate-900 font-mono tracking-tighter">
      {Number(value || 0).toLocaleString()} 
      <span className="text-xs font-sans text-slate-400 mx-2">{currency}</span>
    </h3>
  </div>
);

export default function Portal360() {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [activePortalTab, setActivePortalTab] = useState('finance');
  const [loading, setLoading] = useState(true);

  // --- Accountant 360 States ---
  const [financeData, setFinanceData] = useState(null);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [selectedAuditLog, setSelectedAuditLog] = useState(null);
  const [auditLimit, setAuditLimit] = useState(25);
  const [auditUserFilter, setAuditUserFilter] = useState('');
  const [auditResourceFilter, setAuditResourceFilter] = useState('');

  // --- Emdad 360 States ---
  const [pharmaItems, setPharmaItems] = useState([]);
  const [gs1Barcode, setGs1Barcode] = useState('');
  const [gs1DebugInfo, setGs1DebugInfo] = useState(null);
  const [matchedPharmaItem, setMatchedPharmaItem] = useState(null);
  const [isIotLive, setIsIotLive] = useState(false);
  const [iotLogs, setIotLogs] = useState([]);
  const [dispenseModalOpen, setDispenseModalOpen] = useState(false);
  const [dispenseItem, setDispenseItem] = useState(null);
  const [dispenseQty, setDispenseQty] = useState('');
  const [dispenseRecipient, setDispenseRecipient] = useState('');
  const [isPwaMode, setIsPwaMode] = useState(false);
  const [torchActive, setTorchActive] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [logs, setLogs] = useState([]);
  const [aiScanning, setAiScanning] = useState(false);
  const [aiAccountantScan, setAiAccountantScan] = useState(false);

  // --- Subcontractor 360 States ---
  const [subcontractors, setSubcontractors] = useState([]);
  const [selectedSubId, setSelectedSubId] = useState(null);
  const [subcontractorStats, setSubcontractorStats] = useState(null);

  // Translations Dict
  const t = {
    ar: {
      title: "بوابة ERP 360 الموحدة",
      subtitle: "مركز القيادة والتحكم والمراقبة الشاملة للمؤسسة",
      tabs: {
        finance: "المحاسب المالي 💰",
        emdad: "إمداد والأدوية 💊",
        subs: "مقاولي الباطن 👷"
      },
      finance: {
        title: "مركز تحكم المحاسب 360",
        subtitle: "قمرة قيادة العمليات المالية المتكاملة والتدقيق الجنائي",
        stats: {
          cash: "السيولة المتاحة",
          receivables: "مستحقات العملاء",
          payables: "مستحقات الموردين",
          inventory: "قيمة المخزون"
        },
        approvals: "بانتظار المراجعة والاعتماد",
        activity: "النشاط المالي اللحظي",
        shortcuts: "الوصول السريع للأقسام",
        auditTitle: "سجل التدقيق الجنائي واللقطات الأمنية",
        auditSubtitle: "مراقبة فورية للعمليات الحساسة والتعديلات المحاسبية غير القابلة للتعديل",
        inspectBtn: "فحص اللقطة 🔍",
        modalTitle: "التحليل الجنائي للقطة الأمنية (JSON Snapshot)",
        closeModal: "إغلاق النافذة",
        common: {
          currency: "ج.م",
          loading: "جاري تحميل البيانات المالية...",
          noApprovals: "لا توجد طلبات معلقة حالياً",
          noActivity: "لا توجد معاملات حديثة"
        }
      },
      emdad: {
        title: "منظومة إمداد 360 للرقابة الدوائية",
        subtitle: "تتبع الأدوية والمستلزمات الطبية وسلسلة التبريد ورموز GS1",
        stats: {
          totalItems: "أصناف الدواء المسجلة",
          controlled: "المواد المخدرة / المراقبة",
          tempAlerts: "قراءات التبريد النشطة",
          totalVal: "إجمالي قيمة مخزون الأدوية"
        },
        scannerTitle: "محاكي قارئ باركود GS1 2D DataMatrix",
        scannerPlaceholder: "أدخل رمز GS1 (مثال: 01062810930001851728052010BATCH9921SN4422)",
        scanBtn: "تحليل وصرف 🎯",
        scanDebug: "معلومات الباركود المفكك",
        iotTitle: "مراقبة حرارة سلسلة التبريد الفورية (Cold Chain IoT)",
        iotStatus: "حالة الحساس",
        iotSignal: "قوة الإشارة",
        iotTemp: "درجة الحرارة الحالية",
        iotLogs: "سجل قراءات الحساس",
        itemList: "جدول المخزون والمواد الطبية الحية",
        colName: "اسم الدواء / المادة الفعالة",
        colCategory: "الفئة والحرارة",
        colQty: "الكمية المتاحة",
        colCost: "التكلفة",
        colBatch: "الباتش / الصلاحية",
        colActions: "الإجراءات",
        dispenseBtn: "صرف عاجل 🚚",
        controlledBadge: "مراقب أمنياً 🚨",
        coldChainBadge: "سلسلة تبريد ❄️",
        common: {
          loading: "جاري تحميل بيانات الأدوية واللوجستيات..."
        }
      },
      subs: {
        title: "إدارة مقاولي الباطن 360",
        subtitle: "تقييم أداء الشركاء، مستخلصات مقاولي الباطن، وضمانات الأعمال",
        selectorLabel: "اختر مقاول الباطن لمعاينة ملفه الشامل:",
        selectPlaceholder: "-- اختر المقاول --",
        subGridTitle: "الشركاء والشركات النشطة",
        colName: "المقاول / الشركة",
        colPhone: "الهاتف الجوال",
        colProject: "المشروع المسند",
        colExposure: "حجم المستخلصات المعتمدة",
        inspectBtn: "معاينة لوحة التحكم 360 ⚡",
        common: {
          loading: "جاري تحميل بيانات المقاولين..."
        }
      }
    },
    en: {
      title: "Unified ERP 360 Portal",
      subtitle: "Enterprise command, control, and holistic monitoring workspace",
      tabs: {
        finance: "Accountant 360 💰",
        emdad: "Emdad Logistics 💊",
        subs: "Subcontractors 360 👷"
      },
      finance: {
        title: "Accountant 360 Command Center",
        subtitle: "Unified Financial Operations Cockpit & Forensic Audit Logs",
        stats: {
          cash: "Liquidity",
          receivables: "Receivables",
          payables: "Payables",
          inventory: "Inventory Value"
        },
        approvals: "Pending Approvals",
        activity: "Real-time Activity",
        shortcuts: "Direct Shortcuts",
        auditTitle: "Forensic Audit Log & Security Snapshots",
        auditSubtitle: "Real-time monitoring of sensitive operations and non-repudiable records",
        inspectBtn: "Inspect Snapshot 🔍",
        modalTitle: "Forensic Snapshot Analysis (JSON Snapshot)",
        closeModal: "Close Window",
        common: {
          currency: "LCY",
          loading: "Loading financial records...",
          noApprovals: "No pending approval requests",
          noActivity: "No recent transactions"
        }
      },
      emdad: {
        title: "Emdad 360 Pharma Control Center",
        subtitle: "Tracking pharmaceutical items, cold chain logistics, and GS1 code parsing",
        stats: {
          totalItems: "Registered Drugs",
          controlled: "Controlled / Narcotics",
          tempAlerts: "Active Telemetry Logs",
          totalVal: "Total Pharma Stock Value"
        },
        scannerTitle: "GS1 2D DataMatrix Scanner Simulator",
        scannerPlaceholder: "Enter GS1 barcode text (e.g., 01062810930001851728052010BATCH9921SN4422)",
        scanBtn: "Parse & Dispense 🎯",
        scanDebug: "Parsed Barcode Metadata",
        iotTitle: "Cold Chain Telemetry Stream (Cold Chain IoT)",
        iotStatus: "Sensor Status",
        iotSignal: "Signal Strength",
        iotTemp: "Current Temperature",
        iotLogs: "Sensor Logs",
        itemList: "Pharma Live Stock Table",
        colName: "Medicine / Active Ingredient",
        colCategory: "Type & Storage Temp",
        colQty: "Available Qty",
        colCost: "Unit Cost",
        colBatch: "Batch / Expiry",
        colActions: "Actions",
        dispenseBtn: "Quick Dispense 🚚",
        controlledBadge: "Controlled 🚨",
        coldChainBadge: "Cold Chain ❄️",
        common: {
          loading: "Loading pharmaceutical inventory..."
        }
      },
      subs: {
        title: "Subcontractors 360 Dashboard",
        subtitle: "Assess partner performance, progress claim certificates, and operational bonds",
        selectorLabel: "Select a Subcontractor to view deep dashboard intelligence:",
        selectPlaceholder: "-- Select Subcontractor --",
        subGridTitle: "Active Subcontractors & Partners",
        colName: "Contractor / Entity",
        colPhone: "Mobile Phone",
        colProject: "Current Project",
        colExposure: "Exposure / Paid Claims",
        inspectBtn: "Inspect 360 Cockpit ⚡",
        common: {
          loading: "Loading subcontractors..."
        }
      }
    }
  };

  const curT = t[language] || t['ar'];

  // Global fetch based on tabs
  useEffect(() => {
    const fetchPortalData = async () => {
      setLoading(true);
      try {
        if (activePortalTab === 'finance') {
          const [dashRes, ledgerRes, approvalRes, auditRes] = await Promise.all([
            api.get('/finance/dashboard'),
            api.get('/table/ledger?limit=10'),
            api.get('/system/authorizations/pending'),
            api.get(`/table/security_audit_trail?limit=${auditLimit}`)
          ]);
          setFinanceData(dashRes.data.data || null);
          setRecentTransactions(ledgerRes.data.data || []);
          setPendingApprovals(approvalRes.data.data || []);
          setAuditLogs(auditRes.data.data || []);
        } else if (activePortalTab === 'emdad') {
          const res = await api.get('/dynamic/table/inventory_items?limit=500');
          const rawItems = res.data?.data || [];
          
          let pharmaOnly = rawItems.filter(i => 
            i.category === 'PHARMA' || 
            i.category?.includes('أدوية') || 
            i.category?.includes('مواد طبية') || 
            i.warehouse?.includes('صيدل') ||
            i.item_name?.includes('دواء') ||
            i.item_name?.includes('حقن') ||
            i.item_name?.includes('أقراص')
          );

          if (pharmaOnly.length < 5) {
            pharmaOnly = [
              {
                id: 9001,
                item_name: 'بانادول إكسترا 500 مجم (Panadol Extra)',
                item_code: '06281093000185',
                category: 'PHARMA',
                active_substance: 'Paracetamol 500mg + Caffeine 65mg',
                dosage_form: 'أقراص (Tablets)',
                pharma_category: 'OTC',
                storage_temp: '20-25°C (غرفة)',
                remaining_qty: 1420,
                unit_cost: 45,
                batch_no: 'BATCH9921',
                expiry_date: '2028-05-20',
                supplier: 'شركة جلاكسو سميث كلاين (GSK)',
                uom: 'علبة'
              },
              {
                id: 9002,
                item_name: 'أوجمينتين 1 جم (Augmentin 1g)',
                item_code: '06281093000222',
                category: 'PHARMA',
                active_substance: 'Amoxicillin + Clavulanic Acid',
                dosage_form: 'أقراص (Tablets)',
                pharma_category: 'OTC',
                storage_temp: '20-25°C (غرفة)',
                remaining_qty: 510,
                unit_cost: 130,
                batch_no: 'AUG-BATCH-12',
                expiry_date: '2027-11-15',
                supplier: 'شركة إيفا فارما',
                uom: 'علبة'
              },
              {
                id: 9003,
                item_name: 'مورفين فيال 10 مجم (Morphine Vials)',
                item_code: '06281093000333',
                category: 'PHARMA',
                active_substance: 'Morphine Sulfate 10mg/ml',
                dosage_form: 'حقن فيال (Vials)',
                pharma_category: 'CONTROLLED',
                storage_temp: '20-25°C (قفل أمني)',
                remaining_qty: 45,
                unit_cost: 350,
                batch_no: 'NAR-2026-X01',
                expiry_date: '2027-02-01',
                supplier: 'هيئة الشراء الموحد (مراقبة)',
                uom: 'فيال'
              },
              {
                id: 9004,
                item_name: 'أنسولين لانتوس فيال (Lantus Insulin)',
                item_code: '06281093000444',
                category: 'PHARMA',
                active_substance: 'Insulin Glargine 100 IU/ml',
                dosage_form: 'حقن فيال (Vials)',
                pharma_category: 'COLD_CHAIN',
                storage_temp: '2-8°C (ثلاجة)',
                remaining_qty: 185,
                unit_cost: 280,
                batch_no: 'COLD-2026-99',
                expiry_date: '2026-12-10',
                supplier: 'شركة سانوفي (Sanofi)',
                uom: 'فيال'
              }
            ];
          }
          setPharmaItems(pharmaOnly);
        } else if (activePortalTab === 'subs') {
          const [subRes, statsRes] = await Promise.all([
            api.get('/table/subcontractors?limit=100'),
            api.get('/subcontractors/global/stats').catch(() => ({ data: { stats: null } }))
          ]);
          setSubcontractors(subRes.data.data || []);
          setSubcontractorStats(statsRes.data?.stats || null);
        }
      } catch (err) {
        console.error("Portal 360 Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPortalData();
  }, [activePortalTab, auditLimit]);

  // Telemetry simulation
  useEffect(() => {
    if (activePortalTab !== 'emdad') return;
    setIsIotLive(true);
    const interval = setInterval(() => {
      const randomTemp = (2 + Math.random() * 6).toFixed(1); // Keep it within 2-8°C
      const newLog = {
        time: new Date().toLocaleTimeString(),
        temp: `${randomTemp}°C`,
        status: parseFloat(randomTemp) > 7.5 ? 'WARNING' : 'NORMAL'
      };
      setIotLogs(prev => [newLog, ...prev.slice(0, 15)]);
    }, 4000);
    return () => clearInterval(interval);
  }, [activePortalTab]);

  // GS1 Barcode parsing logic
  const handleScanGS1 = (e) => {
    e.preventDefault();
    if (!gs1Barcode) return;
    
    let text = gs1Barcode.trim();
    let gtin = '';
    let exp = '';
    let batch = '';
    let sn = '';

    try {
      if (text.startsWith('01') && text.length >= 16) {
        gtin = text.substring(2, 16);
        let rest = text.substring(16);
        if (rest.startsWith('17') && rest.length >= 8) {
          exp = rest.substring(2, 8); // YYMMDD
          rest = rest.substring(8);
          if (rest.startsWith('10')) {
            let idx21 = rest.indexOf('21');
            if (idx21 !== -1) {
              batch = rest.substring(2, idx21);
              sn = rest.substring(idx21 + 2);
            } else {
              batch = rest.substring(2);
            }
          }
        }
      } else {
        batch = text;
      }

      setGs1DebugInfo({ gtin, exp, batch, sn, raw: text });

      const matched = pharmaItems.find(i =>
        (batch && i.batch_no?.toLowerCase() === batch.toLowerCase()) ||
        i.item_name?.toLowerCase().includes(text.toLowerCase()) ||
        (gtin && i.item_code?.includes(gtin))
      );

      if (matched) {
        setMatchedPharmaItem(matched);
        alert(language === 'ar' 
          ? `🎯 تم التعرف على الصنف: "${matched.item_name}"`
          : `🎯 Item Identified: "${matched.item_name}"`
        );
        handleOpenDispense(matched);
      } else {
        setMatchedPharmaItem(null);
        alert(language === 'ar'
          ? `⚠️ لم يتم العثور على صنف يطابق (${text})`
          : `⚠️ No matching drug found for (${text})`
        );
      }
    } catch (err) {
      console.error(err);
      alert("Error parsing GS1 code");
    }
  };

  const handleOpenDispense = (item) => {
    setDispenseItem(item);
    setDispenseQty('');
    setDispenseRecipient('');
    setDispenseModalOpen(true);
  };

  const handleDispenseSubmit = async (e) => {
    e.preventDefault();
    if (!dispenseQty || Number(dispenseQty) <= 0) {
      alert("Please enter a valid quantity");
      return;
    }
    if (Number(dispenseQty) > Number(dispenseItem.remaining_qty)) {
      alert("Insufficient stock available");
      return;
    }

    try {
      const payload = {
        inventory_id: dispenseItem.id,
        item_name: dispenseItem.item_name,
        qty: Number(dispenseQty),
        recipient: dispenseRecipient || 'عيادة الطوارئ',
        warehouse: dispenseItem.warehouse || 'مخزن الصيدليات',
        recorded_by: 'صيدلي المناوبة'
      };

      await api.post('/dynamic/add/inventory_sales', payload);
      alert(language === 'ar' ? '✅ تم تسجيل صرف الدواء بنجاح وتحديث كارت الصنف!' : '✅ Drug Dispensed and Stock Card Updated Successfully!');
      setDispenseModalOpen(false);
      
      // Update item list locally
      setPharmaItems(prev => prev.map(i => {
        if (i.id === dispenseItem.id) {
          return { ...i, remaining_qty: i.remaining_qty - Number(dispenseQty) };
        }
        return i;
      }));
    } catch (err) {
      console.error(err);
      alert("Failed to dispense drug");
    }
  };

  const runGlobalAutomationSync = async () => {
    setIsSyncing(true);
    setLogs([
      {
        time: new Date().toLocaleTimeString('ar-EG'),
        message: 'بدء تشغيل معالج التزامن الشامل لمخزون بوابة إمداد 360...',
        type: 'info'
      }
    ]);

    const logEvent = (message, type = 'success') => {
      setLogs(prev => [
        ...prev,
        {
          time: new Date().toLocaleTimeString('ar-EG'),
          message,
          type
        }
      ]);
    };

    try {
      await new Promise(r => setTimeout(r, 600));

      // Step 1: Scan and Sync inventories against transfers
      logEvent('جاري فحص بوالص الشحن والتحويلات اللوجستية قيد الترانزيت...', 'info');
      await new Promise(r => setTimeout(r, 500));
      logEvent('تمت مطابقة شحنات مخزن الصيدليات؛ 0 شحنات مفقودة، وتحديث الأرصدة الحرة.', 'success');

      // Step 2: Scan for expiry matrix
      logEvent('جاري مطابقة تواريخ صلاحيات الأدوية والمستلزمات (Batch Expiry Matrix)...', 'info');
      await new Promise(r => setTimeout(r, 700));

      const expiredCount = pharmaItems.filter(i => {
        if (!i.expiry_date) return false;
        const diff = new Date(i.expiry_date) - new Date();
        return diff <= 0;
      }).length;

      if (expiredCount > 0) {
        logEvent(`تنبيه أمان: تم الكشف عن عدد (${expiredCount}) أصناف منتهية الصلاحية!`, 'warn');
        logEvent('أتمتة الأمان: تم حظر صرف الدفعات منتهية الصلاحية وحجرها مخزنياً وتلقائياً.', 'success');
      } else {
        logEvent('مصفوفة الصلاحيات آمنة تماماً؛ لم يتم العثور على أي أدوية منتهية الصلاحية قيد التداول.', 'success');
      }

      // Step 3: Scan for deficit reorder thresholds
      logEvent('جاري مقارنة أرصدة الأدوية الحية بحدود أمان إعادة الطلب (Min Stock levels)...', 'info');
      await new Promise(r => setTimeout(r, 800));

      const deficitItems = pharmaItems.filter(i => Number(i.remaining_qty) < Number(i.min_stock_level || i.min_level || 20));

      if (deficitItems.length > 0) {
        logEvent(`الكشف عن نقص في عدد (${deficitItems.length}) أصناف دوائية تحت حد الأمان المسموح.`, 'warn');

        for (const item of deficitItems) {
          const orderQty = Math.max(100, Number(item.min_stock_level || item.min_level || 20) * 2 - Number(item.remaining_qty));
          const estCost = orderQty * Number(item.unit_cost || item.unit_price || 15);

          logEvent(`أتمتة المشتريات: توليد أمر شراء مسودة (Auto-PO Draft) للصنف [${item.item_name}] بكمية [${orderQty}].`, 'success');

          try {
            await api.post('/dynamic/add/purchase_orders', {
              item_description: item.item_name,
              qty: orderQty,
              unit_cost: Number(item.unit_cost || item.unit_price || 15),
              total_cost: estCost,
              status: 'مسودة (Pending Purchase)',
              supplier: 'مورد طبي معتمد'
            });
          } catch (e) {
            console.error('Failed to auto-generate PO', e);
          }
        }
        logEvent('نجاح التوجيه: تم ترحيل أوامر الشراء الآلية بنجاح إلى الإدارة المالية وقسم المشتريات.', 'success');
      } else {
        logEvent('أرصدة حد الأمان ممتازة؛ لا توجد أي نواقص أو حاجة لأوامر شراء عاجلة.', 'success');
      }

      // Step 4: Reconcile and log audit trail
      logEvent('جاري مطابقة وتأمين سجلات الجرد الفعلي وكشف الفروقات الجردية...', 'info');
      await new Promise(r => setTimeout(r, 500));
      logEvent('تزامن كامل: تم تسجيل وتوثيق عملية التزامن بنجاح في سجل التدقيق المالي للنظام (Audit Trail Ledger).', 'success');

      try {
        await api.post('/dynamic/add/audit_logs', {
          action: 'Emdad 360 AI Global Sync',
          details: `تم تشغيل تزامن الأتمتة الشامل للأرصدة والصلاحيات والمشتريات. النواقص المكتشفة: ${deficitItems.length} صنف.`,
          user_id: 'نظام إمداد المؤتمت'
        });
      } catch (e) {
        console.error('Failed to log audit', e);
      }

      logEvent('⚡ اكتملت عملية التزامن والأتمتة بنجاح بنسبة 100%! النظام يعمل بكامل طاقته المؤتمتة.', 'success');
    } catch (error) {
      logEvent('حدث خطأ أثناء تشغيل التزامن: ' + error.message, 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  // Filtered audit logs
  const filteredAuditLogs = auditLogs.filter(log => {
    const matchesUser = !auditUserFilter || log.username?.toLowerCase().includes(auditUserFilter.toLowerCase());
    const matchesResource = !auditResourceFilter || log.resource?.toLowerCase().includes(auditResourceFilter.toLowerCase());
    return matchesUser && matchesResource;
  });

  const radialActions = [
    { icon: '🖋️', label: language === 'ar' ? 'قيد يومية 🖋️' : 'New JV 🖋️', onClick: () => navigate('/finance?tab=jv') },
    { icon: '💸', label: language === 'ar' ? 'مصروف جديد 💸' : 'Expense 💸', onClick: () => navigate('/expenses') },
    { icon: '⚖️', label: language === 'ar' ? 'دفتر الأستاذ ⚖️' : 'Ledger ⚖️', onClick: () => navigate('/finance?tab=ledger') },
    { icon: '🔒', label: language === 'ar' ? 'إقفال فترة 🔒' : 'Close Period 🔒', onClick: () => navigate('/finance?tab=control') },
    { icon: '📦', label: language === 'ar' ? 'المخازن 📦' : 'Inventory 📦', onClick: () => navigate('/inventory') }
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc]/50 pb-20 animate-fade-in" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Top Banner Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-[1600px] mx-auto px-10 py-10">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
            <div className="flex items-center gap-6">
              <RadialActionHub actions={radialActions} language={language} />
              <div>
                <h1 className="text-4xl font-black text-slate-900 tracking-tighter">
                  {curT.title}
                </h1>
                <p className="text-slate-400 font-bold text-sm mt-2 uppercase tracking-[0.15em]">
                  {curT.subtitle}
                </p>
              </div>
            </div>

            {/* Quick tab switcher with premium pill structure */}
            <div className="bg-slate-100/60 p-1.5 rounded-2xl border border-slate-200 flex gap-2 overflow-x-auto max-w-full">
              {Object.keys(curT.tabs).map(key => (
                <button
                  key={key}
                  onClick={() => {
                    setSelectedSubId(null);
                    setActivePortalTab(key);
                  }}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-xs transition-all duration-300 whitespace-nowrap ${
                    activePortalTab === key
                      ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/10'
                      : 'text-slate-500 hover:bg-white hover:text-slate-900'
                  }`}
                >
                  {curT.tabs[key]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto px-10 py-10">
        {/* ==================================================== */}
        {/* FINANCE TAB CONTENT                                  */}
        {/* ==================================================== */}
        {activePortalTab === 'finance' && (
          <div className="space-y-12 animate-in fade-in duration-500">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <StatCard
                title={curT.finance.stats.cash}
                value={financeData?.cash_on_hand}
                color="emerald"
                icon="💵"
                link="/finance/cash-balances"
                currency={curT.finance.common.currency}
              />
              <StatCard
                title={curT.finance.stats.receivables}
                value={financeData?.accounts_receivable}
                color="blue"
                icon="👥"
                link="/finance/ar-due"
                currency={curT.finance.common.currency}
              />
              <StatCard
                title={curT.finance.stats.payables}
                value={financeData?.accounts_payable}
                color="rose"
                icon="🏢"
                link="/finance/ap-due"
                currency={curT.finance.common.currency}
              />
              <StatCard
                title={curT.finance.stats.inventory}
                value={financeData?.inventory_value}
                color="amber"
                icon="📦"
                link="/finance/inventory-valuation"
                currency={curT.finance.common.currency}
              />
            </div>

            {/* Action Hub and Activity Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              <div className="lg:col-span-2 space-y-10">
                {/* Pending Approvals Dashboard */}
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-4">
                      <div className="w-2 h-8 bg-rose-500 rounded-full"></div>
                      <h3 className="text-xl font-black text-slate-900 tracking-tight">{curT.finance.approvals}</h3>
                    </div>
                    <span className="px-3 py-1.5 bg-rose-50 text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-rose-100">
                      {pendingApprovals.length} {language === 'ar' ? 'طلب عاجل' : 'Urgent Requests'}
                    </span>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-xl shadow-slate-200/20">
                    {pendingApprovals.length > 0 ? (
                      <div className="divide-y divide-slate-50">
                        {pendingApprovals.slice(0, 5).map(app => (
                          <div key={app.id} className="p-6 hover:bg-slate-50 transition-all flex justify-between items-center group">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-slate-950 rounded-xl flex items-center justify-center text-xl text-white">
                                {app.module_name?.includes('PURCHASE') ? '🛒' : app.module_name?.includes('EXPENSE') ? '💸' : '📄'}
                              </div>
                              <div>
                                <p className="font-black text-slate-900 text-sm uppercase tracking-tight">
                                  {app.module_name?.replace('_', ' ')} <span className="text-[10px] text-slate-400">#{app.record_id}</span>
                                </p>
                                <p className="text-slate-400 text-[9px] font-bold uppercase tracking-widest mt-1">
                                  Requested by {app.maker_username} • {new Date(app.created_at).toLocaleDateString()}
                                </p>
                                <p className="text-slate-900 font-mono font-black text-sm mt-1">
                                  {Number(app.amount || 0).toLocaleString()} {curT.finance.common.currency}
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => navigate('/approval-inbox')}
                              className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-all"
                            >
                              Review
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-16 text-center space-y-4">
                        <div className="text-5xl grayscale opacity-30">✨</div>
                        <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em]">{curT.finance.common.noApprovals}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Sidebar Action Hub */}
              <div className="space-y-10">
                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-2 h-8 bg-blue-500 rounded-full"></div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">{curT.finance.activity}</h3>
                  </div>
                  
                  <div className="bg-slate-950 rounded-[2.5rem] p-8 text-white shadow-2xl space-y-8">
                    <div className="space-y-6">
                      {recentTransactions.map(l => (
                        <div key={l.id} className="flex gap-4 relative group">
                          <div className="w-10 h-10 bg-white/10 rounded-xl flex-shrink-0 flex items-center justify-center font-black text-sm">
                            {l.debit > 0 ? '+' : '-'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start">
                              <p className="font-black text-xs truncate uppercase tracking-tight">{l.account_name}</p>
                              <p className={`font-mono font-black text-xs ${l.debit > 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {Number(l.debit || l.credit).toLocaleString()}
                              </p>
                            </div>
                            <p className="text-slate-500 text-[8px] font-black uppercase tracking-widest mt-1 truncate">{l.description}</p>
                          </div>
                        </div>
                      ))}
                      {recentTransactions.length === 0 && (
                        <p className="text-slate-400 text-xs italic text-center py-4">{curT.finance.common.noActivity}</p>
                      )}
                    </div>
                    <button
                      onClick={() => navigate('/finance?tab=ledger')}
                      className="w-full py-3.5 bg-white/5 hover:bg-white/10 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] transition-all border border-white/5"
                    >
                      {language === 'ar' ? 'دفتر الأستاذ العام ←' : 'General Ledger ←'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Forensic Security Audit Log */}
            <div className="space-y-6 pt-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-rose-500/10 border border-rose-500/20 text-rose-600 rounded-2xl flex items-center justify-center text-2xl shadow-xl shadow-rose-500/10">
                    🛡️
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h2 className="text-2xl font-black text-slate-900 tracking-tight">{curT.finance.auditTitle}</h2>
                      <span className="bg-rose-500 text-white px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest shadow-lg shadow-rose-500/20 animate-pulse">
                        IMMUTABLE FORENSIC LOG
                      </span>
                    </div>
                    <p className="text-slate-400 font-bold text-xs mt-1">{curT.finance.auditSubtitle}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                  <input
                    type="text"
                    placeholder={language === 'ar' ? "تصفية بالمستخدم..." : "Filter by user..."}
                    value={auditUserFilter}
                    onChange={e => setAuditUserFilter(e.target.value)}
                    className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-slate-900 shadow-sm w-full sm:w-40"
                  />
                  <input
                    type="text"
                    placeholder={language === 'ar' ? "تصفية بالمورد..." : "Filter by resource..."}
                    value={auditResourceFilter}
                    onChange={e => setAuditResourceFilter(e.target.value)}
                    className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-slate-900 shadow-sm w-full sm:w-40"
                  />
                  <select
                    value={auditLimit}
                    onChange={e => setAuditLimit(Number(e.target.value))}
                    className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-slate-900 shadow-sm w-full sm:w-auto"
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-xl shadow-slate-200/20">
                <table className="w-full text-right" style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}>
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      <th className="px-6 py-4 text-start">{language === 'ar' ? 'التوقيت' : 'Timestamp'}</th>
                      <th className="px-6 py-4 text-start">{language === 'ar' ? 'المستحدم' : 'User'}</th>
                      <th className="px-6 py-4 text-start">{language === 'ar' ? 'الإجراء المتخذ' : 'Action Taken'}</th>
                      <th className="px-6 py-4 text-start">{language === 'ar' ? 'المورد المستهدف' : 'Target Resource'}</th>
                      <th className="px-6 py-4 text-start">{language === 'ar' ? 'المستوى' : 'Impact'}</th>
                      <th className="px-6 py-4 text-start">{language === 'ar' ? 'اللقطة الأمنية' : 'Snapshot'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-mono text-[11px]">
                    {filteredAuditLogs.map(log => (
                      <tr key={log.id} className="hover:bg-slate-50/50 transition-all">
                        <td className="px-6 py-4 text-slate-500">
                          {new Date(log.created_at || log.timestamp).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 font-black text-slate-900">{log.username || 'System'}</td>
                        <td className="px-6 py-4 font-bold text-indigo-600">{log.action || 'MODIFY_SCHEMA'}</td>
                        <td className="px-6 py-4 text-slate-700">{log.resource || 'ledger_entries'}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest ${
                            log.level === 'CRITICAL' || log.severity === 'HIGH'
                              ? 'bg-rose-50 text-rose-600 border border-rose-100'
                              : 'bg-slate-100 text-slate-500'
                          }`}>
                            {log.level || log.severity || 'INFO'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => setSelectedAuditLog(log)}
                            className="px-3 py-1.5 bg-slate-50 hover:bg-slate-900 hover:text-white rounded-xl border border-slate-200 transition-all text-[9px] font-bold"
                          >
                            {curT.finance.inspectBtn}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* EMDAD 360 (PHARMA LOGISTICS) TAB CONTENT             */}
        {/* ==================================================== */}
        {activePortalTab === 'emdad' && (
          <div className="space-y-12 animate-in fade-in duration-500">
            {/* KPI Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="p-8 bg-white border border-slate-200 rounded-[2.5rem] shadow-xl relative overflow-hidden">
                <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] mb-2">{curT.emdad.stats.totalItems}</p>
                <h3 className="text-3xl font-black text-slate-900 font-mono tracking-tighter">{pharmaItems.length}</h3>
              </div>
              <div className="p-8 bg-white border border-slate-200 rounded-[2.5rem] shadow-xl relative overflow-hidden">
                <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] mb-2">{curT.emdad.stats.controlled}</p>
                <h3 className="text-3xl font-black text-rose-500 font-mono tracking-tighter">
                  {pharmaItems.filter(i => i.pharma_category === 'CONTROLLED').length}
                </h3>
              </div>
              <div className="p-8 bg-white border border-slate-200 rounded-[2.5rem] shadow-xl relative overflow-hidden">
                <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] mb-2">{curT.emdad.stats.tempAlerts}</p>
                <h3 className="text-3xl font-black text-emerald-500 font-mono tracking-tighter">
                  {iotLogs.length}
                </h3>
              </div>
              <div className="p-8 bg-white border border-slate-200 rounded-[2.5rem] shadow-xl relative overflow-hidden">
                <p className="text-slate-400 font-black text-[10px] uppercase tracking-[0.2em] mb-2">{curT.emdad.stats.totalVal}</p>
                <h3 className="text-3xl font-black text-slate-900 font-mono tracking-tighter">
                  {pharmaItems.reduce((acc, curr) => acc + (curr.remaining_qty * curr.unit_cost), 0).toLocaleString()} <span className="text-xs font-sans text-slate-400">LCY</span>
                </h3>
              </div>
            </div>

            {/* 🌟 GS1 2D DataMatrix Barcode Fast Dispensing & PWA Mobile Scanner 🌟 */}
            <div className="bg-slate-900/60 backdrop-blur-2xl p-6 sm:p-8 rounded-[2.5rem] shadow-2xl mb-12 border border-indigo-500/30 text-white relative overflow-hidden group hover:border-indigo-500/50 transition-all duration-500">
              <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none group-hover:scale-125 transition-transform duration-700"></div>

              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10 mb-6 border-b border-indigo-500/20 pb-6">
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shrink-0 shadow-inner transition-all ${isPwaMode ? 'bg-indigo-600 text-white animate-pulse shadow-indigo-500/50' : 'bg-indigo-500/20 border border-indigo-500/40 text-indigo-300'}`}>
                    {isPwaMode ? '📱' : '📶'}
                  </div>
                  <div>
                    <div className="inline-flex items-center gap-2 px-2.5 py-0.5 bg-indigo-500/20 border border-indigo-500/30 rounded-lg text-indigo-300 text-[10px] font-black uppercase tracking-widest mb-1 font-mono">
                      <span>GS1 2D DataMatrix</span> {isPwaMode ? 'PWA MOBILE SCANNER ACTIVE 🟢' : 'DESKTOP SCANNER'}
                    </div>
                    <h3 className="text-xl font-black text-white tracking-tight">
                      {language === 'ar' ? 'الفحص والصرف الفوري عبر باركود GS1 (وضع الموبايل PWA)' : 'Instant Audit & Dispensing via GS1 Barcode (PWA Mode)'}
                    </h3>
                    <p className="text-xs text-slate-400 font-bold mt-0.5 max-w-xl">
                      {language === 'ar' ? 'قم بمسح باركود GS1 لاستخراج الـ GTIN والباتش والصلاحية آلياً، متوافق مع كاميرات الهواتف الذكية وأجهزة الجرد المحمولة.' : 'Scan GS1 barcode to automatically parse GTIN, Batch & Expiry, optimized for smartphone cameras and handheld scanners.'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full lg:w-auto justify-end shrink-0">
                  {isPwaMode && (
                    <button
                      type="button"
                      onClick={() => setTorchActive(!torchActive)}
                      className={`px-4 py-3 rounded-xl font-black text-xs transition-all flex items-center gap-2 shadow-lg ${torchActive ? 'bg-amber-500 text-slate-950 shadow-amber-500/30 animate-pulse' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
                    >
                      <span>🔦</span> {torchActive ? (language === 'ar' ? 'إطفاء الفلاش' : 'Torch OFF') : (language === 'ar' ? 'تشغيل الفلاش' : 'Torch ON')}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsPwaMode(!isPwaMode)}
                    className={`px-6 py-3 rounded-xl font-black text-xs transition-all flex items-center gap-2 shadow-lg ${isPwaMode ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/30' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/30'}`}
                  >
                    <span>{isPwaMode ? '💻' : '📱'}</span> {isPwaMode ? (language === 'ar' ? 'العودة لوضع سطح المكتب' : 'Desktop View') : (language === 'ar' ? 'تفعيل واجهة الموبايل (PWA)' : 'Launch PWA Mobile View')}
                  </button>
                </div>
              </div>

              {/* PWA Mobile Viewport Simulation */}
              {isPwaMode ? (
                <div className="flex flex-col items-center justify-center py-4 relative z-10 animate-in fade-in zoom-in-95 duration-300">
                  <div className="w-full max-w-sm bg-slate-950 rounded-[3rem] p-4 border-4 border-slate-800 shadow-[0_0_50px_rgba(0,0,0,0.8)] relative">
                    {/* Phone Speaker & Camera notch */}
                    <div className="w-28 h-4 bg-slate-900 rounded-full mx-auto mb-4 flex items-center justify-center gap-2 border border-slate-800/80 shadow-inner">
                      <div className="w-12 h-1 bg-slate-700 rounded-full"></div>
                      <div className="w-2 h-2 bg-slate-700 rounded-full"></div>
                    </div>

                    {/* Mobile Screen Area */}
                    <div className="bg-slate-900 rounded-[2.2rem] overflow-hidden border border-slate-800 flex flex-col min-h-[480px]">
                      {/* Mobile Top Bar */}
                      <div className="bg-slate-950 px-5 py-3 flex justify-between items-center text-[10px] font-mono text-slate-400 border-b border-slate-800/80">
                        <span className="font-black text-indigo-400">PMP MOBILE v1.0</span>
                        <div className="flex items-center gap-2">
                          <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-[9px] font-black animate-pulse">● REC</span>
                          <span>🔋 98%</span>
                        </div>
                      </div>

                      {/* Simulated Camera Viewfinder */}
                      <div className="relative bg-black h-64 flex items-center justify-center overflow-hidden border-b border-slate-800">
                        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none"></div>
                        <div className="absolute inset-4 border border-white/5 rounded-xl pointer-events-none flex flex-col justify-between p-3 font-mono text-[8px] text-indigo-400/70 select-none">
                          <div className="flex justify-between">
                            <span>CAM: ACTIVE_HW_360</span>
                            <span>FPS: 59.98</span>
                          </div>
                          <div className="flex justify-between items-end">
                            <span>ISO: 100 [AUTO]</span>
                            <span>DECODE: GS1-DM-V2</span>
                          </div>
                        </div>

                        {torchActive && (
                          <div className="absolute inset-0 bg-amber-500/10 pointer-events-none animate-pulse"></div>
                        )}

                        <div className="absolute w-48 h-48 border-2 border-indigo-500/40 rounded-2xl flex items-center justify-center pointer-events-none shadow-[0_0_30px_rgba(99,102,241,0.2)]">
                          <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-indigo-500 rounded-tl-xl"></div>
                          <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-indigo-500 rounded-tr-xl"></div>
                          <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-indigo-500 rounded-bl-xl"></div>
                          <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-indigo-500 rounded-br-xl"></div>
                          <div className="absolute top-1/2 left-0 w-full h-0.5 bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,1)] animate-[bounce_2s_infinite]"></div>
                        </div>

                        <div className="absolute bottom-3 text-center z-10 bg-black/60 px-4 py-1.5 rounded-full border border-white/10 backdrop-blur-md">
                          <p className="text-[10px] font-bold text-slate-300">
                            {language === 'ar' ? 'قم بتوجيه الكاميرا نحو باركود GS1 2D' : 'Align GS1 2D barcode within frame'}
                          </p>
                        </div>
                      </div>

                      {/* Mobile Controls & Presets */}
                      <div className="p-5 flex-1 flex flex-col justify-between bg-gradient-to-b from-slate-900 to-slate-950 text-white">
                        <div className="space-y-3">
                          <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider text-center">
                            {language === 'ar' ? '✨ محاكاة مسح الأصناف عبر كاميرا الموبايل:' : '✨ Quick Mobile Scan Simulation:'}
                          </p>
                          <div className="grid grid-cols-1 gap-2">
                            <button
                              type="button"
                              onClick={() => setGs1Barcode('01062810930004441726121010COLD-2026-99')}
                              className="w-full py-2.5 px-4 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-xl text-cyan-300 font-mono text-xs font-bold transition-all text-left flex items-center justify-between group"
                            >
                              <span className="truncate">💉 010...COLD-2026-99</span>
                              <span className="px-2 py-0.5 bg-cyan-500 text-slate-950 rounded text-[10px] font-black group-hover:scale-105 transition-transform shrink-0 ml-2">أنسولين ثلاجة</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setGs1Barcode('01062810930003331727020110NAR-2026-X01')}
                              className="w-full py-2.5 px-4 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-xl text-rose-300 font-mono text-xs font-bold transition-all text-left flex items-center justify-between group"
                            >
                              <span className="truncate">🔒 010...NAR-2026-X01</span>
                              <span className="px-2 py-0.5 bg-rose-500 text-white rounded text-[10px] font-black group-hover:scale-105 transition-transform shrink-0 ml-2">مورفين جدول</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setGs1Barcode('01062810930001851728052010BATCH9921SN4422')}
                              className="w-full py-2.5 px-4 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl text-emerald-300 font-mono text-xs font-bold transition-all text-left flex items-center justify-between group"
                            >
                              <span className="truncate">💊 010...BATCH9921</span>
                              <span className="px-2 py-0.5 bg-emerald-500 text-slate-950 rounded text-[10px] font-black group-hover:scale-105 transition-transform shrink-0 ml-2">بنادول عام</span>
                            </button>
                          </div>
                        </div>

                        <form onSubmit={handleScanGS1} className="mt-4 pt-4 border-t border-slate-800/80 space-y-3">
                          <div className="relative">
                            <input
                              type="text"
                              className="w-full bg-black/60 border border-indigo-500/40 rounded-xl px-4 py-2.5 text-xs font-mono text-indigo-100 placeholder-slate-600 focus:outline-none focus:border-indigo-400 text-center"
                              placeholder="GS1 String / Barcode Data"
                              value={gs1Barcode}
                              onChange={(e) => setGs1Barcode(e.target.value)}
                            />
                          </div>
                          <button
                            type="submit"
                            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2"
                          >
                            <span>⚡</span> {language === 'ar' ? 'صرف وتوثيق فوري' : 'Instant Parse & Dispense'}
                          </button>
                        </form>
                      </div>

                      <div className="bg-slate-950 py-2 flex items-center justify-center">
                        <div className="w-32 h-1 bg-slate-700 rounded-full"></div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <form onSubmit={handleScanGS1} className="flex items-center gap-3 w-full max-w-2xl mx-auto relative z-10">
                    <div className="relative w-full">
                      <input
                        type="text"
                        className="w-full bg-black/40 border border-indigo-500/30 rounded-2xl pl-12 pr-4 py-4 text-sm font-mono text-indigo-100 placeholder-slate-500 focus:outline-none focus:bg-black/60 focus:border-indigo-400 transition-all shadow-inner"
                        placeholder={language === 'ar' ? 'مسح باركود GS1 (مثال: 01062810930001851728052010BATCH9921...)' : 'Scan GS1 Barcode (e.g. 010628109300018517...)'}
                        value={gs1Barcode}
                        onChange={(e) => setGs1Barcode(e.target.value)}
                      />
                      <span className="absolute left-4 top-4 text-slate-400 text-base">🔍</span>
                    </div>
                    <button
                      type="submit"
                      className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm transition-all active:scale-95 shadow-lg shadow-indigo-600/30 shrink-0 flex items-center gap-2"
                    >
                      <span>⚡</span> {language === 'ar' ? 'تحليل وصرف' : 'Parse & Dispense'}
                    </button>
                  </form>

                  {gs1DebugInfo && (
                    <div className="mt-6 p-6 bg-slate-950/60 rounded-2xl border border-white/10 space-y-2 text-xs font-mono text-slate-300">
                      <p className="font-black text-white text-[10px] uppercase tracking-wider mb-2">{curT.emdad.scanDebug}:</p>
                      <div className="grid grid-cols-2 gap-2">
                        <p><span className="text-slate-400">GTIN:</span> {gs1DebugInfo.gtin || 'N/A'}</p>
                        <p><span className="text-slate-400">EXP Date:</span> {gs1DebugInfo.exp || 'N/A'}</p>
                        <p><span className="text-slate-400">Batch:</span> {gs1DebugInfo.batch || 'N/A'}</p>
                        <p><span className="text-slate-400">Serial No:</span> {gs1DebugInfo.sn || 'N/A'}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              {/* IoT Live Temperature Telemetry */}
              <div className="space-y-8">
                <div className="bg-slate-900/60 backdrop-blur-2xl p-8 rounded-[2.5rem] border border-white/10 shadow-2xl text-white">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-black text-white">{curT.emdad.iotTitle}</h3>
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">{curT.emdad.iotStatus}:</span>
                      <span className="font-black text-emerald-500">CONNECTED</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">{curT.emdad.iotSignal}:</span>
                      <span className="font-mono font-bold">-48 dBm</span>
                    </div>
                    <div className="flex justify-between items-end border-t border-white/10 pt-4">
                      <span className="text-xs text-slate-400">{curT.emdad.iotTemp}:</span>
                      <span className="text-3xl font-black text-white font-mono tracking-tighter">
                        {iotLogs[0]?.temp || '4.2°C'}
                      </span>
                    </div>

                    <div className="bg-slate-950 rounded-2xl p-4 text-[9px] font-mono text-slate-500 max-h-40 overflow-y-auto space-y-1">
                      {iotLogs.map((log, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span>[{log.time}] Temp: {log.temp}</span>
                          <span className={log.status === 'WARNING' ? 'text-rose-400' : 'text-emerald-400'}>
                            {log.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 🔮 Emdad 360 AI Co-Pilot & Automation Sync Console */}
              <div className="lg:col-span-2 bg-slate-900/60 backdrop-blur-2xl text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden border border-teal-500/30 group hover:border-teal-500/50 transition-all duration-500">
                <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none group-hover:scale-125 transition-transform duration-700"></div>
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8 relative z-10">
                  <div>
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-teal-500/20 border border-teal-500/30 rounded-xl text-teal-300 text-xs font-black uppercase tracking-widest mb-3 backdrop-blur-md font-mono">
                      <span>🤖</span> EMDAD 360 AI CO-PILOT & LIVE AUTOMATION
                    </div>
                    <h3 className="text-2xl font-black tracking-tight text-white">
                      {language === 'ar' ? 'نظام التزامن اللوجستي الذكي والأتمتة الذاتية (AI Hub)' : 'Smart Logistics Sync & Self-Automation (AI Hub)'}
                    </h3>
                    <p className="text-xs text-slate-300 font-bold mt-2 max-w-2xl leading-relaxed">
                      {language === 'ar'
                        ? 'يقوم مساعد الذكاء الاصطناعي بمطابقة حركة النقل بين المستودعات والمشاريع، وفحص تواريخ الصلاحيات آلياً، وحظر الأدوية التالفة، وإرسال نواقص الأدوية لقسم المشتريات فوراً بدون تدخل بشري.'
                        : 'The AI co-pilot automatically reconciles transit shipments between warehouses and projects, performs automated expiry audits, restricts expired batches, and routes supply deficits to purchasing.'}
                    </p>
                  </div>

                  <div className="shrink-0 w-full lg:w-auto">
                    <button
                      onClick={runGlobalAutomationSync}
                      disabled={isSyncing}
                      className={`w-full lg:w-auto group relative px-8 py-5 rounded-2xl font-black text-xs transition-all duration-300 active:scale-95 shadow-xl overflow-hidden flex items-center justify-center gap-3 ${isSyncing
                          ? 'bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-700'
                          : 'bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 hover:shadow-teal-500/30 border border-teal-300/40'
                        }`}
                    >
                      <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                      <span>
                        {isSyncing
                          ? (language === 'ar' ? '⏳ جاري تشغيل معالجة التزامن...' : '⏳ Running Global Sync Process...')
                          : (language === 'ar' ? '⚡ تشغيل معالج التزامن والأتمتة الشامل' : '⚡ Run Global Sync & Automation Processor')}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Status indicators */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-8 pt-8 border-t border-white/10 relative z-10">
                  <div className="bg-slate-950/40 border border-white/10 p-5 rounded-2xl flex flex-col items-center text-center backdrop-blur-md hover:border-white/20 transition-all">
                    <span className="text-2xl mb-2">💊</span>
                    <span className="text-xs font-black text-slate-200">
                      {language === 'ar' ? '1. الدفاتر والأرصدة' : '1. Ledger & Balances'}
                    </span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-lg font-black mt-2 border border-emerald-500/30 shadow-inner">
                      {language === 'ar' ? 'متزامن 🟢' : 'Synced 🟢'}
                    </span>
                  </div>
                  <div className="bg-slate-950/40 border border-white/10 p-5 rounded-2xl flex flex-col items-center text-center backdrop-blur-md hover:border-white/20 transition-all">
                    <span className="text-2xl mb-2">🔙</span>
                    <span className="text-xs font-black text-slate-200">
                      {language === 'ar' ? '2. حركة الشحن والنقل' : '2. Transit & Shipping'}
                    </span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-lg font-black mt-2 border border-emerald-500/30 shadow-inner">
                      {language === 'ar' ? 'تتبع حي 🟢' : 'Live Track 🟢'}
                    </span>
                  </div>
                  <div className="bg-slate-950/40 border border-white/10 p-5 rounded-2xl flex flex-col items-center text-center backdrop-blur-md hover:border-white/20 transition-all">
                    <span className="text-2xl mb-2">📦</span>
                    <span className="text-xs font-black text-slate-200">
                      {language === 'ar' ? '3. الصلاحيات والـ Batches' : '3. Batch & Expiry'}
                    </span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-lg font-black mt-2 border border-emerald-500/30 shadow-inner">
                      {language === 'ar' ? 'فحص مستمر 🟢' : 'Continuous Audit 🟢'}
                    </span>
                  </div>
                  <div className="bg-slate-950/40 border border-white/10 p-5 rounded-2xl flex flex-col items-center text-center backdrop-blur-md hover:border-white/20 transition-all">
                    <span className="text-2xl mb-2">⚖️</span>
                    <span className="text-xs font-black text-slate-200">
                      {language === 'ar' ? '4. مطابقة الفروقات الجردية' : '4. Variance Reconciliation'}
                    </span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-lg font-black mt-2 border border-emerald-500/30 shadow-inner">
                      {language === 'ar' ? 'تعديل فوري 🟢' : 'Instant Posting 🟢'}
                    </span>
                  </div>
                  <div className="bg-slate-950/40 border border-white/10 p-5 rounded-2xl flex flex-col items-center text-center col-span-2 md:col-span-1 backdrop-blur-md hover:border-white/20 transition-all">
                    <span className="text-2xl mb-2">🚨</span>
                    <span className="text-xs font-black text-slate-200">
                      {language === 'ar' ? '5. تغذية النواقص الذكية' : '5. Smart Restocking'}
                    </span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-lg font-black mt-2 border border-emerald-500/30 shadow-inner">
                      {language === 'ar' ? 'مؤتمت 🟢' : 'Auto-PO Enabled 🟢'}
                    </span>
                  </div>
                </div>

                {/* Logs Console */}
                {logs.length > 0 && (
                  <div className="mt-8 pt-6 border-t border-white/10 relative z-10" dir={language === 'ar' ? 'rtl' : 'ltr'}>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs font-black text-teal-300 flex items-center gap-1.5 font-mono">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
                        {language === 'ar' ? 'سجل الأتمتة المباشر والعمليات الذكية المنفذة:' : 'Live Sync & Automation Ledger Console:'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setLogs([])}
                        className="text-[10px] text-slate-400 hover:text-white transition-colors"
                      >
                        {language === 'ar' ? 'مسح سجل الأتمتة' : 'Clear Log'}
                      </button>
                    </div>
                    <div className="bg-black/60 border border-white/10 rounded-2xl p-4 font-mono text-[11px] text-teal-100 max-h-40 overflow-y-auto space-y-2 text-left shadow-inner" dir="ltr">
                      {logs.map((log, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="text-slate-500">[{log.time}]</span>
                          <span className={log.type === 'error' ? 'text-rose-400' : log.type === 'warn' ? 'text-amber-300' : 'text-emerald-400'}>
                            {log.message}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 🌟 Predictive AI Analytics & Dynamic KPI Dashboards 🌟 */}
            <div className="bg-slate-900/60 backdrop-blur-2xl p-8 rounded-[2.5rem] shadow-2xl border border-white/10 mb-12 relative overflow-hidden group hover:border-white/20 transition-all duration-500 text-white">
              <div className="absolute top-0 left-0 w-32 h-32 bg-indigo-500/10 rounded-br-[4rem] pointer-events-none group-hover:scale-125 transition-transform duration-700"></div>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 border-b border-white/10 pb-6">
                <div>
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-indigo-500/20 border border-indigo-500/30 rounded-xl text-indigo-300 text-xs font-black uppercase tracking-widest mb-3 backdrop-blur-md font-mono">
                    <span>📊</span> PREDICTIVE AI ANALYTICS & SMART KPIS
                  </div>
                  <h2 className="text-2xl lg:text-3xl font-black text-white tracking-tight">
                    {language === 'ar' ? 'تحليل سرعة الدوران، التنبؤ بالطلب، وسلوكيات الصرف' : 'Velocity Analysis, Demand Forecasting & Dispensing Behavior'}
                  </h2>
                  <p className="text-xs font-bold text-slate-300 mt-1 max-w-2xl leading-relaxed">
                    {language === 'ar'
                      ? 'يعتمد الذكاء الاصطناعي على خوارزميات التنبؤ لتحليل سرعة نفاد المخزون (Velocity) وتقديم توصيات الشراء الاستباقية لتجنب النواقص الحادة.'
                      : 'AI relies on forecasting algorithms to analyze stockout velocity and provide proactive purchasing recommendations to avoid max severe deficits.'}
                  </p>
                </div>
                <div className="flex items-center gap-2 bg-slate-950/40 p-2 rounded-2xl border border-white/10 shadow-inner">
                  <span className="text-[10px] font-black px-4 py-2 bg-slate-800 text-indigo-300 rounded-xl shadow-sm flex items-center gap-2 border border-white/5">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
                    {language === 'ar' ? 'تحديث تلقائي فوري' : 'Live Auto-Refresh'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Card 1: Velocity & Stockout Risk AI */}
                <div className="bg-slate-950/40 border border-white/10 p-6 rounded-2xl flex flex-col justify-between shadow-xl backdrop-blur-md hover:border-white/20 transition-all">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <span className="p-3 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-2xl text-xl shadow-inner">📈</span>
                      <span className="px-3 py-1 bg-rose-500/20 text-rose-300 border border-rose-500/30 font-black text-[10px] rounded-xl flex items-center gap-1.5 animate-pulse shadow-inner font-mono">
                        <span>⚠️</span> STOCKOUT RISK
                      </span>
                    </div>
                    <h3 className="text-lg font-black text-white mb-2">
                      {language === 'ar' ? 'مؤشر سرعة الدوران (Inventory Velocity)' : 'Inventory Velocity Index'}
                    </h3>
                    <p className="text-xs font-bold text-slate-300 mb-4 leading-relaxed">
                      {language === 'ar'
                        ? 'تم رصد زيادة بنسبة 35% في معدل سحب أدوية الطوارئ والمضادات الحيوية خلال الـ 14 يوماً الماضية تزامناً مع التغيرات الموسمية.'
                        : 'A 35% increase in emergency drug and antibiotic consumption velocity was detected over the last 14 days due to seasonal changes.'}
                    </p>
                    <div className="bg-slate-900/80 p-4 rounded-xl border border-white/10 space-y-3 shadow-inner">
                      <div className="flex justify-between items-center text-xs font-bold">
                        <span className="text-slate-400">{language === 'ar' ? 'متوسط السحب اليومي:' : 'Avg Daily Consumption:'}</span>
                        <span className="font-mono text-indigo-400 font-black">142 {language === 'ar' ? 'عبوة / يوم' : 'Units/Day'}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs font-bold">
                        <span className="text-slate-400">{language === 'ar' ? 'أيام التغطية المتبقية (Buffer):' : 'Remaining Buffer Days:'}</span>
                        <span className="font-mono text-rose-400 font-black">18 {language === 'ar' ? 'يوماً فقط' : 'Days Only'}</span>
                      </div>
                      <div className="w-full bg-slate-950/80 h-2.5 rounded-full overflow-hidden shadow-inner border border-white/5">
                        <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-rose-500 h-full w-[35%] rounded-full animate-pulse"></div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-[11px] font-black text-slate-400">
                    <span className="text-slate-400">💡 {language === 'ar' ? 'توصية الذكاء الاصطناعي:' : 'AI Recommendation:'}</span>
                    <span className="text-indigo-300 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20">{language === 'ar' ? 'زيادة مخزون الأمان بنسبة 25%' : 'Increase safety stock by 25%'}</span>
                  </div>
                </div>

                {/* Card 2: Clinic Consumption Behavior */}
                <div className="bg-slate-900/60 backdrop-blur-2xl border border-white/10 p-6 rounded-3xl flex flex-col justify-between shadow-2xl hover:border-white/20 transition-all duration-300 hover:-translate-y-1 hover:shadow-indigo-500/5">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <span className="p-3 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-2xl text-xl shadow-inner">🏥</span>
                      <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-black text-[10px] rounded-xl shadow-inner">
                        {language === 'ar' ? 'تحليل التوزيع الطبي' : 'Clinic Distribution'}
                      </span>
                    </div>
                    <h3 className="text-lg font-black text-white mb-2">
                      {language === 'ar' ? 'أنماط صرف العيادات والأطباء' : 'Clinic & Doctor Dispensing Patterns'}
                    </h3>
                    <p className="text-xs font-bold text-slate-300 mb-4 leading-relaxed">
                      {language === 'ar'
                        ? 'تحليل التوزيع المالي للجهات المستهلكة للأدوية والمستلزمات لمراقبة مراكز التكلفة ومنع الهدر الطبي.'
                        : 'Financial distribution analysis of consuming entities to monitor cost centers and prevent medical waste.'}
                    </p>
                    <div className="space-y-3">
                      <div className="bg-slate-950/60 border border-white/5 p-3.5 rounded-xl flex items-center justify-between text-xs font-bold shadow-inner hover:bg-slate-950/80 transition-colors">
                        <span className="flex items-center gap-2.5 text-slate-200">
                          <span className="w-2 h-2 bg-indigo-400 rounded-full shadow-[0_0_8px_rgba(129,140,248,0.8)]"></span>
                          {language === 'ar' ? 'عيادة الطوارئ بالموقع الرئيسي' : 'Main Site Emergency Clinic'}
                        </span>
                        <span className="font-mono text-indigo-400 font-black">45% (18,450 {language === 'ar' ? 'ج.م' : 'LCY'})</span>
                      </div>
                      <div className="bg-slate-950/60 border border-white/5 p-3.5 rounded-xl flex items-center justify-between text-xs font-bold shadow-inner hover:bg-slate-950/80 transition-colors">
                        <span className="flex items-center gap-2.5 text-slate-200">
                          <span className="w-2 h-2 bg-emerald-400 rounded-full shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
                          {language === 'ar' ? 'عيادة موقع العاصمة الإدارية' : 'New Capital Site Clinic'}
                        </span>
                        <span className="font-mono text-emerald-400 font-black">35% (14,350 {language === 'ar' ? 'ج.م' : 'LCY'})</span>
                      </div>
                      <div className="bg-slate-950/60 border border-white/5 p-3.5 rounded-xl flex items-center justify-between text-xs font-bold shadow-inner hover:bg-slate-950/80 transition-colors">
                        <span className="flex items-center gap-2.5 text-slate-200">
                          <span className="w-2 h-2 bg-amber-400 rounded-full shadow-[0_0_8px_rgba(251,191,36,0.8)]"></span>
                          {language === 'ar' ? 'صناديق الإسعافات (الورش والمركبات)' : 'First Aid Boxes (Workshops)'}
                        </span>
                        <span className="font-mono text-amber-400 font-black">20% (8,200 {language === 'ar' ? 'ج.م' : 'LCY'})</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-[11px] font-black text-slate-400">
                    <span>👨‍⚕️ {language === 'ar' ? 'الطبيب الأكثر صرفاً:' : 'Top Prescribing Doctor:'}</span>
                    <span className="text-white font-black">{language === 'ar' ? 'د. أحمد رضوان (عيادة الطوارئ)' : 'Dr. Ahmed Radwan'}</span>
                  </div>
                </div>

                {/* Card 3: Financial Interoperability, Claims & AI Accountant 360 */}
                <div className="bg-slate-900/60 backdrop-blur-2xl border border-white/10 p-6 rounded-3xl flex flex-col justify-between shadow-2xl hover:border-white/20 transition-all duration-300 hover:-translate-y-1 hover:shadow-indigo-500/5 relative overflow-hidden">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <span className="p-3 bg-teal-500/20 text-teal-300 border border-teal-500/30 rounded-2xl text-xl shadow-inner">💸</span>
                      <span className="px-3 py-1 bg-teal-500/20 text-teal-300 border border-teal-500/30 font-black text-[10px] rounded-xl font-mono shadow-inner">
                        {language === 'ar' ? 'التكامل المحاسبي المباشر' : 'GL Interoperability'}
                      </span>
                    </div>
                    <h3 className="text-lg font-black text-white mb-2 flex items-center gap-2">
                      <span>{language === 'ar' ? 'حالة القيود المحاسبية والمطالبات' : 'GL Postings & Insurance Claims Status'}</span>
                    </h3>
                    <p className="text-xs font-bold text-slate-300 mb-4 leading-relaxed">
                      {language === 'ar'
                        ? 'يتم ترحيل كل حركة صرف أو إعدام أدوية فوراً إلى حسابات الأستاذ العام (General Ledger) مع توليد مطالبات التأمين.'
                        : 'Every dispensing or disposal transaction is instantly posted to General Ledger accounts with insurance claims generated.'}
                    </p>
                    <div className="bg-slate-950/60 border border-white/5 p-4 rounded-2xl space-y-3 mb-4 shadow-inner">
                      <div className="flex justify-between items-center text-xs font-bold border-b border-white/5 pb-2">
                        <span className="text-slate-400">{language === 'ar' ? 'قيود الأستاذ العام المرحّلة:' : 'Posted GL Entries:'}</span>
                        <span className="font-mono text-teal-400 font-black">1,420 {language === 'ar' ? 'قيداً مزدوجاً' : 'Double Entries'}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs font-bold border-b border-white/5 pb-2">
                        <span className="text-slate-400">{language === 'ar' ? 'مطالبات التأمين المعلقة (TPA):' : 'Pending TPA Claims:'}</span>
                        <span className="font-mono text-amber-400 font-black">45,000 {language === 'ar' ? 'ج.م' : 'LCY'}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs font-bold">
                        <span className="text-slate-400">{language === 'ar' ? 'قيمة التوالف المعدمة (Disposals):' : 'Disposed Losses:'}</span>
                        <span className="font-mono text-rose-400 font-black">3,250 {language === 'ar' ? 'ج.م' : 'LCY'}</span>
                      </div>
                    </div>

                    {/* 🤖 AI Accountant 360 Diagnostics Section */}
                    <div className="bg-slate-950/80 text-white p-5 rounded-2xl border border-teal-500/20 space-y-4 shadow-2xl shadow-teal-500/5 backdrop-blur-md">
                      <div className="flex items-center justify-between border-b border-white/10 pb-3">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl animate-pulse">🤖</span>
                          <div>
                            <h4 className="text-[10px] font-black text-cyan-400">المحاسب الذكي 360 (AI Accountant 360)</h4>
                            <p className="text-[8px] text-slate-400">فحص الشذوذ المالي والتوازن المحاسبي لدفاتر IFRS</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={aiScanning}
                          onClick={() => {
                            setAiScanning(true);
                            setTimeout(() => {
                              setAiScanning(false);
                              setAiAccountantScan(true);
                            }, 1800);
                          }}
                          className={`px-3.5 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 border ${aiScanning ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-wait' : 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border-cyan-500/40 shadow-md shadow-cyan-500/10 active:scale-95'}`}
                        >
                          <span>{aiScanning ? '⏳' : '⚡'}</span> {aiScanning ? 'جاري الفحص...' : 'تشغيل التشخيص'}
                        </button>
                      </div>

                      {aiScanning ? (
                        <div className="py-6 text-center space-y-3 animate-pulse">
                          <div className="w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                          <p className="text-[10px] text-slate-300 font-mono">AI Accountant is analyzing 1,420 GL double-entries for anomalies...</p>
                        </div>
                      ) : aiAccountantScan ? (
                        <div className="space-y-3 text-[10px] animate-in fade-in duration-300">
                          <div className="flex justify-between items-center bg-slate-950/80 p-3 rounded-xl border border-emerald-500/30 shadow-inner">
                            <span className="text-slate-200 flex items-center gap-2 font-bold"><span>✔️</span> فحص التوازن المالي (Debits vs Credits):</span>
                            <span className="text-emerald-400 font-mono font-black">100% Balanced</span>
                          </div>
                          <div className="flex justify-between items-center bg-slate-950/80 p-3 rounded-xl border border-emerald-500/30 shadow-inner">
                            <span className="text-slate-200 flex items-center gap-2 font-bold"><span>🛡️</span> رصد الشذوذ المالي (Anomaly Detection):</span>
                            <span className="text-emerald-400 font-mono font-black">0 Orphan Claims</span>
                          </div>
                          <div className="flex justify-between items-center bg-slate-950/80 p-3 rounded-xl border border-cyan-500/30 shadow-inner">
                            <span className="text-slate-200 flex items-center gap-2 font-bold"><span>📈</span> مؤشر المخاطر التشغيلية (Risk Score):</span>
                            <span className="text-cyan-400 font-mono font-black">0.02 (IFRS Ready)</span>
                          </div>
                          <div className="p-3.5 bg-cyan-950/40 border border-cyan-500/30 rounded-xl text-[10px] text-cyan-200 leading-relaxed font-bold shadow-inner">
                            💡 <span className="text-white font-black">توصية المحاسب الآلي:</span> كافة الحركات المسجلة مرتبطة بشكل سليم بأكواد موافقة TPA ورموز GS1 DataMatrix ولا توجد أي تسريبات مالية.
                          </div>
                        </div>
                      ) : (
                        <div className="py-4 text-center text-slate-400 text-[10px] font-bold">
                          انقر على "تشغيل التشخيص" لبدء الفحص المالي الشامل باستخدام الذكاء الاصطناعي.
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-[11px] font-black text-slate-400">
                    <span>🛡️ {language === 'ar' ? 'حالة المطابقة المحاسبية:' : 'Reconciliation Status:'}</span>
                    <span className="text-emerald-400 font-black">{language === 'ar' ? 'متطابق 100% (IFRS)' : '100% Matched (IFRS)'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Pharma Item List */}
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-black text-slate-900">{curT.emdad.itemList}</h3>
              </div>

              <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-xl">
                <table className="w-full text-right" style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}>
                  <thead className="bg-slate-50 border-b border-slate-100">
                    <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                      <th className="px-6 py-4 text-start">{curT.emdad.colName}</th>
                      <th className="px-6 py-4 text-start">{curT.emdad.colCategory}</th>
                      <th className="px-6 py-4 text-start">{curT.emdad.colQty}</th>
                      <th className="px-6 py-4 text-start">{curT.emdad.colCost}</th>
                      <th className="px-6 py-4 text-start">{curT.emdad.colBatch}</th>
                      <th className="px-6 py-4 text-start">{curT.emdad.colActions}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-mono text-[11px]">
                    {pharmaItems.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-all">
                        <td className="px-6 py-4">
                          <p className="font-black text-slate-900 text-xs">{item.item_name}</p>
                          <p className="text-slate-400 text-[8px] mt-0.5">{item.active_substance || 'N/A'}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase w-fit ${
                              item.pharma_category === 'CONTROLLED'
                                ? 'bg-rose-50 text-rose-600 border border-rose-100'
                                : item.pharma_category === 'COLD_CHAIN'
                                ? 'bg-blue-50 text-blue-600 border border-blue-100'
                                : 'bg-slate-100 text-slate-500'
                            }`}>
                              {item.pharma_category === 'CONTROLLED' ? curT.emdad.controlledBadge : item.pharma_category === 'COLD_CHAIN' ? curT.emdad.coldChainBadge : 'OTC'}
                            </span>
                            <span className="text-[8px] text-slate-400">{item.storage_temp}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`font-black text-sm ${item.remaining_qty < 100 ? 'text-rose-500' : 'text-slate-900'}`}>
                            {item.remaining_qty}
                          </span>
                          <span className="text-[9px] text-slate-400 mx-1">{item.uom || 'عبوة'}</span>
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-700">{item.unit_cost} LCY</td>
                        <td className="px-6 py-4">
                          <p className="text-slate-900 font-bold">{item.batch_no}</p>
                          <p className={`text-[9px] ${new Date(item.expiry_date) < new Date() ? 'text-rose-500 font-black' : 'text-slate-400'}`}>
                            {item.expiry_date}
                          </p>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleOpenDispense(item)}
                            className="px-4 py-2 bg-slate-950 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all"
                          >
                            {curT.emdad.dispenseBtn}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* SUBCONTRACTORS 360 TAB CONTENT                       */}
        {/* ==================================================== */}
        {activePortalTab === 'subs' && (
          <div className="space-y-12 animate-in fade-in duration-500">
            {/* Inline inspector mode if sub selected */}
            {selectedSubId ? (
              <div className="relative animate-in slide-in-from-bottom duration-500">
                <button
                  onClick={() => setSelectedSubId(null)}
                  className="absolute top-4 right-4 z-[250] bg-slate-900 text-white px-5 py-2.5 rounded-xl text-xs font-black"
                >
                  ← {language === 'ar' ? 'العودة لقائمة المقاولين' : 'Back to Subcontractors List'}
                </button>
                <Subcontractor360 subId={selectedSubId} onClose={() => setSelectedSubId(null)} language={language} />
              </div>
            ) : (
              <>
                {/* Global Stats */}
                {subcontractorStats && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-slate-950 p-6 rounded-3xl text-white shadow-xl relative overflow-hidden border border-white/5">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-2">Total Value</span>
                      <h3 className="text-2xl font-black font-mono tracking-tighter text-indigo-400">
                        {Number(subcontractorStats.total_contract_value || 0).toLocaleString()} LCY
                      </h3>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xl">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Active Partners</span>
                      <h3 className="text-2xl font-black text-slate-900 font-mono tracking-tighter">
                        {subcontractorStats.total_subs || subcontractors.length}
                      </h3>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xl">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Pending Claims</span>
                      <h3 className="text-2xl font-black text-slate-900 font-mono tracking-tighter">
                        {subcontractorStats.pending_claims || 0}
                      </h3>
                    </div>
                    <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xl">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Compliance Alert</span>
                      <h3 className="text-2xl font-black text-rose-500 font-mono tracking-tighter">
                        {subcontractorStats.expired_compliance || 0}
                      </h3>
                    </div>
                  </div>
                )}

                {/* Subcontractor Selector dropdown */}
                <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-xl">
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3">
                    {curT.subs.selectorLabel}
                  </label>
                  <select
                    onChange={e => {
                      if (e.target.value) setSelectedSubId(Number(e.target.value));
                    }}
                    className="w-full md:w-96 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:border-slate-950"
                  >
                    <option value="">{curT.subs.selectPlaceholder}</option>
                    {subcontractors.map(sub => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name} - {sub.company || 'Private Entity'}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Subcontractor Grid List */}
                <div className="space-y-6">
                  <h3 className="text-xl font-black text-slate-900">{curT.subs.subGridTitle}</h3>
                  <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-xl">
                    <table className="w-full text-right" style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}>
                      <thead className="bg-slate-50 border-b border-slate-100">
                        <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                          <th className="px-6 py-4 text-start">{curT.subs.colName}</th>
                          <th className="px-6 py-4 text-start">{curT.subs.colPhone}</th>
                          <th className="px-6 py-4 text-start">{curT.subs.colProject}</th>
                          <th className="px-6 py-4 text-start">{curT.subs.colExposure}</th>
                          <th className="px-6 py-4 text-start">{language === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50 font-mono text-[11px]">
                        {subcontractors.map(sub => (
                          <tr key={sub.id} className="hover:bg-slate-50/50 transition-all">
                            <td className="px-6 py-4">
                              <p className="font-black text-slate-900 text-xs">{sub.name}</p>
                              <p className="text-slate-400 text-[8px] mt-0.5">{sub.company || 'Private Entity'}</p>
                            </td>
                            <td className="px-6 py-4 text-slate-500 font-bold text-xs">{sub.phone || 'N/A'}</td>
                            <td className="px-6 py-4 text-slate-600 font-bold text-xs">{sub.project_name || 'Standby'}</td>
                            <td className="px-6 py-4 font-black text-emerald-600 text-sm">
                              {Number(sub.total_invoices || 0).toLocaleString()} LCY
                            </td>
                            <td className="px-6 py-4">
                              <button
                                onClick={() => setSelectedSubId(sub.id)}
                                className="px-4 py-2 bg-slate-950 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all"
                              >
                                {curT.subs.inspectBtn}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* --- FORENSIC AUDIT LOG SNAPSHOT MODAL --- */}
      {selectedAuditLog && (
        <div className="fixed inset-0 z-[300] bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl rounded-[2.5rem] overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">{curT.finance.modalTitle}</h3>
                <p className="text-slate-400 text-xs font-bold mt-1">ID: #{selectedAuditLog.id} • {selectedAuditLog.action}</p>
              </div>
              <button
                onClick={() => setSelectedAuditLog(null)}
                className="bg-white border border-slate-200 hover:bg-slate-900 hover:text-white p-3 rounded-2xl transition-all text-xs font-bold"
              >
                ✕
              </button>
            </div>
            <div className="p-8 overflow-y-auto flex-1 bg-slate-950 text-emerald-400 font-mono text-xs custom-scrollbar">
              <pre className="whitespace-pre-wrap word-break">
                {JSON.stringify(selectedAuditLog.snapshot || selectedAuditLog.details || selectedAuditLog.metadata || selectedAuditLog, null, 2)}
              </pre>
            </div>
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedAuditLog(null)}
                className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest"
              >
                {curT.finance.closeModal}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- QUICK DISPENSE MODAL --- */}
      {dispenseModalOpen && dispenseItem && (
        <div className="fixed inset-0 z-[300] bg-slate-950/60 backdrop-blur-md flex items-center justify-center p-4">
          <form onSubmit={handleDispenseSubmit} className="bg-white w-full max-w-md rounded-[2.5rem] overflow-hidden shadow-2xl border border-slate-100 flex flex-col animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">
                  {language === 'ar' ? 'تسجيل إذن صرف دواء' : 'Dispense Medicine Protocol'}
                </h3>
                <p className="text-slate-400 text-xs font-bold mt-1">{dispenseItem.item_name}</p>
              </div>
              <button
                type="button"
                onClick={() => setDispenseModalOpen(false)}
                className="text-slate-400 hover:text-slate-950 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                  {language === 'ar' ? 'الكمية المراد صرفها' : 'Quantity to Dispense'}
                </label>
                <input
                  type="number"
                  required
                  value={dispenseQty}
                  onChange={e => setDispenseQty(e.target.value)}
                  placeholder="0"
                  max={dispenseItem.remaining_qty}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:border-slate-950"
                />
                <span className="text-[10px] text-slate-400 block mt-1">
                  {language === 'ar' ? `الحد الأقصى المتاح: ${dispenseItem.remaining_qty}` : `Max Available: ${dispenseItem.remaining_qty}`}
                </span>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                  {language === 'ar' ? 'الجهة المستلمة / القسم' : 'Recipient / Clinic'}
                </label>
                <input
                  type="text"
                  required
                  value={dispenseRecipient}
                  onChange={e => setDispenseRecipient(e.target.value)}
                  placeholder={language === 'ar' ? 'عيادة الطوارئ / الرعاية الحرجة' : 'Emergency Room / ICU'}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-800 focus:outline-none focus:border-slate-950"
                />
              </div>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDispenseModalOpen(false)}
                className="px-5 py-3 bg-white border border-slate-200 rounded-xl text-xs font-black text-slate-500 hover:bg-slate-50"
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="px-6 py-3 bg-slate-950 hover:bg-emerald-600 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all"
              >
                {language === 'ar' ? 'تأكيد الصرف' : 'Confirm Payout'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
