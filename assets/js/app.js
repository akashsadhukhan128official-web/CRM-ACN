/**
 * ACN Broadband CRM - Core App Engine
 * Handles State, Routing, UI Feedback, and Navigation
 */

// Global App State
window.AppState = {
    customers: [
        { id: '101', name: 'Alen Walker', phone: '9876543210', address: '123 Blue St', plan: '50 Mbps Unlimited', price: 499, install: '2026-01-25', expiry: '2026-03-25', mac: 'AA:BB:CC:DD:EE:01', status: 'Active', notes: '' },
        { id: '102', name: 'John Doe', phone: '8765432109', address: '456 Orange Ave', plan: '100 Mbps Pro', price: 799, install: '2026-01-22', expiry: '2026-02-22', mac: 'AA:BB:CC:DD:EE:02', status: 'Active', notes: '' },
        { id: '103', name: 'Jane Smith', phone: '7654321098', address: '789 Link Rd', plan: '50 Mbps Unlimited', price: 499, install: '2026-01-15', expiry: '2026-02-15', mac: 'AA:BB:CC:DD:EE:03', status: 'Expired', notes: '' },
        { id: '104', name: 'Michael Ross', phone: '6543210987', address: '101 Signal Way', plan: '200 Mbps Ultra', price: 1299, install: '2026-01-26', expiry: '2026-02-26', mac: 'AA:BB:CC:DD:EE:04', status: 'Active', notes: '' },
        { id: '105', name: 'Rachel Zane', phone: '5432109876', address: '202 Fiber Blvd', plan: '100 Mbps Pro', price: 799, install: '2026-02-10', expiry: '2026-03-10', mac: 'AA:BB:CC:DD:EE:05', status: 'Active', notes: '' }
    ],
    plans: [
        { name: '50 Mbps Unlimited', price: 499, validity: 30 },
        { name: '100 Mbps Pro', price: 799, validity: 30 },
        { name: '200 Mbps Ultra', price: 1299, validity: 30 }
    ],
    staff: [
        { id: 'S1', name: 'Admin User', role: 'Super Admin', access: 'Full', status: 'Online', password: 'password' },
        { id: 'S2', name: 'Staff One', role: 'Support', access: 'Read/Write', status: 'Away', password: 'password' },
        { id: 'S3', name: 'Technician Ali', role: 'Technician', access: 'Read Only', status: 'Offline', password: 'password' }
    ],
    payments: [
        { id: 'RC-8821', customer: 'Alen Walker', amount: 499, date: new Date().toISOString().split('T')[0], method: 'UPI', status: 'Success' },
        { id: 'RC-8820', customer: 'Michael Ross', amount: 1299, date: new Date().toISOString().split('T')[0], method: 'Cash', status: 'Success' },
        { id: 'RC-8819', customer: 'John Doe', amount: 799, date: '2026-02-15', method: 'UPI', status: 'Success' }
    ],
    currentSection: 'dashboard',
    currentFilter: 'all',
    user: { name: 'Admin User', role: 'Super Admin' }
};

document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    updateCustomerStatuses(); // Check expiries on load

    // Check for existing session
    const token = localStorage.getItem('acn_auth_token');
    const lastSection = localStorage.getItem('acn_last_section') || 'dashboard';
    const lastParamData = localStorage.getItem('acn_last_params');
    const lastParams = lastParamData ? JSON.parse(lastParamData) : {};

    if (token) {
        // Authenticated: Hide login overlay and restore view
        const overlay = document.getElementById('login-overlay');
        if (overlay) overlay.style.display = 'none';
        navigateTo(lastSection, lastParams);
    } else {
        // Not authenticated: Ensure login is shown
        const overlay = document.getElementById('login-overlay');
        if (overlay) {
            overlay.style.display = 'flex';
            overlay.classList.remove('login-hidden');
        }
    }

    setupEventListeners();
    setupRippleEffects();

    // Midnight Refresh Check (every 10 minutes)
    setInterval(() => {
        updateCustomerStatuses();
        if (window.AppState.currentSection === 'dashboard') renderSection('dashboard');
        if (window.AppState.currentSection === 'expiring-soon') renderSection('expiring-soon');
    }, 600000);
}

function updateCustomerStatuses() {
    const today = new Date().toISOString().split('T')[0];
    window.AppState.customers.forEach(c => {
        if (c.expiry < today && c.status === 'Active') {
            c.status = 'Expired';
        } else if (c.expiry >= today && c.status === 'Expired') {
            c.status = 'Active';
        }
    });
}

/**
 * Utility: Calculate Days Left & Formatting
 * @param {string} dateStr - Expiry date
 * @returns {object} { text, color }
 */
function getDaysLeft(dateStr) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const exp = new Date(dateStr);
    exp.setHours(0, 0, 0, 0);

    const diffTime = exp - today;
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 0) {
        return { text: `${diffDays} Day${diffDays > 1 ? 's' : ''} Left`, color: 'var(--acn-orange)' };
    } else if (diffDays === 0) {
        return { text: 'Expires Today', color: 'var(--acn-blue)' };
    } else {
        const absDays = Math.abs(diffDays);
        return { text: `Expired ${absDays} Day${absDays > 1 ? 's' : ''} Ago`, color: '#ef4444' };
    }
}

// Global Event Listeners
function setupEventListeners() {
    // Navigation routing
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            const section = link.getAttribute('data-section');
            if (section) {
                e.preventDefault();
                if (section === 'logout') {
                    showLogoutConfirmation();
                    return;
                }
                navigateTo(section);
            }
        });
    });

    // Login logic
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();

            // Persistent Session Storage
            localStorage.setItem('acn_auth_token', 'mock_token_' + Date.now());
            localStorage.setItem('acn_last_section', 'dashboard');

            const overlay = document.getElementById('login-overlay');
            overlay.classList.add('login-hidden');
            setTimeout(() => {
                overlay.style.display = 'none';
                navigateTo('dashboard');
            }, 500);
            showToast('Login Successful', 'success');
        });
    }

    // Theme toggle
    const themeToggle = document.getElementById('theme-toggle');
    themeToggle.addEventListener('click', () => {
        const body = document.body;
        const currentTheme = body.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        body.setAttribute('data-theme', newTheme);
        themeToggle.innerHTML = newTheme === 'light' ? '<i class="lucide-sun"></i>' : '<i class="lucide-moon"></i>';
    });
}

/**
 * SPA Router
 * @param {string} sectionId - The destination section
 * @param {object} params - Optional state/data for the section (e.g. filter)
 */
function navigateTo(sectionId, params = {}) {
    // Auth Guard check on navigation
    const token = localStorage.getItem('acn_auth_token');
    if (!token && sectionId !== 'logout') {
        const overlay = document.getElementById('login-overlay');
        overlay.style.display = 'flex';
        overlay.classList.remove('login-hidden');
        return;
    }

    window.AppState.currentSection = sectionId;
    window.AppState.currentFilter = params.filter || 'all';
    window.AppState.lastParams = params;

    // Persist View State
    localStorage.setItem('acn_last_section', sectionId);
    localStorage.setItem('acn_last_params', JSON.stringify(params));

    // Update active state in sidebar
    document.querySelectorAll('.nav-link').forEach(l => {
        l.classList.remove('active');
        if (l.getAttribute('data-section') === sectionId) {
            l.classList.add('active');
        }
    });

    renderSection(sectionId);
}

// Section Renderer
function renderSection(sectionId) {
    const area = document.getElementById('content-area');
    area.innerHTML = '<div class="loader">Loading...</div>';

    // Store params in state for modules to access
    const params = window.AppState.lastParams || {};

    // Small delay for smooth transition feel
    setTimeout(() => {
        switch (sectionId) {
            case 'dashboard': renderDashboard(area); break;
            case 'add-customer': renderAddCustomer(area); break;
            case 'all-customers': renderCustomersTable(area, { filter: window.AppState.currentFilter }); break;
            case 'expiring-soon': renderCustomersTable(area, { filter: 'expiring' }); break;
            case 'payments': renderPayments(area, params); break;
            case 'plans': renderPlans(area); break;
            case 'settings': renderSettings(area); break;
            case 'reports': renderReports(area, params); break;
            case 'staff': renderStaff(area); break;
            default: renderPlaceholder(area, sectionId);
        }
        window.AppState.lastParams = null; // Clear after use
    }, 300);
}

/**
 * Toast Notification System
 * @param {string} msg - Message to show
 * @param {string} type - 'success' or 'error'
 */
function showToast(msg, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? 'lucide-check-circle' : 'lucide-alert-circle';

    toast.innerHTML = `
        <i class="${icon}" style="color: ${type === 'success' ? '#22c55e' : '#ef4444'}"></i>
        <span>${msg}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

/**
 * Modal System
 * @param {string} html - Content to inject
 */
function openModal(html) {
    const overlay = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content');
    content.innerHTML = html;
    overlay.classList.add('active');
}

function closeModal() {
    document.getElementById('modal-overlay').classList.remove('active');
}

// Ripple Effect Handler
function setupRippleEffects() {
    document.addEventListener('click', (e) => {
        const target = e.target.closest('button, .nav-link, .stat-card');
        if (!target) return;

        const ripple = document.createElement('span');
        ripple.className = 'ripple';

        const rect = target.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const x = e.clientX - rect.left - size / 2;
        const y = e.clientY - rect.top - size / 2;

        ripple.style.width = ripple.style.height = `${size}px`;
        ripple.style.left = `${x}px`;
        ripple.style.top = `${y}px`;

        target.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
    });
}

function showLogoutConfirmation() {
    openModal(`
        <div style="text-align: center;">
            <i class="lucide-log-out" style="font-size: 40px; color: #ef4444; margin-bottom: 20px;"></i>
            <h3>Confirm Logout</h3>
            <p style="color: var(--text-secondary); margin: 10px 0 30px;">Are you sure you want to exit the system?</p>
            <div style="display: flex; gap: 12px; justify-content: center;">
                <button class="glass-button" onclick="closeModal()">Cancel</button>
                <button class="glass-button primary" style="background: #ef4444;" onclick="logout()">Logout</button>
            </div>
        </div>
    `);
}

function logout() {
    localStorage.removeItem('acn_auth_token');
    localStorage.removeItem('acn_last_section');
    localStorage.removeItem('acn_last_params');
    location.reload();
}

function renderPlaceholder(container, id) {
    container.innerHTML = `
        <div class="glass-card" style="padding: 60px; text-align: center;">
            <i class="lucide-construction" style="font-size: 48px; color: var(--acn-orange); margin-bottom: 20px;"></i>
            <h2>System Module: ${id.toUpperCase()}</h2>
            <p style="color: var(--text-secondary); margin-top: 10px;">This feature is currently being optimized for production.</p>
            <button class="glass-button primary" style="margin-top: 30px;" onclick="navigateTo('dashboard')">Back to Dashboard</button>
        </div>
    `;
}
