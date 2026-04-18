import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handler = app.getRequestHandler();

app.prepare().then(() => {
  const PORT = parseInt(process.env.PORT || "3001", 10);
  const SOCKET_PORT = parseInt(process.env.SOCKET_PORT || "3002", 10);

  // Next.js Web App Server
  const httpServer = createServer(handler);
  httpServer.listen(PORT, () => {
    console.log(`> Web App ready on http://localhost:${PORT}`);
  });

  // Socket.IO Server
  const ioServer = createServer();
  const io = new Server(ioServer, {
    cors: {
      origin: true,
      methods: ["GET", "POST"],
      credentials: true
    },
  });
  global.io = io;

  io.on("connection", (socket) => {
    socket.on("bookingUpdate", () => {
      socket.broadcast.emit("refreshBookings");
    });
  });

  ioServer.listen(SOCKET_PORT, () => {
    console.log(`> Socket.IO ready on port ${SOCKET_PORT}`);
  });
});
