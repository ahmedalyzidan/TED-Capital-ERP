import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

export default function PharmaSupplyChain() {
   const { language, theme } = useLanguage();
   const [activeTab, setActiveTab] = useState('shipments'); // shipments, items, expenses, currencies
   const [loading, setLoading] = useState(false);

   // Translations Object
   const translations = {
      ar: {
         title: "محرك سلاسل الإمداد والتكاليف الحدية",
         subtitle: "إدارة البضاعة بالطريق، توزيع مصاريف الشحن بالحجم (CBM)، ونشرة أسعار الصرف لـ PRIMEMED PHARMA",
         syncing: "جاري مزامنة بيانات سلاسل الإمداد...",
         tabs: {
            shipments: "تتبع الشحنات الدولية",
            items: "أصناف الشحنة والمناولة CBM",
            expenses: "رسملة المصاريف والتكاليف الحدية",
            currencies: "نشرة أسعار الصرف والعملات"
         },
         shipments: {
            header: "سجل الشحنات الدولية (بضاعة بالطريق)",
            sub: "تتبع مسار الأدوية من مستودعات مصر حتى الوصول لمخازن غزة",
            createBtn: "إنشاء شحنة جديدة (بضاعة بالطريق)",
            egypt: "مصر",
            border: "المعبر",
            gaza: "غزة",
            invVal: "قيمة الفاتورة الأصلية:",
            shippingExp: "مصاريف الشحن والمعابر:",
            landedCost: "التكلفة الحدية (Landed Cost):",
            itemsBtn: "أصناف الشحنة (CBM)",
            expBtn: "عرض المصاريف",
            registered: "مسجل",
            updatePath: "تحديث مسار الشحنة:",
            edit: "تعديل",
            delete: "حذف"
         },
         items: {
            header: "أصناف الشحنة وحسابات الحجم (CBM Volume Proration)",
            sub: "توزيع مصاريف الشحن والمعابر والتخليص على الأدوية بناءً على حجم العبوة (CBM) بدلاً من القيمة",
            filterAll: "-- كافة الشحنات الدولية --",
            createBtn: "إضافة صنف جديد للشحنة",
            metrics: {
               buyVal: "إجمالي قيمة الشراء (ILS)",
               buyValSub: "القيمة الأساسية للفواتير بالعملة المحلية",
               shipExp: "إجمالي مصاريف الشحن (ILS)",
               shipExpSub: "نصيب الأصناف المعروضة من الجمارك والنولون",
               landedVal: "التكلفة الحدية الإجمالية (ILS)",
               landedValSub: "القيمة الدفترية الإجمالية (IFRS IAS 2)",
               efficiency: "معامل كفاءة الشحن (Overhead %)",
               efficiencySub: "نسبة المصاريف الإضافية إلى التكلفة الأساسية",
               excellent: "ممتاز (كفاءة عالية)",
               good: "جيد (ضمن المعدل)",
               high: "مرتفع (يحتاج مراجعة النولون)"
            },
            table: {
               shipNo: "رقم الشحنة",
               itemName: "اسم الصنف الدوائي",
               qty: "الكمية (عبوة)",
               buyPrice: "سعر الشراء (FCY)",
               unitCbm: "حجم الوحدة (CBM)",
               totalCbm: "إجمالي الحجم (CBM)",
               shipShare: "نصيب الشحن (ILS)",
               landedUnit: "التكلفة الحدية للعبوة (ILS)",
               actions: "الإجراءات",
               batch: "تشغيلة:",
               expiry: "صلاحية:"
            }
         },
         expenses: {
            header: "رسملة مصاريف الشحن والتخليص والمعابر",
            sub: "إضافة النولون، الإكراميات، الجمارك، والتأمين لحساب التكلفة الحدية للشحنة",
            createBtn: "تسجيل مصروف شحن جديد",
            table: {
               shipNo: "رقم الشحنة",
               expType: "بند المصروف",
               paidTo: "الجهة المستفيدة",
               amount: "المبلغ الأصلي",
               rate: "سعر الصرف (ILS)",
               amountIls: "المبلغ المقابل بالشيكل",
               ref: "المرجع",
               actions: "الإجراءات",
               defaultNotes: "مصاريف نقل وتخليص",
               defaultPaidTo: "مخلص جمركي / ناقل"
            }
         },
         currencies: {
            header: "نشرة أسعار الصرف وإدارة العملات",
            sub: "تحديث أسعار صرف العملات مقابل الشيكل الإسرائيلي (ILS) لتقييم المخزون وتحصيل المبيعات",
            createBtn: "تحديث سعر صرف عملة",
            approved: "العملة المعتمدة",
            rateLabel: "سعر الصرف المعتمد (مقابل 1 شيكل):",
            lastUpdate: "آخر تحديث:"
         },
         modals: {
            cancel: "إلغاء",
            shipment: {
               addTitle: "إنشاء شحنة دولية جديدة (بضاعة بالطريق)",
               editTitle: "تعديل بيانات الشحنة الدولية",
               shipNo: "رقم بوليصة الشحن / الشحنة *",
               currency: "عملة الشراء الأصلية *",
               origin: "نقطة الانطلاق (المصدر) *",
               dest: "نقطة الوصول (المستودع) *",
               initVal: "قيمة الفاتورة الأصلية *",
               initValHolder: "مثال: 50000",
               rate: "سعر الصرف المبدئي (مقابل الشيكل) *",
               notes: "ملاحظات الشحنة / تفاصيل الأدوية",
               notesHolder: "اكتب تفاصيل الأصناف المحملة في هذه الشحنة...",
               addSubmit: "إنشاء الشحنة وإدراجها بالدفاتر",
               editSubmit: "حفظ التعديلات"
            },
            item: {
               addTitle: "إضافة صنف دوائي للشحنة (حساب الحجم CBM)",
               editTitle: "تعديل بيانات الصنف الدوائي (حساب الحجم CBM)",
               shipSelect: "الشحنة الدولية المرتبطة *",
               shipSelectHolder: "-- اختر الشحنة --",
               name: "اسم الصنف الدوائي / المستلزم *",
               nameHolder: "مثال: بنادول أدفانس 500مجم",
               qty: "الكمية المشحونة (عبوة) *",
               qtyHolder: "مثال: 10000",
               buyPrice: "سعر الشراء (عملة الشحنة) *",
               buyPriceHolder: "مثال: 2.50",
               cbm: "حجم العبوة (CBM) *",
               batchNo: "رقم التشغيلة (Batch No)",
               expiry: "تاريخ الصلاحية (Expiry Date)",
               addSubmit: "إضافة الصنف للشحنة وتوزيع الشحن (CBM)",
               editSubmit: "حفظ تعديلات الصنف وإعادة توزيع الشحن"
            },
            expense: {
               addTitle: "تسجيل مصروف شحن وتخليص (رسملة التكلفة)",
               editTitle: "تعديل مصروف الشحن والتخليص (رسملة التكلفة)",
               shipSelect: "الشحنة الدولية المرتبطة *",
               shipSelectHolder: "-- اختر الشحنة --",
               type: "بند المصروف (نوع التكلفة) *",
               types: {
                  t1: "نقل بري وشحن داخل مصر",
                  t2: "تخليص جمركي ورسوم حدودية",
                  t3: "رسوم معابر (رفح / كرم أبو سالم)",
                  t4: "تأمين وحراسة وتأمين مخاطر",
                  t5: "إكراميات ومصاريف نثرية طارئة"
               },
               amount: "المبلغ المدفوع *",
               amountHolder: "مثال: 15000",
               currency: "عملة الدفع *",
               rate: "سعر الصرف (مقابل الشيكل) *",
               paidTo: "الجهة المستفيدة (المدفوع لأمره)",
               paidToHolder: "مثال: شركة أبناء سيناء / مخلص جمركي",
               ref: "رقم المرجع / الإيصال",
               refHolder: "مثال: REC-2026-991",
               notes: "ملاحظات وتفاصيل المصروف",
               notesHolder: "اكتب تفاصيل المصروف وسبب الدفع...",
               addSubmit: "تسجيل المصروف ورسملته على الشحنة",
               editSubmit: "حفظ تعديلات المصروف وإعادة الرسملة"
            },
            currency: {
               addTitle: "تحديث نشرة أسعار الصرف (مقابل الشيكل)",
               editTitle: "تعديل سعر الصرف بالدفاتر",
               code: "رمز العملة *",
               codeHolder: "-- اختر العملة --",
               name: "اسم العملة *",
               nameHolder: "مثال: US Dollar",
               rate: "سعر الصرف الجديد (مقابل 1 شيكل) *",
               rateHolder: "مثال: 3.7500",
               addSubmit: "حفظ وتحديث نشرة الصرف",
               editSubmit: "حفظ التعديل وتحديث النشرة"
            }
         },
         status: {
            Pending_Departure: 'قيد المغادرة (مصر)',
            In_Transit_Customs: 'شحن وتخليص جمركي',
            At_Border_Crossing: 'في المعبر (رفح/كرم أبو سالم)',
            Arrived_Gaza_Warehouse: 'وصلت مستودع غزة (تمت الرسملة)',
            Completed: 'مكتمل وموزع'
         },
         alerts: {
            deleteConfirm: "⚠️ هل أنت متأكد من رغبتك في حذف هذا السجل؟ سيتم إعادة احتساب التكاليف الحدية وتوزيع الشحن آلياً.",
            deleteSuccess: "✅ تم حذف السجل بنجاح وإعادة ضبط الحسابات!",
            deleteErr: "حدث خطأ أثناء الحذف",
            shipEditSuccess: "✅ تم تعديل الشحنة بنجاح!",
            shipAddSuccess: "✅ تم إنشاء الشحنة بنجاح وإدراجها كبضاعة بالطريق!",
            shipErr: "حدث خطأ أثناء حفظ الشحنة",
            itemEditSuccess: "✅ تم تعديل الصنف وحساب حجمه CBM وتوزيع الشحن بنجاح!",
            itemAddSuccess: "✅ تم إضافة الصنف للشحنة وحساب حجمه CBM وتوزيع الشحن بنجاح!",
            itemErr: "حدث خطأ أثناء حفظ الصنف",
            expEditSuccess: "✅ تم تعديل المصروف ورسملته على الشحنة وتوزيعه بالحجم CBM بنجاح!",
            expAddSuccess: "✅ تم تسجيل المصروف ورسملته على الشحنة وتوزيعه بالحجم CBM بنجاح!",
            expErr: "حدث خطأ أثناء حفظ المصروف",
            currEditSuccess: "✅ تم تعديل سعر الصرف بنجاح!",
            currAddSuccess: "✅ تم تحديث نشرة أسعار الصرف بنجاح!",
            currErr: "حدث خطأ أثناء حفظ العملة",
            statusSuccess: "✅ تم تحديث حالة الشحنة إلى: ",
            statusErr: "حدث خطأ أثناء تحديث الحالة"
         }
      },
      en: {
         title: "Supply Chain & Landed Cost Engine",
         subtitle: "In-Transit Goods Management, CBM Freight Proration & Exchange Rate Bulletin for PRIMEMED PHARMA",
         syncing: "Synchronizing Supply Chain Data...",
         tabs: {
            shipments: "International Shipments Tracker",
            items: "Shipment Items & CBM Proration",
            expenses: "Expense Capitalization & Landed Cost",
            currencies: "Exchange Rates Bulletin"
         },
         shipments: {
            header: "International Shipments Log (In-Transit)",
            sub: "Tracking pharmaceutical consignments from Egypt warehouses to Gaza main distribution center",
            createBtn: "Create New Shipment (In-Transit)",
            egypt: "Egypt",
            border: "Border Crossing",
            gaza: "Gaza",
            invVal: "Original Invoice Value:",
            shippingExp: "Freight & Border Expenses:",
            landedCost: "Landed Cost (IFRS IAS 2):",
            itemsBtn: "Shipment Items (CBM)",
            expBtn: "View Expenses",
            registered: "Registered",
            updatePath: "Update Journey Status:",
            edit: "Edit",
            delete: "Delete"
         },
         items: {
            header: "Shipment Items & CBM Volume Proration",
            sub: "Allocating freight, customs & crossing fees across pharmaceuticals based on CBM package volume rather than value",
            filterAll: "-- All International Shipments --",
            createBtn: "Add New Shipment Item",
            metrics: {
               buyVal: "Total Purchase Value (ILS)",
               buyValSub: "Base invoice value in local currency",
               shipExp: "Total Freight Expenses (ILS)",
               shipExpSub: "Allocated customs and freight share",
               landedVal: "Total Landed Value (ILS)",
               landedValSub: "Total book value (IFRS IAS 2)",
               efficiency: "Freight Overhead Ratio (%)",
               efficiencySub: "Ratio of additional expenses to base cost",
               excellent: "Excellent (High Efficiency)",
               good: "Good (Average Range)",
               high: "High (Review Freight Rates)"
            },
            table: {
               shipNo: "Shipment No",
               itemName: "Pharmaceutical Item Name",
               qty: "Quantity (Pack)",
               buyPrice: "Buy Price (FCY)",
               unitCbm: "Unit CBM (m³)",
               totalCbm: "Total CBM (m³)",
               shipShare: "Freight Share (ILS)",
               landedUnit: "Landed Unit Cost (ILS)",
               actions: "Actions",
               batch: "Batch:",
               expiry: "Expiry:"
            }
         },
         expenses: {
            header: "Capitalizing Freight, Customs & Border Expenses",
            sub: "Adding freight, tips, customs & insurance to calculate the shipment's true landed cost",
            createBtn: "Log New Freight Expense",
            table: {
               shipNo: "Shipment No",
               expType: "Expense Type",
               paidTo: "Beneficiary / Paid To",
               amount: "Original Amount",
               rate: "Exchange Rate (ILS)",
               amountIls: "Equivalent in ILS",
               ref: "Reference",
               actions: "Actions",
               defaultNotes: "Freight & Clearance Expenses",
               defaultPaidTo: "Customs Broker / Carrier"
            }
         },
         currencies: {
            header: "Exchange Rates Bulletin & Currency Management",
            sub: "Updating currency exchange rates against Israeli Shekel (ILS) for inventory valuation and sales collection",
            createBtn: "Update Exchange Rate",
            approved: "Approved Currency",
            rateLabel: "Approved Exchange Rate (per 1 ILS):",
            lastUpdate: "Last Updated:"
         },
         modals: {
            cancel: "Cancel",
            shipment: {
               addTitle: "Create New International Shipment (In-Transit)",
               editTitle: "Edit International Shipment Details",
               shipNo: "Waybill / Shipment No *",
               currency: "Original Purchase Currency *",
               origin: "Point of Origin (Source) *",
               dest: "Destination Warehouse *",
               initVal: "Original Invoice Value *",
               initValHolder: "Example: 50000",
               rate: "Initial Exchange Rate (vs ILS) *",
               notes: "Shipment Notes / Pharma Details",
               notesHolder: "Enter details of loaded items in this shipment...",
               addSubmit: "Create Shipment & Post to Ledger",
               editSubmit: "Save Changes"
            },
            item: {
               addTitle: "Add Pharma Item to Shipment (CBM Proration)",
               editTitle: "Edit Pharma Item Details (CBM Proration)",
               shipSelect: "Linked International Shipment *",
               shipSelectHolder: "-- Select Shipment --",
               name: "Pharma Item / Consumable Name *",
               nameHolder: "Example: Panadol Advance 500mg",
               qty: "Shipped Quantity (Pack) *",
               qtyHolder: "Example: 10000",
               buyPrice: "Purchase Price (Shipment Currency) *",
               buyPriceHolder: "Example: 2.50",
               cbm: "Package Volume (CBM) *",
               batchNo: "Batch Number (Batch No)",
               expiry: "Expiry Date",
               addSubmit: "Add Item to Shipment & Prorate Freight (CBM)",
               editSubmit: "Save Item Changes & Re-prorate Freight"
            },
            expense: {
               addTitle: "Log Freight & Clearance Expense (Capitalization)",
               editTitle: "Edit Freight & Clearance Expense (Capitalization)",
               shipSelect: "Linked International Shipment *",
               shipSelectHolder: "-- Select Shipment --",
               type: "Expense Type (Cost Category) *",
               types: {
                  t1: "Inland Freight Egypt",
                  t2: "Customs Clearance & Border Fees",
                  t3: "Crossing Fees (Rafah / Kerem Shalom)",
                  t4: "Insurance & Escort Services",
                  t5: "Tips & Miscellaneous Emergency Expenses"
               },
               amount: "Paid Amount *",
               amountHolder: "Example: 15000",
               currency: "Payment Currency *",
               rate: "Exchange Rate (vs ILS) *",
               paidTo: "Beneficiary / Paid To",
               paidToHolder: "Example: Abnaa Sinai / Customs Broker",
               ref: "Reference / Receipt No",
               refHolder: "Example: REC-2026-991",
               notes: "Expense Notes & Details",
               notesHolder: "Enter expense details and purpose of payment...",
               addSubmit: "Log Expense & Capitalize to Shipment",
               editSubmit: "Save Expense Changes & Re-capitalize"
            },
            currency: {
               addTitle: "Update Exchange Rates Bulletin (vs ILS)",
               editTitle: "Edit Ledger Exchange Rate",
               code: "Currency Code *",
               codeHolder: "-- Select Currency --",
               name: "Currency Name *",
               nameHolder: "Example: US Dollar",
               rate: "New Exchange Rate (per 1 ILS) *",
               rateHolder: "Example: 3.7500",
               addSubmit: "Save & Update Rates Bulletin",
               editSubmit: "Save Change & Update Bulletin"
            }
         },
         status: {
            Pending_Departure: 'Pending Departure (Egypt)',
            In_Transit_Customs: 'In Transit & Customs Clearance',
            At_Border_Crossing: 'At Border Crossing (Rafah/Kerem Shalom)',
            Arrived_Gaza_Warehouse: 'Arrived Gaza Warehouse (Capitalized)',
            Completed: 'Completed & Distributed'
         },
         alerts: {
            deleteConfirm: "⚠️ Are you sure you want to delete this record? Landed costs and freight proration will be automatically recalculated.",
            deleteSuccess: "✅ Record deleted successfully and accounts recalibrated!",
            deleteErr: "Error occurred during deletion",
            shipEditSuccess: "✅ Shipment updated successfully!",
            shipAddSuccess: "✅ Shipment created successfully and logged as in-transit goods!",
            shipErr: "Error occurred while saving shipment",
            itemEditSuccess: "✅ Item updated, CBM volume calculated, and freight prorated successfully!",
            itemAddSuccess: "✅ Item added to shipment, CBM volume calculated, and freight prorated successfully!",
            itemErr: "Error occurred while saving item",
            expEditSuccess: "✅ Expense updated, capitalized to shipment, and CBM prorated successfully!",
            expAddSuccess: "✅ Expense logged, capitalized to shipment, and CBM prorated successfully!",
            expErr: "Error occurred while saving expense",
            currEditSuccess: "✅ Exchange rate updated successfully!",
            currAddSuccess: "✅ Exchange rates bulletin updated successfully!",
            currErr: "Error occurred while saving currency",
            statusSuccess: "✅ Shipment status updated to: ",
            statusErr: "Error occurred while updating status"
         }
      }
   };

   const t = translations[language] || translations['ar'];

   // Data States
   const [shipments, setShipments] = useState([]);
   const [items, setItems] = useState([]);
   const [expenses, setExpenses] = useState([]);
   const [currencies, setCurrencies] = useState([]);

   // Selected Shipment for Expenses/Items View
   const [selectedShipmentId, setSelectedShipmentId] = useState('');

   // Modals States
   const [isShipmentModalOpen, setIsShipmentModalOpen] = useState(false);
   const [isItemModalOpen, setIsItemModalOpen] = useState(false);
   const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
   const [isCurrencyModalOpen, setIsCurrencyModalOpen] = useState(false);

   // Edit Mode States
   const [editMode, setEditMode] = useState(false);
   const [editRecordId, setEditRecordId] = useState(null);
   const [editTable, setEditTable] = useState('');

   // Forms
   const [shipmentForm, setShipmentForm] = useState({
      shipment_no: `SHP-${Date.now().toString().slice(-5)}`,
      origin: language === 'en' ? 'Egypt Warehouses - Cairo' : 'مستودعات مصر - القاهرة',
      destination: language === 'en' ? 'Gaza Warehouses - Main Warehouse' : 'مستودعات غزة - المستودع الرئيسي',
      status: 'Pending_Departure',
      currency: 'USD',
      initial_value: '',
      exchange_rate_initial: 3.7500,
      notes: ''
   });

   const [itemForm, setItemForm] = useState({
      shipment_id: '',
      item_name: '',
      quantity: '',
      buy_price: '',
      cbm_per_unit: 0.005,
      batch_no: `BATCH-${Date.now().toString().slice(-4)}`,
      expiry_date: new Date(Date.now() + 63072000000).toISOString().split('T')[0] // 2 years from now
   });

   const [expenseForm, setExpenseForm] = useState({
      shipment_id: '',
      expense_type: language === 'en' ? 'Inland Freight Egypt' : 'نقل بري مصر',
      amount: '',
      currency: 'EGP',
      exchange_rate_to_ils: 0.0750,
      paid_to: '',
      reference_no: '',
      notes: ''
   });

   const [currencyForm, setCurrencyForm] = useState({
      currency_code: '',
      currency_name: '',
      rate_to_ils: ''
   });

   useEffect(() => {
      fetchData();
   }, [activeTab, selectedShipmentId]);

   const fetchData = async () => {
      setLoading(true);
      try {
         const [resShip, resItems, resExp, resCurr] = await Promise.all([
            api.get('/dynamic/table/pharma_shipments?limit=100'),
            api.get('/dynamic/table/shipment_items?limit=200'),
            api.get('/dynamic/table/shipment_expenses?limit=200'),
            api.get('/dynamic/table/currency_rates?limit=50')
         ]);

         const activeComp = localStorage.getItem('active_company') || '';
         const filteredShipments = (resShip.data?.data || []).filter(s => !s.company || s.company.toLowerCase() === activeComp.toLowerCase());
         setShipments(filteredShipments);
         setCurrencies(resCurr.data?.data || []);

         const filteredItems = (resItems.data?.data || []).filter(i => !i.company || i.company.toLowerCase() === activeComp.toLowerCase());
         let allItems = filteredItems;
         if (selectedShipmentId) {
            allItems = allItems.filter(i => Number(i.shipment_id) === Number(selectedShipmentId));
         }
         setItems(allItems);

         const filteredExp = (resExp.data?.data || []).filter(e => !e.company || e.company.toLowerCase() === activeComp.toLowerCase());
         let allExp = filteredExp;
         if (selectedShipmentId) {
            allExp = allExp.filter(e => Number(e.shipment_id) === Number(selectedShipmentId));
         }
         setExpenses(allExp);
      } catch (error) {
         console.error("Error fetching supply chain data:", error);
      } finally {
         setLoading(false);
      }
   };

   // Handlers
   const handleOpenAddShipment = () => {
      setEditMode(false);
      setEditRecordId(null);
      setShipmentForm({
         shipment_no: `SHP-${Date.now().toString().slice(-5)}`,
         origin: language === 'en' ? 'Egypt Warehouses - Cairo' : 'مستودعات مصر - القاهرة',
         destination: language === 'en' ? 'Gaza Warehouses - Main Warehouse' : 'مستودعات غزة - المستودع الرئيسي',
         status: 'Pending_Departure',
         currency: 'USD',
         initial_value: '',
         exchange_rate_initial: 3.7500,
         notes: ''
      });
      setIsShipmentModalOpen(true);
   };

   const handleOpenAddItem = () => {
      setEditMode(false);
      setEditRecordId(null);
      setItemForm({
         shipment_id: selectedShipmentId || '',
         item_name: '',
         quantity: '',
         buy_price: '',
         cbm_per_unit: 0.005,
         batch_no: `BATCH-${Date.now().toString().slice(-4)}`,
         expiry_date: new Date(Date.now() + 63072000000).toISOString().split('T')[0]
      });
      setIsItemModalOpen(true);
   };

   const handleOpenAddExpense = () => {
      setEditMode(false);
      setEditRecordId(null);
      setExpenseForm({
         shipment_id: selectedShipmentId || '',
         expense_type: language === 'en' ? 'Inland Freight Egypt' : 'نقل بري مصر',
         amount: '',
         currency: 'EGP',
         exchange_rate_to_ils: 0.0750,
         paid_to: '',
         reference_no: '',
         notes: ''
      });
      setIsExpenseModalOpen(true);
   };

   const handleOpenAddCurrency = () => {
      setEditMode(false);
      setEditRecordId(null);
      setCurrencyForm({
         currency_code: '',
         currency_name: '',
         rate_to_ils: ''
      });
      setIsCurrencyModalOpen(true);
   };

   const handleOpenEdit = (table, record) => {
      setEditMode(true);
      setEditRecordId(record.id);
      setEditTable(table);

      if (table === 'pharma_shipments') {
         setShipmentForm({
            shipment_no: record.shipment_no || '',
            origin: record.origin || '',
            destination: record.destination || '',
            status: record.status || 'Pending_Departure',
            currency: record.currency || 'USD',
            initial_value: record.initial_value || '',
            exchange_rate_initial: record.exchange_rate_initial || 3.7500,
            notes: record.notes || ''
         });
         setIsShipmentModalOpen(true);
      } else if (table === 'shipment_items') {
         setItemForm({
            shipment_id: record.shipment_id || '',
            item_name: record.item_name || '',
            quantity: record.quantity || '',
            buy_price: record.buy_price || '',
            cbm_per_unit: record.cbm_per_unit || 0.005,
            batch_no: record.batch_no || '',
            expiry_date: record.expiry_date ? record.expiry_date.split('T')[0] : ''
         });
         setIsItemModalOpen(true);
      } else if (table === 'shipment_expenses') {
         setExpenseForm({
            shipment_id: record.shipment_id || '',
            expense_type: record.expense_type || (language === 'en' ? 'Inland Freight Egypt' : 'نقل بري مصر'),
            amount: record.amount || '',
            currency: record.currency || 'EGP',
            exchange_rate_to_ils: record.exchange_rate_to_ils || 0.0750,
            paid_to: record.paid_to || '',
            reference_no: record.reference_no || '',
            notes: record.notes || ''
         });
         setIsExpenseModalOpen(true);
      } else if (table === 'currency_rates') {
         setCurrencyForm({
            currency_code: record.currency_code || '',
            currency_name: record.currency_name || '',
            rate_to_ils: record.rate_to_ils || ''
         });
         setIsCurrencyModalOpen(true);
      }
   };

   const handleDeleteRecord = async (table, id) => {
      if (!confirm(t.alerts.deleteConfirm)) return;
      try {
         await api.delete(`/dynamic/delete/${table}/${id}`);
         alert(t.alerts.deleteSuccess);
         fetchData();
      } catch (err) {
         alert(err.response?.data?.error || t.alerts.deleteErr);
      }
   };

   const handleCreateShipment = async (e) => {
      e.preventDefault();
      try {
         const activeComp = localStorage.getItem('active_company') || 'PRIMEMED PHARMA';
         if (editMode && editRecordId) {
            await api.put(`/dynamic/update/pharma_shipments/${editRecordId}`, {
               ...shipmentForm,
               company: activeComp
            });
            alert(t.alerts.shipEditSuccess);
         } else {
            await api.post('/dynamic/add/pharma_shipments', {
               ...shipmentForm,
               company: activeComp
            });
            alert(t.alerts.shipAddSuccess);
         }
         setIsShipmentModalOpen(false);
         setEditMode(false);
         setEditRecordId(null);
         fetchData();
      } catch (err) {
         alert(err.response?.data?.error || t.alerts.shipErr);
      }
   };

   const handleCreateItem = async (e) => {
      e.preventDefault();
      try {
         const activeComp = localStorage.getItem('active_company') || '';
         const payload = { ...itemForm, company: activeComp };
         if (editMode && editRecordId) {
            await api.put(`/dynamic/update/shipment_items/${editRecordId}`, payload);
            alert(t.alerts.itemEditSuccess);
         } else {
            await api.post('/dynamic/add/shipment_items', payload);
            alert(t.alerts.itemAddSuccess);
         }
         setIsItemModalOpen(false);
         setEditMode(false);
         setEditRecordId(null);
         fetchData();
      } catch (err) {
         alert(err.response?.data?.error || t.alerts.itemErr);
      }
   };

   const handleCreateExpense = async (e) => {
      e.preventDefault();
      try {
         const activeComp = localStorage.getItem('active_company') || '';
         const payload = { ...expenseForm, company: activeComp };
         if (editMode && editRecordId) {
            await api.put(`/dynamic/update/shipment_expenses/${editRecordId}`, payload);
            alert(t.alerts.expEditSuccess);
         } else {
            await api.post('/dynamic/add/shipment_expenses', payload);
            alert(t.alerts.expAddSuccess);
         }
         setIsExpenseModalOpen(false);
         setEditMode(false);
         setEditRecordId(null);
         fetchData();
      } catch (err) {
         alert(err.response?.data?.error || t.alerts.expErr);
      }
   };

   const handleUpdateCurrency = async (e) => {
      e.preventDefault();
      try {
         if (editMode && editRecordId) {
            await api.put(`/dynamic/update/currency_rates/${editRecordId}`, currencyForm);
            alert(t.alerts.currEditSuccess);
         } else {
            await api.post('/dynamic/add/currency_rates', currencyForm);
            alert(t.alerts.currAddSuccess);
         }
         setIsCurrencyModalOpen(false);
         setEditMode(false);
         setEditRecordId(null);
         fetchData();
      } catch (err) {
         alert(err.response?.data?.error || t.alerts.currErr);
      }
   };

   const handleUpdateShipmentStatus = async (shipmentId, newStatus) => {
      try {
         await api.put(`/dynamic/update/pharma_shipments/${shipmentId}`, { status: newStatus });
         alert(`${t.alerts.statusSuccess}${t.status[newStatus] || newStatus}`);
         fetchData();
      } catch (err) {
         alert(err.response?.data?.error || t.alerts.statusErr);
      }
   };

   // Status Badge Helper
   const getStatusBadge = (status) => {
      const styles = {
         Pending_Departure: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
         In_Transit_Customs: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
         At_Border_Crossing: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
         Arrived_Gaza_Warehouse: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
         Completed: 'bg-slate-500/10 text-slate-400 border-slate-500/20'
      };
      return (
         <span className={`px-4 py-2 rounded-xl text-[11px] font-black border uppercase tracking-widest shadow-sm ${styles[status] || styles.Completed}`}>
            {t.status[status] || status}
         </span>
      );
   };

    return (
       <div className={`min-h-screen pb-20 animate-fade-in font-sans ${theme === 'dark' ? 'dark text-slate-100 bg-[#1d2026]' : 'pharma-supply-light text-slate-900 bg-slate-950'}`} dir={language === 'ar' ? 'rtl' : 'ltr'}>
          {theme !== 'dark' && <style dangerouslySetInnerHTML={{
             __html: `
             /* ═══════════════════════════════════════════════════════════
                PREMIUM WHITE THEME ENGINE — PharmaSupplyChain Scoped
             ═══════════════════════════════════════════════════════════ */
             .pharma-supply-light {
                --ph-bg-page: #f8fafc;
                --ph-bg-card: #ffffff;
                --ph-bg-alt: #f1f5f9;
                --ph-border: #e2e8f0;
                --ph-text-primary: #0f172a;
                --ph-text-secondary: #475569;
             }
 
             /* Root background */
             .pharma-supply-light.min-h-screen {
                background-color: var(--ph-bg-page) !important;
                color: var(--ph-text-primary) !important;
             }
 
             /* Headers & Card Backings */
             .pharma-supply-light .bg-\\[\\#171920\\],
             .pharma-supply-light .bg-slate-950,
             .pharma-supply-light .bg-slate-900,
             .pharma-supply-light .bg-slate-950\\/50,
             .pharma-supply-light .bg-\\[\\#272a33\\] {
                background-color: var(--ph-bg-card) !important;
                border-color: var(--ph-border) !important;
                color: var(--ph-text-primary) !important;
             }
 
             /* Tab Navigation Pill Bar Container */
             .pharma-supply-light .bg-\\[\\#171920\\] {
                background-color: var(--ph-bg-alt) !important;
                border-color: var(--ph-border) !important;
             }
 
             /* Inactive switcher buttons */
             .pharma-supply-light .bg-\\[\\#171920\\] button.text-slate-400 {
                background-color: #ffffff !important;
                border: 1.8px solid var(--ph-bg-alt) !important;
                color: var(--ph-text-secondary) !important;
                margin: 2px !important;
             }
             .pharma-supply-light .bg-\\[\\#171920\\] button.text-slate-400:hover {
                color: var(--ph-text-primary) !important;
                background-color: #f8fafc !important;
             }
 
             /* Active switcher buttons */
             .pharma-supply-light .bg-\\[\\#171920\\] button.bg-slate-800 {
                background-color: #ffffff !important;
                border: 1.8px solid #0f172a !important;
                color: #06b6d4 !important;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05) !important;
                margin: 2px !important;
             }
 
             /* Text Elements */
             .pharma-supply-light .text-white,
             .pharma-supply-light .text-slate-100,
             .pharma-supply-light .text-slate-200 {
                color: var(--ph-text-primary) !important;
             }
             .pharma-supply-light .text-slate-300,
             .pharma-supply-light .text-slate-400 {
                color: var(--ph-text-secondary) !important;
             }
             .pharma-supply-light .border-slate-800,
             .pharma-supply-light .border-slate-700 {
                border-color: var(--ph-border) !important;
             }
 
             /* Tables */
             .pharma-supply-light table {
                background-color: var(--ph-bg-card) !important;
             }
             .pharma-supply-light tr.bg-\\[\\#171920\\] {
                background-color: var(--ph-bg-alt) !important;
                border-color: var(--ph-border) !important;
             }
             .pharma-supply-light tr.bg-\\[\\#171920\\] th {
                color: var(--ph-text-secondary) !important;
                border-color: var(--ph-border) !important;
             }
             .pharma-supply-light td {
                border-color: var(--ph-border) !important;
                color: #334155 !important;
             }
             .pharma-supply-light tbody tr:hover {
                background-color: #f8fafc !important;
             }
 
             /* Inputs & Forms */
             .pharma-supply-light input,
             .pharma-supply-light select,
             .pharma-supply-light textarea {
                background-color: #ffffff !important;
                border-color: var(--ph-border) !important;
                color: var(--ph-text-primary) !important;
             }
             .pharma-supply-light input::placeholder {
                color: #94a3b8 !important;
             }
             .pharma-supply-light input:focus,
             .pharma-supply-light select:focus,
             .pharma-supply-light textarea:focus {
                border-color: #06b6d4 !important;
                box-shadow: 0 0 0 3px rgba(6,182,212,0.1) !important;
             }
 
             /* Modals (Fixed position modals) */
             .pharma-supply-light .fixed.inset-0.bg-\\[\\#171920\\] {
                background-color: rgba(15, 23, 42, 0.4) !important;
                backdrop-blur: 12px !important;
             }
             .pharma-supply-light .fixed.inset-0.bg-\\[\\#171920\\] > div {
                background-color: #ffffff !important;
                border: 1px solid var(--ph-border) !important;
                color: var(--ph-text-primary) !important;
                border-radius: 2.5rem !important;
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04) !important;
             }
             .pharma-supply-light .fixed.inset-0.bg-\\[\\#171920\\] div.bg-\\[\\#171920\\] {
                background-color: #ffffff !important;
                border-color: var(--ph-border) !important;
             }
             .pharma-supply-light .fixed.inset-0.bg-\\[\\#171920\\] h3 {
                color: var(--ph-text-primary) !important;
             }
             .pharma-supply-light .fixed.inset-0.bg-\\[\\#171920\\] select option {
                background-color: #ffffff !important;
                color: var(--ph-text-primary) !important;
             }
             `
          }} />}
          {/* Premium Header */}
          <div className="bg-[#171920] border-b border-slate-800 sticky top-0 z-40 shadow-2xl shadow-slate-950/50">
             <div className="max-w-[1600px] mx-auto px-6 sm:px-10 py-8 space-y-8">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                   <div className="flex items-center gap-6">
                      <div className="w-16 h-16 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 rounded-3xl flex items-center justify-center text-3xl shadow-sm transform hover:rotate-6 transition-all duration-500 flex-shrink-0">
                         🚛
                      </div>
                      <div>
                         <div className="flex items-center gap-4 flex-wrap">
                            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{t.title}</h1>
                            <span className="px-3 py-1 bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm">IFRS IAS 2</span>
                         </div>
                         <p className="text-slate-400 font-bold text-xs sm:text-sm mt-1.5 uppercase tracking-widest line-clamp-2">
                            {t.subtitle}
                         </p>
                      </div>
                   </div>
                </div>
 
                {/* Gorgeous Tab Navigation Pill Container */}
                <div className="bg-[#171920] p-2.5 rounded-[2rem] border border-slate-800 shadow-inner flex flex-wrap items-center gap-2 sm:gap-3 w-full">
                   {[
                      { id: 'shipments', label: t.tabs.shipments, icon: '📍' },
                      { id: 'items', label: t.tabs.items, icon: '📦' },
                      { id: 'expenses', label: t.tabs.expenses, icon: '🚚' },
                      { id: 'currencies', label: t.tabs.currencies, icon: '💱' }
                   ].map(tab => (
                      <button
                         key={tab.id}
                         onClick={() => setActiveTab(tab.id)}
                         className={`flex-1 min-w-[240px] px-6 py-4 rounded-2xl text-xs uppercase font-black tracking-wider transition-all duration-300 flex items-center justify-center gap-3 border ${
                            activeTab === tab.id
                               ? 'bg-[#29384e] border-cyan-500/30 text-cyan-400 shadow-md transform -translate-y-0.5'
                               : 'bg-[#272a33] text-slate-400 border-slate-800 hover:text-white hover:bg-slate-800/80 hover:border-slate-700'
                         }`}
                      >
                         <span className="text-lg">{tab.icon}</span> 
                         <span className="truncate">{tab.label}</span>
                      </button>
                   ))}
                </div>
             </div>
          </div>

         <div className="max-w-[1600px] mx-auto px-10 py-12 space-y-12">
            {loading ? (
               <div className="flex flex-col items-center justify-center py-32 gap-4">
                  <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-cyan-500 font-black text-xs uppercase tracking-widest animate-pulse">{t.syncing}</p>
               </div>
            ) : (
               <>
                  {/* ================= TAB 1: SHIPMENTS TRACKER ================= */}
                  {activeTab === 'shipments' && (
                     <div className="space-y-10 animate-fade-in">
                        <div className="flex justify-between items-center bg-[#272a33] border border-slate-800 p-8 rounded-3xl shadow-2xl">
                           <div>
                              <h3 className="text-xl font-black text-white tracking-tight">{t.shipments.header}</h3>
                              <p className="text-slate-400 text-xs font-bold mt-1 tracking-widest uppercase">{t.shipments.sub}</p>
                           </div>
                           <button
                              onClick={handleOpenAddShipment}
                              className="px-8 py-4 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 font-black rounded-2xl text-xs uppercase tracking-widest transform hover:-translate-y-0.5 transition-all flex items-center gap-3"
                           >
                              <span>➕</span> {t.shipments.createBtn}
                           </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                           {shipments.map(s => (
                              <div key={s.id} className="bg-[#272a33] border border-slate-800 rounded-3xl p-8 space-y-8 hover:border-slate-700 transition-all group flex flex-col justify-between shadow-xl shadow-slate-950/50">
                                 <div className="space-y-6">
                                    <div className="flex justify-between items-start">
                                       <div>
                                          <span className="px-3 py-1 bg-slate-800 text-slate-300 rounded-xl font-mono font-black text-xs border border-slate-700">{s.shipment_no}</span>
                                          <h4 className="text-lg font-black text-white mt-3 tracking-tight">{s.origin} ➔ {s.destination}</h4>
                                       </div>
                                       {getStatusBadge(s.status)}
                                    </div>

                                    {/* Visual Journey Timeline */}
                                    <div className="py-4 border-y border-slate-800 space-y-4 font-sans">
                                       <div className="flex justify-between items-center text-[11px] font-black text-slate-400 uppercase tracking-widest">
                                          <span>{t.shipments.egypt}</span>
                                          <span>{t.shipments.border}</span>
                                          <span>{t.shipments.gaza}</span>
                                       </div>
                                       <div className="relative w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                                          <div className={`absolute top-0 h-full bg-cyan-500 transition-all duration-1000 ${
                                             s.status === 'Pending_Departure' ? 'w-1/4' :
                                             s.status === 'In_Transit_Customs' ? 'w-1/2' :
                                             s.status === 'At_Border_Crossing' ? 'w-3/4' : 'w-full'
                                          }`}></div>
                                       </div>
                                    </div>

                                    {/* Financial Breakdown */}
                                    <div className="space-y-3 bg-[#171920]/50 p-6 rounded-2xl border border-slate-800 font-mono">
                                       <div className="flex justify-between items-center text-xs">
                                          <span className="text-slate-400 font-sans font-bold">{t.shipments.invVal}</span>
                                          <span className="font-black text-white">{Number(s.initial_value).toLocaleString()} <span className="text-[10px] text-cyan-400 font-sans">{s.currency}</span></span>
                                       </div>
                                       <div className="flex justify-between items-center text-xs">
                                          <span className="text-slate-400 font-sans font-bold">{t.shipments.shippingExp}</span>
                                          <span className="font-black text-amber-400">{Number(s.total_expenses_ils).toLocaleString()} <span className="text-[10px] text-slate-500 font-sans">ILS</span></span>
                                       </div>
                                       <div className="flex justify-between items-center text-sm border-t border-slate-800 pt-3">
                                          <span className="text-slate-300 font-sans font-black">{t.shipments.landedCost}</span>
                                          <span className="font-black text-emerald-400 text-base">{Number(s.landed_cost_ils).toLocaleString()} <span className="text-xs text-slate-500 font-sans">ILS</span></span>
                                       </div>
                                    </div>
                                 </div>

                                 {/* Interactive Actions */}
                                 <div className="space-y-4 pt-4 border-t border-slate-800">
                                    <div className="flex gap-3">
                                       <button
                                          onClick={() => { setSelectedShipmentId(s.id); setActiveTab('items'); }}
                                          className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-xl font-black text-xs uppercase tracking-widest transition-all border border-slate-700 flex items-center justify-center gap-2"
                                       >
                                          <span>📦</span> {t.shipments.itemsBtn}
                                       </button>
                                       <button
                                          onClick={() => { setSelectedShipmentId(s.id); setActiveTab('expenses'); }}
                                          className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all border border-slate-700 flex items-center justify-center gap-2"
                                       >
                                          <span>🚚</span> {t.shipments.expBtn} ({s.total_expenses_ils > 0 ? t.shipments.registered : '0'})
                                       </button>
                                    </div>

                                    <div className="flex items-center gap-2 bg-[#171920] p-1.5 rounded-xl border border-slate-800">
                                       <span className="text-[10px] font-black text-slate-500 px-3 uppercase tracking-widest">{t.shipments.updatePath}</span>
                                       <select
                                          value={s.status}
                                          onChange={(e) => handleUpdateShipmentStatus(s.id, e.target.value)}
                                          className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-black text-cyan-400 focus:outline-none"
                                       >
                                          <option value="Pending_Departure">{t.status.Pending_Departure}</option>
                                          <option value="In_Transit_Customs">{t.status.In_Transit_Customs}</option>
                                          <option value="At_Border_Crossing">{t.status.At_Border_Crossing}</option>
                                          <option value="Arrived_Gaza_Warehouse">{t.status.Arrived_Gaza_Warehouse}</option>
                                          <option value="Completed">{t.status.Completed}</option>
                                       </select>
                                    </div>

                                    <div className="flex gap-3 pt-2 border-t border-slate-800/40 justify-end">
                                       <button
                                          onClick={() => handleOpenEdit('pharma_shipments', s)}
                                          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-blue-400 rounded-xl font-bold text-xs flex items-center gap-1 transition-all border border-slate-700"
                                       >
                                          <span>✏️</span> {t.shipments.edit}
                                       </button>
                                       <button
                                          onClick={() => handleDeleteRecord('pharma_shipments', s.id)}
                                          className="px-4 py-2 bg-slate-800 hover:bg-red-950/40 text-red-400 rounded-xl font-bold text-xs flex items-center gap-1 transition-all border border-slate-700 hover:border-red-800"
                                       >
                                          <span>🗑️</span> {t.shipments.delete}
                                       </button>
                                    </div>
                                 </div>
                              </div>
                           ))}
                        </div>
                     </div>
                  )}

                  {/* ================= TAB 1.5: SHIPMENT ITEMS (CBM PRORATION) ================= */}
                  {activeTab === 'items' && (
                     <div className="space-y-10 animate-fade-in">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-[#272a33] border border-slate-800 p-8 rounded-3xl shadow-2xl">
                           <div>
                              <h3 className="text-xl font-black text-white tracking-tight">{t.items.header}</h3>
                              <p className="text-slate-400 text-xs font-bold mt-1 tracking-widest uppercase">{t.items.sub}</p>
                           </div>

                           <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                              <select
                                 value={selectedShipmentId}
                                 onChange={(e) => setSelectedShipmentId(e.target.value)}
                                 className="bg-slate-950 border border-slate-700 rounded-2xl px-6 py-4 text-xs font-black text-cyan-400 focus:outline-none shadow-xl min-w-[240px]"
                              >
                                 <option value="">{t.items.filterAll}</option>
                                 {shipments.map(s => (
                                    <option key={s.id} value={s.id}>{s.shipment_no} - {s.origin}</option>
                                 ))}
                              </select>

                              <button
                                 onClick={handleOpenAddItem}
                                 className="px-8 py-4 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 font-black rounded-2xl text-xs uppercase tracking-widest transform hover:-translate-y-0.5 transition-all flex items-center gap-3"
                              >
                                 <span>➕</span> {t.items.createBtn}
                              </button>
                           </div>
                        </div>

                        {/* 🌟 Efficiency Margin Dashboard / لوحة قياس كفاءة الشحن والتسعير 🌟 */}
                        {(() => {
                           const currentItems = items;
                           const totalBuyValueIls = currentItems.reduce((acc, i) => {
                              const parentShip = shipments.find(s => Number(s.id) === Number(i.shipment_id));
                              const fx = parseFloat(parentShip?.exchange_rate_initial || 3.75);
                              return acc + (parseFloat(i.quantity || 0) * parseFloat(i.buy_price || 0) * fx);
                           }, 0);
                           
                           const totalAllocatedShippingIls = currentItems.reduce((acc, i) => acc + parseFloat(i.allocated_shipping_ils || 0), 0);
                           const totalLandedValueIls = currentItems.reduce((acc, i) => acc + (parseFloat(i.quantity || 0) * parseFloat(i.landed_unit_cost_ils || 0)), 0);
                           const overheadRatio = totalBuyValueIls > 0 ? (totalAllocatedShippingIls / totalBuyValueIls) * 100 : 0;
                           const efficiencyScore = overheadRatio <= 15 ? t.items.metrics.excellent : overheadRatio <= 30 ? t.items.metrics.good : t.items.metrics.high;
                           const scoreColor = overheadRatio <= 15 ? 'text-emerald-400 border-emerald-500/20 bg-emerald-500/10' : overheadRatio <= 30 ? 'text-blue-400 border-blue-500/20 bg-blue-500/10' : 'text-amber-400 border-amber-500/20 bg-amber-500/10';

                           return (
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 bg-gradient-to-r from-slate-900/80 via-slate-900/60 to-slate-900/80 border border-slate-800 p-8 rounded-3xl shadow-2xl my-8">
                                 <div className="border-l border-slate-800 pl-6 last:border-none space-y-2">
                                    <div className="flex items-center gap-2 text-slate-400 text-xs font-black uppercase tracking-widest">
                                       <span>📦</span> {t.items.metrics.buyVal}
                                    </div>
                                    <div className="text-2xl font-black text-white font-mono">
                                       ₪ {totalBuyValueIls.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>
                                    <p className="text-[10px] text-slate-500 font-bold">{t.items.metrics.buyValSub}</p>
                                 </div>

                                 <div className="border-l border-slate-800 pl-6 last:border-none space-y-2">
                                    <div className="flex items-center gap-2 text-slate-400 text-xs font-black uppercase tracking-widest">
                                       <span>🚚</span> {t.items.metrics.shipExp}
                                    </div>
                                    <div className="text-2xl font-black text-amber-400 font-mono">
                                       ₪ {totalAllocatedShippingIls.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>
                                    <p className="text-[10px] text-slate-500 font-bold">{t.items.metrics.shipExpSub}</p>
                                 </div>

                                 <div className="border-l border-slate-800 pl-6 last:border-none space-y-2">
                                    <div className="flex items-center gap-2 text-slate-400 text-xs font-black uppercase tracking-widest">
                                       <span>💎</span> {t.items.metrics.landedVal}
                                    </div>
                                    <div className="text-2xl font-black text-emerald-400 font-mono">
                                       ₪ {totalLandedValueIls.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </div>
                                    <p className="text-[10px] text-slate-500 font-bold">{t.items.metrics.landedValSub}</p>
                                 </div>

                                 <div className="space-y-2 pl-2">
                                    <div className="flex items-center gap-2 text-slate-400 text-xs font-black uppercase tracking-widest">
                                       <span>⚡</span> {t.items.metrics.efficiency}
                                    </div>
                                    <div className="flex items-baseline gap-3">
                                       <span className="text-2xl font-black text-cyan-400 font-mono">
                                          {overheadRatio.toFixed(1)}%
                                       </span>
                                       <span className={`px-3 py-1 rounded-xl text-[10px] font-black border ${scoreColor}`}>
                                          {efficiencyScore}
                                       </span>
                                    </div>
                                    <p className="text-[10px] text-slate-500 font-bold">{t.items.metrics.efficiencySub}</p>
                                 </div>
                              </div>
                           );
                        })()}

                        <div className="bg-[#272a33] border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
                           <div className="overflow-x-auto">
                              <table className="w-full text-right whitespace-nowrap">
                                 <thead>
                                    <tr className="bg-[#171920] text-slate-400 text-[10px] uppercase tracking-widest font-black border-b border-slate-800">
                                       <th className="px-8 py-6">{t.items.table.shipNo}</th>
                                       <th className="px-8 py-6">{t.items.table.itemName}</th>
                                       <th className="px-8 py-6 text-center">{t.items.table.qty}</th>
                                       <th className="px-8 py-6 text-center">{t.items.table.buyPrice}</th>
                                       <th className="px-8 py-6 text-center">{t.items.table.unitCbm}</th>
                                       <th className="px-8 py-6 text-center bg-slate-900/30">{t.items.table.totalCbm}</th>
                                       <th className="px-8 py-6 text-center text-amber-400 bg-[#272a33]">{t.items.table.shipShare}</th>
                                       <th className="px-8 py-6 text-center text-emerald-400 bg-[#171920] font-black text-sm">{t.items.table.landedUnit}</th>
                                       <th className="px-8 py-6 text-center bg-slate-900/90">{t.items.table.actions}</th>
                                    </tr>
                                 </thead>
                                 <tbody className="divide-y divide-slate-800/60 font-mono">
                                    {items.map(i => {
                                       const parentShip = shipments.find(s => Number(s.id) === Number(i.shipment_id));
                                       return (
                                          <tr key={i.id} className="hover:bg-slate-800/40 transition-all group">
                                             <td className="px-8 py-6 font-black text-slate-300 text-xs">
                                                <span className="px-3 py-1 bg-slate-800 border border-slate-700 rounded-xl">{parentShip?.shipment_no || `SHP-${i.shipment_id}`}</span>
                                             </td>
                                             <td className="px-8 py-6 font-sans font-black text-white text-sm">
                                                {i.item_name}
                                                <div className="flex gap-3 text-[10px] text-slate-500 mt-1 font-mono">
                                                   <span>{t.items.table.batch} {i.batch_no}</span> | <span>{t.items.table.expiry} {i.expiry_date ? i.expiry_date.split('T')[0] : ''}</span>
                                                </div>
                                             </td>
                                             <td className="px-8 py-6 font-black text-base text-center text-white">
                                                {Number(i.quantity).toLocaleString()}
                                             </td>
                                             <td className="px-8 py-6 font-black text-xs text-center text-slate-400">
                                                {Number(i.buy_price).toLocaleString()} <span className="text-[10px] text-slate-500">{parentShip?.currency || 'USD'}</span>
                                             </td>
                                             <td className="px-8 py-6 font-black text-xs text-center text-cyan-400">
                                                {Number(i.cbm_per_unit).toFixed(4)} <span className="text-[10px] text-slate-500">m³</span>
                                             </td>
                                             <td className="px-8 py-6 font-black text-sm text-center text-cyan-300 bg-[#272a33]">
                                                {Number(i.total_cbm).toFixed(4)} <span className="text-[10px] text-slate-500">m³</span>
                                             </td>
                                             <td className="px-8 py-6 font-black text-sm text-center text-amber-400 bg-[#272a33]">
                                                {Number(i.allocated_shipping_ils).toLocaleString()} <span className="text-[10px] text-slate-500">ILS</span>
                                             </td>
                                             <td className="px-8 py-6 font-black text-lg text-center text-emerald-400 bg-[#272a33] shadow-inner">
                                                {Number(i.landed_unit_cost_ils).toFixed(2)} <span className="text-xs text-slate-500 font-sans">ILS</span>
                                             </td>
                                             <td className="px-8 py-6 font-black text-center bg-[#171920]">
                                                <div className="flex items-center justify-center gap-2 font-sans">
                                                   <button
                                                      onClick={() => handleOpenEdit('shipment_items', i)}
                                                      className="p-2 bg-slate-800 hover:bg-slate-700 text-blue-400 rounded-xl transition-all border border-slate-700"
                                                      title={t.shipments.edit}
                                                   >
                                                      ✏️
                                                   </button>
                                                   <button
                                                      onClick={() => handleDeleteRecord('shipment_items', i.id)}
                                                      className="p-2 bg-slate-800 hover:bg-red-950/40 text-red-400 rounded-xl transition-all border border-slate-700 hover:border-red-800"
                                                      title={t.shipments.delete}
                                                   >
                                                      🗑️
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
                     </div>
                  )}

                  {/* ================= TAB 2: LANDED COST & EXPENSES ================= */}
                  {activeTab === 'expenses' && (
                     <div className="space-y-10 animate-fade-in">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-[#272a33] border border-slate-800 p-8 rounded-3xl shadow-2xl">
                           <div>
                              <h3 className="text-xl font-black text-white tracking-tight">{t.expenses.header}</h3>
                              <p className="text-slate-400 text-xs font-bold mt-1 tracking-widest uppercase">{t.expenses.sub}</p>
                           </div>

                           <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                              <select
                                 value={selectedShipmentId}
                                 onChange={(e) => setSelectedShipmentId(e.target.value)}
                                 className="bg-slate-950 border border-slate-700 rounded-2xl px-6 py-4 text-xs font-black text-cyan-400 focus:outline-none shadow-xl min-w-[240px]"
                              >
                                 <option value="">{t.items.filterAll}</option>
                                 {shipments.map(s => (
                                    <option key={s.id} value={s.id}>{s.shipment_no} - {s.origin}</option>
                                 ))}
                              </select>

                              <button
                                 onClick={handleOpenAddExpense}
                                 className="px-8 py-4 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 font-black rounded-2xl text-xs uppercase tracking-widest transform hover:-translate-y-0.5 transition-all flex items-center gap-3"
                              >
                                 <span>➕</span> {t.expenses.createBtn}
                              </button>
                           </div>
                        </div>

                        <div className="bg-[#272a33] border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
                           <div className="overflow-x-auto">
                              <table className="w-full text-right whitespace-nowrap">
                                 <thead>
                                    <tr className="bg-[#171920] text-slate-400 text-[10px] uppercase tracking-widest font-black border-b border-slate-800">
                                       <th className="px-8 py-6">{t.expenses.table.shipNo}</th>
                                       <th className="px-8 py-6">{t.expenses.table.expType}</th>
                                       <th className="px-8 py-6">{t.expenses.table.paidTo}</th>
                                       <th className="px-8 py-6 text-center">{t.expenses.table.amount}</th>
                                       <th className="px-8 py-6 text-center">{t.expenses.table.rate}</th>
                                       <th className="px-8 py-6 text-center bg-[#272a33]">{t.expenses.table.amountIls}</th>
                                       <th className="px-8 py-6">{t.expenses.table.ref}</th>
                                       <th className="px-8 py-6 text-center bg-[#171920]">{t.expenses.table.actions}</th>
                                    </tr>
                                 </thead>
                                 <tbody className="divide-y divide-slate-800/60 font-mono">
                                    {expenses.map(e => {
                                       const parentShip = shipments.find(s => Number(s.id) === Number(e.shipment_id));
                                       return (
                                          <tr key={e.id} className="hover:bg-slate-800/40 transition-all group">
                                             <td className="px-8 py-6 font-black text-slate-300 text-xs">
                                                <span className="px-3 py-1 bg-slate-800 border border-slate-700 rounded-xl">{parentShip?.shipment_no || `SHP-${e.shipment_id}`}</span>
                                             </td>
                                             <td className="px-8 py-6 font-sans font-black text-white text-sm">
                                                {e.expense_type}
                                                <p className="text-[11px] font-bold text-slate-500 mt-1">{e.notes || t.expenses.table.defaultNotes}</p>
                                             </td>
                                             <td className="px-8 py-6 font-sans font-bold text-slate-400 text-xs">{e.paid_to || t.expenses.table.defaultPaidTo}</td>
                                             <td className="px-8 py-6 font-black text-base text-center text-amber-400">
                                                {Number(e.amount).toLocaleString()} <span className="text-xs text-slate-500 font-sans">{e.currency}</span>
                                             </td>
                                             <td className="px-8 py-6 font-black text-xs text-center text-slate-400">
                                                {Number(e.exchange_rate_to_ils).toFixed(4)}
                                             </td>
                                             <td className="px-8 py-6 font-black text-lg text-center text-emerald-400 bg-slate-900/30">
                                                {Number(e.amount_ils).toLocaleString()} <span className="text-xs text-slate-500 font-sans">ILS</span>
                                             </td>
                                             <td className="px-8 py-6 font-black text-xs text-slate-500 uppercase">{e.reference_no || `EXP-${e.id}`}</td>
                                             <td className="px-8 py-6 font-black text-center bg-[#272a33]">
                                                <div className="flex items-center justify-center gap-2 font-sans">
                                                   <button
                                                      onClick={() => handleOpenEdit('shipment_expenses', e)}
                                                      className="p-2 bg-slate-800 hover:bg-slate-700 text-blue-400 rounded-xl transition-all border border-slate-700"
                                                      title={t.shipments.edit}
                                                   >
                                                      ✏️
                                                   </button>
                                                   <button
                                                      onClick={() => handleDeleteRecord('shipment_expenses', e.id)}
                                                      className="p-2 bg-slate-800 hover:bg-red-950/40 text-red-400 rounded-xl transition-all border border-slate-700 hover:border-red-800"
                                                      title={t.shipments.delete}
                                                   >
                                                      🗑️
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
                     </div>
                  )}

                  {/* ================= TAB 3: CURRENCIES HUB ================= */}
                  {activeTab === 'currencies' && (
                     <div className="space-y-10 animate-fade-in max-w-5xl mx-auto">
                        <div className="flex justify-between items-center bg-[#272a33] border border-slate-800 p-8 rounded-3xl shadow-2xl">
                           <div>
                              <h3 className="text-xl font-black text-white tracking-tight">{t.currencies.header}</h3>
                              <p className="text-slate-400 text-xs font-bold mt-1 tracking-widest uppercase">{t.currencies.sub}</p>
                           </div>
                           <button
                              onClick={handleOpenAddCurrency}
                              className="px-8 py-4 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 font-black rounded-2xl text-xs uppercase tracking-widest transform hover:-translate-y-0.5 transition-all flex items-center gap-3"
                           >
                              <span>💱</span> {t.currencies.createBtn}
                           </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                           {currencies.map(c => (
                              <div key={c.id} className="bg-[#272a33] border border-slate-800 rounded-3xl p-8 space-y-6 hover:border-slate-700 transition-all shadow-xl shadow-slate-950/50 flex flex-col justify-between">
                                 <div className="flex justify-between items-center border-b border-slate-800 pb-6">
                                    <div className="flex items-center gap-4">
                                       <span className="w-12 h-12 bg-slate-800 border border-slate-700 rounded-2xl flex items-center justify-center font-mono font-black text-lg text-cyan-400 shadow-md">
                                          {c.currency_code}
                                       </span>
                                       <div>
                                          <h4 className="text-lg font-black text-white tracking-tight">{c.currency_name}</h4>
                                          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-0.5">{t.currencies.approved}</p>
                                       </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                       <button
                                          onClick={() => handleOpenEdit('currency_rates', c)}
                                          className="p-2 bg-slate-800 hover:bg-slate-700 text-blue-400 rounded-xl transition-all border border-slate-700"
                                          title={t.shipments.edit}
                                       >
                                          ✏️
                                       </button>
                                       <button
                                          onClick={() => handleDeleteRecord('currency_rates', c.id)}
                                          className="p-2 bg-slate-800 hover:bg-red-950/40 text-red-400 rounded-xl transition-all border border-slate-700 hover:border-red-800"
                                          title={t.shipments.delete}
                                       >
                                          🗑️
                                       </button>
                                    </div>
                                 </div>

                                 <div className="bg-[#171920]/50 p-6 rounded-2xl border border-slate-800 flex justify-between items-center font-mono">
                                    <span className="text-slate-400 font-sans font-bold text-xs">{t.currencies.rateLabel}</span>
                                    <span className="text-2xl font-black text-white">{Number(c.rate_to_ils).toFixed(4)} <span className="text-xs text-cyan-400 font-sans">ILS</span></span>
                                 </div>

                                 <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-left">
                                    {t.currencies.lastUpdate} {new Date(c.last_updated).toLocaleString()}
                                 </div>
                              </div>
                           ))}
                        </div>
                     </div>
                  )}
               </>
            )}
         </div>

         {/* ================= MODAL 1: CREATE/EDIT SHIPMENT ================= */}
         {isShipmentModalOpen && (
            <div className="fixed inset-0 bg-[#171920]/80 backdrop-blur-sm flex items-center justify-center z-50 p-6 animate-fade-in">
               <div className="bg-[#272a33] border border-[#3e4452] rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl shadow-cyan-500/10 animate-scale-up">
                  <div className="p-10 border-b border-[#3e4452] flex justify-between items-center bg-[#171920]">
                     <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-3">
                        <span>📦</span> {editMode ? t.modals.shipment.editTitle : t.modals.shipment.addTitle}
                     </h3>
                     <button onClick={() => setIsShipmentModalOpen(false)} className="text-slate-500 hover:text-white font-black text-xl">✕</button>
                  </div>
                  <form onSubmit={handleCreateShipment} className="p-10 space-y-8">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                           <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">{t.modals.shipment.shipNo}</label>
                           <input
                              type="text"
                              required
                              value={shipmentForm.shipment_no}
                              onChange={(e) => setShipmentForm({...shipmentForm, shipment_no: e.target.value})}
                              className="w-full bg-[#171920] border border-[#3e4452] rounded-2xl px-6 py-4 text-sm font-black text-white focus:border-cyan-500 focus:outline-none shadow-inner"
                           />
                        </div>
                        <div className="space-y-3">
                           <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">{t.modals.shipment.currency}</label>
                           <select
                              value={shipmentForm.currency}
                              onChange={(e) => setShipmentForm({...shipmentForm, currency: e.target.value})}
                              className="w-full bg-[#171920] border border-[#3e4452] rounded-2xl px-6 py-4 text-sm font-black text-cyan-400 focus:border-cyan-500 focus:outline-none shadow-inner"
                           >
                              <option value="USD">USD</option>
                              <option value="EGP">EGP</option>
                              <option value="JOD">JOD</option>
                              <option value="ILS">ILS</option>
                           </select>
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                           <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">{t.modals.shipment.origin}</label>
                           <input
                              type="text"
                              required
                              value={shipmentForm.origin}
                              onChange={(e) => setShipmentForm({...shipmentForm, origin: e.target.value})}
                              className="w-full bg-[#171920] border border-[#3e4452] rounded-2xl px-6 py-4 text-sm font-black text-white focus:border-cyan-500 focus:outline-none shadow-inner"
                           />
                        </div>
                        <div className="space-y-3">
                           <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">{t.modals.shipment.dest}</label>
                           <input
                              type="text"
                              required
                              value={shipmentForm.destination}
                              onChange={(e) => setShipmentForm({...shipmentForm, destination: e.target.value})}
                              className="w-full bg-[#171920] border border-[#3e4452] rounded-2xl px-6 py-4 text-sm font-black text-white focus:border-cyan-500 focus:outline-none shadow-inner"
                           />
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                           <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">{t.modals.shipment.initVal}</label>
                           <input
                              type="number"
                              step="0.01"
                              required
                              placeholder={t.modals.shipment.initValHolder}
                              value={shipmentForm.initial_value}
                              onChange={(e) => setShipmentForm({...shipmentForm, initial_value: e.target.value})}
                              className="w-full bg-[#171920] border border-[#3e4452] rounded-2xl px-6 py-4 text-sm font-mono font-black text-amber-400 focus:border-cyan-500 focus:outline-none shadow-inner"
                           />
                        </div>
                        <div className="space-y-3">
                           <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">{t.modals.shipment.rate}</label>
                           <input
                              type="number"
                              step="0.0001"
                              required
                              value={shipmentForm.exchange_rate_initial}
                              onChange={(e) => setShipmentForm({...shipmentForm, exchange_rate_initial: e.target.value})}
                              className="w-full bg-[#171920] border border-[#3e4452] rounded-2xl px-6 py-4 text-sm font-mono font-black text-cyan-400 focus:border-cyan-500 focus:outline-none shadow-inner"
                           />
                        </div>
                     </div>

                     <div className="space-y-3">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">{t.modals.shipment.notes}</label>
                        <textarea
                           rows="3"
                           value={shipmentForm.notes}
                           onChange={(e) => setShipmentForm({...shipmentForm, notes: e.target.value})}
                           placeholder={t.modals.shipment.notesHolder}
                           className="w-full bg-[#171920] border border-[#3e4452] rounded-2xl p-6 text-sm font-bold text-white focus:border-cyan-500 focus:outline-none shadow-inner"
                        ></textarea>
                     </div>

                     <div className="flex gap-4 pt-4 border-t border-[#3e4452]">
                        <button
                           type="submit"
                           className="flex-1 py-4 bg-cyan-500 hover:from-cyan-400 hover:to-blue-50 text-slate-950 font-black rounded-2xl text-xs uppercase tracking-widest shadow-xl shadow-cyan-500/20 transition-all"
                        >
                           {editMode ? t.modals.shipment.editSubmit : t.modals.shipment.addSubmit}
                        </button>
                        <button
                           type="button"
                           onClick={() => setIsShipmentModalOpen(false)}
                           className="px-8 py-4 bg-[#171920] hover:bg-slate-800 text-slate-300 font-black rounded-2xl text-xs uppercase tracking-widest border border-[#3e4452] transition-all"
                        >
                           {t.modals.cancel}
                        </button>
                     </div>
                  </form>
               </div>
            </div>
         )}

         {/* ================= MODAL 1.5: CREATE/EDIT ITEM ================= */}
         {isItemModalOpen && (
            <div className="fixed inset-0 bg-[#171920]/80 backdrop-blur-sm flex items-center justify-center z-50 p-6 animate-fade-in">
               <div className="bg-[#272a33] border border-[#3e4452] rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl shadow-cyan-500/10 animate-scale-up">
                  <div className="p-10 border-b border-[#3e4452] flex justify-between items-center bg-[#171920]">
                     <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-3">
                        <span>📦</span> {editMode ? t.modals.item.editTitle : t.modals.item.addTitle}
                     </h3>
                     <button onClick={() => setIsItemModalOpen(false)} className="text-slate-500 hover:text-white font-black text-xl">✕</button>
                  </div>
                  <form onSubmit={handleCreateItem} className="p-10 space-y-8">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                           <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">{t.modals.item.shipSelect}</label>
                           <select
                              required
                              value={itemForm.shipment_id}
                              onChange={(e) => setItemForm({...itemForm, shipment_id: e.target.value})}
                              className="w-full bg-[#171920] border border-[#3e4452] rounded-2xl px-6 py-4 text-sm font-black text-cyan-400 focus:border-cyan-500 focus:outline-none shadow-inner"
                           >
                              <option value="">{t.modals.item.shipSelectHolder}</option>
                              {shipments.map(s => (
                                 <option key={s.id} value={s.id}>{s.shipment_no} - {s.origin}</option>
                              ))}
                           </select>
                        </div>
                        <div className="space-y-3">
                           <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">{t.modals.item.name}</label>
                           <input
                              type="text"
                              required
                              placeholder={t.modals.item.nameHolder}
                              value={itemForm.item_name}
                              onChange={(e) => setItemForm({...itemForm, item_name: e.target.value})}
                              className="w-full bg-[#171920] border border-[#3e4452] rounded-2xl px-6 py-4 text-sm font-bold text-white focus:border-cyan-500 focus:outline-none shadow-inner"
                           />
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="space-y-3">
                           <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">{t.modals.item.qty}</label>
                           <input
                              type="number"
                              required
                              placeholder={t.modals.item.qtyHolder}
                              value={itemForm.quantity}
                              onChange={(e) => setItemForm({...itemForm, quantity: e.target.value})}
                              className="w-full bg-[#171920] border border-[#3e4452] rounded-2xl px-6 py-4 text-sm font-mono font-black text-white focus:border-cyan-500 focus:outline-none shadow-inner"
                           />
                        </div>
                        <div className="space-y-3">
                           <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">{t.modals.item.buyPrice}</label>
                           <input
                              type="number"
                              step="0.01"
                              required
                              placeholder={t.modals.item.buyPriceHolder}
                              value={itemForm.buy_price}
                              onChange={(e) => setItemForm({...itemForm, buy_price: e.target.value})}
                              className="w-full bg-[#171920] border border-[#3e4452] rounded-2xl px-6 py-4 text-sm font-mono font-black text-amber-400 focus:border-cyan-500 focus:outline-none shadow-inner"
                           />
                        </div>
                        <div className="space-y-3">
                           <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">{t.modals.item.cbm}</label>
                           <input
                              type="number"
                              step="0.0001"
                              required
                              value={itemForm.cbm_per_unit}
                              onChange={(e) => setItemForm({...itemForm, cbm_per_unit: e.target.value})}
                              className="w-full bg-[#171920] border border-[#3e4452] rounded-2xl px-6 py-4 text-sm font-mono font-black text-cyan-400 focus:border-cyan-500 focus:outline-none shadow-inner"
                           />
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                           <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">{t.modals.item.batchNo}</label>
                           <input
                              type="text"
                              value={itemForm.batch_no}
                              onChange={(e) => setItemForm({...itemForm, batch_no: e.target.value})}
                              className="w-full bg-[#171920] border border-[#3e4452] rounded-2xl px-6 py-4 text-sm font-bold text-white focus:border-cyan-500 focus:outline-none shadow-inner"
                           />
                        </div>
                        <div className="space-y-3">
                           <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">{t.modals.item.expiry}</label>
                           <input
                              type="date"
                              value={itemForm.expiry_date}
                              onChange={(e) => setItemForm({...itemForm, expiry_date: e.target.value})}
                              className="w-full bg-[#171920] border border-[#3e4452] rounded-2xl px-6 py-4 text-sm font-mono font-black text-white focus:border-cyan-500 focus:outline-none shadow-inner"
                           />
                        </div>
                     </div>

                     <div className="flex gap-4 pt-4 border-t border-[#3e4452]">
                        <button
                           type="submit"
                           className="flex-1 py-4 bg-cyan-500 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black rounded-2xl text-xs uppercase tracking-widest shadow-xl shadow-cyan-500/20 transition-all"
                        >
                           {editMode ? t.modals.item.editSubmit : t.modals.item.addSubmit}
                        </button>
                        <button
                           type="button"
                           onClick={() => setIsItemModalOpen(false)}
                           className="px-8 py-4 bg-[#171920] hover:bg-slate-800 text-slate-300 font-black rounded-2xl text-xs uppercase tracking-widest border border-[#3e4452] transition-all"
                        >
                           {t.modals.cancel}
                        </button>
                     </div>
                  </form>
               </div>
            </div>
         )}

         {/* ================= MODAL 2: CREATE/EDIT EXPENSE ================= */}
         {isExpenseModalOpen && (
            <div className="fixed inset-0 bg-[#171920]/80 backdrop-blur-sm flex items-center justify-center z-50 p-6 animate-fade-in">
               <div className="bg-[#272a33] border border-[#3e4452] rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl shadow-cyan-500/10 animate-scale-up">
                  <div className="p-10 border-b border-[#3e4452] flex justify-between items-center bg-[#171920]">
                     <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-3">
                        <span>🚚</span> {editMode ? t.modals.expense.editTitle : t.modals.expense.addTitle}
                     </h3>
                     <button onClick={() => setIsExpenseModalOpen(false)} className="text-slate-500 hover:text-white font-black text-xl">✕</button>
                  </div>
                  <form onSubmit={handleCreateExpense} className="p-10 space-y-8">
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                           <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">{t.modals.expense.shipSelect}</label>
                           <select
                              required
                              value={expenseForm.shipment_id}
                              onChange={(e) => setExpenseForm({...expenseForm, shipment_id: e.target.value})}
                              className="w-full bg-[#171920] border border-[#3e4452] rounded-2xl px-6 py-4 text-sm font-black text-cyan-400 focus:border-cyan-500 focus:outline-none shadow-inner"
                           >
                              <option value="">{t.modals.expense.shipSelectHolder}</option>
                              {shipments.map(s => (
                                 <option key={s.id} value={s.id}>{s.shipment_no} - {s.origin}</option>
                              ))}
                           </select>
                        </div>
                        <div className="space-y-3">
                           <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">{t.modals.expense.type}</label>
                           <select
                              value={expenseForm.expense_type}
                              onChange={(e) => setExpenseForm({...expenseForm, expense_type: e.target.value})}
                              className="w-full bg-[#171920] border border-[#3e4452] rounded-2xl px-6 py-4 text-sm font-black text-white focus:border-cyan-500 focus:outline-none shadow-inner"
                           >
                              <option value={language === 'en' ? 'Inland Freight Egypt' : 'نقل بري مصر'}>{t.modals.expense.types.t1}</option>
                              <option value={language === 'en' ? 'Customs Clearance' : 'تخليص جمركي'}>{t.modals.expense.types.t2}</option>
                              <option value={language === 'en' ? 'Crossing Fees' : 'رسوم معابر'}>{t.modals.expense.types.t3}</option>
                              <option value={language === 'en' ? 'Insurance & Escort' : 'تأمين وحراسة'}>{t.modals.expense.types.t4}</option>
                              <option value={language === 'en' ? 'Tips & Miscellaneous' : 'إكراميات ونثريات'}>{t.modals.expense.types.t5}</option>
                           </select>
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="space-y-3">
                           <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">{t.modals.expense.amount}</label>
                           <input
                              type="number"
                              step="0.01"
                              required
                              placeholder={t.modals.expense.amountHolder}
                              value={expenseForm.amount}
                              onChange={(e) => setExpenseForm({...expenseForm, amount: e.target.value})}
                              className="w-full bg-[#171920] border border-[#3e4452] rounded-2xl px-6 py-4 text-sm font-mono font-black text-amber-400 focus:border-cyan-500 focus:outline-none shadow-inner"
                           />
                        </div>
                        <div className="space-y-3">
                           <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">{t.modals.expense.currency}</label>
                           <select
                              value={expenseForm.currency}
                              onChange={(e) => setExpenseForm({...expenseForm, currency: e.target.value})}
                              className="w-full bg-[#171920] border border-[#3e4452] rounded-2xl px-6 py-4 text-sm font-black text-cyan-400 focus:border-cyan-500 focus:outline-none shadow-inner"
                           >
                              <option value="EGP">EGP</option>
                              <option value="USD">USD</option>
                              <option value="ILS">ILS</option>
                              <option value="JOD">JOD</option>
                           </select>
                        </div>
                        <div className="space-y-3">
                           <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">{t.modals.expense.rate}</label>
                           <input
                              type="number"
                              step="0.0001"
                              required
                              value={expenseForm.exchange_rate_to_ils}
                              onChange={(e) => setExpenseForm({...expenseForm, exchange_rate_to_ils: e.target.value})}
                              className="w-full bg-[#171920] border border-[#3e4452] rounded-2xl px-6 py-4 text-sm font-mono font-black text-cyan-400 focus:border-cyan-500 focus:outline-none shadow-inner"
                           />
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-3">
                           <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">{t.modals.expense.paidTo}</label>
                           <input
                              type="text"
                              placeholder={t.modals.expense.paidToHolder}
                              value={expenseForm.paid_to}
                              onChange={(e) => setExpenseForm({...expenseForm, paid_to: e.target.value})}
                              className="w-full bg-[#171920] border border-[#3e4452] rounded-2xl px-6 py-4 text-sm font-bold text-white focus:border-cyan-500 focus:outline-none shadow-inner"
                           />
                        </div>
                        <div className="space-y-3">
                           <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">{t.modals.expense.ref}</label>
                           <input
                              type="text"
                              placeholder={t.modals.expense.refHolder}
                              value={expenseForm.reference_no}
                              onChange={(e) => setExpenseForm({...expenseForm, reference_no: e.target.value})}
                              className="w-full bg-[#171920] border border-[#3e4452] rounded-2xl px-6 py-4 text-sm font-bold text-white focus:border-cyan-500 focus:outline-none shadow-inner"
                           />
                        </div>
                     </div>

                     <div className="space-y-3">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">{t.modals.expense.notes}</label>
                        <textarea
                           rows="3"
                           value={expenseForm.notes}
                           onChange={(e) => setExpenseForm({...expenseForm, notes: e.target.value})}
                           placeholder={t.modals.expense.notesHolder}
                           className="w-full bg-[#171920] border border-[#3e4452] rounded-2xl p-6 text-sm font-bold text-white focus:border-cyan-500 focus:outline-none shadow-inner"
                        ></textarea>
                     </div>

                     <div className="flex gap-4 pt-4 border-t border-[#3e4452]">
                        <button
                           type="submit"
                           className="flex-1 py-4 bg-cyan-500 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black rounded-2xl text-xs uppercase tracking-widest shadow-xl shadow-cyan-500/20 transition-all"
                        >
                           {editMode ? t.modals.expense.editSubmit : t.modals.expense.addSubmit}
                        </button>
                        <button
                           type="button"
                           onClick={() => setIsExpenseModalOpen(false)}
                           className="px-8 py-4 bg-[#171920] hover:bg-slate-800 text-slate-300 font-black rounded-2xl text-xs uppercase tracking-widest border border-[#3e4452] transition-all"
                        >
                           {t.modals.cancel}
                        </button>
                     </div>
                  </form>
               </div>
            </div>
         )}

         {/* ================= MODAL 3: CREATE/EDIT CURRENCY ================= */}
         {isCurrencyModalOpen && (
            <div className="fixed inset-0 bg-[#171920]/80 backdrop-blur-sm flex items-center justify-center z-50 p-6 animate-fade-in">
               <div className="bg-[#272a33] border border-[#3e4452] rounded-[2.5rem] w-full max-w-lg overflow-hidden shadow-2xl shadow-cyan-500/10 animate-scale-up">
                  <div className="p-10 border-b border-[#3e4452] flex justify-between items-center bg-[#171920]">
                     <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-3">
                        <span>💱</span> {editMode ? t.modals.currency.editTitle : t.modals.currency.addTitle}
                     </h3>
                     <button onClick={() => setIsCurrencyModalOpen(false)} className="text-slate-500 hover:text-white font-black text-xl">✕</button>
                  </div>
                  <form onSubmit={handleUpdateCurrency} className="p-10 space-y-8">
                     <div className="space-y-3">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">{t.modals.currency.code}</label>
                        <select
                           required
                           value={currencyForm.currency_code}
                           onChange={(e) => setCurrencyForm({...currencyForm, currency_code: e.target.value})}
                           className="w-full bg-[#171920] border border-[#3e4452] rounded-2xl px-6 py-4 text-sm font-black text-cyan-400 focus:border-cyan-500 focus:outline-none shadow-inner"
                        >
                           <option value="">{t.modals.currency.codeHolder}</option>
                           <option value="USD">USD</option>
                           <option value="EGP">EGP</option>
                           <option value="JOD">JOD</option>
                           <option value="ILS">ILS</option>
                        </select>
                     </div>

                     <div className="space-y-3">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">{t.modals.currency.name}</label>
                        <input
                           type="text"
                           required
                           placeholder={t.modals.currency.nameHolder}
                           value={currencyForm.currency_name}
                           onChange={(e) => setCurrencyForm({...currencyForm, currency_name: e.target.value})}
                           className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-sm font-bold text-white focus:border-cyan-500 focus:outline-none shadow-inner"
                        />
                     </div>

                     <div className="space-y-3">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">{t.modals.currency.rate}</label>
                        <input
                           type="number"
                           step="0.0001"
                           required
                           placeholder={t.modals.currency.rateHolder}
                           value={currencyForm.rate_to_ils}
                           onChange={(e) => setCurrencyForm({...currencyForm, rate_to_ils: e.target.value})}
                           className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-sm font-mono font-black text-amber-400 focus:border-cyan-500 focus:outline-none shadow-inner"
                        />
                     </div>

                     <div className="flex gap-4 pt-4 border-t border-slate-800">
                        <button
                           type="submit"
                           className="flex-1 py-4 bg-cyan-500 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black rounded-2xl text-xs uppercase tracking-widest shadow-xl shadow-cyan-500/20 transition-all"
                        >
                           {editMode ? t.modals.currency.editSubmit : t.modals.currency.addSubmit}
                        </button>
                        <button
                           type="button"
                           onClick={() => setIsCurrencyModalOpen(false)}
                           className="px-8 py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-black rounded-2xl text-xs uppercase tracking-widest transition-all"
                        >
                           {t.modals.cancel}
                        </button>
                     </div>
                  </form>
               </div>
            </div>
         )}
      </div>
   );
}
