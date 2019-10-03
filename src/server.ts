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

let words: string[] = [
  "star wars",
  "battle ship",
  "swimming pool",
  "bus stop",
  "fire fly",
  "tooth paste",
  "egg rolls",
  "full moon",
  "black board",
  "washing machine",
  "sun rise",
  "hair style",
  "news paper",
  "door handle",
  "air plane",
  "scare crow",
  "post office",
  "under world",
  "bed room",
  "christmas tree"
]

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

const generateRandomWords = function(n: number): string[] {
  let random: string[] = [];
  
  for (let i = 0; i < n; i++) {
    let word = words[Math.round(Math.random()*100)%20];

    while (random.includes(word)) {
      word = words[Math.round(Math.random()*100)%20];
    }

    random.push(word);
  }

  return random;
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

    rooms[message.code] = { 
      players: [{ 0: { id: socket.id, name: "MAIN", score: 0 } }],
      words: [],
      word: null 
    };
    
    socket.emit("ROOM_CREATED", message);
    socket.join(message.code);
  });

  socket.on("JOIN", (message: any) => {
    if (!rooms[message.code]) {
      const outMessage = {
        error: "This room does not exist"
      };
      socket.emit("ROOM_JOINED", outMessage);
    } else if (rooms[message.code].players.length >= 9) {
      const outMessage = {
        error: "This room has reached maximum capacity"
      };
      socket.emit("ROOM_JOINED", outMessage);
    } else {
      const playerId = rooms[message.code].players.length;
      const playerName = message.name;
      rooms[message.code].players.push({ [playerId]: { id: socket.id, name: playerName, score: 0 } });

      const outMessage = {
        playerId
      };
      socket.emit("ROOM_JOINED", outMessage);
      socket.join(message.code, function() {

        const players = rooms[message.code].players.map((player: any) => {

          return {
            id: Object.keys(player)[0],
            name: player[Object.keys(player)[0]].name
          }
        });

        const roomMessage = {
          players
        };
        io.in(message.code).emit("PLAYER_UPDATE", roomMessage);
      });
    }
  });

  socket.on("START_GAME", (message: any) => {
    const timer = 5;
    
    players = rooms[message.code].players.slice(1);
    rooms[message.code].words = generateRandomWords(players.length);
    rooms[message.code].word = 0;

    if (leftDrawer === null ) {
      leftDrawer = Number(Object.keys(players[0])[0]);
    };

    if (rightDrawer === null) {
      rightDrawer = Number(Object.keys(players[1])[0]);
    };

    let word = rooms[message.code].words[rooms[message.code].word];

    const outMessage = {
      timer,
      leftDrawer,
      rightDrawer,
      word
    }

    io.sockets.in(message.code).emit("STARTING_GAME", outMessage);

    setTimeout(function() {
      startRound(message.code);
    }, timer * 1000);
  });

  socket.on("SCORE", (message: any) => {
    rooms[message.code].players[message.playerId][message.playerId].score++
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

    rooms[code].word++;

    let word = rooms[code].words[rooms[code].word];

    const outMessage = {
      timer,
      leftDrawer,
      rightDrawer,
      word
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
