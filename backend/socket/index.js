"use strict";

const { Server } = require("socket.io");
const registerHandlers = require("./handlers");

let io;

const initSocket = (server) => {
  if (!server) {
    throw new Error("Server instance is required to initialize Socket.io");
  }

  io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  console.log("Socket.io initialized");

  io.on("connection", (socket) => {
    console.log(`New connection: ${socket.id}`);
    registerHandlers(io, socket);
  });

  return io;
};

module.exports = { initSocket };
