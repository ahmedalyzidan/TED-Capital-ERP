import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

function StockTransfers({ isSubcomponent }) {
  const { language } = useLanguage();
  const [transfers, setTransfers] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [projects, setProjects] = useState([]);

  const [isLoading, setIsLoading] = useState(true);

  // New Transfer State
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [formData, setFormData] = useState({
    material: '',
    qty: '',
    from_project: '',
    to_project: '',
    date: new Date().toISOString().split('T')[0],
    expected_arrival: '',
    shipping_manifest: '',
    batch_number: ''
  });

  // Print Waybill State
  const [selectedTransfer, setSelectedTransfer] = useState(null);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [transfersRes, inventoryRes, projectsRes] = await Promise.all([
        api.get('/dynamic/table/inventory_transfers?limit=500&sort_by=id&sort_order=desc'),
        api.get('/dynamic/table/inventory_items?limit=500'),
        api.get('/dynamic/table/projects?limit=100')
      ]);

      setTransfers(transfersRes.data.data || []);

      let rawInv = inventoryRes.data.data || [];
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

      setInventory(pharmaItems.filter(i => i.qty > 0));

      const prjs = projectsRes.data.data || [];
      // Provide default projects starting with the Pharmacy Store
      setProjects([{ id: 9, name: 'مخزن الصيدليات والأدوية' }, ...prjs]);
    } catch (err) {
      console.error('Failed to fetch transfers data', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmitTransfer = async (e) => {
    e.preventDefault();
    if (!formData.material || !formData.qty || !formData.from_project || !formData.to_project) {
      alert(language === 'ar' ? "الرجاء إكمال كافة البيانات الأساسية (الصنف، الكمية، المصدر والوجهة)" : "Please complete all mandatory fields (item, quantity, origin, and destination)");
      return;
    }

    // Find selected item to get batch number if not manually provided
    const selectedItem = inventory.find(i => i.item_name === formData.material);

    try {
      await api.post('/dynamic/add/inventory_transfers', {
        material: formData.material,
        qty: Number(formData.qty),
        from_project: formData.from_project,
        to_project: formData.to_project,
        date: formData.date,
        expected_arrival: formData.expected_arrival || null,
        shipping_manifest: formData.shipping_manifest || 'N/A',
        batch_number: formData.batch_number || (selectedItem?.batch_no) || 'N/A',
        status: 'قيد النقل (In Transit)',
        created_by: 'Admin'
      });

      setShowTransferModal(false);
      setFormData({
        material: '',
        qty: '',
        from_project: '',
        to_project: '',
        date: new Date().toISOString().split('T')[0],
        expected_arrival: '',
        shipping_manifest: '',
        batch_number: ''
      });
      fetchData();
    } catch (err) {
      console.error('Error creating transfer', err);
      alert(language === 'ar' ? 'حدث خطأ أثناء إنشاء إذن التحويل' : 'Failed to create stock transfer');
    }
  };

  const handleReceiveTransfer = async (id) => {
    if (!window.confirm(language === 'ar' ? "هل أنت متأكد من استلام البضاعة في الموقع وإقفال إذن النقل؟" : "Are you sure you want to receive this shipment at the site and complete this transfer waybill?")) return;
    try {
      await api.put(`/dynamic/update/inventory_transfers/${id}`, {
        status: 'مكتمل (Completed)'
      });
      fetchData();
    } catch (err) {
      console.error('Error receiving transfer', err);
    }
  };

  const printWaybill = (transfer) => {
    setSelectedTransfer(transfer);
    setTimeout(() => {
      window.print();
    }, 300);
  };

  // Stats
  const activeTransfersCount = transfers.filter(t => t.status?.includes('قيد')).length;
  const completedTransfersCount = transfers.filter(t => t.status?.includes('مكتمل')).length;

  return (
    <div className="font-sans text-slate-900 selection:bg-indigo-500 selection:text-white" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* PRINT ONLY SECTION - WAYBILL */}
      {selectedTransfer && (
        <div className="hidden print:block bg-white p-10 min-h-screen" dir={language === 'ar' ? 'rtl' : 'ltr'}>
          <div className="border-4 border-slate-900 rounded-3xl p-10 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-slate-100 rounded-bl-full -z-10"></div>

            <div className="flex justify-between items-start border-b-2 border-slate-200 pb-8 mb-8">
              <div>
                <h1 className="text-4xl font-black text-slate-900 tracking-tight">
                  {language === 'ar' ? 'إذن نقل بضاعة داخلي' : 'Internal Stock Transfer Waybill'}
                </h1>
                <p className="text-lg font-bold text-slate-500 mt-2">Internal Material Transfer Waybill</p>
                <div className="mt-4 inline-flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-xl text-sm font-black text-slate-700">
                  {language === 'ar' ? 'رقم الإذن:' : 'Waybill No:'} <span className="font-mono text-indigo-600">TRN-{selectedTransfer.id.toString().padStart(6, '0')}</span>
                </div>
              </div>
              <div className={language === 'ar' ? 'text-left' : 'text-right'}>
                <div className="w-16 h-16 bg-slate-900 text-white rounded-3xl flex items-center justify-center font-black text-3xl shadow-xl inline-flex">T</div>
                <h2 className="text-sm font-black text-slate-900 mt-3">{language === 'ar' ? 'بريميميد فارما' : 'PRIMEMED PHARMA'}</h2>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Enterprise Logistics</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-8 mb-10">
              <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <h3 className="text-xs font-black text-slate-400 mb-4 uppercase tracking-wider flex items-center gap-2">
                  <span>📤</span> {language === 'ar' ? 'جهة الإصدار (المصدر)' : 'Origin (From)'}
                </h3>
                <p className="text-xl font-black text-slate-900">{selectedTransfer.from_project}</p>
                <p className="text-sm font-bold text-slate-500 mt-2">{language === 'ar' ? `تاريخ الشحن: ${selectedTransfer.date?.split('T')[0]}` : `Shipment Date: ${selectedTransfer.date?.split('T')[0]}`}</p>
              </div>
              <div className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-16 h-full bg-gradient-to-r from-white/40 to-transparent"></div>
                <h3 className="text-xs font-black text-indigo-400 mb-4 uppercase tracking-wider flex items-center gap-2">
                  <span>📥</span> {language === 'ar' ? 'جهة الاستلام (الوجهة)' : 'Destination (To)'}
                </h3>
                <p className="text-xl font-black text-indigo-950">{selectedTransfer.to_project}</p>
                <p className="text-sm font-bold text-indigo-700/70 mt-2">{language === 'ar' ? `تاريخ الوصول المتوقع: ${selectedTransfer.expected_arrival?.split('T')[0] || 'غير محدد'}` : `Expected Arrival: ${selectedTransfer.expected_arrival?.split('T')[0] || 'N/A'}`}</p>
              </div>
            </div>

            <div className="mb-10">
              <table className={`w-full border-collapse ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="p-4 font-black text-sm rounded-tr-2xl">{language === 'ar' ? 'بيان الصنف والمادة (Material)' : 'Material Description'}</th>
                    <th className="p-4 font-black text-sm">{language === 'ar' ? 'الرقم التشغيلي (Batch/Serial)' : 'Batch/Serial Number'}</th>
                    <th className={`p-4 font-black text-sm text-center rounded-tl-2xl`}>{language === 'ar' ? 'الكمية المحولة (Qty)' : 'Transferred Qty'}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b-2 border-slate-100 bg-slate-50/50">
                    <td className="p-6 font-black text-lg text-slate-900">{selectedTransfer.material}</td>
                    <td className="p-6 font-bold text-slate-500 font-mono">{selectedTransfer.batch_number || 'N/A'}</td>
                    <td className="p-6 font-black text-2xl text-center text-indigo-600 font-mono">{Number(selectedTransfer.qty).toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 mb-12">
              <h3 className="text-xs font-black text-slate-400 mb-2 uppercase tracking-wider">{language === 'ar' ? 'بيانات بوليصة الشحن والسائق (Manifest Details)' : 'Shipping Manifest & Driver Details'}</h3>
              <p className="text-md font-bold text-slate-800">{selectedTransfer.shipping_manifest}</p>
            </div>

            <div className="grid grid-cols-3 gap-8 text-center mt-20 pt-8 border-t-2 border-dashed border-slate-200">
              <div>
                <p className="text-xs font-black text-slate-500 mb-12">{language === 'ar' ? 'توقيع أمين مخزن (المصدر)' : 'Dispensing Warehouse Officer'}</p>
                <div className="border-b-2 border-slate-300 w-3/4 mx-auto"></div>
              </div>
              <div>
                <p className="text-xs font-black text-slate-500 mb-12">{language === 'ar' ? 'توقيع السائق / شركة النقل' : 'Transporter / Driver Signature'}</p>
                <div className="border-b-2 border-slate-300 w-3/4 mx-auto"></div>
              </div>
              <div>
                <p className="text-xs font-black text-indigo-600 mb-12">{language === 'ar' ? 'توقيع مهندس الموقع (المستلم)' : 'Receiving Site Supervisor'}</p>
                <div className="border-b-2 border-indigo-200 w-3/4 mx-auto"></div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={`${isSubcomponent ? 'py-4' : 'p-8 lg:p-12 max-w-[1600px] mx-auto'} print:hidden`}>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12 relative z-10">
          <div>
            <div className="inline-flex items-center gap-3 px-4 py-2 bg-indigo-50/50 border border-indigo-100/50 text-indigo-700 rounded-2xl font-black text-xs tracking-wider uppercase mb-3 backdrop-blur-sm">
              <span>🚚</span> {language === 'ar' ? 'التحويلات اللوجستية واللوجستيات' : 'Enterprise Logistics'}
            </div>
            <h1 className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">
              {language === 'ar' ? 'التحويلات المخزنية وإمداد المواقع' : 'Warehouse Stock Transfers'}
            </h1>
            <p className="text-sm font-bold text-slate-500 mt-3 max-w-xl leading-relaxed">
              {language === 'ar'
                ? 'إدارة نقل العهد والبضائع بين المخازن الرئيسية ومواقع المشاريع المختلفة، مع توثيق طباعي كامل لرحلة البضاعة.'
                : 'Management of cargo and equipment transit between primary central warehouses and project locations, with full waybill printing.'}
            </p>
          </div>

          <button
            onClick={() => setShowTransferModal(true)}
            className="group relative px-8 py-4 bg-slate-900 hover:bg-indigo-600 text-white rounded-2xl font-black text-sm transition-all active:scale-95 shadow-xl hover:shadow-indigo-500/30 overflow-hidden"
          >
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
            <span className="flex items-center gap-3 relative z-10">
              <span>➕</span> {language === 'ar' ? 'إنشاء إذن تحويل مخزني' : 'Create Stock Transfer'}
            </span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-50 rounded-bl-[4rem] -z-10 group-hover:scale-110 transition-transform duration-700"></div>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs font-black text-slate-400 mb-1">{language === 'ar' ? 'بضائع قيد النقل للمواقع' : 'Shipments In Transit'}</p>
                <h3 className="text-4xl font-black text-slate-900 font-mono">{activeTransfersCount}</h3>
              </div>
              <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center text-3xl shadow-inner">
                🚚
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-[4rem] -z-10 group-hover:scale-110 transition-transform duration-700"></div>
            <div className="flex justify-between items-center">
              <div>
                <p className="text-xs font-black text-slate-400 mb-1">{language === 'ar' ? 'تحويلات مكتملة ومستلمة' : 'Completed & Received'}</p>
                <h3 className="text-4xl font-black text-slate-900 font-mono">{completedTransfersCount}</h3>
              </div>
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center text-3xl shadow-inner">
                ✅
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100/60 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-b from-slate-50/50 to-transparent pointer-events-none h-32"></div>

          <div className="p-8 border-b border-slate-100 flex justify-between items-center relative z-10">
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-3">
              <span>📋</span> {language === 'ar' ? 'سجل التحويلات وإمداد المشاريع' : 'Transfers Registry & Supply Logs'}
            </h2>
          </div>

          <div className="overflow-x-auto relative z-10">
            <table className={`w-full border-collapse ${language === 'ar' ? 'text-right' : 'text-left'}`}>
              <thead>
                <tr className={`bg-slate-50/80 text-slate-500 text-[10px] font-black uppercase tracking-widest border-b border-slate-100 ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                  <th className={`p-5 font-black ${language === 'ar' ? 'pr-8' : 'pl-8'}`}>{language === 'ar' ? 'رقم الإذن' : 'Waybill ID'}</th>
                  <th className="p-5 font-black">{language === 'ar' ? 'الصنف والباتش' : 'Item & Batch'}</th>
                  <th className="p-5 font-black">{language === 'ar' ? 'الكمية' : 'Quantity'}</th>
                  <th className="p-5 font-black">{language === 'ar' ? 'المصدر (من)' : 'Source (From)'}</th>
                  <th className="p-5 font-black">{language === 'ar' ? 'الوجهة (إلى)' : 'Destination (To)'}</th>
                  <th className="p-5 font-black">{language === 'ar' ? 'التاريخ' : 'Date'}</th>
                  <th className="p-5 font-black">{language === 'ar' ? 'الحالة' : 'Status'}</th>
                  <th className={`p-5 font-black ${language === 'ar' ? 'pl-8 text-left' : 'pr-8 text-right'}`}>{language === 'ar' ? 'إجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-sm font-bold text-slate-700">
                {isLoading ? (
                  [...Array(3)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan="8" className="p-6">
                        <div className="h-4 bg-slate-100 rounded-full w-full"></div>
                      </td>
                    </tr>
                  ))
                ) : transfers.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-16 text-center text-slate-400 font-bold">
                      {language === 'ar' ? 'لا توجد عمليات تحويل مسجلة حتى الآن' : 'No recorded stock transfers found.'}
                    </td>
                  </tr>
                ) : (
                  transfers.map(tr => {
                    const isCompleted = tr.status?.includes('مكتمل');
                    return (
                      <tr key={tr.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className={`p-5 font-mono text-xs text-indigo-600 font-black ${language === 'ar' ? 'pr-8' : 'pl-8'}`}>TRN-{tr.id.toString().padStart(5, '0')}</td>
                        <td className="p-5">
                          <span className="block font-black text-slate-900">{tr.material}</span>
                          <span className="text-[10px] font-bold text-slate-400 font-mono">Batch: {tr.batch_number || 'N/A'}</span>
                        </td>
                        <td className="p-5 font-mono font-black text-lg text-slate-800">{Number(tr.qty).toLocaleString()}</td>
                        <td className="p-5 text-slate-600">{tr.from_project}</td>
                        <td className="p-5 text-slate-900 font-black">{tr.to_project}</td>
                        <td className="p-5 text-xs text-slate-500 font-mono">{tr.date?.split('T')[0]}</td>
                        <td className="p-5">
                          <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black inline-flex items-center gap-1.5 border ${isCompleted ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'
                            }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${isCompleted ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></span>
                            {tr.status}
                          </span>
                        </td>
                        <td className={`p-5 ${language === 'ar' ? 'pl-8 text-left' : 'pr-8 text-right'}`}>
                          <div className={`flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity`}>
                            <button
                              onClick={() => printWaybill(tr)}
                              className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors animate-none"
                              title={language === 'ar' ? "طباعة بوليصة النقل" : "Print waybill"}
                            >
                              🖨️
                            </button>
                            {!isCompleted && (
                              <button
                                onClick={() => handleReceiveTransfer(tr.id)}
                                className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-black transition-colors"
                                title={language === 'ar' ? "تأكيد وصول البضاعة" : "Confirm goods receipt"}
                              >
                                {language === 'ar' ? 'تأكيد الاستلام' : 'Receive Stock'}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* CREATE TRANSFER MODAL */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 print:hidden">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setShowTransferModal(false)}></div>

          <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 p-8 text-white relative overflow-hidden shrink-0">
              <div className="absolute top-0 left-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2"></div>
              <h2 className="text-2xl font-black relative z-10 flex items-center gap-3">
                <span>🚚</span> {language === 'ar' ? 'إصدار إذن تحويل مخزني جديد' : 'Issue New Stock Transfer Waybill'}
              </h2>
              <p className="text-sm text-slate-400 font-bold mt-2 relative z-10">{language === 'ar' ? 'إمداد مواقع المشاريع أو نقل العهد بين المخازن' : 'Transfer inventory to projects or move stock between locations'}</p>
            </div>

            <div className="p-8 overflow-y-auto">
              <form id="transferForm" onSubmit={handleSubmitTransfer} className="space-y-6">

                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-6">
                  <h3 className="text-xs font-black text-indigo-600 uppercase tracking-wider mb-2">{language === 'ar' ? '1. بيانات الصنف والكمية' : '1. Item Details & Quantity'}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-700">{language === 'ar' ? 'الصنف المخزني المراد نقله' : 'Select Stock Item'} <span className="text-rose-500">*</span></label>
                      <select
                        required
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                        value={formData.material}
                        onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                      >
                        <option value="">{language === 'ar' ? '-- اختر الصنف المتوفر --' : '-- Choose Available Item --'}</option>
                        {inventory.map(inv => (
                          <option key={inv.id} value={inv.item_name}>
                            {inv.item_name} ({language === 'ar' ? `المتاح: ${inv.qty}` : `Available: ${inv.qty}`}) - {language === 'ar' ? `باتش: ${inv.batch_no || 'بدون'}` : `Batch: ${inv.batch_no || 'None'}`}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-700">{language === 'ar' ? 'الكمية المحولة' : 'Quantity to Transfer'} <span className="text-rose-500">*</span></label>
                      <input
                        type="number"
                        required
                        min="0.01"
                        step="0.01"
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-black font-mono text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                        value={formData.qty}
                        onChange={(e) => setFormData({ ...formData, qty: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-6">
                  <h3 className="text-xs font-black text-indigo-600 uppercase tracking-wider mb-2">{language === 'ar' ? '2. توجيه التحويل المخزني' : '2. Warehouse Routing'}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-700">{language === 'ar' ? 'من (المصدر)' : 'From (Source)'} <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        required
                        list="projects-list"
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                        value={formData.from_project}
                        onChange={(e) => setFormData({ ...formData, from_project: e.target.value })}
                        placeholder={language === 'ar' ? 'مثال: مخزن الصيدليات والأدوية' : 'e.g. Pharmacy Central Store'}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-700">{language === 'ar' ? 'إلى (الوجهة / المشروع)' : 'To (Destination)'} <span className="text-rose-500">*</span></label>
                      <input
                        type="text"
                        required
                        list="projects-list"
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                        value={formData.to_project}
                        onChange={(e) => setFormData({ ...formData, to_project: e.target.value })}
                        placeholder={language === 'ar' ? 'مثال: عيادة موقع العاصمة الإدارية' : 'e.g. New Capital Clinic'}
                      />
                    </div>

                    <datalist id="projects-list">
                      <option value="مخزن الصيدليات والأدوية" />
                      {projects.map(p => (
                        <option key={p.id} value={p.name} />
                      ))}
                    </datalist>
                  </div>
                </div>

                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-6">
                  <h3 className="text-xs font-black text-indigo-600 uppercase tracking-wider mb-2">{language === 'ar' ? '3. تفاصيل الشحن والتواريخ' : '3. Transit Details & Dates'}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-700">{language === 'ar' ? 'تاريخ الشحن' : 'Shipping Date'} <span className="text-rose-500">*</span></label>
                      <input
                        type="date"
                        required
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-700">{language === 'ar' ? 'تاريخ الوصول المتوقع' : 'Expected Arrival Date'}</label>
                      <input
                        type="date"
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                        value={formData.expected_arrival}
                        onChange={(e) => setFormData({ ...formData, expected_arrival: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-3">
                      <label className="text-xs font-black text-slate-700">{language === 'ar' ? 'بيانات السائق / بوليصة الشحن' : 'Driver & Waybill Info'}</label>
                      <input
                        type="text"
                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
                        value={formData.shipping_manifest}
                        onChange={(e) => setFormData({ ...formData, shipping_manifest: e.target.value })}
                        placeholder={language === 'ar' ? 'اسم السائق، رقم السيارة، شركة النقل...' : 'Driver name, vehicle license plate, transporter company...'}
                      />
                    </div>
                  </div>
                </div>

              </form>
            </div>

            <div className="p-6 border-t border-slate-100 bg-slate-50 shrink-0 flex justify-end gap-3 rounded-b-[2.5rem]">
              <button
                type="button"
                onClick={() => setShowTransferModal(false)}
                className="px-6 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors"
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="submit"
                form="transferForm"
                className="px-8 py-3 bg-slate-900 hover:bg-indigo-600 text-white rounded-xl font-black text-sm transition-all active:scale-95 shadow-md flex items-center gap-2"
              >
                <span>🚀</span> {language === 'ar' ? 'إصدار إذن التحويل' : 'Issue Transfer'}
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

export default StockTransfers;
