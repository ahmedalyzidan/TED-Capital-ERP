// ================= GLOBAL STATE & CONFIGURATION =================
window.erpData = {};
let charts = {}; 
let editingId = null; 
window.currentTab = 'ceoTab';
let searchTimeout = null;

window.viewMode = {}; 

window.pageState = {
    projects: { page: 1, limit: 10, search: '', filter: '' }, partners: { page: 1, limit: 10, search: '', filter: '' },
    inventory: { page: 1, limit: 10, search: '', filter: '' }, inventory_transfers: { page: 1, limit: 10, search: '', filter: '' },
    material_usage: { page: 1, limit: 10, search: '', filter: '' }, returns: { page: 1, limit: 10, search: '', filter: '' },
    staff: { page: 1, limit: 10, search: '', filter: '' }, attendance: { page: 1, limit: 10, search: '', filter: '' },
    leaves: { page: 1, limit: 10, search: '', filter: '' }, payroll: { page: 1, limit: 10, search: '', filter: '' },
    ledger: { page: 1, limit: 20, search: '', filter: '' }, chart_of_accounts: { page: 1, limit: 100, search: '', filter: '' }, ar_invoices: { page: 1, limit: 10, search: '', filter: '' },
    gl_mappings: { page: 1, limit: 100, search: '', filter: '' },
    purchase_orders: { page: 1, limit: 10, search: '', filter: '' }, subcontractors: { page: 1, limit: 10, search: '', filter: '' },
    rfq: { page: 1, limit: 10, search: '', filter: '' }, boq: { page: 1, limit: 10, search: '', filter: '' },
    tasks: { page: 1, limit: 10, search: '', filter: '' }, daily_reports: { page: 1, limit: 10, search: '', filter: '' },
    audit_logs: { page: 1, limit: 20, search: '', filter: '', startDate: '', endDate: '' },
    customers: { page: 1, limit: 10, search: '', filter: '' }, property_units: { page: 1, limit: 10, search: '', filter: '' },
    contracts: { page: 1, limit: 10, search: '', filter: '' }, installments: { page: 1, limit: 10, search: '', filter: '' },
    payment_receipts: { page: 1, limit: 10, search: '', filter: '' }, system_parameters: { page: 1, limit: 1000, search: '', filter: '' },
    clients: { page: 1, limit: 10, search: '', filter: '' }, client_consumptions: { page: 1, limit: 10, search: '', filter: '' },
    outstanding_settlements: { page: 1, limit: 10, search: '', filter: '' }, outstanding_dues: { page: 1, limit: 10, search: '', filter: '' },
    client_preorders: { page: 1, limit: 10, search: '', filter: '' }
};

window.toggleViewMode = function(type) {
    window.viewMode[type] = window.viewMode[type] === 'cards' ? 'table' : 'cards';
    const btn = document.getElementById(`toggleViewBtn_${type}`);
    if(btn) btn.innerHTML = window.viewMode[type] === 'cards' ? '<span class="text-xl">📊</span> عرض الجدول' : '<span class="text-xl">🔀</span> عرض الكروت';
    if (window.pageState[type] && window.fetchTablePaginated) window.fetchTablePaginated(type);
};

window.getCurrencyRate = function() { return document.getElementById('globalCurrencyToggle')?.value === 'EGP' ? 50 : 1; };
window.getCurrencySym = function() { return document.getElementById('globalCurrencyToggle')?.value === 'EGP' ? ' ج.م' : ' $'; };
window.formatMoney = function(amount) {
    const val = (Number(amount) || 0) * getCurrencyRate();
    return val.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + getCurrencySym();
};

// ================= TOAST NOTIFICATIONS (نظام الإشعارات الذكي) =================
window.showToast = function(msg, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    const bg = type === 'success' ? 'bg-emerald-600' : (type === 'error' ? 'bg-red-600' : 'bg-blue-600');
    const icon = type === 'success' ? '✅' : (type === 'error' ? '⚠️' : 'ℹ️');
    
    toast.className = `${bg} text-white px-6 py-4 rounded-xl shadow-2xl font-bold flex items-center gap-3 transform translate-y-10 opacity-0 transition-all duration-300 pointer-events-auto max-w-sm`;
    toast.innerHTML = `<span class="text-xl">${icon}</span> <span class="text-sm">${msg}</span>`;
    
    container.appendChild(toast);
    
    setTimeout(() => toast.classList.remove('translate-y-10', 'opacity-0'), 10);
    setTimeout(() => {
        toast.classList.add('translate-y-10', 'opacity-0');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
};

// ================= AUTHENTICATION & SESSION MANAGEMENT =================
window.logout = async function(showMessage = true) {
    const refreshToken = localStorage.getItem('erp_refresh_token');
    if (refreshToken) {
        try {
            await fetch('/api/logout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: refreshToken })
            });
        } catch(e) {}
    }
    localStorage.removeItem('erp_token');
    localStorage.removeItem('erp_refresh_token');
    localStorage.removeItem('erp_user');
    if(showMessage) window.showToast("تم تسجيل الخروج بنجاح", "success");
    setTimeout(() => window.location.reload(), 1000);
};

// ================= SECURE API FETCH WRAPPER (DUAL-TOKEN INTERCEPTOR) =================
let isRefreshing = false;
let refreshSubscribers = [];

function subscribeTokenRefresh(cb) { refreshSubscribers.push(cb); }
function onRefreshed(token) {
    refreshSubscribers.map(cb => cb(token));
    refreshSubscribers = [];
}

window.apiFetch = async function(url, options = {}) {
    let token = localStorage.getItem('erp_token');
    const isAuthRoute = url.includes('/api/login') || url.includes('/api/refresh') || url.includes('/api/logout');
    
    if (!token && !isAuthRoute) {
        window.showToast("لا توجد جلسة فعالة. يرجى تسجيل الدخول.", "error");
        return { ok: false, status: 401, json: async () => ({ message: "No token" }) };
    }

    const getHeaders = (t) => {
        const headers = options.isFormData ? {} : { 'Content-Type': 'application/json' };
        if (t) headers['Authorization'] = `Bearer ${t}`;
        return { ...headers, ...options.headers };
    };

    options.headers = getHeaders(token);
    
    try {
        let response = await fetch(url, options);
        
        if (response.status === 401 && !isAuthRoute) {
            const errorData = await response.clone().json().catch(() => ({}));
            
            if (errorData.error === "TokenExpiredError" || errorData.message === "Token expired" || response.status === 401) {
                const refreshToken = localStorage.getItem('erp_refresh_token');
                
                if (!refreshToken) {
                    window.showToast("انتهت الجلسة بالكامل. جاري تحويلك...", "error");
                    window.logout(false);
                    throw new Error("Session completely expired.");
                }

                if (!isRefreshing) {
                    isRefreshing = true;
                    try {
                        const refreshRes = await fetch('/api/refresh', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ token: refreshToken })
                        });
                        
                        const refreshData = await refreshRes.json();
                        if (refreshRes.ok && refreshData.success) {
                            localStorage.setItem('erp_token', refreshData.token);
                            localStorage.setItem('erp_user', JSON.stringify(refreshData.user));
                            isRefreshing = false;
                            onRefreshed(refreshData.token);
                        } else {
                            isRefreshing = false;
                            window.showToast("تم إيقاف الجلسة. جاري تسجيل الخروج.", "error");
                            window.logout(false);
                            throw new Error("Refresh failed");
                        }
                    } catch (e) {
                        isRefreshing = false;
                        window.logout(false);
                        throw e;
                    }
                }

                return await new Promise((resolve) => {
                    subscribeTokenRefresh((newToken) => {
                        options.headers = getHeaders(newToken);
                        resolve(fetch(url, options));
                    });
                });
            } else {
                window.showToast("غير مصرح لك. جاري الخروج.", "error");
                window.logout(false);
                throw new Error("Unauthorized");
            }
        }

        if (response.status === 403 && !isAuthRoute) {
            window.showToast("الخادم رفض العملية: لا تملك صلاحية الوصول.", "error");
            return response; 
        }
        return response;
    } catch (error) {
        throw error;
    }
};

window.fetchDropdownData = async function() {
    try {
        const projRes = await window.apiFetch('/api/table/projects?limit=1000');
        if (projRes.ok) window.erpData.projects_dd = (await projRes.json()).data || [];
        const accRes = await window.apiFetch('/api/table/chart_of_accounts?limit=1000');
        if (accRes.ok) window.erpData.accounts_dd = (await accRes.json()).data || [];
    } catch (err) {}
};

window.fetchTablePaginated = async function(table) {
    if (!window.pageState[table]) return;
    const state = window.pageState[table];
    try {
        let url = `/api/table/${table}?page=${state.page}&limit=${state.limit}`;
        if (state.search) url += `&search=${encodeURIComponent(state.search)}`;
        if (state.filter) url += `&filter=${encodeURIComponent(state.filter)}`;
        if (table === 'audit_logs') {
            if (state.startDate) url += `&startDate=${state.startDate}`;
            if (state.endDate) url += `&endDate=${state.endDate}`;
        }
        const res = await window.apiFetch(url);
        if (res && res.ok) {
            const json = await res.json();
            window.erpData[table] = json.data || [];
            if (typeof window.renderSpecificTable === 'function') {
                window.renderSpecificTable(table, state.page, Math.ceil((json.total || 0) / state.limit));
            } else if (typeof window.renderTable === 'function') {
                window.renderTable(table, json.data, json.total);
            }
        }
    } catch (err) {}
};