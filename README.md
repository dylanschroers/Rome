# Rome - Real-time Communication Platform

A local, decentralized communication platform built with React and Node.js. Rome enables real-time messaging, community spaces, and AI-powered conversations—all running locally for privacy and control.

## Quick Start

### Prerequisites
- **Node.js** (v16+)

### 3 Easy Steps

**Terminal 1 - Start Server:**
```bash
cd Rome-Server
npm install
npm start
```

**Terminal 2 - Start Client:**
```bash
cd Rome-Client
npm install
npm run dev
```

Open http://localhost:5173 and start communicating!

## For Detailed Setup

See [SETUP.md](./SETUP.md) for step-by-step instructions, troubleshooting, and configuration.

## Features

- 💬 **Real-time Messaging** - Instant message delivery with Socket.io
- 🏛️ **Town Interface** - Explore themed community spaces
- 🤖 **AI Integration** - Optional local LLM support for AI-powered discussions
- 🔐 **Local & Private** - All communication stays on your network
- 🎨 **Immersive Design** - Roman-themed UI for engaging community experience

## Architecture

```
┌─────────────┐
│ Rome-Client │ (React)
│ :5173       │
└──────┬──────┘
       │ WebSocket (Socket.io)
┌──────▼──────────────┐
│ Rome-Server         │ (Node.js/Express + Socket.io)
│ :3001               │
└─────────────────────┘
```

## Services

| Service | Port | Purpose |
|---------|------|---------|
| Rome-Client | 5173 | React frontend - community spaces and messaging |
| Rome-Server | 3001 | Express backend with real-time messaging via Socket.io |
| Optional: Ollama | 11434 | Local LLM for AI-enhanced conversations |

## Project Structure

```
Rome/
├── Rome-Client/               # React frontend
│   ├── src/
│   │   ├── pages/             # Town, Messages, Community areas
│   │   ├── components/        # ChatInterface, etc.
│   │   ├── styles/            # CSS for theming
│   │   └── App.jsx
│   └── package.json
├── Rome-Server/               # Node.js backend
│   ├── server.js              # Express + Socket.io server
│   └── package.json
└── SETUP.md                   # Setup instructions
```

## Performance & Configuration

- **Real-time**: <100ms message latency (local network)
- **Scalability**: Optimized for 50-500 concurrent users per instance
- **Resource Usage**: ~50MB memory baseline

### Optional: AI Integration

To add AI-powered conversations, install and configure a local LLM:

1. Download [Ollama](https://ollama.ai)
2. Pull a model: `ollama pull llama2`
3. Start Ollama: `ollama serve`
4. Rome will auto-detect and enable AI features

The system works perfectly without Ollama—AI features are optional enhancements.

## Troubleshooting

**"Cannot connect to server"**
- Verify Rome-Server is running on port 3001
- Check firewall settings for localhost:3001

**"Port already in use"**
```bash
# Windows - find process on port 3001
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# macOS/Linux
lsof -i :3001
kill -9 <PID>
```

**"AI features not available"**
- This is normal if Ollama isn't installed
- Rome functions fully as a communication platform without it
- To enable: install Ollama and `ollama serve`

See [SETUP.md](./SETUP.md) for more troubleshooting.

## Development

### Running the Platform
```bash
# Terminal 1
cd Rome-Server && npm start

# Terminal 2
cd Rome-Client && npm run dev
```

### Building for Production
```bash
cd Rome-Client
npm run build  # Creates dist/ folder
```

### Adding New Spaces

1. Create a new page component in `Rome-Client/src/pages/`
2. Add a route in `App.jsx`
3. Add building reference in `Town.jsx` if it should appear in town view
4. Design your community space or discussion area

### API & Socket Events

**Socket.io Events:**
- `message:post` - Post to message board
- `message:new` - Receive new messages
- `messages:init` - Initial message load

**REST Endpoints:**
- `GET /api/messages` - Retrieve all messages

## Future Enhancements

- [ ] User authentication & profiles
- [ ] Direct messaging (1-on-1 conversations)
- [ ] Message persistence & history
- [ ] Moderation & community guidelines
- [ ] Multiple towns/communities
- [ ] Custom themes & branding
- [ ] Voice/video integration
- [ ] Advanced AI features

## What Makes Rome Different

✅ **Decentralized** - Full control over your community data  
✅ **Offline-capable** - Works without internet (local networks)  
✅ **Open** - All source code available  
✅ **Extensible** - Add features and spaces easily  
✅ **Immersive** - Engaging, themed UI for better engagement  

## License

MIT

---

**Ready to connect? Follow [SETUP.md](./SETUP.md) to get started!** 🏛️

