# RELAY

A simple **Node.js + Express + TypeScript** server that allows broadcasting messages or pings to specific channels via HTTP, and listening for them via WebSockets.

It supports:

- **POST /broadcast** → broadcast messages to a channel
- **WS /listen** → subscribe to `"message"` type broadcasts
- **WS /ping** → subscribe to `"ping"` type broadcasts
- Logging with **daily log rotation** using Winston
- Automatic cleanup of stale WebSocket connections

---

## 🚀 Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Run in development mode

```bash
npm run dev
```

### 3. Build for production

```bash
npm run build
```

### 4. Run production build

```bash
npm start
```

The server runs by default on **http://localhost:3000**

---

## 📡 API Usage

### Broadcast a message

```bash
curl -X POST http://localhost:3000/broadcast   -H "Content-Type: application/json"   -d '{"channelId": "chat-room-1", "message": "Hello World"}'
```

### Broadcast a ping

```bash
curl -X POST http://localhost:3000/broadcast   -H "Content-Type: application/json"   -d '{"channelId": "server-health", "messageType": "ping"}'
```

---

## 🔗 WebSocket Usage

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

## 📝 Logging

Logs are written to the `logs/` directory:

- `app-YYYY-MM-DD.log` → rotated daily, compressed, and kept for 14 days  
- Console output for live monitoring  

---

## 🧹 Cleanup

The server automatically removes stale connections every **10 seconds** to prevent memory leaks.

---

## 📂 Project Structure

```
broadcast-server/
├─ src/
│  ├─ index.ts        # Main server
│  ├─ logger.ts       # Logging setup
├─ logs/              # Log files (auto-created)
├─ package.json
├─ tsconfig.json
├─ README.md
├─ .gitignore
```

---

## ⚖️ License

MIT
