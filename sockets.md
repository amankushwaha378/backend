# Socket.IO and MQTT --- Revision Notes

## Run the interactive Socket.IO demo

This backend includes a browser demo at `http://localhost:5000/socket-demo`.
Start the backend with `npm run dev`, open that URL in two tabs, connect both
with different display names, join the same room, and send a message. The UI
shows connection status and socket ID, while the server validates the demo
name during the handshake and validates room membership before broadcasting.
The display name is only for learning and is not application authentication.

The server and browser use named events: `room:join`, `room:leave`, and
`room:message` from the client, plus `room:notice` and `room:message` from the
server. Socket.IO acknowledgements demonstrate request-response feedback on
top of its event model.

A practical guide to understanding real-time communication, Socket.IO
events and rooms, MQTT publish-subscribe messaging, and the differences
between them.

## Table of Contents

- [1. WebSocket vs Socket.IO](#1-websocket-vs-socketio)
- [2. Socket.IO Setup](#2-socketio-setup)
- [3. Events: `emit` and `on`](#3-events-emit-and-on)
- [4. Socket.IO Rooms](#4-socketio-rooms)
- [5. Using Socket.IO in React](#5-using-socketio-in-react)
- [6. MQTT Basics](#6-mqtt-basics)
- [7. MQTT Topics and Wildcards](#7-mqtt-topics-and-wildcards)

---

## 1. WebSocket vs Socket.IO

### WebSocket

WebSocket is a communication protocol that enables persistent, two-way
communication between a client and server over one connection. Both
sides can send messages without repeatedly making separate HTTP
requests.

Common use cases: - Live chat - Live notifications - Real-time
dashboards - Multiplayer games - Collaborative applications

### Socket.IO

Socket.IO is a real-time communication library that provides event-based
messaging, reconnection support, rooms, and transport fallbacks.

**Important:** Socket.IO is not the same as the raw WebSocket protocol.
A standard WebSocket client cannot automatically communicate with a
Socket.IO server because Socket.IO uses its own protocol on top of its
transport.

### Connection handshake

Socket.IO may start with HTTP long-polling and then upgrade to
WebSocket. It can also be configured to use WebSocket only. This is not
identical to a raw WebSocket handshake.

**Remember:** WebSocket is a protocol; Socket.IO is a library.

---

## 2. Socket.IO Setup

Install the packages:

```bash
npm install socket.io socket.io-client
```

### Server

```js
const { Server } = require("socket.io");

const io = new Server(3001, {
  cors: {
    origin: "http://localhost:5173",
  },
});

io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});
```

### Client

```js
import { io } from "socket.io-client";

const socket = io("http://localhost:3001");
```

- The server listens for incoming connections.
- The client connects to the server URL.
- `socket.id` identifies that particular live socket connection.

**Important:** `socket.id` is not a permanent user ID. It can change
after reconnecting. Use your application's authenticated user ID when
you need a durable identity.

---

## 3. Events: `emit` and `on`

Socket.IO communicates through named events.

- `emit(eventName, data)`: send an event.
- `on(eventName, callback)`: listen for an event.
- `io.emit(...)`: broadcast to all connected sockets.
- `socket.broadcast.emit(...)`: broadcast to everyone except the
  sending socket.

### Example: send and receive a message

Server:

```js
io.on("connection", (socket) => {
  socket.on("send-message", (message) => {
    io.emit("receive-message", message);
  });
});
```

Client:

```js
socket.emit("send-message", "Hello everyone!");

socket.on("receive-message", (message) => {
  console.log("Message received:", message);
});
```

The event names must match on both sides. In a real application,
validate incoming data and authorize actions on the server instead of
trusting whatever the client sends.

### React cleanup

When registering listeners inside a React effect, remove the exact
listener during cleanup. Otherwise, repeated renders or effect
executions can accidentally register duplicate listeners.

```jsx
useEffect(() => {
  function handleMessage(message) {
    console.log(message);
  }

  socket.on("receive-message", handleMessage);

  return () => {
    socket.off("receive-message", handleMessage);
  };
}, []);
```

Use a shared socket instance appropriately for your app, and ensure the
effect's dependencies match how that socket is managed.

---

## 4. Socket.IO Rooms

A **room** is a server-managed group of connected sockets. Rooms let the
server send messages to a selected group rather than every connected
client.

Common use cases: - Chat rooms - Team channels - Project-specific
notifications - Live game sessions

```js
io.on("connection", (socket) => {
  socket.on("join-room", (roomName) => {
    socket.join(roomName);
  });

  socket.on("leave-room", (roomName) => {
    socket.leave(roomName);
  });

  socket.on("room-message", ({ roomName, message }) => {
    io.to(roomName).emit("room-message", message);
  });
});
```

### Important room methods

---

  Method                                Meaning

---

  `socket.join(room)`                   Add this socket to a room

  `socket.leave(room)`                  Remove this socket from a room

  `io.to(room).emit(event, data)`       Send to sockets in the room,
                                        including the sender if they belong
                                        to it

`socket.to(room).emit(event, data)`   Send to room members except the
                                        sending socket
------------------------------------------------------

**Security:** Do not allow clients to join private rooms without
checking their identity and permissions on the server. A client-provided
room name is not proof that the user is allowed to access that room.

---

## 5. Using Socket.IO in React

A simple pattern is to register a listener in `useEffect`, update state
when a message arrives, and remove the listener when the component no
longer needs it.

```jsx
import { useEffect, useState } from "react";
import { io } from "socket.io-client";

const socket = io("http://localhost:3001");

function ChatMessages() {
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    function handleMessage(message) {
      setMessages((current) => [...current, message]);
    }

    socket.on("receive-message", handleMessage);

    return () => {
      socket.off("receive-message", handleMessage);
    };
  }, []);

  return (
    <ul>
      {messages.map((message, index) => (
        <li key={index}>{message}</li>
      ))}
    </ul>
  );
}
```

This is a minimal illustration. In production, consider stable message
IDs instead of array indexes, shared socket lifecycle management,
authentication, validation, error states, and reconnection behavior.

**Remember:** Register listeners once for the intended lifecycle, clean
them up, and never assume a socket connection alone authenticates the
user.

---

## 6. MQTT Basics

MQTT (Message Queuing Telemetry Transport) is a lightweight messaging
protocol commonly used in IoT systems, sensors, telemetry, and networks
where bandwidth or device resources are limited.

MQTT uses a **publish-subscribe** model.

### How it works

1. A **publisher** publishes a message to a topic.
2. An MQTT **broker** receives the message.
3. The broker forwards it to subscribers whose topic subscriptions
   match.

Example: - A temperature sensor publishes `25` to
`home/living-room/temperature`. - A monitoring app subscribes to that
topic. - The broker forwards matching messages to the app.

### Node.js client example

Install the client library:

```bash
npm install mqtt
```

Example:

```js
const mqtt = require("mqtt");

const client = mqtt.connect("mqtt://localhost:1883");

client.on("connect", () => {
  console.log("Connected to MQTT broker");

  client.subscribe("home/temperature", (error) => {
    if (error) {
      console.error("Subscription failed:", error);
      return;
    }

    client.publish("home/temperature", "25");
  });
});

client.on("message", (topic, message) => {
  console.log("Topic:", topic);
  console.log("Message:", message.toString());
});
```

This example assumes an MQTT broker is already running at
`localhost:1883`.

**Important:** The `mqtt` npm package is a client library, not a broker.
You need a broker such as Mosquitto or another MQTT server to accept
connections and route messages.

---
