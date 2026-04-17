// Full Menu Data with Demo Items
const FULL_MENU = [
    // Breakfast Items
    { id: "b1", name: "Golden Cheese Croissant", category: "breakfast", price: 320, description: "Flaky layers, four artisan cheeses", img: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400" },
    { id: "b2", name: "Sunrise Breakfast Pizza", category: "breakfast", price: 450, description: "Eggs, bacon, mozzarella blend", img: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400" },
    { id: "b3", name: "Pancake Stack w/ Honey", category: "breakfast", price: 290, description: "Maple syrup & gold butter", img: "https://recipesblob.oetker.co.uk/assets/4acbec1ea07846acb27a8abc3c4d0738/1680x580/american-pancakes-v1.webp?w=400" },
    { id: "b4", name: "Belgian Waffle", category: "breakfast", price: 310, description: "Maple syrup, fresh berries", img: "https://images.unsplash.com/photo-1562376552-0d160a2f238d?w=400" },
    
    // Lunch Items
    { id: "l1", name: "Truffle Mushroom Pasta", category: "lunch", price: 540, description: "Creamy parmesan, truffle oil", img: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=400" },
    { id: "l2", name: "Spicy Peri-Peri Chicken", category: "lunch", price: 620, description: "Grilled with herbed rice", img: "https://images.unsplash.com/photo-1587593810167-a84920ea0781?w=400" },
    { id: "l3", name: "Margherita Classica", category: "lunch", price: 480, description: "San Marzano, basil, gold olive oil", img: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400" },
    { id: "l4", name: "Classic Cheeseburger", category: "lunch", price: 380, description: "Angus beef, aged cheddar", img: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400" },
    { id: "l5", name: "Garlic Bread Supreme", category: "lunch", price: 210, description: "Cheese & herbs butter", img: "https://images.unsplash.com/photo-1573140400632-3a160b144b5c?w=400" },
    
    // Dinner Items
    { id: "d1", name: "Cheesy Crust Signature", category: "dinner", price: 890, description: "Double cheese, pepperoni, jalapeños", img: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400" },
    { id: "d2", name: "Filet Mignon Steak", category: "dinner", price: 1490, description: "Garlic butter & mashed potatoes", img: "https://images.unsplash.com/photo-1544025162-d76694265947?w=400" },
    { id: "d3", name: "Seafood Risotto", category: "dinner", price: 1120, description: "Prawns, squid, saffron risotto", img: "https://images.unsplash.com/photo-1534080564583-6be75777b70a?w=400" },
    { id: "d4", name: "Grilled Chicken Steak", category: "dinner", price: 720, description: "Mashed potatoes & veggies", img: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400" },
    { id: "d5", name: "Pepperoni Pizza", category: "dinner", price: 560, description: "Spicy pepperoni, mozzarella", img: "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400" },
    { id: "d6", name: "Tiramisu", category: "dinner", price: 290, description: "Classic Italian dessert", img: "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400" }
];

// Reservation state
let reservationState = {
    name: "",
    phone: "",
    date: "",
    time: "",
    guests: "4",
    specialRequests: "",
    preorderItems: []
};

// Render menu cards on main page
function renderMenuCards(filterCategory = "all") {
    const container = document.getElementById("menu-items-container");
    if (!container) return;
    
    let filtered = filterCategory === "all" ? FULL_MENU : FULL_MENU.filter(item => item.category === filterCategory);
    let html = "";
    
    filtered.forEach((item, index) => {
        html += `
            <div class="col-sm-6 col-md-4 col-lg-4 menu-col" data-aos="fade-up" data-aos-delay="${index * 100}">
                <div class="menu-card">
                    <img src="${item.img}" class="menu-img" alt="${item.name}" loading="lazy">
                    <div class="d-flex justify-content-between align-items-center">
                        <h5 class="menu-title">${escapeHtml(item.name)}</h5>
                        <span class="menu-price">₹${item.price}</span>
                    </div>
                    <p class="small text-secondary mt-2">${escapeHtml(item.description)}</p>
                    <div class="d-flex justify-content-between align-items-center mt-3">
                        <span><i class="fas fa-star gold-icon"></i> ${item.category === 'breakfast' ? 'Morning Delight' : item.category === 'lunch' ? 'Chef\'s Lunch' : 'Evening Special'}</span>
                        <button class="btn-add add-to-cart-btn" 
    data-id="${item.id}" 
    data-name="${item.name}" 
    data-price="${item.price}"
    data-img="${item.img}">Add to Cart</button>
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    // Attach event listeners to Add to Cart buttons
document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
        const id = btn.getAttribute('data-id');
        const name = btn.getAttribute('data-name');
        const price = btn.getAttribute('data-price');
        const img = btn.getAttribute('data-img') || 'https://via.placeholder.com/100';
        
        // NO LOGIN CHECK HERE - Direct add to localStorage
        let cart = JSON.parse(localStorage.getItem('local_cart') || '[]');
        const existing = cart.find(i => i.id === id);
        
        if (existing) {
            existing.quantity++;
        } else {
            cart.push({ 
                id, 
                name, 
                price: parseFloat(price), 
                img,
                quantity: 1 
            });
        }
        
        localStorage.setItem('local_cart', JSON.stringify(cart));
        updateLocalCartCount();
        showToast(`${name} added to cart!`);
        
        // Optional: Sync with backend if logged in (silent background sync)
        if (isAuthenticated()) {
            try {
                await api.addToCart(id);
            } catch (error) {
                console.log('Background sync failed, item saved locally');
            }
        }
    });
});
}

// Update local cart count
function updateLocalCartCount() {
    const cart = JSON.parse(localStorage.getItem('local_cart') || '[]');
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    document.getElementById('cart-count').innerText = count;
}

// Escape HTML helper
function escapeHtml(str) {
    return String(str).replace(/[&<>]/g, function(m) {
        if (m === '&') return '&amp;';
        if (m === '<') return '&lt;';
        if (m === '>') return '&gt;';
        return m;
    });
}

// ========== RESERVATION SYSTEM ==========

// Update pre-order badge
function updatePreorderBadge() {
    const totalQty = reservationState.preorderItems.reduce((acc, i) => acc + i.quantity, 0);
    const badgeSpan = document.getElementById("preorderBadge");
    if (badgeSpan) badgeSpan.innerText = totalQty;
}

// Render preorder list in tab 2
function renderPreorderList() {
    const container = document.getElementById("preorderItemsContainer");
    if (!container) return;
    
    if (!reservationState.preorderItems.length) {
        container.innerHTML = `<div class="empty-preorder"><i class="fas fa-shopping-bag fa-2x mb-2"></i><p>Your pre-order basket is empty. Browse the menu to add items!</p></div>`;
        document.getElementById("preorderSubtotal").innerText = `₹0`;
        return;
    }

    let subtotal = 0;
    let html = "";
    reservationState.preorderItems.forEach((item) => {
        const itemTotal = item.price * item.quantity;
        subtotal += itemTotal;
        html += `
            <div class="preorder-item-card" data-id="${item.id}">
                <div class="item-info">
                    <h6>${escapeHtml(item.name)}</h6>
                    <small>₹${item.price} each</small>
                </div>
                <div style="display: flex; align-items: center; gap: 12px;">
                    <div class="qty-control">
                        <button class="qty-btn" data-id="${item.id}" data-delta="-1">−</button>
                        <span style="min-width: 32px; text-align:center;">${item.quantity}</span>
                        <button class="qty-btn" data-id="${item.id}" data-delta="1">+</button>
                    </div>
                    <button class="remove-item" data-id="${item.id}"><i class="fas fa-trash-alt"></i> Remove</button>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    document.getElementById("preorderSubtotal").innerText = `₹${subtotal}`;

    // Attach event listeners
    container.querySelectorAll(".qty-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const id = btn.getAttribute("data-id");
            const delta = parseInt(btn.getAttribute("data-delta"));
            updatePreorderQuantity(id, delta);
        });
    });
    
    container.querySelectorAll(".remove-item").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const id = btn.getAttribute("data-id");
            removePreorderItemById(id);
        });
    });
}

// Update preorder item quantity
function updatePreorderQuantity(id, delta) {
    const itemIndex = reservationState.preorderItems.findIndex(i => i.id === id);
    if (itemIndex !== -1) {
        const newQty = reservationState.preorderItems[itemIndex].quantity + delta;
        if (newQty <= 0) {
            reservationState.preorderItems.splice(itemIndex, 1);
            showToast("Item removed", "info");
        } else {
            reservationState.preorderItems[itemIndex].quantity = newQty;
        }
    }
    updatePreorderBadge();
    renderPreorderList();
}

// Remove preorder item
function removePreorderItemById(id) {
    reservationState.preorderItems = reservationState.preorderItems.filter(i => i.id !== id);
    updatePreorderBadge();
    renderPreorderList();
    showToast("Item removed from pre-order", "info");
}

// Add to preorder
function addToPreorder(menuItem) {
    const existing = reservationState.preorderItems.find(i => i.id === menuItem.id);
    if (existing) {
        existing.quantity += 1;
    } else {
        reservationState.preorderItems.push({
            id: menuItem.id,
            name: menuItem.name,
            price: menuItem.price,
            quantity: 1
        });
    }
    updatePreorderBadge();
    renderPreorderList();
    showToast(`${menuItem.name} added to pre-order ✓`, "success");
}

// Browse menu modal
function openMenuModal() {
    const modalDiv = document.createElement("div");
    modalDiv.className = "modal-overlay";
    modalDiv.innerHTML = `
        <div class="modal-container">
            <div style="display:flex; justify-content:space-between; margin-bottom:1rem;">
                <h3 style="color:var(--gold);"><i class="fas fa-utensils"></i> Our signature menu</h3>
                <button id="closeModalBtn" style="background:none; border:none; color:white; font-size:1.8rem;">&times;</button>
            </div>
            <div class="menu-grid" id="modalMenuGrid"></div>
        </div>
    `;
    document.body.appendChild(modalDiv);

    function renderModalMenu() {
        const grid = modalDiv.querySelector("#modalMenuGrid");
        if (!grid) return;
        let menuHtml = "";
        FULL_MENU.forEach(item => {
            menuHtml += `
                <div class="menu-item-card" data-id="${item.id}" data-name="${escapeHtml(item.name)}" data-price="${item.price}">
                    <div><strong>${escapeHtml(item.name)}</strong></div>
                    <div class="item-price mt-1">₹${item.price}</div>
                    <small>${escapeHtml(item.description)}</small>
                    <div class="mt-2"><i class="fas fa-plus-circle" style="color:var(--gold);"></i> Add to pre-order</div>
                </div>
            `;
        });
        grid.innerHTML = menuHtml;
        
        grid.querySelectorAll(".menu-item-card").forEach(card => {
            card.addEventListener("click", () => {
                const id = card.getAttribute("data-id");
                const name = card.getAttribute("data-name");
                const price = parseInt(card.getAttribute("data-price"));
                addToPreorder({ id, name, price });
                modalDiv.remove();
            });
        });
    }
    
    renderModalMenu();
    
    const closeBtn = modalDiv.querySelector("#closeModalBtn");
    closeBtn.addEventListener("click", () => modalDiv.remove());
    modalDiv.addEventListener("click", (e) => { if(e.target === modalDiv) modalDiv.remove(); });
}

// Update summary panel
function updateSummaryPanel() {
    reservationState.name = document.getElementById("fullName")?.value || "";
    reservationState.phone = document.getElementById("resPhone")?.value || "";
    reservationState.date = document.getElementById("resDate")?.value || "";
    reservationState.time = document.getElementById("resTime")?.value || "";
    reservationState.guests = document.getElementById("guestsCount")?.value || "4";
    reservationState.specialRequests = document.getElementById("specialRequests")?.value || "";

    const detailsDiv = document.getElementById("summaryDetailsDisplay");
    if(detailsDiv) {
        detailsDiv.innerHTML = `
            <div class="summary-row"><span>👤 Name</span><span>${escapeHtml(reservationState.name) || "—"}</span></div>
            <div class="summary-row"><span>📞 Phone</span><span>${escapeHtml(reservationState.phone) || "—"}</span></div>
            <div class="summary-row"><span>📅 Date</span><span>${escapeHtml(reservationState.date) || "—"}</span></div>
            <div class="summary-row"><span>⏰ Time</span><span>${escapeHtml(reservationState.time) || "—"}</span></div>
            <div class="summary-row"><span>👥 Guests</span><span>${reservationState.guests}</span></div>
            ${reservationState.specialRequests ? `<div class="summary-row"><span>✨ Special requests</span><span>${escapeHtml(reservationState.specialRequests)}</span></div>` : ''}
        `;
    }
    
    const preorderSummaryDiv = document.getElementById("summaryPreorderList");
    let subtotal = 0;
    if (reservationState.preorderItems.length === 0) {
        preorderSummaryDiv.innerHTML = "<p class='text-muted'>No pre-ordered items.</p>";
    } else {
        let itemsHtml = `<ul style="list-style:none; padding-left:0;">`;
        reservationState.preorderItems.forEach(item => {
            const total = item.price * item.quantity;
            subtotal += total;
            itemsHtml += `<li style="margin-bottom:8px;">🍽️ ${escapeHtml(item.name)} x ${item.quantity} = <strong>₹${total}</strong></li>`;
        });
        itemsHtml += `</ul>`;
        preorderSummaryDiv.innerHTML = itemsHtml;
    }
    document.getElementById("summaryTotalAmount").innerText = `₹${subtotal}`;
}

// Validate reservation
function validateReservation() {
    const name = document.getElementById("fullName")?.value.trim();
    const phone = document.getElementById("resPhone")?.value.trim();
    const date = document.getElementById("resDate")?.value;
    const time = document.getElementById("resTime")?.value;
    
    if (!name || !phone || !date || !time) {
        showToast("Please fill all required fields (name, phone, date, time)", "error");
        return false;
    }
    if (phone.length < 9) {
        showToast("Enter a valid phone number", "error");
        return false;
    }
    const today = new Date().toISOString().split('T')[0];
    if (date < today) {
        showToast("Reservation date cannot be in the past", "error");
        return false;
    }
    return true;
}

// Process payment with Razorpay
async function processPayment() {
    updateSummaryPanel();
    
    const totalAmount = reservationState.preorderItems.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    
    if (totalAmount === 0) {
        // No pre-order items, just confirm reservation
        await confirmReservationWithoutPayment();
        return;
    }
    
    try {
        // Create order on backend
        const orderData = {
            amount: totalAmount,
            reservation: reservationState
        };
        
        const response = await api.createReservation(orderData);
        
        if (response.razorpay_order) {
            // Open Razorpay checkout
            const options = {
                key: response.razorpay_key,
                amount: response.razorpay_order.amount,
                currency: "INR",
                name: "Cheesy Crust Co.",
                description: `Table Reservation - ${reservationState.date} ${reservationState.time}`,
                order_id: response.razorpay_order.id,
                handler: async function(paymentResponse) {
                    try {
                        // Verify payment
                        await api.verifyPayment({
                            razorpay_payment_id: paymentResponse.razorpay_payment_id,
                            razorpay_order_id: paymentResponse.razorpay_order_id,
                            razorpay_signature: paymentResponse.razorpay_signature,
                            reservation_id: response.reservation_id
                        });
                        
                        showToast("✅ Payment successful! Reservation confirmed.", "success");
                        resetReservationForm();
                        switchTab("details");
                    } catch (error) {
                        showToast("Payment verification failed. Please contact support.", "error");
                    }
                },
                prefill: {
                    name: reservationState.name,
                    contact: reservationState.phone
                },
                theme: {
                    color: "#cda45e"
                },
                modal: {
                    ondismiss: function() {
                        showToast("Payment cancelled", "info");
                    }
                }
            };
            
            const rzp = new Razorpay(options);
            rzp.open();
        }
    } catch (error) {
        console.error("Payment error:", error);
        showToast("Payment failed. Please try again.", "error");
    }
}

// Confirm reservation without payment
async function confirmReservationWithoutPayment() {
    try {
        const response = await api.createReservation(reservationState);
        showToast(`✅ Reservation confirmed for ${reservationState.name} on ${reservationState.date} at ${reservationState.time}`, "success");
        resetReservationForm();
        switchTab("details");
    } catch (error) {
        // Fallback to localStorage
        const allReservations = JSON.parse(localStorage.getItem("cheesy_reservations") || "[]");
        allReservations.push({
            id: Date.now(),
            ...reservationState,
            status: "confirmed",
            timestamp: new Date().toISOString()
        });
        localStorage.setItem("cheesy_reservations", JSON.stringify(allReservations));
        showToast(`✅ Reservation confirmed!`, "success");
        resetReservationForm();
        switchTab("details");
    }
}

// Reset reservation form
function resetReservationForm() {
    document.getElementById("fullName").value = "";
    document.getElementById("resPhone").value = "";
    document.getElementById("resDate").value = "";
    document.getElementById("resTime").value = "";
    document.getElementById("guestsCount").value = "4";
    document.getElementById("specialRequests").value = "";
    reservationState = {
        name: "", phone: "", date: "", time: "", guests: "4", specialRequests: "",
        preorderItems: []
    };
    renderPreorderList();
    updatePreorderBadge();
}

// Tab switching
function switchTab(tabId) {
    document.querySelectorAll(".tab-pane").forEach(pane => pane.classList.remove("active-pane"));
    document.getElementById(`tab-${tabId}`).classList.add("active-pane");
    
    document.querySelectorAll(".res-tab").forEach(tab => {
        tab.classList.remove("active");
        if (tab.getAttribute("data-tab") === tabId) tab.classList.add("active");
    });
    
    if (tabId === "summary") updateSummaryPanel();
    if (tabId === "preorder") renderPreorderList();
}

// Auth Modal Handlers
function initAuthModal() {
    const authModal = new bootstrap.Modal(document.getElementById('authModal'));
    
    document.getElementById('userIcon').addEventListener('click', () => {
        if (isAuthenticated()) {
            showToast('You are already signed in');
        } else {
            authModal.show();
        }
    });
    
    document.getElementById('sendOtpBtn').addEventListener('click', async () => {
        const phone = document.getElementById('phoneNumber').value;
        if (!phone || phone.length < 10) {
            document.getElementById('authMessage').innerText = 'Please enter a valid phone number';
            return;
        }
        
        try {
            await api.sendOTP(phone);
            document.getElementById('authMessage').innerText = 'OTP sent successfully! (Check console for OTP)';
            document.getElementById('phoneStep').style.display = 'none';
            document.getElementById('otpStep').style.display = 'block';
        } catch (error) {
            document.getElementById('authMessage').innerText = 'Failed to send OTP';
        }
    });
    
    document.getElementById('verifyOtpBtn').addEventListener('click', async () => {
        const phone = document.getElementById('phoneNumber').value;
        const otp = document.getElementById('otpInput').value;
        
        try {
            await api.verifyOTP(phone, otp);
            document.getElementById('otpStep').style.display = 'none';
            document.getElementById('authSuccess').style.display = 'block';
            await updateCartCount();
            
            setTimeout(() => {
                authModal.hide();
                document.getElementById('phoneStep').style.display = 'block';
                document.getElementById('otpStep').style.display = 'none';
                document.getElementById('authSuccess').style.display = 'none';
                document.getElementById('phoneNumber').value = '';
                document.getElementById('otpInput').value = '';
            }, 1500);
        } catch (error) {
            document.getElementById('authMessage').innerText = 'Invalid OTP';
        }
    });
    
    document.getElementById('backToPhoneBtn').addEventListener('click', () => {
        document.getElementById('phoneStep').style.display = 'block';
        document.getElementById('otpStep').style.display = 'none';
    });
}

// Initialize everything
document.addEventListener('DOMContentLoaded', () => {
    // Menu
    renderMenuCards('all');
    
    // Menu filters
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            renderMenuCards(this.getAttribute('data-filter'));
        });
    });
    
    // Auth
    initAuthModal();
    
    // Reservation tab switching
    document.querySelectorAll(".res-tab").forEach(btn => {
        btn.addEventListener("click", (e) => {
            const tabVal = btn.getAttribute("data-tab");
            switchTab(tabVal);
        });
    });
    
    // Reservation navigation buttons
    document.getElementById("nextToPreorderBtn")?.addEventListener("click", () => {
        if (validateReservation()) {
            switchTab("preorder");
        }
    });
    
    document.getElementById("backToDetailsBtn")?.addEventListener("click", () => switchTab("details"));
    document.getElementById("goToSummaryBtn")?.addEventListener("click", () => switchTab("summary"));
    document.getElementById("backToPreorderSummaryBtn")?.addEventListener("click", () => switchTab("preorder"));
    document.getElementById("confirmAndPayBtn")?.addEventListener("click", processPayment);
    document.getElementById("browseMenuBtn")?.addEventListener("click", openMenuModal);
    
    // Cart count
    updateLocalCartCount();
    if (isAuthenticated()) {
        updateCartCount();
    }
    
    // Set min date for date picker
    const datePicker = document.getElementById("resDate");
    if(datePicker) datePicker.min = new Date().toISOString().split("T")[0];
});
