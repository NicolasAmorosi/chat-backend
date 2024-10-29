const express = require("express");
const app = express();
const cors = require("cors");
const http = require("http").Server(app);
const socketIO = require("socket.io")(http, {
  cors: {
    origin: "*",
  },
});

const PORT = 5000;

app.use(cors());
let users = [];

socketIO.on("connection", (socket) => {
  console.log(`user ${socket.handshake.query.username} just connected!`);

  socket.on("message", (data) => {
    socketIO.emit("messageResponse", data);
  });

  socket.on("typing", (data) => socket.broadcast.emit("typingResponse", data));

  socket.on("newUser", (data) => {
    users.push(data);
    socketIO.emit("newUserResponse", users);
  });

  socket.on("disconnect", () => {
    console.log("A user disconnected");
    users = users.filter((user) => user.socketID !== socket.id);
    socketIO.emit("newUserResponse", users);
    socket.disconnect();
  });
});

app.get("/api", (res) => {
  res.json({ message: "Hello" });
});

http.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
