let cartItems = [];
let cartSubtotal = 0;

// Load cart from localStorage or API
async function loadCart() {
    // Always load from localStorage first
    cartItems = JSON.parse(localStorage.getItem('local_cart') || '[]');
    
    // If logged in, try to merge with backend cart
    if (isAuthenticated()) {
        try {
            const response = await api.getCart();
            if (response.items && response.items.length > 0) {
                // Merge backend cart with local cart
                response.items.forEach(backendItem => {
                    const existing = cartItems.find(i => i.id === backendItem.id);
                    if (!existing) {
                        cartItems.push(backendItem);
                    }
                });
                localStorage.setItem('local_cart', JSON.stringify(cartItems));
            }
        } catch (error) {
            console.log('Using local cart');
        }
    }
    
    renderCart();
}

// Render cart items
function renderCart() {
    const container = document.getElementById('cart-items-container');
    const summary = document.getElementById('cart-summary');
    
    if (cartItems.length === 0) {
        container.innerHTML = '<div class="empty-cart"><i class="fas fa-shopping-cart fa-3x mb-3" style="color: #3a352e;"></i><p>Your cart is empty</p><a href="index.html" class="btn-outline-gold mt-3">Browse Menu</a></div>';
        summary.style.display = 'none';
        return;
    }
    
    summary.style.display = 'block';
    cartSubtotal = 0;
    
    let html = '';
    cartItems.forEach(item => {
        const itemTotal = item.price * item.quantity;
        cartSubtotal += itemTotal;
        
        html += `
            <div class="cart-item" data-id="${item.id}">
                <img src="${item.img || 'https://via.placeholder.com/100'}" class="cart-item-img" alt="${item.name}">
                <div class="cart-item-details">
                    <div class="cart-item-name">${escapeHtml(item.name)}</div>
                    <div class="cart-item-price">₹${item.price}</div>
                </div>
                <div class="d-flex align-items-center gap-3">
                    <div class="qty-control">
                        <button class="qty-btn" onclick="updateQuantity('${item.id}', -1)">−</button>
                        <span class="mx-2">${item.quantity}</span>
                        <button class="qty-btn" onclick="updateQuantity('${item.id}', 1)">+</button>
                    </div>
                    <button class="remove-item" onclick="removeItem('${item.id}')">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    document.getElementById('cart-subtotal').innerText = `₹${cartSubtotal}`;
    document.getElementById('cart-total').innerText = `₹${cartSubtotal + 40}`;
}

// Update quantity
async function updateQuantity(id, delta) {
    const item = cartItems.find(i => i.id === id);
    if (!item) return;
    
    const newQty = item.quantity + delta;
    if (newQty <= 0) {
        await removeItem(id);
        return;
    }
    
    item.quantity = newQty;
    
    if (isAuthenticated()) {
        try {
            await api.updateCartItem(id, newQty);
        } catch (error) {
            console.error('Failed to update cart:', error);
        }
    } else {
        localStorage.setItem('local_cart', JSON.stringify(cartItems));
    }
    
    renderCart();
}

// Remove item
async function removeItem(id) {
    cartItems = cartItems.filter(i => i.id !== id);
    
    if (isAuthenticated()) {
        try {
            await api.removeFromCart(id);
        } catch (error) {
            console.error('Failed to remove item:', error);
        }
    } else {
        localStorage.setItem('local_cart', JSON.stringify(cartItems));
    }
    
    renderCart();
    updateCartCount();
}

// Toggle address field based on order type
document.addEventListener('DOMContentLoaded', () => {
    loadCart();
    
    const orderTypeSelect = document.getElementById('orderType');
    const addressSection = document.getElementById('address-section');
    
    if (orderTypeSelect) {
        orderTypeSelect.addEventListener('change', (e) => {
            addressSection.style.display = e.target.value === 'delivery' ? 'block' : 'none';
        });
    }
    
    document.getElementById('checkoutBtn')?.addEventListener('click', checkout);
});

// Checkout function
async function checkout() {
    const orderType = document.getElementById('orderType').value;
    const address = document.getElementById('deliveryAddress')?.value;
    
    if (orderType === 'delivery' && !address) {
        showToast('Please enter delivery address', 'error');
        return;
    }
    
    // If not authenticated, show auth modal instead of redirecting
    if (!isAuthenticated()) {
        // Store pending checkout data
        const pendingCheckout = {
            orderType,
            address: orderType === 'delivery' ? address : null,
            items: cartItems,
            total: cartSubtotal + 40,
            timestamp: Date.now()
        };
        localStorage.setItem('pending_checkout', JSON.stringify(pendingCheckout));
        
        // Show login prompt with option to continue
        showAuthModalForCheckout();
        return;
    }
    
    // Process checkout for authenticated users
    await processCheckout(orderType, address);
}

// Process actual checkout after authentication
async function processCheckout(orderType, address) {
    try {
        const orderData = {
            items: cartItems,
            total: cartSubtotal + 40,
            order_type: orderType,
            address: orderType === 'delivery' ? address : null
        };
        
        const response = await api.createOrder(orderData);
        
        if (response.razorpay_order) {
            const options = {
                key: response.razorpay_key || 'rzp_test_YourKeyId', // Replace with your key
                amount: response.razorpay_order.amount,
                currency: "INR",
                name: "Cheesy Crust Co.",
                description: `Order #${response.order_id || 'CHEESY' + Date.now()}`,
                order_id: response.razorpay_order.id,
                handler: async function(paymentResponse) {
                    try {
                        await api.verifyPayment({
                            razorpay_payment_id: paymentResponse.razorpay_payment_id,
                            razorpay_order_id: paymentResponse.razorpay_order_id,
                            razorpay_signature: paymentResponse.razorpay_signature,
                            order_id: response.order_id
                        });
                        
                        // Clear cart on success
                        cartItems = [];
                        localStorage.removeItem('local_cart');
                        localStorage.removeItem('pending_checkout');
                        updateCartCount();
                        
                        showToast('✅ Payment successful! Order confirmed.', 'success');
                        
                        setTimeout(() => {
                            window.location.href = 'index.html';
                        }, 2000);
                    } catch (error) {
                        showToast('Payment verification failed. Please contact support.', 'error');
                    }
                },
                prefill: {
                    name: localStorage.getItem('user_name') || 'Customer',
                    contact: localStorage.getItem('user_phone') || ''
                },
                theme: { color: "#cda45e" },
                modal: {
                    ondismiss: function() {
                        showToast('Payment cancelled. Your items are still in cart.', 'info');
                    }
                }
            };
            
            const rzp = new Razorpay(options);
            rzp.open();
        } else {
            // Fallback for demo/development
            await handleDemoCheckout(orderType, address);
        }
    } catch (error) {
        console.error('Checkout error:', error);
        
        // Demo fallback if backend not ready
        await handleDemoCheckout(orderType, address);
    }
}

// Demo checkout for development
async function handleDemoCheckout(orderType, address) {
    showToast('🎉 Demo Mode: Order placed successfully!', 'success');
    
    // Save order to localStorage for demo
    const orders = JSON.parse(localStorage.getItem('cheesy_orders') || '[]');
    orders.push({
        id: 'ORD' + Date.now(),
        items: cartItems,
        total: cartSubtotal + 40,
        order_type: orderType,
        address: address,
        status: 'confirmed',
        timestamp: new Date().toISOString()
    });
    localStorage.setItem('cheesy_orders', JSON.stringify(orders));
    
    // Clear cart
    cartItems = [];
    localStorage.removeItem('local_cart');
    localStorage.removeItem('pending_checkout');
    renderCart();
    updateCartCount();
    
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 2000);
}

// Show auth modal specifically for checkout
function showAuthModalForCheckout() {
    // Create auth modal if it doesn't exist
    let authModal = document.getElementById('checkoutAuthModal');
    
    if (!authModal) {
        authModal = document.createElement('div');
        authModal.className = 'modal fade auth-modal';
        authModal.id = 'checkoutAuthModal';
        authModal.setAttribute('tabindex', '-1');
        authModal.innerHTML = `
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content" style="background: #1a1814; color: white; border: 1px solid rgba(205,164,94,0.3);">
                    <div class="modal-header" style="border-bottom: 1px solid rgba(205,164,94,0.2);">
                        <h5 class="modal-title" style="color: #cda45e;">Sign In to Complete Order</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" style="filter: invert(1);"></button>
                    </div>
                    <div class="modal-body">
                        <div id="checkoutPhoneStep">
                            <label class="form-label" style="color: #cda45e;">Phone Number</label>
                            <input type="tel" class="form-control mb-3" id="checkoutPhoneNumber" placeholder="+91 98765 43210" style="background: #0c0b09; border-color: #3a352e; color: white;">
                            <button class="btn btn-gold w-100" id="checkoutSendOtpBtn">Send OTP</button>
                        </div>
                        <div id="checkoutOtpStep" style="display: none;">
                            <label class="form-label" style="color: #cda45e;">Enter OTP</label>
                            <input type="text" class="form-control mb-3" id="checkoutOtpInput" placeholder="123456" maxlength="6" style="background: #0c0b09; border-color: #3a352e; color: white;">
                            <button class="btn btn-gold w-100" id="checkoutVerifyOtpBtn">Verify & Continue</button>
                            <button class="btn btn-outline-gold w-100 mt-2" id="checkoutBackToPhoneBtn">Back</button>
                        </div>
                        <div id="checkoutAuthMessage" class="mt-3 text-center small" style="color: #cda45e;"></div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(authModal);
        
        // Setup auth modal handlers
        setupCheckoutAuthHandlers();
    }
    
    const modal = new bootstrap.Modal(authModal);
    modal.show();
}

// Setup checkout auth handlers
function setupCheckoutAuthHandlers() {
    document.getElementById('checkoutSendOtpBtn')?.addEventListener('click', async () => {
        const phone = document.getElementById('checkoutPhoneNumber').value;
        if (!phone || phone.length < 10) {
            document.getElementById('checkoutAuthMessage').innerText = 'Please enter a valid phone number';
            return;
        }
        
        // Demo OTP - in production call API
        console.log('DEMO OTP: 123456');
        document.getElementById('checkoutAuthMessage').innerText = 'OTP sent! (Demo: 123456)';
        document.getElementById('checkoutPhoneStep').style.display = 'none';
        document.getElementById('checkoutOtpStep').style.display = 'block';
    });
    
    document.getElementById('checkoutVerifyOtpBtn')?.addEventListener('click', async () => {
        const phone = document.getElementById('checkoutPhoneNumber').value;
        const otp = document.getElementById('checkoutOtpInput').value;
        
        // Demo verification - accept any OTP or 123456
        if (otp === '123456' || otp.length === 6) {
            // Set auth token
            localStorage.setItem('auth_token', 'demo_token_' + Date.now());
            localStorage.setItem('user_phone', phone);
            localStorage.setItem('user_name', 'Customer');
            
            // Close modal
            bootstrap.Modal.getInstance(document.getElementById('checkoutAuthModal')).hide();
            
            showToast('✅ Signed in successfully!', 'success');
            
            // Process pending checkout
            const pending = JSON.parse(localStorage.getItem('pending_checkout') || '{}');
            if (pending.orderType) {
                await processCheckout(pending.orderType, pending.address);
            }
        } else {
            document.getElementById('checkoutAuthMessage').innerText = 'Invalid OTP. Try 123456';
        }
    });
    
    document.getElementById('checkoutBackToPhoneBtn')?.addEventListener('click', () => {
        document.getElementById('checkoutPhoneStep').style.display = 'block';
        document.getElementById('checkoutOtpStep').style.display = 'none';
    });
}
// Helper functions
function escapeHtml(str) {
    return String(str).replace(/[&<>]/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;'})[m] || m);
}

function updateCartCount() {
    const count = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    const badge = document.getElementById('cart-count');
    if (badge) badge.innerText = count;
}
