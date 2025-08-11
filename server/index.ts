
import { Server } from "socket.io";
import express from "express";
import { useAzureSocketIO } from "@azure/web-pubsub-socket.io";
import cors from "cors";

// Create an express app and a server
const app = express();
app.use(cors());
const server = require("http").createServer(app);

interface ServerToClientEvents {
  noArg: () => void;
  receiveMessage: (data: any) => void;
  //TicTactToe + Common Events
  userJoin: (string: any) => void;
  userJoinConfirm: () => void;
  unableToJoin: (string: any) => void;
  sendLog: (string: any) => void;
  updateMembers: (names: string[]) => void;
  startGame: () => void;
  endGame: () => void;
  receiveMove: (val: number) => void;
  //Lucky7 Events
  startLucky7Game: (rounds: number) => void;
  receiveOptionSelected: (val: number, player: string) => void;
  receiveDiceRolls: (dice1: number, dice2: number) => void;
  startNextRound: () => void;
  receiveResults: (results: number[]) => void;
  playerReady: (playerIndex: number) => void;
  //Poison Roullete
  receiveSelection: (val: number) => void;
  receiveEmoji: (val: string, player: number) => void;
}

interface ClientToServerEvents {
  hello: (arg: any) => void;
  //TicTactToe + Common Events
  createRoom: (name: string) => void;
  leaveRoom: (name: string) => void;
  joinRoom: (name: string, username: string) => void;
  updateMembers: (roomName: string, names: string[]) => void;
  sendMessage: (val: any) => void;
  sendMove: (roomname: string, val: number) => void;
  startGame: (roomname: string) => void;
  endGame: (roomname: string) => void;
  //Lucky7 Events
  createLucky7Room: (name: string, size: number, playerName: string) => void;
  startLucky7Game: (roomname: string, rounds: number) => void;
  sendOptionSelected: (roomname: string, val: number, player: string) => void;
  startDiceRoll: (roomname: string) => void;
  getResults: (roomname: string,players: string[]) => void;
  startNextRound: (roomname: string) => void;
  playerReady: (roomname: string, playerIndex: number) => void;
  //Poison Roulette
  sendSelection: (roomname: string, val: number) => void;
  sendEmoji: (roomname: string, val: string, player: number) => void;
}

interface InterServerEvents {
  ping: () => void;
}

interface SocketData {
  name: string;
  age: number;
}

const RoomSizesMap: Map<string, number> = new Map();
const RoomMembersMap: Map<string, number> = new Map();
const RoomMembersNameMap: Map<string, string[]> = new Map();
const ScoresMap: Map<string, number> = new Map();
let timeout;


let io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>(server);

// Define a port for the server to listen on
const PORT = process.env.PORT || 3001;

// Use the following line to integrate with Web PubSub for Socket.IO
useAzureSocketIO(io, {
  hub: "Hub", // The hub name can be any valid string.
  connectionString: "Endpoint=https://smdp-test.webpubsub.azure.com;AccessKey=XAEryqdJmrkLeeRT1NqlbOOAAFxZ65IRQbCkKqZHJUs=;Version=1.0;"
});

io.on("connection", (socket) => {

  // Receives a message from the client
  socket.on("hello", (arg) => {
    console.log(arg);   // Prints "stranger"
  })

  // TIC TAC TOE APP SOCKET FUNCTIONS

  socket.on("createRoom", (name: string) => {
    socket.join(name);
    RoomSizesMap.set(name, 2);
    RoomMembersMap.set(name, 0);
    RoomMembersNameMap.set(name,[]);
    socket.emit('sendLog', `${name} created`);
    setTimeout(() => {
      RoomSizesMap.delete(name);
      RoomMembersMap.delete(name);
    }, 60000 * 60);
  });

  socket.on("leaveRoom", (name: string) => {
    socket.leave(name);
    socket.emit('sendLog', `${name} room left`);
  });

  socket.on("joinRoom", async (name: string, username: string) => {
    console.log('join',username);
    socket.emit('sendLog', `${username} Joins`);
    const roomCurrentMembers = RoomMembersMap.get(name);
    let membersNames = RoomMembersNameMap.has(name) ? RoomMembersNameMap.get(name) : [] ;    

    if (!RoomSizesMap.has(name)) {
      socket.emit('unableToJoin', `Room ${name} for ${username} Not Present`)
    } else if (roomCurrentMembers < RoomSizesMap.get(name)) {
      socket.join(name);
      // socket.to(name).emit("userJoin", username);
      membersNames = [...membersNames, username];
      RoomMembersNameMap.set(name,membersNames);
      console.log('join',membersNames);
      socket.to(name).emit("updateMembers", membersNames);
      socket.emit("updateMembers", membersNames);
      //newly added code above
      socket.emit("userJoinConfirm");
      RoomMembersMap.set(name, roomCurrentMembers + 1);
    } else {
      socket.emit('unableToJoin', `Room Full ${membersNames.toString()}`);
    }

  })

  socket.on("updateMembers", (roomName: string, names: string[]) => {
    socket.to(roomName).emit("updateMembers", names);
  });

  socket.on("sendMove", (roomName: string, index: number) => {
    socket.to(roomName).emit("receiveMove", index);
  });

  socket.on("sendSelection", (roomName: string, index: number) => {
    socket.to(roomName).emit("receiveSelection", index);
  });

  socket.on("sendEmoji", (roomName: string, val: string, player: number) => {
    socket.to(roomName).emit("receiveEmoji", val, player);
  });
 
  socket.on("startGame", (roomName: string) => {
    socket.to(roomName).emit("startGame");
  });

  socket.on("endGame", (roomName: string) => {
    socket.to(roomName).emit("endGame");
    socket.emit("endGame");
  });

  socket.on("sendMessage", (data) => {
    socket.to(data.room).emit("receiveMessage", data);
  });


  // LUCKY 7 APP SOCKET FUNCTIONS

  socket.on("createLucky7Room", (name: string, size: number, playerName: string) => {
    socket.join(name);
    RoomSizesMap.delete(name);
    RoomSizesMap.set(name, size);
    RoomMembersMap.set(name, 1);
    RoomMembersNameMap.set(name,[playerName]);
    socket.emit("userJoinConfirm");
    setTimeout(() => {
      RoomSizesMap.delete(name);
      RoomMembersMap.delete(name);
    }, 60000 * 120);
  });

  socket.on("startLucky7Game", (roomName: string, rounds: number) => {
    socket.to(roomName).emit("startLucky7Game", rounds);
  });

  socket.on("startNextRound", (roomName: string) => {
    socket.to(roomName).emit("startNextRound");
    socket.emit("startNextRound");
  });

  socket.on("playerReady", (roomName: string,playerIndex: number) => {
    socket.to(roomName).emit("playerReady", playerIndex);
    socket.emit("playerReady", playerIndex);
  });

  socket.on("getResults", (roomName: string, players: string[]) => {
    let results = players.map(player => ScoresMap.get(player));
    socket.to(roomName).emit("receiveResults", results);
    socket.emit("receiveResults", results);
  });

  socket.on("sendOptionSelected" , (roomname: string, val: number, player: string) => {
    ScoresMap.set(player, val);
    socket.to(roomname).emit("receiveOptionSelected", val, player);
    socket.emit("receiveOptionSelected", val, player);
  });


  socket.on("startDiceRoll", (roomName: string) => {
    let random1 = Math.ceil(Math.random() * 10000);
    let random2 = Math.ceil(Math.random() * 10000);
                       
    const dice1 = random1 % 6;
    const dice2 = random2 % 6;
    clearTimeout(timeout);
    timeout = setTimeout(()=> {
      console.log('rolled',dice1, dice2);
      socket.to(roomName).emit("receiveDiceRolls", dice1, dice2);
      socket.emit("receiveDiceRolls", dice1, dice2);
    },4000);
    
  });

});

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

