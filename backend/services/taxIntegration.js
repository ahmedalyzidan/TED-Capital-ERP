/**
 * Tax Integration & E-Invoicing Service
 * Responsible for ZATCA / ETA compliant QR Code generation (TLV Base64)
 */

const crypto = require('crypto');

/**
 * دالة مساعدة لتحويل النصوص والقيم إلى صيغة TLV (Tag-Length-Value)
 * @param {Number} tag رقم الحقل (1 للبائع، 2 للرقم الضريبي، إلخ)
 * @param {String} value القيمة المراد تشفيرها
 * @returns {Buffer} 
 */
function getTLV(tag, value) {
    const valueBuffer = Buffer.from(String(value), 'utf8');
    const tagBuffer = Buffer.from([tag]);
    const lengthBuffer = Buffer.from([valueBuffer.length]);
    return Buffer.concat([tagBuffer, lengthBuffer, valueBuffer]);
}

/**
 * توليد ختم الفاتورة الإلكترونية (QR Code) المشفر 
 * @param {Object} invoiceData بيانات الفاتورة المسجلة في النظام
 * @returns {Promise<String>} Base64 Encoded String
 */
async function generateTaxQRCode(invoiceData) {
    try {
        // في بيئة الإنتاج، يُفضل جلب هذه القيم من جدول system_parameters
        const sellerName = process.env.COMPANY_NAME || "TED Capital";
        const vatNumber = process.env.COMPANY_VAT_NO || "310122393500003"; // رقم ضريبي افتراضي
        
        // تجهيز بيانات الفاتورة
        const timestamp = new Date(invoiceData.date || invoiceData.created_at || Date.now()).toISOString();
        
        // حساب إجمالي الفاتورة وقيمة الضريبة
        const totalAmount = parseFloat(invoiceData.total_invoice_amount || invoiceData.base_amount || 0).toFixed(2);
        const taxAmount = parseFloat(invoiceData.tax_amount || 0).toFixed(2);

        // بناء مصفوفة TLV حسب المعايير الضريبية القياسية:
        // 1: اسم البائع | 2: الرقم الضريبي | 3: طابع الوقت | 4: إجمالي الفاتورة | 5: إجمالي الضريبة
        const tlvArray = [
            getTLV(1, sellerName),
            getTLV(2, vatNumber),
            getTLV(3, timestamp),
            getTLV(4, totalAmount),
            getTLV(5, taxAmount)
        ];

        // دمج المصفوفة وتحويلها إلى Base64
        const qrCodeBuffer = Buffer.concat(tlvArray);
        const qrCodeBase64 = qrCodeBuffer.toString('base64');

        return qrCodeBase64;
    } catch (error) {
        console.error("Error generating Tax QR Code:", error.message);
        throw new Error("فشل توليد ختم الفاتورة الإلكترونية (QR Code).");
    }
}

module.exports = {
    generateTaxQRCode
};