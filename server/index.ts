
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
    receiveMessage:(data: any) => void;
    userJoin:(string: any) => void;
    updateMembers: (names: string[]) => void;
    startGame: () => void;
    receiveMove: ( val: number) => void;
  }
  
  interface ClientToServerEvents {
    hello: (arg:any) => void;
    createRoom: (name: string) => void;
    joinRoom: (name: string, username: string) => void;
    updateMembers: (roomName: string, names: string[]) => void;
    sendMessage: (val: any) => void;
    sendMove: (roomname:string, val: number) => void;
    startGame: (roomname: string) => void;
  }
  
  interface InterServerEvents {
    ping: () => void;
  }
  
  interface SocketData {
    name: string;
    age: number;
  }

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

    socket.on("createRoom",(name: string) => {
      socket.join(name);
    });

    socket.on("joinRoom",(name: string, username: string) => {
      socket.join(name);
      socket.to(name).emit("userJoin", username);
    })

    socket.on("updateMembers",(roomName: string,names: string[]) => {
      socket.to(roomName).emit("updateMembers", names);
    });

    socket.on("sendMove",(roomName: string,index: number) => {
      socket.to(roomName).emit("receiveMove", index);
    });

    socket.on("startGame",(roomName: string) => {
      socket.to(roomName).emit("startGame");
    });

    socket.on("sendMessage",(data) => {
      socket.to(data.room).emit("receiveMessage", data);
    })
});

server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });

