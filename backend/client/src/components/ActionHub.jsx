import React, { useState, useRef, useEffect } from 'react';

/**
 * ActionHub - A premium, interactive dropdown for inventory operations.
 * Designed with "Elite" aesthetics: glassmorphism, smooth transitions, and high-contrast logic.
 */
export default function ActionHub({ actions, language = 'ar' }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDropdown = (e) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef} dir={language === 'ar' ? 'rtl' : 'ltr'}>
      {/* Trigger Button - The ⚡ Button */}
      <button
        onClick={toggleDropdown}
        className={`
          w-10 h-10 flex items-center justify-center rounded-xl font-black transition-all duration-300
          shadow-lg active:scale-90 border
          ${isOpen 
            ? 'bg-slate-900 text-white border-slate-900 rotate-12 scale-110 shadow-slate-900/30' 
            : 'bg-white text-slate-400 border-slate-200 hover:border-slate-900 hover:text-slate-900 hover:shadow-slate-900/5'}
        `}
        title={language === 'ar' ? 'إجراءات سريعة' : 'Quick Actions'}
      >
        <span className={`text-lg transition-transform duration-500 ${isOpen ? 'animate-pulse' : ''}`}>
          ⚡
        </span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div 
          className={`
            absolute z-[100] mt-3 min-w-[200px] rounded-2xl bg-white/95 backdrop-blur-xl border border-slate-200 
            shadow-[0_20px_50px_rgba(0,0,0,0.1)] py-2 animate-in fade-in zoom-in slide-in-from-top-4 duration-200
            ${language === 'ar' ? 'right-0 origin-top-right' : 'left-0 origin-top-left'}
          `}
        >
          <div className="px-4 py-2 border-b border-slate-50 mb-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
              {language === 'ar' ? 'مركز العمليات' : 'Action Hub'}
            </p>
          </div>

          <div className="flex flex-col gap-1 px-1">
            {actions.map((action, index) => (
              action.show !== false && (
                <button
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation();
                    action.onClick();
                    setIsOpen(false);
                  }}
                  className={`
                    flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-bold transition-all
                    ${action.variant === 'danger' 
                      ? 'text-rose-500 hover:bg-rose-50' 
                      : action.variant === 'success'
                      ? 'text-emerald-600 hover:bg-emerald-50'
                      : 'text-slate-700 hover:bg-slate-50 hover:translate-x-1'}
                  `}
                >
                  <span className="text-lg">{action.icon}</span>
                  <div className="flex flex-col items-start leading-none">
                    <span className="text-xs">{action.label}</span>
                    {action.subtitle && (
                      <span className="text-[9px] text-slate-400 font-medium mt-1 uppercase tracking-widest">
                        {action.subtitle}
                      </span>
                    )}
                  </div>
                </button>
              )
            ))}
          </div>

          <div className="mt-1 pt-1 border-t border-slate-50 px-4">
            <p className="text-[8px] text-slate-300 font-bold text-center">
              TED CAPITAL ERP v2.0
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
