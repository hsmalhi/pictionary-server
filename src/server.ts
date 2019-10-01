// src/server.ts
import * as express from "express";
import * as socketio from "socket.io";
import * as path from "path";

const app = express();
app.set("port", process.env.PORT || 3001);

var http = require("http").Server(app);
// set up socket.io and bind it to our
// http server.
let io = require("socket.io")(http);

// simple '/' endpoint sending a Hello World
// response
app.get("/", (req: any, res: any) => {
  res.send("hello world");
});

// start our simple server up on localhost:3000
const server = http.listen(3001, function() {
  console.log("listening on *:3001");
});

// app.get("/", (req: any, res: any) => {
//   res.sendFile(path.resolve("./client/index.html"));
// });

// whenever a user connects on port 3000 via
// a websocket, log that a user has connected
io.on("connection", function(socket: any) {
  console.log("a user connected");
});