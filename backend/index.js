const express = require("express");
const { createServer } = require("node:http");
const { Server } = require("socket.io");
const cors = require("cors");
const app = express();
const server = createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

app.use(cors());

app.get("/", (req, res) => {
  res.send("<h1>Hello world</h1>");
});

io.on("connection", (socket) => {
  console.log("a user connected");

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

  socket.on("disconnect", () => {
    console.log("user disconnected");
    // You might want to notify other users in the room that this user has left
  });
});

server.listen(3000, () => {
  console.log("server running at http://localhost:3000");
});
