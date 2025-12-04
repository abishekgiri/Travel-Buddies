const axios = require('axios');
const db = require('./server/database.cjs');

const API_URL = 'http://localhost:3000/api';

async function runVerification() {
    try {
        console.log('Starting deletion verification...');

        // 1. Create Admin User (if not exists, or just use one)
        const adminEmail = `admin_del_${Date.now()}@test.com`;
        await axios.post(`${API_URL}/auth/signup`, {
            name: 'Delete Admin',
            email: adminEmail,
            password: 'password123'
        });

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

        // 2. Create a Trip to Delete
        const tripData = {
            creator_id: adminUser.id,
            title: 'Trip To Delete',
            destination: 'Nowhere',
            start_date: '2025-01-01',
            end_date: '2025-01-05',
            budget: 100,
            max_travelers: 2,
            description: 'This trip will be deleted.',
            image_url: 'https://example.com/delete.jpg'
        };

        const createResponse = await axios.post(`${API_URL}/trips/admin/create`, tripData);
        const tripId = createResponse.data.data.id;
        console.log(`Created trip to delete (ID: ${tripId})`);

        // 3. Delete the Trip
        console.log('Attempting to delete trip...');
        const deleteResponse = await axios.delete(`${API_URL}/trips/${tripId}`, {
            data: { user_id: adminUser.id }
        });

        if (deleteResponse.data.success) {
            console.log('✅ Delete API returned success');
        } else {
            console.error('❌ Delete API failed:', deleteResponse.data);
        }

        // 4. Verify in Database
        const tripInDb = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM trips WHERE id = ?', [tripId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!tripInDb) {
            console.log('✅ SUCCESS: Trip is gone from database!');
        } else {
            console.error('❌ FAILURE: Trip still exists in database.');
        }

    } catch (error) {
        console.error('Verification failed:', error.response ? error.response.data : error.message);
    }
}

runVerification();
