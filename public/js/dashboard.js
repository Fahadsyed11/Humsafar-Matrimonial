/* ============================================
   HUMSAFAR — Dashboard JS
   Post-login SPA-style navigation & functionality
   ============================================ */

// ===== STATE =====
let currentUser = null;
let currentConversation = null;
let swipeProfiles = [];
let discoveryProfiles = [];
let swipeIndex = 0;
let swipeStats = { viewed: 12, likes: 5, matches: 2, requests: 1 };
let billingPeriod = 'monthly'; // 'monthly' | 'yearly'

const PRICES = {
    monthly: { premium: '699', gold: '1,299' },
    yearly:  { premium: '489', gold: '909' }  // ~30% off
};

// ===== MOCK DATA =====
const MOCK_PROFILES = [
    { id: 1, name: 'Ayesha Khan', age: 23, profession: 'Doctor (MBBS)', religion: 'Sunni Muslim', education: 'MBBS', city: 'Hyderabad', match: 95, initials: 'AK', isTopPick: true, tags: ['Same Education', 'Preferred Location', 'Shared Interests'] },
    { id: 2, name: 'Zainab Raza', age: 26, profession: 'Software Engineer', religion: 'Muslim', education: 'MS Computer Science', city: 'London, UK', match: 88, initials: 'ZR', tags: ['Highly Compatible', 'Same City'] },
    { id: 3, name: 'Fatima Ali', age: 25, profession: 'Software Engineer', religion: 'Muslim', education: 'BS Computer Science', city: 'Karachi', match: 82, initials: 'FA', tags: ['AI Recommended'] },
    { id: 4, name: 'Amara Malik', age: 24, profession: 'Dentist', religion: 'Sunni', education: 'BDS', city: 'Lahore', match: 79, initials: 'AM', tags: ['Same Education', 'Shared Interests'] },
    { id: 5, name: 'Sara Begum', age: 26, profession: 'Teacher', religion: 'Muslim', education: 'M.Ed', city: 'Lucknow', match: 76, initials: 'SB', tags: ['Same Values'] },
    { id: 6, name: 'Priya Sharma', age: 27, profession: 'Marketing Director', religion: 'Hindu', education: 'MBA', city: 'Mumbai, IN', match: 72, initials: 'PS', tags: ['AI Recommended', 'Nearby'] },
];

const MOCK_MATCHES = [
    { id: 1, name: 'Aarav Sharma', age: 31, profession: 'Architect', city: 'Mumbai', community: 'Brahmin', match: 91, initials: 'AS' },
    { id: 2, name: 'Karan Mehta', age: 29, profession: 'Entrepreneur', city: 'Ahmedabad', community: 'Jain', match: 88, initials: 'KM' },
    { id: 3, name: 'Arjun Reddy', age: 32, profession: 'Software Engineer', city: 'Hyderabad', community: 'Reddy', match: 94, initials: 'AR', isTopPick: true },
];

const MOCK_CONVERSATIONS = [
    { id: 1, name: 'Sarah Ahmed', initials: 'SA', match: 92, isOnline: true, lastMsg: "I'd love to hear more abo...", time: '10:42 AM', unread: true },
    { id: 2, name: 'Rohan M.', initials: 'RM', match: 88, isOnline: false, lastMsg: "That sounds like a won...", time: 'Yesterday', unread: true },
    { id: 3, name: 'Ananya K.', initials: 'AK', match: 85, isOnline: false, lastMsg: "Are you attending the gal...", time: 'Tue', unread: false },
];

const MOCK_MESSAGES = [
    { id: 1, sent: true, text: 'Good morning, Sarah. Yes, absolutely. It\'s the one time of the week we all make sure to disconnect and just be present. Are your family dinners usually large gatherings?', time: '10:35 AM' },
    { id: 2, sent: false, text: 'Usually just immediate family, but we often host extended family during holidays. It gets quite loud but it\'s wonderful. I\'d love to hear more about your recent trip to Kyoto, the photos looked serene.', time: '10:42 AM' },
];

// ===== INIT =====
document.addEventListener('DOMContentLoaded', async () => {
    // Auth check
    await checkAuth();

    // Navigation setup
    setupNavigation();

    // Sidebar mobile
    setupMobileSidebar();

    // Load page content
    loadProfilePage();
    await loadDiscoveryProfiles();
    renderProfilesGrid(discoveryProfiles);
    renderConversations();
    renderMatches();
    renderSwipeCard();
    renderPotentialMatches();
    renderSwipeAIPick();

    // Swipe buttons
    setupSwipeActions();

    // Chat
    setupChat();

    // Matches tabs
    setupMatchesTabs();

    // Toast dismiss
    const toastClose = document.getElementById('ai-notif-close');
    if (toastClose) {
        toastClose.addEventListener('click', () => {
            const toast = document.getElementById('ai-notif-toast');
            if (toast) toast.style.display = 'none';
        });
        // Auto hide after 6s
        setTimeout(() => {
            const toast = document.getElementById('ai-notif-toast');
            if (toast) toast.style.display = 'none';
        }, 6000);
    }

    // PM view all
    document.querySelector('.pm-view-all')?.addEventListener('click', (e) => {
        e.preventDefault();
        navigateTo('matches');
    });

    // Logout
    document.getElementById('sidebar-logout')?.addEventListener('click', handleLogout);

    // Edit profile redirect
    document.getElementById('btn-edit-profile')?.addEventListener('click', () => {
        window.location.href = '/complete-profile';
    });

    // Load more profiles
    document.getElementById('load-more-btn')?.addEventListener('click', () => {
        renderMoreProfiles();
    });

    // Search submit
    document.getElementById('search-submit-btn')?.addEventListener('click', handleSearch);
    document.getElementById('search-input')?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleSearch();
    });

    // Category pills
    document.querySelectorAll('.cat-pill').forEach(pill => {
        pill.addEventListener('click', () => {
            document.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
        });
    });

    // Upgrade button — navigate to premium page
    document.getElementById('upgrade-btn')?.addEventListener('click', (e) => {
        e.preventDefault();
        navigateTo('premium');
    });

    // ===== SETTINGS TABS =====
    document.getElementById('settings-tabs')?.querySelectorAll('.settings-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.settings-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.settings-tab-body').forEach(b => b.classList.remove('active'));
            tab.classList.add('active');
            const target = document.getElementById('stab-' + tab.dataset.stab);
            if (target) target.classList.add('active');
        });
    });

    // ===== SETTINGS SAVE BUTTON =====
    document.getElementById('sf-save-btn')?.addEventListener('click', () => {
        showNotification('✓ Settings saved successfully!');
    });

    // ===== PREMIUM BILLING TOGGLE =====
    document.getElementById('btn-monthly')?.addEventListener('click', () => {
        billingPeriod = 'monthly';
        document.getElementById('btn-monthly').classList.add('active');
        document.getElementById('btn-yearly').classList.remove('active');
        updatePrices();
    });

    document.getElementById('btn-yearly')?.addEventListener('click', () => {
        billingPeriod = 'yearly';
        document.getElementById('btn-yearly').classList.add('active');
        document.getElementById('btn-monthly').classList.remove('active');
        updatePrices();
    });
});

// ===== AUTH CHECK =====
async function checkAuth() {
    try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
            window.location.href = '/login';
            return;
        }
        const data = await res.json();
        currentUser = data.user;
        populateUserUI(data.user);
    } catch (err) {
        window.location.href = '/login';
    }
}

function populateUserUI(user) {
    const name = user.fullName || user.full_name || 'User';
    const firstName = name.split(' ')[0];
    const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

    // Sidebar
    setTextIfExists('sidebar-user-name', firstName);
    setTextIfExists('sidebar-initials', initials);

    // Topbar avatars
    setTextIfExists('topbar-initials', initials);
    setTextIfExists('swipe-topbar-initials', initials);

    // Profile page
    setTextIfExists('profile-hero-name', name);
    setTextIfExists('main-profile-initials', initials);
    setTextIfExists('profile-page-title', 'My Profile');

    // Fetch and show actual profile photos if uploaded
    fetch('/api/auth/photos')
        .then(res => res.ok ? res.json() : null)
        .then(data => {
            if (data && data.photos) {
                const primary = data.photos.find(p => p.is_primary === 1 || p.is_primary === true);
                if (primary) {
                    const imgHtml = `<img src="${primary.photo_url}" alt="Profile Photo" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;
                    const sidebar = document.getElementById('sidebar-avatar');
                    const topbar = document.getElementById('topbar-avatar');
                    const swipeTopbar = document.getElementById('swipe-topbar-avatar');
                    const hero = document.getElementById('main-profile-photo');
                    
                    if (sidebar) sidebar.innerHTML = imgHtml;
                    if (topbar) topbar.innerHTML = imgHtml;
                    if (swipeTopbar) swipeTopbar.innerHTML = imgHtml;
                    if (hero) hero.innerHTML = imgHtml;
                }
            }
        })
        .catch(err => console.error('Error fetching user photos:', err));

    // Meta info
    const ageTxt = user.dob ? calcAge(user.dob) + ' years' : '—';
    setTextIfExists('profile-age-prof', ageTxt);
    setTextIfExists('profile-hero-meta', ageTxt);
    setTextIfExists('location-text', `Based in ${user.city || '—'}`);
    setTextIfExists('profile-city-prof', user.city || '—');

    // Profile fields
    setTextIfExists('p-religion', user.religion || '—');
    setTextIfExists('p-language', user.mother_tongue || user.language || '—');
    setTextIfExists('p-marital', user.marital_status || 'Never Married');
    setTextIfExists('p-height', user.height || '—');
    setTextIfExists('p-community', user.community || '—');
    setTextIfExists('p-education', user.education || '—');
    setTextIfExists('p-college', user.college || '—');
    setTextIfExists('p-employer', user.employer || user.company || '—');
    setTextIfExists('p-income', user.income || '—');
    setTextIfExists('p-family-type', user.family_type || '—');
    setTextIfExists('p-father', user.father_profession || '—');
    setTextIfExists('p-mother', user.mother_profession || '—');
    setTextIfExists('p-siblings', user.siblings || '—');
    setTextIfExists('p-diet', user.diet || '—');

    if (user.about || user.bio || user.description) {
        setTextIfExists('profile-about-text', user.about || user.bio || user.description);
    }

    // Settings
    setTextIfExists('settings-email', user.email || '—');
    setTextIfExists('settings-phone', user.phone || '—');
    setTextIfExists('settings-topbar-initials', initials);

    // Settings form auto-fill
    const sfMap = {
        'sf-fullname': user.fullName || user.full_name || '',
        'sf-email': user.email || '',
        'sf-phone': user.phone || '',
        'sf-city': user.city || '',
        'sf-state': user.state || '',
        'sf-country': user.country || '',
    };
    for (const [id, val] of Object.entries(sfMap)) {
        const el = document.getElementById(id);
        if (el && val) el.value = val;
    }
    if (user.dob) {
        const dobEl = document.getElementById('sf-dob');
        if (dobEl) dobEl.value = user.dob.split('T')[0];
    }
    if (user.gender) {
        const genderEl = document.getElementById('sf-gender');
        if (genderEl) {
            for (const opt of genderEl.options) {
                if (opt.text.toLowerCase() === user.gender.toLowerCase()) { opt.selected = true; break; }
            }
        }
    }

    // Hobbies
    if (user.hobbies) {
        const hobbiesEl = document.getElementById('p-hobbies');
        if (hobbiesEl) {
            const hobbiesArr = user.hobbies.split(',').map(h => h.trim()).filter(Boolean);
            hobbiesEl.innerHTML = hobbiesArr.map(h => `<span class="hobby-tag">${h}</span>`).join('') || '<span class="hobby-tag">Add hobbies</span>';
        }
    }

    // Profile strength based on filled fields
    const filledFields = [user.religion, user.education, user.city, user.phone, user.about, user.height, user.employer].filter(Boolean).length;
    const strength = Math.min(Math.round((filledFields / 7) * 100), 100);
    const strengthBar = document.getElementById('ai-strength-bar');
    const strengthPct = document.getElementById('ai-strength-pct');
    if (strengthBar) strengthBar.style.width = strength + '%';
    if (strengthPct) strengthPct.textContent = strength + '%';
}

function calcAge(dob) {
    if (!dob) return '—';
    const birth = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
}

function setTextIfExists(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

// ===== NAVIGATION =====
function setupNavigation() {
    document.querySelectorAll('.sidebar-nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.dataset.page;
            if (page) navigateTo(page);

            // Close mobile sidebar
            closeMobileSidebar();
        });
    });
}

function navigateTo(pageName) {
    // Hide all pages
    document.querySelectorAll('.dash-page').forEach(page => page.classList.remove('active'));

    // Show target page
    const targetPage = document.getElementById('page-' + pageName);
    if (targetPage) targetPage.classList.add('active');

    // Update nav active state
    document.querySelectorAll('.sidebar-nav-item').forEach(item => item.classList.remove('active'));
    const activeNav = document.querySelector(`[data-page="${pageName}"]`);
    if (activeNav) activeNav.classList.add('active');

    // Special actions on page navigate
    if (pageName === 'swipe') {
        renderSwipeCard();
    }
}

// ===== MOBILE SIDEBAR =====
function setupMobileSidebar() {
    const menuBtn = document.getElementById('mobile-menu-btn');
    const overlay = document.getElementById('sidebar-overlay');

    menuBtn?.addEventListener('click', toggleMobileSidebar);
    overlay?.addEventListener('click', closeMobileSidebar);
}

function toggleMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    sidebar?.classList.toggle('open');
    overlay?.classList.toggle('active');
}

function closeMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    sidebar?.classList.remove('open');
    overlay?.classList.remove('active');
}

// ===== LOAD PROFILE PAGE =====
function loadProfilePage() {
    // Fetch full profile if available
    fetch('/api/auth/profile')
        .then(res => res.ok ? res.json() : null)
        .then(data => {
            if (data && data.user) {
                populateUserUI(data.user);
            }
        })
        .catch(() => {});
}

// ===== LOAD DISCOVERY PROFILES FROM SQLITE =====
async function loadDiscoveryProfiles() {
    try {
        const res = await fetch('/api/auth/discovery');
        if (!res.ok) {
            console.error('Failed to fetch discovery profiles');
            discoveryProfiles = MOCK_PROFILES;
            swipeProfiles = MOCK_PROFILES;
            return;
        }
        const data = await res.json();
        if (data.profiles && data.profiles.length > 0) {
            const oppositeGender = currentUser && currentUser.gender && currentUser.gender.toLowerCase() === 'male' ? 'female' : 'male';
            discoveryProfiles = data.profiles.filter(p => p.gender && p.gender.toLowerCase() === oppositeGender);
            swipeProfiles = data.profiles;
            
            const countEl = document.getElementById('discover-count');
            if (countEl) countEl.textContent = `(${discoveryProfiles.length} Results)`;
            
            const loadMoreBtn = document.getElementById('load-more-btn');
            if (loadMoreBtn) loadMoreBtn.style.display = 'none';
        } else {
            discoveryProfiles = MOCK_PROFILES;
            swipeProfiles = MOCK_PROFILES;
        }
    } catch (err) {
        console.error('Error loading discovery profiles:', err);
        discoveryProfiles = MOCK_PROFILES;
        swipeProfiles = MOCK_PROFILES;
    }
}

// ===== RENDER PROFILES GRID =====
function renderProfilesGrid(profiles = MOCK_PROFILES) {
    const grid = document.getElementById('profiles-grid');
    if (!grid) return;

    grid.innerHTML = profiles.map(p => `
        <div class="profile-card" data-id="${p.id}">
            <div class="profile-card-image">
                ${p.photo ? `<img src="${p.photo}" alt="${p.name}">` : `
                <div class="profile-card-image-bg">
                    ${p.initials || '?'}
                </div>`}
                <div class="profile-card-badges">
                    ${p.isTopPick ? '<span class="card-top-badge">⭐ Top Pick</span>' : '<span></span>'}
                    <span class="card-match-badge">${p.match}% Match</span>
                </div>
                <button class="card-like-btn" aria-label="Like ${p.name}">♡</button>
            </div>
            <div class="profile-card-body">
                <div class="card-name">
                    <span>${p.name}</span>
                    <span class="card-age">${p.age} yrs</span>
                </div>
                <div class="card-meta">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="12" height="12"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                    ${p.profession}
                </div>
                <div class="card-detail-row">
                    <div class="card-detail">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="11" height="11"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/></svg>
                        ${p.education || 'Graduate'}
                    </div>
                    <div class="card-detail">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="11" height="11"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        ${p.city}
                    </div>
                </div>
                <div class="card-locked-msg">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="11" height="11"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    Full details available after mutual match.
                </div>
                <div class="card-actions">
                    <button class="card-btn card-btn-view" onclick="viewProfile(${p.id})">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="12" height="12"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        View
                    </button>
                    <button class="card-btn card-btn-request" onclick="requestProfile(${p.id})">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="12" height="12"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                        Request
                    </button>
                </div>
            </div>
        </div>
    `).join('');

    // Like button handlers
    grid.querySelectorAll('.card-like-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            btn.textContent = btn.textContent === '♡' ? '♥' : '♡';
            btn.style.color = btn.textContent === '♥' ? '#e91e63' : '';
        });
    });
}

function renderMoreProfiles() {
    const grid = document.getElementById('profiles-grid');
    if (!grid) return;
    const extraProfiles = [
        { id: 7, name: 'Nadia Islam', age: 28, profession: 'Pharmacist', religion: 'Muslim', education: 'Pharm.D', city: 'Dubai', match: 68, initials: 'NI', tags: ['Nearby'] },
        { id: 8, name: 'Riya Patel', age: 25, profession: 'UX Designer', religion: 'Hindu', education: 'B.Des', city: 'Pune', match: 65, initials: 'RP', tags: [] },
        { id: 9, name: 'Hina Khan', age: 29, profession: 'Lawyer', religion: 'Muslim', education: 'LLB', city: 'Islamabad', match: 71, initials: 'HK', tags: ['AI Recommended'] },
    ];

    const extraHTML = extraProfiles.map(p => `
        <div class="profile-card" data-id="${p.id}">
            <div class="profile-card-image">
                <div class="profile-card-image-bg">
                    ${p.initials}
                    <div class="profile-card-badges">
                        <span></span>
                        <span class="card-match-badge">${p.match}% Match</span>
                    </div>
                </div>
                <button class="card-like-btn">♡</button>
            </div>
            <div class="profile-card-body">
                <div class="card-name"><span>${p.name}</span><span class="card-age">${p.age} yrs</span></div>
                <div class="card-meta">${p.profession}</div>
                <div class="card-locked-msg">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="11" height="11"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                    Full details available after mutual match.
                </div>
                <div class="card-actions">
                    <button class="card-btn card-btn-view">View</button>
                    <button class="card-btn card-btn-request">Request</button>
                </div>
            </div>
        </div>
    `).join('');

    grid.insertAdjacentHTML('beforeend', extraHTML);

    // Update count
    const countEl = document.getElementById('discover-count');
    if (countEl) countEl.textContent = '(145 Results)';

    // Hide load more
    document.getElementById('load-more-btn').style.display = 'none';

    // Like buttons for new cards
    grid.querySelectorAll('.card-like-btn').forEach(btn => {
        btn.onclick = null;
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            btn.textContent = btn.textContent === '♡' ? '♥' : '♡';
        });
    });
}

function handleSearch() {
    const query = document.getElementById('search-input')?.value.toLowerCase().trim();
    if (!query) {
        renderProfilesGrid(discoveryProfiles);
        return;
    }
    const filtered = discoveryProfiles.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.profession.toLowerCase().includes(query) ||
        p.city.toLowerCase().includes(query) ||
        p.education?.toLowerCase().includes(query)
    );
    renderProfilesGrid(filtered);
    const countEl = document.getElementById('discover-count');
    if (countEl) countEl.textContent = `(${filtered.length} Results)`;
}

function viewProfile(id) {
    const profile = discoveryProfiles.find(p => p.id === id);
    if (profile) showNotification(`Viewing ${profile.name}'s profile`);
}

function requestProfile(id) {
    const profile = discoveryProfiles.find(p => p.id === id);
    if (profile) showNotification(`Request sent to ${profile.name}!`);
}

// ===== RENDER CONVERSATIONS =====
function renderConversations() {
    const list = document.getElementById('conv-list');
    if (!list) return;

    // Dynamically generate conversations from discoveryProfiles of opposite gender
    const realConvs = discoveryProfiles.slice(0, 3).map((p, index) => {
        const msgs = [
            "Hello, I read your bio and found it interesting!",
            "Hi there! Would love to connect and chat.",
            "How are you? I'd love to hear more about your work."
        ];
        return {
            id: p.id,
            name: p.name,
            initials: p.initials,
            photo: p.photo,
            match: p.match,
            isOnline: index === 0,
            lastMsg: msgs[index % msgs.length],
            time: '10:42 AM',
            unread: index === 0
        };
    });

    const displayConvs = realConvs;

    if (displayConvs.length === 0) {
        list.innerHTML = `
            <div style="text-align:center; padding: 40px 15px; color: var(--dash-text-muted);">
                <p style="font-size: 0.85rem; margin-bottom: 12px;">No conversations yet.</p>
                <button onclick="navigateTo('search')" style="background: none; border: 1px solid var(--dash-gold); color: var(--dash-gold); padding: 8px 16px; border-radius: 20px; font-size: 0.75rem; cursor: pointer; font-weight: 600; transition: all 0.3s ease;">
                    Find Matches
                </button>
            </div>
        `;
        return;
    }

    list.innerHTML = displayConvs.map(conv => `
        <div class="conv-item" data-conv-id="${conv.id}">
            <div class="conv-avatar-wrap">
                <div class="conv-avatar">
                    ${conv.photo ? `<img src="${conv.photo}" alt="${conv.name}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">` : conv.initials}
                </div>
                ${conv.isOnline ? '<span class="conv-online-dot"></span>' : ''}
                <span class="conv-match-badge">${conv.match}% Match</span>
            </div>
            <div class="conv-content">
                <span class="conv-name">${conv.name}</span>
                <span class="conv-preview">${conv.lastMsg}</span>
            </div>
            <div class="conv-meta">
                <span class="conv-time">${conv.time}</span>
                ${conv.unread ? '<div class="conv-unread-dot"></div>' : ''}
            </div>
        </div>
    `).join('');

    list.querySelectorAll('.conv-item').forEach(item => {
        item.addEventListener('click', () => {
            list.querySelectorAll('.conv-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            const convId = parseInt(item.dataset.convId);
            openConversation(convId, displayConvs);
        });
    });
}

function openConversation(convId, conversations = MOCK_CONVERSATIONS) {
    const conv = conversations.find(c => c.id === convId) || MOCK_CONVERSATIONS.find(c => c.id === convId);
    if (!conv) return;

    currentConversation = conv;

    document.getElementById('chat-empty-state').style.display = 'none';
    document.getElementById('chat-active').style.display = 'flex';

    setTextIfExists('chat-header-name', conv.name);
    const status = conv.isOnline ? `Online now • ${conv.match}% Match` : `${conv.match}% Match`;
    setTextIfExists('chat-header-status', status);
    if (!conv.isOnline) {
        const statusEl = document.getElementById('chat-header-status');
        if (statusEl) statusEl.style.color = '';
    }

    const avatarEl = document.getElementById('chat-header-avatar');
    if (avatarEl) {
        avatarEl.innerHTML = conv.photo ? `<img src="${conv.photo}" alt="${conv.name}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">` : conv.initials;
    }

    renderChatMessages(MOCK_MESSAGES);
}

function renderChatMessages(messages) {
    const container = document.getElementById('chat-messages');
    if (!container) return;

    container.innerHTML = `<div class="chat-date-divider">TODAY</div>` +
        messages.map(msg => `
            <div class="chat-bubble-row ${msg.sent ? 'sent' : 'received'}">
                ${!msg.sent ? `<div class="bubble-avatar">${currentConversation?.initials || '?'}</div>` : ''}
                <div class="chat-bubble ${msg.sent ? 'sent' : 'received'}">
                    ${msg.text}
                    <div class="bubble-meta">${msg.time}${msg.sent ? ' ✓✓' : ''}</div>
                </div>
            </div>
        `).join('');

    container.scrollTop = container.scrollHeight;
}

function setupChat() {
    const sendBtn = document.getElementById('chat-send-btn');
    const chatInput = document.getElementById('chat-input');

    const sendMessage = () => {
        const text = chatInput?.value.trim();
        if (!text || !currentConversation) return;

        MOCK_MESSAGES.push({ id: Date.now(), sent: true, text, time: formatTime(new Date()) });
        renderChatMessages(MOCK_MESSAGES);
        chatInput.value = '';

        // Simulate reply
        setTimeout(() => {
            const replies = [
                "That's really interesting! Tell me more.",
                "I completely agree with you on that.",
                "Yes, I'd love to explore that topic further.",
                "That's a wonderful perspective.",
            ];
            MOCK_MESSAGES.push({
                id: Date.now() + 1,
                sent: false,
                text: replies[Math.floor(Math.random() * replies.length)],
                time: formatTime(new Date())
            });
            renderChatMessages(MOCK_MESSAGES);
        }, 1500);
    };

    sendBtn?.addEventListener('click', sendMessage);
    chatInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Conversation starters
    document.querySelectorAll('.starter-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            if (chatInput) chatInput.value = chip.textContent.replace(/"/g, '');
            chatInput?.focus();
        });
    });

    // Search conversations
    document.getElementById('conv-search')?.addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase();
        document.querySelectorAll('.conv-item').forEach(item => {
            const name = item.querySelector('.conv-name')?.textContent.toLowerCase() || '';
            item.style.display = name.includes(q) ? '' : 'none';
        });
    });
}

function formatTime(date) {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

// ===== RENDER MATCHES =====
function renderMatches() {
    const grid = document.getElementById('matches-grid');
    if (!grid) return;

    // Dynamically generate matches from discoveryProfiles of opposite gender
    const realMatches = discoveryProfiles.slice(0, 3).map((p, index) => ({
        id: p.id,
        name: p.name,
        age: p.age,
        profession: p.profession,
        city: p.city,
        community: p.religion,
        match: p.match,
        initials: p.initials,
        photo: p.photo,
        isTopPick: index === 0
    }));

    if (realMatches.length === 0) {
        grid.innerHTML = `
            <div class="empty-state-card" style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--dash-text-muted);">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="48" height="48" style="margin-bottom: 12px; opacity: 0.5;">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
                <h4 style="font-family: 'Playfair Display', serif; font-size: 1.2rem; color: var(--dash-text-dark); margin-bottom: 8px;">No Matches Yet</h4>
                <p style="font-size: 0.85rem; max-width: 300px; margin: 0 auto 16px;">Matches are created when you request details or like profiles of the opposite gender.</p>
                <button class="swipe-ai-view-btn" onclick="navigateTo('swipe')" style="display: inline-flex; align-items: center; gap: 8px; margin: 0 auto; background: var(--dash-gold); color: var(--dash-maroon-deep); border: none; padding: 8px 16px; border-radius: 20px; font-weight: 600; cursor: pointer;">
                    Go to Swipe & Discover
                </button>
            </div>
        `;
        return;
    }

    const displayMatches = realMatches;

    grid.innerHTML = displayMatches.map(m => `
        <div class="match-card">
            <div class="match-card-image">
                ${m.photo ? `<img src="${m.photo}" alt="${m.name}" style="width:100%; height:100%; object-fit:cover;">` : m.initials}
                ${m.isTopPick ? `<span class="match-top-pick">✦ ${m.match}% Top Match</span>` : `<span class="match-pct-badge">${m.match}% Match</span>`}
            </div>
            <div class="match-card-body">
                <div class="match-name-row">
                    <span class="match-name">${m.name}</span>
                    <span class="match-age">${m.age} yrs</span>
                </div>
                <div class="match-meta">${m.profession} • ${m.city} • ${m.community}</div>
                <div class="match-actions">
                    <button class="match-msg-btn" onclick="openMessagesForMatch('${m.name}')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="14" height="14"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                        Message
                    </button>
                    <div class="match-secondary-actions">
                        <button class="match-sec-btn">View Profile</button>
                        <button class="match-sec-btn">Match Details</button>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
}

function setupMatchesTabs() {
    document.querySelectorAll('.match-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.match-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
        });
    });
}

function openMessagesForMatch(name) {
    navigateTo('messages');
    const list = document.getElementById('conv-list');
    const items = list ? list.querySelectorAll('.conv-item') : [];
    
    let foundItem = null;
    items.forEach(item => {
        const itemName = item.querySelector('.conv-name')?.textContent;
        if (itemName && itemName.startsWith(name.split(' ')[0])) {
            foundItem = item;
        }
    });

    if (foundItem) {
        setTimeout(() => foundItem.click(), 100);
    }
}

// ===== SWIPE CARD =====
function renderSwipeCard() {
    const wrapper = document.getElementById('swipe-card-wrapper');
    if (!wrapper) return;

    const oppositeGender = currentUser && currentUser.gender && currentUser.gender.toLowerCase() === 'male' ? 'female' : 'male';
    const filteredSwipe = swipeProfiles.filter(p => p.gender && p.gender.toLowerCase() === oppositeGender);
    const pool = filteredSwipe.length > 0 ? filteredSwipe : (swipeProfiles.length > 0 ? swipeProfiles : MOCK_PROFILES);
    const profile = pool[swipeIndex % pool.length];

    wrapper.innerHTML = `
        <div class="swipe-card" id="active-swipe-card">
            <div class="swipe-card-img">
                ${profile.photo ? `<img src="${profile.photo}" alt="${profile.name}">` : profile.initials}
                <span class="swipe-card-match-badge">${profile.match}% Match</span>
                <span class="swipe-card-location">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="11" height="11"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    ${profile.city}
                </span>
            </div>
            <div class="swipe-card-body">
                <div class="swipe-card-name">${profile.name}, ${profile.age}</div>
                <div class="swipe-card-meta">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="12" height="12"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                    ${profile.profession} • ${profile.religion || 'Muslim'}
                </div>
                <div class="swipe-card-tags">
                    ${(profile.tags || []).map(tag => `<span class="swipe-tag">${tag}</span>`).join('')}
                </div>
                <div class="swipe-card-actions">
                    <button class="swipe-card-view-btn" onclick="navigateTo('search')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="13" height="13"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        View Profile
                    </button>
                    <button class="swipe-card-preview-btn">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="13" height="13"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                        Quick Preview
                    </button>
                </div>
            </div>
        </div>
    `;

    updateSwipeStats();
}

function setupSwipeActions() {
    document.getElementById('swipe-pass')?.addEventListener('click', () => {
        animateSwipe('left');
    });

    document.getElementById('swipe-like')?.addEventListener('click', () => {
        swipeStats.likes++;
        animateSwipe('right');
    });

    document.getElementById('swipe-request')?.addEventListener('click', () => {
        swipeStats.requests++;
        showNotification('Request sent!');
        animateSwipe('right');
    });

    document.getElementById('swipe-undo')?.addEventListener('click', () => {
        if (swipeIndex > 0) {
            swipeIndex--;
            renderSwipeCard();
        }
    });
}

function animateSwipe(direction) {
    const card = document.getElementById('active-swipe-card');
    if (!card) return;

    swipeStats.viewed++;
    swipeIndex++;

    card.style.transition = 'transform 0.3s ease, opacity 0.3s ease';
    card.style.transform = `translateX(${direction === 'left' ? '-' : ''}120%) rotate(${direction === 'left' ? '-' : ''}15deg)`;
    card.style.opacity = '0';

    setTimeout(() => {
        renderSwipeCard();
    }, 300);
}

function updateSwipeStats() {
    setTextIfExists('sw-viewed', swipeStats.viewed);
    setTextIfExists('sw-likes', swipeStats.likes);
    setTextIfExists('sw-matches', swipeStats.matches);
    setTextIfExists('sw-requests', swipeStats.requests);
}

// ===== LOGOUT =====
async function handleLogout() {
    try {
        await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) { }
    window.location.href = '/';
}

// ===== NOTIFICATIONS =====
function showNotification(msg) {
    const notif = document.createElement('div');
    notif.style.cssText = `
        position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
        background: #3d0d20; color: #f5e6d0; padding: 12px 24px;
        border-radius: 30px; font-size: 0.8rem; font-weight: 600;
        border: 1px solid rgba(212,168,83,0.3); z-index: 9999;
        animation: slideInUp 0.3s ease-out; box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    `;
    notif.textContent = msg;
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 2500);
}

function showPremiumModal() {
    navigateTo('premium');
}

function updatePrices() {
    const p = PRICES[billingPeriod];
    const premEl = document.getElementById('price-premium');
    const goldEl = document.getElementById('price-gold');
    if (premEl) premEl.textContent = p.premium;
    if (goldEl) goldEl.textContent = p.gold;
}

// ===== RENDER POTENTIAL MATCHES SIDEBAR =====
function renderPotentialMatches() {
    const list = document.getElementById('pm-list');
    if (!list) return;

    if (discoveryProfiles.length === 0) {
        list.innerHTML = `<div style="font-size:0.8rem; color:var(--dash-text-muted); padding:10px 0;">No suggestions available.</div>`;
        return;
    }

    // Show 2 suggestions from discovery
    const suggestions = discoveryProfiles.slice(0, 2);
    list.innerHTML = suggestions.map(p => `
        <div class="pm-item" style="cursor: pointer;" onclick="navigateTo('search')">
            <div class="pm-avatar" style="overflow: hidden; display: flex; align-items: center; justify-content: center; background: none;">
                ${p.photo ? `<img src="${p.photo}" alt="${p.name}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">` : p.initials}
            </div>
            <div class="pm-info">
                <span class="pm-name">${p.name.split(' ')[0]} ${p.name.split(' ')[1] ? p.name.split(' ')[1][0] + '.' : ''}</span>
                <span class="pm-desc">${p.profession.split(' ')[0]} • ${p.age} yrs</span>
            </div>
            <button class="pm-like-btn" aria-label="Like" onclick="event.stopPropagation(); this.textContent = this.textContent === '♡' ? '♥' : '♡'; this.style.color = this.textContent === '♥' ? '#e91e63' : '';">♡</button>
        </div>
    `).join('');
}

// ===== RENDER SWIPE PAGE AI RECOMMENDATION =====
function renderSwipeAIPick() {
    const container = document.getElementById('swipe-ai-person');
    if (!container) return;

    if (discoveryProfiles.length === 0) {
        container.innerHTML = `<div style="font-size:0.8rem; color:var(--dash-text-muted);">No recommendations today.</div>`;
        return;
    }

    // Select a premium profile or the first profile as the AI Pick
    const aiPick = discoveryProfiles.find(p => p.isTopPick) || discoveryProfiles[0];
    if (aiPick) {
        container.innerHTML = `
            <div class="swipe-ai-avatar" style="overflow: hidden; display: flex; align-items: center; justify-content: center; background: none;">
                ${aiPick.photo ? `<img src="${aiPick.photo}" alt="${aiPick.name}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">` : aiPick.initials}
            </div>
            <div class="swipe-ai-info">
                <span class="swipe-ai-name">${aiPick.name}, ${aiPick.age}</span>
                <span class="swipe-ai-role">${aiPick.profession}</span>
            </div>
        `;
        // Setup click handler for "View Details" button in the same block
        const viewBtn = container.parentElement.querySelector('.swipe-ai-view-btn');
        if (viewBtn) {
            viewBtn.onclick = () => {
                navigateTo('search');
                const searchInput = document.getElementById('search-input');
                if (searchInput) {
                    searchInput.value = aiPick.name;
                    handleSearch();
                }
            };
        }
    }
}
