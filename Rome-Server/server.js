import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST']
  }
});

const PORT = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// In-memory storage
const messages = []; // { userId, content, timestamp }

// REST API endpoints
app.get('/api/messages', (req, res) => {
  res.json(messages);
});

// WebSocket (Socket.io) events
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // Send all existing messages to the new client
  socket.emit('messages:init', messages);

  // Broadcast new message to all connected clients
  socket.on('message:post', (data) => {
    const { userId, content } = data;

    const message = {
      userId,
      content,
      timestamp: new Date().toISOString()
    };

    messages.push(message);
    
    // Broadcast to all clients
    io.emit('message:new', message);
  });

  // User disconnects
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
