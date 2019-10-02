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

let rooms: any = {};

const generateCode = function(): string {
  var code: string = "";
  var codeGenerated: boolean = false;

  do {
    var characters: string = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    var charactersLength = characters.length;
    for (var i = 0; i < 3; i++) {
      code += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    if (!rooms[code]) {
      codeGenerated = true;
    }
  } while (!codeGenerated);

  return code;
};

// simple '/' endpoint sending a Hello World
// response
app.get("/", (req: any, res: any) => {
  res.send(rooms);
});

// start our simple server up on localhost:3000
const server = http.listen(process.env.PORT || 3001, function() {
  console.log("listening on " , process.env.PORT || "3001" );
});

// whenever a user connects on port 3000 via
// a websocket, log that a user has connected
io.on("connection", function(socket: any) {
  console.log("a user connected");

  socket.on("SETUP", () => {
    let message = {
      code: generateCode()
    };
    rooms[message.code] = socket.id;
    socket.emit("ROOM_CREATED", message);
  });

  socket.on("coordinates", function(message: any) {
    let roomName = `${message.room}0`;
    io.to(roomName).emit(`coordinates${message.side}`, message);
  });
  socket.on("clear", function(message: any) {
    let roomName = `${message.room}0`;
    io.to(roomName).emit(`clear${message.side}`, message);
  });
  socket.on("stop", function(message: any) {
    let roomName = `${message.room}0`;
    io.to(roomName).emit(`stop${message.side}`, message);
  });
});
