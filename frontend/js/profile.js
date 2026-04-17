// Self-contained auth check
const authToken = localStorage.getItem('auth_token');
if (!authToken) {
    window.location.href = 'index.html';
}

// Define local isAuthenticated
function isAuthenticated() {
    return !!localStorage.getItem('auth_token');
}
// Check authentication
if (!isAuthenticated()) {
    window.location.href = 'index.html';
}

// Load user profile
async function loadProfile() {
    const phone = localStorage.getItem('user_phone') || 'Customer';
    const name = localStorage.getItem('user_name') || 'Customer';
    
    document.getElementById('profileName').innerText = name;
    document.getElementById('profilePhone').innerHTML = `<i class="fas fa-phone-alt gold-icon"></i> ${phone}`;
    document.getElementById('profileInitials').innerText = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    document.getElementById('editName').value = name;
    document.getElementById('editPhone').value = phone;
    
    // Load from localStorage
    const profile = JSON.parse(localStorage.getItem('user_profile') || '{}');
    if (profile.email) document.getElementById('editEmail').value = profile.email;
    if (profile.dob) document.getElementById('editDob').value = profile.dob;
}

// Save profile
document.getElementById('profileForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const profile = {
        name: document.getElementById('editName').value,
        email: document.getElementById('editEmail').value,
        dob: document.getElementById('editDob').value
    };
    
    localStorage.setItem('user_profile', JSON.stringify(profile));
    localStorage.setItem('user_name', profile.name);
    
    document.getElementById('profileName').innerText = profile.name;
    document.getElementById('profileInitials').innerText = profile.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    
    showToast('Profile updated successfully!');
});

// Load order history
function loadOrderHistory() {
    const orders = JSON.parse(localStorage.getItem('cheesy_orders') || '[]');
    const container = document.getElementById('orderHistoryContainer');
    
    if (orders.length === 0) {
        container.innerHTML = '<p class="text-muted text-center py-4">No orders yet. <a href="index.html#menu">Order now!</a></p>';
        return;
    }
    
    let html = '';
    orders.reverse().forEach(order => {
        const statusClass = order.status === 'confirmed' ? 'status-pending' : 'status-delivered';
        html += `
            <div class="order-history-item">
                <div class="d-flex justify-content-between align-items-start mb-3">
                    <div>
                        <h6>Order #${order.id}</h6>
                        <small>${new Date(order.timestamp).toLocaleDateString()}</small>
                    </div>
                    <span class="status-badge ${statusClass}">${order.status}</span>
                </div>
                <div>
                    ${order.items.map(item => `
                        <div class="d-flex justify-content-between">
                            <span>${item.quantity}x ${item.name}</span>
                            <span>₹${item.price * item.quantity}</span>
                        </div>
                    `).join('')}
                </div>
                <hr style="border-color: #3a352e;">
                <div class="d-flex justify-content-between">
                    <strong>Total</strong>
                    <strong style="color: var(--gold);">₹${order.total}</strong>
                </div>
                <div class="mt-2">
                    <small><i class="fas fa-${order.order_type === 'delivery' ? 'motorcycle' : 'shopping-bag'} gold-icon"></i> ${order.order_type}</small>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Load saved addresses
function loadAddresses() {
    const addresses = JSON.parse(localStorage.getItem('saved_addresses') || '[]');
    const container = document.getElementById('savedAddressesContainer');
    
    if (addresses.length === 0) {
        container.innerHTML = '<p class="text-muted">No saved addresses yet.</p>';
        return;
    }
    
    let html = '';
    addresses.forEach((addr, index) => {
        html += `
            <div class="address-item" style="background: var(--card-light); padding: 1rem; border-radius: 12px; margin-bottom: 1rem;">
                <div class="d-flex justify-content-between">
                    <div>
                        <strong>${addr.label || 'Address ' + (index + 1)}</strong>
                        <p class="mb-1 mt-2">${addr.full}</p>
                    </div>
                    <button class="btn-sm" onclick="deleteAddress(${index})" style="background:none; border:none; color:#dc3545;">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Add address
document.getElementById('addAddressBtn')?.addEventListener('click', () => {
    const address = prompt('Enter your address:');
    if (address) {
        const addresses = JSON.parse(localStorage.getItem('saved_addresses') || '[]');
        addresses.push({ full: address, label: 'Home' });
        localStorage.setItem('saved_addresses', JSON.stringify(addresses));
        loadAddresses();
        showToast('Address saved!');
    }
});

// Delete address
function deleteAddress(index) {
    const addresses = JSON.parse(localStorage.getItem('saved_addresses') || '[]');
    addresses.splice(index, 1);
    localStorage.setItem('saved_addresses', JSON.stringify(addresses));
    loadAddresses();
    showToast('Address removed');
}

// Load reviews
function loadMyReviews() {
    const reviews = JSON.parse(localStorage.getItem('user_reviews') || '[]');
    const container = document.getElementById('myReviewsContainer');
    
    if (reviews.length === 0) {
        container.innerHTML = '<p class="text-muted text-center py-4">No reviews yet.</p>';
        return;
    }
    
    let html = '';
    reviews.reverse().forEach(review => {
        html += `
            <div style="background: var(--card-light); padding: 1rem; border-radius: 12px; margin-bottom: 1rem;">
                <div class="d-flex justify-content-between">
                    <strong>${review.itemName}</strong>
                    <span style="color: var(--gold);">
                        ${'★'.repeat(review.rating)}${'☆'.repeat(5-review.rating)}
                    </span>
                </div>
                <p class="mt-2 mb-0">${review.comment}</p>
                <small class="text-muted">${new Date(review.date).toLocaleDateString()}</small>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

// Tab switching
document.querySelectorAll('.profile-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.profile-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        const tabId = tab.getAttribute('data-tab');
        document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
        document.getElementById(`tab-${tabId}`).style.display = 'block';
        
        if (tabId === 'orders') loadOrderHistory();
        if (tabId === 'addresses') loadAddresses();
        if (tabId === 'reviews') loadMyReviews();
    });
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadProfile();
});

// Toast helper
function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast-message';
    toast.innerHTML = `<i class="fas fa-check-circle" style="color: var(--gold);"></i> ${message}`;
    toast.style.cssText = 'position:fixed; bottom:20px; right:20px; background:#1a1814; border-left:4px solid #cda45e; padding:12px 20px; border-radius:8px; z-index:9999;';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}
