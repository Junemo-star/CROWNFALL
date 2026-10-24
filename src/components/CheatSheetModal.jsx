import React, { useState } from 'react';
import { X, BookOpen, Shield, Zap, AlertTriangle, Table2, Sparkles } from 'lucide-react';
import { ROLE_INFO, DATASHEET_ROWS } from '../constants/gameData.js';

export default function CheatSheetModal({ isOpen, onClose }) {
  const [tab, setTab] = useState('datasheet'); // 'datasheet' | 'roles' | 'rules'

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
      <div className="bg-slate-900 border border-amber-500/40 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-950/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-6 h-6 text-amber-400" />
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-amber-300">
                ดาต้าชีทตัวละคร & คู่มือการเล่น CROWNFALL
              </h2>
              <p className="text-xs text-slate-400">
                คราวน์ฟอล: ศึกลวงบัลลังก์ — สำรับมาตรฐาน 15 ใบ (5 บทบาท × บทบาทละ 3 ใบ)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                type="button"
                onClick={() => setTab('datasheet')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  tab === 'datasheet' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:text-white'
                }`}
              >
                <Table2 className="w-3.5 h-3.5" /> ตารางดาต้าชีท
              </button>
              <button
                type="button"
                onClick={() => setTab('roles')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  tab === 'roles' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" /> ข้อมูล 5 โรล & เทคนิค
              </button>
              <button
                type="button"
                onClick={() => setTab('rules')}
                className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition cursor-pointer ${
                  tab === 'rules' ? 'bg-amber-500 text-slate-950' : 'text-slate-300 hover:text-white'
                }`}
              >
                <Shield className="w-3.5 h-3.5" /> กติกาจับโกหก
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6">
          {tab === 'datasheet' && (
            <div className="space-y-4">
              <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/60">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-slate-950 border-b border-slate-800 text-amber-300 uppercase text-xs">
                      <th className="py-3 px-4">บทบาท (Role)</th>
                      <th className="py-3 px-4">แอคชัน (Action)</th>
                      <th className="py-3 px-4">ค่าใช้จ่าย</th>
                      <th className="py-3 px-4">ผลลัพธ์ (Effect)</th>
                      <th className="py-3 px-4">ถูกบล็อกโดย (Counteraction)</th>
                      <th className="py-3 px-4 text-center">ท้าพิสูจน์ได้?</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {DATASHEET_ROWS.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-900/70 transition">
                        <td className="py-3 px-4 font-bold whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-lg text-xs ${row.roleBadge}`}>{row.roleTh}</span>
                        </td>
                        <td className="py-3 px-4 font-bold text-white whitespace-nowrap">{row.actionTh}</td>
                        <td className="py-3 px-4 text-amber-300 whitespace-nowrap">{row.costTh}</td>
                        <td className="py-3 px-4 text-slate-200">{row.effectTh}</td>
                        <td className="py-3 px-4 font-medium text-sky-300 whitespace-nowrap">{row.blockByTh}</td>
                        <td className="py-3 px-4 text-center">
                          {row.challengeable ? (
                            <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-xs font-semibold">
                              ท้าได้
                            </span>
                          ) : (
                            <span className="text-slate-500 text-xs">ท้าไม่ได้</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 flex flex-wrap items-center justify-between gap-2">
                <span>
                  💡 <strong>กฎเหล็ก:</strong> คุณสามารถประกาศใช้แอคชันหรือบล็อกของบทบาทใดก็ได้ แม้ไม่มีการ์ดใบนั้นในมือ (บลัฟ) ตราบใดที่ไม่มีใครกล้ากด <strong>“ขอท้าพิสูจน์”</strong>!
                </span>
                <span className="text-rose-300 font-bold">⚠️ มี 10+ เหรียญ บังคับใช้ “โค่นอำนาจ (Overthrow)” เท่านั้น!</span>
              </div>
            </div>
          )}

          {tab === 'roles' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.values(ROLE_INFO).map((role) => (
                <div
                  key={role.id}
                  className={`p-4 rounded-2xl bg-gradient-to-br ${role.color} border ${role.borderColor} flex flex-col justify-between space-y-3 shadow-lg`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-lg text-white">
                        {role.nameTh} <span className="text-xs font-normal text-white/75">({role.nameEn})</span>
                      </h3>
                      <p className="text-xs text-amber-200/90">
                        {role.titleTh} • <span className="text-white/90">{role.archetypeTh}</span>
                      </p>
                    </div>
                    <span className="text-[11px] px-2.5 py-1 rounded-full bg-black/40 text-white border border-white/15 font-semibold shrink-0">
                      มีในสำรับ {role.copies} ใบ
                    </span>
                  </div>

                  <div className="text-xs space-y-1.5 bg-black/45 p-3 rounded-xl border border-white/10">
                    <div>
                      <strong className="text-amber-300">⚡ ความสามารถหลัก:</strong> {role.actionText}
                    </div>
                    <div>
                      <strong className="text-sky-300">🛡️ ความสามารถบล็อก:</strong> {role.blockText}
                    </div>
                    <div className="pt-1 border-t border-white/10 text-emerald-200">
                      <strong>💡 เทคนิคการเล่น/บลัฟ:</strong> {role.tipsTh}
                    </div>
                  </div>

                  <p className="text-[11px] italic text-white/75 text-right">{role.quote}</p>
                </div>
              ))}
            </div>
          )}

          {tab === 'rules' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2.5">
                <div className="font-bold text-base text-amber-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-5 h-5" /> การท้าพิสูจน์ (Challenge / จับโกหก)
                </div>
                <p className="text-slate-300 leading-relaxed">
                  ทุกครั้งที่มีผู้เล่นอ้างตัวเป็นตัวละคร (เช่น รีดภาษี, ลอบปลิดชีพ, ปล้นเสบียง, สับเปลี่ยนสายลับ หรือประกาศบล็อก) ผู้เล่นอื่นสามารถกด <strong>“ขอท้าพิสูจน์”</strong> ได้:
                </p>
                <ul className="list-disc list-inside text-slate-200 space-y-1.5">
                  <li>
                    <strong className="text-rose-300">กรณีจับโกหกสำเร็จ (ผู้ถูกท้าไม่มีการ์ด):</strong> ผู้ที่โกหกต้องเปิดทิ้งการ์ด 1 ใบ และแอคชัน/การบล็อกนั้นเป็นโมฆะทันที
                  </li>
                  <li>
                    <strong className="text-emerald-300">กรณีท้าผิด (ผู้ถูกท้ามีการ์ดจริง!):</strong> ผู้ท้าต้องเป็นฝ่ายเปิดทิ้งการ์ด 1 ใบ! ส่วนเจ้าของสับการ์ดใบนั้นเข้ากองกลาง จั่วใบใหม่แทน และแอคชันนั้นเกิดผลต่อไป
                  </li>
                </ul>
              </div>

              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-2.5">
                <div className="font-bold text-base text-rose-300 flex items-center gap-1.5">
                  <Zap className="w-5 h-5" /> ทำไมถึงเสียการ์ด 2 ใบรวดได้? (Double Kill)
                </div>
                <p className="text-slate-300 leading-relaxed">
                  เมื่อคุณตกเป็นเป้าหมายของ <strong>เงาสังหาร (ลอบปลิดชีพ)</strong> คุณมีโอกาสเสียการ์ด 2 ใบในเทิร์นเดียวและตกรอบทันทีใน 2 กรณีนี้:
                </p>
                <ul className="list-disc list-inside text-slate-200 space-y-1.5">
                  <li>
                    <strong>กรณีที่ 1:</strong> คุณกดท้าพิสูจน์เงาสังหาร แต่เขามีการ์ดเงาสังหารจริง → คุณเสีย 1 ใบเพราะท้าผิด + เสียอีก 1 ใบจากคมมีดลอบปลิดชีพ!
                  </li>
                  <li>
                    <strong>กรณีที่ 2:</strong> คุณโกหกอ้างเป็นสตรีม่านเหล็กเพื่อบล็อก แล้วโดนท้าพิสูจน์จับโกหกได้ → คุณเสีย 1 ใบเพราะบลัฟพลาด + เสียอีก 1 ใบเพราะการลอบปลิดชีพสำเร็จ!
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-950/90 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm transition cursor-pointer"
          >
            ปิดหน้าต่างดาต้าชีท
          </button>
        </div>
      </div>
    </div>
  );
}
