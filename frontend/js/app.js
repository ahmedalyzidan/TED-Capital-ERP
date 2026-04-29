/**
 * App Initialization & Core Logic
 * Handles startup, global fetching, search, and pagination.
 */

window.initApp = function() { 
    window.applyRBAC();
    if(typeof window.fetchNotifications === 'function') window.fetchNotifications();
    setInterval(() => { if(typeof window.fetchNotifications === 'function') window.fetchNotifications(); }, 300000); 

    const searchDiv = document.getElementById('globalSearchInput');
    if (searchDiv && searchDiv.parentElement && searchDiv.parentElement.parentElement) {
        const container = searchDiv.parentElement.parentElement;
        if(!document.getElementById('globalProjectFilter')) {
            const sel = document.createElement('select');
            sel.id = 'globalProjectFilter';
            sel.className = 'w-48 ml-4 p-4 bg-slate-800 border border-slate-700 rounded-2xl font-bold text-white focus:outline-none transition-all text-center cursor-pointer shadow-inner';
            sel.innerHTML = '<option value="">-- All Projects --</option>';
            sel.onchange = () => {
                const v = sel.value;
                if (!window.pageState) window.pageState = {};
                Object.keys(window.pageState).forEach(k => { window.pageState[k].filter = v; window.pageState[k].page = 1; });
                if(typeof window.loadCurrentTab === 'function') window.loadCurrentTab();
            };
            container.insertBefore(sel, searchDiv.parentElement.nextSibling);
        }
    }
    window.fetchDropdownData(); 
    setTimeout(() => { if(typeof window.loadCurrentTab === 'function') window.loadCurrentTab(); }, 200);
};

// =====================================================================
// GLOBAL SYSTEM REFRESH HELPER (دالة التحديث الإجباري والمباشر لضمان التزامن اللحظي)
// =====================================================================
window.safeSystemRefresh = async function(targetTable) {
    console.log(`[SYSTEM] Auto-refresh triggered for table: ${targetTable}`);
    try {
        if (targetTable && typeof window.fetchTablePaginated === 'function') {
            await window.fetchTablePaginated(targetTable);
        }
        if (typeof window.loadCurrentTab === 'function') {
            await window.loadCurrentTab();
        }
    } catch (e) {
        console.error(`[SYSTEM] Auto-refresh failed for ${targetTable}:`, e);
    }
};

window.triggerSearch = function() {
    clearTimeout(window.searchTimeout);
    window.searchTimeout = setTimeout(() => {
        const val = document.getElementById("globalSearchInput").value;
        if (!window.pageState) window.pageState = {};
        Object.keys(window.pageState).forEach(k => { window.pageState[k].search = val; window.pageState[k].page = 1; });
        if(typeof window.loadCurrentTab === 'function') window.loadCurrentTab();
    }, 500); 
};

window.changePage = function(table, newPage) {
    if(newPage < 1) return;
    if (!window.pageState) window.pageState = {};
    // الحد الأقصى 10 صفوف في الصفحة (Limit 10)
    if(!window.pageState[table]) window.pageState[table] = { page: 1, limit: 10, search: '', filter: '' };
    window.pageState[table].page = newPage;
    window.fetchTablePaginated(table);
};

window.buildPaginationHTML = function(table, current, total) {
    if(total <= 1) return '';
    return `<div class="flex justify-center items-center gap-4 mt-4 p-2 bg-slate-50 rounded-xl"><button onclick="changePage('${table}', ${current - 1})" class="px-4 py-1 bg-white border font-bold rounded-lg hover:bg-slate-100 disabled:opacity-50" ${current === 1 ? 'disabled' : ''}>Prev</button><span class="text-sm font-bold text-slate-600">Page ${current} of ${total}</span><button onclick="changePage('${table}', ${current + 1})" class="px-4 py-1 bg-white border font-bold rounded-lg hover:bg-slate-100 disabled:opacity-50" ${current === total ? 'disabled' : ''}>Next</button></div>`;
};

window.fetchTablePaginated = async function(table) {
    if (!window.pageState) window.pageState = {};
    if (!window.pageState[table]) {
        window.pageState[table] = { page: 1, limit: 10, search: '', filter: '' };
    }
    const s = window.pageState[table];
    
    try {
        let url = `/api/table/${table}?page=${s.page}&limit=${s.limit}&search=${encodeURIComponent(s.search||'')}&filter=${encodeURIComponent(s.filter||'')}`;
        if (s.startDate) url += `&startDate=${encodeURIComponent(s.startDate)}`;
        if (s.endDate) url += `&endDate=${encodeURIComponent(s.endDate)}`;
        
        const res = await window.apiFetch(url);
        if(!res.ok) return; 
        const json = await res.json();
        
        if (!window.erpData) window.erpData = {};
        window.erpData[table] = json.data || [];
        
        if(typeof window.renderSpecificTable === 'function') {
            window.renderSpecificTable(table, json.page || s.page, json.totalPages || Math.ceil(json.total / s.limit));
        }

        // =========================================================================
        // HOTFIX: تأمين تحميل بيانات الجداول المترابطة (مثل المبيعات) تلقائياً
        // =========================================================================
        if (table === 'inventory') {
            if (!window._fetchingSales) {
                window._fetchingSales = true;
                await window.fetchTablePaginated('inventory_sales');
                window._fetchingSales = false;
            }
        }
        if (table === 'purchase_orders') {
            if (!window._fetchingDdpCharges) {
                window._fetchingDdpCharges = true;
                await window.fetchTablePaginated('po_ddp_charges');
                window._fetchingDdpCharges = false;
            }
        }

    } catch (err) { 
        console.error(`Error loading ${table}:`, err); 
    }
};

window.fetchDropdownData = async function() {
    try {
        if (!window.erpData) window.erpData = {};
        
        const res = await window.apiFetch('/api/table/projects?limit=1000'); 
        if(res.ok) window.erpData.projects_dd = (await res.json()).data || [];
        
        const res2 = await window.apiFetch('/api/table/staff?limit=1000'); 
        if(res2.ok) window.erpData.staff_dd = (await res2.json()).data || [];
        
        const res3 = await window.apiFetch('/api/table/customers?limit=1000'); 
        if(res3.ok) window.erpData.customers_dd = (await res3.json()).data || [];
        
        const res4 = await window.apiFetch('/api/table/property_units?limit=1000'); 
        if(res4.ok) window.erpData.units_dd = (await res4.json()).data || [];
        
        const res5 = await window.apiFetch('/api/table/contracts?limit=1000'); 
        if(res5.ok) window.erpData.contracts_dd = (await res5.json()).data || [];
        
        const res6 = await window.apiFetch('/api/table/installments?limit=1000'); 
        if(res6.ok) window.erpData.installments_dd = (await res6.json()).data || [];

        const res8 = await window.apiFetch('/api/table/inventory?limit=1000'); 
        if(res8.ok) window.erpData.inventory_dd = (await res8.json()).data || [];
        
        const res7 = await window.apiFetch('/api/dropdowns'); 
        if(res7.ok) {
            const json7 = await res7.json(); 
            window.erpData.system_units = json7.system_units || ['m2', 'm3', 'LM', 'KG', 'Ton', 'Piece', 'LS', 'Day', 'Month', 'Hour'];
            window.erpData.companies_dd = json7.companies_dd || [];
            // دمج المشاريع المخصصة لضمان ظهورها في كل مكان
            window.erpData.projects_dd = json7.projects_dd || window.erpData.projects_dd || [];
        }
        
        window.populateFilters();
    } catch(e) { console.error("Dropdown load error", e); }
};

window.populateFilters = function() {
    const opts = `<option value="">-- All Projects / Consolidated --</option>` + (window.erpData.projects_dd||[]).map(p => {
        // حماية برمجية للتعامل مع المصفوفات سواء كانت نصوص أو كائنات
        const pName = typeof p === 'string' ? p : (p.name || p.value || '');
        return `<option value="${pName}">${pName}</option>`;
    }).join('');
    
    ['partnerProjectFilter', 'usageProjectFilter', 'operationsProjectFilter', 'financeProjectFilter', 'globalProjectFilter'].forEach(id => {
        const el = document.getElementById(id); 
        if(el) { 
            const v = el.value; 
            el.innerHTML = opts; 
            el.value = v; 
        }
    });
};

window.exportDataToExcel = async function(dataType, fileName) {
    if (!window.hasPerm(dataType, 'export')) {
        alert("Access Denied: You do not have permission to export data from this module.");
        return;
    }
    try {
        const res = await window.apiFetch(`/api/table/${dataType}?limit=100000`);
        const json = await res.json();
        const data = json.data || [];
        if(data.length === 0) { alert("No data available to export for this table."); return; }
        
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, fileName.substring(0, 31));
        XLSX.writeFile(wb, `TED_ERP_${fileName}_ALL_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch(e) { alert("Failed to export data from server."); }
};

// =====================================================================
// ACCOUNTANT DASHBOARD LOGIC (محرك شاشة المحاسب والفلترة المركزية)
// =====================================================================
window.switchAccTab = function(tabId) {
    // إخفاء كل القطاعات الفرعية
    document.querySelectorAll('.acc-sub-tab').forEach(tab => tab.classList.add('hidden'));
    document.querySelectorAll('.acc-tab-btn').forEach(btn => btn.classList.remove('active'));

    // إظهار القطاع المختار
    const targetTab = document.getElementById(`tab-${tabId}`);
    if(targetTab) targetTab.classList.remove('hidden');
    
    if(event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    }

    // تحديث البيانات بناءً على التابة المفتوحة والعميل المختار
    window.loadAccountantData(tabId);
};

window.loadAccountantData = async function(type) {
    const clientId = window.pageState && window.pageState.currentClientId ? window.pageState.currentClientId : '';
    
    if (!window.pageState) window.pageState = {};
    if (!window.pageState[type]) {
        window.pageState[type] = { page: 1, limit: 10, search: '', filter: '' };
    }
    
    // حقن معرف العميل في حالة الفلترة لضمان سحب بيانات العميل المحدد فقط
    window.pageState[type].filter = clientId; 
    
    // استدعاء دالة جلب البيانات المركزية وتحديث الجداول آلياً
    await window.fetchTablePaginated(type);
};

// مستمع لحدث تغيير العميل في الفلتر المركزي لشاشة المحاسب
document.addEventListener('DOMContentLoaded', () => {
    const globalClientFilter = document.getElementById('globalClientFilter');
    if(globalClientFilter) {
        globalClientFilter.addEventListener('change', function(e) {
            const clientId = e.target.value;
            if (!window.pageState) window.pageState = {};
            window.pageState.currentClientId = clientId; 
            
            // إعادة تحميل التابة النشطة حالياً بناءً على العميل الجديد
            const activeBtn = document.querySelector('.acc-tab-btn.active');
            if(activeBtn) {
                const onclickAttr = activeBtn.getAttribute('onclick');
                if(onclickAttr) {
                    const match = onclickAttr.match(/'([^']+)'/);
                    if(match) window.loadAccountantData(match[1]);
                }
            }
        });
    }
});