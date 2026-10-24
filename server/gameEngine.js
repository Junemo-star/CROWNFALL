import {
  ROLES,
  ROLE_INFO,
  ACTIONS,
  ACTION_INFO,
  GAME_PHASES,
  DEFAULT_ROLE_COUNTS,
} from '../src/constants/gameData.js';

const AVATARS = ['🦊', '🦁', '🦉', '🐺', '🐍', '🦅', '🎭', '👑', '🗡️', '⚜️'];
const BOT_NAMES = [
  'บารอนวิคเตอร์ (AI)',
  'เลดี้เซราฟิน่า (AI)',
  'ลอร์ดคอร์วาน (AI)',
  'ดัชเชสเอเลน่า (AI)',
  'กัปตันมอร์แกน (AI)',
];

function createDeck(roleCounts = DEFAULT_ROLE_COUNTS) {
  const deck = [];
  Object.values(ROLES).forEach((role) => {
    const count = Math.max(0, Number(roleCounts[role] ?? 0));
    for (let i = 0; i < count; i++) {
      deck.push(role);
    }
  });
  return shuffle(deck);
}

export function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function addLog(room, message, type = 'info') {
  room.logs.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    message,
    type,
  });
  if (room.logs.length > 80) {
    room.logs.shift();
  }
}

export function createRoom(roomCode, hostPlayer) {
  return {
    code: roomCode,
    phase: GAME_PHASES.LOBBY,
    roleCounts: { ...DEFAULT_ROLE_COUNTS },
    players: [
      {
        id: hostPlayer.id,
        socketId: hostPlayer.socketId,
        name: hostPlayer.name,
        avatar: hostPlayer.avatar || AVATARS[0],
        isHost: true,
        isBot: false,
        connected: true,
        coins: 2,
        cards: [],
        isAlive: true,
      },
    ],
    deck: [],
    turnIndex: 0,
    turnNumber: 1,
    pendingAction: null,
    influenceLossState: null,
    exchangeState: null,
    winner: null,
    logs: [
      {
        id: 'init',
        timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        message: `🎉 สร้างห้อง ${roomCode} สำเร็จ รอผู้เล่นเข้าร่วม...`,
        type: 'system',
      },
    ],
    chat: [],
  };
}

export function updateRoleCounts(room, requesterId, newRoleCounts) {
  const requester = room.players.find((p) => p.id === requesterId);
  if (!requester || !requester.isHost) {
    return { ok: false, error: 'เฉพาะหัวหน้าห้องเท่านั้นที่ปรับจำนวนโรลได้' };
  }
  if (room.phase !== GAME_PHASES.LOBBY) {
    return { ok: false, error: 'ปรับจำนวนโรลได้เฉพาะในห้องเตรียมพร้อมก่อนเริ่มรอบ' };
  }
  if (!newRoleCounts || typeof newRoleCounts !== 'object') {
    return { ok: false, error: 'ข้อมูลโรลไม่ถูกต้อง' };
  }

  const sanitized = {};
  Object.values(ROLES).forEach((role) => {
    const val = Math.floor(Number(newRoleCounts[role] ?? 0));
    sanitized[role] = Math.min(6, Math.max(0, isNaN(val) ? 0 : val));
  });

  room.roleCounts = sanitized;
  return { ok: true };
}

export function addPlayerToRoom(room, playerInfo) {
  const existing = room.players.find((p) => p.id === playerInfo.id);
  if (existing) {
    existing.socketId = playerInfo.socketId;
    existing.connected = true;
    if (playerInfo.name) existing.name = playerInfo.name;
    return { ok: true, reconnected: true };
  }

  if (room.phase !== GAME_PHASES.LOBBY) {
    return { ok: false, error: 'เกมในห้องนี้เริ่มไปแล้ว ไม่สามารถเข้ากลางคันได้' };
  }

  if (room.players.length >= 6) {
    return { ok: false, error: 'ห้องเต็มแล้ว (สูงสุด 6 คน)' };
  }

  const usedAvatars = new Set(room.players.map((p) => p.avatar));
  const availableAvatar = AVATARS.find((a) => !usedAvatars.has(a)) || AVATARS[room.players.length % AVATARS.length];

  room.players.push({
    id: playerInfo.id,
    socketId: playerInfo.socketId,
    name: playerInfo.name,
    avatar: playerInfo.avatar || availableAvatar,
    isHost: false,
    isBot: Boolean(playerInfo.isBot),
    connected: true,
    coins: 2,
    cards: [],
    isAlive: true,
  });

  addLog(room, `👋 ${playerInfo.name} เข้าร่วมห้อง`, 'system');
  return { ok: true, reconnected: false };
}

export function addBotToRoom(room) {
  if (room.phase !== GAME_PHASES.LOBBY) {
    return { ok: false, error: 'เพิ่มบอทได้เฉพาะตอนอยู่ในห้องรอเริ่มเกม' };
  }
  if (room.players.length >= 6) {
    return { ok: false, error: 'ห้องเต็มแล้ว (สูงสุด 6 คน)' };
  }
  const existingNames = new Set(room.players.map((p) => p.name));
  const botName = BOT_NAMES.find((n) => !existingNames.has(n)) || `บอทราชสำนัก #${room.players.length}`;
  const botId = `bot-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  return addPlayerToRoom(room, {
    id: botId,
    socketId: null,
    name: botName,
    isBot: true,
  });
}

export function removePlayerFromRoom(room, playerId) {
  const idx = room.players.findIndex((p) => p.id === playerId);
  if (idx === -1) return { ok: false };

  const removed = room.players[idx];
  room.players.splice(idx, 1);
  addLog(room, `🚪 ${removed.name} ออกจากห้อง`, 'system');

  if (room.players.length > 0 && !room.players.some((p) => p.isHost && !p.isBot)) {
    const nextHuman = room.players.find((p) => !p.isBot);
    if (nextHuman) {
      nextHuman.isHost = true;
      addLog(room, `👑 ${nextHuman.name} ได้รับตำแหน่งหัวหน้าห้องคนใหม่`, 'system');
    }
  }
  return { ok: true };
}

export function startGame(room, requesterId) {
  const requester = room.players.find((p) => p.id === requesterId);
  if (!requester || !requester.isHost) {
    return { ok: false, error: 'เฉพาะหัวหน้าห้องเท่านั้นที่เริ่มเกมได้' };
  }
  if (room.players.length < 2) {
    return { ok: false, error: 'ต้องมีผู้เล่นอย่างน้อย 2 คนจึงจะเริ่มเกมได้' };
  }

  const minRequiredCards = room.players.length * 2 + 2;
  const totalDeckCards = Object.values(room.roleCounts || DEFAULT_ROLE_COUNTS).reduce((sum, n) => sum + Number(n || 0), 0);
  const activeRoleTypes = Object.values(room.roleCounts || DEFAULT_ROLE_COUNTS).filter((n) => Number(n) > 0).length;

  if (activeRoleTypes < 2) {
    return { ok: false, error: 'กรุณาเลือกใช้โรลอย่างน้อย 2 โรลขึ้นไปในสำรับ' };
  }
  if (totalDeckCards < minRequiredCards) {
    return {
      ok: false,
      error: `จำนวนการ์ดรวมน้อยเกินไป! สำหรับผู้เล่น ${room.players.length} คน ต้องมีการ์ดในสำรับอย่างน้อย ${minRequiredCards} ใบ (ตอนนี้มี ${totalDeckCards} ใบ)`,
    };
  }

  room.deck = createDeck(room.roleCounts);
  room.players.forEach((p) => {
    p.coins = 2;
    p.isAlive = true;
    p.cards = [
      { id: `${p.id}-c0-${Date.now()}`, role: room.deck.pop(), revealed: false },
      { id: `${p.id}-c1-${Date.now()}`, role: room.deck.pop(), revealed: false },
    ];
  });

  room.turnIndex = Math.floor(Math.random() * room.players.length);
  room.turnNumber = 1;
  room.phase = GAME_PHASES.TURN_START;
  room.pendingAction = null;
  room.influenceLossState = null;
  room.exchangeState = null;
  room.winner = null;

  const activeRolesSummary = Object.entries(room.roleCounts)
    .filter(([, count]) => count > 0)
    .map(([role, count]) => `${ROLE_INFO[role].nameTh} ×${count}`)
    .join(', ');

  const firstPlayer = room.players[room.turnIndex];
  addLog(room, `🎲 เริ่มรอบใหม่! สำรับรอบนี้ (${totalDeckCards} ใบ): ${activeRolesSummary}`, 'highlight');
  addLog(room, `▶️ เทิร์นที่ 1: ตาของ ${firstPlayer.name}`, 'turn');

  return { ok: true };
}

export function getCurrentTurnPlayer(room) {
  return room.players[room.turnIndex] || null;
}

function checkWinCondition(room) {
  const alivePlayers = room.players.filter((p) => p.isAlive);
  if (alivePlayers.length === 1) {
    const winner = alivePlayers[0];
    room.phase = GAME_PHASES.GAME_OVER;
    room.winner = {
      id: winner.id,
      name: winner.name,
      avatar: winner.avatar,
    };
    room.pendingAction = null;
    room.influenceLossState = null;
    room.exchangeState = null;
    addLog(room, `🏆 ${winner.name} เป็นผู้รอดชีวิตคนสุดท้ายและชนะศึกชิงบัลลังก์ CROWNFALL!`, 'winner');
    return true;
  }
  return false;
}

function advanceTurn(room) {
  if (checkWinCondition(room)) return;

  room.pendingAction = null;
  room.influenceLossState = null;
  room.exchangeState = null;

  const total = room.players.length;
  for (let step = 1; step <= total; step++) {
    const nextIdx = (room.turnIndex + step) % total;
    if (room.players[nextIdx].isAlive) {
      room.turnIndex = nextIdx;
      break;
    }
  }

  room.turnNumber += 1;
  room.phase = GAME_PHASES.TURN_START;
  const activePlayer = room.players[room.turnIndex];
  addLog(room, `▶️ เทิร์นที่ ${room.turnNumber}: ตาของ ${activePlayer.name}`, 'turn');
}

function requestInfluenceLoss(room, targetPlayerId, reason, nextStep) {
  const target = room.players.find((p) => p.id === targetPlayerId);
  if (!target || !target.isAlive) {
    proceedAfterInfluenceLoss(room, nextStep);
    return;
  }

  const unrevealed = target.cards.filter((c) => !c.revealed);
  if (unrevealed.length === 0) {
    target.isAlive = false;
    proceedAfterInfluenceLoss(room, nextStep);
    return;
  }

  room.phase = GAME_PHASES.AWAITING_INFLUENCE_LOSS;
  room.influenceLossState = {
    playerId: target.id,
    reason,
    nextStep,
  };
}

function swapRevealedProofCard(room, player, roleToSwap) {
  const cardIndex = player.cards.findIndex((c) => !c.revealed && c.role === roleToSwap);
  if (cardIndex === -1) return;

  room.deck.push(roleToSwap);
  room.deck = shuffle(room.deck);
  const newRole = room.deck.pop();
  player.cards[cardIndex] = {
    id: `${player.id}-swap-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
    role: newRole,
    revealed: false,
  };
}

function executePendingAction(room) {
  if (checkWinCondition(room)) return;
  const pending = room.pendingAction;
  if (!pending) {
    advanceTurn(room);
    return;
  }

  const actor = room.players.find((p) => p.id === pending.actorId);
  const target = pending.targetId ? room.players.find((p) => p.id === pending.targetId) : null;

  if (!actor || !actor.isAlive) {
    advanceTurn(room);
    return;
  }

  switch (pending.type) {
    case ACTIONS.FOREIGN_AID: {
      actor.coins += 2;
      addLog(room, `💵 ${actor.name} ได้รับเงินอุดหนุนนอก +2 เหรียญ (รวม ${actor.coins} เหรียญ)`, 'success');
      advanceTurn(room);
      break;
    }
    case ACTIONS.TAX: {
      actor.coins += 3;
      addLog(room, `👑 ${actor.name} รีดภาษีในฐานะเจ้ากรมคลัง รับ +3 เหรียญ (รวม ${actor.coins} เหรียญ)`, 'success');
      advanceTurn(room);
      break;
    }
    case ACTIONS.STEAL: {
      if (!target || !target.isAlive) {
        advanceTurn(room);
        break;
      }
      const stolen = Math.min(2, target.coins);
      target.coins -= stolen;
      actor.coins += stolen;
      addLog(room, `⚓ ${actor.name} ปล้นเสบียงจาก ${target.name} สำเร็จ จำนวน ${stolen} เหรียญ!`, 'success');
      advanceTurn(room);
      break;
    }
    case ACTIONS.ASSASSINATE: {
      if (!target || !target.isAlive) {
        addLog(room, `🗡️ เป้าหมายของการลอบปลิดชีพสิ้นสภาพไปแล้ว`, 'info');
        advanceTurn(room);
        break;
      }
      addLog(room, `🗡️ การลอบปลิดชีพของ ${actor.name} สำเร็จ! ${target.name} ต้องเปิดทิ้งการ์ด 1 ใบ`, 'danger');
      requestInfluenceLoss(room, target.id, `ถูกลอบปลิดชีพโดย ${actor.name}`, 'NEXT_TURN');
      break;
    }
    case ACTIONS.EXCHANGE: {
      const unrevealed = actor.cards.filter((c) => !c.revealed);
      const drawn = [];
      for (let i = 0; i < 2; i++) {
        if (room.deck.length > 0) {
          drawn.push(room.deck.pop());
        }
      }
      const options = [...unrevealed.map((c) => c.role), ...drawn];
      room.phase = GAME_PHASES.AWAITING_EXCHANGE;
      room.exchangeState = {
        actorId: actor.id,
        keepCount: unrevealed.length,
        options,
      };
      addLog(room, `🔄 ${actor.name} จั่วการ์ด ${drawn.length} ใบจากกองกลางเพื่อสับเปลี่ยนสายลับ (ราชทูตมืด)`, 'info');
      break;
    }
    case ACTIONS.INTERROGATE: {
      actor.coins += 1;
      if (target && target.isAlive && room.deck.length > 0) {
        const unrevealedIndices = target.cards
          .map((c, idx) => (!c.revealed ? idx : -1))
          .filter((idx) => idx !== -1);
        if (unrevealedIndices.length > 0) {
          const pickIdx = unrevealedIndices[Math.floor(Math.random() * unrevealedIndices.length)];
          const oldRole = target.cards[pickIdx].role;
          room.deck.push(oldRole);
          room.deck = shuffle(room.deck);
          const newRole = room.deck.pop();
          target.cards[pickIdx] = {
            id: `${target.id}-inq-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
            role: newRole,
            revealed: false,
          };
        }
      }
      addLog(
        room,
        `👁️ ${actor.name} ไต่สวน ${target?.name} สำเร็จ! รับ +1 เหรียญ และบังคับ ${target?.name} สับการ์ด 1 ใบคืนกองกลางแล้วจั่วใบใหม่!`,
        'success'
      );
      advanceTurn(room);
      break;
    }
    case ACTIONS.BLACKMAIL: {
      const taken = target && target.isAlive ? Math.min(1, target.coins) : 0;
      if (target && target.isAlive) {
        target.coins -= taken;
      }
      actor.coins += taken + 1;
      addLog(
        room,
        `🧪 ${actor.name} รีดไถยาถอนพิษจาก ${target?.name} สำเร็จ! (สูบมา ${taken} เหรียญ + คลังกลาง 1 เหรียญ รวมได้ +${taken + 1} เหรียญ)`,
        'success'
      );
      advanceTurn(room);
      break;
    }
    case ACTIONS.CONDEMN: {
      if (!target || !target.isAlive) {
        addLog(room, `⚖️ เป้าหมายของคำพิพากษาสิ้นสภาพไปแล้ว`, 'info');
        advanceTurn(room);
        break;
      }
      const burned = Math.min(1, target.coins);
      target.coins -= burned;
      addLog(
        room,
        `⚖️ คำพิพากษาของ ${actor.name} สำเร็จ! ยึดทรัพย์ ${target.name} ทิ้งเข้าคลัง ${burned} เหรียญ และ ${target.name} ต้องเสียการ์ด 1 ใบ!`,
        'danger'
      );
      requestInfluenceLoss(room, target.id, `ถูก ${actor.name} พิพากษายึดทรัพย์ (Condemn)`, 'NEXT_TURN');
      break;
    }
    default:
      advanceTurn(room);
  }
}

function proceedAfterInfluenceLoss(room, nextStep) {
  if (checkWinCondition(room)) return;

  if (nextStep === 'NEXT_TURN') {
    advanceTurn(room);
    return;
  }

  if (nextStep === 'AWAITING_BLOCK_ONLY') {
    const pending = room.pendingAction;
    const target = pending?.targetId ? room.players.find((p) => p.id === pending.targetId) : null;
    if (pending && target && target.isAlive && pending.blockableBy.length > 0) {
      room.phase = GAME_PHASES.AWAITING_BLOCK_ONLY;
      pending.passedPlayerIds = [];
      room.influenceLossState = null;
      addLog(
        room,
        `🛡️ ${target.name} ยังสามารถเลือกบล็อกการกระทำของ ${room.players.find((p) => p.id === pending.actorId)?.name} หรือปล่อยผ่านได้`,
        'info'
      );
      return;
    }
    executePendingAction(room);
    return;
  }

  if (nextStep === 'RESOLVE_ACTION') {
    executePendingAction(room);
    return;
  }

  advanceTurn(room);
}

export function declareAction(room, playerId, actionType, targetId = null) {
  if (room.phase !== GAME_PHASES.TURN_START) {
    return { ok: false, error: 'ไม่สามารถประกาศแอคชันในเฟสนี้ได้' };
  }

  const activePlayer = getCurrentTurnPlayer(room);
  if (!activePlayer || activePlayer.id !== playerId) {
    return { ok: false, error: 'ยังไม่ใช่เทิร์นของคุณ' };
  }

  const actionInfo = ACTION_INFO[actionType];
  if (!actionInfo) {
    return { ok: false, error: 'แอคชันไม่ถูกต้อง' };
  }

  if (actionInfo.claimedRole && !(room.roleCounts?.[actionInfo.claimedRole] > 0)) {
    return { ok: false, error: 'โรลของแอคชันนี้ไม่ได้ถูกเปิดใช้งานในสำรับรอบนี้' };
  }

  if (activePlayer.coins >= 10 && actionType !== ACTIONS.COUP) {
    return { ok: false, error: 'คุณมี 10 เหรียญขึ้นไป กติกาบังคับต้องโค่นอำนาจ (Overthrow) เท่านั้น!' };
  }

  if (activePlayer.coins < actionInfo.cost) {
    return { ok: false, error: `เหรียญไม่พอ (ต้องการ ${actionInfo.cost} เหรียญ)` };
  }

  let target = null;
  if (actionInfo.requiresTarget) {
    target = room.players.find((p) => p.id === targetId && p.isAlive);
    if (!target || target.id === activePlayer.id) {
      return { ok: false, error: 'กรุณาเลือกผู้เล่นเป้าหมายที่ยังมีชีวิตอยู่' };
    }
  }

  // Deduct cost
  activePlayer.coins -= actionInfo.cost;

  // Immediate actions
  if (actionType === ACTIONS.INCOME) {
    activePlayer.coins += 1;
    addLog(room, `💰 ${activePlayer.name} รับเบี้ยหวัด (Stipend) +1 เหรียญ (รวม ${activePlayer.coins} เหรียญ)`, 'success');
    advanceTurn(room);
    return { ok: true };
  }

  if (actionType === ACTIONS.COUP) {
    addLog(room, `⚔️ ${activePlayer.name} จ่าย 7 เหรียญ โค่นอำนาจ (Overthrow) ใส่ ${target.name}!`, 'danger');
    requestInfluenceLoss(room, target.id, `ถูก ${activePlayer.name} โค่นอำนาจ (Overthrow)`, 'NEXT_TURN');
    return { ok: true };
  }

  // Filter blockableBy to only roles enabled in this round's deck
  const activeBlockableBy = (actionInfo.blockableBy || []).filter(
    (role) => (room.roleCounts?.[role] ?? DEFAULT_ROLE_COUNTS[role] ?? 0) > 0
  );

  room.pendingAction = {
    type: actionType,
    actorId: activePlayer.id,
    targetId: target ? target.id : null,
    claimedRole: actionInfo.claimedRole,
    blockableBy: activeBlockableBy,
    blockScope: actionInfo.blockScope || null,
    passedPlayerIds: [],
    challengeResolved: false,
    block: null,
  };

  // If Foreign Aid has no active blocking roles in this custom deck, execute immediately!
  if (!actionInfo.claimedRole && activeBlockableBy.length === 0) {
    executePendingAction(room);
    return { ok: true };
  }

  room.phase = GAME_PHASES.AWAITING_ACTION_RESPONSE;

  const roleBadge = actionInfo.claimedRole ? ` (อ้างเป็น ${ROLE_INFO[actionInfo.claimedRole].nameTh})` : '';
  const targetText = target ? ` เป้าหมายคือ ${target.name}` : '';
  addLog(room, `📣 ${activePlayer.name} ประกาศ "${actionInfo.nameTh}"${roleBadge}${targetText}`, 'action');

  return { ok: true };
}

export function passOnAction(room, playerId) {
  if (room.phase !== GAME_PHASES.AWAITING_ACTION_RESPONSE && room.phase !== GAME_PHASES.AWAITING_BLOCK_ONLY) {
    return { ok: false, error: 'ไม่อยู่ในช่วงตอบสนองต่อแอคชัน' };
  }

  const pending = room.pendingAction;
  if (!pending) return { ok: false, error: 'ไม่มีแอคชันที่รออยู่' };
  if (playerId === pending.actorId) return { ok: false, error: 'ผู้ประกาศแอคชันไม่ต้องกดผ่าน' };

  const player = room.players.find((p) => p.id === playerId && p.isAlive);
  if (!player) return { ok: false, error: 'ผู้เล่นไม่สามารถตอบสนองได้' };

  if (room.phase === GAME_PHASES.AWAITING_BLOCK_ONLY) {
    if (playerId !== pending.targetId) {
      return { ok: false, error: 'รอเฉพาะเป้าหมายตัดสินใจบล็อกหรือปล่อยผ่าน' };
    }
    addLog(room, `⏩ ${player.name} เลือกไม่บล็อก`, 'info');
    executePendingAction(room);
    return { ok: true };
  }

  if (!pending.passedPlayerIds.includes(playerId)) {
    pending.passedPlayerIds.push(playerId);
  }

  const otherAlivePlayers = room.players.filter((p) => p.isAlive && p.id !== pending.actorId);
  const allPassed = otherAlivePlayers.every((p) => pending.passedPlayerIds.includes(p.id));

  if (allPassed) {
    executePendingAction(room);
  }

  return { ok: true };
}

export function challengeAction(room, challengerId) {
  if (room.phase !== GAME_PHASES.AWAITING_ACTION_RESPONSE) {
    return { ok: false, error: 'ไม่สามารถท้าพิสูจน์ในขั้นตอนนี้ได้' };
  }

  const pending = room.pendingAction;
  if (!pending || !pending.claimedRole) {
    return { ok: false, error: 'แอคชันนี้ไม่สามารถท้าพิสูจน์ได้' };
  }

  if (challengerId === pending.actorId) {
    return { ok: false, error: 'ไม่สามารถท้าพิสูจน์ตัวเองได้' };
  }

  const challenger = room.players.find((p) => p.id === challengerId && p.isAlive);
  const actor = room.players.find((p) => p.id === pending.actorId);
  if (!challenger || !actor) {
    return { ok: false, error: 'ไม่พบผู้เล่น' };
  }

  const roleName = ROLE_INFO[pending.claimedRole].nameTh;
  const hasRole = actor.cards.some((c) => !c.revealed && c.role === pending.claimedRole);

  if (hasRole) {
    swapRevealedProofCard(room, actor, pending.claimedRole);
    pending.challengeResolved = true;
    addLog(
      room,
      `⚡ ${challenger.name} ขอท้าพิสูจน์! แต่ ${actor.name} มีการ์ด [${roleName}] จริง! (${actor.name} สับการ์ดเข้ากองและจั่วใบใหม่)`,
      'warning'
    );

    const nextStep =
      pending.blockScope === 'TARGET' && pending.targetId && challenger.id !== pending.targetId
        ? 'AWAITING_BLOCK_ONLY'
        : 'RESOLVE_ACTION';

    requestInfluenceLoss(room, challenger.id, `ท้าพิสูจน์ [${roleName}] ของ ${actor.name} พลาด`, nextStep);
  } else {
    let refundText = '';
    const cost = ACTION_INFO[pending.type]?.cost || 0;
    if (cost > 0) {
      actor.coins += cost;
      refundText = ` (คืนเงิน ${cost} เหรียญ)`;
    }
    addLog(
      room,
      `🔥 ${challenger.name} จับโกหกสำเร็จ! ${actor.name} ไม่มีการ์ด [${roleName}]! การกระทำถูกยกเลิก${refundText}`,
      'danger'
    );
    requestInfluenceLoss(room, actor.id, `ถูก ${challenger.name} จับได้ว่าบลัฟเป็น [${roleName}]`, 'NEXT_TURN');
  }

  return { ok: true };
}

export function blockAction(room, blockerId, claimedBlockRole) {
  if (room.phase !== GAME_PHASES.AWAITING_ACTION_RESPONSE && room.phase !== GAME_PHASES.AWAITING_BLOCK_ONLY) {
    return { ok: false, error: 'ไม่สามารถบล็อกในเฟสนี้ได้' };
  }

  const pending = room.pendingAction;
  if (!pending || !pending.blockableBy || pending.blockableBy.length === 0) {
    return { ok: false, error: 'แอคชันนี้ไม่สามารถบล็อกได้' };
  }

  if (!pending.blockableBy.includes(claimedBlockRole)) {
    return { ok: false, error: 'การ์ดบทบาทที่เลือกไม่สามารถใช้บล็อกแอคชันนี้ได้ในรอบนี้' };
  }

  const blocker = room.players.find((p) => p.id === blockerId && p.isAlive);
  const actor = room.players.find((p) => p.id === pending.actorId);
  if (!blocker || !actor || blocker.id === actor.id) {
    return { ok: false, error: 'ผู้เล่นไม่สามารถบล็อกได้' };
  }

  if (pending.blockScope === 'TARGET' && blocker.id !== pending.targetId) {
    return { ok: false, error: 'เฉพาะผู้เล่นที่เป็นเป้าหมายเท่านั้นที่บล็อกแอคชันนี้ได้' };
  }

  const roleName = ROLE_INFO[claimedBlockRole].nameTh;
  pending.block = {
    blockerId: blocker.id,
    claimedRole: claimedBlockRole,
    passedPlayerIds: [],
  };

  room.phase = GAME_PHASES.AWAITING_BLOCK_RESPONSE;
  addLog(room, `🛡️ ${blocker.name} อ้างตัวเป็น [${roleName}] เพื่อบล็อก "${ACTION_INFO[pending.type].nameTh}" ของ ${actor.name}!`, 'warning');

  return { ok: true };
}

export function passOnBlock(room, playerId) {
  if (room.phase !== GAME_PHASES.AWAITING_BLOCK_RESPONSE) {
    return { ok: false, error: 'ไม่อยู่ในช่วงตอบสนองต่อการบล็อก' };
  }

  const pending = room.pendingAction;
  const block = pending?.block;
  if (!pending || !block) return { ok: false, error: 'ไม่มีการบล็อกที่รออยู่' };
  if (playerId === block.blockerId) return { ok: false, error: 'ผู้บล็อกไม่ต้องกดผ่าน' };

  const player = room.players.find((p) => p.id === playerId && p.isAlive);
  if (!player) return { ok: false, error: 'ผู้เล่นไม่สามารถตอบสนองได้' };

  if (!block.passedPlayerIds.includes(playerId)) {
    block.passedPlayerIds.push(playerId);
  }

  const otherAlivePlayers = room.players.filter((p) => p.isAlive && p.id !== block.blockerId);
  const allPassed = otherAlivePlayers.every((p) => block.passedPlayerIds.includes(p.id));

  if (allPassed) {
    const blocker = room.players.find((p) => p.id === block.blockerId);
    const actor = room.players.find((p) => p.id === pending.actorId);
    addLog(room, `🛡️ การบล็อกของ ${blocker?.name} สำเร็จ! การกระทำของ ${actor?.name} ถูกยกเลิก`, 'info');
    advanceTurn(room);
  }

  return { ok: true };
}

export function challengeBlock(room, challengerId) {
  if (room.phase !== GAME_PHASES.AWAITING_BLOCK_RESPONSE) {
    return { ok: false, error: 'ไม่อยู่ในช่วงท้าพิสูจน์การบล็อก' };
  }

  const pending = room.pendingAction;
  const block = pending?.block;
  if (!pending || !block) return { ok: false, error: 'ไม่มีการบล็อกที่รออยู่' };

  if (challengerId === block.blockerId) {
    return { ok: false, error: 'ไม่สามารถท้าพิสูจน์การบล็อกของตัวเองได้' };
  }

  const challenger = room.players.find((p) => p.id === challengerId && p.isAlive);
  const blocker = room.players.find((p) => p.id === block.blockerId);
  if (!challenger || !blocker) return { ok: false, error: 'ไม่พบผู้เล่น' };

  const roleName = ROLE_INFO[block.claimedRole].nameTh;
  const hasRole = blocker.cards.some((c) => !c.revealed && c.role === block.claimedRole);

  if (hasRole) {
    swapRevealedProofCard(room, blocker, block.claimedRole);
    addLog(
      room,
      `⚡ ${challenger.name} ท้าพิสูจน์การบล็อก! แต่ ${blocker.name} มีการ์ด [${roleName}] จริง! การบล็อกสำเร็จ!`,
      'warning'
    );
    requestInfluenceLoss(room, challenger.id, `ท้าพิสูจน์การบล็อก [${roleName}] ของ ${blocker.name} พลาด`, 'NEXT_TURN');
  } else {
    addLog(
      room,
      `🔥 ${challenger.name} จับโกหกการบล็อกสำเร็จ! ${blocker.name} ไม่มีการ์ด [${roleName}]! การกระทำเดิมจึงมีผลต่อทันที`,
      'danger'
    );
    requestInfluenceLoss(room, blocker.id, `บลัฟการบล็อกเป็น [${roleName}] แล้วถูก ${challenger.name} จับได้`, 'RESOLVE_ACTION');
  }

  return { ok: true };
}

export function chooseInfluenceToLose(room, playerId, cardIndex) {
  if (room.phase !== GAME_PHASES.AWAITING_INFLUENCE_LOSS || !room.influenceLossState) {
    return { ok: false, error: 'ไม่ได้อยู่ในช่วงเลือกเสียการ์ด' };
  }

  if (room.influenceLossState.playerId !== playerId) {
    return { ok: false, error: 'ไม่ใช่คิวของคุณในการเลือกการ์ดที่จะทิ้ง' };
  }

  const player = room.players.find((p) => p.id === playerId);
  if (!player) return { ok: false, error: 'ไม่พบผู้เล่น' };

  const card = player.cards[cardIndex];
  if (!card || card.revealed) {
    return { ok: false, error: 'กรุณาเลือกการ์ดที่ยังไม่ถูกเปิด' };
  }

  card.revealed = true;
  const roleName = ROLE_INFO[card.role].nameTh;
  addLog(room, `💔 ${player.name} เปิดทิ้งการ์ด [${roleName}] (${room.influenceLossState.reason})`, 'danger');

  const stillAlive = player.cards.some((c) => !c.revealed);
  if (!stillAlive) {
    player.isAlive = false;
    player.coins = 0;
    addLog(room, `☠️ ${player.name} สูญเสียอิทธิพลทั้งหมดและออกจากกระดาน!`, 'danger');
  }

  const nextStep = room.influenceLossState.nextStep;
  room.influenceLossState = null;
  proceedAfterInfluenceLoss(room, nextStep);

  return { ok: true };
}

export function submitExchangeCards(room, playerId, selectedIndices) {
  if (room.phase !== GAME_PHASES.AWAITING_EXCHANGE || !room.exchangeState) {
    return { ok: false, error: 'ไม่ได้อยู่ในช่วงเลือกเปลี่ยนการ์ด' };
  }

  const ex = room.exchangeState;
  if (ex.actorId !== playerId) {
    return { ok: false, error: 'คุณไม่ใช่ผู้ที่กำลังเปลี่ยนการ์ด' };
  }

  if (
    !Array.isArray(selectedIndices) ||
    selectedIndices.length !== ex.keepCount ||
    new Set(selectedIndices).size !== ex.keepCount ||
    selectedIndices.some((idx) => idx < 0 || idx >= ex.options.length)
  ) {
    return { ok: false, error: `กรุณาเลือกการ์ดที่จะเก็บไว้ให้ครบ ${ex.keepCount} ใบ` };
  }

  const actor = room.players.find((p) => p.id === playerId);
  if (!actor) return { ok: false, error: 'ไม่พบผู้เล่น' };

  const keptRoles = selectedIndices.map((idx) => ex.options[idx]);
  const returnedRoles = ex.options.filter((_, idx) => !selectedIndices.includes(idx));

  let keptIdx = 0;
  actor.cards = actor.cards.map((card, idx) => {
    if (card.revealed) return card;
    const newRole = keptRoles[keptIdx++];
    return {
      id: `${actor.id}-ex-${idx}-${Date.now()}`,
      role: newRole,
      revealed: false,
    };
  });

  room.deck.push(...returnedRoles);
  room.deck = shuffle(room.deck);

  addLog(room, `🔄 ${actor.name} เลือกการ์ดใหม่และสับการ์ดที่เหลือคืนเข้ากองกลางเรียบร้อย`, 'success');
  advanceTurn(room);

  return { ok: true };
}

export function getSanitizedStateForPlayer(room, viewerId) {
  const isGameOver = room.phase === GAME_PHASES.GAME_OVER;

  return {
    code: room.code,
    phase: room.phase,
    roleCounts: room.roleCounts || DEFAULT_ROLE_COUNTS,
    turnIndex: room.turnIndex,
    turnNumber: room.turnNumber,
    deckCount: room.deck.length,
    winner: room.winner,
    pendingAction: room.pendingAction,
    influenceLossState: room.influenceLossState,
    exchangeState:
      room.exchangeState && room.exchangeState.actorId === viewerId
        ? room.exchangeState
        : room.exchangeState
          ? { actorId: room.exchangeState.actorId, keepCount: room.exchangeState.keepCount, options: null }
          : null,
    players: room.players.map((p) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      isHost: p.isHost,
      isBot: p.isBot,
      connected: p.connected,
      coins: p.coins,
      isAlive: p.isAlive,
      cards: p.cards.map((c) => ({
        id: c.id,
        revealed: c.revealed,
        role: c.revealed || isGameOver || p.id === viewerId ? c.role : 'HIDDEN',
      })),
    })),
    logs: room.logs,
    chat: room.chat,
  };
}

/**
 * Smart AI Bot Decision Maker
 * Evaluates current phase and executes valid bot actions when needed
 */
export function runBotStepIfNeeded(room) {
  if (room.phase === GAME_PHASES.LOBBY || room.phase === GAME_PHASES.GAME_OVER) {
    return false;
  }

  const isRoleActive = (role) => (room.roleCounts?.[role] ?? DEFAULT_ROLE_COUNTS[role] ?? 0) > 0;

  // 1. AWAITING_INFLUENCE_LOSS for a bot
  if (room.phase === GAME_PHASES.AWAITING_INFLUENCE_LOSS && room.influenceLossState) {
    const targetBot = room.players.find((p) => p.id === room.influenceLossState.playerId && p.isBot);
    if (targetBot) {
      const unrevealedIdx = targetBot.cards.findIndex((c) => !c.revealed);
      if (unrevealedIdx !== -1) {
        chooseInfluenceToLose(room, targetBot.id, unrevealedIdx);
        return true;
      }
    }
    return false;
  }

  // 2. AWAITING_EXCHANGE for a bot
  if (room.phase === GAME_PHASES.AWAITING_EXCHANGE && room.exchangeState) {
    const actorBot = room.players.find((p) => p.id === room.exchangeState.actorId && p.isBot);
    if (actorBot) {
      const priority = [
        ROLES.DUKE,
        ROLES.JUDGE,
        ROLES.ALCHEMIST,
        ROLES.CAPTAIN,
        ROLES.CONTESSA,
        ROLES.ASSASSIN,
        ROLES.INQUISITOR,
        ROLES.AMBASSADOR,
      ];
      const indexed = room.exchangeState.options.map((role, idx) => ({
        idx,
        score: priority.indexOf(role),
      }));
      indexed.sort((a, b) => a.score - b.score);
      const keepIndices = indexed.slice(0, room.exchangeState.keepCount).map((item) => item.idx);
      submitExchangeCards(room, actorBot.id, keepIndices);
      return true;
    }
    return false;
  }

  // 3. TURN_START for a bot
  if (room.phase === GAME_PHASES.TURN_START) {
    const active = getCurrentTurnPlayer(room);
    if (!active || !active.isBot) return false;

    const aliveOpponents = room.players.filter((p) => p.isAlive && p.id !== active.id);
    if (aliveOpponents.length === 0) return false;
    const richestTarget = [...aliveOpponents].sort((a, b) => b.coins - a.coins)[0];
    const myRoles = active.cards.filter((c) => !c.revealed).map((c) => c.role);

    if (active.coins >= 10 || (active.coins >= 7 && Math.random() < 0.85)) {
      declareAction(room, active.id, ACTIONS.COUP, richestTarget.id);
      return true;
    }

    if (isRoleActive(ROLES.JUDGE) && myRoles.includes(ROLES.JUDGE) && active.coins >= 4 && Math.random() < 0.75) {
      declareAction(room, active.id, ACTIONS.CONDEMN, richestTarget.id);
      return true;
    }

    if (isRoleActive(ROLES.ASSASSIN) && myRoles.includes(ROLES.ASSASSIN) && active.coins >= 3 && Math.random() < 0.75) {
      declareAction(room, active.id, ACTIONS.ASSASSINATE, richestTarget.id);
      return true;
    }

    if (isRoleActive(ROLES.DUKE) && (myRoles.includes(ROLES.DUKE) || Math.random() < 0.35)) {
      declareAction(room, active.id, ACTIONS.TAX);
      return true;
    }

    if (isRoleActive(ROLES.ALCHEMIST) && (myRoles.includes(ROLES.ALCHEMIST) || Math.random() < 0.25) && richestTarget.coins >= 1) {
      declareAction(room, active.id, ACTIONS.BLACKMAIL, richestTarget.id);
      return true;
    }

    if (isRoleActive(ROLES.CAPTAIN) && (myRoles.includes(ROLES.CAPTAIN) || Math.random() < 0.25) && richestTarget.coins >= 2) {
      declareAction(room, active.id, ACTIONS.STEAL, richestTarget.id);
      return true;
    }

    if (isRoleActive(ROLES.INQUISITOR) && myRoles.includes(ROLES.INQUISITOR) && Math.random() < 0.5) {
      declareAction(room, active.id, ACTIONS.INTERROGATE, richestTarget.id);
      return true;
    }

    if (isRoleActive(ROLES.AMBASSADOR) && myRoles.includes(ROLES.AMBASSADOR) && Math.random() < 0.4) {
      declareAction(room, active.id, ACTIONS.EXCHANGE);
      return true;
    }

    if (Math.random() < 0.6) {
      declareAction(room, active.id, ACTIONS.FOREIGN_AID);
    } else {
      declareAction(room, active.id, ACTIONS.INCOME);
    }
    return true;
  }

  // 4. AWAITING_ACTION_RESPONSE or AWAITING_BLOCK_ONLY for bots
  if (room.phase === GAME_PHASES.AWAITING_ACTION_RESPONSE || room.phase === GAME_PHASES.AWAITING_BLOCK_ONLY) {
    const pending = room.pendingAction;
    if (!pending) return false;

    const botsToRespond = room.players.filter(
      (p) =>
        p.isAlive &&
        p.isBot &&
        p.id !== pending.actorId &&
        !pending.passedPlayerIds.includes(p.id) &&
        (room.phase !== GAME_PHASES.AWAITING_BLOCK_ONLY || p.id === pending.targetId)
    );

    if (botsToRespond.length === 0) return false;
    const bot = botsToRespond[0];
    const botRoles = bot.cards.filter((c) => !c.revealed).map((c) => c.role);

    // Check if bot can block
    if (pending.blockableBy?.length > 0 && (pending.blockScope === 'ANY' || pending.targetId === bot.id)) {
      const matchingHold = pending.blockableBy.find((r) => botRoles.includes(r));
      if (matchingHold) {
        blockAction(room, bot.id, matchingHold);
        return true;
      }
      // Desperate bluff if lethal action (Assassinate or Condemn) and down to 1 card!
      if ((pending.type === ACTIONS.ASSASSINATE || pending.type === ACTIONS.CONDEMN) && botRoles.length === 1) {
        blockAction(room, bot.id, pending.blockableBy[0]);
        return true;
      }
    }

    // Challenge logic if action claims a role
    if (room.phase === GAME_PHASES.AWAITING_ACTION_RESPONSE && pending.claimedRole) {
      const totalCopiesInDeck = room.roleCounts?.[pending.claimedRole] ?? 3;
      const botCopies = botRoles.filter((r) => r === pending.claimedRole).length;
      const revealedCopies = room.players
        .flatMap((p) => p.cards)
        .filter((c) => c.revealed && c.role === pending.claimedRole).length;

      if (botCopies + revealedCopies >= totalCopiesInDeck) {
        challengeAction(room, bot.id);
        return true;
      }
      if (botCopies + revealedCopies === totalCopiesInDeck - 1 && Math.random() < 0.35) {
        challengeAction(room, bot.id);
        return true;
      }
      if (Math.random() < 0.08) {
        challengeAction(room, bot.id);
        return true;
      }
    }

    passOnAction(room, bot.id);
    return true;
  }

  // 5. AWAITING_BLOCK_RESPONSE for bots
  if (room.phase === GAME_PHASES.AWAITING_BLOCK_RESPONSE) {
    const pending = room.pendingAction;
    const block = pending?.block;
    if (!pending || !block) return false;

    const botsToRespond = room.players.filter(
      (p) => p.isAlive && p.isBot && p.id !== block.blockerId && !block.passedPlayerIds.includes(p.id)
    );
    if (botsToRespond.length === 0) return false;

    const bot = botsToRespond[0];
    const botRoles = bot.cards.filter((c) => !c.revealed).map((c) => c.role);
    const totalCopiesInDeck = room.roleCounts?.[block.claimedRole] ?? 3;
    const botCopies = botRoles.filter((r) => r === block.claimedRole).length;
    const revealedCopies = room.players
      .flatMap((p) => p.cards)
      .filter((c) => c.revealed && c.role === block.claimedRole).length;

    if (botCopies + revealedCopies >= totalCopiesInDeck || (botCopies + revealedCopies === totalCopiesInDeck - 1 && Math.random() < 0.4)) {
      challengeBlock(room, bot.id);
      return true;
    }

    passOnBlock(room, bot.id);
    return true;
  }

  return false;
}
