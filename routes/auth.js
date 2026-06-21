const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { createUser, findUserByEmail, findUserById, updateProfile, getFullUserById, addUserPhoto, getUserPhotos, deleteUserPhoto, setPrimaryPhoto, getDiscoveryProfiles } = require('../db/database');

// ---- Multer config ----
const UPLOADS_DIR = path.join(__dirname, '..', 'public', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, 'user_' + req.session.userId + '_' + Date.now() + ext);
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    fileFilter: (req, file, cb) => {
        const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) cb(null, true);
        else cb(new Error('Only JPG, PNG, WEBP images are allowed.'));
    }
});

const router = express.Router();

// POST /api/auth/signup
router.post('/signup', (req, res) => {
    try {
        const { fullName, email, password, confirmPassword, phone, gender, dob, city, agreedToTerms } = req.body;

        // Validation
        if (!fullName || !email || !password) {
            return res.status(400).json({ error: 'Full name, email, and password are required.' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters.' });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ error: 'Passwords do not match.' });
        }

        if (!agreedToTerms) {
            return res.status(400).json({ error: 'You must agree to the Terms & Conditions.' });
        }

        // Check if user already exists
        const existingUser = findUserByEmail(email);
        if (existingUser) {
            return res.status(409).json({ error: 'An account with this email already exists.' });
        }

        // Create user
        const userId = createUser({ fullName, email, password, phone, gender, dob, city });

        // Auto-login
        req.session.userId = userId;
        req.session.userType = 'user';

        res.status(201).json({
            message: 'Account created successfully!',
            userId,
            redirect: '/complete-profile'
        });

    } catch (err) {
        console.error('Signup error:', err);
        res.status(500).json({ error: 'Server error. Please try again.' });
    }
});

// POST /api/auth/login
router.post('/login', (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        const user = findUserByEmail(email);
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const isMatch = bcrypt.compareSync(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        // Set session
        req.session.userId = user.id;
        req.session.userType = 'user';

        res.json({
            message: 'Login successful!',
            user: {
                id: user.id,
                fullName: user.fullName,
                email: user.email
            }
        });

    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Server error. Please try again.' });
    }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Logout failed.' });
        }
        res.json({ message: 'Logged out successfully.' });
    });
});

// GET /api/auth/me
router.get('/me', (req, res) => {
    if (!req.session.userId || req.session.userType !== 'user') {
        return res.status(401).json({ error: 'Not authenticated.' });
    }

    const user = findUserById(req.session.userId);
    if (!user) {
        return res.status(404).json({ error: 'User not found.' });
    }

    res.json({ user });
});

// GET /api/auth/profile — full profile for logged-in user
router.get('/profile', (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated.' });
    const user = getFullUserById(req.session.userId);
    if (!user) return res.status(404).json({ error: 'User not found.' });
    const { password: _, ...safeUser } = user;
    res.json({ user: safeUser });
});

// POST /api/auth/complete-profile
router.post('/complete-profile', (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated.' });
    try {
        updateProfile(req.session.userId, req.body);
        res.json({ message: 'Profile saved successfully!' });
    } catch (err) {
        console.error('complete-profile error:', err);
        res.status(500).json({ error: 'Could not save profile. Please try again.' });
    }
});

// Auth check middleware for multer to prevent unauthenticated uploads from hitting disk
const checkAuthForUpload = (req, res, next) => {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({ error: 'Not authenticated.' });
    }
    next();
};

// POST /api/auth/upload-photo
router.post('/upload-photo', checkAuthForUpload, upload.single('photo'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded.' });
    try {
        const photoUrl = '/uploads/' + req.file.filename;
        const isPrimary = getUserPhotos(req.session.userId).length === 0 ? 1 : 0;
        addUserPhoto(req.session.userId, photoUrl, isPrimary);
        res.json({ message: 'Photo uploaded!', photoUrl, isPrimary });
    } catch (err) {
        console.error('upload-photo error:', err);
        res.status(500).json({ error: 'Upload failed.' });
    }
});

// GET /api/auth/photos
router.get('/photos', (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated.' });
    res.json({ photos: getUserPhotos(req.session.userId) });
});

// DELETE /api/auth/photos/:id
router.delete('/photos/:id', (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated.' });
    try {
        const success = deleteUserPhoto(parseInt(req.params.id), req.session.userId);
        if (success) {
            res.json({ message: 'Photo deleted successfully.' });
        } else {
            res.status(404).json({ error: 'Photo not found.' });
        }
    } catch (err) {
        console.error('Delete photo error:', err);
        res.status(500).json({ error: 'Failed to delete photo.' });
    }
});

// POST /api/auth/photos/:id/make-primary
router.post('/photos/:id/make-primary', (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated.' });
    try {
        const success = setPrimaryPhoto(parseInt(req.params.id), req.session.userId);
        if (success) {
            res.json({ message: 'Primary photo updated.' });
        } else {
            res.status(404).json({ error: 'Photo not found.' });
        }
    } catch (err) {
        console.error('Set primary photo error:', err);
        res.status(500).json({ error: 'Failed to set primary photo.' });
    }
});

// GET /api/auth/discovery
router.get('/discovery', (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated.' });
    try {
        const profiles = getDiscoveryProfiles(req.session.userId);
        res.json({ profiles });
    } catch (err) {
        console.error('Discovery error:', err);
        res.status(500).json({ error: 'Failed to fetch discovery profiles.' });
    }
});

module.exports = router;
