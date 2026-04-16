let currentPage = 'dashboard';
let revenueChart = null;

// Check admin access
async function checkAdminAccess() {
    if (!authToken || !isAdmin) {
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

// Load dashboard
async function loadDashboard() {
    try {
        const stats = await api.getAdminDashboard();
        
        document.getElementById('todayOrders').innerText = stats.today_orders || 0;
        document.getElementById('todayRevenue').innerHTML = `₹${(stats.today_revenue || 0).toFixed(2)}`;
        document.getElementById('totalOrders').innerText = stats.total_orders || 0;
        document.getElementById('todayReservations').innerText = stats.today_reservations || 0;
        document.getElementById('pendingCount').innerText = stats.pending_orders || 0;
        document.getElementById('reservationCount').innerText = stats.today_reservations || 0;
        
        // Load recent orders
        const orders = await api.getAllOrders(5, 0);
        const recentOrdersHtml = orders.orders.map(order => `
            <tr>
                <td>#${order._id.slice(-6)}</td>
                <td>₹${order.total}</td>
                <td><span class="status-badge status-${order.order_status}">${order.order_status}</span></td>
                <td><button class="btn btn-sm btn-outline-gold view-order" data-id="${order._id}">View</button></td>
            </tr>
        `).join('');
        document.getElementById('recentOrders').innerHTML = recentOrdersHtml || '<tr><td colspan="4" class="text-center">No orders found</td></tr>';
        
        // Add view order handlers
        document.querySelectorAll('.view-order').forEach(btn => {
            btn.onclick = () => viewOrderDetails(btn.getAttribute('data-id'));
        });
    } catch (error) {
        console.error('Failed to load dashboard:', error);
    }
}

// Load orders
async function loadOrders(status = 'all') {
    try {
        const orders = await api.getAllOrders(100, 0, status);
        const ordersHtml = orders.orders.map(order => `
            <tr>
                <td>#${order._id.slice(-6)}</td>
                <td>${order.user_id?.slice(-6) || 'Guest'}</td>
                <td>${order.items?.length || 0} items</td>
                <td>₹${order.total}</td>
                <td><span class="badge bg-info">${order.order_type}</span></td>
                <td>
                    <select class="form-select form-select-sm status-update" data-id="${order._id}" style="width: auto; display: inline-block;">
                        <option value="pending" ${order.order_status === 'pending' ? 'selected' : ''}>Pending</option>
                        <option value="confirmed" ${order.order_status === 'confirmed' ? 'selected' : ''}>Confirmed</option>
                        <option value="preparing" ${order.order_status === 'preparing' ? 'selected' : ''}>Preparing</option>
                        <option value="ready" ${order.order_status === 'ready' ? 'selected' : ''}>Ready</option>
                        <option value="out_for_delivery" ${order.order_status === 'out_for_delivery' ? 'selected' : ''}>Out for Delivery</option>
                        <option value="delivered" ${order.order_status === 'delivered' ? 'selected' : ''}>Delivered</option>
                        <option value="cancelled" ${order.order_status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                    </select>
                </td>
                <td><button class="btn btn-sm btn-outline-gold view-order" data-id="${order._id}">Details</button></td>
            </tr>
        `).join('');
        document.getElementById('allOrdersList').innerHTML = ordersHtml || '<tr><td colspan="7" class="text-center">No orders found</td></tr>';
        
        // Add status update handlers
        document.querySelectorAll('.status-update').forEach(select => {
            select.onchange = async () => {
                const orderId = select.getAttribute('data-id');
                const newStatus = select.value;
                await api.updateOrderStatus(orderId, newStatus);
                showToast(`Order status updated to ${newStatus}`, 'success');
                loadOrders(status);
            };
        });
        
        document.querySelectorAll('.view-order').forEach(btn => {
            btn.onclick = () => viewOrderDetails(btn.getAttribute('data-id'));
        });
    } catch (error) {
        console.error('Failed to load orders:', error);
    }
}

// View order details modal
async function viewOrderDetails(orderId) {
    try {
        const order = await api.getOrderDetails(orderId);
        const modal = document.createElement('div');
        modal.className = 'login-modal';
        modal.innerHTML = `
            <div class="login-modal-content" style="max-width: 600px;">
                <button class="close-modal" style="position: absolute; top: 10px; right: 10px; background: none; border: none; color: white; font-size: 1.5rem;">&times;</button>
                <h4 style="color: var(--gold);">Order Details #${order._id.slice(-6)}</h4>
                <hr style="border-color: rgba(205,164,94,0.3);">
                <p><strong>Order Type:</strong> ${order.order_type}</p>
                <p><strong>Status:</strong> <span class="status-badge status-${order.order_status}">${order.order_status}</span></p>
                <p><strong>Payment Status:</strong> ${order.payment_status}</p>
                ${order.address ? `<p><strong>Delivery Address:</strong> ${order.address}</p>` : ''}
                <h5 style="color: var(--gold); margin-top: 1rem;">Items:</h5>
                <div class="table-responsive">
                    <table class="table table-custom">
                        <thead><tr><th>Item</th><th>Quantity</th><th>Price</th><th>Total</th></tr></thead>
                        <tbody>
                            ${order.items.map(item => `
                                <tr>
                                    <td>${item.name}</td>
                                    <td>${item.quantity}</td>
                                    <td>₹${item.price}</td>
                                    <td>₹${item.price * item.quantity}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                        <tfoot>
                            <tr><td colspan="3"><strong>Total</strong></td><td><strong>₹${order.total}</strong></td></tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.querySelector('.close-modal').onclick = () => modal.remove();
    } catch (error) {
        showToast('Failed to load order details', 'error');
    }
}

// Load menu items
async function loadMenuItems() {
    try {
        const menuItems = await api.getMenu();
        const menuHtml = menuItems.map(item => `
            <tr>
                <td><img src="${item.image_url}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 8px;" onerror="this.src='https://via.placeholder.com/50'"></td>
                <td>${item.name}</td>
                <td>${item.category}</td>
                <td>${item.original_price}</td>
                <td><span class="badge ${item.is_available ? 'bg-success' : 'bg-danger'}">${item.is_available ? 'Available' : 'Unavailable'}</span></td>
                <td>
                    <button class="btn btn-sm btn-outline-gold edit-menu" data-id="${item._id}">Edit</button>
                    <button class="btn btn-sm btn-danger delete-menu" data-id="${item._id}">Delete</button>
                </td>
            </tr>
        `).join('');
        document.getElementById('menuItemsList').innerHTML = menuHtml || '<tr><td colspan="6" class="text-center">No menu items found</td></tr>';
        
        document.querySelectorAll('.edit-menu').forEach(btn => {
            btn.onclick = () => editMenuItem(btn.getAttribute('data-id'));
        });
        
        document.querySelectorAll('.delete-menu').forEach(btn => {
            btn.onclick = async () => {
                if (confirm('Are you sure you want to delete this item?')) {
                    await api.deleteMenuItem(btn.getAttribute('data-id'));
                    showToast('Menu item deleted', 'success');
                    loadMenuItems();
                }
            };
        });
    } catch (error) {
        console.error('Failed to load menu:', error);
    }
}

// Edit menu item
async function editMenuItem(itemId) {
    const menuItems = await api.getMenu();
    const item = menuItems.find(i => i._id === itemId);
    if (!item) return;
    
    const modal = document.createElement('div');
    modal.className = 'login-modal';
    modal.innerHTML = `
        <div class="login-modal-content">
            <button class="close-modal" style="position: absolute; top: 10px; right: 10px; background: none; border: none; color: white; font-size: 1.5rem;">&times;</button>
            <h4 style="color: var(--gold);">Edit Menu Item</h4>
            <form id="editMenuForm">
                <div class="mb-3">
                    <label>Item Name</label>
                    <input type="text" class="form-control" id="editName" value="${item.name}" required>
                </div>
                <div class="mb-3">
                    <label>Category</label>
                    <select class="form-select" id="editCategory" required>
                        <option value="breakfast" ${item.category === 'breakfast' ? 'selected' : ''}>Breakfast</option>
                        <option value="lunch" ${item.category === 'lunch' ? 'selected' : ''}>Lunch</option>
                        <option value="dinner" ${item.category === 'dinner' ? 'selected' : ''}>Dinner</option>
                    </select>
                </div>
                <div class="mb-3">
                    <label>Price (₹)</label>
                    <input type="number" class="form-control" id="editPrice" value="${item.price}" step="0.01" required>
                </div>
                <div class="mb-3">
                    <label>Description</label>
                    <textarea class="form-control" id="editDescription" rows="2" required>${item.description}</textarea>
                </div>
                <div class="mb-3">
                    <label>Image URL</label>
                    <input type="url" class="form-control" id="editImage" value="${item.image_url}" required>
                </div>
                <button type="submit" class="btn btn-gold w-100">Update Item</button>
            </form>
        </div>
    `;
    document.body.appendChild(modal);
    
    document.getElementById('editMenuForm').onsubmit = async (e) => {
        e.preventDefault();
        await api.updateMenuItem(itemId, {
            name: document.getElementById('editName').value,
            category: document.getElementById('editCategory').value,
            price: parseFloat(document.getElementById('editPrice').value),
            description: document.getElementById('editDescription').value,
            image_url: document.getElementById('editImage').value
        });
        showToast('Menu item updated', 'success');
        modal.remove();
        loadMenuItems();
    };
    
    modal.querySelector('.close-modal').onclick = () => modal.remove();
}

// Load reservations
async function loadReservations() {
    try {
        const reservations = await api.getAllReservations();
        const reservationsHtml = reservations.map(res => `
            <tr>
                <td>${res.name}</td>
                <td>${res.phone}</td>
                <td>${res.date}</td>
                <td>${res.time}</td>
                <td>${res.guests}</td>
                <td>${res.pre_order_items?.length || 0} items</td>
                <td><span class="badge bg-success">${res.status}</span></td>
            </tr>
        `).join('');
        document.getElementById('reservationsList').innerHTML = reservationsHtml || '<tr><td colspan="7" class="text-center">No reservations found</td></tr>';
    } catch (error) {
        console.error('Failed to load reservations:', error);
    }
}

// Load revenue chart
async function loadRevenueChart() {
    try {
        const revenueData = await api.getDailyRevenue(7);
        
        const labels = revenueData.map(d => d._id);
        const values = revenueData.map(d => d.revenue);
        
        const ctx = document.getElementById('revenueChart').getContext('2d');
        if (revenueChart) revenueChart.destroy();
        
        revenueChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Daily Revenue (₹)',
                    data: values,
                    borderColor: '#cda45e',
                    backgroundColor: 'rgba(205, 164, 94, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        labels: { color: '#fff' }
                    }
                },
                scales: {
                    y: {
                        ticks: { color: '#fff' },
                        grid: { color: 'rgba(255,255,255,0.1)' }
                    },
                    x: {
                        ticks: { color: '#fff' },
                        grid: { color: 'rgba(255,255,255,0.1)' }
                    }
                }
            }
        });
        
        // Revenue stats
        const totalRevenue = revenueData.reduce((sum, d) => sum + d.revenue, 0);
        const avgRevenue = totalRevenue / revenueData.length;
        document.getElementById('revenueStats').innerHTML = `
            <p><strong>Total (7 days):</strong> ₹${totalRevenue.toFixed(2)}</p>
            <p><strong>Average Daily:</strong> ₹${avgRevenue.toFixed(2)}</p>
            <p><strong>Total Orders:</strong> ${revenueData.reduce((sum, d) => sum + d.count, 0)}</p>
        `;
    } catch (error) {
        console.error('Failed to load revenue chart:', error);
    }
}

// Page navigation
function navigateTo(page) {
    currentPage = page;
    
    document.querySelectorAll('.admin-sidebar .nav-link').forEach(link => {
        link.classList.remove('active');
    });
    document.querySelector(`.admin-sidebar .nav-link[data-page="${page}"]`).classList.add('active');
    
    const pages = ['dashboard', 'orders', 'menu', 'reservations', 'revenue'];
    pages.forEach(p => {
        document.getElementById(`${p}Page`).style.display = p === page ? 'block' : 'none';
    });
    
    document.getElementById('pageTitle').innerText = 
        page === 'dashboard' ? 'Dashboard' :
        page === 'orders' ? 'Order Management' :
        page === 'menu' ? 'Menu Management' :
        page === 'reservations' ? 'Reservations' : 'Revenue Analytics';
    
    // Load page data
    if (page === 'dashboard') loadDashboard();
    else if (page === 'orders') loadOrders();
    else if (page === 'menu') loadMenuItems();
    else if (page === 'reservations') loadReservations();
    else if (page === 'revenue') loadRevenueChart();
}

// Add menu item
document.getElementById('saveMenuItem')?.addEventListener('click', async () => {
    const itemData = {
        name: document.getElementById('itemName').value,
        category: document.getElementById('itemCategory').value,
        price: parseFloat(document.getElementById('itemPrice').value),
        description: document.getElementById('itemDescription').value,
        image_url: document.getElementById('itemImage').value
    };
    
    if (!itemData.name || !itemData.category || !itemData.price || !itemData.description || !itemData.image_url) {
        showToast('Please fill all fields', 'error');
        return;
    }
    
    try {
        await api.createMenuItem(itemData);
        showToast('Menu item added successfully', 'success');
        bootstrap.Modal.getInstance(document.getElementById('addMenuItemModal')).hide();
        document.getElementById('addMenuItemForm').reset();
        loadMenuItems();
    } catch (error) {
        showToast('Failed to add menu item', 'error');
    }
});

// Order status filter
document.getElementById('orderStatusFilter')?.addEventListener('change', (e) => {
    loadOrders(e.target.value);
});

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    const hasAccess = await checkAdminAccess();
    if (!hasAccess) return;
    
    // Setup navigation
    document.querySelectorAll('.admin-sidebar .nav-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            navigateTo(link.getAttribute('data-page'));
        });
    });
    
    // Logout
    document.getElementById('logoutAdmin')?.addEventListener('click', (e) => {
        e.preventDefault();
        api.logout();
        window.location.href = 'index.html';
    });
    
    // Load initial page
    navigateTo('dashboard');
});
