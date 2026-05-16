import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

export default function StrategicCommandCenter() {
  const { language } = useLanguage();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, critical: 0, strategic: 0, warning: 0 });
  const [filter, setFilter] = useState('all');
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    fetchAlerts();
  }, [filter]);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`dynamic/table/notifications?sort=created_at:desc&limit=100${filter !== 'all' ? `&severity=${filter}` : ''}`);
      const list = data.data || [];
      setAlerts(list);
      
      // Calculate stats from full set if filter is all
      if (filter === 'all') {
        setStats({
          total: list.length,
          critical: list.filter(a => a.severity === 'critical').length,
          strategic: list.filter(a => a.severity === 'strategic').length,
          warning: list.filter(a => a.severity === 'warning').length,
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (s) => {
    switch (s) {
      case 'strategic': return 'bg-indigo-500';
      case 'critical': return 'bg-rose-500';
      case 'warning': return 'bg-amber-500';
      default: return 'bg-slate-400';
    }
  };

  const getCategoryIcon = (c) => {
    switch (c) {
      case 'finance': return '💰';
      case 'projects': return '🏗️';
      case 'procurement': return '📦';
      case 'crm': return '🤝';
      default: return '🛡️';
    }
  };

  return (
    <div className="page-container">
      
      {/* HEADER SECTION - Harmonized with Reports Module */}
      <div className="bg-slate-950 rounded-[2.5rem] p-12 text-white relative overflow-hidden shadow-2xl border border-white/5">
         <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2"></div>
         <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-10">
            <div className="flex items-center gap-8">
               <div className="w-20 h-20 bg-white/5 rounded-[2rem] flex items-center justify-center text-4xl backdrop-blur-xl border border-white/10 shadow-2xl">🛰️</div>
               <div>
                  <h1 className="text-2xl ar-heavy text-white mb-2">
                    {language === 'ar' ? 'مركز القيادة الاستراتيجي' : 'Strategic Command Center'}
                  </h1>
                  <p className="text-emerald-400 font-black text-[11px] uppercase tracking-[0.4em] opacity-80">
                    Real-Time Intelligence & Risk Matrix Protocol
                  </p>
               </div>
            </div>

            <div className="flex gap-4 items-center">
               <button 
                disabled={isRunning}
                onClick={async () => {
                  setIsRunning(true);
                  try {
                    const res = await api.post('system/intelligence/run');
                    alert(res.data.message);
                    fetchAlerts();
                  } catch (e) {
                    alert(e.response?.data?.error || 'Diagnostic failed');
                  } finally {
                    setIsRunning(false);
                  }
                }}
                className={`px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all active:scale-95 shadow-2xl flex items-center gap-3 border ${isRunning ? 'bg-white/5 border-white/5 text-white/20 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400/20 shadow-emerald-500/20'}`}
               >
                 <span className={`relative flex h-2.5 w-2.5 ${isRunning ? 'animate-spin border-2 border-white border-t-transparent rounded-full' : ''}`}>
                   {!isRunning && (
                     <>
                       <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                       <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
                     </>
                   )}
                 </span>
                 {isRunning ? (language === 'ar' ? 'جاري التحليل الاستراتيجي...' : 'Analyzing Vectors...') : (language === 'ar' ? 'تشغيل نبض التشخيص' : 'Run Diagnostic Pulse')}
               </button>

               <div className="h-12 w-px bg-white/10 mx-2"></div>

               <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/5 backdrop-blur-md">
                 {[
                   { label: 'Strategic', val: 'strategic', color: 'bg-indigo-600', icon: '💎' },
                   { label: 'Critical', val: 'critical', color: 'bg-rose-600', icon: '🚨' },
                   { label: 'All Signal', val: 'all', color: 'bg-slate-800', icon: '🌌' }
                 ].map(btn => (
                   <button 
                    key={btn.val}
                    onClick={() => setFilter(btn.val)}
                    className={`px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2 ${filter === btn.val ? `${btn.color} text-white shadow-xl` : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                   >
                     <span>{btn.icon}</span> {btn.label}
                   </button>
                 ))}
               </div>
            </div>
         </div>
      </div>

      {/* STATS GRID - Standardized Cards */}
      <div className="data-grid">
         {[
           { label: 'Intelligence Signal', val: stats.total, color: 'text-slate-900', icon: '📡' },
           { label: 'Strategic Risks', val: stats.strategic, color: 'text-indigo-600', icon: '💎' },
           { label: 'Critical Alerts', val: stats.critical, color: 'text-rose-600', icon: '🚨' },
           { label: 'Warnings', val: stats.warning, color: 'text-amber-600', icon: '⚠️' }
         ].map((s, idx) => (
           <div key={idx} className="enterprise-card p-8 group">
              <div className="flex items-center justify-between mb-4">
                <p className="metric-label">{s.label}</p>
                <div className="text-2xl grayscale group-hover:grayscale-0 transition-all duration-500 opacity-20 group-hover:opacity-100">{s.icon}</div>
              </div>
              <p className={`metric-value ${s.color}`}>{s.val}</p>
              <div className="mt-4 w-full h-1.5 bg-slate-50 rounded-full overflow-hidden">
                <div className={`h-full ${s.color.replace('text', 'bg')} opacity-20 w-2/3`}></div>
              </div>
           </div>
         ))}
      </div>

      {/* ALERTS TABLE - Digital Grid Style */}
      <div className="enterprise-card">
         <div className="enterprise-header">
            <h3 className="ar-heavy text-slate-900 uppercase tracking-widest text-sm flex items-center gap-4">
              <span className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></span>
              {language === 'ar' ? 'بث النبض المباشر' : 'Live Pulse Stream'}
            </h3>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-4 py-2 rounded-full">
              Sync Node: {new Date().toLocaleTimeString()}
            </div>
         </div>

         <div className="overflow-x-auto">
            <table className="w-full text-right whitespace-nowrap">
               <thead className="bg-slate-50/50 border-b border-slate-100">
                  <tr className="text-slate-500 text-[10px] font-black uppercase tracking-widest">
                     <th className="px-10 py-6">Signal Vector</th>
                     <th className="px-10 py-6 text-center">Threat Level</th>
                     <th className="px-10 py-6">Intelligence Decrypt</th>
                     <th className="px-10 py-6">Timestamp</th>
                     <th className="px-10 py-6 text-center">Protocol</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr>
                      <td colSpan="5" className="p-20 text-center">
                         <div className="flex flex-col items-center gap-4">
                            <div className="w-12 h-12 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
                            <span className="font-black text-slate-300 text-xs uppercase tracking-widest">Scanning Network...</span>
                         </div>
                      </td>
                    </tr>
                  ) : alerts.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="p-20 text-center text-slate-300 font-black text-xs uppercase tracking-widest">
                         No active threats or strategic signals detected.
                      </td>
                    </tr>
                  ) : alerts.map(a => (
                    <tr key={a.id} className="hover:bg-slate-50/50 transition-all group">
                       <td className="px-10 py-8">
                          <div className="flex items-center gap-4">
                             <div className="w-10 h-10 bg-white border border-slate-100 rounded-xl flex items-center justify-center text-xl shadow-sm group-hover:rotate-6 transition-transform">
                                {getCategoryIcon(a.category)}
                             </div>
                             <div className="flex flex-col">
                                <span className="font-black text-slate-900 text-sm tracking-tight">{a.title}</span>
                                <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest mt-0.5">{a.category}</span>
                             </div>
                          </div>
                       </td>
                       <td className="px-10 py-8 text-center">
                          <span className={`px-4 py-1.5 ${getSeverityColor(a.severity)} text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-slate-200`}>
                             {a.severity}
                          </span>
                       </td>
                       <td className="px-10 py-8">
                          <p className="text-sm text-slate-600 font-medium max-w-md whitespace-normal leading-relaxed">
                            {a.message}
                          </p>
                       </td>
                       <td className="px-10 py-8 font-mono text-xs text-slate-500 font-bold uppercase">
                          {new Date(a.created_at).toLocaleString()}
                       </td>
                       <td className="px-10 py-8 text-center">
                          {a.action_link ? (
                            <a href={a.action_link} className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0f172a] text-white rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all shadow-xl shadow-slate-900/20">
                               Execute ↗
                            </a>
                          ) : (
                            <button className="text-slate-200 cursor-not-allowed">✕</button>
                          )}
                       </td>
                    </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>

    </div>
  );
}
