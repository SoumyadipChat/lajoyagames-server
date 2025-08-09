"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const socket_io_1 = require("socket.io");
const express_1 = __importDefault(require("express"));
const web_pubsub_socket_io_1 = require("@azure/web-pubsub-socket.io");
const cors_1 = __importDefault(require("cors"));
// Create an express app and a server
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
const server = require("http").createServer(app);
const RoomSizesMap = new Map();
const RoomMembersMap = new Map();
const RoomMembersNameMap = new Map();
const ScoresMap = new Map();
let timeout;
let io = new socket_io_1.Server(server);
// Define a port for the server to listen on
const PORT = process.env.PORT || 3001;
// Use the following line to integrate with Web PubSub for Socket.IO
(0, web_pubsub_socket_io_1.useAzureSocketIO)(io, {
    hub: "Hub", // The hub name can be any valid string.
    connectionString: "Endpoint=https://smdp-test.webpubsub.azure.com;AccessKey=XAEryqdJmrkLeeRT1NqlbOOAAFxZ65IRQbCkKqZHJUs=;Version=1.0;"
});
io.on("connection", (socket) => {
    // Receives a message from the client
    socket.on("hello", (arg) => {
        console.log(arg); // Prints "stranger"
    });
    // TIC TAC TOE APP SOCKET FUNCTIONS
    socket.on("createRoom", (name) => {
        socket.join(name);
        RoomSizesMap.set(name, 2);
        RoomMembersMap.set(name, 1);
        setTimeout(() => {
            RoomSizesMap.delete(name);
            RoomMembersMap.delete(name);
        }, 60000 * 120);
    });
    socket.on("joinRoom", (name, username) => __awaiter(void 0, void 0, void 0, function* () {
        console.log('join');
        const roomCurrentMembers = RoomMembersMap.get(name);
        if (!RoomSizesMap.has(name)) {
            socket.emit('unableToJoin', 'Room Not Present');
        }
        else if (roomCurrentMembers < RoomSizesMap.get(name)) {
            socket.join(name);
            // socket.to(name).emit("userJoin", username);
            let membersNames = RoomMembersNameMap.has(name) ? RoomMembersNameMap.get(name) : [];
            membersNames = [...membersNames, username];
            RoomMembersNameMap.set(name, membersNames);
            socket.to(name).emit("updateMembers", membersNames);
            socket.emit("updateMembers", membersNames);
            //newly added code above
            socket.emit("userJoinConfirm");
            RoomMembersMap.set(name, roomCurrentMembers + 1);
        }
        else {
            socket.emit('unableToJoin', 'Room Full');
        }
    }));
    socket.on("updateMembers", (roomName, names) => {
        socket.to(roomName).emit("updateMembers", names);
    });
    socket.on("sendMove", (roomName, index) => {
        socket.to(roomName).emit("receiveMove", index);
    });
    socket.on("startGame", (roomName) => {
        socket.to(roomName).emit("startGame");
    });
    socket.on("endGame", (roomName) => {
        socket.to(roomName).emit("endGame");
        socket.emit("endGame");
    });
    socket.on("sendMessage", (data) => {
        socket.to(data.room).emit("receiveMessage", data);
    });
    // LUCKY 7 APP SOCKET FUNCTIONS
    socket.on("createLucky7Room", (name, size, playerName) => {
        socket.join(name);
        RoomSizesMap.delete(name);
        RoomSizesMap.set(name, size);
        RoomMembersMap.set(name, 1);
        RoomMembersNameMap.set(name, [playerName]);
        socket.emit("userJoinConfirm");
        setTimeout(() => {
            RoomSizesMap.delete(name);
            RoomMembersMap.delete(name);
        }, 60000 * 120);
    });
    socket.on("startLucky7Game", (roomName, rounds) => {
        socket.to(roomName).emit("startLucky7Game", rounds);
    });
    socket.on("startNextRound", (roomName) => {
        socket.to(roomName).emit("startNextRound");
        socket.emit("startNextRound");
    });
    socket.on("playerReady", (roomName, playerIndex) => {
        socket.to(roomName).emit("playerReady", playerIndex);
        socket.emit("playerReady", playerIndex);
    });
    socket.on("getResults", (roomName, players) => {
        let results = players.map(player => ScoresMap.get(player));
        socket.to(roomName).emit("receiveResults", results);
        socket.emit("receiveResults", results);
    });
    socket.on("sendOptionSelected", (roomname, val, player) => {
        ScoresMap.set(player, val);
        socket.to(roomname).emit("receiveOptionSelected", val, player);
        socket.emit("receiveOptionSelected", val, player);
    });
    socket.on("startDiceRoll", (roomName) => {
        let random1 = Math.ceil(Math.random() * 10000);
        let random2 = Math.ceil(Math.random() * 10000);
        const dice1 = random1 % 6;
        const dice2 = random2 % 6;
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            console.log('rolled', dice1, dice2);
            socket.to(roomName).emit("receiveDiceRolls", dice1, dice2);
            socket.emit("receiveDiceRolls", dice1, dice2);
        }, 4000);
    });
});
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});
