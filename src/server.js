import express from "express";
import dotenv from "dotenv";
import session from "express-session";
import pgSession from "connect-pg-simple";
import pinoHttp from "pino-http";
import cors from "cors";
import { createServer } from "node:http";
import { Server } from "socket.io";

import logger from "./config/logger.js";
import passport from "./config/passport.js";
import pool from "./config/db.js";

import userRoutes from "./routes/userRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import postRoutes from "./routes/postRoutes.js";
import commentRoutes from "./routes/commentRoutes.js";
import likeRoutes from "./routes/likeRoutes.js";
import mqttRoutes from "./routes/mqttRoutes.js";

import customRateLimiter from "./middleware/customRateLimiter.js";
import expressRateLimiter from "./middleware/expressRateLimiter.js";
import startCronJobs from "./jobs/cronJobs.js";
import optimizationRoutes from "./routes/optimizationRoutes.js";
import errorHandler from "./middleware/errorHandler.js";
import { NotFoundError } from "./utils/AppError.js";

import swaggerUi from "swagger-ui-express";
import swaggerSpec from "./config/swagger.js";
import { defaults } from "pg";

import postRoutesV2 from "./routes/postRoutesV2.js";
import redisClient from "./config/redis.js";
import ipRateLimiter from "./middleware/ipRateLimiter.js";

import "./services/mqttSubscriber.js";

dotenv.config({ quiet: true });

const app = express();

const PgSession = pgSession(session);

const sessionMiddleware = session({
  store: new PgSession({
    pool,
    tableName: "user_sessions",
    createTableIfMissing: true,
  }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false, // Local HTTP development only
    sameSite: "lax",
    maxAge: 1000 * 60 * 60 * 24,
  },
});

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    credentials: true,
  },
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000,
    skipMiddlewares: false,
  },
});

io.engine.use(sessionMiddleware);

io.use((socket, next) => {
  const user = socket.request.session?.passport?.user;

  if (!user) {
    return next(new Error("Unauthorized: Please log in first"));
  }

  next();
});

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id);
  console.log("Connection recovered:", socket.recovered);

  socket.on("disconnect", (reason) => {
    console.log("Socket disconnected:", socket.id, reason);
  });

  socket.on("chat-message", (message, acknowledge) => {
    console.log("Received message:", message);

    io.emit("chat-message", message);

    if (typeof acknowledge === "function") {
      acknowledge({
        success: true,
        message: "Message processed by server",
      });
    }
  });

  // Join a chat room
  socket.on("join-room", (roomName, acknowledge) => {
    const room = roomName?.trim();

    if (!room || room.length > 50) {
      return acknowledge?.({
        success: false,
        message: "Invalid room name",
      });
    }

    socket.join(room);

    console.log(`${socket.id} joined room: ${room}`);

    acknowledge?.({
      success: true,
      message: `Joined room: ${room}`,
    });
  });

  socket.on("room-message", (data, acknowledge) => {
    const room = data?.room?.trim();
    const message = data?.message?.trim();

    if (!room || !message || message.length > 2000) {
      return acknowledge?.({
        success: false,
        message: "Invalid room or message",
      });
    }

    if (!socket.rooms.has(room)) {
      return acknowledge?.({
        success: false,
        message: "Join the room before sending messages",
      });
    }

    io.to(room).emit("room-message", {
      room,
      message,
      senderId: socket.id,
    });

    console.log("Emitting notification for:", socket.id);

    socket.to(room).emit("new-notification", {
      message: `New message from ${socket.id}`,
      createdAt: new Date().toISOString(),
    });

    acknowledge?.({ success: true });
  });

  socket.on("private-message", (data, acknowledge) => {
    const { targetSocketId, message } = data ?? {};

    if (
      typeof targetSocketId !== "string" ||
      !targetSocketId ||
      typeof message !== "string" ||
      !message.trim()
    ) {
      return acknowledge?.({
        success: false,
        message: "Invalid recipient or message",
      });
    }

    if (!io.sockets.sockets.has(targetSocketId)) {
      return acknowledge?.({
        success: false,
        message: "Recipient is not connected",
      });
    }

    io.to(targetSocketId).emit("private-message", {
      senderSocketId: socket.id,
      message: message.trim(),
    });

    acknowledge?.({ success: true });
  });
});

app.use(express.json());

app.use(
  pinoHttp({
    quietReqLogger: true,
    logger,

    level: process.env.NODE_ENV === "test" ? "silent" : "info",

    // Log only useful request/response fields.
    serializers: {
      req(req) {
        return {
          method: req.method,
          url: req.url,
        };
      },

      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },

    customLogLevel(req, res, err) {
      if (err || res.statusCode >= 500) return "error";
      if (res.statusCode >= 400) return "warn";
      return "info";
    },

    customSuccessMessage(req, res) {
      return `${req.method} ${req.url} completed`;
    },

    customErrorMessage(req, res, err) {
      return `${req.method} ${req.url} failed`;
    },
  }),
);

app.use(sessionMiddleware);

app.use(passport.initialize());
app.use(passport.session());

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);

app.use(express.json());
app.use(ipRateLimiter);

app.get(
  "/api/test-rate-limit",
  customRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 5,
  }),
  (req, res) => {
    res.status(200).json({
      success: true,
      message: "Request allowed",
    });
  },
);

app.get("/api/test-library-rate-limit", expressRateLimiter, (req, res) => {
  res.status(200).json({
    success: true,
    message: "Request allowed by express-rate-limit",
  });
});

app.get("/", (req, res) => {
  res.json({
    message: "Server is running",
  });
});

app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/v1/posts", postRoutes);
app.use("/api/v2/posts", postRoutesV2);
app.use("/api/mqtt", mqttRoutes);

app.use("/api/comments", commentRoutes);
app.use("/api/likes", likeRoutes);
app.use("/api/optimization", optimizationRoutes);

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use((req, res, next) => {
  next(new NotFoundError(`Route ${req.method} ${req.originalUrl} not found`));
});

app.use(errorHandler);

await redisClient.connect();
console.log("Redis connected successfully");

const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV !== "test") {
  httpServer.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    startCronJobs();
  });
}
export default app;
