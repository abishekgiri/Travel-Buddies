# Amadeus API Setup - FREE Real Flight Data! ✈️

## Why Amadeus?
- ✅ **10,000 FREE API calls/month** (test environment)
- ✅ **Real scheduled flight data** from 400+ airlines
- ✅ **Modern OAuth authentication**
- ✅ **Official SDK support**

## Quick Setup (5 minutes)

### Step 1: Create Free Account
1. Go to https://developers.amadeus.com/register
2. Fill in your details
3. Click "Create account"

### Step 2: Get Your API Credentials
1. Log in to https://developers.amadeus.com/my-apps
2. Click "Create New App"
3. Name it "Travel Buddies" (or anything you like)
4. You'll see:
   - **API Key** (also called Client ID)
   - **API Secret** (also called Client Secret)
5. Copy both!

### Step 3: Add to Your App
1. Open `.env` in your project
2. Paste your credentials:
   ```
   AMADEUS_API_KEY=your_api_key_here
   AMADEUS_API_SECRET=your_api_secret_here
   ```
3. Save the file
4. Restart your server (I'll do this for you)

### Step 4: Test!
1. Go to `/transport` in your app
2. Search: **JFK** → **LHR** (any future date)
3. See REAL flights from British Airways, Virgin Atlantic, etc!

## What You Get
- Real flight numbers (e.g., BA112, VS4)
- Actual departure/arrival times
- Number of stops
- Price information
- 400+ airlines worldwide

## Free Tier Limits
- **10,000 requests/month** in test environment
- More than enough for development and testing
- When ready for production, easy upgrade available

## Test vs Production
- **Test Environment**: Free, uses cached data (updated regularly)
- **Production**: Requires paid plan, real-time data

For your MVP, the test environment is perfect!

Ready to get started? Let me know once you have your credentials!
