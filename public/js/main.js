/* ============================
   HUMSAFAR — Home Page JS
   ============================ */

document.addEventListener('DOMContentLoaded', () => {

    // ===== CHECK AUTH STATE =====
    checkAuthState();

    // ===== MOBILE MENU =====
    const mobileToggle = document.getElementById('mobile-toggle');
    const navLinks = document.getElementById('nav-links');

    if (mobileToggle && navLinks) {
        mobileToggle.addEventListener('click', () => {
            mobileToggle.classList.toggle('active');
            navLinks.classList.toggle('active');
        });

        navLinks.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                mobileToggle.classList.remove('active');
                navLinks.classList.remove('active');
            });
        });
    }

    // ===== LOAD STATS FROM API =====
    loadStats();

    // ===== LOAD RANDOM STORIES =====
    loadStories();

    // ===== ANIMATED STAT COUNTERS =====
    animateStats();
});

// ===== AUTH STATE =====
async function checkAuthState() {
    try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
            const data = await res.json();
            // Redirect to dashboard — logged in users get the full experience
            window.location.href = '/dashboard';
            return;
        }
    } catch (err) {
        // Not logged in, show home page
    }
}

function showLoggedInState(user) {
    const navActions = document.getElementById('nav-actions');
    const navUserInfo = document.getElementById('nav-user-info');
    const userGreeting = document.getElementById('user-greeting');
    const createBtn = document.getElementById('btn-create-profile');
    const heroLoginBtn = document.getElementById('btn-hero-login');

    if (navActions) navActions.style.display = 'none';
    if (navUserInfo) {
        navUserInfo.style.display = 'flex';
        userGreeting.textContent = `Hello, ${user.fullName.split(' ')[0]}`;
    }

    if (createBtn) {
        createBtn.textContent = 'MY PROFILE';
        createBtn.href = '#';
    }

    if (heroLoginBtn) {
        heroLoginBtn.style.display = 'none';
    }

    // Logout handler
    const logoutBtn = document.getElementById('btn-nav-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            try {
                await fetch('/api/auth/logout', { method: 'POST' });
                window.location.reload();
            } catch (err) {
                window.location.reload();
            }
        });
    }
}

// ===== STATS =====
async function loadStats() {
    try {
        const res = await fetch('/api/stats');
        const data = await res.json();

        updateStatDisplay('stat-members', data.members, '+');
        updateStatDisplay('stat-matches', data.successfulMatches, '+');
        updateStatDisplay('stat-profiles', data.verifiedProfiles, '+');
        updateStatDisplay('stat-satisfaction', data.satisfaction, '%');
    } catch (err) {
        console.log('Stats loaded with defaults');
    }
}

function updateStatDisplay(elementId, value, suffix) {
    const el = document.getElementById(elementId);
    if (el) {
        if (value >= 1000) {
            el.textContent = value.toLocaleString() + suffix;
        } else {
            el.textContent = value + suffix;
        }
    }
}

function animateStats() {
    const statItems = document.querySelectorAll('.stat-item');

    statItems.forEach((item, index) => {
        const numberEl = item.querySelector('.stat-number');
        if (!numberEl) return;

        const target = parseInt(item.dataset.target);
        if (isNaN(target)) return;

        const suffix = target < 100 ? '%' : '+';

        setTimeout(() => {
            animateCounter(numberEl, target, suffix);
        }, 300 + index * 150);
    });
}

function animateCounter(element, target, suffix) {
    const duration = 1500;
    const frameDuration = 1000 / 60;
    const totalFrames = Math.round(duration / frameDuration);
    let frame = 0;

    const easeOutQuart = t => 1 - Math.pow(1 - t, 4);

    const counter = setInterval(() => {
        frame++;
        const progress = easeOutQuart(frame / totalFrames);
        const currentValue = Math.round(target * progress);

        element.textContent = (currentValue >= 1000
            ? currentValue.toLocaleString()
            : currentValue) + suffix;

        if (frame === totalFrames) {
            clearInterval(counter);
            element.textContent = (target >= 1000
                ? target.toLocaleString()
                : target) + suffix;
        }
    }, frameDuration);
}

// ===== SUCCESS STORIES =====
let storiesData = [];
let currentStoryIndex = 0;

async function loadStories() {
    try {
        const res = await fetch('/api/stories');
        const data = await res.json();
        storiesData = data.stories;
        renderStories();
        startStoryRotation();
    } catch (err) {
        // Fallback stories
        storiesData = [
            {
                text: "Humsafar's AI matching connected us based on our shared values.",
                couple: "Ahmed & Sana",
                initials: "A & S",
                year: "2025"
            },
            {
                text: "The compatibility score was spot on. Three months later, our families met!",
                couple: "Rahul & Fatima",
                initials: "R & F",
                year: "2025"
            },
            {
                text: "The platform made it so easy to find someone who truly understands our values.",
                couple: "Kabir & Meera",
                initials: "K & M",
                year: "2024"
            }
        ];
        renderStories();
        startStoryRotation();
    }
}

function renderStories() {
    const track = document.getElementById('stories-track');
    if (!track || storiesData.length === 0) return;

    track.innerHTML = storiesData.map(story => `
        <div class="story-card">
            <div class="story-quote">"</div>
            <p class="story-text">${story.text}</p>
            <div class="story-author">
                <div class="author-avatar">${story.initials}</div>
                <div class="author-info">
                    <span class="author-name">${story.couple}</span>
                    <span class="author-date">Matched in ${story.year}</span>
                </div>
            </div>
        </div>
    `).join('');
}

function startStoryRotation() {
    // Refresh stories every 8 seconds with new random ones
    setInterval(async () => {
        try {
            const res = await fetch('/api/stories');
            const data = await res.json();
            const track = document.getElementById('stories-track');
            if (track) {
                track.style.opacity = '0';
                track.style.transform = 'translateY(10px)';

                setTimeout(() => {
                    storiesData = data.stories;
                    renderStories();
                    track.style.opacity = '1';
                    track.style.transform = 'translateY(0)';
                }, 400);
            }
        } catch (err) {
            // Keep current stories
        }
    }, 8000);
}
