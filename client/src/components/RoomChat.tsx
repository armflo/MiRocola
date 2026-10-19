import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import type { ChatMessage, ReactionEvent, User } from '@mirocola/shared';

interface RoomChatProps {
  messages: ChatMessage[];
  reactions: ReactionEvent[];
  currentUser: User | null;
  onSendMessage: (text: string) => void;
  onSendReaction: (emoji: string) => void;
}

const QUICK_EMOJIS = ['🔥', '💃', '🍻', '🎵', '👏', '💔'];

export const RoomChat: React.FC<RoomChatProps> = ({
  messages,
  reactions,
  currentUser,
  onSendMessage,
  onSendReaction
}) => {
  const [inputText, setInputText] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  return (
    <div className="bg-slate-900/80 border border-purple-900/40 rounded-2xl p-4 shadow-xl backdrop-blur-xl flex flex-col h-full min-h-[420px] relative overflow-hidden">
      {/* Floating live reaction container */}
      <div className="absolute inset-x-0 bottom-24 top-0 pointer-events-none overflow-hidden z-30">
        {reactions.map((react) => (
          <div
            key={react.id}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900/90 border border-pink-500/50 shadow-lg text-lg animate-float-reaction"
            style={{
              left: `${30 + Math.random() * 40}%`
            }}
          >
            <span>{react.emoji}</span>
            <span className="text-[10px] font-bold text-pink-300">{react.user.name}</span>
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-purple-900/30 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-purple-950 text-purple-400">
            <MessageSquare className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-bold text-white">Chat de la Sala</h3>
        </div>

        {/* Quick Emoji Reaction Buttons */}
        <div className="flex items-center gap-1 bg-slate-950/70 p-1 rounded-xl border border-purple-900/30">
          {QUICK_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => onSendReaction(emoji)}
              className="w-7 h-7 flex items-center justify-center text-sm rounded-lg hover:bg-purple-900/40 hover:scale-125 transition-transform cursor-pointer"
              title={`Reaccionar con ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-center p-6 text-slate-500 text-xs">
            Sé el primero en saludar o reaccionar a la música 👋
          </div>
        ) : (
          messages.map((msg) => {
            if (msg.isSystem) {
              return (
                <div
                  key={msg.id}
                  className="px-2.5 py-1.5 rounded-lg bg-purple-950/30 border border-purple-900/20 text-center text-[11px] text-purple-300 font-medium"
                >
                  {msg.text}
                </div>
              );
            }

            const isMe = currentUser && msg.user.id === currentUser.id;

            return (
              <div
                key={msg.id}
                className={`flex items-start gap-2 text-xs ${isMe ? 'flex-row-reverse' : ''}`}
              >
                {msg.user.avatar && (
                  <img
                    src={msg.user.avatar}
                    alt={msg.user.name}
                    className="w-6 h-6 rounded-full bg-slate-800 border border-purple-800/40 mt-0.5"
                  />
                )}
                <div className={`max-w-[75%] ${isMe ? 'text-right' : 'text-left'}`}>
                  <span className="text-[10px] text-slate-400 font-semibold px-1">
                    {msg.user.name}
                  </span>
                  <div
                    className={`mt-0.5 px-3 py-2 rounded-2xl break-words text-xs leading-relaxed ${
                      isMe
                        ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-tr-none'
                        : 'bg-slate-950 text-slate-200 border border-purple-900/30 rounded-tl-none'
                    }`}
                  >
                    {msg.text}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="mt-3 pt-3 border-t border-purple-900/30 flex gap-2">
        <input
          type="text"
          maxLength={300}
          placeholder="Escribe un mensaje en la rocola..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-purple-900/50 focus:border-pink-500 focus:ring-1 focus:ring-pink-500 text-xs text-white placeholder-slate-500 outline-none transition-all"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="p-2 rounded-xl bg-purple-600 hover:bg-pink-600 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-all cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
