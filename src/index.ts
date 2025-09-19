import express, { Request, Response } from "express";
import { WebSocketServer, WebSocket } from "ws";
import http from "http";
import logger from "./logger";
import logo from "./utils/logo";
import chalk from "chalk";
import { APP_VERSION } from "./utils/consts";
import { nanoid } from "./utils/nanoid";
import fetch from "node-fetch";
import { pipeline } from "stream";
import { promisify } from "util";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(cors());

const server = http.createServer(app);

type MessageType = "message" | "ping";
type ClientId = string;

interface BroadcastRequest {
  channelId: string | number;
  type?: MessageType;
  message?: any;
}

interface Listener {
  ws: WebSocket;
  channelId: string | number;
  type: MessageType;
  uuid: string;
  timestamp: number;
}

const listeners: Map<ClientId, Listener> = new Map();

const getClientId = (ws: WebSocket) => (ws as any)._clientId as ClientId;

// Periodic cleanup of stale connections
setInterval(() => {
  for (const [id, listener] of listeners.entries()) {
    if (listener.ws.readyState !== WebSocket.OPEN) {
      listeners.delete(id);
      logger.info(
        `Removed stale connection ${id} (channel=${listener.channelId}, type=${listener.type})`
      );
    }
  }
}, 10000);

// -------------------- Broadcast Route --------------------
app.post("/broadcast", (req: Request, res: Response) => {
  const { channelId, type = "message", message } = req.body as BroadcastRequest;

  if (!channelId) {
    logger.warn("Broadcast rejected: missing channelId");
    return res.status(400).json({ error: "channelId is required" });
  }

  if (type === "message" && message === undefined) {
    logger.warn("Broadcast rejected: message required for 'message' type");
    return res
      .status(400)
      .json({ error: "message is required when messageType is 'message'" });
  }

  let sent = 0;
  for (const [, listener] of listeners) {
    if (listener.channelId == channelId && listener.type === type) {
      if (listener.ws.readyState === WebSocket.OPEN) {
        listener.ws.send(
          JSON.stringify({
            channelId,
            type,
            message,
            uuid: nanoid(),
            timestamp: Math.floor(Date.now() / 1000),
          })
        );
        sent++;
      }
    }
  }

  logger.info(
    `Broadcasted to channel=${channelId}, type=${type}, recipients=${sent}`
  );
  res.json({ status: "ok", recipients: sent });
});

// -------------------- WebSocket: /listen --------------------
const listenWSS = new WebSocketServer({ noServer: true });

listenWSS.on("connection", (ws: WebSocket) => {
  ws.on("message", (msg: Buffer) => {
    try {
      const { channelId } = JSON.parse(msg.toString());
      if (!channelId) {
        ws.send(
          JSON.stringify({
            error: "channelId required",
            uuid: nanoid(),
            timestamp: Math.floor(Date.now() / 1000),
          })
        );
        return;
      }

      const clientId = `${channelId}-message-${Date.now()}-${Math.random()}`;
      (ws as any)._clientId = clientId;

      listeners.set(clientId, {
        ws,
        channelId,
        type: "message",
        uuid: nanoid(),
        timestamp: Math.floor(Date.now() / 1000),
      });
      ws.send(
        JSON.stringify({
          status: "subscribed",
          channelId,
          type: "message",
          uuid: nanoid(),
          timestamp: Math.floor(Date.now() / 1000),
        })
      );

      logger.info(
        `Client subscribed to channel=${channelId}, type=message, clientId=${clientId}`
      );
    } catch (err) {
      logger.error(`Invalid subscription payload: ${err}`);
      ws.send(
        JSON.stringify({
          error: "Invalid subscription payload",
          uuid: nanoid(),
          timestamp: Math.floor(Date.now() / 1000),
        })
      );
    }
  });

  ws.on("close", () => {
    const clientId = getClientId(ws);
    if (clientId && listeners.has(clientId)) {
      listeners.delete(clientId);
      logger.info(`Client disconnected: ${clientId}`);
    }
  });
});

// -------------------- WebSocket: /ping --------------------
const pingWSS = new WebSocketServer({ noServer: true });

pingWSS.on("connection", (ws: WebSocket) => {
  ws.on("message", (msg: Buffer) => {
    try {
      const { channelId } = JSON.parse(msg.toString());
      if (!channelId) {
        ws.send(
          JSON.stringify({
            error: "channelId required",
            uuid: nanoid(),
            timestamp: Math.floor(Date.now() / 1000),
          })
        );
        return;
      }

      const clientId = `${channelId}-ping-${Date.now()}-${Math.random()}`;
      (ws as any)._clientId = clientId;

      listeners.set(clientId, {
        ws,
        channelId,
        type: "ping",
        uuid: nanoid(),
        timestamp: Math.floor(Date.now() / 1000),
      });
      ws.send(
        JSON.stringify({
          status: "subscribed",
          channelId,
          type: "ping",
          uuid: nanoid(),
          timestamp: Math.floor(Date.now() / 1000),
        })
      );

      logger.info(
        `Client subscribed to channel=${channelId}, type=ping, clientId=${clientId}`
      );
    } catch (err) {
      logger.error(`Invalid subscription payload: ${err}`);
      ws.send(
        JSON.stringify({
          error: "Invalid subscription payload",
          uuid: nanoid(),
          timestamp: Math.floor(Date.now() / 1000),
        })
      );
    }
  });

  ws.on("close", () => {
    const clientId = getClientId(ws);
    if (clientId && listeners.has(clientId)) {
      listeners.delete(clientId);
      logger.info(`Client disconnected: ${clientId}`);
    }
  });
});

// -------------------- Upgrade Handling --------------------
server.on("upgrade", (request, socket, head) => {
  if (request.url === "/listen") {
    listenWSS.handleUpgrade(request, socket, head, (ws) => {
      listenWSS.emit("connection", ws, request);
    });
  } else if (request.url === "/ping") {
    pingWSS.handleUpgrade(request, socket, head, (ws) => {
      pingWSS.emit("connection", ws, request);
    });
  } else {
    socket.destroy();
  }
});

// -------------------- Start Server --------------------
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  logo();
  if (process.env.NODE_ENV === "development" || !!process.env.TS_NODE_DEV) {
    logger.warn(
      "Running in " +
        chalk.yellow("DEVELOPMENT") +
        " mode! Please, do not use this mode for production purposes!"
    );
  } else {
    logger.info("Running in " + chalk.greenBright("PRODUCTION") + " mode");
  }
  logger.info("Running version " + chalk.cyan(APP_VERSION));
  logger.info(`Server running on port ${chalk.magenta(PORT)}`);
});

// -------------------- Proxy File Route --------------------
const streamPipeline = promisify(pipeline);
app.get("/proxy-file", async (req: Request, res: Response) => {
  const fileUrl = req.query.url as string;

  // ✅ Always allow CORS for this route
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204); // Handle preflight
  }

  if (!fileUrl) {
    return res.status(400).json({ error: "Missing 'url' query parameter" });
  }

  try {
    const response = await fetch(fileUrl);

    if (!response.ok) {
      return res
        .status(response.status)
        .json({ error: `Failed to fetch file: ${response.statusText}` });
    }

    // Mirror content headers
    const contentType =
      response.headers.get("content-type") || "application/octet-stream";
    res.setHeader("Content-Type", contentType);

    const disposition = response.headers.get("content-disposition");
    if (disposition) {
      res.setHeader("Content-Disposition", disposition);
    }

    // ✅ Stream file without loading it into memory
    await streamPipeline(response.body as any, res);
  } catch (err: any) {
    logger.error(`Proxy error: ${err.message}`);
    res.status(500).json({ error: "Error fetching remote file" });
  }
});
