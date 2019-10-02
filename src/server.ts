// src/server.ts
import * as express from "express";
import * as socketio from "socket.io";
import * as path from "path";
import { isNull } from "util";

const app = express();
app.set("port", process.env.PORT || 3001);

let http = require("http").Server(app);
// set up socket.io and bind it to our
// http server.
let io = require("socket.io")(http);

let rooms: any = {};
let rounds: number = 6;

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
  console.log("a user connected", socket.id);

  let players: any[] = [];
  let leftDrawer: number = null;
  let rightDrawer: number = null;

  socket.on("SETUP", () => {
    let message = {
      code: generateCode()
    };
    rooms[message.code] = [ { 0: { id: socket.id, name: "MAIN" } } ];
    socket.emit("ROOM_CREATED", message);
    socket.join(message.code);
  });

  socket.on("JOIN", (message: any) => {

    if(!rooms[message.code]) {
      const outMessage = {
        error: "This room does not exist"
      };
      socket.emit("ROOM_JOINED", outMessage);
    } else if (rooms[message.code].length >= 8) {
      const outMessage = {
        error: "This room has reached maximum capacity"
      };
      socket.emit("ROOM_JOINED", outMessage);
    }
    else {
      const playerId = rooms[message.code].length;
      const playerName = message.name;
      rooms[message.code].push({ [playerId]: { id: socket.id, name: playerName} });

      const outMessage = {
        playerId
      };
      socket.emit("ROOM_JOINED", outMessage);
      socket.join(message.code,function(){ 
        const roomMessage = {
          players: rooms[message.code]
        }    
         io.in(message.code).emit("PLAYER_UPDATE", roomMessage);
      });
    }
  });

  socket.on("START_GAME", (message: any) => {
    const timer = 5;
    const outMessage = {
      timer,
      socketid: socket.id
    }

    console.log(io.sockets.adapter.rooms[message.code].sockets)

    io.sockets.in(message.code).emit("STARTING_GAME", outMessage);

    players = rooms[message.code].splice(0, 1);

    setTimeout(function() {
      startRound(message.code);
    }, timer*1000)
  });

  const startRound = (code: string) => {
    if (leftDrawer === null ) {
      leftDrawer = players[0];
    }

    if (rightDrawer === null) {
      rightDrawer = players[1];
    }

    const timer = 45;
    const outMessage = {
      timer,
      leftDrawer: leftDrawer,
      rightDrawer: rightDrawer
    }

    io.in(code).emit("ROUND_START", outMessage);
  }
});
