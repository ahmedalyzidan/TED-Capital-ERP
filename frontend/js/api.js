// ================= GLOBAL STATE & CONFIGURATION =================
window.erpData = {};
let charts = {}; 
let editingId = null; 
window.currentTab = 'ceoTab';
let searchTimeout = null;

// --- [حالة تتبع وضع العرض (جدول / كروت)] ---
window.viewMode = {}; // 'table' | 'cards'

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

// --- [دالة تبديل العرض بين الكروت والجداول] ---
window.toggleViewMode = function(type) {
    window.viewMode[type] = window.viewMode[type] === 'cards' ? 'table' : 'cards';
    const btn = document.getElementById(`toggleViewBtn_${type}`);
    if(btn) {
        btn.innerHTML = window.viewMode[type] === 'cards' ? '<span class="text-xl">📊</span> عرض الجدول' : '<span class="text-xl">🔀</span> عرض الكروت';
    }
    if (window.pageState[type] && window.fetchTablePaginated) {
        window.fetchTablePaginated(type);
    }
};

// ================= CURRENCY & FORMATTING =================
window.getCurrencyRate = function() { 
    return document.getElementById('globalCurrencyToggle')?.value === 'EGP' ? 50 : 1; 
};
window.getCurrencySym = function() { 
    return document.getElementById('globalCurrencyToggle')?.value === 'EGP' ? ' ج.م' : ' $'; 
};
window.formatMoney = function(amount) {
    const val = (Number(amount) || 0) * getCurrencyRate();
    return val.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + getCurrencySym();
};

// ================= AUTHENTICATION & SESSION MANAGEMENT =================
window.logout = function() {
    localStorage.removeItem('erp_token');
    localStorage.removeItem('erp_user');
    window.location.reload();
};

// ================= SECURE API FETCH WRAPPER (JWT INTERCEPTOR) =================
window.apiFetch = async function(url, options = {}) {
    const token = localStorage.getItem('erp_token');
    
    if (!token && !url.includes('/api/login')) {
        console.warn("No token found. Request aborted to save server resources.");
        return { ok: false, status: 401, json: async () => ({ message: "No token" }) };
    }

    const headers = options.isFormData ? {} : { 'Content-Type': 'application/json' };
    
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    if (!options.isFormData) {
        options.headers = { ...headers, ...options.headers };
    } else {
        options.headers = { 'Authorization': `Bearer ${token}`, ...options.headers };
    }
    
    try {
        const response = await fetch(url, options);
        if (response.status === 401 && !url.includes('/api/login')) {
            alert("Session expired or Unauthorized. Please sign in again.");
            window.logout();
            throw new Error("Unauthorized");
        }
        if (response.status === 403 && !url.includes('/api/login')) {
            console.warn("Access Forbidden (403) for: " + url + " - Server blocked the request based on RBAC permissions.");
            // يتم إرجاع الـ response ليقوم ملف auth.js (الواجهة الأمامية) باستخراج نص الخطأ منه وعرضه للمستخدم بدلاً من التحطم
            return response; 
        }
        return response;
    } catch (error) {
        console.error("Network Fetch Error:", error);
        throw error;
    }
};

// ================= GLOBAL DATA FETCHERS (DROPDOWNS & TABLES) =================
window.fetchDropdownData = async function() {
    try {
        const projRes = await window.apiFetch('/api/table/projects?limit=1000');
        if (projRes.ok) {
            const projJson = await projRes.json();
            window.erpData.projects_dd = projJson.data || [];
        }
        
        const accRes = await window.apiFetch('/api/table/chart_of_accounts?limit=1000');
        if (accRes.ok) {
            const accJson = await accRes.json();
            window.erpData.accounts_dd = accJson.data || [];
        }
    } catch (err) {
        console.error("[API ERROR] Failed to fetch dropdown data:", err);
    }
};

window.fetchTablePaginated = async function(table) {
    if (!window.pageState[table]) {
        console.warn(`[API WARNING] Table state for '${table}' is not defined in pageState.`);
        return;
    }
    
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

            const cacheKey = `${state.search}_${state.filter}`;
            if (window.erpData[`${table}_cache_key`] !== cacheKey || !window.erpData[`${table}_all`]) {
                let allUrl = `/api/table/${table}?limit=100000`;
                if (state.search) allUrl += `&search=${encodeURIComponent(state.search)}`;
                if (state.filter) allUrl += `&filter=${encodeURIComponent(state.filter)}`;
                
                window.apiFetch(allUrl).then(r => r.json()).then(j => {
                    window.erpData[`${table}_all`] = j.data || [];
                    window.erpData[`${table}_cache_key`] = cacheKey;
                    if (typeof window.renderSpecificTable === 'function') {
                        window.renderSpecificTable(table, state.page, Math.ceil((json.total || 0) / state.limit));
                    }
                }).catch(e => console.error("Summary Background Fetch Error:", e));
            }

        } else {
            console.error(`[API ERROR] Failed to fetch paginated data for ${table}`);
        }
    } catch (err) {
        console.error(`[API ERROR] Exception in fetchTablePaginated for ${table}:`, err);
    }
};

// ================= FIX ADMIN PRIVILEGES =================
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        // دالة آمنة لاستخراج بيانات المستخدم من الذاكرة المحلية
        const getUserData = () => {
            try { return JSON.parse(localStorage.getItem('erp_user') || '{}'); } catch(e) { return {}; }
        };

        if (window.hasPerm) {
            const origHasPerm = window.hasPerm;
            window.hasPerm = function(table, action) {
                const u = getUserData();
                if (u.role === 'Admin') return true;
                // فحص إذا كانت العملية المطلوبة مدرجة ضمن الصلاحيات الوظيفية (Functions)
                if (u.permissions && u.permissions.functions && (u.permissions.functions.includes(action) || u.permissions.functions.includes('ALL'))) {
                    return true;
                }
                return origHasPerm(table, action);
            };
        } else {
            window.hasPerm = function(table, action) {
                const u = getUserData();
                if (u.role === 'Admin') return true;
                if (u.permissions && u.permissions.functions && (u.permissions.functions.includes(action) || u.permissions.functions.includes('ALL'))) {
                    return true;
                }
                return false;
            }
        }
    }, 1000);
});