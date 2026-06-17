/* ============================
   HUMSAFAR — JavaScript
   ============================ */

document.addEventListener('DOMContentLoaded', () => {

    // ===== NAVBAR SCROLL EFFECT =====
    const navbar = document.getElementById('navbar');
    let lastScroll = 0;

    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;
        if (currentScroll > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
        lastScroll = currentScroll;
    });

    // ===== MOBILE MENU TOGGLE =====
    const mobileToggle = document.getElementById('mobile-toggle');
    const navLinks = document.getElementById('nav-links');

    if (mobileToggle) {
        mobileToggle.addEventListener('click', () => {
            mobileToggle.classList.toggle('active');
            navLinks.classList.toggle('active');
        });

        // Close menu on link click
        navLinks.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', () => {
                mobileToggle.classList.remove('active');
                navLinks.classList.remove('active');
            });
        });
    }

    // ===== ACTIVE NAV LINK ON SCROLL =====
    const sections = document.querySelectorAll('section[id]');
    const navLinksAll = document.querySelectorAll('.nav-link');

    function updateActiveNav() {
        const scrollY = window.pageYOffset + 100;
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            const sectionId = section.getAttribute('id');

            if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
                navLinksAll.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${sectionId}`) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }

    window.addEventListener('scroll', updateActiveNav);

    // ===== ANIMATED STAT COUNTERS =====
    const statItems = document.querySelectorAll('.stat-item');
    let statsAnimated = false;

    function animateCounter(element, target, suffix = '+') {
        const numberEl = element.querySelector('.stat-number');
        const duration = 2000;
        const frameDuration = 1000 / 60;
        const totalFrames = Math.round(duration / frameDuration);
        let frame = 0;

        const easeOutQuart = t => 1 - Math.pow(1 - t, 4);

        const counter = setInterval(() => {
            frame++;
            const progress = easeOutQuart(frame / totalFrames);
            const currentValue = Math.round(target * progress);

            if (target >= 1000) {
                numberEl.textContent = currentValue.toLocaleString() + suffix;
            } else {
                numberEl.textContent = currentValue + suffix;
            }

            if (frame === totalFrames) {
                clearInterval(counter);
                if (target >= 1000) {
                    numberEl.textContent = target.toLocaleString() + suffix;
                } else {
                    numberEl.textContent = target + suffix;
                }
            }
        }, frameDuration);
    }

    function checkStatsVisibility() {
        if (statsAnimated) return;

        const statsSection = document.getElementById('stats');
        if (!statsSection) return;

        const rect = statsSection.getBoundingClientRect();
        const isVisible = rect.top < window.innerHeight * 0.85 && rect.bottom > 0;

        if (isVisible) {
            statsAnimated = true;
            statItems.forEach((item, index) => {
                const target = parseInt(item.dataset.target);
                const suffix = target < 100 ? '%' : '+';
                setTimeout(() => {
                    animateCounter(item, target, suffix);
                }, index * 200);
            });
        }
    }

    window.addEventListener('scroll', checkStatsVisibility);
    checkStatsVisibility(); // Check on load

    // ===== SCROLL REVEAL ANIMATIONS =====
    const revealElements = document.querySelectorAll(
        '.step-card, .feature-card, .story-card, .cta-container, .section-title, .section-subtitle'
    );

    revealElements.forEach(el => el.classList.add('reveal'));

    function checkReveal() {
        revealElements.forEach(el => {
            const rect = el.getBoundingClientRect();
            const isVisible = rect.top < window.innerHeight * 0.88;
            if (isVisible) {
                el.classList.add('visible');
            }
        });
    }

    window.addEventListener('scroll', checkReveal);
    // Trigger initial check
    setTimeout(checkReveal, 100);

    // ===== SMOOTH SCROLL FOR ANCHOR LINKS =====
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href === '#') return;

            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                const offset = 72; // Navbar height
                const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - offset;
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // ===== STAGGER ANIMATION FOR CARDS =====
    function staggerCards(selector) {
        const cards = document.querySelectorAll(selector);
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry, i) => {
                if (entry.isIntersecting) {
                    const index = Array.from(cards).indexOf(entry.target);
                    entry.target.style.transitionDelay = `${index * 0.1}s`;
                    entry.target.classList.add('visible');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });

        cards.forEach(card => observer.observe(card));
    }

    staggerCards('.step-card');
    staggerCards('.feature-card');
    staggerCards('.story-card');

    // ===== PARALLAX EFFECT FOR HERO DECORATIVE ELEMENTS =====
    const decoCircle1 = document.querySelector('.deco-circle-1');
    const decoCircle2 = document.querySelector('.deco-circle-2');

    window.addEventListener('scroll', () => {
        const scrollY = window.pageYOffset;
        if (scrollY < window.innerHeight) {
            const factor = scrollY * 0.15;
            if (decoCircle1) {
                decoCircle1.style.transform = `translate(-50%, calc(-50% + ${factor}px))`;
            }
            if (decoCircle2) {
                decoCircle2.style.transform = `translate(-50%, calc(-50% + ${factor * 0.7}px))`;
            }
        }
    });

    // ===== CURSOR GLOW EFFECT ON HERO =====
    const hero = document.querySelector('.hero');

    if (hero && window.matchMedia('(hover: hover)').matches) {
        hero.addEventListener('mousemove', (e) => {
            const rect = hero.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            hero.style.setProperty('--mouse-x', `${x}px`);
            hero.style.setProperty('--mouse-y', `${y}px`);
        });
    }

});
