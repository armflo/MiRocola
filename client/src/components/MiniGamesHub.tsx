import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Gamepad2,
  Trophy,
  Flame,
  Music,
  RotateCw,
  Crown,
  Volume2,
  Sparkles,
  CheckCircle2,
  XCircle,
  Swords,
  X,
  Play,
  Search
} from 'lucide-react';
import type {
  ActiveRoomGame,
  RoomState,
  User,
  MiniGameType
} from '@mirocola/shared';
import { socket } from '../services/socket';

interface MiniGamesHubProps {
  isOpen: boolean;
  onClose: () => void;
  activeGame: ActiveRoomGame | null;
  room: RoomState;
  currentUser: User | null;
}

export const MiniGamesHub: React.FC<MiniGamesHubProps> = ({
  isOpen,
  onClose,
  activeGame,
  room,
  currentUser
}) => {
  const [selectedClashOpponent, setSelectedClashOpponent] = useState<string>('');
  const [clashSongQuery, setClashSongQuery] = useState('');
  const [hasVotedClash, setHasVotedClash] = useState<'player1' | 'player2' | null>(null);
  const [selectedQuizOption, setSelectedQuizOption] = useState<string | null>(null);

  if (!isOpen) return null;

  // Handlers to trigger games
  const handleStartGame = (type: MiniGameType) => {
    socket.emit('game:start', {
      type,
      opponentUserId: type === 'clash' && selectedClashOpponent ? selectedClashOpponent : undefined
    });
  };

  const handleEndGame = () => {
    socket.emit('game:end');
  };

  const handleQuizAnswer = (optionId: string) => {
    if (selectedQuizOption || !activeGame?.quiz?.isRoundActive) return;
    setSelectedQuizOption(optionId);
    socket.emit('game:quizAnswer', optionId);
  };

  const handleClashNominate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clashSongQuery.trim()) return;
    socket.emit('game:clashNominate', clashSongQuery.trim());
    setClashSongQuery('');
  };

  const handleClashVote = (choice: 'player1' | 'player2') => {
    setHasVotedClash(choice);
    socket.emit('game:clashVote', choice);
    confetti({
      particleCount: 20,
      spread: 50,
      origin: { y: 0.7 }
    });
  };

  const handleSpinRoulette = () => {
    socket.emit('game:spinRoulette');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-950 border border-purple-800/60 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl shadow-purple-950/80 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-purple-900/40 bg-gradient-to-r from-purple-950/70 via-slate-900/90 to-indigo-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-pink-600 to-purple-600 flex items-center justify-center shadow-lg shadow-pink-500/30">
              <Gamepad2 className="w-6 h-6 text-white animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-pink-400 to-purple-300">
                  Party Minijuegos
                </h2>
                {activeGame ? (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-950/90 text-emerald-300 border border-emerald-600/60 font-bold flex items-center gap-1 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    En Vivo
                  </span>
                ) : (
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-purple-950/70 text-purple-300 border border-purple-700/50 font-bold">
                    3 Juegos Disponibles
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Diversión multijugador interactiva en tiempo real con todos los miembros
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeGame && (
              <button
                onClick={handleEndGame}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-700/60 transition-colors cursor-pointer"
              >
                Cerrar Juego
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* ======================================================== */}
          {/* VIEW 1: NO GAME ACTIVE -> SELECTOR OF 3 GAMES             */}
          {/* ======================================================== */}
          {!activeGame && (
            <div className="space-y-4">
              <div className="text-center max-w-md mx-auto mb-6">
                <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider">
                  Elige un juego para comenzar la fiesta
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Todos los participantes en la sala jugarán juntos sincronizados en tiempo real.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. QUIZ CARD */}
                <div className="bg-gradient-to-b from-purple-950/40 to-slate-900/90 border border-purple-800/40 rounded-xl p-4 flex flex-col justify-between hover:border-pink-500/60 transition-all group shadow-lg">
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-pink-500/20 border border-pink-500/40 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                      <Music className="w-6 h-6 text-pink-400" />
                    </div>
                    <span className="text-[10px] uppercase font-bold text-pink-400 tracking-wider">
                      Trivia Rápida
                    </span>
                    <h4 className="text-base font-bold text-white mt-1">
                      🎵 Adivina la Canción
                    </h4>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                      5 rondas de 12 segundos. Escucha el fragmento y adivina el tema antes que los demás para ganar puntos y rachas de fuego.
                    </p>
                  </div>
                  <button
                    onClick={() => handleStartGame('quiz')}
                    className="mt-4 w-full py-2.5 px-3 rounded-lg bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white font-bold text-xs shadow-md shadow-pink-600/30 flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>¡Jugar Quiz Ahora!</span>
                  </button>
                </div>

                {/* 2. DJ CLASH CARD */}
                <div className="bg-gradient-to-b from-indigo-950/40 to-slate-900/90 border border-indigo-800/40 rounded-xl p-4 flex flex-col justify-between hover:border-indigo-500/60 transition-all group shadow-lg">
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                      <Swords className="w-6 h-6 text-indigo-400" />
                    </div>
                    <span className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">
                      Duelo 1 vs 1
                    </span>
                    <h4 className="text-base font-bold text-white mt-1">
                      ⚔️ Batalla de DJs
                    </h4>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                      Dos participantes nominan sus mejores himnos de fiesta y la sala completa vota en tiempo real con el medidor de Hype.
                    </p>
                    {/* Opponent Picker */}
                    {room.users.length > 1 && (
                      <div className="mt-3">
                        <label className="text-[10px] text-slate-400 block mb-1">
                          Rival (Opcional):
                        </label>
                        <select
                          value={selectedClashOpponent}
                          onChange={(e) => setSelectedClashOpponent(e.target.value)}
                          className="w-full text-xs bg-slate-950 border border-indigo-800/50 rounded-lg p-1.5 text-slate-200 outline-none"
                        >
                          <option value="">Cualquiera / Auto-DJ</option>
                          {room.users
                            .filter((u) => u.id !== currentUser?.id)
                            .map((u) => (
                              <option key={u.id} value={u.id}>
                                {u.name}
                              </option>
                            ))}
                        </select>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => handleStartGame('clash')}
                    className="mt-4 w-full py-2.5 px-3 rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-xs shadow-md shadow-indigo-600/30 flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                  >
                    <Swords className="w-3.5 h-3.5" />
                    <span>¡Iniciar Batalla!</span>
                  </button>
                </div>

                {/* 3. KARAOKE ROULETTE CARD */}
                <div className="bg-gradient-to-b from-amber-950/40 to-slate-900/90 border border-amber-800/40 rounded-xl p-4 flex flex-col justify-between hover:border-amber-500/60 transition-all group shadow-lg">
                  <div>
                    <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                      <RotateCw className="w-6 h-6 text-amber-400" />
                    </div>
                    <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                      Retos & Risas
                    </span>
                    <h4 className="text-base font-bold text-white mt-1">
                      🎡 Ruleta Karaoke
                    </h4>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                      Gira el vinilo y sortea a un participante de la sala para cumplir un reto gracioso: voz de ardilla, drama de telenovela o air guitar.
                    </p>
                  </div>
                  <button
                    onClick={() => handleStartGame('roulette')}
                    className="mt-4 w-full py-2.5 px-3 rounded-lg bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white font-bold text-xs shadow-md shadow-amber-600/30 flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>¡Girar la Ruleta!</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* VIEW 2: 🎵 ACTIVE QUIZ GAME                               */}
          {/* ======================================================== */}
          {activeGame?.type === 'quiz' && activeGame.quiz && (
            <div className="space-y-5 animate-fade-in">
              {/* Header: Round & Timer */}
              <div className="flex items-center justify-between bg-slate-900/80 p-3 rounded-xl border border-purple-800/40">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-pink-950 border border-pink-700/50 text-pink-300 font-bold text-xs">
                    Ronda {activeGame.quiz.round} / {activeGame.quiz.totalRounds}
                  </span>
                  <span className="text-xs font-semibold text-slate-300">
                    {activeGame.quiz.isRoundActive ? '¡Escucha y responde!' : 'Tiempo terminado'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Segundos:</span>
                  <span
                    className={`font-mono font-black text-lg px-2.5 py-0.5 rounded-lg border ${
                      activeGame.quiz.timeRemaining <= 4
                        ? 'bg-red-950/90 border-red-500 text-red-300 animate-ping'
                        : 'bg-purple-950 border-purple-600/50 text-purple-300'
                    }`}
                  >
                    {activeGame.quiz.timeRemaining}s
                  </span>
                </div>
              </div>

              {/* Progress Countdown Bar */}
              <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 transition-all duration-1000 ease-linear"
                  style={{
                    width: `${Math.max(0, Math.min(100, (activeGame.quiz.timeRemaining / 12) * 100))}%`
                  }}
                />
              </div>

              {/* Secret Audio Snippet Player (Audio Only) */}
              {activeGame.quiz.snippetYoutubeId && (
                <div className="relative overflow-hidden rounded-xl border border-purple-800/50 bg-gradient-to-r from-purple-950/60 via-slate-900 to-indigo-950/60 p-4 text-center">
                  <div className="flex items-center justify-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-pink-500/20 border border-pink-500/40 flex items-center justify-center animate-bounce">
                      <Volume2 className="w-6 h-6 text-pink-400" />
                    </div>
                    <div className="text-left">
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>Reproduciendo Fragmento Misterioso...</span>
                        <Sparkles className="w-4 h-4 text-amber-400" />
                      </h4>
                      <p className="text-xs text-slate-400">
                        {activeGame.quiz.correctOptionId
                          ? '¡Descubierta! Mira las respuestas abajo'
                          : '¿Qué canción es? Tienes 4 opciones abajo:'}
                      </p>
                    </div>
                  </div>

                  {/* Hidden iframe that plays the snippet */}
                  <div className="opacity-0 pointer-events-none absolute -bottom-10 left-0 w-1 h-1">
                    <iframe
                      src={`https://www.youtube-nocookie.com/embed/${activeGame.quiz.snippetYoutubeId}?autoplay=1&start=${activeGame.quiz.snippetStartSeconds}&enablejsapi=1`}
                      title="Quiz Snippet"
                      allow="autoplay"
                    />
                  </div>
                </div>
              )}

              {/* 4 Big Kahoot-style Multiple Choice Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {activeGame.quiz.options.map((opt, idx) => {
                  const colors = [
                    { bg: 'from-rose-950/70 to-rose-900/40', border: 'border-rose-600/60', hover: 'hover:border-rose-400', tag: 'bg-rose-600', label: '▲' },
                    { bg: 'from-blue-950/70 to-blue-900/40', border: 'border-blue-600/60', hover: 'hover:border-blue-400', tag: 'bg-blue-600', label: '◆' },
                    { bg: 'from-amber-950/70 to-amber-900/40', border: 'border-amber-600/60', hover: 'hover:border-amber-400', tag: 'bg-amber-600', label: '●' },
                    { bg: 'from-emerald-950/70 to-emerald-900/40', border: 'border-emerald-600/60', hover: 'hover:border-emerald-400', tag: 'bg-emerald-600', label: '■' }
                  ][idx % 4];

                  const isSelected = selectedQuizOption === opt.id;
                  const isCorrect = activeGame.quiz?.correctOptionId === opt.id;
                  const isWrong = activeGame.quiz?.correctOptionId && isSelected && !isCorrect;

                  let cardStyle = `bg-gradient-to-r ${colors.bg} ${colors.border}`;
                  if (activeGame.quiz?.correctOptionId) {
                    if (isCorrect) {
                      cardStyle = 'bg-emerald-950/90 border-emerald-400 ring-2 ring-emerald-400';
                    } else if (isWrong) {
                      cardStyle = 'bg-red-950/80 border-red-500 opacity-60';
                    } else {
                      cardStyle = 'opacity-40 border-slate-800';
                    }
                  } else if (isSelected) {
                    cardStyle = 'bg-purple-900/80 border-purple-300 ring-2 ring-purple-400';
                  }

                  return (
                    <button
                      key={opt.id}
                      onClick={() => handleQuizAnswer(opt.id)}
                      disabled={!activeGame.quiz?.isRoundActive || !!selectedQuizOption}
                      className={`p-4 rounded-xl border flex items-center justify-between text-left transition-all active:scale-[0.98] cursor-pointer ${cardStyle} ${
                        !activeGame.quiz?.correctOptionId && !selectedQuizOption ? colors.hover : ''
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`w-8 h-8 rounded-lg ${colors.tag} text-white font-black text-sm flex items-center justify-center flex-shrink-0 shadow-md`}>
                          {colors.label}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-white truncate">
                            {opt.title}
                          </p>
                          <p className="text-xs text-slate-300 truncate">
                            {opt.artist}
                          </p>
                        </div>
                      </div>

                      {/* Icon status */}
                      {isCorrect && (
                        <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0" />
                      )}
                      {isWrong && (
                        <XCircle className="w-6 h-6 text-red-400 flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Leaderboard Table */}
              <div className="bg-slate-900/80 rounded-xl p-3 border border-purple-900/30">
                <h5 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Trophy className="w-3.5 h-3.5 text-amber-400" />
                  Tabla de Puntuaciones
                </h5>
                <div className="flex flex-wrap gap-2">
                  {Object.values(activeGame.quiz.scores)
                    .sort((a, b) => b.score - a.score)
                    .map((item, index) => (
                      <div
                        key={item.userId}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950 border border-purple-800/40 text-xs"
                      >
                        <span className="font-bold text-amber-400">#{index + 1}</span>
                        {item.avatar && (
                          <img
                            src={item.avatar}
                            alt=""
                            className="w-5 h-5 rounded-full object-cover"
                          />
                        )}
                        <span className="font-semibold text-slate-200">
                          {item.userName}
                        </span>
                        {item.streak > 1 && (
                          <span className="flex items-center gap-0.5 text-orange-400 font-bold text-[11px]">
                            <Flame className="w-3 h-3 fill-current" />
                            {item.streak}
                          </span>
                        )}
                        <span className="font-mono font-bold text-pink-400 ml-1">
                          {item.score} pts
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Winner Celebration Modal when game is finished */}
              {activeGame.quiz.winner && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/20 via-pink-500/20 to-purple-500/20 border-2 border-amber-400 text-center animate-fade-in shadow-xl">
                  <Crown className="w-10 h-10 text-amber-400 mx-auto animate-bounce mb-1" />
                  <h4 className="text-lg font-black text-amber-300">
                    ¡CAMPEÓN DE LA TRIVIA!
                  </h4>
                  <p className="text-base font-bold text-white mt-1">
                    {activeGame.quiz.winner.userName} con {activeGame.quiz.winner.score} puntos
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* VIEW 3: ⚔️ ACTIVE DJ CLASH GAME                           */}
          {/* ======================================================== */}
          {activeGame?.type === 'clash' && activeGame.clash && (
            <div className="space-y-5 animate-fade-in">
              {/* Clash Header / Status */}
              <div className="flex items-center justify-between bg-slate-900/80 p-3 rounded-xl border border-indigo-800/40">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-lg bg-indigo-950 border border-indigo-600/50 text-indigo-300 font-bold text-xs">
                    {activeGame.clash.stage === 'nominating'
                      ? 'Fase: Nominación de Temas'
                      : activeGame.clash.stage === 'battling'
                      ? '🔥 Duelo en Vivo & Votación'
                      : '🏆 Resultados Finales'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">Tiempo:</span>
                  <span className="font-mono font-black text-lg text-indigo-300 px-2 py-0.5 rounded-lg bg-indigo-950 border border-indigo-800">
                    {activeGame.clash.timeRemaining}s
                  </span>
                </div>
              </div>

              {/* Two Corners Arena */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* PLAYER 1 CORNER (RED) */}
                <div
                  className={`p-4 rounded-xl border transition-all ${
                    hasVotedClash === 'player1'
                      ? 'bg-rose-950/70 border-rose-500 ring-2 ring-rose-400'
                      : 'bg-gradient-to-b from-rose-950/30 to-slate-900 border-rose-800/50'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <img
                      src={activeGame.clash.player1.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=p1'}
                      alt=""
                      className="w-10 h-10 rounded-full border border-rose-500 object-cover"
                    />
                    <div>
                      <span className="text-[10px] font-bold uppercase text-rose-400">
                        Esquina Roja
                      </span>
                      <h4 className="text-sm font-bold text-white">
                        {activeGame.clash.player1.userName}
                      </h4>
                    </div>
                  </div>

                  {activeGame.clash.player1.song ? (
                    <div className="bg-slate-950/80 p-3 rounded-lg border border-rose-900/40 flex items-center gap-3">
                      <img
                        src={activeGame.clash.player1.song.thumbnail}
                        alt=""
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">
                          {activeGame.clash.player1.song.title}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">
                          {activeGame.clash.player1.song.artist}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 border border-dashed border-rose-800/50 rounded-lg text-center text-xs text-rose-300">
                      Eligiendo himno musical...
                    </div>
                  )}

                  {activeGame.clash.stage === 'battling' && (
                    <button
                      onClick={() => handleClashVote('player1')}
                      className="mt-3 w-full py-2 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/30 flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                    >
                      <Flame className="w-4 h-4 fill-current" />
                      <span>¡Votar Esquina Roja! ({activeGame.clash.player1.votes})</span>
                    </button>
                  )}
                </div>

                {/* PLAYER 2 CORNER (BLUE) */}
                <div
                  className={`p-4 rounded-xl border transition-all ${
                    hasVotedClash === 'player2'
                      ? 'bg-blue-950/70 border-blue-500 ring-2 ring-blue-400'
                      : 'bg-gradient-to-b from-blue-950/30 to-slate-900 border-blue-800/50'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <img
                      src={activeGame.clash.player2.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=p2'}
                      alt=""
                      className="w-10 h-10 rounded-full border border-blue-500 object-cover"
                    />
                    <div>
                      <span className="text-[10px] font-bold uppercase text-blue-400">
                        Esquina Azul
                      </span>
                      <h4 className="text-sm font-bold text-white">
                        {activeGame.clash.player2.userName}
                      </h4>
                    </div>
                  </div>

                  {activeGame.clash.player2.song ? (
                    <div className="bg-slate-950/80 p-3 rounded-lg border border-blue-900/40 flex items-center gap-3">
                      <img
                        src={activeGame.clash.player2.song.thumbnail}
                        alt=""
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">
                          {activeGame.clash.player2.song.title}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">
                          {activeGame.clash.player2.song.artist}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 border border-dashed border-blue-800/50 rounded-lg text-center text-xs text-blue-300">
                      Eligiendo himno musical...
                    </div>
                  )}

                  {activeGame.clash.stage === 'battling' && (
                    <button
                      onClick={() => handleClashVote('player2')}
                      className="mt-3 w-full py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md shadow-blue-600/30 flex items-center justify-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                    >
                      <Flame className="w-4 h-4 fill-current" />
                      <span>¡Votar Esquina Azul! ({activeGame.clash.player2.votes})</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Live Hype Progress Meter */}
              {activeGame.clash.stage === 'battling' && (
                <div className="bg-slate-900/90 p-3 rounded-xl border border-indigo-800/40 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-rose-400">
                      {activeGame.clash.player1.votes} VOTOS (
                      {Math.round(
                        (activeGame.clash.player1.votes /
                          Math.max(1, activeGame.clash.player1.votes + activeGame.clash.player2.votes)) *
                          100
                      )}
                      %)
                    </span>
                    <span className="text-amber-300 flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 fill-current" />
                      MEDIDOR DE HYPE EN VIVO
                    </span>
                    <span className="text-blue-400">
                      {activeGame.clash.player2.votes} VOTOS (
                      {Math.round(
                        (activeGame.clash.player2.votes /
                          Math.max(1, activeGame.clash.player1.votes + activeGame.clash.player2.votes)) *
                          100
                      )}
                      %)
                    </span>
                  </div>
                  <div className="h-4 w-full bg-slate-950 rounded-full overflow-hidden flex border border-slate-800">
                    <div
                      className="bg-rose-600 transition-all duration-500"
                      style={{
                        width: `${
                          (activeGame.clash.player1.votes /
                            Math.max(1, activeGame.clash.player1.votes + activeGame.clash.player2.votes)) *
                          100
                        }%`
                      }}
                    />
                    <div
                      className="bg-blue-600 transition-all duration-500"
                      style={{
                        width: `${
                          (activeGame.clash.player2.votes /
                            Math.max(1, activeGame.clash.player1.votes + activeGame.clash.player2.votes)) *
                          100
                        }%`
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Stage: Nominating form if user is one of the players */}
              {activeGame.clash.stage === 'nominating' &&
                (currentUser?.id === activeGame.clash.player1.userId ||
                  currentUser?.id === activeGame.clash.player2.userId) && (
                  <form
                    onSubmit={handleClashNominate}
                    className="p-3 bg-slate-900/90 rounded-xl border border-indigo-800/40 flex gap-2"
                  >
                    <input
                      type="text"
                      placeholder="Escribe el nombre o link de tu canción para el duelo..."
                      value={clashSongQuery}
                      onChange={(e) => setClashSongQuery(e.target.value)}
                      className="flex-1 bg-slate-950 border border-indigo-700/50 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 outline-none"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <Search className="w-3.5 h-3.5" />
                      <span>Fijar Canción</span>
                    </button>
                  </form>
                )}

              {/* Clash Winner Modal */}
              {activeGame.clash.stage === 'finished' && (
                <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/20 via-pink-500/20 to-indigo-500/20 border-2 border-amber-400 text-center animate-fade-in shadow-xl">
                  <Crown className="w-10 h-10 text-amber-400 mx-auto animate-bounce mb-1" />
                  <h4 className="text-lg font-black text-amber-300">
                    ¡DJ GANADOR DE LA BATALLA!
                  </h4>
                  <p className="text-base font-bold text-white mt-1">
                    {activeGame.clash.winner === 'player1'
                      ? activeGame.clash.player1.userName
                      : activeGame.clash.winner === 'player2'
                      ? activeGame.clash.player2.userName
                      : '¡Empate Épico!'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* VIEW 4: 🎡 ACTIVE ROULETTE GAME                           */}
          {/* ======================================================== */}
          {activeGame?.type === 'roulette' && activeGame.roulette && (
            <div className="space-y-6 text-center animate-fade-in py-4">
              {/* Spinning Disc Animation */}
              <div className="relative w-48 h-48 mx-auto flex items-center justify-center">
                <div
                  className={`w-44 h-44 rounded-full border-4 border-amber-400 bg-slate-950 flex items-center justify-center shadow-2xl shadow-amber-500/40 ${
                    activeGame.roulette.isSpinning ? 'animate-spin' : ''
                  }`}
                  style={{ animationDuration: '0.6s' }}
                >
                  <div className="w-28 h-28 rounded-full border-2 border-amber-500/40 bg-gradient-to-tr from-amber-600 via-rose-600 to-purple-600 flex items-center justify-center">
                    <span className="text-3xl">🎡</span>
                  </div>
                </div>
                {/* Pointer Arrow */}
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-2xl text-amber-400 animate-bounce">
                  ▼
                </div>
              </div>

              {/* Status Message */}
              {activeGame.roulette.isSpinning ? (
                <div>
                  <h4 className="text-base font-black text-amber-300 animate-pulse">
                    ¡La ruleta está girando...!
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    Eligiendo al próximo cantante o víctima para el reto karaoke
                  </p>
                </div>
              ) : activeGame.roulette.challenge && activeGame.roulette.selectedUserName ? (
                <div className="max-w-md mx-auto p-5 rounded-2xl bg-gradient-to-b from-amber-950/60 to-slate-900 border-2 border-amber-500/80 shadow-2xl space-y-3">
                  <div className="flex items-center justify-center gap-2">
                    {activeGame.roulette.selectedUserAvatar && (
                      <img
                        src={activeGame.roulette.selectedUserAvatar}
                        alt=""
                        className="w-10 h-10 rounded-full border-2 border-amber-400 object-cover"
                      />
                    )}
                    <span className="text-lg font-black text-white">
                      @{activeGame.roulette.selectedUserName}
                    </span>
                  </div>

                  <span className="inline-block text-3xl">
                    {activeGame.roulette.challenge.emoji}
                  </span>

                  <div>
                    <h5 className="text-base font-black text-amber-300">
                      {activeGame.roulette.challenge.title}
                    </h5>
                    <p className="text-xs text-slate-200 mt-1.5 leading-relaxed font-medium">
                      {activeGame.roulette.challenge.description}
                    </p>
                  </div>

                  <button
                    onClick={handleSpinRoulette}
                    className="mt-3 py-2 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white font-bold text-xs shadow-md shadow-amber-600/30 inline-flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>¡Girar de Nuevo!</span>
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
