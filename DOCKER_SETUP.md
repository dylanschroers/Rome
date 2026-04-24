# Rome Project - Docker & Ollama Setup Guide

## Prerequisites

You need to have the following installed:
- **Docker Desktop** - https://www.docker.com/products/docker-desktop
- **Docker Compose** - Usually included with Docker Desktop

### Check Installation

```bash
docker --version
docker-compose --version
```

## Setup Instructions

### Step 1: Verify File Structure

Make sure you have these files in your Rome project:

```
Rome/
├── docker-compose.yml (new)
├── Rome-Client/
├── Rome-Server/
│   ├── Dockerfile (new)
│   ├── server.js (updated)
│   └── package.json
```

### Step 2: Start the Services

From the Rome project root directory, run:

```bash
docker-compose up
```

This will:
1. **Download and start Ollama** with llama2 model
   - First time: ~5-10 minutes (downloading the llama2 model ~4GB)
   - Subsequent times: ~30 seconds
2. **Build and start Rome-Server** on port 3001
3. Connect them together on an internal network

### Step 3: Verify Everything is Running

Check that both services started successfully. You should see logs like:

```
rome-ollama  | Listening on [::]:11434
rome-server  | Server running at http://localhost:3001
```

### Step 4: Test the Chat Interface

1. Start the Rome-Client (separate terminal):
   ```bash
   cd Rome-Client
   npm run dev
   ```

2. Navigate to: `http://localhost:5173/school`
3. Click on "Languages"
4. Type a message and send it

The first response might take 5-15 seconds (Ollama is generating). Subsequent messages should be faster.

## Commands

### Start Services
```bash
docker-compose up
```

### Stop Services
```bash
docker-compose down
```

### View Logs
```bash
docker-compose logs -f rome-server
docker-compose logs -f rome-ollama
```

### Rebuild After Changes
```bash
docker-compose up --build
```

### Remove All Data (Reset)
```bash
docker-compose down -v
```

## Troubleshooting

### "Cannot connect to Ollama"
- Make sure docker-compose is fully started (check logs)
- Wait 30-60 seconds for Ollama to fully initialize on first run

### "Port 3001 already in use"
```bash
docker-compose down
# Or change port in docker-compose.yml
```

### "Out of disk space"
The llama2 model is ~4GB. Ensure you have at least 10GB free space.

### View what's running
```bash
docker ps
```

### Connect to a running container
```bash
docker exec -it rome-server bash
docker exec -it rome-ollama bash
```

## Environment Variables

You can customize behavior by editing `docker-compose.yml`:

- `OLLAMA_HOST` - Ollama server address (default: http://ollama:11434)
- `NODE_ENV` - Node environment (default: development)

## Models Available

To use a different model, edit `server.js` and change the `model` variable:

- `llama2` - Default, good balance (7B parameters)
- `mistral` - Faster, smaller (7B)
- `neural-chat` - Optimized for conversations (7B)
- `orca-mini` - Lightweight (3B)
- `llama2-uncensored` - Less filtered responses

Change the model name in `server.js`:
```javascript
const model = 'mistral'; // Change this line
```

Then rebuild: `docker-compose up --build`

## Performance Tips

1. **First Run**: Llama2 needs to download (~4GB). Be patient!
2. **GPU Acceleration**: If you have NVIDIA GPU, uncomment in docker-compose.yml:
   ```yaml
   deploy:
     resources:
       reservations:
         devices:
           - driver: nvidia
             count: 1
             capabilities: [gpu]
   ```

3. **CPU Only**: If no GPU, responses take 5-15 seconds. This is normal for llama2.

## Next Steps

After successful setup, you can:
1. Add more subjects (Math, Science, etc.) following the Languages pattern
2. Customize system prompts in `server.js`
3. Add conversation history for better context
4. Implement streaming responses for faster perceived performance
