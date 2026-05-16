/**
 * Webhook Dispatcher Service
 * مسؤول عن إرسال إشعارات (POST Requests) للأنظمة الخارجية (CRM, WhatsApp API, ERPs)
 * يعمل بشكل غير متزامن (Asynchronous Fire-and-Forget) لكي لا يبطئ النظام.
 */

// 1. سجل مسارات الـ Webhooks (يمكن نقله لملف .env أو الداتا بيز)
// يمكنك إضافة روابط الـ Zapier أو Make.com أو API الواتساب هنا
const getEndpointsForEvent = async (eventName) => {
    const endpoints = [];
    
    // مثال: إرسال إشعار عند استلام دفعة من عميل
    if (eventName === 'payment_received') {
        if (process.env.WEBHOOK_PAYMENT_URL) endpoints.push(process.env.WEBHOOK_PAYMENT_URL);
        // endpoints.push('https://hook.us1.make.com/your-custom-hook-id'); // <-- مثال لربط Make.com
    }
    
    // مثال: إرسال إشعار عند اعتماد مستخلص مقاول 
    if (eventName === 'invoice_approved') {
        if (process.env.WEBHOOK_INVOICE_URL) endpoints.push(process.env.WEBHOOK_INVOICE_URL);
    }

    return endpoints;
};

/**
 * مُطلق الإشعارات (الرادار)
 * @param {string} eventName اسم الحدث (مثال: payment_received)
 * @param {object} payload البيانات المراد إرسالها (مثل رقم العميل والمبلغ)
 */
async function dispatchWebhook(eventName, payload) {
    try {
        const endpoints = await getEndpointsForEvent(eventName);
        
        // إذا لم يكن هناك أي روابط مربوطة بهذا الحدث، ننهي الدالة بصمت
        if (endpoints.length === 0) return;

        // تجهيز شكل البيانات القياسي للإرسال
        const webhookData = {
            event: eventName,
            timestamp: new Date().toISOString(),
            source: 'TED-Capital-ERP',
            data: payload
        };

        const fetchOptions = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'TED-Capital-Webhook-Bot/1.0',
                'X-Signature': process.env.WEBHOOK_SECRET || 'ted-capital-unsigned' // لضمان أمان الربط
            },
            body: JSON.stringify(webhookData)
        };

        // إطلاق الطلبات بشكل متوازي لجميع الروابط المحددة
        endpoints.forEach(async (url) => {
            try {
                // نستخدم fetch الافتراضية في Node.js 18+ (Fire and forget)
                const response = await fetch(url, fetchOptions);
                if (response.ok) {
                    console.log(`[Webhook 🌐] Successfully dispatched '${eventName}' to ${url}`);
                } else {
                    console.warn(`[Webhook ⚠️] Target ${url} responded with status: ${response.status}`);
                }
            } catch (err) {
                // نسجل الخطأ ولكن لا نوقف النظام (لا يوجد throw)
                console.error(`[Webhook ❌] Failed to dispatch '${eventName}' to ${url}. Error: ${err.message}`);
            }
        });
    } catch (error) {
        console.error("[Webhook System Error ❌]:", error.message);
    }
}

module.exports = { dispatchWebhook };