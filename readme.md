# RELAY

A simple **Node.js + Express + TypeScript** server that allows broadcasting messages or pings to specific channels via HTTP, and listening for them via WebSockets.  
It also supports proxying remote files to avoid CORS issues.

It supports:

- **POST /broadcast** → broadcast messages to a channel
- **WS /listen** → subscribe to `"message"` type broadcasts
- **WS /ping** → subscribe to `"ping"` type broadcasts
- **GET /proxy-file?url=...** → fetch and return a remote file (with CORS headers)
- Logging with **daily log rotation** using Winston
- Automatic cleanup of stale WebSocket connections

---

## Getting Started

### 1. Install dependencies

```bash
yarn install
```

### 2. Run in development mode

```bash
yarn dev
```

### 3. Build for production

```bash
yarn build
```

### 4. Run production build

```bash
yarn start:fg
```

The server runs by default on **http://localhost:3000**

---

## API Usage

### Broadcast a message

```bash
curl -X POST http://localhost:3000/broadcast \
  -H "Content-Type: application/json" \
  -d '{"channelId": "chat-room-1", "message": "Hello World"}'
```

### Broadcast a ping

```bash
curl -X POST http://localhost:3000/broadcast \
  -H "Content-Type: application/json" \
  -d '{"channelId": "server-health", "type": "ping"}'
```

### Proxy a remote file

Fetch a remote file through the server to bypass CORS restrictions:

```bash
curl "http://localhost:3000/proxy-file?url=https://example.com/file.pdf" -o file.pdf
```

---

## WebSocket Usage

### Subscribe to messages

```js
const ws = new WebSocket("ws://localhost:3000/listen");

ws.onopen = () => {
  ws.send(JSON.stringify({ channelId: "chat-room-1" }));
};

ws.onmessage = (event) => {
  console.log("Received:", event.data);
};
```

### Subscribe to pings

```js
const ws = new WebSocket("ws://localhost:3000/ping");

ws.onopen = () => {
  ws.send(JSON.stringify({ channelId: "server-health" }));
};

ws.onmessage = (event) => {
  console.log("Ping:", event.data);
};
```

---

## Logging

Logs are written to the `logs/` directory:

- `app-YYYY-MM-DD.log` → rotated daily, compressed, and kept for 14 days  
- Console output for live monitoring  

---

## Cleanup

The server automatically removes stale connections every **10 seconds** to prevent memory leaks.

---

## Project Structure

```
relay/
├─ src/
│  ├─ utils/          # Utilities
│  │  ├─ consts.ts    # Constants
│  │  └─ logo.ts      # Display logo
│  ├─ index.ts        # Main server
│  └─ logger.ts       # Logging setup
├─ logs/              # Log files (auto-created)
├─ package.json
├─ tsconfig.json
├─ README.md
└─ .gitignore
```

---

## License

MIT
