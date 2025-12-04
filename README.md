# Travel Buddies

Travel Buddies is a modern web application designed to connect travelers, plan trips, and manage travel budgets. It features real-time chat, AI-powered recommendations, and a comprehensive trip management system.

![Travel Buddies Banner](https://via.placeholder.com/1200x400?text=Travel+Buddies+App)

##  Features

###  Authentication & User Management
- **Secure Signup/Login**: JWT-based authentication with bcrypt password hashing.
- **Email Verification**: 6-digit code verification for new accounts.
- **Password Reset**: Secure "Forgot Password" flow via email.
- **Profile Management**: Customizable profiles with avatars, cover photos, bio, and interests.

###  Social & Connection
- **Find Travelers**: Search for companions based on destination, interests, gender, and budget.
- **AI Match Score**: Smart compatibility scoring to find your perfect travel buddy.
- **Real-time Chat**: Instant messaging with online status indicators using Socket.io.
- **Friend System**: Add friends and manage connections.

###  Trip Planning
- **Trip Creation**: Create detailed itineraries with dates, destinations, and budgets.
- **Budget Planner**: Track expenses, split costs, and manage trip finances.
- **Transport Search**: Integrated Amadeus API for real-time flight and transport data.
- **Map View**: Visualize traveler locations and trip destinations on an interactive map.

###  AI & Tools
- **AI ChatBot**: Integrated Groq API for instant travel advice and assistance.
- **Weather Widget**: Real-time weather updates for your destination (OpenWeatherMap).
- **Responsive Design**: Optimized UI for both Desktop and Mobile devices.

## Tech Stack

### Frontend
- **React 18**: UI Library with Hooks and Context API.
- **Vite**: Blazing fast build tool.
- **Socket.io-client**: Real-time bidirectional communication.
- **React Router**: Client-side routing.
- **CSS3**: Custom responsive styling with glassmorphism aesthetics.

### Backend
- **Node.js & Express**: Robust server-side framework.
- **SQLite**: Lightweight, serverless relational database.
- **Socket.io**: Real-time event-based communication.
- **Nodemailer**: Email sending service.
- **JWT**: Stateless authentication.

### APIs & Services
- **Amadeus API**: Flight and travel data.
- **Groq API**: AI/LLM integration.
- **OpenWeatherMap**: Weather data.
- **Render**: Backend hosting.
- **Vercel**: Frontend hosting.

##  Project Structure

```bash
travel_buddies/
├── src/
│   ├── components/      # Reusable UI components (Navbar, ChatBot, etc.)
│   ├── context/         # React Context (Auth, Theme)
│   ├── hooks/           # Custom hooks (useMobile, etc.)
│   ├── pages/           # Application pages (Home, Login, Profile, etc.)
│   ├── App.jsx          # Main application component
│   └── main.jsx         # Entry point
├── server/
│   ├── routes/          # API routes (auth, users, trips, etc.)
│   ├── utils/           # Utility functions (email, etc.)
│   ├── database.cjs     # SQLite database configuration
│   ├── index.cjs        # Express server entry point
│   └── socket.cjs       # Socket.io configuration
├── public/              # Static assets
└── package.json         # Project dependencies
```

##  Getting Started

### Prerequisites
- Node.js (v16+)
- npm or yarn

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/travel-buddies.git
    cd travel-buddies
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Environment Setup**
    Create a `.env` file in the root directory with the following variables:

    ```env
    # Backend Configuration
    PORT=3000
    JWT_SECRET=your_super_secret_key
    
    # Email Service (Gmail or Resend)
    EMAIL_USER=your_email@gmail.com
    EMAIL_PASS=your_app_password
    
    # APIs
    GROQ_API_KEY=your_groq_api_key
    AMADEUS_API_KEY=your_amadeus_api_key
    AMADEUS_API_SECRET=your_amadeus_secret
    
    # Frontend Configuration
    VITE_OWM_API_KEY=your_openweathermap_key
    
    # Deployment URLs (Set these in production)
    # CLIENT_URL=https://your-vercel-app.vercel.app
    ```

4.  **Run Locally**
    ```bash
    npm run dev
    ```
    This command runs both the backend (port 3000) and frontend (port 5173) concurrently.

##  Deployment

### Backend (Render)
1.  Create a new **Web Service** on Render.
2.  Connect your GitHub repository.
3.  Set **Build Command**: `npm install`
4.  Set **Start Command**: `node server/index.cjs`
5.  Add Environment Variables: `JWT_SECRET`, `EMAIL_USER`, `EMAIL_PASS`, `GROQ_API_KEY`, `AMADEUS_API_KEY`, `AMADEUS_API_SECRET`, `CLIENT_URL` (your Vercel URL).

### Frontend (Vercel)
1.  Import your GitHub repository to Vercel.
2.  Framework Preset: **Vite**.
3.  Add Environment Variables:
    - `VITE_API_URL`: Your Render Backend URL (e.g., `https://travel-buddies.onrender.com`)
    - `VITE_OWM_API_KEY`: Your OpenWeatherMap Key.
4.  Deploy!

## Contributing

Contributions are welcome! Please fork the repository and submit a pull request.

##  License

This project is licensed under the MIT License.
