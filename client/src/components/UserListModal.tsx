import React from 'react';
import { X, Users, Crown } from 'lucide-react';
import type { User } from '@mirocola/shared';
import { getDjRank } from '../lib/djRank';

interface UserListModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  currentUserId?: string;
}

export const UserListModal: React.FC<UserListModalProps> = ({
  isOpen,
  onClose,
  users,
  currentUserId
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm bg-slate-900 border border-purple-800/60 rounded-2xl p-5 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 mb-4">
          <div className="p-2 rounded-xl bg-purple-950 text-purple-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Amigos en la Sala</h3>
            <p className="text-xs text-slate-400">{users.length} personas conectadas</p>
          </div>
        </div>

        <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
          {users.map((user) => {
            const isMe = user.id === currentUserId;
            const rank = typeof user.djScore === 'number' ? getDjRank(user.djScore) : null;

            return (
              <div
                key={user.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/70 border border-purple-900/30"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-9 h-9 rounded-full bg-slate-800 border border-purple-600/40 object-cover flex-shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-slate-100 flex items-center gap-1.5 truncate">
                      <span>{user.name}</span>
                      {isMe && (
                        <span className="text-[10px] text-pink-400 font-normal flex-shrink-0">(Tú)</span>
                      )}
                    </p>
                    <div className="flex items-center gap-1.5 text-[10px] mt-0.5">
                      <span className="text-slate-400">
                        {user.isHost ? 'DJ Anfitrión' : 'Oyente'}
                      </span>
                      {rank && (
                        <>
                          <span className="text-slate-600">•</span>
                          <span className="font-semibold text-pink-300">
                            {rank.emoji} {rank.name} (⭐{user.djScore})
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0 ml-2">
                  {user.isHost && (
                    <div className="p-1 rounded-lg bg-amber-950/60 text-amber-400 border border-amber-800/50" title="Anfitrión">
                      <Crown className="w-4 h-4" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
