const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, '..', 'humsafar.db');

let db;

function getDB() {
    if (!db) {
        db = new Database(DB_PATH);
        db.pragma('journal_mode = WAL');
        db.pragma('foreign_keys = ON');
        initTables();
        seedAdmin();
    }
    return db;
}

function initTables() {
    db.exec(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fullName TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            phone TEXT,
            gender TEXT,
            dob TEXT,
            city TEXT,
            profileStatus TEXT DEFAULT 'incomplete', -- incomplete, pending, verified, rejected
            premiumStatus INTEGER DEFAULT 0,
            religion TEXT,
            caste TEXT,
            height TEXT,
            education TEXT,
            occupation TEXT,
            income TEXT,
            aboutMe TEXT,
            familyType TEXT,
            maritalStatus TEXT,
            motherTongue TEXT,
            agreedToTerms INTEGER DEFAULT 0,
            privacySettings TEXT DEFAULT '{}',
            createdAt TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS user_photos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            photo_url TEXT NOT NULL,
            is_primary INTEGER DEFAULT 0,
            createdAt TEXT DEFAULT (datetime('now')),
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS preferences (
            user_id INTEGER PRIMARY KEY,
            age_min INTEGER,
            age_max INTEGER,
            religion TEXT,
            caste TEXT,
            maritalStatus TEXT,
            motherTongue TEXT,
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS interactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sender_id INTEGER NOT NULL,
            receiver_id INTEGER NOT NULL,
            action TEXT NOT NULL, -- 'like' or 'pass'
            createdAt TEXT DEFAULT (datetime('now')),
            FOREIGN KEY(sender_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY(receiver_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE(sender_id, receiver_id)
        );

        CREATE TABLE IF NOT EXISTS matches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user1_id INTEGER NOT NULL,
            user2_id INTEGER NOT NULL,
            compatibility_score INTEGER DEFAULT 0,
            createdAt TEXT DEFAULT (datetime('now')),
            FOREIGN KEY(user1_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY(user2_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE(user1_id, user2_id)
        );

        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            match_id INTEGER NOT NULL,
            sender_id INTEGER NOT NULL,
            message TEXT NOT NULL,
            is_read INTEGER DEFAULT 0,
            createdAt TEXT DEFAULT (datetime('now')),
            FOREIGN KEY(match_id) REFERENCES matches(id) ON DELETE CASCADE,
            FOREIGN KEY(sender_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            type TEXT NOT NULL, -- 'match', 'message', 'verification'
            message TEXT NOT NULL,
            is_read INTEGER DEFAULT 0,
            createdAt TEXT DEFAULT (datetime('now')),
            FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            reporter_id INTEGER NOT NULL,
            reported_id INTEGER NOT NULL,
            reason TEXT NOT NULL,
            status TEXT DEFAULT 'pending', -- 'pending', 'resolved'
            createdAt TEXT DEFAULT (datetime('now')),
            FOREIGN KEY(reporter_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY(reported_id) REFERENCES users(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS admins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            createdAt TEXT DEFAULT (datetime('now'))
        );
    `);
}

function seedAdmin() {
    const existing = db.prepare('SELECT id FROM admins WHERE username = ?').get('admin');
    if (!existing) {
        const hashedPassword = bcrypt.hashSync('admin123', 10);
        db.prepare('INSERT INTO admins (username, password) VALUES (?, ?)').run('admin', hashedPassword);
        console.log('✅ Default admin seeded (admin / admin123)');
    }
}

// ===== USER QUERIES =====

function createUser({ fullName, email, password, phone, gender, dob, city }) {
    const hashedPassword = bcrypt.hashSync(password, 10);
    const stmt = db.prepare(`
        INSERT INTO users (fullName, email, password, phone, gender, dob, city, agreedToTerms)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1)
    `);
    const result = stmt.run(fullName, email, hashedPassword, phone, gender, dob, city);
    return result.lastInsertRowid;
}

function findUserByEmail(email) {
    return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
}

function findUserById(id) {
    return db.prepare('SELECT id, fullName, email, phone, gender, dob, city, createdAt FROM users WHERE id = ?').get(id);
}

function getUserCount() {
    const result = db.prepare('SELECT COUNT(*) as count FROM users').get();
    return result.count;
}

function getRecentUsers(limit = 10) {
    return db.prepare('SELECT id, fullName, email, gender, city, createdAt FROM users ORDER BY createdAt DESC LIMIT ?').all(limit);
}

function getAllUsers() {
    return db.prepare('SELECT id, fullName, email, phone, gender, dob, city, createdAt FROM users ORDER BY createdAt DESC').all();
}

// ===== ADMIN QUERIES =====

function findAdminByUsername(username) {
    return db.prepare('SELECT * FROM admins WHERE username = ?').get(username);
}

module.exports = {
    getDB,
    createUser,
    findUserByEmail,
    findUserById,
    getUserCount,
    getRecentUsers,
    getAllUsers,
    findAdminByUsername
};
