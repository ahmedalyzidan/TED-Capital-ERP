import React, { useState, useEffect } from 'react';
import api from '../services/api';
import AdvancedStockControl from './AdvancedStockControl';
import { useLanguage } from '../contexts/LanguageContext';

function StockReconciliation({ isSubcomponent }) {
  const { language } = useLanguage();
  const [reconSubTab, setReconSubTab] = useState('master-stock'); // 'master-stock' or 'official-protocols'
  const [audits, setAudits] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // New Audit Modal State
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [auditNotes, setAuditNotes] = useState('');
  const [auditLines, setAuditLines] = useState([]); // Array of { inventory_id, item_name, batch_no, unit_cost, recorded_qty, physical_qty, notes }

  // Expanded Audit Lines State
  const [expandedAuditId, setExpandedAuditId] = useState(null);
  const [auditDetails, setAuditDetails] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Print State
  const [selectedPrintAudit, setSelectedPrintAudit] = useState(null);
  const [selectedPrintLines, setSelectedPrintLines] = useState([]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [auditsRes, invRes, whRes] = await Promise.all([
        api.get('/dynamic/table/inventory_audits?limit=200&sort_by=id&sort_order=desc'),
        api.get('/dynamic/table/inventory_items?limit=500'),
        api.get('/dynamic/table/warehouses?limit=50')
      ]);

      setAudits(auditsRes.data.data || []);

      let rawInv = invRes.data.data || [];
      // Filter for Pharma items (exactly like PharmaInventory.jsx)
      let pharmaItems = rawInv.filter(i => i.category === 'PHARMA' || i.category?.includes('أدوية') || i.category?.includes('مواد عامة') || i.category?.includes('مواد طبية') || i.warehouse?.includes('مخزن الصيدليات') || i.warehouse?.includes('المستودع الرئيسي') || i.warehouse?.includes('المخزن الرئيسي') || i.item_name?.includes('دواء') || i.item_name?.includes('حقن') || i.item_name?.includes('أقراص') || i.item_name?.includes('فيال'));
      
      let mappedPharma = pharmaItems.map(item => ({
        ...item,
        quantity: Number(item.remaining_qty || item.quantity || 0),
        qty: Number(item.remaining_qty || item.quantity || 0)
      }));

      if (mappedPharma.length < 10) {
        const mockPharma = [
          {
            id: 9001,
            item_name: 'بانادول إكسترا 500 مجم (Panadol Extra)',
            active_substance: 'Paracetamol 500mg + Caffeine 65mg',
            dosage_form: 'أقراص (Tablets)',
            pharma_category: 'OTC',
            storage_temp: '20-25°C (غرفة)',
            quantity: 1420,
            remaining_qty: 1420,
            qty: 1420,
            unit_cost: 45,
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
            quantity: 510,
            remaining_qty: 510,
            qty: 510,
            unit_cost: 130,
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
            quantity: 45,
            remaining_qty: 45,
            qty: 45,
            unit_cost: 350,
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
            quantity: 185,
            remaining_qty: 185,
            qty: 185,
            unit_cost: 280,
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
            quantity: 2650,
            remaining_qty: 2650,
            qty: 2650,
            unit_cost: 25,
            batch_no: 'NS-2026-777',
            expiry_date: '2029-01-01',
            supplier: 'شركة النيل للأدوية',
            min_stock_level: 500,
            uom: 'عبوة',
            warehouse: 'مخزن الصيدليات والأدوية'
          }
        ];
        const existingIds = new Set(mappedPharma.map(i => i.id));
        const newMocks = mockPharma.filter(m => !existingIds.has(m.id));
        pharmaItems = [...mappedPharma, ...newMocks];
      } else {
        pharmaItems = mappedPharma;
      }

      setInventory(pharmaItems);

      const whs = whRes.data.data || [];
      // Provide default warehouses starting with the Pharmacy Store
      setWarehouses([{ id: 9, name: 'مخزن الصيدليات والأدوية' }, ...whs]);
    } catch (err) {
      console.error('Error fetching reconciliation data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // When Warehouse changes in modal, populate audit lines with current inventory
  const handleWarehouseChange = (whName) => {
    setSelectedWarehouse(whName);
    const whItems = inventory.filter(i => (i.warehouse || 'المخزن الرئيسي') === whName && !i.is_deleted);

    const lines = whItems.map(item => ({
      inventory_id: item.id,
      item_name: item.item_name,
      batch_no: item.batch_no || 'N/A',
      unit_cost: Number(item.unit_cost || 0),
      recorded_qty: Number(item.qty || 0),
      physical_qty: Number(item.qty || 0), // default physical count equals recorded count
      notes: ''
    }));
    setAuditLines(lines);
  };

  const handlePhysicalQtyChange = (invId, val) => {
    setAuditLines(prev => prev.map(line => {
      if (line.inventory_id === invId) {
        return { ...line, physical_qty: val === '' ? '' : Number(val) };
      }
      return line;
    }));
  };

  const handleLineNotesChange = (invId, text) => {
    setAuditLines(prev => prev.map(line => {
      if (line.inventory_id === invId) {
        return { ...line, notes: text };
      }
      return line;
    }));
  };

  const handleSubmitAudit = async (e) => {
    e.preventDefault();
    if (!selectedWarehouse) {
      alert(language === 'ar' ? "الرجاء اختيار المخزن المراد جرده" : "Please select a warehouse to count");
      return;
    }
    if (auditLines.length === 0) {
      alert(language === 'ar' ? "لا توجد أصناف في هذا المخزن لإجراء الجرد عليها" : "There are no stock items in this warehouse to reconcile");
      return;
    }

    try {
      // 1. Create Audit Record
      const auditRes = await api.post('/dynamic/add/inventory_audits', {
        audit_date: new Date().toISOString().split('T')[0],
        warehouse: selectedWarehouse,
        status: 'قيد المراجعة (Pending Review)',
        notes: auditNotes || (language === 'ar' ? 'جرد دوري اعتيادي' : 'Regular Scheduled Stock Count'),
        created_by: language === 'ar' ? 'لجنة الجرد' : 'Audit Committee',
        created_at: new Date().toISOString()
      });

      const newAuditId = auditRes.data.id || auditRes.data.data?.id;

      if (newAuditId) {
        // 2. Create Audit Lines
        for (const line of auditLines) {
          const phys = Number(line.physical_qty || 0);
          const rec = Number(line.recorded_qty || 0);
          const variance = phys - rec;

          await api.post('/dynamic/add/inventory_audit_lines', {
            audit_id: newAuditId,
            inventory_id: line.inventory_id,
            recorded_qty: rec,
            physical_qty: phys,
            variance: variance,
            notes: line.notes || (variance < 0 ? (language === 'ar' ? 'عجز مخزني' : 'Stock Deficit') : variance > 0 ? (language === 'ar' ? 'زيادة مخزنية' : 'Stock Surplus') : (language === 'ar' ? 'مطابق' : 'Reconciled'))
          });
        }
      }

      setShowAuditModal(false);
      setSelectedWarehouse('');
      setAuditNotes('');
      setAuditLines([]);
      fetchData();
      alert(language === 'ar' ? "تم حفظ محضر الجرد بنجاح وهو الآن قيد المراجعة والاعتماد" : "Stock count protocol saved successfully! It is now pending review and posting.");
    } catch (err) {
      console.error('Error submitting audit', err);
      alert(language === 'ar' ? "حدث خطأ أثناء حفظ محضر الجرد" : "Failed to save stock count protocol.");
    }
  };

  const handleExpandAudit = async (auditId) => {
    if (expandedAuditId === auditId) {
      setExpandedAuditId(null);
      return;
    }
    setExpandedAuditId(auditId);
    setLoadingDetails(true);
    try {
      const res = await api.get(`/dynamic/table/inventory_audit_lines?filter_by=audit_id&filter_value=${auditId}`);
      const lines = res.data.data || [];

      // Enrich with item details
      const enrichedLines = lines.map(line => {
        const item = inventory.find(i => i.id === line.inventory_id);
        return {
          ...line,
          item_name: item?.item_name || 'صنف غير معروف',
          batch_no: item?.batch_no || 'N/A',
          unit_cost: Number(item?.unit_cost || 0)
        };
      });

      setAuditDetails(enrichedLines);
    } catch (err) {
      console.error('Error fetching audit lines', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleApproveAudit = async (auditId, whName) => {
    if (!window.confirm(language === 'ar' ? "تأكيد اعتماد محضر الجرد؟ سيتم تعديل الأرصدة الفعلية في النظام وتوليد قيد تسوية مالي بالفروق آلياً." : "Are you sure you want to approve and post this stock count? This will update the actual warehouse quantities and post a double-entry ledger adjustment for the variance automatically.")) return;

    try {
      // 1. Fetch lines for this audit
      const linesRes = await api.get(`/dynamic/table/inventory_audit_lines?filter_by=audit_id&filter_value=${auditId}`);
      const lines = linesRes.data.data || [];

      let totalFinancialVariance = 0;

      // 2. Update inventory quantities and calculate total financial variance
      for (const line of lines) {
        const item = inventory.find(i => i.id === line.inventory_id);
        const unitCost = Number(item?.unit_cost || 0);
        const variance = Number(line.variance || 0);
        const financialVariance = variance * unitCost;
        totalFinancialVariance += financialVariance;

        // Update Inventory Qty
        await api.put(`/dynamic/update/inventory/${line.inventory_id}`, {
          qty: Number(line.physical_qty)
        });
      }

      // 3. Update Audit Status
      await api.put(`/dynamic/update/inventory_audits/${auditId}`, {
        status: 'معتمد ومسوى (Approved & Reconciled)'
      });

      // 4. Create Journal Entry (Ledger) for the variance if not zero
      if (Math.abs(totalFinancialVariance) > 0) {
        const isLoss = totalFinancialVariance < 0; // Negative variance means missing stock (Loss)
        const absVal = Math.abs(totalFinancialVariance);

        // Example Journal Entry posting
        await api.post('/dynamic/add/ledger', {
          account_name: isLoss ? (language === 'ar' ? 'خسائر عجز المخزون (Inventory Loss)' : 'Inventory Deficit Loss') : (language === 'ar' ? 'أرباح زيادة المخزون (Inventory Gain)' : 'Inventory Adjustment Gain'),
          type: isLoss ? 'Expense' : 'Revenue',
          amount: absVal,
          entry_date: new Date().toISOString().split('T')[0],
          description: language === 'ar' ? `تسوية جردية آلية لمحضر رقم #${auditId} - ${whName}` : `Automated stock count adjustment for protocol #${auditId} - ${whName}`,
          reference_no: `AUD-${auditId}`,
          created_at: new Date().toISOString()
        });
      }

      alert(language === 'ar' ? "تم اعتماد الجرد وتحديث أرصدة المخازن وترحيل قيد التسوية المالي بنجاح!" : "Stock count protocol approved! Warehouse balances updated and financial ledger posted successfully!");
      fetchData();
      if (expandedAuditId === auditId) handleExpandAudit(auditId); // refresh lines
    } catch (err) {
      console.error('Error approving audit', err);
      alert(language === 'ar' ? "حدث خطأ أثناء اعتماد محضر الجرد والتسوية" : "Failed to approve and reconcile stock count protocol.");
    }
  };

  const handlePrintAudit = async (audit) => {
    setSelectedPrintAudit(audit);
    try {
      const res = await api.get(`/dynamic/table/inventory_audit_lines?filter_by=audit_id&filter_value=${audit.id}`);
      const lines = res.data.data || [];
      const enrichedLines = lines.map(line => {
        const item = inventory.find(i => i.id === line.inventory_id);
        return {
          ...line,
          item_name: item?.item_name || 'صنف غير معروف',
          batch_no: item?.batch_no || 'N/A',
          unit_cost: Number(item?.unit_cost || 0)
        };
      });
      setSelectedPrintLines(enrichedLines);
      setTimeout(() => {
        window.print();
      }, 500);
    } catch (err) {
      console.error('Error preparing print', err);
    }
  };

  // Stats Calculations
  const pendingAuditsCount = audits.filter(a => a.status?.includes('قيد')).length;
  const approvedAuditsCount = audits.filter(a => a.status?.includes('معتمد')).length;

  return (
    <div className="font-sans text-slate-900 selection:bg-indigo-500 selection:text-white" dir={language === 'ar' ? 'rtl' : 'ltr'}>

      {/* PRINT ONLY SECTION - OFFICIAL AUDIT REPORT */}
      {selectedPrintAudit && (
        <div className="hidden print:block bg-white p-10 min-h-screen" dir={language === 'ar' ? 'rtl' : 'ltr'}>
          <div className="border-4 border-slate-900 rounded-3xl p-10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-slate-100 rounded-bl-full -z-10"></div>

            <div className="flex justify-between items-start border-b-2 border-slate-200 pb-8 mb-8">
              <div>
                <h1 className="text-4xl font-black text-slate-900 tracking-tight">
                  {language === 'ar' ? 'محضر جرد مخزني وتسوية العجز والزيادة' : 'Stock Count & Reconciliation Protocol'}
                </h1>
                <p className="text-lg font-bold text-slate-500 mt-2">Official Stock Count & Reconciliation Protocol</p>
                <div className="mt-4 inline-flex items-center gap-4">
                  <span className="bg-slate-100 px-4 py-2 rounded-xl text-sm font-black text-slate-700">
                    {language === 'ar' ? 'رقم المحضر:' : 'Protocol ID:'} <span className="font-mono text-indigo-600">AUD-{selectedPrintAudit.id.toString().padStart(5, '0')}</span>
                  </span>
                  <span className="bg-slate-100 px-4 py-2 rounded-xl text-sm font-black text-slate-700 font-mono">
                    {language === 'ar' ? 'التاريخ:' : 'Date:'} {selectedPrintAudit.audit_date?.split('T')[0]}
                  </span>
                </div>
              </div>
              <div className={language === 'ar' ? 'text-left' : 'text-right'}>
                <div className="w-16 h-16 bg-slate-900 text-white rounded-3xl flex items-center justify-center font-black text-3xl shadow-xl inline-flex">T</div>
                <h2 className="text-sm font-black text-slate-900 mt-3">{language === 'ar' ? 'بريميميد فارما' : 'PRIMEMED PHARMA'}</h2>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Enterprise Inventory Control</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 mb-10">
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <h3 className="text-xs font-black text-slate-400 mb-2 uppercase tracking-wider">
                  🏢 {language === 'ar' ? 'موقع / مخزن الجرد' : 'Audited Warehouse / Location'}
                </h3>
                <p className="text-2xl font-black text-slate-900">{selectedPrintAudit.warehouse}</p>
                <p className="text-xs font-bold text-slate-500 mt-2">{language === 'ar' ? 'لجنة الجرد:' : 'Auditing Officers:'} {selectedPrintAudit.created_by}</p>
              </div>
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <h3 className="text-xs font-black text-slate-400 mb-2 uppercase tracking-wider">
                  📌 {language === 'ar' ? 'ملاحظات وبيان اللجنة' : 'Auditor Findings & Observations'}
                </h3>
                <p className="text-md font-bold text-slate-800">{selectedPrintAudit.notes || (language === 'ar' ? 'لا توجد ملاحظات إضافية' : 'No additional logs recorded.')}</p>
                <p className="text-xs font-black text-indigo-600 mt-3">{language === 'ar' ? `الحالة الدفترية: ${selectedPrintAudit.status}` : `Ledger Status: ${selectedPrintAudit.status}`}</p>
              </div>
            </div>

            <div className="mb-12">
              <h3 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2">
                <span>📋</span> {language === 'ar' ? 'تفاصيل الفحص الفعلي ومقارنة الأرصدة' : 'Reconciliation Log & Material Variances'}
              </h3>
              <table className={`w-full border-collapse ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                <thead>
                  <tr className="bg-slate-900 text-white text-xs">
                    <th className={`p-4 font-black ${language === 'ar' ? 'rounded-tr-xl' : 'rounded-tl-xl'}`}>{language === 'ar' ? 'الصنف (Item)' : 'Item / Compound'}</th>
                    <th className="p-4 font-black">{language === 'ar' ? 'الباتش' : 'Batch Code'}</th>
                    <th className="p-4 font-black text-center">{language === 'ar' ? 'الرصيد الدفتري' : 'Ledger Qty'}</th>
                    <th className="p-4 font-black text-center">{language === 'ar' ? 'الجرد الفعلي' : 'Physical Qty'}</th>
                    <th className="p-4 font-black text-center">{language === 'ar' ? 'الفارق (الكمية)' : 'Variance'}</th>
                    <th className="p-4 font-black text-center">{language === 'ar' ? 'متوسط التكلفة' : 'Unit Cost'}</th>
                    <th className="p-4 font-black text-center">{language === 'ar' ? 'القيمة المالية للفارق' : 'Variance Value'}</th>
                    <th className={`p-4 ${language === 'ar' ? 'rounded-tl-xl text-left' : 'rounded-tr-xl text-right'}`}>{language === 'ar' ? 'ملاحظات والتوجيه' : 'Adjustment Rationale'}</th>
                  </tr>
                </thead>
                <tbody className="text-xs font-bold divide-y divide-slate-200">
                  {selectedPrintLines.map(line => {
                    const varQty = Number(line.variance || 0);
                    const varVal = varQty * Number(line.unit_cost || 0);
                    return (
                      <tr key={line.id} className={varQty < 0 ? 'bg-rose-50/50 text-rose-900' : varQty > 0 ? 'bg-emerald-50/50 text-emerald-900' : 'bg-slate-50/30'}>
                        <td className="p-4 font-black text-sm">{line.item_name}</td>
                        <td className="p-4 font-mono text-slate-500">{line.batch_no}</td>
                        <td className="p-4 text-center font-mono">{Number(line.recorded_qty).toLocaleString()}</td>
                        <td className="p-4 text-center font-mono font-black text-sm">{Number(line.physical_qty).toLocaleString()}</td>
                        <td className="p-4 text-center font-mono font-black" dir="ltr">{varQty > 0 ? `+${varQty}` : varQty}</td>
                        <td className="p-4 text-center font-mono">{Number(line.unit_cost).toLocaleString()} {language === 'ar' ? 'ش.ج' : 'ILS'}</td>
                        <td className="p-4 text-center font-mono font-black" dir="ltr">{varVal > 0 ? `+${varVal.toLocaleString()}` : varVal.toLocaleString()} {language === 'ar' ? 'ش.ج' : 'ILS'}</td>
                        <td className={`p-4 ${language === 'ar' ? 'text-left' : 'text-right'} font-bold`}>{line.notes || (language === 'ar' ? 'مطابق' : 'Matching')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-3 gap-8 text-center mt-32 pt-8 border-t-2 border-dashed border-slate-200">
              <div>
                <p className="text-xs font-black text-slate-500 mb-16">{language === 'ar' ? 'أمين المخزن المختص' : 'Custodian Signature'}</p>
                <div className="border-b-2 border-slate-300 w-3/4 mx-auto"></div>
              </div>
              <div>
                <p className="text-xs font-black text-slate-500 mb-16">{language === 'ar' ? 'المحاسب المالي / ممثل الإدارة المالية' : 'Financial Ledger Officer'}</p>
                <div className="border-b-2 border-slate-300 w-3/4 mx-auto"></div>
              </div>
              <div>
                <p className="text-xs font-black text-indigo-600 mb-16">{language === 'ar' ? 'رئيس لجنة الجرد والرقابة' : 'Head of Auditing Committee'}</p>
                <div className="border-b-2 border-indigo-200 w-3/4 mx-auto"></div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={`${isSubcomponent ? 'py-4' : 'p-8 lg:p-12 max-w-[1600px] mx-auto'} print:hidden`}>

        {/* 🔄 Split Sub-Navigation for Merged Audits */}
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl mb-8 w-fit border border-slate-200/60 shadow-inner flex-wrap">
          <button
            onClick={() => setReconSubTab('master-stock')}
            className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              reconSubTab === 'master-stock'
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>📦</span> {language === 'ar' ? 'الأرصدة الشاملة والباركود (Master Stock Ledger)' : 'Master Stock Ledger'}
          </button>
          <button
            onClick={() => setReconSubTab('official-protocols')}
            className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              reconSubTab === 'official-protocols'
                ? 'bg-slate-900 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>⚖️</span> {language === 'ar' ? 'محاضر الجرد والتسويات الرسمية (Official Count Protocols)' : 'Official Audit Protocols'}
          </button>
        </div>

        {reconSubTab === 'master-stock' ? (
          <AdvancedStockControl isSubcomponent={true} />
        ) : (
          <>
            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12 relative z-10">
          <div>
            <div className="inline-flex items-center gap-3 px-4 py-2 bg-indigo-50/50 border border-indigo-100/50 text-indigo-700 rounded-2xl font-black text-xs tracking-wider uppercase mb-3 backdrop-blur-sm">
              <span>⚖️</span> {language === 'ar' ? 'تسوية ومطابقة الجرد' : 'Inventory Audit & Reconciliation'}
            </div>
            <h1 className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">
              {language === 'ar' ? 'الجرد والتسويات المخزنية' : 'Stock Counts & Adjustments'}
            </h1>
            <p className="text-sm font-bold text-slate-500 mt-3 max-w-xl leading-relaxed">
              {language === 'ar'
                ? 'إجراء المطابقات الفعلية للمخازن والمواقع، كشف العجز والزيادة، وتوليد قيود التسوية المالية آلياً مع محاضر لجان الجرد الرسمية.'
                : 'Reconcile ledger counts against physical audits, lock in deficit/surplus discrepancies, and automatically post financial adjustments.'}
            </p>
          </div>

          <button
            onClick={() => setShowAuditModal(true)}
            className="group relative px-8 py-4 bg-slate-900 hover:bg-indigo-600 text-white rounded-2xl font-black text-sm transition-all active:scale-95 shadow-xl hover:shadow-indigo-500/30 overflow-hidden"
          >
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
            <span className="flex items-center gap-3 relative z-10">
              <span>➕</span> {language === 'ar' ? 'إنشاء محضر جرد جديد' : 'New Stock Count Protocol'}
            </span>
          </button>
        </div>

        {/* STATS CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-bl-[4rem] -z-10 group-hover:scale-110 transition-transform duration-700"></div>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs font-black text-slate-400 mb-1">{language === 'ar' ? 'محاضر جرد قيد المراجعة والتسوية' : 'Pending Audit Verification'}</p>
                <h3 className="text-4xl font-black text-slate-900 font-mono">{pendingAuditsCount}</h3>
              </div>
              <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center text-3xl shadow-inner">
                ⏳
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-[4rem] -z-10 group-hover:scale-110 transition-transform duration-700"></div>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs font-black text-slate-400 mb-1">{language === 'ar' ? 'محاضر معتمدة ومسواة مالياً' : 'Approved & Post-Reconciled'}</p>
                <h3 className="text-4xl font-black text-slate-900 font-mono">{approvedAuditsCount}</h3>
              </div>
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center text-3xl shadow-inner">
                ✅
              </div>
            </div>
          </div>
        </div>

        {/* AUDITS TABLE */}
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100/60 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-b from-slate-50/50 to-transparent pointer-events-none h-32"></div>

          <div className="p-8 border-b border-slate-100 flex justify-between items-center relative z-10">
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-3">
              <span>📋</span> {language === 'ar' ? 'سجل محاضر الجرد والتسويات' : 'Historical Count Records'}
            </h2>
          </div>

          <div className="overflow-x-auto relative z-10">
            <table className={`w-full border-collapse ${language === 'ar' ? 'text-right' : 'text-left'}`}>
              <thead>
                <tr className={`bg-slate-50/80 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-100 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                  <th className={`p-5 font-black ${language === 'ar' ? 'pr-8' : 'pl-8'}`}>{language === 'ar' ? 'رقم المحضر' : 'Audit ID'}</th>
                  <th className="p-5 font-black">{language === 'ar' ? 'المخزن / الموقع' : 'Warehouse Location'}</th>
                  <th className="p-5 font-black">{language === 'ar' ? 'تاريخ الجرد' : 'Count Date'}</th>
                  <th className="p-5 font-black">{language === 'ar' ? 'لجنة الجرد' : 'Auditor'}</th>
                  <th className="p-5 font-black">{language === 'ar' ? 'ملاحظات المحضر' : 'Observation Notes'}</th>
                  <th className="p-5 font-black">{language === 'ar' ? 'الحالة الدفترية' : 'Verification Status'}</th>
                  <th className={`p-5 font-black ${language === 'ar' ? 'pl-8 text-left' : 'pr-8 text-right'}`}>{language === 'ar' ? 'إجراءات والتسوية' : 'Actions & Settlement'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm font-bold text-slate-700">
                {isLoading ? (
                  [...Array(3)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan="7" className="p-6">
                        <div className="h-4 bg-slate-100 rounded-full w-full"></div>
                      </td>
                    </tr>
                  ))
                ) : audits.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="py-16 text-center text-slate-400 font-bold">
                      {language === 'ar' ? 'لا توجد محاضر جرد مسجلة حتى الآن' : 'No recorded stock count protocols found.'}
                    </td>
                  </tr>
                ) : (
                  audits.map(audit => {
                    const isApproved = audit.status?.includes('معتمد');
                    const isExpanded = expandedAuditId === audit.id;

                    return (
                      <React.Fragment key={audit.id}>
                        <tr className={`hover:bg-slate-50/50 transition-colors group ${isExpanded ? 'bg-slate-50/80' : ''}`}>
                          <td className={`p-5 font-mono text-xs text-indigo-600 font-black ${language === 'ar' ? 'pr-8' : 'pl-8'}`}>AUD-{audit.id.toString().padStart(5, '0')}</td>
                          <td className="p-5 font-black text-slate-900">{audit.warehouse}</td>
                          <td className="p-5 font-mono text-xs text-slate-500">{audit.audit_date?.split('T')[0]}</td>
                          <td className="p-5 text-slate-600">{audit.created_by}</td>
                          <td className="p-5 text-slate-500 max-w-xs truncate">{audit.notes || '---'}</td>
                          <td className="p-5">
                            <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black inline-flex items-center gap-1.5 border ${isApproved ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'
                              }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${isApproved ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></span>
                              {audit.status}
                            </span>
                          </td>
                          <td className={`p-5 ${language === 'ar' ? 'pl-8 text-left' : 'pr-8 text-right'}`}>
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleApproveAudit(audit.id, audit.warehouse)}
                                disabled={isApproved}
                                className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${isApproved
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-50'
                                    : 'bg-slate-900 hover:bg-emerald-600 text-white shadow-md active:scale-95'
                                  }`}
                                title={language === 'ar' ? "اعتماد الجرد وتوليد قيد التسوية آلياً" : "Approve physical variance and post ledger entries"}
                              >
                                <span>⚡</span> {isApproved ? (language === 'ar' ? 'تمت التسوية' : 'Settled') : (language === 'ar' ? 'اعتماد وتسوية' : 'Approve & Adjust')}
                              </button>
                              <button
                                onClick={() => handlePrintAudit(audit)}
                                className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors shadow-sm"
                                title={language === 'ar' ? "طباعة محضر الجرد الرسمي" : "Print count protocol report"}
                              >
                                🖨️
                              </button>
                              <button
                                onClick={() => handleExpandAudit(audit.id)}
                                className={`w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center transition-transform ${isExpanded ? 'bg-slate-900 text-white rotate-180' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                                title={language === 'ar' ? "عرض تفاصيل الأصناف والفروق" : "Inspect audit lines and discrepancies"}
                              >
                                ▼
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* EXPANDED AUDIT LINES */}
                        {isExpanded && (
                          <tr className="bg-slate-900/5 border-b border-slate-200/60">
                            <td colSpan="7" className="p-8">
                              <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-xl">
                                <h3 className="text-sm font-black text-slate-800 mb-6 flex items-center gap-2">
                                  <span>🔍</span> {language === 'ar' ? `تفاصيل الفحص الفعلي ومقارنة الأرصدة (المحضر #AUD-${audit.id})` : `Audit Line Discrepancies (Protocol #AUD-${audit.id})`}
                                </h3>

                                {loadingDetails ? (
                                  <div className="py-12 text-center text-xs font-bold text-slate-400 animate-pulse">{language === 'ar' ? 'جاري تحميل تفاصيل المطابقة...' : 'Loading audit details...'}</div>
                                ) : auditDetails.length === 0 ? (
                                  <div className="py-12 text-center text-xs font-bold text-slate-400">{language === 'ar' ? 'لا توجد أصناف مسجلة داخل هذا المحضر' : 'No material items found.'}</div>
                                ) : (
                                  <div className="overflow-x-auto">
                                    <table className={`w-full border-collapse ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                                      <thead>
                                        <tr className={`bg-slate-50 text-[10px] font-black uppercase text-slate-500 border-b border-slate-100 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                                          <th className={`p-4 ${language === 'ar' ? 'rounded-tr-xl pr-6' : 'rounded-tl-xl pl-6'}`}>{language === 'ar' ? 'الصنف والباتش' : 'Pharmaceutical & Batch'}</th>
                                          <th className="p-4 text-center">{language === 'ar' ? 'الرصيد الدفتري (النظام)' : 'Ledger Count'}</th>
                                          <th className="p-4 text-center">{language === 'ar' ? 'الجرد الفعلي (المخزن)' : 'Physical Count'}</th>
                                          <th className="p-4 text-center">{language === 'ar' ? 'العجز / الزيادة' : 'Variance'}</th>
                                          <th className="p-4 text-center">{language === 'ar' ? 'متوسط التكلفة' : 'Average Cost'}</th>
                                          <th className="p-4 text-center">{language === 'ar' ? 'القيمة المالية للفارق' : 'Reconciliation Impact'}</th>
                                          <th className={`p-4 ${language === 'ar' ? 'rounded-tl-xl pl-6 text-left' : 'rounded-tr-xl pr-6 text-right'}`}>{language === 'ar' ? 'ملاحظات الصنف' : 'Justification Notes'}</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100 text-xs font-bold">
                                        {auditDetails.map(line => {
                                          const varQty = Number(line.variance || 0);
                                          const varVal = varQty * Number(line.unit_cost || 0);
                                          const isLoss = varQty < 0;
                                          const isGain = varQty > 0;

                                          return (
                                            <tr key={line.id} className={`hover:bg-slate-50/50 transition-colors ${isLoss ? 'bg-rose-50/40' : isGain ? 'bg-emerald-50/40' : ''}`}>
                                              <td className={`p-4 ${language === 'ar' ? 'pr-6' : 'pl-6'}`}>
                                                <span className="block font-black text-slate-900">{line.item_name}</span>
                                                <span className="text-[10px] text-slate-400 font-mono">Batch: {line.batch_no}</span>
                                              </td>
                                              <td className="p-4 text-center font-mono text-slate-600">{Number(line.recorded_qty).toLocaleString()}</td>
                                              <td className="p-4 text-center font-mono font-black text-slate-900 text-sm">{Number(line.physical_qty).toLocaleString()}</td>
                                              <td className="p-4 text-center font-mono font-black" dir="ltr">
                                                <span className={`px-2.5 py-1 rounded-lg text-[11px] ${isLoss ? 'bg-rose-100 text-rose-700' : isGain ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                                  {varQty > 0 ? `+${varQty}` : varQty}
                                                </span>
                                              </td>
                                              <td className="p-4 text-center font-mono text-slate-500">{Number(line.unit_cost).toLocaleString()} {language === 'ar' ? 'ش.ج' : 'ILS'}</td>
                                              <td className="p-4 text-center font-mono font-black" dir="ltr">
                                                <span className={isLoss ? 'text-rose-600' : isGain ? 'text-emerald-600' : 'text-slate-500'}>
                                                  {varVal > 0 ? `+${varVal.toLocaleString()}` : varVal.toLocaleString()} {language === 'ar' ? 'ش.ج' : 'ILS'}
                                                </span>
                                              </td>
                                              <td className={`p-4 ${language === 'ar' ? 'pl-6 text-left' : 'pr-6 text-right'} text-slate-600`}>{line.notes || (language === 'ar' ? 'مطابق' : 'Reconciled')}</td>
                                            </tr>
                                          );
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
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
        </div>
          </>
        )}
      </div>

      {/* CREATE AUDIT MODAL */}
      {showAuditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 print:hidden">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowAuditModal(false)}></div>

          <div className="bg-white w-full max-w-5xl rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 p-8 text-white relative overflow-hidden shrink-0">
              <div className="absolute top-0 left-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
              <h2 className="text-2xl font-black relative z-10 flex items-center gap-3">
                <span>⚖️</span> {language === 'ar' ? 'إنشاء محضر جرد ومطابقة مخزنية' : 'Initiate Warehouse Stock Count'}
              </h2>
              <p className="text-sm text-slate-400 font-bold mt-2 relative z-10">{language === 'ar' ? 'إدخال الأرصدة الفعلية لمقارنتها بالنظام وتوليد الفروق' : 'Input actual physical counts to compare against current ledger records'}</p>
            </div>

            <div className="p-8 overflow-y-auto space-y-8">
              <form id="auditForm" onSubmit={handleSubmitAudit} className="space-y-8">

                {/* WAREHOUSE SELECT & NOTES */}
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-700">{language === 'ar' ? 'المخزن / الموقع المراد جرده' : 'Select Target Warehouse'} <span className="text-rose-500">*</span></label>
                    <select
                      required
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                      value={selectedWarehouse}
                      onChange={(e) => handleWarehouseChange(e.target.value)}
                    >
                      <option value="">{language === 'ar' ? '-- اختر المخزن --' : '-- Choose Warehouse --'}</option>
                      {warehouses.map(wh => (
                        <option key={wh.id} value={wh.name}>{wh.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-700">{language === 'ar' ? 'ملاحظات وبيان لجنة الجرد' : 'General Observations / Notes'}</label>
                    <input
                      type="text"
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                      value={auditNotes}
                      onChange={(e) => setAuditNotes(e.target.value)}
                      placeholder={language === 'ar' ? 'مثال: جرد ربع سنوي بحضور اللجنة المالية...' : 'e.g. Q2 audit with the clinical finance officers...'}
                    />
                  </div>
                </div>

                {/* INVENTORY ITEMS COUNT GRID */}
                {selectedWarehouse && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-black text-indigo-600 uppercase tracking-wider flex items-center gap-2">
                      <span>📦</span> {language === 'ar' ? 'قائمة أصناف المخزن المحددة وإدخال الجرد الفعلي' : 'Warehouse Inventory Listing & Count Sheets'}
                    </h3>

                    {auditLines.length === 0 ? (
                      <div className="p-12 bg-slate-50 rounded-3xl text-center text-sm font-bold text-slate-400 border border-slate-200">
                        {language === 'ar' ? 'لا توجد أصناف مسجلة حالياً داخل هذا المخزن' : 'There are no active stock items registered in this warehouse.'}
                      </div>
                    ) : (
                      <div className="border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                        <table className={`w-full border-collapse ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                          <thead>
                            <tr className={`bg-slate-900 text-white text-[11px] font-black uppercase tracking-wider ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                              <th className={`p-4 pr-6 ${language === 'ar' ? 'rounded-tr-2xl' : 'rounded-tl-2xl'}`}>{language === 'ar' ? 'الصنف والباتش' : 'Pharmaceutical & Batch'}</th>
                              <th className="p-4 text-center">{language === 'ar' ? 'الرصيد الدفتري' : 'Ledger Qty'}</th>
                              <th className="p-4 text-center bg-indigo-950 text-white">{language === 'ar' ? 'الجرد الفعلي (Physical)' : 'Physical Count'}</th>
                              <th className="p-4 text-center">{language === 'ar' ? 'الفارق' : 'Variance'}</th>
                              <th className={`p-4 pl-6 ${language === 'ar' ? 'rounded-tl-2xl text-left' : 'rounded-tr-2xl text-right'}`}>{language === 'ar' ? 'ملاحظات التبرير' : 'Observation Justification'}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-xs font-bold bg-white">
                            {auditLines.map(line => {
                              const diff = Number(line.physical_qty) - Number(line.recorded_qty);
                              return (
                                <tr key={line.inventory_id} className="hover:bg-slate-50/50 transition-colors">
                                  <td className={`p-4 ${language === 'ar' ? 'pr-6' : 'pl-6'}`}>
                                    <span className="block font-black text-slate-900 text-sm">{line.item_name}</span>
                                    <span className="text-[10px] text-slate-400 font-mono">Batch: {line.batch_no} | Cost: {line.unit_cost} {language === 'ar' ? 'ش.ج' : 'ILS'}</span>
                                  </td>
                                  <td className="p-4 text-center font-mono text-sm text-slate-600">{line.recorded_qty}</td>
                                  <td className="p-4 text-center bg-indigo-50/30">
                                    <input
                                      type="number"
                                      required
                                      min="0"
                                      step="0.01"
                                      className="w-28 mx-auto bg-white border-2 border-indigo-200 rounded-xl px-3 py-2 text-center font-black font-mono text-indigo-950 focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/10 transition-all text-sm shadow-inner"
                                      value={line.physical_qty}
                                      onChange={(e) => handlePhysicalQtyChange(line.inventory_id, e.target.value)}
                                    />
                                  </td>
                                  <td className="p-4 text-center font-mono font-black" dir="ltr">
                                    <span className={`px-2.5 py-1 rounded-lg text-[11px] ${diff < 0 ? 'bg-rose-100 text-rose-700' : diff > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                      {diff > 0 ? `+${diff}` : diff}
                                    </span>
                                  </td>
                                  <td className={`p-4 ${language === 'ar' ? 'pl-6 text-left' : 'pr-6 text-right'}`}>
                                    <input
                                      type="text"
                                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:bg-white focus:border-indigo-500 transition-all"
                                      value={line.notes}
                                      onChange={(e) => handleLineNotesChange(line.inventory_id, e.target.value)}
                                      placeholder={diff < 0 ? (language === 'ar' ? 'تبرير العجز...' : 'Deficit reason...') : diff > 0 ? (language === 'ar' ? 'مصدر الزيادة...' : 'Surplus source...') : (language === 'ar' ? 'مطابق' : 'Matching')}
                                    />
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

              </form>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 shrink-0 flex justify-end gap-3 rounded-b-[2.5rem]">
              <button
                type="button"
                onClick={() => setShowAuditModal(false)}
                className="px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors"
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="submit"
                form="auditForm"
                className="px-8 py-3 bg-slate-900 hover:bg-indigo-600 text-white rounded-xl font-black text-sm transition-all active:scale-95 shadow-md flex items-center gap-2"
              >
                <span>🚀</span> {language === 'ar' ? 'حفظ محضر الجرد' : 'Save Count Protocol'}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
        @media print {
          @page { margin: 0; size: A4 portrait; }
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
}

export default StockReconciliation;
