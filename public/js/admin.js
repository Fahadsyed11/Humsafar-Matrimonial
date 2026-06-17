/* ============================
   HUMSAFAR — Admin JS
   ============================ */

document.addEventListener('DOMContentLoaded', () => {

    // ===== ADMIN LOGIN FORM =====
    const adminLoginForm = document.getElementById('admin-login-form');
    if (adminLoginForm) {
        adminLoginForm.addEventListener('submit', handleAdminLogin);
    }

    // ===== ADMIN LOGOUT =====
    const adminLogoutBtn = document.getElementById('admin-logout-btn');
    if (adminLogoutBtn) {
        adminLogoutBtn.addEventListener('click', handleAdminLogout);
    }

    // ===== PASSWORD TOGGLE =====
    document.querySelectorAll('.toggle-password').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.dataset.target;
            const input = document.getElementById(targetId);
            if (!input) return;
            input.type = input.type === 'password' ? 'text' : 'password';
        });
    });

    // ===== DASHBOARD: Check auth & load data =====
    if (document.querySelector('.dashboard-page')) {
        checkAdminAuth();
    }
});

// ===== ADMIN LOGIN =====
async function handleAdminLogin(e) {
    e.preventDefault();

    const errorEl = document.getElementById('admin-login-error');
    const submitBtn = document.getElementById('admin-login-submit');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoader = submitBtn.querySelector('.btn-loader');

    hideMessage(errorEl);

    const username = document.getElementById('admin-username').value.trim();
    const password = document.getElementById('admin-password').value;

    if (!username || !password) {
        showError(errorEl, 'Please fill in all fields.');
        return;
    }

    setLoading(submitBtn, btnText, btnLoader, true);

    try {
        const res = await fetch('/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await res.json();

        if (res.ok) {
            window.location.href = '/admin/dashboard';
        } else {
            showError(errorEl, data.error || 'Invalid admin credentials.');
        }
    } catch (err) {
        showError(errorEl, 'Network error. Please check your connection.');
    } finally {
        setLoading(submitBtn, btnText, btnLoader, false);
    }
}

// ===== ADMIN AUTH CHECK =====
async function checkAdminAuth() {
    try {
        const res = await fetch('/api/admin/me');
        if (!res.ok) {
            window.location.href = '/admin';
            return;
        }
        loadDashboardData();
    } catch (err) {
        window.location.href = '/admin';
    }
}

// ===== LOAD DASHBOARD DATA =====
async function loadDashboardData() {
    try {
        const res = await fetch('/api/admin/dashboard');
        if (!res.ok) {
            window.location.href = '/admin';
            return;
        }

        const data = await res.json();

        // Update total users count
        const totalUsersEl = document.getElementById('dash-total-users');
        if (totalUsersEl) {
            animateNumber(totalUsersEl, data.totalUsers);
        }

        // Update badge
        const badge = document.getElementById('user-count-badge');
        if (badge) {
            badge.textContent = `${data.totalUsers} user${data.totalUsers !== 1 ? 's' : ''}`;
        }

        // Render users table
        renderUsersTable(data.recentUsers);

    } catch (err) {
        console.error('Dashboard data error:', err);
    }
}

function renderUsersTable(users) {
    const tbody = document.getElementById('users-tbody');
    if (!tbody) return;

    if (!users || users.length === 0) {
        tbody.innerHTML = `
            <tr class="empty-row">
                <td colspan="7">No registered users yet. Users will appear here after sign up.</td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = users.map(user => `
        <tr>
            <td>${user.id}</td>
            <td style="color: var(--text-primary); font-weight: 500;">${escapeHtml(user.fullName)}</td>
            <td>${escapeHtml(user.email)}</td>
            <td>${user.phone || '—'}</td>
            <td>${user.gender ? capitalizeFirst(user.gender) : '—'}</td>
            <td>${user.city || '—'}</td>
            <td>${formatDate(user.createdAt)}</td>
        </tr>
    `).join('');
}

// ===== ADMIN LOGOUT =====
async function handleAdminLogout() {
    try {
        await fetch('/api/admin/logout', { method: 'POST' });
        window.location.href = '/admin';
    } catch (err) {
        window.location.href = '/admin';
    }
}

// ===== UTILITIES =====
function animateNumber(el, target) {
    const duration = 1000;
    const frameDuration = 1000 / 60;
    const totalFrames = Math.round(duration / frameDuration);
    let frame = 0;

    const counter = setInterval(() => {
        frame++;
        const progress = 1 - Math.pow(1 - frame / totalFrames, 3);
        el.textContent = Math.round(target * progress);

        if (frame === totalFrames) {
            clearInterval(counter);
            el.textContent = target;
        }
    }, frameDuration);
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatDate(dateStr) {
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

function showError(el, message) {
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    el.style.display = 'block';
}

function hideMessage(el) {
    if (!el) return;
    el.classList.remove('show');
    el.style.display = 'none';
    el.textContent = '';
}

function setLoading(btn, textEl, loaderEl, isLoading) {
    if (isLoading) {
        btn.disabled = true;
        if (textEl) textEl.style.display = 'none';
        if (loaderEl) loaderEl.style.display = 'inline-block';
    } else {
        btn.disabled = false;
        if (textEl) textEl.style.display = 'inline';
        if (loaderEl) loaderEl.style.display = 'none';
    }
}
