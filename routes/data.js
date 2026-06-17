const express = require('express');
const { getUserCount } = require('../db/database');

const router = express.Router();

// Pool of success stories for random selection
const STORIES_POOL = [
    {
        id: 1,
        text: "Humsafar's AI matching connected us based on our shared values and life goals. We knew from the first conversation that this was meant to be.",
        couple: "Ahmed & Sana",
        initials: "A & S",
        year: "2025",
        city: "Lahore"
    },
    {
        id: 2,
        text: "We were skeptical at first, but the compatibility score was spot on. Three months later, our families met and the rest is history!",
        couple: "Rahul & Fatima",
        initials: "R & F",
        year: "2025",
        city: "Mumbai"
    },
    {
        id: 3,
        text: "The platform made it so easy to find someone who truly understands our cultural values while being progressive. Forever grateful!",
        couple: "Kabir & Meera",
        initials: "K & M",
        year: "2024",
        city: "Delhi"
    },
    {
        id: 4,
        text: "After years of searching, Humsafar introduced me to my perfect match. The AI really understood what I was looking for in a life partner.",
        couple: "Zain & Ayesha",
        initials: "Z & A",
        year: "2025",
        city: "Karachi"
    },
    {
        id: 5,
        text: "Our families were so impressed with the verification process. It gave us the confidence to take the next step with trust.",
        couple: "Arjun & Priya",
        initials: "A & P",
        year: "2024",
        city: "Bangalore"
    },
    {
        id: 6,
        text: "What sets Humsafar apart is the focus on genuine compatibility. We connected on a deeper level from day one.",
        couple: "Hassan & Noor",
        initials: "H & N",
        year: "2025",
        city: "Islamabad"
    },
    {
        id: 7,
        text: "The privacy features made me feel safe throughout the process. I could share details at my own pace, and that made all the difference.",
        couple: "Vikram & Ananya",
        initials: "V & A",
        year: "2024",
        city: "Hyderabad"
    },
    {
        id: 8,
        text: "My parents were hesitant about online matchmaking, but Humsafar's family-friendly approach won them over completely!",
        couple: "Bilal & Mariam",
        initials: "B & M",
        year: "2025",
        city: "Dhaka"
    },
    {
        id: 9,
        text: "From the first match suggestion to our engagement, everything happened so naturally. Humsafar truly lives up to its name.",
        couple: "Rohan & Sneha",
        initials: "R & S",
        year: "2024",
        city: "Pune"
    },
    {
        id: 10,
        text: "We found each other across cities, connected by shared dreams and values. Technology brought us together, love keeps us together.",
        couple: "Usman & Farah",
        initials: "U & F",
        year: "2025",
        city: "Dubai"
    }
];

// GET /api/stats — Fake stats combined with real user count
router.get('/stats', (req, res) => {
    try {
        const realUserCount = getUserCount();

        res.json({
            members: 25000 + realUserCount,
            successfulMatches: 12500,
            verifiedProfiles: 18000 + realUserCount,
            satisfaction: 95,
            realUsers: realUserCount
        });
    } catch (err) {
        console.error('Stats error:', err);
        res.json({
            members: 25000,
            successfulMatches: 12500,
            verifiedProfiles: 18000,
            satisfaction: 95,
            realUsers: 0
        });
    }
});

// GET /api/stories — Returns 3 random stories
router.get('/stories', (req, res) => {
    // Shuffle and pick 3
    const shuffled = [...STORIES_POOL].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 3);
    res.json({ stories: selected });
});

module.exports = router;
