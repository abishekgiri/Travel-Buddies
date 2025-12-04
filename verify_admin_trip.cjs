const axios = require('axios');
const db = require('./server/database.cjs');
const bcrypt = require('bcrypt');

const API_URL = 'http://localhost:3000/api';

async function runVerification() {
    try {
        console.log('Starting verification...');

        // 1. Create Admin User
        const adminEmail = `admin_${Date.now()}@test.com`;
        const adminPass = 'password123';

        // Register
        await axios.post(`${API_URL}/auth/signup`, {
            name: 'Test Admin',
            email: adminEmail,
            password: adminPass
        });

        // Get Admin ID and Update Role
        const adminUser = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM users WHERE email = ?', [adminEmail], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        await new Promise((resolve, reject) => {
            db.run("UPDATE users SET role = 'owner' WHERE id = ?", [adminUser.id], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
        console.log(`Created admin user: ${adminEmail} (ID: ${adminUser.id})`);

        // 2. Create Regular User
        const userEmail = `user_${Date.now()}@test.com`;
        await axios.post(`${API_URL}/auth/signup`, {
            name: 'Test User',
            email: userEmail,
            password: 'password123'
        });

        const regularUser = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM users WHERE email = ?', [userEmail], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        console.log(`Created regular user: ${userEmail} (ID: ${regularUser.id})`);

        // Update user interests to match the trip we are about to create
        await new Promise((resolve, reject) => {
            db.run("UPDATE users SET destination = 'Mars', interests = '[\"Space\", \"Adventure\"]' WHERE id = ?", [regularUser.id], (err) => {
                if (err) reject(err);
                else resolve();
            });
        });

        // 3. Create Admin Trip
        const tripData = {
            creator_id: adminUser.id,
            title: 'Ultimate Mars Colony',
            destination: 'Mars',
            start_date: '2030-01-01',
            end_date: '2030-12-31',
            budget: 50000,
            max_travelers: 5,
            description: 'A once in a lifetime Space Adventure to the red planet.',
            image_url: 'https://example.com/mars.jpg',
            activities: ['Launch', 'Landing', 'Rover Drive']
        };

        const createResponse = await axios.post(`${API_URL}/trips/admin/create`, tripData);
        console.log('Admin trip created:', createResponse.data);

        // 4. Get Recommendations for Regular User
        const recResponse = await axios.get(`${API_URL}/recommendations/trips/${regularUser.id}`);
        const recommendations = recResponse.data;

        console.log(`Got ${recommendations.length} recommendations`);

        const foundTrip = recommendations.find(t => t.id === createResponse.data.data.id);

        if (foundTrip) {
            console.log('✅ SUCCESS: Admin trip found in recommendations!');
            console.log('Trip Score:', foundTrip.compatibility_score);
            console.log('Creator Role:', foundTrip.creator_role);
        } else {
            console.error('❌ FAILURE: Admin trip NOT found in recommendations.');
            console.log('Recommendations IDs:', recommendations.map(t => t.id));
        }

    } catch (error) {
        console.error('Verification failed:', error.response ? error.response.data : error.message);
    }
}

runVerification();
