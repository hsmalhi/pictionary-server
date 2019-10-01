// src/server.ts
import * as express from "express";
import * as socketio from "socket.io";
import * as path from "path";

const app = express();
app.set("port", process.env.PORT || 3001);

let http = require("http").Server(app);
// set up socket.io and bind it to our
// http server.
let io = require("socket.io")(http);

let rooms: any = {};

const generateCode = function(): string {
  let code: string = "";
  let codeGenerated: boolean = false;

  do {
    let characters: string = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let charactersLength = characters.length;
    for (let i = 0; i < 3; i++) {
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
const server = http.listen(3001, function() {
  console.log("listening on *:3001");
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
});
