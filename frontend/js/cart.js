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
    
    if (!isAuthenticated()) {
        showToast('Please sign in to checkout', 'error');
        window.location.href = 'index.html';
        return;
    }
    
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
                key: response.razorpay_key,
                amount: response.razorpay_order.amount,
                currency: "INR",
                name: "Cheesy Crust Co.",
                description: `Order #${response.order_id}`,
                order_id: response.razorpay_order.id,
                handler: async function(paymentResponse) {
                    try {
                        await api.verifyPayment({
                            razorpay_payment_id: paymentResponse.razorpay_payment_id,
                            razorpay_order_id: paymentResponse.razorpay_order_id,
                            razorpay_signature: paymentResponse.razorpay_signature,
                            order_id: response.order_id
                        });
                        
                        cartItems = [];
                        localStorage.removeItem('local_cart');
                        showToast('✅ Payment successful! Order confirmed.', 'success');
                        
                        setTimeout(() => {
                            window.location.href = 'index.html';
                        }, 2000);
                    } catch (error) {
                        showToast('Payment verification failed', 'error');
                    }
                },
                prefill: {
                    name: localStorage.getItem('user_name') || '',
                    contact: localStorage.getItem('user_phone') || ''
                },
                theme: { color: "#cda45e" }
            };
            
            const rzp = new Razorpay(options);
            rzp.open();
        }
    } catch (error) {
        console.error('Checkout error:', error);
        showToast('Checkout failed. Please try again.', 'error');
    }
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
