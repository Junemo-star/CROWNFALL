import assert from 'node:assert/strict';
import {
  createRoom,
  updateRoleCounts,
  addPlayerToRoom,
  addBotToRoom,
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
import { ROLES, ACTIONS, GAME_PHASES } from '../src/constants/gameData.js';

function setupTwoPlayerGame() {
  const room = createRoom('TEST01', { id: 'p1', socketId: 's1', name: 'Alice' });
  addPlayerToRoom(room, { id: 'p2', socketId: 's2', name: 'Bob' });
  startGame(room, 'p1');
  room.turnIndex = 0; // Force Alice first
  room.players[0].cards = [
    { id: 'p1-0', role: ROLES.DUKE, revealed: false },
    { id: 'p1-1', role: ROLES.ASSASSIN, revealed: false },
  ];
  room.players[1].cards = [
    { id: 'p2-0', role: ROLES.CAPTAIN, revealed: false },
    { id: 'p2-1', role: ROLES.CONTESSA, revealed: false },
  ];
  return room;
}

// Test 1: Income & Mandatory Coup at 10+ coins
{
  const room = setupTwoPlayerGame();
  const res = declareAction(room, 'p1', ACTIONS.INCOME);
  assert.equal(res.ok, true);
  assert.equal(room.players[0].coins, 3);
  assert.equal(room.turnIndex, 1);

  room.players[1].coins = 10;
  const failTax = declareAction(room, 'p2', ACTIONS.TAX);
  assert.equal(failTax.ok, false);

  const okCoup = declareAction(room, 'p2', ACTIONS.COUP, 'p1');
  assert.equal(okCoup.ok, true);
  assert.equal(room.players[1].coins, 3);
  assert.equal(room.phase, GAME_PHASES.AWAITING_INFLUENCE_LOSS);
  chooseInfluenceToLose(room, 'p1', 0);
  assert.equal(room.players[0].cards[0].revealed, true);
  assert.equal(room.phase, GAME_PHASES.TURN_START);
}

// Test 2: Tax challenged when actor HAS Duke -> challenger loses influence & actor gets +3 coins
{
  const room = setupTwoPlayerGame();
  declareAction(room, 'p1', ACTIONS.TAX);
  assert.equal(room.phase, GAME_PHASES.AWAITING_ACTION_RESPONSE);

  challengeAction(room, 'p2');
  assert.equal(room.phase, GAME_PHASES.AWAITING_INFLUENCE_LOSS);
  assert.equal(room.influenceLossState.playerId, 'p2');

  chooseInfluenceToLose(room, 'p2', 0);
  assert.equal(room.players[0].coins, 5); // 2 + 3 from Tax
  assert.equal(room.phase, GAME_PHASES.TURN_START);
}

// Test 3: Assassinate blocked by bluffing Contessa -> challenged -> double influence loss (game over)
{
  const room = setupTwoPlayerGame();
  room.players[0].coins = 3;
  // Give p2 two Captains (NO Contessa)
  room.players[1].cards = [
    { id: 'p2-0', role: ROLES.CAPTAIN, revealed: false },
    { id: 'p2-1', role: ROLES.CAPTAIN, revealed: false },
  ];

  declareAction(room, 'p1', ACTIONS.ASSASSINATE, 'p2');
  assert.equal(room.players[0].coins, 0);
  // p2 bluffs Contessa
  blockAction(room, 'p2', ROLES.CONTESSA);
  assert.equal(room.phase, GAME_PHASES.AWAITING_BLOCK_RESPONSE);

  // p1 challenges p2's Contessa block
  challengeBlock(room, 'p1');
  assert.equal(room.phase, GAME_PHASES.AWAITING_INFLUENCE_LOSS);
  assert.equal(room.influenceLossState.playerId, 'p2');

  // p2 loses first card from bluffing block
  chooseInfluenceToLose(room, 'p2', 0);
  // Now assassination resolves -> p2 must lose second card!
  assert.equal(room.phase, GAME_PHASES.AWAITING_INFLUENCE_LOSS);
  chooseInfluenceToLose(room, 'p2', 1);

  assert.equal(room.phase, GAME_PHASES.GAME_OVER);
  assert.equal(room.winner.id, 'p1');
}

// Test 4: Ambassador Exchange & Sanitized State privacy
{
  const room = setupTwoPlayerGame();
  declareAction(room, 'p1', ACTIONS.EXCHANGE);
  passOnAction(room, 'p2');
  assert.equal(room.phase, GAME_PHASES.AWAITING_EXCHANGE);

  const p2View = getSanitizedStateForPlayer(room, 'p2');
  assert.equal(p2View.players[0].cards[0].role, 'HIDDEN');
  assert.equal(p2View.exchangeState.options, null);

  const p1View = getSanitizedStateForPlayer(room, 'p1');
  assert.equal(p1View.exchangeState.options.length, 4);

  submitExchangeCards(room, 'p1', [2, 3]);
  assert.equal(room.phase, GAME_PHASES.TURN_START);
}

// Test 5: 3-player game where Player 3 challenges Player 1's Assassin on Player 2, fails, and Player 2 still blocks with Contessa!
{
  const room = createRoom('TEST03', { id: 'p1', socketId: 's1', name: 'Alice' });
  addPlayerToRoom(room, { id: 'p2', socketId: 's2', name: 'Bob' });
  addPlayerToRoom(room, { id: 'p3', socketId: 's3', name: 'Charlie' });
  startGame(room, 'p1');
  room.turnIndex = 0;
  room.players[0].coins = 3;
  room.players[0].cards = [
    { id: 'p1-0', role: ROLES.ASSASSIN, revealed: false },
    { id: 'p1-1', role: ROLES.DUKE, revealed: false },
  ];
  room.players[1].cards = [
    { id: 'p2-0', role: ROLES.CONTESSA, revealed: false },
    { id: 'p2-1', role: ROLES.CAPTAIN, revealed: false },
  ];

  declareAction(room, 'p1', ACTIONS.ASSASSINATE, 'p2');
  // Charlie (p3) challenges Alice's Assassin and is wrong!
  challengeAction(room, 'p3');
  assert.equal(room.phase, GAME_PHASES.AWAITING_INFLUENCE_LOSS);
  assert.equal(room.influenceLossState.playerId, 'p3');
  chooseInfluenceToLose(room, 'p3', 0);

  // Now Bob (p2) should still get a chance to block with Contessa!
  assert.equal(room.phase, GAME_PHASES.AWAITING_BLOCK_ONLY);
  blockAction(room, 'p2', ROLES.CONTESSA);
  assert.equal(room.phase, GAME_PHASES.AWAITING_BLOCK_RESPONSE);
  passOnBlock(room, 'p1');
  passOnBlock(room, 'p3');
  assert.equal(room.phase, GAME_PHASES.TURN_START);
}

// Test 6: AI Bot full game simulation across 50 random 6-player games until GAME_OVER
for (let g = 0; g < 50; g++) {
  const room = createRoom(`BOT${g}`, { id: 'p1', socketId: 's1', name: 'HostBot' });
  room.players[0].isBot = true;
  for (let b = 0; b < 5; b++) addBotToRoom(room);
  startGame(room, 'p1');

  let steps = 0;
  while (room.phase !== GAME_PHASES.GAME_OVER && steps < 1000) {
    const acted = runBotStepIfNeeded(room);
    assert.equal(acted, true, `Game ${g} stuck at phase ${room.phase} on step ${steps}`);
    steps++;
  }
  assert.equal(room.phase, GAME_PHASES.GAME_OVER);
  assert.ok(room.winner);
}

// Test 7: Custom Role Counts & New Roles (Inquisitor, Alchemist, Judge)
{
  const room = createRoom('CUSTOM', { id: 'p1', socketId: 's1', name: 'Alice' });
  addPlayerToRoom(room, { id: 'p2', socketId: 's2', name: 'Bob' });

  const customCounts = {
    [ROLES.DUKE]: 0,
    [ROLES.ASSASSIN]: 0,
    [ROLES.CAPTAIN]: 0,
    [ROLES.AMBASSADOR]: 0,
    [ROLES.CONTESSA]: 0,
    [ROLES.INQUISITOR]: 3,
    [ROLES.ALCHEMIST]: 3,
    [ROLES.JUDGE]: 3,
  };
  assert.equal(updateRoleCounts(room, 'p1', customCounts).ok, true);
  assert.equal(startGame(room, 'p1').ok, true);
  room.turnIndex = 0;

  // Disabled role (Duke Tax) should be rejected
  assert.equal(declareAction(room, 'p1', ACTIONS.TAX).ok, false);

  // Alchemist Blackmail: steals 1 coin from p2 and gets +1 from treasury
  assert.equal(declareAction(room, 'p1', ACTIONS.BLACKMAIL, 'p2').ok, true);
  passOnAction(room, 'p2');
  assert.equal(room.players[0].coins, 4); // 2 + 2
  assert.equal(room.players[1].coins, 1); // 2 - 1

  // Inquisitor Interrogate: p2 gets +1 coin and swaps one of p1's cards
  assert.equal(declareAction(room, 'p2', ACTIONS.INTERROGATE, 'p1').ok, true);
  passOnAction(room, 'p1');
  assert.equal(room.players[1].coins, 2);

  // Judge Condemn: p1 pays 4 coins, burns 1 coin of p2, and forces p2 to lose 1 card
  assert.equal(declareAction(room, 'p1', ACTIONS.CONDEMN, 'p2').ok, true);
  passOnAction(room, 'p2');
  assert.equal(room.phase, GAME_PHASES.AWAITING_INFLUENCE_LOSS);
  assert.equal(room.players[1].coins, 1); // 2 - 1 burned
  chooseInfluenceToLose(room, 'p2', 0);
  assert.equal(room.phase, GAME_PHASES.TURN_START);
}

console.log('✅ All Coup Game Engine tests passed!');
