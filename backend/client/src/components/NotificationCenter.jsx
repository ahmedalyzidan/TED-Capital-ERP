import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

export default function NotificationCenter() {
  const { language } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/dynamic/table/notifications?limit=20&sort=created_at:desc');
      const data = res.data?.data || [];
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.is_read).length);
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  };

  const markAsRead = async (id) => {
    try {
      await api.put(`/dynamic/table/notifications/${id}`, { is_read: true });
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const getSeverityStyle = (severity) => {
    switch (severity) {
      case 'strategic': return 'border-indigo-500 bg-indigo-50/50';
      case 'critical': return 'border-rose-500 bg-rose-50/50';
      case 'warning': return 'border-amber-500 bg-amber-50/50';
      default: return 'border-slate-200 bg-white';
    }
  };

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'strategic': return '💎';
      case 'critical': return '🚨';
      case 'warning': return '⚠️';
      default: return '🔔';
    }
  };

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 bg-white border border-slate-100 rounded-2xl shadow-sm hover:bg-slate-50 transition-all active:scale-95"
      >
        <span className="text-xl">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#0f172a] text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white animate-bounce">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Notification Panel */}
      {isOpen && (
        <div className={`absolute top-16 ${language === 'ar' ? 'left-0' : 'right-0'} w-96 max-h-[600px] bg-white rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden z-[9999] animate-fade-in`}>
          <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
            <h3 className="font-black text-[#0f172a] uppercase tracking-widest text-xs">
              {language === 'ar' ? 'مركز التنبيهات الذكي' : 'Strategic Alert Hub'}
            </h3>
            <button onClick={() => setIsOpen(false)} className="text-slate-300 hover:text-slate-900">✕</button>
          </div>

          <div className="overflow-y-auto max-h-[500px] divide-y divide-slate-50">
            {notifications.length === 0 ? (
              <div className="p-12 text-center text-slate-300 font-bold text-xs uppercase tracking-widest">
                No active signals.
              </div>
            ) : (
              notifications.map((n) => (
                <div 
                  key={n.id} 
                  className={`p-6 transition-all hover:bg-slate-50 cursor-pointer border-l-4 ${getSeverityStyle(n.severity)} ${!n.is_read ? 'opacity-100' : 'opacity-60'}`}
                  onClick={() => markAsRead(n.id)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-lg">{getSeverityIcon(n.severity)}</span>
                    <span className="text-[9px] font-black text-slate-300 uppercase">
                      {new Date(n.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <h4 className="font-black text-[#0f172a] text-sm mb-1">{n.title}</h4>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">{n.message}</p>
                  
                  {n.action_link && (
                    <a 
                      href={n.action_link} 
                      className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-[#0f172a] text-white text-[9px] font-black uppercase tracking-widest rounded-xl hover:scale-105 transition-all"
                    >
                      Take Action ↗
                    </a>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="p-4 bg-slate-50 text-center border-t border-slate-100">
             <button className="text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-[#0f172a]">
               Archive & Analytics
             </button>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}} />
    </div>
  );
}
