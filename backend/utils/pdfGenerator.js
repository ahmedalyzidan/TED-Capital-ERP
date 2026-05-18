const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

async function generateInvoicePDF(invoiceData) {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ size: 'A4', margin: 50 });
            let buffers = [];
            doc.on('data', buffer => buffers.push(buffer));
            doc.on('end', () => resolve(Buffer.concat(buffers)));
            doc.on('error', err => reject(err));

            // Select Font (support Tahoma/Arial for Arabic/English rendering)
            let fontPath = 'Helvetica';
            if (fs.existsSync('C:\\Windows\\Fonts\\tahoma.ttf')) {
                fontPath = 'C:\\Windows\\Fonts\\tahoma.ttf';
            } else if (fs.existsSync('C:\\Windows\\Fonts\\arial.ttf')) {
                fontPath = 'C:\\Windows\\Fonts\\arial.ttf';
            }
            doc.font(fontPath);

            // --- Header ---
            doc.fontSize(24).fillColor('#1a365d').text('PRIMEMED PHARMA', { align: 'center' });
            doc.fontSize(12).fillColor('#4a5568').text('PHARMACEUTICALS & MEDICAL SUPPLIES', { align: 'center' });
            doc.moveDown(1);

            doc.moveTo(50, doc.y).lineTo(545, doc.y).lineWidth(2).strokeColor('#cbd5e0').stroke();
            doc.moveDown(1);

            // --- Invoice Metadata ---
            doc.fontSize(16).fillColor('#2d3748').text('INVOICE / DIRECT DISPENSE', { align: 'center' });
            doc.moveDown(1);

            const topY = doc.y;
            doc.fontSize(11).fillColor('#2d3748');
            doc.text(`Invoice No: ${invoiceData.documentNo || 'N/A'}`, 50, topY);
            doc.text(`Date: ${invoiceData.invoiceDate || 'N/A'}`, 50, topY + 18);
            
            doc.text(`Customer: ${invoiceData.customerName || 'N/A'}`, 300, topY);
            doc.text(`Warehouse: ${invoiceData.selectedWarehouse || 'N/A'}`, 300, topY + 18);
            doc.text(`Payment: ${invoiceData.paymentMethod || 'N/A'}`, 300, topY + 36);
            
            doc.moveDown(3);

            // --- Table Header ---
            const tableTop = doc.y;
            doc.fillColor('#edf2f7').rect(50, tableTop, 495, 25).fill();
            doc.fillColor('#2d3748').fontSize(10);
            doc.text('No.', 55, tableTop + 7);
            doc.text('Item Description & Batch', 100, tableTop + 7);
            doc.text('Qty', 350, tableTop + 7);
            doc.text('Unit Price', 410, tableTop + 7);
            doc.text('Total (ILS)', 480, tableTop + 7);

            doc.moveTo(50, tableTop + 25).lineTo(545, tableTop + 25).lineWidth(1).strokeColor('#cbd5e0').stroke();
            let currY = tableTop + 35;

            // --- Table Lines ---
            const lines = invoiceData.lines || [];
            lines.forEach((line, idx) => {
                if (currY > 700) { doc.addPage(); currY = 50; }
                doc.fillColor('#2d3748').fontSize(10);
                doc.text(`${idx + 1}`, 55, currY);
                doc.text(`${line.item_name || 'Item'} (Batch: ${line.batch_no || 'N/A'})`, 100, currY, { width: 240 });
                doc.text(`${line.qty || 1}`, 350, currY);
                doc.text(`${line.unit_price || 0}`, 410, currY);
                doc.text(`${line.total || 0}`, 480, currY);
                currY += 25;
                doc.moveTo(50, currY - 5).lineTo(545, currY - 5).lineWidth(0.5).strokeColor('#e2e8f0').stroke();
            });

            currY += 15;
            if (currY > 650) { doc.addPage(); currY = 50; }

            // --- Totals Summary ---
            const totals = invoiceData.totals || {};
            doc.fillColor('#f7fafc').rect(300, currY, 245, 95).fill();
            doc.fillColor('#2d3748').fontSize(10);
            doc.text(`Subtotal:`, 315, currY + 10);
            doc.text(`${totals.subtotal || 0} ILS`, 450, currY + 10, { align: 'right', width: 80 });

            doc.text(`VAT (14%):`, 315, currY + 30);
            doc.text(`${totals.taxAmount || 0} ILS`, 450, currY + 30, { align: 'right', width: 80 });

            doc.text(`Discount:`, 315, currY + 50);
            doc.text(`${invoiceData.discount || 0} ILS`, 450, currY + 50, { align: 'right', width: 80 });

            doc.moveTo(315, currY + 68).lineTo(530, currY + 68).lineWidth(1).strokeColor('#cbd5e0').stroke();

            doc.fontSize(12).fillColor('#1a365d');
            doc.text(`Grand Total:`, 315, currY + 75);
            doc.text(`${totals.grandTotal || 0} ILS`, 430, currY + 75, { align: 'right', width: 100 });

            doc.moveDown(4);

            // --- Signatures ---
            const sigY = Math.max(currY + 130, doc.y + 20);
            doc.fontSize(10).fillColor('#718096');
            doc.text('Issued By (Warehouse)', 60, sigY);
            doc.moveTo(60, sigY - 5).lineTo(180, sigY - 5).lineWidth(1).strokeColor('#cbd5e0').stroke();

            doc.text('Received By (Customer)', 220, sigY);
            doc.moveTo(220, sigY - 5).lineTo(340, sigY - 5).lineWidth(1).strokeColor('#cbd5e0').stroke();

            doc.text('Authorized By (Finance)', 380, sigY);
            doc.moveTo(380, sigY - 5).lineTo(520, sigY - 5).lineWidth(1).strokeColor('#cbd5e0').stroke();

            doc.end();
        } catch (e) {
            reject(e);
        }
    });
}

module.exports = { generateInvoicePDF };
