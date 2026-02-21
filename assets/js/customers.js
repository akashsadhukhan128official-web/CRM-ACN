/**
 * Customer Management Module
 * Handles List, Filter, Add, Edit, Delete, and View
 */
import { db } from './firebase-config.js';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/9.1.1/firebase-firestore.js";

// Expose Globals IMMEDIATELY
window.renderCustomersTable = renderCustomersTable;
window.filterTable = filterTable;
window.getStatusClass = getStatusClass;
window.addCustomer = addCustomer;
window.viewCustomer = viewCustomer;
window.editCustomer = editCustomer;
window.confirmDelete = confirmDelete;
window.deleteCustomer = deleteCustomer;
window.saveCustomerProfile = saveCustomerProfile;

// Real-time listener for Customers
onSnapshot(query(collection(db, "customers"), orderBy("id", "desc")), (snapshot) => {
    window.AppState.customers = snapshot.docs.map(doc => ({
        firestoreId: doc.id,
        ...doc.data()
    }));
    // Trigger re-render if we are in customers or dashboard
    if (window.AppState.currentSection === 'all-customers' ||
        window.AppState.currentSection.includes('customers') ||
        window.AppState.currentSection === 'dashboard') {
        renderSection(window.AppState.currentSection);
    }
});

function renderCustomersTable(container, options = {}) {
    const filter = options.filter || window.AppState.currentFilter || 'all';
    let displayCustomers = [...window.AppState.customers];
    let title = 'All Customers';

    // Apply Filters
    if (filter === 'expiring') {
        const today = new Date();
        const sevenDaysLater = new Date();
        sevenDaysLater.setDate(today.getDate() + 7);
        displayCustomers = displayCustomers.filter(c => {
            const exp = new Date(c.expiry);
            return exp >= today && exp <= sevenDaysLater;
        });
        title = 'Expiring Soon (Next 7 Days)';
    } else if (filter === 'Active' || filter === 'Expired') {
        displayCustomers = displayCustomers.filter(c => c.status === filter);
        title = `${filter} Customers`;
    }

    // Sorting: Nearest Expiry first for "expiring" filter
    if (filter === 'expiring') {
        displayCustomers.sort((a, b) => new Date(a.expiry) - new Date(b.expiry));
    }

    const tableHTML = `
        <div class="glass-card" style="padding: 24px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                <h3>${title}</h3>
                <div style="display: flex; gap: 12px;">
                    <button class="glass-button primary" onclick="navigateTo('add-customer')">
                        <i class="lucide-user-plus"></i> Add New
                    </button>
                    <div class="search-bar" style="width: 250px;">
                        <i class="lucide-search" style="position: absolute; left: 12px; top: 12px; font-size: 16px; color: var(--text-secondary);"></i>
                        <input type="text" placeholder="Search name/phone..." onkeyup="filterTable(this.value)" style="padding-left: 36px; height: 40px;">
                    </div>
                </div>
            </div>

            <div style="overflow-x: auto;">
                <table id="customer-data-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Phone</th>
                            <th>Plan</th>
                            <th>Expiry</th>
                            <th>Days Left</th>
                            <th>Status</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${displayCustomers.map(c => {
        const days = getDaysLeft(c.expiry);
        return `
                            <tr data-id="${c.id}">
                                <td>#${c.id}</td>
                                <td style="font-weight: 600;">${c.name}</td>
                                <td>${c.phone}</td>
                                <td>${c.plan}</td>
                                <td>${c.expiry}</td>
                                <td style="color: ${days.color}; font-weight: 600;">${days.text}</td>
                                <td><span class="status-badge ${getStatusClass(c.status)}">${c.status}</span></td>
                                <td style="text-align: center;">
                                    <div class="action-pill">
                                        <button class="action-btn view" onclick="viewCustomer('${c.id}')" title="View Customer Details">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/></svg>
                                        </button>
                                        <button class="action-btn edit" onclick="editCustomer('${c.id}')" title="Edit Customer Profile">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.375 2.625a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4Z"/></svg>
                                        </button>
                                        <button class="action-btn delete" onclick="confirmDelete('${c.id}')" title="Delete Customer">
                                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        `;
    }).join('')}
                        ${displayCustomers.length === 0 ? '<tr><td colspan="7" style="text-align: center; padding: 40px; color: var(--text-secondary);">No customers found matching the criteria.</td></tr>' : ''}
                    </tbody>
                </table>
            </div>
        </div>
    `;

    container.innerHTML = tableHTML;
}

function filterTable(val) {
    const rows = document.querySelectorAll('#customer-data-table tbody tr');
    val = val.toLowerCase();
    rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        row.style.display = text.includes(val) ? '' : 'none';
    });
}

function getStatusClass(status) {
    if (status === 'Active') return 'status-active';
    if (status === 'Expired') return 'status-expired';
    return 'status-warning';
}

// Add Customer Logic
function renderAddCustomer(container) {
    const formHTML = `
        <div class="glass-card" style="padding: 32px; max-width: 800px; margin: 0 auto;">
            <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 24px;">
                <button class="glass-button" style="padding: 8px;" onclick="navigateTo('all-customers')"><i class="lucide-arrow-left"></i></button>
                <h3>Add New Customer</h3>
            </div>
            <form id="add-customer-form" style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                <div class="form-group">
                    <label style="display: block; margin-bottom: 8px; font-size: 0.875rem;">Full Name</label>
                    <input type="text" name="name" placeholder="Enter name" required style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid var(--glass-border); background: rgba(255,255,255,0.4);">
                </div>
                <div class="form-group">
                    <label style="display: block; margin-bottom: 8px; font-size: 0.875rem;">Phone Number</label>
                    <input type="tel" name="phone" placeholder="Enter phone" required style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid var(--glass-border); background: rgba(255,255,255,0.4);">
                </div>
                <div class="form-group" style="grid-column: span 2;">
                    <label style="display: block; margin-bottom: 8px; font-size: 0.875rem;">Address</label>
                    <textarea name="address" placeholder="Enter address" rows="2" style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid var(--glass-border); background: rgba(255,255,255,0.4);"></textarea>
                </div>
                <div class="form-group">
                    <label style="display: block; margin-bottom: 8px; font-size: 0.875rem;">Router MAC</label>
                    <input type="text" name="mac" placeholder="XX:XX:XX:XX:XX:XX" style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid var(--glass-border); background: rgba(255,255,255,0.4);">
                </div>
                <div class="form-group">
                    <label style="display: block; margin-bottom: 8px; font-size: 0.875rem;">Installation Date</label>
                    <input type="date" id="install-date" name="install" required style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid var(--glass-border); background: rgba(255,255,255,0.4);">
                </div>
                <div class="form-group">
                    <label style="display: block; margin-bottom: 8px; font-size: 0.875rem;">Select Plan</label>
                    <select id="plan-select" name="plan" required style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid var(--glass-border); background: rgba(255,255,255,0.4);">
                        <option value="">Choose a plan</option>
                        ${window.AppState.plans.map(p => `<option value="${p.name}" data-price="${p.price}">${p.name} - ₹${p.price}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label style="display: block; margin-bottom: 8px; font-size: 0.875rem;">Expiry Date (Calculated)</label>
                    <input type="date" name="expiry" id="expiry-date" readonly style="width: 100%; padding: 12px; border-radius: 8px; border: 1px solid rgba(var(--acn-blue-rgb), 0.2); background: rgba(var(--acn-blue-rgb), 0.05); cursor: not-allowed;">
                </div>
                
                <div style="grid-column: span 2; display: flex; justify-content: flex-end; gap: 12px; margin-top: 20px;">
                    <button type="button" class="glass-button" onclick="navigateTo('all-customers')">Cancel</button>
                    <button type="submit" class="glass-button primary">Register Customer</button>
                </div>
            </form>
        </div>
    `;

    container.innerHTML = formHTML;

    // Auto-calculate expiry
    const iIn = document.getElementById('install-date');
    const pSel = document.getElementById('plan-select');
    const eIn = document.getElementById('expiry-date');

    [iIn, pSel].forEach(e => e.addEventListener('change', () => {
        if (iIn.value) {
            const d = new Date(iIn.value);
            d.setDate(d.getDate() + 30);
            eIn.value = d.toISOString().split('T')[0];
        }
    }));

    document.getElementById('add-customer-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData(e.target);
        const newCust = Object.fromEntries(fd.entries());
        newCust.id = (100 + window.AppState.customers.length + 1).toString();
        newCust.status = 'Active';
        try {
            await addDoc(collection(db, "customers"), newCust);
            showToast(`Customer ${newCust.name} added successfully!`, 'success');
            navigateTo('all-customers');
        } catch (error) {
            showToast('Failed to add customer to database', 'error');
            console.error(error);
        }
    });
}

// Actions: View, Edit, Delete
function viewCustomer(id) {
    const c = window.AppState.customers.find(x => x.id === id);
    openModal(`
        <div style="padding: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 24px;">
                <h3>Customer Details: #${c.id}</h3>
                <span class="status-badge ${getStatusClass(c.status)}">${c.status}</span>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px;">
                <div>
                    <label style="color: var(--text-secondary); font-size: 0.875rem;">Full Name</label>
                    <p style="font-weight: 600; font-size: 1.1rem; margin-top: 4px;">${c.name}</p>
                </div>
                <div>
                    <label style="color: var(--text-secondary); font-size: 0.875rem;">Phone Number</label>
                    <p style="font-weight: 600; font-size: 1.1rem; margin-top: 4px;">${c.phone}</p>
                </div>
                <div style="grid-column: span 2;">
                    <label style="color: var(--text-secondary); font-size: 0.875rem;">Address</label>
                    <p style="margin-top: 4px;">${c.address}</p>
                </div>
                <div>
                    <label style="color: var(--text-secondary); font-size: 0.875rem;">Router MAC</label>
                    <p style="font-family: monospace; margin-top: 4px;">${c.mac || 'N/A'}</p>
                </div>
                <div>
                    <label style="color: var(--text-secondary); font-size: 0.875rem;">Plan</label>
                    <p style="margin-top: 4px; color: var(--acn-blue); font-weight: 600;">${c.plan}</p>
                </div>
                <div>
                    <label style="color: var(--text-secondary); font-size: 0.875rem;">Price</label>
                    <p style="margin-top: 4px; font-weight: 600;">₹${c.price}</p>
                </div>
                <div>
                    <label style="color: var(--text-secondary); font-size: 0.875rem;">Expiry Date</label>
                    <p style="margin-top: 4px; color: var(--acn-orange); font-weight: 700;">${c.expiry}</p>
                </div>
            </div>
            <div style="margin-top: 40px; display: flex; justify-content: flex-end;">
                <button class="glass-button primary" onclick="closeModal()">Close</button>
            </div>
        </div>
    `);
}

function editCustomer(id) {
    const c = window.AppState.customers.find(x => x.id === id);
    openModal(`
        <div style="width: 500px; max-width: 95vw;">
            <h3 style="margin-bottom: 24px; display: flex; align-items: center; gap: 10px;">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--acn-orange);"><path d="M12 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.375 2.625a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4Z"/></svg>
                Edit Customer: ${c.name}
            </h3>
            <form id="edit-customer-form" style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                <div class="form-group">
                    <label style="display: block; margin-bottom: 8px; font-size: 0.875rem; font-weight: 600;">Phone Number</label>
                    <input type="tel" name="phone" value="${c.phone}" required class="glass-input">
                </div>
                <div class="form-group">
                    <label style="display: block; margin-bottom: 8px; font-size: 0.875rem; font-weight: 600;">Status</label>
                    <select name="status" class="glass-input" id="edit-status">
                        <option value="Active" ${c.status === 'Active' ? 'selected' : ''}>Active</option>
                        <option value="Expired" ${c.status === 'Expired' ? 'selected' : ''}>Expired</option>
                        <option value="Suspended" ${c.status === 'Suspended' ? 'selected' : ''}>Suspended</option>
                    </select>
                </div>
                <div class="form-group">
                    <label style="display: block; margin-bottom: 8px; font-size: 0.875rem; font-weight: 600;">Installation Date</label>
                    <input type="date" name="install" id="edit-install-date" value="${c.install || ''}" required class="glass-input">
                </div>
                <div class="form-group">
                    <label style="display: block; margin-bottom: 8px; font-size: 0.875rem; font-weight: 600;">Expiry Date</label>
                    <input type="date" name="expiry" id="edit-expiry-date" value="${c.expiry}" required class="glass-input">
                </div>
                <div class="form-group" style="grid-column: span 2;">
                    <label style="display: block; margin-bottom: 8px; font-size: 0.875rem; font-weight: 600;">Address</label>
                    <input type="text" name="address" value="${c.address}" class="glass-input">
                </div>
                <div id="edit-error" style="grid-column: span 2; color: #ef4444; font-size: 0.8rem; height: 1.2rem;"></div>
                <div style="grid-column: span 2; display: flex; justify-content: flex-end; gap: 12px; margin-top: 10px;">
                    <button type="button" class="glass-button" onclick="closeModal()">Cancel</button>
                    <button type="submit" class="glass-button primary">Update Profile</button>
                </div>
            </form>
        </div>
    `);

    const iIn = document.getElementById('edit-install-date');
    const eIn = document.getElementById('edit-expiry-date');
    const err = document.getElementById('edit-error');

    iIn.addEventListener('change', () => {
        if (iIn.value) {
            const d = new Date(iIn.value);
            d.setDate(d.getDate() + 30);
            eIn.value = d.toISOString().split('T')[0];
            err.textContent = '';
        }
    });

    eIn.addEventListener('change', () => {
        if (iIn.value && eIn.value < iIn.value) {
            err.textContent = 'Expiry date cannot be before installation date';
        } else {
            err.textContent = '';
        }
    });

    document.getElementById('edit-customer-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        if (iIn.value && eIn.value < iIn.value) {
            err.textContent = 'Invalid dates. Please check again.';
            return;
        }

        const fd = new FormData(e.target);
        const data = Object.fromEntries(fd.entries());

        // Auto Status Update Logic
        const today = new Date().toISOString().split('T')[0];
        if (data.expiry < today) {
            data.status = 'Expired';
        } else if (data.status === 'Expired') {
            data.status = 'Active'; // Reactivate if date moved to future
        }
        const firestoreId = c.firestoreId;
        try {
            const customerRef = doc(db, "customers", firestoreId);
            await updateDoc(customerRef, data);
            showToast('Customer profile updated successfully', 'success');
            closeModal();
            renderSection('all-customers');
        } catch (error) {
            showToast('Update failed', 'error');
        }
    });
}

function confirmDelete(id) {
    const c = window.AppState.customers.find(x => x.id === id);
    openModal(`
        <div style="text-align: center; padding: 10px;">
            <i class="lucide-alert-triangle" style="font-size: 40px; color: #ef4444; margin-bottom: 20px;"></i>
            <h3>Delete Customer?</h3>
            <p style="color: var(--text-secondary); margin: 10px 0 30px;">Are you sure you want to delete <b>${c.name}</b>? This action cannot be undone.</p>
            <div style="display: flex; gap: 12px; justify-content: center;">
                <button class="glass-button" onclick="closeModal()">Keep Customer</button>
                <button class="glass-button primary" style="background: #ef4444;" onclick="deleteCustomer('${id}')">Delete Forever</button>
            </div>
        </div>
    `);
}

async function deleteCustomer(id) {
    const c = window.AppState.customers.find(cust => cust.id === id);
    if (!c || !c.firestoreId) return;

    try {
        await deleteDoc(doc(db, "customers", c.firestoreId));
        showToast('Customer record deleted', 'error');
        closeModal();
        renderSection('all-customers');
    } catch (error) {
        showToast('Deletion failed', 'error');
    }
}


