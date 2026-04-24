# Rome Project - Local Setup Guide (No Docker)

## Quick Setup

This guide shows how to run Rome-Server and Ollama locally without Docker.

## Prerequisites

You need:
- **Node.js** (v16+) - https://nodejs.org/
- **Ollama** (local LLM) - https://ollama.ai/

## Step 1: Install Ollama

### Linux
```bash
curl https://ollama.ai/install.sh | sh
```

### Mac
Download from https://ollama.ai and install

### Windows
Download from https://ollama.ai and install

### Verify Installation
```bash
ollama --version
```

## Step 2: Pull the Llama2 Model

```bash
ollama pull llama2
```

This downloads ~4GB. First time only!

## Step 3: Start Ollama Server

```bash
ollama serve
```

This starts Ollama on `http://localhost:11434`

**Keep this terminal running!**

## Step 4: Install and Start Rome-Server

In a **new terminal**:

```bash
cd Rome-Server
npm install
npm start
```

Rome-Server will start on `http://localhost:3001`

## Step 5: Start Rome-Client

In a **third terminal**:

```bash
cd Rome-Client
npm install
npm run dev
```

Rome-Client will start on `http://localhost:5173`

## Step 6: Test the Chat

1. Open http://localhost:5173/school
2. Click "Languages"
3. Type "Hello" and send

**Expected Response Time:**
- First response: 5-15 seconds
- Subsequent responses: 3-10 seconds

## Terminal Layout

You should have 3 terminals open:

```
Terminal 1: Ollama
$ ollama serve
Listening on [::]:11434

Terminal 2: Rome-Server
$ npm start
Server running at http://localhost:3001

Terminal 3: Rome-Client
$ npm run dev
  ➜  Local:   http://localhost:5173/school
```

## Stopping Everything

- **Ctrl+C** in each terminal to stop services
- Ollama can keep running between sessions (just don't close the terminal)

## Troubleshooting

### "Cannot connect to Ollama"
- Make sure `ollama serve` is running in a terminal
- Check it's on http://localhost:11434

### "Ollama command not found"
- Restart your terminal after installing Ollama
- Or add to PATH manually

### "Port 3001 already in use"
- Kill the process: `lsof -i :3001` then `kill -9 <PID>`
- Or change PORT in `Rome-Server/server.js`

### "Out of memory"
- Response is taking too long? Ollama needs 4GB+ RAM free
- Close other apps and retry

### Response is very slow (>30 seconds)
- This is normal for CPU-only Ollama
- To speed up: Get a GPU (NVIDIA CUDA or AMD ROCm)

## Different Models

Want to try different models? Edit `Rome-Server/server.js` and change:

```javascript
const model = 'llama2'; // Change this
```

Then pull the model:
```bash
ollama pull mistral
# or
ollama pull neural-chat
# or
ollama pull orca-mini
```

Available models:
- `llama2` - Good balance (default)
- `mistral` - Faster, smaller
- `neural-chat` - Better at conversations
- `orca-mini` - Lightweight
- `dolphin-mixtral` - Better reasoning

Full list: https://ollama.ai/library

## Performance Tips

1. **First run**: Be patient during model download
2. **RAM**: Close other apps to free up memory
3. **CPU**: Ollama uses all cores - this is normal
4. **Persistence**: Keep `ollama serve` running between sessions

## Project Structure

```
Rome/
├── Rome-Client/
│   ├── src/
│   │   ├── pages/          # Page components
│   │   ├── components/     # ChatInterface component
│   │   ├── styles/         # CSS for chat
│   │   └── App.jsx
│   └── package.json
├── Rome-Server/
│   ├── server.js           # Express + Ollama integration
│   └── package.json
└── SETUP.md (this file)
```

## What's Happening

1. **Ollama**: Runs the LLM model on http://localhost:11434
2. **Rome-Server**: Node.js backend that receives chat messages
3. **Rome-Client**: React frontend that displays the chat UI
4. When you chat: Client → Server → Ollama → Response

## Next Steps

After getting it working:
- Add more subjects (Math, Science, etc.)
- Customize system prompts for different topics
- Implement conversation history
- Add streaming responses for faster UX

## Support

If something doesn't work:
1. Check all 3 services are running
2. Verify ports: 11434 (Ollama), 3001 (Server), 5173 (Client)
3. Check error messages in each terminal
4. Try restarting services in order: Ollama → Server → Client

---

**That's it! You're ready to learn with Rome!** 🏛️
