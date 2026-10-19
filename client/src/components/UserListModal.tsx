import React from 'react';
import { X, Users, Crown } from 'lucide-react';
import type { User } from '@mirocola/shared';

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
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
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
            return (
              <div
                key={user.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/70 border border-purple-900/30"
              >
                <div className="flex items-center gap-2.5">
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-8 h-8 rounded-full bg-slate-800 border border-purple-600/40"
                  />
                  <div>
                    <p className="text-xs font-semibold text-slate-100 flex items-center gap-1.5">
                      {user.name}
                      {isMe && (
                        <span className="text-[10px] text-pink-400 font-normal">(Tú)</span>
                      )}
                    </p>
                    <span className="text-[10px] text-slate-400">
                      {user.isHost ? 'DJ Anfitrión' : 'Oyente'}
                    </span>
                  </div>
                </div>

                {user.isHost && (
                  <div className="p-1 rounded-lg bg-amber-950/60 text-amber-400 border border-amber-800/50" title="Anfitrión">
                    <Crown className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
