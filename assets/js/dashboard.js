function renderDashboard(container) {
    const dashboardHTML = `
        <div class="stats-grid">
            <div class="glass-card stat-card" onclick="navigateTo('all-customers')">
                <div class="stat-label">Total Customers</div>
                <div class="stat-value" id="total-customers">0</div>
                <div style="color: #22c55e; font-size: 0.75rem;">+12% from last month</div>
            </div>
            <div class="glass-card stat-card" onclick="navigateTo('all-customers', { filter: 'Active' })">
                <div class="stat-label">Active Customers</div>
                <div class="stat-value" id="active-customers" style="color: var(--acn-blue);">0</div>
                <div style="color: var(--text-secondary); font-size: 0.75rem;">89.5% Active rate</div>
            </div>
            <div class="glass-card stat-card orange" onclick="navigateTo('all-customers', { filter: 'Expired' })">
                <div class="stat-label">Expired Customers</div>
                <div class="stat-value" id="expired-customers" style="color: var(--acn-orange);">0</div>
                <div style="color: var(--acn-orange); font-size: 0.75rem;">Requires attention</div>
            </div>
            <div class="glass-card stat-card orange" onclick="navigateTo('expiring-soon')">
                <div class="stat-label">Expiring Soon (7d)</div>
                <div class="stat-value" id="expiring-soon">0</div>
                <div style="color: var(--text-secondary); font-size: 0.75rem;">Follow up needed</div>
            </div>
            <div class="glass-card stat-card" onclick="navigateTo('reports', { module: 'revenue' })">
                <div class="stat-label">Monthly Collection</div>
                <div class="stat-value">₹4.2L</div>
                <div style="color: #22c55e; font-size: 0.75rem;">On track</div>
            </div>
            <div class="glass-card stat-card" onclick="navigateTo('payments', { module: 'today' })">
                <div class="stat-label">Today's Collection</div>
                <div class="stat-value">₹12,450</div>
                <div style="color: var(--acn-blue); font-size: 0.75rem;">18 Payments</div>
            </div>
        </div>

        <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 24px;">
            <div class="glass-card" style="padding: 24px;">
                <h3 style="margin-bottom: 20px;">Revenue Growth</h3>
                <canvas id="revenueChart" height="100"></canvas>
            </div>
            <div class="glass-card" style="padding: 24px;">
                <h3 style="margin-bottom: 20px;">Customer Status</h3>
                <canvas id="statusChart"></canvas>
            </div>
        </div>
    `;

    container.innerHTML = dashboardHTML;

    setTimeout(() => {
        initCharts();
        animateCounters();
    }, 100);
}

function animateCounters() {
    const summary = {
        total: window.AppState.customers.length,
        active: window.AppState.customers.filter(c => c.status === 'Active').length,
        expired: window.AppState.customers.filter(c => c.status === 'Expired').length,
        expiring: 42 // Mock or calculate
    };

    const counters = [
        { id: 'total-customers', end: summary.total },
        { id: 'active-customers', end: summary.active },
        { id: 'expired-customers', end: summary.expired },
        { id: 'expiring-soon', end: summary.expiring }
    ];

    counters.forEach(c => {
        const el = document.getElementById(c.id);
        if (!el) return;
        let start = 0;
        const duration = 1000;
        const step = (timestamp) => {
            if (!start) start = timestamp;
            const progress = Math.min((timestamp - start) / duration, 1);
            el.innerText = Math.floor(progress * c.end);
            if (progress < 1) {
                window.requestAnimationFrame(step);
            }
        };
        window.requestAnimationFrame(step);
    });
}

function initCharts() {
    const ctxRevenue = document.getElementById('revenueChart').getContext('2d');
    const ctxStatus = document.getElementById('statusChart').getContext('2d');

    new Chart(ctxRevenue, {
        type: 'line',
        data: {
            labels: ['Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb'],
            datasets: [{
                label: 'Revenue (in ₹)',
                data: [320000, 350000, 340000, 380000, 410000, 420000],
                borderColor: '#0B5ED7',
                backgroundColor: 'rgba(11, 94, 215, 0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: false, grid: { display: false } },
                x: { grid: { display: false } }
            }
        }
    });

    const activeCount = window.AppState.customers.filter(c => c.status === 'Active').length;
    const expiredCount = window.AppState.customers.filter(c => c.status === 'Expired').length;

    new Chart(ctxStatus, {
        type: 'doughnut',
        data: {
            labels: ['Active', 'Expired', 'Suspended'],
            datasets: [{
                data: [activeCount, expiredCount, 5],
                backgroundColor: ['#0B5ED7', '#FF6A00', '#64748b'],
                borderWidth: 0
            }]
        },
        options: {
            cutout: '70%',
            plugins: { legend: { position: 'bottom' } }
        }
    });
}
