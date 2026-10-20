import { socket } from './socket';
import type { VoiceUser } from '@mirocola/shared';

const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
};

export class VoiceChatManager {
  private static instance: VoiceChatManager;
  private localStream: MediaStream | null = null;
  private peers: Map<string, RTCPeerConnection> = new Map();
  private remoteAudioElements: Map<string, HTMLAudioElement> = new Map();
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private speakingInterval: any = null;

  public isConnected = false;
  public isMuted = false;
  public isDeafened = false;
  public currentRoomCode = '';

  private listeners: {
    onUsersChange?: (users: VoiceUser[]) => void;
    onSpeakingChange?: (isSpeaking: boolean) => void;
    onError?: (error: string) => void;
  } = {};

  private voiceUsers: Map<string, VoiceUser> = new Map();

  private constructor() {
    this.setupSocketListeners();
  }

  public static getInstance(): VoiceChatManager {
    if (!VoiceChatManager.instance) {
      VoiceChatManager.instance = new VoiceChatManager();
    }
    return VoiceChatManager.instance;
  }

  public setListeners(listeners: {
    onUsersChange?: (users: VoiceUser[]) => void;
    onSpeakingChange?: (isSpeaking: boolean) => void;
    onError?: (error: string) => void;
  }) {
    this.listeners = listeners;
  }

  private setupSocketListeners() {
    socket.on('voice:users', (users: VoiceUser[]) => {
      this.voiceUsers.clear();
      for (const u of users) {
        this.voiceUsers.set(u.socketId, u);
        // Connect to existing peers
        if (this.isConnected && u.socketId !== socket.id) {
          this.initiatePeerConnection(u.socketId, true);
        }
      }
      this.notifyUsersChange();
    });

    socket.on('voice:userJoined', (user: VoiceUser) => {
      this.voiceUsers.set(user.socketId, user);
      this.notifyUsersChange();
    });

    socket.on('voice:userLeft', (socketId: string) => {
      this.closePeer(socketId);
      this.voiceUsers.delete(socketId);
      this.notifyUsersChange();
    });

    socket.on('voice:muteChanged', ({ socketId, isMuted }) => {
      const user = this.voiceUsers.get(socketId);
      if (user) {
        user.isMuted = isMuted;
        this.notifyUsersChange();
      }
    });

    socket.on('voice:signal', async ({ fromSocketId, signal }) => {
      if (!this.isConnected || fromSocketId === socket.id) return;

      let pc = this.peers.get(fromSocketId);
      if (!pc) {
        pc = this.initiatePeerConnection(fromSocketId, false);
      }

      try {
        if (signal.sdp) {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          if (signal.sdp.type === 'offer') {
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit('voice:signal', {
              targetSocketId: fromSocketId,
              signal: { sdp: answer }
            });
          }
        } else if (signal.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
      } catch (err) {
        console.warn('[WebRTC Voice] Signaling error:', err);
      }
    });
  }

  private notifyUsersChange() {
    if (this.listeners.onUsersChange) {
      this.listeners.onUsersChange(Array.from(this.voiceUsers.values()));
    }
  }

  /**
   * Join Voice Chat / Karaoke Room
   */
  public async join(
    roomCode: string,
    currentUser: { id: string; name: string; avatar: string }
  ): Promise<boolean> {
    try {
      this.currentRoomCode = roomCode;

      // 1. Get microphone audio stream with echo cancellation & noise suppression
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });

      this.isConnected = true;
      this.isMuted = false;
      this.isDeafened = false;

      // 2. Setup voice volume analyzer for real-time speaking indicator
      this.setupSpeakingDetector();

      // 3. Emit join event to socket
      socket.emit('voice:join', {
        roomCode,
        user: {
          id: currentUser.id,
          name: currentUser.name,
          avatar: currentUser.avatar
        }
      });

      return true;
    } catch (err: any) {
      console.error('[Voice Chat] Microphone access denied or error:', err);
      if (this.listeners.onError) {
        this.listeners.onError(
          err.name === 'NotAllowedError'
            ? 'Permiso de micrófono denegado. Habilita el acceso en tu navegador para hablar.'
            : 'No se pudo conectar el micrófono para el chat de voz.'
        );
      }
      this.leave();
      return false;
    }
  }

  /**
   * Setup WebRTC peer connection
   */
  private initiatePeerConnection(targetSocketId: string, isInitiator: boolean): RTCPeerConnection {
    const pc = new RTCPeerConnection(ICE_SERVERS);
    this.peers.set(targetSocketId, pc);

    // Add local tracks to peer
    if (this.localStream) {
      for (const track of this.localStream.getAudioTracks()) {
        pc.addTrack(track, this.localStream);
      }
    }

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('voice:signal', {
          targetSocketId,
          signal: { candidate: event.candidate }
        });
      }
    };

    // Handle incoming remote audio stream
    pc.ontrack = (event) => {
      let audio = this.remoteAudioElements.get(targetSocketId);
      if (!audio) {
        audio = new Audio();
        audio.autoplay = true;
        this.remoteAudioElements.set(targetSocketId, audio);
      }
      audio.srcObject = event.streams[0];
      audio.muted = this.isDeafened;
      audio.play().catch(() => {});
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        this.closePeer(targetSocketId);
      }
    };

    // If initiator, generate SDP offer
    if (isInitiator) {
      pc.createOffer()
        .then((offer) => pc.setLocalDescription(offer))
        .then(() => {
          socket.emit('voice:signal', {
            targetSocketId,
            signal: { sdp: pc.localDescription }
          });
        })
        .catch(console.warn);
    }

    return pc;
  }

  private closePeer(socketId: string) {
    const pc = this.peers.get(socketId);
    if (pc) {
      pc.close();
      this.peers.delete(socketId);
    }
    const audio = this.remoteAudioElements.get(socketId);
    if (audio) {
      audio.srcObject = null;
      audio.remove();
      this.remoteAudioElements.delete(socketId);
    }
  }

  /**
   * Detects volume levels to trigger glowing speaking indicator
   */
  private setupSpeakingDetector() {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx || !this.localStream) return;

      this.audioContext = new AudioCtx();
      const source = this.audioContext.createMediaStreamSource(this.localStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      source.connect(this.analyser);

      const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      let wasSpeaking = false;

      this.speakingInterval = setInterval(() => {
        if (!this.analyser || this.isMuted) {
          if (wasSpeaking) {
            wasSpeaking = false;
            this.listeners.onSpeakingChange?.(false);
          }
          return;
        }

        this.analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        const isSpeaking = average > 18; // threshold

        if (isSpeaking !== wasSpeaking) {
          wasSpeaking = isSpeaking;
          this.listeners.onSpeakingChange?.(isSpeaking);
        }
      }, 150);
    } catch {
      // Ignore audio context errors
    }
  }

  /**
   * Toggle mute microphone
   */
  public toggleMute(): boolean {
    if (!this.localStream) return this.isMuted;
    this.isMuted = !this.isMuted;
    for (const track of this.localStream.getAudioTracks()) {
      track.enabled = !this.isMuted;
    }
    socket.emit('voice:mute', this.isMuted);
    return this.isMuted;
  }

  /**
   * Toggle deafen (mute incoming audio from others)
   */
  public toggleDeafen(): boolean {
    this.isDeafened = !this.isDeafened;
    for (const audio of this.remoteAudioElements.values()) {
      audio.muted = this.isDeafened;
    }
    return this.isDeafened;
  }

  /**
   * Leave Voice Chat
   */
  public leave() {
    this.isConnected = false;
    this.isMuted = false;
    this.isDeafened = false;

    if (this.speakingInterval) {
      clearInterval(this.speakingInterval);
      this.speakingInterval = null;
    }

    if (this.audioContext) {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }

    if (this.localStream) {
      for (const track of this.localStream.getTracks()) {
        track.stop();
      }
      this.localStream = null;
    }

    for (const socketId of Array.from(this.peers.keys())) {
      this.closePeer(socketId);
    }

    socket.emit('voice:leave');
    this.voiceUsers.clear();
    this.notifyUsersChange();
    this.listeners.onSpeakingChange?.(false);
  }
}

export const voiceManager = VoiceChatManager.getInstance();
