# Rome Server

Express.js + Socket.io server for the Rome encrypted messaging application.

## Setup

```bash
npm install
npm run dev
```

Server will run on `http://localhost:3001`

## API Endpoints

### POST /api/auth/register
Register a new user
```json
{
  "userId": "user123",
  "username": "John"
}
```

### GET /api/users
Get list of all users and their online status

### GET /api/messages/:userId
Get all messages for a user (sent and received)

## WebSocket Events

### Client → Server
- `user:join` - Connect with userId
- `message:send` - Send message to another user
  ```json
  {
    "to": "recipient-id",
    "content": "encrypted-message-content"
  }
  ```

### Server → Client
- `users:list` - List of all users (broadcasted when user joins/leaves)
- `message:receive` - New message received
- `message:sent` - Confirmation that message was sent

## Storage

Currently uses in-memory storage. For production, integrate:
- PostgreSQL/MongoDB for persistent storage
- Redis for real-time sessions
