const { getDB, getAllUsers } = require('../db/database');

async function check() {
    try {
        const db = await getDB();
        const users = getAllUsers();
        console.log('Total users in database:', users.length);
        console.log('User list:');
        users.forEach(u => {
            console.log(`- ID: ${u.id}, Name: ${u.fullName}, Email: ${u.email}, Gender: ${u.gender}, City: ${u.city}`);
        });
    } catch (err) {
        console.error('Error checking database:', err);
    }
}

check();
