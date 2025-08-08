// Nạp các biến môi trường từ file .env
require('dotenv').config();

const express = require('express');
const WebSocket = require('ws');
const fetch = require('node-fetch');
const path = require('path'); // Thư viện để làm việc với đường dẫn file

// --- CẤU HÌNH ---
const PORT = process.env.PORT || 3000;
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const symbolsToTrack = {
    // Kim loại quý
    'OANDA:XAU_USD': 'Vàng (XAU/USD)', 'OANDA:XAG_USD': 'Bạc (XAG/USD)',
    // Các cặp tiền chính (Majors)
    'OANDA:EUR_USD': 'EUR/USD', 'OANDA:GBP_USD': 'GBP/USD', 'OANDA:USD_JPY': 'USD/JPY',
    'OANDA:USD_CHF': 'USD/CHF', 'OANDA:AUD_USD': 'AUD/USD', 'OANDA:USD_CAD': 'USD/CAD',
    'OANDA:NZD_USD': 'NZD/USD',
    // Các cặp tiền chéo với EUR
    'OANDA:EUR_GBP': 'EUR/GBP', 'OANDA:EUR_JPY': 'EUR/JPY', 'OANDA:EUR_CHF': 'EUR/CHF',
    'OANDA:EUR_AUD': 'EUR/AUD', 'OANDA:EUR_CAD': 'EUR/CAD', 'OANDA:EUR_NZD': 'EUR/NZD',
    // Các cặp tiền chéo với GBP
    'OANDA:GBP_JPY': 'GBP/JPY', 'OANDA:GBP_CHF': 'GBP/CHF', 'OANDA:GBP_AUD': 'GBP/AUD',
    'OANDA:GBP_CAD': 'GBP/CAD', 'OANDA:GBP_NZD': 'GBP/NZD',
    // Các cặp tiền chéo khác
    'OANDA:AUD_JPY': 'AUD/JPY', 'OANDA:AUD_CAD': 'AUD/CAD', 'OANDA:AUD_CHF': 'AUD/CHF',
    'OANDA:AUD_NZD': 'AUD/NZD', 'OANDA:CAD_JPY': 'CAD/JPY', 'OANDA:CAD_CHF': 'CAD/CHF',
    'OANDA:CHF_JPY': 'CHF/JPY', 'OANDA:NZD_JPY': 'NZD/JPY', 'OANDA:NZD_CAD': 'NZD/CAD',
    'OANDA:NZD_CHF': 'NZD/CHF',
    // Một số cặp tiền hiếm (Exotics)
    'OANDA:USD_SGD': 'USD/SGD', 'OANDA:USD_HKD': 'USD/HKD', 'OANDA:USD_MXN': 'USD/MXN',
    'OANDA:EUR_PLN': 'EUR/PLN',
    // Tiền điện tử & Chỉ số
    'BINANCE:BTCUSDT': 'Bitcoin (BTC/USDT)', 'BINANCE:ETHUSDT': 'Ethereum (ETH/USDT)',
    'OANDA:DE30_EUR': 'DAX 30 (Germany)', 'OANDA:US30_USD': 'Dow Jones 30 (US)',
};

// --- STATE CỦA SERVER ---
let activeAlerts = [];
let currentPrices = {};
let alertIdCounter = 0;
Object.keys(symbolsToTrack).forEach(s => {
    currentPrices[s] = { price: 0, prevPrice: 0, displayName: symbolsToTrack[s] };
});

// --- KHỞI TẠO SERVER EXPRESS ---
const app = express();
app.use(express.json());

// === PHẦN SỬA ĐỔI QUAN TRỌNG: PHỤC VỤ FRONTEND ===
// 1. Chỉ định thư mục 'public' chứa các file tĩnh (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, 'public')));


// === API ENDPOINTS (vẫn giữ nguyên logic, chỉ là để sau phần static) ===
app.post('/api/alerts', (req, res) => {
    const { symbol, condition, value } = req.body;
    if (!symbol || !condition || !value) {
        return res.status(400).json({ error: 'Thiếu thông tin cảnh báo' });
    }
    const newAlert = {
        id: alertIdCounter++, symbol, condition, value: parseFloat(value),
        triggered: false, createdAt: new Date()
    };
    activeAlerts.push(newAlert);
    console.log(`[+] Đã thêm cảnh báo: ${symbol} ${condition} ${value}`);
    res.status(201).json(newAlert);
});

app.get('/api/alerts', (req, res) => {
    const alertsWithNames = activeAlerts.map(alert => ({
        ...alert, displayName: symbolsToTrack[alert.symbol] || alert.symbol
    }));
    res.json(alertsWithNames);
});

app.get('/api/prices', (req, res) => {
    res.json(currentPrices);
});

app.delete('/api/alerts/:id', (req, res) => {
    const idToDelete = parseInt(req.params.id, 10);
    const initialLength = activeAlerts.length;
    activeAlerts = activeAlerts.filter(alert => alert.id !== idToDelete);
    if(activeAlerts.length < initialLength) {
        console.log(`[-] Đã xóa cảnh báo ID: ${idToDelete}`);
        res.status(204).send();
    } else {
        res.status(404).json({error: "Không tìm thấy cảnh báo"});
    }
});

// --- LOGIC GỬI TELEGRAM (giữ nguyên) ---
async function sendTelegramMessage(message) {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
        console.warn("Chưa cấu hình TELEGRAM_BOT_TOKEN hoặc TELEGRAM_CHAT_ID trong file .env");
        return;
    }
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    try {
        await fetch(url, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message, parse_mode: 'Markdown' })
        });
        console.log(`[telegram] Đã gửi thông báo.`);
    } catch (error) {
        console.error('[telegram] Lỗi khi gửi tin nhắn:', error);
    }
}

// --- LOGIC KIỂM TRA CẢNH BÁO (giữ nguyên) ---
function checkAlerts() {
    activeAlerts.forEach(alert => {
        if (alert.triggered) return;
        const prices = currentPrices[alert.symbol];
        if (!prices || prices.price === 0 || prices.prevPrice === 0) return;
        const { price, prevPrice } = prices;
        const targetValue = alert.value;
        let conditionMet = false;

        switch (alert.condition) {
            case 'crossing':
                conditionMet = (prevPrice < targetValue && price >= targetValue) || (prevPrice > targetValue && price <= targetValue);
                break;
            case 'greater_than':
                conditionMet = price > targetValue;
                break;
            case 'less_than':
                conditionMet = price < targetValue;
                break;
        }

        if (conditionMet) {
            const displayName = symbolsToTrack[alert.symbol] || alert.symbol;
            console.log(`🔔 KÍCH HOẠT: ${displayName} ${alert.condition} ${alert.value}`);
            const message = `🔔 *Cảnh báo Giá* 🔔\n*${displayName}* vừa cắt qua mức *${alert.value}*.\nGiá hiện tại: *${price.toFixed(4)}*`;
            sendTelegramMessage(message);
            alert.triggered = true;
            setTimeout(() => {
                activeAlerts = activeAlerts.filter(a => a.id !== alert.id);
            }, 60000);
        }
    });
}

// --- KẾT NỐI FINNHUB WEBSOCKET (giữ nguyên) ---
function connectToFinnhub() {
    if (!FINNHUB_API_KEY) {
        console.error("Lỗi: FINNHUB_API_KEY chưa được thiết lập trong file .env. Không thể kết nối.");
        return;
    }
    const socket = new WebSocket(`wss://ws.finnhub.io?token=${FINNHUB_API_KEY}`);
    socket.on('open', () => {
        console.log('✅ Đã kết nối tới Finnhub WebSocket.');
        Object.keys(symbolsToTrack).forEach(symbol => {
            socket.send(JSON.stringify({ 'type': 'subscribe', 'symbol': symbol }));
        });
    });

    socket.on('message', (data) => {
        const message = JSON.parse(data);
        if (message.type === 'trade') {
            message.data.forEach(trade => {
                const symbol = trade.s;
                if (currentPrices[symbol]) {
                    currentPrices[symbol].prevPrice = currentPrices[symbol].price;
                    currentPrices[symbol].price = trade.p;
                }
            });
            checkAlerts();
        }
    });

    socket.on('close', () => {
        console.log('❌ Kết nối Finnhub đã đóng. Thử kết nối lại sau 5 giây...');
        setTimeout(connectToFinnhub, 5000);
    });

    socket.on('error', (error) => console.error('Lỗi WebSocket Finnhub:', error.message));
}


// === PHẦN SỬA ĐỔI QUAN TRỌNG: ROUTE "CATCH-ALL" ===
// 2. Route này phải nằm ở cuối, sau tất cả các route API.
// Nó sẽ trả về file index.html cho bất kỳ yêu cầu nào không khớp với API hoặc file tĩnh.
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


// --- KHỞI CHẠY ---
app.listen(PORT, () => {
    console.log(`🚀 Server đang chạy tại http://localhost:${PORT}`);
    connectToFinnhub();
});