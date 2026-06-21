const { getDB } = require('../db/database');

async function check() {
    try {
        const db = await getDB();
        const users = db.prepare("SELECT id, fullName, gender, profileStatus FROM users").all();
        console.log(`Total users in DB: ${users.length}`);
        console.log("Sample users:", users.slice(0, 5));

        const photos = db.prepare("SELECT * FROM user_photos").all();
        console.log(`Total photos in DB: ${photos.length}`);
        console.log("Sample photos:", photos.slice(0, 5));

        const discovery = db.prepare(`
            SELECT u.id, u.fullName, p.photo_url as photo
            FROM users u
            LEFT JOIN user_photos p ON u.id = p.user_id AND p.is_primary = 1
            WHERE u.profileStatus = 'complete'
        `).all();
        console.log(`Total completed users with photos: ${discovery.length}`);
        console.log("Sample completed users with photos:", discovery.slice(0, 5));

    } catch (err) {
        console.error("Error checking DB:", err);
    }
}

check();
