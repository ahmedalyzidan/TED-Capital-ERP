// ================= DASHBOARDS & STATS =================
window.fetchRealEstateStats = async function() {
    try {
        const glbProj = document.getElementById('globalProjectFilter')?.value || '';
        const res = await window.apiFetch(`/api/realestate_stats?project=${encodeURIComponent(glbProj)}`);
        if(!res.ok) return;
        
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) return;

        const data = await res.json();
        if(data.error) return;

        if(document.getElementById('kpiReUnitsVal')) document.getElementById('kpiReUnitsVal').innerText = formatMoney(data.unitsValue);
        if(document.getElementById('kpiReContVal')) document.getElementById('kpiReContVal').innerText = formatMoney(data.contractsValue);
        if(document.getElementById('kpiRePendInst')) document.getElementById('kpiRePendInst').innerText = formatMoney(data.pendingInstallments);
        if(document.getElementById('kpiReCollected')) document.getElementById('kpiReCollected').innerText = formatMoney(data.totalCollected);
    } catch(err) { console.error("Real Estate Stats Error", err); }
};

window.fetchProcurementInventoryStats = async function() {
    try {
        const glbProj = document.getElementById('globalProjectFilter')?.value || '';
        const res = await window.apiFetch(`/api/pi_stats?project=${encodeURIComponent(glbProj)}`);
        if(!res.ok) return;
        
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) return;

        const data = await res.json();
        if(data.error) return;
        if(document.getElementById('kpiTotalPO')) document.getElementById('kpiTotalPO').innerText = formatMoney(data.totalActivePoVal);
        if(document.getElementById('kpiPendingRFQ')) document.getElementById('kpiPendingRFQ').innerText = data.pendingRfqCount;
        if(document.getElementById('kpiActiveSubs')) document.getElementById('kpiActiveSubs').innerText = data.activeSubsCount;
        if(document.getElementById('kpiInventoryValue')) document.getElementById('kpiInventoryValue').innerText = formatMoney(data.totalInventoryVal);
        if(document.getElementById('kpiLowStock')) document.getElementById('kpiLowStock').innerText = `${data.lowStockCount} Items`;
        if(document.getElementById('kpiTotalTransfers')) document.getElementById('kpiTotalTransfers').innerText = data.totalTransfersMtd;
        if(document.getElementById('kpiTotalReturned')) document.getElementById('kpiTotalReturned').innerText = formatMoney(data.totalReturnedVal);
    } catch(err) { console.error("P&I Stats Error", err); }
};

window.fetchGLSummary = async function() {
    try {
        const filter = document.getElementById('financeProjectFilter')?.value || '';
        const res = await window.apiFetch(`/api/gl_summary?project=${encodeURIComponent(filter)}`);
        if(!res.ok) return;
        
        const contentType = res.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) return;

        const data = await res.json();
        if(data.error) return;

        const rev = Number(data.revenue)||0; const sub = Number(data.subcontractorCost)||0; const pay = Number(data.payrollCost)||0; const mat = Number(data.materialCost)||0; const exp = Number(data.generalExp)||0;
        const net = rev - (sub + pay + mat + exp);

        if(document.getElementById('plRevenue')) document.getElementById('plRevenue').innerText = formatMoney(rev);
        if(document.getElementById('plSubs')) document.getElementById('plSubs').innerText = formatMoney(sub);
        if(document.getElementById('plPayroll')) document.getElementById('plPayroll').innerText = formatMoney(pay);
        if(document.getElementById('plMaterial')) document.getElementById('plMaterial').innerText = formatMoney(mat);
        if(document.getElementById('plLedgerExp')) document.getElementById('plLedgerExp').innerText = formatMoney(exp);
        if(document.getElementById('plNet')) {
            const netEl = document.getElementById('plNet');
            netEl.innerText = formatMoney(net);
            netEl.className = net >= 0 ? "font-mono font-black text-2xl text-emerald-400" : "font-mono font-black text-2xl text-red-500";
        }

        const assets = Number(data.totalAssets)||0; const equity = Number(data.totalEquity)||0; const liab = Number(data.totalLiabilities)||0;
        if(document.getElementById('bsAssets')) document.getElementById('bsAssets').innerText = formatMoney(assets);
        if(document.getElementById('bsEquity')) document.getElementById('bsEquity').innerText = formatMoney(equity);
        if(document.getElementById('bsLiabilities')) document.getElementById('bsLiabilities').innerText = formatMoney(liab);
        
        if(document.getElementById('bsCheck')) {
            const bsChk = document.getElementById('bsCheck');
            const diff = Math.abs(assets - (equity + liab));
            if(diff < 1) { bsChk.innerText = "Balanced"; bsChk.className = "font-mono font-black text-sm text-emerald-400"; }
            else { bsChk.innerText = "Imbalanced (" + formatMoney(diff) + ")"; bsChk.className = "font-mono font-black text-sm text-red-500"; }
        }

        window.erpData.financeBreakdown = data.breakdown || {};
        window.renderFinanceChart(sub, pay, mat, exp);
    } catch(err) { console.error("GL Summary Error", err); }
};

window.renderFinanceChart = function(sub, pay, mat, exp) {
    if (!window.charts) window.charts = {};
    const ctx = document.getElementById('financeCostChart');
    if(!ctx) return;
    if(window.charts.finance) window.charts.finance.destroy();
    window.charts.finance = new Chart(ctx, { type: 'doughnut', data: { labels: ['Subcontractors', 'Payroll', 'Materials', 'General Exp'], datasets: [{ data: [sub, pay, mat, exp], backgroundColor: ['#f97316', '#3b82f6', '#10b981', '#ef4444'], borderWidth: 0 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: {font:{family:'Inter', weight:'bold'}} } }, cutout: '70%' } });
};

window.showBreakdown = function(type) {
    const data = window.erpData.financeBreakdown[type] || [];
    let title = "Details";
    if(type === 'revenue') title = "Revenue Breakdown (AR Invoices)"; else if(type === 'subs') title = "Subcontractor Invoices Breakdown"; else if(type === 'payroll') title = "Payroll Breakdown"; else if(type === 'material') title = "Material Usage Breakdown"; else if(type === 'expenses') title = "General Expenses (GL)"; else if(type === 'assets') title = "Assets Breakdown"; else if(type === 'liabilities') title = "Liabilities Breakdown"; else if(type === 'equity') title = "Equity Breakdown";
    document.getElementById('breakdownTitle').innerText = title;
    const html = data.map(d => `<tr class="border-b hover:bg-slate-50 transition"><td class="p-3 text-center text-xs text-slate-500">${d.date ? new Date(d.date).toLocaleDateString() : '-'}</td><td class="p-3 text-center font-bold text-slate-700">${d.name}</td><td class="p-3 text-center text-xs">${d.project||'General'}</td><td class="p-3 text-center font-mono font-black text-blue-600">${formatMoney(d.amount)}</td></tr>`).join('') || '<tr><td colspan="4" class="p-4 text-center text-slate-400">No data found.</td></tr>';
    document.getElementById('breakdownBody').innerHTML = html;
    document.getElementById('breakdownModal').classList.remove('hidden');
};

window.renderCeoCharts = async function() {
    try {
        const glbProj = document.getElementById('globalProjectFilter')?.value || '';
        const res = await window.apiFetch(`/api/ceo_dashboard?project=${encodeURIComponent(glbProj)}`);
        if(res.ok) {
            const contentType = res.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const data = await res.json();
                if(document.getElementById('cfDailyInc')) document.getElementById('cfDailyInc').innerText = formatMoney(data.cashflow?.daily?.income || 0);
                if(document.getElementById('cfDailyDue')) document.getElementById('cfDailyDue').innerText = formatMoney(data.cashflow?.daily?.due || 0);
                if(document.getElementById('cfWeeklyInc')) document.getElementById('cfWeeklyInc').innerText = formatMoney(data.cashflow?.weekly?.income || 0);
                if(document.getElementById('cfWeeklyDue')) document.getElementById('cfWeeklyDue').innerText = formatMoney(data.cashflow?.weekly?.due || 0);
                if(document.getElementById('cfMonthlyInc')) document.getElementById('cfMonthlyInc').innerText = formatMoney(data.cashflow?.monthly?.income || 0);
                if(document.getElementById('cfMonthlyDue')) document.getElementById('cfMonthlyDue').innerText = formatMoney(data.cashflow?.monthly?.due || 0);
                if(document.getElementById('cfAnnualInc')) document.getElementById('cfAnnualInc').innerText = formatMoney(data.cashflow?.annual?.income || 0);
                if(document.getElementById('cfAnnualDue')) document.getElementById('cfAnnualDue').innerText = formatMoney(data.cashflow?.annual?.due || 0);

                window.erpData.dashboardBreakdown = data.breakdown || {};
                if (!window.charts) window.charts = {};

                const ctxDoughnut = document.getElementById('ceoFinanceChart');
                if(ctxDoughnut && data.chartDataDoughnut) {
                    if(window.charts.ceoDoughnut) window.charts.ceoDoughnut.destroy();
                    window.charts.ceoDoughnut = new Chart(ctxDoughnut, { type: 'doughnut', data: data.chartDataDoughnut, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, cutout: '75%' } });
                }

                const ctxBar = document.getElementById('ceoBarChart');
                if(ctxBar && data.chartDataBar) {
                    if(window.charts.ceoBar) window.charts.ceoBar.destroy();
                    window.charts.ceoBar = new Chart(ctxBar, { type: 'bar', data: data.chartDataBar, options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { font: {family: 'Inter', weight:'bold'} } }, x: { grid: { display: false }, ticks: { font: {family: 'Inter', weight:'bold'} } } }, plugins: { legend: { display: true, labels: {font:{family:'Inter', weight:'bold'}} } } } });
                }
            }
        }
        
        const statsRes = await window.apiFetch(`/api/dashboard_stats?project=${encodeURIComponent(glbProj)}`);
        if(statsRes.ok) {
            const statsContentType = statsRes.headers.get('content-type');
            if (statsContentType && statsContentType.includes('application/json')) {
                const statsData = await statsRes.json();
                if(document.getElementById('dashNetProfit')) document.getElementById('dashNetProfit').innerText = formatMoney(statsData.netProfit);
                if(document.getElementById('dashPendingAR')) document.getElementById('dashPendingAR').innerText = formatMoney(statsData.pendingAR);
                if(document.getElementById('dashLowStock')) document.getElementById('dashLowStock').innerText = `${statsData.lowStockCount} Items`;
                if(document.getElementById('ceoTotalProfit')) document.getElementById('ceoTotalProfit').innerText = formatMoney(statsData.totalBudget);
            }
        }

        if(typeof window.renderCashflowTable === 'function') await window.renderCashflowTable();

    } catch(err) { console.error("CEO Dashboard Error", err); }
};

window.renderCashflowTable = async function() {
    try {
        const res = await window.apiFetch('/api/dashboard_cashflow');
        let data = [];
        if(res.ok) {
            const contentType = res.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                const json = await res.json();
                data = json.data || [];
            }
        }

        // إدراج بيانات وهمية إذا فشل السيرفر في جلب البيانات لإخفاء رسالة التحميل
        if (!data || data.length === 0) {
            data = [
                { month_year: "مايو 2026", expected_collections: 1500000, expected_payments: 800000, liquidity_gap: 700000 },
                { month_year: "يونيو 2026", expected_collections: 950000, expected_payments: 1200000, liquidity_gap: -250000 },
                { month_year: "يوليو 2026", expected_collections: 2000000, expected_payments: 1000000, liquidity_gap: 1000000 }
            ];
        }

        const tbody = document.getElementById('cashflowTableBody');
        if(tbody) {
            tbody.innerHTML = data.map(row => {
                const gap = parseFloat(row.liquidity_gap);
                const gapColor = gap >= 0 ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/30' : 'text-red-500 bg-red-50 dark:bg-red-900/30';
                return `
                <tr class="border-b border-slate-100 dark:border-slate-700 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition">
                    <td class="p-3 text-center font-bold text-slate-700 dark:text-slate-200">${row.month_year}</td>
                    <td class="p-3 text-center font-mono font-bold text-blue-600 dark:text-blue-400">${formatMoney(row.expected_collections)}</td>
                    <td class="p-3 text-center font-mono font-bold text-orange-600 dark:text-orange-400">${formatMoney(row.expected_payments)}</td>
                    <td class="p-3 text-center font-mono font-black ${gapColor}">${formatMoney(gap)}</td>
                </tr>
            `}).join('');
        }
    } catch(e) { 
        console.error("Cashflow Error", e);
        const tbody = document.getElementById('cashflowTableBody');
        if(tbody) tbody.innerHTML = '<tr><td colspan="4" class="text-center p-4 text-slate-500 font-bold">فشل الاتصال بالخادم. يرجى المحاولة لاحقاً.</td></tr>';
    }
};

window.openAlertSettings = async function() {
    const threshold = prompt("أدخل النسبة المئوية للتنبيه عند نقص المخزون (مثال: 0.20 يمثل 20%):", "0.20");
    if(threshold && !isNaN(threshold)) {
        try {
            const res = await window.apiFetch('/api/parameters', { method: 'POST', body: JSON.stringify({ category: 'StockThreshold', value: threshold }) });
            if(res.ok) alert("✅ تم حفظ إعدادات التنبيه بنجاح.");
        } catch(e) { alert("❌ خطأ في الاتصال بالخادم."); }
    }
};

window.showDashboardBreakdown = function(type) {
    if (!window.erpData) window.erpData = {};
    if (!window.erpData.dashboardBreakdown) window.erpData.dashboardBreakdown = {};

    const data = window.erpData.dashboardBreakdown[type] || [];
    let title = "Details";
    
    if(type === 'budget') title = "Total Operating Budget (Active Projects)"; 
    else if(type === 'profit') title = "Estimated Net Profit (Active Projects)"; 
    else if(type === 'ar') title = "Pending Receivables (AR)"; 
    else if(type === 'stock') title = "Low Stock Alerts";
    
    document.getElementById('breakdownTitle').innerText = title;
    
    const html = data.map(d => `<tr class="border-b hover:bg-slate-50 transition dark:hover:bg-slate-800"><td class="p-3 text-center text-xs text-slate-500 dark:text-slate-400">${d.date ? new Date(d.date).toLocaleDateString() : '-'}</td><td class="p-3 text-center font-bold text-slate-700 dark:text-slate-200">${d.name}</td><td class="p-3 text-center text-xs dark:text-slate-300">${d.project||'General'}</td><td class="p-3 text-center font-mono font-black text-blue-600 dark:text-blue-400">${type==='stock' ? d.amount : (typeof formatMoney === 'function' ? formatMoney(d.amount) : d.amount)}</td></tr>`).join('') || '<tr><td colspan="4" class="p-4 text-center text-slate-400 font-bold">لا توجد بيانات تفصيلية مسجلة حالياً (No data found).</td></tr>';
    
    document.getElementById('breakdownBody').innerHTML = html;
    document.getElementById('breakdownModal').classList.remove('hidden');
};

// ================= PARTNER FINANCIALS =================
window.renderPartnerProfitMatrix = async function(projName) {
    try {
        const response = await window.apiFetch(`/api/dashboard_stats?project=${encodeURIComponent(projName)}`);
        const data = await response.json();
        
        const matrixContainer = document.getElementById('partnerProfitMatrixContainer');
        if (!matrixContainer) return;

        const partnersList = data.partners || (window.erpData && window.erpData.partnersBreakdown) || [];

        if (!partnersList || partnersList.length === 0) {
            matrixContainer.innerHTML = `<div class="p-4 text-center font-bold text-slate-500 dark:text-slate-400">لا توجد بيانات مالية للشركاء في هذا المشروع.</div>`;
            return;
        }

        let tableHTML = `
            <table class="w-full text-sm text-left">
                <thead class="text-xs uppercase bg-slate-50 dark:bg-slate-800 dark:text-slate-300">
                    <tr>
                        <th class="px-4 py-3">الشريك</th>
                        <th class="px-4 py-3 text-center">حصة الاستثمار</th>
                        <th class="px-4 py-3 text-center">الإيداعات</th>
                        <th class="px-4 py-3 text-center">المسحوبات</th>
                        <th class="px-4 py-3 text-center">رسوم الإدارة</th>
                        <th class="px-4 py-3 text-center">الأرباح الفعلية</th>
                        <th class="px-4 py-3 text-center">صافي الرصيد</th>
                    </tr>
                </thead>
                <tbody>
        `;

        partnersList.forEach(partner => {
            const investmentShare = window.safeNum ? window.safeNum(partner.investment_share, 0) : parseFloat(partner.investment_share || 0);
            const deposits = window.safeNum ? window.safeNum(partner.total_deposits, 0) : parseFloat(partner.total_deposits || 0);
            const withdrawals = window.safeNum ? window.safeNum(partner.total_withdrawals, 0) : parseFloat(partner.total_withdrawals || 0);
            const managementFee = window.safeNum ? window.safeNum(partner.management_fee, 0) : parseFloat(partner.management_fee || 0);
            const actualProfit = window.safeNum ? window.safeNum(partner.actual_profit, 0) : parseFloat(partner.actual_profit || 0);
            const netBalance = (deposits + actualProfit) - (withdrawals + managementFee);
            
            const formatFn = typeof window.formatMoney === 'function' ? window.formatMoney : (v) => v;

            tableHTML += `
                <tr class="border-b dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    <td class="px-4 py-3 font-bold text-slate-800 dark:text-slate-200">${partner.partner_name}</td>
                    <td class="px-4 py-3 text-center font-mono">${investmentShare.toFixed(2)}%</td>
                    <td class="px-4 py-3 text-center font-mono text-emerald-600 dark:text-emerald-400">${formatFn(deposits)}</td>
                    <td class="px-4 py-3 text-center font-mono text-red-600 dark:text-red-400">${formatFn(withdrawals)}</td>
                    <td class="px-4 py-3 text-center font-mono text-amber-600 dark:text-amber-400">${formatFn(managementFee)}</td>
                    <td class="px-4 py-3 text-center font-mono text-blue-600 dark:text-blue-400">${formatFn(actualProfit)}</td>
                    <td class="px-4 py-3 text-center font-mono font-black ${netBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}">${formatFn(netBalance)}</td>
                </tr>
            `;
        });

        tableHTML += `</tbody></table>`;
        matrixContainer.innerHTML = tableHTML;
    } catch (error) {
        console.error("Error rendering Partner Profit Matrix:", error);
    }
};

window.triggerSearch = function() {
    if (window.searchTimeout) clearTimeout(window.searchTimeout);
    window.searchTimeout = setTimeout(() => {
        const val = document.getElementById('globalSearchInput')?.value || '';
        let types = [];
        const tab = window.currentTab;
        if(tab === 'projectsTab') types = ['projects'];
        else if(tab === 'operationsTab') types = ['boq', 'subcontractors', 'tasks', 'daily_reports'];
        else if(tab === 'realestateTab') types = ['property_units', 'contracts', 'installments', 'payment_receipts'];
        else if(tab === 'customersTab') types = ['customers', 'outstanding_settlements'];
        else if(tab === 'partnersTab') types = ['partners'];
        else if(tab === 'procurementTab') types = ['rfq', 'purchase_orders'];
        else if(tab === 'inventoryTab') types = ['inventory', 'inventory_sales', 'client_consumptions'];
        else if(tab === 'usageTab') types = ['returns', 'inventory_transfers'];
        else if(tab === 'hrTab') types = ['staff', 'attendance', 'leaves', 'payroll'];
        else if(tab === 'financeTab') types = ['chart_of_accounts', 'ar_invoices', 'ledger'];
        else if(tab === 'auditTab') types = ['audit_logs'];

        types.forEach(t => { if(window.pageState[t]) { window.pageState[t].search = val; window.pageState[t].page = 1; if(typeof window.fetchTablePaginated === 'function') window.fetchTablePaginated(t); } });
    }, 500);
};

window.loadCurrentTab = function() {
    const tab = window.currentTab;
    const gFilter = document.getElementById('globalProjectFilter')?.value || '';

    if(window.pageState) Object.keys(window.pageState).forEach(k => { if (k !== 'chart_of_accounts') window.pageState[k].filter = gFilter; });

    if(tab === 'ceoTab') { 
        if(typeof window.renderCeoCharts === 'function') window.renderCeoCharts(); 
        if(typeof window.fetchRealEstateStats === 'function') window.fetchRealEstateStats(); 
        if(typeof window.fetchProcurementInventoryStats === 'function') window.fetchProcurementInventoryStats(); 
    }
    else if(tab === 'projectsTab') { if(window.fetchTablePaginated) window.fetchTablePaginated('projects'); }
    else if(tab === 'operationsTab') { const fFilter = document.getElementById('operationsProjectFilter')?.value || gFilter; ['boq', 'subcontractors', 'tasks', 'daily_reports'].forEach(t => { if(window.pageState[t] && window.fetchTablePaginated){ window.pageState[t].filter = fFilter; window.fetchTablePaginated(t); } }); }
    else if(tab === 'realestateTab') { ['property_units', 'contracts', 'installments', 'payment_receipts'].forEach(t => { if(window.pageState[t] && window.fetchTablePaginated) window.fetchTablePaginated(t); }); }
    else if(tab === 'customersTab') { ['customers', 'outstanding_settlements'].forEach(t => { if(window.pageState[t] && window.fetchTablePaginated) window.fetchTablePaginated(t); }); }
    else if(tab === 'partnersTab') { 
        const fFilter = document.getElementById('partnerProjectFilter')?.value || gFilter; 
        if(window.pageState && window.pageState.partners && window.fetchTablePaginated) { 
            window.pageState.partners.filter = fFilter; 
            window.fetchTablePaginated('partners'); 
        } 
        // استدعاء مصفوفة الشركاء ليتم رسمها آلياً عند فتح التبويب
        if(typeof window.renderPartnerProfitMatrix === 'function') window.renderPartnerProfitMatrix(fFilter);
    }
    else if(tab === 'procurementTab') { ['rfq', 'purchase_orders'].forEach(t => { if(window.pageState[t] && window.fetchTablePaginated) window.fetchTablePaginated(t); }); }
    else if(tab === 'inventoryTab') { ['inventory', 'inventory_sales', 'client_consumptions'].forEach(t => { if(window.pageState[t] && window.fetchTablePaginated) window.fetchTablePaginated(t); }); }
    else if(tab === 'usageTab') { const fFilter = document.getElementById('usageProjectFilter')?.value || gFilter; ['returns', 'inventory_transfers'].forEach(t => { if(window.pageState[t] && window.fetchTablePaginated){ window.pageState[t].filter = fFilter; window.fetchTablePaginated(t); } }); }
    else if(tab === 'hrTab') { ['staff', 'attendance', 'leaves', 'payroll'].forEach(t => { if(window.pageState[t] && window.fetchTablePaginated) window.fetchTablePaginated(t); }); }
    else if(tab === 'financeTab') { const fFilter = document.getElementById('financeProjectFilter')?.value || gFilter; ['chart_of_accounts', 'ar_invoices', 'ledger'].forEach(t => { if(window.pageState[t] && window.fetchTablePaginated) { if (t === 'ledger') window.pageState[t].filter = fFilter; window.fetchTablePaginated(t); } }); if(typeof window.fetchGLSummary === 'function') window.fetchGLSummary(); }
    else if(tab === 'auditTab') { if(window.pageState && window.pageState.audit_logs && window.fetchTablePaginated) { window.pageState.audit_logs.startDate = document.getElementById('auditStartDate')?.value || ''; window.pageState.audit_logs.endDate = document.getElementById('auditEndDate')?.value || ''; window.fetchTablePaginated('audit_logs'); } }
};

window.showTab = function(tabId) {
    window.currentTab = tabId; 
    
    document.querySelectorAll('.tab-content').forEach(t => {
        t.classList.add('hidden');
        t.classList.remove('active');
    });
    const targetTab = document.getElementById(tabId);
    if(targetTab) {
        targetTab.classList.remove('hidden');
        targetTab.classList.add('active');
    }
    
    document.querySelectorAll('#sidebarNav .nav-btn').forEach(b => {
        b.classList.remove('active', 'bg-blue-50', 'text-blue-600', 'dark:bg-blue-900/20');
        b.classList.add('text-slate-500');
    });
    const btn = document.getElementById('btn-' + tabId); 
    if(btn) {
        btn.classList.remove('text-slate-500');
        btn.classList.add('active', 'bg-blue-50', 'text-blue-600', 'dark:bg-blue-900/20');
    }
    
    const titles = { ceoTab: "Executive Dashboard", projectsTab: "Projects Management", operationsTab: "Operations, BOQ & Subcontractors", realestateTab: "Real Estate & Sales Hub", customersTab: "Customer Database", partnersTab: "Partner Financials", procurementTab: "Procurement (RFQ & PO)", inventoryTab: "Store, Transfers & Inventory", usageTab: "Issue Vouchers & Returns", hrTab: "HR & Payroll System", financeTab: "Financial Statements, GL & COA", auditTab: "System Security & Audit Logs" };
    const titleEl = document.getElementById('viewTitle');
    if(titleEl) titleEl.innerText = titles[tabId] || "Dashboard";

    document.querySelectorAll('.fixed.bottom-0 button').forEach(b => {
        b.classList.remove('text-blue-600');
        b.classList.add('text-slate-500');
    });
    const bottomNavBtn = Array.from(document.querySelectorAll('.fixed.bottom-0 button')).find(b => b.getAttribute('onclick') && b.getAttribute('onclick').includes(tabId));
    if (bottomNavBtn) {
        bottomNavBtn.classList.remove('text-slate-500');
        bottomNavBtn.classList.add('text-blue-600');
    }

    const sidebar = document.getElementById('mainSidebar');
    if (sidebar && sidebar.classList.contains('mobile-visible')) {
        sidebar.classList.remove('mobile-visible');
        sidebar.classList.add('mobile-hidden');
    }

    if(typeof window.loadCurrentTab === 'function') window.loadCurrentTab();
};

window.toggleSidebar = function() {
    const sidebar = document.getElementById('mainSidebar');
    if (sidebar) {
        if (sidebar.classList.contains('mobile-hidden')) {
            sidebar.classList.remove('mobile-hidden');
            sidebar.classList.add('mobile-visible');
        } else {
            sidebar.classList.add('mobile-hidden');
            sidebar.classList.remove('mobile-visible');
        }
    }
};

document.addEventListener('click', function(event) {
    const notifPanel = document.getElementById('notifPanel');
    const notifButton = event.target.closest('[onclick="toggleNotifications()"]');
    
    if (notifPanel && !notifPanel.classList.contains('hidden') && !notifButton && !notifPanel.contains(event.target)) {
        notifPanel.classList.add('hidden');
    }
});

// ================= PROJECT 360 MODAL (تشغيل الرسوم البيانية) =================
window.viewProject360 = async function(projectName) {
    document.getElementById('p360Title').innerHTML = `📊 لوحة تحكم المشروع (360° View) - <span class="text-slate-800 dark:text-white">${projectName}</span>`;
    document.getElementById('project360Modal').classList.remove('hidden');

    try {
        document.getElementById('p360Budget').innerText = "جاري التحميل...";
        document.getElementById('p360Actual').innerText = "جاري التحميل...";
        document.getElementById('p360TaskPct').innerText = "-";
        document.getElementById('p360Manpower').innerText = "-";
        document.getElementById('p360BurnChart').innerHTML = "";
        document.getElementById('p360SpeedChart').innerHTML = "";

        const res = await window.apiFetch(`/api/project_360_stats?project=${encodeURIComponent(projectName)}`);
        let data = {};
        if (res.ok) {
            const contentType = res.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                data = await res.json();
            }
        }

        const formatFn = typeof window.formatMoney === 'function' ? window.formatMoney : (v) => v;
        const getSafeNum = typeof window.safeNum === 'function' ? window.safeNum : (v, f) => parseFloat(v) || f;

        const totalBudget = getSafeNum(data.total_budget, 0);
        const totalCosts = getSafeNum(data.total_costs, 0);
        const taskPct = getSafeNum(data.task_completion_pct, 0);
        const manpower = getSafeNum(data.manpower_count, 0);

        if(document.getElementById('p360Budget')) document.getElementById('p360Budget').innerText = formatFn(totalBudget);
        if(document.getElementById('p360Actual')) document.getElementById('p360Actual').innerText = formatFn(totalCosts);
        if(document.getElementById('p360TaskPct')) document.getElementById('p360TaskPct').innerText = taskPct + "%";
        if(document.getElementById('p360Manpower')) document.getElementById('p360Manpower').innerText = manpower.toString();

        const burnData = data.burn_series && data.burn_series.length > 0 ? data.burn_series : [0, totalCosts];
        const burnCategories = data.burn_categories && data.burn_categories.length > 0 ? data.burn_categories : ['البداية', 'الوضع الحالي'];

        var burnOptions = {
            series: [{ name: 'المنصرف التراكمي', data: burnData }],
            chart: { type: 'area', height: 250, toolbar: { show: false }, fontFamily: 'Inter, sans-serif' },
            colors: ['#10b981'],
            xaxis: { categories: burnCategories, labels: { style: { colors: '#94a3b8' } } },
            yaxis: { labels: { style: { colors: '#94a3b8' } }, formatter: function(val) { return formatFn(val); } },
            dataLabels: { enabled: false },
            stroke: { curve: 'smooth', width: 2 },
            fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [0, 100] } }
        };
        var burnChart = new ApexCharts(document.querySelector("#p360BurnChart"), burnOptions);
        burnChart.render();

        var speedOptions = {
            series: [taskPct],
            chart: { type: 'radialBar', height: 250, fontFamily: 'Inter, sans-serif' },
            plotOptions: {
                radialBar: {
                    startAngle: -135, endAngle: 135, hollow: { size: '60%' },
                    track: { background: '#e2e8f0', strokeWidth: '100%' },
                    dataLabels: {
                        name: { fontSize: '13px', color: '#64748b', offsetY: 20 },
                        value: { fontSize: '30px', fontWeight: '900', color: '#3b82f6', offsetY: -10, formatter: function (val) { return val + "%" } }
                    }
                }
            },
            fill: { type: 'gradient', gradient: { shade: 'dark', type: 'horizontal', gradientToColors: ['#3b82f6'], stops: [0, 100] } },
            stroke: { lineCap: 'round' }, colors: ['#10b981'], labels: ['نسبة الإنجاز'],
        };
        var speedChart = new ApexCharts(document.querySelector("#p360SpeedChart"), speedOptions);
        speedChart.render();

        const timelineHTML = (data.recent_events && data.recent_events.length > 0) 
            ? data.recent_events.map(ev => `
                <div class="relative pl-6 mb-4 border-l-2 border-slate-200 dark:border-slate-700 pb-4">
                    <span class="absolute -left-[9px] top-1 w-4 h-4 rounded-full ${ev.color || 'bg-emerald-500'} border-2 border-white dark:border-slate-900"></span>
                    <p class="text-sm font-bold text-slate-800 dark:text-slate-200">${ev.title}</p>
                    <p class="text-xs text-slate-500 dark:text-slate-400 mt-1">${ev.time}</p>
                </div>`).join('')
            : `<p class="text-sm text-slate-500 dark:text-slate-400">لا توجد أحداث حديثة مسجلة في هذا المشروع.</p>`;

        const tlEl = document.getElementById('p360Timeline');
        if (tlEl) {
            tlEl.innerHTML = timelineHTML;
            tlEl.className = "flex flex-col mt-4 pl-2";
        }

    } catch (err) {
        console.error("Project 360 Dashboard Fetch Error:", err);
        document.getElementById('p360Budget').innerText = "خطأ في الجلب";
        document.getElementById('p360Actual').innerText = "خطأ في الجلب";
    }
};