import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { GAME_PHASES } from './constants/gameData.js';
import LobbyView from './components/LobbyView.jsx';
import GameBoard from './components/GameBoard.jsx';
import { sound } from './utils/sound.js';

function getOrCreatePlayerId() {
  let id = sessionStorage.getItem('coup_player_id');
  if (!id) {
    id = `p-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    sessionStorage.setItem('coup_player_id', id);
  }
  return id;
}

export default function App() {
  const [playerId] = useState(getOrCreatePlayerId);
  const [playerName, setPlayerName] = useState(() => localStorage.getItem('coup_player_name') || '');
  const [playerAvatar, setPlayerAvatar] = useState(() => localStorage.getItem('coup_player_avatar') || '🦊');
  const [roomState, setRoomState] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [floatingReactions, setFloatingReactions] = useState({});
  const socketRef = useRef(null);

  const urlParams = new URLSearchParams(window.location.search);
  const initialRoomCode = urlParams.get('room')?.toUpperCase() || '';

  useEffect(() => {
    localStorage.setItem('coup_player_name', playerName);
  }, [playerName]);

  useEffect(() => {
    localStorage.setItem('coup_player_avatar', playerAvatar);
  }, [playerAvatar]);

  const showError = (msg) => {
    setErrorMsg(msg);
    setTimeout(() => {
      setErrorMsg((curr) => (curr === msg ? '' : curr));
    }, 4000);
  };

  useEffect(() => {
    const socket = io(window.location.origin, {
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      // Auto-rejoin if user refreshed tab while in a room
      const savedRoom = sessionStorage.getItem('coup_active_room');
      const savedName = localStorage.getItem('coup_player_name');
      const savedAvatar = localStorage.getItem('coup_player_avatar') || '🦊';
      if (savedRoom && savedName) {
        socket.emit('join_room', {
          roomCode: savedRoom,
          playerId,
          name: savedName,
          avatar: savedAvatar,
        }, (res) => {
          if (!res?.ok) {
            sessionStorage.removeItem('coup_active_room');
          }
        });
      }
    });

    socket.on('room_state', (state) => {
      setRoomState(state);
      if (state?.code) {
        sessionStorage.setItem('coup_active_room', state.code);
      }
    });

    socket.on('chat_message', (msg) => {
      sound.playCoin();
      setFloatingReactions((prev) => ({
        ...prev,
        [msg.playerId]: msg,
      }));
    });

    return () => {
      socket.disconnect();
    };
  }, [playerId]);

  const emitWithCallback = (event, payload = {}) => {
    if (!socketRef.current) return;
    socketRef.current.emit(
      event,
      {
        roomCode: roomState?.code,
        playerId,
        ...payload,
      },
      (res) => {
        if (res && !res.ok && res.error) {
          showError(res.error);
        }
      }
    );
  };

  const handleCreateRoom = () => {
    if (!playerName.trim()) {
      showError('กรุณาตั้งชื่อของคุณก่อนสร้างห้อง');
      return;
    }
    sound.init();
    socketRef.current?.emit(
      'create_room',
      {
        playerId,
        name: playerName.trim(),
        avatar: playerAvatar,
      },
      (res) => {
        if (!res?.ok) {
          showError(res?.error || 'ไม่สามารถสร้างห้องได้');
        }
      }
    );
  };

  const handleJoinRoom = (codeToJoin) => {
    if (!playerName.trim()) {
      showError('กรุณาตั้งชื่อของคุณก่อนเข้าร่วมห้อง');
      return;
    }
    if (!codeToJoin?.trim()) {
      showError('กรุณากรอกรหัสห้อง');
      return;
    }
    sound.init();
    socketRef.current?.emit(
      'join_room',
      {
        roomCode: codeToJoin.trim().toUpperCase(),
        playerId,
        name: playerName.trim(),
        avatar: playerAvatar,
      },
      (res) => {
        if (!res?.ok) {
          showError(res?.error || 'เข้าร่วมห้องไม่สำเร็จ');
        }
      }
    );
  };

  const handleLeaveRoom = () => {
    if (!roomState) return;
    socketRef.current?.emit('leave_room', { roomCode: roomState.code, playerId }, () => {
      sessionStorage.removeItem('coup_active_room');
      setRoomState(null);
      if (window.location.search.includes('room=')) {
        window.history.replaceState({}, '', window.location.pathname);
      }
    });
  };

  return (
    <>
      {!roomState || roomState.phase === GAME_PHASES.LOBBY ? (
        <LobbyView
          roomState={roomState}
          playerId={playerId}
          playerName={playerName}
          setPlayerName={setPlayerName}
          playerAvatar={playerAvatar}
          setPlayerAvatar={setPlayerAvatar}
          initialRoomCode={initialRoomCode}
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRoom}
          onLeaveRoom={handleLeaveRoom}
          onAddBot={() => emitWithCallback('add_bot')}
          onKickPlayer={(targetId) => emitWithCallback('kick_player', { targetId })}
          onUpdateRoleCounts={(roleCounts) => emitWithCallback('update_role_counts', { roleCounts })}
          onStartGame={() => emitWithCallback('start_game')}
          errorMsg={errorMsg}
        />
      ) : (
        <GameBoard
          roomState={roomState}
          playerId={playerId}
          onDeclareAction={(actionType, targetId) =>
            emitWithCallback('declare_action', { actionType, targetId })
          }
          onPassAction={() => emitWithCallback('pass_action')}
          onChallengeAction={() => {
            sound.playChallenge();
            emitWithCallback('challenge_action');
          }}
          onBlockAction={(claimedRole) => emitWithCallback('block_action', { claimedRole })}
          onPassBlock={() => emitWithCallback('pass_block')}
          onChallengeBlock={() => {
            sound.playChallenge();
            emitWithCallback('challenge_block');
          }}
          onChooseInfluenceLoss={(cardIndex) =>
            emitWithCallback('choose_influence_loss', { cardIndex })
          }
          onSubmitExchange={(selectedIndices) =>
            emitWithCallback('submit_exchange', { selectedIndices })
          }
          onStartRematch={() => emitWithCallback('start_game')}
          onBackToLobby={() => emitWithCallback('back_to_lobby')}
          onLeaveRoom={handleLeaveRoom}
          onSendChat={(text, emoji) =>
            socketRef.current?.emit('send_chat', {
              roomCode: roomState.code,
              playerId,
              text,
              emoji,
            })
          }
          floatingReactions={floatingReactions}
          errorMsg={errorMsg}
        />
      )}
    </>
  );
}

