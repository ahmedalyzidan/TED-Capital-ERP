import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

export default function APDueList() {
   const [suppliers, setSuppliers] = useState([]);
   const [loading, setLoading] = useState(true);
   const navigate = useNavigate();

   useEffect(() => {
      fetchBalances();
   }, []);

   const fetchBalances = async () => {
      setLoading(true);
      try {
         const response = await api.get('/finance/ap-balances');
         setSuppliers(response.data.data || []);
      } catch (error) {
         console.error("خطأ في جلب مستحقات الموردين", error);
      } finally {
         setLoading(false);
      }
   };

   return (
      <div className="p-8 space-y-8 animate-in fade-in duration-500">
         <div className="flex justify-between items-end bg-white p-10 rounded-[2.5rem] shadow-xl border border-slate-100">
            <div>
               <span className="bg-blue-100 text-blue-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest mb-4 inline-block">Accounts Payable</span>
               <h2 className="text-4xl font-black text-slate-900 tracking-tight">تقرير مستحقات الموردين</h2>
               <p className="text-slate-500 font-bold text-lg mt-2">قائمة الموردين والمقاولين الذين لديهم أرصدة مستحقة لدى الشركة.</p>
            </div>
            <button onClick={() => navigate('/finance')} className="px-6 py-3 bg-slate-100 text-slate-900 rounded-2xl font-bold text-xs hover:bg-slate-200 transition-all flex items-center gap-2">
               <span>←</span> العودة للمالية
            </button>
         </div>

         <div className="bg-slate-900 p-8 rounded-[2rem] text-white shadow-xl max-w-sm">
            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mb-2">إجمالي الالتزامات المستحقة</p>
            <p className="text-3xl font-black font-mono">
               {suppliers.reduce((sum, s) => sum + parseFloat(s.balance), 0).toLocaleString()} 
               <span className="text-sm font-sans text-slate-500 mr-2">ج.م</span>
            </p>
         </div>

         <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
               <table className="w-full text-right">
                  <thead>
                     <tr className="bg-slate-50/50 text-slate-400 font-bold text-[10px] uppercase tracking-widest border-b border-slate-100">
                        <th className="px-8 py-6">رقم الحساب</th>
                        <th className="px-8 py-6">اسم المورد / الحساب</th>
                        <th className="px-8 py-6 text-left">الرصيد المستحق (LCY)</th>
                        <th className="px-8 py-6 text-center w-40">الإجراء</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                     {loading ? (
                        <tr><td colSpan="4" className="p-20 text-center"><div className="animate-pulse text-xl font-black text-slate-200">جاري التحميل...</div></td></tr>
                     ) : suppliers.length === 0 ? (
                        <tr><td colSpan="4" className="p-20 text-center text-slate-400 font-bold">لا توجد مستحقات حالية.</td></tr>
                     ) : (
                        suppliers.map((s, idx) => (
                           <tr key={idx} className="hover:bg-slate-50/50 transition-all group">
                              <td className="px-8 py-6 font-mono font-bold text-slate-400">{s.account_code}</td>
                              <td className="px-8 py-6 font-black text-slate-800 text-lg">{s.account_name}</td>
                              <td className="px-8 py-6 text-left">
                                 <span className="text-xl font-black text-blue-600 font-mono">
                                    {Number(s.balance).toLocaleString()} 
                                    <span className="text-[10px] font-sans text-slate-300 mr-1">ج.م</span>
                                 </span>
                              </td>
                              <td className="px-8 py-6 text-center">
                                 <button onClick={() => navigate('/subcontractors')} className="bg-slate-100 text-slate-600 px-5 py-2 rounded-xl font-black text-[10px] uppercase hover:bg-slate-900 hover:text-white transition-all">الملف التعاقدي</button>
                              </td>
                           </tr>
                        ))
                     )}
                  </tbody>
               </table>
            </div>
         </div>
      </div>
   );
}
