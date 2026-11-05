import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: /^http:\/\/localhost:\d+$/,
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

// LLM Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { subject, message, history } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // TODO: Connect to local LLM (Ollama, LM Studio, etc.)
    // For now, this is a placeholder that echoes back a response
    // Replace with actual LLM call
    const response = await callLocalLLM(subject, message, history);

    res.json({ response });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(503).json({ error: 'tutor-unavailable' });
  }
});

// Placeholder function to call local LLM
// Update this to connect to your local LLM service (Ollama, LM Studio, etc.)
async function callLocalLLM(subject, message, history) {
  try {
    // Connect to local Ollama instance
    const ollamaHost = 'http://localhost:11434';
    const model = 'llama2';

    // Format the prompt with subject context
    const systemPrompt = `You are a ${subject} tutor for a student in ancient Rome. Provide clear, educational responses to help the student learn ${subject}. Keep your answers concise but informative.`;
    
    const prompt = `${systemPrompt}\n\nStudent: ${message}\n\nTutor:`;

    const response = await fetch(`${ollamaHost}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model,
        prompt: prompt,
        stream: false,
        temperature: 0.7,
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama error: ${response.status}`);
    }

    const data = await response.json();
    return data.response.trim();
  } catch (error) {
    console.error('LLM error:', error);
    throw error;
  }
}

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
