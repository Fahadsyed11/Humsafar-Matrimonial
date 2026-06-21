const express = require('express');
const bcrypt = require('bcryptjs');
const {
    findAdminByUsername, getUserCount, getRecentUsers, getAllUsers,
    getAdminStats, getUsersFiltered, getUsersByMonth,
    getReports, verifyUser, resolveReport, getMatchStats, getRecentMatches
} = require('../db/database');

const router = express.Router();

// Middleware: check admin auth
function requireAdmin(req, res, next) {
    if (!req.session.adminId || req.session.userType !== 'admin') {
        return res.status(401).json({ error: 'Admin authentication required.' });
    }
    next();
}

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

        req.session.adminId = admin.id;
        req.session.adminUsername = admin.username;
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

// GET /api/admin/me — Check admin auth
router.get('/me', (req, res) => {
    if (!req.session.adminId || req.session.userType !== 'admin') {
        return res.status(401).json({ error: 'Not authenticated as admin.' });
    }
    res.json({
        admin: {
            id: req.session.adminId,
            username: req.session.adminUsername || 'admin@123'
        }
    });
});

// GET /api/admin/dashboard — Dashboard summary
router.get('/dashboard', requireAdmin, (req, res) => {
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

// GET /api/admin/stats — Comprehensive admin statistics
router.get('/stats', requireAdmin, (req, res) => {
    try {
        const stats = getAdminStats();
        const matchStats = getMatchStats();
        const monthlySignups = getUsersByMonth();

        res.json({
            ...stats,
            ...matchStats,
            monthlySignups
        });
    } catch (err) {
        console.error('Stats error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// GET /api/admin/users — Users with search/filter/pagination
router.get('/users', requireAdmin, (req, res) => {
    try {
        const { search, status, page, limit } = req.query;
        const result = getUsersFiltered({
            search: search || '',
            status: status || 'all',
            page: parseInt(page) || 1,
            limit: parseInt(limit) || 25
        });
        res.json(result);
    } catch (err) {
        console.error('Users list error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// GET /api/admin/users/all — All users (no pagination)
router.get('/users/all', requireAdmin, (req, res) => {
    try {
        const users = getAllUsers();
        res.json({ users });
    } catch (err) {
        console.error('Users all error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// POST /api/admin/users/:id/verify — Verify or reject a user
router.post('/users/:id/verify', requireAdmin, (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // 'complete' or 'rejected'
        if (!['complete', 'rejected', 'pending'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status.' });
        }
        verifyUser(parseInt(id), status);
        res.json({ message: `User ${id} status updated to ${status}.` });
    } catch (err) {
        console.error('Verify user error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// GET /api/admin/reports — All reports
router.get('/reports', requireAdmin, (req, res) => {
    try {
        const reports = getReports();
        res.json({ reports });
    } catch (err) {
        console.error('Reports error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// POST /api/admin/reports/:id/resolve — Resolve a report
router.post('/reports/:id/resolve', requireAdmin, (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // 'resolved', 'dismissed'
        if (!['resolved', 'dismissed', 'pending'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status.' });
        }
        resolveReport(parseInt(id), status);
        res.json({ message: `Report ${id} updated to ${status}.` });
    } catch (err) {
        console.error('Resolve report error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

// GET /api/admin/matches/recent — Recent successful matches
router.get('/matches/recent', requireAdmin, (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const matches = getRecentMatches(limit);
        res.json({ matches });
    } catch (err) {
        console.error('Recent matches error:', err);
        res.status(500).json({ error: 'Server error.' });
    }
});

module.exports = router;
