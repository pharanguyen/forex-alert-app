document.addEventListener('DOMContentLoaded', function() {
    const API_URL = '/api';
    
    // ... Danh sách symbolsToTrack giữ nguyên như cũ ...
    const symbolsToTrack = {
        'OANDA:XAU_USD': 'Vàng (XAU/USD)', 'OANDA:XAG_USD': 'Bạc (XAG/USD)', 'OANDA:EUR_USD': 'EUR/USD',
        'OANDA:GBP_USD': 'GBP/USD', 'OANDA:USD_JPY': 'USD/JPY', 'OANDA:USD_CHF': 'USD/CHF',
        'OANDA:AUD_USD': 'AUD/USD', 'OANDA:USD_CAD': 'USD/CAD', 'OANDA:NZD_USD': 'NZD/USD',
        'OANDA:EUR_GBP': 'EUR/GBP', 'OANDA:EUR_JPY': 'EUR/JPY', 'OANDA:EUR_CHF': 'EUR/CHF',
        'OANDA:EUR_AUD': 'EUR/AUD', 'OANDA:EUR_CAD': 'EUR/CAD', 'OANDA:EUR_NZD': 'EUR/NZD',
        'OANDA:GBP_JPY': 'GBP/JPY', 'OANDA:GBP_CHF': 'GBP/CHF', 'OANDA:GBP_AUD': 'GBP/AUD',
        'OANDA:GBP_CAD': 'GBP/CAD', 'OANDA:GBP_NZD': 'GBP/NZD', 'OANDA:AUD_JPY': 'AUD/JPY',
        'OANDA:AUD_CAD': 'AUD/CAD', 'OANDA:AUD_CHF': 'AUD/CHF', 'OANDA:AUD_NZD': 'AUD/NZD',
        'OANDA:CAD_JPY': 'CAD/JPY', 'OANDA:CAD_CHF': 'CAD/CHF', 'OANDA:CHF_JPY': 'CHF/JPY',
        'OANDA:NZD_JPY': 'NZD/JPY', 'OANDA:NZD_CAD': 'NZD/CAD', 'OANDA:NZD_CHF': 'NZD/CHF',
        'OANDA:USD_SGD': 'USD/SGD', 'OANDA:USD_HKD': 'USD/HKD', 'OANDA:USD_MXN': 'USD/MXN',
        'OANDA:EUR_PLN': 'EUR/PLN', 'BINANCE:BTCUSDT': 'Bitcoin (BTC/USDT)', 'BINANCE:ETHUSDT': 'Ethereum (ETH/USDT)',
        'OANDA:DE30_EUR': 'DAX 30 (Germany)', 'OANDA:US30_USD': 'Dow Jones 30 (US)',
    };
    
    const priceTableBody = document.getElementById('price-table-body');
    const activeAlertsList = document.getElementById('active-alerts-list');
    const toggleSidebarBtn = document.getElementById('toggle-sidebar-btn');
    const sidebar = document.getElementById('sidebar');

    function displayTradingViewChart(symbol, displayName) {
        const chartSymbol = symbol.split(':')[1].replace(/_/g, '');
        const container = document.getElementById('tradingview-chart-container');
        container.innerHTML = ''; // Xóa chart cũ
        
        new TradingView.widget({
            "autosize": true,
            "symbol": chartSymbol,
            "interval": "60",
            "timezone": "Asia/Ho_Chi_Minh",
            "theme": "dark", // THAY ĐỔI THEME THÀNH TỐI
            "style": "1",
            "locale": "vi_VN",
            "container_id": "tradingview-chart-container",
            "enable_publishing": false,
            "withdateranges": true,
            "hide_side_toolbar": false,
            "allow_symbol_change": true,
            "details": true,
            "hotlist": true,
            "calendar": true,
            "studies": ["MASimple@tv-basicstudies", "Volume@tv-basicstudies"],
            "disabled_features": ["use_localstorage_for_settings"],
            "enabled_features": ["study_templates", "header_fullscreen_button"]
        });
    }

    // Các hàm giao tiếp với server (create, fetch, delete) giữ nguyên
    async function createAlertOnServer(alertData) { /* Giữ nguyên */ }
    async function fetchActiveAlerts() { /* Giữ nguyên */ }
    async function fetchPrices() { /* Giữ nguyên */ }
    async function deleteAlertOnServer(alertId) { /* Giữ nguyên */ }
    // Dán lại các hàm này từ phiên bản trước nếu cần
    async function createAlertOnServer(alertData) {
        try { await fetch(`${API_URL}/alerts`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(alertData) }); fetchActiveAlerts(); } catch (error) { console.error('Lỗi tạo cảnh báo:', error); }
    }
    async function fetchActiveAlerts() {
        try { const response = await fetch(`${API_URL}/alerts`); const alerts = await response.json(); renderActiveAlerts(alerts); } catch (error) { console.error('Lỗi tải danh sách cảnh báo:', error); }
    }
    async function fetchPrices() {
        try { const response = await fetch(`${API_URL}/prices`); const prices = await response.json(); updatePriceBoard(prices); } catch (error) { console.error('Lỗi tải giá:', error); }
    }
    async function deleteAlertOnServer(alertId) {
        try { await fetch(`${API_URL}/alerts/${alertId}`, { method: 'DELETE' }); fetchActiveAlerts(); } catch (error) { console.error('Lỗi xóa cảnh báo:', error); }
    }


    function renderActiveAlerts(alerts) {
        activeAlertsList.innerHTML = '';
        if (alerts.length === 0) {
            activeAlertsList.innerHTML = '<li>Không có cảnh báo.</li>';
            return;
        }
        alerts.forEach(alert => {
            const listItem = document.createElement('li');
            listItem.innerHTML = `<span><strong>${alert.displayName}</strong> @ ${alert.value}</span><button class="delete-alert" data-id="${alert.id}" title="Xóa">&times;</button>`;
            activeAlertsList.appendChild(listItem);
        });
        document.querySelectorAll('.delete-alert').forEach(button => {
            button.addEventListener('click', function() { deleteAlertOnServer(this.getAttribute('data-id')); });
        });
    }
    
    function updatePriceBoard(prices) {
        priceTableBody.innerHTML = '';
        Object.keys(prices).sort((a,b) => symbolsToTrack[a].localeCompare(symbolsToTrack[b])).forEach(symbol => {
            const data = prices[symbol];
            if (data.price === 0) return;

            const row = document.createElement('tr');
            row.addEventListener('click', () => { displayTradingViewChart(symbol, data.displayName); });
            
            const infoCell = `<td><strong>${data.displayName}</strong></td>`;
            const priceCell = `<td style="text-align: right;"><span class="price ${data.price > data.prevPrice ? 'price-up' : 'price-down'}">${formatPrice(symbol, data.price)}</span></td>`;
            
            const alertCell = document.createElement('td');
            const alertButton = document.createElement('button');
            alertButton.className = 'alert-button';
            alertButton.innerHTML = '🔔';
            alertButton.title = `Tạo cảnh báo cho ${data.displayName}`;
            alertButton.addEventListener('click', (e) => {
                e.stopPropagation();
                const priceValue = prompt(`Tạo cảnh báo "Cắt qua" cho ${data.displayName} tại giá:`, data.price.toFixed(4));
                if (priceValue && !isNaN(priceValue) && priceValue > 0) {
                    createAlertOnServer({ symbol: symbol, condition: 'crossing', value: priceValue });
                } else if (priceValue) {
                    alert('Giá trị không hợp lệ.');
                }
            });
            alertCell.appendChild(alertButton);
            
            row.innerHTML = infoCell + priceCell;
            row.appendChild(alertCell);
            priceTableBody.appendChild(row);
        });
    }
    
    function formatPrice(symbol, price) {
        if (symbol.includes('JPY') || symbol.includes('DE30')) return price.toFixed(3);
        if (symbol.includes('US30') || symbol.includes('BTC') || symbol.includes('ETH')) return price.toFixed(2);
        return price.toFixed(5);
    }

    // --- LOGIC MỚI CHO SIDEBAR ---
    toggleSidebarBtn.addEventListener('click', () => {
        sidebar.classList.toggle('hidden');
        toggleSidebarBtn.classList.toggle('active');
        // Cho TradingView biết cần thay đổi kích thước
        window.dispatchEvent(new Event('resize'));
    });
    
    // Mặc định bật sidebar
    sidebar.classList.remove('hidden');
    toggleSidebarBtn.classList.add('active');


    // --- KHỞI TẠO ---
    fetchPrices();
    fetchActiveAlerts();
    setInterval(fetchPrices, 3000);
    setInterval(fetchActiveAlerts, 10000);
    displayTradingViewChart('OANDA:XAU_USD', 'Vàng (XAU/USD)');
});