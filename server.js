const express = require('express');
const session = require('express-session');
const path = require('path');
const { getDB } = require('./db/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy headers when deployed behind a load balancer or reverse proxy
app.set('trust proxy', 1);

// ===== Middleware =====
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
    secret: 'humsafar-secret-key-2026',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
    }
}));

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// ===== API Routes =====
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const dataRoutes = require('./routes/data');

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', dataRoutes);

// ===== Page Routes =====
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/signup', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'signup.html'));
});

app.get('/terms', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'terms.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin-login.html'));
});

app.get('/admin/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin-dashboard.html'));
});

app.get('/complete-profile', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'complete-profile.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// ===== Route Fallback =====
app.get('*', (req, res) => {
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API route not found.' });
    }
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ===== Bootstrap: init DB then optionally start server =====
(async () => {
    try {
        await getDB();
        console.log('📦 Database initialized');

        // In serverless environments (e.g. Vercel) we should not call app.listen().
        if (require.main === module) {
            app.listen(PORT, () => {
                console.log(`\n🚀 Humsafar server running at http://localhost:${PORT}`);
                console.log(`   📄 Home:      http://localhost:${PORT}`);
                console.log(`   🔐 Login:     http://localhost:${PORT}/login`);
                console.log(`   📝 Sign Up:   http://localhost:${PORT}/signup`);
                console.log(`   ⚙️  Admin:     http://localhost:${PORT}/admin`);
                console.log(`   📋 Terms:     http://localhost:${PORT}/terms\n`);
            });
        }
    } catch (err) {
        console.error('❌ Failed to initialize database:', err);
        // In serverless environments, avoid exiting the process; rethrow to fail initialization.
        throw err;
    }
})();

// Export the app for serverless wrappers / tests
module.exports = app;

