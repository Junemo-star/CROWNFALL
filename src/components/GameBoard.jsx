import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Crown,
  Coins,
  Shield,
  Flame,
  CheckCircle2,
  BookOpen,
  Volume2,
  VolumeX,
  LogOut,
  RotateCcw,
  Send,
  Layers,
  Sparkles,
  Crosshair,
  AlertOctagon,
  Skull,
  Bot,
  MessageSquare,
} from 'lucide-react';
import {
  ROLES,
  ROLE_INFO,
  ACTIONS,
  ACTION_INFO,
  GAME_PHASES,
  QUICK_REACTIONS,
} from '../constants/gameData.js';
import RoleCard from './RoleCard.jsx';
import { sound } from '../utils/sound.js';

export default function GameBoard({
  roomState,
  playerId,
  onDeclareAction,
  onPassAction,
  onChallengeAction,
  onBlockAction,
  onPassBlock,
  onChallengeBlock,
  onChooseInfluenceLoss,
  onSubmitExchange,
  onStartRematch,
  onBackToLobby,
  onLeaveRoom,
  onSendChat,
  floatingReactions,
  errorMsg,
}) {
  const [selectedAction, setSelectedAction] = useState(null);
  const [exchangeSelected, setExchangeSelected] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [activeTab, setActiveTab] = useState('log'); // 'log' | 'chat'
  const [muted, setMuted] = useState(sound.muted);
  const logEndRef = useRef(null);
  const prevPhaseRef = useRef(roomState.phase);
  const prevTurnRef = useRef(roomState.turnNumber);

  const me = roomState.players.find((p) => p.id === playerId);
  const isHost = Boolean(me?.isHost);
  const isMyAlive = Boolean(me?.isAlive);
  const currentTurnPlayer = roomState.players[roomState.turnIndex];
  const isMyTurn = currentTurnPlayer?.id === playerId && roomState.phase === GAME_PHASES.TURN_START;
  const opponents = roomState.players.filter((p) => p.id !== playerId);

  // Reset local selection when phase or turn changes
  useEffect(() => {
    setSelectedAction(null);
    setExchangeSelected([]);
  }, [roomState.phase, roomState.turnNumber]);

  // Sound & Confetti triggers
  useEffect(() => {
    if (roomState.phase === GAME_PHASES.GAME_OVER && prevPhaseRef.current !== GAME_PHASES.GAME_OVER) {
      sound.playVictory();
      confetti({
        particleCount: 110,
        spread: 80,
        origin: { y: 0.6 },
      });
    } else if (roomState.phase === GAME_PHASES.AWAITING_INFLUENCE_LOSS && prevPhaseRef.current !== GAME_PHASES.AWAITING_INFLUENCE_LOSS) {
      sound.playLoseCard();
    } else if (roomState.phase === GAME_PHASES.AWAITING_BLOCK_RESPONSE && prevPhaseRef.current !== GAME_PHASES.AWAITING_BLOCK_RESPONSE) {
      sound.playBlock();
    } else if (roomState.phase === GAME_PHASES.AWAITING_ACTION_RESPONSE && prevPhaseRef.current !== GAME_PHASES.AWAITING_ACTION_RESPONSE) {
      sound.playAction();
    } else if (isMyTurn && (prevTurnRef.current !== roomState.turnNumber || prevPhaseRef.current !== GAME_PHASES.TURN_START)) {
      sound.playYourTurn();
    }

    prevPhaseRef.current = roomState.phase;
    prevTurnRef.current = roomState.turnNumber;
  }, [roomState.phase, roomState.turnNumber, isMyTurn]);

  // Auto-scroll logs
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [roomState.logs.length, roomState.chat.length, activeTab]);

  const toggleMute = () => {
    sound.muted = !muted;
    setMuted(sound.muted);
  };

  const handleActionClick = (actionType) => {
    const info = ACTION_INFO[actionType];
    if (!info) return;

    if (info.requiresTarget) {
      const aliveOpponents = opponents.filter((p) => p.isAlive);
      if (aliveOpponents.length === 1) {
        // Auto-target if only 1 opponent is alive!
        onDeclareAction(actionType, aliveOpponents[0].id);
        setSelectedAction(null);
      } else {
        setSelectedAction(actionType);
      }
    } else {
      onDeclareAction(actionType, null);
      setSelectedAction(null);
    }
  };

  const handleToggleExchangeIdx = (idx, keepCount) => {
    setExchangeSelected((prev) => {
      if (prev.includes(idx)) {
        return prev.filter((i) => i !== idx);
      }
      if (prev.length >= keepCount) {
        return [...prev.slice(1), idx];
      }
      return [...prev, idx];
    });
  };

  const handleChatSubmit = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    onSendChat(chatInput.trim(), null);
    setChatInput('');
  };

  const pending = roomState.pendingAction;
  const pendingActor = pending ? roomState.players.find((p) => p.id === pending.actorId) : null;
  const pendingTarget = pending?.targetId ? roomState.players.find((p) => p.id === pending.targetId) : null;
  const pendingBlocker = pending?.block ? roomState.players.find((p) => p.id === pending.block.blockerId) : null;

  const mustLoseCard =
    roomState.phase === GAME_PHASES.AWAITING_INFLUENCE_LOSS &&
    roomState.influenceLossState?.playerId === playerId;

  return (
    <div className="min-h-screen flex flex-col justify-between p-2 sm:p-4 max-w-7xl mx-auto gap-3">
      {/* 1. TOP BAR */}
      <header className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 shadow-lg">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 font-serif-title font-bold text-amber-400 text-lg tracking-wider">
            <Crown className="w-5 h-5" />
            <span>CROWNFALL</span>
          </div>
          <span className="px-2.5 py-0.5 rounded-lg bg-slate-950 border border-slate-700 font-mono text-xs text-slate-300">
            ห้อง: <strong className="text-amber-300">{roomState.code}</strong>
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-indigo-950/70 border border-indigo-500/30 text-xs text-indigo-200">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            กองกลาง: <strong>{roomState.deckCount}</strong> ใบ
          </span>
          <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200">
            เทิร์นที่ <strong>{roomState.turnNumber}</strong>
          </span>
          <div className="hidden md:flex flex-wrap items-center gap-1 ml-1">
            {Object.entries(roomState.roleCounts || {})
              .filter(([, count]) => count > 0)
              .map(([role, count]) => (
                <span
                  key={role}
                  className={`px-2 py-0.5 rounded-md border text-[10px] font-bold ${ROLE_INFO[role]?.badgeBg || 'bg-slate-800 text-slate-200'}`}
                >
                  {ROLE_INFO[role]?.nameTh} ×{count}
                </span>
              ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleMute}
            title={muted ? 'เปิดเสียง' : 'ปิดเสียง'}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer"
          >
            {muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          {isHost && (
            <button
              type="button"
              onClick={onBackToLobby}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" /> ตั้งค่าห้อง
            </button>
          )}

          <button
            type="button"
            onClick={onLeaveRoom}
            className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30 text-xs font-medium flex items-center gap-1 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" /> ออก
          </button>
        </div>
      </header>

      {/* Error Toast */}
      {errorMsg && (
        <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/50 text-red-200 text-xs font-semibold text-center animate-bounce">
          ⚠️ {errorMsg}
        </div>
      )}

      {/* 2. OPPONENTS TABLE */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
        {opponents.map((opp) => {
          const isOppTurn = currentTurnPlayer?.id === opp.id && roomState.phase !== GAME_PHASES.GAME_OVER;
          const isTargetable = Boolean(selectedAction && opp.isAlive);
          const isPendingTarget = pending?.targetId === opp.id;
          const hasPassedAction = pending?.passedPlayerIds?.includes(opp.id);
          const hasPassedBlock = pending?.block?.passedPlayerIds?.includes(opp.id);
          const reaction = floatingReactions[opp.id];

          return (
            <div
              key={opp.id}
              onClick={() => {
                if (isTargetable) {
                  onDeclareAction(selectedAction, opp.id);
                  setSelectedAction(null);
                }
              }}
              className={`relative rounded-2xl p-3 transition-all border backdrop-blur-md flex flex-col justify-between ${
                !opp.isAlive
                  ? 'bg-slate-950/50 border-slate-800/60 opacity-60'
                  : isTargetable
                    ? 'bg-rose-950/40 border-rose-400 ring-2 ring-rose-500/50 hover:scale-102 cursor-pointer'
                    : isOppTurn
                      ? 'bg-amber-950/30 border-amber-400 animate-pulse-gold'
                      : isPendingTarget
                        ? 'bg-rose-950/30 border-rose-500/70'
                        : 'bg-slate-900/80 border-slate-800'
              }`}
            >
              {/* Floating Reaction Bubble */}
              {reaction && (
                <div
                  key={reaction.id}
                  className="absolute -top-9 left-1/2 -translate-x-1/2 z-30 whitespace-nowrap px-3 py-1 rounded-full bg-amber-400 text-slate-950 font-bold text-xs shadow-xl animate-float-reaction"
                >
                  {reaction.emoji} {reaction.text}
                </div>
              )}

              {/* Opponent Header */}
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-lg shrink-0">
                    {opp.avatar}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-white truncate flex items-center gap-1">
                      <span>{opp.name}</span>
                      {opp.isBot && <Bot className="w-3.5 h-3.5 text-indigo-400 shrink-0" />}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px]">
                      {!opp.isAlive ? (
                        <span className="text-red-400 font-semibold flex items-center gap-0.5">
                          <Skull className="w-3 h-3" /> ออกจากเกม
                        </span>
                      ) : isOppTurn ? (
                        <span className="text-amber-300 font-semibold">▶️ กำลังเล่น...</span>
                      ) : (hasPassedAction || hasPassedBlock) ? (
                        <span className="text-emerald-400">✓ ปล่อยผ่านแล้ว</span>
                      ) : (
                        <span className="text-slate-400">ยังอยู่ในเกม</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Coins Badge */}
                <div
                  className={`px-2.5 py-1 rounded-xl border flex items-center gap-1 font-bold text-xs shrink-0 ${
                    opp.coins >= 10
                      ? 'bg-red-500/20 border-red-400 text-red-200 animate-pulse'
                      : opp.coins >= 7
                        ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                        : 'bg-slate-950/90 border-slate-700 text-amber-300'
                  }`}
                >
                  <Coins className="w-3.5 h-3.5 text-amber-400" />
                  <span>{opp.coins}</span>
                </div>
              </div>

              {/* Opponent's 2 Cards */}
              <div className="flex items-center justify-center gap-2.5 my-1">
                {opp.cards.map((c) => (
                  <RoleCard key={c.id} role={c.role} revealed={c.revealed} size="sm" />
                ))}
              </div>

              {/* Target Overlay when selecting a target */}
              {isTargetable && (
                <div className="mt-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs text-center flex items-center justify-center gap-1 shadow">
                  <Crosshair className="w-3.5 h-3.5" /> คลิกเลือก {opp.name} เป็นเป้าหมาย
                </div>
              )}

              {isPendingTarget && !isTargetable && (
                <div className="mt-2 py-0.5 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 font-semibold text-[11px] text-center">
                  🎯 ตกเป็นเป้าหมาย
                </div>
              )}
            </div>
          );
        })}
      </section>

      {/* 3. CENTER COURT STAGE (Action / Challenge / Block / Exchange / GameOver) */}
      <main className="bg-slate-900/95 backdrop-blur-md border-2 border-amber-500/35 rounded-3xl p-4 sm:p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-36 bg-amber-500/10 blur-3xl pointer-events-none" />

        {/* CASE A: TURN_START */}
        {roomState.phase === GAME_PHASES.TURN_START && (
          <div>
            {isMyTurn ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-full bg-amber-500 text-slate-950 font-extrabold text-xs uppercase tracking-wider">
                      ตาของคุณ!
                    </span>
                    <h2 className="text-base sm:text-lg font-bold text-white">
                      เลือกแอคชันที่จะประกาศ (สามารถบลัฟอ้างเป็นตัวละครที่ไม่มีในมือได้!)
                    </h2>
                  </div>
                  {me.coins >= 10 && (
                    <span className="px-3 py-1 rounded-xl bg-red-500/20 border border-red-400 text-red-200 text-xs font-bold animate-pulse">
                      ⚠️ คุณมี {me.coins} เหรียญ ต้องใช้ “โค่นอำนาจ (Overthrow)” เท่านั้น!
                    </span>
                  )}
                </div>

                {/* Target Picker Banner if a targetable action is selected */}
                {selectedAction && (
                  <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-400/60 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-bold text-rose-200 flex items-center gap-1.5">
                        <Crosshair className="w-4 h-4 text-rose-400" />
                        เลือกเป้าหมายสำหรับ “{ACTION_INFO[selectedAction].nameTh}”
                      </div>
                      <p className="text-xs text-rose-300/80">คลิกเลือกผู้เล่นเป้าหมายด้านล่าง หรือคลิกที่การ์ดของผู้เล่นด้านบน</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {opponents
                        .filter((p) => p.isAlive)
                        .map((opp) => (
                          <button
                            key={opp.id}
                            type="button"
                            onClick={() => {
                              onDeclareAction(selectedAction, opp.id);
                              setSelectedAction(null);
                            }}
                            className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow cursor-pointer"
                          >
                            <span>{opp.avatar}</span>
                            <span>{opp.name}</span>
                            <span className="text-rose-200">({opp.coins}🪙)</span>
                          </button>
                        ))}
                      <button
                        type="button"
                        onClick={() => setSelectedAction(null)}
                        className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
                      >
                        ยกเลิก
                      </button>
                    </div>
                  </div>
                )}

                {/* Action Buttons Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {Object.values(ACTION_INFO)
                    .filter((act) => !act.claimedRole || (roomState.roleCounts?.[act.claimedRole] ?? 3) > 0)
                    .map((act) => {
                      const forcedCoup = me.coins >= 10 && act.id !== ACTIONS.COUP;
                    const notEnoughCoins = me.coins < act.cost;
                    const disabled = forcedCoup || notEnoughCoins;
                    const roleInfo = act.claimedRole ? ROLE_INFO[act.claimedRole] : null;
                    const isSelected = selectedAction === act.id;

                    return (
                      <button
                        key={act.id}
                        type="button"
                        disabled={disabled}
                        onClick={() => handleActionClick(act.id)}
                        className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between ${
                          disabled
                            ? 'bg-slate-950/40 border-slate-800/60 opacity-40 cursor-not-allowed'
                            : isSelected
                              ? 'bg-amber-500/20 border-amber-400 ring-2 ring-amber-400/50 cursor-pointer'
                              : roleInfo
                                ? `bg-gradient-to-br ${roleInfo.color} ${roleInfo.borderColor} hover:scale-[1.02] cursor-pointer shadow-md`
                                : 'bg-slate-800/90 hover:bg-slate-800 border-slate-600 hover:border-amber-400/60 cursor-pointer'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <span className="font-bold text-sm text-white leading-snug">{act.nameTh}</span>
                          {roleInfo ? (
                            <span className="px-2 py-0.5 rounded-full bg-black/45 text-[10px] font-bold text-amber-300 border border-white/15 shrink-0">
                              {roleInfo.nameTh}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-slate-950/60 text-[10px] text-slate-300 shrink-0">
                              ทั่วไป
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-200/90 leading-relaxed mt-1">{act.descTh}</p>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="py-6 text-center space-y-2">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-sm font-bold">
                  <span>{currentTurnPlayer?.avatar}</span>
                  <span>ตาของ {currentTurnPlayer?.name}</span>
                </div>
                <p className="text-xs text-slate-400">กำลังรอ {currentTurnPlayer?.name} เลือกประกาศแอคชัน...</p>
              </div>
            )}
          </div>
        )}

        {/* CASE B: AWAITING_ACTION_RESPONSE or AWAITING_BLOCK_ONLY */}
        {(roomState.phase === GAME_PHASES.AWAITING_ACTION_RESPONSE ||
          roomState.phase === GAME_PHASES.AWAITING_BLOCK_ONLY) &&
          pending && (
            <div className="space-y-4 text-center">
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-widest text-amber-400">
                  {roomState.phase === GAME_PHASES.AWAITING_BLOCK_ONLY
                    ? 'การท้าพิสูจน์ล้มเหลว! เป้าหมายยังสามารถเลือกบล็อกได้'
                    : 'มีผู้ประกาศแอคชัน — เปิดโอกาสให้ท้าพิสูจน์ (จับโกหก) หรือบล็อก!'}
                </span>
                <h2 className="text-lg sm:text-2xl font-bold text-white flex flex-wrap items-center justify-center gap-2">
                  <span>
                    {pendingActor?.avatar} {pendingActor?.name}
                  </span>
                  <span className="text-amber-300">ใช้ “{ACTION_INFO[pending.type].nameTh}”</span>
                  {pending.claimedRole && (
                    <span className="px-2.5 py-0.5 rounded-xl bg-purple-500/25 border border-purple-400/50 text-purple-200 text-sm">
                      อ้างเป็น {ROLE_INFO[pending.claimedRole].nameTh}
                    </span>
                  )}
                  {pendingTarget && (
                    <span className="text-rose-300">
                      ใส่ 🎯 {pendingTarget.avatar} {pendingTarget.name}
                    </span>
                  )}
                </h2>
              </div>

              {/* Response Buttons for Alive Non-Actor */}
              {isMyAlive && pending.actorId !== playerId ? (
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  {/* Challenge Button */}
                  {roomState.phase === GAME_PHASES.AWAITING_ACTION_RESPONSE && pending.claimedRole && (
                    <button
                      type="button"
                      onClick={onChallengeAction}
                      className="px-5 py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white font-bold text-sm shadow-lg shadow-rose-600/30 flex items-center gap-2 transition cursor-pointer"
                    >
                      <Flame className="w-5 h-5" />
                      ขอท้าพิสูจน์! (จับโกหกว่าไม่มี {ROLE_INFO[pending.claimedRole].nameTh})
                    </button>
                  )}

                  {/* Block Buttons */}
                  {pending.blockableBy?.length > 0 &&
                    (pending.blockScope === 'ANY' || pending.targetId === playerId) &&
                    pending.blockableBy.map((blockRole) => (
                      <button
                        key={blockRole}
                        type="button"
                        onClick={() => onBlockAction(blockRole)}
                        className="px-5 py-3 rounded-2xl bg-gradient-to-r from-sky-600 to-indigo-700 hover:from-sky-500 hover:to-indigo-600 text-white font-bold text-sm shadow-lg shadow-sky-600/30 flex items-center gap-2 transition cursor-pointer"
                      >
                        <Shield className="w-5 h-5" />
                        บล็อกด้วย [{ROLE_INFO[blockRole].nameTh}]
                      </button>
                    ))}

                  {/* Pass Button */}
                  {(roomState.phase !== GAME_PHASES.AWAITING_BLOCK_ONLY || pending.targetId === playerId) && (
                    <button
                      type="button"
                      disabled={pending.passedPlayerIds.includes(playerId)}
                      onClick={onPassAction}
                      className="px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-emerald-300 border border-emerald-500/40 font-bold text-sm flex items-center gap-2 transition cursor-pointer"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      {pending.passedPlayerIds.includes(playerId) ? 'คุณกดปล่อยผ่านแล้ว (รอคนอื่น...)' : 'ปล่อยผ่าน (Pass)'}
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-xs text-slate-400 py-2">
                  ⏳ กำลังรอผู้เล่นคนอื่นตัดสินใจว่าจะท้าพิสูจน์, บล็อก หรือปล่อยผ่าน...
                </div>
              )}
            </div>
          )}

        {/* CASE C: AWAITING_BLOCK_RESPONSE */}
        {roomState.phase === GAME_PHASES.AWAITING_BLOCK_RESPONSE && pending?.block && (
          <div className="space-y-4 text-center">
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-widest text-sky-400">
                มีการประกาศบล็อก! — จะเชื่อหรือจะท้าพิสูจน์?
              </span>
              <h2 className="text-lg sm:text-2xl font-bold text-white flex flex-wrap items-center justify-center gap-2">
                <span>
                  🛡️ {pendingBlocker?.avatar} {pendingBlocker?.name}
                </span>
                <span>อ้างตัวเป็น</span>
                <span className="px-3 py-0.5 rounded-xl bg-sky-500/25 border border-sky-400/50 text-sky-200">
                  {ROLE_INFO[pending.block.claimedRole].nameTh}
                </span>
                <span>เพื่อบล็อก “{ACTION_INFO[pending.type].nameTh}” ของ {pendingActor?.name}!</span>
              </h2>
            </div>

            {isMyAlive && pending.block.blockerId !== playerId ? (
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={onChallengeBlock}
                  className="px-5 py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-red-700 hover:from-rose-500 hover:to-red-600 text-white font-bold text-sm shadow-lg shadow-rose-600/30 flex items-center gap-2 transition cursor-pointer"
                >
                  <Flame className="w-5 h-5" />
                  ท้าพิสูจน์การบล็อก! (จับโกหกว่าไม่มี {ROLE_INFO[pending.block.claimedRole].nameTh})
                </button>

                <button
                  type="button"
                  disabled={pending.block.passedPlayerIds.includes(playerId)}
                  onClick={onPassBlock}
                  className="px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-emerald-300 border border-emerald-500/40 font-bold text-sm flex items-center gap-2 transition cursor-pointer"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  {pending.block.passedPlayerIds.includes(playerId)
                    ? 'ยอมรับการบล็อกแล้ว (รอคนอื่น...)'
                    : 'ยอมรับการบล็อก (ปล่อยผ่าน)'}
                </button>
              </div>
            ) : (
              <div className="text-xs text-slate-400 py-2">
                ⏳ กำลังรอผู้เล่นอื่นตัดสินใจว่าจะท้าพิสูจน์การบล็อกของคุณหรือไม่...
              </div>
            )}
          </div>
        )}

        {/* CASE D: AWAITING_INFLUENCE_LOSS */}
        {roomState.phase === GAME_PHASES.AWAITING_INFLUENCE_LOSS && roomState.influenceLossState && (
          <div className="py-3 text-center space-y-2">
            {mustLoseCard ? (
              <div className="p-4 rounded-2xl bg-red-950/60 border-2 border-red-500 animate-pulse space-y-1">
                <div className="text-base sm:text-xl font-extrabold text-red-200 flex items-center justify-center gap-2">
                  <AlertOctagon className="w-6 h-6 text-red-400" />
                  คุณต้องสูญเสียอิทธิพล 1 ใบ! ({roomState.influenceLossState.reason})
                </div>
                <p className="text-xs sm:text-sm text-red-300">
                  👉 กรุณาคลิกเลือกการ์ดที่ยังไม่ถูกเปิดในมือของคุณด้านล่าง เพื่อเปิดทิ้ง 1 ใบ
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="text-base sm:text-lg font-bold text-rose-300">
                  💔 รอ{' '}
                  {roomState.players.find((p) => p.id === roomState.influenceLossState.playerId)?.name}{' '}
                  เลือกการ์ดที่จะเปิดทิ้ง...
                </div>
                <p className="text-xs text-slate-400">สาเหตุ: {roomState.influenceLossState.reason}</p>
              </div>
            )}
          </div>
        )}

        {/* CASE E: AWAITING_EXCHANGE (Ambassador) */}
        {roomState.phase === GAME_PHASES.AWAITING_EXCHANGE && roomState.exchangeState && (
          <div className="space-y-4 text-center">
            {roomState.exchangeState.actorId === playerId && roomState.exchangeState.options ? (
              <div className="space-y-4">
                <div>
                  <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-xs font-bold">
                    ความสามารถราชทูตมืด (สับเปลี่ยนสายลับ)
                  </span>
                  <h2 className="text-lg font-bold text-white mt-2">
                    เลือกการ์ดที่จะเก็บไว้ในมือจำนวน <span className="text-amber-300">{roomState.exchangeState.keepCount} ใบ</span>{' '}
                    (จากตัวเลือกทั้งหมด {roomState.exchangeState.options.length} ใบ)
                  </h2>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-4">
                  {roomState.exchangeState.options.map((role, idx) => (
                    <RoleCard
                      key={`ex-${idx}-${role}`}
                      role={role}
                      selectable
                      selected={exchangeSelected.includes(idx)}
                      onClick={() => handleToggleExchangeIdx(idx, roomState.exchangeState.keepCount)}
                    />
                  ))}
                </div>

                <div>
                  <button
                    type="button"
                    disabled={exchangeSelected.length !== roomState.exchangeState.keepCount}
                    onClick={() => onSubmitExchange(exchangeSelected)}
                    className="px-8 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-40 text-slate-950 font-bold text-sm shadow-lg cursor-pointer"
                  >
                    ยืนยันการเลือกการ์ด ({exchangeSelected.length} / {roomState.exchangeState.keepCount})
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-4 space-y-1">
                <div className="text-base font-bold text-emerald-300">
                  🔄 {roomState.players.find((p) => p.id === roomState.exchangeState.actorId)?.name}{' '}
                  กำลังเลือกเปลี่ยนการ์ดกับกองกลาง (ทูต)...
                </div>
              </div>
            )}
          </div>
        )}

        {/* CASE F: GAME_OVER */}
        {roomState.phase === GAME_PHASES.GAME_OVER && roomState.winner && (
          <div className="py-4 text-center space-y-4">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/20 border-2 border-amber-400 text-4xl shadow-xl">
              {roomState.winner.avatar}
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-amber-400">ศึกชิงบัลลังก์สิ้นสุดลงแล้ว</span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
                🏆 {roomState.winner.name} เป็นผู้ชนะครองบัลลังก์ CROWNFALL!
              </h2>
            </div>

            {isHost ? (
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={onStartRematch}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-sm shadow-lg flex items-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" /> เล่นใหม่อีกตา (Rematch)
                </button>
                <button
                  type="button"
                  onClick={onBackToLobby}
                  className="px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-sm cursor-pointer"
                >
                  กลับห้องเตรียมพร้อม
                </button>
              </div>
            ) : (
              <p className="text-xs text-amber-300 animate-pulse">รอหัวหน้าห้องกดเริ่มเกมรอบใหม่...</p>
            )}
          </div>
        )}
      </main>

      {/* 4. BOTTOM AREA: MY HAND & LIVE LOG / CHAT */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
        {/* Left 7 cols: Player's Personal Hand & Coins */}
        <div
          className={`lg:col-span-7 bg-slate-900/90 backdrop-blur-md border rounded-3xl p-4 sm:p-5 flex flex-col justify-between relative ${
            mustLoseCard
              ? 'border-red-500 ring-4 ring-red-500/30'
              : isMyTurn
                ? 'border-amber-400/80 shadow-lg shadow-amber-500/10'
                : 'border-slate-800'
          }`}
        >
          {floatingReactions[playerId] && (
            <div
              key={floatingReactions[playerId].id}
              className="absolute -top-8 left-8 z-30 px-3.5 py-1 rounded-full bg-amber-400 text-slate-950 font-bold text-xs shadow-xl animate-float-reaction"
            >
              {floatingReactions[playerId].emoji} {floatingReactions[playerId].text}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-slate-800 border border-amber-500/40 flex items-center justify-center text-xl">
                {me?.avatar}
              </div>
              <div>
                <div className="font-bold text-base text-white flex items-center gap-2">
                  <span>{me?.name} (คุณ)</span>
                  {!isMyAlive && (
                    <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 text-xs font-semibold">
                      สิ้นอิทธิพลแล้ว (ผู้ชม)
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-400">
                  การ์ดอิทธิพลในมือของคุณ (เก็บเป็นความลับ ห้ามให้ใครรู้!)
                </div>
              </div>
            </div>

            <div className="px-4 py-2 rounded-2xl bg-amber-500/15 border border-amber-400/50 flex items-center gap-2">
              <Coins className="w-5 h-5 text-amber-400" />
              <div>
                <div className="text-[10px] uppercase tracking-wider text-amber-200/80">เหรียญของคุณ</div>
                <div className="text-lg font-extrabold text-amber-300 leading-none">{me?.coins || 0} เหรียญ</div>
              </div>
            </div>
          </div>

          {/* My 2 Large Role Cards */}
          <div className="flex flex-wrap items-center justify-center gap-4 my-2">
            {me?.cards.map((card, idx) => (
              <RoleCard
                key={card.id}
                role={card.role}
                revealed={card.revealed}
                selectable={mustLoseCard && !card.revealed}
                dangerHighlight={mustLoseCard && !card.revealed}
                onClick={() => {
                  if (mustLoseCard && !card.revealed) {
                    onChooseInfluenceLoss(idx);
                  }
                }}
              />
            ))}
          </div>

          {/* Quick Bluff / Taunt Reactions Bar */}
          <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center gap-1.5 overflow-x-auto pb-1">
            <span className="text-[11px] text-slate-400 shrink-0 mr-1">ส่งคำพูดปั่นประสาท:</span>
            {QUICK_REACTIONS.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => onSendChat(r.text, r.emoji)}
                className="px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-200 whitespace-nowrap transition cursor-pointer shrink-0"
              >
                {r.emoji} {r.text}
              </button>
            ))}
          </div>
        </div>

        {/* Right 5 cols: Game Log & Chat */}
        <div className="lg:col-span-5 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-3xl p-4 flex flex-col justify-between h-80 lg:h-auto">
          {/* Tabs */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('log')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition cursor-pointer ${
                  activeTab === 'log'
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                📜 บันทึกเหตุการณ์ ({roomState.logs.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('chat')}
                className={`px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1 transition cursor-pointer ${
                  activeTab === 'chat'
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" /> แชทในห้อง ({roomState.chat.length})
              </button>
            </div>
          </div>

          {/* Messages / Logs Scroll Container */}
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 max-h-56">
            {activeTab === 'log' ? (
              roomState.logs.map((item) => (
                <div
                  key={item.id}
                  className={`text-xs px-2.5 py-1.5 rounded-xl border ${
                    item.type === 'danger'
                      ? 'bg-red-950/40 border-red-500/30 text-red-200'
                      : item.type === 'warning'
                        ? 'bg-amber-950/40 border-amber-500/30 text-amber-200'
                        : item.type === 'success'
                          ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
                          : item.type === 'turn'
                            ? 'bg-indigo-950/50 border-indigo-500/30 text-indigo-200 font-semibold'
                            : item.type === 'winner'
                              ? 'bg-amber-500/20 border-amber-400 text-amber-200 font-bold'
                              : 'bg-slate-950/50 border-slate-800/80 text-slate-300'
                  }`}
                >
                  <span className="text-[10px] text-slate-500 font-mono mr-2">[{item.timestamp}]</span>
                  <span>{item.message}</span>
                </div>
              ))
            ) : roomState.chat.length === 0 ? (
              <div className="text-xs text-slate-500 text-center py-8">ยังไม่มีข้อความแชท ส่งข้อความทักทายเพื่อนได้เลย!</div>
            ) : (
              roomState.chat.map((msg) => (
                <div key={msg.id} className="text-xs px-3 py-1.5 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="font-bold text-amber-300">
                    {msg.avatar} {msg.playerName}:{' '}
                  </span>
                  <span className="text-slate-200">
                    {msg.emoji} {msg.text}
                  </span>
                </div>
              ))
            )}
            <div ref={logEndRef} />
          </div>

          {/* Chat Input */}
          <form onSubmit={handleChatSubmit} className="mt-2 pt-2 border-t border-slate-800 flex gap-2">
            <input
              type="text"
              maxLength={120}
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="พิมพ์ข้อความบลัฟเพื่อน..."
              className="flex-1 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-amber-400 focus:outline-none text-xs text-white"
            />
            <button
              type="submit"
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" /> ส่ง
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}

