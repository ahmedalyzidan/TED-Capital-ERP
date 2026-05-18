import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

export default function DirectStockIssue() {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState('issue'); // 'issue', 'return', 'invoice_list', 'customer_statement'
  
  const [customers, setCustomers] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedWarehouse, setSelectedWarehouse] = useState('مخزن الصيدليات والأدوية');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  
  // Live Searches
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [invoiceListSearch, setInvoiceListSearch] = useState('');
  const [statementSearch, setStatementSearch] = useState('');
  const [selectedStatementCustomer, setSelectedStatementCustomer] = useState('');
  const [statementInvoiceFilter, setStatementInvoiceFilter] = useState('');
  const [expandAllStatementDetails, setExpandAllStatementDetails] = useState(true);

  // Invoice / Return Items
  const [invoiceLines, setInvoiceLines] = useState([
    { key: Date.now(), inventory_id: '', item_name: '', batch_no: '', uom: '', max_qty: 0, qty: 1, buy_price: 0, unit_price: 0, total: 0 }
  ]);
  
  // Financial parameters
  const [discount, setDiscount] = useState(0);
  const [taxRate, setTaxRate] = useState(14); // VAT 14%
  const [paymentMethod, setPaymentMethod] = useState('On Account'); // 'Cash', 'Bank', 'On Account'
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  
  // 💸 Wallet & Booking & VAT Toggle States
  const [walletAction, setWalletAction] = useState('none'); // 'none', 'use_balance', 'deposit_change'
  const [walletDepositAmount, setWalletDepositAmount] = useState(0);
  const [walletPayAmount, setWalletPayAmount] = useState(0);
  const [showVat, setShowVat] = useState(true); // VAT 14% Toggle

  const getCustomerWalletBalance = (customerId) => {
    if (!customerId) return 0;
    const stored = localStorage.getItem(`customer_wallet_${customerId}`);
    if (stored) return Number(stored);
    // Fallback persistent seed balance:
    const seed = (parseInt(customerId) * 230 + 450) % 2500;
    localStorage.setItem(`customer_wallet_${customerId}`, seed);
    return seed;
  };

  const updateCustomerWalletBalance = (customerId, amountDiff) => {
    if (!customerId) return;
    const current = getCustomerWalletBalance(customerId);
    const newBal = Math.max(0, current + amountDiff);
    localStorage.setItem(`customer_wallet_${customerId}`, newBal);
  };
  
  // Reports Data
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [salesRecords, setSalesRecords] = useState([]);

  // Invoice / Credit Note Modal Overlay
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [activeInvoiceData, setActiveInvoiceData] = useState(null);

  // 1. Fetch data on load and when mode switches
  useEffect(() => {
    fetchInitialData();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === 'invoice_list' || activeTab === 'customer_statement') {
      fetchReportsData();
    }
  }, [activeTab]);

  const fetchInitialData = async () => {
    try {
      const [custRes, invRes, whRes] = await Promise.all([
        api.get('/dynamic/table/customers?limit=500').catch(() => ({ data: { data: [] } })),
        api.get('/dynamic/table/inventory_items?limit=1000').catch(() => ({ data: { data: [] } })),
        api.get('/dynamic/table/warehouses?limit=100').catch(() => ({ data: { data: [] } }))
      ]);
      setCustomers(custRes.data?.data || []);
      
      const rawItems = invRes.data?.data || [];
      // Filter only medical and pharmacy stock
      let pharmaItems = rawItems.filter(i => 
        i.category === 'PHARMA' || 
        i.warehouse === 'مخزن الصيدليات والأدوية' || 
        i.item_name?.includes('دواء') || 
        i.item_name?.includes('حقن') || 
        i.item_name?.includes('أقراص') || 
        i.item_name?.includes('فيال')
      );

      // Seed stunning initial mock data if no pharma items exist yet
      if (pharmaItems.length === 0) {
        const mockPharma = [
          {
            id: 9001,
            item_name: 'بانادول إكسترا 500 مجم (Panadol Extra)',
            active_substance: 'Paracetamol 500mg + Caffeine 65mg',
            dosage_form: 'أقراص (Tablets)',
            pharma_category: 'OTC',
            storage_temp: '20-25°C (غرفة)',
            quantity: 1500,
            remaining_qty: 1420,
            unit_cost: 45,
            buy_price: 45,
            batch_no: 'PH-2026-A10',
            expiry_date: '2028-05-20',
            supplier: 'شركة جلاكسو سميث كلاين (GSK)',
            min_stock_level: 100,
            uom: 'علبة',
            warehouse: 'مخزن الصيدليات والأدوية'
          },
          {
            id: 9002,
            item_name: 'أوجمينتين 1 جم (Augmentin 1g)',
            active_substance: 'Amoxicillin 875mg + Clavulanic Acid 125mg',
            dosage_form: 'أقراص (Tablets)',
            pharma_category: 'OTC',
            storage_temp: '20-25°C (غرفة)',
            quantity: 600,
            remaining_qty: 510,
            unit_cost: 130,
            buy_price: 130,
            batch_no: 'PH-2026-B88',
            expiry_date: '2027-11-15',
            supplier: 'شركة إيفا فارما',
            min_stock_level: 50,
            uom: 'علبة',
            warehouse: 'مخزن الصيدليات والأدوية'
          },
          {
            id: 9003,
            item_name: 'مورفين فيال 10 مجم (Morphine Vials)',
            active_substance: 'Morphine Sulfate 10mg/ml',
            dosage_form: 'حقن فيال (Vials)',
            pharma_category: 'CONTROLLED',
            storage_temp: '20-25°C (قفل أمني)',
            quantity: 50,
            remaining_qty: 45,
            unit_cost: 350,
            buy_price: 350,
            batch_no: 'NAR-2026-X01',
            expiry_date: '2027-02-01',
            supplier: 'هيئة الشراء الموحد (مراقبة)',
            min_stock_level: 10,
            uom: 'فيال',
            warehouse: 'مخزن الصيدليات والأدوية'
          },
          {
            id: 9004,
            item_name: 'أنسولين لانتوس فيال (Lantus Insulin)',
            active_substance: 'Insulin Glargine 100 IU/ml',
            dosage_form: 'حقن فيال (Vials)',
            pharma_category: 'COLD_CHAIN',
            storage_temp: '2-8°C (ثلاجة)',
            quantity: 200,
            remaining_qty: 185,
            unit_cost: 280,
            buy_price: 280,
            batch_no: 'COLD-2026-99',
            expiry_date: '2026-12-10',
            supplier: 'شركة سانوفي (Sanofi)',
            min_stock_level: 30,
            uom: 'فيال',
            warehouse: 'مخزن الصيدليات والأدوية'
          },
          {
            id: 9005,
            item_name: 'محلول ملح 0.9% (Normal Saline 500ml)',
            active_substance: 'Sodium Chloride 0.9%',
            dosage_form: 'محلول وريدي (IV Infusion)',
            pharma_category: 'CONSUMABLE',
            storage_temp: '20-25°C (غرفة)',
            quantity: 3000,
            remaining_qty: 2650,
            unit_cost: 25,
            buy_price: 25,
            batch_no: 'NS-2026-777',
            expiry_date: '2029-01-01',
            supplier: 'شركة النيل للأدوية',
            min_stock_level: 500,
            uom: 'عبوة',
            warehouse: 'مخزن الصيدليات والأدوية'
          }
        ];
        pharmaItems = mockPharma;
      } else {
        pharmaItems = pharmaItems.map(item => {
          const meta = item.metadata || {};
          return {
            ...item,
            active_substance: meta.active_substance || item.item_description || 'مادة فعالة قياسية',
            dosage_form: meta.dosage_form || item.unit || 'أقراص / عبوة',
            pharma_category: meta.pharma_category || (item.item_name?.includes('مورفين') ? 'CONTROLLED' : item.item_name?.includes('أنسولين') ? 'COLD_CHAIN' : 'OTC'),
            storage_temp: meta.storage_temp || (item.item_name?.includes('أنسولين') ? '2-8°C (ثلاجة)' : '20-25°C (غرفة)'),
            remaining_qty: Number(item.remaining_qty || item.quantity || 0),
            unit_cost: Number(item.unit_cost || item.buy_price || 50),
            buy_price: Number(item.unit_cost || item.buy_price || 50),
            batch_no: item.batch_no || item.batch_number || 'PH-BATCH-001',
            expiry_date: item.expiry_date || '2027-12-31',
            uom: item.uom || item.unit || 'علبة'
          };
        });
      }

      setInventoryItems(pharmaItems);
      setWarehouses(whRes.data?.data || []);
    } catch (err) {
      console.error("Error fetching direct issue/return dependencies", err);
    }
  };

  const fetchReportsData = async () => {
    try {
      const [ledgerRes, salesRes] = await Promise.all([
        api.get('/dynamic/table/ledger?limit=2000').catch(() => ({ data: { data: [] } })),
        api.get('/dynamic/table/inventory_sales?limit=2000').catch(() => ({ data: { data: [] } }))
      ]);
      setLedgerEntries(ledgerRes.data?.data || []);
      setSalesRecords(salesRes.data?.data || []);
    } catch (err) {
      console.error("Error fetching reports data", err);
    }
  };

  // Switch modes cleanly
  const handleModeSwitch = (mode) => {
    setActiveTab(mode);
    setInvoiceLines([{ key: Date.now(), inventory_id: '', item_name: '', batch_no: '', uom: '', max_qty: mode === 'issue' ? 0 : 999999, qty: 1, buy_price: 0, unit_price: 0, total: 0 }]);
    setDiscount(0);
    setSelectedCustomer('');
    setSuccessMsg('');
    setCustomerSearchQuery('');
    setItemSearchQuery('');
  };

  // 2. Handle adding/removing lines
  const addInvoiceLine = () => {
    const maxQtyLimit = activeTab === 'issue' ? 0 : 999999;
    setInvoiceLines([
      ...invoiceLines,
      { key: Date.now(), inventory_id: '', item_name: '', batch_no: '', uom: '', max_qty: maxQtyLimit, qty: 1, buy_price: 0, unit_price: 0, total: 0 }
    ]);
  };

  const removeInvoiceLine = (key) => {
    if (invoiceLines.length === 1) return;
    setInvoiceLines(invoiceLines.filter(line => line.key !== key));
  };

  // 3. Update specific line state
  const handleLineChange = (key, field, value) => {
    const updated = invoiceLines.map(line => {
      if (line.key === key) {
        let updatedLine = { ...line, [field]: value };
        
        if (field === 'inventory_id') {
          const selectedItem = inventoryItems.find(item => item.id === parseInt(value));
          if (selectedItem) {
            updatedLine.item_name = selectedItem.item_name;
            updatedLine.batch_no = selectedItem.batch_no || 'N/A';
            updatedLine.uom = selectedItem.uom || 'علبة';
            updatedLine.max_qty = activeTab === 'issue' ? Number(selectedItem.remaining_qty || 0) : 999999;
            updatedLine.buy_price = Number(selectedItem.unit_cost || selectedItem.buy_price || selectedItem.avg_cost || 0);
            
            // Mark up sale price (default markup of 20% on purchase price)
            updatedLine.unit_price = Number(updatedLine.buy_price * 1.2).toFixed(2);
            updatedLine.qty = 1;
          }
        }

        // Recalculate line total
        updatedLine.total = Number(updatedLine.qty * updatedLine.unit_price).toFixed(2);
        return updatedLine;
      }
      return line;
    });
    setInvoiceLines(updated);
  };

  // 4. Financial calculations
  const calculateTotals = () => {
    const subtotal = invoiceLines.reduce((sum, line) => sum + Number(line.total || 0), 0);
    const taxAmount = showVat ? Number(subtotal * (taxRate / 100)) : 0;
    const grandTotal = Number(subtotal + taxAmount - Number(discount || 0));
    const totalCOGS = invoiceLines.reduce((sum, line) => sum + Number(line.qty * line.buy_price), 0);
    
    return {
      subtotal: subtotal.toFixed(2),
      taxAmount: taxAmount.toFixed(2),
      grandTotal: grandTotal > 0 ? grandTotal.toFixed(2) : '0.00',
      totalCOGS: totalCOGS.toFixed(2)
    };
  };

  const totals = calculateTotals();

  // 5. Submit transaction
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Smart OTC defaulting: On Account requires customer, Cash/Bank/Booking doesn't!
    if (!selectedCustomer && paymentMethod === 'On Account') {
      alert("الرجاء اختيار العميل أولاً (حيث أن طريقة الدفع بالآجل).");
      return;
    }
    
    if (invoiceLines.some(line => !line.inventory_id || line.qty <= 0)) {
      alert("الرجاء اختيار الأصناف وتحديد كميات أكبر من الصفر.");
      return;
    }
    
    if (activeTab === 'issue' && invoiceLines.some(line => line.qty > line.max_qty)) {
      alert("إحدى الكميات المطلوبة تتجاوز الرصيد المتاح بالمخزن!");
      return;
    }

    setIsSubmitting(true);
    setSuccessMsg('');

    try {
      const custObj = customers.find(c => c.id === parseInt(selectedCustomer));
      const customerName = custObj?.name || 'عميل مباشر';
      const docNoSuffix = Date.now().toString().slice(-6);
      const isBooking = paymentMethod === 'Booking';
      
      const documentNo = activeTab === 'issue' 
        ? (isBooking ? `BKG-${docNoSuffix}` : `INV-${docNoSuffix}`) 
        : `RTN-${docNoSuffix}`;

      // A. Perform inventory updates and log sales/returns in loop
      for (const line of invoiceLines) {
        const item = inventoryItems.find(i => i.id === parseInt(line.inventory_id));
        const qtyDiff = activeTab === 'issue' ? -Number(line.qty) : Number(line.qty);
        const newRemainingQty = Number(item.remaining_qty || 0) + qtyDiff;
        
        // 1. Update remaining quantity in database
        await api.put(`/dynamic/update/inventory_items/${line.inventory_id}`, {
          remaining_qty: newRemainingQty
        });

        // 2. Log sale or return transaction record
        await api.post('/dynamic/add/inventory_sales', {
          inventory_id: line.inventory_id,
          date: invoiceDate,
          customer_name: customerName,
          project_name: activeTab === 'issue' ? (isBooking ? 'حجز بضاعة مؤقت' : 'صرف مخزني مباشر') : 'مرتجع صرف مباشر',
          item_name: line.item_name,
          qty: qtyDiff,
          buy_price: line.buy_price,
          sell_price: line.unit_price,
          reference_no: documentNo,
          batch_no: line.batch_no || '',
          uom: line.uom || '',
          created_by: 'Admin'
        });
      }

      // B. Create balanced General Ledger postings
      const targetAccount = isBooking
        ? 'عملاء حجز - أرصدة معلقة'
        : paymentMethod === 'Cash' 
          ? 'صندوق نقدية - تيد كابيتال' 
          : paymentMethod === 'Bank' 
            ? 'بنك CIB - تيد كابيتال' 
            : 'عملاء (حسابات مدينة - AR)';

      if (activeTab === 'issue') {
        // --- SALE/ISSUE POSTINGS ---
        
        if (isBooking) {
          // --- BOOKING / RESERVATION LEDGER ENTRIES (IFRS 15) ---
          // 1. Debit Pending Booking Customer
          await api.post('/dynamic/add/ledger', {
            date: invoiceDate,
            account_name: 'عملاء حجز - أرصدة معلقة',
            debit: Number(totals.grandTotal),
            credit: 0,
            description: `حجز بضاعة مؤقت معلق رقم ${documentNo} - للعميل: ${customerName}`,
            cost_center: 'حجز بضاعة معلق'
          });

          // 2. Credit Deferred Booking Revenue
          await api.post('/dynamic/add/ledger', {
            date: invoiceDate,
            account_name: 'إيرادات حجز مؤجلة',
            debit: 0,
            credit: Number(totals.subtotal),
            description: `إيراد حجز مؤجل للفاتورة رقم ${documentNo} - للعميل: ${customerName}`,
            cost_center: 'حجز بضاعة معلق'
          });

          // 3. VAT (if any)
          if (Number(totals.taxAmount) > 0) {
            await api.post('/dynamic/add/ledger', {
              date: invoiceDate,
              account_name: 'ضريبة القيمة المضافة',
              debit: 0,
              credit: Number(totals.taxAmount),
              description: `ضريبة مخرجات مؤجلة للفاتورة رقم ${documentNo} - للعميل: ${customerName}`,
              cost_center: 'حجز بضاعة معلق'
            });
          }

          // 4. Debit Reserved Stock Asset (still owned by company)
          await api.post('/dynamic/add/ledger', {
            date: invoiceDate,
            account_name: 'بضاعة محجوزة لدى المستودع',
            debit: Number(totals.totalCOGS),
            credit: 0,
            description: `بضاعة محجوزة لدى المستودع للفاتورة رقم ${documentNo} - للعميل: ${customerName}`,
            cost_center: 'حجز بضاعة معلق'
          });

          // 5. Credit main inventory
          await api.post('/dynamic/add/ledger', {
            date: invoiceDate,
            account_name: 'مخزون خامات ومواد',
            debit: 0,
            credit: Number(totals.totalCOGS),
            description: `تخفيض المخزون للصنف المحجوز رقم ${documentNo} - للعميل: ${customerName}`,
            cost_center: 'حجز بضاعة معلق'
          });

        } else {
          // --- STANDARD INVOICE SALE ---
          
          // 1. Handle Wallet Payments & Deposits
          if (walletAction === 'use_balance' && selectedCustomer && walletPayAmount > 0) {
            // Debit customer wallet for the paid portion
            await api.post('/dynamic/add/ledger', {
              date: invoiceDate,
              account_name: 'محفظة العملاء (أرصدة مسبقة الدفع)',
              debit: walletPayAmount,
              credit: 0,
              description: `سداد من محفظة العميل للفاتورة رقم ${documentNo} - للعميل: ${customerName}`,
              cost_center: 'صرف مخزني مباشر'
            });
            
            // Debit remainder to cash/bank/AR
            const remainder = Number(totals.grandTotal) - walletPayAmount;
            if (remainder > 0) {
              await api.post('/dynamic/add/ledger', {
                date: invoiceDate,
                account_name: targetAccount,
                debit: remainder,
                credit: 0,
                description: `سداد باقي الفاتورة رقم ${documentNo} - للعميل: ${customerName}`,
                cost_center: 'صرف مخزني مباشر'
              });
            }
            // Update wallet balance in localStorage
            updateCustomerWalletBalance(selectedCustomer, -walletPayAmount);
            
          } else if (walletAction === 'deposit_change' && selectedCustomer && walletDepositAmount > 0) {
            // Debit target cash/bank account for total cash received (Grand Total + Deposit)
            await api.post('/dynamic/add/ledger', {
              date: invoiceDate,
              account_name: targetAccount,
              debit: Number(totals.grandTotal) + walletDepositAmount,
              credit: 0,
              description: `استلام نقدية شاملة إيداع المحفظة للفاتورة رقم ${documentNo} - للعميل: ${customerName}`,
              cost_center: 'صرف مخزني مباشر'
            });

            // Credit Customer Wallet for the deposited amount
            await api.post('/dynamic/add/ledger', {
              date: invoiceDate,
              account_name: 'محفظة العملاء (أرصدة مسبقة الدفع)',
              debit: 0,
              credit: walletDepositAmount,
              description: `إيداع مالي في محفظة العميل للفاتورة رقم ${documentNo} - للعميل: ${customerName}`,
              cost_center: 'صرف مخزني مباشر'
            });
            // Update wallet balance in localStorage
            updateCustomerWalletBalance(selectedCustomer, walletDepositAmount);
            
          } else {
            // Standard Cash/Bank/AR Debit
            await api.post('/dynamic/add/ledger', {
              date: invoiceDate,
              account_name: targetAccount,
              debit: Number(totals.grandTotal),
              credit: 0,
              description: `فاتورة صرف مخزني مباشر رقم ${documentNo} - للعميل: ${customerName}`,
              cost_center: 'صرف مخزني مباشر'
            });
          }

          // 2. Credit Sales Revenue (Subtotal)
          await api.post('/dynamic/add/ledger', {
            date: invoiceDate,
            account_name: 'إيرادات مبيعات',
            debit: 0,
            credit: Number(totals.subtotal),
            description: `إيراد فاتورة صرف مباشر - للعميل: ${customerName}`,
            cost_center: 'صرف مخزني مباشر'
          });

          // 3. Credit VAT Payable (14%)
          if (Number(totals.taxAmount) > 0) {
            await api.post('/dynamic/add/ledger', {
              date: invoiceDate,
              account_name: 'ضريبة القيمة المضافة',
              debit: 0,
              credit: Number(totals.taxAmount),
              description: `ضريبة مخرجات قيمة مضافة فاتورة صرف مباشر - للعميل: ${customerName}`,
              cost_center: 'صرف مخزني مباشر'
            });
          }

          // 4. Debit Cost of Goods Sold (COGS)
          await api.post('/dynamic/add/ledger', {
            date: invoiceDate,
            account_name: 'تكلفة خامات ومواد (منصرف)',
            debit: Number(totals.totalCOGS),
            credit: 0,
            description: `تكلفة البضاعة المنصرفة فاتورة صرف مباشر - للعميل: ${customerName}`,
            cost_center: 'صرف مخزني مباشر'
          });

          // 5. Credit Inventory Asset
          await api.post('/dynamic/add/ledger', {
            date: invoiceDate,
            account_name: 'مخزون خامات ومواد',
            debit: 0,
            credit: Number(totals.totalCOGS),
            description: `تخفيض قيمة المخزون المنصرف فاتورة صرف مباشر - للعميل: ${customerName}`,
            cost_center: 'صرف مخزني مباشر'
          });
        }

      } else {
        // --- RETURN POSTINGS (Perfect Reverse) ---
        
        // If we are reversing a transaction that deposited to/used the wallet:
        if (selectedCustomer && (walletAction === 'use_balance' || walletAction === 'deposit_change')) {
          // If they used the wallet, we return it to the wallet!
          const walletRefund = Number(totals.grandTotal);
          await api.post('/dynamic/add/ledger', {
            date: invoiceDate,
            account_name: 'محفظة العملاء (أرصدة مسبقة الدفع)',
            debit: 0,
            credit: walletRefund,
            description: `رد قيمة المرتجع لمحفظة العميل رقم ${documentNo} - من العميل: ${customerName}`,
            cost_center: 'صرف مخزني مباشر'
          });
          updateCustomerWalletBalance(selectedCustomer, walletRefund);
        } else {
          // Standard cash/AR/Bank refund
          await api.post('/dynamic/add/ledger', {
            date: invoiceDate,
            account_name: targetAccount,
            debit: 0,
            credit: Number(totals.grandTotal),
            description: `إرجاع قيمة فاتورة صرف مباشر رقم ${documentNo} - للعميل: ${customerName}`,
            cost_center: 'صرف مخزني مباشر'
          });
        }

        // 1. Debit Sales Returns (Subtotal returned)
        await api.post('/dynamic/add/ledger', {
          date: invoiceDate,
          account_name: 'مرتجع مبيعات خامات ومواد',
          debit: Number(totals.subtotal),
          credit: 0,
          description: `مرتجع مبيعات وصرف مباشر رقم ${documentNo} - من العميل: ${customerName}`,
          cost_center: 'صرف مخزني مباشر'
        });

        // 2. Debit VAT Payable (Tax Amount reverse)
        if (Number(totals.taxAmount) > 0) {
          await api.post('/dynamic/add/ledger', {
            date: invoiceDate,
            account_name: 'ضريبة القيمة المضافة',
            debit: Number(totals.taxAmount),
            credit: 0,
            description: `تسوية ضريبة مبيعات مرتجعة فاتورة صرف مباشر - للعميل: ${customerName}`,
            cost_center: 'صرف مخزني مباشر'
          });
        }

        // 4. Debit Inventory Asset (Re-entry of stock at cost)
        await api.post('/dynamic/add/ledger', {
          date: invoiceDate,
          account_name: 'مخزون خامات ومواد',
          debit: Number(totals.totalCOGS),
          credit: 0,
          description: `إعادة إدخال خامات مرتجعة للمخزن فاتورة مباشر - للعميل: ${customerName}`,
          cost_center: 'صرف مخزني مباشر'
        });

        // 5. Credit Cost of Goods Sold (COGS reverse)
        await api.post('/dynamic/add/ledger', {
          date: invoiceDate,
          account_name: 'تكلفة خامات ومواد (منصرف)',
          debit: 0,
          credit: Number(totals.totalCOGS),
          description: `تخفيض تكلفة المبيعات بالمرتجع فاتورة صرف مباشر - للعميل: ${customerName}`,
          cost_center: 'صرف مخزني مباشر'
        });
      }

      // C. Pop up generated Document / Invoice details
      setActiveInvoiceData({
        type: isBooking ? 'booking' : activeTab,
        invoiceNo: documentNo,
        date: invoiceDate,
        customerName: customerName,
        warehouse: selectedWarehouse,
        paymentMethod: isBooking 
          ? 'حجز مؤقت / معلق' 
          : paymentMethod === 'Cash' 
            ? 'نقدي / صندوق' 
            : paymentMethod === 'Bank' 
              ? 'بنكي / شيك' 
              : 'آجل / على الحساب',
        lines: invoiceLines.map(line => ({ ...line })),
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        discount: discount,
        grandTotal: totals.grandTotal
      });
      setShowInvoiceModal(true);

      const opMsg = activeTab === 'issue' 
        ? (isBooking ? 'تم بنجاح حجز الأصناف وتوليد وثيقة الحجز المؤقت في المستودع والميزانية!' : 'تم بنجاح صرف الكميات وتوليد فاتورة المبيعات وإصدار القيود المحاسبية التلقائية بالكامل!')
        : 'تم بنجاح استلام المرتجع وتعديل أرصدة المستودع وعكس القيد المزدوج بالكامل!';
      setSuccessMsg(`🎉 ${opMsg}`);
      
      // Reset form fields
      setInvoiceLines([{ key: Date.now(), inventory_id: '', item_name: '', batch_no: '', uom: '', max_qty: activeTab === 'issue' ? 0 : 999999, qty: 1, buy_price: 0, unit_price: 0, total: 0 }]);
      setDiscount(0);
      setSelectedCustomer('');
      setWalletAction('none');
      setWalletPayAmount(0);
      setWalletDepositAmount(0);
      fetchInitialData(); // refresh stock balances
    } catch (err) {
      console.error(err);
      alert("حدث خطأ أثناء معالجة عملية الصرف/المرتجع المباشر.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Group ledger entries by invoice/return
  const parseLedgerInvoice = (entry) => {
    const desc = entry.description || '';
    let docType = 'issue';
    let docNo = '';
    let customer = '';
    
    const invMatch = desc.match(/INV-\d+/);
    const rtnMatch = desc.match(/RTN-\d+/);
    
    if (invMatch) {
      docNo = invMatch[0];
      docType = 'issue';
    } else if (rtnMatch) {
      docNo = rtnMatch[0];
      docType = 'return';
    } else {
      return null;
    }
    
    const custMatch = desc.match(/للعميل:\s*([^-]+)/) || desc.match(/من العميل:\s*([^-]+)/);
    if (custMatch) {
      customer = custMatch[1].trim();
    } else {
      customer = 'عميل مباشر';
    }
    
    return {
      id: entry.id,
      date: (entry.date || entry.created_at || new Date().toISOString())?.split('T')[0],
      docNo,
      docType,
      customer,
      grandTotal: entry.debit > 0 ? entry.debit : entry.credit,
      ledgerEntry: entry
    };
  };

  const isIssue = activeTab === 'issue';
  const headerGradient = activeTab === 'issue' 
    ? 'from-slate-900 via-indigo-950 to-slate-900' 
    : activeTab === 'return'
      ? 'from-slate-900 via-amber-950 to-slate-900'
      : activeTab === 'invoice_list'
        ? 'from-slate-900 via-slate-950 to-slate-900'
        : 'from-slate-900 via-emerald-950 to-slate-900';

  const focusBorderClass = activeTab === 'issue' ? 'focus:border-indigo-500' : 'focus:border-amber-500';
  const btnAccentClass = activeTab === 'issue' 
    ? 'bg-slate-900 hover:bg-indigo-600 shadow-indigo-600/30' 
    : 'bg-amber-800 hover:bg-amber-600 shadow-amber-600/30';
  const accentBadgeBg = activeTab === 'issue' 
    ? 'bg-indigo-500/30 text-indigo-300' 
    : activeTab === 'return'
      ? 'bg-amber-500/30 text-amber-300'
      : activeTab === 'invoice_list'
        ? 'bg-slate-500/30 text-slate-300'
        : 'bg-emerald-500/30 text-emerald-300';

  // Filters
  const filteredCustomers = customers.filter(c => 
    c.name?.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
    c.company_name?.toLowerCase().includes(customerSearchQuery.toLowerCase())
  );

  // 🔗 2-Way Dynamic Field Linking & Auto-Selection (Declared after filteredCustomers)
  useEffect(() => {
    if (customerSearchQuery === '') {
      setSelectedCustomer('');
      setSelectedStatementCustomer('');
    }
  }, [customerSearchQuery]);

  useEffect(() => {
    if (customerSearchQuery && filteredCustomers.length === 1) {
      const singleCust = filteredCustomers[0];
      if (activeTab === 'customer_statement') {
        if (selectedStatementCustomer !== singleCust.name) {
          setSelectedStatementCustomer(singleCust.name);
        }
      } else {
        if (selectedCustomer !== String(singleCust.id)) {
          setSelectedCustomer(String(singleCust.id));
        }
      }
    }
  }, [customerSearchQuery, filteredCustomers, activeTab, selectedCustomer, selectedStatementCustomer]);

  const filteredInventoryItems = inventoryItems.filter(i => 
    i.item_name?.toLowerCase().includes(itemSearchQuery.toLowerCase()) ||
    (i.batch_no && i.batch_no.toLowerCase().includes(itemSearchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-10" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      
      {/* MODE SWITCHER TABS (4 Strategic Tabs) */}
      <div className="flex flex-wrap bg-slate-100 p-1.5 rounded-2xl max-w-4xl border border-slate-200/60 shadow-inner gap-1.5 no-print">
        <button
          type="button"
          onClick={() => handleModeSwitch('issue')}
          className={`flex-1 min-w-[150px] py-3 text-xs font-black rounded-xl transition-all duration-300 flex items-center justify-center gap-2 ${activeTab === 'issue' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'}`}
        >
          <span>🚚</span> {language === 'ar' ? 'صرف مباشر ومبيعات' : 'Direct Stock Issue'}
        </button>
        <button
          type="button"
          onClick={() => handleModeSwitch('return')}
          className={`flex-1 min-w-[150px] py-3 text-xs font-black rounded-xl transition-all duration-300 flex items-center justify-center gap-2 ${activeTab === 'return' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'}`}
        >
          <span>🔄</span> {language === 'ar' ? 'مرتجع صرف ومبيعات' : 'Direct Returns'}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('invoice_list')}
          className={`flex-1 min-w-[150px] py-3 text-xs font-black rounded-xl transition-all duration-300 flex items-center justify-center gap-2 ${activeTab === 'invoice_list' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'}`}
        >
          <span>📊</span> {language === 'ar' ? 'قائمة فواتير العملاء' : 'Invoice Records'}
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('customer_statement');
            setCustomerSearchQuery('');
            setSelectedStatementCustomer('');
          }}
          className={`flex-1 min-w-[150px] py-3 text-xs font-black rounded-xl transition-all duration-300 flex items-center justify-center gap-2 ${activeTab === 'customer_statement' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-600 hover:text-slate-900'}`}
        >
          <span>📁</span> {language === 'ar' ? 'كشف حساب عميل' : 'Customer Statements'}
        </button>
      </div>

      {/* HEADER SECTION */}
      <div className={`relative rounded-[2.5rem] bg-gradient-to-r ${headerGradient} p-8 lg:p-12 text-white shadow-2xl overflow-hidden transition-all duration-500 no-print`}>
        <div className={`absolute top-0 right-0 w-80 h-80 ${activeTab === 'issue' ? 'bg-indigo-500/10' : activeTab === 'return' ? 'bg-amber-500/10' : 'bg-emerald-500/10'} rounded-full blur-3xl`}></div>
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <span className={`px-4 py-1.5 border border-white/10 rounded-full text-xs font-bold tracking-wide uppercase transition-colors ${accentBadgeBg}`}>
              {activeTab === 'issue' && (language === 'ar' ? '📦 إدارة المخزون والمبيعات المباشرة' : '📦 Stock Control & Direct Sales')}
              {activeTab === 'return' && (language === 'ar' ? '🔄 إدارة مرتجعات الصرف والمبيعات' : '🔄 Direct Sales & Stock Returns')}
              {activeTab === 'invoice_list' && (language === 'ar' ? '📊 أرشيف الفواتير المباشرة' : '📊 Direct Invoices Archive')}
              {activeTab === 'customer_statement' && (language === 'ar' ? '📁 كشوفات الحساب والمديونيات' : '📁 Customer Ledger Statements')}
            </span>
            <h1 className="text-3xl lg:text-4xl font-black mt-4 tracking-tight">
              {activeTab === 'issue' && (language === 'ar' ? '🚚 صرف مخزني ومبيعات مباشرة' : '🚚 Direct Stock Issue & Sales')}
              {activeTab === 'return' && (language === 'ar' ? '🔄 مرتجع صرف ومبيعات مباشرة' : '🔄 Direct Stock Returns & Sales')}
              {activeTab === 'invoice_list' && (language === 'ar' ? '📊 قائمة الفواتير المصدرة' : '📊 Exported Invoices Archive')}
              {activeTab === 'customer_statement' && (language === 'ar' ? '📁 كشف حساب العميل المالي' : '📁 Customer Financial Statements')}
            </h1>
            <p className="text-slate-400 text-sm mt-2 max-w-xl font-medium leading-relaxed">
              {activeTab === 'issue' && (language === 'ar' 
                ? 'إصدار مستندات صرف خامات وبضائع من المستودعات لعملاء مباشرين بدون التقيد بمشروع محدد. يقوم النظام تلقائياً بتوليد قيد مزدوج متكامل وتخفيض الكميات فوراً.' 
                : 'Issue materials and goods from warehouses to direct customers without being restricted to a project. The system automatically creates a full double-entry ledger record and updates stock instantly.')}
              {activeTab === 'return' && (language === 'ar' 
                ? 'تسجيل مرتجعات بضائع وخامات مباشرة من العملاء وإعادتها للمستودع المحدد. يقوم النظام تلقائياً بزيادة الكميات وعكس القيد المزدوج المالي.' 
                : 'Record direct returns of goods and materials from customers back to the designated warehouse. The system increases stock and fully reverses the financial double-entry.')}
              {activeTab === 'invoice_list' && (language === 'ar' 
                ? 'أرشيف ذكي لعرض وتدقيق وإعادة طباعة فواتير المبيعات الصادرة والإشعارات الدائنة لكل العملاء.' 
                : 'Smart archive to view, audit, and reprint issued sales invoices and credit notes for all customers.')}
              {activeTab === 'customer_statement' && (language === 'ar' 
                ? 'كشف تفصيلي يجمع كل الحركات المالية والمديونيات وأرصدة العملاء التراكمية، متوافق مع معايير IFRS.' 
                : 'Detailed ledger statement compiling all financial transactions, outstanding debts, and cumulative customer balances, compliant with IFRS standards.')}
            </p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md">
            <span className="text-xs text-slate-400 block mb-1">{language === 'ar' ? 'الرصيد الكلي للأصناف النشطة' : 'Total Active Stock Balance'}</span>
            <span className={`text-3xl font-black tracking-tighter ${activeTab === 'issue' ? 'text-emerald-400' : 'text-amber-400'}`}>
              {inventoryItems.reduce((sum, i) => sum + Number(i.remaining_qty || 0), 0).toLocaleString()} <span className="text-xs text-slate-300 font-medium">{language === 'ar' ? 'وحدة' : 'Units'}</span>
            </span>
          </div>
        </div>
      </div>

      {successMsg && (
        <div className={`p-6 border font-black rounded-3xl text-sm animate-pulse no-print ${activeTab === 'issue' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'}`}>
          {successMsg}
        </div>
      )}

      {/* TAB CONTENTS */}
      {(activeTab === 'issue' || activeTab === 'return') && (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 xl:grid-cols-3 gap-8 no-print animate-in fade-in duration-300">
          
          {/* LEFT COLUMN: Customer and Items Grid */}
          <div className="xl:col-span-2 space-y-8">
            
            {/* Section 1: Customer & Logistics info */}
            <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm space-y-6">
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-3">
                <span>👤</span> {activeTab === 'issue' ? (language === 'ar' ? 'بيانات العميل واللوجستيات' : 'Customer & Logistics Details') : (language === 'ar' ? 'بيانات العميل المرجع والمخزن' : 'Return Client & Store Details')}
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Select Customer + Live Search */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-black text-slate-500">{activeTab === 'issue' ? (language === 'ar' ? 'العميل المستلم *' : 'Receiving Customer *') : (language === 'ar' ? 'العميل المرجع *' : 'Return Customer *')}</label>
                  <div className="flex flex-col gap-2">
                    <input
                      type="text"
                      placeholder={language === 'ar' ? '🔍 ابحث عن عميل...' : '🔍 Search client...'}
                      value={customerSearchQuery}
                      onChange={e => setCustomerSearchQuery(e.target.value)}
                      className={`p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white outline-none transition-all ${focusBorderClass}`}
                    />
                    <select
                      required
                      value={selectedCustomer || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedCustomer(val);
                        if (val) {
                          const found = customers.find(c => String(c.id) === val);
                          if (found) setCustomerSearchQuery(found.name);
                        }
                      }}
                      className={`w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-800 outline-none focus:bg-white transition-all ${focusBorderClass}`}
                    >
                      <option value="">{activeTab === 'issue' ? (language === 'ar' ? '-- اختر العميل --' : '-- Select Customer --') : (language === 'ar' ? '-- اختر العميل المرجع --' : '-- Select Return Customer --')}</option>
                      {filteredCustomers.map(c => (
                        <option key={c.id} value={c.id}>{c.name} {c.company_name ? `(${c.company_name})` : ''}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Target Warehouse */}
                <div className="flex flex-col gap-2 justify-end">
                  <label className="text-xs font-black text-slate-500">{activeTab === 'issue' ? (language === 'ar' ? 'المخزن المصدر *' : 'Source Warehouse *') : (language === 'ar' ? 'مخزن استلام المرتجع *' : 'Receiving Warehouse *')}</label>
                  <select
                    required
                    value={selectedWarehouse}
                    onChange={(e) => setSelectedWarehouse(e.target.value)}
                    className={`w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm font-bold text-slate-800 outline-none focus:bg-white transition-all ${focusBorderClass}`}
                  >
                    {warehouses.map(w => (
                      <option key={w.id} value={w.name}>{w.name}</option>
                    ))}
                    {warehouses.length === 0 && <option value="Main Store">{language === 'ar' ? 'المخزن الرئيسي' : 'Main Warehouse'}</option>}
                  </select>
                </div>

                {/* Document Date */}
                <div className="flex flex-col gap-2 justify-end">
                  <label className="text-xs font-black text-slate-500">{language === 'ar' ? 'تاريخ المعاملة *' : 'Transaction Date *'}</label>
                  <input
                    type="date"
                    required
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                    className={`w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm font-bold text-slate-800 outline-none focus:bg-white transition-all ${focusBorderClass}`}
                  />
                </div>

              </div>
            </div>

            {/* Section 2: Interactive Grid */}
            <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-4">
                <h2 className="text-lg font-black text-slate-800 flex items-center gap-3">
                  <span>📋</span> {activeTab === 'issue' ? (language === 'ar' ? 'جدول الأصناف والكميات المطلوبة' : 'Items & Quantities Table') : (language === 'ar' ? 'جدول مرتجع الأصناف والكميات المعادة' : 'Returned Items & Quantities Table')}
                </h2>
                <div className="flex flex-wrap gap-3 w-full md:w-auto">
                  <input
                    type="text"
                    placeholder={language === 'ar' ? '🔍 ابحث عن صنف أو باتش بالاسم...' : '🔍 Search item or batch...'}
                    value={itemSearchQuery}
                    onChange={e => setItemSearchQuery(e.target.value)}
                    className={`p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white outline-none transition-all ${focusBorderClass} w-48`}
                  />
                  <button
                    type="button"
                    onClick={addInvoiceLine}
                    className={`px-5 py-2.5 rounded-xl font-black text-xs transition-all active:scale-95 flex items-center gap-2 whitespace-nowrap ${activeTab === 'issue' ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700' : 'bg-amber-50 hover:bg-amber-100 text-amber-800'}`}
                  >
                    <span>➕</span> {language === 'ar' ? 'أضف بنداً جديداً' : 'Add New Row'}
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className={`w-full ${language === 'ar' ? 'text-right' : 'text-left'} border-collapse`}>
                  <thead>
                    <tr className="border-b border-slate-100 text-slate-400 text-xs font-bold">
                      <th className="pb-3 min-w-[200px]">{language === 'ar' ? 'الصنف والباتش' : 'Item & Batch'}</th>
                      <th className="pb-3 w-24">{language === 'ar' ? 'الوحدة' : 'UOM'}</th>
                      <th className="pb-3 w-28">{activeTab === 'issue' ? (language === 'ar' ? 'الرصيد المتاح' : 'Available Stock') : (language === 'ar' ? 'الرصيد الحالي' : 'Current Stock')}</th>
                      <th className="pb-3 w-28">{activeTab === 'issue' ? (language === 'ar' ? 'الكمية الصادرة' : 'Issued Qty') : (language === 'ar' ? 'الكمية المرجعة' : 'Returned Qty')}</th>
                      <th className="pb-3 w-32">{activeTab === 'issue' ? (language === 'ar' ? 'سعر البيع المقترح' : 'Unit Price') : (language === 'ar' ? 'سعر المرتجع المالي' : 'Refund Unit Price')}</th>
                      <th className="pb-3 w-32">{language === 'ar' ? 'الإجمالي' : 'Total'}</th>
                      <th className="pb-3 w-16">{language === 'ar' ? 'إزالة' : 'Remove'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {invoiceLines.map((line) => (
                      <tr key={line.key} className="group/row transition-all hover:bg-slate-50/50">
                        
                        {/* Item Dropdown */}
                        <td className="py-4 pr-1">
                          <select
                            required
                            value={line.inventory_id || ''}
                            onChange={(e) => handleLineChange(line.key, 'inventory_id', e.target.value)}
                            className={`w-full bg-slate-50 border border-slate-100 group-hover/row:bg-white rounded-xl p-2.5 text-xs font-bold text-slate-700 outline-none transition-all ${focusBorderClass}`}
                          >
                            <option value="">{language === 'ar' ? '-- اختر الصنف --' : '-- Select Item --'}</option>
                            {filteredInventoryItems
                              .filter(i => activeTab === 'issue' ? Number(i.remaining_qty) > 0 : true)
                              .map(i => (
                                <option key={i.id} value={i.id}>
                                  {i.item_name} {i.batch_no ? `(باتش: ${i.batch_no})` : ''} - [{Number(i.remaining_qty).toLocaleString()} {i.uom || 'علبة'}]
                                </option>
                              ))}
                          </select>
                        </td>

                        {/* UOM */}
                        <td className="py-4">
                          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200/60 block text-center">
                            {line.uom || '—'}
                          </span>
                        </td>

                        {/* Available Qty */}
                        <td className="py-4">
                          <span className={`text-xs font-black px-3 py-1.5 rounded-lg block text-center ${line.max_qty > 0 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-500'}`}>
                            {activeTab === 'issue' ? Number(line.max_qty).toLocaleString() : (inventoryItems.find(i => i.id === parseInt(line.inventory_id))?.remaining_qty || 0).toLocaleString()}
                          </span>
                        </td>

                        {/* Quantity Input */}
                        <td className="py-4">
                          <input
                            type="number"
                            required
                            min="1"
                            max={activeTab === 'issue' ? line.max_qty : 999999}
                            value={line.qty}
                            onChange={(e) => handleLineChange(line.key, 'qty', Number(e.target.value))}
                            className={`w-full bg-slate-50 border border-slate-100 group-hover/row:bg-white rounded-xl p-2 text-center text-xs font-black text-slate-800 outline-none focus:bg-white transition-all ${focusBorderClass}`}
                          />
                        </td>

                        {/* Unit Price */}
                        <td className="py-4">
                          <input
                            type="number"
                            step="0.01"
                            required
                            value={line.unit_price}
                            onChange={(e) => handleLineChange(line.key, 'unit_price', Number(e.target.value))}
                            className={`w-full bg-slate-50 border border-slate-100 group-hover/row:bg-white rounded-xl p-2 text-center text-xs font-black text-slate-800 outline-none focus:bg-white transition-all ${focusBorderClass}`}
                          />
                        </td>

                        {/* Line Total */}
                        <td className="py-4">
                          <span className="text-xs font-black text-slate-900 block text-center">
                            {Number(line.total).toLocaleString()} {language === 'ar' ? 'ش.ج' : 'ILS'}
                          </span>
                        </td>

                        {/* Remove Row Button */}
                        <td className="py-4 text-center">
                          <button
                            type="button"
                            onClick={() => removeInvoiceLine(line.key)}
                            className="w-8 h-8 rounded-lg hover:bg-rose-100 text-rose-500 font-bold transition-all active:scale-90 flex items-center justify-center mx-auto"
                          >
                            🗑️
                          </button>
                        </td>

                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: Financial Totals, Dynamic Accounting Ledger & Post Button */}
          <div className="space-y-8 col-span-1">
            
            {/* Form Summary & Financial Breakdown */}
            <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm space-y-6">
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-3">
                <span>🧾</span> {activeTab === 'issue' ? (language === 'ar' ? 'الفاتورة الإجمالية والخصم' : 'Invoice Summary & Discounts') : (language === 'ar' ? 'إجمالي قيمة المرتجع والتسوية' : 'Total Return Value & Settlements')}
              </h2>

              <div className="space-y-6">
                
                {/* Payment/Refund Method selector */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-black text-slate-500">{activeTab === 'issue' ? (language === 'ar' ? 'طريقة الدفع والتسوية' : 'Payment & Settlement Method') : (language === 'ar' ? 'طريقة تسوية المرتجع والرد المالي' : 'Refund Method & Settlement')}</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: 'On Account', label: language === 'ar' ? (activeTab === 'issue' ? 'آجل / حساب' : 'إشعار دائن / حساب') : (activeTab === 'issue' ? 'On Account' : 'Credit Note'), emoji: '💳' },
                      { id: 'Cash', label: language === 'ar' ? (activeTab === 'issue' ? 'نقدي / صندوق' : 'نقدي / رد فوري') : (activeTab === 'issue' ? 'Cash Box' : 'Cash Refund'), emoji: '💵' },
                      { id: 'Bank', label: language === 'ar' ? (activeTab === 'issue' ? 'بنكي / شيك' : 'بنكي / رد شيك') : (activeTab === 'issue' ? 'Bank Transfer' : 'Bank Refund'), emoji: '🏛️' },
                      { id: 'Booking', label: language === 'ar' ? (activeTab === 'issue' ? 'حجز مؤقت' : 'مرتجع حجز') : (activeTab === 'issue' ? 'Temp Booking' : 'Booking Refund'), emoji: '📦' }
                    ].map(method => (
                      <button
                        key={method.id}
                        type="button"
                        onClick={() => {
                          setPaymentMethod(method.id);
                          if (method.id === 'Booking') {
                            setWalletAction('none');
                            setWalletPayAmount(0);
                            setWalletDepositAmount(0);
                          }
                        }}
                        className={`py-3 px-1 border rounded-xl font-black text-[9px] flex flex-col items-center gap-1.5 transition-all ${paymentMethod === method.id ? (activeTab === 'issue' ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-amber-600 border-amber-600 text-white shadow-lg') : 'bg-slate-50 border-slate-100 hover:bg-slate-100 text-slate-600'}`}
                      >
                        <span className="text-base">{method.emoji}</span>
                        <span className="whitespace-nowrap">{method.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Customer Wallet Balance (Dynamic and Interactive) */}
                {selectedCustomer && paymentMethod !== 'Booking' && (
                  (() => {
                    const walletBal = getCustomerWalletBalance(selectedCustomer);
                    return (
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3.5 transition-all">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                            👛 {language === 'ar' ? 'محفظة العميل الإلكترونية:' : 'Client E-Wallet:'}
                          </span>
                          <span className="text-xs font-black text-indigo-700 bg-indigo-50 px-3 py-1 rounded-xl">
                            {walletBal.toLocaleString()} {language === 'ar' ? 'ش.ج' : 'ILS'}
                          </span>
                        </div>
                        
                        {activeTab === 'issue' && (
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              disabled={walletBal <= 0}
                              onClick={() => {
                                  if (walletAction === 'use_balance') {
                                    setWalletAction('none');
                                    setWalletPayAmount(0);
                                  } else {
                                    setWalletAction('use_balance');
                                    setWalletPayAmount(Math.min(walletBal, Number(totals.grandTotal)));
                                  }
                              }}
                              className={`py-2 px-3 rounded-xl text-[10px] font-black border transition-all active:scale-95 flex items-center justify-center gap-1.5 ${walletAction === 'use_balance' ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 disabled:opacity-50'}`}
                            >
                              💸 {language === 'ar' ? 'الدفع من المحفظة' : 'Pay from Wallet'}
                            </button>
                            
                            <button
                              type="button"
                              onClick={() => {
                                if (walletAction === 'deposit_change') {
                                  setWalletAction('none');
                                  setWalletDepositAmount(0);
                                } else {
                                  setWalletAction('deposit_change');
                                  setWalletDepositAmount(0);
                                }
                              }}
                              className={`py-2 px-3 rounded-xl text-[10px] font-black border transition-all active:scale-95 flex items-center justify-center gap-1.5 ${walletAction === 'deposit_change' ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'}`}
                            >
                              ➕ {language === 'ar' ? 'إيداع بالمحفظة' : 'Wallet Deposit'}
                            </button>
                          </div>
                        )}
                        
                        {walletAction === 'use_balance' && (
                          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 space-y-1.5 animate-in slide-in-from-top-2 duration-300">
                            <div className="flex justify-between items-center text-[10px] font-bold text-emerald-800">
                              <span>{language === 'ar' ? 'قيمة الخصم من المحفظة:' : 'Deducted from Wallet:'}</span>
                              <span className="font-black text-xs text-emerald-600">-{Math.min(walletBal, Number(totals.grandTotal)).toLocaleString()} {language === 'ar' ? 'ش.ج' : 'ILS'}</span>
                            </div>
                            <p className="text-[9px] text-emerald-600 font-bold leading-relaxed">
                              {language === 'ar' ? 'سيقوم النظام تلقائياً بخصم هذا المبلغ من رصيد محفظة العميل عند الحفظ وتخفيض المطلوب نقداً.' : 'The system will automatically deduct this amount from the client wallet and decrease cash due.'}
                            </p>
                          </div>
                        )}
                        
                        {walletAction === 'deposit_change' && (
                          <div className="bg-indigo-50/50 border border-indigo-100 rounded-xl p-3 space-y-3 animate-in slide-in-from-top-2 duration-300">
                            <label className="text-[9px] font-black text-indigo-800 block">{language === 'ar' ? 'المبلغ المراد شحنه أو إيداعه بالمحفظة (ش.ج):' : 'Amount to deposit/charge in wallet (ILS):'}</label>
                            <div className="flex gap-2">
                              <input
                                type="number"
                                min="0"
                                max="100000"
                                value={walletDepositAmount || ''}
                                onChange={(e) => setWalletDepositAmount(Number(e.target.value))}
                                placeholder={language === 'ar' ? 'أدخل مبلغ الشحن...' : 'Enter deposit amount...'}
                                className="w-full p-2 text-xs font-black text-slate-800 bg-white border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                              />
                              <button
                                type="button"
                                onClick={() => setWalletDepositAmount(50)}
                                className="px-2.5 py-1 bg-white hover:bg-slate-100 text-[10px] font-black border border-slate-200 rounded-lg active:scale-95"
                              >
                                +50
                              </button>
                              <button
                                type="button"
                                onClick={() => setWalletDepositAmount(100)}
                                className="px-2.5 py-1 bg-white hover:bg-slate-100 text-[10px] font-black border border-slate-200 rounded-lg active:scale-95"
                              >
                                +100
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })()
                )}

                {/* Discount / Penalty value input */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-black text-slate-500">{activeTab === 'issue' ? (language === 'ar' ? 'خصم تجاري مباشر (ش.ج)' : 'Commercial Discount (ILS)') : (language === 'ar' ? 'تخفيض قيمة المرتجع (ش.ج)' : 'Reduce Return Value (ILS)')}</label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      min="0"
                      value={discount}
                      onChange={(e) => setDiscount(Number(e.target.value))}
                      placeholder="0.00"
                      className={`w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm font-black text-slate-800 outline-none focus:bg-white transition-all ${focusBorderClass}`}
                    />
                    {discount > 0 && (
                      <button
                        type="button"
                        onClick={() => setDiscount(0)}
                        className="px-4.5 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 transition-all font-black text-xs"
                        title={language === 'ar' ? 'إعادة تعيين الخصم' : 'Reset Discount'}
                      >
                        🔄
                      </button>
                    )}
                  </div>
                  {activeTab === 'issue' && (
                    <div className="flex gap-1.5 pt-1">
                      {[5, 10, 15, 20].map((percent) => {
                        const subtotalVal = invoiceLines.reduce((sum, line) => sum + Number(line.total || 0), 0);
                        const calcDisc = Math.round(subtotalVal * (percent / 100));
                        return (
                          <button
                            key={percent}
                            type="button"
                            onClick={() => setDiscount(calcDisc)}
                            className="flex-1 py-1.5 bg-slate-50 hover:bg-indigo-50 border border-slate-100 hover:border-indigo-200 text-slate-500 hover:text-indigo-600 rounded-lg text-[9px] font-black transition-all active:scale-95"
                          >
                            %{percent} ({calcDisc.toLocaleString()})
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Interactive Financial Totals */}
                <div className="border-t border-slate-100 pt-5 space-y-4">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                    <span>{activeTab === 'issue' ? (language === 'ar' ? 'الإجمالي الفرعي:' : 'Subtotal:') : (language === 'ar' ? 'إجمالي المرتجع الفرعي:' : 'Subtotal Return:')}</span>
                    <span className="font-mono">{Number(totals.subtotal).toLocaleString()} {language === 'ar' ? 'ش.ج' : 'ILS'}</span>
                  </div>
                  
                  <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <span>{activeTab === 'issue' ? (language === 'ar' ? 'ضريبة القيمة المضافة (14%):' : 'VAT (14%):') : (language === 'ar' ? 'ضريبة القيمة المضافة المستردة (14%):' : 'VAT Refund (14%):')}</span>
                      <button
                        type="button"
                        onClick={() => setShowVat(!showVat)}
                        className={`px-2 py-0.5 rounded-full text-[8px] font-black border transition-all ${showVat ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 'bg-slate-100 border-slate-200 text-slate-400'}`}
                      >
                        {showVat ? (language === 'ar' ? '✓ نشط' : '✓ Active') : (language === 'ar' ? '✗ إعفاء' : '✗ Exempt')}
                      </button>
                    </span>
                    <span className="font-mono">{Number(totals.taxAmount).toLocaleString()} {language === 'ar' ? 'ش.ج' : 'ILS'}</span>
                  </div>
                  
                  {discount > 0 && (
                    <div className="flex justify-between items-center text-xs font-bold text-rose-500 bg-rose-50 p-2.5 rounded-xl border border-rose-100">
                      <span>{activeTab === 'issue' ? (language === 'ar' ? 'خصم تجاري:' : 'Commercial Discount:') : (language === 'ar' ? 'تنزيل قيمة المرتجع:' : 'Return Reduced:')}</span>
                      <span className="font-mono font-black">-{Number(discount).toLocaleString()} {language === 'ar' ? 'ش.ج' : 'ILS'}</span>
                    </div>
                  )}
                  
                  {walletAction === 'use_balance' && walletPayAmount > 0 && (
                    <div className="flex justify-between items-center text-xs font-bold text-emerald-600 bg-emerald-50 p-2.5 rounded-xl border border-emerald-100">
                      <span>{language === 'ar' ? 'الدفع المخصوم من المحفظة:' : 'Wallet Paid Deduction:'}</span>
                      <span className="font-mono font-black">-{Number(walletPayAmount).toLocaleString()} {language === 'ar' ? 'ش.ج' : 'ILS'}</span>
                    </div>
                  )}

                  {walletAction === 'deposit_change' && walletDepositAmount > 0 && (
                    <div className="flex justify-between items-center text-xs font-bold text-indigo-600 bg-indigo-50 p-2.5 rounded-xl border border-indigo-100">
                      <span>{language === 'ar' ? 'شحن وتغذية محفظة العميل:' : 'Wallet Top Up / Deposit:'}</span>
                      <span className="font-mono font-black">+{Number(walletDepositAmount).toLocaleString()} {language === 'ar' ? 'ش.ج' : 'ILS'}</span>
                    </div>
                  )}

                  <div className={`p-4.5 rounded-2xl border transition-all flex justify-between items-center ${activeTab === 'issue' ? 'bg-gradient-to-br from-indigo-950 to-indigo-900 border-indigo-900 text-white shadow-lg shadow-indigo-950/20' : 'bg-gradient-to-br from-amber-950 to-amber-900 border-amber-900 text-white shadow-lg shadow-amber-950/20'}`}>
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest block">
                        {paymentMethod === 'Booking' 
                          ? (language === 'ar' ? 'قيمة الحجز الإجمالية' : 'Total Booking Value') 
                          : (walletAction === 'use_balance' ? (language === 'ar' ? 'الصافي المطلوب نقداً' : 'Net Due Cash') : (walletAction === 'deposit_change' ? (language === 'ar' ? 'إجمالي المطلوب استلامه' : 'Total Cash Required') : (language === 'ar' ? 'الصافي الإجمالي المستحق' : 'Grand Net Payable')))}
                      </span>
                      <span className="text-xs font-bold text-slate-400">Net Financial Payable</span>
                    </div>
                    <span className="text-2xl font-black font-mono tracking-tight text-white">
                      {(() => {
                        let finalAmt = Number(totals.grandTotal);
                        if (walletAction === 'use_balance') {
                          finalAmt = Math.max(0, finalAmt - walletPayAmount);
                        } else if (walletAction === 'deposit_change') {
                          finalAmt = finalAmt + walletDepositAmount;
                        }
                        return finalAmt.toLocaleString();
                      })()} {language === 'ar' ? 'ش.ج' : 'ILS'}
                    </span>
                  </div>
                </div>

              </div>
            </div>

            {/* DYNAMIC LEDGER PREVIEW */}
            <div className="bg-slate-950 rounded-[2rem] p-8 text-white shadow-2xl space-y-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-emerald-500/5 to-transparent opacity-20"></div>
              <div className="relative z-10 flex justify-between items-center">
                <h3 className="text-xs font-black text-slate-300 flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full animate-ping ${activeTab === 'issue' ? 'bg-emerald-500' : 'bg-amber-500'}`}></span>
                  {language === 'ar' ? '🔒 معاينة القيد المزدوج الذكي (نظرة عامة)' : '🔒 Live Double Entry Preview (Audit View)'}
                </h3>
                <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold ${activeTab === 'issue' ? 'bg-white/10 text-emerald-400' : 'bg-white/10 text-amber-400'}`}>IFRS Compliant</span>
              </div>

              <div className="space-y-4 text-xs relative z-10 font-mono">
                
                <div className="bg-white/5 p-3.5 rounded-xl border border-white/5 flex justify-between items-center">
                  {activeTab === 'issue' ? (
                    <>
                      <div>
                        <span className="text-[10px] font-black text-emerald-400 block mb-0.5">{language === 'ar' ? 'مدين (Dr.)' : 'Debit (Dr.)'}</span>
                        <span className="text-slate-200 font-bold">
                          {paymentMethod === 'Cash' 
                            ? (language === 'ar' ? 'صندوق نقدية - تيد كابيتال' : 'Cash Box - TED Capital') 
                            : paymentMethod === 'Bank' 
                              ? (language === 'ar' ? 'بنك CIB - تيد كابيتال' : 'CIB Bank - TED Capital') 
                              : (language === 'ar' ? 'عملاء (حسابات مدينة - AR)' : 'Accounts Receivable (AR)')}
                        </span>
                      </div>
                      <span className="text-emerald-400 font-black text-sm">+{Number(totals.grandTotal).toLocaleString()}</span>
                    </>
                  ) : (
                    <>
                      <div>
                        <span className="text-[10px] font-black text-rose-400 block mb-0.5">{language === 'ar' ? 'دائن (Cr.)' : 'Credit (Cr.)'}</span>
                        <span className="text-slate-200 font-bold">
                          {paymentMethod === 'Cash' 
                            ? (language === 'ar' ? 'صندوق نقدية - تيد كابيتال' : 'Cash Box - TED Capital') 
                            : paymentMethod === 'Bank' 
                              ? (language === 'ar' ? 'بنك CIB - تيد كابيتال' : 'CIB Bank - TED Capital') 
                              : (language === 'ar' ? 'عملاء (حسابات مدينة - AR)' : 'Accounts Receivable (AR)')}
                        </span>
                      </div>
                      <span className="text-rose-400 font-black text-sm">-{Number(totals.grandTotal).toLocaleString()}</span>
                    </>
                  )}
                </div>

                <div className="bg-white/5 p-3.5 rounded-xl border border-white/5 flex justify-between items-center">
                  {activeTab === 'issue' ? (
                    <>
                      <div>
                        <span className="text-[10px] font-black text-indigo-400 block mb-0.5">{language === 'ar' ? 'دائن (Cr.)' : 'Credit (Cr.)'}</span>
                        <span className="text-slate-200 font-bold">{language === 'ar' ? 'إيرادات مبيعات' : 'Sales Revenue'}</span>
                      </div>
                      <span className="text-indigo-400 font-black text-sm">-{Number(totals.subtotal).toLocaleString()}</span>
                    </>
                  ) : (
                    <>
                      <div>
                        <span className="text-[10px] font-black text-emerald-400 block mb-0.5">{language === 'ar' ? 'مدين (Dr.)' : 'Debit (Dr.)'}</span>
                        <span className="text-slate-200 font-bold">{language === 'ar' ? 'مرتجع مبيعات خامات ومواد' : 'Sales Return Material/Goods'}</span>
                      </div>
                      <span className="text-emerald-400 font-black text-sm">+{Number(totals.subtotal).toLocaleString()}</span>
                    </>
                  )}
                </div>

                {Number(totals.taxAmount) > 0 && (
                  <div className="bg-white/5 p-3.5 rounded-xl border border-white/5 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] font-black block mb-0.5 text-slate-400">
                        {activeTab === 'issue' ? (language === 'ar' ? 'دائن (Cr.)' : 'Credit (Cr.)') : (language === 'ar' ? 'مدين (Dr.)' : 'Debit (Dr.)')}
                      </span>
                      <span className="text-slate-200 font-bold">{language === 'ar' ? 'ضريبة القيمة المضافة' : 'VAT / Tax Control Account'}</span>
                    </div>
                    <span className={`font-black text-sm ${activeTab === 'issue' ? 'text-indigo-400' : 'text-emerald-400'}`}>
                      {activeTab === 'issue' ? `-${Number(totals.taxAmount).toLocaleString()}` : `+${Number(totals.taxAmount).toLocaleString()}`}
                    </span>
                  </div>
                )}

                <div className="border-t border-white/10 my-3 pt-3 space-y-4">
                  
                  <div className="bg-white/5 p-3.5 rounded-xl border border-white/5 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] font-black block mb-0.5 text-slate-400">
                        {activeTab === 'issue' ? (language === 'ar' ? 'مدين (Dr. COGS)' : 'Debit (Dr. COGS)') : (language === 'ar' ? 'دائن (Cr. COGS)' : 'Credit (Cr. COGS)')}
                      </span>
                      <span className="text-slate-200 font-bold">{language === 'ar' ? 'تكلفة خامات ومواد (منصرف)' : 'Cost of Goods Sold (COGS)'}</span>
                    </div>
                    <span className={`font-black text-sm ${activeTab === 'issue' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {activeTab === 'issue' ? `+${Number(totals.totalCOGS).toLocaleString()}` : `-${Number(totals.totalCOGS).toLocaleString()}`}
                    </span>
                  </div>

                  <div className="bg-white/5 p-3.5 rounded-xl border border-white/5 flex justify-between items-center">
                    <div>
                      <span className="text-[10px] font-black block mb-0.5 text-slate-400">
                        {activeTab === 'issue' ? (language === 'ar' ? 'دائن (Cr. Asset)' : 'Credit (Cr. Asset)') : (language === 'ar' ? 'مدين (Dr. Asset)' : 'Debit (Dr. Asset)')}
                      </span>
                      <span className="text-slate-200 font-bold">{language === 'ar' ? 'مخزون خامات ومواد' : 'Inventory Stock Assets'}</span>
                    </div>
                    <span className={`font-black text-sm ${activeTab === 'issue' ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {activeTab === 'issue' ? `-${Number(totals.totalCOGS).toLocaleString()}` : `+${Number(totals.totalCOGS).toLocaleString()}`}
                    </span>
                  </div>

                </div>

              </div>
            </div>

            {/* Submit/Post Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full text-white py-4.5 rounded-2xl font-black shadow-xl hover:shadow-2xl transition-all duration-300 active:scale-95 disabled:opacity-50 text-sm cursor-pointer ${btnAccentClass}`}
            >
              {isSubmitting 
                ? (activeTab === 'issue' ? (language === 'ar' ? 'جاري الصرف والترحيل للميزانية...' : 'Posting Issue Ledger...') : (language === 'ar' ? 'جاري ترحيل المرتجع للمستودع والميزانية...' : 'Posting Return Reversal...')) 
                : (activeTab === 'issue' ? (language === 'ar' ? '🚚 ترحيل قيد الصرف وفاتورة المبيعات' : '🚚 Post Stock Issue & Invoice') : (language === 'ar' ? '🔄 ترحيل مرتجع الصرف وإصدار قيد التسوية' : '🔄 Post Stock Return & Settlement'))}
            </button>

          </div>

        </form>
      )}

      {/* TAB 3: CUSTOMER INVOICES LIST */}
      {activeTab === 'invoice_list' && (
        <div className="space-y-6 animate-in fade-in duration-300 no-print">
          <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-3">
                  <span>📋</span> {language === 'ar' ? 'قائمة الفواتير الصادرة للعملاء' : 'Issued Customer Invoices Registry'}
                </h2>
                <p className="text-xs text-slate-400 font-bold mt-1">{language === 'ar' ? 'عرض وتدقيق وإعادة طباعة جميع فواتير المبيعات والإشعارات الدائنة الصادرة.' : 'Display, audit, and reprint all issued sales invoices and return credit notes.'}</p>
              </div>
              
              {/* Search Bar */}
              <div className="relative w-full md:w-80">
                <input
                  type="text"
                  placeholder={language === 'ar' ? '🔍 ابحث برقم الفاتورة، العميل، التاريخ...' : '🔍 Search by invoice no, customer, date...'}
                  value={invoiceListSearch}
                  onChange={(e) => setInvoiceListSearch(e.target.value)}
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl font-black text-slate-800 text-xs shadow-inner focus:outline-none focus:border-indigo-500 transition-all font-bold"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className={`w-full ${language === 'ar' ? 'text-right' : 'text-left'} border-collapse`}>
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 text-xs font-black">
                    <th className="pb-3">{language === 'ar' ? 'التاريخ' : 'Date'}</th>
                    <th className="pb-3">{language === 'ar' ? 'نوع المستند' : 'Doc Type'}</th>
                    <th className="pb-3">{language === 'ar' ? 'رقم المستند' : 'Doc Number'}</th>
                    <th className="pb-3">{language === 'ar' ? 'اسم العميل' : 'Customer'}</th>
                    <th className={`pb-3 ${language === 'ar' ? 'text-left pr-4' : 'text-right pl-4'}`}>{language === 'ar' ? 'القيمة الكلية' : 'Total Amount'}</th>
                    <th className="pb-3 text-center">{language === 'ar' ? 'الإجراءات' : 'Actions'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs font-bold text-slate-700">
                  {(() => {
                    const list = ledgerEntries
                      .filter(entry => entry.account_name === 'عملاء (حسابات مدينة - AR)')
                      .map(parseLedgerInvoice)
                      .filter(Boolean)
                      .filter(item => {
                        const q = invoiceListSearch.toLowerCase();
                        return (
                          item.docNo.toLowerCase().includes(q) ||
                          item.customer.toLowerCase().includes(q) ||
                          item.date.includes(q)
                        );
                      });

                    if (list.length === 0) {
                      return (
                        <tr>
                          <td colSpan="6" className="py-8 text-center text-slate-400 font-black">
                            {language === 'ar' ? 'لا توجد فواتير مطابقة للبحث أو مصدرة بعد.' : 'No invoices matched your search or have been posted yet.'}
                          </td>
                        </tr>
                      );
                    }

                    return list.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-all">
                        <td className="py-4">{item.date}</td>
                        <td className="py-4">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black ${item.docType === 'issue' ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'}`}>
                            {item.docType === 'issue' ? (language === 'ar' ? 'فاتورة مبيعات' : 'Sales Invoice') : (language === 'ar' ? 'إشعار مرتجع' : 'Credit Note')}
                          </span>
                        </td>
                        <td className="py-4 font-mono font-black">{item.docNo}</td>
                        <td className="py-4 font-black">{item.customer}</td>
                        <td className={`py-4 ${language === 'ar' ? 'text-left pr-4' : 'text-right pl-4'} font-black text-slate-900`}>{Number(item.grandTotal).toLocaleString()} {language === 'ar' ? 'ش.ج' : 'ILS'}</td>
                        <td className="py-4 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              const lines = salesRecords
                                .filter(r => {
                                  if (r.reference_no && r.reference_no === item.docNo) {
                                    return true;
                                  }
                                  if (!r.reference_no && r.customer_name === item.customer) {
                                    const rDate = r.date?.split('T')[0];
                                    const itemDate = item.date;
                                    if (rDate && itemDate) {
                                      const diffDays = Math.abs((new Date(rDate) - new Date(itemDate)) / (1000 * 60 * 60 * 24));
                                      return diffDays <= 1;
                                    }
                                  }
                                  return false;
                                })
                                .map((r, index) => ({
                                  key: index,
                                  item_name: r.item_name,
                                  batch_no: r.batch_no || 'N/A',
                                  uom: r.uom || 'متر',
                                  qty: Math.abs(r.qty),
                                  unit_price: r.sell_price,
                                  total: (Math.abs(r.qty) * r.sell_price).toFixed(2)
                                }));

                              const subtotal = lines.reduce((sum, l) => sum + Number(l.total), 0);
                              const taxAmount = subtotal * 0.14;
                              
                              setActiveInvoiceData({
                                type: item.docType,
                                invoiceNo: item.docNo,
                                date: item.date,
                                customerName: item.customer,
                                warehouse: language === 'ar' ? 'المخزن الرئيسي' : 'Main Warehouse',
                                paymentMethod: item.ledgerEntry.description?.includes('نقدي') ? (language === 'ar' ? 'نقدي / صندوق' : 'Cash Box') : item.ledgerEntry.description?.includes('بنكي') ? (language === 'ar' ? 'بنكي / شيك' : 'Bank Transfer') : (language === 'ar' ? 'آجل / على الحساب' : 'On Account'),
                                lines,
                                subtotal: subtotal.toFixed(2),
                                taxAmount: taxAmount.toFixed(2),
                                discount: 0,
                                grandTotal: Number(item.grandTotal || 0).toFixed(2)
                              });
                              setShowInvoiceModal(true);
                            }}
                            className="px-4 py-2 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl transition-all font-black text-[10px] cursor-pointer"
                          >
                            👁️ {language === 'ar' ? 'عرض وتدقيق الفاتورة' : 'View & Audit Invoice'}
                          </button>
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: CUSTOMER ACCOUNT STATEMENT */}
      {activeTab === 'customer_statement' && (
        <div className="space-y-6 animate-in fade-in duration-300 no-print">
          <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm space-y-6">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-xl font-black text-slate-900 flex items-center gap-3">
                  <span>📁</span> {language === 'ar' ? 'كشف حساب العملاء التفصيلي' : 'Customer Account Statement Dashboard'}
                </h2>
                <p className="text-xs text-slate-400 font-bold mt-1">{language === 'ar' ? 'توليد كشوف حساب مالية للعملاء، تدقيق المسحوبات والمبيعات وعرض الموازين التراكمية مع الأصناف.' : 'Generate customer statements, audit withdrawals/sales, and view rolling cumulative balances with items.'}</p>
              </div>
              
              {/* Customer Selector & Prints (Perfect Stacked Visual Alignment) */}
              <div className="flex flex-wrap gap-4 w-full lg:w-auto items-end">
                <div className="flex flex-col gap-2 w-full md:w-64">
                  <label className="text-xs font-black text-slate-500">{language === 'ar' ? 'العميل المستهدف *' : 'Target Customer *'}</label>
                  <div className="flex flex-col gap-2">
                    <input
                      type="text"
                      placeholder={language === 'ar' ? '🔍 ابحث عن عميل...' : '🔍 Search customer...'}
                      value={customerSearchQuery}
                      onChange={e => setCustomerSearchQuery(e.target.value)}
                      className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:bg-white outline-none transition-all focus:border-emerald-500 font-bold"
                    />
                    <select
                      value={selectedStatementCustomer}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedStatementCustomer(val);
                        setStatementInvoiceFilter('');
                        if (val) {
                          setCustomerSearchQuery(val);
                        }
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-800 outline-none focus:bg-white transition-all focus:border-emerald-500 cursor-pointer font-bold"
                    >
                      <option value="">{language === 'ar' ? '-- اختر العميل لعرض كشف الحساب --' : '-- Select customer for account statement --'}</option>
                      {filteredCustomers.map(c => (
                        <option key={c.id} value={c.name}>{c.name} {c.company_name ? `(${c.company_name})` : ''}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {selectedStatementCustomer && (
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-6 py-3.5 bg-slate-900 hover:bg-emerald-600 text-white rounded-xl font-black text-xs transition-all active:scale-95 shadow-lg flex items-center justify-center gap-2 cursor-pointer h-[46px]"
                  >
                    <span>🖨️</span> {language === 'ar' ? 'طباعة كشف الحساب' : 'Print Account Statement'}
                  </button>
                )}
              </div>
            </div>

            {selectedStatementCustomer ? (
              (() => {
                const customerEntries = ledgerEntries
                  .filter(entry => 
                    entry.account_name === 'عملاء (حسابات مدينة - AR)' &&
                    (entry.description?.includes(selectedStatementCustomer) || false)
                  )
                  .sort((a, b) => new Date(a.date) - new Date(b.date));

                const totalDebit = customerEntries.reduce((sum, e) => sum + Number(e.debit || 0), 0);
                const totalCredit = customerEntries.reduce((sum, e) => sum + Number(e.credit || 0), 0);
                const balance = totalDebit - totalCredit;

                let runningBal = 0;
                const rows = customerEntries.map(entry => {
                  runningBal += Number(entry.debit || 0) - Number(entry.credit || 0);
                  return {
                    ...entry,
                    runningBalance: runningBal
                  };
                });

                // Extract unique invoices
                const uniqueInvoices = Array.from(new Set(
                  customerEntries
                    .map(entry => {
                      const match = entry.description?.match(/INV-\d+/) || entry.description?.match(/RTN-\d+/);
                      return match ? match[0] : null;
                    })
                    .filter(Boolean)
                ));

                const filteredRows = rows.filter(row => {
                  const q = statementSearch.toLowerCase();
                  const matchesSearch = !statementSearch || (
                    row.description?.toLowerCase().includes(q) ||
                    row.date?.includes(q) ||
                    String(row.debit).includes(q) ||
                    String(row.credit).includes(q)
                  );
                  const matchesInvoiceFilter = !statementInvoiceFilter || row.description?.includes(statementInvoiceFilter);
                  return matchesSearch && matchesInvoiceFilter;
                });

                // Calculate aggregated items taken summary
                let allItems = [];
                filteredRows.forEach(row => {
                  const isDebit = Number(row.debit || 0) > 0;
                  const docMatch = row.description?.match(/INV-\d+/) || row.description?.match(/RTN-\d+/);
                  const docNo = docMatch ? docMatch[0] : '';

                  const items = salesRecords.filter(r => {
                    const docMatches = docNo && r.reference_no === docNo;
                    if (docMatches) return true;

                    if (!r.reference_no || r.reference_no === '') {
                      const salesDateStr = (r.date || r.created_at || '').split('T')[0];
                      const rowDateStr = (row.date || row.created_at || '').split('T')[0];
                      const salesCreatedAt = new Date(r.created_at).getTime();
                      const ledgerCreatedAt = new Date(row.created_at).getTime();
                      const sameTime = Math.abs(salesCreatedAt - ledgerCreatedAt) < 60000;
                      const dateMatches = (salesDateStr === rowDateStr) || sameTime;

                      const customerMatches = r.customer_name === selectedStatementCustomer;
                      if (!dateMatches || !customerMatches) return false;

                      const isReturn = r.project_name?.includes('مرتجع') || r.reference_no?.includes('RTN');
                      return isDebit ? !isReturn : isReturn;
                    }
                    return false;
                  });
                  allItems.push(...items);
                });

                // Group by item key (name + batch)
                const aggMap = {};
                allItems.forEach(it => {
                  const key = `${it.item_name}_${it.batch_no || 'N/A'}`;
                  if (!aggMap[key]) {
                    aggMap[key] = {
                      item_name: it.item_name,
                      batch_no: it.batch_no || 'N/A',
                      uom: it.uom || 'وحدة',
                      qtyIssued: 0,
                      qtyReturned: 0,
                      totalAmount: 0,
                      sellPrices: []
                    };
                  }
                  const qtyVal = Math.abs(Number(it.qty || 0));
                  const sellPriceVal = Number(it.sell_price || 0);
                  const isReturn = it.project_name?.includes('مرتجع') || it.reference_no?.includes('RTN');

                  if (isReturn) {
                    aggMap[key].qtyReturned += qtyVal;
                  } else {
                    aggMap[key].qtyIssued += qtyVal;
                  }
                  aggMap[key].totalAmount += qtyVal * sellPriceVal;
                  aggMap[key].sellPrices.push(sellPriceVal);
                });

                const statementItemsSummary = Object.values(aggMap).map(agg => {
                  const avgPrice = agg.sellPrices.length > 0 
                    ? agg.sellPrices.reduce((a, b) => a + b, 0) / agg.sellPrices.length
                    : 0;
                  return {
                    ...agg,
                    netQty: agg.qtyIssued - agg.qtyReturned,
                    avgPrice: avgPrice.toFixed(2)
                  };
                });

                return (
                  <div className="space-y-6">
                    
                    {/* Financial Dashboard Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="p-6 bg-slate-50 border border-slate-100 rounded-3xl text-right">
                        <span className="text-[10px] font-black text-slate-400 block mb-1">{language === 'ar' ? 'إجمالي المبيعات والمسحوبات' : 'Total Sales & Withdrawals'}</span>
                        <span className="text-xl font-black text-slate-900 font-mono">{totalDebit.toLocaleString()} {language === 'ar' ? 'ش.ج' : 'ILS'}</span>
                      </div>
                      <div className="p-6 bg-slate-50 border border-slate-100 rounded-3xl text-right">
                        <span className="text-[10px] font-black text-slate-400 block mb-1">{language === 'ar' ? 'إجمالي المرتجعات والمدفوعات' : 'Total Returns & Payments'}</span>
                        <span className="text-xl font-black text-amber-700 font-mono">{totalCredit.toLocaleString()} {language === 'ar' ? 'ش.ج' : 'ILS'}</span>
                      </div>
                      <div className={`p-6 border rounded-3xl text-right ${balance > 0 ? 'bg-indigo-50/50 border-indigo-100' : 'bg-emerald-50/50 border-emerald-100'}`}>
                        <span className="text-[10px] font-black text-slate-400 block mb-1">{language === 'ar' ? 'الرصيد المتبقي المستحق' : 'Outstanding Remaining Balance'}</span>
                        <span className={`text-xl font-black font-mono ${balance > 0 ? 'text-indigo-700' : 'text-emerald-700'}`}>{balance.toLocaleString()} {language === 'ar' ? 'ش.ج' : 'ILS'}</span>
                      </div>
                    </div>

                    {/* Table Filters & Searches */}
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50 p-6 rounded-[2rem] border border-slate-200/60">
                      <div>
                        <h3 className="text-sm font-black text-slate-800">{language === 'ar' ? 'تصفية وضبط خيارات عرض الأصناف للمستندات' : 'Filter & Adjust Document Itemization Options'}</h3>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                        
                        {/* Filter by Invoice */}
                        <select
                          value={statementInvoiceFilter}
                          onChange={(e) => setStatementInvoiceFilter(e.target.value)}
                          className="p-3 bg-white border border-slate-200 rounded-xl font-black text-slate-800 text-xs shadow-inner cursor-pointer focus:outline-none focus:border-indigo-500 w-44"
                        >
                          <option value="">{language === 'ar' ? '-- كل الفواتير والحركات --' : '-- All Invoices & Actions --'}</option>
                          {uniqueInvoices.map(invNo => (
                            <option key={invNo} value={invNo}>{invNo}</option>
                          ))}
                        </select>

                        {/* Toggle Expand Items */}
                        <label className="flex items-center gap-2 text-xs font-black text-slate-700 bg-white px-4 py-2.5 rounded-xl border border-slate-200 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={expandAllStatementDetails}
                            onChange={(e) => setExpandAllStatementDetails(e.target.checked)}
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
                          />
                          <span>🔓 {language === 'ar' ? 'تفاصيل الأصناف' : 'Expand Items'}</span>
                        </label>

                        {/* Search in statement */}
                        <input
                          type="text"
                          placeholder={language === 'ar' ? '🔍 ابحث في كشف الحساب...' : '🔍 Search statement entries...'}
                          value={statementSearch}
                          onChange={(e) => setStatementSearch(e.target.value)}
                          className="p-3 bg-white border border-slate-200 rounded-xl font-black text-slate-800 text-xs shadow-inner focus:outline-none focus:border-indigo-500 w-52 font-bold"
                        />

                      </div>
                    </div>

                    {/* Statement Table */}
                    <div className="overflow-x-auto">
                      <table className={`w-full ${language === 'ar' ? 'text-right' : 'text-left'} border-collapse`}>
                        <thead>
                          <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 text-xs font-black">
                            <th className="p-4">{language === 'ar' ? 'التاريخ' : 'Date'}</th>
                            <th className="p-4">{language === 'ar' ? 'تفاصيل الحركة والقيد' : 'Transaction & Entry Details'}</th>
                            <th className={`p-4 ${language === 'ar' ? 'text-left' : 'text-right'}`}>{language === 'ar' ? 'مدين (+)' : 'Debit (+)'}</th>
                            <th className={`p-4 ${language === 'ar' ? 'text-left' : 'text-right'}`}>{language === 'ar' ? 'دائن (-)' : 'Credit (-)'}</th>
                            <th className={`p-4 ${language === 'ar' ? 'text-left' : 'text-right'}`}>{language === 'ar' ? 'الرصيد التراكمي' : 'Rolling Balance'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                          {filteredRows.length === 0 ? (
                            <tr>
                              <td colSpan="5" className="py-8 text-center text-slate-400 font-bold">
                                {language === 'ar' ? 'لا توجد عمليات مسجلة مطابقة للبحث أو التصفية لهذا العميل.' : 'No recorded transactions matched the search/filter parameters for this customer.'}
                              </td>
                            </tr>
                          ) : (
                            filteredRows.map((row) => {
                              const isDebit = Number(row.debit || 0) > 0;
                              const docMatch = row.description?.match(/INV-\d+/) || row.description?.match(/RTN-\d+/);
                              const docNo = docMatch ? docMatch[0] : '';

                              const items = salesRecords.filter(r => {
                                const docMatches = docNo && r.reference_no === docNo;
                                if (docMatches) return true;

                                if (!r.reference_no || r.reference_no === '') {
                                  const salesDateStr = (r.date || r.created_at || '').split('T')[0];
                                  const rowDateStr = (row.date || row.created_at || '').split('T')[0];
                                  const salesCreatedAt = new Date(r.created_at).getTime();
                                  const ledgerCreatedAt = new Date(row.created_at).getTime();
                                  const sameTime = Math.abs(salesCreatedAt - ledgerCreatedAt) < 60000;
                                  const dateMatches = (salesDateStr === rowDateStr) || sameTime;

                                  const customerMatches = r.customer_name === selectedStatementCustomer;
                                  return dateMatches && customerMatches && (isDebit ? Number(r.qty) < 0 : Number(r.qty) > 0);
                                }
                                return false;
                              });

                              return (
                                <React.Fragment key={row.id}>
                                  <tr className="hover:bg-slate-50/30 transition-all">
                                    <td className="p-4">{row.date?.split('T')[0]}</td>
                                    <td className="p-4 font-black">{row.description}</td>
                                    <td className={`p-4 ${language === 'ar' ? 'text-left' : 'text-right'} text-emerald-600 font-black font-mono`}>
                                      {row.debit > 0 ? `+${Number(row.debit).toLocaleString()} ${language === 'ar' ? 'ش.ج' : 'ILS'}` : '—'}
                                    </td>
                                    <td className={`p-4 ${language === 'ar' ? 'text-left' : 'text-right'} text-rose-500 font-black font-mono`}>
                                      {row.credit > 0 ? `-${Number(row.credit).toLocaleString()} ${language === 'ar' ? 'ش.ج' : 'ILS'}` : '—'}
                                    </td>
                                    <td className={`p-4 ${language === 'ar' ? 'text-left' : 'text-right'} font-mono font-black text-slate-900`}>
                                      {Number(row.runningBalance).toLocaleString()} {language === 'ar' ? 'ش.ج' : 'ILS'}
                                    </td>
                                  </tr>
                                  {expandAllStatementDetails && items.length > 0 && (
                                    <tr>
                                      <td colSpan="5" className="p-0 border-none bg-slate-50/40">
                                        <div className={`px-16 py-3 border-t border-slate-100/60 pb-5 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                                          <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm space-y-2 max-w-3xl">
                                            <span className="text-[10px] font-black text-slate-400 block mb-1">📦 {language === 'ar' ? '📦 تفاصيل الأصناف المبيعة/المرتجعة للمستند:' : '📦 Items Sold/Returned details for doc:'}</span>
                                            <div className="grid grid-cols-5 gap-2 text-[10px] font-black border-b border-slate-100 pb-1.5 mb-1.5 text-slate-500">
                                              <div className="col-span-2">{language === 'ar' ? 'الصنف والباتش' : 'Item & Batch'}</div>
                                              <div className="text-center">{language === 'ar' ? 'الكمية الصادرة/المرجعة' : 'Issued/Returned Qty'}</div>
                                              <div className={`${language === 'ar' ? 'text-left' : 'text-right'}`}>{language === 'ar' ? 'سعر الوحدة' : 'Unit Price'}</div>
                                              <div className={`${language === 'ar' ? 'text-left' : 'text-right'}`}>{language === 'ar' ? 'الإجمالي' : 'Total'}</div>
                                            </div>
                                            {items.map((it, iIdx) => (
                                              <div key={iIdx} className="grid grid-cols-5 gap-2 text-[11px] font-bold text-slate-700">
                                                <div className="col-span-2 font-black">{it.item_name} {it.batch_no && it.batch_no !== 'N/A' ? `(باتش: ${it.batch_no})` : ''}</div>
                                                <div className="text-center font-mono">{Math.abs(it.qty)} {it.uom || (language === 'ar' ? 'وحدة' : 'unit')}</div>
                                                <div className={`font-mono ${language === 'ar' ? 'text-left' : 'text-right'}`}>{Number(it.sell_price).toLocaleString()} {language === 'ar' ? 'ش.ج' : 'ILS'}</div>
                                                <div className={`font-mono font-black text-slate-950 ${language === 'ar' ? 'text-left' : 'text-right'}`}>{(Math.abs(it.qty) * it.sell_price).toLocaleString()} {language === 'ar' ? 'ش.ج' : 'ILS'}</div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Unified Items Taken Summary Card */}
                    {expandAllStatementDetails && (
                      <div className="mt-10 bg-white border border-slate-200 p-8 rounded-[2.5rem] shadow-sm space-y-6 no-print">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                          <h3 className="text-md font-black text-slate-800 flex items-center gap-3">
                            <span>📦</span> {statementInvoiceFilter ? (language === 'ar' ? `الأصناف المستلمة للفاتورة ${statementInvoiceFilter}` : `Received Items for Invoice ${statementInvoiceFilter}`) : (language === 'ar' ? 'كشف إجمالي تراكمي بكافة الأصناف والكميات المستلمة' : 'Cumulative statement of all received items & quantities')}
                          </h3>
                          <span className="text-[10px] bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold px-3 py-1.5 rounded-lg">
                            {statementItemsSummary.length} {language === 'ar' ? 'صنف مميز' : 'unique items'}
                          </span>
                        </div>

                        <div className="overflow-x-auto">
                          <table className={`w-full ${language === 'ar' ? 'text-right' : 'text-left'} border-collapse`}>
                            <thead>
                              <tr className="border-b border-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-wider">
                                <th className="pb-3 pr-2">{language === 'ar' ? 'الصنف والباتش' : 'Item & Batch'}</th>
                                <th className="pb-3 text-center">{language === 'ar' ? 'الكمية المنصرفة' : 'Issued Qty'}</th>
                                <th className="pb-3 text-center">{language === 'ar' ? 'الكمية المرجعة' : 'Returned Qty'}</th>
                                <th className="pb-3 text-center">{language === 'ar' ? 'صافي المستلم الفعلي' : 'Net Received'}</th>
                                <th className={`pb-3 ${language === 'ar' ? 'text-left' : 'text-right'}`}>{language === 'ar' ? 'متوسط السعر' : 'Average Price'}</th>
                                <th className={`pb-3 ${language === 'ar' ? 'text-left' : 'text-right'}`}>{language === 'ar' ? 'إجمالي القيمة' : 'Total Value'}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50 text-xs font-bold text-slate-700">
                              {statementItemsSummary.length === 0 ? (
                                <tr>
                                  <td colSpan="6" className="py-8 text-center text-slate-400">
                                    {language === 'ar' ? 'لا توجد تفاصيل أصناف مسجلة لهذا العميل في هذه الفترة.' : 'No item details recorded for this customer in this period.'}
                                  </td>
                                </tr>
                              ) : (
                                statementItemsSummary.map((agg, idx) => (
                                  <tr key={idx} className="hover:bg-slate-50/50 transition-all">
                                    <td className="py-3.5 pr-2 font-black">
                                      {agg.item_name} {agg.batch_no && agg.batch_no !== 'N/A' ? `(باتش: ${agg.batch_no})` : ''}
                                    </td>
                                    <td className="py-3.5 text-center font-mono">{agg.qtyIssued} {agg.uom}</td>
                                    <td className="py-3.5 text-center font-mono text-amber-600 font-black">{agg.qtyReturned > 0 ? `${agg.qtyReturned} ${agg.uom}` : '—'}</td>
                                    <td className={`py-3.5 text-center font-mono font-black ${agg.netQty > 0 ? 'text-indigo-600' : 'text-slate-500'}`}>
                                      {agg.netQty} {agg.uom}
                                    </td>
                                    <td className={`py-3.5 font-mono ${language === 'ar' ? 'text-left' : 'text-right'}`}>{Number(agg.avgPrice).toLocaleString()} {language === 'ar' ? 'ش.ج' : 'ILS'}</td>
                                    <td className={`py-3.5 font-mono font-black text-slate-900 ${language === 'ar' ? 'text-left' : 'text-right'}`}>
                                      {Number(agg.totalAmount).toLocaleString()} {language === 'ar' ? 'ش.ج' : 'ILS'}
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                  </div>
                );
              })()
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
                <span className="text-5xl">📁</span>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">{language === 'ar' ? 'الرجاء اختيار العميل من القائمة المنسدلة أعلاه' : 'Please select a customer from the dropdown menu above'}</h3>
                <p className="text-xs text-slate-400 font-bold max-w-xs leading-relaxed">
                  {language === 'ar' ? 'سيقوم النظام آلياً بتجميع كشف الحساب المتكامل لكافة الفواتير والمرتجعات والتحصيلات والمدفوعات الخاصة بالعميل.' : 'The system will automatically compile an integrated account ledger statement containing all invoices, returns, payments, and collections for this client.'}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PRINT-ONLY AREA FOR CUSTOMER STATEMENT */}
      {selectedStatementCustomer && activeTab === 'customer_statement' && (
        <div id="statement-print-area" className="hidden print:block text-right bg-white p-8">
          <style>
            {`
              @media print {
                /* Reset high-level layouts to enable natural multi-page flowing */
                html, body, #root, #root > div, main, article, section, .space-y-6, .space-y-10 {
                  height: auto !important;
                  min-height: 0 !important;
                  overflow: visible !important;
                  position: static !important;
                  display: block !important;
                }
                body * {
                  visibility: hidden !important;
                }
                #statement-print-area, #statement-print-area * {
                  visibility: visible !important;
                }
                #statement-print-area {
                  position: absolute !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  direction: ${language === 'ar' ? 'rtl' : 'ltr'} !important;
                  height: auto !important;
                  overflow: visible !important;
                  display: block !important;
                }
                .no-print {
                  display: none !important;
                }
              }
            `}
          </style>
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-6">
            <div>
              <h1 className="text-2xl font-black text-slate-900">{language === 'ar' ? 'تيد كابيتال للتطوير العقاري والمقاولات' : 'TED CAPITAL FOR REAL ESTATE & CONTRACTING'}</h1>
              <p className="text-xs font-bold text-slate-500 mt-1">TED CAPITAL FOR REAL ESTATE & CONTRACTING</p>
              <p className="text-xs text-slate-400 mt-0.5">{language === 'ar' ? 'الرقم الضريبي: ٤٩٣-١٠٢-٥٨٤' : 'Tax ID: 493-102-584'}</p>
            </div>
            <div className="text-left">
              <div className="w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center font-black text-2xl">T</div>
              <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase mt-2">ENTERPRISE SYSTEM</p>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-black text-slate-900">{language === 'ar' ? 'كشف حساب عميل تفصيلي' : 'Detailed Customer Account Statement'}</h2>
            <p className="text-sm font-bold text-slate-600 mt-2">{language === 'ar' ? 'اسم العميل: ' : 'Customer Name: '} {selectedStatementCustomer}</p>
            <p className="text-xs text-slate-400 mt-1">{language === 'ar' ? 'تاريخ الطباعة والتوليد: ' : 'Statement Generation Date: '} {new Date().toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}</p>
          </div>

          {(() => {
            const customerEntries = ledgerEntries
              .filter(entry => 
                entry.account_name === 'عملاء (حسابات مدينة - AR)' &&
                (entry.description?.includes(selectedStatementCustomer) || false)
              )
              .sort((a, b) => new Date(a.date) - new Date(b.date));

            const totalDebit = customerEntries.reduce((sum, e) => sum + Number(e.debit || 0), 0);
            const totalCredit = customerEntries.reduce((sum, e) => sum + Number(e.credit || 0), 0);
            const balance = totalDebit - totalCredit;

            let runningBal = 0;
            const rows = customerEntries.map(entry => {
              runningBal += Number(entry.debit || 0) - Number(entry.credit || 0);
              return {
                ...entry,
                runningBalance: runningBal
              };
            });

            const filteredPrintRows = rows.filter(row => {
              return !statementInvoiceFilter || row.description?.includes(statementInvoiceFilter);
            });

            // Calculate aggregated items taken summary for printing
            let printAllItems = [];
            filteredPrintRows.forEach(row => {
              const isDebit = Number(row.debit || 0) > 0;
              const docMatch = row.description?.match(/INV-\d+/) || row.description?.match(/RTN-\d+/);
              const docNo = docMatch ? docMatch[0] : '';

              const items = salesRecords.filter(r => {
                const docMatches = docNo && r.reference_no === docNo;
                if (docMatches) return true;

                if (!r.reference_no || r.reference_no === '') {
                  const salesDateStr = (r.date || r.created_at || '').split('T')[0];
                  const rowDateStr = (row.date || row.created_at || '').split('T')[0];
                  const salesCreatedAt = new Date(r.created_at).getTime();
                  const ledgerCreatedAt = new Date(row.created_at).getTime();
                  const sameTime = Math.abs(salesCreatedAt - ledgerCreatedAt) < 60000;
                  const dateMatches = (salesDateStr === rowDateStr) || sameTime;

                  const customerMatches = r.customer_name === selectedStatementCustomer;
                  if (!dateMatches || !customerMatches) return false;

                  const isReturn = r.project_name?.includes('مرتجع') || r.reference_no?.includes('RTN');
                  return isDebit ? !isReturn : isReturn;
                }
                return false;
              });
              printAllItems.push(...items);
            });

            const printAggMap = {};
            printAllItems.forEach(it => {
              const key = `${it.item_name}_${it.batch_no || 'N/A'}`;
              if (!printAggMap[key]) {
                printAggMap[key] = {
                  item_name: it.item_name,
                  batch_no: it.batch_no || 'N/A',
                  uom: it.uom || 'وحدة',
                  qtyIssued: 0,
                  qtyReturned: 0,
                  totalAmount: 0,
                  sellPrices: []
                };
              }
              const qtyVal = Math.abs(Number(it.qty || 0));
              const sellPriceVal = Number(it.sell_price || 0);
              const isReturn = it.project_name?.includes('مرتجع') || it.reference_no?.includes('RTN');

              if (isReturn) {
                printAggMap[key].qtyReturned += qtyVal;
              } else {
                printAggMap[key].qtyIssued += qtyVal;
              }
              printAggMap[key].totalAmount += qtyVal * sellPriceVal;
              printAggMap[key].sellPrices.push(sellPriceVal);
            });

            const printItemsSummary = Object.values(printAggMap).map(agg => {
              const avgPrice = agg.sellPrices.length > 0 
                ? agg.sellPrices.reduce((a, b) => a + b, 0) / agg.sellPrices.length
                : 0;
              return {
                ...agg,
                netQty: agg.qtyIssued - agg.qtyReturned,
                avgPrice: avgPrice.toFixed(2)
              };
            });

            return (
              <div className="space-y-6">
                <table className="w-full text-right border-collapse text-xs border border-slate-300">
                  <thead>
                    <tr className="bg-slate-100 text-slate-900 border-b border-slate-300 font-black">
                      <th className="p-3 border-r border-slate-300">{language === 'ar' ? 'التاريخ' : 'Date'}</th>
                      <th className="p-3 border-r border-slate-300">{language === 'ar' ? 'تفاصيل الحركة والقيد' : 'Transaction Details'}</th>
                      <th className={`p-3 border-r border-slate-300 ${language === 'ar' ? 'text-left' : 'text-right'}`}>{language === 'ar' ? 'مدين (+)' : 'Debit (+)'}</th>
                      <th className={`p-3 border-r border-slate-300 ${language === 'ar' ? 'text-left' : 'text-right'}`}>{language === 'ar' ? 'دائن (-)' : 'Credit (-)'}</th>
                      <th className={`p-3 ${language === 'ar' ? 'text-left' : 'text-right'}`}>{language === 'ar' ? 'الرصيد التراكمي' : 'Rolling Balance'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-slate-800">
                    {rows.map((row) => {
                      const matchesInvoiceFilter = !statementInvoiceFilter || row.description?.includes(statementInvoiceFilter);
                      if (!matchesInvoiceFilter) return null;

                      const isDebit = Number(row.debit || 0) > 0;
                      const docMatch = row.description?.match(/INV-\d+/) || row.description?.match(/RTN-\d+/);
                      const docNo = docMatch ? docMatch[0] : '';

                      const items = salesRecords.filter(r => {
                        const docMatches = docNo && r.reference_no === docNo;
                        if (docMatches) return true;

                        if (!r.reference_no || r.reference_no === '') {
                          const dateMatches = r.date?.split('T')[0] === row.date?.split('T')[0];
                          const customerMatches = r.customer_name === selectedStatementCustomer;
                          return dateMatches && customerMatches && (isDebit ? Number(r.qty) < 0 : Number(r.qty) > 0);
                        }
                        return false;
                      });

                      return (
                        <React.Fragment key={row.id}>
                          <tr>
                            <td className="p-3 border-r border-slate-300">{row.date?.split('T')[0]}</td>
                            <td className="p-3 border-r border-slate-300 font-bold">{row.description}</td>
                            <td className={`p-3 border-r border-slate-300 ${language === 'ar' ? 'text-left' : 'text-right'} font-mono font-bold text-emerald-600`}>
                              {row.debit > 0 ? `+${Number(row.debit).toLocaleString()} ${language === 'ar' ? 'ش.ج' : 'ILS'}` : '—'}
                            </td>
                            <td className={`p-3 border-r border-slate-300 ${language === 'ar' ? 'text-left' : 'text-right'} font-mono font-bold text-rose-500`}>
                              {row.credit > 0 ? `-${Number(row.credit).toLocaleString()} ${language === 'ar' ? 'ش.ج' : 'ILS'}` : '—'}
                            </td>
                            <td className={`p-3 ${language === 'ar' ? 'text-left' : 'text-right'} font-mono font-black text-slate-955 bg-slate-50`}>
                              {Number(row.runningBalance).toLocaleString()} {language === 'ar' ? 'ش.ج' : 'ILS'}
                            </td>
                          </tr>
                          {expandAllStatementDetails && items.length > 0 && (
                            <tr>
                              <td colSpan="5" className={`p-3 bg-slate-50/50 border-r border-slate-300 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                                <div className="pr-12 space-y-1.5">
                                  <table className="w-full text-right border-collapse text-[10px] font-bold border border-slate-200 bg-white">
                                    <thead>
                                      <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                                        <th className="p-2 border-r border-slate-200">{language === 'ar' ? 'اسم الصنف والباتش' : 'Item Name & Batch'}</th>
                                        <th className="p-2 border-r border-slate-200 text-center">{language === 'ar' ? 'الكمية' : 'Qty'}</th>
                                        <th className={`p-2 border-r border-slate-200 ${language === 'ar' ? 'text-left' : 'text-right'}`}>{language === 'ar' ? 'سعر الوحدة' : 'Unit Price'}</th>
                                        <th className={`p-2 ${language === 'ar' ? 'text-left' : 'text-right'}`}>{language === 'ar' ? 'الإجمالي' : 'Total'}</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {items.map((it, iIdx) => (
                                        <tr key={iIdx} className="border-b border-slate-100">
                                          <td className="p-2 border-r border-slate-200">{it.item_name} {it.batch_no && it.batch_no !== 'N/A' ? `(باتش: ${it.batch_no})` : ''}</td>
                                          <td className="p-2 border-r border-slate-200 text-center">{Math.abs(it.qty)} {it.uom || (language === 'ar' ? 'وحدة' : 'unit')}</td>
                                          <td className={`p-2 border-r border-slate-200 font-mono ${language === 'ar' ? 'text-left' : 'text-right'}`}>{Number(it.sell_price).toLocaleString()} {language === 'ar' ? 'ش.ج' : 'ILS'}</td>
                                          <td className={`p-2 font-mono font-black ${language === 'ar' ? 'text-left' : 'text-right'}`}>{(Math.abs(it.qty) * it.sell_price).toLocaleString()} {language === 'ar' ? 'ش.ج' : 'ILS'}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>

                <div className={`flex ${language === 'ar' ? 'justify-end' : 'justify-start'} pt-6`}>
                  <div className="w-80 border border-slate-400 p-4 space-y-2 bg-slate-50 text-xs">
                    <div className="flex justify-between font-bold">
                      <span>{language === 'ar' ? 'إجمالي المبيعات:' : 'Total Sales:'}</span>
                      <span>{totalDebit.toLocaleString()} {language === 'ar' ? 'ش.ج' : 'ILS'}</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span>{language === 'ar' ? 'إجمالي المسدد/المرتجع:' : 'Total Returns/Payments:'}</span>
                      <span>{totalCredit.toLocaleString()} {language === 'ar' ? 'ش.ج' : 'ILS'}</span>
                    </div>
                    <div className="flex justify-between font-black border-t border-slate-400 pt-2 text-sm text-slate-950">
                      <span>{language === 'ar' ? 'الرصيد النهائي المستحق:' : 'Outstanding Final Balance:'}</span>
                      <span>{balance.toLocaleString()} {language === 'ar' ? 'ش.ج' : 'ILS'}</span>
                    </div>
                  </div>
                </div>

                {/* Printed Cumulative Items Taken Summary */}
                {expandAllStatementDetails && printItemsSummary.length > 0 && (
                  <div className="pt-6 space-y-3">
                    <h3 className="text-xs font-black text-slate-900 border-b-2 border-slate-950 pb-2">
                      📦 {statementInvoiceFilter ? (language === 'ar' ? `الأصناف المستلمة للفاتورة ${statementInvoiceFilter}:` : `Received Items for Invoice ${statementInvoiceFilter}:`) : (language === 'ar' ? 'كشف إجمالي تراكمي بالأصناف والكميات المستلمة:' : 'Cumulative Statement of All Received Items & Quantities:')}
                    </h3>
                    <table className={`w-full ${language === 'ar' ? 'text-right' : 'text-left'} border-collapse text-[10px] border border-slate-300`}>
                      <thead>
                        <tr className="bg-slate-100 text-slate-900 border-b border-slate-300 font-bold">
                          <th className="p-2 border-r border-slate-300">{language === 'ar' ? 'الصنف والباتش' : 'Item & Batch'}</th>
                          <th className="p-2 border-r border-slate-300 text-center">{language === 'ar' ? 'الكمية المنصرفة' : 'Issued Qty'}</th>
                          <th className="p-2 border-r border-slate-300 text-center">{language === 'ar' ? 'الكمية المرجعة' : 'Returned Qty'}</th>
                          <th className="p-2 border-r border-slate-300 text-center">{language === 'ar' ? 'صافي المستلم' : 'Net Received'}</th>
                          <th className={`p-2 border-r border-slate-300 ${language === 'ar' ? 'text-left' : 'text-right'}`}>{language === 'ar' ? 'متوسط السعر' : 'Average Price'}</th>
                          <th className={`p-2 ${language === 'ar' ? 'text-left' : 'text-right'}`}>{language === 'ar' ? 'إجمالي القيمة' : 'Total Value'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-slate-800">
                        {printItemsSummary.map((agg, idx) => (
                          <tr key={idx}>
                            <td className="p-2 border-r border-slate-300 font-bold">{agg.item_name} {agg.batch_no && agg.batch_no !== 'N/A' ? `(باتش: ${agg.batch_no})` : ''}</td>
                            <td className="p-2 border-r border-slate-300 text-center font-mono">{agg.qtyIssued} {agg.uom}</td>
                            <td className="p-2 border-r border-slate-300 text-center font-mono">{agg.qtyReturned > 0 ? `${agg.qtyReturned} ${agg.uom}` : '—'}</td>
                            <td className="p-2 border-r border-slate-300 text-center font-mono font-bold bg-slate-50">{agg.netQty} {agg.uom}</td>
                            <td className={`p-2 border-r border-slate-300 font-mono ${language === 'ar' ? 'text-left' : 'text-right'}`}>{Number(agg.avgPrice).toLocaleString()} {language === 'ar' ? 'ش.ج' : 'ILS'}</td>
                            <td className={`p-2 font-mono font-black ${language === 'ar' ? 'text-left' : 'text-right'}`}>{Number(agg.totalAmount).toLocaleString()} {language === 'ar' ? 'ش.ج' : 'ILS'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-6 text-center text-xs font-black text-slate-700 pt-16">
                  <div className="space-y-12">
                    <span>{language === 'ar' ? 'إعداد الحسابات وتدقيقها' : 'Prepared & Audited By'}</span>
                    <div className="border-b border-dashed border-slate-400 w-32 mx-auto"></div>
                  </div>
                  <div className="space-y-12">
                    <span>{language === 'ar' ? 'المدير المالي والاعتماد' : 'Chief Financial Officer (CFO)'}</span>
                    <div className="border-b border-dashed border-slate-400 w-32 mx-auto"></div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* INVOICE / CREDIT NOTE PRINT MODAL OVERLAY */}
      {showInvoiceModal && activeInvoiceData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto print:p-0 print:bg-white">
          
          <style>
            {`
              @media print {
                /* Reset high-level layouts to enable natural multi-page flowing */
                html, body, #root, #root > div, main, article, section, .space-y-6, .space-y-10 {
                  height: auto !important;
                  min-height: 0 !important;
                  overflow: visible !important;
                  position: static !important;
                  display: block !important;
                }
                body * {
                  visibility: hidden !important;
                }
                #invoice-print-area, #invoice-print-area * {
                  visibility: visible !important;
                }
                #invoice-print-area {
                  position: absolute !important;
                  left: 0 !important;
                  top: 0 !important;
                  width: 100% !important;
                  direction: ${language === 'ar' ? 'rtl' : 'ltr'} !important;
                  background: white !important;
                  color: black !important;
                  padding: 20px !important;
                  height: auto !important;
                  overflow: visible !important;
                  display: block !important;
                }
                .no-print {
                  display: none !important;
                }
              }
            `}
          </style>
          
          <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className={`text-white p-6 flex justify-between items-center transition-colors duration-500 no-print ${activeInvoiceData.type === 'issue' ? 'bg-slate-900' : 'bg-amber-900'}`}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{activeInvoiceData.type === 'issue' ? '🧾' : '🔄'}</span>
                <span className="font-black text-sm">
                  {activeInvoiceData.type === 'issue' ? (language === 'ar' ? 'فاتورة مبيعات وصرف مخزني مباشر' : 'Sales Invoice & Direct Stock Issue') : (language === 'ar' ? 'إشعار دائن - مرتجع مبيعات وصرف مباشر' : 'Sales Return & Settled Credit Note')}
                </span>
              </div>
              <button 
                type="button"
                onClick={() => { setShowInvoiceModal(false); setActiveInvoiceData(null); }}
                className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center font-black text-sm transition-all"
              >
                ✕
              </button>
            </div>

            {/* Modal Print Area Container */}
            <div className="p-8 max-h-[70vh] overflow-y-auto custom-scrollbar" id="invoice-print-area">
              
              {/* Corporate Identity Header */}
              <div className={`flex justify-between items-start border-b-2 pb-6 mb-6 ${activeInvoiceData.type === 'issue' ? 'border-slate-900' : 'border-amber-700'}`}>
                <div>
                  <h1 className="text-2xl font-black text-slate-900">{language === 'ar' ? 'تيد كابيتال للتطوير العقاري والمقاولات' : 'TED CAPITAL FOR REAL ESTATE & CONTRACTING'}</h1>
                  <p className="text-xs font-bold text-slate-500 mt-1">TED CAPITAL FOR REAL ESTATE & CONTRACTING</p>
                  <p className="text-xs text-slate-400 mt-0.5">{language === 'ar' ? 'الرقم الضريبي: ٤٩٣-١٠٢-٥٨٤' : 'Tax ID: 493-102-584'}</p>
                </div>
                <div className="text-left">
                  <div className={`w-12 h-12 text-white rounded-2xl flex items-center justify-center font-black text-2xl mx-auto md:mx-0 ${activeInvoiceData.type === 'issue' ? 'bg-slate-900' : 'bg-amber-900'}`}>T</div>
                  <p className="text-[10px] font-black tracking-widest text-slate-400 uppercase mt-2">ENTERPRISE SYSTEM</p>
                </div>
              </div>

              {/* Document Metadata Row */}
              <div className={`grid grid-cols-2 md:grid-cols-4 gap-6 p-6 rounded-2xl border mb-6 ${activeInvoiceData.type === 'issue' ? 'bg-slate-50 border-slate-200/60' : 'bg-amber-50/30 border-amber-200/40'}`}>
                <div>
                  <span className="text-[10px] font-black text-slate-400 block mb-1">
                    {activeInvoiceData.type === 'issue' ? (language === 'ar' ? 'رقم الفاتورة' : 'Invoice Number') : (language === 'ar' ? 'رقم الإشعار الدائن' : 'Credit Note Number')}
                  </span>
                  <span className="text-xs font-black text-slate-800">{activeInvoiceData.invoiceNo}</span>
                </div>
                <div>
                  <span className="text-[10px] font-black text-slate-400 block mb-1">{language === 'ar' ? 'تاريخ المعاملة' : 'Transaction Date'}</span>
                  <span className="text-xs font-black text-slate-800">{activeInvoiceData.date}</span>
                </div>
                <div>
                  <span className="text-[10px] font-black text-slate-400 block mb-1">{language === 'ar' ? 'العميل المستلم' : 'Recipient Customer'}</span>
                  <span className="text-xs font-black text-slate-800">{activeInvoiceData.customerName}</span>
                </div>
                <div>
                  <span className="text-[10px] font-black text-slate-400 block mb-1">
                    {activeInvoiceData.type === 'issue' ? (language === 'ar' ? 'المستودع المصدر' : 'Source Warehouse') : (language === 'ar' ? 'مستودع الاستلام' : 'Destination Warehouse')}
                  </span>
                  <span className="text-xs font-black text-slate-800">{activeInvoiceData.warehouse}</span>
                </div>
              </div>

              {/* Items Table */}
              <table className={`w-full ${language === 'ar' ? 'text-right' : 'text-left'} border-collapse mb-8`}>
                <thead>
                  <tr className={`border-b-2 text-xs font-black text-slate-800 ${activeInvoiceData.type === 'issue' ? 'border-slate-950 bg-slate-100/50' : 'border-amber-900 bg-amber-100/30'}`}>
                    <th className="py-3 px-2">{language === 'ar' ? 'م' : 'No'}</th>
                    <th className="py-3 px-2">{language === 'ar' ? 'اسم الصنف والباتش' : 'Item Name & Batch'}</th>
                    <th className="py-3 px-2 text-center">{language === 'ar' ? 'الوحدة' : 'UOM'}</th>
                    <th className="py-3 px-2 text-center">{activeInvoiceData.type === 'issue' ? (language === 'ar' ? 'الالكمية الصادرة' : 'Issued Qty') : (language === 'ar' ? 'الالكمية المرجعة' : 'Returned Qty')}</th>
                    <th className={`py-3 px-2 ${language === 'ar' ? 'text-left' : 'text-right'}`}>{activeInvoiceData.type === 'issue' ? (language === 'ar' ? 'سعر الوحدة' : 'Unit Price') : (language === 'ar' ? 'سعر المرتجع' : 'Return Price')}</th>
                    <th className={`py-3 px-2 ${language === 'ar' ? 'text-left' : 'text-right'}`}>{language === 'ar' ? 'الإجمالي' : 'Total'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs font-bold text-slate-700">
                  {activeInvoiceData.lines.map((line, idx) => (
                    <tr key={idx} className="border-b border-slate-100">
                      <td className="py-3 px-2">{idx + 1}</td>
                      <td className="py-3 px-2">
                        {line.item_name} {line.batch_no && line.batch_no !== 'N/A' ? `(باتش: ${line.batch_no})` : ''}
                      </td>
                      <td className="py-3 px-2 text-center">{line.uom}</td>
                      <td className="py-3 px-2 text-center font-black">{line.qty}</td>
                      <td className={`py-3 px-2 font-black ${language === 'ar' ? 'text-left' : 'text-right'}`}>{Number(line.unit_price).toLocaleString()} {language === 'ar' ? 'ش.ج' : 'ILS'}</td>
                      <td className={`py-3 px-2 font-black ${language === 'ar' ? 'text-left' : 'text-right'}`}>{Number(line.total).toLocaleString()} {language === 'ar' ? 'ش.ج' : 'ILS'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Financial Waterfall Panel */}
              <div className={`flex ${language === 'ar' ? 'justify-end' : 'justify-start'} mb-12`}>
                <div className={`w-full max-w-sm space-y-3 p-5 rounded-2xl border ${activeInvoiceData.type === 'issue' ? 'bg-slate-50 border-slate-200/80' : 'bg-amber-50/20 border-amber-200/60'}`}>
                  <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                    <span>{language === 'ar' ? 'الإجمالي قبل الضريبة:' : 'Subtotal (Excl. Tax):'}</span>
                    <span>{Number(activeInvoiceData.subtotal).toLocaleString()} {language === 'ar' ? 'ش.ج' : 'ILS'}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                    <span>{language === 'ar' ? 'ضريبة القيمة المضافة (14%):' : 'VAT (14%):'}</span>
                    <span>{Number(activeInvoiceData.taxAmount).toLocaleString()} {language === 'ar' ? 'ش.ج' : 'ILS'}</span>
                  </div>
                  {activeInvoiceData.discount > 0 && (
                    <div className="flex justify-between items-center text-xs font-bold text-rose-500">
                      <span>{activeInvoiceData.type === 'issue' ? (language === 'ar' ? 'خصم تجاري مباشر:' : 'Direct Discount:') : (language === 'ar' ? 'تنزيل قيمة المرتجع:' : 'Return Value Reduced:')}</span>
                      <span>-{Number(activeInvoiceData.discount).toLocaleString()} {language === 'ar' ? 'ش.ج' : 'ILS'}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center pt-3 border-t border-slate-200 text-sm font-black text-slate-900">
                    <span>
                      {activeInvoiceData.type === 'issue' ? (language === 'ar' ? 'الصافي النهائي المستحق:' : 'Net Outstanding Payable:') : (language === 'ar' ? 'الصافي المالي المسترد للعميل:' : 'Net Refundable to Customer:')}
                    </span>
                    <span className={`text-lg ${activeInvoiceData.type === 'issue' ? 'text-indigo-700' : 'text-amber-700'}`}>
                      {Number(activeInvoiceData.grandTotal).toLocaleString()} {language === 'ar' ? 'ش.ج' : 'ILS'}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-bold border-t border-slate-100 pt-2 flex justify-between">
                    <span>{activeInvoiceData.type === 'issue' ? (language === 'ar' ? 'طريقة السداد:' : 'Payment Mode:') : (language === 'ar' ? 'طريقة تسوية المردودات:' : 'Refund Settlement Mode:')}</span>
                    <span>{activeInvoiceData.paymentMethod}</span>
                  </div>
                </div>
              </div>

              {/* Corporate Signatures Footer */}
              <div className="grid grid-cols-3 gap-6 text-center text-xs font-black text-slate-700 border-t border-slate-200 pt-10 mt-12">
                <div className="space-y-12">
                  <span>{activeInvoiceData.type === 'issue' ? (language === 'ar' ? 'توقيع أمين المستودع' : 'Storekeeper Signature') : (language === 'ar' ? 'توقيع المستلم بالمستودع' : 'Store Recipient Signature')}</span>
                  <div className="border-b border-dashed border-slate-400 w-32 mx-auto"></div>
                </div>
                <div className="space-y-12">
                  <span>{activeInvoiceData.type === 'issue' ? (language === 'ar' ? 'توقيع العميل المستلم' : 'Recipient Customer Signature') : (language === 'ar' ? 'توقيع العميل المرجع' : 'Returning Customer Signature')}</span>
                  <div className="border-b border-dashed border-slate-400 w-32 mx-auto"></div>
                </div>
                <div className="space-y-12">
                  <span>{language === 'ar' ? 'المدير المالي والاعتماد' : 'Chief Financial Officer (CFO)'}</span>
                  <div className="border-b border-dashed border-slate-400 w-32 mx-auto"></div>
                </div>
              </div>

            </div>

            {/* Modal Footer Controls */}
            <div className="bg-slate-50 border-t border-slate-100 p-6 flex justify-end gap-4 no-print">
              <button
                type="button"
                onClick={() => { setShowInvoiceModal(false); setActiveInvoiceData(null); }}
                className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-black text-xs transition-all active:scale-95 cursor-pointer"
              >
                {language === 'ar' ? 'إغلاق النافذة' : 'Close Window'}
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className={`px-8 py-3 text-white rounded-xl font-black text-xs shadow-lg transition-all active:scale-95 cursor-pointer flex items-center gap-2 ${activeInvoiceData.type === 'issue' ? 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-600/20' : 'bg-amber-600 hover:bg-amber-700 hover:shadow-amber-600/20'}`}
              >
                <span>🖨️</span> {activeInvoiceData.type === 'issue' ? (language === 'ar' ? 'طباعة الفاتورة الفورية' : 'Print Invoice') : (language === 'ar' ? 'طباعة الإشعار الدائن الفوري' : 'Print Credit Note')}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
