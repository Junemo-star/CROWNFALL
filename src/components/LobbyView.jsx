import React, { useState, useEffect } from 'react';
import {
  Crown,
  Users,
  Copy,
  Check,
  Bot,
  Play,
  LogOut,
  Sparkles,
  Trash2,
  Share2,
  Wifi,
  Layers,
  Plus,
  Minus,
  Shuffle,
} from 'lucide-react';
import { ROLES, ROLE_INFO, DEFAULT_ROLE_COUNTS, ROLE_PRESETS } from '../constants/gameData.js';

const AVATAR_CHOICES = ['🦊', '🦁', '🦉', '🐺', '🐍', '🦅', '🎭', '👑', '🗡️', '⚜️'];

export default function LobbyView({
  roomState,
  playerId,
  playerName,
  setPlayerName,
  playerAvatar,
  setPlayerAvatar,
  initialRoomCode,
  onCreateRoom,
  onJoinRoom,
  onLeaveRoom,
  onAddBot,
  onKickPlayer,
  onUpdateRoleCounts,
  onStartGame,
  errorMsg,
}) {
  const [joinCode, setJoinCode] = useState(initialRoomCode || '');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [lanInfo, setLanInfo] = useState(null);

  useEffect(() => {
    if (initialRoomCode) setJoinCode(initialRoomCode);
  }, [initialRoomCode]);

  useEffect(() => {
    fetch('/api/info')
      .then((r) => r.json())
      .then((data) => setLanInfo(data))
      .catch(() => {});
  }, []);

  // Not in a room yet: Show Landing / Create / Join Form
  if (!roomState) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[550px] h-[350px] bg-amber-500/10 blur-[120px] rounded-full pointer-events-none" />

        <div className="w-full max-w-md bg-slate-900/90 backdrop-blur-md border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-700 text-slate-950 shadow-lg shadow-amber-500/25 mb-3">
              <Crown className="w-9 h-9" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200">
              CROWNFALL
            </h1>
            <p className="text-sm text-slate-400 mt-1">คราวน์ฟอล: ศึกลวงบัลลังก์ — เกมจิตวิทยาออนไลน์กับเพื่อน (2–6 คน)</p>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/15 border border-red-500/40 text-red-300 text-xs font-medium text-center">
              {errorMsg}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-amber-300/90 mb-1.5">
                ชื่อในราชสำนักของคุณ
              </label>
              <input
                type="text"
                maxLength={20}
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="เช่น ลอร์ดสมชาย, เลดี้มายด์..."
                className="w-full px-4 py-3 rounded-xl bg-slate-950/90 border border-slate-700 focus:border-amber-400 focus:outline-none text-white placeholder-slate-500 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-amber-300/90 mb-1.5">
                เลือกตราประจำตัว
              </label>
              <div className="grid grid-cols-5 gap-2">
                {AVATAR_CHOICES.map((av) => (
                  <button
                    key={av}
                    type="button"
                    onClick={() => setPlayerAvatar(av)}
                    className={`py-2 rounded-xl text-xl flex items-center justify-center border transition cursor-pointer ${
                      playerAvatar === av
                        ? 'bg-amber-500/20 border-amber-400 scale-105 shadow-md shadow-amber-500/20'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {av}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={onCreateRoom}
                className="w-full py-3.5 px-5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-base shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition cursor-pointer"
              >
                <Sparkles className="w-5 h-5" />
                สร้างห้องใหม่ (Create Room)
              </button>
            </div>

            <div className="relative flex py-2 items-center">
              <div className="grow border-t border-slate-800" />
              <span className="shrink mx-3 text-xs text-slate-500 uppercase">หรือมีรหัสห้องแล้ว</span>
              <div className="grow border-t border-slate-800" />
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                maxLength={6}
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="กรอกรหัสห้อง 5 ตัว"
                className="w-full px-4 py-3 rounded-xl bg-slate-950/90 border border-slate-700 focus:border-amber-400 focus:outline-none text-white placeholder-slate-500 text-center font-mono text-base tracking-widest uppercase"
              />
              <button
                type="button"
                onClick={() => onJoinRoom(joinCode)}
                className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-bold text-sm shrink-0 transition cursor-pointer"
              >
                เข้าร่วมห้อง
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Inside a Room Lobby
  const me = roomState.players.find((p) => p.id === playerId);
  const isHost = Boolean(me?.isHost);
  const roleCounts = roomState.roleCounts || DEFAULT_ROLE_COUNTS;
  const totalDeckCards = Object.values(roleCounts).reduce((sum, n) => sum + Number(n || 0), 0);
  const minRequiredCards = Math.max(6, roomState.players.length * 2 + 2);
  const activeRoleTypes = Object.values(roleCounts).filter((n) => Number(n) > 0).length;
  const isDeckValid = totalDeckCards >= minRequiredCards && activeRoleTypes >= 2;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomState.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const getShareUrl = () => {
    const origin =
      window.location.hostname === 'localhost' && lanInfo?.lanAddresses?.[0]
        ? `http://${lanInfo.lanAddresses[0]}:${lanInfo.port || window.location.port}`
        : window.location.origin;
    return `${origin}/?room=${roomState.code}`;
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(getShareUrl());
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleRoleDelta = (role, delta) => {
    if (!isHost) return;
    const current = Number(roleCounts[role] || 0);
    const nextVal = Math.min(6, Math.max(0, current + delta));
    if (nextVal === current) return;
    onUpdateRoleCounts({
      ...roleCounts,
      [role]: nextVal,
    });
  };

  const handleRandomizeRoles = () => {
    if (!isHost) return;
    const allRoles = Object.values(ROLES);
    const shuffled = [...allRoles].sort(() => Math.random() - 0.5);
    const numRolesToPick = 4 + Math.floor(Math.random() * 3); // Pick 4 to 6 roles
    const chosen = new Set(shuffled.slice(0, numRolesToPick));
    const nextCounts = {};
    allRoles.forEach((r) => {
      nextCounts[r] = chosen.has(r) ? 3 : 0;
    });
    onUpdateRoleCounts(nextCounts);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-slate-900/90 backdrop-blur-md border border-amber-500/30 rounded-3xl p-5 sm:p-8 shadow-2xl space-y-6">
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-800">
          <div>
            <span className="text-xs uppercase tracking-widest text-amber-400 font-semibold">ห้องเตรียมพร้อมราชสำนัก</span>
            <div className="flex flex-wrap items-center gap-3 mt-1">
              <span className="text-3xl sm:text-4xl font-mono font-extrabold tracking-widest text-white bg-slate-950 px-4 py-1.5 rounded-xl border border-amber-500/40">
                {roomState.code}
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 border border-slate-700 transition cursor-pointer"
              >
                {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                {copiedCode ? 'คัดลอกรหัสแล้ว' : 'คัดลอกรหัส'}
              </button>
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 text-xs font-medium flex items-center gap-1.5 border border-amber-500/30 transition cursor-pointer"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
                {copiedLink ? 'คัดลอกลิงก์ชวนเพื่อนแล้ว!' : 'คัดลอกลิงก์ชวนเพื่อน'}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onLeaveRoom}
              className="px-3 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 text-red-300 text-xs font-medium flex items-center gap-1.5 border border-red-500/30 cursor-pointer"
            >
              <LogOut className="w-4 h-4" /> ออกจากห้อง
            </button>
          </div>
        </div>

        {/* LAN / Network Helper Banner */}
        {lanInfo?.lanAddresses?.length > 0 && (
          <div className="px-4 py-2.5 rounded-xl bg-indigo-950/60 border border-indigo-500/30 flex items-center justify-between gap-2 text-xs text-indigo-200">
            <div className="flex items-center gap-2">
              <Wifi className="w-4 h-4 text-indigo-400 shrink-0" />
              <span>
                เพื่อนใน Wi-Fi / LAN / Radmin VPN เดียวกันเข้าได้ที่:{' '}
                <strong className="text-amber-300 font-mono">
                  http://{lanInfo.lanAddresses[0]}:{lanInfo.port}/?room={roomState.code}
                </strong>
              </span>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-500/15 border border-red-500/40 text-red-300 text-xs font-medium text-center">
            {errorMsg}
          </div>
        )}

        {/* Players List (2 to 6 seats) */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" />
              ผู้เล่นในห้อง ({roomState.players.length} / 6)
            </h2>

            {isHost && roomState.players.length < 6 && (
              <button
                type="button"
                onClick={onAddBot}
                className="px-3 py-1.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Bot className="w-4 h-4" /> + เพิ่มบอท AI
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {roomState.players.map((p) => (
              <div
                key={p.id}
                className={`p-3 rounded-2xl border flex items-center justify-between ${
                  p.id === playerId
                    ? 'bg-amber-500/10 border-amber-400/50'
                    : 'bg-slate-950/70 border-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xl shrink-0">
                    {p.avatar}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-white truncate flex items-center gap-1.5">
                      <span>{p.name}</span>
                      {p.id === playerId && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold">
                          คุณ
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                      {p.isHost && (
                        <span className="text-amber-400 flex items-center gap-1 font-medium">
                          <Crown className="w-3 h-3" /> หัวหน้าห้อง
                        </span>
                      )}
                      {p.isBot && (
                        <span className="text-indigo-300 flex items-center gap-1">
                          <Bot className="w-3 h-3" /> บอทอัจฉริยะ
                        </span>
                      )}
                      {!p.isHost && !p.isBot && <span>พร้อมเล่น</span>}
                    </div>
                  </div>
                </div>

                {isHost && p.id !== playerId && (
                  <button
                    type="button"
                    onClick={() => onKickPlayer(p.id)}
                    title="เชิญออกจากห้อง"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ROLE & DECK CUSTOMIZER SECTION */}
        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-amber-300 flex items-center gap-2">
                <Layers className="w-4 h-4 text-amber-400" />
                ตั้งค่าจำนวนโรลในสำรับประจำรอบนี้ ({activeRoleTypes} โรล / รวม {totalDeckCards} ใบ)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {isHost
                  ? 'เลือกเปิด/ปิดโรล และกำหนดจำนวนการ์ดแต่ละโรลที่จะใส่ในสำรับรอบนี้ได้เลย (0 = ไม่ใช้โรลนั้นในรอบนี้)'
                  : 'หัวหน้าห้องกำลังเลือกจำนวนโรลที่จะใช้ในรอบนี้'}
              </p>
            </div>

            {isHost && (
              <div className="flex flex-wrap items-center gap-1.5">
                {ROLE_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => onUpdateRoleCounts(preset.counts)}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-semibold text-slate-200 transition cursor-pointer"
                  >
                    {preset.nameTh}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleRandomizeRoles}
                  className="px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-[11px] font-semibold text-amber-300 flex items-center gap-1 transition cursor-pointer"
                >
                  <Shuffle className="w-3.5 h-3.5" /> สุ่มโรล
                </button>
              </div>
            )}
          </div>

          {/* 8 Roles Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {Object.values(ROLE_INFO).map((role) => {
              const count = Number(roleCounts[role.id] || 0);
              const isEnabled = count > 0;

              return (
                <div
                  key={role.id}
                  className={`p-3 rounded-xl border transition flex flex-col justify-between ${
                    isEnabled
                      ? `bg-gradient-to-br ${role.color} ${role.borderColor} shadow-md`
                      : 'bg-slate-900/50 border-slate-800/80 opacity-50'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-1">
                      <div>
                        <div className="font-bold text-sm text-white">{role.nameTh}</div>
                        <div className="text-[10px] text-white/75 font-serif-title uppercase">{role.nameEn}</div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-extrabold ${
                          isEnabled ? 'bg-amber-400 text-slate-950' : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {count} ใบ
                      </span>
                    </div>
                    <p className="text-[11px] text-white/85 mt-1.5 leading-snug line-clamp-2">{role.actionNameTh}</p>
                  </div>

                  {isHost && (
                    <div className="mt-3 pt-2 border-t border-white/15 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        disabled={count <= 0}
                        onClick={() => handleRoleDelta(role.id, -1)}
                        className="w-8 h-7 rounded-lg bg-black/40 hover:bg-black/60 disabled:opacity-30 text-white flex items-center justify-center border border-white/15 cursor-pointer"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs font-bold text-white">
                        {count === 0 ? 'ปิดใช้งาน' : `ใส่ ${count} ใบ`}
                      </span>
                      <button
                        type="button"
                        disabled={count >= 6}
                        onClick={() => handleRoleDelta(role.id, 1)}
                        className="w-8 h-7 rounded-lg bg-black/40 hover:bg-black/60 disabled:opacity-30 text-white flex items-center justify-center border border-white/15 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {!isDeckValid && (
            <div className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-xl px-3 py-2">
              ⚠️ กรุณาเลือกอย่างน้อย 2 โรล และมีจำนวนการ์ดรวมอย่างน้อย <strong>{minRequiredCards} ใบ</strong> (ปัจจุบันมี {totalDeckCards} ใบ) เพื่อให้พอแจกผู้เล่นและเหลือในกองกลาง
            </div>
          )}
        </div>

        {/* Start Game Footer */}
        <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-400">
            {roomState.players.length < 2
              ? '⚠️ ต้องมีผู้เล่นอย่างน้อย 2 คน (ส่งรหัสให้เพื่อน หรือกด "+ เพิ่มบอท AI" ด้านบน)'
              : `✅ ผู้เล่นครบ ${roomState.players.length} คน • สำรับการ์ดรวม ${totalDeckCards} ใบ`}
          </div>

          {isHost ? (
            <button
              type="button"
              disabled={roomState.players.length < 2 || !isDeckValid}
              onClick={onStartGame}
              className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 font-bold text-base shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Play className="w-5 h-5 fill-current" />
              เริ่มเกมรอบนี้!
            </button>
          ) : (
            <div className="px-5 py-3 rounded-xl bg-slate-800/80 text-amber-300 text-sm font-medium animate-pulse">
              ⏳ รอหัวหน้าห้องตั้งค่าโรลและกดเริ่มเกม...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
