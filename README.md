# Rome - Educational Chat Platform

A local, AI-powered educational platform built with React and Node.js, featuring various subjects with local LLM integration through Ollama.

## Quick Start

### Prerequisites
- **Node.js** (v16+)
- **Ollama** - Download from https://ollama.ai

### 3 Easy Steps

**Terminal 1 - Start Ollama:**
```bash
ollama pull llama2  # One time only
ollama serve
```

**Terminal 2 - Start Server:**
```bash
cd Rome-Server
npm install
npm start
```

**Terminal 3 - Start Client:**
```bash
cd Rome-Client
npm install
npm run dev
```

Open http://localhost:5173/school and start learning!

## For Detailed Setup

See [SETUP.md](./SETUP.md) for step-by-step instructions, troubleshooting, and configuration.

## Features

- 🏛️ **School Interface** - Navigate through different subjects
- 💬 **AI Chat** - Talk to local LLM tutors for each subject
- 🌐 **Local LLM** - Ollama integration for offline AI
- ⚡ **Real-time Chat** - Instant responses with typing indicators
- 🎓 **Educational** - Purpose-built for learning

## Architecture

```
┌─────────────┐
│ Rome-Client │ (React)
│ :5173       │
└──────┬──────┘
       │ HTTP
┌──────▼──────────┐
│ Rome-Server     │ (Node.js/Express)
│ :3001           │
└──────┬──────────┘
       │ HTTP
┌──────▼──────────┐
│ Ollama          │ (LLM)
│ :11434          │
└─────────────────┘
```

## Services

| Service | Port | Purpose |
|---------|------|---------|
| Rome-Client | 5173 | React frontend |
| Rome-Server | 3001 | Express backend |
| Ollama | 11434 | Local LLM |

## Project Structure

```
Rome/
├── Rome-Client/          # React frontend
│   ├── src/
│   │   ├── pages/        # School, Town, etc.
│   │   ├── components/   # ChatInterface
│   │   ├── styles/       # CSS
│   │   └── App.jsx
│   └── package.json
├── Rome-Server/          # Node.js backend
│   ├── server.js         # Express + Ollama integration
│   └── package.json
└── SETUP.md              # Setup instructions
```

## Performance

- **Response Time**: 5-15 seconds per message (CPU only)
- **Model Size**: ~4GB (Llama2)
- **RAM Required**: 4GB+ recommended
- **GPU Support**: Faster with NVIDIA/AMD GPU

## Available Models

Change model in `Rome-Server/server.js`:

```javascript
const model = 'llama2'; // Change this
```

Then: `ollama pull <model>`

Popular options:
- `llama2` - Recommended (7B, balanced)
- `mistral` - Faster (7B)
- `neural-chat` - Better conversations (7B)
- `orca-mini` - Lightweight (3B)

Full list: https://ollama.ai/library

## Troubleshooting

**"Cannot connect to Ollama"**
- Make sure `ollama serve` is running
- Check http://localhost:11434 is accessible

**"Port already in use"**
```bash
lsof -i :3001     # Find process on port 3001
kill -9 <PID>     # Kill it
```

**"Responses are slow"**
- Normal for CPU - 5-15 seconds is expected
- Add GPU for 3x speedup (NVIDIA/AMD)

See [SETUP.md](./SETUP.md) for more troubleshooting.

## Development

### Running Servers
```bash
# Terminal 1
ollama serve

# Terminal 2
cd Rome-Server && npm start

# Terminal 3
cd Rome-Client && npm run dev
```

### Adding Subjects

1. Add to `School.jsx` subjects array
2. Create chat page (e.g., `MathChat.jsx`)
3. Add route to `App.jsx`
4. Update system prompt in `server.js`

### API

**POST /api/chat**
```json
{
  "subject": "Languages",
  "message": "What is Latin?",
  "history": []
}
```

Response:
```json
{
  "response": "Latin is an ancient language..."
}
```

## Future Enhancements

- [ ] Streaming responses for faster UX
- [ ] Conversation history persistence
- [ ] More subjects and tutors
- [ ] Custom system prompts per subject
- [ ] Progress tracking
- [ ] Multi-language support

## Requirements Met

✅ Local, no external AI service  
✅ Offline capable  
✅ Educational focus  
✅ Subject-specific tutors  
✅ Simple to setup  

## License

MIT

---

**Ready to learn? Follow [SETUP.md](./SETUP.md) to get started!** 🏛️

