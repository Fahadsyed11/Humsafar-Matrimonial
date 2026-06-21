/* ============================
   HUMSAFAR — Complete Profile JS
   ============================ */

// ===== Section toggle =====
function toggleSection(name) {
    const body = document.getElementById('body-' + name);
    const chevron = document.getElementById('chevron-' + name);
    if (!body) return;
    const isCollapsed = body.classList.contains('collapsed');
    body.classList.toggle('collapsed', !isCollapsed);
    chevron.classList.toggle('open', isCollapsed);
    if (isCollapsed) updateProgressSteps();
}

// ===== Progress calculation =====
const SECTIONS = ['personal', 'education', 'lifestyle', 'family', 'about'];
const REQUIRED_FIELDS = {
    personal:  ['cp-dob', 'cp-gender', 'cp-marital', 'cp-city', 'cp-religion'],
    education: ['cp-education', 'cp-occupation'],
    lifestyle: [],
    family:    [],
    about:     ['cp-about']
};

function sectionDone(name) {
    const fields = REQUIRED_FIELDS[name];
    return fields.every(id => {
        const el = document.getElementById(id);
        return el && el.value.trim() !== '';
    });
}

function updateProgressSteps() {
    let done = 0;
    SECTIONS.forEach(name => {
        const isDone = sectionDone(name);
        const step = document.getElementById('ps-' + name);
        const check = document.getElementById('check-' + name);
        if (isDone) {
            step.classList.add('done');
            step.classList.remove('active');
            if (check) check.style.display = 'flex';
            done++;
        } else {
            step.classList.remove('done');
            if (check) check.style.display = 'none';
        }
    });
    // Mark current open section as active
    SECTIONS.forEach(name => {
        const body = document.getElementById('body-' + name);
        if (body && !body.classList.contains('collapsed') && !sectionDone(name)) {
            document.getElementById('ps-' + name).classList.add('active');
        }
    });
    const pct = Math.round((done / SECTIONS.length) * 100);
    document.getElementById('progress-bar').style.width = pct + '%';
    document.getElementById('progress-pct').textContent = pct + '% Complete';
}

// ===== Auth guard =====
async function checkAuth() {
    try {
        const res = await fetch('/api/auth/profile');
        if (!res.ok) {
            window.location.href = '/login';
            return null;
        }
        const data = await res.json();
        return data.user;
    } catch {
        window.location.href = '/login';
        return null;
    }
}

// ===== Pre-fill form with existing user data =====
function prefillForm(user) {
    const map = {
        'cp-dob':        user.dob,
        'cp-gender':     user.gender,
        'cp-city':       user.city,
        'cp-phone':      user.phone,
        'cp-religion':   user.religion,
        'cp-caste':      user.caste,
        'cp-height':     user.height,
        'cp-education':  user.education,
        'cp-occupation': user.occupation,
        'cp-income':     user.income,
        'cp-marital':    user.maritalStatus,
        'cp-mothertongue': user.motherTongue,
        'cp-familytype': user.familyType,
        'cp-about':      user.aboutMe,
    };
    for (const [id, val] of Object.entries(map)) {
        const el = document.getElementById(id);
        if (el && val) el.value = val;
    }
    // Update greeting
    const greetEl = document.getElementById('nav-greeting');
    if (greetEl && user.fullName) greetEl.textContent = 'Hi, ' + user.fullName.split(' ')[0];
}

// ===== Collect form data =====
function collectFormData() {
    return {
        dob:              document.getElementById('cp-dob').value,
        gender:           document.getElementById('cp-gender').value,
        city:             document.getElementById('cp-city').value,
        phone:            document.getElementById('cp-phone').value,
        religion:         document.getElementById('cp-religion').value,
        caste:            document.getElementById('cp-caste').value,
        height:           document.getElementById('cp-height').value,
        education:        document.getElementById('cp-education').value,
        occupation:       document.getElementById('cp-occupation').value,
        income:           document.getElementById('cp-income').value,
        maritalStatus:    document.getElementById('cp-marital').value,
        motherTongue:     document.getElementById('cp-mothertongue').value,
        familyType:       document.getElementById('cp-familytype').value,
        aboutMe:          document.getElementById('cp-about').value,
        ageMin:           document.getElementById('cp-age-min').value,
        ageMax:           document.getElementById('cp-age-max').value,
        prefReligion:     document.getElementById('cp-pref-religion').value,
        prefMaritalStatus:document.getElementById('cp-pref-marital').value,
    };
}

// ===== Validate required fields =====
function validate() {
    const required = [
        { id: 'cp-dob',        label: 'Date of Birth' },
        { id: 'cp-gender',     label: 'Gender' },
        { id: 'cp-marital',    label: 'Marital Status' },
        { id: 'cp-city',       label: 'City' },
        { id: 'cp-religion',   label: 'Religion' },
        { id: 'cp-education',  label: 'Education' },
        { id: 'cp-occupation', label: 'Occupation' },
        { id: 'cp-about',      label: 'About Me' },
    ];
    for (const { id, label } of required) {
        const el = document.getElementById(id);
        if (!el || !el.value.trim()) return label + ' is required.';
    }
    return null;
}

// ===== Save profile =====
async function saveProfile(isDraft = false) {
    const errorEl = document.getElementById('profile-error');
    const successEl = document.getElementById('profile-success');
    errorEl.style.display = 'none';
    successEl.style.display = 'none';

    if (!isDraft) {
        const err = validate();
        if (err) {
            errorEl.textContent = err;
            errorEl.style.display = 'block';
            errorEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }
    }

    const btn = isDraft ? document.getElementById('save-draft-btn') : document.getElementById('create-profile-btn');
    const btnText = btn.querySelector('.btn-text');
    const btnLoader = btn.querySelector('.btn-loader');
    btn.disabled = true;
    btnText.style.display = 'none';
    btnLoader.style.display = 'inline-block';

    try {
        const res = await fetch('/api/auth/complete-profile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(collectFormData())
        });
        const data = await res.json();

        if (res.ok) {
            if (isDraft) {
                successEl.textContent = '✓ Draft saved successfully.';
                successEl.style.display = 'block';
                setTimeout(() => successEl.style.display = 'none', 3000);
            } else {
                successEl.textContent = '🎉 Profile created! Redirecting...';
                successEl.style.display = 'block';
                setTimeout(() => window.location.href = '/dashboard', 1500);
            }
        } else {
            if (res.status === 401) {
                window.location.href = '/login';
                return;
            }
            errorEl.textContent = data.error || 'Something went wrong. Please try again.';
            errorEl.style.display = 'block';
        }
    } catch {
        errorEl.textContent = 'Network error. Please check your connection.';
        errorEl.style.display = 'block';
    } finally {
        btn.disabled = false;
        btnText.style.display = 'inline';
        btnLoader.style.display = 'none';
    }
}

// ===== Init =====
document.addEventListener('DOMContentLoaded', async () => {

    // Check authentication
    const user = await checkAuth();
    if (!user) return;

    // Pre-fill any existing data
    prefillForm(user);

    // Update progress
    updateProgressSteps();

    // Setup photo upload events and load current photos
    setupPhotoUploadEvents();
    loadUploadedPhotos();

    // Character counter for About Me
    const aboutEl = document.getElementById('cp-about');
    const countEl = document.getElementById('about-count');
    if (aboutEl && countEl) {
        aboutEl.addEventListener('input', () => {
            countEl.textContent = aboutEl.value.length + ' / 1000';
        });
    }

    // Live progress update on any input change
    document.getElementById('profile-form').addEventListener('change', updateProgressSteps);
    document.getElementById('profile-form').addEventListener('input', updateProgressSteps);

    // Form submit
    document.getElementById('profile-form').addEventListener('submit', e => {
        e.preventDefault();
        saveProfile(false);
    });
});

// ===== PHOTOS MANAGEMENT =====
async function loadUploadedPhotos() {
    try {
        const res = await fetch('/api/auth/photos');
        if (res.ok) {
            const data = await res.json();
            renderUploadedPhotos(data.photos);
        }
    } catch (err) {
        console.error('Error loading photos:', err);
    }
}

function renderUploadedPhotos(photos) {
    const grid = document.getElementById('profile-photo-grid');
    if (!grid) return;
    if (photos.length === 0) {
        grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #9a7e6a; font-size: 0.8rem; padding: 12px 0;">No photos uploaded yet.</p>';
        return;
    }

    grid.innerHTML = photos.map(p => `
        <div class="photo-thumb ${p.is_primary ? 'primary' : ''}">
            <img src="${p.photo_url}" alt="Profile Photo">
            ${p.is_primary ? '<span class="primary-badge">PRIMARY</span>' : ''}
            <div class="photo-actions-overlay">
                ${!p.is_primary ? `<button type="button" class="photo-thumb-btn" onclick="setPrimaryPhoto(${p.id})">Make Primary</button>` : ''}
                <button type="button" class="photo-thumb-btn delete-btn" onclick="deletePhoto(${p.id})">Delete</button>
            </div>
        </div>
    `).join('');
}

async function uploadPhoto(file) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
        showPhotoError('Only JPG, PNG, and WEBP formats are supported.');
        return;
    }
    if (file.size > 5 * 1024 * 1024) {
        showPhotoError('File size must be under 5MB.');
        return;
    }

    const statusEl = document.getElementById('upload-status');
    if (statusEl) statusEl.style.display = 'flex';
    clearPhotoError();

    const formData = new FormData();
    formData.append('photo', file);

    try {
        const res = await fetch('/api/auth/upload-photo', {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        if (res.ok) {
            await loadUploadedPhotos();
        } else {
            showPhotoError(data.error || 'Upload failed.');
        }
    } catch (err) {
        showPhotoError('Network error during upload.');
    } finally {
        if (statusEl) statusEl.style.display = 'none';
    }
}

async function deletePhoto(photoId) {
    if (!confirm('Are you sure you want to delete this photo?')) return;
    try {
        const res = await fetch(`/api/auth/photos/${photoId}`, {
            method: 'DELETE'
        });
        if (res.ok) {
            await loadUploadedPhotos();
        } else {
            const data = await res.json();
            alert(data.error || 'Could not delete photo.');
        }
    } catch (err) {
        console.error('Delete photo error:', err);
    }
}

async function setPrimaryPhoto(photoId) {
    try {
        const res = await fetch(`/api/auth/photos/${photoId}/make-primary`, {
            method: 'POST'
        });
        if (res.ok) {
            await loadUploadedPhotos();
        } else {
            const data = await res.json();
            alert(data.error || 'Could not update primary photo.');
        }
    } catch (err) {
        console.error('Set primary photo error:', err);
    }
}

function showPhotoError(msg) {
    const errorEl = document.getElementById('profile-error');
    if (errorEl) {
        errorEl.textContent = msg;
        errorEl.style.display = 'block';
    }
}

function clearPhotoError() {
    const errorEl = document.getElementById('profile-error');
    if (errorEl) {
        errorEl.style.display = 'none';
    }
}

function setupPhotoUploadEvents() {
    const dragArea = document.getElementById('photo-drag-area');
    const fileInput = document.getElementById('photo-file-input');

    if (!dragArea || !fileInput) return;

    // Click to select
    dragArea.addEventListener('click', (e) => {
        // Prevent trigger loop if clicking direct inside the input
        if (e.target !== fileInput) {
            fileInput.click();
        }
    });

    // File input change
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            uploadPhoto(e.target.files[0]);
            fileInput.value = '';
        }
    });

    // Drag-and-drop actions
    ['dragenter', 'dragover'].forEach(eventName => {
        dragArea.addEventListener(eventName, (e) => {
            e.preventDefault();
            dragArea.classList.add('drag-over');
        }, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dragArea.addEventListener(eventName, (e) => {
            e.preventDefault();
            dragArea.classList.remove('drag-over');
        }, false);
    });

    dragArea.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0) {
            uploadPhoto(files[0]);
        }
    });
}

// Bind to window for inline HTML onclick reference
window.deletePhoto = deletePhoto;
window.setPrimaryPhoto = setPrimaryPhoto;
