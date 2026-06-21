const fs = require('fs');
const path = require('path');
const { getDB, createUser, updateProfile, addUserPhoto } = require('../db/database');

async function seed() {
    try {
        // Initialize Database
        await getDB();

        const jsonPath = path.join(__dirname, '..', 'public', 'profiles.json');
        if (!fs.existsSync(jsonPath)) {
            console.error('profiles.json not found in public folder!');
            return;
        }

        const dataStr = fs.readFileSync(jsonPath, 'utf8');
        if (dataStr.includes('<truncated')) {
            console.error('profiles.json contains truncated placeholder content. Please paste the full JSON into public/profiles.json first!');
            return;
        }

        const rawData = JSON.parse(dataStr);
        const profiles = [...(rawData.boys || []), ...(rawData.girls || [])];

        console.log(`Starting to seed ${profiles.length} profiles...`);

        let count = 0;
        for (const p of profiles) {
            // Generate a unique email based on their name
            const emailName = p.full_name.toLowerCase().replace(/[^a-z0-9]/g, '');
            const email = `${emailName}_${p.id || count}@humsafar.com`;
            
            // 1. Create base user record
            const userId = createUser({
                fullName: p.full_name,
                email: email,
                password: 'password123', // Default test password for all seeded users
                phone: p.phone || `+91 99999 ${String(10000 + count).slice(1)}`,
                gender: p.gender.toLowerCase(),
                dob: p.dob,
                city: p.city
            });

            // 2. Complete detail profile fields
            updateProfile(userId, {
                religion: p.religion,
                caste: p.community,
                height: p.height,
                education: p.education,
                occupation: p.profession,
                income: p.annual_income,
                aboutMe: p.bio,
                familyType: 'Joint',
                maritalStatus: p.marital_status || 'Never Married',
                motherTongue: p.languages ? p.languages.split(',')[0].trim() : 'English',
                
                // Matching preferences
                ageMin: p.gender.toLowerCase() === 'male' ? Math.max(18, p.age - 5) : Math.max(21, p.age - 2),
                ageMax: p.gender.toLowerCase() === 'male' ? p.age : p.age + 5,
                prefReligion: p.religion,
                prefCaste: p.community,
                prefMaritalStatus: p.marital_status || 'Never Married',
                prefMotherTongue: p.languages ? p.languages.split(',')[0].trim() : 'English',
                
                dob: p.dob,
                city: p.city,
                phone: p.phone || `+91 99999 ${String(10000 + count).slice(1)}`,
                gender: p.gender.toLowerCase()
            });

            // 3. Link their primary photo
            let photoPath = p.photo;
            if (photoPath && !photoPath.startsWith('/')) {
                photoPath = '/' + photoPath;
            }
            if (photoPath) {
                addUserPhoto(userId, photoPath, 1);
            }

            // Set user profileStatus to 'complete' directly so they show up in discovery
            const db = await getDB();
            db.prepare("UPDATE users SET profileStatus = 'complete' WHERE id = ?").run(userId);

            console.log(`✅ Seeded profile: ${p.full_name} (${p.gender})`);
            count++;
        }

        console.log(`\n🎉 Successfully seeded ${count} profiles into the database!`);
    } catch (err) {
        console.error('Seeding failed:', err);
    }
}

seed();
