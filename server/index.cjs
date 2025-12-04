const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const db = require('./database.cjs');
const authRoutes = require('./routes/auth.cjs');
const userRoutes = require('./routes/users.cjs');
const tripRoutes = require('./routes/trips.cjs');
const messageRoutes = require('./routes/messages.cjs');
const uploadRoutes = require('./routes/upload.cjs');
const aiRoutes = require('./routes/ai.cjs');
const budgetRoutes = require('./routes/budgets.cjs');
const recommendationRoutes = require('./routes/recommendations.cjs');
const { initializeSocket } = require('./socket.cjs');

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Initialize Socket.IO
initializeSocket(server);

// Middleware
app.use(cors());
app.use(express.json());

// Serve uploaded files
app.use('/uploads', express.static('server/uploads'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/transport', require('./routes/transport.cjs'));
app.use('/api/photos', require('./routes/photos.cjs'));

// Socket.IO is initialized in socket.cjs


app.get('/', (req, res) => {
    res.send('Travel Buddies API is running');
});

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
