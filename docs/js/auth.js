/* ============================
   HUMSAFAR — Auth Forms JS
   ============================ */

document.addEventListener('DOMContentLoaded', () => {

    // ===== PASSWORD TOGGLE =====
    document.querySelectorAll('.toggle-password').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.dataset.target;
            const input = document.getElementById(targetId);
            if (!input) return;

            if (input.type === 'password') {
                input.type = 'text';
                btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
            } else {
                input.type = 'password';
                btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
            }
        });
    });

    // ===== LOGIN FORM =====
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // ===== SIGNUP FORM =====
    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);

        // T&C checkbox — enable/disable submit
        const termsCheckbox = document.getElementById('signup-terms');
        const submitBtn = document.getElementById('signup-submit');

        if (termsCheckbox && submitBtn) {
            termsCheckbox.addEventListener('change', () => {
                submitBtn.disabled = !termsCheckbox.checked;
            });
        }
    }
});

// ===== LOGIN HANDLER =====
async function handleLogin(e) {
    e.preventDefault();

    const errorEl = document.getElementById('login-error');
    const submitBtn = document.getElementById('login-submit');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoader = submitBtn.querySelector('.btn-loader');

    // Clear errors
    hideMessage(errorEl);

    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (!email || !password) {
        showError(errorEl, 'Please fill in all fields.');
        return;
    }

    // Show loading
    setLoading(submitBtn, btnText, btnLoader, true);

    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await res.json();

        if (res.ok) {
            // Success — redirect to home
            window.location.href = 'index.html';
        } else {
            showError(errorEl, data.error || 'Login failed. Please try again.');
        }
    } catch (err) {
        showError(errorEl, 'Network error. Please check your connection.');
    } finally {
        setLoading(submitBtn, btnText, btnLoader, false);
    }
}

// ===== SIGNUP HANDLER =====
async function handleSignup(e) {
    e.preventDefault();

    const errorEl = document.getElementById('signup-error');
    const successEl = document.getElementById('signup-success');
    const submitBtn = document.getElementById('signup-submit');
    const btnText = submitBtn.querySelector('.btn-text');
    const btnLoader = submitBtn.querySelector('.btn-loader');

    // Clear messages
    hideMessage(errorEl);
    hideMessage(successEl);

    const fullName = document.getElementById('signup-name').value.trim();
    const email = document.getElementById('signup-email').value.trim();
    const password = document.getElementById('signup-password').value;
    const confirmPassword = document.getElementById('signup-confirm').value;
    const phone = document.getElementById('signup-phone').value.trim();
    const gender = document.getElementById('signup-gender').value;
    const dob = document.getElementById('signup-dob').value;
    const city = document.getElementById('signup-city').value.trim();
    const agreedToTerms = document.getElementById('signup-terms').checked;

    // Client-side validation
    if (!fullName || !email || !password) {
        showError(errorEl, 'Full name, email, and password are required.');
        return;
    }

    if (password.length < 6) {
        showError(errorEl, 'Password must be at least 6 characters.');
        return;
    }

    if (password !== confirmPassword) {
        showError(errorEl, 'Passwords do not match.');
        return;
    }

    if (!agreedToTerms) {
        showError(errorEl, 'You must agree to the Terms & Conditions.');
        return;
    }

    // Show loading
    setLoading(submitBtn, btnText, btnLoader, true);

    try {
        const res = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fullName, email, password, confirmPassword,
                phone, gender, dob, city, agreedToTerms
            })
        });

        const data = await res.json();

        if (res.ok) {
            showSuccess(successEl, data.message || 'Account created! Redirecting to login...');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1500);
        } else {
            showError(errorEl, data.error || 'Signup failed. Please try again.');
        }
    } catch (err) {
        showError(errorEl, 'Network error. Please check your connection.');
    } finally {
        setLoading(submitBtn, btnText, btnLoader, false);
    }
}

// ===== UTILITY FUNCTIONS =====
function showError(el, message) {
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    el.style.display = 'block';
}

function showSuccess(el, message) {
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
