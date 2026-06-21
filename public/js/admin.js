/* ============================
   HUMSAFAR — Admin Dashboard JS
   Complete interactive admin panel
   ============================ */

const ADMIN_PAGES = [
    'dashboard', 'user-management', 'verification-center', 'ai-controls',
    'media-moderation', 'match-analytics', 'subscription', 'global-settings', 'reports'
];

// State
let adminData = {};
let usersData = { users: [], total: 0, page: 1, totalPages: 1 };
let reportsData = [];
let searchTimeout = null;
let currentFilters = { search: '', status: 'all', page: 1, limit: 15 };

// =====================
// INIT
// =====================
document.addEventListener('DOMContentLoaded', () => {
    // Admin login page
    const adminLoginForm = document.getElementById('admin-login-form');
    if (adminLoginForm) {
        adminLoginForm.addEventListener('submit', handleAdminLogin);
        document.querySelectorAll('.toggle-password').forEach(btn => {
            btn.addEventListener('click', () => {
                const input = document.getElementById(btn.dataset.target);
                if (input) input.type = input.type === 'password' ? 'text' : 'password';
            });
        });
        return;
    }

    // Admin dashboard
    if (document.querySelector('.admin-layout')) {
        initAdminDashboard();
    }
});

// =====================
// LOGIN
// =====================
async function handleAdminLogin(e) {
    e.preventDefault();
    const errorEl = document.getElementById('admin-login-error');
    const submitBtn = document.getElementById('admin-login-submit');
    const btnText = submitBtn?.querySelector('.btn-text');
    const btnLoader = submitBtn?.querySelector('.btn-loader');

    hideMessage(errorEl);
    const username = document.getElementById('admin-username')?.value.trim();
    const password = document.getElementById('admin-password')?.value;

    if (!username || !password) { showError(errorEl, 'Please fill in all fields.'); return; }

    setLoading(submitBtn, btnText, btnLoader, true);
    try {
        const res = await fetch('/api/admin/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (res.ok) { window.location.href = '/admin/dashboard#dashboard'; }
        else { showError(errorEl, data.error || 'Invalid admin credentials.'); }
    } catch (err) {
        showError(errorEl, 'Network error. Please check your connection.');
    } finally {
        setLoading(submitBtn, btnText, btnLoader, false);
    }
}

// =====================
// DASHBOARD INIT
// =====================
async function initAdminDashboard() {
    setupNavigation();
    setupMobileSidebar();
    setupLogout();
    setupRefresh();
    setupUserFilters();
    setupExportCSV();
    setupExecReport();

    try {
        const res = await fetch('/api/admin/me');
        if (!res.ok) { window.location.href = '/admin'; return; }
        const data = await res.json();
        const username = data?.admin?.username || 'Admin';
        setText('sidebar-user-name', username);
        setText('sidebar-initials', getInitials(username));
    } catch (err) {
        window.location.href = '/admin';
        return;
    }

    await loadAllData();
    setActivePageFromHash();
    window.addEventListener('hashchange', setActivePageFromHash);
}

// =====================
// NAVIGATION
// =====================
function setupNavigation() {
    document.querySelectorAll('.sidebar-nav-item').forEach(item => {
        item.addEventListener('click', e => {
            e.preventDefault();
            const page = item.dataset.page;
            if (!page) return;
            window.location.hash = page;
            setActivePage(page);
            closeMobileSidebar();
        });
    });
}

function setActivePageFromHash() {
    const hash = window.location.hash.replace('#', '').trim().toLowerCase();
    setActivePage(hash || 'dashboard');
}

function setActivePage(page) {
    const target = ADMIN_PAGES.includes(page) ? page : 'dashboard';

    document.querySelectorAll('.admin-page').forEach(section => {
        section.classList.toggle('active', section.dataset.page === target);
    });
    document.querySelectorAll('.sidebar-nav-item').forEach(item => {
        item.classList.toggle('active', item.dataset.page === target);
    });

    // Load page-specific data
    if (target === 'user-management') loadUsers();
    if (target === 'reports') loadReports();
    if (target === 'verification-center') loadVerificationQueue();
    if (target === 'media-moderation') setTimeout(renderMediaModerationGrid, 50);
    if (target === 'subscription') setTimeout(drawRevenueChart, 50);
    if (target === 'match-analytics') { setTimeout(drawMatchChart, 50); loadRecentMatches(); }

}

// =====================
// MOBILE SIDEBAR
// =====================
function setupMobileSidebar() {
    document.getElementById('admin-mobile-menu-btn')?.addEventListener('click', () => {
        document.getElementById('admin-sidebar')?.classList.toggle('open');
        document.getElementById('admin-sidebar-overlay')?.classList.toggle('active');
    });
    document.getElementById('admin-sidebar-overlay')?.addEventListener('click', closeMobileSidebar);
}

function closeMobileSidebar() {
    document.getElementById('admin-sidebar')?.classList.remove('open');
    document.getElementById('admin-sidebar-overlay')?.classList.remove('active');
}

// =====================
// LOGOUT
// =====================
function setupLogout() {
    document.getElementById('admin-logout-btn')?.addEventListener('click', doLogout);
    document.getElementById('admin-logout-btn-mobile')?.addEventListener('click', doLogout);
}
async function doLogout() {
    try { await fetch('/api/admin/logout', { method: 'POST' }); } catch (e) {}
    window.location.href = '/admin';
}

// =====================
// REFRESH
// =====================
function setupRefresh() {
    document.getElementById('admin-refresh-dashboard')?.addEventListener('click', loadAllData);
}

// =====================
// DATA LOADING
// =====================
async function loadAllData() {
    try {
        const [statsRes, dashRes] = await Promise.all([
            fetch('/api/admin/stats'),
            fetch('/api/admin/dashboard')
        ]);

        if (!statsRes.ok || !dashRes.ok) { window.location.href = '/admin'; return; }

        const stats = await statsRes.json();
        const dash = await dashRes.json();
        adminData = { ...stats, ...dash };

        renderDashboard();
    } catch (err) {
        console.error('Data load error:', err);
    }
}

function renderDashboard() {
    const d = adminData;

    // Executive Dashboard stats
    animateNumber('dash-total-users', d.totalUsers || 0);
    animateNumber('dash-verified-count', d.completedProfiles || 0);
    animateNumber('dash-matches', d.totalMatches || 0);
    setText('dash-pending-count', String(d.pendingVerifications || 0));
    setText('dash-revenue', '₹' + formatNumber((d.totalUsers || 0) * 350));

    // Trends (simulated based on data)
    const trendPct = d.totalUsers > 0 ? '+' + Math.min(Math.round(d.totalUsers * 1.2), 99) + '%' : '+0%';
    setText('dash-users-trend', trendPct);
    setText('dash-revenue-trend', '+58.3%');
    setText('dash-verified-trend', (d.pendingVerifications || 0) + ' Rate');

    // System integrity
    setText('integrity-audit-text', d.pendingVerifications > 0 ?
        `${d.pendingVerifications} profiles are exceeding the 24h verification SLA.` :
        'All profiles verified within SLA.');
    setText('integrity-pending-text', d.pendingVerifications > 0 ?
        `${d.pendingVerifications} profiles pending verification review.` :
        'No pending verifications. Queue is clear.');

    // User Management stats
    setText('um-total-users', String(d.totalUsers || 0));
    setText('um-active-users', String(d.completedProfiles || 0));
    setText('um-suspended', '0');
    setText('um-ai-accuracy', d.avgCompatibility > 0 ? d.avgCompatibility + '%' : '86%');
    setText('um-trend', trendPct);

    // Verification center
    setText('vc-daily-quota', `${Math.min(d.completedProfiles || 0, 80)} / 80`);
    setText('vc-high-urgency', String(d.pendingVerifications > 3 ? 3 : d.pendingVerifications || 0));
    setText('vc-queue-badge', (d.pendingVerifications || 0) + ' Pending');
    setText('audit-pending-badge', (d.pendingVerifications || 0) + ' Pending');

    // Media moderation
    setText('mm-queued', '0');
    setText('mm-rejected', '0');
    setText('mm-approved', String(d.totalPhotos || 0));
    setText('mm-total', String(d.totalPhotos || 0));

    // Match analytics
    setText('ma-success-rate', d.avgCompatibility > 0 ? d.avgCompatibility + '%' : '0%');
    setText('ma-daily-matches', String(d.totalMatches || 0));
    setText('ma-repeat-users', String(Math.round((d.totalInteractions || 0) * 0.3)));
    setText('ma-interactions', String(d.totalInteractions || 0));

    // Reports
    setText('rpt-fake-count', String(d.totalReports || 0));
    const reportAlert = document.getElementById('reports-alert-banner');
    if (reportAlert && d.totalReports > 0) {
        reportAlert.style.display = 'flex';
        setText('reports-alert-text', `${d.pendingReports || 0} pending reports require immediate review.`);
    }

    // Charts
    drawAcquisitionChart(d.monthlySignups || []);
    drawPrecisionDonut(86);
    renderDemographics(d.genderBreak || []);
    renderRealtimeFeed(d.recentUsers || []);
}

// =====================
// CHARTS
// =====================
function drawAcquisitionChart(monthlyData) {
    const canvas = document.getElementById('acquisition-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = 220 * dpr;
    ctx.scale(dpr, dpr);

    const w = canvas.offsetWidth;
    const h = 220;
    const padding = { top: 20, right: 20, bottom: 40, left: 50 };

    ctx.clearRect(0, 0, w, h);

    // Generate data
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    let data = [];
    if (monthlyData.length > 0) {
        data = monthlyData.map(m => m.count);
    } else {
        // Generate sample data
        data = [12, 19, 15, 25, 22, 30, 35, 28, 40, 38, 45, 50];
    }

    const displayMonths = months.slice(0, Math.max(data.length, 6));
    while (data.length < 6) data.push(0);

    const maxVal = Math.max(...data, 1);
    const barCount = Math.min(data.length, 12);
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;
    const barWidth = Math.min(chartW / barCount * 0.5, 30);
    const gap = (chartW - barWidth * barCount) / (barCount + 1);

    // Grid lines
    ctx.strokeStyle = '#f0e7de';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        const y = padding.top + (chartH / 4) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(w - padding.right, y);
        ctx.stroke();
    }

    // Bars
    const goldGrad = ctx.createLinearGradient(0, padding.top, 0, h - padding.bottom);
    goldGrad.addColorStop(0, '#d4a853');
    goldGrad.addColorStop(1, '#e8c992');

    for (let i = 0; i < barCount; i++) {
        const barH = (data[i] / maxVal) * chartH;
        const x = padding.left + gap + i * (barWidth + gap);
        const y = padding.top + chartH - barH;

        // Bar
        ctx.fillStyle = goldGrad;
        ctx.beginPath();
        const radius = 4;
        ctx.moveTo(x, y + radius);
        ctx.arcTo(x, y, x + barWidth, y, radius);
        ctx.arcTo(x + barWidth, y, x + barWidth, y + barH, radius);
        ctx.lineTo(x + barWidth, padding.top + chartH);
        ctx.lineTo(x, padding.top + chartH);
        ctx.closePath();
        ctx.fill();

        // Label
        ctx.fillStyle = '#9a7e8a';
        ctx.font = '500 10px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(displayMonths[i] || '', x + barWidth / 2, h - padding.bottom + 18);
    }

    // Y-axis labels
    ctx.fillStyle = '#9a7e8a';
    ctx.font = '500 10px Inter';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
        const val = Math.round((maxVal / 4) * (4 - i));
        const y = padding.top + (chartH / 4) * i;
        ctx.fillText(String(val), padding.left - 8, y + 4);
    }

    // Trend line (verified)
    ctx.strokeStyle = '#2d8a4e';
    ctx.lineWidth = 2;
    ctx.setLineDash([]);
    ctx.beginPath();
    for (let i = 0; i < barCount; i++) {
        const verifiedCount = Math.round(data[i] * 0.6);
        const x = padding.left + gap + i * (barWidth + gap) + barWidth / 2;
        const y = padding.top + chartH - (verifiedCount / maxVal) * chartH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Dots on line
    for (let i = 0; i < barCount; i++) {
        const verifiedCount = Math.round(data[i] * 0.6);
        const x = padding.left + gap + i * (barWidth + gap) + barWidth / 2;
        const y = padding.top + chartH - (verifiedCount / maxVal) * chartH;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fillStyle = '#2d8a4e';
        ctx.fill();
    }
}

function drawPrecisionDonut(pct) {
    const canvas = document.getElementById('precision-donut');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    canvas.width = 140 * dpr;
    canvas.height = 140 * dpr;
    ctx.scale(dpr, dpr);

    const cx = 70, cy = 70, r = 55, lineW = 14;

    // Background ring
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.strokeStyle = '#f0e7de';
    ctx.lineWidth = lineW;
    ctx.stroke();

    // Progress ring
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + (pct / 100) * Math.PI * 2;

    const grad = ctx.createLinearGradient(0, 0, 140, 140);
    grad.addColorStop(0, '#5c1a2e');
    grad.addColorStop(1, '#c4627a');

    ctx.beginPath();
    ctx.arc(cx, cy, r, startAngle, endAngle);
    ctx.strokeStyle = grad;
    ctx.lineWidth = lineW;
    ctx.lineCap = 'round';
    ctx.stroke();

    setText('precision-value', pct + '%');
    setText('precision-insight', `Our Heritage Intelligence model is exceeding industry benchmarks by ${(pct - 72).toFixed(1)}% this quarter.`);
}

function drawMatchChart() {
    const canvas = document.getElementById('match-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = 200 * dpr;
    ctx.scale(dpr, dpr);

    const w = canvas.offsetWidth;
    const h = 200;
    const padding = { top: 20, right: 20, bottom: 40, left: 50 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    ctx.clearRect(0, 0, w, h);

    // Sample data
    const data = [5, 8, 12, 7, 15, 20, 18, 25, 22, 30, 28, 35];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const maxVal = Math.max(...data, 1);

    // Grid
    ctx.strokeStyle = '#f0e7de';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        const y = padding.top + (chartH / 4) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(w - padding.right, y);
        ctx.stroke();
    }

    // Area fill
    const grad = ctx.createLinearGradient(0, padding.top, 0, h - padding.bottom);
    grad.addColorStop(0, 'rgba(196,98,122,0.2)');
    grad.addColorStop(1, 'rgba(196,98,122,0)');

    ctx.beginPath();
    for (let i = 0; i < data.length; i++) {
        const x = padding.left + (chartW / (data.length - 1)) * i;
        const y = padding.top + chartH - (data[i] / maxVal) * chartH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.lineTo(padding.left + chartW, padding.top + chartH);
    ctx.lineTo(padding.left, padding.top + chartH);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();

    // Line
    ctx.beginPath();
    for (let i = 0; i < data.length; i++) {
        const x = padding.left + (chartW / (data.length - 1)) * i;
        const y = padding.top + chartH - (data[i] / maxVal) * chartH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = '#c4627a';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Dots
    for (let i = 0; i < data.length; i++) {
        const x = padding.left + (chartW / (data.length - 1)) * i;
        const y = padding.top + chartH - (data[i] / maxVal) * chartH;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#c4627a';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fillStyle = 'white';
        ctx.fill();
    }

    // X labels
    ctx.fillStyle = '#9a7e8a';
    ctx.font = '500 10px Inter';
    ctx.textAlign = 'center';
    for (let i = 0; i < data.length; i++) {
        const x = padding.left + (chartW / (data.length - 1)) * i;
        ctx.fillText(months[i], x, h - padding.bottom + 18);
    }

    // Y labels
    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
        const val = Math.round((maxVal / 4) * (4 - i));
        const y = padding.top + (chartH / 4) * i;
        ctx.fillText(String(val), padding.left - 8, y + 4);
    }
}

// =====================
// DEMOGRAPHICS
// =====================
function renderDemographics(genderBreak) {
    const container = document.getElementById('demographics-legend');
    if (!container) return;

    const total = genderBreak.reduce((sum, g) => sum + (g.count || 0), 0) || 1;
    const colors = { male: '#d4a853', female: '#c4627a', other: '#5c1a2e', null: '#9a7e8a' };
    const labels = { male: 'Male', female: 'Female', other: 'Other', null: 'Unspecified' };

    if (genderBreak.length === 0) {
        container.innerHTML = '<div style="font-size:0.82rem;color:var(--text-muted)">No demographic data yet.</div>';
        return;
    }

    container.innerHTML = genderBreak.map(g => {
        const pct = Math.round((g.count / total) * 100);
        const label = labels[g.gender] || (g.gender ? capitalize(g.gender) : 'Unspecified');
        const color = colors[g.gender] || '#9a7e8a';
        return `
            <div class="donut-legend-item">
                <span class="donut-legend-label"><span class="dot" style="background:${color}"></span> ${esc(label)}</span>
                <span class="donut-legend-value">${pct}%</span>
            </div>
        `;
    }).join('');
}

// =====================
// REAL-TIME FEED
// =====================
function renderRealtimeFeed(recentUsers) {
    const container = document.getElementById('realtime-feed');
    if (!container) return;

    if (!recentUsers || recentUsers.length === 0) {
        container.innerHTML = `<div class="feed-item">
            <div class="feed-icon registration"><span class="material-symbols-outlined">info</span></div>
            <div class="feed-content">
                <div class="feed-title">No recent activity</div>
                <div class="feed-desc">New events will appear here as users register.</div>
            </div>
        </div>`;
        return;
    }

    const icons = ['person_add', 'auto_awesome', 'shield'];
    const types = ['registration', 'match', 'verification'];
    const actions = ['New Registration', 'AI Match Suggestion', 'Profile Verified'];

    container.innerHTML = recentUsers.slice(0, 6).map((user, i) => {
        const typeIdx = i % 3;
        return `
            <div class="feed-item">
                <div class="feed-icon ${types[typeIdx]}"><span class="material-symbols-outlined">${icons[typeIdx]}</span></div>
                <div class="feed-content">
                    <div class="feed-title">${actions[typeIdx]}</div>
                    <div class="feed-desc">${esc(user.fullName)} from ${esc(user.city || 'Unknown')}${typeIdx === 0 ? ' just joined the platform.' : typeIdx === 1 ? ' — new match clusters generated.' : ' — profile verification completed.'}</div>
                </div>
                <span class="feed-time">${timeAgo(user.createdAt)}</span>
            </div>
        `;
    }).join('');
}

// =====================
// USERS TABLE
// =====================
function setupUserFilters() {
    const searchInput = document.getElementById('user-search');
    const statusFilter = document.getElementById('user-status-filter');
    const clearBtn = document.getElementById('clear-filters-btn');

    searchInput?.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            currentFilters.search = searchInput.value;
            currentFilters.page = 1;
            loadUsers();
        }, 350);
    });

    statusFilter?.addEventListener('change', () => {
        currentFilters.status = statusFilter.value;
        currentFilters.page = 1;
        loadUsers();
    });

    clearBtn?.addEventListener('click', () => {
        currentFilters = { search: '', status: 'all', page: 1, limit: 15 };
        if (searchInput) searchInput.value = '';
        if (statusFilter) statusFilter.value = 'all';
        loadUsers();
    });
}

async function loadUsers() {
    try {
        const params = new URLSearchParams({
            search: currentFilters.search,
            status: currentFilters.status,
            page: currentFilters.page,
            limit: currentFilters.limit
        });

        const res = await fetch('/api/admin/users?' + params.toString());
        if (!res.ok) return;
        usersData = await res.json();
        renderUsersTable();
        renderPagination();
        renderAuditQueue(usersData.users);
    } catch (err) {
        console.error('Users load error:', err);
    }
}

function renderUsersTable() {
    const tbody = document.getElementById('users-tbody');
    if (!tbody) return;

    const { users, total, page, limit } = usersData;
    const start = (page - 1) * limit + 1;
    const end = Math.min(page * limit, total);
    setText('um-table-count', total > 0 ? `Showing ${start} - ${end} of ${formatNumber(total)}` : 'No users found');

    if (!users || users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="padding:30px;text-align:center;color:var(--text-muted)">No users found.</td></tr>';
        return;
    }

    tbody.innerHTML = users.map(user => {
        const age = user.dob ? calculateAge(user.dob) : '—';
        const statusBadge = getStatusBadge(user.profileStatus);
        const memberBadge = user.premiumStatus ? '<span class="badge premium">Premium</span>' : '<span class="badge free">Free</span>';
        const photoHtml = user.photo
            ? `<img src="${esc(user.photo)}" alt="" style="width:36px;height:36px;border-radius:50%;object-fit:cover;border:2px solid var(--gold-light)">`
            : `<div class="user-avatar-sm">${getInitials(user.fullName)}</div>`;
        const genderIcon = user.gender === 'male' ? '♂' : user.gender === 'female' ? '♀' : '—';
        const genderColor = user.gender === 'male' ? 'var(--blue)' : user.gender === 'female' ? 'var(--rose)' : 'var(--text-muted)';

        return `
            <tr>
                <td>
                    <div class="user-cell">
                        ${photoHtml}
                        <div>
                            <div class="user-name">${esc(user.fullName)}</div>
                            <div class="user-email">${esc(user.email)}</div>
                        </div>
                    </div>
                </td>
                <td style="font-family:var(--font-mono);font-size:0.78rem;color:var(--text-muted)">HS-${String(user.id).padStart(5, '0')}</td>
                <td>${age !== '—' ? age + ' yrs' : '—'}<br><span style="font-size:0.72rem;color:var(--text-muted)">${esc(user.city || '—')}</span></td>
                <td style="font-size:0.82rem;font-weight:600;color:${genderColor}">${genderIcon} ${esc(capitalize(user.gender || '—'))}</td>
                <td>${statusBadge}</td>
                <td>${memberBadge}</td>
                <td style="font-size:0.78rem;color:var(--text-muted)">${formatDate(user.createdAt)}</td>
                <td>
                    <button class="table-action-btn" title="View" onclick="viewUserDetail(${user.id})"><span class="material-symbols-outlined" style="font-size:16px">visibility</span></button>
                    ${user.profileStatus === 'pending' ? `<button class="table-action-btn" title="Approve" onclick="verifyUserAction(${user.id},'complete')"><span class="material-symbols-outlined" style="font-size:16px">check</span></button>` : ''}
                </td>
            </tr>
        `;
    }).join('');
}

function renderPagination() {
    const container = document.getElementById('users-pagination');
    if (!container) return;

    const { page, totalPages, total } = usersData;
    if (totalPages <= 1) { container.innerHTML = ''; return; }

    let html = '';
    html += `<button class="page-btn" ${page <= 1 ? 'disabled' : ''} onclick="goToPage(${page - 1})"><span class="material-symbols-outlined" style="font-size:16px">chevron_left</span></button>`;

    const maxButtons = 5;
    let startPage = Math.max(1, page - Math.floor(maxButtons / 2));
    let endPage = Math.min(totalPages, startPage + maxButtons - 1);
    if (endPage - startPage < maxButtons - 1) startPage = Math.max(1, endPage - maxButtons + 1);

    if (startPage > 1) {
        html += `<button class="page-btn" onclick="goToPage(1)">1</button>`;
        if (startPage > 2) html += `<span class="pagination-info">…</span>`;
    }

    for (let i = startPage; i <= endPage; i++) {
        html += `<button class="page-btn ${i === page ? 'active' : ''}" onclick="goToPage(${i})">${i}</button>`;
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) html += `<span class="pagination-info">…</span>`;
        html += `<button class="page-btn" onclick="goToPage(${totalPages})">${totalPages}</button>`;
    }

    html += `<button class="page-btn" ${page >= totalPages ? 'disabled' : ''} onclick="goToPage(${page + 1})"><span class="material-symbols-outlined" style="font-size:16px">chevron_right</span></button>`;

    container.innerHTML = html;
}

window.goToPage = function(p) {
    currentFilters.page = p;
    loadUsers();
};

// =====================
// AUDIT QUEUE
// =====================
function renderAuditQueue(users) {
    const container = document.getElementById('audit-queue-list');
    if (!container) return;

    const pending = users.filter(u => u.profileStatus === 'pending');
    if (pending.length === 0) {
        container.innerHTML = '<div style="padding:16px;color:var(--text-muted);font-size:0.84rem">No profiles pending verification.</div>';
        return;
    }

    container.innerHTML = pending.slice(0, 5).map(user => {
        const avatarHtml = user.photo
            ? `<img src="${esc(user.photo)}" alt="" style="width:36px;height:36px;border-radius:50%;object-fit:cover;border:2px solid var(--gold-light);flex-shrink:0">`
            : `<div class="audit-avatar">${getInitials(user.fullName)}</div>`;
        return `
        <div class="audit-item">
            ${avatarHtml}
            <div class="audit-info">
                <div class="audit-name">${esc(user.fullName)}</div>
                <div class="audit-meta">UID: #HS-${String(user.id).padStart(4, '0')}</div>
            </div>
            <button class="audit-action" onclick="verifyUserAction(${user.id},'complete')">Review</button>
        </div>
    `;
    }).join('');
}

// =====================
// VERIFICATION CENTER
// =====================
async function loadVerificationQueue() {
    try {
        const res = await fetch('/api/admin/users?status=pending&limit=20');
        if (!res.ok) return;
        const data = await res.json();
        const container = document.getElementById('vc-queue-list');
        if (!container) return;

        if (!data.users || data.users.length === 0) {
            container.innerHTML = '<div style="padding:16px;color:var(--text-muted);font-size:0.84rem">No profiles in verification queue.</div>';
            return;
        }

        const urgencyLabels = ['HIGH URGENCY', 'STANDARD', 'LOW', 'STANDARD'];
        const urgencyColors = ['var(--red)', 'var(--amber)', 'var(--text-muted)', 'var(--amber)'];

        container.innerHTML = data.users.slice(0, 8).map((user, i) => {
            const urgencyIdx = i % 4;
            return `
                <div class="audit-item" style="cursor:pointer" onclick="showProfileDetail(${JSON.stringify(user).replace(/"/g, '&quot;')})">
                    <div style="display:flex;flex-direction:column;gap:4px;min-width:0;flex:1">
                        <span class="badge" style="background:${urgencyColors[urgencyIdx]}15;color:${urgencyColors[urgencyIdx]};width:fit-content;font-size:0.58rem">${urgencyLabels[urgencyIdx]}</span>
                        <div class="audit-name">${esc(user.fullName)}</div>
                        <div class="audit-meta">UID: #HS-${String(user.id).padStart(4, '0')}</div>
                    </div>
                    <span class="material-symbols-outlined" style="color:var(--text-muted);font-size:18px">chevron_right</span>
                </div>
            `;
        }).join('');
    } catch (err) {
        console.error('Verification queue error:', err);
    }
}

window.showProfileDetail = function(user) {
    const container = document.getElementById('vc-profile-detail');
    if (!container) return;

    const age = user.dob ? calculateAge(user.dob) : '—';
    const photoHtml = user.photo
        ? `<img src="${esc(user.photo)}" alt="Profile" style="width:72px;height:72px;border-radius:50%;object-fit:cover;border:3px solid var(--gold-light);box-shadow:0 2px 12px rgba(212,168,83,0.2)">`
        : `<div class="user-avatar-sm" style="width:72px;height:72px;font-size:1.5rem">${getInitials(user.fullName)}</div>`;
    container.innerHTML = `
        <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px">
            ${photoHtml}
            <div>
                <h3 style="font-family:var(--font-display);font-size:1.15rem;margin-bottom:4px">${esc(user.fullName)}</h3>
                <p style="font-size:0.82rem;color:var(--text-muted)">${age !== '—' ? age + ' Years' : 'Age unknown'} • ${esc(user.city || 'Unknown city')}</p>
                <p style="font-size:0.72rem;color:var(--text-muted)">Joined ${formatDate(user.createdAt)}</p>
            </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">
            <div style="padding:12px;background:#f9f5f0;border-radius:8px">
                <div style="font-size:0.65rem;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);margin-bottom:4px">Email</div>
                <div style="font-size:0.82rem;font-weight:600;color:var(--text-dark)">${esc(user.email)}</div>
            </div>
            <div style="padding:12px;background:#f9f5f0;border-radius:8px">
                <div style="font-size:0.65rem;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);margin-bottom:4px">Phone</div>
                <div style="font-size:0.82rem;font-weight:600;color:var(--text-dark)">${esc(user.phone || '—')}</div>
            </div>
            <div style="padding:12px;background:#f9f5f0;border-radius:8px">
                <div style="font-size:0.65rem;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);margin-bottom:4px">Gender</div>
                <div style="font-size:0.82rem;font-weight:600;color:var(--text-dark)">${esc(user.gender ? capitalize(user.gender) : '—')}</div>
            </div>
            <div style="padding:12px;background:#f9f5f0;border-radius:8px">
                <div style="font-size:0.65rem;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-muted);margin-bottom:4px">Status</div>
                <div>${getStatusBadge(user.profileStatus)}</div>
            </div>
        </div>
        <div style="display:flex;gap:10px">
            <button class="btn-primary" style="flex:1;justify-content:center" onclick="verifyUserAction(${user.id},'complete')">
                <span class="material-symbols-outlined" style="font-size:16px">check_circle</span> Approve
            </button>
            <button class="btn-secondary" style="flex:1;justify-content:center;color:var(--red);border-color:var(--red)" onclick="verifyUserAction(${user.id},'rejected')">
                <span class="material-symbols-outlined" style="font-size:16px">cancel</span> Reject
            </button>
        </div>
    `;
};

// =====================
// USER ACTIONS
// =====================
window.verifyUserAction = async function(userId, status) {
    try {
        const res = await fetch(`/api/admin/users/${userId}/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        if (res.ok) {
            await loadAllData();
            loadUsers();
            loadVerificationQueue();
        }
    } catch (err) {
        console.error('Verify error:', err);
    }
};

window.viewUserDetail = function(userId) {
    window.location.hash = 'verification-center';
    setTimeout(() => {
        const user = usersData.users.find(u => u.id === userId);
        if (user) showProfileDetail(user);
    }, 300);
};

// =====================
// REPORTS
// =====================
async function loadReports() {
    try {
        const res = await fetch('/api/admin/reports');
        if (!res.ok) return;
        const data = await res.json();
        reportsData = data.reports || [];
        renderReportsTable();
    } catch (err) {
        console.error('Reports load error:', err);
    }
}

function renderReportsTable() {
    const tbody = document.getElementById('reports-tbody');
    if (!tbody) return;

    if (reportsData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="padding:30px;text-align:center;color:var(--text-muted)">No reports filed yet. The abuse queue is clear.</td></tr>';
        return;
    }

    tbody.innerHTML = reportsData.map(r => {
        const reportedPhoto = r.reportedPhoto
            ? `<img src="${esc(r.reportedPhoto)}" alt="" style="width:36px;height:36px;border-radius:50%;object-fit:cover;border:2px solid var(--rose-light)">`
            : `<div class="user-avatar-sm">${getInitials(r.reportedName)}</div>`;
        return `
        <tr>
            <td>
                <div class="user-cell">
                    ${reportedPhoto}
                    <div>
                        <div class="user-name">${esc(r.reportedName || 'Unknown')}</div>
                        <div class="user-email">${esc(r.reportedEmail || '')}</div>
                    </div>
                </div>
            </td>
            <td>${esc(r.reason)}</td>
            <td style="font-size:0.8rem">${esc(r.reporterName || 'Anonymous')}</td>
            <td>${getReportStatusBadge(r.status)}</td>
            <td style="font-size:0.78rem;color:var(--text-muted)">${formatDate(r.createdAt)}</td>
            <td>
                ${r.status === 'pending' ? `
                    <button class="table-action-btn" title="Resolve" onclick="resolveReportAction(${r.id},'resolved')"><span class="material-symbols-outlined" style="font-size:16px">check</span></button>
                    <button class="table-action-btn danger" title="Dismiss" onclick="resolveReportAction(${r.id},'dismissed')"><span class="material-symbols-outlined" style="font-size:16px">close</span></button>
                ` : '<span style="font-size:0.72rem;color:var(--text-muted)">—</span>'}
            </td>
        </tr>
    `;
    }).join('');
}

window.resolveReportAction = async function(reportId, status) {
    try {
        const res = await fetch(`/api/admin/reports/${reportId}/resolve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status })
        });
        if (res.ok) {
            await loadAllData();
            loadReports();
        }
    } catch (err) {
        console.error('Resolve report error:', err);
    }
};

// =====================
// CSV EXPORT
// =====================
function setupExportCSV() {
    document.getElementById('btn-export-csv')?.addEventListener('click', async () => {
        try {
            const res = await fetch('/api/admin/users/all');
            if (!res.ok) return;
            const data = await res.json();
            const users = data.users || [];

            if (users.length === 0) { alert('No users to export.'); return; }

            let csv = 'ID,Full Name,Email,Phone,Gender,City,DOB,Created At\n';
            users.forEach(u => {
                csv += `${u.id},"${u.fullName || ''}","${u.email || ''}","${u.phone || ''}","${u.gender || ''}","${u.city || ''}","${u.dob || ''}","${u.createdAt || ''}"\n`;
            });

            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'humsafar_users_' + new Date().toISOString().split('T')[0] + '.csv';
            a.click();
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error('Export error:', err);
        }
    });
}

// =====================
// EXECUTIVE REPORT PDF
// =====================
function setupExecReport() {
    document.getElementById('btn-exec-report')?.addEventListener('click', generateExecReportPDF);
}

async function generateExecReportPDF() {
    const btn = document.getElementById('btn-exec-report');
    if (btn) btn.disabled = true;
    try {
        // Fetch all required data
        const [statsRes, usersRes, reportsRes] = await Promise.all([
            fetch('/api/admin/stats'),
            fetch('/api/admin/users/all'),
            fetch('/api/admin/reports')
        ]);
        const stats = statsRes.ok ? await statsRes.json() : {};
        const usersData = usersRes.ok ? await usersRes.json() : { users: [] };
        const reportsData = reportsRes.ok ? await reportsRes.json() : { reports: [] };
        const users = usersData.users || [];
        const reports = reportsData.reports || [];

        // Build PDF content as printable HTML
        const date = new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
        const html = `
            <html><head><style>
                body{font-family:Arial,sans-serif;margin:32px;color:#1a0a0f}
                h1{color:#5c1a2e;font-size:1.8rem;margin-bottom:4px}
                h2{color:#3d0d20;font-size:1.1rem;margin:24px 0 8px;border-bottom:2px solid #e8ddd4;padding-bottom:6px}
                .subtitle{color:#9a7e8a;font-size:0.9rem;margin-bottom:28px}
                .stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:20px}
                .stat-box{background:#f9f5f0;border-radius:8px;padding:16px;text-align:center}
                .stat-num{font-size:1.8rem;font-weight:700;color:#5c1a2e}
                .stat-lbl{font-size:0.75rem;color:#9a7e8a;margin-top:4px}
                table{width:100%;border-collapse:collapse;font-size:0.82rem;margin-bottom:20px}
                th{background:#3d0d20;color:white;padding:8px 10px;text-align:left;font-size:0.75rem;text-transform:uppercase}
                td{padding:8px 10px;border-bottom:1px solid #f0e7de}
                tr:nth-child(even) td{background:#fdf8f4}
                .footer{margin-top:32px;font-size:0.72rem;color:#9a7e8a;border-top:1px solid #e8ddd4;padding-top:12px}
            </style></head><body>
                <h1>🌹 Humsafar AI — Executive Report</h1>
                <div class="subtitle">Generated on ${date} | Confidential — Admin Only</div>

                <h2>Platform Overview</h2>
                <div class="stats-grid">
                    <div class="stat-box"><div class="stat-num">${stats.totalUsers || 0}</div><div class="stat-lbl">Total Users</div></div>
                    <div class="stat-box"><div class="stat-num">${stats.completedProfiles || 0}</div><div class="stat-lbl">Verified Profiles</div></div>
                    <div class="stat-box"><div class="stat-num">${stats.totalMatches || 0}</div><div class="stat-lbl">Total Matches</div></div>
                    <div class="stat-box"><div class="stat-num">${stats.pendingVerifications || 0}</div><div class="stat-lbl">Pending Verifications</div></div>
                </div>

                <h2>User Roster (${users.length} users)</h2>
                <table>
                    <thead><tr><th>#</th><th>Name</th><th>Email</th><th>Gender</th><th>City</th><th>Status</th><th>Joined</th></tr></thead>
                    <tbody>${users.slice(0, 50).map((u, i) => `
                        <tr>
                            <td>${i + 1}</td>
                            <td>${u.fullName || '—'}</td>
                            <td>${u.email || '—'}</td>
                            <td>${u.gender ? u.gender.charAt(0).toUpperCase() + u.gender.slice(1) : '—'}</td>
                            <td>${u.city || '—'}</td>
                            <td>${u.profileStatus || '—'}</td>
                            <td>${u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN') : '—'}</td>
                        </tr>`).join('')}
                    </tbody>
                </table>
                ${users.length > 50 ? `<p style="font-size:0.78rem;color:#9a7e8a;margin-bottom:20px">Showing first 50 of ${users.length} users. Export CSV for complete list.</p>` : ''}

                <h2>Reports Summary (${reports.length} total)</h2>
                <table>
                    <thead><tr><th>Reported User</th><th>Reason</th><th>Reporter</th><th>Status</th><th>Date</th></tr></thead>
                    <tbody>${reports.length === 0
                        ? '<tr><td colspan="5" style="text-align:center;color:#9a7e8a">No reports on record.</td></tr>'
                        : reports.map(r => `<tr><td>${r.reportedName || '—'}</td><td>${r.reason || '—'}</td><td>${r.reporterName || '—'}</td><td>${r.status || '—'}</td><td>${r.createdAt ? new Date(r.createdAt).toLocaleDateString('en-IN') : '—'}</td></tr>`).join('')
                    }</tbody>
                </table>

                <div class="footer">Humsafar AI Matrimonial Platform · Executive Intelligence Report · ${date} · Confidential</div>
            </body></html>
        `;

        const printWin = window.open('', '_blank', 'width=900,height=700');
        printWin.document.write(html);
        printWin.document.close();
        printWin.focus();
        setTimeout(() => { printWin.print(); }, 500);
    } catch (err) {
        console.error('PDF generation error:', err);
        alert('Could not generate report. Please try again.');
    } finally {
        if (btn) btn.disabled = false;
    }
}

// =====================
// RECENT MATCHES
// =====================
async function loadRecentMatches() {
    try {
        const res = await fetch('/api/admin/matches/recent?limit=12');
        if (!res.ok) return;
        const data = await res.json();
        renderRecentMatchesTable(data.matches || []);
    } catch (err) {
        console.error('Recent matches load error:', err);
    }
}

function renderRecentMatchesTable(matches) {
    const tbody = document.getElementById('recent-matches-tbody');
    if (!tbody) return;

    setText('recent-matches-count', matches.length > 0 ? matches.length + ' recent matches' : '');

    if (!matches || matches.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="padding:30px;text-align:center;color:var(--text-muted)">No successful matches recorded yet.</td></tr>';
        return;
    }

    tbody.innerHTML = matches.map(m => {
        const photo1 = m.user1_photo
            ? `<img src="${esc(m.user1_photo)}" alt="" style="width:32px;height:32px;border-radius:50%;object-fit:cover;border:2px solid var(--rose-light);margin-right:8px;vertical-align:middle">`
            : `<div class="user-avatar-sm" style="width:32px;height:32px;font-size:0.7rem;display:inline-flex;vertical-align:middle;margin-right:8px">${getInitials(m.user1_name)}</div>`;
        const photo2 = m.user2_photo
            ? `<img src="${esc(m.user2_photo)}" alt="" style="width:32px;height:32px;border-radius:50%;object-fit:cover;border:2px solid var(--gold-light);margin-right:8px;vertical-align:middle">`
            : `<div class="user-avatar-sm" style="width:32px;height:32px;font-size:0.7rem;display:inline-flex;vertical-align:middle;margin-right:8px;background:var(--gold-glow);color:var(--gold)">${getInitials(m.user2_name)}</div>`;

        const scoreColor = m.compatibility_score >= 90 ? 'var(--green)' : m.compatibility_score >= 75 ? 'var(--amber)' : 'var(--rose)';
        const scoreBar = `<div style="display:flex;align-items:center;gap:8px">
            <div style="flex:1;height:6px;background:#f0e7de;border-radius:3px;overflow:hidden">
                <div style="width:${m.compatibility_score}%;height:100%;background:${scoreColor};border-radius:3px"></div>
            </div>
            <span style="font-weight:700;font-size:0.82rem;color:${scoreColor}">${m.compatibility_score}%</span>
        </div>`;

        return `
        <tr>
            <td style="padding:12px 14px">
                <div style="display:flex;align-items:center">
                    ${photo1}
                    <div>
                        <div style="font-weight:600;font-size:0.85rem">${esc(m.user1_name)}</div>
                        <div style="font-size:0.72rem;color:var(--text-muted)">${esc(m.user1_city || '—')}</div>
                    </div>
                </div>
            </td>
            <td style="padding:12px 14px">
                <div style="display:flex;align-items:center">
                    ${photo2}
                    <div>
                        <div style="font-weight:600;font-size:0.85rem">${esc(m.user2_name)}</div>
                        <div style="font-size:0.72rem;color:var(--text-muted)">${esc(m.user2_city || '—')}</div>
                    </div>
                </div>
            </td>
            <td style="padding:12px 14px;min-width:140px">${scoreBar}</td>
            <td style="padding:12px 14px;font-size:0.78rem;color:var(--text-muted)">${formatDate(m.createdAt)}</td>
        </tr>
        `;
    }).join('');
}

// =====================
// HELPERS
// =====================
function animateNumber(id, target) {
    const el = document.getElementById(id);
    if (!el) return;
    const duration = 1000;
    const frameDuration = 1000 / 60;
    const totalFrames = Math.max(1, Math.round(duration / frameDuration));
    let frame = 0;
    const counter = setInterval(() => {
        frame++;
        const progress = 1 - Math.pow(1 - frame / totalFrames, 3);
        el.textContent = formatNumber(Math.round(target * progress));
        if (frame >= totalFrames) {
            clearInterval(counter);
            el.textContent = formatNumber(target);
        }
    }, frameDuration);
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function getInitials(name) {
    return String(name || '').replace(/[^a-zA-Z ]/g, '').split(' ').filter(Boolean).map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'AD';
}

function esc(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function capitalize(str) {
    return String(str || '').charAt(0).toUpperCase() + String(str || '').slice(1);
}

function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatNumber(num) {
    return Number(num).toLocaleString('en-IN');
}

function calculateAge(dob) {
    if (!dob) return null;
    const birth = new Date(dob);
    if (isNaN(birth.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age > 0 && age < 120 ? age : null;
}

function timeAgo(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const diff = Math.floor((Date.now() - d.getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return Math.floor(diff / 60) + ' min ago';
    if (diff < 86400) return Math.floor(diff / 3600) + ' hours ago';
    return Math.floor(diff / 86400) + ' days ago';
}

function getStatusBadge(status) {
    const map = {
        complete: '<span class="badge verified"><span class="material-symbols-outlined" style="font-size:12px">check_circle</span> Verified</span>',
        pending: '<span class="badge pending"><span class="material-symbols-outlined" style="font-size:12px">pending</span> Pending</span>',
        incomplete: '<span class="badge incomplete">Incomplete</span>',
        rejected: '<span class="badge rejected"><span class="material-symbols-outlined" style="font-size:12px">cancel</span> Rejected</span>'
    };
    return map[status] || '<span class="badge incomplete">' + esc(status || 'Unknown') + '</span>';
}

function getReportStatusBadge(status) {
    const map = {
        pending: '<span class="badge pending">Pending</span>',
        resolved: '<span class="badge verified">Resolved</span>',
        dismissed: '<span class="badge incomplete">Dismissed</span>'
    };
    return map[status] || '<span class="badge incomplete">' + esc(status) + '</span>';
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
    if (!btn) return;
    btn.disabled = isLoading;
    if (textEl) textEl.style.display = isLoading ? 'none' : 'inline';
    if (loaderEl) loaderEl.style.display = isLoading ? 'inline-block' : 'none';
}

// Draw charts on hash change
window.addEventListener('hashchange', () => {
    if (window.location.hash === '#match-analytics') {
        setTimeout(drawMatchChart, 100);
    }
    if (window.location.hash === '#subscription') {
        setTimeout(drawRevenueChart, 100);
    }
    if (window.location.hash === '#media-moderation') {
        renderMediaModerationGrid();
    }
});

// Resize charts
window.addEventListener('resize', () => {
    if (document.querySelector('[data-page="dashboard"].active')) {
        drawAcquisitionChart(adminData.monthlySignups || []);
    }
    if (document.querySelector('[data-page="match-analytics"].active')) {
        drawMatchChart();
    }
    if (document.querySelector('[data-page="subscription"].active')) {
        drawRevenueChart();
    }
});

// =====================
// MEDIA MODERATION
// =====================
const SAMPLE_PHOTOS = [
    { id: 'M-9021', name: 'Sameer Khan', score: 24, time: '12m ago', badge: 'flagged', flag: '3 Reports: "Low Quality", "Fake Photo"', actions: ['warn','remove'] },
    { id: 'F-4412', name: 'Anjali Sharma', score: 98, time: '24m ago', badge: 'pending', flag: '✅ No Flags Detected', actions: ['edit','approve'] },
    { id: 'M-2110', name: 'Rohit Varma', score: 92, time: '1h ago', badge: 'pending', flag: '⚠ Potential Blur (8%)', actions: ['warn','approve'] },
    { id: 'M-5521', name: 'Vikram Singh', score: 41, time: '3h ago', badge: 'flagged', flag: 'Flag: Facial features obscured by accessories.', actions: ['request','remove'] },
    { id: 'F-0019', name: 'Priya Gupta', score: 99, time: '5h ago', badge: 'pending', flag: '★ Premium User - Priority', actions: ['warn','approve'] },
    { id: 'M-7782', name: 'Rahul Desai', score: 68, time: '12h ago', badge: 'reported', flag: '⚠ Report: "Not a real person"', actions: ['warn','remove'] },
];

function renderMediaModerationGrid() {
    const grid = document.getElementById('mm-photo-grid');
    if (!grid) return;

    // Use real user photos if available, else sample data
    const photos = (adminData.recentUsers && adminData.recentUsers.length > 0) ?
        adminData.recentUsers.slice(0, 6).map((u, i) => {
            const sample = SAMPLE_PHOTOS[i % SAMPLE_PHOTOS.length];
            return { ...sample, name: u.fullName || sample.name, id: 'HS-' + String(u.id).padStart(4, '0') };
        }) : SAMPLE_PHOTOS;

    const pendingCount = photos.filter(p => p.badge === 'pending').length;
    setText('mm-pending-badge', String(pendingCount));

    const gradients = [
        'linear-gradient(135deg, #3d0d20 0%, #8b3a3a 100%)',
        'linear-gradient(135deg, #5c1a2e 0%, #c4627a 100%)',
        'linear-gradient(135deg, #2d4a3d 0%, #5c8a6e 100%)',
        'linear-gradient(135deg, #3d0d20 0%, #6b4c4c 100%)',
        'linear-gradient(135deg, #4a2040 0%, #c4627a 100%)',
        'linear-gradient(135deg, #1a2a3d 0%, #4a6a8a 100%)',
    ];

    grid.innerHTML = photos.map((p, idx) => {
        const scoreClass = p.score >= 90 ? 'safe' : p.score >= 60 ? 'warn' : 'danger';
        const initials = getInitials(p.name);
        const actionBtns = p.actions.map(a => {
            if (a === 'approve') return `<button class="mm-action-btn approve">Approve</button>`;
            if (a === 'remove') return `<button class="mm-action-btn remove">Remove</button>`;
            if (a === 'warn') return `<button class="mm-action-btn">Warn</button>`;
            if (a === 'edit') return `<button class="mm-action-btn">Edit</button>`;
            if (a === 'request') return `<button class="mm-action-btn">Request New</button>`;
            return `<button class="mm-action-btn">${capitalize(a)}</button>`;
        }).join('');

        return `
            <div class="mm-photo-card">
                <div class="mm-photo-img-wrap" style="background:${gradients[idx % gradients.length]}">
                    <span style="font-family:var(--font-display);font-size:2.2rem;font-weight:700;color:rgba(255,255,255,0.25)">${initials}</span>
                    <span class="mm-photo-badge ${p.badge}">${p.badge === 'flagged' ? '⚠ AI Flagged' : p.badge === 'reported' ? '🚩 Reported' : '● Pending'}</span>
                    <span class="mm-photo-id">ID: #${esc(p.id)}</span>
                    <span class="mm-photo-zoom"><span class="material-symbols-outlined" style="font-size:16px">search</span></span>
                </div>
                <div class="mm-photo-body">
                    <div>
                        <span class="mm-photo-name">${esc(p.name)}</span>
                        <span class="mm-photo-score ${scoreClass}">AI Score: ${p.score}% Safe</span>
                    </div>
                    <div class="mm-photo-meta">Uploaded: ${esc(p.time)}</div>
                    <div class="mm-photo-flag">${esc(p.flag)}</div>
                    <div class="mm-photo-actions">${actionBtns}</div>
                </div>
            </div>
        `;
    }).join('');
}

window.switchMmTab = function(el) {
    document.querySelectorAll('.mm-tab').forEach(t => t.classList.remove('active'));
    el.classList.add('active');
    // Could filter grid by tab, for now just show all
    renderMediaModerationGrid();
};

// =====================
// REVENUE CHART
// =====================
function drawRevenueChart() {
    const canvas = document.getElementById('revenue-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = 220 * dpr;
    ctx.scale(dpr, dpr);

    const w = canvas.offsetWidth;
    const h = 220;
    const padding = { top: 20, right: 20, bottom: 40, left: 55 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    ctx.clearRect(0, 0, w, h);

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const revenue = [180, 220, 260, 310, 280, 350, 400, 370, 420, 450, 430, 480];
    const target  = [200, 220, 240, 280, 300, 320, 360, 380, 400, 420, 440, 460];
    const maxVal = Math.max(...revenue, ...target, 1);
    const barCount = 12;
    const barWidth = Math.min(chartW / barCount * 0.5, 28);
    const gap = (chartW - barWidth * barCount) / (barCount + 1);

    // Grid
    ctx.strokeStyle = '#f0e7de';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
        const y = padding.top + (chartH / 4) * i;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(w - padding.right, y);
        ctx.stroke();
    }

    // Revenue bars
    const barGrad = ctx.createLinearGradient(0, padding.top, 0, h - padding.bottom);
    barGrad.addColorStop(0, '#5c1a2e');
    barGrad.addColorStop(1, '#3d0d20');

    for (let i = 0; i < barCount; i++) {
        const barH = (revenue[i] / maxVal) * chartH;
        const x = padding.left + gap + i * (barWidth + gap);
        const y = padding.top + chartH - barH;
        const radius = 4;

        ctx.fillStyle = barGrad;
        ctx.beginPath();
        ctx.moveTo(x, y + radius);
        ctx.arcTo(x, y, x + barWidth, y, radius);
        ctx.arcTo(x + barWidth, y, x + barWidth, y + barH, radius);
        ctx.lineTo(x + barWidth, padding.top + chartH);
        ctx.lineTo(x, padding.top + chartH);
        ctx.closePath();
        ctx.fill();

        // Month label
        ctx.fillStyle = '#9a7e8a';
        ctx.font = '600 10px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(months[i], x + barWidth / 2, h - padding.bottom + 18);
    }

    // Target line
    ctx.strokeStyle = '#2d8a4e';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    for (let i = 0; i < barCount; i++) {
        const x = padding.left + gap + i * (barWidth + gap) + barWidth / 2;
        const y = padding.top + chartH - (target[i] / maxVal) * chartH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // Y labels
    ctx.fillStyle = '#9a7e8a';
    ctx.font = '500 10px Inter';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 4; i++) {
        const val = Math.round((maxVal / 4) * (4 - i));
        const y = padding.top + (chartH / 4) * i;
        ctx.fillText('₹' + val + 'k', padding.left - 8, y + 4);
    }
}

// =====================
// SUBSCRIPTION TAB FILTER
// =====================
window.filterSubTab = function(btn, type) {
    // Visual toggle
    btn.parentElement.querySelectorAll('.btn-secondary').forEach(b => {
        b.style.background = '';
        b.style.color = '';
    });
    btn.style.background = 'var(--maroon)';
    btn.style.color = 'white';
};

// Initial render on page load for media moderation
if (window.location.hash === '#media-moderation') {
    setTimeout(renderMediaModerationGrid, 200);
}

