import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import api from '../services/api';

export default function ClientSOA() {
   const { id } = useParams();
   const [searchParams] = useSearchParams();
   const moduleFilter = searchParams.get('module') || '';

   const [statement, setStatement] = useState([]);
   const [client, setClient] = useState(null);
   const [loading, setLoading] = useState(true);
   const [filter, setFilter] = useState(moduleFilter);

   useEffect(() => {
      fetchData();
   }, [id, filter]);

   const fetchData = async () => {
      setLoading(true);
      try {
         const [soaRes, cliRes] = await Promise.all([
            api.get(`/clients/${id}/statement${filter ? `?module=${filter}` : ''}`),
            api.get(`/table/customers?id=${id}`)
         ]);
         setStatement(soaRes.data.statement || []);
         setClient(cliRes.data.data?.[0]);
      } catch (error) {
         console.error(error);
      } finally {
         setLoading(false);
      }
   };

   const handlePrint = () => {
      window.print();
   };

   return (
      <div className="min-h-screen bg-white text-slate-900 p-4 md:p-8 font-sans selection:bg-slate-100 animate-in fade-in duration-500 print:p-0 print:m-0">
         <style>
            {`
               @media print {
                  @page { size: auto; margin: 15mm; }
                  body { background: white !important; }
                  .no-print { display: none !important; }
                  .print-border { border: 1px solid #e2e8f0 !important; border-radius: 0 !important; }
                  table { width: 100% !important; border-collapse: collapse !important; }
                  th, td { border: 1px solid #e2e8f0 !important; padding: 12px !important; }
               }
            `}
         </style>

         <div className="max-w-[1400px] mx-auto">
            {/* Professional Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-slate-100 pb-8 mb-10 print:mb-14">
               <div className="space-y-2">
                  <span className="inline-block bg-slate-900 text-white text-[9px] font-black px-2 py-0.5 tracking-[0.15em] uppercase rounded no-print">Financial Statement</span>
                  <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter">كشف حساب العميل التفصيلي</h1>
                  <p className="text-indigo-600 font-black text-xl italic">{client?.name}</p>
               </div>

               <div className="flex gap-3 no-print">
                  <select
                     value={filter}
                     onChange={(e) => setFilter(e.target.value)}
                     className="bg-slate-50 border border-slate-200 p-3 rounded-xl font-bold text-xs outline-none focus:ring-4 focus:ring-slate-900/5 transition-all"
                  >
                     <option value="">كافة الموديولات (شامل)</option>
                     <option value="General">المبيعات العامة</option>
                     <option value="RealEstate">التطوير العقاري</option>
                     <option value="Projects">المقاولات والمشاريع</option>
                  </select>
                  <button onClick={handlePrint} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-black text-xs hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10">🖨️ طباعة الكشف</button>
               </div>
            </div>

            {/* Summary KPI Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 print:grid-cols-3">
               <div className="bg-white border border-slate-200 p-6 rounded-2xl relative overflow-hidden group">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">إجمالي المدين (عليه)</p>
                  <h4 className="text-2xl font-black font-mono text-slate-900">{statement.reduce((sum, r) => sum + Number(r.debit), 0).toLocaleString()}</h4>
                  <div className="absolute top-0 right-0 w-16 h-16 bg-slate-50 rounded-bl-full -mr-8 -mt-8"></div>
               </div>
               <div className="bg-white border border-slate-200 p-6 rounded-2xl relative overflow-hidden group">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">إجمالي الدائن (له)</p>
                  <h4 className="text-2xl font-black font-mono text-slate-900">{statement.reduce((sum, r) => sum + Number(r.credit), 0).toLocaleString()}</h4>
                  <div className="absolute top-0 right-0 w-16 h-16 bg-slate-50 rounded-bl-full -mr-8 -mt-8"></div>
               </div>
               <div className="bg-slate-900 p-6 rounded-2xl text-white shadow-xl relative overflow-hidden group print:bg-white print:text-slate-900 print:border print:border-slate-200">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">الرصيد المستحق النهائي</p>
                  <h4 className="text-2xl font-black font-mono text-emerald-400 print:text-indigo-600">
                     {statement.length > 0 ? Number(statement[statement.length - 1].running_balance).toLocaleString() : 0}
                  </h4>
                  <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-bl-full -mr-8 -mt-8 print:hidden"></div>
               </div>
            </div>

            {/* Detailed Table */}
            <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm print:print-border">
               <table className="w-full text-right text-sm">
                  <thead className="bg-slate-50 text-slate-400 text-[9px] font-black uppercase tracking-widest border-b border-slate-100">
                     <tr>
                        <th className="p-5">التاريخ</th>
                        <th className="p-5">البيان / التفاصيل</th>
                        <th className="p-5 text-center">المصدر</th>
                        <th className="p-5 text-center">مدين (+)</th>
                        <th className="p-5 text-center">دائن (-)</th>
                        <th className="p-5 text-left bg-slate-100/50">الرصيد</th>
                     </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                     {loading ? (
                        <tr><td colSpan="6" className="p-24 text-center font-black text-slate-300 animate-pulse text-lg italic">جاري إنشاء كشف الحساب المالي...</td></tr>
                     ) : statement.length === 0 ? (
                        <tr><td colSpan="6" className="p-24 text-center font-black text-slate-400 italic">لا توجد حركات مسجلة لهذا العميل في هذه الفترة.</td></tr>
                     ) : (
                        statement.map((row, i) => (
                           <tr key={i} className="hover:bg-slate-50/80 transition-all">
                              <td className="p-5 font-mono text-xs text-slate-400">{new Date(row.created_at).toLocaleDateString('ar-EG')}</td>
                              <td className="p-5">
                                 <p className="font-black text-slate-900 text-sm tracking-tight">{row.description}</p>
                                 <p className="text-[9px] text-slate-300 font-mono mt-1">REF: #GL-{row.id}</p>
                              </td>
                              <td className="p-5 text-center">
                                 <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">
                                    {row.source_module || 'General'}
                                 </span>
                              </td>
                              <td className="p-5 font-black font-mono text-slate-900 text-center">{row.debit > 0 ? Number(row.debit).toLocaleString() : '-'}</td>
                              <td className="p-5 font-black font-mono text-rose-500 text-center">{row.credit > 0 ? Number(row.credit).toLocaleString() : '-'}</td>
                              <td className={`p-5 font-black font-mono text-left bg-slate-50/30 ${row.running_balance > 0 ? 'text-indigo-600' : 'text-emerald-600'}`}>
                                 {Number(row.running_balance).toLocaleString()}
                              </td>
                           </tr>
                        ))
                     )}
                  </tbody>
               </table>
            </div>

            <div className="mt-12 text-center text-[10px] font-black text-slate-300 uppercase tracking-[0.5em] no-print">
               PRIMEMED PHARMA ERP - INTERNAL AUDIT DOCUMENT
            </div>
         </div>
      </div>
   );
}
