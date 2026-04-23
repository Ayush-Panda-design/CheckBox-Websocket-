/**
 * server.js — Real-time Checkbox Sync Server
 * Handles 10,000 checkboxes with delta broadcasting for performance.
 */

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
  maxHttpBufferSize: 1e6,
});

const PORT = process.env.PORT || 3000;
const CHECKBOX_COUNT = 10000;

// Boolean array — index 0..9999 maps to Item 0..9999
let checkboxState = Array(CHECKBOX_COUNT).fill(false);

app.use(express.static(path.join(__dirname, "public")));

io.on("connection", (socket) => {
  const clientId = socket.id.slice(0, 6);
  console.log(`[+] Client connected: ${clientId} (total: ${io.engine.clientsCount})`);

  // Send full state only to the newly connected client
  socket.emit("init", checkboxState);

  // Toggle single checkbox — broadcast delta only (index + value)
  // Critical for perf: don't send full 10k array on every click
  socket.on("toggle", ({ index, checked }) => {
    if (index >= 0 && index < CHECKBOX_COUNT) {
      checkboxState[index] = checked;
      io.emit("delta", { index, checked });
    }
  });

  // Reset all — lightweight signal
  socket.on("resetAll", () => {
    console.log(`[R] Reset all (by ${clientId})`);
    checkboxState = Array(CHECKBOX_COUNT).fill(false);
    io.emit("reset");
  });

  socket.on("disconnect", () => {
    console.log(`[-] Client disconnected: ${clientId}`);
  });
});

server.listen(PORT, () => {
  console.log(`\n✅ Server running → http://localhost:${PORT}`);
  console.log(`   Checkbox count: ${CHECKBOX_COUNT.toLocaleString()}\n`);
});