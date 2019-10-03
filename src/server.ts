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
const server = http.listen(process.env.PORT || 3001, function() {
  console.log("listening on ", process.env.PORT || "3001");
});

// whenever a user connects on port 3000 via
// a websocket, log that a user has connected
io.on("connection", function(socket: any) {
  console.log("a user connected", socket.id);
  let players: any[] = [];
  let leftDrawer: number = null;
  let rightDrawer: number = null;

  socket.on("coordinates", function(message: any) {
    let roomName = `${message.room}`;
    io.emit("coordinates", message);
    // io.to(roomName).emit("coordinates", message);
  });
  socket.on("clear", function(message: any) {
    let roomName = `${message.room}`;
    // io.to(roomName).emit("clear", message);
    io.emit("clear", message);
  });
  socket.on("stop", function(message: any) {
    let roomName = `${message.room}`;
    io.emit("stop", message);
    // io.to(roomName).emit("stop", message);
  });
  socket.on("SETUP", () => {
    let message = {
      code: generateCode(),
      playerId: 0
    };
    rooms[message.code] = [ { 0: { id: socket.id, name: "MAIN", score: 0 } } ];
    socket.emit("ROOM_CREATED", message);
    socket.join(message.code);
  });

  socket.on("JOIN", (message: any) => {
    if (!rooms[message.code]) {
      const outMessage = {
        error: "This room does not exist"
      };
      socket.emit("ROOM_JOINED", outMessage);
    } else if (rooms[message.code].length >= 9) {
      const outMessage = {
        error: "This room has reached maximum capacity"
      };
      socket.emit("ROOM_JOINED", outMessage);
    } else {
      const playerId = rooms[message.code].length;
      const playerName = message.name;
      rooms[message.code].push({ [playerId]: { id: socket.id, name: playerName, score: 0 } });

      const outMessage = {
        playerId
      };
      socket.emit("ROOM_JOINED", outMessage);
      socket.join(message.code, function() {
        const roomMessage = {
          players: rooms[message.code]
        };
        io.in(message.code).emit("PLAYER_UPDATE", roomMessage);
      });
    }
  });

  socket.on("START_GAME", (message: any) => {
    const timer = 5;
    
    players = rooms[message.code].slice(1);

    if (leftDrawer === null ) {
      leftDrawer = Number(Object.keys(players[0])[0]);
    };

    if (rightDrawer === null) {
      rightDrawer = Number(Object.keys(players[1])[0]);
    };

    const outMessage = {
      timer,
      leftDrawer: leftDrawer,
      rightDrawer: rightDrawer
    }

    io.sockets.in(message.code).emit("STARTING_GAME", outMessage);

    setTimeout(function() {
      startRound(message.code);
    }, timer * 1000);
  });

  const startRound = (code: string) => {
    console.log(leftDrawer + "---" + rightDrawer);

    const timer = 5;
    const outMessage = {
      timer
    }

    io.in(code).emit("ROUND_START", outMessage);
    
    setTimeout(function() {
      if (leftDrawer === Number(Object.keys(players[players.length - 1])[0])) {
        endGame(code);
      } else {
        endRound(code);
      } 
    }, timer*1000)
  }

  const endRound = (code: string) => {
    const timer = 5;
    if (rightDrawer === Number(Object.keys(players[players.length - 1])[0])) {
      leftDrawer = rightDrawer;
      rightDrawer = Number(Object.keys(players[0])[0]);
    } else {
      leftDrawer = rightDrawer;
      rightDrawer = rightDrawer + 1;
    }
    const outMessage = {
      timer,
      leftDrawer,
      rightDrawer
    }

    io.in(code).emit("ROUND_OVER", outMessage);

    setTimeout(function () {
      startRound(code);
    }, timer*1000);
  }

  const endGame = (code: string) => {
    io.in(code).emit("GAME_OVER");
  }
});
