import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

/**
 * RadialActionHub - Ultra-Premium command center.
 * Features: Adaptive arc positioning, high-contrast Slate-900 design, 
 * neon-glow accents, and precision geometry.
 * Restoration: Portal-based stability with Refs and Memo.
 */
const RadialActionHub = React.memo(({ actions, language = 'ar' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0, expandRight: true });
    const containerRef = useRef(null);
    const triggerRef = useRef(null);
    const portalRef = useRef(null);

    useEffect(() => {
        if (!isOpen) return;
        const handleClickOutside = (event) => {
            const isClickInsideContainer = containerRef.current && containerRef.current.contains(event.target);
            const isClickInsidePortal = portalRef.current && portalRef.current.contains(event.target);

            if (!isClickInsideContainer && !isClickInsidePortal) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const toggleMenu = (e) => {
        if (e) e.stopPropagation();
        if (!isOpen) {
            const rect = triggerRef.current.getBoundingClientRect();
            const mouseX = rect.left + rect.width / 2;
            const mouseY = rect.top + rect.height / 2;

            const spaceOnRight = window.innerWidth - mouseX;
            const spaceOnLeft = mouseX;
            const expandRight = spaceOnRight > spaceOnLeft;

            setCoords({
                top: mouseY,
                left: expandRight ? mouseX + 20 : mouseX - 20,
                expandRight
            });
        }
        setIsOpen(!isOpen);
    };

    // Filter out hidden actions
    const activeActions = actions.filter(a => a.show !== false);

    const menuContent = isOpen && (
        <>
            {/* Ultra-Premium Glass Backdrop */}
            <div
                className="fixed inset-0 bg-slate-950/60 backdrop-blur-xl z-[9999] animate-in fade-in duration-500 flex items-center justify-center p-4 sm:p-8"
                onClick={() => setIsOpen(false)}
            >
                <div
                    ref={portalRef}
                    className="w-full max-w-4xl max-h-[80vh] overflow-y-auto custom-scrollbar flex flex-wrap items-center justify-center gap-6 p-8 bg-white/5 rounded-[4rem] border border-white/10 shadow-[0_50px_100px_rgba(0,0,0,0.5)] animate-in zoom-in-95 slide-in-from-bottom-20 duration-700"
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
                    }}
                >
                    {activeActions.map((action, index) => {
                        const isDisabled = action.disabled === true;
                        return (
                            <button
                                key={index}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (isDisabled) {
                                        if (action.reason) {
                                            alert(`🚫 ${language === 'ar' ? 'الإجراء مقيد' : 'Action Locked'}\n\n${action.reason}`);
                                        }
                                        return;
                                    }
                                    if (action.onClick) action.onClick(e);
                                    setIsOpen(false);
                                }}
                                title={isDisabled ? action.reason : ''}
                                className={`
                                    pointer-events-auto group relative
                                    flex flex-col items-center justify-center
                                    w-32 h-32 bg-slate-900 text-white rounded-[2.5rem]
                                    shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-white/5
                                    transition-all duration-500 
                                    ${isDisabled
                                        ? 'opacity-30 grayscale cursor-not-allowed scale-95 border-rose-500/20'
                                        : 'hover:scale-110 hover:bg-emerald-500 hover:shadow-[0_0_60px_rgba(16,185,129,0.3)] hover:-translate-y-4'}
                                    animate-in fade-in zoom-in-50 duration-700
                                `}
                                style={{
                                    animationDelay: `${index * 50}ms`,
                                    animationFillMode: 'backwards',
                                    transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)'
                                }}
                            >
                                <span className={`text-5xl mb-2 transition-transform duration-500 ${!isDisabled && 'group-hover:scale-125 group-hover:rotate-12'}`}>
                                    {isDisabled ? '🔒' : action.icon}
                                </span>

                                <span className={`text-[9px] font-black uppercase tracking-[0.2em] text-center px-2 transition-colors ${isDisabled ? 'text-rose-400' : 'text-slate-400 group-hover:text-white'}`}>
                                    {action.label}
                                </span>

                                {!isDisabled && (
                                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-2 h-2 bg-emerald-400 rounded-full opacity-0 group-hover:opacity-100 transition-all blur-[3px] group-hover:animate-pulse"></div>
                                )}

                                {isDisabled && action.reason && (
                                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-rose-500 text-white text-xs flex items-center justify-center rounded-full border-4 border-slate-950 font-black shadow-lg animate-pulse">
                                        !
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        </>
    );

    return (
        <div className="relative inline-block" ref={containerRef}>
            <button
                ref={triggerRef}
                onClick={toggleMenu}
                className={`
                    w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-black transition-all duration-500 z-[110] relative
                    ${isOpen
                        ? 'bg-rose-500 text-white rotate-[135deg] scale-110 shadow-[0_0_30px_rgba(244,63,94,0.4)]'
                        : 'bg-slate-900 text-white hover:bg-slate-800 shadow-[0_10px_25px_rgba(15,23,42,0.3)] hover:-translate-y-1'}
                `}
            >
                {isOpen ? '✕' : '⚡'}
            </button>

            {isOpen && createPortal(menuContent, document.body)}
        </div>
    );
});

export default RadialActionHub;
