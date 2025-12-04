const express = require('express');
const router = express.Router();
const Groq = require('groq-sdk');
const dotenv = require('dotenv');

dotenv.config();

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY || 'dummy_key'
});

router.post('/chat', async (req, res) => {
    const { message } = req.body;

    if (!message) {
        return res.status(400).json({ error: 'Message is required' });
    }

    try {
        if (!process.env.GROQ_API_KEY) {
            // Mock response if no API key is present
            return res.json({
                response: "I'm a travel bot! I can help you plan trips, but right now I'm running in mock mode because my API key is missing. Please add GROQ_API_KEY to your .env file."
            });
        }

        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: "You are a helpful travel assistant for the 'Travel Buddies' app. You help users find travel companions, plan trips, and give travel advice. Keep your responses concise and friendly."
                },
                {
                    role: "user",
                    content: message
                }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.7,
            max_tokens: 1024,
        });

        const aiResponse = chatCompletion.choices[0]?.message?.content || "I'm sorry, I couldn't generate a response.";

        res.json({ response: aiResponse });

    } catch (error) {
        console.error('Error calling Groq API:', error);
        // Fallback to mock response instead of failing
        res.json({
            response: "I'm having trouble connecting to my AI brain right now (Invalid API Key or Service Down). But I'm still here! I can help you find trips or navigate the app."
        });
    }
});

const db = require('../database.cjs');

router.post('/generate-itinerary', async (req, res) => {
    const { tripId, destination, startDate, endDate, interests } = req.body;

    if (!tripId || !destination || !startDate || !endDate) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const prompt = `
            Generate a day-by-day itinerary for a trip to ${destination} from ${startDate} to ${endDate}.
            The traveler is interested in: ${interests || 'general sightseeing'}.
            
            Return ONLY a valid JSON array of objects. Do not include any markdown formatting or explanation.
            Each object must have these fields:
            - activity: string (title of the activity)
            - date: string (YYYY-MM-DD format)
            - cost: number (estimated cost in USD)
            - notes: string (brief description)
            
            Example format:
            [
                { "activity": "Visit Eiffel Tower", "date": "2023-10-01", "cost": 30, "notes": "Morning visit to avoid crowds" }
            ]
        `;

        let activities = [];
        let useMock = !process.env.GROQ_API_KEY;

        if (!useMock) {
            try {
                const chatCompletion = await groq.chat.completions.create({
                    messages: [
                        {
                            role: "system",
                            content: "You are a travel planner API. You output only valid JSON arrays."
                        },
                        {
                            role: "user",
                            content: prompt
                        }
                    ],
                    model: "llama-3.3-70b-versatile",
                    temperature: 0.5,
                    max_tokens: 2048,
                });

                const content = chatCompletion.choices[0]?.message?.content || "[]";
                // Clean up potential markdown code blocks
                const jsonStr = content.replace(/```json/g, '').replace(/```/g, '').trim();
                activities = JSON.parse(jsonStr);
            } catch (error) {
                console.warn('Groq API failed, falling back to mock:', error.message);
                useMock = true;
            }
        }

        if (useMock) {
            // Mock response
            console.log('Using mock AI response');
            const start = new Date(startDate);
            const end = new Date(endDate);
            const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

            for (let i = 0; i < days; i++) {
                const currentDate = new Date(start);
                currentDate.setDate(start.getDate() + i);
                const dateStr = currentDate.toISOString().split('T')[0];

                activities.push({
                    activity: `Explore ${destination} - Day ${i + 1}`,
                    date: dateStr,
                    cost: 50,
                    notes: `Enjoying the local vibes of ${destination}`
                });
                activities.push({
                    activity: `Dinner at local restaurant`,
                    date: dateStr,
                    cost: 40,
                    notes: `Tasting local cuisine`
                });
            }
        }

        console.log('Parsed activities:', activities);

        // Save to database using direct db.run for simplicity and debugging
        const insertActivity = (act) => {
            return new Promise((resolve, reject) => {
                db.run(
                    'INSERT INTO trip_activities (trip_id, activity, date, cost, notes) VALUES (?, ?, ?, ?, ?)',
                    [tripId, act.activity, act.date, act.cost, act.notes],
                    (err) => {
                        if (err) reject(err);
                        else resolve();
                    }
                );
            });
        };

        try {
            for (const act of activities) {
                await insertActivity(act);
            }
            res.json({ success: true, activities });
        } catch (dbError) {
            console.error('Database insertion error:', dbError);
            res.status(500).json({ error: `Failed to save itinerary: ${dbError.message}` });
        }

    } catch (error) {
        console.error('Error generating itinerary:', error);
        res.status(500).json({ error: `Internal server error: ${error.message}` });
    }
});

router.post('/recommendations', async (req, res) => {
    const { destination } = req.body;

    if (!destination) {
        return res.status(400).json({ error: 'Destination is required' });
    }

    try {
        const prompt = `
            List 5 "must-do" best activities or hidden gems for a traveler visiting ${destination}.
            Return ONLY a valid JSON array of strings. Do not include any markdown formatting or explanation.
            Example: ["Visit the Louvre", "Walk along the Seine", "Explore Montmartre"]
        `;

        if (!process.env.GROQ_API_KEY) {
            // Mock response
            return res.json({
                success: true,
                recommendations: [
                    `Explore the historic center of ${destination}`,
                    `Visit the famous local market in ${destination}`,
                    `Take a guided food tour`,
                    `Visit the main museum`,
                    `Enjoy a sunset view point`
                ]
            });
        }

        const chatCompletion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: "You are a local travel expert. You output only valid JSON arrays of strings."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: 0.5,
            max_tokens: 1024,
        });

        const content = chatCompletion.choices[0]?.message?.content || "[]";
        const jsonStr = content.replace(/```json/g, '').replace(/```/g, '').trim();
        const recommendations = JSON.parse(jsonStr);

        res.json({ success: true, recommendations });

    } catch (error) {
        console.error('Error getting recommendations:', error);
        res.status(500).json({ error: 'Failed to get recommendations' });
    }
});

module.exports = router;
