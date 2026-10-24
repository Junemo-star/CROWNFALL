import React from 'react';
import {
  Crown,
  Sword,
  Anchor,
  Globe,
  ShieldAlert,
  Eye,
  FlaskConical,
  Scale,
  Skull,
  Sparkles,
  Lock,
} from 'lucide-react';
import { ROLES, ROLE_INFO } from '../constants/gameData.js';

const ROLE_ICONS = {
  [ROLES.DUKE]: Crown,
  [ROLES.ASSASSIN]: Sword,
  [ROLES.CAPTAIN]: Anchor,
  [ROLES.AMBASSADOR]: Globe,
  [ROLES.CONTESSA]: ShieldAlert,
  [ROLES.INQUISITOR]: Eye,
  [ROLES.ALCHEMIST]: FlaskConical,
  [ROLES.JUDGE]: Scale,
};

export default function RoleCard({
  role,
  revealed = false,
  size = 'md', // 'sm' | 'md' | 'lg'
  selectable = false,
  selected = false,
  dangerHighlight = false,
  onClick,
}) {
  const isHidden = !role || role === 'HIDDEN';
  const info = !isHidden ? ROLE_INFO[role] : null;
  const IconComp = !isHidden && ROLE_ICONS[role] ? ROLE_ICONS[role] : Lock;

  if (size === 'sm') {
    // Compact card for opponent table seats
    if (isHidden) {
      return (
        <div
          className="relative w-16 h-24 sm:w-20 sm:h-28 rounded-xl bg-gradient-to-br from-slate-800 via-indigo-950 to-slate-950 border border-amber-500/40 shadow-lg flex flex-col items-center justify-center p-2 select-none overflow-hidden"
          title="การ์ดที่ยังคว่ำอยู่"
        >
          <div className="absolute inset-1 rounded-lg border border-amber-500/20 pointer-events-none" />
          <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-400/30 flex items-center justify-center mb-1">
            <Crown className="w-4 h-4 text-amber-400/80" />
          </div>
          <span className="text-[9px] font-serif-title tracking-wider text-amber-300/70 uppercase">CROWNFALL</span>
        </div>
      );
    }

    return (
      <div
        className={`relative w-16 h-24 sm:w-20 sm:h-28 rounded-xl bg-gradient-to-br ${info.color} border ${
          revealed ? 'border-red-500/60 opacity-75 grayscale-[35%]' : info.borderColor
        } shadow-lg flex flex-col items-center justify-between p-2 select-none overflow-hidden`}
      >
        <div className="w-full flex items-center justify-between">
          <span className="text-[10px] font-bold text-white/90 truncate">{info.nameTh}</span>
          {revealed && <Skull className="w-3.5 h-3.5 text-red-400 shrink-0" />}
        </div>

        <div className="w-9 h-9 rounded-full bg-black/30 border border-white/20 flex items-center justify-center my-auto">
          <IconComp className="w-5 h-5 text-white" />
        </div>

        <div className="text-[9px] text-white/75 tracking-wider uppercase font-serif-title truncate w-full text-center">
          {info.nameEn}
        </div>

        {revealed && (
          <div className="absolute inset-0 bg-red-950/60 backdrop-blur-[1px] flex items-center justify-center">
            <span className="px-1.5 py-0.5 rounded bg-red-600/90 text-[9px] font-bold text-white tracking-wider uppercase rotate-[-12deg] shadow">
              เปิดทิ้งแล้ว
            </span>
          </div>
        )}
      </div>
    );
  }

  // Medium / Large card for Player Hand or Exchange Modal
  if (isHidden) {
    return (
      <div className="relative w-36 h-52 sm:w-44 sm:h-64 rounded-2xl bg-gradient-to-br from-slate-800 via-indigo-950 to-slate-950 border-2 border-amber-500/40 shadow-xl flex flex-col items-center justify-center p-4 select-none">
        <div className="w-14 h-14 rounded-full bg-amber-500/10 border border-amber-400/30 flex items-center justify-center mb-3">
          <Crown className="w-7 h-7 text-amber-400" />
        </div>
        <span className="font-serif-title text-sm tracking-widest text-amber-300">CROWNFALL</span>
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={!selectable}
      onClick={onClick}
      className={`group relative text-left w-40 h-56 sm:w-48 sm:h-68 rounded-2xl bg-gradient-to-br ${info.color} border-2 transition-all duration-200 p-3.5 flex flex-col justify-between select-none overflow-hidden shadow-xl ${
        revealed
          ? 'border-red-500/50 opacity-65 grayscale-[45%] cursor-default'
          : selectable
            ? dangerHighlight
              ? 'border-red-400 ring-4 ring-red-500/40 hover:scale-105 cursor-pointer shadow-red-500/40'
              : selected
                ? 'border-amber-300 ring-4 ring-amber-400/50 scale-105 cursor-pointer shadow-amber-500/40'
                : 'border-white/40 hover:border-amber-300 hover:scale-102 cursor-pointer'
            : `${info.borderColor} cursor-default`
      }`}
    >
      {/* Decorative inner frame */}
      <div className="absolute inset-1.5 rounded-xl border border-white/15 pointer-events-none" />

      {/* Top Header */}
      <div className="relative z-10 flex items-start justify-between gap-1">
        <div>
          <div className="text-base sm:text-lg font-bold text-white leading-tight drop-shadow">{info.nameTh}</div>
          <div className="text-[10px] sm:text-xs font-serif-title tracking-wider text-white/75 uppercase">
            {info.nameEn}
          </div>
        </div>
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-black/35 border border-white/20 flex items-center justify-center shrink-0 shadow-inner">
          <IconComp className="w-4 h-4 sm:w-5 sm:h-5 text-amber-200" />
        </div>
      </div>

      {/* Center Emblem */}
      <div className="relative z-10 my-auto flex flex-col items-center justify-center py-1">
        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-black/30 border border-white/25 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
          <IconComp className="w-7 h-7 sm:w-8 sm:h-8 text-white drop-shadow" />
        </div>
        <span className="mt-1.5 text-[10px] sm:text-[11px] text-amber-200/90 font-medium text-center">
          {info.titleTh}
        </span>
      </div>

      {/* Bottom Ability Box */}
      <div className="relative z-10 bg-black/45 backdrop-blur-xs rounded-xl p-2 border border-white/10 space-y-1 text-[10px] sm:text-[11px] leading-snug">
        <div className="text-white/95">
          <span className="text-amber-300 font-semibold">ความสามารถ: </span>
          {info.actionText}
        </div>
        <div className="text-slate-300">
          <span className="text-sky-300 font-semibold">การบล็อก: </span>
          {info.blockText}
        </div>
      </div>

      {/* Selected Badge for Exchange */}
      {selected && !revealed && (
        <div className="absolute top-2 right-2 z-20 px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-bold text-[10px] flex items-center gap-1 shadow-lg">
          <Sparkles className="w-3 h-3" /> เลือกเก็บ
        </div>
      )}

      {/* Danger Click Prompt when losing influence */}
      {selectable && dangerHighlight && !revealed && (
        <div className="absolute inset-x-0 bottom-0 z-20 bg-red-600/95 text-white text-center py-1.5 text-xs font-bold tracking-wide animate-pulse">
          คลิกเพื่อเปิดทิ้งใบนี้
        </div>
      )}

      {/* Revealed / Dead Overlay */}
      {revealed && (
        <div className="absolute inset-0 z-20 bg-red-950/70 backdrop-blur-[1.5px] flex flex-col items-center justify-center p-3">
          <Skull className="w-9 h-9 text-red-400 mb-1" />
          <span className="px-2.5 py-1 rounded-lg bg-red-600 text-white font-bold text-xs tracking-wider uppercase shadow-lg rotate-[-8deg]">
            สิ้นอิทธิพล (เปิดแล้ว)
          </span>
        </div>
      )}
    </button>
  );
}

