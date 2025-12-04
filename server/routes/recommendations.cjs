const express = require('express');
const router = express.Router();
const db = require('../database.cjs');
const Groq = require('groq-sdk');

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY || 'dummy_key'
});

// Calculate trip compatibility score for a user
function calculateTripScore(user, trip) {
    let score = 0;

    try {
        // Interest matching (40 points)
        const userInterests = JSON.parse(user.interests || '[]');
        if (trip.description && userInterests.length > 0) {
            const descLower = trip.description.toLowerCase();
            const matchedInterests = userInterests.filter(interest =>
                descLower.includes(interest.toLowerCase())
            );
            score += (matchedInterests.length / Math.max(userInterests.length, 1)) * 40;
        }

        // Budget compatibility (30 points)
        if (trip.budget && user.age) {
            // Simple budget matching - could be enhanced
            const budgetScore = trip.budget > 0 && trip.budget < 10000 ? 30 : 15;
            score += budgetScore;
        } else if (trip.budget) {
            score += 20;
        }

        // Location preference (30 points)
        if (user.destination && trip.destination) {
            if (user.destination.toLowerCase().includes(trip.destination.toLowerCase()) ||
                trip.destination.toLowerCase().includes(user.destination.toLowerCase())) {
                score += 30;
            } else {
                score += 10;
            }
        }

        // Admin/Owner trip bonus (20 points)
        if (trip.creator_role === 'owner' || trip.creator_role === 'admin') {
            score += 20;
        }

        return Math.min(Math.round(score), 100);
    } catch (error) {
        console.error('Error calculating score:', error);
        return 0;
    }
}

// Get recommended trips for a user
router.get('/trips/:userId', async (req, res) => {
    const { userId } = req.params;
    const limit = req.query.limit || 6;

    try {
        // Get user data
        const user = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM users WHERE id = ?', [userId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Get all open trips that user is not a member of
        const trips = await new Promise((resolve, reject) => {
            db.all(`
        SELECT t.*, u.role as creator_role FROM trips t
        JOIN users u ON t.creator_id = u.id
        LEFT JOIN trip_members tm ON t.id = tm.trip_id AND tm.user_id = ?
        WHERE t.status = 'open' 
          AND t.creator_id != ?
          AND tm.id IS NULL
        ORDER BY t.created_at DESC
      `, [userId, userId], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        // Calculate scores for each trip
        const scoredTrips = trips.map(trip => ({
            ...trip,
            compatibility_score: calculateTripScore(user, trip)
        }));

        // Sort by score and get top matches
        scoredTrips.sort((a, b) => b.compatibility_score - a.compatibility_score);
        const topTrips = scoredTrips.slice(0, limit);

        res.json(topTrips);
    } catch (error) {
        console.error('Error getting recommendations:', error);
        res.status(500).json({ error: 'Failed to get recommendations' });
    }
});

// Get AI-powered trip recommendations
router.get('/ai-trips/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
        // Get user data
        const user = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM users WHERE id = ?', [userId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Get available trips
        const trips = await new Promise((resolve, reject) => {
            db.all(`
        SELECT t.*, u.role as creator_role FROM trips t
        JOIN users u ON t.creator_id = u.id
        LEFT JOIN trip_members tm ON t.id = tm.trip_id AND tm.user_id = ?
        WHERE t.status = 'open' 
          AND t.creator_id != ?
          AND tm.id IS NULL
        LIMIT 10
      `, [userId, userId], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        if (trips.length === 0) {
            return res.json({ recommendations: [], explanation: 'No available trips found.' });
        }

        if (!process.env.GROQ_API_KEY) {
            // Fallback to score-based recommendations
            const scoredTrips = trips.map(trip => ({
                ...trip,
                compatibility_score: calculateTripScore(user, trip)
            }));
            scoredTrips.sort((a, b) => b.compatibility_score - a.compatibility_score);

            return res.json({
                recommendations: scoredTrips.slice(0, 3),
                explanation: 'Recommendations based on interest and location matching.'
            });
        }

        // Prepare data for AI
        const userProfile = {
            interests: user.interests,
            destination: user.destination,
            location: user.location,
            bio: user.bio
        };

        const tripSummaries = trips.slice(0, 5).map(t => ({
            id: t.id,
            title: t.title,
            destination: t.destination,
            budget: t.budget,
            description: t.description
        }));

        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: "You are a travel recommendation AI. Analyze the user's profile and recommend the top 3 trips from the list. Return ONLY a JSON object with format: {\"tripIds\": [id1, id2, id3], \"reason\": \"Brief explanation\"}. Be concise."
                },
                {
                    role: "user",
                    content: `User Profile: ${JSON.stringify(userProfile)}\n\nAvailable Trips: ${JSON.stringify(tripSummaries)}\n\nRecommend the top 3 trip IDs and explain why briefly.`
                }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.7,
            max_tokens: 500,
        });

        const aiResponse = chatCompletion.choices[0]?.message?.content || '{}';

        try {
            const parsed = JSON.parse(aiResponse);
            const recommendedTrips = trips.filter(t => parsed.tripIds?.includes(t.id));

            res.json({
                recommendations: recommendedTrips,
                explanation: parsed.reason || 'AI-powered recommendations based on your profile.'
            });
        } catch {
            // If AI response can't be parsed, fall back to score-based
            const scoredTrips = trips.map(trip => ({
                ...trip,
                compatibility_score: calculateTripScore(user, trip)
            }));
            scoredTrips.sort((a, b) => b.compatibility_score - a.compatibility_score);

            res.json({
                recommendations: scoredTrips.slice(0, 3),
                explanation: 'Recommendations based on compatibility scoring.'
            });
        }
    } catch (error) {
        console.error('Error getting AI recommendations:', error);
        res.status(500).json({ error: 'Failed to get AI recommendations' });
    }
});

// Get recommended companions for a trip
router.get('/companions/:tripId', async (req, res) => {
    const { tripId } = req.params;

    try {
        // Get trip data
        const trip = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM trips WHERE id = ?', [tripId], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });

        if (!trip) {
            return res.status(404).json({ error: 'Trip not found' });
        }

        // Get users who are not members of this trip
        const users = await new Promise((resolve, reject) => {
            db.all(`
        SELECT u.* FROM users u
        LEFT JOIN trip_members tm ON u.id = tm.user_id AND tm.trip_id = ?
        WHERE  u.id != ? AND tm.id IS NULL AND u.role = 'customer'
        LIMIT 20
      `, [tripId, trip.creator_id], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });

        // Calculate how well each user matches the trip
        const scoredUsers = users.map(user => ({
            ...user,
            compatibility_score: calculateTripScore(user, trip)
        }));

        scoredUsers.sort((a, b) => b.compatibility_score - a.compatibility_score);

        res.json(scoredUsers.slice(0, 10));
    } catch (error) {
        console.error('Error getting companion recommendations:', error);
        res.status(500).json({ error: 'Failed to get recommendations' });
    }
});

module.exports = router;
