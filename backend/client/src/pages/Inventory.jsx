import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import AuditTimeline from '../components/AuditTimeline';
import RadialActionHub from '../components/RadialActionHub';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export default function Inventory() {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState('purchases');
  const [isProcessing, setIsProcessing] = useState(false);
  const [ddpViewType, setDdpViewType] = useState('card'); // 'card' or 'table'

  const UOM_OPTIONS = [
    { value: 'PCS', label: language === 'ar' ? 'قطعة (PCS)' : 'Pieces (PCS)' },
    { value: 'KG', label: language === 'ar' ? 'كيلوجرام (KG)' : 'Kilograms (KG)' },
    { value: 'M', label: language === 'ar' ? 'متر (M)' : 'Meters (M)' },
    { value: 'LM', label: language === 'ar' ? 'متر طولي (LM)' : 'Linear Meter (LM)' },
    { value: 'M2', label: language === 'ar' ? 'متر مربع (M2)' : 'Square Meters (M2)' },
    { value: 'M3', label: language === 'ar' ? 'متر مكعب (M3)' : 'Cubic Meters (M3)' },
    { value: 'L', label: language === 'ar' ? 'لتر (L)' : 'Liters (L)' },
    { value: 'BOX', label: language === 'ar' ? 'صندوق (BOX)' : 'Box' },
    { value: 'PACK', label: language === 'ar' ? 'عبوة (PACK)' : 'Pack' },
    { value: 'ROLL', label: language === 'ar' ? 'رول (ROLL)' : 'Roll' },
    { value: 'TON', label: language === 'ar' ? 'طن (TON)' : 'Ton' },
    // Pharmacy & Medical UOMs
    { value: 'STRIP', label: language === 'ar' ? 'شريط (STRIP)' : 'Strip' },
    { value: 'VIAL', label: language === 'ar' ? 'فيال (VIAL)' : 'Vial' },
    { value: 'AMPOULE', label: language === 'ar' ? 'أمبول (AMPOULE)' : 'Ampoule' },
    { value: 'BOTTLE', label: language === 'ar' ? 'زجاجة / عبوة شراب (BOTTLE)' : 'Bottle' },
    { value: 'TUBE', label: language === 'ar' ? 'أنبوبة مرهم (TUBE)' : 'Tube' },
    { value: 'SACHET', label: language === 'ar' ? 'كيس / فوار (SACHET)' : 'Sachet' },
    { value: 'SYRINGE', label: language === 'ar' ? 'حقنة / سرنجة (SYRINGE)' : 'Syringe' },
    { value: 'CARTRIDGE', label: language === 'ar' ? 'خرطوشة (CARTRIDGE)' : 'Cartridge' },
    { value: 'SUPPOSITORY', label: language === 'ar' ? 'تحميلة / لبوس (SUPPOSITORY)' : 'Suppository' },
    { value: 'DROPPER', label: language === 'ar' ? 'قطارة (DROPPER)' : 'Dropper' },
    { value: 'CARTON', label: language === 'ar' ? 'كرتونة (CARTON)' : 'Carton' }
  ];

  const handlePrint = () => {
    window.print();
  };

  const exportToExcel = (data, fileName) => {
    if (!data || data.length === 0) return;
    const headers = Object.keys(data[0]).join(",");
    const rows = data.map(row =>
      Object.values(row).map(value => `"${String(value).replace(/"/g, '""')}"`).join(",")
    ).join("\n");
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + headers + "\n" + rows;
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${fileName}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  const [loading, setLoading] = useState(false);
  const [projectFilter, setProjectFilter] = useState('');
  const [projects, setProjects] = useState([]);
  const [auditModal, setAuditModal] = useState({ isOpen: false, tableName: '', recordId: null });

  const translations = {
    ar: {
      title: "إدارة التوريدات والمخزون المتكاملة",
      allProjects: "جميع المشاريع",
      totalItems: "إجمالي الأصناف",
      tabs: {
        purchases: "أوامر الشراء (PO)",
        stock: "مخزون المستودعات",
        bookings: "حجوزات العملاء",
        transfers: "تحويلات مخزنية",
        ddp: "تكاليف إضافية (DDP)",
        sales: "سجل المبيعات"
      },
      purchases: {
        title: "🛒 إدارة المشتريات والتوريدات",
        addPO: "+ أمر شراء جديد (PO)",
        table: {
          dateRef: "التاريخ / المرجع",
          itemSupplier: "الصنف / المورد",
          project: "المشروع المستهدف",
          qty: "الكمية",
          unitCost: "سعر الوحدة (FCY)",
          total: "الإجمالي (LCY)",
          unitAfterDDP: "التكلفة بعد الـ DDP",
          status: "الحالة",
          actions: "إجراءات"
        },
        receive: "استلام",
        receivedMsg: "✓ تم الاستلام",
        confirmReceive: "هل أنت متأكد من استلام البضاعة؟",
        receiveSuccess: "تمت عملية الاستلام بنجاح!"
      },
      stock: {
        title: "🏪 جرد مخزون المستودعات",
        table: {
          itemPO: "الصنف / الماستر / PO",
          projectWarehouse: "المشروع / المخزن",
          originalStock: "الرصيد الأصلي",
          soldBooked: "مباع / محجوز",
          available: "المتاح (الصافي)",
          unitPrice: "سعر الوحدة (Landed)",
          assetValue: "قيمة الأصول",
          actions: "إجراءات"
        },
        lowStock: "تنبيه: مخزون منخفض",
        directIssue: "صرف مباشر",
        transfer: "تحويل مخزني 🔄",
        bookForCustomer: "حجز لعميل",
        transferSuccess: "تم التحويل المخزني بنجاح!"
      },
      bookings: {
        title: "📅 حجوزات العملاء والتسليمات المعلقة",
        table: {
          customerProject: "العميل / المشروع",
          bookedQty: "الكمية المحجوزة",
          totalValue: "إجمالي القيمة",
          deposit: "العربون المدفوع",
          balance: "المبلغ المتبقي",
          actions: "إجراء"
        },
        completeSale: "إتمام البيع والتسليم 🚀",
        delivered: "✓ تم التسليم",
        bookingSuccess: "تم الحجز بنجاح!",
        credit: "دائن:",
        debit: "مدين:"
      },
      ddp: {
        title: "🚢 تكاليف إضافية (Landed Cost)",
        addExpense: "+ إضافة مصروف DDP",
        table: {
          masterPo: "الماستر (MPO)",
          poId: "أمر الشراء (PO)",
          expenseName: "نوع المصروف",
          expenseType: "وصف المصروف",
          item: "مخصص لـ:",
          allocatedAmount: "المبلغ المخصص",
          currency: "العملة",
          fxRate: "سعر الصرف",
          actions: "إجراءات"
        },
        allocateSuccess: "تم تخصيص المصروف بنجاح!"
      },
      sales: {
        title: "🚚 سجل المبيعات وحركات الصرف",
        table: {
          dateRef: "التاريخ / المرجع",
          customerProject: "العميل / المشروع",
          itemSold: "الصنف المباع",
          qty: "الكمية",
          sellPrice: "سعر البيع",
          buyCost: "تكلفة الشراء",
          netProfit: "صافي الربح",
          paymentMethod: "طريقة السداد",
          batchExpiry: "التشغيلة / الصلاحية"
        },
        saleSuccess: "تم البيع بنجاح!"
      },
      transfers: {
        title: "🔄 سجل التحويلات المخزنية الداخلية",
        table: {
          dateRef: "التاريخ / المرجع",
          item: "الصنف",
          from: "من (مشروع/مخزن)",
          to: "إلى (مشروع/مخزن)",
          qty: "الكمية المحولة",
          by: "بواسطة"
        },
        mainWarehouse: "المخزن الرئيسي"
      },
      modals: {
        po: {
          title: "إصدار طلب توريد مجمع (Master PO)",
          subtitle: "تجهيز دفعة مشتريات ببنود متعددة لمشروع محدد",
          masterRef: "رقم الماستر (Group Reference)",
          supplier: "المورد الرئيسي *",
          project: "المشروع المستهدف *",
          items: "📦 بنود التوريد",
          newItem: "+ إضافة بند جديد",
          desc: "وصف المنتج / البند *",
          qty: "الكمية *",
          uom: "وحدة القياس *",
          price: "السعر (FCY) *",
          fx: "Fx Rate",
          specification: "المواصفات الفنية",
          expectedDate: "تاريخ التوريد المتوقع",
          category: "التصنيف",
          warehouse: "المخزن المستهدف",
          submit: "🚀 ترحيل وحفظ المشتريات المجمعة"
        },
        ddp: {
          title: "تحميل مصاريف DDP إضافية",
          allocation: {
            single: "صنف واحد",
            master: "مجمع (Master)"
          },
          selectPO: "-- اختر أمر الشراء (PO) --",
          selectMaster: "-- اختر المرجع المجمع (Master PO) --",
          date: "التاريخ",
          type: "نوع المصروف (جمارك، شحن...)",
          amount: "المبلغ *",
          currency: "العملة *",
          fx: "سعر الصرف (FX Rate) *",
          submit: "توزيع المصروف وتحديث التكلفة 🚢"
        },
        booking: {
          title: "حجز بضاعة لعميل",
          selectCustomer: "-- اختر عميل من القائمة --",
          qty: "الكمية المحجوزة",
          sellPrice: "سعر البيع المتفق عليه",
          project: "المشروع المرتبط *",
          deposit: "العربون المدفوع",
          paymentMethod: "طريقة السداد",
          wallet: "المحفظة 💳",
          reference: "الرصيد المرجعي",
          balance: "الرصيد المتبقي:",
          submit: "تأكيد حجز البضاعة واستلام العربون"
        },
        sale: {
          title: "عملية صرف ومبيعات مباشرة",
          selectCustomer: "-- اختر عميل من القائمة --",
          qty: "الكمية المباعة",
          price: "سعر الوحدة",
          project: "المشروع المرتبط *",
          payment: "طريقة السداد",
          reference: "الرقم المرجعي للمعاملة",
          submit: "تأكيد الصرف المالي والمخزني"
        },
        transfer: {
          title: "تحويل مخزني داخلي",
          itemToTransfer: "الصنف المراد تحويله",
          availableStock: "الرصيد المتاح حالياً:",
          qty: "الكمية المحولة *",
          toProject: "إلى مشروع",
          toWarehouse: "إلى مخزن",
          sameProject: "-- نفس المشروع --",
          sameWarehouse: "-- نفس المخزن --",
          confirm: "تأكيد التحويل 🚀",
          print: "🖨️ طباعة إذن صرف"
        },
        supplierDeposit: {
          title: "إيداع دفعات مقدمة للموردين",
          supplier: "اسم المورد *",
          amount: "المبلغ *",
          currency: "العملة",
          rate: "سعر الصرف (LCY)",
          avgRate: "متوسط سعر الصرف المرجح",
          date: "التاريخ",
          paymentMethod: "طريقة الدفع *",
          reference: "رقم المرجع / الشيك",
          project: "المشروع (مركز التكلفة) *",
          submit: "تأكيد الإيداع وترحيل القيد",
          success: "تم تسجيل إيداع المورد وترحيله بنجاح 💰"
        }
      },
      common: {
        loading: "جاري التحميل...",
        error: "خطأ",
        success: "نجاح",
        confirm: "تأكيد"
      },
      deposits: {
        title: "سجل الدفعات المقدمة للموردين",
        table: {
          date: "التاريخ",
          supplier: "المورد",
          project: "المشروع",
          amount: "المبلغ (عملة)",
          currency: "العملة",
          rate: "سعر الصرف",
          lcy: "الإجمالي (محلية)",
          method: "الطريقة",
          ref: "المرجع"
        }
      }
    },
    en: {
      title: "Integrated Supply & Inventory Management",
      allProjects: "All Projects",
      totalItems: "Total Items",
      tabs: {
        purchases: "Purchase Orders (PO)",
        stock: "Inventory Stock",
        bookings: "Customer Bookings",
        transfers: "Stock Transfers",
        ddp: "Additional Costs (DDP)",
        sales: "Sales History"
      },
      purchases: {
        title: "🛒 Purchase & Procurement Management",
        addPO: "+ Purchase Order (PO)",
        table: {
          dateRef: "Date / Reference",
          itemSupplier: "Item / Supplier",
          project: "Target Project",
          qty: "Qty",
          unitCost: "Unit Cost (FCY)",
          total: "Total (LCY)",
          unitAfterDDP: "Unit After DDP",
          status: "Status",
          actions: "Actions"
        },
        receive: "Receive",
        receivedMsg: "✓ Received in Stock",
        confirmReceive: "Confirm Reception?",
        receiveSuccess: "Received Successfully!"
      },
      stock: {
        title: "🏪 Warehouse Stock Inventory",
        table: {
          itemPO: "Item / Master / PO",
          projectWarehouse: "Project / Warehouse",
          originalStock: "Original Stock",
          soldBooked: "Sold/Booked",
          available: "Available (Net)",
          unitPrice: "Unit Price (Landed)",
          assetValue: "Asset Value",
          actions: "Actions"
        },
        lowStock: "ALERT: LOW STOCK",
        directIssue: "Direct Issue",
        transfer: "Transfer 🔄",
        bookForCustomer: "Book for Customer",
        transferSuccess: "Stock transfer completed successfully!"
      },
      bookings: {
        title: "📅 Customer Bookings & Pending Deliveries",
        table: {
          customerProject: "Customer / Project",
          bookedQty: "Booked Qty",
          totalValue: "Total Value",
          deposit: "Deposit Paid",
          balance: "Final Balance",
          actions: "Action"
        },
        completeSale: "Complete Sale & Delivery 🚀",
        delivered: "✓ Delivered",
        bookingSuccess: "Booking successful!",
        credit: "Credit:",
        debit: "Debit:"
      },
      ddp: {
        title: "🚢 Additional Costs (Landed Cost)",
        addExpense: "+ Add DDP Expense",
        table: {
          masterPo: "Master PO (MPO)",
          poId: "PO ID",
          expenseName: "Expense Type",
          expenseType: "Expense Description",
          item: "Allocated to:",
          allocatedAmount: "Allocated Amount",
          currency: "Currency",
          fxRate: "FX Rate",
          actions: "Actions"
        },
        allocateSuccess: "Allocated Successfully!"
      },
      sales: {
        title: "🚚 Sales Records & Issues",
        table: {
          dateRef: "Date / Reference",
          customerProject: "Customer / Project",
          itemSold: "Item Sold",
          qty: "Qty",
          sellPrice: "Sell Price",
          buyCost: "Buy Cost",
          netProfit: "Net Profit",
          paymentMethod: "Payment Method",
          batchExpiry: "Batch / Expiry"
        },
        saleSuccess: "Sale successful!"
      },
      transfers: {
        title: "🔄 Internal Stock Transfers Log",
        table: {
          dateRef: "Date / Reference",
          item: "Item",
          from: "From (Project/Warehouse)",
          to: "To (Project/Warehouse)",
          qty: "Transferred Qty",
          by: "By"
        },
        mainWarehouse: "Main Warehouse"
      },
      modals: {
        po: {
          title: "Issue Master PO",
          subtitle: "Prepare multi-item procurement for a specific project",
          masterRef: "Master PO No. (Reference)",
          supplier: "Main Supplier *",
          project: "Target Project *",
          items: "📦 Procurement Items",
          newItem: "+ Add New Item",
          desc: "Item Description *",
          qty: "Qty *",
          uom: "UOM *",
          price: "Price (FCY) *",
          fx: "FX Rate",
          specification: "Technical Specifications",
          expectedDate: "Expected Delivery Date",
          category: "Category",
          warehouse: "Target Warehouse",
          submit: "Confirm & Register Purchase"
        },
        ddp: {
          title: "Allocate DDP Charges",
          allocation: {
            single: "Single Item",
            master: "Master Group"
          },
          selectPO: "-- Select Purchase Order (PO) --",
          selectMaster: "-- Select Master PO Reference --",
          date: "Date",
          type: "Expense Type (Customs, Shipping...)",
          amount: "Amount *",
          currency: "Currency *",
          fx: "FX Rate *",
          submit: "Allocate & Update Cost 🚢"
        },
        booking: {
          title: "Book Items for Customer",
          selectCustomer: "-- Select Customer --",
          qty: "Booked Qty",
          sellPrice: "Agreed Sell Price",
          project: "Linked Project *",
          deposit: "Deposit Paid",
          paymentMethod: "Payment Method",
          wallet: "Wallet 💳",
          reference: "Reference No.",
          balance: "Remaining Balance:",
          submit: "Confirm Booking & Receive Deposit"
        },
        sale: {
          title: "Direct Sales & Issuance",
          selectCustomer: "-- Select Customer --",
          qty: "Sold Qty",
          price: "Unit Price",
          project: "Linked Project *",
          payment: "Payment Method",
          reference: "Reference No.",
          submit: "Confirm Sale & Inventory Issue"
        },
        transfer: {
          title: "Internal Stock Transfer",
          itemToTransfer: "Item to Transfer",
          availableStock: "Current Available Stock:",
          qty: "Transfer Qty *",
          toProject: "To Project",
          toWarehouse: "To Warehouse",
          sameProject: "-- Same Project --",
          sameWarehouse: "-- Same Warehouse --",
          confirm: "Confirm Transfer 🚀",
          print: "🖨️ Print Issue Voucher"
        },
        supplierDeposit: {
          title: "Supplier Advance Payment",
          supplier: "Supplier Name *",
          amount: "Amount *",
          currency: "Currency",
          rate: "FX Rate (LCY)",
          avgRate: "Weighted Avg Rate",
          date: "Date",
          paymentMethod: "Payment Method *",
          reference: "Reference / Check No.",
          project: "Project (Cost Center) *",
          submit: "Confirm Deposit & Post to GL",
          success: "Supplier deposit posted successfully 💰"
        }
      },
      common: {
        loading: "Loading...",
        error: "Error",
        success: "Success",
        confirm: "Confirm"
      },
      deposits: {
        title: "Supplier Advance Payments Log",
        table: {
          date: "Date",
          supplier: "Supplier",
          project: "Project",
          amount: "Amount (FCY)",
          currency: "Curr",
          rate: "FX Rate",
          lcy: "Total (LCY)",
          method: "Method",
          ref: "Reference"
        }
      }
    }
  };
  const t = translations[language] || translations['ar'];

  // Data States
  const [inventoryItems, setInventoryItems] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [poExpenses, setPoExpenses] = useState([]);
  const [salesHistory, setSalesHistory] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [supplierDeposits, setSupplierDeposits] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [intelligenceData, setIntelligenceData] = useState(null);
  const [globalWeightedAvgRate, setGlobalWeightedAvgRate] = useState(0);
  const [mpoWeightedAvgRate, setMpoWeightedAvgRate] = useState(0);
  const [relevantTxns, setRelevantTxns] = useState([]);

  // Modal States
  const [isPOModalOpen, setIsPOModalOpen] = useState(false);
  const [isDDPModalOpen, setIsDDPModalOpen] = useState(false);
  const [isSaleModalOpen, setIsSaleModalOpen] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isSupplierDepositModalOpen, setIsSupplierDepositModalOpen] = useState(false);
  const [editingDepositId, setEditingDepositId] = useState(null);
  const [financialAccounts, setFinancialAccounts] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [warehouses, setWarehouses] = useState([]);
  const [isDrillDownModalOpen, setIsDrillDownModalOpen] = useState(false);
  const [isBalanceModalOpen, setIsBalanceModalOpen] = useState(false);
  const [drillDownContent, setDrillDownContent] = useState({ title: '', data: [], columns: [] });
  const [isMPO360ModalOpen, setIsMPO360ModalOpen] = useState(false);
  const [mpo360Data, setMpo360Data] = useState({ mpo: '', pos: [], sales: [], stock: [], deposits: [], clientTxns: [], audits: [], summary: {} });
  const [detailView, setDetailView] = useState('summary');
  const [hoverContext, setHoverContext] = useState({ visible: false, x: 0, y: 0, content: {} });

  // Forms
  const [poMasterForm, setPOMasterForm] = useState({
    master_po_no: `MPO-${Date.now().toString().slice(-6)}`,
    supplier: '', project_name: 'General',
    supplier_avg_rate: 1,
    has_down_payment: false,
    deposits: [{
      amount: '',
      fx_rate: 1,
      payment_method: 'Cash',
      reference_no: '',
      date: new Date().toISOString().split('T')[0]
    }],
    items: [{
      item_description: '',
      specification: '',
      qty: '',
      uom: 'PCS',
      estimated_cost: '',
      expected_date: new Date().toISOString().split('T')[0],
      category: 'Material',
      warehouse: ''
    }]
  });

  const [ddpForm, setDDPForm] = useState({
    id: null,
    allocation_type: 'single', po_id: '', master_po_no: '',
    expense_name: '', amount: '', currency: 'EGP', fx_rate: 1,
    expense_date: new Date().toISOString().split('T')[0]
  });
  const [saleForm, setSaleForm] = useState({
    client_id: '',
    customer_name: '',
    qty: '',
    sell_price: '',
    project_name: 'General',
    payment_method: 'Cash',
    reference_no: '',
    date: new Date().toISOString().split('T')[0],
    down_payment: '',
    wallet_deduction: 0,
    installments: [],
    vat_rate: 0,
    wht_rate: 0
  });

  const resetSaleForm = () => {
    setSaleForm({
      client_id: '',
      customer_name: '',
      qty: '',
      sell_price: '',
      project_name: 'General',
      payment_method: 'Cash',
      reference_no: '',
      date: new Date().toISOString().split('T')[0],
      down_payment: '',
      wallet_deduction: 0,
      installments: [],
      vat_rate: 0,
      wht_rate: 0
    });
  };
  const [bookingForm, setBookingForm] = useState({
    client_id: '', customer_name: '', qty: '', sell_price: '', deposit_amount: '',
    project_name: 'General', payment_method: 'Cash', debit_account: '', reference_no: '',
    expiry_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // Default 7 days
  });
  const [transferForm, setTransferForm] = useState({ inventory_id: '', qty: '', to_warehouse: '', to_project: '' });
  const [supplierDepositForm, setSupplierDepositForm] = useState({
    supplier_name: '',
    master_po_no: '',
    amount: '',
    currency: 'SAR',
    fx_rate: 1,
    project_name: 'General',
    payment_method: 'Bank Transfer',
    credit_account: '', // Added: Selected GL account
    wht_percent: 0, // Added: Optional Withholding Tax
    reference_no: '',
    date: new Date().toISOString().split('T')[0]
  });

  const [balanceForm, setBalanceForm] = useState({
    booking_id: '',
    customer_name: '',
    current_credit: 0,
    action_type: 'refund', // 'refund' or 'transfer'
    amount: '',
    credit_account: '', // For refund: where money is coming from
    reference_no: ''
  });

  const handleBalanceAction = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const endpoint = balanceForm.action_type === 'refund'
        ? `/inventory/bookings/${balanceForm.booking_id}/refund`
        : `/inventory/bookings/${balanceForm.booking_id}/transfer-credit`;

      await api.post(endpoint, balanceForm);
      alert(language === 'ar' ? "تمت العملية بنجاح!" : "Action completed successfully!");
      setIsBalanceModalOpen(false);
      fetchData();
    } catch (error) {
      alert(error.response?.data?.error || "Error processing balance action");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openSupplierDepositModal = async (mpo = '', supplier = '', project = 'General') => {
    setEditingDepositId(null);
    try {
      // 1. Fetch live financial accounts (Cash/Bank) from the audit-ready COA
      const res = await api.get('/inventory/financial-accounts');
      const accounts = res.data.data || [];
      setFinancialAccounts(accounts);

      // 2. Set form state with context
      setSupplierDepositForm(prev => ({
        ...prev,
        master_po_no: mpo,
        supplier_name: supplier,
        project_name: project,
        credit_account: accounts.length > 0 ? accounts[0].account_name : ''
      }));

      setIsSupplierDepositModalOpen(true);
    } catch (err) {
      console.error("Failed to load financial accounts for deposit:", err);
      // Fallback: Open with empty accounts if API fails to prevent blocking
      setIsSupplierDepositModalOpen(true);
    }
  };

  const openEditSupplierDepositModal = async (dep, parsedData) => {
    try {
      const res = await api.get('/inventory/financial-accounts');
      const accounts = res.data.data || [];
      setFinancialAccounts(accounts);

      const { supplier, amount, currency, rate, ref } = parsedData;
      
      let mpo = '';
      if (dep.description?.includes('MPO:')) {
        const mpoPart = dep.description.split('MPO:')[1]?.trim();
        mpo = mpoPart.split('|')[0]?.trim().split(' ')[0]?.trim();
        if (mpo === 'N/A') mpo = '';
      }

      setEditingDepositId(dep.id);
      setSupplierDepositForm({
        supplier_name: supplier,
        master_po_no: mpo,
        amount: amount.toString(),
        currency: currency,
        fx_rate: rate.toString(),
        project_name: dep.cost_center || 'General',
        payment_method: dep.description?.includes('Net Payment') ? 'Bank Transfer' : 'Cash',
        credit_account: accounts.length > 0 ? accounts[0].account_name : '',
        wht_percent: 0,
        reference_no: ref === '-' ? '' : ref,
        date: new Date(dep.created_at || dep.date).toISOString().split('T')[0]
      });

      setIsSupplierDepositModalOpen(true);
    } catch (err) {
      console.error("Failed to load financial accounts for editing deposit:", err);
      setIsSupplierDepositModalOpen(true);
    }
  };

  const handleDeleteSupplierDeposit = async (id) => {
    if (!window.confirm(language === 'ar' ? 'هل أنت متأكد من حذف هذه الدفعة المقدمة؟ سيتم تحديث متوسط سعر الصرف للمشروع تلقائياً.' : 'Are you sure you want to delete this supplier deposit? This will automatically recalculate the weighted average FX rate.')) {
      return;
    }
    try {
      setIsSubmitting(true);
      await api.delete(`/inventory/supplier-deposit/${id}`);
      alert(language === 'ar' ? 'تم حذف الدفعة بنجاح وتحديث أسعار الصرف.' : 'Supplier deposit deleted successfully and exchange rates updated.');
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || t.common.error);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => { fetchData(); }, [activeTab, projectFilter]);

  useEffect(() => {
    if (isDrillDownModalOpen || isMPO360ModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [isDrillDownModalOpen, isMPO360ModalOpen]);

  const handleOpenMPO360 = async (mpoNo) => {
    if (!mpoNo) return;
    try {
      setLoading(true);
      const res = await api.get(`/mpo-360/${mpoNo}`);
      setMpo360Data(res.data);
      setDetailView('summary');
      setIsMPO360ModalOpen(true);
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to fetch MPO 360 Data');
    } finally {
      setLoading(false);
    }
  };

  // Calculate Average Rates automatically when form or deposits change
  useEffect(() => {
    const sName = supplierDepositForm.supplier_name;
    const mpoNo = supplierDepositForm.master_po_no;

    // Global Supplier Avg Rate
    if (sName) {
      const sTxns = supplierDeposits.filter(d =>
        d.description?.toLowerCase().includes(sName.toLowerCase()) ||
        d.account_name?.toLowerCase().includes(sName.toLowerCase())
      );
      setRelevantTxns(sTxns);
      if (sTxns.length > 0) {
        let totalLcy = 0; let totalFcy = 0;
        sTxns.forEach(d => {
          const desc = d.description || '';
          const parts = desc.split('|');
          if (parts.length >= 2) {
            const amountPart = parts[1].trim().split(' ');
            const fcy = parseFloat(amountPart[0] || 0);
            let rate = 1;
            if (desc.includes('Rate:')) {
              const rateMatch = desc.match(/Rate:\s*([\d.]+)/);
              if (rateMatch) rate = parseFloat(rateMatch[1]);
            }
            if (!isNaN(fcy) && !isNaN(rate)) {
              totalFcy += fcy;
              totalLcy += (fcy * rate);
            }
          }
        });
        if (typeof setGlobalWeightedAvgRate === 'function') setGlobalWeightedAvgRate(totalFcy > 0 ? (totalLcy / totalFcy) : 0);
      } else { if (typeof setGlobalWeightedAvgRate === 'function') setGlobalWeightedAvgRate(0); }
    } else {
      if (typeof setGlobalWeightedAvgRate === 'function') setGlobalWeightedAvgRate(0);
      setRelevantTxns([]);
    }

    // MPO Specific Avg Rate
    if (sName && mpoNo) {
      const mTxns = supplierDeposits.filter(d =>
        d.description?.includes(sName) &&
        (d.description?.includes(mpoNo) || d.reference_no === mpoNo)
      );
      if (mTxns.length > 0) {
        let tLcy = 0; let tFcy = 0;
        mTxns.forEach(d => {
          const parts = d.description.split('|');
          const amountPart = parts[1]?.trim().split(' ');
          const fcy = parseFloat(amountPart?.[0] || 0);
          const rate = parts[1]?.includes('Rate:') ? parseFloat(parts[1].split('Rate:')[1].split(')')[0]) : 1;
          tFcy += fcy; tLcy += (fcy * rate);
        });
        setMpoWeightedAvgRate(tFcy > 0 ? (tLcy / tFcy) : 0);
      } else { setMpoWeightedAvgRate(0); }
    } else { setMpoWeightedAvgRate(0); }
  }, [supplierDepositForm.supplier_name, supplierDepositForm.master_po_no, supplierDeposits]);

  const getMpoAvgRate = (mpoNo, supplierName) => {
    if (!mpoNo || !supplierName) return 1;
    const mTxns = supplierDeposits.filter(d =>
      d.description?.includes(supplierName) &&
      (d.description?.includes(mpoNo) || d.reference_no === mpoNo)
    );
    if (mTxns.length > 0) {
      let tLcy = 0; let tFcy = 0;
      mTxns.forEach(d => {
        const parts = d.description.split('|');
        const amountPart = parts[1]?.trim().split(' ');
        const fcy = parseFloat(amountPart?.[0] || 0);
        const rate = parts[1]?.includes('Rate:') ? parseFloat(parts[1].split('Rate:')[1].split(')')[0]) : 1;
        tFcy += fcy; tLcy += (fcy * rate);
      });
      return tFcy > 0 ? (tLcy / tFcy) : 1;
    }
    return 1;
  };

  const getSupplierGlobalRate = (supplierName) => {
    if (!supplierName) return 1;
    const sTxns = supplierDeposits.filter(d => d.description?.includes(supplierName));
    if (sTxns.length > 0) {
      let tLcy = 0; let tFcy = 0;
      sTxns.forEach(d => {
        const parts = d.description.split('|');
        const amountPart = parts[1]?.trim().split(' ');
        const fcy = parseFloat(amountPart?.[0] || 0);
        const rate = parts[1]?.includes('Rate:') ? parseFloat(parts[1].split('Rate:')[1].split(')')[0]) : 1;
        tFcy += fcy; tLcy += (fcy * rate);
      });
      return tFcy > 0 ? (tLcy / tFcy) : 1;
    }
    return 1;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const filterQuery = projectFilter ? `&filter=${encodeURIComponent(projectFilter)}` : '';
      const [invRes, poRes, ddpRes, salesRes, bookRes, custRes, projRes, wareRes, intelRes, depRes] = await Promise.all([
        api.get(`/table/inventory_items?limit=200${filterQuery}`).catch(() => ({ data: { data: [] } })),
        api.get(`/table/purchase_orders?limit=200${filterQuery}`).catch(() => ({ data: { data: [] } })),
        api.get(`/table/po_expenses?limit=500${filterQuery}`).catch(() => ({ data: { data: [] } })),
        api.get(`/table/inventory_sales?limit=200${filterQuery}`).catch(() => ({ data: { data: [] } })),
        api.get(`/table/inventory_bookings?limit=200${filterQuery}`).catch(() => ({ data: { data: [] } })),
        api.get('/table/customers?limit=500').catch(() => ({ data: { data: [] } })),
        api.get('/dynamic/table/projects?limit=500').catch(() => ({ data: { data: [] } })),
        api.get('/table/warehouses?limit=100').catch(() => ({ data: { data: [] } })),
        api.get('/inventory/intelligence').catch(() => ({ data: null })),
        api.get('/dynamic/table/ledger?filter=Inventory&limit=1000').catch(() => ({ data: { data: [] } }))
      ]);
      setInventoryItems(invRes.data?.data || []);
      setPurchaseOrders(poRes.data?.data || []);
      setPoExpenses(ddpRes.data?.data || []);
      setSalesHistory(salesRes.data?.data || []);
      setBookings(bookRes.data?.data || []);
      setCustomers(custRes.data?.data || []);
      setProjects(projRes.data?.data || []);
      setWarehouses(wareRes.data?.data || []);
      setIntelligenceData(intelRes.data?.data || intelRes.data);

      // Filter for supplier deposits from journal entries (Only Debit side to avoid duplicates)
      const deposits = (depRes.data?.data || []).filter(j =>
        j.description?.includes('Supplier Deposit:') &&
        Number(j.debit) > 0
      );
      setSupplierDeposits(deposits);

      if (projRes.data?.data?.length > 0 && poMasterForm.project_name === 'General') {
        setPOMasterForm(prev => ({ ...prev, project_name: '' }));
      }
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const handlePOSubmit = async (e) => {
    e.preventDefault(); setIsSubmitting(true);
    try {
      // 1. Submit PO items (Update existing or Add new)
      const { items, ...poData } = poMasterForm;
      for (const item of poMasterForm.items) {
        if (item.id) {
          // Update existing record
          await api.put(`/dynamic/update/purchase_orders/${item.id}`, { ...poData, ...item, id: undefined, items: undefined });
        } else {
          // Add new record
          await api.post('/dynamic/add/purchase_orders', { ...poData, ...item, items: undefined, status: 'Approved' });
        }
      }

      alert(t.purchases.receiveSuccess); setIsPOModalOpen(false); fetchData();
    } catch (error) {
      console.error(error);
      alert(error.response?.data?.error || t.common.error);
    } finally { setIsSubmitting(false); }
  };

  const handleReceivePO = async (poId) => {
    if (!window.confirm(t.purchases.confirmReceive)) return;
    try { setLoading(true); await api.post(`/inventory/receive_po/${poId}`); alert(t.purchases.receiveSuccess); fetchData(); }
    catch (error) { alert(error.response?.data?.error || t.common.error); } finally { setLoading(false); }
  };

  const handleDDPDelete = async (id) => {
    if (!window.confirm(t.common.confirmDelete || 'Are you sure you want to delete this record?')) return;
    try {
      setLoading(true);
      await api.delete(`/delete/po_ddp_lcy_charges/${id}`);
      alert(t.common.deleteSuccess || 'Deleted successfully');
      fetchData();
    } catch (error) {
      alert(error.response?.data?.error || t.common.error);
    } finally {
      setLoading(false);
    }
  };

  const handleDDPSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (ddpForm.id) {
        // Prepare filtered payload for generic UPDATE route
        const localAmount = parseFloat(ddpForm.amount) * parseFloat(ddpForm.fx_rate || 1);
        const updatePayload = {
          po_id: ddpForm.po_id,
          expense_name: ddpForm.expense_name,
          amount: localAmount, // LCY
          fcy_amount: ddpForm.amount, // FCY
          currency: ddpForm.currency,
          fx_rate: ddpForm.fx_rate,
          date: ddpForm.expense_date
        };
        await api.put(`/update/po_ddp_lcy_charges/${ddpForm.id}`, updatePayload);
      } else {
        await api.post('/inventory/allocate-expense', ddpForm);
      }
      alert(t.ddp.allocateSuccess);
      setIsDDPModalOpen(false);
      fetchData();
    } catch (error) {
      alert(error.response?.data?.error || t.common.error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitSaleOrder = async (e) => {
    e.preventDefault();

    // Calculations
    const subtotal = Number(saleForm.qty) * Number(saleForm.sell_price);
    const vat = subtotal * (Number(saleForm.vat_rate) / 100);
    const wht = subtotal * (Number(saleForm.wht_rate) / 100);
    const total = subtotal + vat - wht;

    const paid = Number(saleForm.wallet_deduction || 0) + Number(saleForm.down_payment) + saleForm.installments.reduce((sum, i) => sum + Number(i.amount), 0);
    const balance = total - paid;

    if (Math.abs(balance) > 0.01) {
      alert(language === 'ar'
        ? `لا يمكن إتمام البيع وهناك مبلغ متبقي (${balance.toLocaleString()}) غير مجدول! يرجى التأكد من أن مجموع (المحفظة + الدفعة المقدمة + الأقساط) يساوي إجمالي الفاتورة.`
        : `Cannot complete sale! Remaining balance (${balance.toLocaleString()}) must be scheduled. Ensure (Wallet + Down Payment + Installments) equals total.`);
      return;
    }

    setIsSubmitting(true);
    try {
      await api.post('/inventory/sales', {
        ...saleForm,
        inventory_id: selectedItem.id,
        vat_amount: vat,
        wht_amount: wht,
        net_amount: subtotal,
        uom: selectedItem.uom
      });
      alert(t.sales.saleSuccess);
      setIsSaleModalOpen(false);
      resetSaleForm();
      fetchData();
    } catch (error) { alert(error.response?.data?.error || t.common.error); } finally { setIsSubmitting(false); }
  };

  const submitBooking = async (e) => {
    e.preventDefault(); setIsSubmitting(true);
    try {
      const payload = { ...bookingForm, uom: selectedItem.uom };
      // PO records don't have po_id property (they ARE the PO), Inventory items HAVE po_id
      if (selectedItem?.status && !selectedItem?.po_id) {
        payload.po_id = selectedItem.id;
        payload.inventory_id = null;
      } else {
        payload.inventory_id = selectedItem.id;
        payload.po_id = null;
      }
      await api.post('/inventory/bookings', payload);
      alert(t.bookings.bookingSuccess); setIsBookingModalOpen(false); fetchData();
    } catch (error) { alert(error.response?.data?.error || t.common.error); } finally { setIsSubmitting(false); }
  };

  const handleTransfer = async (e) => {
    e.preventDefault(); setIsSubmitting(true);
    try {
      await api.post('/inventory/transfer', { ...transferForm, inventory_id: selectedItem.id });
      alert(t.stock.transferSuccess); setIsTransferModalOpen(false); fetchData();
    } catch (error) { alert(error.response?.data?.error || t.common.error); } finally { setIsSubmitting(false); }
  };

  const submitSupplierDeposit = async (e) => {
    e.preventDefault(); setIsSubmitting(true);
    try {
      if (editingDepositId) {
        await api.put(`/inventory/supplier-deposit/${editingDepositId}`, supplierDepositForm);
        alert(language === 'ar' ? 'تم تعديل الدفعة المقدمة بنجاح.' : 'Supplier deposit updated successfully.');
      } else {
        await api.post('/inventory/supplier-deposit', supplierDepositForm);
        alert(t.modals.supplierDeposit.success);
      }
      setIsSupplierDepositModalOpen(false);
      setEditingDepositId(null);
      fetchData();
      setSupplierDepositForm({
        supplier_name: '', master_po_no: '', amount: '', currency: 'SAR', fx_rate: 1, project_name: 'General',
        payment_method: 'Bank Transfer', credit_account: '', wht_percent: 0, reference_no: '',
        date: new Date().toISOString().split('T')[0]
      });
    } catch (error) {
      alert(error.response?.data?.error || t.common.error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className={`min-h-screen bg-slate-50/50 page-container animate-fade-in relative space-y-8 pb-20 px-4 md:px-8 py-8 ${language === 'ar' ? 'text-right' : 'text-left'}`} dir={language === 'ar' ? 'rtl' : 'ltr'}>

        {/* Enterprise Header - Modern White Style */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-8 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center gap-6 z-10 relative">
            <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-slate-900/20 transform hover:scale-105 transition-all duration-500">
              📦
            </div>
            <div>
              <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
                {t.title}
              </h2>
              <div className="flex flex-wrap items-center gap-4 mt-2">
                <div className="relative group">
                  <select
                    value={projectFilter}
                    onChange={(e) => setProjectFilter(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-700 outline-none focus:ring-4 focus:ring-slate-900/5 transition-all appearance-none min-w-[200px] pr-10 cursor-pointer text-xs"
                  >
                    <option value="">{t.allProjects}</option>
                    {projects.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">▼</div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 px-8 py-4 rounded-2xl text-white shadow-xl relative overflow-hidden min-w-[180px] text-center">
            <div className="absolute right-0 top-0 w-16 h-16 bg-white/5 rounded-full blur-2xl -mr-8 -mt-8"></div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 opacity-60">{t.totalItems}</p>
            <p className="text-4xl font-bold font-mono text-emerald-400 leading-none">{inventoryItems.length}</p>
          </div>
        </div>

        {/* Tabs - Odoo Style Navigation */}
        <div className="bg-white p-2 rounded-[2rem] border border-slate-200 flex flex-wrap gap-2 sticky top-4 z-40 overflow-x-auto no-scrollbar shadow-xl shadow-slate-900/5">
          {[
            { id: 'purchases', name: t.tabs.purchases, icon: '🛒', color: 'text-indigo-500' },
            { id: 'stock', name: t.tabs.stock, icon: '🏪', color: 'text-emerald-500' },
            { id: 'bookings', name: t.tabs.bookings, icon: '📅', color: 'text-amber-500' },
            { id: 'transfers', name: t.tabs.transfers, icon: '🔄', color: 'text-cyan-500' },
            { id: 'ddp', name: t.tabs.ddp, icon: '🚢', color: 'text-orange-500' },
            { id: 'sales', name: t.tabs.sales, icon: '🚚', color: 'text-rose-500' },
            { id: 'deposits', name: language === 'ar' ? 'دفعات الموردين' : 'Supplier Deposits', icon: '💰', color: 'text-emerald-500' },
            { id: 'intelligence', name: language === 'ar' ? 'مركز الذكاء' : 'Intelligence Hub', icon: '🧠', color: 'text-violet-500' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`
              flex items-center gap-3 px-8 py-3.5 rounded-[1.5rem] font-black text-xs transition-all duration-300 whitespace-nowrap
              ${activeTab === tab.id
                  ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/20 translate-y-[-2px]'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}
            `}
            >
              <span className={`text-lg transition-transform duration-300 ${activeTab === tab.id ? 'scale-110' : 'opacity-70 group-hover:opacity-100'}`}>{tab.icon}</span>
              {tab.name}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-h-[700px]">

          {/* --- PURCHASES TAB --- */}
          {activeTab === 'purchases' && (
            <div className="animate-fade-in">
              <div className="p-8 border-b border-slate-100 bg-slate-50/30 flex flex-col sm:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white text-slate-900 rounded-2xl text-xl border border-slate-200 shadow-sm shadow-slate-900/5 transition-transform hover:rotate-6">🛒</div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{t.purchases.title}</h3>
                    <p className="text-slate-400 font-medium text-xs mt-1">{language === 'ar' ? 'تتبع طلبات التوريد وحالة الاستلام' : 'Track procurement and reception status'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center bg-white p-1 rounded-2xl border border-slate-200 shadow-sm">
                    <button onClick={() => exportToExcel(purchaseOrders, 'Purchase_Orders')} className="px-5 py-2.5 text-slate-500 rounded-xl hover:bg-slate-50 hover:text-slate-900 transition-all text-[10px] font-black uppercase tracking-widest">Excel</button>
                    <button onClick={handlePrint} className="px-5 py-2.5 text-slate-500 rounded-xl hover:bg-slate-50 hover:text-slate-900 transition-all text-[10px] font-black uppercase tracking-widest">Print</button>
                  </div>
                  <button onClick={() => {
                    setPOMasterForm({
                      master_po_no: `MPO-${Date.now().toString().slice(-6)}`,
                      supplier: '',
                      project_name: 'General',
                      items: [{ item_description: '', specification: '', qty: '', uom: 'PCS', estimated_cost: '', expected_date: new Date().toISOString().split('T')[0], category: 'Material', warehouse: '' }]
                    });
                    if (typeof setGlobalWeightedAvgRate === 'function') setGlobalWeightedAvgRate(0);
                    setIsPOModalOpen(true);
                  }} className="px-8 py-4 bg-violet-600 hover:bg-violet-700 text-white rounded-[1.5rem] font-black text-xs transition-all shadow-xl shadow-violet-600/20 flex items-center gap-3 transform hover:-translate-y-1 active:scale-95">
                    <span className="text-xl leading-none">+</span> {t.purchases.addPO}
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className={`w-full ${language === 'ar' ? 'text-right' : 'text-left'} whitespace-nowrap`}>
                  <thead className="bg-slate-900 text-white sticky top-0 z-30">
                    <tr className="text-[10px] font-black uppercase tracking-[0.2em]">
                      <th className={`px-6 py-5 sticky ${language === 'ar' ? 'right-0' : 'left-0'} bg-slate-900 z-20`}>{t.purchases.table.dateRef}</th>
                      <th className="px-6 py-5">{t.purchases.table.itemSupplier}</th>
                      <th className="px-6 py-5">{t.purchases.table.project}</th>
                      <th className="px-6 py-5 text-center">{t.purchases.table.qty}</th>
                      <th className="px-6 py-5 text-center">{language === 'ar' ? 'الوحدة' : 'UOM'}</th>
                      <th className="px-6 py-5">{t.purchases.table.unitCost}</th>
                      <th className="px-6 py-5">{t.purchases.table.total}</th>
                      <th className="px-6 py-5 bg-slate-800">{t.purchases.table.unitAfterDDP}</th>
                      <th className="px-6 py-5 text-center">{t.purchases.table.status}</th>
                      <th className={`px-6 py-5 text-center sticky ${language === 'ar' ? 'left-0' : 'right-0'} bg-slate-900 z-20`}>{t.purchases.table.actions}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {purchaseOrders.map(po => (
                      <tr key={po.id} className="hover:bg-slate-50/50 transition-all group">
                        <td className={`px-6 py-4 sticky ${language === 'ar' ? 'right-0' : 'left-0'} bg-inherit z-10 group-hover:bg-slate-50 transition-colors`}>
                          <div className="flex flex-col">
                            <span className="text-[10px] text-slate-400 font-bold font-mono uppercase">{new Date(po.created_at).toLocaleDateString()}</span>
                            <span
                              onClick={() => handleOpenMPO360(po.master_po_no)}
                              className="font-bold text-slate-900 text-xs mt-1 bg-white border border-slate-200 px-2 py-0.5 rounded-md w-fit shadow-sm cursor-pointer hover:border-violet-500 hover:text-violet-600 transition-all"
                            >
                              {po.master_po_no}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span
                              onClick={() => handleOpenMPO360(po.master_po_no)}
                              className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors cursor-pointer"
                            >
                              {po.item_description}
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase mt-1 flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 bg-slate-200 rounded-full"></span>
                              {po.supplier}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[10px] font-bold text-blue-600 bg-blue-50/50 px-2.5 py-1 rounded-lg border border-blue-100/50">{po.project_name}</span>
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-slate-900 text-sm font-mono">{Number(po.qty).toLocaleString()}</td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">{po.uom || 'PCS'}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-700 font-mono text-xs">{Number(po.estimated_cost).toLocaleString()}</span>
                            <span className={`text-[8px] font-black mt-0.5 px-1.5 py-0.5 rounded-md w-fit ${getMpoAvgRate(po.master_po_no, po.supplier) !== 1 ? 'bg-violet-50 text-violet-600 border border-violet-100 shadow-sm' : 'text-slate-400'}`}>
                              FX: {getMpoAvgRate(po.master_po_no, po.supplier).toFixed(4)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 font-mono text-sm">
                              {(Number(po.lcy_total || ((Number(po.qty) * Number(po.estimated_cost) * getMpoAvgRate(po.master_po_no, po.supplier)) + Number(po.ddp_lcy_added_amount || 0)))).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            {Number(po.ddp_lcy_added_amount) > 0 && (
                              <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md w-fit mt-1 border border-emerald-100">
                                + DDP: {Number(po.ddp_lcy_added_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 bg-slate-50/30">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 font-mono text-sm">
                              {(Number(po.unit_cost_after_ddp || (((Number(po.qty) * Number(po.estimated_cost) * getMpoAvgRate(po.master_po_no, po.supplier)) + Number(po.ddp_lcy_added_amount || 0)) / Number(po.qty || 1)))).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            <span className="text-[8px] font-bold text-slate-400 mt-1 uppercase">Final Unit Basis</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm ${po.status === 'Received' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                            po.status === 'Pending Authorization' ? 'bg-amber-50 text-amber-600 border-amber-100 animate-pulse' :
                              'bg-blue-50 text-blue-600 border-blue-100'
                            }`}>
                            {po.status === 'Received' ? t.purchases.receivedMsg :
                              po.status === 'Pending Authorization' ? (language === 'ar' ? 'قيد الاعتماد' : 'Pending Auth') :
                                po.status}
                          </span>
                        </td>
                        <td className={`px-6 py-4 sticky ${language === 'ar' ? 'left-0' : 'right-0'} bg-inherit z-50 group-hover:bg-slate-50 transition-colors`}>
                          <div className="flex justify-center items-center">
                            <RadialActionHub
                              language={language}
                              actions={[
                                {
                                  label: language === 'ar' ? 'استلام بضاعة للمخزن' : 'Receive Goods',
                                  icon: '📥',
                                  onClick: () => handleReceivePO(po.id),
                                  show: po.status !== 'Received'
                                },
                                {
                                  label: language === 'ar' ? 'تعديل السجل' : 'Edit Order',
                                  icon: '✍️',
                                  onClick: () => {
                                    const mpoItems = purchaseOrders.filter(p => p.master_po_no === po.master_po_no);
                                    const uniqueDepositsMap = new Map();
                                    (supplierDeposits || []).filter(d =>
                                      d.description?.includes(po.master_po_no) || d.reference_no === po.master_po_no
                                    ).forEach(d => {
                                      if (!uniqueDepositsMap.has(d.reference_no)) {
                                        const parts = d.description.split('|');
                                        const amountPart = parts[1]?.trim().split(' ');
                                        const fcy = parseFloat(amountPart?.[0] || 0);
                                        const rate = parts[1]?.includes('Rate:') ? parseFloat(parts[1].split('Rate:')[1].split(')')[0]) : 1;
                                        uniqueDepositsMap.set(d.reference_no, {
                                          amount: fcy,
                                          fx_rate: rate,
                                          payment_method: d.payment_method || 'Cash',
                                          reference_no: d.reference_no,
                                          date: d.date?.split('T')[0],
                                          isExisting: true
                                        });
                                      }
                                    });
                                    const mpoDeposits = Array.from(uniqueDepositsMap.values());

                                    setPOMasterForm({
                                      master_po_no: po.master_po_no,
                                      supplier: po.supplier,
                                      project_name: po.project_name || 'General',
                                      supplier_avg_rate: getMpoAvgRate(po.master_po_no, po.supplier),
                                      has_down_payment: mpoDeposits.length > 0,
                                      deposits: mpoDeposits.length > 0 ? mpoDeposits : [{ amount: '', fx_rate: 1, payment_method: 'Cash', reference_no: '', date: new Date().toISOString().split('T')[0] }],
                                      items: mpoItems.map(mi => ({
                                        id: mi.id,
                                        item_description: mi.item_description,
                                        specification: mi.specification,
                                        qty: mi.qty,
                                        uom: mi.uom,
                                        estimated_cost: mi.estimated_cost,
                                        expected_date: mi.expected_date?.split('T')[0],
                                        category: mi.category,
                                        warehouse: mi.warehouse
                                      }))
                                    });
                                    setIsPOModalOpen(true);
                                  }
                                },
                                {
                                  label: 'DDP',
                                  icon: '🚢',
                                  onClick: () => {
                                    setSelectedItem(po);
                                    setDDPForm({ ...ddpForm, po_id: po.id, allocation_type: 'single' });
                                    setIsDDPModalOpen(true);
                                  }
                                },
                                {
                                  label: language === 'ar' ? 'حجز عميل' : 'Booking',
                                  icon: '📅',
                                  onClick: async () => {
                                    setSelectedItem(po);
                                    const accRes = await api.get('/inventory/financial-accounts');
                                    setFinancialAccounts(accRes.data.data || []);
                                    setBookingForm(prev => ({
                                      ...prev,
                                      project_name: po.project_name || 'General',
                                      debit_account: accRes.data.data?.[0]?.account_name || ''
                                    }));
                                    setIsBookingModalOpen(true);
                                  }
                                },
                                {
                                  label: language === 'ar' ? 'إيداع للمورد' : 'Supplier Deposit',
                                  icon: '💰',
                                  onClick: () => openSupplierDepositModal(po.master_po_no, po.supplier, po.project_name || 'General'),
                                  show: true
                                },
                                {
                                  label: language === 'ar' ? 'ذكاء MPO 360' : 'MPO 360 Intelligence',
                                  icon: '🧠',
                                  onClick: () => handleOpenMPO360(po.master_po_no),
                                  show: !!po.master_po_no
                                },
                                {
                                  label: language === 'ar' ? 'التدقيق' : 'Audit',
                                  icon: '🔍',
                                  onClick: () => setAuditModal({ isOpen: true, tableName: 'purchase_orders', recordId: po.id })
                                },
                                {
                                  label: language === 'ar' ? 'حذف' : 'Remove',
                                  icon: '🗑️',
                                  onClick: () => alert('Security: Delete locked.')
                                }
                              ]}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* --- STOCK TAB --- */}
          {activeTab === 'stock' && (
            <div className="animate-fade-in">
              <div className="p-8 border-b border-slate-100 bg-slate-50/30 flex flex-col sm:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white text-slate-900 rounded-2xl text-xl border border-slate-200 shadow-sm shadow-slate-900/5 transition-transform hover:-rotate-6">🏪</div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{t.stock.title}</h3>
                    <p className="text-slate-400 font-medium text-xs mt-1">{language === 'ar' ? 'جرد الأرصدة المتوفرة ومستويات المخزون' : 'Inventory balance and stock levels'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <button onClick={() => exportToExcel(inventoryItems, 'Inventory_Stock')} className="px-4 py-2 text-slate-500 rounded-lg hover:bg-white hover:text-slate-900 transition-all text-[10px] font-bold uppercase tracking-widest">Excel</button>
                    <button onClick={handlePrint} className="px-4 py-2 text-slate-500 rounded-lg hover:bg-white hover:text-slate-900 transition-all text-[10px] font-bold uppercase tracking-widest">Print</button>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className={`w-full ${language === 'ar' ? 'text-right' : 'text-left'} whitespace-nowrap`}>
                  <thead className="bg-slate-900 text-white">
                    <tr className="text-[10px] font-black uppercase tracking-[0.2em]">
                      <th className={`px-6 py-5 sticky ${language === 'ar' ? 'right-0' : 'left-0'} bg-slate-900 z-20`}>{t.stock.table.itemPO}</th>
                      <th className="px-6 py-5">{t.stock.table.projectWarehouse}</th>
                      <th className="px-6 py-5 text-center">{t.stock.table.originalStock}</th>
                      <th className="px-6 py-5 text-center">{t.stock.table.soldBooked}</th>
                      <th className="px-6 py-5 text-center">{t.stock.table.available}</th>
                      <th className="px-6 py-5 bg-slate-800">{language === 'ar' ? 'سعر الشراء (التكلفة)' : 'Buy Price (Cost)'}</th>
                      <th className="px-6 py-5">{t.stock.table.assetValue}</th>
                      <th className={`px-6 py-5 text-center sticky ${language === 'ar' ? 'left-0' : 'right-0'} bg-slate-900 z-20`}>{t.stock.table.actions}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {inventoryItems.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-all group">
                        <td className={`px-6 py-4 sticky ${language === 'ar' ? 'right-0' : 'left-0'} bg-inherit z-10 group-hover:bg-slate-50 transition-colors`}>
                          <div className="flex flex-col">
                            <span
                              onClick={() => handleOpenMPO360(item.master_po_no)}
                              className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors leading-tight cursor-pointer"
                            >
                              {item.item_name}
                            </span>
                            <div className="flex flex-wrap gap-2 mt-1.5">
                              {item.master_po_no && (
                                <span
                                  onClick={(e) => { e.stopPropagation(); handleOpenMPO360(item.master_po_no); }}
                                  className="text-[9px] text-violet-600 font-bold tracking-tight font-mono uppercase bg-violet-50 border border-violet-100 px-2 py-0.5 rounded-md shadow-sm cursor-pointer hover:bg-violet-100"
                                >
                                  MPO: {item.master_po_no}
                                </span>
                              )}
                              <span className="text-[9px] text-slate-400 font-bold tracking-tight font-mono uppercase bg-white border border-slate-200 px-2 py-0.5 rounded-md shadow-sm">PO: #{item.po_id}</span>
                              {item.batch_no && <span className="text-[9px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">Batch: {item.batch_no}</span>}
                              {item.expiry_date && <span className="text-[9px] text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">Exp: {new Date(item.expiry_date).toLocaleDateString()}</span>}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-600 text-xs">{item.project_name}</span>
                            <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1.5 mt-1">
                              <span className="w-1.5 h-1.5 bg-blue-500 rounded-full shadow-sm shadow-blue-500/20"></span>
                              {item.warehouse || 'Main Warehouse'}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center font-bold text-slate-500 text-sm font-mono">{Number(item.quantity).toLocaleString()} <span className="text-[9px] text-slate-300 font-sans">{item.uom || 'Unit'}</span></td>
                        <td className="px-6 py-4 text-center font-bold text-rose-500 text-sm font-mono">{(Number(item.quantity) - Number(item.remaining_qty)).toLocaleString()}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col items-center">
                            <span className={`px-4 py-1.5 rounded-xl font-bold text-base font-mono border shadow-sm transition-all ${Number(item.remaining_qty) <= (item.min_stock_level || 5) ? 'bg-rose-50 text-rose-600 border-rose-100 animate-pulse ring-4 ring-rose-500/5' : 'bg-emerald-50 text-emerald-600 border-emerald-100 ring-4 ring-emerald-500/5'}`}>
                              {Number(item.remaining_qty).toLocaleString()}
                            </span>
                            {Number(item.remaining_qty) <= (item.min_stock_level || 5) && (
                              <span className="text-[8px] font-black text-rose-400 mt-1 uppercase tracking-[0.2em]">{t.stock.lowStock}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 bg-slate-100/10">
                          <div className="flex flex-col">
                            <span className="font-black text-slate-900 font-mono text-sm">{Number(item.avg_cost || item.buy_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1 opacity-60">Landed Cost</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-900 font-mono text-sm">
                          {(Number(item.remaining_qty) * Number(item.avg_cost || item.buy_price)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className={`px-6 py-4 text-center sticky ${language === 'ar' ? 'left-0' : 'right-0'} bg-inherit z-50 group-hover:bg-slate-50 transition-colors`}>
                          <div className="flex items-center justify-center">
                            <RadialActionHub
                              language={language}
                              actions={[
                                {
                                  icon: '🚀',
                                  label: language === 'ar' ? 'بيع مباشر' : 'Issue Stock',
                                  onClick: () => {
                                    setSelectedItem(item);
                                    setSaleForm(prev => ({ ...prev, project_name: item.project_name || 'General' }));
                                    setIsSaleModalOpen(true);
                                  }
                                },
                                {
                                  icon: '🔄',
                                  label: language === 'ar' ? 'تحويل مخزني' : 'Transfer',
                                  onClick: () => {
                                    setSelectedItem(item);
                                    setTransferForm(prev => ({ ...prev, inventory_id: item.id }));
                                    setIsTransferModalOpen(true);
                                  }
                                },
                                {
                                  icon: '📅',
                                  label: language === 'ar' ? 'حجز لعميل' : 'Reserve',
                                  onClick: async () => {
                                    setSelectedItem(item);
                                    const accRes = await api.get('/inventory/financial-accounts');
                                    setFinancialAccounts(accRes.data.data || []);
                                    setBookingForm(prev => ({
                                      ...prev,
                                      project_name: item.project_name || 'General',
                                      debit_account: accRes.data.data?.[0]?.account_name || ''
                                    }));
                                    setIsBookingModalOpen(true);
                                  }
                                },
                                {
                                  icon: '💰',
                                  label: language === 'ar' ? 'إيداع للمورد' : 'Supplier Deposit',
                                  onClick: () => openSupplierDepositModal(item.master_po_no || '', item.supplier_name || '', item.project_name || 'General'),
                                  show: true
                                },
                                {
                                  icon: '🛒',
                                  label: language === 'ar' ? 'طلب توريد جديد' : 'New Purchase Order',
                                  onClick: () => {
                                    setPOMasterForm({
                                      master_po_no: item.master_po_no || `MPO-${Date.now().toString().slice(-6)}`,
                                      supplier: item.supplier_name || '',
                                      project_name: item.project_name || 'General',
                                      supplier_avg_rate: 1,
                                      has_down_payment: false,
                                      deposits: [{ amount: '', fx_rate: 1, payment_method: 'Cash', reference_no: '', date: new Date().toISOString().split('T')[0] }],
                                      items: [{
                                        item_description: item.item_name || '',
                                        specification: '',
                                        qty: '',
                                        uom: item.uom || 'PCS',
                                        estimated_cost: item.avg_cost || item.buy_price || '',
                                        expected_date: new Date().toISOString().split('T')[0],
                                        category: 'Material',
                                        warehouse: item.warehouse || ''
                                      }]
                                    });
                                    if (typeof setGlobalWeightedAvgRate === 'function') setGlobalWeightedAvgRate(0);
                                    setIsPOModalOpen(true);
                                  }
                                },
                                {
                                  label: language === 'ar' ? 'تعديل الصنف' : 'Edit Item',
                                  icon: '✍️',
                                  onClick: () => { setSelectedItem(item); alert('Security Lock'); }
                                },
                                {
                                  icon: '🔍',
                                  label: language === 'ar' ? 'سجل التدقيق' : 'Audit',
                                  onClick: () => setAuditModal({ isOpen: true, tableName: 'inventory_items', recordId: item.id })
                                },
                                {
                                  label: language === 'ar' ? 'إزالة' : 'Remove',
                                  icon: '🗑️',
                                  onClick: () => alert('Security Lock')
                                }
                              ]}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* --- BOOKINGS TAB --- */}
          {activeTab === 'bookings' && (
            <div className="animate-fade-in">
              <div className="p-8 border-b border-slate-100 bg-slate-50/30 flex flex-col sm:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white text-slate-900 rounded-2xl text-xl border border-slate-200 shadow-sm shadow-slate-900/5 transition-transform hover:rotate-12">📅</div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{t.bookings.title}</h3>
                    <p className="text-slate-400 font-medium text-xs mt-1">{language === 'ar' ? 'إدارة حجوزات العملاء والطلبات المعلقة' : 'Manage customer bookings and pending orders'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <button onClick={() => exportToExcel(bookings, 'Customer_Bookings')} className="px-4 py-2 text-slate-500 rounded-lg hover:bg-white hover:text-slate-900 transition-all text-[10px] font-bold uppercase tracking-widest">Excel</button>
                    <button onClick={handlePrint} className="px-4 py-2 text-slate-500 rounded-lg hover:bg-white hover:text-slate-900 transition-all text-[10px] font-bold uppercase tracking-widest">Print</button>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className={`w-full ${language === 'ar' ? 'text-right' : 'text-left'} whitespace-nowrap`}>
                  <thead className="bg-slate-900 text-white">
                    <tr className="text-[10px] font-black uppercase tracking-[0.2em]">
                      <th className={`px-6 py-4 sticky ${language === 'ar' ? 'right-0' : 'left-0'} bg-slate-900 z-20 shadow-[4px_0_10px_rgba(0,0,0,0.3)]`}>{t.bookings.table.customerProject}</th>
                      <th className="px-6 py-4 text-center">{t.bookings.table.bookedQty}</th>
                      <th className="px-6 py-4 text-center">{language === 'ar' ? 'الوحدة' : 'UOM'}</th>
                      <th className="px-6 py-4">{t.bookings.table.totalValue}</th>
                      <th className="px-6 py-4 bg-slate-800/50">{t.bookings.table.deposit}</th>
                      <th className="px-6 py-4">{t.bookings.table.balance}</th>
                      <th className={`px-6 py-4 text-center sticky ${language === 'ar' ? 'left-0' : 'right-0'} bg-slate-900 z-20 shadow-[-4px_0_10px_rgba(0,0,0,0.3)]`}>{t.bookings.table.actions}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {bookings.map(book => (
                      <tr key={book.id} className="hover:bg-slate-50/50 transition-all group">
                        <td className={`px-6 py-4 sticky ${language === 'ar' ? 'right-0' : 'left-0'} bg-white z-10 shadow-[4px_0_10px_rgba(0,0,0,0.05)]`}>
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors leading-tight">{book.customer_name}</span>
                            <span className="text-[10px] text-blue-600 font-bold tracking-tight mt-1 bg-blue-50 px-2 py-0.5 rounded-md w-fit">{book.project_name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center font-bold font-mono text-xl text-slate-900">{book.qty}</td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">{book.uom || 'PCS'}</span>
                        </td>
                        <td className="px-6 py-4 font-bold font-mono text-slate-700 text-sm">{Number(book.qty * book.sell_price).toLocaleString()}</td>
                        <td className="px-6 py-4 bg-slate-100/10">
                          <div className="flex flex-col">
                            <span className="font-bold text-emerald-600 text-base font-mono">{Number(book.deposit_amount).toLocaleString()}</span>
                            <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-1 opacity-60">{book.payment_method} | {book.reference_no}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm ${book.remaining_amount <= 0 ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                            {book.remaining_amount <= 0 ? `CREDIT: ${Math.abs(book.remaining_amount).toLocaleString()}` : `DEBIT: ${book.remaining_amount.toLocaleString()}`}
                          </span>
                        </td>
                        <td className={`px-6 py-4 text-center sticky ${language === 'ar' ? 'left-0' : 'right-0'} bg-white z-10 shadow-[-4px_0_10px_rgba(0,0,0,0.05)]`}>
                          {book.status === 'Pending' && (
                            <button
                              onClick={() => api.post(`/inventory/bookings/${book.id}/complete`)
                                .then(() => fetchData())
                                .catch(err => alert(err.response?.data?.error || t.common.error))}
                              className="px-5 py-2 bg-slate-900 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all shadow-md shadow-slate-900/10 active:scale-95 flex items-center gap-2 mx-auto"
                            >
                              <span>🚀</span> Deliver
                            </button>
                          )}
                          {book.status === 'Completed' && (
                            <div className="flex flex-col items-center gap-2">
                              <span className="text-emerald-600 font-black text-[10px] uppercase flex items-center justify-center gap-1.5 py-1">
                                <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                                Delivered
                              </span>
                              {book.remaining_amount < 0 && (
                                <button
                                  onClick={async () => {
                                    const accRes = await api.get('/inventory/financial-accounts');
                                    const accs = accRes.data.data || [];
                                    setFinancialAccounts(accs);
                                    setBalanceForm({
                                      booking_id: book.id,
                                      customer_name: book.customer_name,
                                      current_credit: Math.abs(book.remaining_amount),
                                      action_type: 'refund',
                                      amount: Math.abs(book.remaining_amount),
                                      credit_account: accs[0]?.account_name || '',
                                      reference_no: ''
                                    });
                                    setIsBalanceModalOpen(true);
                                  }}
                                  className="px-3 py-1.5 bg-amber-500 text-white rounded-lg font-black text-[8px] uppercase tracking-wider hover:bg-amber-600 transition-all shadow-sm flex items-center gap-1"
                                >
                                  ⚖️ Manage Credit
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* --- DDP TAB --- */}
          {activeTab === 'ddp' && (
            <div className="animate-fade-in p-8">
              <div className="flex flex-col sm:flex-row justify-between items-center mb-10 gap-6 bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white text-slate-900 rounded-2xl text-xl border border-slate-200 shadow-sm shadow-slate-900/5 transition-transform hover:scale-110">🚢</div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{t.ddp.title}</h3>
                    <p className="text-slate-400 font-medium text-xs mt-1">{language === 'ar' ? 'توزيع مصاريف الشحن والجمارك على الأصناف' : 'Allocate shipping and customs costs to items'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-white p-1.5 rounded-2xl border border-slate-200 flex gap-1 shadow-sm">
                    <button onClick={() => setDdpViewType('card')} className={`px-5 py-2 rounded-xl font-black text-[10px] uppercase transition-all ${ddpViewType === 'card' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Card</button>
                    <button onClick={() => setDdpViewType('table')} className={`px-5 py-2 rounded-xl font-black text-[10px] uppercase transition-all ${ddpViewType === 'table' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>Table</button>
                  </div>
                  <button onClick={() => {
                    setSelectedItem(null);
                    setDDPForm({
                      id: null,
                      allocation_type: 'single', po_id: '', master_po_no: '',
                      expense_name: '', amount: '', currency: 'EGP', fx_rate: 1,
                      expense_date: new Date().toISOString().split('T')[0]
                    });
                    setIsDDPModalOpen(true);
                  }} className="px-8 py-4 bg-violet-600 hover:bg-violet-700 text-white rounded-[1.5rem] font-black text-xs transition-all shadow-xl shadow-violet-600/20 flex items-center gap-3 transform hover:-translate-y-1 active:scale-95">
                    <span className="text-xl leading-none">+</span> {t.ddp.addExpense}
                  </button>
                </div>
              </div>
              {ddpViewType === 'card' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {poExpenses.map(exp => (
                    <div key={exp.id} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
                      <div className="flex justify-between items-start mb-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-900 text-white rounded-lg flex items-center justify-center text-lg shadow-lg shadow-slate-900/20 group-hover:scale-110 transition-transform">💸</div>
                          <div>
                            <span className="text-xs font-black text-violet-600 block font-mono">{exp.master_po_no || 'N/A'}</span>
                            <span className="text-[10px] font-bold text-slate-400 block font-mono">PO-{exp.po_id || 'N/A'}</span>
                          </div>
                        </div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">EXP-{exp.id}</span>
                      </div>
                      <h4 className="text-xl font-bold text-slate-900 mb-1 leading-tight">{exp.expense_name}</h4>
                      <div className="space-y-2 mb-6">
                        <p className="font-bold text-slate-500 text-xs flex items-center gap-2">
                          {t.ddp.table.item}: <span className="text-slate-900">{exp.item_name}</span>
                        </p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                          Date: {new Date(exp.expense_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="border-t border-slate-100 pt-6 mt-4 flex justify-between items-end">
                        <div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t.ddp.table.allocatedAmount}</p>
                          <p className="text-2xl font-bold text-slate-900 font-mono tracking-tighter">{Number(exp.amount).toLocaleString()}</p>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className="text-[10px] font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded-md border border-slate-200">{exp.currency}</span>
                          <div className="flex items-center gap-2 mt-2">
                            <button onClick={() => {
                              setSelectedItem({ id: exp.po_id });
                              setDDPForm({
                                id: exp.id,
                                allocation_type: exp.master_po_no ? 'master' : 'single',
                                po_id: exp.po_id,
                                master_po_no: exp.master_po_no || '',
                                expense_name: exp.expense_name,
                                amount: exp.amount,
                                currency: exp.currency,
                                fx_rate: exp.fx_rate,
                                expense_date: exp.expense_date?.split('T')[0]
                              });
                              setIsDDPModalOpen(true);
                            }} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-900 transition-colors">✍️</button>
                            <button onClick={() => handleDDPDelete(exp.id)} className="p-1.5 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-600 transition-colors">🗑️</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                  <table className={`w-full ${language === 'ar' ? 'text-right' : 'text-left'} whitespace-nowrap`}>
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr className="text-slate-500 text-[11px] font-black uppercase tracking-widest">
                        <th className="px-6 py-4 font-bold">ID</th>
                        <th className="px-6 py-4 font-bold">{t.ddp.table.masterPo}</th>
                        <th className="px-6 py-4 font-bold">{t.ddp.table.poId}</th>
                        <th className="px-6 py-4 font-bold text-right">{t.ddp.table.item}</th>
                        <th className="px-6 py-4 font-bold">{t.ddp.table.expenseType}</th>
                        <th className="px-6 py-4 font-bold">{t.ddp.table.allocatedAmount}</th>
                        <th className="px-6 py-4 font-bold">{t.ddp.table.currency}</th>
                        <th className="px-6 py-4 font-bold">{t.ddp.table.fxRate}</th>
                        <th className="px-6 py-4 font-bold text-center">Date</th>
                        <th className="px-6 py-4 font-bold text-center">{t.ddp.table.actions || 'Actions'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {poExpenses.map(exp => (
                        <tr key={exp.id} className="hover:bg-slate-50 transition-all">
                          <td className="px-6 py-4 font-bold text-slate-400 text-xs">EXP-{exp.id}</td>
                          <td className="px-6 py-4 font-bold text-violet-600 text-xs font-mono">{exp.master_po_no || 'N/A'}</td>
                          <td className="px-6 py-4 font-bold text-slate-600 text-xs font-mono">PO-{exp.po_id || 'N/A'}</td>
                          <td className="px-6 py-4 font-bold text-slate-900 text-sm">{exp.item_name}</td>
                          <td className="px-6 py-4 font-bold text-slate-600 text-xs uppercase">{exp.expense_name}</td>
                          <td className="px-6 py-4 font-bold text-slate-900 font-mono text-sm">{Number(exp.amount).toLocaleString()}</td>
                          <td className="px-6 py-4"><span className="bg-slate-100 px-2 py-0.5 rounded-md font-bold text-[10px] border border-slate-200">{exp.currency}</span></td>
                          <td className="px-6 py-4 font-mono text-slate-400 font-bold text-xs">{exp.fx_rate}</td>
                          <td className="px-6 py-4 text-center text-slate-500 font-bold text-xs">{new Date(exp.expense_date).toLocaleDateString()}</td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => {
                                  setSelectedItem({ id: exp.po_id });
                                  setDDPForm({
                                    id: exp.id,
                                    allocation_type: exp.master_po_no ? 'master' : 'single',
                                    po_id: exp.po_id,
                                    master_po_no: exp.master_po_no || '',
                                    expense_name: exp.expense_name,
                                    amount: exp.amount,
                                    currency: exp.currency,
                                    fx_rate: exp.fx_rate,
                                    expense_date: exp.expense_date?.split('T')[0]
                                  });
                                  setIsDDPModalOpen(true);
                                }}
                                className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-900 transition-colors"
                                title={t.common.edit || 'Edit'}
                              >
                                ✍️
                              </button>
                              <button
                                onClick={() => handleDDPDelete(exp.id)}
                                className="p-1.5 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-600 transition-colors"
                                title={t.common.delete || 'Delete'}
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* --- SALES TAB --- */}
          {activeTab === 'sales' && (
            <div className="animate-fade-in">
              <div className="p-8 border-b border-slate-100 bg-slate-50/30 flex flex-col sm:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white text-slate-900 rounded-2xl text-xl border border-slate-200 shadow-sm shadow-slate-900/5 transition-transform hover:-rotate-12">🚚</div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{t.sales.title}</h3>
                    <p className="text-slate-400 font-medium text-xs mt-1">{language === 'ar' ? 'سجل المبيعات وحركات صرف المخزون' : 'Sales history and inventory issuance records'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
                    <button onClick={() => exportToExcel(salesHistory, 'Sales_Report')} className="px-4 py-2 text-slate-500 rounded-lg hover:bg-white hover:text-slate-900 transition-all text-[10px] font-bold uppercase tracking-widest">Excel</button>
                    <button onClick={handlePrint} className="px-4 py-2 text-slate-500 rounded-lg hover:bg-white hover:text-slate-900 transition-all text-[10px] font-bold uppercase tracking-widest">Print</button>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className={`w-full ${language === 'ar' ? 'text-right' : 'text-left'} whitespace-nowrap`}>
                  <thead className="bg-slate-900 text-white">
                    <tr className="text-[10px] font-black uppercase tracking-[0.2em]">
                      <th className={`px-6 py-4 sticky ${language === 'ar' ? 'right-0' : 'left-0'} bg-slate-900 z-20 shadow-[4px_0_10px_rgba(0,0,0,0.3)]`}>{t.sales.table.dateRef}</th>
                      <th className="px-6 py-4">{t.sales.table.customerProject}</th>
                      <th className="px-6 py-4">{t.sales.table.itemSold}</th>
                      <th className="px-6 py-4 text-center">{t.sales.table.qty}</th>
                      <th className="px-6 py-4 text-center">{language === 'ar' ? 'الوحدة' : 'UOM'}</th>
                      <th className="px-6 py-4 bg-slate-800/50">{language === 'ar' ? 'التسعير (شراء/بيع)' : 'Pricing (Buy/Sell)'}</th>
                      <th className="px-6 py-4">{language === 'ar' ? 'إجمالي الفاتورة (الصافي)' : 'Net Invoice'}</th>
                      <th className="px-6 py-4">{t.sales.table.netProfit}</th>
                      <th className="px-6 py-4">{t.sales.table.batchExpiry}</th>
                      <th className={`px-6 py-4 text-center sticky ${language === 'ar' ? 'left-0' : 'right-0'} bg-slate-900 z-20 shadow-[-4px_0_10px_rgba(0,0,0,0.3)]`}>{t.sales.table.paymentMethod}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-sans">
                    {salesHistory.map(sale => {
                      const totalRevenue = Number(sale.qty) * Number(sale.sell_price);
                      const totalCost = Number(sale.qty) * Number(sale.buy_price || 0);
                      const profit = totalRevenue - totalCost;
                      return (
                        <tr key={sale.id} className="hover:bg-slate-50/50 transition-all group">
                          <td className={`px-6 py-4 sticky ${language === 'ar' ? 'right-0' : 'left-0'} bg-white z-10 shadow-[4px_0_10px_rgba(0,0,0,0.05)]`}>
                            <div className="flex flex-col">
                              <span className="text-[10px] text-slate-400 font-bold font-mono uppercase">{new Date(sale.date).toLocaleDateString()}</span>
                              <span className="font-bold text-slate-900 text-xs mt-1 bg-slate-100 px-2 py-0.5 rounded-md w-fit">INV-#{sale.id}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors leading-tight">{sale.customer_name}</span>
                              <span className="text-[10px] text-blue-600 font-bold tracking-tight mt-1 bg-blue-50 px-2 py-0.5 rounded-md w-fit">{sale.project_name}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-slate-900 leading-tight">{sale.item_name}</span>
                              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-1 opacity-60">PO-#{sale.po_id}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-center font-bold font-mono text-xl text-slate-900">{sale.qty}</td>
                          <td className="px-6 py-4 text-center">
                            <span className="text-[10px] font-black text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">{sale.uom || 'PCS'}</span>
                          </td>
                          <td className="px-6 py-4 bg-slate-100/10">
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <span className="font-black text-slate-900 font-mono text-sm">{Number(sale.sell_price).toLocaleString()}</span>
                                <span className="text-[8px] bg-slate-900 text-white px-1 py-0.5 rounded font-black">SELL</span>
                              </div>
                              <div className="flex items-center gap-2 mt-1 opacity-60">
                                <span className="font-bold text-slate-400 font-mono text-[10px]">{Number(sale.buy_price || 0).toLocaleString()}</span>
                                <span className="text-[8px] bg-slate-200 text-slate-500 px-1 py-0.5 rounded font-black">BUY</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-black text-blue-600 font-mono text-base">{(Number(sale.net_amount) || totalRevenue).toLocaleString()}</span>
                              <div className="flex gap-2 mt-1">
                                {Number(sale.vat_amount) > 0 && <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">VAT: {Number(sale.vat_amount).toLocaleString()}</span>}
                                {Number(sale.wht_amount) > 0 && <span className="text-[8px] font-black text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">WHT: {Number(sale.wht_amount).toLocaleString()}</span>}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className={`font-black text-sm font-mono ${profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {profit.toLocaleString()}
                              </span>
                              <span className={`text-[9px] font-bold uppercase tracking-widest mt-1 ${profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {((profit / (totalCost || 1)) * 100).toFixed(1)}% Margin
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col gap-1.5">
                              {sale.batch_no && (
                                <span className="text-[10px] font-black text-slate-600 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 w-fit flex items-center gap-2">
                                  <span className="w-1 h-1 bg-slate-400 rounded-full"></span>
                                  Batch: {sale.batch_no}
                                </span>
                              )}
                              {sale.expiry_date && (
                                <span className="text-[10px] text-rose-600 font-bold bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-100 w-fit flex items-center gap-2">
                                  <span className="w-1 h-1 bg-rose-400 rounded-full animate-pulse"></span>
                                  Exp: {new Date(sale.expiry_date).toLocaleDateString()}
                                </span>
                              )}
                              {!sale.batch_no && !sale.expiry_date && <span className="text-slate-300 text-[10px]">—</span>}
                            </div>
                          </td>
                          <td className={`px-6 py-4 sticky ${language === 'ar' ? 'left-0' : 'right-0'} bg-white z-10 shadow-[-4px_0_10px_rgba(0,0,0,0.05)]`}>
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <span className="font-black text-slate-900 text-[10px] uppercase tracking-widest">{sale.payment_method}</span>
                                <span className={`w-2 h-2 rounded-full ${sale.paid_amount >= sale.total_amount ? 'bg-emerald-500 shadow-emerald-500/20' : 'bg-amber-500 shadow-amber-500/20'} shadow-lg`}></span>
                              </div>
                              <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-1 opacity-60">By: {sale.created_by || 'System'}</span>
                              <span className="text-[8px] text-slate-300 font-mono mt-1">{sale.reference_no || 'N/A'}</span>
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

          {/* --- TRANSFERS TAB --- */}
          {activeTab === 'transfers' && (
            <div className="animate-fade-in">
              <div className="p-8 border-b border-slate-100 bg-slate-50/30 flex flex-col sm:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white text-slate-900 rounded-2xl text-xl border border-slate-200 shadow-sm shadow-slate-900/5 transition-transform hover:scale-110">🔄</div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{t.transfers.title}</h3>
                    <p className="text-slate-400 font-medium text-xs mt-1">{language === 'ar' ? 'سجل التحويلات المخزنية الداخلية' : 'Internal stock transfers log'}</p>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className={`w-full ${language === 'ar' ? 'text-right' : 'text-left'} whitespace-nowrap`}>
                  <thead className="bg-slate-900 text-white">
                    <tr className="text-[10px] font-black uppercase tracking-[0.2em]">
                      <th className="px-6 py-4">{t.transfers.table.dateRef}</th>
                      <th className="px-6 py-4">{t.transfers.table.item}</th>
                      <th className="px-6 py-4">{t.transfers.table.from}</th>
                      <th className="px-6 py-4 bg-slate-800/50">{t.transfers.table.to}</th>
                      <th className="px-6 py-4 text-center">{t.transfers.table.qty}</th>
                      <th className="px-6 py-4">{t.transfers.table.by}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {inventoryItems.filter(i => i.quantity !== i.remaining_qty).map(item => (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-all group">
                        <td className="px-6 py-4 font-bold text-slate-400 text-xs font-mono uppercase tracking-tighter">TRF-#{item.id}</td>
                        <td className="px-6 py-4 font-bold text-slate-900 text-sm group-hover:text-blue-600 transition-colors">{item.item_name}</td>
                        <td className="px-6 py-4 text-xs text-rose-500 font-black uppercase tracking-widest">{t.transfers.mainWarehouse}</td>
                        <td className="px-6 py-4 bg-slate-100/10 text-xs text-emerald-600 font-black uppercase tracking-widest">
                          <div className="flex flex-col">
                            <span>{item.warehouse}</span>
                            <span className="text-[8px] text-slate-400 mt-0.5">{item.project_name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center font-bold font-mono text-xl text-slate-900">{item.quantity}</td>
                        <td className="px-6 py-4 text-[11px] font-black text-slate-500 uppercase tracking-widest opacity-60">{item.created_by || 'System'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* --- INTELLIGENCE HUB TAB --- */}
          {activeTab === 'intelligence' && (
            <div className="animate-fade-in p-8 space-y-10 bg-slate-50/20">
              {/* Header section with KPIs */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div
                  onClick={() => {
                    setDrillDownContent({
                      title: language === 'ar' ? 'تحليل قيمة المخزون' : 'Inventory Asset Valuation',
                      data: inventoryItems.filter(i => Number(i.remaining_qty) > 0).map(i => ({
                        id: i.id,
                        item: i.item_name,
                        project: i.project_name,
                        qty: i.remaining_qty,
                        price: i.buy_price,
                        total: Number(i.remaining_qty) * Number(i.buy_price)
                      })),
                      columns: [
                        { key: 'item', label: language === 'ar' ? 'الصنف' : 'Item' },
                        { key: 'project', label: language === 'ar' ? 'المشروع' : 'Project' },
                        { key: 'qty', label: language === 'ar' ? 'الكمية' : 'Qty' },
                        { key: 'price', label: language === 'ar' ? 'سعر الشراء' : 'Buy Price' },
                        { key: 'total', label: language === 'ar' ? 'القيمة الإجمالية' : 'Total Value' }
                      ]
                    });
                    setIsDrillDownModalOpen(true);
                  }}
                  className="relative bg-white p-8 rounded-[3rem] border border-slate-200 shadow-2xl shadow-slate-900/5 hover:translate-y-[-8px] transition-all duration-500 group cursor-pointer overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-emerald-500/10 transition-colors"></div>
                  <div className="flex items-center gap-5 mb-6">
                    <div className="w-14 h-14 bg-gradient-to-br from-emerald-400 to-emerald-600 text-white rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-emerald-500/30 group-hover:rotate-6 transition-transform">💰</div>
                    <div className="flex flex-col">
                      <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">{language === 'ar' ? 'إجمالي قيمة المخزون' : 'Total Asset Value'}</span>
                      <span className="text-[9px] font-bold text-emerald-500/60 uppercase">Real-time Valuation</span>
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black text-slate-900 font-mono tracking-tighter">
                      {(intelligenceData?.valuationByProject?.reduce((acc, curr) => acc + Number(curr.value), 0) || 0).toLocaleString()}
                    </span>
                    <span className="text-xs font-black text-slate-300">EGP</span>
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-500 w-[75%]"></div>
                    </div>
                    <span className="text-[10px] font-black text-emerald-600">75% Target</span>
                  </div>
                </div>

                <div
                  onClick={() => {
                    setDrillDownContent({
                      title: language === 'ar' ? 'أصناف تحت حد الأمان' : 'Critical Stock Alerts',
                      data: inventoryItems.filter(i => Number(i.remaining_qty) <= Number(i.min_stock_level)).map(i => ({
                        id: i.id,
                        item: i.item_name,
                        qty: i.remaining_qty,
                        min: i.min_stock_level,
                        uom: i.uom
                      })),
                      columns: [
                        { key: 'item', label: language === 'ar' ? 'الصنف' : 'Item' },
                        { key: 'qty', label: language === 'ar' ? 'الكمية الحالية' : 'Current Qty' },
                        { key: 'min', label: language === 'ar' ? 'حد الأمان' : 'Safety Level' },
                        { key: 'uom', label: 'UOM' }
                      ]
                    });
                    setIsDrillDownModalOpen(true);
                  }}
                  className="relative bg-white p-8 rounded-[3rem] border border-slate-200 shadow-2xl shadow-slate-900/5 hover:translate-y-[-8px] transition-all duration-500 group cursor-pointer overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-rose-500/10 transition-colors"></div>
                  <div className="flex items-center gap-5 mb-6">
                    <div className="w-14 h-14 bg-gradient-to-br from-rose-400 to-rose-600 text-white rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-rose-500/30 group-hover:rotate-6 transition-transform">⚠️</div>
                    <div className="flex flex-col">
                      <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">{language === 'ar' ? 'أصناف تحت الحد الأدنى' : 'Low Stock Items'}</span>
                      <span className="text-[9px] font-bold text-rose-500/60 uppercase">Immediate Restock</span>
                    </div>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black text-slate-900 font-mono tracking-tighter">{(intelligenceData?.lowStock?.length || 0).toLocaleString()}</span>
                    <span className="text-xs font-black text-slate-300">Items</span>
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full ${(intelligenceData?.lowStock?.length || 0) > 5 ? 'bg-rose-500' : 'bg-amber-500'} w-[40%]`}></div>
                    </div>
                    <span className="text-[10px] font-black text-rose-600">Action Alert</span>
                  </div>
                </div>

                <div
                  onClick={() => {
                    const currentMonth = new Date().getMonth();
                    const currentYear = new Date().getFullYear();
                    setDrillDownContent({
                      title: language === 'ar' ? 'تفاصيل مبيعات الشهر الحالي' : 'Current Month Sales Details',
                      data: salesHistory.filter(s => {
                        const d = new Date(s.date);
                        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
                      }).map(s => ({
                        date: new Date(s.date).toLocaleDateString(),
                        customer: s.customer_name,
                        item: s.item_name,
                        amount: s.total_amount
                      })),
                      columns: [
                        { key: 'date', label: language === 'ar' ? 'التاريخ' : 'Date' },
                        { key: 'customer', label: language === 'ar' ? 'العميل' : 'Customer' },
                        { key: 'item', label: language === 'ar' ? 'الصنف' : 'Item' },
                        { key: 'amount', label: language === 'ar' ? 'القيمة' : 'Amount' }
                      ]
                    });
                    setIsDrillDownModalOpen(true);
                  }}
                  className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-900/5 hover:scale-105 transition-all duration-500 group cursor-pointer"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center text-xl group-hover:rotate-12 transition-transform">🚚</div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'مبيعات الشهر الحالي' : 'MTD Sales Value'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-3xl font-black text-slate-900 font-mono tracking-tighter">
                      {(Number(intelligenceData?.trend?.slice(-1)[0]?.sales || 0)).toLocaleString()}
                    </span>
                    <span className="text-[10px] font-bold text-blue-500 uppercase mt-1">Current Month Performance</span>
                  </div>
                </div>

                <div
                  onClick={() => {
                    setDrillDownContent({
                      title: language === 'ar' ? 'تفاصيل الأصناف الأكثر مبيعاً' : 'Top Moving Items Details',
                      data: (intelligenceData?.topMoving || []).map(i => ({
                        item: i.item_name,
                        sold: i.total_qty,
                        revenue: i.total_revenue
                      })),
                      columns: [
                        { key: 'item', label: language === 'ar' ? 'الصنف' : 'Item' },
                        { key: 'sold', label: language === 'ar' ? 'الكمية المباعة' : 'Qty Sold' },
                        { key: 'revenue', label: language === 'ar' ? 'إجمالي الإيرادات' : 'Total Revenue' }
                      ]
                    });
                    setIsDrillDownModalOpen(true);
                  }}
                  className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-xl shadow-slate-900/5 hover:scale-105 transition-all duration-500 group cursor-pointer"
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-violet-50 text-violet-600 rounded-2xl flex items-center justify-center text-xl group-hover:rotate-12 transition-transform">🔥</div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'الأكثر مبيعاً' : 'Top Moving Item'}</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xl font-black text-slate-900 truncate" title={intelligenceData?.topMoving?.[0]?.item_name}>{intelligenceData?.topMoving?.[0]?.item_name || 'N/A'}</span>
                    <span className="text-[10px] font-bold text-violet-500 uppercase mt-1">{intelligenceData?.topMoving?.[0]?.total_qty} Units Sold</span>
                  </div>
                </div>
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 bg-white p-10 rounded-[3rem] border border-slate-200 shadow-2xl shadow-slate-900/5">
                  <div className="flex justify-between items-center mb-10">
                    <div>
                      <h4 className="text-xl font-black text-slate-900 tracking-tight">{language === 'ar' ? 'تحليل المبيعات مقابل المشتريات' : 'Sales vs Purchases Trend'}</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Last 6 Months Operational Flow</p>
                    </div>
                    <div className="flex gap-4">
                      <div className="flex items-center gap-2"><span className="w-3 h-3 bg-violet-500 rounded-full"></span><span className="text-[10px] font-black text-slate-500">Purchases</span></div>
                      <div className="flex items-center gap-2"><span className="w-3 h-3 bg-emerald-500 rounded-full"></span><span className="text-[10px] font-black text-slate-500">Sales</span></div>
                    </div>
                  </div>
                  <div className="h-[400px]">
                    <Line
                      data={{
                        labels: intelligenceData?.trend?.map(t => t.month_label) || [],
                        datasets: [
                          { label: 'Purchases', data: intelligenceData?.trend?.map(t => t.purchases) || [], borderColor: '#8b5cf6', backgroundColor: '#8b5cf620', fill: true, tension: 0.4 },
                          { label: 'Sales', data: intelligenceData?.trend?.map(t => t.sales) || [], borderColor: '#10b981', backgroundColor: '#10b98120', fill: true, tension: 0.4 }
                        ]
                      }}
                      options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: '#f1f5f9' } }, x: { grid: { display: false } } } }}
                    />
                  </div>
                </div>

                <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-2xl shadow-slate-900/5 flex flex-col">
                  <div className="mb-10 text-center">
                    <h4 className="text-xl font-black text-slate-900 tracking-tight">{language === 'ar' ? 'توزيع قيمة الأصول' : 'Asset Valuation Distribution'}</h4>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Valuation by Project Sector</p>
                  </div>
                  <div className="flex-1 flex items-center justify-center relative">
                    <Doughnut
                      data={{
                        labels: intelligenceData?.valuationByProject?.map(v => v.name) || [],
                        datasets: [{
                          data: intelligenceData?.valuationByProject?.map(v => v.value) || [],
                          backgroundColor: ['#6366f1', '#ec4899', '#8b5cf6', '#10b981', '#f59e0b', '#3b82f6'],
                          borderWidth: 0,
                          hoverOffset: 20
                        }]
                      }}
                      options={{ cutout: '75%', plugins: { legend: { display: false } } }}
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Valuation</span>
                      <span className="text-xl font-black text-slate-900 font-mono">
                        {intelligenceData?.valuationByProject?.reduce((acc, curr) => acc + Number(curr.value), 0).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <div className="mt-10 space-y-3">
                    {intelligenceData?.valuationByProject?.slice(0, 4).map((p, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ['#6366f1', '#ec4899', '#8b5cf6', '#10b981'][idx % 4] }}></div>
                          <span className="text-xs font-bold text-slate-700 truncate w-32">{p.name}</span>
                        </div>
                        <span className="text-xs font-black text-slate-900 font-mono">{(Number(p.value) / (intelligenceData?.valuationByProject?.reduce((acc, curr) => acc + Number(curr.value), 0) || 1) * 100).toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* Stock Aging Analysis */}
                <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-2xl shadow-slate-900/5">
                  <div className="flex justify-between items-center mb-8">
                    <div>
                      <h4 className="text-xl font-black text-slate-900 tracking-tight">{language === 'ar' ? 'تحليل عمر المخزون' : 'Stock Aging Analysis'}</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Asset Value by Retention Period</p>
                    </div>
                    <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center text-xl">⏳</div>
                  </div>
                  <div className="h-[300px]">
                    <Bar
                      data={{
                        labels: intelligenceData?.aging?.map(a => a.age_group) || [],
                        datasets: [{
                          label: 'Valuation',
                          data: intelligenceData?.aging?.map(a => a.total_value) || [],
                          backgroundColor: '#8b5cf6',
                          borderRadius: 12
                        }]
                      }}
                      options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { display: false } }, x: { grid: { display: false } } } }}
                    />
                  </div>
                </div>

                {/* Low Stock Alerts Mini-Table */}
                <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-2xl shadow-slate-900/5">
                  <div className="flex justify-between items-center mb-8">
                    <div>
                      <h4 className="text-xl font-black text-slate-900 tracking-tight">{language === 'ar' ? 'تنبيهات نقص المخزون' : 'Critical Low Stock'}</h4>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Items below safety threshold</p>
                    </div>
                    <div className="px-4 py-2 bg-rose-50 text-rose-600 rounded-xl font-black text-[10px] uppercase tracking-widest border border-rose-100">Action Required</div>
                  </div>
                  <div className="space-y-4">
                    {intelligenceData?.lowStock?.length > 0 ? (
                      intelligenceData.lowStock.slice(0, 5).map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-lg transition-all group">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-lg border border-slate-200 group-hover:bg-rose-500 group-hover:text-white transition-colors">📦</div>
                            <div className="flex flex-col">
                              <span className="text-sm font-black text-slate-900">{item.item_name}</span>
                              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Min Level: {item.min_stock_level} {item.uom}</span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-lg font-black text-rose-600 font-mono">{item.remaining_qty}</span>
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Remaining</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-20 text-center text-slate-300 font-black">All stock levels are healthy ✅</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Warehouse Utilization */}
              <div className="bg-slate-900 p-12 rounded-[4rem] text-white shadow-3xl shadow-slate-900/40 relative overflow-hidden">
                <div className="absolute right-0 top-0 w-96 h-96 bg-violet-600/10 rounded-full blur-[100px] -mr-48 -mt-48"></div>
                <div className="absolute left-0 bottom-0 w-96 h-96 bg-emerald-600/10 rounded-full blur-[100px] -ml-48 -mb-48"></div>

                <div className="relative z-10">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-12">
                    <div>
                      <h4 className="text-3xl font-black tracking-tight">{language === 'ar' ? 'توزيع المخازن والمواقع' : 'Global Warehouse Utilization'}</h4>
                      <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.3em] mt-2">Real-time asset distribution across all centers</p>
                    </div>
                    <button onClick={fetchData} className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white rounded-2xl font-black text-xs transition-all border border-white/20 backdrop-blur-sm active:scale-95">
                      🔄 Refresh Data
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {intelligenceData?.valuationByWarehouse?.slice(0, 6).map((w, idx) => (
                      <div key={idx} className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] backdrop-blur-xl hover:bg-white/10 transition-all group">
                        <div className="flex justify-between items-start mb-6">
                          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-xl group-hover:scale-110 transition-transform">🏢</div>
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Warehouse ID: #{idx + 1}</span>
                        </div>
                        <h5 className="text-xl font-black mb-1">{w.name}</h5>
                        <div className="flex justify-between items-end">
                          <span className="text-2xl font-black font-mono text-emerald-400">{Number(w.value).toLocaleString()}</span>
                          <span className="text-[10px] font-bold text-slate-500 uppercase mb-1">EGP Portfolio</span>
                        </div>
                        <div className="mt-6 w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                            style={{ width: `${Math.min(100, (Number(w.value) / (intelligenceData?.valuationByWarehouse?.[0]?.value || 1) * 100))}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* --- SUPPLIER DEPOSITS TAB --- */}
          {activeTab === 'deposits' && (
            <div className="animate-fade-in">
              <div className="p-8 border-b border-slate-100 bg-slate-50/30 flex flex-col sm:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white text-emerald-600 rounded-2xl text-xl border border-slate-200 shadow-sm shadow-slate-900/5 transition-transform hover:rotate-6">💰</div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">{t.deposits?.title || 'Supplier Deposits'}</h3>
                    <p className="text-slate-400 font-medium text-xs mt-1">{language === 'ar' ? 'سجل الدفعات المقدمة للموردين والعملات' : 'Supplier advances and FX tracking'}</p>
                  </div>
                </div>
                <button onClick={() => openSupplierDepositModal()} className="px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[1.5rem] font-black text-xs transition-all shadow-xl shadow-emerald-600/20 flex items-center gap-3 transform hover:-translate-y-1 active:scale-95">
                  <span className="text-xl leading-none">+</span> {t.modals.supplierDeposit?.title || (language === 'ar' ? 'إيداع جديد' : 'New Deposit')}
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className={`w-full ${language === 'ar' ? 'text-right' : 'text-left'} whitespace-nowrap`}>
                  <thead className="bg-slate-900 text-white sticky top-0 z-30">
                    <tr className="text-[10px] font-black uppercase tracking-[0.2em]">
                      <th className="px-6 py-5">{t.deposits?.table?.date || 'Date'}</th>
                      <th className="px-6 py-5">{t.deposits?.table?.supplier || 'Supplier'}</th>
                      <th className="px-6 py-5">{t.deposits?.table?.project || 'Project'}</th>
                      <th className="px-6 py-5 text-center">{t.deposits?.table?.amount || 'Amount'}</th>
                      <th className="px-6 py-5 text-center">{t.deposits?.table?.currency || 'Curr'}</th>
                      <th className="px-6 py-5 text-center">{t.deposits?.table?.rate || 'Rate'}</th>
                      <th className="px-6 py-5">{t.deposits?.table?.lcy || 'Total (LCY)'}</th>
                      <th className="px-6 py-5">{t.deposits?.table?.method || 'Method'}</th>
                      <th className="px-6 py-5">{t.deposits?.table?.ref || 'Reference'}</th>
                      <th className="px-6 py-5 text-center">{language === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {supplierDeposits.map((dep, idx) => {
                      const desc = dep.description || '';
                      const parts = desc.split('|');
                      const supplier = desc.split('Supplier Deposit:')[1]?.trim().split('|')[0]?.trim() || '-';
                      const amountPart = parts[1]?.trim().split(' ');
                      const amount = parseFloat(amountPart?.[0] || 0);
                      const currency = amountPart?.[1]?.split('(')[0]?.trim() || '-';
                      const rate = parts[1]?.includes('Rate:') ? parseFloat(parts[1].split('Rate:')[1].split(')')[0]) : 1;
                      const lcy = amount * rate;
                      const ref = dep.reference_no || parts[2]?.replace('Ref:', '').trim() || '-';

                      return (
                        <tr key={dep.id || idx} className="hover:bg-slate-50 transition-all border-b border-slate-50">
                          <td className="px-6 py-4 text-xs font-mono text-slate-400">
                            {new Date(dep.created_at || dep.date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-slate-900 text-white rounded-lg flex items-center justify-center text-[10px] font-black">{supplier.charAt(0)}</div>
                              <span className="font-bold text-slate-900 text-sm">{supplier}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-[10px] font-black uppercase border border-blue-100">{dep.cost_center}</span>
                          </td>
                          <td className="px-6 py-4 text-center font-bold text-slate-700 font-mono">{amount.toLocaleString()}</td>
                          <td className="px-6 py-4 text-center">
                            <span className="text-[10px] font-black bg-slate-100 px-2 py-1 rounded border border-slate-200">{currency}</span>
                          </td>
                          <td className="px-6 py-4 text-center font-bold text-emerald-600 font-mono">{rate.toFixed(4)}</td>
                          <td className="px-6 py-4 font-black text-slate-900 font-mono">
                            {lcy.toLocaleString()} <span className="text-[9px] text-slate-400">SAR</span>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-[10px] font-bold text-slate-500 uppercase bg-slate-50 px-2 py-1 rounded">{dep.account_name}</span>
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-400 font-mono font-bold">{ref}</td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => openEditSupplierDepositModal(dep, { supplier, amount, currency, rate, ref })}
                                className="px-3 py-1.5 bg-violet-50 hover:bg-violet-100 text-violet-700 rounded-xl text-[10px] font-black transition-all hover:scale-105 active:scale-95 border border-violet-100"
                              >
                                {language === 'ar' ? 'تعديل' : 'Edit'}
                              </button>
                              <button
                                onClick={() => handleDeleteSupplierDeposit(dep.id)}
                                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-[10px] font-black transition-all hover:scale-105 active:scale-95 border border-rose-100"
                              >
                                {language === 'ar' ? 'حذف' : 'Delete'}
                              </button>
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
        </div>


        {/* --- MASTER PO MODAL (ENHANCED ELITE) --- */}
        {isPOModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-start justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto animate-in fade-in duration-300 custom-scrollbar">
            <div className="bg-white w-full max-w-5xl rounded-[3rem] shadow-2xl overflow-hidden border border-slate-200 my-10 transform animate-in slide-in-from-top-10 duration-500">
              {/* Header: Enterprise Style */}
              <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div className={language === 'ar' ? 'text-right' : 'text-left'}>
                  <div className="flex items-center gap-4 mb-2">
                    <div className="w-12 h-12 bg-violet-600 text-white rounded-2xl flex items-center justify-center text-xl shadow-lg shadow-violet-600/20">📦</div>
                    <h3 className="text-3xl font-black text-slate-900 tracking-tight">{t.modals.po.title}</h3>
                  </div>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                    Enterprise Procurement Framework
                  </p>
                </div>
                <button
                  onClick={() => setIsPOModalOpen(false)}
                  className="w-14 h-14 bg-white text-slate-400 hover:text-rose-500 rounded-3xl flex items-center justify-center text-3xl transition-all border border-slate-200 hover:border-rose-100 shadow-sm hover:shadow-xl hover:-rotate-90 active:scale-90"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handlePOSubmit} className="p-10 space-y-10">
                {/* Primary Metadata Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 shadow-inner">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-violet-600 uppercase tracking-widest">{t.modals.po.masterRef}</label>
                    <input
                      type="text"
                      readOnly
                      value={poMasterForm.master_po_no}
                      className="w-full bg-white border-2 border-slate-200 rounded-2xl p-4 font-black font-mono text-slate-900 shadow-sm outline-none cursor-not-allowed"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.modals.po.supplier}</label>
                    <input
                      type="text"
                      required
                      value={poMasterForm.supplier}
                      onChange={(e) => setPOMasterForm({ ...poMasterForm, supplier: e.target.value })}
                      placeholder={language === 'ar' ? 'ادخل اسم المورد' : "Enter Supplier Name"}
                      className="w-full bg-white border-2 border-slate-200 rounded-2xl p-4 focus:border-violet-500 outline-none transition-all font-bold text-slate-700 shadow-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">{t.modals.po.project}</label>
                    <select
                      required
                      value={poMasterForm.project_name}
                      onChange={(e) => setPOMasterForm({ ...poMasterForm, project_name: e.target.value })}
                      className="w-full bg-white border-2 border-slate-200 rounded-2xl p-4 focus:border-emerald-500 outline-none transition-all font-bold text-slate-700 shadow-sm appearance-none cursor-pointer"
                    >
                      <option value="">-- {language === 'ar' ? 'اختر المشروع' : 'Select Project'} --</option>
                      <option value="General">General</option>
                      {projects.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                    </select>
                  </div>
                </div>

                {/* Line Items Management */}
                <div className="space-y-6">
                  <div className="flex justify-between items-center px-2">
                    <div>
                      <h4 className="text-xl font-black text-slate-900 tracking-tight">{language === 'ar' ? 'بنود التوريد' : 'Procurement Items'}</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Detail breakdown of the master order</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPOMasterForm({ ...poMasterForm, items: [...poMasterForm.items, { item_description: '', specification: '', qty: '', uom: 'PCS', estimated_cost: '', expected_date: new Date().toISOString().split('T')[0], category: 'Material', warehouse: '' }] })}
                      className="px-6 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 shadow-xl shadow-slate-900/20"
                    >
                      + {t.modals.po.newItem}
                    </button>
                  </div>

                  <div className="space-y-8">
                    {poMasterForm.items.map((item, idx) => (
                      <div key={idx} className="p-8 bg-white rounded-[3rem] border-2 border-slate-100 shadow-lg relative group hover:border-violet-200 transition-all duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                          {/* Row 1: Item & Spec */}
                          <div className="md:col-span-2 space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t.modals.po.desc}</label>
                            <input
                              type="text"
                              required
                              value={item.item_description}
                              onChange={(e) => {
                                const ni = [...poMasterForm.items];
                                ni[idx].item_description = e.target.value;
                                setPOMasterForm({ ...poMasterForm, items: ni });
                              }}
                              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 focus:bg-white focus:border-violet-500 outline-none transition-all font-bold text-slate-700"
                              placeholder="Item name..."
                            />
                          </div>
                          <div className="md:col-span-2 space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t.modals.po.specification}</label>
                            <input
                              type="text"
                              value={item.specification}
                              onChange={(e) => {
                                const ni = [...poMasterForm.items];
                                ni[idx].specification = e.target.value;
                                setPOMasterForm({ ...poMasterForm, items: ni });
                              }}
                              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 focus:bg-white focus:border-violet-500 outline-none transition-all font-bold text-slate-700"
                              placeholder="Specs..."
                            />
                          </div>

                          {/* Row 2: Qty, UOM, Cost, Date */}
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t.modals.po.qty}</label>
                            <input
                              type="number"
                              required
                              value={item.qty}
                              onChange={(e) => {
                                const ni = [...poMasterForm.items];
                                ni[idx].qty = e.target.value;
                                setPOMasterForm({ ...poMasterForm, items: ni });
                              }}
                              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 focus:bg-white focus:border-violet-500 outline-none transition-all font-black text-slate-900"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t.modals.po.uom}</label>
                            <select
                              value={item.uom}
                              onChange={(e) => {
                                const ni = [...poMasterForm.items];
                                ni[idx].uom = e.target.value;
                                setPOMasterForm({ ...poMasterForm, items: ni });
                              }}
                              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 focus:bg-white focus:border-violet-500 outline-none transition-all font-bold text-slate-700"
                            >
                              {UOM_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-blue-600 uppercase tracking-widest ml-1">{t.modals.po.price} (FCY)</label>
                            <input
                              type="number"
                              required
                              value={item.estimated_cost}
                              onChange={(e) => {
                                const ni = [...poMasterForm.items];
                                ni[idx].estimated_cost = e.target.value;
                                setPOMasterForm({ ...poMasterForm, items: ni });
                              }}
                              className="w-full bg-blue-50 border-2 border-blue-100 rounded-2xl p-4 focus:bg-white focus:border-blue-500 outline-none transition-all font-black text-blue-900"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t.modals.po.expectedDate}</label>
                            <input
                              type="date"
                              required
                              value={item.expected_date}
                              onChange={(e) => {
                                const ni = [...poMasterForm.items];
                                ni[idx].expected_date = e.target.value;
                                setPOMasterForm({ ...poMasterForm, items: ni });
                              }}
                              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 focus:bg-white focus:border-violet-500 outline-none transition-all font-bold text-slate-700"
                            />
                          </div>

                          {/* Row 3: Category & Warehouse */}
                          <div className="md:col-span-2 space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t.modals.po.category}</label>
                            <select
                              value={item.category}
                              onChange={(e) => {
                                const ni = [...poMasterForm.items];
                                ni[idx].category = e.target.value;
                                setPOMasterForm({ ...poMasterForm, items: ni });
                              }}
                              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 focus:bg-white focus:border-violet-500 outline-none transition-all font-bold text-slate-700"
                            >
                              {['Material', 'Service', 'Consumables', 'Assets', 'Subcontracting'].map(cat => <option key={cat} value={cat}>{cat}</option>)}
                            </select>
                          </div>
                          <div className="md:col-span-2 space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t.modals.po.warehouse}</label>
                            <select
                              required
                              value={item.warehouse}
                              onChange={(e) => {
                                const ni = [...poMasterForm.items];
                                ni[idx].warehouse = e.target.value;
                                setPOMasterForm({ ...poMasterForm, items: ni });
                              }}
                              className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 focus:bg-white focus:border-violet-500 outline-none transition-all font-bold text-slate-700"
                            >
                              <option value="">-- {language === 'ar' ? 'اختر المخزن' : 'Select Warehouse'} --</option>
                              {warehouses.map(w => <option key={w.id} value={w.name}>{w.name}</option>)}
                            </select>
                          </div>
                        </div>

                        {/* Row 4: Total */}
                        <div className="pt-8 mt-4 border-t border-slate-50 flex justify-end items-center gap-6">
                          <div className="flex flex-col items-end">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{language === 'ar' ? 'إجمالي البند (عملة أجنبية)' : 'Estimated Line Total (FCY)'}</span>
                            <div className="px-10 py-4 bg-slate-900 text-white rounded-3xl font-black font-mono text-2xl shadow-2xl mt-2 border-b-4 border-violet-600">
                              {(Number(item.qty || 0) * Number(item.estimated_cost || 0)).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </div>
                          </div>
                        </div>

                        {/* Delete Button */}
                        {idx > 0 && (
                          <button
                            type="button"
                            onClick={() => setPOMasterForm({ ...poMasterForm, items: poMasterForm.items.filter((_, i) => i !== idx) })}
                            className="absolute -top-3 -right-3 w-10 h-10 bg-rose-500 text-white rounded-2xl flex items-center justify-center shadow-lg hover:scale-110 hover:rotate-90 transition-all border-4 border-white active:scale-95"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                </div>

                {/* Submit Section */}
                <div className="p-10 bg-slate-900 rounded-[3rem] shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8">
                  <div className="text-white">
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60 mb-2">Grand Total Assessment</p>
                    <h5 className="text-4xl font-black font-mono">
                      {poMasterForm.items.reduce((acc, item) => acc + (Number(item.qty || 0) * Number(item.estimated_cost || 0)), 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      <span className="text-lg opacity-40 ml-3">FCY</span>
                    </h5>
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`px-16 py-6 rounded-[2.5rem] font-black text-2xl shadow-2xl transition-all flex items-center justify-center gap-6 transform active:scale-95 ${isSubmitting ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-white text-slate-900 hover:bg-slate-50 hover:scale-105 shadow-white/10'}`}
                  >
                    {isSubmitting ? (
                      <div className="w-8 h-8 border-4 border-slate-900/30 border-t-slate-900 rounded-full animate-spin"></div>
                    ) : (
                      <>🚀 {t.modals.po.submit}</>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {isBookingModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-fade-in">
            <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 shadow-slate-900/20">
              <div className="bg-white p-10 border-b border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center text-lg shadow-lg shadow-slate-900/20">🔖</div>
                  <span className="text-xl font-black text-slate-900 tracking-tight">{t.modals.booking.title}</span>
                </div>
                <button onClick={() => setIsBookingModalOpen(false)} className="w-10 h-10 flex items-center justify-center bg-slate-50 text-slate-400 hover:text-slate-900 rounded-xl transition-all border border-slate-200 active:scale-95">✕</button>
              </div>
              <form onSubmit={submitBooking} className="p-10 space-y-8">
                <div className="space-y-6">
                  <div>
                    <label className="block text-[11px] font-black text-slate-500 mb-2 uppercase tracking-[0.2em] ml-1">{t.modals.booking.selectCustomer}</label>
                    <div className="relative group">
                      <select
                        value={bookingForm.client_id}
                        onChange={(e) => {
                          const c = customers.find(x => x.id == e.target.value);
                          setBookingForm({ ...bookingForm, client_id: e.target.value, customer_name: c ? c.name : '' });
                        }}
                        required
                        className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 font-bold text-slate-900 text-sm outline-none focus:bg-white focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 transition-all appearance-none cursor-pointer pr-10"
                      >
                        <option value="">{t.modals.booking.selectCustomer}</option>
                        {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">▼</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block text-[11px] font-black text-slate-500 mb-1 uppercase tracking-[0.2em] ml-1">{t.modals.booking.qty}</label>
                      <input type="number" value={bookingForm.qty} onChange={(e) => setBookingForm({ ...bookingForm, qty: e.target.value })} required className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 font-black text-slate-900 text-sm outline-none focus:bg-white focus:border-slate-900 transition-all font-mono text-center" />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-[11px] font-black text-slate-500 mb-1 uppercase tracking-[0.2em] ml-1">{t.modals.booking.sellPrice}</label>
                      <input type="number" value={bookingForm.sell_price} onChange={(e) => setBookingForm({ ...bookingForm, sell_price: e.target.value })} className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 font-black text-slate-900 text-sm outline-none focus:bg-white focus:border-slate-900 transition-all font-mono text-center" required />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">{t.modals.booking.project}</label>
                  <div className="w-full p-4 bg-slate-100/50 rounded-2xl border border-slate-200 font-black text-slate-500 text-xs flex items-center gap-3 shadow-inner">
                    <span className="text-lg opacity-50">📌</span> {bookingForm.project_name || 'General Inventory'}
                  </div>
                </div>
                <div className="space-y-6 p-6 bg-slate-50/50 rounded-3xl border border-slate-200 shadow-inner-soft">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.1em] ml-1">{t.modals.booking.deposit}</label>
                      <input type="number" value={bookingForm.deposit_amount} onChange={e => setBookingForm({ ...bookingForm, deposit_amount: e.target.value })} className="w-full p-4 bg-white rounded-2xl border border-slate-200 font-black text-slate-900 text-sm outline-none focus:border-slate-900 transition-all font-mono shadow-sm" required />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.1em] ml-1">{t.modals.booking.paymentMethod}</label>
                      <select value={bookingForm.payment_method} onChange={e => setBookingForm({ ...bookingForm, payment_method: e.target.value })} className="w-full p-4 bg-white rounded-2xl border border-slate-200 font-black text-slate-900 text-sm outline-none focus:border-slate-900 transition-all appearance-none cursor-pointer shadow-sm">
                        <option value="Cash">Cash 💵</option>
                        <option value="Bank">Bank 🏦</option>
                        <option value="Check">Check 📄</option>
                        <option value="Wallet">Wallet 💳</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.1em] ml-1">{language === 'ar' ? 'تاريخ انتهاء الحجز' : 'Booking Expiry'}</label>
                      <input type="date" value={bookingForm.expiry_date} onChange={e => setBookingForm({ ...bookingForm, expiry_date: e.target.value })} className="w-full p-4 bg-white rounded-2xl border border-slate-200 font-black text-slate-900 text-sm outline-none focus:border-slate-900 transition-all shadow-sm" required />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.1em] ml-1">{language === 'ar' ? 'حساب الاستلام' : 'Receiving Account'}</label>
                      <select value={bookingForm.debit_account} onChange={e => setBookingForm({ ...bookingForm, debit_account: e.target.value })} className="w-full p-4 bg-white rounded-2xl border border-slate-200 font-black text-slate-900 text-sm outline-none focus:border-slate-900 transition-all appearance-none cursor-pointer shadow-sm">
                        {financialAccounts.map(acc => (
                          <option key={acc.id} value={acc.account_name}>{acc.account_code} - {acc.account_name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.1em] ml-1">{t.modals.booking.reference}</label>
                    <input type="text" placeholder="Ref No / Check No..." value={bookingForm.reference_no} onChange={e => setBookingForm({ ...bookingForm, reference_no: e.target.value })} className="w-full p-4 bg-white rounded-2xl border border-slate-200 font-bold text-slate-900 text-sm outline-none focus:border-slate-900 transition-all shadow-sm" />
                  </div>
                </div>
                <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 flex justify-between items-center shadow-2xl shadow-slate-900/30">
                  <span className="font-black text-slate-400 uppercase text-[10px] tracking-[0.2em]">{t.modals.booking.balance}</span>
                  <span className={`text-2xl font-black font-mono tracking-tighter ${(Number(bookingForm.qty) * Number(bookingForm.sell_price) - Number(bookingForm.deposit_amount)) < 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {(Number(bookingForm.qty) * Number(bookingForm.sell_price) - Number(bookingForm.deposit_amount)).toLocaleString()}
                  </span>
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full py-6 rounded-[2rem] font-black text-lg shadow-2xl transition-all flex items-center justify-center gap-4 transform active:scale-95 ${isSubmitting ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-violet-600 text-white hover:bg-violet-700 shadow-violet-600/30'}`}
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                      {language === 'ar' ? 'جاري الحجز...' : 'Processing...'}
                    </>
                  ) : (
                    <>
                      <span className="text-2xl leading-none">✨</span>
                      <div className="flex flex-col items-start leading-tight">
                        <span className="text-xs opacity-60 uppercase tracking-widest font-black">{language === 'ar' ? 'تأكيد الحجز' : 'Confirm Reservation'}</span>
                        <span>{t.modals.booking.submit}</span>
                      </div>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: SALE */}
        {isSaleModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-fade-in">
            <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden border border-slate-200 max-h-[95vh] flex flex-col shadow-slate-900/20">
              <div className="bg-white p-8 border-b border-slate-100 flex justify-between items-center sticky top-0 z-20">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center text-xl shadow-lg shadow-slate-900/20">🛒</div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">{t.modals.sale.title}</h3>
                    <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">Issue stock and create invoice</p>
                  </div>
                </div>
                <button onClick={() => setIsSaleModalOpen(false)} className="w-12 h-12 flex items-center justify-center bg-slate-50 text-slate-400 hover:text-slate-900 rounded-2xl transition-all border border-slate-200 active:scale-95 shadow-sm">✕</button>
              </div>
              <form onSubmit={submitSaleOrder} className="p-10 space-y-8 overflow-y-auto custom-scrollbar flex-1">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-end">
                  <div className="md:col-span-1 space-y-2">
                    <label className="block text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">{t.modals.sale.selectCustomer}</label>
                    <div className="relative group">
                      <select
                        value={saleForm.client_id}
                        onChange={(e) => {
                          const c = customers.find(x => x.id == e.target.value);
                          setSaleForm({ ...saleForm, client_id: e.target.value, customer_name: c ? c.name : '' });
                        }}
                        required
                        className="w-full p-3.5 bg-slate-50 rounded-2xl border border-slate-200 font-bold text-slate-900 text-xs outline-none focus:bg-white focus:border-slate-900 transition-all appearance-none cursor-pointer"
                      >
                        <option value="">{t.modals.sale.selectCustomer}</option>
                        {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">▼</div>
                    </div>
                    {saleForm.client_id && (
                      <div className="mt-2 flex items-center gap-1.5 px-2 py-1 bg-emerald-50 border border-emerald-100 rounded-lg">
                        <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Wallet:</span>
                        <span className="text-[10px] font-black text-emerald-700 font-mono">
                          {Number(customers.find(c => c.id == saleForm.client_id)?.credit_balance || 0).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center mb-0.5">
                      <label className="block text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">{t.modals.sale.qty}</label>
                      <span className="text-[8px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">Avail: {Number(selectedItem?.remaining_qty).toLocaleString()}</span>
                    </div>
                    <input type="number" name="qty" max={selectedItem?.remaining_qty} value={saleForm.qty} onChange={(e) => setSaleForm({ ...saleForm, qty: e.target.value })} required className="w-full p-3.5 bg-slate-50 rounded-2xl border border-slate-200 font-black text-slate-900 text-xs outline-none focus:bg-white focus:border-slate-900 transition-all font-mono text-center" />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">{language === 'ar' ? 'سعر البيع' : 'Sale Price'}</label>
                    <input type="number" name="sell_price" placeholder={t.modals.sale.price} value={saleForm.sell_price} onChange={e => setSaleForm({ ...saleForm, sell_price: e.target.value })} className="w-full p-3.5 bg-slate-50 rounded-2xl border border-slate-200 font-black text-slate-900 text-xs outline-none focus:bg-white focus:border-slate-900 font-mono text-center transition-all" required />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">VAT %</label>
                    <div className="relative group">
                      <select name="vat_rate" value={saleForm.vat_rate} onChange={e => setSaleForm({ ...saleForm, vat_rate: e.target.value })} className="w-full p-3.5 bg-slate-50 rounded-2xl border border-slate-200 font-black text-slate-900 text-xs outline-none focus:bg-white focus:border-slate-900 appearance-none text-center cursor-pointer transition-all">
                        <option value="0">0%</option>
                        <option value="14">14%</option>
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">▼</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">WHT %</label>
                    <div className="relative group">
                      <select name="wht_rate" value={saleForm.wht_rate} onChange={e => setSaleForm({ ...saleForm, wht_rate: e.target.value })} className="w-full p-3.5 bg-slate-50 rounded-2xl border border-slate-200 font-black text-slate-900 text-xs outline-none focus:bg-white focus:border-slate-900 appearance-none text-center cursor-pointer transition-all">
                        <option value="0">0%</option>
                        <option value="1">1%</option>
                        <option value="3">3%</option>
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[10px]">▼</div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8 bg-slate-50/50 rounded-3xl border border-slate-100 shadow-inner-soft">
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">{language === 'ar' ? 'رقم التشغيلة / الباتش' : 'Batch / Dye Lot'}</label>
                    <input
                      type="text"
                      value={saleForm.batch_no || selectedItem?.batch_no || ''}
                      onChange={e => setSaleForm({ ...saleForm, batch_no: e.target.value })}
                      className="w-full p-4 bg-white rounded-2xl border border-slate-200 font-bold text-slate-900 text-sm outline-none focus:ring-4 focus:ring-slate-900/5 transition-all shadow-sm"
                      placeholder="Batch Number..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">{language === 'ar' ? 'تاريخ الانتهاء' : 'Expiry Date'}</label>
                    <input
                      type="date"
                      value={saleForm.expiry_date || (selectedItem?.expiry_date ? new Date(selectedItem.expiry_date).toISOString().split('T')[0] : '')}
                      onChange={e => setSaleForm({ ...saleForm, expiry_date: e.target.value })}
                      className="w-full p-4 bg-white rounded-2xl border border-slate-200 font-bold text-slate-900 text-sm outline-none focus:ring-4 focus:ring-slate-900/5 transition-all shadow-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-center bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl shadow-slate-900/20 border border-slate-800">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Unit Cost</label>
                    <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50 font-black text-slate-300 text-xs flex items-center gap-3">
                      <span className="text-sm">💰</span> {Number(selectedItem?.avg_cost || selectedItem?.buy_price).toLocaleString()}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">VAT Amount</label>
                    <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50 font-black text-blue-400 text-xs flex items-center gap-3">
                      <span className="text-sm">🏛️</span> {(Number(saleForm.qty) * Number(saleForm.sell_price) * (Number(saleForm.vat_rate) / 100)).toLocaleString()}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">WHT Deduction</label>
                    <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700/50 font-black text-rose-400 text-xs flex items-center gap-3">
                      <span className="text-sm">📉</span> {(Number(saleForm.qty) * Number(saleForm.sell_price) * (Number(saleForm.wht_rate) / 100)).toLocaleString()}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">Net Invoice Value</label>
                    <div className="p-4 bg-white/10 rounded-2xl font-black text-white text-base flex items-center gap-3 border border-white/20 backdrop-blur-sm shadow-inner">
                      <span className="text-xl leading-none">🧾</span> {((Number(saleForm.qty) * Number(saleForm.sell_price)) + (Number(saleForm.qty) * Number(saleForm.sell_price) * (Number(saleForm.vat_rate) / 100)) - (Number(saleForm.qty) * Number(saleForm.sell_price) * (Number(saleForm.wht_rate) / 100))).toLocaleString()}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">{t.modals.sale.project}</label>
                  <div className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 font-black text-slate-600 text-xs flex items-center gap-3 shadow-inner">
                    <span className="text-lg opacity-50">📌</span> {saleForm.project_name || 'General Inventory'}
                  </div>
                </div>

                {/* Partial Payment Section */}
                <div className="p-8 bg-slate-50/50 rounded-[2.5rem] border border-slate-200 space-y-8 shadow-inner-soft">
                  <div className="flex justify-between items-center">
                    <h4 className="font-black text-slate-900 text-xs uppercase tracking-[0.2em]">💳 Payment & Installments</h4>
                    <span className="text-[10px] font-black text-slate-500 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm font-mono tracking-tighter">Total Due: {((Number(saleForm.qty) * Number(saleForm.sell_price)) + (Number(saleForm.qty) * Number(saleForm.sell_price) * (Number(saleForm.vat_rate) / 100)) - (Number(saleForm.qty) * Number(saleForm.sell_price) * (Number(saleForm.wht_rate) / 100))).toLocaleString()}</span>
                  </div>

                  {/* Mixed Payment: Wallet Section */}
                  {saleForm.client_id && customers.find(c => c.id == saleForm.client_id)?.credit_balance > 0 && (
                    <div className="bg-emerald-50/50 p-6 rounded-3xl border border-emerald-100 flex flex-col sm:flex-row justify-between items-center gap-4 animate-fade-in">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center text-lg shadow-lg shadow-emerald-600/20">💳</div>
                        <div>
                          <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest">{language === 'ar' ? 'استخدام المحفظة' : 'Wallet Usage'}</p>
                          <p className="text-[9px] text-emerald-600 font-bold mt-0.5">Available: {Number(customers.find(c => c.id == saleForm.client_id)?.credit_balance).toLocaleString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 w-full sm:w-auto">
                        <div className="relative flex-1 sm:w-40">
                          <input
                            type="number"
                            max={customers.find(c => c.id == saleForm.client_id)?.credit_balance}
                            value={saleForm.wallet_deduction}
                            onChange={e => setSaleForm({ ...saleForm, wallet_deduction: e.target.value })}
                            className="w-full p-3 bg-white rounded-xl border border-emerald-200 font-black text-emerald-900 text-sm outline-none focus:border-emerald-600 transition-all font-mono text-center"
                            placeholder="0.00"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const credit = parseFloat(customers.find(c => c.id == saleForm.client_id)?.credit_balance || 0);
                            const totalDue = ((Number(saleForm.qty) * Number(saleForm.sell_price)) + (Number(saleForm.qty) * Number(saleForm.sell_price) * (Number(saleForm.vat_rate) / 100)) - (Number(saleForm.qty) * Number(saleForm.sell_price) * (Number(saleForm.wht_rate) / 100)));
                            setSaleForm({ ...saleForm, wallet_deduction: Math.min(credit, totalDue) });
                          }}
                          className="px-4 py-3 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/10 whitespace-nowrap"
                        >
                          {language === 'ar' ? 'استخدام الكل' : 'Use Full'}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col md:flex-row gap-6 bg-white p-6 rounded-3xl border border-slate-200 items-center shadow-sm">
                    <div className="flex-1 w-full space-y-3">
                      <div className="flex justify-between items-center">
                        <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest ml-1">Immediate Down Payment</label>
                        <div className="relative group">
                          <select name="payment_method" value={saleForm.payment_method} onChange={e => setSaleForm({ ...saleForm, payment_method: e.target.value })} className="p-2 bg-slate-50 rounded-xl text-[10px] font-black outline-none border border-slate-200 appearance-none pr-8 cursor-pointer hover:border-slate-400 transition-all">
                            <option value="Cash">Cash 💵</option>
                            <option value="Bank">Bank 🏦</option>
                            <option value="Check">Check 📄</option>
                            <option value="Wallet">Wallet 💳</option>
                          </select>
                          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[8px]">▼</div>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <input
                          type="number"
                          name="down_payment"
                          value={saleForm.down_payment}
                          onChange={e => setSaleForm({ ...saleForm, down_payment: e.target.value })}
                          className="flex-1 p-4 bg-slate-50 rounded-2xl font-black text-sm outline-none border border-transparent focus:bg-white focus:border-slate-900 font-mono transition-all"
                          placeholder="0.00"
                        />
                        <input
                          type="text"
                          name="reference_no"
                          placeholder="Transaction Ref No"
                          value={saleForm.reference_no}
                          onChange={e => setSaleForm({ ...saleForm, reference_no: e.target.value })}
                          className="w-48 p-4 bg-slate-50 rounded-2xl font-bold text-xs outline-none border border-transparent focus:bg-white focus:border-slate-900 transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex justify-between items-center px-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Installment Schedule</label>
                      <button
                        type="button"
                        onClick={() => setSaleForm({ ...saleForm, installments: [...saleForm.installments, { due_date: '', amount: '', notes: '', payment_method: 'Cash', reference_no: '' }] })}
                        className="px-4 py-2 bg-slate-900 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-900/20"
                      >+ Add Installment</button>
                    </div>

                    {saleForm.installments.map((inst, i) => (
                      <div key={i} className="flex flex-col gap-4 bg-white p-6 rounded-3xl border border-slate-200 animate-fade-in shadow-sm hover:border-slate-300 transition-all group">
                        <div className="flex gap-4">
                          <div className="flex-1 space-y-1.5">
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Due Date</label>
                            <input
                              type="date"
                              value={inst.due_date}
                              onChange={e => {
                                const ni = [...saleForm.installments];
                                ni[i].due_date = e.target.value;
                                setSaleForm({ ...saleForm, installments: ni });
                              }}
                              className="w-full p-3 text-xs font-bold bg-slate-50 rounded-xl border border-transparent focus:bg-white focus:border-slate-900 outline-none transition-all"
                            />
                          </div>
                          <div className="flex-1 space-y-1.5">
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Amount</label>
                            <input
                              type="number"
                              placeholder="0.00"
                              value={inst.amount}
                              onChange={e => {
                                const ni = [...saleForm.installments];
                                ni[i].amount = e.target.value;
                                setSaleForm({ ...saleForm, installments: ni });
                              }}
                              className="w-full p-3 text-xs font-black bg-slate-50 rounded-xl border border-transparent focus:bg-white focus:border-slate-900 outline-none text-slate-900 font-mono transition-all"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => setSaleForm({ ...saleForm, installments: saleForm.installments.filter((_, idx) => idx !== i) })}
                            className="self-end w-12 h-12 flex items-center justify-center text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all border border-rose-100 active:scale-95 shadow-sm"
                          >✕</button>
                        </div>
                        <div className="flex gap-4">
                          <div className="w-1/4 space-y-1.5">
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Method</label>
                            <div className="relative group">
                              <select
                                value={inst.payment_method}
                                onChange={e => {
                                  const ni = [...saleForm.installments];
                                  ni[i].payment_method = e.target.value;
                                  setSaleForm({ ...saleForm, installments: ni });
                                }}
                                className="w-full p-3 text-[10px] font-black bg-slate-50 rounded-xl border border-transparent focus:bg-white focus:border-slate-900 outline-none appearance-none cursor-pointer pr-8 transition-all"
                              >
                                <option value="Cash">Cash 💵</option>
                                <option value="Bank">Bank 🏦</option>
                                <option value="Check">Check 📄</option>
                                <option value="Wallet">Wallet 💳</option>
                              </select>
                              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[8px]">▼</div>
                            </div>
                          </div>
                          <div className="flex-1 space-y-1.5">
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Reference</label>
                            <input
                              type="text"
                              placeholder="Ref / Check No"
                              value={inst.reference_no}
                              onChange={e => {
                                const ni = [...saleForm.installments];
                                ni[i].reference_no = e.target.value;
                                setSaleForm({ ...saleForm, installments: ni });
                              }}
                              className="w-full p-3 text-[10px] font-bold bg-slate-50 rounded-xl border border-transparent focus:bg-white focus:border-slate-900 outline-none transition-all"
                            />
                          </div>
                          <div className="flex-1 space-y-1.5">
                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Memo</label>
                            <input
                              type="text"
                              placeholder="Additional notes..."
                              value={inst.notes}
                              onChange={e => {
                                const ni = [...saleForm.installments];
                                ni[i].notes = e.target.value;
                                setSaleForm({ ...saleForm, installments: ni });
                              }}
                              className="w-full p-3 text-[10px] font-bold bg-slate-50 rounded-xl border border-transparent focus:bg-white focus:border-slate-900 outline-none transition-all"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between items-center p-8 bg-slate-900 rounded-[2rem] border border-slate-800 shadow-2xl sticky bottom-0 z-10 translate-y-2">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Pending Collection</span>
                      <span className="text-slate-400 text-[9px] font-bold mt-1">Sum of unpaid balance</span>
                    </div>
                    <span className={`text-3xl font-black font-mono tracking-tighter ${Math.abs(((Number(saleForm.qty) * Number(saleForm.sell_price)) + (Number(saleForm.qty) * Number(saleForm.sell_price) * (Number(saleForm.vat_rate) / 100)) - (Number(saleForm.qty) * Number(saleForm.sell_price) * (Number(saleForm.wht_rate) / 100)) - Number(saleForm.down_payment) - saleForm.installments.reduce((sum, inst) => sum + Number(inst.amount), 0))) > 0.01 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {((Number(saleForm.qty) * Number(saleForm.sell_price)) + (Number(saleForm.qty) * Number(saleForm.sell_price) * (Number(saleForm.vat_rate) / 100)) - (Number(saleForm.qty) * Number(saleForm.sell_price) * (Number(saleForm.wht_rate) / 100)) - Number(saleForm.down_payment) - saleForm.installments.reduce((sum, inst) => sum + Number(inst.amount), 0)).toLocaleString()}
                    </span>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full py-6 rounded-[2.5rem] font-black text-xl shadow-2xl transition-all flex items-center justify-center gap-4 transform active:scale-95 ${isSubmitting ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-violet-600 text-white hover:bg-violet-700 shadow-violet-600/40'}`}
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                      {language === 'ar' ? 'جاري التنفيذ...' : 'Executing...'}
                    </>
                  ) : (
                    <>
                      <span className="text-2xl leading-none">🚀</span>
                      <div className="flex flex-col items-start leading-tight">
                        <span className="text-xs opacity-60 uppercase tracking-widest font-black">{language === 'ar' ? 'إتمام عملية البيع' : 'Complete Sale Cycle'}</span>
                        <span>{t.modals.sale.submit}</span>
                      </div>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: DDP */}
        {isDDPModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
              <div className="bg-white p-6 border-b border-slate-100 flex justify-between items-center text-slate-900">
                <h3 className="text-lg font-bold">{t.modals.ddp.title}</h3>
                <button onClick={() => setIsDDPModalOpen(false)} className="text-slate-400 hover:text-slate-900">✕</button>
              </div>
              <form onSubmit={handleDDPSubmit} className="p-8 space-y-6">
                <div className="flex bg-slate-50 p-1.5 rounded-xl border border-slate-200 gap-1 shadow-inner-soft">
                  <button type="button"
                    onClick={() => setDDPForm({ ...ddpForm, allocation_type: 'single' })}
                    className={`flex-1 py-2 rounded-lg font-bold text-xs transition-all ${ddpForm.allocation_type === 'single' ? 'bg-white shadow-sm text-slate-900 border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}>{t.modals.ddp.allocation.single}</button>
                  <button type="button"
                    disabled={selectedItem?.id && !selectedItem?.master_po_no}
                    onClick={() => {
                      setDDPForm({
                        ...ddpForm,
                        allocation_type: 'master',
                        master_po_no: selectedItem?.master_po_no || ddpForm.master_po_no
                      });
                    }}
                    className={`flex-1 py-2 rounded-lg font-bold text-xs transition-all ${ddpForm.allocation_type === 'master' ? 'bg-white shadow-sm text-slate-900 border border-slate-200' : 'text-slate-400 hover:text-slate-600'} disabled:opacity-50`}>{t.modals.ddp.allocation.master}</button>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{language === 'ar' ? 'اختر طلب الشراء' : 'Select PO'}</label>
                  {ddpForm.allocation_type === 'single' ? (
                    <select value={ddpForm.po_id} disabled={!!selectedItem?.id} onChange={(e) => setDDPForm({ ...ddpForm, po_id: e.target.value })} className="w-full p-3 bg-slate-50 rounded-lg border border-slate-200 font-bold text-slate-900 text-sm outline-none focus:border-slate-900 disabled:opacity-70" required>
                      <option value="">{t.modals.ddp.selectPO}</option>
                      {selectedItem?.id ? (
                        <option value={selectedItem.id}>PO-{selectedItem.id} | {selectedItem.item_description}</option>
                      ) : (
                        purchaseOrders.map(po => <option key={po.id} value={po.id}>PO-{po.id} | {po.item_description}</option>)
                      )}
                    </select>
                  ) : (
                    <select value={ddpForm.master_po_no} disabled={!!selectedItem?.master_po_no} onChange={(e) => setDDPForm({ ...ddpForm, master_po_no: e.target.value })} className="w-full p-3 bg-slate-50 rounded-lg border border-slate-200 font-bold text-slate-900 text-sm outline-none focus:border-slate-900 disabled:opacity-70" required>
                      <option value="">{t.modals.ddp.selectMaster}</option>
                      {selectedItem?.master_po_no ? (
                        <option value={selectedItem.master_po_no}>{selectedItem.master_po_no}</option>
                      ) : (
                        [...new Set(purchaseOrders.map(p => p.master_po_no))].filter(Boolean).map(mpo => (
                          <option key={mpo} value={mpo}>{mpo}</option>
                        ))
                      )}
                    </select>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{language === 'ar' ? 'التاريخ' : 'Date'}</label>
                    <input type="date" value={ddpForm.expense_date} onChange={(e) => setDDPForm({ ...ddpForm, expense_date: e.target.value })} className="w-full p-3 bg-slate-50 rounded-lg border border-slate-200 font-bold text-slate-900 text-sm outline-none focus:border-slate-900" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t.modals.ddp.type}</label>
                    <input type="text" placeholder={t.modals.ddp.type} value={ddpForm.expense_name} onChange={(e) => setDDPForm({ ...ddpForm, expense_name: e.target.value })} required className="w-full p-3 bg-slate-50 rounded-lg border border-slate-200 font-bold text-slate-900 text-sm outline-none focus:border-slate-900" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t.modals.ddp.amount}</label>
                    <input type="number" value={ddpForm.amount} onChange={(e) => setDDPForm({ ...ddpForm, amount: e.target.value })} required className="w-full p-3 bg-slate-50 rounded-lg border border-slate-200 font-bold font-mono text-center text-slate-900 text-sm outline-none focus:border-slate-900" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t.modals.ddp.currency}</label>
                    <select value={ddpForm.currency} onChange={(e) => {
                      const val = e.target.value;
                      setDDPForm({ ...ddpForm, currency: val, fx_rate: val === 'EGP' ? 1 : ddpForm.fx_rate });
                    }} className="w-full p-3 bg-slate-50 rounded-lg border border-slate-200 font-bold text-slate-900 text-sm outline-none focus:border-slate-900">
                      <option value="EGP">EGP</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="SAR">SAR</option>
                      <option value="AED">AED</option>
                      <option value="GBP">GBP</option>
                      <option value="CNY">CNY</option>
                    </select>
                  </div>
                </div>
                {ddpForm.currency !== 'EGP' && (
                  <div className="animate-fade-in space-y-1">
                    <label className="text-[10px] font-bold text-slate-900 uppercase tracking-widest ml-1">{t.modals.ddp.fx}</label>
                    <input type="number" step="0.0001" value={ddpForm.fx_rate} onChange={(e) => setDDPForm({ ...ddpForm, fx_rate: e.target.value })} required className="w-full p-3 bg-slate-50 rounded-lg border border-slate-200 font-bold font-mono text-center text-slate-900 text-sm outline-none focus:border-slate-900" />
                  </div>
                )}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`w-full py-5 rounded-2xl font-black text-lg shadow-xl transition-all flex items-center justify-center gap-4 transform active:scale-95 ${isSubmitting ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-violet-600 text-white hover:bg-violet-700 shadow-violet-600/30'}`}
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      {language === 'ar' ? 'جاري التخصيص...' : 'Processing...'}
                    </>
                  ) : (
                    <>
                      <span className="text-xl leading-none">🚢</span>
                      {t.modals.ddp.submit}
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* MODAL: TRANSFER */}
        {isTransferModalOpen && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-[100] p-4 animate-fade-in">
            <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200 shadow-slate-900/20">
              <div className="bg-white p-10 border-b border-slate-100 flex justify-between items-center">
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center text-xl shadow-lg shadow-slate-900/20">🔄</div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">{t.modals.transfer.title}</h3>
                    <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mt-1">Move stock between locations</p>
                  </div>
                </div>
                <button onClick={() => setIsTransferModalOpen(false)} className="w-12 h-12 flex items-center justify-center bg-slate-50 text-slate-400 hover:text-slate-900 rounded-2xl transition-all border border-slate-200 active:scale-95 shadow-sm">✕</button>
              </div>
              <form onSubmit={handleTransfer} className="p-10 space-y-8">
                <div className="bg-slate-50/50 p-8 rounded-3xl border border-slate-100 shadow-inner-soft space-y-3">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{t.modals.transfer.itemToTransfer}</p>
                      <p className="text-xl font-black text-slate-900 mt-1">{selectedItem?.item_name}</p>
                    </div>
                    <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm">
                      <span className="text-[10px] font-black text-emerald-600 uppercase tracking-tight">{t.modals.transfer.availableStock}: {Number(selectedItem?.remaining_qty).toLocaleString()} {selectedItem?.uom}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="space-y-3">
                    <label className="block text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">{t.modals.transfer.qty}</label>
                    <input type="number" value={transferForm.qty} onChange={(e) => setTransferForm({ ...transferForm, qty: e.target.value })} required className="w-full p-5 bg-slate-50 rounded-2xl border border-slate-200 font-black font-mono text-center text-slate-900 text-2xl outline-none focus:bg-white focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 transition-all shadow-sm" placeholder="0" />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="block text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">{t.modals.transfer.toProject}</label>
                      <div className="relative group">
                        <select value={transferForm.to_project} onChange={e => setTransferForm({ ...transferForm, to_project: e.target.value })} className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 font-bold text-slate-900 text-sm outline-none focus:bg-white focus:border-slate-900 transition-all appearance-none cursor-pointer pr-10 shadow-sm">
                          <option value="">{t.modals.transfer.sameProject}</option>
                          {projects.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">▼</div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="block text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] ml-1">{t.modals.transfer.toWarehouse}</label>
                      <div className="relative group">
                        <select value={transferForm.to_warehouse} onChange={e => setTransferForm({ ...transferForm, to_warehouse: e.target.value })} className="w-full p-4 bg-slate-50 rounded-2xl border border-slate-200 font-bold text-slate-900 text-sm outline-none focus:bg-white focus:border-slate-900 transition-all appearance-none cursor-pointer pr-10 shadow-sm">
                          <option value="">{t.modals.transfer.sameWarehouse}</option>
                          {warehouses.map(w => <option key={w.id} value={w.name}>{w.name}</option>)}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">▼</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`flex-[2] py-6 rounded-[2rem] font-black text-xl shadow-2xl transition-all flex items-center justify-center gap-4 transform active:scale-95 ${isSubmitting ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-violet-600 text-white hover:bg-violet-700 shadow-violet-600/30'}`}
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                        {language === 'ar' ? 'جاري التنفيذ...' : 'Executing...'}
                      </>
                    ) : (
                      <>
                        <span className="text-2xl leading-none">🔄</span> {t.modals.transfer.confirm}
                      </>
                    )}
                  </button>
                  <button type="button" onClick={() => window.print()} className="flex-1 bg-slate-50 text-slate-500 p-6 rounded-[2rem] font-black text-[10px] border border-slate-200 hover:bg-white hover:text-slate-900 transition-all uppercase tracking-[0.2em] shadow-sm active:scale-95 flex items-center justify-center gap-2">
                    <span>🖨️</span> {t.modals.transfer.print}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* --- SUPPLIER DEPOSIT MODAL (TOP ALIGNED) --- */}
        {isSupplierDepositModalOpen && (
          <div className="fixed inset-0 z-[9999] flex items-start justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto animate-in fade-in duration-300 custom-scrollbar">
            <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl border border-slate-200 my-10 transform animate-in slide-in-from-top-10 duration-500 flex flex-col max-h-[90vh] overflow-hidden">
              <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 shrink-0 z-10">
                <div className={language === 'ar' ? 'text-right' : 'text-left'}>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                    {editingDepositId 
                      ? (language === 'ar' ? 'تعديل الدفعة المقدمة' : 'Edit Supplier Deposit') 
                      : t.modals.supplierDeposit.title}
                  </h3>
                  <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-1">Financial Integrity Module</p>
                </div>
                <button onClick={() => setIsSupplierDepositModalOpen(false)} className="w-12 h-12 bg-white text-slate-400 hover:text-rose-500 rounded-2xl flex items-center justify-center text-2xl transition-all border border-slate-200 hover:border-rose-100 shadow-sm">✕</button>
              </div>

              <form onSubmit={submitSupplierDeposit} className="p-8 space-y-6 overflow-y-auto custom-scrollbar relative flex-1 min-h-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Supplier Selection */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center px-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.modals.supplierDeposit.supplier}</label>
                      {supplierDepositForm.master_po_no && (
                        <span className="text-[10px] font-black text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full border border-violet-100 animate-pulse">
                          MPO Avg FX: {(() => {
                            const mpo = supplierDepositForm.master_po_no;
                            const mpoTxns = (supplierDeposits || []).filter(d => d.description?.includes(`| MPO: ${mpo}`) || (mpo && d.description?.includes(`| Ref: ${mpo}`)));
                            if (mpoTxns.length === 0) return 0;
                            let totalLcy = 0; let totalFcy = 0;
                            mpoTxns.forEach(d => {
                              const parts = (d.description || '').split('|');
                              if (parts.length >= 2) {
                                const fcy = parseFloat(parts[1].trim().split(' ')[0] || 0);
                                let rate = 1;
                                const rateMatch = (d.description || '').match(/Rate:\s*([\d.]+)/);
                                if (rateMatch) rate = parseFloat(rateMatch[1]);
                                if (!isNaN(fcy) && !isNaN(rate)) { totalFcy += fcy; totalLcy += (fcy * rate); }
                              }
                            });
                            return totalFcy > 0 ? (totalLcy / totalFcy).toFixed(4) : 0;
                          })()}
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      required
                      value={supplierDepositForm.supplier_name}
                      onChange={(e) => setSupplierDepositForm({ ...supplierDepositForm, supplier_name: e.target.value })}
                      placeholder={language === 'ar' ? 'ادخل اسم المورد' : "Enter Supplier Name"}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 focus:border-emerald-500 focus:bg-white outline-none transition-all font-bold text-slate-700"
                    />
                  </div>

                  {/* MPO Selection (Defaulted and Locked when applicable) */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-violet-600 uppercase tracking-widest flex items-center gap-2">
                      {t.modals.po.masterRef}
                      {supplierDepositForm.master_po_no && <span className="text-[8px] bg-violet-100 px-1.5 py-0.5 rounded text-violet-700">LOCKED</span>}
                    </label>
                    <select
                      value={supplierDepositForm.master_po_no}
                      disabled={!!supplierDepositForm.master_po_no}
                      onChange={(e) => {
                        setSupplierDepositForm({ ...supplierDepositForm, master_po_no: e.target.value });
                      }}
                      className={`w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 outline-none transition-all font-bold text-slate-700 ${!!supplierDepositForm.master_po_no ? 'cursor-not-allowed opacity-80' : 'focus:border-violet-500 focus:bg-white cursor-pointer'}`}
                    >
                      <option value="">-- {language === 'ar' ? 'اختر MPO' : 'Select MPO'} --</option>
                      {[...new Set(purchaseOrders.map(p => p.master_po_no))].filter(Boolean).map(mpo => (
                        <option key={mpo} value={mpo}>{mpo}</option>
                      ))}
                    </select>
                  </div>

                  {/* Project / Cost Center (Locked as requested) */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                      {t.modals.supplierDeposit.project}
                      <span className="text-[8px] bg-emerald-100 px-1.5 py-0.5 rounded">LOCKED</span>
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={supplierDepositForm.project_name}
                      className="w-full bg-slate-100 border-2 border-slate-200 rounded-2xl p-4 cursor-not-allowed outline-none font-bold text-slate-500"
                    />
                  </div>

                  {/* Amount */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.modals.supplierDeposit.amount}</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={supplierDepositForm.amount}
                      onChange={(e) => setSupplierDepositForm({ ...supplierDepositForm, amount: e.target.value })}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 focus:border-emerald-500 focus:bg-white outline-none transition-all font-bold text-slate-700"
                    />
                  </div>

                  {/* Currency & Rate */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.modals.supplierDeposit.currency}</label>
                      <select
                        value={supplierDepositForm.currency}
                        onChange={(e) => setSupplierDepositForm({ ...supplierDepositForm, currency: e.target.value })}
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 focus:border-emerald-500 focus:bg-white outline-none transition-all font-bold text-slate-700"
                      >
                        <option value="SAR">SAR</option>
                        <option value="EGP">EGP</option>
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.modals.supplierDeposit.rate}</label>
                      <input
                        type="number"
                        step="0.0001"
                        required
                        value={supplierDepositForm.fx_rate}
                        onChange={(e) => setSupplierDepositForm({ ...supplierDepositForm, fx_rate: e.target.value })}
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 focus:border-emerald-500 focus:bg-white outline-none transition-all font-bold text-slate-700"
                      />
                    </div>
                  </div>

                  {/* FINANCIAL SUMMARY SECTION (MPO SPECIFIC) */}
                  {supplierDepositForm.master_po_no && (
                    <div className="bg-slate-900 rounded-[2.5rem] p-8 space-y-6 shadow-2xl shadow-slate-900/40 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 rounded-full blur-3xl group-hover:bg-violet-500/20 transition-all duration-700"></div>
                      <div className="relative flex flex-col md:flex-row justify-between gap-8">
                        {(() => {
                          const mpo = supplierDepositForm.master_po_no;
                          const mpoItems = purchaseOrders.filter(p => p.master_po_no === mpo);
                          const total = mpoItems.reduce((acc, p) => acc + (Number(p.qty) * Number(p.estimated_cost)), 0);

                          // Strict MPO filter for previous deposits
                          const mpoTxns = (supplierDeposits || []).filter(d =>
                            ((d.description?.includes(`| MPO: ${mpo}`)) ||
                            (mpo && d.description?.includes(`| Ref: ${mpo}`))) &&
                            d.id !== editingDepositId
                          );

                          let paid = 0;
                          mpoTxns.forEach(d => {
                            const parts = (d.description || '').split('|');
                            if (parts.length >= 2) {
                              const amtPart = parts[1].trim().split(' ')[0];
                              if (!isNaN(parseFloat(amtPart))) paid += parseFloat(amtPart);
                            }
                          });

                          const remaining = total - paid;
                          const currentAmount = parseFloat(supplierDepositForm.amount || 0);
                          const isOverLimit = (paid + currentAmount) > (total + 0.01);

                          return (
                            <>
                              {/* Total MPO Amount */}
                              <div className="flex-1">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">{language === 'ar' ? 'إجمالي قيمة الـ MPO' : 'TOTAL MPO VALUE'}</p>
                                <div className="flex items-baseline gap-2">
                                  <span className="text-3xl font-black text-white font-mono tracking-tighter">{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                  <span className="text-xs font-black text-slate-500">FCY</span>
                                </div>
                              </div>

                              {/* Total Paid (Deposited) */}
                              <div className="flex-1">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">{language === 'ar' ? 'المبلغ المدفوع' : 'TOTAL PAID'}</p>
                                <div className="flex items-baseline gap-2">
                                  <span className="text-3xl font-black text-emerald-400 font-mono tracking-tighter">{paid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                  <span className="text-xs font-black text-slate-500">FCY</span>
                                </div>
                              </div>

                              {/* Remaining Balance */}
                              <div className="flex-1">
                                <p className={`text-[10px] font-black uppercase tracking-[0.2em] mb-2 ${isOverLimit ? 'text-rose-500 animate-pulse' : 'text-rose-500'}`}>{language === 'ar' ? 'المبلغ المتبقي' : 'REMAINING'}</p>
                                <div className="flex items-baseline gap-2">
                                  <span className={`text-3xl font-black font-mono tracking-tighter ${isOverLimit ? 'text-rose-600' : 'text-rose-400'}`}>{(total - paid).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                  <span className="text-xs font-black text-rose-900/50">FCY</span>
                                </div>
                                {isOverLimit && <p className="text-[8px] font-black text-rose-500 mt-2 uppercase tracking-tighter">⚠️ Limit Exceeded!</p>}
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                  {/* Date */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'تاريخ الإيداع' : 'Deposit Date'}</label>
                    <input
                      type="date"
                      value={supplierDepositForm.date}
                      onChange={(e) => setSupplierDepositForm({ ...supplierDepositForm, date: e.target.value })}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 focus:border-emerald-500 focus:bg-white outline-none transition-all font-bold text-slate-700"
                    />
                  </div>

                  {/* Financial Account (Select from COA) */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'ar' ? 'الحساب المالي (خزينة/بنك)' : 'Financial Account (Bank/Cash)'}</label>
                    <div className="relative">
                      <select
                        required
                        value={supplierDepositForm.credit_account}
                        onChange={(e) => setSupplierDepositForm({ ...supplierDepositForm, credit_account: e.target.value })}
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 focus:border-emerald-500 focus:bg-white outline-none transition-all font-bold text-slate-700 appearance-none"
                      >
                        {financialAccounts.length > 0 ? (
                          financialAccounts.map(acc => (
                            <option key={acc.id} value={acc.account_name}>
                              {acc.account_code} - {acc.account_name}
                            </option>
                          ))
                        ) : (
                          <>
                            <option value="1101">1101 - Cash in Hand</option>
                            <option value="1111">1111 - Main Bank Account</option>
                          </>
                        )}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">▼</div>
                    </div>
                  </div>

                  {/* Withholding Tax (WHT) */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-rose-500 uppercase tracking-widest flex justify-between">
                      {language === 'ar' ? 'ضريبة الخصم' : 'Withholding Tax (WHT)'}
                      <span className="text-[8px] opacity-60">IF APPLICABLE</span>
                    </label>
                    <div className="relative group">
                      <select
                        value={supplierDepositForm.wht_percent}
                        onChange={(e) => setSupplierDepositForm({ ...supplierDepositForm, wht_percent: e.target.value })}
                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 focus:border-rose-500 focus:bg-white outline-none transition-all font-bold text-slate-700 appearance-none"
                      >
                        <option value="0">0% (None)</option>
                        <option value="1">1% (Supplies)</option>
                        <option value="3">3% (Services)</option>
                        <option value="5">5% (Professional)</option>
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-xs">▼</div>
                    </div>
                  </div>

                  {/* Reference */}
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.modals.supplierDeposit.reference}</label>
                    <input
                      type="text"
                      value={supplierDepositForm.reference_no}
                      onChange={(e) => setSupplierDepositForm({ ...supplierDepositForm, reference_no: e.target.value })}
                      className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 focus:border-emerald-500 focus:bg-white outline-none transition-all font-bold text-slate-700"
                    />
                  </div>
                </div>

                {/* Global Avg FX Transactions Log */}
                {relevantTxns.length > 0 && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-700 mb-6">
                    <div className="flex items-center justify-between px-2">
                      <span className="text-[10px] font-black text-violet-600 uppercase tracking-[0.2em] flex items-center gap-2">
                        <span className="w-2 h-2 bg-violet-600 rounded-full animate-pulse"></span>
                        Avg FX Transactions Log
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">{relevantTxns.length} Entries</span>
                    </div>
                    <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-2 pr-2">
                      {relevantTxns.map((txn, idx) => {
                        const parts = (txn.description || '').split('|');
                        const amt = parts[1]?.trim() || '0.00';
                        const ref = parts[2]?.trim() || txn.reference_no || 'N/A';
                        return (
                          <div key={idx} className="flex items-center justify-between p-4 bg-slate-50/50 rounded-2xl border border-slate-100/50 hover:bg-white hover:border-violet-200 transition-all group">
                            <div className="flex flex-col">
                              <span className="text-[9px] font-black text-slate-800 uppercase leading-none">{amt}</span>
                              <span className="text-[8px] font-bold text-slate-400 mt-1 uppercase tracking-tighter">REF: {ref}</span>
                            </div>
                            <div className="text-right flex flex-col items-end">
                              <span className="text-[8px] font-black text-slate-500 uppercase">{new Date(txn.created_at).toLocaleDateString()}</span>
                              <span className="text-[7px] font-black text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded mt-1">AUDITED</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting || (() => {
                    const mpo = supplierDepositForm.master_po_no;
                    if (!mpo) return false;
                    const mpoItems = purchaseOrders.filter(p => p.master_po_no === mpo);
                    const total = mpoItems.reduce((acc, p) => acc + (Number(p.qty) * Number(p.estimated_cost)), 0);
                    const mpoTxns = (supplierDeposits || []).filter(d => 
                      ((d.description?.includes(`| MPO: ${mpo}`)) || (mpo && d.description?.includes(`| Ref: ${mpo}`))) &&
                      d.id !== editingDepositId
                    );
                    let paid = 0;
                    mpoTxns.forEach(d => {
                      const parts = (d.description || '').split('|');
                      if (parts.length >= 2) {
                        const amtPart = parts[1].trim().split(' ')[0];
                        let fcy = parseFloat(amtPart);
                        if (isNaN(fcy)) { fcy = parseFloat(d.debit || 0); }
                        if (!isNaN(fcy)) paid += fcy;
                      }
                    });
                    return (paid + parseFloat(supplierDepositForm.amount || 0)) > (total + 0.01);
                  })()}
                  className={`w-full py-6 rounded-[2rem] font-black text-xl shadow-2xl transition-all flex items-center justify-center gap-4 transform active:scale-95 ${isSubmitting || (() => {
                    const mpo = supplierDepositForm.master_po_no;
                    if (!mpo) return false;
                    const mpoItems = purchaseOrders.filter(p => p.master_po_no === mpo);
                    const total = mpoItems.reduce((acc, p) => acc + (Number(p.qty) * Number(p.estimated_cost)), 0);
                    const mpoTxns = (supplierDeposits || []).filter(d => 
                      ((d.description?.includes(`| MPO: ${mpo}`)) || (mpo && d.description?.includes(`| Ref: ${mpo}`))) &&
                      d.id !== editingDepositId
                    );
                    let paid = 0;
                    mpoTxns.forEach(d => {
                      const parts = (d.description || '').split('|');
                      if (parts.length >= 2) {
                        const amtPart = parts[1].trim().split(' ')[0];
                        let fcy = parseFloat(amtPart);
                        if (isNaN(fcy)) { fcy = parseFloat(d.debit || 0); }
                        if (!isNaN(fcy)) paid += fcy;
                      }
                    });
                    return (paid + parseFloat(supplierDepositForm.amount || 0)) > (total + 0.01);
                  })()
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-600/30'
                    }`}
                >
                  {isSubmitting ? (
                    <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      💰 {editingDepositId 
                        ? (language === 'ar' ? 'تعديل الدفعة المقدمة' : 'Update Supplier Deposit') 
                        : t.modals.supplierDeposit.submit}
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* --- BALANCE MANAGEMENT MODAL --- */}
        {isBalanceModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 backdrop-blur-xl bg-slate-900/60 transition-all duration-500 animate-in fade-in">
            <div className="bg-white w-full max-w-2xl rounded-[32px] shadow-2xl shadow-slate-900/40 overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-300">
              {/* Header */}
              <div className="bg-slate-900 p-8 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                <div className="relative z-10">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-2xl font-black tracking-tight">{language === 'ar' ? 'إدارة رصيد الحجز' : 'Manage Booking Balance'}</h3>
                      <p className="text-slate-400 font-bold text-xs mt-2 uppercase tracking-widest opacity-80">
                        {balanceForm.customer_name} | {language === 'ar' ? 'الرصيد المتاح:' : 'Available Credit:'} {balanceForm.current_credit.toLocaleString()}
                      </p>
                    </div>
                    <button onClick={() => setIsBalanceModalOpen(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-slate-400 hover:text-white">✕</button>
                  </div>
                </div>
              </div>

              <form onSubmit={handleBalanceAction} className="p-8 space-y-8 bg-slate-50/30">
                {/* Action Selection */}
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setBalanceForm({ ...balanceForm, action_type: 'refund' })}
                    className={`p-6 rounded-[24px] border-2 transition-all flex flex-col items-center gap-3 ${balanceForm.action_type === 'refund' ? 'border-amber-500 bg-amber-50 shadow-lg shadow-amber-900/5' : 'border-slate-100 bg-white hover:border-slate-200 opacity-60'}`}
                  >
                    <span className="text-3xl">💰</span>
                    <span className="font-black text-xs uppercase tracking-widest">{language === 'ar' ? 'سداد نقدي (Refund)' : 'Cash Refund'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBalanceForm({ ...balanceForm, action_type: 'transfer' })}
                    className={`p-6 rounded-[24px] border-2 transition-all flex flex-col items-center gap-3 ${balanceForm.action_type === 'transfer' ? 'border-blue-500 bg-blue-50 shadow-lg shadow-blue-900/5' : 'border-slate-100 bg-white hover:border-slate-200 opacity-60'}`}
                  >
                    <span className="text-3xl">💳</span>
                    <span className="font-black text-xs uppercase tracking-widest">{language === 'ar' ? 'تحويل للمحفظة (Credit)' : 'To Wallet'}</span>
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Amount */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.1em] ml-1">{language === 'ar' ? 'المبلغ المراد معالجته' : 'Amount to Process'}</label>
                    <div className="relative">
                      <input
                        type="number"
                        max={balanceForm.current_credit}
                        value={balanceForm.amount}
                        onChange={e => setBalanceForm({ ...balanceForm, amount: e.target.value })}
                        className="w-full p-5 bg-white rounded-2xl border border-slate-200 font-black text-slate-900 text-xl outline-none focus:border-slate-900 transition-all shadow-sm"
                        placeholder="0.00"
                        required
                      />
                      <span className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs uppercase tracking-widest pointer-events-none">LCY</span>
                    </div>
                  </div>

                  {balanceForm.action_type === 'refund' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 animate-in slide-in-from-top-2">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.1em] ml-1">{language === 'ar' ? 'السحب من حساب' : 'Source Account'}</label>
                        <select
                          value={balanceForm.credit_account}
                          onChange={e => setBalanceForm({ ...balanceForm, credit_account: e.target.value })}
                          className="w-full p-4 bg-white rounded-2xl border border-slate-200 font-black text-slate-900 text-sm outline-none focus:border-slate-900 transition-all shadow-sm appearance-none cursor-pointer"
                          required
                        >
                          {financialAccounts.map(acc => (
                            <option key={acc.id} value={acc.account_name}>{acc.account_code} - {acc.account_name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.1em] ml-1">{language === 'ar' ? 'الرقم المرجعي' : 'Reference / Check'}</label>
                        <input
                          type="text"
                          value={balanceForm.reference_no}
                          onChange={e => setBalanceForm({ ...balanceForm, reference_no: e.target.value })}
                          className="w-full p-4 bg-white rounded-2xl border border-slate-200 font-bold text-slate-900 text-sm outline-none focus:border-slate-900 transition-all shadow-sm"
                          placeholder="REF-..."
                        />
                      </div>
                    </div>
                  )}

                  {balanceForm.action_type === 'transfer' && (
                    <div className="p-6 bg-blue-50/50 border border-blue-100 rounded-[24px] flex items-start gap-4 animate-in slide-in-from-top-2">
                      <span className="text-2xl mt-1">ℹ️</span>
                      <p className="text-xs font-bold text-blue-900/70 leading-relaxed">
                        {language === 'ar'
                          ? 'سيتم تحويل هذا المبلغ إلى محفظة الرصيد العام للعميل. يمكن استخدامه لاحقاً كخصم في أي عمليات شراء أو حجز أخرى.'
                          : 'This amount will be transferred to the customer general credit balance. It can be used later as a discount in any future purchases or bookings.'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsBalanceModalOpen(false)}
                    className="flex-1 p-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] text-slate-400 hover:text-slate-900 transition-all border border-slate-200 hover:bg-slate-100"
                  >
                    {language === 'ar' ? 'إلغاء' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || !balanceForm.amount}
                    className={`flex-[2] p-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] text-white transition-all shadow-xl active:scale-95 ${balanceForm.action_type === 'refund' ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-900/20' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-900/20'} disabled:opacity-50`}
                  >
                    {isSubmitting ? '...' : (language === 'ar' ? 'تأكيد العملية البنكية' : 'Confirm Financial Action')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}


      </div>

      {auditModal.isOpen && (
        <AuditTimeline
          tableName={auditModal.tableName}
          recordId={auditModal.recordId}
          onClose={() => setAuditModal({ isOpen: false, tableName: '', recordId: null })}
        />
      )}

      {/* --- DRILL-DOWN MODAL --- */}
      {isDrillDownModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in zoom-in duration-300">
          <div className="bg-white w-full max-w-4xl max-h-[85vh] rounded-[3rem] shadow-2xl overflow-hidden border border-slate-200 flex flex-col scale-100 transition-transform duration-500">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className={language === 'ar' ? 'text-right' : 'text-left'}>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">{drillDownContent.title}</h3>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Detailed Data Breakdown</p>
              </div>
              <button
                onClick={() => setIsDrillDownModalOpen(false)}
                className="w-12 h-12 bg-white text-slate-400 hover:text-rose-500 rounded-2xl flex items-center justify-center text-2xl transition-all border border-slate-200 hover:border-rose-100 shadow-sm"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-auto p-8 custom-scrollbar">
              <table className={`w-full ${language === 'ar' ? 'text-right' : 'text-left'} whitespace-nowrap`}>
                <thead className="sticky top-0 bg-slate-900 text-white z-10">
                  <tr>
                    {drillDownContent.columns.map((col, idx) => (
                      <th key={idx} className="px-6 py-4 text-[10px] font-black uppercase tracking-widest first:rounded-l-2xl last:rounded-r-2xl">
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {drillDownContent.data.length > 0 ? (
                    drillDownContent.data.map((row, rowIdx) => (
                      <tr
                        key={rowIdx}
                        onClick={() => {
                          if (row.id) {
                            setSelectedItem(inventoryItems.find(i => i.id === row.id));
                            setIsDrillDownModalOpen(false);
                            // Switch to stock tab and show details if needed
                            setActiveTab('stock');
                          }
                        }}
                        className="hover:bg-slate-50 transition-colors group cursor-pointer"
                      >
                        {drillDownContent.columns.map((col, colIdx) => (
                          <td key={colIdx} className="px-6 py-6 text-sm font-bold text-slate-700 group-hover:text-violet-600 transition-colors">
                            {col.key === 'item' && <span className="mr-3 opacity-0 group-hover:opacity-100 transition-all">🔍</span>}
                            {typeof row[col.key] === 'number' ? row[col.key].toLocaleString() : row[col.key]}
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={drillDownContent.columns.length} className="px-6 py-12 text-center text-slate-400 font-bold">
                        No detailed records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setIsDrillDownModalOpen(false)}
                className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs hover:bg-slate-800 transition-all active:scale-95"
              >
                {t.common.confirm}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* --- MPO INTELLIGENCE 360 MODAL (ELITE COMMAND CENTER) --- */}
      {isMPO360ModalOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-12 bg-slate-950/90 backdrop-blur-[40px] animate-in fade-in duration-700 overflow-y-auto">
          <div className="bg-white/95 w-full max-w-7xl rounded-[4rem] shadow-[0_80px_160px_rgba(0,0,0,0.6)] border border-white flex flex-col relative animate-in zoom-in-95 slide-in-from-bottom-20 duration-700 max-h-[92vh] overflow-hidden">

            {/* Glossy Header */}
            <div className="p-12 border-b border-slate-100 bg-white/50 backdrop-blur-md flex flex-col lg:flex-row justify-between items-start lg:items-center gap-10 sticky top-0 z-50">
              <div className="flex items-center gap-8">
                <div className="w-24 h-24 bg-slate-900 rounded-[2.5rem] flex items-center justify-center text-5xl shadow-[0_20px_50px_rgba(15,23,42,0.3)] animate-pulse">🧠</div>
                <div>
                  <div className="flex items-center gap-4">
                    <h2 className="text-5xl font-black text-slate-900 tracking-tightest">Intelligence <span className="text-indigo-600">360</span></h2>
                    <span className="px-6 py-2 bg-indigo-600 text-white rounded-full text-[10px] font-black uppercase tracking-[0.3em] shadow-lg shadow-indigo-500/40">Elite Protocol</span>
                  </div>
                  <p className="text-slate-400 font-bold text-base mt-2 uppercase tracking-[0.2em] flex items-center gap-3">
                    Ref: <span className="text-slate-900 font-black">#{mpo360Data.mpo}</span>
                    <span className="w-2 h-2 bg-slate-200 rounded-full"></span>
                    Entity: <span className="text-slate-900 font-black">{mpo360Data.pos?.[0]?.supplier || 'Internal Stock'}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="hidden lg:flex flex-col items-end">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Status</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="w-3 h-3 bg-emerald-500 rounded-full animate-ping"></span>
                    <span className="text-sm font-black text-slate-900">SYSTEM SECURE</span>
                  </div>
                </div>
                <button
                  onClick={() => setIsMPO360ModalOpen(false)}
                  className="w-20 h-20 bg-slate-100 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-[2rem] flex items-center justify-center text-4xl transition-all duration-500 border border-slate-200 hover:border-rose-100 group"
                >
                  <span className="group-hover:rotate-180 transition-transform duration-500">✕</span>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-12 space-y-16 custom-scrollbar bg-slate-50/50">

              {/* --- THE 6-CARD EXECUTIVE DASHBOARD (JAMDA & SHIK) --- */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-8">
                {[
                  { id: 'summary', label: 'Invested Capital', value: (mpo360Data.summary?.totalInvestedLcy || 0), icon: '🏦', color: 'slate', sub: 'Procurement + Landed' },
                  { id: 'sales', label: 'Total Revenue', value: (mpo360Data.summary?.totalRevenueLcy || 0), icon: '⚡', color: 'emerald', sub: 'Gross Realized Value' },
                  { id: 'collections', label: 'Cash Collected', value: (mpo360Data.summary?.totalCollectionsLcy || 0), icon: '💎', color: 'indigo', sub: 'Net Cash Inflow' },
                  { id: 'profit', label: 'Realized Margin', value: (mpo360Data.summary?.currentProfitLcy || 0), icon: '📈', color: 'amber', sub: 'Profit (Sold Items)' },
                  { id: 'stock', label: 'Inventory Value', value: (mpo360Data.summary?.remainingValueLcy || 0), icon: '📦', color: 'violet', sub: `${mpo360Data.summary?.remainingQty || 0} Units On-Hand` },
                  { id: 'roi', label: 'MPO Viability', value: (((mpo360Data.summary?.projectedProfitLcy || 0) / (mpo360Data.summary?.totalInvestedLcy || 1)) * 100), icon: '🚀', color: 'rose', sub: 'Est. Cycle Return', isPercent: true }
                ].map((stat, i) => (
                  <div
                    key={i}
                    onClick={() => setDetailView(stat.id)}
                    className={`group relative p-10 rounded-[3.5rem] border transition-all duration-700 cursor-pointer overflow-hidden
                      ${detailView === stat.id
                        ? 'bg-slate-900 border-indigo-500 shadow-[0_40px_80px_rgba(79,70,229,0.25)] -translate-y-4'
                        : 'bg-white border-white shadow-2xl shadow-slate-200/50 hover:border-slate-100 hover:-translate-y-2'
                      }`}
                  >
                    <div className={`absolute top-0 right-0 w-40 h-40 rounded-full blur-[80px] opacity-10 -mr-20 -mt-20 bg-indigo-500 group-hover:opacity-30 transition-opacity`}></div>

                    <div className="relative z-10">
                      <div className="flex justify-between items-start mb-8">
                        <div className={`w-16 h-16 rounded-3xl flex items-center justify-center text-3xl transition-all duration-700 shadow-xl
                          ${detailView === stat.id ? 'bg-indigo-600 text-white scale-110 rotate-12' : 'bg-slate-100 text-slate-500 group-hover:scale-110'}
                        `}>
                          {stat.icon}
                        </div>
                        <span className={`text-[9px] font-black uppercase tracking-[0.3em] py-2 px-4 rounded-full
                          ${detailView === stat.id ? 'bg-white/10 text-white' : 'bg-slate-50 text-slate-400'}
                        `}>
                          {detailView === stat.id ? 'Selected' : 'View'}
                        </span>
                      </div>

                      <p className={`text-[11px] font-black uppercase tracking-[0.4em] mb-3 ${detailView === stat.id ? 'text-slate-400' : 'text-slate-500'}`}>
                        {stat.label}
                      </p>

                      <h4 className={`text-3xl font-black font-mono tracking-tighter transition-all duration-500 ${detailView === stat.id ? 'text-white' : 'text-slate-900'}`}>
                        {stat.isPercent ? `${stat.value.toFixed(1)}%` : stat.value.toLocaleString()}
                        {!stat.isPercent && <span className="text-sm ml-1 opacity-40">EGP</span>}
                      </h4>

                      <p className={`text-[10px] font-bold mt-4 uppercase tracking-widest ${detailView === stat.id ? 'text-slate-500' : 'text-slate-400'}`}>
                        {stat.sub}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Dynamic Drill-Down View (The 'Shik' Part) */}
              {detailView !== 'summary' && detailView !== 'roi' && detailView !== 'profit' ? (
                <div className="bg-slate-950 rounded-[5rem] p-16 text-white animate-in slide-in-from-top-20 duration-1000 relative overflow-hidden shadow-[0_60px_120px_rgba(0,0,0,0.5)]">
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/10 via-transparent to-rose-600/5"></div>
                  <div className="relative z-10">
                    <div className="flex flex-col md:flex-row justify-between items-end gap-10 mb-16">
                      <div>
                        <div className="flex items-center gap-6 mb-4">
                          <div className="w-16 h-16 bg-white/10 rounded-[2rem] flex items-center justify-center text-3xl backdrop-blur-xl border border-white/10">🔍</div>
                          <h4 className="text-4xl font-black tracking-tightest">Granular Analysis: <span className="text-indigo-400 font-mono">{detailView.toUpperCase()}</span></h4>
                        </div>
                        <p className="text-slate-500 font-bold text-sm uppercase tracking-[0.4em] ml-24">Real-time ledger reconciliation & traceability</p>
                      </div>
                      <button
                        onClick={() => setDetailView('summary')}
                        className="px-12 py-6 bg-white/5 hover:bg-white text-white hover:text-slate-900 rounded-3xl text-xs font-black uppercase tracking-[0.3em] border border-white/10 transition-all duration-500 shadow-2xl active:scale-95"
                      >
                        ← Back to Cockpit
                      </button>
                    </div>

                    <div className="overflow-hidden rounded-[3.5rem] border border-white/5 bg-white/[0.03] backdrop-blur-2xl">
                      <table className="w-full text-left">
                        <thead className="bg-white/5 text-[11px] font-black uppercase tracking-[0.4em] text-slate-500">
                          <tr>
                            <th className="px-12 py-8">Reference Identity</th>
                            <th className="px-12 py-8">Counterparty</th>
                            <th className="px-12 py-8 text-right">Valuation (LCY)</th>
                            <th className="px-12 py-8 text-center">Protocol Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03] text-base font-bold text-slate-300">
                          {detailView === 'sales' && mpo360Data.sales.map((s, i) => (
                            <tr key={i} className="hover:bg-white/[0.05] transition-all duration-300 group">
                              <td className="px-12 py-10">
                                <div className="flex flex-col">
                                  <span className="text-white font-black text-lg">Invoice #{s.id}</span>
                                  <span className="text-xs text-slate-500 font-mono mt-2">{new Date(s.date).toLocaleDateString()}</span>
                                </div>
                              </td>
                              <td className="px-12 py-10 text-slate-400 group-hover:text-white transition-colors">{s.customer_name}</td>
                              <td className="px-12 py-10 text-right font-black text-emerald-400 text-2xl">{(Number(s.sold_qty) * Number(s.unit_price)).toLocaleString()}</td>
                              <td className="px-12 py-10 text-center">
                                <span className="px-6 py-2 bg-emerald-500/10 text-emerald-400 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]">AUDIT VERIFIED</span>
                              </td>
                            </tr>
                          ))}
                          {detailView === 'collections' && mpo360Data.clientTxns.map((t, i) => (
                            <tr key={i} className="hover:bg-white/[0.05] transition-all duration-300 group">
                              <td className="px-12 py-10">
                                <div className="flex flex-col">
                                  <span className="text-white font-black text-lg">Receipt Entry</span>
                                  <span className="text-xs text-slate-500 font-mono mt-2">{new Date(t.date).toLocaleDateString()}</span>
                                </div>
                              </td>
                              <td className="px-12 py-10 text-slate-400 group-hover:text-white transition-colors">{t.account_name}</td>
                              <td className="px-12 py-10 text-right font-black text-indigo-400 text-2xl">{Number(t.amount).toLocaleString()}</td>
                              <td className="px-12 py-10 text-center">
                                <span className="px-6 py-2 bg-indigo-500/10 text-indigo-400 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border border-indigo-500/20">BANK SYNCED</span>
                              </td>
                            </tr>
                          ))}
                          {detailView === 'stock' && mpo360Data.stock.map((st, i) => (
                            <tr key={i} className="hover:bg-white/[0.05] transition-all duration-300 group">
                              <td className="px-12 py-10">
                                <div className="flex flex-col">
                                  <span className="text-white font-black text-lg">{st.item_name}</span>
                                  <span className="text-xs text-slate-500 font-mono mt-2">Batch: #{st.id}</span>
                                </div>
                              </td>
                              <td className="px-12 py-10 text-slate-400 group-hover:text-white transition-colors">{st.warehouse || 'Central Warehouse'}</td>
                              <td className="px-12 py-10 text-right font-black text-violet-400 text-2xl">{(Number(st.remaining_qty) * Number(st.avg_cost || st.buy_price)).toLocaleString()}</td>
                              <td className="px-12 py-10 text-center">
                                <span className="px-6 py-2 bg-violet-500/10 text-violet-400 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border border-violet-500/20">{st.remaining_qty} ON-HAND</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  {/* Performance Chart & Risk Map */}
                  <div className="bg-slate-900 rounded-[4rem] p-16 text-white relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-tr from-indigo-600/10 to-transparent"></div>
                    <div className="relative z-10">
                      <h3 className="text-3xl font-black tracking-tightest mb-12">Business Radar</h3>
                      <div className="space-y-10">
                        <div>
                          <div className="flex justify-between items-end mb-4">
                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Stock Liquidity Velocity</span>
                            <span className="text-3xl font-black text-indigo-400">
                              {(((mpo360Data.pos.reduce((s, p) => s + Number(p.qty), 0) - (mpo360Data.summary?.remainingQty || 0)) / (mpo360Data.pos.reduce((s, p) => s + Number(p.qty), 0) || 1)) * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="w-full h-4 bg-white/5 rounded-full overflow-hidden border border-white/5 p-1">
                            <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full shadow-[0_0_20px_rgba(99,102,241,0.6)] animate-pulse"
                              style={{ width: `${(((mpo360Data.pos.reduce((s, p) => s + Number(p.qty), 0) - (mpo360Data.summary?.remainingQty || 0)) / (mpo360Data.pos.reduce((s, p) => s + Number(p.qty), 0) || 1)) * 100)}%` }}></div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-10 pt-10">
                          <div className="p-8 bg-white/5 rounded-[2.5rem] border border-white/10 group-hover:border-indigo-500/30 transition-all duration-500">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-3">Realized Margin</p>
                            <h5 className="text-3xl font-black text-emerald-400 font-mono">
                              {(((mpo360Data.summary?.currentProfitLcy || 0) / (mpo360Data.summary?.totalRevenueLcy || 1)) * 100).toFixed(1)}%
                            </h5>
                          </div>
                          <div className="p-8 bg-white/5 rounded-[2.5rem] border border-white/10 group-hover:border-violet-500/30 transition-all duration-500">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-3">Retention Value</p>
                            <h5 className="text-3xl font-black text-indigo-400 font-mono">
                              {(((mpo360Data.summary?.remainingValueLcy || 0) / (mpo360Data.summary?.totalInvestedLcy || 1)) * 100).toFixed(1)}%
                            </h5>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Impact Summary */}
                  <div className="bg-white rounded-[4rem] p-16 border border-slate-100 shadow-3xl shadow-slate-200/40 flex flex-col justify-center">
                    <div className="flex items-center gap-8 mb-12">
                      <div className="w-20 h-20 bg-rose-50 text-rose-600 rounded-[2.5rem] flex items-center justify-center text-4xl shadow-2xl shadow-rose-500/20">⚖️</div>
                      <div>
                        <h3 className="text-3xl font-black text-slate-900 tracking-tightest">Exposure Ledger</h3>
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-[0.3em] mt-2">Final Financial Reconciliation</p>
                      </div>
                    </div>
                    <div className="space-y-6">
                      {[
                        { label: 'Unpaid Supplier Balance', value: ((mpo360Data.summary?.totalPoCostLcy || 0) - mpo360Data.deposits.reduce((s, d) => s + Number(d.amount), 0)), status: 'Payable', icon: '🔴' },
                        { label: 'Uncollected Revenue', value: ((mpo360Data.summary?.totalRevenueLcy || 0) - (mpo360Data.summary?.totalCollectionsLcy || 0)), status: 'Receivable', icon: '🟡' },
                        { label: 'Available Asset Stock', value: (mpo360Data.summary?.remainingQty || 0), status: 'On-Hand', icon: '🟢', suffix: ' Units' }
                      ].map((item, i) => (
                        <div key={i} className="flex justify-between items-center p-10 bg-slate-50/50 rounded-[2.5rem] border border-slate-50 hover:bg-white hover:shadow-2xl hover:border-slate-100 transition-all duration-500 group">
                          <div className="flex items-center gap-5">
                            <span className="text-xl">{item.icon}</span>
                            <div>
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">{item.status}</span>
                              <h6 className="text-lg font-black text-slate-900 mt-1">{item.label}</h6>
                            </div>
                          </div>
                          <span className="text-2xl font-black text-slate-900 font-mono group-hover:text-indigo-600 transition-colors">
                            {item.value.toLocaleString()}{item.suffix || ' EGP'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Items & Audit Trails Section */}
              <div className="space-y-12">
                <div className="bg-slate-900 rounded-[4rem] p-16 text-white relative overflow-hidden">
                  <div className="flex justify-between items-center mb-12">
                    <h3 className="text-3xl font-black tracking-tightest">📦 Procurement & Stock Matrix</h3>
                    <div className="px-6 py-2 bg-indigo-600 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em]">{mpo360Data.pos.length} Global Line Items</div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left whitespace-nowrap">
                      <thead className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-500 border-b border-white/5">
                        <tr>
                          <th className="px-8 py-8">Material Identity</th>
                          <th className="px-8 py-8 text-center">Qty</th>
                          <th className="px-8 py-8">Unit Value (LCY)</th>
                          <th className="px-8 py-8">Asset Exposure</th>
                          <th className="px-8 py-8 text-center">Lifecycle</th>
                        </tr>
                      </thead>
                      <tbody className="text-sm font-bold text-slate-300 divide-y divide-white/5">
                        {mpo360Data.pos.map((po, i) => (
                          <tr key={i} className="hover:bg-white/5 transition-all">
                            <td className="px-8 py-10 text-white font-black">{po.item_description}</td>
                            <td className="px-8 py-10 text-center font-mono text-lg">{Number(po.qty).toLocaleString()}</td>
                            <td className="px-8 py-10 font-mono text-indigo-400">{(po.unit_cost_after_ddp || (po.estimated_cost * (po.lcy_fx_rate || 1))).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            <td className="px-8 py-10 font-mono text-white">{(po.lcy_total || (po.qty * po.estimated_cost * (po.lcy_fx_rate || 1))).toLocaleString()}</td>
                            <td className="px-8 py-10 text-center">
                              <span className={`px-5 py-2 rounded-2xl text-[10px] font-black tracking-widest uppercase border ${po.status === 'Received' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                                {po.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Audit Traceability Timeline */}
                <div className="bg-slate-900 rounded-[4rem] p-12 text-white relative overflow-hidden">
                  <div className="absolute right-0 top-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] -mr-32 -mt-32"></div>
                  <div className="relative z-10">
                    <div className="flex justify-between items-center mb-10">
                      <h3 className="text-2xl font-black tracking-tight">🕵️ Digital Audit Trail</h3>
                      <span className="px-4 py-2 bg-white/10 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/10">Compliance Active</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {mpo360Data.audits.map((log, i) => (
                        <div key={i} className="flex gap-6 p-6 bg-white/5 rounded-3xl border border-white/5 hover:bg-white/10 transition-all group">
                          <div className="flex flex-col items-center">
                            <div className="w-3 h-3 bg-emerald-400 rounded-full shadow-[0_0_10px_rgba(52,211,153,0.5)]"></div>
                            <div className="w-[2px] h-full bg-white/10 my-2"></div>
                          </div>
                          <div>
                            <div className="flex items-center gap-3 mb-1">
                              <span className="text-xs font-black text-emerald-400 uppercase tracking-widest">{log.action_type}</span>
                              <span className="w-1 h-1 bg-white/20 rounded-full"></span>
                              <span className="text-[10px] text-slate-500">{new Date(log.created_at).toLocaleString()}</span>
                            </div>
                            <p className="text-sm font-bold text-slate-300">{log.details}</p>
                            <p className="text-[10px] text-slate-500 mt-2 font-black uppercase tracking-[0.2em]">Executed By: {log.username}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="p-12 border-t border-slate-100 bg-white/50 backdrop-blur-md flex justify-end gap-6 rounded-b-[4rem]">
              <button onClick={() => window.print()} className="px-12 py-6 bg-slate-100 text-slate-600 rounded-[2rem] font-black text-xs hover:bg-slate-200 transition-all active:scale-95 border border-slate-200">🖨️ Export Intelligence Report</button>
              <button onClick={() => setIsMPO360ModalOpen(false)} className="px-16 py-6 bg-slate-900 text-white rounded-[2rem] font-black text-xs hover:bg-slate-800 transition-all active:scale-95 shadow-2xl shadow-slate-900/30">Terminate Session</button>
            </div>
          </div>
        </div>
      )}

      {/* --- HOVER AUDIT TOOLTIP --- */}
      {hoverContext.visible && (
        <div
          className="fixed z-[11000] pointer-events-none animate-in fade-in zoom-in-95 duration-200"
          style={{ top: `${hoverContext.y}px`, left: `${hoverContext.x}px` }}
        >
          <div className="bg-slate-900/95 backdrop-blur-md text-white p-6 rounded-[2rem] shadow-2xl border border-white/20 min-w-[280px]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-emerald-500 rounded-xl flex items-center justify-center text-lg shadow-[0_0_15px_rgba(16,185,129,0.3)]">🛡️</div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-widest text-emerald-400">{hoverContext.content.title}</h4>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em]">{hoverContext.content.status}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Record ID</span>
                <span className="text-xs font-mono font-black">#{hoverContext.content.id}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-white/5">
                <span className="text-[10px] text-slate-500 font-bold uppercase">Integrity</span>
                <span className="text-xs text-emerald-400 font-black">Verified Batch</span>
              </div>
              <p className="text-[9px] text-slate-400 italic mt-2 leading-relaxed">
                "This field is immutable and synchronized across Procurement, Warehouse, and Ledger modules."
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
              <span className="text-[8px] font-black uppercase tracking-widest text-slate-500">End-to-End Encrypted Traceability</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
