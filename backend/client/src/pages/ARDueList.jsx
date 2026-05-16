import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

export default function ARDueList() {
   const [clients, setClients] = useState([]);
   const [loading, setLoading] = useState(true);
   const [searchTerm, setSearchTerm] = useState('');
   const navigate = useNavigate();

   useEffect(() => {
      fetchBalances();
   }, []);

   const fetchBalances = async () => {
      setLoading(true);
      try {
         const response = await api.get('/customers/balances');
         // Show all clients with balances
         const allClients = (response.data.data || []);
         setClients(allClients);
      } catch (error) {
         console.error("خطأ في جلب مديونيات العملاء", error);
      } finally {
         setLoading(false);
      }
   };

   const filteredClients = clients.filter(c => 
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (c.company_name && c.company_name.toLowerCase().includes(searchTerm.toLowerCase()))
   );

   return (
      <div className="p-8 space-y-8 animate-in fade-in duration-500">
         {/* Header */}
         <div className="flex justify-between items-end bg-white p-10 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100">
            <div>
               <span className="bg-rose-100 text-rose-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] mb-4 inline-block">Accounts Receivable</span>
               <h2 className="text-4xl font-black text-slate-900 tracking-tight">تقرير مديونيات العملاء</h2>
               <p className="text-slate-500 font-bold text-lg mt-2">قائمة العملاء الذين لديهم مبالغ مستحقة الدفع حالياً.</p>
            </div>
            <button onClick={() => navigate('/finance')} className="px-6 py-3 bg-slate-100 text-slate-900 rounded-2xl font-bold text-xs hover:bg-slate-200 transition-all flex items-center gap-2">
               <span>←</span> العودة للمالية
            </button>
         </div>

         {/* Stats and Search */}
         <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1 bg-slate-900 p-8 rounded-[2rem] text-white shadow-xl flex flex-col justify-between">
               <div>
                  <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest mb-2">إجمالي المديونيات المستحقة</p>
                  <p className="text-3xl font-black font-mono">
                     {clients.reduce((sum, c) => sum + parseFloat(c.balance), 0).toLocaleString()} 
                     <span className="text-sm font-sans text-slate-500 mr-2">ج.م</span>
                  </p>
               </div>
               <div className="mt-8 pt-6 border-t border-white/10 text-xs font-bold text-slate-500">
                  عدد العملاء: {clients.length}
               </div>
            </div>

            <div className="lg:col-span-3 bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm flex items-center">
               <div className="relative w-full">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl opacity-30">🔍</span>
                  <input 
                     type="text" 
                     placeholder="ابحث عن اسم العميل أو الشركة..." 
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                     className="w-full bg-slate-50 border border-slate-100 p-6 pl-16 rounded-2xl font-bold text-slate-900 outline-none focus:ring-4 focus:ring-slate-900/5 transition-all text-lg"
                  />
               </div>
            </div>
         </div>

         {/* Table */}
         <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
            <div className="overflow-x-auto">
               <table className="w-full text-right border-collapse">
                  <thead>
                     <tr className="bg-slate-50/50 text-slate-400 font-bold text-[10px] uppercase tracking-widest border-b border-slate-100">
                        <th className="px-8 py-6">العميل</th>
                        <th className="px-8 py-6">الشركة</th>
                        <th className="px-8 py-6">رقم الهاتف</th>
                        <th className="px-8 py-6 text-left">الرصيد المستحق</th>
                        <th className="px-8 py-6 text-center w-40">الإجراء</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                     {loading ? (
                        <tr>
                           <td colSpan="5" className="p-20 text-center">
                              <div className="animate-pulse text-xl font-black text-slate-200 uppercase tracking-widest">جاري تحميل ميزان المراجعة...</div>
                           </td>
                        </tr>
                     ) : filteredClients.length === 0 ? (
                        <tr>
                           <td colSpan="5" className="p-20 text-center text-slate-400 font-bold">لا توجد مديونيات تطابق بحثك.</td>
                        </tr>
                     ) : (
                        filteredClients.map(c => (
                           <tr key={c.id} className="hover:bg-slate-50/50 transition-all group">
                              <td className="px-8 py-6">
                                 <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-900 flex items-center justify-center font-black text-lg group-hover:scale-110 transition-transform">
                                       {c.name.charAt(0)}
                                    </div>
                                    <span className="font-black text-slate-800 text-lg group-hover:text-blue-600 transition-colors">{c.name}</span>
                                 </div>
                              </td>
                              <td className="px-8 py-6 font-bold text-slate-500">{c.company_name || 'عميل فردي'}</td>
                              <td className="px-8 py-6 font-mono font-bold text-slate-400">{c.phone}</td>
                              <td className="px-8 py-6 text-left">
                                 <span className="text-xl font-black text-rose-600 font-mono">
                                    {Number(c.balance).toLocaleString()} 
                                    <span className="text-[10px] font-sans text-slate-300 mr-1">ج.م</span>
                                 </span>
                              </td>
                              <td className="px-8 py-6 text-center">
                                 <button 
                                    onClick={() => navigate(`/clients`)} 
                                    className="bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg shadow-slate-900/10 active:scale-95"
                                 >
                                    الملف المالي 360°
                                 </button>
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
