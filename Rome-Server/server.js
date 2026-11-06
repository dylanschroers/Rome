import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { randomInt } from 'node:crypto';
import { createTavern } from './tavern.js';

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

const tavern = createTavern({ random: () => randomInt(0, 2 ** 32) / 2 ** 32 });

// REST API endpoints
app.get('/api/messages', (req, res) => {
  res.json(tavern.roomHistory());
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
const reply = (ack, result) => {
  if (typeof ack === 'function') ack(result);
};
const tableRoom = (tableId) => `table:${tableId}`;
const shareTavern = () => io.to('tavern').emit('tavern:state', tavern.snapshot());
const shareGame = (tableId) => io.to(tableRoom(tableId)).emit('game:state', { tableId, game: tavern.gameAt(tableId) });

io.on('connection', (socket) => {
  socket.emit('messages:init', tavern.roomHistory());

  socket.on('tavern:join', (data, ack) => {
    const result = tavern.join(socket.id, data);
    reply(ack, result);
    if (!result.ok) return;
    socket.join('tavern');
    shareTavern();
  });

  socket.on('tavern:rename', (name, ack) => {
    const result = tavern.rename(socket.id, name);
    reply(ack, result);
    if (result.ok) shareTavern();
  });

  socket.on('message:post', (data, ack) => {
    const result = tavern.sayInRoom(socket.id, data);
    reply(ack, result.ok ? { ok: true } : result);
    if (result.ok) io.to('tavern').emit('message:new', result.message);
  });

  socket.on('table:sit', (data, ack) => {
    const result = tavern.sit(socket.id, data?.tableId, data?.seat);
    reply(ack, result);
    if (!result.ok || !result.moved) return;
    if (result.left) {
      socket.leave(tableRoom(result.left));
      shareGame(result.left);
    }
    socket.join(tableRoom(result.tableId));
    socket.emit('table:history', { tableId: result.tableId, messages: tavern.tableHistory(result.tableId) });
    socket.emit('game:state', { tableId: result.tableId, game: tavern.gameAt(result.tableId) });
    shareTavern();
  });

  socket.on('table:leave', (ack) => {
    const result = tavern.leaveTable(socket.id);
    reply(ack, result);
    if (!result.ok) return;
    socket.leave(tableRoom(result.tableId));
    shareGame(result.tableId);
    shareTavern();
  });

  socket.on('table:say', (data, ack) => {
    const result = tavern.sayAtTable(socket.id, data);
    reply(ack, result.ok ? { ok: true } : result);
    if (result.ok) io.to(tableRoom(result.tableId)).emit('table:message', { tableId: result.tableId, message: result.message });
  });

  socket.on('game:start', (data, ack) => {
    const result = tavern.startGame(socket.id, data?.gameId);
    reply(ack, result);
    if (!result.ok) return;
    shareGame(result.tableId);
    shareTavern();
  });

  socket.on('game:act', (action, ack) => {
    const result = tavern.playGame(socket.id, action);
    reply(ack, result);
    if (!result.ok) return;
    shareGame(result.tableId);
    if (tavern.gameAt(result.tableId)?.over) shareTavern();
  });

  socket.on('disconnect', () => {
    const { wasHere, tableId } = tavern.leave(socket.id);
    if (tableId) shareGame(tableId);
    if (wasHere) shareTavern();
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
