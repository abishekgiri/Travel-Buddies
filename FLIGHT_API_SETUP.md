# How to Get Real Flight Data

Your app is now configured to use **real flight data** from Aviationstack!

## Setup Instructions

### 1. Get Your Free API Key
1. Go to https://aviationstack.com/product
2. Click "Sign Up Free"
3. Complete registration
4. Copy your API key from the dashboard

### 2. Add API Key to Your App
1. Open `.env` file in your project root
2. Find the line: `AVIATIONSTACK_API_KEY=`
3. Paste your API key after the `=` sign
   ```
   AVIATIONSTACK_API_KEY=your_actual_key_here
   ```
4. Save the file
5. Restart your server (stop `npm run dev` and start again)

## How It Works

- **With API Key**: Shows real, live flight schedules from airlines worldwide
- **Without API Key**: Falls back to realistic mock data automatically
- **Free Tier**: 100 API calls per month (plenty for testing!)

## Testing

1. Go to `/transport` in your app
2. Search for flights (e.g., JFK → LHR)
3. You'll see real flight numbers, carriers, and schedules!

## Upgrade Options

If you need more requests:
- **Basic Plan**: $9.99/month for 10,000 requests
- **Professional**: $49.99/month for 100,000 requests

For now, the free tier is perfect for development and testing!
