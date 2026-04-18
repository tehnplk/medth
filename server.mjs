import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.DB_HOST || "localhost";
const port = parseInt(process.env.PORT || "3001", 10);
const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(handler);

  const io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  io.on("connection", (socket) => {
    // console.log("Client connected", socket.id);

    // When a booking is added, updated, or deleted
    socket.on("bookingUpdate", () => {
      // Broadcast to all clients (including sender if needed, but broadcast excludes sender)
      // Actually we might want all clients to refresh, including sender, but sender usually refreshes locally.
      // Let's broadcast to ALL OTHER clients.
      socket.broadcast.emit("refreshBookings");
    });

    socket.on("disconnect", () => {
      // console.log("Client disconnected", socket.id);
    });
  });

  httpServer
    .once("error", (err) => {
      if (err.code === "EADDRINUSE") {
        console.error(`Port ${port} is already in use`);
      } else {
        console.error(err);
      }
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://localhost:${port} with Socket.IO Enabled`);
    });
});
