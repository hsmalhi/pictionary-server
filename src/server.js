"use strict";
exports.__esModule = true;
// src/server.ts
var express = require("express");
var app = express();
app.set("port", process.env.PORT || 3001);
var http = require("http").Server(app);
// set up socket.io and bind it to our
// http server.
var io = require("socket.io")(http);
var rooms = {};
var rounds = 6;
var generateCode = function () {
    var code = "";
    var codeGenerated = false;
    do {
        var characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
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
app.get("/", function (req, res) {
    res.send(rooms);
});
// start our simple server up on localhost:3000
var server = http.listen(process.env.PORT || 3001, function () {
    console.log("listening on ", process.env.PORT || "3001");
});
// whenever a user connects on port 3000 via
// a websocket, log that a user has connected
io.on("connection", function (socket) {
    console.log("a user connected", socket.id);
    var players = [];
    var leftDrawer = null;
    var rightDrawer = null;
    socket.on("SETUP", function () {
        var message = {
            code: generateCode()
        };
        rooms[message.code] = [{ 0: { id: socket.id, name: "MAIN" } }];
        socket.emit("ROOM_CREATED", message);
        socket.join(message.code);
    });
    socket.on("coordinates", function (message) {
        var roomName = message.room + "0";
        io.to(roomName).emit("coordinates" + message.side, message);
    });
    socket.on("clear", function (message) {
        var roomName = message.room + "0";
        io.to(roomName).emit("clear" + message.side, message);
    });
    socket.on("stop", function (message) {
        var roomName = message.room + "0";
        io.to(roomName).emit("stop" + message.side, message);
    });
    socket.on("JOIN", function (message) {
        var _a;
        if (!rooms[message.code]) {
            var outMessage = {
                error: "This room does not exist"
            };
            socket.emit("ROOM_JOINED", outMessage);
        }
        else if (rooms[message.code].length >= 8) {
            var outMessage = {
                error: "This room has reached maximum capacity"
            };
            socket.emit("ROOM_JOINED", outMessage);
        }
        else {
            var playerId = rooms[message.code].length;
            var playerName = message.name;
            rooms[message.code].push((_a = {},
                _a[playerId] = { id: socket.id, name: playerName },
                _a));
            var outMessage = {
                playerId: playerId
            };
            socket.emit("ROOM_JOINED", outMessage);
            socket.join(message.code, function () {
                var roomMessage = {
                    players: rooms[message.code]
                };
                io["in"](message.code).emit("PLAYER_UPDATE", roomMessage);
            });
        }
    });
    socket.on("START_GAME", function (message) {
        var timer = 5;
        var outMessage = {
            timer: timer,
            socketid: socket.id
        };
        console.log(io.sockets.adapter.rooms[message.code].sockets);
        io.sockets["in"](message.code).emit("STARTING_GAME", outMessage);
        players = rooms[message.code].splice(0, 1);
        setTimeout(function () {
            startRound(message.code);
        }, timer * 1000);
    });
    var startRound = function (code) {
        if (leftDrawer === null) {
            leftDrawer = players[0];
        }
        if (rightDrawer === null) {
            rightDrawer = players[1];
        }
        var timer = 45;
        var outMessage = {
            timer: timer,
            leftDrawer: leftDrawer,
            rightDrawer: rightDrawer
        };
        io["in"](code).emit("ROUND_START", outMessage);
    };
    socket.on("coordinates", function (message) {
        console.log(message.room);
        var roomName = "" + message.room;
        io.to(roomName).emit("coordinates" + message.side, message);
    });
    socket.on("clear", function (message) {
        var roomName = "" + message.room;
        io.to(roomName).emit("clear" + message.side, message);
    });
    socket.on("stop", function (message) {
        var roomName = "" + message.room;
        io.to(roomName).emit("stop" + message.side, message);
    });
});
