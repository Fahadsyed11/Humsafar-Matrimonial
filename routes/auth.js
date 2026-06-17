const express = require('express');
const bcrypt = require('bcryptjs');
const { createUser, findUserByEmail, findUserById } = require('../db/database');

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

        res.status(201).json({
            message: 'Account created successfully! Please login.',
            userId
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

module.exports = router;
