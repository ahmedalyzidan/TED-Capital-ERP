import React, { useState, useEffect } from 'react';
import api from '../services/api';

export default function SubcontractorAnalytics({ language }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await api.get('/subcontractors/global/analytics');
        setData(res.data.analytics);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchAnalytics();
  }, []);

  if (loading) return <div className="p-20 text-center animate-pulse font-black text-slate-400">Analyzing Financial Data...</div>;
  if (!data) return null;

  const t = {
    ar: {
      retention: "سجل المحتجزات الضمانية",
      advances: "تتبع استرداد الدفعات المقدمة",
      bonds: "مراقبة الضمانات البنكية (30 يوم)",
      sub: "المقاول",
      withheld: "المحتجز",
      released: "المحرر",
      balance: "الرصيد",
      initial: "المقدم الأصلي",
      recovered: "تم استرداده",
      remaining: "المتبقي",
      expiry: "تاريخ الانتهاء",
      amount: "القيمة",
      ref: "المرجع"
    },
    en: {
      retention: "Retention Guarantee Ledger",
      advances: "Advance Payment Recovery Tracker",
      bonds: "Security Bond Watchlist (30 Days)",
      sub: "Subcontractor",
      withheld: "Withheld",
      released: "Released",
      balance: "Balance",
      initial: "Initial Advance",
      recovered: "Recovered",
      remaining: "Remaining",
      expiry: "Expiry Date",
      amount: "Amount",
      ref: "Reference"
    }
  };
  const cur = t[language === 'ar' ? 'ar' : 'en'];

  return (
    <div className="p-8 space-y-12 animate-in fade-in duration-700">
      
      {/* 1. Retention Ledger */}
      <section>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">💰</div>
          <h3 className="text-xl font-black text-slate-800">{cur.retention}</h3>
        </div>
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                <th className="px-8 py-5">{cur.sub}</th>
                <th className="px-8 py-5 text-center">{cur.withheld}</th>
                <th className="px-8 py-5 text-center">{cur.released}</th>
                <th className="px-8 py-5 text-right">{cur.balance}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {(data.retention || []).map((r, i) => (
                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-6 font-black text-slate-900 text-sm">{r.subcontractor_name}</td>
                  <td className="px-8 py-6 text-center font-bold text-slate-500 font-mono text-xs">{Number(r.total_withheld || 0).toLocaleString()}</td>
                  <td className="px-8 py-6 text-center font-bold text-emerald-500 font-mono text-xs">{Number(r.total_released || 0).toLocaleString()}</td>
                  <td className="px-8 py-6 text-right font-black text-indigo-600 text-sm bg-indigo-50/10">
                    {(Number(r.total_withheld || 0) - Number(r.total_released || 0)).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 2. Advance Recovery */}
      <section>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-10 h-10 bg-amber-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-amber-200">💸</div>
          <h3 className="text-xl font-black text-slate-800">{cur.advances}</h3>
        </div>
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                <th className="px-8 py-5">Contract #</th>
                <th className="px-8 py-5">{cur.sub}</th>
                <th className="px-8 py-5 text-center">{cur.initial}</th>
                <th className="px-8 py-5 text-center">{cur.recovered}</th>
                <th className="px-8 py-5 text-right">{cur.remaining}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {(data.advances || []).map((a, i) => (
                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-6 font-bold text-slate-400 text-xs">{a.contract_number}</td>
                  <td className="px-8 py-6 font-black text-slate-900 text-sm">{a.subcontractor_name}</td>
                  <td className="px-8 py-6 text-center font-bold text-slate-500 font-mono text-xs">{Number(a.initial_advance || 0).toLocaleString()}</td>
                  <td className="px-8 py-6 text-center font-bold text-amber-500 font-mono text-xs">{Number(a.recovered_so_far || 0).toLocaleString()}</td>
                  <td className="px-8 py-6 text-right font-black text-rose-600 text-sm bg-rose-50/10">
                    {Number(a.remaining_advance || 0).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 3. Expiring Bonds */}
      <section>
        <div className="flex items-center gap-4 mb-6">
          <div className="w-10 h-10 bg-rose-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-rose-200">🛡️</div>
          <h3 className="text-xl font-black text-slate-800">{cur.bonds}</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {!(data.expiringBonds?.length > 0) ? (
            <div className="col-span-full p-12 bg-slate-50 rounded-3xl text-center border-2 border-dashed border-slate-200">
              <span className="text-slate-400 font-bold uppercase tracking-widest text-xs italic">No Critical Expirations Detected</span>
            </div>
          ) : data.expiringBonds.map((b, i) => (
            <div key={i} className="bg-white p-8 rounded-[2rem] border border-rose-100 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 bg-rose-50 text-rose-600 font-black text-[9px] uppercase tracking-widest rounded-bl-2xl">Expiring Soon</div>
              <h4 className="font-black text-slate-900 text-lg mb-2">{b.subcontractor_name}</h4>
              <p className="text-slate-400 font-bold text-xs mb-6 uppercase tracking-tighter">{b.bond_type} Bond - {b.bank_name}</p>
              
              <div className="flex justify-between items-end">
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">{cur.expiry}</span>
                  <span className="text-rose-600 font-black text-sm font-mono">{new Date(b.expiry_date).toLocaleDateString()}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">{cur.amount}</span>
                  <span className="text-slate-900 font-black text-xl font-mono">{Number(b.bond_amount || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
