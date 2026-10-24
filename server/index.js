import express from 'express';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import {
  createRoom,
  updateRoleCounts,
  addPlayerToRoom,
  addBotToRoom,
  removePlayerFromRoom,
  startGame,
  declareAction,
  passOnAction,
  challengeAction,
  blockAction,
  passOnBlock,
  challengeBlock,
  chooseInfluenceToLose,
  submitExchangeCards,
  getSanitizedStateForPlayer,
  runBotStepIfNeeded,
} from './gameEngine.js';
import { GAME_PHASES } from '../src/constants/gameData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

const PORT = process.env.PORT || 3000;
const isProd = process.env.NODE_ENV === 'production';

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const rooms = new Map();
const botTimers = new Map();

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  do {
    code = '';
    for (let i = 0; i < 5; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
  } while (rooms.has(code));
  return code;
}

function getLanAddresses() {
  const nets = os.networkInterfaces();
  const results = [];
  for (const name of Object.keys(nets)) {
    for (const net of nets[name] || []) {
      if (net.family === 'IPv4' && !net.internal) {
        results.push(net.address);
      }
    }
  }
  return results;
}

app.get('/api/info', (_req, res) => {
  res.json({
    port: PORT,
    lanAddresses: getLanAddresses(),
    activeRooms: rooms.size,
  });
});

function broadcastRoom(room) {
  for (const player of room.players) {
    if (!player.isBot && player.socketId) {
      const state = getSanitizedStateForPlayer(room, player.id);
      io.to(player.socketId).emit('room_state', state);
    }
  }
  scheduleBotStep(room);
}

function scheduleBotStep(room) {
  if (botTimers.has(room.code)) {
    clearTimeout(botTimers.get(room.code));
    botTimers.delete(room.code);
  }

  if (room.phase === GAME_PHASES.LOBBY || room.phase === GAME_PHASES.GAME_OVER) {
    return;
  }

  const timer = setTimeout(() => {
    botTimers.delete(room.code);
    const acted = runBotStepIfNeeded(room);
    if (acted) {
      broadcastRoom(room);
    }
  }, 1100);

  botTimers.set(room.code, timer);
}

io.on('connection', (socket) => {
  socket.on('create_room', ({ playerId, name, avatar }, callback) => {
    if (!playerId || !name?.trim()) {
      return callback?.({ ok: false, error: 'กรุณาระบุชื่อผู้เล่น' });
    }
    const code = generateRoomCode();
    const room = createRoom(code, {
      id: playerId,
      socketId: socket.id,
      name: name.trim().slice(0, 20),
      avatar,
    });
    rooms.set(code, room);
    socket.join(code);
    socket.data.roomCode = code;
    socket.data.playerId = playerId;

    broadcastRoom(room);
    callback?.({ ok: true, roomCode: code });
  });

  socket.on('join_room', ({ roomCode, playerId, name, avatar }, callback) => {
    const cleanCode = (roomCode || '').trim().toUpperCase();
    const room = rooms.get(cleanCode);
    if (!room) {
      return callback?.({ ok: false, error: `ไม่พบห้องรหัส "${cleanCode}"` });
    }
    if (!playerId || !name?.trim()) {
      return callback?.({ ok: false, error: 'กรุณาระบุชื่อผู้เล่น' });
    }

    const res = addPlayerToRoom(room, {
      id: playerId,
      socketId: socket.id,
      name: name.trim().slice(0, 20),
      avatar,
    });

    if (!res.ok) {
      return callback?.(res);
    }

    socket.join(cleanCode);
    socket.data.roomCode = cleanCode;
    socket.data.playerId = playerId;

    broadcastRoom(room);
    callback?.({ ok: true, roomCode: cleanCode });
  });

  socket.on('leave_room', ({ roomCode, playerId }, callback) => {
    const room = rooms.get(roomCode);
    if (!room) return callback?.({ ok: true });

    removePlayerFromRoom(room, playerId);
    socket.leave(roomCode);

    const hasHumans = room.players.some((p) => !p.isBot);
    if (!hasHumans) {
      if (botTimers.has(roomCode)) clearTimeout(botTimers.get(roomCode));
      rooms.delete(roomCode);
    } else {
      broadcastRoom(room);
    }
    callback?.({ ok: true });
  });

  socket.on('add_bot', ({ roomCode, playerId }, callback) => {
    const room = rooms.get(roomCode);
    if (!room) return callback?.({ ok: false, error: 'ไม่พบห้อง' });
    const requester = room.players.find((p) => p.id === playerId);
    if (!requester?.isHost) return callback?.({ ok: false, error: 'เฉพาะหัวหน้าห้องเท่านั้นที่เพิ่มบอทได้' });

    const res = addBotToRoom(room);
    if (res.ok) broadcastRoom(room);
    callback?.(res);
  });

  socket.on('kick_player', ({ roomCode, playerId, targetId }, callback) => {
    const room = rooms.get(roomCode);
    if (!room) return callback?.({ ok: false, error: 'ไม่พบห้อง' });
    const requester = room.players.find((p) => p.id === playerId);
    if (!requester?.isHost) return callback?.({ ok: false, error: 'เฉพาะหัวหน้าห้องเท่านั้น' });

    const res = removePlayerFromRoom(room, targetId);
    if (res.ok) broadcastRoom(room);
    callback?.(res);
  });

  socket.on('update_role_counts', ({ roomCode, playerId, roleCounts }, callback) => {
    const room = rooms.get(roomCode);
    if (!room) return callback?.({ ok: false, error: 'ไม่พบห้อง' });
    const res = updateRoleCounts(room, playerId, roleCounts);
    if (res.ok) broadcastRoom(room);
    callback?.(res);
  });

  socket.on('start_game', ({ roomCode, playerId }, callback) => {
    const room = rooms.get(roomCode);
    if (!room) return callback?.({ ok: false, error: 'ไม่พบห้อง' });

    const res = startGame(room, playerId);
    if (res.ok) broadcastRoom(room);
    callback?.(res);
  });

  socket.on('back_to_lobby', ({ roomCode, playerId }, callback) => {
    const room = rooms.get(roomCode);
    if (!room) return callback?.({ ok: false, error: 'ไม่พบห้อง' });
    const requester = room.players.find((p) => p.id === playerId);
    if (!requester?.isHost) return callback?.({ ok: false, error: 'เฉพาะหัวหน้าห้องเท่านั้น' });

    room.phase = GAME_PHASES.LOBBY;
    room.pendingAction = null;
    room.influenceLossState = null;
    room.exchangeState = null;
    room.winner = null;
    broadcastRoom(room);
    callback?.({ ok: true });
  });

  socket.on('declare_action', ({ roomCode, playerId, actionType, targetId }, callback) => {
    const room = rooms.get(roomCode);
    if (!room) return callback?.({ ok: false, error: 'ไม่พบห้อง' });
    const res = declareAction(room, playerId, actionType, targetId);
    if (res.ok) broadcastRoom(room);
    callback?.(res);
  });

  socket.on('pass_action', ({ roomCode, playerId }, callback) => {
    const room = rooms.get(roomCode);
    if (!room) return callback?.({ ok: false, error: 'ไม่พบห้อง' });
    const res = passOnAction(room, playerId);
    if (res.ok) broadcastRoom(room);
    callback?.(res);
  });

  socket.on('challenge_action', ({ roomCode, playerId }, callback) => {
    const room = rooms.get(roomCode);
    if (!room) return callback?.({ ok: false, error: 'ไม่พบห้อง' });
    const res = challengeAction(room, playerId);
    if (res.ok) broadcastRoom(room);
    callback?.(res);
  });

  socket.on('block_action', ({ roomCode, playerId, claimedRole }, callback) => {
    const room = rooms.get(roomCode);
    if (!room) return callback?.({ ok: false, error: 'ไม่พบห้อง' });
    const res = blockAction(room, playerId, claimedRole);
    if (res.ok) broadcastRoom(room);
    callback?.(res);
  });

  socket.on('pass_block', ({ roomCode, playerId }, callback) => {
    const room = rooms.get(roomCode);
    if (!room) return callback?.({ ok: false, error: 'ไม่พบห้อง' });
    const res = passOnBlock(room, playerId);
    if (res.ok) broadcastRoom(room);
    callback?.(res);
  });

  socket.on('challenge_block', ({ roomCode, playerId }, callback) => {
    const room = rooms.get(roomCode);
    if (!room) return callback?.({ ok: false, error: 'ไม่พบห้อง' });
    const res = challengeBlock(room, playerId);
    if (res.ok) broadcastRoom(room);
    callback?.(res);
  });

  socket.on('choose_influence_loss', ({ roomCode, playerId, cardIndex }, callback) => {
    const room = rooms.get(roomCode);
    if (!room) return callback?.({ ok: false, error: 'ไม่พบห้อง' });
    const res = chooseInfluenceToLose(room, playerId, cardIndex);
    if (res.ok) broadcastRoom(room);
    callback?.(res);
  });

  socket.on('submit_exchange', ({ roomCode, playerId, selectedIndices }, callback) => {
    const room = rooms.get(roomCode);
    if (!room) return callback?.({ ok: false, error: 'ไม่พบห้อง' });
    const res = submitExchangeCards(room, playerId, selectedIndices);
    if (res.ok) broadcastRoom(room);
    callback?.(res);
  });

  socket.on('send_chat', ({ roomCode, playerId, text, emoji }) => {
    const room = rooms.get(roomCode);
    if (!room) return;
    const sender = room.players.find((p) => p.id === playerId);
    if (!sender) return;

    const msg = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      playerId: sender.id,
      playerName: sender.name,
      avatar: sender.avatar,
      text: (text || '').trim().slice(0, 120),
      emoji: emoji || null,
      timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
    };

    room.chat.push(msg);
    if (room.chat.length > 50) room.chat.shift();

    io.to(roomCode).emit('chat_message', msg);
    broadcastRoom(room);
  });

  socket.on('disconnect', () => {
    const { roomCode, playerId } = socket.data;
    if (!roomCode || !playerId) return;
    const room = rooms.get(roomCode);
    if (!room) return;

    const player = room.players.find((p) => p.id === playerId);
    if (player) {
      player.connected = false;
      broadcastRoom(room);
    }
  });
});

async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, allowedHosts: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(ROOT_DIR, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    const lanList = getLanAddresses();
    console.log(`\n==================================================`);
    console.log(`👑 CROWNFALL Online Server พร้อมใช้งานแล้ว!`);
    console.log(`👉 เล่นบนเครื่องนี้:   http://localhost:${PORT}`);
    lanList.forEach((ip) => {
      console.log(`🌐 เล่นผ่านวง LAN:    http://${ip}:${PORT}`);
    });
    console.log(`==================================================\n`);
  });
}

startServer();

