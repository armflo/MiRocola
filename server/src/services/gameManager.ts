import {
  ActiveRoomGame,
  MiniGameType,
  QuizGameState,
  QuizOption,
  QuizScoreItem,
  ClashGameState,
  ClashParticipant,
  RouletteGameState,
  RouletteChallenge,
  ChatMessage
} from '@mirocola/shared';
import { YouTubeService } from './youtubeService.js';
import { RoomManager } from './roomManager.js';

interface SongCatalogItem {
  youtubeId: string;
  title: string;
  artist: string;
  startSeconds: number;
}

const QUIZ_SONG_CATALOG: SongCatalogItem[] = [
  { youtubeId: 'fJ9rUzIMcZQ', title: 'Bohemian Rhapsody', artist: 'Queen', startSeconds: 50 },
  { youtubeId: 'T_FkEwDHBrg', title: 'De Música Ligera', artist: 'Soda Stereo', startSeconds: 30 },
  { youtubeId: 'DUT5rEU6pqM', title: "Hips Don't Lie", artist: 'Shakira', startSeconds: 20 },
  { youtubeId: 'T080u1Gf3x4', title: 'La Incondicional', artist: 'Luis Miguel', startSeconds: 45 },
  { youtubeId: 'Zi_XLOBDo_Y', title: 'Billie Jean', artist: 'Michael Jackson', startSeconds: 35 },
  { youtubeId: 'CCF1_jI5Elo', title: 'Gasolina', artist: 'Daddy Yankee', startSeconds: 20 },
  { youtubeId: 'k9Lw2d9y6_8', title: 'Lamento Boliviano', artist: 'Enanitos Verdes', startSeconds: 35 },
  { youtubeId: 'uZbmX_0oTbg', title: 'Rayando el Sol', artist: 'Maná', startSeconds: 40 },
  { youtubeId: '7zp1TbLFPp8', title: 'Danza Kuduro', artist: 'Don Omar ft. Lucenzo', startSeconds: 20 },
  { youtubeId: 'Cr8K88UcO08', title: 'Tití Me Preguntó', artist: 'Bad Bunny', startSeconds: 25 },
  { youtubeId: 'fNFzfwLM72c', title: "Stayin' Alive", artist: 'Bee Gees', startSeconds: 30 },
  { youtubeId: 'kRt2SZu926s', title: 'La Camisa Negra', artist: 'Juanes', startSeconds: 20 },
  { youtubeId: '29n02W7Z08Y', title: 'Torero', artist: 'Chayanne', startSeconds: 30 },
  { youtubeId: 'xFrGuyw1Vm8', title: 'Dancing Queen', artist: 'ABBA', startSeconds: 20 },
  { youtubeId: 'lArGoMX4U4E', title: 'La Vida Es Un Carnaval', artist: 'Celia Cruz', startSeconds: 30 },
  { youtubeId: 'lDK9QqIzhwk', title: "Livin' on a Prayer", artist: 'Bon Jovi', startSeconds: 45 },
  { youtubeId: '29f8d95JqO0', title: '17 Años', artist: 'Los Ángeles Azules', startSeconds: 35 },
  { youtubeId: '1w7OgIMMRc4', title: "Sweet Child O' Mine", artist: "Guns N' Roses", startSeconds: 20 },
  { youtubeId: 'p47fEXGABAQ', title: "Livin' La Vida Loca", artist: 'Ricky Martin', startSeconds: 25 },
  { youtubeId: 'OPf0YbXqDm0', title: 'Uptown Funk', artist: 'Mark Ronson ft. Bruno Mars', startSeconds: 30 },
  { youtubeId: 'kJQP7kiw5Fk', title: 'Despacito', artist: 'Luis Fonsi ft. Daddy Yankee', startSeconds: 30 },
  { youtubeId: 'V0PisGe66mY', title: 'Aserejé', artist: 'Las Ketchup', startSeconds: 25 }
];

const ROULETTE_CHALLENGES: RouletteChallenge[] = [
  {
    id: 'ch_1',
    title: 'Voz de Ardillita 🐿️',
    description: 'Canta el próximo coro de la canción con voz aguda o de ardilla.',
    category: 'vocal',
    emoji: '🐿️'
  },
  {
    id: 'ch_2',
    title: 'Drama de Telenovela 🎭',
    description: 'Canta los siguientes 30 segundos con acento dramático y gestos de telenovela.',
    category: 'vocal',
    emoji: '🎭'
  },
  {
    id: 'ch_3',
    title: 'A Capella Retro 🎤',
    description: 'Canta un coro de una canción de los 90s a capella sin ver la letra.',
    category: 'memory',
    emoji: '🎤'
  },
  {
    id: 'ch_4',
    title: 'Dedicatoria Romántica ❤️',
    description: 'Dedica la siguiente canción a alguien de la sala explicando una razón graciosa.',
    category: 'dedication',
    emoji: '❤️'
  },
  {
    id: 'ch_5',
    title: 'Coreografía en Vivo 💃',
    description: 'Baila como si estuvieras en un videoclip oficial de reggaeton o pop.',
    category: 'punishment',
    emoji: '💃'
  },
  {
    id: 'ch_6',
    title: 'Imitación de Leyenda 🦁',
    description: 'Canta imitando a Shakira, Luis Miguel o Bad Bunny.',
    category: 'vocal',
    emoji: '🦁'
  },
  {
    id: 'ch_7',
    title: 'Compositor Gourmet 🍔',
    description: 'Cambia la letra del coro para que hable de tu comida favorita.',
    category: 'vocal',
    emoji: '🍔'
  },
  {
    id: 'ch_8',
    title: 'Intro de Caricaturas 📺',
    description: 'Canta el tema de tu caricatura favorita de la infancia a todo pulmón.',
    category: 'memory',
    emoji: '📺'
  },
  {
    id: 'ch_9',
    title: 'Solo de Air Guitar 🎸',
    description: 'Haz un solo épico de guitarra imaginaria durante el siguiente solo o coro.',
    category: 'dedication',
    emoji: '🎸'
  },
  {
    id: 'ch_10',
    title: 'Beatbox Maestro 🥁',
    description: 'Haz beatbox de acompañamiento durante 15 segundos sobre la pista.',
    category: 'vocal',
    emoji: '🥁'
  },
  {
    id: 'ch_11',
    title: 'Abecedario Musical 🔤',
    description: 'Canta el abecedario al ritmo exacto del beat actual.',
    category: 'memory',
    emoji: '🔤'
  },
  {
    id: 'ch_12',
    title: 'Voz de Radio Nocturna 📻',
    description: 'Manda un saludo con voz sensual de locutor de radio de medianoche a la sala.',
    category: 'vocal',
    emoji: '📻'
  },
  {
    id: 'ch_13',
    title: 'Dúo Espontáneo 👥',
    description: 'Elige a otro participante y canten juntos la siguiente estrofa.',
    category: 'dedication',
    emoji: '👥'
  },
  {
    id: 'ch_14',
    title: 'Shot o 5 Sentadillas 🥃',
    description: 'Toma un trago de tu bebida o haz 5 sentadillas al ritmo del coro.',
    category: 'punishment',
    emoji: '🥃'
  }
];

export class GameManager {
  private static instance: GameManager;
  private activeGames = new Map<string, ActiveRoomGame>();
  private gameTimers = new Map<string, NodeJS.Timeout>();
  private roundUserAnswers = new Map<string, Map<string, { optionId: string; time: number }>>(); // roomCode -> (userId -> answer)
  private onBroadcastGame?: (roomCode: string, game: ActiveRoomGame | null) => void;
  private onBroadcastNotification?: (roomCode: string, data: { title: string; message: string; emoji: string }) => void;
  private onSendSystemChat?: (roomCode: string, text: string) => void;

  private constructor() {}

  public static getInstance(): GameManager {
    if (!GameManager.instance) {
      GameManager.instance = new GameManager();
    }
    return GameManager.instance;
  }

  public setCallbacks(
    onGameUpdate: (roomCode: string, game: ActiveRoomGame | null) => void,
    onNotification: (roomCode: string, data: { title: string; message: string; emoji: string }) => void,
    onSystemChat: (roomCode: string, text: string) => void
  ) {
    this.onBroadcastGame = onGameUpdate;
    this.onBroadcastNotification = onNotification;
    this.onSendSystemChat = onSystemChat;
  }

  public getGame(roomCode: string): ActiveRoomGame | null {
    return this.activeGames.get(roomCode) || null;
  }

  private clearTimer(roomCode: string) {
    const existing = this.gameTimers.get(roomCode);
    if (existing) {
      clearTimeout(existing);
      clearInterval(existing);
      this.gameTimers.delete(roomCode);
    }
  }

  public stopGame(roomCode: string) {
    this.clearTimer(roomCode);
    this.activeGames.delete(roomCode);
    this.roundUserAnswers.delete(roomCode);
    if (this.onBroadcastGame) {
      this.onBroadcastGame(roomCode, null);
    }
  }

  // ==========================================
  // 🎵 1. ADIVINA LA CANCIÓN (QUIZ)
  // ==========================================
  public startQuiz(roomCode: string, requestingUser?: { id: string; name: string; avatar: string }) {
    this.clearTimer(roomCode);
    this.roundUserAnswers.set(roomCode, new Map());

    const initialScores: Record<string, QuizScoreItem> = {};
    if (requestingUser) {
      initialScores[requestingUser.id] = {
        userId: requestingUser.id,
        userName: requestingUser.name,
        avatar: requestingUser.avatar,
        score: 0,
        streak: 0
      };
    }

    const game: ActiveRoomGame = {
      type: 'quiz',
      quiz: {
        round: 1,
        totalRounds: 5,
        snippetYoutubeId: '',
        snippetStartSeconds: 30,
        options: [],
        correctOptionId: null,
        timeRemaining: 12,
        isRoundActive: false,
        scores: initialScores
      }
    };

    this.activeGames.set(roomCode, game);
    if (this.onSendSystemChat) {
      this.onSendSystemChat(roomCode, '🎵 ¡Comenzó Adivina la Canción! Escucha el fragmento y sé el más rápido en acertar.');
    }

    this.launchQuizRound(roomCode, 1);
  }

  private launchQuizRound(roomCode: string, roundNum: number) {
    const game = this.activeGames.get(roomCode);
    if (!game || game.type !== 'quiz' || !game.quiz) return;

    this.clearTimer(roomCode);
    this.roundUserAnswers.set(roomCode, new Map());

    // Select random correct song
    const shuffledCatalog = [...QUIZ_SONG_CATALOG].sort(() => Math.random() - 0.5);
    const targetSong = shuffledCatalog[0];

    // Pick 3 distractors
    const distractors = shuffledCatalog.slice(1, 4);
    const optionsRaw = [
      { id: 'opt_correct', title: targetSong.title, artist: targetSong.artist },
      { id: 'opt_w1', title: distractors[0].title, artist: distractors[0].artist },
      { id: 'opt_w2', title: distractors[1].title, artist: distractors[1].artist },
      { id: 'opt_w3', title: distractors[2].title, artist: distractors[2].artist }
    ].sort(() => Math.random() - 0.5);

    game.quiz.round = roundNum;
    game.quiz.snippetYoutubeId = targetSong.youtubeId;
    game.quiz.snippetStartSeconds = targetSong.startSeconds;
    game.quiz.options = optionsRaw;
    game.quiz.correctOptionId = null; // Secret until round ends!
    game.quiz.timeRemaining = 12;
    game.quiz.isRoundActive = true;

    // Reset lastAnswerCorrect indicator
    for (const score of Object.values(game.quiz.scores)) {
      delete score.lastAnswerCorrect;
    }

    this.broadcastUpdate(roomCode);

    // Countdown interval
    let secondsLeft = 12;
    const interval = setInterval(() => {
      secondsLeft -= 1;
      const current = this.activeGames.get(roomCode);
      if (!current || !current.quiz) {
        clearInterval(interval);
        return;
      }

      current.quiz.timeRemaining = secondsLeft;

      if (secondsLeft <= 0) {
        clearInterval(interval);
        this.endQuizRound(roomCode, 'opt_correct');
      } else {
        this.broadcastUpdate(roomCode);
      }
    }, 1000);

    this.gameTimers.set(roomCode, interval);
  }

  public submitQuizAnswer(roomCode: string, user: { id: string; name: string; avatar: string }, optionId: string) {
    const game = this.activeGames.get(roomCode);
    if (!game || game.type !== 'quiz' || !game.quiz || !game.quiz.isRoundActive) return;

    const roundAnswers = this.roundUserAnswers.get(roomCode);
    if (!roundAnswers || roundAnswers.has(user.id)) return; // Already answered this round

    roundAnswers.set(user.id, { optionId, time: Date.now() });

    // Initialize score entry if first time playing
    if (!game.quiz.scores[user.id]) {
      game.quiz.scores[user.id] = {
        userId: user.id,
        userName: user.name,
        avatar: user.avatar,
        score: 0,
        streak: 0
      };
    }

    const isCorrect = optionId === 'opt_correct';
    const userScore = game.quiz.scores[user.id];

    if (isCorrect) {
      // Faster answer gives more points (up to 1000 pts)
      const speedBonus = Math.max(100, (game.quiz.timeRemaining || 1) * 80);
      userScore.streak = (userScore.streak || 0) + 1;
      const streakMultiplier = Math.min(2.0, 1 + (userScore.streak - 1) * 0.25);
      const pointsEarned = Math.round((500 + speedBonus) * streakMultiplier);

      userScore.score += pointsEarned;
      userScore.lastAnswerCorrect = true;
    } else {
      userScore.streak = 0;
      userScore.lastAnswerCorrect = false;
    }

    this.broadcastUpdate(roomCode);
  }

  private endQuizRound(roomCode: string, correctOptionId: string) {
    const game = this.activeGames.get(roomCode);
    if (!game || !game.quiz) return;

    this.clearTimer(roomCode);
    game.quiz.isRoundActive = false;
    game.quiz.correctOptionId = correctOptionId;
    game.quiz.timeRemaining = 0;

    const correctSong = game.quiz.options.find((o) => o.id === correctOptionId);
    if (correctSong && this.onBroadcastNotification) {
      this.onBroadcastNotification(roomCode, {
        title: `Ronda ${game.quiz.round} Terminada`,
        message: `Era: ${correctSong.title} - ${correctSong.artist}`,
        emoji: '🎶'
      });
    }

    this.broadcastUpdate(roomCode);

    // After 4 seconds, either next round or final podium
    const timeout = setTimeout(() => {
      const currentGame = this.activeGames.get(roomCode);
      if (!currentGame || !currentGame.quiz) return;

      if (currentGame.quiz.round < currentGame.quiz.totalRounds) {
        this.launchQuizRound(roomCode, currentGame.quiz.round + 1);
      } else {
        // Quiz finished! Determine winner
        const scoresArr = Object.values(currentGame.quiz.scores);
        scoresArr.sort((a, b) => b.score - a.score);
        const topWinner = scoresArr[0];

        currentGame.quiz.winner = topWinner;
        this.broadcastUpdate(roomCode);

        if (topWinner && this.onSendSystemChat) {
          this.onSendSystemChat(
            roomCode,
            `🏆 ¡Ganador del Quiz Musical! ${topWinner.userName} con ${topWinner.score} puntos 🥇🎉`
          );
        }

        // Auto clean up after 10 seconds of glory
        setTimeout(() => {
          this.stopGame(roomCode);
        }, 10000);
      }
    }, 4500);

    this.gameTimers.set(roomCode, timeout);
  }

  // ==========================================
  // ⚔️ 2. BATALLA DE DJS (HYPE DUEL)
  // ==========================================
  public async startClash(
    roomCode: string,
    player1User: { id: string; name: string; avatar: string },
    player2User?: { id: string; name: string; avatar: string }
  ) {
    this.clearTimer(roomCode);

    // Default opponent if not specified
    const p2: ClashParticipant = player2User
      ? { userId: player2User.id, userName: player2User.name, avatar: player2User.avatar, votes: 0 }
      : {
          userId: 'autodj_rival',
          userName: 'DJ Rival 🎧',
          avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=djrival',
          votes: 0
        };

    const p1: ClashParticipant = {
      userId: player1User.id,
      userName: player1User.name,
      avatar: player1User.avatar,
      votes: 0
    };

    const game: ActiveRoomGame = {
      type: 'clash',
      clash: {
        player1: p1,
        player2: p2,
        stage: 'nominating',
        timeRemaining: 20,
        userVotes: {}
      }
    };

    this.activeGames.set(roomCode, game);
    if (this.onSendSystemChat) {
      this.onSendSystemChat(
        roomCode,
        `⚔️ ¡Batalla de DJs iniciada! [${p1.userName}] VS [${p2.userName}]. ¡Preparen sus mejores temas!`
      );
    }

    this.broadcastUpdate(roomCode);

    // Give 20s to nominate, or default to two famous club tracks
    let nominateCountdown = 20;
    const interval = setInterval(async () => {
      nominateCountdown -= 1;
      const cur = this.activeGames.get(roomCode);
      if (!cur || !cur.clash) {
        clearInterval(interval);
        return;
      }

      cur.clash.timeRemaining = nominateCountdown;

      if (nominateCountdown <= 0) {
        clearInterval(interval);
        // Ensure both players have songs
        if (!cur.clash.player1.song) {
          cur.clash.player1.song = {
            youtubeId: 'CCF1_jI5Elo',
            title: 'Gasolina',
            artist: 'Daddy Yankee',
            thumbnail: 'https://i.ytimg.com/vi/CCF1_jI5Elo/hqdefault.jpg'
          };
        }
        if (!cur.clash.player2.song) {
          cur.clash.player2.song = {
            youtubeId: '7zp1TbLFPp8',
            title: 'Danza Kuduro',
            artist: 'Don Omar',
            thumbnail: 'https://i.ytimg.com/vi/7zp1TbLFPp8/hqdefault.jpg'
          };
        }

        this.startClashBattlePhase(roomCode);
      } else {
        this.broadcastUpdate(roomCode);
      }
    }, 1000);

    this.gameTimers.set(roomCode, interval);
  }

  public async nominateClashSong(roomCode: string, userId: string, queryOrUrl: string) {
    const game = this.activeGames.get(roomCode);
    if (!game || !game.clash || game.clash.stage !== 'nominating') return;

    try {
      const results = await YouTubeService.searchVideos(queryOrUrl, 1);
      if (results.length === 0) return;

      const topSong = results[0];
      const songInfo = {
        youtubeId: topSong.youtubeId,
        title: topSong.title,
        artist: topSong.channelTitle,
        thumbnail: topSong.thumbnail
      };

      if (game.clash.player1.userId === userId) {
        game.clash.player1.song = songInfo;
      } else if (game.clash.player2.userId === userId) {
        game.clash.player2.song = songInfo;
      }

      this.broadcastUpdate(roomCode);

      // If both nominated early, start battle right away!
      if (game.clash.player1.song && game.clash.player2.song) {
        this.clearTimer(roomCode);
        this.startClashBattlePhase(roomCode);
      }
    } catch {
      // Ignore search errors in mini-game
    }
  }

  private startClashBattlePhase(roomCode: string) {
    const game = this.activeGames.get(roomCode);
    if (!game || !game.clash) return;

    this.clearTimer(roomCode);
    game.clash.stage = 'battling';
    game.clash.timeRemaining = 25; // 25s live duel & hype voting
    this.broadcastUpdate(roomCode);

    if (this.onSendSystemChat) {
      this.onSendSystemChat(
        roomCode,
        `🔥 ¡DUELO EN VIVO! Vota ahora por tu DJ favorito en el panel de Hype!`
      );
    }

    let battleCountdown = 25;
    const interval = setInterval(() => {
      battleCountdown -= 1;
      const cur = this.activeGames.get(roomCode);
      if (!cur || !cur.clash) {
        clearInterval(interval);
        return;
      }

      cur.clash.timeRemaining = battleCountdown;

      if (battleCountdown <= 0) {
        clearInterval(interval);
        this.finishClash(roomCode);
      } else {
        this.broadcastUpdate(roomCode);
      }
    }, 1000);

    this.gameTimers.set(roomCode, interval);
  }

  public voteClash(roomCode: string, userId: string, choice: 'player1' | 'player2') {
    const game = this.activeGames.get(roomCode);
    if (!game || !game.clash || game.clash.stage !== 'battling') return;

    // Record or update vote
    game.clash.userVotes[userId] = choice;

    // Recalculate vote counts
    let p1Votes = 0;
    let p2Votes = 0;
    for (const vote of Object.values(game.clash.userVotes)) {
      if (vote === 'player1') p1Votes++;
      if (vote === 'player2') p2Votes++;
    }

    game.clash.player1.votes = p1Votes;
    game.clash.player2.votes = p2Votes;

    this.broadcastUpdate(roomCode);
  }

  private finishClash(roomCode: string) {
    const game = this.activeGames.get(roomCode);
    if (!game || !game.clash) return;

    this.clearTimer(roomCode);
    game.clash.stage = 'finished';

    let winnerKey: 'player1' | 'player2' | 'tie' = 'tie';
    if (game.clash.player1.votes > game.clash.player2.votes) {
      winnerKey = 'player1';
    } else if (game.clash.player2.votes > game.clash.player1.votes) {
      winnerKey = 'player2';
    }

    game.clash.winner = winnerKey;
    this.broadcastUpdate(roomCode);

    const winnerName =
      winnerKey === 'player1'
        ? game.clash.player1.userName
        : winnerKey === 'player2'
        ? game.clash.player2.userName
        : '¡Empate Legendario!';

    if (this.onSendSystemChat) {
      this.onSendSystemChat(
        roomCode,
        `👑 ¡La Batalla de DJs ha concluido! Ganador: ${winnerName} (${game.clash.player1.votes} vs ${game.clash.player2.votes} votos) 🎉🔥`
      );
    }

    setTimeout(() => {
      this.stopGame(roomCode);
    }, 10000);
  }

  // ==========================================
  // 🎡 3. RULETA DE RETOS KARAOKE
  // ==========================================
  public spinRoulette(roomCode: string, users: { id: string; name: string; avatar: string }[]) {
    this.clearTimer(roomCode);

    const game: ActiveRoomGame = {
      type: 'roulette',
      roulette: {
        isSpinning: true,
        spinTimestamp: Date.now()
      }
    };

    this.activeGames.set(roomCode, game);
    this.broadcastUpdate(roomCode);

    if (this.onBroadcastNotification) {
      this.onBroadcastNotification(roomCode, {
        title: '¡Ruleta Karaoke Girando! 🎡',
        message: '¿Quién será el elegido para el reto?',
        emoji: '🎡'
      });
    }

    // Spin animation duration: 3.5 seconds
    const timeout = setTimeout(() => {
      const cur = this.activeGames.get(roomCode);
      if (!cur || !cur.roulette) return;

      const eligibleUsers = users.length > 0 ? users : [{ id: 'user_1', name: 'Participante', avatar: '' }];
      const chosenUser = eligibleUsers[Math.floor(Math.random() * eligibleUsers.length)];
      const chosenChallenge = ROULETTE_CHALLENGES[Math.floor(Math.random() * ROULETTE_CHALLENGES.length)];

      cur.roulette.isSpinning = false;
      cur.roulette.selectedUserId = chosenUser.id;
      cur.roulette.selectedUserName = chosenUser.name;
      cur.roulette.selectedUserAvatar = chosenUser.avatar;
      cur.roulette.challenge = chosenChallenge;

      this.broadcastUpdate(roomCode);

      if (this.onSendSystemChat) {
        this.onSendSystemChat(
          roomCode,
          `🎡 ¡La Ruleta Karaoke eligió a ${chosenUser.name}! Reto: "${chosenChallenge.title}" - ${chosenChallenge.description}`
        );
      }

      if (this.onBroadcastNotification) {
        this.onBroadcastNotification(roomCode, {
          title: `🎯 ¡Reto para ${chosenUser.name}!`,
          message: chosenChallenge.title,
          emoji: chosenChallenge.emoji
        });
      }
    }, 3500);

    this.gameTimers.set(roomCode, timeout);
  }

  private broadcastUpdate(roomCode: string) {
    if (this.onBroadcastGame) {
      const g = this.activeGames.get(roomCode) || null;
      this.onBroadcastGame(roomCode, g);
    }
  }
}
