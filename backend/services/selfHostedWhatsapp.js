const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');

let sock = null;
let connectionStatus = 'disconnected'; // 'disconnected', 'connecting', 'qr', 'connected'
let qrCodeData = null;
let reconnectTimer = null;

// Use persistent uploads folder for docker compatibility
const authFolder = path.resolve(__dirname, '../uploads/auth_info_baileys');

async function initialize() {
    if (connectionStatus === 'connected' || connectionStatus === 'connecting') {
        console.log(`📱 [WhatsApp Self-Hosted] Client is already in status: ${connectionStatus}`);
        return;
    }
    
    // Clear any pending reconnect timers
    if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
    }

    try {
        console.log("📱 [WhatsApp Self-Hosted] Initializing connection...");
        connectionStatus = 'connecting';
        qrCodeData = null;

        // Ensure auth folder parent exists
        const parentDir = path.dirname(authFolder);
        if (!fs.existsSync(parentDir)) {
            fs.mkdirSync(parentDir, { recursive: true });
        }

        const { state, saveCreds } = await useMultiFileAuthState(authFolder);
        
        sock = makeWASocket({
            auth: state,
            printQRInTerminal: false,
            logger: pino({ level: 'silent' }),
            browser: ['Ubuntu', 'Chrome', '20.0.0']
        });
        
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;
            
            if (qr) {
                connectionStatus = 'qr';
                try {
                    qrCodeData = await QRCode.toDataURL(qr, { width: 300, margin: 2 });
                    console.log("📷 [WhatsApp Self-Hosted] New QR code generated.");
                } catch (qrErr) {
                    console.error("❌ [WhatsApp Self-Hosted] Failed to generate QR data URL:", qrErr.message);
                }
            }
            
            if (connection === 'close') {
                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
                console.log(`🔌 [WhatsApp Self-Hosted] Connection closed: ${lastDisconnect?.error?.message || 'Unknown Reason'}, Reconnect status: ${shouldReconnect}`);
                
                connectionStatus = 'disconnected';
                qrCodeData = null;
                sock = null;
                
                if (shouldReconnect) {
                    console.log("⏳ [WhatsApp Self-Hosted] Scheduling reconnect in 5 seconds...");
                    reconnectTimer = setTimeout(() => {
                        initialize();
                    }, 5000);
                } else {
                    console.log("🚪 [WhatsApp Self-Hosted] Logged out from WhatsApp. Cleaning up session files.");
                    cleanupSession();
                }
            } else if (connection === 'open') {
                console.log('✅ [WhatsApp Self-Hosted] Connected successfully!');
                connectionStatus = 'connected';
                qrCodeData = null;
            }
        });
        
        sock.ev.on('creds.update', saveCreds);
        
    } catch (err) {
        console.error("❌ [WhatsApp Self-Hosted] Failed to initialize:", err.message);
        connectionStatus = 'disconnected';
        qrCodeData = null;
        sock = null;
    }
}

async function logout() {
    console.log("🔌 [WhatsApp Self-Hosted] Logging out...");
    if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
    }

    if (sock) {
        try {
            await sock.logout();
        } catch (e) {
            console.error("⚠️ [WhatsApp Self-Hosted] Baileys logout error:", e.message);
        }
    }
    
    connectionStatus = 'disconnected';
    qrCodeData = null;
    sock = null;
    
    cleanupSession();
}

function cleanupSession() {
    try {
        if (fs.existsSync(authFolder)) {
            fs.rmSync(authFolder, { recursive: true, force: true });
            console.log("🗑️ [WhatsApp Self-Hosted] Auth info directory deleted.");
        }
    } catch (e) {
        console.error("⚠️ [WhatsApp Self-Hosted] Failed to delete auth folder:", e.message);
    }
}

async function sendMessage(to, message) {
    if (connectionStatus !== 'connected' || !sock) {
        throw new Error("WhatsApp client is not connected");
    }
    
    try {
        // Baileys requires phone number formatted with country code + "@s.whatsapp.net"
        const cleanPhone = String(to).replace(/\D/g, '');
        const jid = `${cleanPhone}@s.whatsapp.net`;
        
        console.log(`📡 [WhatsApp Self-Hosted] Sending message to ${jid}...`);
        const response = await sock.sendMessage(jid, { text: message });
        
        if (response && response.key && response.key.id) {
            console.log(`✅ [WhatsApp Self-Hosted] Message sent! Message ID: ${response.key.id}`);
            return { success: true, messageId: response.key.id };
        } else {
            throw new Error("Invalid response from Baileys socket");
        }
    } catch (err) {
        console.error("❌ [WhatsApp Self-Hosted] Send message failed:", err.message);
        throw err;
    }
}

function getStatus() {
    return {
        status: connectionStatus,
        qr: qrCodeData
    };
}

module.exports = {
    initialize,
    logout,
    sendMessage,
    getStatus
};
