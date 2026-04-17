// API Configuration
const API_BASE_URL = 'https://cheesy-crust-api.onrender.com'; // Update with your Render backend URL

// API Service Class
class ApiService {
    constructor() {
        this.token = localStorage.getItem('auth_token');
    }

    setToken(token) {
        this.token = token;
        localStorage.setItem('auth_token', token);
    }

    getToken() {
        return this.token;
    }

    clearToken() {
        this.token = null;
        localStorage.removeItem('auth_token');
    }

    async request(endpoint, options = {}) {
        const url = `${API_BASE_URL}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || 'Request failed');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // Auth Endpoints
    async sendOTP(phone) {
        return this.request('/auth/send-otp', {
            method: 'POST',
            body: JSON.stringify({ phone })
        });
    }

    async verifyOTP(phone, otp) {
        const response = await this.request('/auth/verify-otp', {
            method: 'POST',
            body: JSON.stringify({ phone, otp })
        });
        if (response.access_token) {
            this.setToken(response.access_token);
        }
        return response;
    }

    // Menu Endpoints
    async getMenu() {
        return this.request('/menu');
    }

    async getMenuByCategory(category) {
        return this.request(`/menu/category/${category}`);
    }

    // Cart Endpoints
    async getCart() {
        return this.request('/cart');
    }

    async addToCart(itemId, quantity = 1) {
        return this.request('/cart/add', {
            method: 'POST',
            body: JSON.stringify({ item_id: itemId, quantity })
        });
    }

    async removeFromCart(itemId) {
        return this.request('/cart/remove', {
            method: 'DELETE',
            body: JSON.stringify({ item_id: itemId })
        });
    }

    async updateCartItem(itemId, quantity) {
        return this.request('/cart/update', {
            method: 'PUT',
            body: JSON.stringify({ item_id: itemId, quantity })
        });
    }

    // Order Endpoints
    async createOrder(orderData) {
        return this.request('/orders/create', {
            method: 'POST',
            body: JSON.stringify(orderData)
        });
    }

    async getUserOrders() {
        return this.request('/orders/user');
    }

    // Payment Endpoints
    async createPaymentOrder(amount, orderId) {
        return this.request('/payment/create-order', {
            method: 'POST',
            body: JSON.stringify({ amount, order_id: orderId })
        });
    }

    async verifyPayment(paymentData) {
        return this.request('/payment/verify', {
            method: 'POST',
            body: JSON.stringify(paymentData)
        });
    }
// Profile Endpoints
async getProfile() {
    return this.request('/user/profile');
}

async updateProfile(profileData) {
    return this.request('/user/profile', {
        method: 'PUT',
        body: JSON.stringify(profileData)
    });
}

async getUserOrders() {
    return this.request('/orders/user');
}

async addReview(orderId, reviewData) {
    return this.request(`/orders/${orderId}/review`, {
        method: 'POST',
        body: JSON.stringify(reviewData)
    });
}
    // Reservation Endpoints
    async createReservation(reservationData) {
        return this.request('/reservation', {
            method: 'POST',
            body: JSON.stringify(reservationData)
        });
    }

    async getUserReservations() {
        return this.request('/reservation/user');
    }
}

// Create and export API instance
const api = new ApiService();

// Toast notification helper
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = 'toast-message';
    toast.innerHTML = `<i class="fas fa-${type === 'error' ? 'exclamation-triangle' : 'check-circle'}" style="color: var(--gold); margin-right: 8px;"></i>${message}`;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

// Update cart count in navbar
async function updateCartCount() {
    try {
        if (api.getToken()) {
            const cart = await api.getCart();
            const count = cart.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
            document.getElementById('cart-count').innerText = count;
        }
    } catch (error) {
        console.error('Failed to fetch cart count:', error);
    }
}

// Check authentication status
function isAuthenticated() {
    return !!api.getToken();
}

// Format price to INR
function formatPrice(price) {
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 0
    }).format(price).replace('₹', '₹');
}
