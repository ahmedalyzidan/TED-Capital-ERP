/**
 * Subcontractor Management Module
 */

window.viewBoqSubcontractors = async function(boqId, itemDesc) {
    document.getElementById('boqSubsTitle').innerText = `👷 Linked Subs for: ${itemDesc}`;
    document.getElementById('boqSubsBody').innerHTML = `<tr><td colspan="7" class="p-4 text-slate-400">Loading...</td></tr>`;
    document.getElementById('boqInvoicesBody').innerHTML = `<tr><td colspan="8" class="p-4 text-slate-400">Loading...</td></tr>`;
    document.getElementById('boqSubcontractorsModal').classList.remove('hidden');
    
    try {
        const res = await window.apiFetch(`/api/boq_subcontractors/${boqId}`); const json = await res.json();
        
        let sumAssig = 0, sumTotal = 0;
        const subsHtml = json.data.map(si => {
            sumAssig += Number(si.assigned_qty)||0; sumTotal += Number(si.total_price)||0;
            const isExceeded = si.end_date && new Date(si.end_date) < new Date();
            const endDt = isExceeded ? `<span class="text-red-500 font-bold" title="Expired">⚠️ ${new Date(si.end_date).toLocaleDateString()}</span>` : (si.end_date ? new Date(si.end_date).toLocaleDateString() : '-');
            return `<tr class="border-b hover:bg-slate-50 transition"><td class="p-3 font-bold text-blue-700">${si.sub_name}</td><td class="p-3 font-bold">${si.item_desc}</td><td class="p-3 font-mono">${si.assigned_qty}</td><td class="p-3 font-mono">${formatMoney(si.unit_price)}</td><td class="p-3 font-mono font-black text-blue-600">${formatMoney(si.total_price)}</td><td class="p-3 text-xs text-slate-500">${si.start_date ? new Date(si.start_date).toLocaleDateString() : '-'}</td><td class="p-3 text-xs text-slate-500">${endDt}</td></tr>`;
        }).join('');
        const subsSum = json.data.length > 0 ? `<tr class="border-t-4 border-slate-800 bg-slate-100 text-sm font-black"><td colspan="2" class="p-3">TOTALS</td><td class="p-3 font-mono">${sumAssig.toFixed(2)}</td><td></td><td class="p-3 font-mono text-blue-600">${formatMoney(sumTotal)}</td><td colspan="2"></td></tr>` : `<tr><td colspan="7" class="p-4 text-slate-400">No Subcontractors linked to this BOQ item yet.</td></tr>`;
        document.getElementById('boqSubsBody').innerHTML = subsHtml + subsSum;

        const resInv = await window.apiFetch(`/api/boq_invoices/${boqId}`); const jsonInv = await resInv.json();
        let sumGross = 0, sumPrev = 0, sumCurr = 0;
        const invHtml = jsonInv.data.map(i => {
            sumGross += Number(i.gross_amount)||0; sumPrev += Number(i.prev_qty)||0; sumCurr += Number(i.curr_qty)||0;
            const totalQty = (Number(i.prev_qty) || 0) + (Number(i.curr_qty) || 0); const assignedQty = Number(i.sub_assigned_qty) || 1;
            const itemCompPct = assignedQty > 0 ? ((totalQty / assignedQty) * 100).toFixed(2) : 0;
            let statusBadge = i.status === 'اعتماد مالي' ? 'text-emerald-600 bg-emerald-50' : (i.status === 'مراجعة فنية' ? 'text-blue-600 bg-blue-50' : 'text-slate-500 bg-slate-100');
            const dt = i.date || i.created_at || i.timestamp;
            const dtStr = dt ? new Date(dt).toLocaleDateString() : '-';
            return `<tr class="border-b hover:bg-slate-50 transition"><td class="p-3 font-bold text-slate-700">${i.sub_item_desc || '-'} <span class="text-xs text-slate-400">(${i.sub_name})</span></td><td class="p-3 text-xs text-slate-500">${dtStr}</td><td class="p-3 font-mono font-bold text-blue-600">${formatMoney(i.gross_amount)}</td><td class="p-3 font-mono text-slate-500">${i.prev_qty}</td><td class="p-3 font-mono font-bold text-slate-800">${i.curr_qty}</td><td class="p-3 font-mono font-bold text-indigo-600">${totalQty.toFixed(2)}</td><td class="p-3"><div class="progress-bar w-16 mx-auto"><div class="progress-fill bg-purple-500" style="width: ${itemCompPct}%;"></div></div><span class="text-xs text-purple-600 font-bold">${itemCompPct}%</span></td><td class="p-3 text-xs"><span class="px-2 py-1 rounded font-bold ${statusBadge}">${i.status}</span></td></tr>`;
        }).join('');
        const invSum = jsonInv.data.length > 0 ? `<tr class="border-t-4 border-slate-800 bg-slate-100 text-sm font-black"><td colspan="2" class="p-3">TOTALS</td><td class="p-3 font-mono text-blue-600">${formatMoney(sumGross)}</td><td class="p-3 font-mono">${sumPrev.toFixed(2)}</td><td class="p-3 font-mono">${sumCurr.toFixed(2)}</td><td class="p-3 font-mono text-indigo-600">${(sumPrev+sumCurr).toFixed(2)}</td><td colspan="2"></td></tr>` : `<tr><td colspan="8" class="p-4 text-slate-400">No payment applications found for this item.</td></tr>`;
        document.getElementById('boqInvoicesBody').innerHTML = invHtml + invSum;
    } catch(err) { document.getElementById('boqSubsBody').innerHTML = `<tr><td colspan="7" class="p-4 text-red-500">Error loading data.</td></tr>`; }
};

window.viewInventoryUsage = async function(material, project) {
    document.getElementById('invUsageTitle').innerText = `📉 Material Usage History: ${material}`;
    document.getElementById('invUsageBody').innerHTML = '<tr><td colspan="5" class="p-4 text-slate-400">Loading...</td></tr>';
    document.getElementById('inventoryUsageModal').classList.remove('hidden');
    try {
        const prj = project && project !== 'null' ? project : '';
        const res = await window.apiFetch(`/api/inventory_usage_history?material=${encodeURIComponent(material)}&project=${encodeURIComponent(prj)}`);
        const json = await res.json();
        
        let sumQty = 0, sumCost = 0;
        const usageHtml = json.data.map(u => {
            sumQty += Number(u.qty)||0; sumCost += Number(u.est_cost)||0;
            const dt = u.date || u.created_at || u.timestamp;
            const dtStr = dt ? new Date(dt).toLocaleDateString() : '-';
            return `<tr class="border-b hover:bg-slate-50 transition"><td class="p-3 text-slate-500">${dtStr}</td><td class="p-3 font-bold">${u.project_name || '-'}</td><td class="p-3 font-mono font-bold text-orange-600">${u.qty}</td><td class="p-3 font-mono text-red-500">${formatMoney(u.est_cost)}</td><td class="p-3 text-xs">${u.requested_by || 'System'}</td></tr>`;
        }).join('');
        const sumHtml = json.data.length > 0 ? `<tr class="border-t-4 border-slate-800 bg-slate-100 text-sm font-black"><td colspan="2" class="p-3">TOTALS</td><td class="p-3 font-mono text-orange-600">${sumQty.toFixed(2)}</td><td class="p-3 font-mono text-red-500">${formatMoney(sumCost)}</td><td></td></tr>` : `<tr><td colspan="5" class="p-4 text-slate-400">No usage history found for this item.</td></tr>`;
        document.getElementById('invUsageBody').innerHTML = usageHtml + sumHtml;
    } catch(e) { document.getElementById('invUsageBody').innerHTML = `<tr><td colspan="5" class="p-4 text-red-500">Error loading data.</td></tr>`; }
};

window.handleSubItemChange = async function(select) {
    if(!select || !select.value) { document.getElementById('subPrevQty').value = 0; document.getElementById('subCurrQty').value = 0; document.getElementById('subTotalQty').value = 0; document.getElementById('subGross').value = 0; document.getElementById('subProgPct').value = 0; return; }
    const subId = document.getElementById('subcontractorIdInput').value; const itemId = select.value;
    const res = await window.apiFetch(`/api/table/subcontractor_invoices?filter=${subId}&limit=1000`); const json = await res.json();
    let prevQty = 0; const currentEditId = document.getElementById('subInvoiceEditId').value;
    json.data.forEach(inv => { if (inv.sub_item_id == itemId && inv.status === 'اعتماد مالي' && inv.id != currentEditId) prevQty += Number(inv.curr_qty); });
    document.getElementById('subPrevQty').value = prevQty.toFixed(2); window.calcSubInvoiceNet();
};

window.calcSubInvoiceNet = function() {
    const prevQty = parseFloat(document.getElementById('subPrevQty').value) || 0; const currQty = parseFloat(document.getElementById('subCurrQty').value) || 0; const totalQty = prevQty + currQty;
    const totalQtyEl = document.getElementById('subTotalQty'); if(totalQtyEl) totalQtyEl.value = totalQty.toFixed(2);
    const select = document.getElementById('subInvItemSelect');
    let unitPrice = 0; let assignedQty = 1;
    if(select && select.selectedIndex > 0) { unitPrice = parseFloat(select.options[select.selectedIndex].getAttribute('data-price')) || 0; assignedQty = parseFloat(select.options[select.selectedIndex].getAttribute('data-qty')) || 1; }
    if(totalQty > assignedQty) { if(totalQtyEl) { totalQtyEl.classList.remove('bg-slate-100'); totalQtyEl.classList.add('bg-red-100', 'text-red-700', 'border-red-500'); } } else { if(totalQtyEl) { totalQtyEl.classList.add('bg-slate-100'); totalQtyEl.classList.remove('bg-red-100', 'text-red-700', 'border-red-500'); } }
    const currentGross = currQty * unitPrice; document.getElementById('subGross').value = currentGross.toFixed(2);
    const progressPct = assignedQty > 0 ? (totalQty / assignedQty) * 100 : 0; document.getElementById('subProgPct').value = progressPct.toFixed(2);
    const dpPct = parseFloat(document.getElementById('subDpPct').value) || 0;
    const retDeduction = parseFloat(document.getElementById('subRetAmt').value) || 0; const dpRecovery = currentGross * (dpPct / 100); document.getElementById('subDpAmt').value = dpRecovery.toFixed(2);
    const matDeduction = parseFloat(document.getElementById('subMatAmt').value) || 0; const taxDeduction = parseFloat(document.getElementById('subTaxAmt').value) || 0;
    const net = currentGross - (retDeduction + dpRecovery + matDeduction + taxDeduction); document.getElementById('subNet').value = net.toFixed(2);
};

window.viewSubReports = async function() {
    document.getElementById('subReportsModal').classList.remove('hidden'); document.getElementById('repVarianceBody').innerHTML = '<tr><td colspan="6" class="p-4 text-slate-400">Loading...</td></tr>'; document.getElementById('repAgingBody').innerHTML = '<tr><td colspan="4" class="p-4 text-slate-400">Loading...</td></tr>';
    try {
        const resVar = await window.apiFetch('/api/reports/sub_variance'); const jsonVar = await resVar.json(); 
        let sAssig=0, sVar=0;
        const varHtml = jsonVar.data.map(v => {
            sAssig += Number(v.assigned_qty)||0; sVar += Number(v.variance_profit)||0;
            return `<tr class="border-b hover:bg-slate-50"><td class="p-2 font-bold">${v.subcontractor_name}</td><td class="p-2">${v.item_desc}</td><td class="p-2 font-mono">${v.assigned_qty}</td><td class="p-2 font-mono">${formatMoney(v.sub_price)}</td><td class="p-2 font-mono">${formatMoney(v.original_boq_price||0)}</td><td class="p-2 font-mono font-black ${v.variance_profit > 0 ? 'text-emerald-600' : 'text-red-500'}">${formatMoney(v.variance_profit)}</td></tr>`;
        }).join('');
        const varSum = jsonVar.data.length > 0 ? `<tr class="border-t-4 border-slate-800 bg-slate-100 text-sm font-black"><td colspan="2" class="p-3">TOTALS</td><td class="p-3 font-mono">${sAssig.toFixed(2)}</td><td colspan="2"></td><td class="p-3 font-mono ${sVar>0?'text-emerald-600':'text-red-500'}">${formatMoney(sVar)}</td></tr>` : `<tr><td colspan="6" class="p-4 text-slate-400">No data found.</td></tr>`;
        document.getElementById('repVarianceBody').innerHTML = varHtml + varSum;

        const resAging = await window.apiFetch('/api/reports/aging_payables'); const jsonAging = await resAging.json(); 
        let sDue = 0;
        const agingHtml = jsonAging.data.map(a => {
            sDue += Number(a.total_due)||0;
            return `<tr class="border-b hover:bg-slate-50"><td class="p-2 font-bold">${a.subcontractor_name}</td><td class="p-2">${a.project_name}</td><td class="p-2 font-mono font-black text-red-600">${formatMoney(a.total_due)}</td><td class="p-2 text-slate-500">${new Date(a.oldest_invoice_date).toLocaleDateString()}</td></tr>`;
        }).join(''); 
        const agingSum = jsonAging.data.length > 0 ? `<tr class="border-t-4 border-slate-800 bg-slate-100 text-sm font-black"><td colspan="2" class="p-3">TOTALS</td><td class="p-3 font-mono text-red-600">${formatMoney(sDue)}</td><td></td></tr>` : `<tr><td colspan="4" class="p-4 text-slate-400">No overdue payables.</td></tr>`;
        document.getElementById('repAgingBody').innerHTML = agingHtml + agingSum;
    } catch(err) { console.error(err); }
};

window.openSubcontractorItems = async function(subId, projName) {
    document.getElementById('subItemsContractId').value = subId; document.getElementById('subcontractorItemsModal').classList.remove('hidden'); document.getElementById('subItemsBody').innerHTML = '<tr><td colspan="8" class="p-4 text-slate-400">Loading...</td></tr>';
    const resBoq = await window.apiFetch(`/api/table/boq?filter=${encodeURIComponent(projName)}&limit=1000`); const jsonBoq = await resBoq.json();
    document.getElementById('subBoqSelect').innerHTML = `<option value="">-- Link to BOQ Item (Optional) --</option>` + jsonBoq.data.map(b => `<option value="${b.id}">[BOQ] ${b.item_desc} - Est: ${b.est_qty} ${b.unit}</option>`).join('');
    window.loadSubcontractorItems(subId);
};

window.loadSubcontractorItems = async function(subId) {
    try {
        const res = await window.apiFetch(`/api/table/subcontractor_items?filter=${subId}&limit=1000`); const json = await res.json();
        let sumQty = 0, sumPrice = 0;
        const rowsHtml = json.data.map(i => {
            sumQty += Number(i.assigned_qty) || 0; sumPrice += Number(i.total_price) || 0;
            const isExceeded = i.end_date && new Date(i.end_date) < new Date(); const startDt = i.start_date ? new Date(i.start_date).toLocaleDateString() : '-'; const endDt = isExceeded ? `<span class="text-red-500 font-bold" title="Expired">⚠️ ${new Date(i.end_date).toLocaleDateString()}</span>` : (i.end_date ? new Date(i.end_date).toLocaleDateString() : '-');
            return `<tr class="border-b hover:bg-slate-50"><td class="p-3 font-bold">${i.item_desc}</td><td class="p-3 text-slate-500">${i.project_name || '-'}</td><td class="p-3 font-mono">${i.assigned_qty}</td><td class="p-3 font-mono">${formatMoney(i.unit_price)}</td><td class="p-3 font-mono font-black text-blue-600">${formatMoney(i.total_price)}</td><td class="p-3 text-xs text-slate-500">${startDt}</td><td class="p-3 text-xs text-slate-500">${endDt}</td><td class="p-3"><button type="button" onclick="editSubItem(${i.id}, ${subId})" class="text-blue-500 mr-2 hover:scale-110">✏️</button><button type="button" onclick="deleteSubItem(${i.id}, ${subId})" class="text-red-500 hover:scale-110">🗑️</button></td></tr>`;
        }).join('');
        const summaryHtml = json.data.length > 0 ? `<tr class="border-t-4 border-slate-800 bg-slate-100 text-sm font-black"><td colspan="2" class="p-3 text-slate-800">TOTALS</td><td class="p-3 font-mono text-slate-800">${sumQty.toFixed(2)}</td><td></td><td class="p-3 font-mono text-blue-600">${formatMoney(sumPrice)}</td><td colspan="3"></td></tr>` : `<tr><td colspan="8" class="p-4 text-slate-400">No items added to this contract yet.</td></tr>`;
        document.getElementById('subItemsBody').innerHTML = rowsHtml + summaryHtml;
    } catch(e) { console.error(e); }
};

window.editSubItem = async function(id, subId) {
    const res = await window.apiFetch(`/api/table/subcontractor_items?limit=1000&filter=${subId}`); const json = await res.json(); const item = json.data.find(x => x.id === id);
    if(item) { document.getElementById('subItemIdEdit').value = item.id; document.getElementById('subBoqSelect').value = item.boq_id || ''; document.getElementById('subItemDesc').value = item.item_desc || ''; document.getElementById('subItemQty').value = item.assigned_qty || ''; document.getElementById('subItemPrice').value = item.unit_price || ''; document.getElementById('subItemStart').value = item.start_date ? item.start_date.split('T')[0] : ''; document.getElementById('subItemEnd').value = item.end_date ? item.end_date.split('T')[0] : ''; document.getElementById('subItemFormTitle').innerText = "Edit Contract Item"; document.getElementById('subItemCancelBtn').classList.remove('hidden'); }
};

window.cancelEditSubItem = function() { document.getElementById('subItemForm').reset(); document.getElementById('subItemIdEdit').value = ""; document.getElementById('subItemFormTitle').innerText = "Add Item to Contract"; document.getElementById('subItemCancelBtn').classList.add('hidden'); };

document.getElementById('subItemForm').onsubmit = async (e) => {
    e.preventDefault(); const fd = new FormData(e.target); const data = Object.fromEntries(fd.entries()); if(!data.boq_id) data.boq_id = null; const editId = document.getElementById('subItemIdEdit').value;
    try {
        const url = editId ? `/api/update/subcontractor_items/${editId}` : `/api/add/subcontractor_items`; const method = editId ? 'PUT' : 'POST';
        const res = await window.apiFetch(url, { method: method, body: JSON.stringify(data) }); const result = await res.json();
        if(res.ok && result.success) { window.cancelEditSubItem(); window.loadSubcontractorItems(data.subcontractor_id); window.loadCurrentTab(); } else { alert("Error: " + (result.error || "Failed to add/update item.")); }
    } catch(err) { alert("Network Error: Failed to add item."); }
};

window.deleteSubItem = async function(itemId, subId) { if(!confirm("Delete this contract item? This will subtract the assigned quantities from the main BOQ.")) return; await window.apiFetch(`/api/delete/subcontractor_items/${itemId}`, { method: 'DELETE' }); window.loadSubcontractorItems(subId); window.loadCurrentTab(); };

window.viewSubcontractorHistory = async function(id) {
    const res = await window.apiFetch('/api/table/subcontractors?limit=1000'); const json = await res.json(); const sub = json.data.find(s => s.id === id); if(!sub) return;
    document.getElementById('subHistoryTitle').innerText = "Payment App / SOA: " + sub.name; document.getElementById('subcontractorIdInput').value = id;
    const res2 = await window.apiFetch(`/api/table/subcontractor_invoices?filter=${id}&limit=1000`); const json2 = await res2.json(); const invoices = json2.data;
    let sumGross = 0; let sumRet = 0; let sumDp = 0; let sumMat = 0; let sumTax = 0; let sumNet = 0;

    const canApprove = window.hasPerm('subcontractor_invoices', 'approve');

    const rowsHTML = invoices.map(i => {
        let statusBadge = i.status === 'اعتماد مالي' ? 'text-emerald-600 bg-emerald-50' : (i.status === 'مراجعة فنية' ? 'text-blue-600 bg-blue-50' : 'text-slate-500 bg-slate-100');
        let actions = '';
        if(i.status !== 'اعتماد مالي') {
            const encodedInv = encodeURIComponent(JSON.stringify(i));
            actions = `<button class="text-blue-500 hover:underline text-xs mr-2" onclick="editSubInvoice('${encodedInv}')">Edit</button><button class="text-red-500 hover:underline text-xs mr-2" onclick="deleteSubInvoice(${i.id}, ${id})">Delete</button>`;
            if(canApprove) {
                actions += `<button class="text-emerald-600 font-bold hover:underline text-xs" onclick="approveSubInvoice(${i.id}, ${id})">Approve</button>`;
            }
        }
        const totalQty = (Number(i.prev_qty) || 0) + (Number(i.curr_qty) || 0); const assignedQty = Number(i.sub_assigned_qty) || 1; const itemCompPct = assignedQty > 0 ? ((totalQty / assignedQty) * 100).toFixed(2) : 0;
        sumGross += Number(i.gross_amount)||0; sumRet += Number(i.retention_deduction)||0; sumDp += Number(i.dp_recovery)||0; sumMat += Number(i.material_deduction)||0; sumTax += Number(i.tax_deduction)||0; sumNet += Number(i.net_amount)||0;
        return `<tr class="border-b hover:bg-slate-50"><td class="p-3 text-xs font-bold text-slate-700">${i.sub_item_desc || '-'}</td><td class="p-3 text-xs font-bold">${new Date(i.date).toLocaleDateString()}</td><td class="p-3 font-mono font-bold text-blue-600">${formatMoney(i.gross_amount)}</td><td class="p-3 font-mono text-slate-500">${i.prev_qty}</td><td class="p-3 font-mono text-slate-800 font-bold">${i.curr_qty}</td><td class="p-3 font-mono text-indigo-600 font-bold">${totalQty.toFixed(2)}</td><td class="p-3"><div class="progress-bar w-16 mx-auto"><div class="progress-fill bg-purple-500" style="width: ${itemCompPct}%;"></div></div><span class="text-xs text-purple-600 font-bold">${itemCompPct}%</span></td><td class="p-3 font-mono text-orange-600">${formatMoney(i.retention_deduction)}</td><td class="p-3 font-mono text-orange-500">${formatMoney(i.dp_recovery)}</td><td class="p-3 font-mono text-red-500">${formatMoney(i.material_deduction)}</td><td class="p-3 font-mono text-red-500">${formatMoney(i.tax_deduction)}</td><td class="p-3 font-black text-emerald-600 font-mono">${formatMoney(i.net_amount)}</td><td class="p-3 text-xs"><span class="px-2 py-1 rounded font-bold ${statusBadge}">${i.status}</span></td><td class="p-3 print:hidden">${actions}</td></tr>`;
    }).join('');

    const summaryHTML = invoices.length > 0 ? `<tr class="border-t-4 border-slate-800 bg-slate-100 text-sm font-black"><td colspan="2" class="p-3 text-slate-800">TOTALS</td><td class="p-3 font-mono text-blue-600">${formatMoney(sumGross)}</td><td colspan="4"></td><td class="p-3 font-mono text-orange-600">${formatMoney(sumRet)}</td><td class="p-3 font-mono text-orange-500">${formatMoney(sumDp)}</td><td class="p-3 font-mono text-red-500">${formatMoney(sumMat)}</td><td class="p-3 font-mono text-red-500">${formatMoney(sumTax)}</td><td class="p-3 font-mono text-emerald-600">${formatMoney(sumNet)}</td><td colspan="2"></td></tr>` : `<tr><td colspan="14" class="p-4 text-slate-400">No Payment Applications found.</td></tr>`;
    document.getElementById('subHistoryBody').innerHTML = rowsHTML + summaryHTML; document.getElementById('subcontractorModal').classList.remove('hidden');
};

window.openNewPayAppModal = async function(subId) {
    document.getElementById('subInvoiceForm').reset(); document.getElementById('subInvoiceEditId').value = ""; document.getElementById('subcontractorIdInput').value = subId;
    const totalQtyEl = document.getElementById('subTotalQty'); if(totalQtyEl) { totalQtyEl.value = ""; totalQtyEl.classList.add('bg-slate-100'); totalQtyEl.classList.remove('bg-red-100', 'text-red-700', 'border-red-500'); }
    const res = await window.apiFetch('/api/table/subcontractors?limit=1000'); const json = await res.json(); const sub = json.data.find(s => s.id === subId); 
    if(sub) { document.getElementById('subDpPct').value = sub.down_payment_percent || 0; }
    const itemsRes = await window.apiFetch(`/api/table/subcontractor_items?filter=${subId}&limit=1000`); const itemsJson = await itemsRes.json();
    let selectHtml = '<option value="">-- Select Contract Item --</option>'; itemsJson.data.forEach(item => { selectHtml += `<option value="${item.id}" data-qty="${item.assigned_qty}" data-price="${item.unit_price}">${item.item_desc}</option>`; });
    const selectEl = document.getElementById('subInvItemSelect'); if(selectEl) selectEl.innerHTML = selectHtml;
    document.getElementById('subInvoiceFormTitle').innerText = "Create New Payment Application" + (sub ? ` - ${sub.name}` : ''); document.getElementById('subInvoiceSubmitBtn').innerText = "Save Application"; document.getElementById('newPayAppModal').classList.remove('hidden');
};

window.deleteSubInvoice = async function(id, subId) { if(!confirm("Are you sure you want to delete this payment application? (Financially approved deletions will also revert the Paid Amount on the contractor's profile).")) return; try { const res = await window.apiFetch(`/api/delete/subcontractor_invoices/${id}`, { method: 'DELETE' }); const result = await res.json(); if(res.ok && result.success) { window.loadCurrentTab(); window.viewSubcontractorHistory(subId); } else { alert(result.error); } } catch (err) { alert("Network error."); } };

window.approveSubInvoice = async function(invId, subId) { 
    if (!window.hasPerm('subcontractor_invoices', 'approve')) { alert('Access Denied: You do not have permission to approve Invoices.'); return; }
    if(!confirm("Approve this payment application? This will post it to the GL and lock it.")) return; 
    try { const res = await window.apiFetch(`/api/update/subcontractor_invoices/${invId}`, { method: 'PUT', body: JSON.stringify({ status: 'اعتماد مالي' }) }); const result = await res.json(); if(res.ok && result.success) { window.loadCurrentTab(); window.viewSubcontractorHistory(subId); } else { alert("Error: " + (result.error || "Failed to approve.")); } } catch(err) { alert("Network error."); } 
};

window.editSubInvoice = async function(invStr) {
    const inv = JSON.parse(decodeURIComponent(invStr)); await window.openNewPayAppModal(inv.subcontractor_id);
    setTimeout(() => {
        document.getElementById('subInvoiceEditId').value = inv.id; document.getElementById('subInvItemSelect').value = inv.sub_item_id || ''; document.getElementById('subAppDate').value = inv.date ? inv.date.split('T')[0] : ''; document.getElementById('subAppDesc').value = inv.description || ''; document.getElementById('subPrevQty').value = inv.prev_qty || 0; document.getElementById('subCurrQty').value = inv.curr_qty || 0; document.getElementById('subGross').value = inv.gross_amount || 0; document.getElementById('subProgPct').value = inv.progress_percent || 0; document.getElementById('subRetAmt').value = inv.retention_deduction || 0; document.getElementById('subMatAmt').value = inv.material_deduction || 0; document.getElementById('subTaxAmt').value = inv.tax_deduction || 0; document.getElementById('subInvStatus').value = inv.status || 'إعداد';
        document.getElementById('subInvoiceFormTitle').innerText = "Edit Payment Application #" + inv.id; document.getElementById('subInvoiceSubmitBtn').innerText = "Update Application"; window.calcSubInvoiceNet();
    }, 200);
};

window.exportSubInvoiceExcel = async function() {
    if (!window.hasPerm('subcontractor_invoices', 'export')) { alert("Access Denied: You do not have permission to export invoices."); return; }
    const subId = document.getElementById('subcontractorIdInput').value;
    const subNameTitle = document.getElementById('subHistoryTitle').innerText;
    const subName = subNameTitle.replace("Statement of Account / Payment App: ", "").replace("Payment App / SOA: ", "");

    try {
        const res = await window.apiFetch(`/api/table/subcontractor_invoices?filter=${subId}&limit=1000`);
        const json = await res.json(); const invoices = json.data || [];

        if (invoices.length === 0) { alert("لا توجد مستخلصات مسجلة لهذا المقاول لتصديرها."); return; }

        const aoa = [];
        aoa.push(["", "", "", "", "", "", "", "", "", "", ""]);
        aoa.push(["", "", "", "", "", "", "", "", "", "", ""]);
        aoa.push(["مستخلص أعمال", "", "", "", "", "", "", "", "اجمالى دفعات أعمال مقاول باطن", "", ""]);
        aoa.push(["", "", "", "", "", "", "", "", "", "", ""]);
        aoa.push(["بيان :", "", "", "", "", "", "الأسم :", subName, "", "", ""]);
        aoa.push(["رقم :", "( تجميعي )", "فى المده من :", "", "إلى :", "", "الموقع :", invoices[0].project_name || "متنوع", "", "التاريخ", "البيان"]);
        aoa.push(["رقم", "بيان الاعمال", "وحده", "كميات", "", "", "الفئه", "النسبة", "الاجمالى", "ملاحظات", "حالة الاعتماد"]);
        aoa.push(["", "", "", "السابق", "الحالى", "أجمالى الكميات", "جنيه", "", "جنيه", "", ""]);

        let totalGross = 0; let totalDeductions = 0; let totalNet = 0;

        invoices.forEach((inv, index) => {
            const itemDesc = inv.sub_item_desc || 'عام';
            const prevQty = Number(inv.prev_qty) || 0; const currQty = Number(inv.curr_qty) || 0; const totalQty = prevQty + currQty;
            const price = Number(inv.sub_unit_price) || 0; const gross = Number(inv.gross_amount) || 0;
            const deduct = (Number(inv.retention_deduction)||0) + (Number(inv.dp_recovery)||0) + (Number(inv.material_deduction)||0) + (Number(inv.tax_deduction)||0);
            const net = Number(inv.net_amount) || 0;
            const assignedQty = Number(inv.sub_assigned_qty) || 1; const compPct = assignedQty > 0 ? ((totalQty / assignedQty) * 100).toFixed(2) + '%' : '0%';

            aoa.push([index + 1, itemDesc, "بند", prevQty, currQty, totalQty, price, compPct, gross, inv.description, inv.status]);
            if (inv.status === 'اعتماد مالي') { totalGross += gross; totalDeductions += deduct; totalNet += net; }
        });

        aoa.push(["", "", "", "", "", "", "", "", "", "", ""]);
        aoa.push(["", "", "", "أجمالى المستخلص", "", totalGross, "", "", "يـعــــتـــمـــد", "", ""]);
        aoa.push(["", "", "", "أجمالى الخصم", "", totalDeductions, "", "", "أجمالى الدفعات", totalNet, ""]);
        aoa.push(["", "", "", "الأجمالى بعد الخصم", "", (totalGross - totalDeductions), "", "", "", "", ""]);
        aoa.push(["", "", "", "ماسبق صرفه", "", "-", "", "", "", "", ""]);
        aoa.push(["", "", "", "الأجمالى المتبقى", "", "-", "", "", "", "", ""]);
        
        const ws = XLSX.utils.aoa_to_sheet(aoa);
        ws['!merges'] = [{ s: { r: 2, c: 0 }, e: { r: 2, c: 2 } }, { s: { r: 2, c: 8 }, e: { r: 2, c: 10 } }, { s: { r: 6, c: 3 }, e: { r: 6, c: 5 } }];
        ws['!cols'] = [ {wch: 5}, {wch: 35}, {wch: 10}, {wch: 12}, {wch: 12}, {wch: 15}, {wch: 12}, {wch: 10}, {wch: 15}, {wch: 25}, {wch: 15} ];
        
        const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "مستخلص مقاول باطن");
        XLSX.writeFile(wb, `Subcontractor_Invoice_${subName}_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (e) { console.error(e); alert("حدث خطأ أثناء محاولة التصدير."); }
};

window.viewBoqTracking = async function() {
    document.getElementById('boqTrackingModal').classList.remove('hidden'); document.getElementById('boqTrackingBody').innerHTML = '<tr><td colspan="8" class="p-4 text-slate-400">Loading...</td></tr>';
    try { 
        const res = await window.apiFetch('/api/reports/boq_tracking'); const json = await res.json(); 
        let sEst=0, sAssig=0, sUnassig=0, sAct=0;
        const rowsHtml = json.data.map(b => {
            sEst += Number(b.est_qty)||0; sAssig += Number(b.assigned_qty)||0; sUnassig += Number(b.unassigned_qty)||0; sAct += Number(b.act_qty)||0;
            return `<tr class="border-b hover:bg-slate-50"><td class="p-2 font-bold">${b.project_name||'-'}</td><td class="p-2">${b.item_desc}</td><td class="p-2">${b.unit}</td><td class="p-2 font-mono">${b.est_qty}</td><td class="p-2 font-mono text-blue-600 font-bold">${b.assigned_qty}</td><td class="p-2 font-mono text-orange-600 font-bold">${b.unassigned_qty}</td><td class="p-2 font-mono text-emerald-600 font-bold">${b.act_qty}</td></tr>`;
        }).join(''); 
        const sumHtml = json.data.length > 0 ? `<tr class="border-t-4 border-slate-800 bg-slate-100 text-sm font-black"><td colspan="3" class="p-3 text-slate-800">TOTALS</td><td class="p-3 font-mono">${sEst.toFixed(2)}</td><td class="p-3 font-mono text-blue-600">${sAssig.toFixed(2)}</td><td class="p-3 font-mono text-orange-600">${sUnassig.toFixed(2)}</td><td class="p-3 font-mono text-emerald-600">${sAct.toFixed(2)}</td></tr>` : `<tr><td colspan="7" class="p-4 text-slate-400">No BOQ data found.</td></tr>`;
        document.getElementById('boqTrackingBody').innerHTML = rowsHtml + sumHtml;
    } catch(err) { console.error(err); }
};

// ============================================================================
// --- Golden ERP: Operations Workspace & Navigation Logic ---
// ============================================================================

window.switchOpsTab = function(tabName) {
    // إخفاء جميع الأقسام
    document.querySelectorAll('.ops-content-section').forEach(el => {
        el.classList.remove('block');
        el.classList.add('hidden');
    });
    // إزالة التفعيل عن جميع الأزرار
    document.querySelectorAll('.ops-nav-btn').forEach(btn => {
        btn.classList.remove('active', 'border-b-4', 'border-blue-600', 'text-blue-600', 'bg-blue-50');
        btn.classList.add('text-slate-500');
    });

    // تفعيل القسم والزر المختار
    const activeSection = document.getElementById(`ops-content-${tabName}`);
    const activeBtn = document.getElementById(`btn-ops-${tabName}`);
    
    if (activeSection && activeBtn) {
        activeSection.classList.remove('hidden');
        activeSection.classList.add('block');
        
        activeBtn.classList.remove('text-slate-500');
        activeBtn.classList.add('active', 'border-b-4', 'border-blue-600', 'text-blue-600', 'bg-blue-50');
    }

    // تحديث بيانات المؤشرات إذا كنا في لوحة التحكم
    if (tabName === 'dashboard') {
        if(typeof window.renderOpsDashboard === 'function') window.renderOpsDashboard();
    }
};

window.renderOpsDashboard = async function() {
    const projFilterEl = document.getElementById('operationsProjectFilter');
    const proj = projFilterEl ? projFilterEl.value : '';
    
    try {
        // تحديث إحصائيات المقايسات (BOQ)
        const boqRes = await window.apiFetch(`/api/reports/boq_tracking?project=${encodeURIComponent(proj)}`);
        if (boqRes.ok) {
            const boqJson = await boqRes.json();
            const boqData = boqJson.data || [];
            document.getElementById('opsKpiTotalBoq').innerText = boqData.length;
        }
        
        // تحديث إحصائيات عقود المقاولين
        const subsRes = await window.apiFetch(`/api/table/subcontractors?limit=1000`);
        if (subsRes.ok) {
            const subsJson = await subsRes.json();
            const subsData = subsJson.data || [];
            const filteredSubs = proj ? subsData.filter(s => s.project_name === proj) : subsData;
            document.getElementById('opsKpiActiveSubs').innerText = filteredSubs.length;
        }

        // تحديث إحصائيات المستخلصات والمطالبات المالية
        const invRes = await window.apiFetch(`/api/table/subcontractor_invoices?limit=1000`);
        if (invRes.ok) {
            const invJson = await invRes.json();
            const allInvs = invJson.data || [];
            const filteredInvs = proj ? allInvs.filter(i => i.project_name === proj) : allInvs;
            
            const approvedAmt = filteredInvs.filter(i => i.status === 'Approved' || i.status === 'اعتماد مالي' || i.status === 'Paid').reduce((sum, i) => sum + parseFloat(i.net_amount || 0), 0);
            const pendingAmt = filteredInvs.filter(i => i.status !== 'Approved' && i.status !== 'اعتماد مالي' && i.status !== 'Paid').reduce((sum, i) => sum + parseFloat(i.net_amount || 0), 0);
            
            document.getElementById('opsKpiApprovedInv').innerText = typeof window.formatMoney === 'function' ? window.formatMoney(approvedAmt) : approvedAmt.toFixed(2);
            document.getElementById('opsKpiPendingInv').innerText = typeof window.formatMoney === 'function' ? window.formatMoney(pendingAmt) : pendingAmt.toFixed(2);
        }
    } catch (err) { 
        console.error("Ops Dashboard Render Error:", err); 
    }
};

// الاستماع للضغط على الـ Tab لتحديث الداشبورد أول مرة يفتح فيها القسم
document.getElementById('btn-operationsTab')?.addEventListener('click', () => {
    setTimeout(() => {
        if(typeof window.renderOpsDashboard === 'function') window.renderOpsDashboard();
    }, 500);
});