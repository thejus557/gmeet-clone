const express = require("express");
const { createServer } = require("node:http");
const { Server } = require("socket.io");
const cors = require("cors");

// Initialize Express app and create HTTP server
const app = express();
const server = createServer(app);

// Configure Socket.IO with CORS settings
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Enable CORS for Express
app.use(cors());

// Basic route
app.get("/", (req, res) => {
  res.send("<h1>Video Chat Server</h1>");
});

// Socket.IO connection handler
io.on("connection", (socket) => {
  console.log("A user connected");

  // Handle joining a meeting
  socket.on("join-meet", (data) => {
    const { meetCode, userName, localId } = data;
    console.log(`User ${userName} (${localId}) is joining meet ${meetCode}`);

    try {
      socket.join(meetCode.toString());
      console.log(`User ${userName} successfully joined meet ${meetCode}`);

      // Confirm to the user that they've joined successfully
      socket.emit("join-meet-success", data);

      // Notify other users in the room
      socket.to(meetCode.toString()).emit("user-joined", data);
    } catch (error) {
      console.error(`Error joining meet ${meetCode}:`, error);
      socket.emit("join-meet-error", { message: "Failed to join meet" });
    }
  });

  // Handle ending a meeting
  socket.on("end-meet", (data) => {
    const { meetCode, userName, localId } = data;
    console.log(`User ${userName} (${localId}) is ending meet ${meetCode}`);

    socket.leave(meetCode.toString());
    socket.emit("user-left-success", data);
    socket.to(meetCode.toString()).emit("user-left", data);
  });

  // Handle local mute/unmute events
  socket.on("toggle-audio", (data) => {
    const { meetCode, userName, localId, isMuted } = data;
    console.log(
      `User ${userName} (${localId}) ${
        isMuted ? "muted" : "unmuted"
      } their audio`
    );
    socket.to(meetCode.toString()).emit("user-audio-toggle", data);
  });

  // Handle local video on/off events
  socket.on("toggle-video", (data) => {
    const { meetCode, userName, localId, isVideoOn } = data;
    console.log(
      `User ${userName} (${localId}) turned their video ${
        isVideoOn ? "on" : "off"
      }`
    );
    socket.to(meetCode.toString()).emit("user-video-toggle", data);
  });

  // Handle muting other users
  socket.on("mute-user", (data) => {
    const { meetCode, targetUserId, muterName } = data;
    console.log(
      `User ${muterName} is muting user ${targetUserId} in meet ${meetCode}`
    );
    socket.to(meetCode.toString()).emit("mute-user-request", data);
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log("A user disconnected");
    // You might want to notify other users in the room that this user has left
    // This would require keeping track of which room the user was in
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
