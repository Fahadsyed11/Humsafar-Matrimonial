const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const DB_PATH = path.join(__dirname, '..', 'humsafar.db');

let db = null;          // sql.js Database instance
let SQL = null;         // sql.js module

// ---------------------------------------------------------------------------
// Thin wrapper that mirrors the better-sqlite3 API:
//   db.prepare(sql).get(...params)
//   db.prepare(sql).all(...params)
//   db.prepare(sql).run(...params)
//   db.exec(sql)
//   db.pragma(str)
// ---------------------------------------------------------------------------

function wrapDB(sqljs) {
    function persist() {
        const data = sqljs.export();
        fs.writeFileSync(DB_PATH, Buffer.from(data));
    }

    return {
        pragma(str) {
            sqljs.run(`PRAGMA ${str}`);
        },
        exec(sql) {
            sqljs.run(sql);
            persist();
        },
        prepare(sql) {
            return {
                get(...params) {
                    // sql.js uses positional ? params as an array
                    const flat = params.flat();
                    const stmt = sqljs.prepare(sql);
                    stmt.bind(flat.length ? flat : []);
                    const hasRow = stmt.step();
                    const result = hasRow ? stmt.getAsObject() : undefined;
                    stmt.free();
                    return result;
                },
                all(...params) {
                    const flat = params.flat();
                    const stmt = sqljs.prepare(sql);
                    if (flat.length) stmt.bind(flat);
                    const rows = [];
                    while (stmt.step()) {
                        rows.push(stmt.getAsObject());
                    }
                    stmt.free();
                    return rows;
                },
                run(...params) {
                    const flat = params.flat();
                    sqljs.run(sql, flat.length ? flat : []);
                    const lastId = sqljs.exec('SELECT last_insert_rowid() as id')[0];
                    persist();
                    return {
                        lastInsertRowid: lastId ? lastId.values[0][0] : undefined,
                        changes: sqljs.getRowsModified()
                    };
                }
            };
        }
    };
}

// ---------------------------------------------------------------------------
// Init
// ---------------------------------------------------------------------------

async function initSQL() {
    if (SQL) return;
    // sql.js is async — load the WASM once
    const initSqlJs = require('sql.js');
    SQL = await initSqlJs();
}

async function getDB() {
    if (db) return db;

    await initSQL();

    let sqljs;
    if (fs.existsSync(DB_PATH)) {
        const fileBuffer = fs.readFileSync(DB_PATH);
        sqljs = new SQL.Database(fileBuffer);
    } else {
        sqljs = new SQL.Database();
    }

    db = wrapDB(sqljs);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initTables();
    seedAdmin();
    seedMatches();
    return db;
}

// ---------------------------------------------------------------------------
// Synchronous bootstrap (called once at startup)
// ---------------------------------------------------------------------------
let _dbSync = null;

function getDBSync() {
    if (_dbSync) return _dbSync;
    throw new Error('DB not initialised yet. Await initDB() first.');
}

// ---------------------------------------------------------------------------
// Tables & seed
// ---------------------------------------------------------------------------

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
            profileStatus TEXT DEFAULT 'incomplete',
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
            action TEXT NOT NULL,
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
            type TEXT NOT NULL,
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
            status TEXT DEFAULT 'pending',
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
    const username = 'admin@123';
    const password = 'admin1234567';
    const hashedPassword = bcrypt.hashSync(password, 10);

    db.prepare('DELETE FROM admins').run();
    db.prepare('INSERT INTO admins (username, password) VALUES (?, ?)').run(username, hashedPassword);

    console.log('✅ Default admin seeded (admin@123 / admin1234567)');
}

function seedMatches() {
    // Only seed if no matches exist
    const existing = db.prepare('SELECT COUNT(*) as count FROM matches').get();
    if (existing && existing.count > 0) return;

    // Get male and female users with complete profiles
    const males = db.prepare("SELECT id FROM users WHERE gender = 'male' AND profileStatus = 'complete' LIMIT 15").all();
    const females = db.prepare("SELECT id FROM users WHERE gender = 'female' AND profileStatus = 'complete' LIMIT 15").all();

    if (males.length === 0 || females.length === 0) return;

    const count = Math.min(males.length, females.length, 12);
    for (let i = 0; i < count; i++) {
        const score = Math.floor(Math.random() * 25) + 75; // 75-99%
        try {
            db.prepare(
                'INSERT OR IGNORE INTO matches (user1_id, user2_id, compatibility_score) VALUES (?, ?, ?)'
            ).run(males[i].id, females[i].id, score);
        } catch (e) { /* ignore duplicates */ }
    }
    console.log(`✅ Seeded ${count} sample matches`);
}

// ---------------------------------------------------------------------------
// User Queries
// ---------------------------------------------------------------------------

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
    return result ? result.count : 0;
}

function getRecentUsers(limit = 10) {
    return db.prepare(`
        SELECT u.id, u.fullName, u.email, u.gender, u.city, u.createdAt,
               p.photo_url as photo
        FROM users u
        LEFT JOIN user_photos p ON u.id = p.user_id AND p.is_primary = 1
        ORDER BY u.createdAt DESC LIMIT ?
    `).all(limit);
}

function getAllUsers() {
    return db.prepare('SELECT id, fullName, email, phone, gender, dob, city, createdAt FROM users ORDER BY createdAt DESC').all();
}

// ---------------------------------------------------------------------------
// Profile Completion
// ---------------------------------------------------------------------------

function updateProfile(userId, data) {
    const {
        religion, caste, height, education, occupation, income,
        aboutMe, familyType, maritalStatus, motherTongue,
        ageMin, ageMax, prefReligion, prefCaste, prefMaritalStatus, prefMotherTongue,
        dob, city, phone, gender
    } = data;

    db.prepare(`
        UPDATE users SET
            religion = ?, caste = ?, height = ?, education = ?, occupation = ?,
            income = ?, aboutMe = ?, familyType = ?, maritalStatus = ?,
            motherTongue = ?, profileStatus = 'pending',
            dob = ?, city = ?, phone = ?, gender = ?
        WHERE id = ?
    `).run(
        religion || null, caste || null, height || null,
        education || null, occupation || null, income || null,
        aboutMe || null, familyType || null, maritalStatus || null,
        motherTongue || null,
        dob || null, city || null, phone || null, gender || null,
        userId
    );

    // Upsert preferences
    const existing = db.prepare('SELECT user_id FROM preferences WHERE user_id = ?').get(userId);
    if (existing) {
        db.prepare(`
            UPDATE preferences SET age_min=?, age_max=?, religion=?, caste=?, maritalStatus=?, motherTongue=?
            WHERE user_id=?
        `).run(ageMin || null, ageMax || null, prefReligion || null, prefCaste || null,
               prefMaritalStatus || null, prefMotherTongue || null, userId);
    } else {
        db.prepare(`
            INSERT INTO preferences (user_id, age_min, age_max, religion, caste, maritalStatus, motherTongue)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(userId, ageMin || null, ageMax || null, prefReligion || null,
               prefCaste || null, prefMaritalStatus || null, prefMotherTongue || null);
    }
}

function getFullUserById(id) {
    return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

// ---------------------------------------------------------------------------
// Photo Queries
// ---------------------------------------------------------------------------

function addUserPhoto(userId, photoUrl, isPrimary) {
    db.prepare(
        'INSERT INTO user_photos (user_id, photo_url, is_primary) VALUES (?, ?, ?)'
    ).run(userId, photoUrl, isPrimary ? 1 : 0);
}

function getUserPhotos(userId) {
    return db.prepare(
        'SELECT id, photo_url, is_primary, createdAt FROM user_photos WHERE user_id = ? ORDER BY is_primary DESC, id ASC'
    ).all(userId);
}

function deleteUserPhoto(photoId, userId) {
    const photo = db.prepare('SELECT * FROM user_photos WHERE id = ? AND user_id = ?').get(photoId, userId);
    if (!photo) return false;

    db.prepare('DELETE FROM user_photos WHERE id = ? AND user_id = ?').run(photoId, userId);

    if (photo.is_primary) {
        const nextPhoto = db.prepare('SELECT id FROM user_photos WHERE user_id = ? ORDER BY id ASC LIMIT 1').get(userId);
        if (nextPhoto) {
            db.prepare('UPDATE user_photos SET is_primary = 1 WHERE id = ?').run(nextPhoto.id);
        }
    }
    return true;
}

function setPrimaryPhoto(photoId, userId) {
    db.prepare('UPDATE user_photos SET is_primary = 0 WHERE user_id = ?').run(userId);
    const result = db.prepare('UPDATE user_photos SET is_primary = 1 WHERE id = ? AND user_id = ?').run(photoId, userId);
    return result.changes > 0;
}

// ---------------------------------------------------------------------------
// Admin Queries
// ---------------------------------------------------------------------------

function findAdminByUsername(username) {
    return db.prepare('SELECT * FROM admins WHERE username = ?').get(username);
}

// ---------------------------------------------------------------------------
// Admin Stats & Analytics
// ---------------------------------------------------------------------------

function getAdminStats() {
    const totalUsers = getUserCount();
    const genderBreak = db.prepare("SELECT gender, COUNT(*) as count FROM users GROUP BY gender").all();
    const statusBreak = db.prepare("SELECT profileStatus, COUNT(*) as count FROM users GROUP BY profileStatus").all();
    const pendingVerifications = db.prepare("SELECT COUNT(*) as count FROM users WHERE profileStatus = 'pending'").get();
    const completedProfiles = db.prepare("SELECT COUNT(*) as count FROM users WHERE profileStatus = 'complete'").get();
    const totalReports = db.prepare("SELECT COUNT(*) as count FROM reports").get();
    const pendingReports = db.prepare("SELECT COUNT(*) as count FROM reports WHERE status = 'pending'").get();
    const totalMatches = db.prepare("SELECT COUNT(*) as count FROM matches").get();
    const totalInteractions = db.prepare("SELECT COUNT(*) as count FROM interactions").get();
    const totalPhotos = db.prepare("SELECT COUNT(*) as count FROM user_photos").get();

    // City distribution (top 10)
    const cityDistribution = db.prepare(
        "SELECT city, COUNT(*) as count FROM users WHERE city IS NOT NULL AND city != '' GROUP BY city ORDER BY count DESC LIMIT 10"
    ).all();

    return {
        totalUsers,
        pendingVerifications: pendingVerifications ? pendingVerifications.count : 0,
        completedProfiles: completedProfiles ? completedProfiles.count : 0,
        totalReports: totalReports ? totalReports.count : 0,
        pendingReports: pendingReports ? pendingReports.count : 0,
        totalMatches: totalMatches ? totalMatches.count : 0,
        totalInteractions: totalInteractions ? totalInteractions.count : 0,
        totalPhotos: totalPhotos ? totalPhotos.count : 0,
        genderBreak,
        statusBreak,
        cityDistribution
    };
}

function getUsersFiltered({ search, status, page, limit }) {
    const offset = ((page || 1) - 1) * (limit || 25);
    const lim = limit || 25;
    let where = [];
    let params = [];

    if (search) {
        where.push("(u.fullName LIKE ? OR u.email LIKE ? OR u.phone LIKE ? OR u.city LIKE ?)");
        const s = `%${search}%`;
        params.push(s, s, s, s);
    }
    if (status && status !== 'all') {
        where.push("u.profileStatus = ?");
        params.push(status);
    }

    const whereClause = where.length > 0 ? 'WHERE ' + where.join(' AND ') : '';

    const countResult = db.prepare(`SELECT COUNT(*) as count FROM users u ${whereClause}`).get(...params);
    const total = countResult ? countResult.count : 0;

    const users = db.prepare(
        `SELECT u.id, u.fullName, u.email, u.phone, u.gender, u.dob, u.city, u.profileStatus, u.premiumStatus, u.createdAt,
                p.photo_url as photo
         FROM users u
         LEFT JOIN user_photos p ON u.id = p.user_id AND p.is_primary = 1
         ${whereClause} ORDER BY u.createdAt DESC LIMIT ? OFFSET ?`
    ).all(...params, lim, offset);

    return { users, total, page: page || 1, limit: lim, totalPages: Math.ceil(total / lim) };
}

function getUsersByMonth() {
    // Get signups per month for the last 12 months
    const rows = db.prepare(`
        SELECT strftime('%Y-%m', createdAt) as month, COUNT(*) as count 
        FROM users 
        WHERE createdAt >= datetime('now', '-12 months')
        GROUP BY month 
        ORDER BY month ASC
    `).all();
    return rows;
}

function getReports() {
    return db.prepare(`
        SELECT r.id, r.reason, r.status, r.createdAt,
               u1.fullName as reporterName, u1.email as reporterEmail,
               u2.fullName as reportedName, u2.email as reportedEmail,
               p1.photo_url as reporterPhoto,
               p2.photo_url as reportedPhoto
        FROM reports r
        LEFT JOIN users u1 ON r.reporter_id = u1.id
        LEFT JOIN users u2 ON r.reported_id = u2.id
        LEFT JOIN user_photos p1 ON u1.id = p1.user_id AND p1.is_primary = 1
        LEFT JOIN user_photos p2 ON u2.id = p2.user_id AND p2.is_primary = 1
        ORDER BY r.createdAt DESC
    `).all();
}

function verifyUser(userId, status) {
    db.prepare("UPDATE users SET profileStatus = ? WHERE id = ?").run(status, userId);
}

function resolveReport(reportId, status) {
    db.prepare("UPDATE reports SET status = ? WHERE id = ?").run(status, reportId);
}

function getMatchStats() {
    const totalMatches = db.prepare("SELECT COUNT(*) as count FROM matches").get();
    const avgScore = db.prepare("SELECT AVG(compatibility_score) as avg FROM matches").get();
    return {
        totalMatches: totalMatches ? totalMatches.count : 0,
        avgCompatibility: avgScore && avgScore.avg ? Math.round(avgScore.avg) : 0
    };
}

function getRecentMatches(limit = 10) {
    return db.prepare(`
        SELECT m.id, m.compatibility_score, m.createdAt,
               u1.id as user1_id, u1.fullName as user1_name, u1.gender as user1_gender, u1.city as user1_city,
               u2.id as user2_id, u2.fullName as user2_name, u2.gender as user2_gender, u2.city as user2_city,
               p1.photo_url as user1_photo,
               p2.photo_url as user2_photo
        FROM matches m
        JOIN users u1 ON m.user1_id = u1.id
        JOIN users u2 ON m.user2_id = u2.id
        LEFT JOIN user_photos p1 ON u1.id = p1.user_id AND p1.is_primary = 1
        LEFT JOIN user_photos p2 ON u2.id = p2.user_id AND p2.is_primary = 1
        ORDER BY m.createdAt DESC
        LIMIT ?
    `).all(limit);
}

function calcAge(dob) {
    if (!dob) return 25;
    const birth = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
    return age;
}

function getDiscoveryProfiles(currentUserId) {
    const rows = db.prepare(`
        SELECT u.id, u.fullName, u.dob, u.city, u.religion, u.education, u.occupation, u.gender, u.premiumStatus,
               p.photo_url as photo
        FROM users u
        LEFT JOIN user_photos p ON u.id = p.user_id AND p.is_primary = 1
        WHERE u.id != ? AND u.profileStatus = 'complete'
        ORDER BY u.createdAt DESC
    `).all(currentUserId);

    return rows.map(r => {
        const initials = r.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
        const age = r.dob ? calcAge(r.dob) : 25;
        return {
            id: r.id,
            name: r.fullName,
            age: age,
            gender: r.gender,
            profession: r.occupation || 'Professional',
            religion: r.religion || 'Muslim',
            education: r.education || 'Graduate',
            city: r.city || 'Unknown',
            match: Math.floor(Math.random() * 25) + 75,
            initials: initials,
            isTopPick: r.premiumStatus === 1,
            photo: r.photo || null,
            tags: r.premiumStatus === 1 ? ['⭐ Top Pick', 'Highly Compatible'] : ['Compatible']
        };
    });
}

module.exports = {
    getDB,
    createUser,
    findUserByEmail,
    findUserById,
    getFullUserById,
    getUserCount,
    getRecentUsers,
    getAllUsers,
    updateProfile,
    addUserPhoto,
    getUserPhotos,
    deleteUserPhoto,
    setPrimaryPhoto,
    findAdminByUsername,
    getAdminStats,
    getUsersFiltered,
    getUsersByMonth,
    getReports,
    verifyUser,
    resolveReport,
    getMatchStats,
    getRecentMatches,
    getDiscoveryProfiles
};
