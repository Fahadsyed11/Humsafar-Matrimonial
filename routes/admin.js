const express = require('express');
const bcrypt = require('bcryptjs');
const { findAdminByUsername, getUserCount, getRecentUsers, getAllUsers } = require('../db/database');

const router = express.Router();

// POST /api/admin/login
router.post('/login', (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required.' });
        }

        const admin = findAdminByUsername(username);
        if (!admin) {
            return res.status(401).json({ error: 'Invalid admin credentials.' });
        }

        const isMatch = bcrypt.compareSync(password, admin.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid admin credentials.' });
        }

        // Set admin session
        req.session.adminId = admin.id;
        req.session.userType = 'admin';

        res.json({
            message: 'Admin login successful!',
            admin: {
                id: admin.id,
                username: admin.username
            }
        });

    } catch (err) {
        console.error('Admin login error:', err);
        res.status(500).json({ error: 'Server error. Please try again.' });
    }
});

// POST /api/admin/logout
router.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ error: 'Logout failed.' });
        }
        res.json({ message: 'Admin logged out successfully.' });
    });
});

// GET /api/admin/dashboard — Protected
router.get('/dashboard', (req, res) => {
    if (!req.session.adminId || req.session.userType !== 'admin') {
        return res.status(401).json({ error: 'Admin authentication required.' });
    }

    try {
        const userCount = getUserCount();
        const recentUsers = getRecentUsers(20);

        res.json({
            totalUsers: userCount,
            recentUsers
        });

    } catch (err) {
        console.error('Dashboard error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// GET /api/admin/users — Protected
router.get('/users', (req, res) => {
    if (!req.session.adminId || req.session.userType !== 'admin') {
        return res.status(401).json({ error: 'Admin authentication required.' });
    }

    try {
        const users = getAllUsers();
        res.json({ users });
    } catch (err) {
        console.error('Users list error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// GET /api/admin/me — Check admin auth
router.get('/me', (req, res) => {
    if (!req.session.adminId || req.session.userType !== 'admin') {
        return res.status(401).json({ error: 'Not authenticated as admin.' });
    }
    res.json({ admin: { id: req.session.adminId, username: 'admin' } });
});

module.exports = router;
