const axios = require('axios');
const db = require('./server/database.cjs');

const API_URL = 'http://localhost:3000/api';

async function runVerification() {
    try {
        console.log('Starting transport verification...');

        // 1. Create Test User
        const email = `traveler_${Date.now()}@test.com`;
        await axios.post(`${API_URL}/auth/signup`, {
            name: 'Global Traveler',
            email: email,
            password: 'password123'
        });

        const user = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
        console.log(`Created user: ${email} (ID: ${user.id})`);

        // 2. Search for Flights
        console.log('Searching for flights from JFK to LHR...');
        const searchResponse = await axios.get(`${API_URL}/transport/search`, {
            params: {
                type: 'flight',
                from: 'JFK',
                to: 'LHR',
                date: '2025-06-01'
            }
        });

        const flights = searchResponse.data.data;
        console.log(`Found ${flights.length} flights.`);

        if (flights.length === 0) {
            throw new Error('No flights found (Mock data should return some)');
        }

        const targetFlight = flights[0];
        console.log(`Selected flight: ${targetFlight.carrier} ${targetFlight.transport_number}`);

        // 3. Join the Flight
        console.log('Joining flight...');
        const joinResponse = await axios.post(`${API_URL}/transport/join`, {
            user_id: user.id,
            journey: targetFlight
        });

        if (joinResponse.data.success) {
            console.log('✅ Joined flight successfully');
            console.log('Journey ID:', joinResponse.data.journeyId);
        } else {
            throw new Error('Failed to join flight');
        }

        // 4. Verify Members
        const membersResponse = await axios.get(`${API_URL}/transport/${joinResponse.data.journeyId}/members`);
        const members = membersResponse.data.data;

        const isMember = members.find(m => m.id === user.id);
        if (isMember) {
            console.log('✅ SUCCESS: User is listed as a member of the journey!');
        } else {
            console.error('❌ FAILURE: User not found in journey members.');
        }

    } catch (error) {
        console.error('Verification failed:', error.response ? error.response.data : error.message);
    }
}

runVerification();
