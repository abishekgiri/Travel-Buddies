const express = require('express');
const router = express.Router();
const db = require('../database.cjs');
const Amadeus = require('amadeus');

// Initialize Amadeus client
let amadeusClient = null;
if (process.env.AMADEUS_API_KEY && process.env.AMADEUS_API_SECRET) {
    amadeusClient = new Amadeus({
        clientId: process.env.AMADEUS_API_KEY,
        clientSecret: process.env.AMADEUS_API_SECRET
    });
    console.log('[Amadeus] Client initialized successfully');
} else {
    console.log('[Amadeus] No API credentials found - using mock data');
}

// Major airports worldwide for city name search
const AIRPORTS = {
    // North America
    'new york': 'JFK', 'nyc': 'JFK', 'newyork': 'JFK',
    'los angeles': 'LAX', 'la': 'LAX', 'losangeles': 'LAX',
    'chicago': 'ORD',
    'san francisco': 'SFO', 'sf': 'SFO',
    'miami': 'MIA',
    'toronto': 'YYZ',
    'vancouver': 'YVR',
    'mexico city': 'MEX', 'mexicocity': 'MEX',

    // Europe
    'london': 'LHR',
    'paris': 'CDG',
    'frankfurt': 'FRA',
    'amsterdam': 'AMS',
    'madrid': 'MAD',
    'barcelona': 'BCN',
    'rome': 'FCO',
    'milan': 'MXP',
    'munich': 'MUC',
    'zurich': 'ZRH',
    'vienna': 'VIE',
    'brussels': 'BRU',
    'copenhagen': 'CPH',
    'stockholm': 'ARN',
    'oslo': 'OSL',
    'helsinki': 'HEL',
    'dublin': 'DUB',
    'lisbon': 'LIS',
    'athens': 'ATH',
    'istanbul': 'IST',
    'moscow': 'SVO',

    // Asia
    'tokyo': 'NRT',
    'shanghai': 'PVG',
    'beijing': 'PEK',
    'hong kong': 'HKG', 'hongkong': 'HKG',
    'singapore': 'SIN',
    'bangkok': 'BKK',
    'kuala lumpur': 'KUL', 'kualalumpur': 'KUL',
    'jakarta': 'CGK',
    'manila': 'MNL',
    'seoul': 'ICN',
    'taipei': 'TPE',
    'delhi': 'DEL',
    'mumbai': 'BOM',
    'bangalore': 'BLR',
    'dubai': 'DXB',
    'doha': 'DOH',
    'abu dhabi': 'AUH', 'abudhabi': 'AUH',
    'riyadh': 'RUH',
    'tel aviv': 'TLV', 'telaviv': 'TLV',
    'kathmandu': 'KTM',

    // Oceania
    'sydney': 'SYD',
    'melbourne': 'MEL',
    'auckland': 'AKL',

    // Africa
    'cairo': 'CAI',
    'johannesburg': 'JNB',
    'cape town': 'CPT', 'capetown': 'CPT',
    'nairobi': 'NBO',
    'lagos': 'LOS',

    // South America
    'sao paulo': 'GRU', 'saopaulo': 'GRU',
    'rio de janeiro': 'GIG', 'rio': 'GIG',
    'buenos aires': 'EZE', 'buenosaires': 'EZE',
    'lima': 'LIM',
    'santiago': 'SCL',
    'bogota': 'BOG'
};

// Helper function to resolve airport code from city name or code
function resolveAirportCode(input) {
    if (!input) return input;

    const normalized = input.toLowerCase().trim();

    // If it's already a 3-letter IATA code, return uppercase
    if (/^[a-z]{3}$/i.test(input)) {
        return input.toUpperCase();
    }

    // Look up in our airports database
    return AIRPORTS[normalized] || input.toUpperCase();
}

// Fetch Real Flights from Amadeus API
const fetchRealFlights = async (from, to, date) => {
    console.log(`[Amadeus] Searching flights: ${from} → ${to} on ${date}`);

    if (!amadeusClient) {
        console.log('[Amadeus] No client available, using mock data');
        return generateMockFlights(from, to, date);
    }

    try {
        // Amadeus Flight Offers Search
        const response = await amadeusClient.shopping.flightOffersSearch.get({
            originLocationCode: from.toUpperCase(),
            destinationLocationCode: to.toUpperCase(),
            departureDate: date,
            adults: '1',
            max: '10'
        });

        console.log(`[Amadeus] API Status: ${response.statusCode}`);

        if (response.data && response.data.length > 0) {
            console.log(`[Amadeus] Found ${response.data.length} flight offers`);

            const flights = response.data
                .map(offer => {
                    // Get first itinerary (outbound)
                    const itinerary = offer.itineraries[0];
                    const segments = itinerary.segments;

                    // Get first and last segment for departure/arrival
                    const firstSegment = segments[0];
                    const lastSegment = segments[segments.length - 1];

                    const depTime = new Date(firstSegment.departure.at);
                    const arrTime = new Date(lastSegment.arrival.at);
                    const duration = Math.floor((arrTime - depTime) / 60000);

                    // Get carrier name from first segment
                    const carrier = firstSegment.carrierCode;
                    const flightNumber = `${carrier}${firstSegment.number}`;

                    return {
                        type: 'flight',
                        carrier: carrier,
                        transport_number: flightNumber,
                        departure_location: firstSegment.departure.iataCode,
                        arrival_location: lastSegment.arrival.iataCode,
                        departure_time: depTime.toISOString(),
                        arrival_time: arrTime.toISOString(),
                        duration: duration,
                        price: offer.price ? `${offer.price.total} ${offer.price.currency}` : null,
                        stops: segments.length - 1,
                        real_data: true
                    };
                })
                .filter(f => f.duration > 240); // Only flights > 4 hours

            console.log(`[Amadeus] After filtering (>4h): ${flights.length} flights`);

            if (flights.length > 0) {
                console.log('[Amadeus] Sample flight:', flights[0]);
                return flights;
            } else {
                console.log('[Amadeus] No flights match criteria, using mock data');
                return generateMockFlights(from, to, date);
            }
        } else {
            console.log('[Amadeus] No flight offers found, using mock data');
            return generateMockFlights(from, to, date);
        }
    } catch (error) {
        console.error('[Amadeus] API Exception:', error.message);
        if (error.response) {
            console.error('[Amadeus] Response:', JSON.stringify(error.response.body, null, 2));
        }
        return generateMockFlights(from, to, date);
    }
};

// Mock Data Generator (as fallback)
const generateMockFlights = (from, to, date) => {
    const airlines = ['Emirates', 'Qatar Airways', 'Lufthansa', 'British Airways', 'Delta'];
    const flights = [];
    for (let i = 0; i < 5; i++) {
        const airline = airlines[Math.floor(Math.random() * airlines.length)];
        const flightNum = `${airline.substring(0, 2).toUpperCase()}${Math.floor(100 + Math.random() * 900)}`;
        const duration = 300 + Math.floor(Math.random() * 600); // 5-15 hours

        const depTime = new Date(date);
        depTime.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));

        const arrTime = new Date(depTime.getTime() + duration * 60000);

        flights.push({
            type: 'flight',
            carrier: airline,
            transport_number: flightNum,
            departure_location: from.toUpperCase(),
            arrival_location: to.toUpperCase(),
            departure_time: depTime.toISOString(),
            arrival_time: arrTime.toISOString(),
            duration: duration
        });
    }
    return flights;
};

const generateMockGroundTransport = (type, from, to, date) => {
    const carriers = type === 'train' ? ['Eurostar', 'Amtrak', 'TGV', 'Shinkansen'] : ['Greyhound', 'FlixBus', 'Megabus'];
    const trips = [];
    for (let i = 0; i = 3; i++) {
        const carrier = carriers[Math.floor(Math.random() * carriers.length)];
        const num = Math.floor(1000 + Math.random() * 9000);
        const duration = 240 + Math.floor(Math.random() * 300); // 4-9 hours

        const depTime = new Date(date);
        depTime.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60));

        const arrTime = new Date(depTime.getTime() + duration * 60000);

        trips.push({
            type: type,
            carrier: carrier,
            transport_number: `${num}`,
            departure_location: from,
            arrival_location: to,
            departure_time: depTime.toISOString(),
            arrival_time: arrTime.toISOString(),
            duration: duration
        });
    }
    return trips;
};

// Search Transport
router.get('/search', async (req, res) => {
    let { type, from, to, date } = req.query;

    if (!type || !from || !to || !date) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    // Resolve city names to airport codes
    from = resolveAirportCode(from);
    to = resolveAirportCode(to);

    console.log(`[Search] Resolved: ${req.query.from} → ${from}, ${req.query.to} → ${to}`);

    try {
        // 1. Search in DB for existing user-created journeys
        const dbJourneys = await new Promise((resolve, reject) => {
            db.all(`
                SELECT * FROM transport_journeys 
                WHERE type = ? 
                AND departure_location LIKE ? 
                AND arrival_location LIKE ? 
                AND date(departure_time) = date(?)
            `, [type, `%${from}%`, `%${to}%`, date], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        // 2. Generate Mock Data (simulating external API)
        let mockJourneys = [];
        if (type === 'flight') {
            mockJourneys = await fetchRealFlights(from, to, date);
        } else {
            mockJourneys = generateMockGroundTransport(type, from, to, date);
        }

        // 3. Merge and Deduplicate
        // In a real app, we'd be smarter. Here we just append mock data if not exact match.
        // For simplicity, we'll return both, but UI can handle display.
        // We attach member counts to DB journeys

        const enhancedDbJourneys = await Promise.all(dbJourneys.map(async (j) => {
            const memberCount = await new Promise((resolve) => {
                db.get('SELECT COUNT(*) as count FROM journey_members WHERE journey_id = ?', [j.id], (err, row) => {
                    resolve(row ? row.count : 0);
                });
            });
            return { ...j, member_count: memberCount, source: 'db' };
        }));

        const results = [...enhancedDbJourneys, ...mockJourneys.map(j => ({ ...j, member_count: 0, source: 'api' }))];

        res.json({ success: true, data: results });

    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Join a Journey
router.post('/join', async (req, res) => {
    const { user_id, journey } = req.body;

    if (!user_id || !journey) {
        return res.status(400).json({ error: 'Missing data' });
    }

    try {
        let journeyId = journey.id;

        // If it's an API result (no ID), create it in DB first
        if (!journeyId) {
            journeyId = await new Promise((resolve, reject) => {
                db.run(`
                    INSERT INTO transport_journeys (type, carrier, transport_number, departure_location, arrival_location, departure_time, arrival_time, duration)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `, [
                    journey.type, journey.carrier, journey.transport_number,
                    journey.departure_location, journey.arrival_location,
                    journey.departure_time, journey.arrival_time, journey.duration
                ], function (err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                });
            });
        }

        // Add user to journey members
        await new Promise((resolve, reject) => {
            db.run(`
                INSERT INTO journey_members (journey_id, user_id, status)
                VALUES (?, ?, 'interested')
            `, [journeyId, user_id], (err) => {
                if (err) {
                    if (err.message.includes('UNIQUE')) resolve(); // Already joined
                    else reject(err);
                } else resolve();
            });
        });

        res.json({ success: true, message: 'Joined journey successfully', journeyId });

    } catch (error) {
        console.error('Join error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get Journey Members
router.get('/:id/members', (req, res) => {
    const { id } = req.params;
    db.all(`
        SELECT u.id, u.name, u.avatar, u.role, jm.status 
        FROM journey_members jm
        JOIN users u ON jm.user_id = u.id
        WHERE jm.journey_id = ?
    `, [id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, data: rows });
    });
});

module.exports = router;
