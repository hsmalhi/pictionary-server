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
var server = http.listen(3001, function () {
    console.log("listening on *:3001");
});
// whenever a user connects on port 3000 via
// a websocket, log that a user has connected
io.on("connection", function (socket) {
    console.log("a user connected");
    socket.on("SETUP", function () {
        var message = {
            code: generateCode()
        };
        rooms[message.code] = socket.id;
        socket.emit("ROOM_CREATED", message);
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
});
