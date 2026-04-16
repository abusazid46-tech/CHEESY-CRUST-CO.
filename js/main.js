// Initialize AOS
AOS.init({ duration: 1000, once: true, offset: 100 });

// Preloader
window.addEventListener('load', function() {
    const preloader = document.getElementById('preloader');
    setTimeout(() => {
        preloader.style.opacity = '0';
        setTimeout(() => {
            preloader.style.display = 'none';
        }, 500);
    }, 800);
});

// Cart count
let currentCart = { items: [], total: 0 };

async function loadCartCount() {
    try {
        const cart = await api.getCart();
        currentCart = cart;
        const itemCount = cart.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
        const cartBadge = document.getElementById('cart-count');
        if (cartBadge) cartBadge.innerText = itemCount;
    } catch (error) {
        console.error('Failed to load cart:', error);
    }
}

// Add to cart function
async function addToCart(menuItemId, itemName, price) {
    if (!authToken) {
        showLoginPrompt();
        return;
    }
    
    try {
        await api.addToCart(menuItemId);
        await loadCartCount();
        showToast(`Added: ${itemName} - ${price}`);
    } catch (error) {
        showToast('Failed to add to cart', 'error');
    }
}

// Render menu from API
async function renderMenuFromAPI(category = 'all') {
    const container = document.getElementById("menu-items-container");
    if (!container) return;
    
    try {
        const menuItems = await api.getMenu(category);
        
        if (!menuItems || menuItems.length === 0) {
            container.innerHTML = '<div class="col-12 text-center"><p>No menu items available</p></div>';
            return;
        }
        
        let html = "";
        menuItems.forEach((item, index) => {
            html += `
                <div class="col-sm-6 col-md-4 col-lg-4 menu-col" data-aos="fade-up" data-aos-delay="${index * 100}">
                    <div class="menu-card">
                        <img src="${item.image_url}" class="menu-img" alt="${item.name}" loading="lazy" onerror="this.src='https://via.placeholder.com/400x200?text=Food+Image'">
                        <div class="d-flex justify-content-between align-items-center">
                            <h5 class="menu-title">${item.name}</h5>
                            <span class="menu-price">${item.original_price}</span>
                        </div>
                        <p class="small text-secondary mt-2">${item.description}</p>
                        <div class="d-flex justify-content-between align-items-center mt-3">
                            <span><i class="fas fa-star gold-icon"></i> ${item.category === 'breakfast' ? 'Morning Delight' : item.category === 'lunch' ? 'Chef’s Lunch' : 'Evening Special'}</span>
                            <button class="btn-add add-to-order-btn" data-id="${item._id}" data-name="${item.name}" data-price="${item.original_price}">Add to Order</button>
                        </div>
                    </div>
                </div>
            `;
        });
        container.innerHTML = html;
        
        // Attach event listeners
        document.querySelectorAll('.add-to-order-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = btn.getAttribute('data-id');
                const name = btn.getAttribute('data-name');
                const price = btn.getAttribute('data-price');
                addToCart(id, name, price);
            });
        });
    } catch (error) {
        console.error('Failed to load menu:', error);
        container.innerHTML = '<div class="col-12 text-center"><p>Failed to load menu. Please try again later.</p></div>';
    }
}

// Filter functionality
function initMenuFilters() {
    const filterBtns = document.querySelectorAll('.filter-btn');
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            filterBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            renderMenuFromAPI(this.getAttribute('data-filter'));
        });
    });
    renderMenuFromAPI('all');
}

// Reservation form with pre-order
let preOrderItems = [];

function renderPreOrderItems(container) {
    if (!container) return;
    
    if (preOrderItems.length === 0) {
        container.innerHTML = '<p class="text-muted small">No items pre-ordered yet</p>';
        return;
    }
    
    let html = '<div class="list-group mt-2">';
    preOrderItems.forEach((item, index) => {
        html += `
            <div class="list-group-item" style="background: #2a2621; color: white; margin-bottom: 0.5rem; padding: 0.5rem; border: 1px solid #cda45e;">
                <div class="d-flex justify-content-between align-items-center">
                    <span>${item.name} x ${item.quantity}</span>
                    <button type="button" class="btn-remove-preorder btn btn-sm btn-danger" data-index="${index}">Remove</button>
                </div>
            </div>
        `;
    });
    html += '</div>';
    container.innerHTML = html;
    
    document.querySelectorAll('.btn-remove-preorder').forEach(btn => {
        btn.onclick = () => {
            const idx = parseInt(btn.getAttribute('data-index'));
            preOrderItems.splice(idx, 1);
            renderPreOrderItems(container);
        };
    });
}

async function addPreOrderItem() {
    const menu = await api.getMenu();
    const modal = document.createElement('div');
    modal.className = 'login-modal';
    modal.innerHTML = `
        <div class="login-modal-content">
            <button class="close-preorder-modal" style="position: absolute; top: 10px; right: 10px; background: none; border: none; color: white; font-size: 1.5rem;">&times;</button>
            <h4 style="color: #cda45e;">Select Menu Item</h4>
            <select id="item-select" class="form-control my-3">
                ${menu.map(item => `<option value="${item._id}">${item.name} - ${item.original_price}</option>`).join('')}
            </select>
            <input type="number" id="item-quantity" class="form-control my-3" placeholder="Quantity" value="1" min="1">
            <div class="d-flex gap-2">
                <button id="confirm-preorder" class="btn btn-gold">Add</button>
                <button id="cancel-preorder" class="btn btn-outline-gold">Cancel</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    
    document.getElementById('confirm-preorder').onclick = () => {
        const select = document.getElementById('item-select');
        const itemId = select.value;
        const itemName = select.options[select.selectedIndex].text.split(' - ')[0];
        const quantity = parseInt(document.getElementById('item-quantity').value);
        
        preOrderItems.push({
            menu_item_id: itemId,
            name: itemName,
            quantity: quantity
        });
        const container = document.getElementById('preorder-items-container');
        renderPreOrderItems(container);
        modal.remove();
    };
    
    document.getElementById('cancel-preorder').onclick = () => modal.remove();
    modal.querySelector('.close-preorder-modal').onclick = () => modal.remove();
}

function initReservationForm() {
    const form = document.getElementById('bookingForm');
    if (!form) return;
    
    // Add pre-order section
    const preOrderDiv = document.createElement('div');
    preOrderDiv.className = 'mt-3';
    preOrderDiv.innerHTML = `
        <label class="form-label">Pre-order Menu Items (Optional)</label>
        <div id="preorder-items-container"></div>
        <button type="button" id="add-preorder-item" class="btn btn-sm btn-outline-gold mt-2">+ Add Item</button>
    `;
    form.querySelector('.row.g-3').appendChild(preOrderDiv);
    
    const container = document.getElementById('preorder-items-container');
    renderPreOrderItems(container);
    
    document.getElementById('add-preorder-item').onclick = addPreOrderItem;
    
    form.onsubmit = async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('resName')?.value.trim();
        const phone = document.getElementById('resPhone')?.value.trim();
        const date = document.getElementById('resDate')?.value;
        const time = document.getElementById('resTime')?.value;
        const guestsSelect = document.getElementById('resGuests')?.value;
        const guests = parseInt(guestsSelect) || 1;
        
        if (!name || !phone || !date || !time) {
            document.getElementById('formMessage').innerHTML = "⚠️ Please fill in all required fields.";
            return;
        }
        
        if (!authToken) {
            showLoginPrompt();
            return;
        }
        
        try {
            await api.createReservation({
                name,
                phone,
                date,
                time,
                guests,
                pre_order_items: preOrderItems
            });
            
            document.getElementById('formMessage').innerHTML = `✅ Thanks ${name}, your table for ${guests} on ${date} at ${time} is booked! We'll send you a confirmation.`;
            form.reset();
            preOrderItems = [];
            renderPreOrderItems(container);
            
            setTimeout(() => {
                document.getElementById('formMessage').innerHTML = "";
            }, 4000);
        } catch (error) {
            document.getElementById('formMessage').innerHTML = "❌ Failed to book reservation. Please try again.";
        }
    };
}

// Navbar scroll effect
function handleNavbarScroll() {
    const navbar = document.getElementById('mainNav');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
}

// Back to top button
function initBackToTop() {
    const btn = document.getElementById('backToTop');
    if (!btn) return;
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            btn.style.display = 'block';
        } else {
            btn.style.display = 'none';
        }
    });
    btn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// Smooth scroll
function smoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href === "#" || href === "") return;
            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
}

// Load user info in navbar
function loadUserInfo() {
    const navbar = document.querySelector('.navbar-nav');
    if (!navbar) return;
    
    // Remove existing user elements
    const existingUser = document.getElementById('user-nav-item');
    if (existingUser) existingUser.remove();
    
    if (authToken) {
        const userLi = document.createElement('li');
        userLi.id = 'user-nav-item';
        userLi.className = 'nav-item dropdown';
        userLi.innerHTML = `
            <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown">
                <i class="fas fa-user"></i> Account
            </a>
            <ul class="dropdown-menu dropdown-menu-dark">
                <li><a class="dropdown-item" href="#" id="myOrdersLink">My Orders</a></li>
                <li><a class="dropdown-item" href="#" id="myReservationsLink">My Reservations</a></li>
                <li><hr class="dropdown-divider"></li>
                <li><a class="dropdown-item" href="#" id="logoutNavBtn">Logout</a></li>
            </ul>
        `;
        navbar.appendChild(userLi);
        
        document.getElementById('logoutNavBtn').onclick = (e) => {
            e.preventDefault();
            api.logout();
            location.reload();
        };
        
        if (isAdmin) {
            const adminLi = document.createElement('li');
            adminLi.className = 'nav-item';
            adminLi.innerHTML = '<a class="nav-link" href="admin.html" target="_blank"><i class="fas fa-chart-line"></i> Admin</a>';
            navbar.appendChild(adminLi);
        }
    } else {
        const loginLi = document.createElement('li');
        loginLi.id = 'user-nav-item';
        loginLi.className = 'nav-item';
        loginLi.innerHTML = '<a class="nav-link" href="#" id="loginNavBtn"><i class="fas fa-sign-in-alt"></i> Login</a>';
        navbar.appendChild(loginLi);
        document.getElementById('loginNav
