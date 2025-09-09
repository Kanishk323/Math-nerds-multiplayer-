const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

const rooms = {};

io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  socket.on('create_room', (payload, cb) => {
    const roomId = (Math.random().toString(36).substr(2, 6)).toUpperCase();
    rooms[roomId] = {
      hostSocketId: socket.id,
      players: [socket.id],
      createdAt: Date.now(),
      meta: payload?.meta || {}
    };
    socket.join(roomId);
    cb({ ok: true, roomId });
    io.to(roomId).emit('room_update', rooms[roomId]);
  });

  socket.on('join_room', (data, cb) => {
    const { roomId } = data || {};
    if (!roomId || !rooms[roomId]) return cb({ ok: false, error: 'Room not found' });
    if (rooms[roomId].players.length >= 2) return cb({ ok: false, error: 'Room full' });
    rooms[roomId].players.push(socket.id);
    socket.join(roomId);
    cb({ ok: true, roomId, hostSocketId: rooms[roomId].hostSocketId });
    io.to(roomId).emit('room_update', rooms[roomId]);
  });

  socket.on('host_init', (data) => {
    const { roomId, state } = data || {};
    if (!roomId || !rooms[roomId]) return;
    io.to(roomId).emit('init_state', { from: socket.id, state });
  });

  socket.on('game_action', (data) => {
    const { roomId, action } = data || {};
    if (!roomId || !rooms[roomId]) return;
    socket.to(roomId).emit('game_action', { from: socket.id, action });
  });

  socket.on('chat_message', (data) => {
    const { roomId, msg } = data || {};
    if (!roomId || !rooms[roomId]) return;
    io.to(roomId).emit('chat_message', { from: socket.id, msg });
  });

  socket.on('leave_room', (data) => {
    const { roomId } = data || {};
    if (!roomId || !rooms[roomId]) return;
    rooms[roomId].players = rooms[roomId].players.filter(id => id !== socket.id);
    socket.leave(roomId);
    io.to(roomId).emit('room_update', rooms[roomId]);
  });

  socket.on('disconnect', () => {
    for (const [roomId, r] of Object.entries(rooms)) {
      if (r.players.includes(socket.id)) {
        r.players = r.players.filter(id => id !== socket.id);
        io.to(roomId).emit('room_update', r);
        if (r.players.length === 0) {
          delete rooms[roomId];
        } else if (r.hostSocketId === socket.id) {
          r.hostSocketId = r.players[0];
          io.to(roomId).emit('host_changed', { newHost: r.hostSocketId });
        }
      }
    }
  });
});

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));