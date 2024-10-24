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

const meetings = new Map();

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
    const { meetCode, userName, peerId, oldPeerId } = data;

    console.log(`User ${userName} (${peerId}) is joining meet ${meetCode}`);

    try {
      let meetingArr = meetings.get(meetCode);

      if (oldPeerId && meetingArr?.length) {
        meetingArr = meetingArr?.filter((x) => x.peerId !== oldPeerId);
      }
      if (meetingArr?.length) {
        meetings.set(meetCode, [...meetingArr, data]);
      } else {
        meetings.set(meetCode, [data]);
      }

      socket.join(meetCode.toString());
      console.log(`User ${userName} successfully joined meet ${meetCode}`);

      // Confirm to the user that they've joined successfully
      socket.emit("join-meet-success", data);
      socket.emit("participant-update", meetings.get(meetCode));

      // Notify other users in the room
      socket.to(meetCode.toString()).emit("user-joined", data);
      socket.to(meetCode).emit("participant-update", meetings.get(meetCode));
      console.log("e", JSON.stringify(meetings.get("123-456-789")));
    } catch (error) {
      console.error(`Error joining meet ${meetCode}:`, error);
      socket.emit("join-meet-error", { message: "Failed to join meet" });
    }
  });

  // Handle ending a meeting
  socket.on("end-meet", (data) => {
    console.log("called");
    const { meetCode, userName, peerId } = data;

    console.log(`User ${userName} (${peerId}) is ending meet ${meetCode}`);

    socket.leave(meetCode.toString());
    socket.emit("user-left-success", data);
    socket.to(meetCode.toString()).emit("user-left", data);

    const meetingArr = meetings.get(meetCode);

    if (meetingArr?.length) {
      const filteredMeetingArr = meetingArr.filter((e) => e.peerId !== peerId);
      meetings.set(meetCode, [...filteredMeetingArr]);
      socket.emit("participant-update", meetings.get(meetCode));
      socket.to(meetCode).emit("participant-update", meetings.get(meetCode));
    }
    console.log("e", JSON.stringify(meetings.get("123-456-789")));
  });

  // Handle local mute/unmute events
  socket.on("toggle-audio", (data) => {
    const { meetCode, userName, peerId, isMuted } = data;

    const meetingArr = meetings.get(meetCode);

    if (meetingArr?.length) {
      const findIndex = meetingArr.findIndex((x) => x.peerId === peerId);
      meetingArr[findIndex] = {
        ...meetingArr[findIndex],
        isMuted: false,
      };
      meetingArr[findIndex].isMuted = isMuted;

      meetings.set(meetCode, [...meetingArr]);
    }

    socket.to(meetCode.toString()).emit("user-audio-toggle", data);
  });

  // Handle local video on/off events
  socket.on("toggle-video", (data) => {
    const { meetCode, userName, peerId, isVideoOn } = data;
    const meetingArr = meetings.get(meetCode);

    if (meetingArr?.length) {
      const findIndex = meetingArr.findIndex((x) => x.peerId === peerId);

      meetingArr[findIndex] = {
        ...meetingArr[findIndex],
        isVideoOn: false,
      };

      meetingArr[findIndex].isVideoOn = isVideoOn;

      meetings.set(meetCode, [...meetingArr]);
    }
    socket.to(meetCode.toString()).emit("user-video-toggle", data);
  });

  // Handle muting other users
  socket.on("mute-user", (data) => {
    const { meetCode, targetUserId, muterName } = data;

    const meetingArr = meetings.get(meetCode);

    if (meetingArr?.length) {
      const findIndex = meetingArr.findIndex((x) => x.peerId === targetUserId);

      meetingArr[findIndex].isMuted = isMuted;

      meetings.set(meetCode, [...meetingArr]);
    }

    socket.to(meetCode.toString()).emit("mute-user-request", data);
  });

  // Handle disconnection
  socket.on("disconnect", (e) => {
    console.log("A user disconnected", e);
    // You might want to notify other users in the room that this user has left
    // This would require keeping track of which room the user was in
  });
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
