const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const http = require('http');
const socketIo = require('socket.io');

// Load environment variables
dotenv.config();

// Create Express app
const app = express();
const server = http.createServer(app);

// Initialize Socket.io for real-time tracking
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Database Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log('✅ MongoDB connected successfully');
})
.catch((err) => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

// Socket.io Connection Handling (Real-time tracking)
io.on('connection', (socket) => {
  console.log('🔗 New client connected:', socket.id);

  // Driver location updates
  socket.on('driver-location-update', (data) => {
    console.log('📍 Driver location update:', data);
    // Broadcast to customers tracking this delivery
    socket.broadcast.to(`delivery-${data.deliveryId}`).emit('location-update', data);
  });

  // Customer joins delivery tracking room
  socket.on('track-delivery', (deliveryId) => {
    socket.join(`delivery-${deliveryId}`);
    console.log(`👀 Customer tracking delivery: ${deliveryId}`);
  });

  // Driver joins their delivery room
  socket.on('driver-online', (driverId) => {
    socket.join(`driver-${driverId}`);
    console.log(`🚚 Driver online: ${driverId}`);
  });

  socket.on('disconnect', () => {
    console.log('❌ Client disconnected:', socket.id);
  });
});

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/delivery', require('./routes/delivery'));
app.use('/api/route', require('./routes/route'));

// Health Check Route
app.get('/api/health', (req, res) => {
  res.json({ 
    message: 'Delivery Optimization Server is running!', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV 
  });
});

// Error Handling Middleware
app.use((err, req, res, next) => {
  console.error('🚨 Server Error:', err.stack);
  res.status(500).json({ 
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal Server Error'
  });
});

// 404 Handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV}`);
  console.log(`📡 Socket.io ready for real-time tracking`);
});

// Export for testing
module.exports = { app, io };
