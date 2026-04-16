// API Configuration
const API_BASE_URL = localStorage.getItem('API_BASE_URL') || 'http://localhost:8000/api';
let authToken = localStorage.getItem('authToken');
let currentUserId = localStorage.getItem('userId');
let isAdmin = localStorage.getItem('isAdmin') === 'true';

// API Service
const api = {
    async request(endpoint, options = {}) {
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };
        
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }
        
        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers
        });
        
        if (response.status === 401) {
            // Token expired, logout
            this.logout();
            if (window.location.pathname !== '/' && !window.location.pathname.includes('index.html')) {
                window.location.href = 'index.html';
            }
            throw new Error('Session expired. Please login again.');
        }
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.detail || 'Request failed');
        }
        
        return data;
    },
    
    async getMenu(category = 'all') {
        const url = category !== 'all' ? `/menu?category=${category}` : '/menu';
        return this.request(url);
    },
    
    async addToCart(menuItemId, quantity = 1) {
        if (!authToken) {
            throw new Error('Please login to add items to cart');
        }
        return this.request('/cart/add', {
            method: 'POST',
            body: JSON.stringify({ menu_item_id: menuItemId, quantity })
        });
    },
    
    async getCart() {
        if (!authToken) return { items: [], total: 0 };
        return this.request('/cart');
    },
    
    async removeFromCart(menuItemId) {
        return this.request('/cart/remove', {
            method: 'DELETE',
            body: JSON.stringify({ menu_item_id: menuItemId })
        });
    },
    
    async updateCartItem(menuItemId, quantity) {
        return this.request('/cart/update', {
            method: 'PUT',
            body: JSON.stringify({ menu_item_id: menuItemId, quantity })
        });
    },
    
    async createOrder(orderType, address = null) {
        return this.request('/orders/create', {
            method: 'POST',
            body: JSON.stringify({ order_type: orderType, address })
        });
    },
    
    async getOrders() {
        return this.request('/orders/user');
    },
    
    async getOrderDetails(orderId) {
        return this.request(`/orders/${orderId}`);
    },
    
    async createReservation(reservationData) {
        return this.request('/reservation', {
            method: 'POST',
            body: JSON.stringify(reservationData)
        });
    },
    
    async getUserReservations() {
        return this.request('/reservation/user');
    },
    
    async sendOTP(phone) {
        return this.request('/auth/send-otp', {
            method: 'POST',
            body: JSON.stringify({ phone })
        });
    },
    
    async verifyOTP(phone, otp) {
        const response = await this.request('/auth/verify-otp', {
            method: 'POST',
            body: JSON.stringify({ phone, otp })
        });
        
        if (response.access_token) {
            this.setAuth(response.access_token, response.user_id, response.is_admin);
        }
        
        return response;
    },
    
    setAuth(token, userId, admin = false) {
        authToken = token;
        currentUserId = userId;
        isAdmin = admin;
        localStorage.setItem('authToken', authToken);
        localStorage.setItem('userId', currentUserId);
        localStorage.setItem('isAdmin', isAdmin);
    },
    
    logout() {
        authToken = null;
        currentUserId = null;
        isAdmin = false;
        localStorage.removeItem('authToken');
        localStorage.removeItem('userId');
        localStorage.removeItem('isAdmin');
    },
    
    // Admin endpoints
    async getAdminDashboard() {
        return this.request('/admin/dashboard');
    },
    
    async getAllOrders(limit = 50, offset = 0, status = null) {
        let url = `/admin/orders?limit=${limit}&offset=${offset}`;
        if (status && status !== 'all') {
            url += `&status=${status}`;
        }
        return this.request(url);
    },
    
    async updateOrderStatus(orderId, status) {
        return this.request(`/orders/${orderId}/status?status=${status}`, {
            method: 'PUT'
        });
    },
    
    async createMenuItem(itemData) {
        return this.request('/menu', {
            method: 'POST',
            body: JSON.stringify(itemData)
        });
    },
    
    async updateMenuItem(itemId, itemData) {
        return this.request(`/menu/${itemId}`, {
            method: 'PUT',
            body: JSON.stringify(itemData)
        });
    },
    
    async deleteMenuItem(itemId) {
        return this.request(`/menu/${itemId}`, {
            method: 'DELETE'
        });
    },
    
    async getAllReservations() {
        return this.request('/reservation/all');
    },
    
    async getDailyRevenue(days = 7) {
        return this.request(`/admin/revenue/daily?days=${days}`);
    },
    
    async createPaymentOrder(orderId) {
        return this.request('/payment/create-order', {
            method: 'POST',
            body: JSON.stringify({ order_id: orderId })
        });
    },
    
    async verifyPayment(paymentData) {
        return this.request('/payment/verify', {
            method: 'POST',
            body: JSON.stringify(paymentData)
        });
    }
};

// Helper function to show toast notifications
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = 'cart-toast';
    toast.style.background = type === 'error' ? '#dc3545' : '#1a1814';
    toast.innerHTML = `<i class="fas fa-${type === 'error' ? 'exclamation-circle' : 'check-circle'}" style="color: #cda45e; margin-right: 8px;"></i> ${message}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Login Modal
function showLoginPrompt() {
    const modal = document.createElement('div');
    modal.className = 'login-modal';
    modal.innerHTML = `
        <div class="login-modal-content">
            <button id="close-login" style="position: absolute; top: 10px; right: 10px; background: none; border: none; color: white; font-size: 1.5rem;">&times;</button>
            <h3 style="color: #cda45e; margin-bottom: 1.5rem;">Login to Continue</h3>
            <div id="login-step-1">
                <input type="tel" id="login-phone" placeholder="Phone Number" class="form-control mb-3">
                <button id="send-otp-btn" class="btn btn-gold w-100">Send OTP</button>
            </div>
            <div id="login-step-2" style="display: none;">
                <input type="text" id="login-otp" placeholder="Enter OTP" class="form-control mb-3">
                <button id="verify-otp-btn" class="btn btn-gold w-100">Verify & Login</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    let currentPhone = '';
    
    document.getElementById('send-otp-btn').onclick = async () => {
        const phone = document.getElementById('login-phone').value;
        if (!phone || phone.length < 10) {
            showToast('Please enter a valid phone number', 'error');
            return;
        }
        
        try {
            const response = await api.sendOTP(phone);
            currentPhone = phone;
            document.getElementById('login-step-1').style.display = 'none';
            document.getElementById('login-step-2').style.display = 'block';
            showToast(`OTP sent! Debug OTP: ${response.debug_otp}`, 'success');
        } catch (error) {
            showToast('Failed to send OTP', 'error');
        }
    };
    
    document.getElementById('verify-otp-btn').onclick = async () => {
        const otp = document.getElementById('login-otp').value;
        if (!otp) {
            showToast('Please enter OTP', 'error');
            return;
        }
        
        try {
            await api.verifyOTP(currentPhone, otp);
            showToast('Login successful!', 'success');
            modal.remove();
            if (typeof loadCartCount === 'function') loadCartCount();
            if (typeof loadUserInfo === 'function') loadUserInfo();
            if (isAdmin && window.location.pathname.includes('admin.html')) {
                location.reload();
            }
        } catch (error) {
            showToast('Invalid OTP', 'error');
        }
    };
    
    document.getElementById('close-login').onclick = () => modal.remove();
}
